"use client";

import { Window } from "@/components/window";
import { DataTable } from "@/components/data-table";
import { issueColumns } from "@/components/columns";
import { issues } from "@/lib/mock";

export default function IssuesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <h1 className="font-mono text-lg font-semibold tracking-tight">
        Issue Tracker
      </h1>
      <Window title="All Issues" bodyClassName="p-2">
        <DataTable
          columns={issueColumns}
          data={issues}
          filterPlaceholder="id, type, bank, finding..."
        />
      </Window>
    </div>
  );
}
