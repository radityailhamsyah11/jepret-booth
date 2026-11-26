import { ACCENT, EMOJI_FONT, type FilterId, type ShapeId } from './config';
import { applyFilter } from './filters';
import { roundRect, shapePath } from './shapes';
import { frameFor, getTemplate, withSlot, type Slot, type Template } from './templates';
import type { Design, Marks, Shot, Sticker } from './types';

export type { Design, Marks, Shot, Sticker };

let nextId = 1;
export const makeShot = (src: HTMLCanvasElement): Shot => ({ id: nextId++, src, w: src.width, h: src.height, zoom: 1, ox: 0, oy: 0, cache: new Map() });

/** Cover-fits the shot into w×h with its zoom/pan. `src` overrides the image (e.g. a clip's <video> at the same size); `mirror` flips it. */
export function drawCover(ctx: CanvasRenderingContext2D, shot: Pick<Shot, 'src' | 'w' | 'h' | 'zoom' | 'ox' | 'oy'>, w: number, h: number, src: CanvasImageSource = shot.src, mirror = false) {
  const base = Math.max(w / shot.w, h / shot.h) * shot.zoom, dw = shot.w * base, dh = shot.h * base;
  const dx = (w - dw) / 2 + (shot.ox * (dw - w)) / 2, dy = (h - dh) / 2 + (shot.oy * (dh - h)) / 2;
  ctx.imageSmoothingQuality = 'high';
  if (mirror) { ctx.save(); ctx.translate(w, 0); ctx.scale(-1, 1); ctx.drawImage(src, w - dx - dw, dy, dw, dh); ctx.restore(); }
  else ctx.drawImage(src, dx, dy, dw, dh);
}

/** Cropped + filtered photo for one slot, at output pixel size. Cached per shot. */
export function renderCell(shot: Shot, cw: number, ch: number, scale: number, filter: FilterId, grain: number) {
  const w = Math.max(1, Math.round(cw * scale)), h = Math.max(1, Math.round(ch * scale));
  const key = `${shot.zoom}|${shot.ox}|${shot.oy}|${w}|${h}|${filter}|${grain}`;
  const hit = shot.cache.get(key); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  drawCover(x, shot, w, h);
  const im = x.getImageData(0, 0, w, h); applyFilter(filter, im, shot.id, grain * scale); x.putImageData(im, 0, 0);
  if (shot.cache.size > 6) shot.cache.delete(shot.cache.keys().next().value!);
  shot.cache.set(key, c);
  return c;
}

export const slotShape = (t: Template, d: Pick<Design, 'shape'>, s: Slot): ShapeId => (d.shape !== 'auto' ? d.shape : s.shape ?? t.shape);

export function stickerBox(ctx: CanvasRenderingContext2D, s: Sticker) {
  if (s.type === 'label') { ctx.font = `700 ${30 * s.s}px "Space Grotesk", sans-serif`; return { w: ctx.measureText(s.t).width + 36 * s.s, h: 54 * s.s }; }
  return { w: 92 * s.s, h: 92 * s.s };
}
function drawSticker(ctx: CanvasRenderingContext2D, s: Sticker, W: number, H: number, selected: boolean) {
  ctx.save(); ctx.translate(s.x * W, s.y * H); ctx.rotate((s.r * Math.PI) / 180);
  const b = stickerBox(ctx, s);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (s.type === 'label') {
    ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 8 * s.s; ctx.shadowOffsetY = 3 * s.s;
    ctx.beginPath(); roundRect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, b.h / 2); ctx.fillStyle = s.c || ACCENT; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.fillStyle = s.tc || '#fff';
    ctx.font = `700 ${30 * s.s}px "Space Grotesk", sans-serif`; ctx.fillText(s.t, 0, 2 * s.s);
  } else {
    ctx.font = `${80 * s.s}px ${EMOJI_FONT}`;
    ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 6 * s.s; ctx.shadowOffsetY = 2 * s.s;
    ctx.fillText(s.t, 0, 4 * s.s);
  }
  if (selected) {
    ctx.shadowColor = 'transparent'; ctx.setLineDash([8, 6]); ctx.lineWidth = 3; ctx.strokeStyle = ACCENT;
    ctx.beginPath(); roundRect(ctx, -b.w / 2 - 8, -b.h / 2 - 8, b.w + 16, b.h + 16, 12); ctx.stroke();
  }
  ctx.restore();
}

