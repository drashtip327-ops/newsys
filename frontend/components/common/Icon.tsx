import type { CSSProperties } from 'react';
const paths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  history: 'M3 11a9 9 0 1 1 2.6 7 M3 4v7h7 M12 7v5l3 2',
  settings: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  eyeOff: 'M3 3l18 18 M10 5a12 12 0 0 1 12 7 16 16 0 0 1-3 4 M6 6a17 17 0 0 0-4 6s3 7 10 7a11 11 0 0 0 5-1 M10 10a3 3 0 0 0 4 4',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  logout: 'M9 4H4v16h5 M10 12h11 M17 8l4 4-4 4',
  search: 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0 M15 15l6 6',
  filter: 'M4 6h16 M7 12h10 M10 18h4',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
  plus: 'M12 5v14 M5 12h14',
  check: 'M5 12l4 4L19 6',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2',
  close: 'M6 6l12 12 M6 18L18 6',
  reset: 'M3 10a9 9 0 1 1 2 8 M3 4v6h6',
  chevron: 'M9 5l7 7-7 7',
  document: 'M14 3H5v18h14V8z M14 3v5h5 M8 12h8 M8 16h6',
} as const;
export type IconName = keyof typeof paths;
export default function Icon({ name, size = 18, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>;
}
