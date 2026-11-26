import { useEffect, useRef } from 'react';
import { EMOJI, FILTERS, FONT_LABELS, FONTS, FRAMES, LABEL_COLORS, LABELS, SHAPES, type FilterId, type FontId, type ShapeId } from '../lib/config';
import { applyFilter } from '../lib/filters';
import { drawFrameBg, frameOf } from '../lib/paint';
import { drawCover, makeShot, renderStrip } from '../lib/render';
import { shapePath } from '../lib/shapes';
import { getTemplate, TEMPLATES } from '../lib/templates';
import type { Design, Shot } from '../lib/types';
import { activeShots, pickFiles, useStore } from '../store';

export function SlotEditor() {
  const i = useStore(s => s.selSlot);
  const shot = useStore(s => (s.selSlot >= 0 ? s.shots[s.selSlot] : null));
  const { patch, updateShot, loadFiles } = useStore.getState();
  if (i < 0 || !shot) return null;

  const retake = () => patch({ target: i, selSlot: -1, step: 1, autoStartCam: true });
  const replace = async () => { const f = await pickFiles(false); if (f.length) await loadFiles(f, i); };

  return (
    <div className="slotedit on">
      <div className="head"><strong>Foto {i + 1}</strong><button className="btn sm soft" onClick={() => patch({ selSlot: -1 })}>Selesai</button></div>
      <div className="field">
        <div className="lab">Zoom <span>{shot.zoom.toFixed(1)}×</span></div>
        <input type="range" min={1} max={3} step={0.01} value={shot.zoom} onChange={e => updateShot(i, { zoom: +e.target.value })} />
      </div>
      <p className="hint" style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>Geser foto langsung di preview buat atur posisi.</p>
      <div className="row">
        <button className="btn sm soft" onClick={() => updateShot(i, { zoom: 1, ox: 0, oy: 0 })}>Reset</button>
        <button className="btn sm soft" onClick={replace}>Ganti file</button>
        <button className="btn sm soft" onClick={retake}>Foto ulang</button>
      </div>
    </div>
  );
}

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

