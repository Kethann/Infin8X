import { isLowEnd, prefersReducedMotion } from '../lib/env';
import { useRef, type ElementType, type ReactNode, type CSSProperties } from 'react';

type Props = {
  as?: ElementType;
  elevation?: 1 | 2 | 3;
  accent?: string;          // css colour for glow + edge tint
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  [k: string]: unknown;
};

/** Glass surface with an inner highlight and a specular that follows the pointer. */
export function Glass({ as: Tag = 'div', elevation = 1, accent, className = '', style, children, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || prefersReducedMotion() || isLowEnd()) return;
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
    if (e.pointerType === 'mouse') { el.style.setProperty('--rx', `${(0.5 - y) * 5}deg`); el.style.setProperty('--ry', `${(x - 0.5) * 6}deg`); }
  };
  const onLeave = () => { const el = ref.current; if (!el) return; el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); };
  return (
    <Tag ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={`glass glass--e${elevation} ${className}`}
      style={{ ...(accent ? { '--glass-accent': accent } : {}), ...style } as CSSProperties} {...rest}>
      {children}
    </Tag>
  );
}
