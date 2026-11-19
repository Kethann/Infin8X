import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { nav, navCta, brand } from '../content/site';
import { chapters } from '../content/sections';
import { BrandWordmark } from './BrandWordmark';
import { Icon } from './Icon';
import { TransitionLink } from './PageTransition';
import { useChapters, onProgress } from '../lib/chapters';

/** Shared brand wordmark and chapter navigation, with a soft active-link highlight. */
export function Nav({ home }: { home: boolean }) {
  const [shown, setShown] = useState(!home);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // on the home page the hero already shows the logo and wordmark, so the bar's wordmark waits until the hero has gone
  const [inHero, setInHero] = useState(home);
  const { id: active, accent } = useChapters();
  const barRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLElement>(null);
  const [glider, setGlider] = useState<{ x: number; w: number } | null>(null);

  useEffect(() => {
    if (!home) { setShown(true); return; }
    const on = () => setShown(true);
    window.addEventListener('infin8x:intro-done', on);
    const t = window.setTimeout(on, 9000); // safety: never hide navigation for long
    return () => { window.removeEventListener('infin8x:intro-done', on); clearTimeout(t); };
  }, [home]);

  useEffect(() => onProgress(() => {
    const s = window.scrollY > 40;
    setScrolled((v) => (v === s ? v : s));
    const hero = home ? document.getElementById('top') : null;
    const h = !!hero && hero.getBoundingClientRect().bottom > window.innerHeight * 0.3;
    setInHero((v) => (v === h ? v : h));
  }), [home]);

  // the glider follows the active chapter link (re-measured when fonts load or the viewport changes)
  useLayoutEffect(() => {
    const measure = () => {
      const el = linksRef.current?.querySelector<HTMLElement>(`[data-id="${active}"]`);
      setGlider(el && el.offsetWidth ? { x: el.offsetLeft, w: el.offsetWidth } : null);
    };
    measure();
    addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    return () => removeEventListener('resize', measure);
  }, [active, shown]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const background = Array.from(document.querySelectorAll<HTMLElement>('#main, .footer'));
    const previousInert = background.map(el => el.inert);
    background.forEach(el => { el.inert = true; });
    const closeOnDesktop = () => { if (window.innerWidth >= 1000) setOpen(false); };
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
    window.addEventListener('resize', closeOnDesktop);
    window.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = previous; background.forEach((el, i) => { el.inert = previousInert[i]; }); window.removeEventListener('resize', closeOnDesktop); window.removeEventListener('keydown', escape); };
  }, [open]);

  const href = (h: string) => (home ? h : `/${h}`);
  return (
    <header className={`nav ${shown ? 'is-shown' : ''} ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''} ${inHero && !open ? 'is-hero' : ''}`} style={{ '--nav-accent': accent } as CSSProperties}>
      <div ref={barRef} className="nav__bar">
        <TransitionLink to="/" className="nav__brand" aria-label={`${brand.name} home`} onClickCapture={() => setOpen(false)}
          aria-hidden={inHero && !open ? true : undefined} tabIndex={inHero && !open ? -1 : undefined}>
          <BrandWordmark />
        </TransitionLink>

        <nav ref={linksRef} aria-label="Primary" className="nav__links">
          <i className={`nav__glider ${glider ? 'is-on' : ''}`} aria-hidden="true"
            style={glider ? { transform: `translateX(${glider.x}px)`, width: glider.w } : undefined} />
          {nav.map((n) => (
            <a key={n.href} data-id={n.id} href={href(n.href)} aria-current={active === n.id ? 'location' : undefined}>
              <Icon name={n.id} size={15} /><span>{n.label}</span>
            </a>
          ))}
        </nav>

        <a className="nav__cta" href={href('#contact')}><span>{navCta}</span><Icon name="arrow" size={14} /></a>
        <button type="button" className="nav__toggle" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span><i /><i />
        </button>
      </div>

      <div id="mobile-menu" className="nav__sheet" hidden={!open}>
        <ol>
          {chapters.map((c, i) => (
            <li key={c.id} style={{ '--i': i, '--k': `var(--s-${c.accent})` } as CSSProperties}>
              <a href={href(`#${c.id}`)} aria-current={active === c.id ? 'location' : undefined} onClick={() => setOpen(false)}>
                <span className="nav__sheet-label">{c.label}</span>
                <Icon name={c.id} size={18} />
              </a>
            </li>
          ))}
        </ol>
        <a className="btn btn--primary nav__sheet-cta" href={href('#contact')} onClick={() => setOpen(false)}>{navCta}</a>
      </div>
    </header>
  );
}
