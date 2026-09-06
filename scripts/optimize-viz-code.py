# -*- coding: utf-8 -*-
"""优化可视化章节（Matplotlib/Seaborn/Plotly）代码单元：PEP8 规范 + 代码简化。

复用项目自有格式化逻辑 scripts/format-course-notebooks.py（autopep8 aggressive=2
+ black line_length=79），只作用于可视化章节 notebook 的 code cell。

安全保证：
  - 逐 cell 调用 format_source，任一 cell 抛异常（如残缺练习脚手架）则保留原样，
    绝不破坏该 cell。
  - 保留 cell id / metadata / markdown / 输出；只改 code cell 的 source。
  - 幂等：已是规范格式的 cell 不改动。

用法：python scripts/optimize-viz-code.py [--scope viz|all]
"""
import json, os, sys, shutil
from pathlib import Path
import importlib.util

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"
BACKUP = ROOT / ".backup-viz-codeopt"

spec = importlib.util.spec_from_file_location("fmt", ROOT / "scripts" / "format-course-notebooks.py")
fmt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fmt)
format_source = fmt.format_source

VIZ_CHAPTERS = list(range(28, 39)) + list(range(39, 58)) + list(range(58, 75))
VIZ_INTROS = ["module-intro-matplotlib.ipynb", "module-intro-seaborn.ipynb", "module-intro-plotly.ipynb"]


def targets(scope):
    names = []
    if scope == "all":
        for p in sorted(COURSE.rglob("*.ipynb")):
            names.append(str(p.relative_to(COURSE)))
    else:
        for n in VIZ_CHAPTERS:
            names.append(f"course-chapter-{n}.ipynb")
        names.extend(VIZ_INTROS)
    return [str(COURSE / n) for n in names if (COURSE / n).exists()]


def main():
    scope = "viz"
    if "--scope" in sys.argv:
        i = sys.argv.index("--scope")
        if i + 1 < len(sys.argv):
            scope = sys.argv[i + 1]
    os.makedirs(BACKUP, exist_ok=True)
    paths = targets(scope)
    changed_cells = 0
    changed_files = 0
    skipped_cells = 0
    for path in paths:
        nb = json.loads(Path(path).read_text(encoding="utf-8"))
        shutil.copy2(path, BACKUP / os.path.basename(path))
        dirty = False
        for cell in nb.get("cells", []):
            if cell.get("cell_type") != "code":
                continue
            source = "".join(cell.get("source", []))
            if not source.strip():
                continue
            try:
                formatted = format_source(source)
            except Exception as exc:  # noqa: BLE001 — 绝不让单个 cell 破坏 notebook
                skipped_cells += 1
                continue
            if formatted != source:
                cell["source"] = formatted.splitlines(keepends=True)
                dirty = True
                changed_cells += 1
        if dirty:
            Path(path).write_text(
                json.dumps(nb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
            )
            changed_files += 1
    print(f"scope={scope}  文件={len(paths)}  改写 cell={changed_cells}  改写文件={changed_files}  跳过(异常)={skipped_cells}")


if __name__ == "__main__":
    main()
