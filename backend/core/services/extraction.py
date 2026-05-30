from django.conf import settings

from core.services.llm import anthropic_client

PROMPT = (
    "Extract atomic, verifiable security and compliance facts from the vendor documentation "
    "below. Each fact is a single self-contained claim about the company's security posture "
    "(controls, policies, certifications, configurations). Ignore marketing language. Record "
    "only what the text actually supports.\n\nDocument:\n"
)

FACT_TOOL = {
    "name": "record_facts",
    "description": "Record the security and compliance facts found in the text.",
    "input_schema": {
        "type": "object",
        "properties": {
            "facts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "statement": {"type": "string"},
                        "category": {"type": "string"},
                    },
                    "required": ["statement"],
                },
            }
        },
        "required": ["facts"],
    },
}


def extract_facts(text):
    message = anthropic_client().messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=2048,
        tools=[FACT_TOOL],
        tool_choice={"type": "tool", "name": "record_facts"},
        messages=[{"role": "user", "content": PROMPT + text}],
    )
    for block in message.content:
        if block.type == "tool_use" and block.name == "record_facts":
            return block.input["facts"]
    return []
