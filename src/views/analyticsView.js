// ========== ANALYTICS VIEW ==========
// Charts and analytics rendering

const ANALYTICS_TDEE_SYNC_MIN_CONFIDENCE = 0.65;
const ANALYTICS_RANGE_DEFAULT = "14d";

let _analyticsWorker = null;
let _analyticsWorkerSeq = 0;
let _analyticsPending = {};
let _analyticsReportCache = null;

function getAnalyticsDataApi() {
  return window.fitOneDataApi || {};
}

function analyticsLoadData(key) {
  const api = getAnalyticsDataApi();
  if (typeof api.loadData === "function") {
    return api.loadData(key);
  }
  return loadData(key);
}

function initAnalyticsWorker() {
  if (_analyticsWorker || typeof Worker === "undefined") return _analyticsWorker;
  try {
    _analyticsWorker = new Worker("./src/workers/analyticsWorker.js");
    _analyticsWorker.addEventListener("message", function (event) {
      const data = event && event.data ? event.data : {};
      const id = Number(data.id) || 0;
      const pending = _analyticsPending[id];
      if (!pending) return;
      delete _analyticsPending[id];
      pending.resolve(data.payload || null);
    });
    _analyticsWorker.addEventListener("error", function () {
      const pendingIds = Object.keys(_analyticsPending);
      pendingIds.forEach(function (id) {
        const pending = _analyticsPending[id];
        if (!pending) return;
        delete _analyticsPending[id];
        pending.reject(new Error("worker-error"));
      });
    });
  } catch {
    _analyticsWorker = null;
  }
  return _analyticsWorker;
}

function runAnalyticsWorkerTask(task, payload, fallbackFn) {
  const worker = initAnalyticsWorker();
  if (!worker) {
    return Promise.resolve(typeof fallbackFn === "function" ? fallbackFn() : null);
  }

  return new Promise(function (resolve) {
    const id = ++_analyticsWorkerSeq;
    const timer = setTimeout(function () {
      if (_analyticsPending[id]) {
        delete _analyticsPending[id];
      }
      resolve(typeof fallbackFn === "function" ? fallbackFn() : null);
    }, 2500);

    _analyticsPending[id] = {
      resolve: function (result) {
        clearTimeout(timer);
        resolve(result);
      },
      reject: function () {
        clearTimeout(timer);
        resolve(typeof fallbackFn === "function" ? fallbackFn() : null);
      },
    };

    try {
      worker.postMessage({ id: id, task: task, payload: payload || {} });
    } catch {
      clearTimeout(timer);
      delete _analyticsPending[id];
      resolve(typeof fallbackFn === "function" ? fallbackFn() : null);
    }
  });
}

function parseIsoDateLocal(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(raw + "T00:00:00");
  if (!Number.isFinite(date.getTime())) return null;
  return date;
}

