// Preferences must not prevent play when storage is blocked or full.
export function readPreference(key, fallback = '') {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
export function writePreference(key, value) {
  try { localStorage.setItem(key, String(value)); } catch { /* Play remains available. */ }
}
