from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import Answer, EvidenceDoc, Fact, Issue, Questionnaire, Requirement
from core.serializers import (
    AnswerSerializer,
    EvidenceDocSerializer,
    FactSerializer,
    IssueSerializer,
    QuestionnaireSerializer,
    RequirementSerializer,
)
from core.services.auditor import audit_answer
from core.services.ingest import ingest_document
from core.services.questionnaire_ingest import ingest_questionnaire
from core.services.responder import answer_requirement

SUMMARY = OpenApiResponse(description="Operation summary")


class EvidenceDocViewSet(viewsets.ModelViewSet):
    queryset = EvidenceDoc.objects.all()
    serializer_class = EvidenceDocSerializer
    search_fields = ["name", "content"]

    @extend_schema(request=None, responses=SUMMARY)
    @action(detail=True, methods=["post"])
    def ingest(self, request, pk=None):
        return Response(ingest_document(self.get_object()))


class FactViewSet(viewsets.ModelViewSet):
    queryset = Fact.objects.all()
    serializer_class = FactSerializer
    filterset_fields = ["status", "category"]
    search_fields = ["statement"]


class QuestionnaireViewSet(viewsets.ModelViewSet):
    queryset = Questionnaire.objects.all()
    serializer_class = QuestionnaireSerializer
    filterset_fields = ["status"]

    @extend_schema(request=None, responses=SUMMARY)
    @action(detail=True, methods=["post"])
    def ingest(self, request, pk=None):
        return Response(ingest_questionnaire(self.get_object()))

    @extend_schema(request=None, responses=SUMMARY)
    @action(detail=True, methods=["post"])
    def answer(self, request, pk=None):
        answered = [answer_requirement(req) for req in self.get_object().requirements.all()]
        return Response({"answered": len(answered)})


class RequirementViewSet(viewsets.ModelViewSet):
    queryset = Requirement.objects.all()
    serializer_class = RequirementSerializer
    filterset_fields = ["questionnaire", "category"]
    search_fields = ["text"]

    @extend_schema(request=None, responses=AnswerSerializer)
    @action(detail=True, methods=["post"])
    def answer(self, request, pk=None):
        answer = answer_requirement(self.get_object())
        return Response(AnswerSerializer(answer).data, status=status.HTTP_201_CREATED)


class AnswerViewSet(viewsets.ModelViewSet):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
    filterset_fields = ["requirement", "status"]

    @extend_schema(request=None, responses=IssueSerializer(many=True))
    @action(detail=True, methods=["post"])
    def audit(self, request, pk=None):
        issues = audit_answer(self.get_object())
        return Response(IssueSerializer(issues, many=True).data)


class IssueViewSet(viewsets.ModelViewSet):
    queryset = Issue.objects.all()
    serializer_class = IssueSerializer
    filterset_fields = ["type", "status", "requirement"]
