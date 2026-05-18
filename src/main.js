import { Actor, ProxyConfiguration } from 'apify'

const IG_APP_IDS = [
  '936619743392459',
  '1217981644879628',
  '195629264166739',
]

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
]

// ─── Main Actor Entry Point ───────────────────────────────
await Actor.init()

const input = await Actor.getInput()
const {
  usernames = [],
  count = 3,
  includeImages = false,
  proxyConfig = { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
} = input

if (!usernames || usernames.length === 0) {
  throw new Error('Please provide at least one Instagram username!')
}

// Setup Apify Proxy
let proxyConfiguration = null
try {
  proxyConfiguration = await Actor.createProxyConfiguration(proxyConfig)
} catch {
  console.log('Proxy not available, using direct connection')
}

console.log(`Processing ${usernames.length} username(s)...`)

// Process each username
for (const username of usernames) {
  console.log(`\n📷 Fetching: @${username}`)

  let result = null
  let retries = 0

  // Retry up to 3 times
  while (retries < 3 && !result) {
    if (retries > 0) {
      await sleep(2000 * retries)
      console.log(`  Retry ${retries}/3...`)
    }

    result = await fetchInstagramPosts(username, count, includeImages, proxyConfiguration)
    retries++
  }

  if (result) {
    console.log(`  ✅ Found ${result.posts.length} posts for @${username}`)
    // Push each post as separate dataset item
    for (const post of result.posts) {
      await Actor.pushData({
        username,
        full_name: result.full_name,
        followers: result.followers,
        ...post
      })
    }
  } else {
    console.log(`  ❌ Failed to fetch @${username}`)
    await Actor.pushData({
      username,
      error: 'Could not fetch. Account may be private or rate limited.',
      fetched_at: new Date().toISOString()
    })
  }

  // Gap between users to avoid rate limiting
  if (usernames.indexOf(username) < usernames.length - 1) {
    await sleep(1500)
  }
}

console.log('\n✅ Done!')
await Actor.exit()

// ─── Instagram Fetcher ────────────────────────────────────
async function fetchInstagramPosts(username, count, includeImages, proxyConfig) {
  try {
    // Step 1: Get fresh cookies
    const cookies = await getInstagramCookies(proxyConfig)

    // Step 2: Fetch profile
    const user = await fetchInstagramUser(username, cookies, proxyConfig)
    if (!user) return null

    // Step 3: Extract posts
    const posts = extractPosts(user, count, includeImages)

    return {
      full_name: user.full_name,
      followers: user.edge_followed_by?.count,
      is_private: user.is_private,
      posts
    }
  } catch (err) {
    console.log(`  Error: ${err.message}`)
    return null
  }
}

// Get fresh cookies (simulates first browser visit)
async function getInstagramCookies(proxyConfig) {
  try {
    const proxyUrl = proxyConfig ? await proxyConfig.newUrl() : undefined
    const fetchOptions = {
      headers: {
        'User-Agent': USER_AGENTS[0],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    }

    // Use proxy if available
    if (proxyUrl) {
      const { Agent } = await import('undici')
      fetchOptions.dispatcher = new Agent({ connect: { rejectUnauthorized: false } })
    }

    const res = await fetch('https://www.instagram.com/', fetchOptions)
    const setCookie = res.headers.get('set-cookie') || ''
    return setCookie
      .split(/,(?=[^ ])/)
      .map(c => c.split(';')[0].trim())
      .filter(c => c.includes('='))
      .join('; ')
  } catch {
    return ''
  }
}

// Fetch Instagram user profile with rotating App IDs
async function fetchInstagramUser(username, cookies, proxyConfig) {
  for (let i = 0; i < IG_APP_IDS.length; i++) {
    try {
      const appId = IG_APP_IDS[i]
      const ua = USER_AGENTS[i % USER_AGENTS.length]

      const res = await fetch(
        `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
        {
          headers: {
            'X-IG-App-ID': appId,
            'User-Agent': ua,
            'Referer': 'https://www.instagram.com/',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cookie': cookies,
          }
        }
      )

      if (!res.ok) continue

      const text = await res.text()
      if (!text || text.trim() === '') continue

      const data = JSON.parse(text)
      const user = data?.data?.user
      if (user) return user

    } catch { continue }
  }
  return null
}

// Extract posts from user data
function extractPosts(user, count, includeImages) {
  const edges = user.edge_owner_to_timeline_media?.edges || []

  return edges
    .filter(e => includeImages ? true : e.node?.is_video)
    .slice(0, count)
    .map(e => {
      const node = e.node
      const captionEdges = node.edge_media_to_caption?.edges || []
      const caption = captionEdges.length > 0 ? captionEdges[0].node.text : ''

      return {
        post_id: node.id,
        shortcode: node.shortcode,
        post_url: `https://www.instagram.com/p/${node.shortcode}/`,
        is_video: node.is_video,
        caption,
        video_url: node.video_url || null,
        thumb_url: node.display_url,
        thumbnail_resources: node.thumbnail_resources || [],
        views: node.video_view_count || null,
        likes: node.edge_liked_by?.count || null,
        posted_at: node.taken_at_timestamp
          ? new Date(node.taken_at_timestamp * 1000).toISOString()
          : null,
        fetched_at: new Date().toISOString()
      }
    })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
