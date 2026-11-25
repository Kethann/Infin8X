import type { CSSProperties } from 'react';
import type { Accent } from '../content/sections';

/** Clearly labelled design studies, never presented as screenshots of delivered products. */
export function ProjectCover({ label, slug, src, srcMobile, srcTablet, big = false, eager = false }: { accent: Accent; label: string; slug?: string; src?: string; srcMobile?: string; srcTablet?: string; big?: boolean; eager?: boolean }) {
  const load = eager ? 'eager' : 'lazy';
  return (
    <div data-study={src ? undefined : true} data-title={label} className={`cover project-study project-study--${slug ?? 'study'} ${big ? 'cover--big' : ''}`}
      style={src ? { '--cover-bg': `url("${src}")` } as CSSProperties : undefined}>
      {src ? <>
        <img className="cover__desk" src={src} alt={label} loading={load} decoding="async" />
        {/* Overlays for the Work split screen only (hidden elsewhere): a fitted copy of the desktop shot over its own blurred
            backdrop, then the tablet and phone captures. They fade in over the desktop shot, which never fades out,
            so a tile is always fully covered while it resizes (no flicker). */}
        {(srcTablet || srcMobile) && <span className="cover__fit" aria-hidden="true"><img src={src} alt="" loading={load} decoding="async" /></span>}
        {srcTablet && <img className="cover__tab" src={srcTablet} alt="" loading={load} decoding="async" />}
        {srcMobile && <img className="cover__mob" src={srcMobile} alt="" loading={load} decoding="async" />}
      </> : <>
        <div className="project-study__scene" role="img" aria-label={`${label}: conceptual design study, not a live product screenshot`}>
          {slug === 'kaaya-cafe' ? <>
            <span className="study-kaaya__word">KAAYA</span>
            <div className="study-cup"><div className="study-cup__handle" /><div className="study-cup__coffee"><span /></div></div>
            <div className="study-phone">
              <div className="study-phone__camera" />
              <div className="study-phone__screen"><span className="study-phone__brand">kaaya.</span><span className="study-phone__table">AT YOUR TABLE</span><strong>Something<br />worth slowing<br />down for.</strong><div className="study-phone__drink"><i /></div><div className="study-phone__menu"><span>Freshly brewed</span><span>↗</span></div><span className="study-phone__button">Browse the menu</span></div>
            </div>
          </> : slug === 'dolly-design-studio' ? <>
            <span className="study-dolly__caption">DESIGN STUDIO / WEB STUDY</span>
            <div className="study-dolly__sculpture"><i /><i /><i /></div>
            <span className="study-dolly__word">DOLLY<span>*</span></span>
            <span className="study-dolly__bottom">A point of view.<br />A world of possibilities.</span>
          </> : <>
            <span className="study-dolly__caption">DESIGN STUDY</span>
          </>}
        </div>
        <span className="cover__caption">DESIGN STUDY</span>
      </>}
    </div>
  );
}
