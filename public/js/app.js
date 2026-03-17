// app.js — AI Image Generator (standalone, no auth)

const API = "";

// ══════════════════════════════════════════════
//  SETTINGS (localStorage-based)
// ══════════════════════════════════════════════

const STORAGE_KEYS = {
  apiKey: "aiImageGen_apiKey",
  apiBaseUrl: "aiImageGen_apiBaseUrl",
  apiModel: "aiImageGen_apiModel",
  apiMode: "aiImageGen_apiMode",
  apiProfiles: "aiImageGen_apiProfiles",
  history: "aiImageGen_history",
};

const PROMPT_PRESETS = {
  cinematic: "電影感構圖，戲劇化光影，超高細節，寫實質感，景深明確，色彩分級精緻",
  anime: "高品質動漫風，細膩線條，柔和光影，角色設計完整，背景有層次，畫面乾淨",
  product: "高端產品形象照，工作室燈光，乾淨背景，精準反射，廣告攝影風格，超清晰",
  fantasy: "史詩奇幻概念藝術，宏大場景，魔法氛圍，體積光，細節豐富，構圖震撼"
};

function getSettings() {
  return {
    apiKey: localStorage.getItem(STORAGE_KEYS.apiKey) || "",
    apiBaseUrl: localStorage.getItem(STORAGE_KEYS.apiBaseUrl) || "",
    apiModel: localStorage.getItem(STORAGE_KEYS.apiModel) || "google/gemini-2.5-flash-preview:thinking",
    apiMode: localStorage.getItem(STORAGE_KEYS.apiMode) || "chat",
  };
}

function initApp() {
  loadSettingsUI();
  updateBanner();
  renderHistory();
  initScenes();
  syncModelDropdowns();
  updateProfileList();
  bindAutoScenes();
}

let _toastTimer = null;

function showToast(message) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

function applyPromptPreset(key) {
  const preset = PROMPT_PRESETS[key];
  const promptEl = document.getElementById("prompt");
  if (!preset || !promptEl) return;
  const current = promptEl.value.trim();
  promptEl.value = current ? `${current}，${preset}` : preset;
  promptEl.focus();
  showToast("已套用風格提示");
}

function fillRandomPrompt() {
  const ideas = [
    "一座漂浮在雲海上的未來城市，晨光穿透薄霧，電影感廣角構圖",
    "極簡白色工作室中的高級耳機產品照，柔光與精準反射，商業廣告風格",
    "霓虹雨夜中的機械武士站在巷口，賽博龐克氛圍，超細節",
    "奇幻森林中的發光鹿群與古老神殿，體積光與薄霧，概念藝術風格",
    "動漫風少女站在海邊月台，晚霞與列車燈光交錯，情緒感畫面"
  ];
  const promptEl = document.getElementById("prompt");
  if (!promptEl) return;
  promptEl.value = ideas[Math.floor(Math.random() * ideas.length)];
  promptEl.focus();
  showToast("已填入靈感提示");
}

function inferProviderPreset(settings) {
  const base = (settings.apiBaseUrl || "").trim();
  if (settings.apiMode === "images" && /openai\.com/i.test(base)) return "openai-images";
  if ((settings.apiMode === "chat" && /openrouter\.ai/i.test(base)) || (!base && settings.apiMode === "chat")) return "openrouter-gemini";
  return "custom";
}

function loadSettingsUI() {
  const s = getSettings();
  const modeEl = document.getElementById("settingsApiMode");
  const baseUrlEl = document.getElementById("settingsBaseUrl");
  const modelEl = document.getElementById("settingsModel");
  const providerEl = document.getElementById("settingsProviderPreset");

  if (modeEl) modeEl.value = s.apiMode;
  if (baseUrlEl) baseUrlEl.value = s.apiBaseUrl;
  if (providerEl) providerEl.value = inferProviderPreset(s);

  // If saved model matches a dropdown option, select it; otherwise leave default
  if (modelEl) {
    const opts = Array.from(modelEl.options).map((o) => o.value);
    if (opts.includes(s.apiModel)) {
      modelEl.value = s.apiModel;
    } else {
      // Custom model — show in the custom field
      const customEl = document.getElementById("settingsCustomModel");
      if (customEl) customEl.value = s.apiModel;
    }
  }

  onApiModeChange();
}

function toggleSettings() {
  toggleSidebarMobile();
}

function toggleSidebarMobile() {
  const sidebar = document.querySelector('.sidebar');
  const btn = document.getElementById('settingsToggleBtn');
  if (!sidebar) return;
  sidebar.classList.toggle('open');
  if (btn) btn.classList.toggle('active');
}

