// Ember & Ladle: every pixel the player sees. One clear job: draw the
// kitchen, the order board, the chef and the HUD from the world state.
// All art is drawn with canvas paths — no image files, no network.

import {
  CHEF, COOK, INGREDIENTS, INGREDIENT_ORDER, RECIPES, STATIONS, VIEW,
  boardRect, burnerRect, pantryBinRect, plateSlotRect, orderTicketRect,
  rankForCoins,
} from './config.js';
import { isMuted } from './audio.js';
import { isPlateReady, plateMatchesOrder } from './world.js';

const CREAM = '#fff6e3';
const WOOD = '#b07a45';
const WOOD_DARK = '#8a5a2e';
const TILE_A = '#f3e2c2';
const TILE_B = '#e9d3ac';
const WALL = '#c65b3c';
const WALL_DARK = '#a34a30';
const INK = '#3a2a1a';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function label(ctx, text, x, y, size, colour, align, weight) {
  ctx.fillStyle = colour || INK;
  ctx.font = `${weight || '700'} ${size}px 'Trebuchet MS', Verdana, sans-serif`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function drawProgressBar(ctx, x, y, w, h, frac, colour, back) {
  ctx.fillStyle = back || 'rgba(0,0,0,0.25)';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = colour;
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
}

// --- Ingredient icons, drawn as small vector food. ---
export function drawIngredientIcon(ctx, id, cx, cy, size, state) {
  const r = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (state === 'burnt') {
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.3);
    ctx.lineTo(r * 0.4, r * 0.3);
    ctx.moveTo(r * 0.4, -r * 0.3);
    ctx.lineTo(-r * 0.4, r * 0.3);
    ctx.stroke();
    ctx.restore();
    return;
  }
  switch (id) {
    case 'rice': {
      ctx.fillStyle = '#fdf6e3';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.15, r * 0.9, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9b48a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#b09a6a';
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.arc(-r * 0.5 + i * r * 0.25, -r * 0.25 + (i % 2) * r * 0.18, r * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'noodle': {
      ctx.strokeStyle = '#f2c14e';
      ctx.lineWidth = r * 0.22;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.7, -r * 0.4 + i * r * 0.4);
        ctx.quadraticCurveTo(0, -r * 0.7 + i * r * 0.4, r * 0.7, -r * 0.4 + i * r * 0.4);
        ctx.stroke();
      }
      break;
    }
    case 'egg': {
      ctx.fillStyle = state === 'cooked' ? '#fff8e0' : '#efe6d0';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.9, r * 0.7, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b09a6a';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (state === 'cooked') {
        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(r * 0.1, -r * 0.05, r * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd94d';
        ctx.beginPath();
        ctx.arc(r * 0.02, -r * 0.12, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'fish': {
      ctx.fillStyle = state === 'cooked' ? '#e8a87c' : '#7fb3d5';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.85, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, 0);
      ctx.lineTo(-r * 1.25, -r * 0.45);
      ctx.lineTo(-r * 1.25, r * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(r * 0.5, -r * 0.1, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'tomato': {
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#58b368';
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.5);
      ctx.lineTo(-r * 0.35, -r * 0.9);
      ctx.lineTo(0, -r * 0.65);
      ctx.lineTo(r * 0.35, -r * 0.9);
      ctx.closePath();
      ctx.fill();
      if (state === 'chopped') {
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, -r * 0.2);
        ctx.lineTo(r * 0.5, r * 0.4);
        ctx.moveTo(r * 0.5, -r * 0.2);
        ctx.lineTo(-r * 0.5, r * 0.4);
        ctx.stroke();
      }
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = '#58b368';
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(-r * 0.4 + i * r * 0.4, (i % 2) * r * 0.2, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#7ed491';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'chilli': {
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = r * 0.34;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.5);
      ctx.quadraticCurveTo(0, r * 0.9, r * 0.75, -r * 0.35);
      ctx.stroke();
      ctx.strokeStyle = '#58b368';
      ctx.lineWidth = r * 0.18;
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.5);
      ctx.lineTo(-r * 0.95, -r * 0.8);
      ctx.stroke();
      break;
    }
    case 'lemon': {
      ctx.fillStyle = '#f7dc6f';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.9, r * 0.55, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath();
      ctx.arc(-r * 0.85, -r * 0.35, r * 0.14, 0, Math.PI * 2);
      ctx.arc(r * 0.85, r * 0.35, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default:
      break;
  }
  if (state === 'chopped' && id !== 'tomato') {
    ctx.strokeStyle = 'rgba(58,42,26,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, 0);
    ctx.lineTo(r * 0.6, 0);
    ctx.stroke();
  }
  if (state === 'cooked') {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.9);
    ctx.quadraticCurveTo(-r * 0.1, -r * 1.25, -r * 0.3, -r * 1.5);
    ctx.moveTo(r * 0.3, -r * 0.9);
    ctx.quadraticCurveTo(r * 0.5, -r * 1.25, r * 0.3, -r * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlateIcon(ctx, plate, cx, cy, size, world) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9c9a8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 - 4, 0, Math.PI * 2);
  ctx.stroke();
  const items = plate.items;
  items.forEach((id, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / Math.max(3, items.length);
    const ix = cx + Math.cos(angle) * size * 0.22;
    const iy = cy + Math.sin(angle) * size * 0.22;
    drawIngredientIcon(ctx, id, ix, iy, size * 0.42, INGREDIENTS[id].prep === 'chop' ? 'chopped' : 'cooked');
  });
  if (world && isPlateReady(world, plate)) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// --- Kitchen furniture. ---
function drawFloorAndWalls(ctx, time) {
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 0, VIEW.width, 156);
  ctx.fillStyle = WALL_DARK;
  ctx.fillRect(0, 148, VIEW.width, 8);
  // Hanging lamps and a menu poster on the wall.
  for (let i = 0; i < 4; i += 1) {
    const x = 180 + i * 320;
    ctx.strokeStyle = '#5d3a1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 34);
    ctx.stroke();
    const flicker = 0.85 + 0.15 * Math.sin(time * 2 + i);
    ctx.fillStyle = `rgba(255, 214, 120, ${flicker})`;
    ctx.beginPath();
    ctx.arc(x, 46, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  label(ctx, 'EMBER & LADLE', 640, 30, 26, '#fff6e3', 'center', '900');
  label(ctx, 'RUSH HOUR KITCHEN', 640, 56, 13, '#ffd94d', 'center', '700');
  ctx.fillStyle = TILE_A;
  ctx.fillRect(0, 156, VIEW.width, VIEW.height - 156);
  ctx.fillStyle = TILE_B;
  for (let y = 156; y < VIEW.height; y += 64) {
    for (let x = ((y / 64) % 2) * 32; x < VIEW.width; x += 64) {
      ctx.fillRect(x, y, 60, 60);
    }
  }
}

function drawHud(ctx, world) {
  const mins = Math.floor(world.timeLeft / 60);
  const secs = Math.floor(world.timeLeft % 60);
  const timerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  const urgent = world.timeLeft <= 30;
  // Coins pill, top-left of the wall band.
  ctx.fillStyle = 'rgba(58,42,26,0.85)';
  roundRect(ctx, 16, 12, 200, 44, 10);
  ctx.fill();
  label(ctx, `COINS  ${world.coins}`, 116, 35, 22, '#ffd94d', 'center', '900');
  // Timer pill, top-right of the wall band. Red and labelled RUSH once the rush hits.
  ctx.fillStyle = urgent || world.rush ? '#e74c3c' : 'rgba(58,42,26,0.85)';
  roundRect(ctx, 1064, 12, 200, 44, 10);
  ctx.fill();
  label(ctx, world.rush ? `RUSH  ${timerText}` : `TIME  ${timerText}`, 1164, 35, 22, '#fff6e3', 'center', '900');
}

function drawOrderBoard(ctx, world) {
  label(ctx, `ORDER BOARD  —  SERVED ${world.served}   MISSED ${world.missed}   ${world.combo >= 2 ? `COMBO x${world.combo}` : ''}`, 16, 60, 12, '#fff6e3', 'left', '800');
  world.orders.forEach((order, index) => {
    const rect = orderTicketRect(index);
    const patience = Math.max(0, order.timeLeft / order.maxTime);
    const urgent = patience < 0.35;
    ctx.fillStyle = urgent ? '#ffe1d6' : CREAM;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    ctx.fill();
    ctx.strokeStyle = urgent ? '#e74c3c' : '#d9c9a8';
    ctx.lineWidth = 2;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    ctx.stroke();
    label(ctx, `#${order.id} ${order.recipe.name}`, rect.x + 12, rect.y + 13, 15, INK, 'left', '800');
    label(ctx, `${order.recipe.base} coins`, rect.x + rect.w - 12, rect.y + 13, 13, '#8a5a2e', 'right', '700');
    order.recipe.needs.forEach((id, i) => {
      drawIngredientIcon(ctx, id, rect.x + 30 + i * 44, rect.y + 44, 34, INGREDIENTS[id].prep === 'chop' ? 'chopped' : 'cooked');
    });
    drawProgressBar(ctx, rect.x + 150, rect.y + 40, 130, 12, patience, urgent ? '#e74c3c' : '#58b368');
    label(ctx, `${Math.ceil(order.timeLeft)}s`, rect.x + 150, rect.y + 60, 12, '#8a5a2e', 'left', '700');
  });
  if (world.orders.length === 0) {
    ctx.fillStyle = 'rgba(255,246,227,0.85)';
    roundRect(ctx, 16, 66, 296, 84, 10);
    ctx.fill();
    label(ctx, 'No orders — prep ahead!', 164, 108, 15, '#8a5a2e', 'center', '700');
  }
}

function drawPantry(ctx) {
  const rect = STATIONS.pantry;
  ctx.fillStyle = WOOD;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  label(ctx, rect.label, rect.x + rect.w / 2, rect.y + 16, 13, '#fff6e3', 'center', '800');
  INGREDIENT_ORDER.forEach((id, index) => {
    const bin = pantryBinRect(index);
    ctx.fillStyle = CREAM;
    roundRect(ctx, bin.x, bin.y, bin.w, bin.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#d9c9a8';
    ctx.lineWidth = 2;
    roundRect(ctx, bin.x, bin.y, bin.w, bin.h, 8);
    ctx.stroke();
    drawIngredientIcon(ctx, id, bin.x + bin.w / 2, bin.y + 28, 40, 'raw');
    label(ctx, INGREDIENTS[id].name, bin.x + bin.w / 2, bin.y + 62, 12, INK, 'center', '700');
  });
}

function drawBoards(ctx, world) {
  const rect = STATIONS.boards;
  ctx.fillStyle = WOOD;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  label(ctx, rect.label, rect.x + rect.w / 2, rect.y + 14, 12, '#fff6e3', 'center', '800');
  world.boards.forEach((slot, index) => {
    const board = boardRect(index);
    ctx.fillStyle = '#e8dcc0';
    roundRect(ctx, board.x, board.y, board.w, board.h, 6);
    ctx.fill();
    if (slot.item) {
      drawIngredientIcon(ctx, slot.item.id, board.x + board.w / 2, board.y + 34, 44, slot.item.state);
      if (slot.item.state === 'raw') {
        drawProgressBar(ctx, board.x + 12, board.y + board.h - 12, board.w - 24, 7, slot.progress, '#58b368');
        label(ctx, 'CHOPPING…', board.x + board.w / 2, board.y + board.h + 8, 11, '#fff6e3', 'center', '800');
      } else {
        label(ctx, 'CHOPPED ✓', board.x + board.w / 2, board.y + board.h + 8, 11, '#2e7d32', 'center', '800');
      }
    } else {
      label(ctx, 'empty board', board.x + board.w / 2, board.y + 36, 12, '#a08a68', 'center', '700');
    }
  });
}

function drawStove(ctx, world, time) {
  const rect = STATIONS.stove;
  ctx.fillStyle = '#4a4a55';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  label(ctx, rect.label, rect.x + rect.w / 2, rect.y + 16, 13, '#fff6e3', 'center', '800');
  world.burners.forEach((slot, index) => {
    const burner = burnerRect(index);
    ctx.fillStyle = '#2b2b33';
    ctx.beginPath();
    ctx.arc(burner.x + burner.w / 2, burner.y + 52, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(burner.x + burner.w / 2, burner.y + 52, 42, 0, Math.PI * 2);
    ctx.stroke();
    if (slot.item && slot.item.state === 'raw') {
      const flicker = 0.7 + 0.3 * Math.sin(time * 9 + index * 2);
      ctx.fillStyle = `rgba(255, ${Math.floor(120 + 60 * flicker)}, 40, ${0.75 * flicker})`;
      ctx.beginPath();
      ctx.arc(burner.x + burner.w / 2, burner.y + 52, 30 + 6 * flicker, 0, Math.PI * 2);
      ctx.fill();
      drawIngredientIcon(ctx, slot.item.id, burner.x + burner.w / 2, burner.y + 48, 44, 'raw');
      drawProgressBar(ctx, burner.x + 6, burner.y + burner.h - 10, burner.w - 12, 7, slot.progress / COOK.cookSeconds, '#ff9f43');
    } else if (slot.item && slot.item.state === 'cooked') {
      drawIngredientIcon(ctx, slot.item.id, burner.x + burner.w / 2, burner.y + 48, 44, 'cooked');
      const burnFrac = (slot.progress - COOK.cookSeconds) / COOK.doneWindowSeconds;
      drawProgressBar(ctx, burner.x + 6, burner.y + burner.h - 10, burner.w - 12, 7, 1 - burnFrac, burnFrac > 0.6 ? '#e74c3c' : '#58b368');
      label(ctx, burnFrac > 0.6 ? 'GRAB IT!' : 'READY ✓', burner.x + burner.w / 2, burner.y + burner.h - 22, 11, burnFrac > 0.6 ? '#e74c3c' : '#2e7d32', 'center', '800');
    } else if (slot.item && slot.item.state === 'burnt') {
      drawIngredientIcon(ctx, slot.item.id, burner.x + burner.w / 2, burner.y + 48, 44, 'burnt');
      label(ctx, 'BURNT — trash it', burner.x + burner.w / 2, burner.y + burner.h - 22, 11, '#e74c3c', 'center', '800');
    } else {
      label(ctx, 'burner free', burner.x + burner.w / 2, burner.y + 52, 12, '#999', 'center', '700');
    }
  });
}

function drawCounter(ctx, world) {
  const rect = STATIONS.counter;
  ctx.fillStyle = WOOD;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  label(ctx, rect.label, rect.x + rect.w / 2, rect.y + 14, 12, '#fff6e3', 'center', '800');
  world.plates.forEach((plate, index) => {
    const slot = plateSlotRect(index);
    ctx.fillStyle = 'rgba(255,246,227,0.35)';
    roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 8);
    ctx.fill();
    if (plate.items.length > 0) {
      drawPlateIcon(ctx, plate, slot.x + slot.w / 2, slot.y + 38, 62, world);
      const ready = isPlateReady(world, plate);
      label(ctx, ready ? 'READY TO SERVE!' : `${plate.items.length}/3 on plate`, slot.x + slot.w / 2, slot.y + slot.h - 6, 11, ready ? '#7a5b00' : INK, 'center', '800');
    } else {
      label(ctx, 'empty plate', slot.x + slot.w / 2, slot.y + 38, 12, '#fff6e3', 'center', '700');
    }
  });
}

function drawWindowAndTrash(ctx, world, time) {
  const rect = STATIONS.window;
  const flash = world.servedFlash > 0 ? 0.5 + 0.5 * Math.sin(time * 12) : 0;
  ctx.fillStyle = '#7fb3d5';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 217, 77, ${flash * 0.8})`;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  label(ctx, rect.label, rect.x + rect.w / 2, rect.y + 16, 13, '#fff', 'center', '800');
  ctx.fillStyle = '#fff6e3';
  ctx.beginPath();
  ctx.arc(rect.x + rect.w / 2, rect.y + 62, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.arc(rect.x + rect.w / 2, rect.y + 62, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.fillRect(rect.x + rect.w / 2 - 2, rect.y + 40, 4, 10);
  label(ctx, 'Ring the bell — serve here', rect.x + rect.w / 2, rect.y + 102, 12, '#fff', 'center', '700');
  const trash = STATIONS.trash;
  ctx.fillStyle = '#6c757d';
  roundRect(ctx, trash.x, trash.y, trash.w, trash.h, 8);
  ctx.fill();
  label(ctx, trash.label, trash.x + trash.w / 2, trash.y + 16, 12, '#fff', 'center', '800');
  label(ctx, 'dump burnt food', trash.x + trash.w / 2, trash.y + 60, 11, '#e9ecef', 'center', '700');
}

function drawChef(ctx, world, time) {
  const chef = world.chef;
  const bob = chef.moving ? Math.sin(time * 12) * 3 : Math.sin(time * 2) * 1.5;
  const cx = chef.x;
  const cy = chef.y + bob * 0.3;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, chef.y + 24, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body and apron.
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, cx - 20, cy - 8, 40, 34, 12);
  ctx.fill();
  ctx.fillStyle = '#c65b3c';
  roundRect(ctx, cx - 20, cy + 12, 40, 14, 6);
  ctx.fill();
  // Head and chef hat.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(cx, cy - 20, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - 10, cy - 32, 9, 0, Math.PI * 2);
  ctx.arc(cx, cy - 36, 11, 0, Math.PI * 2);
  ctx.arc(cx + 10, cy - 32, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 14, cy - 34, 28, 8);
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(cx - 5 + chef.dir * 2, cy - 21, 2, 0, Math.PI * 2);
  ctx.arc(cx + 6 + chef.dir * 2, cy - 21, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c65b3c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx + chef.dir * 2, cy - 14, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Carried tray above the hat.
  if (chef.carried.length > 0) {
    const trayY = cy - 58;
    ctx.fillStyle = 'rgba(58,42,26,0.85)';
    roundRect(ctx, cx - 46, trayY - 14, 92, 30, 8);
    ctx.fill();
    chef.carried.forEach((item, i) => {
      const ix = cx - 30 + i * 30;
      if (item.plate) {
        drawPlateIcon(ctx, { items: item.items }, ix, trayY + 1, 26, null);
      } else {
        drawIngredientIcon(ctx, item.id, ix, trayY + 1, 24, item.state);
      }
    });
  }
  // Move target marker.
  if (world.moveTarget) {
    ctx.strokeStyle = '#c65b3c';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(world.moveTarget.x, world.moveTarget.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawPopups(ctx, world) {
  world.popups.forEach((popup) => {
    ctx.globalAlpha = Math.min(1, popup.life);
    label(ctx, popup.text, popup.x, popup.y, 20, popup.colour, 'center', '900');
    ctx.globalAlpha = 1;
  });
}

function drawHintBar(ctx, world) {
  const hints = 'WASD / Arrows move  •  E or Click: grab / chop / cook / plate / serve  •  P pause  •  M mute';
  ctx.fillStyle = 'rgba(58,42,26,0.85)';
  roundRect(ctx, 300, 772, 680, 22, 10);
  ctx.fill();
  label(ctx, hints, 640, 783, 12, '#fff6e3', 'center', '600');
  void world;
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(40,20,10,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = CREAM;
  roundRect(ctx, 290, 120, 700, 540, 18);
  ctx.fill();
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 4;
  roundRect(ctx, 290, 120, 700, 540, 18);
  ctx.stroke();
  label(ctx, 'EMBER & LADLE', 640, 178, 52, '#c65b3c', 'center', '900');
  label(ctx, 'RUSH HOUR KITCHEN', 640, 220, 22, '#8a5a2e', 'center', '800');
  label(ctx, 'You are the only chef on shift. Orders are coming in —', 640, 268, 17, INK, 'center', '600');
  label(ctx, 'grab ingredients, chop, cook, plate and serve before patience runs out!', 640, 292, 17, INK, 'center', '600');
  label(ctx, 'HOW A DISH IS BORN', 640, 336, 15, '#c65b3c', 'center', '800');
  const steps = [
    '1. PANTRY — click an ingredient to pick it up (carry up to 3)',
    '2. CHOPPING BOARD — drop it to chop  •  STOVE — drop it to cook',
    '3. ASSEMBLY COUNTER — add 3 prepped items to a plate',
    '4. SERVING WINDOW — carry a finished plate and serve it!',
  ];
  steps.forEach((step, i) => label(ctx, step, 640, 364 + i * 26, 15, INK, 'center', '600'));
  label(ctx, 'MENU TONIGHT', 640, 486, 15, '#c65b3c', 'center', '800');
  RECIPES.forEach((recipe, i) => {
    label(ctx, `${recipe.name} — ${recipe.blurb}  (${recipe.base} coins)`, 640, 512 + i * 24, 14, INK, 'center', '600');
  });
  label(ctx, '▶  Press ENTER or click anywhere to start the shift  ◀', 640, 624, 18, '#e74c3c', 'center', '900');
  void world;
}

function drawGameOver(ctx, world) {
  ctx.fillStyle = 'rgba(40,20,10,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = CREAM;
  roundRect(ctx, 390, 170, 500, 440, 18);
  ctx.fill();
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 4;
  roundRect(ctx, 390, 170, 500, 440, 18);
  ctx.stroke();
  label(ctx, 'SHIFT OVER!', 640, 220, 40, '#c65b3c', 'center', '900');
  label(ctx, rankForCoins(world.coins), 640, 268, 24, '#8a5a2e', 'center', '800');
  const rows = [
    [`Coins earned`, `${world.coins}`],
    [`Dishes served`, `${world.served}`],
    [`Orders missed`, `${world.missed}`],
    [`Best combo`, `x${world.bestCombo}`],
  ];
  rows.forEach((row, i) => {
    label(ctx, row[0], 470, 322 + i * 36, 18, INK, 'left', '700');
    label(ctx, row[1], 810, 322 + i * 36, 18, INK, 'right', '900');
  });
  label(ctx, 'Press R to cook another shift', 640, 560, 18, '#e74c3c', 'center', '900');
}

export function renderGame(ctx, world, time, paused) {
  drawFloorAndWalls(ctx, time);
  drawPantry(ctx);
  drawBoards(ctx, world);
  drawStove(ctx, world, time);
  drawCounter(ctx, world);
  drawWindowAndTrash(ctx, world, time);
  drawOrderBoard(ctx, world);
  drawHud(ctx, world);
  drawChef(ctx, world, time);
  drawPopups(ctx, world);
  drawHintBar(ctx, world);
  if (isMuted()) label(ctx, 'MUTED (M)', 1240, 786, 12, '#fff6e3', 'right', '700');
  if (world.screen === 'title') drawTitle(ctx, world);
  if (world.screen === 'over') drawGameOver(ctx, world);
  if (paused && world.screen === 'play') {
    ctx.fillStyle = 'rgba(40,20,10,0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    label(ctx, 'PAUSED — press P to keep cooking', 640, 400, 32, '#fff6e3', 'center', '900');
  }
}
