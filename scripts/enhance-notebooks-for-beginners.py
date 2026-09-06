"""为课程 Notebook 增加适合初学者的循序渐进说明和额外例子。"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = "2026-08-05-beginner-v1"
TEACHING_CONTENT_VERSION = "2026-08-05-teaching-v2"
ERROR_RECOVERY_VERSION = "2026-08-05-error-recovery-v1"
MODULE_STRUCTURE_VERSION = "2026-08-05-module-structure-v1"


def source_lines(text: str) -> list[str]:
    return [line + "\n" for line in text.strip("\n").splitlines()]


def new_id(path: Path, label: str) -> str:
    digest = hashlib.sha1(f"{path.as_posix()}::{label}".encode("utf-8")).hexdigest()[:16]
    return f"beginner-{digest}"


def md(path: Path, label: str, text: str) -> dict:
    return {
        "id": new_id(path, label),
        "cell_type": "markdown",
        "metadata": {},
        "source": source_lines(text),
    }


def code(path: Path, label: str, text: str, tags: list[str] | None = None) -> dict:
    return {
        "id": new_id(path, label),
        "cell_type": "code",
        "execution_count": None,
        "metadata": {"tags": tags} if tags else {},
        "outputs": [],
        "source": source_lines(text),
    }


def title_of(nb: dict) -> str:
    for cell in nb.get("cells", []):
        if cell.get("cell_type") != "markdown":
            continue
        text = "".join(cell.get("source", [])).strip()
        if text.startswith("# "):
            return text.splitlines()[0][2:].strip()
    return "本章"


def chapter_number(name: str) -> int | None:
    match = re.search(r"第(\d+)章", name)
    return int(match.group(1)) if match else None


def content_kind(path: Path, nb: dict) -> str:
    metadata = nb.get("metadata", {})
    course = metadata.get("course", {}) if isinstance(metadata.get("course"), dict) else {}
    module = str(metadata.get("chapter_module") or course.get("module") or "").lower()
    title = title_of(nb)
    number = course.get("chapter") or metadata.get("chapter") or chapter_number(path.name)

    if module in {"projects", "project", "综合项目"} or "综合项目" in path.name or "项目" in title:
        return "project"
    if module in {"machine-learning", "machine_learning", "ml"}:
        return "project" if number and int(number) >= 105 else "ml"
    if "numpy" in module or "numpy" in path.name.lower():
        return "numpy"
    if "pandas" in module or "pandas" in path.name.lower():
        return "pandas"
    if "seaborn" in module or "seaborn" in path.name.lower():
        return "seaborn"
    if "plotly" in module or "plotly" in path.name.lower():
        return "plotly"
    if "matplotlib" in module or "matplotlib" in path.name.lower():
        return "matplotlib"
    return "python"


def teaching_experiment_cells(path: Path, nb: dict) -> list[dict]:
    kind = content_kind(path, nb)
    experiments = {
        "python": (
            "边界条件",
            """orders = [
    {"order_id": "A01", "amount": 280},
    {"order_id": "A02", "amount": 300},
    {"order_id": "A03", "amount": 520},
]
threshold = 300
for order in orders:
    label = "达到门槛" if order["amount"] >= threshold else "未达到门槛"
    print(order["order_id"], order["amount"], label)""",
            "这里的重点不是记住 `if`，而是观察 `>=` 如何处理刚好等于 300 的记录。边界条件必须和业务规则保持一致。",
            """threshold = 500
for order in orders:
    label = "重点关注" if order["amount"] >= threshold else "普通订单"
    print(order["order_id"], "->", label)
print("重点订单数：", sum(order["amount"] >= threshold for order in orders))""",
            "只把门槛从 300 改成 500，再比较标签和数量变化。这个实验训练的是“改一个输入，解释一个输出”。",
        ),
        "numpy": (
            "axis与布尔筛选",
            """import numpy as np

matrix = np.arange(1, 13).reshape(3, 4)
print("原数组：\\n", matrix)
print("每行合计：", matrix.sum(axis=1))
print("每列合计：", matrix.sum(axis=0))""",
            "`axis=1` 保留行，沿列方向计算；`axis=0` 保留列，沿行方向计算。先看 shape，再解释结果长度。",
            """even = matrix[matrix % 2 == 0]
print("偶数：", even)
print("偶数数量：", even.size)
print("偶数平均值：", even.mean())""",
            "第二个实验不改原数组，而是用布尔条件筛选新数组。请思考：如果条件改成 `matrix > 8`，输出会怎样变化？",
        ),
        "pandas": (
            "分组汇总与粒度",
            """import pandas as pd

orders = pd.DataFrame({
    "region": ["华东", "华东", "华南", "华南"],
    "channel": ["线上", "线下", "线上", "线下"],
    "sales": [120, 80, 150, 100],
})
summary = orders.groupby("region", as_index=False)["sales"].sum()
print(summary)
print("汇总表每一行代表一个地区")""",
            "先确认明细表一行代表一笔订单，再确认汇总表一行代表一个地区。`groupby` 的字段决定结果的粒度。",
            """orders["sales_level"] = orders["sales"].map(
    lambda value: "高" if value >= 120 else "普通"
)
print(orders)
print(orders["sales_level"].value_counts())""",
            "第二个实验只增加一个分类列，不改变原始销售额。练习解释：什么时候应该新增列，什么时候应该直接筛选行？",
        ),
        "matplotlib": (
            "图表只改一个编码",
            """import matplotlib.pyplot as plt

months = ["1月", "2月", "3月", "4月"]
sales = [120, 150, 138, 190]
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.plot(months, sales, marker="o")
ax.set_title("月度销售额")
ax.set_ylabel("销售额（万元）")
ax.grid(alpha=0.25)
plt.show()""",
            "标题、坐标轴和单位让读者知道图表回答什么问题。没有这些文字，图形即使画出来也不完整。",
            """fig, ax = plt.subplots(figsize=(7, 3.5))
ax.bar(months, sales, color="#2563EB")
ax.axhline(sum(sales) / len(sales), color="#DC2626", linestyle="--", label="平均值")
ax.set_title("月度销售额与平均值")
ax.set_ylabel("销售额（万元）")
ax.legend()
plt.show()""",
            "第二个实验把折线改成柱状图，并增加平均线。请说明：哪种图更适合看趋势，哪种图更适合比较单月差异？",
        ),
        "seaborn": (
            "分组比较与不确定性",
            """import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

report = pd.DataFrame({
    "region": ["华东", "华南", "华北", "西南"],
    "sales": [320, 250, 280, 190],
})
fig, ax = plt.subplots(figsize=(7, 3.5))
sns.barplot(data=report, x="region", y="sales", ci=None, ax=ax, color="#0F766E")
ax.set_title("地区销售额比较")
ax.set_ylabel("销售额")
plt.show()""",
            "Seaborn 负责把 DataFrame 的字段映射为图形编码；先明确横轴、纵轴和每行数据的粒度，再选择图表。",
            """report = report.sort_values("sales", ascending=False)
