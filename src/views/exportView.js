// ========== EXPORT VIEW ==========
// Export/import data and danger zone


let _loadSettingsUICallback = null;
function setLoadSettingsUICallback(fn) {
  _loadSettingsUICallback = fn;
}

function exportData() {
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    food: loadData(KEYS.food),
    workouts: loadData(KEYS.workouts),
    body: loadData(KEYS.body),
    protocols: loadData(KEYS.protocols),
    water: loadData(KEYS.water),
    favorites: loadData(KEYS.favorites),
    wellness: loadData(KEYS.wellness),
    tdee: loadTDEEData(),
    settings: loadSettings(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fitness-data-" + today() + ".json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Data exported! 📥");
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.version) throw new Error("Invalid format");

      ["food", "workouts", "body", "protocols", "water", "favorites", "wellness"].forEach((key) => {
        if (data[key]) {
          const storeKey = KEYS[key];
          const existing = loadData(storeKey);
          const ids = new Set(existing.map((item) => item.id || item.date));
          const newItems = data[key].filter((item) => (item.id || item.date) && !ids.has(item.id || item.date));
          saveData(storeKey, [...existing, ...newItems]);
        }
      });

      if (data.tdee) {
        saveTDEEData(data.tdee);
      }

      if (data.settings) {
        const newSettings = { ...defaultSettings(), ...data.settings };
        updateSettings(newSettings);
        localStorage.setItem(KEYS.settings, JSON.stringify(newSettings));
        if (_loadSettingsUICallback) _loadSettingsUICallback();
      }

      refreshToday();
      refreshLog();
      showToast("Imported successfully! 📤");
    } catch (err) {
      showToast("Import failed: " + err.message, "error");
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}

function clearAllData() {
  showConfirmModal(
    "Delete All Data",
    "🗑️",
    "This will permanently erase ALL your fitness data including food, workouts, body measurements, protocols, and settings. This cannot be undone.",
    () => {
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
      updateSettings(defaultSettings());
      if (_loadSettingsUICallback) _loadSettingsUICallback();
      refreshToday();
      refreshLog();
      showToast("All data deleted");
    }
  );
}

// ========== EVENT BINDING ==========
function initExportEvents() {
  const panel = $("panel-data");
  if (!panel) return;

  const importFile = $("importFile");

  panel.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.textContent.includes("Export JSON")) exportData();
    else if (btn.textContent.includes("Import JSON")) importFile.click();
    else if (btn.textContent.includes("Delete All Data")) clearAllData();
  });

  if (importFile) {
    importFile.addEventListener("change", importData);
  }
}
