"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { IssueMixChart } from "@/components/charts";
import { IssueCalendar } from "@/components/issue-calendar";
import { IssueTypeBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Stat, Window } from "@/components/window";
import { listDocuments, listFacts, listIssues, listQuestionnaires } from "@/lib/resources";

export default function DashboardPage() {
  const questionnaires = useQuery({ queryKey: ["questionnaires"], queryFn: listQuestionnaires });
  const facts = useQuery({ queryKey: ["facts", ""], queryFn: () => listFacts() });
  const openIssues = useQuery({
    queryKey: ["issues", "open"],
    queryFn: () => listIssues({ status: "open" }),
  });
  const docs = useQuery({ queryKey: ["documents"], queryFn: () => listDocuments() });

  const openResults = openIssues.data?.results ?? [];
  const issueMix = Object.entries(
    openResults.reduce<Record<string, number>>((acc, issue) => {
      acc[issue.type] = (acc[issue.type] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const overdueCount = openResults.filter(
    (issue) => issue.due_date && issue.due_date.slice(0, 10) < todayKey,
  ).length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Overview</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Questionnaires" value={questionnaires.data?.count ?? "-"} />
        <Stat label="Facts" value={facts.data?.count ?? "-"} />
        <Stat
          label="Open Issues"
          value={openIssues.data?.count ?? "-"}
          tone={openIssues.data?.count ? "warning" : "default"}
        />
        <Stat
          label="Overdue"
          value={openIssues.isLoading ? "-" : overdueCount}
          tone={overdueCount ? "danger" : "default"}
        />
        <Stat label="Documents" value={docs.data?.count ?? "-"} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Window title="Open issues" className="lg:col-span-2">
          {openIssues.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : openIssues.data && openIssues.data.results.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Finding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openIssues.data.results.slice(0, 8).map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <IssueTypeBadge type={issue.type} />
                    </TableCell>
                    <TableCell className="max-w-md">{issue.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No open issues.</p>
          )}
        </Window>

        <Window title="Issue mix">
          {issueMix.length > 0 ? (
            <IssueMixChart data={issueMix} />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to chart yet.</p>
          )}
        </Window>
      </div>

      <Window title="Upcoming deadlines">
        {openResults.some((issue) => issue.due_date) ? (
          <IssueCalendar issues={openResults} />
        ) : (
          <p className="text-sm text-muted-foreground">No open issues with due dates.</p>
        )}
      </Window>

      <Window title="Questionnaires">
        {questionnaires.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : questionnaires.data && questionnaires.data.results.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questionnaires.data.results.map((questionnaire) => (
                <TableRow key={questionnaire.id}>
                  <TableCell>
                    <Link
                      href={`/questionnaires/${questionnaire.id}`}
                      className="text-foreground underline-offset-2 hover:underline"
                    >
                      {questionnaire.source_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{questionnaire.status}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {questionnaire.uploaded_at.slice(0, 10)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">
            No questionnaires yet. Import one from the Questionnaires page.
          </p>
        )}
      </Window>
    </div>
  );
}
