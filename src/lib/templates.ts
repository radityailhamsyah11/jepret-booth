/**
 * Strip templates. A template owns its canvas size, where each photo slot sits (position,
 * rotation, shape, mat), and how the paper around the photos is painted.
 * Slots reference a photo index, so one photo can appear in several slots (twin strips, sheets).
 */
import { EMOJI_FONT, FONTS, LAYOUTS, type ClassicId, type FilterId, type Frame, type ShapeId } from './config';
import { drawFrameBg, frameOf, sparkle, speckle, text, today, vignette } from './paint';
import { heartPath, roundRect, shapePath, starPath } from './shapes';
import type { Design } from './types';
import { mulberry } from './util';

export interface Mat { l: number; t: number; r: number; b: number; color: string; shape?: ShapeId; shadow?: boolean }
export interface Slot {
  x: number; y: number; w: number; h: number;
  /** degrees, around the slot centre */
  rot?: number;
  /** which captured photo (0-based) fills this slot */
  photo: number;
  shape?: ShapeId;
  /** paper behind the photo (polaroid border, stamp, …) */
  mat?: Mat;
  shadow?: boolean;
  stroke?: { w: number; color: string };
}
export interface TplCtx { ctx: CanvasRenderingContext2D; W: number; H: number; d: Design; f: Frame }
export interface Template {
  id: string; name: string; desc: string; group: 'retro' | 'klasik';
  W: number; H: number;
  /** distinct photos to capture */
  photos: number;
  slots: Slot[];
  /** default slot shape when the user keeps shape on "auto" */
  shape: ShapeId;
  /** frame colour/pattern picker applies */
  usesFrame?: boolean;
  /** caption font picker applies */
  usesFont?: boolean;
  /** filter applied when the template is picked */
  filter?: FilterId;
  /** colours for the GIF frame and the picker */
  theme: { bg: string; ink: string; accent: string };
  bg: (t: TplCtx) => void;
  decor?: (t: TplCtx) => void;
}

/** Runs fn in the slot's local space: origin at its centre, rotated. */
export function withSlot(ctx: CanvasRenderingContext2D, s: Slot, fn: () => void) {
  ctx.save(); ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
  if (s.rot) ctx.rotate((s.rot * Math.PI) / 180);
  fn(); ctx.restore();
}

/** Topmost slot under a point (template units), honouring rotation. */
export function hitSlot(t: Template, px: number, py: number) {
  for (let i = t.slots.length - 1; i >= 0; i--) {
    const s = t.slots[i], a = (-(s.rot ?? 0) * Math.PI) / 180;
    const dx = px - (s.x + s.w / 2), dy = py - (s.y + s.h / 2);
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) <= s.w / 2 && Math.abs(ly) <= s.h / 2) return i;
  }
  return -1;
}

/** Aspect (h/w) of the first slot showing photo i, for capture thumbnails. */
export const photoAspect = (t: Template, i: number) => { const s = t.slots.find(x => x.photo === i) ?? t.slots[0]; return s.h / s.w; };

const F = {
  abril: (px: number) => `400 ${px}px "Abril Fatface", Georgia, serif`,
  bungee: (px: number) => `400 ${px}px Bungee, sans-serif`,
  vibes: (px: number) => `400 ${px}px "Great Vibes", cursive`,
  elite: (px: number) => `400 ${px}px "Special Elite", monospace`,
  bagel: (px: number) => `400 ${px}px "Bagel Fat One", sans-serif`,
  shrik: (px: number) => `400 ${px}px Shrikhand, serif`,
  brico: (px: number) => `800 ${px}px "Bricolage Grotesque", sans-serif`,
  mono: (px: number) => `500 ${px}px "DM Mono", monospace`,
  frak: (px: number) => `400 ${px}px "UnifrakturMaguntia", serif`,
  fraunces: (px: number) => `italic 500 ${px}px Fraunces, serif`,
};
const caption = (d: Design) => d.caption.trim();

/* ------------------------------------------------------------------ classic */

