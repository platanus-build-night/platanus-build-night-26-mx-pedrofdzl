from django.conf import settings
from pgvector.django import CosineDistance

from core.models import Answer, AnswerCitation, Fact
from core.services.embeddings import embed_text
from core.services.llm import anthropic_client
from core.services.reuse import find_reusable_answer, reuse_answer

PROMPT = (
    "You are answering a vendor security questionnaire. Use ONLY the facts provided, each "
    "prefixed with its id in brackets. Cite the ids of the facts you actually used. If the facts "
    "do not support an answer, say so plainly and cite none. Give a confidence between 0 and 1.\n\n"
)

ANSWER_TOOL = {
    "name": "submit_answer",
    "description": "Submit the grounded answer with the facts it relies on.",
    "input_schema": {
        "type": "object",
        "properties": {
            "answer": {"type": "string"},
            "cited_fact_ids": {"type": "array", "items": {"type": "integer"}},
            "confidence": {"type": "number"},
        },
        "required": ["answer", "cited_fact_ids", "confidence"],
    },
}


def retrieve_facts(query_text, k=8):
    embedding = embed_text(query_text)
    return list(
        Fact.objects.filter(embedding__isnull=False).order_by(
            CosineDistance("embedding", embedding)
        )[:k]
    )


def generate_answer(requirement_text, facts):
    facts_block = "\n".join(f"[{fact.id}] {fact.statement}" for fact in facts) or "(no facts)"
    message = anthropic_client().messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=1024,
        tools=[ANSWER_TOOL],
        tool_choice={"type": "tool", "name": "submit_answer"},
        messages=[
            {
                "role": "user",
                "content": f"{PROMPT}Question: {requirement_text}\n\nFacts:\n{facts_block}",
            }
        ],
    )
    for block in message.content:
        if block.type == "tool_use" and block.name == "submit_answer":
            return block.input
    return {"answer": "", "cited_fact_ids": [], "confidence": 0.0}


def _ensure_embedding(requirement):
    if requirement.embedding is None:
        requirement.embedding = embed_text(requirement.text)
        requirement.save(update_fields=["embedding"])


def answer_requirement(requirement, k=8, reuse=True):
    _ensure_embedding(requirement)
    if reuse:
        source = find_reusable_answer(requirement)
        if source is not None:
            return reuse_answer(requirement, source)

    facts = retrieve_facts(requirement.text, k)
    result = generate_answer(requirement.text, facts)
    answer = Answer.objects.create(
        requirement=requirement,
        text=result["answer"],
        confidence=result.get("confidence"),
    )
    cited_ids = set(result.get("cited_fact_ids", []))
    AnswerCitation.objects.bulk_create(
        [AnswerCitation(answer=answer, fact=fact) for fact in facts if fact.id in cited_ids]
    )
    return answer
