(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;

  var missionEl = document.getElementById('mission');
  var logEl = document.getElementById('log');
  var progressEl = document.getElementById('progress');

  function setText(el, text) {
    if (el) el.textContent = text;
  }

  if (!canvas || !ctx) {
    setText(logEl, 'Rendering error: unable to initialize canvas in this browser context.');
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
    facing: 'down',
    color: '#f8f8f2'
  };

  var world = {
    walls: [],
    water: [],
    decor: [],
    nodes: [
      { x: 5, y: 5, label: 'Ghost Forum Pulse' },
      { x: 16, y: 4, label: 'SEGS Echo' },
      { x: 8, y: 13, label: 'Shed-Net Distortion' },
      { x: 19, y: 11, label: 'Cabin Conclusion Signal' }
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

    world.decor.push({ x: 3, y: 3, kind: 'terminal' });
    world.decor.push({ x: 20, y: 15, kind: 'terminal' });
    world.decor.push({ x: 6, y: 10, kind: 'crate' });
    world.decor.push({ x: 18, y: 6, kind: 'crate' });
  }

  function drawTile(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  }

  function drawGround() {
    var x;
    var y;
    var base;

    for (y = 0; y < MAP_H; y++) {
      for (x = 0; x < MAP_W; x++) {
        base = (x + y) % 2 === 0 ? '#4e7a52' : '#446b49';
        drawTile(x, y, base);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x * TILE + 2, y * TILE + 2, 2, 2);
      }
    }
  }

  function drawWater() {
    var i, w, ripple;
    for (i = 0; i < world.water.length; i++) {
      w = world.water[i];
      drawTile(w.x, w.y, '#2459a6');
      ripple = (frame + w.x + w.y) % 30;
      ctx.fillStyle = 'rgba(143,208,255,0.55)';
      ctx.fillRect(w.x * TILE + ripple, w.y * TILE + 10, 6, 3);
    }
  }

  function drawWalls() {
    var i, w;
    for (i = 0; i < world.walls.length; i++) {
      w = world.walls[i];
      drawTile(w.x, w.y, '#5c4b3a');
      ctx.fillStyle = '#8f7359';
      ctx.fillRect(w.x * TILE, w.y * TILE, TILE, 5);
    }
  }

  function drawDecor() {
    var i, d;
    for (i = 0; i < world.decor.length; i++) {
      d = world.decor[i];
      if (d.kind === 'terminal') {
        drawTile(d.x, d.y, '#1d2333');
        ctx.fillStyle = frame % 40 < 20 ? '#74f9ff' : '#2cb6c4';
        ctx.fillRect(d.x * TILE + 8, d.y * TILE + 10, 16, 10);
      } else {
        drawTile(d.x, d.y, '#7e5f33');
        ctx.strokeStyle = '#c89b55';
        ctx.strokeRect(d.x * TILE + 6, d.y * TILE + 6, 20, 20);
      }
    }
  }

  function drawNodes() {
    var i, n, pulse;
    for (i = 0; i < world.nodes.length; i++) {
      n = world.nodes[i];
      pulse = n.found ? '#6bff9b' : (frame % 40 < 20 ? '#ff5ecb' : '#ff8ad8');
      drawTile(n.x, n.y, pulse);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(n.x * TILE + 9, n.y * TILE + 9, 14, 14);
    }
  }

  function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.size, player.size);
    ctx.fillStyle = '#8be9fd';
    ctx.fillRect(player.x + 6, player.y + 4, 10, 6);

    ctx.fillStyle = '#2d2d2d';
    if (player.facing === 'up') ctx.fillRect(player.x + 9, player.y + 1, 4, 4);
    if (player.facing === 'down') ctx.fillRect(player.x + 9, player.y + 16, 4, 4);
    if (player.facing === 'left') ctx.fillRect(player.x + 1, player.y + 9, 4, 4);
    if (player.facing === 'right') ctx.fillRect(player.x + 16, player.y + 9, 4, 4);
  }

  function collidesWall(nextX, nextY) {
    var points = [
      [nextX, nextY],
      [nextX + player.size, nextY],
      [nextX, nextY + player.size],
      [nextX + player.size, nextY + player.size]
    ];

    var blocked = world.walls.concat(world.water);
    var i, j, px, py, tx, ty, w;

    for (i = 0; i < points.length; i++) {
      px = points[i][0];
      py = points[i][1];
      tx = Math.floor(px / TILE);
      ty = Math.floor(py / TILE);
      for (j = 0; j < blocked.length; j++) {
        w = blocked[j];
        if (w.x === tx && w.y === ty) return true;
      }
    }

    return false;
  }

  function updatePlayer() {
    var dx = 0;
    var dy = 0;

    if (keys.ArrowUp || keys.w) { dy -= player.speed; player.facing = 'up'; }
    if (keys.ArrowDown || keys.s) { dy += player.speed; player.facing = 'down'; }
    if (keys.ArrowLeft || keys.a) { dx -= player.speed; player.facing = 'left'; }
    if (keys.ArrowRight || keys.d) { dx += player.speed; player.facing = 'right'; }

    var nextX = player.x + dx;
    var nextY = player.y + dy;

    if (!collidesWall(nextX, player.y)) player.x = nextX;
    if (!collidesWall(player.x, nextY)) player.y = nextY;
  }

  function scanNearbyNode() {
    if (world.finished) return;

    var px = Math.floor((player.x + player.size / 2) / TILE);
    var py = Math.floor((player.y + player.size / 2) / TILE);
    var i, n;

    for (i = 0; i < world.nodes.length; i++) {
      n = world.nodes[i];
      if (!n.found && Math.abs(n.x - px) <= 1 && Math.abs(n.y - py) <= 1) {
        n.found = true;
        world.scanned += 1;
        setText(logEl, 'Node secured: ' + n.label + '. Residual signal captured.');
        setText(progressEl, world.scanned + ' / ' + world.nodes.length + ' nodes');

        if (world.scanned === world.nodes.length) {
          world.finished = true;
          setText(missionEl, 'Mission complete: The CMM remains unconfirmed, but the field report is dramatic.');
          if (missionEl) missionEl.className = 'complete';
          setText(logEl, 'Conclusion Phase initiated: confidence high, evidence ambiguous.');
          if (logEl) logEl.className = 'warning';
        }
        return;
      }
    }

    setText(logEl, 'No anomaly in range. Sweep closer to a magenta signal tile.');
  }

  function drawFrame() {
    drawGround();
    drawWater();
    drawWalls();
    drawDecor();
    drawNodes();
    drawPlayer();

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  }

  function loop() {
    frame += 1;
    updatePlayer();
    drawFrame();
    window.requestAnimationFrame(loop);
  }

  function onKeyDown(e) {
    var key = e.key;
    if (key && key.length === 1) key = key.toLowerCase();
    keys[key] = true;

    if (key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright' || e.code === 'Space') {
      e.preventDefault();
    }

    if (e.code === 'Space') scanNearbyNode();
  }

  function onKeyUp(e) {
    var key = e.key;
    if (key && key.length === 1) key = key.toLowerCase();
    keys[key] = false;
  }

  buildWorld();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  loop();
})();