function classic(id: ClassicId): Template {
  const L = LAYOUTS[id];
  const W = L.pad * 2 + L.cols * L.cw + (L.cols - 1) * L.gap, H = L.top + L.rows * L.ch + (L.rows - 1) * L.gap + L.foot;
  const slots: Slot[] = Array.from({ length: L.cols * L.rows }, (_, i) => ({ x: L.pad + (i % L.cols) * (L.cw + L.gap), y: L.top + Math.floor(i / L.cols) * (L.ch + L.gap), w: L.cw, h: L.ch, photo: i }));
  return {
    id, name: L.name, desc: 'Klasik · warna & motif bebas', group: 'klasik', W, H, photos: slots.length, slots, shape: 'rect',
    usesFrame: true, usesFont: true, theme: { bg: '#f3ead8', ink: '#2a211b', accent: '#e2452b' },
    bg: ({ ctx, f }) => drawFrameBg(ctx, W, H, f),
    decor: ({ ctx, d, f }) => {
      const fnt = FONTS[d.font], cy = H - L.foot / 2 - (d.showDate ? 12 : 0), cap = caption(d);
      if (cap) text(ctx, cap, W / 2, cy, { font: fnt.css, size: fnt.size, color: f.ink, maxW: W - L.pad * 2 - 20, track: fnt.track, upper: fnt.upper });
      if (d.showDate) { ctx.globalAlpha = 0.65; text(ctx, today(), W / 2, cap ? cy + 46 : cy + 12, { font: F.mono, size: 18, color: f.ink, track: 0.22 }); ctx.globalAlpha = 1; }
    },
  };
}

/* ------------------------------------------------------------------ retro */

const kartu: Template = (() => {
  const W = 1000, H = 1400, cw = 430, ch = 600, red = '#c8231f';
  const cards: [number, number, string][] = [[50, 60, 'A'], [520, 60, 'K'], [50, 690, 'Q'], [520, 690, 'J']];
  const corner = (ctx: CanvasRenderingContext2D, rank: string, x: number, y: number) => {
    text(ctx, rank, x, y, { font: F.abril, size: 66, color: red });
    ctx.fillStyle = red; heartPath(ctx, x, y + 58, 40); ctx.fill();
  };
  return {
    id: 'kartu', name: 'Kartu Remi', desc: 'Empat kartu hati, foto sepia', group: 'retro', W, H, photos: 4, shape: 'rounded', filter: 'sepia',
    theme: { bg: '#faf5ea', ink: red, accent: red },
    slots: cards.map(([x, y], i) => ({ x: x + 80, y: y + 80, w: 270, h: 440, photo: i, shadow: true })),
    bg: ({ ctx }) => {
      ctx.fillStyle = '#e8dcc6'; ctx.fillRect(0, 0, W, H); speckle(ctx, W, H, '#8a7556', 3000);
      for (const [x, y, rank] of cards) {
        ctx.save(); ctx.shadowColor = 'rgba(60,40,20,.28)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
        ctx.beginPath(); roundRect(ctx, x, y, cw, ch, 26); ctx.fillStyle = '#faf5ea'; ctx.fill(); ctx.restore();
        ctx.lineWidth = 2; ctx.strokeStyle = '#d9cdb5'; ctx.stroke();
        corner(ctx, rank, x + 42, y + 58);
        ctx.save(); ctx.translate(x + cw - 42, y + ch - 58); ctx.rotate(Math.PI); corner(ctx, rank, 0, 0); ctx.restore();
      }
    },
    decor: ({ ctx, d }) => {
      const cap = caption(d);
      if (cap) text(ctx, cap, W / 2, 1338, { font: F.abril, size: 40, color: red, maxW: 800 });
      if (d.showDate) text(ctx, today(), W / 2, 1378, { font: F.elite, size: 18, color: '#6b5a44', track: 0.2 });
    },
  };
})();

