/** Small line icons drawn on a 24 grid with a 1.6 stroke, so they sit with the mono labels. */
const paths: Record<string, string> = {
  about: 'M12 3.5l2.2 5.3 5.3 2.2-5.3 2.2L12 18.5l-2.2-5.3L4.5 11l5.3-2.2z',
  services: 'M12 3.5l8.5 4.5L12 12.5 3.5 8zM3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5',
  process: 'M12 4l8 14H4zM1.5 13.5h6M16 11l6.5-3M16.6 13l6.4 1M16 15.3l6 4',
  projects: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  skills: 'M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15',
  contact: 'M21 3.5L3.5 10.6l7 2.9 2.9 7zM10.5 13.5L21 3.5',
  web: 'M3.5 5.5h17v13h-17zM3.5 9h17M6.5 7.25h.01M9 7.25h.01',
  app: 'M7.5 2.5h9a1.5 1.5 0 011.5 1.5v16a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 20V4a1.5 1.5 0 011.5-1.5zM10.5 18.5h3',
  ai: 'M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M5.3 18.7l2.8-2.8M15.9 8.1l2.8-2.8M12 9a3 3 0 110 6 3 3 0 010-6z',
  motion: 'M4 12c2.5-6 5.5-6 8 0s5.5 6 8 0M4 6.5h3M17 17.5h3',
  arrow: 'M7 17L17 7M9 7h8v8',
  down: 'M12 5v14M6 13l6 6 6-6',
  up: 'M12 19V5M6 11l6-6 6 6',
  db: 'M12 3.5c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6.5v11c0 1.7 3.6 3 8 3s8-1.3 8-3v-11M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  api: 'M8 7l-5 5 5 5M16 7l5 5-5 5M10 12h.01M14 12h.01',
  hook: 'M9 7a3 3 0 116 0c0 1.7-1.3 2.6-2.3 3.6L9 14.5M6.5 17.5a3 3 0 105.2-2M17.5 17.5a3 3 0 10-2.6-4.5H9',
  mail: 'M3.5 6h17v12h-17zM3.5 6.5l8.5 6.5 8.5-6.5',
  globe: 'M12 3.5a8.5 8.5 0 110 17 8.5 8.5 0 010-17zM3.5 12h17M12 3.5c2.3 2.3 3.4 5.2 3.4 8.5s-1.1 6.2-3.4 8.5c-2.3-2.3-3.4-5.2-3.4-8.5S9.7 5.8 12 3.5z',
  cicd: 'M4 12a8 8 0 0113.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 01-13.7 5.6L4 15.5M4 20v-4.5h4.5',
  net: 'M12 4.5v5M12 9.5l-6 5M12 9.5l6 5M10 2.5h4v4h-4zM3.5 14.5h4v4h-4zM16.5 14.5h4v4h-4z',
  train: 'M4 19.5l4.5-6 4 3 7.5-10M15.5 6.5H20V11',
  infer: 'M3.5 12h5M15.5 12h5M8.5 7.5h7v9h-7zM12 7.5V4.5M12 19.5v-3',
  check: 'M12 3.5l7.5 3v5.5c0 4.5-3.2 7.6-7.5 8.5-4.3-.9-7.5-4-7.5-8.5V6.5zM8.5 12l2.5 2.5 4.5-5',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  sensor: 'M12 13.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM8.5 8.5a5 5 0 000 7M15.5 8.5a5 5 0 010 7M5.6 5.6a9 9 0 000 12.8M18.4 5.6a9 9 0 010 12.8',
  eye: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12zM12 9a3 3 0 110 6 3 3 0 010-6z',
  // the top navigation's set: plain, recognisable objects
  'nav-about': 'M12 11.5a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM4.75 20c.9-3.7 3.7-5.75 7.25-5.75S18.35 16.3 19.25 20',
  'nav-services': 'M3.75 8.25h16.5v11H3.75zM8.75 8.25V5.5a1 1 0 011-1h4.5a1 1 0 011 1v2.75M3.75 13h16.5M10.5 13v1.75h3V13',
  'nav-process': 'M12 3.75a8.25 8.25 0 110 16.5 8.25 8.25 0 010-16.5zM12 7.5V12l3 1.75M12 3.75v1.5M20.25 12h-1.5M12 20.25v-1.5M3.75 12h1.5',
  'nav-projects': 'M3.75 7a1.25 1.25 0 011.25-1.25h4.5l2 2.25h7.5a1.25 1.25 0 011.25 1.25v8.5A1.25 1.25 0 0119 19H5a1.25 1.25 0 01-1.25-1.25z',
  'nav-skills': 'M8.25 7.75L4 12l4.25 4.25M15.75 7.75L20 12l-4.25 4.25M13.25 5.5l-2.5 13',
  'nav-contact': 'M20.5 3.5l-6 17-3.25-7.25L4 10zM20.5 3.5L11.25 13.25',
  replay: 'M4 12a8 8 0 108-8 8 8 0 00-5.7 2.3L4 8.5M4 4v4.5h4.5',
};
export type IconName = keyof typeof paths;
export function Icon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={`icon ${className ?? ''}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={paths[name] ?? paths.about} />
    </svg>
  );
}
