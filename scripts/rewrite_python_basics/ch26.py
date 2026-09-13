"""course-chapter-26 数据合并与结构转换"""

TITLE = "数据合并与结构转换"
EST_MINUTES = 55

CELLS = [
    ("md", """\
# 第30章 数据合并与结构转换

账目明细一张表、预算标准一张表、会员信息一张表——
分析前必须把它们**拼起来**。本章学 Pandas 的拼表术：

`merge`（按列对齐，像 SQL join）、`concat`（上下/左右堆叠）、
以及 merge 的四种 `how` 模式。选错模式，数据会“无声消失”。""", []),

    ("md", """## 学习目标

学完本章，你能够：

- 用 `merge` 按键连接两张表，区分 inner/left/outer 三种 `how`；
- 用 `validate` 防止多对多爆炸，用 `indicator=True` 检查匹配情况；
- 用 `concat` 纵向堆叠同结构表；
- 避开三大坑：键名不一致静默空表、一对多行数暴涨、忘查合并后行数。""", []),

    ("md", """## 1. merge：按键把两张表对齐

**概念**：`pd.merge(左表, 右表, on="键", how="inner")`：
- `inner`：只保留两边都有的键（默认）；
- `left`：保留左表全部，右表缺失填 nan；
- `outer`：并集全保留。
**合并后第一件事：查行数**。""", []),

    ("md", "### 例 1｜最小例子：三种 how", []),

    ("code", """\
import pandas as pd

left = pd.DataFrame({"key": ["a", "b", "c"], "lv": [1, 2, 3]})
right = pd.DataFrame({"key": ["b", "c", "d"], "rv": [4, 5, 6]})

print(pd.merge(left, right, on="key"))                 # inner：2 行
print(pd.merge(left, right, on="key", how="left"))     # left：3 行
print(pd.merge(left, right, on="key", how="outer"))    # outer：4 行""", ["example"]),

    ("md", "### 例 2｜业务例子：账目关联预算表", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "category": ["餐饮", "交通", "娱乐", "数码"],
    "amount": [57.5, 8.0, 45.0, 399.0],
})
budget = pd.DataFrame({
    "category": ["餐饮", "交通", "娱乐"],
    "monthly_budget": [500.0, 100.0, 150.0],
})

merged = pd.merge(ledger, budget, on="category", how="left")
merged["usage"] = (merged["amount"] / merged["monthly_budget"]).round(2)
print(merged)
print("无预算类别:", merged[merged["monthly_budget"].isna()]
      ["category"].tolist())""", ["example"]),

    ("md", "### 例 3｜常见错误：键名不一致拼出空表", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({"category": ["餐饮"], "amount": [57.5]})
budget = pd.DataFrame({"cat": ["餐饮"], "monthly_budget": [500.0]})

# 反例 1：on="category" 但右表叫 cat
# pd.merge(ledger, budget, on="category")   # KeyError

# 反例 2：键的取值没对齐（“餐饮 ”带空格 vs “餐饮”）
budget2 = pd.DataFrame({"category": ["餐饮 "], "b": [500.0]})
print(pd.merge(ledger, budget2, on="category"))   # 0 行！静默空表

# 修复：先清洗键（strip），再用 left_on/right_on 处理不同名
budget2["category"] = budget2["category"].str.strip()
print(pd.merge(ledger, budget2, on="category"))""", ["example"]),

    ("md", """\
**要点**：**合并出 0 行或行数骤减，先查两件事——键名一致吗？键值清洗过吗？**
（空格、大小写、全半角都是隐形杀手。）""", []),

    ("md", """## 2. validate 与 indicator：合并的安全带

**概念**：
`validate="many_to_one"` 声明“右表键唯一”，违反立即报错——
防止右表意外重复导致**行数暴涨**；
`indicator=True` 加一列 `_merge` 标记每行来自哪边（both/left_only），
是检查 left 合并质量的标准工具。""", []),

    ("md", "### 例 1｜业务例子：带安全带的预算关联", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "category": ["餐饮", "交通", "餐饮", "娱乐"],
    "amount": [25.5, 4.0, 32.0, 45.0],
})
budget = pd.DataFrame({
    "category": ["餐饮", "交通", "娱乐"],
    "monthly_budget": [500.0, 100.0, 150.0],
})

