# Toddycs Voting Presentation — Build Spec

A fullscreen, projector-ready **presentation website** that reuses the look of the Toddycs voting site (`toddya.vercel.app`). It plays a set of voting categories as slides, and has an **admin panel** to change categories, candidate names, candidate images and the winner without touching code.

> Hand this file to Claude Code (or any coding agent) as the brief. Build exactly what is written here. Where something is marked **CONFIRM**, keep it as a single token/constant so it is a one-line change.

---

## 1. Goal

For each voting category, the presentation plays **3 slides**:

| # | Slide | What it shows |
|---|-------|---------------|
| 1 | **Category title** | The BIG category name in **Sinhala** |
| 2 | **Candidates** | Every candidate's photo + name |
| 3 | **Winner reveal** | The winner's BIG photo + name, same medallion/rays/confetti look as the voting site's "Vote cast" screen |

There are multiple categories. Slides are generated automatically from data: adding a category means adding data in the admin panel, never writing slide code.

Also required:
- A small **Back** and **Next** button on every slide.
- Keyboard + clicker support.
- An **Admin panel** (`/admin`) to edit everything, including uploading candidate images.
- Works **offline** at a live event (fonts and assets bundled locally).

---

## 2. Tech stack

- **React + Vite + TypeScript + Tailwind CSS** (same as the voting repo).
- `react-router-dom` for `/` (presenter) and `/admin`.
- `zustand` for state (small, no boilerplate).
- `idb-keyval` for storing uploaded images in IndexedDB.
- `@fontsource/*` packages for **bundled** fonts (no Google Fonts CDN at runtime).
- `canvas-confetti` is optional; the default confetti is pure CSS (see §6.3).
- Deploy target: Vercel (static SPA). Add a `vercel.json` rewrite so `/admin` works on refresh:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

No backend. All admin edits persist in the browser (see §8).

---

## 3. Stage and scaling

The voting site is a 390×844 phone layout. The presentation is for a **projector, so landscape 16:9**.

- Design every slide on a fixed **1920×1080 stage**.
- A wrapper scales the stage to fit the window with letterboxing: `scale = Math.min(innerWidth / 1920, innerHeight / 1080)`, centered, with `transform-origin: top left`. Re-compute on resize and fullscreen change.
- Letterbox bars are `#1e0c04` (same as the app background).
- All sizes in this spec are in **stage pixels (1920×1080)**.

---

## 4. Design system (taken from the Toddycs voting design)

### 4.1 Colors

| Token | Hex | Use |
|-------|-----|-----|
| `bg-deep` | `#1e0c04` | Page background, outer shadows |
| `bg-deeper` | `#140802` | Gradient bottom |
| `outline-brown` | `#3d1c07` | All thick borders and text strokes |
| `ink` | `#3a1705` | Text on gold surfaces |
| `ink-soft` | `#6b3310` | Small caps labels on gold |
| `gold-hi` | `#ffe07a` | CTA / ribbon highlight |
| `gold` | `#f9d177` | Plank top |
| `gold-mid` | `#eba83c` | Plank middle |
| `gold-lo` | `#cf7f22` | Plank bottom |
| `title-gold` | `#ffd76a` | Big headline fill |
| `cream` | `#fff4dc` | Light text on dark |
| `cream-soft` | `#f5dfb8` | Body text on dark |
| `cream-dim` | `#d9bf94` | Footnote text |
| `leaf-1` | `#82d24a` | Leaf highlight |
| `leaf-2` | `#5cb836` | Leaf mid |
| `leaf-3` | `#3f9a2c` | Leaf dark |
| `leaf-outline` | `#173a0a` | Leaf stroke |
| `rope-hi` / `rope-lo` | `#d9b67a` / `#8a5a2a` | Rope stripes |
| `ring-gold` | `#ffd23f` | Winner medallion ring |
| `live-red` | `#ff4b3e` | Live dot |
| `confetti-red` | `#ff5a46` | Confetti |

Define them in `tailwind.config.ts` under `theme.extend.colors`.

### 4.2 Fonts

