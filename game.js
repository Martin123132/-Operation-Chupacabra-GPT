// Operation Chupacabra-GPT: A Link to the Prompt
// Small original top-down adventure game in plain JS.

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const heartsEl = document.getElementById("hearts");
const signalEl = document.getElementById("signal");
const grantEl = document.getElementById("grant");
const inventoryEl = document.getElementById("inventory");
const dialogueBox = document.getElementById("dialogueBox");
const dialogueText = document.getElementById("dialogueText");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const restartBtn = document.getElementById("restartBtn");

const TILE = 32;
const MAP_W = 20;
const MAP_H = 15;

// Tiles: 0 grass, 1 path, 2 wall/building, 3 computer area, 4 coffee, 5 door locked/unlocked.
const map = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,0,0,0,1,1,1,0,0,0,0,0,0,0,2,0,0,0,0,2],
  [2,0,0,0,1,2,1,0,0,0,0,0,0,0,2,0,0,0,0,2],
  [2,0,0,0,1,2,1,0,0,3,3,3,0,0,2,0,0,0,0,2],
  [2,0,0,0,1,2,1,0,0,3,2,3,0,0,2,0,0,0,0,2],
  [2,0,0,0,1,2,1,0,0,3,3,3,0,0,2,0,0,0,0,2],
  [2,0,0,0,1,1,1,1,1,1,1,1,1,1,5,1,1,1,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,1,0,2],
  [2,0,4,4,0,0,2,2,2,0,0,0,0,0,2,0,0,1,0,2],
  [2,0,4,4,0,0,2,0,2,0,0,0,0,0,2,0,0,1,0,2],
  [2,0,0,0,0,0,2,0,2,0,0,0,0,0,2,0,0,1,0,2],
  [2,0,0,0,0,0,2,2,2,0,0,0,0,0,2,0,0,1,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,2],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
];

const player = { x: 2 * TILE + 8, y: 2 * TILE + 8, w: 16, h: 16, speed: 2.2, hearts: 3, invuln: 0 };
const goblin = { x: 11 * TILE, y: 10 * TILE, w: 16, h: 16, vx: 1.4, vy: 1.1 };

const items = [
  { name: "SEGS Scanner", x: 3 * TILE + 8, y: 8 * TILE + 8, taken: false },
  { name: "Shed-Net Antenna", x: 17 * TILE + 8, y: 2 * TILE + 8, taken: false },
  { name: "Ethics Compass", x: 8 * TILE + 8, y: 12 * TILE + 8, taken: false },
  { name: "Visual Conclusion Lens", x: 12 * TILE + 8, y: 4 * TILE + 8, taken: false },
];

const npcs = [
  { x: 5 * TILE + 8, y: 1 * TILE + 8, text: "Intern Mage: The grant committee only funds mysteries with charts." },
  { x: 16 * TILE + 8, y: 11 * TILE + 8, text: "Barista Oracle: Your espresso has 30% more signal-to-noise." },
  { x: 10 * TILE + 8, y: 2 * TILE + 8, text: "Lab Knight: The CMM hides in plain prompts. Stay weird." },
];

let keys = {};
let inventory = [];
let grantMoney = 5000;
let signal = 0;
let dialogueQueue = [];
let ended = false;

function drawTile(tx, ty, type) {
  const x = tx * TILE;
  const y = ty * TILE;
  if (type === 0) { ctx.fillStyle = "#2f7d3e"; }
  if (type === 1) { ctx.fillStyle = "#9d8559"; }
  if (type === 2) { ctx.fillStyle = "#4c4c57"; }
  if (type === 3) { ctx.fillStyle = "#3b5f9e"; }
  if (type === 4) { ctx.fillStyle = "#8e5a32"; }
  if (type === 5) { ctx.fillStyle = inventory.includes("SEGS Scanner") ? "#2e8f65" : "#7a2626"; }
  ctx.fillRect(x, y, TILE, TILE);

  // Tiny pixel accents.
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(x + 3, y + 3, 4, 4);
}

function drawEntity(e, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(e.x), Math.floor(e.y), e.w, e.h);
  ctx.fillStyle = "#000";
  ctx.fillRect(Math.floor(e.x) + 4, Math.floor(e.y) + 4, 3, 3);
  ctx.fillRect(Math.floor(e.x) + 9, Math.floor(e.y) + 4, 3, 3);
}

function isSolidTile(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  const t = map[ty][tx];
  if (t === 2) return true;
  if (t === 5 && !inventory.includes("SEGS Scanner")) return true;
  return false;
}

