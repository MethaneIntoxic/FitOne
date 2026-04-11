// ========== DATA STUDIO / EXPORT VIEW ==========

let _loadSettingsUICallback = null;
let _pendingImportRows = [];
let _pendingImportHeaders = [];
let _pendingImportType = "";
let _pendingProgramRows = [];
let _pendingProgramHeaders = [];

const DATA_SCHEMAS = {
  workouts: ["id", "timestamp", "date", "name", "type", "duration_min", "calories_burned", "protocol_id", "notes"],
  strength_sets: ["id", "timestamp", "date", "workout_id", "exercise_name", "set_index", "reps", "weight_kg", "target_reps", "target_weight", "target_rpe", "is_assisted_bodyweight"],
  cardios: ["id", "timestamp", "date", "workout_id", "name", "duration_min", "distance_km", "calories_burned"],
  measurements: ["id", "timestamp", "date", "weight", "body_fat", "waist", "chest", "arms", "legs", "notes"],
  photos: ["id", "timestamp", "date", "label", "uri", "notes"],
  food_items: ["id", "timestamp", "name", "serving", "calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"],
  food_logs: ["id", "timestamp", "date", "meal", "food_name", "serving", "calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"],
  protocols: ["id", "timestamp", "name", "description", "version", "base_routine_id"],
  day_plans: ["id", "timestamp", "date", "name", "notes"],
};

const ENTITY_STORAGE = {
  workouts: KEYS.workouts,
  strength_sets: KEYS.strengthSets,
  cardios: KEYS.cardios,
  measurements: KEYS.body,
  photos: KEYS.photos,
  food_items: KEYS.foodItems,
  food_logs: KEYS.food,
  protocols: KEYS.protocols,
  day_plans: KEYS.dayPlans,
};

const PROGRAM_SCHEMA_FIELDS = ["ProgramName", "Week", "Day", "Exercise", "Set", "Reps", "RPE", "Weight"];

function setLoadSettingsUICallback(fn) {
  _loadSettingsUICallback = fn;
}

function toCsv(rows, headers) {
  const escCsv = (v) => {
    const raw = v == null ? "" : String(v);
    if (raw.includes('"') || raw.includes(",") || raw.includes("\n")) return '"' + raw.replace(/"/g, '""') + '"';
    return raw;
  };
  return [headers.join(",")]
    .concat(rows.map((r) => headers.map((h) => escCsv(r[h])).join(",")))
    .join("\n");
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const split = (line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = split(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = split(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] || "").trim();
    });
    return row;
  });
  return { headers, rows };
}

function normalizeExportPayload() {
  const workouts = loadData(KEYS.workouts);
  const body = loadData(KEYS.body);
  const protocols = loadData(KEYS.protocols);
  const food = loadData(KEYS.food);
  const strengthSetsFromWorkouts = [];
  workouts.forEach((w) => {
    (w.exercises || []).forEach((ex, idx) => {
      strengthSetsFromWorkouts.push({
        id: ex.id || uid(),
        timestamp: w.timestamp || Date.now(),
        date: w.date,
        workout_id: w.id,
        exercise_name: ex.name,
        set_index: idx + 1,
        reps: ex.reps || 0,
        weight_kg: ex.weight || 0,
        target_reps: ex.targetReps || "",
        target_weight: ex.targetWeight || "",
        target_rpe: ex.targetRPE || "",
        is_assisted_bodyweight: ex.isAssistedBodyweight ? "true" : "false",
      });
    });
  });
  return {
    workouts: workouts.map((w) => ({
      id: w.id,
      timestamp: w.timestamp || Date.now(),
      date: w.date,
      name: w.name,
      type: w.type,
      duration_min: w.duration || 0,
      calories_burned: w.caloriesBurned || 0,
      protocol_id: w.protocolId || "",
      notes: w.notes || "",
    })),
    strength_sets: loadData(KEYS.strengthSets).concat(strengthSetsFromWorkouts),
    cardios: loadData(KEYS.cardios),
    measurements: body.map((m) => ({
      id: m.id,
      timestamp: m.timestamp || Date.now(),
      date: m.date,
      weight: m.weight || "",
      body_fat: m.bodyFat || "",
      waist: m.waist || "",
      chest: m.chest || "",
      arms: m.arms || "",
      legs: m.legs || "",
      notes: m.notes || "",
    })),
    photos: loadData(KEYS.photos),
    food_items: loadData(KEYS.foodItems),
    food_logs: food.map((f) => ({
      id: f.id,
      timestamp: f.timestamp || Date.now(),
      date: f.date,
      meal: f.meal || "",
      food_name: f.name || "",
      serving: f.serving || "",
      calories: f.calories || 0,
      protein: f.protein || 0,
      carbs: f.carbs || 0,
      fat: f.fat || 0,
      fiber: f.fiber || 0,
      sugar: f.sugar || 0,
      sodium: f.sodium || 0,
    })),
    protocols: protocols.map((p) => ({
      id: p.id,
      timestamp: p.createdAt || p.timestamp || Date.now(),
      name: p.name,
      description: p.description || "",
      version: p.version || 1,
      base_routine_id: p.baseRoutineId || "",
    })),
    day_plans: loadData(KEYS.dayPlans),
  };
}

