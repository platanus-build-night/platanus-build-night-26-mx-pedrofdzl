"use client";

import { Window } from "@/components/window";

export default function FactsPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Fact Base</h1>
      <Window title="Evidence & Facts">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            The curated, cited fact base lives here: every answer is grounded in
            a Fact, and every Fact cites a source document.
          </p>
          <p className="text-foreground">
            Pending backend: ingest and retrieval endpoints are not yet wired.
          </p>
        </div>
      </Window>
    </div>
  );
}
