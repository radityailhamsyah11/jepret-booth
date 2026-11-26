import { create } from 'zustand';
import { beep, shutter } from './lib/audio';
import type { Clip } from './lib/clip';
import { LABEL_COLORS, MAX_PHOTOS, type FontId, type FrameId } from './lib/config';
import { makeShot } from './lib/render';
import { DEFAULT_TEMPLATE, getTemplate, photoCountOf } from './lib/templates';
import type { Design, Shot, Sticker } from './lib/types';
import { clamp, fileToCanvas, mulberry, storage } from './lib/util';

export type Step = 1 | 2 | 3;

interface State extends Design {
  /** Always MAX_PHOTOS long. A template only uses the first slotCount() entries, so switching templates never drops photos. */
  shots: (Shot | null)[];
  target: number;
  selSlot: number;
  selSticker: number;
  sound: boolean; mirror: boolean; grid: boolean; timer: 3 | 5 | 10; facing: 'user' | 'environment';
  /** chosen camera (deviceId); null = pick by facing */
  deviceId: string | null;
  /** burst = all empty slots in one go; single = one photo, review, then the next */
  shootMode: 'burst' | 'single';
  step: Step;
  /** set when another step asks the capture step to open the camera as soon as it mounts */
  autoStartCam: boolean;
  /** landing page, or the full-screen booth */
  view: 'landing' | 'booth';
  toast: { msg: string; key: number } | null;
  busy: string | null;
}

interface Actions {
  patch: (p: Partial<State>) => void;
  showToast: (msg: string) => void;
  setLayout: (k: string) => void;
  setShot: (i: number, shot: Shot | null) => void;
  updateShot: (i: number, p: Partial<Pick<Shot, 'zoom' | 'ox' | 'oy'>>) => void;
  /** attaches a finished recording to slot i, if that slot still holds the shot it was recorded for */
  attachClip: (i: number, shotId: number, clip: Clip) => void;
  loadFiles: (files: File[], startAt?: number) => Promise<number>;
  addSticker: (type: Sticker['type'], t: string) => void;
  updateSticker: (i: number, p: Partial<Sticker>) => void;
  removeSticker: (i: number) => void;
  duplicateSticker: (i: number) => void;
  goStep: (n: Step) => void;
  restart: () => void;
}

export const slotCount = (s: Pick<State, 'layout'>) => photoCountOf(s.layout);
export const activeShots = (s: Pick<State, 'layout' | 'shots'>) => s.shots.slice(0, slotCount(s));
export const filledCount = (s: Pick<State, 'layout' | 'shots'>) => activeShots(s).filter(Boolean).length;
export const allFilled = (s: Pick<State, 'layout' | 'shots'>) => filledCount(s) === slotCount(s);
const firstEmpty = (s: Pick<State, 'layout' | 'shots'>) => activeShots(s).findIndex(x => !x);

let toastKey = 0;

