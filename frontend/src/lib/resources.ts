import { api, apiDownload } from "@/lib/api";

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type FactStatus = "candidate" | "approved" | "rejected" | "stale";
export type FactCitation = {
  id: number;
  document: number | null;
  chunk: number | null;
  chunk_text: string | null;
};
export type Fact = {
  id: number;
  statement: string;
  category: string;
  status: FactStatus;
  confidence: number | null;
  review_by: string | null;
  created_at: string;
  citations?: FactCitation[];
};

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
export type Issue = {
  id: number;
  type: IssueType;
  severity: IssueSeverity;
  requirement: number | null;
  requirement_text: string | null;
  questionnaire: number | null;
  questionnaire_name: string | null;
  fact: number | null;
  assignee: number | null;
  assignee_email: string | null;
  title: string;
  description: string;
  status: IssueStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type CitedFact = { id: number; statement: string; category: string };
export type Answer = {
  id: number;
  requirement: number;
  text: string;
  confidence: number | null;
  status: "draft" | "approved";
  source: "generated" | "reused";
  reused_from: number | null;
  reused_from_source: string | null;
  audited_at: string | null;
  created_at: string;
  cited_facts: CitedFact[];
};

export type AppUser = { id: number; email: string };

export type Requirement = {
  id: number;
  questionnaire: number;
  text: string;
  category: string;
  normalized_key: string;
  source_row: number | null;
};

export type QuestionnaireLayout = {
  format?: "csv" | "xlsx";
  header_row?: number;
  question_column?: number;
  category_column?: number | null;
  answer_column?: number | null;
};

export type Questionnaire = {
  id: number;
  source_name: string;
  raw_file: string | null;
  due_date: string | null;
  status: string;
  layout: QuestionnaireLayout;
  uploaded_at: string;
  requirement_count: number;
  answered_count: number;
  audited_count: number;
  open_issue_count: number;
};

export type JobStatus = "pending" | "running" | "done" | "failed";
export type AnalysisJob = {
  id: number;
  document: number;
  status: JobStatus;
  step: string;
  processed: number;
  total: number;
  facts_created: number;
  percent: number;
  error: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export type DocType = "text" | "docx";
export type Document = {
  id: number;
  name: string;
  content: string;
  source_file: string | null;
  doc_type: DocType;
  category: number | null;
  style_guide_section: string;
  created_at: string;
  updated_at: string;
  latest_job: { id: number; status: JobStatus; step: string; percent: number } | null;
};

export type Category = {
  id: number;
  name: string;
  parent: number | null;
  created_at: string;
};

function qs(params?: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params ?? {}).filter(
    ([, value]) => value !== undefined && value !== "",
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export const listFacts = (params?: {
  status?: string;
  category?: string;
  search?: string;
  document?: number;
}) => api<Paginated<Fact>>(`/facts/${qs(params)}`);

export const listIssues = (params?: {
  status?: string;
  type?: string;
  severity?: string;
  assignee?: number;
  questionnaire?: number;
  ordering?: string;
}) => api<Paginated<Issue>>(`/issues/${qs(params)}`);

export type IssueInput = {
  type: IssueType;
  severity?: IssueSeverity;
  title?: string;
  description?: string;
  status?: IssueStatus;
  due_date?: string | null;
  requirement?: number | null;
  assignee?: number | null;
};

export const createIssue = (data: IssueInput) =>
  api<Issue>("/issues/", { method: "POST", body: JSON.stringify(data) });

export const updateIssue = (id: number, data: Partial<IssueInput>) =>
  api<Issue>(`/issues/${id}/`, { method: "PATCH", body: JSON.stringify(data) });

export const listRequirements = (params?: { questionnaire?: number; search?: string }) =>
  api<Paginated<Requirement>>(`/requirements/${qs(params)}`);

export const listQuestionnaires = () => api<Paginated<Questionnaire>>("/questionnaires/");

export const getQuestionnaire = (id: number) => api<Questionnaire>(`/questionnaires/${id}/`);

export const submitQuestionnaire = (id: number) =>
  api<Questionnaire>(`/questionnaires/${id}/submit/`, { method: "POST" });

export const updateQuestionnaire = (id: number, data: { status?: string; due_date?: string | null }) =>
  api<Questionnaire>(`/questionnaires/${id}/`, { method: "PATCH", body: JSON.stringify(data) });

export const listUsers = () => api<AppUser[]>("/auth/users/");

export const listAnswers = (params?: { requirement?: number }) =>
  api<Paginated<Answer>>(`/answers/${qs(params)}`);

export const uploadQuestionnaire = (form: FormData) =>
  api<Questionnaire>("/questionnaires/", { method: "POST", body: form });

export const ingestQuestionnaire = (id: number) =>
  api<{ requirements: number }>(`/questionnaires/${id}/ingest/`, { method: "POST" });

export const answerQuestionnaire = (id: number) =>
  api<{ status: string }>(`/questionnaires/${id}/answer/`, { method: "POST" });

export const exportQuestionnaire = (id: number) =>
  apiDownload(`/questionnaires/${id}/export/`);

export const answerRequirement = (id: number) =>
  api<Answer>(`/requirements/${id}/answer/`, { method: "POST" });

export const auditAnswer = (id: number) => api<Issue[]>(`/answers/${id}/audit/`, { method: "POST" });

export const listCategories = () => api<Paginated<Category>>("/categories/");

export const createCategory = (data: { name: string; parent?: number | null }) =>
  api<Category>("/categories/", { method: "POST", body: JSON.stringify(data) });

export const deleteCategory = (id: number) =>
  api<void>(`/categories/${id}/`, { method: "DELETE" });

export const listDocuments = (params?: { category?: number }) =>
  api<Paginated<Document>>(`/documents/${qs(params)}`);

export const getDocument = (id: number) => api<Document>(`/documents/${id}/`);

export const createTextDocument = (data: {
  name: string;
  content: string;
  category?: number | null;
}) => api<Document>("/documents/", { method: "POST", body: JSON.stringify({ ...data, doc_type: "text" }) });

export const uploadDocument = (form: FormData) =>
  api<Document>("/documents/", { method: "POST", body: form });

export const analyzeDocument = (id: number) =>
  api<AnalysisJob>(`/documents/${id}/analyze/`, { method: "POST" });

export const saveDocumentContent = (id: number, content: string) =>
  api<AnalysisJob>(`/documents/${id}/content/`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });

export const getAnalysisJob = (id: number) => api<AnalysisJob>(`/analysis-jobs/${id}/`);

export const approveFact = (id: number) => api<Fact>(`/facts/${id}/approve/`, { method: "POST" });

export const rejectFact = (id: number) => api<Fact>(`/facts/${id}/reject/`, { method: "POST" });

export const updateFact = (id: number, data: { statement?: string; category?: string }) =>
  api<Fact>(`/facts/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
