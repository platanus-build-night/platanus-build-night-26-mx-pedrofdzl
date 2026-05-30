from django.conf import settings

from core.models import Issue
from core.services.llm import anthropic_client

PROMPT = (
    "You are a skeptical bank security reviewer auditing a questionnaire answer. You are given the "
    "answer and the facts it cites. Flag (1) claims in the answer not supported by the facts, and "
    "(2) statements that contradict the facts. Be adversarial and default to flagging unsupported "
    "claims. If the answer is fully and faithfully supported, return no findings.\n\n"
)

AUDIT_TOOL = {
    "name": "report_findings",
    "description": "Report problems with the answer relative to its supporting facts.",
    "input_schema": {
        "type": "object",
        "properties": {
            "findings": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string", "enum": ["unbacked", "contradiction"]},
                        "description": {"type": "string"},
                    },
                    "required": ["type", "description"],
                },
            }
        },
        "required": ["findings"],
    },
}


def review_answer(answer_text, facts):
    facts_block = "\n".join(f"- {fact.statement}" for fact in facts) or "(none)"
    message = anthropic_client().messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=1024,
        tools=[AUDIT_TOOL],
        tool_choice={"type": "tool", "name": "report_findings"},
        messages=[
            {"role": "user", "content": f"{PROMPT}Answer: {answer_text}\n\nFacts:\n{facts_block}"}
        ],
    )
    for block in message.content:
        if block.type == "tool_use" and block.name == "report_findings":
            return block.input["findings"]
    return []


def audit_answer(answer):
    facts = [citation.fact for citation in answer.citations.select_related("fact")]
    if not facts:
        return [
            Issue.objects.create(
                type=Issue.Type.UNBACKED,
                requirement=answer.requirement,
                description="Answer cites no supporting facts.",
            )
        ]
    issues = []
    for finding in review_answer(answer.text, facts):
        issue_type = (
            finding["type"] if finding["type"] in Issue.Type.values else Issue.Type.CONTRADICTION
        )
        issues.append(
            Issue.objects.create(
                type=issue_type,
                requirement=answer.requirement,
                description=finding["description"],
            )
        )
    return issues
