"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Window } from "@/components/window";
import {
  answerQuestionnaire,
  answerRequirement,
  auditAnswer,
  getQuestionnaire,
  listAnswers,
  listRequirements,
  type Answer,
} from "@/lib/resources";

export default function QuestionnaireDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const queryClient = useQueryClient();

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

  const audit = useMutation({
    mutationFn: (answerId: number) => auditAnswer(answerId),
    onSuccess: (issues) =>
      issues.length
        ? toast.warning(`${issues.length} issue(s) found.`)
        : toast.success("No issues found."),
    onError: (error) => toast.error((error as Error).message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {questionnaire?.source_name ?? "Questionnaire"}
          </h1>
          {questionnaire ? <Badge variant="secondary">{questionnaire.status}</Badge> : null}
        </div>
        <Button onClick={() => answerAll.mutate()} disabled={answerAll.isPending}>
          {answerAll.isPending ? "Answering..." : "Answer all"}
        </Button>
      </div>

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
                      variant="ghost"
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
