"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  AnswerBadge,
  IssueStatusBadge,
  IssueTypeBadge,
} from "@/components/status-badge";
import type { Issue, Requirement } from "@/lib/types";

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone =
    value >= 0.75
      ? "bg-success"
      : value >= 0.5
        ? "bg-warning"
        : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-muted">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {value ? value.toFixed(2) : "—"}
      </span>
    </div>
  );
}

export const requirementColumns: ColumnDef<Requirement, unknown>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium text-brand">
        {row.original.id}
      </span>
    ),
  },
  { accessorKey: "bank", header: "Bank" },
  {
    accessorKey: "question",
    header: "Requirement",
    cell: ({ row }) => (
      <span className="block max-w-md truncate">{row.original.question}</span>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.category}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <AnswerBadge status={row.original.status} />,
  },
  {
    accessorKey: "confidence",
    header: "Confidence",
    cell: ({ row }) => <ConfidenceBar value={row.original.confidence} />,
  },
  {
    accessorKey: "citations",
    header: "Cites",
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums">
        {row.original.citations}
      </span>
    ),
  },
];

export const issueColumns: ColumnDef<Issue, unknown>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium text-brand">
        {row.original.id}
      </span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <IssueTypeBadge type={row.original.type} />,
  },
  {
    accessorKey: "requirementId",
    header: "Req",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.requirementId}</span>
    ),
  },
  { accessorKey: "bank", header: "Bank" },
  {
    accessorKey: "description",
    header: "Finding",
    cell: ({ row }) => (
      <span className="block max-w-md truncate">
        {row.original.description}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "State",
    cell: ({ row }) => <IssueStatusBadge status={row.original.status} />,
  },
];
