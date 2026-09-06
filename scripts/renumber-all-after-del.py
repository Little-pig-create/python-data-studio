# -*- coding: utf-8 -*-
"""全库：删除自检小节后，把每章后续节号顺延减 1，使编号连续。

对每个 course-chapter-*.ipynb：
  1) 找出该章节号序列中缺失的号 N（被删的自检所在节号）；
  2) 把所有 `## X.M` / `### X.M.K` 中 M>N 的 M 减 1。
"""
import json, os, re, shutil, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"
BACKUP = ROOT / ".backup-del-all-renum"

SEC_RE = re.compile(r'^(#{2,3}\s+)(\d+)\.(\d+)(?:\.(\d+))?\s+(.*)$')


def find_gap(nb, ch):
    nums = []
    for c in nb.get("cells", []):
        if c.get("cell_type") != "markdown":
            continue
        src = "".join(c.get("source", []))
        for ln in src.splitlines():
            m = re.match(r'^##\s+%s\.(\d+)\s' % re.escape(ch), ln.strip())
            if m:
                nums.append(int(m.group(1)))
    if not nums:
        return None
    for i in range(min(nums), max(nums) + 1):
        if i not in nums:
            return i
    return None


def shift(nb, ch, gap):
    changed = False
    for c in nb.get("cells", []):
        if c.get("cell_type") != "markdown":
            continue
        src = "".join(c.get("source", []))
        lines = src.splitlines(keepends=True)
        out = []
        cell_changed = False
        for ln in lines:
            m = SEC_RE.match(ln)
            if m and m.group(2) == ch and int(m.group(3)) > gap:
                new_m = int(m.group(3)) - 1
                nl = "\n" if ln.endswith("\n") else ""
                if m.group(4) is not None:
                    out.append(f"{m.group(1)}{ch}.{new_m}.{m.group(4)} {m.group(5)}{nl}")
                else:
                    out.append(f"{m.group(1)}{ch}.{new_m} {m.group(5)}{nl}")
                cell_changed = True
            else:
                out.append(ln)
        if cell_changed:
            c["source"] = "".join(out).splitlines(keepends=True)
            changed = True
    return changed


os.makedirs(BACKUP, exist_ok=True)
changed_files = 0
for p in sorted(COURSE.rglob("course-chapter-*.ipynb")):
    nb = json.loads(p.read_text(encoding="utf-8"))
    first = "".join(nb.get("cells", [{}])[0].get("source", []))
    cm = re.match(r'#\s+(\d+)\.', first)
    if not cm:
        continue
    ch = cm.group(1)
    gap = find_gap(nb, ch)
    if gap is None:
        continue
    shutil.copy2(p, BACKUP / p.relative_to(COURSE).as_posix().replace("/", "__"))
    if shift(nb, ch, gap):
        p.write_text(json.dumps(nb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        changed_files += 1

print(f"重排文件={changed_files}")
