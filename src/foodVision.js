// ========== FOOD VISION (EXPERIMENTAL) ==========
// Client-side image estimate using TensorFlow.js + MobileNet.

const FOOD_VISION_TF_URL = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.19.0/dist/tf.min.js";
const FOOD_VISION_MOBILENET_URL = "https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js";
const FOOD_VISION_MAX_PREDICTIONS = 4;
const FOOD_VISION_MAX_SUGGESTIONS = 6;

const FOOD_VISION_QUERY_RULES = [
  { test: /(banana|plantain)/i, query: "banana" },
  { test: /(apple)/i, query: "apple" },
  { test: /(orange|tangerine|citrus)/i, query: "orange" },
  { test: /(pineapple)/i, query: "pineapple" },
  { test: /(strawberry|berry)/i, query: "strawberry" },
  { test: /(avocado)/i, query: "avocado" },
  { test: /(broccoli|cauliflower|cabbage)/i, query: "broccoli" },
  { test: /(salad|lettuce|spinach)/i, query: "salad" },
  { test: /(rice)/i, query: "rice" },
  { test: /(spaghetti|pasta|noodle)/i, query: "pasta" },
  { test: /(bread|bagel|toast|bun)/i, query: "bread" },
  { test: /(pizza)/i, query: "pizza" },
  { test: /(hamburger|burger)/i, query: "burger" },
  { test: /(hotdog)/i, query: "hot dog" },
  { test: /(sandwich|sub)/i, query: "sandwich" },
  { test: /(burrito|wrap|taco)/i, query: "burrito" },
  { test: /(omelet|egg)/i, query: "egg" },
  { test: /(chicken|turkey)/i, query: "chicken" },
  { test: /(beef|steak)/i, query: "beef" },
  { test: /(salmon|tuna|fish)/i, query: "salmon" },
  { test: /(yogurt|curd)/i, query: "yogurt" },
  { test: /(milk|latte)/i, query: "milk" },
  { test: /(coffee|espresso)/i, query: "coffee" },
];

const _foodVisionScriptPromises = {};
let _foodVisionModelPromise = null;
let _foodVisionSuggestions = [];
let _foodVisionBusy = false;

function fvEsc(value) {
  if (typeof esc === "function") return esc(value);
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fvEscAttr(value) {
  if (typeof escAttr === "function") return escAttr(value);
  return fvEsc(value);
}

function getFoodVisionButton() {
  return $("foodSnapEstimateBtn");
}

function getFoodVisionInput() {
  return $("foodVisionInput");
}

function getFoodVisionResultEl() {
  return $("foodVisionResult");
}

function setFoodVisionButtonBusy(isBusy) {
  const btn = getFoodVisionButton();
  if (!btn) return;
  btn.disabled = !!isBusy;
  btn.textContent = isBusy ? "⏳ Analyzing..." : "✨ Snap & Estimate";
}

function clearFoodVisionResult() {
  const output = getFoodVisionResultEl();
  if (!output) return;
  output.innerHTML = "";
  output.classList.add("hidden");
  _foodVisionSuggestions = [];
}

function renderFoodVisionMessage(tone, message) {
  const output = getFoodVisionResultEl();
  if (!output) return;

  output.classList.remove("hidden");
  output.innerHTML =
    '<div class="food-vision-result-card food-vision-tone-' + fvEscAttr(tone || "info") + '">' +
      '<div class="food-vision-message">' + fvEsc(message || "") + "</div>" +
    "</div>";
}

function isFoodVisionEnabled() {
  return !!(typeof settings !== "undefined" && settings && settings.aiModulesEnabled);
}

function syncFoodVisionState() {
  const btn = getFoodVisionButton();
  if (!btn) return;

  const enabled = isFoodVisionEnabled();
  btn.classList.toggle("hidden", !enabled);

  if (!enabled) {
    clearFoodVisionResult();
  }
}

function loadExternalScriptOnce(url, readyCheck) {
  if (typeof readyCheck === "function" && readyCheck()) {
    return Promise.resolve();
  }

  if (_foodVisionScriptPromises[url]) {
    return _foodVisionScriptPromises[url];
  }

  _foodVisionScriptPromises[url] = new Promise((resolve, reject) => {
    const existing = Array.from(document.querySelectorAll("script[src]")).find((el) => (el.getAttribute("src") || "") === url);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load script: " + url)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load script: " + url));
    document.head.appendChild(script);
  }).then(() => {
    if (typeof readyCheck === "function" && !readyCheck()) {
      throw new Error("Dependency loaded but global is unavailable");
    }
  });

  return _foodVisionScriptPromises[url];
}

async function ensureFoodVisionLibraries() {
  await loadExternalScriptOnce(FOOD_VISION_TF_URL, () => !!window.tf);
  await loadExternalScriptOnce(FOOD_VISION_MOBILENET_URL, () => !!window.mobilenet);
}

