import { useEffect, useRef, type CSSProperties } from 'react';
import gsap from 'gsap';
import { projects } from '../content/projects';
import { accentVar } from '../content/sections';
import { ProjectCover } from '../sections/ProjectCover';
import { TransitionLink } from '../components/PageTransition';
import { useReducedMotion } from '../lib/useReducedMotion';
import { projectPresentation } from '../content/projectPresentation';
import '../styles/case-study.css';

export function CaseStudy({ slug }: { slug: string }) {
  const reduced = useReducedMotion();
  const idx = projects.findIndex((p) => p.slug === slug);
  const p = projects[idx];
  const presentation = projectPresentation[slug];
  const tlRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    document.title = p ? `${p.title} | Infin8X` : 'Not found | Infin8X';
    const el = tlRef.current; if (!el) return;
    const nodes = el.querySelectorAll('li'), fill = el.querySelector('.idea__fill');
    const media = gsap.matchMedia();
    media.add({ wide: '(min-width: 900px)', narrow: '(max-width: 899px)' }, context => {
      const wide = context.conditions?.wide;
      nodes.forEach(node => node.classList.remove('is-lit'));
      if (reduced) {
        gsap.set(fill, {scaleX:1, scaleY:1}); nodes.forEach(node => node.classList.add('is-lit'));
      } else {
        const timeline = gsap.timeline({delay:.3}).fromTo(fill,
          {scaleX:wide ? 0 : 1, scaleY:wide ? 1 : 0},
          {scaleX:1, scaleY:1, duration:1.4, ease:'power2.inOut'});
        nodes.forEach((node,index) => timeline.add(() => node.classList.add('is-lit'), index / Math.max(nodes.length-1,1) * 1.4));
      }
      return () => nodes.forEach(node => node.classList.remove('is-lit'));
    });
    return () => media.revert();
  }, [p, reduced]);
  if (!p) return (
    <section className="section page case"><h1>Project not found</h1><TransitionLink to="/" className="link-arrow">← Back home</TransitionLink></section>
  );
  const next = projects[(idx + 1) % projects.length];
  const view = presentation ?? {name:p.title, subtitle:p.summary, light:'113 178 232', statement:p.idea, notes:[]};
  const nextView = projectPresentation[next.slug];
  return (
    <article className="case case--studio" data-chapter="case" data-chapter-label={view.name} style={{ '--section-accent': accentVar(p.accent), '--c': accentVar(p.accent), '--case-light': view.light } as CSSProperties}>
      <div className="case__atmosphere" aria-hidden="true"><div className="case__light" /><div className="case__horizon" /></div>
      <div className="page case__content">
        <div className="case__topline">
          <TransitionLink to="/#projects" className="case__back"><span aria-hidden="true">←</span> All projects</TransitionLink>
          <span className="case__edition">SELECTED WORK</span>
        </div>
        <header className="case__hero">
          <p className="case__cat">{p.category}<span />INFIN8X</p>
          <h1 className="case__title" aria-label={p.title}>{view.name}<span className="case__period">.</span></h1>
          <div className="case__hero-bottom"><p className="case__subtitle">{view.subtitle}</p><a className="case__explore" href="#project-overview">Explore the project <span aria-hidden="true">↓</span></a></div>
        </header>
        <figure className="case__showcase">
          <div className="case__frame"><ProjectCover accent={p.accent} label={p.title} slug={p.slug} src={p.cover} big /></div>
          <figcaption><span>{p.cover ? 'Project visual' : 'Visual direction / Concept study'}</span><span>{view.name} — Infin8X</span></figcaption>
        </figure>
        <section id="project-overview" className="case__overview" aria-labelledby="overview-title">
          <div className="case__section-label"><span>01</span> / OVERVIEW</div>
          <div className="case__overview-body"><h2 id="overview-title">{view.statement}</h2><p>{p.summary}</p></div>
          <dl className="case__facts"><div><dt>Discipline</dt><dd>{p.category}</dd></div><div><dt>Focus & tools</dt><dd><ul>{p.tags.map(t => <li key={t}>{t}</li>)}</ul></dd></div><div><dt>Presentation</dt><dd>{p.cover ? 'Project overview' : 'Concept & visual exploration'}</dd></div></dl>
        </section>
        <section className="case__direction" aria-labelledby="direction-title">
          <div className="case__section-label"><span>02</span> / PROJECT NOTES</div>
          <h2 id="direction-title">Inside the project.</h2>
          <ol ref={tlRef} className="idea case__notes">
            <i className="idea__fill" aria-hidden="true" />
            {view.notes.map((note, i) => <li key={note.label}><span className="idea__dot" aria-hidden="true" /><span className="case__note-number">0{i + 1}</span><h3>{note.label}</h3><p>{note.text}</p></li>)}
          </ol>
          {p.url && <a className="btn btn--ghost" href={p.url} target="_blank" rel="noopener noreferrer">Visit project ↗</a>}
        </section>
        <TransitionLink to={`/work/${next.slug}`} className="case__next" aria-label={`Next project: ${next.title}`}>
          <div><span className="case__section-label">NEXT PROJECT</span><span className="case__next-title">{nextView?.name ?? next.title}</span><span className="case__next-subtitle">{nextView?.subtitle ?? next.summary}</span></div>
          <span className="case__next-arrow" aria-hidden="true">↗</span>
        </TransitionLink>
      </div>
    </article>
  );
}
