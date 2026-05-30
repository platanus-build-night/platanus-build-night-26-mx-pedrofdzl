from rest_framework import serializers

from core.models import (
    Answer,
    EvidenceDoc,
    Fact,
    Issue,
    Questionnaire,
    Requirement,
)


class EvidenceDocSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvidenceDoc
        fields = ["id", "name", "content", "style_guide_section", "created_at", "updated_at"]


class FactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fact
        fields = ["id", "statement", "category", "status", "confidence", "review_by", "created_at"]


class CitedFactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fact
        fields = ["id", "statement", "category"]


class QuestionnaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = Questionnaire
        fields = ["id", "source_name", "due_date", "status", "uploaded_at"]


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
