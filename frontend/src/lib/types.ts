export type AnswerStatus = "answered" | "draft" | "flagged" | "unanswered";
export type IssueType =
  | "missing_policy"
  | "missing_evidence"
  | "implementation_gap"
  | "contradiction"
  | "unbacked_claim"
  | "stale_fact"
  | "commitment";
export type IssueSeverity = "low" | "medium" | "high";
export type IssueStatus = "open" | "in_progress" | "closed";
