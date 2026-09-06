#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
重写 module-capstone-python.ipynb
规则：纯背景 + 需求，无提示，无骨架代码，游戏叙事风格
"""
import json, os, sys

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "course", "module-capstones", "module-capstone-python.ipynb")

def md_cell(source, cell_id=None):
    c = {"cell_type": "markdown", "metadata": {}, "source": [source]}
    if cell_id:
        c["id"] = cell_id
    return c

def code_cell(source, cell_id=None):
    c = {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [source],
    }
    if cell_id:
        c["id"] = cell_id
    return c

# ── 单元格内容 ───────────────────────────────────────────────

TITLE = """\
# 模块大作业：极客联赛·成绩数据救援

**模块一知识综合练习**"""

BACKGROUND = """\
## 1. 背景故事

「极客联赛」是本校年度编程竞技活动，共有 100 名参赛同学（学生001 – 学生100）\
参加了四个关卡挑战：

| 关卡编号 | 关卡名称 |
|---|---|
| 关卡 A | Python基础 |
| 关卡 B | 字符串与列表 |
| 关卡 C | 字典与函数 |
| 关卡 D | 文件操作 |

每个关卡满分 100 分，成绩由记录员写入 `/datasets/module1_scores.csv`。

**突发状况**：比赛结束后，赛务组发现记录员的脚本存在 bug——原始文件中混入了若干\
问题记录。颁奖典礼定在今天下午，赛事委员会需要你在典礼前提交一份完整、干净的统计报告，\
否则无法宣布比赛结果。

你的任务：从原始文件读取数据，完成清洗、统计分析，并输出多格式报告。"""

DATA_INFO = """\
## 2. 数据说明

**文件路径**：`/datasets/module1_scores.csv`

**字段说明**：

| 字段名 | 含义 |
|---|---|
| `student` | 参赛者编号（如 `学生001`） |
| `subject` | 关卡名称（如 `Python基础`） |
| `score` | 该关卡得分 |

**已知数据问题**（需要在代码中识别并处理，处理策略由你决定，需在报告中说明理由）：

- 部分记录的 `student`、`subject` 或 `score` 字段为空
- 部分 `score` 字段包含中文数字（如"九十分"）或 `N/A`、`缺考` 等非数值内容
- 存在同一参赛者对同一关卡的重复记录
- 缺少字段的记录（如只有参赛者编号，其他字段缺失）"""

TASKS = """\
## 3. 任务要求

请用 Python 完成以下任务，将所有实现代码写在本 Notebook 中，并确保从头到尾可完整运行。

**3.1 文件与目录准备**

- 使用 `os.path.exists` 验证 `/datasets/module1_scores.csv` 是否存在
- 创建输出目录 `output/module1_capstone`（使用 `os.makedirs`，若目录已存在不报错）
- 使用 `os.path.abspath` 打印输出目录的绝对路径

**3.2 数据读取与清洗**

- 使用 `open` 和 `csv.DictReader` 读取原始文件
- 使用字符串方法清理字段首尾空白
- 识别并剔除无效记录：任意字段为空、`score` 无法转为整数、同一参赛者对同一关卡的重复记录
- 用合适的数据结构（列表、元组、字典、集合）分别记录有效记录和被剔除的记录

**3.3 统计分析**

使用**函数**封装以下统计逻辑（至少定义 4 个函数），结果保存到字典结构中：

- 每位参赛者的总分和平均分（平均分保留两位小数）
- 每个关卡的最高分、最低分、平均分和有效参赛人数
- 总分排名前 5 的参赛者（使用 `sorted` 和 `enumerate`）

**3.4 文件输出**

在 `output/module1_capstone/` 目录下输出以下三个文件：

- `leaderboard.csv`：前 5 名排行榜，字段为名次、参赛者、总分、平均分，使用 `csv.writer`
- `summary.json`：每个关卡的统计汇总，使用 `json.dump`（确保中文可正常读取）
- `report.txt`：纯文本报告，包含数据清洗说明、前 5 名榜单，以及**至少 3 条**可由数据支撑的分析结论

**3.5 异常处理**

- 对文件读取操作使用 `try/except` 包裹，发生异常时打印友好提示信息
- 对 `score` 字段的数值转换使用 `try/except` 捕获 `ValueError`

