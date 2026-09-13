"""Execute every course notebook cell in order and report runtime defects.

Each code cell is compiled and executed in a fresh namespace per chapter, in
document order, mirroring how a student runs a notebook top-down. Exceptions
are classified as:

* ``DESIGN`` - an intentional error-recovery example or an unfilled practice
  scaffold; these are expected to raise.
* ``REAL`` - anything unexpected: a data/length mismatch, a bad format
  specifier, a mistyped variable, a model used before it is fitted. A
  ``SyntaxError`` is always REAL, even inside a scaffold: a cell that does not
  parse is broken, not "intentionally failing".

``REAL`` findings are the useful signal, so the command exits non-zero when any
exist (unless ``--report-only`` is passed). This is the guard that keeps the
formatter and the rewrite pipeline from silently shipping broken cells.

Usage:
    python scripts/check-course-runtime.py
    python scripts/check-course-runtime.py --out logs/runtime.txt
    python scripts/check-course-runtime.py --chapter 39 --chapter 42
"""

from __future__ import annotations

import argparse
import contextlib
import json
import os
import re
import sys
import tempfile
import traceback
import warnings
from pathlib import Path

warnings.simplefilter("ignore")
os.environ["MPLBACKEND"] = "Agg"

try:  # matplotlib is part of the bundled runtime; degrade gracefully if absent
    import matplotlib

    matplotlib.use("Agg")
except Exception:  # pragma: no cover
    pass

try:
    import plotly.io as pio

    pio.show = lambda *a, **k: None
except Exception:  # pragma: no cover
    pass

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "logs" / "course-runtime-check.txt"
COURSE = ROOT / "public" / "course"

DESIGN_TAGS = {"error-recovery", "exercise", "practice", "check", "teacher-answer"}
DESIGN_TEXT = ("___", "...", "TODO", "请在下方填写", "待填", "你的代码")


def chapter_keys() -> list[str]:
    """Course chapters in taught order: 1-27, helpers, then 28+."""
    names = {p.name for p in COURSE.glob("course-chapter-*.ipynb")}

    def present(tag: str) -> bool:
        return f"course-chapter-{tag}.ipynb" in names

    order = [str(n) for n in range(1, 28) if present(str(n))]
    order += [extra for extra in ("common-modules", "time") if present(extra)]
    order += [str(n) for n in range(28, 200) if present(str(n))]
    return order


def sort_key(tag: str):
    return (0, int(tag), "") if tag.isdigit() else (1, 0, tag)


def is_design_cell(tags: list[str], source: str) -> bool:
    if DESIGN_TAGS & set(tags):
        return True
    return any(marker in source for marker in DESIGN_TEXT)


def run_chapter(key: str) -> tuple[int, int, list[str], int]:
    """Run one chapter. Returns (code_cells, real, lines, design)."""
    path = COURSE / f"course-chapter-{key}.ipynb"
    notebook = json.loads(path.read_text(encoding="utf-8"))
    os.chdir(tempfile.mkdtemp())
    namespace: dict = {"__name__": "__main__", "display": lambda *a, **k: None}
    heading = ""
    real: list[tuple] = []
    design: list[tuple] = []
    code_cells = 0

    for index, cell in enumerate(notebook["cells"]):
        source = "".join(cell.get("source", []))
        if cell["cell_type"] == "markdown":
            for line in source.splitlines():
                if line.startswith("#"):
                    heading = line.strip("# ").strip()
                    break
            continue
        code_cells += 1
        tags = list((cell.get("metadata") or {}).get("tags") or [])
        try:
            with open("sink.txt", "w", encoding="utf-8") as sink:
                with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
                    exec(compile(source, f"{key}-{index}", "exec"), namespace)
        except Exception as exc:
            # Multi-line exceptions (e.g. sklearn's feature-name ValueError)
            # leave a blank last line; fall back to the final non-empty line.
            tail = [line for line in traceback.format_exc().splitlines() if line.strip()]
            last = f"{type(exc).__name__}: {tail[-1] if tail else '?'}"[:150]
            row = (index, heading[:46], ",".join(tags)[:34], last)
            # A cell that does not even parse is never an acceptable "design"
            # failure: scaffolds are meant to be valid Python with TODO
            # comments, and unfilled blanks are commented out by the pipeline.
            if isinstance(exc, SyntaxError) or not is_design_cell(tags, source):
                real.append(row)
            else:
                design.append(row)

    lines = [f"ch{key}: cells={code_cells} REAL={len(real)} DESIGN={len(design)}"]
    for index, head, tags, last in real:
        lines.append(f"    REAL cell#{index} [{head}] tags={tags} -> {last}")
    for index, head, tags, last in design[:2]:
        lines.append(f"    (design) cell#{index} [{head}] tags={tags} -> {last}")
    return code_cells, len(real), lines, len(design)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument(
        "--chapter", action="append", default=[], help="only check these chapters"
    )
    parser.add_argument(
        "--report-only",
        action="store_true",
        help="always exit 0, even when REAL findings exist",
    )
    args = parser.parse_args(argv)

    keys = args.chapter or chapter_keys()
    keys = sorted(keys, key=sort_key)

    lines: list[str] = []
    total_real = 0
    bad_chapters: list[str] = []
    total_design = 0

    for key in keys:
        if not (COURSE / f"course-chapter-{key}.ipynb").exists():
            lines.append(f"ch{key}: MISSING")
            continue
        _cells, real, chapter_lines, design = run_chapter(key)
        lines.extend(chapter_lines)
        total_design += design
        if real:
            total_real += real
            bad_chapters.append(key)
        print(f"ch{key}: REAL={real}")

    lines.append("")
    lines.append(f"=== chapters with REAL errors: {len(bad_chapters)} -> {bad_chapters}")
    lines.append(f"=== total REAL errors: {total_real}")
    lines.append(f"=== total DESIGN exceptions: {total_design}")
    lines.append(f"=== chapters checked: {len(keys)}")

    out = args.out if args.out.is_absolute() else ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(
        f"\nchecked {len(keys)} chapters: REAL={total_real}, DESIGN={total_design}"
    )
    print(f"report: {out.relative_to(ROOT).as_posix()}")

    if total_real and not args.report_only:
        print("\nREAL runtime errors found; see the report above.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
