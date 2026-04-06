// ========== POST-WORKOUT SUMMARY VIEW (W8) ==========
// Shows a celebration overlay after a workout is logged

function showPostWorkoutSummary(workoutData) {
  const overlay = $("postWorkoutOverlay");
  if (!overlay) return;

  const exercises = workoutData.exercises || [];
  const duration = workoutData.duration || 0;
  const caloriesBurned = workoutData.caloriesBurned || 0;

  // Calculate total volume
  let totalVolume = 0;
  exercises.forEach(function (ex) {
    (ex.sets || []).forEach(function (s) {
      totalVolume += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
    });
  });

  // Detect PRs from this workout
  const detectedPRs = detectWorkoutPRs(workoutData);

  // Calculate muscle focus from exercises
  const muscleFocus = calculateMuscleFocus(exercises);

  // Format duration
  const hours = Math.floor(duration / 60);
  const mins = duration % 60;
  const durationStr = hours > 0 ? hours + "H " + mins + "M" : mins + "M";

  // Build HTML
  let html = '<div class="post-workout-content">';

  // Session Complete Banner (W8.1)
  html += '<div class="pw-banner">';
  html += '<div class="pw-banner-label">SESSION COMPLETE</div>';
  html += '<div class="pw-banner-name">' + esc(workoutData.name || "WORKOUT").toUpperCase() + "</div>";
  html += '<div class="pw-banner-stats">';
  html +=
    '<div class="pw-stat"><span class="material-symbols-outlined">timer</span> ' +
    durationStr +
    "</div>";
  html +=
    '<div class="pw-stat"><span class="material-symbols-outlined">local_fire_department</span> ' +
    caloriesBurned +
    " CAL</div>";
  html += "</div>";
  if (totalVolume > 0) {
    html +=
      '<div class="pw-volume-badge">' +
      formatVolume(totalVolume) +
      " " +
      settings.weightUnit.toUpperCase() +
      " TOTAL</div>";
  }
  if (detectedPRs.length > 0) {
    html +=
      '<div class="pw-pr-count">\ud83c\udfc6 ' +
      detectedPRs.length +
      " NEW PERSONAL RECORD" +
      (detectedPRs.length > 1 ? "S" : "") +
      "</div>";
  }
  html += "</div>";

  // PR Achievements (W8.2)
  if (detectedPRs.length > 0) {
    html += '<div class="pw-section">';
    html +=
      '<div class="pw-section-title"><span class="material-symbols-outlined">trending_up</span> PR ACHIEVEMENTS</div>';
    detectedPRs.forEach(function (pr) {
      html += '<div class="pw-pr-card">';
      html +=
        '<div class="pw-pr-exercise"><span class="material-symbols-outlined">fitness_center</span> ' +
        esc(pr.exercise) +
        "</div>";
      html += '<div class="pw-pr-value">' + pr.value + " " + pr.unit + "</div>";
      if (pr.delta) {
        html += '<div class="pw-pr-delta">+' + pr.delta + " vs previous</div>";
      }
      html +=
        '<div class="pw-pr-type">' + (pr.type || "WEIGHT PR").toUpperCase() + "</div>";
      html += "</div>";
    });
    html += "</div>";
  }

  // Muscle Focus Map (W8.3)
  if (muscleFocus.length > 0) {
    html += '<div class="pw-section">';
    html +=
      '<div class="pw-section-title"><span class="material-symbols-outlined">body_system</span> FOCUS</div>';
    html += '<div class="pw-focus-subtitle">Intensity map by muscle group</div>';
    html += '<div class="pw-muscle-bars">';
    muscleFocus.slice(0, 5).forEach(function (m) {
      html += '<div class="pw-muscle-row">';
      html += '<span class="pw-muscle-name">' + m.name.toUpperCase() + "</span>";
      html += '<div class="pw-muscle-bar-track"><div class="pw-muscle-bar-fill" style="width:' + m.pct + '%"></div></div>';
      html += '<span class="pw-muscle-pct">' + m.pct + "%</span>";
      html += "</div>";
    });
    html += "</div></div>";
  }

  // Work Log (W8.4)
  if (exercises.length > 0) {
    html += '<div class="pw-section">';
    html +=
      '<div class="pw-section-title"><span class="material-symbols-outlined">format_list_numbered</span> WORK LOG</div>';
    exercises.forEach(function (ex) {
      const sets = ex.sets || [];
      if (sets.length === 0) return;
      html += '<div class="pw-exercise-log">';
      html +=
        '<div class="pw-exercise-name">' +
        esc(ex.name || "Exercise") +
        ' <span class="pw-set-badge">' +
        sets.length +
        " sets</span></div>";
      html +=
        '<table class="pw-set-table"><thead><tr><th>SET</th><th>WEIGHT</th><th>REPS</th><th>RPE</th></tr></thead><tbody>';
      sets.forEach(function (s, i) {
        const rpe = parseFloat(s.rpe) || 0;
        let rpeClass = "";
        if (rpe >= 9) rpeClass = "pw-rpe-high";
        else if (rpe >= 7) rpeClass = "pw-rpe-mid";
        else if (rpe > 0) rpeClass = "pw-rpe-low";
        html +=
          "<tr><td>" +
          (i + 1) +
          "</td><td>" +
          (s.weight || "—") +
          "</td><td>" +
          (s.reps || "—") +
          '</td><td class="' +
          rpeClass +
          '">' +
          (rpe > 0 ? rpe : "—") +
          "</td></tr>";
      });
      html += "</tbody></table></div>";
    });
    html += "</div>";
  }

  // Share & Done Buttons (W8.5)
  html += '<div class="pw-actions">';
  html +=
    '<button class="btn btn-outline pw-share-btn" id="pwShareBtn"><span class="material-symbols-outlined">share</span> SHARE</button>';
  html +=
    '<button class="btn btn-primary pw-done-btn" id="pwDoneBtn"><span class="material-symbols-outlined">check_circle</span> DONE</button>';
  html += "</div>";
  html += "</div>";

  overlay.innerHTML = html;
  overlay.classList.remove("hidden");
  document.body.classList.add("overlay-open");

  // Bind events
  var doneBtn = $("pwDoneBtn");
  if (doneBtn) {
    doneBtn.addEventListener("click", function () {
      overlay.classList.add("hidden");
      overlay.innerHTML = "";
      document.body.classList.remove("overlay-open");
    });
  }

  var shareBtn = $("pwShareBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", function () {
      if (typeof generateShareCard === "function") {
        generateShareCard(workoutData);
      } else {
        showToast("Share card is coming soon!", "info");
      }
    });
  }

  // Scroll to top of overlay
  overlay.scrollTop = 0;
}

