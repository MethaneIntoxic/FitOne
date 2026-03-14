// ========== LOG VIEW ==========
// Food, workout, body logging and recent lists


let exerciseRowCount = 0;

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
  const filtered = data.filter((f) => f.id !== id);
  saveData(KEYS.food, filtered);
  refreshLog();
  refreshToday();
  showUndoToast("Food deleted", () => {
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
  if (hint) {
    if (p || c || f) hint.textContent = "(est. " + est + ")";
    else hint.textContent = "";
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
    '<button class="btn btn-outline btn-sm" data-remove-row style="align-self:flex-end;margin-bottom:12px">✕</button>';
  $("exerciseRows").appendChild(row);
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
  for (let i = 1; i <= exerciseRowCount; i++) {
    const el = $("exname_" + i);
    if (!el) continue;
    const eName = el.value.trim();
    if (!eName) continue;
    exercises.push({
      name: eName,
      sets: parseInt($("exsets_" + i).value) || 0,
      reps: parseInt($("exreps_" + i).value) || 0,
      weight: parseFloat($("exwt_" + i).value) || 0,
    });
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
  ["workoutName", "workoutDuration", "workoutCalories", "workoutNotes"].forEach((id) => ($(id).value = ""));
  $("workoutDate").value = today();
  $("exerciseRows").innerHTML = "";
  exerciseRowCount = 0;
  const card = $("workoutFormCard");
  if (card) { card.classList.add("log-success"); setTimeout(() => card.classList.remove("log-success"), 600); }
  refreshLog();
  refreshToday();
  showToast("Workout logged! 💪");
  setTimeout(() => { if ($("workoutName")) $("workoutName").focus(); }, 300);
}

function deleteWorkout(id) {
  const data = loadData(KEYS.workouts);
  const item = data.find((w) => w.id === id);
  if (!item) return;
  const filtered = data.filter((w) => w.id !== id);
  saveData(KEYS.workouts, filtered);
  refreshLog();
  refreshToday();
  showUndoToast("Workout deleted", () => {
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
  const filtered = data.filter((b) => b.id !== id);
  saveData(KEYS.body, filtered);
  refreshLog();
  showUndoToast("Measurement deleted", () => {
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
        return '<div class="list-item"><div class="list-item-main"><div class="list-item-title">' + esc(w.name) + '<span class="entry-time">' + time + '</span></div><div class="list-item-sub">' + fmtDate(w.date) + " • " + w.type + " • " + (w.duration || 0) + " min • " + (w.exercises || []).length + ' ex</div></div><div class="list-item-right" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class="tag tag-blue">' + (w.caloriesBurned || 0) + ' cal</span><button class="btn-delete" data-delete-workout="' + w.id + '" title="Delete">✕</button></div></div>';
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

  // Search
  const searchFood = $("searchFood");
  if (searchFood) searchFood.addEventListener("input", filterRecentFood);
  const searchWorkout = $("searchWorkout");
  if (searchWorkout) searchWorkout.addEventListener("input", filterRecentWorkouts);
}

// Give access to exerciseRowCount for protocols
function getExerciseRowCount() { return exerciseRowCount; }
function setExerciseRowCount(val) { exerciseRowCount = val; }
