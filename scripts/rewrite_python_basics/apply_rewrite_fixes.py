"""Repair the defects the course rewrite carried into the notebooks.

The rewrite is faithful but inherited several pre-existing defects and gained a
few of its own. This script fixes them in both notebook trees
(``public/course`` and ``notebooks/course``). It is idempotent: a patch whose
replacement is already present is reported as ``already applied`` and skipped,
and a patch whose *old* text is absent (while the new text is also absent) is
reported as a failure.

Defects repaired
----------------
ch28-38  categorical crosstab returned all 38 countries instead of the top 4
ch31     ad_spend had 6 points while sales/months had 13 (and an earlier
         revision of this script inserted the widening comment unindented,
         breaking the scaffold's try block)
ch34     office/digital had 6 points while sales had 13
ch35     an exercise scaffold rebound the chapter's `labels` to 4 items
ch36     months was sliced to 6 while sales/orders/profit were not
ch38     an exercise scaffold rebound the chapter's months/sales
ch38     a hard-coded "利润在6月达到最高" title no longer matched the data
ch42     pointplot passed 3 markers/linestyles for 7 hue levels
ch79/82/95/97/98/103
         the what-if cell predicted with the chapter's `model` even though the
         preceding demo had fitted `_demo_model`
ch92     the what-if cell used the chapter's `X` although the demo had built
         `_demo_X`
ch108/111
         the cleaning cell read the chapter's `raw` although the demo had
         built `_demo_raw`
ch02-13  the hand-authored modules were written from ch01's skeleton and kept
         `## 1.x` section headings, so 第2章..第13章 all advertised "1.1", "1.2"
         ... (HEAD's `## 2.1` / `## 10.1` were correct). Both the notebooks and
         the source modules are corrected, so a later `build.py 2..13` cannot
         reintroduce it.
ch14-27  every hand-authored chapter declared `course.module = "python"`, so
         the numpy lessons (files 14-18) and pandas lessons (files 19-27) were
         filed under the python module and the numpy/pandas modules kept only
         an intro and a capstone. HEAD had numpy/pandas right; the teaching
         design's recovery routes still target them, so `check:teaching` failed.
         `build.py` now carries the module, and the metadata is repaired here.
ch24     the save/read-back loop verified itself with `assert`, which vanishes
         under `python -O` and which RELEASE_RUNBOOK §1.3 forbids as a teaching
         self-check (HEAD had none in this chapter). Replaced with an explicit
         `raise`, matching what ch13 itself teaches. The exercise prompt that
         told students to use `assert` is corrected too, and ch24.py is patched
         so regeneration cannot bring it back. ch13's own asserts stay: that
         chapter's subject *is* testing, and it already frames `assert` as
         development-time self-check.

Usage:
    python scripts/rewrite_python_basics/apply_rewrite_fixes.py [--dry-run]
"""

from __future__ import annotations

import argparse
import ast
import json
import re
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TREES = [ROOT / "public" / "course", ROOT / "notebooks" / "course"]
MODULES = ROOT / "scripts" / "rewrite_python_basics"

# ---------------------------------------------------------------- patch text

CROSSTAB_OLD = '        rows["Country"],\n        rows["flow"],'
CROSSTAB_NEW = '        rows["Country"].astype(str),\n        rows["flow"],'

AD_SPEND_13 = "[20, 15, 13, 18, 14, 20, 17, 18, 20, 26, 29, 37, 23]"
# Indentation-agnostic: the same literal appears at top level and inside a
# scaffold's `try:` block, so the comment is added by the dedicated cell patch.
AD_SPEND_OLD = "np.array([18, 22, 20, 27, 31, 35])"
AD_SPEND_NEW = f"np.array({AD_SPEND_13})"

ALIGN_COMMENT_OLD = "# 数据对齐：ad_spend 只给了前 6 个月，销售/订单/月份也取前 6 项，保证散点可用"
ALIGN_COMMENT_NEW = "# 数据对齐：四个序列一一对应同一个月，取共同长度保证散点可用"

CH34_OLD = (
    "office = np.array([38, 42, 40, 48, 55, 59])\n"
    "digital = np.array([52, 65, 60, 78, 92, 105])\n"
    "home = sales - office - digital"
)
CH34_NEW = (
    "# 品类构成：按销售额比例拆出办公 / 数码 / 家居三条月度序列（单位：万元）\n"
    "office = (sales * 0.35).round(1)\n"
    "digital = (sales * 0.45).round(1)\n"
    "home = (sales - office - digital).round(1)"
)

