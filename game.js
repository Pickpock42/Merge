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
      padding: 24,
      gridTop: 180,
      cellSize: 0,
    };

    this.setupCanvasScale();
    this.registerInput();
    this.ui.bind(this);
    this.load();
    this.applyOfflineIncome();
  }

  setupCanvasScale() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const availableW = rect.width - this.layout.padding * 2;
    const availableH = rect.height - this.layout.gridTop - this.layout.padding;
    this.layout.cellSize = Math.min(availableW / this.gridCols, availableH / this.gridRows);
  }

  registerInput() {
    window.addEventListener('resize', () => this.setupCanvasScale());

    const start = (ev) => {
      ev.preventDefault();
      const p = this.getPoint(ev);
      const idx = this.cellByPoint(p.x, p.y);
      if (idx < 0 || !this.grid.cells[idx]) return;
      this.drag.active = true;
      this.drag.from = idx;
      this.drag.pointerX = p.x;
      this.drag.pointerY = p.y;
    };

    const move = (ev) => {
      if (!this.drag.active) return;
      ev.preventDefault();
      const p = this.getPoint(ev);
      this.drag.pointerX = p.x;
      this.drag.pointerY = p.y;
    };

    const end = (ev) => {
      if (!this.drag.active) return;
      ev.preventDefault();
      const p = this.getPoint(ev);
      const to = this.cellByPoint(p.x, p.y);
      if (to >= 0) {
        this.grid.moveOrMerge(this.drag.from, to, this.economy.fireRateBoost);
      }
      this.drag.active = false;
      this.drag.from = -1;
    };

    this.canvas.addEventListener('mousedown', start);
    this.canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);

    this.canvas.addEventListener('touchstart', start, { passive: false });
    this.canvas.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end, { passive: false });
  }

  getPoint(ev) {
    const rect = this.canvas.getBoundingClientRect();
    const touch = ev.touches?.[0] || ev.changedTouches?.[0];
    const clientX = touch ? touch.clientX : ev.clientX;
    const clientY = touch ? touch.clientY : ev.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  cellByPoint(x, y) {
    const { padding, gridTop, cellSize } = this.layout;
    if (x < padding || y < gridTop) return -1;
    const col = Math.floor((x - padding) / cellSize);
    const row = Math.floor((y - gridTop) / cellSize);
    if (col < 0 || row < 0 || col >= this.gridCols || row >= this.gridRows) return -1;
    return this.grid.index(col, row);
  }

  buyUnit() {
    if (!this.economy.buyUnit()) return;
    if (!this.grid.placeNewUnit(this.economy.buyStartLevel, this.economy.fireRateBoost)) {
      this.economy.addMoney(this.economy.buyCost);
      this.economy.totalBought = Math.max(0, this.economy.totalBought - 1);
    }
  }

  toggleBoost() {
    this.economy.boost2x = !this.economy.boost2x;
  }

  buyUpgrade(type) {
    const oldBoost = this.economy.fireRateBoost;
    if (!this.economy.applyUpgrade(type)) return;
    if (type === 'fire') {
      const ratio = (1 + oldBoost) / (1 + this.economy.fireRateBoost);
      this.grid.cells.forEach((unit) => {
        if (unit) {
          unit.fireRate *= ratio;
          unit.cooldown = Math.min(unit.cooldown, unit.fireRate);
        }
      });
    }
  }

  spawnEnemyIfNeeded(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    const active = this.enemyPool.getActive();
    if (active.length >= 3) return;

    const enemy = this.enemyPool.acquire();
    if (!enemy) return;

    const lane = Math.floor(Math.random() * this.gridRows);
    const y = this.layout.gridTop + this.layout.cellSize * (lane + 0.5);
    enemy.spawn({
      hp: this.enemyHp,
      speed: 22 + this.wave * 2,
      x: -20,
      y,
    });
    this.spawnTimer = this.spawnInterval;
  }

  unitsShoot(dt) {
    const active = this.enemyPool.getActive();
    if (!active.length) return;

    for (const unit of this.grid.cells) {
      if (!unit) continue;
      unit.cooldown -= dt;
      if (unit.cooldown > 0) continue;
      unit.cooldown = unit.fireRate;
      const target = active.reduce((a, b) => (a.x > b.x ? a : b));
      const dead = target.takeDamage(unit.damage);
      if (dead) {
        this.economy.addMoney(this.economy.enemyReward(target.maxHp));
      }
    }
  }

  updateEnemies(dt) {
    const rect = this.canvas.getBoundingClientRect();
    const maxX = rect.width + 20;

    this.enemyPool.getActive().forEach((enemy) => {
      enemy.update(dt);
      if (enemy.x > maxX) {
        enemy.active = false;
        this.lives -= 1;
        if (this.lives <= 0) {
          this.resetWavePenalty();
        }
      }
    });

    if (this.enemyPool.getActive().length === 0) {
      this.wave += 1;
      this.enemyHp *= 1.12;
    }
  }

  resetWavePenalty() {
    this.lives = 3;
    this.wave = Math.max(1, this.wave - 1);
    this.enemyHp = Math.max(30, this.enemyHp / 1.12);
    this.enemyPool.pool.forEach((enemy) => {
      enemy.active = false;
    });
  }

  applyOfflineIncome() {
    const offlineSec = getOfflineSeconds(3);
    if (offlineSec <= 1) return;
    const dps = this.grid.cells.reduce((sum, unit) => sum + (unit ? unit.damage / Math.max(unit.fireRate, 0.1) : 0), 0);
    const estimatedReward = dps * offlineSec * 0.08 * this.economy.incomeMultiplier;
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
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    this.drawGrid(ctx);
    this.drawUnits(ctx);
    this.drawEnemies(ctx);

    this.ui.render(this);
  }

  drawGrid(ctx) {
    const { padding, gridTop, cellSize } = this.layout;
    ctx.strokeStyle = '#334166';
    ctx.lineWidth = 1;
    for (let r = 0; r < this.gridRows; r += 1) {
      for (let c = 0; c < this.gridCols; c += 1) {
        const x = padding + c * cellSize;
        const y = gridTop + r * cellSize;
        ctx.fillStyle = '#1a2236';
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }
  }

  drawUnits(ctx) {
    const { padding, gridTop, cellSize } = this.layout;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    this.grid.cells.forEach((unit, i) => {
      if (!unit) return;
      if (this.drag.active && this.drag.from === i) return;
      const { col, row } = this.grid.toCell(i);
      const x = padding + col * cellSize + cellSize / 2;
      const y = gridTop + row * cellSize + cellSize / 2;
      this.drawUnitSprite(ctx, unit, x, y, cellSize * 0.38);
    });

    if (this.drag.active) {
      const unit = this.grid.cells[this.drag.from];
      if (unit) {
        this.drawUnitSprite(ctx, unit, this.drag.pointerX, this.drag.pointerY, cellSize * 0.4, 0.85);
      }
    }
  }

  drawUnitSprite(ctx, unit, x, y, radius, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = unitColor(unit.level);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0e1020';
    ctx.font = `bold ${Math.max(12, radius * 0.7)}px sans-serif`;
    ctx.fillText(`${unit.level}`, x, y);
    ctx.restore();
  }

  drawEnemies(ctx) {
    ctx.textAlign = 'left';
    this.enemyPool.getActive().forEach((enemy) => {
      ctx.fillStyle = '#ff5a6d';
      ctx.fillRect(enemy.x - 14, enemy.y - 12, 28, 24);
      ctx.fillStyle = '#111';
      ctx.fillRect(enemy.x - 14, enemy.y - 18, 28, 4);
      ctx.fillStyle = '#71ff90';
      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillRect(enemy.x - 14, enemy.y - 18, 28 * ratio, 4);
    });
  }

  loop = (timestamp) => {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  };

  start() {
    requestAnimationFrame(this.loop);
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
    const saved = loadGame();
    if (!saved) {
      this.grid.placeNewUnit(1, this.economy.fireRateBoost);
      return;
    }

    this.economy.load(saved.economy);
    this.grid.load(saved.grid, this.economy.fireRateBoost);
    this.wave = saved.wave || 1;
    this.lives = saved.lives || 3;
    this.enemyHp = saved.enemyHp || 30;

    // Коррекция юнитов после загрузки под текущий бонус скорости.
    this.grid.cells = this.grid.cells.map((unit) => (unit ? createUnit(unit.level, this.economy.fireRateBoost) : null));
  }

  handleBeforeUnload() {
    this.save();
    markExitTimestamp();
  }
}
