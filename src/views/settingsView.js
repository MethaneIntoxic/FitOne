// ========== SETTINGS VIEW ==========

function settingBool(id, fallback) {
  const el = $(id);
  return el ? !!el.checked : fallback;
}

function settingNum(id, fallback) {
  const el = $(id);
  return el ? parseInt(el.value, 10) || fallback : fallback;
}

function settingVal(id, fallback) {
  const el = $(id);
  return el ? el.value : fallback;
}

function setSegmentedActive(containerId, selector, value) {
  const container = $(containerId);
  if (!container) return;
  container.querySelectorAll(selector).forEach((btn) => {
    const key = btn.getAttribute("data-weight-unit") || btn.getAttribute("data-plate-system") || "";
    btn.classList.toggle("active", key === String(value || ""));
  });
}

function normalizePlateSystem(value) {
  const raw = String(value || "").toLowerCase();
  if (raw === "45lb" || raw === "lbs" || raw === "lb") return "lbs";
  return "kg";
}

function normalizeExperienceSetting(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (raw === "intermediate" || raw === "advanced" || raw === "competitor") return raw;
  return "beginner";
}

function normalizeUiComplexityMode(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (raw === "simple" || raw === "full") return raw;
  return "auto";
}

function normalizeHexColor(value, fallback) {
  const base = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(base)) return base.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(base)) return ("#" + base).toUpperCase();
  return String(fallback || "#8B5CF6").toUpperCase();
}

function shiftHexChannel(channel, delta) {
  return Math.max(0, Math.min(255, Math.round(channel + delta)));
}

function tintHexColor(hex, ratio) {
  const safe = normalizeHexColor(hex, "#8B5CF6").slice(1);
  const r = parseInt(safe.slice(0, 2), 16);
  const g = parseInt(safe.slice(2, 4), 16);
  const b = parseInt(safe.slice(4, 6), 16);
  const delta = Math.round(255 * Math.max(-1, Math.min(1, Number(ratio) || 0)));
  const rr = shiftHexChannel(r, delta);
  const gg = shiftHexChannel(g, delta);
  const bb = shiftHexChannel(b, delta);
  return (
    "#" +
    rr.toString(16).padStart(2, "0") +
    gg.toString(16).padStart(2, "0") +
    bb.toString(16).padStart(2, "0")
  ).toUpperCase();
}

function applyThemeAndAccent(targetSettings) {
  const s = targetSettings || settings;
  const dark = !!s.darkMode;
  const accent = normalizeHexColor(s.accentColor, "#8B5CF6");
  const accent2 = tintHexColor(accent, dark ? 0.22 : 0.12);
  const accentSoft = tintHexColor(accent, dark ? -0.42 : 0.45);

  document.documentElement.setAttribute("data-theme", dark ? "" : "light");
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--primary", accent);
  document.documentElement.style.setProperty("--accent2", accent2);
  document.documentElement.style.setProperty("--brand-primary", accent);
  document.documentElement.style.setProperty("--brand-primary-light", accent2);
  document.documentElement.style.setProperty("--brand-primary-soft", accentSoft);

  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.content = dark ? tintHexColor(accent, -0.35) : accent;
}

function parseWebhookEventsInput(raw) {
  const cleaned = String(raw || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.toLowerCase());
  return Array.from(new Set(cleaned));
}

function getCompetitionCountdownSummary() {
  const raw = String(settings.competitionDate || "").trim();
  if (!raw) return "Set a competition date to enable prep countdown and competitor timeline cues.";
  const target = Date.parse(raw + "T00:00:00");
  if (!Number.isFinite(target)) return "Competition date is invalid. Please choose a valid date.";

  const now = new Date();
  const todayStart = Date.parse(localDateStr(now) + "T00:00:00");
  const days = Math.ceil((target - todayStart) / (24 * 60 * 60 * 1000));

  if (days < 0) return "Competition date passed " + Math.abs(days) + " day" + (Math.abs(days) === 1 ? "" : "s") + " ago.";

  let phase = "Build";
  if (days <= 7) phase = "Peak Week";
  else if (days <= 21) phase = "Final Taper";
  else if (days <= 56) phase = "Conditioning";

  return days + " day" + (days === 1 ? "" : "s") + " to show day • Current phase: " + phase;
}

const GOAL_PROFILE_KEYS = ["training", "rest", "carb-up", "peak-week"];

