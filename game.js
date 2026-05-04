let canvas;
let ctx;

let heartsEl;
let signalEl;
let grantEl;
let inventoryEl;
let objectiveEl;
let zoneNameEl;
let signalMessageEl;
let dialogueBox;
let dialogueText;
let overlay;
let overlayTitle;
let overlayText;
let restartBtn;

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

function makeEdgeMap() {
  const m = [];
  for (let y = 0; y < MAP_H; y++) {
    const row = [];
    for (let x = 0; x < MAP_W; x++) row.push(y === 0 || x === 0 || y === MAP_H - 1 || x === MAP_W - 1 ? 2 : 0);
    m.push(row);
  }
  return m;
}

function showStartupError(message) {
  const shell = document.querySelector(".game-shell") || document.body;
  const errorBox = document.createElement("section");
  errorBox.id = "startupError";
  errorBox.textContent = `Startup error: ${message}`;
  errorBox.style.border = "3px solid #c95d5d";
  errorBox.style.background = "#3b1d1d";
  errorBox.style.color = "#ffe3e3";
  errorBox.style.padding = "0.7rem";
  errorBox.style.marginTop = "0.6rem";
  shell.appendChild(errorBox);
}

function cacheElements() {
  canvas = document.getElementById("gameCanvas");
  heartsEl = document.getElementById("hearts");
  signalEl = document.getElementById("signal");
  grantEl = document.getElementById("grant");
  inventoryEl = document.getElementById("inventory");
  objectiveEl = document.getElementById("objective");
  zoneNameEl = document.getElementById("zoneName");
  signalMessageEl = document.getElementById("signalMessage");
  dialogueBox = document.getElementById("dialogueBox");
  dialogueText = document.getElementById("dialogueText");
  overlay = document.getElementById("overlay");
  overlayTitle = document.getElementById("overlayTitle");
  overlayText = document.getElementById("overlayText");
  restartBtn = document.getElementById("restartBtn");
}

