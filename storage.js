const STORAGE_KEY = 'mergeGunFactorySave';

export function saveGame(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadGame() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function markExitTimestamp() {
  localStorage.setItem(`${STORAGE_KEY}_exitTs`, `${Date.now()}`);
}

export function getOfflineSeconds(maxHours = 3) {
  const raw = localStorage.getItem(`${STORAGE_KEY}_exitTs`);
  if (!raw) return 0;
  const diffSec = Math.max(0, (Date.now() - Number(raw)) / 1000);
  return Math.min(diffSec, maxHours * 3600);
}
