// ========== DEEP DIVE METRIC VIEW (W10) ==========
// Drill-down analytics for a single exercise across time ranges.

(function () {
  function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function parseWorkoutDateTime(workout) {
    const datePart = workout && workout.date ? workout.date : today();
    const ts = Number(workout && workout.timestamp) || 0;
    if (ts > 0) return ts;
    const d = new Date(datePart + "T00:00:00");
    return d.getTime();
  }

  function normalizeExerciseSession(ex) {
    const sets = Array.isArray(ex && ex.sets) ? ex.sets : null;
    if (sets && sets.length) {
      let volume = 0;
      let peak = 0;
      let totalReps = 0;
      let rpeSum = 0;
      let rpeCount = 0;

      sets.forEach(function (s) {
        const wt = safeNum(s.weight);
        const reps = safeNum(s.reps);
        const rpe = safeNum(s.rpe);
        volume += wt * reps;
        totalReps += reps;
        if (wt > peak) peak = wt;
        if (rpe > 0) {
          rpeSum += rpe;
          rpeCount += 1;
        }
      });

      const avgReps = sets.length ? totalReps / sets.length : 0;
      const est1rm = peak > 0 && avgReps > 0 ? peak * (1 + avgReps / 30) : 0;
      return {
        volume: volume,
        peak: peak,
        est1rm: est1rm,
        avgReps: avgReps,
        avgRpe: rpeCount ? rpeSum / rpeCount : 0,
      };
    }

    const weight = safeNum(ex && ex.weight);
    const reps = safeNum(ex && ex.reps);
    const setCount = safeNum(ex && ex.sets);
    const volume = weight * reps * Math.max(1, setCount);
    const est1rm = weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0;

    return {
      volume: volume,
      peak: weight,
      est1rm: est1rm,
      avgReps: reps,
      avgRpe: safeNum(ex && ex.rpe),
    };
  }

  function getExerciseSessions(exerciseName, rangeDays) {
    if (!exerciseName || typeof loadData !== "function" || !KEYS || !KEYS.workouts) return [];
    const target = String(exerciseName).toLowerCase().trim();
    const workouts = loadData(KEYS.workouts) || [];

    const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
    const sessions = [];

    workouts.forEach(function (workout) {
      const workoutTs = parseWorkoutDateTime(workout);
      if (workoutTs < cutoff) return;
      const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];
      const matched = exercises.filter(function (ex) {
        return String(ex && ex.name || "").toLowerCase().trim() === target;
      });
      if (!matched.length) return;

      let volume = 0;
      let peak = 0;
      let est1rm = 0;
      let avgRpeAcc = 0;
      let avgRpeCount = 0;
      let avgRepsAcc = 0;
      let avgRepsCount = 0;

      matched.forEach(function (ex) {
        const normalized = normalizeExerciseSession(ex);
        volume += normalized.volume;
        peak = Math.max(peak, normalized.peak);
        est1rm = Math.max(est1rm, normalized.est1rm);
        if (normalized.avgRpe > 0) {
          avgRpeAcc += normalized.avgRpe;
          avgRpeCount += 1;
        }
        if (normalized.avgReps > 0) {
          avgRepsAcc += normalized.avgReps;
          avgRepsCount += 1;
        }
      });

      const d = workout.date || today();
      sessions.push({
        date: d,
        ts: workoutTs,
        volume: Math.round(volume),
        peak: Math.round(peak * 10) / 10,
        est1rm: Math.round(est1rm * 10) / 10,
        avgRpe: avgRpeCount ? avgRpeAcc / avgRpeCount : 0,
        avgReps: avgRepsCount ? avgRepsAcc / avgRepsCount : 0,
      });
    });

    sessions.sort(function (a, b) { return a.ts - b.ts; });
    return sessions;
  }

  function getRangeConfig(range) {
    if (range === "1y") return { days: 365, label: "1 YEAR" };
    if (range === "6m") return { days: 180, label: "6 MONTHS" };
    return { days: 90, label: "3 MONTHS" };
  }

  function fmtCompactDate(dateStr) {
    if (!dateStr) return "--";
    const parts = String(dateStr).split("-");
    if (parts.length !== 3) return dateStr;
    return parts[1] + "/" + parts[2];
  }

  function metricDeltaPct(current, previous) {
    if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
    return ((current - previous) / previous) * 100;
  }

  function calcIntensityProfile(sessions) {
    if (!sessions.length) return { pct: 0, zone: "BASE BUILD", descriptor: "LOW LOAD" };
    const recent = sessions.slice(-6);
    const avgRpe = recent.reduce(function (a, s) { return a + (safeNum(s.avgRpe) || 0); }, 0) / recent.length;
    const avgReps = recent.reduce(function (a, s) { return a + (safeNum(s.avgReps) || 0); }, 0) / recent.length;

    let rpeScore = 0;
    if (avgRpe > 0) rpeScore = Math.min(100, (avgRpe / 10) * 100);

    let repScore = 65;
    if (avgReps <= 5) repScore = 92;
    else if (avgReps <= 8) repScore = 86;
    else if (avgReps <= 12) repScore = 78;
    else if (avgReps <= 15) repScore = 68;
    else repScore = 58;

    const pctRaw = avgRpe > 0 ? (rpeScore * 0.62 + repScore * 0.38) : repScore;
    const pct = Math.max(25, Math.min(99, Math.round(pctRaw)));

    let zone = "HYPERTROPHY";
    let descriptor = "BALANCED OUTPUT";
    if (pct >= 90) {
      zone = "PEAK STRENGTH";
      descriptor = "HIGH NEURAL DEMAND";
    } else if (pct >= 82) {
      zone = "HYPERTROPHY";
      descriptor = "PROGRESSIVE LOAD";
    } else if (pct >= 70) {
      zone = "MIXED POWER";
      descriptor = "TECHNICAL CAPACITY";
    } else {
      zone = "BASE BUILD";
      descriptor = "RECOVERY-LEANING";
    }

    return { pct: pct, zone: zone, descriptor: descriptor };
  }

  function renderIntensityGauge(profile) {
    const pct = safeNum(profile && profile.pct);
    return (
      '<section class="deep-dive-card deep-dive-intensity">' +
      '<div class="deep-dive-intensity-head">CURRENT INTENSITY</div>' +
      '<div class="deep-dive-intensity-main">' +
      '<div class="deep-dive-intensity-value">' + pct + '% <span>' + esc(profile.zone) + '</span></div>' +
      '<div class="deep-dive-intensity-track"><span style="width:' + pct + '%"></span></div>' +
      '<div class="deep-dive-intensity-foot">' + esc(profile.descriptor) + '</div>' +
      '</div>' +
      '</section>'
    );
  }

  function renderStatCards(sessions, intensityProfile) {
    if (!sessions.length) {
      return '<section class="deep-dive-stats-grid"><div class="deep-dive-empty">Log this exercise multiple times to unlock quick stats.</div></section>';
    }

    const recent = sessions.slice(-6);
    const previous = sessions.slice(-12, -6);

    const recentVolume = recent.reduce(function (a, s) { return a + safeNum(s.volume); }, 0);
    const prevVolume = previous.reduce(function (a, s) { return a + safeNum(s.volume); }, 0);
    const volumeDelta = metricDeltaPct(recentVolume, prevVolume);

    const allTimeMax = sessions.reduce(function (m, s) { return Math.max(m, safeNum(s.peak)); }, 0);
    const allTimeRec = sessions.slice().reverse().find(function (s) { return safeNum(s.peak) === allTimeMax; });

    const avgIntensity = sessions.reduce(function (a, s) { return a + safeNum(s.avgRpe); }, 0) / sessions.length;
    const outputRating = intensityProfile.pct >= 88 ? "ELITE" : intensityProfile.pct >= 76 ? "STRONG" : "BUILDING";

    const weeks = new Set(sessions.map(function (s) {
      const d = new Date(s.date + "T00:00:00");
      const onejan = new Date(d.getFullYear(), 0, 1);
      const day = Math.floor((d - onejan) / 86400000);
      return d.getFullYear() + "-" + Math.ceil((day + onejan.getDay() + 1) / 7);
    }));
    const weeksCount = Math.max(1, weeks.size);
    const weeklyFreq = (sessions.length / weeksCount).toFixed(1);

    const volumeDeltaText = volumeDelta == null
      ? "Baseline period"
      : (volumeDelta >= 0 ? "+" : "") + volumeDelta.toFixed(1) + "% vs prior block";

    return (
      '<section class="deep-dive-stats-grid">' +
      '<article class="deep-dive-stat-card">' +
      '<div class="kicker">SESSION VOLUME</div>' +
      '<div class="value">' + recentVolume.toLocaleString() + ' <span>KG</span></div>' +
      '<div class="meta">' + esc(volumeDeltaText) + '</div>' +
      '</article>' +
      '<article class="deep-dive-stat-card">' +
      '<div class="kicker">ALL-TIME MAX <span class="badge">P.R. STATUS</span></div>' +
      '<div class="value">' + allTimeMax.toFixed(1) + ' <span>' + esc((settings && settings.weightUnit || "kg").toUpperCase()) + '</span></div>' +
      '<div class="meta">' + (allTimeRec ? esc(fmtDate(allTimeRec.date)) : "—") + '</div>' +
      '</article>' +
      '<article class="deep-dive-stat-card">' +
      '<div class="kicker">AVG. INTENSITY <span class="badge">OUTPUT RATING</span></div>' +
      '<div class="value">' + (avgIntensity > 0 ? avgIntensity.toFixed(1) : "--") + ' <span>RPE</span></div>' +
      '<div class="meta">' + esc(outputRating) + '</div>' +
      '</article>' +
      '<article class="deep-dive-stat-card">' +
      '<div class="kicker">WEEKLY FREQUENCY <span class="badge">CONSISTENCY</span></div>' +
      '<div class="value">' + weeklyFreq + ' <span>SESS</span></div>' +
      '<div class="meta">' + sessions.length + ' total tracked sessions</div>' +
      '</article>' +
      '</section>'
    );
  }

  function renderDeepDiveChart(exerciseName, sessions, state) {
    const labels = sessions.map(function (s) { return fmtCompactDate(s.date); });
    const unit = (settings && settings.weightUnit || "kg").toUpperCase();

    const datasets = [
      {
        key: "est1rm",
        name: "Estimated 1RM",
        color: "#a78bfa",
        ySuffix: " " + unit,
        values: sessions.map(function (s) { return safeNum(s.est1rm); }),
      },
      {
        key: "peak",
        name: "Strength Peak",
        color: "#34d399",
        ySuffix: " " + unit,
        values: sessions.map(function (s) { return safeNum(s.peak); }),
      },
      {
        key: "volume",
        name: "Volume Load",
        color: "#f59e0b",
        ySuffix: " kg",
        values: sessions.map(function (s) { return safeNum(s.volume); }),
      },
    ];

    return (
      '<section class="deep-dive-card deep-dive-chart-card">' +
      '<div class="deep-dive-chart-head">' +
      '<div class="deep-dive-chart-title">' + esc(exerciseName) + ' Trend</div>' +
      '<div class="deep-dive-range-pills">' +
      '<button class="deep-dive-range-btn' + (state.range === "3m" ? ' active' : '') + '" data-dd-range="3m">3 MONTHS</button>' +
      '<button class="deep-dive-range-btn' + (state.range === "6m" ? ' active' : '') + '" data-dd-range="6m">6 MONTHS</button>' +
      '<button class="deep-dive-range-btn' + (state.range === "1y" ? ' active' : '') + '" data-dd-range="1y">1 YEAR</button>' +
      '</div>' +
      '</div>' +
      '<div class="deep-dive-chart-sub">Analyzing explosive power and mechanical consistency across the last ' + (state.range === "1y" ? 365 : state.range === "6m" ? 180 : 90) + ' days...</div>' +
      '<div class="deep-dive-canvas-wrap"><canvas id="deepDiveChartCanvas"></canvas></div>' +
      '<div class="deep-dive-legend">' +
      datasets.map(function (ds) {
        const on = state.series[ds.key] !== false;
        return '<button class="deep-dive-legend-btn' + (on ? ' active' : '') + '" data-dd-series="' + ds.key + '"><span style="background:' + ds.color + '"></span>' + ds.name + '</button>';
      }).join("") +
      '</div>' +
      '</section>'
    );
  }

  function renderDeepDiveShell(exerciseName, sessions, state) {
    const intensity = calcIntensityProfile(sessions);
    const chartHtml = renderDeepDiveChart(exerciseName, sessions, state);
    const statsHtml = renderStatCards(sessions, intensity);

    return (
      '<div class="deep-dive-overlay" id="deepDiveOverlay">' +
      '<section class="deep-dive-panel" role="dialog" aria-label="Deep Dive Metric">' +
      '<header class="deep-dive-header">' +
      '<button class="deep-dive-back" id="deepDiveBack" aria-label="Back"><span class="material-symbols-outlined">arrow_back</span></button>' +
      '<div class="deep-dive-header-meta">' +
      '<div class="deep-dive-badge">PERFORMANCE HIGH</div>' +
      '<div class="deep-dive-breadcrumb">UPPER BODY • STRENGTH</div>' +
      '<h2>' + esc(exerciseName) + ' TREND</h2>' +
      '</div>' +
      '</header>' +
      '<div class="deep-dive-body">' +
      (sessions.length
        ? chartHtml + renderIntensityGauge(intensity) + statsHtml
        : '<div class="deep-dive-empty">No historical sessions found for this exercise in the selected window.</div>') +
      '</div>' +
      '</section>' +
      '</div>'
    );
  }

  function drawCurrentDeepDiveChart(state) {
    const canvas = $("deepDiveChartCanvas");
    if (!canvas || typeof drawMultiLineChart !== "function") return;

    const labels = state.sessions.map(function (s) { return fmtCompactDate(s.date); });
    const unit = (settings && settings.weightUnit || "kg").toUpperCase();
    const datasets = [
      {
        key: "est1rm",
        name: "Estimated 1RM",
        color: "#a78bfa",
        ySuffix: " " + unit,
        values: state.sessions.map(function (s) { return safeNum(s.est1rm); }),
        visible: state.series.est1rm !== false,
      },
      {
        key: "peak",
        name: "Strength Peak",
        color: "#34d399",
        ySuffix: " " + unit,
        values: state.sessions.map(function (s) { return safeNum(s.peak); }),
        visible: state.series.peak !== false,
      },
      {
        key: "volume",
        name: "Volume Load",
        color: "#f59e0b",
        ySuffix: " kg",
        values: state.sessions.map(function (s) { return safeNum(s.volume); }),
        visible: state.series.volume !== false,
      },
    ];

    drawMultiLineChart(canvas, labels, datasets);
  }

  function bindDeepDiveHandlers(state) {
    const overlay = $("deepDiveOverlay");
    const back = $("deepDiveBack");
    if (back) back.addEventListener("click", closeModal);
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeModal();
      });
    }

    document.querySelectorAll("[data-dd-range]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const nextRange = btn.getAttribute("data-dd-range") || "3m";
        if (nextRange === state.range) return;
        window.showDeepDiveModal(state.exerciseName, { range: nextRange, series: state.series });
      });
    });

    document.querySelectorAll("[data-dd-series]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const key = btn.getAttribute("data-dd-series");
        if (!key) return;
        state.series[key] = state.series[key] === false;
        btn.classList.toggle("active", state.series[key] !== false);
        drawCurrentDeepDiveChart(state);
      });
    });

    drawCurrentDeepDiveChart(state);
  }

  window.showDeepDiveModal = function (exerciseName, options) {
    const clean = String(exerciseName || "").trim();
    if (!clean) {
      showToast("Select an exercise to open Deep Dive.", "warning");
      return;
    }

    const opts = options || {};
    const range = opts.range || "3m";
    const rangeCfg = getRangeConfig(range);
    const sessions = getExerciseSessions(clean, rangeCfg.days);

    const state = {
      exerciseName: clean,
      range: range,
      sessions: sessions,
      series: Object.assign({ est1rm: true, peak: true, volume: true }, opts.series || {}),
    };

    $("modalContainer").innerHTML = renderDeepDiveShell(clean, sessions, state);
    bindDeepDiveHandlers(state);
  };
})();
