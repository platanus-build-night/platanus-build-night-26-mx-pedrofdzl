from django.test import TestCase
from pgvector.django import CosineDistance

from core.models import EMBEDDING_DIM, Fact


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
