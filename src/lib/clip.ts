/**
 * Records a short clip from the camera for each shot (countdown → snap), so the
 * "live strip" video can play every shot moving inside the frame.
 */
export interface Clip { url: string; mirrored: boolean }

const MIMES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
const clipMime = () => (window.MediaRecorder ? MIMES.find(t => MediaRecorder.isTypeSupported(t)) ?? null : null);

export interface ClipRecorder { stop: () => Promise<Blob | null>; cancel: () => void }

export function startClip(stream: MediaStream | null): ClipRecorder | null {
  const mime = clipMime();
  if (!stream || !mime) return null;
  let rec: MediaRecorder;
  try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 }); } catch { return null; }
  const chunks: Blob[] = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  // a clip is a bonus: if recording can't start, the photo still gets taken
  try { rec.start(250); } catch (e) { console.warn('clip recording unavailable', e); return null; }
  return {
    stop: () => new Promise(res => {
      if (rec.state === 'inactive') return res(chunks.length ? new Blob(chunks, { type: mime.split(';')[0] }) : null);
      rec.onstop = () => res(chunks.length ? new Blob(chunks, { type: mime.split(';')[0] }) : null);
      rec.stop();
    }),
    cancel: () => { rec.ondataavailable = null; if (rec.state !== 'inactive') rec.stop(); },
  };
}
