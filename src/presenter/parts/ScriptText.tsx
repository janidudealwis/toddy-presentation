import { parseScript, type Script } from '../../lib/script';

/**
 * Renders a title, switching typeface per span.
 *
 * The parent still owns the lettering treatment — `.topic` on a sign, `.carved` on the winner
 * name — and this only overrides the family and weight inside it, so an English word keeps the
 * same white fill, stroke and shadow as the Sinhala around it and reads as one piece of signage
 * rather than two fonts sharing a line.
 *
 * `tone` picks what "English" means in context: signage is set in the display face, body copy in
 * the UI face. Weights are pinned rather than inherited because `.topic` asks for 600 — right
 * for the Sinhala stack, but Lilita One ships only 400, and asking it for 600 gets a synthesised
 * bold that is visibly heavier than the Sinhala beside it.
 */
export function ScriptText({
  text,
  script,
  tone = 'display',
}: {
  text: string;
  script: Script;
  tone?: 'display' | 'body';
}) {
  const spans = parseScript(text, script);

  // The common case is a title entirely in one script; no wrapper spans needed for it.
  if (spans.length === 1) {
    return <span style={styleFor(spans[0].script, tone)}>{spans[0].text}</span>;
  }

  return (
    <>
      {spans.map((span, i) => (
        <span key={i} style={styleFor(span.script, tone)}>
          {span.text}
        </span>
      ))}
    </>
  );
}

function styleFor(script: Script, tone: 'display' | 'body'): React.CSSProperties {
  if (script === 'sinhala') {
    return { fontFamily: 'var(--font-sinhala)', fontWeight: 600 };
  }
  return tone === 'body'
    ? { fontFamily: 'var(--font-sans)', fontWeight: 800 }
    : { fontFamily: 'var(--font-display)', fontWeight: 400 };
}