function buildDateRangeDays(startDate, endDate) {
  const start = parseIsoDateLocal(startDate);
  const end = parseIsoDateLocal(endDate);
  if (!start || !end || start > end) return [];
  const days = [];
  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    days.push(localDateStr(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function getEarliestLoggedDate() {
  let earliest = null;
  [KEYS.food, KEYS.workouts, KEYS.body].forEach(function (key) {
    analyticsLoadData(key).forEach(function (row) {
      const date = String((row && row.date) || "").trim();
      if (!date) return;
      if (!earliest || date < earliest) earliest = date;
    });
  });
  return earliest || localDateStr(new Date());
}

function getAnalyticsDateRange() {
  const modeEl = $("analyticsDateRange");
  const mode = modeEl ? String(modeEl.value || ANALYTICS_RANGE_DEFAULT) : ANALYTICS_RANGE_DEFAULT;
  const now = new Date();
  const endDate = localDateStr(now);

  if (mode === "custom") {
    const startVal = $("analyticsStartDate") ? $("analyticsStartDate").value : "";
    const endVal = $("analyticsEndDate") ? $("analyticsEndDate").value : "";
    const parsedEnd = parseIsoDateLocal(endVal) || parseIsoDateLocal(endDate);
    const parsedStart = parseIsoDateLocal(startVal) || parsedEnd;
    const safeStart = parsedStart <= parsedEnd ? parsedStart : parsedEnd;
    const safeEnd = parsedEnd >= parsedStart ? parsedEnd : parsedStart;
    const startStr = localDateStr(safeStart);
    const endStr = localDateStr(safeEnd);
    return {
      mode: mode,
      startDate: startStr,
      endDate: endStr,
      days: buildDateRangeDays(startStr, endStr),
      label: fmtDate(startStr) + " -> " + fmtDate(endStr),
    };
  }

  if (mode === "all") {
    const startStr = getEarliestLoggedDate();
    return {
      mode: mode,
      startDate: startStr,
      endDate: endDate,
      days: buildDateRangeDays(startStr, endDate),
      label: "All Time",
    };
  }

  const map = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 };
  const dayCount = Math.max(1, Number(map[mode]) || 14);
  const start = new Date(now.getTime());
  start.setDate(start.getDate() - (dayCount - 1));
  const startStr = localDateStr(start);
  return {
    mode: mode,
    startDate: startStr,
    endDate: endDate,
    days: buildDateRangeDays(startStr, endDate),
    label: "Last " + dayCount + " Days",
  };
}

function refreshAnalyticsRangeUi() {
  const modeEl = $("analyticsDateRange");
  const customRow = $("analyticsCustomRangeRow");
  const labelEl = $("analyticsRangeLabel");
  if (customRow && modeEl) {
    customRow.classList.toggle("hidden", String(modeEl.value || "") !== "custom");
  }

  const range = getAnalyticsDateRange();
  if (labelEl) {
    const dayCount = range.days.length;
    labelEl.textContent = range.label + " • " + dayCount + " day" + (dayCount === 1 ? "" : "s");
  }
}

function bindAnalyticsRangeControls() {
  const modeEl = $("analyticsDateRange");
  const startEl = $("analyticsStartDate");
  const endEl = $("analyticsEndDate");
  if (!modeEl) return;

  if (!modeEl.dataset.bound) {
    modeEl.dataset.bound = "1";
    modeEl.addEventListener("change", function () {
      refreshAnalyticsRangeUi();
      refreshAnalytics();
    });
  }

  if (startEl && !startEl.dataset.bound) {
    startEl.dataset.bound = "1";
    startEl.addEventListener("change", function () {
      refreshAnalyticsRangeUi();
      refreshAnalytics();
    });
  }

  if (endEl && !endEl.dataset.bound) {
    endEl.dataset.bound = "1";
    endEl.addEventListener("change", function () {
      refreshAnalyticsRangeUi();
      refreshAnalytics();
    });
  }

  if (startEl && !startEl.value) {
    const seed = new Date();
    seed.setDate(seed.getDate() - 13);
    startEl.value = localDateStr(seed);
  }
  if (endEl && !endEl.value) {
    endEl.value = localDateStr(new Date());
  }

  refreshAnalyticsRangeUi();
}

function calcRangeReadinessAverage(days) {
  if (typeof calculateReadinessForDate !== "function") return 0;
  const values = (days || []).map(function (day) {
    const result = calculateReadinessForDate(day);
    return Number(result && result.score) || 0;
  }).filter(function (v) {
    return Number.isFinite(v) && v > 0;
  });
  if (!values.length) return 0;
  return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
}

function computeReportCardFallback(payload) {
  const source = payload || {};
  const startDate = String(source.startDate || today());
  const endDate = String(source.endDate || today());
  const dayCount = Math.max(1, Number(source.dayCount) || 1);

  const food = (source.food || []).filter(function (row) {
    return row && row.date >= startDate && row.date <= endDate;
  });
  const workouts = (source.workouts || []).filter(function (row) {
    return row && row.date >= startDate && row.date <= endDate;
  });
  const body = (source.body || []).filter(function (row) {
    return row && row.date >= startDate && row.date <= endDate && Number(row.weight) > 0;
  }).sort(function (a, b) {
    return String(a.date || "").localeCompare(String(b.date || ""));
  });

  const calories = food.reduce(function (sum, row) { return sum + (Number(row.calories) || 0); }, 0);
  const protein = food.reduce(function (sum, row) { return sum + (Number(row.protein) || 0); }, 0);
  const carbs = food.reduce(function (sum, row) { return sum + (Number(row.carbs) || 0); }, 0);
  const fat = food.reduce(function (sum, row) { return sum + (Number(row.fat) || 0); }, 0);
  const workoutMinutes = workouts.reduce(function (sum, row) { return sum + (Number(row.duration) || 0); }, 0);
  const workoutDays = new Set(workouts.map(function (row) { return row.date; }).filter(Boolean)).size;
  const proteinGoal = Math.max(1, Number(source.proteinGoal) || 150);

  const proteinByDay = Object.create(null);
  food.forEach(function (row) {
    if (!row || !row.date) return;
    proteinByDay[row.date] = (Number(proteinByDay[row.date]) || 0) + (Number(row.protein) || 0);
  });
  const proteinGoalDays = Object.keys(proteinByDay).filter(function (dateKey) {
    return Number(proteinByDay[dateKey]) >= proteinGoal;
  }).length;

  const firstWeight = body.length ? Number(body[0].weight) || 0 : 0;
  const latestWeight = body.length ? Number(body[body.length - 1].weight) || 0 : 0;

  return {
    startDate: startDate,
    endDate: endDate,
    dayCount: dayCount,
    caloriesTotal: calories,
    caloriesAvg: calories / dayCount,
    proteinAvg: protein / dayCount,
    carbsAvg: carbs / dayCount,
    fatAvg: fat / dayCount,
    workoutCount: workouts.length,
    workoutDays: workoutDays,
    workoutMinutes: workoutMinutes,
    proteinGoalDays: proteinGoalDays,
    proteinGoal: proteinGoal,
    weightStart: firstWeight,
    weightLatest: latestWeight,
    weightDelta: latestWeight && firstWeight ? latestWeight - firstWeight : 0,
  };
}

function renderAnalyticsReportCard() {
  const card = $("analyticsReportCard");
  if (!card) return;

  const range = getAnalyticsDateRange();
  const payload = {
    startDate: range.startDate,
    endDate: range.endDate,
    dayCount: Math.max(1, range.days.length),
    food: analyticsLoadData(KEYS.food),
    workouts: analyticsLoadData(KEYS.workouts),
    body: analyticsLoadData(KEYS.body),
    proteinGoal: Number(settings.proteinGoal) || 150,
  };

  card.innerHTML = '<div class="card-title">Weekly / Monthly Report Card</div><div class="text-xs" style="color:var(--text2)">Computing report...</div>';

  runAnalyticsWorkerTask("reportCard", payload, function () {
    return computeReportCardFallback(payload);
  }).then(function (report) {
    if (!report) {
      card.innerHTML = '<div class="card-title">Weekly / Monthly Report Card</div><div class="text-xs" style="color:var(--text2)">Could not compute report data.</div>';
      return;
    }

    const readinessAvg = calcRangeReadinessAverage(range.days);
    const streak = typeof calculateStreak === "function" ? calculateStreak() : 0;

    let prCount = 0;
    if (typeof loadPRs === "function") {
      const startMs = Date.parse(range.startDate + "T00:00:00") || 0;
      const endMs = Date.parse(range.endDate + "T23:59:59") || Date.now();
      prCount = loadPRs().filter(function (pr) {
        const ts = Number(pr && pr.timestamp) || Date.parse(String((pr && pr.date) || "") + "T12:00:00") || 0;
        return ts >= startMs && ts <= endMs;
      }).length;
    }

    _analyticsReportCache = {
      ...report,
      readinessAvg: readinessAvg,
      streak: streak,
      prCount: prCount,
      label: range.label,
    };

    const weightLabel = report.weightLatest
      ? report.weightLatest.toFixed(1) + " " + (settings.weightUnit || "kg")
      : "No data";
    const weightDelta = report.weightDelta
      ? (report.weightDelta > 0 ? "+" : "") + report.weightDelta.toFixed(1) + " " + (settings.weightUnit || "kg")
      : "0.0 " + (settings.weightUnit || "kg");

    card.innerHTML =
      '<div class="card-title">Weekly / Monthly Report Card</div>' +
      '<div class="text-xs" style="color:var(--text2)">' + esc(range.label) + '</div>' +
      '<div class="analytics-report-grid mt-8">' +
        '<div class="analytics-report-item"><div class="label">Avg Calories</div><div class="value">' + Math.round(report.caloriesAvg || 0) + '</div></div>' +
        '<div class="analytics-report-item"><div class="label">Avg Protein</div><div class="value">' + Math.round(report.proteinAvg || 0) + 'g</div></div>' +
        '<div class="analytics-report-item"><div class="label">Workout Days</div><div class="value">' + Math.round(report.workoutDays || 0) + '</div></div>' +
        '<div class="analytics-report-item"><div class="label">Workout Minutes</div><div class="value">' + Math.round(report.workoutMinutes || 0) + '</div></div>' +
        '<div class="analytics-report-item"><div class="label">Weight</div><div class="value">' + esc(weightLabel) + '</div></div>' +
        '<div class="analytics-report-item"><div class="label">Weight Trend</div><div class="value">' + esc(weightDelta) + '</div></div>' +
        '<div class="analytics-report-item"><div class="label">PRs</div><div class="value">' + Math.round(prCount) + '</div></div>' +
        '<div class="analytics-report-item"><div class="label">Readiness Avg</div><div class="value">' + (readinessAvg ? Math.round(readinessAvg) + '%' : 'N/A') + '</div></div>' +
      '</div>' +
      '<div class="analytics-report-meta">Streak: ' + Math.round(streak || 0) + ' days • Protein goal days: ' + Math.round(report.proteinGoalDays || 0) + '</div>';
  });
}

function saveAnalyticsReportCardImage() {
  if (!_analyticsReportCache) {
    showToast("Report card is still loading", "info");
    return;
  }

  const report = _analyticsReportCache;
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 860;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#0d1222");
  grad.addColorStop(1, "#090d17");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#9d83ff";
  ctx.font = "700 22px Space Grotesk, sans-serif";
  ctx.fillText("FITONE REPORT CARD", 60, 66);

  ctx.fillStyle = "#d7dceb";
  ctx.font = "500 16px Space Grotesk, sans-serif";
  ctx.fillText(report.label || "Selected range", 60, 96);

  const cards = [
    ["Avg Calories", Math.round(report.caloriesAvg || 0)],
    ["Avg Protein", Math.round(report.proteinAvg || 0) + "g"],
    ["Workout Days", Math.round(report.workoutDays || 0)],
    ["Workout Minutes", Math.round(report.workoutMinutes || 0)],
    ["Weight Delta", (report.weightDelta > 0 ? "+" : "") + (Number(report.weightDelta) || 0).toFixed(1) + " " + (settings.weightUnit || "kg")],
    ["Readiness Avg", report.readinessAvg ? Math.round(report.readinessAvg) + "%" : "N/A"],
    ["PRs", Math.round(report.prCount || 0)],
    ["Streak", Math.round(report.streak || 0) + " days"],
  ];

  cards.forEach(function (item, idx) {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 60 + col * 560;
    const y = 130 + row * 150;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(x, y, 520, 118);

    ctx.fillStyle = "#9ca4b8";
    ctx.font = "600 14px Space Grotesk, sans-serif";
    ctx.fillText(item[0], x + 22, y + 35);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 40px Space Grotesk, sans-serif";
    ctx.fillText(String(item[1]), x + 22, y + 84);
  });

  ctx.fillStyle = "#94a0bb";
  ctx.font = "500 13px Space Grotesk, sans-serif";
  ctx.fillText("Generated " + new Date().toLocaleString(), 60, canvas.height - 30);

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "fitone-report-" + today() + ".png";
  link.click();
}

function bindReportCardActions() {
  const btn = $("saveAnalyticsReportCardBtn");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "1";
  btn.addEventListener("click", saveAnalyticsReportCardImage);
}


// ========== REFRESH ==========
function refreshAnalytics() {
  const activeSubTab = document.querySelector("#panel-analytics .sub-tab.active");
  const subtab = activeSubTab && activeSubTab.dataset && activeSubTab.dataset.subtab
    ? activeSubTab.dataset.subtab
    : "analytics-performance";
  refreshAnalyticsSubTab(subtab);

  const timeRangeSel = $("statsTimeRange");
  if (timeRangeSel && !timeRangeSel.dataset.bound) {
    timeRangeSel.dataset.bound = "true";
    timeRangeSel.addEventListener("change", () => refreshAnalyticsSubTab("analytics-performance"));
  }

  bindAnalyticsRangeControls();
  bindReportCardActions();
  renderAnalyticsReportCard();
}

function refreshAnalyticsSubTab(sub) {
  if (sub === "analytics-performance") drawPerformanceAnalytics();
  if (sub === "analytics-calories") drawCalorieChart();
  if (sub === "analytics-weight") drawWeightChart();
  if (sub === "analytics-workouts") drawWorkoutChart();
  if (sub === "analytics-timing") refreshMealTiming();
  if (sub === "analytics-tdee") refreshTDEE();
}

function drawPerformanceAnalytics() {
  const timeRange = $("statsTimeRange") ? $("statsTimeRange").value : "3m"; // 3m, 6m, 1y
  let daysBack = 90;
  if (timeRange === "6m") daysBack = 180;
  if (timeRange === "1y") daysBack = 365;

  const workouts = analyticsLoadData(KEYS.workouts);
  
  drawPerformanceTonnage(workouts, daysBack);
  drawPerformanceBodyComposition(daysBack);
  drawPerformanceConsistency(workouts);
  drawPerformanceMuscleVolume(daysBack);
  drawPerformance1RMTrends(workouts, daysBack);
  drawPerformancePRs(daysBack);
}

// ========== CALORIE CHART ==========
function drawCalorieChart() {
  const range = getAnalyticsDateRange();
  const days = range.days && range.days.length ? range.days : getLast14Days();
  const food = analyticsLoadData(KEYS.food);
  const vals = days.map((d) => food.filter((f) => f.date === d).reduce((a, f) => a + (f.calories || 0), 0));
  drawBarChart($("chartCalories"), days.map((d) => d.slice(5)), vals, brandColor("--brand-calories"), settings.calorieGoal);

  const last7 = days.slice(-7);
  const macros = { protein: [], carbs: [], fat: [] };
  last7.forEach((d) => {
    const df = food.filter((f) => f.date === d);
    macros.protein.push(df.reduce((a, f) => a + (f.protein || 0), 0));
    macros.carbs.push(df.reduce((a, f) => a + (f.carbs || 0), 0));
    macros.fat.push(df.reduce((a, f) => a + (f.fat || 0), 0));
  });
  drawStackedBar($("chartMacros"), last7.map((d) => d.slice(5)), macros);
  drawMicronutrientTrendChart(days, food);
  renderWeeklySummary(days, food);
}

function getMicronutrientSeries(days, food, key) {
  return days.map(function (dateStr) {
    return food
      .filter(function (row) { return row.date === dateStr; })
      .reduce(function (sum, row) { return sum + (Number(row[key]) || 0); }, 0);
  });
}

function getMicronutrientStats(values) {
  const recent = values.slice(-7);
  const previous = values.slice(0, Math.max(0, values.length - 7)).slice(-7);
  const avgRecent = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const avgPrevious = previous.length ? previous.reduce((a, b) => a + b, 0) / previous.length : 0;
  return {
    avgRecent,
    avgPrevious,
    delta: avgRecent - avgPrevious,
  };
}

function getMicronutrientDeltaTone(delta, preferLower) {
  if (Math.abs(delta) < 0.0001) return "is-neutral";
  if (preferLower) return delta < 0 ? "is-good" : "is-bad";
  return delta > 0 ? "is-good" : "is-bad";
}

function formatMicronutrientValue(value, unit, decimals) {
  const n = Number(value) || 0;
  if (unit === "mg") return Math.round(n) + " mg";
  const d = Number.isFinite(Number(decimals)) ? Math.max(0, Number(decimals)) : 1;
  return n.toFixed(d).replace(/\.0$/, "") + " " + unit;
}

function drawMicronutrientTrendChart(days, food) {
  const canvas = $("chartMicronutrients");
  const summary = $("micronutrientTrendSummary");
  const meta = $("micronutrientTrendMeta");
  if (!canvas || !summary) return;

  const labels = (days || []).map(function (d) { return String(d || "").slice(5); });
  const fiberValues = getMicronutrientSeries(days, food, "fiber");
  const sugarValues = getMicronutrientSeries(days, food, "sugar");
  const sodiumValues = getMicronutrientSeries(days, food, "sodium");
  const hasAny = fiberValues.some((v) => v > 0) || sugarValues.some((v) => v > 0) || sodiumValues.some((v) => v > 0);

  if (!hasAny) {
    drawMultiLineChart(canvas, labels, []);
    summary.innerHTML = '<div class="empty"><div class="empty-icon">🥦</div><div class="empty-text">Log fiber, sugar, and sodium to unlock micronutrient trends.</div></div>';
    if (meta) meta.textContent = "Waiting for micronutrient logs";
    return;
  }

  drawMultiLineChart(canvas, labels, [
    {
      label: "Fiber",
      values: fiberValues,
      color: brandColor("--brand-success") || "#22c55e",
    },
    {
      label: "Sugar",
      values: sugarValues,
      color: brandColor("--brand-warning") || "#f59e0b",
    },
    {
      label: "Sodium",
      values: sodiumValues,
      color: brandColor("--brand-info") || "#38bdf8",
    },
  ]);

  const fiberStats = getMicronutrientStats(fiberValues);
  const sugarStats = getMicronutrientStats(sugarValues);
  const sodiumStats = getMicronutrientStats(sodiumValues);

  const cards = [
    {
      label: "Fiber",
      current: fiberStats.avgRecent,
      delta: fiberStats.delta,
      target: "Target ≥30g",
      unit: "g",
      decimals: 1,
      preferLower: false,
    },
    {
      label: "Sugar",
      current: sugarStats.avgRecent,
      delta: sugarStats.delta,
      target: "Keep ≤50g",
      unit: "g",
      decimals: 1,
      preferLower: true,
    },
    {
      label: "Sodium",
      current: sodiumStats.avgRecent,
      delta: sodiumStats.delta,
      target: "Keep ≤2300mg",
      unit: "mg",
      decimals: 0,
      preferLower: true,
    },
  ];

  summary.innerHTML = cards.map(function (card) {
    const tone = getMicronutrientDeltaTone(card.delta, card.preferLower);
    const deltaPrefix = card.delta > 0 ? "+" : card.delta < 0 ? "-" : "";
    const deltaValue = formatMicronutrientValue(Math.abs(card.delta), card.unit, card.decimals);
    const current = formatMicronutrientValue(card.current, card.unit, card.decimals);
    const deltaLabel = Math.abs(card.delta) < 0.0001 ? "flat vs prior 7d" : deltaPrefix + deltaValue + " vs prior 7d";
    return '<div class="micronutrient-trend-pill">' +
      '<div class="micronutrient-trend-pill-label">' + esc(card.label) + '</div>' +
      '<div class="micronutrient-trend-pill-value">' + esc(current) + '</div>' +
      '<div class="micronutrient-trend-pill-delta ' + tone + '">' + esc(deltaLabel) + '</div>' +
      '<div class="micronutrient-trend-pill-target">' + esc(card.target) + '</div>' +
    '</div>';
  }).join("");

  if (meta) meta.textContent = "7-day avg vs prior 7-day avg";
}

// ========== WEIGHT CHART ==========
function drawWeightChart() {
  const range = getAnalyticsDateRange();
  const scoped = analyticsLoadData(KEYS.body)
    .filter((b) => b.weight && b.date >= range.startDate && b.date <= range.endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  const fallback = analyticsLoadData(KEYS.body).filter((b) => b.weight).sort((a, b) => a.date.localeCompare(b.date));
  const source = scoped.length >= 2 ? scoped : fallback;
  const last20 = source.slice(-20);
  if (last20.length < 2) {
    const canvas = $("chartWeight");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text2").trim();
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Need at least 2 measurements", rect.width / 2, rect.height / 2);
    $("weightStatsCard").innerHTML = "";
    return;
  }
  drawLineChart($("chartWeight"), last20.map((b) => fmtDate(b.date)), last20.map((b) => b.weight), brandColor("--brand-success"));
  const latest = last20[last20.length - 1].weight;
  const first = last20[0].weight;
  $("weightStatsCard").innerHTML =
    '<div class="card-title">Weight Stats</div><div class="stat-row">' +
    '<div class="stat-box"><div class="val">' + latest + '</div><div class="lbl">Current (' + settings.weightUnit + ")</div></div>" +
    '<div class="stat-box"><div class="val">' + (latest - first > 0 ? "+" : "") + (latest - first).toFixed(1) + '</div><div class="lbl">Change</div></div>' +
    '<div class="stat-box"><div class="val">' + (last20.reduce((a, b) => a + b.weight, 0) / last20.length).toFixed(1) + '</div><div class="lbl">Average</div></div></div>';
}

// ========== WORKOUT CHART ==========
function drawWorkoutChart() {
  const range = getAnalyticsDateRange();
  const days = range.days && range.days.length ? range.days : getLast14Days();
  const workouts = analyticsLoadData(KEYS.workouts);
  const vals = days.map((d) => workouts.filter((w) => w.date === d).length);
  drawBarChart($("chartWorkouts"), days.map((d) => d.slice(5)), vals, brandColor("--brand-warning"));

  const thisWeek = workouts.filter((w) => {
    const ws = new Date();
    ws.setDate(ws.getDate() - ws.getDay());
    return w.date >= localDateStr(ws);
  });
  const totalMin = workouts.reduce((a, w) => a + (w.duration || 0), 0);
  const bw = getPrimaryBodyweight();
  const allSets = analyticsLoadData(KEYS.strengthSets);
  let bestEffective = 0;
  workouts.forEach((w) => {
    (w.exercises || []).forEach((ex) => {
      const eff = computeEffectiveLoad(ex, ex, bw);
      if (eff > bestEffective) bestEffective = eff;
    });
  });
  allSets.forEach((s) => {
    const ex = { isAssistedBodyweight: String(s.is_assisted_bodyweight) === "true", weight: Number(s.weight_kg) || 0 };
    bestEffective = Math.max(bestEffective, computeEffectiveLoad(ex, { weight: Number(s.weight_kg) || 0 }, bw));
  });
  let planned = 0;
  let matched = 0;
  workouts.forEach((w) => {
    (w.exercises || []).forEach((ex) => {
      if (ex.targetWeight == null || ex.targetWeight === "") return;
      planned++;
      const actual = Number(ex.weight) || 0;
      const target = Number(ex.targetWeight) || 0;
      if (!target) return;
      const delta = Math.abs(actual - target) / target;
      if (delta <= 0.1) matched++;
    });
  });
  const adherence = planned ? Math.round((matched / planned) * 100) : 0;
  $("workoutStatsCard").innerHTML =
    '<div class="card-title">Workout Stats</div><div class="stat-row">' +
    '<div class="stat-box"><div class="val">' + workouts.length + '</div><div class="lbl">Total</div></div>' +
    '<div class="stat-box"><div class="val">' + thisWeek.length + '</div><div class="lbl">This Week</div></div>' +
    '<div class="stat-box"><div class="val">' + totalMin + '</div><div class="lbl">Total Min</div></div></div>' +
    '<div class="stat-row mt-12"><div class="stat-box"><div class="val">' + bestEffective.toFixed(1) + '</div><div class="lbl">Best Effective Load</div></div>' +
    '<div class="stat-box"><div class="val">' + adherence + '%</div><div class="lbl">Target Adherence (±10%)</div></div></div>';
}

// ========== WEEKLY SUMMARY ==========
function renderWeeklySummary(days, food) {
  const card = $("weeklySummaryCard");
  if (!card) return;
  const thisWeek = days.slice(-7);
  const lastWeek = [];
  for (let i = 20; i >= 8; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    lastWeek.push(localDateStr(d));
  }
  const lw7 = lastWeek.slice(-7);

  const twCals = thisWeek.map((d) => food.filter((f) => f.date === d).reduce((a, f) => a + (f.calories || 0), 0));
  const lwCals = lw7.map((d) => food.filter((f) => f.date === d).reduce((a, f) => a + (f.calories || 0), 0));
  const twAvg = twCals.reduce((a, b) => a + b, 0) / 7;
  const lwAvg = lwCals.reduce((a, b) => a + b, 0) / 7;
  const calChange = twAvg - lwAvg;

  const twPro = thisWeek.map((d) => food.filter((f) => f.date === d).reduce((a, f) => a + (f.protein || 0), 0));
  const twProAvg = twPro.reduce((a, b) => a + b, 0) / 7;

  const workouts = analyticsLoadData(KEYS.workouts);
  const twWorkouts = new Set(workouts.filter((w) => thisWeek.includes(w.date)).map((w) => w.date)).size;
  const lwWorkouts = new Set(workouts.filter((w) => lw7.includes(w.date)).map((w) => w.date)).size;

  const changeIcon = (v) => (v > 0 ? "↑" : v < 0 ? "↓" : "→");
  const changeClass = (v, invert) => {
    if (v === 0) return "change-neutral";
    return (invert ? v < 0 : v > 0) ? "change-up" : "change-down";
  };

  card.innerHTML =
    '<div class="card-title">📊 Weekly Summary</div>' +
    '<div class="summary-grid">' +
    '<div class="summary-item"><div class="val">' + Math.round(twAvg) + '</div><div class="lbl">Avg Calories/Day</div><div class="change ' + changeClass(calChange, false) + '">' + changeIcon(calChange) + " " + Math.abs(Math.round(calChange)) + " vs last week</div></div>" +
    '<div class="summary-item"><div class="val">' + Math.round(twProAvg) + 'g</div><div class="lbl">Avg Protein/Day</div></div>' +
    '<div class="summary-item"><div class="val">' + twWorkouts + "/" + settings.workoutGoal + '</div><div class="lbl">Workouts This Week</div><div class="change ' + changeClass(twWorkouts - lwWorkouts, true) + '">' + changeIcon(twWorkouts - lwWorkouts) + " " + Math.abs(twWorkouts - lwWorkouts) + " vs last week</div></div>" +
    '<div class="summary-item"><div class="val">' + Math.round(twCals.reduce((a, b) => a + b, 0)) + '</div><div class="lbl">Total Calories (7d)</div></div>' +
    "</div>";
}

// ========== MEAL TIMING ==========
function refreshMealTiming() {
  const analysis = analyzeMealTiming();
  drawMealTimeline(analysis);
  drawMacroTimingBars(analysis);
  const insights = getMealTimingInsights(analysis);
  const container = $("mealTimingInsights");
  if (container) {
    if (insights.length) {
      container.innerHTML = insights.map((i) => '<div class="timing-insight"><span>' + i.icon + "</span><span>" + i.text + "</span></div>").join("");
    } else {
      container.innerHTML = '<div class="empty"><div class="empty-icon">🕐</div><div class="empty-text">Log meals with timestamps to get timing insights</div></div>';
    }
  }
}

function drawMealTimeline(analysis) {
  const canvas = $("chartMealTimeline");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;
  const pad = { t: 12, r: 10, b: 22, l: 52 };
  ctx.clearRect(0, 0, W, H);
  const textColor = getComputedStyle(document.documentElement).getPropertyValue("--text2").trim();
  const borderColor = getComputedStyle(document.documentElement).getPropertyValue("--border").trim();

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7.push(localDateStr(d));
  }

  const rowH = (H - pad.t - pad.b) / 7;
  const timeMin = 5, timeMax = 24;
  const timeW = W - pad.l - pad.r;

  ctx.fillStyle = textColor;
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  for (let h = 6; h <= 24; h += 3) {
    const x = pad.l + ((h - timeMin) / (timeMax - timeMin)) * timeW;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, H - pad.b); ctx.stroke();
    const label = h <= 12 ? (h === 12 ? "12p" : h + "a") : h === 24 ? "12a" : h - 12 + "p";
    ctx.fillText(label, x, H - pad.b + 13);
  }

  const mealColors = {
    breakfast: brandColor("--brand-breakfast"),
    lunch: brandColor("--brand-lunch"),
    dinner: brandColor("--brand-dinner"),
    snack: brandColor("--brand-snack"),
  };

  last7.forEach((date, i) => {
    const y = pad.t + i * rowH;
    const meals = analysis.days[date] || [];
    ctx.fillStyle = textColor;
    ctx.font = "9px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(fmtDate(date), pad.l - 6, y + rowH / 2 + 3);

    if (meals.length > 0) {
      const hours = meals.map((m) => m.hour).sort((a, b) => a - b);
      const x1 = pad.l + ((Math.max(hours[0], timeMin) - timeMin) / (timeMax - timeMin)) * timeW;
      const x2 = pad.l + ((Math.min(hours[hours.length - 1], timeMax) - timeMin) / (timeMax - timeMin)) * timeW;
      ctx.fillStyle = "rgba(99,102,241,0.08)";
      ctx.fillRect(x1, y + 2, Math.max(x2 - x1, 2), rowH - 4);
      meals.forEach((m) => {
        const clampedH = Math.max(timeMin, Math.min(timeMax, m.hour));
        const mx = pad.l + ((clampedH - timeMin) / (timeMax - timeMin)) * timeW;
        ctx.fillStyle = mealColors[m.meal] || brandColor("--brand-primary");
        ctx.beginPath();
        ctx.arc(mx, y + rowH / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });
}

function drawMacroTimingBars(analysis) {
  const container = $("macroTimingBars");
  if (!container) return;
  const { periods } = analysis;
  const periodOrder = ["morning", "afternoon", "evening", "lateNight"];
  const totalCal = Object.values(periods).reduce((a, p) => a + p.cal, 0);

  if (totalCal === 0) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">🕐</div><div class="empty-text">No timestamped meal data for the last 7 days</div></div>';
    return;
  }

  let html = "";
  periodOrder.forEach((key) => {
    const p = periods[key];
    const pct = Math.round((p.cal / totalCal) * 100);
    const totalMacro = p.pro + p.carb + p.fat;
    const proPct = totalMacro > 0 ? (p.pro / totalMacro) * 100 : 0;
    const carbPct = totalMacro > 0 ? (p.carb / totalMacro) * 100 : 0;
    const fatPct = totalMacro > 0 ? (p.fat / totalMacro) * 100 : 0;
    html += '<div class="macro-timing-row"><span class="period-label">' + p.label + '</span><div class="macro-timing-bar">' +
      '<div style="width:' + proPct + '%;background:var(--brand-protein)" title="Protein ' + Math.round(proPct) + '%"></div>' +
      '<div style="width:' + carbPct + '%;background:var(--brand-carbs)" title="Carbs ' + Math.round(carbPct) + '%"></div>' +
      '<div style="width:' + fatPct + '%;background:var(--brand-fat)" title="Fat ' + Math.round(fatPct) + '%"></div>' +
      '</div><span class="macro-timing-pct">' + pct + "% cal</span></div>";
  });
  html += '<div style="display:flex;gap:12px;justify-content:center;margin-top:8px;font-size:0.72rem;color:var(--text2)">' +
    '<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--brand-protein);margin-right:3px"></span>Protein</span>' +
    '<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--brand-carbs);margin-right:3px"></span>Carbs</span>' +
    '<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--brand-fat);margin-right:3px"></span>Fat</span></div>';
  container.innerHTML = html;
}

function getMealTimingInsights(analysis) {
  const insights = [];
  const { windows, periods, workoutNutrition } = analysis;
  if (!windows.length) return insights;

  const avgWindow = windows.reduce((a, w) => a + w.window, 0) / windows.length;
  if (avgWindow > 0 && avgWindow <= 8) {
    insights.push({ icon: "🕐", text: "Average eating window: " + avgWindow.toFixed(1) + " hours — consistent with intermittent fasting." });
  } else if (avgWindow > 14) {
    insights.push({ icon: "⏰", text: "Wide eating window (" + avgWindow.toFixed(1) + "h avg). Consider narrowing for metabolic benefits." });
  } else if (avgWindow > 0) {
    insights.push({ icon: "🕐", text: "Average eating window: " + avgWindow.toFixed(1) + " hours." });
  }

  const totalPro = Object.values(periods).reduce((a, p) => a + p.pro, 0);
  if (totalPro > 0) {
    const eveningPro = periods.evening.pro + periods.lateNight.pro;
    const eveningPct = Math.round((eveningPro / totalPro) * 100);
    if (eveningPct > 60) insights.push({ icon: "🥩", text: eveningPct + "% of protein consumed in evening/night. Spread protein across the day for better absorption." });
    const morningPct = Math.round((periods.morning.pro / totalPro) * 100);
    if (morningPct < 15 && totalPro > 50) insights.push({ icon: "🌅", text: "Only " + morningPct + "% of protein at breakfast. Morning protein boosts satiety." });
  }

  const totalCarb = Object.values(periods).reduce((a, p) => a + p.carb, 0);
  if (totalCarb > 0) {
    const eveningCarbPct = Math.round(((periods.evening.carb + periods.lateNight.carb) / totalCarb) * 100);
    if (eveningCarbPct > 65) insights.push({ icon: "🍞", text: eveningCarbPct + "% of carbs consumed after 5pm. Consider earlier carb intake for energy." });
  }

  if (periods.lateNight.cal > 0) {
    const totalCal = Object.values(periods).reduce((a, p) => a + p.cal, 0);
    const lateNightPct = Math.round((periods.lateNight.cal / totalCal) * 100);
    if (lateNightPct > 10) insights.push({ icon: "🌙", text: lateNightPct + "% of calories consumed after 10pm. Late eating may affect sleep quality." });
  }

  const fastedWorkouts = workoutNutrition.filter((w) => !w.hasPre);
  if (fastedWorkouts.length > 0) insights.push({ icon: "🏃", text: fastedWorkouts.length + " fasted workout(s) this week. Consider light pre-workout fuel." });

  const noPostProtein = workoutNutrition.filter((w) => !w.hasPost || w.postProtein < 15);
  if (noPostProtein.length > 0) insights.push({ icon: "💪", text: noPostProtein.length + " workout(s) without adequate post-workout protein (<15g within 2hrs)." });

  const last7dates = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); last7dates.push(localDateStr(d)); }
  const skippedBreakfast = last7dates.filter((d) => {
    const meals = analysis.days[d] || [];
    return meals.length > 0 && !meals.some((m) => m.hour >= 5 && m.hour < 10);
  }).length;
  if (skippedBreakfast >= 4) insights.push({ icon: "🚫", text: "Breakfast skipped " + skippedBreakfast + "/7 days this week." });

  return insights;
}

// ========== TDEE ==========
function refreshTDEE() {
  const container = $("tdeeContent");
  if (!container) return;

  const tdeeResult = calculateAdaptiveTDEE();
  const plateaus = detectPlateau();
  const recs = generateRecommendations(tdeeResult, plateaus);

  if (tdeeResult.status === "insufficient") {
    const progress = tdeeResult.dataPoints / (tdeeResult.needed || 14);
    container.innerHTML = '<div class="card-title">\uD83E\uDDEE Adaptive TDEE</div>' +
      '<div class="empty"><div class="empty-icon">📊</div><div class="empty-text">' + tdeeResult.message + "</div>" +
      '<div class="data-progress"><div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(100, Math.round(progress * 100)) + '%"></div></div>' +
      '<span class="progress-label">' + tdeeResult.dataPoints + "/" + tdeeResult.needed + "</span></div></div>";
    return;
  }

  saveTDEEData({ estimatedTDEE: tdeeResult.estimatedTDEE, confidence: tdeeResult.confidence, lastCalculated: today(), dataPoints: tdeeResult.dataPoints });

  let html = '<div class="card-title">\uD83E\uDDEE Adaptive TDEE</div>';
  html += '<div class="tdee-value">' + tdeeResult.estimatedTDEE + ' <span class="tdee-unit">cal/day</span></div>';
  html += '<div class="confidence-meter"><div class="confidence-meter-fill" style="width:' + Math.round(tdeeResult.confidence * 100) + '%"></div></div>';
  html += '<div class="tdee-detail">Based on ' + tdeeResult.dataPoints + " days of data \u2022 " + Math.round(tdeeResult.confidence * 100) + "% confidence</div>";
  html += '<div class="tdee-detail" style="margin-top:4px">Avg intake: ' + tdeeResult.avgCalories + " cal \u2022 Weight \u0394: " + (tdeeResult.weightChange > 0 ? "+" : "") + tdeeResult.weightChange.toFixed(1) + " " + settings.weightUnit + "</div>";

  if (plateaus.length) {
    html += '<div style="margin-top:12px">';
    plateaus.forEach((p) => { html += '<div class="plateau-alert"><span class="alert-icon">' + p.icon + '</span><span class="alert-text">' + p.message + "</span></div>"; });
    html += "</div>";
  }

  if (recs.length) {
    html += '<div style="margin-top:12px"><div style="font-weight:600;font-size:0.85rem;margin-bottom:6px">Recommendations</div>';
    recs.forEach((r) => { html += '<div class="recommendation-card"><span class="rec-icon">' + r.icon + "</span><span>" + r.text + "</span></div>"; });
    html += "</div>";
  }

  const confidencePct = Math.round((Number(tdeeResult.confidence) || 0) * 100);
  const syncReady = (Number(tdeeResult.confidence) || 0) >= ANALYTICS_TDEE_SYNC_MIN_CONFIDENCE;
  html += '<div class="tdee-sync-actions">' +
    '<button class="btn btn-outline btn-sm" id="tdeeSyncGoalBtn"' + (syncReady ? "" : " disabled") + '>SYNC GOAL TO TDEE</button>' +
    '</div>';
  html += '<div class="tdee-detail tdee-sync-status' + (syncReady ? ' is-ready' : '') + '" id="tdeeSyncGoalStatus">' +
    (syncReady
      ? 'Ready for sync at ' + confidencePct + '% confidence. ' +
        ((settings.bodyGoal || 'maintain') === 'compete'
          ? 'Updates active profile and regenerates training/rest/carb-up/peak-week targets.'
          : 'Updates calories/macros for your current goal (' + (settings.bodyGoal || 'maintain') + ').')
      : 'Confidence ' + confidencePct + '% is below the sync threshold (' + Math.round(ANALYTICS_TDEE_SYNC_MIN_CONFIDENCE * 100) + '%). Keep logging daily food + weight.') +
    '</div>';

  if (settings.lastGoalSyncAt) {
    html += '<div class="tdee-detail" style="margin-top:6px">Last goal sync: ' + fmtDate(localDateStr(new Date(settings.lastGoalSyncAt))) + '</div>';
  }

  container.innerHTML = html;

  const syncBtn = $("tdeeSyncGoalBtn");
  if (syncBtn) {
    syncBtn.addEventListener("click", () => {
      if (typeof syncGoalToAdaptiveTDEE !== "function") {
        showToast("Goal sync helper is unavailable", "warning");
        return;
      }
      const syncResult = syncGoalToAdaptiveTDEE({ minConfidence: ANALYTICS_TDEE_SYNC_MIN_CONFIDENCE });
      if (!syncResult || syncResult.status === "insufficient") {
        showToast(syncResult && syncResult.message ? syncResult.message : "Not enough data for goal sync", "warning");
        refreshTDEE();
        return;
      }
      if (syncResult.status === "low-confidence") {
        showToast("TDEE confidence is still low. Keep logging before syncing.", "info");
        refreshTDEE();
        return;
      }
      if (syncResult.status === "ready" && syncResult.targets) {
        const dayType = syncResult.dayType ? " [" + syncResult.dayType + "]" : "";
        showToast("Goals synced" + dayType + ": " + syncResult.targets.calories + " kcal (P" + syncResult.targets.protein + " C" + syncResult.targets.carbs + " F" + syncResult.targets.fat + ")", "success");
        if (typeof loadSettingsUI === "function") loadSettingsUI();
        if (typeof refreshToday === "function") refreshToday();
        refreshTDEE();
      }
    });
  }
}

// ========== RESIZE HANDLER ==========
let _resizeTimer;
function initAnalyticsResize() {
  window.addEventListener("resize", () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      const activeTab = document.querySelector(".tab-btn.active");
      if (activeTab && activeTab.dataset.tab === "analytics") refreshAnalytics();
    }, 250);
  });
}