fig, ax = plt.subplots(figsize=(7, 3.5))
sns.barplot(data=report, x="sales", y="region", ci=None, ax=ax, color="#F59E0B")
ax.set_title("按销售额排序的地区比较")
ax.set_xlabel("销售额")
ax.set_ylabel("地区")
plt.show()""",
            "第二个实验只改变排序和坐标方向，让读者更容易找到最大值。图表调整必须服务于阅读任务。",
        ),
        "plotly": (
            "交互图与信息层次",
            """import pandas as pd
import plotly.express as px

report = pd.DataFrame({
    "region": ["华东", "华南", "华北", "西南"],
    "sales": [320, 250, 280, 190],
})
fig = px.bar(report, x="region", y="sales", title="地区销售额")
fig.show()""",
            "Plotly 的基本流程是：准备表格、映射字段、设置标题、显示图形。悬停提示只能补充信息，不能替代坐标轴和单位。",
            """fig = px.bar(
    report.sort_values("sales", ascending=False),
    x="region",
    y="sales",
    text="sales",
    title="按销售额排序的地区销售额",
)
fig.update_traces(textposition="outside")
fig.update_layout(yaxis_title="销售额", xaxis_title="地区")
fig.show()""",
            "第二个实验增加数值标签并排序。请检查：标签是否遮挡、标题是否准确、图形是否仍然能在窄屏阅读。",
        ),
        "ml": (
            "模型与基线比较",
            """import numpy as np
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error

X = pd.DataFrame({"visits": [1, 2, 3, 4, 5, 6], "discount": [0, 0, 1, 1, 1, 2]})
y = np.array([12, 15, 19, 23, 27, 31])
baseline = DummyRegressor(strategy="mean").fit(X, y)
model = LinearRegression().fit(X, y)
print("基线预测：", np.round(baseline.predict(X[:2]), 2))
print("模型预测：", np.round(model.predict(X[:2]), 2))
print("基线MAE：", round(mean_absolute_error(y, baseline.predict(X)), 2))
print("模型MAE：", round(mean_absolute_error(y, model.predict(X)), 2))""",
            "复杂模型之前先建立基线。只有在同一数据切分和同一指标下超过基线，模型才值得继续分析。",
            """X_changed = X.copy()
X_changed["visits"] = X_changed["visits"] + 1
changed_prediction = model.predict(X_changed)
print("原始前2个预测：", np.round(model.predict(X[:2]), 2))
print("访问次数+1后的预测：", np.round(changed_prediction[:2], 2))
print("预测变化：", np.round(changed_prediction[:2] - model.predict(X[:2]), 2))""",
            "只把一个特征整体加 1，观察预测变化。这个实验只能说明模型的预测响应，不能直接证明真实世界的因果关系。",
        ),
        "project": (
            "从原始记录到质量报告",
            """import pandas as pd

raw = pd.DataFrame({
    "customer_id": ["C01", "C02", "C02", "C03", "C04"],
    "amount": [120, 80, 80, None, -20],
})
quality = pd.Series({
    "原始行数": len(raw),
    "重复行数": raw.duplicated().sum(),
    "缺失金额": raw["amount"].isna().sum(),
    "非正金额": (raw["amount"] <= 0).sum(),
})
print(quality.to_string())""",
            "项目的第一步不是急着画图或建模，而是量化问题规模。质量报告要能回答：问题有多少、影响哪些字段、下一步如何处理。",
            """clean = raw.drop_duplicates().copy()
clean["amount_valid"] = clean["amount"].where(clean["amount"] > 0)
summary = clean.groupby("customer_id", as_index=False)["amount_valid"].sum(min_count=1)
print("清洗后行数：", len(clean))
print("有效客户数：", summary["amount_valid"].notna().sum())
print(summary)""",
            "第二个实验把质量问题转成可追踪的清洗结果。请同时记录删除、保留和缺失处理规则，不能只报告最后的数字。",
        ),
    }
    title, code_a, note_a, code_b, note_b = experiments.get(kind, experiments["python"])
    return [
        md(path, "teaching-experiment-intro", f"## 教学实验：{title}\n\n这一组实验专门训练“观察一个结果 → 只改一个变量 → 解释变化”。先运行第一个代码单元格，再运行第二个。"),
        code(path, "teaching-experiment-a", code_a, ["experiment"]),
        md(path, "teaching-experiment-a-notes", f"### 第一个结果怎么读\n\n{note_a}\n\n请记录：输入是什么、输出是什么、输出支持了哪一个结论。"),
        code(path, "teaching-experiment-b", code_b, ["experiment"]),
        md(path, "teaching-experiment-b-notes", f"### 第二个结果怎么读\n\n{note_b}\n\n迁移任务：把一个输入值、一个字段或一个图表参数换成自己的例子，再用一句话解释变化。"),
    ]


def enhance_teaching_content(path: Path, nb: dict) -> bool:
    metadata = nb.setdefault("metadata", {})
    if metadata.get("teaching_content_version") == TEACHING_CONTENT_VERSION:
        return False
    nb.setdefault("cells", [])[
        insert_index(nb):insert_index(nb)
    ] = teaching_experiment_cells(path, nb)
    metadata["teaching_content_version"] = TEACHING_CONTENT_VERSION
    return True


def error_recovery_cells(path: Path, nb: dict) -> list[dict]:
    kind = content_kind(path, nb)
    examples = {
        "python": (
            "类型转换失败怎么办",
            """amount_text = "128.5"
try:
    amount = int(amount_text)
except ValueError as error:
    print("第一次转换失败：", type(error).__name__)
    amount = float(amount_text)
print("可以继续使用的金额：", amount)""",
            "先读错误类型，再决定修复方法。这里不是盲目忽略错误，而是明确知道整数转换不适合带小数的文本。",
        ),
        "numpy": (
            "数组形状不匹配怎么办",
            """import numpy as np

matrix = np.arange(6).reshape(2, 3)
try:
    result = matrix + np.array([10, 20])
except ValueError as error:
    print("形状问题：", type(error).__name__)
    result = matrix + np.array([10, 20, 30])
print("修复后的结果：")
print(result)""",
            "先看两个数组的 shape，再判断能否广播。修复不是随意 reshape，而是让数据结构和业务含义一致。",
        ),
        "pandas": (
            "脏数据转换怎么办",
            """import pandas as pd

raw = pd.Series(["12", "unknown", "18", ""])
converted = pd.to_numeric(raw, errors="coerce")
print("转换结果：")
print(converted)
print("无法转换的数量：", converted.isna().sum())
print("后续可以选择删除、填充或回查原始值。")""",
            "errors=\"coerce\" 会把无法转换的值记录为缺失，适合先完成质量盘点；不要在没有统计数量前直接删除。",
        ),
        "matplotlib": (
            "图表能画出但读不懂怎么办",
            """import matplotlib.pyplot as plt

