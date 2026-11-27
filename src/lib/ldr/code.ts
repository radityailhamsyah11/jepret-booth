/** Room codes (kept apart from room.ts so the landing page doesn't load Supabase). */
const ALPHA = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const randomId = (n = 10) => [...crypto.getRandomValues(new Uint8Array(n))].map(x => ALPHA[x % ALPHA.length]).join('');
export const newRoomCode = () => randomId(10);
export const isRoomCode = (s: string | null): s is string => !!s && /^[A-Za-z0-9]{6,16}$/.test(s);
