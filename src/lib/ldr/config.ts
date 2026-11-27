/**
 * LDR Mode backend config. The URL and publishable key are meant to be public (they only allow
 * what the project's Realtime/RLS settings allow). Photos never go through Supabase: it only carries
 * room presence and WebRTC signaling; photos travel peer-to-peer over a WebRTC data channel.
 */
export const SUPABASE_URL = 'https://yplwcnujfokczgejkxzo.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_eP6c_ZV0C_5-AkNS_9zzeA_6KXf1Fcq';

/** STUN finds a direct path between devices. Add a TURN server here for strict networks. */
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

export const ROOM_SIZES = [2, 3, 4] as const;
export type RoomSize = (typeof ROOM_SIZES)[number];