CH36_OLD = (
    "months = monthly_summary.index.to_numpy()[:6]  # 本章取前 6 个月\n"
    'sales = (monthly_summary["sales"] / 10_000).to_numpy()\n'
    'orders = monthly_summary["orders"].to_numpy()'
)
CH36_NEW = (
    "months = monthly_summary.index.to_numpy()[:6]  # 本章取前 6 个月\n"
    'sales = (monthly_summary["sales"] / 10_000).to_numpy()[:6]\n'
    'orders = monthly_summary["orders"].to_numpy()[:6]'
)

CH38_TITLE_OLD = 'ax.set(title="利润在6月达到最高", ylabel="利润（万元）")'
CH38_TITLE_NEW = 'ax.set(title=f"利润在{months[peak]}达到最高", ylabel="利润（万元）")'

CH42_OLD = (
    "    dodge=0.25,\n"
    '    markers=["o", "s", "^"],\n'
    '    linestyles=["-", "--", ":"],\n'
    "    ci=None,"
)
CH42_NEW = "    dodge=0.25,\n    ci=None,"

WHATIF_OLD = """X_changed = X.copy()
X_changed["visits"] = X_changed["visits"] + 1
changed_prediction = model.predict(X_changed)
print("原始前2个预测：", np.round(model.predict(X[:2]), 2))
print("访问次数+1后的预测：", np.round(changed_prediction[:2], 2))
print("预测变化：", np.round(changed_prediction[:2] - model.predict(X[:2]), 2))"""
WHATIF_NEW = """X_changed = X.copy()
X_changed["visits"] = X_changed["visits"] + 1
changed_prediction = _demo_model.predict(X_changed)
print("原始前2个预测：", np.round(_demo_model.predict(X[:2]), 2))
print("访问次数+1后的预测：", np.round(changed_prediction[:2], 2))
print("预测变化：", np.round(changed_prediction[:2] - _demo_model.predict(X[:2]), 2))"""

WHATIF_92_OLD = WHATIF_OLD
WHATIF_92_NEW = """X_changed = _demo_X.copy()
X_changed["visits"] = X_changed["visits"] + 1
changed_prediction = model.predict(X_changed)
print("原始前2个预测：", np.round(model.predict(_demo_X[:2]), 2))
print("访问次数+1后的预测：", np.round(changed_prediction[:2], 2))
print("预测变化：", np.round(changed_prediction[:2] - model.predict(_demo_X[:2]), 2))"""

CLEAN_OLD = 'clean = raw.drop_duplicates().copy()'
CLEAN_NEW = 'clean = _demo_raw.drop_duplicates().copy()'

# ch24's save/read-back loop checked itself with `assert`. `assert` disappears
# under `python -O`, and both RELEASE_RUNBOOK §1.3 and QA_CHECKLIST §1 forbid it
# as a teaching self-check. An explicit `raise` is what ch13 itself teaches
# ("assert 防自己犯蠢，raise 防数据出格"), so the two chapters now agree.
CH24_LEDGER_OLD = "assert back.shape == ledger.shape"
CH24_LEDGER_NEW = (
    "if back.shape != ledger.shape:\n"
    '    raise ValueError(f"读回校验失败：{back.shape} != {ledger.shape}")'
)

CH24_DF_OLD = "assert back.shape == df.shape"
CH24_DF_NEW = (
    "if back.shape != df.shape:\n"
    '    raise ValueError(f"读回校验失败：{back.shape} != {df.shape}")'
)

CH24_TODO_OLD = "# TODO 3：用 assert 验证行数一致，打印“闭环通过”"
CH24_TODO_NEW = "# TODO 3：用 if + raise 验证行数一致，打印“闭环通过”"

