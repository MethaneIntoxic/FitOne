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
  { id: 'streak_365', name: 'Year of Iron', icon: '👑', desc: '365-day streak', category: 'consistency', check: () => (calculateStreak() || 0) >= 365 },

  // === WORKOUTS ===
  { id: 'workouts_10', name: 'Getting Started', icon: '🏋️', desc: 'Complete 10 workouts', category: 'workouts', check: () => loadData(KEYS.workouts).length >= 10 },
  { id: 'workouts_50', name: 'Gym Regular', icon: '🏋️', desc: 'Complete 50 workouts', category: 'workouts', check: () => loadData(KEYS.workouts).length >= 50 },
  { id: 'workouts_100', name: 'Century Club', icon: '🏋️', desc: 'Complete 100 workouts', category: 'workouts', check: () => loadData(KEYS.workouts).length >= 100 },
  { id: 'workouts_250', name: 'Iron Veteran', icon: '⚡', desc: 'Complete 250 workouts', category: 'workouts', check: () => loadData(KEYS.workouts).length >= 250 },
  { id: 'workouts_500', name: 'Half Thousand', icon: '🏆', desc: 'Complete 500 workouts', category: 'workouts', check: () => loadData(KEYS.workouts).length >= 500 },

  // === NUTRITION ===
  { id: 'meals_50', name: 'Meal Logger', icon: '🥗', desc: 'Log 50 meals', category: 'nutrition', check: () => loadData(KEYS.food).length >= 50 },
  { id: 'meals_200', name: 'Nutrition Nerd', icon: '🧮', desc: 'Log 200 meals', category: 'nutrition', check: () => loadData(KEYS.food).length >= 200 },
  { id: 'meals_500', name: 'Macro Master', icon: '👨‍🍳', desc: 'Log 500 meals', category: 'nutrition', check: () => loadData(KEYS.food).length >= 500 },
  { id: 'protein_hit_7', name: 'Protein Week', icon: '🥩', desc: 'Hit protein goal 7 days in a row', category: 'nutrition', check: () => checkConsecutiveGoalDays('protein', 7) },

  // === PRs ===
  { id: 'first_pr', name: 'New Record!', icon: '🏅', desc: 'Set your first personal record', category: 'prs', check: () => loadPRs().length >= 1 },
  { id: 'prs_10', name: 'PR Hunter', icon: '🎯', desc: 'Set 10 personal records', category: 'prs', check: () => loadPRs().length >= 10 },
  { id: 'prs_50', name: 'Record Breaker', icon: '💥', desc: 'Set 50 personal records', category: 'prs', check: () => loadPRs().length >= 50 },

  // === BODY ===
  { id: 'measurements_5', name: 'Tracking Progress', icon: '📏', desc: 'Log 5 body measurements', category: 'body', check: () => loadData(KEYS.body).length >= 5 },
  { id: 'measurements_20', name: 'Data-Driven', icon: '📊', desc: 'Log 20 body measurements', category: 'body', check: () => loadData(KEYS.body).length >= 20 },
  { id: 'photos_5', name: 'Visual Progress', icon: '📸', desc: 'Take 5 progress photos', category: 'body', check: () => loadData(KEYS.photos).length >= 5 },
  { id: 'photos_12', name: 'Transformation Doc', icon: '🎬', desc: 'Take 12 progress photos', category: 'body', check: () => loadData(KEYS.photos).length >= 12 },

  // === PROTOCOLS ===
  { id: 'first_protocol', name: 'Planner', icon: '📋', desc: 'Create your first protocol', category: 'protocols', check: () => loadData(KEYS.protocols).length >= 1 },
  { id: 'protocols_5', name: 'Program Builder', icon: '📋', desc: 'Create 5 protocols', category: 'protocols', check: () => loadData(KEYS.protocols).length >= 5 },

  // === ADVANCED / COMPETITOR ===
  { id: 'tdee_calc', name: 'TDEE Unlocked', icon: '🧮', desc: 'Reach TDEE calculation confidence', category: 'advanced', check: () => { try { const r = calculateAdaptiveTDEE(); return r && r.status !== 'insufficient'; } catch { return false; } } },
  { id: 'weight_loss_5', name: '5kg Down', icon: '📉', desc: 'Lose 5kg from your highest weight', category: 'advanced', check: () => checkWeightChange(-5) },
  { id: 'weight_gain_5', name: '5kg Up', icon: '📈', desc: 'Gain 5kg from your lowest weight', category: 'advanced', check: () => checkWeightChange(5) },
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
