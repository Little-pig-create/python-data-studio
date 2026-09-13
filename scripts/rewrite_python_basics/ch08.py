"""第8章 条件判断：把规则写清楚"""

TITLE = "条件判断：把规则写清楚"
EST_MINUTES = 50

CELLS = [
    ("md", """\
# 第8章 条件判断：把规则写清楚

第 2 章你已经能把“满 300 包邮”写成布尔表达式，但它只会算出 True / False——
**程序还得据此做不同的事**：包邮就免运费，不包邮加 8 块。

这就是**条件分支**。学完本章，你的记账程序开始“按制度办事”。""", []),

    ("md", """\
## 学习目标

学完本章，你能够：

- 写出 if / elif / else 三段式，说清缩进的语法地位；
- 把一条业务制度翻译成一串分支，并保证条件顺序正确；
- 用 `and` / `or` / `not` 组合条件，避免重复的嵌套；
- 说出三个经典坑：`=` 与 `==`、缩进错误、条件顺序覆盖。""", []),

    ("md", """\
## 8.1 if / elif / else 三段式

**概念**：条件分支的完整结构：

```python
if 条件A:          # A 成立时执行
    ...
elif 条件B:        # A 不成立且 B 成立时执行
    ...
else:              # 前面全不成立时执行
    ...
```

三个要点：**冒号结尾、缩进 4 空格、自上而下命中即停**。
缩进不是排版风格，是语法本身——Python 靠缩进划分代码块。""", []),

    ("md", "### 例 1｜最小例子：及格判断", []),

    ("code", """\
score = 58

if score >= 60:
    print("及格")
else:
    print("不及格")""", ["example"]),

    ("md", "### 例 2｜业务例子：会员折扣三档", []),

    ("code", """\
is_member = True
payable = 354.0

if not is_member:
    final = payable            # 非会员原价
elif payable >= 300:
    final = payable * 0.9      # 会员且满 300：9 折
else:
    final = payable            # 会员但没到 300：原价

print(f"会员={is_member} 应付={payable} 实付={final:.1f}")""", ["example"]),

    ("md", """\
**输出解读**：`final = 318.6`。注意分支顺序：先用 `not is_member` 拦下非会员，
再判断满减——分支是**自上而下命中即停**，顺序就是业务逻辑。

### 例 3｜常见错误：缩进错误三连""", []),

    ("code", """\
payable = 120.0

# 反例 1：漏了冒号
# if payable > 100
#     print("大额")        # SyntaxError: expected ':'

# 反例 2：缩进不一致（混用空格数量）
# if payable > 100:
#   print("大额")           # 有些编辑器能跑，团队里是事故源头
#     print("需审核")       # IndentationError

# 反例 3：该缩进没缩进
# if payable > 100:
# print("大额")            # IndentationError: expected an indented block

# 正确写法
if payable > 100:
    print("大额")
    print("已记录")""", ["example"]),

    ("md", """\
**要点**：统一用 **4 个空格**缩进（课程代码全部如此）。
报 `IndentationError` 时先检查缩进，报 `expected ':'` 时检查冒号。""", []),

    ("md", """\
## 8.2 条件顺序：从特殊到一般

**概念**：多分支**只会命中一个**。所以条件要按
**特殊 → 一般** 排列；反过来（一般在前）会提前命中、
把后面的特殊分支永远挡住——这是条件判断第一大逻辑 bug。""", []),

    ("md", "### 例 1｜反例与修复：满减与折扣的顺序事故", []),

    ("code", """\
amount = 500.0

# 反例：一般条件挡在前
# if amount > 100:
#     level = "普通折扣"
# elif amount > 300:
#     level = "大额优惠"     # 永远执行不到！500 已经被上面截胡
# print(level)

# 修复：特殊在前
if amount > 300:
    level = "大额优惠"
elif amount > 100:
    level = "普通折扣"
else:
    level = "无折扣"
print(level)""", ["example"]),

    ("md", """\
**自检方法**：把边界值（100、101、300、301）代进去**心算一遍每个分支**，
确认 500 走大额、250 走普通、80 走无折扣。""", []),

    ("md", "### 例 2｜业务例子：金额分级审核", []),

    ("code", """\
# 制度：>=5000 财务总监审；>=1000 财务审；>=100 主管审；其余免审
amount = 1250.0

if amount >= 5000:
    reviewer = "财务总监"
elif amount >= 1000:
    reviewer = "财务"
elif amount >= 100:
    reviewer = "主管"
else:
    reviewer = "免审"

print(f"{amount} 元 -> {reviewer} 审核")""", ["example"]),

    ("md", """\
### 例 3｜常见错误：用 if 堆叠代替 elif

如果每个分支是独立的 `if`（而非 `elif`），多个条件会**依次全部判断**，
可能出现“审了一轮还被改判”的怪现象。""", []),

    ("code", """\
amount = 5000.0

# 反例：连续 if 各自独立，低门槛分支也会执行
# if amount >= 100:
#     reviewer = "主管"
# if amount >= 1000:
#     reviewer = "财务"       # 覆盖了上一行
# if amount >= 5000:
#     reviewer = "财务总监"   # 最终侥幸正确，但纯属巧合
# print(reviewer)

# 修复：互斥判断必须用 elif 串联
if amount >= 5000:
    reviewer = "财务总监"
elif amount >= 1000:
    reviewer = "财务"
elif amount >= 100:
    reviewer = "主管"
else:
    reviewer = "免审"
print(reviewer)""", ["example"]),

    ("md", """\
**要点**：**“多选一”用 if/elif/else；每个 if 独立成立时才并列 if。**
看到一串 if 想不想“互斥”，是审自己代码的固定动作。""", []),

    ("md", """\
## 8.3 组合条件：and、or、not 与优先级

**概念**：能用一个表达式说清的就别拆两层。
`and` 全真才真、`or` 一真即真、`not` 取反。
**比较运算优先于 and/or**，所以 `a < b and c < d` 可以直接写；
不确定就加括号，可读性永远优先。""", []),

    ("md", "### 例 1｜最小例子：真值组合", []),

    ("code", """\
print(True and False)    # False
print(True or False)     # True
print(not True)          # False
print(3 < 5 and 5 < 9)   # True：比较先算，再 and""", ["example"]),

    ("md", "### 例 2｜业务例子：一张券能不能用", []),

    ("code", """\
# 券的使用条件：金额满 50、品类是餐饮、且不是会员日
amount = 88.0
category = "餐饮"
member_day = False

can_use = amount >= 50 and category == "餐饮" and not member_day
print("可用" if can_use else "不可用")""", ["example"]),

    ("md", "### 例 3｜常见错误：比较写一半 / or 逻辑想当然", []),

    ("code", """\
amount = 88.0
category = "交通"

# 反例 1：数学写法不成立
# if 50 <= amount == 88:        # 能跑但含义不是你想要的，别这么写
#     pass

# 反例 2：想表达“是餐饮或交通”写成下面的样子——永远为真！
# if category == "餐饮" or "交通":    # "交通" 是非空字符串，恒为 True
#     print("优惠品类")
# print(category == "餐饮" or "交通") # 输出 '交通'，不是布尔

# 修复：or 两边都要写完整的比较
if category == "餐饮" or category == "交通":
    print("优惠品类")

# 更地道的写法：in + 集合（第 7 章）
if category in {"餐饮", "交通"}:
    print("优惠品类")""", ["example"]),

    ("md", """\
**要点**：
- `category == "餐饮" or "交通"` 是新手第一大条件 bug，or 两边必须是完整比较；
- “属于其中之一”优先写 `x in {...}`。""", []),

    ("md", """\
## 8.4 嵌套与卫语句

**概念**：条件套条件（嵌套）超过两层，读的人就开始迷路。
惯用解法是**卫语句（提前返回/提前排除）**：先把不满足的情况逐个拦下，
主逻辑保持平铺。本章先用布尔短路演示，学到函数后（第 10 章）用 return 实现。""", []),

    ("md", "### 例 1｜反例与修复：两层嵌套压成一层", []),

    ("code", """\
record = {"amount": 88.0, "category": "餐饮", "has_receipt": False}

# 反例：嵌套两层，主逻辑藏在最里面
# if record["category"] == "餐饮":
#     if record["amount"] > 50:
#         if record["has_receipt"]:
#             print("可报销")

# 修复：and 合并，平铺一层
if (
    record["category"] == "餐饮"
    and record["amount"] > 50
    and record["has_receipt"]
):
    print("可报销")
else:
    print("不满足报销条件")""", ["example"]),

    ("md", """\
**输出解读**：`不满足报销条件`（没有发票）。三个条件纵向排列各占一行，
是团队代码的常见风格——以后加第四个条件不会破坏结构。""", []),

    ("md", """\
## 综合练习""", []),

    ("md", "### 练一练 8.1：运费规则", ["exercise"]),

    ("code", """\
# 制度：实付满 99 包邮；不满 99 收 8 元运费；会员不满 99 只收 4 元
payable = 66.0
is_member = True

# TODO：用 if/elif/else 算出 shipping（运费），打印实付总额 payable + shipping""", ["exercise"]),

    ("md", "### 练一练 8.2：修好顺序事故", ["exercise"]),

    ("code", """\
amount = 350.0

# 下面的分支顺序有 bug：350 应该命中“大额优惠”。
# TODO：调整分支顺序并补全 else，使 350 -> 大额优惠、150 -> 普通折扣、80 -> 无折扣
# if amount > 100:
#     level = "普通折扣"
# elif amount > 300:
#     level = "大额优惠""", ["exercise"]),

    ("md", "### 练一练 8.3：翻译报销制度", ["exercise"]),

    ("code", """\
# 制度原文：
#   餐饮类单笔超过 200 且有发票 -> 可报销；
#   交通类一律可报销（不限金额，不需要发票）；
#   其余一律不可报销。
record = {"category": "交通", "amount": 8.0, "has_receipt": False}

# TODO：把制度写成 if/elif/else，打印 “可报销” 或 “不可报销”
# 要求：条件里用 in {"餐饮", "交通"} 的写法至少出现一次""", ["exercise"]),

    ("md", """\
## 易错点清单

- `if x = 5:`（赋值当比较）直接 SyntaxError；
- 缩进必须统一 4 空格；漏冒号、漏缩进是两大 IndentationError 来源；
- 条件顺序错误：一般条件挡住特殊条件，边界值心算自检；
- `category == "餐饮" or "交通"` 恒真，or 两边要写完整比较；
- 多选一用了并列 if 而不是 elif。""", []),

    ("md", """\
## 本章小结

- if/elif/else 自上而下命中即停；缩进即语法。
- 条件从特殊到一般排列；多选一必须 elif。
- 布尔组合：and/or/not，比较两边写完整，`in {...}` 更地道。
- 你的记账程序现在能按制度自动判断了。
- 下一章：几十笔账逐个判断——循环。""", []),

    ("md", """\
## 参考答案""", []),

    ("code", """\
# 练一练 8.1 参考答案
payable = 66.0
is_member = True

if payable >= 99:
    shipping = 0.0
elif is_member:
    shipping = 4.0
else:
    shipping = 8.0

print(f"运费 {shipping} 元，实付 {payable + shipping:.1f} 元")""", ["solution"]),

    ("code", """\
# 练一练 8.2 参考答案
amount = 350.0

if amount > 300:
    level = "大额优惠"
elif amount > 100:
    level = "普通折扣"
else:
    level = "无折扣"
print(level)""", ["solution"]),

    ("code", """\
# 练一练 8.3 参考答案
record = {"category": "交通", "amount": 8.0, "has_receipt": False}

if record["category"] in {"交通"}:
    print("可报销")
elif record["category"] == "餐饮" and record["amount"] > 200 and record["has_receipt"]:
    print("可报销")
else:
    print("不可报销")""", ["solution"]),
]
