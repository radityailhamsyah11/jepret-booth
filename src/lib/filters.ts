import type { FilterId } from './config';
import { clamp, mulberry } from './util';

function blur1(src: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const o = y * w; let v = 0;
    for (let k = -r; k <= r; k++) v += src[o + clamp(k, 0, w - 1)];
    for (let x = 0; x < w; x++) { tmp[o + x] = v / n; v += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)]; }
  }
  for (let x = 0; x < w; x++) {
    let v = 0;
    for (let k = -r; k <= r; k++) v += tmp[clamp(k, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) { out[y * w + x] = v / n; v += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; }
  }
  return out;
}
const blur = (src: Float32Array, w: number, h: number, r: number) => blur1(blur1(src, w, h, r), w, h, r);

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const con = (v: number, c: number, mid = 128) => (v - mid) * c + mid;

/** Applies a filter to the pixels in place. Seeded so grain does not flicker between re-renders. */
export function applyFilter(id: FilterId, im: ImageData, seed: number, grainAmt: number) {
  const { data: d, width: w, height: h } = im, N = w * h, rnd = mulberry(seed * 9973 + 17);
  let grain = grainAmt, vign = 0;

  if (id === 'sketch' || id === 'ink') {
    // pencil sketch: grayscale, colour-dodge it with a blurred inverse
    const g = new Float32Array(N);
    for (let i = 0, p = 0; i < N; i++, p += 4) g[i] = lum(d[p], d[p + 1], d[p + 2]);
    const inv = new Float32Array(N);
    for (let i = 0; i < N; i++) inv[i] = 255 - g[i];
    const b = blur(inv, w, h, Math.max(2, Math.round(Math.min(w, h) / (id === 'ink' ? 90 : 60))));
    for (let i = 0, p = 0; i < N; i++, p += 4) {
      let v = Math.min(255, (g[i] * 255) / Math.max(1, 255 - b[i]));
      if (id === 'sketch') { v = Math.pow(v / 255, 2.1) * 255; v = v * 0.92 + 18; }
      else v = v < 205 ? Math.pow(v / 205, 2.6) * 120 : 255;
      const n = (rnd() - 0.5) * (id === 'sketch' ? 14 : 6);
      d[p] = clamp(v + n + 4, 0, 255); d[p + 1] = clamp(v + n + 1, 0, 255); d[p + 2] = clamp(v + n - 6, 0, 255);
    }
  } else {
    for (let p = 0; p < d.length; p += 4) {
      let r = d[p], g = d[p + 1], b = d[p + 2], l: number;
      switch (id) {
        case 'natural': l = lum(r, g, b); r = con(l + (r - l) * 1.06, 1.04); g = con(l + (g - l) * 1.06, 1.04); b = con(l + (b - l) * 1.06, 1.04); break;
        case 'pop': l = lum(r, g, b); r = con(l + (r - l) * 1.45, 1.12); g = con(l + (g - l) * 1.45, 1.12); b = con(l + (b - l) * 1.45, 1.12); break;
        case 'film': l = lum(r, g, b); r = con(l + (r - l) * 0.85, 1.05) * 0.92 + 26; g = con(l + (g - l) * 0.85, 1.05) * 0.9 + 18; b = con(l + (b - l) * 0.85, 1.0) * 0.82 + 22; break;
        case 'mono': l = con(lum(r, g, b), 1.25); r = g = b = l; break;
        case 'sepia': l = con(lum(r, g, b), 1.18, 120); r = l * 1.07 + 22; g = l * 0.94 + 10; b = l * 0.74 + 2; break;
        case 'noir': l = con(lum(r, g, b), 1.6, 118) - 10; r = g = b = l; break;
        case 'warm': r = r * 1.08 + 10; g = g * 1.02 + 3; b = b * 0.86; break;
        case 'cool': r = r * 0.9; g = g + 4; b = b * 1.08 + 12; break;
        case 'faded': l = lum(r, g, b); r = (l + (r - l) * 0.7) * 0.8 + 38; g = (l + (g - l) * 0.7) * 0.8 + 36; b = (l + (b - l) * 0.7) * 0.8 + 42; break;
        case 'dream': l = lum(r, g, b); r = con(l + (r - l) * 1.15, 0.9) * 1.02 + 22; g = con(l + (g - l) * 1.15, 0.9) + 14; b = con(l + (b - l) * 1.15, 0.9) * 1.04 + 26; break;
        case 'y2k': l = lum(r, g, b); r = con(l + (r - l) * 1.5, 1.1) + 12; g = con(l + (g - l) * 1.3, 1.1) - 4; b = con(l + (b - l) * 1.6, 1.1) + 20; break;
      }
      d[p] = r; d[p + 1] = g; d[p + 2] = b;
    }
    if (id === 'film') { grain = Math.max(grain, 14); vign = 0.35; }
    if (id === 'mono' || id === 'noir' || id === 'sepia') { grain = Math.max(grain, 10); vign = id === 'noir' ? 0.55 : id === 'sepia' ? 0.3 : 0.2; }
    if (id === 'dream') vign = -0.18;
  }

  if (grain > 0 || vign !== 0) {
    const cx = w / 2, cy = h / 2, md = Math.hypot(cx, cy);
    for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p += 4) {
      const k = vign ? 1 - vign * Math.pow(Math.hypot(x - cx, y - cy) / md, 2.2) : 1;
      const n = grain ? (rnd() - 0.5) * grain * 2 : 0;
      d[p] = clamp(d[p] * k + n, 0, 255); d[p + 1] = clamp(d[p + 1] * k + n, 0, 255); d[p + 2] = clamp(d[p + 2] * k + n, 0, 255);
    }
  }
}
