/**
 * Tiny product analytics (Mixpanel-style events), privacy first:
 *  - events are anonymous: a random device id + session id, the event name and a few props
 *    (template id, download type, tour step…). Never photos, names, or anything typed.
 *  - local sink: last 2000 events + per-event counters in localStorage (view at ?stats)
 *  - remote sink: batched inserts into the Supabase `events` table, if it exists (see README).
 *    Missing table / RLS just disables the remote sink for the session.
 *  - opt-out: setTracking(false) (button in Privasi & Tips).
 */
import { SUPABASE_KEY, SUPABASE_URL } from './ldr/config';
import { storage } from './util';

export interface TrackEvent { e: string; p?: Record<string, string | number | boolean>; t: number; s: string; u: string }

const LOG = 'jb-events', COUNTS = 'jb-event-counts', MAX = 2000;
const rand = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const userId = (() => { let u = storage.get('jb-uid'); if (!u) { u = rand(); storage.set('jb-uid', u); } return u; })();
const sessionId = (() => { try { let s = sessionStorage.getItem('jb-sid'); if (!s) { s = rand(); sessionStorage.setItem('jb-sid', s); } return s; } catch { return rand(); } })();

export const trackingEnabled = () => storage.get('jb-track') !== 'off' && navigator.doNotTrack !== '1';
export function setTracking(on: boolean) { storage.set('jb-track', on ? 'on' : 'off'); }

let queue: TrackEvent[] = [];
let remoteOk = true;

function readLog(): TrackEvent[] { try { return JSON.parse(storage.get(LOG) || '[]'); } catch { return []; } }
export function readCounts(): Record<string, number> { try { return JSON.parse(storage.get(COUNTS) || '{}'); } catch { return {}; } }
export const readEvents = readLog;
export function clearLocal() { storage.set(LOG, '[]'); storage.set(COUNTS, '{}'); }

export function track(e: string, p?: TrackEvent['p']) {
  if (!trackingEnabled()) return;
  const ev: TrackEvent = { e, p, t: Date.now(), s: sessionId, u: userId };
  const log = readLog(); log.push(ev); if (log.length > MAX) log.splice(0, log.length - MAX);
  storage.set(LOG, JSON.stringify(log));
  const c = readCounts(); c[e] = (c[e] || 0) + 1; storage.set(COUNTS, JSON.stringify(c));
  if (remoteOk) { queue.push(ev); if (queue.length >= 15) void flush(); }
  if (import.meta.env.DEV) console.debug('[track]', e, p ?? '');
}

async function flush(keepalive = false) {
  if (!remoteOk || !queue.length) return;
  const batch = queue; queue = [];
  const rows = batch.map(ev => ({ event: ev.e, props: ev.p ?? {}, ts: new Date(ev.t).toISOString(), session_id: ev.s, device_id: ev.u, path: location.pathname, ua: navigator.userAgent.slice(0, 160) }));
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST', keepalive,
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(rows),
    });
    if (!r.ok) remoteOk = false; // table missing or insert not allowed: stay local-only this session
  } catch { queue = batch.concat(queue).slice(-200); } // offline: retry later
}

if (typeof window !== 'undefined') {
  setInterval(() => void flush(), 10000);
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flush(true); });
  addEventListener('pagehide', () => void flush(true));
}