months = ["1月", "2月", "3月"]
sales = [120, 150, 138]
fig, ax = plt.subplots(figsize=(6, 3))
ax.plot(months, sales, marker="o")
ax.set_title("月度销售额")
ax.set_xlabel("月份")
ax.set_ylabel("销售额（万元）")
ax.grid(alpha=0.25)
plt.show()""",
            "图形没有报错不等于结果可用。遇到“看不懂”的图，优先补标题、坐标轴、单位和关键参照线。",
        ),
        "seaborn": (
            "分组字段缺失怎么办",
            """import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

report = pd.DataFrame({"region": ["华东", "华南"], "sales": [120, 150]})
required = {"region", "sales"}
missing = required - set(report.columns)
if missing:
    print("缺少字段：", sorted(missing))
else:
    fig, ax = plt.subplots(figsize=(6, 3))
    sns.barplot(data=report, x="region", y="sales", ci=None, ax=ax)
    ax.set_title("地区销售额")
    plt.show()""",
            "绘图前先检查字段是否存在。把字段检查放在画图之前，错误会更接近真正原因，也更容易恢复。",
        ),
        "plotly": (
            "空数据还能不能画图",
            """import pandas as pd
import plotly.express as px

report = pd.DataFrame({"region": ["华东", "华南"], "sales": [120, 150]})
if report.empty:
    print("没有可绘制的数据，请先检查筛选条件。")
else:
    fig = px.bar(report, x="region", y="sales", title="地区销售额")
    fig.update_layout(yaxis_title="销售额", xaxis_title="地区")
    fig.show()""",
            "筛选后先判断是否为空，再调用绘图函数。空表不是绘图库的问题，而是上游筛选口径需要检查。",
        ),
        "ml": (
            "模型特征泄漏怎么办",
            """import pandas as pd

data = pd.DataFrame({
    "visits": [2, 4, 6],
    "duration_after_call": [30, 80, 120],
    "target": [0, 1, 1],
})
forbidden = {"target", "duration_after_call"}
features = [column for column in data.columns if column not in forbidden]
print("禁止使用：", sorted(forbidden))
print("安全特征：", features)
print("原因：特征必须在预测时点已经可获得。")""",
            "如果一个字段在结果发生之后才产生，它即使与目标高度相关，也不能作为预测特征。先定义预测时点，再列可用字段。",
        ),
        "project": (
            "重复主键和缺失值怎么办",
            """import pandas as pd

raw = pd.DataFrame({
    "customer_id": ["C01", "C02", "C02", "C03"],
    "amount": [120, 80, None, -20],
})
duplicate_keys = raw["customer_id"].duplicated(keep=False)
invalid_amount = raw["amount"].isna() | raw["amount"].le(0)
print("重复主键行：")
print(raw[duplicate_keys])
print("金额异常行：")
print(raw[invalid_amount])
print("先标记问题，再决定保留、合并或回查。")""",
            "项目中不能把异常行静默删除。先输出问题记录和数量，再把处理规则写进项目结论。",
        ),
    }
    title, code_text, note = examples.get(kind, examples["python"])
    return [
        md(path, "error-recovery-intro", f"## 错误恢复：{title}\n\n真实数据和真实代码都会出问题。本节先观察问题，再用一个明确的检查或修复步骤恢复运行。"),
        code(path, "error-recovery", code_text, ["error-recovery"]),
        md(path, "error-recovery-notes", f"### 错误恢复步骤\n\n1. 先看错误类型、字段或数据形状。\n2. 判断问题发生在输入、处理中间结果还是输出。\n3. 修复后重新检查结果，而不是只让代码不报错。\n\n{note}\n\n迁移任务：把示例中的输入换成一组会触发问题的数据，并记录你的修复规则。"),
    ]


def enhance_error_recovery(path: Path, nb: dict) -> bool:
    metadata = nb.setdefault("metadata", {})
    if metadata.get("teaching_error_recovery_version") == ERROR_RECOVERY_VERSION:
        return False
    nb.setdefault("cells", [])[insert_index(nb):insert_index(nb)] = error_recovery_cells(path, nb)
    metadata["teaching_error_recovery_version"] = ERROR_RECOVERY_VERSION
    return True


def route_cells(path: Path, title: str) -> list[dict]:
    return [
        md(
            path,
            "route",
            f"""## 初学者学习路线

这章建议按照“先观察、再模仿、后修改、最后独立完成”的顺序学习，不必一次记住所有参数。

1. 先阅读任务说明，明确这段代码要回答什么问题。
2. 运行一个最小例子，先观察输入、输出和数据形状，再回看每一行代码。
3. 只修改一个参数或一条数据，重新运行并比较前后结果。
4. 完成“综合练习”，最后再看本章小结，把能迁移到其他数据的问题写下来。

运行时如果看到 NameError，通常是前置单元格还没有运行；如果输出和预期不同，先检查变量是否被后面的单元格重新赋值。""",
        ),
        md(
            path,
            "small-check",
            f"""## 先做一个小检查

进入正式例子前，先用一句话回答：本章的输入是什么，想得到什么结果？

