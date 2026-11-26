import { useEffect, useRef } from 'react';
import { CaptureStep } from './components/CaptureStep';
import { DesignStep } from './components/DesignStep';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Busy, Features, InfoDialog, Marquee, Toast } from './components/Overlays';
import { SaveStep } from './components/SaveStep';
import { Stepper } from './components/Stepper';
import { storage } from './lib/util';
import { useStore } from './store';

export default function App() {
  const step = useStore(s => s.step);
  const infoRef = useRef<HTMLDialogElement>(null);
  const boothRef = useRef<HTMLElement>(null);

  // keep the booth in view when the step changes
  // compare with the previous step (not a first-render flag): StrictMode runs effects twice on mount
  const prevStep = useRef(step);
  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    const el = boothRef.current; if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 0 || top > innerHeight * 0.5) el.scrollIntoView({ behavior: 'smooth' });
  }, [step]);

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

  return (
    <>
      <Header onInfo={() => infoRef.current?.showModal()} />
      <Marquee />
      <main className="wrap">
        <Hero />
        <section className="app" id="booth" ref={boothRef} aria-label="Photobooth">
          <Stepper />
          {step === 1 && <CaptureStep />}
          {step === 2 && <DesignStep />}
          {step === 3 && <SaveStep />}
        </section>
        <Features />
      </main>
      <footer>
        <div className="wrap">
          <div className="big" aria-hidden="true">jepret.</div>
          <span>jepret. · photobooth online</span>
          <span>Semua proses terjadi di perangkatmu. Nggak ada foto yang diupload.</span>
        </div>
      </footer>
      <InfoDialog ref={infoRef} />
      <Toast />
      <Busy />
    </>
  );
}
