from django.conf import settings
from django.utils import timezone

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


FINDING_TYPE_MAP = {
    "unbacked": Issue.Type.UNBACKED_CLAIM,
    "contradiction": Issue.Type.CONTRADICTION,
}

TYPE_TITLES = {
    Issue.Type.UNBACKED_CLAIM: "Unbacked claim",
    Issue.Type.CONTRADICTION: "Contradiction with facts",
}


def _due_date_for(requirement):
    questionnaire = getattr(requirement, "questionnaire", None)
    return getattr(questionnaire, "due_date", None)


def audit_answer(answer):
    requirement = answer.requirement
    due_date = _due_date_for(requirement)
    facts = [citation.fact for citation in answer.citations.select_related("fact")]
    answer.audited_at = timezone.now()
    answer.save(update_fields=["audited_at", "updated_at"])
    if not facts:
        return [
            Issue.objects.create(
                type=Issue.Type.UNBACKED_CLAIM,
                requirement=requirement,
                title="Answer cites no supporting facts",
                description="Answer cites no supporting facts.",
                due_date=due_date,
            )
        ]
    issues = []
    for finding in review_answer(answer.text, facts):
        issue_type = FINDING_TYPE_MAP.get(finding["type"], Issue.Type.CONTRADICTION)
        issues.append(
            Issue.objects.create(
                type=issue_type,
                requirement=requirement,
                title=TYPE_TITLES.get(issue_type, ""),
                description=finding["description"],
                due_date=due_date,
            )
        )
    return issues
