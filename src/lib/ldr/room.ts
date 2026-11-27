/**
 * LDR room: Supabase Realtime for presence + signaling, a WebRTC mesh between every pair of
 * peers for live video, and a data channel per pair for control messages and photos.
 *
 *   presence  -> who is in the room (role, joinedAt, room size set by the host)
 *   broadcast -> 'signal' (offer / answer / ice, addressed to one peer) and 'ctl' (host settings, start)
 *   datachannel 'jb' -> photos as binary chunks (never through the server)
 */
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { randomId } from './code';
import { ICE_SERVERS, SUPABASE_KEY, SUPABASE_URL } from './config';

export type Role = 'host' | 'guest';
export interface Member { id: string; role: Role; joinedAt: number; cap?: number; ready: boolean; self: boolean; conn: 'self' | 'connecting' | 'connected' | 'failed' }
/** alternate: each template slot shows one person (A host, K guest, …); together: everyone shares each slot */
export type Arrange = 'alternate' | 'together';
export interface Settings { shots: 3 | 4; timer: 3 | 5; layout: string; filter: string; arrange: Arrange }
export interface StartMsg { session: string; shots: number; timer: number; layout: string; filter: string; arrange: Arrange }

type Signal = { from: string; to: string; kind: 'offer' | 'answer' | 'ice'; data: unknown };
type CtlBody = { type: 'settings'; settings: Settings } | { type: 'start'; start: StartMsg };
type Ctl = CtlBody & { from: string };

interface Peer { pc: RTCPeerConnection; dc: RTCDataChannel | null; pendingIce: RTCIceCandidateInit[]; remoteSet: boolean; stream: MediaStream | null; incoming: Incoming | null }
interface Incoming { meta: PhotoMeta; parts: ArrayBuffer[]; got: number }
export interface PhotoMeta { session: string; shot: number; from: string; size: number; type: string }

export interface RoomEvents {
  members: (m: Member[]) => void;
  stream: (peerId: string, s: MediaStream | null) => void;
  settings: (s: Settings) => void;
  start: (s: StartMsg) => void;
  photo: (meta: PhotoMeta, blob: Blob) => void;
  full: () => void;
  status: (s: 'connecting' | 'online' | 'offline') => void;
}

let client: SupabaseClient | null = null;
const sb = () => (client ??= createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { params: { eventsPerSecond: 40 } } }));

const CHUNK = 16 * 1024;
const rid = randomId;

export class LdrRoom {
  readonly id = rid(12);
  private ch: RealtimeChannel | null = null;
  private peers = new Map<string, Peer>();
  private members: Member[] = [];
  private joinedAt: number;
  private left = false;
  private settings: Settings = { shots: 4, timer: 3, layout: 'strip4', filter: 'natural', arrange: 'alternate' };
  private ready = false;
  private on: Partial<RoomEvents> = {};

  constructor(readonly code: string, readonly role: Role, readonly cap: number, private local: MediaStream) {
    this.joinedAt = role === 'host' ? 0 : Date.now();
  }

  listen<K extends keyof RoomEvents>(k: K, fn: RoomEvents[K]) { this.on[k] = fn; return this; }
  private emit<K extends keyof RoomEvents>(k: K, ...a: Parameters<RoomEvents[K]>) { (this.on[k] as ((...x: unknown[]) => void) | undefined)?.(...a); }

