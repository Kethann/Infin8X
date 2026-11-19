import type { CSSProperties } from 'react';
import { about, accentVar } from '../content/sections';
import { Chapter, Words } from '../components/Chapter';

/**
 * 01 About. The brand story told as light: a white beam enters on the left, crosses the three principles
 * (idea, craft, detail) and leaves as the spectrum. Below it, the milestone track since the studio began building.
 */
export function About() {
  return (
    <section id="about" className="section about" data-chapter="about" data-chapter-label="About"
      style={{ '--section-accent': accentVar(about.accent) } as CSSProperties} aria-labelledby="about-h">
      <div className="page">
        <div className="about__top">
          <Chapter id="about" titleId="about-h" title={about.title} />
          <div className="about__statement">
            <p className="about__core" data-reveal="words"><Words text={about.statement} /></p>
            <p className="about__body" data-reveal>{about.body}</p>
          </div>
        </div>

        <ol className="about__beam" data-reveal="draw">
          <i className="about__ray" aria-hidden="true" />
          {about.philosophy.map((line, i) => (
            <li key={i} style={{ '--i': i } as CSSProperties}>
              <span className="about__node" aria-hidden="true" />
              <p className="about__label">{about.principleLabels[i]}</p>
              <p className="about__line">{line}</p>
            </li>
          ))}
        </ol>

        <div className="about__track" data-reveal="draw">
          <p className="about__since"><span>{about.sinceLabel}</span><strong>{about.since}</strong></p>
          <ol>
            {about.journey.map((j, i) => (
              <li key={j.name} style={{ '--i': i } as CSSProperties} className={i === about.journey.length - 1 ? 'is-now' : ''}>
                <i aria-hidden="true" />
                <h3>{j.name}</h3>
                <p>{j.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
