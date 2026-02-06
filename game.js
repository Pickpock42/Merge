import Grid from './grid.js';
import Economy from './economy.js';
import UI from './ui.js';
import { EnemyPool } from './enemy.js';
import { unitColor, createUnit } from './units.js';
import { saveGame, loadGame, getOfflineSeconds, markExitTimestamp } from './storage.js';

export default class Game {
  constructor(canvas) {
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

    this.drag = {
      active: false,
      from: -1,
      pointerX: 0,
      pointerY: 0,
    };

    this.layout = {
      padding: 20,
      gridTop: 24,
      cellSize: 48,
    };

    this.boundLoop = this.loop.bind(this);

    this.setupCanvasScale();
    this.registerInput();
    this.ui.bind(this);
    this.load();
    this.applyOfflineIncome();
    this.ui.render(this);
  }

  setupCanvasScale() {
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
  }

  registerInput() {
    var self = this;

    window.addEventListener('resize', function () {
      self.setupCanvasScale();
    });

    var start = function (ev) {
      ev.preventDefault();
      var p = self.getPoint(ev);
      var idx = self.cellByPoint(p.x, p.y);
      if (idx < 0 || !self.grid.cells[idx]) return;
      self.drag.active = true;
      self.drag.from = idx;
      self.drag.pointerX = p.x;
      self.drag.pointerY = p.y;
    };

    var move = function (ev) {
      if (!self.drag.active) return;
      ev.preventDefault();
      var p = self.getPoint(ev);
      self.drag.pointerX = p.x;
      self.drag.pointerY = p.y;
    };

    var end = function (ev) {
      if (!self.drag.active) return;
      ev.preventDefault();
      var p = self.getPoint(ev);
      var to = self.cellByPoint(p.x, p.y);
      if (to >= 0) {
        self.grid.moveOrMerge(self.drag.from, to, self.economy.fireRateBoost);
      }
      self.drag.active = false;
      self.drag.from = -1;
    };

    this.canvas.addEventListener('mousedown', start);
    this.canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);