// ========== W9 STATS HUB V2 IMPLEMENTATIONS ==========

function getExerciseSessionVolume(ex) {
  if (!ex) return 0;
  if (Array.isArray(ex.sets)) {
    return ex.sets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
  }
  return (parseInt(ex.sets, 10) || 0) * (parseInt(ex.reps, 10) || 0) * (parseFloat(ex.weight) || 0);
}

function getExercisePeakWeight(ex) {
  if (!ex) return 0;
  if (Array.isArray(ex.sets)) {
    return ex.sets.reduce((max, s) => Math.max(max, parseFloat(s.weight) || 0), 0);
  }
  return parseFloat(ex.weight) || 0;
}

function timeAgoFromDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return days + " days ago";
  const months = Math.floor(days / 30);
  return months + (months === 1 ? " month ago" : " months ago");
}

function drawPerformanceTonnage(workouts, daysBack) {
  const chartEl = $("chartTonnage");
  if (!chartEl) return;
  
  const endD = new Date();
  const startD = new Date();
  startD.setDate(endD.getDate() - daysBack);
  
  const weeks = [];
  const vals = [];
  
  let currentStart = new Date(startD);
  while (currentStart <= endD) {
     const currentEnd = new Date(currentStart);
     currentEnd.setDate(currentEnd.getDate() + 6);
     
     const startStr = localDateStr(currentStart);
     const endStr = localDateStr(currentEnd);
     
     let sum = 0;
     workouts.forEach(w => {
       if (w.date >= startStr && w.date <= endStr) {
          (w.exercises||[]).forEach(ex => {
            sum += getExerciseSessionVolume(ex);
          });
       }
     });
     weeks.push(currentStart.toLocaleString('default', {month:'short', day:'numeric'}));
     vals.push(sum / 1000); // Tons
     
     currentStart.setDate(currentStart.getDate() + 7);
  }
  
  let totalTonnage = vals.reduce((a, b) => a + b, 0);
  $("statsTonnageVal").textContent = totalTonnage.toFixed(1) + " TONS";
  
  const prevStart = new Date(startD); prevStart.setDate(prevStart.getDate() - daysBack);
  const prevEnd = new Date(startD); prevEnd.setDate(prevEnd.getDate() - 1);
  const psStr = localDateStr(prevStart); const peStr = localDateStr(prevEnd);
  let prevSum = 0;
  workouts.forEach(w => {
    if (w.date >= psStr && w.date <= peStr) {
      (w.exercises||[]).forEach(ex => {
        prevSum += getExerciseSessionVolume(ex);
      });
    }
  });
  prevSum /= 1000;
  
  const trendEl = $("statsTonnageTrend");
  if (prevSum === 0) {
     trendEl.textContent = "Baseline Established";
     trendEl.style.color = "var(--text2)";
  } else {
     const pct = ((totalTonnage - prevSum) / prevSum) * 100;
     trendEl.textContent = (pct>0?"+":"") + pct.toFixed(1) + "% vs prev " + (daysBack) + "d";
     trendEl.style.color = pct >= 0 ? "var(--success)" : "var(--danger)";
  }
  
  if (typeof drawLineChart === 'function') {
    const lineColor = typeof brandColor === "function" ? brandColor("--accent") : "#8B5CF6";
    drawLineChart(chartEl, weeks, vals, lineColor);
  }
}