const memory: Template = (() => {
  const W = 800, H = 1200;
  const slots: Slot[] = [{ x: 90, y: 70, w: 500, h: 320, photo: 0 }, { x: 210, y: 420, w: 500, h: 320, photo: 1 }, { x: 90, y: 770, w: 500, h: 320, photo: 2 }];
  return {
    id: 'memory', name: 'Memory Lane', desc: 'Zig-zag di latar hitam, cocok buat video', group: 'retro', W, H, photos: 3, slots, shape: 'rect', filter: 'natural',
    theme: { bg: '#0a0a0a', ink: '#f4efe6', accent: '#f4efe6' },
    bg: ({ ctx }) => { ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, H); },
    decor: ({ ctx, d }) => {
      ctx.save(); ctx.translate(38, H / 2 - 40); ctx.rotate(-Math.PI / 2);
      text(ctx, `JEPRET · MEMORY LANE · ${today()}`, 0, 0, { font: F.mono, size: 13, color: '#bdbdbd', track: 0.35 });
      ctx.restore();
      ctx.fillStyle = '#f4efe6';
      slots.forEach((s, i) => {
        const tx = s.x === 90 ? 640 : 120;
        text(ctx, String(i + 1).padStart(2, '0'), tx, s.y + 20, { font: F.mono, size: 14, color: '#9a9a9a', track: 0.2 });
        ctx.beginPath(); ctx.moveTo(38, s.y + s.h / 2 - 7); ctx.lineTo(45, s.y + s.h / 2 + 5); ctx.lineTo(31, s.y + s.h / 2 + 5); ctx.closePath(); ctx.fill();
      });
      const cap = caption(d);
      if (cap) text(ctx, cap, W / 2, 1146, { font: F.shrik, size: 40, color: '#f4efe6', maxW: 600 });
    },
  };
})();

const ticket: Template = (() => {
  const W = 900, H = 1400, red = '#c8322b', teal = '#1f4e4a', paper = '#f2e3c4';
  return {
    id: 'ticket', name: 'Admit One', desc: 'Tiket bioskop jadul + sobekan', group: 'retro', W, H, photos: 4, shape: 'rect', filter: 'film',
    theme: { bg: paper, ink: red, accent: teal },
    slots: [[100, 260], [460, 260], [100, 680], [460, 680]].map(([x, y], i) => ({ x, y, w: 340, h: 400, photo: i, stroke: { w: 3, color: '#2a1d12' } })),
    bg: ({ ctx }) => {
      ctx.fillStyle = teal; ctx.fillRect(0, 0, W, H); speckle(ctx, W, H, '#cfe3dc', 1500, 9);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
      shapePath(ctx, 'ticket', 60, 60, 780, 1280); ctx.fillStyle = paper; ctx.fill(); ctx.restore();
      speckle(ctx, W, H, '#a88d5f', 1200, 4);
      ctx.fillStyle = teal; for (const x of [60, 840]) { ctx.beginPath(); ctx.arc(x, 1120, 26, 0, Math.PI * 2); ctx.fill(); }
      ctx.save(); ctx.setLineDash([12, 10]); ctx.lineWidth = 3; ctx.strokeStyle = '#b29a70';
      ctx.beginPath(); ctx.moveTo(100, 1120); ctx.lineTo(800, 1120); ctx.stroke(); ctx.restore();
      ctx.lineWidth = 3; ctx.strokeStyle = red; ctx.beginPath(); roundRect(ctx, 86, 96, 728, 1004, 18); ctx.stroke();
    },
    decor: ({ ctx, d }) => {
      text(ctx, 'ADMIT ONE', W / 2, 168, { font: F.bungee, size: 70, color: red, track: 0.04 });
      ctx.fillStyle = red; for (const x of [140, 760]) { starPath(ctx, x, 168, 20, 8, 5); ctx.fill(); }
      text(ctx, 'JEPRET THEATRE · 4 SHOTS · NO REFUND', W / 2, 226, { font: F.elite, size: 20, color: '#5a4630', track: 0.12 });
      const cap = caption(d);
      if (cap) text(ctx, cap, W / 2, 1192, { font: F.abril, size: 56, color: '#2a1d12', maxW: 640 });
      if (d.showDate) text(ctx, today(), W / 2, 1248, { font: F.elite, size: 22, color: '#5a4630', track: 0.2 });
      text(ctx, `No. ${String(Math.abs(cap.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 1000000).padStart(6, '0')}`, W / 2, 1294, { font: F.bungee, size: 24, color: red, track: 0.1 });
    },
  };
})();

