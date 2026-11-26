import { useEffect, useRef } from 'react';
import { EMOJI, FILTERS, FONT_LABELS, FONTS, FRAMES, LABEL_COLORS, LABELS, SHAPES, type FilterId, type FontId, type ShapeId } from '../lib/config';
import { applyFilter } from '../lib/filters';
import { drawFrameBg, frameOf } from '../lib/paint';
import { drawCover } from '../lib/render';
import { shapePath } from '../lib/shapes';
import { getTemplate, GROUPS, TEMPLATES } from '../lib/templates';
import { TemplateCard } from './TemplateGallery';
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

export function TemplatePanel() {
  const shape = useStore(s => s.shape), outline = useStore(s => s.outline);
  const { patch } = useStore.getState();

  return (
    <>
      {GROUPS.map(g => {
        const list = TEMPLATES.filter(t => t.group === g.id);
        return list.length ? (
          <div className="field" key={g.id}><div className="lab">{g.name} <span>{list.length} · {g.desc}</span></div><div className="tpls">{list.map(t => <TemplateCard key={t.id} t={t} />)}</div></div>
        ) : null;
      })}
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
  const usesFont = useStore(s => !!getTemplate(s.layout).usesFont);
  const { patch } = useStore.getState();
  return (
    <>
      <div className="field">
        <label htmlFor="caption">{usesFont ? 'Teks bawah' : 'Nama / caption'}</label>
        <input id="caption" className="text-in" maxLength={28} value={caption} autoComplete="off" placeholder={usesFont ? '' : 'Contoh: Raditya · QA'} onChange={e => patch({ caption: e.target.value })} />
      </div>
      {usesFont && (
        <div className="field">
          <div className="lab">Font</div>
          <div className="seg">
            {(Object.keys(FONTS) as FontId[]).map(k => <button key={k} aria-pressed={font === k} onClick={() => patch({ font: k })}>{FONT_LABELS[k]}</button>)}
          </div>
        </div>
      )}
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
