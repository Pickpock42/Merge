export default class UI {
  constructor() {
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

  render(game) {
    this.moneyEl.textContent = Math.floor(game.economy.money).toString();
    this.waveEl.textContent = `${game.wave}`;
    this.livesEl.textContent = `${game.lives}`;
    this.buyCostEl.textContent = `${game.economy.buyCost}`;
    this.incomeCostEl.textContent = `${game.economy.incomeUpgradeCost}`;
    this.fireCostEl.textContent = `${game.economy.fireUpgradeCost}`;
    this.startLevelCostEl.textContent = `${game.economy.startLevelUpgradeCost}`;
    this.boostBtn.textContent = game.economy.boost2x ? 'x2 Boost ON' : 'x2 Boost';
  }

  bind(game) {
    this.buyBtn.addEventListener('click', () => game.buyUnit());
    this.boostBtn.addEventListener('click', () => game.toggleBoost());
    this.incomeUpgradeBtn.addEventListener('click', () => game.buyUpgrade('income'));
    this.fireUpgradeBtn.addEventListener('click', () => game.buyUpgrade('fire'));
    this.startLevelUpgradeBtn.addEventListener('click', () => game.buyUpgrade('startLevel'));
  }
}
