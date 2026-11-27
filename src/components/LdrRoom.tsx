import { useEffect, useRef, useState } from 'react';
import { composeShot, grabFrame, toBitmap } from '../lib/ldr/compose';
import { LdrRoom, type Arrange, type Member, type Settings, type StartMsg } from '../lib/ldr/room';
import { FILTERS, MAX_PHOTOS, type FilterId } from '../lib/config';
import { getTemplate, photoAspect } from '../lib/templates';
import { TemplatePicker } from './TemplateGallery';
import { makeShot } from '../lib/render';
import { wait } from '../lib/util';
import { exitRoom, sfx, useStore } from '../store';

type Phase = 'camera' | 'lobby' | 'shooting' | 'collecting' | 'full' | 'error';

const inviteUrl = (code: string) => `${location.origin}${location.pathname}?room=${code}`;

function Tile({ stream, label, mirror, status, ready }: { stream: MediaStream | null; label: string; mirror?: boolean; status?: string; ready?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream; }, [stream]);
  return (
    <div className="ldr-tile">
      {stream ? <video ref={ref} autoPlay playsInline muted className={mirror ? 'mirror' : ''} /> : <div className="ldr-wait"><span className="spin" />{status ?? 'Menyambung…'}</div>}
      <span className="ldr-label">{label}</span>
      {stream && status && <span className="ldr-status">{status}</span>}
      {ready !== undefined && <span className={'ldr-ready' + (ready ? ' on' : '')}>{ready ? 'Siap ✓' : 'Belum siap'}</span>}
    </div>
  );
}

