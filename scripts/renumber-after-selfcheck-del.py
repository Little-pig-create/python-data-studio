# -*- coding: utf-8 -*-
"""重排 47 章删除自检后的节号，使编号连续。"""
import ast, json, os, re, shutil, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"
BACKUP = ROOT / ".backup-delsc-renum"

# 匹配标题行：## X.M  或 ### X.M.K
SEC_RE = re.compile(r'^(#{2,3}\s+)(\d+)\.(\d+)(?:\.(\d+))?\s+(.*)$')


def find_gap(nb, ch):
    nums = []
    for c in nb.get("cells", []):
        if c.get("cell_type") != "markdown":
            continue
        src = "".join(c.get("source", []))
        for ln in src.splitlines():
            m = re.match(r'^##\s+(\d+)\.(\d+)\s', ln.strip())
            if m and m.group(1) == ch:
                nums.append(int(m.group(2)))
    if not nums:
        return None
    for i in range(min(nums), max(nums) + 1):
        if i not in nums:
            return i
    return None


def shift(nb, ch, gap):
    """把标题中节号 > gap 的都减 1。"""
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
                leader = m.group(1)
                rest = m.group(5)
                if m.group(4) is not None:
                    new_ln = f"{leader}{ch}.{new_m}.{m.group(4)} {rest}"
                else:
                    new_ln = f"{leader}{ch}.{new_m} {rest}"
                nl = "\n" if ln.endswith("\n") else ""
                out.append(new_ln + nl)
                cell_changed = True
            else:
                out.append(ln)
        if cell_changed:
            c["source"] = "".join(out).splitlines(keepends=True)
            changed = True
    return changed


os.makedirs(BACKUP, exist_ok=True)
changed_files = []
for n in range(28, 75):
    rel = f"course-chapter-{n}.ipynb"
    p = COURSE / rel
    if not p.exists():
        continue
    nb = json.loads(p.read_text(encoding="utf-8"))
    # 识别章号
    ch = ""
    m = re.match(r'#\s+(\d+)\.', "".join(nb.get("cells", [{}])[0].get("source", [])))
    if m:
        ch = m.group(1)
    gap = find_gap(nb, ch)
    if gap is None:
        continue
    shutil.copy2(p, BACKUP / rel)
    if shift(nb, ch, gap):
        p.write_text(json.dumps(nb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        changed_files.append((rel, gap))

for f, g in changed_files:
    print(f"{f}: 缺号{g} 已重排")
