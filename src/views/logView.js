// ========== LOG VIEW ==========
// Food, workout, body logging and recent lists


let exerciseRowCount = 0;
const MICRONUTRIENT_DAILY_TARGETS = {
  fiber: 30,
  sugar: 50,
  sodium: 2300,
};

function parseMicronutrientValue(raw, decimals) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const d = Number.isFinite(Number(decimals)) ? Math.max(0, Number(decimals)) : 0;
  if (d === 0) return Math.round(n);
  const factor = Math.pow(10, d);
  return Math.round(n * factor) / factor;
}

function formatMicronutrientDelta(value, target, unit, capMode) {
  const delta = (Number(target) || 0) - (Number(value) || 0);
  const pretty = unit === "mg" ? String(Math.round(Math.abs(delta))) : Math.abs(delta).toFixed(1).replace(/\.0$/, "");
  if (delta > 0) return pretty + unit + " left";
  if (delta < 0) return pretty + unit + " over";
  return capMode ? "at cap" : "on target";
}

function formatMicronutrientInline(entry) {
  const row = entry || {};
  const fiber = parseMicronutrientValue(row.fiber, 1);
  const sugar = parseMicronutrientValue(row.sugar, 1);
  const sodium = parseMicronutrientValue(row.sodium, 0);
  if (!fiber && !sugar && !sodium) return "";
  return " • Fi" + fiber + "g" + " Su" + sugar + "g" + " Na" + sodium + "mg";
}

function refreshMicronutrientHints() {
  const fiberHint = $("fiberHint");
  const sugarHint = $("sugarHint");
  const sodiumHint = $("sodiumHint");
  if (!fiberHint && !sugarHint && !sodiumHint) return;

  const selectedDate = ($("foodDate") && $("foodDate").value) || today();
  const dayFood = loadData(KEYS.food).filter((f) => f.date === selectedDate);
  const totals = dayFood.reduce(
    (acc, row) => {
      acc.fiber += Number(row.fiber) || 0;
      acc.sugar += Number(row.sugar) || 0;
      acc.sodium += Number(row.sodium) || 0;
      return acc;
    },
    { fiber: 0, sugar: 0, sodium: 0 }
  );

  if (fiberHint) {
    fiberHint.textContent = "(" + formatMicronutrientDelta(totals.fiber, MICRONUTRIENT_DAILY_TARGETS.fiber, "g", false) + ")";
  }
  if (sugarHint) {
    sugarHint.textContent = "(" + formatMicronutrientDelta(totals.sugar, MICRONUTRIENT_DAILY_TARGETS.sugar, "g", true) + ")";
  }
  if (sodiumHint) {
    sodiumHint.textContent = "(" + formatMicronutrientDelta(totals.sodium, MICRONUTRIENT_DAILY_TARGETS.sodium, "mg", true) + ")";
  }
}

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

const EXERCISE_GROUP_TYPES = [
  { value: "superset", label: "Superset" },
  { value: "circuit", label: "Circuit" },
  { value: "giant", label: "Giant Set" },
  { value: "drop", label: "Drop Set" },
  { value: "rest-pause", label: "Rest-Pause" },
];

function getExerciseGroupTypeLabel(type) {
  const match = EXERCISE_GROUP_TYPES.find((opt) => opt.value === String(type || "").toLowerCase());
  return match ? match.label : "Superset";
}

function getExerciseGroupTypeOptionsHtml(selectedType) {
  const selected = String(selectedType || "superset").toLowerCase();
  return EXERCISE_GROUP_TYPES
    .map((opt) => {
      const sel = opt.value === selected ? " selected" : "";
      return '<option value="' + opt.value + '"' + sel + ">" + opt.label + "</option>";
    })
    .join("");
}

function getExerciseRowIndex(row) {
  if (!row || !row.id) return 0;
  return Number(String(row.id).replace("exrow_", "")) || 0;
}

function getAdjacentExerciseRow(row, direction) {
  if (!row) return null;
  let cursor = direction > 0 ? row.nextElementSibling : row.previousElementSibling;
  while (cursor) {
    if (cursor.id && cursor.id.indexOf("exrow_") === 0) return cursor;
    cursor = direction > 0 ? cursor.nextElementSibling : cursor.previousElementSibling;
  }
  return null;
}

function getExerciseRowName(row) {
  const input = row ? row.querySelector('[id^="exname_"]') : null;
  return (input && input.value ? String(input.value) : "").trim();
}

function isExerciseRowLinkedWithNext(row) {
  const input = row ? row.querySelector('[id^="exlinknext_"]') : null;
  return !!(input && input.checked);
}

function getExerciseRowGroupType(row) {
  const select = row ? row.querySelector('[id^="exgrouptype_"]') : null;
  const raw = (select && select.value ? String(select.value) : "superset").toLowerCase();
  if (EXERCISE_GROUP_TYPES.some((opt) => opt.value === raw)) return raw;
  return "superset";
}

function getExerciseGroupContext(row) {
  if (!row) return null;

  let startRow = row;
  while (startRow) {
    const prev = getAdjacentExerciseRow(startRow, -1);
    if (!prev) break;
    if (!isExerciseRowLinkedWithNext(prev)) break;
    if (!getExerciseRowName(prev) || !getExerciseRowName(startRow)) break;
    startRow = prev;
  }

  let endRow = row;
  while (endRow) {
    const next = getAdjacentExerciseRow(endRow, 1);
    if (!next) break;
    if (!isExerciseRowLinkedWithNext(endRow)) break;
    if (!getExerciseRowName(endRow) || !getExerciseRowName(next)) break;
    endRow = next;
  }

  const rows = [];
  let cursor = startRow;
  while (cursor) {
    rows.push(cursor);
    if (cursor === endRow) break;
    cursor = getAdjacentExerciseRow(cursor, 1);
  }

  const isGrouped = rows.length > 1;
  const groupType = getExerciseRowGroupType(startRow);

  return {
    isGrouped,
    isGroupStart: isGrouped && row === startRow,
    isGroupEnd: isGrouped && row === endRow,
    groupType,
    groupLabel: getExerciseGroupTypeLabel(groupType),
    rows,
    startRow,
    endRow,
    startIndex: getExerciseRowIndex(startRow),
    endIndex: getExerciseRowIndex(endRow),
  };
}

function focusNextExerciseRow(row) {
  const nextRow = getAdjacentExerciseRow(row, 1);
  if (!nextRow) return false;
  const nextName = nextRow.querySelector('[id^="exname_"]');
  if (!nextName) return false;
  nextName.focus();
  nextName.scrollIntoView({ block: "center", behavior: "smooth" });
  return true;
}

function getGroupedRestSeconds(groupContext) {
  if (!groupContext || !groupContext.isGrouped || !Array.isArray(groupContext.rows)) return 0;
  let best = 0;
  groupContext.rows.forEach((memberRow) => {
    const name = getExerciseRowName(memberRow);
    if (!name) return;
    best = Math.max(best, getRestTimerSecondsForExercise(name));
  });
  return best;
}

function refreshExerciseGroupVisuals() {
  const root = $("exerciseRows");
  if (!root) return;
  const rows = Array.from(root.querySelectorAll('.stat-row[id^="exrow_"]'));

  rows.forEach((row) => {
    row.classList.remove(
      "exercise-group-linked",
      "exercise-group-member",
      "exercise-group-start",
      "exercise-group-middle",
      "exercise-group-end"
    );
    row.removeAttribute("data-group-type");
    const badge = row.querySelector('[id^="exgroupbadge_"]');
    if (badge) {
      badge.textContent = "";
      badge.classList.add("hidden");
    }
  });

  rows.forEach((row) => {
    const linkToggle = row.querySelector('[id^="exlinknext_"]');
    const typeSelect = row.querySelector('[id^="exgrouptype_"]');

    if (typeSelect) {
      typeSelect.disabled = !(linkToggle && linkToggle.checked);
    }
  });

  rows.forEach((row) => {
    const context = getExerciseGroupContext(row);
    if (!context || !context.isGrouped) return;

    row.classList.add("exercise-group-member");
    row.dataset.groupType = context.groupType;

    if (context.isGroupStart) row.classList.add("exercise-group-start");
    else if (context.isGroupEnd) row.classList.add("exercise-group-end");
    else row.classList.add("exercise-group-middle");

    if (isExerciseRowLinkedWithNext(row)) row.classList.add("exercise-group-linked");

    const badge = row.querySelector('[id^="exgroupbadge_"]');
    if (badge) {
      badge.textContent = context.groupLabel;
      badge.classList.remove("hidden");
    }
  });
}

