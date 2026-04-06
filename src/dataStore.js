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
  routines: "ft_routines",
  machineSetups: "ft_machine_setups",
  strengthSets: "ft_strength_sets",
  cardios: "ft_cardios",
  measurements: "ft_measurements",
  photos: "ft_photos",
  foodItems: "ft_food_items",
  foodLogs: "ft_food_logs",
  dayPlans: "ft_day_plans",
  uxTelemetry: "ft_ux_telemetry",
  settings: "ft_settings",
  water: "ft_water",
  favorites: "ft_favorites",
  mealTemplates: "ft_meal_templates",
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
  const nowIso = new Date().toISOString();
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
    experienceLevel: "beginner",
    bodyGoal: "maintain",
    localOnlyMode: true,
    localOnlyStrictMode: true,
    uxLockEnabled: true,
    subscriptionFreeForever: true,
    monetizationNotes:
      "Core tracking will remain free; if monetization is added, it will be optional and transparent.",
    monetizationHistory: [
      { date: nowIso, version: "1.0.0", note: "Initial release. No paid features." },
    ],
    uxTelemetryEnabled: false,
    aiModulesEnabled: false,
    socialEnabled: false,
    disableCooldownSuggestions: false,
    gyms: [],
    // W15.1 Profile Identity
    displayName: "",
    bio: "",
    avatar: "",
    age: "",
    height: "",
    // W16 Workout Settings
    defaultRestTime: 90,
    plateSystem: "kg",
    autoLock: false,
    autoLockActiveOnly: true,
    autoAdvance: false,
    focusMode: false,
    voiceCountdown: false,
    pushNotifications: false,
    emailSummaries: false,
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

function ensureRoutineMigrations() {
  const protocols = loadData(KEYS.protocols);
  let changed = false;
  const migrated = protocols.map((p) => {
    const next = { ...p };
    if (typeof next.version !== "number") {
      next.version = 1;
      changed = true;
    }
    if (!next.createdAt) {
      next.createdAt = next.timestamp || Date.now();
      changed = true;
    }
    if (typeof next.baseRoutineId === "undefined") {
      next.baseRoutineId = null;
      changed = true;
    }
    if (!Array.isArray(next.plannedSets)) {
      next.plannedSets = [];
      changed = true;
    }
    return next;
  });
  if (changed) saveData(KEYS.protocols, migrated);
}

ensureRoutineMigrations();

function getPrimaryBodyweight() {
  const body = loadData(KEYS.body)
    .filter((b) => typeof b.weight === "number")
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return body.length ? body[0].weight : 0;
}

function computeEffectiveLoad(exercise, set, userBodyweight) {
  const rawWeight = Number(set && set.weight) || 0;
  if (!exercise || !exercise.isAssistedBodyweight) return rawWeight;
  const bw = Number(userBodyweight) || 0;
  return Math.max(0, bw - rawWeight);
}

function trackUXTelemetry(path) {
  if (!settings.uxTelemetryEnabled || !path) return;
  const telemetry = loadUXTelemetry();
  const parts = path.split(".");
  let ref = telemetry;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!ref[key] || typeof ref[key] !== "object") ref[key] = {};
    ref = ref[key];
  }
  const leaf = parts[parts.length - 1];
  ref[leaf] = (Number(ref[leaf]) || 0) + 1;
  saveData(KEYS.uxTelemetry, telemetry);
}

function defaultUXTelemetry() {
  return {
    logging: {
      undoCount: 0,
      deletedEntryImmediately: 0,
    },
    navigation: {
      backWithin2sOfNavigate: 0,
    },
  };
}

function loadUXTelemetry() {
  const telemetry = loadData(KEYS.uxTelemetry);
  if (Array.isArray(telemetry)) {
    return defaultUXTelemetry();
  }
  return { ...defaultUXTelemetry(), ...(telemetry || {}) };
}

function resetUXTelemetry() {
  saveData(KEYS.uxTelemetry, defaultUXTelemetry());
}

function getMachineSetupsByExercise(exerciseName) {
  const normalized = (exerciseName || "").trim().toLowerCase();
  if (!normalized) return [];
  return loadData(KEYS.machineSetups)
    .filter((s) => (s.exerciseId || "").toLowerCase() === normalized)
    .sort((a, b) => (b.lastUsed || "").localeCompare(a.lastUsed || ""));
}

