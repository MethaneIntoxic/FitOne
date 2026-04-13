// ========== SHARE CARD ==========
// Generate branded workout summary cards as downloadable images

function createShareImageFile(canvas, fileName) {
  return new Promise(function (resolve) {
    if (!canvas || typeof canvas.toBlob !== 'function' || typeof File === 'undefined') {
      resolve(null);
      return;
    }

    canvas.toBlob(function (blob) {
      if (!blob) {
        resolve(null);
        return;
      }
      resolve(new File([blob], fileName, { type: 'image/png' }));
    }, 'image/png');
  });
}

function generateShareCard(workout) {
  const canvas = document.createElement('canvas');
  const W = 600, H = 800;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0b0a14');
  bgGrad.addColorStop(1, '#151228');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle topographic pattern
  ctx.save();
  ctx.strokeStyle = 'rgba(186,158,255,0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const y = 120 + i * 58;
    ctx.beginPath();
    ctx.moveTo(-20, y);
    ctx.bezierCurveTo(130, y - 22, 240, y + 24, 360, y - 10);
    ctx.bezierCurveTo(470, y - 36, 560, y + 18, 640, y - 8);
    ctx.stroke();
  }
  ctx.restore();

  // Accent stripe
  const stripeGrad = ctx.createLinearGradient(0, 0, W, 0);
  stripeGrad.addColorStop(0, '#8455ef');
  stripeGrad.addColorStop(1, '#ba9eff');
  ctx.fillStyle = stripeGrad;
  ctx.fillRect(0, 0, W, 8);

  // Header
  ctx.fillStyle = '#ba9eff';
  ctx.font = '700 13px Space Grotesk, Inter, sans-serif';
  ctx.fillText('WORKOUT COMPLETE', 30, 42);

  ctx.fillStyle = '#9a97ad';
  ctx.font = '14px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(fmtDate(workout.date || today()), W - 30, 40);
  ctx.textAlign = 'left';

  // Workout name
  ctx.fillStyle = '#fff';
  ctx.font = 'italic 800 36px Space Grotesk, Inter, sans-serif';
  ctx.fillText((workout.name || 'Workout').toUpperCase(), 30, 96);

  if (workout._prs && workout._prs.length > 0) {
    ctx.fillStyle = 'rgba(94,225,168,0.18)';
    ctx.fillRect(30, 108, 180, 28);
    ctx.fillStyle = '#5ee1a8';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.fillText(workout._prs.length + ' NEW PR' + (workout._prs.length > 1 ? 'S' : ''), 40, 127);
  }

  // Duration + type badge
  let badgeY = 156;
  if (workout.duration) {
    ctx.fillStyle = 'rgba(132,85,239,0.2)';
    const durText = workout.duration + ' min';
    ctx.fillRect(30, badgeY - 16, ctx.measureText(durText).width + 20, 28);
    ctx.fillStyle = '#c9bcff';
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
  ctx.moveTo(30, 186);
  ctx.lineTo(W - 30, 186);
  ctx.stroke();

  // Exercises
  const exercises = workout.exercises || [];
  let y = 216;
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
  const totalSets = Array.isArray(w.exercises)
    ? w.exercises.reduce(function (sum, exercise) {
        if (Array.isArray(exercise.sets)) return sum + exercise.sets.length;
        return sum + Math.max(0, Number(exercise.sets) || 0);
      }, 0)
    : 0;
  const previewChips = [
    (Array.isArray(w.exercises) ? w.exercises.length : 0) + ' exercises',
    totalSets > 0 ? totalSets + ' total sets' : '',
    Array.isArray(w._prs) && w._prs.length ? w._prs.length + ' PR' + (w._prs.length > 1 ? 's' : '') : '',
  ].filter(Boolean);

  const mc = $('modalContainer');
  if (!mc) return;

  mc.innerHTML =
    '<div class="modal-overlay" id="shareOverlay">' +
    '<div class="modal">' +
      '<div class="modal-title">Share Workout <button class="modal-close" id="shareCloseBtn" aria-label="Close">×</button></div>' +
      '<div class="share-preview-meta">' + previewChips.map(function (chip) {
        return '<span class="share-preview-chip">' + esc(chip) + '</span>';
      }).join('') + '</div>' +
      '<div class="share-preview"><img src="' + dataUrl + '" alt="Workout summary" style="width:100%;border-radius:12px"></div>' +
      '<div class="share-action-row mt-12">' +
        '<button class="btn btn-outline" id="shareDownloadBtn">📥 Save</button>' +
        '<button class="btn btn-primary" id="shareNativeBtn">📤 Share</button>' +
        '<button class="btn btn-outline" id="shareCopyBtn">🔗 Copy</button>' +
      '</div>' +
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

  const nativeBtn = $('shareNativeBtn');
  if (nativeBtn) {
    nativeBtn.addEventListener('click', async () => {
      const fileName = 'fitone-workout-' + (workout.date || today()) + '.png';
      const summary = [
        'Workout complete: ' + (workout.name || 'Session'),
        (workout.duration ? 'Duration: ' + workout.duration + ' min' : ''),
        (workout.caloriesBurned ? 'Calories: ' + workout.caloriesBurned : ''),
      ].filter(Boolean).join(' • ');

      try {
        if (navigator.share) {
          const payload = {
            title: 'FitOne Workout',
            text: summary,
          };
          const imageFile = await createShareImageFile(canvas, fileName);
          if (imageFile && (!navigator.canShare || navigator.canShare({ files: [imageFile] }))) {
            payload.files = [imageFile];
          }
          await navigator.share(payload);
          showToast('Shared successfully!');
        } else {
          showToast('Native share not available on this device', 'info');
        }
      } catch (err) {
        showToast('Share canceled', 'info');
      }
    });
  }

  const copyBtn = $('shareCopyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const lines = [];
      lines.push('🏋️ ' + (workout.name || 'Workout'));
      lines.push('Date: ' + fmtDate(workout.date || today()));
      if (workout.duration) lines.push('Duration: ' + workout.duration + ' min');
      if (workout.caloriesBurned) lines.push('Calories: ' + workout.caloriesBurned);
      if (Array.isArray(workout.exercises) && workout.exercises.length) {
        lines.push('Exercises: ' + workout.exercises.length);
      }
      if (Array.isArray(w._prs) && w._prs.length) {
        lines.push('PRs: ' + w._prs.length);
      }
      lines.push('Tracked with FitOne');
      const text = lines.join('\n');

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          showToast('Summary copied!');
        } else {
          showToast('Clipboard not available', 'info');
        }
      } catch (err) {
        showToast('Could not copy summary', 'error');
      }
    });
  }
}
