import type { Script } from './lib/script';

/**
 * The deck. Slides are derived from this and never written by hand — adding a category
 * means adding data in /admin.
 *
 * Note there is no crop field on a candidate. The cropper bakes the chosen square into
 * the stored image (see lib/image.ts), so what comes out of IndexedDB is already square
 * and `object-fit: cover` on the circle is exact. Storing crop metadata alongside the
 * image would mean two sources of truth for the same framing.
 */

export type Candidate = {
  id: string;
  /** Sinhala, typed with a legacy keyboard — see the @font-face note in styles/index.css. */
  name: string;
  /** Key into IndexedDB (`img:{imageId}`). null → the placeholder silhouette. */
  imageId: string | null;
};

export type Category = {
  id: string;
  /**
   * Shown big on slide 1. A span wrapped in [[ ]] is set in the other script — see lib/script.ts
   * for why this has to be recorded in the text rather than detected from it.
   */
  title: string;
  /** Which typeface the title is set in. Defaults to Sinhala. */
  titleScript?: Script;
  /** Optional English line above the title. Defaults to "Category". */
  subtitle?: string;
  candidates: Candidate[];
  /** candidate.id, or null → the winner slide reveals "Winner not set". */
  winnerId: string | null;
};

export type Deck = {
  version: 1;
  /** Optional line under the logo on the intro slide. */
  eventName: string;
  /** Intro (logo + event name) and outro ("Thank you!") slides. */
  bookends: boolean;
  /** Hide the mouse pointer after 2.5s of stillness. */
  hideCursorWhenIdle: boolean;
  categories: Category[];
};

/* ── Derived slides ──────────────────────────────────────────────────────── */

export type Slide =
  | { kind: 'intro' }
  | { kind: 'title'; categoryIndex: number }
  | { kind: 'candidates'; categoryIndex: number }
  | { kind: 'winner'; categoryIndex: number }
  | { kind: 'outro' };

/** A category needs two candidates to be worth playing (spec §8.6). */
export const isPlayable = (category: Category) => category.candidates.length >= 2;

/**
 * The play order. Categories that cannot be played are skipped here rather than guarded
 * inside each slide, so the progress readout and the arrow keys agree about what exists.
 */
export function buildSlides(deck: Deck): Slide[] {
  const slides: Slide[] = [];

  if (deck.bookends) slides.push({ kind: 'intro' });

  deck.categories.forEach((category, categoryIndex) => {
    if (!isPlayable(category)) return;
    slides.push(
      { kind: 'title', categoryIndex },
      { kind: 'candidates', categoryIndex },
      { kind: 'winner', categoryIndex },
    );
  });

  if (deck.bookends) slides.push({ kind: 'outro' });

  return slides;
}