const zine: Template = (() => {
  const W = 1000, H = 1400, yellow = '#f4c12a', cobalt = '#2c4bd6';
  const mat: Mat = { l: 18, t: 18, r: 18, b: 18, color: '#fbf7ee', shadow: true };
  const slots: Slot[] = [
    { x: 80, y: 110, w: 520, h: 390, rot: -5, photo: 0, mat },
    { x: 400, y: 530, w: 500, h: 375, rot: 4, photo: 1, mat },
    { x: 110, y: 950, w: 470, h: 350, rot: -2, photo: 2, mat },
  ];
  return {
    id: 'zine', name: 'Zine', desc: 'Kolase + lettering kuning tebal', group: 'retro', W, H, photos: 3, slots, shape: 'rect', filter: 'warm',
    theme: { bg: '#efe3c8', ink: '#241a12', accent: yellow },
    bg: ({ ctx }) => {
      ctx.fillStyle = '#efe3c8'; ctx.fillRect(0, 0, W, H); speckle(ctx, W, H, '#7a6a4a', 2600, 3);
      ctx.fillStyle = 'rgba(44,75,214,.22)';
      for (let y = 0; y < 420; y += 22) for (let x = W - 420; x < W; x += 22) {
        const k = Math.max(0, 1 - Math.hypot(W - x, y) / 430); if (k <= 0) continue;
        ctx.beginPath(); ctx.arc(x, y, 9 * k, 0, Math.PI * 2); ctx.fill();
      }
    },
    decor: ({ ctx, d }) => {
      for (const s of slots) withSlot(ctx, s, () => { ctx.rotate(0.06); ctx.fillStyle = 'rgba(236,220,170,.8)'; ctx.fillRect(-62, -s.h / 2 - 36, 124, 36); });
      const words = (caption(d) || 'jepret').split(/\s+/);
      const lines = words.length > 3 ? [words.slice(0, Math.ceil(words.length / 3)).join(' '), ...[1, 2].map(k => words.slice(Math.ceil(words.length / 3) * k, Math.ceil(words.length / 3) * (k + 1)).join(' '))].filter(Boolean) : words;
      let y = 200;
      for (const ln of lines) {
        const px = text(ctx, ln, 940, y, { font: F.brico, size: 140, color: yellow, align: 'right', maxW: 520, track: -0.03, shadow: { color: '#241a12', dx: 6, dy: 6 } });
        y += px * 0.86;
      }
      [[520, 120, 22], [960, 300, 16], [590, y - 40, 26], [900, y + 10, 14], [470, 610, 18], [930, 960, 24]].forEach(([x, yy, r]) => sparkle(ctx, x, yy, r, cobalt));
      if (d.showDate) text(ctx, today(), 900, 1330, { font: F.shrik, size: 30, color: cobalt, align: 'right' });
    },
  };
})();

