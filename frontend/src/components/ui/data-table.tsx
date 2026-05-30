"use client"

import { useEffect, useRef, useState } from "react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: "left" | "right" | "center"
    className?: string
  }
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  isLoading?: boolean
  skeletonRows?: number
  emptyMessage?: string
  onRowClick?: (row: TData) => void
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  skeletonRows = 5,
  emptyMessage = "No data.",
  onRowClick,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const [overflowLeft, setOverflowLeft] = useState(false)
  const [overflowRight, setOverflowRight] = useState(false)

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      setOverflowLeft(el.scrollLeft > 1)
      setOverflowRight(el.scrollLeft < max - 1)
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", update)
      ro.disconnect()
    }
  }, [data, columns])

  const isEmpty = !isLoading && data.length === 0

  if (isEmpty) {
    return (
      <p className="p-3.5 text-[13px] text-muted-foreground">{emptyMessage}</p>
    )
  }

  return (
    <div className="relative w-full min-w-0">
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-card to-transparent transition-opacity duration-150",
          overflowLeft ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-card to-transparent transition-opacity duration-150",
          overflowRight ? "opacity-100" : "opacity-0",
        )}
      />

      <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden">
        <table className="w-full text-[13px]">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-border/60">
                {group.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  const align = header.column.columnDef.meta?.align
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "h-9 px-4 text-left text-[12px] font-normal whitespace-nowrap text-foreground",
                        canSort && "cursor-pointer select-none",
                        align === "right" && "text-right",
                        align === "center" && "text-center",
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {header.isPlaceholder ? null : (
                        <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="text-muted-foreground/40">
                              {sorted === "asc" ? (
                                <ArrowUp className="size-3" />
                              ) : sorted === "desc" ? (
                                <ArrowDown className="size-3" />
                              ) : (
                                <ArrowUpDown className="size-3" />
                              )}
                            </span>
                          )}
                        </span>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-border/40 last:border-0">
                    {columns.map((_, j) => (
                      <td key={j} className="h-10 px-4 py-1.5">
                        <div className="relative h-2.5 w-3/4 overflow-hidden rounded-sm bg-muted">
                          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/70 to-transparent animate-[shimmer_1.6s_ease-in-out_infinite]" />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(
                      "border-b border-border/40 transition-colors last:border-0",
                      onRowClick ? "cursor-pointer hover:bg-accent/30" : "hover:bg-accent/20",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const align = cell.column.columnDef.meta?.align
                      const extraClass = cell.column.columnDef.meta?.className
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            "h-10 px-4 py-1.5 align-middle",
                            align === "right" && "text-right",
                            align === "center" && "text-center",
                            extraClass,
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    })}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
