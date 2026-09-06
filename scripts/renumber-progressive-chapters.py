# -*- coding: utf-8 -*-
"""渐进风格章节小节重编号（幂等）：把转换后断裂的编号映射为连续编号。

映射表（渐进风格统一结构）：
  N.10 核心概念         -> N.1
  N.12 方法分类速查     -> N.2
  N.13 示例 1           -> N.3
  N.14 示例 2           -> N.4
  N.15 示例 3           -> N.5
  N.16 核心操作独立示例  -> N.6
  N.17 独立迁移练习     -> N.7
  N.18 诊断式自检       -> N.8
  N.19 本章实训         -> N.9   (子节 N.19.x -> N.9.x)
  N.20 错误恢复         -> N.10  (子节 N.20.x -> N.10.x)
  N.21 易错点提醒       -> N.11
  N.22 练习与作业       -> N.12
  N.23 练习路径         -> N.13  (子节 N.23.x -> N.13.x)
  N.24 小结             -> N.14  (子节 N.24.x -> N.14.x)

用法：python scripts/renumber-progressive-chapters.py [--dry-run]
"""

import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"

SECONDARY_A = {10: 1, 12: 2, 13: 3, 14: 4, 15: 5, 16: 6, 17: 7, 18: 8, 19: 9, 20: 10, 21: 11, 22: 12, 23: 13, 24: 14, 25: 15}
SECONDARY_B = {6: 1, 11: 2, 12: 3, 13: 4, 14: 5, 15: 6, 16: 7, 17: 8, 18: 9, 19: 10, 20: 11, 21: 12, 22: 13, 23: 14}
TERTIARY_A = {19: 9, 20: 10, 21: 11, 23: 13, 24: 14, 25: 15}
TERTIARY_B = {18: 9, 19: 10, 20: 11, 23: 14}

def src_text(cell):
    s = cell.get("source", "")
    return "".join(s) if isinstance(s, list) else str(s or "")

def detect_variant(joined, ch):
    if "## " + str(ch) + ".6 适用场景" in joined:
        return "B"
    return "A"

def renumber_line(line, ch, variant):
    SECONDARY = SECONDARY_B if variant == "B" else SECONDARY_A
    TERTIARY = TERTIARY_B if variant == "B" else TERTIARY_A
    # 匹配：## 15.10 标题 或 ### 15.19.1 标题
    m = re.match(r"^(#{1,2})\s+" + str(ch) + r"\.(\d+)(?:\.(\d+))?\s+(.*)$", line)
    if not m:
        return line
    hashes, old, sub, title = m.group(1), int(m.group(2)), m.group(3), m.group(4)
    if old not in SECONDARY:
        return line
    new = SECONDARY[old]
    if sub is not None and old in TERTIARY:
        return f"{hashes} {ch}.{new}.{sub} {title}"
    return f"{hashes} {ch}.{new} {title}"

def main():
    dry = "--dry-run" in sys.argv
    files = sorted([f for f in COURSE.glob("course-chapter-*.ipynb") if f.name != "course-chapter-time.ipynb"])
    stats = {"renumbered": 0, "skipped": 0}
    for f in files:
        try:
            m = re.match(r"course-chapter-(\d+)\.ipynb", f.name)
            if not m:
                stats["skipped"] += 1
                continue
            ch = int(m.group(1))
            if ch < 15:
                stats["skipped"] += 1
                continue
            nb = json.loads(f.read_text(encoding="utf-8"))
            cells = nb.get("cells", [])
            joined = "\n".join(src_text(c) for c in cells if c.get("cell_type") == "markdown")
            variant = detect_variant(joined, ch)
            marker = ("## " + str(ch) + ".6 适用场景") if variant == "B" else ("## " + str(ch) + ".10 核心概念")
            if marker not in joined:
                stats["skipped"] += 1
                continue
            changed = False
            for cell in cells:
                if cell.get("cell_type") != "markdown":
                    continue
                lines = src_text(cell).splitlines()
                new_lines = [renumber_line(l, ch, variant) for l in lines]
                if new_lines != lines:
                    changed = True
                    if not dry:
                        cell["source"] = [l + "\n" for l in new_lines]
            if changed:
                stats["renumbered"] += 1
                if not dry:
                    f.write_text(json.dumps(nb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        except Exception as e:
            print(f"{f.name}: ERROR {e}")
    print("----")
    print(json.dumps(stats, ensure_ascii=False))
    print("dry-run" if dry else "applied")

if __name__ == "__main__":
    main()