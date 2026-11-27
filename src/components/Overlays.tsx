import { forwardRef, useEffect, useState } from 'react';
import { GROUPS, TEMPLATES } from '../lib/templates';
import { setTracking, trackingEnabled } from '../lib/track';
import { enterBooth, useStore } from '../store';

export function Toast() {
  const toast = useStore(s => s.toast);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  return <div className={'toast' + (on ? ' on' : '')} role="status" aria-live="polite">{toast?.msg}</div>;
}

export function Busy() {
  const busy = useStore(s => s.busy);
  return <div className={'busy' + (busy ? ' on' : '')}><div><span className="spin" /><span>{busy}</span></div></div>;
}

export const InfoDialog = forwardRef<HTMLDialogElement>(function InfoDialog(_, ref) {
  return (
    <dialog ref={ref}>
      <h3>Privasi &amp; tips</h3>
      <ul>
        <li><b>Fotomu tetap di perangkatmu.</b> Kamera, upload, filter, dan export semuanya jalan di browser. Di mode LDR, video & foto dikirim langsung antar perangkat peserta, bukan ke server.</li>
        <li><b>Statistik anonim:</b> kami nyatet klik anonim (misalnya tombol download atau tur dipakai) buat memperbaiki web ini. Tanpa foto, nama, atau isi teks. <TrackingToggle /></li>
        <li><b>Izin kamera:</b> pilih "Izinkan" waktu browser minta. Kalau ditolak, buka pengaturan situs lalu aktifkan kamera, atau pakai Upload.</li>
        <li><b>Atur foto:</b> di langkah Desain, tap satu foto di preview lalu geser buat atur posisi dan pakai slider buat zoom. Scroll mouse juga bisa buat zoom.</li>
        <li><b>Simpan di iPhone / in-app browser:</b> tekan lama gambar hasil lalu pilih Simpan ke Foto.</li>
        <li><b>Shortcut:</b> <kbd>Spasi</kbd> jepret semua, <kbd>Enter</kbd> jepret 1, <kbd>Esc</kbd> batal countdown, <kbd>M</kbd> suara, <kbd>Delete</kbd> hapus stiker.</li>
      </ul>
      <form method="dialog"><button className="btn primary">Oke, paham</button></form>
    </dialog>
  );
});

const retroCount = TEMPLATES.filter(t => t.group === 'retro').length;
const groupNames = GROUPS.filter(g => TEMPLATES.some(t => t.group === g.id)).map(g => g.name);

export function Features() {
  const items = [
    ['01', 'Kamera iPhone', 'Flip cam muter semua kamera: webcam, iPhone lewat Continuity Camera, sampai kamera depan-belakang HP.'],
    ['02', `${TEMPLATES.length} template`, `${groupNames.join(', ')}. Kartu remi, tiket bioskop, koran, prangko, film 35mm, sampai strip klasik. Bentuk foto bisa diganti.`],
    ['03', 'Video live strip', 'Tiap jepretan direkam, terus diputar barengan di dalam frame. GIF-nya gaya flipbook.'],
    ['04', 'Privat, gratis', 'Semua proses di perangkatmu. Nggak ada upload, watermark, atau login.'],
  ];
  return (
    <>
      <h2 className="section-title" id="fitur">Lebih dari <em>sekadar</em> strip.</h2>
      <section className="features">
        {items.map(([n, h, p]) => <div className="feat" key={n}><span className="num">[{n}]</span><h3>{h}</h3><p>{p}</p></div>)}
      </section>
    </>
  );
}

/** Three-step "how to" right under the hero, so first-timers know where to click. */
export function HowTo() {
  const steps = [
    ['Pilih template', `Klik Masuk booth, terus buka tab Template di panel kanan. Ada ${TEMPLATES.length} pilihan: ${groupNames.join(', ')}.`, '🎞️'],
    ['Jepret atau upload', 'Nyalain kamera (webcam atau iPhone), pilih Beruntun atau Satu-satu, terus tekan tombol oranye. Bisa juga upload dari galeri.', '📸'],
    ['Desain & simpan', 'Atur filter, stiker, dan teks, lalu simpan jadi PNG, GIF flipbook, atau video live strip.', '✨'],
  ];
  return (
    <section className="howto" id="cara-pakai" aria-labelledby="howto-title">
      <div className="howto-head">
        <h2 className="section-title" id="howto-title">Cara pakai, <em>3 langkah.</em></h2>
        <button className="btn primary big" onClick={() => enterBooth({ step: 1 })}>Mulai sekarang →</button>
      </div>
      <ol className="howto-steps">
        {steps.map(([h, p, e], i) => (
          <li key={h}><span className="howto-n">{i + 1}</span><span className="howto-e" aria-hidden="true">{e}</span><h3>{h}</h3><p>{p}</p></li>
        ))}
      </ol>
    </section>
  );
}

export function Marquee() {
  const words = ['photobooth online', 'foto nggak pernah ke server', `${TEMPLATES.length} template`, `${retroCount} template retro`, 'video live strip', 'gif flipbook', 'kamera iphone', 'gratis tanpa watermark'];
  const row = [...words, ...words];
  return <div className="marquee" aria-hidden="true"><div>{row.concat(row).map((w, i) => <span key={i}>{w}</span>)}</div></div>;
}

function TrackingToggle() {
  const [on, setOn] = useState(trackingEnabled());
  return <button type="button" className="linkish" onClick={() => { setTracking(!on); setOn(!on); }}>{on ? 'Matikan statistik' : 'Nyalakan statistik'}</button>;
}
