from celery import shared_task
from django.utils import timezone

from core.models import AnalysisJob
from core.services.freshness import sweep_stale_facts
from core.services.ingest import run_pipeline


@shared_task
def sweep_stale_facts_task():
    return sweep_stale_facts()


@shared_task
def analyze_document(job_id):
    job = AnalysisJob.objects.get(id=job_id)

    # Guard against two pipelines running on the same document at once: they
    # rebuild the chunk set and would clobber each other's citations. The
    # enqueue path already dedupes; this catches manual/duplicate dispatches.
    if (
        AnalysisJob.objects.filter(document_id=job.document_id, status=AnalysisJob.Status.RUNNING)
        .exclude(id=job.id)
        .exists()
    ):
        job.status = AnalysisJob.Status.FAILED
        job.error = "Skipped: another analysis is already running for this document."
        job.finished_at = timezone.now()
        job.save()
        return

    job.status = AnalysisJob.Status.RUNNING
    job.started_at = timezone.now()
    job.save(update_fields=["status", "started_at", "updated_at"])
    try:
        result = run_pipeline(job.document, job=job, reset=True)
        job.status = AnalysisJob.Status.DONE
        job.facts_created = result["facts"]
    except Exception as exc:  # noqa: BLE001
        job.status = AnalysisJob.Status.FAILED
        job.error = str(exc)
    job.finished_at = timezone.now()
    job.save()
