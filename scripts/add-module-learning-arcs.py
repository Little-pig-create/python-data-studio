#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add a concise, continuous application arc to non-Python course modules.

The existing chapter teaching content stays intact.  This script only adds an
idempotent block after the first H1 so students can see how the current chapter
inherits the previous capability and moves toward the module capstone.
"""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
COURSE_DIR = ROOT / "public" / "course"
CATALOG_PATH = COURSE_DIR / "catalog.json"
START = "<!-- module-learning-arc:start -->"
END = "<!-- module-learning-arc:end -->"


ARCS = {
    "numpy": {
        "name": "NumPy",
        "context": "为区域仓库建立补货预警矩阵：把门店、商品、库存和需求组织成数组，逐步完成定位、广播计算、排序和抽样复核。",
        "capstone": "连锁门店补货预警矩阵",
        "capstone_goal": "把数组建模、风险筛选、广播计算和抽样复核组合成一份可执行的补货清单",
        "phases": [(0, 0, "从列表计算过渡到数组思维"), (1, 1, "建立 ndarray 数据模型"), (2, 2, "定位与筛选业务片段"), (3, 3, "调整并组合分析结构"), (4, 4, "用广播替代重复循环"), (5, 99, "用统计与抽样形成判断")],
    },
    "pandas": {
        "name": "Pandas",
        "context": "搭建电商履约异常追踪台：把订单、客户、商品和履约信息整理成安全合并的事实表，再生成趋势指标和异常工单。",
        "capstone": "电商履约异常追踪台",
        "capstone_goal": "从多表质量审计走到订单粒度事实表、窗口趋势和可复核异常工单",
        "phases": [(0, 0, "认识表格分析工作流"), (1, 2, "读懂并定位表中信息"), (3, 5, "修正类型并建立干净字段"), (6, 6, "让分析结果可以保存与复现"), (7, 7, "从明细得到分组指标"), (8, 8, "连接多张业务表"), (9, 99, "沿时间观察变化与趋势")],
    },
    "matplotlib": {
        "name": "Matplotlib",
        "context": "制作经营周会一页报告：把趋势、比较、分布和异常证据组织成有主次、可直接用于会议的静态页面。",
        "capstone": "经营周会一页报告",
        "capstone_goal": "从周会问题出发选择互补图形，完成视觉层级、注释审阅与独立导出",
        "phases": [(0, 1, "掌握 Figure / Axes 绘图骨架"), (2, 3, "表达趋势与类别比较"), (4, 7, "观察关系、分布与构成"), (8, 9, "表达不确定性与多视角证据"), (10, 99, "组合、美化并交付完整报告")],
    },
    "seaborn": {
        "name": "Seaborn",
        "context": "开展客群消费行为差异研究：先固定样本和统计语义，再比较分布、关系和分面结果，判断差异是否稳定。",
        "capstone": "客群消费行为差异研究",
        "capstone_goal": "从样本口径和分布比较走到关系验证、分面研究与因果边界说明",
        "phases": [(0, 1, "建立整洁数据与统计绘图语义"), (2, 8, "比较类别频数、水平与组内分布"), (9, 11, "读懂连续变量的整体分布"), (12, 15, "探索变量关系与趋势"), (16, 99, "组织多变量、矩阵和分面证据")],
    },
    "plotly": {
        "name": "Plotly",
        "context": "准备周度经营预警会：让读者通过悬停、缩放、下钻和层级探索，沿着异常、定位、行动的路径完成追问。",
        "capstone": "周度经营预警会：交互诊断与行动看板",
        "capstone_goal": "把诊断和行动视图组织成支持经营预警决策的可分享 HTML",
        "phases": [(0, 1, "建立交互图结构与 Hover 体验"), (2, 5, "交互探索趋势、类别和变量关系"), (6, 9, "交互观察分布与矩阵"), (10, 15, "表达层级、流程、贡献与地域"), (16, 99, "组合控件、子图并完成交付")],
    },
    "projects": {
        "name": "综合项目",
        "context": "进入数据分析决策实验室：连续处理客户价值、物流履约、供需调度和营销资源四类问题，训练从业务问题到行动建议的迁移能力。",
        "capstone": "跨模块业务决策项目",
        "capstone_goal": "把前四个项目形成的方法迁移为项目提案、最短充分证据链和决策备忘录",
        "phases": [(0, 0, "从交易明细理解客户价值"), (1, 1, "从多表数据诊断履约问题"), (2, 2, "从历史变化支持资源规划"), (3, 99, "从有限资源走向优先级决策")],
    },
    "machine-learning": {
        "name": "机器学习",
        "context": "建设可信预测系统：从统一训练流程开始，比较模型、处理不平衡、选择阈值、解释结果并保存完整 Pipeline，最终回答模型能否安全投入使用。",
        "capstone": "模型上线评审会",
        "capstone_goal": "把候选模型变成经过预测合同、泄漏审计、业务阈值、错误分析和模型卡检查的上线建议",
        "phases": [(0, 2, "建立训练、切分与预处理工作流"), (3, 12, "扩展监督/无监督模型工具箱"), (13, 21, "从模型分数走向业务评价与阈值"), (22, 24, "深入客户分群与降维表达"), (25, 29, "调优、比较、解释并保存模型"), (30, 99, "把完整流程迁移到真实项目")],
    },
}


def source_text(cell: dict) -> str:
    source = cell.get("source", "")
    return "".join(source) if isinstance(source, list) else str(source or "")


def source_lines(text: str) -> list[str]:
    return [line + "\n" for line in text.rstrip().splitlines()]


def clean_title(title: str) -> str:
    return re.sub(r"^\s*\d+[.、]\s*", "", title).strip()


def notebook_title(notebook: dict, fallback: str) -> str:
    for cell in notebook.get("cells", []):
        if cell.get("cell_type") != "markdown":
            continue
        match = re.search(r"^#\s+(.+)$", source_text(cell), re.MULTILINE)
        if match:
            return clean_title(match.group(1))
    return clean_title(fallback)


def phase_for(config: dict, position: int) -> str:
    for start, end, label in config["phases"]:
        if start <= position <= end:
            return label
    raise ValueError(f"no phase configured for position {position}")


def insert_or_replace_arc(source: str, block: str) -> str:
    pattern = re.compile(re.escape(START) + r".*?" + re.escape(END), re.DOTALL)
    if pattern.search(source):
        return pattern.sub(block, source)
    heading = re.search(r"^#\s+.+$", source, re.MULTILINE)
    if not heading:
        return block + "\n\n" + source
    return source[:heading.end()] + "\n\n" + block + source[heading.end():]


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    changed = 0
    for module, config in ARCS.items():
        items = [
            item for item in catalog["chapters"]
            if item.get("module") == module and item.get("kind") in {"intro", "lesson", "project"}
        ]
        items.sort(key=lambda item: item.get("sortOrder", item.get("chapter", 0)))
        records = []
        for item in items:
            path = ROOT / "public" / item["path"].lstrip("/")
            notebook = json.loads(path.read_text(encoding="utf-8"))
            records.append((item, path, notebook, notebook_title(notebook, item.get("title", item["id"]))))

        for index, (item, path, notebook, title) in enumerate(records):
            previous_title = records[index - 1][3] if index else "模块入门与应用任务"
            next_title = records[index + 1][3] if index + 1 < len(records) else f"模块大作业《{config['capstone']}》"
            phase = phase_for(config, index)
            block = f"""{START}
> **{config['name']} 模块主线｜第 {index + 1} / {len(records)} 步：{phase}**
>
> **持续应用背景：** {config['context']}
>
> **承接上一阶段：** {previous_title}  →  **本章任务：** {title}  →  **下一步：** {next_title}
>
> **大作业连接：** 本章练习将成为《{config['capstone']}》的一部分，最终需要{config['capstone_goal']}。
{END}"""
            target = next((cell for cell in notebook.get("cells", []) if cell.get("cell_type") == "markdown"), None)
            if target is None:
                raise ValueError(f"{path} has no markdown cell")
            old_source = source_text(target)
            new_source = insert_or_replace_arc(old_source, block)
            metadata = dict(notebook.get("metadata") or {})
            metadata["module_learning_arc_version"] = "2026-08-17-v1"
            notebook["metadata"] = metadata
            if new_source != old_source:
                target["source"] = source_lines(new_source)
                changed += 1
            path.write_text(json.dumps(notebook, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"updated {module}: {path.name} -> {phase}")

    print(f"module learning arcs updated: {changed} notebooks")


if __name__ == "__main__":
    main()
