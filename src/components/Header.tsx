import { useState } from 'react';
import { sfx, useStore } from '../store';
import { storage } from '../lib/util';
import { IconShield, IconSound, IconSun } from './Icons';

type Theme = 'light' | 'dark';
export function applyTheme(t: Theme | null) {
  if (t) document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

export function Header({ onInfo }: { onInfo: () => void }) {
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
    <header className="top">
      <div className="wrap">
        <a className="logo" href="#" aria-label="Jepret Booth"><span className="dot" /><span>jepret<b>.</b></span></a>
        <div className="top-actions">
          <button className="btn sm soft" onClick={toggleSound} aria-pressed={sound} title={sound ? 'Suara: nyala (M)' : 'Suara: mati (M)'}><IconSound on={sound} /></button>
          <button className="btn sm soft" onClick={toggleTheme} title="Ganti tema"><IconSun /></button>
          <button className="btn sm soft txt" onClick={onInfo}><IconShield /><span>Privasi &amp; Tips</span></button>
        </div>
      </div>
    </header>
  );
}
