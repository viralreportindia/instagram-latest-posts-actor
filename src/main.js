import { Actor } from 'apify'

const IG_APP_IDS = [
  '936619743392459',
  '1217981644879628',
  '195629264166739',
  '124024574287414',
]

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
]

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

// Setup proxy — try Apify proxy, fallback to direct
let proxyConfiguration = null
try {
  proxyConfiguration = await Actor.createProxyConfiguration({
    useApifyProxy: true,
    // Use datacenter (free) first, residential if available
  })
  console.log('Proxy configured ✅')
} catch {
  console.log('No proxy available, using direct connection')
}

console.log(`Processing ${usernames.length} username(s)...`)

for (const username of usernames) {
  console.log(`\n📷 Fetching: @${username}`)

  let result = null

  // Try up to 4 times with increasing delays
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      const delay = attempt * 2000
      console.log(`  Retry ${attempt}/3 (waiting ${delay / 1000}s)...`)
      await sleep(delay)
    }

    result = await fetchInstagramPosts(username, count, includeImages, proxyConfiguration, attempt)
    if (result) break
  }

  if (result) {
    console.log(`  ✅ Found ${result.posts.length} posts for @${username}`)
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

  if (usernames.indexOf(username) < usernames.length - 1) {
    await sleep(2000)
  }
}

console.log('\n✅ Done!')
await Actor.exit()

// ─── Fetch Instagram Posts ────────────────────────────────
async function fetchInstagramPosts(username, count, includeImages, proxyConfig, attempt) {
  try {
    // Rotate user agent and app ID based on attempt
    const appIdIndex = attempt % IG_APP_IDS.length
    const uaIndex = attempt % USER_AGENTS.length

    // Get fresh cookies first
    const cookies = await getInstagramCookies(proxyConfig, uaIndex)

    // Try each App ID
    for (let i = 0; i < IG_APP_IDS.length; i++) {
      const appId = IG_APP_IDS[(appIdIndex + i) % IG_APP_IDS.length]
      const ua = USER_AGENTS[(uaIndex + i) % USER_AGENTS.length]

      try {
        const user = await fetchInstagramUser(username, cookies, appId, ua, proxyConfig)
        if (!user) continue

        const posts = extractPosts(user, count, includeImages)
        return {
          full_name: user.full_name,
          followers: user.edge_followed_by?.count,
          is_private: user.is_private,
          posts
        }
      } catch { continue }
    }

    return null
  } catch (err) {
    console.log(`  Error: ${err.message}`)
    return null
  }
}

// Get fresh cookies with optional proxy
async function getInstagramCookies(proxyConfig, uaIndex = 0) {
  try {
    const options = {
      headers: {
        'User-Agent': USER_AGENTS[uaIndex],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    }

    // Add proxy if available
    if (proxyConfig) {
      try {
        const proxyUrl = await proxyConfig.newUrl()
        if (proxyUrl) {
          const { ProxyAgent } = await import('undici')
          options.dispatcher = new ProxyAgent(proxyUrl)
        }
      } catch { /* proxy failed, use direct */ }
    }

    const res = await fetch('https://www.instagram.com/', options)
    const setCookie = res.headers.get('set-cookie') || ''
    const cookies = setCookie
      .split(/,(?=[^ ])/)
      .map(c => c.split(';')[0].trim())
      .filter(c => c.includes('='))
      .join('; ')

    console.log(`  Cookies: ${cookies ? cookies.split(';').map(c => c.split('=')[0]).join(', ') : 'none'}`)
    return cookies
  } catch (err) {
    console.log(`  Cookie fetch error: ${err.message}`)
    return ''
  }
}

// Fetch Instagram user profile
async function fetchInstagramUser(username, cookies, appId, ua, proxyConfig) {
  const options = {
    headers: {
      'X-IG-App-ID': appId,
      'User-Agent': ua,
      'Referer': 'https://www.instagram.com/',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': cookies,
    }
  }

  // Add proxy if available
  if (proxyConfig) {
    try {
      const proxyUrl = await proxyConfig.newUrl()
      if (proxyUrl) {
        const { ProxyAgent } = await import('undici')
        options.dispatcher = new ProxyAgent(proxyUrl)
      }
    } catch { /* use direct */ }
  }

  const res = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
    options
  )

  if (!res.ok) {
    console.log(`  API status: ${res.status} (appId: ${appId})`)
    return null
  }

  const text = await res.text()
  if (!text || text.trim() === '') return null

  const data = JSON.parse(text)
  return data?.data?.user || null
}

// Extract posts
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