function download(filename, content, type) {
  const blob = new Blob([content], { type: type || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportGlobalJSON() {
  const payload = {
    version: 3,
    exported_at: new Date().toISOString(),
    settings: loadSettings(),
    entities: normalizeExportPayload(),
  };
  download("fitone-global-" + today() + ".json", JSON.stringify(payload, null, 2), "application/json");
  showToast("Global JSON exported");
}

function buildBackupSnapshot(reason) {
  return {
    version: 4,
    type: "backup",
    reason: String(reason || "manual"),
    exported_at: new Date().toISOString(),
    settings: loadSettings(),
    entities: normalizeExportPayload(),
  };
}

function saveBackupSnapshotLocally(snapshot) {
  const history = loadData(KEYS.backupSnapshots);
  const next = (Array.isArray(history) ? history : []).concat({
    id: uid(),
    exported_at: snapshot.exported_at,
    reason: snapshot.reason,
    size: JSON.stringify(snapshot).length,
    snapshot: snapshot,
  });
  saveData(KEYS.backupSnapshots, next.slice(-20));
}

function createBackupSnapshot(options) {
  const opts = options || {};
  const snapshot = buildBackupSnapshot(opts.reason || "manual");
  saveBackupSnapshotLocally(snapshot);

  if (opts.download !== false) {
    download("fitone-backup-" + today() + ".json", JSON.stringify(snapshot, null, 2), "application/json");
  }

  const next = {
    ...settings,
    autoBackupLastRunAt: Date.now(),
  };
  updateSettings(next);
  localStorage.setItem(KEYS.settings, JSON.stringify(next));

  return {
    ok: true,
    exportedAt: snapshot.exported_at,
    size: JSON.stringify(snapshot).length,
  };
}

function runScheduledBackupIfDue() {
  if (!settings.autoBackupEnabled) return { ok: false, skipped: "disabled" };
  const cadenceDays = Math.max(1, Number(settings.autoBackupFrequencyDays) || 7);
  const lastRun = Number(settings.autoBackupLastRunAt) || 0;
  const now = Date.now();
  const dueAt = lastRun + cadenceDays * 24 * 60 * 60 * 1000;

  if (lastRun && now < dueAt) {
    return { ok: false, skipped: "not-due", dueAt: dueAt };
  }

  return createBackupSnapshot({ reason: "auto", download: false });
}

function parseDurationToMinutes(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return 0;

  if (/^\d+(\.\d+)?$/.test(raw)) {
    return Math.max(0, Number(raw));
  }

  const hhmmss = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hhmmss) {
    const h = Number(hhmmss[1]) || 0;
    const m = Number(hhmmss[2]) || 0;
    const s = Number(hhmmss[3]) || 0;
    return h * 60 + m + s / 60;
  }

  const iso = raw.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (iso) {
    const h = Number(iso[1]) || 0;
    const m = Number(iso[2]) || 0;
    const s = Number(iso[3]) || 0;
    return h * 60 + m + s / 60;
  }

  return 0;
}

function normalizeActivityDate(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return today();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return today();
  return localDateStr(new Date(parsed));
}

function activityRowValue(row, candidates) {
  const keys = Object.keys(row || {});
  const lowerMap = {};
  keys.forEach((key) => {
    lowerMap[String(key).toLowerCase()] = key;
  });
  for (let i = 0; i < candidates.length; i++) {
    const found = lowerMap[String(candidates[i]).toLowerCase()];
    if (found) return row[found];
  }
  return "";
}

function detectActivityImportSource(headers, filename) {
  const lowered = (headers || []).map((h) => String(h || "").toLowerCase());
  const fileName = String(filename || "").toLowerCase();
  if (fileName.includes("strava") || lowered.includes("activity type") || lowered.includes("moving time")) return "strava";
  if (fileName.includes("garmin") || lowered.includes("avg pace") || lowered.includes("activity type")) return "garmin";
  return "generic";
}

function importActivityRows(rows, source) {
  const cardios = loadData(KEYS.cardios);
  const workouts = loadData(KEYS.workouts);
  let imported = 0;

  (rows || []).forEach((row) => {
    const date = normalizeActivityDate(activityRowValue(row, ["Activity Date", "Date", "Start Time", "start_time"]));
    const name = String(activityRowValue(row, ["Activity Name", "Title", "Workout Name", "Name"]) || "Cardio Session").trim();
    const durationMin = parseDurationToMinutes(activityRowValue(row, ["Moving Time", "Elapsed Time", "Duration", "Time"]));

    const distanceRaw = Number(activityRowValue(row, ["Distance", "Distance (km)", "distance_km", "distance"]));
    const distanceKm = Number.isFinite(distanceRaw)
      ? (distanceRaw > 200 ? distanceRaw / 1000 : distanceRaw)
      : 0;
    const calories = Math.max(0, Number(activityRowValue(row, ["Calories", "Energy", "calories"])) || 0);

    if (!name || (!durationMin && !distanceKm && !calories)) return;

    const pace = distanceKm > 0 ? durationMin / distanceKm : 0;
    const workoutId = uid();
    const ts = Date.now();

    workouts.push({
      id: workoutId,
      timestamp: ts,
      date: date,
      name: name,
      type: "cardio",
      duration: Math.round(durationMin),
      caloriesBurned: Math.round(calories),
      notes: "Imported from " + source,
      exercises: [],
      protocolId: null,
    });

    cardios.push({
      id: uid(),
      timestamp: ts,
      date: date,
      workout_id: workoutId,
      name: name,
      duration_min: Number(durationMin.toFixed(2)),
      distance_km: Number(distanceKm.toFixed(3)),
      calories_burned: Math.round(calories),
      source: source,
      avg_pace_min_per_km: pace > 0 ? Number(pace.toFixed(2)) : 0,
      route_points: [],
    });

    imported += 1;
  });

  if (imported > 0) {
    saveData(KEYS.workouts, workouts);
    saveData(KEYS.cardios, cardios);
    if (typeof window.notifyDataChanged === "function") {
      window.notifyDataChanged({ source: "data", reason: "import-activity", count: imported });
    }
  }

  return imported;
}

function onActivityImportChosen(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const text = String((e && e.target && e.target.result) || "");
      const parsed = parseCsv(text);
      const source = detectActivityImportSource(parsed.headers || [], file.name || "");
      const count = importActivityRows(parsed.rows || [], source);
      if (count > 0) showToast("Imported " + count + " cardio rows from " + source, "success");
      else showToast("No usable activity rows found", "warning");
    } catch (err) {
      showToast("Activity import failed: " + err.message, "error");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function exportAllCsvFiles() {
  const entities = normalizeExportPayload();
  Object.keys(DATA_SCHEMAS).forEach((entity) => {
    const headers = DATA_SCHEMAS[entity];
    const rows = entities[entity] || [];
    const csv = toCsv(rows, headers);
    download(entity + ".csv", csv, "text/csv");
  });
  showToast("CSV exports downloaded");
}

function renderSchemaDocs() {
  const target = $("schemaDocs");
  if (!target) return;
  const blocks = Object.keys(DATA_SCHEMAS).map((entity) => {
    const fields = DATA_SCHEMAS[entity];
    return (
      '<div class="mb-12"><div style="font-weight:600;margin-bottom:6px">' + entity + ".csv</div>" +
      '<div class="schema-scroll"><table class="schema-table"><tr><th>field</th><th>description</th></tr>' +
      fields.map((f) => "<tr><td>" + f + "</td><td>" + (f === "id" ? "Primary key" : "Schema field") + "</td></tr>").join("") +
      "</table></div></div>"
    );
  });
  target.innerHTML = blocks.join("");
}

function ensureImportTypeOptions() {
  const sel = $("dataImportType");
  if (!sel) return;
  sel.innerHTML = Object.keys(DATA_SCHEMAS)
    .map((key) => '<option value="' + key + '">' + key + "</option>")
    .join("");
}

function renderImportMappingUI(headers, schemaFields) {
  const area = $("importMappingArea");
  if (!area) return;
  area.innerHTML =
    '<div class="card-title" style="margin-bottom:6px">Column mapping</div>' +
    schemaFields
      .map((field) => {
        const options = ['<option value="">(skip)</option>'].concat(headers.map((h) => '<option value="' + escAttr(h) + '">' + esc(h) + "</option>"));
        return '<div class="form-group"><label>' + field + '</label><select data-map-target="' + field + '">' + options.join("") + "</select></div>";
      })
      .join("") +
    '<button class="btn btn-primary btn-block" id="commitImportBtn">Commit Import</button>';
  schemaFields.forEach((field) => {
    const select = area.querySelector('[data-map-target="' + field + '"]');
    if (!select) return;

    const exact = headers.find((h) => h.toLowerCase() === field.toLowerCase());
    if (exact) {
      select.value = exact;
      return;
    }

    const aliases = (((IMPORT_FIELD_ALIASES[_pendingImportType] || {})[field]) || []).concat(field);
    const aliasMatch = getHeaderAliasMatch(headers, aliases);
    if (aliasMatch) select.value = aliasMatch;
  });
}

function normalizeImportHeaderKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const IMPORT_FIELD_ALIASES = {
  workouts: {
    name: ["workout_name", "workout name", "workoutname", "title", "activity_name", "activity name", "session_name"],
    date: ["workout_date", "workout date", "activity_date", "activity date", "start_date", "start date", "logged_date", "time", "timestamp"],
    type: ["workout_type", "workout type", "activity_type", "activity type"],
    duration_min: ["duration", "duration_minutes", "duration minutes", "moving_time", "moving time", "elapsed_time", "elapsed time", "minutes"],
    calories_burned: ["calories", "calories burned", "energy", "kcal"],
    timestamp: ["time", "logged_at", "logged at", "created_at", "created at", "start_time", "start time"],
  },
  food_logs: {
    food_name: ["name", "food", "item", "item_name", "item name"],
    meal: ["meal_type", "meal type", "meal_name", "meal name"],
    date: ["logged_date", "logged date", "entry_date", "entry date", "time", "timestamp"],
    timestamp: ["time", "logged_at", "logged at", "created_at", "created at"],
  },
};

function getHeaderAliasMatch(headers, candidates) {
  const normalizedCandidates = (candidates || []).map((item) => normalizeImportHeaderKey(item));
  return (headers || []).find((header) => {
    const key = normalizeImportHeaderKey(header);
    return normalizedCandidates.includes(key);
  });
}

function readImportValueWithAliases(raw, candidates) {
  if (!raw || typeof raw !== "object") return "";
  const keys = Object.keys(raw);
  const lookup = {};
  keys.forEach((key) => {
    lookup[normalizeImportHeaderKey(key)] = key;
  });

  for (let i = 0; i < (candidates || []).length; i++) {
    const actual = lookup[normalizeImportHeaderKey(candidates[i])];
    if (!actual) continue;
    const value = raw[actual];
    if (value == null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    return value;
  }
  return "";
}

function inferMappedFieldValue(entity, field, raw) {
  const aliases = (((IMPORT_FIELD_ALIASES[entity] || {})[field]) || []).concat(field);
  return readImportValueWithAliases(raw, aliases);
}

function coerceImportTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value || "").trim();
  if (!raw) return Date.now();

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) return numeric;
  }

  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return parsed;
  return Date.now();
}

