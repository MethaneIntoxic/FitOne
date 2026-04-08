// ========== PERIODIZED TRAINING PLAN GENERATOR ==========
// Multi-week progression generator used by Protocols view (W26).

const PLAN_EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced", "competitor"];

function normalizePlanExperienceLevel(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (PLAN_EXPERIENCE_LEVELS.includes(raw)) return raw;
  if (raw === "elite") return "advanced";
  if (raw === "pro") return "competitor";
  return "beginner";
}

function getDefaultPlanWeeksForExperience(level) {
  const normalized = normalizePlanExperienceLevel(level);
  if (normalized === "competitor") return 16;
  if (normalized === "advanced") return 12;
  if (normalized === "intermediate") return 10;
  return 8;
}

function clampPlanWeeks(level, weeks) {
  const normalized = normalizePlanExperienceLevel(level);
  const fallback = getDefaultPlanWeeksForExperience(normalized);
  const raw = Number(weeks);
  const min = normalized === "competitor" ? 8 : 4;
  const max = normalized === "competitor" ? 24 : 20;
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.round(raw)));
}

function sanitizeProtocolForPlan(protocol) {
  const source = protocol || {};
  const sourceExercises = Array.isArray(source.exercises) ? source.exercises : [];

  const exercises = sourceExercises
    .map((exercise, index) => {
      const row = exercise || {};
      const name = String(row.name || "").trim();
      if (!name) return null;

      const sets = Math.max(1, Number(row.sets) || 3);
      const reps = Math.max(1, Number(row.reps) || 8);
      const weight = Math.max(0, Number(row.weight) || 0);
      const rpe = Number.isFinite(Number(row.rpe)) ? Number(row.rpe) : 7;

      return {
        idx: index + 1,
        name,
        sets,
        reps,
        weight,
        rpe,
      };
    })
    .filter(Boolean);

  return {
    id: source.id || null,
    name: String(source.name || "Protocol").trim() || "Protocol",
    description: String(source.description || "").trim(),
    exercises,
  };
}

function getWeightIncrement(unit, baseWeight) {
  const normalizedUnit = String(unit || "kg").toLowerCase();
  const isLbs = normalizedUnit === "lbs" || normalizedUnit === "lb";
  const heavyThreshold = isLbs ? 155 : 70;
  if (Number(baseWeight) >= heavyThreshold) return isLbs ? 5 : 2.5;
  return isLbs ? 2.5 : 1.25;
}

function roundWeight(value, unit) {
  const increment = getWeightIncrement(unit, value);
  if (increment <= 0) return Math.max(0, Math.round(Number(value) * 10) / 10);
  return Math.max(0, Math.round(Number(value) / increment) * increment);
}

function clampRpe(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return 7;
  return Math.max(5, Math.min(10, Math.round(raw * 10) / 10));
}

function applyExerciseProfile(base, profile, unit) {
  const setMult = Number(profile.setMult) || 1;
  const repMult = Number(profile.repMult) || 1;
  const loadMult = Number(profile.loadMult) || 1;
  const rpeDelta = Number(profile.rpeDelta) || 0;

  const nextSets = Math.max(1, Math.round(base.sets * setMult));
  const nextReps = Math.max(1, Math.round(base.reps * repMult));
  const rawWeight = base.weight > 0 ? base.weight * loadMult : 0;

  return {
    name: base.name,
    sets: nextSets,
    reps: nextReps,
    weight: rawWeight > 0 ? roundWeight(rawWeight, unit) : 0,
    targetRPE: clampRpe(base.rpe + rpeDelta),
  };
}

function buildBeginnerWeek(baseExercises, weekNumber, unit) {
  const loadStep = weekNumber - 1;
  const isDeload = weekNumber > 1 && weekNumber % 6 === 0;

  const exercises = baseExercises.map((base) => {
    const progression = {
      setMult: isDeload ? 0.75 : 1,
      repMult: isDeload ? 0.9 : 1,
      loadMult: 1,
      rpeDelta: isDeload ? -0.8 : 0.1 * loadStep,
    };

    const next = applyExerciseProfile(base, progression, unit);
    if (base.weight > 0 && !isDeload) {
      const inc = getWeightIncrement(unit, base.weight) * loadStep;
      next.weight = roundWeight(base.weight + inc, unit);
    }
    return next;
  });

  return {
    week: weekNumber,
    phase: "Linear Overload",
    focus: isDeload ? "Technique + recovery consolidation" : "Add load each session while keeping form tight",
    isDeload,
    exercises,
  };
}

