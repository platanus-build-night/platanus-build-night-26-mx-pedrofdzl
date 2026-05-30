import { api } from "@/lib/api";

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type FactStatus = "candidate" | "approved" | "stale";
export type Fact = {
  id: number;
  statement: string;
  category: string;
  status: FactStatus;
  confidence: number | null;
  review_by: string | null;
  created_at: string;
};

export type IssueType = "unbacked" | "contradiction" | "gap" | "drift" | "stale";
export type Issue = {
  id: number;
  type: IssueType;
  requirement: number | null;
  fact: number | null;
  description: string;
  status: "open" | "closed";
  created_at: string;
};

export type CitedFact = { id: number; statement: string; category: string };
export type Answer = {
  id: number;
  requirement: number;
  text: string;
  confidence: number | null;
  status: "draft" | "approved";
  created_at: string;
  cited_facts: CitedFact[];
};

export type Requirement = {
  id: number;
  questionnaire: number;
  text: string;
  category: string;
  normalized_key: string;
};

export type Questionnaire = {
  id: number;
  source_name: string;
  raw_file: string | null;
  due_date: string | null;
  status: string;
  uploaded_at: string;
};

export type EvidenceDoc = {
  id: number;
  name: string;
  content: string;
  source_file: string | null;
  style_guide_section: string;
  created_at: string;
  updated_at: string;
};

function qs(params?: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params ?? {}).filter(
    ([, value]) => value !== undefined && value !== "",
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export const listFacts = (params?: { status?: string; category?: string; search?: string }) =>
  api<Paginated<Fact>>(`/facts/${qs(params)}`);

export const listIssues = (params?: { status?: string; type?: string }) =>
  api<Paginated<Issue>>(`/issues/${qs(params)}`);

export const listRequirements = (params?: { questionnaire?: number; search?: string }) =>
  api<Paginated<Requirement>>(`/requirements/${qs(params)}`);

export const listQuestionnaires = () => api<Paginated<Questionnaire>>("/questionnaires/");

export const listEvidenceDocs = () => api<Paginated<EvidenceDoc>>("/evidence-docs/");
