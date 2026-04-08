// ========== MAIN.JS ==========
// App bootstrap: initialize data store, render views, handle tabs, register SW


// ========== TAB SWITCHING ==========
function refreshCurrentTab(tab) {
  if (tab === "today") refreshToday();
  else if (tab === "log") { refreshLog(); if (typeof refreshPhotos === 'function') refreshPhotos(); }
  else if (tab === "analytics") refreshAnalytics();
  else if (tab === "protocols") refreshProtocols();
  else if (tab === "settings") { if (typeof renderAchievementGallery === 'function') renderAchievementGallery(); }
}
let _navState = { tab: "today", at: Date.now() };
const NOTIFICATIONS_LAST_SEEN_KEY = "ft_notifications_last_seen";

function getLastSeenNotificationTs() {
  const raw = Number(localStorage.getItem(NOTIFICATIONS_LAST_SEEN_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function setLastSeenNotificationTs(ts) {
  localStorage.setItem(NOTIFICATIONS_LAST_SEEN_KEY, String(Number(ts) || Date.now()));
}

function getNotificationItems() {
  if (typeof getNotifications !== "function") return [];
  return getNotifications(60);
}

function updateNotificationBadge() {
  const badge = $("bellBadge");
  if (!badge) return;
  const items = getNotificationItems();
  const lastSeen = getLastSeenNotificationTs();
  const unread = items.filter(function (item) {
    const ts = Number(item.ts) || Number(item.timestamp) || 0;
    return ts > lastSeen;
  }).length;

  badge.textContent = unread > 99 ? "99+" : String(unread);
  badge.classList.toggle("hidden", unread <= 0);
}

function openPulseCenter() {
  if (typeof showPulseCenterView !== "function") {
    showToast("Pulse Center is loading...", "info");
    return;
  }

  const mostRecentTs = getNotificationItems().reduce(function (maxTs, item) {
    const ts = Number(item.ts) || Number(item.timestamp) || 0;
    return Math.max(maxTs, ts);
  }, 0);

  showPulseCenterView({
    onOpen: function () {
      setLastSeenNotificationTs(Math.max(Date.now(), mostRecentTs));
      updateNotificationBadge();
    },
    onClose: function () {
      updateNotificationBadge();
    },
  });
}

function tabFromHash(hash) {
  const clean = (hash || "").replace(/^#/, "").toLowerCase();
  const map = {
    today: "today",
    dashboard: "today",
    log: "log",
    workouts: "log",
    analytics: "analytics",
    stats: "analytics",
    settings: "settings",
    profile: "settings",
    protocols: "protocols",
    library: "protocols",
    data: "data",
    export: "data",
  };
  return map[clean] || null;
}

function hashForTab(tab) {
  const map = {
    today: "#today",
    log: "#log",
    analytics: "#analytics",
    settings: "#settings",
    protocols: "#protocols",
    data: "#data",
  };
  return map[tab] || "#today";
}

window.notifyDataChanged = function (detail) {
  window.dispatchEvent(new CustomEvent("fitone:dataChanged", { detail: detail || {} }));
};

window.addEventListener("fitone:dataChanged", () => {
  refreshLog();
  refreshToday();
  populateProtocolSelect();
  refreshFavorites();
  updateNotificationBadge();
  const activeMain = document.querySelector(".tab-btn.active");
  if (!activeMain) return;
  if (activeMain.dataset.tab === "analytics") refreshAnalytics();
  if (activeMain.dataset.tab === "protocols") refreshProtocols();
  // Check achievements on any data change
  if (typeof checkAchievements === 'function') setTimeout(checkAchievements, 500);
});

function activateMainTab(tab, options) {
  const now = Date.now();
  const shouldScroll = !(options && options.scroll === false);
  const shouldUpdateHash = !(options && options.updateHash === false);
  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.classList.remove("active");
    b.setAttribute("aria-selected", "false");
  });
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  const targetBtn = document.querySelector('[data-tab="' + tab + '"]');
  const targetPanel = $("panel-" + tab);
  if (!targetPanel) return;
  if (targetBtn) {
    targetBtn.classList.add("active");
    targetBtn.setAttribute("aria-selected", "true");
  }
  targetPanel.classList.add("active");
  _navState = { tab, at: now };
  if (shouldUpdateHash) {
    const nextHash = hashForTab(tab);
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }
  if (shouldScroll) window.scrollTo({ top: 0, behavior: "smooth" });
  refreshCurrentTab(tab);
  updateNotificationBadge();
  const fab = $("fabBtn");
  const fabMenu = $("fabMenu");
  if (fab) fab.classList.toggle("fab-hidden", tab === "log");
  if (fabMenu) fabMenu.classList.toggle("fab-hidden", tab === "log");
  closeFabMenu();
}

// Expose for settings to call
window._refreshCurrentTab = refreshCurrentTab;

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const now = Date.now();
    if (_navState.tab && _navState.tab !== btn.dataset.tab && now - _navState.at < 2000) {
      trackUXTelemetry("navigation.backWithin2sOfNavigate");
    }
    activateMainTab(btn.dataset.tab);
  });
});

