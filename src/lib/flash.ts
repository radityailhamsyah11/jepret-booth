/**
 * Flash for the shot:
 *  - rear phone cameras that expose a torch: turn the LED on around the capture
 *  - everything else (front cameras, webcams): a full-screen bright "screen flash" lights the face,
 *    like the iPhone front flash. The capture happens while the screen is white.
 */
import { wait } from './util';

const torchCapable = (track: MediaStreamTrack | undefined) =>
  !!track && typeof track.getCapabilities === 'function' && !!(track.getCapabilities() as { torch?: boolean }).torch;

let overlay: HTMLDivElement | null = null;
function screen(on: boolean) {
  if (on) {
    overlay ??= Object.assign(document.createElement('div'), { className: 'screen-flash', ariaHidden: 'true' });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay?.classList.add('on'));
  } else if (overlay) {
    overlay.classList.remove('on');
    const o = overlay; setTimeout(() => o.remove(), 250);
  }
}

/** Runs `capture` with the flash lit; the light comes up ~350 ms early so the camera can expose for it. */
export async function withFlash<T>(stream: MediaStream | null, capture: () => T | Promise<T>): Promise<T> {
  const track = stream?.getVideoTracks()[0];
  if (torchCapable(track)) {
    try {
      await track!.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });
      await wait(350);
      return await capture();
    } finally {
      track!.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] }).catch(() => {});
    }
  }
  screen(true);
  try { await wait(380); return await capture(); }
  finally { setTimeout(() => screen(false), 90); }
}
