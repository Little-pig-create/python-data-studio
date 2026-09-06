"""删除课程发布副本中的重复泛化教学模块，保留主线示例和练习。"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = "2026-08-05-prune-v1"
APP_ROOT = ROOT / "public" / "course"

REDUNDANT_HEADINGS = {
    "## 本章教学增强提示",
    "## 运行规则",
    "## 做完要留下什么",
    "## 本章要会",
}


def cell_text(cell: dict) -> str:
    source = cell.get("source", "")
    return "".join(source) if isinstance(source, list) else str(source or "")


def first_heading(cell: dict) -> str:
    if cell.get("cell_type") != "markdown":
        return ""
    for line in cell_text(cell).strip().splitlines():
        if line.startswith("#"):
            return line.strip()
    return ""


def remove_method_block(cells: list[dict]) -> tuple[list[dict], bool]:
    start = None
    for index, cell in enumerate(cells):
        heading = first_heading(cell)
        if heading.startswith("## 本章方法与"):
            start = index
            break
    if start is None:
        return cells, False

    end = None
    for index in range(start + 1, len(cells)):
        heading = first_heading(cells[index])
        if not heading.startswith("## ") or heading.startswith("### "):
            continue
        if heading == "## 方法学习检查":
            continue
        end = index
        break
    if end is None:
        return cells, False
    return cells[:start] + cells[end:], True


def prune_notebook(path: Path) -> bool:
    notebook = json.loads(path.read_text(encoding="utf-8"))
    metadata = notebook.setdefault("metadata", {})
    cells, method_changed = remove_method_block(notebook.get("cells", []))
    if method_changed:
        notebook["cells"] = cells

    before = len(notebook.get("cells", []))
    filtered = [cell for cell in notebook.get("cells", []) if first_heading(cell) not in REDUNDANT_HEADINGS]
    simple_changed = len(filtered) != before
    if simple_changed:
        notebook["cells"] = filtered

    changed = method_changed or simple_changed
    if metadata.get("notebook_cleanup_version") != VERSION:
        metadata["notebook_cleanup_version"] = VERSION
        changed = True

    if changed:
        path.write_text(json.dumps(notebook, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return changed


def main() -> int:
    files = sorted(APP_ROOT.rglob("*.ipynb"))
    changed = sum(prune_notebook(path) for path in files)
    print(f"pruned app notebooks: {len(files)} files, changed: {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