window.addEventListener("hashchange", () => {
  const requested = tabFromHash(window.location.hash);
  if (!requested || requested === _navState.tab) return;
  activateMainTab(requested, { scroll: false, updateHash: false });
});

// ========== SUB-TABS ==========
document.querySelectorAll(".tab-panel .sub-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    const parent = btn.parentElement;
    parent.querySelectorAll(".sub-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const panel = btn.closest(".tab-panel");
    panel.querySelectorAll(".sub-panel").forEach((p) => p.classList.remove("active"));
    const target = $(btn.dataset.subtab);
    if (target) target.classList.add("active");
    refreshSubTab(btn.dataset.subtab);
  });
});

function refreshSubTab(subtabId) {
  if (subtabId === "library-list" && typeof refreshLibrary === "function") {
    refreshLibrary();
  } else if (subtabId === "protocols-list" && typeof refreshProtocols === "function") {
    refreshProtocols();
  } else if (subtabId === "log-food" && typeof refreshLog === "function") {
    refreshLog();
  } else if (subtabId === "log-workout" && typeof refreshLogWorkout === "function") {
    // refreshLogWorkout(); // if needed
  } else if (subtabId && subtabId.indexOf("analytics-") === 0 && typeof refreshAnalyticsSubTab === "function") {
    refreshAnalyticsSubTab(subtabId);
  }
}

// ========== NAV HELPERS ==========
function goToLog() {
  activateMainTab("log");
  setTimeout(() => { if ($("foodName")) $("foodName").focus(); }, 300);
}

function goToLogWorkout() {
  goToLog();
  document.querySelectorAll("#panel-log .sub-tab").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll("#panel-log .sub-panel").forEach((p) => p.classList.remove("active"));
  document.querySelector('[data-subtab="log-workout"]').classList.add("active");
  $("log-workout").classList.add("active");
  setTimeout(() => { if ($("workoutName")) $("workoutName").focus(); }, 300);
}

