// ========== EXERCISE GUIDE ==========
// Inline guide surface for workout logging rows.

(function () {
  const MUSCLE_LABELS = {
    chest: "Chest",
    back: "Back",
    shoulders: "Shoulders",
    biceps: "Biceps",
    triceps: "Triceps",
    forearms: "Forearms",
    quads: "Quads",
    hamstrings: "Hamstrings",
    glutes: "Glutes",
    calves: "Calves",
    abs: "Abs",
    obliques: "Obliques",
    traps: "Traps",
    lats: "Lats",
    lowBack: "Lower Back",
    hipFlexors: "Hip Flexors",
  };

  function muscleLabel(key) {
    return MUSCLE_LABELS[key] || String(key || "");
  }

  function uniq(values) {
    const out = [];
    (values || []).forEach(function (v) {
      const value = String(v || "").trim();
      if (value && !out.includes(value)) out.push(value);
    });
    return out;
  }

  function getFormCueLines(info) {
    const explicit = Array.isArray(info && info.formTips) ? info.formTips : [];
    if (explicit.length) {
      return explicit
        .slice(0, 3)
        .map(function (tip) {
          const title = String((tip && tip.title) || "Cue").trim();
          const description = String((tip && tip.description) || "").trim();
          if (!description) return null;
          return { title: title, description: description };
        })
        .filter(Boolean);
    }

    const text = String((info && info.tips) || "").trim();
    if (!text) {
      return [
        { title: "Setup", description: "Brace your torso and align posture before each rep." },
        { title: "Execution", description: "Move with controlled tempo and full range of motion." },
      ];
    }

    return text
      .split(/[.!?]\s+/)
      .map(function (line) {
        return String(line || "").trim();
      })
      .filter(Boolean)
      .slice(0, 3)
      .map(function (line, idx) {
        return {
          title: idx === 0 ? "Setup" : idx === 1 ? "Execution" : "Finish",
          description: line,
        };
      });
  }

  function getCommonMistakes(info) {
    const category = String((info && info.category) || "").toLowerCase();
    const mistakes = [];

    if (category === "compound") {
      mistakes.push("Using momentum instead of controlled force through full range.");
      mistakes.push("Skipping core bracing and losing neutral spine under load.");
    } else {
      mistakes.push("Rushing reps and removing tension from the target muscle.");
      mistakes.push("Using too much weight and compensating with body sway.");
    }

    mistakes.push("Cutting warm-up sets before top working sets.");
    return mistakes.slice(0, 3);
  }

  function getExerciseGuideData(exerciseName) {
    const name = String(exerciseName || "").trim();
    if (!name || typeof getExerciseInfo !== "function") return null;

    const info = getExerciseInfo(name);
    if (!info) return null;

    const primary = uniq(Array.isArray(info.primary) ? info.primary : []);
    const secondary = uniq(Array.isArray(info.secondary) ? info.secondary : []);
    const cues = getFormCueLines(info);
    const mistakes = getCommonMistakes(info);

    return {
      name: info.name || name,
      category: String(info.category || "").toUpperCase() || "GENERAL",
      primary: primary,
      secondary: secondary,
      cues: cues,
      mistakes: mistakes,
    };
  }

  function renderExerciseGuideInline(exerciseName, options) {
    const opts = options || {};
    const data = getExerciseGuideData(exerciseName);
    if (!data) {
      return '<div class="exercise-guide-empty text-xs">Select an exercise to view target muscles and form cues.</div>';
    }

    const primaryChips = data.primary.length
      ? data.primary
          .map(function (m) {
            return '<span class="exercise-guide-chip is-primary">' + esc(muscleLabel(m)) + "</span>";
          })
          .join("")
      : '<span class="exercise-guide-chip">General</span>';

    const secondaryChips = data.secondary.length
      ? data.secondary
          .map(function (m) {
            return '<span class="exercise-guide-chip">' + esc(muscleLabel(m)) + "</span>";
          })
          .join("")
      : '<span class="text-xs" style="color:var(--text2)">No secondary muscles listed</span>';

    const cueRows = data.cues
      .map(function (cue) {
        return (
          '<div class="exercise-guide-row">' +
          '<div class="exercise-guide-row-title">' + esc(cue.title) + "</div>" +
          '<div class="exercise-guide-row-copy">' + esc(cue.description) + "</div>" +
          "</div>"
        );
      })
      .join("");

    const mistakeRows = data.mistakes
      .map(function (m, idx) {
        return '<li><strong>' + String(idx + 1).padStart(2, "0") + ".</strong> " + esc(m) + "</li>";
      })
      .join("");

    const openAttr = opts.openByDefault ? " open" : "";

    return (
      '<details class="exercise-guide-inline"' +
      openAttr +
      ">" +
      '<summary><span>Exercise Guide</span><span class="hint">Tap to expand</span></summary>' +
      '<div class="exercise-guide-body">' +
      '<div class="exercise-guide-head">' +
      '<div class="exercise-guide-name">' +
      esc(data.name) +
      "</div>" +
      '<span class="tag tag-blue">' +
      esc(data.category || "GENERAL") +
      "</span>" +
      "</div>" +
      '<div class="exercise-guide-block">' +
      '<div class="exercise-guide-label">Target Muscles</div>' +
      '<div class="exercise-guide-chip-row">' +
      primaryChips +
      "</div>" +
      '<div class="exercise-guide-label mt-8">Support Muscles</div>' +
      '<div class="exercise-guide-chip-row">' +
      secondaryChips +
      "</div>" +
      "</div>" +
      '<div class="exercise-guide-block">' +
      '<div class="exercise-guide-label">Form Cues</div>' +
      cueRows +
      "</div>" +
      '<div class="exercise-guide-block">' +
      '<div class="exercise-guide-label">Common Mistakes</div>' +
      '<ul class="exercise-guide-mistakes">' +
      mistakeRows +
      "</ul>" +
      "</div>" +
      "</div>" +
      "</details>"
    );
  }

  window.getExerciseGuideData = getExerciseGuideData;
  window.renderExerciseGuideInline = renderExerciseGuideInline;
})();
