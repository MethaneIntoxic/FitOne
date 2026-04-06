// ========== TODAY VIEW ==========
// Rendering and event binding for the Today tab

// Forward declarations for cross-view navigation (set by main.js)
let _goToLog = null;
let _goToLogWorkout = null;

function setNavCallbacks(goToLog, goToLogWorkout) {
  _goToLog = goToLog;
  _goToLogWorkout = goToLogWorkout;
}

// ========== WATER ==========
function addWater(amount) {
  const data = loadData(KEYS.water);
  data.push({ date: today(), amount, timestamp: Date.now() });
  saveData(KEYS.water, data);
  refreshWater();
  refreshWaterInsights();
  showToast("+" + amount + "ml water 💧");
}

function undoWater() {
  const data = loadData(KEYS.water);
  const todayEntries = data.filter((w) => w.date === today());
  if (!todayEntries.length) return;
  const lastIdx = data.lastIndexOf(todayEntries[todayEntries.length - 1]);
  if (lastIdx >= 0) data.splice(lastIdx, 1);
  saveData(KEYS.water, data);
  refreshWater();
  refreshWaterInsights();
  showToast("Water undone");
}

function addCustomWater() {
  const input = $("customWater");
  const amount = parseInt(input.value);
  if (!amount || amount <= 0) {
    showToast("Enter a valid amount", "error");
    return;
  }
  addWater(amount);
  input.value = "";
}

function refreshWater() {
  const total = getWaterToday();
  const goal = settings.waterGoal || 2000;
  const pct = total / goal;
  $("waterInfo").textContent = total + " / " + goal + " ml";
  if ($("waterPercent")) $("waterPercent").textContent = Math.round(pct * 100) + "%";
  const canvas = $("waterRing");
  if (canvas) drawRing(canvas, pct, brandColor("--brand-info"));
}

function refreshWaterInsights() {
  const d = today();
  const food = loadData(KEYS.food).filter((f) => f.date === d);
  const workouts = loadData(KEYS.workouts).filter((w) => w.date === d);
  const totals = food.reduce(
    (a, f) => ({
      cal: a.cal + (f.calories || 0),
      pro: a.pro + (f.protein || 0),
      carb: a.carb + (f.carbs || 0),
      fat: a.fat + (f.fat || 0),
    }),
    { cal: 0, pro: 0, carb: 0, fat: 0 }
  );
  renderInsights(totals, food, workouts);
}

// ========== DELETE ==========
// deleteFood and deleteWorkout are defined in logView.js (loaded after this file)

// ========== WELLNESS ==========
function saveWellness() {
  const sleep = parseInt($("wellnessSleep").value) || 3;
  const soreness = parseInt($("wellnessSoreness").value) || 3;
  const energy = parseInt($("wellnessEnergy").value) || 3;
  const data = loadData(KEYS.wellness);
  const idx = data.findIndex((w) => w.date === today());
  const entry = { date: today(), sleep, soreness, energy, timestamp: Date.now() };
  if (idx >= 0) data[idx] = entry;
  else data.push(entry);
  saveData(KEYS.wellness, data);
  showToast("Wellness saved! 🧘");
  refreshReadiness();
}

