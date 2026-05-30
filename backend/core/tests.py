import io
from unittest.mock import patch

from django.test import TestCase
from pgvector.django import CosineDistance

from core.models import (
    EMBEDDING_DIM,
    EvidenceChunk,
    EvidenceDoc,
    Fact,
    FactCitation,
    Questionnaire,
    Requirement,
)
from core.services.ingest import ingest_document
from core.services.questionnaire_ingest import ingest_questionnaire


def unit_vector(index):
    vector = [0.0] * EMBEDDING_DIM
    vector[index] = 1.0
    return vector


class FactVectorSearchTests(TestCase):
    def test_cosine_distance_orders_by_similarity(self):
        near = Fact.objects.create(statement="data encrypted at rest", embedding=unit_vector(0))
        far = Fact.objects.create(statement="office has a foosball table", embedding=unit_vector(1))

        ranked = list(Fact.objects.order_by(CosineDistance("embedding", unit_vector(0))))

        self.assertEqual(ranked[0], near)
        self.assertEqual(ranked[-1], far)


class IngestTests(TestCase):
    @patch("core.services.ingest.embed_texts")
    @patch("core.services.ingest.extract_facts")
    def test_ingest_creates_chunks_facts_citations_and_embeddings(self, mock_extract, mock_embed):
        mock_extract.return_value = [
            {"statement": "Data is encrypted at rest with AES-256", "category": "encryption"}
        ]
        mock_embed.side_effect = lambda statements: [unit_vector(0) for _ in statements]
        doc = EvidenceDoc.objects.create(name="Security Policy", content="First.\n\nSecond.")

        summary = ingest_document(doc)

        self.assertEqual(summary["chunks"], EvidenceChunk.objects.count())
        self.assertEqual(summary["facts"], Fact.objects.count())
        fact = Fact.objects.get()
        self.assertIsNotNone(fact.embedding)
        self.assertTrue(FactCitation.objects.filter(fact=fact, evidence_doc=doc).exists())


class QuestionnaireIngestTests(TestCase):
    def test_ingest_csv_creates_requirements(self):
        csv_bytes = (
            b"Question,Category\nDo you encrypt data at rest?,Encryption\nIs MFA enforced?,Access\n"
        )
        questionnaire = Questionnaire.objects.create(source_name="Bank A")

        summary = ingest_questionnaire(questionnaire, io.BytesIO(csv_bytes), "bank-a.csv")

        self.assertEqual(summary["requirements"], 2)
        requirement = Requirement.objects.get(text="Do you encrypt data at rest?")
        self.assertEqual(requirement.category, "Encryption")
        self.assertEqual(requirement.normalized_key, "do you encrypt data at rest?")
