/**
 * ruparupa Team pack: frames for "kawan rupa" (employees) — ID card, anniversary "One Frame",
 * Ramadan "Berkah", and an office-event frame.
 * These use the caption (name / event line), so the Teks tab stays available.
 */
import type { Group, Mat, Slot, Template } from '../lib/templates';
import { sparkle, text, today, withSlot } from '../lib/paint';
import { roundRect, starPath } from '../lib/shapes';
import { mulberry } from '../lib/util';
import { nunito } from './_kit';
import { BL, BL_D, GOLD, INK, L_MARK, L_MARK_WHITE, L_NEW_WHITE, OR, OR_L, drawLogo } from './_rr';

// access code hash — regenerate with `npm run hash-code -- <CODE>`
export const group: Group = { id: 'ruparupa-team', name: 'ruparupa Team', desc: 'buat kawan rupa: ID card, anniv, event', lock: { codes: [{ h: 'b46368ab3ce7963d3f0fc36397b760e7d4bc6aec64e6301f19cf69b8093aba19' }] } };

const n9 = nunito(900), n8 = nunito(800);
const mono = (px: number) => `500 ${px}px "DM Mono", monospace`;
const vibes = (px: number) => `400 ${px}px "Great Vibes", cursive`;
const hand = (px: number) => `700 ${px}px Caveat, cursive`;
/** the app's default caption means "nothing typed yet" */
const cap = (c: string, fallback: string) => (!c.trim() || c.trim() === 'jepret booth' ? fallback : c.trim());

/* 1 — employee ID card on a lanyard */
const idcard: Template = (() => {
  const W = 760, H = 1180;
  const slots: Slot[] = [{ x: 210, y: 360, w: 340, h: 420, photo: 0, shape: 'rounded', stroke: { w: 6, color: '#fff' } }];
  return {
    id: 'rr-idcard', name: 'ID Card Kawan Rupa', desc: 'Kartu karyawan + lanyard', group: 'ruparupa-team', W, H, photos: 1, slots, shape: 'rounded', filter: 'natural',
    usesCaption: true,
    theme: { bg: OR, ink: '#fff', accent: '#fff' },
    bg: ({ ctx }) => {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#e9eef3'); g.addColorStop(1, '#d6dde5');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // lanyard straps
      ctx.fillStyle = OR;
      ctx.beginPath(); ctx.moveTo(250, 0); ctx.lineTo(320, 0); ctx.lineTo(372, 200); ctx.lineTo(340, 200); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(510, 0); ctx.lineTo(440, 0); ctx.lineTo(388, 200); ctx.lineTo(420, 200); ctx.closePath(); ctx.fill();
      // clip
      ctx.fillStyle = '#9aa5b1'; ctx.beginPath(); roundRect(ctx, 340, 184, 80, 40, 10); ctx.fill();
      ctx.fillStyle = '#c9d1d9'; ctx.beginPath(); roundRect(ctx, 356, 214, 48, 30, 8); ctx.fill();
      // card
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
      ctx.beginPath(); roundRect(ctx, 90, 230, 580, 900, 34); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
      ctx.save(); ctx.beginPath(); roundRect(ctx, 90, 230, 580, 900, 34); ctx.clip();
      const hg = ctx.createLinearGradient(90, 230, 670, 330); hg.addColorStop(0, OR_L); hg.addColorStop(1, OR);
      ctx.fillStyle = hg; ctx.fillRect(90, 230, 580, 300);
      ctx.fillStyle = BL; ctx.fillRect(90, 1060, 580, 70);
      ctx.restore();
      ctx.fillStyle = '#d6dde5'; ctx.beginPath(); roundRect(ctx, 340, 252, 80, 16, 8); ctx.fill(); // punch hole
    },
    decor: ({ ctx, d }) => {
      drawLogo(ctx, L_NEW_WHITE, 380, 278, 150);
      text(ctx, cap(d.caption, 'Nama Kamu'), 380, 850, { font: n9, size: 52, color: INK, maxW: 520 });
      text(ctx, 'KAWAN RUPA', 380, 904, { font: n8, size: 26, color: OR, track: 0.2 });
      ctx.strokeStyle = '#e3e8ee'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(150, 950); ctx.lineTo(610, 950); ctx.stroke();
      text(ctx, 'ID', 150, 990, { font: mono, size: 18, color: '#7b8794', align: 'left' });
      text(ctx, `RR-${String(Math.abs([...cap(d.caption, 'x')].reduce((a, c) => a * 33 + c.charCodeAt(0), 5)) % 100000).padStart(5, '0')}`, 150, 1020, { font: mono, size: 24, color: INK, align: 'left' });
      text(ctx, 'SEJAK', 610, 990, { font: mono, size: 18, color: '#7b8794', align: 'right' });
      text(ctx, d.showDate ? today() : '2016', 610, 1020, { font: mono, size: 24, color: INK, align: 'right' });
      text(ctx, 'rumahnya rumah', 380, 1096, { font: n9, size: 28, color: '#fff' });
    },
  };
})();

