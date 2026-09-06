# -*- coding: utf-8 -*-
"""渐进风格章节规范化：补齐 本章场景 开场 cell（占位，待逐章精修替换）。

- 对没有 本章场景/本章板书 残留的 course-chapter-15..111：在标题 cell 后插入场景 cell；
- 场景内容为通用模板（含章节标题与模块上下文），逐章精修时替换为具体内容；
- 幂等：已有场景的章节跳过。

用法：python scripts/normalize-progressive-scene.py [--dry-run]
"""

import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"

MODULE_MAP = {
    "numpy": "NumPy 数组计算",
    "pandas": "Pandas 表格数据处理",
    "matplotlib": "Matplotlib 基础绘图",
    "seaborn": "Seaborn 统计图表",
    "plotly": "Plotly 交互式图表",
    "projects": "综合项目实战",
    "machine-learning": "机器学习建模",
}

def src_text(cell):
    s = cell.get("source", "")
    return "".join(s) if isinstance(s, list) else str(s or "")

def main():
    dry = "--dry-run" in sys.argv
    files = sorted([f for f in COURSE.glob("course-chapter-*.ipynb") if f.name != "course-chapter-time.ipynb"])
    stats = {"added": 0, "skipped": 0}
    for f in files:
        try:
            nb = json.loads(f.read_text(encoding="utf-8"))
            cells = nb.get("cells", [])
            joined = "\n".join(src_text(c) for c in cells if c.get("cell_type") == "markdown")
            # 跳过已有场景或已转换的大学风格章节（它们有自己的场景/学习路线）
            if "本章场景" in joined or "本章场景：" in joined or "本章板书" in joined:
                stats["skipped"] += 1
                continue
            # 从标题 cell 提取章节标题与编号
            title_text = src_text(cells[0]) if cells else ""
            import re
            m = re.match(r"^#\s*\d+\.\s*(.+)$", title_text.strip(), re.M)
            title = m.group(1).strip() if m else f.name
            module = nb.get("metadata", {}).get("chapter_module", "")
            module_label = MODULE_MAP.get(module, "数据分析")
            scene = (
                "## 本章场景\n\n"
                + f"本章属于 **{module_label}** 模块，主题是「{title}」。"
                + "\n\n先用最少的篇幅把核心概念讲清楚，再通过示例与实训掌握实际操作，最后用练习检验。"
                + "\n\n**学习路线**：核心概念 → 方法速查 → 示例 → 实训 → 易错点 → 练习与作业。"
                + "\n"
            )
            scene_cell = {"cell_type": "markdown", "metadata": {}, "source": [l + "\n" for l in scene.splitlines()]}
            if not dry:
                nb["cells"] = [cells[0], scene_cell] + cells[1:]
                f.write_text(json.dumps(nb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            stats["added"] += 1
        except Exception as e:
            print(f"{f.name}: ERROR {e}")
    print("----")
    print(json.dumps(stats, ensure_ascii=False))
    print("dry-run" if dry else "applied")

if __name__ == "__main__":
    main()