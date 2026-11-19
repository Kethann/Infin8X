import type { Accent } from '../content/sections';

/** Clearly labelled design studies, never presented as screenshots of delivered products. */
export function ProjectCover({ label, slug, src, big = false }: { accent: Accent; label: string; slug?: string; src?: string; big?: boolean }) {
  return (
    <div data-study={src ? undefined : true} data-title={label} className={`cover project-study project-study--${slug ?? 'amuse-portfolio'} ${big ? 'cover--big' : ''}`}>
      {src ? <img src={src} alt={label} loading="lazy" /> : <>
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
          </> : slug === 'delivery-robot-sn15' ? <>
            <span className="study-robot__label">SN15 <span>/ AUTONOMOUS EXPLORATION</span></span>
            <svg className="study-robot__path" viewBox="0 0 640 500" aria-hidden="true"><path d="M-30 410H280Q350 410 350 340V230Q350 175 405 175H555Q595 175 595 135V-20" fill="none" stroke="#ff623f" strokeWidth="2" /><path d="M-30 425H280Q365 425 365 340V230Q365 190 405 190H555Q610 190 610 135V-20" fill="none" stroke="#ff623f" strokeWidth="1" opacity=".2" /><circle cx="553" cy="175" r="7" fill="#ff623f" /><circle cx="553" cy="175" r="21" fill="none" stroke="#ff623f" opacity=".5" /></svg>
            <div className="study-robot"><div className="study-robot__wheel study-robot__wheel--left" /><div className="study-robot__wheel study-robot__wheel--right" /><div className="study-robot__body"><span>SN—15</span><div className="study-robot__sensor"><i /><i /></div><div className="study-robot__vents" /></div></div>
            <span className="study-robot__bottom">SENSE. MAP. MOVE.</span>
          </> : <>
            <span className="study-amuse__top">A COLLECTION OF IDEAS IN MOTION</span>
            <div className="study-amuse__orbit study-amuse__orbit--one" /><div className="study-amuse__orbit study-amuse__orbit--two" />
            <span className="study-amuse__word">amuse<span>↗</span></span>
            <span className="study-amuse__bottom">WORK / PLAY / REPEAT</span>
          </>}
        </div>
        <span className="cover__caption">DESIGN STUDY</span>
      </>}
    </div>
  );
}
