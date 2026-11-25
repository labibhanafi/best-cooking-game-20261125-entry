// Ember & Ladle: kitchen state and rules. One clear job: hold the whole
// shift (chef, orders, boards, burners, plates, coins) and step it forward.
// Rendering lives in render.js, input in input.js, sound in audio.js.

import {
  CHEF, COOK, INGREDIENTS, INGREDIENT_ORDER, RECIPES, SHIFT_SECONDS, VIEW,
  STATIONS, boardRect, burnerRect, pantryBinRect, plateSlotRect,
} from './config.js';
import {
  playBurnt, playChop, playChopDone, playCookDone, playError, playOrderIn,
  playPickup, playPlace, playRush, playServe, startSizzle, stopSizzle,
} from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function centre(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function createWorld(seed) {
  return {
    screen: SCREEN_TITLE,
    rng: mulberry32(seed || 20261125),
    time: 0,
    timeLeft: SHIFT_SECONDS,
    chef: { x: 640, y: 470, dir: 1, moving: false, carried: [] },
    moveTarget: null,
    orders: [],
    orderSeq: 0,
    spawnTimer: COOK.spawnFirstSeconds,
    boards: [{ item: null, progress: 0 }, { item: null, progress: 0 }],
    burners: [{ item: null, progress: 0 }, { item: null, progress: 0 }],
    plates: [{ items: [] }, { items: [] }, { items: [] }],
    coins: 0,
    served: 0,
    missed: 0,
    combo: 0,
    bestCombo: 0,
    rush: false,
    rushAnnounced: false,
    popups: [],
    servedFlash: 0,
    chopTick: 0,
  };
}

export function startShift(world) {
  world.screen = SCREEN_PLAY;
  world.time = 0;
  world.timeLeft = SHIFT_SECONDS;
  world.orders = [];
  world.spawnTimer = COOK.spawnFirstSeconds;
  world.boards = [{ item: null, progress: 0 }, { item: null, progress: 0 }];
  world.burners = [{ item: null, progress: 0 }, { item: null, progress: 0 }];
  world.plates = [{ items: [] }, { items: [] }, { items: [] }];
  world.chef.carried = [];
  world.coins = 0;
  world.served = 0;
  world.missed = 0;
  world.combo = 0;
  world.bestCombo = 0;
  world.rush = false;
  world.rushAnnounced = false;
  world.popups = [];
}

export function plateMatchesOrder(plate, order) {
  if (plate.items.length !== 3) return false;
  const needs = [...order.recipe.needs].sort().join('|');
  const has = [...plate.items].sort().join('|');
  return needs === has;
}

export function isPlateReady(world, plate) {
  return world.orders.some((order) => plateMatchesOrder(plate, order));
}

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id);
}

function addPopup(world, x, y, text, colour) {
  world.popups.push({ x, y, text, colour, life: 1.4 });
}

function spawnOrder(world) {
  const recipe = RECIPES[Math.floor(world.rng() * RECIPES.length)];
  const maxTime = world.rush ? COOK.patienceRushSeconds : COOK.patienceStartSeconds;
  world.orders.push({
    id: world.orderSeq + 1,
    recipe,
    timeLeft: maxTime,
    maxTime,
  });
  world.orderSeq += 1;
  playOrderIn();
}

function servePlate(world, plateIndex) {
  const plate = world.plates[plateIndex];
  const orderIndex = world.orders.findIndex((order) => plateMatchesOrder(plate, order));
  if (orderIndex === -1) return false;
  const order = world.orders[orderIndex];
  world.orders.splice(orderIndex, 1);
  const patienceBonus = Math.round(10 * (order.timeLeft / order.maxTime));
  const comboBonus = Math.min(world.combo, 8) * 2;
  const earned = order.recipe.base + patienceBonus + comboBonus;
  world.coins += earned;
  world.served += 1;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.plates[plateIndex] = { items: [] };
  const win = centre(STATIONS.window);
  addPopup(world, win.x, win.y - 60, `+${earned} coins`, '#ffd94d');
  if (world.combo >= 3) addPopup(world, win.x, win.y - 92, `COMBO x${world.combo}!`, '#ff9f43');
  world.servedFlash = 0.9;
  playServe();
  return true;
}

