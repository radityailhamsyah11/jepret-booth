export interface Frame { name: string; bg?: string; ink: string; grad?: string[]; pattern?: 'gingham' | 'dots' | 'stripes' | 'hearts' | 'stars' | 'film' | 'kraft' | 'graph'; pc?: string }
export interface FontDef { css: (px: number) => string; size: number; upper: boolean; track: number }

/** Classic grid layouts. Retro templates live in templates.ts. */
export interface Layout { name: string; cols: number; rows: number; cw: number; ch: number; pad: number; gap: number; top: number; foot: number }
export const LAYOUTS = {
  strip4:   { name: 'Strip 4',  cols: 1, rows: 4, cw: 520, ch: 390, pad: 36, gap: 16, top: 36, foot: 170 },
  strip3:   { name: 'Strip 3',  cols: 1, rows: 3, cw: 520, ch: 390, pad: 36, gap: 16, top: 36, foot: 170 },
  strip2:   { name: 'Strip 2',  cols: 1, rows: 2, cw: 520, ch: 390, pad: 36, gap: 16, top: 36, foot: 170 },
  grid4:    { name: 'Empat Potong', cols: 2, rows: 2, cw: 420, ch: 420, pad: 36, gap: 16, top: 36, foot: 170 },
  polaroid: { name: 'Polaroid', cols: 1, rows: 1, cw: 600, ch: 600, pad: 40, gap: 0,  top: 40, foot: 210 },
} satisfies Record<string, Layout>;
export type ClassicId = keyof typeof LAYOUTS;

/** Most distinct photos any template asks for. Capture always works in these slots. */
export const MAX_PHOTOS = 4;

export const FILTERS = {
  natural: { name: 'Natural', css: 'saturate(1.05) contrast(1.03)' },
  pop:     { name: 'Pop',     css: 'saturate(1.45) contrast(1.12)' },
  film:    { name: 'Film',    css: 'sepia(.32) contrast(1.06) saturate(.9) brightness(1.02)' },
  sepia:   { name: 'Sepia',   css: 'grayscale(1) sepia(.75) contrast(1.15)' },
  mono:    { name: 'Mono',    css: 'grayscale(1) contrast(1.25)' },
  noir:    { name: 'Noir',    css: 'grayscale(1) contrast(1.6) brightness(.9)' },
  warm:    { name: 'Warm',    css: 'sepia(.18) saturate(1.2) brightness(1.03)' },
  cool:    { name: 'Cool',    css: 'hue-rotate(-12deg) saturate(.9) brightness(1.04)' },
  faded:   { name: 'Faded',   css: 'contrast(.82) brightness(1.1) saturate(.72)' },
  dream:   { name: 'Dreamy',  css: 'saturate(1.2) brightness(1.1) contrast(.9) hue-rotate(-6deg)' },
  y2k:     { name: 'Y2K',     css: 'saturate(1.6) hue-rotate(12deg) contrast(1.1)' },
  sketch:  { name: 'Sketsa',  css: 'grayscale(1) contrast(1.7) brightness(1.2)' },
  ink:     { name: 'Tinta',   css: 'grayscale(1) contrast(3.2) brightness(1.15)' },
};
export type FilterId = keyof typeof FILTERS;

