// Ember & Ladle: staged screenshot scenes. Each scene builds the exact
// mid-game state a real shift reaches — orders on the board, a dish
// mid-assembly, a timer running, a plate ready to serve — from fixed
// numbers, so the same shot always renders the same frame.

import { RECIPES } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, createWorld, startShift } from './world.js';

function order(world, recipeId, timeLeft, maxTime) {
  const recipe = RECIPES.find((item) => item.id === recipeId);
  world.orders.push({ id: world.orderSeq + 1, recipe, timeLeft, maxTime });
  world.orderSeq += 1;
}

export function stageShot(name, world) {
  if (name === 'play') {
    startShift(world);
    world.timeLeft = 134;
    world.coins = 48;
    world.served = 2;
    world.combo = 2;
    world.bestCombo = 2;
    order(world, 'sunrise-bowl', 41, 62);
    order(world, 'ember-fish', 28, 62);
    order(world, 'garden-crunch', 52, 62);
    // Chef at the chopping board, tomato half chopped.
    world.chef.x = 640;
    world.chef.y = 360;
    world.boards[0] = { item: { id: 'tomato', state: 'raw' }, progress: 0.6 };
    // Fish searing on burner one.
    world.burners[0] = { item: { id: 'fish', state: 'raw' }, progress: 2.0 };
    // Plate mid-assembly: rice + egg, waiting for chilli.
    world.plates[0] = { items: ['rice', 'egg'] };
    world.chef.carried = [{ id: 'chilli', state: 'raw' }];
    return SCREEN_PLAY;
  }
  if (name === 'rush') {
    startShift(world);
    world.timeLeft = 47;
    world.rush = true;
    world.coins = 156;
    world.served = 6;
    world.combo = 4;
    world.bestCombo = 5;
    order(world, 'ember-fish', 12, 44);
    order(world, 'volcano-noodle', 19, 44);
    order(world, 'sunrise-bowl', 26, 44);
    order(world, 'garden-crunch', 33, 44);
    // Burner one: fish cooked and ready; burner two: noodles cooking.
    world.burners[0] = { item: { id: 'fish', state: 'cooked' }, progress: 4.0 };
    world.burners[1] = { item: { id: 'noodle', state: 'raw' }, progress: 3.1 };
    // Tomato chopped on board two; chef carries the finished fish plate
    // toward the serving window.
    world.boards[1] = { item: { id: 'tomato', state: 'chopped' }, progress: 1 };
    world.chef.x = 1080;
    world.chef.y = 600;
    world.chef.carried = [{ plate: true, items: ['fish', 'lemon', 'tomato'] }];
    world.plates[1] = { items: ['noodle', 'egg'] };
    world.popups.push({ x: 1140, y: 560, text: 'READY TO SERVE!', colour: '#ffd94d', life: 1.4 });
    return SCREEN_PLAY;
  }
  if (name === 'serve') {
    startShift(world);
    world.timeLeft = 96;
    world.coins = 210;
    world.served = 8;
    world.combo = 3;
    world.bestCombo = 4;
    order(world, 'volcano-noodle', 38, 62);
    order(world, 'garden-crunch', 22, 62);
    // Just served at the window: flash + popup, chef at the bell.
    world.chef.x = 1140;
    world.chef.y = 600;
    world.servedFlash = 0.9;
    world.popups.push({ x: 1140, y: 560, text: '+32 coins', colour: '#ffd94d', life: 1.4 });
    world.popups.push({ x: 1140, y: 528, text: 'COMBO x3!', colour: '#ff9f43', life: 1.4 });
    // Next dish already mid-assembly on the counter.
    world.plates[0] = { items: ['noodle', 'egg', 'chilli'] };
    world.plates[2] = { items: ['lettuce'] };
    world.boards[0] = { item: { id: 'tomato', state: 'raw' }, progress: 0.35 };
    world.burners[0] = { item: { id: 'egg', state: 'raw' }, progress: 1.2 };
    return SCREEN_PLAY;
  }
  if (name === 'end') {
    startShift(world);
    world.timeLeft = 0;
    world.coins = 264;
    world.served = 9;
    world.missed = 2;
    world.combo = 0;
    world.bestCombo = 5;
    world.screen = SCREEN_OVER;
    return SCREEN_OVER;
  }
  // Default: title screen over a live-looking kitchen.
  const fresh = createWorld(20261125);
  fresh.screen = SCREEN_TITLE;
  order(fresh, 'sunrise-bowl', 55, 62);
  fresh.boards[0] = { item: { id: 'lettuce', state: 'raw' }, progress: 0.25 };
  fresh.burners[0] = { item: { id: 'rice', state: 'raw' }, progress: 1.6 };
  fresh.plates[0] = { items: ['rice'] };
  Object.assign(world, fresh);
  return SCREEN_TITLE;
}
