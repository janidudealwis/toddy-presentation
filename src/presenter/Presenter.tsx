import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildSlides, type Slide } from '../types';
import { onDeckChanged, useDeck } from '../store/deckStore';
import { preloadImages } from '../store/imageStore';
import { STAGE_H, STAGE_W, useStageScale } from '../lib/useStageScale';
import { useFullscreen } from '../lib/useFullscreen';
import { Scene } from './parts/Scene';
import { TitleSlide } from './slides/TitleSlide';
import { CandidatesSlide } from './slides/CandidatesSlide';
import { WinnerSlide } from './slides/WinnerSlide';
import { IntroSlide, OutroSlide } from './slides/BookendSlides';
import { EmptyState } from '../components/ui';

const IDLE_MS = 2500;

export function Presenter() {
  const navigate = useNavigate();
  const deck = useDeck((s) => s.deck);
  const reload = useDeck((s) => s.reload);

  const slides = useMemo(() => buildSlides(deck), [deck]);
  const scale = useStageScale();
  const { toggle: toggleFullscreen } = useFullscreen();

  const [index, setIndex] = useState(() => initialIndex(slides));
  const [deckStale, setDeckStale] = useState(false);

  // Clamp rather than reset: editing the deck in another tab can shorten it while this tab
  // sits on the old last slide.
  const safeIndex = Math.min(index, Math.max(0, slides.length - 1));
  const slide = slides[safeIndex] as Slide | undefined;

  /* ── Navigation ────────────────────────────────────────────────────────── */

  // Every press moves a slide. The winner slide has no held-back state to press through —
  // arriving on it shows the winner, and its flourish plays on entry.
  const go = useCallback(
    (to: number) => setIndex(Math.max(0, Math.min(slides.length - 1, to))),
    [slides.length],
  );

  const next = useCallback(() => go(safeIndex + 1), [go, safeIndex]);
  const back = useCallback(() => go(safeIndex - 1), [go, safeIndex]);

  /* ── Deep links ────────────────────────────────────────────────────────── */

  // Kept in the URL so a refresh — or a crash — reopens the slide that was on screen.
  useEffect(() => {
    if (!slide) return;

    const params = new URLSearchParams();
    if (slide.kind === 'title' || slide.kind === 'candidates' || slide.kind === 'winner') {
      params.set('c', String(slide.categoryIndex + 1));
      params.set('s', String(slide.kind === 'title' ? 1 : slide.kind === 'candidates' ? 2 : 3));
    } else {
      params.set('s', slide.kind);
    }

    history.replaceState(null, '', `${location.pathname}?${params}`);
  }, [slide]);

  /* ── Keyboard and clicker ──────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Let the browser have its own chords, and never hijack typing in a field.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
        case 'Enter':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
        case 'PageUp':
        case 'Backspace':
          e.preventDefault();
          back();
          break;
        case 'Home':
          e.preventDefault();
          go(0);
          break;
        case 'End':
          e.preventDefault();
          go(slides.length - 1);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'r':
        case 'R':
          // Picks up a deck edited in the admin tab. Only meaningful once something changed.
          if (deckStale) {
            reload();
            setDeckStale(false);
          }
          break;
        case 'a':
        case 'A':
          navigate('/admin');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, back, go, slides.length, toggleFullscreen, navigate, deckStale, reload]);

  /* ── Idle cursor ───────────────────────────────────────────────────────── */

  // There is no on-screen chrome to hide any more — the show is driven from the keyboard or a
  // clicker — but a mouse pointer parked in the middle of a projected slide is still a mark on
  // the wall, so it goes away once the mouse stops.

  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!deck.hideCursorWhenIdle) {
      setIdle(false);
      return;
    }

    const wake = () => {
      setIdle(false);
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS);
    };

    wake();
    window.addEventListener('mousemove', wake);
    window.addEventListener('touchstart', wake);
    window.addEventListener('keydown', wake);

    return () => {
      clearTimeout(idleTimer.current);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('touchstart', wake);
      window.removeEventListener('keydown', wake);
    };
  }, [deck.hideCursorWhenIdle]);

  /* ── Cross-tab edits ───────────────────────────────────────────────────── */

  // A toast, never a hot swap: the admin is usually open on the presenting laptop, and a
  // slide changing mid-sentence is worse than a stale one.
  useEffect(() => onDeckChanged(() => setDeckStale(true)), []);

  /* ── Image preloading ──────────────────────────────────────────────────── */

  useEffect(() => {
    if (!slide || !('categoryIndex' in slide)) return;

    const wanted = [slide.categoryIndex, slide.categoryIndex + 1]
      .map((i) => deck.categories[i])
      .filter(Boolean)
      .flatMap((c) => c.candidates.map((cand) => cand.imageId));

    void preloadImages(wanted);
  }, [slide, deck.categories]);

  /* ── Touch ─────────────────────────────────────────────────────────────── */

  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const from = touchX.current;
    touchX.current = null;
    if (from === null) return;

    const dx = (e.changedTouches[0]?.clientX ?? from) - from;
    if (Math.abs(dx) < 60) return;
    if (dx < 0) next();
    else back();
  };

  /* ── Render ────────────────────────────────────────────────────────────── */

  if (!slides.length) {
    return (
      <Stage scale={scale}>
        <Scene />
        <div className="relative grid size-full place-items-center px-40">
          <EmptyState title="Nothing to present yet">
            Add a category with at least two candidates in the admin panel, then come back.
            Press <kbd className="font-display text-gold">A</kbd> to open it.
          </EmptyState>
        </div>
      </Stage>
    );
  }

  const category =
    slide && 'categoryIndex' in slide ? deck.categories[slide.categoryIndex] : undefined;

  return (
    <Stage scale={scale} hideCursor={idle} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Scene />

      {/*
        Keyed on the slide so every entrance animation restarts on arrival — React would
        otherwise reuse the element tree between two slides of the same kind and the cards
        would simply appear. The click target is the whole stage, which is what makes a
        presentation clicker's left-click advance.
      */}
      <div
        key={safeIndex}
        className="slide-in absolute inset-0"
        style={{ animation: 'slide-enter 350ms ease-out both' }}
        onClick={next}
      >
        {slide?.kind === 'intro' && <IntroSlide eventName={deck.eventName} />}
        {slide?.kind === 'outro' && <OutroSlide />}
        {slide?.kind === 'title' && category && <TitleSlide category={category} />}
        {slide?.kind === 'candidates' && category && <CandidatesSlide category={category} />}
        {slide?.kind === 'winner' && category && (
          <WinnerSlide category={category} />
        )}
      </div>

      {deckStale && (
        <div className="absolute bottom-7 right-8 rounded-xl border-2 border-gold/50 bg-night/90 px-4 py-3 text-base font-extrabold text-gold">
          Deck updated — press <kbd className="font-display">R</kbd> to reload
        </div>
      )}
    </Stage>
  );
}

