// ========== PR TRACKER ==========
// Detects personal records on workout log and triggers celebrations

const PR_KEYS = { records: 'ft_personal_records' };

function getEstimated1RM(weight, reps) {
  if (typeof calculate1RM === "function") return calculate1RM(weight, reps);
  if (!weight || weight <= 0 || !reps || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

function loadPRs() {
  try { return JSON.parse(localStorage.getItem(PR_KEYS.records)) || []; } catch { return []; }
}
function savePRs(records) {
  try { localStorage.setItem(PR_KEYS.records, JSON.stringify(records)); } catch {}
}

function getPRsForExercise(exerciseName) {
  if (!exerciseName) return {};
  const name = exerciseName.toLowerCase().trim();
  const prs = loadPRs().filter(r => (r.exercise || '').toLowerCase() === name);
  const best = {};
  prs.forEach(r => { if (!best[r.type] || r.value > best[r.type].value) best[r.type] = r; });
  return best;
}

function getAllTimePRs() {
  const prs = loadPRs();
  const byEx = {};
  prs.forEach(r => {
    const k = (r.exercise || '').toLowerCase();
    if (!byEx[k]) byEx[k] = {};
    if (!byEx[k][r.type] || r.value > byEx[k][r.type].value) byEx[k][r.type] = r;
  });
  return byEx;
}

function timestampForPR(pr) {
  if (!pr) return 0;
  if (Number(pr.timestamp) > 0) return Number(pr.timestamp);
  const parsed = Date.parse(pr.date || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPRsSince(daysBack) {
  const cutoff = Date.now() - (Math.max(1, Number(daysBack) || 1) * 24 * 60 * 60 * 1000);
  return loadPRs().filter((pr) => timestampForPR(pr) >= cutoff);
}

function getPRSummary(daysBack) {
  const period = Math.max(1, Number(daysBack) || 90);
  const now = Date.now();
  const periodMs = period * 24 * 60 * 60 * 1000;
  const currentStart = now - periodMs;
  const previousStart = now - periodMs * 2;

  const all = loadPRs();
  const current = all.filter((pr) => {
    const ts = timestampForPR(pr);
    return ts >= currentStart;
  });
  const previous = all.filter((pr) => {
    const ts = timestampForPR(pr);
    return ts >= previousStart && ts < currentStart;
  });

  const daysWithPr = new Set(current.map((pr) => {
    const d = new Date(timestampForPR(pr));
    return localDateStr(d);
  })).size;

  return {
    count: current.length,
    previousCount: previous.length,
    delta: current.length - previous.length,
    frequencyPerWeek: Math.round((current.length / (period / 7)) * 10) / 10,
    activeDays: daysWithPr,
  };
}

function checkExerciseForPRs(exerciseName, sets, reps, weight, date) {
  if (!exerciseName || !weight || weight <= 0) return [];
  const name = exerciseName.toLowerCase().trim();
  const newPRs = [];
  const workouts = loadData(KEYS.workouts);
  const history = [];
  workouts.forEach(w => {
    (w.exercises || []).forEach(ex => {
      if ((ex.name || '').toLowerCase().trim() === name) {
        history.push({
          weight: ex.weight || 0, reps: ex.reps || 0, sets: ex.sets || 0,
          volume: (ex.sets||0)*(ex.reps||0)*(ex.weight||0),
          est1RM: getEstimated1RM(ex.weight||0, ex.reps||0),
        });
      }
    });
  });

  if (history.length === 0) {
    // First time — seed baseline, no celebration
    ['weight','reps','volume','est1RM'].forEach(type => {
      const val = type==='weight'?weight : type==='reps'?(reps||0) : type==='volume'?(sets||0)*(reps||0)*weight : getEstimated1RM(weight,reps||0);
      if (val > 0) { const existing=loadPRs(); existing.push({id:uid(),type,exercise:exerciseName,value:val,date:date||today(),timestamp:Date.now()}); savePRs(existing); }
    });
    return [];
  }

  const bestW = Math.max(...history.map(h=>h.weight));
  if (weight > bestW) newPRs.push({type:'weight',exercise:exerciseName,value:weight,previousBest:bestW,date:date||today(),timestamp:Date.now(),label:'🏋️ Weight PR: '+weight+' (prev: '+bestW+')'});

  const repComparable = history.filter((h) => h.weight > 0 && h.weight >= weight * 0.8);
  const bestR = repComparable.length ? Math.max(...repComparable.map((h) => h.reps || 0)) : 0;
  if (reps > bestR && reps > 0) {
    newPRs.push({
      type:'reps', exercise:exerciseName, value:reps, atWeight:weight,
      previousBest:bestR, date:date||today(), timestamp:Date.now(),
      label:'💪 Rep PR: '+reps+' @ '+weight+' (prev: '+bestR+')',
    });
  }

  const curVol = (sets||0)*(reps||0)*weight;
  const bestV = Math.max(...history.map(h=>h.volume));
  if (curVol > bestV && bestV > 0) newPRs.push({type:'volume',exercise:exerciseName,value:curVol,previousBest:bestV,date:date||today(),timestamp:Date.now(),label:'📊 Volume PR: '+curVol+' (prev: '+bestV+')'});

  const cur1RM = getEstimated1RM(weight, reps||0);
  const best1 = Math.max(...history.map(h=>h.est1RM));
  if (cur1RM > best1 && best1 > 0) newPRs.push({type:'est1RM',exercise:exerciseName,value:cur1RM,previousBest:best1,date:date||today(),timestamp:Date.now(),label:'🔥 Est. 1RM PR: '+cur1RM+' (prev: '+best1+')'});

  if (newPRs.length) {
    const existing = loadPRs();
    const unique = newPRs.filter((pr) => {
      return !existing.some((row) =>
        (row.exercise || '').toLowerCase().trim() === (pr.exercise || '').toLowerCase().trim() &&
        row.type === pr.type &&
        Number(row.value) === Number(pr.value) &&
        String(row.date || '') === String(pr.date || '')
      );
    });
    unique.forEach((pr) => { pr.id = uid(); existing.push(pr); });
    savePRs(existing);
    return unique;
  }
  return newPRs;
}

function checkWorkoutForPRs(exercises, date) {
  const all = [];
  (exercises||[]).forEach(ex => { if (ex.name && ex.weight) all.push(...checkExerciseForPRs(ex.name,ex.sets,ex.reps,ex.weight,date)); });
  return all;
}

function celebratePRs(prList) {
  if (!prList || !prList.length) return;
  const msg = prList.length === 1 ? prList[0].label : '🏆 '+prList.length+' new PRs!';
  showToast(msg);
  if (typeof triggerCelebration === 'function') triggerCelebration('Personal Record! 🏆');
  setTimeout(() => {
    const mc=$('modalContainer'); if(!mc)return;
    mc.innerHTML='<div class="modal-overlay" id="prModalOverlay"><div class="modal"><div class="modal-title">🏆 Personal Records! <button class="modal-close" id="prModalClose" aria-label="Close">×</button></div><div class="pr-list">'+
      prList.map(pr=>'<div class="pr-item"><div class="pr-item-label">'+esc(pr.label)+'</div></div>').join('')+
      '</div><button class="btn btn-primary btn-block mt-12" id="prModalDone">Let\'s go! 💪</button></div></div>';
    if($('prModalClose'))$('prModalClose').addEventListener('click',closeModal);
    if($('prModalDone'))$('prModalDone').addEventListener('click',closeModal);
    if($('prModalOverlay'))$('prModalOverlay').addEventListener('click',(e)=>{if(e.target===$('prModalOverlay'))closeModal();});
  }, prList.length > 1 ? 1500 : 900);
}

function getLastSessionForExercise(exerciseName) {
  if (!exerciseName) return null;
  const name = exerciseName.toLowerCase().trim();
  const workouts = loadData(KEYS.workouts).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
  for (const w of workouts) {
    const ex = (w.exercises||[]).find(e=>(e.name||'').toLowerCase().trim()===name);
    if (ex) return { date:w.date, sets:ex.sets||0, reps:ex.reps||0, weight:ex.weight||0, rpe:ex.rpe||null, est1RM:getEstimated1RM(ex.weight||0,ex.reps||0) };
  }
  return null;
}

function getSuggestedProgression(exerciseName) {
  const last = getLastSessionForExercise(exerciseName);
  if (!last || !last.weight) return null;
  const level = (settings && settings.experienceLevel) || 'intermediate';
  if (level === 'beginner') return { weight:Math.round((last.weight+2.5)*10)/10, reps:last.reps, sets:last.sets, note:'Linear: +2.5 from last' };
  if (level === 'intermediate') {
    if (last.reps >= 12) return { weight:Math.round((last.weight+2.5)*10)/10, reps:Math.max(8,last.reps-4), sets:last.sets, note:'Hit '+last.reps+' reps → add weight' };
    return { weight:last.weight, reps:last.reps+1, sets:last.sets, note:'+1 rep (double progression)' };
  }
  return { weight:last.weight, reps:last.reps, sets:last.sets, note:'Match last — adjust by RPE' };
}
