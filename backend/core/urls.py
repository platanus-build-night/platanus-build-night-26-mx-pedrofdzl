from django.urls import path
from rest_framework.routers import DefaultRouter

from core.views import (
    AnswerViewSet,
    CopilotChatView,
    EvidenceDocViewSet,
    FactViewSet,
    IssueViewSet,
    QuestionnaireViewSet,
    RequirementViewSet,
)

router = DefaultRouter()
router.register("evidence-docs", EvidenceDocViewSet)
router.register("facts", FactViewSet)
router.register("questionnaires", QuestionnaireViewSet)
router.register("requirements", RequirementViewSet)
router.register("answers", AnswerViewSet)
router.register("issues", IssueViewSet)

urlpatterns = [
    *router.urls,
    path("copilot/chat/", CopilotChatView.as_view(), name="copilot-chat"),
]
