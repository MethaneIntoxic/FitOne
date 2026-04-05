// ========== EXERCISE DETAIL VIEW (W5.1 / W5.2) ==========
// Dedicated, fullscreen drill-down for exercise intelligence.

function formatWeightValue(value) {
  if (!Number.isFinite(value) || value <= 0) return "--";
  const unit = (settings && settings.weightUnit) || "kg";
  return value + " " + unit.toUpperCase();
}

function getExerciseDescription(name, info) {
  if (info && info.tips) return info.tips;
  return (
    "No detailed cue is available for this movement yet. Focus on controlled tempo, stable bracing, and repeatable range of motion."
  );
}

function getMovementBadge(info) {
  const category = (info && info.category ? info.category : "compound").toLowerCase();
  if (category === "isolation") return "ISOLATION MOVEMENT";
  return "COMPOUND MOVEMENT";
}

function getPersonalBestValue(exerciseName) {
  if (typeof getPRsForExercise !== "function") return "--";
  const prs = getPRsForExercise(exerciseName);
  if (!prs || typeof prs !== "object") return "--";

  if (prs.weight && Number.isFinite(prs.weight.value)) {
    return formatWeightValue(prs.weight.value);
  }
  if (prs.est1RM && Number.isFinite(prs.est1RM.value)) {
    return formatWeightValue(prs.est1RM.value);
  }
  if (prs.volume && Number.isFinite(prs.volume.value)) {
    return String(Math.round(prs.volume.value));
  }
  return "--";
}

function getLastSessionValue(exerciseName) {
  if (typeof getLastSessionForExercise !== "function") return "--";
  const last = getLastSessionForExercise(exerciseName);
  if (!last) return "--";
  if (Number.isFinite(last.weight) && last.weight > 0) return formatWeightValue(last.weight);
  return "--";
}

const FALLBACK_MUSCLE_LABELS = {
  chest: "Pectoralis Major",
  back: "Upper Back",
  shoulders: "Deltoids",
  biceps: "Biceps Brachii",
  triceps: "Triceps Brachii",
  forearms: "Forearms",
  quads: "Quadriceps",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  abs: "Rectus Abdominis",
  obliques: "Obliques",
  traps: "Trapezius",
  lats: "Latissimus Dorsi",
  lowBack: "Lower Back",
  hipFlexors: "Hip Flexors",
};

function getMuscleLabel(key) {
  if (typeof MUSCLE_GROUPS === "object" && MUSCLE_GROUPS && MUSCLE_GROUPS[key]) {
    return MUSCLE_GROUPS[key];
  }
  return FALLBACK_MUSCLE_LABELS[key] || key;
}

function resolveHeuristicMuscles(nameLower) {
  if (nameLower.includes("bench") || nameLower.includes("fly") || nameLower.includes("push-up")) {
    return ["chest", "triceps", "shoulders"];
  }
  if (nameLower.includes("row") || nameLower.includes("pulldown") || nameLower.includes("pull-up") || nameLower.includes("chin-up")) {
    return ["lats", "back", "biceps"];
  }
  if (nameLower.includes("squat") || nameLower.includes("lunge") || nameLower.includes("leg press")) {
    return ["quads", "glutes", "hamstrings"];
  }
  if (nameLower.includes("deadlift") || nameLower.includes("rdl") || nameLower.includes("good morning")) {
    return ["hamstrings", "glutes", "lowBack"];
  }
  if (nameLower.includes("curl")) return ["biceps", "forearms", "shoulders"];
  if (nameLower.includes("tricep") || nameLower.includes("pushdown") || nameLower.includes("skull")) {
    return ["triceps", "chest", "shoulders"];
  }
  if (nameLower.includes("press") || nameLower.includes("raise") || nameLower.includes("shrug")) {
    return ["shoulders", "triceps", "traps"];
  }
  if (nameLower.includes("plank") || nameLower.includes("crunch") || nameLower.includes("twist")) {
    return ["abs", "obliques", "hipFlexors"];
  }
  return ["back", "glutes", "abs"];
}

function toPercentRows(entries) {
  if (!entries.length) return [];
  const max = Math.max(...entries.map((e) => e.value), 1);
  return entries.map((entry, index) => {
    const raw = Math.round((entry.value / max) * 95);
    const percent = Math.max(22, Math.min(95 - index * 3, raw));
    return {
      key: entry.key,
      label: getMuscleLabel(entry.key),
      percent,
    };
  });
}

