import { clear, del, get, keys, set } from 'idb-keyval';

/**
 * Candidate photos. The deck JSON holds only keys; the bytes live in IndexedDB.
 *
 * Keeping them apart is what makes the deck small enough to sit in localStorage and clean
 * enough to export — a 40-candidate deck with inline base64 would be ~4MB of string the
 * admin re-serialises on every keystroke.
 *
 * Object URLs are cached per image id and deliberately never revoked while the app is up.
 * They are a few dozen handles at most, and the alternative — revoking on unmount — raced
 * with slide transitions and blanked portraits mid-show, because two slides hold the same
 * image for the 350ms both are mounted.
 */

const KEY = (imageId: string) => `img:${imageId}`;

const urls = new Map<string, string>();

export const newImageId = () =>
  // crypto.randomUUID needs a secure context; a venue laptop on http://192.168.x.x is not
  // one, and the voting site is reached that way in dev. Hence the fallback.
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export async function putImage(imageId: string, blob: Blob) {
  await set(KEY(imageId), blob);
  // A re-crop reuses the id, so drop the stale handle or the old framing stays on screen.
  const stale = urls.get(imageId);
  if (stale) {
    URL.revokeObjectURL(stale);
    urls.delete(imageId);
  }
}

export async function getImageBlob(imageId: string) {
  return (await get<Blob>(KEY(imageId))) ?? null;
}

/** Resolves to an object URL for an image, or null if it is not in the store. */
export async function getImageUrl(imageId: string): Promise<string | null> {
  const cached = urls.get(imageId);
  if (cached) return cached;

  const blob = await getImageBlob(imageId);
  if (!blob) return null;

  const url = URL.createObjectURL(blob);
  urls.set(imageId, url);
  return url;
}

/** Synchronous read of an already-resolved URL, for render paths that cannot await. */
export const peekImageUrl = (imageId: string) => urls.get(imageId) ?? null;

export async function deleteImage(imageId: string) {
  await del(KEY(imageId));
  const url = urls.get(imageId);
  if (url) {
    URL.revokeObjectURL(url);
    urls.delete(imageId);
  }
}

/** Warms the cache so a slide never renders an empty disc. */
export async function preloadImages(imageIds: (string | null)[]) {
  await Promise.all(imageIds.filter((id): id is string => Boolean(id)).map(getImageUrl));
}

/**
 * Drops images no candidate references any more. Called after a delete or an import rather
 * than on every edit, because walking IndexedDB is not free and an orphan costs nothing
 * until then.
 */
export async function pruneImages(liveIds: Set<string>) {
  const all = await keys();
  const orphans = all
    .filter((k): k is string => typeof k === 'string' && k.startsWith('img:'))
    .map((k) => k.slice(4))
    .filter((id) => !liveIds.has(id));

  await Promise.all(orphans.map(deleteImage));
  return orphans.length;
}

export async function clearImages() {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
  await clear();
}

/* ── Base64, for export and import ───────────────────────────────────────── */

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('That image could not be read.'));
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