const birthday: Template = (() => {
  const W = 800, H = 1600, ink = '#1d1306';
  const mat: Mat = { l: 12, t: 12, r: 12, b: 12, color: '#ffffff', shape: 'scallop', shadow: true };
  const rots = [-2, 2, -1.5, 1.5];
  const slots: Slot[] = rots.map((rot, k) => ({ x: 140, y: 180 + k * 324, w: 520, h: 300, rot, photo: k, mat }));
  return {
    id: 'birthday', name: 'Birthday Bash', desc: 'Foto awan + lettering pelangi', group: 'retro', W, H, photos: 4, slots, shape: 'scallop', filter: 'pop',
    theme: { bg: '#ffd23f', ink, accent: '#2f5bd3' },
    bg: ({ ctx }) => {
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 0, W, H);
      const rnd = mulberry(77); ctx.lineCap = 'round';
      for (let i = 0; i < 46; i++) {
        const x = rnd() * W, y = rnd() * H, len = 60 + rnd() * 160, a = rnd() * Math.PI;
        ctx.strokeStyle = i % 4 === 0 ? 'rgba(255,255,255,.85)' : 'rgba(47,91,211,.85)'; ctx.lineWidth = i % 4 === 0 ? 8 + rnd() * 10 : 18 + rnd() * 26;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + 30, y + Math.sin(a) * len * 0.5 - 30, x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
      }
      ctx.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 2 + rnd() * 4, 0, Math.PI * 2); ctx.fill(); }
    },
    decor: ({ ctx, d }) => {
      const title = 'HAPPY BIRTHDAY', colors = ['#e2452b', '#2c4bd6', '#2a9d8f', '#f28cb1', '#7b4fd6'];
      let px = 78; ctx.font = F.bagel(px);
      while (ctx.measureText(title).width > W - 60) { px -= 2; ctx.font = F.bagel(px); }
      let x = (W - ctx.measureText(title).width) / 2; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      [...title].forEach((ch, i) => {
        const y = 96 + Math.sin(i * 0.9) * 6;
        ctx.fillStyle = ink; ctx.fillText(ch, x + 5, y + 6);
        ctx.lineWidth = 9; ctx.strokeStyle = ink; ctx.strokeText(ch, x, y);
        ctx.fillStyle = colors[i % colors.length]; ctx.fillText(ch, x, y);
        x += ctx.measureText(ch).width;
      });
      ctx.font = `76px ${EMOJI_FONT}`; ctx.textAlign = 'center';
      [['⭐', 640, 200], ['🎁', 690, 560], ['🎈', 105, 880], ['🎂', 120, 1400]].forEach(([e, ex, ey]) => ctx.fillText(e as string, ex as number, ey as number));
      const cap = caption(d);
      if (cap) text(ctx, cap, W / 2, 1512, { font: F.bagel, size: 36, color: ink, maxW: 640 });
      if (d.showDate) text(ctx, today(), W / 2, 1556, { font: F.mono, size: 20, color: ink, track: 0.2 });
    },
  };
})();

const redroom: Template = (() => {
  const W = 1000, H = 1400, paper = '#f7f3ea';
  const strips = [{ cx: 320, cy: 690, a: -4 }, { cx: 680, cy: 705, a: 3 }];
  const slots: Slot[] = strips.flatMap(({ cx, cy, a }) => [0, 1, 2, 3].map(k => {
    const ly = -590 + 20 + 132.5 + k * 277, r = (a * Math.PI) / 180;
    const gx = cx - ly * Math.sin(r), gy = cy + ly * Math.cos(r);
    return { x: gx - 130, y: gy - 132.5, w: 260, h: 265, rot: a, photo: k };
  }));
  return {
    id: 'redroom', name: 'Red Room', desc: 'Strip kembar B&W di latar merah', group: 'retro', W, H, photos: 4, slots, shape: 'rect', filter: 'mono',
    theme: { bg: '#7e1418', ink: paper, accent: paper },
    bg: ({ ctx }) => {
      ctx.fillStyle = '#7e1418'; ctx.fillRect(0, 0, W, H); speckle(ctx, W, H, '#2a0406', 2500, 5); vignette(ctx, W, H, 0.45);
      for (const { cx, cy, a } of strips) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate((a * Math.PI) / 180);
        ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 12;
        ctx.fillStyle = paper; ctx.fillRect(-150, -590, 300, 1180); ctx.restore();
      }
    },
    decor: ({ ctx, d }) => {
      strips.forEach(({ cx, cy, a }, i) => {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate((a * Math.PI) / 180);
        const label = i === 1 && d.showDate ? today() : caption(d) || 'jepret.';
        text(ctx, label, 0, 558, { font: F.elite, size: 22, color: '#2b2b2b', maxW: 260, track: 0.1 });
        ctx.restore();
      });
    },
  };
})();

