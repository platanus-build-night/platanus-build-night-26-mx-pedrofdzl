from django.conf import settings

from core.services.llm import anthropic_client

MAX_PREVIEW_ROWS = 20

LAYOUT_TOOL = {
    "name": "map_layout",
    "description": "Map the columns of a vendor security questionnaire so it can be ingested.",
    "input_schema": {
        "type": "object",
        "properties": {
            "header_row": {
                "type": "integer",
                "description": "0-based index of the row holding column headers, -1 if no header.",
            },
            "question_column": {
                "type": "integer",
                "description": "0-based index of the column holding the question text.",
            },
            "category_column": {
                "type": ["integer", "null"],
                "description": "0-based index of a section/category column, or null if none.",
            },
            "answer_column": {
                "type": ["integer", "null"],
                "description": (
                    "0-based index of an existing column meant for the vendor's response, "
                    "or null if none exists and a new column should be appended."
                ),
            },
        },
        "required": ["header_row", "question_column", "category_column", "answer_column"],
    },
}

PROMPT = (
    "You are mapping the layout of a vendor security questionnaire so a system can ingest its "
    "questions and later write answers back into the same file. Below are the first rows, each "
    "cell labeled with its 0-based column index in [brackets].\n\n"
    "Identify the header row, the question/requirement column, an optional category/section "
    "column, and the column where the vendor's response belongs. If no response column exists, "
    "return null for answer_column so a new one can be appended.\n\n"
)

DEFAULT_LAYOUT = {
    "header_row": -1,
    "question_column": 0,
    "category_column": None,
    "answer_column": None,
}


def _preview(rows):
    lines = []
    for r, row in enumerate(rows[:MAX_PREVIEW_ROWS]):
        cells = []
        for c, value in enumerate(row):
            text = "" if value is None else str(value).strip()
            cells.append(f'[{c}] "{text}"')
        lines.append(f"Row {r}: " + " | ".join(cells))
    return "\n".join(lines)


def _normalize(data):
    return {
        "header_row": data.get("header_row", -1),
        "question_column": data.get("question_column", 0),
        "category_column": data.get("category_column"),
        "answer_column": data.get("answer_column"),
    }


def map_layout(rows):
    if not rows:
        return dict(DEFAULT_LAYOUT)
    message = anthropic_client().messages.create(
        model=getattr(settings, "ANTHROPIC_LIGHT_MODEL", settings.ANTHROPIC_MODEL),
        max_tokens=512,
        tools=[LAYOUT_TOOL],
        tool_choice={"type": "tool", "name": "map_layout"},
        messages=[{"role": "user", "content": f"{PROMPT}{_preview(rows)}"}],
    )
    for block in message.content:
        if block.type == "tool_use" and block.name == "map_layout":
            return _normalize(block.input)
    return dict(DEFAULT_LAYOUT)
