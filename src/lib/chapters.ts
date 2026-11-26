import { useSyncExternalStore } from 'react';

/**
 * Tracks which chapter (`[data-chapter]` element) is under the reading line, where every chapter starts
 * along the page (0–1) and the page scroll progress. The nav timeline, nav glider and ambient light all read it.
 */
export interface Mark { id: string; at: number; accent: string; label: string }
interface State { id: string | null; accent: string; marks: Mark[] }

const DEFAULT_ACCENT = '#3c6cff';
let state: State = { id: null, accent: DEFAULT_ACCENT, marks: [] };
const listeners = new Set<() => void>();
const progressListeners = new Set<(p: number) => void>();
let progress = 0;

const emit = (next: Partial<State>) => { state = { ...state, ...next }; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useChapters = () => useSyncExternalStore(subscribe, () => state, () => state);
/** Scroll progress is pushed straight to the DOM by subscribers (no React render per frame). */
export function onProgress(fn: (p: number) => void) { progressListeners.add(fn); fn(progress); return () => { progressListeners.delete(fn); }; }

const accentOf = (el: HTMLElement) => getComputedStyle(el).getPropertyValue('--section-accent').trim() || DEFAULT_ACCENT;

/** Starts tracking; returns a cleanup. Call once per route. */
export function trackChapters() {
  let raf = 0, dirty = true, disposed = false, max = 1;
  let chapters: (Mark & { top: number; bottom: number })[] = [];
  const update = () => {
    raf = 0;
    if (disposed) return;
    const y = scrollY, line = y + innerHeight * 0.45;
    const next: Partial<State> = {};
    // Cache layout on resize/content changes. Ordinary scroll frames read only the scroll offset.
    if (dirty) {
      dirty = false;
      max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'), el => {
        const rect = el.getBoundingClientRect(), top = rect.top + y;
        return { id: el.dataset.chapter!, label: el.dataset.chapterLabel ?? el.dataset.chapter!, accent: accentOf(el),
          top, bottom: rect.bottom + y, at: Math.min(1, Math.max(0, (top - innerHeight * 0.45) / max)) };
      });
      next.marks = chapters.map(({ id, label, accent, at }) => ({ id, label, accent, at }));
    }
    progress = Math.min(1, Math.max(0, y / max));
    progressListeners.forEach((f) => f(progress));
    const active = chapters.find(chapter => chapter.top <= line && chapter.bottom > line);
    const id = active?.id ?? null, accent = active?.accent ?? DEFAULT_ACCENT;
    if (id !== state.id || accent !== state.accent) Object.assign(next, { id, accent });
    if (Object.keys(next).length) emit(next);
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  const measure = () => { if (!disposed) { dirty = true; onScroll(); } };
  const ro = new ResizeObserver(() => measure());
  ro.observe(document.body);
  const mo = new MutationObserver(measure);
  mo.observe(document.getElementById('main') ?? document.body, { childList: true, subtree: true });
  document.fonts?.ready.then(measure);
  document.fonts?.addEventListener('loadingdone', measure);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', measure);
  addEventListener('infin8x:sections-ready', measure);
  measure();
  return () => {
    disposed = true; cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect();
    document.fonts?.removeEventListener('loadingdone', measure);
    removeEventListener('scroll', onScroll); removeEventListener('resize', measure); removeEventListener('infin8x:sections-ready', measure);
    emit({ id: null, accent: DEFAULT_ACCENT, marks: [] });
  };
}