// ========== PR DETECTION HELPERS ==========
function detectWorkoutPRs(workoutData) {
  const prs = [];
  const exercises = workoutData.exercises || [];
  const allWorkouts = loadData(KEYS.workouts);

  exercises.forEach(function (ex) {
    const exName = (ex.name || "").toLowerCase().trim();
    if (!exName) return;

    // Find all previous sets for this exercise
    const prevSets = [];
    allWorkouts.forEach(function (w) {
      if (w.id === workoutData.id) return; // skip current
      (w.exercises || []).forEach(function (prevEx) {
        if ((prevEx.name || "").toLowerCase().trim() === exName) {
          (prevEx.sets || []).forEach(function (s) {
            prevSets.push(s);
          });
        }
      });
    });

    if (prevSets.length === 0) return; // no history to compare

    // Check for weight PR
    const prevMaxWeight = Math.max(...prevSets.map(function (s) { return parseFloat(s.weight) || 0; }));
    const currentSets = ex.sets || [];
    const currentMaxWeight = Math.max(...currentSets.map(function (s) { return parseFloat(s.weight) || 0; }));

    if (currentMaxWeight > prevMaxWeight && currentMaxWeight > 0) {
      prs.push({
        exercise: ex.name,
        type: "WEIGHT PR",
        value: currentMaxWeight,
        unit: settings.weightUnit,
        delta: (currentMaxWeight - prevMaxWeight).toFixed(1) + " " + settings.weightUnit,
      });
    }

    // Check for volume PR (most volume in a session for this exercise)
    const currentVolume = currentSets.reduce(function (sum, s) {
      return sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
    }, 0);

    // Calculate previous max session volume per exercise across workouts
    let prevMaxVolume = 0;
    allWorkouts.forEach(function (w) {
      if (w.id === workoutData.id) return;
      (w.exercises || []).forEach(function (prevEx) {
        if ((prevEx.name || "").toLowerCase().trim() === exName) {
          const vol = (prevEx.sets || []).reduce(function (sum, s) {
            return sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
          }, 0);
          if (vol > prevMaxVolume) prevMaxVolume = vol;
        }
      });
    });

    if (currentVolume > prevMaxVolume && currentVolume > 0 && !prs.find(function (p) { return p.exercise === ex.name; })) {
      prs.push({
        exercise: ex.name,
        type: "VOLUME PR",
        value: formatVolume(currentVolume),
        unit: settings.weightUnit,
        delta: formatVolume(currentVolume - prevMaxVolume) + " " + settings.weightUnit,
      });
    }
  });

  return prs;
}