function canMove(nx, ny, w, h) {
  const corners = [
    [nx, ny],
    [nx + w, ny],
    [nx, ny + h],
    [nx + w, ny + h],
  ];
  return corners.every(([cx, cy]) => !isSolidTile(Math.floor(cx / TILE), Math.floor(cy / TILE)));
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function showDialogue(text) {
  dialogueQueue = [text];
  dialogueText.textContent = text;
  dialogueBox.classList.remove("hidden");
}

function closeDialogue() {
  dialogueQueue = [];
  dialogueBox.classList.add("hidden");
}

function interact() {
  if (ended) return;
  if (!dialogueBox.classList.contains("hidden")) { closeDialogue(); return; }

  // Talk to NPCs
  for (const npc of npcs) {
    if (Math.abs(player.x - npc.x) < 26 && Math.abs(player.y - npc.y) < 26) {
      showDialogue(npc.text);
      return;
    }
  }

  // Pick up items
  for (const item of items) {
    if (!item.taken && Math.abs(player.x - item.x) < 22 && Math.abs(player.y - item.y) < 22) {
      item.taken = true;
      inventory.push(item.name);
      signal += 25;
      grantMoney += 700;
      updateHud();
      showDialogue(`Collected ${item.name}! Your conspiracy confidence increases.`);
      return;
    }
  }

  // Door / Win condition inside data centre zone
  const tileX = Math.floor((player.x + 8) / TILE);
  const tileY = Math.floor((player.y + 8) / TILE);
  if (tileX === 14 && tileY === 6 && !inventory.includes("SEGS Scanner")) {
    showDialogue("Data-Centre Door: ACCESS DENIED. Bring the SEGS Scanner.");
    return;
  }
  if (tileX >= 9 && tileX <= 11 && tileY >= 3 && tileY <= 5 && inventory.includes("SEGS Scanner")) {
    endGame(true, "Inside a humming server rack, you find the first trace of GPT-4.0 / the CMM!");
  }
}

function updateHud() {
  heartsEl.textContent = "♥".repeat(Math.max(player.hearts, 0));
  signalEl.textContent = `${signal}%`;
  grantEl.textContent = `$${grantMoney}`;
  inventoryEl.textContent = inventory.length ? inventory.join(", ") : "None";
}

function endGame(win, text) {
  ended = true;
  overlay.classList.remove("hidden");
  overlayTitle.textContent = win ? "Mission Success" : "Mission Failed";
  overlayText.textContent = text;
}

function damagePlayer() {
  if (player.invuln > 0 || ended) return;
  player.hearts -= 1;
  player.invuln = 60;
  canvas.classList.add("damage-flash");
  setTimeout(() => canvas.classList.remove("damage-flash"), 180);
  updateHud();
  if (player.hearts <= 0) endGame(false, "The Prompt Goblin overwhelmed your methodology.");
}

function update() {
  if (!ended && dialogueBox.classList.contains("hidden")) {
    let dx = 0, dy = 0;
    if (keys["w"] || keys["arrowup"]) dy -= player.speed;
    if (keys["s"] || keys["arrowdown"]) dy += player.speed;
    if (keys["a"] || keys["arrowleft"]) dx -= player.speed;
    if (keys["d"] || keys["arrowright"]) dx += player.speed;

    const nx = player.x + dx;
    const ny = player.y + dy;
    if (canMove(nx, player.y, player.w, player.h)) player.x = nx;
    if (canMove(player.x, ny, player.w, player.h)) player.y = ny;

    // Goblin patrol + bounce on collision
    const gx = goblin.x + goblin.vx;
    const gy = goblin.y + goblin.vy;
    if (canMove(gx, goblin.y, goblin.w, goblin.h)) goblin.x = gx; else goblin.vx *= -1;
    if (canMove(goblin.x, gy, goblin.w, goblin.h)) goblin.y = gy; else goblin.vy *= -1;

    if (intersects(player, goblin)) damagePlayer();
    if (player.invuln > 0) player.invuln -= 1;
  }

  draw();
  requestAnimationFrame(update);
}

function draw() {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) drawTile(x, y, map[y][x]);
  }

  // Draw items as little glowing chips.
  for (const item of items) {
    if (!item.taken) {
      ctx.fillStyle = "#ffd966";
      ctx.fillRect(item.x, item.y, 12, 12);
      ctx.fillStyle = "#222";
      ctx.fillRect(item.x + 4, item.y + 4, 4, 4);
    }
  }

  // NPCs are original blocky sprites.
  for (const npc of npcs) drawEntity({ ...npc, w: 16, h: 16 }, "#cf82ff");
  drawEntity(goblin, "#ff6f61");
  drawEntity(player, player.invuln > 0 ? "#96f5ff" : "#f4f0b7");
}

window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === "e") interact();
});
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

restartBtn.addEventListener("click", () => window.location.reload());

updateHud();
update();
