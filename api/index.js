import { handleImport } from './import.js';

/**
 * The Vercel entry. vercel.json rewrites every /api/* here with the original path in
 * `__vpath`, mirroring how the voting site routes its one function.
 *
 * Only the importer lives behind this. Everything else about the presentation is static —
 * the deck is in the browser, which is what lets it run with the network unplugged.
 */
export default async function handler(req, res) {
  const path = new URL(req.url, 'http://localhost').searchParams.get('__vpath') ?? req.url;

  if (path.startsWith('/api/import')) {
    // handleImport reads its own query string off req.url, so hand it the real path.
    return handleImport({ ...req, url: path, headers: req.headers }, res);
  }

  res.statusCode = 404;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ error: 'Unknown endpoint.' }));
}
