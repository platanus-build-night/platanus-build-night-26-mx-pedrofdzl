"use client";

import { Window } from "@/components/window";
import { DataTable } from "@/components/data-table";
import { issueColumns } from "@/components/columns";
import { issues } from "@/lib/mock";

export default function IssuesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Issue Tracker</h1>
      <Window title="All Issues">
        <DataTable
          columns={issueColumns}
          data={issues}
          filterPlaceholder="id, type, bank, finding..."
        />
      </Window>
    </div>
  );
}
