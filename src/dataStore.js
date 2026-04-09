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
  recipes: "ft_recipes",
  foodLogs: "ft_food_logs",
  dayPlans: "ft_day_plans",
  trainingPlan: "ft_training_plan",
  uxTelemetry: "ft_ux_telemetry",
  settings: "ft_settings",
  water: "ft_water",
  favorites: "ft_favorites",
  mealTemplates: "ft_meal_templates",
  wellness: "ft_wellness",
  tdee: "ft_tdee",
  syncOps: "ft_sync_ops",
  webhookQueue: "ft_webhook_queue",
  backupSnapshots: "ft_backup_snapshots",
  xpProfile: "ft_xp_profile",
  challengeHistory: "ft_challenge_history",
  challenges: "ft_challenges",
};

const ENTITY_KEYS = Object.values(KEYS).filter((key) => key !== KEYS.settings);
const ENTITY_DB_NAME = "fitone_entities_v1";
const ENTITY_DB_STORE = "entities";

let _entityStoreCache = Object.create(null);
let _entityDbPromise = null;
let _entityHydrated = false;

function cloneStoreValue(value) {
  if (typeof value === "undefined") return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    if (Array.isArray(value)) return value.slice();
    if (value && typeof value === "object") return { ...value };
    return value;
  }
}

function isEntityKey(key) {
  return key !== KEYS.settings;
}

function seedEntityCacheFromLocalStorage() {
  ENTITY_KEYS.forEach(function (key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return;
      _entityStoreCache[key] = JSON.parse(raw);
    } catch {
      _entityStoreCache[key] = [];
    }
  });
}

function openEntityDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }

  if (_entityDbPromise) return _entityDbPromise;

  _entityDbPromise = new Promise(function (resolve, reject) {
    const req = indexedDB.open(ENTITY_DB_NAME, 1);
    req.onupgradeneeded = function () {
      const db = req.result;
      if (!db.objectStoreNames.contains(ENTITY_DB_STORE)) {
        db.createObjectStore(ENTITY_DB_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function () {
      reject(req.error || new Error("IndexedDB open failed"));
    };
  });

  return _entityDbPromise;
}

function writeEntityRecord(key, value) {
  return openEntityDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(ENTITY_DB_STORE, "readwrite");
      tx.objectStore(ENTITY_DB_STORE).put({ key: key, value: cloneStoreValue(value), updatedAt: Date.now() });
      tx.oncomplete = function () {
        resolve(true);
      };
      tx.onerror = function () {
        reject(tx.error || new Error("IndexedDB write failed"));
      };
    });
  });
}

function loadEntityRecords() {
  return openEntityDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(ENTITY_DB_STORE, "readonly");
      const req = tx.objectStore(ENTITY_DB_STORE).getAll();
      req.onsuccess = function () {
        resolve(Array.isArray(req.result) ? req.result : []);
      };
      req.onerror = function () {
        reject(req.error || new Error("IndexedDB read failed"));
      };
    });
  });
}

function clearEntityStore() {
  _entityStoreCache = Object.create(null);
  ENTITY_KEYS.forEach(function (key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  });

  return openEntityDb()
    .then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(ENTITY_DB_STORE, "readwrite");
        tx.objectStore(ENTITY_DB_STORE).clear();
        tx.oncomplete = function () {
          resolve(true);
        };
        tx.onerror = function () {
          reject(tx.error || new Error("IndexedDB clear failed"));
        };
      });
    })
    .catch(function () {
      return false;
    });
}

if (typeof window !== "undefined") {
  window.clearEntityStore = clearEntityStore;
}

function hydrateEntityStoreFromIndexedDb() {
  loadEntityRecords()
    .then(function (rows) {
      const dbMap = Object.create(null);
      rows.forEach(function (row) {
        if (!row || !row.key) return;
        dbMap[row.key] = row.value;
      });

      const writes = [];
      ENTITY_KEYS.forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(dbMap, key)) {
          _entityStoreCache[key] = cloneStoreValue(dbMap[key]);
          return;
        }

        if (Object.prototype.hasOwnProperty.call(_entityStoreCache, key)) {
          writes.push(writeEntityRecord(key, _entityStoreCache[key]));
        }
      });

      Promise.all(writes)
        .catch(function () {
          /* ignore seed write errors */
        })
        .finally(function () {
          ENTITY_KEYS.forEach(function (key) {
            try {
              localStorage.removeItem(key);
            } catch {
              /* ignore */
            }
          });
          _entityHydrated = true;
          if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
            window.dispatchEvent(new CustomEvent("fitone:entityStoreReady", { detail: { source: "indexeddb" } }));
          }
        });
    })
    .catch(function () {
      _entityHydrated = true;
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new CustomEvent("fitone:entityStoreReady", { detail: { source: "localstorage" } }));
      }
    });
}

seedEntityCacheFromLocalStorage();
hydrateEntityStoreFromIndexedDb();

