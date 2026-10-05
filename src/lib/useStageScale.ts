import { useEffect, useState } from 'react';

/** Every slide is composed at this size; nothing in the presenter is responsive. */
export const STAGE_W = 1920;
export const STAGE_H = 1080;

/**
 * Scale-to-fit for the fixed 1920×1080 stage.
 *
 * The whole presentation is one CSS transform on one element, which is what lets the
 * design carry literal pixel values from the canvas — a 56px button, an 8px text stroke —
 * and still fill a projector at any resolution. The alternative, a responsive layout in
 * vw units, would have every shadow and stroke drift out of proportion at the one size
 * that matters.
 *
 * `visualViewport` is preferred over `innerWidth` because entering fullscreen on Windows
 * reports the pre-fullscreen innerWidth for a frame or two, which lands the first slide
 * of a show at the wrong scale.
 */
export function useStageScale() {
  const [scale, setScale] = useState(() => fit());

  useEffect(() => {
    const measure = () => setScale(fit());

    // Fullscreen resizes without always firing resize first, and some projectors change
    // the reported viewport a frame after the transition — hence the trailing re-measure.
    const onFullscreen = () => {
      measure();
      requestAnimationFrame(measure);
    };

    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    document.addEventListener('fullscreenchange', onFullscreen);
    window.visualViewport?.addEventListener('resize', measure);

    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      document.removeEventListener('fullscreenchange', onFullscreen);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, []);

  return scale;
}

function fit() {
  const w = window.visualViewport?.width ?? window.innerWidth;
  const h = window.visualViewport?.height ?? window.innerHeight;
  return Math.min(w / STAGE_W, h / STAGE_H);
}