function transformMappedRows(entity) {
  const schema = DATA_SCHEMAS[entity] || [];
  const map = {};
  const area = $("importMappingArea");
  schema.forEach((field) => {
    const sel = area ? area.querySelector('[data-map-target="' + field + '"]') : null;
    map[field] = sel ? sel.value : field;
  });
  return _pendingImportRows.map((raw) => {
    const out = {};
    schema.forEach((field) => {
      const src = map[field];
      let value = src ? raw[src] : "";
      if (value == null || (typeof value === "string" && !value.trim())) {
        value = inferMappedFieldValue(entity, field, raw);
      }
      out[field] = value;
    });
    if (!out.id) out.id = uid();
    if (!out.timestamp) out.timestamp = coerceImportTimestamp(inferMappedFieldValue(entity, "timestamp", raw));
    return out;
  });
}

function normalizeEntityRow(entity, row) {
  const out = { ...row };

  if (entity === "workouts") {
    out.name = String(out.name || inferMappedFieldValue(entity, "name", row) || "").trim();
    out.date = normalizeActivityDate(out.date || inferMappedFieldValue(entity, "date", row));
    if (!out.type) out.type = String(inferMappedFieldValue(entity, "type", row) || "strength").trim() || "strength";
    if (out.duration_min === "" || out.duration_min == null) {
      out.duration_min = inferMappedFieldValue(entity, "duration_min", row);
    }
    if (out.calories_burned === "" || out.calories_burned == null) {
      out.calories_burned = inferMappedFieldValue(entity, "calories_burned", row);
    }
  }

  if (entity === "food_logs") {
    const canonicalFoodName = String(out.food_name || out.name || inferMappedFieldValue(entity, "food_name", row) || "").trim();
    out.food_name = canonicalFoodName;
    out.name = canonicalFoodName;
    out.meal = String(out.meal || inferMappedFieldValue(entity, "meal", row) || "").trim();
    out.date = normalizeActivityDate(out.date || inferMappedFieldValue(entity, "date", row) || out.timestamp);
  }

  const numFields = {
    workouts: ["duration_min", "calories_burned"],
    strength_sets: ["set_index", "reps", "weight_kg", "target_reps", "target_weight", "target_rpe", "effective_load"],
    cardios: ["duration_min", "distance_km", "calories_burned"],
    measurements: ["weight", "body_fat", "waist", "chest", "arms", "legs"],
    food_items: ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"],
    food_logs: ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"],
    protocols: ["version"],
  };
  (numFields[entity] || []).forEach((field) => {
    if (out[field] === "" || out[field] == null) return;
    const parsed = Number(out[field]);
    out[field] = Number.isFinite(parsed) ? parsed : 0;
  });

  if (out.timestamp === "" || out.timestamp == null) {
    out.timestamp = coerceImportTimestamp(inferMappedFieldValue(entity, "timestamp", row));
  } else {
    out.timestamp = coerceImportTimestamp(out.timestamp);
  }

  if (["workouts", "strength_sets", "measurements", "food_logs", "day_plans"].includes(entity)) {
    out.date = normalizeActivityDate(out.date || out.timestamp);
  }

  if (entity === "workouts") {
    if (!out.name) out.name = "Workout " + out.date;
    out.duration = Number(out.duration_min) || Number(out.duration) || 0;
    out.caloriesBurned = Number(out.calories_burned) || Number(out.caloriesBurned) || 0;
    out.protocolId = out.protocolId || out.protocol_id || null;
    if (!Array.isArray(out.exercises)) out.exercises = [];
  }

  if (entity === "food_logs") {
    if (!out.food_name) out.food_name = "Imported Food";
    out.name = out.food_name;
    if (!out.meal) out.meal = "snack";
  }

  if (!out.id) out.id = uid();
  return out;
}