const pasfoto: Template = (() => {
  const W = 900, H = 1200, order = [0, 1, 2, 3, 0, 1, 2, 3, 0];
  const slots: Slot[] = order.map((photo, i) => ({ x: 60 + (i % 3) * 266, y: 210 + Math.floor(i / 3) * 304, w: 252, h: 290, photo }));
  const colors = ['#e63946', '#f2b51d', '#2c4bd6', '#2a9d8f', '#ef6fa6'];
  return {
    id: 'pasfoto', name: 'Pas Foto Studio', desc: 'Lembar 3×3 gaya studio foto', group: 'retro', W, H, photos: 4, slots, shape: 'rect', filter: 'natural',
    theme: { bg: '#fbfbf7', ink: '#1d1d1d', accent: '#e63946' },
    bg: ({ ctx }) => { ctx.fillStyle = '#fbfbf7'; ctx.fillRect(0, 0, W, H); speckle(ctx, W, H, '#9a9a9a', 900, 8); },
    decor: ({ ctx, d }) => {
      [[96, 78, 22], [150, 118, 16], [200, 72, 13], [118, 152, 12], [176, 162, 10], [232, 120, 9]].forEach(([x, y, r], i) => { ctx.fillStyle = colors[i % colors.length]; starPath(ctx, x, y, r, r * 0.45, 5); ctx.fill(); });
      text(ctx, caption(d) || 'Jepret Finest', W - 60, 128, { font: F.vibes, size: 100, color: '#1d1d1d', align: 'right', maxW: 560 });
      colors.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(76 + i * 30, 1158, 11, 0, Math.PI * 2); ctx.fill(); });
      if (d.showDate) text(ctx, today(), W - 60, 1158, { font: F.elite, size: 22, color: '#444', align: 'right', track: 0.15 });
    },
  };
})();

const vintage: Template = (() => {
  const W = 900, H = 1200;
  return {
    id: 'vintage', name: 'Vintage Box', desc: 'Empat potret sepia, kertas tua', group: 'retro', W, H, photos: 4, shape: 'rect', filter: 'sepia',
    theme: { bg: '#f1ece2', ink: '#3b3127', accent: '#8a6a3a' },
    slots: [0, 1, 2, 3].map(i => ({ x: 50 + (i % 2) * 408, y: 50 + Math.floor(i / 2) * 536, w: 392, h: 520, photo: i })),
    bg: ({ ctx }) => { ctx.fillStyle = '#f1ece2'; ctx.fillRect(0, 0, W, H); speckle(ctx, W, H, '#8a7a62', 2500, 6); vignette(ctx, W, H, 0.12); },
    decor: ({ ctx, d }) => {
      text(ctx, caption(d) || 'jepret. vintagebox', 850, 1152, { font: F.elite, size: 26, color: '#3b3127', align: 'right', maxW: 500 });
      if (d.showDate) { ctx.globalAlpha = 0.7; text(ctx, today(), 50, 1152, { font: F.elite, size: 20, color: '#3b3127', align: 'left' }); ctx.globalAlpha = 1; }
    },
  };
})();

