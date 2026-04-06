// ========== LOG VIEW ==========
// Food, workout, body logging and recent lists


let exerciseRowCount = 0;

function getGymOptions() {
  return (settings.gyms || []).map((g) => '<option value="' + escAttr(g) + '">' + esc(g) + "</option>").join("");
}

function getSetupSelectOptions(exerciseName) {
  const setups = getMachineSetupsByExercise(exerciseName);
  const opts = setups.map((s) => {
    const label = (s.gymName || "Gym") + " • " + (s.notes || "").slice(0, 42);
    return '<option value="' + escAttr(s.id) + '">' + esc(label) + "</option>";
  });
  return ['<option value="">Last setup suggestion</option>'].concat(opts).join("");
}

function bindExerciseInputShortcuts(row) {
  const numberInputs = row.querySelectorAll('input[type="number"]');
  Array.from(numberInputs).forEach((input) => {
    input.addEventListener("keydown", (e) => {
      const fields = Array.from(row.querySelectorAll('input[type="number"]')).filter((el) => el.offsetParent !== null);
      const idx = fields.indexOf(input);
      if (e.key === "Enter") {
        e.preventDefault();
        const next = fields[idx + 1];
        if (next) next.focus();
        else logWorkout();
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const step = input.id.includes("wt_") || input.id.includes("targetwt_") ? 2.5 : 1;
        const sign = e.key === "ArrowUp" ? 1 : -1;
        const val = Number(input.value || 0) + sign * step;
        input.value = String(Math.max(0, Math.round(val * 10) / 10));
        e.preventDefault();
      }
    });
  });

  let startX = 0;
  row.addEventListener("touchstart", (e) => {
    startX = e.changedTouches[0].clientX;
  }, { passive: true });
  row.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (dx > 70) {
      const prev = row.previousElementSibling;
      if (prev) {
        const prevName = prev.querySelector('[id^="exname_"]');
        const thisName = row.querySelector('[id^="exname_"]');
        const prevSets = prev.querySelector('[id^="exsets_"]');
        const thisSets = row.querySelector('[id^="exsets_"]');
        const prevReps = prev.querySelector('[id^="exreps_"]');
        const thisReps = row.querySelector('[id^="exreps_"]');
        const prevWt = prev.querySelector('[id^="exwt_"]');
        const thisWt = row.querySelector('[id^="exwt_"]');
        if (thisName && prevName) thisName.value = prevName.value;
        if (thisSets && prevSets) thisSets.value = prevSets.value;
        if (thisReps && prevReps) thisReps.value = prevReps.value;
        if (thisWt && prevWt) thisWt.value = prevWt.value;
        showToast("Set duplicated");
      }
    } else if (dx < -70) {
      showConfirmModal("Delete set row", "🧹", "Delete this set row?", () => {
        row.remove();
        trackUXTelemetry("logging.deletedEntryImmediately");
      });
    }
  }, { passive: true });
}

function renderTargetChip(exercise) {
  const targets = [];
  if (exercise.targetReps) targets.push("reps " + exercise.targetReps);
  if (exercise.targetWeight) targets.push("wt " + exercise.targetWeight);
  if (exercise.targetRPE) targets.push("RPE " + exercise.targetRPE);
  if (!targets.length) return "";
  let cls = "target-match";
  if ((exercise.reps || 0) < (exercise.targetReps || 0) || (exercise.weight || 0) < (exercise.targetWeight || 0)) cls = "target-below";
  else if ((exercise.reps || 0) > (exercise.targetReps || 0) || (exercise.weight || 0) > (exercise.targetWeight || 0)) cls = "target-above";
  return '<div class="target-chip ' + cls + '">Target: ' + targets.join(" • ") + "</div>";
}

function notifyDataChangedFromLog(reason) {
  if (typeof window.notifyDataChanged === "function") {
    window.notifyDataChanged({ source: "log", reason: reason || "mutation" });
    return;
  }
  refreshLog();
  refreshToday();
}

