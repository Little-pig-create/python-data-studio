"""course-chapter-21 行列操作与类型转换"""

TITLE = "行列操作与类型转换"
EST_MINUTES = 55

CELLS = [
    ("md", """\
# 第25章 行列操作与类型转换

数据表拿到手往往要“整型”：加一列折后金额、删掉无关字段、
把文本型的金额转成数字。本章学表的**改造**——
增删改列、重命名、类型转换。

其中 `SettingWithCopyWarning` 是 Pandas 最著名的警告，
本章会用一整节把它讲透。""", []),

    ("md", """## 学习目标

学完本章，你能够：

- 增列（向量化计算）、删列（drop / del）、重命名（rename）；
- 用 `astype` 转类型，用 `pd.to_numeric` 安全转换“带脏字符”的数字列；
- 解释 `SettingWithCopyWarning` 的成因并用 `loc` / `.copy()` 正确规避；
- 避开三大坑：原地修改副本、astype 遇脏数据崩溃、忘接返回值。""", []),

    ("md", """## 1. 增删改列与重命名

**概念**：增列就是 `df["新列"] = 向量化表达式`（长度自动对齐行）；
删列用 `df.drop(columns=["列"])`（返回新表）；
重命名用 `df.rename(columns={...})`（返回新表）。
Pandas 的方法默认**不改原表**，返回值要接住。""", []),

    ("md", "### 例 1｜最小例子：增删改一次看全", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"price": [10.0, 20.0], "qty": [2, 3]})

df["total"] = df["price"] * df["qty"]        # 增列
df = df.rename(columns={"qty": "quantity"})  # 重命名
df = df.drop(columns=["price"])              # 删列
print(df)""", ["example"]),

    ("md", "### 例 2｜业务例子：给账本加分析列", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "summary": ["咖啡", "地铁", "耳机", "电影"],
    "category": ["餐饮", "交通", "数码", "娱乐"],
    "amount": [18.0, 4.0, 399.0, 45.0],
})

ledger["level"] = ledger["amount"].apply(
    lambda a: "大额" if a >= 100 else "小额")
ledger["share"] = (ledger["amount"] / ledger["amount"].sum()).round(3)
print(ledger)""", ["example"]),

    ("md", "### 例 3｜常见错误：调用方法不接返回值", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"price": [10.0, 20.0]})

# 反例：drop/rename 返回新表，不接住等于白做
df.drop(columns=["price"])
df.rename(columns={"price": "amount"})
print(df.columns.tolist())     # price 还在！

# 修复 1：重新赋值
df = df.drop(columns=["price"])
print(df.columns.tolist())

# 修复 2：确认不要原表时，drop 支持 inplace（但不推荐混用）
df2 = pd.DataFrame({"a": [1]})
df2.drop(columns=["a"], inplace=True)
print(df2.shape)""", ["example"]),

    ("md", """\
**要点**：**Pandas 方法默认返回新对象**。接住返回值是最稳的写法，
`inplace=True` 留给明确确定不要原表的场景。""", []),

    ("md", """## 2. 类型转换：astype 与 pd.to_numeric

**概念**：`df["列"].astype(int/float/str/"category")` 直接转；
列里混着脏字符（"3.5元"、空串）时 astype 会崩，
用 `pd.to_numeric(s, errors="coerce")` ——转不了的变 NaN，优雅降级。
转完 `df.dtypes` 检查一遍是标准动作。""", []),

    ("md", "### 例 1｜最小例子：astype 全家", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"a": ["1", "2"], "b": [1.0, 2.0]})

df = df.astype({"a": int, "b": float})
print(df.dtypes)
print(df["b"].astype(str).dtype)   # 转成文本""", ["example"]),

    ("md", "### 例 2｜业务例子：清洗文本型金额", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "raw": ["25.5元", "4.0元", "", "399元"],   # 小票机吐出的原始列
})

# astype 会崩：
# ledger["raw"].str.replace("元", "").astype(float)   # ValueError: 空串转不了

# 修复：to_numeric + coerce
clean = pd.to_numeric(
    ledger["raw"].str.replace("元", "", regex=False),
    errors="coerce",
)
ledger["amount"] = clean
print(ledger)
print("有效金额:", clean.sum(), "元，坏数据", clean.isna().sum(), "条")""", ["example"]),

    ("md", "### 例 3｜常见错误：int 列里有 NaN", []),

    ("code", """\
import pandas as pd

s = pd.Series([1.0, 2.0, None])

# 反例：float 列含 NaN 转 int 直接崩
# s.astype(int)    # ValueError: Cannot convert non-finite values ...

# 修复 1：先填缺失再转
print(s.fillna(0).astype(int))

# 修复 2：用可空整数类型 Int64（大写 I），保留 NaN
print(s.astype("Int64"))""", ["example"]),

    ("md", """\
**要点**：**astype 遇到 NaN/脏字符就崩**；带缺失转整数用 `"Int64"` 可空类型，
带脏文本用 `pd.to_numeric(errors="coerce")`。""", []),

    ("md", """## 3. SettingWithCopyWarning：最有名的警告