function goToLogBody() {
  activateMainTab("log", { scroll: false });
  document.querySelectorAll("#panel-log .sub-tab").forEach((s) => s.classList.remove("active"));
  document.querySelectorAll("#panel-log .sub-panel").forEach((s) => s.classList.remove("active"));
  const bodySub = document.querySelector('[data-subtab="log-body"]');
  if (bodySub) bodySub.classList.add("active");
  const bodyPanel = $("log-body");
  if (bodyPanel) bodyPanel.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.activateMainTab = activateMainTab;

// Set nav callbacks for todayView
setNavCallbacks(goToLog, goToLogWorkout);

// Set loadSettingsUI callback for exportView
setLoadSettingsUICallback(loadSettingsUI);

// ========== FAB SPEED DIAL ==========
function toggleFabMenu() {
  const menu = document.querySelector(".fab-menu");
  const backdrop = document.querySelector(".fab-backdrop");
  if (!menu || !backdrop) return;
  const isOpen = menu.classList.contains("open");
  if (isOpen) {
    closeFabMenu();
  } else {
    menu.classList.add("open");
    backdrop.classList.add("open");
  }
}

function closeFabMenu() {
  const menu = document.querySelector(".fab-menu");
  const backdrop = document.querySelector(".fab-backdrop");
  if (menu) menu.classList.remove("open");
  if (backdrop) backdrop.classList.remove("open");
}

function closeQuickModal() {
  if (typeof closeModal === "function") {
    closeModal();
    return;
  }
  const modalContainer = $("modalContainer");
  if (modalContainer) modalContainer.innerHTML = "";
}

function notifyQuickLogSaved(reason) {
  if (typeof window.notifyDataChanged === "function") {
    window.notifyDataChanged({ source: "quick-log", reason: reason || "mutation" });
    return;
  }
  refreshLog();
  refreshToday();
}

function openQuickAddFoodModal() {
  const modalContainer = $("modalContainer");
  if (!modalContainer) return;

  modalContainer.innerHTML =
    '<div class="modal-overlay" id="quickFoodOverlay">' +
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="quickFoodTitle">' +
        '<div class="modal-title" id="quickFoodTitle">Quick Add <button class="modal-close" id="quickFoodCloseBtn" aria-label="Close quick add">×</button></div>' +
        '<form id="quickFoodForm">' +
          '<div class="form-group">' +
            '<label>Food name</label>' +
            '<input type="text" id="quickFoodName" placeholder="e.g., Greek yogurt" autocomplete="off" required>' +
          '</div>' +
          '<div class="stat-row">' +
            '<div class="form-group" style="flex:1">' +
              '<label>Calories</label>' +
              '<input type="number" id="quickFoodCalories" min="0" step="1" placeholder="0" required>' +
            '</div>' +
            '<div class="form-group" style="flex:1">' +
              '<label>Meal</label>' +
              '<select id="quickFoodMeal">' +
                '<option value="breakfast">Breakfast</option>' +
                '<option value="lunch">Lunch</option>' +
                '<option value="dinner">Dinner</option>' +
                '<option value="snack" selected>Snack</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<button class="btn btn-primary btn-block" type="submit">Done</button>' +
        '</form>' +
      '</div>' +
    '</div>';

  const overlay = $("quickFoodOverlay");
  const closeBtn = $("quickFoodCloseBtn");
  const form = $("quickFoodForm");
  const nameInput = $("quickFoodName");

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeQuickModal();
    });
  }
  if (closeBtn) closeBtn.addEventListener("click", closeQuickModal);

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = (nameInput && nameInput.value ? nameInput.value : "").trim();
      const caloriesRaw = $("quickFoodCalories") ? $("quickFoodCalories").value : "";
      const calories = parseInt(caloriesRaw, 10);
      const meal = $("quickFoodMeal") ? $("quickFoodMeal").value : "snack";

      if (!name) {
        showToast("Enter a food name", "warning");
        if (nameInput) nameInput.focus();
        return;
      }
      if (!Number.isFinite(calories) || calories < 0) {
        showToast("Calories must be 0 or higher", "error");
        if ($("quickFoodCalories")) $("quickFoodCalories").focus();
        return;
      }

      const data = loadData(KEYS.food);
      data.push({
        id: uid(),
        date: today(),
        name,
        calories,
        protein: 0,
        carbs: 0,
        fat: 0,
        serving: "",
        meal,
        timestamp: Date.now(),
      });
      saveData(KEYS.food, data);
      closeQuickModal();
      notifyQuickLogSaved("quickFood");
      showToast("Quick food logged", "success");
    });
  }

  setTimeout(() => {
    if (nameInput) nameInput.focus();
  }, 20);
}

