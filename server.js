// server.js — AI Image Generator (standalone, no auth)
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ── Image Generation Endpoint ─────────────────────────────────
app.post("/api/generate", async (req, res) => {
  const {
    prompt,
    model,
    resolution,
    apiKey: clientKey,
    apiBaseUrl: clientBaseUrl,
    apiMode: clientMode,
  } = req.body;

  // Use client-provided key, fall back to env var
  const apiKey = clientKey || process.env.OPENAI_API_KEY;
  const baseUrl = (clientBaseUrl || process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
  const apiMode = clientMode || "chat";

  if (!apiKey) {
    return res.status(400).json({
      error: { message: "請先在設定面板輸入你的 API Key" },
    });
  }

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({
      error: { message: "請輸入提示詞" },
    });
  }

  // Resolution suffix
  const resolutionMap = {
    "1k": "",
    "2k": " Output the image in 2K resolution (2048x2048).",
    "4k": " Output the image in 4K resolution (4096x4096).",
  };
  const resSuffix = resolutionMap[resolution] || "";

  try {
    if (apiMode === "images") {
      // ── Images API mode (DALL·E style) ──
      const url = baseUrl + "/images/generations";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || "dall-e-3",
          prompt: prompt.trim() + resSuffix,
          n: 1,
          size:
            resolution === "4k"
              ? "4096x4096"
              : resolution === "2k"
                ? "2048x2048"
                : "1024x1024",
          response_format: "url",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errMsg = data.error?.message || "API 錯誤 " + response.status;
        return res.status(response.status).json({ error: { message: errMsg } });
      }

      if (data.data && data.data.length > 0) {
        const imgUrl =
          data.data[0].url ||
          (data.data[0].b64_json
            ? "data:image/png;base64," + data.data[0].b64_json
            : null);
        if (imgUrl) {
          return res.json({
            created: data.created,
            data: [{ url: imgUrl }],
            model: model || "dall-e-3",
          });
        }
      }

      return res.json({
        data: [],
        error: { message: "未能生成圖片" },
      });
    } else {
      // ── Chat Completions mode (Gemini / OpenRouter) ──
      const url = baseUrl + "/chat/completions";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || "google/gemini-2.5-flash-preview:thinking",
          messages: [
            {
              role: "user",
              content: "Generate an image: " + prompt.trim() + resSuffix,
            },
          ],
          max_tokens: 4096,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errMsg =
          data.error?.message || data.error || "API 錯誤 " + response.status;
        return res
          .status(response.status)
          .json({ error: { message: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg) } });
      }

      const content = data.choices?.[0]?.message?.content || "";
      // Match both https:// URLs and data:image/ base64 URIs in markdown image syntax
      const imageMatch = content.match(
        /!\[.*?\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/
      );

      // Also check for inline_data in parts (Gemini native format)
      const parts = data.choices?.[0]?.message?.parts || [];
      const inlinePart = parts.find((p) =>
        p.inline_data?.mime_type?.startsWith("image/")
      );

      if (imageMatch) {
        res.json({
          created: data.created,
          data: [{ url: imageMatch[1] }],
          model: data.model,
          raw_content: content,
        });
      } else if (inlinePart) {
        const b64 = inlinePart.inline_data.data;
        const mime = inlinePart.inline_data.mime_type;
        res.json({
          created: data.created,
          data: [{ url: `data:${mime};base64,${b64}` }],
          model: data.model,
          raw_content: content,
        });
      } else {
        res.json({
          created: data.created,
          data: [],
          model: data.model,
          raw_content: content,
          error: {
            message:
              "未能生成圖片。模型回應: " + content.substring(0, 200),
          },
        });
      }
    }
  } catch (err) {
    console.error("Image generation error:", err);
    res.status(500).json({
      error: { message: "無法連接到圖片生成 API: " + err.message },
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// SPA fallback
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server (only when not on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ AI Image Generator running → http://localhost:${PORT}`);
  });
}

module.exports = app;
