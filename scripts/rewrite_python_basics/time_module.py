"""course-chapter-time 模块、类与项目组织"""

TITLE = "模块、类与项目组织"
EST_MINUTES = 50

CELLS = [
    ("md", """\
# 第15章 模块、类与项目组织

你已经会写函数、会清洗数据了。最后的门槛是**组织**：
代码多了放哪里？相关的函数和数据怎么“打包”？类(class)是什么？

本章回答三个问题：
**import 的机制**、**类与对象的最小必要知识**、
**一个分析项目该长什么样**。""", []),

    ("md", """## 学习目标

学完本章，你能够：

- 解释 `import` 的三种方式与“只执行一次”的特性，避开循环导入；
- 定义最小类：`__init__`、属性、方法，说清类与实例的关系；
- 用 `if __name__ == "__main__"` 区分“直接运行”与“被导入”；
- 按“数据/源码/产物”三目录组织一个分析项目。""", []),

    ("md", """## 1. import：代码的“借书”机制

**概念**：`import 模块` 加载整个文件；`from 模块 import 名字` 只借单个工具；
`import 模块 as 别名` 起简称（`import pandas as pd` 就是它）。
**每个模块在一次运行中只执行一次**——重复 import 不会重复执行。""", []),

    ("md", "### 例 1｜最小例子：三种导入方式", []),

    ("code", """\
import math                          # 整包借入
print(math.floor(3.7))

from math import sqrt, pi            # 单点借入
print(sqrt(16), round(pi, 2))

import numpy as np                   # 起别名（社区惯例）
print(np.zeros(3))""", ["example"]),

    ("md", "### 例 2｜业务例子：自己当“模块作者”", []),

    ("code", """\
# 把常用函数写进自己的模块文件 my_ledger.py（此处演示内容）：
# ---- my_ledger.py ----
# def with_tax(amount, rate=0.06):
#     return amount * (1 + rate)
#
# def final_amount(amount, discount=0.0):
#     return with_tax(amount) - discount
# ----------------------

# 在同目录的其他文件里：
# from my_ledger import final_amount
# print(final_amount(100.0, discount=6.0))   # 100.0

print("模块 = 一个 .py 文件；包 = 一组模块的文件夹")""", ["example"]),

    ("md", "### 例 3｜常见错误：循环导入与命名遮蔽", []),

    ("code", """\
import math

# 反例 1：自己的文件叫 math.py —— import math 会导入“你自己”而非标准库！
# 症状：math.xxx 突然消失。修复：删掉/改名 math.py。
# 命名守则：**自己的文件不要与标准库同名**（math.py、random.py 高发）。

# 反例 2：循环导入 —— a.py 里 from b import x，b.py 又 from a import y
# 症状：ImportError: cannot import name ...（partial initialization）
# 修复：把公共部分抽到第三个模块 c.py，让依赖单向流动。
print("命名遮蔽与循环导入都靠‘项目结构’预防，不是靠记忆")""", ["example"]),

    ("md", """\
**要点**：**自己起的文件名永远别撞标准库**（math/random/json/test）；
模块依赖必须单向，出现循环就抽公共模块。""", []),

    ("md", """## 2. 类：把数据与操作装在一起

**概念**：类（class）是“数据 + 操作这个数据的方法”的打包：
`__init__` 在创建实例时初始化属性；方法第一个参数 `self`
指向实例自己。账本里“一笔账”的属性与行为就很适合用类表达。""", []),

    ("md", "### 例 1｜最小例子：第一个类", []),

    ("code", """\
class Record:
    def __init__(self, summary, amount):
        self.summary = summary      # 属性
        self.amount = amount

    def is_big(self):               # 方法
        return self.amount >= 100

r1 = Record("耳机", 399.0)          # 创建实例
r2 = Record("地铁", 4.0)
print(r1.summary, r1.is_big())      # 耳机 True
print(r2.summary, r2.is_big())      # 地铁 False""", ["example"]),

    ("md", "### 例 2｜业务例子：账本类", []),

    ("code", """\
class Ledger:
    def __init__(self):
        self.records = []

    def add(self, summary, amount):
        if amount < 0:
            raise ValueError("金额不能为负")
        self.records.append({"summary": summary, "amount": amount})
        return self

    @property
    def total(self):
        return sum(r["amount"] for r in self.records)

book = Ledger()
book.add("咖啡", 18.0).add("耳机", 399.0)
print(f"共 {len(book.records)} 笔，合计 {book.total:.1f} 元")
print("大额记录:", [r["summary"] for r in book.records
                   if r["amount"] >= 100])""", ["example"]),

    ("md", "### 例 3｜常见错误：忘写 self 与在 init 里做事太多", []),

    ("code", """\
# 反例 1：定义方法漏了 self —— 调用时参数错位
class Broken:
    def add(amount):            # 缺 self
        return amount
# Broken().add(5)   # TypeError: add() takes 1 positional argument

# 反例 2：__init__ 里加载文件/联网 —— 对象一创建就干重活，难测试
class Ledger2:
    def __init__(self, path):
        self.records = open(path).readlines()   # 副作用！
# 修复：初始化只设“空白状态”，数据通过方法加载：
class Ledger3:
    def __init__(self):
        self.records = []

    def load(self, lines):
        self.records = list(lines)
        return self
print(Ledger3().load(["a", "b"]).records)""", ["example"]),

    ("md", """\
**要点**：方法必写 `self`；`__init__` 只做“空白初始化”，
重活（读文件、联网）拆到显式方法里——对象才好测试、好复用。""", []),

    ("md", """## 3. if __name__ == "__main__"：入口开关

**概念**：Python 直接运行文件时 `__name__` 等于 `"__main__"`，
被 import 时等于模块名。用它把“演示/测试代码”包起来——
**被导入时不执行，直接运行时才执行**。""", []),

    ("md", "### 例 1｜最小例子：一个文件的两种身份", []),

    ("code", """\
# 假设下面这段写在 my_ledger.py 里：
def with_tax(amount, rate=0.06):
    return amount * (1 + rate)

if __name__ == "__main__":
    # 只有“python my_ledger.py”直接运行时才打印；
    # 别的文件 import my_ledger 时不会执行。
    print("自检:", with_tax(100.0) == 106.0)

print("当前 __name__ 是:", __name__)   # 在 Notebook 里是 '__main__'""", ["example"]),

    ("md", "### 例 2｜常见错误：把演示代码裸写在模块顶层", []),

    ("code", """\
# 反例：my_ledger.py 顶层直接 print/读文件 ——
#   任何 import 都会触发这些副作用，输出被“污染”。
#   症状：import 一次，打印一片。

# 修复：演示代码一律收进 if __name__ == "__main__":
print("被导入 vs 被运行，是模块设计的分水岭")""", ["example"]),

    ("md", """\
## 4. 项目组织：一个分析项目的标准骨架

**概念**：最小可用结构——

```
my_project/
  data/          # 原始数据（只读，不改动）
  output/        # 清洗结果与报表产物
  ledger.py      # 你的函数/类
  analyze.py     # 分析脚本：import ledger
  README.md      # 一段话说明怎么运行
```

**数据只读、产物入 output、可复用函数进模块**——三条纪律就够入门。""", ["exercise"]),

    ("md", "### 例 1｜业务例子：三纪律落到实处", []),

    ("code", """\
from pathlib import Path

# 项目内一律以“相对路径 + 明确目录”访问文件
BASE = Path(".")                     # Notebook/脚本所在目录
RAW = BASE / "data"                  # 原始数据
OUT = BASE / "output"                # 产物
OUT.mkdir(exist_ok=True)

# 纪律自检清单：
# 1. 原始数据文件在 data/ 且从不被程序改写；
# 2. 一切 to_csv / save 的目标都在 output/；
# 3. 会被第二个脚本用到的函数已收进模块（ledger.py）而不是复制粘贴。
print("项目骨架检查通过")""", ["example"]),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 15.1：设计一个类", ["exercise"]),

    ("code", """\
class Expense:
    '''一笔支出：summary、amount、paid_by 三个属性'''

    # TODO 1：写 __init__（amount 为负时 raise ValueError）
    # TODO 2：写方法 is_big：amount >= 100 返回 True
    # TODO 3：创建两个实例并打印 is_big 结果
    pass""", ["exercise"]),

    ("md", "### 练一练 15.2：入口开关", ["exercise"]),

    ("code", """\
# TODO 1：把练一练 15.1 的类补全后，在其文件里加：
#   if __name__ == "__main__":
#       写两行“自检”（创建实例、断言金额校验生效）
# TODO 2：口答：这个文件被 import 时，自检代码会执行吗？为什么？""", ["exercise"]),

    ("md", "### 练一练 15.3：项目骨架落地", ["exercise"]),

    ("code", """\
from pathlib import Path

# TODO 1：创建 mini_project/{data,output} 两个目录
# TODO 2：往 mini_project/data/bill.csv 写入两行文本（utf-8）
# TODO 3：写几行“读 data -> 大写 -> 存 output”的代码，跑通闭环
# TODO 4：最后清理 mini_project 目录""", ["exercise"]),

    ("md", """## 易错点清单

- 自己的文件名与标准库同名（math.py）会静默替换官方模块；
- 循环导入靠“依赖单向 + 抽公共模块”预防；
- 方法定义漏 `self`，调用时报参数个数错误；
- `__init__` 里做重活（读文件/联网），对象难测试——初始化只设空白状态；
- 模块顶层裸写演示代码，import 一次打印一片——收进
  `if __name__ == "__main__"`；项目三纪律：数据只读、产物归口、函数进模块。""", []),

    ("md", """## 本章小结

- import 三种姿势 + “只执行一次” + 命名避让，构成模块机制的全部基础。
- 类 = 数据 + 方法，最小三件套：`__init__`、属性、方法（记得 self）。
- `if __name__ == "__main__"` 让一个文件既能当模块又能当脚本。
- 项目骨架三条纪律，让你的代码从“脚本能跑”升级为“项目可交付”。
- Python 基础模块全部完成！下一站：NumPy 数组世界。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 15.1 参考答案
class Expense:
    def __init__(self, summary, amount, paid_by="微信"):
        if amount < 0:
            raise ValueError("金额不能为负")
        self.summary = summary
        self.amount = amount
        self.paid_by = paid_by

    def is_big(self):
        return self.amount >= 100

e1 = Expense("耳机", 399.0)
e2 = Expense("地铁", 4.0)
print(e1.is_big(), e2.is_big())""", ["solution"]),

    ("code", """\
# 练一练 15.2 参考答案
# 文件 my_expense.py 的结尾应有：
#   if __name__ == "__main__":
#       e = Expense("耳机", 399.0)
#       assert e.is_big()
#       try:
#           Expense("坏", -1.0)
#           raise AssertionError("金额校验未生效")
#       except ValueError:
#           pass
# 口答答案：不会执行。import 时 __name__ 是 "my_expense"，
# 只有直接运行该文件时才等于 "__main__"。""", ["solution"]),

    ("code", """\
# 练一练 15.3 参考答案
from pathlib import Path
import shutil

proj = Path("mini_project")
(proj / "data").mkdir(parents=True, exist_ok=True)
(proj / "output").mkdir(exist_ok=True)

bill = proj / "data" / "bill.csv"
bill.write_text("summary,amount\\ncoffee,18\\nmetro,4\\n", encoding="utf-8")

lines = bill.read_text(encoding="utf-8").upper()
(proj / "output" / "bill_upper.csv").write_text(lines, encoding="utf-8")
print((proj / "output" / "bill_upper.csv").read_text(encoding="utf-8"))

shutil.rmtree(proj)      # 清理
print("已清理 mini_project")""", ["solution"]),
]
