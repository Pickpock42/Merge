(function () {
  var createUnit = window.MGF.createUnit;

  function Grid(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.cells = new Array(cols * rows).fill(null);
  }

  Grid.prototype.index = function (col, row) {
    return row * this.cols + col;
  };

  Grid.prototype.toCell = function (index) {
    return { col: index % this.cols, row: Math.floor(index / this.cols) };
  };

  Grid.prototype.firstEmptyIndex = function () {
    return this.cells.findIndex(function (cell) { return !cell; });
  };

  Grid.prototype.placeNewUnit = function (level, fireRateBoost) {
    var empty = this.firstEmptyIndex();
    if (empty < 0) return false;
    this.cells[empty] = createUnit(level, fireRateBoost);
    return true;
  };

  Grid.prototype.moveOrMerge = function (from, to, fireRateBoost) {
    if (from === to) return { moved: false, merged: false };
    var fromUnit = this.cells[from];
    var toUnit = this.cells[to];
    if (!fromUnit) return { moved: false, merged: false };

    if (!toUnit) {
      this.cells[to] = fromUnit;
      this.cells[from] = null;
      return { moved: true, merged: false };
    }

    if (toUnit.level === fromUnit.level) {
      this.cells[to] = createUnit(fromUnit.level + 1, fireRateBoost);
      this.cells[from] = null;
      return { moved: true, merged: true };
    }

    return { moved: false, merged: false };
  };

  Grid.prototype.serialize = function () {
    return this.cells.map(function (u) { return u ? { level: u.level } : null; });
  };

  Grid.prototype.load = function (serialized, fireRateBoost) {
    if (!Array.isArray(serialized) || serialized.length !== this.cells.length) return;
    this.cells = serialized.map(function (u) {
      return u ? createUnit(u.level, fireRateBoost || 0) : null;
    });
  };

  window.MGF = window.MGF || {};
  window.MGF.Grid = Grid;
})();
