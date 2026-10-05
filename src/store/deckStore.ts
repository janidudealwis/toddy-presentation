import { create } from 'zustand';
import type { Candidate, Category, Deck } from '../types';
import { seedDeck } from '../data/seed';
import { deckSchema } from '../lib/deckSchema';
import { deleteImage, pruneImages } from './imageStore';

const STORAGE_KEY = 'toddy.deck.v1';
const CHANNEL = 'toddy.deck';

/**
 * The deck, its edits, and its persistence.
 *
 * Saves are debounced because every keystroke in a title field is an edit, and a deck is
 * re-serialised whole. 300ms is short enough that closing the tab after typing keeps the
 * change and long enough that typing a title is one write rather than twenty.
 */

const id = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const newCandidate = (name = ''): Candidate => ({ id: id('c'), name, imageId: null });

const newCategory = (): Category => ({
  id: id('cat'),
  title: '',
  subtitle: 'Category',
  candidates: [newCandidate(), newCandidate()],
  winnerId: null,
});

function load(): Deck {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDeck();

    const parsed = deckSchema.safeParse(JSON.parse(raw));
    // A deck that no longer validates is kept on disk, not overwritten — the seed is shown
    // instead, so a bad migration is recoverable by hand rather than silently destroyed.
    if (!parsed.success) {
      console.warn('Stored deck did not validate; starting from the seed deck.', parsed.error);
      return seedDeck();
    }
    return parsed.data;
  } catch {
    return seedDeck();
  }
}

/**
 * Tells other tabs the deck changed. The presenter listens and offers a reload rather than
 * hot-swapping, because the admin is often open on the same machine during a show and a
 * slide changing under the presenter mid-sentence is worse than a stale one.
 */
const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

let saveTimer: ReturnType<typeof setTimeout> | undefined;

type DeckStore = {
  deck: Deck;
  saved: boolean;

  /** Applies an edit and schedules a save. */
  edit: (fn: (deck: Deck) => Deck) => void;
  /** Replaces the deck wholesale — import, reset, or a cross-tab reload. */
  replace: (deck: Deck, options?: { announce?: boolean }) => void;
  reset: () => void;
  reload: () => void;

  addCategory: () => string;
  updateCategory: (categoryId: string, patch: Partial<Category>) => void;
  duplicateCategory: (categoryId: string) => void;
  removeCategory: (categoryId: string) => void;
  moveCategory: (from: number, to: number) => void;

  addCandidate: (categoryId: string, name?: string) => void;
  addCandidates: (categoryId: string, candidates: Candidate[]) => void;
  updateCandidate: (categoryId: string, candidateId: string, patch: Partial<Candidate>) => void;
  duplicateCandidate: (categoryId: string, candidateId: string) => void;
  removeCandidate: (categoryId: string, candidateId: string) => void;
  moveCandidate: (categoryId: string, from: number, to: number) => void;
  setWinner: (categoryId: string, candidateId: string | null) => void;
};

