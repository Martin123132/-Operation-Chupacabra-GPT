(function () {
  var canvas = document.getElementById("game");
  var missionEl = document.getElementById("mission");
  var logEl = document.getElementById("log");
  var progressEl = document.getElementById("progress");

  if (!canvas || !canvas.getContext) {
    if (logEl) {
      logEl.textContent = "Your browser cannot run this canvas game.";
      logEl.className = "warning";
    }
    return;
  }

  var ctx = canvas.getContext("2d");
  if (!ctx) {
    if (logEl) {
      logEl.textContent = "Canvas failed to initialize.";
      logEl.className = "warning";
    }
    return;
  }

  var TILE = 32;
  var MAP_W = 24;
  var MAP_H = 18;

  var keys = {};
  var frame = 0;

  var player = {
    x: 2 * TILE,
    y: 2 * TILE,
    size: 22,
    speed: 2.4,
    facing: "down"
  };

  var world = {
    walls: [],
    water: [],
    decor: [],
    nodes: [
      { x: 5, y: 5, label: "Ghost Forum Pulse" },
      { x: 16, y: 4, label: "SEGS Echo" },
      { x: 8, y: 13, label: "Shed-Net Distortion" },
      { x: 19, y: 11, label: "Cabin Conclusion Signal" }
    ],
    scanned: 0,
    finished: false
  };

  function buildWorld() {
    var x;
    var y;

    for (x = 0; x < MAP_W; x++) {
      world.walls.push({ x: x, y: 0 });
      world.walls.push({ x: x, y: MAP_H - 1 });
    }

    for (y = 1; y < MAP_H - 1; y++) {
      world.walls.push({ x: 0, y: y });
      world.walls.push({ x: MAP_W - 1, y: y });
    }

    for (x = 4; x < 20; x++) {
      if (x !== 11) world.walls.push({ x: x, y: 8 });
    }

    for (x = 9; x < 15; x++) world.water.push({ x: x, y: 14 });
    for (y = 3; y < 7; y++) world.water.push({ x: 13, y: y });

    world.decor.push({ x: 3, y: 3, kind: "terminal" });
    world.decor.push({ x: 20, y: 15, kind: "terminal" });
    world.decor.push({ x: 6, y: 10, kind: "crate" });
    world.decor.push({ x: 18, y: 6, kind: "crate" });
  }

  function drawTile(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  }

  function drawGround() {
    var x;
    var y;
    for (y = 0; y < MAP_H; y++) {
      for (x = 0; x < MAP_W; x++) {
        drawTile(x, y, (x + y) % 2 === 0 ? "#4e7a52" : "#446b49");
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(x * TILE + 2, y * TILE + 2, 2, 2);
      }
    }
  }

  function drawWater() {
    var i;
    for (i = 0; i < world.water.length; i++) {
      var w = world.water[i];
      drawTile(w.x, w.y, "#2459a6");
      var ripple = (frame + w.x + w.y) % 30;
      ctx.fillStyle = "rgba(143,208,255,0.55)";
      ctx.fillRect(w.x * TILE + ripple, w.y * TILE + 10, 6, 3);
    }
  }

  function drawWalls() {
    var i;
    for (i = 0; i < world.walls.length; i++) {
      var w = world.walls[i];
      drawTile(w.x, w.y, "#5c4b3a");
      ctx.fillStyle = "#8f7359";
      ctx.fillRect(w.x * TILE, w.y * TILE, TILE, 5);
    }
  }

  function drawDecor() {
    var i;
    for (i = 0; i < world.decor.length; i++) {
      var d = world.decor[i];
      if (d.kind === "terminal") {
        drawTile(d.x, d.y, "#1d2333");
        ctx.fillStyle = frame % 40 < 20 ? "#74f9ff" : "#2cb6c4";
        ctx.fillRect(d.x * TILE + 8, d.y * TILE + 10, 16, 10);
      } else {
        drawTile(d.x, d.y, "#7e5f33");
        ctx.strokeStyle = "#c89b55";
        ctx.strokeRect(d.x * TILE + 6, d.y * TILE + 6, 20, 20);
      }
    }
  }

  function drawNodes() {
    var i;
    for (i = 0; i < world.nodes.length; i++) {
      var n = world.nodes[i];
      var pulse = n.found ? "#6bff9b" : (frame % 40 < 20 ? "#ff5ecb" : "#ff8ad8");
      drawTile(n.x, n.y, pulse);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(n.x * TILE + 9, n.y * TILE + 9, 14, 14);
    }
  }

  function drawPlayer() {
    var x = player.x;
    var y = player.y;
    ctx.fillStyle = "#efe4c8";
    ctx.fillRect(x, y, player.size, player.size);
    ctx.fillStyle = "#5a71ff";
    ctx.fillRect(x + 5, y + 4, 12, 8);
    ctx.fillStyle = "#2d2d2d";

    if (player.facing === "up") ctx.fillRect(x + 9, y + 1, 4, 4);
    if (player.facing === "down") ctx.fillRect(x + 9, y + 16, 4, 4);
    if (player.facing === "left") ctx.fillRect(x + 1, y + 9, 4, 4);
    if (player.facing === "right") ctx.fillRect(x + 16, y + 9, 4, 4);
  }

  function isBlockedTile(tx, ty) {
    var i;
    for (i = 0; i < world.walls.length; i++) {
      if (world.walls[i].x === tx && world.walls[i].y === ty) return true;
    }
    for (i = 0; i < world.water.length; i++) {
      if (world.water[i].x === tx && world.water[i].y === ty) return true;
    }
    return false;
  }

  function collides(nextX, nextY) {
    var points = [
      [nextX, nextY],
      [nextX + player.size, nextY],
      [nextX, nextY + player.size],
      [nextX + player.size, nextY + player.size]
    ];
    var i;
    for (i = 0; i < points.length; i++) {
      var tx = Math.floor(points[i][0] / TILE);
      var ty = Math.floor(points[i][1] / TILE);
      if (isBlockedTile(tx, ty)) return true;
    }
    return false;
  }

  function updatePlayer() {
    var dx = 0;
    var dy = 0;

    if (keys.ArrowUp || keys.w || keys.W) { dy -= player.speed; player.facing = "up"; }
    if (keys.ArrowDown || keys.s || keys.S) { dy += player.speed; player.facing = "down"; }
    if (keys.ArrowLeft || keys.a || keys.A) { dx -= player.speed; player.facing = "left"; }
    if (keys.ArrowRight || keys.d || keys.D) { dx += player.speed; player.facing = "right"; }

    var nextX = player.x + dx;
    var nextY = player.y + dy;

    if (!collides(nextX, player.y)) player.x = nextX;
    if (!collides(player.x, nextY)) player.y = nextY;
  }

  function scanNearbyNode() {
    if (world.finished) return;

    var px = Math.floor((player.x + player.size / 2) / TILE);
    var py = Math.floor((player.y + player.size / 2) / TILE);
    var i;
    var node = null;

    for (i = 0; i < world.nodes.length; i++) {
      var n = world.nodes[i];
      if (!n.found && Math.abs(n.x - px) <= 1 && Math.abs(n.y - py) <= 1) {
        node = n;
        break;
      }
    }

    if (!node) {
      logEl.textContent = "No anomaly in range. Sweep closer to a magenta signal tile.";
      return;
    }

    node.found = true;
    world.scanned += 1;
    logEl.textContent = "Node secured: " + node.label + ". Residual signal captured.";
    progressEl.textContent = world.scanned + " / " + world.nodes.length + " nodes";

    if (world.scanned === world.nodes.length) {
      world.finished = true;
      missionEl.textContent = "Mission complete: The CMM remains unconfirmed, but the field report is dramatic.";
      missionEl.className = "complete";
      logEl.textContent = "Conclusion Phase initiated: confidence high, evidence ambiguous.";
      logEl.className = "warning";
    }
  }

  function render() {
    drawGround();
    drawWater();
    drawWalls();
    drawDecor();
    drawNodes();
    drawPlayer();

    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  }

  function loop() {
    frame += 1;
    updatePlayer();
    render();
    window.requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", function (e) {
    keys[e.key] = true;
    if (e.key === " ") {
      e.preventDefault();
      scanNearbyNode();
    }
  });

  window.addEventListener("keyup", function (e) {
    keys[e.key] = false;
  });

  buildWorld();
  render();
  loop();
})();
