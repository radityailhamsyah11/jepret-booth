import { useEffect, useRef, useState } from 'react';
import { getTemplate, GROUPS } from '../lib/templates';
import { enterBooth, useStore } from '../store';

const nameOf = (id: string) => GROUPS.find(g => g.id === id)?.name ?? id;

/** Access-code dialog for locked template categories. Open it with patch({ unlockFor: templateId | '' }). */
export function UnlockDialog() {
  const unlockFor = useStore(s => s.unlockFor);
  const unlocked = useStore(s => s.unlocked);
  const ref = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (unlockFor !== null && !d.open) { setCode(''); setErr(null); d.showModal(); }
    if (unlockFor === null && d.open) d.close();
  }, [unlockFor]);

  const close = () => useStore.getState().patch({ unlockFor: null });
  const target = unlockFor ? getTemplate(unlockFor) : null;
  const group = target ? GROUPS.find(g => g.id === target.group) : null;
  const lockedGroups = GROUPS.filter(g => g.lock);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = useStore.getState().submitCode(code);
    if (r.ids.length) { useStore.getState().showToast(`Frame ${r.ids.map(nameOf).join(' & ')} kebuka ✨`); return; }
    setErr(r.expired ? 'Kode ini udah kedaluwarsa. Minta kode baru ke panitia ya.' : 'Kodenya belum cocok. Cek lagi huruf & angkanya.');
    setShake(x => x + 1);
  };

  return (
    <dialog ref={ref} className="unlock-dlg" onClose={close} onCancel={close}>
      <span className="unlock-ic" aria-hidden="true">🔒</span>
      <h3>{group ? <>Frame <em>{group.name}</em></> : 'Punya kode akses?'}</h3>
      <p className="unlock-lead">
        {group ? <>Template <b>{target!.name}</b> khusus buat yang punya kode. Masukin kodenya buat buka semua frame {group.name}.</> : 'Beberapa kategori frame khusus acara atau tim. Masukin kode dari panitia buat membukanya.'}
      </p>
      <form onSubmit={submit}>
        <input key={shake} className={'text-in unlock-in' + (err ? ' bad' : '')} value={code} autoFocus autoComplete="off" autoCapitalize="characters" spellCheck={false}
          placeholder="Contoh: KAWANRUPA-1234" aria-label="Kode akses" onChange={e => { setCode(e.target.value); setErr(null); }} />
        {err && <p className="unlock-err" role="alert">{err}</p>}
        <div className="unlock-actions">
          <button type="button" className="btn soft" onClick={close}>Nanti aja</button>
          <button type="submit" className="btn primary" disabled={code.trim().length < 4}>Buka frame →</button>
        </div>
      </form>
      {lockedGroups.length > 0 && (
        <ul className="unlock-list" aria-label="Status kategori">
          {lockedGroups.map(g => (
            <li key={g.id}>
              <span>{g.name}<b className={'lock-state' + (unlocked.includes(g.id) ? ' open' : '')}>{unlocked.includes(g.id) ? 'Terbuka' : 'Terkunci'}</b></span>
              {unlocked.includes(g.id) && <button className="linkish" onClick={() => useStore.getState().relockGroup(g.id)}>Kunci lagi</button>}
            </li>
          ))}
        </ul>
      )}
      <p className="unlock-note">Kode diingat di perangkat ini, jadi cukup sekali masukin.</p>
    </dialog>
  );
}

/**
 * Event links / QR codes: `?kode=XXXX` unlocks on load, drops the code from the address bar
 * (so it isn't shared by accident) and opens the booth on the unlocked category.
 */
export function useCodeFromUrl() {
  useEffect(() => {
    const url = new URL(location.href), code = url.searchParams.get('kode');
    if (!code) return;
    url.searchParams.delete('kode');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    const r = useStore.getState().submitCode(code);
    const st = useStore.getState();
    if (r.ids.length) { st.showToast(`Frame ${r.ids.map(nameOf).join(' & ')} kebuka ✨`); enterBooth({ step: 1 }); }
    else st.showToast(r.expired ? 'Kode di link ini udah kedaluwarsa.' : 'Kode di link ini nggak valid.');
  }, []);
}
