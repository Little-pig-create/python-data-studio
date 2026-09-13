"""Restructure course chapters 28-111 into the beginner-friendly format.

Reads the existing app copy (public/course), drops boilerplate markdown,
reframes example headings, moves all solution cells into a chapter-end
"参考答案" section, and writes the result to both notebooks/course/ and
public/course/. normalize-notebook-architecture.py then assigns ids.

Transformations
---------------
1. H1 "# 34. 折线图（plot）"      -> "# 第34章 折线图（plot）"
2. Dropped headings (whole md cell):
   - "### 数学推导..." (broken LaTeX, noise for beginners)
   - "## 建模流程提醒" (identical across all ML chapters)
   - summary filler subsections: 验收标准 / 完成检查 / 排错顺序 / 下一步推荐
3. Heading prefixes stripped: "## 34.6 基础图表" -> "## 基础图表"
4. Example reframing: "示例 1：X" -> "例 1｜X"; viz "基础图表" ->
   "例 1｜最小可用图表", "进阶变体" -> "例 2｜进阶变体"
5. Cells tagged "solution" move to a chapter-end "## 参考答案" section,
   each titled with its matching 练一练 prompt.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "notebooks" / "course"
APP_DIR = ROOT / "public" / "course"
REWRITE_VERSION = "2026-09-13-course-restructure-v1"

DROP_EXACT = {"建模流程提醒"}
DROP_TAIL_RE = re.compile(r"(验收标准|完成检查|排错顺序|下一步推荐)$")
STRIPT_PREFIX_RE = re.compile(r"^\d+(?:\.\d+)*\s+")
EXAMPLE_RE = re.compile(r"^示例 (\d+)：\s*(.*)$")
H1_RE = re.compile(r"^# (\d+)\.\s*(.+)$")


def source_text(cell: dict) -> str:
    src = cell.get("source", "")
    return "".join(src) if isinstance(src, list) else src


def transform_heading(source: str) -> str:
    lines = source.split("\n")
    first = lines[0].rstrip()
    if first.startswith("# ") and not first.startswith("## "):
        m = H1_RE.match(first)
        if m:
            lines[0] = f"# 第{m.group(1)}章 {m.group(2)}"
            return "\n".join(lines)
    m = re.match(r"^(#{1,3}) (.*)$", first)
    if m:
        body = m.group(2).strip()
        if body in DROP_EXACT or DROP_TAIL_RE.search(body):
            return ""
        body = STRIPT_PREFIX_RE.sub("", body)
        ex = EXAMPLE_RE.match(body)
        if ex:
            body = f"例 {ex.group(1)}｜{ex.group(2)}"
        elif body == "基础图表":
            body = "例 1｜最小可用图表"
        elif body == "进阶变体":
            body = "例 2｜进阶变体"
        lines[0] = f"{m.group(1)} {body}"
    return "\n".join(lines)


def is_dropped_md(source: str) -> bool:
    if "math-foundation" in source:
        return True
    first = source.split("\n", 1)[0].rstrip()
    m = re.match(r"^(#{1,3}) (.*)$", first)
    if m:
        body = STRIPT_PREFIX_RE.sub("", m.group(2).strip())
        if body in DROP_EXACT or DROP_TAIL_RE.search(body):
            return True
    return False


# Answers are relocated to the chapter end; a few of them depend on the
# main dataset variables that later in-chapter demos overwrite. These
# per-chapter context patches re-pin the needed variables inside the
# affected cells.
SNIPPET_PATCHES: dict[int, list[tuple[str, str]]] = {
    99: [
        (
            "X_train2, X_test2, y_train2, y_test2 = train_test_split(",
            "from sklearn.datasets import load_breast_cancer\n"
            "\n"
            "# 恢复主数据集（前面的错误演示临时覆盖了 X、y）\n"
            "data = load_breast_cancer(as_frame=True)\n"
            "X, y = data.data, data.target\n"
            "X_train2, X_test2, y_train2, y_test2 = train_test_split(",
        ),
    ],
    103: [
        (
            "my_folds = my_folds_value  # ← 请把 my_folds_value 替换成具体整数",
            "my_folds = 4  # ← 请替换成自己的折数（如 3、5、10）",
        ),
        (
            "# 参考实现：把折数改成 4，再与示例中的 3、5、10 对比",
            "from sklearn.datasets import load_breast_cancer\n"
            "from sklearn.pipeline import make_pipeline\n"
            "from sklearn.preprocessing import StandardScaler\n"
            "from sklearn.linear_model import LogisticRegression\n"
            "\n"
            "# 恢复示例 1 的数据与模型（后面的错误演示临时覆盖了它们）\n"
            "data = load_breast_cancer(as_frame=True)\n"
            "X, y = data.data, data.target\n"
            "model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))\n"
            "\n"
            "# 参考实现：把折数改成 4，再与示例中的 3、5、10 对比",
        ),
    ],
    105: [
        (
            'def roc_auc_mean(model, data, target):',
            "from sklearn.datasets import load_breast_cancer\n"
            "from sklearn.model_selection import StratifiedKFold\n"
            "\n"
            "# 恢复主数据集与交叉验证器（后面的错误演示临时覆盖了 X、y）\n"
            "data = load_breast_cancer(as_frame=True)\n"
            "X, y = data.data, data.target\n"
            "cv = StratifiedKFold(5, shuffle=True, random_state=102)\n"
            "\n"
            "\n"
            "def roc_auc_mean(model, data, target):",
        ),
    ],
    111: [
        (
            'n_unknown_job = (raw["job"] == "unknown").sum()',
            "import pandas as pd\n"
            "\n"
            "# 恢复主数据集（前面的清洗演示临时覆盖了 raw）\n"
            "raw = pd.read_csv(\"/datasets/bank_marketing_full.csv\", sep=\";\")\n"
            "n_unknown_job = (raw[\"job\"] == \"unknown\").sum()",
        ),
    ],
}


def apply_snippet_patches(chapter: int, source: str) -> str:
    for old, new in SNIPPET_PATCHES.get(chapter, []):
        if old in source:
            source = source.replace(old, new)
    return source


BROKEN_FSTRING_RE = re.compile(r"\{\s*\n\s*(len\(\w+\)):\s*,?\s*\}")


def fix_multiline_fstring(source: str) -> str:
    """Collapse f-strings whose braces span lines (needs Python 3.12+)."""
    return BROKEN_FSTRING_RE.sub(r"{\1:,}", source)


def split_source_lines(source: str) -> list[str]:
    normalized = f"{source.strip()}\n"
    return [line + "\n" for line in normalized.splitlines()]


def comment_blank_lines(source: str) -> str:
    """Comment out ____ fill-in lines so scaffolds run top-down."""
    out = []
    for line in source.split("\n"):
        if "____" in line and not line.lstrip().startswith("#"):
            out.append(f"# {line.strip()}   # ← 补全后取消注释")
        else:
            out.append(line)
    return "\n".join(out)


def wrap_exercise_scaffold(source: str) -> str:
    """Guard exercise scaffolds so an unfilled blank never breaks the run."""
    body = "\n".join(
        (f"    {line}" if line.strip() else line)
        for line in source.split("\n")
    )
    if not any(
        line.strip() and not line.lstrip().startswith("#")
        for line in body.split("\n")
    ):
        body = "    pass\n" + body
    return (
        "try:\n"
        f"{body}\n"
        "except Exception as _pds_err:\n"
        "    print(\"（练习尚未完成或未填全：\", _pds_err, \"）\")"
    )


TOP_ASSIGN_RE = re.compile(r"^([A-Za-z_]\w*)\s*=(?!=)", re.M)


def rename_demo_variables(source: str, names: set[str]) -> str:
    """Rename top-level assignments and reads of ``names`` to ``_demo_*``.

    Only top-level assignments count as definitions; attribute accesses
    (`data.data`) and keyword arguments (`data=`) are left alone.
    """
    for name in sorted(names):
        source = re.sub(rf"^{name}\s*=", f"_demo_{name} =", source, flags=re.M)
        source = re.sub(rf"(?<![\w.]){name}\b(?!\s*=)", f"_demo_{name}", source)
    return source


def demo_rename_map(
    items: list[tuple[str, dict, str, set]], protected: set[str]
) -> dict[int, set[str]]:
    """Decide which demo cells share a rename, keyed by item index.

    Illustration cells are grouped when only markdown separates them, and a
    group is renamed as a unit. Renaming cell by cell is not enough: a demo
    that rebinds ``X`` and a following what-if cell that *reads* ``X`` are one
    demonstration, and protecting only the definition leaves the reader cell
    pointing at the chapter's own variable — which is how the what-if cells
    ended up predicting with the wrong model for months/sales-style demos.
    """
    renames: dict[int, set[str]] = {}
    group: list[int] = []
    sources: list[str] = []

    def flush() -> None:
        if not group:
            return
        assigned: set[str] = set()
        for source in sources:
            assigned.update(m.group(1) for m in TOP_ASSIGN_RE.finditer(source))
        names = assigned & protected
        if names:
            for index in group:
                renames[index] = names
        group.clear()
        sources.clear()

    for index, (kind, _cell, source, tags) in enumerate(items):
        if kind == "md":
            continue  # a heading between two demos does not end the demo
        if {"experiment", "error-recovery"} & set(tags):
            group.append(index)
            sources.append(source)
        else:
            flush()
    flush()
    return renames


def snapshot_cell(index: int) -> dict:
    return {
        "cell_type": "code",
        "metadata": {},
        "execution_count": None,
        "outputs": [],
        "source": split_source_lines(
            f"# （自动维护）练习上下文快照 {index}：参考答案将基于此刻的变量运行\n"
            f"_pds_snap_{index} = dict(globals())"
        ),
    }


def restore_cell(index: int) -> dict:
    return {
        "cell_type": "code",
        "metadata": {},
        "execution_count": None,
        "outputs": [],
        "source": split_source_lines(
            f"# 恢复练习 {index} 时的变量上下文（后面的示例覆盖过这些名字）\n"
            f"globals().update(_pds_snap_{index})"
        ),
    }


def transform_notebook(notebook: dict, chapter: int) -> dict:
    cells = notebook["cells"]

    # ---- pass 1: classify cells ----
    items: list[tuple[str, dict, str, set]] = []
    prompt = "本章练习"
    protected: set[str] = set()
    for cell in cells:
        source = source_text(cell)
        if cell["cell_type"] == "markdown":
            if is_dropped_md(source):
                continue
            transformed = transform_heading(source)
            if not transformed.strip():
                continue
            items.append(("md", cell, transformed, set()))
            first_line = transformed.split("\n", 1)[0]
            if "练一练" in first_line:
                prompt = first_line.lstrip("#").strip().replace("*", "").strip()
            continue
        tags = set(cell.get("metadata", {}).get("tags", []) or [])
        if "solution" in tags:
            items.append(("solution", cell, source, tags))
            prompt = "本章练习"
        elif "exercise" in tags:
            items.append(("exercise", cell, source, tags))
        else:
            if not {"experiment", "error-recovery"} & tags:
                protected.update(m.group(1) for m in TOP_ASSIGN_RE.finditer(source))
            items.append(("other", cell, source, tags))

    # ---- pass 2: assemble with snapshots & relocated answers ----
    kept: list[dict] = []
    solutions: list[tuple[str, int, dict]] = []  # (prompt, snap_id, cell)
    prompt = "本章练习"
    snap_count = 0
    open_snap_id: int | None = None  # snapshot for the current open group
    demo_renames = demo_rename_map(items, protected)

    for index, (kind, cell, source, tags) in enumerate(items):
        if kind == "md":
            if "练一练" in source.split("\n", 1)[0]:
                snap_count += 1
                open_snap_id = snap_count
                kept.append(snapshot_cell(snap_count))
            kept.append({**cell, "source": split_source_lines(
                transform_heading(source))})
        elif kind == "exercise":
            if open_snap_id is None:
                snap_count += 1
                open_snap_id = snap_count
                kept.append(snapshot_cell(snap_count))
            fixed_src = wrap_exercise_scaffold(fix_multiline_fstring(
                comment_blank_lines(apply_snippet_patches(chapter, source))))
            kept.append({**cell, "source": split_source_lines(fixed_src)})
        elif kind == "solution":
            fixed = {**cell, "metadata": {"tags": ["solution"]}}
            fixed["source"] = split_source_lines(
                fix_multiline_fstring(apply_snippet_patches(chapter, source)))
            solutions.append((prompt, open_snap_id or 0, fixed))
            open_snap_id = None
            prompt = "本章练习"
        elif {"experiment", "error-recovery"} & set(tags):
            kept.append({**cell, "source": split_source_lines(
                fix_multiline_fstring(
                    rename_demo_variables(source, demo_renames.get(index, set()))))})
        else:
            kept.append({**cell, "source": split_source_lines(
                fix_multiline_fstring(source))})

    if solutions:
        kept.append(
            {
                "cell_type": "markdown",
                "metadata": {},
                "source": split_source_lines("## 参考答案"),
            }
        )
        for title, snap_id, cell in solutions:
            kept.append(
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": split_source_lines(f"### {title}"),
                }
            )
            if snap_id:
                kept.append(restore_cell(snap_id))
            kept.append(cell)

    notebook["cells"] = kept
    metadata = dict(notebook.get("metadata") or {})
    metadata["rewrite_version"] = REWRITE_VERSION
    notebook["metadata"] = metadata
    return notebook


def main(argv: list[str]) -> int:
    start, end = 28, 111
    if len(argv) == 3:
        start, end = int(argv[1]), int(argv[2])
    for number in range(start, end + 1):
        path = APP_DIR / f"course-chapter-{number}.ipynb"
        if not path.exists():
            print(f"skip {path.name} (missing)")
            continue
        notebook = json.loads(path.read_text(encoding="utf-8"))
        if notebook.get("metadata", {}).get("rewrite_version") == REWRITE_VERSION:
            print(f"skip {path.name} (already transformed)")
            continue
        transformed = transform_notebook(notebook, number)
        payload = json.dumps(transformed, ensure_ascii=False, indent=2) + "\n"
        path.write_text(payload, encoding="utf-8")
        (SOURCE_DIR / path.name).write_text(payload, encoding="utf-8")
        print(f"transformed {path.name} ({len(transformed['cells'])} cells)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
