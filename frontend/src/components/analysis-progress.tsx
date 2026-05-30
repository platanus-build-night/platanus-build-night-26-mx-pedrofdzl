"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

import { useAnalysis } from "@/lib/analysis-ui";
import { useAnalysisJob } from "@/lib/use-analysis-job";

const STEP_LABEL: Record<string, string> = {
  parse: "Parsing",
  chunk: "Chunking",
  extract: "Extracting facts",
  embed: "Embedding",
};

function JobCard({ jobId, onClose }: { jobId: number; onClose: () => void }) {
  const { data: job } = useAnalysisJob(jobId);
  const queryClient = useQueryClient();
  const status = job?.status;

  useEffect(() => {
    if (status !== "done" && status !== "failed") return;
    queryClient.invalidateQueries({ queryKey: ["facts"] });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    const timer = setTimeout(onClose, status === "done" ? 4000 : 8000);
    return () => clearTimeout(timer);
  }, [status, queryClient, onClose]);

  if (!job) return null;
  const failed = job.status === "failed";
  const done = job.status === "done";
  const percent = done ? 100 : job.percent;

  return (
    <div className="w-72 rounded-lg border border-border bg-card p-3 text-sm shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">
          {failed
            ? "Analysis failed"
            : done
              ? `Analyzed (${job.facts_created} facts)`
              : "Analyzing document"}
        </span>
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      {failed ? (
        <p className="mt-1 text-xs text-destructive">{job.error || "Unknown error"}</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            {done
              ? "Done"
              : (STEP_LABEL[job.step] ?? "Starting") +
                (job.total ? ` ${job.processed}/${job.total}` : "")}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
        </>
      )}
    </div>
  );
}

export function AnalysisProgress() {
  const { jobs, untrack } = useAnalysis();
  if (jobs.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
      {jobs.map((id) => (
        <JobCard key={id} jobId={id} onClose={() => untrack(id)} />
      ))}
    </div>
  );
}
