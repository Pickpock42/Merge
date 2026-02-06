(function () {
  var Game = window.MGF.Game;
  var canvas = document.getElementById('gameCanvas');
  var game = new Game(canvas);
  game.start();
  window.addEventListener('beforeunload', function () { game.handleBeforeUnload(); });
})();