export const useStore = create<State & Actions>()((set, get) => ({
  layout: DEFAULT_TEMPLATE, shots: Array(MAX_PHOTOS).fill(null), target: 0,
  filter: getTemplate(DEFAULT_TEMPLATE).filter ?? 'natural', grain: 0, frame: 'cream' as FrameId, customBg: '#ff9e7a',
  caption: 'jepret booth', font: 'retro' as FontId, showDate: true, shape: 'auto', outline: false,
  stickers: [], selSlot: -1, selSticker: -1,
  sound: storage.get('jb-sound') !== '0', mirror: true, grid: false, timer: 3, facing: 'user', deviceId: null, shootMode: 'burst',
  step: 1, autoStartCam: false, view: 'landing', toast: null, busy: null,

  patch: p => set(p),
  showToast: msg => set({ toast: { msg, key: ++toastKey } }),

  setLayout: k => set(s => {
    const t = getTemplate(k), n = t.photos, shots = [...s.shots];
    // a photo parked beyond this layout's slots moves into an empty slot instead of leaving a gap
    for (let i = 0; i < n; i++) if (!shots[i]) {
      const j = shots.findIndex((x, idx) => idx >= n && x);
      if (j >= 0) { shots[i] = shots[j]; shots[j] = null; }
    }
    const ne = firstEmpty({ layout: k, shots });
    return { layout: t.id, shots, target: ne >= 0 ? ne : 0, selSlot: -1, ...(t.filter ? { filter: t.filter } : {}) };
  }),

  setShot: (i, shot) => set(s => {
    const old = s.shots[i];
    if (old?.clip && old.clip !== shot?.clip && !s.shots.some((x, k) => k !== i && x?.clip === old.clip)) URL.revokeObjectURL(old.clip.url);
    const shots = [...s.shots]; shots[i] = shot;
    const ne = firstEmpty({ layout: s.layout, shots });
    return { shots, target: shot && ne >= 0 ? ne : i };
  }),

  updateShot: (i, p) => set(s => {
    const cur = s.shots[i]; if (!cur) return {};
    const shots = [...s.shots]; shots[i] = { ...cur, ...p }; // same cache Map: keys include zoom/pan
    return { shots };
  }),

  attachClip: (i, shotId, clip) => set(s => {
    const cur = s.shots[i];
    if (!cur || cur.id !== shotId) { URL.revokeObjectURL(clip.url); return {}; }
    const shots = [...s.shots]; shots[i] = { ...cur, clip };
    return { shots };
  }),

  loadFiles: async (files, startAt) => {
    const imgs = files.filter(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name));
    if (!imgs.length) return 0;
    const s = get(), n = slotCount(s);
    let order: number[];
    if (startAt != null) order = [startAt];
    else {
      const empties = [...Array(n).keys()].filter(i => !s.shots[i]);
      order = empties.length ? empties : [...Array(n).keys()].map(k => (s.target + k) % n);
    }
    set({ busy: 'Memuat foto…' });
    let added = 0, failed = 0;
    const shots = [...get().shots];
    for (const f of imgs) {
      if (added >= order.length) break;
      try { shots[order[added]] = makeShot(await fileToCanvas(f)); added++; } catch { failed++; }
    }
    const ne = firstEmpty({ layout: s.layout, shots });
    set({ shots, busy: null, target: ne >= 0 ? ne : get().target });
    if (failed) get().showToast(`${failed} foto gagal dibuka (format HEIC belum didukung semua browser).`);
    else if (imgs.length > added) get().showToast(`Cuma ${added} foto yang masuk, slot-nya udah penuh.`);
    return added;
  },

  addSticker: (type, t) => set(s => {
    const rnd = mulberry(Date.now());
    const st: Sticker = { type, t, x: 0.5 + (rnd() - 0.5) * 0.3, y: clamp(0.4 + (rnd() - 0.5) * 0.5, 0.08, 0.9), s: type === 'label' ? 0.9 : 1.4, r: Math.round((rnd() - 0.5) * 30) };
    if (type === 'label') { const c = LABEL_COLORS[s.stickers.length % LABEL_COLORS.length]; st.c = c[0]; st.tc = c[1]; }
    return { stickers: [...s.stickers, st], selSticker: s.stickers.length, selSlot: -1 };
  }),
  updateSticker: (i, p) => set(s => ({ stickers: s.stickers.map((x, k) => (k === i ? { ...x, ...p } : x)) })),
  removeSticker: i => set(s => ({ stickers: s.stickers.filter((_, k) => k !== i), selSticker: -1 })),
  duplicateSticker: i => set(s => {
    const x = s.stickers[i]; if (!x) return {};
    return { stickers: [...s.stickers, { ...x, x: clamp(x.x + 0.06, 0, 1), y: clamp(x.y + 0.03, 0, 1) }], selSticker: s.stickers.length };
  }),

  goStep: n => {
    const s = get();
    if (n > 1 && filledCount(s) === 0) return;
    if (n === 3 && !allFilled(s)) s.showToast(`${slotCount(s) - filledCount(s)} slot kosong diisi ulang pakai foto yang udah ada ✨`);
    set({ step: n, selSticker: -1, ...(n === 1 ? { selSlot: -1 } : {}) });
  },

  restart: () => set({ shots: Array(MAX_PHOTOS).fill(null), stickers: [], selSlot: -1, selSticker: -1, target: 0, step: 1 }),
}));

/** Opens the full-screen booth (adds a history entry so the browser Back button returns to the landing page). */
export function enterBooth(p: Partial<Pick<State, 'step' | 'autoStartCam'>> = {}) {
  if (useStore.getState().view !== 'booth') history.pushState({ jbBooth: true }, '');
  useStore.getState().patch({ view: 'booth', ...p });
  window.scrollTo(0, 0);
}
export function leaveBooth() {
  if (history.state?.jbBooth) history.back(); // popstate switches the view
  else useStore.getState().patch({ view: 'landing' });
}

// sound effects respect the user's sound toggle
export const sfx = {
  beep: (freq?: number, dur?: number) => { if (useStore.getState().sound) beep(freq, dur); },
  shutter: () => { if (useStore.getState().sound) shutter(); },
};

export const designOf = (s: State): Design => ({
  layout: s.layout, shots: s.shots, filter: s.filter, grain: s.grain, frame: s.frame, customBg: s.customBg,
  caption: s.caption, font: s.font, showDate: s.showDate, shape: s.shape, outline: s.outline, stickers: s.stickers,
});

/** Opens the native file picker. The input is attached to the DOM because some mobile browsers ignore detached inputs. */
export function pickFiles(multiple: boolean): Promise<File[]> {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = multiple; inp.hidden = true;
    const done = (files: File[]) => { inp.remove(); resolve(files); };
    inp.addEventListener('change', () => done([...(inp.files ?? [])]));
    inp.addEventListener('cancel', () => done([]));
    document.body.appendChild(inp); inp.click();
  });
}
