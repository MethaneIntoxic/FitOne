// ========== PULSE CENTER VIEW (W14) ==========
// Local notification center for performance alerts and activity.

(function () {
  function timeAgoUpper(ts) {
    const diff = Math.max(0, Date.now() - (Number(ts) || Date.now()));
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "JUST NOW";
    if (mins < 60) return mins + "M AGO";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "H AGO";
    const days = Math.floor(hrs / 24);
    return days + "D AGO";
  }

  function renderNotifications() {
    const items = typeof getNotifications === "function" ? getNotifications(40) : [];
    if (!items.length) {
      return '<div class="deep-dive-empty">No new alerts yet. Keep training and logging to populate your Pulse Center.</div>';
    }

    return '<div class="pulse-list">' + items.map(function (item) {
      const ts = Number(item.ts) || Number(item.timestamp) || Date.now();
      return (
        '<article class="pulse-card" data-pulse-id="' + escAttr(String(item.id || "")) + '">' +
        '<div class="pulse-card-top">' +
        '<div class="pulse-icon"><span class="material-symbols-outlined">' + esc(item.icon || "notifications") + '</span></div>' +
        '<div class="pulse-meta">' +
        '<div class="pulse-title">' + esc(item.title || "Notification") + '</div>' +
        '<div class="pulse-time">' + esc(timeAgoUpper(ts)) + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="pulse-copy">' + esc(item.description || "") + '</div>' +
        '</article>'
      );
    }).join("") + '</div>';
  }

  function renderPerformanceAlerts() {
    const summary = typeof getWeeklyPerformanceSummary === "function"
      ? getWeeklyPerformanceSummary()
      : { currentVolume: 0, previousVolume: 0, changePct: 0, generatedAt: Date.now() };

    const current = Math.round(Number(summary.currentVolume) || 0);
    const previous = Math.round(Number(summary.previousVolume) || 0);
    const pct = Number(summary.changePct) || 0;
    const sign = pct >= 0 ? "+" : "";
    const maxBar = Math.max(current, previous, 1);
    const currentWidth = Math.max(10, Math.round((current / maxBar) * 100));
    const previousWidth = Math.max(10, Math.round((previous / maxBar) * 100));

    const description = "Your volume is up by " + sign + pct + "% compared to last week. Review your metabolic breakdown.";

    return (
      '<article class="pulse-performance-card">' +
      '<div class="pulse-performance-head">' +
      '<div class="pulse-performance-title">Weekly Performance Summary Ready</div>' +
      '<span class="pulse-action-badge">ACTION REQUIRED</span>' +
      '</div>' +
      '<div class="pulse-copy">' + esc(description) + '</div>' +
      '<div class="pulse-mini-bars">' +
      '<div class="pulse-mini-row"><span>LAST WEEK</span><div class="pulse-bar-track"><i style="width:' + previousWidth + '%"></i></div><b>' + previous.toLocaleString() + '</b></div>' +
      '<div class="pulse-mini-row"><span>THIS WEEK</span><div class="pulse-bar-track"><i class="is-current" style="width:' + currentWidth + '%"></i></div><b>' + current.toLocaleString() + '</b></div>' +
      '</div>' +
      '<div class="pulse-time">' + esc(timeAgoUpper(summary.generatedAt || Date.now())) + '</div>' +
      '</article>'
    );
  }

  function closePulseCenter(onClose) {
    const root = $("pulseCenterRoot") || $("modalContainer");
    if (!root) return;
    root.innerHTML = "";
    if (typeof onClose === "function") onClose();
  }

  window.showPulseCenterView = function (options) {
    const root = $("pulseCenterRoot") || $("modalContainer");
    if (!root) return;

    root.innerHTML =
      '<div class="pulse-center-overlay" id="pulseCenterOverlay">' +
      '<section class="pulse-center-panel" role="dialog" aria-label="Pulse Center">' +
      '<header class="pulse-center-header">' +
      '<button class="pulse-center-back" id="pulseCenterBack" aria-label="Back"><span class="material-symbols-outlined">arrow_back</span></button>' +
      '<div>' +
      '<h2>Pulse Center</h2>' +
      '<div class="pulse-center-kicker">ALL PERFORMANCE ALERTS AND ACTIVITY</div>' +
      '</div>' +
      '</header>' +
      '<div class="pulse-center-body">' +
      '<section class="pulse-section">' +
      '<div class="pulse-section-title is-green">RECENT ACTIVITY</div>' +
      renderNotifications() +
      '</section>' +
      '<section class="pulse-section">' +
      '<div class="pulse-section-title is-purple">PERFORMANCE METRICS</div>' +
      renderPerformanceAlerts() +
      '</section>' +
      '</div>' +
      '</section>' +
      '</div>';

    const overlay = $("pulseCenterOverlay");
    const back = $("pulseCenterBack");
    const closeHandler = function () {
      closePulseCenter(options && options.onClose);
    };

    if (back) back.addEventListener("click", closeHandler);
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeHandler();
      });
    }

    if (options && typeof options.onOpen === "function") {
      options.onOpen();
    }
  };
})();
