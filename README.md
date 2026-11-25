# Ember & Ladle — Rush Hour Kitchen

[![make.fun bounty](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/labibhanafi/best-cooking-game-20261125-entry/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/labibhanafi/best-cooking-game-20261125-entry/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

A complete, original cooking game for the [best cooking game bounty](https://make.fun/bounty/best-cooking-game-20261125-0137) on make.fun. You are the only chef on shift in a small ember-lit kitchen: orders land on the board, patience drains, and you plan your route — pantry, chopping board, stove, assembly counter, serving window — to get every dish out before the customer walks away.

## How to play

- **Move:** WASD / arrow keys, or click anywhere to walk there (click a station to walk over and use it).
- **Interact:** `E` or `Space` (or click a station). One press does the nearest sensible thing: grab an ingredient, drop it on a board or burner, add it to a plate, pick up a finished plate, serve it.
- **Cook:** chopping takes 2.4 s on a board; cooking takes 4 s on a burner — leave food on too long and it burns (dump it in the trash).
- **Serve:** a plate whose 3 items match an order glows **READY TO SERVE**. Carry it to the serving window and ring the bell. Fast serves and combos pay bonus coins.
- **Shift:** 180 seconds. After 45 seconds the SERVICE RUSH hits — orders arrive faster and patience drains quicker.
- `P` pause, `M` mute, `R` restart after a shift ends.

## Tonight's menu

| Dish | Needs | Coins |
| --- | --- | --- |
| Sunrise Rice Bowl | cooked rice + cooked egg + chopped chilli | 22 |
| Ember Fish Plate | cooked fish + chopped lemon + chopped tomato | 28 |
| Garden Crunch Salad | chopped lettuce + chopped tomato + chopped lemon | 20 |
| Volcano Noodles | cooked noodle + cooked egg + chopped chilli | 26 |

Tips stack on patience left and your combo (up to +16). Serve three in a row without a miss and the combo starts paying.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Static files only — no build step, no network requests, all art drawn in canvas and all sounds synthesised with WebAudio.

## Layout

- `game/index.html` — page shell and canvas
- `game/src/config.js` — tuning, recipes, station layout
- `game/src/world.js` — kitchen state and rules (orders, chopping, cooking, serving)
- `game/src/render.js` — all canvas drawing (kitchen, chef, food, HUD)
- `game/src/input.js` — keyboard and mouse input
- `game/src/audio.js` — synthesised sound effects
- `game/src/shots.js` — deterministic staged scenes for screenshots
- `game/src/main.js` — game loop and screens
- `main.ts` — hand-in program (copies `game/` + `screenshots/`, writes `dossier.json`)
- `screenshots/` — real renders of this game's own code

Entry for the make.fun bounty: https://make.fun/bounty/best-cooking-game-20261125-0137 — play via referral https://make.fun/r/3t7y0djc
