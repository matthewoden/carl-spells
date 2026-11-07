import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { fitSize, MAX_SIZE } from './fit';

const FONT = '700 100px "Cormorant Garamond"';
let ctx: CanvasRenderingContext2D | null = null;

/** Width of `text` in Cormorant Garamond 700 at 100px, no tracking. */
export function measure(text: string): number {
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * 50;
  ctx.font = FONT;
  return ctx.measureText(text).width;
}

/** Largest font size (≤ 58px) at which `text` fits the element's width in ≤ 3 lines. */
export function useFitSize(text: string, ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  // Bumped once the webfont is in, so measurements use Cormorant rather than the fallback.
  const [, setFontsReady] = useState(false);

  useEffect(() => {
    let live = true;
    document.fonts.load(FONT).then(() => live && setFontsReady(true), () => {});
    return () => { live = false; };
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  // 2px of slack: canvas and DOM text metrics differ by a hair between engines.
  return width ? fitSize(text, width - 2, measure) : MAX_SIZE;
}
