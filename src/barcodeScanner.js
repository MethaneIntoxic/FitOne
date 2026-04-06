// ========== BARCODE SCANNER ==========
// Camera-based barcode scanning using BarcodeDetector API
// Falls back to manual barcode entry for unsupported browsers

let _barcodeStream = null;
let _barcodeDetector = null;
let _barcodeAnimFrame = null;
let _barcodeScanning = false;

function isBarcodeSupported() {
  return 'BarcodeDetector' in window;
}

function showBarcodeScanner() {
  const modal = $('modalContainer');
  if (!modal) return;

  const hasDetector = isBarcodeSupported();

  modal.innerHTML =
    '<div class="modal-overlay" id="barcodeOverlay">' +
    '<div class="modal barcode-modal">' +
      '<div class="modal-title">Scan Barcode ' +
        '<button class="modal-close" id="barcodeCloseBtn" aria-label="Close">×</button>' +
      '</div>' +
      (hasDetector
        ? '<div class="barcode-camera-wrap">' +
            '<video id="barcodeVideo" autoplay playsinline muted></video>' +
            '<div class="barcode-overlay-guide"></div>' +
          '</div>' +
          '<div class="text-xs text-center mt-8" id="barcodeScanStatus">Point camera at barcode…</div>'
        : '<div class="text-sm mb-12" style="color:var(--text2)">Camera barcode scanning is not supported on this browser. Enter the barcode number manually:</div>'
      ) +
      '<div class="barcode-manual">' +
        '<div class="stat-row">' +
          '<div class="form-group" style="flex:1">' +
            '<input type="text" id="barcodeManualInput" placeholder="Enter barcode number" inputmode="numeric">' +
          '</div>' +
          '<button class="btn btn-primary btn-sm" id="barcodeLookupBtn">Lookup</button>' +
        '</div>' +
      '</div>' +
      '<div id="barcodeResult" class="mt-8"></div>' +
    '</div></div>';

  $('barcodeCloseBtn').addEventListener('click', closeBarcodeScanner);
  $('barcodeOverlay').addEventListener('click', (e) => {
    if (e.target === $('barcodeOverlay')) closeBarcodeScanner();
  });

  $('barcodeLookupBtn').addEventListener('click', () => {
    const code = ($('barcodeManualInput').value || '').trim();
    if (code) handleBarcodeDetected(code);
  });

  $('barcodeManualInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const code = ($('barcodeManualInput').value || '').trim();
      if (code) handleBarcodeDetected(code);
    }
  });

  if (hasDetector) {
    startBarcodeCamera();
  } else {
    setTimeout(() => { if ($('barcodeManualInput')) $('barcodeManualInput').focus(); }, 200);
  }
}

async function startBarcodeCamera() {
  try {
    _barcodeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    const video = $('barcodeVideo');
    if (!video) { stopBarcodeCamera(); return; }
    video.srcObject = _barcodeStream;
    await video.play();

    _barcodeDetector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
    });
    _barcodeScanning = true;
    scanFrame();
  } catch (e) {
    console.warn('Camera access failed:', e);
    const status = $('barcodeScanStatus');
    if (status) status.textContent = 'Camera access denied. Use manual entry below.';
  }
}

async function scanFrame() {
  if (!_barcodeScanning) return;
  const video = $('barcodeVideo');
  if (!video || !_barcodeDetector || video.readyState < 2) {
    _barcodeAnimFrame = requestAnimationFrame(scanFrame);
    return;
  }

  try {
    const barcodes = await _barcodeDetector.detect(video);
    if (barcodes.length > 0) {
      const code = barcodes[0].rawValue;
      if (code) {
        _barcodeScanning = false;
        if (navigator.vibrate) navigator.vibrate(100);
        handleBarcodeDetected(code);
        return;
      }
    }
  } catch (e) { /* detection error, continue scanning */ }

  _barcodeAnimFrame = requestAnimationFrame(scanFrame);
}

async function handleBarcodeDetected(code) {
  const resultDiv = $('barcodeResult');
  const statusDiv = $('barcodeScanStatus');
  if (statusDiv) statusDiv.textContent = 'Looking up ' + code + '…';
  if (resultDiv) resultDiv.innerHTML = '<div class="text-sm" style="text-align:center">🔍 Looking up barcode ' + esc(code) + '…</div>';

  const product = await lookupBarcode(code);

  if (!product) {
    if (resultDiv) resultDiv.innerHTML =
      '<div class="text-sm" style="text-align:center;color:var(--red)">❌ Product not found for barcode ' + esc(code) + '</div>' +
      '<div class="text-xs text-center mt-8">Try searching by name instead, or enter values manually.</div>';
    if (statusDiv) statusDiv.textContent = 'Not found. Try another barcode or enter manually.';
    _barcodeScanning = true;
    scanFrame();
    return;
  }

  if (resultDiv) {
    resultDiv.innerHTML =
      '<div class="barcode-product-card">' +
        '<div class="barcode-product-name">' + esc(product.name) + '</div>' +
        '<div class="barcode-product-macros">' +
          '<span>' + product.calories + ' cal</span>' +
          '<span>P' + product.protein + 'g</span>' +
          '<span>C' + product.carbs + 'g</span>' +
          '<span>F' + product.fat + 'g</span>' +
        '</div>' +
        (product.serving ? '<div class="text-xs" style="color:var(--text2)">Serving: ' + esc(product.serving) + '</div>' : '') +
        '<button class="btn btn-primary btn-block mt-8" id="barcodeUseBtn">Use This Product</button>' +
      '</div>';

    $('barcodeUseBtn').addEventListener('click', () => {
      fillFoodFormFromProduct(product);
      closeBarcodeScanner();
      showToast('Product filled! 📦');
    });
  }
}

function stopBarcodeCamera() {
  _barcodeScanning = false;
  if (_barcodeAnimFrame) cancelAnimationFrame(_barcodeAnimFrame);
  if (_barcodeStream) {
    _barcodeStream.getTracks().forEach(t => t.stop());
    _barcodeStream = null;
  }
  _barcodeDetector = null;
}

function closeBarcodeScanner() {
  stopBarcodeCamera();
  closeModal();
}
