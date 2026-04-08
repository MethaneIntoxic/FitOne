// ========== ACHIEVEMENTS ==========
// Badge system with unlock detection across all experience levels

const ACHIEVEMENT_KEY = 'ft_achievements';

const ACHIEVEMENT_DEFS = [
  // === GETTING STARTED ===
  { id: 'first_food', name: 'First Bite', icon: '🍽️', desc: 'Log your first meal', category: 'start', check: () => loadData(KEYS.food).length >= 1 },
  { id: 'first_workout', name: 'Day One', icon: '💪', desc: 'Log your first workout', category: 'start', check: () => loadData(KEYS.workouts).length >= 1 },
  { id: 'first_weight', name: 'On the Scale', icon: '⚖️', desc: 'Log your first body weight', category: 'start', check: () => loadData(KEYS.body).filter(b => b.weight).length >= 1 },
  { id: 'first_water', name: 'Hydrated', icon: '💧', desc: 'Log water intake', category: 'start', check: () => { const w = loadData(KEYS.water); return Object.values(w.daily || {}).some(v => v > 0) || (typeof w === 'object' && Object.keys(w).length > 0); } },
  { id: 'first_photo', name: 'Say Cheese', icon: '📸', desc: 'Take your first progress photo', category: 'start', check: () => loadData(KEYS.photos).length >= 1 },

  // === CONSISTENCY ===
  { id: 'streak_3', name: '3-Day Streak', icon: '🔥', desc: 'Maintain a 3-day logging streak', category: 'consistency', check: () => (calculateStreak() || 0) >= 3 },
  { id: 'streak_7', name: 'One Week Strong', icon: '🔥', desc: '7-day streak', category: 'consistency', check: () => (calculateStreak() || 0) >= 7 },
  { id: 'streak_14', name: 'Two Weeks Running', icon: '🔥', desc: '14-day streak', category: 'consistency', check: () => (calculateStreak() || 0) >= 14 },
  { id: 'streak_30', name: 'Monthly Machine', icon: '🔥', desc: '30-day streak', category: 'consistency', check: () => (calculateStreak() || 0) >= 30 },
  { id: 'streak_90', name: 'Quarter Beast', icon: '🔥', desc: '90-day streak', category: 'consistency', check: () => (calculateStreak() || 0) >= 90 },
  { id: 'streak_180', name: 'Half-Year Lock-In', icon: '🛡️', desc: '180-day streak', category: 'consistency', check: () => (calculateStreak() || 0) >= 180 },
  { id: 'streak_365', name: 'Year of Iron', icon: '👑', desc: '365-day streak', category: 'consistency', check: () => (calculateStreak() || 0) >= 365 },

  // === WORKOUTS ===
  { id: 'workouts_10', name: 'Getting Started', icon: '🏋️', desc: 'Complete 10 workouts', category: 'workouts', check: () => loadData(KEYS.workouts).length >= 10 },
  { id: 'workouts_50', name: 'Gym Regular', icon: '🏋️', desc: 'Complete 50 workouts', category: 'workouts', check: () => loadData(KEYS.workouts).length >= 50 },
  { id: 'workouts_100', name: 'Century Club', icon: '🏋️', desc: 'Complete 100 workouts', category: 'workouts', check: () => loadData(KEYS.workouts).length >= 100 },
  { id: 'workouts_250', name: 'Iron Veteran', icon: '⚡', desc: 'Complete 250 workouts', category: 'workouts', check: () => loadData(KEYS.workouts).length >= 250 },
  { id: 'workouts_500', name: 'Half Thousand', icon: '🏆', desc: 'Complete 500 workouts', category: 'workouts', check: () => loadData(KEYS.workouts).length >= 500 },
  { id: 'workouts_750', name: 'Relentless Engine', icon: '🚀', desc: 'Complete 750 workouts', category: 'workouts', check: () => loadData(KEYS.workouts).length >= 750 },

  // === NUTRITION ===
  { id: 'meals_50', name: 'Meal Logger', icon: '🥗', desc: 'Log 50 meals', category: 'nutrition', check: () => loadData(KEYS.food).length >= 50 },
  { id: 'meals_200', name: 'Nutrition Nerd', icon: '🧮', desc: 'Log 200 meals', category: 'nutrition', check: () => loadData(KEYS.food).length >= 200 },
  { id: 'meals_500', name: 'Macro Master', icon: '👨‍🍳', desc: 'Log 500 meals', category: 'nutrition', check: () => loadData(KEYS.food).length >= 500 },
  { id: 'meals_1000', name: 'Meal Machine', icon: '🍱', desc: 'Log 1000 meals', category: 'nutrition', check: () => loadData(KEYS.food).length >= 1000 },
  { id: 'protein_hit_7', name: 'Protein Week', icon: '🥩', desc: 'Hit protein goal 7 days in a row', category: 'nutrition', check: () => checkConsecutiveGoalDays('protein', 7) },
  { id: 'protein_hit_30', name: 'Protein Discipline', icon: '🥩', desc: 'Hit protein goal 30 days in a row', category: 'nutrition', check: () => checkConsecutiveGoalDays('protein', 30) },

  // === HYDRATION ===
  { id: 'water_goal_7', name: 'Hydration Week', icon: '💧', desc: 'Hit water goal 7 consecutive days', category: 'hydration', check: () => checkWaterGoalStreak(7) },
  { id: 'water_goal_30', name: 'Hydration Habit', icon: '🌊', desc: 'Hit water goal 30 consecutive days', category: 'hydration', check: () => checkWaterGoalStreak(30) },

  // === PRs ===
  { id: 'first_pr', name: 'New Record!', icon: '🏅', desc: 'Set your first personal record', category: 'prs', check: () => loadPRs().length >= 1 },
  { id: 'prs_10', name: 'PR Hunter', icon: '🎯', desc: 'Set 10 personal records', category: 'prs', check: () => loadPRs().length >= 10 },
  { id: 'prs_50', name: 'Record Breaker', icon: '💥', desc: 'Set 50 personal records', category: 'prs', check: () => loadPRs().length >= 50 },
  { id: 'prs_100', name: 'PR Legend', icon: '🌟', desc: 'Set 100 personal records', category: 'prs', check: () => loadPRs().length >= 100 },

  // === BODY ===
  { id: 'measurements_5', name: 'Tracking Progress', icon: '📏', desc: 'Log 5 body measurements', category: 'body', check: () => loadData(KEYS.body).length >= 5 },
  { id: 'measurements_20', name: 'Data-Driven', icon: '📊', desc: 'Log 20 body measurements', category: 'body', check: () => loadData(KEYS.body).length >= 20 },
  { id: 'photos_5', name: 'Visual Progress', icon: '📸', desc: 'Take 5 progress photos', category: 'body', check: () => loadData(KEYS.photos).length >= 5 },
  { id: 'photos_12', name: 'Transformation Doc', icon: '🎬', desc: 'Take 12 progress photos', category: 'body', check: () => loadData(KEYS.photos).length >= 12 },

  // === PROTOCOLS ===
  { id: 'first_protocol', name: 'Planner', icon: '📋', desc: 'Create your first protocol', category: 'protocols', check: () => loadData(KEYS.protocols).length >= 1 },
  { id: 'protocols_5', name: 'Program Builder', icon: '📋', desc: 'Create 5 protocols', category: 'protocols', check: () => loadData(KEYS.protocols).length >= 5 },
  { id: 'protocols_12', name: 'Macrocycle Architect', icon: '🗂️', desc: 'Create 12 protocols', category: 'protocols', check: () => loadData(KEYS.protocols).length >= 12 },

  // === ADVANCED / COMPETITOR ===
  { id: 'tdee_calc', name: 'TDEE Unlocked', icon: '🧮', desc: 'Reach TDEE calculation confidence', category: 'advanced', check: () => { try { const r = calculateAdaptiveTDEE(); return r && r.status !== 'insufficient'; } catch { return false; } } },
  { id: 'weight_loss_5', name: '5kg Down', icon: '📉', desc: 'Lose 5kg from your highest weight', category: 'advanced', check: () => checkWeightChange(-5) },
  { id: 'weight_gain_5', name: '5kg Up', icon: '📈', desc: 'Gain 5kg from your lowest weight', category: 'advanced', check: () => checkWeightChange(5) },
  { id: 'bodyweight_bench', name: 'Bodyweight Bench', icon: '🏋️‍♂️', desc: 'Bench press your bodyweight', category: 'advanced', check: () => hasBodyweightBench() },
  { id: 'total_1000', name: '1000 Total', icon: '🧱', desc: 'Reach a 1000lb total (or 454kg equivalent)', category: 'advanced', check: () => hasThousandTotal() },
  { id: 'squat_2x_bw', name: 'Double Bodyweight Squat', icon: '🦿', desc: 'Squat 2x your bodyweight', category: 'advanced', check: () => hasDoubleBodyweightSquat() },

  // === COMPETITOR ===
  { id: 'peak_week_logged', name: 'Peak Week Logged', icon: '🧾', desc: 'Log a full 7-day peak week with meals and weigh-ins', category: 'competitor', check: () => checkPeakWeekLogging() },
  { id: 'meals_6x7', name: 'Six Meals x7', icon: '🍽️', desc: 'Log at least 6 meals per day for 7 consecutive days', category: 'competitor', check: () => checkConsecutiveMealCount(6, 7) },
  { id: 'prep_16_weeks', name: '16-Week Prep Complete', icon: '🏆', desc: 'Maintain high meal compliance for 16 weeks', category: 'competitor', check: () => checkConsecutiveMealCount(4, 112) },
];

