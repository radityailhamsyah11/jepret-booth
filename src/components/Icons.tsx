import type { ReactNode } from 'react';

const Svg = ({ children, sw = 2 }: { children: ReactNode; sw?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export const IconCamera = () => <Svg><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" /><circle cx="12" cy="13" r="3.5" /></Svg>;
export const IconUpload = () => <Svg><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></Svg>;
export const IconCheck = () => <Svg sw={2.5}><path d="m5 12 5 5L20 7" /></Svg>;
export const IconSound = ({ on }: { on: boolean }) => <Svg><path d="M11 5 6 9H3v6h3l5 4z" />{on && <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}</Svg>;
export const IconSun = () => <Svg><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>;
export const IconShield = () => <Svg><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>;
export const IconDownload = () => <Svg><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></Svg>;
export const IconGif = () => <Svg><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M8 12h2v2H8a2 2 0 0 1 0-4h2M13 10v4M16 14v-4h2M16 12h1.5" /></Svg>;
export const IconVideo = () => <Svg><rect x="2" y="6" width="14" height="12" rx="2" /><path d="m16 10 6-3v10l-6-3" /></Svg>;
export const IconShare = () => <Svg><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></Svg>;