// --- Interaction: the chef's hands. One press does the nearest sensible thing.
function carriedPlateIndex(world) {
  return world.chef.carried.findIndex((item) => item.plate);
}

function nearestStation(world, rects) {
  let best = -1;
  let bestDist = CHEF.interactRange;
  rects.forEach((rect, index) => {
    const c = centre(rect);
    const d = dist(world.chef.x, world.chef.y, c.x, c.y);
    if (d < bestDist) {
      bestDist = d;
      best = index;
    }
  });
  return best;
}

function tryPantry(world, binIndex) {
  if (world.chef.carried.length >= CHEF.carryMax) return false;
  if (carriedPlateIndex(world) !== -1) return false;
  const bins = INGREDIENT_ORDER.map((_, index) => pantryBinRect(index));
  const bin = binIndex !== undefined ? binIndex : nearestStation(world, bins);
  if (bin === -1) return false;
  world.chef.carried.push({ id: INGREDIENT_ORDER[bin], state: 'raw' });
  playPickup();
  return true;
}

function tryBoard(world, boardIndex) {
  const rects = [boardRect(0), boardRect(1)];
  const board = boardIndex !== undefined ? boardIndex : nearestStation(world, rects);
  if (board === -1) return false;
  const slot = world.boards[board];
  if (slot.item && slot.item.state === 'chopped') {
    if (world.chef.carried.length >= CHEF.carryMax) return false;
    world.chef.carried.push(slot.item);
    world.boards[board] = { item: null, progress: 0 };
    playPickup();
    return true;
  }
  if (!slot.item) {
    const rawIndex = world.chef.carried.findIndex(
      (item) => !item.plate && item.state === 'raw' && INGREDIENTS[item.id].prep === 'chop',
    );
    if (rawIndex === -1) return false;
    world.boards[board] = { item: world.chef.carried[rawIndex], progress: 0 };
    world.chef.carried.splice(rawIndex, 1);
    playPlace();
    return true;
  }
  return false;
}

function tryBurner(world, burnerIndex) {
  const rects = [burnerRect(0), burnerRect(1)];
  const burner = burnerIndex !== undefined ? burnerIndex : nearestStation(world, rects);
  if (burner === -1) return false;
  const slot = world.burners[burner];
  if (slot.item && (slot.item.state === 'cooked' || slot.item.state === 'burnt')) {
    if (world.chef.carried.length >= CHEF.carryMax) return false;
    world.chef.carried.push(slot.item);
    world.burners[burner] = { item: null, progress: 0 };
    playPickup();
    return true;
  }
  if (!slot.item) {
    const rawIndex = world.chef.carried.findIndex(
      (item) => !item.plate && item.state === 'raw' && INGREDIENTS[item.id].prep === 'cook',
    );
    if (rawIndex === -1) return false;
    world.burners[burner] = { item: world.chef.carried[rawIndex], progress: 0 };
    world.chef.carried.splice(rawIndex, 1);
    playPlace();
    startSizzle();
    return true;
  }
  return false;
}

