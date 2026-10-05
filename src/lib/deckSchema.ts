import { z } from 'zod';

/**
 * Validation for anything entering the app from outside — an imported file, or a deck
 * read back out of localStorage that an older build (or a hand edit) wrote.
 *
 * Parsing on the way in rather than trusting the shape is what keeps a bad file from
 * half-applying: the deck is replaced only once the whole thing validates.
 */

const candidate = z.object({
  id: z.string().min(1),
  name: z.string(),
  imageId: z.string().min(1).nullable(),
});

const category = z.object({
  id: z.string().min(1),
  title: z.string(),
  // Optional, not defaulted: decks written before mixed-script titles existed are all Sinhala,
  // and that is exactly what an absent value means at the point of use.
  titleScript: z.enum(['sinhala', 'english']).optional(),
  subtitle: z.string().optional(),
  candidates: z.array(candidate),
  winnerId: z.string().nullable(),
});

export const deckSchema = z
  .object({
    version: z.literal(1),
    eventName: z.string().default(''),
    // Defaulted rather than required: these two arrived after the first decks were saved,
    // and an export from that build must still import.
    bookends: z.boolean().default(true),
    // Not defaulted, so "absent" stays distinguishable from "explicitly false" long enough
    // for the rename below to resolve it.
    hideCursorWhenIdle: z.boolean().optional(),
    /** The name this setting had while the slides still carried on-screen Back/Next buttons.
        Accepted so a deck exported before that was removed still imports. */
    autoHideControls: z.boolean().optional(),
    categories: z.array(category),
  })
  // A winnerId pointing at a deleted candidate would leave the winner slide revealing
  // nothing with no way to tell from the admin that it is broken, so it is cleared here.
  .transform(({ autoHideControls, ...deck }) => ({
    ...deck,
    hideCursorWhenIdle: deck.hideCursorWhenIdle ?? autoHideControls ?? true,
    categories: deck.categories.map((c) => ({
      ...c,
      winnerId: c.candidates.some((cand) => cand.id === c.winnerId) ? c.winnerId : null,
    })),
  }));

/** The export file: a deck plus the image bytes it refers to, so one file is the whole deck. */
export const deckFileSchema = z.object({
  kind: z.literal('toddy-presentation-deck'),
  exportedAt: z.string().optional(),
  deck: deckSchema,
  /** imageId → data URL. */
  images: z.record(z.string(), z.string().startsWith('data:')).default({}),
});

export type DeckFile = z.infer<typeof deckFileSchema>;

/** Turns a ZodError into one line a person can act on. */
export function describeIssue(error: unknown): string {
  if (error instanceof z.ZodError) {
    const first = error.issues[0];
    if (!first) return 'That file is not a valid deck.';
    const where = first.path.length ? ` at ${first.path.join('.')}` : '';
    return `That file is not a valid deck${where}: ${first.message}.`;
  }
  return error instanceof Error ? error.message : 'That file could not be read.';
}