function getRestTimerSecondsForExercise(exerciseName) {
  const base = Math.max(30, Number(settings.defaultRestTime) || 90);
  const compound = Math.max(60, Number(settings.defaultCompoundRestTime) || Math.max(base, 150));
  const isolation = Math.max(30, Number(settings.defaultIsolationRestTime) || Math.max(30, Math.min(base, 90)));

  const info = typeof getExerciseInfo === "function" ? getExerciseInfo(exerciseName) : null;
  if (info && info.category === "compound") return compound;
  if (info && info.category === "isolation") return isolation;

  if (!info && typeof getSmartRestTime === "function") {
    const smart = Number(getSmartRestTime(exerciseName)) || 0;
    if (smart > 0) return smart;
  }

  return base;
}

function triggerAutoRestTimer(row, source) {
  if (!row) return;
  const rowId = String(row.id || "");
  const rowIndex = Number(rowId.replace("exrow_", "")) || 0;
  if (!rowIndex) return;

  const nameInput = row.querySelector('[id^="exname_"]');
  const setsInput = row.querySelector('[id^="exsets_"]');
  const repsInput = row.querySelector('[id^="exreps_"]');
  const exerciseName = (nameInput && nameInput.value ? String(nameInput.value) : "").trim();
  const sets = Number(setsInput && setsInput.value) || 0;
  const reps = Number(repsInput && repsInput.value) || 0;
  if (!exerciseName || sets <= 0 || reps <= 0) return;

  const groupContext = getExerciseGroupContext(row);
  if (groupContext && groupContext.isGrouped && !groupContext.isGroupEnd) {
    if (focusNextExerciseRow(row)) {
      if (source === "enter") {
        showToast(groupContext.groupLabel + " linked. Finish the group before resting.", "info");
      }
    }
    return;
  }

  const now = Date.now();
  const lastTs = Number(row.dataset.autoRestTs || 0);
  if (now - lastTs < 900) return;
  row.dataset.autoRestTs = String(now);

  const restSeconds = groupContext && groupContext.isGrouped
    ? (getGroupedRestSeconds(groupContext) || getRestTimerSecondsForExercise(exerciseName))
    : getRestTimerSecondsForExercise(exerciseName);
  const timerRowIndex = groupContext && groupContext.isGrouped ? groupContext.endIndex : rowIndex;
  startTimer(restSeconds, exerciseName, timerRowIndex);

  if (source === "enter") {
    focusNextExerciseRow(row);
  }
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
        if (next) {
          next.focus();
        } else {
          triggerAutoRestTimer(row, "enter");
        }
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const step = input.id.includes("wt_") || input.id.includes("targetwt_") ? 2.5 : 1;
        const sign = e.key === "ArrowUp" ? 1 : -1;
        const val = Number(input.value || 0) + sign * step;
        input.value = String(Math.max(0, Math.round(val * 10) / 10));
        e.preventDefault();
      }
    });

    input.addEventListener("blur", () => {
      if (input.id && input.id.indexOf("exwt_") === 0) {
        triggerAutoRestTimer(row, "blur");
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

function summarizeExerciseSets(exercise) {
  if (!exercise) return "";
  if (Array.isArray(exercise.sets) && exercise.sets.length) {
    const rows = exercise.sets
      .map((set) => ({ weight: Number(set && set.weight) || 0, reps: Number(set && set.reps) || 0 }))
      .filter((set) => set.weight > 0 || set.reps > 0);
    if (!rows.length) return "";
    const bestSet = rows.reduce((best, set) => {
      const bestScore = typeof calculate1RM === "function" ? calculate1RM(best.weight, best.reps) : best.weight;
      const nextScore = typeof calculate1RM === "function" ? calculate1RM(set.weight, set.reps) : set.weight;
      return nextScore > bestScore ? set : best;
    }, rows[0]);
    if (bestSet.weight > 0 && bestSet.reps > 0) {
      return rows.length + " sets • best " + bestSet.weight + "x" + bestSet.reps;
    }
    return rows.length + " sets";
  }

  const setCount = Math.max(1, parseInt(exercise.sets, 10) || 1);
  const reps = Number(exercise.reps) || 0;
  const weight = Number(exercise.weight) || 0;
  if (weight > 0 && reps > 0) return setCount + "x" + reps + " @ " + weight;
  if (reps > 0) return setCount + "x" + reps;
  if (weight > 0) return setCount + " sets @ " + weight;
  return setCount + " sets";
}

function getExercise1RMForDisplay(exercise) {
  if (!exercise) return 0;
  const existing = Number(exercise.est1RM);
  if (Number.isFinite(existing) && existing > 0) return existing;
  if (typeof calculateExerciseEstimated1RM === "function") {
    return calculateExerciseEstimated1RM(exercise);
  }
  if (typeof calculate1RM !== "function") return 0;
  if (Array.isArray(exercise.sets) && exercise.sets.length) {
    return exercise.sets.reduce((best, set) => {
      return Math.max(best, calculate1RM(set && set.weight, set && set.reps));
    }, 0);
  }
  return calculate1RM(exercise.weight, exercise.reps);
}

function renderWorkoutSetPreview(workout) {
  const exercises = workout && Array.isArray(workout.exercises) ? workout.exercises : [];
  if (!exercises.length) return "";

  const unit = settings.weightUnit || "kg";
  const lines = exercises
    .map((ex) => {
      const name = (ex && ex.name ? String(ex.name) : "").trim();
      if (!name) return "";
      const setSummary = summarizeExerciseSets(ex);
      const est1RM = getExercise1RMForDisplay(ex);
      if (!setSummary && est1RM <= 0) return "";
      const detail = setSummary + (est1RM > 0 ? " • 1RM " + est1RM.toFixed(1) + " " + unit : "");
      return '<div class="workout-set-line"><span class="workout-set-name">' + esc(name) + '</span><span class="workout-set-detail">' + esc(detail) + "</span></div>";
    })
    .filter(Boolean);

  if (!lines.length) return "";

  const visible = lines.slice(0, 2).join("");
  const more = lines.length > 2
    ? '<div class="workout-set-more">+' + (lines.length - 2) + " more exercise" + (lines.length - 2 === 1 ? "" : "s") + "</div>"
    : "";
  return '<div class="workout-set-preview">' + visible + "</div>" + more;
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
  const beginnerMode = (settings && settings.experienceLevel || 'beginner') === 'beginner';
  const linkWithNext = !!ex.linkWithNext;
  const groupType = ex.groupType || "superset";
  return '' +
    '<div class="form-group dense-col-3"><input type="text" placeholder="Exercise name" id="exname_' + index + '" value="' + escAttr(ex.name || "") + '"></div>' +
    '<button class="btn btn-outline btn-sm dense-col-1" data-browse-row="' + index + '" aria-label="Browse exercises" title="Browse by muscle group" style="font-size:13px;padding:0">LIB</button>' +
    '<button class="btn btn-outline btn-sm dense-col-1" onclick="if(typeof showExerciseDetailModal === \'function\') showExerciseDetailModal($(\'exname_' + index + '\').value)" aria-label="Exercise info" title="View Details" style="font-size:16px;padding:0">ℹ️</button>' +
    '<div class="form-group dense-col-2"><input type="number" placeholder="Sets" id="exsets_' + index + '" value="' + (ex.sets || "") + '"></div>' +
    '<div class="form-group dense-col-2"><input type="number" placeholder="Reps" id="exreps_' + index + '" value="' + (ex.reps || "") + '"></div>' +
    '<div class="form-group dense-col-2"><input type="number" placeholder="Wt" id="exwt_' + index + '" value="' + (ex.weight || "") + '"></div>' +
    '<button class="btn btn-outline btn-sm dense-col-1" data-remove-row aria-label="Remove exercise row">✕</button>' +
    '<div class="dense-col-12 progression-chip hidden" id="exprg_' + index + '"></div>' +
    '<div class="dense-col-12 exercise-grouping-row">' +
      '<label class="exercise-group-link" for="exlinknext_' + index + '">' +
        '<input type="checkbox" id="exlinknext_' + index + '"' + (linkWithNext ? ' checked' : '') + '>' +
        '<span>Link with next</span>' +
      '</label>' +
      '<select id="exgrouptype_' + index + '" class="exercise-group-type"' + (linkWithNext ? '' : ' disabled') + '>' + getExerciseGroupTypeOptionsHtml(groupType) + '</select>' +
      '<span class="exercise-group-badge hidden" id="exgroupbadge_' + index + '"></span>' +
    '</div>' +
    '<div class="dense-col-12 exercise-advanced-toggle-wrap" style="display:flex; justify-content:space-between; align-items:center;">' +
      (beginnerMode
        ? '<span class="text-xs" style="color:var(--text2)">Beginner mode: advanced targets are hidden</span>'
        : '<button class="btn btn-outline btn-sm exercise-advanced-toggle" data-action="toggle-ex-advanced" aria-expanded="false">Advanced targets & setup</button>') +
      '<button class="btn btn-primary btn-sm" onclick="startTimer(settings.defaultRestTime || 60, $(\'exname_' + index + '\').value, ' + index + ')" style="border-radius:20px; padding:2px 12px; font-size:11px;">⏱️ Rest</button>' +
    '</div>' +
    '<div class="dense-col-12 exercise-advanced' + (beginnerMode ? ' hidden' : ' hidden') + '" id="exadv_' + index + '">' +
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

function bindExerciseGroupingControls(row, index) {
  const linkToggle = $("exlinknext_" + index);
  const typeSelect = $("exgrouptype_" + index);
  const nameInput = $("exname_" + index);
  const update = () => refreshExerciseGroupVisuals();

  if (linkToggle) linkToggle.addEventListener("change", update);
  if (typeSelect) typeSelect.addEventListener("change", update);
  if (nameInput) {
    nameInput.addEventListener("input", update);
    nameInput.addEventListener("change", update);
  }
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
    carbs: entry.carbs, fat: entry.fat,
    fiber: parseMicronutrientValue(entry.fiber, 1),
    sugar: parseMicronutrientValue(entry.sugar, 1),
    sodium: parseMicronutrientValue(entry.sodium, 0),
    serving: entry.serving, meal: entry.meal,
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
    fiber: parseMicronutrientValue(fav.fiber, 1),
    sugar: parseMicronutrientValue(fav.sugar, 1),
    sodium: parseMicronutrientValue(fav.sodium, 0),
    serving: fav.serving || "", meal: fav.meal || "snack", timestamp: Date.now(),
  };
  const data = loadData(KEYS.food);
  data.push(entry);
  saveData(KEYS.food, data);
  notifyDataChangedFromLog("quickAddFavorite");
  showToast(esc(fav.name) + " added! ⭐");
}

function mealLabelFromKey(mealKey) {
  return ({ breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" }[mealKey] || "Meal");
}

function getMealTemplateItemsFromCurrentMeal() {
  const selectedDate = ($("foodDate") && $("foodDate").value) || today();
  const selectedMeal = ($("foodMeal") && $("foodMeal").value) || "breakfast";
  const fromLog = loadData(KEYS.food)
    .filter((f) => f.date === selectedDate && f.meal === selectedMeal)
    .map((f) => ({
      name: f.name || "",
      calories: Number(f.calories) || 0,
      protein: Number(f.protein) || 0,
      carbs: Number(f.carbs) || 0,
      fat: Number(f.fat) || 0,
      fiber: parseMicronutrientValue(f.fiber, 1),
      sugar: parseMicronutrientValue(f.sugar, 1),
      sodium: parseMicronutrientValue(f.sodium, 0),
      serving: f.serving || "",
    }))
    .filter((f) => f.name);

  if (fromLog.length) return fromLog;

  const name = ($("foodName") && $("foodName").value.trim()) || "";
  if (!name) return [];
  const pro = parseInt($("foodProtein").value) || 0;
  const carb = parseInt($("foodCarbs").value) || 0;
  const fat = parseInt($("foodFat").value) || 0;
  const fiber = parseMicronutrientValue($("foodFiber") ? $("foodFiber").value : 0, 1);
  const sugar = parseMicronutrientValue($("foodSugar") ? $("foodSugar").value : 0, 1);
  const sodium = parseMicronutrientValue($("foodSodium") ? $("foodSodium").value : 0, 0);
  const caloriesInput = parseInt($("foodCalories").value) || 0;
  return [{
    name,
    calories: caloriesInput || Math.round(pro * 4 + carb * 4 + fat * 9),
    protein: pro,
    carbs: carb,
    fat,
    fiber,
    sugar,
    sodium,
    serving: ($("foodServing") && $("foodServing").value.trim()) || "",
  }];
}

function refreshMealTemplateMeta() {
  const meta = $("mealTemplateMeta");
  const select = $("mealTemplateSelect");
  if (!meta || !select) return;
  const tpl = loadData(KEYS.mealTemplates).find((t) => t.id === select.value);
  if (!tpl) {
    meta.textContent = "Save meals once and log all items in one tap.";
    return;
  }
  const itemCount = Array.isArray(tpl.items) ? tpl.items.length : 0;
  const totalCalories = (tpl.items || []).reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
  const totalFiber = (tpl.items || []).reduce((sum, item) => sum + (Number(item.fiber) || 0), 0);
  const totalSodium = (tpl.items || []).reduce((sum, item) => sum + (Number(item.sodium) || 0), 0);
  meta.textContent = itemCount + " items • " + totalCalories + " kcal • Fi " + totalFiber.toFixed(1).replace(/\.0$/, "") + "g • Na " + Math.round(totalSodium) + "mg • " + mealLabelFromKey(tpl.meal || "");
}

function refreshMealTemplates() {
  const select = $("mealTemplateSelect");
  const multiplier = $("mealTemplateMultiplier");
  const card = $("mealTemplatesCard");
  if (!select || !multiplier || !card) return;

  const templates = loadData(KEYS.mealTemplates);
  if (!templates.length) {
    card.classList.remove("hidden");
    select.innerHTML = '<option value="">No saved meals yet</option>';
    select.value = "";
    select.disabled = true;
    return refreshMealTemplateMeta();
  }

  const prev = select.value;
  select.disabled = false;
  select.innerHTML = '<option value="">Select a saved meal</option>' + templates
    .map((tpl) => '<option value="' + escAttr(tpl.id) + '">' + esc(tpl.name || "Meal Template") + '</option>')
    .join("");
  if (prev && templates.some((tpl) => tpl.id === prev)) select.value = prev;
  if (!select.value) select.value = templates[0].id;
  if (!multiplier.value) multiplier.value = "1";
  refreshMealTemplateMeta();
}

function saveMealTemplate() {
  const meal = ($("foodMeal") && $("foodMeal").value) || "breakfast";
  const items = getMealTemplateItemsFromCurrentMeal();
  if (!items.length) {
    showToast("Log a meal or fill the form before saving a template", "info");
    return;
  }

  const suggested = mealLabelFromKey(meal) + " Template";
  const name = (window.prompt("Template name", suggested) || "").trim();
  if (!name) return;

  const templates = loadData(KEYS.mealTemplates);
  const existing = templates.find((tpl) => (tpl.name || "").toLowerCase() === name.toLowerCase());
  const next = {
    id: existing ? existing.id : uid(),
    name,
    meal,
    items,
    updatedAt: Date.now(),
    createdAt: existing && existing.createdAt ? existing.createdAt : Date.now(),
  };

  if (existing) {
    const idx = templates.findIndex((tpl) => tpl.id === existing.id);
    templates[idx] = next;
    showToast("Template updated", "success");
  } else {
    templates.push(next);
    showToast("Meal template saved", "success");
  }

  saveData(KEYS.mealTemplates, templates);
  refreshMealTemplates();
  const select = $("mealTemplateSelect");
  if (select) select.value = next.id;
  refreshMealTemplateMeta();
}

function applyMealTemplate() {
  const select = $("mealTemplateSelect");
  if (!select || !select.value) {
    showToast("Select a meal template first", "info");
    return;
  }
  const templates = loadData(KEYS.mealTemplates);
  const template = templates.find((tpl) => tpl.id === select.value);
  if (!template || !Array.isArray(template.items) || !template.items.length) {
    showToast("Selected template is empty", "error");
    return;
  }

  const multiplierInput = $("mealTemplateMultiplier");
  const multiplier = Math.max(0.25, Math.min(5, parseFloat(multiplierInput && multiplierInput.value) || 1));
  if (multiplierInput) multiplierInput.value = String(multiplier);
  const selectedDate = ($("foodDate") && $("foodDate").value) || today();
  const selectedMeal = ($("foodMeal") && $("foodMeal").value) || template.meal || "breakfast";

  const current = loadData(KEYS.food);
  const now = Date.now();
  const newEntries = template.items.map((item, idx) => ({
    id: uid(),
    date: selectedDate,
    meal: selectedMeal,
    name: item.name,
    calories: Math.round((Number(item.calories) || 0) * multiplier),
    protein: Math.round((Number(item.protein) || 0) * multiplier * 10) / 10,
    carbs: Math.round((Number(item.carbs) || 0) * multiplier * 10) / 10,
    fat: Math.round((Number(item.fat) || 0) * multiplier * 10) / 10,
    fiber: Math.round((Number(item.fiber) || 0) * multiplier * 10) / 10,
    sugar: Math.round((Number(item.sugar) || 0) * multiplier * 10) / 10,
    sodium: Math.round((Number(item.sodium) || 0) * multiplier),
    serving: multiplier === 1 ? (item.serving || "") : ((item.serving || "serving") + " x" + multiplier),
    timestamp: now + idx,
  }));

  saveData(KEYS.food, current.concat(newEntries));
  notifyDataChangedFromLog("applyMealTemplate");
  showToast("Added " + newEntries.length + " items from " + template.name, "success");
}

// ========== RECIPES ==========
function parseRecipeServings(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0.25, Math.min(24, Math.round(n * 100) / 100));
}

function normalizeRecipeIngredient(raw) {
  const row = raw || {};
  return {
    name: String(row.name || "").trim(),
    serving: String(row.serving || "").trim(),
    calories: Math.max(0, Math.round(Number(row.calories) || 0)),
    protein: parseMicronutrientValue(row.protein, 1),
    carbs: parseMicronutrientValue(row.carbs, 1),
    fat: parseMicronutrientValue(row.fat, 1),
    fiber: parseMicronutrientValue(row.fiber, 1),
    sugar: parseMicronutrientValue(row.sugar, 1),
    sodium: parseMicronutrientValue(row.sodium, 0),
  };
}

function calculateRecipeTotals(ingredients) {
  return (ingredients || []).reduce(
    (acc, item) => {
      const row = normalizeRecipeIngredient(item);
      acc.calories += row.calories;
      acc.protein += row.protein;
      acc.carbs += row.carbs;
      acc.fat += row.fat;
      acc.fiber += row.fiber;
      acc.sugar += row.sugar;
      acc.sodium += row.sodium;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
  );
}

function getRecipePerServing(recipe) {
  const row = recipe || {};
  const servings = parseRecipeServings(row.servings || 1);
  const totals = calculateRecipeTotals(row.ingredients || []);
  const divide = function (value, decimals) {
    const base = servings > 0 ? Number(value || 0) / servings : 0;
    return parseMicronutrientValue(base, decimals);
  };
  return {
    servings,
    calories: Math.max(0, Math.round((Number(totals.calories) || 0) / servings)),
    protein: divide(totals.protein, 1),
    carbs: divide(totals.carbs, 1),
    fat: divide(totals.fat, 1),
    fiber: divide(totals.fiber, 1),
    sugar: divide(totals.sugar, 1),
    sodium: divide(totals.sodium, 0),
  };
}

function getFoodFormIngredientSeed() {
  const name = ($("foodName") && $("foodName").value.trim()) || "";
  if (!name) return null;
  return normalizeRecipeIngredient({
    name,
    serving: ($("foodServing") && $("foodServing").value.trim()) || "",
    calories: ($("foodCalories") && $("foodCalories").value) || 0,
    protein: ($("foodProtein") && $("foodProtein").value) || 0,
    carbs: ($("foodCarbs") && $("foodCarbs").value) || 0,
    fat: ($("foodFat") && $("foodFat").value) || 0,
    fiber: ($("foodFiber") && $("foodFiber").value) || 0,
    sugar: ($("foodSugar") && $("foodSugar").value) || 0,
    sodium: ($("foodSodium") && $("foodSodium").value) || 0,
  });
}

function getRecipeIngredientRowHtml(seed) {
  const row = normalizeRecipeIngredient(seed || {});
  const rowId = uid();
  return (
    '<div class="recipe-ingredient-row" data-recipe-ingredient-row="' + rowId + '">' +
      '<div class="recipe-ingredient-row-top">' +
        '<div class="form-group"><label>Ingredient</label><input type="text" class="recipe-ingredient-name" placeholder="e.g., Chicken breast" value="' + escAttr(row.name) + '"></div>' +
        '<div class="form-group"><label>Serving</label><input type="text" class="recipe-ingredient-serving" placeholder="e.g., 150g" value="' + escAttr(row.serving) + '"></div>' +
        '<button class="btn btn-delete btn-sm recipe-ingredient-remove" data-remove-recipe-ingredient="' + rowId + '" title="Remove ingredient">✕</button>' +
      '</div>' +
      '<div class="recipe-ingredient-macros">' +
        '<div class="form-group"><label>Cal</label><input type="number" class="recipe-ingredient-calories" min="0" step="1" value="' + escAttr(String(row.calories)) + '"></div>' +
        '<div class="form-group"><label>P (g)</label><input type="number" class="recipe-ingredient-protein" min="0" step="0.1" value="' + escAttr(String(row.protein)) + '"></div>' +
        '<div class="form-group"><label>C (g)</label><input type="number" class="recipe-ingredient-carbs" min="0" step="0.1" value="' + escAttr(String(row.carbs)) + '"></div>' +
        '<div class="form-group"><label>F (g)</label><input type="number" class="recipe-ingredient-fat" min="0" step="0.1" value="' + escAttr(String(row.fat)) + '"></div>' +
        '<div class="form-group"><label>Fi (g)</label><input type="number" class="recipe-ingredient-fiber" min="0" step="0.1" value="' + escAttr(String(row.fiber)) + '"></div>' +
        '<div class="form-group"><label>Su (g)</label><input type="number" class="recipe-ingredient-sugar" min="0" step="0.1" value="' + escAttr(String(row.sugar)) + '"></div>' +
        '<div class="form-group"><label>Na (mg)</label><input type="number" class="recipe-ingredient-sodium" min="0" step="1" value="' + escAttr(String(row.sodium)) + '"></div>' +
      '</div>' +
    '</div>'
  );
}

function collectRecipeModalIngredients() {
  return Array.from(document.querySelectorAll("#recipeIngredientRows [data-recipe-ingredient-row]")).map((row) => {
    return normalizeRecipeIngredient({
      name: row.querySelector(".recipe-ingredient-name") ? row.querySelector(".recipe-ingredient-name").value : "",
      serving: row.querySelector(".recipe-ingredient-serving") ? row.querySelector(".recipe-ingredient-serving").value : "",
      calories: row.querySelector(".recipe-ingredient-calories") ? row.querySelector(".recipe-ingredient-calories").value : 0,
      protein: row.querySelector(".recipe-ingredient-protein") ? row.querySelector(".recipe-ingredient-protein").value : 0,
      carbs: row.querySelector(".recipe-ingredient-carbs") ? row.querySelector(".recipe-ingredient-carbs").value : 0,
      fat: row.querySelector(".recipe-ingredient-fat") ? row.querySelector(".recipe-ingredient-fat").value : 0,
      fiber: row.querySelector(".recipe-ingredient-fiber") ? row.querySelector(".recipe-ingredient-fiber").value : 0,
      sugar: row.querySelector(".recipe-ingredient-sugar") ? row.querySelector(".recipe-ingredient-sugar").value : 0,
      sodium: row.querySelector(".recipe-ingredient-sodium") ? row.querySelector(".recipe-ingredient-sodium").value : 0,
    });
  }).filter((row) => row.name);
}

function refreshRecipeBuilderSummary() {
  const summary = $("recipeBuilderSummary");
  if (!summary) return;
  const servings = parseRecipeServings($("recipeBuilderServings") ? $("recipeBuilderServings").value : 1);
  const ingredients = collectRecipeModalIngredients();
  const totals = calculateRecipeTotals(ingredients);
  const perServing = getRecipePerServing({ servings, ingredients });

  summary.innerHTML =
    '<div class="recipe-summary-card">' +
      '<div class="recipe-summary-label">Recipe Totals</div>' +
      '<div class="recipe-summary-value">' + totals.calories + ' kcal</div>' +
      '<div class="recipe-summary-sub">P' + totals.protein + ' C' + totals.carbs + ' F' + totals.fat + ' • Fi' + totals.fiber + ' Su' + totals.sugar + ' Na' + totals.sodium + 'mg</div>' +
    '</div>' +
    '<div class="recipe-summary-card">' +
      '<div class="recipe-summary-label">Per Serving (' + servings + ')</div>' +
      '<div class="recipe-summary-value">' + perServing.calories + ' kcal</div>' +
      '<div class="recipe-summary-sub">P' + perServing.protein + ' C' + perServing.carbs + ' F' + perServing.fat + ' • Fi' + perServing.fiber + ' Su' + perServing.sugar + ' Na' + perServing.sodium + 'mg</div>' +
    '</div>';
}

function appendRecipeIngredientRow(seed) {
  const root = $("recipeIngredientRows");
  if (!root) return;
  const currentCount = root.querySelectorAll("[data-recipe-ingredient-row]").length;
  if (currentCount >= 24) {
    showToast("Recipe limit reached (24 ingredients)", "warning");
    return;
  }
  root.insertAdjacentHTML("beforeend", getRecipeIngredientRowHtml(seed || {}));
  refreshRecipeBuilderSummary();
}

function upsertFoodItemFromRecipe(recipe) {
  const row = recipe || {};
  if (!row.id) return;
  const per = getRecipePerServing(row);
  const items = loadData(KEYS.foodItems);
  const existingIndex = items.findIndex((item) => String(item.sourceRecipeId || "") === String(row.id));
  const saved = {
    id: existingIndex >= 0 ? (items[existingIndex].id || uid()) : uid(),
    timestamp: Date.now(),
    name: row.name,
    serving: "1 serving",
    calories: per.calories,
    protein: per.protein,
    carbs: per.carbs,
    fat: per.fat,
    fiber: per.fiber,
    sugar: per.sugar,
    sodium: per.sodium,
    sourceRecipeId: row.id,
  };

  if (existingIndex >= 0) items[existingIndex] = saved;
  else items.push(saved);
  saveData(KEYS.foodItems, items);
}

function saveRecipeFromModal() {
  const nameInput = $("recipeBuilderName");
  const servingsInput = $("recipeBuilderServings");
  if (!nameInput || !servingsInput) return;

  const recipeName = nameInput.value.trim();
  if (!recipeName) {
    showToast("Recipe name is required", "warning");
    nameInput.focus();
    return;
  }

  const servings = parseRecipeServings(servingsInput.value);
  const ingredients = collectRecipeModalIngredients();
  if (!ingredients.length) {
    showToast("Add at least one ingredient", "warning");
    return;
  }

  const recipeId = ($("recipeBuilderId") && $("recipeBuilderId").value) || uid();
  const recipes = loadData(KEYS.recipes);
  const existingIndex = recipes.findIndex((row) => row.id === recipeId);
  const next = {
    id: recipeId,
    name: recipeName,
    servings,
    ingredients,
    updatedAt: Date.now(),
    createdAt: existingIndex >= 0 && recipes[existingIndex].createdAt ? recipes[existingIndex].createdAt : Date.now(),
  };

  if (existingIndex >= 0) recipes[existingIndex] = next;
  else recipes.push(next);

  saveData(KEYS.recipes, recipes);
  upsertFoodItemFromRecipe(next);
  closeModal();
  refreshRecipeQuickList();
  notifyDataChangedFromLog("saveRecipe");
  showToast(existingIndex >= 0 ? "Recipe updated" : "Recipe saved", "success");
}

function openRecipeBuilderModal(recipeId) {
  const recipes = loadData(KEYS.recipes);
  const existing = recipeId ? recipes.find((row) => row.id === recipeId) : null;
  const seedIngredient = getFoodFormIngredientSeed();
  const seedRows = existing && Array.isArray(existing.ingredients) && existing.ingredients.length
    ? existing.ingredients
    : (seedIngredient ? [seedIngredient] : [{}]);

  const modal = $("modalContainer");
  if (!modal) return;

  modal.innerHTML =
    '<div class="modal-overlay" id="recipeBuilderOverlay">' +
      '<div class="modal recipe-builder-modal" id="recipeBuilderModal">' +
        '<div class="modal-drag-handle"></div>' +
        '<div class="recipe-builder-head mb-8">' +
          '<div class="modal-title">🥣 Recipe Builder</div>' +
          '<button class="modal-close" id="recipeBuilderClose" aria-label="Close">✕</button>' +
        '</div>' +
        '<input type="hidden" id="recipeBuilderId" value="' + escAttr(existing ? existing.id : "") + '">' +
        '<div class="form-group">' +
          '<label>Recipe Name</label>' +
          '<input type="text" id="recipeBuilderName" placeholder="e.g., Chicken rice bowl" value="' + escAttr(existing ? existing.name : "") + '">' +
        '</div>' +
        '<div class="recipe-builder-top-row">' +
          '<div class="form-group" style="flex:0 0 140px">' +
            '<label>Total Servings</label>' +
            '<input type="number" id="recipeBuilderServings" min="0.25" max="24" step="0.25" value="' + escAttr(String(existing ? parseRecipeServings(existing.servings) : 1)) + '">' +
          '</div>' +
          '<div class="recipe-builder-top-actions">' +
            '<button class="btn btn-outline btn-sm" data-action="recipeAddFromForm">+ Add From Food Form</button>' +
            '<button class="btn btn-outline btn-sm" data-action="recipeAddIngredient">+ Add Ingredient</button>' +
          '</div>' +
        '</div>' +
        '<div id="recipeIngredientRows" class="recipe-ingredients-wrap"></div>' +
        '<div id="recipeBuilderSummary" class="recipe-builder-summary"></div>' +
        '<div class="recipe-builder-actions">' +
          '<button class="btn btn-outline" data-action="cancelRecipeBuilder">Cancel</button>' +
          '<button class="btn btn-primary" data-action="saveRecipeBuilder">Save Recipe</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  const overlay = $("recipeBuilderOverlay");
  const modalBody = $("recipeBuilderModal");
  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });
  }
  if (modalBody) {
    modalBody.addEventListener("click", function (e) {
      const closeBtn = e.target.closest("#recipeBuilderClose");
      if (closeBtn) {
        closeModal();
        return;
      }
      const actionEl = e.target.closest("[data-action]");
      if (actionEl && actionEl.dataset.action === "cancelRecipeBuilder") {
        closeModal();
        return;
      }
      if (actionEl && actionEl.dataset.action === "saveRecipeBuilder") {
        saveRecipeFromModal();
        return;
      }
      if (actionEl && actionEl.dataset.action === "recipeAddIngredient") {
        appendRecipeIngredientRow({});
        return;
      }
      if (actionEl && actionEl.dataset.action === "recipeAddFromForm") {
        const seed = getFoodFormIngredientSeed();
        if (!seed || !seed.name) {
          showToast("Fill the food form first", "info");
          return;
        }
        appendRecipeIngredientRow(seed);
        return;
      }
      const removeBtn = e.target.closest("[data-remove-recipe-ingredient]");
      if (removeBtn) {
        const row = removeBtn.closest("[data-recipe-ingredient-row]");
        if (row) row.remove();
        if (!document.querySelector("#recipeIngredientRows [data-recipe-ingredient-row]")) appendRecipeIngredientRow({});
        refreshRecipeBuilderSummary();
      }
    });

    modalBody.addEventListener("input", function (e) {
      if (e.target && (e.target.id === "recipeBuilderServings" || e.target.closest("[data-recipe-ingredient-row]"))) {
        refreshRecipeBuilderSummary();
      }
    });
  }

  seedRows.forEach((seed) => appendRecipeIngredientRow(seed));
  refreshRecipeBuilderSummary();
  setTimeout(function () {
    if ($("recipeBuilderName")) $("recipeBuilderName").focus();
  }, 80);
}

function deleteRecipe(recipeId) {
  const id = String(recipeId || "").trim();
  if (!id) return;
  showConfirmModal("Delete Recipe", "🥣", "Remove this recipe and its reusable food item?", function () {
    saveData(KEYS.recipes, loadData(KEYS.recipes).filter((row) => row.id !== id));
    saveData(KEYS.foodItems, loadData(KEYS.foodItems).filter((row) => String(row.sourceRecipeId || "") !== id));
    refreshRecipeQuickList();
    notifyDataChangedFromLog("deleteRecipe");
    showToast("Recipe deleted", "info");
  });
}

function quickAddRecipe(recipeId) {
  const recipe = loadData(KEYS.recipes).find((row) => row.id === recipeId);
  if (!recipe) return;
  const per = getRecipePerServing(recipe);
  const selectedDate = ($("foodDate") && $("foodDate").value) || today();
  const selectedMeal = ($("foodMeal") && $("foodMeal").value) || "snack";

  const entry = {
    id: uid(),
    date: selectedDate,
    meal: selectedMeal,
    name: recipe.name,
    calories: per.calories,
    protein: per.protein,
    carbs: per.carbs,
    fat: per.fat,
    fiber: per.fiber,
    sugar: per.sugar,
    sodium: per.sodium,
    serving: "1 serving",
    recipeId: recipe.id,
    timestamp: Date.now(),
  };

  const food = loadData(KEYS.food);
  food.push(entry);
  saveData(KEYS.food, food);
  notifyDataChangedFromLog("quickAddRecipe");
  showToast(recipe.name + " added from recipe", "success");
}

function refreshRecipeQuickList() {
  const list = $("recipeQuickList");
  const meta = $("recipeBuilderMeta");
  if (!list || !meta) return;

  const recipes = loadData(KEYS.recipes)
    .slice()
    .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));

  if (!recipes.length) {
    list.innerHTML = "";
    meta.textContent = "Create home-cooked recipes with per-serving macros and reuse them anytime.";
    return;
  }

  list.innerHTML = recipes.slice(0, 10).map((recipe) => {
    const per = getRecipePerServing(recipe);
    return (
      '<span class="fav-chip recipe-chip" data-recipe-id="' + recipe.id + '" title="Quick add one serving">' +
        '<span class="recipe-chip-title">' + esc(recipe.name || "Recipe") + '</span>' +
        '<span class="fav-chip-cal">' + per.calories + 'cal</span>' +
        '<button class="fav-chip-remove" data-edit-recipe="' + recipe.id + '" title="Edit recipe">✏️</button>' +
        '<button class="fav-chip-remove" data-remove-recipe="' + recipe.id + '" title="Delete recipe">✕</button>' +
      '</span>'
    );
  }).join("");

  meta.textContent = recipes.length + " recipes saved • tap a chip to quick add one serving";
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
  const fiberRaw = $("foodFiber") ? $("foodFiber").value : "";
  const sugarRaw = $("foodSugar") ? $("foodSugar").value : "";
  const sodiumRaw = $("foodSodium") ? $("foodSodium").value : "";
  if (cal < 0 || pro < 0 || carb < 0 || fat < 0 || Number(fiberRaw) < 0 || Number(sugarRaw) < 0 || Number(sodiumRaw) < 0) {
    showToast("Values cannot be negative", "error");
    return;
  }
  const fiber = parseMicronutrientValue(fiberRaw, 1);
  const sugar = parseMicronutrientValue(sugarRaw, 1);
  const sodium = parseMicronutrientValue(sodiumRaw, 0);

  const date = $("foodDate").value || today();
  const editId = $("foodEditId").value;

  const entry = {
    id: editId || uid(), date, name,
    calories: cal || Math.round(pro * 4 + carb * 4 + fat * 9),
    protein: pro, carbs: carb, fat,
    fiber, sugar, sodium,
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
  ["foodName", "foodCalories", "foodProtein", "foodCarbs", "foodFat", "foodFiber", "foodSugar", "foodSodium", "foodServing"].forEach((id) => ($(id).value = ""));
  $("foodDate").value = today();
  $("foodCalories").dataset.manualEntry = "";
  refreshCalorieGuidance();
  refreshMicronutrientHints();
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
  if ($("foodFiber")) $("foodFiber").value = parseMicronutrientValue(food.fiber, 1) || "";
  if ($("foodSugar")) $("foodSugar").value = parseMicronutrientValue(food.sugar, 1) || "";
  if ($("foodSodium")) $("foodSodium").value = parseMicronutrientValue(food.sodium, 0) || "";
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
  refreshMicronutrientHints();
  setTimeout(() => $("foodName").focus(), 300);
}

function cancelEditFood() {
  $("foodEditId").value = "";
  $("foodFormTitle").textContent = "Log Food";
  $("foodSubmitBtn").textContent = "Log Food";
  $("foodCancelEdit").classList.add("hidden");
  ["foodName", "foodCalories", "foodProtein", "foodCarbs", "foodFat", "foodFiber", "foodSugar", "foodSodium", "foodServing"].forEach((id) => ($(id).value = ""));
  $("foodDate").value = today();
  $("foodCalories").dataset.manualEntry = "";
  refreshCalorieGuidance();
  refreshMicronutrientHints();
}

function duplicateFood(id) {
  const food = loadData(KEYS.food).find((f) => f.id === id);
  if (!food) return;
  const entry = {
    id: uid(), date: today(), name: food.name,
    calories: food.calories || 0, protein: food.protein || 0,
    carbs: food.carbs || 0, fat: food.fat || 0,
    fiber: parseMicronutrientValue(food.fiber, 1),
    sugar: parseMicronutrientValue(food.sugar, 1),
    sodium: parseMicronutrientValue(food.sodium, 0),
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
  bindExerciseGroupingControls(row, exerciseRowCount);
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
      const chip = $('exprg_' + idx);
      if (chip) {
        chip.classList.add('hidden');
        chip.textContent = '';
      }
      if (!name) return;
      const last = typeof getLastSessionForExercise === 'function' ? getLastSessionForExercise(name) : null;
      const suggestion = typeof getSuggestedProgression === 'function' ? getSuggestedProgression(name) : null;
      if (suggestion) {
        const setsEl = $('exsets_' + idx), repsEl = $('exreps_' + idx), wtEl = $('exwt_' + idx);
        if (setsEl && !setsEl.value) setsEl.value = suggestion.sets || '';
        if (repsEl && !repsEl.value) repsEl.value = suggestion.reps || '';
        if (wtEl && !wtEl.value) wtEl.value = suggestion.weight || '';
        if (chip) {
          const lastText = last
            ? ((last.weight || 0) + 'kg × ' + (last.reps || 0) + ' × ' + (last.sets || 0) + ' sets')
            : 'No history';
          const suggestedText = (suggestion.weight || 0) + 'kg × ' + (suggestion.reps || 0) + ' × ' + (suggestion.sets || 0) + ' sets';
          chip.textContent = 'Last: ' + lastText + ' -> Suggested: ' + suggestedText + (suggestion.note ? ' (' + suggestion.note + ')' : '');
          chip.classList.remove('hidden');
        }
      } else if (chip) {
        chip.textContent = 'No prior sessions for this movement yet. Log once to unlock progressive suggestions.';
        chip.classList.remove('hidden');
      }
      refreshExerciseGroupVisuals();
    });
  }
  refreshExerciseGroupVisuals();
}

