// ========== PROGRESS PHOTOS ==========
// Photo capture/upload with before/after comparison slider

const PHOTO_TAGS = ['front', 'side', 'back', 'most-muscular', 'rear-lat-spread', 'other'];

function formatPhotoTag(tag) {
  return String(tag || 'photo')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function refreshPhotos() {
  const container = $('photosContainer');
  if (!container) return;
  const photos = loadData(KEYS.photos).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (!photos.length) {
    container.innerHTML =
      '<div class="empty"><div class="empty-icon">📸</div>' +
      '<div class="empty-text">No progress photos yet</div>' +
      '<button class="btn btn-primary btn-sm" data-action="addPhoto">Take your first photo</button></div>';
    return;
  }

  // Group by date
  const groups = {};
  photos.forEach(p => {
    if (!groups[p.date]) groups[p.date] = [];
    groups[p.date].push(p);
  });

  let html = '<div class="flex-between mb-12"><span class="card-title" style="margin-bottom:0">📸 Progress Photos</span>' +
    '<button class="btn btn-outline btn-sm" data-action="addPhoto">+ Add</button></div>';

  if (photos.length >= 2) {
    html += '<button class="btn btn-outline btn-block mb-12" data-action="comparePhotos">Compare Before / After</button>';
  }

  html += '<div class="photo-grid">';
  Object.keys(groups).sort().reverse().forEach(date => {
    html += '<div class="photo-date-group"><div class="photo-date-label">' + fmtDate(date) + '</div><div class="photo-row">';
    groups[date].forEach(p => {
      html += '<div class="photo-thumb" data-photo-id="' + p.id + '">' +
        '<img src="' + p.uri + '" alt="' + esc(p.label || p.tag || '') + '" loading="lazy">' +
        '<div class="photo-thumb-tag">' + esc(formatPhotoTag(p.tag)) + '</div>' +
        '</div>';
    });
    html += '</div></div>';
  });
  html += '</div>';

  container.innerHTML = html;
}

function showAddPhotoModal() {
  const mc = $('modalContainer');
  if (!mc) return;

  mc.innerHTML =
    '<div class="modal-overlay" id="photoModalOverlay">' +
    '<div class="modal">' +
      '<div class="modal-title">Add Progress Photo <button class="modal-close" id="photoModalClose" aria-label="Close">×</button></div>' +
      '<div class="form-group"><label>Date</label><input type="date" id="photoDate" value="' + today() + '"></div>' +
      '<div class="form-group"><label>Pose / Tag</label><select id="photoTag">' +
        PHOTO_TAGS.map(t => '<option value="' + t + '">' + formatPhotoTag(t) + '</option>').join('') +
      '</select></div>' +
      '<div class="form-group"><label>Notes (optional)</label><input type="text" id="photoNotes" placeholder="e.g., 12 weeks out"></div>' +
      '<div class="photo-upload-area" id="photoUploadArea">' +
        '<div class="photo-upload-icon">📷</div>' +
        '<div class="photo-upload-text">Tap to take or upload photo</div>' +
        '<input type="file" id="photoFileInput" accept="image/*" capture="environment" style="display:none">' +
      '</div>' +
      '<div id="photoPreviewArea" class="hidden"><img id="photoPreviewImg" src="" alt="Preview"><button class="btn btn-outline btn-sm mt-8" id="photoRetake">Retake</button></div>' +
      '<button class="btn btn-primary btn-block mt-12" id="photoSaveBtn" disabled>Save Photo</button>' +
    '</div></div>';

  $('photoModalClose').addEventListener('click', closeModal);
  $('photoModalOverlay').addEventListener('click', e => { if (e.target === $('photoModalOverlay')) closeModal(); });

  $('photoUploadArea').addEventListener('click', () => $('photoFileInput').click());

  $('photoFileInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      // Compress image
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        $('photoPreviewImg').src = dataUrl;
        $('photoPreviewArea').classList.remove('hidden');
        $('photoUploadArea').classList.add('hidden');
        $('photoSaveBtn').disabled = false;
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  $('photoRetake').addEventListener('click', () => {
    $('photoPreviewArea').classList.add('hidden');
    $('photoUploadArea').classList.remove('hidden');
    $('photoSaveBtn').disabled = true;
    $('photoFileInput').value = '';
  });

  $('photoSaveBtn').addEventListener('click', () => {
    const uri = $('photoPreviewImg').src;
    if (!uri) return;
    const photo = {
      id: uid(),
      date: $('photoDate').value || today(),
      tag: $('photoTag').value || 'front',
      label: $('photoTag').value || 'front',
      notes: ($('photoNotes').value || '').trim(),
      uri: uri,
      timestamp: Date.now(),
    };
    const data = loadData(KEYS.photos);
    data.push(photo);
    saveData(KEYS.photos, data);
    closeModal();
    refreshPhotos();
    showToast('Photo saved! 📸');
    if (typeof window.notifyDataChanged === 'function') window.notifyDataChanged({ source: 'photos', reason: 'addPhoto' });
  });
}

function showComparePhotos() {
  const photos = loadData(KEYS.photos).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  if (photos.length < 2) { showToast('Need at least 2 photos to compare', 'error'); return; }
  const mc = $('modalContainer');
  if (!mc) return;

  const oldest = photos[0];
  const newest = photos[photos.length - 1];

  mc.innerHTML =
    '<div class="modal-overlay" id="compareOverlay">' +
    '<div class="modal compare-modal">' +
      '<div class="modal-title">Before / After <button class="modal-close" id="compareClose" aria-label="Close">×</button></div>' +
      '<div class="compare-dates"><span>' + fmtDate(oldest.date) + '</span><span>' + fmtDate(newest.date) + '</span></div>' +
      '<div class="compare-container" id="compareContainer">' +
        '<div class="compare-img compare-before"><img src="' + oldest.uri + '" alt="Before" draggable="false"></div>' +
        '<div class="compare-img compare-after" id="compareAfter" style="width:50%"><img src="' + newest.uri + '" alt="After" draggable="false"></div>' +
        '<div class="compare-slider" id="compareSlider"><div class="compare-handle"></div></div>' +
      '</div>' +
      '<div class="compare-select mt-12">' +
        '<div class="form-group" style="flex:1"><label>Before</label><select id="compareBefore">' +
          photos.map((p, i) => '<option value="' + i + '"' + (i === 0 ? ' selected' : '') + '>' + fmtDate(p.date) + ' — ' + formatPhotoTag(p.tag) + '</option>').join('') +
        '</select></div>' +
        '<div class="form-group" style="flex:1"><label>After</label><select id="compareAfterSel">' +
          photos.map((p, i) => '<option value="' + i + '"' + (i === photos.length - 1 ? ' selected' : '') + '>' + fmtDate(p.date) + ' — ' + formatPhotoTag(p.tag) + '</option>').join('') +
        '</select></div>' +
      '</div>' +
    '</div></div>';

  $('compareClose').addEventListener('click', closeModal);
  $('compareOverlay').addEventListener('click', e => { if (e.target === $('compareOverlay')) closeModal(); });

  // Slider interaction
  const container = $('compareContainer');
  const slider = $('compareSlider');
  const afterDiv = $('compareAfter');
  let dragging = false;

  function setSliderPosition(x) {
    const rect = container.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100));
    afterDiv.style.width = pct + '%';
    slider.style.left = pct + '%';
  }

  slider.addEventListener('mousedown', () => { dragging = true; });
  slider.addEventListener('touchstart', () => { dragging = true; }, { passive: true });
  document.addEventListener('mousemove', e => { if (dragging) setSliderPosition(e.clientX); });
  document.addEventListener('touchmove', e => { if (dragging) setSliderPosition(e.touches[0].clientX); }, { passive: true });
  document.addEventListener('mouseup', () => { dragging = false; });
  document.addEventListener('touchend', () => { dragging = false; });
  container.addEventListener('click', e => setSliderPosition(e.clientX));

  // Swap photos on select change
  const updatePhotos = () => {
    const bIdx = parseInt($('compareBefore').value);
    const aIdx = parseInt($('compareAfterSel').value);
    container.querySelector('.compare-before img').src = photos[bIdx].uri;
    afterDiv.querySelector('img').src = photos[aIdx].uri;
  };
  $('compareBefore').addEventListener('change', updatePhotos);
  $('compareAfterSel').addEventListener('change', updatePhotos);
}

function initPhotoEvents() {
  const bodyPanel = $('panel-log');
  if (!bodyPanel) return;
  bodyPanel.addEventListener('click', e => {
    const action = e.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'addPhoto') showAddPhotoModal();
    else if (action.dataset.action === 'comparePhotos') showComparePhotos();
  });

  // Delete photo on thumb click (long press or context menu)
  bodyPanel.addEventListener('contextmenu', e => {
    const thumb = e.target.closest('.photo-thumb');
    if (!thumb) return;
    e.preventDefault();
    const id = thumb.dataset.photoId;
    showConfirmModal('Delete Photo', '📸', 'Remove this progress photo?', () => {
      const data = loadData(KEYS.photos).filter(p => p.id !== id);
      saveData(KEYS.photos, data);
      refreshPhotos();
      showToast('Photo deleted');
    });
  });
}