# (chapter, cell_index, old, new, expected_occurrences)
CELL_PATCHES: list[tuple[str, int, str, str, int]] = [
    # --- ch31: document the widened ad_spend series (top-level example) ---
    ("31", 11,
     f"ad_spend = np.array({AD_SPEND_13})",
     "# 广告投入（万元）：与 13 个月的销售额一一对应，便于观察同向变化\n"
     f"ad_spend = np.array({AD_SPEND_13})", 1),
    # --- ch31: repair the same patch inside the scaffold's `try:` block. An
    # earlier revision of this script inserted the comment unindented, which
    # broke the block ("SyntaxError: expected 'except' or 'finally' block").
    ("31", 31,
     f"    # 广告投入（万元）"
     f"：与 13 个月的销售额一一对应，便于观察同向变化\nad_spend = np.array({AD_SPEND_13})",
     "    # 广告投入（万元）：与 13 个月的销售额一一对应，便于观察同向变化\n"
     f"    ad_spend = np.array({AD_SPEND_13})", 1),
    # --- ch35: an exercise scaffold must not rebind the chapter's `labels` ---
    ("35", 11, '    labels = ["选项A", "选项B", "选项C", "选项D"]',
     '    pie_labels = ["选项A", "选项B", "选项C", "选项D"]', 1),
    ("35", 37,
     "scores = np.array([400, 300, 200, 100])\n"
     'labels = ["选项A", "选项B", "选项C", "选项D"]',
     "scores = np.array([400, 300, 200, 100])\n"
     'pie_labels = ["选项A", "选项B", "选项C", "选项D"]', 1),
    ("35", 37, "    labels=labels,", "    labels=pie_labels,", 1),
    # --- ch38: the scaffold and its answer use the chapter demo convention ---
    ("38", 14,
     '    months = ["1月", "2月", "3月", "4月", "5月", "6月"]\n    sales = [52, 61, 58, 66, 70, 78]',
     '    _demo_months = ["1月", "2月", "3月", "4月", "5月", "6月"]\n'
     "    _demo_sales = [52, 61, 58, 66, 70, 78]", 1),
    ("38", 39,
     'months = ["1月", "2月", "3月", "4月", "5月", "6月"]\n'
     "sales = [52, 61, 58, 66, 70, 78]",
     '_demo_months = ["1月", "2月", "3月", "4月", "5月", "6月"]\n'
     "_demo_sales = [52, 61, 58, 66, 70, 78]", 1),
    ("38", 39,
     '# 完整答案：_X_ = len(months) - 1，把高亮从末月（6月）改到首月（1月）\n'
     'colors = ["#1a73e8"] + ["#9aa0a6"] * (len(months) - 1)\n'
     "bars = ax.bar(months, sales, color=colors)",
     "# 完整答案：_X_ = len(_demo_months) - 1，把高亮从末月（6月）改到首月（1月）\n"
     'colors = ["#1a73e8"] + ["#9aa0a6"] * (len(_demo_months) - 1)\n'
     "bars = ax.bar(_demo_months, _demo_sales, color=colors)", 1),
    # --- ch38: the peak month is data-dependent, so let the title read it ---
    ("38", 16, CH38_TITLE_OLD, CH38_TITLE_NEW, 1),
    # --- ch42: 7 hue levels cannot use a 3-item marker/linestyle list ---
    ("42", 16, CH42_OLD, CH42_NEW, 1),
    # --- what-if cells must predict with the model the demo actually fitted ---
    ("79", 18, WHATIF_OLD, WHATIF_NEW, 1),
    ("82", 18, WHATIF_OLD, WHATIF_NEW, 1),
    ("95", 18, WHATIF_OLD, WHATIF_NEW, 1),
    ("97", 18, WHATIF_OLD, WHATIF_NEW, 1),
    ("98", 18, WHATIF_OLD, WHATIF_NEW, 1),
    ("103", 18, WHATIF_OLD, WHATIF_NEW, 1),
    # --- ch92's demo built `_demo_X`, so the what-if cell must use it ---
    ("92", 20, WHATIF_92_OLD, WHATIF_92_NEW, 1),
    # --- ch108/111 cleaning cells must continue the demo frame, not `raw` ---
    ("108", 34, CLEAN_OLD, CLEAN_NEW, 1),
    ("111", 34, CLEAN_OLD, CLEAN_NEW, 1),
]

# (chapter, old, new, expected_occurrences) applied across the whole chapter
CHAPTER_PATCHES: list[tuple[str, str, str, int]] = [
    ("31", AD_SPEND_OLD, AD_SPEND_NEW, 2),
    ("31", ALIGN_COMMENT_OLD, ALIGN_COMMENT_NEW, 1),
    ("34", CH34_OLD, CH34_NEW, 1),
    ("36", CH36_OLD, CH36_NEW, 1),
    # --- ch24: replace `assert` self-checks with an explicit raise. Applied
    # chapter-wide (not by cell index) because the app tree carries extra
    # math/checkpoint cells, so indices no longer line up between trees.
    ("24", CH24_LEDGER_OLD, CH24_LEDGER_NEW, 1),
    ("24", CH24_DF_OLD, CH24_DF_NEW, 1),
    ("24", CH24_TODO_OLD, CH24_TODO_NEW, 1),
]