| Role | Font | Weights | Notes |
|------|------|---------|-------|
| Display (English / numerals) | **Lilita One** | 400 | Headlines, ribbon text, buttons |
| Body (English) | **Nunito** | 600, 700, 800, 900 | Labels, body |
| **Sinhala display** | **Noto Sans Sinhala** | 700, 800, 900 | **CONFIRM** |
| Sinhala fallback | Noto Serif Sinhala, Iskoola Pota, sans-serif | | |

> **CONFIRM the Sinhala font.** The design file only specifies Lilita One and Nunito, and Lilita One has **no Sinhala glyphs**. Use `Noto Sans Sinhala` as the default. If the live voting site uses a different Sinhala font, change the single `--font-sinhala` variable. Everything reads from it.

Install and import locally (no CDN):

```bash
npm i @fontsource/lilita-one @fontsource/nunito @fontsource/noto-sans-sinhala
```

```ts
// src/fonts.ts
import '@fontsource/lilita-one/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import '@fontsource/noto-sans-sinhala/700.css';
import '@fontsource/noto-sans-sinhala/800.css';
import '@fontsource/noto-sans-sinhala/900.css';
```

```css
:root {
  --font-display: 'Lilita One', 'Noto Sans Sinhala', sans-serif;
  --font-body: 'Nunito', 'Noto Sans Sinhala', system-ui, sans-serif;
  --font-sinhala: 'Noto Sans Sinhala', 'Noto Serif Sinhala', 'Iskoola Pota', sans-serif;
}
```

Because candidate names may be Sinhala **or** English, every name uses `font-family: var(--font-display)` with Sinhala listed as the fallback. When the text contains Sinhala characters (`/[\u0D80-\u0DFF]/`), switch to `--font-sinhala` with `font-weight: 900`. Add a `hasSinhala(text)` helper and a `<Name>` component that does this automatically.

Sinhala-specific rules:
- Use `line-height: 1.35` minimum for Sinhala. Tight line-heights clip the above/below vowel signs.
- Never use `letter-spacing` on Sinhala text (it breaks conjuncts).
- Text strokes with `-webkit-text-stroke` can create artifacts on Sinhala conjuncts. Always pair with `paint-order: stroke fill`, and keep the stroke width at ~60% of what the English headline uses. Test with long names.
- Add `font-feature-settings: "ccmp", "liga", "clig"` and `text-rendering: optimizeLegibility`.

### 4.3 Reusable surface styles

Put these in `src/styles/surfaces.css` (or Tailwind `@layer components`).

**Gold plank** (category cards, ribbons, title sign):
```css
.plank {
  border: 3px solid #3d1c07;
  border-radius: 22px;
  background:
    repeating-linear-gradient(177deg, rgba(110,55,10,0) 0 9px, rgba(110,55,10,.13) 9px 11px),
    linear-gradient(180deg, #f9d177 0%, #eba83c 55%, #cf7f22 100%);
  box-shadow:
    inset 0 3px 0 rgba(255,244,200,.6),
    inset 0 -5px 0 rgba(110,50,5,.35),
    0 7px 0 #2a1204,
    0 20px 36px rgba(0,0,0,.6);
}
```
Add two small **nail dots** at the top-left and top-right corners: `9px` circles, `radial-gradient(circle at 35% 35%, #c08a58, #4a220a)`.

**Big headline** (title-gold with brown outline):
```css
.headline {
  font-family: var(--font-display);
  color: #ffd76a;
  -webkit-text-stroke: 8px #3d1c07;
  paint-order: stroke fill;
  text-shadow: 0 5px 0 #1e0c04, 0 0 24px rgba(255,170,50,.5);
}
```

**Round gold button** (used for Back / Next):
```css
.btn-round {
  width: 56px; height: 56px; border-radius: 50%;
  border: 3px solid #3d1c07;
  background: linear-gradient(180deg, #f9d177, #d8892a);
  box-shadow: inset 0 2px 0 rgba(255,244,200,.6), 0 4px 0 #1e0c04;
}
```
Chevron icon: stroke `#3a1705`, width `3.2`, round caps.