  async join() {
    this.emit('status', 'connecting');
    const ch = sb().channel(`jepret-room:${this.code}`, { config: { presence: { key: this.id }, broadcast: { self: false } } });
    this.ch = ch;
    ch.on('presence', { event: 'sync' }, () => this.onPresence())
      .on('broadcast', { event: 'signal' }, ({ payload }) => { const s = payload as Signal; if (s.to === this.id) void this.onSignal(s); })
      .on('broadcast', { event: 'ctl' }, ({ payload }) => this.onCtl(payload as Ctl));
    ch.subscribe(async status => {
      if (this.left) return;
      if (status === 'SUBSCRIBED') {
        await this.track();
        this.emit('status', 'online');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') this.emit('status', 'offline');
    });
  }

  /** presence payload: guests also announce whether they're ready to shoot */
  private track() {
    return this.ch?.track({ role: this.role, joinedAt: this.joinedAt, ready: this.role === 'host' || this.ready, ...(this.role === 'host' ? { cap: this.cap } : {}) });
  }
  async setReady(v: boolean) { this.ready = v; await this.track(); }

  async leave() {
    this.left = true;
    for (const id of [...this.peers.keys()]) this.dropPeer(id);
    if (this.ch) { await this.ch.untrack().catch(() => {}); await sb().removeChannel(this.ch).catch(() => {}); this.ch = null; }
  }

  /* ---------------- presence ---------------- */

  private onPresence() {
    if (!this.ch || this.left) return;
    const state = this.ch.presenceState<{ role: Role; joinedAt: number; cap?: number; ready?: boolean }>();
    const list: Member[] = Object.entries(state).map(([id, metas]) => {
      const m = metas[0];
      return { id, role: m.role, joinedAt: m.joinedAt, cap: m.cap, ready: m.role === 'host' || !!m.ready, self: id === this.id, conn: id === this.id ? 'self' : this.connOf(id) };
    }).sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));

    // room size comes from the host; the newest members beyond it must leave
    const cap = list.find(m => m.role === 'host')?.cap ?? this.cap;
    if (list.length > cap && list.findIndex(m => m.self) >= cap) { this.emit('full'); void this.leave(); return; }
    const inRoom = list.slice(0, cap);

