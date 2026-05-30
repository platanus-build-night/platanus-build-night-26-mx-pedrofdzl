"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { IssueCalendar } from "@/components/issue-calendar";
import { IssueSeverityBadge, IssueStatusBadge, IssueTypeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Window } from "@/components/window";
import {
  createIssue,
  listIssues,
  listUsers,
  updateIssue,
  type Issue,
  type IssueInput,
  type IssueSeverity,
  type IssueStatus,
  type IssueType,
} from "@/lib/resources";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "closed", label: "Closed" },
  { key: "", label: "All" },
];

const TYPE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: "missing_policy", label: "Missing Policy" },
  { value: "missing_evidence", label: "Missing Evidence" },
  { value: "implementation_gap", label: "Implementation Gap" },
  { value: "contradiction", label: "Contradiction" },
  { value: "unbacked_claim", label: "Unbacked Claim" },
  { value: "stale_fact", label: "Stale Fact" },
  { value: "commitment", label: "Commitment" },
];

const SEVERITY_OPTIONS: { value: IssueSeverity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const STATUS_OPTIONS: { value: IssueStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed", label: "Closed" },
];

const selectClass =
  "h-8 rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isOverdue(issue: Issue): boolean {
  return Boolean(issue.due_date) && issue.due_date! < todayKey() && issue.status !== "closed";
}

function DueDate({ issue }: { issue: Issue }) {
  if (!issue.due_date) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("tabular-nums", isOverdue(issue) ? "text-destructive" : "text-muted-foreground")}>
      {issue.due_date.slice(0, 10)}
    </span>
  );
}

export default function IssuesPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"table" | "calendar">("table");
  const [status, setStatus] = useState("open");
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState("");
  const [assignee, setAssignee] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editing, setEditing] = useState<Issue | "new" | null>(null);

  const users = useQuery({ queryKey: ["users"], queryFn: listUsers });

  const { data, isLoading } = useQuery({
    queryKey: ["issues", status, type, severity, assignee],
    queryFn: () =>
      listIssues({
        status: status || undefined,
        type: type || undefined,
        severity: severity || undefined,
        assignee: assignee ? Number(assignee) : undefined,
        ordering: "due_date",
      }),
  });

  const issues = useMemo(() => data?.results ?? [], [data]);
  const dayIssues = useMemo(
    () => (selectedDay ? issues.filter((i) => i.due_date?.slice(0, 10) === selectedDay) : issues),
    [issues, selectedDay],
  );

  const columns: ColumnDef<Issue, any>[] = [
    {
      accessorKey: "severity",
      header: "Severity",
      enableSorting: false,
      cell: ({ row }) => <IssueSeverityBadge severity={row.original.severity} />,
    },
    {
      accessorKey: "type",
      header: "Type",
      enableSorting: false,
      cell: ({ row }) => <IssueTypeBadge type={row.original.type} />,
    },
    {
      accessorKey: "description",
      header: "Finding",
      enableSorting: false,
      meta: { className: "max-w-md" },
      cell: ({ row }) => (
        <div className="min-w-0">
          {row.original.title ? (
            <span className="block truncate font-medium text-foreground">{row.original.title}</span>
          ) : null}
          <span className="line-clamp-2 whitespace-normal leading-snug text-muted-foreground">
            {row.original.description}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "questionnaire",
      header: "Questionnaire",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.questionnaire ? (
          <Link
            href={`/questionnaires/${row.original.questionnaire}`}
            onClick={(e) => e.stopPropagation()}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {row.original.questionnaire_name ?? `Q-${row.original.questionnaire}`}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "assignee",
      header: "Assignee",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.assignee_email ? (
          <span className="text-muted-foreground">{row.original.assignee_email}</span>
        ) : (
          <span className="text-muted-foreground/60">Unassigned</span>
        ),
    },
    {
      accessorKey: "due_date",
      header: "Due",
      cell: ({ row }) => <DueDate issue={row.original} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      meta: { align: "right" },
      cell: ({ row }) => <IssueStatusBadge status={row.original.status} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Issue Tracker</h1>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-border">
            {(["table", "calendar"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1 text-xs capitalize transition-colors",
                  view === v ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus />
            New issue
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-border">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatus(filter.key)}
              className={cn(
                "px-3 py-1 text-xs transition-colors",
                status === filter.key
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select className={selectClass} value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">All severities</option>
          {SEVERITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select className={selectClass} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">All assignees</option>
          {(users.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.email}
            </option>
          ))}
        </select>
      </div>

      {view === "calendar" ? (
        <Window title="Due dates" bodyClassName="p-3.5">
          <IssueCalendar issues={issues} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        </Window>
      ) : null}

      <Window
        title={
          selectedDay && view === "calendar"
            ? `Due ${selectedDay} (${dayIssues.length})`
            : `Issues${data ? ` (${data.count})` : ""}`
        }
        bodyClassName="p-0 overflow-hidden"
        actions={
          selectedDay && view === "calendar" ? (
            <Button variant="tertiary" size="sm" onClick={() => setSelectedDay(null)}>
              Clear day
            </Button>
          ) : undefined
        }
      >
        <DataTable
          columns={columns}
          data={view === "calendar" ? dayIssues : issues}
          isLoading={isLoading}
          onRowClick={(issue) => setEditing(issue)}
          emptyMessage="No issues. Audit answers to surface gaps, or add one manually."
        />
      </Window>

      {editing ? (
        <IssueDialog
          issue={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ["issues"] });
          }}
        />
      ) : null}
    </div>
  );
}

function IssueDialog({
  issue,
  onClose,
  onSaved,
}: {
  issue: Issue | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = issue !== null;
  const users = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const [form, setForm] = useState<IssueInput>({
    type: issue?.type ?? "commitment",
    severity: issue?.severity ?? "medium",
    status: issue?.status ?? "open",
    title: issue?.title ?? "",
    description: issue?.description ?? "",
    due_date: issue?.due_date ?? "",
    requirement: issue?.requirement ?? null,
    assignee: issue?.assignee ?? null,
  });

  const set = <K extends keyof IssueInput>(key: K, value: IssueInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: () => {
      const payload: IssueInput = { ...form, due_date: form.due_date || null };
      return isEdit ? updateIssue(issue!.id, payload) : createIssue(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Issue updated." : "Issue created.");
      onSaved();
    },
    onError: (error) => toast.error((error as Error).message),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit issue" : "New issue"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="issue-title">Title</Label>
            <Input
              id="issue-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Short summary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="issue-type">Type</Label>
              <select
                id="issue-type"
                className={cn(selectClass, "w-full")}
                value={form.type}
                onChange={(e) => set("type", e.target.value as IssueType)}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issue-severity">Severity</Label>
              <select
                id="issue-severity"
                className={cn(selectClass, "w-full")}
                value={form.severity}
                onChange={(e) => set("severity", e.target.value as IssueSeverity)}
              >
                {SEVERITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="issue-status">Status</Label>
              <select
                id="issue-status"
                className={cn(selectClass, "w-full")}
                value={form.status}
                onChange={(e) => set("status", e.target.value as IssueStatus)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issue-due">Due date</Label>
              <Input
                id="issue-due"
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => set("due_date", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="issue-assignee">Assignee</Label>
            <select
              id="issue-assignee"
              className={cn(selectClass, "w-full")}
              value={form.assignee ?? ""}
              onChange={(e) => set("assignee", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Unassigned</option>
              {(users.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="issue-desc">Description</Label>
            <textarea
              id="issue-desc"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Details, remediation notes, commitment context"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <DialogFooter className="mt-4" showCloseButton>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving..." : isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
