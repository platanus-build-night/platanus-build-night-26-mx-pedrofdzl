import mammoth


def parse_docx(file):
    return mammoth.convert_to_markdown(file).value
