import sys
import pymupdf

sys.stdout.reconfigure(encoding="utf-8")
pdf_path, out = sys.argv[1], sys.argv[2]

doc = pymupdf.open(pdf_path)
with open(out, "w", encoding="utf-8") as text:
    for i, page in enumerate(doc):
        text.write(f"--- page {i + 1}\n")
        text.write(page.get_text())
print("pages:", doc.page_count)