function saveSettingsToLocal() {
  const modeEl = document.getElementById("settingsApiMode");
  const baseUrlEl = document.getElementById("settingsBaseUrl");
  const keyEl = document.getElementById("settingsApiKey");
  const modelEl = document.getElementById("settingsModel");
  const customModelEl = document.getElementById("settingsCustomModel");
  const msgEl = document.getElementById("settingsMsg");

  const apiKey = keyEl?.value?.trim();
  const apiBaseUrl = baseUrlEl?.value?.trim() || "";
  const apiMode = modeEl?.value || "chat";
  const customModel = customModelEl?.value?.trim();
  const apiModel = customModel || modelEl?.value || "google/gemini-2.5-flash-preview:thinking";

  // Save key only if user typed a new one
  const existingKey = localStorage.getItem(STORAGE_KEYS.apiKey) || "";
  if (apiKey) {
    localStorage.setItem(STORAGE_KEYS.apiKey, apiKey);
  } else if (!existingKey) {
    if (msgEl) {
      msgEl.textContent = "請輸入 API Key";
      msgEl.className = "settings-msg error";
    }
    return;
  }

  localStorage.setItem(STORAGE_KEYS.apiBaseUrl, apiBaseUrl);
  localStorage.setItem(STORAGE_KEYS.apiModel, apiModel);
  localStorage.setItem(STORAGE_KEYS.apiMode, apiMode);

  // Clear the key input after save
  if (keyEl) keyEl.value = "";

  if (msgEl) {
    msgEl.textContent = "✅ 設定已儲存";
    msgEl.className = "settings-msg success";
    setTimeout(() => { msgEl.className = "settings-msg"; }, 3000);
  }
  showToast("設定已儲存");

  updateBanner();
  syncModelDropdowns();
  updateProfileList();
}

function clearSettings() {
  if (!confirm("確定要清除所有 API 設定嗎？")) return;

  Object.values(STORAGE_KEYS).forEach((k) => {
    if (k !== STORAGE_KEYS.history) localStorage.removeItem(k);
  });

  const msgEl = document.getElementById("settingsMsg");
  if (msgEl) {
    msgEl.textContent = "✅ 設定已清除";
    msgEl.className = "settings-msg success";
    setTimeout(() => { msgEl.className = "settings-msg"; }, 3000);
  }

  loadSettingsUI();
  updateBanner();
}

async function testApiKey() {
  const s = getSettings();
  const keyEl = document.getElementById("settingsApiKey");
  const modeEl = document.getElementById("settingsApiMode");
  const baseUrlEl = document.getElementById("settingsBaseUrl");
  const modelEl = document.getElementById("settingsModel");
  const customModelEl = document.getElementById("settingsCustomModel");
  const resultEl = document.getElementById("testResult");

  const testKey = keyEl?.value?.trim() || s.apiKey;
  const apiMode = modeEl?.value || s.apiMode || "chat";
  const apiBaseUrl = (baseUrlEl?.value?.trim() || s.apiBaseUrl || (apiMode === "images" ? "https://api.openai.com/v1" : "https://openrouter.ai/api/v1")).replace(/\/+$/, "");
  const customModel = customModelEl?.value?.trim();
  const apiModel = customModel || modelEl?.value || s.apiModel || (apiMode === "images" ? "dall-e-3" : "google/gemini-2.5-flash-preview:thinking");

  if (!testKey) {
    if (resultEl) {
      resultEl.style.display = "block";
      resultEl.textContent = "❌ 請先輸入 API Key";
      resultEl.className = "test-result error";
    }
    return;
  }

  if (resultEl) {
    resultEl.style.display = "block";
    resultEl.textContent = "正在測試連線…";
    resultEl.className = "test-result testing";
  }

  try {
    const res = await fetch(API + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Hi, test",
        model: apiModel,
        resolution: "1k",
        apiKey: testKey,
        apiBaseUrl,
        apiMode,
      }),
    });

    if (res.ok) {
      if (resultEl) {
        resultEl.textContent = "✅ 連線成功！API Key 有效";
        resultEl.className = "test-result success";
      }
    } else {
      const data = await res.json().catch(() => ({}));
      const errMsg = data.error?.message || `HTTP ${res.status}`;
      if (resultEl) {
        resultEl.textContent = "❌ 測試失敗：" + errMsg;
        resultEl.className = "test-result error";
      }
    }
  } catch (err) {
    if (resultEl) {
      resultEl.textContent = "❌ 無法連線：" + err.message;
      resultEl.className = "test-result error";
    }
  }
}

