export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** localStorage wrapper: storage can be blocked (private mode, in-app browsers), so never throw. */
export const storage = {
  get(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

export function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

const pad2 = (n: number) => String(n).padStart(2, '0');
export const fileStamp = () => { const d = new Date(); return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`; };
export const dateText = () => { const d = new Date(); return `${pad2(d.getDate())} · ${pad2(d.getMonth() + 1)} · ${d.getFullYear()}`; };

/** Canvas fonts (capped at 4s so a slow font CDN never blocks rendering). */
const fontsLoaded: Promise<unknown> = Promise.race([
  Promise.all(['italic 600 40px Fraunces', 'italic 500 40px Fraunces', '700 40px Caveat', '500 20px "DM Mono"', '700 30px "Space Grotesk"', '800 40px "Bricolage Grotesque"',
    '40px Shrikhand', '40px Bungee', '40px "Abril Fatface"', '40px "Great Vibes"', '40px "Special Elite"', '40px "Bagel Fat One"', '40px UnifrakturMaguntia', '900 40px Nunito', '800 40px Nunito'].map(f => document.fonts.load(f))).catch(() => {}),
  wait(4000),
]);

const assets: Promise<unknown>[] = [];
/** Images a template draws (brand logos): renders wait for them like they wait for fonts. */
export const registerAsset = (p: Promise<unknown>) => { assets.push(p.catch(() => {})); };
/** Resolves once fonts and every registered template asset are ready to draw. */
export const fontsReady = () => Promise.all([fontsLoaded, ...assets]);

export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const k = Math.min(1, 2200 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally { URL.revokeObjectURL(url); }
}