function getExerciseRowHtml(index, seed, planned) {
  const ex = seed || {};
  const ps = planned || {};
  return '' +
    '<div class="form-group dense-col-4"><input type="text" placeholder="Exercise name" id="exname_' + index + '" value="' + escAttr(ex.name || "") + '"></div>' +
    '<button class="btn btn-outline btn-sm dense-col-1" onclick="if(typeof showExerciseDetailModal === \'function\') showExerciseDetailModal($(\'exname_' + index + '\').value)" aria-label="Exercise info" title="View Details" style="font-size:16px;padding:0">ℹ️</button>' +
    '<div class="form-group dense-col-2"><input type="number" placeholder="Sets" id="exsets_' + index + '" value="' + (ex.sets || "") + '"></div>' +
    '<div class="form-group dense-col-2"><input type="number" placeholder="Reps" id="exreps_' + index + '" value="' + (ex.reps || "") + '"></div>' +
    '<div class="form-group dense-col-2"><input type="number" placeholder="Wt" id="exwt_' + index + '" value="' + (ex.weight || "") + '"></div>' +
    '<button class="btn btn-outline btn-sm dense-col-1" data-remove-row aria-label="Remove exercise row">✕</button>' +
    '<div class="dense-col-12 exercise-advanced-toggle-wrap" style="display:flex; justify-content:space-between; align-items:center;">' +
      '<button class="btn btn-outline btn-sm exercise-advanced-toggle" data-action="toggle-ex-advanced" aria-expanded="false">Advanced targets & setup</button>' +
      '<button class="btn btn-primary btn-sm" onclick="startTimer(settings.defaultRestTime || 60, $(\'exname_' + index + '\').value)" style="border-radius:20px; padding:2px 12px; font-size:11px;">⏱️ Rest</button>' +
    '</div>' +
    '<div class="dense-col-12 exercise-advanced hidden" id="exadv_' + index + '">' +
      '<div class="stat-row stat-row-dense exercise-advanced-grid">' +
        '<div class="form-group dense-col-2"><input type="number" placeholder="RPE" id="exrpe_' + index + '" value="' + (ex.rpe || ps.targetRPE || "") + '"></div>' +
        '<div class="form-group dense-col-2"><input type="number" placeholder="T.Reps" id="extargetreps_' + index + '" value="' + (ex.targetReps || ps.targetReps || "") + '"></div>' +
        '<div class="form-group dense-col-2"><input type="number" placeholder="T.Wt" id="extargetwt_' + index + '" value="' + (ex.targetWeight || ps.targetWeight || "") + '"></div>' +
        '<div class="form-group dense-col-2"><input type="number" placeholder="T.RPE" id="extargetrpe_' + index + '" value="' + (ex.targetRPE || ps.targetRPE || "") + '"></div>' +
        '<div class="form-group dense-col-3" style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="exassist_' + index + '" style="width:auto"' + (ex.isAssistedBodyweight ? " checked" : "") + '><label for="exassist_' + index + '" class="text-xs">Assisted</label></div>' +
        '<div class="form-group dense-col-3"><select id="exgym_' + index + '"><option value="">Gym (optional)</option>' + getGymOptions() + '</select></div>' +
        '<div class="form-group dense-col-3"><select id="exsetup_' + index + '">' + getSetupSelectOptions(ex.name || "") + '</select></div>' +
        '<div class="form-group dense-col-6"><input type="text" placeholder="Machine setup notes (seat/pin/grip)" id="exsetupnotes_' + index + '" value="' + escAttr(ex.machineSetupNotes || "") + '"></div>' +
      '</div>' +
    '</div>';
}

function bindExerciseRowAdvancedToggle(row, index) {
  const toggleBtn = row.querySelector('[data-action="toggle-ex-advanced"]');
  const advanced = $("exadv_" + index);
  if (!toggleBtn || !advanced) return;
  toggleBtn.addEventListener("click", () => {
    const isHidden = advanced.classList.contains("hidden");
    advanced.classList.toggle("hidden", !isHidden);
    toggleBtn.setAttribute("aria-expanded", isHidden ? "true" : "false");
    toggleBtn.textContent = isHidden ? "Hide advanced" : "Advanced targets & setup";
  });
}

function bindExerciseRowSetupHandlers(index) {
  const nameInput = $("exname_" + index);
  if (nameInput) {
    nameInput.addEventListener("change", () => {
      const setupSel = $("exsetup_" + index);
      if (setupSel) setupSel.innerHTML = getSetupSelectOptions(nameInput.value);
    });
  }
  const setupSel = $("exsetup_" + index);
  if (setupSel) {
    setupSel.addEventListener("change", () => {
      const setupId = setupSel.value;
      if (!setupId) return;
      const setup = loadData(KEYS.machineSetups).find((s) => s.id === setupId);
      const notes = $("exsetupnotes_" + index);
      if (setup && notes) notes.value = setup.notes || "";
    });
  }
}

// ========== FAVORITES ==========
function refreshFavorites() {
  const favs = loadData(KEYS.favorites);
  const card = $("favoritesCard");
  if (!favs.length) {
    card.classList.add("hidden");
    return;
  }
  card.classList.remove("hidden");
  $("favoritesList").innerHTML = favs
    .map(
      (f) =>
        '<span class="fav-chip" data-fav-id="' + f.id + '">' +
        esc(f.name) +
        ' <span class="fav-chip-cal">' + f.calories + 'cal</span>' +
        '<button class="fav-chip-remove" data-remove-fav="' + f.id + '" title="Remove">✕</button></span>'
    )
    .join("");
}

function saveFavorite(entry) {
  const favs = loadData(KEYS.favorites);
  const fav = {
    id: uid(), name: entry.name, calories: entry.calories, protein: entry.protein,
    carbs: entry.carbs, fat: entry.fat, serving: entry.serving, meal: entry.meal,
  };
  favs.push(fav);
  saveData(KEYS.favorites, favs);
}

function removeFavorite(id) {
  const favs = loadData(KEYS.favorites).filter((f) => f.id !== id);
  saveData(KEYS.favorites, favs);
  refreshFavorites();
  showToast("Favorite removed");
}

function quickAddFavorite(id) {
  const fav = loadData(KEYS.favorites).find((f) => f.id === id);
  if (!fav) return;
  const entry = {
    id: uid(), date: today(), name: fav.name, calories: fav.calories || 0,
    protein: fav.protein || 0, carbs: fav.carbs || 0, fat: fav.fat || 0,
    serving: fav.serving || "", meal: fav.meal || "snack", timestamp: Date.now(),
  };
  const data = loadData(KEYS.food);
  data.push(entry);
  saveData(KEYS.food, data);
  notifyDataChangedFromLog("quickAddFavorite");
  showToast(esc(fav.name) + " added! ⭐");
}

