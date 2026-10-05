/**
 * Candidate photo handling, ported from the voting site. Two halves: decode a picked file
 * into a working copy the admin can frame, then render the square they framed for storage.
 *
 * A phone camera JPEG is 3–8MB and nothing on a slide needs that. Every portrait is
 * displayed as a circle with `object-cover`, so the admin choosing the square is the
 * difference between a centred face and a cropped-off one — the browser would otherwise
 * pick the middle of the frame and hope.
 *
 * Because the chosen square is baked in here, a stored image needs no crop metadata
 * travelling beside it: what comes back out of IndexedDB is already the framed square.
 */

/**
 * The square written to IndexedDB. The winner medallion is 560px on the 1920 stage, and the
 * stage scales up on a projector running above 1080p, so this is deliberately about double
 * the voting site's 800 — the one place where a phone-sized asset would actually show.
 */
const OUTPUT = 1200;

/** The framing copy held in memory — headroom to zoom in without going soft. */
const WORKING_EDGE = 2000;

const QUALITY = 0.88;

/** Decoding a 50-megapixel file can exhaust memory, so refuse before decoding rather than after. */
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

/** The largest the admin can magnify while framing. */
export const MAX_ZOOM = 4;

export type LoadedPhoto = {
  /** Object URL of the orientation-corrected working copy — revoke it when done. */
  url: string;
  width: number;
  height: number;
};

/** A square region of a working photo, in that photo's own pixels. */
export type CropRect = { x: number; y: number; size: number };

export class ImageError extends Error {}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // `imageOrientation: 'from-image'` applies the EXIF rotation phones write, so portrait
  // shots don't land sideways.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to the <img> path */
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Decodes a URL the caller owns — unlike `decode`, the URL is left alone afterwards. */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageError('That image could not be read.'));
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  // A browser that cannot encode the requested type quietly hands back a PNG, so check
  // what actually came out and step down instead of uploading a 2MB PNG.
  let blob = await toBlob(canvas, 'image/webp');
  if (!blob || blob.type !== 'image/webp') {
    blob = (await toBlob(canvas, 'image/jpeg')) ?? blob;
  }
  if (!blob) throw new ImageError('That image could not be converted.');
  return blob;
}

function surface(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageError('This browser cannot process images.');
  ctx.imageSmoothingQuality = 'high';

  return { canvas, ctx };
}

/**
 * Decodes a picked file into a working copy for the cropper. The copy is already
 * rotated per EXIF and capped in size, so what the admin frames on screen and what
 * `renderCrop` draws from are the same pixels.
 */
export async function loadPhoto(file: File): Promise<LoadedPhoto> {
  if (!file.type.startsWith('image/')) {
    throw new ImageError('Pick an image file — a JPEG, PNG or WebP.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageError('That image is too large to process. Try one under 25MB.');
  }

  const source = await decode(file);
  const width = 'width' in source ? source.width : 0;
  const height = 'height' in source ? source.height : 0;

  if (!width || !height) throw new ImageError('That image could not be read.');

  // Never scale up — a small photo stays as it is.
  const scale = Math.min(1, WORKING_EDGE / Math.max(width, height));
  const { canvas, ctx } = surface(Math.round(width * scale), Math.round(height * scale));

  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ('close' in source) source.close();

  const blob = await encode(canvas);

  return { url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height };
}

/** Renders the framed square out at storage size. */
export async function renderCrop(photo: LoadedPhoto, crop: CropRect): Promise<Blob> {
  const img = await loadImage(photo.url);
  const { canvas, ctx } = surface(OUTPUT, OUTPUT);

  ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, OUTPUT, OUTPUT);

  return encode(canvas);
}
