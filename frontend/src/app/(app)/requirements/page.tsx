"use client";

import { Window } from "@/components/window";
import { DataTable } from "@/components/data-table";
import { requirementColumns } from "@/components/columns";
import { requirements } from "@/lib/mock";

export default function RequirementsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Requirements</h1>
      <Window title="All Requirements">
        <DataTable
          columns={requirementColumns}
          data={requirements}
          filterPlaceholder="id, bank, question, category..."
        />
      </Window>
    </div>
  );
}
