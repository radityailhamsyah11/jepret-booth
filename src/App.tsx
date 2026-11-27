import { lazy, Suspense, useEffect, useRef } from 'react';
import { CaptureStep } from './components/CaptureStep';
import { DesignStep } from './components/DesignStep';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Busy, Features, HowTo, InfoDialog, Marquee, Toast } from './components/Overlays';
import { SaveStep } from './components/SaveStep';
import { Stepper } from './components/Stepper';
import { storage } from './lib/util';
import { enterBooth, useStore } from './store';
import { LdrPromo } from './components/LdrPromo';
import { isRoomCode } from './lib/ldr/code';
// the room (and Supabase) only loads when someone opens LDR mode
const LdrRoomView = lazy(() => import('./components/LdrRoom').then(m => ({ default: m.LdrRoomView })));
import { WelcomeSnack } from './components/Tour';
import { UnlockDialog, useCodeFromUrl } from './components/UnlockDialog';

export default function App() {
  const step = useStore(s => s.step);
  const view = useStore(s => s.view);
  const infoRef = useRef<HTMLDialogElement>(null);
  // invite links: ?room=CODE opens the room (as host only on the device that created it)
  useEffect(() => {
    const code = new URL(location.href).searchParams.get('room');
    if (!isRoomCode(code)) return;
    let cap = 0; try { cap = Number(sessionStorage.getItem(`jb-host-${code}`)) || 0; } catch { /* ignore */ }
    history.replaceState({ jbRoom: true }, '', location.href);
    useStore.getState().patch({ view: 'room', room: { code, host: cap > 0, cap: cap || 4 } });
  }, []);
  useCodeFromUrl();

  // browser Back/Forward move between the landing page and the booth
  useEffect(() => {
    const onPop = () => {
      const st = history.state as { jbBooth?: boolean; jbRoom?: boolean } | null;
      useStore.getState().patch({ view: st?.jbRoom && useStore.getState().room ? 'room' : st?.jbBooth ? 'booth' : 'landing' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // the booth is a full-screen app; the landing page scrolls normally
  useEffect(() => {
    document.documentElement.classList.toggle('in-booth', view === 'booth');
    window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input, textarea, select') || infoRef.current?.open) return;
      if (e.key.toLowerCase() === 'm' && !e.metaKey && !e.ctrlKey) {
        const on = !useStore.getState().sound;
        useStore.getState().patch({ sound: on }); storage.set('jb-sound', on ? '1' : '0');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const info = () => infoRef.current?.showModal();

  return (
    <>
      {view === 'landing' ? (
        <>
          <Header onInfo={info} />
          <Marquee />
          <main className="wrap">
            <Hero />
            <LdrPromo />
            <HowTo />
            <Features />
          </main>
          <WelcomeSnack onStart={() => enterBooth({ step: 1 })} />
          <footer>
            <div className="wrap">
              <div className="big" aria-hidden="true">jepret.</div>
              <span>jepret. · photobooth online</span>
              <span>Semua proses terjadi di perangkatmu. Mode LDR kirim foto langsung antar perangkat.</span>
            </div>
          </footer>
        </>
      ) : view === 'room' ? (
        <div className="booth-shell room-shell">
          <Header onInfo={info} booth />
          <main className="booth-main" aria-label="LDR room"><Suspense fallback={<div className="ldr-center"><span className="spin" /><p>Nyiapin room…</p></div>}><LdrRoomView /></Suspense></main>
        </div>
      ) : (
        <div className="booth-shell">
          <Header onInfo={info} booth><Stepper /></Header>
          <main className="booth-main" aria-label="Photobooth">
            {step === 1 && <CaptureStep />}
            {step === 2 && <DesignStep />}
            {step === 3 && <SaveStep />}
          </main>
        </div>
      )}
      <InfoDialog ref={infoRef} />
      <UnlockDialog />
      <Toast />
      <Busy />
    </>
  );
}
