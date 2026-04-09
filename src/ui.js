// ========== UI HELPERS ==========
// Generic DOM helpers, shared UI utilities (toast, confirm, ring drawing, charts, etc.)

// ========== BRAND COLOR READER ==========
// Reads CSS custom properties so canvas code stays in sync with brand-assets.css
function brandColor(token) {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

// ========== TOAST ==========
function showToast(msg, type) {
  type = type || "success";
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const colors = {
    success: "var(--green)",
    error: "var(--red)",
    warning: "var(--orange)",
    info: "var(--accent)",
  };
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML =
    '<div class="toast-accent" style="background:' +
    (colors[type] || colors.success) +
    '"></div><span>' +
    msg +
    "</span>";
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-show"));
  setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ========== UNDO TOAST ==========
function showUndoToast(message, undoCallback) {
  const existing = document.querySelector(".toast-undo");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast-undo";
  toast.innerHTML =
    "<span>" +
    message +
    "</span><button onclick=\"this.parentElement._undoFn();this.parentElement.remove()\">Undo</button>";
  toast._undoFn = undoCallback;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  const timer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 5000);
  toast._timer = timer;
}

// ========== CONFIRM MODAL ==========
function showConfirmModal(title, icon, message, onConfirm) {
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";
  overlay.innerHTML =
    '<div class="confirm-modal">' +
    '<div class="confirm-icon">' + icon + "</div>" +
    '<div class="confirm-title">' + title + "</div>" +
    '<div class="confirm-message">' + message + "</div>" +
    '<div class="confirm-actions">' +
    '<button class="btn btn-outline" id="confirmCancel">Cancel</button>' +
    '<button class="btn btn-primary" id="confirmOk" style="background:var(--danger)">Confirm</button>' +
    "</div></div>";
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));
  overlay.querySelector("#confirmCancel").onclick = function () {
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 200);
  };
  overlay.querySelector("#confirmOk").onclick = function () {
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 200);
    onConfirm();
  };
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 200);
    }
  });
  setTimeout(() => overlay.querySelector("#confirmCancel").focus(), 100);
}

// ========== FORM VALIDATION ==========
function showFormError(inputId, errorId) {
  const input = $(inputId);
  const err = $(errorId);
  if (input) input.classList.add("input-error");
  if (err) err.classList.add("show");
  if (input) input.focus();
}

function clearFormErrors() {
  document
    .querySelectorAll(".input-error")
    .forEach((el) => el.classList.remove("input-error"));
  document
    .querySelectorAll(".form-error.show")
    .forEach((el) => el.classList.remove("show"));
}

