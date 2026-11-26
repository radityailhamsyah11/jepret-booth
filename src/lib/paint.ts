/** Small drawing helpers shared by templates, the renderer and exporters. */
import { FRAMES, type Frame, type FrameId } from './config';
import { heartPath, roundRect, starPath } from './shapes';
import { dateText, mulberry } from './util';

export function frameOf(frame: FrameId, customBg: string): Frame {
  if (frame !== 'custom') return FRAMES[frame];
  const n = parseInt(customBg.slice(1), 16);
  const l = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return { name: 'Custom', bg: customBg, ink: l > 150 ? '#1d1916' : '#fbf6ee' };
}

export function drawFrameBg(ctx: CanvasRenderingContext2D, W: number, H: number, f: Frame) {
  if (f.grad) { const g = ctx.createLinearGradient(0, 0, W * 0.4, H); f.grad.forEach((c, i) => g.addColorStop(i / (f.grad!.length - 1), c)); ctx.fillStyle = g; }
  else ctx.fillStyle = f.bg!;
  ctx.fillRect(0, 0, W, H);
  if (!f.pattern) return;
  ctx.save(); ctx.fillStyle = f.pc!; ctx.strokeStyle = f.pc!;
  const rnd = mulberry(42);
  switch (f.pattern) {
    case 'gingham': { const s = 26; for (let x = 0; x < W; x += s * 2) ctx.fillRect(x, 0, s, H); for (let y = 0; y < H; y += s * 2) ctx.fillRect(0, y, W, s); break; }
    case 'dots': { const s = 30; for (let y = 0, r = 0; y < H + s; y += s, r++) for (let x = (r % 2) * s / 2; x < W + s; x += s) { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); } break; }
    case 'stripes': { ctx.lineWidth = 12; for (let x = -H; x < W; x += 34) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke(); } break; }
    case 'hearts': { const s = 52; for (let y = 0, r = 0; y < H + s; y += s, r++) for (let x = (r % 2) * s / 2; x < W + s; x += s) { heartPath(ctx, x, y, 22); ctx.fill(); } break; }
    case 'stars': { for (let i = 0; i < (W * H) / 5000; i++) { ctx.globalAlpha = 0.3 + rnd() * 0.7; starPath(ctx, rnd() * W, rnd() * H, 2 + rnd() * 7, 1, 4); ctx.fill(); } break; }
    case 'film': { ctx.globalAlpha = 0.9; for (let y = 14; y < H; y += 26) { ctx.beginPath(); roundRect(ctx, 8, y, 14, 9, 2); roundRect(ctx, W - 22, y, 14, 9, 2); ctx.fill(); } break; }
    case 'kraft': speckle(ctx, W, H, f.pc!, (W * H) / 90); break;
    case 'graph': {
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 20) { ctx.globalAlpha = x % 100 ? 0.5 : 1; ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 20) { ctx.globalAlpha = y % 100 ? 0.5 : 1; ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
      break;
    }
  }
  ctx.restore();
}

/** Paper fibre / dust specks. */
export function speckle(ctx: CanvasRenderingContext2D, W: number, H: number, color: string, count: number, seed = 42) {
  const rnd = mulberry(seed);
  ctx.save(); ctx.fillStyle = color;
  for (let i = 0; i < count; i++) { ctx.globalAlpha = rnd() * 0.6; ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1 + rnd() * 1.2); }
  ctx.restore();
}

export function vignette(ctx: CanvasRenderingContext2D, W: number, H: number, strength = 0.35) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) / 2);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

export function setTrack(ctx: CanvasRenderingContext2D, px: number) {
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

export interface TextOpts {
  font: (px: number) => string; size: number; color: string;
  align?: CanvasTextAlign; baseline?: CanvasTextBaseline;
  /** shrink until it fits this width */
  maxW?: number; track?: number; upper?: boolean;
  stroke?: { color: string; width: number }; shadow?: { color: string; dx: number; dy: number };
}
/** Draws one line of text, shrinking it to fit maxW. Returns the font size used. */
export function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, o: TextOpts) {
  if (o.upper) s = s.toUpperCase();
  let px = o.size;
  const apply = () => { ctx.font = o.font(px); setTrack(ctx, (o.track ?? 0) * px); };
  apply();
  if (o.maxW) while (ctx.measureText(s).width > o.maxW && px > 10) { px -= 2; apply(); }
  ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = o.baseline ?? 'middle';
  if (o.shadow) { ctx.fillStyle = o.shadow.color; ctx.fillText(s, x + o.shadow.dx, y + o.shadow.dy); }
  if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.stroke.width; ctx.strokeStyle = o.stroke.color; ctx.strokeText(s, x, y); }
  ctx.fillStyle = o.color; ctx.fillText(s, x, y);
  setTrack(ctx, 0);
  return px;
}

export function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color; starPath(ctx, x, y, r, r * 0.22, 4); ctx.fill();
}

export const today = dateText;
