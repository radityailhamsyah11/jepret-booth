import type { ShapeId } from './config';
import { mulberry } from './util';

/** Builds (does not fill) a path for `shape` inside the box x,y,w,h. */
export function shapePath(ctx: CanvasRenderingContext2D, shape: ShapeId, x: number, y: number, w: number, h: number, seed = 1) {
  ctx.beginPath();
  const m = Math.min(w, h);
  switch (shape) {
    case 'rect': ctx.rect(x, y, w, h); break;
    case 'rounded': roundRect(ctx, x, y, w, h, m * 0.09); break;
    case 'oval': ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); break;
    case 'circle': ctx.arc(x + w / 2, y + h / 2, m / 2, 0, Math.PI * 2); break;
    case 'arch': {
      const r = Math.min(w / 2, h);
      ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.arc(x + w / 2, y + r, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath();
      break;
    }
    case 'heart': {
      const cx = x + w / 2, top = y + h * 0.28;
      ctx.moveTo(cx, y + h);
      ctx.bezierCurveTo(x - w * 0.05, y + h * 0.62, x - w * 0.02, y + h * 0.05, x + w * 0.28, y + h * 0.04);
      ctx.bezierCurveTo(x + w * 0.42, y + h * 0.04, cx, y + h * 0.14, cx, top);
      ctx.bezierCurveTo(cx, y + h * 0.14, x + w * 0.58, y + h * 0.04, x + w * 0.72, y + h * 0.04);
      ctx.bezierCurveTo(x + w * 1.02, y + h * 0.05, x + w * 1.05, y + h * 0.62, cx, y + h);
      ctx.closePath();
      break;
    }
    case 'scallop': {
      // bumps outward along every edge of an inset rect
      const br = m * 0.055, iw = w - 2 * br, ih = h - 2 * br;
      const nW = Math.max(3, Math.round(iw / (2 * br))), nH = Math.max(3, Math.round(ih / (2 * br)));
      const bw = iw / (2 * nW), bh = ih / (2 * nH);
      for (let i = 0; i < nW; i++) ctx.arc(x + br + bw * (2 * i + 1), y + br, bw, Math.PI, 0);
      for (let j = 0; j < nH; j++) ctx.arc(x + w - br, y + br + bh * (2 * j + 1), bh, -Math.PI / 2, Math.PI / 2);
      for (let i = nW - 1; i >= 0; i--) ctx.arc(x + br + bw * (2 * i + 1), y + h - br, bw, 0, Math.PI);
      for (let j = nH - 1; j >= 0; j--) ctx.arc(x + br, y + br + bh * (2 * j + 1), bh, Math.PI / 2, Math.PI * 1.5);
      ctx.closePath();
      break;
    }
    case 'stamp': {
      // perforated postage-stamp edge: half-circle bites into every edge
      const r = Math.max(4, m * 0.022), nW = Math.max(4, Math.round(w / (r * 3))), nH = Math.max(4, Math.round(h / (r * 3)));
      ctx.moveTo(x, y);
      for (let i = 0; i < nW; i++) ctx.arc(x + (i + 0.5) * (w / nW), y, r, Math.PI, 0, true);
      ctx.lineTo(x + w, y);
      for (let j = 0; j < nH; j++) ctx.arc(x + w, y + (j + 0.5) * (h / nH), r, -Math.PI / 2, Math.PI / 2, true);
      ctx.lineTo(x + w, y + h);
      for (let i = nW - 1; i >= 0; i--) ctx.arc(x + (i + 0.5) * (w / nW), y + h, r, 0, Math.PI, true);
      ctx.lineTo(x, y + h);
      for (let j = nH - 1; j >= 0; j--) ctx.arc(x, y + (j + 0.5) * (h / nH), r, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      break;
    }
    case 'ticket': {
      // concave notched corners
      const r = m * 0.12;
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
      ctx.arc(x + w, y, r, Math.PI, Math.PI / 2, true);
      ctx.lineTo(x + w, y + h - r);
      ctx.arc(x + w, y + h, r, -Math.PI / 2, Math.PI, true);
      ctx.lineTo(x + r, y + h);
      ctx.arc(x, y + h, r, 0, -Math.PI / 2, true);
      ctx.lineTo(x, y + r);
      ctx.arc(x, y, r, Math.PI / 2, 0, true);
      ctx.closePath();
      break;
    }
    case 'blob': {
      // organic die-cut: a wobbly ellipse, seeded so it is stable between renders
      const rnd = mulberry(seed * 131 + 7), N = 10, cx = x + w / 2, cy = y + h / 2;
      const ph = Array.from({ length: 3 }, () => rnd() * Math.PI * 2), amp = [0.06, 0.04, 0.025];
      const pts = Array.from({ length: N }, (_, i) => {
        const a = (i / N) * Math.PI * 2;
        const k = 0.9 + amp[0] * Math.sin(2 * a + ph[0]) + amp[1] * Math.sin(3 * a + ph[1]) + amp[2] * Math.sin(5 * a + ph[2]);
        return [cx + Math.cos(a) * (w / 2) * k, cy + Math.sin(a) * (h / 2) * k];
      });
      const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const start = mid(pts[N - 1], pts[0]);
      ctx.moveTo(start[0], start[1]);
      for (let i = 0; i < N; i++) { const p = pts[i], q = mid(p, pts[(i + 1) % N]); ctx.quadraticCurveTo(p[0], p[1], q[0], q[1]); }
      ctx.closePath();
      break;
    }
  }
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/** n-point star (sparkle when inner is small). */
export function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number, points = 4, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer, a = rot + (i * Math.PI) / points;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

export function heartPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  shapePath(ctx, 'heart', cx - s / 2, cy - s / 2, s, s * 0.92);
}
