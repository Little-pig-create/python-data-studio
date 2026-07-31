import json
import os
import sys
import traceback
from pathlib import Path

os.environ.setdefault("MPLBACKEND", "Agg")

ROOT = Path(__file__).resolve().parents[1]
COURSE_DIR = ROOT / "public" / "course"
DATASET_ORIGIN = (ROOT / "public" / "datasets").as_posix()


def display(*values):
    for value in values:
        print(value)


def browser_compatible_source(source):
    source = source.replace(
        "from js import window",
        "class _Location:\n"
        f"    origin = {DATASET_ORIGIN!r}\n"
        "class _Window:\n"
        "    location = _Location()\n"
        "window = _Window()",
    )
    return source.replace("/datasets/", "/")


def validate_chapter(chapter):
    notebook_path = COURSE_DIR / f"course-chapter-{chapter}.ipynb"
    notebook = json.loads(notebook_path.read_text(encoding="utf-8"))
    namespace = {"__name__": "__main__", "display": display}

    for index, cell in enumerate(notebook["cells"], start=1):
        if cell.get("cell_type") != "code":
            continue
        source = cell.get("source", "")
        if isinstance(source, list):
            source = "".join(source)
        source = browser_compatible_source(source)
        try:
            exec(compile(source, f"{notebook_path.name}:cell-{index}", "exec"), namespace)
        except Exception:
            print(f"FAILED chapter {chapter}, cell {index}", file=sys.stderr)
            traceback.print_exc()
            return False

    print(f"PASSED chapter {chapter}: {len(notebook['cells'])} cells")
    return True


if __name__ == "__main__":
    chapters = [int(value) for value in sys.argv[1:]] or [105, 106, 107, 108]
    if not all(validate_chapter(chapter) for chapter in chapters):
        raise SystemExit(1)
