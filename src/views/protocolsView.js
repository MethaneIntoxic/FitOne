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
    '<div class="modal-title">New Protocol <button class="modal-close" id="protoModalClose" aria-label="Close modal">×</button></div>' +
    '<div class="form-group"><label>Protocol Name</label><input type="text" id="protoName" placeholder="e.g., PPL Push Day"></div>' +
    '<div class="form-group"><label>Description</label><textarea id="protoDesc" placeholder="Describe this workout..."></textarea></div>' +
    '<div class="flex-between mb-8 mt-12"><span class="card-title" style="margin-bottom:0">Exercises</span><button class="btn btn-outline btn-sm" id="protoAddEx">+ Add</button></div>' +
    '<div id="protoExercises"></div>' +
    '<button class="btn btn-primary btn-block mt-12" id="protoSaveBtn">Save Protocol</button>' +
    "</div></div>";
  window._protoExCount = 0;

  $("protoModalOverlay").addEventListener("click", (e) => {
    if (e.target === $("protoModalOverlay")) closeModal();
  });
  $("protoModalClose").addEventListener("click", closeModal);
  $("protoAddEx").addEventListener("click", addProtoExercise);
  $("protoSaveBtn").addEventListener("click", saveProtocol);

  setTimeout(() => { if ($("protoName")) $("protoName").focus(); }, 200);
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
  row.querySelector("[data-remove-row]").addEventListener("click", () => row.remove());
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
  showToast("Protocol saved! 📋");
}

function deleteProtocol(id) {
  showConfirmModal("Delete Protocol", "📋", "Remove this workout protocol? This cannot be undone.", () => {
    const data = loadData(KEYS.protocols).filter((p) => p.id !== id);
    saveData(KEYS.protocols, data);
    refreshProtocols();
    showToast("Protocol deleted");
  });
}

function useProtocol(id) {
  const proto = loadData(KEYS.protocols).find((p) => p.id === id);
  if (!proto) return;
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  document.querySelector('[data-tab="log"]').classList.add("active");
  $("panel-log").classList.add("active");
  document.querySelectorAll("#panel-log .sub-tab").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll("#panel-log .sub-panel").forEach((p) => p.classList.remove("active"));
  document.querySelector('[data-subtab="log-workout"]').classList.add("active");
  $("log-workout").classList.add("active");
  $("fabBtn").classList.add("fab-hidden");

  $("workoutName").value = proto.name;
  $("workoutProtocol").value = proto.id;
  $("exerciseRows").innerHTML = "";
  let exerciseRowCount = 0;
  proto.exercises.forEach((ex) => {
    exerciseRowCount++;
    const n = exerciseRowCount;
    const row = document.createElement("div");
    row.className = "stat-row stat-row-dense mb-8";
    row.id = "exrow_" + n;
    const planned = (proto.plannedSets || []).find((ps) => ps.exerciseName === ex.name) || {};
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
    $("exerciseRows").appendChild(row);
    row.querySelector("[data-remove-row]").addEventListener("click", () => row.remove());
  });
  setExerciseRowCount(exerciseRowCount);
}

// ========== EVENT DELEGATION ==========
function initProtocolEvents() {
  const panel = $("panel-protocols");
  if (!panel) return;

  panel.addEventListener("click", (e) => {
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
}
