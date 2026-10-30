// Keeps localStorage and progress/progress.json in step. The newer `updatedAt` wins on load.
// On a static host (no dev server) the API 404s and we silently stay on localStorage.
import { useStore, progressSnapshot, type Progress } from './store';

export type SyncStatus = 'file' | 'local-only' | 'saving' | 'error';
let status: SyncStatus = 'local-only';
const listeners = new Set<(s: SyncStatus) => void>();
const setStatus = (s: SyncStatus) => { status = s; listeners.forEach((l) => l(s)); };
export const getSyncStatus = () => status;
export const onSyncStatus = (fn: (s: SyncStatus) => void) => { listeners.add(fn); return () => listeners.delete(fn); };

let fileAvailable = false;
let timer: ReturnType<typeof setTimeout> | undefined;

async function save() {
  if (!fileAvailable) return;
  setStatus('saving');
  try {
    const r = await fetch('/api/progress', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(progressSnapshot()) });
    setStatus(r.ok ? 'file' : 'error');
  } catch {
    setStatus('error');
  }
}

export async function initSync() {
  // Another tab saved: pick up its state instead of overwriting it later.
  window.addEventListener('storage', (e) => { if (e.key === 'cloud-gauntlet') void useStore.persist.rehydrate(); });
  try {
    const r = await fetch('/api/progress');
    const type = r.headers.get('content-type') ?? '';
    if (r.status === 404 && type.includes('json')) fileAvailable = true; // dev server, no file yet
    else if (r.ok && type.includes('json')) {
      fileAvailable = true;
      const file = (await r.json()) as Progress;
      if (file?.version === 1 && (file.updatedAt ?? 0) > useStore.getState().updatedAt) useStore.getState().replaceAll(file);
    }
  } catch { /* offline/static: localStorage only */ }
  setStatus(fileAvailable ? 'file' : 'local-only');
  if (fileAvailable && useStore.getState().updatedAt) void save();
  useStore.subscribe((s, prev) => {
    if (s.updatedAt === prev.updatedAt) return;
    // Throttle (not debounce): the console's sim clock changes state every 2 s.
    if (timer) return;
    timer = setTimeout(() => { timer = undefined; void save(); }, 2500);
  });
}

export function exportProgress() {
  const blob = new Blob([JSON.stringify(progressSnapshot(), null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cloud-gauntlet-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importProgress(file: File) {
  const data = JSON.parse(await file.text()) as Progress;
  if (data?.version !== 1 || !data.profile) throw new Error('That file is not a Cloud Gauntlet progress file.');
  useStore.getState().replaceAll({ ...data, updatedAt: Date.now() });
}
