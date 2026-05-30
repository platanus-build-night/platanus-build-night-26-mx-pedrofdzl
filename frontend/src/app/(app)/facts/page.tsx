"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { listFacts, type FactStatus } from "@/lib/resources";
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

      <Window title={`Facts${facts.data ? ` (${facts.data.count})` : ""}`}>
        {facts.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : facts.data && facts.data.results.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statement</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facts.data.results.map((fact) => (
                <TableRow key={fact.id}>
                  <TableCell className="max-w-md">{fact.statement}</TableCell>
                  <TableCell className="text-muted-foreground">{fact.category || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[fact.status]}>{fact.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fact.confidence == null ? "-" : `${Math.round(fact.confidence * 100)}%`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">
            No facts. Add and analyze a document to populate the fact base.
          </p>
        )}
      </Window>
    </div>
  );
}