// ========== LOG FOOD ==========
function logFood() {
  clearFormErrors();
  const name = $("foodName").value.trim();
  if (!name) { showFormError("foodName", "foodNameError"); return; }
  const cal = parseInt($("foodCalories").value) || 0;
  const pro = parseInt($("foodProtein").value) || 0;
  const carb = parseInt($("foodCarbs").value) || 0;
  const fat = parseInt($("foodFat").value) || 0;
  if (cal < 0 || pro < 0 || carb < 0 || fat < 0) { showToast("Values cannot be negative", "error"); return; }

  const date = $("foodDate").value || today();
  const editId = $("foodEditId").value;

  const entry = {
    id: editId || uid(), date, name,
    calories: cal || Math.round(pro * 4 + carb * 4 + fat * 9),
    protein: pro, carbs: carb, fat,
    serving: $("foodServing").value.trim(),
    meal: $("foodMeal").value,
    timestamp: Date.now(),
  };

  const data = loadData(KEYS.food);
  if (editId) {
    const idx = data.findIndex((f) => f.id === editId);
    if (idx >= 0) data[idx] = entry;
    cancelEditFood();
    showToast("Food updated! ✏️");
  } else {
    data.push(entry);
    if ($("foodFavorite").checked) {
      saveFavorite(entry);
      $("foodFavorite").checked = false;
    }
    showToast("Food logged! 🍎");
  }
  saveData(KEYS.food, data);
  ["foodName", "foodCalories", "foodProtein", "foodCarbs", "foodFat", "foodServing"].forEach((id) => ($(id).value = ""));
  $("foodDate").value = today();
  $("foodCalories").dataset.manualEntry = "";
  refreshCalorieGuidance();
  const card = $("foodFormCard");
  if (card) { card.classList.add("log-success"); setTimeout(() => card.classList.remove("log-success"), 600); }
  notifyDataChangedFromLog("logFood");
  setTimeout(() => { if ($("foodName")) $("foodName").focus(); }, 300);
}

function clearTodayFood() {
  showConfirmModal("Clear Today's Food", "⚠️", "This will remove all food entries for today. You can always log them again.", () => {
    const data = loadData(KEYS.food).filter((f) => f.date !== today());
    saveData(KEYS.food, data);
    notifyDataChangedFromLog("clearTodayFood");
    showToast("Today's food cleared");
  });
}

function deleteFood(id) {
  const data = loadData(KEYS.food);
  const item = data.find((f) => f.id === id);
  if (!item) return;
  if (item.timestamp && Date.now() - item.timestamp < 2 * 60 * 1000) trackUXTelemetry("logging.deletedEntryImmediately");
  const filtered = data.filter((f) => f.id !== id);
  saveData(KEYS.food, filtered);
  notifyDataChangedFromLog("deleteFood");
  showUndoToast("Food deleted", () => {
    trackUXTelemetry("logging.undoCount");
    const current = loadData(KEYS.food);
    current.push(item);
    saveData(KEYS.food, current);
    notifyDataChangedFromLog("undoDeleteFood");
  });
}

function editFood(id) {
  const food = loadData(KEYS.food).find((f) => f.id === id);
  if (!food) return;
  $("foodName").value = food.name;
  $("foodCalories").value = food.calories || "";
  $("foodCalories").dataset.manualEntry = food.calories ? "1" : "";
  $("foodProtein").value = food.protein || "";
  $("foodCarbs").value = food.carbs || "";
  $("foodFat").value = food.fat || "";
  $("foodServing").value = food.serving || "";
  $("foodMeal").value = food.meal || "breakfast";
  $("foodDate").value = food.date || today();
  $("foodEditId").value = id;
  $("foodFormTitle").textContent = "Edit Food";
  $("foodSubmitBtn").textContent = "Update Food";
  $("foodCancelEdit").classList.remove("hidden");
  document.querySelectorAll("#panel-log .sub-tab").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll("#panel-log .sub-panel").forEach((p) => p.classList.remove("active"));
  document.querySelector('[data-subtab="log-food"]').classList.add("active");
  $("log-food").classList.add("active");
  $("foodFormCard").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => $("foodName").focus(), 300);
}

function cancelEditFood() {
  $("foodEditId").value = "";
  $("foodFormTitle").textContent = "Log Food";
  $("foodSubmitBtn").textContent = "Log Food";
  $("foodCancelEdit").classList.add("hidden");
  ["foodName", "foodCalories", "foodProtein", "foodCarbs", "foodFat", "foodServing"].forEach((id) => ($(id).value = ""));
  $("foodDate").value = today();
  $("foodCalories").dataset.manualEntry = "";
  refreshCalorieGuidance();
}

function duplicateFood(id) {
  const food = loadData(KEYS.food).find((f) => f.id === id);
  if (!food) return;
  const entry = {
    id: uid(), date: today(), name: food.name,
    calories: food.calories || 0, protein: food.protein || 0,
    carbs: food.carbs || 0, fat: food.fat || 0,
    serving: food.serving || "", meal: food.meal || "snack",
    timestamp: Date.now(),
  };
  const data = loadData(KEYS.food);
  data.push(entry);
  saveData(KEYS.food, data);
  notifyDataChangedFromLog("duplicateFood");
  showToast(esc(food.name) + " logged again! 🔄");
}

// ========== AUTO-CALC CALORIES ==========
function refreshCalorieGuidance() {
  const p = parseInt($("foodProtein").value) || 0;
  const c = parseInt($("foodCarbs").value) || 0;
  const f = parseInt($("foodFat").value) || 0;
  const est = p * 4 + c * 4 + f * 9;
  const hint = $("autoCalcHint");
  const guide = $("autoCalcGuide");
  const calInput = $("foodCalories");
  const hasMacros = p || c || f;
  const manual = !!(calInput && calInput.dataset.manualEntry);

  if (hint) {
    if (manual) hint.textContent = "(manual override)";
    else if (hasMacros) hint.textContent = "(auto: " + est + " kcal)";
    else hint.textContent = "";
  }

  if (guide) {
    guide.textContent = manual
      ? "Manual calories are used. Clear Calories to return to macro auto-calc."
      : "Leave Calories empty to auto-calculate from Protein, Carbs, and Fat.";
  }
}

