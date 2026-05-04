const canvas = document.getElementById("gameCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

const heartsEl = document.getElementById("hearts");
const signalEl = document.getElementById("signal");
const grantEl = document.getElementById("grant");
const inventoryEl = document.getElementById("inventory");
const objectiveEl = document.getElementById("objective");
const zoneNameEl = document.getElementById("zoneName");
const signalMessageEl = document.getElementById("signalMessage");
const dialogueBox = document.getElementById("dialogueBox");
const dialogueText = document.getElementById("dialogueText");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const restartBtn = document.getElementById("restartBtn");
const debugStatusEl = document.getElementById("debugStatus");

const startup = {
  cssLoaded: false,
  jsLoaded: true,
  canvasFound: Boolean(canvas && ctx),
  renderLoopStarted: false
};

const TILE = 32;
const MAP_W = 20;
const MAP_H = 15;
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;

const rooms = {
  grove: {
    name: "Coffee Shop Signal Grove",
    exits: { right: "swamp", down: "library" },
    bg: "#2d6f46",
    map: makeEdgeMap(),
    items: [{ name: "SEGS Scanner", x: 10 * TILE + 10, y: 7 * TILE + 10, taken: false }],
    traces: [{ x: 4 * TILE + 12, y: 3 * TILE + 12 }, { x: 15 * TILE + 12, y: 11 * TILE + 12 }],
    npc: { x: 3 * TILE + 10, y: 3 * TILE + 10, text: "Barista Druid: Weird static near this grove's center. Maybe scan the lounge moss?" },
    goblin: { x: 15 * TILE, y: 4 * TILE, w: 16, h: 16, vx: 1.3, vy: 1.2 }
  },
  swamp: {
    name: "GitHub Issue Swamp",
    exits: { left: "grove", down: "datacentre" },
    bg: "#486b2f",
    map: makeEdgeMap(),
    items: [{ name: "Shed-Net Antenna", x: 15 * TILE + 10, y: 11 * TILE + 10, taken: false }],
    traces: [{ x: 6 * TILE + 12, y: 8 * TILE + 12 }, { x: 13 * TILE + 12, y: 4 * TILE + 12 }],
    npc: { x: 4 * TILE + 10, y: 10 * TILE + 10, text: "Bug Marshal: To reach the data door, you'll want an antenna. Otherwise the lock just opens a support ticket." },
    goblin: { x: 10 * TILE, y: 5 * TILE, w: 16, h: 16, vx: -1.2, vy: 1.4 }
  },
  library: {
    name: "Community College Library",
    exits: { up: "grove", right: "datacentre" },
    bg: "#4f5177",
    map: makeEdgeMap(),
    items: [{ name: "Ethics Compass", x: 5 * TILE + 10, y: 9 * TILE + 10, taken: false }],
    traces: [{ x: 12 * TILE + 12, y: 3 * TILE + 12 }],
    npc: { x: 15 * TILE + 10, y: 9 * TILE + 10, text: "Librarian Paladin: The server lock hates bad methodology. Bring scanner + antenna, then press E at the terminal door." },
    goblin: { x: 7 * TILE, y: 4 * TILE, w: 16, h: 16, vx: 1.6, vy: -1.1 }
  },
  datacentre: {
    name: "Data Centre Exterior",
    exits: { up: "swamp", left: "library" },
    bg: "#3f566f",
    map: makeEdgeMap(),
    items: [{ name: "Visual Conclusion Lens", x: 4 * TILE + 10, y: 3 * TILE + 10, taken: false }],
    traces: [{ x: 9 * TILE + 12, y: 10 * TILE + 12 }, { x: 15 * TILE + 12, y: 12 * TILE + 12 }],
    npc: { x: 3 * TILE + 10, y: 12 * TILE + 10, text: "Facilities Mage: Door policy is strict: scanner first, antenna second. Bureaucracy is the final boss." },
    goblin: { x: 14 * TILE, y: 6 * TILE, w: 16, h: 16, vx: 1.1, vy: 1.5 },
    door: { x: 10 * TILE, y: 2 * TILE, w: TILE * 2, h: TILE }
  }
};

const player = { x: 2 * TILE + 8, y: 2 * TILE + 8, w: 16, h: 16, speed: 2.2, hearts: 3, invuln: 0 };
let currentRoom = "grove";
let keys = {};
let inventory = [];
let grantMoney = 5000;
let signal = 0;
let objective = "Find the SEGS Scanner.";
let ended = false;

function updateDebugStatus() {
  if (!debugStatusEl) return;
  debugStatusEl.textContent = `CSS loaded: ${startup.cssLoaded ? "yes" : "no"} | JS loaded: ${startup.jsLoaded ? "yes" : "no"} | Canvas found: ${startup.canvasFound ? "yes" : "no"} | Render loop started: ${startup.renderLoopStarted ? "yes" : "no"}`;
}

function checkCssLoaded() {
  const shell = document.querySelector(".game-shell");
  if (!shell) return false;
  const style = window.getComputedStyle(shell);
  return parseFloat(style.borderTopWidth) >= 1;
}

function drawFallbackErrorScreen() {
  if (!ctx || !canvas) return;
  ctx.fillStyle = "#1b0d0d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#852e2e";
  ctx.fillRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = "#fff0f0";
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.fillText("GAME STARTUP ERROR - CHECK CONSOLE", canvas.width / 2, canvas.height / 2);
}

function drawBootFrame() {
  if (!ctx || !canvas) return;
  ctx.fillStyle = "#162035";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#2f4e7a";
  for (let y = 0; y < canvas.height; y += 32) {
    for (let x = 0; x < canvas.width; x += 32) {
      if ((x + y) % 64 === 0) {
        ctx.fillRect(x, y, 32, 32);
      }
    }
  }
  ctx.fillStyle = "#ffcd4a";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "left";
  ctx.fillText("Booting map renderer...", 16, 28);
}

function makeEdgeMap() {
  const m = [];
  for (let y = 0; y < MAP_H; y++) {
    const row = [];
    for (let x = 0; x < MAP_W; x++) {
      row.push(y === 0 || x === 0 || y === MAP_H - 1 || x === MAP_W - 1 ? 2 : 0);
    }
    m.push(row);
  }
  return m;
}

function updateObjective() {
  if (!inventory.includes("SEGS Scanner")) objective = "Find the SEGS Scanner.";
  else if (!inventory.includes("Shed-Net Antenna")) objective = "Find the Shed-Net Antenna.";
  else objective = "Reach the Data Centre Exterior door and interact.";
}

function getRoom() { return rooms[currentRoom]; }
function hasItem(name) { return inventory.includes(name); }
function intersects(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function draw() {
  const room = getRoom();
  ctx.fillStyle = room.bg;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (room.map[y][x] === 2) {
        ctx.fillStyle = "#49516a";
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  if (room.door) {
    ctx.fillStyle = hasItem("SEGS Scanner") && hasItem("Shed-Net Antenna") ? "#4cc47f" : "#8b2f2f";
    ctx.fillRect(room.door.x, room.door.y, room.door.w, room.door.h);
  }

  for (const item of room.items) {
    if (!item.taken) {
      ctx.fillStyle = "#ffd966";
      ctx.fillRect(item.x, item.y, 12, 12);
    }
  }

  const npc = room.npc;
  drawEntity({ ...npc, w: 16, h: 16 }, "#cf82ff");
  drawEntity(room.goblin, "#ff6f61");
  drawEntity(player, player.invuln > 0 ? "#96f5ff" : "#f4f0b7");
}

function drawEntity(e, color) {
  ctx.fillStyle = color;
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = "#000";
  ctx.fillRect(e.x + 4, e.y + 4, 3, 3);
  ctx.fillRect(e.x + 9, e.y + 4, 3, 3);
}

function canMove(nx, ny, w, h) {
  const room = getRoom();
  const corners = [[nx, ny], [nx + w, ny], [nx, ny + h], [nx + w, ny + h]];
  for (const [cx, cy] of corners) {
    const tx = Math.floor(cx / TILE);
    const ty = Math.floor(cy / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
    if (room.map[ty][tx] === 2) return false;
  }
  return true;
}

function transitionRoomIfNeeded() {
  const room = getRoom();
  if (player.x < 0 && room.exits.left) { currentRoom = room.exits.left; player.x = WORLD_W - player.w - 2; }
  if (player.x + player.w > WORLD_W && room.exits.right) { currentRoom = room.exits.right; player.x = 2; }
  if (player.y < 0 && room.exits.up) { currentRoom = room.exits.up; player.y = WORLD_H - player.h - 2; }
  if (player.y + player.h > WORLD_H && room.exits.down) { currentRoom = room.exits.down; player.y = 2; }
}

function updateSignal() {
  const room = getRoom();
  let maxSignal = 4;
  const points = [...room.traces, ...room.items.filter((i) => !i.taken).map((i) => ({ x: i.x, y: i.y }))];
  for (const p of points) {
    const d = Math.hypot(player.x - p.x, player.y - p.y);
    const strength = Math.max(0, 100 - d * 0.65);
    if (strength > maxSignal) maxSignal = strength;
  }
  signal = Math.floor(Math.min(100, maxSignal));
  if (signal > 75) signalMessageEl.textContent = "Anomaly spike detected.";
  else if (signal > 45) signalMessageEl.textContent = "Trace resonance rising.";
  else signalMessageEl.textContent = "Background noise only.";
}

function interact() {
  if (ended) return;
  if (!dialogueBox.classList.contains("hidden")) {
    dialogueBox.classList.add("hidden");
    return;
  }

  const room = getRoom();
  const npc = room.npc;
  if (Math.abs(player.x - npc.x) < 26 && Math.abs(player.y - npc.y) < 26) {
    dialogueText.textContent = npc.text;
    dialogueBox.classList.remove("hidden");
    return;
  }

  for (const item of room.items) {
    if (!item.taken && Math.abs(player.x - item.x) < 24 && Math.abs(player.y - item.y) < 24) {
      item.taken = true;
      inventory.push(item.name);
      grantMoney += 750;
      updateObjective();
      dialogueText.textContent = `Collected ${item.name}.`;
      dialogueBox.classList.remove("hidden");
      return;
    }
  }

  if (room.door && intersects(player, room.door)) {
    if (!hasItem("SEGS Scanner")) {
      dialogueText.textContent = "ACCESS DENIED: SEGS Scanner missing.";
    } else if (!hasItem("Shed-Net Antenna")) {
      dialogueText.textContent = "Door says: Nice scanner. Bring a Shed-Net Antenna too.";
    } else {
      endGame(true, "Mission Success: You triangulated the GPT-4.0 trace archive in the data centre.");
      return;
    }
    dialogueBox.classList.remove("hidden");
  }
}

function damagePlayer() {
  if (player.invuln > 0 || ended) return;
  player.hearts -= 1;
  player.invuln = 70;
  canvas.classList.add("damage-flash");
  setTimeout(() => canvas.classList.remove("damage-flash"), 180);
  if (player.hearts <= 0) endGame(false, "The Prompt Goblin comboed your hearts into a stack trace.");
}

function updateGoblin() {
  const g = getRoom().goblin;
  const dist = Math.hypot(player.x - g.x, player.y - g.y);
  if (dist < 140) {
    const dirX = (player.x - g.x) / Math.max(dist, 1);
    const dirY = (player.y - g.y) / Math.max(dist, 1);
    g.vx = dirX * 1.9;
    g.vy = dirY * 1.9;
  }
  const gx = g.x + g.vx;
  const gy = g.y + g.vy;
  if (canMove(gx, g.y, g.w, g.h)) g.x = gx; else g.vx *= -1;
  if (canMove(g.x, gy, g.w, g.h)) g.y = gy; else g.vy *= -1;
  if (intersects(player, g)) damagePlayer();
}

function updateHud() {
  heartsEl.textContent = "♥".repeat(Math.max(0, player.hearts));
  signalEl.textContent = `${signal}%`;
  grantEl.textContent = `$${grantMoney}`;
  inventoryEl.textContent = inventory.length ? inventory.join(", ") : "None";
  objectiveEl.textContent = objective;
  zoneNameEl.textContent = getRoom().name;
}

function endGame(win, text) {
  ended = true;
  overlay.classList.remove("hidden");
  overlayTitle.textContent = win ? "Mission Success" : "Mission Failed";
  overlayText.textContent = text;
}

function update() {
  if (!ended && dialogueBox.classList.contains("hidden")) {
    let dx = 0;
    let dy = 0;
    if (keys.w || keys.arrowup) dy -= player.speed;
    if (keys.s || keys.arrowdown) dy += player.speed;
    if (keys.a || keys.arrowleft) dx -= player.speed;
    if (keys.d || keys.arrowright) dx += player.speed;

    const nx = player.x + dx;
    const ny = player.y + dy;
    if (canMove(nx, player.y, player.w, player.h) || nx < 0 || nx + player.w > WORLD_W) player.x = nx;
    if (canMove(player.x, ny, player.w, player.h) || ny < 0 || ny + player.h > WORLD_H) player.y = ny;

    transitionRoomIfNeeded();
    updateGoblin();
    updateSignal();

    if (player.invuln > 0) player.invuln -= 1;
  }

  updateHud();
  draw();
  requestAnimationFrame(update);
}

function bootGame() {
  startup.cssLoaded = checkCssLoaded();
  updateDebugStatus();

  if (!canvas || !ctx) {
    console.error("Canvas startup failed: gameCanvas not found or 2D context unavailable.");
    startup.canvasFound = false;
    updateDebugStatus();
    return;
  }

  drawBootFrame();

  window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === "e") interact();
  });
  window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

  if (restartBtn) restartBtn.addEventListener("click", () => window.location.reload());

  updateObjective();
  updateSignal();
  updateHud();

  startup.renderLoopStarted = true;
  updateDebugStatus();
  update();
}

try {
  updateDebugStatus();
  bootGame();
} catch (error) {
  console.error("Game startup crashed:", error);
  startup.renderLoopStarted = false;
  updateDebugStatus();
  drawFallbackErrorScreen();
}