// ========== INSIGHTS ==========
function renderInsights(totals, food, workouts) {
  const insights = [];
  const s = settings;

  if (totals.cal > s.calorieGoal * 1.1) {
    insights.push({ type: "warn", icon: "⚠️", text: "You've exceeded your calorie goal by " + (totals.cal - s.calorieGoal) + " calories." });
  } else if (totals.cal >= s.calorieGoal * 0.9 && totals.cal <= s.calorieGoal) {
    insights.push({ type: "good", icon: "✅", text: "Great job! You're close to your calorie target." });
  }

  if (totals.pro < s.proteinGoal * 0.5 && food.length > 0) {
    insights.push({ type: "tip", icon: "💡", text: "Your protein is low (" + totals.pro + "g / " + s.proteinGoal + "g). Consider a high-protein snack." });
  }
  if (totals.pro >= s.proteinGoal) {
    insights.push({ type: "good", icon: "💪", text: "Protein goal hit! Nice work." });
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStr = localDateStr(weekStart);
  const allWorkouts = loadData(KEYS.workouts);
  const weekWorkoutDays = new Set(allWorkouts.filter((w) => w.date >= weekStr).map((w) => w.date)).size;

  if (weekWorkoutDays >= s.workoutGoal) {
    insights.push({ type: "good", icon: "🏆", text: "Weekly workout goal met! " + weekWorkoutDays + "/" + s.workoutGoal + " days." });
  } else {
    const remaining = s.workoutGoal - weekWorkoutDays;
    insights.push({ type: "tip", icon: "📅", text: remaining + " more workout day" + (remaining > 1 ? "s" : "") + " to hit your weekly goal." });
  }

  const bodyData = loadData(KEYS.body).filter((b) => b.weight).sort((a, b) => a.date.localeCompare(b.date));
  if (bodyData.length >= 2) {
    const last = bodyData[bodyData.length - 1];
    const prev = bodyData[bodyData.length - 2];
    const diffNum = last.weight - prev.weight;
    const diff = diffNum.toFixed(1);
    if (diffNum > 0) insights.push({ type: "tip", icon: "📈", text: "Weight up " + diff + " " + s.weightUnit + " since last measurement." });
    else if (diffNum < 0) insights.push({ type: "good", icon: "📉", text: "Weight down " + Math.abs(diffNum).toFixed(1) + " " + s.weightUnit + " since last measurement." });
  }

  const waterTotal = getWaterToday();
  const waterGoal = s.waterGoal || 2000;
  if (waterTotal >= waterGoal) {
    insights.push({ type: "good", icon: "💧", text: "Water goal reached! Stay hydrated." });
  } else if (waterTotal < waterGoal * 0.3 && new Date().getHours() > 14) {
    insights.push({ type: "warn", icon: "💧", text: "You're behind on water today. Drink up!" });
  }

  const readinessResult = calculateReadiness();
  if (readinessResult.score < 40) {
    insights.push({ type: "warn", icon: "😴", text: "Readiness is low (" + readinessResult.score + "). Consider a rest day or light stretching." });
  } else if (readinessResult.score >= 75) {
    insights.push({ type: "good", icon: "⚡", text: "High readiness (" + readinessResult.score + ")! Great day for an intense workout." });
  }

  if (insights.length === 0 && food.length === 0 && workouts.length === 0) {
    $("todayInsights").innerHTML = '<div class="empty"><div class="empty-icon">💡</div><div class="empty-text">Start logging to unlock personalized insights</div></div>';
    return;
  }

  $("todayInsights").innerHTML = insights
    .map((i) => '<div class="insight insight-' + i.type + '"><span class="insight-icon">' + i.icon + "</span><span>" + i.text + "</span></div>")
    .join("");
}

// ========== READINESS ==========
function drawReadinessSparkline() {
  const canvas = $("readinessSparkline");
  if (!canvas) return;

  const scores = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    scores.push(calculateReadinessForDate(localDateStr(d)));
  }

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 50 * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width, H = 50;
  const pad = 12;
  ctx.clearRect(0, 0, W, H);

  const points = scores.map((s, i) => ({
    x: pad + (i / 6) * (W - 2 * pad),
    y: pad + (1 - s / 100) * (H - 2 * pad - 8),
  }));

  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "rgba(99,102,241,0.18)");
  gradient.addColorStop(1, "rgba(99,102,241,0.02)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.lineTo(points[6].x, H - pad);
  ctx.lineTo(points[0].x, H - pad);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = brandColor("--brand-primary");
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
  const textColor = getComputedStyle(document.documentElement).getPropertyValue("--text2").trim();
  points.forEach((p, i) => {
    ctx.fillStyle = getReadinessColor(scores[i]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = "8px sans-serif";
    ctx.textAlign = "center";
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    ctx.fillText(dayNames[d.getDay()], p.x, H - 2);
  });
}

function refreshReadiness() {
  const result = calculateReadiness();
  if (typeof drawEnergyGauge === "function") drawEnergyGauge(result.score);
  else drawReadinessGauge(result.score);
  const statusEl = $("readinessStatus");
  if (statusEl) {
    statusEl.textContent = "Energy " + result.score + "%";
    statusEl.style.color = getReadinessColor(result.score);
  }
  const detailEl = $("readinessDetail");
  if (detailEl) {
    const parts = [];
    parts.push("Sleep " + (result.wellnessBonus > 0 ? "high" : "steady"));
    parts.push("Recovery " + (result.recoveryBonus > 0 ? "ready" : "building"));
    parts.push("Freshness " + (result.freshnessFactor >= 0 ? "stable" : "low"));
    detailEl.textContent = parts.join(" • ");
  }
  const w = loadWellnessToday();
  const savedBadge = $("wellnessSavedBadge");
  if (savedBadge) {
    if (w) savedBadge.classList.remove("hidden");
    else savedBadge.classList.add("hidden");
  }
  if (w) {
    if ($("wellnessSleep")) $("wellnessSleep").value = w.sleep;
    if ($("wellnessSoreness")) $("wellnessSoreness").value = w.soreness;
    if ($("wellnessEnergy")) $("wellnessEnergy").value = w.energy;
    if ($("sleepVal")) $("sleepVal").textContent = w.sleep;
    if ($("sorenessVal")) $("sorenessVal").textContent = w.soreness;
    if ($("energyVal")) $("energyVal").textContent = w.energy;
  }
  drawReadinessSparkline();
}

// ========== SMART CARD ORDER ==========
function reorderTodayCards() {
  const panel = $("panel-today");
  if (!panel) return;
  let banner = $("uxLockBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "uxLockBanner";
    banner.className = "mini-banner";
    panel.insertBefore(banner, panel.firstChild);
  }
  banner.innerHTML = settings.uxLockEnabled
    ? "Classic layout locked. New layout available → Try & switch (coming soon)."
    : 'New layout preview enabled. <button class="btn btn-outline btn-sm" id="restoreClassicLayoutBtn">Use classic layout</button>';
  const restoreBtn = $("restoreClassicLayoutBtn");
  if (restoreBtn) {
    restoreBtn.addEventListener("click", () => {
      const next = { ...settings, uxLockEnabled: true };
      updateSettings(next);
      localStorage.setItem(KEYS.settings, JSON.stringify(next));
      refreshToday();
      showToast("Classic layout restored");
    });
  }
  if (settings.uxLockEnabled) return;
  const hour = new Date().getHours();
  let order;
  if (hour >= 5 && hour < 12) {
    order = ["readiness", "calories", "food", "water", "workouts", "streak", "stats", "insights", "wellness"];
  } else if (hour >= 12 && hour < 17) {
    order = ["readiness", "workouts", "calories", "food", "water", "streak", "stats", "insights", "wellness"];
  } else {
    order = ["readiness", "workouts", "calories", "water", "food", "streak", "stats", "insights", "wellness"];
  }
  const cards = panel.querySelectorAll("[data-section]");
  cards.forEach((card) => {
    const section = card.getAttribute("data-section");
    const idx = order.indexOf(section);
    card.style.order = idx >= 0 ? idx : 99;
  });
}

// ========== GOAL CELEBRATIONS ==========
function checkGoalCelebrations(totals, workouts) {
  if (!totals && !workouts) return;
  const s = settings;
  const celebrations = [];

  if (totals) {
    if (totals.cal >= s.calorieGoal && s.calorieGoal > 0) celebrations.push("Calorie goal reached! 🎯");
    if (totals.pro >= s.proteinGoal && s.proteinGoal > 0) celebrations.push("Protein goal smashed! 💪");
  }

  const waterToday = getWaterToday();
  if (waterToday >= (s.waterGoal || 2000)) celebrations.push("Hydration goal hit! 💧");

  if (workouts && workouts.length > 0) {
    const weekWorkouts = loadData(KEYS.workouts).filter((w) => {
      const d = new Date(w.date);
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    });
    if (weekWorkouts.length >= (s.workoutGoal || 4)) celebrations.push("Weekly workout goal achieved! 🏆");
  }

  if (!window._celebratedGoals) window._celebratedGoals = {};
  const todayKey = today();
  if (!window._celebratedGoals[todayKey]) window._celebratedGoals[todayKey] = [];

  celebrations.forEach((msg) => {
    if (window._celebratedGoals[todayKey].includes(msg)) return;
    window._celebratedGoals[todayKey].push(msg);
    triggerCelebration(msg);
  });
}

function triggerCelebration(message) {
  showToast(message);
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("div");
    p.className = "confetti-particle";
    p.style.left = Math.random() * 100 + "vw";
    p.style.background = [
      brandColor("--brand-confetti-1"),
      brandColor("--brand-confetti-2"),
      brandColor("--brand-confetti-3"),
      brandColor("--brand-confetti-4"),
      brandColor("--brand-confetti-5"),
      brandColor("--brand-confetti-6"),
    ][Math.floor(Math.random() * 6)];
    p.style.animationDelay = Math.random() * 0.5 + "s";
    p.style.animationDuration = 1.5 + Math.random() + "s";
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 3000);
  }
}