// ========== ANIMATED RING ==========
function drawRing(canvas, pct, color) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const size = rect.width || 64;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const startTime = performance.now();
  const duration = 800;
  const targetPct = Math.min(pct, 1.5);

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentPct = targetPct * eased;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = size / 2,
      cy = size / 2,
      r = size / 2 - size * 0.14,
      lw = size * 0.1;
    ctx.clearRect(0, 0, size, size);
    const cs = getComputedStyle(document.documentElement);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = cs.getPropertyValue("--bg3").trim() || "#27272A";
    ctx.lineWidth = lw;
    ctx.stroke();

    const drawPct = Math.min(currentPct, 1);
    if (drawPct > 0) {
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        r,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * drawPct
      );
      ctx.strokeStyle = pct > 1.1 ? brandColor("--brand-danger") : color;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    ctx.fillStyle = cs.getPropertyValue("--text").trim() || "#FAFAFA";
    ctx.font =
      "bold " + Math.round(size * 0.28) + "px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.round(currentPct * 100) + "%", cx, cy);

    if (progress < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

// ========== ANIMATED COUNTER ==========
function animateCounter(el, target) {
  if (!el || target === 0) {
    if (el) el.textContent = target;
    return;
  }
  const duration = 500;
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ========== CHART UTILITIES ==========
function roundRect(ctx, x, y, w, h, r) {
  if (h < 1) return;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function ensureChartTooltip() {
  let tooltip = document.getElementById("chartCanvasTooltip");
  if (tooltip) return tooltip;
  tooltip = document.createElement("div");
  tooltip.id = "chartCanvasTooltip";
  tooltip.style.position = "fixed";
  tooltip.style.zIndex = "500";
  tooltip.style.pointerEvents = "none";
  tooltip.style.padding = "6px 8px";
  tooltip.style.borderRadius = "10px";
  tooltip.style.fontSize = "11px";
  tooltip.style.fontWeight = "600";
  tooltip.style.lineHeight = "1.35";
  tooltip.style.whiteSpace = "nowrap";
  tooltip.style.color = "#f8fafc";
  tooltip.style.border = "1px solid rgba(255,255,255,0.14)";
  tooltip.style.background = "rgba(13,18,30,0.95)";
  tooltip.style.boxShadow = "0 10px 28px rgba(0,0,0,0.35)";
  tooltip.style.display = "none";
  document.body.appendChild(tooltip);
  return tooltip;
}

function hideChartTooltip() {
  const tooltip = document.getElementById("chartCanvasTooltip");
  if (!tooltip) return;
  tooltip.style.display = "none";
}

function showChartTooltip(clientX, clientY, html) {
  const tooltip = ensureChartTooltip();
  tooltip.innerHTML = html;
  tooltip.style.display = "block";
  const pad = 10;
  const rect = tooltip.getBoundingClientRect();
  let x = clientX + 12;
  let y = clientY - rect.height - 12;
  if (x + rect.width + pad > window.innerWidth) x = window.innerWidth - rect.width - pad;
  if (x < pad) x = pad;
  if (y < pad) y = clientY + 14;
  tooltip.style.left = x + "px";
  tooltip.style.top = y + "px";
}

function bindCanvasTooltipInteractions(canvas, points, options) {
  if (!canvas) return;
  if (typeof canvas._chartTooltipCleanup === "function") canvas._chartTooltipCleanup();
  const data = (Array.isArray(points) ? points : []).filter(function (p) {
    return p && Number.isFinite(p.x) && Number.isFinite(p.y);
  });
  if (!data.length) {
    canvas._chartTooltipCleanup = null;
    return;
  }

  const opts = options || {};
  const hitMode = opts.hitMode || "nearest";
  const threshold = Number(opts.threshold) || 22;
  const valueFormatter = typeof opts.valueFormatter === "function"
    ? opts.valueFormatter
    : function (v) {
        const n = Number(v);
        if (!Number.isFinite(n)) return String(v);
        return Math.abs(n % 1) > 0 ? n.toFixed(1) : String(n);
      };

  let longPressTimer = null;
  let pointerDown = false;

  function normalizePointer(evt) {
    const rect = canvas.getBoundingClientRect();
    const touch = evt.touches && evt.touches.length ? evt.touches[0] : null;
    const source = touch || evt;
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top,
      clientX: source.clientX,
      clientY: source.clientY,
    };
  }

  function findNearestIndex(localX, localY) {
    let idx = -1;
    let best = Infinity;
    for (let i = 0; i < data.length; i++) {
      const pt = data[i];
      const dist = hitMode === "x"
        ? Math.abs(pt.x - localX)
        : Math.hypot(pt.x - localX, pt.y - localY);
      if (dist < best) {
        best = dist;
        idx = i;
      }
    }
    return best <= threshold ? idx : -1;
  }

  function buildTooltipHtml(index, compare) {
    const pt = data[index];
    if (!pt) return "";
    let html = '<div style="letter-spacing:0.04em;text-transform:uppercase;color:#94a3b8">' + esc(String(pt.label || "Point")) + "</div>";
    html += '<div style="font-size:12px;color:#f8fafc">' + esc(valueFormatter(pt.value, pt, index)) + "</div>";
    if (compare && index > 0) {
      const prev = data[index - 1];
      const delta = (Number(pt.value) || 0) - (Number(prev.value) || 0);
      const deltaFmt = (delta > 0 ? "+" : "") + (Math.abs(delta % 1) > 0 ? delta.toFixed(1) : String(delta));
      const deltaColor = delta >= 0 ? "#86efac" : "#fca5a5";
      html += '<div style="margin-top:2px;color:' + deltaColor + '">vs prev ' + deltaFmt + "</div>";
    }
    return html;
  }

  function renderTooltip(evt, compare) {
    const p = normalizePointer(evt);
    const idx = findNearestIndex(p.x, p.y);
    if (idx < 0) {
      hideChartTooltip();
      return;
    }
    showChartTooltip(p.clientX, p.clientY, buildTooltipHtml(idx, compare));
  }

  function clearLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  const onMouseMove = function (evt) { renderTooltip(evt, false); };
  const onMouseLeave = function () { clearLongPress(); hideChartTooltip(); };
  const onClick = function (evt) { renderTooltip(evt, false); };
  const onPressStart = function (evt) {
    pointerDown = true;
    clearLongPress();
    longPressTimer = setTimeout(function () {
      if (!pointerDown) return;
      renderTooltip(evt, true);
    }, 480);
    renderTooltip(evt, false);
  };
  const onPressEnd = function () {
    pointerDown = false;
    clearLongPress();
  };
  const onTouchMove = function (evt) {
    renderTooltip(evt, false);
    if (evt.cancelable) evt.preventDefault();
  };

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", onMouseLeave);
  canvas.addEventListener("click", onClick);
  canvas.addEventListener("mousedown", onPressStart);
  canvas.addEventListener("mouseup", onPressEnd);
  canvas.addEventListener("touchstart", onPressStart, { passive: true });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onPressEnd);
  canvas.addEventListener("touchcancel", onPressEnd);

  canvas._chartTooltipCleanup = function () {
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mouseleave", onMouseLeave);
    canvas.removeEventListener("click", onClick);
    canvas.removeEventListener("mousedown", onPressStart);
    canvas.removeEventListener("mouseup", onPressEnd);
    canvas.removeEventListener("touchstart", onPressStart);
    canvas.removeEventListener("touchmove", onTouchMove);
    canvas.removeEventListener("touchend", onPressEnd);
    canvas.removeEventListener("touchcancel", onPressEnd);
    hideChartTooltip();
    clearLongPress();
  };
}

function drawBarChart(canvas, labels, values, color, goalLine) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width,
    H = rect.height;
  const pad = { t: 20, r: 10, b: 30, l: 40 };
  const cW = W - pad.l - pad.r,
    cH = H - pad.t - pad.b;

  ctx.clearRect(0, 0, W, H);
  const cs = getComputedStyle(document.documentElement);
  const textColor = cs.getPropertyValue("--text2").trim() || "#A1A1AA";
  const borderColor = cs.getPropertyValue("--border").trim() || "#27272A";

  const maxVal = Math.max(...values, goalLine || 0, 1);
  const barW = (cW / labels.length) * 0.6;
  const gap = (cW / labels.length) * 0.4;
  const chartPoints = [];

  ctx.fillStyle = textColor;
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + cH - (cH * i) / 4;
    const v = Math.round((maxVal * i) / 4);
    ctx.fillText(v, pad.l - 5, y + 3);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
  }

  labels.forEach((l, i) => {
    const x = pad.l + (cW / labels.length) * i + gap / 2;
    const h = (values[i] / maxVal) * cH;
    const y = pad.t + cH - h;

    let barColor = color;
    let statusGlyph = "";
    if (goalLine && values[i] > 0) {
      const ratio = values[i] / goalLine;
      if (ratio > 1.1) {
        barColor = brandColor("--brand-danger");
        statusGlyph = "▲";
      }
      else if (ratio > 0.9) {
        barColor = brandColor("--brand-success");
        statusGlyph = "✓";
      }
      else if (ratio > 0.7) {
        barColor = brandColor("--brand-warning");
        statusGlyph = "•";
      }
    }
    ctx.fillStyle = barColor;
    ctx.beginPath();
    roundRect(ctx, x, y, barW, h, 3);
    ctx.fill();

    if (values[i] > 0) {
      ctx.fillStyle = textColor;
      ctx.font = "8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(values[i], x + barW / 2, y - 4);
      if (statusGlyph) {
        ctx.font = "9px sans-serif";
        ctx.fillText(statusGlyph, x + barW / 2, y - 13);
      }
    }

    ctx.fillStyle = textColor;
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(l, x + barW / 2, H - pad.b + 14);

    chartPoints.push({
      x: x + barW / 2,
      y: y + Math.max(8, h * 0.5),
      label: l,
      value: Number(values[i]) || 0,
      statusGlyph,
    });
  });

  if (goalLine) {
    const gy = pad.t + cH - (goalLine / maxVal) * cH;
    const goalColor = brandColor("--brand-danger");
    ctx.strokeStyle = goalColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(pad.l, gy);
    ctx.lineTo(W - pad.r, gy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = goalColor;
    ctx.font = "9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Goal", W - pad.r - 24, gy - 4);

    ctx.fillStyle = textColor;
    ctx.textAlign = "right";
    ctx.fillText("▲ above  ✓ on target  • near", W - pad.r, pad.t - 6);
  }

  bindCanvasTooltipInteractions(canvas, chartPoints, {
    hitMode: "x",
    threshold: Math.max(28, (cW / Math.max(2, labels.length)) * 0.65),
    valueFormatter: function (v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return String(v);
      return Math.abs(n % 1) > 0 ? n.toFixed(1) : String(n);
    },
  });
}

