/**
 * ruparupa brand pack.
 * Orange #ff5715 + blue #008edd from the official logo; "rumahnya rumah"; rewards blue with gold coins.
 */
import type { Group, Mat, Slot, Template } from '../lib/templates';
import { speckle, text, today } from '../lib/paint';
import { roundRect } from '../lib/shapes';
import { mulberry } from '../lib/util';
import { nunito } from './_kit';
import { BL, BL_D, BL_L, CREAM, GOLD, INK, L_MARK_WHITE, L_MARK_WHITE_BLUE, L_NEW_WHITE, OR, OR_L, drawLogo } from './_rr';

// access code hash — regenerate with `npm run hash-code -- <CODE>`
export const group: Group = { id: 'ruparupa', name: 'ruparupa', desc: 'oranye-biru + logo baru', lock: { codes: [{ h: '58a2035a2932b235efb267b727bc375b523d19effbf021bb9689c9b93886bd4c' }] } };

const n9 = nunito(900), n8 = nunito(800), n6 = nunito(600), mono = (px: number) => `500 ${px}px "DM Mono", monospace`;

function house(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.45); ctx.lineTo(x + s / 2, y); ctx.lineTo(x + s, y + s * 0.45);
  ctx.lineTo(x + s * 0.86, y + s * 0.45); ctx.lineTo(x + s * 0.86, y + s); ctx.lineTo(x + s * 0.14, y + s); ctx.lineTo(x + s * 0.14, y + s * 0.45); ctx.closePath();
}
function coin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.fillStyle = '#e09a00'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.12, r, r, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, '#fff1a6'); g.addColorStop(1, GOLD);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(180,110,0,.55)'; ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(160,95,0,.8)'; ctx.font = `900 ${r}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('r', x, y + r * 0.05);
  ctx.restore();
}

/* 1 — orange strip with the new logo */
const strip: Template = (() => {
  const W = 640, H = 1900, mat: Mat = { l: 10, t: 10, r: 10, b: 10, color: '#fff', shape: 'rounded', shadow: true };
  const slots: Slot[] = [0, 1, 2, 3].map(k => ({ x: 50, y: 250 + k * 392, w: 540, h: 370, photo: k, shape: 'rounded', mat }));
  return {
    id: 'rr-strip', name: 'ruparupa Strip', desc: 'Strip oranye, logo baru', group: 'ruparupa', W, H, photos: 4, slots, shape: 'rounded', filter: 'pop',
    theme: { bg: OR, ink: '#fff', accent: '#fff' },
    bg: ({ ctx }) => {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, OR_L); g.addColorStop(1, OR);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
      const rnd = mulberry(8);
      for (let i = 0; i < 26; i++) { house(ctx, rnd() * W - 20, rnd() * H, 34 + rnd() * 40); ctx.stroke(); }
    },
    decor: ({ ctx, d }) => {
      drawLogo(ctx, L_NEW_WHITE, W / 2, 44, 330);
      text(ctx, '#rumahnyarumah', W / 2, 1838, { font: n9, size: 38, color: '#fff' });
      if (d.showDate) { ctx.globalAlpha = 0.85; text(ctx, today(), W / 2, 1876, { font: mono, size: 18, color: '#fff', track: 0.25 }); ctx.globalAlpha = 1; }
    },
  };
})();

/* 2 — rewards: blue gradient, gold coins, member card */
const rewards: Template = (() => {
  const W = 1000, H = 1320, mat: Mat = { l: 12, t: 12, r: 12, b: 12, color: '#fff', shape: 'rounded', shadow: true };
  const slots: Slot[] = [0, 1, 2, 3].map(i => ({ x: 70 + (i % 2) * 450, y: 330 + Math.floor(i / 2) * 360, w: 410, h: 320, photo: i, shape: 'rounded', mat }));
  return {
    id: 'rr-rewards', name: 'ruparupa Rewards', desc: 'Biru rewards + koin emas', group: 'ruparupa', W, H, photos: 4, slots, shape: 'rounded', filter: 'natural',
    theme: { bg: BL, ink: '#fff', accent: GOLD },
    bg: ({ ctx }) => {
      const g = ctx.createLinearGradient(0, 0, W * 0.3, H); g.addColorStop(0, '#2bb0ff'); g.addColorStop(1, BL_D);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.arc(W - 80, 120, 260, 0, Math.PI * 2); ctx.fill();
      const rnd = mulberry(31);
      [[880, 230, 46], [930, 330, 30], [60, 1060, 40], [940, 1040, 34], [500, 300, 22], [130, 300, 26]].forEach(([x, y, r]) => coin(ctx, x + rnd() * 6, y, r));
    },
    decor: ({ ctx, d }) => {
      drawLogo(ctx, L_MARK_WHITE_BLUE, 70, 70, 280, 'left');
      text(ctx, 'rewards', 360, 92, { font: n9, size: 40, color: '#fff', align: 'left' });
      text(ctx, 'Member Moment', 70, 210, { font: n9, size: 76, color: '#fff', align: 'left', maxW: 760 });
      text(ctx, 'kumpulin momen, bukan cuma koin ✦', 72, 268, { font: n6, size: 28, color: 'rgba(255,255,255,.9)', align: 'left' });
      // member card
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
      ctx.beginPath(); roundRect(ctx, 70, 1080, 860, 170, 26); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
      ctx.save(); ctx.beginPath(); roundRect(ctx, 70, 1080, 860, 170, 26); ctx.clip();
      ctx.fillStyle = OR; ctx.fillRect(70, 1080, 250, 170); ctx.restore();
      text(ctx, 'MEMBER', 195, 1140, { font: n9, size: 34, color: '#fff' });
      text(ctx, 'GOLD', 195, 1186, { font: n9, size: 26, color: GOLD });
      coin(ctx, 390, 1165, 38);
      text(ctx, '999.999 koin', 450, 1150, { font: n9, size: 44, color: OR, align: 'left' });
      text(ctx, d.showDate ? `aktif sejak ${today()}` : 'aktif selamanya', 452, 1200, { font: n6, size: 22, color: '#5b6b7a', align: 'left' });
    },
  };
})();

/* 3 — delivery box: kraft carton, orange ruparupa tape, polaroids, shipping label */
const paket: Template = (() => {
  const W = 1000, H = 1320;
  const mat: Mat = { l: 16, t: 16, r: 16, b: 66, color: '#fff', shadow: true };
  const slots: Slot[] = [
    { x: 120, y: 280, w: 360, h: 300, rot: -4, photo: 0, mat },
    { x: 530, y: 320, w: 360, h: 300, rot: 3.5, photo: 1, mat },
    { x: 120, y: 720, w: 360, h: 300, rot: -1.5, photo: 2, mat },
  ];
  return {
    id: 'rr-paket', name: 'Paket ruparupa', desc: 'Kardus kiriman + selotip oranye', group: 'ruparupa', W, H, photos: 3, slots, shape: 'rect', filter: 'warm',
    theme: { bg: '#c99a63', ink: INK, accent: OR },
    bg: ({ ctx }) => {
      ctx.fillStyle = BL_L; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
      ctx.fillStyle = '#c99a63'; ctx.fillRect(60, 150, 880, 1110); ctx.restore();
      speckle(ctx, W, H, '#7a5228', 4200, 6);
      ctx.strokeStyle = 'rgba(90,60,25,.35)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(500, 150); ctx.lineTo(500, 260); ctx.stroke();
      // tape
      ctx.fillStyle = OR; ctx.fillRect(40, 118, 920, 96);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(40, 118, 920, 10);
    },
    decor: ({ ctx, d }) => {
      for (let x = 70; x < 940; x += 300) drawLogo(ctx, L_MARK_WHITE, x, 146, 230, 'left');
      // shipping label
      ctx.save(); ctx.translate(560, 1000); ctx.rotate(-0.02);
      ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 340, 210); ctx.shadowColor = 'transparent';
      ctx.fillStyle = OR; ctx.fillRect(0, 0, 340, 40);
      text(ctx, 'KIRIMAN SPESIAL', 170, 21, { font: n9, size: 20, color: '#fff', track: 0.1 });
      text(ctx, 'Kepada: kamu yang lagi senyum', 18, 70, { font: n8, size: 19, color: INK, align: 'left', maxW: 304 });
      text(ctx, 'Dari: ruparupa', 18, 102, { font: n6, size: 19, color: INK, align: 'left' });
      if (d.showDate) text(ctx, today(), 18, 132, { font: mono, size: 16, color: '#5b6b7a', align: 'left' });
      const rnd = mulberry(55); let x = 18; ctx.fillStyle = INK;
      while (x < 320) { const w = 2 + Math.floor(rnd() * 4); ctx.fillRect(x, 152, w, 40); x += w + 2 + Math.floor(rnd() * 3); }
      ctx.restore();
      // fragile stamp
      ctx.save(); ctx.translate(300, 1160); ctx.rotate(-0.08);
      ctx.strokeStyle = OR; ctx.lineWidth = 5; ctx.beginPath(); roundRect(ctx, -190, -44, 380, 88, 12); ctx.stroke();
      text(ctx, 'JAGA BAIK-BAIK', 0, -12, { font: n9, size: 30, color: OR });
      text(ctx, 'isi: kenangan', 0, 22, { font: n8, size: 22, color: OR });
      ctx.restore();
    },
  };
})();

/* 4 — "rumahnya rumah": photos are the windows of a ruparupa house */
const rumah: Template = (() => {
  const W = 1000, H = 1360;
  const slots: Slot[] = [0, 1, 2, 3].map(i => ({ x: 180 + (i % 2) * 340, y: 480 + Math.floor(i / 2) * 290, w: 300, h: 240, photo: i, shape: 'rect', stroke: { w: 12, color: BL } }));
  return {
    id: 'rr-rumah', name: 'Rumahnya Rumah', desc: 'Foto jadi jendela rumah', group: 'ruparupa', W, H, photos: 4, slots, shape: 'rect', filter: 'natural',
    theme: { bg: BL_L, ink: OR, accent: BL },
    bg: ({ ctx }) => {
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#bfe6ff'); sky.addColorStop(1, BL_L);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      [[150, 120, 70], [230, 100, 55], [820, 170, 80], [900, 150, 50], [60, 300, 40]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); });
      // ground
      ctx.fillStyle = '#9fd38a'; ctx.beginPath(); ctx.moveTo(0, 1210); ctx.quadraticCurveTo(W / 2, 1170, W, 1210); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
      // chimney, body, roof
      ctx.fillStyle = '#d9480f'; ctx.fillRect(700, 170, 70, 180);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
      ctx.fillStyle = CREAM; ctx.fillRect(130, 430, 740, 790); ctx.restore();
      ctx.fillStyle = OR; ctx.beginPath(); ctx.moveTo(70, 460); ctx.lineTo(500, 130); ctx.lineTo(930, 460); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d9480f'; ctx.fillRect(70, 452, 860, 18);
      // door + sills
      ctx.fillStyle = BL; ctx.beginPath(); roundRect(ctx, 440, 1060, 120, 160, 14); ctx.fill();
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(540, 1145, 8, 0, Math.PI * 2); ctx.fill();
      for (const s of slots) { ctx.fillStyle = BL_D; ctx.fillRect(s.x - 16, s.y + s.h + 4, s.w + 32, 14); }
    },
    decor: ({ ctx, d }) => {
      drawLogo(ctx, L_MARK_WHITE, 500, 300, 330);
      // tagline coloured like the logo: "rumahnya" blue, "rumah" orange
      ctx.font = n9(56); const a = 'rumahnya ', b = 'rumah', wa = ctx.measureText(a).width, wb = ctx.measureText(b).width, x0 = W / 2 - (wa + wb) / 2;
      text(ctx, a, x0, 1286, { font: n9, size: 56, color: BL_D, align: 'left' });
      text(ctx, b, x0 + wa, 1286, { font: n9, size: 56, color: OR, align: 'left' });
      if (d.showDate) text(ctx, today(), W / 2, 1334, { font: mono, size: 18, color: '#2f6b3a', track: 0.25 });
    },
  };
})();

export const templates: Template[] = [strip, rewards, paket, rumah];
