(function () {
  var STORAGE_KEY = 'mergeGunFactorySave';

  function saveGame(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadGame() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function markExitTimestamp() {
    localStorage.setItem(STORAGE_KEY + '_exitTs', String(Date.now()));
  }

  function getOfflineSeconds(maxHours) {
    var limitH = maxHours || 3;
    var raw = localStorage.getItem(STORAGE_KEY + '_exitTs');
    if (!raw) return 0;
    var diffSec = Math.max(0, (Date.now() - Number(raw)) / 1000);
    return Math.min(diffSec, limitH * 3600);
  }

  window.MGF = window.MGF || {};
  window.MGF.storage = { saveGame: saveGame, loadGame: loadGame, markExitTimestamp: markExitTimestamp, getOfflineSeconds: getOfflineSeconds };
})();
