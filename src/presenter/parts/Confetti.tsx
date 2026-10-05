import { useMemo } from 'react';

/**
 * The winner burst: rectangles and dots thrown outward from behind the medallion, then
 * pulled down by gravity.
 *
 * Pure CSS, no library. Each piece is one <i> carrying its own --dx/--dy/--rot/--fall as
 * custom properties, and a single keyframe set in index.css reads them — so the whole burst
 * is composited by the browser with no per-frame JavaScript. That is what keeps the reveal
 * at 60fps on a laptop also driving a projector, which is the one moment of the show where
 * a dropped frame is visible to a room.
 *
 * The geometry is seeded from `seed` rather than Math.random so a given winner's burst is
 * the same every time that slide is shown. Going back and forward over the reveal during a
 * show otherwise reshuffles it, which reads as a glitch rather than as a flourish.
 */

const COLORS = ['#ffd23f', '#5cb836', '#ff5a46', '#82d24a'];
const COUNT = 52;

/** mulberry32 — a small deterministic PRNG. Enough for scatter, and stable across reloads. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Confetti({ seed = 1 }: { seed?: number }) {
  const pieces = useMemo(() => {
    const rand = rng(seed || 1);

    return Array.from({ length: COUNT }, (_, i) => {
      // Fan the angles evenly and then jitter, rather than drawing each one at random:
      // pure random angles clump and leave visible bald patches around the medallion.
      const angle = (i / COUNT) * Math.PI * 2 + (rand() - 0.5) * 0.35;
      const distance = 260 + rand() * 420;
      const round = rand() > 0.55;

      return {
        dx: Math.round(Math.cos(angle) * distance),
        dy: Math.round(Math.sin(angle) * distance),
        fall: Math.round(180 + rand() * 420),
        rot: Math.round((rand() - 0.5) * 1080),
        w: round ? 10 : 12,
        h: round ? 10 : 6,
        round,
        color: COLORS[i % COLORS.length],
        delay: Math.round(rand() * 220),
        duration: 1500 + Math.round(rand() * 900),
      };
    });
  }, [seed]);

  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-0">
      {pieces.map((p, i) => (
        <i
          key={i}
          className="confetti-piece absolute block"
          style={
            {
              width: p.w,
              height: p.h,
              marginLeft: -p.w / 2,
              marginTop: -p.h / 2,
              borderRadius: p.round ? 999 : 2,
              background: p.color,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--fall': `${p.fall}px`,
              '--rot': `${p.rot}deg`,
              animation: `confetti-fly ${p.duration}ms cubic-bezier(0.15, 0.6, 0.4, 1) ${p.delay}ms both`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}
