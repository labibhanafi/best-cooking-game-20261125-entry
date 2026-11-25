// Ember & Ladle: keyboard and mouse input. One clear job: turn browser
// events into the small input shape world.js steps, plus click-to-move.

export function createInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    interactPressed: false,
    pausePressed: false,
    restartPressed: false,
    mutePressed: false,
    click: null,
  };
}

const KEYMAP = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

export function attachInput(canvas, input, callbacks) {
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const field = KEYMAP[event.code];
    if (field) {
      input[field] = true;
      event.preventDefault();
      return;
    }
    if (event.code === 'Space' || event.code === 'KeyE') {
      input.interactPressed = true;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      input.pausePressed = true;
    } else if (event.code === 'KeyR') {
      input.restartPressed = true;
    } else if (event.code === 'KeyM') {
      input.mutePressed = true;
    } else if (event.code === 'Enter') {
      if (callbacks.onConfirm) callbacks.onConfirm();
    }
  });
  window.addEventListener('keyup', (event) => {
    const field = KEYMAP[event.code];
    if (field) input[field] = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.click = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
    if (callbacks.onPointerDown) callbacks.onPointerDown();
  });
  window.addEventListener('blur', () => {
    input.up = false;
    input.down = false;
    input.left = false;
    input.right = false;
  });
}

export function consumePresses(input) {
  const pressed = {
    interact: input.interactPressed,
    pause: input.pausePressed,
    restart: input.restartPressed,
    mute: input.mutePressed,
  };
  input.interactPressed = false;
  input.pausePressed = false;
  input.restartPressed = false;
  input.mutePressed = false;
  return pressed;
}