function validateEntityRows(entity, rows) {
  const errors = [];
  const valid = [];
  rows.forEach((row, idx) => {
    const normalized = normalizeEntityRow(entity, row);
    if (!normalized.id) {
      errors.push("Row " + (idx + 1) + ": missing id");
      return;
    }
    if (!normalized.timestamp) {
      errors.push("Row " + (idx + 1) + ": missing timestamp");
      return;
    }
    if (["workouts", "strength_sets", "measurements", "food_logs", "day_plans"].includes(entity) && !normalized.date) {
      errors.push("Row " + (idx + 1) + ": missing date");
      return;
    }
    if (entity === "strength_sets" && !normalized.exercise_name) {
      errors.push("Row " + (idx + 1) + ": missing exercise_name");
      return;
    }
    if (entity === "workouts" && !normalized.name) {
      errors.push("Row " + (idx + 1) + ": missing workout name");
      return;
    }
    valid.push(normalized);
  });
  return { valid, errors };
}

function commitImport(entity, mappedRows) {
  const key = ENTITY_STORAGE[entity];
  if (!key) return;
  const validation = validateEntityRows(entity, mappedRows || []);
  if (!validation.valid.length) {
    showToast("No valid records to import", "error");
    if ($("importSummary")) {
      $("importSummary").textContent = "Import failed. " + (validation.errors[0] || "No valid rows.");
    }
    return;
  }
  const mode = $("dataImportMode") ? $("dataImportMode").value : "merge";
  const existing = loadData(key);
  let next = validation.valid;
  if (mode === "merge") {
    const seen = new Set(existing.map((r) => r.id || (r.date + "|" + (r.name || ""))));
    next = existing.concat(validation.valid.filter((r) => !seen.has(r.id || (r.date + "|" + (r.name || "")))));
  }
  saveData(key, next);
  if (entity === "food_logs") {
    const normalized = next.map((f) => ({
      id: f.id,
      timestamp: coerceImportTimestamp(f.timestamp),
      date: normalizeActivityDate(f.date || f.timestamp),
      meal: String(f.meal || "snack").trim() || "snack",
      name: String(f.food_name || f.name || "Imported Food").trim() || "Imported Food",
      serving: f.serving,
      calories: Number(f.calories) || 0,
      protein: Number(f.protein) || 0,
      carbs: Number(f.carbs) || 0,
      fat: Number(f.fat) || 0,
      fiber: Number(f.fiber) || 0,
      sugar: Number(f.sugar) || 0,
      sodium: Number(f.sodium) || 0,
    }));
    saveData(KEYS.food, normalized);
  }
  const summary =
    "Imported " + validation.valid.length + " valid records into " + entity +
    " (" + mode + ")" +
    (validation.errors.length ? "; skipped " + validation.errors.length + " invalid rows." : ".");
  if ($("importSummary")) $("importSummary").textContent = summary;
  if (typeof window.notifyDataChanged === "function") {
    window.notifyDataChanged({ source: "data", reason: "commitImport", entity, mode });
  } else {
    refreshToday();
    refreshLog();
  }
  showToast(summary);
}