/** Which parts renderStrip draws. The live video draws `base`, then moving photos, then `overlay`. */
export interface Layers { bg: boolean; photos: boolean; decor: boolean; stickers: boolean }
const ALL: Layers = { bg: true, photos: true, decor: true, stickers: true };
export const BASE_LAYER: Layers = { bg: true, photos: false, decor: false, stickers: false };
export const OVERLAY_LAYER: Layers = { bg: false, photos: false, decor: true, stickers: true };

/** Supplies the pixels for a slot (default: the filtered still). Must return an image slot.w×slot.h at `scale`. */
export type CellSource = (slot: Slot, shot: Shot) => CanvasImageSource;

export interface RenderOpts { marks?: Marks; layers?: Layers; cell?: CellSource }

/** Draws the template with the user's photos. */
export function renderStrip(canvas: HTMLCanvasElement, scale: number, d: Design, o: RenderOpts = {}) {
  const t = getTemplate(d.layout), layers = o.layers ?? ALL, f = frameFor(d);
  canvas.width = Math.round(t.W * scale); canvas.height = Math.round(t.H * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const tc = { ctx, W: t.W, H: t.H, d, f };

  if (layers.bg) {
    t.bg(tc);
    // mats and drop shadows sit on the paper, under the photos
    t.slots.forEach((s, i) => withSlot(ctx, s, () => {
      const m = s.mat;
      if (!m && !s.shadow) return;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.32)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 9;
      if (m) { shapePath(ctx, m.shape ?? 'rect', -s.w / 2 - m.l, -s.h / 2 - m.t, s.w + m.l + m.r, s.h + m.t + m.b, i + 1); ctx.fillStyle = m.color; }
      else { shapePath(ctx, slotShape(t, d, s), -s.w / 2, -s.h / 2, s.w, s.h, i + 1); ctx.fillStyle = '#000'; }
      if (m && !m.shadow) ctx.shadowColor = 'transparent';
      ctx.fill(); ctx.restore();
    }));
  }

  if (layers.photos) t.slots.forEach((s, i) => withSlot(ctx, s, () => {
    const shot = d.shots[s.photo];
    shapePath(ctx, slotShape(t, d, s), -s.w / 2, -s.h / 2, s.w, s.h, i + 1); ctx.clip();
    if (shot) ctx.drawImage(o.cell ? o.cell(s, shot) : renderCell(shot, s.w, s.h, scale, d.filter, d.grain), -s.w / 2, -s.h / 2, s.w, s.h);
    else {
      ctx.fillStyle = '#cfc6b8'; ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
      ctx.fillStyle = '#5c5246'; ctx.font = `500 ${Math.max(14, Math.min(26, s.w / 12))}px "DM Mono", monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`+ foto ${s.photo + 1}`, 0, 0);
    }
  }));

  if (layers.decor) {
    t.slots.forEach((s, i) => {
      const stroke = s.stroke ?? (d.outline ? { w: 4, color: f.ink } : null);
      if (!stroke) return;
      withSlot(ctx, s, () => { shapePath(ctx, slotShape(t, d, s), -s.w / 2, -s.h / 2, s.w, s.h, i + 1); ctx.lineWidth = stroke.w; ctx.strokeStyle = stroke.color; ctx.stroke(); });
    });
    t.decor?.(tc);
  }

  if (o.marks && o.marks.selSlot >= 0) t.slots.forEach((s, i) => {
    if (s.photo !== o.marks!.selSlot) return;
    withSlot(ctx, s, () => { shapePath(ctx, slotShape(t, d, s), -s.w / 2 - 4, -s.h / 2 - 4, s.w + 8, s.h + 8, i + 1); ctx.lineWidth = 6; ctx.strokeStyle = ACCENT; ctx.stroke(); });
  });

  if (layers.stickers) d.stickers.forEach((s, i) => drawSticker(ctx, s, t.W, t.H, o.marks?.selSticker === i));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}