function drawPerformanceConsistency(workouts) {
  const wrap = $("statsConsistencyHeatmap");
  if (!wrap) return;
  wrap.innerHTML = "";
  
  const endD = new Date();
  const daysHash = {};
  const foods = analyticsLoadData(KEYS.food);
  workouts.forEach(w => { daysHash[w.date] = (daysHash[w.date]||0) + 1; });
  foods.forEach(f => { daysHash[f.date] = (daysHash[f.date]||0) + 1; });
  
  let daysMatched = 0;
  let activeWeeks = new Set();
  
  for (let c = 11; c >= 0; c--) {
     for (let r = 0; r < 7; r++) {
       const d = new Date();
       d.setDate(endD.getDate() - (c * 7 + (6 - r))); 
       
       const dStr = localDateStr(d);
       const block = document.createElement("div");
       block.style.width = "12px";
       block.style.height = "12px";
       block.style.borderRadius = "2px";
       block.title = dStr;
       
       if (daysHash[dStr]) {
          const v = daysHash[dStr];
          daysMatched++;
          activeWeeks.add(c);
          if (v > 2) block.style.background = "rgba(187,134,252,1)";
          else if (v === 2) block.style.background = "rgba(187,134,252,0.6)";
          else block.style.background = "rgba(187,134,252,0.3)";
       } else {
          block.style.background = "rgba(255,255,255,0.05)";
       }
       wrap.appendChild(block);
     }
  }
  
  const pct = Math.round((activeWeeks.size / 12) * 100);
  $("statsConsistencyVal").textContent = pct + "% Target Consistency (12W)";
}

