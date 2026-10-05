import { useLayoutEffect, useRef, useState } from 'react';
import type { Category } from '../types';
import { STAGE_H, STAGE_W } from '../lib/useStageScale';
import { Scene } from '../presenter/parts/Scene';
import { TitleSlide } from '../presenter/slides/TitleSlide';
import { CandidatesSlide } from '../presenter/slides/CandidatesSlide';
import { WinnerSlide } from '../presenter/slides/WinnerSlide';

/**
 * The three slides for this category, live.
 *
 * These are the real slide components at the real 1920×1080, scaled down — not a mock-up and
 * not a screenshot. That is the point: a mock-up drifts from what the projector shows, and
 * drift is exactly what you cannot afford to discover during the event. The cost is that the
 * fit-text hooks re-measure at preview scale too, which is why they observe their box.
 */
export function MiniPreview({ category }: { category: Category }) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="font-display text-xl text-gold">Preview</h2>
        <p className="m-0 text-xs font-semibold text-cream-mute">
          The real slides, scaled down.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Frame label="1 · Title">
          <TitleSlide category={category} />
        </Frame>
        <Frame label="2 · Candidates">
          <CandidatesSlide category={category} />
        </Frame>
        <Frame label="3 · Winner">
          <WinnerSlide category={category} />
        </Frame>
      </div>
    </section>
  );
}

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  // Measured rather than fixed, because the three frames reflow from one column to three.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const measure = () => setScale(el.clientWidth / STAGE_W);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <figure className="m-0 grid gap-1.5">
      <figcaption className="text-xs font-black uppercase tracking-wider text-cream-mute">
        {label}
      </figcaption>

      <div
        ref={boxRef}
        className="relative w-full overflow-hidden rounded-xl border-2 border-bark-line bg-night"
        style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
      >
        {/* Rendered only once the scale is known — at scale 0 the fit hooks would measure a
            zero-width box and shrink every title to its minimum. */}
        {scale > 0 && (
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}
          >
            <Scene />
            <div className="absolute inset-0">{children}</div>
          </div>
        )}
      </div>
    </figure>
  );
}