function tryCounter(world, slotIndex) {
  const rects = [plateSlotRect(0), plateSlotRect(1), plateSlotRect(2)];
  if (slotIndex === undefined && nearestStation(world, rects) === -1) return false;
  const plateHeld = carriedPlateIndex(world);
  if (plateHeld !== -1) {
    const empty = slotIndex !== undefined
      ? (world.plates[slotIndex].items.length === 0 ? slotIndex : -1)
      : world.plates.findIndex((plate) => plate.items.length === 0);
    if (empty === -1) return false;
    world.plates[empty] = { items: [...world.chef.carried[plateHeld].items] };
    world.chef.carried.splice(plateHeld, 1);
    playPlace();
    return true;
  }
  const preppedIndex = world.chef.carried.findIndex(
    (item) => !item.plate && (item.state === 'chopped' || item.state === 'cooked'),
  );
  if (preppedIndex !== -1) {
    let target = -1;
    if (slotIndex !== undefined) {
      target = world.plates[slotIndex].items.length < 3 ? slotIndex : -1;
    } else {
      const slot = world.plates.findIndex((plate) => plate.items.length > 0 && plate.items.length < 3);
      target = slot !== -1 ? slot : world.plates.findIndex((plate) => plate.items.length === 0);
    }
    if (target === -1) return false;
    world.plates[target].items.push(world.chef.carried[preppedIndex].id);
    world.chef.carried.splice(preppedIndex, 1);
    playPlace();
    return true;
  }
  if (world.chef.carried.length === 0) {
    const ready = slotIndex !== undefined
      ? (isPlateReady(world, world.plates[slotIndex]) ? slotIndex : -1)
      : world.plates.findIndex((plate) => isPlateReady(world, plate));
    if (ready === -1) return false;
    world.chef.carried.push({ plate: true, items: [...world.plates[ready].items] });
    world.plates[ready] = { items: [] };
    playPickup();
    return true;
  }
  return false;
}

function tryWindow(world) {
  const win = centre(STATIONS.window);
  if (dist(world.chef.x, world.chef.y, win.x, win.y) > CHEF.interactRange) return false;
  const plateHeld = carriedPlateIndex(world);
  if (plateHeld === -1) return false;
  const held = world.chef.carried[plateHeld];
  const orderIndex = world.orders.findIndex((order) => {
    const needs = [...order.recipe.needs].sort().join('|');
    return [...held.items].sort().join('|') === needs;
  });
  if (orderIndex === -1) {
    playError();
    addPopup(world, world.chef.x, world.chef.y - 50, 'No order wants this!', '#ff6b6b');
    return true;
  }
  const order = world.orders[orderIndex];
  world.orders.splice(orderIndex, 1);
  const patienceBonus = Math.round(10 * (order.timeLeft / order.maxTime));
  const comboBonus = Math.min(world.combo, 8) * 2;
  const earned = order.recipe.base + patienceBonus + comboBonus;
  world.coins += earned;
  world.served += 1;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.chef.carried.splice(plateHeld, 1);
  addPopup(world, win.x, win.y - 60, `+${earned} coins`, '#ffd94d');
  if (world.combo >= 3) addPopup(world, win.x, win.y - 92, `COMBO x${world.combo}!`, '#ff9f43');
  world.servedFlash = 0.9;
  playServe();
  return true;
}

function tryTrash(world) {
  const bin = centre(STATIONS.trash);
  if (dist(world.chef.x, world.chef.y, bin.x, bin.y) > CHEF.interactRange) return false;
  if (world.chef.carried.length === 0) return false;
  const burntIndex = world.chef.carried.findIndex((item) => item.state === 'burnt');
  const dropIndex = burntIndex !== -1 ? burntIndex : world.chef.carried.length - 1;
  world.chef.carried.splice(dropIndex, 1);
  playPlace();
  return true;
}

export function interact(world) {
  if (world.screen !== SCREEN_PLAY) return;
  if (tryWindow(world)) return;
  if (tryCounter(world)) return;
  if (tryBoard(world)) return;
  if (tryBurner(world)) return;
  if (tryPantry(world)) return;
  if (tryTrash(world)) return;
  playError();
}

// Click-to-move arrival: use the exact station the player clicked.
export function interactAt(world, target) {
  if (world.screen !== SCREEN_PLAY) return;
  if (!target) {
    interact(world);
    return;
  }
  let done = false;
  if (target.kind === 'pantry') done = tryPantry(world, target.index);
  else if (target.kind === 'board') done = tryBoard(world, target.index);
  else if (target.kind === 'burner') done = tryBurner(world, target.index);
  else if (target.kind === 'counter') done = tryCounter(world, target.index);
  else if (target.kind === 'window') done = tryWindow(world);
  else if (target.kind === 'trash') done = tryTrash(world);
  if (!done) interact(world);
}