export function LdrRoomView() {
  const room = useStore(s => s.room)!;
  const showToast = useStore(s => s.showToast);
  const [phase, setPhase] = useState<Phase>('camera');
  const [err, setErr] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const initial = useStore.getState();
  const [settings, setSettings] = useState<Settings>({ shots: 4, timer: 3, layout: initial.layout, filter: initial.filter, arrange: 'alternate' });
  const [picking, setPicking] = useState(false);
  const [online, setOnline] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [count, setCount] = useState<number | null>(null);
  const [shotLabel, setShotLabel] = useState('');
  const [flash, setFlash] = useState(0);
  const [progress, setProgress] = useState('');

  const localRef = useRef<MediaStream | null>(null);
  const selfVideo = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<LdrRoom | null>(null);
  const photos = useRef(new Map<string, Map<number, Map<string, Blob>>>()); // session -> shot -> peer -> blob
  const busy = useRef(false);
  const membersRef = useRef<Member[]>([]); membersRef.current = members;

  // camera + room lifecycle
  useEffect(() => {
    let alive = true, r: LdrRoom | null = null;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'user' }, audio: false });
        if (!alive) { stream.getTracks().forEach(t => t.stop()); return; }
        localRef.current = stream;
        if (selfVideo.current) selfVideo.current.srcObject = stream;
        r = new LdrRoom(room.code, room.host ? 'host' : 'guest', room.cap, stream);
        roomRef.current = r;
        r.listen('members', m => setMembers(m))
          .listen('stream', (id, s) => setStreams(prev => { const n = { ...prev }; if (s) n[id] = s; else delete n[id]; return n; }))
          .listen('settings', s => setSettings(s)) // guests just follow the host's design
          .listen('status', s => setOnline(s))
          .listen('full', () => setPhase('full'))
          .listen('photo', (meta, blob) => store(meta.session, meta.shot, meta.from, blob))
          .listen('start', msg => void run(msg));
        await r.join();
        setPhase('lobby');
      } catch (e) {
        const n = (e as DOMException).name;
        setErr(n === 'NotAllowedError' ? 'Izin kamera ditolak. Aktifkan di pengaturan browser lalu coba lagi.' : 'Kamera atau koneksi room nggak bisa dibuka. Coba lagi ya.');
        setPhase('error');
      }
    })();
    return () => { alive = false; void r?.leave(); localRef.current?.getTracks().forEach(t => t.stop()); };
  }, [room.code]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (selfVideo.current && localRef.current && selfVideo.current.srcObject !== localRef.current) selfVideo.current.srcObject = localRef.current; });

  const store = (session: string, shot: number, from: string, blob: Blob) => {
    const s = photos.current.get(session) ?? new Map(); photos.current.set(session, s);
    const k = s.get(shot) ?? new Map(); s.set(shot, k); k.set(from, blob);
  };

  /** Everyone runs the same countdown when the host's start arrives. */
  const run = async (msg: StartMsg) => {
    const r = roomRef.current, v = selfVideo.current;
    if (!r || !v || busy.current) return;
    busy.current = true; setPhase('shooting');
    // the photo set is everyone in the room when the countdown starts (host first)
    const cast = membersRef.current.map(m => m.id);
    for (let k = 0; k < msg.shots; k++) {
      setShotLabel(`Foto ${k + 1}/${msg.shots}`);
      for (let n = msg.timer; n > 0; n--) { setCount(n); sfx.beep(n === 1 ? 990 : 660, n === 1 ? 0.16 : 0.08); await wait(1000); }
      setCount(null); setFlash(f => f + 1); sfx.shutter();
      const blob = await grabFrame(v, true);
      store(msg.session, k, r.id, blob);
      void r.sendPhoto(msg.session, k, blob);
      if (k < msg.shots - 1) await wait(900);
    }
    setPhase('collecting');
    await collect(msg, cast);
    busy.current = false;
  };

  /** Waits for every participant's photos (max 15 s), composes duet shots and opens the design step. */
  const collect = async (msg: StartMsg, cast: string[]) => {
    const deadline = Date.now() + 15000;
    const ready = () => { const s = photos.current.get(msg.session); let have = 0, need = msg.shots * cast.length; for (let k = 0; k < msg.shots; k++) for (const id of cast) if (s?.get(k)?.has(id)) have++; return { have, need }; };
    for (;;) {
      const { have, need } = ready();
      setProgress(`${have}/${need} foto diterima`);
      if (have >= need || Date.now() > deadline) break;
      await wait(250);
    }
    const s = photos.current.get(msg.session);
    const shots = Array(MAX_PHOTOS).fill(null);
    const tpl = getTemplate(msg.layout);
    if (msg.arrange === 'alternate') {
      // slot k = person (k mod n) from their shot floor(k / n): A host, K guest, Q host, J guest…
      const n = cast.length;
      for (let k = 0; k < Math.min(tpl.photos, MAX_PHOTOS); k++) {
        const blob = s?.get(Math.floor(k / n))?.get(cast[k % n]) ?? s?.get(Math.floor(k / n))?.get(cast[0]);
        if (blob) shots[k] = makeShot(await toBitmap(blob));
      }
    } else {
      for (let k = 0; k < msg.shots; k++) {
        const blobs = cast.map(id => s?.get(k)?.get(id)).filter((b): b is Blob => !!b);
        if (blobs.length) shots[k] = makeShot(await composeShot(blobs, photoAspect(tpl, k)));
      }
    }
    if (!shots.some(Boolean)) { showToast('Foto belum masuk. Coba jepret ulang ya.'); setPhase('lobby'); return; }
    if (ready().have < msg.shots * cast.length) showToast('Sebagian foto teman nggak sampai, strip disusun dari yang ada.');
    // one design per session: everyone gets the host's template + filter, and the result is locked
    const st = useStore.getState();
    st.patch({ shots, layout: getTemplate(msg.layout).id, filter: (msg.filter in FILTERS ? msg.filter : 'natural') as FilterId, shape: 'auto', stickers: [], selSlot: -1, selSticker: -1, ldrLocked: true });
    exitRoom('booth');
    useStore.getState().goStep(3);
  };

  const isHost = room.host;
  const cap = members.find(m => m.role === 'host')?.cap ?? room.cap; // the host decides the room size
  const guests = members.filter(m => !m.self);
  const connected = guests.filter(m => m.conn === 'connected').length;
  const others = guests.length;
  const readyCount = guests.filter(m => m.ready).length;
  const canStart = isHost && phase === 'lobby' && others > 0 && connected === others && readyCount === others;
  const me = members.find(m => m.self);
  const [ready, setReadyState] = useState(false);
  const toggleReady = async () => { const v = !ready; setReadyState(v); await roomRef.current?.setReady(v); sfx.beep(v ? 880 : 520, 0.06); };
  const url = inviteUrl(room.code);

  const copy = async () => { try { await navigator.clipboard.writeText(url); showToast('Link room disalin ✨'); } catch { showToast(url); } };
  const share = async () => {
    const text = `Yuk foto bareng di jepret. 📸 ${url}`;
    if (navigator.share) { try { await navigator.share({ title: 'jepret. LDR', text, url }); return; } catch { /* cancelled */ } }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };
  const leave = () => exitRoom('landing');
  const changeSettings = (s: Settings) => { setSettings(s); roomRef.current?.setSettings(s); };
  const people = Math.max(1, members.length);
  const tplPhotos = getTemplate(settings.layout).photos;
  /** alternate: each person shoots just enough to fill their share of the template's slots */
  const shotsPerPerson = settings.arrange === 'alternate' ? Math.max(1, Math.ceil(tplPhotos / people)) : settings.shots;
  const start = () => { const r = roomRef.current; if (!r) return; const msg = r.start(settings, shotsPerPerson); void run(msg); };

  // host: the booth's template/filter pickers drive the session design
  const storeLayout = useStore(s => s.layout), storeFilter = useStore(s => s.filter);
  useEffect(() => {
    if (!isHost) return;
    if (storeLayout === settings.layout && storeFilter === settings.filter) return;
    const photos = getTemplate(storeLayout).photos;
    changeSettings({ ...settings, layout: storeLayout, filter: storeFilter, shots: storeLayout !== settings.layout ? (photos >= 4 ? 4 : 3) : settings.shots });
    if (storeLayout !== settings.layout) setPicking(false);
  }, [storeLayout, storeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const label = (m: Member, i: number) => (m.self ? `Kamu${m.role === 'host' ? ' · Host' : ''}` : m.role === 'host' ? 'Host' : `Teman ${i}`);
  const statusOf = (m: Member) => (m.conn === 'connected' ? undefined : m.conn === 'failed' ? 'Gagal nyambung' : 'Menyambung…');

  if (phase === 'full') return (
    <div className="ldr-center"><h2>Room-nya udah penuh 😅</h2><p>Minta host bikin room baru, atau pilih jumlah orang yang lebih banyak.</p><button className="btn primary" onClick={leave}>Balik ke beranda</button></div>
  );
  if (phase === 'error') return (
    <div className="ldr-center"><h2>Belum bisa masuk room</h2><p>{err}</p><div className="row"><button className="btn primary" onClick={() => location.reload()}>Coba lagi</button><button className="btn" onClick={leave}>Balik</button></div></div>
  );

  let guestIdx = 0;
  return (
    <div className="ldr">
      <div className="ldr-head">
        <div>
          <span className="eyebrow"><b>LDR mode</b> · room</span>
          <h2 className="ldr-code">{room.code}</h2>
        </div>
        <span className={'ldr-online ' + online}>{online === 'online' ? `${members.length}/${cap} orang` : online === 'connecting' ? 'Menyambung ke room…' : 'Koneksi room putus'}</span>
      </div>

      <div className={'ldr-grid n' + Math.max(2, cap)}>
        {(members.length ? members : [{ id: 'self', self: true, role: isHost ? 'host' : 'guest', joinedAt: 0, ready: false, conn: 'self' } as Member]).map(m => {
          const i = m.self || m.role === 'host' ? 0 : ++guestIdx;
          return m.self
            ? <div className="ldr-tile" key={m.id}><video ref={selfVideo} autoPlay playsInline muted className="mirror" /><span className="ldr-label">{label(m, i)}</span>{m.role === 'guest' && <span className={'ldr-ready' + (m.ready ? ' on' : '')}>{m.ready ? 'Siap ✓' : 'Belum siap'}</span>}</div>
            : <Tile key={m.id} stream={streams[m.id] ?? null} label={label(m, i)} status={statusOf(m)} ready={m.role === 'guest' ? m.ready : undefined} />;
        })}
        {Array.from({ length: Math.max(0, cap - Math.max(1, members.length)) }, (_, i) => (
          <div className="ldr-tile empty" key={'e' + i}><div className="ldr-wait">Menunggu teman…</div></div>
        ))}
        {count !== null && <div className="count go ldr-count" key={'c' + shotLabel + count}>{count}</div>}
        {flash > 0 && <div className="flash go ldr-flash" key={'f' + flash} />}
        {phase === 'shooting' && <div className="pose on ldr-pose"><span className="rec" /><span>{shotLabel}</span></div>}
      </div>

      <aside className="ldr-side">
        {phase === 'collecting' ? (
          <div className="ldr-box"><span className="spin" /> <strong>Ngumpulin foto…</strong><p className="hint">{progress}. Foto dikirim langsung antar perangkat.</p></div>
        ) : (
          <>
            <div className="ldr-box">
              <strong>Ajak teman: kirim link ini</strong>
              <div className="ldr-link"><code>{url}</code></div>
              <div className="row"><button className="btn sm" onClick={copy}>Copy link</button><button className="btn sm" onClick={share}>Share ke WhatsApp</button></div>
            </div>
            <div className="ldr-box">
              {isHost ? (
                <>
                  <strong>Kamu host: pilih desain & atur sesi</strong>
                  <div className="lab">Template <span className="hint">· cuma host yang bisa pilih</span></div>
                  <button className="ldr-tpl" onClick={() => setPicking(p => !p)}><b>{getTemplate(settings.layout).name}</b><span>{picking ? 'Tutup' : 'Ganti'}</span></button>
                  {picking && <div className="ldr-picker"><TemplatePicker /></div>}
                  <div className="lab">Filter</div>
                  <div className="chips">{(Object.keys(FILTERS) as FilterId[]).map(k => <button key={k} className="chip" aria-pressed={settings.filter === k} onClick={() => useStore.getState().patch({ filter: k })}>{FILTERS[k].name}</button>)}</div>
                  <div className="lab">Tiap slot</div>
                  <div className="seg">{([['alternate', '1 orang (bergantian)'], ['together', 'Berdua / bareng']] as [Arrange, string][]).map(([k, l]) => <button key={k} aria-pressed={settings.arrange === k} onClick={() => changeSettings({ ...settings, arrange: k })}>{l}</button>)}</div>
                  {settings.arrange === 'alternate'
                    ? <p className="hint">{tplPhotos} slot dibagi {people} orang → tiap orang jepret {shotsPerPerson}×.{people === 1 ? ' (nunggu teman join)' : ''}</p>
                    : <><div className="lab">Jumlah foto</div>
                      <div className="seg">{([3, 4] as const).map(n => <button key={n} aria-pressed={settings.shots === n} onClick={() => changeSettings({ ...settings, shots: n })}>{n} foto</button>)}</div></>}
                  <div className="lab">Timer</div>
                  <div className="seg">{([3, 5] as const).map(n => <button key={n} aria-pressed={settings.timer === n} onClick={() => changeSettings({ ...settings, timer: n })}>{n}s</button>)}</div>
                  <button className={'btn primary big' + (canStart ? ' pulse' : '')} disabled={!canStart} onClick={start}>Mulai foto 📸</button>
                  <p className="hint">{others === 0 ? 'Tunggu teman join dulu.' : connected < others ? 'Lagi nyambungin video teman…' : readyCount < others ? `Nunggu teman siap (${readyCount}/${others})…` : 'Semua siap. Mulai!'}</p>
                </>
              ) : (
                <>
                  <strong>{ready ? 'Kamu siap! Nunggu host mulai…' : 'Udah siap foto?'}</strong>
                  <div className="ldr-chosen">
                    <span>Template <b>{getTemplate(settings.layout).name}</b></span>
                    <span>Filter <b>{FILTERS[settings.filter as FilterId]?.name ?? settings.filter}</b></span>
                    <span>{settings.arrange === 'alternate' ? `Bergantian · tiap orang jepret ${shotsPerPerson}×` : `Berdua per slot · ${settings.shots} foto`} · timer {settings.timer}s</span>
                  </div>
                  <p className="hint">Desain dipilih host biar satu sesi hasilnya sama. Foto baru bisa dimulai kalau semua teman udah tekan Siap.</p>
                  <button className={'btn big ' + (ready ? 'soft' : 'primary pulse')} disabled={!me || online !== 'online'} onClick={toggleReady}>{ready ? 'Batal siap' : 'Siap! ✋'}</button>
                </>
              )}
            </div>
          </>
        )}
        <p className="ldr-privacy">🔒 Video & foto dikirim langsung antar perangkat (WebRTC). Server cuma dipakai buat mempertemukan.</p>
        <button className="btn soft" onClick={leave}>Keluar room</button>
      </aside>
    </div>
  );
}
