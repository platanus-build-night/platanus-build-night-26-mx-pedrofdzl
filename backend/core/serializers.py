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
    class Meta:
        model = Questionnaire
        fields = ["id", "source_name", "raw_file", "due_date", "status", "uploaded_at"]


class RequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Requirement
        fields = ["id", "questionnaire", "text", "category", "normalized_key"]


class AnswerSerializer(serializers.ModelSerializer):
    cited_facts = serializers.SerializerMethodField()

    class Meta:
        model = Answer
        fields = ["id", "requirement", "text", "confidence", "status", "created_at", "cited_facts"]

    def get_cited_facts(self, obj):
        facts = [citation.fact for citation in obj.citations.select_related("fact")]
        return CitedFactSerializer(facts, many=True).data


class IssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issue
        fields = ["id", "type", "requirement", "fact", "description", "status", "created_at"]


class ChatMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField()


class ChatRequestSerializer(serializers.Serializer):
    messages = ChatMessageSerializer(many=True)