function upsertMachineSetup(exerciseName, gymName, notes) {
  const normalized = (exerciseName || "").trim().toLowerCase();
  if (!normalized || !notes.trim()) return null;
  const setups = loadData(KEYS.machineSetups);
  const idx = setups.findIndex(
    (s) =>
      (s.exerciseId || "").toLowerCase() === normalized &&
      (s.gymName || "") === (gymName || "") &&
      (s.notes || "").trim().toLowerCase() === notes.trim().toLowerCase()
  );
  const now = new Date().toISOString();
  if (idx >= 0) {
    setups[idx] = { ...setups[idx], lastUsed: now, notes: notes.trim() };
    saveData(KEYS.machineSetups, setups);
    return setups[idx];
  }
  const next = {
    id: uid(),
    exerciseId: normalized,
    gymName: gymName || null,
    notes: notes.trim(),
    lastUsed: now,
  };
  setups.push(next);
  saveData(KEYS.machineSetups, setups);
  return next;
}

function updateRoutineWithWorkoutChanges(routineId, workoutExercises) {
  const routines = loadData(KEYS.protocols);
  const idx = routines.findIndex((r) => r.id === routineId);
  if (idx < 0) return null;
  const current = routines[idx];
  const updated = {
    ...current,
    exercises: workoutExercises,
    version: (current.version || 1) + 1,
    updatedAt: Date.now(),
  };
  routines[idx] = updated;
  saveData(KEYS.protocols, routines);
  return updated;
}

function createRoutineVariantFromWorkout(routineId, workoutName, workoutExercises) {
  const routines = loadData(KEYS.protocols);
  const base = routines.find((r) => r.id === routineId);
  if (!base) return null;
  const variant = {
    ...base,
    id: uid(),
    name: (workoutName || base.name || "Routine") + " (Variant)",
    exercises: workoutExercises,
    version: 1,
    baseRoutineId: base.id,
    createdAt: Date.now(),
  };
  routines.push(variant);
  saveData(KEYS.protocols, routines);
  return variant;
}

function estimateLocalStorageSize() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key) || "";
    total += key.length + value.length;
  }
  return total;
}

