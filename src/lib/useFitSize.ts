import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { fitSize, MAX_SIZE, MIN_SIZE } from './fit';

const FONT = '700 100px "Cormorant Garamond"';
let probe: HTMLSpanElement | null = null;

/** Width of `text` in Cormorant Garamond 700 at 100px, no tracking, measured with the same
 *  DOM text layout the field uses. */
export function measure(text: string): number {
  if (!probe) {
    probe = document.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      `position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;font:${FONT};letter-spacing:0`;
    document.body.append(probe);
  }
  probe.textContent = text;
  return probe.getBoundingClientRect().width;
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

  if (!width) return MAX_SIZE;
  // 2px of slack: text metrics differ by a hair between engines.
  let size = fitSize(text, width - 2, measure);
  // Widths don't scale exactly with size: at real sizes the browser rounds each glyph's
  // advance, so an 11-letter word can run ~5px wider than the 100px measurement predicts
  // ("Thaumaturgy" wrapped on an iPhone). Check the widest word at the chosen size and step
  // down until it really fits on one line.
  const words = text.split(/\s+/).filter(Boolean);
  while (size > MIN_SIZE && Math.max(0, ...words.map((w) => measureAt(w, size))) > width - 1) size--;
  return size;
}

/** Width of `text` as the field renders it: Cormorant 700 at `size`px, -0.01em tracking. */
function measureAt(text: string, size: number): number {
  measure(''); // creates the probe
  const p = probe!;
  p.style.fontSize = `${size}px`;
  p.style.letterSpacing = '-0.01em';
  p.textContent = text;
  const w = p.getBoundingClientRect().width;
  p.style.fontSize = '100px';
  p.style.letterSpacing = '0';
  return w;
}