function formatSetDisplay(value) {
  const num = Number(value) || 0;
  if (Math.abs(num - Math.round(num)) < 0.05) return String(Math.round(num));
  return num.toFixed(1);
}

function drawPerformanceMuscleVolume(daysBack) {
  const listEl = $("statsMuscleVolumeList");
  const statusEl = $("statsMuscleVolumeStatus");
  const windowEl = $("statsMuscleVolumeWindow");
  if (!listEl || !statusEl) return;

  if (typeof getWeeklyMuscleVolumeStats !== "function") {
    statusEl.textContent = "Muscle volume engine is still loading.";
    listEl.innerHTML = '<div class="empty text-sm stats-pr-empty">Try again in a moment.</div>';
    return;
  }

  const current = getWeeklyMuscleVolumeStats(0);
  const previous = getWeeklyMuscleVolumeStats(1);
  if (windowEl && current && current.startDate && current.endDate) {
    windowEl.textContent = fmtDate(current.startDate) + " -> " + fmtDate(current.endDate);
  }

  let statusText = (current && current.statusMessage) || "";
  if (current && current.totalSetEntries > 0 && previous && previous.totalSetEntries > 0) {
    const delta = current.totalSetEntries - previous.totalSetEntries;
    const deltaSign = delta > 0 ? "+" : "";
    statusText += " Total sets " + deltaSign + formatSetDisplay(delta) + " vs last week.";
  } else if (current && current.totalSetEntries > 0 && previous && previous.totalSetEntries === 0) {
    statusText += " Previous week had no logged sets.";
  }

  statusEl.textContent = statusText || "Log weighted sets to unlock weekly muscle volume guidance.";
  statusEl.className = "stats-volume-status";
  if (current && current.statusTone === "in-range") statusEl.classList.add("is-in-range");
  if (current && current.statusTone === "under") statusEl.classList.add("is-under");
  if (current && current.statusTone === "over") statusEl.classList.add("is-over");

  const rows = (current && current.muscles ? current.muscles : [])
    .filter(function (row) { return row.sets > 0; })
    .slice(0, 10);

  if (!rows.length) {
    listEl.innerHTML = '<div class="empty text-sm stats-pr-empty">Log workouts this week to see muscle-set volume.</div>';
    return;
  }

  listEl.innerHTML = rows.map(function (row) {
    const statusClass = row.status === "over" ? "is-over" : row.status === "under" ? "is-under" : "is-in-range";
    const statusLabel = row.status === "over" ? "Above MRV" : row.status === "under" ? "Below MEV" : "In Range";
    const setsLabel = formatSetDisplay(row.sets) + " sets";
    const targetLabel = "Target " + row.mev + "-" + row.mrv;
    return '<div class="stats-volume-row ' + statusClass + '">' +
      '<div class="stats-volume-head"><span class="stats-volume-name">' + esc(row.label) + '</span><span class="stats-volume-value">' + esc(setsLabel) + '</span></div>' +
      '<div class="stats-volume-track"><span class="stats-volume-fill ' + statusClass + '" style="width:' + Math.max(4, row.pctOfMrv) + '%"></span></div>' +
      '<div class="stats-volume-note">' + esc(targetLabel) + ' • ' + esc(statusLabel) + '</div>' +
    '</div>';
  }).join("");
}

