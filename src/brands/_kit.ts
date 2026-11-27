/** Shared helpers for brand packs: load logos once, trim them, make white variants, draw them. */
import { registerAsset } from '../lib/util';

export interface Logo { c: HTMLCanvasElement | null }

/** Crops transparent margins so logos align by their visible edges. */
function trim(img: HTMLImageElement): HTMLCanvasElement {
  // rasterise at ≥1200px wide so small SVGs stay sharp when drawn large
  const k = Math.max(1, 1200 / (img.naturalWidth || 1200));
  const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(img, 0, 0, c.width, c.height);
  const { data, width, height } = x.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let i = 0; i < width; i++) if (data[(y * width + i) * 4 + 3] > 8) {
    if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return c;
  const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d')!.drawImage(c, -x0, -y0);
  return out;
}

/** White version for coloured backgrounds: coloured pixels → white, near-white pixels (e.g. a face on a badge) → `accent`. */
export function whiteOn(accent: string) {
  const n = parseInt(accent.slice(1), 16), ar = n >> 16, ag = (n >> 8) & 255, ab = n & 255;
  return (c: HTMLCanvasElement) => {
    const x = c.getContext('2d', { willReadFrequently: true })!, im = x.getImageData(0, 0, c.width, c.height), d = im.data;
    for (let p = 0; p < d.length; p += 4) {
      if (!d[p + 3]) continue;
      const mx = Math.max(d[p], d[p + 1], d[p + 2]), mn = Math.min(d[p], d[p + 1], d[p + 2]);
      const nearWhite = mn > 200 && mx - mn < 30;
      if (nearWhite) { d[p] = ar; d[p + 1] = ag; d[p + 2] = ab; } else { d[p] = d[p + 1] = d[p + 2] = 255; }
    }
    x.putImageData(im, 0, 0);
    return c;
  };
}

/** Loads a logo at module load; renders wait for it through registerAsset. */
export function logo(url: string, fx?: (c: HTMLCanvasElement) => HTMLCanvasElement): Logo {
  const holder: Logo = { c: null };
  registerAsset(new Promise<void>(res => {
    const img = new Image();
    img.onload = () => { holder.c = fx ? fx(trim(img)) : trim(img); res(); };
    img.onerror = () => res();
    img.src = url;
  }));
  return holder;
}

/** Draws a logo `w` wide at x,y. `align` picks the anchor along x; y is the top edge. Returns its height. */
export function drawLogo(ctx: CanvasRenderingContext2D, l: Logo, x: number, y: number, w: number, align: 'left' | 'center' | 'right' = 'center') {
  if (!l.c) return 0;
  const h = (w * l.c.height) / l.c.width, dx = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  ctx.drawImage(l.c, dx, y, w, h);
  return h;
}

export const nunito = (weight: 600 | 800 | 900) => (px: number) => `${weight} ${px}px Nunito, "Space Grotesk", sans-serif`;
