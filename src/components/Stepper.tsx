import { filledCount, slotCount, useStore, type Step } from '../store';

const STEPS: { n: Step; title: string; sub?: string }[] = [
  { n: 1, title: 'Jepret' },
  { n: 2, title: 'Desain', sub: 'Filter, frame, stiker' },
  { n: 3, title: 'Simpan', sub: 'PNG · GIF · Video' },
];

export function Stepper() {
  const step = useStore(s => s.step);
  const filled = useStore(filledCount);
  const total = useStore(slotCount);
  const goStep = useStore(s => s.goStep);
  const locked = useStore(s => s.ldrLocked);

  return (
    <nav className="stepper" aria-label="Langkah">
      {STEPS.map(({ n, title, sub }) => (
        <button key={n} aria-current={n === step ? 'step' : undefined} className={n < step ? 'done' : undefined} disabled={(n > 1 && filled === 0) || (locked && n !== 3)} onClick={() => goStep(n)}>
          <span className="n">{n}</span>
          <span><strong>{title}</strong><small>{sub ?? `${filled}/${total} foto`}</small></span>
        </button>
      ))}
    </nav>
  );
}
