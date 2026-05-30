"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat, Window } from "@/components/window";
import {
  answerQuestionnaire,
  answerRequirement,
  auditAnswer,
  exportQuestionnaire,
  getQuestionnaire,
  listAnswers,
  listRequirements,
  submitQuestionnaire,
  type Answer,
} from "@/lib/resources";
import { downloadBlob } from "@/lib/utils";

export default function QuestionnaireDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const [submitOpen, setSubmitOpen] = useState(false);

  const { data: questionnaire } = useQuery({
    queryKey: ["questionnaire", id],
    queryFn: () => getQuestionnaire(id),
  });
  const { data: requirements, isLoading } = useQuery({
    queryKey: ["requirements", id],
    queryFn: () => listRequirements({ questionnaire: id }),
  });
  const { data: answers } = useQuery({ queryKey: ["answers", id], queryFn: () => listAnswers() });

  const answerByRequirement = new Map<number, Answer>();
  answers?.results.forEach((answer) => answerByRequirement.set(answer.requirement, answer));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["answers", id] });
    queryClient.invalidateQueries({ queryKey: ["issues"] });
  };

  const answerAll = useMutation({
    mutationFn: () => answerQuestionnaire(id),
    onSuccess: (summary) => {
      toast.success(`Answered ${summary.answered} requirements.`);
      invalidate();
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const answerOne = useMutation({
    mutationFn: (requirementId: number) => answerRequirement(requirementId),
    onSuccess: () => {
      toast.success("Answered.");
      invalidate();
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const exportFilled = useMutation({
    mutationFn: () => exportQuestionnaire(id),
    onSuccess: (blob) => {
      const ext = questionnaire?.layout?.format === "csv" ? "csv" : "xlsx";
      const base = questionnaire?.source_name ?? "questionnaire";
      downloadBlob(blob, `${base}-filled.${ext}`);
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const audit = useMutation({
    mutationFn: (answerId: number) => auditAnswer(answerId),
    onSuccess: (issues) =>
      issues.length
        ? toast.warning(`${issues.length} issue(s) found.`)
        : toast.success("No issues found."),
    onError: (error) => toast.error((error as Error).message),
  });

  const submit = useMutation({
    mutationFn: () => submitQuestionnaire(id),
    onSuccess: () => {
      toast.success("Questionnaire submitted.");
      setSubmitOpen(false);
      queryClient.invalidateQueries({ queryKey: ["questionnaire", id] });
      queryClient.invalidateQueries({ queryKey: ["questionnaires"] });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const unanswered = questionnaire
    ? questionnaire.requirement_count - questionnaire.answered_count
    : 0;
  const blocking = questionnaire?.open_issue_count ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {questionnaire?.source_name ?? "Questionnaire"}
          </h1>
          {questionnaire ? <Badge variant="secondary">{questionnaire.status}</Badge> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => exportFilled.mutate()}
            disabled={exportFilled.isPending}
          >
            <Download />
            {exportFilled.isPending ? "Exporting..." : "Export filled"}
          </Button>
          <Button onClick={() => answerAll.mutate()} disabled={answerAll.isPending}>
            {answerAll.isPending ? "Answering..." : "Answer all"}
          </Button>
          {questionnaire && questionnaire.status !== "submitted" ? (
            <Button variant="secondary" onClick={() => setSubmitOpen(true)}>
              <Send />
              Submit
            </Button>
          ) : null}
        </div>
      </div>

      {questionnaire ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Requirements" value={questionnaire.requirement_count} />
          <Stat
            label="Answered"
            value={`${questionnaire.answered_count}/${questionnaire.requirement_count}`}
            tone={unanswered > 0 ? "warning" : "success"}
          />
          <Stat
            label="Audited"
            value={`${questionnaire.audited_count}/${questionnaire.answered_count}`}
          />
          <Stat
            label="Open Issues"
            value={questionnaire.open_issue_count}
            tone={questionnaire.open_issue_count > 0 ? "danger" : "default"}
          />
        </div>
      ) : null}

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit questionnaire?</DialogTitle>
          </DialogHeader>
          {unanswered > 0 || blocking > 0 ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {unanswered > 0 ? (
                <li className="text-warning">{unanswered} requirement(s) still unanswered.</li>
              ) : null}
              {blocking > 0 ? (
                <li className="text-destructive">{blocking} open issue(s) on this questionnaire.</li>
              ) : null}
              <li>You can still submit, but these will remain flagged.</li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              All requirements answered and no open issues. Ready to submit.
            </p>
          )}
          <DialogFooter className="mt-4" showCloseButton>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : requirements && requirements.results.length > 0 ? (
        <div className="space-y-3">
          {requirements.results.map((requirement) => {
            const answer = answerByRequirement.get(requirement.id);
            const answering = answerOne.isPending && answerOne.variables === requirement.id;
            const auditing = audit.isPending && answer && audit.variables === answer.id;
            return (
              <Window
                key={requirement.id}
                title={requirement.category || "Requirement"}
                actions={
                  answer ? (
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={() => audit.mutate(answer.id)}
                      disabled={!!auditing}
                    >
                      {auditing ? "Auditing..." : "Audit"}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => answerOne.mutate(requirement.id)} disabled={answering}>
                      {answering ? "Answering..." : "Answer"}
                    </Button>
                  )
                }
              >
                <p className="text-sm text-foreground">{requirement.text}</p>
                {answer ? (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <p className="text-sm whitespace-pre-wrap">{answer.text}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {answer.source === "reused" ? (
                        <Badge variant="outline">
                          Reused{answer.reused_from_source ? ` from ${answer.reused_from_source}` : ""}
                        </Badge>
                      ) : null}
                      {answer.confidence != null ? (
                        <Badge variant="secondary">
                          {Math.round(answer.confidence * 100)}% confident
                        </Badge>
                      ) : null}
                      {answer.cited_facts.length > 0 ? (
                        answer.cited_facts.map((fact) => (
                          <Badge key={fact.id} variant="outline" className="font-normal">
                            {fact.statement}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-destructive">No citations</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Not answered yet.</p>
                )}
              </Window>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No requirements found for this questionnaire.
        </p>
      )}
    </div>
  );
}