function TemplateThumb({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const shots = useStore(s => s.shots);
  useEffect(() => {
    const t = getTemplate(id), ph = getPlaceholders();
    const d: Design = {
      layout: id, shots: shots.map((x, i) => x ?? ph[i]), filter: t.filter ?? 'natural', grain: 0, frame: 'cream', customBg: '#ff9e7a',
      caption: 'jepret booth', font: 'retro', showDate: true, shape: 'auto', outline: false, stickers: [],
    };
    const id2 = requestAnimationFrame(() => { if (ref.current) renderStrip(ref.current, 220 / Math.max(t.W, t.H), d); });
    return () => cancelAnimationFrame(id2);
  }, [id, shots]);
  return <canvas ref={ref} />;
}

export function TemplatePanel() {
  const layout = useStore(s => s.layout), shape = useStore(s => s.shape), outline = useStore(s => s.outline);
  const { setLayout, patch } = useStore.getState();
  const group = (g: 'retro' | 'klasik') => TEMPLATES.filter(t => t.group === g).map(t => (
    <button key={t.id} className="tpl" aria-pressed={layout === t.id} onClick={() => setLayout(t.id)} title={t.desc}>
      <span className="tpl-art"><TemplateThumb id={t.id} /></span>
      <strong>{t.name}</strong>
      <small>{t.photos} foto · {t.desc}</small>
    </button>
  ));
  return (
    <>
      <div className="field"><div className="lab">Retro <span>{TEMPLATES.filter(t => t.group === 'retro').length} template</span></div><div className="tpls">{group('retro')}</div></div>
      <div className="field"><div className="lab">Klasik <span>warna &amp; motif bebas</span></div><div className="tpls">{group('klasik')}</div></div>
      <div className="field">
        <div className="lab">Bentuk foto <span>{shape === 'auto' ? 'ikut template' : SHAPES[shape]}</span></div>
        <div className="shapes">
          <button className="shape-opt" aria-pressed={shape === 'auto'} onClick={() => patch({ shape: 'auto' })}><span className="auto">A</span>Auto</button>
          {(Object.keys(SHAPES) as ShapeId[]).map(k => (
            <button key={k} className="shape-opt" aria-pressed={shape === k} onClick={() => patch({ shape: k })}><ShapeIcon shape={k} />{SHAPES[k]}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="toggle">Garis tepi foto <input type="checkbox" checked={outline} onChange={e => patch({ outline: e.target.checked })} /></label>
      </div>
    </>
  );
}

function ShapeIcon({ shape }: { shape: ShapeId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, x = c.getContext('2d')!;
    x.clearRect(0, 0, 64, 64); shapePath(x, shape, 10, 12, 44, 40, 3);
    x.fillStyle = getComputedStyle(c).color; x.fill();
  }, [shape]);
  return <canvas ref={ref} width={64} height={64} />;
}

function FilterThumb({ id }: { id: FilterId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const shot = useStore(s => activeShots(s).find(Boolean) ?? null);
  const grain = useStore(s => s.grain);
  useEffect(() => {
    const c = ref.current!, x = c.getContext('2d', { willReadFrequently: true })!;
    if (!shot) { x.fillStyle = '#888'; x.fillRect(0, 0, 120, 120); return; }
    x.clearRect(0, 0, 120, 120);
    drawCover(x, { ...shot, zoom: 1, ox: 0, oy: 0 }, 120, 120);
    const im = x.getImageData(0, 0, 120, 120); applyFilter(id, im, shot.id, grain * 0.25); x.putImageData(im, 0, 0);
  }, [id, shot?.src, shot?.id, grain]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} width={120} height={120} />;
}

export function FilterPanel() {
  const filter = useStore(s => s.filter), grain = useStore(s => s.grain);
  const { patch } = useStore.getState();
  return (
    <>
      <div className="field">
        <div className="lab">Filter <span>{FILTERS[filter].name}</span></div>
        <div className="fgrid">
          {(Object.keys(FILTERS) as FilterId[]).map(k => (
            <button key={k} className="fopt" aria-pressed={filter === k} onClick={() => patch({ filter: k })}><FilterThumb id={k} />{FILTERS[k].name}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <div className="lab">Intensitas grain <span>{grain}</span></div>
        <input type="range" min={0} max={40} step={1} value={grain} onChange={e => patch({ grain: +e.target.value })} />
      </div>
    </>
  );
}

function Swatch({ id }: { id: keyof typeof FRAMES }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const x = ref.current!.getContext('2d')!; x.setTransform(0.6, 0, 0, 0.6, 0, 0); drawFrameBg(x, 200, 200, FRAMES[id]); }, [id]);
  return <canvas ref={ref} width={120} height={120} />;
}

export function FramePanel() {
  const frame = useStore(s => s.frame), customBg = useStore(s => s.customBg), usesFrame = useStore(s => !!getTemplate(s.layout).usesFrame);
  const { patch } = useStore.getState();
  return (
    <div className="field">
      {!usesFrame && <p className="note-inline">Template retro punya warna sendiri. Warna &amp; motif di sini dipakai di template <b>Klasik</b> dan GIF.</p>}
      <div className="lab">Warna &amp; motif <span>{frameOf(frame, customBg).name}</span></div>
      <div className="swatches">
        {(Object.keys(FRAMES) as (keyof typeof FRAMES)[]).map(k => (
          <button key={k} className="sw" title={FRAMES[k].name} aria-label={FRAMES[k].name} aria-pressed={frame === k} onClick={() => patch({ frame: k })}><Swatch id={k} /></button>
        ))}
        <label className="sw custom" title="Warna custom" aria-pressed={frame === 'custom'}>
          <input type="color" value={customBg} aria-label="Warna custom" onChange={e => patch({ customBg: e.target.value, frame: 'custom' })} />
        </label>
      </div>
    </div>
  );
}

export function TextPanel() {
  const caption = useStore(s => s.caption), font = useStore(s => s.font), showDate = useStore(s => s.showDate);
  const { patch } = useStore.getState();
  return (
    <>
      <div className="field">
        <label htmlFor="caption">Teks bawah</label>
        <input id="caption" className="text-in" maxLength={28} value={caption} autoComplete="off" onChange={e => patch({ caption: e.target.value })} />
      </div>
      <div className="field">
        <div className="lab">Font <span>buat template klasik</span></div>
        <div className="seg">
          {(Object.keys(FONTS) as FontId[]).map(k => <button key={k} aria-pressed={font === k} onClick={() => patch({ font: k })}>{FONT_LABELS[k]}</button>)}
        </div>
      </div>
      <div className="field">
        <label className="toggle">Tampilkan tanggal <input type="checkbox" checked={showDate} onChange={e => patch({ showDate: e.target.checked })} /></label>
      </div>
    </>
  );
}

export function StickerPanel() {
  const stickers = useStore(s => s.stickers), sel = useStore(s => s.selSticker);
  const { addSticker, updateSticker, removeSticker, duplicateSticker, patch } = useStore.getState();
  const cur = stickers[sel];
  return (
    <>
      <div className="field">
        <div className="lab">Emoji <span>tap buat nambah</span></div>
        <div className="stickers">
          {EMOJI.map(e => <button key={e} className="stk" aria-label={`Tambah stiker ${e}`} onClick={() => addSticker('emoji', e)}>{e}</button>)}
        </div>
      </div>
      <div className="field">
        <div className="lab">Label</div>
        <div className="labels">
          {LABELS.map((t, i) => {
            const [bg, fg] = LABEL_COLORS[i % LABEL_COLORS.length];
            return <button key={t} style={{ background: bg, color: fg }} onClick={() => addSticker('label', t)}>{t}</button>;
          })}
        </div>
      </div>
      {stickers.length > 0 && (
        <div className="selbox">
          {!cur && <p className="hint" style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--muted)' }}>Tap stiker di preview buat ngatur ukuran &amp; putarannya.</p>}
          <div className="field"><div className="lab">Ukuran</div><input type="range" min={0.4} max={3} step={0.01} disabled={!cur} value={cur?.s ?? 1} onChange={e => updateSticker(sel, { s: +e.target.value })} /></div>
          <div className="field"><div className="lab">Putar</div><input type="range" min={-180} max={180} step={1} disabled={!cur} value={cur?.r ?? 0} onChange={e => updateSticker(sel, { r: +e.target.value })} /></div>
          <div className="row">
            <button className="btn sm" disabled={!cur} onClick={() => duplicateSticker(sel)}>Duplikat</button>
            <button className="btn sm" disabled={!cur} onClick={() => removeSticker(sel)}>Hapus</button>
            <button className="btn sm" onClick={() => patch({ stickers: [], selSticker: -1 })}>Hapus semua</button>
          </div>
        </div>
      )}
    </>
  );
}
