import { useMemo, useState } from 'react';
import { clearLocal, readEvents, setTracking, trackingEnabled, type TrackEvent } from '../lib/track';

/** Local analytics dashboard (?stats): what this browser recorded. For everyone's data, query Supabase. */

const FUNNEL: [string, string, (e: TrackEvent) => boolean][] = [
  ['Buka web', 'page_view', e => e.e === 'page_view'],
  ['Masuk booth', 'view=booth', e => e.e === 'view' && e.p?.view === 'booth'],
  ['Kamera nyala / upload', 'camera_on | upload', e => e.e === 'camera_on' || e.e === 'upload'],
  ['Jepret', 'shoot', e => e.e === 'shoot' && !e.p?.aborted],
  ['Sampai Simpan', 'step=3', e => e.e === 'step' && e.p?.n === 3],
  ['Download / share', 'download | share', e => e.e === 'download' || e.e === 'share'],
];

function countBy(evs: TrackEvent[], name: string, key: string) {
  const m = new Map<string, number>();
  for (const e of evs) if (e.e === name) { const k = String(e.p?.[key] ?? '—'); m.set(k, (m.get(k) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function Bars({ rows, unit = '' }: { rows: [string, number][]; unit?: string }) {
  const max = Math.max(1, ...rows.map(r => r[1]));
  if (!rows.length) return <p className="st-empty">Belum ada data.</p>;
  return (
    <ul className="st-bars">
      {rows.map(([k, v]) => (
        <li key={k}><span className="st-k">{k}</span><span className="st-bar"><i style={{ width: `${(v / max) * 100}%` }} /></span><b>{v}{unit}</b></li>
      ))}
    </ul>
  );
}

const SQL = `create table public.events (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  event text not null,
  props jsonb not null default '{}',
  session_id text, device_id text, path text, ua text
);
alter table public.events enable row level security;
-- anyone may add events, nobody can read them with the public key
create policy "insert events" on public.events for insert to anon with check (true);`;

const QUERIES = `-- jumlah pengguna (device) per hari
select date(ts) hari, count(distinct device_id) pengguna from events group by 1 order by 1 desc;
-- download per jenis
select props->>'type' jenis, count(*) from events where event='download' group by 1 order by 2 desc;
-- tur: berapa yang selesai vs lewati
select props->>'tour' tur, event, count(*) from events where event like 'tour_%' group by 1,2 order by 1,2;
-- template paling sering dipilih
select props->>'tpl' template, count(*) from events where event='template_select' group by 1 order by 2 desc limit 15;`;

export function StatsPage() {
  const [tick, setTick] = useState(0);
  const evs = useMemo(() => readEvents(), [tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const [on, setOn] = useState(trackingEnabled());
  const sessions = new Set(evs.map(e => e.s)).size;

  const funnel = FUNNEL.map(([label, , f]) => [label, new Set(evs.filter(f).map(e => e.s)).size] as [string, number]);
  const tourRows = ['capture', 'design', 'save'].map(t => {
    const n = (name: string) => evs.filter(e => e.e === name && e.p?.tour === t).length;
    return [t, n('tour_start'), n('tour_finish'), n('tour_skip')] as const;
  });
  const exportJson = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(evs, null, 2)], { type: 'application/json' }));
    a.download = `jepret-events-${Date.now()}.json`; a.click();
  };

  return (
    <main className="wrap stats">
      <header className="st-head">
        <div><span className="eyebrow"><b>[stats]</b> analitik lokal · browser ini aja</span><h1>Statistik jepret.</h1></div>
        <div className="st-actions">
          <a className="btn sm" href={location.pathname}>← Balik ke app</a>
          <button className="btn sm" onClick={exportJson}>Export JSON</button>
          <button className="btn sm soft" onClick={() => { if (confirm('Hapus semua event lokal?')) { clearLocal(); setTick(t => t + 1); } }}>Hapus data lokal</button>
          <button className="btn sm soft" onClick={() => { setTracking(!on); setOn(!on); }}>{on ? 'Matikan tracking' : 'Nyalakan tracking'}</button>
        </div>
      </header>

      <section className="st-kpis">
        <div><b>{evs.length}</b><span>event</span></div>
        <div><b>{sessions}</b><span>sesi</span></div>
        <div><b>{evs.filter(e => e.e === 'download').length}</b><span>download</span></div>
        <div><b>{evs.filter(e => e.e === 'ldr_start').length}</b><span>sesi LDR</span></div>
      </section>

      <div className="st-grid">
        <section className="st-card"><h2>Funnel (per sesi)</h2><Bars rows={funnel} /></section>
        <section className="st-card"><h2>Download per jenis</h2><Bars rows={countBy(evs, 'download', 'type')} /></section>
        <section className="st-card">
          <h2>Tur / coach mark</h2>
          <table className="st-table"><thead><tr><th>Tur</th><th>Mulai</th><th>Selesai</th><th>Lewati</th></tr></thead>
            <tbody>{tourRows.map(([t, s, f, k]) => <tr key={t}><td>{t}</td><td>{s}</td><td>{f}</td><td>{k}</td></tr>)}</tbody></table>
          <h3>Dilewati di langkah ke-</h3><Bars rows={countBy(evs, 'tour_skip', 'step')} />
          <h3>Snackbar sambutan</h3><Bars rows={countBy(evs, 'welcome_snack', 'action')} />
        </section>
        <section className="st-card"><h2>Template dipilih</h2><Bars rows={countBy(evs, 'template_select', 'tpl').slice(0, 12)} /></section>
        <section className="st-card"><h2>Filter dipilih</h2><Bars rows={countBy(evs, 'filter_select', 'filter')} /></section>
        <section className="st-card"><h2>LDR mode</h2><Bars rows={(['ldr_create', 'ldr_join', 'ldr_invite', 'ldr_ready', 'ldr_start', 'ldr_done'] as const).map(n => [n, evs.filter(e => e.e === n).length] as [string, number])} /></section>
      </div>

      <section className="st-card">
        <h2>50 event terakhir</h2>
        <div className="st-log">{evs.slice(-50).reverse().map((e, i) => (
          <div key={i}><time>{new Date(e.t).toLocaleString('id-ID')}</time><b>{e.e}</b><code>{e.p ? JSON.stringify(e.p) : ''}</code></div>
        ))}</div>
      </section>

      <section className="st-card">
        <h2>Data semua pengguna (Supabase)</h2>
        <p>Halaman ini cuma nampilin event dari browser ini. Event yang sama juga dikirim anonim ke tabel <code>events</code> di Supabase (tanpa foto atau data pribadi), kalau tabelnya udah dibuat. Jalankan SQL ini sekali di <b>Supabase → SQL Editor</b>:</p>
        <pre>{SQL}</pre>
        <p>Contoh query buat analisa (jalankan di SQL Editor):</p>
        <pre>{QUERIES}</pre>
      </section>
    </main>
  );
}
