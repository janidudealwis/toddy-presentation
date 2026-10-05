import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MAX_ZOOM, renderCrop, type LoadedPhoto } from '../lib/image';
import { Button } from '../components/ui';

/**
 * Framing sheet, ported from the voting site's PhotoCropper: drag to move, pinch or scroll to
 * zoom, inside the same circle the slide will show.
 *
 * The gesture maths is the voting site's, unchanged — it is the part that is fiddly to get
 * right and was already right. What differs is the chrome (the voting site's admin used an
 * older ivory palette that no longer exists here) and the result: this calls renderCrop itself
 * and hands back a Blob, because there is no upload step to hand a rectangle to.
 */

/** Where the photo sits behind the frame: `zoom` is a multiple of cover, x/y are stage pixels. */
type View = { zoom: number; x: number; y: number };
type Point = { x: number; y: number };

const START: View = { zoom: 1, x: 0, y: 0 };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function CropModal({
  photo,
  onCancel,
  onConfirm,
}: {
  photo: LoadedPhoto;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  const [view, setView] = useState<View>(START);
  const [busy, setBusy] = useState(false);

  // The stage is fluid, and every crop sum is in its pixels, so measure rather than assume.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const measure = () => setStage(el.clientWidth);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /** Scale that makes the photo exactly cover the frame, before zoom. */
  const cover = stage ? stage / Math.min(photo.width, photo.height) : 0;

  /** Holds the photo over the whole frame — pan can never expose a corner. */
  const settle = useCallback(
    (next: View): View => {
      const scale = cover * next.zoom;
      const maxX = Math.max(0, (photo.width * scale - stage) / 2);
      const maxY = Math.max(0, (photo.height * scale - stage) / 2);

      return {
        zoom: next.zoom,
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [cover, photo.width, photo.height, stage],
  );

  /** Zooms towards `at` (stage-centre-relative) so the point under the fingers stays put. */
  const zoomTo = useCallback(
    (target: number, at: Point = { x: 0, y: 0 }, drift: Point = { x: 0, y: 0 }) =>
      setView((v) => {
        const zoom = Math.min(MAX_ZOOM, Math.max(1, target));
        const ratio = zoom / v.zoom;

        return settle({
          zoom,
          x: at.x - (at.x - v.x) * ratio + drift.x,
          y: at.y - (at.y - v.y) * ratio + drift.y,
        });
      }),
    [settle],
  );

  // A new photo starts fresh; a resized stage re-clamps what is already framed.
  useEffect(() => setView(START), [photo.url]);
  useEffect(() => {
    if (stage) setView((v) => settle(v));
  }, [stage, settle]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
      // The presenter's own key handler is on window and would advance a slide behind this.
      e.stopPropagation();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  // The sheet covers the page; let it, rather than the page, own the scroll.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const toStage = useCallback((p: Point): Point => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: p.x - (rect.left + rect.width / 2), y: p.y - (rect.top + rect.height / 2) };
  }, []);

  // React listens for wheel passively, so the page would scroll under the sheet.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (busy) return;
      e.preventDefault();
      setView((v) => {
        const at = toStage({ x: e.clientX, y: e.clientY });
        const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom * Math.exp(-e.deltaY / 400)));
        const ratio = zoom / v.zoom;
        return settle({ zoom, x: at.x - (at.x - v.x) * ratio, y: at.y - (at.y - v.y) * ratio });
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [busy, settle, toStage]);

  /* ── Drag and pinch ────────────────────────────────────────────────────── */

  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<{ span: number; zoom: number; mid: Point } | null>(null);

  /** Re-reads the gesture whenever a finger lands or lifts, so it never jumps. */
  const resetPinch = () => {
    const [a, b] = [...pointers.current.values()];
    pinch.current =
      pointers.current.size === 2
        ? { span: distance(a, b) || 1, zoom: view.zoom, mid: midpoint(a, b) }
        : null;
  };

  function onPointerDown(e: React.PointerEvent) {
    if (busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    resetPinch();
  }

  function onPointerMove(e: React.PointerEvent) {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;

    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);

    if (pointers.current.size === 1) {
      setView((v) =>
        settle({ ...v, x: v.x + (next.x - previous.x), y: v.y + (next.y - previous.y) }),
      );
      return;
    }

    const gesture = pinch.current;
    if (pointers.current.size !== 2 || !gesture) return;

    const [a, b] = [...pointers.current.values()];
    const span = distance(a, b);
    if (!span) return;

    const mid = midpoint(a, b);
    // Zoom is measured from where the pinch began; the drag of the midpoint is consumed
    // each move, so two fingers can magnify and reposition in one gesture.
    zoomTo(gesture.zoom * (span / gesture.span), toStage(mid), {
      x: mid.x - gesture.mid.x,
      y: mid.y - gesture.mid.y,
    });
    pinch.current = { ...gesture, mid };
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    resetPinch();
  }

  /* ── Result ────────────────────────────────────────────────────────────── */

  async function confirm() {
    if (!stage || busy) return;
    setBusy(true);

    try {
      const scale = cover * view.zoom;
      const size = stage / scale;
      const centre = { x: photo.width / 2 - view.x / scale, y: photo.height / 2 - view.y / scale };
      const hold = (value: number, span: number) => Math.max(0, Math.min(span - size, value));

      const blob = await renderCrop(photo, {
        x: hold(centre.x - size / 2, photo.width),
        y: hold(centre.y - size / 2, photo.height),
        size,
      });

      await onConfirm(blob);
    } finally {
      setBusy(false);
    }
  }

  const scale = cover * view.zoom;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Frame the photo"
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-night-deep/90 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="grid w-full max-w-md gap-4 rounded-card border-2 border-bark-line bg-[#241005] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
        <div>
          <h2 className="font-display text-xl text-gold">Frame the photo</h2>
          <p className="m-0 mt-1 text-xs font-semibold text-cream-mute">
            Drag to move, pinch or scroll to zoom. The circle is what the slide shows.
          </p>
        </div>

        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative aspect-square w-full cursor-grab touch-none overflow-hidden rounded-xl bg-[#140802] active:cursor-grabbing"
        >
          <img
            src={photo.url}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
            style={{
              width: photo.width * scale,
              height: photo.height * scale,
              transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px)`,
            }}
          />

          {/* Everything outside the circle dims, the way a profile picker frames a face. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ boxShadow: '0 0 0 9999px rgba(20, 8, 2, 0.7)' }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-gold/70"
          />
        </div>

        <label className="grid gap-1">
          <span className="text-xs font-extrabold text-cream-dim">Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={view.zoom}
            disabled={busy}
            onChange={(e) => zoomTo(Number(e.target.value))}
            className="w-full accent-gold-bright"
          />
        </label>

        <div className="flex gap-2">
          <Button busy={busy} className="flex-1" onClick={() => void confirm()}>
            Use photo
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
