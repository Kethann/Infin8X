import { useRef } from 'react';
import { FlowMark } from './FlowMark';
import { useWordmarkLight } from '../lib/useWordmarkLight';

/** Turbo Driver endpoints, Ariovex Italic lettering, and the actual logo as the 8. */
export function BrandWordmark() {
  const ref=useRef<HTMLSpanElement>(null);
  useWordmarkLight(ref);
  return <span ref={ref} className="brand-wordmark" role="img" aria-label="Infin8X">
    <span className="brand-wordmark__end" aria-hidden="true">I</span>
    <span className="brand-wordmark__middle" aria-hidden="true">NFIN</span>
    <span className="brand-wordmark__eight" aria-hidden="true"><FlowMark /></span>
    <span className="brand-wordmark__end brand-wordmark__x" aria-hidden="true">X</span>
  </span>;
}
