import { useState, type ReactNode } from 'react';
import { leaveBooth, sfx, useStore } from '../store';
import { restartTours } from './Tour';
import { storage } from '../lib/util';
import { IconShield, IconSound, IconSun } from './Icons';

type Theme = 'light' | 'dark';
export function applyTheme(t: Theme | null) {
  if (t) document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

/** `booth`: compact app bar — the logo goes back to the landing page and `children` (the stepper) sits in the middle. */
export function Header({ onInfo, booth, children }: { onInfo: () => void; booth?: boolean; children?: ReactNode }) {
  const sound = useStore(s => s.sound);
  const patch = useStore(s => s.patch);
  const [, force] = useState(0);

  const toggleSound = () => {
    const on = !sound; patch({ sound: on }); storage.set('jb-sound', on ? '1' : '0');
    if (on) setTimeout(() => sfx.beep(880, 0.06));
  };
  const toggleTheme = () => {
    const cur = (document.documentElement.dataset.theme as Theme | undefined) ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const next: Theme = cur === 'light' ? 'dark' : 'light';
    applyTheme(next); storage.set('jb-theme', next); force(x => x + 1);
  };

  return (
    <header className={'top' + (booth ? ' booth-bar' : '')}>
      <div className="wrap">
        {booth
          ? <button className="logo logo-btn" onClick={leaveBooth} aria-label="Keluar booth, balik ke beranda" title="Balik ke beranda"><span className="back">←</span><span>jepret<b>.</b></span></button>
          : <a className="logo" href="#" aria-label="Jepret Booth"><span className="dot" /><span>jepret<b>.</b></span></a>}
        {children}
        <div className="top-actions">
          {booth && <button className="btn sm soft txt" onClick={restartTours} title="Ulangi tur panduan"><b className="q" aria-hidden="true">?</b><span>Tur</span></button>}
          <button className="btn sm soft" onClick={toggleSound} aria-pressed={sound} title={sound ? 'Suara: nyala (M)' : 'Suara: mati (M)'}><IconSound on={sound} /></button>
          <button className="btn sm soft" onClick={toggleTheme} title="Ganti tema"><IconSun /></button>
          <button className="btn sm soft txt" onClick={onInfo}><IconShield /><span>Privasi &amp; Tips</span></button>
        </div>
      </div>
    </header>
  );
}
