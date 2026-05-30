"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { IssueStatusBadge, IssueTypeBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Window } from "@/components/window";
import { listIssues } from "@/lib/resources";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "closed", label: "Closed" },
  { key: "", label: "All" },
];

export default function IssuesPage() {
  const [status, setStatus] = useState("open");
  const { data, isLoading } = useQuery({
    queryKey: ["issues", status],
    queryFn: () => listIssues({ status: status || undefined }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Issue Tracker</h1>
        <div className="flex border border-border">
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
      </div>
      <Window title={`Issues${data ? ` (${data.count})` : ""}`}>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : data && data.results.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Finding</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.results.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell>
                    <IssueTypeBadge type={issue.type} />
                  </TableCell>
                  <TableCell className="max-w-md">{issue.description}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {issue.requirement ? `R-${issue.requirement}` : "-"}
                  </TableCell>
                  <TableCell>
                    <IssueStatusBadge status={issue.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {issue.created_at.slice(0, 10)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">
            No issues. Audit answers to surface gaps and contradictions.
          </p>
        )}
      </Window>
    </div>
  );
}