**Scene background** (every slide):
1. `bg.jpg` full-bleed, `object-fit: cover`, slightly oversized (`inset: -60px`).
2. Overlay: `radial-gradient(90% 45% at 50% 16%, rgba(255,168,60,.30) 0%, rgba(30,12,4,0) 70%), linear-gradient(180deg, rgba(30,12,4,.10) 0%, rgba(30,12,4,.50) 55%, rgba(20,8,2,.92) 100%)`.
3. **String lights** across the top: a quadratic curve path with 8 bulbs (outer glow circle `r=10` at `rgba(255,186,80,.28)`, inner bulb `r=4` `#ffe3a0`). Stretch the curve across the full 1920 width, bulbs evenly spaced.
4. **Blurred palm leaves** in the bottom-left and bottom-right corners (`blur(2px) brightness(.5)`, mirrored, ~440×300).

**Palm leaf SVG** (reuse everywhere as `<Leaf />`; five leaflets fanned from one base):
```svg
<svg viewBox="0 0 120 80">
  <g stroke="#173a0a" stroke-width="3" stroke-linejoin="round">
    <path transform="rotate(-62 60 78)" d="M60 78 C49 58 49 26 60 4 C71 26 71 58 60 78Z" fill="#3f9a2c"/>
    <path transform="rotate(62 60 78)"  d="M60 78 C49 58 49 26 60 4 C71 26 71 58 60 78Z" fill="#3f9a2c"/>
    <path transform="rotate(-28 60 78)" d="M60 78 C49 58 49 26 60 4 C71 26 71 58 60 78Z" fill="#5cb836"/>
    <path transform="rotate(28 60 78)"  d="M60 78 C49 58 49 26 60 4 C71 26 71 58 60 78Z" fill="#5cb836"/>
    <path d="M60 78 C49 58 49 26 60 4 C71 26 71 58 60 78Z" fill="#82d24a"/>
  </g>
</svg>
```

**Rope**: a `5px` wide rounded bar with `repeating-linear-gradient(160deg, #d9b67a 0 3px, #8a5a2a 3px 6px)`. Two ropes hang from the top of the title sign.

### 4.4 Assets

Bundled in `/public/brand/` (already extracted for you, next to this file in `toddy-assets/`):

- `bg.jpg` — the background photo
- `toddycs-logo.webp` — the Toddycs logo

Logo gets `filter: drop-shadow(0 12px 20px rgba(0,0,0,.6))`.

---

## 5. Data model

```ts
// src/types.ts
export type Candidate = {
  id: string;
  name: string;            // Sinhala or English
  imageId: string | null;  // key in IndexedDB; null => placeholder avatar
};

export type Category = {
  id: string;
  title: string;           // Sinhala, shown big on slide 1
  subtitle?: string;       // optional English line shown small above the title, default "Category"
  candidates: Candidate[]; // 2–10
  winnerId: string | null; // candidate.id; null => winner slide shows "Not decided"
};

export type Deck = {
  version: 1;
  eventName: string;       // optional line under logo on title slide
  categories: Category[];  // order = play order
};
```

Seed data lives in `src/data/seed.ts` (one example category with 5 placeholder candidates), so the app is usable on first load.

Images are **not** stored in the JSON. They live in IndexedDB keyed by `imageId`, and the JSON only holds the key. This keeps the deck small and the export/import clean (see §8.4).

### Derived slide list

```ts
type Slide =
  | { kind: 'title';      categoryIndex: number }
  | { kind: 'candidates'; categoryIndex: number }
  | { kind: 'winner';     categoryIndex: number };

const slides = deck.categories.flatMap((_, i) => [
  { kind: 'title', categoryIndex: i },
  { kind: 'candidates', categoryIndex: i },
  { kind: 'winner', categoryIndex: i },
]);
```

Optional bookends (toggle in admin, default **on**): an intro slide (logo + event name) and an outro slide ("Thank you!").

---

## 6. Slides

### 6.1 Slide 1 — Category title