function drawLineChart(canvas, labels, values, color) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width,
    H = rect.height;
  const pad = { t: 20, r: 10, b: 30, l: 45 };
  const cW = W - pad.l - pad.r,
    cH = H - pad.t - pad.b;

  ctx.clearRect(0, 0, W, H);
  const cs = getComputedStyle(document.documentElement);
  const textColor = cs.getPropertyValue("--text2").trim() || "#A1A1AA";
  const borderColor = cs.getPropertyValue("--border").trim() || "#27272A";

  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const padding = range * 0.1;
  const yMin = minV - padding;
  const yMax = maxV + padding;
  const yRange = yMax - yMin;
  const linePoints = values.map((v, i) => {
    const numeric = Number(v);
    return {
      x: pad.l + (cW / (values.length - 1 || 1)) * i,
      y: pad.t + cH - (((Number.isFinite(numeric) ? numeric : 0) - yMin) / yRange) * cH,
      label: labels[i],
      value: v,
    };
  });

  ctx.fillStyle = textColor;
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + cH - (cH * i) / 4;
    const v = (yMin + (yRange * i) / 4).toFixed(1);
    ctx.fillText(v, pad.l - 5, y + 3);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
  }

  // Gradient fill under line
  const gradient = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
  gradient.addColorStop(0, color + "33");
  gradient.addColorStop(1, color + "05");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  linePoints.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.lineTo(pad.l + cW, pad.t + cH);
  ctx.lineTo(pad.l, pad.t + cH);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  linePoints.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.stroke();

  linePoints.forEach((pt) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = "8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      typeof pt.value === "number" ? (pt.value % 1 ? pt.value.toFixed(1) : pt.value) : pt.value,
      pt.x,
      pt.y - 8
    );
  });

  ctx.fillStyle = textColor;
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  const step = Math.max(1, Math.floor(labels.length / 7));
  labels.forEach((l, i) => {
    if (i % step === 0 || i === labels.length - 1) {
      const x = pad.l + (cW / (labels.length - 1 || 1)) * i;
      ctx.fillText(l, x, H - pad.b + 14);
    }
  });

  bindCanvasTooltipInteractions(canvas, linePoints, {
    hitMode: "nearest",
    threshold: 42,
    valueFormatter: function (v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return String(v);
      return Math.abs(n % 1) > 0 ? n.toFixed(1) : String(n);
    },
  });
}