function formatPerformanceRangeLabel(daysBack) {
  const days = Math.max(14, Number(daysBack) || 90);
  if (days >= 365) return "Last 12 months";
  if (days >= 180) return "Last 6 months";
  if (days >= 90) return "Last 3 months";
  return "Last " + days + " days";
}

function collectExercise1RMTrends(workouts, daysBack) {
  const days = Math.max(14, Number(daysBack) || 90);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const byExercise = {};

  (workouts || []).forEach(function (workout) {
    const ts = Number(workout && workout.timestamp) || Date.parse(String((workout && workout.date) || "") + "T12:00:00");
    if (!Number.isFinite(ts) || ts < cutoff) return;

    (workout.exercises || []).forEach(function (exercise) {
      const exerciseName = String((exercise && exercise.name) || "").trim();
      if (!exerciseName) return;

      let est1RM = Number(exercise.est1RM) || 0;
      if (est1RM <= 0 && typeof calculateExerciseEstimated1RM === "function") {
        est1RM = calculateExerciseEstimated1RM(exercise);
      } else if (est1RM <= 0 && typeof calculate1RM === "function") {
        est1RM = calculate1RM(exercise && exercise.weight, exercise && exercise.reps);
      }
      if (est1RM <= 0) return;

      const key = exerciseName.toLowerCase();
      if (!byExercise[key]) {
        byExercise[key] = { name: exerciseName, pointsByDate: {} };
      }

      const dateKey = String(workout.date || localDateStr(new Date(ts)));
      const existing = byExercise[key].pointsByDate[dateKey];
      if (!existing || est1RM > existing.value) {
        byExercise[key].pointsByDate[dateKey] = {
          date: dateKey,
          ts: ts,
          value: est1RM,
        };
      }
    });
  });

  return Object.keys(byExercise).map(function (key) {
    const entry = byExercise[key];
    const points = Object.values(entry.pointsByDate).sort(function (a, b) { return a.ts - b.ts; });
    const first = points[0];
    const latest = points[points.length - 1];
    const delta = latest.value - first.value;
    const pct = first.value > 0 ? (delta / first.value) * 100 : 0;

    return {
      name: entry.name,
      points: points,
      sessions: points.length,
      baseline: first.value,
      latest: latest.value,
      delta: delta,
      pct: pct,
      latestDate: latest.date,
      latestTs: latest.ts,
    };
  });
}