**概念**：链式筛选的结果可能是“视图的副本”，Pandas 无法确定
你的赋值会不会写到原表，于是发出警告。
规范解法两条：**筛选+赋值一步用 `df.loc[条件, 列] = 值`；
需要独立副本就显式 `.copy()`。**""", []),

    ("md", "### 例 1｜反例与修复：给筛选结果打标", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "category": ["餐饮", "交通", "数码"],
    "amount": [25.5, 4.0, 399.0],
})

# 反例：链式赋值（会触发 SettingWithCopyWarning，且原表可能没变）
big = ledger[ledger["amount"] > 10]
big["level"] = "大额"        # 改的可能是副本
print(ledger)                # level 列没加上！

# 修复 1：loc 一步到位
ledger.loc[ledger["amount"] > 10, "level"] = "大额"
ledger["level"] = ledger["level"].fillna("小额")
print(ledger)""", ["example"]),

    ("md", "### 例 2｜何时该 copy：分析分支的独立沙盒", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({"amount": [25.5, 4.0, 399.0, 132.0]})

# 场景：只分析大额账目，且想在分析表里随意改列
big = ledger[ledger["amount"] > 100].copy()   # 显式独立副本
big["note"] = "分析用"
big["amount"] = big["amount"] * 1.0
print(big)
print("原表安全:", "note" not in ledger.columns)""", ["example"]),

    ("md", """\
**要点**：警告不是错误，但**忽略它 = 结果可能没生效**。
看到 `SettingWithCopyWarning`：
分析用途 → 加 `.copy()`；写回原表 → 改用 `loc` 一步赋值。""", []),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 21.1：改造账本表", ["exercise"]),

    ("code", """\
import pandas as pd

df = pd.DataFrame({
    "summary": ["咖啡", "地铁", "耳机", "电影"],
    "amount": [18.0, 4.0, 399.0, 45.0],
    "temp": [1, 0, 0, 1],          # 无用列
})

# TODO 1：新增列 is_big：amount >= 100 为 True（向量化）
# TODO 2：重命名 temp -> flag（或直接删掉）
# TODO 3：删除 temp 列，打印最终表的列名""", ["exercise"]),

    ("md", "### 练一练 21.2：清洗脏金额列", ["exercise"]),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"raw": ["88元", "12.5元", "N/A", "300元", ""]})

# TODO 1：去掉“元”字，用 pd.to_numeric(errors="coerce") 转数值列 amount
# TODO 2：打印总金额（to_numeric 后 nan 会被 sum 自动忽略）与坏数据条数
# TODO 3：amount 四舍五入后转为可空整数 Int64，打印 dtypes""", ["exercise"]),

    ("md", "### 练一练 21.3：治理 SettingWithCopy", ["exercise"]),

    ("code", """\
import pandas as pd

df = pd.DataFrame({
    "category": ["餐饮", "交通", "数码", "娱乐"],
    "amount": [25.5, 4.0, 399.0, 45.0],
})

# 下面的代码想把大额账目标记为“重点”，但写法有隐患。
# TODO 1：运行观察警告与 df 的列
# TODO 2：改成 loc 一步赋值的规范写法，验证 level 列已写入
# TODO 3：另建独立副本 big_df（只含大额），加 note 列，验证原表不受影响
sub = df[df["amount"] > 100]
sub["level"] = "重点"
print(df)""", ["exercise"]),

    ("md", """## 易错点清单

- drop / rename 返回新表，不接返回值等于没做；
- astype 遇 NaN / 脏字符直接崩：缺失用 `"Int64"`，脏文本用 `to_numeric(errors="coerce")`；
- 链式赋值 `df[条件][列] = 值` 触发 SettingWithCopyWarning 且可能不生效；
- 规范：写回用 `df.loc[条件, 列] = 值`，独立分析用 `.copy()`；
- 新列长度自动对齐，但**别用循环拼列表再赋值**——能向量化就向量化。""", []),

    ("md", """## 本章小结

- 增删改列三板斧：赋值增列、drop 删列、rename 重命名——方法都返回新表。
- 类型转换分级：干净的 astype，脏的 to_numeric(coerce)，缺失转 Int64。
- SettingWithCopyWarning 的两个规范解法（loc / copy）必须形成肌肉记忆。
- 下一章：处理数据的“不完美”——缺失、重复与异常值。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 21.1 参考答案
import pandas as pd

df = pd.DataFrame({
    "summary": ["咖啡", "地铁", "耳机", "电影"],
    "amount": [18.0, 4.0, 399.0, 45.0],
    "temp": [1, 0, 0, 1],
})
df["is_big"] = df["amount"] >= 100
df = df.drop(columns=["temp"])
print(df.columns.tolist())""", ["solution"]),

    ("code", """\
# 练一练 21.2 参考答案
import pandas as pd

df = pd.DataFrame({"raw": ["88元", "12.5元", "N/A", "300元", ""]})

df["amount"] = pd.to_numeric(
    df["raw"].str.replace("元", "", regex=False), errors="coerce")
print(df["amount"].sum(), df["amount"].isna().sum())

print(df["amount"].round().astype("Int64"))""", ["solution"]),

    ("code", """\
# 练一练 21.3 参考答案
import pandas as pd

df = pd.DataFrame({
    "category": ["餐饮", "交通", "数码", "娱乐"],
    "amount": [25.5, 4.0, 399.0, 45.0],
})

# 反例原样运行会看到 SettingWithCopyWarning，且 df 没有 level 列。

df.loc[df["amount"] > 100, "level"] = "重点"
df["level"] = df["level"].fillna("普通")
print(df)

big_df = df[df["amount"] > 100].copy()
big_df["note"] = "分析用"
print("原表不受影响:", "note" not in df.columns)""", ["solution"]),
]
