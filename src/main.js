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
  sessionId = '',       // Single Instagram sessionid cookie
  sessionIds = [],      // Multiple session IDs for rotation
} = input

if (!usernames || usernames.length === 0) {
  throw new Error('Please provide at least one Instagram username!')
}

// Build session pool for rotation
const SESSION_POOL = [sessionId, ...sessionIds].filter(s => s && s.trim())

if (SESSION_POOL.length > 0) {
  console.log(`✅ Using ${SESSION_POOL.length} session ID(s) — rate limit bypass active!`)
} else {
  console.log('⚠️  No sessionId — may hit 429 on datacenter IPs. Add sessionId to input!')
}

// Setup Apify proxy
let proxyConfiguration = null
try {
  proxyConfiguration = await Actor.createProxyConfiguration({ useApifyProxy: true })
  console.log('Proxy configured ✅')
} catch {
  console.log('No proxy, using direct connection')
}

console.log(`\nProcessing ${usernames.length} username(s)...\n`)

for (let idx = 0; idx < usernames.length; idx++) {
  const username = usernames[idx]
  console.log(`📷 Fetching: @${username}`)

  // Pick session ID for this user (round-robin)
  const sessionForUser = SESSION_POOL.length > 0
    ? SESSION_POOL[idx % SESSION_POOL.length]
    : null

  let result = null
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      const delay = attempt * 2000
      console.log(`  Retry ${attempt}/3 (${delay / 1000}s delay)...`)
      await sleep(delay)
    }
    result = await fetchInstagramPosts(username, count, includeImages, proxyConfiguration, attempt, sessionForUser)
    if (result) break
  }

  if (result) {
    console.log(`  ✅ Found ${result.posts.length} posts`)
    for (const post of result.posts) {
      await Actor.pushData({ username, full_name: result.full_name, followers: result.followers, ...post })
    }
  } else {
    console.log(`  ❌ Failed — add sessionId to input for reliable results`)
    await Actor.pushData({ username, error: 'Failed. Add sessionId for reliable access.', fetched_at: new Date().toISOString() })
  }

  if (idx < usernames.length - 1) await sleep(2000)
}

console.log('\n✅ Done!')
await Actor.exit()

// ─── Fetch Posts ──────────────────────────────────────────
async function fetchInstagramPosts(username, count, includeImages, proxyConfig, attempt, sessionId) {
  try {
    const cookies = await getInstagramCookies(proxyConfig, attempt, sessionId)
    for (let i = 0; i < IG_APP_IDS.length; i++) {
      const appId = IG_APP_IDS[(attempt + i) % IG_APP_IDS.length]
      const ua = USER_AGENTS[(attempt + i) % USER_AGENTS.length]
      try {
        const user = await fetchUser(username, cookies, appId, ua, proxyConfig)
        if (!user) continue
        return {
          full_name: user.full_name,
          followers: user.edge_followed_by?.count,
          posts: extractPosts(user, count, includeImages)
        }
      } catch { continue }
    }
    return null
  } catch (err) {
    console.log(`  Error: ${err.message}`)
    return null
  }
}

// Get fresh cookies + inject sessionId if provided
async function getInstagramCookies(proxyConfig, attempt = 0, sessionId = null) {
  try {
    const ua = USER_AGENTS[attempt % USER_AGENTS.length]
    const options = {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    }

    if (proxyConfig) {
      try {
        const proxyUrl = await proxyConfig.newUrl()
        if (proxyUrl) {
          const { ProxyAgent } = await import('undici')
          options.dispatcher = new ProxyAgent(proxyUrl)
        }
      } catch { }
    }

    const res = await fetch('https://www.instagram.com/', options)
    const setCookie = res.headers.get('set-cookie') || ''
    let freshCookies = setCookie
      .split(/,(?=[^ ])/)
      .map(c => c.split(';')[0].trim())
      .filter(c => c.includes('='))
      .join('; ')

    // Inject sessionId — this bypasses rate limits!
    if (sessionId) {
      freshCookies = `sessionid=${sessionId}; ${freshCookies}`
    }

    const cookieNames = freshCookies.split(';').map(c => c.trim().split('=')[0]).filter(Boolean)
    console.log(`  Cookies: ${cookieNames.join(', ')}`)
    return freshCookies

  } catch (err) {
    console.log(`  Cookie error: ${err.message}`)
    // Still return sessionId even if homepage fetch fails
    return sessionId ? `sessionid=${sessionId}` : ''
  }
}

// Fetch user profile from Instagram API
async function fetchUser(username, cookies, appId, ua, proxyConfig) {
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

  if (proxyConfig) {
    try {
      const proxyUrl = await proxyConfig.newUrl()
      if (proxyUrl) {
        const { ProxyAgent } = await import('undici')
        options.dispatcher = new ProxyAgent(proxyUrl)
      }
    } catch { }
  }

  const res = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
    options
  )

  if (!res.ok) {
    console.log(`  Status: ${res.status} (${appId.slice(0, 6)}...)`)
    return null
  }

  const text = await res.text()
  if (!text?.trim()) return null
  const data = JSON.parse(text)
  return data?.data?.user || null
}

// Extract posts from user data
function extractPosts(user, count, includeImages) {
  const edges = user.edge_owner_to_timeline_media?.edges || []
  return edges
    .filter(e => includeImages ? true : e.node?.is_video)
    .slice(0, count)
    .map(e => {
      const node = e.node
      const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || ''
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
