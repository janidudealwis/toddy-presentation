import type { Category } from '../../types';
import { useFitText } from '../../lib/useFitText';
import { useImageUrls } from '../../lib/useImageUrls';
import { Logo } from '../parts/Leaf';
import { Medallion } from '../parts/Medallion';
import { Ribbon } from '../parts/Ribbon';
import { Confetti } from '../parts/Confetti';
import { ScriptText } from '../parts/ScriptText';

/**
 * Slide 3 — the winner. The voting site's "Vote cast" screen, scaled to the stage.
 *
 * The winner is on screen the moment the slide arrives; there is no held-back state to press
 * through. The flourish — the pop, the rays, the burst — plays on entry, so arriving at the
 * slide *is* the reveal.
 */

/**
 * Sizes are a vertical budget, not independent choices. The stage is 1080 and this slide has
 * the most to fit on it: logo, medallion, banner, name and category line, one under the next.
 * The spec's 560 medallion was drawn without the name under it and pushed the name off the
 * bottom of the stage, so the medallion gives up what the name needs.
 *
 *   24 top + 152 logo + 8 + 524 medallion block + 20 + 144 name + 12 + 47 category = 931,
 *   leaving ~150 of clear foot under it.
 */
const MEDALLION = 460;
const BLOCK_H = 524;

export function WinnerSlide({ category }: { category: Category }) {
  const winner = category.candidates.find((c) => c.id === category.winnerId) ?? null;
  const urls = useImageUrls([winner?.imageId ?? null]);
  const photoUrl = winner?.imageId ? urls[winner.imageId] ?? null : null;

  // Named "Winner not set" rather than crashing or showing a blank plate: a category with no
  // winner chosen still has to be presentable, and the gap has to be obvious from the room.
  const name = winner ? winner.name || '—' : 'Winner not set';

  return (
    <div className="relative flex size-full flex-col items-center pt-6">
      <Logo width={200} />

      <div className="relative mt-2" style={{ width: 880, height: BLOCK_H }}>
        <div className="absolute left-1/2 top-0 -translate-x-1/2">
          <div
            className="relative"
            style={{ animation: 'medallion-pop 700ms cubic-bezier(0.22, 1.2, 0.36, 1) both' }}
          >
            {/* Centred on the medallion rather than the block, so the burst and the rays
                radiate from the face and not from the middle of the empty space below it. */}
            <span
              aria-hidden="true"
              className="rays absolute left-1/2 top-1/2 size-[1040px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background:
                  'repeating-conic-gradient(from 0deg, rgba(255,206,90,0.30) 0deg 7deg, rgba(255,206,90,0) 7deg 20deg)',
                WebkitMaskImage: 'radial-gradient(circle, #000 25%, transparent 68%)',
                maskImage: 'radial-gradient(circle, #000 25%, transparent 68%)',
                animation: 'rays-spin 60s linear infinite, fade-in 700ms ease-out both',
              }}
            />
            <Confetti seed={hash(category.id)} />

            <Medallion photoUrl={photoUrl} size={MEDALLION} crowned />

            {/* The flash: a white disc over the medallion that burns off as the photo lands.
                Cheaper and steadier than animating a filter on the image itself. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full bg-white"
              style={{ animation: 'flash-out 420ms ease-out both' }}
            />
          </div>
        </div>

        {/* Overlapping the bottom of the medallion, as on the voting site. */}
        <Ribbon
          width={560}
          height={108}
          fontSize={58}
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
        >
          WINNER
        </Ribbon>
      </div>

      <div className="mt-5 flex w-full flex-col items-center px-20">
        <WinnerName name={name} />
        <p
          className="mt-3 text-center text-cream-dim"
          style={{ fontSize: 36, animation: 'fade-up 500ms ease-out 420ms both' }}
        >
          {/* Body copy rather than signage, so an English span here is Nunito, not Lilita One. */}
          <ScriptText text={category.title} script={category.titleScript ?? 'sinhala'} tone="body" />
        </p>
      </div>
    </div>
  );
}

/**
 * The winner's name as carved signage.
 *
 * The stroke is the one thing that cannot be ported verbatim. `.carved` sets a flat 8px, which
 * is drawn for a 42px headline on a phone; at 120px it is proportionally thin, and once the
 * name auto-fits down to 64px on a long one it is proportionally heavy enough to start closing
 * up the legacy face's conjuncts. So it is restated in em here and tracks whatever size the
 * fit lands on.
 */
function WinnerName({ name }: { name: string }) {
  const { ref, size } = useFitText<HTMLHeadingElement>({ max: 112, min: 56, lines: 1, text: name });

  return (
    <h1
      ref={ref}
      className="carved sinhala block w-full break-words text-center leading-[1.2]"
      style={{
        fontSize: size,
        WebkitTextStrokeWidth: '0.062em',
        animation: 'fade-up 500ms ease-out 260ms both',
      }}
    >
      {name}
    </h1>
  );
}

/** Stable per category, so a given reveal's confetti is the same every time it plays. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
