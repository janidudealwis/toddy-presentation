import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDeck } from '../store/deckStore';
import { Button, Toggle } from '../components/ui';
import { CategoryList } from './CategoryList';
import { CategoryEditor } from './CategoryEditor';
import { ImportExport } from './ImportExport';
import { PinGate } from './PinGate';

/**
 * The admin panel. Not styled as signage — it is a form, and a form at a venue needs to be
 * fast to read and hard to mis-tap. It borrows the palette and the fonts so it still reads as
 * the same product as the slides.
 */
export function Admin() {
  const deck = useDeck((s) => s.deck);
  const saved = useDeck((s) => s.saved);
  const edit = useDeck((s) => s.edit);
  const addCategory = useDeck((s) => s.addCategory);

  const [selectedId, setSelectedId] = useState<string | null>(deck.categories[0]?.id ?? null);

  // Keep the selection valid as categories come and go (delete, import, reset).
  useEffect(() => {
    if (selectedId && deck.categories.some((c) => c.id === selectedId)) return;
    setSelectedId(deck.categories[0]?.id ?? null);
  }, [deck.categories, selectedId]);

  const selected = deck.categories.find((c) => c.id === selectedId) ?? null;
  const selectedIndex = deck.categories.findIndex((c) => c.id === selectedId);

  return (
    <PinGate>
      <div className="min-h-dvh bg-night text-cream">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-4 border-b-2 border-bark-line bg-[#180a02] px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/brand/td26.webp" alt="" width={44} height={29} className="object-contain" />
            <h1 className="font-display text-2xl text-gold">Presentation admin</h1>
          </div>

          <span
            className="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider"
            style={
              saved
                ? { borderColor: 'rgba(130,210,74,0.5)', color: '#82d24a', background: '#16300a' }
                : { borderColor: 'rgba(255,214,106,0.5)', color: '#ffd76a', background: '#33200a' }
            }
          >
            {saved ? 'Saved' : 'Saving…'}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Opens the show at the category being edited, in its own tab, so the admin
                // keeps its place.
                const at = selectedIndex >= 0 ? `?c=${selectedIndex + 1}&s=1` : '';
                window.open(`/${at}`, '_blank', 'noopener');
              }}
            >
              Preview
            </Button>
            <ImportExport onPicked={setSelectedId} />
          </div>
        </header>

        <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-6 py-6 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-[340px]">
            <CategoryList selectedId={selectedId} onSelect={setSelectedId} />

            <Button className="mt-3 w-full" onClick={() => setSelectedId(addCategory())}>
              Add category
            </Button>

            <section className="mt-6 grid gap-4 rounded-2xl border-2 border-bark-line bg-[#241005] p-4">
              <h2 className="font-display text-lg text-gold">Show settings</h2>

              <label className="grid gap-1.5">
                <span className="text-sm font-extrabold text-cream-dim">Event name</span>
                <input
                  value={deck.eventName}
                  onChange={(e) => edit((d) => ({ ...d, eventName: e.target.value }))}
                  placeholder="Toddycs Awards"
                  className="min-h-11 w-full rounded-xl border-2 border-bark-line bg-[#2a1206] px-3 font-bold text-cream placeholder:text-cream-mute/50 focus:border-gold focus:outline-none"
                />
              </label>

              <Toggle
                label="Intro and outro slides"
                hint="A logo slide to open on, and a Thank you! to end on."
                checked={deck.bookends}
                onChange={(bookends) => edit((d) => ({ ...d, bookends }))}
              />

              <Toggle
                label="Hide the cursor when idle"
                hint="Takes the mouse pointer off the projector after 2.5s of stillness."
                checked={deck.hideCursorWhenIdle}
                onChange={(hideCursorWhenIdle) => edit((d) => ({ ...d, hideCursorWhenIdle }))}
              />
            </section>

            <p className="mt-5 rounded-xl border-2 border-gold/30 bg-[#2a1505] p-3 text-xs font-semibold leading-relaxed text-cream-mute">
              There is no server. Edits live in <strong className="text-cream-dim">this</strong>{' '}
              browser on this machine — so edit on the laptop you will present from, and use
              Export to carry a deck anywhere else.
            </p>

            <Link
              to="/"
              className="mt-4 inline-block text-sm font-extrabold text-cream-mute underline-offset-2 hover:text-gold hover:underline"
            >
              ← Back to the presentation
            </Link>
          </aside>

          <main className="min-w-0 flex-1">
            {selected ? (
              <CategoryEditor key={selected.id} category={selected} />
            ) : (
              <div className="rounded-card border-2 border-dashed border-gold/25 bg-[#201002] px-8 py-20 text-center">
                <h2 className="font-display text-3xl text-gold">Add your first category</h2>
                <p className="mx-auto mt-3 max-w-md text-sm font-semibold text-cream-dim">
                  A category is one award: a Sinhala title, the people in the running, and which
                  of them won. Each one plays as three slides.
                </p>
                <Button className="mt-6" onClick={() => setSelectedId(addCategory())}>
                  Add category
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </PinGate>
  );
}
