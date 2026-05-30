import { Badge } from "@/components/ui/badge";
import type { AnswerStatus, IssueStatus, IssueType } from "@/lib/types";

const answerMap: Record<
  AnswerStatus,
  { label: string; variant: "success" | "warning" | "destructive" | "secondary" }
> = {
  answered: { label: "Answered", variant: "success" },
  draft: { label: "Draft", variant: "warning" },
  flagged: { label: "Flagged", variant: "destructive" },
  unanswered: { label: "Unanswered", variant: "secondary" },
};

export function AnswerBadge({ status }: { status: AnswerStatus }) {
  const { label, variant } = answerMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}

const issueMap: Record<IssueType, string> = {
  unbacked: "Unbacked",
  contradiction: "Conflict",
  gap: "Gap",
  drift: "Drift",
  stale: "Stale",
};

export function IssueTypeBadge({ type }: { type: IssueType }) {
  const danger = type === "contradiction" || type === "unbacked";
  return (
    <Badge variant={danger ? "destructive" : "warning"}>{issueMap[type]}</Badge>
  );
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return (
    <Badge variant={status === "open" ? "outline" : "success"}>
      {status === "open" ? "Open" : "Closed"}
    </Badge>
  );
}
