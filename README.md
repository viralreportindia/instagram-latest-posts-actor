# Instagram Latest Posts Scraper

Extract the latest video posts from any **public Instagram profile** — no login, no API key required!

## Features
- ✅ No Instagram login required
- ✅ Multiple usernames in one run
- ✅ Returns post_id, caption, video_url, thumbnail_url
- ✅ Apify Proxy support (residential IPs for reliability)
- ✅ Auto-retry on rate limits

## Input

```json
{
  "usernames": ["iprettyjangra", "twobhkhe"],
  "count": 3,
  "includeImages": false
}
```

## Output

```json
{
  "username": "iprettyjangra",
  "full_name": "Preeti 💚",
  "followers": 1073048,
  "post_id": "3899076961886427543",
  "shortcode": "DYcTdaxJlmX",
  "post_url": "https://www.instagram.com/p/DYcTdaxJlmX/",
  "is_video": true,
  "caption": "#viral #trending #reels",
  "video_url": "https://scontent...mp4",
  "thumb_url": "https://scontent...jpg",
  "views": 13341,
  "likes": 5200,
  "posted_at": "2026-05-18T07:00:00.000Z",
  "fetched_at": "2026-05-18T10:52:00.000Z"
}
```

## Use Cases
- Instagram to Facebook auto-posting
- Content monitoring & alerts
- Social media analytics
- Automation workflows (Pabbly, Make, Zapier)
