# -*- coding: utf-8 -*-
"""删除 47 章「诊断式自检」小节：markdown 标题 + 断言 code cell。"""
import json, os, re, shutil, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"
BACKUP = ROOT / ".backup-del-selfcheck"

H_RE = re.compile(r'^##\s+\d+\.\d+\s+诊断式自检')
CHECK_RE = "诊断式自检：核对"

os.makedirs(BACKUP, exist_ok=True)
total_del = 0
changed_files = []

for n in range(28, 75):
    rel = f"course-chapter-{n}.ipynb"
    p = COURSE / rel
    if not p.exists():
        continue
    nb = json.loads(p.read_text(encoding="utf-8"))
    shutil.copy2(p, BACKUP / rel)
    new_cells = []
    del_count = 0
    for c in nb.get("cells", []):
        src = "".join(c.get("source", []))
        is_md_title = c.get("cell_type") == "markdown" and H_RE.search(src)
        is_check_code = c.get("cell_type") == "code" and CHECK_RE in src
        if is_md_title or is_check_code:
            del_count += 1
            continue
        new_cells.append(c)
    if del_count:
        nb["cells"] = new_cells
        p.write_text(json.dumps(nb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        total_del += del_count
        changed_files.append(rel)

print(f"删除 cell 总数={total_del}  改写文件={len(changed_files)}")
