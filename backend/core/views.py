import django_filters
from django.http import StreamingHttpResponse
from django.utils import timezone
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
from core.services.ingest import run_pipeline
from core.services.questionnaire_ingest import ingest_questionnaire
from core.services.responder import answer_requirement

SUMMARY = OpenApiResponse(description="Operation summary")


def run_analysis(job):
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
        job = AnalysisJob.objects.create(document=self.get_object())
        run_analysis(job)
        return Response(AnalysisJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)

    @extend_schema(request=None, responses=AnalysisJobSerializer)
    @action(detail=True, methods=["put", "post"])
    def content(self, request, pk=None):
        document = self.get_object()
        if "content" in request.data:
            document.content = request.data["content"]
            document.save(update_fields=["content", "updated_at"])
        job = AnalysisJob.objects.create(document=document)
        run_analysis(job)
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
