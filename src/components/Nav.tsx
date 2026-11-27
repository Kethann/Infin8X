import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { nav, navCta, brand, chapterHref } from '../content/site';
import { chapters } from '../content/sections';
import { BrandWordmark } from './BrandWordmark';
import { Icon } from './Icon';
import { TransitionLink } from './PageTransition';
import { useChapters, onProgress } from '../lib/chapters';

/** In-page anchors on home stay plain links (Lenis glides to them); routes and cross-page jumps get the transition. */
function Go({ to, children, ...rest }: { to: string; children: ReactNode; [k: string]: unknown }) {
  return to.startsWith('#') ? <a href={to} {...rest}>{children}</a> : <TransitionLink to={to} {...rest}>{children}</TransitionLink>;
}

/**
 * Shared brand wordmark and chapter navigation. Desktop: the wordmark on the left and one compact glass pill on the
 * right: icon-only section buttons (name on hover) where the current section expands into a capsule sized to its name,
 * a round "start a project" button and a round menu button; the glass fits whatever is showing. Phones: wordmark + menu button + the full sheet.
 */
export function Nav({ home }: { home: boolean }) {
  const [shown, setShown] = useState(!home);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // on the home page the hero already shows the logo and wordmark, so the bar's wordmark waits until the hero has gone
  const [inHero, setInHero] = useState(home);
  const { id: active, accent } = useChapters();
  const barRef = useRef<HTMLDivElement>(null);
  // natural label widths (px) in the real font, so each capsule fits its own name: nothing clipped, no spare room
  const measureRef = useRef<HTMLSpanElement>(null);
  const [labelW, setLabelW] = useState<number[]>([]);

  useLayoutEffect(() => {
    const measure = () => {
      const spans = Array.from(measureRef.current?.children ?? []) as HTMLElement[];
      const w = spans.map((el) => Math.ceil(el.getBoundingClientRect().width));
      if (w.some((v) => v > 0)) setLabelW((prev) => (prev.length === w.length && prev.every((v, i) => v === w[i]) ? prev : w));
    };
    measure();
    document.fonts?.ready.then(measure);
    document.fonts?.addEventListener?.('loadingdone', measure);
    return () => document.fonts?.removeEventListener?.('loadingdone', measure);
  }, []);

  useEffect(() => {
    if (!home) { setShown(true); return; }
    const on = () => setShown(true);
    window.addEventListener('infin8x:intro-done', on);
    const t = window.setTimeout(on, 9000); // safety: never hide navigation for long
    return () => { window.removeEventListener('infin8x:intro-done', on); clearTimeout(t); };
  }, [home]);

  const progressRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const hero = home ? document.getElementById('top') : null;
    let heroEnd = 0, previousScrolled: boolean | undefined, previousHero: boolean | undefined;
    const measure = () => { heroEnd = hero ? hero.getBoundingClientRect().bottom + scrollY : 0; };
    measure();
    const observer = hero ? new ResizeObserver(measure) : null;
    if (hero) observer?.observe(hero);
    const unsubscribe = onProgress((p) => {
      progressRef.current?.style.setProperty('--p', p.toFixed(4));
      const s = scrollY > 40, h = !!hero && heroEnd - scrollY > innerHeight * 0.3;
      if (s !== previousScrolled) { previousScrolled = s; setScrolled(s); }
      if (h !== previousHero) { previousHero = h; setInHero(h); }
    });
    return () => { unsubscribe(); observer?.disconnect(); };
  }, [home]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const background = Array.from(document.querySelectorAll<HTMLElement>('#main, .footer'));
    const previousInert = background.map(el => el.inert);
    background.forEach(el => { el.inert = true; });
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const header = barRef.current?.closest('header');
        const controls = Array.from(header?.querySelectorAll<HTMLElement>('a[href], button') ?? []).filter(el => el.getClientRects().length && !el.closest('[hidden]'));
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
      if (event.key === 'Escape') { setOpen(false); barRef.current?.querySelector<HTMLButtonElement>('.nav__toggle')?.focus(); }
    };
    window.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = previous; background.forEach((el, i) => { el.inert = previousInert[i]; }); window.removeEventListener('keydown', escape); };
  }, [open]);

  const href = (h: string) => (h.startsWith('/') || home ? h : `/${h}`);
  // capsule = left pad 14 + icon 16 + gap 9 + label + right pad 16; 42 = a round icon button
  const k = nav.findIndex((n) => n.id === active);
  const capOf = (i: number) => 55 + (labelW[i] ?? 76);
  const capMax = Math.max(...nav.map((_, i) => capOf(i)));
  const cap = k >= 0 ? capOf(k) : 42;
  const linkVars = { '--k': k, '--n': nav.length, '--cap': `${cap}px`, '--capmax': `${capMax}px` } as CSSProperties;
  return (
    <header className={`nav ${shown ? 'is-shown' : ''} ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''} ${inHero && !open ? 'is-hero' : ''}`} style={{ '--nav-accent': accent } as CSSProperties}>
      <div ref={barRef} className="nav__bar">
        <TransitionLink to="/" className="nav__brand" aria-label={`${brand.name} home`} onClickCapture={() => setOpen(false)}
          aria-hidden={inHero && !open ? true : undefined} tabIndex={inHero && !open ? -1 : undefined}>
          <BrandWordmark />
        </TransitionLink>

        <div className="nav__pill" style={{ '--trim': `${capMax - cap}px` } as CSSProperties}>
          {/* --k: index of the current section (-1 when none). The row keeps a constant width (room for the widest capsule);
              buttons are right-aligned in it by transform and the glass is trimmed to them with clip-path: no layout shift. */}
          <span ref={measureRef} className="nav__measure" aria-hidden="true">{nav.map((n) => <span key={n.id}>{n.label}</span>)}</span>
          <nav aria-label="Primary" className="nav__links" style={linkVars}>
            {nav.map((n, i) => (
              <Go key={n.href} data-id={n.id} data-label={n.label} to={href(n.href)} aria-current={active === n.id ? 'location' : undefined}
                style={{ '--i': i, '--w': `${labelW[i] ?? 76}px` } as CSSProperties}>
                <Icon name={`nav-${n.id}`} size={16} /><span>{n.label}</span>
              </Go>
            ))}
          </nav>
          <Go className="nav__cta" to={href('#contact')} data-label={navCta}><Icon name="nav-contact" size={16} /><span className="nav__cta-label">{navCta}</span></Go>
          <button type="button" className="nav__toggle" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span><i /><i />
          </button>
        </div>
      </div>

      {/* scroll progress, edge to edge under the bar: white light enters at the left and disperses into the spectrum */}
      <div ref={progressRef} className="nav__progress" aria-hidden="true"><i /></div>

      <div id="mobile-menu" className="nav__sheet" hidden={!open}>
        <ol>
          {chapters.map((c, i) => (
            <li key={c.id} style={{ '--i': i, '--k': `var(--s-${c.accent})` } as CSSProperties}>
              <Go to={href(chapterHref(c.id))} aria-current={active === c.id ? 'location' : undefined} onClickCapture={() => setOpen(false)}>
                <span className="nav__sheet-chip" aria-hidden="true"><Icon name={`nav-${c.id}`} size={15} /></span>
                <span className="nav__sheet-label">{c.label}</span>
              </Go>
            </li>
          ))}
        </ol>
        <Go className="btn btn--primary nav__sheet-cta" to={href('#contact')} onClickCapture={() => setOpen(false)}>{navCta}</Go>
      </div>
    </header>
  );
}
