"use client";

import { Window } from "@/components/window";
import { DataTable } from "@/components/data-table";
import { requirementColumns } from "@/components/columns";
import { Button } from "@/components/ui/button";
import { TopBarActions } from "@/components/top-bar";
import { requirements } from "@/lib/mock";

export default function RequirementsPage() {
  return (
    <div className="space-y-4">
      <TopBarActions>
        <Button variant="outline" size="sm">
          Export CSV
        </Button>
        <Button size="sm">Import Questionnaire</Button>
      </TopBarActions>
      <h1 className="text-xl font-semibold tracking-tight">Requirements</h1>
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
