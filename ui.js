(function () {
  function UI() {
    this.moneyEl = document.getElementById('money');
    this.waveEl = document.getElementById('wave');
    this.livesEl = document.getElementById('lives');
    this.buyCostEl = document.getElementById('buyCost');
    this.incomeCostEl = document.getElementById('incomeCost');
    this.fireCostEl = document.getElementById('fireCost');
    this.startLevelCostEl = document.getElementById('startLevelCost');
    this.buyBtn = document.getElementById('buyBtn');
    this.boostBtn = document.getElementById('boostBtn');
    this.incomeUpgradeBtn = document.getElementById('incomeUpgradeBtn');
    this.fireUpgradeBtn = document.getElementById('fireUpgradeBtn');
    this.startLevelUpgradeBtn = document.getElementById('startLevelUpgradeBtn');
  }

  UI.prototype.render = function (game) {
    this.moneyEl.textContent = String(Math.floor(game.economy.money));
    this.waveEl.textContent = String(game.wave);
    this.livesEl.textContent = String(game.lives);
    this.buyCostEl.textContent = String(game.economy.buyCost);
    this.incomeCostEl.textContent = String(game.economy.incomeUpgradeCost);
    this.fireCostEl.textContent = String(game.economy.fireUpgradeCost);
    this.startLevelCostEl.textContent = String(game.economy.startLevelUpgradeCost);
    this.boostBtn.textContent = game.economy.boost2x ? 'x2 Boost ON' : 'x2 Boost';
  };

  UI.prototype.bind = function (game) {
    this.buyBtn.addEventListener('click', function () { game.buyUnit(); });
    this.boostBtn.addEventListener('click', function () { game.toggleBoost(); });
    this.incomeUpgradeBtn.addEventListener('click', function () { game.buyUpgrade('income'); });
    this.fireUpgradeBtn.addEventListener('click', function () { game.buyUpgrade('fire'); });
    this.startLevelUpgradeBtn.addEventListener('click', function () { game.buyUpgrade('startLevel'); });
  };

  window.MGF = window.MGF || {};
  window.MGF.UI = UI;
})();
