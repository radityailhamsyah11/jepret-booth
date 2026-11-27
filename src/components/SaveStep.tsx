import { useEffect, useState } from 'react';
import { hasClips, makeGif, makeLiveVideo, makePng, makeVideo, videoSupport } from '../lib/exporters';
import { download, fileStamp } from '../lib/util';
import { designOf, useStore } from '../store';
import { SAVE_TOUR, Tour } from './Tour';
import { IconDownload, IconGif, IconShare, IconVideo } from './Icons';

export function SaveStep() {
  const locked = useStore(s => s.ldrLocked);
  const { patch, showToast, goStep, restart } = useStore.getState();
  const [png, setPng] = useState<{ blob: Blob; url: string } | null>(null);
  const [live, setLive] = useState<{ blob: Blob; url: string; ext: string } | null>(null);
  const [view, setView] = useState<'photo' | 'live'>('photo');
  const canLive = hasClips(designOf(useStore.getState()));
  useEffect(() => () => { if (live) URL.revokeObjectURL(live.url); }, [live]);

  // the strip is rendered once when this step opens; going back to edit re-mounts it
  useEffect(() => {
    let url = '', alive = true;
    patch({ busy: 'Mencetak strip…' });
    makePng(designOf(useStore.getState()))
      .then(blob => { if (!alive) return; url = URL.createObjectURL(blob); setPng({ blob, url }); })
      .catch(() => showToast('Gagal mencetak strip. Coba lagi ya.'))
      .finally(() => patch({ busy: null }));
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const name = (ext: string) => `jepret-${fileStamp()}.${ext}`;

  const share = async () => {
    if (!png) return;
    const file = new File([png.blob], name('png'), { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Jepret Booth', text: 'Strip foto dari Jepret Booth 📸' }); } catch { /* user cancelled */ }
    } else { download(png.blob, file.name); showToast('Share langsung nggak didukung di browser ini, jadi langsung di-download ya.'); }
  };

  const gif = async () => {
    patch({ busy: 'Bikin GIF…' });
    try { download(await makeGif(designOf(useStore.getState())), name('gif')); showToast('GIF tersimpan 🎉'); }
    catch (e) { console.error(e); showToast('Gagal bikin GIF. Coba lagi ya.'); }
    finally { patch({ busy: null }); }
  };

  const video = async () => {
    const mime = videoSupport();
    if (!mime) { showToast('Browser ini belum bisa rekam video. Pakai PNG / GIF ya.'); return; }
    patch({ busy: 'Merekam video 5 detik…' });
    try {
      const { blob, ext } = await makeVideo(designOf(useStore.getState()), mime);
      download(blob, name(ext));
      showToast(ext === 'webm' ? 'Video tersimpan (WebM). Buat IG/TikTok di HP biasanya perlu MP4, coba Safari / Chrome terbaru.' : 'Video tersimpan 🎬');
    } catch (e) { console.error(e); showToast('Gagal merekam video.'); }
    finally { patch({ busy: null }); }
  };

  const liveVideo = async () => {
    if (live) { download(live.blob, name(live.ext)); return; }
    const mime = videoSupport();
    if (!mime) { showToast('Browser ini belum bisa rekam video. Pakai PNG / GIF ya.'); return; }
    patch({ busy: 'Bikin video live strip…' });
    try {
      const { blob, ext } = await makeLiveVideo(designOf(useStore.getState()), mime);
      setLive({ blob, url: URL.createObjectURL(blob), ext }); setView('live');
      download(blob, name(ext));
      showToast(ext === 'webm' ? 'Video tersimpan (WebM). Buat IG/TikTok di HP biasanya perlu MP4, coba Safari / Chrome terbaru.' : 'Video live strip tersimpan 🎬');
    } catch (e) { console.error(e); showToast('Gagal bikin video live strip.'); }
    finally { patch({ busy: null }); }
  };

  const startOver = () => { if (confirm('Mulai strip baru? Foto yang sekarang bakal dihapus.')) restart(); };

  return (
    <div className="view active">
      {png && <Tour id="save" steps={SAVE_TOUR} delay={400} />}
      <div className="save">
        <div className="result">
          {live && (
            <div className="seg result-toggle">
              <button aria-pressed={view === 'photo'} onClick={() => setView('photo')}>Foto</button>
              <button aria-pressed={view === 'live'} onClick={() => setView('live')}>Live</button>
            </div>
          )}
          {view === 'live' && live
            ? <video src={live.url} autoPlay loop muted playsInline controls />
            : png && <img src={png.url} alt="Strip foto kamu" />}
        </div>
        <div className="outs">
          <button className="out primary" disabled={!png} onClick={() => png && download(png.blob, name('png'))}>
            <span className="ic"><IconDownload /></span><span><strong>Download PNG</strong><small>Resolusi tinggi, siap cetak</small></span>
          </button>
          <button className="out" onClick={gif}><span className="ic"><IconGif /></span><span><strong>GIF animasi</strong><small>Foto gonta-ganti, cocok buat chat</small></span></button>
          <button className="out" disabled={!canLive} onClick={liveVideo}>
            <span className="ic"><IconVideo /></span>
            <span><strong>Video live strip</strong><small>{canLive ? 'Rekaman tiap jepretan, diputar di dalam frame' : 'Cuma buat foto dari kamera (bukan upload)'}</small></span>
          </button>
          <button className="out" onClick={video}><span className="ic"><IconVideo /></span><span><strong>Video "cetak" 5 detik</strong><small>9:16, strip keluar dari mesin</small></span></button>
          <button className="out" disabled={!png} onClick={share}><span className="ic"><IconShare /></span><span><strong>Share</strong><small>WhatsApp, IG, dan app lain</small></span></button>
          <p className="note">iPhone / browser dalam app (IG, TikTok)? Tekan lama gambar di kiri lalu pilih <b>Simpan ke Foto</b>.</p>
          <div className="nextbar">
            {locked ? <span className="ldr-locked-note">🔒 Desain sesi LDR dipilih host</span> : <button className="btn" onClick={() => goStep(2)}>← Edit lagi</button>}
            <button className="btn soft" onClick={startOver}>Mulai baru</button>
          </div>
        </div>
      </div>
    </div>
  );
}
