from rest_framework import serializers

from core.models import (
    AnalysisJob,
    Answer,
    Category,
    Document,
    Fact,
    FactCitation,
    Issue,
    Questionnaire,
    Requirement,
)


def _job_percent(job):
    return round(100 * job.processed / job.total) if job.total else 0


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "parent", "created_at"]


class AnalysisJobSerializer(serializers.ModelSerializer):
    percent = serializers.SerializerMethodField()

    class Meta:
        model = AnalysisJob
        fields = [
            "id",
            "document",
            "status",
            "step",
            "processed",
            "total",
            "facts_created",
            "percent",
            "error",
            "created_at",
            "started_at",
            "finished_at",
        ]

    def get_percent(self, obj):
        return _job_percent(obj)


class DocumentSerializer(serializers.ModelSerializer):
    latest_job = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "name",
            "content",
            "source_file",
            "doc_type",
            "category",
            "style_guide_section",
            "created_at",
            "updated_at",
            "latest_job",
        ]

    def get_latest_job(self, obj):
        job = obj.analysis_jobs.first()
        if job is None:
            return None
        return {"id": job.id, "status": job.status, "step": job.step, "percent": _job_percent(job)}


class FactCitationSerializer(serializers.ModelSerializer):
    chunk_text = serializers.CharField(source="chunk.text", read_only=True, default=None)

    class Meta:
        model = FactCitation
        fields = ["id", "document", "chunk", "chunk_text"]


class FactSerializer(serializers.ModelSerializer):
    citations = FactCitationSerializer(many=True, read_only=True)

    class Meta:
        model = Fact
        fields = [
            "id",
            "statement",
            "category",
            "status",
            "confidence",
            "review_by",
            "created_at",
            "citations",
        ]


class CitedFactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fact
        fields = ["id", "statement", "category"]


class QuestionnaireSerializer(serializers.ModelSerializer):
    requirement_count = serializers.IntegerField(read_only=True, default=0)
    answered_count = serializers.IntegerField(read_only=True, default=0)
    audited_count = serializers.IntegerField(read_only=True, default=0)
    open_issue_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Questionnaire
        fields = [
            "id",
            "source_name",
            "raw_file",
            "due_date",
            "status",
            "layout",
            "uploaded_at",
            "requirement_count",
            "answered_count",
            "audited_count",
            "open_issue_count",
        ]


class RequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Requirement
        fields = ["id", "questionnaire", "text", "category", "normalized_key", "source_row"]


class AnswerSerializer(serializers.ModelSerializer):
    cited_facts = serializers.SerializerMethodField()
    reused_from_source = serializers.SerializerMethodField()

    class Meta:
        model = Answer
        fields = [
            "id",
            "requirement",
            "text",
            "confidence",
            "status",
            "source",
            "reused_from",
            "reused_from_source",
            "audited_at",
            "created_at",
            "cited_facts",
        ]

    def get_cited_facts(self, obj):
        facts = [citation.fact for citation in obj.citations.select_related("fact")]
        return CitedFactSerializer(facts, many=True).data

    def get_reused_from_source(self, obj):
        source = obj.reused_from
        if source is None:
            return None
        return getattr(source.requirement.questionnaire, "source_name", None)


class IssueSerializer(serializers.ModelSerializer):
    requirement_text = serializers.CharField(
        source="requirement.text", read_only=True, default=None
    )
    questionnaire = serializers.IntegerField(
        source="requirement.questionnaire_id", read_only=True, default=None
    )
    questionnaire_name = serializers.CharField(
        source="requirement.questionnaire.source_name", read_only=True, default=None
    )
    assignee_email = serializers.CharField(source="assignee.email", read_only=True, default=None)

    class Meta:
        model = Issue
        fields = [
            "id",
            "type",
            "severity",
            "requirement",
            "requirement_text",
            "questionnaire",
            "questionnaire_name",
            "fact",
            "assignee",
            "assignee_email",
            "title",
            "description",
            "status",
            "due_date",
            "created_at",
            "updated_at",
        ]


class ChatMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField()


class ChatRequestSerializer(serializers.Serializer):
    messages = ChatMessageSerializer(many=True)