function autoCalcCalories() {
  const p = parseInt($("foodProtein").value) || 0;
  const c = parseInt($("foodCarbs").value) || 0;
  const f = parseInt($("foodFat").value) || 0;
  const est = p * 4 + c * 4 + f * 9;
  const calInput = $("foodCalories");
  if (p || c || f) {
    if (calInput && !calInput.dataset.manualEntry) calInput.value = est;
  } else {
    if (calInput && !calInput.dataset.manualEntry) calInput.value = "";
  }
  refreshCalorieGuidance();
}

// ========== LOG WORKOUT ==========
function addExerciseRow(seed) {
  exerciseRowCount++;
  const row = document.createElement("div");
  row.className = "stat-row stat-row-dense mb-8";
  row.id = "exrow_" + exerciseRowCount;
  row.innerHTML = getExerciseRowHtml(exerciseRowCount, seed);
  $("exerciseRows").appendChild(row);
  bindExerciseInputShortcuts(row);
  bindExerciseRowAdvancedToggle(row, exerciseRowCount);
  bindExerciseRowSetupHandlers(exerciseRowCount);
  // Wire exercise autocomplete
  if (typeof createExerciseAutocomplete === 'function') {
    createExerciseAutocomplete('exname_' + exerciseRowCount, exerciseRowCount);
  }
  // Wire progressive overload suggestion on name blur
  const nameInput = $('exname_' + exerciseRowCount);
  const idx = exerciseRowCount;
  if (nameInput) {
    nameInput.addEventListener('change', () => {
      const name = nameInput.value.trim();
      if (!name) return;
      const suggestion = typeof getSuggestedProgression === 'function' ? getSuggestedProgression(name) : null;
      if (suggestion) {
        const setsEl = $('exsets_' + idx), repsEl = $('exreps_' + idx), wtEl = $('exwt_' + idx);
        if (setsEl && !setsEl.value) setsEl.value = suggestion.sets || '';
        if (repsEl && !repsEl.value) repsEl.value = suggestion.reps || '';
        if (wtEl && !wtEl.value) wtEl.value = suggestion.weight || '';
        if (suggestion.note) showToast(suggestion.note, 'info');
      }
    });
  }
}

