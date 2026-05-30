"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { approveFact, listFacts, rejectFact, updateFact, type FactStatus } from "@/lib/resources";

const statusVariant: Record<FactStatus, "success" | "warning" | "secondary" | "destructive"> = {
  approved: "success",
  candidate: "secondary",
  rejected: "destructive",
  stale: "warning",
};

export function FactReview({ documentId }: { documentId: number }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const facts = useQuery({
    queryKey: ["facts", "doc", documentId],
    queryFn: () => listFacts({ document: documentId }),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["facts"] });
  const onError = (error: unknown) => toast.error((error as Error).message);

  const approve = useMutation({ mutationFn: approveFact, onSuccess: invalidate, onError });
  const reject = useMutation({ mutationFn: rejectFact, onSuccess: invalidate, onError });
  const edit = useMutation({
    mutationFn: (vars: { id: number; statement: string }) =>
      updateFact(vars.id, { statement: vars.statement }),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
    onError,
  });

  if (facts.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const results = facts.data?.results ?? [];
  if (results.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No facts yet. Analyze the document to extract candidate facts.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((fact) => (
        <div key={fact.id} className="rounded-lg border border-border p-3">
          {editing === fact.id ? (
            <div className="flex gap-2">
              <Input value={draft} onChange={(event) => setDraft(event.target.value)} />
              <Button
                size="sm"
                onClick={() => edit.mutate({ id: fact.id, statement: draft })}
                disabled={edit.isPending}
              >
                Save
              </Button>
              <Button size="sm" variant="tertiary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm">{fact.statement}</p>
                <Badge variant={statusVariant[fact.status]}>{fact.status}</Badge>
              </div>
              {fact.citations?.[0]?.chunk_text ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  From: {fact.citations[0].chunk_text}
                </p>
              ) : null}
              {fact.status === "candidate" ? (
                <div className="mt-2 flex gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => approve.mutate(fact.id)}
                    disabled={approve.isPending}
                  >
                    <Check className="size-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="tertiary"
                    onClick={() => reject.mutate(fact.id)}
                    disabled={reject.isPending}
                  >
                    <X className="size-3.5" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="tertiary"
                    onClick={() => {
                      setEditing(fact.id);
                      setDraft(fact.statement);
                    }}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
