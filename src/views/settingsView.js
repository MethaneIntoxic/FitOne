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
  if (tc) tc.content = newSettings.darkMode ? "#6366f1" : "#4f46e5";
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
  $("settingTheme").checked = settings.darkMode;
  document.documentElement.setAttribute("data-theme", settings.darkMode ? "" : "light");
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.content = settings.darkMode ? "#6366f1" : "#4f46e5";
  updateBodyLabels();
  document.querySelectorAll(".goal-option").forEach((b) => {
    b.classList.toggle("active", b.dataset.goal === (settings.bodyGoal || "maintain"));
  });
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
  ["settingCalorieGoal", "settingProteinGoal", "settingCarbsGoal", "settingFatGoal", "settingWorkoutGoal", "settingWaterGoal"].forEach((id) => {
    $(id).addEventListener("change", saveSettingsFromUI);
  });
  $("settingWeightUnit").addEventListener("change", saveSettingsFromUI);
  $("settingMeasureUnit").addEventListener("change", saveSettingsFromUI);
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
