import { useLocation } from 'wouter';
import { brand } from '../content/site';
import { footer } from '../content/sections';
import { prefersReducedMotion } from '../lib/env';
import { Words } from './Chapter';
import { BrandWordmark } from './BrandWordmark';
import { TransitionLink } from './PageTransition';
import { Icon } from './Icon';

/** The finale: the closing line and call to action, then one bar (brand left, LinkedIn and back-to-top right) and the base line.
 *  Section links live only in the top nav. */
export function Footer() {
  const [loc] = useLocation();
  const href = (h: string) => (loc === '/' ? h : `/${h}`);
  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    document.getElementById('main')?.focus({ preventScroll: true });
  };
  return (
    <footer className="footer">
      <i className="footer__spectrum" aria-hidden="true" />
      <div className="page">
        <div className="footer__closing">
          <p className="footer__line" data-reveal="words"><Words text={footer.closing} /></p>
          <a className="btn btn--primary" href={href('#contact')}>{footer.cta} <Icon name="arrow" size={14} /></a>
        </div>
        <div className="footer__grid">
          <div className="footer__brand">
            <TransitionLink to="/" className="footer__home" aria-label={`${brand.name} home`}><BrandWordmark /></TransitionLink>
            <p>{brand.reading}</p>
          </div>
          <div className="footer__links">
            <a href={brand.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <Icon name="arrow" size={13} /></a>
            <button type="button" onClick={backToTop}>{footer.top} <Icon name="up" size={13} /></button>
          </div>
        </div>
        <div className="footer__base">
          <p className="footer__copyright">© {new Date().getFullYear()} {brand.name}</p>
          <p className="footer__core">{brand.coreLine}</p>
        </div>
      </div>
    </footer>
  );
}
