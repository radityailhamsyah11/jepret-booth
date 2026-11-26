import { useEffect, useRef } from 'react';
import { makeShot, renderStrip } from '../lib/render';
import { getTemplate } from '../lib/templates';
import type { Design, Shot } from '../lib/types';
import { fontsReady } from '../lib/util';
import { allFilled, pickFiles, useStore } from '../store';
import { IconCamera, IconUpload } from './Icons';

export const scrollToBooth = () => document.getElementById('booth')?.scrollIntoView({ behavior: 'smooth' });

const FEATURED = ['kartu', 'film35', 'birthday', 'memory', 'ticket', 'zine'];

/** Demo "photos" for the hero fan: soft colour fields with a sitter silhouette. */
let demo: Shot[] | null = null;
function demoShots() {
  if (demo) return demo;
  demo = [[16, 350], [205, 230], [40, 15], [160, 190]].map(([a, b], i) => {
    const c = document.createElement('canvas'); c.width = 600; c.height = 450; const x = c.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, 600, 450); g.addColorStop(0, `hsl(${a},60%,70%)`); g.addColorStop(1, `hsl(${b},45%,42%)`);
    x.fillStyle = g; x.fillRect(0, 0, 600, 450);
    x.fillStyle = 'rgba(25,16,12,.6)';
    const dx = [0, -70, 60, -30][i];
    for (const ox of [-80, 90]) {
      x.beginPath(); x.arc(300 + ox + dx, 190, 64, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.ellipse(300 + ox + dx, 470, 120, 150, 0, Math.PI, 0); x.fill();
    }
    return makeShot(c);
  });
  return demo;
}

function Card({ id, style }: { id: string; style: React.CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const t = getTemplate(id);
    const d: Design = { layout: id, shots: demoShots(), filter: t.filter ?? 'natural', grain: 0, frame: 'cream', customBg: '#fff', caption: 'jepret booth', font: 'retro', showDate: true, shape: 'auto', outline: false, stickers: [] };
    void fontsReady.then(() => ref.current && renderStrip(ref.current, 420 / Math.max(t.W, t.H), d));
  }, [id]);
  return <canvas ref={ref} className="fan-card" style={style} aria-hidden="true" />;
}

export function Hero() {
  const layout = useStore(s => s.layout);
  const setLayout = useStore(s => s.setLayout);

  const startCamera = () => { useStore.getState().patch({ step: 1, autoStartCam: true }); scrollToBooth(); };
  const upload = async () => {
    const st = useStore.getState();
    const added = await st.loadFiles(await pickFiles(true));
    if (!added) return;
    st.goStep(allFilled(useStore.getState()) ? 2 : 1);
    scrollToBooth();
  };

  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow"><b>[01]</b> photobooth online — semua fitur gratis</span>
        <h1 className="lettering">
          <span className="l1">JEPRET</span>
          <span className="l2"><em>bareng,</em> cetak</span>
          <span className="l3">detik ini.<i className="spark s1">✦</i><i className="spark s2">✦</i><i className="spark s3">✧</i></span>
        </h1>
        <p className="lead">Pakai webcam atau iPhone kamu, pilih template retro, terus simpan jadi <b>strip PNG</b>, <b>GIF flipbook</b>, atau <b>video live</b> dengan frame. Semua diproses di perangkatmu.</p>
        <div className="ctas">
          <button className="btn primary big" onClick={startCamera}><IconCamera />Masuk booth</button>
          <button className="btn big" onClick={upload}><IconUpload />Upload foto</button>
        </div>
        <div className="fmt">
          <span className="eyebrow"><b>[02]</b> template</span>
          {FEATURED.map(id => (
            <button key={id} className="chip" aria-pressed={layout === id} onClick={() => setLayout(id)}>{getTemplate(id).name}</button>
          ))}
        </div>
      </div>
      <div className="fan" aria-hidden="true">
        <Card id="birthday" style={{ ['--r' as string]: '-12deg', ['--x' as string]: '-48%', zIndex: 1 }} />
        <Card id="film35" style={{ ['--r' as string]: '9deg', ['--x' as string]: '46%', zIndex: 2 }} />
        <Card id="kartu" style={{ ['--r' as string]: '-2deg', ['--x' as string]: '0%', zIndex: 3 }} />
        <span className="stamp-badge">17<small>template</small></span>
      </div>
    </section>
  );
}
