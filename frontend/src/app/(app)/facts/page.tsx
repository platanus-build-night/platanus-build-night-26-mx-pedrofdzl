"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Window } from "@/components/window";
import { listFacts, type Fact, type FactStatus } from "@/lib/resources";
import { cn } from "@/lib/utils";

const statusVariant: Record<FactStatus, "success" | "warning" | "secondary" | "destructive"> = {
  approved: "success",
  candidate: "secondary",
  rejected: "destructive",
  stale: "warning",
};

const FILTERS = [
  { key: "", label: "All" },
  { key: "candidate", label: "Candidate" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const columns: ColumnDef<Fact, any>[] = [
  {
    accessorKey: "statement",
    header: "Statement",
    enableSorting: false,
    meta: { className: "max-w-sm" },
    cell: ({ row }) => (
      <span className="line-clamp-2 whitespace-normal leading-snug">{row.original.statement}</span>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.category || "—"}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status]}>{row.original.status}</Badge>
    ),
  },
  {
    accessorKey: "confidence",
    header: "Confidence",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {row.original.confidence == null ? "—" : `${Math.round(row.original.confidence * 100)}%`}
      </span>
    ),
  },
];

export default function FactBasePage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const facts = useQuery({
    queryKey: ["facts", search, status],
    queryFn: () => listFacts({ search: search || undefined, status: status || undefined }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Fact Base</h1>
        <Input
          placeholder="Search facts..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="flex w-fit overflow-hidden rounded-md border border-border">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setStatus(filter.key)}
            className={cn(
              "px-3 py-1 text-xs transition-colors",
              status === filter.key
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/50",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <Window
        title={`Facts${facts.data ? ` (${facts.data.count})` : ""}`}
        bodyClassName="p-0 overflow-hidden"
      >
        <DataTable
          columns={columns}
          data={facts.data?.results ?? []}
          isLoading={facts.isLoading}
          emptyMessage="No facts. Add and analyze a document to populate the fact base."
        />
      </Window>
    </div>
  );
}
