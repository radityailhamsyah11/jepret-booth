import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export type Facing = 'user' | 'environment';
export interface CamDevice { id: string; label: string }
export interface StartOpts { deviceId?: string | null; facing: Facing }

/** Rear-facing by label: phone back cameras and iPhone Continuity Camera on a Mac. */
export const looksRear = (label: string) => /iphone|back|rear|belakang|environment|continuity/i.test(label);

export interface CameraEvents {
  /** a camera was plugged in while the page is open (USB webcam, capture card, iPhone) */
  onNewDevice?: (d: CamDevice) => void;
  /** the open camera disappeared (unplugged, iPhone moved away) */
  onLost?: (d: CamDevice | null) => void;
}

/**
 * Owns the getUserMedia stream for a <video>. Lists every camera (laptop webcam, iPhone via
 * Continuity Camera, USB cams) so the UI can switch between them. Stops on unmount.
 */
export function useCamera(videoRef: RefObject<HTMLVideoElement | null>, onError: (msg: string) => void, events: CameraEvents = {}) {
  const eventsRef = useRef(events); eventsRef.current = events;
  const knownIds = useRef<Set<string> | null>(null);
  const [live, setLive] = useState(false);
  const [devices, setDevices] = useState<CamDevice[]>([]);
  const [current, setCurrent] = useState<CamDevice | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const list = all.filter(d => d.kind === 'videoinput').map((d, i) => ({ id: d.deviceId, label: d.label || `Kamera ${i + 1}` }));
      setDevices(list);
      // ids are empty before camera permission; only compare once we have real ids
      const ids = list.map(d => d.id).filter(Boolean);
      if (ids.length) {
        if (knownIds.current) { const fresh = list.find(d => d.id && !knownIds.current!.has(d.id)); if (fresh) eventsRef.current.onNewDevice?.(fresh); }
        knownIds.current = new Set(ids);
      }
    } catch { /* not supported */ }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
  }, [videoRef]);

  const start = useCallback(async ({ deviceId, facing }: StartOpts) => {
    if (!navigator.mediaDevices?.getUserMedia) { onError('Browser ini nggak support kamera. Coba Upload ya.'); return null; }
    stop();
    const size = { width: { ideal: 1920 }, height: { ideal: 1440 } };
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId }, ...size } : { facingMode: facing, ...size },
          audio: false,
        });
      } catch (e) {
        // a remembered camera that is no longer plugged in: fall back to the default one
        const n = (e as DOMException).name;
        if (!deviceId || (n !== 'OverconstrainedError' && n !== 'NotFoundError')) throw e;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, ...size }, audio: false });
      }
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) { v.srcObject = stream; await v.play().catch(() => {}); }
      const track = stream.getVideoTracks()[0];
      const cur = { id: track.getSettings().deviceId ?? '', label: track.label || 'Kamera' };
      track.addEventListener('ended', () => {
        if (streamRef.current !== stream) return; // replaced on purpose
        stop(); eventsRef.current.onLost?.(cur);
      });
      setCurrent(cur); setLive(true);
      void refreshDevices(); // labels are only available after permission
      return cur;
    } catch (e) {
      console.warn(e);
      const name = (e as DOMException).name;
      onError(name === 'NotAllowedError' ? 'Izin kamera ditolak. Aktifkan di pengaturan browser, atau pakai Upload.'
        : name === 'OverconstrainedError' || name === 'NotFoundError' ? 'Kamera itu nggak ketemu. Coba pilih kamera lain.'
        : name === 'NotReadableError' ? 'Kamera lagi dipakai app lain (Zoom/FaceTime?). Tutup dulu ya.'
        : 'Kamera nggak bisa dibuka. Coba Upload ya.');
      return null;
    }
  }, [stop, videoRef, onError, refreshDevices]);

  useEffect(() => {
    void refreshDevices();
    const md = navigator.mediaDevices;
    md?.addEventListener?.('devicechange', refreshDevices);
    return () => { md?.removeEventListener?.('devicechange', refreshDevices); stop(); };
  }, [refreshDevices, stop]);

  return { live, start, stop, streamRef, devices, current };
}
