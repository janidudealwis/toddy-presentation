import { useEffect, useState } from 'react';
import { getImageUrl, peekImageUrl } from '../store/imageStore';

/**
 * Resolves a list of image ids to object URLs.
 *
 * Seeded synchronously from the URL cache so a slide that has already shown an image renders
 * it on the first frame rather than flashing an empty disc — which is what a naive
 * `useEffect` + `setState` does on every re-entry to a slide, and is very visible when
 * stepping back and forward during a show.
 */
export function useImageUrls(imageIds: (string | null)[]): Record<string, string> {
  const key = imageIds.join(',');

  const [urls, setUrls] = useState<Record<string, string>>(() => seed(imageIds));

  useEffect(() => {
    let live = true;

    void (async () => {
      const entries = await Promise.all(
        imageIds
          .filter((id): id is string => Boolean(id))
          .map(async (id) => [id, await getImageUrl(id)] as const),
      );

      if (!live) return;

      const next: Record<string, string> = {};
      for (const [id, url] of entries) if (url) next[id] = url;

      // Only commit when something actually differs, or this re-renders every slide on
      // every resolve and restarts the entrance animations.
      setUrls((current) => (same(current, next) ? current : next));
    })();

    return () => {
      live = false;
    };
    // key, not imageIds: a fresh array of the same ids must not re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return urls;
}

function seed(imageIds: (string | null)[]) {
  const out: Record<string, string> = {};
  for (const id of imageIds) {
    if (!id) continue;
    const url = peekImageUrl(id);
    if (url) out[id] = url;
  }
  return out;
}

function same(a: Record<string, string>, b: Record<string, string>) {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
}
