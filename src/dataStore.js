// ========== DATA STORE ==========
// Centralized data model, localStorage read/write, ID generation, computed metrics

// ========== UTILITY ==========
const $ = (id) => document.getElementById(id);

const uid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxx-xxxx-xxxx".replace(/x/g, () =>
        Math.floor(Math.random() * 16).toString(16)
      );

// Local date string (YYYY-MM-DD) using local timezone
const today = () => {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
};

const localDateStr = (d) =>
  d.getFullYear() +
  "-" +
  String(d.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(d.getDate()).padStart(2, "0");

const fmtDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const mealEmoji = (m) =>
  ({ breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍪" }[m] || "🍽️");

const fmtTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

// ========== ESCAPE HELPERS ==========
function esc(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function escAttr(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ========== STORAGE KEYS ==========
const KEYS = {
  food: "ft_food",
  workouts: "ft_workouts",
  body: "ft_body",
  protocols: "ft_protocols",
  settings: "ft_settings",
  water: "ft_water",
  favorites: "ft_favorites",
  wellness: "ft_wellness",
  tdee: "ft_tdee",
};

// ========== STORAGE READ/WRITE ==========
function loadData(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // Imported dynamically to avoid circular deps — showToast is in ui.js
    showToast("Storage full! Clear old data.", "error");
  }
}

function defaultSettings() {
  return {
    calorieGoal: 2000,
    proteinGoal: 150,
    carbsGoal: 250,
    fatGoal: 65,
    workoutGoal: 4,
    waterGoal: 2000,
    weightUnit: "kg",
    measureUnit: "cm",
    darkMode: true,
    bodyGoal: "maintain",
  };
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(KEYS.settings));
    return s ? { ...defaultSettings(), ...s } : defaultSettings();
  } catch {
    return defaultSettings();
  }
}

// Mutable settings state — shared across modules
let settings = loadSettings();

function updateSettings(newSettings) {
  settings = newSettings;
}

// ========== TDEE DATA ==========
function loadTDEEData() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.tdee));
  } catch {
    return null;
  }
}

function saveTDEEData(data) {
  try {
    localStorage.setItem(KEYS.tdee, JSON.stringify(data));
  } catch (e) {
    /* silent */
  }
}

// ========== STREAK ==========
function calculateStreak() {
  const food = loadData(KEYS.food);
  const workouts = loadData(KEYS.workouts);
  const allDates = new Set([
    ...food.map((f) => f.date),
    ...workouts.map((w) => w.date),
  ]);
  let streak = 0;
  const d = new Date();
  // If today has no activity yet, start from yesterday (tolerance)
  if (!allDates.has(localDateStr(d))) {
    d.setDate(d.getDate() - 1);
  }
  while (true) {
    const dateStr = localDateStr(d);
    if (allDates.has(dateStr)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

function calculateLongestStreak() {
  const food = loadData(KEYS.food);
  const workouts = loadData(KEYS.workouts);
  const allDates = [
    ...new Set([...food.map((f) => f.date), ...workouts.map((w) => w.date)]),
  ].sort();
  if (!allDates.length) return 0;
  let maxStreak = 1,
    current = 1;
  for (let i = 1; i < allDates.length; i++) {
    const prev = new Date(allDates[i - 1] + "T12:00:00");
    const curr = new Date(allDates[i] + "T12:00:00");
    const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      current++;
      maxStreak = Math.max(maxStreak, current);
    } else if (diff > 1) current = 1;
  }
  return maxStreak;
}

// ========== WATER TRACKER ==========
function getWaterToday() {
  const data = loadData(KEYS.water);
  return data
    .filter((w) => w.date === today())
    .reduce((a, w) => a + (w.amount || 0), 0);
}

// ========== WELLNESS ==========
function loadWellnessToday() {
  return loadData(KEYS.wellness).find((w) => w.date === today()) || null;
}

// ========== READINESS ==========
let _readinessCache = { key: "", result: null };

function calculateReadiness() {
  const cacheKey = today() + "_" + Date.now().toString(36).slice(0, -3);
  if (_readinessCache.key === cacheKey && _readinessCache.result)
    return _readinessCache.result;

  const now = new Date();
  const workouts = loadData(KEYS.workouts);
  const food = loadData(KEYS.food);
  const wellness = loadData(KEYS.wellness);

  let acuteLoad = 0,
    chronicLoad = 0;
  for (let i = 0; i < 28; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = localDateStr(d);
    const dayWorkouts = workouts.filter((w) => w.date === dateStr);
    let dayStress = 0;
    dayWorkouts.forEach((w) => {
      const typeFactor =
        { strength: 1.2, cardio: 1.0, flexibility: 0.4, sport: 0.9, other: 0.7 }[
          w.type
        ] || 0.8;
      const exCount = (w.exercises || []).length || 1;
      const dur = w.duration || 30;
      dayStress += (dur / 30) * typeFactor * Math.sqrt(exCount);
    });
    acuteLoad += dayStress * Math.exp(-i / 7);
    chronicLoad += dayStress * Math.exp(-i / 28);
  }

  const freshness = chronicLoad - acuteLoad;
  const freshnessFactor = Math.max(-15, Math.min(15, freshness * 5));

  let wellnessBonus = 0;
  const todayWellness = wellness.find((w) => w.date === today());
  if (todayWellness) {
    wellnessBonus = Math.max(
      -20,
      Math.min(
        20,
        (todayWellness.sleep - 3) * 8 +
          (todayWellness.soreness - 3) * 4 +
          (todayWellness.energy - 3) * 6
      )
    );
  }

  let recoveryBonus = 0;
  const todayFood = food.filter((f) => f.date === today());
  const todayCals = todayFood.reduce((a, f) => a + (f.calories || 0), 0);
  const todayPro = todayFood.reduce((a, f) => a + (f.protein || 0), 0);
  if (todayCals > 0) {
    const calAdherence =
      1 - Math.abs(todayCals - settings.calorieGoal) / settings.calorieGoal;
    recoveryBonus += Math.max(-5, calAdherence * 7);
  }
  if (todayPro > 0) {
    recoveryBonus += Math.min(todayPro / settings.proteinGoal, 1.2) * 5;
  }
  const waterTotal = getWaterToday();
  if (waterTotal >= (settings.waterGoal || 2000)) recoveryBonus += 3;
  recoveryBonus = Math.max(-15, Math.min(15, recoveryBonus));

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(50 + wellnessBonus + recoveryBonus + freshnessFactor)
    )
  );
  const result = {
    score,
    acuteLoad,
    chronicLoad,
    freshness,
    wellnessBonus,
    recoveryBonus,
    freshnessFactor,
  };
  _readinessCache = { key: cacheKey, result };
  return result;
}

