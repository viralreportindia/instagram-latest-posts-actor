import { Actor } from 'apify'

// Your Cloudflare Worker URL — already working!
const CF_WORKER_URL = 'https://social-scraper.affiliates5612.workers.dev'

await Actor.init()

const input = await Actor.getInput()
const {
  usernames = [],
  count = 3,
  includeImages = false,
} = input

if (!usernames || usernames.length === 0) {
  throw new Error('Please provide at least one Instagram username!')
}

console.log(`Processing ${usernames.length} username(s) via Cloudflare Worker...\n`)

for (let idx = 0; idx < usernames.length; idx++) {
  const username = usernames[idx]
  console.log(`📷 Fetching: @${username}`)

  let result = null

  // Retry up to 3 times
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await sleep(2000 * attempt)
      console.log(`  Retry ${attempt}/2...`)
    }

    try {
      // Call CF Worker — it handles Instagram rate limiting
      const res = await fetch(
        `${CF_WORKER_URL}/?platform=instagram&username=${encodeURIComponent(username)}`
      )

      if (!res.ok) {
        console.log(`  CF Worker status: ${res.status}`)
        continue
      }

      const data = await res.json()

      if (data.error) {
        console.log(`  Error: ${data.error}`)
        continue
      }

      result = data
      break

    } catch (err) {
      console.log(`  Fetch error: ${err.message}`)
    }
  }

  if (result && result.latest_video) {
    // Filter to requested count from all_videos
    const allVideos = result.all_videos || [result.latest_video]
    const videos = allVideos.slice(0, count)

    console.log(`  ✅ Found ${videos.length} posts`)

    for (const video of videos) {
      // Only include if it matches type filter
      if (!includeImages && !video.video_url) continue

      await Actor.pushData({
        username,
        full_name: result.full_name,
        followers: result.followers,
        post_id: video.id,
        shortcode: video.shortcode,
        post_url: video.post_url,
        is_video: !!video.video_url,
        caption: video.caption || '',
        video_url: video.video_url || null,
        thumb_url: video.thumbnail,
        views: video.views || null,
        fetched_at: result.fetched_at || new Date().toISOString()
      })
    }
  } else {
    console.log(`  ❌ Failed to fetch @${username}`)
    await Actor.pushData({
      username,
      error: result?.error || 'Could not fetch data',
      fetched_at: new Date().toISOString()
    })
  }

  // Small gap between users
  if (idx < usernames.length - 1) await sleep(1500)
}

console.log('\n✅ Done!')
await Actor.exit()

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