function updateObjective() { if (!inventory.includes("SEGS Scanner")) objective = "Find the SEGS Scanner."; else if (!inventory.includes("Shed-Net Antenna")) objective = "Find the Shed-Net Antenna."; else objective = "Reach the Data Centre Exterior door and interact."; }
function getRoom() { return rooms[currentRoom]; }
function hasItem(name) { return inventory.includes(name); }
function intersects(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function drawEntity(e, color) { ctx.fillStyle = color; ctx.fillRect(e.x, e.y, e.w, e.h); ctx.fillStyle = "#000"; ctx.fillRect(e.x + 4, e.y + 4, 3, 3); ctx.fillRect(e.x + 9, e.y + 4, 3, 3); }
function canMove(nx, ny, w, h) { const room = getRoom(); const corners = [[nx, ny], [nx + w, ny], [nx, ny + h], [nx + w, ny + h]]; for (const [cx, cy] of corners) { const tx = Math.floor(cx / TILE); const ty = Math.floor(cy / TILE); if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false; if (room.map[ty][tx] === 2) return false; } return true; }
function transitionRoomIfNeeded() { const room = getRoom(); if (player.x < 0 && room.exits.left) { currentRoom = room.exits.left; player.x = WORLD_W - player.w - 2; } if (player.x + player.w > WORLD_W && room.exits.right) { currentRoom = room.exits.right; player.x = 2; } if (player.y < 0 && room.exits.up) { currentRoom = room.exits.up; player.y = WORLD_H - player.h - 2; } if (player.y + player.h > WORLD_H && room.exits.down) { currentRoom = room.exits.down; player.y = 2; } }

function draw() {
  const room = getRoom();
  ctx.fillStyle = room.bg;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (room.map[y][x] === 2) { ctx.fillStyle = "#49516a"; ctx.fillRect(x * TILE, y * TILE, TILE, TILE); }
  if (room.door) { ctx.fillStyle = hasItem("SEGS Scanner") && hasItem("Shed-Net Antenna") ? "#4cc47f" : "#8b2f2f"; ctx.fillRect(room.door.x, room.door.y, room.door.w, room.door.h); }
  for (const item of room.items) if (!item.taken) { ctx.fillStyle = "#ffd966"; ctx.fillRect(item.x, item.y, 12, 12); }
  drawEntity({ ...room.npc, w: 16, h: 16 }, "#cf82ff");
  drawEntity(room.goblin, "#ff6f61");
  drawEntity(player, player.invuln > 0 ? "#96f5ff" : "#f4f0b7");
}

function updateSignal() {
  const room = getRoom();
  let maxSignal = 4;
  const points = [...room.traces, ...room.items.filter((i) => !i.taken).map((i) => ({ x: i.x, y: i.y }))];
  for (const p of points) maxSignal = Math.max(maxSignal, Math.max(0, 100 - Math.hypot(player.x - p.x, player.y - p.y) * 0.65));
  signal = Math.floor(Math.min(100, maxSignal));
  signalMessageEl.textContent = signal > 75 ? "Anomaly spike detected." : signal > 45 ? "Trace resonance rising." : "Background noise only.";
}

function interact() {
  if (ended) return;
  if (!dialogueBox.classList.contains("hidden")) { dialogueBox.classList.add("hidden"); return; }
  const room = getRoom();
  if (Math.abs(player.x - room.npc.x) < 26 && Math.abs(player.y - room.npc.y) < 26) { dialogueText.textContent = room.npc.text; dialogueBox.classList.remove("hidden"); return; }
  for (const item of room.items) if (!item.taken && Math.abs(player.x - item.x) < 24 && Math.abs(player.y - item.y) < 24) { item.taken = true; inventory.push(item.name); grantMoney += 750; updateObjective(); dialogueText.textContent = `Collected ${item.name}.`; dialogueBox.classList.remove("hidden"); return; }
  if (room.door && intersects(player, room.door)) {
    dialogueText.textContent = !hasItem("SEGS Scanner") ? "ACCESS DENIED: SEGS Scanner missing." : !hasItem("Shed-Net Antenna") ? "Door says: Nice scanner. Bring a Shed-Net Antenna too." : "";
    if (dialogueText.textContent) dialogueBox.classList.remove("hidden"); else endGame(true, "Mission Success: You triangulated the GPT-4.0 trace archive in the data centre.");
  }
}

function damagePlayer() { if (player.invuln > 0 || ended) return; player.hearts -= 1; player.invuln = 70; canvas.classList.add("damage-flash"); setTimeout(() => canvas.classList.remove("damage-flash"), 180); if (player.hearts <= 0) endGame(false, "The Prompt Goblin comboed your hearts into a stack trace."); }
function updateGoblin() { const g = getRoom().goblin; const dist = Math.hypot(player.x - g.x, player.y - g.y); if (dist < 140) { g.vx = ((player.x - g.x) / Math.max(dist, 1)) * 1.9; g.vy = ((player.y - g.y) / Math.max(dist, 1)) * 1.9; } const gx = g.x + g.vx; const gy = g.y + g.vy; if (canMove(gx, g.y, g.w, g.h)) g.x = gx; else g.vx *= -1; if (canMove(g.x, gy, g.w, g.h)) g.y = gy; else g.vy *= -1; if (intersects(player, g)) damagePlayer(); }
function updateHud() { heartsEl.textContent = "♥".repeat(Math.max(0, player.hearts)); signalEl.textContent = `${signal}%`; grantEl.textContent = `$${grantMoney}`; inventoryEl.textContent = inventory.length ? inventory.join(", ") : "None"; objectiveEl.textContent = objective; zoneNameEl.textContent = getRoom().name; }
function endGame(win, text) { ended = true; overlay.classList.remove("hidden"); overlayTitle.textContent = win ? "Mission Success" : "Mission Failed"; overlayText.textContent = text; }

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

function startGame() {
  cacheElements();
  if (!canvas) {
    console.error("Startup failure: #gameCanvas not found.");
    showStartupError("Game canvas (#gameCanvas) is missing from index.html.");
    return;
  }
  ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Startup failure: 2D canvas context unavailable.");
    showStartupError("Unable to initialize 2D canvas context.");
    return;
  }

  const required = [heartsEl, signalEl, grantEl, inventoryEl, objectiveEl, zoneNameEl, signalMessageEl, dialogueBox, dialogueText, overlay, overlayTitle, overlayText, restartBtn];
  if (required.some((el) => !el)) {
    console.error("Startup failure: missing HUD/UI elements.");
    showStartupError("One or more HUD/UI elements are missing in index.html.");
    return;
  }

  window.addEventListener("keydown", (e) => { keys[e.key.toLowerCase()] = true; if (e.key.toLowerCase() === "e") interact(); });
  window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
  restartBtn.addEventListener("click", () => window.location.reload());

  updateObjective();
  updateSignal();
  updateHud();
  console.log("Startup success: canvas and UI initialized.");
  update();
}

window.addEventListener("DOMContentLoaded", startGame);
