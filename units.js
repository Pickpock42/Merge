// Создает объект юнита на основе уровня и глобальных улучшений.
export function createUnit(level, fireRateBoost = 0) {
  const damage = 2 ** level;
  const baseFireRate = 1 / (1 + level * 0.1);
  const fireRate = baseFireRate / (1 + fireRateBoost);

  return {
    level,
    damage,
    fireRate,
    cooldown: 0,
  };
}

// Цвет юнита по уровню для удобной визуализации.
export function unitColor(level) {
  const hue = (180 + level * 28) % 360;
  return `hsl(${hue}, 80%, 58%)`;
}
