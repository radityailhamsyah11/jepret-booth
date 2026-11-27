/**
 * First-time tour: dims the page, spotlights one element at a time and explains it in a card
 * (a bottom snackbar on phones). Progress lives in localStorage, so it only runs once per part
 * of the booth; "Ulangi tur" in the header clears it.
 */
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { storage } from '../lib/util';

export interface TourStep { sel: string; title: string; body: string }
export type TourId = 'capture' | 'design' | 'save';

const KEY = (id: TourId) => `jb-tour-${id}`;
const ALL: TourId[] = ['capture', 'design', 'save'];
const RESTART = 'jb-tour-restart';

export const tourDone = (id: TourId) => storage.get(KEY(id)) === 'done';
export const skipAllTours = () => ALL.forEach(id => storage.set(KEY(id), 'done'));
/** first visit = never saw any tour and never dismissed the welcome snackbar */
export const isFirstVisit = () => storage.get('jb-visited') !== '1' && ALL.every(id => !tourDone(id));
export const markVisited = () => storage.set('jb-visited', '1');
export function restartTours() {
  ALL.forEach(id => storage.set(KEY(id), ''));
  window.dispatchEvent(new Event(RESTART));
}

const PAD = 8, CARD_W = 340;
type Rect = { top: number; left: number; width: number; height: number };

export function Tour({ id, steps, delay = 600 }: { id: TourId; steps: TourStep[]; delay?: number }) {
  const [on, setOn] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // start once (after the step has laid out), or again when the user asks for a replay
  useEffect(() => {
    const start = () => { if (!tourDone(id)) { setI(0); setOn(true); } };
    const t = setTimeout(start, delay);
    window.addEventListener(RESTART, start);
    return () => { clearTimeout(t); window.removeEventListener(RESTART, start); };
  }, [id, delay]);

  const visible = steps.filter(s => document.querySelector(s.sel));
  const step = visible[i];

  const finish = useCallback(() => { setOn(false); storage.set(KEY(id), 'done'); markVisited(); }, [id]);

  // follow the target: scroll it into view, then track its box on resize/scroll
  useLayoutEffect(() => {
    if (!on || !step) return;
    const el = document.querySelector<HTMLElement>(step.sel);
    if (!el) return;
    const b0 = el.getBoundingClientRect();
    if (b0.top < 70 || b0.bottom > innerHeight - 140) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    let raf = 0;
    const measure = () => { const b = el.getBoundingClientRect(); setRect({ top: b.top, left: b.left, width: b.width, height: b.height }); raf = requestAnimationFrame(measure); };
    measure();
    return () => cancelAnimationFrame(raf);
  }, [on, step]);

  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); finish(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); i < visible.length - 1 ? setI(i + 1) : finish(); }
      else if (e.key === 'ArrowLeft' && i > 0) setI(i - 1);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [on, i, visible.length, finish]);

  if (!on || !step || !rect) return null;

  const phone = innerWidth <= 860;
  const hole = { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };
  // card: below the target if it fits, else above, else beside; phones get a bottom snackbar
  let cardStyle: React.CSSProperties = {};
  if (!phone) {
    const w = CARD_W, h = 190, gap = 14;
    let top = hole.top + hole.height + gap, left = hole.left + hole.width / 2 - w / 2;
    if (top + h > innerHeight - 10) top = hole.top - h - gap;
    if (top < 10) { top = Math.min(innerHeight - h - 10, Math.max(10, hole.top)); left = hole.left - w - gap < 10 ? hole.left + hole.width + gap : hole.left - w - gap; }
    left = Math.max(12, Math.min(innerWidth - w - 12, left));
    cardStyle = { top, left, width: w };
  }
  const last = i === visible.length - 1;

  return (
    <div className="tour" role="dialog" aria-modal="false" aria-label={`Tur: ${step.title}`}>
      <div className="tour-hole" style={hole} />
      <div className={'tour-card' + (phone ? ' snack' : '')} style={cardStyle} key={i}>
        <div className="tour-top">
          <span className="eyebrow"><b>tur · {i + 1}/{visible.length}</b></span>
          <button className="tour-x" onClick={finish} aria-label="Lewati tur">Lewati</button>
        </div>
        <h4>{step.title}</h4>
        <p>{step.body}</p>
        <div className="tour-nav">
          <span className="tour-dots" aria-hidden="true">{visible.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</span>
          {i > 0 && <button className="btn sm soft" onClick={() => setI(i - 1)}>←</button>}
          <button className="btn sm primary" onClick={() => (last ? finish() : setI(i + 1))} autoFocus>{last ? 'Siap, mulai!' : 'Lanjut →'}</button>
        </div>
      </div>
    </div>
  );
}

