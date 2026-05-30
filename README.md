<img src="./project-logo.png" alt="Ditto" width="96" />

# Ditto

**Answer once, then ditto across every questionnaire — grounded in cited facts.**

Ditto is an autonomous compliance agent that eliminates the manual grind of vendor security questionnaires. Upload any bank's questionnaire in any format (CSV or Excel, any column layout) and Ditto auto-detects the structure, ingests each requirement, and answers it using a curated Fact base extracted from your own policy documents.

Every answer cites the exact facts it relied on. An adversarial auditor flags unbacked claims and contradictions. Gaps and issues become tracked items on a living dashboard. When you're done, export the original file with answers written back into the right columns, ready to send.

## Stack

- **Backend:** Django + DRF, Celery, Postgres + pgvector
- **Frontend:** Next.js, TypeScript, shadcn/ui
- **AI:** Anthropic Claude (Sonnet for answering and auditing, Haiku for column mapping)

## Hacker

Pedro Fernandez ([@pedrofdzl](https://github.com/pedrofdzl))
