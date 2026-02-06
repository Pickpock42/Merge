(function () {
  function createUnit(level, fireRateBoost) {
    var boost = fireRateBoost || 0;
    var damage = Math.pow(2, level);
    var baseFireRate = 1 / (1 + level * 0.1);
    var fireRate = baseFireRate / (1 + boost);
    return { level: level, damage: damage, fireRate: fireRate, cooldown: 0 };
  }

  function unitColor(level) {
    var hue = (180 + level * 28) % 360;
    return 'hsl(' + hue + ', 80%, 58%)';
  }

  window.MGF = window.MGF || {};
  window.MGF.createUnit = createUnit;
  window.MGF.unitColor = unitColor;
})();