function checkConsecutiveGoalDays(macro, target) {
  const food = loadData(KEYS.food);
  const goal = settings[macro + 'Goal'] || 0;
  if (!goal) return false;
  let consecutive = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = localDateStr(d);
    const dayTotal = food.filter(f => f.date === ds).reduce((a, f) => a + (f[macro] || 0), 0);
    if (dayTotal >= goal * 0.9) { consecutive++; if (consecutive >= target) return true; }
    else consecutive = 0;
  }
  return false;
}

function checkWeightChange(delta) {
  const body = loadData(KEYS.body).filter(b => b.weight).sort((a, b) => a.date.localeCompare(b.date));
  if (body.length < 2) return false;
  if (delta < 0) {
    const max = Math.max(...body.map(b => b.weight));
    const latest = body[body.length - 1].weight;
    return (max - latest) >= Math.abs(delta);
  }
  const min = Math.min(...body.map(b => b.weight));
  const latest = body[body.length - 1].weight;
  return (latest - min) >= delta;
}

function getExerciseMaxLoad(matchers) {
  const needles = Array.isArray(matchers) ? matchers : [matchers];
  const workouts = loadData(KEYS.workouts);
  let maxLoad = 0;
  workouts.forEach((w) => {
    (w.exercises || []).forEach((ex) => {
      const name = String(ex.name || '').toLowerCase();
      if (!needles.some((needle) => name.includes(String(needle)))) return;
      if (Array.isArray(ex.sets) && ex.sets.length) {
        ex.sets.forEach((setRow) => {
          const load = Number(setRow.weight) || Number(ex.weight) || 0;
          if (load > maxLoad) maxLoad = load;
        });
      } else {
        const load = Number(ex.weight) || 0;
        if (load > maxLoad) maxLoad = load;
      }
    });
  });
  return maxLoad;
}

