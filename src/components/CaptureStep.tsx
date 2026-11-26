import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { looksRear, useCamera, type CamDevice } from '../hooks/useCamera';
import { startClip } from '../lib/clip';
import { FILTERS, POSES, type FilterId } from '../lib/config';
import { drawCover, makeShot } from '../lib/render';
import { getTemplate, photoAspect } from '../lib/templates';
import type { Shot } from '../lib/types';
import { wait } from '../lib/util';
import { activeShots, allFilled, filledCount, pickFiles, sfx, slotCount, useStore } from '../store';
import { IconUpload } from './Icons';
import { LivePreview, TemplateStrip } from './TemplateGallery';

const thumbCache = new WeakMap<HTMLCanvasElement, Map<string, string>>();
function thumbOf(shot: Shot, aspect: number, width = 240) {
  let m = thumbCache.get(shot.src);
  if (!m) { m = new Map(); thumbCache.set(shot.src, m); }
  const key = `${aspect.toFixed(3)}|${width}`;
  let url = m.get(key);
  if (!url) {
    const c = document.createElement('canvas'); c.width = width; c.height = Math.round(width * aspect);
    drawCover(c.getContext('2d')!, { ...shot, zoom: 1, ox: 0, oy: 0 }, c.width, c.height);
    url = c.toDataURL('image/jpeg', 0.75); m.set(key, url);
  }
  return url;
}

/** Short camera name for the UI ("FaceTime HD Camera (Built-in)" → "FaceTime HD Camera"). */
const camName = (label: string) => label.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Kamera';

