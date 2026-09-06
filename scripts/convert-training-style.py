# -*- coding: utf-8 -*-
"""章节内部结构转换：大学/渐进风格 → 实训平台风格（骨架统一）。

规则：
- 大学风格（教学信息/三维目标/重难点/结构图/思考/参考 等板书板块）→ 删除；
- 渐进风格（本章板书树/学习目标/运行后应观察/学习路线/小检查/主线/练习方式/为什么先学/开始前确认/三级目录）→ 删除；
- 上机实验 → 本章实训；重点专题与易错点 → 易错点提醒；课堂练习 → 练习与作业；
- 教学实验 → 本章实训；常见误区 → 易错点提醒；综合练习 → 练习与作业；本章小结 → 小结；
- 课后作业与拓展 → 拓展作业；本章导读 → 本章场景；
- metadata 增加 training_platform_version 与 tags 中的 实训平台。

用法：python scripts/convert-training-style.py [--dry-run]
"""

import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"
TRAINING_VERSION = "2026-08-16-training-v1"

DROP_UNIVERSITY = [
    "教学信息", "三维教学目标", "教学目标", "教学重难点", "知识结构图",
    "思考与讨论", "参考资料", "板书",
]
DROP_PROGRESSIVE = [
    "本章板书", "学习目标", "运行后应观察", "学习路线", "初学者学习路线",
    "先做一个小检查", "先解决一个小问题", "学习主线", "本模块练习方式",
    "这章为什么先学", "开始前确认", "本章三级目录", "板书",
]

RENAME = [
    ("上机实验", "本章实训"),
    ("教学实验", "本章实训"),
    ("重点专题与易错点", "易错点提醒"),
    ("常见误区", "易错点提醒"),
    ("课堂练习", "练习与作业"),
    ("综合练习", "练习与作业"),
    ("课后作业与拓展", "拓展作业"),
    ("本章小结", "小结"),
    ("本章导读", "本章场景"),
    ("常用工具一览", "工具速查"),
    ("常用方法一览", "工具速查"),
    ("常用运算符与内置函数一览", "工具速查"),
    ("常用内置函数", "工具速查"),
]

def source_text(cell):
    s = cell.get("source", "")
    return "".join(s) if isinstance(s, list) else str(s or "")

def heading_of(text):
    for line in text.splitlines():
        m = re.match(r"^#{1,2} (.*)$", line)
        if m:
            return m.group(1).strip()
    return ""

def bare_heading(heading):
    return re.sub(r"^\d+[.\-]?\d*\s*", "", heading)

def should_drop(heading, style):
    rules = DROP_UNIVERSITY if style == "university" else DROP_PROGRESSIVE
    bare = bare_heading(heading)
    for kw in rules:
        if kw in bare:
            return kw
    return None

def rename_heading(heading):
    m = re.match(r"^(\d+[.\-]?\d*\s*)(.*)$", heading)
    prefix = m.group(1) if m else ""
    bare = m.group(2) if m else heading
    for old, new in RENAME:
        if bare.startswith(old):
            suffix = bare[len(old):]
            return prefix + new + suffix
    return heading

def classify(joined):
    if "教学信息" in joined or "三维教学目标" in joined or "教学重难点" in joined:
        return "university"
    if "本章板书" in joined or "学习目标" in joined or "学习主线" in joined:
        return "progressive"
    return "university"

def convert(path, dry_run=False):
    nb = json.loads(path.read_text(encoding="utf-8"))
    joined = "\n".join(source_text(c) for c in nb.get("cells", []) if c.get("cell_type") == "markdown")
    style = classify(joined)
    out = []
    dropped = []
    renamed = []
    first_md_done = False
    for cell in nb.get("cells", []):
        if cell.get("cell_type") != "markdown":
            out.append(cell)
            continue
        text = source_text(cell)
        head = heading_of(text)
        if not head:
            out.append(cell)
            continue
        if not first_md_done:
            first_md_done = True
            # 标题 cell：裁掉 板书树 及其后的目录树（从 "## N.0" 开始）
            lines = text.splitlines()
            cut = -1
            for li, ln in enumerate(lines):
                if re.match(r"^##\s+\d+\.0\s*", ln):
                    cut = li
                    break
            if cut >= 0:
                kept_lines = lines[:cut]
                # 去掉末尾空行
                while kept_lines and not kept_lines[-1].strip():
                    kept_lines.pop()
                new_text = "\n".join(kept_lines) + ("\n" if kept_lines else "")
                if new_text != text:
                    cell = dict(cell)
                    cell["source"] = new_text
                    text = new_text
                    head = heading_of(text)
        kw = should_drop(head, style)
        if kw:
            dropped.append(head)
            continue
        new_head = rename_heading(head)
        if new_head != head:
            renamed.append(head + " -> " + new_head)
            cell = dict(cell)
            cell["source"] = text.replace(head, new_head, 1)
        out.append(cell)
    if not dry_run:
        meta = dict(nb.get("metadata") or {})
        meta["training_platform_version"] = TRAINING_VERSION
        tags = list(meta.get("tags") or [])
        if "实训平台" not in tags:
            tags.append("实训平台")
        meta["tags"] = tags
        nb["metadata"] = meta
        nb["cells"] = out
        path.write_text(json.dumps(nb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return style, dropped, renamed, len(out), "converted"

def main():
    dry = "--dry-run" in sys.argv
    files = sorted(COURSE.glob("course-chapter-*.ipynb"))
    stats = {"university": 0, "progressive": 0, "dropped": 0, "renamed": 0, "converted": 0, "skipped": 0}
    for f in files:
        try:
            r = convert(f, dry_run=dry)
            if r is None:
                stats["skipped"] += 1
                continue
            style, dropped, renamed, cells, status = r
            stats[style] += 1
            stats["dropped"] += len(dropped)
            stats["renamed"] += len(renamed)
            if status == "converted":
                stats["converted"] += 1
            print(f"{f.name}: {style} | cells={cells} | drop={len(dropped)} rename={len(renamed)}")
            for d in dropped:
                print("    - DROP: " + d)
            for rn in renamed:
                print("    ~ " + rn)
        except Exception as e:
            print(f"{f.name}: ERROR {e}")
    print("----")
    print(json.dumps(stats, ensure_ascii=False))
    print("dry-run" if dry else "applied")

if __name__ == "__main__":
    main()