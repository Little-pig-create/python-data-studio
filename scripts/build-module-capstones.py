#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build eight student-owned module capstones with hidden reference answers."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "course" / "module-capstones"


def source_lines(text: str):
    text = text.strip() + "\n"
    return text.splitlines(keepends=True)


def cell_id(logical_path: str, cell_type: str, source: str, tags, occurrence: int):
    cell_key = hashlib.sha256(
        json.dumps(
            {"cell_type": cell_type, "source": source, "tags": tags},
            ensure_ascii=False,
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()
    return "cell-" + hashlib.sha256(
        f"{logical_path}\0{cell_key}\0{occurrence}".encode("utf-8")
    ).hexdigest()[:20]


def markdown(text: str, tags=None):
    return {"cell_type": "markdown", "metadata": {"tags": tags or []}, "source": source_lines(text)}


def code(text: str, tags=None):
    return {
        "cell_type": "code",
        "metadata": {"tags": tags or ["capstone-stage"]},
        "execution_count": None,
        "outputs": [],
        "source": source_lines(text),
    }


def notebook(filename: str, module: str, title: str, minutes: int, tags, cells):
    logical = f"public/course/module-capstones/{filename}"
    occurrences = {}
    normalized = []
    for item in cells:
        cell_type = item["cell_type"]
        source = "".join(item["source"])
        cell_tags = item.get("metadata", {}).get("tags", [])
        key = json.dumps(
            {"cell_type": cell_type, "source": source, "tags": cell_tags},
            ensure_ascii=False,
            sort_keys=True,
        )
        occurrence = occurrences.get(key, 0)
        occurrences[key] = occurrence + 1
        item["id"] = cell_id(logical, cell_type, source, cell_tags, occurrence)
        normalized.append(item)

    fingerprint_payload = [
        {
            "cell_type": item["cell_type"],
            "source": "".join(item["source"]),
            "tags": item.get("metadata", {}).get("tags", []),
        }
        for item in normalized
    ]
    fingerprint = hashlib.sha256(
        json.dumps(fingerprint_payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()[:24]
    return {
        "cells": normalized,
        "metadata": {
            "language_info": {"name": "python"},
            "course_role": "module-capstone",
            "course_id": f"capstone-{module}",
            "module": module,
            "chapter_kind": "capstone",
            "kind": "capstone",
            "title": title,
            "estimated_minutes": minutes,
            "tags": tags,
            "notebook_architecture_version": "2026-08-17-capstone-v3",
            "cell_id_scheme": "content-sha256-v1",
            "content_fingerprint": fingerprint,
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }


COMMON_FOOTER = """
## 提交前验收

请先重启内核，再按顺序运行所有代码单元。最低提交物必须能在输出目录中重新打开；
结论只能描述这份教学快照，不能推断为现实世界的因果结论。
"""


# 每个代码阶段都有一段短引导，避免学生面对大段代码却不知道先看什么、改什么。
# 元组依次为：阶段标题、为什么做、操作要点、完成后观察什么。
GUIDANCE = {
    "python": [
        ("阶段 1｜定位输入和输出", "先确认文件与输出目录，后面所有步骤才能有稳定位置。",
         "运行后先看输入文件名和输出目录绝对路径；路径不存在时不要继续修改统计逻辑。",
         "应看到 module1_ledger.csv 与 output/module1_capstone。"),
        ("阶段 2｜把清洗规则封装成函数", "脏数据处理要有明确规则，不能靠静默删除。",
         "从 clean_text、parse_record、read_and_clean 依次阅读；重点看日期、金额、重复记录如何被判定。",
         "应看到有效/剔除记录数，以及每种剔除原因。"),
        ("阶段 3｜从记录得到年度指标", "先分清收入与支出，再按月和分类聚合。",
         "观察 monthly_expense、category_expense 和 annual_totals 的输入/输出；尝试改动一个分类名称验证规则。",
         "应看到年度收支、最高支出月份和前五分类。"),
        ("阶段 4｜将结果变成可提交文件", "Notebook 输出会消失，交付文件才能复核。",
         "确认三个文件分别保存了错误记录、月度汇总和文字结论；不要只打印而不落盘。",
         "应看到 rejected_records.csv、monthly_summary.csv、report.txt。"),
        ("阶段 5｜用验收条件检查提交物", "最后检查的是证据，而不是代码是否看起来很长。",
         "逐项阅读 checks；如果失败，回到对应阶段修复，不要删除验收代码。",
         "所有项目都应显示“通过”。"),
    ],
    "numpy": [
        ("阶段 1｜生成可复现的原始信号", "固定随机种子才能让同学复核同一批异常点。",
         "先看三个通道如何组成二维数组，以及人为注入了哪些缺失和尖峰。",
         "应看到 shape、dtype、维度和随机种子。"),
        ("阶段 2｜检查质量并标准化", "异常检测前必须先处理 NaN、无穷值，并说明按列还是按行计算。",
         "关注 axis=0 的含义；比较 raw、clean 和 standardized 三个数组。",
         "应看到每通道无效值数和 z-score 异常数量。"),
        ("阶段 3｜汇总统计并抽样复核", "摘要告诉我们整体状况，抽样让我们能回到具体行。",
         "阅读分位数、summary 和 sample_index 的计算；不要把通道和时间轴混淆。",
         "应看到每通道统计、8 个抽样行号和异常位置。"),
        ("阶段 4｜比较循环与向量化", "同一结果不代表同一效率，数组场景应优先验证向量化收益。",
         "先确认两种结果一致，再解释耗时差异；不要只比较一次极短的计算。",
         "应看到一致性 True 与加速倍数。"),
        ("阶段 5｜导出质量摘要", "异常点需要能被其他人重新打开和检查。",
         "查看 CSV 的列名，确认异常位置、通道、z-score 和原始值都保留。",
         "应看到通道统计表和异常清单文件。"),
        ("阶段 6｜最终验收", "将数组、复现、性能和交付物放在同一次检查中。",
         "如果某项失败，先查该阶段的中间变量，不要直接改验收条件。",
         "所有项目都应显示“通过”。"),
    ],
    "pandas": [
        ("阶段 1｜读取多表并确认字段", "多表项目最常见的问题是读错文件或误解每张表的粒度。",
         "先看四张表的行列数；订单、明细、客户、商品的主键含义要能说清。",
         "应看到四张源表的规模。"),
        ("阶段 2｜先做数据质量审计", "清洗前要留下基线，才能解释数据为何被保留或剔除。",
         "观察重复行、缺失单元格和主键重复；把异常数量记入报告。",
         "应看到每张表的行数、重复数和缺失数。"),
        ("阶段 3｜按订单粒度合并", "订单明细直接连接会重复订单金额，必须先聚合回订单。",
         "先读 order_amounts，再读 fact；重点理解 validate 和 indicator 如何暴露连接问题。",
         "应看到连接损失、分析订单数和销售额合计。"),
        ("阶段 4｜构造经营指标和窗口趋势", "聚合指标要统一口径，窗口指标要按时间排序后解释。",
         "分别查看月度、州、品类和透视表；尝试解释累计销售额与三月移动平均的区别。",
         "应看到月度指标和销售额前五州。"),
        ("阶段 5｜导出可复用分析表", "后续画图或写报告应读取已清洗的结果，而不是重复做合并。",
         "确认事实表、指标表和经营发现均写入同一输出目录。",
         "应看到五份导出文件。"),
        ("阶段 6｜最终验收", "连接粒度、窗口计算和导出文件缺一不可。",
         "逐项检查；若订单 id 不唯一，回到合并阶段检查是否先聚合明细。",
         "所有项目都应显示“通过”。"),
    ],
    "matplotlib": [
        ("阶段 1｜读取快照并理解字段", "先知道每列代表什么，图表选型才有依据。",
         "查看类别样本数和四个基础统计量；不要把 target 当连续特征解释。",
         "应看到数据形状、类别计数和统计摘要。"),
        ("阶段 2｜制作一页综合报告", "每个子图只回答一个问题，坐标轴、标题和图例必须完整。",
         "依次阅读四个 axes 的代码：数量、分布、关系、组间差异；查看最大值注释的位置。",
         "应看到 PNG 和 SVG 报告文件。"),
        ("阶段 3｜补充多指标热力图", "当特征多时，标准化均值比原始数值更容易横向比较。",
         "关注标准化的参照是整体均值和标准差；颜色表示相对高低，不代表好坏。",
         "应看到按类别排列的特征热力图。"),
        ("阶段 4｜写下图表结论", "图表不是结论本身，必须说明观察、适用边界和限制。",
         "将文字结论逐一对应回图表；避免把类别差异写成因果关系。",
         "应看到 chart_notes.md。"),
        ("阶段 5｜最终验收", "检查导出文件、图表标注和说明是否齐全。",
         "若标题或坐标轴为空，回到综合报告阶段补齐。",
         "所有项目都应显示“通过”。"),
    ],
    "seaborn": [
        ("阶段 1｜先处理缺失与类别字段", "统计图的样本口径必须在绘图前固定。",
         "比较原始样本与 clean 的行数；确认哪些关键字段被要求非空。",
         "应看到缺失值计数和各类别数量。"),
        ("阶段 2｜用四张互补图建立直觉", "频数、分布、组间差异和变量关系不能由一张图替代。",
         "按左上到右下阅读：类别构成、体重分布、鳍长比较、喙部关系。",
         "应看到 penguins_overview.png。"),
        ("阶段 3｜观察多变量和相关结构", "pairplot 用于发现线索，热力图用于比较线性相关强弱。",
         "先找最明显的模式，再回到具体字段确认；相关系数不是因果效应。",
         "应看到 pairplot 与相关热力图。"),
        ("阶段 4｜分面比较并写观察", "同一趋势可能在不同物种中不同，分面可以避免混合样本误读。",
         "比较每个物种面板中的性别分组；阅读 observations 的因果边界说明。",
         "应看到分面回归图和 observations.md。"),
        ("阶段 5｜最终验收", "检查图形、样本口径、相关边界和说明是否同时存在。",
         "若因果边界缺失，补充解释而不是修改数据来迎合结论。",
         "所有项目都应显示“通过”。"),
    ],
    "plotly": [
        ("阶段 1｜构造驾驶舱口径", "交互图前先确定时间、用户类型、天气和总租借量的含义。",
         "查看日期时间、工作日和天气标签如何构造；确认 daily 与 heatmap 的聚合粒度。",
         "应看到数据范围和天气汇总。"),
        ("阶段 2｜组装交互视图", "交互必须服务于阅读任务，而不是把图表堆在一起。",
         "依次看趋势、天气、温度散点和时段热力图；重点体验 hover、图例和范围滑块。",
         "运行后应显示一个四分区交互驾驶舱。"),
        ("阶段 3｜导出并写使用说明", "HTML 能独立打开，说明能让别人知道如何使用筛选和图例。",
         "确认 KPI 表的指标口径与图表一致；把结论写成运营提示而不是因果断言。",
         "应看到 HTML、KPI CSV 和说明文件。"),
        ("阶段 4｜最终验收", "核对交互点、独立 HTML 和指标说明。",
         "若范围滑块不存在，回到驾驶舱阶段检查第一个 x 轴设置。",
         "所有项目都应显示“通过”。"),
    ],
    "projects": [
        ("阶段 1｜先定义问题与数据质量", "项目不是从作图开始，而是从对象、时间范围和数据可信度开始。",
         "先读三个业务问题与成功标准；记录行数、重复、缺失和时间范围。",
         "应看到质量审计字典。"),
        ("阶段 2｜构造指标并做敏感性比较", "同一个“高峰”定义会影响建议，所以先比较两种阈值。",
         "查看小时、天气、每日三张指标表；比较 P75 和 P90 在不同日期类型下的比例。",
         "应看到天气指标与敏感性表。"),
        ("阶段 3｜静态和交互表达同一证据", "静态图适合摘要，交互图适合追问时间段，两者口径必须一致。",
         "先看静态图回答什么，再用趋势滑块追问某一日期段。",
         "应看到 PNG 与独立 HTML。"),
        ("阶段 4｜形成管理层摘要", "发现、建议和限制应形成一条证据链。",
         "检查每条建议能否回到一个具体指标；避免把历史相关写成确定因果。",
         "应看到清洗数据、指标表和 executive_summary.md。"),
        ("阶段 5｜最终验收", "确认项目问题、证据、敏感性和交付物都能复核。",
         "任何一项失败都应回到对应阶段修复，而不是跳过。",
         "所有项目都应显示“通过”。"),
    ],
    "machine-learning": [
        ("阶段 1｜定义预测时点并做泄漏审计", "模型只能使用预测时点已知的信息，duration 是典型后验泄漏字段。",
         "先看目标分布和抽样规则；确认 duration 没有进入特征候选。",
         "应看到样本规模、目标分布和泄漏提示。"),
        ("阶段 2｜固定切分与预处理", "训练、验证、测试必须独立；预处理要封装进 Pipeline。",
         "查看三段样本规模、数值/类别特征，并理解两个 ColumnTransformer 的区别。",
         "应看到 train/valid/test 规模和特征类型数量。"),
        ("阶段 3｜比较多个基线与候选模型", "准确率会掩盖类别不平衡，至少比较 precision、recall、F1、ROC-AUC 和 PR-AUC。",
         "先运行 Dummy，再看逻辑回归、森林和梯度提升的验证结果。",
         "应看到四个模型的验证指标表。"),
        ("阶段 4｜用交叉验证选择参数", "不能在测试集上反复挑参数；网格搜索只在训练加验证数据上进行。",
         "查看 C 的候选范围与 PR-AUC 评分；测试集只在本阶段结束后使用一次。",
         "应看到最优参数、CV 分数和最终测试指标。"),
        ("阶段 5｜查看阈值、曲线与名单规模", "营销名单不是固定 0.5 阈值，必须同时考虑覆盖率和误联系成本。",
         "比较 0.30、0.50、0.70 三个阈值，并阅读 Top 10% 的转化率。",
         "应看到混淆矩阵、ROC、PR 曲线和阈值表。"),
        ("阶段 6｜导出模型、预测与模型卡", "部署前必须保存完整 Pipeline，并说明适用范围和错误风险。",
         "查看错误样本、批量预测和模型卡；确认保存的是 Pipeline 而不是单独模型。",
         "应看到 joblib、预测 CSV、阈值表、错误样本和模型卡。"),
        ("阶段 7｜最终验收", "验收同时检查泄漏、数据切分、模型比较和交付物。",
         "不要通过改阈值或删掉失败条件来让检查通过；应回到模型阶段解释问题。",
         "所有项目都应显示“通过”。"),
    ],
}


def apply_guidance(module: str, cells):
    guides = GUIDANCE.get(module, [])
    result = []
    code_index = 0
    for item in cells:
        if item["cell_type"] != "code":
            result.append(item)
            continue
        if code_index >= len(guides):
            raise ValueError(f"{module} 的代码单元数量超过引导配置")
        title, why, action, observation = guides[code_index]
        result.append(markdown(
            f"""## {title}

**为什么现在做：** {why}

**请按这个顺序操作：** {action}

**完成后观察：** {observation}
""",
            ["capstone-guide"],
        ))
        source = "".join(item["source"])
        item = dict(item)
        item["source"] = source_lines(
            f"""# {title}
# 学习目标：{why}
# 运行后检查：{observation}
# 提示：先读注释和中间输出，再尝试修改挑战任务中的一个参数。

{source}"""
        )
        result.append(item)
        code_index += 1
    if code_index != len(guides):
        raise ValueError(f"{module} 的引导配置多出 {len(guides) - code_index} 项")
    return result


def python_capstone():
    cells = [
        markdown("""
# 模块大作业：个人账本年度汇总

目标：用 Python 标准库把一份有缺陷的个人账本整理为可复核的年度报告。
数据为课程本地快照 public/datasets/module1_ledger.csv；它是教学用合成账本，
不代表真实个人财务。交付目录为 output/module1_capstone。
"""),
        markdown("""
## 工作流与数据字典

日期必须是 2026 年内的合法日期；分类为收入或支出分类；金额必须是正数。
本范例把收入保留为收入，把其他分类视为支出。重复判定使用 日期、分类、金额、备注
四个字段的组合。你可以在挑战阶段调整此规则，并说明报表如何变化。
"""),
        code(r'''
import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

DATA_PATH = Path("/datasets/module1_ledger.csv")
OUTPUT_DIR = Path("output/module1_capstone")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
print("输入文件:", DATA_PATH)
print("输出目录:", OUTPUT_DIR.resolve())
'''),
        code(r'''
REQUIRED_FIELDS = ("日期", "分类", "金额", "备注")

def clean_text(value):
    return "" if value is None else str(value).strip()

def parse_record(raw, seen):
    record = {name: clean_text(raw.get(name)) for name in REQUIRED_FIELDS}
    if not any(record.values()):
        return None, "整行为空"
    missing = [name for name in REQUIRED_FIELDS[:-1] if not record[name]]
    if missing:
        return None, "缺少字段：" + "、".join(missing)
    try:
        day = datetime.strptime(record["日期"], "%Y-%m-%d")
        if day.year != 2026:
            return None, "日期不在 2026 年内"
    except ValueError:
        return None, "非法日期"
    try:
        amount = float(record["金额"])
        if amount <= 0:
            return None, "金额必须为正数"
    except ValueError:
        return None, "金额无法转换为数字"
    signature = (record["日期"], record["分类"], amount, record["备注"])
    if signature in seen:
        return None, "重复记录"
    seen.add(signature)
    return {"date": day, "category": record["分类"], "amount": amount, "note": record["备注"]}, ""

def read_and_clean(path):
    valid, rejected, seen = [], [], set()
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            if not reader.fieldnames or any(name not in reader.fieldnames for name in REQUIRED_FIELDS):
                raise ValueError("表头不完整：" + str(reader.fieldnames))
            for row_number, raw in enumerate(reader, start=2):
                item, reason = parse_record(raw, seen)
                if item is None:
                    rejected.append({"行号": row_number, **{name: clean_text(raw.get(name)) for name in REQUIRED_FIELDS}, "错误原因": reason})
                else:
                    valid.append(item)
    except (OSError, ValueError) as error:
        print("读取失败，请检查文件路径、编码和表头：", error)
        raise
    return valid, rejected

records, rejected_records = read_and_clean(DATA_PATH)
print(f"清洗完成：有效 {len(records)} 条，剔除 {len(rejected_records)} 条")
print("剔除原因：", {reason: sum(row["错误原因"] == reason for row in rejected_records) for reason in sorted({row["错误原因"] for row in rejected_records})})
'''),
        code(r'''
def monthly_expense(rows):
    result = defaultdict(float)
    for row in rows:
        if row["category"] != "收入":
            result[row["date"].strftime("%Y-%m")] += row["amount"]
    return dict(sorted(result.items()))

def category_expense(rows):
    result = defaultdict(float)
    for row in rows:
        if row["category"] != "收入":
            result[row["category"]] += row["amount"]
    return dict(sorted(result.items(), key=lambda pair: pair[1], reverse=True))

def annual_totals(rows):
    income = sum(row["amount"] for row in rows if row["category"] == "收入")
    expense = sum(row["amount"] for row in rows if row["category"] != "收入")
    return income, expense, income - expense

monthly = monthly_expense(records)
categories = category_expense(records)
income, expense, balance = annual_totals(records)
ranked_months = sorted(monthly.items(), key=lambda pair: pair[1], reverse=True)
print("年度收入/支出/结余:", round(income, 2), round(expense, 2), round(balance, 2))
print("支出最高的三个月:", [(month, round(value, 2)) for month, value in ranked_months[:3]])
print("支出分类前五:", [(name, round(value, 2)) for name, value in list(categories.items())[:5]])
'''),
        code(r'''
rejected_path = OUTPUT_DIR / "rejected_records.csv"
monthly_path = OUTPUT_DIR / "monthly_summary.csv"
report_path = OUTPUT_DIR / "report.txt"

with rejected_path.open("w", encoding="utf-8-sig", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=["行号", *REQUIRED_FIELDS, "错误原因"])
    writer.writeheader()
    writer.writerows(rejected_records)
with monthly_path.open("w", encoding="utf-8-sig", newline="") as handle:
    writer = csv.writer(handle)
    writer.writerow(["月份", "支出"])
    writer.writerows((month, round(value, 2)) for month, value in monthly.items())

top_category, top_category_value = next(iter(categories.items()))
top_month, top_month_value = ranked_months[0]
category_share = top_category_value / expense if expense else 0
report_lines = [
    "个人账本年度汇总（课程教学快照）",
    f"有效记录：{len(records)}；剔除记录：{len(rejected_records)}。",
    f"年度收入：{income:.2f}；年度支出：{expense:.2f}；年度结余：{balance:.2f}。",
    f"结论1：{top_month} 是支出最高月份，支出为 {top_month_value:.2f}。",
    f"结论2：{top_category} 是最大支出分类，占全部支出的 {category_share:.1%}。",
    f"结论3：最高与最低月支出相差 {ranked_months[0][1] - ranked_months[-1][1]:.2f}。",
    "限制：记录只覆盖教学快照，且分类口径由账本填写者决定。",
]
report_path.write_text("\n".join(report_lines), encoding="utf-8")
print("已写出：", [path.name for path in (rejected_path, monthly_path, report_path)])
print(report_path.read_text(encoding="utf-8"))
'''),
        code(r'''
required_files = [rejected_path, monthly_path, report_path]
checks = {
    "至少有五个函数": len([clean_text, parse_record, read_and_clean, monthly_expense, category_expense, annual_totals]) >= 5,
    "有效记录存在": len(records) > 0,
    "错误记录有原因": all(row["错误原因"] for row in rejected_records),
    "三份交付物存在": all(path.is_file() and path.stat().st_size > 0 for path in required_files),
    "报告包含结论": report_path.read_text(encoding="utf-8").count("结论") >= 3,
}
for item, passed in checks.items():
    print(("通过" if passed else "待修复"), item)
if not all(checks.values()):
    raise RuntimeError("年度账本大作业验收未通过")
''', ["capstone-verify"]),
        markdown("""
## 挑战

把餐饮按工作日和周末拆分，或把重复规则改为不考虑备注。重新运行统计与导出单元，
并在 report.txt 末尾说明新规则对结论的影响。
"""),
        markdown(COMMON_FOOTER),
    ]
    return notebook("module-capstone-python.ipynb", "python", "个人账本·年度汇总", 120, ["Python", "文件处理", "数据清洗"], cells)


def numpy_capstone():
    cells = [
        markdown("""
# 模块大作业：传感器信号质量与异常检测

本作业用固定随机种子生成三通道传感器快照。温度、压力、振动的单位为教学示意；
数据不对应真实设备。输出目录为 output/numpy_capstone。
"""),
        markdown("""
## 目标

完成数组结构检查、缺失值处理、广播标准化、z-score 异常检测、抽样复核和性能对比。
核心计算只使用 NumPy；请特别留意每个统计量的轴方向。
"""),
        code(r'''
from pathlib import Path
from time import perf_counter
import csv
import numpy as np

rng = np.random.default_rng(2026)
output_dir = Path("output/numpy_capstone")
output_dir.mkdir(parents=True, exist_ok=True)
time_index = np.arange(720)
temperature = 22 + 0.01 * time_index + 1.2 * np.sin(time_index / 35) + rng.normal(0, 0.35, len(time_index))
pressure = 101.2 + 0.25 * np.sin(time_index / 18) + rng.normal(0, 0.08, len(time_index))
vibration = 2.0 + 0.4 * np.sin(time_index / 8) + rng.normal(0, 0.16, len(time_index))
raw = np.column_stack([temperature, pressure, vibration])
raw[[87, 431], 0] = np.nan
raw[[215, 513], 2] += 4.5
raw[612, 1] = np.inf
channels = np.array(["temperature", "pressure", "vibration"])
print("原始数组 shape:", raw.shape, "dtype:", raw.dtype, "维度:", raw.ndim)
print("数据来源：固定随机种子 2026 的课程模拟信号")
'''),
        code(r'''
missing_mask = ~np.isfinite(raw)
column_median = np.nanmedian(np.where(np.isfinite(raw), raw, np.nan), axis=0)
clean = np.where(missing_mask, column_median, raw)
window = clean[120:240, :]
means = clean.mean(axis=0)
stds = clean.std(axis=0, ddof=1)
standardized = (clean - means) / stds
z_scores = np.abs(standardized)
anomaly_mask = z_scores >= 3.0

print("无效值总数:", int(missing_mask.sum()), "；每个通道:", dict(zip(channels, missing_mask.sum(axis=0))))
print("窗口 shape:", window.shape, "；标准化后列均值:", standardized.mean(axis=0).round(4))
print("阈值 3.0 的异常数:", int(anomaly_mask.sum()), "；每通道:", dict(zip(channels, anomaly_mask.sum(axis=0))))
'''),
        code(r'''
quantiles = np.quantile(clean, [0.05, 0.5, 0.95], axis=0)
summary = np.column_stack([
    means, stds, clean.min(axis=0), clean.max(axis=0),
    quantiles[0], quantiles[1], quantiles[2], anomaly_mask.sum(axis=0),
])
summary_header = ["mean", "std", "min", "max", "p05", "p50", "p95", "anomaly_count"]
sample_index = rng.choice(len(clean), size=8, replace=False)
sample_index.sort()
anomaly_positions = np.argwhere(anomaly_mask)

print("通道统计：")
for channel, row in zip(channels, summary):
    print(channel, dict(zip(summary_header, np.round(row, 3))))
print("可复现抽样行号:", sample_index.tolist())
print("前十个异常位置 [时间, 通道]:", anomaly_positions[:10].tolist())
'''),
        code(r'''
def loop_score(matrix):
    result = []
    for row in matrix:
        result.append(sum(float(value) for value in row))
    return result

repeated = np.tile(clean, (80, 1))
started = perf_counter()
loop_result = loop_score(repeated)
loop_seconds = perf_counter() - started
started = perf_counter()
vector_result = repeated.sum(axis=1)
vector_seconds = perf_counter() - started
print(f"循环耗时：{loop_seconds:.5f}s；向量化耗时：{vector_seconds:.5f}s；加速倍数：{loop_seconds / max(vector_seconds, 1e-12):.1f}x")
print("两种结果一致:", np.allclose(loop_result, vector_result))
'''),
        code(r'''
summary_path = output_dir / "channel_summary.csv"
anomaly_path = output_dir / "anomaly_positions.csv"
np.savetxt(
    summary_path,
    np.column_stack([channels, summary.astype(str)]),
    delimiter=",",
    fmt="%s",
    header="channel," + ",".join(summary_header),
    comments="",
)
with anomaly_path.open("w", encoding="utf-8-sig", newline="") as handle:
    writer = csv.writer(handle)
    writer.writerow(["time_index", "channel", "z_score", "value"])
    for time_pos, channel_pos in anomaly_positions:
        writer.writerow([int(time_pos), channels[channel_pos], round(float(z_scores[time_pos, channel_pos]), 3), round(float(clean[time_pos, channel_pos]), 3)])
print("已写出:", summary_path, anomaly_path)
'''),
        code(r'''
checks = {
    "二维数组": raw.ndim == 2 and raw.shape[1] == 3,
    "无效值已处理": np.isfinite(clean).all(),
    "随机样本可复核": len(sample_index) == 8,
    "向量化结果一致": np.allclose(loop_result, vector_result),
    "异常清单已导出": anomaly_path.is_file() and anomaly_path.stat().st_size > 0,
}
for item, passed in checks.items():
    print(("通过" if passed else "待修复"), item)
if not all(checks.values()):
    raise RuntimeError("NumPy 大作业验收未通过")
''', ["capstone-verify"]),
        markdown("""
## 挑战

将 z-score 阈值从 3.0 改为 2.5 或 3.5，比较各通道异常数量的变化，并说明误报与漏报的取舍。
"""),
        markdown(COMMON_FOOTER),
    ]
    return notebook("module-capstone-numpy.ipynb", "numpy", "传感器信号质量与异常检测", 120, ["NumPy", "异常检测", "性能"], cells)


def pandas_capstone():
    cells = [
        markdown("""
# 模块大作业：Olist 客户生命周期与履约分析

使用课程本地 Olist 快照：订单、订单明细、客户和商品表。原始数据来自 Olist Brazilian
E-Commerce Public Dataset；课程副本仅供离线教学，不应被用于现实业务结论。
"""),
        markdown("""
## 数据字典与粒度

orders 的粒度是一笔订单；items 是订单商品行；customers 通过 customer_id 关联到订单；
products 通过 product_id 关联到商品行。订单金额定义为 price + freight_value，配送时长为
客户签收时间减购买时间。所有导出保存在 output/pandas_capstone。
"""),
        code(r'''
from pathlib import Path
import pandas as pd

OUTPUT_DIR = Path("output/pandas_capstone")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
paths = {
    "orders": "/datasets/olist_orders_dataset.csv",
    "items": "/datasets/olist_order_items_dataset.csv",
    "customers": "/datasets/olist_customers_dataset.csv",
    "products": "/datasets/olist_products_dataset.csv",
}
orders = pd.read_csv(paths["orders"], engine="python", parse_dates=[
    "order_purchase_timestamp", "order_approved_at",
    "order_delivered_customer_date", "order_estimated_delivery_date",
])
items = pd.read_csv(paths["items"], engine="python")
customers = pd.read_csv(paths["customers"], engine="python")
products = pd.read_csv(paths["products"], engine="python")
print("表规模：", {name: frame.shape for name, frame in {"orders": orders, "items": items, "customers": customers, "products": products}.items()})
'''),
        code(r'''
quality = pd.DataFrame({
    "行数": [len(orders), len(items), len(customers), len(products)],
    "重复行": [orders.duplicated().sum(), items.duplicated().sum(), customers.duplicated().sum(), products.duplicated().sum()],
    "缺失单元格": [orders.isna().sum().sum(), items.isna().sum().sum(), customers.isna().sum().sum(), products.isna().sum().sum()],
}, index=["orders", "items", "customers", "products"])
print("数据质量审计：")
print(quality)
print("订单主键重复:", orders["order_id"].duplicated().sum(), "；明细主键重复:", items.duplicated(["order_id", "order_item_id"]).sum())
'''),
        code(r'''
items = items.assign(order_amount=items["price"] + items["freight_value"])
order_amounts = (items.groupby("order_id")
    .agg({"order_amount": "sum", "order_item_id": "size"})
    .reset_index()
    .rename(columns={"order_item_id": "item_count"}))
fact = (
    orders.merge(order_amounts, on="order_id", how="left", validate="one_to_one", indicator="items_join")
    .merge(customers[["customer_id", "customer_unique_id", "customer_state"]], on="customer_id", how="left", validate="many_to_one", indicator="customer_join")
)
fact = fact.query("order_status == 'delivered'").dropna(subset=["order_purchase_timestamp", "order_delivered_customer_date", "order_amount"]).copy()
fact["delivery_days"] = (fact["order_delivered_customer_date"] - fact["order_purchase_timestamp"]).dt.total_seconds() / 86400
fact["delay_days"] = (fact["order_delivered_customer_date"] - fact["order_estimated_delivery_date"]).dt.total_seconds() / 86400
fact["month"] = fact["order_purchase_timestamp"].dt.to_period("M").astype(str)
print("连接损失（订单未匹配商品/客户）:", (fact["items_join"] != "both").sum(), (fact["customer_join"] != "both").sum())
print("分析订单数:", len(fact), "；金额合计:", round(fact["order_amount"].sum(), 2))
'''),
        code(r'''
monthly = (fact.groupby("month")
    .agg({"order_amount": ["sum", "mean"], "order_id": "nunique", "delivery_days": "mean"})
    .reset_index())
monthly.columns = ["month", "销售额", "客单价", "订单数", "平均配送天数"]
monthly = monthly.sort_values("month")
monthly["累计销售额"] = monthly["销售额"].cumsum()
monthly["三月移动平均销售额"] = monthly["销售额"].rolling(3, min_periods=1).mean()
state_metrics = (fact.groupby("customer_state")
    .agg({"order_amount": "sum", "order_id": "nunique", "customer_unique_id": "nunique", "delivery_days": "mean"})
    .reset_index()
    .rename(columns={"order_amount": "销售额", "order_id": "订单数", "customer_unique_id": "客户数", "delivery_days": "平均配送天数"})
    .sort_values("销售额", ascending=False))
item_enriched = items.merge(products[["product_id", "product_category_name"]], on="product_id", how="left", validate="many_to_one")
category_metrics = (item_enriched.assign(category=item_enriched["product_category_name"].fillna("unknown"))
    .groupby("category")
    .agg({"order_amount": "sum", "order_item_id": "size"})
    .reset_index()
    .rename(columns={"order_amount": "销售额", "order_item_id": "商品行数"})
    .sort_values("销售额", ascending=False))
pivot = pd.pivot_table(fact, index="customer_state", columns="month", values="order_amount", aggfunc="sum", fill_value=0)
print("月度指标："); print(monthly.tail(6).round(2))
print("销售额前五州："); print(state_metrics.head(5).round(2))
'''),
        code(r'''
fact_path = OUTPUT_DIR / "olist_order_fact.csv"
monthly_path = OUTPUT_DIR / "monthly_metrics.csv"
state_path = OUTPUT_DIR / "state_metrics.csv"
category_path = OUTPUT_DIR / "category_metrics.csv"
fact.to_csv(fact_path, index=False)
monthly.to_csv(monthly_path, index=False)
state_metrics.to_csv(state_path, index=False)
category_metrics.to_csv(category_path, index=False)
report_path = OUTPUT_DIR / "business_findings.md"
report_path.write_text("\n".join([
    "# Olist 经营发现（教学快照）",
    f"- 已完成订单：{len(fact):,}；清洗前订单：{len(orders):,}。",
    f"- 最近月份销售额：{monthly.iloc[-1]['销售额']:.2f}；三月移动平均：{monthly.iloc[-1]['三月移动平均销售额']:.2f}。",
    f"- 销售额最高州：{state_metrics.iloc[0]['customer_state']}，销售额 {state_metrics.iloc[0]['销售额']:.2f}。",
    f"- 销售额最高品类：{category_metrics.iloc[0]['category']}，销售额 {category_metrics.iloc[0]['销售额']:.2f}。",
    "- 限制：缺少评价表和取消订单的完整金额，结果不能解释因果或代表当前运营。",
]), encoding="utf-8")
print("已导出:", [path.name for path in [fact_path, monthly_path, state_path, category_path, report_path]])
'''),
        code(r'''
checks = {
    "四张源表已读取": all(len(frame) > 0 for frame in [orders, items, customers, products]),
    "连接粒度有效": fact["order_id"].is_unique,
    "窗口指标已生成": "三月移动平均销售额" in monthly.columns,
    "透视表可用": pivot.shape[0] > 0 and pivot.shape[1] > 0,
    "可复用表已导出": all(path.is_file() and path.stat().st_size > 0 for path in [fact_path, monthly_path, state_path, category_path]),
}
for item, passed in checks.items():
    print(("通过" if passed else "待修复"), item)
if not all(checks.values()):
    raise RuntimeError("Pandas 大作业验收未通过")
''', ["capstone-verify"]),
        markdown("""
## 挑战

以 customer_unique_id 建立复购客户标记，比较不同州的复购率。将口径和样本限制写入 business_findings.md。
"""),
        markdown(COMMON_FOOTER),
    ]
    return notebook("module-capstone-pandas.ipynb", "pandas", "Olist 客户生命周期与履约分析", 150, ["Pandas", "Olist", "履约"], cells)


def matplotlib_capstone():
    cells = [
        markdown("""
# 模块大作业：实验结果的出版级静态报告

使用 scikit-learn Wine 本地教学快照（178 行，14 列）。原始元数据与上游许可以
scikit-learn 为准；本报告只演示静态图表表达，不作真实产品或健康结论。
"""),
        markdown("""
## 图表任务

面向课程报告制作一页 2×2 综合图：类别数量、酒精度分布、两个指标关系、类别箱线图。
同时增加标准化均值热力图、关键点注释，并导出 PNG、SVG 和文字说明。
"""),
        code(r'''
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt

OUTPUT_DIR = Path("output/matplotlib_capstone")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
wine = pd.read_csv("/datasets/sklearn/wine.csv", engine="python")
wine["class_name"] = wine["target"].map(lambda value: f"class_{int(value)}")
features = [column for column in wine.columns if column not in ["target", "class_name"]]
print("数据形状:", wine.shape, "；类别数量:", wine["class_name"].value_counts().to_dict())
print(wine[features].agg(["mean", "std", "min", "max"]).round(2))
'''),
        code(r'''
class_counts = wine["class_name"].value_counts().sort_index()
max_row = wine.loc[wine["color_intensity"].idxmax()]
fig, axes = plt.subplots(2, 2, figsize=(13, 9), constrained_layout=True)

axes[0, 0].bar(class_counts.index, class_counts.values, color=["#2563eb", "#16a34a", "#d97706"])
axes[0, 0].set(title="Sample count by class", xlabel="class", ylabel="samples")
for index, value in enumerate(class_counts.values):
    axes[0, 0].text(index, value + 2, str(value), ha="center")

axes[0, 1].hist(wine["alcohol"], bins=14, color="#2563eb", edgecolor="white")
axes[0, 1].axvline(wine["alcohol"].mean(), color="#dc2626", linestyle="--", label="mean")
axes[0, 1].set(title="Alcohol distribution", xlabel="alcohol", ylabel="samples")
axes[0, 1].legend()

for name, group in wine.groupby("class_name"):
    axes[1, 0].scatter(group["flavanoids"], group["color_intensity"], label=name, alpha=.75)
axes[1, 0].annotate("max color intensity", (max_row["flavanoids"], max_row["color_intensity"]), xytext=(8, 8), textcoords="offset points")
axes[1, 0].set(title="Flavanoids vs color intensity", xlabel="flavanoids", ylabel="color intensity")
axes[1, 0].legend(title="class")

box_data = [wine.loc[wine["class_name"] == name, "proline"] for name in class_counts.index]
axes[1, 1].boxplot(box_data, labels=class_counts.index, showmeans=True)
axes[1, 1].set(title="Proline by class", xlabel="class", ylabel="proline")
for axis in axes.flat:
    axis.grid(axis="y", alpha=.22)
report_png = OUTPUT_DIR / "wine_static_report.png"
report_svg = OUTPUT_DIR / "wine_static_report.svg"
fig.savefig(report_png, dpi=180, bbox_inches="tight")
fig.savefig(report_svg, bbox_inches="tight")
plt.show()
print("已导出:", report_png.name, report_svg.name)
'''),
        code(r'''
group_means = wine.groupby("class_name")[features].mean()
standardized_means = (group_means - wine[features].mean()) / wine[features].std()
fig, axis = plt.subplots(figsize=(13, 3.8), constrained_layout=True)
image = axis.imshow(standardized_means, cmap="coolwarm", vmin=-2, vmax=2, aspect="auto")
axis.set(title="Standardized feature means by class", xlabel="feature", ylabel="class")
axis.set_xticks(range(len(features)))
axis.set_xticklabels(features, rotation=55, ha="right")
axis.set_yticks(range(len(group_means.index)))
axis.set_yticklabels(group_means.index.tolist())
fig.colorbar(image, ax=axis, label="z-score")
heatmap_png = OUTPUT_DIR / "wine_feature_heatmap.png"
fig.savefig(heatmap_png, dpi=180, bbox_inches="tight")
plt.show()
print("热力图已导出:", heatmap_png.name)
'''),
        code(r'''
notes_path = OUTPUT_DIR / "chart_notes.md"
notes_path.write_text("\n".join([
    "# Wine 静态报告说明",
    f"- 类别样本数范围：{class_counts.min()} 到 {class_counts.max()}，柱状图适合比较离散类别数量。",
    f"- 酒精度均值为 {wine['alcohol'].mean():.2f}，直方图展示分布而非因果关系。",
    f"- 最大颜色强度样本为 {max_row['color_intensity']:.2f}，已在散点图中注释。",
    "- 箱线图呈现组内离散度；均值不等于每个样本的典型表现。",
    "- 限制：小型教学数据不能替代品鉴、生产或健康判断。",
]), encoding="utf-8")
print(notes_path.read_text(encoding="utf-8"))
'''),
        code(r'''
checks = {
    "四个主图已导出": report_png.is_file() and report_svg.is_file(),
    "热力图已导出": heatmap_png.is_file(),
    "标题坐标轴图例完整": all(axis.get_title() and axis.get_xlabel() and axis.get_ylabel() for axis in axes.flat),
    "观察说明已写出": notes_path.is_file() and notes_path.stat().st_size > 0,
}
for item, passed in checks.items():
    print(("通过" if passed else "待修复"), item)
if not all(checks.values()):
    raise RuntimeError("Matplotlib 大作业验收未通过")
''', ["capstone-verify"]),
        markdown("""
## 挑战

将报告改为适合打印的灰度配色，或将酒精度替换为另一指标。比较图表可读性，并在 chart_notes.md 中记录选择理由。
"""),
        markdown(COMMON_FOOTER),
    ]
    return notebook("module-capstone-matplotlib.ipynb", "matplotlib", "实验结果的出版级静态报告", 120, ["Matplotlib", "静态报告", "导出"], cells)


def seaborn_capstone():
    cells = [
        markdown("""
# 模块大作业：企鹅生态数据的多变量统计探索

使用 seaborn-data 的 penguins 本地教学快照。数据是描述性观察样本；图中关系不能被解释为因果。
导出目录为 output/seaborn_capstone。
"""),
        markdown("""
## 目标

从样本构成、分布、分类比较、变量关系、相关矩阵和分面六个角度观察数据。
每张图都配套文字解释，并明确缺失值和抽样范围的限制。
"""),
        code(r'''
from pathlib import Path
import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

sns.set(style="whitegrid", palette="deep")
OUTPUT_DIR = Path("output/seaborn_capstone")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
penguins = pd.read_csv("/datasets/penguins.csv", engine="python")
required = ["species", "island", "sex", "bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"]
clean = penguins.dropna(subset=required).copy()
print("原始/分析样本:", penguins.shape, clean.shape)
print("缺失值："); print(penguins[required].isna().sum())
print("类别数:", {column: clean[column].nunique() for column in ["species", "island", "sex"]})
'''),
        code(r'''
fig, axes = plt.subplots(2, 2, figsize=(13, 9), constrained_layout=True)
sns.countplot(data=clean, x="species", ax=axes[0, 0])
axes[0, 0].set(title="Species composition", xlabel="species", ylabel="samples")
if hasattr(sns, "histplot"):
    sns.histplot(data=clean, x="body_mass_g", hue="species", kde=True, element="step", ax=axes[0, 1])
else:
    for species, group in clean.groupby("species"):
        sns.distplot(group["body_mass_g"], hist=True, kde=True, label=species, ax=axes[0, 1])
    axes[0, 1].legend(title="species")
axes[0, 1].set(title="Body mass distribution", xlabel="body mass (g)", ylabel="samples")
sns.boxplot(data=clean, x="species", y="flipper_length_mm", hue="sex", ax=axes[1, 0])
axes[1, 0].set(title="Flipper length by species and sex", xlabel="species", ylabel="flipper length (mm)")
sns.scatterplot(data=clean, x="bill_length_mm", y="bill_depth_mm", hue="species", style="sex", ax=axes[1, 1])
axes[1, 1].set(title="Bill dimensions", xlabel="bill length (mm)", ylabel="bill depth (mm)")
overview_path = OUTPUT_DIR / "penguins_overview.png"
fig.savefig(overview_path, dpi=180, bbox_inches="tight")
plt.show()
'''),
        code(r'''
numeric = ["bill_length_mm", "bill_depth_mm", "flipper_length_mm", "body_mass_g"]
pair = sns.pairplot(clean, vars=numeric, hue="species", plot_kws={"alpha": .65, "s": 28})
pair.fig.suptitle("Pairwise relationships by species", y=1.02)
pair_path = OUTPUT_DIR / "penguins_pairplot.png"
pair.fig.savefig(pair_path, dpi=160, bbox_inches="tight")
plt.show()

correlation = clean[numeric].corr()
fig, axis = plt.subplots(figsize=(7, 5), constrained_layout=True)
sns.heatmap(correlation, annot=True, fmt=".2f", cmap="vlag", vmin=-1, vmax=1, ax=axis)
axis.set_title("Numeric feature correlation")
heatmap_path = OUTPUT_DIR / "penguins_correlation.png"
fig.savefig(heatmap_path, dpi=180, bbox_inches="tight")
plt.show()
'''),
        code(r'''
grid = sns.lmplot(
    data=clean, x="flipper_length_mm", y="body_mass_g",
    hue="sex", col="species", height=3.5, aspect=.85,
    scatter_kws={"alpha": .65, "s": 24},
)
grid.fig.suptitle("Within-species mass and flipper trend", y=1.04)
facet_path = OUTPUT_DIR / "penguins_facet_regression.png"
grid.fig.savefig(facet_path, dpi=180, bbox_inches="tight")
plt.show()

species_mass = clean.groupby("species")["body_mass_g"].mean().sort_values(ascending=False)
observations_path = OUTPUT_DIR / "observations.md"
observations_path.write_text("\n".join([
    "# 企鹅数据观察",
    f"- 分析样本为 {len(clean)} 行，删除了关键字段缺失的记录。",
    f"- 平均体重最高的物种是 {species_mass.index[0]}，均值为 {species_mass.iloc[0]:.0f} g。",
    f"- 最大绝对相关系数为 {correlation.where(~np.eye(len(correlation), dtype=bool)).abs().stack().max():.2f}；相关不等于因果。",
    "- 分面回归线只描述样本内线性趋势，不检验因果机制或总体显著性。",
    "- 局限：样本覆盖范围、缺失处理与分组样本量会影响图形结论。",
]), encoding="utf-8")
print(observations_path.read_text(encoding="utf-8"))
'''),
        code(r'''
off_diagonal = correlation.where(~np.eye(len(correlation), dtype=bool)).abs().stack()
checks = {
    "至少六类统计图": all(path.is_file() and path.stat().st_size > 0 for path in [overview_path, pair_path, heatmap_path, facet_path]),
    "分析样本非空": len(clean) > 0,
    "相关矩阵完整": correlation.shape == (4, 4),
    "观察说明包含因果边界": "相关不等于因果" in observations_path.read_text(encoding="utf-8"),
}
for item, passed in checks.items():
    print(("通过" if passed else "待修复"), item)
if not all(checks.values()):
    raise RuntimeError("Seaborn 大作业验收未通过")
''', ["capstone-verify"]),
        markdown("""
## 挑战

将 sex 替换为 island 作为颜色或分面变量，比较最明显的物种差异是否稳定。说明为何这种比较仍不能证明因果。
"""),
        markdown(COMMON_FOOTER),
    ]
    return notebook("module-capstone-seaborn.ipynb", "seaborn", "企鹅生态数据的多变量统计探索", 120, ["Seaborn", "多变量", "统计图"], cells)


def plotly_capstone():
    cells = [
        markdown("""
# 模块大作业：共享单车交互式运营驾驶舱

使用 UCI Bike Sharing 的本地小时级教学快照。它记录历史租借情况，不包含全部运营背景，
因此图表用于探索和排班讨论，不支持因果推断。
"""),
        markdown("""
## 驾驶舱口径

核心指标是总租借量 cnt、临时用户 casual、注册用户 registered。交互点包括：范围滑块、
图例开关、悬停字段以及热力图的具体小时格。结果导出到 output/plotly_capstone。
"""),
        code(r'''
from pathlib import Path
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

OUTPUT_DIR = Path("output/plotly_capstone")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
bike = pd.read_csv("/datasets/bike_sharing_hour.csv", engine="python", parse_dates=["dteday"])
bike["timestamp"] = bike["dteday"] + pd.to_timedelta(bike["hr"], unit="h")
bike["day_type"] = bike["workingday"].map({1: "working day", 0: "non-working day"})
bike["weather"] = bike["weathersit"].map({1: "clear", 2: "mist/cloud", 3: "light rain/snow", 4: "heavy weather"})
daily = bike.groupby("dteday")[["cnt", "casual", "registered"]].sum().reset_index()
weather_summary = (bike.groupby("weather")["cnt"].agg(["mean", "size"]).reset_index()
    .rename(columns={"mean": "avg_cnt", "size": "hours"})
    .sort_values("avg_cnt", ascending=False))
hour_weekday = bike.pivot_table(index="weekday", columns="hr", values="cnt", aggfunc="mean")
print("数据形状:", bike.shape, "；日期范围:", bike["dteday"].min().date(), "至", bike["dteday"].max().date())
print(weather_summary.round(1))
'''),
        code(r'''
fig = make_subplots(
    rows=2, cols=2,
    subplot_titles=("Daily demand trend", "Average demand by weather", "Temperature and demand", "Hourly demand heatmap"),
    specs=[[{"type": "xy"}, {"type": "xy"}], [{"type": "xy"}, {"type": "heatmap"}]],
)
fig.add_trace(go.Scatter(
    x=daily["dteday"], y=daily["cnt"], mode="lines", name="total rentals",
    hovertemplate="%{x|%Y-%m-%d}<br>rentals=%{y:,}<extra></extra>",
), row=1, col=1)
fig.add_trace(go.Scatter(
    x=daily["dteday"], y=daily["registered"], mode="lines", name="registered",
    visible="legendonly", hovertemplate="%{x|%Y-%m-%d}<br>registered=%{y:,}<extra></extra>",
), row=1, col=1)
fig.add_trace(go.Bar(
    x=weather_summary["weather"], y=weather_summary["avg_cnt"], name="weather average",
    customdata=weather_summary[["hours"]], hovertemplate="%{x}<br>avg rentals=%{y:.1f}<br>hours=%{customdata[0]}<extra></extra>",
), row=1, col=2)
fig.add_trace(go.Scatter(
    x=bike["temp"], y=bike["cnt"], mode="markers", name="hourly demand",
    marker={"size": bike["registered"] / bike["registered"].max() * 14 + 3, "color": bike["hr"], "colorscale": "Viridis", "showscale": True},
    customdata=bike[["weather", "day_type", "hr"]],
    hovertemplate="temp=%{x:.2f}<br>rentals=%{y}<br>weather=%{customdata[0]}<br>%{customdata[1]}, hour=%{customdata[2]}<extra></extra>",
), row=2, col=1)
fig.add_trace(go.Heatmap(
    z=hour_weekday.values, x=hour_weekday.columns, y=hour_weekday.index,
    colorscale="Blues", colorbar={"title": "avg rentals"},
    hovertemplate="weekday=%{y}<br>hour=%{x}<br>avg rentals=%{z:.1f}<extra></extra>",
), row=2, col=2)
fig.update_xaxes(rangeslider_visible=True, row=1, col=1)
fig.update_xaxes(title_text="date", row=1, col=1)
fig.update_yaxes(title_text="rentals", row=1, col=1)
fig.update_layout(height=820, width=1180, title="Bike sharing operations dashboard", template="plotly_white", legend_title="click legend to show/hide")
fig.show()
'''),
        code(r'''
dashboard_path = OUTPUT_DIR / "bike_operations_dashboard.html"
fig.write_html(dashboard_path, include_plotlyjs=True)
kpi_path = OUTPUT_DIR / "bike_kpis.csv"
pd.DataFrame({
    "metric": ["hourly_records", "daily_records", "mean_hourly_demand", "best_weather", "best_weather_avg_demand"],
    "value": [len(bike), len(daily), round(bike["cnt"].mean(), 2), weather_summary.iloc[0]["weather"], round(weather_summary.iloc[0]["avg_cnt"], 2)],
}).to_csv(kpi_path, index=False)
notes_path = OUTPUT_DIR / "operations_notes.md"
peak_hour = bike.groupby("hr")["cnt"].mean().idxmax()
notes_path.write_text("\n".join([
    "# 驾驶舱使用说明",
    "- 使用趋势图范围滑块查看任意日期段；点击图例可切换注册用户曲线。",
    "- 在天气柱状图、温度散点图和热力图上悬停可查看细节。",
    f"- 平均需求最高的小时是 {peak_hour} 点；最高平均天气条件为 {weather_summary.iloc[0]['weather']}。",
    "- 这些差异可能受季节、节假日和未记录因素影响，不能直接解释为天气造成需求变化。",
]), encoding="utf-8")
print("已导出:", dashboard_path.name, kpi_path.name, notes_path.name)
'''),
        code(r'''
checks = {
    "四类交互图存在": len(fig.data) >= 5,
    "范围选择器存在": bool(fig.layout.xaxis.rangeslider.visible),
    "独立 HTML 已导出": dashboard_path.is_file() and dashboard_path.stat().st_size > 0,
    "指标口径与说明已导出": kpi_path.is_file() and notes_path.is_file(),
}
for item, passed in checks.items():
    print(("通过" if passed else "待修复"), item)
if not all(checks.values()):
    raise RuntimeError("Plotly 大作业验收未通过")
''', ["capstone-verify"]),
        markdown("""
## 挑战

增加 season 作为第二筛选维度，或把需求按工作日和非工作日拆开。评估新增交互是否真正帮助阅读，而不是增加噪声。
"""),
        markdown(COMMON_FOOTER),
    ]
    return notebook("module-capstone-plotly.ipynb", "plotly", "共享单车交互式运营驾驶舱", 150, ["Plotly", "交互", "驾驶舱"], cells)


def project_capstone():
    cells = [
        markdown("""
# 模块大作业：从问题到决策的端到端项目

案例：共享单车运营团队需要确定高峰时段、天气风险和用户结构，并把证据整理成一页决策摘要。
数据为 UCI Bike Sharing 本地快照；本作业组合 Pandas、Matplotlib 和 Plotly。
"""),
        markdown("""
## 三个业务问题

1. 哪些小时的平均需求最高，是否与工作日有关？
2. 不同天气条件下的需求差异多大？
3. 临时用户与注册用户的结构是否随日期变化？

成功标准：导出清洗数据、静态报告、交互 HTML 和管理层摘要；并用另一种高峰定义做敏感性比较。
"""),
        code(r'''
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt
import plotly.express as px

OUTPUT_DIR = Path("output/projects_capstone")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
source = pd.read_csv("/datasets/bike_sharing_hour.csv", engine="python", parse_dates=["dteday"])
source["timestamp"] = source["dteday"] + pd.to_timedelta(source["hr"], unit="h")
source["weather"] = source["weathersit"].map({1: "clear", 2: "mist/cloud", 3: "light rain/snow", 4: "heavy weather"})
source["day_type"] = source["workingday"].map({1: "working day", 0: "non-working day"})
quality = {
    "rows": len(source),
    "duplicate_rows": int(source.duplicated().sum()),
    "missing_cells": int(source.isna().sum().sum()),
    "date_min": str(source["dteday"].min().date()),
    "date_max": str(source["dteday"].max().date()),
}
print("数据质量审计:", quality)
'''),
        code(r'''
hourly = (source.groupby(["day_type", "hr"])[["cnt", "casual", "registered"]].mean().reset_index()
    .rename(columns={"cnt": "avg_rentals", "casual": "avg_casual", "registered": "avg_registered"}))
weather = (source.groupby("weather")["cnt"].agg(["mean", "median", "size"]).reset_index()
    .rename(columns={"mean": "avg_rentals", "median": "median_rentals", "size": "hours"})
    .sort_values("avg_rentals", ascending=False))
daily = (source.groupby("dteday")[["cnt", "casual", "registered"]].sum().reset_index()
    .rename(columns={"cnt": "rentals"}))
daily["registered_share"] = daily["registered"] / daily["rentals"]
daily["rolling_28d"] = daily["rentals"].rolling(28, min_periods=7).mean()
peak_75 = source["cnt"].quantile(.75)
peak_90 = source["cnt"].quantile(.90)
source["peak_75"] = source["cnt"] >= peak_75
source["peak_90"] = source["cnt"] >= peak_90
sensitivity = source.groupby("day_type")[["peak_75", "peak_90"]].mean().mul(100).round(1)
print("高峰阈值（P75/P90）:", round(peak_75, 1), round(peak_90, 1))
print("天气指标："); print(weather.round(1))
print("敏感性："); print(sensitivity)
'''),
        code(r'''
fig, axes = plt.subplots(1, 2, figsize=(13, 4.5), constrained_layout=True)
for day_type, part in hourly.groupby("day_type"):
    axes[0].plot(part["hr"], part["avg_rentals"], marker="o", label=day_type)
axes[0].set(title="Average demand by hour", xlabel="hour", ylabel="average rentals")
axes[0].legend()
axes[0].grid(alpha=.25)
axes[1].bar(weather["weather"], weather["avg_rentals"], color="#2563eb")
axes[1].set(title="Average demand by weather", xlabel="weather", ylabel="average rentals")
axes[1].tick_params(axis="x", rotation=18)
axes[1].grid(axis="y", alpha=.25)
static_path = OUTPUT_DIR / "decision_static_report.png"
fig.savefig(static_path, dpi=180, bbox_inches="tight")
plt.show()

interactive = px.line(daily, x="dteday", y=["rentals", "rolling_28d"], title="Daily demand and 28-day moving average", labels={"value": "rentals", "dteday": "date"})
interactive.update_xaxes(rangeslider_visible=True)
interactive_path = OUTPUT_DIR / "decision_trend.html"
interactive.write_html(interactive_path, include_plotlyjs=True)
'''),
        code(r'''
clean_path = OUTPUT_DIR / "bike_cleaned.csv"
hourly_path = OUTPUT_DIR / "hourly_metrics.csv"
weather_path = OUTPUT_DIR / "weather_metrics.csv"
source.to_csv(clean_path, index=False)
hourly.to_csv(hourly_path, index=False)
weather.to_csv(weather_path, index=False)
best_hour = hourly.loc[hourly["avg_rentals"].idxmax()]
summary_path = OUTPUT_DIR / "executive_summary.md"
summary_path.write_text("\n".join([
    "# 共享单车运营决策摘要",
    "## 发现",
    f"1. {best_hour['day_type']} 的 {int(best_hour['hr'])} 点平均需求最高，为 {best_hour['avg_rentals']:.1f}。",
    f"2. 最高平均需求天气为 {weather.iloc[0]['weather']}，为 {weather.iloc[0]['avg_rentals']:.1f}。",
    f"3. 最新一天注册用户占比为 {daily.iloc[-1]['registered_share']:.1%}。",
    "## 建议",
    "1. 优先按高峰小时安排调度与检修窗口。",
    "2. 将天气作为排班的辅助信号，而非单独的因果规则。",
    "3. 分别监测临时用户和注册用户，避免只用总量掩盖结构变化。",
    "## 限制",
    "历史观察数据不包含价格、站点供给和促销等变量；结果不能直接证明某因素导致需求变化。",
    f"敏感性检查：工作日 P75/P90 高峰比例分别为 {sensitivity.loc['working day', 'peak_75']:.1f}% / {sensitivity.loc['working day', 'peak_90']:.1f}%。",
]), encoding="utf-8")
print(summary_path.read_text(encoding="utf-8"))
'''),
        code(r'''
checks = {
    "问题与指标已定义": len(hourly) > 0 and len(weather) > 0,
    "静态和交互报告已导出": static_path.is_file() and interactive_path.is_file(),
    "中间结果可复用": all(path.is_file() and path.stat().st_size > 0 for path in [clean_path, hourly_path, weather_path]),
    "敏感性比较已计算": set(sensitivity.columns) == {"peak_75", "peak_90"},
    "管理层摘要含建议": summary_path.read_text(encoding="utf-8").count("建议") >= 1,
}
for item, passed in checks.items():
    print(("通过" if passed else "待修复"), item)
if not all(checks.values()):
    raise RuntimeError("综合项目验收未通过")
''', ["capstone-verify"]),
        markdown("""
## 挑战

将高峰定义从分位数改为固定人数阈值，或按季节重算。若管理建议改变，请说明是口径敏感性还是数据结构变化造成的。
"""),
        markdown(COMMON_FOOTER),
    ]
    return notebook("module-capstone-projects.ipynb", "projects", "从问题到决策的端到端项目", 180, ["综合项目", "决策", "敏感性"], cells)


def machine_learning_capstone():
    cells = [
        markdown("""
# 模块大作业：银行营销模型的部署前评估

使用 UCI Bank Marketing 本地教学快照。任务是预测 y 是否为 yes，不是决定真实客户是否应被联系。
为避免通话完成后才知道的泄漏，duration 被明确排除；所有产物保存到 output/machine_learning_capstone。
"""),
        markdown("""
## 评估原则

按训练、验证、测试三段切分；比较 Dummy、逻辑回归、随机森林和梯度提升。
不能只报告准确率：还要报告 precision、recall、F1、ROC-AUC、PR-AUC、阈值与 Top-K 名单规模。
"""),
        code(r'''
from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    ConfusionMatrixDisplay, average_precision_score, classification_report,
    confusion_matrix, f1_score, precision_recall_curve, precision_score,
    recall_score, roc_auc_score, roc_curve,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler

OUTPUT_DIR = Path("output/machine_learning_capstone")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
raw = pd.read_csv("/datasets/bank_marketing_full.csv", sep=";", engine="python")
sample = raw.sample(n=min(12000, len(raw)), random_state=2026).copy()
sample["target"] = (sample["y"] == "yes").astype(int)
print("原始/教学样本:", raw.shape, sample.shape)
print("目标分布:", sample["target"].value_counts(normalize=True).round(4).to_dict())
print("泄漏审计：duration 在通话后才能取得，已从特征候选中剔除。")
'''),
        code(r'''
leakage_columns = ["y", "target", "duration"]
feature_columns = [column for column in sample.columns if column not in leakage_columns]
X = sample[feature_columns]
y = sample["target"]
X_train_full, X_test, y_train_full, y_test = train_test_split(X, y, test_size=.20, stratify=y, random_state=2026)
X_train, X_valid, y_train, y_valid = train_test_split(X_train_full, y_train_full, test_size=.25, stratify=y_train_full, random_state=2026)
numeric_features = X.select_dtypes(include="number").columns.tolist()
categorical_features = [column for column in feature_columns if column not in numeric_features]
print("切分规模 train/valid/test:", X_train.shape, X_valid.shape, X_test.shape)
print("数值/类别特征数:", len(numeric_features), len(categorical_features))

linear_preprocess = ColumnTransformer([
    ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), numeric_features),
    ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical_features),
])
tree_preprocess = ColumnTransformer([
    ("num", Pipeline([("imputer", SimpleImputer(strategy="median"))]), numeric_features),
    ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("ordinal", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1))]), categorical_features),
])
'''),
        code(r'''
models = {
    "dummy": Pipeline([("prep", linear_preprocess), ("model", DummyClassifier(strategy="prior"))]),
    "logistic": Pipeline([("prep", linear_preprocess), ("model", LogisticRegression(max_iter=800, class_weight="balanced", random_state=2026))]),
    "forest": Pipeline([("prep", linear_preprocess), ("model", RandomForestClassifier(n_estimators=120, max_depth=12, min_samples_leaf=8, class_weight="balanced", n_jobs=-1, random_state=2026))]),
    "gradient": Pipeline([("prep", tree_preprocess), ("model", HistGradientBoostingClassifier(max_iter=90, max_leaf_nodes=15, learning_rate=.08, random_state=2026))]),
}

def score_model(name, estimator, x_value, y_value):
    probability = estimator.predict_proba(x_value)[:, 1]
    prediction = (probability >= .5).astype(int)
    return {
        "model": name,
        "precision": precision_score(y_value, prediction, zero_division=0),
        "recall": recall_score(y_value, prediction, zero_division=0),
        "f1": f1_score(y_value, prediction, zero_division=0),
        "roc_auc": roc_auc_score(y_value, probability),
        "pr_auc": average_precision_score(y_value, probability),
    }

valid_rows = []
for name, estimator in models.items():
    estimator.fit(X_train, y_train)
    valid_rows.append(score_model(name, estimator, X_valid, y_valid))
validation_scores = pd.DataFrame(valid_rows).sort_values("pr_auc", ascending=False)
print(validation_scores.round(3))
'''),
        code(r'''
search = GridSearchCV(
    Pipeline([("prep", linear_preprocess), ("model", LogisticRegression(max_iter=800, class_weight="balanced", random_state=2026))]),
    param_grid={"model__C": [0.2, 1.0, 3.0]},
    scoring="average_precision",
    cv=StratifiedKFold(n_splits=3, shuffle=True, random_state=2026),
    n_jobs=-1,
)
search.fit(pd.concat([X_train, X_valid]), pd.concat([y_train, y_valid]))
best_model = search.best_estimator_
best_model_name = "logistic_grid_search"
test_probability = best_model.predict_proba(X_test)[:, 1]
test_prediction = (test_probability >= .5).astype(int)
test_scores = score_model(best_model_name, best_model, X_test, y_test)
print("最优参数:", search.best_params_, "；CV PR-AUC:", round(search.best_score_, 3))
print("测试指标:", {name: round(value, 3) if isinstance(value, float) else value for name, value in test_scores.items()})
'''),
        code(r'''
fpr, tpr, _ = roc_curve(y_test, test_probability)
precision, recall, thresholds = precision_recall_curve(y_test, test_probability)
fig, axes = plt.subplots(1, 3, figsize=(15, 4), constrained_layout=True)
ConfusionMatrixDisplay(confusion_matrix(y_test, test_prediction)).plot(ax=axes[0], colorbar=False)
axes[0].set_title("Confusion matrix at threshold 0.50")
axes[1].plot(fpr, tpr, label=f"AUC={test_scores['roc_auc']:.3f}")
axes[1].plot([0, 1], [0, 1], "--", color="gray")
axes[1].set(title="ROC curve", xlabel="false positive rate", ylabel="true positive rate")
axes[1].legend()
axes[2].plot(recall, precision, label=f"AP={test_scores['pr_auc']:.3f}")
axes[2].set(title="Precision-recall curve", xlabel="recall", ylabel="precision")
axes[2].legend()
metrics_path = OUTPUT_DIR / "model_metrics.png"
fig.savefig(metrics_path, dpi=180, bbox_inches="tight")
plt.show()

threshold_rows = []
for threshold in [.30, .50, .70]:
    selected = test_probability >= threshold
    threshold_rows.append({
        "threshold": threshold,
        "contact_count": int(selected.sum()),
        "contact_rate": float(selected.mean()),
        "precision": precision_score(y_test, selected, zero_division=0),
        "recall": recall_score(y_test, selected, zero_division=0),
    })
threshold_table = pd.DataFrame(threshold_rows)
top_k = max(1, int(len(test_probability) * .10))
top_index = np.argsort(test_probability)[-top_k:]
top_k_rate = float(y_test.iloc[top_index].mean())
print(threshold_table.round(3))
print(f"Top 10% 名单规模 {top_k}，实际转化率 {top_k_rate:.3f}，总体转化率 {y_test.mean():.3f}")
'''),
        code(r'''
errors = X_test.copy()
errors["actual"] = y_test.values
errors["probability"] = test_probability
errors["prediction"] = test_prediction
errors["error_type"] = np.select(
    [(errors["actual"] == 1) & (errors["prediction"] == 0), (errors["actual"] == 0) & (errors["prediction"] == 1)],
    ["false_negative", "false_positive"],
    default="correct",
)
error_examples = errors.query("error_type != 'correct'").sort_values("probability").head(30)
model_path = OUTPUT_DIR / "bank_marketing_pipeline.joblib"
predictions_path = OUTPUT_DIR / "batch_predictions.csv"
threshold_path = OUTPUT_DIR / "threshold_decisions.csv"
errors_path = OUTPUT_DIR / "error_examples.csv"
joblib.dump(best_model, model_path)
batch = X_test.head(20).copy()
batch["predicted_probability"] = best_model.predict_proba(batch)[:, 1]
batch["recommended_contact"] = batch["predicted_probability"] >= .5
batch.to_csv(predictions_path, index=False)
threshold_table.to_csv(threshold_path, index=False)
error_examples.to_csv(errors_path, index=False)
model_card_path = OUTPUT_DIR / "model_card.md"
model_card_path.write_text("\n".join([
    "# 银行营销模型卡（教学版）",
    f"- 模型：{best_model_name}，参数：{json.dumps(search.best_params_, ensure_ascii=False)}。",
    f"- 测试 PR-AUC：{test_scores['pr_auc']:.3f}；ROC-AUC：{test_scores['roc_auc']:.3f}。",
    "- 预测时点：通话前；duration 已排除，避免后验信息泄漏。",
    "- 错误成本：漏掉可能转化的客户会损失机会，误联系不会转化的客户会增加营销成本。",
    "- 限制：历史数据、抽样、标签定义与类别分布均可能漂移；模型不能直接替代人工或合规审查。",
]), encoding="utf-8")
print("错误样本数:", len(error_examples), "；交付物:", [path.name for path in [model_path, predictions_path, threshold_path, errors_path, model_card_path]])
'''),
        code(r'''
checks = {
    "泄漏字段已排除": "duration" not in feature_columns,
    "训练验证测试切分独立": len(set(X_train.index) & set(X_valid.index)) == 0 and len(set(X_valid.index) & set(X_test.index)) == 0,
    "多模型对比完成": len(validation_scores) == 4,
    "指标与曲线已导出": metrics_path.is_file() and test_scores["pr_auc"] > 0,
    "模型与批量预测已导出": all(path.is_file() and path.stat().st_size > 0 for path in [model_path, predictions_path, threshold_path, errors_path, model_card_path]),
}
for item, passed in checks.items():
    print(("通过" if passed else "待修复"), item)
if not all(checks.values()):
    raise RuntimeError("机器学习大作业验收未通过")
''', ["capstone-verify"]),
        markdown("""
## 挑战

把营销预算设为测试集的 5%、10% 和 20%，比较 Top-K 名单的实际转化率和可联系人数。
说明预算变动会如何影响阈值与风险偏好。
"""),
        markdown(COMMON_FOOTER),
    ]
    return notebook("module-capstone-machine-learning.ipynb", "machine-learning", "银行营销模型的部署前评估", 180, ["机器学习", "模型评估", "模型卡"], cells)


SOLUTION_STEP_DELIMITER = "\n# === 参考答案步骤分隔 ===\n"


def capstone_solution_steps(module):
    """Split one complete reference implementation into the three milestones."""
    parts = [part.strip("\n") for part in CAPSTONE_SOLUTIONS[module].split(SOLUTION_STEP_DELIMITER)]
    if len(parts) != 3 or any(not part for part in parts):
        raise ValueError(f"{module} 参考答案必须恰好拆成 3 个非空步骤，当前为 {len(parts)} 个")
    return parts


def prompt_capstone(filename, module, title, minutes, tags, chapters, scenario, data_hint, requirements, deliverables, checks):
    """Create a compact, student-owned capstone notebook.

    The system supplies one authentic brief, three milestones, limited code
    starters and a module-specific rubric. Students create the remaining
    Markdown and code cells themselves.
    """
    hints = CAPSTONE_HINTS[module]
    stages = CAPSTONE_STAGES[module]
    solution_steps = capstone_solution_steps(module)
    if len(stages) != 3:
        raise ValueError(f"{module} 必须配置 3 个里程碑，当前为 {len(stages)} 个")

    cells = [
        markdown(f"""
# 模块大作业：{title}

## 任务来函

{scenario}

> 这是一份需要由你继续完成的项目 Notebook。系统只提供任务、里程碑和少量代码起点；请自行新增 Markdown 与代码单元，保留关键输出，并解释你的选择。

## 你已经拥有的项目零件

{chapters}

模块作业不是重新开始。请从前面章节选择可复用的规则、数据结构、分析表、图表草稿或验证方法，并在新增的 Markdown 单元中写明“复用了什么、做了什么调整”。
"""),
        markdown(f"""
## 任务合同：数据、边界与交付

**数据与边界：** {data_hint}

**必须完成：**

""" + "\n".join(f"{index}. {item}" for index, item in enumerate(requirements, 1)) + "\n\n**最终交付：**\n\n" + "\n".join(f"- {item}" for item in deliverables)),
        markdown("""
## 如何开始：三级提示

### 第一层｜操作路线

""" + "\n".join(f"{index}. {item}" for index, item in enumerate(hints["operations"], 1)) + f"""

### 第二层｜代码起点

下面只给出 API 或结构起点，字段、参数、规则、异常处理和结果解释均由你完成。

```python
{hints["snippet"]}
```

### 第三层｜遇到问题时检查

先检查输入数据与中间结果，再检查字段、shape、粒度、排序或指标口径。不要通过删除校验条件来让结果“看起来正确”。
"""),
    ]

    for number, stage in enumerate(stages, 1):
        stage_title, stage_chapters, stage_context, question, output, pitfall, starter = stage
        cells.extend([
            markdown(f"""
## 里程碑 {number}｜{stage_title}

**承接章节：** {stage_chapters}

**此刻的项目情境：** {stage_context}

**你要解决的问题：** {question}

**完成证据：** {output}

**容易失分的地方：** {pitfall}

完成代码后，请自行新增一个 Markdown 单元，按“观察到什么 → 这说明什么 → 下一步怎么做”解释结果。
"""),
            code(f"""# 里程碑 {number}｜{stage_title}
# 这段代码应解决：{question}
# 完成后应留下：{output}
# TODO：从下面的起点继续；关键规则和设计选择需要写注释。

{starter}
"""),
        ])

    rubric = CAPSTONE_RUBRICS[module]
    challenge = CAPSTONE_CHALLENGES[module]
    cells.extend([
        markdown("## 交付、挑战与自查\n\n**基础提交清单：**\n\n" + "\n".join(f"- [ ] {item}" for item in checks) + f"""

### 进阶挑战（可选）

{challenge}

挑战任务必须建立在基础任务已经完整、可复现的前提上；不能用额外图表或复杂模型掩盖基础证据缺失。
"""),
        markdown(f"""
## 评分标准（100 分）

### 共同能力：30 分

- **可复现性（10 分）**：重启内核后能按顺序运行，路径和依赖清楚。
- **证据与注释（10 分）**：关键代码说明设计原因，结论能回到具体输出。
- **边界与诚实表达（10 分）**：说明数据来源、假设、限制，不把相关性写成确定因果。

### 本模块核心能力：70 分

{rubric}

### 提交门槛

Notebook 必须能够运行；错误或异常记录不能被静默隐藏；关键结论必须可以回溯。最后的确认单元只检查摘要是否填写，不替代教师评分。
"""),
        code('''# 提交前确认：请在完成三个里程碑后填写。
# 教师将结合代码、输出、解释和导出文件评分，不会只看本单元。
submission_summary = {
    "任务与使用者": "",
    "三个里程碑的完成证据": "",
    "最重要的结果或作品功能": "",
    "限制与下一步": "",
}

missing = [key for key, value in submission_summary.items() if not str(value).strip() or str(value).strip() == "..."]
if missing:
    raise ValueError("请先填写提交摘要：" + "、".join(missing))
print("提交摘要已填写；请重启内核并从头运行，再对照评分标准检查证据。")
''', ["capstone-verify"]),
    ])

    # 参考答案统一放在 Notebook 末尾，避免打断学生完成三个里程碑的流程。
    for number, (stage, solution_source) in enumerate(zip(stages, solution_steps), 1):
        stage_title = stage[0]
        cells.append(code(f"""# 参考答案｜里程碑 {number}：{stage_title}
# 默认隐藏。建议先完成自己的实现，再展开对照设计选择。
# 三个答案 Cell 前后衔接；阅读时请按里程碑顺序理解变量与中间结果。

{solution_source}
""", ["solution", "teacher-answer", f"solution-step-{number}"]))

    return notebook(filename, module, title, minutes, tags, cells)


CAPSTONE_STAGES = {
    "python": [
        (
            "从课堂零件搭出一本账",
            "第 1–7 章：变量、字符串、容器与集合",
            "同学准备把零散账目交给你的助手管理。输入可能带空格、金额仍是文本，也可能出现重复编号和计划外分类。",
            "怎样把原始文本转成结构清楚、能保存多笔记录且可检查唯一性的账本？",
            "原始输入与清洗结果；一笔记录的数据模型；至少 5 笔账目的容器；重复编号和非法分类检查。",
            "使用多个平行列表保存字段，或在金额仍是字符串时开始汇总。",
            "raw_record = \"2026-08-06 | expense | 餐饮 | 35.5 | 午餐\"\nallowed_categories = {\"餐饮\", \"交通\", \"购物\", \"工资\", \"其他\"}\nrecords = []\n# TODO：拆分、清洗并转换字段\n# TODO：设计一笔记录的数据结构并检查编号与分类",
        ),
        (
            "把账本规则变成功能",
            "第 8–11 章：条件、循环、函数、参数与返回值",
            "账本开始批量接收记录。不同错误要给出不同原因，大额支出需要复核，查询与汇总还要能够重复使用。",
            "怎样把校验、添加、筛选和汇总拆成职责明确、可以组合和测试的函数？",
            "通过/拒绝/复核结果及原因；至少 3 个有返回值的函数；月度或分类汇总。",
            "把全部业务规则写进一个长循环，或让函数只打印结果、不返回可继续使用的数据。",
            "def validate_record(record):\n    # TODO：返回状态和原因，不要只返回 True/False\n    pass\n\ndef add_record(records, record):\n    # TODO：调用校验并返回更新结果\n    pass\n\ndef summarize_records(records):\n    # TODO：返回月度或分类汇总\n    pass",
        ),
        (
            "保存、恢复并交付助手",
            "第 12–15 章：文件、异常、测试、类与项目组织",
            "另一位同学将独立使用你的作品。即使文件不存在、内容损坏或输入非法，助手也应给出清楚反馈，并保留已有的正确数据。",
            "怎样让账本可靠保存和恢复，并用一次完整演示证明别人能够使用？",
            "保存文件；加载与保存功能；正常、非法、缺失/损坏文件测试；“加载→添加→查询/汇总→保存”完整演示。",
            "只测试理想输入；用宽泛的异常捕获隐藏错误；为了使用类而创建没有职责的类。",
            "from pathlib import Path\nimport json\n\ndata_path = Path(\"output/finance_assistant/records.json\")\n# TODO：实现 load_records / save_records，并处理具体异常\n# TODO：组织完整使用演示和至少 3 组测试",
        ),
    ],
    "numpy": [
        ("建立库存与需求矩阵", "第 16–17 章：ndarray、shape 与 dtype", "区域仓库每天要判断哪些门店和商品存在缺货风险。你需要先把库存、近期开单量和安全库存整理成含义稳定的数组。", "数组的每个轴和每个数值代表什么，标签怎样与矩阵位置保持一致？", "库存矩阵、需求矩阵、门店/商品标签、shape/dtype 检查和样本切片。", "只保留数值矩阵却丢失行列标签，或让两个矩阵的轴顺序不一致。", "import numpy as np\n\nstock = np.asarray(...)\ndemand = np.asarray(...)\nstore_names = np.asarray(...)\nproduct_names = np.asarray(...)\n# TODO：验证两个矩阵的 shape，并说明 axis=0 / axis=1"),
        ("批量计算缺货风险", "第 18–20 章：索引、形状、向量化与广播", "不同商品拥有不同安全库存和补货提前期。运营人员希望一次看到所有“门店 × 商品”的库存覆盖天数和预警位置。", "怎样用广播、布尔掩码和索引完成批量风险计算，并定位到具体门店和商品？", "覆盖天数或库存差额矩阵；风险掩码；高风险位置及标签；一次有业务意义的转置或形状调整。", "广播虽然能够运行，但安全库存对应错了轴；使用双层循环逐格计算。", "safety_stock = np.asarray(...)  # TODO：说明它对应商品轴还是门店轴\n# TODO：利用广播计算库存差额或覆盖天数\nalert_mask = ...\n# TODO：用 np.where / 布尔索引定位高风险组合"),
        ("形成补货清单并抽样复核", "第 21 章：统计计算与随机抽样", "仓库只能优先处理有限数量的预警。你需要依据风险强度排序，并随机抽取部分普通记录检查规则是否过度预警。", "哪些按轴统计、排序和抽样结果能够支持一份可解释的补货清单？", "门店/商品统计摘要；优先补货组合；固定随机种子的复核样本；阈值局限说明。", "只报告总体平均值；抽样没有固定随机种子；补货顺序无法回溯到风险指标。", "rng = np.random.default_rng(2026)\n# TODO：计算门店或商品维度的统计量\n# TODO：按风险指标生成优先清单\n# TODO：随机抽取普通记录复核，并解释抽样范围"),
    ],
    "pandas": [
        ("签订数据合同并审计源表", "第 22–28 章：DataFrame、类型、日期、缺失与读写", "客服团队发现延期投诉增多，但订单、客户、商品和支付表的粒度并不相同。你必须先证明数据能够支持履约追踪。", "每张表一行代表什么、主键是什么、哪些缺失或异常会影响延期判断？", "数据字典；表级行数、类型、缺失和重复键审计；保留/排除规则。", "清洗后只展示最终行数，没有记录删掉了什么；把订单与明细当成相同粒度。", "import pandas as pd\n\norders = pd.read_csv(\"...csv\")\n# TODO：为每张表记录粒度、主键、dtypes、缺失和重复键\n# TODO：转换日期并保留清洗前后的数量证据"),
        ("构建安全的订单事实表", "第 29–30 章：分组聚合、合并与结构转换", "客服需要一行对应一笔订单的追踪表。商品明细必须先聚合，否则金额、件数和订单量会被重复累计。", "怎样合并多表而不放大订单粒度，并构造延期天数、订单金额、商品数等字段？", "合并关系说明；合并前后行数与唯一性检查；订单粒度事实表；连接损失记录。", "直接进行多对多合并；没有使用 validate、indicator 或主键唯一性检查。", "# TODO：先把订单明细聚合到 order_id 粒度\norder_fact = orders.merge(..., on=\"order_id\", how=\"...\", validate=\"...\", indicator=True)\n# TODO：检查合并后 order_id 是否唯一，并解释未匹配记录"),
        ("生成异常工单与趋势证据", "第 29、31 章：分组指标、排序、窗口计算与导出", "运营负责人不需要一堆平均数，而需要知道延期是否持续恶化、集中在哪些地区/品类，以及下一批应该复核哪些订单。", "怎样把分组指标、窗口趋势和订单级规则组合成可执行的异常工单？", "至少两张运营指标表；一个排序后的窗口指标；异常订单清单；3 条有证据和局限的发现。", "滚动计算前没有按时间和分组排序；用总体平均掩盖样本量差异；建议无法回到具体订单。", "# TODO：按时间与业务切片计算延期率/时长\n# TODO：排序后计算 rolling / cumulative / rank 指标\nissue_tickets = order_fact.loc[...]\n# TODO：导出事实表、趋势指标和异常工单"),
    ],
    "matplotlib": [
        ("确定周会只需要回答的三个问题", "第 32–34 章：Figure、Axes 与基础图形", "经营负责人只有一页纸和三分钟阅读时间。你必须先决定趋势、比较、分布或关系中，哪些问题真正影响本周讨论。", "每张图要回答什么，读者据此能做什么判断，为什么选这种图？", "三项问题—字段—图形—阅读动作计划，以及统一的指标口径。", "先画很多图再寻找故事；为了覆盖章节而让同一指标重复出现。", "# TODO：在 Markdown 写 3 个经营问题\n# 问题 / 所需字段 / 图形类型 / 希望读者看到什么\n# TODO：准备三张图共用的干净数据或指标表"),
        ("把互补证据组织成一页", "第 35–40 章：趋势、比较、分布、关系、构成与子图", "一张图负责概览，其他图负责解释或挑战它。页面需要形成视觉层级，而不是四个同样重要的方框。", "怎样用 Figure/Axes 布局让读者先看到主结论，再看到结构、分布或异常证据？", "一张主图、至少两张辅助图；合理的 GridSpec/subplots 布局；一致的颜色和单位。", "只按默认网格平均分配空间；用饼图或双轴制造不必要的阅读负担。", "import matplotlib.pyplot as plt\n\nfig = plt.figure(figsize=(...))\n# TODO：用 subplots 或 GridSpec 规划主次区域\n# TODO：每个 Axes 只回答一个问题"),
        ("注释、审阅并导出会议报告", "第 41–43 章：注释、样式、可访问性与保存", "报告将在脱离 Notebook 的会议材料中使用。读者必须看懂单位、时间范围、异常点和结论边界。", "哪些标注能缩短阅读时间，怎样证明导出的图片没有误导或裁切？", "完整标题、单位、图例和关键注释；PNG/SVG 文件；一段“图表支持/不能支持什么”的审阅说明。", "用装饰性文字淹没数据；截断坐标轴却未说明；只在 Notebook 中看过图，没有检查导出文件。", "# TODO：补充 set_title / set_xlabel / legend / annotate\n# TODO：检查颜色、刻度和坐标范围\n# fig.savefig(\"weekly_business_report.png\", dpi=..., bbox_inches=\"tight\")"),
    ],
    "seaborn": [
        ("固定样本口径与比较语义", "第 44–49 章：整洁数据、主题、频数与统计估计", "会员运营希望比较不同客群的消费表现，但样本量、缺失和类别定义可能让均值产生误导。", "哪些变量承担 x、y、hue、row/col 语义，各组样本是否足以比较？", "变量角色表；缺失与组别样本量；一张包含统计估计或置信信息的基础比较图。", "没有先看样本量就比较均值；同一个颜色在不同图中代表不同客群。", "import pandas as pd\nimport seaborn as sns\n\ndf = pd.read_csv(\"...csv\")\n# TODO：固定分析样本并记录排除数量\n# TODO：检查类别计数并定义统一 palette"),
        ("用分布和关系检验初步判断", "第 50–59 章：分布、类别比较、散点、回归与联合分布", "初步均值差异可能来自偏态、异常值或样本构成。你需要用互补图形验证“差异是否稳定”以及变量是否共同变化。", "不同客群的分布、尾部和变量关系有何差异，哪些观察只是相关线索？", "两张互补分布图；一张关系/回归图；每张图的样本范围与谨慎解释。", "只用均值柱图；把回归线写成因果；删除异常值却不报告对结果的影响。", "# TODO：从 boxplot / violinplot / histplot / ecdfplot 中选择互补方法\nsns.scatterplot(data=df, x=\"...\", y=\"...\", hue=\"...\")\n# TODO：用 regplot / jointplot 验证关系，并说明不能推断什么"),
        ("通过分面与多变量图形成研究简报", "第 60–63 章：pairplot、热力图、聚类与分面", "如果关系只在某些客群、时段或门店成立，汇总图会掩盖它。最终简报需要说明主发现、例外和数据限制。", "怎样用分面或多变量图判断结论是否跨群体成立，并组织为一条统计叙事？", "至少一张 FacetGrid/pairplot/热力图；统一视觉语义；3 条发现、对应证据和一条反例或限制。", "把大量图表并排却没有研究问题；相关矩阵中混入不适合的字段；忽略小样本分面。", "# TODO：选择 FacetGrid / pairplot / heatmap 中最适合的问题\n# TODO：统一 palette、变量单位和类别顺序\n# TODO：写下主发现、例外、局限与下一步数据需求"),
    ],
    "plotly": [
        ("定义预警并发现异常", "第 64–70 章：Hover、趋势、比较与关系图", "周一经营会只需要快速决定“本周先追哪两项异常”。你必须先定义 KPI、比较基准和默认视图，再让读者通过 Hover 或范围探索确认异常。", "怎样让默认视图指出异常发生在何时、哪个切片，并留下可继续追问的上下文？", "2–4 个 KPI 的公式与粒度；异常基准；一张时间探索图和一张类别/区域比较图；待验证假设。", "只画趋势线却没有基准；Hover 重复坐标值；用多个颜色同时表达无关含义。", "import plotly.express as px\n\ntrend = px.line(summary, x=\"...\", y=\"...\", color=\"...\", hover_data=[\"...\"])\ntrend.update_xaxes(rangeslider_visible=True)\n# TODO：补充异常基准、上下文和可追问的业务切片"),
        ("定位切片并形成行动证据", "第 71–80 章：分布、矩阵、层级、漏斗、瀑布、时间线与地图", "异常出现后，需要判断它集中在哪些品类、客户、时段或区域，并选择真正能支持行动的一条证据路线。", "哪些结构或分布图能定位问题，哪些行动图能说明影响大小、地点或执行窗口？", "一张分布/热力图；一张层级结构图；从漏斗/瀑布/时间线/地图中选择一至两种；2–3 项行动证据。", "为了覆盖章节而强行使用没有数据基础的漏斗或地图；不同视图使用不同 KPI 口径。", "# TODO：用 px.imshow / px.treemap 等定位问题切片\n# TODO：从 Waterfall / timeline / geo 中选择与字段匹配的行动视图\n# TODO：为每项行动写“证据 → 建议 → 风险/复核信号”"),
        ("组装、试读并离线交付", "第 81 章：组合看板、控件与导出", "负责人将在没有 Notebook 的环境中打开结果。看板必须按“异常→定位→行动”形成清楚路径，并且默认状态已经能讲出核心故事。", "怎样把至少 4 个必要视图组织为可独立阅读的 HTML，并证明交互没有改变指标定义？", "可离线 HTML；统一时间、颜色和单位；30 秒默认试读记录；Hover/图例/范围滑块使用说明。", "把图表拼在一起却没有顺序；只在 Notebook 中查看；导出后 Plotly 资源无法加载。", "from plotly.subplots import make_subplots\n\n# TODO：按“异常 → 定位 → 行动”安排视图\n# TODO：统一标题、颜色、时间范围与 hovertemplate\n# dashboard.write_html(\"retail_weekly_alert.html\", include_plotlyjs=True)"),
    ],
    "projects": [
        ("提交项目提案与数据合同", "第 82–83 章：选题、问题定义与数据准备", "你要从客户价值、履约、需求规划或营销资源中选择一条新情境，将前面模块的方法迁移过去。项目必须服务一个具体决策。", "为谁解决什么问题，哪些数据能支持它，什么结果算项目成功？", "项目提案；利益相关者与非目标；数据来源、粒度、质量审计和成功标准。", "题目写成“分析某数据集”；成功标准只写“得到结论”；清洗规则没有记录。", "# TODO：在 Markdown 定义\n# 决策者 / 决策问题 / 成功标准 / 非目标\n# TODO：读取数据并记录粒度、缺失、重复和保留规则"),
        ("建立最短但充分的证据链", "第 83–84 章：数据质量、分析方法与可视化叙事", "项目时间有限。你不需要展示所有会用的方法，只需要保留能够支持或推翻关键判断的分析。", "从原始数据到建议，哪三至五项证据真正不可缺少，是否存在反例或敏感性？", "核心指标；关键分析表/图；“证据→解释→可能行动”链；至少一次替代口径或敏感性检查。", "堆叠大量探索图；只保留支持预期结论的结果；建议与指标之间没有对应关系。", "# TODO：列出 3–5 项必要证据及其用途\n# TODO：实现最关键分析\n# TODO：改变一个阈值、时间范围或分组口径，检查结论是否稳定"),
        ("交付决策备忘录并复盘", "第 85 章：结果交付与复盘", "决策者不会阅读整个分析过程。你需要用简洁摘要说明应该做什么、为什么、风险是什么，以及下一轮需要补什么数据。", "怎样让别人从原始数据复现主要结论，并据此做出有限、可执行的决定？", "不超过 300 字的管理摘要；按优先级排列的建议；证据索引；局限、实施条件和下一轮数据需求。", "把相关模式写成确定因果；建议没有负责人、条件或复核信号；只交 Notebook 不交可分享结果。", "# TODO：按“建议 / 证据 / 实施条件 / 风险 / 复核信号”整理摘要\n# TODO：导出关键指标、图表或报告\n# TODO：从原始数据重新运行一次主要流程"),
    ],
    "machine-learning": [
        ("建立可信的预测合同", "第 86–99 章：任务定义、特征、切分、预处理与 Pipeline", "模型评审会首先询问：在真正预测发生时，标签是什么、哪些字段可获得、哪些会泄漏未来，以及验证集如何保持独立。", "怎样证明训练数据、特征和评估流程与真实使用时点一致？", "预测时点与标签定义；泄漏审计表；训练/验证/测试切分；基线 Pipeline。", "使用预测后才知道的字段；切分前拟合预处理；没有基线就直接调复杂模型。", "from sklearn.model_selection import train_test_split\nfrom sklearn.pipeline import Pipeline\n\n# TODO：列出预测时点可用字段与泄漏字段\n# TODO：完成独立切分\n# TODO：把预处理和基线模型放进同一 Pipeline"),
        ("比较方案并选择业务阈值", "第 100–108 章：交叉验证、指标、ROC/PR、校准与阈值", "评审人不关心模型名称有多先进，而关心它是否比基线更好，以及错误成本如何影响实际名单或预警量。", "哪个候选模型在验证证据上更可信，阈值如何平衡错过目标与错误行动？", "基线与至少一个候选模型；交叉验证或验证集指标；曲线/混淆矩阵；多个阈值的业务结果。", "在测试集上反复挑模型；只报告 accuracy；阈值直接使用 0.5 却没有业务理由。", "# TODO：在相同切分和指标下比较基线与候选模型\n# TODO：计算多个阈值下的 precision、recall、行动数量或业务成本\n# TODO：在测试集使用前确定选择规则"),
        ("完成错误审计与上线建议", "第 109–119 章：解释、错误分析、保存、模型卡与项目迁移", "上线决定需要知道模型在哪里失效、如何监控、哪些场景不能使用。最终结论可以是上线、有限试点或暂缓。", "怎样用错误样本、群体表现和模型卡支持一项负责任的交付决定？", "错误类型与代表样本；适用/禁用场景；保存的完整 Pipeline；批量预测示例；模型卡和上线建议。", "把特征重要性当因果解释；只保存模型不保存预处理；只写优点不写风险和监控信号。", "# TODO：检查 false positive / false negative 或高误差样本\n# TODO：比较关键群体或时间段表现\n# TODO：保存完整 Pipeline，并填写模型卡、风险和上线条件"),
    ],
}


CAPSTONE_HINTS = {
    "python": {
        "operations": ["用 `Path` 确认输入/输出目录。", "先读取少量记录，写清楚合法记录的规则。", "把校验、汇总和导出拆成函数，再按顺序调用。"],
        "snippet": "from pathlib import Path\nimport csv\n\npath = Path(\"...csv\")\n# TODO：读取一条记录，校验日期、分类与金额\n# TODO：把合法记录交给你的汇总函数",
    },
    "numpy": {
        "operations": ["先打印数组的 `shape`、`dtype` 和少量样本。", "用布尔掩码定位缺失/异常位置。", "用向量化聚合得到每一列或每一路的指标。"],
        "snippet": "import numpy as np\n\nvalues = np.asarray(...)  # TODO：说明两个轴的含义\nmissing_mask = np.isnan(values)\n# TODO：定义异常掩码，并按轴计算统计量",
    },
    "pandas": {
        "operations": ["读取后立即检查行数、字段、类型和缺失。", "先确认主键与粒度，再进行 `merge`。", "转换日期后再做 `groupby`、`rolling` 或 `rank`。"],
        "snippet": "import pandas as pd\n\norders = pd.read_csv(\"...csv\")\norders[\"...date\"] = pd.to_datetime(orders[\"...date\"], errors=\"coerce\")\n# TODO：选择主键合并，并检查合并前后的行数",
    },
    "matplotlib": {
        "operations": ["先为每张图写一句它要回答的问题。", "用 `subplots` 规划布局。", "最后统一补标题、轴标签、图例和导出。"],
        "snippet": "import matplotlib.pyplot as plt\n\nfig, axes = plt.subplots(1, 2, figsize=(...))\n# TODO：在 axes[0]、axes[1] 绘制回答不同问题的图\nfig.savefig(\"report.png\", dpi=...) ",
    },
    "seaborn": {
        "operations": ["先检查类别数量与缺失值。", "选择 `hue`/`col` 前先说明比较维度。", "保持同一类别在不同图中使用一致配色。"],
        "snippet": "import seaborn as sns\n\ndf = sns.load_dataset(\"penguins\")\n# TODO：处理缺失值并选择所需字段\nsns.scatterplot(data=df, x=\"...\", y=\"...\", hue=\"...\")",
    },
    "plotly": {
        "operations": ["把“本周该先处理什么”写成可验证的 KPI、基准和异常规则。", "先用 Plotly Express 做诊断视图，再按问题选择结构、分布或行动图，而不是凑图表类型。", "每张图后写“证据 → 暂时解释 → 下一步要验证什么”；导出 HTML 后按运营负责人的阅读路径试读一次。"],
        "snippet": "import plotly.express as px\n\ntrend = px.line(summary, x=\"...\", y=\"...\", color=\"...\", hover_data=[\"...\"])\ntrend.update_xaxes(rangeslider_visible=True)\n# TODO：说明异常基准、Hover 中的上下文，以及这张图要触发的下一步追问",
    },
    "projects": {
        "operations": ["先用 Markdown 写决策问题与成功标准。", "按“质量检查 → 分析 → 证据图 → 建议”组织单元格。", "结论后单独列出假设、风险和下一步。"],
        "snippet": "# Markdown 计划示例（请改成你的项目）\n# 问题：...\n# 指标：...\n# 数据限制：...\n\n# TODO：从第一段数据质量检查代码开始",
    },
    "machine-learning": {
        "operations": ["先定义标签和预测时点，再排查泄漏字段。", "完成切分后才拟合预处理和模型。", "用指标、阈值、错误样本和模型卡共同说明选择。"],
        "snippet": "from sklearn.model_selection import train_test_split\nfrom sklearn.pipeline import Pipeline\n\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=..., random_state=...)\n# TODO：把预处理和模型放进同一个 Pipeline",
    },
}


CAPSTONE_CHALLENGES = {
    "python": "增加一个真正改善使用体验的功能，例如预算提醒、按关键词搜索或导入预览。必须先写清需求和测试，再实现功能。",
    "numpy": "比较两组安全库存或补货提前期参数，说明预警数量如何变化，以及更保守的规则会增加什么成本。",
    "pandas": "更换延期阈值或时间窗口，检查高风险地区/品类是否稳定，并解释工单数量与漏报风险的取舍。",
    "matplotlib": "为同一份数据制作一个不同读者版本，例如管理层版与执行团队版，并比较视觉层级和信息密度为何不同。",
    "seaborn": "选择一项关键发现，改变样本过滤、类别合并或异常值处理规则，检查统计图中的模式是否仍然存在。",
    "plotly": "为看板增加一个真正改变追问路径的控件，并记录控件改变前后读者能够回答的问题；不要只增加装饰性交互。",
    "projects": "邀请另一位同学只阅读交付文件，不看代码，并记录他能否复述问题、证据、建议和限制；根据反馈修订一次。",
    "machine-learning": "设计一个小规模试点方案：上线对象、人工复核规则、监控指标、停止条件和重新训练触发条件。",
}


CAPSTONE_RUBRICS = {
    "python": """- **数据模型与容器选择（15 分）**：一笔记录和整本账本的结构清楚，唯一性与分类规则可检查。
- **控制流程与业务规则（20 分）**：不同状态和错误原因处理明确，批量处理不会因单条坏记录中断。
- **函数与项目结构（20 分）**：函数职责单一，主要通过参数和返回值协作，完整流程易于阅读。
- **持久化、异常与测试（15 分）**：保存/恢复可靠，正常和异常场景均有测试证据。""",
    "numpy": """- **数组建模与轴解释（20 分）**：shape、dtype、标签和每个轴的业务含义一致。
- **索引、掩码与形状操作（15 分）**：能够定位具体业务片段，并解释形状变化。
- **广播与向量化（20 分）**：批量计算对应正确业务轴，避免不必要的逐格循环。
- **统计、抽样与验证（15 分）**：统计口径合理，抽样可复现，预警结果能回到具体位置。""",
    "pandas": """- **粒度与数据质量（20 分）**：主键、类型、缺失、重复和清洗影响记录完整。
- **合并安全性（20 分）**：连接关系正确，合并前后规模、唯一性和未匹配记录有验证。
- **分组与窗口指标（20 分）**：排序、分组和窗口口径正确，指标能够回答履约问题。
- **工单与导出（10 分）**：异常清单可执行，事实表和指标表可复用。""",
    "matplotlib": """- **问题与图形选择（20 分）**：每张图服务明确问题，选图理由成立。
- **Figure/Axes 与视觉层级（20 分）**：布局有主次，子图之间形成互补证据。
- **编码、标注与可读性（20 分）**：颜色、坐标、单位、图例和注释准确且克制。
- **导出与结论边界（10 分）**：脱离 Notebook 仍可阅读，文字结论不超出图表证据。""",
    "seaborn": """- **样本口径与统计语义（15 分）**：样本量、缺失、变量角色和分组语义明确。
- **分布与组间比较（20 分）**：图形能够揭示中心、离散、尾部或异常，而非只比较均值。
- **关系、分面与多变量表达（20 分）**：方法选择服务研究问题，视觉语义保持一致。
- **解释与稳健性（15 分）**：区分相关与因果，报告反例、小样本和处理规则影响。""",
    "plotly": """- **KPI 与阅读主线（15 分）**：预警口径清楚，默认视图能够启动正确追问。
- **Hover 与交互价值（20 分）**：交互提供上下文、筛选或下钻价值，而非装饰。
- **诊断与行动视图（20 分）**：图形与数据匹配，能够完成异常定位和行动排序。
- **组合、导出与试读（15 分）**：视图语义一致，HTML 可独立使用，阅读路径经过验证。""",
    "projects": """- **问题界定与成功标准（20 分）**：决策者、范围、非目标和成功条件具体。
- **数据合同与质量（15 分）**：来源、粒度、清洗选择和限制可复核。
- **证据链与敏感性（20 分）**：关键分析充分但不堆砌，并检查替代口径或反例。
- **建议与管理摘要（15 分）**：建议可执行，包含证据、条件、风险和复核信号。""",
    "machine-learning": """- **预测合同与泄漏控制（20 分）**：预测时点、标签、特征可用性和切分符合真实使用。
- **Pipeline 与验证设计（20 分）**：预处理、基线、候选模型和选择过程可复现且未污染测试集。
- **业务指标与阈值（20 分）**：评估覆盖错误成本、行动量和阈值选择，不依赖单一准确率。
- **错误审计、模型卡与交付（10 分）**：明确适用范围、失败模式、监控和禁用场景。""",
}


CAPSTONE_SOLUTIONS = {
    "python": r'''
# 参考答案：个人日常记账助手 1.0
# 重点是展示一种完整、可测试的实现；字段和规则并非唯一答案。
from collections import defaultdict
from datetime import datetime
from pathlib import Path
import csv
import json

DATA_PATH = Path("/datasets/module1_ledger.csv")
OUTPUT_DIR = Path("output/finance_assistant")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_CATEGORIES = {"收入", "餐饮", "交通", "购物", "娱乐", "其他"}
REVIEW_THRESHOLD = 3000.0


def parse_record(raw, record_id):
    """把 CSV 原始行转换为统一记录，并返回（记录, 错误原因）。"""
    date_text = str(raw.get("日期", "")).strip()
    category = str(raw.get("分类", "")).strip()
    amount_text = str(raw.get("金额", "")).strip()
    note = str(raw.get("备注", "")).strip()
    if not date_text or not category or not amount_text:
        return None, "日期、分类或金额缺失"
    try:
        day = datetime.strptime(date_text, "%Y-%m-%d").date()
    except ValueError:
        return None, "日期格式非法"
    try:
        amount = float(amount_text)
    except ValueError:
        return None, "金额无法转换为数字"
    if amount <= 0:
        return None, "金额必须为正数"
    if category not in ALLOWED_CATEGORIES:
        return None, f"计划外分类：{category}"
    return {
        "id": record_id,
        "date": day.isoformat(),
        "type": "income" if category == "收入" else "expense",
        "category": category,
        "amount": amount,
        "note": note,
    }, ""


def load_csv(path):
    accepted, rejected, review = [], [], []
    seen = set()
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row_number, raw in enumerate(csv.DictReader(handle), start=2):
            record, reason = parse_record(raw, f"R{row_number - 1:04d}")
            if reason:
                rejected.append({"row": row_number, "reason": reason, **raw})
                continue
            signature = (record["date"], record["category"], record["amount"], record["note"])
            if signature in seen:
                rejected.append({"row": row_number, "reason": "重复记录", **raw})
                continue
            seen.add(signature)
            accepted.append(record)
            if record["type"] == "expense" and record["amount"] >= REVIEW_THRESHOLD:
                review.append(record)
    return accepted, rejected, review


# === 参考答案步骤分隔 ===
def filter_records(records, *, category=None, record_type=None):
    return [
        record for record in records
        if (category is None or record["category"] == category)
        and (record_type is None or record["type"] == record_type)
    ]


def summarize_records(records):
    monthly = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
    category_expense = defaultdict(float)
    for record in records:
        month = record["date"][:7]
        monthly[month][record["type"]] += record["amount"]
        if record["type"] == "expense":
            category_expense[record["category"]] += record["amount"]
    return dict(sorted(monthly.items())), dict(sorted(category_expense.items(), key=lambda item: item[1], reverse=True))


# === 参考答案步骤分隔 ===
def save_records(records, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


def load_records(path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return [], "文件不存在，已返回空账本"
    except json.JSONDecodeError as error:
        return [], f"文件内容损坏：{error.msg}"
    if not isinstance(data, list):
        return [], "账本根对象必须是列表"
    return data, ""


records, rejected, review = load_csv(DATA_PATH)
monthly, category_expense = summarize_records(records)
book_path = OUTPUT_DIR / "records.json"
save_records(records, book_path)
restored, restore_message = load_records(book_path)

with (OUTPUT_DIR / "monthly_summary.csv").open("w", encoding="utf-8-sig", newline="") as handle:
    writer = csv.writer(handle)
    writer.writerow(["month", "income", "expense", "balance"])
    for month, values in monthly.items():
        writer.writerow([month, values["income"], values["expense"], values["income"] - values["expense"]])

print("有效 / 拒绝 / 复核:", len(records), len(rejected), len(review))
print("餐饮记录示例:", filter_records(records, category="餐饮")[:2])
print("分类支出:", category_expense)
print("保存后恢复一致:", restored == records, restore_message)

# 异常测试：缺失文件、损坏 JSON、非法金额。
missing_records, missing_message = load_records(OUTPUT_DIR / "missing.json")
broken_path = OUTPUT_DIR / "broken.json"
broken_path.write_text("{bad json", encoding="utf-8")
broken_records, broken_message = load_records(broken_path)
bad_record, bad_reason = parse_record({"日期": "2026-08-01", "分类": "餐饮", "金额": "bad", "备注": "测试"}, "TEST")
print("异常测试:", missing_message, broken_message, bad_reason)
''',
    "numpy": r'''
# 参考答案：连锁门店补货预警矩阵
from pathlib import Path
import numpy as np

OUTPUT_DIR = Path("output/numpy_replenishment")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(2026)

store_names = np.array(["东城店", "西城店", "南站店", "北湖店"])
product_names = np.array(["咖啡", "牛奶", "面包", "纸巾", "洗衣液", "矿泉水"])

# axis=0 对应门店，axis=1 对应商品。
stock = rng.integers(8, 90, size=(len(store_names), len(product_names))).astype(float)
daily_demand = rng.integers(2, 18, size=stock.shape).astype(float)
safety_stock = np.array([18, 22, 20, 15, 12, 30], dtype=float)  # 对应商品轴
lead_days = np.array([3, 2, 2, 4, 5, 2], dtype=float)          # 对应商品轴

assert stock.shape == daily_demand.shape
assert stock.shape[1] == safety_stock.shape[0] == lead_days.shape[0]

# === 参考答案步骤分隔 ===
# 广播：每个门店都使用同一组商品安全库存与补货提前期。
required_stock = safety_stock + daily_demand * lead_days
stock_gap = stock - required_stock
coverage_days = np.divide(stock, daily_demand, out=np.full_like(stock, np.inf), where=daily_demand > 0)
alert_mask = stock_gap < 0

store_pos, product_pos = np.where(alert_mask)
risk_score = np.where(alert_mask, -stock_gap / np.maximum(required_stock, 1), 0)

# === 参考答案步骤分隔 ===
priority_order = np.argsort(risk_score[store_pos, product_pos])[::-1]
priority_rows = []
for index in priority_order:
    i, j = store_pos[index], product_pos[index]
    priority_rows.append([
        store_names[i], product_names[j], stock[i, j], daily_demand[i, j],
        required_stock[i, j], stock_gap[i, j], risk_score[i, j],
    ])

# axis=1 聚合每家门店；axis=0 聚合每种商品。
store_alert_count = alert_mask.sum(axis=1)
product_alert_rate = alert_mask.mean(axis=0)

# 从未触发预警的组合中固定抽样，检查规则是否遗漏明显风险。
normal_positions = np.argwhere(~alert_mask)
sample_size = min(6, len(normal_positions))
sample_positions = normal_positions[rng.choice(len(normal_positions), size=sample_size, replace=False)]

priority_path = OUTPUT_DIR / "replenishment_priority.csv"
header = "store,product,stock,daily_demand,required_stock,stock_gap,risk_score"
if priority_rows:
    np.savetxt(priority_path, np.asarray(priority_rows, dtype=object), delimiter=",", fmt="%s", header=header, comments="", encoding="utf-8")
else:
    priority_path.write_text(header + "\n", encoding="utf-8")

print("stock shape / dtype:", stock.shape, stock.dtype)
print("各门店预警数:", dict(zip(store_names, store_alert_count)))
print("各商品预警率:", dict(zip(product_names, product_alert_rate.round(3))))
print("优先补货前 5 项:", priority_rows[:5])
print("普通组合复核位置:", sample_positions.tolist())
print("导出:", priority_path)
''',
    "pandas": r'''
# 参考答案：电商履约异常追踪台
from pathlib import Path
import pandas as pd

OUTPUT_DIR = Path("output/pandas_fulfillment")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

orders = pd.read_csv("/datasets/olist_orders_dataset.csv")
items = pd.read_csv("/datasets/olist_order_items_dataset.csv")
customers = pd.read_csv("/datasets/olist_customers_dataset.csv")
products = pd.read_csv("/datasets/olist_products_dataset.csv")
translation = pd.read_csv("/datasets/product_category_name_translation.csv")

audit = pd.DataFrame([
    {"table": name, "rows": len(frame), "duplicate_rows": int(frame.duplicated().sum()), "missing_cells": int(frame.isna().sum().sum())}
    for name, frame in {"orders": orders, "items": items, "customers": customers, "products": products}.items()
])
print(audit)

date_columns = [
    "order_purchase_timestamp", "order_approved_at", "order_delivered_carrier_date",
    "order_delivered_customer_date", "order_estimated_delivery_date",
]
for column in date_columns:
    orders[column] = pd.to_datetime(orders[column], errors="coerce")

# === 参考答案步骤分隔 ===
product_lookup = products[["product_id", "product_category_name"]].merge(
    translation, on="product_category_name", how="left", validate="many_to_one"
)
item_detail = items.merge(product_lookup, on="product_id", how="left", validate="many_to_one")
item_detail["line_amount"] = item_detail["price"] + item_detail["freight_value"]
order_amounts = item_detail.groupby("order_id").agg({
    "line_amount": "sum",
    "order_item_id": "count",
    "product_category_name_english": lambda values: values.mode().iat[0] if not values.mode().empty else "unknown",
}).reset_index().rename(columns={
    "line_amount": "order_amount",
    "order_item_id": "item_count",
    "product_category_name_english": "main_category",
})

fact = orders.merge(customers, on="customer_id", how="left", validate="many_to_one", indicator="customer_merge")
fact = fact.merge(order_amounts, on="order_id", how="left", validate="one_to_one", indicator="item_merge")
assert fact["order_id"].is_unique

fact["delivery_days"] = (fact["order_delivered_customer_date"] - fact["order_purchase_timestamp"]).dt.total_seconds() / 86400
fact["delay_days"] = (fact["order_delivered_customer_date"] - fact["order_estimated_delivery_date"]).dt.total_seconds() / 86400
fact["is_late"] = fact["delay_days"].gt(0)
fact["purchase_month"] = fact["order_purchase_timestamp"].dt.to_period("M").dt.to_timestamp()

# === 参考答案步骤分隔 ===
monthly = fact.groupby("purchase_month").agg({
    "order_id": "nunique", "is_late": "mean", "delay_days": "mean", "order_amount": "sum",
}).reset_index().rename(columns={
    "order_id": "orders", "is_late": "late_rate", "delay_days": "average_delay_days", "order_amount": "revenue",
}).sort_values("purchase_month")
monthly["late_rate_3m_avg"] = monthly["late_rate"].rolling(3, min_periods=1).mean()

state_summary = fact.groupby("customer_state").agg({
    "order_id": "nunique", "is_late": "mean", "delay_days": "mean",
}).reset_index().rename(columns={
    "order_id": "orders", "is_late": "late_rate", "delay_days": "average_delay_days",
}).query("orders >= 30").sort_values(["late_rate", "orders"], ascending=[False, False])

issue_tickets = fact.loc[
    fact["is_late"] & fact["order_delivered_customer_date"].notna(),
    ["order_id", "customer_state", "main_category", "order_purchase_timestamp", "delay_days", "order_amount"],
].sort_values(["delay_days", "order_amount"], ascending=[False, False])

fact.to_csv(OUTPUT_DIR / "order_fact.csv", index=False)
monthly.to_csv(OUTPUT_DIR / "fulfillment_monthly.csv", index=False)
state_summary.to_csv(OUTPUT_DIR / "fulfillment_by_state.csv", index=False)
issue_tickets.to_csv(OUTPUT_DIR / "late_order_tickets.csv", index=False)

print("事实表规模:", fact.shape, "订单唯一:", fact["order_id"].is_unique)
print("客户/商品未匹配:", (fact["customer_merge"] != "both").sum(), (fact["item_merge"] != "both").sum())
print("高延期州:"); print(state_summary.head(5).round(3))
print("异常工单数:", len(issue_tickets))
''',
    "matplotlib": r'''
# 参考答案：经营周会一页报告
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec

OUTPUT_DIR = Path("output/matplotlib_weekly_report")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

retail = pd.read_csv("/datasets/uci_online_retail_200k.csv")
retail["InvoiceDate"] = pd.to_datetime(retail["InvoiceDate"], errors="coerce")
retail["Quantity"] = pd.to_numeric(retail["Quantity"], errors="coerce")
retail["UnitPrice"] = pd.to_numeric(retail["UnitPrice"], errors="coerce")
clean = retail.loc[
    retail["InvoiceDate"].notna()
    & retail["Quantity"].gt(0)
    & retail["UnitPrice"].gt(0)
    & ~retail["InvoiceNo"].astype(str).str.startswith("C")
].copy()
clean["Revenue"] = clean["Quantity"] * clean["UnitPrice"]
clean["Month"] = clean["InvoiceDate"].dt.to_period("M").dt.to_timestamp()

monthly = clean.groupby("Month", as_index=False)["Revenue"].sum()
country = clean.groupby("Country", as_index=False)["Revenue"].sum().nlargest(8, "Revenue").sort_values("Revenue")
orders = clean.groupby("InvoiceNo")[["Revenue", "Quantity"]].sum().reset_index().rename(
    columns={"Revenue": "order_value", "Quantity": "items"}
)
upper_value = orders["order_value"].quantile(.99)
plot_orders = orders.loc[orders["order_value"] <= upper_value]

# === 参考答案步骤分隔 ===
fig = plt.figure(figsize=(14, 9), constrained_layout=True)
# Figure.add_gridspec 在课程环境的 Matplotlib 2.2 中尚不可用。
grid = GridSpec(2, 3, figure=fig, height_ratios=[1.1, 1])
ax_trend = fig.add_subplot(grid[0, :2])
ax_country = fig.add_subplot(grid[0, 2])
ax_distribution = fig.add_subplot(grid[1, 0])
ax_relation = fig.add_subplot(grid[1, 1:])

ax_trend.plot(monthly["Month"], monthly["Revenue"], marker="o", color="#2563eb", linewidth=2.4)
peak = monthly.loc[monthly["Revenue"].idxmax()]
ax_trend.annotate(f"峰值 {peak['Revenue']:,.0f}", (peak["Month"], peak["Revenue"]), xytext=(8, 12), textcoords="offset points", color="#b42318")
ax_trend.set(title="月度销售额趋势", xlabel="月份", ylabel="销售额")

ax_country.barh(country["Country"], country["Revenue"], color="#2e90a5")
ax_country.set(title="销售额最高的国家/地区", xlabel="销售额", ylabel="")

ax_distribution.hist(plot_orders["order_value"], bins=24, color="#7f56d9", edgecolor="white")
ax_distribution.axvline(plot_orders["order_value"].median(), color="#b42318", linestyle="--", label="中位数")
ax_distribution.set(title="订单金额分布（截至 P99）", xlabel="订单金额", ylabel="订单数")
ax_distribution.legend()

sample = plot_orders.sample(min(1500, len(plot_orders)), random_state=2026)
ax_relation.scatter(sample["items"], sample["order_value"], alpha=.28, s=18, color="#1570ef")
ax_relation.set(title="订单件数与订单金额", xlabel="订单件数", ylabel="订单金额")

# === 参考答案步骤分隔 ===
for axis in fig.axes:
    axis.grid(axis="y", alpha=.2)
fig.suptitle("经营周会一页报告｜趋势、贡献、分布与订单结构", fontsize=17, fontweight="bold")

png_path = OUTPUT_DIR / "weekly_business_report.png"
svg_path = OUTPUT_DIR / "weekly_business_report.svg"
fig.savefig(png_path, dpi=180, bbox_inches="tight")
fig.savefig(svg_path, bbox_inches="tight")
plt.show()

notes = [
    f"- 报告使用 {len(clean):,} 条有效商品行，剔除取消、非正数量/价格和无效日期。",
    f"- 最高销售月份为 {peak['Month']:%Y-%m}，销售额 {peak['Revenue']:,.0f}。",
    f"- 订单金额 P99 为 {upper_value:,.2f}；分布图截断仅用于提高可读性，未从业务数据中删除这些订单。",
    "- 图表描述历史样本中的关系，不足以证明月份、国家或订单件数造成销售变化。",
]
(OUTPUT_DIR / "report_notes.md").write_text("# 图表审阅说明\n\n" + "\n".join(notes), encoding="utf-8")
print("已导出:", png_path, svg_path)
''',
    "seaborn": r'''
# 参考答案：客群消费行为差异研究
from pathlib import Path
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

OUTPUT_DIR = Path("output/seaborn_customer_study")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
sns.set(style="whitegrid", palette="deep")

tips = pd.read_csv("/datasets/tips.csv")
required = ["total_bill", "tip", "sex", "smoker", "day", "time", "size"]
clean = tips.dropna(subset=required).copy()
clean["tip_rate"] = clean["tip"] / clean["total_bill"]
palette = {"Lunch": "#1570ef", "Dinner": "#f79009"}

print("原始 / 分析样本:", len(tips), len(clean))
print("按时段样本量:", clean["time"].value_counts().to_dict())
print("按日期和时段样本量:"); print(pd.crosstab(clean["day"], clean["time"]))

fig, axes = plt.subplots(1, 3, figsize=(15, 4.7), constrained_layout=True)
sns.boxplot(data=clean, x="time", y="total_bill", order=["Lunch", "Dinner"], palette=palette, ax=axes[0])
axes[0].set(title="不同时段的账单金额", xlabel="时段", ylabel="账单金额")

# === 参考答案步骤分隔 ===
for time_name in ["Lunch", "Dinner"]:
    values = clean.loc[clean["time"] == time_name, "tip_rate"]
    sns.distplot(values, hist=True, kde=True, label=time_name, color=palette[time_name], ax=axes[1])
axes[1].set(title="小费率分布", xlabel="小费率", ylabel="密度")
axes[1].legend(title="时段")

# 旧版 Seaborn 的 scatterplot 与当前 NumPy 组合存在兼容问题；按组调用
# regplot(fit_reg=False) 仍保留颜色、点型和图例语义，也方便学生读懂分组逻辑。
markers = {"Yes": "X", "No": "o"}
for (time_name, smoker), group in clean.groupby(["time", "smoker"]):
    sns.regplot(
        data=group, x="total_bill", y="tip", fit_reg=False,
        marker=markers[smoker], color=palette[time_name],
        scatter_kws={"alpha": .75, "s": 34},
        label=f"{time_name} / {smoker}", ax=axes[2],
    )
axes[2].set(title="账单与小费关系", xlabel="账单金额", ylabel="小费")
axes[2].legend(title="时段 / 吸烟", fontsize=8)
overview_path = OUTPUT_DIR / "customer_behavior_overview.png"
fig.savefig(overview_path, dpi=180, bbox_inches="tight")
plt.show()

# === 参考答案步骤分隔 ===
grid = sns.lmplot(
    data=clean, x="total_bill", y="tip", hue="time", col="smoker",
    palette=palette, height=4, aspect=1, scatter_kws={"alpha": .55, "s": 28},
)
grid.fig.suptitle("吸烟状态分面下的账单—小费关系", y=1.04)
facet_path = OUTPUT_DIR / "bill_tip_facets.png"
grid.fig.savefig(facet_path, dpi=180, bbox_inches="tight")
plt.show()

numeric = ["total_bill", "tip", "size", "tip_rate"]
correlation = clean[numeric].corr()
fig, axis = plt.subplots(figsize=(6.5, 5), constrained_layout=True)
sns.heatmap(correlation, annot=True, fmt=".2f", cmap="vlag", vmin=-1, vmax=1, ax=axis)
axis.set_title("连续变量相关矩阵")
heatmap_path = OUTPUT_DIR / "customer_correlation.png"
fig.savefig(heatmap_path, dpi=180, bbox_inches="tight")
plt.show()

summary = clean.groupby("time").agg({
    "total_bill": ["size", "median"], "tip_rate": "median",
})
summary.columns = ["samples", "median_bill", "median_tip_rate"]
summary = summary.round(3)

observations = [
    f"- 分析样本 {len(clean)} 行；本次关键字段没有静默删除。",
    f"- 晚餐与午餐样本量分别为 {int(summary.loc['Dinner', 'samples'])} 和 {int(summary.loc['Lunch', 'samples'])}，比较时需要考虑不平衡。",
    f"- 晚餐账单中位数 {summary.loc['Dinner', 'median_bill']:.2f}，午餐 {summary.loc['Lunch', 'median_bill']:.2f}。",
    "- 分面中的回归线只描述样本关系；时段、吸烟状态与小费之间不能据此解释为因果。",
    "- 下一步应补充顾客身份、门店和促销信息，并检查同一顾客重复消费。",
]
(OUTPUT_DIR / "research_brief.md").write_text("# 客群消费行为研究简报\n\n" + "\n".join(observations), encoding="utf-8")
print(summary)
''',
    "plotly": r'''
# 参考答案：周度经营预警会交互看板
from pathlib import Path
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

OUTPUT_DIR = Path("output/plotly_weekly_alert")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

retail = pd.read_csv("/datasets/uci_online_retail_200k.csv")
retail["InvoiceDate"] = pd.to_datetime(retail["InvoiceDate"], errors="coerce")
retail["Quantity"] = pd.to_numeric(retail["Quantity"], errors="coerce")
retail["UnitPrice"] = pd.to_numeric(retail["UnitPrice"], errors="coerce")
clean = retail.loc[
    retail["InvoiceDate"].notna()
    & retail["Quantity"].gt(0)
    & retail["UnitPrice"].gt(0)
    & ~retail["InvoiceNo"].astype(str).str.startswith("C")
].copy()
clean["Revenue"] = clean["Quantity"] * clean["UnitPrice"]
# 用“回退到周一”的方式构造周起点，兼容课程环境中的旧版 Pandas。
clean["Week"] = (
    clean["InvoiceDate"]
    - pd.to_timedelta(clean["InvoiceDate"].dt.weekday, unit="D")
).dt.normalize()
clean["weekday"] = clean["InvoiceDate"].dt.strftime("%a")
clean["hour"] = clean["InvoiceDate"].dt.hour

weekly = (clean.groupby("Week", as_index=False)
          .agg({"Revenue": "sum", "InvoiceNo": "nunique"})
          .rename(columns={"Revenue": "revenue", "InvoiceNo": "orders"}))
weekly["aov"] = weekly["revenue"] / weekly["orders"]
weekly["baseline"] = weekly["revenue"].rolling(4, min_periods=2).median().shift(1)
weekly["alert"] = weekly["revenue"] < weekly["baseline"] * .75

country = (clean.groupby("Country", as_index=False)
           .agg({"Revenue": "sum", "InvoiceNo": "nunique"})
           .rename(columns={"Revenue": "revenue", "InvoiceNo": "orders"}))
country = country.nlargest(10, "revenue").sort_values("revenue")

# === 参考答案步骤分隔 ===
heat = clean.pivot_table(index="weekday", columns="hour", values="Revenue", aggfunc="mean", fill_value=0)
weekday_order = [day for day in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] if day in heat.index]
heat = heat.reindex(weekday_order)
products = (clean.groupby("Description", as_index=False)
            .agg({"Revenue": "sum", "Quantity": "sum"})
            .rename(columns={"Revenue": "revenue", "Quantity": "quantity"}))
products = products.dropna().nlargest(18, "revenue")

# === 参考答案步骤分隔 ===
fig = make_subplots(
    rows=2, cols=2,
    subplot_titles=("周销售额与预警", "重点国家/地区贡献", "星期 × 小时平均销售额", "重点商品结构"),
    specs=[[{"type": "xy"}, {"type": "xy"}], [{"type": "heatmap"}, {"type": "domain"}]],
)
fig.add_trace(go.Scatter(
    x=weekly["Week"], y=weekly["revenue"], mode="lines+markers", name="周销售额",
    customdata=weekly[["orders", "aov", "alert"]],
    hovertemplate="周=%{x|%Y-%m-%d}<br>销售额=%{y:,.0f}<br>订单=%{customdata[0]}<br>客单价=%{customdata[1]:.1f}<br>预警=%{customdata[2]}<extra></extra>",
), row=1, col=1)
fig.add_trace(go.Scatter(
    x=weekly["Week"], y=weekly["baseline"], mode="lines", name="4 周中位基准", line={"dash": "dash", "color": "#f04438"},
), row=1, col=1)
fig.add_trace(go.Bar(
    x=country["revenue"], y=country["Country"], orientation="h", name="国家/地区",
    customdata=country[["orders"]], hovertemplate="%{y}<br>销售额=%{x:,.0f}<br>订单=%{customdata[0]}<extra></extra>",
), row=1, col=2)
fig.add_trace(go.Heatmap(
    z=heat.values, x=heat.columns, y=heat.index, colorscale="Blues",
    hovertemplate="星期=%{y}<br>小时=%{x}<br>平均销售额=%{z:,.1f}<extra></extra>", colorbar={"title": "平均销售额"},
), row=2, col=1)
fig.add_trace(go.Treemap(
    labels=products["Description"], parents=["重点商品"] * len(products), values=products["revenue"],
    customdata=products[["quantity"]], hovertemplate="%{label}<br>销售额=%{value:,.0f}<br>件数=%{customdata[0]:,.0f}<extra></extra>",
), row=2, col=2)
fig.update_xaxes(rangeslider_visible=True, row=1, col=1)
fig.update_layout(height=850, width=1180, template="plotly_white", title="周度经营预警会｜异常 → 定位 → 行动")

dashboard_path = OUTPUT_DIR / "retail_weekly_alert.html"
fig.write_html(dashboard_path, include_plotlyjs=True)

alerts = weekly.loc[weekly["alert"]].sort_values("revenue")
top_country = country.iloc[-1]
actions = [
    f"- 优先复核 {len(alerts)} 个低于近 4 周中位基准 25% 的周；先检查订单数和客单价谁发生变化。",
    f"- 重点国家/地区 {top_country['Country']} 的历史销售额最高，但集中度本身不是因果，需要结合退货和促销信息。",
    "- 使用星期×小时热力图安排复核窗口；下周继续观察相同时间格，而不是只比较总体均值。",
]
(OUTPUT_DIR / "meeting_brief.md").write_text("# 经营预警会简报\n\n" + "\n".join(actions), encoding="utf-8")
print("预警周数:", len(alerts), "；已导出:", dashboard_path)
''',
    "projects": r'''
# 参考答案：跨模块业务决策项目（共享单车高峰运力规划示例）
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt

OUTPUT_DIR = Path("output/business_decision_project")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 决策者：站点运营经理；决定下周在哪些“星期类型 × 小时”增加调度资源。
# 成功标准：用有限的高峰时段覆盖尽可能多的历史需求，并说明阈值敏感性。
bike = pd.read_csv("/datasets/bike_sharing_hour.csv")
bike["dteday"] = pd.to_datetime(bike["dteday"], errors="coerce")
bike["day_type"] = bike["workingday"].map({1: "工作日", 0: "非工作日"})
bike["weather"] = bike["weathersit"].map({1: "晴朗", 2: "多云/薄雾", 3: "小雨雪", 4: "恶劣天气"})

quality = {
    "rows": len(bike),
    "duplicate_rows": int(bike.duplicated().sum()),
    "missing_cells": int(bike.isna().sum().sum()),
    "date_min": bike["dteday"].min(),
    "date_max": bike["dteday"].max(),
}
clean = bike.dropna(subset=["dteday", "hr", "cnt", "day_type", "weather"]).copy()

# === 参考答案步骤分隔 ===
# 先用旧式聚合生成稳定的列结构，再给业务指标命名。
hour_profile = (clean.groupby(["day_type", "hr"])["cnt"]
                .agg(["mean", lambda values: values.quantile(.90), "size"])
                .reset_index())
hour_profile.columns = ["day_type", "hr", "average_demand", "p90_demand", "observations"]
weather_profile = (clean.groupby(["day_type", "weather"])["cnt"]
                   .agg(["mean", "size"])
                   .reset_index())
weather_profile.columns = ["day_type", "weather", "average_demand", "observations"]

# 敏感性：高峰阈值分别使用 P75 和 P90。
threshold_rows = []
for quantile in [.75, .90]:
    threshold = clean["cnt"].quantile(quantile)
    flagged = clean["cnt"] >= threshold
    threshold_rows.append({
        "quantile": quantile,
        "threshold": threshold,
        "flagged_hours": int(flagged.sum()),
        "demand_coverage": float(clean.loc[flagged, "cnt"].sum() / clean["cnt"].sum()),
    })
sensitivity = pd.DataFrame(threshold_rows)

priority_slots = hour_profile.sort_values(["p90_demand", "average_demand"], ascending=False).head(8)

# === 参考答案步骤分隔 ===
fig, axes = plt.subplots(1, 2, figsize=(13, 4.8), constrained_layout=True)
for day_type, group in hour_profile.groupby("day_type"):
    axes[0].plot(group["hr"], group["average_demand"], marker="o", label=day_type)
axes[0].set(title="工作日与非工作日小时需求", xlabel="小时", ylabel="平均租借量")
axes[0].legend()

for day_type, group in weather_profile.groupby("day_type"):
    axes[1].bar(group["weather"] + "\n" + day_type, group["average_demand"], alpha=.8, label=day_type)
axes[1].set(title="天气与日期类型下的需求", xlabel="天气 / 日期类型", ylabel="平均租借量")
axes[1].tick_params(axis="x", rotation=30)
evidence_path = OUTPUT_DIR / "resource_planning_evidence.png"
fig.savefig(evidence_path, dpi=180, bbox_inches="tight")
plt.show()

hour_profile.to_csv(OUTPUT_DIR / "hour_profile.csv", index=False)
sensitivity.to_csv(OUTPUT_DIR / "threshold_sensitivity.csv", index=False)
priority_slots.to_csv(OUTPUT_DIR / "priority_slots.csv", index=False)

memo = [
    "# 高峰运力规划决策备忘录",
    f"- 数据范围：{quality['date_min']:%Y-%m-%d} 至 {quality['date_max']:%Y-%m-%d}，分析 {len(clean):,} 个小时记录。",
    f"- 建议优先覆盖 {len(priority_slots)} 个日期类型×小时组合，依据历史 P90 与平均需求共同排序。",
    f"- P75 规则覆盖需求 {sensitivity.loc[0, 'demand_coverage']:.1%}，P90 规则覆盖 {sensitivity.loc[1, 'demand_coverage']:.1%}；更严格阈值减少调度时段但也降低覆盖。",
    "- 实施条件：先进行一周试点，记录缺车、满桩和实际调度成本。",
    "- 限制：数据没有站点位置、容量和实时库存，不能直接决定具体调车数量。",
]
(OUTPUT_DIR / "decision_memo.md").write_text("\n".join(memo), encoding="utf-8")
print(quality)
print(priority_slots)
print(sensitivity.round(3))
''',
    "machine-learning": r'''
# 参考答案：模型上线评审会（银行营销响应预测示例）
from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

OUTPUT_DIR = Path("output/ml_release_review")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
data = pd.read_csv("/datasets/bank_marketing_full.csv", sep=";")
data["target"] = data["y"].map({"yes": 1, "no": 0})

# 预测时点是拨打营销电话之前；duration 通话结束后才能知道，因此属于泄漏字段。
leakage_fields = ["duration", "y", "target"]
feature_columns = [column for column in data.columns if column not in leakage_fields]
X = data[feature_columns]
y = data["target"]

X_train_full, X_test, y_train_full, y_test = train_test_split(
    X, y, test_size=.20, stratify=y, random_state=2026
)
X_train, X_valid, y_train, y_valid = train_test_split(
    X_train_full, y_train_full, test_size=.25, stratify=y_train_full, random_state=2026
)

# 避开旧版 Pandas select_dtypes 与新版 NumPy 的兼容缺陷，逐列判断 dtype。
numeric = [column for column in X.columns if np.issubdtype(X[column].dtype, np.number)]
categorical = [column for column in X.columns if column not in numeric]
preprocess = ColumnTransformer([
    ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), numeric),
    ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical),
])

models = {
    "dummy": Pipeline([("prep", preprocess), ("model", DummyClassifier(strategy="prior"))]),
    "logistic": Pipeline([("prep", preprocess), ("model", LogisticRegression(max_iter=800, class_weight="balanced", random_state=2026))]),
}

# === 参考答案步骤分隔 ===
validation_rows = []
for name, model in models.items():
    model.fit(X_train, y_train)
    probability = model.predict_proba(X_valid)[:, 1]
    prediction = probability >= .5
    validation_rows.append({
        "model": name,
        "pr_auc": average_precision_score(y_valid, probability),
        "roc_auc": roc_auc_score(y_valid, probability),
        "precision_at_0.5": precision_score(y_valid, prediction, zero_division=0),
        "recall_at_0.5": recall_score(y_valid, prediction, zero_division=0),
    })
validation_scores = pd.DataFrame(validation_rows).sort_values("pr_auc", ascending=False)

candidate = models["logistic"]
valid_probability = candidate.predict_proba(X_valid)[:, 1]
threshold_rows = []
for threshold in np.arange(.10, .81, .05):
    prediction = valid_probability >= threshold
    threshold_rows.append({
        "threshold": float(threshold),
        "contacts": int(prediction.sum()),
        "contact_rate": float(prediction.mean()),
        "precision": precision_score(y_valid, prediction, zero_division=0),
        "recall": recall_score(y_valid, prediction, zero_division=0),
        "f1": f1_score(y_valid, prediction, zero_division=0),
    })
threshold_table = pd.DataFrame(threshold_rows)
eligible = threshold_table.loc[threshold_table["precision"] >= .25]
chosen_row = (eligible.sort_values(["recall", "precision"], ascending=False).iloc[0]
              if len(eligible) else threshold_table.sort_values("f1", ascending=False).iloc[0])
chosen_threshold = float(chosen_row["threshold"])

# === 参考答案步骤分隔 ===
# 模型与阈值均确定后，使用 train+valid 重新拟合；测试集只评估一次。
final_model = Pipeline([("prep", preprocess), ("model", LogisticRegression(max_iter=800, class_weight="balanced", random_state=2026))])
final_model.fit(X_train_full, y_train_full)
test_probability = final_model.predict_proba(X_test)[:, 1]
test_prediction = test_probability >= chosen_threshold
test_metrics = {
    "pr_auc": average_precision_score(y_test, test_probability),
    "roc_auc": roc_auc_score(y_test, test_probability),
    "precision": precision_score(y_test, test_prediction, zero_division=0),
    "recall": recall_score(y_test, test_prediction, zero_division=0),
    "contacts": int(test_prediction.sum()),
}

errors = X_test.copy()
errors["actual"] = y_test.values
errors["probability"] = test_probability
errors["prediction"] = test_prediction.astype(int)
errors["error_type"] = np.select(
    [(errors["actual"] == 1) & (errors["prediction"] == 0), (errors["actual"] == 0) & (errors["prediction"] == 1)],
    ["false_negative", "false_positive"], default="correct",
)

model_path = OUTPUT_DIR / "bank_marketing_pipeline.joblib"
joblib.dump(final_model, model_path)
validation_scores.to_csv(OUTPUT_DIR / "model_comparison.csv", index=False)
threshold_table.to_csv(OUTPUT_DIR / "threshold_decisions.csv", index=False)
errors.query("error_type != 'correct'").head(50).to_csv(OUTPUT_DIR / "error_examples.csv", index=False)

recommendation = "有限试点" if test_metrics["pr_auc"] > y_test.mean() and test_metrics["precision"] >= .20 else "暂缓"
model_card = [
    "# 银行营销响应模型卡",
    f"- 评审结论：{recommendation}。",
    "- 预测时点：拨打电话前；duration 已排除，避免后验泄漏。",
    f"- 选择阈值：{chosen_threshold:.2f}；测试指标：{json.dumps(test_metrics, ensure_ascii=False)}。",
    "- 适用范围：与本教学快照相近的营销名单排序，不用于自动拒绝客户或高风险决策。",
    "- 主要风险：历史人群和渠道可能漂移；不同职业、年龄或月份的错误率可能不同。",
    "- 监控：联系率、precision、recall、特征缺失率和目标转化率；显著漂移时停止自动推荐。",
]
(OUTPUT_DIR / "model_card.md").write_text("\n".join(model_card), encoding="utf-8")
print(validation_scores.round(3))
print("阈值:", chosen_threshold, "测试指标:", test_metrics, "评审结论:", recommendation)
''',
}


PROMPT_CAPSTONES = [
    {
        "filename": "module-capstone-python.ipynb", "module": "python", "title": "个人日常记账助手 1.0", "minutes": 180,
        "tags": ["Python", "记账助手", "程序设计", "文件与异常"],
        "chapters": """本作业沿用第一模块贯穿始终的“个人日常记账助手”背景，并按课程能力自然升级：

| 课程阶段 | 章节 | 在应用中解决的问题 |
| --- | --- | --- |
| 从文本到数据 | 第 1–3 章 | 运行程序，表达金额与状态，清洗一行账目文本 |
| 从一笔到一本 | 第 4–7 章 | 用容器组织记录、字段、分类和唯一编号 |
| 从数据到规则 | 第 8–9 章 | 校验业务规则并批量处理多笔账目 |
| 从脚本到功能 | 第 10–11 章 | 用函数封装添加、查询、排序和汇总 |
| 从内存到可靠保存 | 第 12–14 章 | 文件/JSON/CSV 持久化、异常响应与测试 |
| 从功能到项目 | 第 15 章 | 用类、模块职责和完整流程组织交付 |""",
        "scenario": "你要把前 15 章逐步完成的课堂原型整理为一款可以交给他人使用的“个人日常记账助手 1.0”。它不仅要算出年度报表，还要能接收、校验、管理、查询、汇总和保存账目，并在遇到错误输入时给出可理解的反馈。",
        "data_hint": "可使用 `public/datasets/module1_ledger.csv` 作为批量导入样本，也可以补充自建记录。建议字段包含 `id`、`date`、`type`、`category`、`amount`、`note`；允许分类、重复规则和大额复核阈值由你定义，但必须在 Notebook 中说明。",
        "requirements": ["完成一条从原始文本到结构化记录的处理流程。", "使用列表、字典和集合解决多记录、命名字段、唯一性与分类检查问题。", "用条件与循环实现拒绝、复核、通过等批处理规则。", "把校验、添加、查询/排序、汇总、加载和保存拆成职责明确的函数。", "至少生成月度汇总和分类汇总，并让结论能回溯到原始记录。", "使用 JSON 或 CSV 保存/恢复数据，并测试文件缺失、内容损坏或非法记录。", "用一次完整演示串联“加载 → 添加 → 校验 → 查询/汇总 → 保存”。"],
        "deliverables": ["可从头运行的“个人日常记账助手 1.0” Notebook。", "账本数据文件与至少一份月度/分类汇总文件。", "正常输入、非法输入和损坏/缺失文件的测试证据。", "使用说明：数据结构、主要功能、运行顺序和已知局限。"],
        "checks": ["重启内核后从第一格运行，仍可完成完整演示。", "错误记录有明确原因，不会悄悄进入汇总。", "函数主要通过参数接收输入、通过返回值交出结果。", "保存后重新加载，记录数量与关键字段保持一致。", "代码注释解释业务规则和设计选择，而不是逐行翻译语法。"],
    },
    {
        "filename": "module-capstone-numpy.ipynb", "module": "numpy", "title": "连锁门店补货预警矩阵", "minutes": 120,
        "tags": ["NumPy", "库存预警", "广播", "统计抽样"],
        "chapters": """| 已学阶段 | 章节 | 可带入作业的项目零件 |
| --- | --- | --- |
| 数组建模 | 第 16–17 章 | ndarray、shape、dtype 与轴含义 |
| 定位片段 | 第 18–19 章 | 切片、索引、布尔掩码与形状调整 |
| 批量规则 | 第 20 章 | 向量化和广播计算 |
| 复核决策 | 第 21 章 | 按轴统计、随机抽样与可复现性 |""",
        "scenario": "区域仓库每天面对数十个“门店 × 商品”组合，却只能优先处理少量补货任务。你需要建立一套 NumPy 预警矩阵，快速识别库存覆盖不足的位置，形成优先清单，并抽样检查预警规则是否过于激进。",
        "data_hint": "可以根据任务自建一组规模适中的库存、近期需求和安全库存数组，也可以从课程零售数据整理后再转为 ndarray。必须保存门店和商品标签，并说明所有数组的轴顺序、单位和广播方向。",
        "requirements": ["建立至少两个 shape 兼容的二维业务矩阵，并保留轴标签。", "使用索引、切片或布尔掩码定位具体门店/商品组合。", "通过广播计算库存差额、覆盖天数或同等级风险指标。", "使用按轴统计和排序形成补货优先级。", "使用固定随机种子抽样复核一部分未预警记录。"],
        "deliverables": ["带轴说明和关键 shape 检查的 Notebook。", "补货预警矩阵、优先补货清单和门店/商品统计摘要。", "抽样复核记录，以及阈值可能造成的误报/漏报说明。"],
        "checks": ["所有矩阵都能对应回具体门店和商品。", "核心预警计算使用向量化或广播完成。", "广播前后的 shape 与业务轴已经验证。", "抽样使用固定随机种子并说明抽样范围。"],
    },
    {
        "filename": "module-capstone-pandas.ipynb", "module": "pandas", "title": "电商履约异常追踪台", "minutes": 150,
        "tags": ["Pandas", "履约追踪", "多表合并", "窗口计算"],
        "chapters": """| 已学阶段 | 章节 | 可带入作业的项目零件 |
| --- | --- | --- |
| 读懂与清洗 | 第 22–28 章 | 字段检查、类型转换、缺失/重复处理与文件读写 |
| 建立指标 | 第 29 章 | 分组、聚合和透视结果 |
| 形成事实表 | 第 30 章 | 多表连接、粒度验证与结构转换 |
| 追踪变化 | 第 31 章 | 排序、累计、滚动和排名指标 |""",
        "scenario": "客服团队发现延期投诉增加，但现有订单、客户、商品和明细表彼此分散。你的任务是建立一张订单粒度事实表，识别延期风险集中的地区或品类，并输出可以交给客服复核的异常订单工单。",
        "data_hint": "使用课程 Olist 订单、订单明细、客户、商品及类别翻译数据。先写明每张表一行代表什么、主键和连接关系；原始文件只读，清洗后的事实表另行导出。",
        "requirements": ["记录每张源表的粒度、主键、类型、缺失和重复情况。", "至少合并三张表，并验证合并没有意外放大订单粒度。", "构造延期时长、订单金额、商品数等必要字段。", "使用分组指标和一个排序后的窗口指标追踪履约变化。", "输出订单级异常工单，并为发现写明样本量、口径和局限。"],
        "deliverables": ["数据字典、合并关系和质量审计。", "订单粒度事实表、履约趋势指标表和异常工单 CSV。", "3 条可回溯到指标或订单的运营发现。"],
        "checks": ["所有日期在计算时效前已转换并检查。", "事实表中的订单主键保持唯一。", "合并未匹配记录和行数变化有解释。", "窗口计算前已按正确分组和时间排序。"],
    },
    {
        "filename": "module-capstone-matplotlib.ipynb", "module": "matplotlib", "title": "经营周会一页报告", "minutes": 120,
        "tags": ["Matplotlib", "统计图", "静态报告"],
        "chapters": "第 32–43 章已经留下四类项目零件：Figure/Axes 结构、按问题选图、子图与视觉层级、注释和导出。本作业只选择能服务周会问题的图，不要求机械覆盖所有图形。",
        "scenario": "负责人要求你制作一页可直接放入周会材料的静态报告。读者只有三分钟：必须先看到一项核心变化，再看到解释它的结构或分布证据，最后知道哪些异常值得讨论。",
        "data_hint": "建议使用 `uci_online_retail_200k.csv` 或 Olist 数据，整理出日期、类别、销售额/订单量等字段。也可使用结构相近的经营数据。",
        "requirements": ["先写出三个周会问题、读者动作和选图理由。", "制作一张主图和至少两张辅助图，形成明确视觉层级。", "完成标题、单位、图例和必要注释，保持颜色语义一致。", "检查坐标范围、类别顺序和文字密度，避免误导。", "以 PNG 或 SVG 导出，并说明图表支持与不能支持的结论。"],
        "deliverables": ["含图表设计理由的 Notebook。", "一张导出的静态报告图。", "对图中最重要发现和限制的文字说明。"],
        "checks": ["每个视觉编码都有明确含义。", "图中文字在默认窗口下可读。", "结论不超出图表所能支持的范围。"],
    },
    {
        "filename": "module-capstone-seaborn.ipynb", "module": "seaborn", "title": "客群消费行为差异研究", "minutes": 135,
        "tags": ["Seaborn", "客群比较", "统计语义", "分面"],
        "chapters": "第 44–63 章形成一条统计研究链：先固定整洁数据与视觉语义，再检查样本量和分布，随后探索关系与回归，最后用分面、pairplot 或热力图验证模式是否跨群体成立。",
        "scenario": "会员运营团队发现不同客群的平均消费似乎存在差异，但担心样本量、偏态和异常值造成误判。你需要提交一份统计图形研究简报，说明哪些差异稳定、哪些只是线索，以及还需要补充什么数据。",
        "data_hint": "建议使用 `tips.csv`、`diamonds.csv` 或其他带类别与连续变量的顾客/门店数据；需说明样本量、缺失处理和变量单位。",
        "requirements": ["记录分析样本、缺失处理和各组样本量。", "使用互补分布图比较至少两个客群，不能只展示均值。", "使用关系/回归图检查变量共同变化，并说明因果边界。", "使用分面或多变量图验证模式是否跨群体成立。", "保持颜色、类别顺序和变量单位一致，并报告至少一项反例或限制。"],
        "deliverables": ["可重复运行的统计研究 Notebook。", "一组围绕同一研究问题组织的统计图。", "3 条发现、对应证据，以及反例/限制和下一步数据需求。"],
        "checks": ["样本排除和各组数量已报告。", "同一类别在多图中保持颜色一致。", "异常值或缺失处理不会被静默隐藏。", "文字明确区分相关模式与因果结论。"],
    },
    {
        "filename": "module-capstone-plotly.ipynb", "module": "plotly", "title": "周度经营预警会：交互诊断与行动看板", "minutes": 180,
        "tags": ["Plotly", "经营预警", "交互诊断", "行动看板"],
        "chapters": "第 64–81 章的能力链是：先用 Hover 与基础图确认异常，再用趋势/类别图追问，接着以分布、矩阵和层级图定位问题切片，最后用漏斗、瀑布、时间线或地图支撑行动优先级，并组合、导出为可独立阅读的看板。",
        "scenario": "你是零售运营分析师。周一早上，负责人要在 15 分钟经营预警会上决定：本周先复盘哪两项异常、由谁跟进、下周看什么信号判断行动是否有效。请制作一份让他能自行探索、也能在会议上快速阅读的交互诊断与行动看板。它不是“展示数据”，而是要把“异常 → 归因线索 → 行动优先级”讲清楚。",
        "data_hint": "建议使用 `uci_online_retail_200k.csv`（适合时间、客户、商品/国家切片）或 Olist 多表数据（适合订单、品类、州/城市、履约切片）。你可以使用上一模块清洗好的分析表，但必须声明数据范围、每行粒度、KPI 公式和异常比较基准。没有漏斗阶段时不得虚构漏斗；请从课程图形中选择与现有字段匹配的证据路线。",
        "requirements": ["写出会议决策、读者、时间范围、2–4 个 KPI 的公式/粒度和预警基准。", "使用时间探索图和类别/区域比较图发现并缩小异常范围，Hover 提供追问所需的上下文。", "选择分布、热力或层级图中的合适方法定位问题切片，不为覆盖图形而作图。", "从漏斗、瀑布、时间线、地图中选择一至两种与数据相符的行动证据图。", "把至少 4 个必要视图按“异常 → 定位 → 行动”组织，并给出 2–3 项可复核建议。", "导出可离线 HTML，并完成一次 30 秒默认视图试读。"],
        "deliverables": ["带问题、口径、阶段性解释和关键代码注释的可复现 Notebook。", "一个可离线打开的 `retail_weekly_alert.html`（至少 4 个视图）。", "一页会议简报：两项优先异常、建议负责人/行动、下周复核信号，以及数据局限。", "一份“使用说明”：默认先看什么、如何通过 Hover/图例/范围滑块继续追问。"],
        "checks": ["打开默认视图后，读者在 30 秒内能指出本次预警对象、时间范围和首要异常。", "每张图均能回答一个明确问题；没有为凑数量而添加的图表。", "KPI、时间范围和颜色语义在不同视图间一致，或已说明不一致原因。", "行动建议可回链到具体图表/指标，同时写明不确定性或要补充的数据。", "HTML 脱离 Notebook 后能打开，且初始视图、Hover、图例和范围探索正常。"],
    },
    {
        "filename": "module-capstone-projects.ipynb", "module": "projects", "title": "跨模块业务决策项目", "minutes": 210,
        "tags": ["综合项目", "方法迁移", "证据链", "决策备忘录"],
        "chapters": "第 82–85 章已经演示客户价值、履约诊断、需求规划和营销资源分配四类决策。你应复用其中的“问题定义 → 数据合同 → 关键证据 → 行动建议”方法，而不是复制课堂结论。",
        "scenario": "你要从客户、履约、运营资源或营销四条方向中选择一个新的具体决策，提交项目提案、可复核分析和管理层备忘录。项目价值不取决于图表或代码数量，而取决于证据是否足以支持一个有限决定。",
        "data_hint": "可复用前面模块的数据，也可使用公开数据。数据来源、授权情况与时间范围必须在 Notebook 中注明。",
        "requirements": ["定义决策者、决策问题、成功标准和非目标。", "建立数据合同并记录质量检查、清洗选择和数据限制。", "保留 3–5 项最关键证据，并完成至少一次替代口径或敏感性检查。", "提出按优先级排列的建议，注明实施条件、风险和复核信号。", "让别人能够从原始数据复现主要结论。"],
        "deliverables": ["项目提案与完整端到端 Notebook。", "可分享的核心图表、指标表或报告文件。", "不超过 300 字的决策备忘录和证据索引。"],
        "checks": ["项目范围能够在现有数据和时间内完成。", "每个建议都有清晰的数据证据。", "至少检查过一个反例、阈值或替代口径。", "假设、缺失信息和局限已单独写明。", "别人能从原始数据复现主要结论。"],
    },
    {
        "filename": "module-capstone-machine-learning.ipynb", "module": "machine-learning", "title": "模型上线评审会", "minutes": 240,
        "tags": ["机器学习", "上线评审", "业务阈值", "模型卡"],
        "chapters": "第 86–119 章留下三组评审资产：预测时点与 Pipeline、模型比较与业务阈值、错误分析与模型卡；四个课程项目则提供了迁移这些方法的真实场景。",
        "scenario": "你将参加一次模型上线评审会。任务不是争夺最高分数，而是判断预测方案是否可信、在哪些条件下可以试点、何时必须暂缓。最终结论可以是“上线”“有限试点”或“暂缓”，但必须有验证证据。",
        "data_hint": "可使用在线零售、Olist、共享单车或 Bank Marketing 数据，也可选用同类公开数据。必须定义预测时点、标签和部署时实际可获得的特征。",
        "requirements": ["定义预测时点、标签、真实使用场景，并完成泄漏审计。", "建立独立数据切分、基线 Pipeline 和至少一个候选方案。", "使用与业务目标匹配的指标和多个阈值比较错误成本与行动量。", "检查错误样本、关键群体或时间段中的失败模式。", "保存完整 Pipeline，撰写模型卡并给出上线/试点/暂缓建议。"],
        "deliverables": ["包含预测合同、切分、训练、评估和错误审计的 Notebook。", "模型对比表、关键曲线/混淆矩阵和阈值决策表。", "保存的完整 Pipeline、批量预测示例、模型卡与上线评审结论。"],
        "checks": ["测试集未参与模型或阈值选择。", "预处理只在训练数据上拟合。", "基线和候选模型使用相同数据与指标比较。", "阈值选择能够对应业务错误成本和行动量。", "模型卡说明适用范围、监控、风险和禁用场景。"],
    },
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    books = [prompt_capstone(**spec) for spec in PROMPT_CAPSTONES]
    for book in books:
        path = OUT / {
            "capstone-python": "module-capstone-python.ipynb",
            "capstone-numpy": "module-capstone-numpy.ipynb",
            "capstone-pandas": "module-capstone-pandas.ipynb",
            "capstone-matplotlib": "module-capstone-matplotlib.ipynb",
            "capstone-seaborn": "module-capstone-seaborn.ipynb",
            "capstone-plotly": "module-capstone-plotly.ipynb",
            "capstone-projects": "module-capstone-projects.ipynb",
            "capstone-machine-learning": "module-capstone-machine-learning.ipynb",
        }[book["metadata"]["course_id"]]
        path.write_text(json.dumps(book, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("written", path.name, "cells=", len(book["cells"]))


if __name__ == "__main__":
    main()
