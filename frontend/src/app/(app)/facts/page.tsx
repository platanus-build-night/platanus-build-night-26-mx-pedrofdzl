"use client";

import { Window } from "@/components/window";

export default function FactsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-mono text-lg font-semibold tracking-tight">
        Fact Base
      </h1>
      <Window title="Evidence // Facts">
        <div className="space-y-2 font-mono text-xs text-muted-foreground">
          <p>
            The curated, cited fact base lives here: every answer is grounded in
            a Fact, and every Fact cites a source document.
          </p>
          <p className="text-foreground">
            [ Pending backend ] Ingest + retrieval endpoints not yet wired.
          </p>
        </div>
      </Window>
    </div>
  );
}