const koran: Template = (() => {
  const W = 1000, H = 1400, ink = '#161616';
  const slots: Slot[] = [{ x: 50, y: 310, w: 900, h: 560, photo: 0 }, ...[0, 1, 2].map(i => ({ x: 50 + i * 307, y: 915, w: 286, h: 214, photo: i + 1 }))];
  return {
    id: 'koran', name: 'The Jepret Times', desc: 'Halaman depan koran, foto headline', group: 'retro', W, H, photos: 4, slots, shape: 'rect', filter: 'mono',
    theme: { bg: '#efeadf', ink, accent: ink },
    bg: ({ ctx }) => {
      ctx.fillStyle = '#efeadf'; ctx.fillRect(0, 0, W, H); speckle(ctx, W, H, '#6b6b6b', 2000, 11);
      ctx.fillStyle = 'rgba(22,22,22,.55)'; const rnd = mulberry(5);
      for (let c = 0; c < 3; c++) for (let y = 1162; y < 1370; y += 16) {
        const para = (y - 1162) % 96 === 80, w = para ? 286 * (0.3 + rnd() * 0.4) : 286 * (0.86 + rnd() * 0.14);
        ctx.fillRect(50 + c * 307, y, w, 6);
      }
    },
    decor: ({ ctx, d }) => {
      text(ctx, 'The Jepret Times', W / 2, 92, { font: F.frak, size: 96, color: ink, maxW: 900 });
      ctx.fillStyle = ink; ctx.fillRect(50, 150, 900, 3); ctx.fillRect(50, 190, 900, 1.5);
      text(ctx, 'EDISI SPESIAL', 50, 171, { font: F.elite, size: 19, color: ink, align: 'left' });
      text(ctx, today(), W / 2, 171, { font: F.elite, size: 19, color: ink });
      text(ctx, 'Rp 2.000', 950, 171, { font: F.elite, size: 19, color: ink, align: 'right' });
      text(ctx, caption(d) || 'Breaking news', W / 2, 252, { font: F.abril, size: 76, color: ink, maxW: 900, upper: true });
      text(ctx, `Foto: jepret booth — ${today()}`, 50, 892, { font: F.fraunces, size: 18, color: '#3a3a3a', align: 'left' });
    },
  };
})();

