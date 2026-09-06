#!/usr/bin/env python3
"""Add a small, guided entry checkpoint to each module-intro notebook.

Module introductions should not become full lessons, but students still need a
short action that proves they can move from the previous module into the new
tool.  Cells are tagged and marked so this transformation is idempotent.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "public" / "course" / "catalog.json"
TAG = "module-intro-checkpoint"
MARKER_PREFIX = "<!-- module-intro-checkpoint:"


CHECKPOINTS = {
    "intro-numpy": {
        "title": "把门店库存列表变成风险筛选",
        "context": "区域运营刚发来三家门店的现有库存与安全库存。请先把列表变成数组，再找出库存缺口为负的门店。",
        "requirements": [
            "用 `np.array` 创建库存数组与安全库存数组。",
            "计算 `stock_gap = stock - safe_stock`。",
            "用布尔筛选得到 `risk_stores`，不要手工写门店答案。",
        ],
        "hints": "先得到 `stock_gap < 0` 的布尔掩码，再用它同时筛选门店名和缺口。",
        "exercise": '''import numpy as np

store_names = np.array(["东城店", "西城店", "南城店"])
stock = np.array([18, 12, 25])
safe_stock = np.array([15, 15, 20])

# TODO 1：计算每家门店的库存缺口
stock_gap = ...

# TODO 2：用布尔掩码筛选风险门店
risk_stores = ...

print("库存缺口：", stock_gap)
print("风险门店：", risk_stores)
''',
        "solution": '''import numpy as np

store_names = np.array(["东城店", "西城店", "南城店"])
stock = np.array([18, 12, 25])
safe_stock = np.array([15, 15, 20])

stock_gap = stock - safe_stock
risk_mask = stock_gap < 0
risk_stores = store_names[risk_mask]

print("库存缺口：", stock_gap)
print("风险门店：", risk_stores)
''',
        "acceptance": "输出三个库存缺口，并且风险门店只包含“西城店”。",
    },
    "intro-pandas": {
        "title": "把订单记录汇总成地区经营表",
        "context": "运营同事给了四条订单记录，希望马上看到各地区销售额。请把记录组织成 DataFrame，再按地区汇总。",
        "requirements": [
            "用给定字典创建 `orders`。",
            "按 `region` 分组并汇总 `amount`。",
            "把结果按销售额降序保存为 `regional_sales`。",
        ],
        "hints": "可以连用 `groupby(...)[...].sum()` 与 `sort_values(ascending=False)`。",
        "exercise": '''import pandas as pd

raw_orders = {
    "order_id": ["A01", "A02", "A03", "A04"],
    "region": ["华东", "华南", "华东", "华北"],
    "amount": [120, 80, 150, 90],
}

# TODO 1：创建 DataFrame
orders = ...

# TODO 2：按地区汇总并降序排列
regional_sales = ...

print(regional_sales)
''',
        "solution": '''import pandas as pd

raw_orders = {
    "order_id": ["A01", "A02", "A03", "A04"],
    "region": ["华东", "华南", "华东", "华北"],
    "amount": [120, 80, 150, 90],
}

orders = pd.DataFrame(raw_orders)
regional_sales = (
    orders.groupby("region")["amount"]
    .sum()
    .sort_values(ascending=False)
)

print(regional_sales)
''',
        "acceptance": "华东销售额为 270，并排在汇总结果第一位。",
    },
    "intro-matplotlib": {
        "title": "把一周销售数字变成可读趋势",
        "context": "周会前只有五天销售数字。请画出一张能直接看出趋势的折线图，并补齐最基本的图表语义。",
        "requirements": [
            "使用 `ax.plot` 绘制折线并显示数据点。",
            "添加标题、横轴名称和纵轴名称。",
            "开启半透明网格，最后调用 `plt.show()`。",
        ],
        "hints": "先用 `fig, ax = plt.subplots()` 获得绘图区；数据点可用 `marker='o'`。",
        "exercise": '''import matplotlib.pyplot as plt

days = ["周一", "周二", "周三", "周四", "周五"]
sales = [120, 138, 132, 155, 168]

fig, ax = plt.subplots(figsize=(7, 4))

# TODO：绘制折线，并补充标题、坐标轴名称与网格
...

plt.show()
''',
        "solution": '''import matplotlib.pyplot as plt

days = ["周一", "周二", "周三", "周四", "周五"]
sales = [120, 138, 132, 155, 168]

fig, ax = plt.subplots(figsize=(7, 4))
ax.plot(days, sales, marker="o", linewidth=2)
ax.set_title("本周销售趋势")
ax.set_xlabel("日期")
ax.set_ylabel("销售额")
ax.grid(alpha=0.25)

plt.show()
''',
        "acceptance": "图中有五个数据点，标题和两个坐标轴名称完整。",
    },
    "intro-seaborn": {
        "title": "先固定统计问题，再比较两组分布",
        "context": "你要比较新老客户的客单价差异。请保留每一条客户记录，用箱线图观察中心、离散与异常点。",
        "requirements": [
            "创建包含 `customer_type` 与 `amount` 的 DataFrame。",
            "以客户类型为 x、金额为 y 绘制箱线图。",
            "写出一句结果解读，不能只说“图画出来了”。",
        ],
        "hints": "Seaborn 偏好一行一个观测的长表；使用 `sns.boxplot(data=df, x=..., y=...)`。",
        "exercise": '''import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

customer_type = ["新客"] * 5 + ["老客"] * 5
amount = [68, 75, 82, 90, 110, 88, 105, 120, 135, 160]
customers = pd.DataFrame({"customer_type": customer_type, "amount": amount})

# TODO 1：绘制两类客户的金额箱线图
...

# TODO 2：根据中位数与离散程度写一句解读
finding = "..."
print(finding)
plt.show()
''',
        "solution": '''import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

customer_type = ["新客"] * 5 + ["老客"] * 5
amount = [68, 75, 82, 90, 110, 88, 105, 120, 135, 160]
customers = pd.DataFrame({"customer_type": customer_type, "amount": amount})

sns.boxplot(data=customers, x="customer_type", y="amount")
plt.title("新老客户客单价分布")
finding = "样例中老客的客单价中位数更高，分布也更分散；仍需更多样本验证。"
print(finding)
plt.show()
''',
        "acceptance": "图中有新客、老客两个箱体，解读同时提到中心或离散，并保留样本限制。",
    },
    "intro-plotly": {
        "title": "让经营趋势支持悬停追问",
        "context": "经营会上不仅要看销售趋势，还要在悬停时核对目标值。请把两列指标放进同一份交互图信息中。",
        "requirements": [
            "用 `px.line` 绘制日期与销售额趋势。",
            "显示数据点，并把 `target` 加入 Hover。",
            "为图表设置能说明业务问题的标题。",
        ],
        "hints": "使用 `markers=True`，并把额外字段写入 `hover_data=[...]`。",
        "exercise": '''import pandas as pd
import plotly.express as px

weekly = pd.DataFrame({
    "date": pd.date_range("2026-08-03", periods=5, freq="D"),
    "sales": [120, 138, 132, 155, 168],
    "target": [130, 130, 140, 150, 160],
})

# TODO：创建带数据点、目标值 Hover 和业务标题的交互折线图
fig = ...
fig.show()
''',
        "solution": '''import pandas as pd
import plotly.express as px

weekly = pd.DataFrame({
    "date": pd.date_range("2026-08-03", periods=5, freq="D"),
    "sales": [120, 138, 132, 155, 168],
    "target": [130, 130, 140, 150, 160],
})

fig = px.line(
    weekly,
    x="date",
    y="sales",
    markers=True,
    hover_data=["target"],
    title="本周销售与目标核对",
)
fig.show()
''',
        "acceptance": "悬停任一点时能同时看到日期、销售额和目标值。",
    },
    "intro-machine-learning": {
        "title": "先建立不泄漏的基线评估",
        "context": "在尝试复杂模型前，先切分数据并建立一个最简单的分类基线，确认后续模型究竟有没有带来真实改进。",
        "requirements": [
            "按 75% / 25% 切分鸢尾花数据，并使用 `stratify=y`。",
            "只在训练集上拟合 `DummyClassifier`。",
            "输出测试集准确率，作为后续模型比较基线。",
        ],
        "hints": "固定 `random_state=42`；先切分，再调用 `fit(X_train, y_train)`。",
        "exercise": '''from sklearn.datasets import load_iris
from sklearn.dummy import DummyClassifier
from sklearn.model_selection import train_test_split

X, y = load_iris(return_X_y=True)

# TODO 1：完成分层切分
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=...,
    random_state=...,
    stratify=...,
)

# TODO 2：拟合多数类基线并输出测试准确率
baseline = DummyClassifier(strategy="most_frequent")
...
baseline_accuracy = ...
print("baseline accuracy:", baseline_accuracy)
''',
        "solution": '''from sklearn.datasets import load_iris
from sklearn.dummy import DummyClassifier
from sklearn.model_selection import train_test_split

X, y = load_iris(return_X_y=True)

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.25,
    random_state=42,
    stratify=y,
)

baseline = DummyClassifier(strategy="most_frequent")
baseline.fit(X_train, y_train)
baseline_accuracy = baseline.score(X_test, y_test)
print("baseline accuracy:", baseline_accuracy)
''',
        "acceptance": "训练与测试样本分开，基线只拟合训练集，并成功输出 0 到 1 之间的准确率。",
    },
}


def source_text(cell: dict) -> str:
    source = cell.get("source", "")
    return "".join(source) if isinstance(source, list) else str(source or "")


def source_lines(text: str) -> list[str]:
    return [line + "\n" for line in text.rstrip().splitlines()]


def markdown_cell(cell_id: str, source: str) -> dict:
    return {
        "cell_type": "markdown",
        "id": cell_id,
        "metadata": {"tags": [TAG]},
        "source": source_lines(source),
    }


def code_cell(cell_id: str, source: str, tags: list[str]) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "id": cell_id,
        "metadata": {"tags": [TAG, *tags]},
        "outputs": [],
        "source": source_lines(source),
    }


def cells_match(current: list[dict], desired: list[dict]) -> bool:
    if len(current) != len(desired):
        return False
    for actual, expected in zip(current, desired):
        if actual.get("cell_type") != expected.get("cell_type"):
            return False
        if source_text(actual).rstrip() != source_text(expected).rstrip():
            return False
        actual_tags = set((actual.get("metadata") or {}).get("tags", []))
        expected_tags = set((expected.get("metadata") or {}).get("tags", []))
        if not expected_tags.issubset(actual_tags):
            return False
    return True


def checkpoint_cells(lesson_id: str, spec: dict, number: str) -> list[dict]:
    requirements = "\n".join(f"{index}. {item}" for index, item in enumerate(spec["requirements"], start=1))
    note = f"""{MARKER_PREFIX}{lesson_id} -->
