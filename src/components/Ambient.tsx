import type { CSSProperties } from 'react';
import { useChapters } from '../lib/chapters';

/**
 * Shared colour wash and optical bloom, tinted by the active chapter.
 * CSS gradients keep the atmosphere available without WebGL; motion is optional.
 */
export function Ambient() {
  const { accent, marks, id } = useChapters();
  const i = marks.findIndex((m) => m.id === id);
  const next = marks[i + 1]?.accent ?? accent;
  return (
    <div className="ambient" aria-hidden="true" style={{ '--amb': accent, '--amb2': next } as CSSProperties}>
      <i className="ambient__nebula ambient__nebula--a" />
      <i className="ambient__nebula ambient__nebula--b" />
      <div className="ambient__lens">
        <i className="ambient__bloom" />
        <i className="ambient__flare" />
        <i className="ambient__ghost" />
      </div>
      <i className="ambient__shade" />
      <i className="ambient__grain" />
    </div>
  );
}
