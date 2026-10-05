import { useRef, useState } from 'react';
import type { Category } from '../types';
import { OTHER, SCRIPT_LABEL, toggleMark, type Script } from '../lib/script';
import { useDeck } from '../store/deckStore';
import { ScriptText } from '../presenter/parts/ScriptText';
import { cn } from '../lib/cn';

/**
 * The category title, with its script.
 *
 * Two things the field has to do that a plain input cannot. First, pick the typeface for the
 * whole title — the two scripts share the same codepoints, so nothing about the text itself says
 * which one it is (see lib/script.ts). Second, let one title mix both, which is done by marking
 * the odd span rather than by splitting the title into two fields: a mixed title is one phrase
 * and it reads and edits as one.
 *
 * A plain <input> cannot show two typefaces at once, so it is set in the title's main script and
 * the preview underneath renders what the slide will actually draw. That preview is the whole
 * reason the markers are workable — it means you never have to picture the result.
 */
export function TitleField({ category }: { category: Category }) {
  const updateCategory = useDeck((s) => s.updateCategory);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const script: Script = category.titleScript ?? 'sinhala';
  const other = OTHER[script];
  const hasSelection = selection.end > selection.start;

  const setTitle = (title: string) => updateCategory(category.id, { title });

  /** Wraps the selected words so they render in the other script. */
  const mark = () => {
    const input = inputRef.current;
    if (!input) return;

    const next = toggleMark(category.title, input.selectionStart ?? 0, input.selectionEnd ?? 0);
    setTitle(next.text);

    // The edit moves the caret, so put the selection back over the same words — otherwise the
    // obvious next action (undo it, having seen the preview) needs re-selecting by hand.
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(next.start, next.end);
      setSelection({ start: next.start, end: next.end });
    });
  };

  const trackSelection = () =>
    setSelection({
      start: inputRef.current?.selectionStart ?? 0,
      end: inputRef.current?.selectionEnd ?? 0,
    });

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-extrabold text-cream-dim">Category title</span>

        <div
          role="group"
          aria-label="Title script"
          className="flex overflow-hidden rounded-lg border-2 border-bark-line"
        >
          {(['sinhala', 'english'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={script === option}
              onClick={() => updateCategory(category.id, { titleScript: option })}
              className={cn(
                'px-3 py-1 text-xs font-black transition-colors',
                option === 'sinhala' && 'sinhala text-sm',
                script === option
                  ? 'bg-gold text-carve'
                  : 'bg-[#2a1206] text-cream-mute hover:text-gold',
              )}
            >
              {option === 'sinhala' ? 'සිංහල' : 'EN'}
            </button>
          ))}
        </div>
      </div>

      <input
        ref={inputRef}
        value={category.title}
        onChange={(e) => {
          setTitle(e.target.value);
          trackSelection();
        }}
        onSelect={trackSelection}
        onKeyUp={trackSelection}
        onClick={trackSelection}
        placeholder={
          script === 'sinhala' ? 'Type with your Sinhala keyboard' : 'Type the title in English'
        }
        // 28px so what you type is legible while typing it.
        className={cn(
          'min-h-14 w-full rounded-xl border-2 border-bark-line bg-[#2a1206] px-4 text-[28px]',
          'leading-[1.35] text-cream placeholder:text-base placeholder:text-cream-mute/50',
          'focus:border-gold focus:outline-none',
          script === 'sinhala' ? 'sinhala' : 'font-display',
        )}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!hasSelection}
          onClick={mark}
          className={cn(
            'rounded-lg border-2 px-2.5 py-1 text-xs font-extrabold transition-colors',
            hasSelection
              ? 'border-gold/60 bg-[#33200a] text-gold hover:bg-[#3d2709]'
              : 'cursor-not-allowed border-bark-line bg-[#241005] text-cream-mute/50',
          )}
        >
          Set selection in {SCRIPT_LABEL[other]}
        </button>

        <p className="m-0 text-xs font-semibold text-cream-mute">
          {hasSelection
            ? `Wraps it in [[ ]] — press again to undo.`
            : `Select part of the title to set just that part in ${SCRIPT_LABEL[other]}.`}
        </p>
      </div>

      <TitlePreview title={category.title} script={script} />
    </div>
  );
}

/** Exactly what slide 1 will draw, at a readable size. */
function TitlePreview({ title, script }: { title: string; script: Script }) {
  return (
    <div className="mt-1 grid gap-1 rounded-xl border-2 border-bark-line bg-[#1d0d03] px-4 py-3">
      <span className="text-[10px] font-black uppercase tracking-wider text-cream-mute">
        On the slide
      </span>
      {title.trim() ? (
        <span className="text-[26px] leading-[1.35] text-cream">
          <ScriptText text={title} script={script} />
        </span>
      ) : (
        <span className="text-sm font-semibold text-cream-mute/60">Nothing typed yet.</span>
      )}
    </div>
  );
}
