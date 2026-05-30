from rest_framework.routers import DefaultRouter

from core.views import (
    AnswerViewSet,
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

urlpatterns = router.urls