function openExerciseBrowserForRow(rowIndex) {
  let targetRowIndex = Number(rowIndex || 0);
  if (!targetRowIndex) {
    addExerciseRow();
    targetRowIndex = exerciseRowCount;
  }
  if (typeof showExerciseBrowserModal === "function") {
    showExerciseBrowserModal(targetRowIndex);
    return;
  }
  showToast("Exercise browser is unavailable", "warning");
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
  const groupIdByStartRow = {};
  let groupCounter = 0;
  for (let i = 1; i <= exerciseRowCount; i++) {
    const el = $("exname_" + i);
    if (!el) continue;
    const eName = el.value.trim();
    if (!eName) continue;
    const row = el.closest('.stat-row[id^="exrow_"]');
    const groupContext = row ? getExerciseGroupContext(row) : null;
    const linkWithNext = row ? isExerciseRowLinkedWithNext(row) : false;
    let groupId = null;
    let groupRole = null;
    let groupType = null;
    if (groupContext && groupContext.isGrouped) {
      const startKey = groupContext.startRow && groupContext.startRow.id ? groupContext.startRow.id : "";
      if (startKey) {
        if (!groupIdByStartRow[startKey]) {
          groupCounter++;
          groupIdByStartRow[startKey] = "grp_" + groupCounter;
        }
        groupId = groupIdByStartRow[startKey];
      }
      groupType = groupContext.groupType;
      if (groupContext.isGroupStart) groupRole = "start";
      else if (groupContext.isGroupEnd) groupRole = "end";
      else groupRole = "middle";
    }
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
      linkWithNext,
      groupType,
      groupId,
      groupRole,
    };
    exObj.effectiveLoad = computeEffectiveLoad(exObj, exObj, userBodyweight);
    exObj.est1RM = typeof calculateExerciseEstimated1RM === "function"
      ? calculateExerciseEstimated1RM(exObj)
      : (typeof calculate1RM === "function" ? calculate1RM(exObj.weight, exObj.reps) : 0);
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

  const prs = typeof checkWorkoutForPRs === 'function'
    ? checkWorkoutForPRs(exercises, date)
    : [];

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
      est_1rm: ex.est1RM || 0,
      group_type: ex.groupType || null,
      group_id: ex.groupId || null,
      group_role: ex.groupRole || null,
      link_with_next: ex.linkWithNext ? "true" : "false",
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
        const setCount = Math.max(1, ex.sets || 1);
        const setRows = [];
        for (let si = 0; si < setCount; si++) {
          setRows.push({ weight: ex.weight, reps: ex.reps, rpe: ex.rpe });
        }
        return {
          name: ex.name,
          sets: setRows,
          setsCount: setCount,
          reps: ex.reps,
          weight: ex.weight,
          linkWithNext: !!ex.linkWithNext,
          groupType: ex.groupType || null,
          groupId: ex.groupId || null,
          groupRole: ex.groupRole || null,
        };
      });
      setTimeout(function () { showPostWorkoutSummary(summaryEntry, prs); }, prs.length > 0 ? 2500 : 800);
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
        const setCount = Math.max(1, ex.sets || 1);
        const setRows = [];
        for (let si = 0; si < setCount; si++) {
          setRows.push({ weight: ex.weight, reps: ex.reps, rpe: ex.rpe });
        }
        return {
          name: ex.name,
          sets: setRows,
          setsCount: setCount,
          reps: ex.reps,
          weight: ex.weight,
          linkWithNext: !!ex.linkWithNext,
          groupType: ex.groupType || null,
          groupId: ex.groupId || null,
          groupRole: ex.groupRole || null,
        };
      });
      setTimeout(function () { showPostWorkoutSummary(summaryEntry, []); }, 800);
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
let _timerEstimatedStartCalories = 0;
let _timerBurnRatePerMin = 0;
let _timerRowIndex = 0;
let _timerLastVoiceSecond = null;

