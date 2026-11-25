// Ember & Ladle — Rush Hour Kitchen: tuning and content tables.
// One clear job: every number, recipe and station layout the rest of the
// game reads from. Nothing here draws or updates; it only declares.

export const VIEW = { width: 1280, height: 800 };
export const SHIFT_SECONDS = 180;
export const STEP = 1 / 60;

export const CHEF = {
  radius: 22,
  speed: 300,
  carryMax: 3,
  interactRange: 110,
};

export const COOK = {
  chopSeconds: 2.4,
  cookSeconds: 4.0,
  doneWindowSeconds: 5.0,
  spawnFirstSeconds: 6,
  spawnStartSeconds: 15,
  spawnRushSeconds: 9,
  patienceStartSeconds: 62,
  patienceRushSeconds: 44,
  rushAtSeconds: 45,
};

// Every ingredient: what it is, how it must be prepped, its pantry colour.
export const INGREDIENTS = {
  rice: { name: 'Rice', prep: 'cook', colour: '#f5ecd7', price: 0 },
  noodle: { name: 'Noodle', prep: 'cook', colour: '#f2c14e', price: 0 },
  egg: { name: 'Egg', prep: 'cook', colour: '#fff3c4', price: 0 },
  fish: { name: 'Fish', prep: 'cook', colour: '#7fb3d5', price: 0 },
  tomato: { name: 'Tomato', prep: 'chop', colour: '#e74c3c', price: 0 },
  lettuce: { name: 'Lettuce', prep: 'chop', colour: '#58b368', price: 0 },
  chilli: { name: 'Chilli', prep: 'chop', colour: '#c0392b', price: 0 },
  lemon: { name: 'Lemon', prep: 'chop', colour: '#f7dc6f', price: 0 },
};

export const INGREDIENT_ORDER = ['rice', 'noodle', 'egg', 'fish', 'tomato', 'lettuce', 'chilli', 'lemon'];

// Recipes: three prepped ingredients each. Base coins grow with the work.
export const RECIPES = [
  { id: 'sunrise-bowl', name: 'Sunrise Rice Bowl', needs: ['rice', 'egg', 'chilli'], base: 22, blurb: 'Steamed rice, fried egg, fresh chilli' },
  { id: 'ember-fish', name: 'Ember Fish Plate', needs: ['fish', 'lemon', 'tomato'], base: 28, blurb: 'Seared fish, lemon, tomato' },
  { id: 'garden-crunch', name: 'Garden Crunch Salad', needs: ['lettuce', 'tomato', 'lemon'], base: 20, blurb: 'Crisp lettuce, tomato, lemon' },
  { id: 'volcano-noodle', name: 'Volcano Noodles', needs: ['noodle', 'egg', 'chilli'], base: 26, blurb: 'Hot noodles, egg, chilli fire' },
];

// Station rectangles on the 1280x800 kitchen floor.
export const STATIONS = {
  pantry: { x: 16, y: 168, w: 232, h: 392, label: 'PANTRY' },
  boards: { x: 420, y: 168, w: 300, h: 110, label: 'CHOPPING BOARDS' },
  stove: { x: 1020, y: 168, w: 244, h: 168, label: 'STOVE' },
  counter: { x: 420, y: 648, w: 440, h: 120, label: 'ASSEMBLY COUNTER' },
  window: { x: 1020, y: 648, w: 244, h: 120, label: 'SERVING WINDOW' },
  trash: { x: 1020, y: 420, w: 116, h: 88, label: 'TRASH' },
};

// Pantry bins: two columns x four rows inside the pantry rect.
export function pantryBinRect(index) {
  const col = index % 2;
  const row = Math.floor(index / 2);
  return { x: 28 + col * 112, y: 204 + row * 88, w: 100, h: 76 };
}

export function boardRect(index) {
  return { x: 436 + index * 150, y: 196, w: 132, h: 72 };
}

export function burnerRect(index) {
  return { x: 1036 + index * 118, y: 196, w: 100, h: 108 };
}

export function plateSlotRect(index) {
  return { x: 440 + index * 140, y: 672, w: 120, h: 76 };
}

export function orderTicketRect(index) {
  return { x: 16 + index * 312, y: 76, w: 296, h: 74 };
}

// Rank thresholds on coins earned in one 180-second shift.
export function rankForCoins(coins) {
  if (coins >= 420) return 'S — Head Chef';
  if (coins >= 300) return 'A — Sous Chef';
  if (coins >= 200) return 'B — Line Cook';
  if (coins >= 100) return 'C — Prep Cook';
  return 'D — Dishwasher';
}
