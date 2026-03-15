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
  const fields = Array.from(numberInputs);
  fields.forEach((input, idx) => {
    input.addEventListener("keydown", (e) => {
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
  refreshLog();
  refreshToday();
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
  $("autoCalcHint").textContent = "";
  $("foodCalories").dataset.manualEntry = "";
  const card = $("foodFormCard");
  if (card) { card.classList.add("log-success"); setTimeout(() => card.classList.remove("log-success"), 600); }
  refreshLog();
  refreshToday();
  setTimeout(() => { if ($("foodName")) $("foodName").focus(); }, 300);
}

function clearTodayFood() {
  showConfirmModal("Clear Today's Food", "⚠️", "This will remove all food entries for today. You can always log them again.", () => {
    const data = loadData(KEYS.food).filter((f) => f.date !== today());
    saveData(KEYS.food, data);
    refreshLog();
    refreshToday();
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
  refreshLog();
  refreshToday();
  showUndoToast("Food deleted", () => {
    trackUXTelemetry("logging.undoCount");
    const current = loadData(KEYS.food);
    current.push(item);
    saveData(KEYS.food, current);
    refreshLog();
    refreshToday();
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
  $("autoCalcHint").textContent = "";
  $("foodCalories").dataset.manualEntry = "";
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
  refreshLog();
  refreshToday();
  showToast(esc(food.name) + " logged again! 🔄");
}

// ========== AUTO-CALC CALORIES ==========
function autoCalcCalories() {
  const p = parseInt($("foodProtein").value) || 0;
  const c = parseInt($("foodCarbs").value) || 0;
  const f = parseInt($("foodFat").value) || 0;
  const est = p * 4 + c * 4 + f * 9;
  const hint = $("autoCalcHint");
  const calInput = $("foodCalories");
  if (p || c || f) {
    if (hint) hint.textContent = "(auto: " + est + " kcal)";
    if (calInput && !calInput.dataset.manualEntry) calInput.value = est;
  } else {
    if (hint) hint.textContent = "";
    if (calInput && !calInput.dataset.manualEntry) calInput.value = "";
  }
}

// ========== LOG WORKOUT ==========
function addExerciseRow() {
  exerciseRowCount++;
  const row = document.createElement("div");
  row.className = "stat-row mb-8";
  row.id = "exrow_" + exerciseRowCount;
  row.innerHTML =
    '<div class="form-group" style="flex:2"><input type="text" placeholder="Exercise name" id="exname_' + exerciseRowCount + '"></div>' +
    '<div class="form-group" style="flex:1"><input type="number" placeholder="Sets" id="exsets_' + exerciseRowCount + '"></div>' +
    '<div class="form-group" style="flex:1"><input type="number" placeholder="Reps" id="exreps_' + exerciseRowCount + '"></div>' +
    '<div class="form-group" style="flex:1"><input type="number" placeholder="Wt" id="exwt_' + exerciseRowCount + '"></div>' +
    '<div class="form-group" style="flex:1"><input type="number" placeholder="RPE" id="exrpe_' + exerciseRowCount + '"></div>' +
    '<div class="form-group" style="flex:1"><input type="number" placeholder="T.Reps" id="extargetreps_' + exerciseRowCount + '"></div>' +
    '<div class="form-group" style="flex:1"><input type="number" placeholder="T.Wt" id="extargetwt_' + exerciseRowCount + '"></div>' +
    '<div class="form-group" style="flex:1"><input type="number" placeholder="T.RPE" id="extargetrpe_' + exerciseRowCount + '"></div>' +
    '<div class="form-group" style="flex:1;display:flex;align-items:center;gap:6px"><input type="checkbox" id="exassist_' + exerciseRowCount + '" style="width:auto"><label for="exassist_' + exerciseRowCount + '" class="text-xs">Assisted</label></div>' +
    '<div class="form-group" style="flex:1"><select id="exgym_' + exerciseRowCount + '"><option value="">Gym (optional)</option>' + getGymOptions() + '</select></div>' +
    '<div class="form-group" style="flex:1"><select id="exsetup_' + exerciseRowCount + '">' + getSetupSelectOptions("") + "</select></div>" +
    '<div class="form-group" style="flex:2"><input type="text" placeholder="Machine setup notes (seat/pin/grip)" id="exsetupnotes_' + exerciseRowCount + '"></div>' +
    '<button class="btn btn-outline btn-sm" data-remove-row style="align-self:flex-end;margin-bottom:12px">✕</button>';
  $("exerciseRows").appendChild(row);
  bindExerciseInputShortcuts(row);
  const nameInput = $("exname_" + exerciseRowCount);
  if (nameInput) {
    nameInput.addEventListener("change", () => {
      const setupSel = $("exsetup_" + exerciseRowCount);
      if (setupSel) setupSel.innerHTML = getSetupSelectOptions(nameInput.value);
    });
  }
  const setupSel = $("exsetup_" + exerciseRowCount);
  if (setupSel) {
    setupSel.addEventListener("change", () => {
      const setupId = setupSel.value;
      if (!setupId) return;
      const setup = loadData(KEYS.machineSetups).find((s) => s.id === setupId);
      const notes = $("exsetupnotes_" + exerciseRowCount);
      if (setup && notes) notes.value = setup.notes || "";
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
  refreshLog();
  refreshToday();
  showToast("Workout logged! 💪");
  if (entry.protocolId) {
    const base = loadData(KEYS.protocols).find((p) => p.id === entry.protocolId);
    if (base && JSON.stringify((base.exercises || []).map((e) => e.name + "|" + e.sets + "|" + e.reps + "|" + e.weight)) !== JSON.stringify(exercises.map((e) => e.name + "|" + e.sets + "|" + e.reps + "|" + e.weight))) {
      $("modalContainer").innerHTML =
        '<div class="modal-overlay"><div class="modal"><div class="modal-title">Routine change detected</div><p class="text-sm mb-12">How should FitOne handle these workout changes?</p>' +
        '<button class="btn btn-primary btn-block mb-8" id="routineUpdateBaseBtn">Update base routine</button>' +
        '<button class="btn btn-outline btn-block mb-8" id="routineVariantBtn">Save as new variant</button>' +
        '<button class="btn btn-outline btn-block" id="routineUseOnceBtn">Use once</button></div></div>';
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
        '<div class="modal-overlay"><div class="modal"><div class="modal-title">Cooldown suggestions</div><ul class="cooldown-list">' +
        list.map((r) => '<li><label><input type="checkbox" style="width:auto"> ' + esc(r) + "</label></li>").join("") +
        '</ul><button class="btn btn-primary btn-block mt-12" id="cooldownDoneBtn">Mark complete</button></div></div>';
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
  refreshLog();
  refreshToday();
  showUndoToast("Workout deleted", () => {
    trackUXTelemetry("logging.undoCount");
    const current = loadData(KEYS.workouts);
    current.push(item);
    saveData(KEYS.workouts, current);
    refreshLog();
    refreshToday();
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
  refreshLog();
  showToast("Body measurements saved! 📏");
}

function deleteBody(id) {
  const data = loadData(KEYS.body);
  const item = data.find((b) => b.id === id);
  if (!item) return;
  if (item.timestamp && Date.now() - item.timestamp < 2 * 60 * 1000) trackUXTelemetry("logging.deletedEntryImmediately");
  const filtered = data.filter((b) => b.id !== id);
  saveData(KEYS.body, filtered);
  refreshLog();
  showUndoToast("Measurement deleted", () => {
    trackUXTelemetry("logging.undoCount");
    const current = loadData(KEYS.body);
    current.push(item);
    saveData(KEYS.body, current);
    refreshLog();
  });
}

// ========== REST TIMER ==========
let _timerInterval = null;
let _timerRemaining = 0;

function startTimer(seconds) {
  stopTimer();
  _timerRemaining = seconds;
  const disp = $("timerDisplay");
  if (!disp) return;
  disp.className = "timer-display active";
  updateTimerDisplay();
  _timerInterval = setInterval(() => {
    _timerRemaining--;
    updateTimerDisplay();
    if (_timerRemaining <= 0) {
      clearInterval(_timerInterval);
      _timerInterval = null;
      disp.className = "timer-display done";
      disp.textContent = "✓ Done!";
      showToast("Rest timer done! 💪", "info");
    }
  }, 1000);
}

function stopTimer() {
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
  const disp = $("timerDisplay");
  if (disp) { disp.textContent = "0:00"; disp.className = "timer-display"; }
  _timerRemaining = 0;
}

function updateTimerDisplay() {
  const disp = $("timerDisplay");
  if (!disp) return;
  const m = Math.floor(_timerRemaining / 60);
  const s = _timerRemaining % 60;
  disp.textContent = m + ":" + String(s).padStart(2, "0");
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
  });

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
