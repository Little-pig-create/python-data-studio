# -*- coding: utf-8 -*-
"""全库：删除所有 code cell 里的「自检」块（自检注释 + 判题代码），保留主体。

策略：找到 cell 中第一个以行首注释形式出现的「自检 / 诊断式」注释行，
删除该行到 cell 末尾的自检块；用 ast.parse 兜底（删除后无法解析则保留原样）。
"""
import ast, json, os, re, shutil, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"
BACKUP = ROOT / ".backup-del-selfcheck-cells"

SELF_START = re.compile(r'^\s*#.*(?:自检|诊断式)')


def has_selfcheck(src):
    return any(SELF_START.match(ln) for ln in src.splitlines())


def strip(src):
    lines = src.splitlines(keepends=True)
    for idx, ln in enumerate(lines):
        if SELF_START.match(ln):
            head = "".join(lines[:idx])
            return head.rstrip() + "\n"
    return src


os.makedirs(BACKUP, exist_ok=True)
files_changed = cells_changed = 0
for p in sorted(COURSE.rglob("*.ipynb")):
    nb = json.loads(p.read_text(encoding="utf-8"))
    shutil.copy2(p, BACKUP / p.relative_to(COURSE).as_posix().replace("/", "__"))
    dirty = False
    cell_count = 0
    for c in nb.get("cells", []):
        if c.get("cell_type") != "code":
            continue
        src = "".join(c.get("source", []))
        if not has_selfcheck(src):
            continue
        new = strip(src)
        if new != src:
            try:
                ast.parse(new)
            except SyntaxError:
                continue  # 删除后主体不完整，保留原样
            c["source"] = new.splitlines(keepends=True)
            dirty = True
            cell_count += 1
    if dirty:
        p.write_text(json.dumps(nb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        files_changed += 1
        cells_changed += cell_count

print(f"改写文件={files_changed}  删除自检块cell={cells_changed}")
