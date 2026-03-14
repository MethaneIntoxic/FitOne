// Future sync hooks (local-only for now)
function listPendingSyncOperations() {
  return [];
}

function enqueueSyncOperation() {
  // Intentionally a no-op until cloud sync is implemented.
}

function performSyncNow() {
  // Intentionally a no-op until cloud sync is implemented.
  return Promise.resolve({ synced: false, reason: "local-only-mode" });
}
