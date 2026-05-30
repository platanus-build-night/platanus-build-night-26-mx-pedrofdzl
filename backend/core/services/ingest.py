from core.models import DocumentChunk, Fact, FactCitation
from core.services.chunking import chunk_text
from core.services.embeddings import embed_texts
from core.services.extraction import extract_facts


def _reset_candidates(document):
    Fact.objects.filter(
        citations__document=document, status=Fact.Status.CANDIDATE
    ).distinct().delete()


def run_pipeline(document, job=None, reset=False):
    def step(name, processed=None, total=None):
        if job is None:
            return
        job.step = name
        if processed is not None:
            job.processed = processed
        if total is not None:
            job.total = total
        job.save(update_fields=["step", "processed", "total", "updated_at"])

    if reset:
        _reset_candidates(document)
    document.chunks.all().delete()

    step("chunk")
    chunks = chunk_text(document.content)
    step("extract", processed=0, total=len(chunks))

    facts = []
    for order, text in enumerate(chunks):
        chunk = DocumentChunk.objects.create(document=document, text=text, order=order)
        for extracted in extract_facts(text):
            fact = Fact.objects.create(
                statement=extracted["statement"],
                category=extracted.get("category", ""),
            )
            FactCitation.objects.create(fact=fact, chunk=chunk, document=document)
            facts.append(fact)
        step("extract", processed=order + 1)

    if facts:
        step("embed")
        vectors = embed_texts([fact.statement for fact in facts])
        for fact, vector in zip(facts, vectors, strict=True):
            fact.embedding = vector
        Fact.objects.bulk_update(facts, ["embedding"])

    return {"chunks": len(chunks), "facts": len(facts)}
