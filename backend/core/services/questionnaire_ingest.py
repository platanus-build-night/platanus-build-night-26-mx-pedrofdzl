import csv
import io

from openpyxl import load_workbook

from core.models import Requirement


def normalized_key(text):
    return " ".join(text.lower().split())


def parse_rows(file_obj, filename):
    rows = _csv_rows(file_obj) if filename.lower().endswith(".csv") else _xlsx_rows(file_obj)
    return _extract_questions(rows)


def _csv_rows(file_obj):
    raw = file_obj.read()
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8")
    return [list(row) for row in csv.reader(io.StringIO(raw))]


def _xlsx_rows(file_obj):
    sheet = load_workbook(file_obj, read_only=True, data_only=True).active
    return [list(row) for row in sheet.iter_rows(values_only=True)]


def _column(header, *keywords):
    for index, name in enumerate(header):
        if any(word in name for word in keywords):
            return index
    return None


def _extract_questions(rows):
    if not rows:
        return []
    header = [str(cell or "").strip().lower() for cell in rows[0]]
    question_idx = _column(header, "question", "requirement")
    if question_idx is None:
        question_idx, category_idx, data = 0, None, rows
    else:
        category_idx = _column(header, "category", "section", "domain")
        data = rows[1:]

    questions = []
    for row in data:
        if question_idx >= len(row):
            continue
        text = str(row[question_idx] or "").strip()
        if not text:
            continue
        category = ""
        if category_idx is not None and category_idx < len(row):
            category = str(row[category_idx] or "").strip()
        questions.append({"text": text, "category": category})
    return questions


def ingest_questionnaire(questionnaire, file_obj=None, filename=None):
    file_obj = file_obj if file_obj is not None else questionnaire.raw_file
    filename = filename or getattr(file_obj, "name", "")
    if hasattr(file_obj, "open"):
        file_obj.open("rb")
    requirements = [
        Requirement(
            questionnaire=questionnaire,
            text=item["text"],
            category=item["category"],
            normalized_key=normalized_key(item["text"]),
        )
        for item in parse_rows(file_obj, filename)
    ]
    Requirement.objects.bulk_create(requirements)
    return {"requirements": len(requirements)}