本章主题是“{title}”。请特别留意三件事：输入的类型或形状、处理中间变量的含义、最后输出能否支持一个清楚的结论。""",
        ),
    ]


def module_structure_cells(path: Path, nb: dict) -> list[dict]:
    """为不同模块提供不同的学习主线和练习方式。

    公共骨架只负责导航；这里明确每个模块真正要观察什么、如何练习，
    避免所有 Notebook 都套用同一段泛化说明。
    """
    kind = content_kind(path, nb)
    structures = {
        "python": (
            "Python 的学习主线",
            "概念与语法 → 最小可运行代码 → 修改一个输入 → 处理边界条件 → 封装成函数 → 独立完成一个小任务",
            "先预测输出，再运行代码；然后只改一个变量，最后把示例改写成自己的问题。重点检查变量类型、条件分支和中间结果。",
            "基础：补全或改写一小段代码；提高：组合两个语法知识点；挑战：处理空输入、错误类型或边界值。",
        ),
        "numpy": (
            "NumPy 的学习主线",
            "查看 shape 与 ndim → 用索引和切片定位数据 → 用向量化运算处理整组数据 → 用 axis 聚合 → 用布尔掩码筛选 → 区分视图与副本 → 完成数组任务",
            "每次先输出输入和输出的 shape。对二维数组，先判断是在筛选元素、整行还是整列；使用高级索引时明确每一个坐标对应什么位置。",
            "基础：预测索引和切片的形状；提高：组合切片、筛选和 axis；挑战：解释广播失败原因，并选择符合业务含义的修复方式。",
        ),
        "pandas": (
            "Pandas 的学习主线",
            "写数据字典 → 读取与检查 → 清洗类型和缺失值 → 选择与筛选 → 新增计算列 → 分组聚合 → 合并或透视 → 导出可复用结果",
            "每一步都说明“一行代表什么”。处理前后记录行数、列数和关键字段；汇总前先确认分组粒度，避免得到数字却无法解释。",
            "基础：完成一个字段清洗；提高：从明细表生成汇总表；挑战：处理重复、缺失和类型混乱，并写出清洗规则。",
        ),
        "matplotlib": (
            "Matplotlib 的学习主线",
            "明确要表达的问题 → 准备 x/y 数据 → 画出最小图表 → 补充标题、标签和单位 → 调整颜色、刻度和注释 → 组合子图 → 导出结果",
            "每张图先回答一个问题。先让图表结构正确，再改善可读性；修改参数后说明它改变了什么视觉编码，不能只追求颜色更多。",
            "基础：补齐标题和坐标轴；提高：比较两种图形表达；挑战：改造一张难以阅读或容易误导的图，并解释修改理由。",
        ),
        "seaborn": (
            "Seaborn 的学习主线",
            "提出统计问题 → 整理成长表 → 明确 x、y、hue 和分组 → 绘制统计图 → 比较类别和分布 → 处理排序与不确定性 → 用文字解释结论",
            "先确认每一行是一条观察，再决定图形统计什么。看到均值、箱体或置信区间时，要说明它们代表什么，不能只描述颜色和形状。",
            "基础：完成一张分组图；提高：改变分组或排序并比较结论；挑战：同时保留摘要和原始点，说明样本量对解读的影响。",
        ),
        "plotly": (
            "Plotly 的学习主线",
            "先完成静态视图 → 增加 hover 明细 → 统一标题和单位 → 增加筛选或按钮 → 调整布局与响应式阅读 → 导出交互结果",
            "每个交互功能都要服务于一个分析问题。先检查默认视图是否可读，再增加交互；悬停提示是补充信息，不能替代坐标轴和标题。",
            "基础：完成一个可读交互图；提高：增加明细提示；挑战：设计一个筛选或切换控件，并说明它如何减少认知负担。",
        ),
        "ml": (
            "机器学习的学习主线",
            "定义业务问题 → 区分目标和特征 → 检查数据 → 划分训练集与测试集 → 建立基线 → 预处理和训练 → 评价模型 → 分析错误与泄漏 → 保存模型并预测",
            "先写清楚预测时点和评价指标，再写模型代码。每次比较都使用相同的数据切分和指标，并保留基线结果。",
            "基础：完成一次训练和评价；提高：比较基线与模型；挑战：找出错误样本、排查泄漏，并说明模型适用范围。",
        ),
        "project": (
            "综合项目的学习主线",
            "阅读项目简报 → 建立数据字典 → 生成质量报告 → 探索性分析 → 回答核心问题 → 制作图表或模型 → 写出事实、证据和建议 → 导出并复现成果",
            "项目不是把所有 API 堆在一起。每个结论都要能回到数据和处理步骤；异常记录先标记和统计，再决定删除、修正或保留。",
            "基础：复现一个分析结果；提高：替换一个字段或口径；挑战：独立提交数据、代码、图表、结论和 README，并说明限制。",
        ),
    }
    title, route, practice, levels = structures.get(kind, structures["python"])
    return [
        md(
            path,
            "module-structure-route",
            f"## {title}\n\n{route}\n\n{practice}",
        ),
        md(
            path,
            "module-structure-practice",
            f"## 本模块练习方式\n\n{levels}\n\n完成后请写下：输入是什么、处理做了什么、输出说明了什么、还存在什么限制。",
        ),
    ]


def module_structure_index(nb: dict) -> int:
    """把模块专属导航放在通用小检查之后，避免打断原始概念示例。"""
    cells = nb.get("cells", [])
    for index, cell in enumerate(cells):
        if cell.get("cell_type") != "markdown":
            continue
        text = "".join(cell.get("source", [])).strip()
        if text.startswith("## 先做一个小检查"):
            return index + 1
    return min(2, len(cells))


def repair_markdown_source(source: str) -> str:
    """修复自动生成速查内容中的常见 Markdown 代码提示错误。"""
    fixed = source
    fixed = fixed.replace(
        "布尔掩码形状必须与被筛选维度匹配。",
        "布尔掩码通常需要与被筛选的维度形状一致；同形状筛选二维数组后，结果通常会按条件返回一维数组。",
    )
    fixed = fixed.replace("`sales[[2, 0]`", "`sales[[2, 0]]`")
    fixed = fixed.replace("`sales[[0, 2]`", "`sales[[0, 2], [1, 3]]`")
    return fixed


def repair_markdown_cells(nb: dict) -> bool:
    changed = False
    for cell in nb.get("cells", []):
        if cell.get("cell_type") != "markdown":
            continue
        source = "".join(cell.get("source", []))
        fixed = repair_markdown_source(source)
        if fixed != source:
            cell["source"] = source_lines(fixed)
            changed = True
    return changed


def enhance_module_structure(path: Path, nb: dict) -> bool:
    metadata = nb.setdefault("metadata", {})
    if metadata.get("module_structure_version") == MODULE_STRUCTURE_VERSION:
        return False
    nb.setdefault("cells", [])[module_structure_index(nb):module_structure_index(nb)] = module_structure_cells(path, nb)
    metadata["module_structure_version"] = MODULE_STRUCTURE_VERSION
    return True


def examples_for(name: str) -> tuple[str, str, str, str, str, str] | None:
    number = chapter_number(name)

    if "Python基础" in name:
        examples = {
            1: (
                "示例 4：把一个任务拆成三个可观察步骤",
                """steps = ["准备输入", "完成计算", "解释结果"]
for number, step in enumerate(steps, start=1):
    print(f"第 {number} 步：{step}")
print("步骤数量：", len(steps))""",
                "把重复动作放进列表后，可以用循环逐项查看；enumerate 同时提供序号和内容。",
                "示例 5：从学习记录得到简单指标",
                """study_minutes = {"周一": 30, "周二": 45, "周三": 20, "周四": 55}
total_minutes = sum(study_minutes.values())
best_day = max(study_minutes, key=study_minutes.get)
print(f"总学习时间：{total_minutes} 分钟")
print(f"学习时间最长：{best_day}（{study_minutes[best_day]} 分钟）")""",
                "字典保存日期到分钟数的对应关系；先求总和，再找出最大值对应的键。",
            ),
            2: (
                "示例 4：把金额计算拆成中间变量",
                """unit_price = 199.0
quantity = 2
discount_rate = 0.90
subtotal = unit_price * quantity
discount = subtotal * (1 - discount_rate)
payable = subtotal - discount
print(f"小计：{subtotal:.2f} 元")
print(f"优惠：{discount:.2f} 元")
print(f"应付：{payable:.2f} 元")""",
                "先算小计，再算优惠，最后得到应付金额。每个变量只承担一个含义，便于检查公式。",
                "示例 5：单位转换与类型检查",
                """temperature_c = 26