function calculateReadinessForDate(dateStr) {
  const workouts = loadData(KEYS.workouts);
  const wellness = loadData(KEYS.wellness);
  const targetDate = new Date(dateStr + "T12:00:00");

  let acuteLoad = 0,
    chronicLoad = 0;
  for (let i = 0; i < 28; i++) {
    const d = new Date(targetDate);
    d.setDate(d.getDate() - i);
    const ds = localDateStr(d);
    const dayWorkouts = workouts.filter((w) => w.date === ds);
    let dayStress = 0;
    dayWorkouts.forEach((w) => {
      const typeFactor =
        { strength: 1.2, cardio: 1.0, flexibility: 0.4, sport: 0.9, other: 0.7 }[
          w.type
        ] || 0.8;
      const exCount = (w.exercises || []).length || 1;
      const dur = w.duration || 30;
      dayStress += (dur / 30) * typeFactor * Math.sqrt(exCount);
    });
    acuteLoad += dayStress * Math.exp(-i / 7);
    chronicLoad += dayStress * Math.exp(-i / 28);
  }

  const freshness = chronicLoad - acuteLoad;
  const freshnessFactor = Math.max(-15, Math.min(15, freshness * 5));
  let wellnessBonus = 0;
  const dayWellness = wellness.find((w) => w.date === dateStr);
  if (dayWellness) {
    wellnessBonus = Math.max(
      -20,
      Math.min(
        20,
        (dayWellness.sleep - 3) * 8 +
          (dayWellness.soreness - 3) * 4 +
          (dayWellness.energy - 3) * 6
      )
    );
  }
  return Math.max(
    0,
    Math.min(100, Math.round(50 + wellnessBonus + freshnessFactor))
  );
}

