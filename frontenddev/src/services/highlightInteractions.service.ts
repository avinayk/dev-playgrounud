// frontend/src/services/highlightInteractions.service.ts
const LIKED_KEY = 'playground_liked_highlights';
const VIEWED_KEY = 'playground_viewed_highlights';

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}

function writeSet(key: string, set: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch {}
}

export function hasLikedLocal(clipId: string): boolean {
  return readSet(LIKED_KEY).has(clipId);
}
export function markLikedLocal(clipId: string) {
  const s = readSet(LIKED_KEY); s.add(clipId); writeSet(LIKED_KEY, s);
}
export function unmarkLikedLocal(clipId: string) {
  const s = readSet(LIKED_KEY); s.delete(clipId); writeSet(LIKED_KEY, s);
}
export function hasViewedLocal(clipId: string): boolean {
  return readSet(VIEWED_KEY).has(clipId);
}
export function markViewedLocal(clipId: string) {
  const s = readSet(VIEWED_KEY); s.add(clipId); writeSet(VIEWED_KEY, s);
}
export function getAllLikedIds(): string[] {
  return [...readSet(LIKED_KEY)];
}