temperature_f = temperature_c * 9 / 5 + 32
print(f"{temperature_c}℃ = {temperature_f:.1f}℉")
print("摄氏温度类型：", type(temperature_c).__name__)
print("华氏温度类型：", type(temperature_f).__name__)""",
                "除法会产生浮点数；用 type(...).__name__ 可以快速确认变量的运行时类型。",
            ),
            3: (
                "示例 4：清洗一条文本记录",
                """raw = "  Alice | alice@example.com |  北京  "
name, email, city = [part.strip() for part in raw.split("|")]
clean_email = email.lower()
print("姓名：", name)
print("邮箱：", clean_email)
print("城市：", city)""",
                "先用 split 拆分，再对每一段调用 strip 去掉两端空格；最后只把邮箱转换成小写。",
                "示例 5：去重后重新组合标签",
                """raw_tags = "Python, pandas, Python, 可视化, pandas"
tags = [tag.strip().lower() for tag in raw_tags.split(",")]
unique_tags = sorted(set(tags))
print("清洗后的标签：", tags)
print("去重后的标签：", unique_tags)
print("展示文本：", " / ".join(unique_tags))""",
                "列表保留原顺序，集合负责去重，join 把多个字符串组合成可读文本。",
            ),
            4: (
                "示例 4：管理一个购物车列表",
                """cart = [("键盘", 299), ("鼠标", 129)]
cart.append(("耳机", 499))
prices = [price for _, price in cart]
print("购物车：", cart)
print("商品数量：", len(cart))
print("总金额：", sum(prices))""",
                "列表适合保存有顺序的一组记录；列表推导式从每条记录中提取价格，再交给 sum 计算总额。",
                "示例 5：使用元组解包读取记录",
                """product, price = ("机械键盘", 599.0)
name, category, stock = ("鼠标", "外设", 18)
print(f"{product}：{price:.1f} 元")
print(f"{name} 属于 {category}，库存 {stock} 件")""",
                "元组解包要求左右变量数量一致；它适合表达不希望被随意修改的一组固定字段。",
            ),
            5: (
                "示例 4：用字典筛选库存预警",
                """inventory = {"键盘": 12, "鼠标": 6, "耳机": 3, "显示器": 18}
low_stock = {name: count for name, count in inventory.items() if count < 10}
print("库存预警：", low_stock)
for name, count in low_stock.items():
    print(f"{name} 只剩 {count} 件")""",
                "字典推导式保留满足条件的键值对；遍历字典时用 items 同时取得键和值。",
                "示例 5：用集合找共同标签",
                """python_topics = {"变量", "列表", "函数", "Pandas"}
data_topics = {"Pandas", "NumPy", "函数", "可视化"}
print("共同主题：", python_topics & data_topics)
print("所有主题：", python_topics | data_topics)
print("只在数据分析中出现：", data_topics - python_topics)""",
                "集合的交集、并集和差集分别回答“共同有哪些”“合起来有哪些”“只属于哪一边”。",
            ),
            6: (
                "示例 4：把分数转换成等级",
                """score = 87
if score >= 90:
    level = "优秀"
elif score >= 60:
    level = "及格"
else:
    level = "需要补强"
print(f"分数 {score} 分，等级：{level}")""",
                "条件从上到下判断，第一次满足的分支会被执行；因此边界条件的顺序很重要。",
                "示例 5：判断订单是否需要人工复核",
                """orders = [120, 860, 5200, 75]
for amount in orders:
    if amount >= 5000:
        label = "高金额，人工复核"
    elif amount >= 100:
        label = "正常订单"
    else:
        label = "低金额订单"
    print(f"{amount:>4} 元 -> {label}")""",
                "先处理更严格的高金额条件，再处理一般条件；每个输入都能得到一个明确标签。",
            ),
            7: (
                "示例 4：循环处理有效销售额",
                """sales = [120, -20, 150, 0, 180]
valid_sales = []
for amount in sales:
    if amount <= 0:
        continue
    valid_sales.append(amount)
print("有效销售额：", valid_sales)
print("有效合计：", sum(valid_sales))
print("有效记录数：", len(valid_sales))""",
                "continue 跳过当前无效记录；把有效值保存下来后，既能求和，也能继续做其他统计。",
                "示例 5：找到第一个达到目标的结果",
                """scores = [62, 71, 88, 94, 79]
target = 90
for position, score in enumerate(scores, start=1):
    if score >= target:
        print(f"第一个达到 {target} 分的是第 {position} 个：{score} 分")
        break
else:
    print("没有找到达到目标的分数")""",
                "break 结束循环；for ... else 中的 else 只有在循环没有被 break 打断时执行。",
            ),
            8: (
                "示例 4：封装增长率函数",
                """def growth_rate(current, previous):
    if previous == 0:
        return None
    return (current - previous) / previous

for current, previous in [(120, 100), (90, 100), (50, 0)]:
    rate = growth_rate(current, previous)
    print(current, previous, "->", None if rate is None else f"{rate:.1%}")""",
                "函数把输入、处理和返回值固定下来；遇到分母为0时返回 None，更容易解释。",
                "示例 5：用 lambda 作为排序规则",
                """products = [("键盘", 299), ("鼠标", 129), ("耳机", 499)]
sorted_products = sorted(products, key=lambda item: item[1], reverse=True)
for name, price in sorted_products:
    print(f"{name}: {price} 元")""",
                "lambda 适合很短的一次性规则；复杂逻辑仍然建议写成有名字的 def 函数。",
            ),
            9: (
                "示例 4：写入、读取并清洗文本文件",
                """from pathlib import Path

demo_path = Path("beginner_notes.txt")
demo_path.write_text("第一行\\n\\n第二行\\n", encoding="utf-8")
lines_read = [
    line.strip()
    for line in demo_path.read_text(encoding="utf-8").splitlines()
    if line.strip()
]
print("非空行：", lines_read)
print("文件是否存在：", demo_path.exists())
demo_path.unlink(missing_ok=True)""",
                "使用 Path 的读写方法可以明确编码；示例结束后删除临时文件，避免把练习产物留在目录中。",
                "示例 5：用 Path 组合跨平台路径",
                """from pathlib import Path

data_dir = Path("data")
report_path = data_dir / "monthly" / "sales.csv"
print("目录对象：", data_dir)
print("报告路径：", report_path)
print("文件名：", report_path.name)
print("后缀：", report_path.suffix)""",
                "用 / 运算符组合路径；不要手写只适用于某一种操作系统的斜杠字符串。",
            ),
            10: (
                "示例 4：安全计算平均值",
                """def safe_average(values):
    try:
        return sum(values) / len(values)
    except ZeroDivisionError:
        return None

