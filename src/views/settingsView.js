// ========== SETTINGS VIEW ==========


// ========== THEME ==========
function toggleTheme() {
  const newSettings = { ...settings, darkMode: $("settingTheme").checked };
  updateSettings(newSettings);
  document.documentElement.setAttribute("data-theme", newSettings.darkMode ? "" : "light");
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.content = newSettings.darkMode ? "#0f1117" : "#f5f5f7";
  saveSettingsFromUI();
}

// ========== SAVE SETTINGS ==========
function saveSettingsFromUI() {
  const newSettings = {
    calorieGoal: parseInt($("settingCalorieGoal").value) || 2000,
    proteinGoal: parseInt($("settingProteinGoal").value) || 150,
    carbsGoal: parseInt($("settingCarbsGoal").value) || 250,
    fatGoal: parseInt($("settingFatGoal").value) || 65,
    workoutGoal: parseInt($("settingWorkoutGoal").value) || 4,
    waterGoal: parseInt($("settingWaterGoal").value) || 2000,
    weightUnit: $("settingWeightUnit").value,
    measureUnit: $("settingMeasureUnit").value,
    darkMode: $("settingTheme").checked,
    bodyGoal: settings.bodyGoal || "maintain",
  };
  updateSettings(newSettings);
  localStorage.setItem(KEYS.settings, JSON.stringify(newSettings));
  updateBodyLabels();
  const activeTab = document.querySelector(".tab-btn.active");
  if (activeTab) {
    // Trigger the tab's refresh callback (registered in main.js)
    if (window._refreshCurrentTab) window._refreshCurrentTab(activeTab.dataset.tab);
  }
}

// ========== LOAD SETTINGS UI ==========
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
  if (tc) tc.content = settings.darkMode ? "#0f1117" : "#f5f5f7";
  updateBodyLabels();
  // Body goal selector
  const goalBtns = document.querySelectorAll(".goal-option");
  goalBtns.forEach((b) => {
    b.classList.toggle("active", b.dataset.goal === (settings.bodyGoal || "maintain"));
  });
}

// ========== BODY GOAL ==========
function selectBodyGoal(goal) {
  const newSettings = { ...settings, bodyGoal: goal };
  updateSettings(newSettings);
  document.querySelectorAll(".goal-option").forEach((b) => {
    b.classList.toggle("active", b.dataset.goal === goal);
  });
  saveSettingsFromUI();
  showToast("Body goal set to " + goal);
}

// ========== BODY LABELS ==========
function updateBodyLabels() {
  const wu = settings.weightUnit;
  const mu = settings.measureUnit;
  if ($("bodyWeightLabel")) $("bodyWeightLabel").textContent = "Weight (" + wu + ")";
  if ($("bodyWaistLabel")) $("bodyWaistLabel").textContent = "Waist (" + mu + ")";
  if ($("bodyChestLabel")) $("bodyChestLabel").textContent = "Chest (" + mu + ")";
  if ($("bodyArmsLabel")) $("bodyArmsLabel").textContent = "Arms (" + mu + ")";
  if ($("bodyLegsLabel")) $("bodyLegsLabel").textContent = "Legs (" + mu + ")";
}

// ========== EVENT BINDING ==========
function initSettingsEvents() {
  // Theme toggle
  $("settingTheme").addEventListener("change", toggleTheme);

  // Goal inputs
  ["settingCalorieGoal", "settingProteinGoal", "settingCarbsGoal", "settingFatGoal", "settingWorkoutGoal", "settingWaterGoal"].forEach((id) => {
    $(id).addEventListener("change", saveSettingsFromUI);
  });

  // Unit selects
  $("settingWeightUnit").addEventListener("change", saveSettingsFromUI);
  $("settingMeasureUnit").addEventListener("change", saveSettingsFromUI);

  // Body goal selector
  const goalSelector = $("bodyGoalSelector");
  if (goalSelector) {
    goalSelector.addEventListener("click", (e) => {
      const btn = e.target.closest(".goal-option");
      if (btn && btn.dataset.goal) selectBodyGoal(btn.dataset.goal);
    });
  }
}
