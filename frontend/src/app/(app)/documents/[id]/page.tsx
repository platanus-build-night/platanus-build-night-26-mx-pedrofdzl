"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { DocEditor } from "@/components/doc-editor";
import { FactReview } from "@/components/fact-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Window } from "@/components/window";
import { useAnalysis } from "@/lib/analysis-ui";
import { analyzeDocument, getDocument, saveDocumentContent } from "@/lib/resources";
import { cn } from "@/lib/utils";

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { track } = useAnalysis();
  const [tab, setTab] = useState<"facts" | "document">("facts");
  const [content, setContent] = useState<string | null>(null);

  const doc = useQuery({ queryKey: ["document", id], queryFn: () => getDocument(id) });

  const analyze = useMutation({
    mutationFn: () => analyzeDocument(id),
    onSuccess: (job) => track(job.id),
    onError: (error) => toast.error((error as Error).message),
  });
  const save = useMutation({
    mutationFn: () => saveDocumentContent(id, content ?? ""),
    onSuccess: (job) => {
      toast.success("Saved. Re-analyzing...");
      track(job.id);
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const value = content ?? doc.data?.content ?? "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{doc.data?.name ?? "Document"}</h1>
          {doc.data ? <Badge variant="secondary">{doc.data.doc_type}</Badge> : null}
        </div>
        <Button onClick={() => analyze.mutate()} disabled={analyze.isPending}>
          {analyze.isPending ? "Queued..." : "Analyze"}
        </Button>
      </div>

      <div className="flex border-b border-border">
        {(["facts", "document"] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={cn(
              "px-3 py-1.5 text-sm",
              tab === tabKey
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tabKey === "facts" ? "Facts" : "Document"}
          </button>
        ))}
      </div>

      {tab === "facts" ? (
        <FactReview documentId={id} />
      ) : (
        <Window
          title="Content"
          actions={
            <Button
              size="sm"
              onClick={() => save.mutate()}
              disabled={save.isPending || value === doc.data?.content}
            >
              {save.isPending ? "Saving..." : "Save & re-analyze"}
            </Button>
          }
        >
          {doc.data ? (
            <DocEditor key={doc.data.id} content={doc.data.content} onChange={setContent} />
          ) : null}
        </Window>
      )}
    </div>
  );
}
