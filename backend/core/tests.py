import io
from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from pgvector.django import CosineDistance

from core.models import (
    EMBEDDING_DIM,
    Answer,
    AnswerCitation,
    Document,
    DocumentChunk,
    Fact,
    FactCitation,
    Issue,
    Questionnaire,
    Requirement,
)
from core.services.auditor import audit_answer
from core.services.freshness import sweep_stale_facts
from core.services.ingest import run_pipeline
from core.services.questionnaire_ingest import ingest_questionnaire
from core.services.responder import answer_requirement
from core.services.reuse import find_reusable_answer


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
        doc = Document.objects.create(name="Security Policy", content="First.\n\nSecond.")

        summary = run_pipeline(doc)

        self.assertEqual(summary["chunks"], DocumentChunk.objects.count())
        self.assertEqual(summary["facts"], Fact.objects.count())
        fact = Fact.objects.get()
        self.assertIsNotNone(fact.embedding)
        self.assertTrue(FactCitation.objects.filter(fact=fact, document=doc).exists())


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


class ResponderTests(TestCase):
    @patch("core.services.responder.generate_answer")
    @patch("core.services.responder.embed_text")
    def test_answer_requirement_creates_answer_with_citations(self, mock_embed, mock_generate):
        fact = Fact.objects.create(statement="Data is encrypted at rest", embedding=unit_vector(0))
        mock_embed.return_value = unit_vector(0)
        mock_generate.return_value = {
            "answer": "Yes, AES-256 at rest.",
            "cited_fact_ids": [fact.id],
            "confidence": 0.9,
        }
        questionnaire = Questionnaire.objects.create(source_name="Bank A")
        requirement = Requirement.objects.create(
            questionnaire=questionnaire, text="Do you encrypt data at rest?"
        )

        answer = answer_requirement(requirement)

        self.assertEqual(answer.text, "Yes, AES-256 at rest.")
        self.assertEqual(answer.confidence, 0.9)
        self.assertTrue(AnswerCitation.objects.filter(answer=answer, fact=fact).exists())
        self.assertEqual(Answer.objects.count(), 1)


class AuditorTests(TestCase):
    def _answer(self, text):
        questionnaire = Questionnaire.objects.create(source_name="Bank A")
        requirement = Requirement.objects.create(questionnaire=questionnaire, text="Question?")
        return Answer.objects.create(requirement=requirement, text=text)

    def test_answer_without_citations_is_flagged_unbacked(self):
        issues = audit_answer(self._answer("Yes, we do."))

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0].type, Issue.Type.UNBACKED_CLAIM)

    @patch("core.services.auditor.review_answer")
    def test_contradiction_finding_creates_issue(self, mock_review):
        answer = self._answer("Yes, we use SMS 2FA.")
        fact = Fact.objects.create(statement="SMS 2FA is not used", embedding=unit_vector(0))
        AnswerCitation.objects.create(answer=answer, fact=fact)
        mock_review.return_value = [
            {"type": "contradiction", "description": "Answer contradicts the cited fact."}
        ]

        issues = audit_answer(answer)

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0].type, Issue.Type.CONTRADICTION)

    def test_audit_marks_answer_audited(self):
        answer = self._answer("Yes, we do.")
        self.assertIsNone(answer.audited_at)

        audit_answer(answer)
        answer.refresh_from_db()

        self.assertIsNotNone(answer.audited_at)


class ReuseTests(TestCase):
    def _answered_requirement(self, bank, text, fact_statement):
        questionnaire = Questionnaire.objects.create(source_name=bank)
        requirement = Requirement.objects.create(
            questionnaire=questionnaire,
            text=text,
            normalized_key=" ".join(text.lower().split()),
            embedding=unit_vector(0),
        )
        answer = Answer.objects.create(requirement=requirement, text="Yes, fully.")
        fact = Fact.objects.create(statement=fact_statement, embedding=unit_vector(0))
        AnswerCitation.objects.create(answer=answer, fact=fact)
        return requirement, answer

    def test_find_reusable_answer_matches_on_normalized_key(self):
        _, source = self._answered_requirement("Bank A", "Do you encrypt data?", "AES-256 at rest")
        twin_q = Questionnaire.objects.create(source_name="Bank B")
        twin = Requirement.objects.create(
            questionnaire=twin_q,
            text="Do you encrypt data?",
            normalized_key="do you encrypt data?",
            embedding=unit_vector(0),
        )

        self.assertEqual(find_reusable_answer(twin), source)

    def test_answer_requirement_reuses_and_copies_citations(self):
        _, source = self._answered_requirement("Bank A", "Do you encrypt data?", "AES-256 at rest")
        twin_q = Questionnaire.objects.create(source_name="Bank B")
        twin = Requirement.objects.create(
            questionnaire=twin_q,
            text="Do you encrypt data?",
            normalized_key="do you encrypt data?",
            embedding=unit_vector(0),
        )

        answer = answer_requirement(twin)

        self.assertEqual(answer.source, Answer.Source.REUSED)
        self.assertEqual(answer.reused_from, source)
        self.assertEqual(answer.text, source.text)
        self.assertEqual(answer.citations.count(), source.citations.count())


class FreshnessTests(TestCase):
    def test_sweep_marks_stale_and_opens_one_issue(self):
        past = timezone.localdate() - timedelta(days=1)
        fact = Fact.objects.create(
            statement="Pen test from last year",
            status=Fact.Status.APPROVED,
            review_by=past,
        )

        result = sweep_stale_facts()
        fact.refresh_from_db()

        self.assertEqual(fact.status, Fact.Status.STALE)
        self.assertEqual(result["stale"], 1)
        issues = Issue.objects.filter(fact=fact, type=Issue.Type.STALE_FACT)
        self.assertEqual(issues.count(), 1)
        self.assertEqual(issues.first().due_date, past)

        # Idempotent: re-running opens no new issue.
        sweep_stale_facts()
        self.assertEqual(Issue.objects.filter(fact=fact, type=Issue.Type.STALE_FACT).count(), 1)
