import { LOGO_GEOMETRY as G } from './logoGeometry';

export const LOGO_PATH = G.pathFull;
export const LOGO_PATH_LEFT = G.pathLeft;
export const LOGO_PATH_RIGHT = G.pathRight;
export const LOGO_VIEWBOX = `0 0 ${G.viewBox[0]} ${G.viewBox[1]}`;

type Props = React.SVGProps<SVGSVGElement> & {
  /** 'full' draws the closed loop; 'split' draws the two lobes as separate paths (white / spectrum). */
  variant?: 'full' | 'split';
  strokeWidth?: number;
  idPrefix?: string;
};

/** The loop centreline fitted to the artwork. Reusable by any section (Process, progress beam, favicon). */
export function LogoPath({ variant = 'split', strokeWidth = 18, idPrefix = 'lp', ...rest }: Props) {
  const gid = `${idPrefix}-spectrum`;
  return (
    <svg viewBox={LOGO_VIEWBOX} fill="none" aria-hidden="true" {...rest}>
      <defs>
        <linearGradient id={gid} x1="906" y1="0" x2="1830" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF3B5C" />
          <stop offset=".22" stopColor="#FF9A3C" />
          <stop offset=".42" stopColor="#FFD93C" />
          <stop offset=".6" stopColor="#3CD98A" />
          <stop offset=".8" stopColor="#3CA9FF" />
          <stop offset="1" stopColor="#7B5CFF" />
        </linearGradient>
      </defs>
      {variant === 'full' ? (
        <path d={G.pathFull} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
      ) : (
        <>
          <path d={G.pathLeft} stroke="#F5F5F7" strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d={G.pathRight} stroke={`url(#${gid})`} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
