import mammoth
from markdownify import markdownify


def parse_docx(file):
    html = mammoth.convert_to_html(file).value
    return markdownify(html, heading_style="ATX", bullets="-")
