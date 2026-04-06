// ========== PROTOCOLS VIEW ==========


// ========== REFRESH ==========
function refreshProtocols() {
  const protocols = loadData(KEYS.protocols);
  if (!protocols.length) {
    $("protocolList").innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">No protocols yet</div><button class="btn btn-primary btn-sm" data-action="newProtocol">Create your first protocol</button></div>';
    return;
  }
  $("protocolList").innerHTML = protocols
    .map(
      (p) =>
        '<div class="card"' + (window._highlightRoutineIds && window._highlightRoutineIds.includes(p.id) ? ' style="border-color:var(--accent)"' : "") + '><div class="flex-between mb-8"><span style="font-weight:600;font-size:1rem">' +
        esc(p.name) +
        ' <span class="text-xs">v' + (p.version || 1) + "</span></span><div><button class=\"btn btn-outline btn-sm\" data-use-protocol=\"" + p.id + '">Use</button> <button class="btn btn-outline btn-sm" data-delete-protocol="' + p.id + '">✕</button></div></div><div class="text-xs mb-8">' +
        esc(p.description || "") + (p.baseRoutineId ? " • variant" : "") + "</div>" +
        (p.exercises || [])
          .map(
            (e) =>
              '<div class="list-item" style="padding:6px 0"><div class="list-item-main"><div class="list-item-title text-sm">' +
              esc(e.name) + '</div></div><div class="list-item-right text-xs">' +
               e.sets + "×" + e.reps + (e.weight ? " @ " + e.weight + settings.weightUnit : "") + "</div></div>"
          )
          .join("") +
        '<div class="text-xs mt-8">Planned sets: ' + ((p.plannedSets || []).length || 0) + "</div></div>"
    )
    .join("");
}

// ========== MODAL ==========
function showProtocolModal() {
  $("modalContainer").innerHTML =
    '<div class="modal-overlay" id="protoModalOverlay">' +
    '<div class="modal" role="dialog" aria-label="New Protocol">' +
    '<div class="modal-drag-handle"></div>' +
    '<div class="modal-title"><span class="proto-modal-kicker">Routine Builder</span><button class="modal-close" id="protoModalClose" aria-label="Close modal">×</button></div>' +
    '<div class="proto-title-field">' +
    '<label class="proto-title-label" for="protoName">Routine Title</label>' +
    '<input class="proto-title-input" type="text" id="protoName" placeholder="UNTITLED SEQUENCE">' +
    '</div>' +
    '<div class="form-group"><label>Description</label><textarea id="protoDesc" placeholder="Describe this workout..."></textarea></div>' +
    '<div class="flex-between mb-8 mt-12"><span class="card-title" style="margin-bottom:0">Exercises</span><button class="btn btn-outline btn-sm" id="protoAddEx">+ Add</button></div>' +
    '<div id="protoExercises"></div>' +
    '<div id="protoSuggestedModules"></div>' +
    '<button class="btn btn-primary btn-block mt-12" id="protoSaveBtn">Save Protocol</button>' +
    "</div></div>";
  window._protoExCount = 0;

  $("protoModalOverlay").addEventListener("click", (e) => {
    if (e.target === $("protoModalOverlay")) closeModal();
  });
  $("protoModalClose").addEventListener("click", closeModal);
  $("protoAddEx").addEventListener("click", addProtoExercise);
  $("protoSaveBtn").addEventListener("click", saveProtocol);
  renderProtocolBuilderEmptyState();
  renderSuggestedModules();

  const modalRoot = $("modalContainer");
  if (modalRoot && !modalRoot.dataset.protoModuleBound) {
    modalRoot.addEventListener("click", onProtocolModalClick);
    modalRoot.dataset.protoModuleBound = "true";
  }

  setTimeout(() => { if ($("protoName")) $("protoName").focus(); }, 200);
}

function onProtocolModalClick(e) {
  const moduleCard = e.target.closest("[data-proto-module]");
  if (!moduleCard) return;
  const moduleId = moduleCard.dataset.protoModule;
  if (moduleId) insertSuggestedModule(moduleId);
}

