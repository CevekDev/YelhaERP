'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown,
  Download, Trash2, CheckSquare, Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import type { LucideIcon } from 'lucide-react'

export interface ETColumn<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
  align?: 'left' | 'right' | 'center'
  totalFn?: (data: T[]) => string
}

interface GroupAction<T> {
  label: string
  icon?: LucideIcon
  variant?: 'default' | 'destructive'
  onClick: (selected: T[]) => void
}

interface EnterpriseTableProps<T extends Record<string, unknown>> {
  data: T[]
  columns: ETColumn<T>[]
  total: number
  page: number
  limit: number
  onPageChange: (p: number) => void
  loading?: boolean
  selectable?: boolean
  groupActions?: GroupAction<T>[]
  emptyText?: string
  emptyDescription?: string
  emptyIcon?: LucideIcon
  emptyAction?: { label: string; onClick: () => void }
  csvFilename?: string
  density?: 'compact' | 'normal' | 'spacious'
  className?: string
}

export function EnterpriseTable<T extends Record<string, unknown>>({
  data, columns, total, page, limit, onPageChange,
  loading, selectable, groupActions,
  emptyText = 'Aucun enregistrement',
  emptyDescription = 'Aucune donnée disponible.',
  emptyIcon, emptyAction,
  csvFilename = 'export',
  density = 'normal',
  className,
}: EnterpriseTableProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const pages = Math.ceil(total / limit)
  const allIds = data.map(r => String(r.id ?? ''))
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id))

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find(c => c.key === sortKey)
    if (!col || col.render) return data // don't sort rendered columns
    return [...data].sort((a, b) => {
      const av = String(a[sortKey] ?? ''), bv = String(b[sortKey] ?? '')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [data, sortKey, sortDir, columns])

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(allIds))
  }

  const toggleRow = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const exportCSV = () => {
    const headers = columns.map(c => c.header).join(',')
    const rows = data.map(row =>
      columns.map(c => {
        const val = row[c.key]
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : String(val ?? '')
      }).join(',')
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${csvFilename}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const DENSITY_MAP = { compact: 'py-1.5', normal: 'py-3', spacious: 'py-4' }
  const cellPad = DENSITY_MAP[density]

  const selectedRows = data.filter(r => selected.has(String(r.id ?? '')))

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Group actions bar */}
      {selectable && selected.size > 0 && groupActions && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b border-primary/10">
          <span className="text-sm font-medium text-primary">{selected.size} sélectionné(s)</span>
          <div className="flex gap-2">
            {groupActions.map((action, i) => (
              <Button
                key={i}
                size="sm"
                variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                onClick={() => { action.onClick(selectedRows); setSelected(new Set()) }}
                className="gap-1.5 h-7 text-xs"
              >
                {action.icon && <action.icon className="h-3.5 w-3.5" />}
                {action.label}
              </Button>
            ))}
          </div>
          <Button
            size="sm" variant="ghost"
            className="h-7 text-xs ml-auto text-muted-foreground"
            onClick={() => setSelected(new Set())}
          >
            Désélectionner
          </Button>
        </div>
      )}

      {/* CSV export button */}
      {csvFilename && data.length > 0 && (
        <div className="flex justify-end px-4 py-2 border-b border-border">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground" onClick={exportCSV}>
            <Download className="h-3 w-3" />Export CSV
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {selectable && (
                <th className="w-10 px-4 py-2">
                  <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
                    {allSelected
                      ? <CheckSquare className="h-4 w-4 text-primary" />
                      : <Square className="h-4 w-4" />
                    }
                  </button>
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 font-medium text-muted-foreground text-left',
                    cellPad,
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.className,
                    col.sortable && 'cursor-pointer hover:text-foreground select-none',
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      sortKey === col.key
                        ? sortDir === 'asc'
                          ? <ChevronUp className="h-3 w-3 text-primary" />
                          : <ChevronDown className="h-3 w-3 text-primary" />
                        : <ChevronsUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {selectable && <td className="px-4 py-3"><div className="h-4 w-4 bg-muted rounded animate-pulse" /></td>}
                  {columns.map(col => (
                    <td key={col.key} className={cn('px-4', cellPad)}>
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="p-0">
                  <EmptyState
                    icon={emptyIcon!}
                    title={emptyText}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              sortedData.map((row, i) => {
                const id = String(row.id ?? i)
                const isSelected = selected.has(id)
                return (
                  <tr
                    key={id}
                    className={cn(
                      'border-b border-border/50 hover:bg-muted/30 transition-colors',
                      isSelected && 'bg-primary/5',
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <button onClick={() => toggleRow(id)} className="text-muted-foreground hover:text-foreground">
                          {isSelected
                            ? <CheckSquare className="h-4 w-4 text-primary" />
                            : <Square className="h-4 w-4" />
                          }
                        </button>
                      </td>
                    )}
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4',
                          cellPad,
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.className,
                        )}
                      >
                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}

            {/* Totals row */}
            {!loading && sortedData.length > 0 && columns.some(c => c.totalFn) && (
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                {selectable && <td />}
                {columns.map(col => (
                  <td key={col.key} className={cn('px-4', cellPad, col.align === 'right' && 'text-right', col.className)}>
                    {col.totalFn ? col.totalFn(data) : ''}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} sur {total}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
              const p = i + 1
              return (
                <Button
                  key={p} variant={p === page ? 'default' : 'outline'} size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              )
            })}
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(page + 1)} disabled={page >= pages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
