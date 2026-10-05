import { useRef, useState } from 'react';
import type { Deck } from '../types';
import { liveImageIds, useDeck } from '../store/deckStore';
import {
  blobToDataUrl,
  dataUrlToBlob,
  getImageBlob,
  pruneImages,
  putImage,
} from '../store/imageStore';
import { deckFileSchema, describeIssue } from '../lib/deckSchema';
import { Button, ErrorNote } from '../components/ui';
import { ImportFromVoting } from './ImportFromVoting';

/**
 * Export, import and reset.
 *
 * Export inlines the images as base64 so one file is the whole deck — the alternative, a zip
 * or a folder, is one more thing to lose between the laptop it was made on and the one it is
 * presented from. It is also the only backup that exists, there being no server.
 */
export function ImportExport({ onPicked }: { onPicked: (categoryId: string) => void }) {
  const deck = useDeck((s) => s.deck);
  const replace = useDeck((s) => s.replace);
  const reset = useDeck((s) => s.reset);

  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  async function exportDeck() {
    setBusy('Exporting');
    setError(null);

    try {
      const images: Record<string, string> = {};

      for (const imageId of liveImageIds(deck)) {
        const blob = await getImageBlob(imageId);
        // A missing blob is skipped rather than fatal: the deck still imports, and that
        // candidate falls back to the silhouette.
        if (blob) images[imageId] = await blobToDataUrl(blob);
      }

      const file = {
        kind: 'toddy-presentation-deck',
        exportedAt: new Date().toISOString(),
        deck,
        images,
      };

      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      download(`toddy-deck-${stamp}.json`, JSON.stringify(file));
    } catch (err) {
      setError(describeIssue(err));
    } finally {
      setBusy(null);
    }
  }

  async function importDeck(file: File) {
    setBusy('Importing');
    setError(null);

    try {
      const parsed = deckFileSchema.safeParse(JSON.parse(await file.text()));

      if (!parsed.success) {
        // Nothing has been written at this point, so a bad file genuinely changes nothing.
        setError(describeIssue(parsed.error));
        return;
      }

      const { deck: incoming, images } = parsed.data;

      if (
        !confirm(
          `Replace the current deck with ${incoming.categories.length} categories from this file? ` +
            'What is here now will be gone.',
        )
      ) {
        return;
      }

      // Images first: a deck referencing bytes that are not in yet would render empty discs
      // for as long as the writes took.
      for (const [imageId, dataUrl] of Object.entries(images)) {
        await putImage(imageId, await dataUrlToBlob(dataUrl));
      }

      replace(incoming as Deck);
      await pruneImages(liveImageIds(incoming as Deck));

      if (incoming.categories[0]) onPicked(incoming.categories[0].id);
    } catch (err) {
      setError(describeIssue(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
        From voting site
      </Button>

      <Button variant="outline" size="sm" busy={busy === 'Exporting'} onClick={() => void exportDeck()}>
        Export
      </Button>

      <Button
        variant="outline"
        size="sm"
        busy={busy === 'Importing'}
        onClick={() => fileInput.current?.click()}
      >
        Import
      </Button>

      <Button
        variant="danger"
        size="sm"
        onClick={() => {
          if (confirm('Discard this deck and start from the sample category?')) reset();
        }}
      >
        Reset
      </Button>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void importDeck(file);
        }}
      />

      {error && (
        <div className="w-full">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {showImport && (
        <ImportFromVoting onClose={() => setShowImport(false)} onPicked={onPicked} />
      )}
    </>
  );
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