export const useDeck = create<DeckStore>((set, get) => {
  const persist = () => {
    clearTimeout(saveTimer);
    set({ saved: false });

    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(get().deck));
        set({ saved: true });
        channel?.postMessage({ type: 'deck-changed' });
      } catch (err) {
        // The usual cause is a full quota, which is worth seeing rather than swallowing:
        // the admin's "Saved" indicator stays off, and this says why.
        console.error('Could not save the deck.', err);
      }
    }, 300);
  };

  const mapCategory = (categoryId: string, fn: (c: Category) => Category) => {
    get().edit((deck) => ({
      ...deck,
      categories: deck.categories.map((c) => (c.id === categoryId ? fn(c) : c)),
    }));
  };

  return {
    deck: load(),
    saved: true,

    edit: (fn) => {
      set((state) => ({ deck: fn(state.deck) }));
      persist();
    },

    replace: (deck, options) => {
      set({ deck });
      if (options?.announce === false) {
        // A deck arriving from another tab is already on disk; writing it back would bounce
        // the message straight back to the sender.
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
        set({ saved: true });
      } else {
        persist();
      }
    },

    reset: () => {
      void pruneImages(new Set());
      get().replace(seedDeck());
    },

    reload: () => set({ deck: load() }),

    addCategory: () => {
      const category = newCategory();
      get().edit((deck) => ({ ...deck, categories: [...deck.categories, category] }));
      return category.id;
    },

    updateCategory: (categoryId, patch) => mapCategory(categoryId, (c) => ({ ...c, ...patch })),

    duplicateCategory: (categoryId) =>
      get().edit((deck) => {
        const index = deck.categories.findIndex((c) => c.id === categoryId);
        if (index < 0) return deck;

        const source = deck.categories[index];
        // Candidates get fresh ids but keep imageId: two candidates pointing at one image is
        // fine, because images are only deleted once nothing references them (pruneImages).
        const idMap = new Map(source.candidates.map((c) => [c.id, id('c')]));
        const copy: Category = {
          ...source,
          id: id('cat'),
          candidates: source.candidates.map((c) => ({ ...c, id: idMap.get(c.id)! })),
          winnerId: source.winnerId ? idMap.get(source.winnerId) ?? null : null,
        };

        const categories = [...deck.categories];
        categories.splice(index + 1, 0, copy);
        return { ...deck, categories };
      }),

    removeCategory: (categoryId) => {
      get().edit((deck) => ({
        ...deck,
        categories: deck.categories.filter((c) => c.id !== categoryId),
      }));
      void pruneImages(liveImageIds(get().deck));
    },

    moveCategory: (from, to) =>
      get().edit((deck) => ({ ...deck, categories: reorder(deck.categories, from, to) })),

    addCandidate: (categoryId, name = '') =>
      mapCategory(categoryId, (c) =>
        // 10 is the layout's ceiling (spec §6.2) — past that the medallions no longer fit
        // two rows on the stage.
        c.candidates.length >= 10 ? c : { ...c, candidates: [...c.candidates, newCandidate(name)] },
      ),

    addCandidates: (categoryId, candidates) =>
      mapCategory(categoryId, (c) => ({
        ...c,
        candidates: [...c.candidates, ...candidates].slice(0, 10),
      })),

    updateCandidate: (categoryId, candidateId, patch) =>
      mapCategory(categoryId, (c) => ({
        ...c,
        candidates: c.candidates.map((cand) =>
          cand.id === candidateId ? { ...cand, ...patch } : cand,
        ),
      })),

    duplicateCandidate: (categoryId, candidateId) =>
      mapCategory(categoryId, (c) => {
        const index = c.candidates.findIndex((cand) => cand.id === candidateId);
        if (index < 0 || c.candidates.length >= 10) return c;

        const candidates = [...c.candidates];
        candidates.splice(index + 1, 0, { ...c.candidates[index], id: id('c') });
        return { ...c, candidates };
      }),

    removeCandidate: (categoryId, candidateId) => {
      const category = get().deck.categories.find((c) => c.id === categoryId);
      const gone = category?.candidates.find((c) => c.id === candidateId);

      mapCategory(categoryId, (c) => ({
        ...c,
        candidates: c.candidates.filter((cand) => cand.id !== candidateId),
        winnerId: c.winnerId === candidateId ? null : c.winnerId,
      }));

      // Only drop the bytes if no other candidate shares the image (duplicates do).
      if (gone?.imageId && !liveImageIds(get().deck).has(gone.imageId)) {
        void deleteImage(gone.imageId);
      }
    },

    moveCandidate: (categoryId, from, to) =>
      mapCategory(categoryId, (c) => ({ ...c, candidates: reorder(c.candidates, from, to) })),

    setWinner: (categoryId, candidateId) =>
      mapCategory(categoryId, (c) => ({ ...c, winnerId: candidateId })),
  };
});

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function reorder<T>(list: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export const liveImageIds = (deck: Deck) =>
  new Set(
    deck.categories.flatMap((c) =>
      c.candidates.map((cand) => cand.imageId).filter((v): v is string => Boolean(v)),
    ),
  );

/**
 * Subscribes to deck changes made in another tab. The presenter uses this to show a reload
 * prompt; the admin uses it to stay in step with a second admin tab.
 */
export function onDeckChanged(fn: () => void) {
  if (!channel) return () => {};
  const handler = (e: MessageEvent) => {
    if (e.data?.type === 'deck-changed') fn();
  };
  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
}
