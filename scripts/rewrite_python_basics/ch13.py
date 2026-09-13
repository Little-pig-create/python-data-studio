"""第13章 异常处理、调试与基础测试"""

TITLE = "异常处理、调试与基础测试"
EST_MINUTES = 55

CELLS = [
    ("md", """\
# 第13章 异常处理、调试与基础测试

程序和人一样会犯错——文件被删了、用户输了文字、金额是负数。
前两章你已经在注释里见过不少“反例会崩”的场景，本章给它们正式的解法：

- **异常处理**：预料之中的意外，用 try/except 接住；
- **调试**：出了没预料到的错，怎么定位；
- **测试**：用 assert 给函数上一道“回归保险”。

学完本章，你的记账助手就能“带病运行也不崩溃”了。""", []),

    ("md", """\
## 学习目标

学完本章，你能够：

- 用 try / except / else / finally 写出兜底逻辑，精准捕获指定异常；
- 说清裸 except 为什么危险；
- 用 print / 最小复现 / 读报错三步定位 bug；
- 用 assert 写基础自检，理解“测试保护重构”。""", []),

    ("md", """\
## 13.1 try / except：接住预料中的意外

**概念**：结构四件套——

```python
try:
    可能出错的代码
except 具体异常 as e:    # 出错时执行；尽量写具体类型
    兜底方案
else:                    # 没出错时执行（可选）
    ...
finally:                 # 无论成败都执行（可选，常做清理）
    ...
```

**只捕获你处理得了的异常**，并且写明具体类型。""", []),

    ("md", "### 例 1｜最小例子：转换失败不再崩溃", []),

    ("code", """\
raw_inputs = ["25.5", "abc", "18"]

for raw in raw_inputs:
    try:
        amount = float(raw)
        print(f"{raw} -> {amount}")
    except ValueError as e:                 # 只接 float() 会抛的 ValueError
        print(f"{raw} 不是数字，已跳过（{e}）")

print("循环完整跑完，程序没有中断")""", ["example"]),

    ("md", "### 例 2｜业务例子：安全读取账本", []),

    ("code", """\
import json
from pathlib import Path

def load_ledger(path):
    '''读账本：文件缺失/损坏都返回空账，程序不崩'''
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print("账本文件不存在，从空账开始")
        return []
    except json.JSONDecodeError:            # 文件在，但内容不是合法 JSON
        print("账本文件损坏，从空账开始（建议先备份原文件）")
        return []

print(load_ledger(Path("不存在的账本.json")))
print(load_ledger(Path("讲义.txt")))""", ["example"]),

    ("md", """\
**输出解读**：两种意外两种话术，都优雅返回空列表。
**一个 try 可以配多个 except**，按类型分别处理——这比笼统的
“出错了”对用户友好得多。

### 例 3｜常见错误：裸 except 吞掉一切""", []),

    ("code", """\
# 反例：except 不写类型，任何错误都被吞掉
def divide_broken(a, b):
    try:
        return a / b
    except:                       # 连拼写错误、键错误都一起吞了
        return None

print(divide_broken(10, 0))       # None：看似安全
result = divide_broken(10, 0)
# print(result + 1)               # NoneType 错误在别处爆发——更难查！

# 修复：精确捕获
def divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        print("除数不能为 0")
        return None

print(divide(10, 0))""", ["example"]),

    ("md", """\
**要点**：裸 `except:` 会把 NameError、拼写错误全部吞掉，
bug 被藏到更远的地方爆发。**永远写具体异常类型**；
拿不准类型时，先故意让代码崩一次，读报错最后一行的类型名。""", []),

    ("md", """\
## 13.2 主动抛错：raise 与参数校验

**概念**：接别人的错是 except，**拒绝不合理输入**是 raise。
函数开头检查参数，不合法就 `raise ValueError("原因")`——
把错误在**离源头最近的地方**暴露出来。""", []),

    ("md", "### 例 1｜业务例子：金额必须为正", []),

    ("code", """\
def add_record(ledger, summary, amount):
    if amount < 0:
        raise ValueError(f"金额不能为负，收到 {amount}")
    ledger.append({"summary": summary, "amount": amount})
    return ledger

ledger = []
ledger = add_record(ledger, "午餐", 25.5)

try:
    add_record(ledger, "退款BUG", -10.0)
except ValueError as e:
    print("拒绝记账:", e)

print(ledger)""", ["example"]),

    ("md", "### 例 2｜常见错误：用 if 静默吞错""", []),

    ("code", """\
# 反例：数据非法也悄悄继续，错误传到统计环节才爆发
def add_record_quiet(ledger, summary, amount):
    if amount < 0:
        return ledger          # 静默忽略，调用方毫无察觉
    ledger.append({"summary": summary, "amount": amount})
    return ledger

records = []
records = add_record_quiet(records, "退款BUG", -10.0)
print(len(records))            # 0：为什么少了？三个月后你想破头

# 要点：能恢复的（文件缺失）用 try；数据非法的用 raise 快速失败。
# “沉默地继续”是最大的 bug 温床。""", ["example"]),

    ("md", """\
## 13.3 调试：三步定位法

**概念**：遇到没预料到的报错（或结果不对），固定流程：

1. **读报错**：最后一行类型 + 指向自己代码的行号；
2. **最小复现**：把出错的输入缩小到几行能稳定复现；
3. **打印中间值**：在关键位置 print 变量的**类型和值**，逐段排除。""", []),

    ("md", "### 例 1｜业务例子：一次完整的排障", []),

    ("code", """\
# 现象：月度统计偶尔崩溃（TypeError）
ledger = [
    {"summary": "午餐", "amount": 25.5},
    {"summary": "手动记账", "amount": "32.0"},   # 手输的一笔成了字符串！
    {"summary": "地铁", "amount": 4.0},
]

# 第 1 步：读报错
# total = sum(r["amount"] for r in ledger)   # TypeError: unsupported operand

# 第 2/3 步：最小复现 + 打印类型，逐段排除
for i, record in enumerate(ledger, start=1):
    amount = record["amount"]
    print(i, record["summary"], type(amount).__name__, amount)""", ["example"]),

    ("md", "### 例 2｜修复与防御并存", []),

    ("code", """\
ledger = [
    {"summary": "午餐", "amount": 25.5},
    {"summary": "手动记账", "amount": "32.0"},
    {"summary": "地铁", "amount": 4.0},
]

total = 0.0
for record in ledger:
    try:
        total += float(record["amount"])    # 统一转 float，兼容手输数据
    except (ValueError, TypeError):
        print(f"跳过坏数据: {record}")

print(f"总支出 {total:.1f} 元")

# 治本：写入端（记账函数）做校验，读取端才能信任数据
# 两者配合，程序才稳。""", ["example"]),

    ("md", """\
**要点**：**读报错 → 最小复现 → 打印中间值**是通用三步。
打印时带上 `type(x).__name__`——“看起来是数字的字符串”
是初学者数据里最常见的埋伏。""", []),

    ("md", """\
## 13.4 assert 与基础测试

**概念**：`assert 条件, "失败说明"` ——条件为假就立刻 AssertionError。
把它用在函数定义旁边，就是**最轻量的测试**：
以后改函数时先跑一遍这些格子，行为没变才放心。
（进阶测试框架 pytest 就是 assert 的全家桶，第 13 章后自修。）""", []),

    ("md", "### 例 1｜业务例子：给核心函数上保险", []),

    ("code", """\
def average(numbers):
    if not numbers:
        return 0.0
    return sum(numbers) / len(numbers)

# 一组“输入 -> 期望输出”的固定用例
assert average([10.0, 20.0, 30.0]) == 20.0
assert average([]) == 0.0
assert abs(average([1.0, 2.0]) - 1.5) < 1e-9

print("average 全部用例通过")""", ["example"]),

    ("md", "### 例 2｜业务例子：账本函数的回归测试", []),

    ("code", """\
def add_record(ledger, summary, amount):
    if amount < 0:
        raise ValueError("金额不能为负")
    ledger.append({"summary": summary, "amount": amount})
    return ledger

# 正常路径
book = add_record([], "午餐", 25.5)
assert len(book) == 1
assert book[0]["amount"] == 25.5

# 异常路径：负数必须报 ValueError
try:
    add_record([], "坏数据", -1.0)
    raise AssertionError("负金额竟然没报错！")
except ValueError:
    pass    # 预期中的异常，测试通过

print("add_record 正常与异常路径均通过")""", ["example"]),

    ("md", """\
### 例 3｜常见错误：拿 assert 做业务校验""", []),

    ("code", """\
# 反例：assert 验证用户输入
def parse(text):
    assert text.isdigit(), "必须是数字"   # Python 可用 -O 关闭 assert！
    return float(text)

print(parse("42"))

# 修复：对外部输入一律 raise
def parse_safe(text):
    if not text.isdigit():
        raise ValueError("必须是数字")
    return float(text)

print(parse_safe("42"))
try:
    parse_safe("4x")
except ValueError as e:
    print("拒绝:", e)""", ["example"]),

    ("md", """\
**要点**：**assert 只用于开发期自检**，生产环境的输入校验用 raise +
try/except。分工：assert 防自己犯蠢，raise 防数据出格。""", []),

    ("md", """\
## 13.5 实战：带防护的账本模块

把 try/except、raise、assert 组装到一起，
这是“个人记账助手 1.0”的最后一块拼图。""", []),

    ("md", "### 例 1｜业务例子：完整防护闭环", []),

    ("code", """\
import json
from pathlib import Path

DATA_FILE = Path("course_output") / "safe_ledger.json"
DATA_FILE.parent.mkdir(exist_ok=True)

def load_ledger(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []
    except json.JSONDecodeError:
        print("警告：账本损坏，已从空账开始")
        return []

def add_record(ledger, summary, amount):
    if not isinstance(amount, (int, float)) or amount <= 0:
        raise ValueError(f"金额必须为正数，收到 {amount!r}")
    ledger.append({"summary": summary, "amount": float(amount)})
    return ledger

def save_ledger(ledger, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(ledger, f, ensure_ascii=False, indent=2)

# --- 自检 ---
book = add_record(load_ledger(DATA_FILE), "午餐", 25.5)
save_ledger(book, DATA_FILE)
assert load_ledger(DATA_FILE)[0]["amount"] == 25.5

try:
    add_record([], "坏", -5.0)
    raise AssertionError("应拒绝负数")
except ValueError:
    pass

print("防护闭环自检通过")
print(f"当前账本 {len(load_ledger(DATA_FILE))} 笔")""", ["example"]),

    ("code", """\
# 清理演示产物
from pathlib import Path
import shutil

demo = Path("course_output")
if demo.exists():
    shutil.rmtree(demo)
    print("已清理 course_output/")
else:
    print("没有需要清理的文件")""", []),

    ("md", """\
## 综合练习""", []),

    ("md", "### 练一练 13.1：安全转换函数", ["exercise"]),

    ("code", """\
def to_amount(text):
    '''TODO：把字符串转 float；不合法返回 None，不抛异常不打印'''
    pass

# 自测（应输出 25.5 / None / None）
# print(to_amount("25.5"))
# print(to_amount("abc"))
# print(to_amount(None))""", ["exercise"]),

    ("md", "### 练一练 13.2：给 average 补校验", ["exercise"]),

    ("code", """\
def average_v2(numbers):
    '''TODO：空列表 raise ValueError；含非数字 raise TypeError；否则返回均值'''
    pass

# 自测三连：
# 正常 [10, 20] -> 15.0
# average_v2([]) 应 ValueError
# average_v2([1, "x"]) 应 TypeError""", ["exercise"]),

    ("md", "### 练一练 13.3：坏账清洗", ["exercise"]),

    ("code", """\
raw = [
    {"summary": "午餐", "amount": 25.5},
    {"summary": "手输", "amount": "32.0"},
    {"summary": "错误", "amount": -1.0},
    {"summary": "空值", "amount": None},
]

# TODO：写 clean_ledger(records)：
#   能安全转成正数的保留（float 化），
#   其余跳过并计数，返回 (干净列表, 跳过数)；
#   最后 assert 验证：干净列表 2 笔、跳过 2 笔。""", ["exercise"]),

    ("md", """\
## 易错点清单

- 裸 `except:` 吞掉一切异常，bug 藏得更深——永远写具体类型；
- 一个 try 装太多代码，异常来源难定位——只包风险行；
- 静默吞错（非法数据悄悄跳过），错误延迟爆发——用 raise 快速失败；
- 拿 assert 校验外部输入——assert 可被关闭，校验用 raise；
- 只在读取端防御、写入端不校验——治标不治本。""", []),

    ("md", """\
## 本章小结

- try/except 接预料中的意外，raise 拒绝不合法的数据，assert 做开发期自检。
- 调试三步：读报错 → 最小复现 → 打印中间值（带类型）。
- 防护闭环 = 写入端校验 + 读取端兜底 + 固定用例回归。
- 至此 Python 基础模块（1–13 章）完结：你已经能独立写出
  “会记账、会判断、会统计、会存盘、不崩溃”的完整小工具。
- 下一站：NumPy——当数据从几十行变成几百万行。""", []),

    ("md", """\
## 参考答案""", []),

    ("code", """\
# 练一练 13.1 参考答案
def to_amount(text):
    try:
        return float(text)
    except (TypeError, ValueError):
        return None

print(to_amount("25.5"))
print(to_amount("abc"))
print(to_amount(None))""", ["solution"]),

    ("code", """\
# 练一练 13.2 参考答案
def average_v2(numbers):
    if not numbers:
        raise ValueError("列表为空，无法计算均值")
    for x in numbers:
        if not isinstance(x, (int, float)):
            raise TypeError(f"含非数字元素: {x!r}")
    return sum(numbers) / len(numbers)

print(average_v2([10, 20]))

try:
    average_v2([])
except ValueError as e:
    print("ValueError:", e)

try:
    average_v2([1, "x"])
except TypeError as e:
    print("TypeError:", e)""", ["solution"]),

    ("code", """\
# 练一练 13.3 参考答案
def clean_ledger(records):
    clean, skipped = [], 0
    for record in records:
        try:
            amount = float(record["amount"])
        except (TypeError, ValueError):
            skipped += 1
            continue
        if amount > 0:
            clean.append({"summary": record["summary"], "amount": amount})
        else:
            skipped += 1
    return clean, skipped

raw = [
    {"summary": "午餐", "amount": 25.5},
    {"summary": "手输", "amount": "32.0"},
    {"summary": "错误", "amount": -1.0},
    {"summary": "空值", "amount": None},
]

clean, skipped = clean_ledger(raw)
assert len(clean) == 2
assert skipped == 2
print(f"干净 {len(clean)} 笔，跳过 {skipped} 笔")""", ["solution"]),
]