function drawMultiLineChart(canvas, labels, datasets) {
  if (!canvas || !Array.isArray(datasets) || !datasets.length) return;
  const visibleSets = datasets.filter(function (ds) {
    return ds && ds.visible !== false && Array.isArray(ds.values) && ds.values.length;
  });
  if (!visibleSets.length) {
    const ctxEmpty = canvas.getContext("2d");
    const dprEmpty = window.devicePixelRatio || 1;
    const rectEmpty = canvas.parentElement.getBoundingClientRect();
    canvas.width = rectEmpty.width * dprEmpty;
    canvas.height = rectEmpty.height * dprEmpty;
    ctxEmpty.scale(dprEmpty, dprEmpty);
    ctxEmpty.clearRect(0, 0, rectEmpty.width, rectEmpty.height);
    ctxEmpty.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text2").trim() || "#A1A1AA";
    ctxEmpty.font = "12px sans-serif";
    ctxEmpty.textAlign = "center";
    ctxEmpty.fillText("Enable at least one metric", rectEmpty.width / 2, rectEmpty.height / 2);
    return;
  }

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const pad = { t: 20, r: 12, b: 28, l: 44 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;

  ctx.clearRect(0, 0, W, H);
  const cs = getComputedStyle(document.documentElement);
  const textColor = cs.getPropertyValue("--text2").trim() || "#A1A1AA";
  const borderColor = cs.getPropertyValue("--border").trim() || "#27272A";

  let allValues = [];
  visibleSets.forEach(function (ds) { allValues = allValues.concat(ds.values.map(Number)); });
  allValues = allValues.filter(function (v) { return Number.isFinite(v); });
  const minV = allValues.length ? Math.min.apply(null, allValues) : 0;
  const maxV = allValues.length ? Math.max.apply(null, allValues) : 1;
  const range = (maxV - minV) || 1;
  const yMin = Math.max(0, minV - range * 0.12);
  const yMax = maxV + range * 0.12;
  const yRange = yMax - yMin || 1;

  ctx.fillStyle = textColor;
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + cH - (cH * i) / 4;
    const v = yMin + (yRange * i) / 4;
    ctx.fillText(Math.round(v), pad.l - 6, y + 3);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
  }

  visibleSets.forEach(function (ds) {
    const points = ds.values.map(function (v, i) {
      return {
        x: pad.l + (cW / (Math.max(1, ds.values.length - 1))) * i,
        y: pad.t + cH - ((Number(v) - yMin) / yRange) * cH,
      };
    });

    ctx.strokeStyle = ds.color || "#8B5CF6";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    points.forEach(function (p, i) {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    points.forEach(function (p) {
      ctx.fillStyle = ds.color || "#8B5CF6";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  ctx.fillStyle = textColor;
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  const step = Math.max(1, Math.floor(labels.length / 6));
  labels.forEach(function (l, i) {
    if (i % step === 0 || i === labels.length - 1) {
      const x = pad.l + (cW / (Math.max(1, labels.length - 1))) * i;
      ctx.fillText(l, x, H - pad.b + 14);
    }
  });
}

function drawRadarChart(canvas, labels, datasets, options) {
  if (!canvas || !Array.isArray(labels) || !labels.length) return;
  const sets = (Array.isArray(datasets) ? datasets : []).filter(function (ds) {
    return ds && Array.isArray(ds.values) && ds.values.length === labels.length;
  });

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const cs = getComputedStyle(document.documentElement);
  const textColor = cs.getPropertyValue("--text2").trim() || "#A1A1AA";
  const borderColor = cs.getPropertyValue("--border").trim() || "#27272A";
  ctx.clearRect(0, 0, W, H);

  if (!sets.length) {
    ctx.fillStyle = textColor;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Add body logs to render radar chart", W / 2, H / 2);
    return;
  }

  const levels = Math.max(3, Math.min(8, Number(options && options.levels) || 5));
  const cx = W / 2;
  const cy = H / 2 + 6;
  const radius = Math.max(20, Math.min(W, H) / 2 - 34);
  const angleStep = (Math.PI * 2) / labels.length;
  const optMax = options && Array.isArray(options.maxValues) ? options.maxValues : [];
  const maxValues = labels.map(function (_, i) {
    const explicit = Number(optMax[i]);
    let maxVal = Number.isFinite(explicit) && explicit > 0 ? explicit : 0;
    sets.forEach(function (ds) {
      const v = Number(ds.values[i]) || 0;
      if (v > maxVal) maxVal = v;
    });
    return maxVal > 0 ? maxVal : 1;
  });

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 0.7;
  for (let lvl = 1; lvl <= levels; lvl++) {
    const ratio = lvl / levels;
    ctx.beginPath();
    labels.forEach(function (_, i) {
      const a = -Math.PI / 2 + i * angleStep;
      const x = cx + Math.cos(a) * radius * ratio;
      const y = cy + Math.sin(a) * radius * ratio;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }

  labels.forEach(function (_, i) {
    const a = -Math.PI / 2 + i * angleStep;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  });

  sets.forEach(function (ds, idx) {
    const color = ds.color || (idx === 0 ? "rgba(255,255,255,0.75)" : "#8B5CF6");
    const fillColor = ds.fillColor || (idx === 0 ? "rgba(255,255,255,0.08)" : "rgba(139,92,246,0.22)");
    ctx.beginPath();
    labels.forEach(function (_, i) {
      const a = -Math.PI / 2 + i * angleStep;
      const raw = Number(ds.values[i]) || 0;
      const ratio = Math.max(0, Math.min(1, raw / maxValues[i]));
      const x = cx + Math.cos(a) * radius * ratio;
      const y = cy + Math.sin(a) * radius * ratio;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    labels.forEach(function (_, i) {
      const a = -Math.PI / 2 + i * angleStep;
      const raw = Number(ds.values[i]) || 0;
      const ratio = Math.max(0, Math.min(1, raw / maxValues[i]));
      const x = cx + Math.cos(a) * radius * ratio;
      const y = cy + Math.sin(a) * radius * ratio;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  });

  ctx.fillStyle = textColor;
  ctx.font = "10px sans-serif";
  labels.forEach(function (label, i) {
    const a = -Math.PI / 2 + i * angleStep;
    const lx = cx + Math.cos(a) * (radius + 12);
    const ly = cy + Math.sin(a) * (radius + 12);
    const xDir = Math.cos(a);
    if (xDir > 0.3) ctx.textAlign = "left";
    else if (xDir < -0.3) ctx.textAlign = "right";
    else ctx.textAlign = "center";
    ctx.fillText(label, lx, ly);
  });

  if (!options || options.showLegend !== false) {
    let ly = 14;
    ctx.textAlign = "left";
    ctx.font = "10px sans-serif";
    sets.forEach(function (ds, idx) {
      ctx.fillStyle = ds.color || (idx === 0 ? "rgba(255,255,255,0.75)" : "#8B5CF6");
      ctx.fillRect(12, ly - 6, 10, 3);
      ctx.fillStyle = textColor;
      ctx.fillText(ds.label || ("Set " + (idx + 1)), 26, ly);
      ly += 13;
    });
  }
}

function drawStackedBar(canvas, labels, macros) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width,
    H = rect.height;
  const pad = { t: 20, r: 10, b: 30, l: 40 };
  const cW = W - pad.l - pad.r,
    cH = H - pad.t - pad.b;

  ctx.clearRect(0, 0, W, H);
  const cs = getComputedStyle(document.documentElement);
  const textColor = cs.getPropertyValue("--text2").trim();
  const borderColor = cs.getPropertyValue("--border").trim() || "#27272A";

  const totals = labels.map(
    (_, i) => macros.protein[i] + macros.carbs[i] + macros.fat[i]
  );
  const maxVal = Math.max(...totals, 1);

  ctx.fillStyle = textColor;
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + cH - (cH * i) / 4;
    const v = Math.round((maxVal * i) / 4);
    ctx.fillText(v + "g", pad.l - 5, y + 3);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
  }

  const barW = (cW / labels.length) * 0.6;
  const gap = (cW / labels.length) * 0.4;
  const colors = {
    protein: brandColor("--brand-protein"),
    carbs: brandColor("--brand-carbs"),
    fat: brandColor("--brand-fat"),
  };

  labels.forEach((l, i) => {
    const x = pad.l + (cW / labels.length) * i + gap / 2;
    let yOffset = 0;
    ["fat", "carbs", "protein"].forEach((macro) => {
      const h = (macros[macro][i] / maxVal) * cH;
      const y = pad.t + cH - yOffset - h;
      ctx.fillStyle = colors[macro];
      ctx.beginPath();
      roundRect(ctx, x, y, barW, h, 2);
      ctx.fill();
      yOffset += h;
    });
    ctx.fillStyle = textColor;
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(l, x + barW / 2, H - pad.b + 14);
  });

  const legend = [
    ["Protein (P)", colors.protein],
    ["Carbs (C)", colors.carbs],
    ["Fat (F)", colors.fat],
  ];
  let lx = pad.l;
  legend.forEach(([name, c]) => {
    ctx.fillStyle = c;
    ctx.fillRect(lx, 4, 10, 10);
    ctx.fillStyle = textColor;
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(name, lx + 14, 13);
    lx += ctx.measureText(name).width + 24;
  });
}

// ========== READINESS GAUGE ==========
function getReadinessColor(score) {
  if (score < 40) return brandColor("--brand-danger");
  if (score < 60) return brandColor("--brand-warning");
  if (score < 75) return brandColor("--brand-warning");
  return brandColor("--brand-success");
}

function getReadinessLabel(score) {
  if (score < 40) return "Rest Day Recommended";
  if (score < 60) return "Light Activity";
  if (score < 75) return "Moderate Training OK";
  return "Ready to Push!";
}

function drawReadinessGauge(score) {
  const canvas = $("readinessGauge");
  if (!canvas) return;
  const color = getReadinessColor(score);
  const pct = score / 100;
  const startTime = performance.now();
  const duration = 1000;

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentPct = pct * eased;
    const currentScore = Math.round(score * eased);

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 160 * dpr;
    canvas.height = 160 * dpr;
    ctx.scale(dpr, dpr);
    const cx = 80,
      cy = 80,
      r = 62,
      lw = 10;
    ctx.clearRect(0, 0, 160, 160);
    const cs = getComputedStyle(document.documentElement);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0.75 * Math.PI, 2.25 * Math.PI);
    ctx.strokeStyle = cs.getPropertyValue("--bg3").trim() || "#27272A";
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.stroke();

    if (currentPct > 0) {
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        r,
        0.75 * Math.PI,
        (0.75 + 1.5 * currentPct) * Math.PI
      );
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.font = "bold 32px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(currentScore, cx, cy - 4);

    ctx.fillStyle = cs.getPropertyValue("--text2").trim() || "#A1A1AA";
    ctx.font = "10px -apple-system, sans-serif";
    ctx.fillText("READINESS", cx, cy + 18);

    if (progress < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

function drawEnergyGauge(score) {
  const canvas = $("readinessGauge");
  if (!canvas) return;
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const targetPct = safeScore / 100;
  const startTime = performance.now();
  const duration = 950;

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const pct = targetPct * eased;
    const shown = Math.round(safeScore * eased);

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 160 * dpr;
    canvas.height = 160 * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, 160, 160);

    const cx = 80;
    const cy = 80;
    const baseR = 58;
    const ringGap = 12;
    const cs = getComputedStyle(document.documentElement);
    const track = cs.getPropertyValue("--bg3").trim() || "#23283B";

    const rings = [
      { ratio: 1, color: "#b698ff", width: 8 },
      { ratio: Math.min(0.88, pct), color: "#3fddb8", width: 8 },
      { ratio: Math.min(0.72, pct), color: "#a5ee4c", width: 8 },
    ];

    for (let i = 0; i < 3; i++) {
      const r = baseR - i * ringGap;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0.74 * Math.PI, 2.26 * Math.PI);
      ctx.strokeStyle = track;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    rings.forEach((ring, i) => {
      const r = baseR - i * ringGap;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0.74 * Math.PI, (0.74 + 1.52 * ring.ratio) * Math.PI);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.width;
      ctx.lineCap = "round";
      ctx.shadowBlur = 8;
      ctx.shadowColor = ring.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    ctx.fillStyle = "#f4f6fb";
    ctx.font = "700 16px Space Grotesk, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(shown + "%", cx, cy - 4);

    ctx.fillStyle = cs.getPropertyValue("--text2").trim() || "#A1A1AA";
    ctx.font = "600 8px Space Grotesk, sans-serif";
    ctx.letterSpacing = "0.12em";
    ctx.fillText("DAILY ENERGY", cx, cy + 15);

    if (progress < 1) requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function bindModalClose(overlayId, closeButtonId, onClose) {
  const overlay = $(overlayId);
  if (!overlay) return false;

  const closeFn = typeof onClose === "function" ? onClose : closeModal;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeFn();
  });

  if (closeButtonId) {
    const closeBtn = $(closeButtonId);
    if (closeBtn) closeBtn.addEventListener("click", closeFn);
  }

  return true;
}

// ========== CLOSE MODAL ==========
function closeModal() {
  $("modalContainer").innerHTML = "";
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const mc = $("modalContainer");
  if (!mc || !mc.firstElementChild) return;
  closeModal();
});