function goalProfileDomKey(profileKey) {
  return String(profileKey || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function goalProfileFieldId(profileKey, metricKey) {
  return "settingMacro_" + goalProfileDomKey(profileKey) + "_" + metricKey;
}

function ensureGoalMacroProfilesForEditor() {
  const current = settings.goalMacroProfiles;
  const fallback = {
    training: {
      calories: Number(settings.calorieGoal) || 2000,
      protein: Number(settings.proteinGoal) || 150,
      carbs: Number(settings.carbsGoal) || 250,
      fat: Number(settings.fatGoal) || 65,
    },
    rest: {
      calories: Math.max(1200, (Number(settings.calorieGoal) || 2000) - 250),
      protein: Number(settings.proteinGoal) || 150,
      carbs: Math.max(40, (Number(settings.carbsGoal) || 250) - 60),
      fat: Math.max(35, Number(settings.fatGoal) || 65),
    },
    "carb-up": {
      calories: (Number(settings.calorieGoal) || 2000) + 180,
      protein: Math.max(90, (Number(settings.proteinGoal) || 150) - 20),
      carbs: (Number(settings.carbsGoal) || 250) + 80,
      fat: Math.max(30, (Number(settings.fatGoal) || 65) - 10),
    },
    "peak-week": {
      calories: (Number(settings.calorieGoal) || 2000) - 80,
      protein: Number(settings.proteinGoal) || 150,
      carbs: Math.max(80, (Number(settings.carbsGoal) || 250) - 30),
      fat: Math.max(30, (Number(settings.fatGoal) || 65) - 8),
    },
  };

  if (!current || typeof current !== "object") return fallback;

  const out = {};
  GOAL_PROFILE_KEYS.forEach((key) => {
    const row = current[key];
    out[key] = {
      calories: Math.max(1200, Number(row && row.calories) || fallback[key].calories),
      protein: Math.max(50, Number(row && row.protein) || fallback[key].protein),
      carbs: Math.max(0, Number(row && row.carbs) || fallback[key].carbs),
      fat: Math.max(20, Number(row && row.fat) || fallback[key].fat),
    };
  });

  return out;
}

function renderMacroProfileEditorHtml() {
  const profiles = ensureGoalMacroProfilesForEditor();
  return GOAL_PROFILE_KEYS.map((key) => {
    const row = profiles[key] || {};
    const domKey = goalProfileDomKey(key);
    const label = getGoalDayProfileLabel(key);
    return (
      '<div class="macro-profile-row">' +
        '<div class="flex-between mb-8">' +
          '<strong class="text-sm">' + esc(label) + '</strong>' +
          '<button class="btn btn-outline btn-sm" data-apply-goal-profile="' + escAttr(key) + '">Apply</button>' +
        '</div>' +
        '<div class="stat-row">' +
          '<div class="form-group" style="flex:1"><label>Cal</label><input type="number" id="' + goalProfileFieldId(domKey, "calories") + '" value="' + Math.round(Number(row.calories) || 0) + '"></div>' +
          '<div class="form-group" style="flex:1"><label>P</label><input type="number" id="' + goalProfileFieldId(domKey, "protein") + '" value="' + Math.round(Number(row.protein) || 0) + '"></div>' +
          '<div class="form-group" style="flex:1"><label>C</label><input type="number" id="' + goalProfileFieldId(domKey, "carbs") + '" value="' + Math.round(Number(row.carbs) || 0) + '"></div>' +
          '<div class="form-group" style="flex:1"><label>F</label><input type="number" id="' + goalProfileFieldId(domKey, "fat") + '" value="' + Math.round(Number(row.fat) || 0) + '"></div>' +
        '</div>' +
      '</div>'
    );
  }).join("");
}

function readMacroProfilesFromUI() {
  const out = {};
  GOAL_PROFILE_KEYS.forEach((key) => {
    const domKey = goalProfileDomKey(key);
    const calsEl = $(goalProfileFieldId(domKey, "calories"));
    const proEl = $(goalProfileFieldId(domKey, "protein"));
    const carbEl = $(goalProfileFieldId(domKey, "carbs"));
    const fatEl = $(goalProfileFieldId(domKey, "fat"));
    if (!calsEl || !proEl || !carbEl || !fatEl) return;
    out[key] = {
      calories: Math.max(1200, Number(calsEl.value) || 1200),
      protein: Math.max(50, Number(proEl.value) || 50),
      carbs: Math.max(0, Number(carbEl.value) || 0),
      fat: Math.max(20, Number(fatEl.value) || 20),
    };
  });
  return out;
}

function updateRestTimeDisplay() {
  const baseDisplay = $("settingRestTimeDisplay");
  const baseHidden = $("settingRestTime");
  const baseRange = $("settingRestTimeRange");
  const baseValue = Math.max(
    30,
    Math.min(
      300,
      Number((baseRange && baseRange.value) || (baseHidden && baseHidden.value) || settings.defaultRestTime || 90)
    )
  );
  if (baseHidden) baseHidden.value = String(baseValue);
  if (baseDisplay) baseDisplay.textContent = baseValue + "s";

  const compoundDisplay = $("settingRestCompoundDisplay");
  const compoundHidden = $("settingRestCompound");
  const compoundRange = $("settingRestCompoundRange");
  const compoundFallback = settings.defaultCompoundRestTime || Math.max(baseValue, 150);
  const compoundValue = Math.max(
    60,
    Math.min(
      300,
      Number((compoundRange && compoundRange.value) || (compoundHidden && compoundHidden.value) || compoundFallback)
    )
  );
  if (compoundHidden) compoundHidden.value = String(compoundValue);
  if (compoundDisplay) compoundDisplay.textContent = compoundValue + "s";

  const isolationDisplay = $("settingRestIsolationDisplay");
  const isolationHidden = $("settingRestIsolation");
  const isolationRange = $("settingRestIsolationRange");
  const isolationFallback = settings.defaultIsolationRestTime || Math.max(30, Math.min(baseValue, 90));
  const isolationValue = Math.max(
    30,
    Math.min(
      180,
      Number((isolationRange && isolationRange.value) || (isolationHidden && isolationHidden.value) || isolationFallback)
    )
  );
  if (isolationHidden) isolationHidden.value = String(isolationValue);
  if (isolationDisplay) isolationDisplay.textContent = isolationValue + "s";
}

function renderProfileAvatar() {
  const avatarWrap = $("profileAvatarLarge");
  const headerAvatar = $("headerAvatar");
  if (!avatarWrap) return;

  if (settings.avatar) {
    avatarWrap.innerHTML = '<img src="' + escAttr(settings.avatar) + '" alt="Profile avatar"><div class="profile-avatar-edit"><span class="material-symbols-outlined profile-avatar-edit-icon">edit</span></div>';
    if (headerAvatar) {
      headerAvatar.innerHTML = '<img class="header-avatar-img" src="' + escAttr(settings.avatar) + '" alt="Avatar">';
    }
  } else {
    avatarWrap.innerHTML = '<span class="material-symbols-outlined">person</span><div class="profile-avatar-edit"><span class="material-symbols-outlined profile-avatar-edit-icon">edit</span></div>';
    if (headerAvatar) {
      headerAvatar.innerHTML = '<span class="material-symbols-outlined">person</span>';
    }
  }
}

function handleAvatarUpload(file) {
  if (!file) return;
  if (!/^image\//.test(file.type || "")) {
    showToast("Please choose an image file.", "warning");
    return;
  }
  const reader = new FileReader();
  reader.onload = function () {
    const next = { ...settings, avatar: String(reader.result || "") };
    updateSettings(next);
    localStorage.setItem(KEYS.settings, JSON.stringify(next));
    renderProfileAvatar();
    showToast("Avatar updated");
  };
  reader.onerror = function () {
    showToast("Could not read image", "error");
  };
  reader.readAsDataURL(file);
}

function updatePlateSystemSubtitle() {
  const subtitle = $("plateSystemSubtitle");
  const val = normalizePlateSystem(settingVal("settingPlateSystem", settings.plateSystem || "kg"));
  if (!subtitle) return;
  subtitle.textContent = val === "lbs"
    ? "Selected: Standard Olympic 45LB"
    : "Selected: Standard Olympic 20KG";
}

const TDEE_SYNC_MIN_CONFIDENCE = 0.65;

function normalizeGoalDayProfile(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (raw === "rest" || raw === "rest day" || raw === "rest-day") return "rest";
  if (raw === "carb-up" || raw === "carb up" || raw === "carbup") return "carb-up";
  if (raw === "peak-week" || raw === "peak week" || raw === "peakweek") return "peak-week";
  return "training";
}

function getGoalDayProfileLabel(value) {
  const key = normalizeGoalDayProfile(value);
  if (key === "rest") return "Rest Day";
  if (key === "carb-up") return "Carb-Up";
  if (key === "peak-week") return "Peak Week";
  return "Training Day";
}

function getCompeteTargetsFromSettings(dayProfile) {
  const profiles = settings.goalMacroProfiles;
  if (!profiles || typeof profiles !== "object") return null;

  const key = normalizeGoalDayProfile(dayProfile || settings.goalDayProfile || "training");
  const entry = profiles[key];
  if (!entry || typeof entry !== "object") return null;

  const calories = Number(entry.calories) || 0;
  const protein = Number(entry.protein) || 0;
  const carbs = Number(entry.carbs) || 0;
  const fat = Number(entry.fat) || 0;
  if (!(calories > 0 && protein > 0 && carbs >= 0 && fat >= 0)) return null;

  return {
    dayType: key,
    calories,
    protein,
    carbs,
    fat,
  };
}

function refreshGoalProfileControls() {
  const group = $("competeGoalProfileGroup");
  const select = $("settingGoalDayProfile");
  const hint = $("settingGoalProfileHint");
  if (!group || !select || !hint) return;

  const isCompete = (settings.bodyGoal || "maintain") === "compete";
  group.classList.toggle("hidden", !isCompete);
  if (!isCompete) {
    hint.textContent = "";
    return;
  }

  const profile = normalizeGoalDayProfile(settings.goalDayProfile || select.value || "training");
  select.value = profile;

  const targets = getCompeteTargetsFromSettings(profile);
  if (targets) {
    hint.textContent =
      getGoalDayProfileLabel(profile) +
      ": " +
      targets.calories +
      " kcal (P" +
      targets.protein +
      " C" +
      targets.carbs +
      " F" +
      targets.fat +
      ")";
  } else {
    hint.textContent = "Sync Goal to TDEE to generate training/rest/carb-up/peak-week targets.";
  }
}

function applyCompeteGoalProfile(dayProfile, silent) {
  const profile = normalizeGoalDayProfile(dayProfile);
  const targets = getCompeteTargetsFromSettings(profile);
  const next = {
    ...settings,
    goalDayProfile: profile,
  };

  if (targets) {
    next.calorieGoal = targets.calories;
    next.proteinGoal = targets.protein;
    next.carbsGoal = targets.carbs;
    next.fatGoal = targets.fat;
  }

  updateSettings(next);
  localStorage.setItem(KEYS.settings, JSON.stringify(next));
  loadSettingsUI();

  if (typeof window.notifyDataChanged === "function") {
    window.notifyDataChanged({ source: "settings", reason: "goalProfile" });
  }

  if (!silent) {
    if (targets) {
      showToast("Applied " + getGoalDayProfileLabel(profile) + " targets", "success");
    } else {
      showToast("Profile saved. Sync Goal to TDEE to generate profile targets.", "info");
    }
  }

  return !!targets;
}

function getBodyweightKgForMacroPlanning() {
  let latest = typeof getPrimaryBodyweight === "function" ? Number(getPrimaryBodyweight()) : 0;
  if (!Number.isFinite(latest) || latest <= 0) {
    latest = (settings.weightUnit || "kg") === "lbs" ? 154 : 70;
  }
  const kg = (settings.weightUnit || "kg") === "lbs" ? latest * 0.453592 : latest;
  return Math.max(40, Math.min(220, kg));
}

function getGoalMacroTargetsFromTDEE(tdee, goal, bodyweightKg, options) {
  if (typeof calculateGoalMacroTargetsFromTDEE === "function") {
    return calculateGoalMacroTargetsFromTDEE(tdee, goal, bodyweightKg, options);
  }

  const g = String(goal || "maintain").toLowerCase();
  const opts = options || {};

  function buildTargets(profile) {
    const calories = Math.max(1200, Math.min(6000, Math.round(Number(tdee || 0) + Number(profile.delta || 0))));
    let protein = Math.max(60, Math.min(360, Math.round(bodyweightKg * Number(profile.proteinPerKg || 2))));
    let fat = Math.max(35, Math.min(180, Math.round(bodyweightKg * Number(profile.fatPerKg || 0.8))));
    let carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
    const minCarbs = Math.max(40, Number(profile.minCarbs) || 40);

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

  if (g === "compete") {
    const templates = {
      training: { delta: -220, proteinPerKg: 2.6, fatPerKg: 0.7, minCarbs: 140 },
      rest: { delta: -450, proteinPerKg: 2.8, fatPerKg: 0.9, minCarbs: 80 },
      "carb-up": { delta: 180, proteinPerKg: 2.2, fatPerKg: 0.55, minCarbs: 220 },
      "peak-week": { delta: -80, proteinPerKg: 2.4, fatPerKg: 0.65, minCarbs: 180 },
    };
    const profiles = {};
    Object.keys(templates).forEach((key) => {
      profiles[key] = buildTargets(templates[key]);
    });
    const dayType = normalizeGoalDayProfile(opts.dayType || settings.goalDayProfile || "training");
    const selected = profiles[dayType] || profiles.training;
    return {
      ...selected,
      dayType,
      profiles: opts.includeProfiles ? profiles : undefined,
    };
  }

  const profiles = {
    lose: { delta: -400, proteinPerKg: 2.4, fatPerKg: 0.8, minCarbs: 60 },
    maintain: { delta: 0, proteinPerKg: 2.0, fatPerKg: 0.9, minCarbs: 60 },
    gain: { delta: 300, proteinPerKg: 2.0, fatPerKg: 0.8, minCarbs: 80 },
    performance: { delta: 200, proteinPerKg: 2.0, fatPerKg: 0.8, minCarbs: 90 },
  };
  return buildTargets(profiles[g] || profiles.maintain);
}

function refreshGoalSyncStatus() {
  const btn = $("settingSyncGoalToTDEEBtn");
  const status = $("settingSyncGoalToTDEEStatus");
  if (!btn || !status) return;

  status.classList.remove("is-ready", "is-warn", "is-muted");

  if (typeof calculateAdaptiveTDEE !== "function") {
    btn.disabled = true;
    status.classList.add("is-muted");
    status.textContent = "Adaptive TDEE is unavailable in this build.";
    return;
  }

  const result = calculateAdaptiveTDEE();
  if (!result || result.status !== "ready") {
    btn.disabled = true;
    status.classList.add("is-muted");
    status.textContent = result && result.message
      ? result.message + " Build more data before syncing goals."
      : "Log more food and bodyweight data to unlock TDEE sync.";
    return;
  }

  const confidencePct = Math.round((Number(result.confidence) || 0) * 100);
  if ((Number(result.confidence) || 0) < TDEE_SYNC_MIN_CONFIDENCE) {
    btn.disabled = true;
    status.classList.add("is-warn");
    status.textContent = "Confidence " + confidencePct + "% (need at least " + Math.round(TDEE_SYNC_MIN_CONFIDENCE * 100) + "%). Keep logging for a more reliable sync.";
    return;
  }

  btn.disabled = false;
  status.classList.add("is-ready");
  status.textContent =
    "Ready: " +
    result.estimatedTDEE +
    " kcal/day at " +
    confidencePct +
    "% confidence. " +
    ((settings.bodyGoal || "maintain") === "compete"
      ? "This also refreshes training/rest/carb-up/peak-week macro profiles."
      : "This updates calories and macros for your current body goal.");
}

function syncGoalsToTDEE() {
  if (typeof syncGoalToAdaptiveTDEE === "function") {
    const syncResult = syncGoalToAdaptiveTDEE({ minConfidence: TDEE_SYNC_MIN_CONFIDENCE });
    if (!syncResult || syncResult.status === "insufficient") {
      showToast(syncResult && syncResult.message ? syncResult.message : "Not enough data for TDEE sync", "warning");
      refreshGoalSyncStatus();
      return;
    }
    if (syncResult.status === "low-confidence") {
      showToast("TDEE confidence is still low. Log more days before syncing.", "info");
      refreshGoalSyncStatus();
      return;
    }
    if (syncResult.status === "ready" && syncResult.targets) {
      if ($("settingCalorieGoal")) $("settingCalorieGoal").value = String(syncResult.targets.calories);
      if ($("settingProteinGoal")) $("settingProteinGoal").value = String(syncResult.targets.protein);
      if ($("settingCarbsGoal")) $("settingCarbsGoal").value = String(syncResult.targets.carbs);
      if ($("settingFatGoal")) $("settingFatGoal").value = String(syncResult.targets.fat);
      loadSettingsUI();
      refreshGoalSyncStatus();
      const profileNote = syncResult.dayType
        ? " [" + getGoalDayProfileLabel(syncResult.dayType) + "]"
        : "";
      showToast("Goals synced" + profileNote + ": " + syncResult.targets.calories + " kcal (P" + syncResult.targets.protein + " C" + syncResult.targets.carbs + " F" + syncResult.targets.fat + ")", "success");
      return;
    }
  }

  if (typeof calculateAdaptiveTDEE !== "function") {
    showToast("Adaptive TDEE is unavailable", "warning");
    return;
  }

  const result = calculateAdaptiveTDEE();
  if (!result || result.status !== "ready") {
    showToast(result && result.message ? result.message : "Not enough data for TDEE sync", "warning");
    refreshGoalSyncStatus();
    return;
  }

  if ((Number(result.confidence) || 0) < TDEE_SYNC_MIN_CONFIDENCE) {
    showToast("TDEE confidence is still low. Log more days before syncing.", "info");
    refreshGoalSyncStatus();
    return;
  }

  const bodyweightKg = getBodyweightKgForMacroPlanning();
  const goal = settings.bodyGoal || "maintain";
  const targets = getGoalMacroTargetsFromTDEE(
    result.estimatedTDEE,
    goal,
    bodyweightKg,
    {
      dayType: settings.goalDayProfile || "training",
      includeProfiles: goal === "compete",
    }
  );

  if ($("settingCalorieGoal")) $("settingCalorieGoal").value = String(targets.calories);
  if ($("settingProteinGoal")) $("settingProteinGoal").value = String(targets.protein);
  if ($("settingCarbsGoal")) $("settingCarbsGoal").value = String(targets.carbs);
  if ($("settingFatGoal")) $("settingFatGoal").value = String(targets.fat);

  if (goal === "compete" && targets.profiles) {
    const next = {
      ...settings,
      goalDayProfile: targets.dayType || normalizeGoalDayProfile(settings.goalDayProfile || "training"),
      goalMacroProfiles: targets.profiles,
    };
    updateSettings(next);
    localStorage.setItem(KEYS.settings, JSON.stringify(next));
  }

  saveSettingsFromUI();
  refreshGoalSyncStatus();
  const profileNote = targets.dayType ? " [" + getGoalDayProfileLabel(targets.dayType) + "]" : "";
  showToast("Goals synced" + profileNote + ": " + targets.calories + " kcal (P" + targets.protein + " C" + targets.carbs + " F" + targets.fat + ")", "success");
}

function buildSettingsPayload() {
  const gymItems = Array.from(document.querySelectorAll("#gymList .gym-chip"))
    .map((el) => (el.getAttribute("data-gym") || "").trim())
    .filter(Boolean);
  const webhookEventsText = settingVal("settingWebhookEvents", (settings.webhookEvents || []).join(","));
  const parsedWebhookEvents = parseWebhookEventsInput(webhookEventsText);
  return {
    ...settings,
    calorieGoal: settingNum("settingCalorieGoal", 2000),
    proteinGoal: settingNum("settingProteinGoal", 150),
    carbsGoal: settingNum("settingCarbsGoal", 250),
    fatGoal: settingNum("settingFatGoal", 65),
    workoutGoal: settingNum("settingWorkoutGoal", 4),
    waterGoal: settingNum("settingWaterGoal", 2000),
    weightUnit: settingVal("settingWeightUnit", "kg"),
    displayName: settingVal("settingDisplayName", settings.displayName || ""),
    bio: settingVal("settingBio", settings.bio || ""),
    avatar: settings.avatar || "",
    
    // W15 App Settings
    defaultRestTime: settingNum("settingRestTime", 60),
    defaultCompoundRestTime: Math.max(60, Math.min(300, settingNum("settingRestCompound", settings.defaultCompoundRestTime || 150))),
    defaultIsolationRestTime: Math.max(30, Math.min(180, settingNum("settingRestIsolation", settings.defaultIsolationRestTime || 75))),
    plateSystem: normalizePlateSystem(settingVal("settingPlateSystem", "kg")),
    autoLock: settingBool("settingAutoLock", true),
    autoAdvance: settingBool("settingAutoAdvance", true),
    focusMode: settingBool("settingFocusMode", false),
    voiceCountdown: settingBool("settingVoiceCountdown", false),
    pushNotifications: settingBool("settingPushPulse", false),
    autoLockActiveOnly: settingBool("settingAutoLockActiveOnly", true),
    emailSummaries: false,
    streakActiveRule: settingVal("settingStreakActiveRule", settings.streakActiveRule || "any-log"),
    streakFreezesPerWeek: Math.max(0, Math.min(2, settingNum("settingStreakFreezePerWeek", settings.streakFreezesPerWeek || 2))),
    streakRestProtection: settingBool("settingStreakRestProtection", settings.streakRestProtection !== false),
    goalDayProfile: normalizeGoalDayProfile(settingVal("settingGoalDayProfile", settings.goalDayProfile || "training")),
    measureUnit: settingVal("settingMeasureUnit", "cm"),
    darkMode: settingBool("settingTheme", true),
    accentColor: normalizeHexColor(settingVal("settingAccentColorText", settingVal("settingAccentColor", settings.accentColor || "#8B5CF6")), settings.accentColor || "#8B5CF6"),
    experienceLevel: normalizeExperienceSetting(settingVal("settingExperienceLevel", settings.experienceLevel || "beginner")),
    uiComplexityMode: normalizeUiComplexityMode(settingVal("settingUiComplexityMode", settings.uiComplexityMode || "auto")),
    hapticsEnabled: settingBool("settingHapticsEnabled", settings.hapticsEnabled !== false),
    bodyGoal: settings.bodyGoal || "maintain",
    localOnlyMode: settingBool("settingLocalOnlyMode", true),
    localOnlyStrictMode: settingBool("settingLocalOnlyStrictMode", true),
    uxLockEnabled: settingBool("settingUxLockEnabled", true),
    subscriptionFreeForever: settingBool("settingSubscriptionFree", true),
    monetizationNotes: settingVal("settingMonetizationNotes", settings.monetizationNotes || ""),
    uxTelemetryEnabled: settingBool("settingUxTelemetryEnabled", false),
    aiModulesEnabled: settingBool("settingAiModulesEnabled", false),
    socialEnabled: settingBool("settingSocialEnabled", false),
    disableCooldownSuggestions: settingBool("settingDisableCooldown", false),
    pwaInstallPromptEnabled: settingBool("settingPwaInstallPromptEnabled", settings.pwaInstallPromptEnabled !== false),
    pwaUpdateAutoApply: settingBool("settingPwaUpdateAutoApply", !!settings.pwaUpdateAutoApply),
    autoBackupEnabled: settingBool("settingAutoBackupEnabled", !!settings.autoBackupEnabled),
    autoBackupFrequencyDays: Math.max(1, Math.min(30, settingNum("settingAutoBackupFrequencyDays", settings.autoBackupFrequencyDays || 7))),
    autoBackupLastRunAt: Number(settings.autoBackupLastRunAt) || 0,
    webhookEnabled: settingBool("settingWebhookEnabled", !!settings.webhookEnabled),
    webhookUrl: settingVal("settingWebhookUrl", settings.webhookUrl || "").trim(),
    webhookEvents: parsedWebhookEvents.length ? parsedWebhookEvents : (settings.webhookEvents || []),
    connectedWearables: Array.isArray(settings.connectedWearables) ? settings.connectedWearables : [],
    competitionName: settingVal("settingCompetitionName", settings.competitionName || "").trim(),
    competitionDate: settingVal("settingCompetitionDate", settings.competitionDate || "").trim(),
    competitionDivision: settingVal("settingCompetitionDivision", settings.competitionDivision || "").trim(),
    gyms: gymItems,
  };
}

function toggleTheme() {
  const newSettings = buildSettingsPayload();
  updateSettings(newSettings);
  applyThemeAndAccent(newSettings);
  saveSettingsFromUI();
}

function saveSettingsFromUI() {
  const prev = { ...settings };
  const next = buildSettingsPayload();
  if (prev.localOnlyStrictMode && !next.localOnlyStrictMode) {
    const proceed = window.confirm("Disable Local-only strict mode? This may expose future cloud/integration UI.");
    if (!proceed) {
      const strictEl = $("settingLocalOnlyStrictMode");
      if (strictEl) strictEl.checked = true;
      return;
    }
  }
  if (prev.localOnlyMode && !next.localOnlyMode) {
    const proceed = window.confirm("Disable Local-only mode? Cloud sync is not implemented yet.");
    if (!proceed) {
      const localEl = $("settingLocalOnlyMode");
      if (localEl) localEl.checked = true;
      return;
    }
  }
  updateSettings(next);
  localStorage.setItem(KEYS.settings, JSON.stringify(next));
  applyThemeAndAccent(next);
  updateBodyLabels();
  renderAdvancedSettings();
  refreshGoalSyncStatus();
  const activeTab = document.querySelector(".tab-btn.active");
  if (activeTab && window._refreshCurrentTab) window._refreshCurrentTab(activeTab.dataset.tab);
}

function saveWorkoutSettingsSection() {
  updateRestTimeDisplay();
  saveSettingsFromUI();
  showToast("Workout settings saved");
}

function resetWorkoutSettingsSection() {
  const defaults = defaultSettings();
  if ($("settingRestTimeRange")) $("settingRestTimeRange").value = String(defaults.defaultRestTime || 90);
  if ($("settingRestTime")) $("settingRestTime").value = String(defaults.defaultRestTime || 90);
  if ($("settingRestCompoundRange")) $("settingRestCompoundRange").value = String(defaults.defaultCompoundRestTime || 150);
  if ($("settingRestCompound")) $("settingRestCompound").value = String(defaults.defaultCompoundRestTime || 150);
  if ($("settingRestIsolationRange")) $("settingRestIsolationRange").value = String(defaults.defaultIsolationRestTime || 75);
  if ($("settingRestIsolation")) $("settingRestIsolation").value = String(defaults.defaultIsolationRestTime || 75);
  if ($("settingPlateSystem")) $("settingPlateSystem").value = defaults.plateSystem || "20kg";
  if ($("settingAutoLock")) $("settingAutoLock").checked = !!defaults.autoLock;
  if ($("settingAutoLockActiveOnly")) $("settingAutoLockActiveOnly").checked = !!defaults.autoLockActiveOnly;
  if ($("settingAutoAdvance")) $("settingAutoAdvance").checked = !!defaults.autoAdvance;
  if ($("settingFocusMode")) $("settingFocusMode").checked = !!defaults.focusMode;
  if ($("settingVoiceCountdown")) $("settingVoiceCountdown").checked = !!defaults.voiceCountdown;
  updateRestTimeDisplay();
  setSegmentedActive("plateSystemSegmented", ".segmented-btn", settingVal("settingPlateSystem", "kg"));
  updatePlateSystemSubtitle();
  saveSettingsFromUI();
  showToast("Workout settings reset");
}

function requestPushPermissionIfNeeded() {
  const pushToggle = $("settingPushPulse");
  if (!pushToggle || !pushToggle.checked) return;
  if (!("Notification" in window)) {
    showToast("Notifications are not supported in this browser.", "warning");
    pushToggle.checked = false;
    saveSettingsFromUI();
    return;
  }
  if (Notification.permission === "granted") return;
  Notification.requestPermission().then((permission) => {
    if (permission !== "granted") {
      pushToggle.checked = false;
      saveSettingsFromUI();
      showToast("Push permission denied", "warning");
      return;
    }
    saveSettingsFromUI();
    showToast("Push notifications enabled");
  });
}

function renderAdvancedSettings() {
  const privacy = $("settingsDataPrivacyCard");
  if (privacy) {
    privacy.innerHTML =
      '<div class="card-title">Data & Privacy</div>' +
      '<div class="toggle-row"><span>Local-only mode</span><label class="toggle"><input type="checkbox" id="settingLocalOnlyMode"' + (settings.localOnlyMode ? " checked" : "") + '><span class="toggle-slider"></span></label></div>' +
      '<div class="toggle-row"><span>Local-only strict mode</span><label class="toggle"><input type="checkbox" id="settingLocalOnlyStrictMode"' + (settings.localOnlyStrictMode ? " checked" : "") + '><span class="toggle-slider"></span></label></div>' +
      '<div class="toggle-row"><span>Lock current logging layout (prevent major changes)</span><label class="toggle"><input type="checkbox" id="settingUxLockEnabled"' + (settings.uxLockEnabled ? " checked" : "") + '><span class="toggle-slider"></span></label></div>' +
      '<p class="text-xs mt-8">All data is stored on this device only. No external servers are contacted.</p>' +
      '<p class="text-xs mt-8">Stored categories: workouts, food logs, measurements, photos metadata, protocols, routines, and day plans.</p>' +
      '<p class="text-xs mt-8">Storage location: browser localStorage (and optional IndexedDB if browser features are used in future).</p>' +
        '<p class="text-xs mt-8">Permissions used: camera (only when adding body progress photos).</p>' +
        '<p class="text-xs mt-8">Strict mode behavior: cloud-related UI remains hidden/disabled until explicitly turned off.</p>';
  }

  const diagnostics = $("settingsDiagnosticsCard");
  if (diagnostics) {
    const online = navigator.onLine ? "Online" : "Offline";
    const localSize = estimateLocalStorageSize();
    const queuedOps = listPendingSyncOperations().length;
    const webhookQueueSize = typeof loadWebhookQueue === "function" ? loadWebhookQueue().length : 0;
    const lastBackupText = settings.autoBackupLastRunAt
      ? new Date(Number(settings.autoBackupLastRunAt) || 0).toLocaleString()
      : "Never";
    diagnostics.innerHTML =
      '<div class="card-title">Offline & Storage Diagnostics</div>' +
      '<div class="text-sm">Network status: <strong>' + online + "</strong></div>" +
      '<div class="text-sm mt-8">Service worker: <span id="swStatusText">Checking...</span></div>' +
      '<div class="text-sm mt-8">Local data size estimate: <strong>' + localSize + " bytes</strong></div>" +
      '<div class="text-xs mt-8">External sync queue: ' + queuedOps + ' pending operations.</div>' +
      '<div class="text-xs mt-8">Webhook queue: ' + webhookQueueSize + ' pending events.</div>' +
      '<div class="toggle-row mt-12"><span>Enable auto backup</span><label class="toggle"><input type="checkbox" id="settingAutoBackupEnabled"' + (settings.autoBackupEnabled ? " checked" : "") + '><span class="toggle-slider"></span></label></div>' +
      '<div class="form-group mt-8"><label>Backup cadence (days)</label><input type="number" id="settingAutoBackupFrequencyDays" min="1" max="30" value="' + Math.max(1, Number(settings.autoBackupFrequencyDays) || 7) + '"></div>' +
      '<div class="text-xs mt-8">Last backup: ' + esc(lastBackupText) + '</div>' +
      '<div class="stat-row mt-8"><button class="btn btn-outline btn-sm" id="runBackupNowBtn">Backup Now</button><button class="btn btn-outline btn-sm" id="checkPwaUpdateBtn">Check App Update</button></div>' +
      '<div class="toggle-row mt-12"><span>PWA install prompts</span><label class="toggle"><input type="checkbox" id="settingPwaInstallPromptEnabled"' + (settings.pwaInstallPromptEnabled !== false ? " checked" : "") + '><span class="toggle-slider"></span></label></div>' +
      '<div class="toggle-row mt-8"><span>Auto-apply app updates</span><label class="toggle"><input type="checkbox" id="settingPwaUpdateAutoApply"' + (settings.pwaUpdateAutoApply ? " checked" : "") + '><span class="toggle-slider"></span></label></div>' +
      '<button class="btn btn-outline btn-sm mt-8" id="triggerPwaInstallBtn">Install App</button>' +
      '<div class="text-xs mt-8" id="pwaRuntimeStatus">Install status: pending detection.</div>';
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        const el = $("swStatusText");
        if (!el) return;
        if (!reg) el.textContent = "Not registered";
        else if (reg.active) el.textContent = "Registered and active";
        else el.textContent = "Registered (inactive)";
      });
    } else if ($("swStatusText")) {
      $("swStatusText").textContent = "Unsupported";
    }

    const pwaStatus = $("pwaRuntimeStatus");
    if (pwaStatus) {
      if (window._deferredInstallPrompt) {
        pwaStatus.textContent = "Install prompt is available for this device/browser.";
      } else if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
        pwaStatus.textContent = "App is already installed (standalone mode).";
      } else {
        pwaStatus.textContent = "Install prompt not currently available.";
      }
    }
  }

  const telemetry = loadUXTelemetry();
  const uxDiag = $("settingsUXDiagnosticsCard");
  if (uxDiag) {
    const selectedExp = normalizeExperienceSetting(settings.experienceLevel || "beginner");
    const selectedUiMode = normalizeUiComplexityMode(settings.uiComplexityMode || "auto");
    const accent = normalizeHexColor(settings.accentColor || "#8B5CF6", "#8B5CF6");
    uxDiag.innerHTML =
      '<div class="card-title">Experience & Interface</div>' +
      '<div class="form-group"><label>Experience level</label><select id="settingExperienceLevel">' +
        '<option value="beginner"' + (selectedExp === "beginner" ? " selected" : "") + '>Beginner</option>' +
        '<option value="intermediate"' + (selectedExp === "intermediate" ? " selected" : "") + '>Intermediate</option>' +
        '<option value="advanced"' + (selectedExp === "advanced" ? " selected" : "") + '>Advanced</option>' +
        '<option value="competitor"' + (selectedExp === "competitor" ? " selected" : "") + '>Competitor</option>' +
      '</select></div>' +
      '<div class="form-group"><label>UI complexity mode</label><select id="settingUiComplexityMode">' +
        '<option value="auto"' + (selectedUiMode === "auto" ? " selected" : "") + '>Auto adapt</option>' +
        '<option value="simple"' + (selectedUiMode === "simple" ? " selected" : "") + '>Simple (beginner-first)</option>' +
        '<option value="full"' + (selectedUiMode === "full" ? " selected" : "") + '>Full controls</option>' +
      '</select></div>' +
      '<div class="form-group"><label>Accent color</label><div class="stat-row">' +
        '<input type="color" id="settingAccentColor" value="' + accent + '" style="max-width:84px">' +
        '<input type="text" id="settingAccentColorText" value="' + accent + '" placeholder="#RRGGBB" maxlength="7">' +
      '</div></div>' +
      '<div class="toggle-row"><span>Haptic feedback</span><label class="toggle"><input type="checkbox" id="settingHapticsEnabled"' + (settings.hapticsEnabled !== false ? " checked" : "") + '><span class="toggle-slider"></span></label></div>' +
      '<div class="toggle-row"><span>Enable local UX telemetry</span><label class="toggle"><input type="checkbox" id="settingUxTelemetryEnabled"' + (settings.uxTelemetryEnabled ? " checked" : "") + '><span class="toggle-slider"></span></label></div>' +
      '<ul class="telemetry-list text-sm mt-8">' +
      "<li>Undo actions: <strong>" + (telemetry.logging.undoCount || 0) + "</strong></li>" +
      "<li>Deleted immediately: <strong>" + (telemetry.logging.deletedEntryImmediately || 0) + "</strong></li>" +
      "<li>Quick back navigations: <strong>" + (telemetry.navigation.backWithin2sOfNavigate || 0) + "</strong></li>" +
      "</ul>" +
      '<button class="btn btn-outline btn-sm mt-8" id="resetTelemetryBtn">Reset telemetry</button>';
  }

  const migration = $("settingsMigrationCard");
  if (migration) {
    migration.innerHTML =
      '<div class="card-title">Migration Wizard</div>' +
      '<div class="form-group"><label>Which app are you coming from?</label><select id="migrationSource"><option value="">Choose...</option><option>MyFitnessPal</option><option>Hevy</option><option>Strong</option><option>Strava</option><option>Other</option></select></div>' +
      '<div class="text-xs" id="migrationHelpText">Choose a source to see export guidance and which Data Studio importer to use.</div>';
  }

  const wearables = $("settingsWearablesCard");
  if (wearables) {
    const integrationsHidden = settings.localOnlyStrictMode ? '<div class="text-xs mt-8">Integrations are hidden by Local-only strict mode.</div>' : "";
    const connected = Array.isArray(settings.connectedWearables) ? settings.connectedWearables : [];
    const vendorRows = listSupportedVendors().map((vendor) => {
      const isConnected = connected.includes(vendor.id);
      return (
        '<div class="flex-between mt-8">' +
          '<div><div class="text-sm"><strong>' + esc(vendor.name || vendor.id) + '</strong></div><div class="text-xs">' + esc(vendor.mode || "manual") + " • " + esc((vendor.capabilities || []).join(", ")) + '</div></div>' +
          '<div style="display:flex;gap:6px">' +
            '<button class="btn btn-outline btn-sm" data-wearable-toggle="' + escAttr(vendor.id) + '">' + (isConnected ? "Disconnect" : "Connect") + '</button>' +
            '<button class="btn btn-outline btn-sm" data-wearable-sample="' + escAttr(vendor.id) + '">Sample Sync</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    wearables.innerHTML =
      '<div class="card-title">Wearables & Integrations</div>' +
      '<p class="text-sm">FitOne works fully without any wearable accounts. You can still connect export-based integrations below.</p>' +
      vendorRows +
      '<hr style="margin:12px 0;border:none;border-top:1px solid rgba(255,255,255,0.08)">' +
      '<div class="card-title" style="font-size:0.95rem">Peer-to-Peer Sync</div>' +
      '<p class="text-xs">Create a sync code on one device and paste it on another device. No server required.</p>' +
      '<textarea id="peerSyncCodeInput" rows="3" placeholder="Paste sync code here"></textarea>' +
      '<div class="stat-row mt-8"><button class="btn btn-outline btn-sm" id="createPeerSyncCodeBtn">Create Sync Code</button><button class="btn btn-outline btn-sm" id="applyPeerSyncCodeBtn">Apply Sync Code</button></div>' +
      '<div class="text-xs mt-8" id="peerSyncSummary">Pending local sync ops: ' + listPendingSyncOperations().length + '</div>' +
      integrationsHidden;
  }

  const gymsCard = $("settingsGymProfilesCard");
  if (gymsCard) {
    const gyms = settings.gyms || [];
    gymsCard.innerHTML =
      '<div class="card-title">Gym Profiles</div>' +
      '<p class="text-xs mb-8">Used for machine setup notes/autosuggestions during workout logging.</p>' +
      '<div class="stat-row"><div class="form-group" style="flex:1"><input type="text" id="newGymName" placeholder="Add gym name"></div><button class="btn btn-outline btn-sm" id="addGymBtn">Add</button></div>' +
      '<div id="gymList" class="favorites-grid">' +
      gyms.map((gym) => '<span class="gym-chip fav-chip" data-gym="' + escAttr(gym) + '">' + esc(gym) + ' <button class="fav-chip-remove" data-remove-gym="' + escAttr(gym) + '">✕</button></span>').join("") +
      '</div>';
  }

  const social = $("settingsSocialCard");
  if (social) {
    const webhookEvents = Array.isArray(settings.webhookEvents) ? settings.webhookEvents.join(",") : "";
    social.innerHTML =
      '<div class="card-title">Automation & Webhooks</div>' +
      '<div class="toggle-row"><span>Enable social mock features</span><label class="toggle"><input type="checkbox" id="settingSocialEnabled"' + (settings.socialEnabled ? " checked" : "") + '><span class="toggle-slider"></span></label></div>' +
      '<div class="toggle-row mt-8"><span>Enable outgoing webhook</span><label class="toggle"><input type="checkbox" id="settingWebhookEnabled"' + (settings.webhookEnabled ? " checked" : "") + '><span class="toggle-slider"></span></label></div>' +
      '<div class="form-group mt-8"><label>Webhook URL</label><input type="url" id="settingWebhookUrl" placeholder="https://example.com/hook" value="' + escAttr(settings.webhookUrl || "") + '"></div>' +
      '<div class="form-group"><label>Webhook events (comma separated)</label><input type="text" id="settingWebhookEvents" value="' + escAttr(webhookEvents) + '" placeholder="food_logged,workout_logged"></div>' +
      '<div class="stat-row"><button class="btn btn-outline btn-sm" id="testWebhookBtn">Send Test Event</button><button class="btn btn-outline btn-sm" id="flushWebhookQueueBtn">Flush Queue</button></div>' +
      '<div class="text-xs mt-8">Events are queued locally when offline and retried later.</div>';
  }

  const about = $("settingsAboutCard");
  if (about) {
    const ledger = (settings.monetizationHistory || [])
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .map((item) => "<li>" + esc(item.date) + " • v" + esc(item.version) + " • " + esc(item.note) + "</li>")
      .join("");
    about.innerHTML =
      '<div class="card-title">About FitOne / Pricing</div>' +
      '<div class="toggle-row"><span>Subscription-free forever</span><label class="toggle"><input type="checkbox" id="settingSubscriptionFree"' + (settings.subscriptionFreeForever ? " checked" : "") + '><span class="toggle-slider"></span></label></div>' +
      '<div class="toggle-row"><span>Disable cooldown suggestions</span><label class="toggle"><input type="checkbox" id="settingDisableCooldown"' + (settings.disableCooldownSuggestions ? " checked" : "") + '><span class="toggle-slider"></span></label></div>' +
      '<div class="toggle-row"><span>Enable future AI modules</span><label class="toggle"><input type="checkbox" id="settingAiModulesEnabled"' + (settings.aiModulesEnabled ? " checked" : "") + '><span class="toggle-slider"></span></label></div>' +
      '<p class="text-xs mt-8">No full-screen blocking ads. No autoplay audio/video ads. Core logging features will not be moved behind a paywall.</p>' +
      '<div class="form-group mt-8"><label>Monetization notes</label><textarea id="settingMonetizationNotes">' + esc(settings.monetizationNotes || "") + "</textarea></div>" +
      '<p class="text-xs mt-8">Core FitOne functionality does not require AI. If AI features are added in the future, they will be optional and can be disabled here.</p>' +
      '<div class="text-xs mt-8">Monetization ledger</div><ul class="text-xs mt-8">' + (ledger || "<li>No entries</li>") + "</ul>" +
      '<hr style="margin:12px 0;border:none;border-top:1px solid rgba(255,255,255,0.08)">' +
      '<div class="card-title" style="font-size:0.95rem">Competition Prep Timeline</div>' +
      '<div class="form-group"><label>Competition name</label><input type="text" id="settingCompetitionName" value="' + escAttr(settings.competitionName || "") + '" placeholder="e.g., State Championships"></div>' +
      '<div class="form-group"><label>Competition date</label><input type="date" id="settingCompetitionDate" value="' + escAttr(settings.competitionDate || "") + '"></div>' +
      '<div class="form-group"><label>Division</label><input type="text" id="settingCompetitionDivision" value="' + escAttr(settings.competitionDivision || "") + '" placeholder="Classic Physique"></div>' +
      '<div class="text-xs mt-8" id="competitionCountdownHint">' + esc(getCompetitionCountdownSummary()) + '</div>' +
      '<hr style="margin:12px 0;border:none;border-top:1px solid rgba(255,255,255,0.08)">' +
      '<div class="card-title" style="font-size:0.95rem">Macro Profiles</div>' +
      '<div class="text-xs mb-8">Set training/rest/carb-up/peak-week macros. Apply a profile to make it your active daily target.</div>' +
      renderMacroProfileEditorHtml() +
      '<button class="btn btn-outline btn-sm mt-8" id="saveMacroProfilesBtn">Save Macro Profiles</button>';
  }
  bindDynamicSettingsEvents($("panel-settings"));
}

function loadSettingsUI() {
  $("settingCalorieGoal").value = settings.calorieGoal;
  $("settingProteinGoal").value = settings.proteinGoal;
  $("settingCarbsGoal").value = settings.carbsGoal;
  $("settingFatGoal").value = settings.fatGoal;
  if ($("settingGoalDayProfile")) $("settingGoalDayProfile").value = normalizeGoalDayProfile(settings.goalDayProfile || "training");
  $("settingWorkoutGoal").value = settings.workoutGoal;
  $("settingWaterGoal").value = settings.waterGoal || 2000;
  if ($("settingStreakActiveRule")) $("settingStreakActiveRule").value = settings.streakActiveRule || "any-log";
  if ($("settingStreakFreezePerWeek")) $("settingStreakFreezePerWeek").value = String(Math.max(1, Math.min(2, Number(settings.streakFreezesPerWeek) || 2)));
  if ($("settingStreakRestProtection")) $("settingStreakRestProtection").checked = settings.streakRestProtection !== false;
  $("settingWeightUnit").value = settings.weightUnit;
  $("settingMeasureUnit").value = settings.measureUnit;
  if ($("settingDisplayName")) $("settingDisplayName").value = settings.displayName || "";
  if ($("settingBio")) $("settingBio").value = settings.bio || "";
  if ($("settingPushPulse")) $("settingPushPulse").checked = !!settings.pushNotifications;
  if ($("settingRestTimeRange")) $("settingRestTimeRange").value = String(settings.defaultRestTime || 90);
  if ($("settingRestTime")) $("settingRestTime").value = String(settings.defaultRestTime || 90);
  if ($("settingRestCompoundRange")) $("settingRestCompoundRange").value = String(settings.defaultCompoundRestTime || 150);
  if ($("settingRestCompound")) $("settingRestCompound").value = String(settings.defaultCompoundRestTime || 150);
  if ($("settingRestIsolationRange")) $("settingRestIsolationRange").value = String(settings.defaultIsolationRestTime || 75);
  if ($("settingRestIsolation")) $("settingRestIsolation").value = String(settings.defaultIsolationRestTime || 75);
  if ($("settingPlateSystem")) $("settingPlateSystem").value = normalizePlateSystem(settings.plateSystem || "kg");
  if ($("settingAutoLock")) $("settingAutoLock").checked = !!settings.autoLock;
  if ($("settingAutoLockActiveOnly")) $("settingAutoLockActiveOnly").checked = settings.autoLockActiveOnly !== false;
  if ($("settingAutoAdvance")) $("settingAutoAdvance").checked = !!settings.autoAdvance;
  if ($("settingFocusMode")) $("settingFocusMode").checked = !!settings.focusMode;
  if ($("settingVoiceCountdown")) $("settingVoiceCountdown").checked = !!settings.voiceCountdown;
  $("settingTheme").checked = settings.darkMode;
  applyThemeAndAccent(settings);
  updateBodyLabels();
  document.querySelectorAll(".goal-option").forEach((b) => {
    b.classList.toggle("active", b.dataset.goal === (settings.bodyGoal || "maintain"));
  });
  setSegmentedActive("weightUnitSegmented", ".segmented-btn", settings.weightUnit || "kg");
  setSegmentedActive("plateSystemSegmented", ".segmented-btn", normalizePlateSystem(settings.plateSystem || "kg"));
  updateRestTimeDisplay();
  updatePlateSystemSubtitle();
  renderProfileAvatar();
  renderAdvancedSettings();
  refreshGoalSyncStatus();
  refreshGoalProfileControls();
}

function selectBodyGoal(goal) {
  const newSettings = {
    ...settings,
    bodyGoal: goal,
    goalDayProfile: normalizeGoalDayProfile(settings.goalDayProfile || "training"),
  };
  updateSettings(newSettings);
  document.querySelectorAll(".goal-option").forEach((b) => {
    b.classList.toggle("active", b.dataset.goal === goal);
  });
  saveSettingsFromUI();
  refreshGoalSyncStatus();
  refreshGoalProfileControls();
  showToast("Body goal set to " + goal);
}

function updateBodyLabels() {
  const wu = settings.weightUnit;
  const mu = settings.measureUnit;
  if ($("bodyWeightLabel")) $("bodyWeightLabel").textContent = "Weight (" + wu + ")";
  if ($("bodyWaistLabel")) $("bodyWaistLabel").textContent = "Waist (" + mu + ")";
  if ($("bodyChestLabel")) $("bodyChestLabel").textContent = "Chest (" + mu + ")";
  if ($("bodyArmsLabel")) $("bodyArmsLabel").textContent = "Arms (" + mu + ")";
  if ($("bodyLegsLabel")) $("bodyLegsLabel").textContent = "Legs (" + mu + ")";
}

function bindDynamicSettingsEvents(panel) {
  [
    "settingLocalOnlyMode",
    "settingLocalOnlyStrictMode",
    "settingUxLockEnabled",
    "settingSubscriptionFree",
    "settingUxTelemetryEnabled",
    "settingAiModulesEnabled",
    "settingSocialEnabled",
    "settingDisableCooldown",
    "settingExperienceLevel",
    "settingUiComplexityMode",
    "settingHapticsEnabled",
    "settingAutoBackupEnabled",
    "settingAutoBackupFrequencyDays",
    "settingPwaInstallPromptEnabled",
    "settingPwaUpdateAutoApply",
    "settingWebhookEnabled",
    "settingCompetitionName",
    "settingCompetitionDate",
    "settingCompetitionDivision",
  ].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("change", saveSettingsFromUI);
  });
  ["settingMonetizationNotes", "settingWebhookUrl", "settingWebhookEvents", "settingAccentColorText"].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("change", saveSettingsFromUI);
  });

  const accentPicker = $("settingAccentColor");
  const accentText = $("settingAccentColorText");
  if (accentPicker) {
    accentPicker.addEventListener("input", () => {
      if (accentText) accentText.value = normalizeHexColor(accentPicker.value, "#8B5CF6");
      applyThemeAndAccent({ ...settings, accentColor: accentPicker.value });
    });
    accentPicker.addEventListener("change", saveSettingsFromUI);
  }
  if (accentText) {
    accentText.addEventListener("input", () => {
      const normalized = normalizeHexColor(accentText.value, settings.accentColor || "#8B5CF6");
      if (accentPicker) accentPicker.value = normalized;
      applyThemeAndAccent({ ...settings, accentColor: normalized });
    });
  }

  const resetBtn = $("resetTelemetryBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetUXTelemetry();
      renderAdvancedSettings();
      showToast("Telemetry reset");
    });
  }
  const migration = $("migrationSource");
  if (migration) {
    migration.addEventListener("change", () => {
      const help = $("migrationHelpText");
      if (!help) return;
      const src = migration.value;
      const docs = {
        MyFitnessPal: "Export your diary/history CSV in MyFitnessPal, then use Data Studio -> food_logs import.",
        Hevy: "Export workout CSV from Hevy, then use Data Studio -> workouts or strength_sets import.",
        Strong: "Export CSV from Strong settings, then use Program Importer for routines and planned sets.",
        Strava: "Export activity CSV from Strava account tools, then use Data Studio -> cardios import.",
        Other: "Export CSV/JSON from your app, map columns in Data Studio importer, and preview before commit.",
      };
      help.textContent = docs[src] || "Choose a source to see migration steps.";
    });
  }
  const addGymBtn = $("addGymBtn");
  if (addGymBtn) {
    addGymBtn.addEventListener("click", () => {
      const input = $("newGymName");
      if (!input) return;
      const name = input.value.trim();
      if (!name) return;
      const gyms = new Set(settings.gyms || []);
      gyms.add(name);
      const next = { ...settings, gyms: Array.from(gyms) };
      updateSettings(next);
      localStorage.setItem(KEYS.settings, JSON.stringify(next));
      input.value = "";
      renderAdvancedSettings();
      showToast("Gym profile added");
    });
  }
  panel.querySelectorAll("[data-remove-gym]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const gym = btn.getAttribute("data-remove-gym") || "";
      const next = { ...settings, gyms: (settings.gyms || []).filter((g) => g !== gym) };
      updateSettings(next);
      localStorage.setItem(KEYS.settings, JSON.stringify(next));
      renderAdvancedSettings();
      showToast("Gym profile removed");
    });
  });

  const backupNowBtn = $("runBackupNowBtn");
  if (backupNowBtn) {
    backupNowBtn.addEventListener("click", () => {
      if (typeof createBackupSnapshot === "function") {
        const result = createBackupSnapshot({ download: true, reason: "manual" });
        if (result && result.ok) {
          const next = { ...settings, autoBackupLastRunAt: Date.now() };
          updateSettings(next);
          localStorage.setItem(KEYS.settings, JSON.stringify(next));
          renderAdvancedSettings();
          showToast("Backup snapshot created", "success");
        } else {
          showToast("Backup failed", "error");
        }
      } else {
        showToast("Backup tools are loading", "info");
      }
    });
  }

  const installBtn = $("triggerPwaInstallBtn");
  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (typeof window.promptPwaInstall === "function") {
        const result = await window.promptPwaInstall();
        if (result && result.installed) showToast("App installed", "success");
        else if (result && result.dismissed) showToast("Install prompt dismissed", "info");
        else showToast("Install prompt unavailable", "warning");
      } else {
        showToast("Install prompt unavailable on this device", "warning");
      }
    });
  }

  const updateBtn = $("checkPwaUpdateBtn");
  if (updateBtn) {
    updateBtn.addEventListener("click", async () => {
      if (typeof window.checkForAppUpdate === "function") {
        const result = await window.checkForAppUpdate();
        if (result && result.updated) showToast("Update ready. Reload to apply.", "success");
        else showToast("No update found", "info");
      } else {
        showToast("Update check is unavailable", "warning");
      }
    });
  }

  panel.querySelectorAll("[data-wearable-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const vendorId = btn.getAttribute("data-wearable-toggle") || "";
      if (!vendorId) return;
      if (isIntegrationEnabled(vendorId)) {
        disconnectVendor(vendorId);
        showToast("Wearable disconnected", "info");
      } else {
        const result = connectVendor(vendorId);
        if (result && result.connected) showToast(result.vendor + " connected", "success");
      }
      renderAdvancedSettings();
    });
  });

  panel.querySelectorAll("[data-wearable-sample]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const vendorId = btn.getAttribute("data-wearable-sample") || "";
      const result = importWearableSample(vendorId);
      if (result && result.imported) showToast("Sample wearable workout imported", "success");
      else showToast("Connect vendor first", "warning");
      renderAdvancedSettings();
    });
  });

  const createSyncCodeBtn = $("createPeerSyncCodeBtn");
  if (createSyncCodeBtn) {
    createSyncCodeBtn.addEventListener("click", async () => {
      const code = typeof createPeerSyncCode === "function" ? createPeerSyncCode() : "";
      if (!code) {
        showToast("Could not generate sync code", "error");
        return;
      }
      const input = $("peerSyncCodeInput");
      if (input) input.value = code;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(code);
          showToast("Sync code copied", "success");
        } catch {
          showToast("Sync code generated", "info");
        }
      } else {
        showToast("Sync code generated", "info");
      }
    });
  }

  const applySyncCodeBtn = $("applyPeerSyncCodeBtn");
  if (applySyncCodeBtn) {
    applySyncCodeBtn.addEventListener("click", () => {
      const input = $("peerSyncCodeInput");
      const code = input ? String(input.value || "").trim() : "";
      if (!code) {
        showToast("Paste a sync code first", "warning");
        return;
      }
      try {
        const result = applyPeerSyncCode(code, "merge");
        showToast("Peer sync applied", "success");
        if (result && result.applied) renderAdvancedSettings();
      } catch (err) {
        showToast("Sync code invalid: " + err.message, "error");
      }
    });
  }

  const testWebhookBtn = $("testWebhookBtn");
  if (testWebhookBtn) {
    testWebhookBtn.addEventListener("click", () => {
      emitWebhookEvent("test_ping", {
        ts: Date.now(),
        source: "settings",
        user: settings.displayName || "Athlete",
      }).then(() => showToast("Webhook test queued", "success"));
    });
  }

  const flushWebhookBtn = $("flushWebhookQueueBtn");
  if (flushWebhookBtn) {
    flushWebhookBtn.addEventListener("click", async () => {
      const result = await flushWebhookQueue();
      showToast("Webhook flush: " + (result.sent || 0) + " sent, " + (result.pending || 0) + " pending", "info");
      renderAdvancedSettings();
    });
  }

  const saveProfilesBtn = $("saveMacroProfilesBtn");
  if (saveProfilesBtn) {
    saveProfilesBtn.addEventListener("click", () => {
      const profiles = readMacroProfilesFromUI();
      if (!Object.keys(profiles).length) {
        showToast("No macro profiles found", "warning");
        return;
      }
      const next = { ...settings, goalMacroProfiles: profiles };
      updateSettings(next);
      localStorage.setItem(KEYS.settings, JSON.stringify(next));
      loadSettingsUI();
      showToast("Macro profiles saved", "success");
    });
  }

  panel.querySelectorAll("[data-apply-goal-profile]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const profiles = readMacroProfilesFromUI();
      if (Object.keys(profiles).length) {
        const merged = { ...settings, goalMacroProfiles: profiles };
        updateSettings(merged);
        localStorage.setItem(KEYS.settings, JSON.stringify(merged));
      }
      const profile = btn.getAttribute("data-apply-goal-profile") || "training";
      applyCompeteGoalProfile(profile);
    });
  });
}