for values in [[80, 90, 70], []]:
    print(values, "->", safe_average(values))""",
                "只捕获预期的 ZeroDivisionError，并把空列表转换为可解释的 None。",
                "示例 5：把文本输入转换成数字",
                """raw_scores = ["88", "not-a-number", "92"]
parsed_scores = []
for raw in raw_scores:
    try:
        parsed_scores.append(float(raw))
    except ValueError:
        print(f"跳过无法转换的输入：{raw!r}")
print("可计算的分数：", parsed_scores)""",
                "ValueError 表示格式不符合数字要求；处理真实输入时，应保留问题值的线索。",
            ),
        }
        return examples.get(number)

    if "NumPy" in name:
        return (
            "示例 4：整理数组并查看每行合计",
            """import numpy as np

daily_sales = np.array([120, 150, 180, 210, 195, 230])
table = daily_sales.reshape(2, 3)
print("数组：\\n", table)
print("形状：", table.shape)
print("每行合计：", table.sum(axis=1))""",
            "reshape 只改变排列方式，不改变元素总数；axis=1 表示沿每一行计算。",
            "示例 5：先切片，再用条件筛选",
            """import numpy as np

matrix = np.arange(1, 13).reshape(3, 4)
print("最后两行：\\n", matrix[-2:])
print("第二列：", matrix[:, 1])
print("大于6的元素：", matrix[matrix > 6])""",
            "切片通常保留数组形状；布尔筛选会返回满足条件的元素，适合快速定位重点值。",
        )

    if "Pandas" in name:
        return (
            "示例 4：从明细表生成计算列",
            """import pandas as pd

orders = pd.DataFrame({
    "region": ["华东", "华南", "华东"],
    "sales": [120, 150, 180],
    "cost": [80, 100, 130],
})
orders["profit"] = orders["sales"] - orders["cost"]
orders["profit_rate"] = orders["profit"] / orders["sales"]
print(orders.round(3))""",
            "先新增一个简单指标，再基于它计算比例；拆成多列可以保留中间结果并方便检查。",
            "示例 5：从明细汇总到业务表",
            """import pandas as pd

orders = pd.DataFrame({
    "region": ["华东", "华东", "华南", "华南"],
    "channel": ["线上", "线下", "线上", "线下"],
    "sales": [120, 80, 150, 100],
})
summary = orders.groupby(["region", "channel"], as_index=False)["sales"].sum()
print(summary)
print("地区合计：")
print(orders.groupby("region")["sales"].sum())""",
            "先明确每一行的粒度，再选择 groupby 的字段；汇总表的每一行代表一个清晰的分组组合。",
        )

    if "Matplotlib" in name:
        code_a = """import numpy as np
import matplotlib.pyplot as plt

x = np.arange(1, 6)
y = np.array([10, 14, 13, 18, 21])
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.plot(x, y, marker="o", color="#2563eb")
ax.set(title="一个最小可读图表", xlabel="阶段", ylabel="指标值")
ax.grid(axis="y", alpha=0.3)
plt.show()"""
        code_b = """import numpy as np
import matplotlib.pyplot as plt

labels = ["A", "B", "C", "D"]
values = [12, 18, 15, 21]
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.bar(labels, values, color="#f59e0b")
ax.set(title="换一种编码方式", xlabel="类别", ylabel="数量")
plt.show()"""
        return (
            "示例 4：从最小图表开始",
            code_a,
            "先确认数据、标题、单位和坐标轴都能读懂，再增加颜色、注释或布局。一个可读的简单图通常比复杂但没有重点的图更好。",
            "示例 5：改变图形编码并比较",
            code_b,
            "同一份数据可以有不同表达方式；选择图形时要回到问题本身：是在看趋势，还是在比较类别。",
        )

    if "Seaborn" in name:
        return (
            "示例 4：用长表完成一次分组绘图",
            """import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.DataFrame({
    "region": ["华东", "华东", "华南", "华南", "华北", "华北"],
    "channel": ["线上", "线下", "线上", "线下", "线上", "线下"],
    "sales": [120, 90, 150, 110, 100, 80],
})
sns.set_theme(style="whitegrid")
sns.barplot(data=df, x="region", y="sales", hue="channel", errorbar=None)
plt.title("地区与渠道销售额")
plt.show()""",
            "长表的每一行是一条观察；x、y 和 hue 分别决定位置、数值和分类颜色。",
            "示例 5：保留原始观察再看摘要",
            """import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.DataFrame({
    "region": ["华东", "华东", "华南", "华南", "华北", "华北"],
    "sales": [120, 150, 100, 180, 90, 130],
})
sns.boxplot(data=df, x="region", y="sales", color="lightgray")
sns.stripplot(data=df, x="region", y="sales", color="#2563eb", alpha=0.7)
plt.title("摘要分布与原始点")
plt.show()""",
            "箱线图提供摘要，散点保留真实记录；两者叠加适合样本量不太大的数据。",
        )

    if "Plotly" in name:
        return (
            "示例 4：增加 Hover 和统一单位",
            """import pandas as pd
import plotly.express as px

df = pd.DataFrame({
    "month": ["1月", "2月", "3月"],
    "sales": [120, 150, 180],
    "orders": [12, 15, 18],
})
fig = px.line(df, x="month", y="sales", markers=True, hover_data=["orders"], title="月度销售趋势")
fig.update_layout(xaxis_title="月份", yaxis_title="销售额（万元）")
fig.show()""",
            "静态位置回答整体关系，Hover 提供单条记录的明细；标题和单位让图表脱离代码后仍然可读。",
            "示例 5：用按钮切换两个指标",
            """import pandas as pd
import plotly.express as px

df = pd.DataFrame({
    "month": ["1月", "2月", "3月"],
    "sales": [120, 150, 180],
    "orders": [12, 15, 18],
})
fig = px.line(df, x="month", y=["sales", "orders"], markers=True, title="指标切换")
fig.update_layout(
    updatemenus=[{
        "buttons": [
            {"label": "显示销售额", "method": "update", "args": [{"visible": [True, False]}]},
            {"label": "显示订单数", "method": "update", "args": [{"visible": [False, True]}]},
        ]
    }]
)
fig.show()""",
            "控件本质上是在切换 trace 的可见性；按钮标签必须和当前显示的指标一致。",
        )

    if "综合项目" in name:
        return (
            "项目预热：先手算一条记录",
            """import pandas as pd

df = pd.DataFrame({
    "product": ["A", "B", "C"],
    "sales": [120, 180, 150],
})
df["share"] = df["sales"] / df["sales"].sum()
print(df)
print("最高销售商品：", df.loc[df["sales"].idxmax(), "product"])""",
            "项目分析通常沿着“明细记录 → 指标计算 → 图表或表格 → 业务结论”推进；每一步都要保留口径。",
            "项目预热：把结论写成事实、证据和下一步",
            """result = {
    "fact": "B 产品销售额最高",
    "evidence": 180,
    "action": "进一步检查 B 产品的复购率",
}
print("事实：", result["fact"])
print("证据：", result["evidence"], "万元")
print("下一步：", result["action"])""",
            "好的结论把事实、证据和下一步分开写；不要把相关关系直接写成因果关系。",
        )

    if "变量" in name:
        return (
            "示例 3：给变量起一个能读懂的名字",
            """student_name = "小林"