## {number}.4 入门验收｜{spec['title']}

**应用背景：** {spec['context']}

**你需要完成：**

{requirements}

**操作提示：** {spec['hints']}

**验收标准：** {spec['acceptance']}
"""
    short_id = lesson_id.replace("intro-", "")
    return [
        markdown_cell(f"intro-check-{short_id}", note),
        code_cell(f"intro-task-{short_id}", spec["exercise"], ["exercise", "check"]),
        code_cell(f"intro-answer-{short_id}", spec["solution"], ["solution", "check"]),
    ]


def update_notebook(path: Path, lesson_id: str, spec: dict, check_only: bool) -> bool:
    notebook = json.loads(path.read_text(encoding="utf-8"))
    cells = notebook.get("cells", [])
    summary_index = next(
        (
            index
            for index, cell in enumerate(cells)
            if cell.get("cell_type") == "markdown"
            and re.search(r"^##\s+(\d+)\.[45]\s+小结\s*$", source_text(cell), re.MULTILINE)
        ),
        None,
    )
    if summary_index is None:
        raise ValueError(f"module intro summary heading not found: {path}")

    summary_match = re.search(r"^##\s+(\d+)\.[45]\s+小结\s*$", source_text(cells[summary_index]), re.MULTILINE)
    number = summary_match.group(1)
    desired = checkpoint_cells(lesson_id, spec, number)
    marker = f"{MARKER_PREFIX}{lesson_id} -->"
    marker_index = next((i for i, cell in enumerate(cells) if marker in source_text(cell)), None)

    existing_matches = False
    if marker_index is not None and marker_index + 2 < len(cells):
        current = cells[marker_index : marker_index + 3]
        existing_matches = cells_match(current, desired)
    summary_source = source_text(cells[summary_index])
    desired_summary = re.sub(
        rf"^##\s+{re.escape(number)}\.[45]\s+小结\s*$",
        f"## {number}.5 小结",
        summary_source,
        flags=re.MULTILINE,
    )
    changed = not existing_matches or summary_source != desired_summary
    if check_only or not changed:
        return changed

    filtered = [
        cell
        for cell in cells
        if TAG not in set((cell.get("metadata") or {}).get("tags", []))
        and marker not in source_text(cell)
    ]
    summary_index = next(
        index
        for index, cell in enumerate(filtered)
        if cell.get("cell_type") == "markdown"
        and re.search(rf"^##\s+{re.escape(number)}\.[45]\s+小结\s*$", source_text(cell), re.MULTILINE)
    )
    filtered[summary_index]["source"] = source_lines(desired_summary)
    filtered[summary_index:summary_index] = desired
    notebook["cells"] = filtered
    path.write_text(json.dumps(notebook, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    chapters = {item["id"]: item for item in catalog.get("chapters", [])}
    changed = []
    for lesson_id, spec in CHECKPOINTS.items():
        item = chapters.get(lesson_id)
        if not item:
            raise SystemExit(f"module intro missing from catalog: {lesson_id}")
        path = ROOT / "public" / item["path"].lstrip("/")
        if update_notebook(path, lesson_id, spec, args.check):
            changed.append(lesson_id)

    print(f"module intro checkpoints configured: {len(CHECKPOINTS)}")
    print(f"{'stale' if args.check else 'changed'}: {len(changed)}")
    if args.check and changed:
        raise SystemExit("missing or stale module intro checkpoints: " + ", ".join(changed))


if __name__ == "__main__":
    main()
