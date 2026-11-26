import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export type Facing = 'user' | 'environment';
export interface CamDevice { id: string; label: string }
export interface StartOpts { deviceId?: string | null; facing: Facing }

/** Rear-facing by label: phone back cameras and iPhone Continuity Camera on a Mac. */
export const looksRear = (label: string) => /iphone|back|rear|belakang|environment|continuity/i.test(label);

/**
 * Owns the getUserMedia stream for a <video>. Lists every camera (laptop webcam, iPhone via
 * Continuity Camera, USB cams) so the UI can switch between them. Stops on unmount.
 */
export function useCamera(videoRef: RefObject<HTMLVideoElement | null>, onError: (msg: string) => void) {
  const [live, setLive] = useState(false);
  const [devices, setDevices] = useState<CamDevice[]>([]);
  const [current, setCurrent] = useState<CamDevice | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter(d => d.kind === 'videoinput').map((d, i) => ({ id: d.deviceId, label: d.label || `Kamera ${i + 1}` })));
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId }, ...size } : { facingMode: facing, ...size },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) { v.srcObject = stream; await v.play().catch(() => {}); }
      const track = stream.getVideoTracks()[0];
      const cur = { id: track.getSettings().deviceId ?? '', label: track.label || 'Kamera' };
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
