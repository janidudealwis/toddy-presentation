/**
 * Every face, bundled. The voting site pulls these three from the Google CDN; this one
 * cannot, because it has to come up at a venue with no network (spec §11). @fontsource
 * ships the identical faces as npm packages, so the rendering matches and the bytes are
 * in the build.
 *
 * The Sinhala face is not an npm package — it is served from /public/fonts and declared
 * by the @font-face rule in styles/index.css.
 */
import '@fontsource/lilita-one/400.css';

import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';

// Inter earns its place for exactly one glyph: "&". The Sinhala face deliberately has no
// ampersand (see the unicode-range in index.css), and Lilita One's closes up at plank
// size. Latin subset only — nothing else in the stack ever reaches it.
import '@fontsource/inter/latin-600.css';
