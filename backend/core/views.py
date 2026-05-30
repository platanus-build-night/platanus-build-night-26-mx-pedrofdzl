import django_filters
from django.db.models import Count, Q
from django.http import HttpResponse, StreamingHttpResponse
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import (
    AnalysisJob,
    Answer,
    Category,
    Document,
    Fact,
    Issue,
    Questionnaire,
    Requirement,
)
from core.serializers import (
    AnalysisJobSerializer,
    AnswerSerializer,
    CategorySerializer,
    ChatRequestSerializer,
    DocumentSerializer,
    FactSerializer,
    IssueSerializer,
    QuestionnaireSerializer,
    RequirementSerializer,
)
from core.services.auditor import audit_answer
from core.services.copilot import stream_chat
from core.services.questionnaire_export import export_questionnaire
from core.services.questionnaire_ingest import ingest_questionnaire
from core.services.responder import answer_requirement
from core.tasks import analyze_document, answer_questionnaire

SUMMARY = OpenApiResponse(description="Operation summary")


def _enqueue_analysis(document):
    # Reuse an in-flight job so the same document is never analyzed twice
    # concurrently (concurrent pipelines clobber each other's chunks).
    active = document.analysis_jobs.filter(
        status__in=[AnalysisJob.Status.PENDING, AnalysisJob.Status.RUNNING]
    ).first()
    if active is not None:
        return active
    job = AnalysisJob.objects.create(document=document)
    result = analyze_document.delay(job.id)
    job.task_id = result.id
    job.save(update_fields=["task_id"])
    return job


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filterset_fields = ["parent"]


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    filterset_fields = ["category", "doc_type"]
    search_fields = ["name", "content"]

    @extend_schema(request=None, responses=AnalysisJobSerializer)
    @action(detail=True, methods=["post"])
    def analyze(self, request, pk=None):
        job = _enqueue_analysis(self.get_object())
        return Response(AnalysisJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)

    @extend_schema(request=None, responses=AnalysisJobSerializer)
    @action(detail=True, methods=["put", "post"])
    def content(self, request, pk=None):
        document = self.get_object()
        if "content" in request.data:
            document.content = request.data["content"]
            document.save(update_fields=["content", "updated_at"])
        job = _enqueue_analysis(document)
        return Response(AnalysisJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)


class AnalysisJobViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AnalysisJob.objects.all()
    serializer_class = AnalysisJobSerializer
    filterset_fields = ["document", "status"]


class FactFilter(django_filters.FilterSet):
    document = django_filters.NumberFilter(field_name="citations__document", distinct=True)

    class Meta:
        model = Fact
        fields = ["status", "category", "document"]


class FactViewSet(viewsets.ModelViewSet):
    queryset = Fact.objects.all()
    serializer_class = FactSerializer
    filterset_class = FactFilter
    search_fields = ["statement"]

    @extend_schema(request=None, responses=FactSerializer)
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        fact = self.get_object()
        fact.status = Fact.Status.APPROVED
        fact.save(update_fields=["status", "updated_at"])
        return Response(FactSerializer(fact).data)

    @extend_schema(request=None, responses=FactSerializer)
    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        fact = self.get_object()
        fact.status = Fact.Status.REJECTED
        fact.save(update_fields=["status", "updated_at"])
        return Response(FactSerializer(fact).data)


class QuestionnaireViewSet(viewsets.ModelViewSet):
    queryset = Questionnaire.objects.all()
    serializer_class = QuestionnaireSerializer
    filterset_fields = ["status"]

    def get_queryset(self):
        return Questionnaire.objects.annotate(
            requirement_count=Count("requirements", distinct=True),
            answered_count=Count(
                "requirements",
                filter=Q(requirements__answers__isnull=False),
                distinct=True,
            ),
            audited_count=Count(
                "requirements",
                filter=Q(requirements__answers__audited_at__isnull=False),
                distinct=True,
            ),
            open_issue_count=Count(
                "requirements__issues",
                filter=~Q(requirements__issues__status=Issue.Status.CLOSED),
                distinct=True,
            ),
        )

    @extend_schema(request=None, responses=SUMMARY)
    @action(detail=True, methods=["post"])
    def ingest(self, request, pk=None):
        return Response(ingest_questionnaire(self.get_object()))

    @extend_schema(request=None, responses=QuestionnaireSerializer)
    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        questionnaire = self.get_object()
        questionnaire.status = Questionnaire.Status.SUBMITTED
        questionnaire.save(update_fields=["status"])
        return Response(self.get_serializer(self.get_queryset().get(pk=questionnaire.pk)).data)

    @extend_schema(request=None, responses=SUMMARY)
    @action(detail=True, methods=["post"])
    def answer(self, request, pk=None):
        answer_questionnaire.delay(self.get_object().pk)
        return Response({"status": "queued"})

    @extend_schema(
        request=None,
        responses=OpenApiResponse(description="Filled questionnaire file download"),
    )
    @action(detail=True, methods=["get", "post"])
    def export(self, request, pk=None):
        content, content_type, filename = export_questionnaire(self.get_object())
        response = HttpResponse(content, content_type=content_type)
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


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


class IssueFilter(django_filters.FilterSet):
    questionnaire = django_filters.NumberFilter(field_name="requirement__questionnaire")

    class Meta:
        model = Issue
        fields = ["type", "status", "requirement", "severity", "assignee", "questionnaire"]


class IssueViewSet(viewsets.ModelViewSet):
    queryset = Issue.objects.select_related("requirement__questionnaire", "assignee").all()
    serializer_class = IssueSerializer
    filterset_class = IssueFilter
    ordering_fields = ["due_date", "created_at", "severity"]
    ordering = ["-created_at"]


class CopilotChatView(APIView):
    @extend_schema(
        request=ChatRequestSerializer,
        responses=OpenApiResponse(description="text/event-stream of the copilot reply"),
    )
    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        response = StreamingHttpResponse(
            stream_chat(serializer.validated_data["messages"]),
            content_type="text/event-stream",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