merged = pd.merge(ledger, budget, on="category", how="left",
                  validate="many_to_one", indicator=True)
print(merged)
print(merged["_merge"].value_counts())""", ["example"]),

    ("md", "### 例 2｜常见错误：右表重复导致行数爆炸", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({"category": ["餐饮", "交通"], "amount": [25.5, 4.0]})
budget = pd.DataFrame({
    "category": ["餐饮", "餐饮", "交通"],       # 餐饮配了两条预算！
    "monthly_budget": [500.0, 600.0, 100.0],
})

merged = pd.merge(ledger, budget, on="category")   # 不报错，但行数变 3
print(merged)     # 餐饮出现两行——金额被重复计算的风险！

# 修复：validate 让它当场报错
try:
    pd.merge(ledger, budget, on="category", validate="many_to_one")
except Exception as e:
    print(type(e).__name__, "<- 重复键被拦下")""", ["example"]),

    ("md", """\
**要点**：**合并后 `len(结果) == len(左表)` 是 many_to_one 的底线**。
正式代码一律写 `validate`，让错误在拼表时暴露，而不是在汇总时作祟。""", []),

    ("md", """## 3. concat 与结构转换：堆叠与变形

**概念**：`pd.concat([df1, df2])` 纵向堆叠**同结构**表（各月账单合并）；
`ignore_index=True` 重建索引。结构转换在透视章已学（pivot/melt），
这里补最后一个高频组合：**concat 之后立刻查列名与 dtypes**。""", []),

    ("md", "### 例 1｜业务例子：三个月账单合并", []),

    ("code", """\
import pandas as pd

june = pd.DataFrame({"date": ["06-01"], "amount": [120.0]})
july = pd.DataFrame({"date": ["07-01"], "amount": [98.0]})
august = pd.DataFrame({"date": ["08-01"], "amount": [132.0]})

all_months = pd.concat([june, july, august], ignore_index=True)
print(all_months)
print("合计:", all_months["amount"].sum())""", ["example"]),

    ("md", "### 例 2｜常见错误：concat 后列名不一致", []),

    ("code", """\
import pandas as pd

a = pd.DataFrame({"date": ["06-01"], "amount": [120.0]})
b = pd.DataFrame({"day": ["07-01"], "amount": [98.0]})   # 列名 day！

merged = pd.concat([a, b], ignore_index=True)
print(merged)      # 出现 date 与 day 两列，各自一半 nan

# 修复：先统一列名再 concat
b = b.rename(columns={"day": "date"})
print(pd.concat([a, b], ignore_index=True))""", ["example"]),

    ("md", """\
**要点**：**concat 对不齐的列不会报错，只会生成一半 nan 的“幽灵列”。**
堆叠前核对 `columns.tolist()` 是否一致。""", []),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 26.1：账目关联预算", ["exercise"]),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "category": ["餐饮", "交通", "娱乐", "数码", "餐饮"],
    "amount": [25.5, 4.0, 45.0, 399.0, 32.0],
})
budget = pd.DataFrame({
    "category": ["餐饮", "交通", "娱乐"],
    "monthly_budget": [500.0, 100.0, 150.0],
})

