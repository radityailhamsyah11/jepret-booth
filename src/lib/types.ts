import type { Clip } from './clip';
import type { FilterId, FontId, FrameId, ShapeId } from './config';

export interface Shot {
  id: number;
  src: HTMLCanvasElement;
  w: number; h: number;
  /** 1–3 */
  zoom: number;
  /** pan offset, -1..1 of the overflow on each axis */
  ox: number; oy: number;
  /** filtered-cell cache shared by every copy of this shot; keys include zoom/pan, so sharing is safe */
  cache: Map<string, HTMLCanvasElement>;
  /** camera recording of this shot's countdown, for the live-strip video (absent for uploads) */
  clip?: Clip;
}

export interface Sticker { type: 'emoji' | 'label'; t: string; x: number; y: number; s: number; r: number; c?: string; tc?: string }

export interface Design {
  /** template id (see templates.ts) */
  layout: string;
  /** always MAX_PHOTOS long */
  shots: (Shot | null)[];
  filter: FilterId; grain: number;
  /** frame colour/pattern, used by templates with usesFrame */
  frame: FrameId; customBg: string;
  caption: string; font: FontId; showDate: boolean;
  /** 'auto' = the template's own slot shapes */
  shape: ShapeId | 'auto';
  outline: boolean;
  stickers: Sticker[];
}

export interface Marks { selSlot: number; selSticker: number }
