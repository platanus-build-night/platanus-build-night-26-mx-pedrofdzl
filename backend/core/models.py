from django.conf import settings
from django.db import models
from pgvector.django import HnswIndex, VectorField

EMBEDDING_DIM = 1536  # must match the embedding model output (openai text-embedding-3-small)


class Category(models.Model):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        "self", null=True, blank=True, related_name="children", on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["parent", "name"], name="unique_category_per_parent")
        ]

    def __str__(self):
        return self.name

    @property
    def path(self):
        names = [self.name]
        node = self.parent
        while node is not None:
            names.append(node.name)
            node = node.parent
        return " / ".join(reversed(names))


class Document(models.Model):
    class DocType(models.TextChoices):
        TEXT = "text"
        DOCX = "docx"

    name = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    source_file = models.FileField(upload_to="documents/", null=True, blank=True)
    doc_type = models.CharField(max_length=10, choices=DocType.choices, default=DocType.TEXT)
    category = models.ForeignKey(
        Category, null=True, blank=True, related_name="documents", on_delete=models.SET_NULL
    )
    style_guide_section = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class DocumentChunk(models.Model):
    document = models.ForeignKey(Document, related_name="chunks", on_delete=models.CASCADE)
    text = models.TextField()
    anchor = models.CharField(max_length=255, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["document", "order"]

    def __str__(self):
        return f"{self.document_id}:{self.order}"


class Fact(models.Model):
    class Status(models.TextChoices):
        CANDIDATE = "candidate"
        APPROVED = "approved"
        REJECTED = "rejected"
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
    chunk = models.ForeignKey(
        DocumentChunk,
        related_name="citations",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    document = models.ForeignKey(
        Document,
        related_name="citations",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    def __str__(self):
        return f"citation:{self.fact_id}"


class AnalysisJob(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending"
        RUNNING = "running"
        DONE = "done"
        FAILED = "failed"

    document = models.ForeignKey(Document, related_name="analysis_jobs", on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    step = models.CharField(max_length=40, blank=True)
    processed = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=0)
    facts_created = models.PositiveIntegerField(default=0)
    error = models.TextField(blank=True)
    task_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"job:{self.document_id}:{self.status}"


class Questionnaire(models.Model):
    class Status(models.TextChoices):
        OPEN = "open"
        IN_PROGRESS = "in_progress"
        SUBMITTED = "submitted"

    source_name = models.CharField(max_length=255)
    raw_file = models.FileField(upload_to="questionnaires/", null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    layout = models.JSONField(default=dict, blank=True)
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
    source_row = models.IntegerField(null=True, blank=True)
    embedding = VectorField(dimensions=EMBEDDING_DIM, null=True, blank=True)

    class Meta:
        indexes = [
            HnswIndex(
                name="requirement_embedding_hnsw",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            )
        ]

    def __str__(self):
        return self.text[:80]


class Answer(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft"
        APPROVED = "approved"

    class Source(models.TextChoices):
        GENERATED = "generated"
        REUSED = "reused"

    requirement = models.ForeignKey(Requirement, related_name="answers", on_delete=models.CASCADE)
    text = models.TextField()
    confidence = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.GENERATED)
    reused_from = models.ForeignKey(
        "self", null=True, blank=True, related_name="reused_into", on_delete=models.SET_NULL
    )
    audited_at = models.DateTimeField(null=True, blank=True)
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
        MISSING_POLICY = "missing_policy"
        MISSING_EVIDENCE = "missing_evidence"
        IMPLEMENTATION_GAP = "implementation_gap"
        CONTRADICTION = "contradiction"
        UNBACKED_CLAIM = "unbacked_claim"
        STALE_FACT = "stale_fact"
        COMMITMENT = "commitment"

    class Severity(models.TextChoices):
        LOW = "low"
        MEDIUM = "medium"
        HIGH = "high"

    class Status(models.TextChoices):
        OPEN = "open"
        IN_PROGRESS = "in_progress"
        CLOSED = "closed"

    type = models.CharField(max_length=32, choices=Type.choices)
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.MEDIUM)
    requirement = models.ForeignKey(
        Requirement, related_name="issues", null=True, blank=True, on_delete=models.SET_NULL
    )
    fact = models.ForeignKey(
        Fact, related_name="issues", null=True, blank=True, on_delete=models.SET_NULL
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="issues",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.type}:{self.pk}"
