# -*- coding: utf-8 -*-
"""修复 ch39（显示第45章 数据结构与主题）被破坏的「适用场景」单元格。

损坏情况：cell[3] 把「适用场景 + 数据结构 + 本章练习任务」三段无换行挤成一行，
「背景引入」被挤到标题行，编号错为 39.7/39.8，标准可视化结构应无独立 45.x 三段，
导致后续 45.2 速查…45.14 小结整体编号偏移 +2，且 cell[9] 残留 39.4 陈旧引用。

本脚本：
  1) 重建 cell[3] 为规范三段（45.1 适用场景 / 45.2 数据结构 / 45.3 本章练习任务）。
  2) 把 cell[3] 之后所有标题编号 45.N(>1)[.M] 整体 +2（45.2→45.4 … 45.14→45.16）。
  3) 修正 cell[9] 中 `39.4 基础图表` 为 `45.6 基础图表`。

幂等：重建后 cell[3] 含「## 45.2 数据结构」即视为已完成，跳过。
只重建/重编号目标 markdown 细胞的 source，保留 cell id / metadata。
"""
import json, os, sys, shutil, re

sys.stdout.reconfigure(encoding="utf-8")

ROOT = r"D:\Research\Python数据工作台_2026-07-22"
COURSE = os.path.join(ROOT, "public", "course")
BACKUP = os.path.join(ROOT, ".backup-ch39-fix")
TARGET = os.path.join(COURSE, "course-chapter-39.ipynb")

# 重建后的 cell[3] 内容（规范三段）
NEW_CELL3 = (
    "## 45.1 适用场景\n\n"
    "**背景引入**：面对一张几十万行的数据表，靠肉眼逐行找规律几乎不可能——我们需要把关系“画”出来。"
    "这一章用 Seaborn 教你直接用 DataFrame 完成统计聚合、分类映射和统一视觉风格：数据在表里怎么组织，"
    "决定了图画出来能不能让人一眼看懂。先解决“表怎么放”这个前置问题，后面的图表才能又好又省力。\n\n"
    "使用DataFrame直接完成统计聚合、分类映射和统一视觉风格。\n\n"
    "## 45.2 数据结构\n\n"
    "优先使用每行一个观察、每列一个变量的长表。\n\n"
    "**打个比方**：长表就像一份班级花名册——每一行是一个学生、每一列是他的一个属性（姓名/年龄/成绩）；"
    "宽表则像把全班每个学生的成绩摊成一大张横表。Seaborn 的绘图函数只认‘花名册’，"
    "给它横着摊开的宽表，它反而分不清哪一列才是要比较的。\n\n"
    "## 45.3 本章练习任务\n\n"
    "运行基础图表后，完成以下任务：\n\n"
    "1. 将 sns.axes_style(\"ticks\") 改为 \"whitegrid\" 或 \"dark\"，对比不同主题风格\n"
    "2. 修改 palette 参数从 \"Set2\" 为 \"pastel\" 或 \"muted\"，观察调色板变化\n"
    "3. 在 scatterplot 中添加 style=\"channel\" 参数，观察形状映射与颜色映射的组合效果\n"
)

def src(c):
    s = c.get("source", [])
    return "".join(s) if isinstance(s, list) else s


def bump_heading(line):
    """对 `## 45.N[.M]` 标题加 2；非标题行原样返回。"""
    m = re.match(r"^(#{2,3})\s+45\.(\d+)(\.\d+)?\s", line)
    if not m:
        return line
    n = int(m.group(2)) + 2
    return f"{m.group(1)} 45.{n}{m.group(3) or ''} " + line[m.end():]


def main():
    os.makedirs(BACKUP, exist_ok=True)
    shutil.copy2(TARGET, os.path.join(BACKUP, "course-chapter-39.ipynb"))
    with open(TARGET, "r", encoding="utf-8") as fh:
        nb = json.load(fh)
    cells = nb["cells"]

    cur = src(cells[3])
    if "## 45.2 数据结构" in cur:
        print("[SKIP] 已修复")
        return

    # 1) 重建 cell[3]
    cells[3]["source"] = NEW_CELL3.splitlines(keepends=True)

    # 2) 重编号 cell[3] 之后所有 45.N(>1) 标题（含 ### 45.N.M）→ +2
    for c in cells[4:]:
        if c.get("cell_type") != "markdown":
            continue
        raw = c.get("source", [])
        if isinstance(raw, str):
            raw = [raw]
        new_lines = [bump_heading(ln) for ln in raw]
        c["source"] = new_lines

    # 3) 修正 cell[9] 的 39.4 引用
    c9 = cells[9]
    c9_src = "".join(c9.get("source", []))
    if "39.4" in c9_src:
        c9_src = c9_src.replace("39.4 基础图表", "45.6 基础图表")
        c9["source"] = c9_src.splitlines(keepends=True)

    with open(TARGET, "w", encoding="utf-8") as fh:
        json.dump(nb, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    print("[OK] ch39 已修复并级联重编号")


if __name__ == "__main__":
    main()
