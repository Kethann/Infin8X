import { Fragment, type CSSProperties } from 'react';
import { chapter, type ChapterId } from '../content/sections';

/**
 * Splits a line into words that resolve from blur one after another (the reveal lives in CSS).
 * The space sits between the inline-block words, so the line still wraps and reads normally.
 */
export function Words({ text, offset = 0 }: { text: string; offset?: number }) {
  const words = text.split(' ');
  return <>{words.map((w, i) => (
    <Fragment key={i}>
      <span className="w" style={{ '--wi': i + offset } as CSSProperties}><span>{w}</span></span>{i < words.length - 1 ? ' ' : null}
    </Fragment>
  ))}</>;
}

/**
 * Chapter header, shared by every section: the section name set large in outline behind the title (in the chapter's
 * spectrum colour), a title that resolves word by word under a passing light sweep, and a lead. No numbering.
 */
export function Chapter({ id, title, lead, titleId, align = 'start' }: { id: ChapterId; title: string; lead?: string; titleId: string; align?: 'start' | 'center' }) {
  const c = chapter(id);
  return (
    <header className={`chapter chapter--${align}`}>
      <span className="chapter__ghost" aria-hidden="true" data-reveal>{c.label}</span>
      <h2 id={titleId} className="chapter__title" data-reveal="words"><Words text={title} /></h2>
      {lead && <p className="chapter__lead" data-reveal="words"><Words text={lead} offset={2} /></p>}
    </header>
  );
}
