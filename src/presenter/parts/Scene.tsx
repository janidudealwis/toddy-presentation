/**
 * The backdrop every slide sits on.
 *
 * This is now a single painted plate (`clearing.webp`) rather than a photo with set dressing
 * built on top of it. The artwork already carries the string lights across the top and the palm
 * fronds in all four corners, so the hand-drawn lights SVG and the corner `Leaf`s that used to
 * live here are gone — keeping them would have hung a second string of bulbs over the painted
 * one and stacked fronds on fronds.
 *
 * It is also drawn at 1672×941, which is 16:9 to within a rounding error, so it lands on the
 * 1920×1080 stage with no cropping and only a 1.15× upscale — the old photo was a 528×746
 * portrait being blown up 3.6× and cropped to a third of its height.
 */
export function Scene() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-night">
      {/*
        Oversized and inset so the blur's feathered edge falls outside the frame rather than
        showing as a soft grey border — but only just, because the plate is already 16:9 and
        every extra pixel of oversize crops the painted bulbs off the top of the frame. The blur
        is light: enough to push the leaves and bulbs behind the signage, not enough to mush it.
      */}
      <img
        src="/brand/clearing.webp"
        alt=""
        className="absolute size-full object-cover"
        style={{
          inset: -22,
          width: 'calc(100% + 44px)',
          height: 'calc(100% + 44px)',
          filter: 'blur(5px)',
        }}
      />

      {/*
        A gentle wash, not the heavy one the old photo needed. That overlay ran to 92% black at
        the foot of the frame to hide an upscaled photo; against artwork that is already lit and
        vignetted the same values would flatten the floor and snuff out the lights. This only
        deepens the corners enough to hold the signage forward.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 60% at 50% 42%, rgba(30,12,4,0) 0%, rgba(30,12,4,0.22) 60%, rgba(20,8,2,0.52) 100%),' +
            'linear-gradient(180deg, rgba(30,12,4,0.14) 0%, rgba(30,12,4,0) 30%, rgba(20,8,2,0.30) 100%)',
        }}
      />
    </div>
  );
}
