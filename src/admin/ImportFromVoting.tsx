import { useState } from 'react';
import type { Candidate, Category, Deck } from '../types';
import { liveImageIds, useDeck } from '../store/deckStore';
import { dataUrlToBlob, newImageId, pruneImages, putImage } from '../store/imageStore';
import { Button, ErrorNote, WarnNote } from '../components/ui';

/**
 * Builds a deck from the live voting site's published results.
 *
 * The fetch goes through this app's own /api/import rather than straight at the voting site,
 * because the voting server sends no CORS headers — see api/import.js for the full reasoning.
 * The handler also brings the photos back as base64, which is what lets them be stored as
 * Blobs here and shown later with the network unplugged.
 */

type Incoming = {
  origin: string;
  categories: {
    id: number;
    title: string;
    totalVotes: number;
    candidates: { id: number; name: string; votes: number; isLeader: boolean; photoUrl: string | null }[];
  }[];
  photos: Record<string, string>;
  failed: { url: string; reason: string }[];
};

export function ImportFromVoting({
  onClose,
  onPicked,
}: {
  onClose: () => void;
  onPicked: (categoryId: string) => void;
}) {
  const replace = useDeck((s) => s.replace);
  const deck = useDeck((s) => s.deck);

  const [origin, setOrigin] = useState('toddya.vercel.app');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<Incoming | null>(null);

  async function look() {
    setBusy(true);
    setError(null);
    setFound(null);

    try {
      const res = await fetch(`/api/import?origin=${encodeURIComponent(origin.trim())}`);
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? `The import failed (${res.status}).`);
        return;
      }
      if (!body.categories.length) {
        setError(
          'That site answered, but no categories have published results yet. In the voting ' +
            'admin, open each category and tick “Publish to voters”, then try again.',
        );
        return;
      }

      setFound(body as Incoming);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The import failed.');
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!found) return;
    setBusy(true);

    try {
      // Photos are stored first so the deck never references bytes that are not in yet. One
      // image id per distinct source URL, so two candidates sharing a photo share the blob.
      const idByUrl = new Map<string, string>();

      for (const [url, dataUrl] of Object.entries(found.photos)) {
        const imageId = newImageId();
        await putImage(imageId, await dataUrlToBlob(dataUrl));
        idByUrl.set(url, imageId);
      }

      const categories: Category[] = found.categories.map((category) => {
        const candidates: Candidate[] = category.candidates.map((candidate) => ({
          id: `v${category.id}-${candidate.id}`,
          name: candidate.name,
          imageId: candidate.photoUrl ? idByUrl.get(candidate.photoUrl) ?? null : null,
        }));

        // isLeader can be true for several candidates on a genuine tie — the voting site is
        // deliberate about not picking one. Take the first and let the warning say so.
        const leaderIndex = category.candidates.findIndex((c) => c.isLeader);

        return {
          id: `vcat-${category.id}`,
          title: category.title,
          // The voting site has no notion of script; everything there is the legacy Sinhala face.
          titleScript: 'sinhala' as const,
          subtitle: 'Category',
          candidates,
          winnerId: leaderIndex >= 0 ? candidates[leaderIndex].id : null,
        };
      });

      const next: Deck = { ...deck, categories };
      replace(next);
      await pruneImages(liveImageIds(next));

      if (categories[0]) onPicked(categories[0].id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Those results could not be applied.');
    } finally {
      setBusy(false);
    }
  }

  const ties = found?.categories.filter((c) => c.candidates.filter((x) => x.isLeader).length > 1) ?? [];
  const noVotes = found?.categories.filter((c) => c.totalVotes === 0) ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import from the voting site"
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-night-deep/90 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="grid w-full max-w-xl gap-4 rounded-card border-2 border-bark-line bg-[#241005] p-5">
        <div>
          <h2 className="font-display text-2xl text-gold">Import from the voting site</h2>
          <p className="m-0 mt-1 text-xs font-semibold leading-relaxed text-cream-mute">
            Pulls the categories, candidates, photos and the winner of each from the live vote.
            Only categories whose results you have published appear. Everything stays editable
            afterwards, and the photos are copied in — so this works offline later.
          </p>
        </div>

        <label className="grid gap-1.5">
          <span className="text-sm font-extrabold text-cream-dim">Voting site address</span>
          <div className="flex gap-2">
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void look();
                e.stopPropagation();
              }}
              placeholder="toddya.vercel.app"
              className="min-h-12 flex-1 rounded-xl border-2 border-bark-line bg-[#2a1206] px-4 font-bold text-cream placeholder:text-cream-mute/50 focus:border-gold focus:outline-none"
            />
            <Button busy={busy && !found} disabled={!origin.trim()} onClick={() => void look()}>
              Look
            </Button>
          </div>
        </label>

        {error && <ErrorNote>{error}</ErrorNote>}

        {found && (
          <div className="grid gap-3">
            <div className="rounded-xl border-2 border-leaf/40 bg-[#16300a] px-4 py-3">
              <p className="m-0 text-sm font-extrabold text-leaf-light">
                Found {found.categories.length}{' '}
                {found.categories.length === 1 ? 'category' : 'categories'} and{' '}
                {found.categories.reduce((n, c) => n + c.candidates.length, 0)} candidates.
              </p>
            </div>

            <ul className="grid max-h-56 list-none gap-1.5 overflow-y-auto p-0">
              {found.categories.map((category) => {
                const leader = category.candidates.find((c) => c.isLeader);
                return (
                  <li
                    key={category.id}
                    className="flex items-baseline justify-between gap-3 rounded-lg bg-[#1d0d03] px-3 py-2"
                  >
                    <span className="sinhala min-w-0 truncate text-base text-cream">
                      {category.title}
                    </span>
                    <span className="shrink-0 text-xs font-bold text-cream-mute">
                      {category.candidates.length} ·{' '}
                      <span className="sinhala text-sm text-gold">{leader?.name ?? 'no winner'}</span>
                    </span>
                  </li>
                );
              })}
            </ul>

            {ties.length > 0 && (
              <WarnNote>
                {ties.length === 1 ? 'One category is' : `${ties.length} categories are`} tied at the
                top. The first of the tied candidates is set as the winner — change it by hand
                after importing.
              </WarnNote>
            )}

            {noVotes.length > 0 && (
              <WarnNote>
                {noVotes.length === 1 ? 'One category has' : `${noVotes.length} categories have`} no
                votes yet, so no winner could be read from them.
              </WarnNote>
            )}

            {found.failed.length > 0 && (
              <WarnNote>
                {found.failed.length} photo{found.failed.length === 1 ? '' : 's'} could not be
                fetched. Those candidates will show the placeholder — add a photo by hand.
              </WarnNote>
            )}

            <WarnNote>
              This replaces all {deck.categories.length} categories in the current deck. Export a
              backup first if you need one.
            </WarnNote>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          {found && (
            <Button busy={busy} onClick={() => void apply()}>
              Replace deck with these
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