function calculateMuscleFocus(exercises) {
  const muscleMap = {};
  const exerciseMuscles = {
    // Common exercise -> muscle group mapping (bundled)
    "bench press": { chest: 95, triceps: 70, "front delts": 45 },
    "incline bench press": { "upper chest": 90, triceps: 65, "front delts": 50 },
    "dumbbell press": { chest: 90, triceps: 65, "front delts": 40 },
    "overhead press": { shoulders: 95, triceps: 70, "upper chest": 30 },
    "barbell row": { lats: 90, biceps: 70, rhomboids: 85 },
    "deadlift": { "lower back": 95, glutes: 85, hamstrings: 80, traps: 60 },
    "squat": { quads: 95, glutes: 85, hamstrings: 60, core: 40 },
    "back squat": { quads: 95, glutes: 85, hamstrings: 60, core: 40 },
    "front squat": { quads: 95, core: 70, glutes: 60 },
    "leg press": { quads: 90, glutes: 75, hamstrings: 50 },
    "lat pulldown": { lats: 90, biceps: 70, "rear delts": 40 },
    "pull up": { lats: 95, biceps: 75, "rear delts": 45 },
    "chin up": { lats: 85, biceps: 85, "rear delts": 40 },
    "bicep curl": { biceps: 95, forearms: 40 },
    "tricep extension": { triceps: 95 },
    "lateral raise": { "side delts": 95, traps: 30 },
    "face pull": { "rear delts": 90, traps: 60, rhomboids: 50 },
    "hip thrust": { glutes: 95, hamstrings: 50 },
    "romanian deadlift": { hamstrings: 90, glutes: 80, "lower back": 60 },
    "leg curl": { hamstrings: 95 },
    "leg extension": { quads: 95 },
    "calf raise": { calves: 95 },
    "plank": { core: 90, shoulders: 30 },
    "crunch": { core: 85, "hip flexors": 40 },
    "cable fly": { chest: 90, "front delts": 30 },
    "dumbbell fly": { chest: 85, "front delts": 30 },
    "shrug": { traps: 95 },
  };

  exercises.forEach(function (ex) {
    const name = (ex.name || "").toLowerCase().trim();
    const sets = (ex.sets || []).length;
    if (sets === 0) return;

    // Try exact match first, then partial match
    let muscles = exerciseMuscles[name];
    if (!muscles) {
      // Partial match
      for (var key in exerciseMuscles) {
        if (name.indexOf(key) >= 0 || key.indexOf(name) >= 0) {
          muscles = exerciseMuscles[key];
          break;
        }
      }
    }

    if (muscles) {
      for (var muscle in muscles) {
        if (!muscleMap[muscle]) muscleMap[muscle] = 0;
        muscleMap[muscle] = Math.max(muscleMap[muscle], muscles[muscle]);
      }
    }
  });

  // Convert to sorted array
  return Object.keys(muscleMap)
    .map(function (name) {
      return { name: name, pct: muscleMap[name] };
    })
    .sort(function (a, b) {
      return b.pct - a.pct;
    });
}

function formatVolume(vol) {
  if (vol >= 1000) return (vol / 1000).toFixed(1) + "k";
  return Math.round(vol).toString();
}
