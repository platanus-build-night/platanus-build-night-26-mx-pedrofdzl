import json

from django.conf import settings

from core.models import Answer, Requirement
from core.services.auditor import audit_answer
from core.services.llm import anthropic_client
from core.services.responder import answer_requirement, retrieve_facts

SYSTEM = (
    "You are Ditto's compliance copilot. You help the user understand and manage their security "
    "posture for bank questionnaires. Ground every claim in the company's verified facts using "
    "search_facts; never invent facts. Use answer_requirement and audit_answer when the user asks "
    "to answer or check a questionnaire item. Be concise and cite the facts you rely on."
)

TOOLS = [
    {
        "name": "search_facts",
        "description": "Semantic search over the company's verified security facts.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "k": {"type": "integer"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "answer_requirement",
        "description": "Answer a questionnaire requirement, grounded in facts.",
        "input_schema": {
            "type": "object",
            "properties": {"requirement_id": {"type": "integer"}},
            "required": ["requirement_id"],
        },
    },
    {
        "name": "audit_answer",
        "description": "Audit an answer for unbacked claims and contradictions.",
        "input_schema": {
            "type": "object",
            "properties": {"answer_id": {"type": "integer"}},
            "required": ["answer_id"],
        },
    },
]


def run_tool(name, tool_input):
    if name == "search_facts":
        facts = retrieve_facts(tool_input["query"], tool_input.get("k", 8))
        return {
            "facts": [{"id": f.id, "statement": f.statement, "category": f.category} for f in facts]
        }
    if name == "answer_requirement":
        answer = answer_requirement(Requirement.objects.get(id=tool_input["requirement_id"]))
        return {
            "answer_id": answer.id,
            "text": answer.text,
            "confidence": answer.confidence,
            "cited_fact_ids": [c.fact_id for c in answer.citations.all()],
        }
    if name == "audit_answer":
        issues = audit_answer(Answer.objects.get(id=tool_input["answer_id"]))
        return {
            "issues": [{"id": i.id, "type": i.type, "description": i.description} for i in issues]
        }
    return {"error": f"unknown tool: {name}"}


def _sse(event_type, **data):
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"


def stream_chat(messages):
    convo = [{"role": m["role"], "content": m["content"]} for m in messages]
    client = anthropic_client()
    while True:
        with client.messages.stream(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=2048,
            system=SYSTEM,
            tools=TOOLS,
            messages=convo,
        ) as stream:
            for event in stream:
                if event.type == "content_block_delta" and event.delta.type == "text_delta":
                    yield _sse("text", text=event.delta.text)
            final = stream.get_final_message()

        convo.append({"role": "assistant", "content": final.content})
        tool_uses = [block for block in final.content if block.type == "tool_use"]
        if not tool_uses:
            yield _sse("done")
            return

        results = []
        for tool_use in tool_uses:
            yield _sse("tool", name=tool_use.name, input=tool_use.input)
            output = run_tool(tool_use.name, tool_use.input)
            results.append(
                {"type": "tool_result", "tool_use_id": tool_use.id, "content": json.dumps(output)}
            )
        convo.append({"role": "user", "content": results})