function onImportFileChosen(event) {
  const file = event.target.files[0];
  if (!file) return;
  const entity = $("dataImportType") ? $("dataImportType").value : "workouts";
  _pendingImportType = entity;
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = String(e.target.result || "");
    try {
      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(text);
        const rows = Array.isArray(parsed) ? parsed : parsed.entities && parsed.entities[entity] ? parsed.entities[entity] : [];
        if (!Array.isArray(rows)) throw new Error("JSON must be array or global export format");
        _pendingImportRows = rows;
        _pendingImportHeaders = Object.keys(rows[0] || {});
      } else {
        const csv = parseCsv(text);
        _pendingImportRows = csv.rows;
        _pendingImportHeaders = csv.headers;
      }
      renderImportMappingUI(_pendingImportHeaders, DATA_SCHEMAS[entity]);
      if ($("importSummary")) $("importSummary").textContent = "Loaded " + _pendingImportRows.length + " rows. Review mapping, then commit.";
    } catch (err) {
      showToast("Import parse failed: " + err.message, "error");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function parseProgramRows(rows, mapping) {
  const grouped = {};
  rows.forEach((row) => {
    const exercise = row[mapping.Exercise] || "";
    if (!exercise.trim()) return;
    const name = row[mapping.ProgramName] || "Imported Program";
    const week = row[mapping.Week] || "1";
    const day = row[mapping.Day] || "1";
    const key = name + "|W" + week + "|D" + day;
    if (!grouped[key]) {
      grouped[key] = {
        id: uid(),
        name: name + " - W" + week + "D" + day,
        description: "Imported from spreadsheet",
        exercises: [],
        plannedSets: [],
        version: 1,
        baseRoutineId: null,
        createdAt: Date.now(),
      };
    }
    const setIndex = Number(row[mapping.Set]) || grouped[key].plannedSets.length + 1;
    grouped[key].plannedSets.push({
      id: uid(),
      exerciseId: exercise.trim().toLowerCase(),
      exerciseName: exercise.trim(),
      setIndex,
      targetReps: row[mapping.Reps] ? Number(row[mapping.Reps]) : null,
      targetWeight: row[mapping.Weight] ? Number(row[mapping.Weight]) : null,
      targetRPE: row[mapping.RPE] ? Number(row[mapping.RPE]) : null,
    });
    grouped[key].exercises.push({
      name: exercise.trim(),
      sets: setIndex,
      reps: row[mapping.Reps] ? Number(row[mapping.Reps]) : 0,
      weight: row[mapping.Weight] ? Number(row[mapping.Weight]) : 0,
    });
  });
  return Object.values(grouped);
}

function renderProgramMappingUI(headers) {
  const box = $("programImportPreview");
  if (!box) return;
  box.innerHTML =
    '<div class="card-title" style="margin-bottom:6px">Program column mapping</div>' +
    PROGRAM_SCHEMA_FIELDS.map((field) => {
      const options = ['<option value="">(skip)</option>']
        .concat(headers.map((h) => '<option value="' + escAttr(h) + '">' + esc(h) + "</option>"));
      return '<div class="form-group"><label>' + field + '</label><select data-program-map="' + field + '">' + options.join("") + "</select></div>";
    }).join("") +
    '<button class="btn btn-outline btn-block" id="previewProgramImportBtn">Preview Program Import</button>';

  PROGRAM_SCHEMA_FIELDS.forEach((field) => {
    const exact = headers.find((h) => h.toLowerCase() === field.toLowerCase());
    const select = box.querySelector('[data-program-map="' + field + '"]');
    if (select && exact) select.value = exact;
  });
}

function getProgramMappingFromUI() {
  const map = {};
  PROGRAM_SCHEMA_FIELDS.forEach((field) => {
    const select = document.querySelector('[data-program-map="' + field + '"]');
    map[field] = select ? select.value : "";
  });
  return map;
}

function renderProgramPreview(routines) {
  const box = $("programImportPreview");
  if (!box) return;
  if (!routines.length) {
    box.innerHTML = '<div class="text-xs">No valid rows found in CSV.</div>';
    return;
  }
  box.innerHTML =
    '<div class="text-xs mb-8">Preview: ' + routines.length + " routines will be created.</div>" +
    routines
      .slice(0, 4)
      .map((r) => '<div class="text-xs">• ' + esc(r.name) + " (" + r.plannedSets.length + " planned sets)</div>")
      .join("") +
    '<button class="btn btn-primary btn-block mt-8" id="commitProgramImportBtn">Import Program</button>';
}

function handleProgramFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const csv = parseCsv(String(e.target.result || ""));
    _pendingProgramHeaders = csv.headers || [];
    _pendingImportRows = csv.rows || [];
    renderProgramMappingUI(_pendingProgramHeaders);
  };
  reader.readAsText(file);
  event.target.value = "";
}