// ========== ADAPTIVE TDEE ==========
function calculateAdaptiveTDEE() {
  const food = loadData(KEYS.food);
  const body = loadData(KEYS.body)
    .filter((b) => b.weight)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (body.length < 2)
    return {
      status: "insufficient",
      message: "Need at least 2 weight measurements",
      dataPoints: body.length,
      needed: 2,
    };

  const firstWeighIn = new Date(body[0].date + "T12:00:00");
  const lastWeighIn = new Date(body[body.length - 1].date + "T12:00:00");
  const daysBetween = Math.max(
    1,
    Math.round((lastWeighIn - firstWeighIn) / (1000 * 60 * 60 * 24))
  );

  if (daysBetween < 7)
    return {
      status: "insufficient",
      message: "Need weight data spanning at least 7 days",
      dataPoints: daysBetween,
      needed: 7,
    };

  const startDate = body[0].date;
  const endDate = body[body.length - 1].date;
  const foodInRange = food.filter(
    (f) => f.date >= startDate && f.date <= endDate
  );
  const foodDays = new Set(foodInRange.map((f) => f.date));
  const daysWithFood = foodDays.size;

  if (daysWithFood < 7)
    return {
      status: "insufficient",
      message: "Need at least 7 days of food logging",
      dataPoints: daysWithFood,
      needed: 7,
    };

  const totalCalories = foodInRange.reduce(
    (a, f) => a + (f.calories || 0),
    0
  );
  const avgDailyCalories = totalCalories / daysWithFood;
  const weightChangeKg = body[body.length - 1].weight - body[0].weight;
  const weightChangeInKg =
    settings.weightUnit === "lbs"
      ? weightChangeKg * 0.453592
      : weightChangeKg;
  const tdeeRaw =
    avgDailyCalories + (weightChangeInKg * 7700) / daysBetween;

  const saved = loadTDEEData();
  let tdee;
  if (saved && saved.estimatedTDEE > 0) {
    tdee = Math.round(0.3 * tdeeRaw + 0.7 * saved.estimatedTDEE);
  } else {
    tdee = Math.round(tdeeRaw);
  }

  const timeFactor = Math.min(daysBetween / 28, 1);
  const dataFactor = Math.min(daysWithFood / 21, 1);
  const confidence =
    Math.round((timeFactor * 0.5 + dataFactor * 0.5) * 100) / 100;

  return {
    status: "ready",
    estimatedTDEE: Math.max(1000, Math.min(5000, tdee)),
    confidence,
    dataPoints: daysWithFood,
    daySpan: daysBetween,
    avgCalories: Math.round(avgDailyCalories),
    weightChange: weightChangeKg,
    rawTDEE: Math.round(tdeeRaw),
  };
}

// ========== PLATEAU DETECTION ==========
function detectPlateau() {
  const plateaus = [];
  const body = loadData(KEYS.body)
    .filter((b) => b.weight)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (body.length >= 3) {
    const last = body[body.length - 1];
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksStr = localDateStr(twoWeeksAgo);
    const oldEntries = body.filter((b) => b.date <= twoWeeksStr);
    if (oldEntries.length > 0) {
      const oldWeight = oldEntries[oldEntries.length - 1].weight;
      const weightDiff = Math.abs(last.weight - oldWeight);
      const threshold = settings.weightUnit === "lbs" ? 0.5 : 0.2;
      if (weightDiff < threshold) {
        plateaus.push({
          type: "weight",
          message:
            "Weight unchanged (\u00b1" +
            weightDiff.toFixed(1) +
            " " +
            settings.weightUnit +
            ") for 2+ weeks",
          icon: "\u2696\uFE0F",
        });
      }
    }
  }

  // Workout stagnation
  const workouts = loadData(KEYS.workouts).filter(
    (w) => w.exercises && w.exercises.length > 0
  );
  const exerciseHistory = {};
  workouts
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((w) => {
      w.exercises.forEach((ex) => {
        const key = ex.name.toLowerCase().trim();
        if (!key) return;
        if (!exerciseHistory[key]) exerciseHistory[key] = [];
        if (ex.weight > 0)
          exerciseHistory[key].push({
            date: w.date,
            weight: ex.weight,
            reps: ex.reps,
            sets: ex.sets,
          });
      });
    });

  Object.entries(exerciseHistory).forEach(([name, history]) => {
    if (history.length >= 3) {
      const last3 = history.slice(-3);
      const sameWeight = last3.every((h) => h.weight === last3[0].weight);
      const sameReps = last3.every((h) => h.reps === last3[0].reps);
      if (sameWeight && sameReps) {
        const displayName = name.charAt(0).toUpperCase() + name.slice(1);
        plateaus.push({
          type: "strength",
          message:
            displayName +
            ": same weight (" +
            last3[0].weight +
            ") \u00d7 " +
            last3[0].reps +
            " for " +
            last3.length +
            " sessions",
          icon: "\uD83C\uDFCB\uFE0F",
        });
      }
    }
  });

  return plateaus;
}

