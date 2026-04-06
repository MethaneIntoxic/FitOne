// ========== WORKOUT DETAIL VIEW (W13) ==========
// Read-only drill-down for a logged workout.

(function () {
  function asNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function timeAgo(ts) {
    const diff = Math.max(0, Date.now() - (Number(ts) || 0));
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return min + "m ago";
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + "h ago";
    const d = Math.floor(hr / 24);
    return d + "d ago";
  }

  function workoutVolume(workout) {
    return (workout.exercises || []).reduce(function (sum, ex) {
      if (Array.isArray(ex.sets)) {
        return sum + ex.sets.reduce(function (s, row) {
          return s + asNum(row.weight) * asNum(row.reps);
        }, 0);
      }
      return sum + asNum(ex.weight) * asNum(ex.reps) * asNum(ex.sets);
    }, 0);
  }

  function getSetRows(exercise) {
    if (Array.isArray(exercise.sets) && exercise.sets.length) {
      return exercise.sets.map(function (s, idx) {
        return {
          set: idx + 1,
          weight: asNum(s.weight),
          reps: asNum(s.reps),
          rpe: asNum(s.rpe),
        };
      });
    }

    const setCount = Math.max(1, asNum(exercise.sets));
    const rows = [];
    for (let i = 0; i < setCount; i += 1) {
      rows.push({
        set: i + 1,
        weight: asNum(exercise.weight),
        reps: asNum(exercise.reps),
        rpe: asNum(exercise.rpe),
      });
    }
    return rows;
  }

  function getExerciseAllTimeMax(exerciseName) {
    const target = String(exerciseName || "").toLowerCase().trim();
    if (!target) return 0;
    const workouts = loadData(KEYS.workouts);
    let max = 0;
    workouts.forEach(function (w) {
      (w.exercises || []).forEach(function (ex) {
        const name = String(ex.name || "").toLowerCase().trim();
        if (name !== target) return;
        if (Array.isArray(ex.sets)) {
          ex.sets.forEach(function (s) { max = Math.max(max, asNum(s.weight)); });
        } else {
          max = Math.max(max, asNum(ex.weight));
        }
      });
    });
    return max;
  }

  function getPrimaryMuscleTag(exerciseName) {
    if (typeof getExerciseInfo !== "function") return "PRIMARY: COMPOUND";
    const info = getExerciseInfo(exerciseName);
    if (!info) return "PRIMARY: COMPOUND";
    const primary = Array.isArray(info.primary) ? info.primary : [];
    if (!primary.length) return "PRIMARY: COMPOUND";
    const labels = primary.slice(0, 2).map(function (k) {
      if (typeof MUSCLE_GROUPS === "object" && MUSCLE_GROUPS && MUSCLE_GROUPS[k]) return MUSCLE_GROUPS[k].toUpperCase();
      return String(k || "").toUpperCase();
    });
    return "PRIMARY: " + labels.join(" & ");
  }

  function isPRSet(exerciseName, weight) {
    if (typeof getPRsForExercise !== "function") return false;
    const prs = getPRsForExercise(exerciseName);
    const weightPR = prs && prs.weight && asNum(prs.weight.value);
    return weightPR > 0 && asNum(weight) >= weightPR;
  }

  function renderSummaryStats(workout) {
    const duration = asNum(workout.duration);
    const calories = asNum(workout.caloriesBurned);
    const volume = workoutVolume(workout);

    return (
      '<section class="workout-detail-summary">' +
      '<div class="workout-detail-stat"><div class="val">' + duration + '</div><div class="lbl">DURATION (MIN)</div></div>' +
      '<div class="workout-detail-stat"><div class="val">' + Math.round(volume).toLocaleString() + '</div><div class="lbl">VOLUME (KG)</div></div>' +
      '<div class="workout-detail-stat"><div class="val">—</div><div class="lbl">AVG HEART</div></div>' +
      '<div class="workout-detail-stat"><div class="val">' + calories + '</div><div class="lbl">CALORIES (KCAL)</div></div>' +
      '</section>'
    );
  }

  function renderBreakdown(workout) {
    const unit = String((settings && settings.weightUnit) || "kg").toUpperCase();
    return (
      '<section class="workout-detail-breakdown">' +
      '<div class="workout-detail-section-title">WORKOUT BREAKDOWN</div>' +
      (workout.exercises || []).map(function (ex) {
        const rows = getSetRows(ex);
        const max = getExerciseAllTimeMax(ex.name);
        const latestSetWeight = rows.length ? rows[rows.length - 1].weight : 0;
        const pct = max > 0 ? Math.round((latestSetWeight / max) * 100) : 0;

        const body = rows.map(function (r) {
          const pr = isPRSet(ex.name, r.weight);
          return '<tr>' +
            '<td>' + r.set + '</td>' +
            '<td>' + (r.weight > 0 ? r.weight + " " + unit : "—") + '</td>' +
            '<td>' + (r.reps > 0 ? r.reps : "—") + '</td>' +
            '<td>' + (r.rpe > 0 ? r.rpe.toFixed(1) : "—") + (pr ? ' <span class="workout-detail-pr-flag">PR</span>' : '') + '</td>' +
            '</tr>';
        }).join("");

        return '<article class="workout-detail-ex-card">' +
          '<div class="workout-detail-ex-head">' +
          '<div class="name">' + esc(ex.name || "Exercise") + '</div>' +
          '<div class="tag">' + esc(getPrimaryMuscleTag(ex.name)) + '</div>' +
          '</div>' +
          '<table class="workout-detail-table"><thead><tr><th>SET</th><th>WEIGHT</th><th>REPS</th><th>RPE</th></tr></thead><tbody>' + body + '</tbody></table>' +
          '<div class="workout-detail-progress-label">All-time max: ' + (max > 0 ? max.toFixed(1) + " " + unit : "—") + '</div>' +
          '<div class="workout-detail-progress"><span style="width:' + Math.max(4, Math.min(100, pct)) + '%"></span></div>' +
          '</article>';
      }).join("") +
      '</section>'
    );
  }

  function renderNotes(workout) {
    if (!workout.notes) return "";
    return (
      '<section class="workout-detail-notes">' +
      '<div class="workout-detail-section-title">WORKOUT NOTES</div>' +
      '<blockquote>' + esc(workout.notes) + '</blockquote>' +
      '</section>'
    );
  }

  function renderView(workout) {
    const displayName = (settings && settings.displayName) ? settings.displayName : "Athlete";
    const ts = Number(workout.timestamp) || new Date((workout.date || today()) + "T12:00:00").getTime();

    let avgRpe = 0;
    let rpeCount = 0;
    (workout.exercises || []).forEach(function (ex) {
      getSetRows(ex).forEach(function (r) {
        if (r.rpe > 0) {
          avgRpe += r.rpe;
          rpeCount += 1;
        }
      });
    });
    avgRpe = rpeCount ? avgRpe / rpeCount : 0;
    const intensityPct = avgRpe > 0 ? Math.min(100, Math.round((avgRpe / 10) * 100)) : 60;

    return (
      '<div class="workout-detail-overlay" id="workoutDetailOverlay">' +
      '<section class="workout-detail-panel" role="dialog" aria-label="Workout Detail">' +
      '<header class="workout-detail-header">' +
      '<button class="workout-detail-back" id="workoutDetailBack" aria-label="Back"><span class="material-symbols-outlined">arrow_back</span></button>' +
      '<div class="workout-detail-header-right">' +
      '<button class="workout-detail-share" id="workoutDetailShare" aria-label="Share"><span class="material-symbols-outlined">share</span></button>' +
      '<div class="workout-detail-avatar">' + (settings && settings.avatar ? '<img src="' + escAttr(settings.avatar) + '" alt="Avatar">' : '<span class="material-symbols-outlined">person</span>') + '</div>' +
      '</div>' +
      '</header>' +
      '<div class="workout-detail-body">' +
      '<div class="workout-detail-user">' + esc(displayName) + ' • ' + esc(timeAgo(ts)) + ' • ' + esc(workout.gymName || "FitOne") + '</div>' +
      '<h2>' + esc((workout.name || "Workout").toUpperCase()) + '</h2>' +
      '<div class="workout-detail-intensity"><span style="width:' + intensityPct + '%"></span></div>' +
      renderSummaryStats(workout) +
      renderBreakdown(workout) +
      renderNotes(workout) +
      '</div>' +
      '</section>' +
      '</div>'
    );
  }

  window.showWorkoutDetailView = function (workoutIdOrObj) {
    const workout = typeof workoutIdOrObj === "object"
      ? workoutIdOrObj
      : (loadData(KEYS.workouts).find(function (w) { return String(w.id) === String(workoutIdOrObj); }) || null);

    if (!workout) {
      showToast("Workout detail not found.", "warning");
      return;
    }

    const modal = $("modalContainer");
    if (!modal) return;
    modal.innerHTML = renderView(workout);

    const back = $("workoutDetailBack");
    if (back) back.addEventListener("click", closeModal);
    const overlay = $("workoutDetailOverlay");
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeModal();
      });
    }

    const share = $("workoutDetailShare");
    if (share) {
      share.addEventListener("click", function () {
        if (typeof showShareCardModal === "function") {
          showShareCardModal(workout, []);
        } else {
          showToast("Share module loading.", "info");
        }
      });
    }
  };
})();