function commitProgramImport() {
  if (!_pendingProgramRows.length) {
    showToast("No program preview available", "error");
    return;
  }
  const protocols = loadData(KEYS.protocols);
  const merged = protocols.concat(_pendingProgramRows);
  saveData(KEYS.protocols, merged);
  window._highlightRoutineIds = _pendingProgramRows.map((r) => r.id);
  showToast("Program imported: " + _pendingProgramRows.length + " routines");
  document.querySelector('[data-tab="protocols"]').click();
  refreshProtocols();
}

function printTemplate(kind) {
  const w = window.open("", "_blank");
  if (!w) return;
  const workoutRows = new Array(12)
    .fill(0)
    .map(() => "<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>")
    .join("");
  const nutritionRows = new Array(14)
    .fill(0)
    .map(() => "<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>")
    .join("");
  const body =
    kind === "workout"
      ? "<h2>FitOne Blank Workout Log</h2><table><tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Weight</th></tr>" + workoutRows + "</table>"
      : "<h2>FitOne Blank Nutrition Diary</h2><table><tr><th>Meal</th><th>Food</th><th>Calories</th><th>Protein</th><th>Carbs/Fat</th></tr>" + nutritionRows + "</table>";
  w.document.write(
    "<!doctype html><html><head><title>FitOne Template</title><style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #666;padding:8px;text-align:left}</style></head><body>" +
      body +
      "</body></html>"
  );
  w.document.close();
  w.focus();
  w.print();
}