# (module_key, old, new, expected_occurrences) applied to scripts/
# rewrite_python_basics/ch<key>.py, so regenerating a chapter cannot bring the
# defect back.
MODULE_PATCHES: list[tuple[str, str, str, int]] = [
    ("24", CH24_LEDGER_OLD, CH24_LEDGER_NEW, 1),
    ("24", CH24_DF_OLD, CH24_DF_NEW, 1),
    ("24", CH24_TODO_OLD, CH24_TODO_NEW, 1),
]
CROSSTAB_CHAPTERS = [str(n) for n in range(28, 39)]

# ---------------------------------------------------- ch14-27 module metadata
# `build.py` hard-coded module="python" for every hand-authored chapter, so
# `sync-catalog.mjs` (notebook content wins over its fallback table) filed the
# numpy lessons (files 14-18) and the pandas lessons (files 19-27) under the
# python module. HEAD had them under numpy/pandas; `course-teaching-design.json`
# still points its numpy/pandas recovery routes at those files, so the drift
# made `check:teaching` fail with "invalid recovery resource".
MODULE_BY_KEY = {
    **{str(n): "numpy" for n in range(14, 19)},
    **{str(n): "pandas" for n in range(19, 28)},
}


def fix_chapter_module(notebook: dict, module: str) -> bool:
    """Point ``metadata.course.module`` at the chapter's real module."""
    course = notebook.get("metadata", {}).get("course")
    if not isinstance(course, dict) or course.get("module") == module:
        return False
    course["module"] = module
    return True

# ------------------------------------------------- ch02-13 section numbering
# `build.py`'s hand-authored modules were cloned from ch01.py and kept its
# `## 1.x` section prefix. The chapter's own identity is chapter N
# (`course.chapter == N`, H1 == "第N章", exercises already say "练一练 N.x"),
# so the heading prefix must be N as well. HEAD had `## 2.1` / `## 10.1`;
# dropping to `## 1.x` was a rewrite regression.
RENUMBER_CHAPTERS = [f"{n:02d}" for n in range(2, 14)]
# chapter file key -> how many `## 1.x` headings it must contain
SECTION_COUNTS = {
    "02": 5, "03": 4, "04": 4, "05": 3, "06": 4, "07": 4,
    "08": 4, "09": 5, "10": 4, "11": 4, "12": 4, "13": 5,
}
SECTION_RE = re.compile(r"(?m)^## 1\.(\d+)")


def renumber_sections(text: str, chapter: int) -> tuple[str, int]:
    """Rewrite the `## 1.x` section prefix to `## <chapter>.x`."""
    return SECTION_RE.subn(lambda m: f"## {chapter}.{m.group(1)}", text)


def fix_source_modules(dry_run: bool, report: list[str], failures: list[str]) -> None:
    """Repair the modules that regenerate the hand-authored chapters (root cause)."""
    for nn in RENUMBER_CHAPTERS:
        path = MODULES / f"ch{nn}.py"
        if not path.exists():
            failures.append(f"missing module {path}")
            continue
        text = path.read_text(encoding="utf-8")
        new_text, count = renumber_sections(text, int(nn))
        if count == 0:
            report.append(f"  scripts/ch{nn}.py already numbered")
            continue
        expected = SECTION_COUNTS[nn]
        if count != expected:
            failures.append(
                f"scripts/ch{nn}.py: renumbered {count} heading(s), expected {expected}"
            )
            continue
        if not dry_run:
            path.write_text(new_text, encoding="utf-8")
        report.append(f"  scripts/ch{nn}.py renumbered x{count}")

    for key, old, new, expected in MODULE_PATCHES:
        path = MODULES / f"ch{key}.py"
        if not path.exists():
            failures.append(f"missing module {path}")
            continue
        text = path.read_text(encoding="utf-8")
        old_pat = patch_pattern(old)
        new_pat = patch_pattern(new)
        total_old = count_residual(text, old_pat, new_pat)
        total_new = len(new_pat.findall(text))
        if total_new >= expected and total_old == 0:
            report.append(f"  scripts/ch{key}.py [{old.splitlines()[0]!r}] already applied")
            continue
        if total_old != expected:
            failures.append(
                f"scripts/ch{key}.py: expected {expected} occurrence(s) of "
                f"{old.splitlines()[0]!r}, found {total_old}"
            )
            continue
        if not dry_run:
            path.write_text(old_pat.sub(lambda _m: new, text), encoding="utf-8")
        report.append(
            f"  scripts/ch{key}.py patched x{expected} [{old.splitlines()[0]!r}]"
        )


