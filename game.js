const canvas = document.getElementById("game");
const ctx = canvas?.getContext("2d");

if (!canvas || !ctx) {
  throw new Error("Canvas initialization failed.");
}
const ctx = canvas.getContext("2d");

const TILE = 32;
const MAP_W = 24;
const MAP_H = 18;

const missionEl = document.getElementById("mission");
const logEl = document.getElementById("log");
const progressEl = document.getElementById("progress");

const keys = {};
let frame = 0;

const player = {
  x: 2 * TILE,
  y: 2 * TILE,
  size: 22,
  speed: 2.4,
  facing: "down"
  speed: 2.6,
  color: "#f8f8f2"
};

const world = {
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
function buildWalls() {
  for (let x = 0; x < MAP_W; x++) {
    world.walls.push({ x, y: 0 });
    world.walls.push({ x, y: MAP_H - 1 });
  }
  for (let y = 1; y < MAP_H - 1; y++) {
    world.walls.push({ x: 0, y });
    world.walls.push({ x: MAP_W - 1, y });
  }

  for (let x = 4; x < 20; x++) if (x !== 11) world.walls.push({ x, y: 8 });
  for (let x = 9; x < 15; x++) world.water.push({ x, y: 14 });
  for (let y = 3; y < 7; y++) world.water.push({ x: 13, y });

  world.decor.push({ x: 3, y: 3, kind: "terminal" });
  world.decor.push({ x: 20, y: 15, kind: "terminal" });
  world.decor.push({ x: 6, y: 10, kind: "crate" });
  world.decor.push({ x: 18, y: 6, kind: "crate" });
  for (let x = 4; x < 20; x++) if (x !== 11) world.walls.push({ x, y: 8 });
}

function drawTile(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
}

function drawGround() {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const base = (x + y) % 2 === 0 ? "#4e7a52" : "#446b49";
      drawTile(x, y, base);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(x * TILE + 2, y * TILE + 2, 2, 2);
    }
  }
}

function drawWater() {
  world.water.forEach(({ x, y }) => {
    drawTile(x, y, "#2459a6");
    const ripple = (frame + x + y) % 30;
    ctx.fillStyle = "rgba(143,208,255,0.55)";
    ctx.fillRect(x * TILE + ripple, y * TILE + 10, 6, 3);
  });
}

function drawWalls() {
  world.walls.forEach((w) => {
    drawTile(w.x, w.y, "#5c4b3a");
    ctx.fillStyle = "#8f7359";
    ctx.fillRect(w.x * TILE, w.y * TILE, TILE, 5);
  });
}

function drawDecor() {
  world.decor.forEach((d) => {
    if (d.kind === "terminal") {
      drawTile(d.x, d.y, "#1d2333");
      ctx.fillStyle = frame % 40 < 20 ? "#74f9ff" : "#2cb6c4";
      ctx.fillRect(d.x * TILE + 8, d.y * TILE + 10, 16, 10);
    } else {
      drawTile(d.x, d.y, "#7e5f33");
      ctx.strokeStyle = "#c89b55";
      ctx.strokeRect(d.x * TILE + 6, d.y * TILE + 6, 20, 20);
    }
  });
}

function drawNodes() {
  world.nodes.forEach((n) => {
    const pulse = n.found ? "#6bff9b" : frame % 40 < 20 ? "#ff5ecb" : "#ff8ad8";
    drawTile(n.x, n.y, pulse);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(n.x * TILE + 9, n.y * TILE + 9, 14, 14);
function drawWorld() {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      drawTile(x, y, (x + y) % 2 === 0 ? "#30415a" : "#2b3a52");
    }
  }

  world.walls.forEach((w) => drawTile(w.x, w.y, "#202736"));

  world.nodes.forEach((n) => {
    const color = n.found ? "#50fa7b" : "#ff79c6";
    drawTile(n.x, n.y, color);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(n.x * TILE + 8, n.y * TILE + 8, 16, 16);
  });
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;
  ctx.fillStyle = "#efe4c8";
  ctx.fillRect(x, y, player.size, player.size);
  ctx.fillStyle = "#5a71ff";
  ctx.fillRect(x + 5, y + 4, 12, 8);
  ctx.fillStyle = "#2d2d2d";

  if (player.facing === "up") ctx.fillRect(x + 9, y + 1, 4, 4);
  if (player.facing === "down") ctx.fillRect(x + 9, y + 16, 4, 4);
  if (player.facing === "left") ctx.fillRect(x + 1, y + 9, 4, 4);
  if (player.facing === "right") ctx.fillRect(x + 16, y + 9, 4, 4);
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);
  ctx.fillStyle = "#8be9fd";
  ctx.fillRect(player.x + 6, player.y + 4, 10, 6);
}