async function loadFoodVisionModel() {
  if (_foodVisionModelPromise) return _foodVisionModelPromise;

  _foodVisionModelPromise = (async () => {
    await ensureFoodVisionLibraries();
    return window.mobilenet.load({ version: 2, alpha: 1.0 });
  })();

  try {
    return await _foodVisionModelPromise;
  } catch (err) {
    _foodVisionModelPromise = null;
    throw err;
  }
}

function getCandidateWordsFromLabel(className) {
  const parts = String(className || "")
    .toLowerCase()
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const words = [];
  parts.forEach((part) => {
    const piece = part.split(/\s+/).filter(Boolean);
    piece.forEach((w) => {
      const cleaned = w.replace(/[^a-z]/g, "");
      if (cleaned.length >= 3) words.push(cleaned);
    });
  });

  return words;
}

function deriveFoodQueries(predictions) {
  const queries = [];
  const seen = new Set();
  const top = Array.isArray(predictions) ? predictions.slice(0, FOOD_VISION_MAX_PREDICTIONS) : [];

  top.forEach((pred) => {
    const label = String((pred && pred.className) || "").toLowerCase();
    if (!label) return;

    FOOD_VISION_QUERY_RULES.forEach((rule) => {
      if (rule.test.test(label)) {
        const key = rule.query.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          queries.push(rule.query);
        }
      }
    });

    if (queries.length < 4) {
      const words = getCandidateWordsFromLabel(label);
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (!seen.has(word)) {
          seen.add(word);
          queries.push(word);
        }
        if (queries.length >= 4) break;
      }
    }
  });

  return queries.slice(0, 4);
}

function toFoodSuggestion(item) {
  const row = item || {};
  return {
    name: String(row.name || "").trim(),
    calories: Math.max(0, Number(row.calories) || 0),
    protein: Math.max(0, Number(row.protein) || 0),
    carbs: Math.max(0, Number(row.carbs) || 0),
    fat: Math.max(0, Number(row.fat) || 0),
    fiber: Math.max(0, Number(row.fiber) || 0),
    sugar: Math.max(0, Number(row.sugar) || 0),
    sodium: Math.max(0, Number(row.sodium) || 0),
    serving: String(row.serving || "").trim(),
  };
}

