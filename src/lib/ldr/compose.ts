/**
 * Turns one LDR shot (one photo per participant) into a single image shaped like the template slot
 * it will fill, with everyone side by side (landscape slots) or stacked (portrait slots).
 *   2 people -> halves, 3 -> thirds, 4 -> 2×2 grid.
 */
import { drawCover } from '../render';

const GAP = 10;

export async function toBitmap(b: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(b);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d')!.drawImage(img, 0, 0); return c;
  } finally { URL.revokeObjectURL(url); }
}

/** photos in display order (host first); aspect = slot height / width. */
export async function composeShot(photos: Blob[], aspect = 0.75, gapColor = '#f3ead8'): Promise<HTMLCanvasElement> {
  const imgs = await Promise.all(photos.map(toBitmap));
  const portrait = aspect > 1.05;
  const W = portrait ? Math.round(1600 / aspect) : 1600, H = portrait ? 1600 : Math.round(1600 * aspect);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = gapColor; x.fillRect(0, 0, W, H);
  const n = imgs.length;
  const cells: [number, number, number, number][] =
    n <= 1 ? [[0, 0, W, H]]
    : n === 4 ? [0, 1, 2, 3].map(i => [(i % 2) * (W + GAP) / 2, Math.floor(i / 2) * (H + GAP) / 2, (W - GAP) / 2, (H - GAP) / 2])
    : portrait ? Array.from({ length: n }, (_, i) => [0, i * (H + GAP) / n, W, (H - GAP * (n - 1)) / n])
    : Array.from({ length: n }, (_, i) => [i * (W + GAP) / n, 0, (W - GAP * (n - 1)) / n, H]);
  imgs.forEach((src, i) => {
    const [cx, cy, cw, ch] = cells[i];
    x.save(); x.translate(cx, cy); x.beginPath(); x.rect(0, 0, cw, ch); x.clip();
    drawCover(x, { src, w: src.width, h: src.height, zoom: 1, ox: 0, oy: 0 }, cw, ch);
    x.restore();
  });
  return c;
}

/** Local camera frame as a JPEG (max 1280 px wide), mirrored like the preview when asked. */
export function grabFrame(video: HTMLVideoElement, mirror: boolean): Promise<Blob> {
  const k = Math.min(1, 1280 / (video.videoWidth || 1280));
  const c = document.createElement('canvas'); c.width = Math.round(video.videoWidth * k); c.height = Math.round(video.videoHeight * k);
  const x = c.getContext('2d')!;
  if (mirror) { x.translate(c.width, 0); x.scale(-1, 1); }
  x.drawImage(video, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', 0.9));
}
