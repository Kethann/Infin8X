import { LOGO_PATH_LEFT, LOGO_PATH_RIGHT, LOGO_VIEWBOX } from '../brand/LogoPath';
import { LOGO_GEOMETRY as G } from '../brand/logoGeometry';
import { Mark } from '../components/Mark';

/** /?debug: the fitted centreline drawn over the artwork, to verify alignment. */
export function DebugOverlay() {
  return (
    <main className="page debug">
      <h1>Logo path debug</h1>
      <p className="mono">viewBox {LOGO_VIEWBOX} · length {G.length}px · split u={G.split} · magenta = left lobe, cyan = right lobe, dots = 720 arc-length samples</p>
      <div className="debug__stage">
        <img src="/brand/infin8x-logo.png" alt="Infin8X logo artwork" width={1904} height={610} />
        <svg viewBox={LOGO_VIEWBOX} aria-hidden="true">
          <path d={LOGO_PATH_LEFT} fill="none" stroke="#ff00ff" strokeWidth="4" />
          <path d={LOGO_PATH_RIGHT} fill="none" stroke="#00ffff" strokeWidth="4" />
          {G.samples.filter((_, i) => i % 6 === 0).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" fill="#0f0" />)}
          <circle cx={G.cross[0]} cy={G.cross[1]} r="10" fill="none" stroke="#ff0" strokeWidth="3" />
        </svg>
      </div>
      <h2>Flat mark sizes</h2>
      <div className="debug__marks">{[16, 32, 48, 64, 128].map((s) => <div key={s}><Mark size={s * 3.12} /><span className="mono">{s}px tall</span></div>)}</div>
    </main>
  );
}