export function CaptureStep() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const s = useStore();
  const showToast = s.showToast;
  const cam = useCamera(videoRef, showToast);
  const n = slotCount(s), filled = filledCount(s), shots = activeShots(s);
  const tpl = getTemplate(s.layout);

  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const abortRef = useRef(false);
  const [count, setCount] = useState<{ n: number; key: number } | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [pose, setPose] = useState<string | null>(null);
  const [hudShot, setHudShot] = useState(1);
  const [dragging, setDragging] = useState(false);
  /** single mode: the slot just shot, waiting for "Ulang" / "Lanjut" */
  const [review, setReview] = useState<number | null>(null);

  /** opens a camera and sets mirror to match it (selfie cams mirrored, rear / iPhone not) */
  const open = useCallback(async (deviceId: string | null) => {
    const cur = await cam.start({ deviceId, facing: useStore.getState().facing });
    if (cur) useStore.getState().patch({ deviceId: cur.id || null, mirror: !looksRear(cur.label) && useStore.getState().facing === 'user' });
  }, [cam.start]); // eslint-disable-line react-hooks/exhaustive-deps

  // another step asked us to open the camera (hero CTA, "Foto ulang")
  useEffect(() => {
    if (!s.autoStartCam) return;
    s.patch({ autoStartCam: false });
    void open(s.deviceId);
  }, [s.autoStartCam]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onVis = () => { if (document.hidden && !busyRef.current) cam.stop(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [cam.stop]); // eslint-disable-line react-hooks/exhaustive-deps

  const captureFrame = () => {
    const v = videoRef.current; if (!v?.videoWidth) return null;
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    const x = c.getContext('2d')!;
    if (useStore.getState().mirror) { x.translate(c.width, 0); x.scale(-1, 1); }
    x.drawImage(v, 0, 0, c.width, c.height);
    return c;
  };

  const countdown = async (sec: number) => {
    for (let k = sec; k > 0; k--) {
      if (abortRef.current) return false;
      setCount({ n: k, key: Date.now() });
      sfx.beep(k === 1 ? 990 : 660, k === 1 ? 0.16 : 0.08);
      await wait(1000);
    }
    setCount(null);
    return !abortRef.current;
  };

  /** all = every empty slot (or all slots when full); at = exactly this slot */
  const snap = useCallback(async (all: boolean, at?: number) => {
    if (busyRef.current || !cam.live) return;
    setReview(null);
    const st = useStore.getState(), total = slotCount(st), act = activeShots(st);
    const empties = act.map((x, i) => (x ? -1 : i)).filter(i => i >= 0);
    const targets = at != null ? [at]
      : empties.length ? (all ? empties : [act[st.target] ? empties[0] : st.target])
      : (all ? [...Array(total).keys()] : [st.target]);

    busyRef.current = true; abortRef.current = false; setBusy(true);
    const poses = [...POSES].sort(() => Math.random() - 0.5);
    let last = -1;
    for (let k = 0; k < targets.length; k++) {
      const i = targets[k];
      setPose(`Foto ${i + 1}/${total} · ${poses[k % poses.length]}`); setHudShot(i + 1);
      useStore.getState().patch({ target: i });
      // record the countdown so the live-strip video can play this shot
      const clip = startClip(cam.streamRef.current);
      const mirrored = useStore.getState().mirror;
      if (!(await countdown(useStore.getState().timer))) { clip?.cancel(); break; }
      const c = captureFrame(); if (!c) { clip?.cancel(); break; }
      setFlashKey(f => f + 1); sfx.shutter(); navigator.vibrate?.(30);
      const shot = makeShot(c);
      useStore.getState().setShot(i, shot); last = i;
      if (clip) {
        await wait(400); // a beat after the flash, so the clip ends on the pose
        const blob = await clip.stop();
        if (blob) useStore.getState().attachClip(i, shot.id, { url: URL.createObjectURL(blob), mirrored });
      }
      if (k < targets.length - 1) await wait(clip ? 500 : 900);
    }
    setPose(null); setCount(null); busyRef.current = false; setBusy(false);
    if (abortRef.current) { showToast('Countdown dibatalin.'); return; }
    if (useStore.getState().shootMode === 'single' && last >= 0) setReview(last);
    else if (allFilled(useStore.getState())) showToast('Strip lengkap! Lanjut desain yuk ✨');
  }, [cam.live]); // eslint-disable-line react-hooks/exhaustive-deps

  const shutter = () => (s.shootMode === 'burst' ? snap(true) : snap(false));
  const nextFromReview = () => {
    setReview(null);
    if (allFilled(useStore.getState())) showToast('Strip lengkap! Lanjut desain yuk ✨');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input, textarea, select') || document.querySelector('dialog[open]')) return;
      if (e.key === 'Escape' && busyRef.current) { abortRef.current = true; return; }
      if (!cam.live) return;
      if (e.code === 'Space') { e.preventDefault(); void (useStore.getState().shootMode === 'burst' ? snap(true) : snap(false)); }
      else if (e.key === 'Enter') { e.preventDefault(); void snap(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cam.live, snap]);

  const upload = async () => { await s.loadFiles(await pickFiles(true)); };
  const onDrop = async (e: DragEvent) => {
    e.preventDefault(); setDragging(false);
    const added = await s.loadFiles([...e.dataTransfer.files]);
    if (added && allFilled(useStore.getState())) showToast('Strip lengkap! Lanjut desain yuk ✨');
  };

  /** Flip: cycle through every camera (webcam → iPhone → …); phones without a list fall back to front/back. */
  const flip = async () => {
    if (cam.devices.length > 1) {
      const idx = cam.devices.findIndex(d => d.id === cam.current?.id);
      const next: CamDevice = cam.devices[(idx + 1) % cam.devices.length];
      if (cam.live) await open(next.id);
      else { s.patch({ deviceId: next.id }); showToast(`${camName(next.label)} dipilih`); }
      return;
    }
    const facing = s.facing === 'user' ? 'environment' : 'user';
    s.patch({ facing, deviceId: null, mirror: facing === 'user' });
    if (cam.live) await cam.start({ deviceId: null, facing });
    else showToast(`Kamera ${facing === 'user' ? 'depan' : 'belakang'} dipilih`);
  };

  const empties = n - filled;
  const shutterLbl = busy ? 'Lagi jepret…'
    : s.shootMode === 'single' ? (empties ? `Jepret foto ${Math.min(n, (shots[s.target] ? shots.findIndex(x => !x) : s.target) + 1)}` : `Foto ulang no. ${s.target + 1}`)
    : empties === 0 ? `Foto ulang semua (${n})` : empties === n ? `Jepret semua (${n})` : `Jepret sisa (${empties})`;
  const filters = useMemo(() => Object.keys(FILTERS) as FilterId[], []);
  const reviewShot = review != null ? shots[review] : null;

  return (
    <div className="view active">
      <TemplateStrip />
      <div className="capture">
        <div>
          <div
            className={['stage', s.mirror && 'mirror', cam.live && 'live', s.grid && 'show-grid', dragging && 'dragging'].filter(Boolean).join(' ')}
            onDragEnter={e => { e.preventDefault(); setDragging(true); }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={e => { e.preventDefault(); setDragging(false); }}
            onDrop={onDrop}
          >
            <video ref={videoRef} playsInline muted autoPlay style={{ filter: FILTERS[s.filter].css }} />
            <div className="grid-lines" />
            <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
            {!cam.live && (
              <div className="empty">
                <span className="eyebrow">booth no. 01 · siap</span>
                <h3>Siap masuk booth?</h3>
                <p>Nyalain kamera (webcam atau iPhone kamu), atau upload foto dari galeri. Bisa juga drag &amp; drop foto ke sini.</p>
                <div className="row">
                  <button className="btn primary" onClick={() => open(s.deviceId)}>Nyalain kamera</button>
                  <button className="btn ghost-light" onClick={upload}>Upload foto</button>
                </div>
              </div>
            )}
            {pose && <div className="pose on"><span className="rec" /><span>{pose}</span></div>}
            {count && <div className="count go" key={count.key}>{count.n}</div>}
            {flashKey > 0 && <div className="flash go" key={flashKey} />}
            {reviewShot && review != null && (
              <div className="review">
                <img src={thumbOf(reviewShot, photoAspect(tpl, review), 900)} alt={`Foto ${review + 1}`} />
                <div className="review-bar">
                  <span>Foto {review + 1} oke?</span>
                  <button className="btn sm ghost-light" onClick={() => snap(false, review)}>↺ Ulang</button>
                  <button className="btn sm primary" onClick={nextFromReview}>{allFilled(s) ? 'Selesai ✓' : 'Lanjut →'}</button>
                </div>
              </div>
            )}
            <div className="hud"><span>SHOT {hudShot}/{n}</span><span>{cam.current ? camName(cam.current.label).toUpperCase() : ''} · {FILTERS[s.filter].name.toUpperCase()}</span></div>
            <div className="drop-hint">Lepas buat tambah foto</div>
          </div>

          <div className="filters-row" aria-label="Filter">
            {filters.map(k => <button key={k} className="chip" aria-pressed={s.filter === k} onClick={() => s.patch({ filter: k })}>{FILTERS[k].name}</button>)}
          </div>

          <div className="controls">
            <div className="group">
              <div className="seg" aria-label="Mode jepret">
                <button aria-pressed={s.shootMode === 'burst'} onClick={() => s.patch({ shootMode: 'burst' })}>Beruntun</button>
                <button aria-pressed={s.shootMode === 'single'} onClick={() => s.patch({ shootMode: 'single' })}>Satu-satu</button>
              </div>
              <div className="seg" aria-label="Timer">
                {([3, 5, 10] as const).map(t => <button key={t} aria-pressed={s.timer === t} onClick={() => s.patch({ timer: t })}>{t}s</button>)}
              </div>
              <button className="btn sm soft" aria-pressed={s.mirror} onClick={() => s.patch({ mirror: !s.mirror })}>Mirror</button>
              <button className="btn sm soft" aria-pressed={s.grid} onClick={() => s.patch({ grid: !s.grid })}>Grid</button>
              <button className="btn sm soft" onClick={flip} title="Ganti kamera (webcam / iPhone / depan-belakang)">⟲ Flip cam</button>
            </div>
            <div className="shutter-wrap">
              <div className="lbl"><strong>{shutterLbl}</strong><span>{busy ? 'Esc buat batal' : cam.live ? 'Spasi / tap' : 'Nyalain kamera dulu'}</span></div>
              <button className="shutter" aria-label="Jepret" disabled={!cam.live || busy} onClick={shutter} />
              {s.shootMode === 'burst' && <button className="btn sm" disabled={!cam.live || busy} onClick={() => snap(false)}>Jepret 1</button>}
            </div>
          </div>
          {cam.devices.length > 1 && (
            <label className="cam-pick">
              <span className="eyebrow">Kamera</span>
              <select value={cam.current?.id ?? s.deviceId ?? ''} onChange={e => (cam.live ? open(e.target.value) : s.patch({ deviceId: e.target.value }))}>
                {cam.devices.map(d => <option key={d.id} value={d.id}>{camName(d.label)}</option>)}
              </select>
              <small>Pakai iPhone? Di Mac, dekatkan iPhone (Continuity Camera), nanti muncul di sini.</small>
            </label>
          )}
        </div>

        <aside className="rail">
          <LivePreview />
          <h4>Foto kamu <span>{filled}/{n} · {tpl.name}</span></h4>
          <div className={'slots' + (n === 1 ? ' one' : '')}>
            {shots.map((shot, i) => {
              const aspect = photoAspect(tpl, i);
              return (
                <button
                  key={i}
                  style={{ aspectRatio: `${1 / aspect}` }}
                  className={['slotbox', shot && 'filled', s.target === i && 'target'].filter(Boolean).join(' ')}
                  aria-label={shot ? `Foto ${i + 1}, tap untuk pilih` : `Slot ${i + 1} kosong`}
                  onClick={() => s.patch({ target: i })}
                >
                  {shot ? (
                    <>
                      <img src={thumbOf(shot, aspect)} alt="" />
                      <span className="num">{i + 1}</span>
                      <span className="x" role="button" title="Hapus" onClick={e => { e.stopPropagation(); s.setShot(i, null); }}>×</span>
                    </>
                  ) : i + 1}
                </button>
              );
            })}
          </div>
          <p className="hint">Tap slot buat milih yang mau difoto ulang atau diganti.</p>
          <div className="grow" />
          <button className="btn soft" onClick={upload}><IconUpload />Upload ke slot kosong</button>
          <button className="btn primary" disabled={filled === 0} onClick={() => s.goStep(2)}>
            {allFilled(s) || !filled ? 'Lanjut desain →' : `Lanjut desain (${filled}/${n}) →`}
          </button>
        </aside>
      </div>
    </div>
  );
}
