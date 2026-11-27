import { useEffect, useRef } from 'react';
import { CaptureStep } from './components/CaptureStep';
import { DesignStep } from './components/DesignStep';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Busy, Features, HowTo, InfoDialog, Marquee, Toast } from './components/Overlays';
import { SaveStep } from './components/SaveStep';
import { Stepper } from './components/Stepper';
import { storage } from './lib/util';
import { enterBooth, useStore } from './store';
import { WelcomeSnack } from './components/Tour';
import { UnlockDialog, useCodeFromUrl } from './components/UnlockDialog';

export default function App() {
  const step = useStore(s => s.step);
  const view = useStore(s => s.view);
  const infoRef = useRef<HTMLDialogElement>(null);
  useCodeFromUrl();

  // browser Back/Forward move between the landing page and the booth
  useEffect(() => {
    const onPop = () => useStore.getState().patch({ view: history.state?.jbBooth ? 'booth' : 'landing' });
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
            <HowTo />
            <Features />
          </main>
          <WelcomeSnack onStart={() => enterBooth({ step: 1 })} />
          <footer>
            <div className="wrap">
              <div className="big" aria-hidden="true">jepret.</div>
              <span>jepret. · photobooth online</span>
              <span>Semua proses terjadi di perangkatmu. Nggak ada foto yang diupload.</span>
            </div>
          </footer>
        </>
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