function toggleKeyVisibility() {
  const input = document.getElementById("settingsApiKey");
  const icon = document.getElementById("eyeIcon");
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    if (icon) icon.textContent = "🙈";
  } else {
    input.type = "password";
    if (icon) icon.textContent = "👁️";
  }
}

function onProviderPresetChange() {
  const providerEl = document.getElementById("settingsProviderPreset");
  const modeEl = document.getElementById("settingsApiMode");
  const baseUrlEl = document.getElementById("settingsBaseUrl");
  const modelEl = document.getElementById("settingsModel");
  const customModelEl = document.getElementById("settingsCustomModel");
  if (!providerEl) return;

  const preset = providerEl.value;
  if (preset === "openrouter-gemini") {
    if (modeEl) modeEl.value = "chat";
    if (baseUrlEl) baseUrlEl.value = "https://openrouter.ai/api/v1";
    if (modelEl) modelEl.value = "google/gemini-2.5-flash-preview:thinking";
    if (customModelEl) customModelEl.value = "";
  } else if (preset === "openai-images") {
    if (modeEl) modeEl.value = "images";
    if (baseUrlEl) baseUrlEl.value = "https://api.openai.com/v1";
    if (modelEl) modelEl.value = "dall-e-3";
    if (customModelEl) customModelEl.value = "";
  }
  onApiModeChange();
}

function getProfiles() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.apiProfiles) || "{}");
  } catch {
    return {};
  }
}

