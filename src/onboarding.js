// ========== ONBOARDING ==========
// Wireframe-oriented first-run wizard

function shouldShowOnboarding() {
  return !localStorage.getItem("ft_onboarding_complete") && !localStorage.getItem("ft_onboarding_done");
}

function completeOnboarding() {
  localStorage.setItem("ft_onboarding_complete", "1");
  localStorage.setItem("ft_onboarding_done", "1");
}

function showOnboardingWizard() {
  const mc = $("modalContainer");
  if (!mc) return;

  let step = 1;
  const totalSteps = 5;
  const data = {
    bodyGoal: settings.bodyGoal || "maintain",
    experienceLevel: settings.experienceLevel || "beginner",
    weightUnit: settings.weightUnit || "kg",
    measureUnit: settings.measureUnit || "cm",
    age: settings.age || "",
    weight: "",
    height: settings.height || "",
    baselineBodyFat: "",
    baselineWaist: "",
    baselineChest: "",
    calorieGoal: settings.calorieGoal || 2000,
    proteinGoal: settings.proteinGoal || 150,
    carbsGoal: settings.carbsGoal || 250,
    fatGoal: settings.fatGoal || 65,
    workoutGoal: settings.workoutGoal || 4,
    waterGoal: settings.waterGoal || 2000,
  };

  const goalPresets = {
    lose: { cal: 1850, pro: 170, carb: 185, fat: 60 },
    maintain: { cal: 2200, pro: 150, carb: 250, fat: 70 },
    gain: { cal: 2700, pro: 180, carb: 320, fat: 80 },
    compete: { cal: 2100, pro: 190, carb: 210, fat: 62 },
  };
  let presetsHydrated = false;

  function renderStepWelcome() {
    return (
      '<div class="onboard-step onboard-step-intro">' +
        '<div class="onboard-step-count">STEP 01 / 05</div>' +
        '<h2 class="onboard-display-title">Calibrate Your Kinetic Profile</h2>' +
        '<p class="onboard-display-subtitle">This setup takes under 60 seconds. We will tune your dashboard, goals, and training intelligence for your level.</p>' +
        '<div class="onboard-intro-grid">' +
          '<div class="onboard-intro-item"><span class="material-symbols-outlined">bolt</span><div><strong>Precision First</strong><p>Experience tuned analytics from day one.</p></div></div>' +
          '<div class="onboard-intro-item"><span class="material-symbols-outlined">shield_lock</span><div><strong>100% Local</strong><p>Your data never leaves your device.</p></div></div>' +
          '<div class="onboard-intro-item"><span class="material-symbols-outlined">stadia_controller</span><div><strong>Beginner to Pro</strong><p>Guidance scales with your performance level.</p></div></div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderStepGoal() {
    const goals = [
      { key: "lose", title: "WEIGHT LOSS", icon: "monitor_weight", desc: "Optimize metabolic output and reduce excess body mass with precision." },
      { key: "gain", title: "MUSCLE GAIN", icon: "fitness_center", desc: "Hypertrophy-focused training to maximize structural density and power." },
      { key: "maintain", title: "MAINTENANCE", icon: "balance", desc: "Sustain current biomechanical state while refining movement quality." },
      { key: "compete", title: "COMPETE", icon: "military_tech", desc: "Prep with stage-focused nutrition profiles and fatigue-managed progression blocks." },
    ];
    return (
      '<div class="onboard-step">' +
        '<div class="onboard-step-count">STEP 02 / 05</div>' +
        '<h2 class="onboard-display-title">DEFINE YOUR <span>KINETIC EDGE</span></h2>' +
        '<p class="onboard-display-subtitle">SELECT YOUR PRIMARY FOCUS</p>' +
        '<div class="onboard-goal-grid" id="obGoalGrid">' +
          goals
            .map((g) => {
              const active = data.bodyGoal === g.key;
              return (
                '<button class="onboard-goal-card' + (active ? ' active' : '') + '" data-goal="' + g.key + '">' +
                  '<div class="onboard-goal-icon"><span class="material-symbols-outlined">' + g.icon + '</span></div>' +
                  '<div class="onboard-goal-title">' + g.title + '</div>' +
                  '<div class="onboard-goal-desc">' + g.desc + '</div>' +
                  '<span class="onboard-goal-check material-symbols-outlined">check_circle</span>' +
                '</button>'
              );
            })
            .join("") +
        '</div>' +
      '</div>'
    );
  }

  function renderStepProfile() {
    const levelOptions = ["beginner", "intermediate", "advanced", "competitor"];
    return (
      '<div class="onboard-step">' +
        '<div class="onboard-step-count">STEP 03 / 05</div>' +
        '<h2 class="onboard-display-title">Establish Your <span>Performance Baseline</span></h2>' +
        '<p class="onboard-display-subtitle">Input your biometric data to calibrate the kinetic engine for maximum precision.</p>' +
        '<div class="onboard-metric-grid">' +
          '<label class="onboard-metric-field"><span>AGE</span><div><input type="number" id="obAge" min="10" max="99" value="' + escAttr(String(data.age || "")) + '" placeholder="25"><em>YRS</em></div></label>' +
          '<label class="onboard-metric-field"><span>WEIGHT</span><div><input type="number" id="obWeight" min="20" max="400" step="0.1" value="' + escAttr(String(data.weight || "")) + '" placeholder="72"><em>' + esc(data.weightUnit.toUpperCase()) + '</em></div></label>' +
          '<label class="onboard-metric-field"><span>HEIGHT</span><div><input type="number" id="obHeight" min="80" max="260" value="' + escAttr(String(data.height || "")) + '" placeholder="182"><em>' + esc(data.measureUnit.toUpperCase()) + '</em></div></label>' +
        '</div>' +
        '<div class="onboard-level-title">OPTIONAL STARTING MEASUREMENTS</div>' +
        '<div class="onboard-metric-grid">' +
          '<label class="onboard-metric-field"><span>BODY FAT</span><div><input type="number" id="obBodyFat" min="2" max="70" step="0.1" value="' + escAttr(String(data.baselineBodyFat || "")) + '" placeholder="18"><em>%</em></div></label>' +
          '<label class="onboard-metric-field"><span>WAIST</span><div><input type="number" id="obWaist" min="20" max="200" step="0.1" value="' + escAttr(String(data.baselineWaist || "")) + '" placeholder="80"><em>' + esc(data.measureUnit.toUpperCase()) + '</em></div></label>' +
          '<label class="onboard-metric-field"><span>CHEST</span><div><input type="number" id="obChest" min="20" max="200" step="0.1" value="' + escAttr(String(data.baselineChest || "")) + '" placeholder="100"><em>' + esc(data.measureUnit.toUpperCase()) + '</em></div></label>' +
        '</div>' +
        '<div class="onboard-level-title">EXPERIENCE LEVEL</div>' +
        '<div class="onboard-level-segment" id="obLevelSegment">' +
          levelOptions
            .map((lvl) => '<button class="onboard-level-btn' + (data.experienceLevel === lvl ? ' active' : '') + '" data-level="' + lvl + '">' + lvl.toUpperCase() + '</button>')
            .join("") +
        '</div>' +
        '<button class="btn btn-primary btn-block onboard-sync-btn" id="obSyncHealth"><span class="material-symbols-outlined">sync</span>SYNC HEALTH DATA</button>' +
        '<div class="onboard-sync-note">CONNECT APPLE HEALTH OR GOOGLE FIT</div>' +
      '</div>'
    );
  }

  function renderStepUnitsAndGoals() {
    return (
      '<div class="onboard-step">' +
        '<div class="onboard-step-count">STEP 04 / 05</div>' +
        '<h2 class="onboard-display-title">Tune Units & <span>Macro Targets</span></h2>' +
        '<p class="onboard-display-subtitle">Recommended values are based on your selected goal. You can adjust now or later in Profile.</p>' +
        '<div class="onboard-level-title">UNITS</div>' +
        '<div class="onboard-level-segment" id="obWeightUnitSegment">' +
          '<button class="onboard-level-btn' + (data.weightUnit === "kg" ? ' active' : '') + '" data-weight-unit="kg">KG</button>' +
          '<button class="onboard-level-btn' + (data.weightUnit === "lb" ? ' active' : '') + '" data-weight-unit="lb">LB</button>' +
        '</div>' +
        '<div class="onboard-level-segment" id="obMeasureUnitSegment" style="margin-top:8px">' +
          '<button class="onboard-level-btn' + (data.measureUnit === "cm" ? ' active' : '') + '" data-measure-unit="cm">CM</button>' +
          '<button class="onboard-level-btn' + (data.measureUnit === "in" ? ' active' : '') + '" data-measure-unit="in">IN</button>' +
        '</div>' +
        '<div class="onboard-level-title">SUGGESTED MACRO PROFILE</div>' +
        '<div class="onboard-metric-grid">' +
          '<label class="onboard-metric-field"><span>CALORIES</span><div><input type="number" id="obCalGoal" min="1000" max="6000" value="' + escAttr(String(data.calorieGoal || "")) + '"><em>KCAL</em></div></label>' +
          '<label class="onboard-metric-field"><span>PROTEIN</span><div><input type="number" id="obProGoal" min="30" max="450" value="' + escAttr(String(data.proteinGoal || "")) + '"><em>G</em></div></label>' +
          '<label class="onboard-metric-field"><span>CARBS</span><div><input type="number" id="obCarbGoal" min="20" max="700" value="' + escAttr(String(data.carbsGoal || "")) + '"><em>G</em></div></label>' +
          '<label class="onboard-metric-field"><span>FAT</span><div><input type="number" id="obFatGoal" min="10" max="250" value="' + escAttr(String(data.fatGoal || "")) + '"><em>G</em></div></label>' +
          '<label class="onboard-metric-field"><span>WATER</span><div><input type="number" id="obWaterGoal" min="500" max="7000" value="' + escAttr(String(data.waterGoal || "")) + '"><em>ML</em></div></label>' +
          '<label class="onboard-metric-field"><span>WORKOUT DAYS</span><div><input type="number" id="obWorkoutGoal" min="1" max="14" value="' + escAttr(String(data.workoutGoal || "")) + '"><em>/WK</em></div></label>' +
        '</div>' +
      '</div>'
    );
  }

  function renderStepConfirm() {
    return (
      '<div class="onboard-step onboard-step-intro">' +
        '<div class="onboard-step-count">STEP 05 / 05</div>' +
        '<h2 class="onboard-display-title">Final System Check</h2>' +
        '<p class="onboard-display-subtitle">Review your profile calibration. You can fine-tune every setting later in Profile.</p>' +
        '<div class="onboard-review-grid">' +
          '<div><span>Primary Goal</span><strong>' + data.bodyGoal.toUpperCase() + '</strong></div>' +
          '<div><span>Experience</span><strong>' + data.experienceLevel.toUpperCase() + '</strong></div>' +
          '<div><span>Units</span><strong>' + data.weightUnit.toUpperCase() + ' / ' + data.measureUnit.toUpperCase() + '</strong></div>' +
          '<div><span>Age</span><strong>' + (data.age || "—") + '</strong></div>' +
          '<div><span>Height</span><strong>' + (data.height || "—") + ' ' + data.measureUnit.toUpperCase() + '</strong></div>' +
          '<div><span>Start Weight</span><strong>' + (data.weight || "—") + ' ' + data.weightUnit.toUpperCase() + '</strong></div>' +
          '<div><span>Macros</span><strong>' + data.calorieGoal + ' kcal • P' + data.proteinGoal + ' C' + data.carbsGoal + ' F' + data.fatGoal + '</strong></div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderDots() {
    let html = '<div class="onboard-dots">';
    for (let i = 1; i <= totalSteps; i++) {
      html += '<span class="onboard-dot' + (i === step ? ' active' : '') + '"></span>';
    }
    html += '</div>';
    return html;
  }

  function render() {
    if (step === 4 && !presetsHydrated) {
      applyGoalPresets();
      presetsHydrated = true;
    }
    let body = "";
    if (step === 1) body = renderStepWelcome();
    if (step === 2) body = renderStepGoal();
    if (step === 3) body = renderStepProfile();
    if (step === 4) body = renderStepUnitsAndGoals();
    if (step === 5) body = renderStepConfirm();

    mc.innerHTML =
      '<div class="modal-overlay onboard-overlay">' +
        '<div class="modal onboard-modal onboard-shell">' +
          body +
          '<div class="onboard-nav">' +
            (step > 1 ? '<button class="btn btn-outline" id="obBack">Back</button>' : '<div></div>') +
            (step < totalSteps
              ? '<button class="btn btn-primary" id="obNext">Continue</button>'
              : '<button class="btn btn-primary" id="obFinish">Calibrate</button>') +
          '</div>' +
          renderDots() +
        '</div>' +
      '</div>';

    bindStepEvents();
  }

  function collectStepData() {
    if (step === 3) {
      if ($("obAge")) data.age = parseInt($("obAge").value, 10) || "";
      if ($("obWeight")) data.weight = $("obWeight").value;
      if ($("obHeight")) data.height = parseInt($("obHeight").value, 10) || "";
      if ($("obBodyFat")) data.baselineBodyFat = parseFloat($("obBodyFat").value) || "";
      if ($("obWaist")) data.baselineWaist = parseFloat($("obWaist").value) || "";
      if ($("obChest")) data.baselineChest = parseFloat($("obChest").value) || "";
      const levelBtn = document.querySelector(".onboard-level-btn.active");
      if (levelBtn) data.experienceLevel = levelBtn.dataset.level;
    }
    if (step === 4) {
      const weightUnitBtn = document.querySelector("#obWeightUnitSegment .onboard-level-btn.active");
      const measureUnitBtn = document.querySelector("#obMeasureUnitSegment .onboard-level-btn.active");
      if (weightUnitBtn) data.weightUnit = weightUnitBtn.dataset.weightUnit || data.weightUnit;
      if (measureUnitBtn) data.measureUnit = measureUnitBtn.dataset.measureUnit || data.measureUnit;
      if ($("obCalGoal")) data.calorieGoal = parseInt($("obCalGoal").value, 10) || data.calorieGoal;
      if ($("obProGoal")) data.proteinGoal = parseInt($("obProGoal").value, 10) || data.proteinGoal;
      if ($("obCarbGoal")) data.carbsGoal = parseInt($("obCarbGoal").value, 10) || data.carbsGoal;
      if ($("obFatGoal")) data.fatGoal = parseInt($("obFatGoal").value, 10) || data.fatGoal;
      if ($("obWorkoutGoal")) data.workoutGoal = parseInt($("obWorkoutGoal").value, 10) || data.workoutGoal;
      if ($("obWaterGoal")) data.waterGoal = parseInt($("obWaterGoal").value, 10) || data.waterGoal;
    }
  }

  function applyGoalPresets() {
    const preset = goalPresets[data.bodyGoal] || goalPresets.maintain;
    data.calorieGoal = preset.cal;
    data.proteinGoal = preset.pro;
    data.carbsGoal = preset.carb;
    data.fatGoal = preset.fat;
  }

  function playCompleteAnimation() {
    if (typeof triggerCelebration === "function") {
      triggerCelebration("Your Kinetic Profile is Calibrated");
      return;
    }
    for (let i = 0; i < 16; i++) {
      const p = document.createElement("div");
      p.className = "confetti-particle";
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = ["#8B5CF6", "#22D3EE", "#4ADE80", "#BA9EFF"][Math.floor(Math.random() * 4)];
      p.style.animationDuration = 1.2 + Math.random() + "s";
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 2200);
    }
  }

  function applyOnboarding() {
    const next = {
      ...settings,
      bodyGoal: data.bodyGoal,
      experienceLevel: data.experienceLevel,
      weightUnit: data.weightUnit,
      measureUnit: data.measureUnit,
      calorieGoal: data.calorieGoal,
      proteinGoal: data.proteinGoal,
      carbsGoal: data.carbsGoal,
      fatGoal: data.fatGoal,
      workoutGoal: data.workoutGoal,
      waterGoal: data.waterGoal,
      age: data.age,
      height: data.height,
    };

    updateSettings(next);
    localStorage.setItem(KEYS.settings, JSON.stringify(next));

    if (data.weight && parseFloat(data.weight) > 0) {
      const bodyData = loadData(KEYS.body);
      bodyData.push({
        id: uid(),
        date: today(),
        weight: parseFloat(data.weight),
        bodyFat: data.baselineBodyFat ? parseFloat(data.baselineBodyFat) : null,
        waist: data.baselineWaist ? parseFloat(data.baselineWaist) : null,
        chest: data.baselineChest ? parseFloat(data.baselineChest) : null,
        timestamp: Date.now(),
      });
      saveData(KEYS.body, bodyData);
    }

    completeOnboarding();
    playCompleteAnimation();
    showToast("Your Kinetic Profile is Calibrated");
    closeModal();
    loadSettingsUI();
    refreshToday();
    refreshLog();
    const app = $("app");
    if (app) app.classList.remove("app-hidden");
  }

  function bindStepEvents() {
    const back = $("obBack");
    const next = $("obNext");
    const finish = $("obFinish");
    const goalGrid = $("obGoalGrid");
    const levelSegment = $("obLevelSegment");
    const syncBtn = $("obSyncHealth");
    const weightSegment = $("obWeightUnitSegment");
    const measureSegment = $("obMeasureUnitSegment");

    if (back) {
      back.addEventListener("click", () => {
        collectStepData();
        step = Math.max(1, step - 1);
        render();
      });
    }

    if (next) {
      next.addEventListener("click", () => {
        collectStepData();
        step = Math.min(totalSteps, step + 1);
        render();
      });
    }

    if (finish) {
      finish.addEventListener("click", () => {
        collectStepData();
        applyOnboarding();
      });
    }

    if (goalGrid) {
      goalGrid.querySelectorAll(".onboard-goal-card").forEach((card) => {
        card.addEventListener("click", () => {
          data.bodyGoal = card.dataset.goal;
          goalGrid.querySelectorAll(".onboard-goal-card").forEach((c) => c.classList.remove("active"));
          card.classList.add("active");
        });
      });
    }

    if (levelSegment) {
      levelSegment.querySelectorAll(".onboard-level-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          data.experienceLevel = btn.dataset.level;
          levelSegment.querySelectorAll(".onboard-level-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
        });
      });
    }

    if (weightSegment) {
      weightSegment.querySelectorAll(".onboard-level-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          data.weightUnit = btn.dataset.weightUnit || data.weightUnit;
          weightSegment.querySelectorAll(".onboard-level-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
        });
      });
    }

    if (measureSegment) {
      measureSegment.querySelectorAll(".onboard-level-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          data.measureUnit = btn.dataset.measureUnit || data.measureUnit;
          measureSegment.querySelectorAll(".onboard-level-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
        });
      });
    }

    if (syncBtn) {
      syncBtn.addEventListener("click", () => {
        showToast("Sync integration coming soon", "info");
      });
    }
  }

  render();
}
