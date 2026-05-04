const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const TILE = 32;
const MAP_W = 24;
const MAP_H = 18;

const missionEl = document.getElementById("mission");
const logEl = document.getElementById("log");
const progressEl = document.getElementById("progress");

const keys = {};

const player = {
  x: 2 * TILE,
  y: 2 * TILE,
  size: 22,
  speed: 2.6,
  color: "#f8f8f2"
};

const world = {
  walls: [],
  nodes: [
    { x: 5, y: 5, label: "Ghost Forum Pulse" },
    { x: 16, y: 4, label: "SEGS Echo" },
    { x: 8, y: 13, label: "Shed-Net Distortion" },
    { x: 19, y: 11, label: "Cabin Conclusion Signal" }
  ],
  scanned: 0,
  finished: false
};

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
}

function drawTile(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
}

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
  return points.some(([px, py]) => {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    return world.walls.some((w) => w.x === tx && w.y === ty);
  });
}

function updatePlayer() {
  let dx = 0;
  let dy = 0;
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
window.addEventListener("keyup", (e) => (keys[e.key] = false));

buildWalls();
loop();