function logWorkout() {
  clearFormErrors();
  const name = $("workoutName").value.trim();
  if (!name) { showFormError("workoutName", "workoutNameError"); return; }
  const dur = parseInt($("workoutDuration").value) || 0;
  const burned = parseInt($("workoutCalories").value) || 0;
  if (dur < 0 || burned < 0) { showToast("Values cannot be negative", "error"); return; }

  const date = $("workoutDate").value || today();
  const exercises = [];
  const userBodyweight = getPrimaryBodyweight();
  for (let i = 1; i <= exerciseRowCount; i++) {
    const el = $("exname_" + i);
    if (!el) continue;
    const eName = el.value.trim();
    if (!eName) continue;
    const exObj = {
      name: eName,
      sets: parseInt($("exsets_" + i).value) || 0,
      reps: parseInt($("exreps_" + i).value) || 0,
      weight: parseFloat($("exwt_" + i).value) || 0,
      rpe: parseFloat($("exrpe_" + i).value) || null,
      targetReps: $("extargetreps_" + i) ? parseFloat($("extargetreps_" + i).value) || null : null,
      targetWeight: $("extargetwt_" + i) ? parseFloat($("extargetwt_" + i).value) || null : null,
      targetRPE: $("extargetrpe_" + i) ? parseFloat($("extargetrpe_" + i).value) || null : null,
      isAssistedBodyweight: !!($("exassist_" + i) && $("exassist_" + i).checked),
      gymName: $("exgym_" + i) ? $("exgym_" + i).value || null : null,
      machineSetupId: $("exsetup_" + i) ? $("exsetup_" + i).value || null : null,
      machineSetupNotes: $("exsetupnotes_" + i) ? $("exsetupnotes_" + i).value.trim() : "",
    };
    exObj.effectiveLoad = computeEffectiveLoad(exObj, exObj, userBodyweight);
    exercises.push(exObj);
    if (exObj.machineSetupNotes) upsertMachineSetup(eName, exObj.gymName, exObj.machineSetupNotes);
  }

  const entry = {
    id: uid(), date, name,
    type: $("workoutType").value,
    duration: dur, caloriesBurned: burned,
    exercises, notes: $("workoutNotes").value.trim(),
    protocolId: $("workoutProtocol").value || null,
    timestamp: Date.now(),
  };

  const data = loadData(KEYS.workouts);
  data.push(entry);
  saveData(KEYS.workouts, data);
  const flatSets = loadData(KEYS.strengthSets);
  exercises.forEach((ex, idx) => {
    flatSets.push({
      id: uid(),
      timestamp: entry.timestamp,
      date,
      workout_id: entry.id,
      exercise_name: ex.name,
      set_index: idx + 1,
      reps: ex.reps || 0,
      weight_kg: ex.weight || 0,
      target_reps: ex.targetReps || null,
      target_weight: ex.targetWeight || null,
      target_rpe: ex.targetRPE || null,
      is_assisted_bodyweight: ex.isAssistedBodyweight ? "true" : "false",
      effective_load: ex.effectiveLoad || 0,
    });
  });
  saveData(KEYS.strengthSets, flatSets);
  ["workoutName", "workoutDuration", "workoutCalories", "workoutNotes"].forEach((id) => ($(id).value = ""));
  $("workoutDate").value = today();
  $("exerciseRows").innerHTML = "";
  exerciseRowCount = 0;
  const card = $("workoutFormCard");
  if (card) { card.classList.add("log-success"); setTimeout(() => card.classList.remove("log-success"), 600); }
  notifyDataChangedFromLog("logWorkout");
  // Check for personal records
  if (typeof checkWorkoutForPRs === 'function') {
    const prs = checkWorkoutForPRs(exercises, date);
    if (prs.length > 0 && typeof celebratePRs === 'function') {
      celebratePRs(prs);
    } else {
      showToast("Workout logged! 💪");
    }
    // W8.6 — Show post-workout summary overlay
    if (typeof showPostWorkoutSummary === 'function') {
      // Convert exercises to include sets array for the summary view
      const summaryEntry = { ...entry };
      summaryEntry.exercises = exercises.map(function (ex) {
        return {
          name: ex.name,
          sets: [{ weight: ex.weight, reps: ex.reps, rpe: ex.rpe }],
        };
      });
      setTimeout(function () { showPostWorkoutSummary(summaryEntry); }, prs.length > 0 ? 2500 : 800);
    }
    // Always offer share if module available
    if (typeof showShareCardModal === 'function') {
      setTimeout(() => {
        const shareBtn = document.createElement('button');
        shareBtn.className = 'btn btn-outline btn-sm share-workout-btn';
        shareBtn.textContent = '📤 Share Workout';
        shareBtn.addEventListener('click', () => { showShareCardModal(entry, prs || []); shareBtn.remove(); });
        const card = $('workoutFormCard');
        if (card) card.appendChild(shareBtn);
        setTimeout(() => shareBtn.remove(), 10000);
      }, prs.length > 0 ? 2000 : 500);
    }
  } else {
    showToast("Workout logged! 💪");
    // W8.6 — Show post-workout summary even without PR tracker
    if (typeof showPostWorkoutSummary === 'function') {
      const summaryEntry = { ...entry };
      summaryEntry.exercises = exercises.map(function (ex) {
        return {
          name: ex.name,
          sets: [{ weight: ex.weight, reps: ex.reps, rpe: ex.rpe }],
        };
      });
      setTimeout(function () { showPostWorkoutSummary(summaryEntry); }, 800);
    }
  }
  if (entry.protocolId) {
    const base = loadData(KEYS.protocols).find((p) => p.id === entry.protocolId);
    if (base && JSON.stringify((base.exercises || []).map((e) => e.name + "|" + e.sets + "|" + e.reps + "|" + e.weight)) !== JSON.stringify(exercises.map((e) => e.name + "|" + e.sets + "|" + e.reps + "|" + e.weight))) {
      $("modalContainer").innerHTML =
        '<div class="modal-overlay" id="routineChangeOverlay"><div class="modal"><div class="modal-title">Routine change detected <button class="modal-close" id="routineChangeCloseBtn" aria-label="Close modal">×</button></div><p class="text-sm mb-12">How should FitOne handle these workout changes?</p>' +
        '<button class="btn btn-primary btn-block mb-8" id="routineUpdateBaseBtn">Update base routine</button>' +
        '<button class="btn btn-outline btn-block mb-8" id="routineVariantBtn">Save as new variant</button>' +
        '<button class="btn btn-outline btn-block" id="routineUseOnceBtn">Use once</button></div></div>';
      if ($("routineChangeOverlay")) {
        $("routineChangeOverlay").addEventListener("click", (e) => {
          if (e.target === $("routineChangeOverlay")) closeModal();
        });
      }
      if ($("routineChangeCloseBtn")) {
        $("routineChangeCloseBtn").addEventListener("click", closeModal);
      }
      $("routineUpdateBaseBtn").addEventListener("click", () => {
        updateRoutineWithWorkoutChanges(base.id, exercises);
        closeModal();
        refreshProtocols();
        showToast("Base routine updated");
      });
      $("routineVariantBtn").addEventListener("click", () => {
        createRoutineVariantFromWorkout(base.id, entry.name, exercises);
        closeModal();
        refreshProtocols();
        showToast("Routine variant created");
      });
      $("routineUseOnceBtn").addEventListener("click", () => closeModal());
    }
  }
  if (!settings.disableCooldownSuggestions && exercises.length) {
    const groups = {
      legs: ["squat", "lunge", "leg press", "deadlift"],
      push: ["bench", "press", "dip"],
      pull: ["row", "pull-up", "lat pull"],
    };
    const recs = new Set();
    exercises.forEach((ex) => {
      const n = ex.name.toLowerCase();
      if (groups.legs.some((k) => n.includes(k))) {
        recs.add("Hip flexor stretch");
        recs.add("Hamstring stretch");
      }
      if (groups.push.some((k) => n.includes(k))) {
        recs.add("Chest doorway stretch");
        recs.add("Thoracic spine rotation");
      }
      if (groups.pull.some((k) => n.includes(k))) {
        recs.add("Lat stretch");
        recs.add("Scapular wall slides");
      }
    });
    const list = Array.from(recs);
    if (list.length) {
      $("modalContainer").innerHTML =
        '<div class="modal-overlay" id="cooldownOverlay"><div class="modal"><div class="modal-title">Cooldown suggestions <button class="modal-close" id="cooldownCloseBtn" aria-label="Close modal">×</button></div><ul class="cooldown-list">' +
        list.map((r) => '<li><label><input type="checkbox" style="width:auto"> ' + esc(r) + "</label></li>").join("") +
        '</ul><button class="btn btn-primary btn-block mt-12" id="cooldownDoneBtn">Mark complete</button></div></div>';
      if ($("cooldownOverlay")) {
        $("cooldownOverlay").addEventListener("click", (e) => {
          if (e.target === $("cooldownOverlay")) closeModal();
        });
      }
      if ($("cooldownCloseBtn")) {
        $("cooldownCloseBtn").addEventListener("click", closeModal);
      }
      $("cooldownDoneBtn").addEventListener("click", () => {
        closeModal();
        showToast("Cooldown logged");
      });
    }
  }
  setTimeout(() => { if ($("workoutName")) $("workoutName").focus(); }, 300);
}