function openQuickBodyweightModal() {
  const modalContainer = $("modalContainer");
  if (!modalContainer) return;

  modalContainer.innerHTML =
    '<div class="modal-overlay" id="quickBodyOverlay">' +
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="quickBodyTitle">' +
        '<div class="modal-title" id="quickBodyTitle">Quick Bodyweight <button class="modal-close" id="quickBodyCloseBtn" aria-label="Close bodyweight modal">×</button></div>' +
        '<form id="quickBodyForm">' +
          '<div class="form-group">' +
            '<label>Weight (' + esc(settings.weightUnit || "kg") + ')</label>' +
            '<input type="number" id="quickBodyWeight" min="0" step="0.1" placeholder="0.0" required>' +
          '</div>' +
          '<button class="btn btn-primary btn-block" type="submit">Done</button>' +
        '</form>' +
      '</div>' +
    '</div>';

  const overlay = $("quickBodyOverlay");
  const closeBtn = $("quickBodyCloseBtn");
  const form = $("quickBodyForm");
  const weightInput = $("quickBodyWeight");

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeQuickModal();
    });
  }
  if (closeBtn) closeBtn.addEventListener("click", closeQuickModal);

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const weightRaw = weightInput ? weightInput.value : "";
      const weight = parseFloat(weightRaw);

      if (!Number.isFinite(weight) || weight <= 0) {
        showToast("Enter a valid bodyweight", "warning");
        if (weightInput) weightInput.focus();
        return;
      }

      const data = loadData(KEYS.body);
      data.push({
        id: uid(),
        date: today(),
        weight,
        bodyFat: null,
        waist: null,
        chest: null,
        arms: null,
        legs: null,
        notes: "",
        timestamp: Date.now(),
      });
      saveData(KEYS.body, data);
      closeQuickModal();
      notifyQuickLogSaved("quickBodyweight");
      showToast("Bodyweight logged", "success");
    });
  }

  setTimeout(() => {
    if (weightInput) weightInput.focus();
  }, 20);
}

function mapLegacyFabLabelToAction(label) {
  if (label === "Log food") return "log-food";
  if (label === "Log workout") return "log-workout";
  if (label === "Log body measurements") return "log-body";
  if (label === "Add water") return "add-water";
  return "";
}

function handleFabAction(action) {
  if (action === "quick-food") openQuickAddFoodModal();
  else if (action === "log-food") goToLog();
  else if (action === "log-workout") goToLogWorkout();
  else if (action === "quick-bodyweight") openQuickBodyweightModal();
  else if (action === "log-body") goToLogBody();
  else if (action === "add-water") addWater(250);
}

// FAB events
const fabBtnEl = $("fabBtn");
const fabBackdropEl = $("fabBackdrop");
if (fabBtnEl) fabBtnEl.addEventListener("click", toggleFabMenu);
if (fabBackdropEl) fabBackdropEl.addEventListener("click", closeFabMenu);

// FAB menu option events
const fabMenu = $("fabMenu");
if (fabMenu) {
  fabMenu.addEventListener("click", (e) => {
    const btn = e.target.closest(".fab-option-btn");
    if (!btn) return;
    const action = btn.dataset.fabAction || mapLegacyFabLabelToAction(btn.getAttribute("aria-label"));
    closeFabMenu();
    handleFabAction(action);
  });
}

// ========== COLLAPSIBLE CARDS ==========
function restoreCollapseState() {
  let collapsed = {};
  try { collapsed = JSON.parse(localStorage.getItem("ft_collapsed") || "{}"); } catch (e) { /* ignore */ }
  Object.keys(collapsed).forEach((section) => {
    if (!collapsed[section]) return;
    const card = document.querySelector('[data-section="' + section + '"]');
    if (!card) return;
    const body = card.querySelector(".card-body-collapsible");
    if (body) body.classList.add("collapsed");
    const icon = card.querySelector(".card-header-toggle .collapse-icon");
    if (icon) icon.textContent = "▲";
  });
}

// ========== SWIPE GESTURES ==========
function initSwipeGestures() {
  const panels = document.querySelectorAll(".tab-panel");
  panels.forEach((panel) => {
    let startX = 0, startY = 0, isDragging = false;
    panel.addEventListener("touchstart", function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = true;
    }, { passive: true });

    panel.addEventListener("touchend", function (e) {
      if (!isDragging) return;
      isDragging = false;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startX;
      const dy = endY - startY;
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;

      const activeSubs = panel.querySelectorAll(".sub-tab.active");
      if (!activeSubs.length) return;
      const allSubs = Array.from(panel.querySelectorAll(".sub-tab"));
      if (allSubs.length < 2) return;
      const activeIdx = allSubs.indexOf(activeSubs[0]);
      let newIdx;
      if (dx < 0) { newIdx = Math.min(activeIdx + 1, allSubs.length - 1); }
      else { newIdx = Math.max(activeIdx - 1, 0); }
      if (newIdx !== activeIdx) allSubs[newIdx].click();
    }, { passive: true });
  });
}

// ========== INIT ==========
function shouldShowWelcomeScreen() {
  return !localStorage.getItem("ft_onboarding_complete");
}

