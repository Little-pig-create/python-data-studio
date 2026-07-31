"""Run pycodestyle against Python code cells in course notebooks."""

from __future__ import annotations

import json
import sys
from pathlib import Path


try:
    from pycodestyle import StyleGuide
except ImportError:
    print("pycodestyle 未安装，请先运行: python -m pip install pycodestyle", file=sys.stderr)
    raise SystemExit(2)


ROOT = Path(__file__).resolve().parents[1]
NOTEBOOKS = ROOT / "public" / "course"
TEMP = ROOT / ".pep8-course-cells"


def main() -> int:
    TEMP.mkdir(exist_ok=True)
    paths = []
    try:
        for notebook_path in sorted(NOTEBOOKS.glob("*.ipynb")):
            notebook = json.loads(notebook_path.read_text(encoding="utf-8"))
            code = []
            for cell in notebook.get("cells", []):
                if cell.get("cell_type") == "code":
                    code.extend(cell.get("source", []))
                    code.append("\n\n")
            if not code:
                continue
            output_path = TEMP / f"{notebook_path.stem}.py"
            output_path.write_text("".join(code), encoding="utf-8")
            paths.append(str(output_path))

        guide = StyleGuide(max_line_length=79, quiet=False)
        report = guide.check_files(paths)
        print(f"检查 {len(paths)} 个 Notebook，发现 {report.total_errors} 个 PEP 8 问题")
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