function initSettingsEvents() {
  $("settingTheme").addEventListener("change", toggleTheme);
  ["settingCalorieGoal", "settingProteinGoal", "settingCarbsGoal", "settingFatGoal", "settingWorkoutGoal", "settingWaterGoal", "settingDisplayName", "settingBio", "settingMeasureUnit", "settingStreakActiveRule", "settingStreakFreezePerWeek"].forEach((id) => {
    $(id).addEventListener("change", saveSettingsFromUI);
  });

  const goalProfileSelect = $("settingGoalDayProfile");
  if (goalProfileSelect) {
    goalProfileSelect.addEventListener("change", () => {
      const profile = normalizeGoalDayProfile(goalProfileSelect.value);
      if ((settings.bodyGoal || "maintain") === "compete") {
        applyCompeteGoalProfile(profile);
      } else {
        saveSettingsFromUI();
      }
    });
  }
  const weightUnitSegmented = $("weightUnitSegmented");
  if (weightUnitSegmented) {
    weightUnitSegmented.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-weight-unit]");
      if (!btn) return;
      const unit = btn.getAttribute("data-weight-unit") || "kg";
      if ($("settingWeightUnit")) $("settingWeightUnit").value = unit;
      setSegmentedActive("weightUnitSegmented", ".segmented-btn", unit);
      saveSettingsFromUI();
    });
  }

  const plateSegmented = $("plateSystemSegmented");
  if (plateSegmented) {
    plateSegmented.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-plate-system]");
      if (!btn) return;
      const val = btn.getAttribute("data-plate-system") || "kg";
      if ($("settingPlateSystem")) $("settingPlateSystem").value = val;
      setSegmentedActive("plateSystemSegmented", ".segmented-btn", val);
      updatePlateSystemSubtitle();
      saveSettingsFromUI();
    });
  }

  ["settingRestTimeRange", "settingRestCompoundRange", "settingRestIsolationRange"].forEach((id) => {
    const range = $(id);
    if (!range) return;
    range.addEventListener("input", updateRestTimeDisplay);
    range.addEventListener("change", saveSettingsFromUI);
  });

  const pushPulse = $("settingPushPulse");
  if (pushPulse) {
    pushPulse.addEventListener("change", () => {
      saveSettingsFromUI();
      requestPushPermissionIfNeeded();
    });
  }

  ["settingAutoLock", "settingAutoLockActiveOnly", "settingAutoAdvance", "settingFocusMode", "settingVoiceCountdown", "settingStreakRestProtection"].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("change", saveSettingsFromUI);
  });

  const saveWorkoutBtn = $("workoutSettingsSaveBtn");
  if (saveWorkoutBtn) saveWorkoutBtn.addEventListener("click", saveWorkoutSettingsSection);
  const resetWorkoutBtn = $("workoutSettingsResetBtn");
  if (resetWorkoutBtn) resetWorkoutBtn.addEventListener("click", resetWorkoutSettingsSection);

  const syncGoalBtn = $("settingSyncGoalToTDEEBtn");
  if (syncGoalBtn) {
    syncGoalBtn.addEventListener("click", syncGoalsToTDEE);
  }

  const openDataBtn = $("openDataStudioBtn");
  if (openDataBtn) {
    openDataBtn.addEventListener("click", () => {
      if (typeof activateMainTab === "function") activateMainTab("data");
    });
  }

  const clearBtn = $("settingsClearAllDataBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (typeof clearAllData === "function") {
        clearAllData();
      } else {
        showToast("Data Studio is still loading.", "info");
      }
    });
  }

  const avatarWrap = $("profileAvatarLarge");
  const avatarInput = $("avatarFileInput");
  if (avatarWrap && avatarInput) {
    avatarWrap.addEventListener("click", () => avatarInput.click());
    avatarInput.addEventListener("change", () => {
      const file = avatarInput.files && avatarInput.files[0];
      handleAvatarUpload(file);
      avatarInput.value = "";
    });
  }

  const goalSelector = $("bodyGoalSelector");
  if (goalSelector) {
    goalSelector.addEventListener("click", (e) => {
      const btn = e.target.closest(".goal-option");
      if (btn && btn.dataset.goal) selectBodyGoal(btn.dataset.goal);
    });
  }
  const panel = $("panel-settings");
  if (panel) {
    panel.addEventListener("change", (e) => {
      if (!e.target || !e.target.id) return;
      if (String(e.target.id).startsWith("setting") || e.target.id === "migrationSource") {
        bindDynamicSettingsEvents(panel);
      }
    });
  }
  bindDynamicSettingsEvents(panel);
  refreshGoalSyncStatus();
  refreshGoalProfileControls();
}
