// ========== UI HELPERS ==========
// Generic DOM helpers, shared UI utilities (toast, confirm, ring drawing, charts, etc.)

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

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg3")
        .trim() || "#252836";
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
      ctx.strokeStyle = pct > 1.1 ? "#ef5350" : color;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    ctx.fillStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--text")
        .trim() || "#e4e6eb";
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
  const textColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--text2")
      .trim() || "#a0a3b1";

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
    ctx.strokeStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--border")
        .trim() || "#2e3141";
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
    if (goalLine && values[i] > 0) {
      const ratio = values[i] / goalLine;
      if (ratio > 1.1) barColor = "#ef5350";
      else if (ratio > 0.9) barColor = "#4caf50";
      else if (ratio > 0.7) barColor = "#ff9800";
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
    }

    ctx.fillStyle = textColor;
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(l, x + barW / 2, H - pad.b + 14);
  });

  if (goalLine) {
    const gy = pad.t + cH - (goalLine / maxVal) * cH;
    ctx.strokeStyle = "#ef5350";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(pad.l, gy);
    ctx.lineTo(W - pad.r, gy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ef5350";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Goal", W - pad.r - 24, gy - 4);
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
  const textColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--text2")
      .trim() || "#a0a3b1";

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
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--border")
      .trim();
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
  const textColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--text2")
    .trim();
  const borderColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--border")
      .trim() || "#2e3141";

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
  const colors = { protein: "#4caf50", carbs: "#ff9800", fat: "#2196f3" };

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
    ["Protein", "#4caf50"],
    ["Carbs", "#ff9800"],
    ["Fat", "#2196f3"],
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
  if (score < 40) return "#ef5350";
  if (score < 60) return "#ff9800";
  if (score < 75) return "#ffeb3b";
  return "#4caf50";
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

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0.75 * Math.PI, 2.25 * Math.PI);
    ctx.strokeStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg3")
        .trim() || "#252836";
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

    ctx.fillStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--text2")
        .trim() || "#a0a3b1";
    ctx.font = "10px -apple-system, sans-serif";
    ctx.fillText("READINESS", cx, cy + 18);

    if (progress < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

// ========== CLOSE MODAL ==========
function closeModal() {
  $("modalContainer").innerHTML = "";
}