function render1RMSparkline(points) {
  const windowed = (points || []).slice(-10);
  if (!windowed.length) return "";

  const values = windowed.map(function (p) { return p.value; });
  const min = Math.min.apply(null, values);
  const max = Math.max.apply(null, values);
  const spread = Math.max(0.0001, max - min);

  return '<div class="stats-1rm-spark">' + windowed.map(function (point) {
    const normalized = (point.value - min) / spread;
    const h = Math.max(6, Math.round(8 + normalized * 24));
    return '<span class="stats-1rm-spark-bar" style="height:' + h + 'px"></span>';
  }).join("") + "</div>";
}

function drawPerformance1RMTrends(workouts, daysBack) {
  const listEl = $("stats1RMTrendList");
  const rangeEl = $("stats1RMWindow");
  if (!listEl) return;
  if (rangeEl) rangeEl.textContent = formatPerformanceRangeLabel(daysBack);

  const trends = collectExercise1RMTrends(workouts, daysBack)
    .sort(function (a, b) {
      if ((b.latestTs || 0) !== (a.latestTs || 0)) return (b.latestTs || 0) - (a.latestTs || 0);
      return (b.latest || 0) - (a.latest || 0);
    })
    .slice(0, 8);

  if (!trends.length) {
    listEl.innerHTML = '<div class="empty text-sm stats-pr-empty">Log weighted sets to unlock estimated 1RM trends.</div>';
    return;
  }

  const unit = settings.weightUnit || "kg";
  listEl.innerHTML = trends.map(function (trend) {
    const latestDateLabel = trend.latestDate ? fmtDate(trend.latestDate) : "recent";
    const latestLabel = trend.latest.toFixed(1) + " " + unit;

    let deltaClass = "is-neutral";
    let deltaLabel = "Baseline";
    if (trend.sessions > 1) {
      const deltaSign = trend.delta > 0 ? "+" : "";
      const pctSign = trend.pct > 0 ? "+" : "";
      if (trend.delta > 0) deltaClass = "is-good";
      if (trend.delta < 0) deltaClass = "is-bad";
      deltaLabel = (trend.delta > 0 ? "↑ " : trend.delta < 0 ? "↓ " : "→ ") + deltaSign + trend.delta.toFixed(1) + " " + unit + " (" + pctSign + trend.pct.toFixed(1) + "%)";
    }

    return '<button class="stats-1rm-item" data-1rm-exercise="' + escAttr(trend.name) + '">' +
      '<div class="stats-1rm-main">' +
        '<div class="stats-1rm-name">' + esc(trend.name) + '</div>' +
        '<div class="stats-1rm-meta">' + trend.sessions + ' session' + (trend.sessions === 1 ? '' : 's') + ' • latest ' + esc(latestDateLabel) + '</div>' +
        render1RMSparkline(trend.points) +
      '</div>' +
      '<div class="stats-1rm-side">' +
        '<div class="stats-1rm-latest">' + esc(latestLabel) + '</div>' +
        '<div class="stats-1rm-delta ' + deltaClass + '">' + esc(deltaLabel) + '</div>' +
      '</div>' +
    '</button>';
  }).join("");

  listEl.querySelectorAll("[data-1rm-exercise]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const exercise = btn.getAttribute("data-1rm-exercise");
      if (!exercise) return;
      if (typeof showDeepDiveModal === "function") {
        showDeepDiveModal(exercise);
      } else {
        showToast("Deep Dive is loading. Try again in a moment.", "info");
      }
    });
  });
}

function drawPerformancePRs(daysBack) {
  const container = $("statsPRCards");
  if (!container) return;
  let prs = [];
  const rangeDays = Math.max(7, Number(daysBack) || 90);
  const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000;

  function tsFromPR(pr) {
    if (!pr) return 0;
    if (Number(pr.timestamp) > 0) return Number(pr.timestamp);
    const parsed = Date.parse(pr.date || "");
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof loadPRs === "function") {
    prs = loadPRs()
      .filter(pr => pr && pr.exercise && pr.value && tsFromPR(pr) >= cutoff)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 6)
      .map(pr => {
        const unit = pr.type === "reps" ? "reps" : (settings.weightUnit || "kg");
        return {
          name: pr.exercise,
          value: pr.value,
          date: pr.date,
          label: pr.type === "reps" ? "REP PR" : pr.type === "volume" ? "VOLUME PR" : pr.type === "est1RM" ? "1RM PR" : "WEIGHT PR",
          unit,
        };
      });
  }

  if (!prs.length) {
    const workouts = analyticsLoadData(KEYS.workouts);
    const maxes = {};
    workouts.forEach(w => {
      (w.exercises || []).forEach(ex => {
        const key = (ex.name || "").trim().toLowerCase();
        if (!key) return;
        const wt = getExercisePeakWeight(ex);
        if (wt > 0 && (!maxes[key] || wt > maxes[key].value)) {
          maxes[key] = { value: wt, date: w.date, label: "WEIGHT PR" };
        }
      });
    });
    prs = Object.keys(maxes)
      .map(k => ({ name: k, value: maxes[k].value, date: maxes[k].date, label: maxes[k].label, unit: settings.weightUnit || "kg" }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }

  if (!prs.length) {
    container.innerHTML = '<div class="empty text-sm stats-pr-empty">Log workouts to see your PRs here.</div>';
    return;
  }

  let summary = { count: prs.length, previousCount: 0, delta: 0, frequencyPerWeek: 0 };
  if (typeof getPRSummary === "function") {
    summary = getPRSummary(rangeDays);
  }
  const deltaLabel = summary.delta > 0 ? '+' + summary.delta : String(summary.delta);
  const trendTone = summary.delta >= 0 ? 'var(--brand-success)' : 'var(--brand-danger)';

  const summaryHtml =
    '<div class="card" style="padding:10px 12px;margin-bottom:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05)">' +
      '<div style="font-size:11px;letter-spacing:0.08em;color:var(--text2);font-weight:700">PR MOMENTUM</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-top:6px">' +
        '<div><div style="font-size:22px;font-weight:700;color:var(--primary)">' + summary.count + '</div><div style="font-size:11px;color:var(--text2)">PRs in selected range</div></div>' +
        '<div style="text-align:right">' +
          '<div style="font-size:12px;color:' + trendTone + ';font-weight:700">Δ ' + deltaLabel + ' vs prior period</div>' +
          '<div style="font-size:11px;color:var(--text2)">' + summary.frequencyPerWeek + ' PRs/week</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  container.innerHTML = summaryHtml + prs.map(pr => {
    const ageText = timeAgoFromDate(pr.date);
    const isNew = ageText === "today" || ageText === "1 day ago" || ageText.includes("days ago") && parseInt(ageText, 10) <= 14;
    const badge = isNew ? "NEW HIGH" : "STABLE";
    const exerciseName = String(pr.name || "").trim();

    return '<button class="card stats-pr-item" data-pr-exercise="' + esc(exerciseName) + '" style="padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;width:100%;text-align:left">' +
      '<div>' +
      '<div style="font-size:12px;letter-spacing:0.08em;color:var(--text2);font-weight:700;margin-bottom:4px">PERSONAL RECORD</div>' +
      '<div style="font-size:14px;font-weight:700;margin-bottom:4px;text-transform:capitalize">' + esc(pr.name) + '</div>' +
      '<div style="font-size:12px;color:var(--text2)">' + esc(pr.label) + ' • ' + esc(ageText) + '</div>' +
      '</div>' +
      '<div style="text-align:right">' +
      '<div style="font-size:20px;font-weight:700;color:var(--primary)">' + pr.value + ' <span style="font-size:12px;color:var(--text2)">' + esc(pr.unit) + '</span></div>' +
      '<div style="margin-top:4px"><span style="background:' + (isNew ? 'rgba(187,134,252,0.2);color:var(--primary)' : 'rgba(255,255,255,0.1);color:var(--text2)') + ';padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700">' + badge + '</span></div>' +
      '</div>' +
      '</button>';
  }).join('');

  container.querySelectorAll("[data-pr-exercise]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const exercise = btn.getAttribute("data-pr-exercise");
      if (!exercise) return;
      if (typeof showDeepDiveModal === "function") {
        showDeepDiveModal(exercise);
      } else {
        showToast("Deep Dive is loading. Try again in a moment.", "info");
      }
    });
  });
}

const BODY_COMPOSITION_METRICS = [
  { key: "weight", label: "Weight", unit: () => (settings.weightUnit || "kg") },
  { key: "bodyFat", label: "Body Fat", unit: () => "%" },
  { key: "chest", label: "Chest", unit: () => (settings.measureUnit || "cm") },
  { key: "waist", label: "Waist", unit: () => (settings.measureUnit || "cm") },
  { key: "arms", label: "Arms", unit: () => (settings.measureUnit || "cm") },
  { key: "legs", label: "Legs", unit: () => (settings.measureUnit || "cm") },
];

