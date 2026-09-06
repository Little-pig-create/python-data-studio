# -*- coding: utf-8 -*-
"""全库删除「诊断式自检」小节：markdown 标题 + 紧随的 review 模板 code cell。

边界：只删
  - markdown cell，其标题行含「诊断式自检」；
  - 紧随其后的 code cell，若以 review = { ... } 且含「待确认」。
保留练习/答案里的 # 自检 注释。
"""
import json, os, re, shutil, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"
BACKUP = ROOT / ".backup-del-all-selfcheck"

SC_HDR = re.compile(r'^#{1,6}\s+.*诊断式自检')
os.makedirs(BACKUP, exist_ok=True)

def is_review_cell(c):
    src = "".join(c.get("source", []))
    return c.get("cell_type") == "code" and "review = {" in src and "待确认" in src

total_files = total_del = 0
for p in sorted(COURSE.rglob("*.ipynb")):
    nb = json.loads(p.read_text(encoding="utf-8"))
    shutil.copy2(p, BACKUP / p.relative_to(COURSE).as_posix().replace("/", "__"))
    cells = nb.get("cells", [])
    new_cells = []
    i = 0
    removed = 0
    while i < len(cells):
        c = cells[i]
        is_sc_hdr = (
            c.get("cell_type") == "markdown"
            and any(SC_HDR.match(ln.strip()) for ln in "".join(c.get("source", [])).splitlines())
        )
        if is_sc_hdr:
            removed += 1
            i += 1
            # 删除紧随其后的 review 模板 code cell（若有且相邻）
            if i < len(cells) and is_review_cell(cells[i]):
                removed += 1
                i += 1
            continue
        new_cells.append(c)
        i += 1
    if removed:
        nb["cells"] = new_cells
        p.write_text(json.dumps(nb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        total_files += 1
        total_del += removed

print(f"改写文件={total_files}  删除cell={total_del}")
