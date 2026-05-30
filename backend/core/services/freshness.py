from django.utils import timezone

from core.models import Fact, Issue


def sweep_stale_facts():
    """Mark facts past their review date stale and open a dated issue for each."""
    today = timezone.localdate()
    expired = Fact.objects.filter(review_by__lte=today).exclude(
        status__in=[Fact.Status.STALE, Fact.Status.REJECTED]
    )

    stale = 0
    issues = 0
    for fact in expired:
        fact.status = Fact.Status.STALE
        fact.save(update_fields=["status", "updated_at"])
        stale += 1
        has_open = fact.issues.filter(type=Issue.Type.STALE_FACT, status=Issue.Status.OPEN).exists()
        if not has_open:
            Issue.objects.create(
                type=Issue.Type.STALE_FACT,
                fact=fact,
                severity=Issue.Severity.MEDIUM,
                title="Fact due for review",
                description=(
                    f"Fact passed its review date ({fact.review_by}) and needs re-verification."
                ),
                due_date=fact.review_by,
            )
            issues += 1
    return {"stale": stale, "issues": issues}
