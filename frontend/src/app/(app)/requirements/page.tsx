"use client";

import { Window } from "@/components/window";
import { DataTable } from "@/components/data-table";
import { requirementColumns } from "@/components/columns";
import { requirements } from "@/lib/mock";

export default function RequirementsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <h1 className="font-mono text-lg font-semibold tracking-tight">
        Requirements
      </h1>
      <Window title="All Requirements" bodyClassName="p-2">
        <DataTable
          columns={requirementColumns}
          data={requirements}
          filterPlaceholder="id, bank, question, category..."
        />
      </Window>
    </div>
  );
}