function updateProfileList() {
  const select = document.getElementById("savedProfiles");
  if (!select) return;
  const profiles = getProfiles();
  const names = Object.keys(profiles).sort();
  select.innerHTML = '<option value="">-- 選擇已儲存的設定 --</option>' + names.map(name => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join("");
}

function saveProfile() {
  const name = prompt("設定名稱？");
  if (!name || !name.trim()) return;
  saveSettingsToLocal();
  const s = getSettings();
  const profiles = getProfiles();
  profiles[name.trim()] = {
    apiBaseUrl: s.apiBaseUrl,
    apiModel: s.apiModel,
    apiMode: s.apiMode,
    providerPreset: inferProviderPreset(s),
  };
  localStorage.setItem(STORAGE_KEYS.apiProfiles, JSON.stringify(profiles));
  updateProfileList();
  const select = document.getElementById("savedProfiles");
  if (select) select.value = name.trim();
}

function loadProfile() {
  const select = document.getElementById("savedProfiles");
  if (!select?.value) return;
  const profile = getProfiles()[select.value];
  if (!profile) return;
  document.getElementById("settingsApiMode").value = profile.apiMode || "chat";
  document.getElementById("settingsBaseUrl").value = profile.apiBaseUrl || "";
  const providerEl = document.getElementById("settingsProviderPreset");
  if (providerEl) providerEl.value = profile.providerPreset || inferProviderPreset(profile);
  const modelEl = document.getElementById("settingsModel");
  const customModelEl = document.getElementById("settingsCustomModel");
  const opts = Array.from(modelEl.options).map(o => o.value);
  if (opts.includes(profile.apiModel)) {
    modelEl.value = profile.apiModel;
    if (customModelEl) customModelEl.value = "";
  } else if (customModelEl) {
    customModelEl.value = profile.apiModel || "";
  }
  onApiModeChange();
}

function deleteProfile() {
  const select = document.getElementById("savedProfiles");
  if (!select?.value) return;
  const profiles = getProfiles();
  delete profiles[select.value];
  localStorage.setItem(STORAGE_KEYS.apiProfiles, JSON.stringify(profiles));
  updateProfileList();
}

function onApiModeChange() {
  const modeEl = document.getElementById("settingsApiMode");
  const modeHint = document.getElementById("modeHint");
  const baseUrlHint = document.getElementById("baseUrlHint");
  const baseUrlEl = document.getElementById("settingsBaseUrl");

  if (!modeEl) return;
  const mode = modeEl.value;

  if (mode === "images") {
    if (modeHint) modeHint.textContent = "使用標準 /v1/images/generations 端點（OpenAI DALL·E 等）";
    if (baseUrlHint) baseUrlHint.textContent = "例如：https://api.openai.com/v1";
    if (baseUrlEl && !baseUrlEl.value) baseUrlEl.placeholder = "https://api.openai.com/v1";
  } else {
    if (modeHint) modeHint.textContent = "使用 chat/completions 端點，模型回傳包含圖片的回應";
    if (baseUrlHint) baseUrlHint.textContent = "留空則使用預設值（OpenRouter）";
    if (baseUrlEl && !baseUrlEl.value) baseUrlEl.placeholder = "https://openrouter.ai/api/v1";
  }
}

function applyCustomModel() {
  const customEl = document.getElementById("settingsCustomModel");
  const modelEl = document.getElementById("settingsModel");
  const val = customEl?.value?.trim();
  if (!val) return;

  // Check if it matches existing option
  const opts = Array.from(modelEl.options).map((o) => o.value);
  if (opts.includes(val)) {
    modelEl.value = val;
    customEl.value = "";
  }
  // Otherwise keep in the custom field — saveSettings will use it
}

function updateBanner() {
  const banner = document.getElementById("apiKeyBanner");
  if (!banner) return;

  const s = getSettings();
  if (s.apiKey) {
    const masked = "****" + s.apiKey.slice(-4);
    banner.className = "api-key-banner banner-ok";
    banner.innerHTML = `
      <div class="banner-content">
        <span class="banner-icon">✅</span>
        <span class="banner-text">API Key 已設定（${escapeHtml(masked)}）· ${escapeHtml(s.apiModel)}</span>
      </div>
      <button class="banner-action" onclick="toggleSettings()">管理設定 →</button>
    `;
  } else {
    banner.className = "api-key-banner banner-warn";
    banner.innerHTML = `
      <div class="banner-content">
        <span class="banner-icon">⚠️</span>
        <span class="banner-text">尚未設定 API Key，請先點擊「設定」輸入你的 API Key</span>
      </div>
      <button class="banner-action" onclick="toggleSettings()">前往設定 →</button>
    `;
  }
}

// Sync the saved model to the generation panel dropdowns
function syncModelDropdowns() {
  const s = getSettings();
  const modelSelects = [document.getElementById("model"), document.getElementById("animModel")];
  modelSelects.forEach((sel) => {
    if (!sel) return;
    // Check if the saved model matches an existing option
    const opts = Array.from(sel.options).map((o) => o.value);
    if (opts.includes(s.apiModel)) {
      sel.value = s.apiModel;
    } else {
      // Add custom option
      const opt = document.createElement("option");
      opt.value = s.apiModel;
      opt.textContent = s.apiModel;
      sel.appendChild(opt);
      sel.value = s.apiModel;
    }
  });
}

// ══════════════════════════════════════════════
//  MODE TOGGLE
// ══════════════════════════════════════════════

let currentMode = "single";

function switchMode(mode) {
  currentMode = mode;
  const singleMode = document.getElementById("singleMode");
  const animationMode = document.getElementById("animationMode");
  const modeSingle = document.getElementById("modeSingle");
  const modeAnimation = document.getElementById("modeAnimation");
  const resultArea = document.getElementById("resultArea");

  if (mode === "single") {
    if (singleMode) singleMode.style.display = "";
    if (animationMode) animationMode.style.display = "none";
    if (modeSingle) modeSingle.classList.add("active");
    if (modeAnimation) modeAnimation.classList.remove("active");
    if (resultArea) resultArea.style.display = resultArea.dataset.wasVisible === "true" ? "block" : "none";
  } else {
    if (resultArea) {
      resultArea.dataset.wasVisible = resultArea.style.display !== "none" ? "true" : "false";
      resultArea.style.display = "none";
    }
    if (singleMode) singleMode.style.display = "none";
    if (animationMode) animationMode.style.display = "";
    if (modeSingle) modeSingle.classList.remove("active");
    if (modeAnimation) modeAnimation.classList.add("active");
  }
}

// ══════════════════════════════════════════════
//  IMAGE GENERATION (Single Image)
// ══════════════════════════════════════════════

let _generating = false;

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || "[]");
  } catch {
    return [];
  }
}

function saveHistoryData(history) {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, 50)));
}

function buildRequestBody(prompt, model, resolution) {
  const s = getSettings();
  return {
    prompt,
    model,
    resolution,
    apiKey: s.apiKey,
    apiBaseUrl: (s.apiBaseUrl || "https://openrouter.ai/api/v1").replace(/\/+$/, ""),
    apiMode: s.apiMode,
  };
}

function getDownloadFilenameFromUrl(url, promptText) {
  const baseName = promptToFilename(promptText || "generated-image").replace(/\.[a-z0-9]+$/i, "");
  const mimeMatch = url && url.match(/^data:image\/(png|jpeg|jpg|webp|gif)/i);
  const ext = mimeMatch ? mimeMatch[1].replace("jpeg", "jpg") : "png";
  return `${baseName}.${ext}`;
}

