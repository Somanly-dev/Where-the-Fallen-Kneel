'use strict';

// The pause menu, shared by the hub and the tutorial. Hanging signs layout.

const PAUSE_ITEMS = ['Resume', 'Controls', 'Settings', 'Leave to menu'];

class PauseMenu {
  constructor(onResume) {
    this.onResume = onResume;
    this.screen = 'menu';      // 'menu' | 'controls' | 'settings' | 'leave'
    this.index = 0;
    this.choice = 0;           // leave confirmation: 0 = Stay, 1 = Leave
    this.row = 0;              // settings: 0 = volume, 1 = dev tools
  }

  update() {
    if (Game.pending) return;
    const move = (Input.pressed(KEYS.down) ? 1 : 0) - (Input.pressed(KEYS.up) ? 1 : 0);
    const side = (Input.pressed(KEYS.right) ? 1 : 0) - (Input.pressed(KEYS.left) ? 1 : 0);
    const back = () => { this.screen = 'menu'; Sfx.play('cancel'); };

    if (this.screen === 'menu') {
      if (move) { this.index = (this.index + move + PAUSE_ITEMS.length) % PAUSE_ITEMS.length; Sfx.play('menu'); }
      if (Input.cancel()) { this.onResume(); return; }
      if (Input.confirm()) {
        Sfx.play('confirm');
        if (this.index === 0) this.onResume();
        else if (this.index === 1) this.screen = 'controls';
        else if (this.index === 2) this.screen = 'settings';
        else { this.screen = 'leave'; this.choice = 0; }
      }
    } else if (this.screen === 'controls') {
      if (Input.cancel() || Input.confirm()) back();
    } else if (this.screen === 'settings') {
      if (move) { this.row = 1 - this.row; Sfx.play('menu'); }
      if (side && this.row === 1) { Settings.devTools = !Settings.devTools; applyDevSetting(); Settings.write(); Sfx.play('menu'); }
      else if (side) {
        Settings.volume = clamp(Math.round((Settings.volume + side * 0.1) * 10) / 10, 0, 1);
        Sfx.setVolume(Settings.volume);
        Settings.write();
        Sfx.play('menu');
      }
      if (Input.cancel() || Input.confirm()) back();
    } else if (this.screen === 'leave') {
      if (side) { this.choice = 1 - this.choice; Sfx.play('menu'); }
      if (Input.cancel()) back();
      else if (Input.confirm()) {
        if (this.choice === 0) back();
        else { Save.write(); Music.play(null); Sfx.play('confirm'); Game.go(() => new TitleScene(0)); }
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    if (this.screen === 'menu') {
      px(ctx, 0, 0, W, 8, '#2a2d44'); px(ctx, 0, 8, W, 2, '#14152a');
      text(ctx, 'Paused', 240, 16, '#e8e2d0', 'center', 12);
      PAUSE_ITEMS.forEach((label, i) => {
        const y = 44 + i * 50, on = i === this.index, cx = 240;
        px(ctx, cx - 46, i ? y - 18 : 10, 2, i ? 18 : 34, '#3a3a46');
        px(ctx, cx + 44, i ? y - 18 : 10, 2, i ? 18 : 34, '#3a3a46');
        if (on) glowAdd(ctx, cx, y + 15, 100, '255,179,71', 0.14);
        px(ctx, cx - 72, y, 144, 32, on ? '#4a3a2a' : '#2a2d3c');
        px(ctx, cx - 72, y, 144, 4, on ? '#ffb347' : '#4a4e72');
        px(ctx, cx - 72, y + 28, 144, 4, '#14152a');
        px(ctx, cx - 66, y + 8, 4, 4, '#14152a'); px(ctx, cx + 62, y + 8, 4, 4, '#14152a');
        text(ctx, label, cx, y + 13, on ? '#fff2b0' : '#8a8aa6', 'center');
      });
      text(ctx, `Up/Down choose   ${keyName(KEYS.jump)} select   ${keyName(KEYS.cancel2)} resume`, 240, 256, '#6a6a8a', 'center');
    } else if (this.screen === 'controls') {
      panel(ctx, 70, 22, 340, 226);
      text(ctx, 'Controls', 240, 34, '#e8e2d0', 'center', 12);
      px(ctx, 94, 58, 292, 1, C.panelInner);
      controlRows().forEach(([a, b], k) => {
        text(ctx, a, 94, 68 + k * 14, '#8a8aa6');
        text(ctx, b, 386, 68 + k * 14, '#e8e2d0', 'right');
      });
      drawButton(ctx, 240, 208, 120, 'Back', 'focus');
    } else if (this.screen === 'settings') {
      panel(ctx, 80, 60, 320, 150);
      text(ctx, 'Settings', 240, 72, '#e8e2d0', 'center', 12);
      text(ctx, 'Volume', 100, 110, this.row === 0 ? '#f2c14e' : '#e8e2d0');
      const pips = Math.round(Settings.volume * 10);
      for (let i = 0; i < 10; i++) px(ctx, 198 + i * 16, 108, 12, 12, i < pips ? '#f2c14e' : '#25263f');
      text(ctx, '<', 182, 110, '#f2c14e'); text(ctx, '>', 362, 110, '#f2c14e');
      text(ctx, `${Math.round(Settings.volume * 100)}%`, 280, 130, '#8a8aa6', 'center');
      text(ctx, 'Dev tools', 100, 148, this.row === 1 ? '#f2c14e' : '#e8e2d0');
      text(ctx, Settings.devTools ? 'ON' : 'OFF', 380, 148, Settings.devTools ? '#7fe88a' : '#8a8aa6', 'right');
      drawButton(ctx, 240, 172, 120, 'Back', 'focus');
      text(ctx, `Up/Down row   Left/Right change   ${keyName(KEYS.jump)} back`, 240, 256, '#6a6a8a', 'center');
    } else if (this.screen === 'leave') {
      panel(ctx, 80, 62, 320, 146, '#ff5a6a');
      text(ctx, 'Leave to menu?', 240, 76, '#ff9aa4', 'center');
      ['Your file saves automatically.', 'You will return to the title screen.'].forEach((l, i) => text(ctx, l, 240, 100 + i * 14, '#e8e2d0', 'center'));
      drawButton(ctx, 170, 160, 130, 'Stay', this.choice === 0 ? 'focus' : 'idle');
      drawButton(ctx, 310, 160, 130, 'Leave', this.choice === 1 ? 'focus' : 'idle', 'danger');
      text(ctx, `Left/Right   ${keyName(KEYS.jump)} confirm   ${keyName(KEYS.cancel2)} stay`, 240, 192, '#6a6a8a', 'center');
    }
  }
}
