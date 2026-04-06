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

function updateRestTimeDisplay() {
  const display = $("settingRestTimeDisplay");
  const hidden = $("settingRestTime");
  const range = $("settingRestTimeRange");
  const value = Number((range && range.value) || (hidden && hidden.value) || settings.defaultRestTime || 90);
  if (hidden) hidden.value = String(value);
  if (display) display.textContent = value + "s";
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

function buildSettingsPayload() {
  const gymItems = Array.from(document.querySelectorAll("#gymList .gym-chip"))
    .map((el) => (el.getAttribute("data-gym") || "").trim())
    .filter(Boolean);
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
    plateSystem: normalizePlateSystem(settingVal("settingPlateSystem", "kg")),
    autoLock: settingBool("settingAutoLock", true),
    autoAdvance: settingBool("settingAutoAdvance", true),
    focusMode: settingBool("settingFocusMode", false),
    voiceCountdown: settingBool("settingVoiceCountdown", false),
    pushNotifications: settingBool("settingPushPulse", false),
    autoLockActiveOnly: settingBool("settingAutoLockActiveOnly", true),
    emailSummaries: false,
    measureUnit: settingVal("settingMeasureUnit", "cm"),
    darkMode: settingBool("settingTheme", true),
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
    gyms: gymItems,
  };
}

function toggleTheme() {
  const newSettings = buildSettingsPayload();
  updateSettings(newSettings);
  document.documentElement.setAttribute("data-theme", newSettings.darkMode ? "" : "light");
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.content = newSettings.darkMode ? "#6C63FF" : "#4F46E5";
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
  updateBodyLabels();
  renderAdvancedSettings();
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
    diagnostics.innerHTML =
      '<div class="card-title">Offline & Storage Diagnostics</div>' +
      '<div class="text-sm">Network status: <strong>' + online + "</strong></div>" +
      '<div class="text-sm mt-8">Service worker: <span id="swStatusText">Checking...</span></div>' +
      '<div class="text-sm mt-8">Local data size estimate: <strong>' + localSize + " bytes</strong></div>" +
      '<div class="text-xs mt-8">External sync queue: ' + queuedOps + ' pending (local-only mode).</div>';
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration("/FitOne/").then((reg) => {
        const el = $("swStatusText");
        if (!el) return;
        if (!reg) el.textContent = "Not registered";
        else if (reg.active) el.textContent = "Registered and active";
        else el.textContent = "Registered (inactive)";
      });
    } else if ($("swStatusText")) {
      $("swStatusText").textContent = "Unsupported";
    }
  }

  const telemetry = loadUXTelemetry();
  const uxDiag = $("settingsUXDiagnosticsCard");
  if (uxDiag) {
    uxDiag.innerHTML =
      '<div class="card-title">UX Diagnostics</div>' +
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
    wearables.innerHTML =
      '<div class="card-title">Wearables & Integrations</div>' +
      '<p class="text-sm">FitOne works fully without any wearables. Future optional integrations will appear here.</p>' +
      '<div class="text-xs mt-8">Supported vendors now: ' + listSupportedVendors().length + "</div>" + integrationsHidden;
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
    social.innerHTML =
      '<div class="card-title">Social (Opt-in)</div>' +
      '<div class="toggle-row"><span>Enable social mock features</span><label class="toggle"><input type="checkbox" id="settingSocialEnabled"' + (settings.socialEnabled ? " checked" : "") + '><span class="toggle-slider"></span></label></div>' +
      (settings.socialEnabled
        ? '<div class="text-xs mt-8">Mock view: future sharing could include anonymized protocol summaries and milestones (local preview only).</div>'
        : '<div class="text-xs mt-8">Social UI stays hidden by default.</div>');
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
      '<div class="text-xs mt-8">Monetization ledger</div><ul class="text-xs mt-8">' + (ledger || "<li>No entries</li>") + "</ul>";
  }
  bindDynamicSettingsEvents($("panel-settings"));
}

