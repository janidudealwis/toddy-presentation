# Toddycs Presentation

A projector-ready presentation site for announcing the Toddycs category winners. Each category
plays as three slides — **category title → candidates → winner reveal** — in the same
jungle-night, carved-timber look as the [voting site](https://toddya.vercel.app). Everything is
edited in `/admin`; no slide is written by hand.

React + Vite + TypeScript + Tailwind v4. No backend: the deck lives in the browser, which is
what lets it run at a venue with no internet.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:5173 — admin at /admin
```

For the event itself, build and serve locally:

```bash
npm run build && npm run preview
```

---

## Typing Sinhala — read this first

Titles and candidate names use **SINHA Samadi 2012**, the same legacy font as the voting site,
so the two read as one product.

It is a **pre-Unicode** face. It has no glyphs in the Unicode Sinhala block (U+0D80–U+0DFF);
instead it draws Sinhala shapes on the *Latin* codepoints. So:

- **Type titles and names with the same legacy Sinhala keyboard you already use in the voting
  admin.** What you type there is what you type here.
- Typing ordinary English into those fields produces Sinhala nonsense. That is the font, not a
  bug — it is the same trade the voting site makes.
- Pasting a title straight out of the voting admin is the safest way to get it right.
- One quirk is handled for you: the face draws a `)` on the ampersand key and has no `&` of its
  own, so `&` is allowed to fall through to Inter. A name like `කන්ඩා & නිතුවා` renders
  correctly.

The **Label above it** field (default `CATEGORY`) is ordinary English and uses the display font.

### English and mixed titles

Each category's title has a **සිංහල | EN** toggle next to it. Switch it to EN and that one
category's title is set in the display font and typed as ordinary English; every other category
is unaffected.

For a title that mixes the two — `හොඳිම MVP ක්‍රීඩකයා`, say — select the part that belongs in the
other script and press **Set selection in …**. That wraps it in `[[ ]]`, which is how the mixed
run is recorded:

```
fydÈu [[MVP]] l%Svlhd     Sinhala title with an English word
Best [[l%Svlhd]] of 2024   English title with a Sinhala word
```

The brackets never appear on the slide. Press the button again with the same text selected to
take the marking off.

This has to be marked by hand rather than detected, because the Sinhala face draws Sinhala on
the *Latin* codepoints — `Best Player` and a Sinhala title are the same characters as far as the
text is concerned, so nothing in the string says which script it is. The **On the slide** box
under the field renders exactly what the projector will draw, so you can see the result as you
type.

---

## Running the show

Open `/`, press **F** for fullscreen, and drive it with the arrow keys or a clicker. There
is no on-screen chrome — nothing to click past and nothing to appear in a photo of the screen.

| Input | Action |
| --- | --- |
| `→` `Space` `PageDown` `Enter`, click | Next slide |
| `←` `PageUp` `Backspace` | Previous slide |
| `Home` / `End` | First / last slide |
| `F` | Fullscreen · `Esc` exits |
| `A` | Open the admin panel |
| `R` | Reload the deck after editing it in another tab |
| Swipe | Next / Back |

A presentation clicker sends `PageDown`/`PageUp`, which are covered.

The mouse pointer fades out after 2.5s of stillness and comes back on any movement
(switchable in **Show settings**). The URL tracks the slide, so `/?c=2&s=3` reopens the same
place after a refresh.

---

## The admin panel

`/admin`. Categories in the left column drag to reorder — that is the play order. Each category
takes a Sinhala title, its candidates, and which one won. A category needs **at least two
candidates** to play; one with fewer is skipped in the show and flagged in the sidebar.

Photos: click a thumbnail or drop a file onto it, then frame it in the circle (drag to move,
scroll or pinch to zoom). The chosen square is baked into the stored image. To add a batch at
once, drop several files on the **drop photos here** zone — each becomes a candidate named from
its filename.

The three slides for the selected category are previewed live at the bottom of the editor. That
is the real slide code scaled down, not a mock-up, so what you see is what the projector gets.

### Import from the voting site

**From voting site** pulls the categories, candidates, photos and the winner of each straight
out of the live vote. The winner is the candidate with the most votes.

Two things to know:

- Only categories whose results you have **published to voters** appear. In the voting admin,
  open each category and tick *Publish to voters* first — otherwise the import finds nothing.
- On a genuine tie the voting site does not pick a winner, so the first of the tied candidates
  is set and you get a warning. Change it by hand.

Photos are copied into this browser, not linked, so the deck still plays with the network
unplugged. Everything stays editable after importing.

### Backups

There is no server. **Edits live in the browser you made them in, on that machine.** So:

1. Do the admin work on the laptop you will present from.
2. **Export** before the event. That is one JSON file with the images inlined — the whole deck.
3. Keep it on a USB stick. **Import** restores it anywhere.

---

## Offline

After one successful load, a service worker keeps the app itself cached, so you can reload at
the venue with no internet and the show still comes up. Fonts are bundled in the build — nothing
is fetched from a CDN at runtime — and photos are served from IndexedDB.

Load the site once while online (or run `npm run preview` locally, which needs no internet at
all) before the event.

---

## Deploying

Vercel, as a static SPA plus one function. `vercel.json` rewrites `/api/*` to `api/index.js` and
everything else to `index.html`.

The only server-side code is the importer (`api/import.js`). It exists because the voting site
sends no CORS headers, so the browser cannot read its API or its photo bytes directly — the
fetch has to happen from Node. The same module is mounted on the dev server by a small plugin in
`vite.config.ts`, so importing works in `npm run dev` too.

---

## Layout

```
api/import.js            the voting-site importer (one module, mounted in dev and on Vercel)
public/brand/            clearing.webp (backdrop), td26.webp (logo)
public/fonts/            sinha-samadi-2012.ttf           — from the voting repo
public/sw.js             offline cache
src/styles/index.css     the design system, ported from the voting site's own index.css
src/presenter/           the stage, the slides, and the shared signage parts
src/admin/               the editor
src/store/               deck (localStorage) and images (IndexedDB)
src/lib/image.ts         photo resize + crop, ported from the voting site
```

Slides are derived from the deck in `src/types.ts` (`buildSlides`). Adding a category is data,
never code.

Every slide is composed at a fixed **1920×1080** and scaled to fit the window with one CSS
transform (`src/lib/useStageScale.ts`). That is why the design can carry literal pixel values
from the voting canvas — a 56px button, an 8px text stroke — and still fill any projector.
