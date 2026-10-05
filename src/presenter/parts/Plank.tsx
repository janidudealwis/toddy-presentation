import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Leaf, Ropes, Screws } from './Leaf';

/**
 * The hanging timber signboard — the voting site's CategorySign, scaled to the stage. Used
 * big on the title slide and compact as the candidates-slide header.
 *
 * `ropes`/`leaves`/`screws` are separate flags because the compact header wants the board and
 * its screws but not the furniture: ropes reaching up from a header pinned to the top of the
 * stage would hang off nothing.
 *
 * The tilt sits on an outer wrapper and the entrance animation on the board itself. Putting
 * both on one element means the keyframes have to restate the rotation in every step, and any
 * caller passing a different `rotate` then snaps to the keyframe's value as the animation
 * starts.
 */
export function Plank({
  children,
  width,
  rotate = -1.2,
  size = 'lg',
  ropes = true,
  leaves = true,
  screws = true,
  animate = false,
  className,
}: {
  children: ReactNode;
  width: number;
  rotate?: number;
  size?: 'lg' | 'sm';
  ropes?: boolean;
  leaves?: boolean;
  screws?: boolean;
  animate?: boolean;
  className?: string;
}) {
  const big = size === 'lg';

  return (
    <div className="relative" style={{ width }}>
      {/*
        The big sign's ropes run right off the top of the frame, which the stage clips. A rope
        of a fixed short length ends in mid-air above the board and reads as a floating sign;
        running them out of shot is what makes it read as hung from something. The length only
        has to beat the tallest the board can sit — centred, that is a little over 400px.
      */}
      {ropes && (
        <Ropes inset={Math.round(width * 0.18)} width={big ? 12 : 7} drop={big ? 620 : 56} />
      )}

      {/*
        Fronds tucked behind the sign's left and right edges.
        The offset has to be read geometrically, not guessed. The frond is drawn pointing up
        with its base at the bottom-centre of its box, so rotating it about the box centre
        swings the tip out by roughly half the box height — about 100px on a 220px frond. The
        board paints over everything to its own left edge, so an element nudged out by only a
        few pixels shows a ~50px sliver and reads as a shard rather than foliage. Offsetting by
        most of the frond's width is what actually puts the fan outside the board.
      */}
      {leaves && (
        <>
          <Leaf
            className={cn(
              'absolute',
              big
                ? '-left-[200px] top-[64px] h-[220px] w-[330px] -rotate-[62deg]'
                : '-left-3 top-9 h-14 w-20 -rotate-[70deg]',
            )}
          />
          <Leaf
            className={cn(
              'absolute',
              big
                ? '-right-[200px] top-[64px] h-[220px] w-[330px] rotate-[62deg]'
                : '-right-3 top-9 h-14 w-20 rotate-[70deg]',
            )}
          />
        </>
      )}

      <div style={{ transform: `rotate(${rotate}deg)` }}>
        <div
          className={cn(
            'wood relative flex flex-col items-center text-center',
            big
              ? 'board-lg rounded-[30px] px-14 pb-9 pt-7'
              : 'board-sm rounded-plank px-8 pb-4 pt-3.5',
            className,
          )}
          style={{
            animation: animate
              ? 'plank-drop 600ms cubic-bezier(0.22, 1.2, 0.36, 1) both'
              : undefined,
          }}
        >
          {screws && <Screws inset={big ? 90 : 40} top={big ? 18 : 8} size={big ? 20 : 9} />}
          {children}
        </div>
      </div>
    </div>
  );
}
