# Instagram Profile Scraper — Latest Posts, Reels & Video URLs

Extract the **latest posts, reels, and videos** from any public Instagram profile — no login, no API key, no proxy required!

## What This Actor Does

This actor connects to any **public Instagram profile** and returns the most recent video posts with:
- ✅ **Direct video URL** (MP4 — ready to download or re-upload)
- ✅ **Thumbnail/cover image URL**
- ✅ **Full caption** with hashtags
- ✅ **Post ID & shortcode**
- ✅ **View count & like count**
- ✅ **Original post timestamp**
- ✅ **Direct link to Instagram post**

## Use Cases

- 📤 **Cross-posting automation** — Auto-post Instagram Reels to Facebook, YouTube Shorts, or TikTok
- 📊 **Social media analytics** — Track posting frequency and engagement trends
- 🔔 **Content monitoring** — Get notified when a creator posts new content
- 📥 **Video archiving** — Download and archive Instagram videos programmatically
- 🤖 **Workflow automation** — Integrate with Make (Integromat), Pabbly, Zapier, or n8n

## Input

```json
{
  "usernames": ["cristiano", "leomessi", "virat.kohli"],
  "count": 3,
  "includeImages": false
}
```

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `usernames` | Array | Instagram usernames (without @) | Required |
| `count` | Number | Posts to fetch per user (max 12) | 3 |
| `includeImages` | Boolean | Include photo posts (not just videos) | false |

## Output

Each post is saved as a separate item in the dataset:

```json
{
  "username": "cristiano",
  "full_name": "Cristiano Ronaldo",
  "followers": 636000000,
  "post_id": "3899076961886427543",
  "shortcode": "DYcTdaxJlmX",
  "post_url": "https://www.instagram.com/p/DYcTdaxJlmX/",
  "is_video": true,
  "caption": "Siuuuu! ⚽ #football #CR7",
  "video_url": "https://scontent...video.mp4",
  "thumb_url": "https://scontent...image.jpg",
  "views": 15000000,
  "likes": 8500000,
  "posted_at": "2026-05-18T08:00:00.000Z",
  "fetched_at": "2026-05-18T14:35:17.910Z"
}
```

## Limitations

- Only works with **public** Instagram profiles
- Private accounts will return an error
- Video URLs expire after ~24 hours (Instagram CDN links)

## Integrate with Automation Tools

**Pabbly Connect / Make / Zapier:**
1. Run actor via API
2. Use webhook to receive dataset output
3. Post video to Facebook Page / YouTube / etc.

**API Call Example:**
```bash
curl -X POST https://api.apify.com/v2/acts/YOUR_ACTOR_ID/runs \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"usernames": ["iprettyjangra"], "count": 3}'
```
