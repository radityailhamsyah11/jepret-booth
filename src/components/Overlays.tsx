import { forwardRef, useEffect, useState } from 'react';
import { useStore } from '../store';

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
        <li><b>Fotomu tetap di perangkatmu.</b> Kamera, upload, filter, dan export semuanya jalan di browser. Nggak ada yang dikirim ke server.</li>
        <li><b>Izin kamera:</b> pilih "Izinkan" waktu browser minta. Kalau ditolak, buka pengaturan situs lalu aktifkan kamera, atau pakai Upload.</li>
        <li><b>Atur foto:</b> di langkah Desain, tap satu foto di preview lalu geser buat atur posisi dan pakai slider buat zoom. Scroll mouse juga bisa buat zoom.</li>
        <li><b>Simpan di iPhone / in-app browser:</b> tekan lama gambar hasil lalu pilih Simpan ke Foto.</li>
        <li><b>Shortcut:</b> <kbd>Spasi</kbd> jepret semua, <kbd>Enter</kbd> jepret 1, <kbd>Esc</kbd> batal countdown, <kbd>M</kbd> suara, <kbd>Delete</kbd> hapus stiker.</li>
      </ul>
      <form method="dialog"><button className="btn primary">Oke, paham</button></form>
    </dialog>
  );
});

export function Features() {
  const items = [
    ['01', 'Kamera iPhone', 'Flip cam muter semua kamera: webcam, iPhone lewat Continuity Camera, sampai kamera depan-belakang HP.'],
    ['02', '17 template retro', 'Kartu remi, tiket bioskop, koran, prangko, film 35mm, zine, sampai strip klasik. Bentuk foto bisa diganti.'],
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

export function Marquee() {
  const words = ['photobooth online', 'foto nggak pernah ke server', '17 template retro', 'video live strip', 'gif flipbook', 'kamera iphone', 'gratis tanpa watermark'];
  const row = [...words, ...words];
  return <div className="marquee" aria-hidden="true"><div>{row.concat(row).map((w, i) => <span key={i}>{w}</span>)}</div></div>;
}