/** Landing-page snackbar for first-time visitors. */
export function WelcomeSnack({ onStart }: { onStart: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(isFirstVisit()), 1200); return () => clearTimeout(t); }, []);
  if (!show) return null;
  const close = (skip: boolean) => { setShow(false); markVisited(); if (skip) skipAllTours(); };
  return (
    <div className="welcome-snack" role="status">
      <span className="ws-emoji" aria-hidden="true">👋</span>
      <div className="ws-text"><strong>Baru pertama kali di sini?</strong><span>Ikutin tur singkat ±30 detik biar tau tombol-tombolnya.</span></div>
      <div className="ws-actions">
        <button className="btn sm soft" onClick={() => close(true)}>Nggak usah</button>
        <button className="btn sm primary" onClick={() => { close(false); onStart(); }}>Ikutin tur →</button>
      </div>
    </div>
  );
}

export const CAPTURE_TOUR: TourStep[] = [
  { sel: '.stage', title: 'Ini booth kamu', body: 'Nyalain kamera (webcam atau iPhone), atau upload / drag & drop foto dari galeri.' },
  { sel: '.rail-tabs button:nth-child(2)', title: 'Pilih template dulu', body: 'Buka tab ini buat milih frame: retro, klasik, dan lainnya. Jumlah foto ngikutin template.' },
  { sel: '.cap-main .filters-row', title: 'Filter langsung keliatan', body: 'Pilih filter sebelum jepret, efeknya langsung muncul di kamera. Nanti masih bisa diganti.' },
  { sel: '.cap-main .controls .seg', title: 'Beruntun atau satu-satu', body: 'Beruntun = semua foto otomatis sekali jalan. Satu-satu = jepret, cek, ulang kalau kurang oke.' },
  { sel: '.shutter', title: 'Tombol jepret', body: 'Tekan buat mulai countdown. Di laptop bisa juga pakai Spasi, Esc buat batal.' },
  { sel: '.live-pv', title: 'Preview cetak', body: 'Hasil strip keliatan di sini. Tap slot buat milih foto mana yang dijepret berikutnya.' },
  { sel: '.rail-foot', title: 'Lanjut ke desain', body: 'Kalau fotonya udah oke, lanjut buat kasih filter, stiker, dan teks.' },
];
export const DESIGN_TOUR: TourStep[] = [
  { sel: '.booth-main .preview canvas', title: 'Atur foto langsung', body: 'Tap foto buat geser & zoom. Stiker juga bisa digeser, diperbesar, diputar.' },
  { sel: '.booth-main .tabs', title: 'Langkah desain', body: 'Template, filter, stiker (plus warna & teks buat template klasik). Ganti kapan aja.' },
  { sel: '.booth-main .nextbar', title: 'Maju per langkah', body: 'Tombol oranye bawa kamu ke tab berikutnya, terus ke halaman simpan.' },
];
export const SAVE_TOUR: TourStep[] = [
  { sel: '.out.primary', title: 'Simpan hasilnya', body: 'PNG resolusi tinggi. Ada juga GIF flipbook dan video live strip dari rekaman tiap jepretan.' },
  { sel: '.outs .note', title: 'Di iPhone / IG / TikTok?', body: 'Kalau download diblok, tekan lama gambar hasilnya terus pilih Simpan ke Foto.' },
];
