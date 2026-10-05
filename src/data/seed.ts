import type { Deck } from '../types';

/**
 * The deck a fresh browser starts with, so the presenter renders something on first load
 * rather than an empty state.
 *
 * The title is typed in the legacy Sinhala mapping, exactly as it would be in the voting
 * admin — read as Unicode these are meaningless Latin letters, which is the point of the
 * note on the @font-face rule in styles/index.css. Rendered in SINHA Samadi 2012 it reads
 * "හොඳම ක්‍රීඩකයා" (best player).
 */
export const seedDeck = (): Deck => ({
  version: 1,
  eventName: 'Toddycs Awards',
  bookends: true,
  hideCursorWhenIdle: true,
  categories: [
    {
      id: 'cat-sample',
      title: 'fydÈu l%Svlhd',
      subtitle: 'Category',
      candidates: [
        { id: 'c1', name: 'ldiqka', imageId: null },
        { id: 'c2', name: 'ksu,a', imageId: null },
        { id: 'c3', name: 'ÿño', imageId: null },
        { id: 'c4', name: 'i÷ka', imageId: null },
        { id: 'c5', name: 'rejdka', imageId: null },
      ],
      winnerId: 'c3',
    },
  ],
});
