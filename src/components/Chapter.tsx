import { Fragment, useRef, type CSSProperties, type PointerEvent } from 'react';
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
  const ghost = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  // the pointer glow lights the letters under the pointer; the name ignores the pointer (the title overlaps it), so the header tracks it
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    const x = e.clientX, y = e.clientY;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = ghost.current; if (!el) return;
      const r = el.getBoundingClientRect();
      // only on the letters: test the text's own line boxes (not the padded box around the italic)
      const range = document.createRange(); range.selectNodeContents(el);
      const inside = [...range.getClientRects()].some(b => {
        const inset = b.height * 0.12;
        return x > b.left && x < b.right && y > b.top + inset && y < b.bottom - inset;
      });
      el.style.setProperty('--gx', `${x - r.left}px`);
      el.style.setProperty('--gy', `${y - r.top}px`);
      el.toggleAttribute('data-glow', inside);
    });
  };
  const onLeave = () => { cancelAnimationFrame(frame.current); ghost.current?.removeAttribute('data-glow'); };
  return (
    <header className={`chapter chapter--${align}`} onPointerMove={onMove} onPointerLeave={onLeave}>
      <span ref={ghost} className="chapter__ghost" aria-hidden="true" data-reveal>{c.label}</span>
      <h2 id={titleId} className="chapter__title" data-reveal="words"><Words text={title} /></h2>
      {lead && <p className="chapter__lead" data-reveal="words"><Words text={lead} offset={2} /></p>}
    </header>
  );
}
