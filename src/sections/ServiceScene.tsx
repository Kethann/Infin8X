import type { CSSProperties } from 'react';

/**
 * A small live scene per service: what the craft actually looks like while it is being made. Pure HTML/CSS,
 * decorative (aria-hidden), animated with transforms only, frozen in its final frame with reduced motion.
 */
export function ServiceScene({ kind }: { kind: 'web' | 'app' | 'ai' | 'motion' }) {
  return (
    <div className={`scene scene--${kind}`} aria-hidden="true">
      {kind === 'web' && (
        <div className="sc-browser">
          <div className="sc-browser__bar"><i /><i /><i /><span /></div>
          <div className="sc-browser__page">
            <span className="sc-nav"><b /><b /><b /><b /></span>
            <span className="sc-hero"><b className="sc-line sc-line--xl" /><b className="sc-line sc-line--l" /><b className="sc-btn" /></span>
            <span className="sc-visual"><i /></span>
            <span className="sc-cards"><b /><b /><b /></span>
          </div>
          <i className="sc-cursor" />
        </div>
      )}
      {kind === 'app' && (
        <div className="sc-dash">
          <span className="sc-dash__side"><b /><b /><b /><b /></span>
          <span className="sc-dash__main">
            <span className="sc-kpis"><b /><b /><b /></span>
            <span className="sc-bars">{[42, 64, 38, 80, 56, 92, 70].map((h, i) => <i key={i} style={{ '--h': h, '--i': i } as CSSProperties} />)}</span>
            <svg className="sc-spark" viewBox="0 0 200 40" preserveAspectRatio="none"><path d="M0 32 C20 30 30 18 50 20 S80 34 100 22 S140 6 160 12 S190 4 200 6" pathLength={1} /></svg>
          </span>
        </div>
      )}
      {kind === 'ai' && (
        <div className="sc-ai">
          <span className="sc-chat">
            <b className="sc-bubble sc-bubble--me" />
            <b className="sc-bubble sc-bubble--bot"><i /><i /><i /></b>
          </span>
          <svg className="sc-graph" viewBox="0 0 220 120">
            <path d="M30 60 C70 60 70 24 110 24 M30 60 C70 60 70 96 110 96 M110 24 C150 24 150 60 190 60 M110 96 C150 96 150 60 190 60" className="sc-graph__wire" />
            <path d="M30 60 C70 60 70 24 110 24 C150 24 150 60 190 60" className="sc-graph__pulse" pathLength={1} />
            <path d="M30 60 C70 60 70 96 110 96 C150 96 150 60 190 60" className="sc-graph__pulse sc-graph__pulse--b" pathLength={1} />
            {[[30, 60], [110, 24], [110, 96], [190, 60]].map(([x, y], i) => <rect key={i} x={x - 9} y={y - 9} width="18" height="18" rx="5" className="sc-graph__node" />)}
          </svg>
        </div>
      )}
      {kind === 'motion' && (
        <div className="sc-tl">
          <span className="sc-tl__comp"><i className="sc-tl__shape" /></span>
          <span className="sc-tl__layers">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="sc-tl__layer" style={{ '--i': i } as CSSProperties}>
                <b className="sc-tl__label" /><b className="sc-tl__bar" /><i className="sc-tl__key" /><i className="sc-tl__key sc-tl__key--2" />
              </span>
            ))}
            <i className="sc-tl__head" />
          </span>
        </div>
      )}
    </div>
  );
}
