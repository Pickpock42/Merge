import Game from './game.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

game.start();

window.addEventListener('beforeunload', () => {
  game.handleBeforeUnload();
});