// ========== STORAGE READ/WRITE ==========
function loadData(key) {
  if (isEntityKey(key)) {
    const value = _entityStoreCache[key];
    if (typeof value === "undefined") return [];
    return cloneStoreValue(value);
  }

  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveData(key, data) {
  if (isEntityKey(key)) {
    const payload = cloneStoreValue(data);
    _entityStoreCache[key] = payload;

    if (!_entityHydrated) {
      try {
        localStorage.setItem(key, JSON.stringify(payload));
      } catch {
        /* ignore */
      }
    }

    writeEntityRecord(key, payload)
      .then(function () {
        if (_entityHydrated) {
          try {
            localStorage.removeItem(key);
          } catch {
            /* ignore */
          }
        }
      })
      .catch(function () {
        try {
          localStorage.setItem(key, JSON.stringify(payload));
        } catch {
          showToast("Storage full! Clear old data.", "error");
        }
      });
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // Imported dynamically to avoid circular deps — showToast is in ui.js
    showToast("Storage full! Clear old data.", "error");
  }
}

function emitDataChange(detail) {
  if (typeof window.notifyDataChanged === "function") {
    window.notifyDataChanged(detail || {});
  }
}

function appendEntityItem(key, item) {
  const rows = loadData(key);
  rows.push(item);
  saveData(key, rows);
  return rows;
}

function replaceEntityItems(key, items) {
  const rows = Array.isArray(items) ? items : [];
  saveData(key, rows);
  return rows;
}

if (typeof window !== "undefined") {
  window.fitOneDataApi = Object.assign(window.fitOneDataApi || {}, {
    loadData,
    saveData,
    emitDataChange,
    appendEntityItem,
    replaceEntityItems,
  });
}

function defaultSettings() {
  const nowIso = new Date().toISOString();
  return {
    calorieGoal: 2000,
    proteinGoal: 150,
    carbsGoal: 250,
    fatGoal: 65,
    goalDayProfile: "training",
    goalMacroProfiles: null,
    lastGoalSyncAt: 0,
    lastGoalSyncConfidence: 0,
    lastGoalSyncTDEE: 0,
    workoutGoal: 4,
    waterGoal: 2000,
    weightUnit: "kg",
    measureUnit: "cm",
    darkMode: true,
    experienceLevel: "beginner",
    uiComplexityMode: "auto",
    accentColor: "#8B5CF6",
    hapticsEnabled: true,
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
    pwaInstallPromptEnabled: true,
    pwaUpdateAutoApply: false,
    autoBackupEnabled: false,
    autoBackupFrequencyDays: 7,
    autoBackupLastRunAt: 0,
    webhookEnabled: false,
    webhookUrl: "",
    webhookEvents: ["food_logged", "workout_logged", "body_logged", "water_logged", "goal_completed", "wellness_saved"],
    connectedWearables: [],
    competitionName: "",
    competitionDate: "",
    competitionDivision: "",
    plannerDefaultProtocolId: "",
    gyms: [],
    // W15.1 Profile Identity
    displayName: "",
    bio: "",
    avatar: "",
    age: "",
    height: "",
    // W16 Workout Settings
    defaultRestTime: 90,
    defaultCompoundRestTime: 150,
    defaultIsolationRestTime: 75,
    plateSystem: "kg",
    autoLock: false,
    autoLockActiveOnly: true,
    autoAdvance: false,
    focusMode: false,
    voiceCountdown: false,
    pushNotifications: false,
    emailSummaries: false,
    streakActiveRule: "any-log",
    streakFreezesPerWeek: 2,
    streakRestProtection: true,
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
  const value = loadData(KEYS.tdee);
  if (!value || Array.isArray(value)) return null;
  return value;
}

function saveTDEEData(data) {
  saveData(KEYS.tdee, data || null);
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

function coerceMicronutrient(value, decimals) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  const d = Number.isFinite(Number(decimals)) ? Math.max(0, Number(decimals)) : 0;
  if (d === 0) return Math.round(n);
  const factor = Math.pow(10, d);
  return Math.round(n * factor) / factor;
}

function normalizeMicronutrientFields(entry) {
  const source = entry || {};
  const fiber = coerceMicronutrient(source.fiber, 1);
  const sugar = coerceMicronutrient(source.sugar, 1);
  const sodium = coerceMicronutrient(source.sodium, 0);

  const rawFiber = Number(source.fiber);
  const rawSugar = Number(source.sugar);
  const rawSodium = Number(source.sodium);

  const changed =
    !Number.isFinite(rawFiber) || rawFiber !== fiber || String(source.fiber).trim() === "" ||
    !Number.isFinite(rawSugar) || rawSugar !== sugar || String(source.sugar).trim() === "" ||
    !Number.isFinite(rawSodium) || rawSodium !== sodium || String(source.sodium).trim() === "";

  return {
    changed,
    value: {
      ...source,
      fiber,
      sugar,
      sodium,
    },
  };
}

function ensureFoodSchemaMigrations() {
  const migrateList = function (key) {
    const rows = loadData(key);
    if (!Array.isArray(rows) || !rows.length) return;

    let changed = false;
    const normalized = rows.map(function (row) {
      const next = normalizeMicronutrientFields(row);
      if (next.changed) changed = true;
      return next.value;
    });
    if (changed) saveData(key, normalized);
  };

  migrateList(KEYS.food);
  migrateList(KEYS.foodItems);
  migrateList(KEYS.favorites);

  const templates = loadData(KEYS.mealTemplates);
  if (Array.isArray(templates) && templates.length) {
    let changed = false;
    const normalizedTemplates = templates.map(function (tpl) {
      const template = tpl || {};
      const items = Array.isArray(template.items) ? template.items : [];
      let templateChanged = false;
      const nextItems = items.map(function (item) {
        const next = normalizeMicronutrientFields(item);
        if (next.changed) templateChanged = true;
        return next.value;
      });
      if (templateChanged) {
        changed = true;
        return {
          ...template,
          items: nextItems,
        };
      }
      return template;
    });
    if (changed) saveData(KEYS.mealTemplates, normalizedTemplates);
  }
}

ensureFoodSchemaMigrations();

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

function calculate1RM(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(r) || r <= 0) return 0;
  if (r === 1) return Math.round(w * 10) / 10;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

function calculateExerciseEstimated1RM(exercise) {
  if (!exercise) return 0;
  if (Array.isArray(exercise.sets) && exercise.sets.length) {
    return exercise.sets.reduce((best, set) => {
      return Math.max(best, calculate1RM(set && set.weight, set && set.reps));
    }, 0);
  }
  return calculate1RM(exercise.weight, exercise.reps);
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

const MUSCLE_VOLUME_WEEKLY_LANDMARKS = {
  chest: { label: "Chest", mev: 8, mrv: 22 },
  back: { label: "Back", mev: 8, mrv: 24 },
  lats: { label: "Lats", mev: 6, mrv: 22 },
  shoulders: { label: "Shoulders", mev: 6, mrv: 20 },
  biceps: { label: "Biceps", mev: 6, mrv: 18 },
  triceps: { label: "Triceps", mev: 6, mrv: 18 },
  quads: { label: "Quads", mev: 8, mrv: 24 },
  hamstrings: { label: "Hamstrings", mev: 6, mrv: 18 },
  glutes: { label: "Glutes", mev: 6, mrv: 20 },
  calves: { label: "Calves", mev: 6, mrv: 16 },
  abs: { label: "Abs", mev: 6, mrv: 20 },
};

function getFallbackMuscleTags(exerciseName) {
  const name = String(exerciseName || "").toLowerCase();
  if (!name) return { primary: [], secondary: [] };

  if (name.includes("bench") || name.includes("fly") || name.includes("dip") || name.includes("push-up")) {
    return { primary: ["chest"], secondary: ["triceps", "shoulders"] };
  }
  if (name.includes("row") || name.includes("pull-up") || name.includes("pulldown") || name.includes("chin-up")) {
    return { primary: ["back", "lats"], secondary: ["biceps"] };
  }
  if (name.includes("squat") || name.includes("lunge") || name.includes("leg press") || name.includes("leg extension")) {
    return { primary: ["quads", "glutes"], secondary: ["hamstrings"] };
  }
  if (name.includes("deadlift") || name.includes("rdl") || name.includes("hip thrust") || name.includes("leg curl")) {
    return { primary: ["hamstrings", "glutes"], secondary: ["back"] };
  }
  if (name.includes("curl")) {
    return { primary: ["biceps"], secondary: [] };
  }
  if (name.includes("tricep") || name.includes("pushdown") || name.includes("skull")) {
    return { primary: ["triceps"], secondary: [] };
  }
  if (name.includes("press") || name.includes("raise") || name.includes("shoulder")) {
    return { primary: ["shoulders"], secondary: ["triceps"] };
  }
  if (name.includes("calf")) {
    return { primary: ["calves"], secondary: [] };
  }
  if (name.includes("plank") || name.includes("crunch") || name.includes("ab") || name.includes("core")) {
    return { primary: ["abs"], secondary: [] };
  }
  return { primary: [], secondary: [] };
}

function resolveExerciseMuscleTags(exerciseName) {
  const info = typeof getExerciseInfo === "function" ? getExerciseInfo(exerciseName) : null;
  const primary = Array.isArray(info && info.primary)
    ? info.primary.filter((m) => MUSCLE_VOLUME_WEEKLY_LANDMARKS[m])
    : [];
  const secondary = Array.isArray(info && info.secondary)
    ? info.secondary.filter((m) => MUSCLE_VOLUME_WEEKLY_LANDMARKS[m] && !primary.includes(m))
    : [];

  if (primary.length || secondary.length) {
    return { primary, secondary };
  }

  return getFallbackMuscleTags(exerciseName);
}

function classifyMuscleVolumeStatus(setCount, mev, mrv) {
  if (setCount > mrv) return "over";
  if (setCount < mev) return "under";
  return "in-range";
}

function getWeeklyMuscleVolumeStats(weeksBack) {
  const back = Math.max(0, Number(weeksBack) || 0);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() - back * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const startDate = localDateStr(weekStart);
  const endExclusive = localDateStr(weekEnd);
  const endDisplay = localDateStr(new Date(weekEnd.getTime() - 24 * 60 * 60 * 1000));

  const muscles = {};
  Object.keys(MUSCLE_VOLUME_WEEKLY_LANDMARKS).forEach((key) => {
    muscles[key] = 0;
  });

  const workouts = loadData(KEYS.workouts).filter((w) => w.date >= startDate && w.date < endExclusive);
  let totalSetEntries = 0;

  workouts.forEach((workout) => {
    (workout.exercises || []).forEach((exercise) => {
      const setCount = Array.isArray(exercise.sets)
        ? exercise.sets.length
        : Math.max(0, Number(exercise.sets) || 0);
      if (setCount <= 0) return;

      const tags = resolveExerciseMuscleTags(exercise.name);
      let primary = (tags.primary || []).filter((m) => MUSCLE_VOLUME_WEEKLY_LANDMARKS[m]);
      let secondary = (tags.secondary || []).filter((m) => MUSCLE_VOLUME_WEEKLY_LANDMARKS[m] && !primary.includes(m));

      if (!primary.length && secondary.length) {
        primary = [secondary[0]];
        secondary = secondary.slice(1);
      }
      if (!primary.length && !secondary.length) return;

      totalSetEntries += setCount;
      primary.forEach((muscle) => {
        muscles[muscle] = (muscles[muscle] || 0) + setCount;
      });
      secondary.forEach((muscle) => {
        muscles[muscle] = (muscles[muscle] || 0) + setCount * 0.5;
      });
    });
  });

  const rows = Object.keys(MUSCLE_VOLUME_WEEKLY_LANDMARKS)
    .map((muscle) => {
      const landmark = MUSCLE_VOLUME_WEEKLY_LANDMARKS[muscle];
      const sets = Math.round((muscles[muscle] || 0) * 10) / 10;
      const status = classifyMuscleVolumeStatus(sets, landmark.mev, landmark.mrv);
      const pctOfMrv = landmark.mrv > 0 ? Math.min(100, (sets / landmark.mrv) * 100) : 0;
      return {
        key: muscle,
        label: landmark.label,
        sets,
        mev: landmark.mev,
        mrv: landmark.mrv,
        status,
        pctOfMrv,
      };
    })
    .sort((a, b) => b.sets - a.sets);

  const activeRows = rows.filter((row) => row.sets > 0);
  const overCount = activeRows.filter((row) => row.status === "over").length;
  const underCount = activeRows.filter((row) => row.status === "under").length;

  let statusTone = "neutral";
  let statusMessage = "Log weighted sets to unlock weekly muscle volume guidance.";
  if (totalSetEntries > 0) {
    if (overCount > 0) {
      statusTone = "over";
      statusMessage = overCount + " active muscle group" + (overCount === 1 ? "" : "s") + " above MRV this week.";
    } else if (underCount > 0) {
      statusTone = "under";
      statusMessage = underCount + " active muscle group" + (underCount === 1 ? "" : "s") + " below MEV this week.";
    } else {
      statusTone = "in-range";
      statusMessage = "Active muscle groups are inside the MEV-MRV weekly target zone.";
    }
  }

  return {
    startDate,
    endDate: endDisplay,
    workouts: workouts.length,
    totalSetEntries,
    muscles: rows,
    statusTone,
    statusMessage,
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
  const body = loadData(KEYS.body);
  const wellness = loadData(KEYS.wellness);
  const foodDates = new Set(food.map((f) => f.date));
  const workoutDates = new Set(workouts.map((w) => w.date));
  const bodyDates = new Set(body.map((b) => b.date));
  const wellnessDates = new Set(wellness.map((w) => w.date));

  const rule = String(settings.streakActiveRule || "any-log");
  const freezeLimit = Math.max(0, Math.min(2, Number(settings.streakFreezesPerWeek) || 0));
  const restProtection = settings.streakRestProtection !== false;

  function isDayCounted(dateStr) {
    const hasFood = foodDates.has(dateStr);
    const hasWorkout = workoutDates.has(dateStr);
    const hasRecoveryLog = bodyDates.has(dateStr) || wellnessDates.has(dateStr);

    let active = false;
    if (rule === "workout-only") {
      active = hasWorkout;
    } else if (rule === "food-workout") {
      active = hasFood && hasWorkout;
    } else {
      active = hasFood || hasWorkout;
    }

    if (!active && restProtection && hasRecoveryLog) {
      active = true;
    }
    return active;
  }

  function weekKey(dateObj) {
    const start = new Date(dateObj);
    start.setHours(12, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return localDateStr(start);
  }

  let streak = 0;
  const freezeUsage = {};
  const d = new Date();

  // If today has no activity yet, start from yesterday (tolerance)
  if (!isDayCounted(localDateStr(d))) {
    d.setDate(d.getDate() - 1);
  }

  while (true) {
    const dateStr = localDateStr(d);
    if (isDayCounted(dateStr)) {
      streak++;
      d.setDate(d.getDate() - 1);
      continue;
    }

    const wKey = weekKey(d);
    const used = Number(freezeUsage[wKey] || 0);
    if (freezeLimit > 0 && used < freezeLimit) {
      freezeUsage[wKey] = used + 1;
      streak++;
      d.setDate(d.getDate() - 1);
      continue;
    }
    break;
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

function getBodyweightKgForGoalPlanning() {
  const raw = Number(getPrimaryBodyweight()) || 0;
  const fallback = (settings.weightUnit || "kg") === "lbs" ? 154 : 70;
  const base = raw > 0 ? raw : fallback;
  const kg = (settings.weightUnit || "kg") === "lbs" ? base * 0.453592 : base;
  return Math.max(40, Math.min(220, kg));
}

function normalizeCompeteDayProfile(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (raw === "rest" || raw === "rest-day" || raw === "rest day") return "rest";
  if (raw === "carb-up" || raw === "carbup" || raw === "carb up") return "carb-up";
  if (raw === "peak-week" || raw === "peakweek" || raw === "peak week") return "peak-week";
  return "training";
}

function calculateMacroTargetsForProfile(estimatedTDEE, bodyweightKg, profile) {
  const p = profile || {};
  const calories = Math.max(1200, Math.min(6000, Math.round(Number(estimatedTDEE || 0) + Number(p.delta || 0))));
  const proteinPerKg = Number.isFinite(Number(p.proteinPerKg)) ? Number(p.proteinPerKg) : 2;
  const fatPerKg = Number.isFinite(Number(p.fatPerKg)) ? Number(p.fatPerKg) : 0.8;
  const minCarbs = Math.max(40, Number(p.minCarbs) || 40);

  let protein = Math.max(60, Math.min(360, Math.round(Number(bodyweightKg || 70) * proteinPerKg)));
  let fat = Math.max(35, Math.min(180, Math.round(Number(bodyweightKg || 70) * fatPerKg)));
  let carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  if (carbs < minCarbs) {
    carbs = minCarbs;
    fat = Math.round((calories - protein * 4 - carbs * 4) / 9);
  }
  if (fat < 35) {
    fat = 35;
    carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  }

  return {
    calories,
    protein,
    carbs: Math.max(minCarbs, carbs),
    fat,
  };
}

function calculateCompeteMacroProfilesFromTDEE(estimatedTDEE, bodyweightKg) {
  const templates = {
    training: { delta: -220, proteinPerKg: 2.6, fatPerKg: 0.7, minCarbs: 140 },
    rest: { delta: -450, proteinPerKg: 2.8, fatPerKg: 0.9, minCarbs: 80 },
    "carb-up": { delta: 180, proteinPerKg: 2.2, fatPerKg: 0.55, minCarbs: 220 },
    "peak-week": { delta: -80, proteinPerKg: 2.4, fatPerKg: 0.65, minCarbs: 180 },
  };

  const profiles = {};
  Object.keys(templates).forEach((key) => {
    profiles[key] = calculateMacroTargetsForProfile(estimatedTDEE, bodyweightKg, templates[key]);
  });
  return profiles;
}

function calculateGoalMacroTargetsFromTDEE(estimatedTDEE, goal, bodyweightKg, options) {
  const g = String(goal || "maintain").toLowerCase();
  const opts = options || {};

  if (g === "compete") {
    const profiles = calculateCompeteMacroProfilesFromTDEE(estimatedTDEE, bodyweightKg);
    const dayType = normalizeCompeteDayProfile(opts.dayType || settings.goalDayProfile || "training");
    const selected = profiles[dayType] || profiles.training;
    const result = {
      ...selected,
      dayType,
    };
    if (opts.includeProfiles) {
      result.profiles = profiles;
    }
    return result;
  }

  const profiles = {
    lose: { delta: -400, proteinPerKg: 2.4, fatPerKg: 0.8, minCarbs: 60 },
    maintain: { delta: 0, proteinPerKg: 2.0, fatPerKg: 0.9, minCarbs: 60 },
    gain: { delta: 300, proteinPerKg: 2.0, fatPerKg: 0.8, minCarbs: 80 },
    performance: { delta: 200, proteinPerKg: 2.0, fatPerKg: 0.8, minCarbs: 90 },
  };
  return calculateMacroTargetsForProfile(
    estimatedTDEE,
    bodyweightKg,
    profiles[g] || profiles.maintain
  );
}

function syncGoalToAdaptiveTDEE(options) {
  const opts = options || {};
  const minConfidence = Number.isFinite(Number(opts.minConfidence)) ? Number(opts.minConfidence) : 0.65;
  const force = !!opts.force;
  const tdeeResult = calculateAdaptiveTDEE();

  if (!tdeeResult || tdeeResult.status !== "ready") {
    return {
      status: "insufficient",
      tdeeResult,
      message: tdeeResult && tdeeResult.message ? tdeeResult.message : "Not enough data",
    };
  }

  const confidence = Number(tdeeResult.confidence) || 0;
  if (!force && confidence < minConfidence) {
    return {
      status: "low-confidence",
      tdeeResult,
      minConfidence,
    };
  }

  const bodyweightKg = getBodyweightKgForGoalPlanning();
  const goal = settings.bodyGoal || "maintain";
  const targets = calculateGoalMacroTargetsFromTDEE(
    tdeeResult.estimatedTDEE,
    goal,
    bodyweightKg,
    {
      dayType: settings.goalDayProfile || "training",
      includeProfiles: goal === "compete",
    }
  );

  const next = {
    ...settings,
    calorieGoal: targets.calories,
    proteinGoal: targets.protein,
    carbsGoal: targets.carbs,
    fatGoal: targets.fat,
    goalDayProfile: targets.dayType || normalizeCompeteDayProfile(settings.goalDayProfile || "training"),
    goalMacroProfiles: targets.profiles || null,
    lastGoalSyncAt: Date.now(),
    lastGoalSyncConfidence: confidence,
    lastGoalSyncTDEE: tdeeResult.estimatedTDEE,
  };

  updateSettings(next);
  try {
    localStorage.setItem(KEYS.settings, JSON.stringify(next));
  } catch {
    // silent
  }

  return {
    status: "ready",
    tdeeResult,
    targets,
    dayType: next.goalDayProfile,
    profiles: next.goalMacroProfiles,
    settings: next,
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

  if (goal === "lose" || goal === "compete") {
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
    if (goal === "lose" || goal === "compete")
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

// ========== EXPERIENCE + HAPTICS ==========
function normalizeExperienceLevel(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (raw === "intermediate" || raw === "advanced" || raw === "competitor") return raw;
  return "beginner";
}

function getEffectiveExperienceLevel() {
  const selected = normalizeExperienceLevel(settings.experienceLevel || "beginner");
  const mode = String(settings.uiComplexityMode || "auto").toLowerCase();

  if (mode === "simple") return "beginner";
  if (mode === "full") return selected;

  const workoutsScore = loadData(KEYS.workouts).length * 2;
  const foodScore = Math.floor(loadData(KEYS.food).length / 4);
  const bodyScore = loadData(KEYS.body).length;
  const score = workoutsScore + foodScore + bodyScore;

  if (selected === "competitor" || score >= 240) return "competitor";
  if (selected === "advanced" || score >= 120) return "advanced";
  if (selected === "intermediate" || score >= 40) return "intermediate";
  return "beginner";
}

function triggerHaptic(pattern) {
  if (!settings.hapticsEnabled || !navigator || typeof navigator.vibrate !== "function") return false;

  const map = {
    light: [12],
    success: [20, 30, 20],
    warning: [30, 45, 30],
    heavy: [60, 40, 60],
  };

  const sequence = Array.isArray(pattern) ? pattern : (map[String(pattern || "").toLowerCase()] || map.light);
  try {
    navigator.vibrate(sequence);
    return true;
  } catch {
    return false;
  }
}

// ========== GAMIFICATION ==========
function defaultXpProfile() {
  return {
    level: 1,
    xp: 0,
    totalEarned: 0,
    lastAwardAt: 0,
    history: [],
  };
}

function loadXpProfile() {
  const raw = loadData(KEYS.xpProfile);
  if (!raw || Array.isArray(raw)) return defaultXpProfile();
  return { ...defaultXpProfile(), ...raw };
}

function saveXpProfile(profile) {
  saveData(KEYS.xpProfile, profile || defaultXpProfile());
}

function getXpRequiredForLevel(level) {
  const lv = Math.max(1, Number(level) || 1);
  return Math.round(80 + Math.pow(lv, 1.35) * 40);
}

function grantXP(amount, reason, meta) {
  const gain = Math.max(0, Math.round(Number(amount) || 0));
  if (!gain) {
    return {
      profile: loadXpProfile(),
      gained: 0,
      leveledUp: false,
      levelsGained: 0,
      reason: reason || "",
    };
  }

  const profile = loadXpProfile();
  profile.totalEarned = Math.max(0, Number(profile.totalEarned) || 0) + gain;
  profile.xp = Math.max(0, Number(profile.xp) || 0) + gain;
  profile.lastAwardAt = Date.now();

  let levelsGained = 0;
  while (profile.xp >= getXpRequiredForLevel(profile.level)) {
    profile.xp -= getXpRequiredForLevel(profile.level);
    profile.level += 1;
    levelsGained += 1;
  }

  profile.history = (profile.history || [])
    .concat({
      ts: Date.now(),
      gained: gain,
      reason: String(reason || "activity"),
      meta: meta || null,
    })
    .slice(-80);

  saveXpProfile(profile);
  return {
    profile,
    gained: gain,
    leveledUp: levelsGained > 0,
    levelsGained,
    reason: String(reason || "activity"),
  };
}

function getDailyChallengeSnapshot(dateStr) {
  const day = dateStr || today();
  const food = loadData(KEYS.food).filter((row) => row.date === day);
  const workouts = loadData(KEYS.workouts).filter((row) => row.date === day);
  const water = loadData(KEYS.water)
    .filter((row) => row.date === day)
    .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const protein = food.reduce((sum, row) => sum + (Number(row.protein) || 0), 0);

  const challenges = [
    {
      id: "food-3",
      label: "Log 3 meals",
      xp: 20,
      target: 3,
      value: food.length,
    },
    {
      id: "workout-1",
      label: "Complete 1 workout",
      xp: 40,
      target: 1,
      value: workouts.length,
    },
    {
      id: "water-goal",
      label: "Hit hydration goal",
      xp: 25,
      target: Math.max(1, Number(settings.waterGoal) || 2000),
      value: water,
      unit: "ml",
    },
    {
      id: "protein-goal",
      label: "Hit protein goal",
      xp: 30,
      target: Math.max(1, Number(settings.proteinGoal) || 150),
      value: protein,
      unit: "g",
    },
  ];

  const history = loadData(KEYS.challengeHistory);
  const dateKey = "challenge|" + day;
  const existing = Array.isArray(history)
    ? history.find((row) => String(row && row.id) === dateKey)
    : null;

  const completedMap = existing && existing.completed ? existing.completed : {};
  const completedNow = {};
  let awardedXP = 0;

  challenges.forEach((challenge) => {
    const done = Number(challenge.value) >= Number(challenge.target);
    const wasDone = !!completedMap[challenge.id];
    if (done && !wasDone) {
      awardedXP += Number(challenge.xp) || 0;
    }
    completedNow[challenge.id] = done || wasDone;
    challenge.completed = completedNow[challenge.id];
    challenge.progress = Math.min(1, Number(challenge.value) / Math.max(1, Number(challenge.target)));
  });

  if (awardedXP > 0 || !existing) {
    const nextHistory = (Array.isArray(history) ? history.filter((row) => String(row && row.id) !== dateKey) : []).concat({
      id: dateKey,
      date: day,
      completed: completedNow,
      updatedAt: Date.now(),
    });
    saveData(KEYS.challengeHistory, nextHistory);
  }

  if (awardedXP > 0) {
    grantXP(awardedXP, "daily-challenges", { date: day });
  }

  return {
    date: day,
    awardedXP,
    challenges,
  };
}

function getMonthBounds(dateStr) {
  const ref = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return {
    startDate: localDateStr(start),
    endDate: localDateStr(end),
    monthKey: String(ref.getFullYear()) + "-" + String(ref.getMonth() + 1).padStart(2, "0"),
    monthLabel: ref.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
  };
}

function ensureDeadlineChallenges(dateStr) {
  const bounds = getMonthBounds(dateStr);
  const current = loadData(KEYS.challenges);
  const rows = Array.isArray(current) ? current.slice() : [];

  const defaults = [
    {
      id: "deadline-workouts-" + bounds.monthKey,
      title: "Log 20 workouts in " + bounds.monthLabel,
      metric: "workouts",
      target: 20,
      xp: 180,
      startDate: bounds.startDate,
      endDate: bounds.endDate,
      createdAt: Date.now(),
      completedAt: 0,
      rewarded: false,
    },
    {
      id: "deadline-protein-days-" + bounds.monthKey,
      title: "Hit protein goal on 25 days in " + bounds.monthLabel,
      metric: "protein-days",
      target: 25,
      xp: 220,
      startDate: bounds.startDate,
      endDate: bounds.endDate,
      createdAt: Date.now(),
      completedAt: 0,
      rewarded: false,
    },
  ];

  let changed = false;
  defaults.forEach(function (seed) {
    if (!rows.some(function (row) { return row && row.id === seed.id; })) {
      rows.push(seed);
      changed = true;
    }
  });

  if (changed) saveData(KEYS.challenges, rows);
  return rows;
}

function getRangeWorkoutCount(startDate, endDate) {
  return loadData(KEYS.workouts).filter(function (row) {
    return row && row.date >= startDate && row.date <= endDate;
  }).length;
}

function getRangeProteinGoalDays(startDate, endDate) {
  const proteinGoal = Math.max(1, Number(settings.proteinGoal) || 150);
  const totals = Object.create(null);
  loadData(KEYS.food).forEach(function (row) {
    if (!row || !row.date || row.date < startDate || row.date > endDate) return;
    totals[row.date] = (Number(totals[row.date]) || 0) + (Number(row.protein) || 0);
  });

  return Object.keys(totals).filter(function (dateKey) {
    return Number(totals[dateKey]) >= proteinGoal;
  }).length;
}

function evaluateDeadlineChallenges(dateStr, options) {
  const opts = options || {};
  const allowAward = opts.award !== false;
  const day = dateStr || today();
  const refMs = Date.parse(day + "T00:00:00") || Date.now();
  const rows = ensureDeadlineChallenges(day);

  let changed = false;
  let awardedXP = 0;

  const evaluated = rows.map(function (row) {
    const challenge = { ...(row || {}) };
    const startDate = String(challenge.startDate || day);
    const endDate = String(challenge.endDate || day);

    let value = 0;
    if (challenge.metric === "workouts") {
      value = getRangeWorkoutCount(startDate, endDate);
    } else if (challenge.metric === "protein-days") {
      value = getRangeProteinGoalDays(startDate, endDate);
    }

    const target = Math.max(1, Number(challenge.target) || 1);
    const completed = value >= target;
    const progress = Math.min(1, value / target);

    const endMs = Date.parse(endDate + "T00:00:00");
    const remainingDays = Number.isFinite(endMs)
      ? Math.max(0, Math.ceil((endMs - refMs) / (24 * 60 * 60 * 1000)))
      : 0;

    if (completed && !Number(challenge.completedAt)) {
      challenge.completedAt = Date.now();
      changed = true;
    }

    if (completed && allowAward && !challenge.rewarded) {
      awardedXP += Math.max(0, Number(challenge.xp) || 0);
      challenge.rewarded = true;
      changed = true;
    }

    challenge.value = value;
    challenge.progress = progress;
    challenge.remainingDays = remainingDays;
    challenge.completed = completed || !!challenge.completedAt;

    return challenge;
  });

  if (changed) {
    saveData(KEYS.challenges, evaluated);
  }

  if (awardedXP > 0) {
    grantXP(awardedXP, "deadline-challenges", { date: day });
  }

  return {
    date: day,
    awardedXP: awardedXP,
    challenges: evaluated.sort(function (a, b) {
      const aDone = a && a.completed ? 1 : 0;
      const bDone = b && b.completed ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return (Number(a.remainingDays) || 0) - (Number(b.remainingDays) || 0);
    }),
  };
}

function getDeadlineChallengeSnapshot(dateStr, options) {
  return evaluateDeadlineChallenges(dateStr, options || {});
}

// ========== WEBHOOKS ==========
function sanitizeWebhookUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function loadWebhookQueue() {
  const queue = loadData(KEYS.webhookQueue);
  return Array.isArray(queue) ? queue : [];
}

function saveWebhookQueue(queue) {
  saveData(KEYS.webhookQueue, Array.isArray(queue) ? queue.slice(-200) : []);
}

function shouldEmitWebhookEvent(eventName) {
  if (!settings.webhookEnabled) return false;
  if (!sanitizeWebhookUrl(settings.webhookUrl)) return false;
  const configured = Array.isArray(settings.webhookEvents) ? settings.webhookEvents : [];
  if (!configured.length) return true;
  return configured.includes(String(eventName || ""));
}

function enqueueWebhookEvent(eventName, payload) {
  const queue = loadWebhookQueue();
  queue.push({
    id: uid(),
    ts: Date.now(),
    event: String(eventName || "event"),
    payload: payload || {},
    retries: 0,
  });
  saveWebhookQueue(queue);
  return queue.length;
}

async function postWebhookPayload(url, body, timeoutMs) {
  const timeout = Math.max(1500, Number(timeoutMs) || 4500);
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl
    ? setTimeout(function () {
        try {
          ctrl.abort();
        } catch {
          /* ignore */
        }
      }, timeout)
    : null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
      signal: ctrl ? ctrl.signal : undefined,
    });
    return { ok: !!(res && res.ok), status: res ? res.status : 0 };
  } catch {
    return { ok: false, status: 0 };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function flushWebhookQueue() {
  const url = sanitizeWebhookUrl(settings.webhookUrl);
  if (!settings.webhookEnabled || !url) {
    return { sent: 0, pending: loadWebhookQueue().length, skipped: true };
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { sent: 0, pending: loadWebhookQueue().length, offline: true };
  }

  const queue = loadWebhookQueue();
  if (!queue.length) return { sent: 0, pending: 0 };

  let sent = 0;
  const keep = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const result = await postWebhookPayload(url, {
      id: item.id,
      ts: item.ts,
      event: item.event,
      payload: item.payload,
      source: "fitone",
    });

    if (result.ok) {
      sent += 1;
      continue;
    }

    const retries = Math.max(0, Number(item.retries) || 0) + 1;
    if (retries <= 5) {
      keep.push({ ...item, retries });
    }
  }

  saveWebhookQueue(keep);
  return { sent, pending: keep.length };
}

function emitWebhookEvent(eventName, payload) {
  if (!shouldEmitWebhookEvent(eventName)) {
    return Promise.resolve({ queued: false, pending: loadWebhookQueue().length });
  }
  enqueueWebhookEvent(eventName, payload || {});
  return flushWebhookQueue();
}