function openImageModal(url, promptText) {
  const modal = document.getElementById("imageModal");
  const img = document.getElementById("imageModalImg");
  const download = document.getElementById("imageModalDownload");
  if (!modal || !img || !download || !url) return;
  img.src = url;
  download.href = url;
  download.download = getDownloadFilenameFromUrl(url, promptText);
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function openImageModalFromCurrent() {
  const img = document.getElementById("generatedImage");
  const promptEl = document.getElementById("prompt");
  if (img?.src) openImageModal(img.src, promptEl?.value || "generated-image");
}

function closeImageModal() {
  const modal = document.getElementById("imageModal");
  if (!modal) return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
}

async function generate() {
  if (_generating) return;

  const s = getSettings();
  if (!s.apiKey) {
    toggleSettings();
    return;
  }

  const promptEl = document.getElementById("prompt");
  const modelEl = document.getElementById("model");
  const resolutionEl = document.getElementById("resolution");
  const prompt = promptEl?.value?.trim();
  const model = modelEl?.value || s.apiModel;
  const resolution = resolutionEl?.value || "1k";

  if (!prompt) {
    promptEl?.focus();
    return;
  }

  _generating = true;
  const btn = document.getElementById("generateBtn");
  const btnText = document.getElementById("btnText");
  const btnSpinner = document.getElementById("btnSpinner");
  const resultArea = document.getElementById("resultArea");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const imageResult = document.getElementById("imageResult");
  const errorResult = document.getElementById("errorResult");

  // Show loading
  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = "生成中…";
  if (btnSpinner) btnSpinner.style.display = "inline-block";
  if (resultArea) resultArea.style.display = "block";
  if (loadingIndicator) loadingIndicator.style.display = "block";
  if (imageResult) imageResult.style.display = "none";
  if (errorResult) errorResult.style.display = "none";

  try {
    const res = await fetch(API + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequestBody(prompt, model, resolution)),
    });

    const data = await res.json();

    if (loadingIndicator) loadingIndicator.style.display = "none";

    if (!res.ok) {
      const errMsg = data.error?.message || data.error || "生成失敗";
      if (errorResult) {
        document.getElementById("errorText").textContent = typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg);
        errorResult.style.display = "block";
      }
      return;
    }

    if (data.data && data.data.length > 0 && data.data[0].url) {
      const url = data.data[0].url;
      const img = document.getElementById("generatedImage");
      const dl = document.getElementById("downloadLink");

      if (img) img.src = url;
      if (dl) {
        dl.href = url;
        dl.download = getDownloadFilenameFromUrl(url, prompt);
      }
      if (imageResult) imageResult.style.display = "block";

      // Save to history
      const history = getHistory();
      history.unshift({
        prompt,
        model,
        resolution,
        url,
        time: new Date().toISOString(),
      });
      saveHistoryData(history);
      renderHistory();
      showToast("圖片生成完成");
    } else {
      const errMsg = data.error?.message || data.raw_content || "未能生成圖片";
      if (errorResult) {
        document.getElementById("errorText").textContent = errMsg;
        errorResult.style.display = "block";
      }
    }
  } catch (err) {
    if (loadingIndicator) loadingIndicator.style.display = "none";
    if (errorResult) {
      document.getElementById("errorText").textContent = "無法連接伺服器";
      errorResult.style.display = "block";
    }
  } finally {
    _generating = false;
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = "✨ 生成";
    if (btnSpinner) btnSpinner.style.display = "none";
  }
}

function renderHistory() {
  const list = document.getElementById("historyList");
  if (!list) return;

  const history = getHistory();

  if (history.length === 0) {
    list.innerHTML = '<p class="history-empty">還沒有生成過圖片</p>';
    return;
  }

  list.innerHTML = history
    .map(
      (item) => `
    <div class="history-item" onclick="showHistoryImage('${item.url.replace(/'/g, "\\'")}', '${escapeAttr(item.prompt).replace(/'/g, "\\'")}')">
      <img class="history-thumb" src="${item.url}" alt="thumbnail" onerror="this.style.display='none'" />
      <div class="history-info">
        <div class="history-prompt">${escapeHtml(item.prompt)}</div>
        <div class="history-meta">${escapeHtml(item.model || "")}${item.resolution ? " · " + item.resolution.toUpperCase() : ""} · ${formatTime(item.time)}</div>
      </div>
    </div>
  `
    )
    .join("");
}