// --- Movement and the per-frame step.
function moveChef(world, dt, input) {
  const chef = world.chef;
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (dx === 0 && dy === 0 && world.moveTarget) {
    const tx = world.moveTarget.x;
    const ty = world.moveTarget.y;
    const d = dist(chef.x, chef.y, tx, ty);
    if (d < 8) {
      const pending = world.moveTarget.action;
      const target = world.moveTarget.target;
      world.moveTarget = null;
      if (pending === 'interact') interactAt(world, target);
    } else {
      dx = (tx - chef.x) / d;
      dy = (ty - chef.y) / d;
    }
  }
  const len = Math.hypot(dx, dy);
  if (len > 0) {
    dx /= len;
    dy /= len;
    chef.x += dx * CHEF.speed * dt;
    chef.y += dy * CHEF.speed * dt;
    chef.dir = dx !== 0 ? Math.sign(dx) : chef.dir;
    chef.moving = true;
  } else {
    chef.moving = false;
  }
  chef.x = Math.max(40, Math.min(VIEW.width - 40, chef.x));
  chef.y = Math.max(200, Math.min(VIEW.height - 40, chef.y));
}

function stepStations(world, dt) {
  world.boards.forEach((slot) => {
    if (!slot.item || slot.item.state !== 'raw') return;
    slot.progress += dt / COOK.chopSeconds;
    world.chopTick += dt;
    if (world.chopTick > 0.55) {
      world.chopTick = 0;
      playChop();
    }
    if (slot.progress >= 1) {
      slot.item = { ...slot.item, state: 'chopped' };
      slot.progress = 1;
      playChopDone();
    }
  });
  let anyCooking = false;
  world.burners.forEach((slot) => {
    if (!slot.item) return;
    if (slot.item.state === 'raw') {
      anyCooking = true;
      slot.progress += dt;
      if (slot.progress >= COOK.cookSeconds) {
        slot.item = { ...slot.item, state: 'cooked' };
        playCookDone();
      }
    } else if (slot.item.state === 'cooked') {
      slot.progress += dt;
      if (slot.progress >= COOK.cookSeconds + COOK.doneWindowSeconds) {
        slot.item = { ...slot.item, state: 'burnt' };
        playBurnt();
      }
    }
  });
  if (!anyCooking) stopSizzle();
}

function stepOrders(world, dt) {
  world.spawnTimer -= dt;
  if (world.spawnTimer <= 0 && world.orders.length < 4) {
    spawnOrder(world);
    world.spawnTimer = world.rush ? COOK.spawnRushSeconds : COOK.spawnStartSeconds;
  }
  for (let i = world.orders.length - 1; i >= 0; i -= 1) {
    const order = world.orders[i];
    order.timeLeft -= dt;
    if (order.timeLeft <= 0) {
      world.orders.splice(i, 1);
      world.missed += 1;
      world.combo = 0;
      addPopup(world, 640, 130, `Order #${order.id} walked out!`, '#ff6b6b');
      playError();
    }
  }
}

export function stepWorld(world, dt, input) {
  if (world.screen !== SCREEN_PLAY) return;
  world.time += dt;
  world.timeLeft -= dt;
  if (!world.rush && world.timeLeft <= SHIFT_SECONDS - COOK.rushAtSeconds) {
    world.rush = true;
    if (!world.rushAnnounced) {
      world.rushAnnounced = true;
      addPopup(world, 640, 300, 'SERVICE RUSH! Orders come faster!', '#ff9f43');
      playRush();
    }
  }
  moveChef(world, dt, input);
  stepStations(world, dt);
  stepOrders(world, dt);
  world.popups.forEach((popup) => {
    popup.life -= dt;
    popup.y -= 22 * dt;
  });
  world.popups = world.popups.filter((popup) => popup.life > 0);
  if (world.servedFlash > 0) world.servedFlash -= dt;
  if (world.timeLeft <= 0) {
    world.timeLeft = 0;
    world.screen = SCREEN_OVER;
    stopSizzle();
  }
}

export { servePlate };