// ========== MEAL TIMING ANALYSIS ==========
function analyzeMealTiming() {
  const food = loadData(KEYS.food);
  const workouts = loadData(KEYS.workouts);
  const days = {};

  food.forEach((f) => {
    if (!f.timestamp) return;
    if (!days[f.date]) days[f.date] = [];
    const dt = new Date(f.timestamp);
    const hour = dt.getHours() + dt.getMinutes() / 60;
    days[f.date].push({ ...f, hour });
  });

  // Eating windows
  const windows = [];
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last14.push(localDateStr(d));
  }
  last14.forEach((date) => {
    const meals = days[date];
    if (!meals || !meals.length) return;
    const hours = meals.map((m) => m.hour).sort((a, b) => a - b);
    windows.push({
      date,
      firstMeal: hours[0],
      lastMeal: hours[hours.length - 1],
      window: hours[hours.length - 1] - hours[0],
      mealCount: meals.length,
    });
  });

  // Macro distribution by time period
  const periods = {
    morning: { label: "Morning", range: [5, 12], cal: 0, pro: 0, carb: 0, fat: 0 },
    afternoon: { label: "Afternoon", range: [12, 17], cal: 0, pro: 0, carb: 0, fat: 0 },
    evening: { label: "Evening", range: [17, 22], cal: 0, pro: 0, carb: 0, fat: 0 },
    lateNight: { label: "Late Night", range: [22, 5], cal: 0, pro: 0, carb: 0, fat: 0 },
  };

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7.push(localDateStr(d));
  }

  last7.forEach((date) => {
    (days[date] || []).forEach((f) => {
      const h = f.hour;
      let period;
      if (h >= 5 && h < 12) period = "morning";
      else if (h >= 12 && h < 17) period = "afternoon";
      else if (h >= 17 && h < 22) period = "evening";
      else period = "lateNight";
      periods[period].cal += f.calories || 0;
      periods[period].pro += f.protein || 0;
      periods[period].carb += f.carbs || 0;
      periods[period].fat += f.fat || 0;
    });
  });

  // Pre/post workout analysis
  const workoutNutrition = [];
  last7.forEach((date) => {
    const dayWorkouts = workouts.filter(
      (w) => w.date === date && w.timestamp
    );
    const dayMeals = days[date] || [];
    dayWorkouts.forEach((w) => {
      const wDt = new Date(w.timestamp);
      const wHour = wDt.getHours() + wDt.getMinutes() / 60;
      const preWorkout = dayMeals.filter(
        (m) => m.hour >= wHour - 2 && m.hour < wHour
      );
      const postWorkout = dayMeals.filter(
        (m) => m.hour > wHour && m.hour <= wHour + 2
      );
      workoutNutrition.push({
        date,
        workoutHour: wHour,
        workoutName: w.name,
        hasPre: preWorkout.length > 0,
        hasPost: postWorkout.length > 0,
        postProtein: postWorkout.reduce((a, m) => a + (m.protein || 0), 0),
      });
    });
  });

  return { windows, periods, workoutNutrition, days };
}

// ========== RECOMMENDATIONS ==========
function generateRecommendations(tdeeResult, plateaus) {
  const recs = [];
  const goal = settings.bodyGoal || "maintain";
  if (tdeeResult.status !== "ready") return recs;

  const tdee = tdeeResult.estimatedTDEE;
  const calGoal = settings.calorieGoal;
  const diff = calGoal - tdee;

  if (goal === "lose") {
    if (diff > -200)
      recs.push({
        icon: "📉",
        text:
          "Calorie goal (" + calGoal + ") is close to your TDEE (" + tdee +
          "). For loss, aim for " + (tdee - 500) + "\u2013" + (tdee - 300) + " cal/day.",
      });
    else if (diff < -700)
      recs.push({
        icon: "⚠️",
        text:
          "Large deficit (" + Math.abs(diff) + " cal below TDEE). May cause muscle loss. Consider " +
          (tdee - 500) + " cal/day.",
      });
  } else if (goal === "gain") {
    if (diff < 200)
      recs.push({
        icon: "📈",
        text:
          "Calorie goal (" + calGoal + ") too close to TDEE (" + tdee +
          "). For gains, aim for " + (tdee + 200) + "\u2013" + (tdee + 400) + " cal/day.",
      });
    else if (diff > 600)
      recs.push({
        icon: "⚠️",
        text:
          "Large surplus (" + diff + " cal above TDEE). May cause excess fat gain. Consider " +
          (tdee + 300) + " cal/day.",
      });
  } else {
    if (Math.abs(diff) > 300)
      recs.push({
        icon: "⚖️",
        text:
          "Calorie goal (" + calGoal + ") is " + Math.abs(diff) + " cal " +
          (diff > 0 ? "above" : "below") + " your TDEE (" + tdee +
          "). Adjust to ~" + tdee + " for maintenance.",
      });
  }

  if (plateaus.some((p) => p.type === "weight")) {
    if (goal === "lose")
      recs.push({
        icon: "💡",
        text: "Weight plateau detected. Try: reduce intake by 150\u2013200 cal, add 1 cardio session, or eat at TDEE for 1\u20132 weeks (diet break).",
      });
    else if (goal === "gain")
      recs.push({
        icon: "💡",
        text: "Weight plateau detected. Increase intake by 200\u2013250 cal and ensure progressive overload.",
      });
  }
  if (plateaus.some((p) => p.type === "strength")) {
    recs.push({
      icon: "🔄",
      text: "Strength plateau detected. Try: deload week (reduce weight 40%), change rep ranges, or add exercise variation.",
    });
  }
  return recs;
}

// ========== DATE HELPERS ==========
function getLast14Days() {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(localDateStr(d));
  }
  return days;
}