Centered composition on the standard scene background.

- Toddycs logo at the top, width ~380px.
- Below it, a huge **gold plank sign** (like the "Category" header on the voting site's candidate screen), centered, width ~1300px, slightly rotated `-1.2deg`.
  - Two ropes hanging from the top edge, a palm leaf tucked at each side.
  - Small caps label on the plank: `subtitle` (default `CATEGORY`), `font-size: 28px`, `font-weight: 900`, `letter-spacing: 3px`, color `ink-soft`. (English only; no letter-spacing if the subtitle contains Sinhala.)
  - **Category title in Sinhala**, `--font-sinhala`, `font-weight: 900`, color `ink`, `text-shadow: 0 3px 0 rgba(255,236,180,.7)`.
  - Font size auto-fits: start at `150px`, and shrink step by step so the title fits within 2 lines inside the plank (use a `useFitText` hook with a ResizeObserver; minimum `64px`).
- Entrance animation: plank drops in with a small bounce (`translateY(-80px) -> 0`, 600ms, spring-ish cubic-bezier), ropes and leaves fade in 150ms later.

### 6.2 Slide 2 — Candidates

- Top: small logo (left) and a compact plank header with the category title (Sinhala, ~64px), same as the voting site's candidate screen header.
- Candidate cards are laid out by count (centered, wrapping rows):

| Candidates | Layout | Photo diameter |
|-----------|--------|----------------|
| 2–3 | 1 row | 360px |
| 4–5 | 1 row (5 = tighter gap) | 300px / 280px |
| 6–8 | 2 rows of 3–4 | 250px |
| 9–10 | 2 rows of 5 | 220px |

- Each card: a **circular portrait medallion** (same construction as the winner medallion in §6.3 but smaller and without the glow rays), and below it a **name ribbon** (the notched gold ribbon shape from the "VOTE CAST!" banner, using the same `clip-path: polygon(0% 0%, 100% 0%, 93% 50%, 100% 100%, 0% 100%, 7% 50%)`), with the candidate name inside. Name font: display 40px, auto-fit to one line (shrink down to 24px; beyond that wrap to 2 lines).
- Candidate photos: `object-fit: cover`, `object-position: center 25%` (faces sit in the upper part of portraits). The admin lets you override the crop (see §7.4).
- If `imageId` is null, show the placeholder avatar (cream circle with a simple bust silhouette in `#c9a274`).
- Stagger entrance: each card pops in (`scale .6 -> 1` with slight overshoot), 90ms apart, left to right.
- Small palm leaves decorate the top corners of each medallion, as on the voting site.

### 6.3 Slide 3 — Winner reveal

Matches the voting site's **"Vote cast"** screen, scaled up.

Two states on the same slide:

1. **Pre-reveal** (state on arrival): the medallion shows a dark silhouette/"?" mark, the ribbon reads `WINNER` / `ජයග්‍රාහකයා`, the name area is hidden. A pulsing hint appears: "Press → or click to reveal".
2. **Revealed** (first Next press / click / Space): a 700ms sequence plays.
   - Medallion image swaps to the winner photo with a flash and scale pop.
   - Gold sunburst rays fade in and slowly rotate (see below).
   - Confetti bursts.
   - Name types in as a big headline.

   A **second** press goes to the next slide (the next category's title). Pressing Back from the revealed state returns to the pre-reveal state first, then to the previous slide.

Revealed layout (stage px):

- Logo top-center, ~300px wide.
- **Rays**: a `repeating-conic-gradient(from 0deg, rgba(255,206,90,.30) 0deg 7deg, rgba(255,206,90,0) 7deg 20deg)` disc, ~1100px, masked with `radial-gradient(circle, #000 25%, transparent 68%)`, rotating 60s linear infinite, centered behind the medallion.
- **Medallion** (the BIG image): ~560px circle.
  ```css
  .medallion {
    border-radius: 50%;
    padding: 28px;
    background: linear-gradient(145deg, #b8692c 0%, #6b3512 55%, #4a220a 100%);
    box-shadow:
      0 0 0 6px #1e0c04,
      0 0 0 24px #ffd23f,
      0 0 0 30px #1e0c04,
      0 0 120px 40px rgba(255,190,60,.5),
      inset 0 3px 0 rgba(255,200,140,.45);
  }
  .medallion > .photo {
    border-radius: 50%; overflow: hidden; width: 100%; height: 100%;
    box-shadow: inset 0 0 0 6px #3d1c07, inset 0 18px 30px rgba(90,40,5,.25);
    background: radial-gradient(circle at 40% 30%, #fffaf0 0%, #f1e0bf 100%);
  }
  ```
- **Banner** overlapping the bottom of the medallion: notched gold ribbon (outer dark layer + inner gold layer, as in the voting site), text `WINNER` in display ~64px, color `ink`.
- **Winner name** below the banner: the `.headline` style, ~120px (auto-fit to one line, min 64px). Sinhala names use `--font-sinhala` with a thinner stroke (§4.2).
- Below the name: category title in `cream-soft`, ~36px, e.g. "ජයග්‍රාහකයා — {category title}".

Confetti: 40–60 absolutely positioned `<i>` elements (rectangles 12×6 and dots 10×10) in `#ffd23f`, `#5cb836`, `#ff5a46`, `#82d24a`, bursting outward from behind the medallion with random angle, distance, rotation and a gravity fall. Pure CSS animations using custom properties set per element; no runtime library required. Respect `prefers-reduced-motion` (skip the burst, keep the fade).

If `winnerId` is null, the slide shows the pre-reveal state and, on reveal, a plain "Winner not set" message in the headline style. Do not crash.

---

## 7. Presenter controls

### 7.1 Next / Back buttons (required)

- Two **small** round gold buttons (`.btn-round`, 56px on the 1920 stage) at the **bottom-center**, 32px apart: `‹` Back and `›` Next. They sit inside the stage so they scale with it.
- Back is disabled (dimmed, `opacity .35`, no pointer) on the first slide; Next is disabled on the last slide.
- A small progress readout between them: `Category 2/8 · 3/3` in Nunito 800, 22px, `cream-dim`.
- Controls **auto-hide after 2.5s of no mouse movement** (fade to 0, `cursor: none` on the stage) and reappear on mouse move or touch. A setting in admin turns auto-hide off.
- `aria-label`s: "Previous slide", "Next slide".

### 7.2 Keyboard / clicker

| Input | Action |
|-------|--------|
| `→`, `Space`, `PageDown`, `Enter` | Next (on the winner slide: reveal first) |
| `←`, `PageUp`, `Backspace` | Back |
| `Home` / `End` | First / last slide |
| `F` | Toggle fullscreen |
| `Esc` | Exit fullscreen |
| `G` then number | Go to category N (optional) |
| `A` | Open admin (`/admin`) |
| Swipe left / right | Next / Back (touch) |

Presentation clickers send `PageDown` / `PageUp`, which are covered.

### 7.3 Slide transitions

Cross-fade + slight scale (`opacity 0 -> 1`, `scale .98 -> 1`, 350ms). Keep durations short; this is a live event. Respect `prefers-reduced-motion`.

### 7.4 Deep links

`/?c=3&s=2` jumps to category 3, slide 2 (so you can reopen a specific slide after a refresh). Keep the URL in sync as slides change using `history.replaceState`.

---

## 8. Admin panel (`/admin`)

A clean, usable form UI. It does **not** need to match the glossy presentation style, but reuse the palette (dark brown panels, gold accents, cream text) and the same fonts so it feels like part of the product. Optimize for **desktop and laptop**, with large click targets.

### 8.1 Layout

Two columns:

- **Left sidebar**: category list. Drag to reorder (use `@dnd-kit/sortable`), "Add category", per-item duplicate and delete (delete asks for confirmation). Each row shows the Sinhala title and "5 candidates".
- **Right editor**: the selected category.

Top bar: `Preview` (opens `/` at that category in a new tab), `Export`, `Import`, `Reset`, and a PIN lock indicator.

### 8.2 Category editor

- **Title** (Sinhala), a single-line input using `--font-sinhala` at 28px so you can see what you type.
- **Subtitle** (optional, English, default "Category").
- **Candidates list**, each row a card:
  - Thumbnail (96px circle) with click-to-upload and drag-and-drop onto the thumbnail.
  - **Name** input (Sinhala or English).
  - **Winner** radio button, "Mark as winner". Exactly one per category.
  - Reorder handle (drag), duplicate, delete.
  - "Adjust crop" button (see 8.3).
- "Add candidate" button (max 10).
- **Bulk image drop zone**: drop several image files at once and they are added as new candidates, named from the file name without extension (`kasun-perera.jpg` -> "kasun perera"). Editable afterwards.
- Live **mini preview** of the three slides for this category in the right column bottom (scaled-down render of the real slide components, not screenshots).

### 8.3 Image handling

- Accept `image/jpeg`, `image/png`, `image/webp`. Reject others with a friendly message.
- On upload: downscale to max **1200px** on the longest side and re-encode as WebP (quality 0.88) on a canvas before saving. This keeps IndexedDB small and slides crisp.
- Store as a `Blob` in IndexedDB via `idb-keyval` under key `img:{imageId}`. Create object URLs on demand and revoke on unmount.
- **Crop adjust**: a simple modal with the circular mask and a drag + zoom slider. Saves `{ x, y, zoom }` on the candidate (add `crop?: {x:number;y:number;zoom:number}` to the `Candidate` type) and applies it as `object-position` and `transform: scale()`. Default is centered-upper.
- Preload all images for the current category and the next one so slides never flash empty.

### 8.4 Persistence, export, import

The deck JSON is stored in `localStorage` under `toddy.deck.v1`, with images in IndexedDB. Autosave on every change (debounced 300ms), with a small "Saved" indicator.

> **Important:** Because there's no backend, admin edits live **in the browser you made them in**. Edit on the same machine and browser you will present from, or use Export/Import to move the deck.

- **Export** downloads a single `toddy-deck-YYYYMMDD.json` file where images are **inlined as base64 data URLs**, so one file carries the entire deck.
- **Import** reads that file, validates it with a schema (use `zod`), and replaces the current deck after a confirmation. Show a clear error if validation fails.
- **Reset** restores the seed deck after a confirmation.
- Optional: "Export as static" to write `public/candidates/*` plus `deck.json`, so the deck can be baked into the repo and deployed. Not required for v1.

### 8.5 Access

- Optional **PIN lock** for `/admin` (default off). Stored hashed (SHA-256) in `localStorage`. Say clearly in the UI that this only stops casual access since the app is client-side only.
- Accessing `/admin` while the presentation is playing on the same machine must not change the presenting tab's state mid-show. Use the `storage` event / `BroadcastChannel` so the presenter tab shows a small "Deck updated, press R to reload" toast instead of hot-swapping slides.

### 8.6 Validation and empty states

- Category needs a title; candidates need a name (image optional, placeholder shown).
- At least 2 candidates per category to play; categories with fewer are skipped in the presentation and flagged with a warning icon in the sidebar.
- Warn (don't block) if a category has no winner selected.
- Empty deck shows a friendly "Add your first category" state.

---

## 9. File structure

```
toddy-presentation/
├─ public/
│  └─ brand/
│     ├─ bg.jpg
│     └─ toddycs-logo.webp
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                    # router: "/" and "/admin"
│  ├─ fonts.ts
│  ├─ types.ts
│  ├─ data/seed.ts
│  ├─ store/
│  │  ├─ deckStore.ts            # zustand: deck, CRUD, persistence
│  │  └─ imageStore.ts           # idb-keyval wrappers + object URL cache
│  ├─ lib/
│  │  ├─ hasSinhala.ts
│  │  ├─ useFitText.ts
│  │  ├─ useStageScale.ts
│  │  ├─ resizeImage.ts
│  │  └─ deckSchema.ts           # zod
│  ├─ presenter/
│  │  ├─ Presenter.tsx           # stage, slide list, keyboard, fullscreen
│  │  ├─ Controls.tsx            # small Back / Next buttons + progress
│  │  ├─ slides/
│  │  │  ├─ TitleSlide.tsx
│  │  │  ├─ CandidatesSlide.tsx
│  │  │  └─ WinnerSlide.tsx
│  │  └─ parts/
│  │     ├─ Scene.tsx            # bg, overlay, string lights, corner leaves
│  │     ├─ Leaf.tsx
│  │     ├─ Plank.tsx
│  │     ├─ Medallion.tsx
│  │     ├─ Ribbon.tsx
│  │     ├─ Confetti.tsx
│  │     └─ Name.tsx             # auto Sinhala/English font handling
│  ├─ admin/
│  │  ├─ Admin.tsx
│  │  ├─ CategoryList.tsx
│  │  ├─ CategoryEditor.tsx
│  │  ├─ CandidateRow.tsx
│  │  ├─ CropModal.tsx
│  │  ├─ ImportExport.tsx
│  │  └─ MiniPreview.tsx
│  └─ styles/
│     ├─ index.css
│     └─ surfaces.css
├─ tailwind.config.ts
├─ vercel.json
└─ package.json
```

---

## 10. Build order

1. Scaffold Vite + React + TS + Tailwind, install dependencies, wire fonts (§4.2), copy brand assets.
2. Build the 1920×1080 `Stage` with scale-to-fit and the `Scene` background (§3, §4.3).
3. Build the shared parts: `Leaf`, `Plank`, `Medallion`, `Ribbon`, `Name`, `Confetti`.
4. Build the three slides against the seed deck (§6).
5. Build `Presenter` with slide list, keyboard, fullscreen, deep links and the small Back/Next controls (§7).
6. Build the store, IndexedDB image store and image resizing (§5, §8.3, §8.4).
7. Build the admin panel (§8), starting with category CRUD, then candidate rows and uploads, then bulk drop, crop, export/import.
8. Polish: transitions, reduced-motion, preloading, toast on deck change, PIN lock.
9. Test against the checklist below, then deploy to Vercel.

---

## 11. Acceptance checklist

**Look**
- [ ] Slides visually match the Toddycs voting site: same colors, plank/rope/leaf/nail details, gold ribbon, medallion with rays and confetti.
- [ ] Sinhala category title renders correctly with no clipped vowel signs, in a heavy weight, at slide-1 size.
- [ ] Sinhala **and** English candidate names both render correctly, on one line when possible.
- [ ] Layout holds from 2 to 10 candidates with no overlap.

**Behavior**
- [ ] Each category plays exactly: title -> candidates -> winner (pre-reveal -> reveal) -> next category.
- [ ] Small Back and Next buttons are visible, work, and disable correctly at the ends. They auto-hide when idle and return on mouse move.
- [ ] Arrow keys, Space, PageUp/PageDown, F (fullscreen) and Esc work. A presentation clicker works.
- [ ] Refreshing the page on `/?c=2&s=3` reopens the same slide.

**Admin**
- [ ] Can add, edit, reorder and delete categories and candidates.
- [ ] Can upload a candidate image by click and by drag-and-drop; bulk drop creates multiple candidates.
- [ ] Can set the winner per category.
- [ ] Changes persist across a refresh and after closing the browser.
- [ ] Export -> clear site data -> Import restores the full deck including images.
- [ ] Invalid import files show a clear error and change nothing.

**Reliability (live event)**
- [ ] With the network disabled, after one load, fonts and images still render (no external font requests in the Network tab).
- [ ] No console errors on any slide.
- [ ] 60fps on a mid-range laptop on the winner reveal.
- [ ] Missing image or missing winner never crashes a slide.

---

## 12. Event-day notes

- Do all admin edits on the **laptop you will present from**, then Export a backup JSON before the event.
- Run `npm run build && npm run preview` once locally (or load the Vercel URL once with internet) so everything is cached.
- Press `F` for fullscreen before starting; the cursor and controls hide automatically.
- Keep the exported JSON on a USB stick as a fallback.
