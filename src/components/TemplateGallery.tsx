import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { makeShot, renderStrip } from '../lib/render';
import { getTemplate, GROUPS, hitSlot, isLocked, TEMPLATES, type Template } from '../lib/templates';
import type { Design, Shot } from '../lib/types';
import { fontsReady } from '../lib/util';
import { designOf, useStore } from '../store';

/** Stand-in photos for template previews before the user has shot anything. */
let placeholders: Shot[] | null = null;
function getPlaceholders() {
  if (placeholders) return placeholders;
  const hues = [[18, 32], [200, 220], [42, 12], [150, 170]];
  placeholders = hues.map(([a, b]) => {
    const c = document.createElement('canvas'); c.width = 480; c.height = 360; const x = c.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, 480, 360); g.addColorStop(0, `hsl(${a},55%,72%)`); g.addColorStop(1, `hsl(${b},45%,48%)`);
    x.fillStyle = g; x.fillRect(0, 0, 480, 360);
    x.fillStyle = 'rgba(30,20,15,.55)';
    x.beginPath(); x.arc(240, 150, 62, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(240, 360, 130, 120, 0, Math.PI, 0); x.fill();
    return makeShot(c);
  });
  return placeholders;
}

/** Small render of a template, filled with the user's photos where they exist. */
export function TemplateThumb({ id, size = 220 }: { id: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const shots = useStore(s => s.shots);
  useEffect(() => {
    const t = getTemplate(id), ph = getPlaceholders();
    const d: Design = {
      // the user's photos (empty slots repeat them, like the real print); stand-ins before the first shot
      layout: id, shots: shots.some(Boolean) ? shots : ph, filter: t.filter ?? 'natural', grain: 0, frame: 'cream', customBg: '#ff9e7a',
      caption: 'jepret booth', font: 'retro', showDate: true, shape: 'auto', outline: false, stickers: [],
    };
    let alive = true;
    void fontsReady().then(() => requestAnimationFrame(() => { if (alive && ref.current) renderStrip(ref.current, size / Math.max(t.W, t.H), d); }));
    return () => { alive = false; };
  }, [id, shots, size]);
  return <canvas ref={ref} />;
}

export function TemplateCard({ t }: { t: Template }) {
  const active = useStore(s => s.layout === t.id);
  const locked = useStore(s => isLocked(t.id, s.unlocked));
  return (
    <button className={'tpl' + (locked ? ' locked' : '')} aria-pressed={active} onClick={() => useStore.getState().setLayout(t.id)}
      title={locked ? 'Butuh kode akses' : t.desc} aria-label={locked ? `${t.name}, terkunci, butuh kode akses` : undefined}>
      <span className="tpl-art"><TemplateThumb id={t.id} />{locked && <span className="tpl-lock" aria-hidden="true">🔒<small>pakai kode</small></span>}</span>
      <strong>{t.name}</strong>
      <small>{t.photos} foto · {t.desc}</small>
    </button>
  );
}

/** Category chips + a scrollable grid of every template (booth side panel). */
export function TemplatePicker({ onPicked }: { onPicked?: () => void }) {
  const layout = useStore(s => s.layout);
  const unlocked = useStore(s => s.unlocked);
  const [cat, setCat] = useState<string>(() => getTemplate(useStore.getState().layout).group);
  const groups = GROUPS.filter(g => TEMPLATES.some(t => t.group === g.id));
  const list = cat === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.group === cat);
  const first = useRef(layout);
  useEffect(() => { if (layout !== first.current) onPicked?.(); }, [layout]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="tpl-picker">
      <div className="cats" role="tablist" aria-label="Kategori template">
        <button className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>Semua</button>
        {groups.map(g => <button key={g.id} className="chip" aria-pressed={cat === g.id} onClick={() => setCat(g.id)}>{g.lock && !unlocked.includes(g.id) ? '🔒 ' : ''}{g.name}</button>)}
        {GROUPS.some(g => g.lock) && <button className="chip key-chip" onClick={() => useStore.getState().patch({ unlockFor: '' })}>🔑 Punya kode?</button>}
      </div>
      <div className="tpl-grid">{list.map(t => <TemplateCard key={t.id} t={t} />)}</div>
    </div>
  );
}

/** The chosen template with the photos taken so far; tap a slot to make it the next shot. */
export function LivePreview() {
  const ref = useRef<HTMLCanvasElement>(null);
  const design = useStore(useShallow(designOf));
  const target = useStore(s => s.target);
  useEffect(() => {
    const t = getTemplate(design.layout);
    let alive = true;
    void fontsReady().then(() => requestAnimationFrame(() => {
      if (alive && ref.current) renderStrip(ref.current, 560 / Math.max(t.W, t.H), design, { marks: { selSlot: target, selSticker: -1 }, fill: false });
    }));
    return () => { alive = false; };
  }, [design, target]);

  const pick = (e: MouseEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget, r = c.getBoundingClientRect(), t = getTemplate(useStore.getState().layout);
    const i = hitSlot(t, ((e.clientX - r.left) / r.width) * t.W, ((e.clientY - r.top) / r.height) * t.H);
    if (i >= 0) useStore.getState().patch({ target: t.slots[i].photo });
  };
  return (
    <div className="live-pv">
      <canvas ref={ref} onClick={pick} aria-label="Preview cetak" />
      <span className="eyebrow">preview cetak · tap slot buat milih</span>
    </div>
  );
}
