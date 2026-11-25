// Ember & Ladle: game loop and screens. One clear job: own the animation
// frame, feed input into world.js, hand the world to render.js, and stage
// the deterministic ?shot= scenes screenshots are taken from.

import { STEP, VIEW } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, createWorld, interact, interactAt, startShift, stepWorld } from './world.js';
import { attachInput, consumePresses, createInput } from './input.js';
import { renderGame } from './render.js';
import { stageShot } from './shots.js';
import { isMuted, toggleMute, unlockAudio } from './audio.js';
import { STATIONS } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number(params.get('seed') || '20261125');

const world = createWorld(Number.isFinite(seedParam) ? seedParam : 20261125);
const input = createInput();
let paused = false;
let lastTime = performance.now();
let accumulator = 0;
let shotMode = false;

if (shotName) {
  shotMode = true;
  const screen = stageShot(shotName, world);
  world.screen = screen;
}

import { boardRect, burnerRect, pantryBinRect, plateSlotRect } from './config.js';

// Where the chef should stand to use the station under the click, and
// exactly which sub-station (bin, board, burner, plate slot) was clicked.
// Standing points stay inside the walkable floor (x 40..1240, y 200..760)
// so the chef can always arrive and the interaction fires.
function stationTargetAt(x, y) {
  const inside = (rect) => x >= rect.x - 10 && x <= rect.x + rect.w + 10 && y >= rect.y - 10 && y <= rect.y + rect.h + 10;
  for (let i = 0; i < 8; i += 1) {
    const bin = pantryBinRect(i);
    if (inside(bin)) return { x: 262, y: bin.y + bin.h / 2, target: { kind: 'pantry', index: i } };
  }
  if (inside(STATIONS.pantry)) {
    return { x: 262, y: Math.max(210, Math.min(750, y)), target: { kind: 'pantry', index: 0 } };
  }
  for (let i = 0; i < 2; i += 1) {
    const board = boardRect(i);
    if (inside(board)) return { x: board.x + board.w / 2, y: 292, target: { kind: 'board', index: i } };
  }
  if (inside(STATIONS.boards)) return { x: 570, y: 292, target: { kind: 'board', index: 0 } };
  for (let i = 0; i < 2; i += 1) {
    const burner = burnerRect(i);
    if (inside(burner)) return { x: burner.x + burner.w / 2, y: 352, target: { kind: 'burner', index: i } };
  }
  if (inside(STATIONS.stove)) return { x: 1142, y: 352, target: { kind: 'burner', index: 0 } };
  for (let i = 0; i < 3; i += 1) {
    const slot = plateSlotRect(i);
    if (inside(slot)) return { x: slot.x + slot.w / 2, y: 632, target: { kind: 'counter', index: i } };
  }
  if (inside(STATIONS.counter)) return { x: 640, y: 632, target: { kind: 'counter', index: 0 } };
  if (inside(STATIONS.window)) return { x: 1142, y: 632, target: { kind: 'window' } };
  if (inside(STATIONS.trash)) return { x: 1078, y: 524, target: { kind: 'trash' } };
  return null;
}

function handleClick() {
  unlockAudio();
  if (!input.click) return;
  const click = input.click;
  input.click = null;
  if (world.screen === SCREEN_TITLE) {
    startShift(world);
    return;
  }
  if (world.screen === SCREEN_OVER) return;
  const station = stationTargetAt(click.x, click.y);
  if (station) {
    world.moveTarget = { x: station.x, y: station.y, action: 'interact', target: station.target };
  } else {
    world.moveTarget = {
      x: Math.max(40, Math.min(1240, click.x)),
      y: Math.max(200, Math.min(760, click.y)),
      action: null,
    };
  }
}

attachInput(canvas, input, {
  onConfirm() {
    unlockAudio();
    if (world.screen === SCREEN_TITLE) startShift(world);
  },
  onPointerDown() {
    unlockAudio();
    handleClick();
  },
});

function frame(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  const pressed = consumePresses(input);
  if (pressed.mute) toggleMute();
  if (pressed.pause && world.screen === SCREEN_PLAY) paused = !paused;
  if (pressed.restart && world.screen === SCREEN_OVER) {
    startShift(world);
    paused = false;
  }
  if (pressed.interact) {
    unlockAudio();
    if (world.screen === SCREEN_TITLE) startShift(world);
    else interact(world);
  }
  if (input.click) handleClick();
  if (!shotMode && !paused) {
    accumulator += dt;
    while (accumulator >= STEP) {
      stepWorld(world, STEP, input);
      accumulator -= STEP;
    }
  }
  renderGame(ctx, world, now / 1000, paused);
  if (statusLine) {
    statusLine.textContent = world.screen === SCREEN_PLAY
      ? `Shift timer ${Math.ceil(world.timeLeft)} seconds, ${world.coins} coins, ${world.served} dishes served.`
      : world.screen === SCREEN_OVER
        ? `Shift over. ${world.coins} coins, ${world.served} dishes served.`
        : 'Ember and Ladle, Rush Hour Kitchen. Press Enter to start.';
  }
  requestAnimationFrame(frame);
}

canvas.width = VIEW.width;
canvas.height = VIEW.height;
window.__emberWorld = world;
window.__emberMuted = () => isMuted();
requestAnimationFrame(frame);
