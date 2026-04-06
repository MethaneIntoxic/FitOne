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
  values.forEach((v, i) => {
    const x = pad.l + (cW / (values.length - 1 || 1)) * i;
    const y = pad.t + cH - ((v - yMin) / yRange) * cH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.l + cW, pad.t + cH);
  ctx.lineTo(pad.l, pad.t + cH);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = pad.l + (cW / (values.length - 1 || 1)) * i;
    const y = pad.t + cH - ((v - yMin) / yRange) * cH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  values.forEach((v, i) => {
    const x = pad.l + (cW / (values.length - 1 || 1)) * i;
    const y = pad.t + cH - ((v - yMin) / yRange) * cH;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = "8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      typeof v === "number" ? (v % 1 ? v.toFixed(1) : v) : v,
      x,
      y - 8
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