function getRecentActivity(limit) {
  const maxItems = Number(limit) > 0 ? Number(limit) : 60;
  const timeline = [];

  const workouts = loadData(KEYS.workouts);
  workouts.forEach((w) => {
    const exCount = Array.isArray(w.exercises) ? w.exercises.length : 0;
    const volume = (w.exercises || []).reduce(function (sum, ex) {
      if (Array.isArray(ex.sets)) {
        return sum + ex.sets.reduce(function (s, set) {
          return s + (Number(set.weight) || 0) * (Number(set.reps) || 0);
        }, 0);
      }
      return sum + (Number(ex.weight) || 0) * (Number(ex.reps) || 0) * (Number(ex.sets) || 0);
    }, 0);
    timeline.push({
      id: w.id || uid(),
      type: "workout",
      icon: "🏋️",
      title: (w.name || "Workout") + " completed",
      subtitle: exCount + " exercises • " + (w.duration || 0) + " min • " + Math.round(volume).toLocaleString() + " kg",
      context: "FitOne",
      date: w.date,
      timestamp: Number(w.timestamp) || 0,
      ts: Number(w.timestamp) || new Date((w.date || today()) + "T00:00:00").getTime(),
    });
  });

  const foodLogs = loadData(KEYS.food);
  const foodByDate = {};
  foodLogs.forEach((f) => {
    const d = f.date || today();
    if (!foodByDate[d]) {
      foodByDate[d] = { calories: 0, protein: 0, count: 0, ts: Number(f.timestamp) || 0 };
    }
    foodByDate[d].calories += Number(f.calories) || 0;
    foodByDate[d].protein += Number(f.protein) || 0;
    foodByDate[d].count += 1;
    foodByDate[d].ts = Math.max(foodByDate[d].ts, Number(f.timestamp) || 0);
  });
  Object.keys(foodByDate).forEach((d) => {
    const entry = foodByDate[d];
    timeline.push({
      id: "food-" + d,
      type: "food",
      icon: "🍽️",
      title: "Nutrition logged",
      subtitle: Math.round(entry.calories) + " kcal • " + Math.round(entry.protein) + "g protein • " + entry.count + " entries",
      context: "FitOne",
      date: d,
      timestamp: entry.ts,
      ts: entry.ts || new Date(d + "T12:00:00").getTime(),
    });
  });

  const body = loadData(KEYS.body);
  body.forEach((b) => {
    const wt = Number(b.weight);
    timeline.push({
      id: b.id || ("body-" + (b.date || today())),
      type: "body",
      icon: "📏",
      title: "Body metrics updated",
      subtitle: Number.isFinite(wt) ? (wt + " " + String(settings.weightUnit || "kg").toUpperCase()) : "Measurement logged",
      context: "FitOne",
      date: b.date,
      timestamp: Number(b.timestamp) || 0,
      ts: Number(b.timestamp) || new Date((b.date || today()) + "T12:00:00").getTime(),
    });
  });

  let prList = [];
  if (typeof loadPRs === "function") {
    prList = loadPRs();
  } else {
    try { prList = JSON.parse(localStorage.getItem("ft_personal_records")) || []; } catch { prList = []; }
  }
  prList.forEach((pr) => {
    const unit = pr.type === "reps" ? "reps" : String(settings.weightUnit || "kg").toUpperCase();
    timeline.push({
      id: pr.id || uid(),
      type: "pr",
      icon: "⚡",
      title: "PR: " + (pr.exercise || "Exercise"),
      subtitle: (pr.value || "--") + " " + unit + " • " + String((pr.type || "weight")).toUpperCase() + "",
      context: "FitOne",
      badge: "ELITE PERFORMANCE",
      hot: true,
      exercise: pr.exercise || "",
      date: pr.date,
      timestamp: Number(pr.timestamp) || 0,
      ts: Number(pr.timestamp) || new Date((pr.date || today()) + "T12:00:00").getTime(),
    });
  });

  try {
    const unlocked = JSON.parse(localStorage.getItem("ft_achievements")) || {};
    const defs = typeof ACHIEVEMENT_DEFS !== "undefined" ? ACHIEVEMENT_DEFS : [];
    Object.keys(unlocked).forEach((id) => {
      const meta = unlocked[id] || {};
      const def = defs.find(function (d) { return d.id === id; });
      timeline.push({
        id: "ach-" + id,
        type: "achievement",
        icon: def && def.icon ? def.icon : "🏆",
        title: "Achievement unlocked",
        subtitle: def && def.name ? def.name : id,
        context: "FitOne",
        date: meta.date || today(),
        timestamp: Number(meta.unlockedAt) || 0,
        ts: Number(meta.unlockedAt) || new Date((meta.date || today()) + "T12:00:00").getTime(),
      });
    });
  } catch {}

  const streak = calculateStreak();
  if (streak >= 3) {
    timeline.push({
      id: "streak-" + streak,
      type: "streak",
      icon: "🔥",
      title: "Streak milestone",
      subtitle: streak + " days active in a row",
      context: "FitOne",
      date: today(),
      timestamp: Date.now() - 60 * 1000,
      ts: Date.now() - 60 * 1000,
    });
  }

  return timeline
    .sort(function (a, b) { return (Number(b.ts) || 0) - (Number(a.ts) || 0); })
    .slice(0, maxItems);
}

function getWorkoutVolume(workout) {
  return (workout && workout.exercises ? workout.exercises : []).reduce(function (sum, ex) {
    if (Array.isArray(ex.sets) && ex.sets.length) {
      return sum + ex.sets.reduce(function (setSum, set) {
        return setSum + (Number(set.weight) || 0) * (Number(set.reps) || 0);
      }, 0);
    }
    return sum + (Number(ex.weight) || 0) * (Number(ex.reps) || 0) * Math.max(1, Number(ex.sets) || 1);
  }, 0);
}

