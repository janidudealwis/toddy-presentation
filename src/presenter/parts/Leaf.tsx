/**
 * The jungle-night set dressing, ported from the voting site's Scenery.tsx. All decorative,
 * so every piece is aria-hidden.
 */
import { cn } from '../../lib/cn';

/**
 * A single frond. The design draws five leaflets fanned around a common base; `small` drops
 * the outer pair, which is the variant the voting site tucks above a portrait.
 *
 * `width` is offered alongside className because the candidate cards size their fronds from
 * the medallion diameter, which is a runtime number — height follows the 120×80 viewBox.
 */
export function Leaf({
  className,
  small = false,
  width,
}: {
  className?: string;
  small?: boolean;
  width?: number;
}) {
  const leaf = 'M60 78 C49 58 49 26 60 4 C71 26 71 58 60 78Z';

  return (
    <svg
      viewBox="0 0 120 80"
      aria-hidden="true"
      className={className}
      style={width ? { width, height: (width * 2) / 3 } : undefined}
    >
      <g stroke="#173a0a" strokeWidth="3" strokeLinejoin="round">
        {!small && (
          <>
            <path transform="rotate(-62 60 78)" d={leaf} fill="#3f9a2c" />
            <path transform="rotate(62 60 78)" d={leaf} fill="#3f9a2c" />
          </>
        )}
        <path transform="rotate(-28 60 78)" d={leaf} fill="#5cb836" />
        <path transform="rotate(28 60 78)" d={leaf} fill="#5cb836" />
        <path d={leaf} fill="#82d24a" />
      </g>
    </svg>
  );
}

/**
 * The two ropes a hanging signboard swings from.
 *
 * `width` and `drop` are parameters rather than the voting site's fixed 5px/40px: a rope
 * sized for a 310px phone plank looks like thread under a 1300px one.
 */
export function Ropes({
  inset,
  width = 5,
  drop = 40,
}: {
  inset: number;
  width?: number;
  drop?: number;
}) {
  const style = { width, height: drop, top: -drop + 4 } as const;

  return (
    <>
      <span aria-hidden="true" className="rope absolute rounded-sm" style={{ ...style, left: inset }} />
      <span aria-hidden="true" className="rope absolute rounded-sm" style={{ ...style, right: inset }} />
    </>
  );
}

/** Two screw heads, the detail that makes a panel read as bolted timber. */
export function Screws({
  inset = 12,
  top = 12,
  size = 9,
}: {
  inset?: number;
  top?: number;
  size?: number;
}) {
  const screw = 'radial-gradient(circle at 35% 35%, #c08a58, #4a220a)';
  const style = { width: size, height: size, top, background: screw } as const;

  return (
    <>
      <span aria-hidden="true" className="absolute rounded-full" style={{ ...style, left: inset }} />
      <span aria-hidden="true" className="absolute rounded-full" style={{ ...style, right: inset }} />
    </>
  );
}

/**
 * The event mark. Width is given in stage pixels; the height follows the artwork's own ratio,
 * stated here so the element reserves the right box before the image decodes — otherwise the
 * slide reflows under it mid-entrance.
 */
const LOGO_RATIO = 840 / 1280;

export function Logo({ width = 380, className }: { width?: number; className?: string }) {
  return (
    <img
      src="/brand/td26.webp"
      alt="TD'26"
      width={width}
      height={Math.round(width * LOGO_RATIO)}
      className={cn('object-contain', className)}
      style={{
        width,
        height: 'auto',
        filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.6))',
      }}
    />
  );
}