function collidesWall(nextX, nextY) {
  const points = [
    [nextX, nextY],
    [nextX + player.size, nextY],
    [nextX, nextY + player.size],
    [nextX + player.size, nextY + player.size]
  ];

  const blocked = [...world.walls, ...world.water];

  return points.some(([px, py]) => {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    return blocked.some((w) => w.x === tx && w.y === ty);
  return points.some(([px, py]) => {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    return world.walls.some((w) => w.x === tx && w.y === ty);
  });
}

function updatePlayer() {
  let dx = 0;
  let dy = 0;

  if (keys["ArrowUp"] || keys["w"]) {
    dy -= player.speed;
    player.facing = "up";
  }
  if (keys["ArrowDown"] || keys["s"]) {
    dy += player.speed;
    player.facing = "down";
  }
  if (keys["ArrowLeft"] || keys["a"]) {
    dx -= player.speed;
    player.facing = "left";
  }
  if (keys["ArrowRight"] || keys["d"]) {
    dx += player.speed;
    player.facing = "right";
  }
  if (keys["ArrowUp"] || keys["w"]) dy -= player.speed;
  if (keys["ArrowDown"] || keys["s"]) dy += player.speed;
  if (keys["ArrowLeft"] || keys["a"]) dx -= player.speed;
  if (keys["ArrowRight"] || keys["d"]) dx += player.speed;

  const nextX = player.x + dx;
  const nextY = player.y + dy;

  if (!collidesWall(nextX, player.y)) player.x = nextX;
  if (!collidesWall(player.x, nextY)) player.y = nextY;
}

function scanNearbyNode() {
  if (world.finished) return;

  const px = Math.floor((player.x + player.size / 2) / TILE);
  const py = Math.floor((player.y + player.size / 2) / TILE);

  const node = world.nodes.find(
    (n) => !n.found && Math.abs(n.x - px) <= 1 && Math.abs(n.y - py) <= 1
  );

  if (!node) {
    logEl.textContent = "No anomaly in range. Sweep closer to a magenta signal tile.";
    return;
  }

  node.found = true;
  world.scanned += 1;
  logEl.textContent = `Node secured: ${node.label}. Residual signal captured.`;
  progressEl.textContent = `${world.scanned} / ${world.nodes.length} nodes`;

  if (world.scanned === world.nodes.length) {
    world.finished = true;
    missionEl.textContent = "Mission complete: The CMM remains unconfirmed, but the field report is dramatic.";
    missionEl.className = "complete";
    logEl.textContent = "Conclusion Phase initiated: confidence high, evidence ambiguous.";
    logEl.className = "warning";
  }
}

function drawFrame() {
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
  drawFrame();
  if (node) {
    node.found = true;
    world.scanned += 1;
    logEl.textContent = `Node secured: ${node.label}. Residual signal captured.`;
    progressEl.textContent = `${world.scanned} / ${world.nodes.length} nodes`;

    if (world.scanned === world.nodes.length) {
      world.finished = true;
      missionEl.textContent = "Mission complete: Contact with the CMM remains inconclusive.";
      missionEl.className = "complete";
      logEl.textContent = "Final report generated with maximum confidence and minimal evidence.";
      logEl.className = "warning";
    }
  } else {
    logEl.textContent = "No anomaly in range. Continue deep field sweep.";
  }
}

function loop() {
  updatePlayer();
  drawWorld();
  drawPlayer();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (e.key === " ") {
    e.preventDefault();
    scanNearbyNode();
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

buildWorld();
window.addEventListener("keyup", (e) => (keys[e.key] = false));

buildWalls();
loop();
