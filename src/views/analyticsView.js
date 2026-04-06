// ========== ANALYTICS VIEW ==========
// Charts and analytics rendering


// ========== REFRESH ==========
function refreshAnalytics() {
  const activeSubTab = document.querySelector("#panel-analytics .sub-tab.active");
  if (activeSubTab) refreshSubTab(activeSubTab.dataset.subtab);

  const timeRangeSel = $("statsTimeRange");
  if (timeRangeSel && !timeRangeSel.dataset.bound) {
    timeRangeSel.dataset.bound = "true";
    timeRangeSel.addEventListener("change", () => refreshSubTab("analytics-performance"));
  }
}

function refreshSubTab(sub) {
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

  const workouts = loadData(KEYS.workouts);
  
  drawPerformanceTonnage(workouts, daysBack);
  drawPerformanceConsistency(workouts);
  drawPerformancePRs();
}

// ========== CALORIE CHART ==========
function drawCalorieChart() {
  const days = getLast14Days();
  const food = loadData(KEYS.food);
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
  renderWeeklySummary(days, food);
}

// ========== WEIGHT CHART ==========
function drawWeightChart() {
  const body = loadData(KEYS.body).filter((b) => b.weight).sort((a, b) => a.date.localeCompare(b.date));
  const last20 = body.slice(-20);
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
  const days = getLast14Days();
  const workouts = loadData(KEYS.workouts);
  const vals = days.map((d) => workouts.filter((w) => w.date === d).length);
  drawBarChart($("chartWorkouts"), days.map((d) => d.slice(5)), vals, brandColor("--brand-warning"));

  const thisWeek = workouts.filter((w) => {
    const ws = new Date();
    ws.setDate(ws.getDate() - ws.getDay());
    return w.date >= localDateStr(ws);
  });
  const totalMin = workouts.reduce((a, w) => a + (w.duration || 0), 0);
  const bw = getPrimaryBodyweight();
  const allSets = loadData(KEYS.strengthSets);
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

  const workouts = loadData(KEYS.workouts);
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

  container.innerHTML = html;
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
             (ex.sets||[]).forEach(s => sum += (parseFloat(s.weight)||0)*(parseInt(s.reps)||0));
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
         (ex.sets||[]).forEach(s => prevSum += (parseFloat(s.weight)||0)*(parseInt(s.reps)||0));
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
  
  if (typeof drawLineChart === 'function') drawLineChart(chartEl, weeks, vals, "var(--primary)"); 
}

function drawPerformanceConsistency(workouts) {
  const wrap = $("statsConsistencyHeatmap");
  if (!wrap) return;
  wrap.innerHTML = "";
  
  const endD = new Date();
  const daysHash = {};
  workouts.forEach(w => { daysHash[w.date] = (daysHash[w.date]||0) + 1; });
  
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

function drawPerformancePRs() {
  const container = $("statsPRCards");
  if (!container) return;
  const workouts = loadData(KEYS.workouts);
  
  const maxes = {};
  workouts.forEach(w => {
    (w.exercises||[]).forEach(ex => {
       (ex.sets||[]).forEach(s => {
          const wt = parseFloat(s.weight)||0;
          if (wt > 0) {
             const key = (ex.name||"").trim().toLowerCase();
             if (key) {
               if (!maxes[key] || wt > maxes[key].wt) {
                  maxes[key] = { wt: wt, date: w.date };
               }
             }
          }
       });
    });
  });
  
  const prs = Object.keys(maxes).map(k => ({ name: k, wt: maxes[k].wt, date: maxes[k].date }));
  prs.sort((a,b) => b.wt - a.wt);
  
  if (!prs.length) return;
  
  container.innerHTML = prs.slice(0, 5).map(pr => {
    const dDate = new Date(pr.date);
    const ageDays = (new Date() - dDate) / (1000 * 3600 * 24);
    const badge = ageDays <= 14 
       ? '<span style="background:rgba(187,134,252,0.2);color:var(--primary);padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700">NEW HIGH</span>'
       : '<span style="background:rgba(255,255,255,0.1);color:var(--text2);padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700">STABLE</span>';
       
    return '<div class="card" style="padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
             '<div>' +
               '<div style="font-size:14px;font-weight:600;margin-bottom:4px;text-transform:capitalize">' + escAttr(pr.name) + '</div>' +
               '<div style="font-size:12px;color:var(--text2)">' + fmtDate(pr.date) + '</div>' + 
             '</div>' + 
             '<div style="text-align:right">' + 
               '<div style="font-size:20px;font-weight:700;color:var(--primary)">' + pr.wt + ' <span style="font-size:12px;color:var(--text2)">' + (settings.weightUnit||'kg') + '</span></div>' +
               '<div style="margin-top:4px">' + badge + '</div>' +
             '</div>' +
           '</div>';
  }).join('');
}
