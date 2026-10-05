/**
 * Which typeface a piece of title text is set in, and how a title says so.
 *
 * This exists because the two scripts cannot be told apart by looking at the characters. The
 * Sinhala face is pre-Unicode: it draws Sinhala on the *Latin* codepoints, so "Best Player" and
 * a Sinhala title are both, as far as the string is concerned, plain ASCII. There is no
 * `hasSinhala(text)` to write — the same bytes are valid in either script and mean different
 * things. So the script has to be recorded, not detected.
 *
 * A category carries one `titleScript` for its whole title, and a title can override it for a
 * span by wrapping that span in [[ ]]:
 *
 *   titleScript: 'sinhala',  title: 'fydÈu [[MVP]] l%Svlhd'   → Sinhala, "MVP" in English
 *   titleScript: 'english',  title: 'Best [[l%Svlhd]] of 2024' → English, one Sinhala word
 *
 * Double brackets rather than single: one bracket is a key a legacy Sinhala layout may well
 * produce, two in a row is not.
 */

export type Script = 'sinhala' | 'english';

export const OTHER: Record<Script, Script> = { sinhala: 'english', english: 'sinhala' };

export const SCRIPT_LABEL: Record<Script, string> = { sinhala: 'සිංහල', english: 'English' };

const OPEN = '[[';
const CLOSE = ']]';

export type Span = { text: string; script: Script };

/**
 * Splits a title into runs of one script each.
 *
 * Deliberately forgiving: an unclosed [[ marks everything after it rather than failing, and an
 * empty [[]] is dropped. A half-typed marker is the normal state of the field while someone is
 * typing into it, and the live preview under the input must not blow up mid-keystroke.
 */
export function parseScript(text: string, base: Script): Span[] {
  const spans: Span[] = [];
  const other = OTHER[base];

  let at = 0;
  while (at < text.length) {
    const open = text.indexOf(OPEN, at);

    if (open === -1) {
      push(spans, text.slice(at), base);
      break;
    }

    push(spans, text.slice(at, open), base);

    const close = text.indexOf(CLOSE, open + OPEN.length);
    if (close === -1) {
      push(spans, text.slice(open + OPEN.length), other);
      break;
    }

    push(spans, text.slice(open + OPEN.length, close), other);
    at = close + CLOSE.length;
  }

  return spans.length ? spans : [{ text, script: base }];
}

function push(spans: Span[], text: string, script: Script) {
  if (!text) return;
  // Merge touching runs of the same script so "a[[]]b" is one span, not three.
  const last = spans[spans.length - 1];
  if (last && last.script === script) last.text += text;
  else spans.push({ text, script });
}

/** The title with its markers stripped — what the text actually reads as. */
export const plainTitle = (text: string) =>
  parseScript(text, 'sinhala')
    .map((s) => s.text)
    .join('');

/**
 * Wraps (or unwraps) the selected range, for the admin's "mark selection" button. Returns the
 * new text and where the selection should sit afterwards, so the caller can restore it.
 */
export function toggleMark(text: string, start: number, end: number) {
  const before = text.slice(0, start);
  const selected = text.slice(start, end);
  const after = text.slice(end);

  // Already wrapped, either inside the selection or immediately around it — unwrap instead.
  if (selected.startsWith(OPEN) && selected.endsWith(CLOSE) && selected.length >= 4) {
    const inner = selected.slice(OPEN.length, -CLOSE.length);
    return { text: before + inner + after, start, end: start + inner.length };
  }
  if (before.endsWith(OPEN) && after.startsWith(CLOSE)) {
    return {
      text: before.slice(0, -OPEN.length) + selected + after.slice(CLOSE.length),
      start: start - OPEN.length,
      end: end - OPEN.length,
    };
  }

  return {
    text: `${before}${OPEN}${selected}${CLOSE}${after}`,
    start: start + OPEN.length,
    end: end + OPEN.length,
  };
}