function deleteWorkout(id) {
  const data = loadData(KEYS.workouts);
  const item = data.find((w) => w.id === id);
  if (!item) return;
  if (item.timestamp && Date.now() - item.timestamp < 2 * 60 * 1000) trackUXTelemetry("logging.deletedEntryImmediately");
  const filtered = data.filter((w) => w.id !== id);
  saveData(KEYS.workouts, filtered);
  notifyDataChangedFromLog("deleteWorkout");
  showUndoToast("Workout deleted", () => {
    trackUXTelemetry("logging.undoCount");
    const current = loadData(KEYS.workouts);
    current.push(item);
    saveData(KEYS.workouts, current);
    notifyDataChangedFromLog("undoDeleteWorkout");
  });
}

// ========== LOG BODY ==========
function logBody() {
  clearFormErrors();
  const weight = parseFloat($("bodyWeight").value);
  if (!weight || weight <= 0) { showFormError("bodyWeight", "bodyWeightError"); return; }
  const date = $("bodyDate").value || today();
  const entry = {
    id: uid(), date, weight,
    bodyFat: parseFloat($("bodyFat").value) || null,
    waist: parseFloat($("bodyWaist").value) || null,
    chest: parseFloat($("bodyChest").value) || null,
    arms: parseFloat($("bodyArms").value) || null,
    legs: parseFloat($("bodyLegs").value) || null,
    notes: $("bodyNotes").value.trim(),
    timestamp: Date.now(),
  };
  const data = loadData(KEYS.body);
  data.push(entry);
  saveData(KEYS.body, data);
  ["bodyWeight", "bodyFat", "bodyWaist", "bodyChest", "bodyArms", "bodyLegs", "bodyNotes"].forEach((id) => ($(id).value = ""));
  $("bodyDate").value = today();
  const card = $("bodyFormCard");
  if (card) { card.classList.add("log-success"); setTimeout(() => card.classList.remove("log-success"), 600); }
  notifyDataChangedFromLog("logBody");
  showToast("Body measurements saved! 📏");
}

function deleteBody(id) {
  const data = loadData(KEYS.body);
  const item = data.find((b) => b.id === id);
  if (!item) return;
  if (item.timestamp && Date.now() - item.timestamp < 2 * 60 * 1000) trackUXTelemetry("logging.deletedEntryImmediately");
  const filtered = data.filter((b) => b.id !== id);
  saveData(KEYS.body, filtered);
  notifyDataChangedFromLog("deleteBody");
  showUndoToast("Measurement deleted", () => {
    trackUXTelemetry("logging.undoCount");
    const current = loadData(KEYS.body);
    current.push(item);
    saveData(KEYS.body, current);
    notifyDataChangedFromLog("undoDeleteBody");
  });
}

// ========== W7 REST TIMER LOGIC ==========
let _timerInterval = null;
let _timerRemaining = 0;
let _timerTotal = 0;
let _timerCanvasContext = null;