**3.6 限制条件**

- 只能使用 Python 标准库（`os`、`csv`、`json` 等），**不得**使用 `pathlib`、`pandas` 或任何第三方库
- 不得从网络下载数据"""

ACCEPTANCE = """\
## 4. 验收标准

提交的 Notebook 需满足以下全部标准：

- 所有代码 Cell 均已运行，无未处理的异常
- `output/module1_capstone/` 目录下存在 `leaderboard.csv`、`summary.json`、`report.txt` 三个文件
- 代码中至少定义了 4 个自定义函数，并通过调用函数产生结果
- `report.txt` 包含数据清洗说明和至少 3 条可由数据支撑的分析结论
- 代码中未使用 `pathlib` 或任何第三方库"""

SELFCHECK = """\
## 5. 提交前自检

- [ ] 使用 `os` 完成目录和路径操作，没有使用 `pathlib`
- [ ] 使用了字符串方法、列表、元组、字典、集合处理数据
- [ ] 至少定义了 4 个函数，并通过调用函数得到结果
- [ ] 使用了 `if`、循环、`try/except` 进行流程控制和异常处理
- [ ] 输出了 CSV、JSON、TXT 三种格式的文件
- [ ] `report.txt` 包含至少 3 条数据分析结论
- [ ] Notebook 从顶到底可完整运行，无未处理异常"""

RUBRIC = """\
## 6. 评分参考

| 评分项 | 分值 |
|---|---:|
| 任务理解与问题定义 | 10 |
| 数据处理与核心知识点运用 | 35 |
| 统计结果与文件输出 | 20 |
| 结论分析与报告质量 | 20 |
| 代码规范与可复现性 | 15 |"""

CAPSTONE_CHECK_MD = """\
## 模块大作业完成自检

这是最后的代码作业小节，向上滚动检查每一个学习小节的 Cell，确保问题定义、\
数据处理、核心代码、可读输出和结论这几个方面都有一个可核对的结果。"""

CAPSTONE_CHECK_CODE = """\
required_outputs = ["问题定义和数据来源", "数据质量检查", "核心结果", "可解释的表格或图形", "限制和下一步"]
for item in required_outputs: print("交付检查项:", item)
print("检查完成后再提交独立模块大作业。")"""

CAPSTONE_CHECK_SUMMARY = """\
### 完成标准

- 代码运行核对结果流程顺畅、可复现；
- 问题来源、数据来源、字段和结果可追溯；
- 关键结论有证据；
- 限制和后续迭代方向清晰；
- 使用打印或输出文件支撑中间检查。"""

# ── 组装 cells ────────────────────────────────────────────────

cells = [
    md_cell(TITLE),
    md_cell(BACKGROUND),
    md_cell(DATA_INFO),
    md_cell(TASKS),
    md_cell(ACCEPTANCE),
    md_cell(SELFCHECK),
    md_cell(RUBRIC),
    md_cell(CAPSTONE_CHECK_MD, cell_id="capstone-check-md"),
    code_cell(CAPSTONE_CHECK_CODE, cell_id="capstone-check-code"),
    md_cell(CAPSTONE_CHECK_SUMMARY, cell_id="capstone-check-summary"),
]

# ── 元数据（更新标题与标签）────────────────────────────────────

nb_metadata = {
    "language_info": {"name": "python"},
    "course_role": "module-capstone",
    "module": "python",
    "course_id": "capstone-python",
    "chapter": 11,
    "sort_order": 11.5,
    "chapter_title": "极客联赛·成绩数据救援",
    "chapter_label": "极客联赛·成绩数据救援",
    "chapter_module": "python",
    "chapter_kind": "capstone",
    "estimated_minutes": 120,
    "tags": ["os 文件操作", "字典与函数", "字符串与列表", "数据清洗"],
    "teaching_enhancement_version": "2026-08-02-clean-requirements-v1",
}

nb = {
    "nbformat": 4,
    "nbformat_minor": 5,
    "metadata": nb_metadata,
    "cells": cells,
}

out_path = os.path.normpath(OUT)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(nb, f, ensure_ascii=False, indent=1)

print("Written:", out_path)
print("Cells:", len(cells))