/* 2 — anniversary "One Frame": blue grid paper, orange-framed polaroids, clips and pins */
const oneframe: Template = (() => {
  const W = 1000, H = 1300;
  const mat: Mat = { l: 14, t: 74, r: 14, b: 14, color: OR, shadow: true };
  const slots: Slot[] = [
    { x: 90, y: 360, w: 400, h: 300, rot: -5, photo: 0, mat },
    { x: 530, y: 420, w: 400, h: 300, rot: 4, photo: 1, mat },
    { x: 300, y: 850, w: 400, h: 300, rot: -1.5, photo: 2, mat },
  ];
  return {
    id: 'rr-oneframe', name: 'Kawan Rupa: One Frame', desc: 'Kertas grid + polaroid oranye (anniv)', group: 'ruparupa-team', W, H, photos: 3, slots, shape: 'rect', filter: 'pop',
    usesCaption: true,
    theme: { bg: '#f4f8ff', ink: OR, accent: BL },
    bg: ({ ctx }) => {
      ctx.fillStyle = '#f4f8ff'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(0,142,221,.18)'; ctx.lineWidth = 2;
      for (let x = 0; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 36) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
    },
    decor: ({ ctx, d }) => {
      // headline
      ctx.save(); ctx.translate(70, 120); ctx.rotate(-0.04);
      text(ctx, 'KAWAN RUPA,', 0, 0, { font: n9, size: 86, color: OR, align: 'left', shadow: { color: BL_D, dx: 5, dy: 5 } });
      text(ctx, 'ONE FRAME', 0, 92, { font: n9, size: 86, color: OR, align: 'left', shadow: { color: BL_D, dx: 5, dy: 5 } });
      ctx.restore();
      // logo on each orange top border + a clip / pin per print
      slots.forEach((s, i) => withSlot(ctx, s, () => {
        drawLogo(ctx, L_MARK_WHITE, 0, -s.h / 2 - 58, 190);
        if (i % 2 === 0) {
          ctx.strokeStyle = '#8a96a3'; ctx.lineWidth = 7; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(s.w / 2 - 50, -s.h / 2 - 100); ctx.lineTo(s.w / 2 - 50, -s.h / 2 - 20); ctx.arc(s.w / 2 - 34, -s.h / 2 - 20, 16, Math.PI, 0, true); ctx.lineTo(s.w / 2 - 18, -s.h / 2 - 90); ctx.stroke();
        } else {
          ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(0, -s.h / 2 - 84, 16, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(-5, -s.h / 2 - 89, 5, 0, Math.PI * 2); ctx.fill();
        }
      }));
      [[890, 160, 30], [940, 260, 18], [130, 1180, 26], [870, 1180, 22], [520, 760, 16]].forEach(([x, y, r]) => sparkle(ctx, x, y, r, GOLD));
      text(ctx, cap(d.caption, 'cerita kita, satu frame'), W / 2, 1238, { font: hand, size: 54, color: BL_D, maxW: 860 });
      if (d.showDate) text(ctx, today(), W - 60, 64, { font: mono, size: 20, color: BL_D, align: 'right', track: 0.2 });
    },
  };
})();

/* 3 — Ramadan "Kebersamaan Penuh Berkah": deep green, gold lanterns and stars */
const berkah: Template = (() => {
  const W = 900, H = 1400, gold = '#e6c36a';
  const slots: Slot[] = [
    { x: 70, y: 470, w: 760, h: 430, photo: 0, shape: 'rounded', stroke: { w: 5, color: gold } },
    { x: 70, y: 930, w: 370, h: 280, photo: 1, shape: 'rounded', stroke: { w: 5, color: gold } },
    { x: 460, y: 930, w: 370, h: 280, photo: 2, shape: 'rounded', stroke: { w: 5, color: gold } },
  ];
  const lantern = (ctx: CanvasRenderingContext2D, x: number, len: number, s: number) => {
    ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, len); ctx.stroke();
    ctx.save(); ctx.translate(x, len);
    ctx.fillStyle = gold; ctx.beginPath(); ctx.moveTo(-s * 0.3, 0); ctx.lineTo(s * 0.3, 0); ctx.lineTo(s * 0.5, s * 0.25); ctx.lineTo(-s * 0.5, s * 0.25); ctx.closePath(); ctx.fill();
    const glow = ctx.createRadialGradient(0, s * 0.7, 2, 0, s * 0.7, s * 0.6); glow.addColorStop(0, '#fff3c4'); glow.addColorStop(1, '#d9a93f');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.moveTo(-s * 0.45, s * 0.25); ctx.lineTo(s * 0.45, s * 0.25); ctx.lineTo(s * 0.35, s * 1.15); ctx.lineTo(-s * 0.35, s * 1.15); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a77d24'; ctx.lineWidth = 2; for (const lx of [-0.15, 0.15]) { ctx.beginPath(); ctx.moveTo(lx * s, s * 0.25); ctx.lineTo(lx * s * 0.8, s * 1.15); ctx.stroke(); }
    ctx.fillStyle = gold; ctx.beginPath(); ctx.moveTo(-s * 0.35, s * 1.15); ctx.lineTo(s * 0.35, s * 1.15); ctx.lineTo(0, s * 1.4); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  return {
    id: 'rr-berkah', name: 'Kebersamaan Berkah', desc: 'Hijau-emas Ramadan + lampion', group: 'ruparupa-team', W, H, photos: 3, slots, shape: 'rounded', filter: 'warm',
    usesCaption: true,
    theme: { bg: '#24402c', ink: gold, accent: gold },
    bg: ({ ctx }) => {
      const g = ctx.createRadialGradient(W / 2, 300, 50, W / 2, 600, 900); g.addColorStop(0, '#3d5e44'); g.addColorStop(1, '#1c3123');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const rnd = mulberry(12); ctx.fillStyle = 'rgba(230,195,106,.55)';
      for (let i = 0; i < 40; i++) { starPath(ctx, rnd() * W, rnd() * H, 2 + rnd() * 4, 1, 4); ctx.fill(); }
      lantern(ctx, 70, 120, 70); lantern(ctx, 160, 60, 50); lantern(ctx, W - 70, 140, 70); lantern(ctx, W - 160, 70, 50);
    },
    decor: ({ ctx, d }) => {
      drawLogo(ctx, L_MARK_WHITE, W / 2, 70, 270);
      text(ctx, 'Kebersamaan Penuh', W / 2, 220, { font: n8, size: 44, color: '#fff' });
      text(ctx, 'Berkah', W / 2, 330, { font: vibes, size: 150, color: gold, shadow: { color: 'rgba(0,0,0,.35)', dx: 3, dy: 4 } });
      [[180, 300, 16], [720, 300, 20], [W / 2, 420, 12]].forEach(([x, y, r]) => { ctx.fillStyle = gold; starPath(ctx, x, y, r, r * 0.45, 5); ctx.fill(); });
      text(ctx, cap(d.caption, 'berbagi rasa, menguatkan kebersamaan'), W / 2, 1282, { font: n8, size: 30, color: '#fff', maxW: 780 });
      if (d.showDate) text(ctx, today(), W / 2, 1330, { font: mono, size: 18, color: gold, track: 0.25 });
    },
  };
})();

/* 4 — office event: confetti, balloons, 3D lettering */
const seru: Template = (() => {
  const W = 1000, H = 1320;
  const mat: Mat = { l: 12, t: 12, r: 12, b: 12, color: '#fff', shape: 'rounded', shadow: true };
  const rots = [-2.5, 2, 1.5, -2];
  const slots: Slot[] = rots.map((rot, i) => ({ x: 70 + (i % 2) * 450, y: 360 + Math.floor(i / 2) * 370, w: 410, h: 320, rot, photo: i, shape: 'rounded', mat }));
  const balloon = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) => {
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + r * 1.2); ctx.quadraticCurveTo(x + 20, y + r * 2, x - 6, y + r * 2.8); ctx.stroke();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.2); g.addColorStop(0, '#fff'); g.addColorStop(0.25, c); g.addColorStop(1, c);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 8, y + r * 1.2); ctx.lineTo(x + 8, y + r * 1.2); ctx.lineTo(x, y + r * 1.08); ctx.fill();
  };
  return {
    id: 'rr-seru', name: 'Keseruan Kawan Rupa', desc: 'Event kantor: konfeti + balon', group: 'ruparupa-team', W, H, photos: 4, slots, shape: 'rounded', filter: 'pop',
    usesCaption: true,
    theme: { bg: '#fff6ee', ink: OR, accent: BL },
    bg: ({ ctx }) => {
      ctx.fillStyle = '#fff6ee'; ctx.fillRect(0, 0, W, H);
      const rnd = mulberry(404), cols = [OR, BL, GOLD, '#ff9ec4'];
      for (let i = 0; i < 120; i++) {
        ctx.save(); ctx.translate(rnd() * W, rnd() * H); ctx.rotate(rnd() * Math.PI); ctx.fillStyle = cols[i % cols.length]; ctx.globalAlpha = 0.75;
        if (i % 3) ctx.fillRect(-7, -3, 14, 6); else { ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      balloon(ctx, 70, 120, 52, OR); balloon(ctx, 150, 80, 44, BL); balloon(ctx, W - 80, 110, 54, BL); balloon(ctx, W - 160, 70, 42, OR);
    },
    decor: ({ ctx, d }) => {
      ctx.save(); ctx.translate(W / 2, 170); ctx.rotate(-0.035);
      for (const [t, y, size, fill] of [['Keseruan', -40, 92, '#fff'], ['Kawan Rupa', 62, 100, OR]] as const) {
        for (let k = 10; k > 0; k -= 2) text(ctx, t, k, y + k, { font: n9, size, color: BL_D });
        text(ctx, t, 0, y, { font: n9, size, color: fill, stroke: { color: OR, width: fill === '#fff' ? 10 : 0.01 } });
      }
      ctx.restore();
      drawLogo(ctx, L_MARK, 70, 1188, 230, 'left');
      text(ctx, cap(d.caption, '#KawanRupa'), W - 70, 1214, { font: n9, size: 40, color: BL_D, align: 'right', maxW: 560 });
      if (d.showDate) text(ctx, today(), W - 70, 1262, { font: mono, size: 18, color: '#7b8794', align: 'right', track: 0.2 });
    },
  };
})();

export const templates: Template[] = [idcard, oneframe, berkah, seru];
