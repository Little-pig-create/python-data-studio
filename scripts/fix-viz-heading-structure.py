# -*- coding: utf-8 -*-
"""修复可视化模块章节标题结构（P1）。

1. 拆分 cell#3：把「适用场景 / 数据结构 / 本章练习任务」三段（原挤在同一个 markdown cell）
   拆成 3 个独立 markdown cell，使 JupyterLab 目录（TOC）能逐节跳转。
2. ch31 编号修正：cell#3 内「36.7 数据结构 → 36.2」「36.8 本章练习任务 → 36.3」，
   后文所有 36.2..36.14 节号 +2 变为 36.4..36.16（含子节），使全章 36.1..36.16 连续。
3. ch28 cell#15 标题粘连：`### 参数示例：dpi 与 Axes.set下面给两个…` 拆成标题 + 空行 + 正文。

安全：只改 markdown cell 的 source；幂等；逐 cell 校验。
"""
import json, os, re, shutil, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"
BACKUP = ROOT / ".backup-viz-heading-fix"

FILES = [f"course-chapter-{n}.ipynb" for n in range(28, 75)]

H2_RE = re.compile(r'^##\s+\d+\.\d+\s')

# ch31 后文节号映射：36.2..36.14 → 36.4..36.16（子节同理）
CH31_SEC_RE = re.compile(r'^(#{2,3}\s+)36\.(\d+)(\.\d+)?(\s+.*)$', re.MULTILINE)


def split_h2_cells(source: str):
    """把含多个 `## ` 二级标题的 markdown 文本按标题边界切成多段。"""
    lines = source.splitlines(keepends=True)
    bounds = [i for i, ln in enumerate(lines) if H2_RE.match(ln)]
    if len(bounds) <= 1:
        return [source]
    segs = []
    for j, b in enumerate(bounds):
        end = bounds[j + 1] if j + 1 < len(bounds) else len(lines)
        seg = "".join(lines[b:end]).rstrip() + "\n"
        segs.append(seg)
    return segs


def renumber_ch31(nb):
    """ch31（36 章）节号修正（在拆分前，基于原始 cell 索引）。"""
    changed = False
    for i, c in enumerate(nb.get("cells", [])):
        if c.get("cell_type") != "markdown":
            continue
        src = "".join(c.get("source", []))
        if i == 3:
            new = src.replace("## 36.7 数据结构", "## 36.2 数据结构")
            new = new.replace("## 36.8 本章练习任务", "## 36.3 本章练习任务")
        else:
            def repl(m):
                n = int(m.group(2))
                if 2 <= n <= 14:
                    return f"{m.group(1)}36.{n + 2}{m.group(3) or ''}{m.group(4)}"
                return m.group(0)
            new = CH31_SEC_RE.sub(repl, src)
        if new != src:
            c["source"] = new.splitlines(keepends=True)
            changed = True
    return changed


def fix_ch28_glue(nb):
    """ch28 cell#15 标题粘连修复（拆分前，原始索引）。"""
    if len(nb.get("cells", [])) <= 15:
        return False
    c = nb["cells"][15]
    src = "".join(c.get("source", []))
    new = src.replace(
        "### 参数示例：dpi 与 Axes.set下面给两个独立、可直接运行的示例",
        "### 参数示例：dpi 与 Axes.set\n\n下面给两个独立、可直接运行的示例",
    )
    if new != src:
        c["source"] = new.splitlines(keepends=True)
        return True
    return False


def main():
    os.makedirs(BACKUP, exist_ok=True)
    stats = {"split": 0, "renumber": 0, "glue": 0}
    changed_files = []

    for rel in FILES:
        p = COURSE / rel
        if not p.exists():
            continue
        nb = json.loads(p.read_text(encoding="utf-8"))
        shutil.copy2(p, BACKUP / rel)
        dirty = False

        # 1) 编号/粘连修正（必须先于拆分，基于原始 cell 索引）
        if rel == "course-chapter-31.ipynb" and renumber_ch31(nb):
            stats["renumber"] += 1
            dirty = True
        if rel == "course-chapter-28.ipynb" and fix_ch28_glue(nb):
            stats["glue"] += 1
            dirty = True

        # 2) 拆分 cell#3（含多个 ## 标题）
        cell3 = nb.get("cells", [])[3] if len(nb.get("cells", [])) > 3 else None
        if cell3 and cell3.get("cell_type") == "markdown":
            src = "".join(cell3.get("source", []))
            segs = split_h2_cells(src)
            if len(segs) > 1:
                new_cells = [
                    {"cell_type": "markdown", "metadata": {}, "source": seg.splitlines(keepends=True)}
                    for seg in segs
                ]
                nb["cells"][3:4] = new_cells
                stats["split"] += 1
                dirty = True

        if dirty:
            p.write_text(json.dumps(nb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            changed_files.append(rel)

    print(f"改写文件={len(changed_files)}")
    print(f"  拆分cell#3={stats['split']}  ch31重编号={stats['renumber']}  ch28粘连修复={stats['glue']}")
    for f in changed_files:
        print(f"  - {f}")


if __name__ == "__main__":
    main()