export const FRAMES = {
  cream:   { name: 'Cream',   bg: '#f3ead8', ink: '#2a211b' },
  white:   { name: 'Putih',   bg: '#fbfaf7', ink: '#1d1916' },
  ink:     { name: 'Hitam',   bg: '#151211', ink: '#f3ead8' },
  cherry:  { name: 'Cherry',  bg: '#7a1222', ink: '#fbe8d0' },
  tomato:  { name: 'Tomat',   bg: '#e2452b', ink: '#fff3df' },
  mustard: { name: 'Mustard', bg: '#f2b51d', ink: '#2a1d08' },
  cobalt:  { name: 'Kobalt',  bg: '#2c4bd6', ink: '#fff3df' },
  blush:   { name: 'Blush',   bg: '#f6c9cf', ink: '#5a1f2b' },
  sage:    { name: 'Sage',    bg: '#c8d5b9', ink: '#26331f' },
  sky:     { name: 'Sky',     bg: '#bcd7ee', ink: '#1b2f45' },
  lilac:   { name: 'Lilac',   bg: '#d8c8f0', ink: '#33225a' },
  mint:    { name: 'Mint',    bg: '#bfe8d4', ink: '#1d4733' },
  gingham: { name: 'Gingham', bg: '#fdf6f6', ink: '#7a1e2c', pattern: 'gingham', pc: 'rgba(214,72,92,.30)' },
  dots:    { name: 'Polka',   bg: '#1e2a4a', ink: '#fdf0c8', pattern: 'dots',    pc: 'rgba(253,240,200,.20)' },
  stripes: { name: 'Garis',   bg: '#fff4e2', ink: '#2d4a6b', pattern: 'stripes', pc: 'rgba(70,120,170,.20)' },
  hearts:  { name: 'Hati',    bg: '#ffd9e2', ink: '#8a1d3b', pattern: 'hearts',  pc: 'rgba(200,40,90,.22)' },
  stars:   { name: 'Bintang', bg: '#0f1730', ink: '#ffe9a8', pattern: 'stars',   pc: 'rgba(255,233,168,.6)' },
  sunset:  { name: 'Sunset',  grad: ['#ffb36b', '#ff6b81', '#8e5bd6'], ink: '#fff6ec' },
  ocean:   { name: 'Ocean',   grad: ['#9be7e0', '#4aa3df', '#2b3f8f'], ink: '#f1fbff' },
  film:    { name: 'Negatif', bg: '#1a1613', ink: '#f0a35e', pattern: 'film',    pc: '#f3ead8' },
  kraft:   { name: 'Kraft',   bg: '#c9a77c', ink: '#3a2a18', pattern: 'kraft',   pc: 'rgba(80,50,20,.10)' },
  graph:   { name: 'Grid',    bg: '#f8f6ef', ink: '#1f3b5b', pattern: 'graph',   pc: 'rgba(60,120,180,.20)' },
} satisfies Record<string, Frame>;
export type FrameId = keyof typeof FRAMES | 'custom';

export const FONTS = {
  serif: { css: (px: number) => `italic 600 ${px}px Fraunces, Georgia, serif`, size: 58, upper: false, track: 0 },
  retro: { css: (px: number) => `400 ${px}px Shrikhand, Georgia, serif`, size: 56, upper: false, track: 0 },
  chunky:{ css: (px: number) => `800 ${px}px "Bricolage Grotesque", sans-serif`, size: 60, upper: false, track: -0.03 },
  hand:  { css: (px: number) => `700 ${px}px Caveat, cursive`, size: 70, upper: false, track: 0 },
  mono:  { css: (px: number) => `400 ${px}px "Special Elite", monospace`, size: 40, upper: true, track: 0.12 },
} satisfies Record<string, FontDef>;
export type FontId = keyof typeof FONTS;
export const FONT_LABELS: Record<FontId, string> = { serif: 'Serif', retro: 'Retro', chunky: 'Tebal', hand: 'Tulisan', mono: 'Mesin tik' };

export const SHAPES = {
  rect:    'Kotak',
  rounded: 'Rounded',
  oval:    'Oval',
  circle:  'Bulat',
  arch:    'Arch',
  heart:   'Hati',
  scallop: 'Awan',
  stamp:   'Prangko',
  ticket:  'Tiket',
  blob:    'Die-cut',
} as const;
export type ShapeId = keyof typeof SHAPES;

export const EMOJI = ['💖', '✨', '🫶', '⭐', '🌸', '🎀', '🦋', '🍓', '🌈', '🔥', '😎', '🥹', '😜', '👑', '💋', '🐱', '🐶', '🧸', '🍒', '☁️', '🌙', '🎉', '📸', '💌', '🎂', '🎁', '🎈', '🪩'];
export const LABELS = ['besties ✦', 'core memory', 'HBD!', 'xoxo', 'LDR tapi deket', 'us ♡', 'squad', 'ootd', 'weekend mood', 'sayang', 'no scroll', 'main character'];
export const LABEL_COLORS: [string, string][] = [['#e2452b', '#fff7ea'], ['#241a12', '#f6ead2'], ['#f2b51d', '#2a1d08'], ['#2c4bd6', '#fff7ea'], ['#f29bb5', '#5a1f2b'], ['#7cc6a4', '#123222']];
export const POSES = ['Senyum natural 🙂', 'Peace ✌️', 'Muka kaget 😮', 'Heart hands 🫶', 'Pura-pura serius 🧐', 'Lirik ke samping 👀', 'Ketawa lepas 😆', 'Cium pipi 😘', 'Pose candid 📸', 'Jari love 🤏', 'Muka jelek 🤪', 'Pose idol ✨'];
export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
export const ACCENT = '#e2452b';
