let ctx: AudioContext | null = null;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); }
    catch { return null; }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function beep(freq = 660, dur = 0.09, vol = 0.15) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur + 0.02);
}

export function shutter() {
  const a = ac(); if (!a) return;
  const len = a.sampleRate * 0.12, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    d[i] = (Math.random() * 2 - 1) * (t < 0.15 ? 1 : Math.pow(1 - t, 3)) * (i < len * 0.4 || i > len * 0.55 ? 1 : 0.2);
  }
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1400;
  const g = a.createGain(); g.gain.value = 0.35;
  src.connect(f).connect(g).connect(a.destination); src.start();
}
