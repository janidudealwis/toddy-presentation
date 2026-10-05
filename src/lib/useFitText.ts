import { useLayoutEffect, useRef, useState } from 'react';

type Options = {
  /** Starting size in stage pixels. The text never grows past this. */
  max: number;
  /** Never go below this, even if the text still overflows. */
  min: number;
  /** How many lines the text may legally occupy. */
  lines: number;
  /** Step down by this many pixels per attempt. */
  step?: number;
  /**
   * The text being fitted. Changing it re-runs the fit — a ResizeObserver on the box never
   * fires for new content in an unchanged box, so without this a longer title would inherit
   * the previous one's size and overflow.
   */
  text: string;
};

/**
 * Shrinks text until it fits its box.
 *
 * Needed because category titles and winner names are arbitrary length but the planks they
 * sit on are fixed — a two-word title wants 150px and a seven-word one wants 70px, and on a
 * projector in front of an audience neither clipping nor a scrollbar is an option.
 *
 * It measures rather than estimating from character count, because the Sinhala face has no
 * usable relationship between codepoint count and rendered width: one legacy codepoint can
 * draw a wide conjunct and the next can draw a narrow vowel sign. A ch-based estimate was
 * wrong by a factor of two on real titles.
 *
 * The loop is a plain descending scan rather than a binary search. The range is ~90px at a
 * 4px step, so worst case is about 22 synchronous reflows of a single element — cheaper than
 * the bookkeeping, and it runs once per slide rather than per frame.
 */
export function useFitText<T extends HTMLElement>({ max, min, lines, step = 4, text }: Options) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState(max);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      // Measure against the parent: the element itself is what is being resized, so its
      // own box is not a stable reference to fit inside of.
      const box = el.parentElement;
      if (!box) return;

      let next = max;
      el.style.fontSize = `${next}px`;

      const fits = () => {
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || next * 1.18;
        // +1px of slack: sub-pixel line heights otherwise report a 2.02-line block as
        // three lines and shrink perfectly good text one step too far.
        const withinHeight = el.scrollHeight <= lineHeight * lines + 1;
        const withinWidth = el.scrollWidth <= box.clientWidth + 1;
        return withinHeight && withinWidth;
      };

      while (next > min && !fits()) {
        next -= step;
        el.style.fontSize = `${next}px`;
      }

      setSize(next);
    };

    fit();

    // The stage is a fixed 1920 so the box rarely changes — but the admin's mini preview
    // renders these same components at arbitrary scale, and a font landing late changes
    // every measurement taken before it.
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement ?? el);
    void document.fonts?.ready.then(fit);

    return () => observer.disconnect();
  }, [max, min, lines, step, text]);

  return { ref, size };
}
