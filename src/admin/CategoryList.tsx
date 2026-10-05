import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { isPlayable, type Category } from '../types';
import { useDeck } from '../store/deckStore';
import { cn, CopyIcon, DragIcon, TrashIcon, WarnIcon } from '../components/ui';
import { ScriptText } from '../presenter/parts/ScriptText';

/**
 * The category list, in play order. Dragging a row changes the order of the show.
 *
 * The pointer sensor needs an activation distance: without one, every click on a row is
 * treated as the start of a drag and selecting a category by tapping it stops working.
 */
export function CategoryList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const categories = useDeck((s) => s.deck.categories);
  const moveCategory = useDeck((s) => s.moveCategory);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    moveCategory(
      categories.findIndex((c) => c.id === active.id),
      categories.findIndex((c) => c.id === over.id),
    );
  };

  if (!categories.length) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-gold/25 bg-[#201002] px-4 py-8 text-center text-sm font-semibold text-cream-mute">
        No categories yet.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ol className="grid list-none gap-2 p-0">
          {categories.map((category, index) => (
            <Row
              key={category.id}
              category={category}
              index={index}
              selected={category.id === selectedId}
              onSelect={() => onSelect(category.id)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function Row({
  category,
  index,
  selected,
  onSelect,
}: {
  category: Category;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const duplicateCategory = useDeck((s) => s.duplicateCategory);
  const removeCategory = useDeck((s) => s.removeCategory);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const count = category.candidates.length;
  const playable = isPlayable(category);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-10 opacity-90')}
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-2xl border-2 bg-[#241005] p-2 pl-1',
          selected ? 'border-gold shadow-[0_0_0_2px_rgba(255,214,106,0.25)]' : 'border-bark-line',
        )}
      >
        <button
          type="button"
          aria-label={`Reorder ${category.title || 'category'}`}
          className="grid size-9 shrink-0 cursor-grab place-items-center rounded-lg text-cream-mute hover:text-gold active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <DragIcon className="size-5" />
        </button>

        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex items-center gap-1.5">
            <span className="font-display text-xs text-cream-mute">{index + 1}</span>
            {!playable && (
              <span
                title="Needs at least 2 candidates — this category is skipped in the show."
                className="text-live"
              >
                <WarnIcon className="size-4" />
              </span>
            )}
            {playable && !category.winnerId && (
              <span title="No winner chosen yet." className="text-gold/80">
                <WarnIcon className="size-4" />
              </span>
            )}
          </span>
          <span className="block truncate text-lg leading-tight text-cream">
            {category.title ? (
              <ScriptText text={category.title} script={category.titleScript ?? 'sinhala'} />
            ) : (
              <span className="font-sans text-base text-cream-mute">Untitled</span>
            )}
          </span>
          <span className="text-xs font-bold text-cream-mute">
            {count} {count === 1 ? 'candidate' : 'candidates'}
          </span>
        </button>

        <button
          type="button"
          aria-label="Duplicate category"
          onClick={() => duplicateCategory(category.id)}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-cream-mute hover:text-gold"
        >
          <CopyIcon className="size-[18px]" />
        </button>

        <button
          type="button"
          aria-label="Delete category"
          onClick={() => {
            if (confirm(`Delete "${category.title || 'this category'}" and its candidates?`)) {
              removeCategory(category.id);
            }
          }}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-cream-mute hover:text-[#ff8a72]"
        >
          <TrashIcon className="size-[18px]" />
        </button>
      </div>
    </li>
  );
}
