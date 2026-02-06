export class Enemy {
  constructor() {
    this.active = false;
    this.hp = 1;
    this.maxHp = 1;
    this.speed = 50;
    this.x = 0;
    this.y = 0;
  }

  spawn({ hp, speed, x, y }) {
    this.active = true;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
    this.x = x;
    this.y = y;
  }

  update(dt) {
    if (!this.active) return;
    this.x += this.speed * dt;
  }

  takeDamage(amount) {
    if (!this.active) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }
}

export class EnemyPool {
  constructor(size = 10) {
    this.pool = Array.from({ length: size }, () => new Enemy());
  }

  acquire() {
    return this.pool.find((enemy) => !enemy.active) || null;
  }

  getActive() {
    return this.pool.filter((enemy) => enemy.active);
  }
}