function renderProtocolBuilderEmptyState() {
  const container = $("protoExercises");
  if (!container) return;

  const hasExerciseRows = container.querySelector(".stat-row");
  const existingEmpty = container.querySelector(".proto-empty-state");

  if (!hasExerciseRows && !existingEmpty) {
    const empty = document.createElement("div");
    empty.className = "proto-empty-state";
    empty.innerHTML =
      '<span class="material-symbols-outlined proto-empty-icon" aria-hidden="true">fitness_center</span>' +
      '<h4 class="proto-empty-title">Build Your Arsenal</h4>' +
      '<p class="proto-empty-desc">Design a precision workout template tailored for peak performance. Start by adding your first exercise below.</p>';
    container.appendChild(empty);
    return;
  }

  if (hasExerciseRows && existingEmpty) {
    existingEmpty.remove();
  }
}

function renderSuggestedModules() {
  const container = $("protoSuggestedModules");
  if (!container) return;
  const modules = window.STARTER_MODULES || [];
  if (!modules.length) {
    container.innerHTML = "";
    return;
  }

  const cards = modules.slice(0, 3).map(function (m, idx) {
    const order = String(idx + 1).padStart(2, "0");
    return (
      '<button class="proto-module-card" data-proto-module="' + escAttr(m.id) + '" type="button" aria-label="Insert ' + escAttr(m.name || "module") + ' module">' +
        '<div class="proto-module-head"><span class="proto-module-order">' + order + '</span><span class="material-symbols-outlined proto-module-icon">' + esc(m.icon || "fitness_center") + '</span></div>' +
        '<div class="proto-module-name">' + esc((m.name || "Module").toUpperCase()) + '</div>' +
        '<div class="proto-module-desc">' + esc(m.description || "") + '</div>' +
      "</button>"
    );
  }).join("");

  container.innerHTML =
    '<div class="proto-modules-wrap">' +
      '<div class="proto-modules-title">Suggested Modules</div>' +
      '<div class="proto-modules-grid">' + cards + '</div>' +
    "</div>";
}

function insertSuggestedModule(moduleId) {
  const modules = window.STARTER_MODULES || [];
  const mod = modules.find(function (m) { return m.id === moduleId; });
  if (!mod || !Array.isArray(mod.exercises) || !mod.exercises.length) return;

  mod.exercises.forEach(function (ex) {
    addProtoExercise();
    const idx = window._protoExCount;
    const n = $("pexname_" + idx);
    const s = $("pexsets_" + idx);
    const r = $("pexreps_" + idx);
    const w = $("pexwt_" + idx);
    const p = $("pexrpe_" + idx);
    if (n) n.value = ex.name || "";
    if (s) s.value = ex.sets || "";
    if (r) r.value = ex.reps || "";
    if (w) w.value = ex.weight || "";
    if (p && ex.rpe != null) p.value = ex.rpe;
  });

  showToast((mod.name || "Module") + " inserted");
}

function addProtoExercise() {
  window._protoExCount++;
  const n = window._protoExCount;
  const row = document.createElement("div");
  row.className = "stat-row stat-row-dense mb-8";
  row.id = "pex_" + n;
  row.innerHTML =
    '<div class="form-group dense-col-6"><input type="text" placeholder="Exercise" id="pexname_' + n + '"></div>' +
    '<div class="form-group dense-col-2"><input type="number" placeholder="Sets" id="pexsets_' + n + '"></div>' +
    '<div class="form-group dense-col-2"><input type="number" placeholder="Reps" id="pexreps_' + n + '"></div>' +
      '<div class="form-group dense-col-2"><input type="number" placeholder="Wt" id="pexwt_' + n + '"></div>' +
      '<div class="form-group dense-col-2"><input type="number" placeholder="RPE" id="pexrpe_' + n + '"></div>' +
      '<button class="btn btn-outline btn-sm dense-col-2" data-remove-row>✕</button>';
  $("protoExercises").appendChild(row);
  row.querySelector("[data-remove-row]").addEventListener("click", () => {
    row.remove();
    renderProtocolBuilderEmptyState();
  });
  renderProtocolBuilderEmptyState();
}

