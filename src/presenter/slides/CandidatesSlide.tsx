import type { Candidate, Category } from '../../types';
import type { Script } from '../../lib/script';
import { useImageUrls } from '../../lib/useImageUrls';
import { useFitText } from '../../lib/useFitText';
import { Leaf, Logo } from '../parts/Leaf';
import { Plank } from '../parts/Plank';
import { Medallion } from '../parts/Medallion';
import { NamePlate } from '../parts/NamePlate';
import { ScriptText } from '../parts/ScriptText';

/**
 * Slide 2 — everyone in the running.
 */

/** Stage width less the side padding, and the height left under the header. */
const ROW_BUDGET = 1920 - 2 * 48;
const COLUMN_BUDGET = 810;

type Plan = {
  /** How many candidates sit on each row, in order. */
  rows: number[];
  diameter: number;
  plate: number;
  nameSize: number;
  gap: number;
};

/**
 * The arrangement for each headcount.
 *
 * Rows are balanced rather than filled left-to-right: five candidates read as 3 over 2, not as
 * a rank of five. A single long row forces every portrait small enough that the widest case
 * fits, wastes the height of a 16:9 stage, and crowds the stage edges — splitting the count
 * means the widest row is three, so each portrait can be half as large again.
 *
 * Four stays on one row because 2 over 2 reads as a grid rather than a line-up, and at four
 * the row is still comfortably inside the stage.
 *
 * Note what binds each case. A one-row layout is limited by the stage width, so three
 * candidates can be much larger than four. A two-row layout is limited by the stage *height*
 * instead — its widest row is only ever three to five portraits, which fits easily — so every
 * two-row case lands at roughly the same diameter regardless of headcount, and those sizes are
 * chosen to keep the bottom row off the foot of the stage rather than to fill the width.
 */
const PLAN: Record<number, Plan> = {
  2: { rows: [2], diameter: 420, plate: 460, nameSize: 56, gap: 120 },
  3: { rows: [3], diameter: 400, plate: 440, nameSize: 54, gap: 90 },
  4: { rows: [4], diameter: 350, plate: 380, nameSize: 50, gap: 80 },
  5: { rows: [3, 2], diameter: 280, plate: 315, nameSize: 42, gap: 70 },
  6: { rows: [3, 3], diameter: 280, plate: 312, nameSize: 42, gap: 66 },
  7: { rows: [4, 3], diameter: 265, plate: 292, nameSize: 40, gap: 58 },
  8: { rows: [4, 4], diameter: 265, plate: 292, nameSize: 40, gap: 58 },
  9: { rows: [5, 4], diameter: 245, plate: 272, nameSize: 36, gap: 48 },
  10: { rows: [5, 5], diameter: 245, plate: 272, nameSize: 36, gap: 48 },
};

const ROW_GAP = 44;

const planFor = (count: number) => PLAN[Math.min(10, Math.max(2, count))] ?? PLAN[10];

/** A card is the portrait plus the name plate tucked under it. */
const cardHeight = (p: Plan) =>
  p.diameter + p.nameSize * 1.65 + p.nameSize * 0.096 - p.plate * 0.06;

if (import.meta.env.DEV) {
  // Both overflows are silent: a row too wide pushes portraits off the side of the projector,
  // and rows too tall push the bottom one off the foot of it. Neither wraps nor scrolls.
  for (let count = 2; count <= 10; count++) {
    const p = planFor(count);
    const seated = p.rows.reduce((n, r) => n + r, 0);
    const widest = Math.max(...p.rows);
    const width = widest * p.plate + (widest - 1) * p.gap;
    const height = p.rows.length * cardHeight(p) + (p.rows.length - 1) * ROW_GAP;

    if (seated !== count) console.error(`CandidatesSlide: ${count} candidates seats ${seated}.`);
    if (width > ROW_BUDGET)
      console.error(`CandidatesSlide: ${count} is ${Math.round(width)}px wide, over ${ROW_BUDGET}.`);
    if (height > COLUMN_BUDGET)
      console.error(`CandidatesSlide: ${count} is ${Math.round(height)}px tall, over ${COLUMN_BUDGET}.`);
    if (p.diameter > p.plate)
      console.error(`CandidatesSlide: ${count} has a portrait wider than its cell.`);
  }
}