// ========== MACRO HINTS ==========
function updateMacroHints(totals) {
  const pRemain = Math.max(0, settings.proteinGoal - (totals ? totals.pro : 0));
  const cRemain = Math.max(0, settings.carbsGoal - (totals ? totals.carb : 0));
  const fRemain = Math.max(0, settings.fatGoal - (totals ? totals.fat : 0));
  if ($("proteinHint")) $("proteinHint").textContent = pRemain > 0 ? "(" + pRemain + "g left)" : "✓";
  if ($("carbsHint")) $("carbsHint").textContent = cRemain > 0 ? "(" + cRemain + "g left)" : "✓";
  if ($("fatHint")) $("fatHint").textContent = fRemain > 0 ? "(" + fRemain + "g left)" : "✓";
}

// ========== MAIN REFRESH ==========
function refreshToday() {
  const d = today();
  const food = loadData(KEYS.food).filter((f) => f.date === d);
  const workouts = loadData(KEYS.workouts).filter((w) => w.date === d);

  const totals = food.reduce(
    (a, f) => ({
      cal: a.cal + (f.calories || 0),
      pro: a.pro + (f.protein || 0),
      carb: a.carb + (f.carbs || 0),
      fat: a.fat + (f.fat || 0),
    }),
    { cal: 0, pro: 0, carb: 0, fat: 0 }
  );

  $("macroRings").innerHTML = [
    { label: "Calories", val: totals.cal, goal: settings.calorieGoal, color: brandColor("--brand-calories") },
    { label: "Protein", val: totals.pro, goal: settings.proteinGoal, color: brandColor("--brand-protein"), unit: "g" },
    { label: "Carbs", val: totals.carb, goal: settings.carbsGoal, color: brandColor("--brand-carbs"), unit: "g" },
    { label: "Fat", val: totals.fat, goal: settings.fatGoal, color: brandColor("--brand-fat"), unit: "g" },
  ]
    .map(
      (r) => `
    <div class="ring-item">
      <canvas width="128" height="128" id="ring_${r.label}"></canvas>
      <div class="ring-value">${r.val}${r.unit || ""}</div>
      <div class="ring-label">${r.label} (${r.goal}${r.unit || ""})</div>
    </div>
  `
    )
    .join("");

  setTimeout(() => {
    [
      { label: "Calories", val: totals.cal, goal: settings.calorieGoal, color: brandColor("--brand-calories") },
      { label: "Protein", val: totals.pro, goal: settings.proteinGoal, color: brandColor("--brand-protein") },
      { label: "Carbs", val: totals.carb, goal: settings.carbsGoal, color: brandColor("--brand-carbs") },
      { label: "Fat", val: totals.fat, goal: settings.fatGoal, color: brandColor("--brand-fat") },
    ].forEach((r) => drawRing($("ring_" + r.label), r.val / r.goal, r.color));
  }, 0);

  // Calorie progress bar
  const calPct = Math.min((totals.cal / settings.calorieGoal) * 100, 100);
  $("calorieProgressBar").style.width = calPct + "%";
  if (totals.cal > settings.calorieGoal) {
    $("calorieProgressBar").style.background = "linear-gradient(90deg, var(--red), #ff7043)";
  } else {
    $("calorieProgressBar").style.background = "linear-gradient(90deg, var(--accent), var(--accent2))";
  }
  const remaining = settings.calorieGoal - totals.cal;
  $("calorieProgressLabel").textContent = remaining >= 0 ? remaining + " calories remaining" : Math.abs(remaining) + " calories over goal";

  // Net calories
  const burned = workouts.reduce((a, w) => a + (w.caloriesBurned || 0), 0);
  const net = totals.cal - burned;
  if ($("netCalDisplay")) {
    $("netCalDisplay").innerHTML = burned > 0
      ? "Net: <strong>" + net + "</strong> cal (eaten " + totals.cal + " − burned " + burned + ")"
      : "";
  }

  // Streak
  const streak = calculateStreak();
  const longestStreak = calculateLongestStreak();
  const hasActivityToday = food.length > 0 || workouts.length > 0;
  $("streakNumber").textContent = streak;
  const streakLabel = $("streakLabel");
  if (streakLabel) {
    if (streak === 0 && !hasActivityToday) streakLabel.textContent = "Start a new streak today!";
    else if (!hasActivityToday && streak > 0) streakLabel.textContent = "day streak — keep it going!";
    else streakLabel.textContent = streak === 1 ? "day streak" : "day streak";
  }
  const longestInfo = $("longestStreakInfo");
  if (longestInfo && longestStreak > streak) {
    longestInfo.innerHTML = "🏅 Best<br><strong>" + longestStreak + " days</strong>";
  } else if (longestInfo) {
    longestInfo.innerHTML = longestStreak > 0 && streak >= longestStreak ? "🏅 <strong>Personal best!</strong>" : "";
  }

  // Stats
  const workoutMins = workouts.reduce((a, w) => a + (w.duration || 0), 0);
  const bodyData = loadData(KEYS.body).filter((b) => b.weight).sort((a, b) => a.date.localeCompare(b.date));
  let trendArrow = "";
  if (bodyData.length >= 2) {
    const diff = bodyData[bodyData.length - 1].weight - bodyData[bodyData.length - 2].weight;
    trendArrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
  }
  const latestWeight = bodyData.length ? bodyData[bodyData.length - 1].weight + settings.weightUnit : "—";
  $("todayStats").innerHTML = `
    <div class="stat-box"><div class="val" data-count="${food.length}">0</div><div class="lbl">Meals</div></div>
    <div class="stat-box"><div class="val" data-count="${workouts.length}">0</div><div class="lbl">Workouts</div></div>
    <div class="stat-box"><div class="val" data-count="${workoutMins}">0</div><div class="lbl">Minutes</div></div>
    <div class="stat-box"><div class="val">${latestWeight} ${trendArrow}</div><div class="lbl">Weight</div></div>
  `;
  $("todayStats").querySelectorAll(".val[data-count]").forEach((el) => animateCounter(el, parseInt(el.dataset.count)));

  // Water
  refreshWater();

  // Food list
  if (food.length) {
    const byMeal = {};
    const mealOrder = ["breakfast", "lunch", "dinner", "snack"];
    food.forEach((f) => {
      const m = f.meal || "snack";
      if (!byMeal[m]) byMeal[m] = [];
      byMeal[m].push(f);
    });
    let html = "";
    mealOrder.forEach((m) => {
      if (!byMeal[m]) return;
      const mealLabel = m.charAt(0).toUpperCase() + m.slice(1);
      const mealCals = byMeal[m].reduce((a, f) => a + (f.calories || 0), 0);
      html += '<div class="meal-group-header"><span>' + mealEmoji(m) + " " + mealLabel + '</span><span class="text-xs">' + mealCals + " cal</span></div>";
      byMeal[m].forEach((f) => {
        const time = f.timestamp ? fmtTime(f.timestamp) : "";
        html += '<div class="list-item"><div class="list-item-main"><div class="list-item-title">' + esc(f.name) + '<span class="entry-time">' + time + '</span></div><div class="list-item-sub">' + (f.serving ? esc(f.serving) + " • " : "") + "P" + (f.protein || 0) + " C" + (f.carbs || 0) + " F" + (f.fat || 0) + '</div></div><div class="list-item-right" style="display:flex;align-items:center;gap:6px"><div style="font-weight:600">' + f.calories + ' cal</div><button class="btn-delete" data-delete-food="' + f.id + '" title="Delete" aria-label="Delete ' + escAttr(f.name) + '">✕</button></div></div>';
      });
    });
    $("todayFood").innerHTML = html;
  } else {
    $("todayFood").innerHTML = '<div class="empty"><div class="empty-icon">🍽️</div><div class="empty-text">Ready to fuel your day? 🍎</div><button class="btn btn-primary btn-sm" data-action="goToLog">Log your first meal</button></div>';
  }

  // Workout list
  if (workouts.length) {
    $("todayWorkouts").innerHTML = workouts
      .map((w) => {
        const time = w.timestamp ? fmtTime(w.timestamp) : "";
        return '<div class="list-item"><div class="list-item-main"><div class="list-item-title">' + esc(w.name) + '<span class="entry-time">' + time + '</span></div><div class="list-item-sub">' + w.type + " • " + (w.duration || 0) + " min • " + (w.exercises || []).length + ' exercises</div></div><div class="list-item-right" style="display:flex;align-items:center;gap:6px"><span class="tag tag-blue">' + (w.caloriesBurned || 0) + ' cal</span><button class="btn-delete" data-delete-workout="' + w.id + '" title="Delete" aria-label="Delete workout">✕</button></div></div>';
      })
      .join("");
  } else {
    $("todayWorkouts").innerHTML = '<div class="empty"><div class="empty-icon">🏋️</div><div class="empty-text">Time to move! Let\'s crush it 💪</div><button class="btn btn-primary btn-sm" data-action="goToLogWorkout">Log a workout</button></div>';
  }

  renderInsights(totals, food, workouts);
  refreshReadiness();
  updateMacroHints(totals);
  reorderTodayCards();
  checkGoalCelebrations(totals, workouts);

  // W3.2 Update greeting
  refreshGreeting();

  // W3.5 Next workout preview
  refreshNextWorkout();

  // W3.6 Bottom stat boxes
  refreshDashboardBottom(workouts);

  // W3.1 Header avatar
  refreshHeaderAvatar();
}