async function fetchFoodSuggestions(queries) {
  const all = [];
  const seen = new Set();

  for (let i = 0; i < queries.length; i++) {
    const query = String(queries[i] || "").trim();
    if (!query) continue;

    let candidates = [];
    if (typeof getCachedSearch === "function") {
      try {
        candidates = getCachedSearch(query) || [];
      } catch {
        candidates = [];
      }
    }

    if (!candidates.length && typeof searchFoodsAPI === "function") {
      try {
        candidates = await searchFoodsAPI(query);
      } catch {
        candidates = [];
      }
    }

    candidates.slice(0, 3).forEach((item) => {
      const suggestion = toFoodSuggestion(item);
      const key = suggestion.name.toLowerCase();
      if (!suggestion.name || seen.has(key)) return;
      seen.add(key);
      all.push(suggestion);
    });

    if (all.length >= FOOD_VISION_MAX_SUGGESTIONS) break;
  }

  return all.slice(0, FOOD_VISION_MAX_SUGGESTIONS);
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function formatPredictionChip(prediction) {
  const label = String((prediction && prediction.className) || "Unknown");
  const confidence = Math.max(0, Math.min(1, Number(prediction && prediction.probability) || 0));
  const percent = Math.round(confidence * 100);
  return '<span class="food-vision-chip">' + fvEsc(label) + " " + percent + "%</span>";
}

function formatSuggestionMeta(item) {
  const serving = item.serving ? fvEsc(item.serving) + " • " : "";
  return serving +
    item.calories + " cal • P" + item.protein + " C" + item.carbs + " F" + item.fat;
}

function renderFoodVisionResults(predictions, suggestions) {
  const output = getFoodVisionResultEl();
  if (!output) return;

  const chips = (Array.isArray(predictions) ? predictions.slice(0, FOOD_VISION_MAX_PREDICTIONS) : [])
    .map((pred) => formatPredictionChip(pred))
    .join("");

  const suggestionButtons = (Array.isArray(suggestions) ? suggestions : [])
    .map((item, index) => {
      return '<button class="btn btn-outline btn-sm food-vision-suggestion-btn" data-food-vision-pick="' + index + '">' +
        '<span class="food-vision-suggestion-name">' + fvEsc(item.name) + "</span>" +
        '<span class="food-vision-suggestion-meta">' + formatSuggestionMeta(item) + "</span>" +
      "</button>";
    })
    .join("");

  const emptyState = '<div class="food-vision-empty">No close food matches found. Try another photo or type your food manually.</div>';

  output.classList.remove("hidden");
  output.innerHTML =
    '<div class="food-vision-result-card food-vision-tone-info">' +
      '<div class="food-vision-head">' +
        '<span class="food-vision-title">AI Estimate (Beta)</span>' +
        '<span class="food-vision-badge">Client-Side</span>' +
      "</div>" +
      '<div class="food-vision-subtitle">Predicted labels from your photo:</div>' +
      '<div class="food-vision-chips">' + chips + "</div>" +
      '<div class="food-vision-subtitle">Suggested food entries:</div>' +
      '<div class="food-vision-suggestion-list">' + (suggestionButtons || emptyState) + "</div>" +
    "</div>";
}

function applyFoodVisionSuggestion(index) {
  const item = _foodVisionSuggestions[Number(index)];
  if (!item) return;

  if (typeof fillFoodFormFromProduct === "function") {
    fillFoodFormFromProduct(item);
  } else {
    if ($("foodName")) $("foodName").value = item.name || "";
    if ($("foodCalories")) {
      $("foodCalories").value = item.calories || "";
      $("foodCalories").dataset.manualEntry = item.calories ? "1" : "";
    }
    if ($("foodProtein")) $("foodProtein").value = item.protein || "";
    if ($("foodCarbs")) $("foodCarbs").value = item.carbs || "";
    if ($("foodFat")) $("foodFat").value = item.fat || "";
    if ($("foodFiber")) $("foodFiber").value = item.fiber || "";
    if ($("foodSugar")) $("foodSugar").value = item.sugar || "";
    if ($("foodSodium")) $("foodSodium").value = item.sodium || "";
    if ($("foodServing")) $("foodServing").value = item.serving || "";
    if (typeof refreshCalorieGuidance === "function") refreshCalorieGuidance();
    if (typeof refreshMicronutrientHints === "function") refreshMicronutrientHints();
  }

  showToast("Filled form from AI estimate", "success");
}

async function runFoodVisionEstimate(file) {
  if (!file || _foodVisionBusy) return;
  if (!isFoodVisionEnabled()) {
    showToast("Enable AI modules in Settings first", "warning");
    return;
  }

  _foodVisionBusy = true;
  setFoodVisionButtonBusy(true);
  renderFoodVisionMessage("info", "Analyzing photo on-device. This can take a few seconds the first time.");

  try {
    const model = await loadFoodVisionModel();
    const image = await loadImageElement(file);
    const predictions = await model.classify(image, FOOD_VISION_MAX_PREDICTIONS + 1);
    const queries = deriveFoodQueries(predictions);
    const suggestions = await fetchFoodSuggestions(queries);

    _foodVisionSuggestions = suggestions;
    renderFoodVisionResults(predictions, suggestions);

    if (!suggestions.length) {
      showToast("AI estimate complete. No close database match found.", "info");
    } else {
      showToast("AI estimate ready. Pick a suggestion.", "success");
    }
  } catch (err) {
    console.error("Food vision error:", err);
    renderFoodVisionMessage("warn", "Could not process this image. Try a clearer photo or manual logging.");
    showToast("Food photo estimate failed", "error");
  } finally {
    _foodVisionBusy = false;
    setFoodVisionButtonBusy(false);
  }
}

function showFoodVisionPicker() {
  if (!isFoodVisionEnabled()) {
    showToast("Enable future AI modules in Settings to use this", "info");
    return;
  }

  const input = getFoodVisionInput();
  if (!input) {
    showToast("Photo picker unavailable", "error");
    return;
  }

  input.value = "";
  input.click();
}

function initFoodVision() {
  const input = getFoodVisionInput();
  const resultEl = getFoodVisionResultEl();

  if (input && input.dataset.boundFoodVision !== "1") {
    input.dataset.boundFoodVision = "1";
    input.addEventListener("change", function () {
      const file = input.files && input.files[0] ? input.files[0] : null;
      if (!file) return;
      runFoodVisionEstimate(file);
    });
  }

  if (resultEl && resultEl.dataset.boundFoodVision !== "1") {
    resultEl.dataset.boundFoodVision = "1";
    resultEl.addEventListener("click", function (e) {
      const pick = e.target.closest("[data-food-vision-pick]");
      if (!pick) return;
      applyFoodVisionSuggestion(pick.dataset.foodVisionPick);
    });
  }

  syncFoodVisionState();
}

if (typeof window !== "undefined") {
  window.initFoodVision = initFoodVision;
  window.syncFoodVisionState = syncFoodVisionState;
  window.showFoodVisionPicker = showFoodVisionPicker;
  window.applyFoodVisionSuggestion = applyFoodVisionSuggestion;
}
