import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Connect, Plugin } from 'vite';

/**
 * Mounts the serverless import handler on the dev server.
 *
 * The voting site sends no CORS headers, so the browser cannot read its API directly —
 * see api/import.js. In production Vercel runs that handler as a function; in dev there
 * is no function runtime, so this plugin mounts the very same module on the same path.
 * One implementation, both environments.
 */
function importApi(): Plugin {
  return {
    name: 'toddy-import-api',
    configureServer(server) {
      const handler: Connect.NextHandleFunction = (req, res, next) => {
        void (async () => {
          try {
            const { handleImport } = await server.ssrLoadModule('/api/import.js');
            await handleImport(req, res);
          } catch (err) {
            next(err);
          }
        })();
      };

      server.middlewares.use('/api/import', handler);
    },
  };
}

/**
 * Writes the list of built files for the service worker to precache.
 *
 * Runtime caching alone is not enough. The assets are hashed and served `immutable`, so after
 * the first visit the browser answers for them out of its own HTTP cache and the service
 * worker's fetch handler never sees them — they are then missing from its cache precisely when
 * the network goes away. Naming them at install time is the only way to be certain they are
 * actually stored, and only the build knows the hashes.
 */
function offlineManifest(): Plugin {
  return {
    name: 'toddy-offline-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).map((file) => `/${file}`);

      // Files served straight from public/ are not in the bundle, so they are listed by hand.
      // sw.js itself is deliberately absent: a cached service worker cannot be replaced.
      const statics = [
        '/',
        '/index.html',
        '/brand/clearing.webp',
        '/brand/td26.webp',
        '/fonts/sinha-samadi-2012.ttf',
      ];

      this.emitFile({
        type: 'asset',
        fileName: 'sw-manifest.js',
        source: `self.__TODDY_PRECACHE = ${JSON.stringify([...statics, ...assets], null, 2)};\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), importApi(), offlineManifest()],
  server: { host: true },
});
