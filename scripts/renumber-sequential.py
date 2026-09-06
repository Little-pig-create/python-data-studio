# -*- coding: utf-8 -*-
"""按内容顺序重编号渐进章节的 ## N.x 小节（保持三级子节跟随父节）。

- 只处理有 本章场景 且标题为 "N.数字 标题" 的章节（渐进风格）；
- 按出现顺序重编号为 N.1, N.2, ...；三级标题 N.a.b 跟随父节 a 的新编号；
- 幂等：已有连续编号的章节跳过。

用法：python scripts/renumber-sequential.py [--dry-run]
"""

import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"

def src_text(cell):
    s = cell.get("source", "")
    return "".join(s) if isinstance(s, list) else str(s or "")

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
            # 收集所有二级标题（按 cell 顺序）
            headings = []
            for cell in cells:
                if cell.get("cell_type") != "markdown":
                    continue
                for line in src_text(cell).splitlines():
                    mm = re.match(r"^##\s+" + str(ch) + r"\.(\d+)\s+(.*)$", line)
                    if mm:
                        headings.append((int(mm.group(1)), mm.group(2).strip()))
                        break
            if not headings:
                stats["skipped"] += 1
                continue
            # 判断是否已连续
            seq = all(h[0] == i + 1 for i, h in enumerate(headings))
            if seq:
                stats["skipped"] += 1
                continue
            old_to_new = {old: i + 1 for i, (old, _) in enumerate(headings)}
            changed = False
            for cell in cells:
                if cell.get("cell_type") != "markdown":
                    continue
                lines = src_text(cell).splitlines()
                new_lines = []
                for line in lines:
                    m2 = re.match(r"^(#{1,2})\s+" + str(ch) + r"\.(\d+)(?:\.(\d+))?\s+(.*)$", line)
                    if m2 and int(m2.group(2)) in old_to_new:
                        new_no = old_to_new[int(m2.group(2))]
                        if m2.group(3) is not None:
                            line = f"{m2.group(1)} {ch}.{new_no}.{m2.group(3)} {m2.group(4)}"
                        else:
                            line = f"{m2.group(1)} {ch}.{new_no} {m2.group(4)}"
                        changed = True
                    new_lines.append(line)
                if new_lines != lines and not dry:
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