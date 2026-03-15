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
  food_items: ["id", "timestamp", "name", "serving", "calories", "protein", "carbs", "fat"],
  food_logs: ["id", "timestamp", "date", "meal", "food_name", "serving", "calories", "protein", "carbs", "fat"],
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
    const exact = headers.find((h) => h.toLowerCase() === field.toLowerCase());
    if (exact) {
      const select = area.querySelector('[data-map-target="' + field + '"]');
      if (select) select.value = exact;
    }
  });
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
      out[field] = src ? raw[src] : "";
    });
    if (!out.id) out.id = uid();
    if (!out.timestamp) out.timestamp = new Date().toISOString();
    return out;
  });
}

function normalizeEntityRow(entity, row) {
  const out = { ...row };
  const numFields = {
    workouts: ["duration_min", "calories_burned"],
    strength_sets: ["set_index", "reps", "weight_kg", "target_reps", "target_weight", "target_rpe", "effective_load"],
    cardios: ["duration_min", "distance_km", "calories_burned"],
    measurements: ["weight", "body_fat", "waist", "chest", "arms", "legs"],
    food_items: ["calories", "protein", "carbs", "fat"],
    food_logs: ["calories", "protein", "carbs", "fat"],
    protocols: ["version"],
  };
  (numFields[entity] || []).forEach((field) => {
    if (out[field] === "" || out[field] == null) return;
    out[field] = Number(out[field]);
  });
  if (!out.id) out.id = uid();
  if (!out.timestamp) out.timestamp = new Date().toISOString();
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
      timestamp: Number(f.timestamp) || Date.now(),
      date: f.date,
      meal: f.meal,
      name: f.food_name,
      serving: f.serving,
      calories: Number(f.calories) || 0,
      protein: Number(f.protein) || 0,
      carbs: Number(f.carbs) || 0,
      fat: Number(f.fat) || 0,
    }));
    saveData(KEYS.food, normalized);
  }
  const summary =
    "Imported " + validation.valid.length + " valid records into " + entity +
    " (" + mode + ")" +
    (validation.errors.length ? "; skipped " + validation.errors.length + " invalid rows." : ".");
  if ($("importSummary")) $("importSummary").textContent = summary;
  refreshToday();
  refreshLog();
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
  showConfirmModal(
    "Delete All Data",
    "🗑️",
    "This will permanently erase ALL your fitness data and settings.",
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

function initExportEvents() {
  ensureImportTypeOptions();
  renderSchemaDocs();
  const panel = $("panel-data");
  if (!panel) return;
  const importFile = $("importFile");
  const programFile = $("programImportFile");

  panel.addEventListener("click", (e) => {
    const id = e.target && e.target.id;
    if (!id) return;
    if (id === "exportGlobalJsonBtn") exportGlobalJSON();
    else if (id === "exportGlobalCsvBtn") exportAllCsvFiles();
    else if (id === "importDataBtn" && importFile) importFile.click();
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
}