function setWelcomeUiState(isActive) {
  document.body.classList.toggle("welcome-active", !!isActive);
}

function populateWelcomeStats() {
  const workouts = loadData(KEYS.workouts);
  const workoutCountEl = $("welcomeWorkoutCount");
  const dayCountEl = $("welcomeDayCount");
  if (workoutCountEl) workoutCountEl.textContent = String(workouts.length);
  if (dayCountEl) {
    const uniqueDays = new Set(workouts.map((w) => w.date).filter(Boolean));
    dayCountEl.textContent = String(uniqueDays.size);
  }
}

function showWelcomeScreen() {
  const welcome = $("welcomeScreen");
  const app = $("app");
  if (!welcome || !app) return;
  populateWelcomeStats();
  setWelcomeUiState(true);
  welcome.classList.remove("hidden");
  app.classList.add("app-hidden");

  const startBtn = $("welcomeGetStarted");
  const importBtn = $("welcomeImportData");

  if (startBtn && !startBtn.dataset.bound) {
    startBtn.dataset.bound = "1";
    startBtn.addEventListener("click", () => {
      welcome.classList.add("welcome-fade-out");
      setTimeout(() => {
        welcome.classList.add("hidden");
        welcome.classList.remove("welcome-fade-out");
        app.classList.remove("app-hidden");
        setWelcomeUiState(false);
        if (typeof showOnboardingWizard === "function") showOnboardingWizard();
      }, 320);
    });
  }

  if (importBtn && !importBtn.dataset.bound) {
    importBtn.dataset.bound = "1";
    importBtn.addEventListener("click", () => {
      const importTrigger = $("importDataBtn");
      if (importTrigger) {
        importTrigger.click();
      } else {
        showToast("Import tools are loading. Try again in a moment.", "warning");
      }
    });
  }
}

function init() {
  $("headerDate").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
  loadSettingsUI();
  const td = today();
  if ($("foodDate")) $("foodDate").value = td;
  if ($("workoutDate")) $("workoutDate").value = td;
  if ($("bodyDate")) $("bodyDate").value = td;
  updateBodyLabels();

  const bellBtn = $("headerBell");
  if (bellBtn && !bellBtn.dataset.bound) {
    bellBtn.dataset.bound = "1";
    bellBtn.addEventListener("click", openPulseCenter);
  }

  // Initialize events for each view
  initTodayEvents();
  initLogEvents();
  initProtocolEvents();
  initExportEvents();
  initSettingsEvents();
  initAnalyticsResize();
  if (typeof hydrateExerciseDatabase === 'function') {
    setTimeout(() => {
      hydrateExerciseDatabase();
    }, 0);
  }

  // Initial render
  refreshToday();
  refreshLog();
  populateProtocolSelect();
  refreshFavorites();
  updateNotificationBadge();
  restoreCollapseState();
  initSwipeGestures();

  // Init photos & achievements
  if (typeof initPhotoEvents === 'function') initPhotoEvents();
  if (typeof refreshPhotos === 'function') refreshPhotos();
  if (typeof renderAchievementGallery === 'function') renderAchievementGallery();
  if (typeof checkAchievements === 'function') setTimeout(checkAchievements, 1000);

  // First-launch flow: welcome screen -> onboarding
  if (shouldShowWelcomeScreen()) {
    showWelcomeScreen();
    return;
  }

  setWelcomeUiState(false);

  // Backward-compatible onboarding check for users who skipped older flow
  if (typeof shouldShowOnboarding === 'function' && shouldShowOnboarding()) {
    setTimeout(() => showOnboardingWizard(), 250);
  }

  const requestedTab = tabFromHash(window.location.hash) || "today";
  activateMainTab(requestedTab, { scroll: false, updateHash: false });
}

init();

// ========== SERVICE WORKER REGISTRATION ==========
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swUrl = new URL("./sw.js", window.location.href);
    const swScope = new URL("./", window.location.href).pathname;
    navigator.serviceWorker
      .register(swUrl.pathname, { scope: swScope })
      .then((reg) => {
        console.log("FitOne service worker registered", reg);
      })
      .catch((err) => {
        console.error("FitOne service worker registration failed", err);
      });
  });
}
