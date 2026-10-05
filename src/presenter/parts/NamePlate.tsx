import { cn } from '../../lib/cn';
import { useFitText } from '../../lib/useFitText';
import { RIBBON_CLIP } from './Ribbon';

/**
 * The label under a candidate's portrait.
 *
 * Two treatments, because the brief and the voting site disagree. The spec asks for the
 * notched ribbon from the "VOTE CAST!" banner; the voting site actually nails a plain
 * rectangular plank with two screws under each candidate and keeps the notched shape for
 * the banner alone. The spec is the brief for this product so `ribbon` is the default, but
 * `plank` is the exact voting-site treatment — switching is this one constant.
 *
 * Both variants size to their content rather than to a height computed from the font size.
 * A fixed height is fine until a name wraps, at which point the clip-path cuts the second
 * line in half — the box does not grow, so the overflow is simply invisible.
 */
export const NAME_PLATE_VARIANT: 'ribbon' | 'plank' = 'ribbon';

export function NamePlate({
  name,
  width,
  fontSize = 40,
  variant = NAME_PLATE_VARIANT,
  className,
}: {
  name: string;
  width: number;
  fontSize?: number;
  variant?: 'ribbon' | 'plank';
  className?: string;
}) {
  // One line is the goal: shrink to 60% of the asked size chasing it. If it still will not
  // fit, the text wraps and the plate grows to take it — which is the spec's rule (fit to one
  // line, and only wrap once shrinking stops helping) rather than wrapping at full size.
  const { ref, size } = useFitText<HTMLSpanElement>({
    max: fontSize,
    min: Math.round(fontSize * 0.6),
    lines: 1,
    text: name,
  });

  // Chosen so a single line lands on the voting site's proportions (height ≈ 1.65em).
  const padY = Math.round(fontSize * 0.235);
  const lip = Math.max(3, Math.round(fontSize * 0.096));

  const text = (
    <span
      ref={ref}
      className="topic block break-words leading-[1.18]"
      style={{ fontSize: size }}
    >
      {name}
    </span>
  );

  if (variant === 'plank') {
    return (
      <span className={cn('block', className)} style={{ width, paddingBottom: lip }}>
        <span
          className="wood plank relative block rounded-[11px] text-center"
          style={{ paddingTop: padY, paddingBottom: padY, paddingLeft: 24, paddingRight: 24 }}
        >
          <PlankScrew side="left" />
          <PlankScrew side="right" />
          {text}
        </span>
      </span>
    );
  }

  return (
    // paddingBottom reserves the dark lip, which sits below the gold layer — without it the
    // lip overlaps whatever follows.
    <span className={cn('block', className)} style={{ width, paddingBottom: lip }}>
      <span className="relative block">
        {/* Both layers track the box, so they follow the text however many lines it takes. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-night"
          style={{ clipPath: RIBBON_CLIP, transform: `translateY(${lip}px)` }}
        />
        <span
          aria-hidden="true"
          className="wood-bright absolute inset-0"
          style={{ clipPath: RIBBON_CLIP }}
        />
        {/* In flow, so this is what gives the box its height. The notch cuts 7% off each
            end, so the text is inset past it. */}
        <span
          className="relative block text-center"
          style={{ paddingTop: padY, paddingBottom: padY, paddingLeft: '9%', paddingRight: '9%' }}
        >
          {text}
        </span>
      </span>
    </span>
  );
}

function PlankScrew({ side }: { side: 'left' | 'right' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute top-1/2 size-2 -translate-y-1/2 rounded-full',
        side === 'left' ? 'left-2' : 'right-2',
      )}
      style={{ background: 'radial-gradient(circle at 35% 35%, #c08a58, #4a220a)' }}
    />
  );
}
