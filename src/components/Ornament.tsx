import { ORNAMENT_DOT_R, ORNAMENT_PATH, ORNAMENT_R } from '../lib/ornament';

const box = `-${ORNAMENT_R + 1} -${ORNAMENT_R + 1} ${2 * ORNAMENT_R + 2} ${2 * ORNAMENT_R + 2}`;

/** The octagram. Size it with CSS width/height; it draws in `color` with 1px strokes. */
export function Ornament({ className = '' }: { className?: string }) {
  return (
    <svg className={`ornament ${className}`.trim()} viewBox={box} aria-hidden="true">
      <path d={ORNAMENT_PATH} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <circle r={ORNAMENT_DOT_R} fill="currentColor" />
    </svg>
  );
}

/** Hairline · octagram · hairline. Same markup as worker/share.ts. */
export function OrnamentRule() {
  return (
    <div className="ornament-rule" aria-hidden="true">
      <span className="hair" />
      <Ornament />
      <span className="hair" />
    </div>
  );
}
