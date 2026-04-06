// ========== VOLUME TRACKER ==========
// Weekly volume per muscle group, periodization alerts, training frequency analysis

function calculateWeeklyVolume(weeksBack) {
  const back = weeksBack || 0;
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (back * 7));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const startStr = localDateStr(weekStart);
  const endStr = localDateStr(weekEnd);

  const workouts = loadData(KEYS.workouts).filter(w => w.date >= startStr && w.date < endStr);
  const volume = {};
  const frequency = {};

  workouts.forEach(w => {
    (w.exercises || []).forEach(ex => {
      const info = typeof getExerciseInfo === 'function' ? getExerciseInfo(ex.name) : null;
      const muscles = info ? [...(info.primary || []), ...(info.secondary || [])] : ['unknown'];
      const sets = ex.sets || 0;
      const reps = ex.reps || 0;
      const weight = ex.weight || 0;
      const vol = sets * reps * weight;

      muscles.forEach(m => {
        if (!volume[m]) volume[m] = { sets: 0, volume: 0, exercises: 0 };
        volume[m].sets += sets;
        volume[m].volume += vol;
        volume[m].exercises++;

        if (!frequency[m]) frequency[m] = new Set();
        frequency[m].add(w.date);
      });
    });
  });

  // Convert frequency Sets to counts
  Object.keys(frequency).forEach(m => { frequency[m] = frequency[m].size; });

  return { volume, frequency, workoutCount: workouts.length };
}

// ========== VOLUME RECOMMENDATIONS ==========
const VOLUME_LANDMARKS = {
  chest: { mev: 8, mrv: 22, name: 'Chest' },
  back: { mev: 8, mrv: 25, name: 'Back' },
  lats: { mev: 8, mrv: 25, name: 'Lats' },
  shoulders: { mev: 6, mrv: 20, name: 'Shoulders' },
  biceps: { mev: 6, mrv: 20, name: 'Biceps' },
  triceps: { mev: 4, mrv: 18, name: 'Triceps' },
  quads: { mev: 6, mrv: 20, name: 'Quads' },
  hamstrings: { mev: 4, mrv: 16, name: 'Hamstrings' },
  glutes: { mev: 4, mrv: 16, name: 'Glutes' },
  calves: { mev: 6, mrv: 16, name: 'Calves' },
  abs: { mev: 0, mrv: 20, name: 'Abs' },
  traps: { mev: 0, mrv: 16, name: 'Traps' },
  forearms: { mev: 0, mrv: 12, name: 'Forearms' },
  lowBack: { mev: 0, mrv: 10, name: 'Lower Back' },
};

function getVolumeAlerts(weeklyVolume) {
  const alerts = [];
  Object.entries(weeklyVolume).forEach(([muscle, data]) => {
    const landmark = VOLUME_LANDMARKS[muscle];
    if (!landmark) return;
    if (data.sets < landmark.mev && landmark.mev > 0) {
      alerts.push({ type: 'warn', muscle: landmark.name, msg: landmark.name + ': ' + data.sets + ' sets (below MEV of ' + landmark.mev + ')' });
    }
    if (data.sets > landmark.mrv) {
      alerts.push({ type: 'danger', muscle: landmark.name, msg: landmark.name + ': ' + data.sets + ' sets (exceeds MRV of ' + landmark.mrv + '!)' });
    }
  });
  return alerts;
}

// ========== PERIODIZATION TRACKING ==========
function getVolumeProgression() {
  const weeks = [];
  for (let i = 3; i >= 0; i--) {
    weeks.push(calculateWeeklyVolume(i));
  }
  return weeks;
}

function getPeriodizationStatus() {
  const weeks = getVolumeProgression();
  const totalSets = weeks.map(w => Object.values(w.volume).reduce((a, v) => a + v.sets, 0));

  if (totalSets.every(s => s === 0)) return { status: 'none', msg: 'Not enough data yet' };

  const recent = totalSets.slice(-2);
  const trend = recent[1] - recent[0];

  if (totalSets[totalSets.length - 1] === 0) return { status: 'rest', msg: 'No training this week — deload?' };

  const avgSets = totalSets.reduce((a, b) => a + b, 0) / totalSets.filter(s => s > 0).length;

  if (trend > avgSets * 0.3) return { status: 'overreach', msg: 'Volume jumped ' + Math.round(trend) + ' sets — watch for fatigue' };
  if (totalSets[totalSets.length - 1] < avgSets * 0.5 && totalSets[totalSets.length - 1] > 0) return { status: 'deload', msg: 'Reduced volume detected — good deload week' };
  if (trend > 0) return { status: 'progressing', msg: 'Volume progressing: +' + Math.round(trend) + ' sets week-over-week' };
  if (trend < 0) return { status: 'tapering', msg: 'Volume tapering: ' + Math.round(trend) + ' sets vs last week' };
  return { status: 'maintenance', msg: 'Volume stable — consider progressive overload' };
}

