import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * The notched gold ribbon from the voting site's "VOTE CAST!" banner — two stacked layers,
 * a dark one offset behind a bright one, both cut by the same clip-path so the dark edge
 * reads as the ribbon's own shadowed underside.
 */

export const RIBBON_CLIP = 'polygon(0% 0%, 100% 0%, 93% 50%, 100% 100%, 0% 100%, 7% 50%)';

export function Ribbon({
  children,
  width,
  height,
  fontSize,
  className,
}: {
  children: ReactNode;
  width: number;
  height: number;
  fontSize: number;
  className?: string;
}) {
  // The voting site offsets the dark layer by 3px behind a 52px ribbon; scaling keeps that
  // lip proportional at the sizes this uses (254px on a ballot, 560px on the reveal).
  const lip = Math.max(3, Math.round(height * 0.058));

  return (
    // The outer span carries nothing but the caller's positioning, and an inner span owns the
    // containing block for the two layers. Putting `relative` on the root instead would collide
    // with an `absolute` passed in via className — both classes land in the list, the later one
    // in Tailwind's output wins, and the ribbon silently drops back into normal flow.
    <span className={cn('block', className)} style={{ width, height: height + lip }}>
      <span className="relative block size-full">
        <span
          aria-hidden="true"
          className="absolute left-0 bg-night"
          style={{ top: lip, width, height, clipPath: RIBBON_CLIP }}
        />
        <span
          className="wood-bright absolute left-0 top-0 flex items-center justify-center font-display text-carve"
          style={{
            width,
            height,
            clipPath: RIBBON_CLIP,
            fontSize,
            letterSpacing: '0.5px',
          }}
        >
          {children}
        </span>
      </span>
    </span>
  );
}
