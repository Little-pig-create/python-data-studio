"""第2章 变量、数据类型与运算符"""

TITLE = "变量、数据类型与运算符"
EST_MINUTES = 50

CELLS = [
    ("md", """\
# 第2章 变量、数据类型与运算符

上一章你已经能把 Python 当计算器。这一章解决记账程序的第一批真问题：

- 一笔账有**金额、数量、是否会员**好几种信息，分别该用什么类型存？
- "满 300 减 30"这种规则怎么写成代码？
- 金额为什么不能当字符串处理？

贯穿本章的主线：**用变量把一笔订单算清楚**。""", []),

    ("md", """\
## 学习目标

学完本章，你能够：

- 为数据选择正确的类型（int / float / str / bool / None），并用 `type()` 验证；
- 把复杂计算拆成有名字的中间变量，而不是堆在一行；
- 用比较和逻辑运算符把"满减、包邮、有效订单"等业务规则写成布尔表达式；
- 说出至少三个类型相关的常见错误及修法。""", []),

    ("md", """\
## 2.1 变量：名字指向值

**概念**：变量就是给数据起的**名字**。执行 `quantity = 2` 后，名字 `quantity`
指向整数 2。名字好比标签，值是被贴的内容——换内容不用换标签，这就是
**动态类型**：Python 不预先声明类型，类型由赋值时右边的值决定。

命名规则：字母/数字/下划线组成、不能以数字开头、不能用关键字（`if`、`for` 等）。
更重要的是**业务可读性**：`unit_price`（单价）优于 `up`。""", []),

    ("md", "### 例 1｜最小例子：赋值与重新赋值", []),

    ("code", """\
quantity = 2
print(quantity)   # 输出 2

quantity = 3      # 重新赋值：quantity 现在指向 3
print(quantity)   # 输出 3""", ["example"]),

    ("md", """\
**输出解读**：同一个名字先后指向两个值，以最后一次赋值为准——和第 1 章讲的
"运行顺序"是同一个原理。""", []),

    ("md", "### 例 2｜业务例子：一笔订单的完整档案", []),

    ("code", """\
product = "机械键盘"      # str：商品名
quantity = 2              # int：数量
unit_price = 299.0        # float：单价（元）
is_member = True          # bool：是否会员
coupon = None             # None：本期无优惠券

print(product, quantity, unit_price, is_member, coupon)""", ["example"]),

    ("md", """\
**输出解读**：一笔订单的五个字段各得其所。`None` 表示"这里刻意为空"，
后面学到条件判断时会用 `is None` 检查它。

### 例 3｜常见错误：把类型想当然""", []),

    ("code", """\
# 反例 1：以为输入的 "2" 是数字
quantity_text = "2"
# print(quantity_text + 1)        # TypeError: 字符串不能和整数相加
print(type(quantity_text).__name__)  # 输出 str —— 引号里的 2 是文字！

# 反例 2：变量名以数字开头
# 2nd_order = 88                  # SyntaxError: 名字不能以数字开头

# 修复：需要计算就显式转换类型
quantity = int(quantity_text)
print(quantity + 1)               # 输出 3""", ["example"]),

    ("md", """\
**要点**：**带引号的就是字符串**，哪怕内容看起来是数字。判断不确定时，
一句 `print(type(x).__name__)` 比猜快得多。""", []),

    ("md", """\
## 2.2 类型转换：str、int、float

**概念**：三种常用转换——
`int(x)` 转整数、`float(x)` 转浮点数、`str(x)` 转字符串。
从**字符串**转数字是最常见的场景：用户输入、CSV 读来的数据都是字符串，
要计算必须先转换。""", []),

    ("md", "### 例 1｜最小例子：三种转换的样子", []),

    ("code", """\
print(int("42") + 1)      # 43：字符串转整数后才能算
print(float("3.5") * 2)   # 7.0
print(str(100) + " 元")   # 100 元：数字转字符串后才能拼接""", ["example"]),

    ("md", "### 例 2｜业务例子：小票上的金额是文字", []),

    ("code", """\
# 小票机吐出来的原始数据都是字符串
raw_subtotal = "384.00"
raw_discount = "30"

subtotal = float(raw_subtotal)
discount = float(raw_discount)
payable = subtotal - discount
print("应付:", payable, "元")        # 输出 应付: 354.0 元
print("应付: " + str(payable) + " 元")  # 拼接版，输出相同""", ["example"]),

    ("md", """\
**输出解读**：同一件事的两种写法——`print(a, b)` 自动加空格，谁都不用转；
`+` 拼接则必须先把数字 `str()` 成字符串。日常推荐逗号写法，少一次转换。

### 例 3｜常见错误：转换失败与四舍五入误会""", []),

    ("code", """\
# 反例 1：字符串里带文字，int() 直接失败
# int("12 元")     # ValueError: invalid literal for int() ...

# 反例 2：round 的"四舍五入"遇到 .5 不总是进位（浮点存储所致）
print(round(2.675, 2))   # 输出 2.67 而不是 2.68！

# 修复思路 1：转换前先清洗文字（去单位、去空格）
raw = "12 元"
amount = int(raw.replace("元", "").strip())
print(amount)            # 输出 12

# 修复思路 2：金额展示一般先乘 100 化整（分）再算，第 9 章会展开""", ["example"]),

    ("md", """\
**要点**：`int()`/`float()` 只认"干净的数字字样"；`round()` 对 .5 的行为
受浮点二进制表示影响，涉及钱的精确计算时不要依赖它。""", []),

    ("md", """\
## 2.3 算术运算符与中间变量

**概念**：七个算术运算符——`+ - * /`（真除法，结果是 float）、
`//`（整除取商）、`%`（取余数）、`**`（幂）。
真正重要的是**拆步骤**：复杂公式拆成有名字的中间变量，
每步只表达一个业务口径，出错能定位。""", []),

    ("md", "### 例 1｜最小例子：除法三兄弟", []),

    ("code", """\
minutes = 135
print(minutes / 60)    # 2.25  真除法：保留小数
print(minutes // 60)   # 2     整除：只要商
print(minutes % 60)    # 15    取余：剩下 15 分钟
print(2 ** 10)         # 1024  幂运算""", ["example"]),

    ("md", "### 例 2｜业务例子：把“满 300 减 30”拆成三步", []),

    ("code", """\
unit_price = 128.0
quantity = 3

subtotal = unit_price * quantity          # 口径 1：小计
discount = 30.0 if subtotal >= 300 else 0.0  # 口径 2：满减（第 8 章细讲 if）
payable = subtotal - discount             # 口径 3：应付

print(subtotal, discount, payable)        # 输出 384.0 30.0 354.0""", ["example"]),

    ("md", """\
**输出解读**：三个中间变量对应三个业务口径。如果最后应付金额不对，
你只需逐个检查这三步——这比在一行长公式里找错容易十倍。

### 例 3｜常见错误：一行堆公式 + 除零""", []),

    ("code", """\
# 反例 1：一行堆公式，错了没法定位
# payable = 128.0 * 3 - (30.0 if 128.0 * 3 >= 300 else 0.0)

# 反例 2：除数为 0
quantity = 0
# print(subtotal / quantity)   # ZeroDivisionError: division by zero

# 修复：除法前检查分母（第 8 章学 if 后可以优雅处理）
if quantity > 0:
    print(subtotal / quantity)
else:
    print("数量为 0，无法计算均价")""", ["example"]),

    ("md", """\
**要点**：`/` 和 `//` 的分母都不能为 0。写除法前先问自己：
**这个分母有没有可能是 0？**""", []),

    ("md", """\
## 2.4 比较与逻辑运算：把规则写成 True / False

**概念**：比较运算符 `> >= < <= == !=` 的结果是布尔值 `True` / `False`。
逻辑运算符 `and`（且）、`or`（或）、`not`（非）负责组合规则。
**先保存单个规则为布尔变量，再组合**——这是写复杂规则的口诀。""", []),

    ("md", "### 例 1｜最小例子：== 是比较，= 是赋值", []),

    ("code", """\
x = 5            # 赋值：把 5 交给 x
print(x == 5)    # True：== 在比较
print(x != 5)    # False
print(3 < x < 10)  # True：链式比较，Python 特色""", ["example"]),

    ("md", "### 例 2｜业务例子：包邮、审核、有效订单三条规则", []),

    ("code", """\
payable = 354.0
unit_price = 128.0
quantity = 3

free_shipping = payable >= 300          # 满 300 包邮
needs_review = payable >= 5000 or quantity >= 20   # 大额或大批量需人工审核
valid_order = unit_price > 0 and quantity > 0      # 金额数量都为正才有效

print(free_shipping, needs_review, valid_order)   # 输出 True False True""", ["example"]),

    ("md", """\
**输出解读**：三条规则各自一个布尔变量，读代码像读业务制度。
把它们组合起来才有意义，例如"有效且包邮才自动通过"：

### 例 3｜常见错误：把 == 写成 =，以及 == None""", []),

    ("code", """\
payable = 354.0

# 反例 1：把比较写成赋值（SyntaxError，Python 会直接拦下）
# if payable = 0:      # SyntaxError —— 比较必须用 ==

# 反例 2：判断"空"用 == None 能跑，但规范写法是 is None
coupon = None
print(coupon == None)    # True，但不推荐
print(coupon is None)    # True，推荐写法

# 反例 3：浮点数用 == 比较
print(0.1 + 0.2 == 0.3)  # False！浮点误差
print(abs(0.1 + 0.2 - 0.3) < 1e-9)  # True：正确做法是比差值""", ["example"]),

    ("md", """\
**要点**：
- `=` 是赋值，`==` 才是比较；
- 判空用 `is None`；
- 浮点数别用 `==` 判相等，比较差值是否足够小。""", []),

    ("md", """\
## 2.5 工具速查""", []),

    ("md", """\
| 工具/运算符 | 用途 | 示例 |
| --- | --- | --- |
| `int()` / `float()` / `str()` | 类型转换 | `float("35.5")` → 35.5 |
| `type(x).__name__` | 查看类型名 | `type(3).__name__` → 'int' |
| `abs()` | 绝对值 | `abs(-18)` → 18 |
| `round(x, n)` | 舍入到 n 位 | `round(35.567, 2)` → 35.57 |
| `divmod(a, b)` | 同时得商和余 | `divmod(135, 60)` → (2, 15) |
| `is None` | 判断空值 | `coupon is None` |
| `+=` `-=` `*=` | 更新自身 | `total += 18` 等价 `total = total + 18` |""", []),

    ("md", """\
## 综合练习

完成下面 4 题。每题都给出了数据脚手架（已定义好输入），你只需补全 `TODO` 处。
**建议先自己写完再看章末参考答案。**""", []),

    ("md", "### 练一练 2.1：补全会员价计算", ["exercise"]),

    ("code", """\
# 会员 9 折，非会员原价；折扣只能作用于单价，不能作用于配送费
unit_price = 299.0
shipping = 12.0
is_member = True

# TODO 1：算出折后单价 member_price（会员打 0.9，非会员原价）
# TODO 2：算出应付 payable = member_price + shipping
# TODO 3：打印 payable""", ["exercise"]),

    ("md", "### 练一练 2.2：字符串金额求和", ["exercise"]),

    ("code", """\
# 三张小票的金额都是字符串
receipts = ["128.50", "36.00", "212.80"]

# TODO：把三个字符串都转成 float 并求和，打印总金额""", ["exercise"]),

    ("md", "### 练一练 2.3：把制度翻译成布尔表达式", ["exercise"]),

    ("code", """\
# 公司报销制度：
# 规则 A：单笔金额超过 1000 需要开发票
# 规则 B：金额为负的记录无效
amount = 1250.0

# TODO 1：need_invoice = ...（规则 A）
# TODO 2：is_valid = ...（规则 B 的否定）
# TODO 3：打印两个布尔值""", ["exercise"]),

    ("md", "### 练一练 2.4：整除与取余", ["exercise"]),

    ("code", """\
# 会员积分 251 分，每 50 分兑换 1 元券，求能换几张券、剩几分
points = 251

# TODO：用 // 和 % 一次算出 coupons（张）和 remaining（分），打印两者""", ["exercise"]),

    ("md", """\
## 易错点清单

- 带引号的数字是字符串，`"2" + 1` 报 TypeError；
- `=` 与 `==` 混用；
- 浮点数用 `==` 判相等（`0.1 + 0.2 == 0.3` 是 False）；
- `/`、`//` 忘查分母是否可能为 0；
- `int("12 元")` 这类带文字的转换直接 ValueError，转换前先清洗；
- 变量名起得看不懂（`a1`、`tmp2`），一周后自己都读不懂。""", []),

    ("md", """\
## 本章小结

- 五种基本类型各有分工：int 计数、float 金额、str 文本、bool 规则、None 空占位。
- 转换是日常操作：字符串进、数字算、字符串出（展示）。
- 复杂计算拆成有名字的中间变量，每步一个业务口径。
- 业务规则 = 比较运算符 + and/or/not，先存单条规则再组合。
- 下一章处理记账文本：字符串的常用操作。""", []),

    ("md", """\
## 参考答案""", []),

    ("code", """\
# 练一练 2.1 参考答案
unit_price = 299.0
shipping = 12.0
is_member = True

member_price = unit_price * 0.9 if is_member else unit_price
payable = member_price + shipping
print(payable)   # 输出 281.1""", ["solution"]),

    ("code", """\
# 练一练 2.2 参考答案
receipts = ["128.50", "36.00", "212.80"]

total = float(receipts[0]) + float(receipts[1]) + float(receipts[2])
print(total)     # 输出 377.3
# 进阶写法（第 9 章循环后可回顾）：
# total = sum(float(r) for r in receipts)""", ["solution"]),

    ("code", """\
# 练一练 2.3 参考答案
amount = 1250.0

need_invoice = amount > 1000
is_valid = not amount < 0
print(need_invoice, is_valid)   # 输出 True True""", ["solution"]),

    ("code", """\
# 练一练 2.4 参考答案
points = 251

coupons = points // 50
remaining = points % 50
print(coupons, remaining)   # 输出 5 1""", ["solution"]),
]