    this.canvas.addEventListener('touchstart', start, { passive: false });
    this.canvas.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end, { passive: false });
    window.addEventListener('touchcancel', end, { passive: false });
  }

  getPoint(ev) {
    var rect = this.canvas.getBoundingClientRect();
    var touch = null;
    if (ev.touches && ev.touches.length) touch = ev.touches[0];
    else if (ev.changedTouches && ev.changedTouches.length) touch = ev.changedTouches[0];

    var clientX = touch ? touch.clientX : ev.clientX;
    var clientY = touch ? touch.clientY : ev.clientY;

    return {
      x: (clientX || 0) - rect.left,
      y: (clientY || 0) - rect.top,
    };
  }

  cellByPoint(x, y) {
    var padding = this.layout.padding;
    var gridTop = this.layout.gridTop;
    var cellSize = this.layout.cellSize;
    if (x < padding || y < gridTop) return -1;
    var col = Math.floor((x - padding) / cellSize);
    var row = Math.floor((y - gridTop) / cellSize);
    if (col < 0 || row < 0 || col >= this.gridCols || row >= this.gridRows) return -1;
    return this.grid.index(col, row);
  }

  buyUnit() {
    var price = this.economy.buyCost;
    if (!this.economy.buyUnit()) return;
    if (!this.grid.placeNewUnit(this.economy.buyStartLevel, this.economy.fireRateBoost)) {
      this.economy.addMoney(price);
      this.economy.totalBought = Math.max(0, this.economy.totalBought - 1);
    }
  }

  toggleBoost() {
    this.economy.boost2x = !this.economy.boost2x;
  }

  buyUpgrade(type) {
    var oldBoost = this.economy.fireRateBoost;
    if (!this.economy.applyUpgrade(type)) return;
    if (type === 'fire') {
      var ratio = (1 + oldBoost) / (1 + this.economy.fireRateBoost);
      this.grid.cells.forEach(function (unit) {
        if (!unit) return;
        unit.fireRate *= ratio;
        unit.cooldown = Math.min(unit.cooldown, unit.fireRate);
      });
    }
  }

  spawnEnemyIfNeeded(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    var active = this.enemyPool.getActive();
    if (active.length >= 3) return;

    var enemy = this.enemyPool.acquire();
    if (!enemy) return;

    var lane = Math.floor(Math.random() * this.gridRows);
    var y = this.layout.gridTop + this.layout.cellSize * (lane + 0.5);
    enemy.spawn({
      hp: this.enemyHp,
      speed: 22 + this.wave * 2,
      x: -20,
      y: y,
    });
    this.spawnTimer = this.spawnInterval;
  }

  unitsShoot(dt) {
    var active = this.enemyPool.getActive();
    if (!active.length) return;

    for (var i = 0; i < this.grid.cells.length; i += 1) {
      var unit = this.grid.cells[i];
      if (!unit) continue;
      unit.cooldown -= dt;
      if (unit.cooldown > 0) continue;
      unit.cooldown = unit.fireRate;

      var target = active[0];
      for (var j = 1; j < active.length; j += 1) {
        if (active[j].x > target.x) target = active[j];
      }

      var dead = target.takeDamage(unit.damage);
      if (dead) {
        this.economy.addMoney(this.economy.enemyReward(target.maxHp));
      }
    }
  }

  updateEnemies(dt) {
    var maxX = Math.max(360, this.canvas.clientWidth || this.canvas.getBoundingClientRect().width) + 20;

    this.enemyPool.getActive().forEach(
      function (enemy) {
        enemy.update(dt);
        if (enemy.x > maxX) {
          enemy.active = false;
          this.lives -= 1;
          if (this.lives <= 0) {
            this.resetWavePenalty();
          }
        }
      }.bind(this)
    );

    if (this.enemyPool.getActive().length === 0) {
      this.wave += 1;
      this.enemyHp *= 1.12;
    }
  }

  resetWavePenalty() {
    this.lives = 3;
    this.wave = Math.max(1, this.wave - 1);
    this.enemyHp = Math.max(30, this.enemyHp / 1.12);
    this.enemyPool.pool.forEach(function (enemy) {
      enemy.active = false;
    });
  }

  applyOfflineIncome() {
    var offlineSec = getOfflineSeconds(3);
    if (offlineSec <= 1) return;

    var dps = this.grid.cells.reduce(function (sum, unit) {
      return sum + (unit ? unit.damage / Math.max(unit.fireRate, 0.1) : 0);
    }, 0);

    var estimatedReward = dps * offlineSec * 0.08 * this.economy.incomeMultiplier;
    this.economy.addMoney(Math.floor(estimatedReward));
  }

  update(dt) {
    this.spawnEnemyIfNeeded(dt);
    this.unitsShoot(dt);
    this.updateEnemies(dt);

    this.saveTimer += dt;
    if (this.saveTimer > 8) {
      this.save();
      this.saveTimer = 0;
    }
  }

  render() {
    if (this.layout.cellSize <= 0) this.setupCanvasScale();

    var ctx = this.ctx;
    var width = Math.max(1, this.canvas.clientWidth || this.canvas.getBoundingClientRect().width);
    var height = Math.max(1, this.canvas.clientHeight || this.canvas.getBoundingClientRect().height);
    ctx.clearRect(0, 0, width, height);

    this.drawGrid(ctx);
    this.drawUnits(ctx);
    this.drawEnemies(ctx);

    this.ui.render(this);
  }

  drawGrid(ctx) {
    var padding = this.layout.padding;
    var gridTop = this.layout.gridTop;
    var cellSize = this.layout.cellSize;

    ctx.strokeStyle = '#4f6499';
    ctx.lineWidth = 1;

    for (var r = 0; r < this.gridRows; r += 1) {
      for (var c = 0; c < this.gridCols; c += 1) {
        var x = padding + c * cellSize;
        var y = gridTop + r * cellSize;
        ctx.fillStyle = '#162340';
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }
  }

  drawUnits(ctx) {
    var padding = this.layout.padding;
    var gridTop = this.layout.gridTop;
    var cellSize = this.layout.cellSize;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (var i = 0; i < this.grid.cells.length; i += 1) {
      var unit = this.grid.cells[i];
      if (!unit) continue;
      if (this.drag.active && this.drag.from === i) continue;
      var pos = this.grid.toCell(i);
      var x = padding + pos.col * cellSize + cellSize / 2;
      var y = gridTop + pos.row * cellSize + cellSize / 2;
      this.drawUnitSprite(ctx, unit, x, y, cellSize * 0.38, 1);
    }

    if (this.drag.active) {
      var dragUnit = this.grid.cells[this.drag.from];
      if (dragUnit) {
        this.drawUnitSprite(ctx, dragUnit, this.drag.pointerX, this.drag.pointerY, cellSize * 0.4, 0.85);
      }
    }
  }

  drawUnitSprite(ctx, unit, x, y, radius, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = unitColor(unit.level);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0e1020';
    ctx.font = 'bold ' + Math.max(12, Math.floor(radius * 0.7)) + 'px sans-serif';
    ctx.fillText(String(unit.level), x, y);
    ctx.restore();
  }

  drawEnemies(ctx) {
    this.enemyPool.getActive().forEach(function (enemy) {
      ctx.fillStyle = '#ff5a6d';
      ctx.fillRect(enemy.x - 14, enemy.y - 12, 28, 24);
      ctx.fillStyle = '#111';
      ctx.fillRect(enemy.x - 14, enemy.y - 18, 28, 4);
      ctx.fillStyle = '#71ff90';
      var ratio = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillRect(enemy.x - 14, enemy.y - 18, 28 * ratio, 4);
    });
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    var dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();
    requestAnimationFrame(this.boundLoop);
  }

  start() {
    requestAnimationFrame(this.boundLoop);
  }

  save() {
    saveGame({
      economy: this.economy.serialize(),
      grid: this.grid.serialize(),
      wave: this.wave,
      lives: this.lives,
      enemyHp: this.enemyHp,
    });
  }

  load() {
    var saved = loadGame();
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

    this.grid.cells = this.grid.cells.map(
      function (unit) {
        return unit ? createUnit(unit.level, this.economy.fireRateBoost) : null;
      }.bind(this)
    );

    if (!this.grid.cells.some(function (u) { return !!u; })) {
      this.grid.placeNewUnit(1, this.economy.fireRateBoost);
    }
  }

  handleBeforeUnload() {
    this.save();
    markExitTimestamp();
  }
}