function clearAllData() {
  const backup = {
    settings: { ...settings },
    onboardingComplete: localStorage.getItem("ft_onboarding_complete") || "",
    entities: {},
  };

  Object.keys(KEYS).forEach((alias) => {
    if (alias === "settings") return;
    backup.entities[alias] = loadData(KEYS[alias]);
  });

  showConfirmModal(
    "Delete All Data",
    "🗑️",
    "This will erase all fitness data and settings. You will have 5 seconds to undo.",
    () => {
      Promise.resolve(typeof window.clearEntityStore === "function" ? window.clearEntityStore() : false)
        .finally(() => {
          Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
          localStorage.removeItem("ft_onboarding_complete");
          updateSettings(defaultSettings());
          localStorage.setItem(KEYS.settings, JSON.stringify(settings));
          if (_loadSettingsUICallback) _loadSettingsUICallback();
          if (typeof window.notifyDataChanged === "function") {
            window.notifyDataChanged({ source: "data", reason: "clearAllData" });
          } else {
            refreshToday();
            refreshLog();
          }

          showUndoToast("All data deleted", () => {
            Object.keys(backup.entities).forEach((alias) => {
              const key = KEYS[alias];
              if (!key) return;
              saveData(key, backup.entities[alias]);
            });

            updateSettings({ ...backup.settings });
            localStorage.setItem(KEYS.settings, JSON.stringify(settings));

            if (backup.onboardingComplete) {
              localStorage.setItem("ft_onboarding_complete", backup.onboardingComplete);
            }

            if (_loadSettingsUICallback) _loadSettingsUICallback();
            if (typeof window.notifyDataChanged === "function") {
              window.notifyDataChanged({ source: "data", reason: "undoClearAllData" });
            } else {
              refreshToday();
              refreshLog();
            }
          });
        });
    }
  );
}

