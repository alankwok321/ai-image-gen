# AI 圖片生成器 (AI Image Generator)

Standalone AI image generation tool with single image and animation modes.

## Features

- 🖼️ **Single Image Generation** — Generate images from text prompts
- 🎬 **Animation Mode** — Create multi-scene animations with drag-reorder, preview player, and ZIP download
- 🔧 **Configurable API** — Supports Chat Completions (Gemini/OpenRouter) and Images API (DALL·E) modes
- 🔑 **Client-side API Key** — Keys stored in browser localStorage, no server storage
- 📐 **Resolution Options** — 1K (1024), 2K (2048), 4K (4096)
- 📜 **Generation History** — Browse and re-view previously generated images
- 🌙 **Dark Theme** — Clean, modern dark UI
- 🈵 **繁體中文 UI** — Full Traditional Chinese interface

## Setup

```bash
npm install
npm start
```

Server runs on `http://localhost:3000`.

## Configuration

Click the ⚙️ **設定** button in the top bar to configure:

1. **API Mode** — Chat Completions or Images API
2. **API Base URL** — Default: `https://openrouter.ai/api/v1`
3. **API Key** — Your API key (stored in browser only)
4. **Model** — Select from presets or enter a custom model name

### Supported Models

| Model | Mode | Provider |
|-------|------|----------|
| Gemini 2.5 Flash | Chat | Google / OpenRouter |
| Gemini 2.5 Pro | Chat | Google / OpenRouter |
| DALL·E 3 | Images API | OpenAI |
| Custom | Any | Any compatible provider |

### Environment Variables (optional fallback)

- `OPENAI_API_KEY` — Fallback API key if none provided by client
- `OPENAI_BASE_URL` — Fallback base URL
- `PORT` — Server port (default: 3000)

## Deploy to Vercel

```bash
vercel --prod
```

The `vercel.json` is pre-configured for deployment.

## Tech Stack

- **Backend:** Express.js (Node.js)
- **Frontend:** Vanilla HTML/CSS/JS
- **ZIP Downloads:** JSZip (CDN)
- **Deploy:** Vercel
