from pgvector.django import CosineDistance

from core.models import Answer, AnswerCitation, Requirement


def _latest_answer(requirement):
    return requirement.answers.order_by("-created_at").first()


def find_reusable_answer(requirement, max_distance=0.15):
    """Find a prior answer to a requirement that matches this one.

    Exact normalized_key match wins outright; otherwise the nearest answered
    requirement by cosine distance, if within max_distance.
    """
    if requirement.normalized_key:
        twin = (
            Requirement.objects.filter(
                normalized_key=requirement.normalized_key, answers__isnull=False
            )
            .exclude(id=requirement.id)
            .distinct()
            .first()
        )
        if twin is not None:
            answer = _latest_answer(twin)
            if answer is not None:
                return answer

    if requirement.embedding is None:
        return None

    nearest = (
        Requirement.objects.filter(answers__isnull=False, embedding__isnull=False)
        .exclude(id=requirement.id)
        .exclude(questionnaire_id=requirement.questionnaire_id)
        .annotate(distance=CosineDistance("embedding", requirement.embedding))
        .order_by("distance")
        .first()
    )
    if nearest is None or nearest.distance > max_distance:
        return None
    return _latest_answer(nearest)


def reuse_answer(requirement, source):
    answer = Answer.objects.create(
        requirement=requirement,
        text=source.text,
        confidence=source.confidence,
        source=Answer.Source.REUSED,
        reused_from=source,
    )
    AnswerCitation.objects.bulk_create(
        [
            AnswerCitation(answer=answer, fact_id=citation.fact_id)
            for citation in source.citations.all()
        ]
    )
    return answer
