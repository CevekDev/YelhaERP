'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Plus, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface KanbanColumn<T> {
  id: string
  title: string
  color?: string
  items: T[]
  total?: number
  count?: number
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn<T>[]
  renderCard: (item: T, columnId: string) => React.ReactNode
  onMoveItem?: (itemId: string, fromColumn: string, toColumn: string) => void
  onAddItem?: (columnId: string) => void
  getItemId: (item: T) => string
  className?: string
  collapsible?: boolean
}

export function KanbanBoard<T>({
  columns,
  renderCard,
  onMoveItem,
  onAddItem,
  getItemId,
  className,
  collapsible = false,
}: KanbanBoardProps<T>) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [dragItemId, setDragItemId] = useState<string | null>(null)
  const [dragFromCol, setDragFromCol] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const handleDragStart = (itemId: string, colId: string) => {
    setDragItemId(itemId)
    setDragFromCol(colId)
  }

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    setDragOverCol(colId)
  }

  const handleDrop = (e: React.DragEvent, toColId: string) => {
    e.preventDefault()
    if (dragItemId && dragFromCol && dragFromCol !== toColId && onMoveItem) {
      onMoveItem(dragItemId, dragFromCol, toColId)
    }
    setDragItemId(null)
    setDragFromCol(null)
    setDragOverCol(null)
  }

  const handleDragEnd = () => {
    setDragItemId(null)
    setDragFromCol(null)
    setDragOverCol(null)
  }

  return (
    <div className={cn('flex gap-4 overflow-x-auto pb-4', className)}>
      {columns.map(col => {
        const isCollapsed = collapsed[col.id]
        const isDragTarget = dragOverCol === col.id && dragFromCol !== col.id

        return (
          <div
            key={col.id}
            className={cn(
              'flex flex-col rounded-xl border border-border bg-muted/50 transition-all',
              isCollapsed ? 'w-12' : 'w-72 min-w-[288px]',
            )}
            onDragOver={e => handleDragOver(e, col.id)}
            onDrop={e => handleDrop(e, col.id)}
          >
            {/* Column header */}
            <div className={cn(
              'flex items-center gap-2 p-3 rounded-t-xl border-b border-border',
              col.color ?? 'bg-background',
              isDragTarget && 'ring-2 ring-primary ring-inset',
            )}>
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-sm font-semibold text-foreground truncate">{col.title}</span>
                  <span className="text-xs bg-background border border-border rounded-full px-2 py-0.5 font-medium text-muted-foreground">
                    {col.count ?? col.items.length}
                  </span>
                  {col.total !== undefined && (
                    <span className="text-xs text-muted-foreground da-amount">{col.total.toLocaleString()} DA</span>
                  )}
                  {onAddItem && (
                    <button
                      onClick={() => onAddItem(col.id)}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}
              {collapsible && (
                <button
                  onClick={() => setCollapsed(c => ({ ...c, [col.id]: !c[col.id] }))}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                >
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isCollapsed && '-rotate-90')} />
                </button>
              )}
            </div>

            {/* Cards */}
            {!isCollapsed && (
              <div className={cn(
                'flex flex-col gap-2 p-2 flex-1 min-h-[120px] rounded-b-xl',
                isDragTarget && 'bg-primary/5',
              )}>
                {col.items.map(item => {
                  const id = getItemId(item)
                  return (
                    <div
                      key={id}
                      draggable={!!onMoveItem}
                      onDragStart={() => handleDragStart(id, col.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'cursor-grab active:cursor-grabbing',
                        dragItemId === id && 'opacity-50',
                      )}
                    >
                      {renderCard(item, col.id)}
                    </div>
                  )
                })}
                {col.items.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-sm text-muted-foreground/50">
                    Glisser ici
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Card wrapper for kanban items
export function KanbanCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'bg-background border border-border rounded-lg p-3 shadow-sm hover:shadow-md hover:border-primary/20 transition-all',
      className,
    )}>
      {children}
    </div>
  )
}
