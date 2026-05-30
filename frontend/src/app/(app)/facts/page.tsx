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

const statusVariant: Record<FactStatus, "success" | "warning" | "secondary"> = {
  approved: "success",
  candidate: "secondary",
  stale: "warning",
};

export default function FactsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["facts", search],
    queryFn: () => listFacts({ search: search || undefined }),
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
      <Window title={`Facts${data ? ` (${data.count})` : ""}`}>
        {isError ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : data && data.results.length > 0 ? (
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
              {data.results.map((fact) => (
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
            No facts yet. Ingest an evidence document to populate the fact base.
          </p>
        )}
      </Window>
    </div>
  );
}