/* ── Stage ───────────────────────────────────────────────────────────────── */

function Stage({
  scale,
  hideCursor = false,
  children,
  ...rest
}: {
  scale: number;
  hideCursor?: boolean;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className="fixed inset-0 overflow-hidden bg-night"
      style={{ cursor: hideCursor ? 'none' : 'default' }}
      {...rest}
    >
      <div
        // Clipped to the frame: anything a slide runs past the edge on purpose — the title
        // sign's ropes disappearing off the top — must stop at the stage, not bleed into the
        // letterbox bars.
        className="absolute left-1/2 top-1/2 origin-top-left overflow-hidden"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          // Centre by translating half the *scaled* size back, which is why the translate
          // comes before the scale in the list but applies after it.
          transform: `translate(${(-STAGE_W * scale) / 2}px, ${(-STAGE_H * scale) / 2}px) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Reads `?c=&s=` so a refresh reopens the same slide. */
function initialIndex(slides: Slide[]) {
  const params = new URLSearchParams(location.search);
  const c = Number(params.get('c'));
  const s = params.get('s');

  if (s === 'intro') return 0;
  if (s === 'outro') return Math.max(0, slides.length - 1);
  if (!Number.isFinite(c) || c < 1) return 0;

  const kind = s === '2' ? 'candidates' : s === '3' ? 'winner' : 'title';
  const found = slides.findIndex(
    (slide) => 'categoryIndex' in slide && slide.categoryIndex === c - 1 && slide.kind === kind,
  );

  return found < 0 ? 0 : found;
}

