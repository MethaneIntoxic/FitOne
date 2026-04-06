// ========== ACTIVITY FEED VIEW (W11) ==========
// Personal timeline overlay composed from local logs.

(function () {
  function toTs(item) {
    const ts = Number(item && item.timestamp) || Number(item && item.ts) || 0;
    if (ts > 0) return ts;
    if (item && item.date) {
      const d = new Date(item.date + "T00:00:00");
      return d.getTime();
    }
    return Date.now();
  }

  function timeAgo(ts) {
    const diff = Math.max(0, Date.now() - ts);
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return min + "m ago";
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + "h ago";
    const days = Math.floor(hr / 24);
    if (days < 30) return days + "d ago";
    const months = Math.floor(days / 30);
    return months + "mo ago";
  }

  function renderActivityCard(item) {
    const type = String(item.type || "other");
    const title = esc(item.title || "Activity");
    const context = esc(item.context || "FitOne");
    const subtitle = esc(item.subtitle || "");
    const badge = item.badge ? '<span class="activity-feed-badge">' + esc(item.badge) + "</span>" : "";
    const hot = item.hot ? '<span class="activity-feed-hot">🔥 Personal Best!</span>' : "";

    return (
      '<button class="activity-feed-card" data-af-type="' + esc(type) + '" data-af-id="' + esc(String(item.id || "")) + '" data-af-exercise="' + esc(item.exercise || "") + '">' +
      '<div class="activity-feed-card-top">' +
      '<div class="activity-feed-icon">' + esc(item.icon || "•") + '</div>' +
      '<div class="activity-feed-meta">' +
      '<div class="activity-feed-title">' + title + '</div>' +
      '<div class="activity-feed-sub">' + esc(timeAgo(toTs(item))) + ' • ' + context + '</div>' +
      '</div>' +
      badge +
      '</div>' +
      '<div class="activity-feed-copy">' + subtitle + '</div>' +
      hot +
      '</button>'
    );
  }

  function renderFeed(items) {
    if (!items.length) {
      return '<div class="deep-dive-empty">No activity yet. Log workouts, nutrition, and body metrics to build your timeline.</div>';
    }
    return '<div class="activity-feed-list">' + items.map(renderActivityCard).join("") + "</div>";
  }

  function navigateToSubTab(tabId, subTabSelector, subPanelId) {
    if (typeof activateMainTab === "function") activateMainTab(tabId);
    const sub = document.querySelector(subTabSelector);
    if (sub) sub.click();
    if (subPanelId) {
      const panel = document.getElementById(subPanelId);
      if (panel) panel.classList.add("active");
    }
  }

  function handleCardClick(card) {
    const type = card.getAttribute("data-af-type") || "";
    const id = card.getAttribute("data-af-id") || "";
    const exercise = card.getAttribute("data-af-exercise") || "";

    if (type === "pr") {
      if (typeof showDeepDiveModal === "function" && exercise) {
        showDeepDiveModal(exercise);
        return;
      }
      if (typeof showExerciseDetailModal === "function" && exercise) {
        showExerciseDetailModal(exercise);
        return;
      }
    }

    if (type === "workout") {
      if (typeof showWorkoutDetailView === "function") {
        showWorkoutDetailView(id);
        return;
      }
      navigateToSubTab("log", '[data-subtab="log-workout"]', "log-workout");
      showToast("Workout detail is coming next. Opened your workout log.", "info");
      closeModal();
      return;
    }

    if (type === "food") {
      navigateToSubTab("log", '[data-subtab="log-food"]', "log-food");
      closeModal();
      return;
    }

    if (type === "body") {
      navigateToSubTab("log", '[data-subtab="log-body"]', "log-body");
      closeModal();
      return;
    }

    if (type === "achievement" || type === "streak") {
      if (typeof activateMainTab === "function") activateMainTab("settings");
      closeModal();
      return;
    }

    closeModal();
  }

  window.showActivityFeedModal = function () {
    const items = typeof getRecentActivity === "function" ? getRecentActivity(80) : [];

    const html =
      '<div class="activity-feed-overlay" id="activityFeedOverlay">' +
      '<section class="activity-feed-panel" role="dialog" aria-label="Activity Feed">' +
      '<header class="activity-feed-header">' +
      '<button class="activity-feed-back" id="activityFeedBack" aria-label="Back"><span class="material-symbols-outlined">arrow_back</span></button>' +
      '<div>' +
      '<div class="activity-feed-kicker">ALL PERFORMANCE ALERTS AND ACTIVITY</div>' +
      '<h2>Activity Feed</h2>' +
      '</div>' +
      '</header>' +
      '<div class="activity-feed-body">' + renderFeed(items) + '</div>' +
      '</section>' +
      '</div>';

    const modal = $("modalContainer");
    if (!modal) return;
    modal.innerHTML = html;

    const overlay = $("activityFeedOverlay");
    const back = $("activityFeedBack");
    if (back) back.addEventListener("click", closeModal);
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeModal();
      });
    }

    document.querySelectorAll(".activity-feed-card").forEach(function (card) {
      card.addEventListener("click", function () {
        handleCardClick(card);
      });
    });
  };
})();
