"use client";

import { Window, Stat } from "@/components/window";
import { DataTable } from "@/components/data-table";
import { requirementColumns, issueColumns } from "@/components/columns";
import {
  CoverageChart,
  ProgressChart,
  IssueMixChart,
} from "@/components/charts";
import { Button } from "@/components/ui/button";
import { issues, requirements } from "@/lib/mock";

export default function DashboardPage() {
  const total = requirements.length;
  const answered = requirements.filter((r) => r.status === "answered").length;
  const flagged = requirements.filter((r) => r.status === "flagged").length;
  const openIssues = issues.filter((i) => i.status === "open");
  const backedPct = Math.round((answered / total) * 100);

  const issueMix = Object.entries(
    openIssues.reduce<Record<string, number>>((acc, i) => {
      acc[i.type] = (acc[i.type] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-mono text-lg font-semibold tracking-tight">
            Living Tracker
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            Posture across 3 banks // {total} requirements ingested
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">Import Questionnaire</Button>
          <Button>Run Audit</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Requirements" value={total} hint="across 3 banks" />
        <Stat
          label="Answered"
          value={`${backedPct}%`}
          hint={`${answered} of ${total}`}
          tone="success"
        />
        <Stat
          label="Flagged"
          value={flagged}
          hint="need evidence"
          tone="danger"
        />
        <Stat
          label="Open Issues"
          value={openIssues.length}
          hint="on the tracker"
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Window title="Fact Coverage by Category" className="lg:col-span-2">
          <CoverageChart />
        </Window>
        <Window title="Open Issue Mix">
          <IssueMixChart data={issueMix} />
        </Window>
      </div>

      <Window title="Answer Progress (Weekly)">
        <ProgressChart />
      </Window>

      <Window title="Open Issues" bodyClassName="p-2">
        <DataTable
          columns={issueColumns}
          data={openIssues}
          filterPlaceholder="bank, type, finding..."
        />
      </Window>

      <Window title="Requirements" bodyClassName="p-2">
        <DataTable
          columns={requirementColumns}
          data={requirements}
          filterPlaceholder="id, bank, question..."
        />
      </Window>
    </div>
  );
}