function buildIntermediateWeek(baseExercises, weekNumber, unit) {
  const waves = [
    { phase: "Undulating Volume", focus: "Higher reps and total volume", setMult: 1.1, repMult: 1.2, loadMult: 0.9, rpeDelta: -0.4 },
    { phase: "Undulating Hypertrophy", focus: "Moderate load with controlled tempo", setMult: 1, repMult: 1, loadMult: 1, rpeDelta: 0 },
    { phase: "Undulating Strength", focus: "Heavier work at lower reps", setMult: 0.95, repMult: 0.78, loadMult: 1.08, rpeDelta: 0.5 },
    { phase: "Undulating Power", focus: "Fast intent with heavy top sets", setMult: 0.85, repMult: 0.65, loadMult: 1.14, rpeDelta: 0.8 },
  ];

  const wave = waves[(weekNumber - 1) % waves.length];
  const isDeload = weekNumber > 1 && weekNumber % 8 === 0;
  const profile = isDeload
    ? { ...wave, phase: "Deload", focus: "Drop fatigue and reset movement quality", setMult: 0.65, repMult: 0.85, loadMult: 0.86, rpeDelta: -1.2 }
    : wave;

  const exercises = baseExercises.map((base) => applyExerciseProfile(base, profile, unit));

  return {
    week: weekNumber,
    phase: profile.phase,
    focus: profile.focus,
    isDeload,
    exercises,
  };
}

function getAdvancedBlockProfile(weekNumber, totalWeeks) {
  const hypertrophyWeeks = Math.max(2, Math.round(totalWeeks * 0.4));
  const strengthWeeks = Math.max(2, Math.round(totalWeeks * 0.35));
  const peakStart = hypertrophyWeeks + strengthWeeks + 1;

  if (weekNumber <= hypertrophyWeeks) {
    const isDeload = weekNumber === hypertrophyWeeks;
    return isDeload
      ? { phase: "Hypertrophy Deload", focus: "Recover before strength block", setMult: 0.68, repMult: 0.92, loadMult: 0.86, rpeDelta: -1.1, isDeload: true }
      : { phase: "Hypertrophy Block", focus: "Build volume and muscle tolerance", setMult: 1.12, repMult: 1.15, loadMult: 0.9, rpeDelta: -0.2, isDeload: false };
  }

  if (weekNumber < peakStart) {
    const isDeload = weekNumber === hypertrophyWeeks + strengthWeeks;
    return isDeload
      ? { phase: "Strength Deload", focus: "Resensitize before peaking", setMult: 0.7, repMult: 0.9, loadMult: 0.88, rpeDelta: -1.2, isDeload: true }
      : { phase: "Strength Block", focus: "Increase force production at lower reps", setMult: 0.98, repMult: 0.8, loadMult: 1.09, rpeDelta: 0.6, isDeload: false };
  }

  const isLastWeek = weekNumber === totalWeeks;
  return isLastWeek
    ? { phase: "Taper", focus: "Peak freshness with sharp low-volume work", setMult: 0.62, repMult: 0.72, loadMult: 0.94, rpeDelta: -0.9, isDeload: true }
    : { phase: "Peaking Block", focus: "High intensity with strict execution", setMult: 0.82, repMult: 0.62, loadMult: 1.17, rpeDelta: 1, isDeload: false };
}

function buildAdvancedWeek(baseExercises, weekNumber, totalWeeks, unit) {
  const profile = getAdvancedBlockProfile(weekNumber, totalWeeks);
  const exercises = baseExercises.map((base) => applyExerciseProfile(base, profile, unit));

  return {
    week: weekNumber,
    phase: profile.phase,
    focus: profile.focus,
    isDeload: !!profile.isDeload,
    exercises,
  };
}

