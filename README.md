# Instagram Profile Scraper — Latest Posts, Reels & Video URLs

> Extract direct video URLs, captions, and thumbnails from any public Instagram profile. Built for social media automation, cross-posting, and content monitoring. **No login. No API key. No proxy.**

---

## ⚡ Why Use This Actor?

Most Instagram scrapers break frequently or require expensive residential proxies. This actor uses a lightweight, reliable method that:

- 🔓 Works on **any public Instagram profile** without authentication
- 💰 Costs **almost nothing** — fractions of a cent per run
- 🔄 Returns **always-fresh data** — no stale cache
- 🚀 Completes in **under 5 seconds** per username
- 🛠️ Requires **zero setup** — just enter usernames and run

---

## 📦 What You Get

For each post, the actor returns:

| Field | Description |
|-------|-------------|
| `post_id` | Unique Instagram post ID |
| `shortcode` | Post shortcode (used in URL) |
| `post_url` | Direct link to the Instagram post |
| `caption` | Full caption text with hashtags |
| `video_url` | **Direct MP4 URL** (ready to download/re-upload) |
| `thumb_url` | Thumbnail/cover image URL |
| `views` | Video view count |
| `likes` | Like count |
| `posted_at` | Original post timestamp (ISO 8601) |
| `fetched_at` | When the data was fetched |

---

## 🎯 Perfect For

- **📤 Auto cross-posting** — Instagram → Facebook Page / YouTube Shorts / TikTok
- **🔔 New post alerts** — Get notified the moment a creator posts
- **📊 Competitor analysis** — Track posting patterns and engagement
- **📥 Video archiving** — Save Instagram videos to your own storage
- **🤖 No-code workflows** — Plug into Make, Pabbly, Zapier, or n8n

---

## 📥 Input

```json
{
  "usernames": ["cristiano", "leomessi", "virat.kohli"],
  "count": 3,
  "includeImages": false
}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `usernames` | Array | ✅ Yes | — | Instagram usernames without `@` |
| `count` | Integer | No | `3` | Number of posts per user (max 12) |
| `includeImages` | Boolean | No | `false` | Set `true` to include photo posts too |

---

## 📤 Output Example

```json
{
  "username": "iprettyjangra",
  "full_name": "Preeti 💚",
  "followers": 1073048,
  "post_id": "3899627459706299314",
  "shortcode": "DYcTdaxJlmX",
  "post_url": "https://www.instagram.com/p/DYcTdaxJlmX/",
  "is_video": true,
  "caption": "New reel! 🔥 #viral #trending #reels #india",
  "video_url": "https://scontent.cdninstagram.com/v/...video.mp4",
  "thumb_url": "https://scontent.cdninstagram.com/v/...image.jpg",
  "views": 8705,
  "likes": 3200,
  "posted_at": "2026-05-18T08:11:07.000Z",
  "fetched_at": "2026-05-18T14:35:17.910Z"
}
```

---

## 🔗 API Integration

Run this actor via API and integrate with any automation tool:

```bash
# Start a run
curl -X POST \
  "https://api.apify.com/v2/acts/YOUR_ACTOR_ID/runs?token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "usernames": ["iprettyjangra"],
    "count": 3
  }'
```

```bash
# Get results
curl "https://api.apify.com/v2/datasets/RUN_DATASET_ID/items?token=YOUR_TOKEN"
```

---

## ⚠️ Important Notes

- Only **public** Instagram profiles are supported
- `video_url` links expire after ~24 hours (Instagram CDN)
- For best results with automation, run every 30–60 minutes
- Respects Instagram's rate limits automatically

---

## 🤝 Support

Found a bug or need a feature? Open an issue on [GitHub](https://github.com/viralreportindia/instagram-latest-posts-actor).