function showHistoryImage(url, promptText) {
  switchMode("single");

  const img = document.getElementById("generatedImage");
  const dl = document.getElementById("downloadLink");
  const resultArea = document.getElementById("resultArea");
  const imageResult = document.getElementById("imageResult");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const errorResult = document.getElementById("errorResult");

  if (img) img.src = url;
  if (dl) {
    dl.href = url;
    dl.download = getDownloadFilenameFromUrl(url, promptText || "generated-image");
  }
  if (resultArea) resultArea.style.display = "block";
  if (imageResult) imageResult.style.display = "block";
  if (loadingIndicator) loadingIndicator.style.display = "none";
  if (errorResult) errorResult.style.display = "none";
}

function clearHistory() {
  if (!confirm("確定要清除所有生成歷史嗎？")) return;
  localStorage.removeItem(STORAGE_KEYS.history);
  renderHistory();
  showToast("已清除歷史紀錄");
}

function copyImageUrl() {
  const img = document.getElementById("generatedImage");
  if (img && img.src) {
    navigator.clipboard.writeText(img.src).then(() => {
      const btn = event?.target;
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = "✅ 已複製";
        setTimeout(() => { btn.textContent = orig; }, 1500);
      }
      showToast("已複製圖片連結");
    }).catch(() => {});
  }
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeImageModal();
});

// ══════════════════════════════════════════════
//  ANIMATION MODE + AUTO SCENE BUILDER
// ══════════════════════════════════════════════

// Scene narrative beats (ported from image-gen)
const SCENE_BEATS = [
  "establishing shot, wide angle, setting the scene",
  "introduction of the main subject, medium shot",
  "rising action, building tension or interest",
  "climactic moment, dramatic composition",
  "development and detail, close-up perspective",
  "turning point, shift in mood or atmosphere",
  "resolution beginning, pulling back",
  "final scene, satisfying conclusion, wide shot",
];

let scenes = [];
let animFrames = [];
let animCurrentFrame = 0;
let animPlaying = false;
let animTimer = null;
let animFps = 2;
let _animGenerating = false;

function initScenes() {
  if (scenes.length === 0) {
    scenes = [{ prompt: "" }, { prompt: "" }];
  }
  renderScenes();
}

function bindAutoScenes() {
  const storyEl = document.getElementById("autoStoryPrompt");
  if (!storyEl) return; // UI not present

  // Ctrl/Cmd+Enter: generate scene list
  storyEl.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      buildAutoScenes(false);
    }
  });
}

function pickBeat(i, total) {
  const idx = Math.floor((i / Math.max(total, 1)) * SCENE_BEATS.length);
  return SCENE_BEATS[Math.min(idx, SCENE_BEATS.length - 1)];
}

function buildScenesFromStoryText(story, count) {
  const clean = (story || "").trim();
  const total = Math.min(Math.max(parseInt(count) || 5, 2), 8);
  const out = [];
  for (let i = 0; i < total; i++) {
    const beat = pickBeat(i, total);
    out.push({ prompt: `Scene ${i + 1} of ${total}: ${clean} — ${beat}` });
  }
  return out;
}

function buildAutoScenes(startAfterBuild = false) {
  const storyEl = document.getElementById("autoStoryPrompt");
  const countEl = document.getElementById("autoSceneCount");
  if (!storyEl || !countEl) return;

  const story = storyEl.value.trim();
  if (!story) {
    alert("請先輸入故事/概念");
    storyEl.focus();
    return;
  }

  scenes = buildScenesFromStoryText(story, countEl.value);
  renderScenes();
  showToast("已生成場景列表，可再手動微調");

  // Scroll to the scene list for convenience
  const list = document.getElementById("sceneList");
  if (list) list.scrollIntoView({ behavior: "smooth", block: "start" });

  if (startAfterBuild) {
    generateAnimation();
  }
}

function renderScenes() {
  const list = document.getElementById("sceneList");
  if (!list) return;

  list.innerHTML = scenes
    .map(
      (scene, i) => `
      <div class="scene-item" data-index="${i}" draggable="true"
           ondragstart="sceneDragStart(event, ${i})"
           ondragover="sceneDragOver(event)"
           ondrop="sceneDrop(event, ${i})">
        <div class="scene-handle" title="拖曳排序">⠿</div>
        <span class="scene-number">${i + 1}</span>
        <input type="text" class="scene-prompt-input" value="${escapeAttr(scene.prompt)}"
               placeholder="場景 ${i + 1} 的描述..."
               oninput="updateScenePrompt(${i}, this.value)" />
        <button class="btn-scene-delete" onclick="deleteScene(${i})" title="刪除場景"${scenes.length <= 1 ? " disabled" : ""}>✕</button>
      </div>
    `
    )
    .join("");
}