// ========== W3.1 HEADER AVATAR ==========
function refreshHeaderAvatar() {
  const el = $("headerAvatar");
  if (!el) return;
  if (settings.avatar) {
    el.innerHTML = '<img src="' + settings.avatar + '" alt="Avatar" class="header-avatar-img">';
  } else {
    el.innerHTML = '<span class="material-symbols-outlined">person</span>';
  }
}

// ========== W3.2 PERSONALIZED GREETING ==========
function refreshGreeting() {
  const el = $("greetingName");
  if (!el) return;
  const name = settings.displayName || "Athlete";
  el.textContent = "Welcome " + name;
}

// ========== W3.5 NEXT WORKOUT PREVIEW ==========
function refreshNextWorkout() {
  const content = $("nextWorkoutContent");
  if (!content) return;

  const protocols = loadData(KEYS.protocols);
  if (!protocols.length) {
    content.innerHTML = '<div class="empty"><div class="empty-icon">\ud83c\udfcb\ufe0f</div><div class="empty-text">Create Your First Routine \u2192</div></div>';
    return;
  }

  // Pick the first protocol as "next"
  const proto = protocols[0];
  const exercises = proto.exercises || [];
  const exerciseCount = exercises.length;
  const typeTag = (proto.type || "STRENGTH").toUpperCase();
  const level = settings.experienceLevel || "intermediate";
  const durationMinutes = Math.max(20, Number(proto.duration) || exerciseCount * 7 || 35);
  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);
  const intensityTag = typeTag === "HIIT" ? "HIGH INTENSITY" : typeTag;

  content.innerHTML =
    '<div class="next-workout-body next-workout-grid">' +
    '<div class="next-workout-main">' +
    '<span class="tag tag-purple">' + intensityTag + '</span>' +
    '<div class="next-workout-name">' + esc(proto.name || "Workout") + '</div>' +
    '<div class="next-workout-meta">' +
    '<span class="material-symbols-outlined">schedule</span>' + durationMinutes + 'm ' +
    '<span class="next-workout-dot">•</span>' +
    '<span class="material-symbols-outlined">fitness_center</span>' + levelLabel +
    '</div>' +
    '<div class="next-workout-sub">' + exerciseCount + ' planned exercises</div>' +
    '</div>' +
    '<button class="next-workout-play" data-action="startProtocol" data-protocol-id="' + escAttr(proto.id) + '" aria-label="Start next workout">' +
      '<span class="material-symbols-outlined">play_arrow</span>' +
    '</button>' +
    '</div>';
}

