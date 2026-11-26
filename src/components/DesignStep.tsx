import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { fillMap, renderStrip, stickerBox } from '../lib/render';
import { getTemplate, hitSlot as hitTplSlot } from '../lib/templates';
import { clamp, fontsReady } from '../lib/util';
import { designOf, pickFiles, useStore } from '../store';
import { FilterPanel, FramePanel, SlotEditor, StickerPanel, TemplatePanel, TextPanel } from './DesignPanels';

const TABS = [
  { id: 'layout', label: 'Template' },
  { id: 'filter', label: 'Filter' },
  { id: 'frame', label: 'Frame' },
  { id: 'text', label: 'Teks' },
  { id: 'sticker', label: 'Stiker' },
] as const;
export type TabId = (typeof TABS)[number]['id'];

type Drag =
  | { kind: 'stk'; p0: { x: number; y: number }; x0: number; y0: number; i: number }
  | { kind: 'pan'; p0: { x: number; y: number }; ox0: number; oy0: number; i: number; slot: number };

const PV_SCALE = Math.min(1, (window.devicePixelRatio || 1) * 0.55);

export function DesignStep() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const design = useStore(useShallow(designOf));
  const selSlot = useStore(s => s.selSlot), selSticker = useStore(s => s.selSticker);
  const [tab, setTab] = useState<TabId>('layout');
  const [fontsOk, setFontsOk] = useState(false);
  const drag = useRef<Drag | null>(null);

  useEffect(() => { void fontsReady.then(() => setFontsOk(true)); }, []);

  // redraw on the next frame whenever the design or selection changes
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const t = getTemplate(design.layout), sc = PV_SCALE * Math.min(1.4, 1500 / Math.max(t.W, t.H));
    const id = requestAnimationFrame(() => renderStrip(c, sc, design, { marks: { selSlot, selSticker } }));
    return () => cancelAnimationFrame(id);
  }, [design, selSlot, selSticker, fontsOk]);

  const point = (e: { clientX: number; clientY: number }) => {
    const c = canvasRef.current!, r = c.getBoundingClientRect(), { W, H } = getTemplate(useStore.getState().layout);
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const hitSticker = (p: { x: number; y: number }) => {
    const st = useStore.getState(), ctx = canvasRef.current!.getContext('2d')!, { W, H } = getTemplate(st.layout);
    for (let i = st.stickers.length - 1; i >= 0; i--) {
      const s = st.stickers[i], b = stickerBox(ctx, s), a = (-s.r * Math.PI) / 180;
      const dx = p.x - s.x * W, dy = p.y - s.y * H;
      const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(lx) <= b.w / 2 + 10 && Math.abs(ly) <= b.h / 2 + 10) return i;
    }
    return -1;
  };
  /** a repeated (empty) slot edits the photo it repeats; with no photos at all, the slot itself */
  const sourcePhoto = (p: number) => {
    const st = useStore.getState(); if (st.shots[p]) return p;
    const m = fillMap(st.shots, getTemplate(st.layout).photos)[p];
    return m >= 0 ? m : p;
  };
  /** slot index under the point (template slots, not photo indices) */
  const hitSlot = (p: { x: number; y: number }) => hitTplSlot(getTemplate(useStore.getState().layout), p.x, p.y);

  const onDown = async (e: RPointerEvent<HTMLCanvasElement>) => {
    const st = useStore.getState(), p = point(e), si = hitSticker(p);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (si >= 0) {
      const s = st.stickers[si];
      drag.current = { kind: 'stk', p0: p, x0: s.x, y0: s.y, i: si };
      st.patch({ selSticker: si, selSlot: -1 }); setTab('sticker');
      return;
    }
    const si2 = hitSlot(p), ci = si2 >= 0 ? sourcePhoto(getTemplate(st.layout).slots[si2].photo) : -1;
    st.patch({ selSticker: -1, selSlot: ci });
    const sh = ci >= 0 ? st.shots[ci] : null;
    if (sh) drag.current = { kind: 'pan', p0: p, ox0: sh.ox, oy0: sh.oy, i: ci, slot: si2 };
    else if (ci >= 0) { const files = await pickFiles(false); if (files.length) await st.loadFiles(files, ci); }
  };
  const onMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current; if (!d) return;
    const st = useStore.getState(), p = point(e), t = getTemplate(st.layout), { W, H } = t;
    if (d.kind === 'stk') {
      st.updateSticker(d.i, { x: clamp(d.x0 + (p.x - d.p0.x) / W, 0, 1), y: clamp(d.y0 + (p.y - d.p0.y) / H, 0, 1) });
    } else {
      const sh = st.shots[d.i]; if (!sh) return;
      const r = t.slots[d.slot], base = Math.max(r.w / sh.w, r.h / sh.h) * sh.zoom;
      const mx = (sh.w * base - r.w) / 2, my = (sh.h * base - r.h) / 2;
      // drag in the slot's own (possibly rotated) axes
      const a = (-(r.rot ?? 0) * Math.PI) / 180, gx = p.x - d.p0.x, gy = p.y - d.p0.y;
      const lx = gx * Math.cos(a) - gy * Math.sin(a), ly = gx * Math.sin(a) + gy * Math.cos(a);
      // round so tiny moves reuse the filtered-cell cache
      const ox = mx > 0.5 ? Math.round(clamp(d.ox0 + lx / mx, -1, 1) * 200) / 200 : 0;
      const oy = my > 0.5 ? Math.round(clamp(d.oy0 + ly / my, -1, 1) * 200) / 200 : 0;
      st.updateShot(d.i, { ox, oy });
    }
  };
  const onUp = () => { drag.current = null; };

  // wheel = zoom photo / resize sticker. Needs a non-passive listener to preventDefault page scroll.
  useEffect(() => {
    const c = canvasRef.current!;
    const onWheel = (e: WheelEvent) => {
      const st = useStore.getState(), p = point(e), si = hitSticker(p);
      if (si >= 0) {
        e.preventDefault();
        st.updateSticker(si, { s: clamp(st.stickers[si].s * (e.deltaY < 0 ? 1.06 : 0.94), 0.4, 3) });
        st.patch({ selSticker: si }); return;
      }
      const si2 = hitSlot(p), ci = si2 >= 0 ? sourcePhoto(getTemplate(st.layout).slots[si2].photo) : -1, sh = ci >= 0 ? st.shots[ci] : null;
      if (sh) {
        e.preventDefault();
        st.updateShot(ci, { zoom: clamp(Math.round(sh.zoom * (e.deltaY < 0 ? 1.05 : 0.95) * 100) / 100, 1, 3) });
        st.patch({ selSlot: ci, selSticker: -1 });
      }
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input, textarea, select') || document.querySelector('dialog[open]')) return;
      const st = useStore.getState();
      if ((e.key === 'Delete' || e.key === 'Backspace') && st.selSticker >= 0) { e.preventDefault(); st.removeSticker(st.selSticker); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const goStep = useStore(s => s.goStep);

  return (
    <div className="view active">
      <div className="studio">
        <div className="preview">
          <canvas ref={canvasRef} aria-label="Preview strip" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
          <div className="cap">Tap foto buat geser &amp; zoom · tap stiker buat pindahin</div>
        </div>
        <div>
          <div className="panel">
            <SlotEditor />
            <div className="tabs" role="tablist">
              {TABS.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <div className="tabpanel active" role="tabpanel">
              {tab === 'layout' && <TemplatePanel />}
              {tab === 'filter' && <FilterPanel />}
              {tab === 'frame' && <FramePanel />}
              {tab === 'text' && <TextPanel />}
              {tab === 'sticker' && <StickerPanel />}
            </div>
          </div>
          <div className="nextbar">
            <button className="btn" onClick={() => goStep(1)}>← Foto lagi</button>
            <button className="btn primary" onClick={() => goStep(3)}>Lanjut simpan →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