# TODO 1：left 合并（带 validate="many_to_one" 与 indicator=True）
# TODO 2：新增 usage 列 = amount / monthly_budget（保留 2 位）
# TODO 3：打印无预算的类别清单和每类的使用率报表（groupby）""", ["exercise"]),

    ("md", "### 练一练 26.2：堵住行数爆炸", ["exercise"]),

    ("code", """\
import pandas as pd

orders = pd.DataFrame({
    "order_id": ["A", "A", "B"],
    "item": ["键盘", "鼠标", "显示器"],
    "amount": [299.0, 99.0, 1500.0],
})
customers = pd.DataFrame({
    "order_id": ["A", "A", "B"],      # 订单 A 被重复登记！
    "customer": ["张三", "李四", "王五"],
})

# TODO 1：直接 merge 观察“订单 A 变成 4 行”的爆炸现场
# TODO 2：找出重复键（customers.duplicated(subset=["order_id"])），去重后
#         用 validate="many_to_one" 重新合并，验证行数 == len(orders)""", ["exercise"]),

    ("md", "### 练一练 26.3：堆叠三个月", ["exercise"]),

    ("code", """\
import pandas as pd

frames = [
    pd.DataFrame({"date": ["06-01"], "amount": [120.0]}),
    pd.DataFrame({"day": ["07-01"], "amount": [98.0]}),      # 列名不一致
    pd.DataFrame({"date": ["08-01"], "amount": [132.0]}),
]

# TODO 1：统一列名后 concat（ignore_index=True）
# TODO 2：打印总行数与 amount 合计
# TODO 3：故意用原始 frames concat 一次，观察“幽灵列”现象""", ["exercise"]),

    ("md", """## 易错点清单

- merge 默认 inner，会静默丢弃不匹配的行——业务上常用 left + indicator；
- 键名不一致 KeyError、键值有空格拼出 0 行：先清洗键再合并；
- 右表键重复会行数爆炸：一律 `validate="many_to_one"` 预防；
- concat 列名不一致生成“幽灵列”，堆叠前核对列名；
- **每次合并后第一件事：核对行数**。""", []),

    ("md", """## 本章小结

- merge 管“按键对齐”（inner/left/outer），concat 管“同构堆叠”。
- validate 是合并的安全带，indicator 是质量报告。
- 合并三查：键名、键值、合并后行数。
- 下一章：时间序列的专属工具——滚动窗口与环比变化。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 26.1 参考答案
import pandas as pd

ledger = pd.DataFrame({
    "category": ["餐饮", "交通", "娱乐", "数码", "餐饮"],
    "amount": [25.5, 4.0, 45.0, 399.0, 32.0],
})
budget = pd.DataFrame({
    "category": ["餐饮", "交通", "娱乐"],
    "monthly_budget": [500.0, 100.0, 150.0],
})

merged = pd.merge(ledger, budget, on="category", how="left",
                  validate="many_to_one", indicator=True)
merged["usage"] = (merged["amount"] / merged["monthly_budget"]).round(2)
print(merged)
print("无预算:", merged.loc[merged["monthly_budget"].isna(), "category"].tolist())
print(merged.groupby("category")["usage"].mean().round(2))""", ["solution"]),

    ("code", """\
# 练一练 26.2 参考答案
import pandas as pd

orders = pd.DataFrame({
    "order_id": ["A", "A", "B"],
    "item": ["键盘", "鼠标", "显示器"],
    "amount": [299.0, 99.0, 1500.0],
})
customers = pd.DataFrame({
    "order_id": ["A", "A", "B"],
    "customer": ["张三", "李四", "王五"],
})
print(len(pd.merge(orders, customers, on="order_id")), "行 <- 爆炸现场")

dup_mask = customers.duplicated(subset=["order_id"])
customers = customers[~dup_mask]
merged = pd.merge(orders, customers, on="order_id", validate="many_to_one")
print(len(merged) == len(orders), "<- 行数守恒")""", ["solution"]),

    ("code", """\
# 练一练 26.3 参考答案
import pandas as pd

frames = [
    pd.DataFrame({"date": ["06-01"], "amount": [120.0]}),
    pd.DataFrame({"day": ["07-01"], "amount": [98.0]}),
    pd.DataFrame({"date": ["08-01"], "amount": [132.0]}),
]
print(pd.concat(frames, ignore_index=True))   # 幽灵列现场

fixed = [f.rename(columns={"day": "date"}) for f in frames]
clean = pd.concat(fixed, ignore_index=True)
print(clean)
print(len(clean), clean["amount"].sum())""", ["solution"]),
]