def renumber_cells(cells: list[dict], chapter: int) -> int:
    """Fix the same headings in an already-written notebook."""
    total = 0
    for cell in cells:
        if cell.get("cell_type") != "markdown":
            continue
        new_src, count = renumber_sections(source_of(cell), chapter)
        if count:
            set_source(cell, new_src)
            total += count
    return total


def source_of(cell: dict) -> str:
    return "".join(cell.get("source", []))


def set_source(cell: dict, text: str) -> None:
    cell["source"] = text.splitlines(keepends=True)


def tree_label(tree: Path) -> str:
    return tree.relative_to(ROOT).as_posix()


def patch_pattern(text: str) -> re.Pattern[str]:
    """Compile patch text into a whitespace-tolerant regex.

    ``format-course-notebooks.py`` (autopep8) re-wraps long lines, so a patch
    written against the pre-format source no longer matches literally even
    though the code is semantically identical. Treating every whitespace run as
    ``\\s+`` keeps the patch meaningful after formatting.
    """
    parts = [p for p in re.split(r"(\s+)", text) if p]
    body = "".join(r"\s+" if p.isspace() else re.escape(p) for p in parts)
    return re.compile(body)


def count_residual(hay: str, old_pat: re.Pattern[str], new_pat: re.Pattern[str]) -> int:
    """Count `old` matches that are *not* already covered by a `new` match.

    Several replacements embed their own source text (a comment prepended to the
    line it documents, a `_demo_model` call containing `model`), so a bare
    "old is absent" test would mis-fire. A patch counts as applied when every
    surviving `old` sits inside an already-present `new`.
    """
    spans = [m.span() for m in new_pat.finditer(hay)]
    residual = 0
    for m in old_pat.finditer(hay):
        start, end = m.span()
        if any(s <= start and end <= e for s, e in spans):
            continue
        residual += 1
    return residual


def has_patch_text(cells: list[dict], old: str, new: str) -> bool:
    """True when either side of the patch appears in these cells."""
    old_pat = patch_pattern(old)
    new_pat = patch_pattern(new)
    return any(
        old_pat.search(source_of(c)) or new_pat.search(source_of(c)) for c in cells
    )


def fragment_signatures(fragment: str) -> list[str] | None:
    """AST dumps of a code fragment's top-level statements.

    An expression fragment yields the dump of its value, so a bare
    ``np.array([...])`` can be matched against the same call nested inside an
    assignment.
    """
    try:
        tree = ast.parse(textwrap.dedent(fragment).strip())
    except SyntaxError:
        return None
    if not tree.body:
        return None
    return [
        ast.dump(node.value) if isinstance(node, ast.Expr) else ast.dump(node)
        for node in tree.body
    ]


def ast_fragment_present(cells: list[dict], fragment: str) -> bool:
    """True when every statement of `fragment` already appears in some cell.

    Formatting-insensitive. autopep8 re-wraps long calls and inserts a magic
    trailing comma when it explodes them, which defeats literal and even
    whitespace-tolerant matching while leaving the AST identical.
    """
    wanted = fragment_signatures(fragment)
    if not wanted:
        return False
    for cell in cells:
        try:
            have = {ast.dump(node) for node in ast.walk(ast.parse(source_of(cell)))}
        except SyntaxError:
            continue
        if all(sig in have for sig in wanted):
            return True
    return False


def apply_cell_patch(
    cells: list[dict],
    index: int,
    old: str,
    new: str,
    expected: int,
    scope: str,
    label: str,
    report: list[str],
    failures: list[str],
) -> bool:
    """Patch a single cell, tolerating index drift between the two trees.

    `enrich-notebook-math.py` and `enrich-module-intro-checkpoints.py` insert
    cells into the app tree only, so a hard-coded index stops pointing at the
    same cell in both trees. When the indexed cell carries neither side of the
    patch, look for the one cell that already holds the replacement rather than
    counting the pattern across the whole chapter -- sibling cells legitimately
    reuse the same idiom (ch35 has three unrelated `labels=labels,`).
    """
    if has_patch_text([cells[index]], old, new):
        return apply_region([cells[index]], old, new, expected, scope, label, report, failures)
    new_pat = patch_pattern(new)
    for pos, cell in enumerate(cells, 1):
        # Some patches are keyword-argument fragments (`labels=pie_labels,`),
        # which are not standalone statements and so cannot be parsed. Fall back
        # to the whitespace-tolerant pattern for those.
        if new_pat.search(source_of(cell)) or ast_fragment_present([cell], new):
            report.append(f"  {scope} [{label}] already applied (now at cell#{pos})")
            return False
    failures.append(
        f"{scope} [{label}]: expected {expected} occurrence(s) of "
        f"{old.splitlines()[0]!r}, found 0 (indexed cell also empty)"
    )
    return False


