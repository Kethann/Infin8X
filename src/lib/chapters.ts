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
  let raf = 0, line = 0;
  const els = () => [...document.querySelectorAll<HTMLElement>('[data-chapter]')];
  const measure = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const marks = els().map((el) => ({
      id: el.dataset.chapter!, label: el.dataset.chapterLabel ?? el.dataset.chapter!, accent: accentOf(el),
      at: Math.min(1, Math.max(0, (el.getBoundingClientRect().top + scrollY - innerHeight * 0.45) / max)),
    }));
    emit({ marks });
    update();
  };
  const update = () => {
    raf = 0;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    progress = Math.min(1, Math.max(0, scrollY / max));
    progressListeners.forEach((f) => f(progress));
    line = innerHeight * 0.45;
    let active: HTMLElement | null = null;
    for (const el of els()) { const r = el.getBoundingClientRect(); if (r.top <= line && r.bottom > line) { active = el; break; } }
    const id = active?.dataset.chapter ?? null;
    if (id !== state.id) emit({ id, accent: active ? accentOf(active) : DEFAULT_ACCENT });
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  const ro = new ResizeObserver(() => measure());
  ro.observe(document.body);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', measure);
  addEventListener('infin8x:sections-ready', measure);
  measure();
  return () => {
    cancelAnimationFrame(raf); ro.disconnect();
    removeEventListener('scroll', onScroll); removeEventListener('resize', measure); removeEventListener('infin8x:sections-ready', measure);
    emit({ id: null, accent: DEFAULT_ACCENT, marks: [] });
  };
}
