"""第3章 字符串：从文本到字段"""

TITLE = "字符串：从文本到字段"
EST_MINUTES = 50

CELLS = [
    ("md", """\
# 第3章 字符串：从文本到字段

记账数据里最常见的就是文本：小票摘要、类别名、备注。这一章学会：

- 取出字符串里的一段（索引与切片）；
- 用 `f-string` 把数字拼进一句话；
- 清洗脏文本：去空格、替换单位、拆字段。

主线任务：**把一行原始记账文本“午餐 25.5元”清洗成可计算的字段**。""", []),

    ("md", """\
## 学习目标

学完本章，你能够：

- 用索引和切片取字符串的任意片段，说清“含头不含尾”；
- 用 f-string 拼出带金额的报表句子；
- 组合 `strip()`、`replace()`、`split()`、`startswith()` 完成一次真实的文本清洗；
- 避免字符串的三个经典坑：不可变性、索引越界、中文标点。""", []),

    ("md", """\
## 3.1 索引与切片：取出你要的那一段

**概念**：字符串是一串有序的字符，每个字符有编号（从 0 开始）。
`s[i]` 取第 i 个字符；`s[start:stop]` 取一段，**含头不含尾**；
负数索引从尾部数，`s[-1]` 是最后一个字符。""", []),

    ("md", "### 例 1｜最小例子：数到第四个字母", []),

    ("code", """\
word = "Python"
print(word[0])     # P：第一个字符的编号是 0
print(word[-1])    # n：负数从尾数
print(word[0:3])   # Pyt：含头（0）不含尾（3）
print(word[3:])    # hon：省略 stop 表示取到末尾""", ["example"]),

    ("md", "### 例 2｜业务例子：从账目编号里取月份", []),

    ("code", """\
record_id = "BILL-20260812-001"

print(record_id[5:9])    # 2026：年份
print(record_id[9:11])   # 08：月份
print(record_id[-3:])    # 001：流水号
print(record_id.startswith("BILL"))  # True：常用来筛账单类型""", ["example"]),

    ("md", """\
**输出解读**：`BILL-20260812-001` 的结构是 `前缀-年月日-流水号`。
切片按位置“切香肠”，前提是你知道格式固定——真实数据里格式会变，
所以下一节先清洗再切片。

### 例 3｜常见错误：越界与“含头不含尾”记反""", []),

    ("code", """\
word = "Python"

# 反例 1：索引越界
# print(word[6])    # IndexError: 字符串长度是 6，最大索引是 5
print(len(word))     # 6：先查长度再取

# 反例 2：以为 word[2:4] 会取 3 个字符
print(word[2:4])     # th：只有 2 个，含头不含尾
print(word[2:5])     # tho：想要包含 4 号位（2 到 4，含 4）""", ["example"]),

    ("md", """\
**要点**：`s[a:b]` 永远不含 `b` 位置的字符。想含哪位，stop 就写那位 + 1。
越界只发生在**单字符索引** `s[i]`；切片 `s[3:100]` 越过末尾不会报错，只会取到末尾。""", []),

    ("md", """\
## 3.2 f-string：把数字拼进句子

**概念**：f-string 是在引号前加 `f` 的字符串，花括号 `{}` 里可以直接放变量和表达式，
还能控制小数位数：`{x:.2f}` 表示保留两位小数。这是展示金额的标准写法。""", []),

    ("md", "### 例 1｜最小例子：三种拼接对比", []),

    ("code", """\
name = "午餐"
amount = 25.5

print("今天" + name + "花了" + str(amount) + "元")  # 拼接：每个数字都要 str()
print("今天", name, "花了", amount, "元")            # 逗号：自动加空格
print(f"今天{name}花了{amount}元")                   # f-string：最自然""", ["example"]),

    ("md", "### 例 2｜业务例子：生成一条账目摘要", []),

    ("code", """\
category = "餐饮"
amount = 25.5
budget = 1500.0
used_ratio = amount / budget

print(f"[{category}] 支出 {amount:.2f} 元")
print(f"本月餐饮预算 {budget:.0f} 元，本笔占比 {used_ratio:.1%}")
# :.2f 保留两位小数；:.0f 不留小数；:.1% 自动乘 100 加百分号""", ["example"]),

    ("md", """\
**输出解读**：`[餐饮] 支出 25.50 元`、`本月餐饮预算 1500 元，本笔占比 1.7%`。
格式化mini语法值得背下来：`.2f`（两位小数）、`.0f`（整数）、`.1%`（百分比）。

### 例 3｜常见错误：忘了 f、忘了引号配对""", []),

    ("code", """\
amount = 25.5

# 反例 1：写了花括号却忘了 f
print("{amount} 元")     # 原样输出 {amount} 元，不报错但不对

# 正确：
print(f"{amount} 元")    # 25.5 元

# 反例 2：句子里有引号时内外同种引号冲突
# print(f"他说"今天花了{amount}"")   # SyntaxError
# 修复：外面用单引号或三引号
print(f'他说"今天花了{amount}"')""", ["example"]),

    ("md", """\
**要点**：忘了 `f` 不报错、只是原样输出——这种“安静的错误”比报错更危险，
检查输出时留意花括号有没有被原样打印。""", []),

    ("md", """\
## 3.3 清洗文本：strip、replace、split、in

**概念**：四个高频方法——
`strip()` 去两端空白；`replace(old, new)` 替换；`split(sep)` 按分隔符拆成列表；
`in` 判断子串是否存在。字符串方法**返回新字符串，不改动原字符串**（不可变性）。""", []),

    ("md", "### 例 1｜最小例子：每个方法干一件事", []),

    ("code", """\
raw = "  coffee  "
print(raw.strip())          # coffee：去两端空格
print(raw.replace("f", "F"))  #  coFFee：全量替换
print("a,b,c".split(","))   # ['a', 'b', 'c']：拆成列表
print("cat" in "scatter")   # True：子串判断""", ["example"]),

    ("md", "### 例 2｜业务例子：清洗一行原始账目", []),

    ("code", """\
# 从微信账单导出的一行：摘要、类别、金额（金额带单位）
raw_line = "  午餐-黄焖鸡 | 餐饮 | 25.5元  "

fields = raw_line.strip().split("|")
summary = fields[0].strip()
category = fields[1].strip()
amount = float(fields[2].replace("元", "").strip())

print(f"摘要={summary} 类别={category} 金额={amount}")
print(f"清洗后可计算：{amount * 2:.1f}")   # 金额已是数字，可以运算""", ["example"]),

    ("md", """\
**输出解读**：`摘要=午餐-黄焖鸡 类别=餐饮 金额=25.5`。
清洗套路固定：**strip 去边 → split 拆列 → 逐列清洗**（数字列去掉单位再 float）。

### 例 3｜常见错误：以为方法会修改原字符串""", []),

    ("code", """\
raw = "  25.5元  "

# 反例：调了方法却没用返回值
raw.strip()
raw.replace("元", "")
# print(float(raw))    # ValueError：raw 还是带空格带单位的原字符串！

# 修复：方法返回新值，必须接住
raw = raw.strip().replace("元", "")
amount = float(raw)
print(amount * 2)        # 51.0""", ["example"]),

    ("md", """\
**要点**：`x.strip()` 单独一行什么也改变不了。要么 `x = x.strip()`，
要么直接用返回值 `float(raw.strip())`。""", []),

    ("md", """\
## 3.4 其他高频操作

**概念**：再记四个，覆盖九成日常——
`len(s)` 长度；`s.upper()` / `s.lower()` 大小写（对中文无效果）；
`s.find(sub)` 子串位置（找不到返回 -1）；
多行文本用三引号字符串。""", []),

    ("md", "### 例 1｜最小例子 + 业务例子：汇总小票抬头", []),

    ("code", """\
print(len("账单"))            # 2：中文按字符数
print("ABC".lower())          # abc：统一小写便于比较
print("订单已取消".find("取消"))  # 3：返回起点位置

# 业务：多行模板生成月度小结
month = "2026-08"
total = 1024.5
report = f'''【个人记账小结】
月份：{month}
总支出：{total:.2f} 元'''
print(report)""", ["example"]),

    ("md", "### 例 2｜常见错误：find 的 -1 与大小写敏感", []),

    ("code", """\
note = "NO refund"

# 反例 1：忽略 find 找不到时返回 -1，把它当索引用
pos = note.find("REFUND")    # 找不到，返回 -1
print(pos)                   # -1
# print(note[pos])           # 反例：note[-1] 取到 d，静默出错！

# 反例 2：大小写敏感导致找不到
print(note.find("refund"))   # 3：小写找得到
print(note.find("Refund"))   # -1：大写 R 找不到

# 修复：先判断再使用
if note.lower().find("refund") >= 0:
    print("这笔账有退款标记")""", ["example"]),

    ("md", """\
## 综合练习""", []),

    ("md", "### 练一练 3.1：解析账单编号", ["exercise"]),

    ("code", """\
record_id = "BILL-20260915-042"

# TODO 1：切片取出日期部分 "20260915"，存入 date_part
# TODO 2：切片取出流水号 "042"，存入 serial
# TODO 3：用 f-string 打印：2026-09-15 第 042 号账目""", ["exercise"]),

    ("md", "### 练一练 3.2：清洗导出行", ["exercise"]),

    ("code", """\
raw_line = "  打车-机场快线 | 交通 | 88.0元  "

# TODO：仿照本章例 2 的三步清洗，打印
# 摘要=打车-机场快线 类别=交通 金额=88.0
# 以及“两倍金额”的打印结果 176.0""", ["exercise"]),

    ("md", "### 练一练 3.3：生成周报句子", ["exercise"]),

    ("code", """\
week = 37
total = 654.3
budget = 800.0

# TODO：用一条 f-string print 输出（保留 1 位小数、含百分号）：
# 第 37 周支出 654.3 元，占预算 81.8%""", ["exercise"]),

    ("md", """\
## 易错点清单

- 索引从 0 开始；`s[a:b]` 不含 b 位；
- 切片越界不报错但单字符索引越界报 IndexError；
- 字符串方法不改变原字符串，返回值必须接住；
- f-string 忘写 `f`，花括号被原样打印；
- `find` 找不到返回 -1，先判断再用；
- 金额带单位先 `replace` 再 `float`。""", []),

    ("md", """\
## 本章小结

- 切片三件套：`s[i]`、`s[a:b]`、负索引，含头不含尾。
- f-string 是展示金额的标准方式，`.2f` / `.1%` 常用。
- 清洗套路：strip → split → 逐列处理；方法返回新字符串。
- 至此你已能把一行账单文本变成“可计算的字段”。
- 下一章：一条账变多条账——列表。""", []),

    ("md", """\
## 参考答案""", []),

    ("code", """\
# 练一练 3.1 参考答案
record_id = "BILL-20260915-042"

date_part = record_id[5:13]      # "20260915"
serial = record_id[-3:]          # "042"
print(f"{date_part[:4]}-{date_part[4:6]}-{date_part[6:]} 第 {serial} 号账目")
# 输出：2026-09-15 第 042 号账目""", ["solution"]),

    ("code", """\
# 练一练 3.2 参考答案
raw_line = "  打车-机场快线 | 交通 | 88.0元  "

fields = raw_line.strip().split("|")
summary = fields[0].strip()
category = fields[1].strip()
amount = float(fields[2].replace("元", "").strip())

print(f"摘要={summary} 类别={category} 金额={amount}")
print(amount * 2)""", ["solution"]),

    ("code", """\
# 练一练 3.3 参考答案
week = 37
total = 654.3
budget = 800.0

print(f"第 {week} 周支出 {total:.1f} 元，占预算 {total / budget:.1%}")""", ["solution"]),
]
