// Local-first peer sync: generate/import encrypted-free sync codes that users can transfer manually.

const SYNC_ENTITY_MAP = {
  food: KEYS.food,
  workouts: KEYS.workouts,
  body: KEYS.body,
  water: KEYS.water,
  protocols: KEYS.protocols,
  routines: KEYS.routines,
  strengthSets: KEYS.strengthSets,
  cardios: KEYS.cardios,
  foodItems: KEYS.foodItems,
  mealTemplates: KEYS.mealTemplates,
  favorites: KEYS.favorites,
  dayPlans: KEYS.dayPlans,
  wellness: KEYS.wellness,
};

const SYNC_PAYLOAD_VERSION = 2;

function readSyncOps() {
  const rows = loadData(KEYS.syncOps);
  return Array.isArray(rows) ? rows : [];
}

function listPendingSyncOperations() {
  return readSyncOps().slice(-80).reverse();
}

function enqueueSyncOperation(type, payload) {
  const ops = readSyncOps();
  ops.push({
    id: uid(),
    ts: Date.now(),
    type: String(type || "mutation"),
    payload: payload || {},
  });
  saveData(KEYS.syncOps, ops.slice(-300));
}

function collectSyncPayload() {
  const entities = {};
  Object.keys(SYNC_ENTITY_MAP).forEach(function (name) {
    entities[name] = loadData(SYNC_ENTITY_MAP[name]);
  });

  return {
    version: SYNC_PAYLOAD_VERSION,
    exportedAt: new Date().toISOString(),
    settings: loadSettings(),
    entities: entities,
  };
}

function encodeSyncPayload(payload) {
  const json = JSON.stringify(payload || {});
  return btoa(unescape(encodeURIComponent(json)));
}

function decodeSyncPayload(code) {
  const text = String(code || "").trim();
  if (!text) throw new Error("Sync code is empty");

  let json;
  try {
    json = decodeURIComponent(escape(atob(text)));
  } catch {
    json = text;
  }

  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid sync payload");
  return parsed;
}

function getMergeKey(row) {
  if (!row || typeof row !== "object") return "";
  if (row.id) return "id:" + String(row.id);
  if (row.date && row.name) return "dn:" + String(row.date) + "|" + String(row.name);
  return "ts:" + String(row.timestamp || row.ts || "") + "|" + JSON.stringify(row).slice(0, 120);
}

function mergeEntityRows(existing, incoming) {
  const out = {};
  (Array.isArray(existing) ? existing : []).forEach(function (row) {
    const key = getMergeKey(row);
    if (!key) return;
    out[key] = row;
  });
  (Array.isArray(incoming) ? incoming : []).forEach(function (row) {
    const key = getMergeKey(row);
    if (!key) return;
    const prev = out[key];
    if (!prev) {
      out[key] = row;
      return;
    }
    const prevTs = Number(prev.timestamp || prev.ts || 0);
    const nextTs = Number(row.timestamp || row.ts || 0);
    out[key] = nextTs >= prevTs ? row : prev;
  });
  return Object.keys(out).map(function (key) { return out[key]; });
}

function applySyncPayload(payload, mode) {
  const mergeMode = String(mode || "merge").toLowerCase() === "replace" ? "replace" : "merge";
  const entities = payload && payload.entities ? payload.entities : {};

  Object.keys(SYNC_ENTITY_MAP).forEach(function (name) {
    const key = SYNC_ENTITY_MAP[name];
    const incoming = Array.isArray(entities[name]) ? entities[name] : [];
    if (mergeMode === "replace") {
      saveData(key, incoming);
    } else {
      const existing = loadData(key);
      saveData(key, mergeEntityRows(existing, incoming));
    }
  });

  if (payload && payload.settings && typeof payload.settings === "object") {
    const mergedSettings = mergeMode === "replace"
      ? { ...defaultSettings(), ...payload.settings }
      : { ...loadSettings(), ...payload.settings };
    updateSettings(mergedSettings);
    safeSetItem(KEYS.settings, JSON.stringify(mergedSettings));
  }

  if (typeof window.notifyDataChanged === "function") {
    window.notifyDataChanged({ source: "sync", reason: "apply", mode: mergeMode });
  }

  return {
    applied: true,
    mode: mergeMode,
    version: Number(payload && payload.version) || 1,
  };
}

function createPeerSyncCode() {
  return encodeSyncPayload(collectSyncPayload());
}

function applyPeerSyncCode(code, mode) {
  const payload = decodeSyncPayload(code);
  return applySyncPayload(payload, mode || "merge");
}

function performSyncNow() {
  const code = createPeerSyncCode();
  const bytes = Math.round((code.length * 3) / 4);
  saveData(KEYS.syncOps, []);
  return Promise.resolve({
    synced: true,
    mode: "peer-code",
    code: code,
    bytes: bytes,
  });
}