function bodyMetricValue(entry, keys) {
  if (!entry) return null;
  const list = Array.isArray(keys) ? keys : [keys];
  for (let i = 0; i < list.length; i++) {
    const n = Number(entry[list[i]]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function bodyTrendPreference(metricKey) {
  if (metricKey === "bodyFat" || metricKey === "waist") return "down";
  if (metricKey === "weight") {
    const goal = settings.bodyGoal || "maintain";
    if (goal === "lose") return "down";
    if (goal === "compete") return "down";
    if (goal === "gain" || goal === "performance") return "up";
    return "neutral";
  }
  return "up";
}

function bodyTrendToneClass(metricKey, delta) {
  if (!delta) return "is-neutral";
  const pref = bodyTrendPreference(metricKey);
  if (pref === "neutral") return "is-neutral";
  const improving = pref === "up" ? delta > 0 : delta < 0;
  return improving ? "is-good" : "is-bad";
}

function drawPerformanceBodyComposition(daysBack) {
  const canvas = $("chartBodyComposition");
  const trendList = $("statsBodyTrendList");
  const symmetryBox = $("statsSymmetryAnalysis");
  const rangeEl = $("statsBodyRange");
  if (!canvas || !trendList || !symmetryBox || !rangeEl) return;

  const allBody = analyticsLoadData(KEYS.body)
    .filter((b) => b && b.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!allBody.length) {
    drawRadarChart(canvas, BODY_COMPOSITION_METRICS.map((m) => m.label), [], { showLegend: false });
    trendList.innerHTML = '<div class="text-sm stats-pr-empty">Log body measurements to unlock directional trends.</div>';
    symmetryBox.innerHTML = '<div class="text-sm stats-muted-label">Symmetry analysis appears after body measurements are logged.</div>';
    rangeEl.textContent = "No measurements";
    return;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Math.max(14, Number(daysBack) || 90));
  let scoped = allBody.filter((b) => Date.parse((b.date || "") + "T00:00:00") >= cutoff.getTime());
  if (!scoped.length) scoped = allBody.slice(Math.max(0, allBody.length - 12));
  if (!scoped.length) scoped = allBody.slice();

  const first = scoped[0];
  const latest = scoped[scoped.length - 1];
  const labels = BODY_COMPOSITION_METRICS.map((m) => m.label);
  const firstValues = BODY_COMPOSITION_METRICS.map((m) => bodyMetricValue(first, m.key) || 0);
  const latestValues = BODY_COMPOSITION_METRICS.map((m) => bodyMetricValue(latest, m.key) || 0);
  const hasAnyValues = latestValues.some((v) => v > 0) || firstValues.some((v) => v > 0);

  if (!hasAnyValues) {
    drawRadarChart(canvas, labels, [], { showLegend: false });
    trendList.innerHTML = '<div class="text-sm stats-pr-empty">Save waist, chest, arms, legs, body fat, or weight to render this chart.</div>';
    symmetryBox.innerHTML = '<div class="text-sm stats-muted-label">Symmetry analysis appears after body measurements are logged.</div>';
    rangeEl.textContent = "Waiting for metrics";
    return;
  }

  const maxValues = BODY_COMPOSITION_METRICS.map((m, i) => {
    const historicalMax = scoped.reduce((mx, row) => Math.max(mx, bodyMetricValue(row, m.key) || 0), 0);
    const base = Math.max(historicalMax, firstValues[i], latestValues[i], 1);
    return base * 1.12;
  });

  drawRadarChart(
    canvas,
    labels,
    [
      {
        label: "Start",
        values: firstValues,
        color: "rgba(255,255,255,0.72)",
        fillColor: "rgba(255,255,255,0.08)",
      },
      {
        label: "Current",
        values: latestValues,
        color: typeof brandColor === "function" ? (brandColor("--accent") || "#8B5CF6") : "#8B5CF6",
        fillColor: "rgba(139,92,246,0.24)",
      },
    ],
    { maxValues, levels: 5, showLegend: true }
  );

  rangeEl.textContent = fmtDate(first.date) + " -> " + fmtDate(latest.date);

  trendList.innerHTML = BODY_COMPOSITION_METRICS.map((metric) => {
    const series = scoped
      .map((row) => ({ date: row.date, value: bodyMetricValue(row, metric.key) }))
      .filter((row) => row.value != null);
    if (!series.length) {
      return '<div class="stats-body-trend-item"><span class="stats-body-trend-label">' + esc(metric.label) + '</span><span class="stats-body-trend-current">No data</span><span class="stats-body-trend-delta is-neutral">-> collect</span></div>';
    }
    const current = series[series.length - 1];
    const previous = series.length > 1 ? series[series.length - 2] : null;
    const delta = previous ? current.value - previous.value : 0;
    const arrow = previous ? (delta > 0 ? "↑" : delta < 0 ? "↓" : "→") : "•";
    const tone = bodyTrendToneClass(metric.key, delta);
    const unit = metric.unit();
    const currentLabel = current.value.toFixed(1) + (unit === "%" ? "%" : " " + unit);
    const deltaLabel = previous
      ? ((delta > 0 ? "+" : "") + delta.toFixed(1) + (unit === "%" ? "%" : " " + unit))
      : "baseline";
    return '<div class="stats-body-trend-item"><span class="stats-body-trend-label">' + esc(metric.label) + '</span><span class="stats-body-trend-current">' + currentLabel + '</span><span class="stats-body-trend-delta ' + tone + '">' + arrow + " " + deltaLabel + '</span></div>';
  }).join("");

  const leftArm = bodyMetricValue(latest, ["leftArm", "armLeft", "left_arm", "leftBicep", "bicepLeft", "armsLeft"]);
  const rightArm = bodyMetricValue(latest, ["rightArm", "armRight", "right_arm", "rightBicep", "bicepRight", "armsRight"]);
  const leftLeg = bodyMetricValue(latest, ["leftLeg", "legLeft", "left_leg", "leftQuad", "quadLeft", "legsLeft"]);
  const rightLeg = bodyMetricValue(latest, ["rightLeg", "legRight", "right_leg", "rightQuad", "quadRight", "legsRight"]);
  const chest = bodyMetricValue(latest, "chest");
  const waist = bodyMetricValue(latest, "waist");
  const arms = bodyMetricValue(latest, "arms");
  const legs = bodyMetricValue(latest, "legs");
  const mu = settings.measureUnit || "cm";

  const symmetryRows = [];
  function pushSymmetryRow(label, left, right, unit) {
    if (!(left && right)) return;
    const avg = (left + right) / 2;
    const asymPct = avg > 0 ? (Math.abs(left - right) / avg) * 100 : 0;
    const state = asymPct <= 2 ? "is-good" : asymPct <= 5 ? "is-neutral" : "is-bad";
    const dominant = left === right ? "Even" : left > right ? "L-heavy" : "R-heavy";
    symmetryRows.push('<div class="stats-body-sym-row"><span class="stats-body-sym-label">' + esc(label) + '</span><span class="stats-body-sym-values">' + left.toFixed(1) + "/" + right.toFixed(1) + " " + esc(unit) + '</span><span class="stats-body-sym-score ' + state + '">' + dominant + " " + asymPct.toFixed(1) + '%</span></div>');
  }

  pushSymmetryRow("Arms L/R", leftArm, rightArm, mu);
  pushSymmetryRow("Legs L/R", leftLeg, rightLeg, mu);

  if (chest && waist) {
    const ratio = chest / waist;
    const state = ratio >= 1.2 ? "is-good" : ratio >= 1.05 ? "is-neutral" : "is-bad";
    symmetryRows.push('<div class="stats-body-sym-row"><span class="stats-body-sym-label">Chest:Waist</span><span class="stats-body-sym-values">' + ratio.toFixed(2) + '</span><span class="stats-body-sym-score ' + state + '">' + (ratio >= 1.2 ? "Strong taper" : ratio >= 1.05 ? "Developing" : "Needs focus") + "</span></div>");
  }
  if (arms && legs) {
    const ratio = arms / legs;
    const diff = Math.abs(ratio - 0.45);
    const state = diff <= 0.03 ? "is-good" : diff <= 0.07 ? "is-neutral" : "is-bad";
    symmetryRows.push('<div class="stats-body-sym-row"><span class="stats-body-sym-label">Upper:Lower ratio</span><span class="stats-body-sym-values">' + ratio.toFixed(2) + '</span><span class="stats-body-sym-score ' + state + '">' + (state === "is-good" ? "Balanced" : state === "is-neutral" ? "Near target" : "Imbalance") + "</span></div>");
  }

  if (!symmetryRows.length) {
    symmetryBox.innerHTML = '<div class="text-sm stats-muted-label">Add left/right limb fields (leftArm/rightArm/leftLeg/rightLeg) or chest/waist metrics for full symmetry analysis.</div>';
  } else {
    symmetryBox.innerHTML = '<div class="stats-body-sym-title">Symmetry and Proportion</div>' + symmetryRows.join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const analyticsPanel = $("panel-analytics");
  if (analyticsPanel && analyticsPanel.classList.contains("active")) {
    refreshAnalytics();
  }
});