def apply_region(
    cells: list[dict],
    old: str,
    new: str,
    expected: int,
    scope: str,
    label: str,
    report: list[str],
    failures: list[str],
) -> bool:
    """Apply one patch across a set of cells. Returns True when it wrote changes."""
    old_pat = patch_pattern(old)
    new_pat = patch_pattern(new)
    total_old = sum(count_residual(source_of(c), old_pat, new_pat) for c in cells)
    total_new = sum(len(new_pat.findall(source_of(c))) for c in cells)

    if total_new >= expected and total_old == 0:
        report.append(f"  {scope} [{label}] already applied")
        return False
    if total_old == 0 and ast_fragment_present(cells, new):
        report.append(f"  {scope} [{label}] already applied (reformatted)")
        return False
    if total_old != expected:
        failures.append(
            f"{scope} [{label}]: expected {expected} occurrence(s) of "
            f"{old.splitlines()[0]!r}, found {total_old}"
        )
        return False
    written = False
    for cell in cells:
        src = source_of(cell)
        if old_pat.search(src):
            set_source(cell, old_pat.sub(lambda _m: new, src))
            written = True
    report.append(f"  {scope} [{label}] patched x{expected}")
    return written


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report only")
    args = parser.parse_args(argv)

    failures: list[str] = []
    report: list[str] = []
    touched_files = 0

    fix_source_modules(args.dry_run, report, failures)

    chapters = sorted(
        {c for c, *_ in CELL_PATCHES}
        | {c for c, *_ in CHAPTER_PATCHES}
        | set(CROSSTAB_CHAPTERS)
        | {str(int(n)) for n in RENUMBER_CHAPTERS}
        | set(MODULE_BY_KEY),
        key=int,
    )

    renumber = {str(int(n)) for n in RENUMBER_CHAPTERS}

    for tree in TREES:
        label = tree_label(tree)
        for chapter in chapters:
            path = tree / f"course-chapter-{chapter}.ipynb"
            if not path.exists():
                failures.append(f"missing {path}")
                continue
            notebook = json.loads(path.read_text(encoding="utf-8"))
            cells = notebook["cells"]
            dirty = False

            if chapter in renumber:
                count = renumber_cells(cells, int(chapter))
                expected = SECTION_COUNTS[f"{int(chapter):02d}"]
                if count == 0:
                    report.append(f"  {label} ch{chapter} sections already numbered")
                elif count != expected:
                    failures.append(
                        f"{label} ch{chapter}: renumbered {count} heading(s), "
                        f"expected {expected}"
                    )
                else:
                    dirty = True
                    report.append(f"  {label} ch{chapter} sections renumbered x{count}")

            if chapter in MODULE_BY_KEY:
                module = MODULE_BY_KEY[chapter]
                if fix_chapter_module(notebook, module):
                    dirty = True
                    report.append(f"  {label} ch{chapter} module -> {module}")
                else:
                    report.append(f"  {label} ch{chapter} module already {module}")

            if chapter in CROSSTAB_CHAPTERS:
                dirty |= apply_region(
                    cells, CROSSTAB_OLD, CROSSTAB_NEW, 1,
                    f"ch{chapter} crosstab", label, report, failures,
                )

            for chap, old, new, expected in CHAPTER_PATCHES:
                if chap != chapter:
                    continue
                dirty |= apply_region(
                    cells, old, new, expected,
                    f"ch{chapter}", label, report, failures,
                )

            for chap, index, old, new, expected in CELL_PATCHES:
                if chap != chapter:
                    continue
                dirty |= apply_cell_patch(
                    cells, index, old, new, expected,
                    f"ch{chapter} cell#{index}", label, report, failures,
                )

            if dirty and not args.dry_run:
                path.write_text(
                    json.dumps(notebook, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                touched_files += 1

    print("\n".join(report))
    print(f"\nnotebooks rewritten: {touched_files}")
    if failures:
        print(f"\n{len(failures)} FAILURES:")
        for line in failures:
            print("  ", line)
        return 1
    print("all patches applied cleanly")
    return 0


if __name__ == "__main__":
    sys.exit(main())
