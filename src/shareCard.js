// ========== SHARE CARD ==========
// Generate branded workout summary cards as downloadable images

function generateShareCard(workout) {
  const canvas = document.createElement('canvas');
  const W = 600, H = 800;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0f0f1a');
  bgGrad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Accent stripe
  const stripeGrad = ctx.createLinearGradient(0, 0, W, 0);
  stripeGrad.addColorStop(0, '#6C63FF');
  stripeGrad.addColorStop(1, '#8B7FFF');
  ctx.fillStyle = stripeGrad;
  ctx.fillRect(0, 0, W, 6);

  // Header
  ctx.fillStyle = '#6C63FF';
  ctx.font = 'bold 16px Inter, sans-serif';
  ctx.fillText('FitOne', 30, 40);

  ctx.fillStyle = '#666';
  ctx.font = '14px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(fmtDate(workout.date || today()), W - 30, 40);
  ctx.textAlign = 'left';

  // Workout name
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Inter, sans-serif';
  ctx.fillText(workout.name || 'Workout', 30, 85);

  // Duration + type badge
  let badgeY = 110;
  if (workout.duration) {
    ctx.fillStyle = 'rgba(108,99,255,0.15)';
    const durText = workout.duration + ' min';
    ctx.fillRect(30, badgeY - 16, ctx.measureText(durText).width + 20, 28);
    ctx.fillStyle = '#8B7FFF';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText(durText, 40, badgeY);
  }
  if (workout.type) {
    const typeText = workout.type;
    const typeX = workout.duration ? 30 + ctx.measureText(workout.duration + ' min').width + 40 : 30;
    ctx.fillStyle = 'rgba(74,222,128,0.15)';
    ctx.fillRect(typeX, badgeY - 16, ctx.measureText(typeText).width + 20, 28);
    ctx.fillStyle = '#4ade80';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText(typeText, typeX + 10, badgeY);
  }

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 140);
  ctx.lineTo(W - 30, 140);
  ctx.stroke();

  // Exercises
  const exercises = workout.exercises || [];
  let y = 170;
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText('EXERCISE', 30, y);
  ctx.fillText('SETS', 340, y);
  ctx.fillText('REPS', 410, y);
  ctx.fillText('WEIGHT', 480, y);
  y += 10;

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(W - 30, y); ctx.stroke();
  y += 20;

  exercises.slice(0, 12).forEach(ex => {
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '15px Inter, sans-serif';
    const name = (ex.name || '').length > 28 ? ex.name.substring(0, 26) + '…' : (ex.name || '');
    ctx.fillText(name, 30, y);

    ctx.fillStyle = '#aaa';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText(String(ex.sets || ''), 350, y);
    ctx.fillText(String(ex.reps || ''), 420, y);
    ctx.fillText(ex.weight ? ex.weight + (settings.weightUnit || 'kg') : '—', 480, y);
    y += 32;
  });

  if (exercises.length > 12) {
    ctx.fillStyle = '#666';
    ctx.font = 'italic 13px Inter, sans-serif';
    ctx.fillText('+ ' + (exercises.length - 12) + ' more exercises', 30, y);
    y += 30;
  }

  // PRs section
  if (workout._prs && workout._prs.length > 0) {
    y += 10;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillText('🏆 PERSONAL RECORDS', 30, y);
    y += 24;
    workout._prs.forEach(pr => {
      ctx.fillStyle = '#FFD700';
      ctx.font = '13px Inter, sans-serif';
      ctx.fillText(pr.label || (pr.exercise + ' — ' + pr.type + ' PR'), 30, y);
      y += 22;
    });
  }

  // Stats footer
  const footerY = H - 80;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.moveTo(30, footerY - 10); ctx.lineTo(W - 30, footerY - 10); ctx.stroke();

  const totalSets = exercises.reduce((a, e) => a + (e.sets || 0), 0);
  const totalVolume = exercises.reduce((a, e) => a + (e.sets || 0) * (e.reps || 0) * (e.weight || 0), 0);

  const stats = [
    { label: 'Exercises', value: exercises.length },
    { label: 'Total Sets', value: totalSets },
    { label: 'Volume', value: totalVolume > 0 ? Math.round(totalVolume).toLocaleString() : '—' },
  ];

  const statW = (W - 60) / stats.length;
  stats.forEach((s, i) => {
    const sx = 30 + i * statW;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(s.value), sx + statW / 2, footerY + 20);
    ctx.fillStyle = '#666';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(s.label, sx + statW / 2, footerY + 40);
  });
  ctx.textAlign = 'left';

  // Branded footer
  ctx.fillStyle = 'rgba(108,99,255,0.3)';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Tracked with FitOne — Privacy-First Fitness', W / 2, H - 15);
  ctx.textAlign = 'left';

  return canvas;
}

function showShareCardModal(workout, prs) {
  const w = { ...workout, _prs: prs || [] };
  const canvas = generateShareCard(w);
  const dataUrl = canvas.toDataURL('image/png');

  const mc = $('modalContainer');
  if (!mc) return;

  mc.innerHTML =
    '<div class="modal-overlay" id="shareOverlay">' +
    '<div class="modal">' +
      '<div class="modal-title">Share Workout <button class="modal-close" id="shareCloseBtn" aria-label="Close">×</button></div>' +
      '<div class="share-preview"><img src="' + dataUrl + '" alt="Workout summary" style="width:100%;border-radius:12px"></div>' +
      '<button class="btn btn-primary btn-block mt-12" id="shareDownloadBtn">📥 Save Image</button>' +
    '</div></div>';

  $('shareCloseBtn').addEventListener('click', closeModal);
  $('shareOverlay').addEventListener('click', e => { if (e.target === $('shareOverlay')) closeModal(); });

  $('shareDownloadBtn').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'fitone-workout-' + (workout.date || today()) + '.png';
    a.click();
    showToast('Image saved! 🖼️');
  });
}