function clearTimerFocusMode() {
  document.body.classList.remove("workout-focus-mode", "timer-locked");
  document.querySelectorAll(".exercise-focus-active").forEach((row) => {
    row.classList.remove("exercise-focus-active");
  });
}

function applyTimerFocusMode(rowIndex) {
  clearTimerFocusMode();
  if (settings.autoLock) {
    document.body.classList.add("timer-locked");
  }
  if (!settings.focusMode) return;
  document.body.classList.add("workout-focus-mode");
  const activeRow = $("exrow_" + Number(rowIndex || 0));
  if (activeRow) activeRow.classList.add("exercise-focus-active");
}

function announceCountdownSecond(sec) {
  if (!settings.voiceCountdown) return;
  if (!("speechSynthesis" in window)) return;
  if (sec === _timerLastVoiceSecond) return;
  _timerLastVoiceSecond = sec;
  const utterance = new SpeechSynthesisUtterance(String(sec));
  utterance.rate = 1.02;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function autoAdvanceToNextExercise(rowIndex) {
  if (!settings.autoAdvance) return;
  const current = Number(rowIndex || 0);
  if (!current) return;
  const nextRow = $("exrow_" + (current + 1));
  if (!nextRow) return;
  const nextName = $("exname_" + (current + 1));
  if (nextName) {
    nextName.focus();
    nextName.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

function getTimerExerciseContext(nextExName, rowIndex) {
  let idx = Number(rowIndex) || 0;
  const normalizedName = (nextExName || "").trim().toLowerCase();

  if (!idx && normalizedName) {
    for (let i = 1; i <= exerciseRowCount; i++) {
      const nameEl = $("exname_" + i);
      if (nameEl && (nameEl.value || "").trim().toLowerCase() === normalizedName) {
        idx = i;
        break;
      }
    }
  }

  const nameEl = idx ? $("exname_" + idx) : null;
  const setsEl = idx ? $("exsets_" + idx) : null;
  const repsEl = idx ? $("exreps_" + idx) : null;
  const wtEl = idx ? $("exwt_" + idx) : null;

  const name = ((nameEl && nameEl.value) || nextExName || "Next Exercise").trim();
  const totalSets = Math.max(1, parseInt((setsEl && setsEl.value) || "1", 10) || 1);
  const reps = parseInt((repsEl && repsEl.value) || "0", 10) || 0;
  const weight = parseFloat((wtEl && wtEl.value) || "0") || 0;

  const info = typeof getExerciseInfo === "function" ? getExerciseInfo(name) : null;
  let tip = "Focus on controlled tempo and strong bracing before your next set.";
  if (info) {
    const firstTip = Array.isArray(info.formTips) && info.formTips.length ? info.formTips[0] : null;
    tip = (firstTip && firstTip.description) || info.tips || tip;
  }

  return {
    name,
    setLabel: "SET 1 OF " + totalSets,
    target: (weight > 0 ? weight + " " + settings.weightUnit : "Bodyweight") + " • " + (reps > 0 ? reps + " reps" : "AMRAP"),
    tip,
  };
}

function renderTimerNextSet(nextExName, rowIndex) {
  const nextSetEl = $("timerNextSet");
  if (!nextSetEl) return;
  const context = getTimerExerciseContext(nextExName, rowIndex);
  nextSetEl.innerHTML =
    '<div class="timer-next-head"><span class="timer-next-badge">NEXT SET</span><span class="timer-next-count">' + esc(context.setLabel) + "</span></div>" +
    '<div class="timer-next-name"><span class="material-symbols-outlined">fitness_center</span>' + esc(context.name) + "</div>" +
    '<div class="timer-next-target">🏋️ ' + esc(context.target) + "</div>" +
    '<div class="timer-form-tip">' + esc(context.tip) + "</div>";
}

function updateTimerLiveStats() {
  const elapsedSeconds = Math.max(0, _timerTotal - _timerRemaining);
  const estCalories = Math.max(0, _timerEstimatedStartCalories + (elapsedSeconds / 60) * _timerBurnRatePerMin);
  if ($("timerCal")) {
    $("timerCal").textContent = Math.round(estCalories) + " KCAL";
  }
  if ($("timerHR") && !$("timerHR").textContent.trim()) {
    $("timerHR").textContent = "— BPM";
  }
}

function startTimer(seconds, nextExName, rowIndex) {
  stopTimer();
  _timerTotal = seconds || (settings.defaultRestTime || 60);
  _timerRemaining = _timerTotal;
  _timerRowIndex = Number(rowIndex) || 0;
  _timerLastVoiceSecond = null;

  const userBodyweight = getPrimaryBodyweight ? (getPrimaryBodyweight() || 70) : 70;
  _timerBurnRatePerMin = Math.max(3.5, userBodyweight * 0.1);
  const workoutCaloriesInput = parseFloat((($("workoutCalories") && $("workoutCalories").value) || "0")) || 0;
  const durInputVal = parseFloat((($("workoutDuration") && $("workoutDuration").value) || "0")) || 0;
  _timerEstimatedStartCalories = workoutCaloriesInput > 0 ? workoutCaloriesInput : durInputVal * _timerBurnRatePerMin;
  
  const overlay = $("timerOverlay");
  if (overlay) {
    overlay.classList.remove("hidden");
    document.body.classList.add("overlay-open");
    applyTimerFocusMode(_timerRowIndex);
    renderTimerNextSet(nextExName || ($("workoutName") ? $("workoutName").value : "Next Exercise"), rowIndex);
    updateTimerLiveStats();
    
    if (!$("skipRestBtn").hasAttribute('data-bound')) {
      $("skipRestBtn").addEventListener("click", skipRest);
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
  if (_timerRemaining > 0 && _timerRemaining <= 3) announceCountdownSecond(_timerRemaining);
  
  updateTimerLiveStats();
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
  _timerLastVoiceSecond = null;
  
  const disp = $("timerDisplay");
  if (disp) { disp.textContent = "0:00"; disp.className = "timer-display"; }
  
  const overlay = $("timerOverlay");
  if (overlay) {
    overlay.classList.add("hidden");
    document.body.classList.remove("overlay-open");
  }

  const nextSetEl = $("timerNextSet");
  if (nextSetEl) nextSetEl.innerHTML = "";
  clearTimerFocusMode();
  _timerRowIndex = 0;
}

function skipRest() {
  stopTimer();
  showToast("Rest skipped. Back to work!", "info");
}

function finishTimer() {
  const completedRow = _timerRowIndex;
  stopTimer();
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  if (settings.voiceCountdown && "speechSynthesis" in window) {
    const goUtterance = new SpeechSynthesisUtterance("Go");
    goUtterance.rate = 1.08;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(goUtterance);
  }
  autoAdvanceToNextExercise(completedRow);
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
        return '<div class="list-item"><div class="list-item-main"><div class="list-item-title">' + esc(f.name) + '<span class="entry-time">' + time + '</span></div><div class="list-item-sub">' + fmtDate(f.date) + " • " + (f.meal || "") + (f.serving ? " • " + esc(f.serving) : "") + " • P" + (f.protein || 0) + " C" + (f.carbs || 0) + " F" + (f.fat || 0) + esc(formatMicronutrientInline(f)) + '</div></div><div class="list-item-right" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><div style="font-weight:600">' + f.calories + ' cal</div><div style="display:flex;gap:4px"><button class="btn-icon" data-duplicate-food="' + f.id + '" title="Log again">🔄</button><button class="btn-icon" data-edit-food="' + f.id + '" title="Edit">✏️</button><button class="btn-delete" data-delete-food="' + f.id + '" title="Delete">✕</button></div></div></div>';
      })
      .join("");
  } else {
    $("recentFood").innerHTML = '<div class="empty"><div class="empty-icon">🍽️</div><div class="empty-text">Ready to fuel your day? 🍎</div><button class="btn btn-primary btn-sm" data-action="focusFood">Log your first meal</button></div>';
  }

  if (workouts.length) {
    $("recentWorkouts").innerHTML = workouts
      .map((w) => {
        const time = w.timestamp ? fmtTime(w.timestamp) : "";
        const setPreview = renderWorkoutSetPreview(w);
        const targetHints = (w.exercises || []).map((ex) => renderTargetChip(ex)).filter(Boolean).slice(0, 2).join("");
        return '<div class="list-item" data-open-workout="' + w.id + '"><div class="list-item-main"><div class="list-item-title">' + esc(w.name) + '<span class="entry-time">' + time + '</span></div><div class="list-item-sub">' + fmtDate(w.date) + " • " + w.type + " • " + (w.duration || 0) + " min • " + (w.exercises || []).length + ' ex</div>' + setPreview + targetHints + '</div><div class="list-item-right" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class="tag tag-blue">' + (w.caloriesBurned || 0) + ' cal</span><button class="btn-delete" data-delete-workout="' + w.id + '" title="Delete">✕</button></div></div>';
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
  refreshMealTemplates();
  refreshRecipeQuickList();
  if (typeof syncFoodVisionState === "function") syncFoodVisionState();
  refreshMicronutrientHints();
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
      else if (action === "saveMealTemplate") saveMealTemplate();
      else if (action === "applyMealTemplate") applyMealTemplate();
      else if (action === "openRecipeBuilder") openRecipeBuilderModal();
      else if (action === "cancelEditFood") cancelEditFood();
      else if (action === "clearTodayFood") clearTodayFood();
      else if (action === "logWorkout") logWorkout();
      else if (action === "browseExercises") openExerciseBrowserForRow(exerciseRowCount || 0);
      else if (action === "addExerciseRow") addExerciseRow();
      else if (action === "logBody") logBody();
      else if (action === "startTimer") startTimer(parseInt(actionEl.dataset.seconds) || 60);
      else if (action === "stopTimer") stopTimer();
      else if (action === "focusFood" && $("foodName")) $("foodName").focus();
      else if (action === "focusWorkout" && $("workoutName")) $("workoutName").focus();
      else if (action === "focusBody" && $("bodyWeight")) $("bodyWeight").focus();
      else if (action === "scanBarcode" && typeof showBarcodeScanner === 'function') showBarcodeScanner();
      else if (action === "snapFoodEstimate" && typeof showFoodVisionPicker === "function") showFoodVisionPicker();
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
    const openWorkout = e.target.closest("[data-open-workout]");
    if (openWorkout && typeof showWorkoutDetailView === "function") {
      showWorkoutDetailView(openWorkout.dataset.openWorkout);
      return;
    }

    // Body actions
    const delBody = e.target.closest("[data-delete-body]");
    if (delBody) { deleteBody(delBody.dataset.deleteBody); return; }

    // Remove exercise row
    const removeRow = e.target.closest("[data-remove-row]");
    if (removeRow) {
      const row = removeRow.closest(".stat-row");
      if (row) row.remove();
      refreshExerciseGroupVisuals();
      return;
    }
    const browseRow = e.target.closest("[data-browse-row]");
    if (browseRow) {
      openExerciseBrowserForRow(Number(browseRow.dataset.browseRow) || 0);
      return;
    }

    // Favorites
    const removeFav = e.target.closest("[data-remove-fav]");
    if (removeFav) { e.stopPropagation(); removeFavorite(removeFav.dataset.removeFav); return; }
    const favChip = e.target.closest("[data-fav-id]");
    if (favChip && !removeFav) { quickAddFavorite(favChip.dataset.favId); return; }

    // Recipes
    const removeRecipe = e.target.closest("[data-remove-recipe]");
    if (removeRecipe) { e.stopPropagation(); deleteRecipe(removeRecipe.dataset.removeRecipe); return; }
    const editRecipe = e.target.closest("[data-edit-recipe]");
    if (editRecipe) { e.stopPropagation(); openRecipeBuilderModal(editRecipe.dataset.editRecipe); return; }
    const recipeChip = e.target.closest("[data-recipe-id]");
    if (recipeChip && !removeRecipe && !editRecipe) { quickAddRecipe(recipeChip.dataset.recipeId); return; }
  });

  // Auto-calc calories
  $("foodProtein").addEventListener("input", autoCalcCalories);
  $("foodCarbs").addEventListener("input", autoCalcCalories);
  $("foodFat").addEventListener("input", autoCalcCalories);
  const foodFiber = $("foodFiber");
  const foodSugar = $("foodSugar");
  const foodSodium = $("foodSodium");
  const foodDate = $("foodDate");
  if (foodFiber) {
    foodFiber.addEventListener("input", refreshMicronutrientHints);
    foodFiber.addEventListener("change", refreshMicronutrientHints);
  }
  if (foodSugar) {
    foodSugar.addEventListener("input", refreshMicronutrientHints);
    foodSugar.addEventListener("change", refreshMicronutrientHints);
  }
  if (foodSodium) {
    foodSodium.addEventListener("input", refreshMicronutrientHints);
    foodSodium.addEventListener("change", refreshMicronutrientHints);
  }
  if (foodDate) {
    foodDate.addEventListener("change", refreshMicronutrientHints);
  }
  // Track manual calorie entry so auto-calc doesn't overwrite
  $("foodCalories").addEventListener("input", function () {
    this.dataset.manualEntry = this.value ? "1" : "";
    refreshCalorieGuidance();
  });
  refreshCalorieGuidance();
  refreshMicronutrientHints();

  // Init food database search
  if (typeof initFoodSearch === 'function') initFoodSearch();
  if (typeof initFoodVision === "function") initFoodVision();
  if (typeof syncFoodVisionState === "function") syncFoodVisionState();

  // Search
  const searchFood = $("searchFood");
  if (searchFood) searchFood.addEventListener("input", filterRecentFood);
  const searchWorkout = $("searchWorkout");
  if (searchWorkout) searchWorkout.addEventListener("input", filterRecentWorkouts);

  const mealTemplateSelect = $("mealTemplateSelect");
  if (mealTemplateSelect) mealTemplateSelect.addEventListener("change", refreshMealTemplateMeta);

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
    note.innerHTML = "Shortcuts: Enter = next field/submit. Link rows for supersets/circuits. ArrowUp/Down adjusts values. Swipe set row right = duplicate, left = delete.";
    workoutPanel.insertBefore(note, workoutPanel.firstChild);
  }
}

// Give access to exerciseRowCount for protocols
function getExerciseRowCount() { return exerciseRowCount; }
function setExerciseRowCount(val) { exerciseRowCount = val; }

