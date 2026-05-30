"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { marked } from "marked";
import { toast } from "sonner";

import { DocEditor } from "@/components/doc-editor";
import { FactReview } from "@/components/fact-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Window } from "@/components/window";
import { useAnalysis } from "@/lib/analysis-ui";
import { analyzeDocument, getDocument, saveDocumentContent } from "@/lib/resources";

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { track } = useAnalysis();
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [draft, setDraft] = useState<string | null>(null);

  const doc = useQuery({ queryKey: ["document", id], queryFn: () => getDocument(id) });
  const content = doc.data?.content ?? "";
  const html = marked.parse(content, { async: false });

  const analyze = useMutation({
    mutationFn: () => analyzeDocument(id),
    onSuccess: (job) => track(job.id),
    onError: (error) => toast.error((error as Error).message),
  });
  const save = useMutation({
    mutationFn: () => saveDocumentContent(id, draft ?? ""),
    onSuccess: (job) => {
      toast.success("Saved. Re-analyzing...");
      setMode("read");
      setDraft(null);
      track(job.id);
      doc.refetch();
    },
    onError: (error) => toast.error((error as Error).message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{doc.data?.name ?? "Document"}</h1>
          {doc.data ? <Badge variant="secondary">{doc.data.doc_type}</Badge> : null}
        </div>
        <div className="flex items-center gap-2">
          {mode === "read" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDraft(content);
                setMode("edit");
              }}
            >
              Edit
            </Button>
          ) : (
            <>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => {
                  setMode("read");
                  setDraft(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => save.mutate()}
                disabled={save.isPending || draft === content}
              >
                {save.isPending ? "Saving..." : "Save & re-analyze"}
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => analyze.mutate()} disabled={analyze.isPending}>
            {analyze.isPending ? "Queued..." : "Analyze"}
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_22rem]">
        <Window title="Document" className="min-w-0">
          {mode === "edit" && doc.data ? (
            <DocEditor key={doc.data.id} content={draft ?? content} onChange={setDraft} />
          ) : content ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto prose-headings:font-semibold prose-table:text-[13px]"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No content yet. Analyze a .docx to extract its text, or click Edit to add content.
            </p>
          )}
        </Window>

        <div className="lg:sticky lg:top-4">
          <Window title="Facts">
            <FactReview documentId={id} />
          </Window>
        </div>
      </div>
    </div>
  );
}
