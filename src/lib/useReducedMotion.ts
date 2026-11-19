import { useSyncExternalStore } from 'react';
import { prefersReducedMotion } from './env';

function subscribe(change: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (media.addEventListener) {
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }
  media.addListener(change);
  return () => media.removeListener(change);
}
/** Follow accessibility preferences without requiring a page reload. */
export const useReducedMotion = () => useSyncExternalStore(subscribe, prefersReducedMotion, () => true);