    for (const id of [...this.peers.keys()]) if (!inRoom.some(m => m.id === id)) this.dropPeer(id);
    for (const m of inRoom) if (!m.self && !this.peers.has(m.id) && this.id < m.id) void this.call(m.id);
    this.members = inRoom;
    this.emit('members', this.snapshot());
  }

  private connOf(id: string): Member['conn'] {
    const p = this.peers.get(id); if (!p) return 'connecting';
    const s = p.pc.connectionState;
    return s === 'connected' ? 'connected' : s === 'failed' ? 'failed' : 'connecting';
  }
  private snapshot() { return this.members.map(m => ({ ...m, conn: m.self ? 'self' as const : this.connOf(m.id) })); }
  private refresh() { this.emit('members', this.snapshot()); }

  /* ---------------- WebRTC mesh ---------------- */

  private makePeer(id: string): Peer {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const p: Peer = { pc, dc: null, pendingIce: [], remoteSet: false, stream: null, incoming: null };
    this.local.getTracks().forEach(t => pc.addTrack(t, this.local));
    pc.onicecandidate = e => { if (e.candidate) this.signal(id, 'ice', e.candidate.toJSON()); };
    pc.ontrack = e => { p.stream = e.streams[0] ?? new MediaStream([e.track]); this.emit('stream', id, p.stream); };
    pc.onconnectionstatechange = () => this.refresh();
    pc.ondatachannel = e => this.attach(id, p, e.channel);
    this.peers.set(id, p);
    return p;
  }

  private async call(id: string) {
    const p = this.makePeer(id);
    this.attach(id, p, p.pc.createDataChannel('jb', { ordered: true }));
    const offer = await p.pc.createOffer();
    await p.pc.setLocalDescription(offer);
    this.signal(id, 'offer', p.pc.localDescription!.toJSON());
  }

  private async onSignal(s: Signal) {
    if (this.left) return;
    let p = this.peers.get(s.from);
    try {
      if (s.kind === 'offer') {
        if (!p) p = this.makePeer(s.from);
        await p.pc.setRemoteDescription(s.data as RTCSessionDescriptionInit);
        p.remoteSet = true;
        for (const c of p.pendingIce.splice(0)) await p.pc.addIceCandidate(c).catch(() => {});
        const ans = await p.pc.createAnswer();
        await p.pc.setLocalDescription(ans);
        this.signal(s.from, 'answer', p.pc.localDescription!.toJSON());
        // late joiner: send it the current settings
        if (this.role === 'host') this.sendCtl({ type: 'settings', settings: this.settings });
      } else if (s.kind === 'answer' && p) {
        if (p.pc.signalingState !== 'have-local-offer') return;
        await p.pc.setRemoteDescription(s.data as RTCSessionDescriptionInit);
        p.remoteSet = true;
        for (const c of p.pendingIce.splice(0)) await p.pc.addIceCandidate(c).catch(() => {});
        if (this.role === 'host') this.sendCtl({ type: 'settings', settings: this.settings });
      } else if (s.kind === 'ice') {
        if (!p) return;
        const c = s.data as RTCIceCandidateInit;
        if (p.remoteSet) await p.pc.addIceCandidate(c).catch(() => {}); else p.pendingIce.push(c);
      }
    } catch (e) { console.warn('[ldr] signal failed', e); }
    this.refresh();
  }

  private signal(to: string, kind: Signal['kind'], data: unknown) {
    void this.ch?.send({ type: 'broadcast', event: 'signal', payload: { from: this.id, to, kind, data } satisfies Signal });
  }

  private dropPeer(id: string) {
    const p = this.peers.get(id); if (!p) return;
    p.dc?.close(); p.pc.close(); this.peers.delete(id);
    this.emit('stream', id, null);
  }

  /* ---------------- control (host -> everyone) ---------------- */

  setSettings(s: Settings) {
    this.settings = s;
    if (this.role === 'host') this.sendCtl({ type: 'settings', settings: s });
  }
  /** shots = how many times everyone shoots (computed by the caller for 'alternate') */
  start(s: Settings, shots: number) {
    const msg: StartMsg = { session: rid(8), shots, timer: s.timer, layout: s.layout, filter: s.filter, arrange: s.arrange };
    this.sendCtl({ type: 'start', start: msg });
    return msg;
  }
  private sendCtl(c: CtlBody) {
    void this.ch?.send({ type: 'broadcast', event: 'ctl', payload: { ...c, from: this.id } });
  }
  private onCtl(c: Ctl) {
    const from = this.members.find(m => m.id === c.from);
    if (from?.role !== 'host') return; // only the host steers the room
    if (c.type === 'settings') { this.settings = c.settings; this.emit('settings', c.settings); }
    if (c.type === 'start') this.emit('start', c.start);
  }

  /* ---------------- photos over the data channel ---------------- */

  private attach(id: string, p: Peer, dc: RTCDataChannel) {
    p.dc = dc; dc.binaryType = 'arraybuffer';
    dc.onopen = () => this.refresh();
    dc.onclose = () => this.refresh();
    dc.onmessage = e => {
      if (typeof e.data === 'string') {
        const m = JSON.parse(e.data) as { t: 'photo'; meta: PhotoMeta };
        if (m.t === 'photo') p.incoming = { meta: { ...m.meta, from: id }, parts: [], got: 0 };
        return;
      }
      const inc = p.incoming; if (!inc) return;
      inc.parts.push(e.data as ArrayBuffer); inc.got += (e.data as ArrayBuffer).byteLength;
      if (inc.got >= inc.meta.size) { p.incoming = null; this.emit('photo', inc.meta, new Blob(inc.parts, { type: inc.meta.type })); }
    };
  }

  /** Sends one photo to every connected peer (chunked, with backpressure). */
  async sendPhoto(session: string, shot: number, blob: Blob) {
    const buf = await blob.arrayBuffer();
    const meta: PhotoMeta = { session, shot, from: this.id, size: buf.byteLength, type: blob.type || 'image/jpeg' };
    await Promise.all([...this.peers.values()].map(async p => {
      const dc = p.dc; if (!dc || dc.readyState !== 'open') return;
      dc.send(JSON.stringify({ t: 'photo', meta }));
      for (let o = 0; o < buf.byteLength; o += CHUNK) {
        while (dc.bufferedAmount > 1 << 20) await new Promise(r => setTimeout(r, 20));
        if (dc.readyState !== 'open') return;
        dc.send(buf.slice(o, o + CHUNK));
      }
    }));
  }
}