function saveProtocol() {
  const name = $("protoName").value.trim();
  if (!name) { showToast("Enter a protocol name", "error"); return; }
  const exercises = [];
  const plannedSets = [];
  for (let i = 1; i <= window._protoExCount; i++) {
    const el = $("pexname_" + i);
    if (!el) continue;
    const n = el.value.trim();
    if (!n) continue;
    const sets = parseInt($("pexsets_" + i).value) || 0;
    const reps = parseInt($("pexreps_" + i).value) || 0;
    const weight = parseFloat($("pexwt_" + i).value) || 0;
    const rpe = parseFloat($("pexrpe_" + i).value);
    exercises.push({
      name: n,
      sets,
      reps,
      weight,
    });
    plannedSets.push({
      id: uid(),
      exerciseId: n.toLowerCase(),
      exerciseName: n,
      setIndex: i,
      targetReps: reps || null,
      targetWeight: weight || null,
      targetRPE: Number.isFinite(rpe) ? rpe : null,
    });
  }
  const proto = {
    id: uid(), name,
    description: $("protoDesc").value.trim(),
    exercises,
    plannedSets,
    createdAt: Date.now(),
    version: 1,
    baseRoutineId: null,
  };
  const data = loadData(KEYS.protocols);
  data.push(proto);
  saveData(KEYS.protocols, data);
  closeModal();
  refreshProtocols();
  if (typeof window.notifyDataChanged === "function") {
    window.notifyDataChanged({ source: "protocols", reason: "saveProtocol" });
  }
  showToast("Protocol saved! 📋");
}

function deleteProtocol(id) {
  showConfirmModal("Delete Protocol", "📋", "Remove this workout protocol? This cannot be undone.", () => {
    const data = loadData(KEYS.protocols).filter((p) => p.id !== id);
    saveData(KEYS.protocols, data);
    refreshProtocols();
    if (typeof window.notifyDataChanged === "function") {
      window.notifyDataChanged({ source: "protocols", reason: "deleteProtocol" });
    }
    showToast("Protocol deleted");
  });
}

// ========== WORKOUT LIBRARY (W4) ==========
let libraryFilter = "ALL";
let librarySearchQuery = "";

function refreshLibrary() {
  const userProtos = loadData(KEYS.protocols).map(p => ({ ...p, isUser: true }));
  const starterProtos = (window.STARTER_ROUTINES || []).map(p => ({ ...p, isUser: false }));
  
  let allRoutines = [...userProtos, ...starterProtos];

  // W4.2 Search
  if (librarySearchQuery) {
    const q = librarySearchQuery.toLowerCase();
    allRoutines = allRoutines.filter(r => 
      r.name.toLowerCase().includes(q) || 
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q))
    );
  }

  // W4.3 Filters
  if (libraryFilter !== "ALL") {
    if (libraryFilter === "SAVED") {
      allRoutines = allRoutines.filter(r => r.isUser);
    } else {
      allRoutines = allRoutines.filter(r => (r.category || "").toUpperCase() === libraryFilter);
    }
  }

  renderFeaturedRoutine([...userProtos, ...starterProtos]);
  renderLibraryCards(allRoutines);
}

