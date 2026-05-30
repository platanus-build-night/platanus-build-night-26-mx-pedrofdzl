import { Badge } from "@/components/ui/badge";
import type { AnswerStatus, IssueSeverity, IssueStatus, IssueType } from "@/lib/types";

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

const issueMap: Record<
  IssueType,
  { label: string; variant: "destructive" | "warning" | "secondary" }
> = {
  missing_policy: { label: "Missing Policy", variant: "destructive" },
  missing_evidence: { label: "Missing Evidence", variant: "warning" },
  implementation_gap: { label: "Implementation Gap", variant: "warning" },
  contradiction: { label: "Contradiction", variant: "destructive" },
  unbacked_claim: { label: "Unbacked Claim", variant: "destructive" },
  stale_fact: { label: "Stale Fact", variant: "warning" },
  commitment: { label: "Commitment", variant: "secondary" },
};

export function IssueTypeBadge({ type }: { type: IssueType }) {
  const { label, variant } = issueMap[type];
  return <Badge variant={variant}>{label}</Badge>;
}

const severityMap: Record<
  IssueSeverity,
  { label: string; variant: "ghost" | "warning" | "destructive" }
> = {
  low: { label: "Low", variant: "ghost" },
  medium: { label: "Medium", variant: "warning" },
  high: { label: "High", variant: "destructive" },
};

export function IssueSeverityBadge({ severity }: { severity: IssueSeverity }) {
  const { label, variant } = severityMap[severity];
  return <Badge variant={variant}>{label}</Badge>;
}

const issueStatusMap: Record<
  IssueStatus,
  { label: string; variant: "outline" | "warning" | "success" }
> = {
  open: { label: "Open", variant: "outline" },
  in_progress: { label: "In Progress", variant: "warning" },
  closed: { label: "Closed", variant: "success" },
};

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  const { label, variant } = issueStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}