// ========== W3.6 BOTTOM STATS ==========
function refreshDashboardBottom(workouts) {
  const calBurn = $("dashCalBurn");
  if (calBurn) {
    const burned = (workouts || []).reduce(function (a, w) { return a + (w.caloriesBurned || 0); }, 0);
    calBurn.textContent = burned + " cal";
  }
}

// ========== EVENT DELEGATION ==========
function initTodayEvents() {
  const panel = $("panel-today");
  if (!panel) return;

  panel.addEventListener("click", (e) => {
    // data-action buttons
    const target = e.target.closest("[data-action]");
    if (target) {
      const action = target.dataset.action;
      if (action === "goToLog" && _goToLog) _goToLog();
      else if (action === "goToLogWorkout" && _goToLogWorkout) _goToLogWorkout();
      else if (action === "addWater") addWater(parseInt(target.dataset.amount) || 250);
      else if (action === "undoWater") undoWater();
      else if (action === "addCustomWater") addCustomWater();
      else if (action === "saveWellness") saveWellness();
      // W3 Dashboard v2 actions
      else if (action === "igniteSession" && _goToLogWorkout) _goToLogWorkout();
      else if (action === "viewAllRoutines") activateMainTab("protocols");
      else if (action === "startProtocol" && _goToLogWorkout) _goToLogWorkout();
      return;
    }

    const delFood = e.target.closest("[data-delete-food]");
    if (delFood) { deleteFood(delFood.dataset.deleteFood); return; }

    const delWorkout = e.target.closest("[data-delete-workout]");
    if (delWorkout) { deleteWorkout(delWorkout.dataset.deleteWorkout); return; }
  });

  // Wellness sliders
  const wellnessSleep = $("wellnessSleep");
  const wellnessSoreness = $("wellnessSoreness");
  const wellnessEnergy = $("wellnessEnergy");
  if (wellnessSleep) wellnessSleep.addEventListener("input", () => { $("sleepVal").textContent = wellnessSleep.value; });
  if (wellnessSoreness) wellnessSoreness.addEventListener("input", () => { $("sorenessVal").textContent = wellnessSoreness.value; });
  if (wellnessEnergy) wellnessEnergy.addEventListener("input", () => { $("energyVal").textContent = wellnessEnergy.value; });
}
