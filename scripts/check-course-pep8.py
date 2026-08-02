"""Run pycodestyle against each Python code cell in course notebooks.

Cells are checked independently because imports and helper definitions in a
notebook are intentionally distributed across cells.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    from pycodestyle import StyleGuide
except ImportError:
    print("pycodestyle 未安装，请先运行: python -m pip install -r requirements-dev.txt", file=sys.stderr)
    raise SystemExit(2)

ROOT = Path(__file__).resolve().parents[1]
NOTEBOOKS = ROOT / "public" / "course"
TEMP = ROOT / ".pep8-course-cells"


def main() -> int:
    TEMP.mkdir(exist_ok=True)
    paths: list[str] = []
    cell_count = 0
    try:
        for notebook_path in sorted(NOTEBOOKS.glob("course-chapter-*.ipynb")):
            notebook = json.loads(notebook_path.read_text(encoding="utf-8"))
            for cell_index, cell in enumerate(notebook.get("cells", [])):
                if cell.get("cell_type") != "code":
                    continue
                source = "".join(cell.get("source", []))
                if not source.strip():
                    continue
                output_path = TEMP / f"{notebook_path.stem}-cell-{cell_index + 1}.py"
                output_path.write_text(source.rstrip() + "\n", encoding="utf-8")
                paths.append(str(output_path))
                cell_count += 1

        guide = StyleGuide(max_line_length=79, quiet=False)
        report = guide.check_files(paths)
        print(f"检查 {cell_count} 个代码单元格，发现 {report.total_errors} 个 PEP 8 问题")
        return 1 if report.total_errors else 0
    finally:
        for path in TEMP.glob("*.py"):
            try:
                path.unlink()
            except FileNotFoundError:
                pass
        try:
            TEMP.rmdir()
        except OSError:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
