import { applyFilter } from './filters';
import { text, today } from './paint';
import { BASE_LAYER, OVERLAY_LAYER, drawCover, renderCell, renderStrip, type Design, type Shot } from './render';
import { shapePath, starPath, roundRect } from './shapes';
import { frameFor, getTemplate } from './templates';
import { clamp, fontsReady, mulberry, wait } from './util';

export async function makePng(d: Design): Promise<Blob> {
  await fontsReady;
  const t = getTemplate(d.layout);
  // ~2400px on the long side
  const c = renderStrip(document.createElement('canvas'), Math.min(2.4, 2400 / Math.max(t.W, t.H) * 1.2), d);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
}

const activeShots = (d: Design) => d.shots.slice(0, getTemplate(d.layout).photos);
export const hasClips = (d: Design) => activeShots(d).some(s => s?.clip);

async function loadClip(url: string) {
  const v = document.createElement('video');
  v.src = url; v.muted = true; v.playsInline = true; v.preload = 'auto';
  const ok = await new Promise<boolean>(res => {
    v.addEventListener('loadeddata', () => res(true), { once: true });
    v.addEventListener('error', () => res(false), { once: true });
    setTimeout(() => res(false), 5000);
  });
  return ok ? v : null;
}
async function seek(v: HTMLVideoElement, t: number) {
  v.currentTime = t;
  await new Promise<void>(res => { const done = () => res(); v.addEventListener('seeked', done, { once: true }); setTimeout(done, 1500); });
}

/**
 * Flipbook GIF, landscape: the template's colours as a frame, sparkles in the side margins,
 * and every shot flipping by. With camera clips each shot becomes a little stop-motion burst.
 */
export async function makeGif(d: Design): Promise<Blob> {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
  const shots = activeShots(d).filter((s): s is Shot => s !== null);
  if (!shots.length) throw new Error('no photos');
  await fontsReady;
  const t = getTemplate(d.layout), theme = t.usesFrame ? { bg: frameFor(d).bg ?? frameFor(d).grad?.[0] ?? '#f3ead8', ink: frameFor(d).ink, accent: frameFor(d).ink } : t.theme;
  const W = 600, H = 400, px = 72, py = 22, pw = W - px * 2, ph = H - py - 46;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  const cell = document.createElement('canvas'); cell.width = pw; cell.height = ph;
  const cx = cell.getContext('2d', { willReadFrequently: true })!;
  const shape = d.shape === 'auto' ? 'rounded' : d.shape;
  const rnd = mulberry(9);
  const stars = Array.from({ length: 12 }, (_, i) => ({ x: i < 6 ? 10 + rnd() * (px - 24) : W - px + 12 + rnd() * (px - 24), y: 20 + rnd() * (H - 40), r: 8 + rnd() * 12, p: i % 3 === 0 ? 8 : 4 }));
  const gif = GIFEncoder();

  const frame = (img: CanvasImageSource, mirror: boolean, shot: Shot, seed: number, delay: number) => {
    x.fillStyle = theme.bg; x.fillRect(0, 0, W, H);
    for (const s of stars) { x.fillStyle = theme.accent; starPath(x, s.x, s.y, s.r, s.r * (s.p === 8 ? 0.45 : 0.25), s.p); x.fill(); }
    cx.clearRect(0, 0, pw, ph); drawCover(cx, shot, pw, ph, img, mirror);
    const im = cx.getImageData(0, 0, pw, ph); applyFilter(d.filter, im, seed, d.grain); cx.putImageData(im, 0, 0);
    x.save(); shapePath(x, shape, px, py, pw, ph, 1); x.clip(); x.drawImage(cell, px, py); x.restore();
    const cap = d.caption.trim();
    if (cap) text(x, cap, W - px, H - 22, { font: p => `400 ${p}px Shrikhand, serif`, size: 22, color: theme.ink, align: 'right', maxW: 340 });
    if (d.showDate) text(x, today(), px, H - 22, { font: p => `500 ${p}px "DM Mono", monospace`, size: 13, color: theme.ink, align: 'left', track: 0.2 });
    const { data } = x.getImageData(0, 0, W, H);
    const palette = quantize(data, 256);
    gif.writeFrame(applyPalette(data, palette), W, H, { palette, delay });
  };

  for (const shot of shots) {
    const v = shot.clip ? await loadClip(shot.clip.url) : null;
    if (v && Number.isFinite(v.duration)) {
      // last ~1.4s of the countdown clip as a 7-frame burst, then the still
      for (let k = 0; k < 7; k++) {
        await seek(v, Math.max(0, v.duration - 1.5 + k * 0.2));
        frame(v, shot.clip!.mirrored, shot, shot.id + k, 110);
        await wait(0);
      }
      v.removeAttribute('src');
    }
    frame(shot.src, false, shot, shot.id, v ? 500 : 650);
    await wait(0);
  }
  gif.finish();
  return new Blob([gif.bytes() as BlobPart], { type: 'image/gif' });
}

export function videoSupport(): string | null {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
  return ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) ?? null;
}
const ext = (mime: string) => (mime.includes('mp4') ? 'mp4' : 'webm');
function recorder(c: HTMLCanvasElement, mime: string, bps: number) {
  const stream = c.captureStream(30), rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bps }), chunks: Blob[] = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<Blob>(r => (rec.onstop = () => { stream.getTracks().forEach(tr => tr.stop()); r(new Blob(chunks, { type: mime.split(';')[0] })); }));
  return { rec, done };
}