function addScene() {
  scenes.push({ prompt: "" });
  renderScenes();
  setTimeout(() => {
    const inputs = document.querySelectorAll(".scene-prompt-input");
    if (inputs.length > 0) inputs[inputs.length - 1].focus();
  }, 50);
}

function deleteScene(index) {
  if (scenes.length <= 1) return;
  scenes.splice(index, 1);
  renderScenes();
}

function updateScenePrompt(index, value) {
  if (scenes[index]) scenes[index].prompt = value;
}

// Drag and drop
let _dragSceneIndex = null;

function sceneDragStart(event, index) {
  _dragSceneIndex = index;
  event.dataTransfer.effectAllowed = "move";
  event.target.closest(".scene-item").classList.add("dragging");
}

function sceneDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function sceneDrop(event, targetIndex) {
  event.preventDefault();
  document.querySelectorAll('.scene-item').forEach((el) => el.classList.remove('dragging'));
  if (_dragSceneIndex === null || _dragSceneIndex === targetIndex) return;
  const moved = scenes.splice(_dragSceneIndex, 1)[0];
  scenes.splice(targetIndex, 0, moved);
  _dragSceneIndex = null;
  renderScenes();
  showToast('已重新排序場景');
}

function updateFps(value) {
  const el = document.getElementById("fpsValue");
  if (el) el.textContent = parseFloat(value).toFixed(1);
  animFps = parseFloat(value);
}

function updatePlayerFps(value) {
  const el = document.getElementById("playerFpsValue");
  if (el) el.textContent = parseFloat(value).toFixed(1);
  animFps = parseFloat(value);
  if (animPlaying) {
    clearInterval(animTimer);
    animTimer = setInterval(animNextFrame, 1000 / animFps);
  }
}

// ── Generate Animation ─────────────────────

async function generateAnimation() {
  if (_animGenerating) return;

  const s = getSettings();
  if (!s.apiKey) {
    toggleSettings();
    return;
  }

  const validScenes = scenes.filter((sc) => sc.prompt.trim());
  if (validScenes.length < 2) {
    alert("請至少填寫 2 個場景的描述");
    return;
  }

  _animGenerating = true;
  const btn = document.getElementById("animGenerateBtn");
  const btnText = document.getElementById("animBtnText");
  const btnSpinner = document.getElementById("animBtnSpinner");
  const progress = document.getElementById("animProgress");
  const progressFill = document.getElementById("animProgressFill");
  const progressText = document.getElementById("animProgressText");
  const previewStrip = document.getElementById("animPreviewStrip");
  const player = document.getElementById("animPlayer");

  animFrames = [];
  animCurrentFrame = 0;
  animStop();
  if (player) player.style.display = "none";

  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = "生成中…";
  if (btnSpinner) btnSpinner.style.display = "inline-block";
  if (progress) progress.style.display = "block";
  if (progressFill) progressFill.style.width = "0%";
  if (previewStrip) previewStrip.innerHTML = "";

  const model = document.getElementById("animModel")?.value || s.apiModel;
  const resolution = document.getElementById("animResolution")?.value || "1k";
  const total = validScenes.length;

  for (let i = 0; i < total; i++) {
    if (progressText) progressText.textContent = `正在生成場景 ${i + 1}/${total}...`;
    if (progressFill) progressFill.style.width = `${(i / total) * 100}%`;

    try {
      const res = await fetch(API + "/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody(validScenes[i].prompt, model, resolution)),
      });

      const data = await res.json();

      if (res.ok && data.data && data.data.length > 0 && data.data[0].url) {
        const url = data.data[0].url;
        animFrames.push(url);

        if (previewStrip) {
          const thumb = document.createElement("img");
          thumb.src = url;
          thumb.className = "anim-preview-thumb";
          thumb.title = `場景 ${i + 1}`;
          thumb.onclick = () => animGoToFrame(animFrames.indexOf(url));
          previewStrip.appendChild(thumb);
        }
      } else {
        const errMsg = data.error?.message || "生成失敗";
        if (previewStrip) {
          const errThumb = document.createElement("div");
          errThumb.className = "anim-preview-error";
          errThumb.textContent = "✕";
          errThumb.title = `場景 ${i + 1} 失敗: ${errMsg}`;
          previewStrip.appendChild(errThumb);
        }
      }
    } catch (err) {
      if (previewStrip) {
        const errThumb = document.createElement("div");
        errThumb.className = "anim-preview-error";
        errThumb.textContent = "✕";
        errThumb.title = `場景 ${i + 1} 網路錯誤`;
        previewStrip.appendChild(errThumb);
      }
    }

    if (progressFill) progressFill.style.width = `${((i + 1) / total) * 100}%`;
  }

  if (progressText) progressText.textContent = `完成！成功生成 ${animFrames.length}/${total} 個場景`;
  if (btn) btn.disabled = false;
  if (btnText) btnText.textContent = "🎬 生成動畫";
  if (btnSpinner) btnSpinner.style.display = "none";
  _animGenerating = false;

  if (animFrames.length > 0) {
    showAnimPlayer();
  }
}