function startTimer(seconds, nextExName) {
  stopTimer();
  _timerTotal = seconds || (settings.defaultRestTime || 60);
  _timerRemaining = _timerTotal;
  
  const overlay = $("timerOverlay");
  if (overlay) {
    overlay.classList.remove("hidden");
    document.body.classList.add("overlay-open");
    // Populate stats
    const durInput = $("workoutDuration");
    if ($("timerCal") && durInput) {
       const userBodyweight = getPrimaryBodyweight ? getPrimaryBodyweight() : 70;
       const burned = ((parseFloat(durInput.value)||0) * (userBodyweight * 0.1)).toFixed(0);
       $("timerCal").textContent = burned + " KCAL";
    }
    // Populate next set
    if ($("timerNextSet")) {
      const activeName = nextExName || ($("workoutName") ? $("workoutName").value : "Next Exercise");
      $("timerNextSet").innerHTML = "PREPARE FOR<br/><b>" + escAttr(activeName || "LIFT") + "</b>";
    }
    
    if (!$("skipRestBtn").hasAttribute('data-bound')) {
      $("skipRestBtn").addEventListener("click", stopTimer);
      $("skipRestBtn").setAttribute('data-bound', 'true');
    }
  }

  const disp = $("timerDisplay");
  if (disp) { disp.className = "timer-display active"; }
  
  updateTimerDisplay();
  
  _timerInterval = setInterval(() => {
    _timerRemaining--;
    updateTimerDisplay();
    if (_timerRemaining <= 0) {
      finishTimer();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(_timerRemaining / 60);
  const s = _timerRemaining % 60;
  const tStr = m + ":" + String(s).padStart(2, "0");
  
  const disp = $("timerDisplay");
  if (disp) disp.textContent = tStr;

  const txt = $("timerCircleText");
  if (txt) txt.textContent = tStr;
  
  drawTimerCanvas();
}

function drawTimerCanvas() {
  const canvas = $("timerCircleCanvas");
  if (!canvas) return;
  if (!_timerCanvasContext) _timerCanvasContext = canvas.getContext('2d');
  const ctx = _timerCanvasContext;
  const cw = canvas.width;
  const ch = canvas.height;
  const cx = cw / 2;
  const cy = ch / 2;
  const radius = cx - 15;
  
  ctx.clearRect(0, 0, cw, ch);
  
  // Ring background
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 14;
  ctx.stroke();
  
  // Ring progress
  if (_timerTotal > 0 && _timerRemaining > 0) {
    const pct = Math.max(0, _timerRemaining / _timerTotal);
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (pct * 2 * Math.PI);
    
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = "var(--primary)";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "var(--primary)";
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function stopTimer() {
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
  _timerRemaining = 0;
  _timerTotal = 0;
  
  const disp = $("timerDisplay");
  if (disp) { disp.textContent = "0:00"; disp.className = "timer-display"; }
  
  const overlay = $("timerOverlay");
  if (overlay) {
    overlay.classList.add("hidden");
    document.body.classList.remove("overlay-open");
  }
}

function finishTimer() {
  stopTimer();
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  showToast("Rest complete! Let's go! 💪", "info");
}

// ========== SEARCH / FILTER ==========
function filterRecentFood() {
  const q = ($("searchFood").value || "").toLowerCase();
  const items = $("recentFood").querySelectorAll(".list-item");
  items.forEach((item) => {
    const title = item.querySelector(".list-item-title");
    item.style.display = !q || (title && title.textContent.toLowerCase().includes(q)) ? "" : "none";
  });
}

function filterRecentWorkouts() {
  const q = ($("searchWorkout").value || "").toLowerCase();
  const items = $("recentWorkouts").querySelectorAll(".list-item");
  items.forEach((item) => {
    const title = item.querySelector(".list-item-title");
    item.style.display = !q || (title && title.textContent.toLowerCase().includes(q)) ? "" : "none";
  });
}

// ========== POPULATE PROTOCOL SELECT ==========
function populateProtocolSelect() {
  const protocols = loadData(KEYS.protocols);
  const sel = $("workoutProtocol");
  if (!sel) return;
  sel.innerHTML = '<option value="">None</option>' + protocols.map((p) => '<option value="' + p.id + '">' + esc(p.name) + "</option>").join("");
}

// ========== REFRESH LOG ==========
function refreshLog() {
  const allFood = loadData(KEYS.food).sort((a, b) => b.timestamp - a.timestamp);
  const allWorkouts = loadData(KEYS.workouts).sort((a, b) => b.timestamp - a.timestamp);
  const allBody = loadData(KEYS.body).sort((a, b) => b.timestamp - a.timestamp);
  window._allFood = allFood;
  window._allWorkouts = allWorkouts;
  const food = allFood.slice(0, 30);
  const workouts = allWorkouts.slice(0, 30);
  const body = allBody.slice(0, 30);

  if (food.length) {
    $("recentFood").innerHTML = food
      .map((f) => {
        const time = f.timestamp ? fmtTime(f.timestamp) : "";
        return '<div class="list-item"><div class="list-item-main"><div class="list-item-title">' + esc(f.name) + '<span class="entry-time">' + time + '</span></div><div class="list-item-sub">' + fmtDate(f.date) + " • " + (f.meal || "") + (f.serving ? " • " + esc(f.serving) : "") + " • P" + (f.protein || 0) + " C" + (f.carbs || 0) + " F" + (f.fat || 0) + '</div></div><div class="list-item-right" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><div style="font-weight:600">' + f.calories + ' cal</div><div style="display:flex;gap:4px"><button class="btn-icon" data-duplicate-food="' + f.id + '" title="Log again">🔄</button><button class="btn-icon" data-edit-food="' + f.id + '" title="Edit">✏️</button><button class="btn-delete" data-delete-food="' + f.id + '" title="Delete">✕</button></div></div></div>';
      })
      .join("");
  } else {
    $("recentFood").innerHTML = '<div class="empty"><div class="empty-icon">🍽️</div><div class="empty-text">Ready to fuel your day? 🍎</div><button class="btn btn-primary btn-sm" data-action="focusFood">Log your first meal</button></div>';
  }

  if (workouts.length) {
    $("recentWorkouts").innerHTML = workouts
      .map((w) => {
        const time = w.timestamp ? fmtTime(w.timestamp) : "";
        const targetHints = (w.exercises || []).map((ex) => renderTargetChip(ex)).filter(Boolean).slice(0, 2).join("");
        return '<div class="list-item"><div class="list-item-main"><div class="list-item-title">' + esc(w.name) + '<span class="entry-time">' + time + '</span></div><div class="list-item-sub">' + fmtDate(w.date) + " • " + w.type + " • " + (w.duration || 0) + " min • " + (w.exercises || []).length + ' ex</div>' + targetHints + '</div><div class="list-item-right" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class="tag tag-blue">' + (w.caloriesBurned || 0) + ' cal</span><button class="btn-delete" data-delete-workout="' + w.id + '" title="Delete">✕</button></div></div>';
      })
      .join("");
  } else {
    $("recentWorkouts").innerHTML = '<div class="empty"><div class="empty-icon">🏋️</div><div class="empty-text">Time to move! Let\'s crush it 💪</div><button class="btn btn-primary btn-sm" data-action="focusWorkout">Log your first workout</button></div>';
  }

  if (body.length) {
    $("bodyHistory").innerHTML = body
      .map((b) => {
        const time = b.timestamp ? fmtTime(b.timestamp) : "";
        return '<div class="list-item"><div class="list-item-main"><div class="list-item-title">' + b.weight + " " + settings.weightUnit + '<span class="entry-time">' + time + '</span></div><div class="list-item-sub">' + fmtDate(b.date) + (b.bodyFat ? " • BF " + b.bodyFat + "%" : "") + (b.waist ? " • Waist " + b.waist + settings.measureUnit : "") + '</div></div><div class="list-item-right"><button class="btn-delete" data-delete-body="' + b.id + '" title="Delete">✕</button></div></div>';
      })
      .join("");
  } else {
    $("bodyHistory").innerHTML = '<div class="empty"><div class="empty-icon">📏</div><div class="empty-text">Track your progress — log your first measurement</div><button class="btn btn-primary btn-sm" data-action="focusBody">Get started</button></div>';
  }

  populateProtocolSelect();
  refreshFavorites();
}

// ========== EVENT DELEGATION ==========
function initLogEvents() {
  const panel = $("panel-log");
  if (!panel) return;

  panel.addEventListener("click", (e) => {
    // data-action buttons
    const actionEl = e.target.closest("[data-action]");
    if (actionEl) {
      const action = actionEl.dataset.action;
      if (action === "logFood") logFood();
      else if (action === "cancelEditFood") cancelEditFood();
      else if (action === "clearTodayFood") clearTodayFood();
      else if (action === "logWorkout") logWorkout();
      else if (action === "addExerciseRow") addExerciseRow();
      else if (action === "logBody") logBody();
      else if (action === "startTimer") startTimer(parseInt(actionEl.dataset.seconds) || 60);
      else if (action === "stopTimer") stopTimer();
      else if (action === "focusFood" && $("foodName")) $("foodName").focus();
      else if (action === "focusWorkout" && $("workoutName")) $("workoutName").focus();
      else if (action === "focusBody" && $("bodyWeight")) $("bodyWeight").focus();
      else if (action === "scanBarcode" && typeof showBarcodeScanner === 'function') showBarcodeScanner();
      return;
    }

    // Food actions
    const delFood = e.target.closest("[data-delete-food]");
    if (delFood) { deleteFood(delFood.dataset.deleteFood); return; }
    const editFoodEl = e.target.closest("[data-edit-food]");
    if (editFoodEl) { editFood(editFoodEl.dataset.editFood); return; }
    const dupFood = e.target.closest("[data-duplicate-food]");
    if (dupFood) { duplicateFood(dupFood.dataset.duplicateFood); return; }

    // Workout actions
    const delWorkout = e.target.closest("[data-delete-workout]");
    if (delWorkout) { deleteWorkout(delWorkout.dataset.deleteWorkout); return; }

    // Body actions
    const delBody = e.target.closest("[data-delete-body]");
    if (delBody) { deleteBody(delBody.dataset.deleteBody); return; }

    // Remove exercise row
    const removeRow = e.target.closest("[data-remove-row]");
    if (removeRow) { removeRow.closest(".stat-row").remove(); return; }

    // Favorites
    const removeFav = e.target.closest("[data-remove-fav]");
    if (removeFav) { e.stopPropagation(); removeFavorite(removeFav.dataset.removeFav); return; }
    const favChip = e.target.closest("[data-fav-id]");
    if (favChip && !removeFav) { quickAddFavorite(favChip.dataset.favId); return; }
  });

  // Auto-calc calories
  $("foodProtein").addEventListener("input", autoCalcCalories);
  $("foodCarbs").addEventListener("input", autoCalcCalories);
  $("foodFat").addEventListener("input", autoCalcCalories);
  // Track manual calorie entry so auto-calc doesn't overwrite
  $("foodCalories").addEventListener("input", function () {
    this.dataset.manualEntry = this.value ? "1" : "";
    refreshCalorieGuidance();
  });
  refreshCalorieGuidance();

  // Init food database search
  if (typeof initFoodSearch === 'function') initFoodSearch();

  // Search
  const searchFood = $("searchFood");
  if (searchFood) searchFood.addEventListener("input", filterRecentFood);
  const searchWorkout = $("searchWorkout");
  if (searchWorkout) searchWorkout.addEventListener("input", filterRecentWorkouts);

  const protocolSel = $("workoutProtocol");
  if (protocolSel) {
    protocolSel.addEventListener("change", () => {
      const id = protocolSel.value;
      if (!id) return;
      const proto = loadData(KEYS.protocols).find((p) => p.id === id);
      if (!proto) return;
      const planned = proto.plannedSets || [];
      for (let i = 1; i <= exerciseRowCount; i++) {
        const nameEl = $("exname_" + i);
        if (!nameEl) continue;
        const ps = planned.find((p) => (p.exerciseName || "").toLowerCase() === nameEl.value.trim().toLowerCase());
        if (!ps) continue;
        if ($("extargetreps_" + i) && ps.targetReps != null) $("extargetreps_" + i).value = ps.targetReps;
        if ($("extargetwt_" + i) && ps.targetWeight != null) $("extargetwt_" + i).value = ps.targetWeight;
        if ($("extargetrpe_" + i) && ps.targetRPE != null) $("extargetrpe_" + i).value = ps.targetRPE;
      }
    });
  }

  const workoutPanel = $("log-workout");
  if (workoutPanel && !$("shortcutHelp")) {
    const note = document.createElement("div");
    note.id = "shortcutHelp";
    note.className = "mini-banner";
    note.innerHTML = "Shortcuts: Enter = next field/submit. ArrowUp/Down adjusts values. Swipe set row right = duplicate, left = delete.";
    workoutPanel.insertBefore(note, workoutPanel.firstChild);
  }
}

// Give access to exerciseRowCount for protocols
function getExerciseRowCount() { return exerciseRowCount; }
function setExerciseRowCount(val) { exerciseRowCount = val; }

