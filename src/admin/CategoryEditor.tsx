import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Category } from '../types';
import { isPlayable } from '../types';
import { newCandidate, useDeck } from '../store/deckStore';
import { newImageId, putImage } from '../store/imageStore';
import { ImageError, loadPhoto, renderCrop } from '../lib/image';
import { Button, ErrorNote, WarnNote } from '../components/ui';
import { CandidateRow } from './CandidateRow';
import { MiniPreview } from './MiniPreview';
import { TitleField } from './TitleField';

/** Filenames become names: "kasun-perera.jpg" → "kasun perera". */
const nameFromFile = (file: File) =>
  file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();

export function CategoryEditor({ category }: { category: Category }) {
  const updateCategory = useDeck((s) => s.updateCategory);
  const addCandidate = useDeck((s) => s.addCandidate);
  const addCandidates = useDeck((s) => s.addCandidates);
  const moveCandidate = useDeck((s) => s.moveCandidate);

  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [dropActive, setDropActive] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    moveCandidate(
      category.id,
      category.candidates.findIndex((c) => c.id === active.id),
      category.candidates.findIndex((c) => c.id === over.id),
    );
  };

  /**
   * Bulk drop. Each file goes through the same resize-and-square pipeline a single upload
   * does, framed centre-upper by default — a dropped batch is a starting point, and any one
   * of them can be re-framed afterwards from its row.
   */
  async function onBulkFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) {
      setBulkError('Those were not image files. Drop JPEG, PNG or WebP.');
      return;
    }

    const room = 10 - category.candidates.length;
    if (room <= 0) {
      setBulkError('This category already has 10 candidates, which is the most a slide holds.');
      return;
    }

    setBulkBusy(true);
    setBulkError(null);

    const added = [];
    const failures: string[] = [];

    for (const file of images.slice(0, room)) {
      try {
        const photo = await loadPhoto(file);
        try {
          const size = Math.min(photo.width, photo.height);
          const crop = {
            x: Math.round((photo.width - size) / 2),
            // Faces sit in the upper part of a portrait, so an untouched square starts high
            // rather than dead centre.
            y: Math.round((photo.height - size) * 0.25),
            size,
          };

          const blob = await renderCrop(photo, crop);
          const imageId = newImageId();
          await putImage(imageId, blob);

          added.push({ ...newCandidate(nameFromFile(file)), imageId });
        } finally {
          URL.revokeObjectURL(photo.url);
        }
      } catch (err) {
        failures.push(`${file.name}: ${err instanceof ImageError ? err.message : 'could not be read'}`);
      }
    }

    if (added.length) addCandidates(category.id, added);
    if (failures.length) setBulkError(failures.join(' · '));
    if (images.length > room) {
      setBulkError(`Only ${room} more would fit — a slide holds 10 candidates.`);
    }

    setBulkBusy(false);
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-5 rounded-card border-2 border-bark-line bg-[#241005] p-5">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <TitleField category={category} />

          <label className="grid gap-1.5 self-start">
            <span className="text-sm font-extrabold text-cream-dim">Label above it (English)</span>
            <input
              value={category.subtitle ?? ''}
              onChange={(e) => updateCategory(category.id, { subtitle: e.target.value })}
              placeholder="Category"
              className="min-h-14 w-full rounded-xl border-2 border-bark-line bg-[#2a1206] px-4 font-bold uppercase tracking-wider text-cream placeholder:normal-case placeholder:tracking-normal placeholder:text-cream-mute/50 focus:border-gold focus:outline-none"
            />
          </label>
        </div>

        <p className="m-0 text-xs font-semibold leading-relaxed text-cream-mute">
          A Sinhala title uses the same legacy font as the voting site, so type it the way you
          type it there — plain English letters come out as Sinhala shapes. Switch the title to
          English with the toggle, or mix the two by selecting part of it and setting just that
          part in the other script.
        </p>

        {!isPlayable(category) && (
          <WarnNote>
            This category needs at least 2 candidates to play. It is skipped in the show until
            then.
          </WarnNote>
        )}
        {isPlayable(category) && !category.winnerId && (
          <WarnNote>
            No winner chosen. The reveal will say “Winner not set”.
          </WarnNote>
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl text-gold">
            Candidates <span className="text-cream-mute">({category.candidates.length}/10)</span>
          </h2>
          <Button
            variant="outline"
            size="sm"
            disabled={category.candidates.length >= 10}
            onClick={() => addCandidate(category.id)}
          >
            Add candidate
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={category.candidates.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="grid list-none gap-2 p-0">
              {category.candidates.map((candidate) => (
                <CandidateRow
                  key={candidate.id}
                  categoryId={category.id}
                  candidate={candidate}
                  isWinner={category.winnerId === candidate.id}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        {!category.candidates.length && (
          <p className="rounded-2xl border-2 border-dashed border-gold/25 bg-[#201002] px-4 py-8 text-center text-sm font-semibold text-cream-mute">
            No candidates yet. Add them one at a time, or drop a folder of photos below.
          </p>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDropActive(true);
          }}
          onDragLeave={() => setDropActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDropActive(false);
            void onBulkFiles([...e.dataTransfer.files]);
          }}
          className={
            'rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors ' +
            (dropActive ? 'border-gold bg-[#33200a]' : 'border-bark-line bg-[#1d0d03]')
          }
        >
          <p className="m-0 text-sm font-extrabold text-cream-dim">
            {bulkBusy ? 'Processing photos…' : 'Drop several photos here to add them as candidates'}
          </p>
          <p className="m-0 mt-1 text-xs font-semibold text-cream-mute">
            Each one is named from its filename, and framed centre-upper — adjust either
            afterwards.
          </p>
        </div>

        {bulkError && <ErrorNote>{bulkError}</ErrorNote>}
      </section>

      <MiniPreview category={category} />
    </div>
  );
}
