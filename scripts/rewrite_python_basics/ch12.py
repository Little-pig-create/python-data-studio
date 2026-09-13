"""第12章 文件、路径与 JSON 持久化"""

TITLE = "文件、路径与 JSON 持久化"
EST_MINUTES = 55

CELLS = [
    ("md", """\
# 第12章 文件、路径与 JSON 持久化

到目前为止，你的账本活在变量里——**关掉 Notebook 就全没了**。
真实程序必须能把数据存到磁盘、下次再读回来，这就是**持久化**。

本章学三件事：路径（文件在哪）、读写（怎么存取）、
JSON（结构化数据的通用格式）。你的记账助手将从“一次性脚本”
变成“记住历史的工具”。""", []),

    ("md", """\
## 学习目标

学完本章，你能够：

- 用 pathlib 定位文件与目录，区分相对/绝对路径；
- 用 with open 按“读写模式”安全读写文本文件；
- 用 json 把账本（列表装字典）存成文件、再原样读回；
- 说出文件操作三大坑：忘关文件、模式用错、编码不一致。""", []),

    ("md", """\
## 12.1 路径：文件在哪

**概念**：`pathlib.Path` 是现代 Python 的路径工具。
`Path(".")` 是“当前目录”（Notebook 所在位置），
`/` 运算符拼接子目录，`resolve()` 转成绝对路径。
**相对路径**以当前位置为起点，**绝对路径**从盘符写起——课程代码统一用相对路径，
换电脑也能跑。""", []),

    ("md", "### 例 1｜最小例子：认识当前位置", []),

    ("code", r"""
from pathlib import Path

here = Path(".")            # 相对路径：当前目录
print(here.resolve())       # 绝对路径：从根开始写全

# 常用方法
print(Path("data").name)         # data：最后一段名字
print(Path("a/b/c.txt").suffix)  # .txt：扩展名
print(Path("a/b/c.txt").parent)  # a/b：上级目录""", ["example"]),

    ("md", "### 例 2｜业务例子：为账本建立数据目录", []),

    ("code", r"""
from pathlib import Path

data_dir = Path("course_data")     # 账本数据统一放这里
data_dir.mkdir(exist_ok=True)      # 目录不存在就创建；已存在也不报错

ledger_file = data_dir / "ledger.json"
print("账本文件:", ledger_file)
print("已存在:", ledger_file.exists())""", ["example"]),

    ("md", """\
**输出解读**：`mkdir(exist_ok=True)` 的 `exist_ok` 是“目录已存在时别报错”——
配合重复运行 Notebook 是标准搭配。`/` 拼出来的 `course_data/ledger.json`
就是后面存取的目标。

### 例 3｜常见错误：路径分隔符与“文件去哪了”""", []),

    ("code", r"""
from pathlib import Path

# 反例：手工拼字符串，Windows 反斜杠在字符串里还是转义符
# print("c:\new_folder\test")   # \n、\t 被解释成换行/制表符！

# 修复：Path 自动处理各系统的分隔符
print(Path("new_folder") / "test")

# “文件去哪了”：相对路径以 Notebook 当前目录为基准
# 运行后找不到文件时，先 print(Path(".").resolve()) 看看实际在哪
print(Path(".").resolve())""", ["example"]),

    ("md", """\
## 12.2 读写文本：with open

**概念**：标准写法（背下来）：

```python
with open(路径, "r", encoding="utf-8") as f:   # 读
    text = f.read()
with open(路径, "w", encoding="utf-8") as f:   # 写（覆盖！）
    f.write(text)
```

`with` 会在代码块结束时**自动关闭文件**（哪怕中途报错）。
模式：`r` 读、`w` 覆盖写、`a` 追加写。`encoding="utf-8"` 必须写——
默认编码随系统变，是中文乱码的万恶之源。""", []),

    ("md", "### 例 1｜最小例子：写一句、读一句", []),

    ("code", r"""
from pathlib import Path

file = Path("course_data") / "note.txt"

with open(file, "w", encoding="utf-8") as f:   # w：新建或清空后写
    f.write("8 月记账开始\n")
    f.write("目标：控制在 3000 元内\n")

with open(file, "r", encoding="utf-8") as f:
    text = f.read()

print(text)""", ["example"]),

    ("md", "### 例 2｜业务例子：追加记账日志", []),

    ("code", r"""
from pathlib import Path

log = Path("course_data") / "spend_log.txt"

with open(log, "a", encoding="utf-8") as f:    # a：追加，不覆盖
    f.write("08-01 午餐 25.5\n")
    f.write("08-01 地铁 4.0\n")

with open(log, "r", encoding="utf-8") as f:
    lines = f.readlines()                      # 按行读成列表

print(f"日志共 {len(lines)} 行")
print(lines[-1].strip())                       # 最后一行，strip 去掉换行符""", ["example"]),

    ("md", """\
**输出解读**：`日志共 2 行`。重复运行本格会不断追加（变成 4 行、6 行…）——
这正是 `a` 模式的语义。要重新开始，改回 `w` 或手动删文件。

### 例 3｜常见错误：w 覆盖历史 + 忘了 encoding""", []),

    ("code", r"""
from pathlib import Path

log = Path("course_data") / "spend_log.txt"

# 反例 1：想追加却用了 w —— 之前的日志全部清空！
# with open(log, "w", encoding="utf-8") as f:
#     f.write("今天的账\n")        # 历史记录没了

# 反例 2：不写 encoding，Windows 默认 gbk、别人电脑 utf-8，乱码随缘
# open(log, "r") as f: ...

# 修复：追加一律 a；encoding 永远显式写 utf-8
with open(log, "a", encoding="utf-8") as f:
    f.write("08-02 电影 45.0\n")
with open(log, "r", encoding="utf-8") as f:
    print(f.read())""", ["example"]),

    ("md", """\
**要点**：`w` 是“格式化重写”，只对**全新数据**使用；
记录类数据一律 `a`。每条 open 都带 `encoding="utf-8"`，
不给自己留排乱码的机会。""", []),

    ("md", """\
## 12.3 JSON：让账本原样复活

**概念**：JSON 是和字典/列表几乎一一对应的文本格式，
是程序之间传数据的通用语言。核心两行：

```python
json.dump(数据, f, ensure_ascii=False, indent=2)   # 存
data = json.load(f)                                 # 读
```

`ensure_ascii=False` 让中文原样显示；`indent=2` 缩进美化，方便人看。""", []),

    ("md", "### 例 1｜业务例子：账本存盘与读回", []),

    ("code", r"""
import json
from pathlib import Path

ledger = [
    {"date": "08-01", "summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"date": "08-01", "summary": "地铁", "category": "交通", "amount": 4.0},
    {"date": "08-02", "summary": "耳机", "category": "数码", "amount": 399.0},
]

file = Path("course_data") / "ledger.json"

# 存：列表装字典直接变成 JSON
with open(file, "w", encoding="utf-8") as f:
    json.dump(ledger, f, ensure_ascii=False, indent=2)

# 读：原样复活
with open(file, "r", encoding="utf-8") as f:
    loaded = json.load(f)

print(type(loaded).__name__, len(loaded))
print(loaded[0]["summary"], loaded[0]["amount"])
print(f"总支出 {sum(r['amount'] for r in loaded):.1f} 元")""", ["example"]),

    ("md", """\
**输出解读**：读回来的 `loaded` 是和原来一模一样的列表装字典，
统计代码（sum、max）直接就能跑。**“变量 → JSON 文件 → 变量”**
这条通道打通后，程序重启数据不丢。

### 例 2｜业务例子：JSON 是给人看的（先预览再读）""", []),

    ("code", r"""
import json
from pathlib import Path

file = Path("course_data") / "ledger.json"

# json.dumps 把数据变成字符串（不落盘），常用于预览和打印
text = Path(file).read_text(encoding="utf-8")
print(text[:80], "...")     # 看前 80 个字符：中文、缩进清晰可读""", ["example"]),

    ("md", "### 例 3｜常见错误：读不存在的文件 + JSON 语法严格", []),

    ("code", r"""
import json
from pathlib import Path

missing = Path("course_data") / "not_exist.json"

# 反例 1：文件不存在直接崩
# with open(missing, "r", encoding="utf-8") as f:
#     json.load(f)           # FileNotFoundError

# 修复：exists 先检查（第 13 章会学 try/except 的写法）
if missing.exists():
    with open(missing, "r", encoding="utf-8") as f:
        json.load(f)
else:
    print("还没有历史账本，从空账开始")

# 反例 2：JSON 文件里的键必须双引号、不能有注释
# {"amount": 25.5, }   <- 尾逗号都不行；这是它和 Python 字典的区别""", ["example"]),

    ("md", """\
**要点**：读文件前 `exists()` 检查或用异常兜底（下一章）；
JSON 语法比 Python 字典严格：双引号、无尾逗号、无注释。""", []),

    ("md", """\
## 12.4 实战：可保存的记账助手

把本章组件组装成“记账 → 保存 → 下次读回”的闭环，
这也是模块大作业的核心骨架。""", []),

    ("md", "### 例 1｜业务例子：记账闭环", []),

    ("code", r"""
import json
from pathlib import Path

DATA_FILE = Path("course_data") / "assistant_ledger.json"

def load_ledger():
    '''读历史账本；没有就返回空列表'''
    if not DATA_FILE.exists():
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_ledger(ledger):
    '''账本落盘'''
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(ledger, f, ensure_ascii=False, indent=2)

def add_record(ledger, summary, category, amount):
    ledger.append(
        {"summary": summary, "category": category, "amount": amount}
    )
    return ledger

# --- 演示一个完整周期 ---
ledger = load_ledger()
add_record(ledger, "咖啡", "餐饮", 18.0)
save_ledger(ledger)

# 假装“重启程序”：重新从磁盘读
reloaded = load_ledger()
print(f"磁盘账本共 {len(reloaded)} 笔")
print(f"总支出 {sum(r['amount'] for r in reloaded):.1f} 元")""", ["example"]),

    ("md", """\
**输出解读**：第一次运行 1 笔 18.0 元；**重复运行本格**，账目会累积
（2 笔 36.0 元、3 笔 54.0 元…）——数据真的“记住”了。
清理课程产物：运行下一格删除演示文件。""", []),

    ("code", r"""
# 清理演示产生的文件（保持课程目录干净）
from pathlib import Path
import shutil

demo_dir = Path("course_data")
if demo_dir.exists():
    shutil.rmtree(demo_dir)
    print("已清理 course_data/")
else:
    print("没有需要清理的文件")""", []),

    ("md", """\
## 综合练习""", []),

    ("md", "### 练一练 12.1：目录与文件操作", ["exercise"]),

    ("code", r"""
from pathlib import Path

# TODO 1：创建目录 month_reports（exist_ok=True）
# TODO 2：往 month_reports/report.txt 写入两行文本（utf-8）
# TODO 3：读回并打印行数
# TODO 4：用 Path.exists() 打印文件是否存在""", ["exercise"]),

    ("md", "### 练一练 12.2：账本持久化", ["exercise"]),

    ("code", r"""
import json
from pathlib import Path

file = Path("month_reports") / "ledger.json"
ledger = [
    {"summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"summary": "打车", "category": "交通", "amount": 28.0},
]

# TODO 1：把 ledger 存为 JSON（ensure_ascii=False, indent=2）
# TODO 2：读回 loaded，打印总支出
# TODO 3：追加一笔 {"summary": "咖啡", "category": "餐饮", "amount": 18.0}
#         重新保存并再读回，打印总笔数""", ["exercise"]),

    ("md", "### 练一练 12.3：模式选择判断", ["exercise"]),

    ("md", """\
不写代码，口答选 `r` / `w` / `a`：

1. 程序启动时读回昨天的账本；
2. 每记一笔账就往日志文件末尾添一行；
3. 导出“本月报表”这个全新文件；
4. 覆盖更新配置文件的全部内容。""", ["exercise"]),

    ("code", r"""
# 练一练 12.3 参考答案（口答后核对）
# 1. r —— 只读现有数据
# 2. a —— 日志类永远追加
# 3. w —— 全新文件可以覆盖写
# 4. w —— 配置整体重写；若想“改其中一项”应先读出改好再 w 写回""", ["exercise"]),

    ("md", """\
## 易错点清单

- 手工拼路径遇转义字符（`\\n`、`\\t`），用 pathlib 的 `/` 拼接；
- `w` 模式覆盖历史文件，日志/账本一律用 `a`；
- 不写 `encoding="utf-8"`，换台电脑就乱码；
- 读不存在的文件直接 FileNotFoundError，先 exists 或异常兜底；
- JSON 语法严格：双引号、无尾逗号、无注释；
- 忘了 `with` 手工 open 不 close，文件被占用（Windows 尤其明显）。""", []),

    ("md", """\
## 本章小结

- pathlib 管路径，with open 管读写，json 管结构化数据。
- 模式口诀：读 r、全新 w、追加 a；encoding 永远 utf-8。
- “load → 处理 → save”闭环让记账助手有了记忆。
- 下一章处理程序的不完美：异常处理、调试与测试。""", []),

    ("md", """\
## 参考答案""", []),

    ("code", r"""
# 练一练 12.1 参考答案
from pathlib import Path

reports = Path("month_reports")
reports.mkdir(exist_ok=True)

target = reports / "report.txt"
with open(target, "w", encoding="utf-8") as f:
    f.write("8 月第 1 周\n")
    f.write("总支出 144.0 元\\n")

with open(target, "r", encoding="utf-8") as f:
    lines = f.readlines()
print(len(lines), target.exists())""", ["solution"]),

    ("code", r"""
# 练一练 12.2 参考答案
import json
from pathlib import Path

file = Path("month_reports") / "ledger.json"
ledger = [
    {"summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"summary": "打车", "category": "交通", "amount": 28.0},
]

with open(file, "w", encoding="utf-8") as f:
    json.dump(ledger, f, ensure_ascii=False, indent=2)

with open(file, "r", encoding="utf-8") as f:
    loaded = json.load(f)
print(f"总支出 {sum(r['amount'] for r in loaded):.1f} 元")

loaded.append({"summary": "咖啡", "category": "餐饮", "amount": 18.0})
with open(file, "w", encoding="utf-8") as f:
    json.dump(loaded, f, ensure_ascii=False, indent=2)

with open(file, "r", encoding="utf-8") as f:
    final = json.load(f)
print("总笔数:", len(final))""", ["solution"]),

    ("code", r"""
# 清理练习产物
from pathlib import Path
import shutil

dir_to_clean = Path("month_reports")
if dir_to_clean.exists():
    shutil.rmtree(dir_to_clean)
    print("已清理 month_reports/")
else:
    print("没有需要清理的文件")""", ["solution"]),
]
