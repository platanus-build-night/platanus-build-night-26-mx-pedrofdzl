from django.db import models
from pgvector.django import HnswIndex, VectorField

EMBEDDING_DIM = 1024  # must match the embedding model output (voyage-3 = 1024)


class EvidenceDoc(models.Model):
    name = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    source_file = models.FileField(upload_to="evidence/", null=True, blank=True)
    style_guide_section = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class EvidenceChunk(models.Model):
    evidence_doc = models.ForeignKey(EvidenceDoc, related_name="chunks", on_delete=models.CASCADE)
    text = models.TextField()
    anchor = models.CharField(max_length=255, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["evidence_doc", "order"]

    def __str__(self):
        return f"{self.evidence_doc_id}:{self.order}"


class Fact(models.Model):
    class Status(models.TextChoices):
        CANDIDATE = "candidate"
        APPROVED = "approved"
        STALE = "stale"

    statement = models.TextField()
    category = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CANDIDATE)
    confidence = models.FloatField(null=True, blank=True)
    embedding = VectorField(dimensions=EMBEDDING_DIM, null=True, blank=True)
    review_by = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            HnswIndex(
                name="fact_embedding_hnsw",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            )
        ]

    def __str__(self):
        return self.statement[:80]


class FactCitation(models.Model):
    fact = models.ForeignKey(Fact, related_name="citations", on_delete=models.CASCADE)
    evidence_chunk = models.ForeignKey(
        EvidenceChunk,
        related_name="citations",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    evidence_doc = models.ForeignKey(
        EvidenceDoc,
        related_name="citations",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    def __str__(self):
        return f"citation:{self.fact_id}"


class Questionnaire(models.Model):
    class Status(models.TextChoices):
        OPEN = "open"
        IN_PROGRESS = "in_progress"
        SUBMITTED = "submitted"

    source_name = models.CharField(max_length=255)
    raw_file = models.FileField(upload_to="questionnaires/", null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.source_name


class Requirement(models.Model):
    questionnaire = models.ForeignKey(
        Questionnaire, related_name="requirements", on_delete=models.CASCADE
    )
    text = models.TextField()
    category = models.CharField(max_length=120, blank=True)
    normalized_key = models.CharField(max_length=255, blank=True, db_index=True)

    def __str__(self):
        return self.text[:80]


class Answer(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft"
        APPROVED = "approved"

    requirement = models.ForeignKey(Requirement, related_name="answers", on_delete=models.CASCADE)
    text = models.TextField()
    confidence = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"answer:{self.requirement_id}"


class AnswerCitation(models.Model):
    answer = models.ForeignKey(Answer, related_name="citations", on_delete=models.CASCADE)
    fact = models.ForeignKey(Fact, related_name="answer_citations", on_delete=models.CASCADE)

    def __str__(self):
        return f"citation:{self.answer_id}->{self.fact_id}"


class Issue(models.Model):
    class Type(models.TextChoices):
        UNBACKED = "unbacked"
        CONTRADICTION = "contradiction"
        GAP = "gap"
        DRIFT = "drift"
        STALE = "stale"

    class Status(models.TextChoices):
        OPEN = "open"
        CLOSED = "closed"

    type = models.CharField(max_length=20, choices=Type.choices)
    requirement = models.ForeignKey(
        Requirement, related_name="issues", null=True, blank=True, on_delete=models.SET_NULL
    )
    fact = models.ForeignKey(
        Fact, related_name="issues", null=True, blank=True, on_delete=models.SET_NULL
    )
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type}:{self.pk}"