function hasBodyweightBench() {
  const bw = getPrimaryBodyweight();
  if (!bw) return false;
  const benchMax = getExerciseMaxLoad(['bench press', 'bench']);
  return benchMax >= bw;
}

function hasThousandTotal() {
  const squat = getExerciseMaxLoad(['squat']);
  const bench = getExerciseMaxLoad(['bench press', 'bench']);
  const deadlift = getExerciseMaxLoad(['deadlift']);
  if (!(squat && bench && deadlift)) return false;
  const threshold = (settings.weightUnit || 'kg') === 'lb' ? 1000 : 453.592;
  return (squat + bench + deadlift) >= threshold;
}

function hasDoubleBodyweightSquat() {
  const bw = getPrimaryBodyweight();
  if (!bw) return false;
  const squatMax = getExerciseMaxLoad(['squat']);
  return squatMax >= bw * 2;
}

function checkConsecutiveMealCount(minMealsPerDay, targetDays) {
  const food = loadData(KEYS.food);
  const byDate = {};
  food.forEach((f) => {
    if (!f || !f.date) return;
    byDate[f.date] = (byDate[f.date] || 0) + 1;
  });
  const dates = Object.keys(byDate).sort();
  if (!dates.length) return false;

  const dayMs = 24 * 60 * 60 * 1000;
  let streak = 0;
  let prevTs = 0;

  for (let i = 0; i < dates.length; i++) {
    const ds = dates[i];
    const ts = Date.parse(ds + 'T00:00:00');
    if (!Number.isFinite(ts)) continue;
    if (prevTs && (ts - prevTs) !== dayMs) streak = 0;
    if ((byDate[ds] || 0) >= minMealsPerDay) streak += 1;
    else streak = 0;
    if (streak >= targetDays) return true;
    prevTs = ts;
  }
  return false;
}