function renderFeaturedRoutine(all) {
  const container = $("featuredRoutineContainer");
  if (!container) return;
  
  // Pick one featured (prefer starters for discovery)
  const featured = all.find(r => r.isStarter) || all[0];
  if (!featured) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="featured-routine-card" onclick="useProtocol('${featured.id}')">
      <div class="featured-badge">PREMIUM ROUTINE</div>
      <div class="featured-routine-name">${esc(featured.name)}</div>
      <div class="featured-routine-metadata">
        <span><span class="material-symbols-outlined">schedule</span> ${featured.duration || 45} MIN</span>
        <span><span class="material-symbols-outlined">fitness_center</span> ${featured.category || "Full Body"}</span>
        <span><span class="material-symbols-outlined">trending_up</span> ${featured.level || "Any"}</span>
      </div>
      <button class="btn btn-primary btn-block mt-8">START NOW ▶</button>
    </div>
  `;
}

function renderLibraryCards(routines) {
  const list = $("libraryRoutineList");
  if (!list) return;

  if (routines.length === 0) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">No routines found matching your pulse</div></div>';
    return;
  }

  list.innerHTML = '<div class="routine-list-grid">' + routines.map(r => `
    <div class="routine-card" data-open-routine="${escAttr(r.id)}">
      <div class="routine-icon-wrap">
        <span class="material-symbols-outlined">${r.category === "HIIT" ? "bolt" : "fitness_center"}</span>
      </div>
      <div class="routine-info">
        <div class="routine-name">${esc(r.name)}</div>
        <div class="routine-desc">${esc(r.description || "Experimental performance protocol")}</div>
        <div class="routine-tags">
          <span class="routine-tag level">${esc(r.level || "Any")}</span>
          <span class="routine-tag category">${esc(r.category || "General")}</span>
        </div>
      </div>
      <span class="material-symbols-outlined" style="color:var(--text2)">chevron_right</span>
    </div>
  `).join("") + '</div>';
}

function getRoutineById(id) {
  let routine = loadData(KEYS.protocols).find((p) => p.id === id);
  if (!routine && window.STARTER_ROUTINES) {
    routine = window.STARTER_ROUTINES.find((r) => r.id === id);
  }
  return routine || null;
}

function openRoutineDetail(id) {
  const routine = getRoutineById(id);
  if (!routine) return;

  const exercises = routine.exercises || [];
  const html =
    '<div class="modal-overlay" id="routineDetailOverlay">' +
    '<div class="modal routine-detail-modal" role="dialog" aria-label="Routine Detail">' +
    '<div class="routine-detail-head">' +
    '<button class="routine-detail-back" id="routineDetailBack" aria-label="Back">' +
    '<span class="material-symbols-outlined">arrow_back</span>' +
    '</button>' +
    '<div>' +
    '<div class="routine-detail-kicker">ROUTINE DETAIL</div>' +
    '<h3 class="routine-detail-name">' + esc(routine.name) + '</h3>' +
    '</div>' +
    '</div>' +
    '<p class="routine-detail-desc">' + esc(routine.description || "No description available.") + '</p>' +
    '<div class="routine-detail-meta">' +
    '<span>' + esc(String(routine.duration || 45)) + ' MIN</span>' +
    '<span>' + esc(routine.level || "Any") + '</span>' +
    '<span>' + esc(routine.category || "General") + '</span>' +
    '</div>' +
    '<div class="routine-detail-ex-list">' +
    exercises.map((ex) =>
      '<button class="routine-detail-ex-item" data-open-exercise-detail="' + escAttr(ex.name || "") + '">' +
      '<span class="name">' + esc(ex.name || "Exercise") + '</span>' +
      '<span class="meta">' + esc(String(ex.sets || 0)) + 'x' + esc(String(ex.reps || 0)) + '</span>' +
      '</button>'
    ).join("") +
    '</div>' +
    '<button class="btn btn-primary btn-block mt-12" data-start-routine="' + escAttr(routine.id) + '">START NOW ▶</button>' +
    '</div>' +
    '</div>';

  $("modalContainer").innerHTML = html;
  const overlay = $("routineDetailOverlay");
  const back = $("routineDetailBack");

  if (back) back.addEventListener("click", closeModal);
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
      const exBtn = e.target.closest("[data-open-exercise-detail]");
      if (exBtn) {
        const exName = exBtn.dataset.openExerciseDetail;
        if (typeof showExerciseDetailModal === "function") showExerciseDetailModal(exName);
        return;
      }
      const startBtn = e.target.closest("[data-start-routine]");
      if (startBtn) {
        closeModal();
        useProtocol(startBtn.dataset.startRoutine);
      }
    });
  }
}

function initLibraryEvents() {
  const searchInput = $("searchExercises");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      librarySearchQuery = e.target.value.trim();
      refreshLibrary();
    });
  }

  const filterContainer = $("libraryFilters");
  if (filterContainer) {
    filterContainer.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;
      filterContainer.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      libraryFilter = chip.dataset.filter;
      refreshLibrary();
    });
  }
}

// ========== EVENT DELEGATION ==========
function initProtocolEvents() {
  const panel = $("panel-protocols");
  if (!panel) return;

  panel.addEventListener("click", (e) => {
    const openRoutine = e.target.closest("[data-open-routine]");
    if (openRoutine) { openRoutineDetail(openRoutine.dataset.openRoutine); return; }
    const useBtn = e.target.closest("[data-use-protocol]");
    if (useBtn) { useProtocol(useBtn.dataset.useProtocol); return; }
    const delBtn = e.target.closest("[data-delete-protocol]");
    if (delBtn) { deleteProtocol(delBtn.dataset.deleteProtocol); return; }
    const actionBtn = e.target.closest("[data-action]");
    if (actionBtn && (actionBtn.dataset.action === "newProtocol" || actionBtn.dataset.action === "showProtocolModal")) {
      showProtocolModal();
      return;
    }
  });

  initLibraryEvents();
  refreshLibrary();
}

function useProtocol(id) {
  // Support both user protocols and starter routines
  let proto = loadData(KEYS.protocols).find((p) => p.id === id);
  if (!proto && window.STARTER_ROUTINES) {
    proto = window.STARTER_ROUTINES.find(r => r.id === id);
  }
  if (!proto) return;
  
  if (typeof window.activateMainTab === "function") {
    window.activateMainTab("log", { scroll: false });
  } else {
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    const logBtn = document.querySelector('[data-tab="log"]');
    if (logBtn) {
      logBtn.classList.add("active");
      logBtn.setAttribute("aria-selected", "true");
    }
    const logPanel = $("panel-log");
    if (logPanel) logPanel.classList.add("active");
  }
  document.querySelectorAll("#panel-log .sub-tab").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll("#panel-log .sub-panel").forEach((p) => p.classList.remove("active"));
  document.querySelector('[data-subtab="log-workout"]').classList.add("active");
  $("log-workout").classList.add("active");
  $("fabBtn").classList.add("fab-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });

  $("workoutName").value = proto.name;
  $("workoutProtocol").value = proto.id;
  $("exerciseRows").innerHTML = "";
  let rowIdx = 0;
  proto.exercises.forEach((ex) => {
    rowIdx++;
    const n = rowIdx;
    const row = document.createElement("div");
    row.className = "stat-row stat-row-dense mb-8";
    row.id = "exrow_" + n;
    const planned = (proto.plannedSets || []).find((ps) => ps.exerciseName === ex.name) || {};
    if (typeof getExerciseRowHtml === "function") {
      row.innerHTML = getExerciseRowHtml(n, ex, planned);
    } else {
      row.innerHTML =
        '<div class="form-group dense-col-6"><input type="text" placeholder="Exercise name" id="exname_' + n + '" value="' + escAttr(ex.name) + '"></div>' +
        '<div class="form-group dense-col-2"><input type="number" placeholder="Sets" id="exsets_' + n + '" value="' + (ex.sets || "") + '"></div>' +
        '<div class="form-group dense-col-2"><input type="number" placeholder="Reps" id="exreps_' + n + '" value="' + (ex.reps || "") + '"></div>' +
        '<div class="form-group dense-col-2"><input type="number" placeholder="Wt" id="exwt_' + n + '" value="' + (ex.weight || "") + '"></div>' +
        '<div class="form-group dense-col-2"><input type="number" placeholder="RPE" id="exrpe_' + n + '" value="' + (planned.targetRPE || "") + '"></div>' +
        '<div class="form-group dense-col-2"><input type="number" placeholder="T.Reps" id="extargetreps_' + n + '" value="' + (planned.targetReps || "") + '"></div>' +
        '<div class="form-group dense-col-2"><input type="number" placeholder="T.Wt" id="extargetwt_' + n + '" value="' + (planned.targetWeight || "") + '"></div>' +
        '<div class="form-group dense-col-2"><input type="number" placeholder="T.RPE" id="extargetrpe_' + n + '" value="' + (planned.targetRPE || "") + '"></div>' +
        '<div class="form-group dense-col-3" style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="exassist_' + n + '" style="width:auto"><label for="exassist_' + n + '" class="text-xs">Assisted</label></div>' +
        '<div class="form-group dense-col-3"><select id="exgym_' + n + '"><option value="">Gym (optional)</option>' + getGymOptions() + '</select></div>' +
        '<div class="form-group dense-col-3"><select id="exsetup_' + n + '"><option value="">Last setup suggestion</option></select></div>' +
        '<div class="form-group dense-col-6"><input type="text" placeholder="Machine setup notes" id="exsetupnotes_' + n + '"></div>' +
        '<button class="btn btn-outline btn-sm dense-col-2" data-remove-row>✕</button>';
    }
    $("exerciseRows").appendChild(row);
    row.querySelector("[data-remove-row]").addEventListener("click", () => row.remove());
    if (typeof bindExerciseInputShortcuts === "function") bindExerciseInputShortcuts(row);
    if (typeof bindExerciseRowAdvancedToggle === "function") bindExerciseRowAdvancedToggle(row, n);
    if (typeof bindExerciseRowSetupHandlers === "function") bindExerciseRowSetupHandlers(n);
  });

}
