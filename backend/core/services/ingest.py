from django.db import transaction

from core.models import EvidenceChunk, Fact, FactCitation
from core.services.chunking import chunk_text
from core.services.embeddings import embed_texts
from core.services.extraction import extract_facts


@transaction.atomic
def ingest_document(doc):
    facts = []
    chunk_count = 0
    for order, text in enumerate(chunk_text(doc.content)):
        chunk = EvidenceChunk.objects.create(evidence_doc=doc, text=text, order=order)
        chunk_count += 1
        for extracted in extract_facts(text):
            fact = Fact.objects.create(
                statement=extracted["statement"],
                category=extracted.get("category", ""),
            )
            FactCitation.objects.create(fact=fact, evidence_chunk=chunk, evidence_doc=doc)
            facts.append(fact)

    if facts:
        vectors = embed_texts([fact.statement for fact in facts])
        for fact, vector in zip(facts, vectors, strict=True):
            fact.embedding = vector
        Fact.objects.bulk_update(facts, ["embedding"])

    return {"chunks": chunk_count, "facts": len(facts)}
