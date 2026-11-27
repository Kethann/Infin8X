import { brand } from '../content/site';
import { footer } from '../content/sections';
import { Words } from './Chapter';
import { BrandWordmark } from './BrandWordmark';
import { TransitionLink } from './PageTransition';

/** The finale: the closing line, the brand lockup and the base line (centred on phones, side by side from 768px).
 *  Section links live only in the top nav. */
export function Footer() {
  return (
    <footer className="footer">
      <i className="footer__spectrum" aria-hidden="true" />
      <div className="page">
        <div className="footer__closing">
          <p className="footer__line" data-reveal="words"><Words text={footer.closing} /></p>
        </div>
        <div className="footer__grid">
          <div className="footer__brand">
            <TransitionLink to="/" className="footer__home" aria-label={`${brand.name} home`}><BrandWordmark /></TransitionLink>
            <p>{brand.reading}</p>
          </div>
        </div>
        <div className="footer__base">
          <p className="footer__copyright script-copy">© {new Date().getFullYear()} {brand.name}</p>
          <p className="footer__core script-copy">{brand.coreLine}</p>
        </div>
      </div>
    </footer>
  );
}
