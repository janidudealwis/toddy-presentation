/**
 * Pulls a deck out of the Toddycs voting site.
 *
 * This runs on the server, not in the page, and that is the whole reason it exists. The
 * voting site's Express app mounts no CORS middleware, so the browser cannot read
 * `/api/results` cross-origin, and it cannot read the photo bytes into a Blob either — an
 * <img> would display them, but a canvas readback of a cross-origin image is tainted and
 * toBlob() throws. Fetching from Node sidesteps both: no preflight, and the bytes come back
 * as base64 the admin can turn into Blobs for IndexedDB. That matters because photos have
 * to end up stored locally — the venue has no network.
 *
 * One module, mounted twice: Vercel runs it as a function via api/index.js, and the Vite dev
 * server mounts it on the same path (see vite.config.ts), so importing works in `npm run dev`
 * without a function runtime.
 */

/** Photos are already WebP at ~100KB, but a hostile or wrong URL should not be unbounded. */
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 20_000;

export async function handleImport(req, res) {
  const send = (status, body) => {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
  };

  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const raw = (url.searchParams.get('origin') ?? '').trim();

    if (!raw) return send(400, { error: 'Pass the voting site address as ?origin=' });

    let origin;
    try {
      // Accept "toddya.vercel.app", a full URL, or one with a path — only the origin is used.
      origin = new URL(raw.includes('://') ? raw : `https://${raw}`).origin;
    } catch {
      return send(400, { error: `"${raw}" is not a valid address.` });
    }

    const results = await getJson(`${origin}/api/results`);

    if (!results || !Array.isArray(results.categories)) {
      return send(502, {
        error: 'That address answered, but not with a Toddycs results list. Check the URL.',
      });
    }

    // Photos are fetched once per distinct URL. Two candidates can legitimately share one,
    // and a category list is small enough that fetching them all up front beats lazy loading.
    const photoUrls = new Set();
    for (const category of results.categories) {
      for (const candidate of category.candidates ?? []) {
        if (candidate.photoUrl) photoUrls.add(absolute(candidate.photoUrl, origin));
      }
    }

    const photos = {};
    const failed = [];

    await Promise.all(
      [...photoUrls].map(async (photoUrl) => {
        try {
          photos[photoUrl] = await getDataUrl(photoUrl);
        } catch (err) {
          // A missing photo is not a failed import — the slide falls back to the silhouette.
          failed.push({ url: photoUrl, reason: err.message });
        }
      }),
    );

    send(200, {
      origin,
      fetchedAt: new Date().toISOString(),
      categories: results.categories.map((category) => ({
        id: category.id,
        title: category.title ?? '',
        totalVotes: category.totalVotes ?? 0,
        candidates: (category.candidates ?? []).map((candidate) => ({
          id: candidate.id,
          name: candidate.name ?? '',
          votes: candidate.votes ?? 0,
          isLeader: Boolean(candidate.isLeader),
          photoUrl: candidate.photoUrl ? absolute(candidate.photoUrl, origin) : null,
        })),
      })),
      photos,
      failed,
    });
  } catch (err) {
    // Already a sentence written for the person reading it — pass it straight through.
    if (err?.expected) return send(400, { error: err.message });

    const offline = /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|aborted/i.test(
      err?.message ?? '',
    );

    send(offline ? 504 : 500, {
      error: offline
        ? 'Could not reach that address. Check the URL and that this machine is online.'
        : `The import failed: ${err?.message ?? 'unknown error'}`,
    });
  }
}

const absolute = (value, origin) => (value.startsWith('http') ? value : `${origin}${value}`);

async function fetchWithTimeout(url, accept) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept } });

    if (!res.ok) {
      // A reachable site with no /api/results is the common typo — a plain "returned 404"
      // sends people checking their network instead of their URL.
      if (res.status === 404) {
        const err = new Error('That site has no Toddycs results endpoint. Check the address.');
        err.expected = true;
        throw err;
      }
      throw new Error(`${url} returned ${res.status}`);
    }

    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url) {
  const res = await fetchWithTimeout(url, 'application/json');
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    // Almost always an HTML page — a wrong host, or the SPA shell served for an unknown path.
    throw new Error('That address did not return JSON. Is it the voting site?');
  }
}

async function getDataUrl(url) {
  const res = await fetchWithTimeout(url, 'image/*');
  const buffer = Buffer.from(await res.arrayBuffer());

  if (buffer.byteLength > MAX_PHOTO_BYTES) throw new Error('photo too large');

  const mime = res.headers.get('content-type')?.split(';')[0] || 'image/webp';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}