// ========== RENDER VOLUME CHART ==========
function renderVolumeChart() {
  const container = $('volumeChartContainer');
  if (!container) return;

  const current = calculateWeeklyVolume(0);
  const alerts = getVolumeAlerts(current.volume);
  const periodization = getPeriodizationStatus();

  const muscles = Object.entries(current.volume)
    .filter(([m]) => VOLUME_LANDMARKS[m])
    .sort((a, b) => b[1].sets - a[1].sets);

  if (!muscles.length) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">📊</div><div class="empty-text">Log workouts to see your volume breakdown</div></div>';
    return;
  }

  let html = '<div class="card-title">💪 Weekly Volume</div>';

  // Periodization status
  const statusColors = { progressing: 'var(--green)', deload: 'var(--blue)', overreach: 'var(--orange)', tapering: 'var(--text2)', maintenance: 'var(--text2)', rest: 'var(--text2)' };
  html += '<div class="volume-status" style="color:' + (statusColors[periodization.status] || 'var(--text2)') + '">' + periodization.msg + '</div>';

  // Volume bars
  html += '<div class="volume-bars">';
  const maxSets = Math.max(...muscles.map(([,d]) => d.sets), 1);
  muscles.forEach(([muscle, data]) => {
    const landmark = VOLUME_LANDMARKS[muscle] || {};
    const pct = Math.min((data.sets / Math.max(landmark.mrv || maxSets, 1)) * 100, 100);
    const isOver = landmark.mrv && data.sets > landmark.mrv;
    const isUnder = landmark.mev && data.sets < landmark.mev;
    const color = isOver ? 'var(--red)' : isUnder ? 'var(--orange)' : 'var(--accent)';
    html += '<div class="volume-bar-row">' +
      '<span class="volume-bar-label">' + (landmark.name || muscle) + '</span>' +
      '<div class="volume-bar-track"><div class="volume-bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
      '<span class="volume-bar-value">' + data.sets + 's</span>' +
    '</div>';
  });
  html += '</div>';

  // Alerts
  if (alerts.length) {
    html += '<div class="volume-alerts mt-8">';
    alerts.forEach(a => {
      html += '<div class="insight insight-' + (a.type === 'danger' ? 'warn' : 'tip') + '"><span class="insight-icon">' + (a.type === 'danger' ? '⚠️' : '💡') + '</span>' + a.msg + '</div>';
    });
    html += '</div>';
  }

  container.innerHTML = html;
}

// ========== SMART REST TIMER ==========
function getSmartRestTime(exerciseName) {
  const info = typeof getExerciseInfo === 'function' ? getExerciseInfo(exerciseName) : null;
  if (!info) return 90; // Default

  if (info.category === 'compound') {
    // Heavy compounds get longer rest
    const primaryMuscles = info.primary || [];
    const isLegCompound = primaryMuscles.some(m => ['quads', 'hamstrings', 'glutes'].includes(m));
    if (isLegCompound) return 180; // 3 min for squats/deads
    return 150; // 2.5 min for bench/rows/press
  }

  // Isolation exercises get shorter rest
  return 90; // 1.5 min for isolation
}

function suggestRestAfterSet(exerciseName) {
  const restTime = getSmartRestTime(exerciseName);
  const disp = $('timerDisplay');
  if (!disp) return;

  // Auto-start the timer with the smart rest time
  startTimer(restTime);

  // Show what exercise triggered it
  const info = typeof getExerciseInfo === 'function' ? getExerciseInfo(exerciseName) : null;
  const category = info ? (info.category === 'compound' ? 'Compound' : 'Isolation') : '';
  showToast('⏱️ Rest ' + Math.floor(restTime / 60) + ':' + String(restTime % 60).padStart(2, '0') + (category ? ' (' + category + ')' : ''));
}

