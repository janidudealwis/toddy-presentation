import { cn } from '../../lib/cn';

/**
 * A portrait in the design's carved wooden ring: a thick bark bezel, a cream disc inside,
 * and for the winner a gold band with a glow behind it. Ported from the voting site's
 * Avatar, with the ring layers parameterised by size — the voting site had two fixed
 * sizes (124 for a ballot cell, 212 for the reveal) and this needs 220 through 560.
 */

type Props = {
  photoUrl: string | null;
  /** Outer diameter in stage pixels. */
  size: number;
  /** The gold band, glow and thicker bezel — the winner treatment. */
  crowned?: boolean;
  className?: string;
};

export function Medallion({ photoUrl, size, crowned = false, className }: Props) {
  // The voting site's own formula. Keeps the bezel in proportion at any diameter.
  const pad = Math.max(6, Math.round(size * 0.073));

  // The voting site's reveal ring is 3/10/13px on a 212px medallion. Scaling by diameter
  // keeps that relationship rather than hard-coding the spec's 6/24/30 at one size.
  const k = size / 212;
  const r1 = Math.max(3, Math.round(3 * k));
  const r2 = Math.max(8, Math.round(10 * k));
  const r3 = Math.max(11, Math.round(13 * k));

  const crownedRing = [
    `0 0 0 ${r1}px #1e0c04`,
    `0 0 0 ${r2}px #ffd23f`,
    `0 0 0 ${r3}px #1e0c04`,
    `0 0 ${Math.round(50 * k)}px ${Math.round(16 * k)}px rgba(255,190,60,0.5)`,
    'inset 0 3px 0 rgba(255,200,140,0.45)',
  ].join(',');

  return (
    <span
      className={cn('relative block shrink-0 rounded-full', !crowned && 'ring-idle', className)}
      style={{
        width: size,
        height: size,
        padding: pad,
        background: 'linear-gradient(145deg, #b8692c 0%, #6b3512 55%, #4a220a 100%)',
        boxShadow: crowned ? crownedRing : undefined,
      }}
    >
      <span
        className="flex size-full items-end justify-center overflow-hidden rounded-full"
        style={{
          background: 'radial-gradient(circle at 40% 30%, #fffaf0 0%, #f1e0bf 100%)',
          boxShadow: `inset 0 0 0 ${Math.max(3, Math.round(size * 0.014))}px #3d1c07, inset 0 ${Math.round(
            size * 0.047,
          )}px ${Math.round(size * 0.085)}px rgba(90,40,5,0.25)`,
        }}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" decoding="async" className="size-full object-cover" />
        ) : (
          <Silhouette size={Math.round(size * 0.66)} />
        )}
      </span>
    </span>
  );
}

/** The design's placeholder head-and-shoulders, sitting on the disc's bottom edge. */
function Silhouette({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="40" r="19" fill="#c9a274" />
      <path d="M12 102c0-24 17-39 38-39s38 15 38 39z" fill="#c9a274" />
    </svg>
  );
}