function getCompetitorProfile(weekNumber, totalWeeks) {
  const cycle = Math.max(4, Math.round(totalWeeks / 4));
  const meso = Math.ceil(weekNumber / cycle);

  if (weekNumber === totalWeeks) {
    return {
      phase: "Contest Taper",
      focus: "Deload while preserving sharp movement patterns",
      setMult: 0.55,
      repMult: 0.8,
      loadMult: 0.88,
      rpeDelta: -1.3,
      isDeload: true,
    };
  }

  if (weekNumber % 4 === 0) {
    return {
      phase: "Prep Deload",
      focus: "Systemic fatigue drop and technique reinforcement",
      setMult: 0.62,
      repMult: 0.9,
      loadMult: 0.9,
      rpeDelta: -1,
      isDeload: true,
    };
  }

  if (meso === 1) {
    return {
      phase: "Accumulation",
      focus: "Volume base and work capacity",
      setMult: 1.15,
      repMult: 1.08,
      loadMult: 0.9,
      rpeDelta: -0.3,
      isDeload: false,
    };
  }

  if (meso === 2) {
    return {
      phase: "Intensification",
      focus: "Shift toward heavier compounds",
      setMult: 1,
      repMult: 0.88,
      loadMult: 1.05,
      rpeDelta: 0.4,
      isDeload: false,
    };
  }

  if (meso === 3) {
    return {
      phase: "Transmutation",
      focus: "High force production and low-rep quality",
      setMult: 0.88,
      repMult: 0.72,
      loadMult: 1.12,
      rpeDelta: 0.8,
      isDeload: false,
    };
  }

  return {
    phase: "Peak Week Build",
    focus: "Maintain intensity while reducing volume",
    setMult: 0.75,
    repMult: 0.65,
    loadMult: 1.16,
    rpeDelta: 0.9,
    isDeload: false,
  };
}

function buildCompetitorWeek(baseExercises, weekNumber, totalWeeks, unit) {
  const profile = getCompetitorProfile(weekNumber, totalWeeks);
  const exercises = baseExercises.map((base) => applyExerciseProfile(base, profile, unit));

  return {
    week: weekNumber,
    phase: profile.phase,
    focus: profile.focus,
    isDeload: !!profile.isDeload,
    exercises,
  };
}

function buildWeeks(level, baseExercises, totalWeeks, unit) {
  const weeks = [];
  for (let i = 1; i <= totalWeeks; i++) {
    if (level === "competitor") {
      weeks.push(buildCompetitorWeek(baseExercises, i, totalWeeks, unit));
      continue;
    }
    if (level === "advanced") {
      weeks.push(buildAdvancedWeek(baseExercises, i, totalWeeks, unit));
      continue;
    }
    if (level === "intermediate") {
      weeks.push(buildIntermediateWeek(baseExercises, i, unit));
      continue;
    }
    weeks.push(buildBeginnerWeek(baseExercises, i, unit));
  }
  return weeks;
}

function countDeloadWeeks(weeks) {
  return weeks.filter((week) => week && week.isDeload).length;
}

function createPlanId() {
  if (typeof uid === "function") return uid();
  return "plan_" + Date.now() + "_" + Math.round(Math.random() * 1000000);
}

function generatePeriodizedTrainingPlan(protocol, options) {
  const clean = sanitizeProtocolForPlan(protocol);
  if (!clean.exercises.length) {
    return {
      status: "invalid",
      message: "Protocol must contain at least one exercise",
      plan: null,
    };
  }

  const opts = options || {};
  const level = normalizePlanExperienceLevel(opts.experienceLevel || (typeof settings !== "undefined" ? settings.experienceLevel : "beginner"));
  const unit = String(opts.weightUnit || (typeof settings !== "undefined" ? settings.weightUnit : "kg") || "kg").toLowerCase();
  const totalWeeks = clampPlanWeeks(level, opts.weeks);

  const weeks = buildWeeks(level, clean.exercises, totalWeeks, unit);

  const plan = {
    id: createPlanId(),
    protocolId: clean.id,
    protocolName: clean.name,
    protocolDescription: clean.description,
    experienceLevel: level,
    totalWeeks,
    weightUnit: unit,
    generatedAt: Date.now(),
    generatorVersion: "1.0.0",
    deloadWeeks: countDeloadWeeks(weeks),
    weeks,
  };

  return {
    status: "ready",
    message: "Plan generated",
    plan,
  };
}

if (typeof window !== "undefined") {
  window.normalizePlanExperienceLevel = normalizePlanExperienceLevel;
  window.getDefaultPlanWeeksForExperience = getDefaultPlanWeeksForExperience;
  window.generatePeriodizedTrainingPlan = generatePeriodizedTrainingPlan;
}
