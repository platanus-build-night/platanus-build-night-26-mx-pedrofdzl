import tempfile
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import EMBEDDING_DIM, Fact, Questionnaire, Requirement

User = get_user_model()


def unit_vector(index):
    vector = [0.0] * EMBEDDING_DIM
    vector[index] = 1.0
    return vector


class ResourceApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="u@bank.com", password="supersecret123")

    def test_facts_list_requires_auth(self):
        self.assertEqual(
            self.client.get("/api/v1/facts/").status_code, status.HTTP_401_UNAUTHORIZED
        )

    def test_facts_list_returns_data_when_authenticated(self):
        Fact.objects.create(statement="Data encrypted at rest")
        self.client.force_authenticate(self.user)

        res = self.client.get("/api/v1/facts/")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)

    @patch("core.services.responder.generate_answer")
    @patch("core.services.responder.embed_text")
    def test_requirement_answer_action(self, mock_embed, mock_generate):
        fact = Fact.objects.create(statement="AES-256 at rest", embedding=unit_vector(0))
        mock_embed.return_value = unit_vector(0)
        mock_generate.return_value = {
            "answer": "Yes.",
            "cited_fact_ids": [fact.id],
            "confidence": 0.8,
        }
        questionnaire = Questionnaire.objects.create(source_name="Bank A")
        requirement = Requirement.objects.create(
            questionnaire=questionnaire, text="Encrypt at rest?"
        )
        self.client.force_authenticate(self.user)

        res = self.client.post(f"/api/v1/requirements/{requirement.id}/answer/")

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["text"], "Yes.")
        self.assertEqual(len(res.data["cited_facts"]), 1)


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class QuestionnaireUploadTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="upload@bank.com", password="supersecret123")
        self.client.force_authenticate(self.user)

    def test_upload_then_ingest_creates_requirements(self):
        csv = SimpleUploadedFile(
            "q.csv",
            b"Question\nDo you encrypt at rest?\nIs MFA enforced?\n",
            content_type="text/csv",
        )
        created = self.client.post(
            "/api/v1/questionnaires/",
            {"source_name": "Bank B", "raw_file": csv},
            format="multipart",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)

        ingested = self.client.post(f"/api/v1/questionnaires/{created.data['id']}/ingest/")

        self.assertEqual(ingested.status_code, status.HTTP_200_OK)
        self.assertEqual(ingested.data["requirements"], 2)
