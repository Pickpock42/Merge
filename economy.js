export default class Economy {
  constructor() {
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

  get buyCost() {
    return Math.floor(this.baseBuyCost * 1.15 ** this.totalBought);
  }

  get incomeMultiplier() {
    return (1 + this.incomeLevel * 0.2) * (this.boost2x ? 2 : 1);
  }

  get fireRateBoost() {
    return this.fireRateLevel * 0.15;
  }

  get buyStartLevel() {
    return 1 + this.startLevelLevel;
  }

  canAfford(value) {
    return this.money >= value;
  }

  spend(value) {
    if (!this.canAfford(value)) return false;
    this.money -= value;
    return true;
  }

  addMoney(value) {
    this.money += value;
  }

  buyUnit() {
    const cost = this.buyCost;
    if (!this.spend(cost)) return false;
    this.totalBought += 1;
    return true;
  }

  enemyReward(enemyHp) {
    return enemyHp * 0.5 * this.incomeMultiplier;
  }

  applyUpgrade(type) {
    if (type === 'income') {
      if (!this.spend(this.incomeUpgradeCost)) return false;
      this.incomeLevel += 1;
      this.incomeUpgradeCost = Math.floor(this.incomeUpgradeCost * 1.7);
      return true;
    }

    if (type === 'fire') {
      if (!this.spend(this.fireUpgradeCost)) return false;
      this.fireRateLevel += 1;
      this.fireUpgradeCost = Math.floor(this.fireUpgradeCost * 1.7);
      return true;
    }

    if (type === 'startLevel') {
      if (!this.spend(this.startLevelUpgradeCost)) return false;
      this.startLevelLevel += 1;
      this.startLevelUpgradeCost = Math.floor(this.startLevelUpgradeCost * 1.7);
      return true;
    }

    return false;
  }

  serialize() {
    return {
      baseBuyCost: this.baseBuyCost,
      totalBought: this.totalBought,
      money: this.money,
      incomeLevel: this.incomeLevel,
      fireRateLevel: this.fireRateLevel,
      startLevelLevel: this.startLevelLevel,
      incomeUpgradeCost: this.incomeUpgradeCost,
      fireUpgradeCost: this.fireUpgradeCost,
      startLevelUpgradeCost: this.startLevelUpgradeCost,
      boost2x: this.boost2x,
    };
  }

  load(data = {}) {
    Object.assign(this, data);
  }
}
