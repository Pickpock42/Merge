(function () {
  function Enemy() {
    this.active = false;
    this.hp = 1;
    this.maxHp = 1;
    this.speed = 50;
    this.x = 0;
    this.y = 0;
  }

  Enemy.prototype.spawn = function (cfg) {
    this.active = true;
    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.speed = cfg.speed;
    this.x = cfg.x;
    this.y = cfg.y;
  };

  Enemy.prototype.update = function (dt) {
    if (!this.active) return;
    this.x += this.speed * dt;
  };

  Enemy.prototype.takeDamage = function (amount) {
    if (!this.active) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.active = false;
      return true;
    }
    return false;
  };

  function EnemyPool(size) {
    this.pool = Array.from({ length: size || 10 }, function () { return new Enemy(); });
  }

  EnemyPool.prototype.acquire = function () {
    for (var i = 0; i < this.pool.length; i += 1) if (!this.pool[i].active) return this.pool[i];
    return null;
  };

  EnemyPool.prototype.getActive = function () {
    return this.pool.filter(function (enemy) { return enemy.active; });
  };

  window.MGF = window.MGF || {};
  window.MGF.EnemyPool = EnemyPool;
})();
