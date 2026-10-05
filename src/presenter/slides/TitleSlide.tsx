import type { Category } from '../../types';
import { useFitText } from '../../lib/useFitText';
import { Logo } from '../parts/Leaf';
import { Plank } from '../parts/Plank';
import { ScriptText } from '../parts/ScriptText';

/**
 * Slide 1 — the category name, big, on a hanging signboard.
 *
 * The title auto-fits from 150px down to 64px across at most two lines. A category like
 * "Most Valuable Player of the Season" is four times the width of "Best Six" and both have
 * to sit on the same 1300px plank.
 */
export function TitleSlide({ category }: { category: Category }) {
  const subtitle = category.subtitle?.trim() || 'Category';

  const { ref, size } = useFitText<HTMLHeadingElement>({
    max: 150,
    min: 64,
    lines: 2,
    text: category.title,
  });

  return (
    <div className="relative size-full">
      {/*
        The logo is pinned near the top rather than stacked above the sign in a flex column.
        In a column the two centre as one group, which puts the sign — the thing the slide is
        actually about — visibly below the middle of the frame. Pinning the logo takes it out
        of the sign's way, so the sign can own the centre and stay there whether its title
        runs to one line or two.
      */}
      <Logo
        width={340}
        className="absolute left-1/2 top-12 -translate-x-1/2 [animation:fade-up_500ms_ease-out_150ms_both]"
      />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Plank width={1420} animate>
          <span
            className="font-sans uppercase text-ink-soft"
            style={{
              fontSize: 28,
              fontWeight: 900,
              // English only, so tracking is safe here. It would not be on the title below:
              // letter-spacing breaks the legacy face's conjuncts apart.
              letterSpacing: 3,
            }}
          >
            {subtitle}
          </span>

          <h1 ref={ref} className="topic mt-2 block w-full break-words" style={{ fontSize: size }}>
            {category.title ? (
              <ScriptText text={category.title} script={category.titleScript ?? 'sinhala'} />
            ) : (
              '—'
            )}
          </h1>
        </Plank>
      </div>
    </div>
  );
}
