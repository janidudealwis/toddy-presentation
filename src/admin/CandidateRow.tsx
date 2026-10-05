import { useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Candidate } from '../types';
import { useDeck } from '../store/deckStore';
import { newImageId, putImage } from '../store/imageStore';
import { useImageUrls } from '../lib/useImageUrls';
import { ImageError, loadPhoto, type LoadedPhoto } from '../lib/image';
import { cn, CameraIcon, CopyIcon, DragIcon, TrashIcon } from '../components/ui';
import { CropModal } from './CropModal';

const ACCEPT = 'image/jpeg,image/png,image/webp';

/** One candidate: photo, name, and whether they won. */
export function CandidateRow({
  categoryId,
  candidate,
  isWinner,
}: {
  categoryId: string;
  candidate: Candidate;
  isWinner: boolean;
}) {
  const updateCandidate = useDeck((s) => s.updateCandidate);
  const duplicateCandidate = useDeck((s) => s.duplicateCandidate);
  const removeCandidate = useDeck((s) => s.removeCandidate);
  const setWinner = useDeck((s) => s.setWinner);

  const urls = useImageUrls([candidate.imageId]);
  const photoUrl = candidate.imageId ? urls[candidate.imageId] ?? null : null;

  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<LoadedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: candidate.id,
  });

  /** Decodes the picked file and opens the cropper. Nothing is stored until it is confirmed. */
  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!ACCEPT.split(',').includes(file.type)) {
      setError('Pick a JPEG, PNG or WebP.');
      return;
    }

    try {
      setPending(await loadPhoto(file));
    } catch (err) {
      setError(err instanceof ImageError ? err.message : 'That image could not be read.');
    }
  }

  async function store(blob: Blob) {
    // Reuse the id on a re-crop, so the deck JSON does not change and nothing is orphaned.
    const imageId = candidate.imageId ?? newImageId();
    await putImage(imageId, blob);
    updateCandidate(categoryId, candidate.id, { imageId });
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-10 opacity-90')}
    >
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-2xl border-2 bg-[#241005] p-3',
          isWinner ? 'border-gold-bright/70 bg-[#2d1806]' : 'border-bark-line',
        )}
      >
        <button
          type="button"
          aria-label="Reorder candidate"
          className="grid size-9 shrink-0 cursor-grab place-items-center rounded-lg text-cream-mute hover:text-gold active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <DragIcon className="size-5" />
        </button>

        {/* Click to upload, or drop a photo straight onto the thumbnail. */}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDropActive(true);
          }}
          onDragLeave={() => setDropActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDropActive(false);
            void pick(e.dataTransfer.files[0]);
          }}
          aria-label={photoUrl ? 'Replace photo' : 'Add photo'}
          className={cn(
            'relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border-[3px] transition-colors',
            dropActive ? 'border-gold' : 'border-bark',
          )}
          style={{ background: 'radial-gradient(circle at 40% 30%, #fffaf0 0%, #f1e0bf 100%)' }}
        >
          {photoUrl ? (
            <img src={photoUrl} alt="" className="size-full object-cover" />
          ) : (
            <svg width="62" height="62" viewBox="0 0 100 100" aria-hidden="true" className="mt-3">
              <circle cx="50" cy="40" r="19" fill="#c9a274" />
              <path d="M12 102c0-24 17-39 38-39s38 15 38 39z" fill="#c9a274" />
            </svg>
          )}
          <span className="absolute bottom-0 grid h-7 w-full place-items-center bg-night/75 text-gold">
            <CameraIcon className="size-4" />
          </span>
        </button>

        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            // Cleared so picking the same file twice in a row still fires onChange.
            e.target.value = '';
          }}
        />

        <div className="grid min-w-[220px] flex-1 gap-2">
          <input
            value={candidate.name}
            onChange={(e) => updateCandidate(categoryId, candidate.id, { name: e.target.value })}
            placeholder="Name (Sinhala)"
            className="sinhala min-h-12 w-full rounded-xl border-2 border-bark-line bg-[#2a1206] px-3 text-xl leading-[1.35] text-cream placeholder:text-sm placeholder:text-cream-mute/50 focus:border-gold focus:outline-none"
          />

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-extrabold text-cream-dim">
              <input
                type="radio"
                // One winner per category: a shared radio group name per category is what the
                // browser needs to enforce that, rather than code.
                name={`winner-${categoryId}`}
                checked={isWinner}
                onChange={() => setWinner(categoryId, candidate.id)}
                className="size-4 accent-gold-bright"
              />
              Winner
            </label>

            {isWinner && (
              <button
                type="button"
                onClick={() => setWinner(categoryId, null)}
                className="text-xs font-bold text-cream-mute underline-offset-2 hover:text-gold hover:underline"
              >
                clear
              </button>
            )}

            {photoUrl && (
              <button
                type="button"
                onClick={() => {
                  // Re-framing starts from the stored square, which is all that is kept — the
                  // original file is gone, so this can only crop further in, never back out.
                  void (async () => {
                    try {
                      const res = await fetch(photoUrl);
                      const blob = await res.blob();
                      setPending(
                        await loadPhoto(new File([blob], 'photo.webp', { type: blob.type })),
                      );
                    } catch {
                      setError('That photo could not be reopened.');
                    }
                  })();
                }}
                className="text-xs font-bold text-cream-mute underline-offset-2 hover:text-gold hover:underline"
              >
                Adjust crop
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Duplicate candidate"
            onClick={() => duplicateCandidate(categoryId, candidate.id)}
            className="grid size-9 place-items-center rounded-lg text-cream-mute hover:text-gold"
          >
            <CopyIcon className="size-[18px]" />
          </button>
          <button
            type="button"
            aria-label="Delete candidate"
            onClick={() => removeCandidate(categoryId, candidate.id)}
            className="grid size-9 place-items-center rounded-lg text-cream-mute hover:text-[#ff8a72]"
          >
            <TrashIcon className="size-[18px]" />
          </button>
        </div>

        {error && (
          <p className="m-0 w-full text-sm font-bold text-[#ffb3a3]" role="alert">
            {error}
          </p>
        )}
      </div>

      {pending && (
        <CropModal
          photo={pending}
          onCancel={() => {
            URL.revokeObjectURL(pending.url);
            setPending(null);
          }}
          onConfirm={async (blob) => {
            await store(blob);
            URL.revokeObjectURL(pending.url);
            setPending(null);
          }}
        />
      )}
    </li>
  );
}
