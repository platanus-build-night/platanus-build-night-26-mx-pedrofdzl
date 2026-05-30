export type AnswerStatus = "answered" | "draft" | "flagged" | "unanswered";
export type IssueType =
  | "unbacked"
  | "contradiction"
  | "gap"
  | "drift"
  | "stale";
export type IssueStatus = "open" | "closed";

export type Requirement = {
  id: string;
  bank: string;
  category: string;
  question: string;
  status: AnswerStatus;
  confidence: number;
  citations: number;
  updated: string;
};

export type Issue = {
  id: string;
  type: IssueType;
  requirementId: string;
  bank: string;
  description: string;
  status: IssueStatus;
  opened: string;
};
