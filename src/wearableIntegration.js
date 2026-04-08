// Wearable integration surface for optional vendor links.

const WEARABLE_VENDORS = [
  {
    id: "apple-health",
    name: "Apple Health",
    mode: "manual-export",
    capabilities: ["workouts", "heart-rate", "body-metrics"],
  },
  {
    id: "google-fit",
    name: "Google Fit",
    mode: "manual-export",
    capabilities: ["workouts", "steps", "heart-rate"],
  },
  {
    id: "garmin-connect",
    name: "Garmin Connect",
    mode: "csv-import",
    capabilities: ["cardio", "distance", "pace"],
  },
  {
    id: "strava",
    name: "Strava",
    mode: "csv-import",
    capabilities: ["cardio", "distance", "pace"],
  },
];

function listSupportedVendors() {
  return WEARABLE_VENDORS.slice();
}

function getConnectedVendors() {
  const raw = Array.isArray(settings.connectedWearables) ? settings.connectedWearables : [];
  return raw.map(function (value) { return String(value); });
}

function isIntegrationEnabled(vendorId) {
  const id = String(vendorId || "");
  if (!id) return getConnectedVendors().length > 0;
  return getConnectedVendors().includes(id);
}

function connectVendor(vendorId) {
  const id = String(vendorId || "").trim();
  const vendor = WEARABLE_VENDORS.find(function (row) { return row.id === id; });
  if (!vendor) {
    return { connected: false, reason: "unknown-vendor" };
  }

  const connected = new Set(getConnectedVendors());
  connected.add(id);
  const next = {
    ...settings,
    connectedWearables: Array.from(connected),
  };
  updateSettings(next);
  localStorage.setItem(KEYS.settings, JSON.stringify(next));

  return { connected: true, vendor: vendor.name, mode: vendor.mode };
}

function disconnectVendor(vendorId) {
  const id = String(vendorId || "").trim();
  const connected = getConnectedVendors().filter(function (value) { return value !== id; });
  const next = {
    ...settings,
    connectedWearables: connected,
  };
  updateSettings(next);
  localStorage.setItem(KEYS.settings, JSON.stringify(next));
  return { connected: false, vendorId: id };
}

function importWearableSample(vendorId) {
  const id = String(vendorId || "").trim();
  if (!isIntegrationEnabled(id)) {
    return { imported: false, reason: "vendor-not-connected" };
  }

  const d = today();
  const ts = Date.now();
  const workoutId = uid();
  const workout = {
    id: workoutId,
    date: d,
    name: "Wearable Sync • " + id,
    type: "cardio",
    duration: 32,
    caloriesBurned: 310,
    exercises: [],
    notes: "Imported from connected wearable sample",
    protocolId: null,
    timestamp: ts,
  };
  const cardio = {
    id: uid(),
    timestamp: ts,
    date: d,
    workout_id: workoutId,
    name: workout.name,
    duration_min: 32,
    distance_km: 5.1,
    calories_burned: 310,
    source: id,
    avg_pace_min_per_km: 6.27,
  };

  const workouts = loadData(KEYS.workouts);
  workouts.push(workout);
  saveData(KEYS.workouts, workouts);

  const cardios = loadData(KEYS.cardios);
  cardios.push(cardio);
  saveData(KEYS.cardios, cardios);

  if (typeof window.notifyDataChanged === "function") {
    window.notifyDataChanged({ source: "wearable", reason: "sample-import", vendorId: id });
  }

  return {
    imported: true,
    workoutId: workoutId,
    cardioId: cardio.id,
    vendorId: id,
  };
}
