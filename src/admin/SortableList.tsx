import type { HTMLAttributes, ReactNode, Ref } from 'react'
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export type HandleProps = HTMLAttributes<HTMLElement> & { ref: Ref<HTMLButtonElement> }

type RenderContext = { handle: HandleProps; dragging: boolean }

export function useDragSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
}

function SortableItem({ id, className, children }: { id: string; className?: string; children: (context: RenderContext) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const handle = { ref: setActivatorNodeRef, ...attributes, ...listeners } as HandleProps
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ''} ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 5 : undefined }}
    >
      {children({ handle, dragging: isDragging })}
    </div>
  )
}

type SortableListProps<T extends { id: string }> = {
  items: T[]
  onReorder: (items: T[]) => void
  className?: string
  itemClassName?: string
  grid?: boolean
  children: (item: T, context: RenderContext) => ReactNode
}

export function SortableList<T extends { id: string }>({ items, onReorder, className, itemClassName, grid = false, children }: SortableListProps<T>) {
  const sensors = useDragSensors()

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = items.findIndex((item) => item.id === active.id)
    const to = items.findIndex((item) => item.id === over.id)
    if (from < 0 || to < 0) return
    onReorder(arrayMove(items, from, to))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id} className={itemClassName}>
              {(context) => children(item, context)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