function initExportEvents() {
  ensureImportTypeOptions();
  renderSchemaDocs();
  const panel = $("panel-data");
  if (!panel) return;
  const importFile = $("importFile");
  const programFile = $("programImportFile");
  const activityFile = $("activityImportFile");

  panel.addEventListener("click", (e) => {
    const id = e.target && e.target.id;
    if (!id) return;
    if (id === "exportGlobalJsonBtn") exportGlobalJSON();
    else if (id === "exportGlobalCsvBtn") exportAllCsvFiles();
    else if (id === "importDataBtn" && importFile) importFile.click();
    else if (id === "importActivityCsvBtn" && activityFile) activityFile.click();
    else if (id === "deleteAllDataBtn") clearAllData();
    else if (id === "commitImportBtn") commitImport(_pendingImportType, transformMappedRows(_pendingImportType));
    else if (id === "programImportBtn" && programFile) programFile.click();
    else if (id === "previewProgramImportBtn") {
      const mapping = getProgramMappingFromUI();
      if (!mapping.Exercise) {
        showToast("Map at least the Exercise column", "error");
        return;
      }
      _pendingProgramRows = parseProgramRows(_pendingImportRows, mapping);
      renderProgramPreview(_pendingProgramRows);
    }
    else if (id === "commitProgramImportBtn") commitProgramImport();
    else if (id === "printWorkoutTemplateBtn") printTemplate("workout");
    else if (id === "printNutritionTemplateBtn") printTemplate("nutrition");
  });

  if (importFile) importFile.addEventListener("change", onImportFileChosen);
  if (programFile) programFile.addEventListener("change", handleProgramFile);
  if (activityFile) activityFile.addEventListener("change", onActivityImportChosen);
}

window.createBackupSnapshot = createBackupSnapshot;
window.runScheduledBackupIfDue = runScheduledBackupIfDue;