/** 5s, 9:16 clip of the strip sliding out of a booth slot. */
export async function makeVideo(d: Design, mime: string): Promise<{ blob: Blob; ext: string }> {
  await fontsReady;
  const strip = renderStrip(document.createElement('canvas'), 1, d);
  const W = 720, H = 1280, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const sw = Math.min(W * 0.7, strip.width), sh = (strip.height * sw) / strip.width;
  const fit = Math.min(1, (H - 260) / sh), dw = sw * fit, dh = sh * fit;
  const { rec, done } = recorder(c, mime, 6e6);
  const ease = (k: number) => 1 - Math.pow(1 - k, 3);
  const dur = 5000; let t0 = 0;
  const draw = (now: number) => {
    if (!t0) t0 = now;
    const t = Math.min(1, (now - t0) / dur);
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#221b17'); g.addColorStop(1, '#0d0b0a');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const slotY = 150;
    x.fillStyle = '#2f2723'; x.beginPath(); roundRect(x, W / 2 - dw / 2 - 40, slotY - 26, dw + 80, 52, 26); x.fill();
    x.fillStyle = '#000'; x.beginPath(); roundRect(x, W / 2 - dw / 2 - 14, slotY - 4, dw + 28, 8, 4); x.fill();
    const p = ease(clamp((t - 0.08) / 0.62, 0, 1)), wob = Math.sin(now / 90) * (p > 0 && p < 1 ? 1.2 : 0);
    x.save(); x.beginPath(); x.rect(0, slotY, W, H); x.clip();
    x.translate(W / 2 + wob, slotY); x.rotate((-2 * Math.PI / 180) * clamp((t - 0.7) / 0.15, 0, 1));
    x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 40; x.shadowOffsetY = 20;
    x.drawImage(strip, -dw / 2, dh * p - dh, dw, dh); x.restore();
    if (t < 0.08) { x.fillStyle = `rgba(255,255,255,${(1 - t / 0.08) * 0.9})`; x.fillRect(0, 0, W, H); }
    x.globalAlpha = clamp((t - 0.72) / 0.15, 0, 1);
    text(x, 'jepret.', W / 2, H - 80, { font: p2 => `400 ${p2}px Shrikhand, serif`, size: 50, color: '#f4ece1' });
    x.globalAlpha = 1;
    if (t < 1) requestAnimationFrame(draw); else setTimeout(() => rec.stop(), 120);
  };
  rec.start(200); requestAnimationFrame(draw);
  return { blob: await done, ext: ext(mime) };
}

/**
 * "Live strip": the finished template with every camera shot playing its countdown clip in its
 * slot(s), all at once. Each slot ends on its exact captured photo and the still holds a moment.
 */
export async function makeLiveVideo(d: Design, mime: string): Promise<{ blob: Blob; ext: string }> {
  await fontsReady;
  const t = getTemplate(d.layout);
  const scale = Math.min(1.6, 1920 / Math.max(t.W, t.H));
  const even = (v: number) => Math.round(v / 2) * 2;
  const c = document.createElement('canvas'); c.width = even(t.W * scale); c.height = even(t.H * scale);
  const x = c.getContext('2d')!;
  const base = renderStrip(document.createElement('canvas'), scale, d, { layers: BASE_LAYER });
  const overlay = renderStrip(document.createElement('canvas'), scale, d, { layers: OVERLAY_LAYER });
  const photosLayer = document.createElement('canvas');

  const shots = activeShots(d);
  const videos = await Promise.all(shots.map(s => (s?.clip ? loadClip(s.clip.url) : Promise.resolve(null))));
  // one scratch canvas per (photo, size) so twin slots don't fight over pixels
  const scratch = new Map<string, { c: HTMLCanvasElement; x: CanvasRenderingContext2D; frame: number }>();
  let frameNo = 0;

  const { rec, done } = recorder(c, mime, 8e6);
  const HOLD = 1400, MAX = 15000;
  let allEndedAt = 0, t0 = 0;

  const draw = (now: number) => {
    if (!t0) t0 = now;
    frameNo++;
    x.drawImage(base, 0, 0, c.width, c.height);
    renderStrip(photosLayer, scale, d, {
      layers: { bg: false, photos: true, decor: false, stickers: false },
      cell: (slot, shot) => {
        const v = videos[slot.photo];
        const live = v && !v.ended && v.currentTime > 0;
        if (!live) return renderCell(shot, slot.w, slot.h, scale, d.filter, d.grain);
        const w = Math.round(slot.w * scale), h = Math.round(slot.h * scale), key = `${slot.photo}|${w}|${h}`;
        let s = scratch.get(key);
        if (!s) { const cc = document.createElement('canvas'); cc.width = w; cc.height = h; s = { c: cc, x: cc.getContext('2d', { willReadFrequently: true })!, frame: -1 }; scratch.set(key, s); }
        if (s.frame !== frameNo) {
          s.x.clearRect(0, 0, w, h);
          drawCover(s.x, shot, w, h, v!, shot.clip!.mirrored);
          const im = s.x.getImageData(0, 0, w, h);
          applyFilter(d.filter, im, shot.id + frameNo, d.grain * scale); // fresh grain each frame
          s.x.putImageData(im, 0, 0); s.frame = frameNo;
        }
        return s.c;
      },
    });
    x.drawImage(photosLayer, 0, 0, c.width, c.height);
    x.drawImage(overlay, 0, 0, c.width, c.height);
    const playing = videos.some(v => v && !v.ended);
    if (!playing && !allEndedAt) allEndedAt = now;
    if ((allEndedAt && now - allEndedAt > HOLD) || now - t0 > MAX) { setTimeout(() => rec.stop(), 80); return; }
    requestAnimationFrame(draw);
  };

  rec.start(200);
  await Promise.all(videos.map(v => v?.play().catch(() => {})));
  requestAnimationFrame(draw);
  const blob = await done;
  videos.forEach(v => v?.removeAttribute('src'));
  return { blob, ext: ext(mime) };
}

