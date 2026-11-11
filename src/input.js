'use strict';

// Keyboard state. "pressed"/"released" are edge-triggered and cleared by endStep().
const Input = (() => {
  const down = new Set(), pressed = new Set(), released = new Set();
  const block = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab']);

  addEventListener('keydown', e => {
    if (block.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (!down.has(e.code)) pressed.add(e.code);
    down.add(e.code);
    Sfx.unlock();
  });
  addEventListener('keyup', e => {
    down.delete(e.code);
    released.add(e.code);
  });
  addEventListener('blur', () => { down.clear(); });

  return {
    down: c => down.has(c),
    pressed: c => pressed.has(c),
    released: c => released.has(c),
    // Menu helpers
    confirm: () => pressed.has(KEYS.jump) || pressed.has(KEYS.confirm2),
    cancel: () => pressed.has(KEYS.attack) || pressed.has(KEYS.cancel2),
    endStep() { pressed.clear(); released.clear(); },
  };
})();
