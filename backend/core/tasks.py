from celery import shared_task
from django.utils import timezone

from core.models import AnalysisJob
from core.services.ingest import run_pipeline


@shared_task
def analyze_document(job_id):
    job = AnalysisJob.objects.get(id=job_id)
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