function loadSettingsUI() {
  $("settingCalorieGoal").value = settings.calorieGoal;
  $("settingProteinGoal").value = settings.proteinGoal;
  $("settingCarbsGoal").value = settings.carbsGoal;
  $("settingFatGoal").value = settings.fatGoal;
  $("settingWorkoutGoal").value = settings.workoutGoal;
  $("settingWaterGoal").value = settings.waterGoal || 2000;
  $("settingWeightUnit").value = settings.weightUnit;
  $("settingMeasureUnit").value = settings.measureUnit;
  if ($("settingDisplayName")) $("settingDisplayName").value = settings.displayName || "";
  if ($("settingBio")) $("settingBio").value = settings.bio || "";
  if ($("settingPushPulse")) $("settingPushPulse").checked = !!settings.pushNotifications;
  if ($("settingRestTimeRange")) $("settingRestTimeRange").value = String(settings.defaultRestTime || 90);
  if ($("settingRestTime")) $("settingRestTime").value = String(settings.defaultRestTime || 90);
  if ($("settingPlateSystem")) $("settingPlateSystem").value = normalizePlateSystem(settings.plateSystem || "kg");
  if ($("settingAutoLock")) $("settingAutoLock").checked = !!settings.autoLock;
  if ($("settingAutoLockActiveOnly")) $("settingAutoLockActiveOnly").checked = settings.autoLockActiveOnly !== false;
  if ($("settingAutoAdvance")) $("settingAutoAdvance").checked = !!settings.autoAdvance;
  if ($("settingFocusMode")) $("settingFocusMode").checked = !!settings.focusMode;
  if ($("settingVoiceCountdown")) $("settingVoiceCountdown").checked = !!settings.voiceCountdown;
  $("settingTheme").checked = settings.darkMode;
  document.documentElement.setAttribute("data-theme", settings.darkMode ? "" : "light");
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.content = settings.darkMode ? "#6C63FF" : "#4F46E5";
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
}

function selectBodyGoal(goal) {
  const newSettings = { ...settings, bodyGoal: goal };
  updateSettings(newSettings);
  document.querySelectorAll(".goal-option").forEach((b) => {
    b.classList.toggle("active", b.dataset.goal === goal);
  });
  saveSettingsFromUI();
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
  ].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("change", saveSettingsFromUI);
  });
  const notes = $("settingMonetizationNotes");
  if (notes) notes.addEventListener("change", saveSettingsFromUI);
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
}

function initSettingsEvents() {
  $("settingTheme").addEventListener("change", toggleTheme);
  ["settingCalorieGoal", "settingProteinGoal", "settingCarbsGoal", "settingFatGoal", "settingWorkoutGoal", "settingWaterGoal", "settingDisplayName", "settingBio", "settingMeasureUnit"].forEach((id) => {
    $(id).addEventListener("change", saveSettingsFromUI);
  });
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

  const restRange = $("settingRestTimeRange");
  if (restRange) {
    restRange.addEventListener("input", updateRestTimeDisplay);
    restRange.addEventListener("change", saveSettingsFromUI);
  }

  const pushPulse = $("settingPushPulse");
  if (pushPulse) {
    pushPulse.addEventListener("change", () => {
      saveSettingsFromUI();
      requestPushPermissionIfNeeded();
    });
  }

  ["settingAutoLock", "settingAutoLockActiveOnly", "settingAutoAdvance", "settingFocusMode", "settingVoiceCountdown"].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("change", saveSettingsFromUI);
  });

  const saveWorkoutBtn = $("workoutSettingsSaveBtn");
  if (saveWorkoutBtn) saveWorkoutBtn.addEventListener("click", saveWorkoutSettingsSection);
  const resetWorkoutBtn = $("workoutSettingsResetBtn");
  if (resetWorkoutBtn) resetWorkoutBtn.addEventListener("click", resetWorkoutSettingsSection);

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
}