function getWeeklyPerformanceSummary(referenceDate) {
  const anchor = referenceDate || today();
  const dayMs = 24 * 60 * 60 * 1000;
  const anchorDate = new Date(anchor + "T12:00:00");
  const currentStart = new Date(anchorDate.getTime() - (6 * dayMs));
  const previousEnd = new Date(currentStart.getTime() - dayMs);
  const previousStart = new Date(previousEnd.getTime() - (6 * dayMs));

  const inRange = function (date, start, end) {
    if (!date) return false;
    return date >= localDateStr(start) && date <= localDateStr(end);
  };

  const workouts = loadData(KEYS.workouts);
  const currentVolume = workouts
    .filter(function (w) { return inRange(w.date, currentStart, anchorDate); })
    .reduce(function (sum, w) { return sum + getWorkoutVolume(w); }, 0);
  const previousVolume = workouts
    .filter(function (w) { return inRange(w.date, previousStart, previousEnd); })
    .reduce(function (sum, w) { return sum + getWorkoutVolume(w); }, 0);

  let changePct = 0;
  if (previousVolume > 0) {
    changePct = Math.round(((currentVolume - previousVolume) / previousVolume) * 100);
  } else if (currentVolume > 0) {
    changePct = 100;
  }

  return {
    currentVolume,
    previousVolume,
    changePct,
    generatedAt: Date.now(),
  };
}

function getNotifications(limit) {
  const maxItems = Number(limit) > 0 ? Number(limit) : 24;
  const notifications = [];
  const now = Date.now();

  const recentActivity = getRecentActivity(80);
  recentActivity
    .filter(function (item) { return item.type === "pr"; })
    .slice(0, 8)
    .forEach(function (item) {
      notifications.push({
        id: "notif-pr-" + String(item.id || uid()),
        type: "pr",
        icon: "military_tech",
        title: "New PR Set",
        description: item.title + " • " + (item.subtitle || "Elite performance unlocked."),
        timestamp: Number(item.timestamp) || Number(item.ts) || now,
        ts: Number(item.ts) || Number(item.timestamp) || now,
      });
    });

  try {
    const unlocked = JSON.parse(localStorage.getItem("ft_achievements")) || {};
    const defs = typeof ACHIEVEMENT_DEFS !== "undefined" ? ACHIEVEMENT_DEFS : [];
    Object.keys(unlocked).forEach(function (id) {
      const meta = unlocked[id] || {};
      const def = defs.find(function (d) { return d.id === id; });
      const ts = Number(meta.unlockedAt) || new Date((meta.date || today()) + "T12:00:00").getTime();
      notifications.push({
        id: "notif-ach-" + id,
        type: "achievement",
        icon: "emoji_events",
        title: "Achievement Unlocked",
        description: (def && def.name) ? def.name : "New badge unlocked.",
        timestamp: ts,
        ts,
      });
    });
  } catch {
    // ignore malformed achievement payloads
  }

  const streak = calculateStreak();
  if (streak >= 3) {
    notifications.push({
      id: "notif-streak-" + streak,
      type: "streak",
      icon: "local_fire_department",
      title: "Streak Milestone",
      description: "Don't lose your " + streak + "-day streak!",
      timestamp: now - (5 * 60 * 1000),
      ts: now - (5 * 60 * 1000),
    });
  }

  const todaysFood = loadData(KEYS.food).filter(function (f) { return f.date === today(); });
  const calories = todaysFood.reduce(function (sum, f) { return sum + (Number(f.calories) || 0); }, 0);
  const protein = todaysFood.reduce(function (sum, f) { return sum + (Number(f.protein) || 0); }, 0);
  const water = getWaterToday();
  const completedGoals = [];
  if (Number(settings.calorieGoal) > 0 && calories >= Number(settings.calorieGoal)) completedGoals.push("calorie");
  if (Number(settings.proteinGoal) > 0 && protein >= Number(settings.proteinGoal)) completedGoals.push("protein");
  if (Number(settings.waterGoal) > 0 && water >= Number(settings.waterGoal)) completedGoals.push("water");

  if (completedGoals.length) {
    notifications.push({
      id: "notif-goals-" + today() + "-" + completedGoals.join("-"),
      type: "goal",
      icon: "task_alt",
      title: "Goal Completed",
      description: "You hit your " + completedGoals.join(", ") + " goal" + (completedGoals.length > 1 ? "s" : "") + " today.",
      timestamp: now - (2 * 60 * 1000),
      ts: now - (2 * 60 * 1000),
    });
  }

  return notifications
    .sort(function (a, b) { return (Number(b.ts) || 0) - (Number(a.ts) || 0); })
    .slice(0, maxItems);
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