function checkPeakWeekLogging() {
  const food = loadData(KEYS.food);
  const body = loadData(KEYS.body);
  const mealsByDate = {};
  const weightDates = {};

  food.forEach((f) => {
    if (!f || !f.date) return;
    mealsByDate[f.date] = (mealsByDate[f.date] || 0) + 1;
  });
  body.forEach((b) => {
    if (!b || !b.date) return;
    if (Number(b.weight) > 0) weightDates[b.date] = true;
  });

  const dates = Object.keys(mealsByDate).sort();
  const dayMs = 24 * 60 * 60 * 1000;
  for (let i = 0; i < dates.length; i++) {
    const startTs = Date.parse(dates[i] + 'T00:00:00');
    if (!Number.isFinite(startTs)) continue;
    let ok = true;
    for (let d = 0; d < 7; d++) {
      const curr = localDateStr(new Date(startTs + d * dayMs));
      if ((mealsByDate[curr] || 0) < 5 || !weightDates[curr]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

function checkWaterGoalStreak(targetDays) {
  const water = loadData(KEYS.water);
  const source = water && typeof water === 'object' && !Array.isArray(water)
    ? (water.daily && typeof water.daily === 'object' ? water.daily : water)
    : {};
  const goal = Number(settings.waterGoal) || 0;
  if (!goal) return false;

  const dates = Object.keys(source)
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
    .sort();
  if (!dates.length) return false;

  const dayMs = 24 * 60 * 60 * 1000;
  let streak = 0;
  let prevTs = 0;

  for (let i = 0; i < dates.length; i++) {
    const ds = dates[i];
    const ts = Date.parse(ds + 'T00:00:00');
    if (!Number.isFinite(ts)) continue;
    if (prevTs && (ts - prevTs) !== dayMs) streak = 0;
    const amount = Number(source[ds]) || 0;
    if (amount >= goal * 0.9) streak += 1;
    else streak = 0;
    if (streak >= targetDays) return true;
    prevTs = ts;
  }

  return false;
}

// ========== ACHIEVEMENT STORAGE ==========
function loadUnlockedAchievements() {
  try { return JSON.parse(localStorage.getItem(ACHIEVEMENT_KEY)) || {}; } catch { return {}; }
}

function saveUnlockedAchievements(unlocked) {
  try { localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(unlocked)); } catch {}
}

// ========== CHECK & UNLOCK ==========
function checkAchievements() {
  const unlocked = loadUnlockedAchievements();
  const newlyUnlocked = [];

  ACHIEVEMENT_DEFS.forEach(def => {
    if (unlocked[def.id]) return;
    try {
      if (def.check()) {
        unlocked[def.id] = { unlockedAt: Date.now(), date: today() };
        newlyUnlocked.push(def);
      }
    } catch {}
  });

  if (newlyUnlocked.length > 0) {
    saveUnlockedAchievements(unlocked);
    newlyUnlocked.forEach(def => {
      showToast(def.icon + ' ' + def.name + ' unlocked!');
    });
  }

  return newlyUnlocked;
}

function getAchievementProgress() {
  const unlocked = loadUnlockedAchievements();
  const total = ACHIEVEMENT_DEFS.length;
  const done = Object.keys(unlocked).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0, unlocked };
}

// ========== RENDER BADGES ==========
function renderAchievementGallery() {
  const container = $('achievementGallery');
  if (!container) return;
  const unlocked = loadUnlockedAchievements();
  const progress = getAchievementProgress();

  const categories = {};
  ACHIEVEMENT_DEFS.forEach(def => {
    if (!categories[def.category]) categories[def.category] = [];
    categories[def.category].push(def);
  });

  let html = '<div class="card-title">🏆 Achievements (' + progress.done + '/' + progress.total + ')</div>';
  html += '<div class="achievement-progress"><div class="achievement-progress-fill" style="width:' + progress.pct + '%"></div></div>';
  html += '<div class="achievement-pct">' + progress.pct + '% complete</div>';

  Object.entries(categories).forEach(([cat, defs]) => {
    const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
    html += '<div class="achievement-category"><div class="achievement-cat-title">' + catLabel + '</div><div class="achievement-grid">';
    defs.forEach(def => {
      const isUnlocked = !!unlocked[def.id];
      html += '<div class="achievement-badge' + (isUnlocked ? ' unlocked' : ' locked') + '" title="' + escAttr(def.desc) + '">' +
        '<span class="achievement-icon">' + def.icon + '</span>' +
        '<span class="achievement-name">' + esc(def.name) + '</span>' +
        (isUnlocked ? '<span class="achievement-date">' + fmtDate(unlocked[def.id].date) + '</span>' : '') +
      '</div>';
    });
    html += '</div></div>';
  });

  container.innerHTML = html;
}
