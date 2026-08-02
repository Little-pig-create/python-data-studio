"""Format Python code cells in all course notebooks with autopep8.

Only code-cell source is changed; outputs, execution counts, metadata, and
markdown cells are preserved.
"""

from __future__ import annotations

import json
from pathlib import Path

import autopep8
from black import FileMode, format_file_contents
from black.parsing import InvalidInput
from black.report import NothingChanged

ROOT = Path(__file__).resolve().parents[1]
NOTEBOOKS = ROOT / "public" / "course"


def format_source(source: str) -> str:
    formatted = autopep8.fix_code(
        source,
        options={
            "aggressive": 2,
            "max_line_length": 79,
        },
    )
    # Black provides deterministic wrapping for valid cells. Incomplete TODO
    # exercise cells are intentionally retained and handled by autopep8 only.
    try:
        formatted = format_file_contents(
            formatted,
            fast=True,
            mode=FileMode(line_length=79),
        )
    except (InvalidInput, NothingChanged, ValueError):
        pass
    # Notebook cells should not accumulate trailing blank lines.
    return formatted.rstrip() + "\n" if formatted.strip() else ""


def main() -> int:
    changed = 0
    cells_changed = 0
    for path in sorted(NOTEBOOKS.glob("course-chapter-*.ipynb")):
        notebook = json.loads(path.read_text(encoding="utf-8"))
        dirty = False
        for cell in notebook.get("cells", []):
            if cell.get("cell_type") != "code":
                continue
            source = "".join(cell.get("source", []))
            formatted = format_source(source)
            if formatted != source:
                cell["source"] = formatted.splitlines(keepends=True)
                dirty = True
                cells_changed += 1
        if dirty:
            path.write_text(json.dumps(notebook, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            changed += 1
    print(f"Formatted {cells_changed} code cells in {changed} course notebooks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
