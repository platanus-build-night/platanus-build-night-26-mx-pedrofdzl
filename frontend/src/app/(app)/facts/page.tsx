"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  analyzeDocument,
  createTextDocument,
  listDocuments,
  listFacts,
  type FactStatus,
} from "@/lib/resources";

const statusVariant: Record<FactStatus, "success" | "warning" | "secondary" | "destructive"> = {
  approved: "success",
  candidate: "secondary",
  rejected: "destructive",
  stale: "warning",
};

export default function FactBasePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [docName, setDocName] = useState("");
  const [docContent, setDocContent] = useState("");

  const facts = useQuery({
    queryKey: ["facts", search],
    queryFn: () => listFacts({ search: search || undefined }),
  });
  const docs = useQuery({ queryKey: ["documents"], queryFn: () => listDocuments() });

  const addDoc = useMutation({
    mutationFn: () => createTextDocument({ name: docName, content: docContent }),
    onSuccess: () => {
      toast.success("Document added.");
      setDocName("");
      setDocContent("");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const ingest = useMutation({
    mutationFn: (docId: number) => analyzeDocument(docId),
    onSuccess: (job) => {
      toast.success(`Extracted ${job.facts_created} facts.`);
      queryClient.invalidateQueries({ queryKey: ["facts"] });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Fact Base</h1>

      <Window title="Evidence documents">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (docName && docContent) addDoc.mutate();
          }}
          className="space-y-2"
        >
          <Input
            placeholder="Document name (e.g. Security Policy)"
            value={docName}
            onChange={(event) => setDocName(event.target.value)}
          />
          <textarea
            placeholder="Paste policy or security document content..."
            value={docContent}
            onChange={(event) => setDocContent(event.target.value)}
            className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <Button type="submit" disabled={addDoc.isPending || !docName || !docContent}>
            {addDoc.isPending ? "Adding..." : "Add document"}
          </Button>
        </form>

        <div className="mt-3 space-y-1.5">
          {docs.data?.results.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span className="truncate">{doc.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => ingest.mutate(doc.id)}
                disabled={ingest.isPending && ingest.variables === doc.id}
              >
                {ingest.isPending && ingest.variables === doc.id ? "Ingesting..." : "Ingest"}
              </Button>
            </div>
          ))}
          {docs.data && docs.data.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet.</p>
          ) : null}
        </div>
      </Window>

      <Window
        title={`Facts${facts.data ? ` (${facts.data.count})` : ""}`}
        actions={
          <Input
            placeholder="Search facts..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 w-48"
          />
        }
      >
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
            No facts yet. Add an evidence document above and ingest it.
          </p>
        )}
      </Window>
    </div>
  );
}
