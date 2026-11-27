/** ruparupa logos + palette shared by the ruparupa and ruparupa Team packs. */
import { drawLogo, logo, whiteOn, type Logo } from './_kit';
import newUrl from './assets/ruparupa-logo-new.png';
import svgUrl from './assets/ruparupa-logo.svg';

/** from the official logo SVG */
export const OR = '#ff5715', BL = '#008edd';
export const OR_L = '#ff7a3d', BL_D = '#0067b0', BL_L = '#e7f4fd', GOLD = '#ffc727', CREAM = '#fff7f1', INK = '#1f2933';

/** new logo with "rumahnya rumah" (colour, transparent) */
export const L_NEW = logo(newUrl);
/** new logo, white with an orange face, for orange/blue backgrounds */
export const L_NEW_WHITE = logo(newUrl, whiteOn(OR));
/** wordmark only (no tagline) */
export const L_MARK = logo(svgUrl);
export const L_MARK_WHITE = logo(svgUrl, whiteOn(OR));
export const L_MARK_WHITE_BLUE = logo(svgUrl, whiteOn(BL));

export { drawLogo, type Logo };