const prangko: Template = (() => {
  const W = 1000, H = 1300;
  const mat: Mat = { l: 24, t: 24, r: 24, b: 90, color: '#fbf8f0', shape: 'stamp', shadow: true };
  const pos: [number, number, number][] = [[70, 80, -3], [530, 70, 2], [80, 650, 1.5], [540, 660, -2]];
  const slots: Slot[] = pos.map(([x, y, rot], i) => ({ x: x + 24, y: y + 24, w: 342, h: 406, rot, photo: i, mat }));
  return {
    id: 'prangko', name: 'Prangko', desc: 'Empat prangko + cap pos', group: 'retro', W, H, photos: 4, slots, shape: 'rect', filter: 'film',
    theme: { bg: '#c9a77c', ink: '#2a1d12', accent: '#7a2e1f' },
    bg: ({ ctx }) => { ctx.fillStyle = '#c9a77c'; ctx.fillRect(0, 0, W, H); speckle(ctx, W, H, '#5a3e20', (W * H) / 90, 2); speckle(ctx, W, H, '#f1dfc0', 3000, 12); },
    decor: ({ ctx, d }) => {
      slots.forEach((s, i) => withSlot(ctx, s, () => {
        text(ctx, 'POS JEPRET', -s.w / 2, s.h / 2 + 50, { font: F.elite, size: 22, color: '#7a2e1f', align: 'left' });
        text(ctx, `Rp${[2000, 1500, 5000, 1000][i].toLocaleString('id-ID')}`, s.w / 2, s.h / 2 + 50, { font: F.bungee, size: 26, color: '#2c4bd6', align: 'right' });
      }));
      ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = '#2b2f5e'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(520, 610, 84, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(520, 610, 66, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 4; k++) { ctx.beginPath(); for (let x = 610; x < 900; x += 4) ctx.lineTo(x, 572 + k * 26 + Math.sin(x / 18) * 6); ctx.stroke(); }
      text(ctx, 'JEPRET', 520, 588, { font: F.elite, size: 20, color: '#2b2f5e', track: 0.2 });
      text(ctx, today(), 520, 622, { font: F.elite, size: 15, color: '#2b2f5e' });
      ctx.restore();
      const cap = caption(d);
      if (cap) text(ctx, cap, W / 2, 1258, { font: F.elite, size: 38, color: '#2a1d12', maxW: 860, track: 0.08 });
    },
  };
})();

const film35: Template = (() => {
  const W = 700, H = 1600, orange = '#f08a24';
  const slots: Slot[] = [0, 1, 2, 3].map(k => ({ x: 100, y: 70 + k * 376, w: 500, h: 340, photo: k }));
  return {
    id: 'film35', name: 'Film 35mm', desc: 'Roll film + nomor frame oranye', group: 'retro', W, H, photos: 4, slots, shape: 'rect', filter: 'film',
    theme: { bg: '#1c1511', ink: orange, accent: orange },
    bg: ({ ctx }) => {
      ctx.fillStyle = '#1c1511'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#efe4cf';
      for (let y = 22; y < H - 20; y += 44) { ctx.beginPath(); roundRect(ctx, 22, y, 28, 20, 5); roundRect(ctx, W - 50, y, 28, 20, 5); ctx.fill(); }
    },
    decor: ({ ctx, d }) => {
      slots.forEach((s, k) => {
        ctx.save(); ctx.translate(76, s.y + s.h / 2); ctx.rotate(-Math.PI / 2);
        text(ctx, `▶ ${12 + k}   JEPRET 400   ▶ ${12 + k}A`, 0, 0, { font: F.mono, size: 15, color: orange, track: 0.2 });
        ctx.restore();
        ctx.save(); ctx.translate(W - 76, s.y + s.h / 2); ctx.rotate(Math.PI / 2);
        text(ctx, 'SAFETY FILM 135', 0, 0, { font: F.mono, size: 13, color: orange, track: 0.3 });
        ctx.restore();
      });
      const cap = caption(d);
      if (cap) text(ctx, cap, W / 2, 1572, { font: F.mono, size: 22, color: orange, maxW: 480, track: 0.2, upper: true });
    },
  };
})();

const neonstar: Template = (() => {
  const W = 1200, H = 800, green = '#2bd42b', dark = '#0b7a12';
  return {
    id: 'neonstar', name: 'Neon Star', desc: 'Satu foto, frame hijau berbintang', group: 'retro', W, H, photos: 1, shape: 'rect', filter: 'natural',
    theme: { bg: green, ink: '#0b3d0f', accent: dark },
    slots: [{ x: 150, y: 40, w: 900, h: 660, photo: 0 }],
    bg: ({ ctx }) => {
      ctx.fillStyle = green; ctx.fillRect(0, 0, W, H);
      const rnd = mulberry(21);
      for (const [x0, x1] of [[0, 150], [1050, 1200]]) for (let i = 0; i < 11; i++) {
        const cx = x0 + 20 + rnd() * (x1 - x0 - 40), cy = 30 + rnd() * (H - 60), r = 14 + rnd() * 24;
        ctx.fillStyle = i % 3 ? dark : '#073d09'; starPath(ctx, cx, cy, r, r * (i % 2 ? 0.45 : 0.25), i % 2 ? 8 : 4, rnd()); ctx.fill();
      }
    },
    decor: ({ ctx, d }) => {
      const cap = caption(d);
      if (cap) text(ctx, cap, 1050, 752, { font: F.bungee, size: 28, color: '#0b3d0f', align: 'right', maxW: 600 });
      if (d.showDate) text(ctx, today(), 150, 752, { font: F.mono, size: 18, color: '#0b3d0f', align: 'left', track: 0.2 });
    },
  };
})();

export const TEMPLATES: Template[] = [
  kartu, memory, ticket, zine, birthday, redroom, pasfoto, vintage, koran, prangko, film35, neonstar,
  classic('strip4'), classic('strip3'), classic('strip2'), classic('grid4'), classic('polaroid'),
];
const BY_ID = new Map(TEMPLATES.map(t => [t.id, t]));
export const DEFAULT_TEMPLATE = 'film35';
export const getTemplate = (id: string) => BY_ID.get(id) ?? BY_ID.get(DEFAULT_TEMPLATE)!;
export const photoCountOf = (id: string) => getTemplate(id).photos;
export const frameFor = (d: Design) => frameOf(d.frame, d.customBg);
