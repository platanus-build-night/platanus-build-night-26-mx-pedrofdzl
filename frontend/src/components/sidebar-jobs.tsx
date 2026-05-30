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

function JobRow({ jobId, onClose }: { jobId: number; onClose: () => void }) {
  const { data: job } = useAnalysisJob(jobId);
  const queryClient = useQueryClient();
  const status = job?.status;

  useEffect(() => {
    if (status !== "done" && status !== "failed") return;
    queryClient.invalidateQueries({ queryKey: ["facts"] });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    const timer = setTimeout(onClose, status === "done" ? 5000 : 10000);
    return () => clearTimeout(timer);
  }, [status, queryClient, onClose]);

  if (!job) return null;
  const failed = job.status === "failed";
  const done = job.status === "done";
  const percent = done ? 100 : job.percent;

  return (
    <div className="rounded-md border border-border bg-background px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-foreground">
          {failed ? "Analysis failed" : done ? `Done · ${job.facts_created} facts` : "Analyzing"}
        </span>
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
      {failed ? (
        <p className="mt-1 line-clamp-2 text-[11px] text-destructive">
          {job.error || "Unknown error"}
        </p>
      ) : (
        <>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {done
              ? "Complete"
              : (STEP_LABEL[job.step] ?? "Starting") +
                (job.total ? ` ${job.processed}/${job.total}` : "")}
          </p>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
        </>
      )}
    </div>
  );
}

export function SidebarJobs() {
  const { jobs, untrack } = useAnalysis();
  if (jobs.length === 0) return null;
  return (
    <div className="border-t border-border px-2 py-2">
      <p className="px-1.5 pb-1.5 text-[10.5px] font-medium tracking-wider text-muted-foreground uppercase">
        Tasks
      </p>
      <div className="space-y-1.5">
        {jobs.map((id) => (
          <JobRow key={id} jobId={id} onClose={() => untrack(id)} />
        ))}
      </div>
    </div>
  );
}
