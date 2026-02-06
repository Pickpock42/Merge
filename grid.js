import { createUnit } from './units.js';

export default class Grid {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.cells = new Array(cols * rows).fill(null);
  }

  index(col, row) {
    return row * this.cols + col;
  }

  toCell(index) {
    return {
      col: index % this.cols,
      row: Math.floor(index / this.cols),
    };
  }

  firstEmptyIndex() {
    return this.cells.findIndex((cell) => !cell);
  }

  placeNewUnit(level, fireRateBoost) {
    const empty = this.firstEmptyIndex();
    if (empty < 0) return false;
    this.cells[empty] = createUnit(level, fireRateBoost);
    return true;
  }

  moveOrMerge(from, to, fireRateBoost) {
    if (from === to) return false;
    const fromUnit = this.cells[from];
    const toUnit = this.cells[to];
    if (!fromUnit) return false;

    if (!toUnit) {
      this.cells[to] = fromUnit;
      this.cells[from] = null;
      return { moved: true, merged: false };
    }

    if (toUnit.level === fromUnit.level) {
      const nextLevel = fromUnit.level + 1;
      this.cells[to] = createUnit(nextLevel, fireRateBoost);
      this.cells[from] = null;
      return { moved: true, merged: true };
    }

    return { moved: false, merged: false };
  }

  serialize() {
    return this.cells.map((u) => (u ? { level: u.level } : null));
  }

  load(serialized, fireRateBoost = 0) {
    if (!Array.isArray(serialized) || serialized.length !== this.cells.length) return;
    this.cells = serialized.map((u) => (u ? createUnit(u.level, fireRateBoost) : null));
  }
}