export function CandidatesSlide({ category }: { category: Category }) {
  const plan = planFor(category.candidates.length);
  const urls = useImageUrls(category.candidates.map((c) => c.imageId));

  // Deal the candidates into the planned rows. The plan is written for a full house, so a
  // short deck (a category mid-edit) just fills as far as it goes.
  const rows: Candidate[][] = [];
  let at = 0;
  for (const size of plan.rows) {
    const row = category.candidates.slice(at, at + size);
    if (row.length) rows.push(row);
    at += size;
  }
  if (at < category.candidates.length) rows.push(category.candidates.slice(at));

  return (
    <div className="flex size-full flex-col items-center px-12 pb-6 pt-6">
      {/* The logo sits out of the flow at the left so the sign can centre on the stage rather
          than on whatever is left over beside it. */}
      <header className="relative flex w-full justify-center">
        <Logo width={170} className="absolute left-0 top-1/2 -translate-y-1/2" />

        {/* No ropes: this header is pinned to the top of the stage, so there is nothing above
            it for them to hang from. */}
        <Plank width={1180} size="sm" rotate={-0.6} ropes={false} leaves={false}>
          <span
            className="font-sans uppercase text-ink-soft"
            style={{ fontSize: 17, fontWeight: 900, letterSpacing: 2.5 }}
          >
            {category.subtitle?.trim() || 'Category'}
          </span>
          <HeaderTitle title={category.title} script={category.titleScript ?? 'sinhala'} />
        </Plank>
      </header>

      <div
        className="flex flex-1 flex-col items-center justify-center"
        style={{ gap: ROW_GAP }}
      >
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-start justify-center"
            style={{ gap: plan.gap }}
          >
            {row.map((candidate, i) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                photoUrl={candidate.imageId ? urls[candidate.imageId] ?? null : null}
                plan={plan}
                // Counted across the whole slide so the stagger reads as one sweep, not as
                // two rows each starting over.
                index={plan.rows.slice(0, rowIndex).reduce((n, r) => n + r, 0) + i}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The header title fits to one line — it is a reminder of the category, not the headline. */
function HeaderTitle({ title, script }: { title: string; script: Script }) {
  const { ref, size } = useFitText<HTMLHeadingElement>({ max: 54, min: 28, lines: 1, text: title });

  return (
    <h2 ref={ref} className="topic block w-full break-words" style={{ fontSize: size }}>
      {title ? <ScriptText text={title} script={script} /> : '—'}
    </h2>
  );
}

function CandidateCard({
  candidate,
  photoUrl,
  plan,
  index,
}: {
  candidate: Candidate;
  photoUrl: string | null;
  plan: Plan;
  index: number;
}) {
  return (
    <div
      className="flex flex-col items-center"
      style={{
        width: plan.plate,
        animation: `card-pop 420ms cubic-bezier(0.22, 1.3, 0.4, 1) ${index * 90}ms both`,
      }}
    >
      <div className="relative" style={{ width: plan.diameter, height: plan.diameter }}>
        {/* The fronds tucked behind each portrait, as on the voting site's ballot cells. */}
        <Leaf
          className="absolute -left-[18%] top-[50%] -rotate-[58deg]"
          width={plan.diameter * 0.66}
        />
        <Leaf
          className="absolute -right-[18%] top-[50%] rotate-[58deg]"
          width={plan.diameter * 0.66}
        />
        <Leaf
          small
          className="absolute -top-[8%] right-[4%] rotate-[30deg]"
          width={plan.diameter * 0.48}
        />

        <Medallion photoUrl={photoUrl} size={plan.diameter} />
      </div>

      {/* Overlapping the portrait, the way a label is nailed on under it. */}
      <NamePlate
        name={candidate.name || '—'}
        width={plan.plate}
        fontSize={plan.nameSize}
        className="-mt-[6%]"
      />
    </div>
  );
}