study_days = 7
minutes_each_day = 40
total_minutes = study_days * minutes_each_day
print(f"{student_name} 计划学习 {study_days} 天，共 {total_minutes} 分钟")""",
            "变量名应该说明含义和单位；minutes_each_day 比 x 更容易在几天后读懂。",
            "示例 4：先判断类型，再进行操作",
            """values = ["128", 128, 128.0, True]
for value in values:
    print(repr(value), "->", type(value).__name__)""",
            "看起来相似的值可能属于不同类型；先确认类型，再决定是否需要转换。",
        )

    return None


def insert_index(nb: dict) -> int:
    preferred = ("## 常见误区", "## 综合练习", "## 结论与表达", "## 项目验收清单", "## 本章小结")
    for index, cell in enumerate(nb.get("cells", [])):
        if cell.get("cell_type") != "markdown":
            continue
        first = "".join(cell.get("source", [])).strip().splitlines()
        if first and any(first[0].startswith(item) for item in preferred):
            return index
    return len(nb.get("cells", []))


def repair_exercise_source(source: str) -> str:
    """把练习单元格中的空表达式改成可运行的参考起点。

    练习仍然保留 TODO 注释，学生可以先运行这个起点，再逐项改写；
    但不会因为 `value =` 这类空表达式直接触发 SyntaxError。
    """
    replacements = {
        "total_hours =\n": "total_hours = days * minutes_per_day / 60\n",
        "order_amount =\n": "order_amount = price * quantity - coupon_amount\n",
        "reaches_threshold =\n": "reaches_threshold = order_amount >= 300\n",
        "tags =\n": "tags = [tag.strip().lower() for tag in raw_tags.split(',')]\n",
        "normalized =\n": "normalized = '-'.join(tags)\n",
        "parts =\n": "parts = [item.strip() for item in raw_record.split('|')]\n",
        "order_id =\n": "order_id = parts[0].replace('order:', '', 1).upper()\n",
        "region =\n": "region = parts[1].casefold()\n",
        "amount =\n": "amount = float(parts[2].replace(',', ''))\n",
        "is_valid_order =\n": "is_valid_order = order_id.startswith('A') and parts[3].endswith('05')\n",
        "high_value =\n": "high_value = [amount for amount in amounts if amount > 500]\n",
        "amount_range =\n": "amount_range = (min(amounts), max(amounts))\n",
        "premium =\n": "premium = {name: price for name, price in prices.items() if price >= 100}\n",
        "common =\n": "common = order_a & order_b\n",
        "    label =\n": "    label = '大额订单'\n",
        "    label =\n": "    label = '大额订单'\n",
        "    if value < 0:\n\n": "    if value < 0:\n        continue\n\n",
        "    valid_total +=\n": "    valid_total += value\n",
        "    valid_count +=\n": "    valid_count += 1\n",
        "log_path.write_text(, encoding=\"utf-8\")": "log_path.write_text('\\n'.join(records), encoding=\"utf-8\")",
        "loaded =\n": "loaded = [line for line in log_path.read_text(encoding=\"utf-8\").splitlines() if line.strip()]\n",
        "arr =\n": "arr = np.arange(1, 13).reshape(3, 4)\n",
        "float_arr =\n": "float_arr = arr.astype(float)\n",
        "last_rows =\n": "last_rows = matrix[-2:]\n",
        "even_values =\n": "even_values = matrix[matrix % 2 == 0]\n",
        "matrix =\n": "matrix = np.arange(1, 25).reshape(4, 6)\n",
        "top, bottom =\n": "top, bottom = np.split(matrix, 2, axis=0)\n",
        "transposed =\n": "transposed = matrix.T\n",
        "adjusted =\n": "adjusted = sales * season_factor\n",
        "daily_sales =\n": "daily_sales = np.maximum(rng.normal(180, 35, 60), 60)\n",
        "inspection =\n": "inspection = rng.choice(daily_sales, size=5, replace=False)\n",
        'products["stock_value"] =\n': 'products["stock_value"] = products["price"] * products["stock"]\n',
        'finance["profit"] =\n': 'finance["profit"] = finance["sales"] - finance["cost"]\n',
        'finance["margin"] =\n': 'finance["margin"] = finance["profit"] / finance["sales"]\n',
        'finance["region"] =\n': 'finance["region"] = finance["region"].astype("category")\n',
        'clean["age"] =\n': 'clean["age"] = clean["age"].fillna(clean["age"].median())\n',
        'clean["city"] =\n': 'clean["city"] = clean["city"].fillna("未知")\n',
        'users["phone_clean"] =\n': 'users["phone_clean"] = users["phone"].str.replace(r"\\D", "", regex=True)\n',
        'users["registered_at"] =\n': 'users["registered_at"] = pd.to_datetime(users["registered_at"])\n',
        'users["register_month"] =\n': 'users["register_month"] = users["registered_at"].dt.month\n',
        'users["account_days"] =\n': 'users["account_days"] = (pd.Timestamp("2026-04-01") - users["registered_at"]).dt.days\n',
        'data["sales"] =\n': 'data["sales"] = pd.to_numeric(data["sales"], errors="coerce")\n',
        'clean =\n': 'clean = data.dropna(subset=["sales"])\n',
        'pivot =\n': 'pivot = orders.pivot_table(index="region", columns="channel", values="amount", aggfunc="sum", fill_value=0)\n',
        'result["line_amount"] =\n': 'result["line_amount"] = result["quantity"] * result["price"]\n',
        'monthly["moving_3m"] =\n': 'monthly["moving_3m"] = monthly["sales"].rolling(3).mean()\n',
        'monthly["cumulative"] =\n': 'monthly["cumulative"] = monthly["sales"].cumsum()\n',
    }
    fixed = source
    for old, new in replacements.items():
        fixed = fixed.replace(old, new)

    # 字符串章节的订单清洗练习需要按字段重组，不能套用标签练习的 join 起点。
    if "raw_record =" in fixed and "order:a102" in fixed:
        fixed = fixed.replace(
            "normalized = '-'.join(tags)",
            "normalized = '|'.join([order_id, region, f'{amount:.2f}', parts[3]])",
        )

    # `arr =` is also a suffix of `float_arr =`; correct the more specific
    # assignment after the generic replacement above.
    fixed = fixed.replace(
        "float_arr = np.arange(1, 13).reshape(3, 4)",
        "float_arr = arr.astype(float)",
    )
    fixed = fixed.replace(
        "rng = np.random.default_rng(150)",
        "rng = np.random.default_rng(150) if hasattr(np.random, 'default_rng') else np.random.RandomState(150)",
    )
    fixed = fixed.replace(
        'pd.period_range("2025-01", periods=12, freq="M").astype("string")',
        'pd.period_range("2025-01", periods=12, freq="M").astype(str)',
    )
    old_summary = '''summary = orders.groupby(["region", "channel"]).agg(
    sales=("amount", "sum"),
    order_count=("amount", "size"),
    average_order=("amount", "mean"),
).reset_index()'''
    new_summary = '''summary = orders.groupby(["region", "channel"])["amount"].agg(["sum", "size", "mean"]).reset_index()
summary.columns = ["region", "channel", "sales", "order_count", "average_order"]'''
    fixed = fixed.replace(old_summary, new_summary)

    # 两个 if 分支原本各有一个空的 label 赋值，按上下文补回不同标签。
    if "if amount >= 2000:" in fixed:
        fixed = fixed.replace("if amount >= 2000:\n    label = '大额订单'", "if amount >= 2000:\n    label = '超大额订单'")
        fixed = fixed.replace("elif amount >= 500:\n    label = '大额订单'", "elif amount >= 500:\n    label = '大额订单'")
        fixed = fixed.replace("else:\n    label = '大额订单'", "else:\n    label = '普通订单'")

    # 函数练习中的空分支和空返回值。
    if "def growth_rate(current, previous):" in fixed:
        fixed = fixed.replace("if previous == 0:\n\n", "if previous == 0:\n        return None\n\n")
        fixed = fixed.replace("    return\n", "    return (current - previous) / previous\n")
    return fixed


def repair_compatibility_source(source: str) -> str:
    """让新增示例兼容课程运行时可能使用的旧版库。"""
    fixed = source
    # 三引号模板中的转义符曾被展开成真实换行，修回合法的 Python 字符串。
    fixed = fixed.replace(
        'print("原数组：\n", matrix)',
        'print("原数组：\\n", matrix)',
    )
    fixed = fixed.replace('sns.set_theme(style="whitegrid")', 'sns.set(style="whitegrid")')
    fixed = fixed.replace('errorbar=None', 'ci=None')
    fixed = fixed.replace(
        'demo_path.unlink(missing_ok=True)',
        'if demo_path.exists():\n    demo_path.unlink()',
    )
    return fixed


def enhance_source(path: Path) -> bool:
    nb = json.loads(path.read_text(encoding="utf-8"))
    metadata = nb.setdefault("metadata", {})
    repaired = repair_markdown_cells(nb)
    for cell in nb.get("cells", []):
        if cell.get("cell_type") != "code":
            continue
        source = "".join(cell.get("source", []))
        fixed = repair_exercise_source(source) if "TODO" in source else source
        fixed = repair_compatibility_source(fixed)
        if fixed != source:
            cell["source"] = source_lines(fixed)
            repaired = True
    teaching_changed = enhance_teaching_content(path, nb)
    error_recovery_changed = enhance_error_recovery(path, nb)
    module_structure_changed = enhance_module_structure(path, nb)
    if metadata.get("beginner_enhancement_version") == VERSION:
        if repaired or teaching_changed or error_recovery_changed or module_structure_changed:
            path.write_text(json.dumps(nb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return repaired or teaching_changed or error_recovery_changed or module_structure_changed

    title = title_of(nb)
    additions = route_cells(path, title)
    examples = examples_for(path.name)
    if examples:
        title_a, code_a, note_a, title_b, code_b, note_b = examples
        additions.extend(
            [
                md(path, "example-a-intro", f"## {title_a}\n\n这一组例子只处理一个小问题。先运行代码，再逐行对照拆解说明。"),
                code(path, "example-a", code_a),
                md(path, "example-a-notes", f"### 逐步拆解\n\n{note_a}\n\n建议第一次运行后只改一个输入值，再观察哪一个输出发生变化。"),
                md(path, "example-b-intro", f"## {title_b}\n\n看懂上一个例子后，再观察同一主题在另一种数据或场景中的写法。"),
                code(path, "example-b", code_b),
                md(path, "example-b-notes", f"### 逐步拆解\n\n{note_b}\n\n自我检查：如果把输入数量、类别或参数改成另一组值，代码是否仍然能运行？"),
            ]
        )

    nb["cells"][insert_index(nb):insert_index(nb)] = additions
    metadata["beginner_enhancement_version"] = VERSION
    metadata["teaching_level"] = "beginner-progressive"
    path.write_text(json.dumps(nb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return True


def enhance_app(path: Path) -> bool:
    nb = json.loads(path.read_text(encoding="utf-8"))
    metadata = nb.setdefault("metadata", {})
    changed = repair_markdown_cells(nb)

    # 课程发布副本由生成器重建后，仍可能包含带 TODO 的练习起点。
    # 发布副本也必须具备可解析、可从上到下运行的代码，不能只补路线说明。
    for cell in nb.get("cells", []):
        if cell.get("cell_type") != "code":
            continue
        source = "".join(cell.get("source", []))
        fixed = repair_exercise_source(source) if "TODO" in source else source
        fixed = repair_compatibility_source(fixed)
        if fixed != source:
            cell["source"] = source_lines(fixed)
            changed = True

    teaching_changed = enhance_teaching_content(path, nb)
    error_recovery_changed = enhance_error_recovery(path, nb)
    module_structure_changed = enhance_module_structure(path, nb)
    if metadata.get("beginner_route_version") == VERSION:
        if changed or teaching_changed or error_recovery_changed or module_structure_changed:
            path.write_text(json.dumps(nb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return changed or teaching_changed or error_recovery_changed or module_structure_changed

    cells = nb.setdefault("cells", [])
    if not any("## 初学者学习路线" in "".join(c.get("source", [])) for c in cells if c.get("cell_type") == "markdown"):
        cells[1:1] = route_cells(path, title_of(nb))
        changed = True
    metadata["beginner_route_version"] = VERSION
    metadata["teaching_level"] = "beginner-progressive"
    path.write_text(json.dumps(nb, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return True


def main() -> None:
    source_roots = [
        ROOT / "notebooks" / "course",
        ROOT / "notebooks" / "extras",
        ROOT / "public" / "runtime" / "files" / "course",
        ROOT / "public" / "runtime" / "files" / "extras",
    ]
    app_root = ROOT / "public" / "course"

    source_changed = 0
    app_changed = 0
    for root in source_roots:
        for path in sorted(root.rglob("*.ipynb")):
            source_changed += int(enhance_source(path))
    for path in sorted(app_root.rglob("*.ipynb")):
        app_changed += int(enhance_app(path))

    print(f"source/runtime notebooks changed: {source_changed}")
    print(f"app notebooks changed: {app_changed}")


if __name__ == "__main__":
    main()
