(function () {
  var Grid = window.MGF.Grid;
  var Economy = window.MGF.Economy;
  var UI = window.MGF.UI;
  var EnemyPool = window.MGF.EnemyPool;
  var createUnit = window.MGF.createUnit;
  var unitColor = window.MGF.unitColor;
  var storage = window.MGF.storage;

  function Game(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gridCols = 5;
    this.gridRows = 6;
    this.grid = new Grid(this.gridCols, this.gridRows);
    this.economy = new Economy();
    this.ui = new UI();
    this.enemyPool = new EnemyPool(15);
    this.enemyHp = 30;
    this.wave = 1;
    this.lives = 3;
    this.lastTime = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1.8;
    this.saveTimer = 0;
    this.drag = { active: false, from: -1, pointerX: 0, pointerY: 0 };
    this.layout = { padding: 20, gridTop: 24, cellSize: 48 };
    this.boundLoop = this.loop.bind(this);

    this.setupCanvasScale();
    this.registerInput();
    this.ui.bind(this);
    this.load();
    this.applyOfflineIncome();
    this.ui.render(this);
  }

  Game.prototype.setupCanvasScale = function () {
    var dpr = window.devicePixelRatio || 1;
    var rect = this.canvas.getBoundingClientRect();
    var cssWidth = Math.max(1, Math.floor(rect.width || this.canvas.clientWidth || 360));
    var cssHeight = Math.max(1, Math.floor(rect.height || this.canvas.clientHeight || 640));
    this.canvas.width = Math.floor(cssWidth * dpr);
    this.canvas.height = Math.floor(cssHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var availableW = cssWidth - this.layout.padding * 2;
    var availableH = cssHeight - this.layout.gridTop - this.layout.padding;
    this.layout.cellSize = Math.max(24, Math.min(availableW / this.gridCols, availableH / this.gridRows));
  };

  Game.prototype.registerInput = function () {
    var self = this;
    window.addEventListener('resize', function () { self.setupCanvasScale(); });

    function start(ev) {
      ev.preventDefault();
      var p = self.getPoint(ev);
      var idx = self.cellByPoint(p.x, p.y);
      if (idx < 0 || !self.grid.cells[idx]) return;
      self.drag.active = true; self.drag.from = idx; self.drag.pointerX = p.x; self.drag.pointerY = p.y;
    }
    function move(ev) {
      if (!self.drag.active) return;
      ev.preventDefault();
      var p = self.getPoint(ev);
      self.drag.pointerX = p.x; self.drag.pointerY = p.y;
    }
    function end(ev) {
      if (!self.drag.active) return;
      ev.preventDefault();
      var p = self.getPoint(ev);
      var to = self.cellByPoint(p.x, p.y);
      if (to >= 0) self.grid.moveOrMerge(self.drag.from, to, self.economy.fireRateBoost);
      self.drag.active = false; self.drag.from = -1;
    }

    this.canvas.addEventListener('mousedown', start);
    this.canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    this.canvas.addEventListener('touchstart', start, { passive: false });
    this.canvas.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end, { passive: false });
    window.addEventListener('touchcancel', end, { passive: false });
  };

  Game.prototype.getPoint = function (ev) {
    var rect = this.canvas.getBoundingClientRect();
    var touch = null;
    if (ev.touches && ev.touches.length) touch = ev.touches[0];
    else if (ev.changedTouches && ev.changedTouches.length) touch = ev.changedTouches[0];
    var clientX = touch ? touch.clientX : ev.clientX;
    var clientY = touch ? touch.clientY : ev.clientY;
    return { x: (clientX || 0) - rect.left, y: (clientY || 0) - rect.top };
  };

  Game.prototype.cellByPoint = function (x, y) {
    var p = this.layout.padding, t = this.layout.gridTop, s = this.layout.cellSize;
    if (x < p || y < t) return -1;
    var col = Math.floor((x - p) / s), row = Math.floor((y - t) / s);
    if (col < 0 || row < 0 || col >= this.gridCols || row >= this.gridRows) return -1;
    return this.grid.index(col, row);
  };

  Game.prototype.buyUnit = function () {
    var price = this.economy.buyCost;
    if (!this.economy.buyUnit()) return;
    if (!this.grid.placeNewUnit(this.economy.buyStartLevel, this.economy.fireRateBoost)) {
      this.economy.addMoney(price); this.economy.totalBought = Math.max(0, this.economy.totalBought - 1);
    }
  };
  Game.prototype.toggleBoost = function () { this.economy.boost2x = !this.economy.boost2x; };
  Game.prototype.buyUpgrade = function (type) {
    var oldBoost = this.economy.fireRateBoost;
    if (!this.economy.applyUpgrade(type)) return;
    if (type === 'fire') {
      var ratio = (1 + oldBoost) / (1 + this.economy.fireRateBoost);
      this.grid.cells.forEach(function (u) { if (u) { u.fireRate *= ratio; u.cooldown = Math.min(u.cooldown, u.fireRate); } });
    }
  };

  Game.prototype.spawnEnemyIfNeeded = function (dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    var active = this.enemyPool.getActive();
    if (active.length >= 3) return;
    var enemy = this.enemyPool.acquire();
    if (!enemy) return;
    var lane = Math.floor(Math.random() * this.gridRows);
    enemy.spawn({ hp: this.enemyHp, speed: 22 + this.wave * 2, x: -20, y: this.layout.gridTop + this.layout.cellSize * (lane + 0.5) });
    this.spawnTimer = this.spawnInterval;
  };

  Game.prototype.unitsShoot = function (dt) {
    var active = this.enemyPool.getActive();
    if (!active.length) return;
    for (var i = 0; i < this.grid.cells.length; i += 1) {
      var u = this.grid.cells[i]; if (!u) continue;
      u.cooldown -= dt; if (u.cooldown > 0) continue; u.cooldown = u.fireRate;
      var target = active[0];
      for (var j = 1; j < active.length; j += 1) if (active[j].x > target.x) target = active[j];
      if (target.takeDamage(u.damage)) this.economy.addMoney(this.economy.enemyReward(target.maxHp));
    }
  };

  Game.prototype.updateEnemies = function (dt) {
    var maxX = Math.max(360, this.canvas.clientWidth || this.canvas.getBoundingClientRect().width) + 20;
    var self = this;
    this.enemyPool.getActive().forEach(function (e) {
      e.update(dt);
      if (e.x > maxX) { e.active = false; self.lives -= 1; if (self.lives <= 0) self.resetWavePenalty(); }
    });
    if (this.enemyPool.getActive().length === 0) { this.wave += 1; this.enemyHp *= 1.12; }
  };

  Game.prototype.resetWavePenalty = function () {
    this.lives = 3; this.wave = Math.max(1, this.wave - 1); this.enemyHp = Math.max(30, this.enemyHp / 1.12);
    this.enemyPool.pool.forEach(function (e) { e.active = false; });
  };

  Game.prototype.applyOfflineIncome = function () {
    var offlineSec = storage.getOfflineSeconds(3); if (offlineSec <= 1) return;
    var dps = this.grid.cells.reduce(function (sum, u) { return sum + (u ? u.damage / Math.max(u.fireRate, 0.1) : 0); }, 0);
    this.economy.addMoney(Math.floor(dps * offlineSec * 0.08 * this.economy.incomeMultiplier));
  };

  Game.prototype.update = function (dt) {
    this.spawnEnemyIfNeeded(dt); this.unitsShoot(dt); this.updateEnemies(dt);
    this.saveTimer += dt; if (this.saveTimer > 8) { this.save(); this.saveTimer = 0; }
  };

  Game.prototype.drawGrid = function (ctx) {
    var p = this.layout.padding, t = this.layout.gridTop, s = this.layout.cellSize;
    ctx.strokeStyle = '#4f6499'; ctx.lineWidth = 1;
    for (var r = 0; r < this.gridRows; r += 1) {
      for (var c = 0; c < this.gridCols; c += 1) {
        var x = p + c * s, y = t + r * s;
        ctx.fillStyle = '#162340'; ctx.fillRect(x + 1, y + 1, s - 2, s - 2); ctx.strokeRect(x, y, s, s);
      }
    }
  };

  Game.prototype.drawUnitSprite = function (ctx, unit, x, y, radius, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = unitColor(unit.level); ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0e1020'; ctx.font = 'bold ' + Math.max(12, Math.floor(radius * 0.7)) + 'px sans-serif';
    ctx.fillText(String(unit.level), x, y); ctx.restore();
  };

  Game.prototype.drawUnits = function (ctx) {
    var p = this.layout.padding, t = this.layout.gridTop, s = this.layout.cellSize;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 0; i < this.grid.cells.length; i += 1) {
      var u = this.grid.cells[i]; if (!u) continue; if (this.drag.active && this.drag.from === i) continue;
      var pos = this.grid.toCell(i);
      this.drawUnitSprite(ctx, u, p + pos.col * s + s / 2, t + pos.row * s + s / 2, s * 0.38, 1);
    }
    if (this.drag.active) {
      var du = this.grid.cells[this.drag.from];
      if (du) this.drawUnitSprite(ctx, du, this.drag.pointerX, this.drag.pointerY, s * 0.4, 0.85);
    }
  };

  Game.prototype.drawEnemies = function (ctx) {
    this.enemyPool.getActive().forEach(function (e) {
      ctx.fillStyle = '#ff5a6d'; ctx.fillRect(e.x - 14, e.y - 12, 28, 24);
      ctx.fillStyle = '#111'; ctx.fillRect(e.x - 14, e.y - 18, 28, 4);
      ctx.fillStyle = '#71ff90'; ctx.fillRect(e.x - 14, e.y - 18, 28 * Math.max(0, e.hp / e.maxHp), 4);
    });
  };

  Game.prototype.render = function () {
    var w = Math.max(1, this.canvas.clientWidth || this.canvas.getBoundingClientRect().width);
    var h = Math.max(1, this.canvas.clientHeight || this.canvas.getBoundingClientRect().height);
    this.ctx.clearRect(0, 0, w, h);
    this.drawGrid(this.ctx); this.drawUnits(this.ctx); this.drawEnemies(this.ctx); this.ui.render(this);
  };

  Game.prototype.loop = function (timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    var dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;
    this.update(dt); this.render(); requestAnimationFrame(this.boundLoop);
  };

  Game.prototype.start = function () { requestAnimationFrame(this.boundLoop); };

  Game.prototype.save = function () {
    storage.saveGame({ economy: this.economy.serialize(), grid: this.grid.serialize(), wave: this.wave, lives: this.lives, enemyHp: this.enemyHp });
  };

  Game.prototype.load = function () {
    var saved = storage.loadGame();
    if (!saved) {
      this.grid.placeNewUnit(1, this.economy.fireRateBoost);
      this.grid.placeNewUnit(1, this.economy.fireRateBoost);
      return;
    }
    this.economy.load(saved.economy || {});
    this.grid.load(saved.grid, this.economy.fireRateBoost);
    this.wave = saved.wave || 1;
    this.lives = saved.lives || 3;
    this.enemyHp = saved.enemyHp || 30;
    this.grid.cells = this.grid.cells.map(function (u) { return u ? createUnit(u.level, this.economy.fireRateBoost) : null; }.bind(this));
    if (!this.grid.cells.some(function (u) { return !!u; })) this.grid.placeNewUnit(1, this.economy.fireRateBoost);
  };

  Game.prototype.handleBeforeUnload = function () { this.save(); storage.markExitTimestamp(); };

  window.MGF = window.MGF || {};
  window.MGF.Game = Game;
})();
