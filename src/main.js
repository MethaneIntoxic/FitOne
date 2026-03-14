// ========== MAIN.JS ==========
// App bootstrap: initialize data store, render views, handle tabs, register SW


// ========== TAB SWITCHING ==========
function refreshCurrentTab(tab) {
  if (tab === "today") refreshToday();
  else if (tab === "log") refreshLog();
  else if (tab === "analytics") refreshAnalytics();
  else if (tab === "protocols") refreshProtocols();
}

// Expose for settings to call
window._refreshCurrentTab = refreshCurrentTab;

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    $("panel-" + btn.dataset.tab).classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
    refreshCurrentTab(btn.dataset.tab);
    // Hide FAB on log tab
    const fab = $("fabBtn");
    const fabMenu = $("fabMenu");
    if (fab) fab.classList.toggle("fab-hidden", btn.dataset.tab === "log");
    if (fabMenu) fabMenu.classList.toggle("fab-hidden", btn.dataset.tab === "log");
    closeFabMenu();
  });
});

// ========== SUB-TABS ==========
document.querySelectorAll(".sub-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    const parent = btn.parentElement;
    parent.querySelectorAll(".sub-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const panel = btn.closest(".tab-panel");
    panel.querySelectorAll(".sub-panel").forEach((p) => p.classList.remove("active"));
    $(btn.dataset.subtab).classList.add("active");
    refreshSubTab(btn.dataset.subtab);
  });
});

// ========== NAV HELPERS ==========
function goToLog() {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  document.querySelector('[data-tab="log"]').classList.add("active");
  $("panel-log").classList.add("active");
  $("fabBtn").classList.add("fab-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  refreshLog();
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
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  const logTab = document.querySelector('[data-tab="log"]');
  if (logTab) { logTab.classList.add("active"); logTab.setAttribute("aria-selected", "true"); }
  const logPanel = $("panel-log");
  if (logPanel) logPanel.classList.add("active");
  document.querySelectorAll("#panel-log .sub-tab").forEach((s) => s.classList.remove("active"));
  document.querySelectorAll("#panel-log .sub-panel").forEach((s) => s.classList.remove("active"));
  const bodySub = document.querySelector('[data-subtab="log-body"]');
  if (bodySub) bodySub.classList.add("active");
  const bodyPanel = $("log-body");
  if (bodyPanel) bodyPanel.classList.add("active");
  $("fabBtn").classList.add("fab-hidden");
  closeFabMenu();
  refreshLog();
}

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
    const label = btn.getAttribute("aria-label");
    closeFabMenu();
    if (label === "Log food") goToLog();
    else if (label === "Log workout") goToLogWorkout();
    else if (label === "Log body measurements") goToLogBody();
    else if (label === "Add water") addWater(250);
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

  // Initialize events for each view
  initTodayEvents();
  initLogEvents();
  initProtocolEvents();
  initExportEvents();
  initSettingsEvents();
  initAnalyticsResize();

  // Initial render
  refreshToday();
  refreshLog();
  populateProtocolSelect();
  refreshFavorites();
  restoreCollapseState();
  initSwipeGestures();
}

init();

// ========== SERVICE WORKER REGISTRATION ==========
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/FitOne/sw.js", { scope: "/FitOne/" })
      .then((reg) => {
        console.log("FitOne service worker registered", reg);
      })
      .catch((err) => {
        console.error("FitOne service worker registration failed", err);
      });
  });
}