function getMuscleActivationData(exerciseName, info) {
  const weighted = {};
  const primary = Array.isArray(info && info.primary) ? info.primary : [];
  const secondary = Array.isArray(info && info.secondary) ? info.secondary : [];

  if (primary.length) {
    const contribution = 0.7 / primary.length;
    primary.forEach((m) => {
      if (!m) return;
      weighted[m] = (weighted[m] || 0) + contribution;
    });
  }
  if (secondary.length) {
    const contribution = 0.3 / secondary.length;
    secondary.forEach((m) => {
      if (!m) return;
      weighted[m] = (weighted[m] || 0) + contribution;
    });
  }

  const hasSignal = Object.keys(weighted).length > 0;
  if (!hasSignal) {
    const nameLower = (exerciseName || "").toLowerCase();
    const fallback = resolveHeuristicMuscles(nameLower);
    fallback.forEach((m, i) => {
      weighted[m] = [0.95, 0.7, 0.45][i] || 0.35;
    });
  }

  const sorted = Object.keys(weighted)
    .map((key) => ({ key, value: weighted[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  while (sorted.length < 3) {
    const fallbacks = ["back", "glutes", "abs", "shoulders"];
    const next = fallbacks.find((m) => !sorted.some((s) => s.key === m));
    if (!next) break;
    sorted.push({ key: next, value: 0.3 });
  }

  return toPercentRows(sorted);
}

const MUSCLE_SPOT_MAP = {
  chest: [{ x: 31, y: 27 }, { x: 39, y: 27 }],
  shoulders: [{ x: 24, y: 26 }, { x: 46, y: 26 }],
  triceps: [{ x: 18, y: 32 }, { x: 52, y: 32 }],
  biceps: [{ x: 18, y: 29 }, { x: 52, y: 29 }],
  forearms: [{ x: 17, y: 41 }, { x: 53, y: 41 }],
  abs: [{ x: 35, y: 35 }],
  obliques: [{ x: 28, y: 36 }, { x: 42, y: 36 }],
  hipFlexors: [{ x: 35, y: 43 }],
  quads: [{ x: 32, y: 53 }, { x: 40, y: 53 }],
  hamstrings: [{ x: 73, y: 53 }, { x: 81, y: 53 }],
  glutes: [{ x: 77, y: 43 }],
  calves: [{ x: 32, y: 69 }, { x: 40, y: 69 }],
  back: [{ x: 77, y: 31 }],
  lats: [{ x: 72, y: 34 }, { x: 82, y: 34 }],
  traps: [{ x: 77, y: 24 }],
  lowBack: [{ x: 77, y: 40 }],
};

function renderSilhouetteSpots(rows) {
  const spots = [];
  rows.forEach((row) => {
    const mapped = MUSCLE_SPOT_MAP[row.key] || [];
    mapped.forEach((spot) => {
      spots.push(
        '<span class="exercise-detail-muscle-spot" style="left:' +
          spot.x +
          '%;top:' +
          spot.y +
          '%;--intensity:' +
          row.percent +
          ';" title="' +
          esc(row.label) +
          '"></span>'
      );
    });
  });
  return spots.join("");
}

function renderMuscleMap(exerciseName, info) {
  const rows = getMuscleActivationData(exerciseName, info);
  if (!rows.length) return "";

  const listHtml = rows
    .map(
      (row) =>
        '<div class="exercise-detail-muscle-row">' +
        '<div class="exercise-detail-muscle-head">' +
        '<span class="name">' +
        esc(row.label) +
        "</span>" +
        '<span class="pct">' +
        row.percent +
        "%</span>" +
        "</div>" +
        '<div class="exercise-detail-muscle-bar"><span style="width:' +
        row.percent +
        '%"></span></div>' +
        "</div>"
    )
    .join("");

  return (
    '<section class="exercise-detail-muscle-map" aria-label="Primary Activation Muscle Map">' +
    '<div class="exercise-detail-muscle-col">' +
    '<h3>Primary Activation</h3>' +
    listHtml +
    "</div>" +
    '<div class="exercise-detail-silhouette-col">' +
    '<div class="exercise-detail-silhouette-wrap">' +
    '<img src="assets/body-outline.svg" alt="Body silhouette" loading="lazy" />' +
    '<div class="exercise-detail-muscle-spots">' +
    renderSilhouetteSpots(rows) +
    "</div>" +
    "</div>" +
    '<p class="exercise-detail-silhouette-note">Highlight intensity reflects relative muscle recruitment.</p>' +
    "</div>" +
    "</section>"
  );
}

function getExecutionProtocolSteps(info) {
  const explicit = Array.isArray(info && info.formTips) ? info.formTips : [];
  if (explicit.length) {
    const normalized = explicit.slice(0, 4).map((tip, i) => ({
      title: tip.title || "Step " + String(i + 1).padStart(2, "0"),
      description: tip.description || "",
    }));
    while (normalized.length < 3) {
      normalized.push({
        title: ["Setup", "Execution", "Finish"][normalized.length] || "Step " + String(normalized.length + 1).padStart(2, "0"),
        description: "Maintain stable bracing, repeat consistent mechanics, and stop the set when form breaks down.",
      });
    }
    return normalized;
  }

  const tipsText = (info && info.tips) || "";
  const fragments = tipsText
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (!fragments.length) {
    return [
      { title: "Setup", description: "Establish stance, grip, and joint alignment before initiating each rep." },
      { title: "Execution", description: "Move through the target range with controlled tempo and stable bracing." },
      { title: "Finish", description: "Complete lockout with intent, then reset before the next repetition." },
    ];
  }

  const defaultTitles = ["Setup", "Load Path", "Tempo", "Finish"];
  const mapped = fragments.map((description, i) => ({
    title: defaultTitles[i] || "Step " + String(i + 1).padStart(2, "0"),
    description,
  }));
  while (mapped.length < 3) {
    mapped.push({
      title: ["Setup", "Execution", "Finish"][mapped.length] || "Step " + String(mapped.length + 1).padStart(2, "0"),
      description: "Maintain stable bracing, repeat consistent mechanics, and stop the set when form breaks down.",
    });
  }
  return mapped;
}

function renderExecutionProtocol(info) {
  const steps = getExecutionProtocolSteps(info);
  const stepsHtml = steps
    .map(
      (step, i) =>
        '<div class="exercise-detail-protocol-step">' +
        '<div class="idx">' +
        String(i + 1).padStart(2, "0") +
        "</div>" +
        '<div class="content">' +
        '<h4>' +
        esc(step.title) +
        "</h4>" +
        '<p>' +
        esc(step.description) +
        "</p>" +
        "</div>" +
        "</div>"
    )
    .join("");

  return (
    '<section class="exercise-detail-protocol">' +
    '<details>' +
    '<summary><span>Execution Protocol</span><span class="hint">Tap to expand</span></summary>' +
    '<div class="exercise-detail-protocol-body">' +
    stepsHtml +
    "</div>" +
    "</details>" +
    "</section>"
  );
}

function calculateEst1RM(weight, reps) {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

function getExercisePerformanceSessions(exerciseName) {
  if (!exerciseName || typeof loadData !== "function" || !KEYS || !KEYS.workouts) return [];
  const target = exerciseName.toLowerCase().trim();
  const source = loadData(KEYS.workouts) || [];

  const sessions = source
    .map((workout) => {
      const matched = (workout.exercises || []).find(
        (ex) => (ex.name || "").toLowerCase().trim() === target
      );
      if (!matched) return null;
      const sets = Number(matched.sets) || 0;
      const reps = Number(matched.reps) || 0;
      const weight = Number(matched.weight) || 0;
      const ts = Number(workout.timestamp) || 0;

      return {
        date: workout.date || today(),
        timestamp: ts,
        volume: sets * reps * weight,
        est1RM: calculateEst1RM(weight, reps),
        maxEffort: weight,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  return sessions.slice(-6);
}

function getMetricConfig(metric) {
  if (metric === "est1rm") return { key: "est1RM", label: "1RM Est." };
  if (metric === "max") return { key: "maxEffort", label: "Max Effort" };
  return { key: "volume", label: "Volume" };
}

function drawPerformanceMetric(canvas, sessions, metric) {
  if (!canvas || typeof drawLineChart !== "function" || !sessions.length) return;
  const config = getMetricConfig(metric);
  const labels = sessions.map((s) => {
    const d = (s.date || "").split("-");
    if (d.length === 3) return d[1] + "/" + d[2];
    return s.date || "Session";
  });
  const values = sessions.map((s) => Number(s[config.key]) || 0);
  drawLineChart(canvas, labels, values, "#8B5CF6");
}

function attachPerformanceChartHandlers(sessions) {
  const wrap = $("exerciseDetailChartWrap");
  const canvas = $("exerciseDetailPerfCanvas");
  if (!wrap || !canvas || !sessions.length) return;

  let active = "volume";
  const render = () => {
    drawPerformanceMetric(canvas, sessions, active);
    const hint = $("exerciseDetailChartHint");
    if (hint) hint.textContent = getMetricConfig(active).label + " • Last " + sessions.length + " sessions";
  };

  wrap.querySelectorAll("[data-perf-metric]").forEach((btn) => {
    btn.addEventListener("click", () => {
      active = btn.getAttribute("data-perf-metric") || "volume";
      wrap.querySelectorAll("[data-perf-metric]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      render();
    });
  });

  render();
}

function renderPerformanceChart(exerciseName) {
  const sessions = getExercisePerformanceSessions(exerciseName);
  if (!sessions.length) {
    return {
      html:
        '<section class="exercise-detail-performance">' +
        '<div class="head"><h3>Performance Index</h3></div>' +
        '<p class="empty">Log this movement in multiple sessions to unlock trend analytics.</p>' +
        "</section>",
      sessions,
    };
  }

  const html =
    '<section class="exercise-detail-performance" id="exerciseDetailChartWrap">' +
    '<div class="head"><h3>Performance Index</h3>' +
    '<div class="toggles">' +
    '<button class="btn active" data-perf-metric="volume">VOLUME</button>' +
    '<button class="btn" data-perf-metric="est1rm">1RM EST.</button>' +
    '<button class="btn" data-perf-metric="max">MAX EFFORT</button>' +
    "</div></div>" +
    '<div class="canvas-wrap"><canvas id="exerciseDetailPerfCanvas" aria-label="Performance chart"></canvas></div>' +
    '<p class="hint" id="exerciseDetailChartHint"></p>' +
    "</section>";

  return { html, sessions };
}

window.showExerciseDetailModal = function (exerciseName) {
  const cleanName = (exerciseName || "").trim();
  if (!cleanName) {
    showToast("Enter an exercise name first", "warning");
    return;
  }

  const info = typeof getExerciseInfo === "function" ? getExerciseInfo(cleanName) : null;
  const badge = getMovementBadge(info);
  const description = getExerciseDescription(cleanName, info);
  const personalBest = getPersonalBestValue(cleanName);
  const lastSession = getLastSessionValue(cleanName);
  const muscleMapHtml = renderMuscleMap(cleanName, info);
  const protocolHtml = renderExecutionProtocol(info);
  const perf = renderPerformanceChart(cleanName);

  const html =
    '<div class="exercise-detail-overlay" id="exerciseDetailOverlay">' +
    '<div class="exercise-detail-panel" role="dialog" aria-label="Exercise Detail">' +
    '<div class="exercise-detail-header">' +
    '<button class="exercise-detail-back" id="exerciseDetailBack" aria-label="Back">' +
    '<span class="material-symbols-outlined">arrow_back</span>' +
    '</button>' +
    '<span class="exercise-detail-title">Exercise Detail</span>' +
    '</div>' +
    '<div class="exercise-detail-body">' +
    '<div class="exercise-detail-badge"><span class="dot"></span>' +
    esc(badge) +
    '</div>' +
    '<h2 class="exercise-detail-name">' +
    esc(cleanName) +
    '</h2>' +
    '<p class="exercise-detail-description">' +
    esc(description) +
    '</p>' +
    '<div class="exercise-detail-stats">' +
    '<div class="exercise-detail-stat-circle">' +
    '<div class="value">' +
    esc(personalBest) +
    '</div>' +
    '<div class="label">PERSONAL BEST</div>' +
    '</div>' +
    '<div class="exercise-detail-stat-circle">' +
    '<div class="value">' +
    esc(lastSession) +
    '</div>' +
    '<div class="label">LAST SESSION</div>' +
    '</div>' +
    muscleMapHtml +
    protocolHtml +
    perf.html +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>';

  $("modalContainer").innerHTML = html;

  const overlay = $("exerciseDetailOverlay");
  const back = $("exerciseDetailBack");

  if (back) back.addEventListener("click", closeModal);
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  attachPerformanceChartHandlers(perf.sessions);
};
