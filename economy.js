(function () {
  function Economy() {
    this.baseBuyCost = 20;
    this.totalBought = 0;
    this.money = 100;
    this.incomeLevel = 0;
    this.fireRateLevel = 0;
    this.startLevelLevel = 0;
    this.incomeUpgradeCost = 100;
    this.fireUpgradeCost = 120;
    this.startLevelUpgradeCost = 150;
    this.boost2x = false;
  }

  Object.defineProperty(Economy.prototype, 'buyCost', {
    get: function () { return Math.floor(this.baseBuyCost * Math.pow(1.15, this.totalBought)); },
  });
  Object.defineProperty(Economy.prototype, 'incomeMultiplier', {
    get: function () { return (1 + this.incomeLevel * 0.2) * (this.boost2x ? 2 : 1); },
  });
  Object.defineProperty(Economy.prototype, 'fireRateBoost', {
    get: function () { return this.fireRateLevel * 0.15; },
  });
  Object.defineProperty(Economy.prototype, 'buyStartLevel', {
    get: function () { return 1 + this.startLevelLevel; },
  });

  Economy.prototype.canAfford = function (v) { return this.money >= v; };
  Economy.prototype.spend = function (v) { if (!this.canAfford(v)) return false; this.money -= v; return true; };
  Economy.prototype.addMoney = function (v) { this.money += v; };
  Economy.prototype.buyUnit = function () { var c = this.buyCost; if (!this.spend(c)) return false; this.totalBought += 1; return true; };
  Economy.prototype.enemyReward = function (hp) { return hp * 0.5 * this.incomeMultiplier; };

  Economy.prototype.applyUpgrade = function (type) {
    if (type === 'income') {
      if (!this.spend(this.incomeUpgradeCost)) return false;
      this.incomeLevel += 1; this.incomeUpgradeCost = Math.floor(this.incomeUpgradeCost * 1.7); return true;
    }
    if (type === 'fire') {
      if (!this.spend(this.fireUpgradeCost)) return false;
      this.fireRateLevel += 1; this.fireUpgradeCost = Math.floor(this.fireUpgradeCost * 1.7); return true;
    }
    if (type === 'startLevel') {
      if (!this.spend(this.startLevelUpgradeCost)) return false;
      this.startLevelLevel += 1; this.startLevelUpgradeCost = Math.floor(this.startLevelUpgradeCost * 1.7); return true;
    }
    return false;
  };

  Economy.prototype.serialize = function () {
    return {
      baseBuyCost: this.baseBuyCost, totalBought: this.totalBought, money: this.money,
      incomeLevel: this.incomeLevel, fireRateLevel: this.fireRateLevel, startLevelLevel: this.startLevelLevel,
      incomeUpgradeCost: this.incomeUpgradeCost, fireUpgradeCost: this.fireUpgradeCost,
      startLevelUpgradeCost: this.startLevelUpgradeCost, boost2x: this.boost2x,
    };
  };

  Economy.prototype.load = function (data) { Object.assign(this, data || {}); };

  window.MGF = window.MGF || {};
  window.MGF.Economy = Economy;
})();