// ── Animation Player ───────────────────────

function showAnimPlayer() {
  const player = document.getElementById("animPlayer");
  if (player) player.style.display = "block";

  animFps = parseFloat(document.getElementById("fpsSlider")?.value || 2);
  const playerSlider = document.getElementById("playerFpsSlider");
  if (playerSlider) playerSlider.value = animFps;
  const playerFpsLabel = document.getElementById("playerFpsValue");
  if (playerFpsLabel) playerFpsLabel.textContent = animFps.toFixed(1);

  animCurrentFrame = 0;
  showFrame(0);
  animPlay();
}

function showFrame(index) {
  if (animFrames.length === 0) return;
  animCurrentFrame = ((index % animFrames.length) + animFrames.length) % animFrames.length;

  const img = document.getElementById("animFrame");
  const indicator = document.getElementById("animFrameIndicator");

  if (img) {
    img.classList.add("anim-fade");
    setTimeout(() => {
      img.src = animFrames[animCurrentFrame];
      img.classList.remove("anim-fade");
    }, 150);
  }
  if (indicator) indicator.textContent = `${animCurrentFrame + 1} / ${animFrames.length}`;

  const thumbs = document.querySelectorAll(".anim-preview-thumb");
  thumbs.forEach((t, i) => t.classList.toggle("active", i === animCurrentFrame));
}

function animPlay() {
  if (animFrames.length < 2) return;
  animPlaying = true;
  const btn = document.getElementById("animPlayBtn");
  if (btn) btn.textContent = "⏸";
  animTimer = setInterval(animNextFrame, 1000 / animFps);
}

function animStop() {
  animPlaying = false;
  const btn = document.getElementById("animPlayBtn");
  if (btn) btn.textContent = "▶";
  if (animTimer) {
    clearInterval(animTimer);
    animTimer = null;
  }
}

function animTogglePlay() {
  if (animPlaying) {
    animStop();
  } else {
    animPlay();
  }
}

function animNextFrame() {
  showFrame(animCurrentFrame + 1);
}

function animPrev() {
  showFrame(animCurrentFrame - 1);
}

function animNext() {
  showFrame(animCurrentFrame + 1);
}

function animGoToFrame(index) {
  showFrame(index);
}

document.addEventListener('dragend', () => {
  document.querySelectorAll('.scene-item').forEach((el) => el.classList.remove('dragging'));
});

// ── Download All Images (ZIP) ──────────────

async function downloadAllImages() {
  if (animFrames.length === 0) return;

  const firstPrompt = scenes.find((s) => s.prompt.trim())?.prompt || "animation";
  const baseName =
    firstPrompt
      .trim()
      .substring(0, 40)
      .replace(/[^\w\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "animation";

  const btn = document.querySelector(".btn-download");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ 打包中...";
  }

  try {
    if (typeof JSZip === "undefined") {
      // Fallback: download one by one
      animFrames.forEach((url, i) => {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}-scene-${i + 1}.png`;
        a.click();
      });
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder(baseName);

    for (let i = 0; i < animFrames.length; i++) {
      try {
        const response = await fetch(animFrames[i]);
        const blob = await response.blob();
        const ext = blob.type === "image/jpeg" ? "jpg" : "png";
        folder.file(`${baseName}-scene-${String(i + 1).padStart(3, "0")}.${ext}`, blob);
      } catch {
        // Skip failed downloads
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("打包下載失敗：" + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "⬇️ 下載全部圖片";
    }
  }
}

// ══════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("zh-TW") +
      " " +
      d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return "";
  }
}

function promptToFilename(prompt, ext = "png") {
  let name = prompt
    .trim()
    .substring(0, 50)
    .replace(/[^\w\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!name) name = "generated-image";
  return name + "." + ext;
}
