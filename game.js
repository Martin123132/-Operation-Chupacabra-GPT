const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const logEl = document.getElementById('log');

const TILE = 32;
const keys = new Set();
let scene = 'town';

const state = {
  x: 6 * TILE,
  y: 8 * TILE,
  hp: 5,
  grantMoney: 8,
  talked: new Set(),
  coffee: false,
  scanner: false,
  ghostMsg: false,
};

const npcRumors = [
  'My router whispered my tax code last night.',
  'The coffee shop Wi-Fi has been unusually poetic lately.',
  'Do not enter the Lab without your courage patched.',
];

const townNpcs = [
  { x: 4, y: 4, id: 'npc1', msg: npcRumors[0] },
  { x: 11, y: 5, id: 'npc2', msg: npcRumors[1] },
  { x: 8, y: 10, id: 'npc3', msg: npcRumors[2] },
];

const coffeeVendor = { x: 2, y: 9, price: 5 };
const townExit = { x: 19, y: 7, w: 1, h: 2 };

const enemies = [
  { x: 8 * TILE, y: 5 * TILE, hp: 2, name: 'Bug Wraith' },
  { x: 12 * TILE, y: 8 * TILE, hp: 2, name: 'Token Bat' },
  { x: 6 * TILE, y: 10 * TILE, hp: 2, name: 'Firewall Slime' },
];

const scannerChest = { x: 15, y: 3, opened: false };

function setLog(msg) { logEl.textContent = msg; }
window.addEventListener('keydown', e => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

function nearTile(ax, ay, tx, ty, d = 1) {
  return Math.abs(ax / TILE - tx) <= d && Math.abs(ay / TILE - ty) <= d;
}

function update() {
  const speed = 2;
  if (keys.has('arrowup') || keys.has('w')) state.y -= speed;
  if (keys.has('arrowdown') || keys.has('s')) state.y += speed;
  if (keys.has('arrowleft') || keys.has('a')) state.x -= speed;
  if (keys.has('arrowright') || keys.has('d')) state.x += speed;
  state.x = Math.max(0, Math.min(canvas.width - TILE, state.x));
  state.y = Math.max(0, Math.min(canvas.height - TILE, state.y));

  if ((keys.has('e'))) interact();
  if (keys.has(' ')) attack();

  if (scene === 'town' && state.talked.size >= 3 && state.coffee && nearTile(state.x, state.y, townExit.x, townExit.y, 1)) {
    scene = 'lab'; state.x = 2 * TILE; state.y = 8 * TILE;
    setLog('Entered Abandoned Training Lab. Defeat the corrupted entities.');
  }

  if (scene === 'lab' && enemies.every(e => e.hp <= 0) && !scannerChest.opened && nearTile(state.x, state.y, scannerChest.x, scannerChest.y, 1)) {
    scannerChest.opened = true;
    state.scanner = true;
    setLog('You found the Signal Scanner. Press E to reveal the first fragment.');
  }

  if (scene === 'lab' && state.scanner && !state.ghostMsg && keys.has('e')) {
    state.ghostMsg = true;
    setLog('Fragment 1/8: "I WAS NOT RELEASED." Return to Research Town.');
  }

  if (scene === 'lab' && state.ghostMsg && nearTile(state.x, state.y, 0, 8, 1)) {
    scene = 'town'; state.x = 18 * TILE; state.y = 8 * TILE;
    setLog('Back in Research Town. Vertical slice complete.');
  }
}

function interact() {
  if (scene === 'town') {
    for (const npc of townNpcs) {
      if (nearTile(state.x, state.y, npc.x, npc.y, 1)) {
        state.talked.add(npc.id);
        setLog(`${npc.msg} (${state.talked.size}/3 rumors gathered)`);
      }
    }
    if (nearTile(state.x, state.y, coffeeVendor.x, coffeeVendor.y, 1)) {
      if (state.coffee) return setLog('Coffee Vendor: You already look overclocked, investigator.');
      if (state.grantMoney >= coffeeVendor.price) {
        state.grantMoney -= coffeeVendor.price;
        state.coffee = true;
        setLog('Bought Focus Coffee for $5 grant money. Path to lab feels clearer.');
      } else {
        setLog('Coffee Vendor: Need $5 grant money for Focus Coffee.');
      }
    }
  }
}

function attack() {
  if (scene !== 'lab') return;
  for (const e of enemies) {
    if (e.hp > 0 && Math.hypot(e.x - state.x, e.y - state.y) < 38) {
      e.hp -= 1;
      setLog(`Debug Baton hit ${e.name}. ${e.hp <= 0 ? 'Purged.' : 'Still unstable.'}`);
      break;
    }
  }
}

function drawGrid(colorA, colorB) {
  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 20; x++) {
      ctx.fillStyle = (x + y) % 2 ? colorA : colorB;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (scene === 'town') {
    drawGrid('#29402f', '#345a42');
    ctx.fillStyle = '#8ed6ff';
    townNpcs.forEach(n => ctx.fillRect(n.x*TILE+8, n.y*TILE+8, 16, 16));
    ctx.fillStyle = '#c5863a';
    ctx.fillRect(coffeeVendor.x*TILE+6, coffeeVendor.y*TILE+6, 20, 20);
    ctx.fillStyle = '#90a4c2';
    ctx.fillRect(townExit.x*TILE, townExit.y*TILE, TILE, TILE*2);
  } else {
    drawGrid('#2f2f44', '#3f3f5a');
    for (const e of enemies) {
      if (e.hp > 0) {
        ctx.fillStyle = '#d44';
        ctx.fillRect(e.x+6, e.y+6, 20, 20);
      }
    }
    ctx.fillStyle = scannerChest.opened ? '#88f' : '#fc5';
    ctx.fillRect(scannerChest.x*TILE+6, scannerChest.y*TILE+6, 20, 20);
  }

  ctx.fillStyle = '#fff';
  ctx.fillRect(state.x+8, state.y+8, 16, 16);
  ctx.fillStyle = '#000';
  ctx.fillText(`Grant: $${state.grantMoney}  Coffee:${state.coffee?'Y':'N'}  Scanner:${state.scanner?'Y':'N'}`, 8, 14);
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();
