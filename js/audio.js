/* ============================================================
 * 《AI 原生人才争夺战》 程序化音效（WebAudio，无音频文件）
 * ============================================================ */
(function () {
  'use strict';
  let ctx = null;
  let muted = localStorage.getItem('atw_muted') === '1';

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, delay, slide) {
    if (muted) return;
    try {
      const c = ac();
      const t0 = c.currentTime + (delay || 0);
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) { /* ignore */ }
  }

  function noise(dur, vol, freq, delay) {
    if (muted) return;
    try {
      const c = ac();
      const t0 = c.currentTime + (delay || 0);
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = freq || 800; f.Q.value = 1.2;
      const g = c.createGain();
      g.gain.setValueAtTime(vol || 0.2, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f).connect(g).connect(c.destination);
      src.start(t0);
    } catch (e) { /* ignore */ }
  }

  const SFX = {
    click() { tone(660, 0.06, 'triangle', 0.08); },
    draw() { noise(0.06, 0.06, 2400); },
    card() { noise(0.12, 0.14, 1400); tone(520, 0.08, 'triangle', 0.06, 0.02); },
    hit() { tone(120, 0.16, 'sawtooth', 0.2, 0, -60); noise(0.1, 0.18, 500); },
    crit() { tone(90, 0.22, 'sawtooth', 0.26, 0, -50); noise(0.16, 0.24, 320); },
    block() { tone(880, 0.1, 'square', 0.05); tone(1320, 0.12, 'square', 0.04, 0.03); },
    heal() { tone(520, 0.12, 'sine', 0.1); tone(780, 0.14, 'sine', 0.08, 0.08); },
    debuff() { tone(220, 0.2, 'sawtooth', 0.1, 0, -80); },
    coin() { tone(1046, 0.08, 'square', 0.07); tone(1568, 0.1, 'square', 0.06, 0.06); },
    energy() { tone(740, 0.09, 'triangle', 0.09, 0, 220); },
    summon() { tone(300, 0.15, 'triangle', 0.12, 0, 300); noise(0.12, 0.08, 1800, 0.05); },
    boss() { tone(70, 0.7, 'sawtooth', 0.22, 0, -20); tone(105, 0.7, 'sawtooth', 0.12, 0.1, -25); },
    turn() { noise(0.14, 0.07, 900); tone(392, 0.1, 'triangle', 0.07, 0.02); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.12)); },
    lose() { [392, 311, 233, 174].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.1, i * 0.18)); },
    potion() { tone(600, 0.1, 'sine', 0.1, 0, 300); noise(0.08, 0.06, 2600, 0.04); },
    error() { tone(180, 0.12, 'square', 0.1, 0, -40); }
  };

  window.SFX = {
    play(name) { if (SFX[name]) SFX[name](); },
    toggle() { muted = !muted; localStorage.setItem('atw_muted', muted ? '1' : '0'); return muted; },
    isMuted() { return muted; }
  };
})();