// ========== FATIGUE MONITOR ==========
function calculateFatigueScore() {
  const workouts = loadData(KEYS.workouts);
  const now = new Date();
  const last7 = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last7.push(localDateStr(d));
  }

  const recentWorkouts = workouts.filter(w => last7.includes(w.date));
  const totalSets = recentWorkouts.reduce((a, w) => a + (w.exercises || []).reduce((s, e) => s + (e.sets || 0), 0), 0);
  const totalDuration = recentWorkouts.reduce((a, w) => a + (w.duration || 0), 0);
  const daysTraining = new Set(recentWorkouts.map(w => w.date)).size;

  // Average RPE from recent workouts
  let avgRPE = 0;
  let rpeCount = 0;
  recentWorkouts.forEach(w => {
    (w.exercises || []).forEach(ex => {
      if (ex.rpe && ex.rpe > 0) { avgRPE += ex.rpe; rpeCount++; }
    });
  });
  avgRPE = rpeCount ? avgRPE / rpeCount : 0;

  // Fatigue score: higher = more fatigued
  let score = 0;
  score += Math.min(daysTraining / 7 * 30, 30); // Training frequency factor (max 30)
  score += Math.min(totalSets / 100 * 30, 30); // Volume factor (max 30)
  score += Math.min(avgRPE / 10 * 25, 25); // Intensity factor (max 25)
  score += Math.min(totalDuration / 420 * 15, 15); // Duration factor (max 15)

  return {
    score: Math.round(score),
    daysTraining,
    totalSets,
    totalDuration,
    avgRPE: Math.round(avgRPE * 10) / 10,
    recommendation: score > 70 ? 'Consider a deload or rest day' : score > 50 ? 'Monitor recovery closely' : score > 30 ? 'Recovery looks adequate' : 'Fresh — push harder if goals allow',
    level: score > 70 ? 'high' : score > 50 ? 'moderate' : score > 30 ? 'low' : 'fresh',
  };
}

function renderFatigueMonitor() {
  const container = $('fatigueContainer');
  if (!container) return;

  const fatigue = calculateFatigueScore();

  const colors = { fresh: 'var(--green)', low: 'var(--green)', moderate: 'var(--orange)', high: 'var(--red)' };
  const icons = { fresh: '🟢', low: '🟢', moderate: '🟡', high: '🔴' };
  const color = colors[fatigue.level] || 'var(--text2)';

  container.innerHTML =
    '<div class="card-title">🧠 Fatigue Monitor</div>' +
    '<div class="fatigue-meter">' +
      '<div class="fatigue-score" style="color:' + color + '">' + fatigue.score + '</div>' +
      '<div class="fatigue-label">' + icons[fatigue.level] + ' ' + fatigue.level.toUpperCase() + '</div>' +
    '</div>' +
    '<div class="text-sm text-center" style="color:var(--text2)">' + fatigue.recommendation + '</div>' +
    '<div class="stat-row mt-12">' +
      '<div class="stat-box"><div class="val">' + fatigue.daysTraining + '</div><div class="lbl">Days</div></div>' +
      '<div class="stat-box"><div class="val">' + fatigue.totalSets + '</div><div class="lbl">Sets</div></div>' +
      '<div class="stat-box"><div class="val">' + fatigue.totalDuration + '</div><div class="lbl">Minutes</div></div>' +
      (fatigue.avgRPE ? '<div class="stat-box"><div class="val">' + fatigue.avgRPE + '</div><div class="lbl">Avg RPE</div></div>' : '') +
    '</div>';
}

// ========== MUSCLE HEATMAP ==========
function renderMuscleHeatmap() {
  const container = $('muscleHeatmap');
  if (!container) return;

  const current = calculateWeeklyVolume(0);
  const muscles = Object.entries(current.volume).filter(([m]) => VOLUME_LANDMARKS[m]);

  if (!muscles.length) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">🗺️</div><div class="empty-text">Train to light up your muscle map</div></div>';
    return;
  }

  const maxSets = Math.max(...muscles.map(([, d]) => d.sets), 1);

  let html = '<div class="card-title">🗺️ Muscle Heatmap</div><div class="heatmap-grid">';
  const muscleOrder = ['chest', 'back', 'lats', 'shoulders', 'biceps', 'triceps', 'forearms', 'traps', 'abs', 'quads', 'hamstrings', 'glutes', 'calves', 'lowBack'];

  muscleOrder.forEach(m => {
    const data = current.volume[m];
    const landmark = VOLUME_LANDMARKS[m];
    if (!landmark) return;
    const sets = data ? data.sets : 0;
    const intensity = sets / maxSets;
    const hue = sets === 0 ? 0 : intensity > 0.7 ? 120 : intensity > 0.4 ? 60 : 30;
    const sat = sets === 0 ? 0 : 70;
    const light = sets === 0 ? 20 : 30 + intensity * 25;
    html += '<div class="heatmap-cell" style="background:hsl(' + hue + ',' + sat + '%,' + light + '%)" title="' + landmark.name + ': ' + sets + ' sets">' +
      '<span class="heatmap-name">' + landmark.name + '</span>' +
      '<span class="heatmap-sets">' + sets + '</span>' +
    '</div>';
  });

  html += '</div>';
  container.innerHTML = html;
}
