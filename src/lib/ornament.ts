// The app's one ornament: an octagram (a diamond over a square) with a centre dot, drawn
// as hairlines in the frame colour. Same shapes as the hex-button tips and frame corners.
// Shared by the preview card (card.ts), the Worker's static share page and the app.

/** Radius of the points, in drawing units. The card draws it at this size in its 1200-unit
 *  layout (25px at the 600px output); elsewhere it scales to whatever box it's given. */
export const ORNAMENT_R = 25;

const R = ORNAMENT_R;
const c = +(R / Math.SQRT2).toFixed(2);
/** Diamond (points on the axes) plus square (corners on the diagonals), centred on 0,0. */
export const ORNAMENT_PATH = `M0 -${R}L${R} 0L0 ${R}L-${R} 0ZM-${c} -${c}H${c}V${c}H-${c}Z`;
export const ORNAMENT_DOT_R = +(R / 6).toFixed(2);

/** Inline SVG for HTML: 1px strokes at any size, colour from CSS `color`. */
export const ORNAMENT_SVG =
  `<svg class="ornament" viewBox="-${R + 1} -${R + 1} ${2 * R + 2} ${2 * R + 2}" aria-hidden="true">` +
  `<path d="${ORNAMENT_PATH}" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/>` +
  `<circle r="${ORNAMENT_DOT_R}" fill="currentColor"/></svg>`;

/** For the card, which has no CSS: explicit colour and stroke width in its own units. */
export function ornamentShapes(colour: string, strokeWidth: number): string {
  return (
    `<path d="${ORNAMENT_PATH}" fill="none" stroke="${colour}" stroke-width="${strokeWidth}"/>` +
    `<circle r="${ORNAMENT_DOT_R}" fill="${colour}"/>`
  );
}
