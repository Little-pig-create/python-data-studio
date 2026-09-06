"""Build the Python foundation module as a progressive learning path."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
COURSE_DIR = ROOT / "public" / "course"
VERSION = "2026-08-07-python-merged-chapters-v1"
LEARNING_LOOP_VERSION = "2026-08-06-learning-loop-v4"


def source_lines(text):
    return [line + "\n" for line in text.strip("\n").splitlines()]


def cell_id(slug, label):
    digest = hashlib.sha1(f"{slug}:{label}".encode("utf-8")).hexdigest()[:14]
    return f"python-foundation-{digest}"


def markdown(slug, label, text):
    return {
        "id": cell_id(slug, label),
        "cell_type": "markdown",
        "metadata": {},
        "source": source_lines(text),
    }


def code(slug, label, text, tags=None):
    return {
        "id": cell_id(slug, label),
        "cell_type": "code",
        "metadata": {"tags": tags or []},
        "execution_count": None,
        "outputs": [],
        "source": source_lines(text),
    }


def section(title, explanation, example, expected):
    return {
        "title": title,
        "explanation": explanation,
        "example": example,
        "expected": expected,
    }


CHAPTERS = [
    {
        "file": "course-chapter-1.ipynb",
        "number": 1,
        "title": "Python 与 Notebook 入门",
        "bridge": "这是一章导览。先认识 Notebook 如何组织说明、代码和输出，再从第 2 章开始真正编写 Python。",
        "orientation": [
            {
                "title": "先别急着写代码",
                "body": "第一遍只需要阅读和运行已经准备好的单元格。你要先看清楚：说明写在哪里、代码放在哪里、结果出现在哪里。能稳定地看懂和重跑，比立刻输入一长段代码更重要。",
            },
            {
                "title": "Notebook 不是普通文档",
                "body": "它把文字、可执行代码和运行结果放在同一页。Markdown 单元格负责解释问题与结论，代码单元格负责计算，输出区留下本次运行的结果。三者一起才构成一个能复查的学习记录。",
            },
            {
                "title": "界面里先认识四件事",
                "body": "单元格是最小工作单元；工具栏用于运行与重启；输出区显示结果或错误；Python 内核保存当前运行状态。现在看到“未启动”是正常的，第一次运行代码时它才会启动。",
            },
        ],
        "task": "完成一次“阅读、运行、核对”的导览：找到 Markdown、代码单元格、输出区和内核状态，并从上到下运行本章示例。",
        "outline": ["1.1 Notebook 页面由什么组成", "1.2 运行已有代码时发生了什么", "1.3 内核状态与运行顺序"],
        "goals": ["区分说明文字、代码和输出", "知道第一次运行会启动 Python 内核", "理解代码要按从上到下的顺序运行", "知道第 2 章才开始编写变量与表达式"],
        "observations": ["代码单元格运行后会出现输出或错误", "工具栏显示的是当前内核状态，不是课程完成状态", "蓝色边框表示当前选中的单元格", "重启内核会清空此前运行产生的变量"],
        "sections": [
            section("1.1 Notebook 页面由什么组成", "先看页面，不需要编辑。上面的段落属于 Markdown 单元格，下面浅色区域属于代码单元格。代码运行后，结果会显示在它的下方。每个单元格只承担一件事，后续章节会一直沿用这种组织方式。", """# 这是一个已经写好的代码单元格。
print("这是一次运行后的输出")""", "点击运行后会出现一行文字。此时你只需要确认：代码在单元格里，结果在单元格下方。"),
            section("1.2 运行已有代码时发生了什么", "本章不要求你输入代码。请直接运行下面的示例，观察输出区如何出现。之后再改动或编写代码时，也都遵循“先选中单元格，再运行，再看结果”的顺序。", """print("Python 已准备好运行")
print("输出会显示在代码单元格下方")""", "会出现两行输出。没有输出不一定代表正确，要继续看有没有错误信息或是否运行了正确的单元格。"),
            section("1.3 内核状态与运行顺序", "内核是执行 Python 的后台环境。它会记住已经运行过的结果，因此代码顺序很重要。下面的变量只用于观察这个状态，不要求现在理解变量规则；这些规则会在第 2 章正式学习。", """message = "内核会记住已运行的内容"
print(message)""", "首次运行会启动内核并输出这句话。重启内核后，需要重新运行这个单元格，message 才会再次存在。"),
        ],
        "mistakes": ["把 Markdown 当作代码运行，或把代码写进说明文字", "只运行中间单元格，忽略前面准备步骤", "看到“未启动”就误以为程序出错", "没有看输出区，直接跳到下一段内容"],
        "intro_checklist": ["能指出页面中的 Markdown、代码单元格和输出区", "知道点击运行会按需启动 Python 内核", "能从上到下运行示例并看到两类输出", "理解本章不要求独立编写业务代码"],
        "guided": {"prompt": "把一周预算改为两周预算，并同时输出天数、每日预算和总预算。", "scaffold": """daily_budget = 80
days = 14
# TODO: 计算 total_budget
total_budget = None
print("天数：", days)
print("每日预算：", daily_budget)
print("总预算：", total_budget)"""},
        "challenge": {"prompt": "创建一张学习卡：输入课程名、学习天数和每日分钟数，输出总分钟与总小时。", "scaffold": """course = "Python 基础"
days = 7
minutes_per_day = 45
# TODO: 计算 total_minutes 和 total_hours
""", "solution": """course = "Python 基础"
days = 7
minutes_per_day = 45
total_minutes = days * minutes_per_day
total_hours = total_minutes / 60
print(f"{course}：{total_minutes} 分钟，约 {total_hours:.1f} 小时")
_ok = total_minutes == 315 and total_hours == 5.25
print("诊断：", "通过" if _ok else "检查单位换算")"""},
        "next": "下一章才会开始编写变量、数据类型和运算表达式，并把它们用于可计算的业务输入。",
    },
    {
        "file": "course-chapter-10.ipynb",
        "number": 10,
        "title": "函数进阶：内置函数、lambda 与组合",
        "bridge": "上一章会编写返回结果的小函数。本章让函数参与排序、筛选、转换和多条件查询。",
        "task": "实现账目查询和统计函数，合理使用 sorted、sum、max、filter、map 与 lambda。",
        "outline": ["10.1 函数也是对象与 key 参数", "10.2 lambda、filter 和 map", "10.3 *args、**kwargs 与函数组合"],
        "goals": ["使用 key 指定排序和极值依据", "说明 lambda 的适用边界", "比较推导式、filter 和 map", "理解 *args 与 **kwargs", "组合查询与统计函数"],
        "observations": ["sorted 不修改原列表", "key 接收一个函数", "filter 和 map 返回迭代器", "复杂 lambda 会降低可读性"],
        "sections": [
            section("10.1 key 参数与函数对象", "sorted、min 和 max 可以通过 key 函数决定比较依据。命名函数适合复用，lambda 适合短小的一次性规则。", """records = [
    {"category": "餐饮", "amount": 35.5},
    {"category": "购物", "amount": 299.0},
    {"category": "交通", "amount": 18.0},
]

def amount_of(record):
    return record["amount"]

ranked = sorted(records, key=amount_of, reverse=True)
largest = max(records, key=lambda record: record["amount"])
print(ranked)
print("最大一笔：", largest)""", "按金额降序排列，最大记录为购物 299.0。"),
            section("10.2 推导式、filter 与 map", "三者都能处理序列。简单筛选和转换优先推导式；需要展示函数式接口时使用 filter/map，并及时转为列表。", """records = [
    {"type": "支出", "amount": 35.5},
    {"type": "收入", "amount": 5000.0},
    {"type": "支出", "amount": 18.0},
]
expenses = list(filter(lambda record: record["type"] == "支出", records))
amounts = list(map(lambda record: record["amount"], expenses))
same_amounts = [record["amount"] for record in records if record["type"] == "支出"]
print(expenses, amounts, same_amounts, sum(amounts))""", "两种写法都得到 [35.5, 18.0]，合计 53.5。"),
            section("10.3 *args 与 **kwargs", "*args 收集额外位置参数，**kwargs 收集额外关键字参数。基础业务函数更应显式命名参数，只在确实需要可变数量时使用。", """def total_amount(*amounts):
    return sum(amounts)

def create_record(date, record_type, amount, **extras):
    record = {"date": date, "type": record_type, "amount": amount}
    record.update(extras)
    return record

print(total_amount(35.5, 18.0, 299.0))
print(create_record("2026-08-06", "支出", 35.5, category="餐饮", note="午餐"))""", "金额合计 352.5，记录包含 category 和 note。"),
            section("10.4 多条件查询函数", "可选条件用 None 表示“不限制”。每一步筛选返回新结果，最后统一排序；函数不负责 input 或 print。", """def search_records(records, record_type=None, category=None):
    result = records
    if record_type is not None:
        result = [item for item in result if item["type"] == record_type]
    if category is not None:
        result = [item for item in result if item["category"] == category]
    return sorted(result, key=lambda item: item["date"])

records = [
    {"date": "2026-08-07", "type": "支出", "category": "交通", "amount": 18.0},
    {"date": "2026-08-06", "type": "支出", "category": "餐饮", "amount": 35.5},
]
print(search_records(records, record_type="支出"))""", "返回两条支出，并按日期升序。"),
        ],
        "mistakes": ["在 lambda 中塞入多层条件和副作用", "忘记把 filter/map 转为列表后重复使用", "为了使用 lambda 而拒绝更清楚的命名函数", "查询函数直接读取 input，导致无法测试"],
        "guided": {"prompt": "实现 `largest_record(records, record_type=None)`，可选筛选类型后返回最大金额记录；空结果返回 None。", "scaffold": """def largest_record(records, record_type=None):
    # TODO: 可选筛选并使用 max(..., key=..., default=None)
    pass
"""},
        "challenge": {"prompt": "实现 `search_records` 和 `statistics`，支持类型、分类筛选并返回收入、支出、结余和最大支出。", "scaffold": """def search_records(records, record_type=None, category=None):
    pass

def statistics(records):
    pass
""", "solution": """def search_records(records, record_type=None, category=None):
    result = records
    if record_type is not None:
        result = list(filter(lambda item: item["type"] == record_type, result))
    if category is not None:
        result = list(filter(lambda item: item["category"] == category, result))
    return sorted(result, key=lambda item: item["date"])

def statistics(records):
    income = sum(item["amount"] for item in records if item["type"] == "收入")
    expenses = [item for item in records if item["type"] == "支出"]
    expense_total = sum(item["amount"] for item in expenses)
    largest_expense = max(expenses, key=lambda item: item["amount"], default=None)
    return {
        "income": income,
        "expense": expense_total,
        "balance": income - expense_total,
        "largest_expense": largest_expense,
    }

records = [
    {"date": "2026-08-01", "type": "收入", "category": "工资", "amount": 5000.0},
    {"date": "2026-08-02", "type": "支出", "category": "餐饮", "amount": 35.5},
    {"date": "2026-08-03", "type": "支出", "category": "购物", "amount": 299.0},
]
result = statistics(records)
print(search_records(records, record_type="支出"))
print(result)
_ok = result["balance"] == 4665.5 and result["largest_expense"]["amount"] == 299.0
print("诊断：", "通过" if _ok else "检查筛选、合计或 key")"""},
        "next": "查询和统计函数已完成。下一章把记录安全保存为 JSON，并在程序重启后恢复。",
    },
    {
        "file": "course-chapter-11.ipynb",
        "number": 11,
        "title": "文件、路径与 JSON 持久化",
        "bridge": "函数可以处理内存中的列表，但程序结束后数据会消失。本章建立稳定的 JSON 读写层。",
        "task": "使用 Path、with 和 json 实现 load_data 与 save_data，并验证保存前后内容一致。",
        "outline": ["11.1 Path 与目录", "11.2 with 和文本读写", "11.3 JSON 序列化", "11.4 持久化函数设计"],
        "goals": ["使用 Path 组合跨平台路径", "用 with 管理文件资源", "使用 json.dump 和 json.load", "封装 load_data 与 save_data", "处理中文和文件不存在"],
        "observations": ["Path 的 / 运算符用于组合路径", "w 模式会覆盖文件", "ensure_ascii=False 保留可读中文", "JSON 只支持可序列化的数据类型"],
        "sections": [
            section("11.1 Path 与目录", "路径、目录和文件名分开表达。mkdir(parents=True, exist_ok=True) 可以安全创建多层目录。", """from pathlib import Path
from tempfile import TemporaryDirectory

with TemporaryDirectory() as folder:
    root = Path(folder)
    data_dir = root / "finance_app" / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    data_file = data_dir / "records.json"
    print(data_file.name, data_file.suffix, data_file.parent.exists())""", "文件名 records.json，后缀 .json，父目录存在。"),
            section("11.2 with 和编码", "with 块结束时文件自动关闭。文本读写始终显式使用 UTF-8，避免中文在不同系统中乱码。", """from pathlib import Path
from tempfile import TemporaryDirectory

with TemporaryDirectory() as folder:
    path = Path(folder) / "note.txt"
    with path.open("w", encoding="utf-8") as file:
        file.write("餐饮：35.50 元\\n")
    with path.open("r", encoding="utf-8") as file:
        content = file.read()
    print(repr(content))""", "读取内容与写入内容一致，并保留换行符。"),
            section("11.3 JSON 序列化与反序列化", "dump 把 Python 对象写入文件，load 从文件还原对象。indent 便于人工检查，ensure_ascii=False 保留中文。", """import json
from pathlib import Path
from tempfile import TemporaryDirectory

records = [{"date": "2026-08-06", "type": "支出", "category": "餐饮", "amount": 35.5}]
with TemporaryDirectory() as folder:
    path = Path(folder) / "records.json"
    with path.open("w", encoding="utf-8") as file:
        json.dump(records, file, ensure_ascii=False, indent=2)
    with path.open(encoding="utf-8") as file:
        loaded = json.load(file)
    print(path.read_text(encoding="utf-8"))
    print("保存前后相同：", loaded == records)""", "JSON 文本中文可读，保存前后比较结果为 True。"),
            section("11.4 load_data 与 save_data", "文件函数只负责持久化，不负责菜单、统计或展示。通过 path 参数可以在测试时使用临时文件。", """import json
from pathlib import Path
from tempfile import TemporaryDirectory

def save_data(records, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(records, file, ensure_ascii=False, indent=2)

def load_data(path):
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as file:
        return json.load(file)

with TemporaryDirectory() as folder:
    test_path = Path(folder) / "data" / "records.json"
    save_data([{"amount": 35.5}], test_path)
    print(load_data(test_path))""", "首次路径自动创建，读取结果为包含一条记录的列表。"),
        ],
        "mistakes": ["省略 encoding 导致中文行为依赖系统", "使用字符串拼接路径", "把 datetime 或 set 直接交给 JSON", "save_data 顺便修改或统计 records", "读取不存在文件前不检查也不处理异常"],
        "guided": {"prompt": "将两条账目写入临时 JSON 文件，重新读取并检查记录数、字段和中文内容。", "scaffold": """import json
from pathlib import Path
from tempfile import TemporaryDirectory

records = [
    {"type": "收入", "category": "工资", "amount": 5000.0},
    {"type": "支出", "category": "餐饮", "amount": 35.5},
]
# TODO: 写入、读取并检查
"""},
        "challenge": {"prompt": "实现可测试的 load_data/save_data：不存在文件返回空列表，保存后可完整恢复。", "scaffold": """def load_data(path):
    pass

def save_data(records, path):
    pass

# TODO: 使用 TemporaryDirectory 验证首次读取和保存后读取
""", "solution": """import json
from pathlib import Path
from tempfile import TemporaryDirectory

def load_data(path):
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as file:
        data = json.load(file)
    return data if isinstance(data, list) else []

def save_data(records, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(records, file, ensure_ascii=False, indent=2)

with TemporaryDirectory() as folder:
    path = Path(folder) / "data" / "records.json"
    empty = load_data(path)
    records = [{"type": "支出", "category": "餐饮", "amount": 35.5}]
    save_data(records, path)
    restored = load_data(path)
    print(empty, restored)
    _ok = empty == [] and restored == records
    print("诊断：", "通过" if _ok else "检查首次读取、目录创建或 JSON")"""},
        "next": "文件读写仍可能遇到坏 JSON、权限和输入错误。下一章使用异常处理留下明确诊断。",
    },
    {
        "file": "course-chapter-12.ipynb",
        "number": 12,
        "title": "异常处理、调试与基础测试",
        "bridge": "持久化层会接触用户输入和外部文件。错误不能被静默吞掉，也不应让整个程序无提示退出。",
        "task": "为金额、日期、索引和 JSON 文件建立具体异常处理，并用测试样例验证行为。",
        "outline": ["12.1 Traceback 与常见异常", "12.2 try/except/else/finally", "12.3 raise 与输入校验", "12.4 调试和表驱动测试"],
        "goals": ["读懂异常类型和错误位置", "捕获具体异常", "合理使用 else 和 finally", "主动 raise 业务错误", "用正常、边界和错误样例测试函数"],
        "observations": ["except 只处理预期异常", "else 仅在无异常时运行", "finally 始终运行", "错误信息应包含原始输入和修复方向"],
        "sections": [
            section("12.1 常见异常与 Traceback", "先读 Traceback 最后一行的异常类型和消息，再回到最接近自己代码的位置。不同错误需要不同修复。", """samples = ["35.5", "bad", None]
for sample in samples:
    try:
        amount = float(sample)
    except ValueError:
        print(repr(sample), "-> ValueError：文本不是数字")
    except TypeError:
        print(repr(sample), "-> TypeError：输入类型不支持")
    else:
        print(repr(sample), "->", amount)""", "35.5 成功；bad 触发 ValueError；None 触发 TypeError。"),
            section("12.2 try、except、else、finally", "try 只包可能失败的最小步骤；else 放成功逻辑；finally 放无论成功失败都要执行的收尾动作。", """text = "2026-08-06"
from datetime import datetime

try:
    parsed = datetime.strptime(text, "%Y-%m-%d")
except ValueError as error:
    print("日期格式错误：", error)
else:
    print("日期有效：", parsed.date())
finally:
    print("日期检查结束")""", "日期解析成功，执行 else，最后仍执行 finally。"),
            section("12.3 raise 与校验函数", "输入违反业务规则时主动 raise，让调用方决定重试、提示还是终止。异常消息必须具体。", """def validate_amount(value):
    try:
        amount = float(value)
    except (TypeError, ValueError) as error:
        raise ValueError("金额必须是数字") from error
    if amount <= 0:
        raise ValueError("金额必须大于 0")
    return amount

for sample in ["35.5", "bad", "0"]:
    try:
        print(sample, "->", validate_amount(sample))
    except ValueError as error:
        print(sample, "->", error)""", "35.5 返回数值；bad 和 0 得到不同的可读原因。"),
            section("12.4 表驱动测试", "把输入、预期结果和场景放在表中逐项运行。测试正常值、临界值和错误值，比只测试一次更可靠。", """def is_valid_index(index, size):
    return 0 <= index < size

cases = [
    {"index": 0, "size": 3, "expected": True, "name": "第一个元素"},
    {"index": 2, "size": 3, "expected": True, "name": "最后一个元素"},
    {"index": 3, "size": 3, "expected": False, "name": "右侧越界"},
    {"index": -1, "size": 3, "expected": False, "name": "负数输入"},
]
for case in cases:
    actual = is_valid_index(case["index"], case["size"])
    print(case["name"], "->", "通过" if actual == case["expected"] else "失败")""", "四个案例都输出“通过”。"),
        ],
        "mistakes": ["使用裸 except 隐藏程序错误", "把整个程序包在一个 try 中", "捕获异常后什么都不记录", "只让代码不报错，不验证结果", "把可恢复输入错误和代码缺陷混为一谈"],
        "guided": {"prompt": "实现 `delete_record(records, number)`：用户编号从 1 开始，非法文本或越界返回具体原因。", "scaffold": """def delete_record(records, number):
    # TODO: 转换编号、校验范围、删除并返回 (record, reason)
    pass

records = [{"id": "R1"}, {"id": "R2"}]
for sample in ["1", "bad", "3"]:
    print(sample, delete_record(records.copy(), sample))"""},
        "challenge": {"prompt": "增强 load_data：不存在文件返回空列表，坏 JSON 返回错误信息，正确文件必须是列表。", "scaffold": """def load_data(path):
    # TODO: 分别处理 FileNotFoundError、JSONDecodeError 和错误根类型
    pass
""", "solution": """import json
from pathlib import Path
from tempfile import TemporaryDirectory

def load_data(path):
    try:
        with path.open(encoding="utf-8") as file:
            data = json.load(file)
    except FileNotFoundError:
        return [], "首次使用，已创建空账本"
    except json.JSONDecodeError as error:
        return [], f"JSON 格式错误：第 {error.lineno} 行"
    if not isinstance(data, list):
        return [], "账本根结构必须是列表"
    return data, "读取成功"

with TemporaryDirectory() as folder:
    root = Path(folder)
    missing = root / "missing.json"
    broken = root / "broken.json"
    valid = root / "valid.json"
    broken.write_text("{bad json", encoding="utf-8")
    valid.write_text('[{"amount": 35.5}]', encoding="utf-8")
    results = [load_data(path) for path in [missing, broken, valid]]
    for result in results:
        print(result)
    _ok = results[0][0] == [] and "格式错误" in results[1][1] and len(results[2][0]) == 1
    print("诊断：", "通过" if _ok else "检查异常分支或返回契约")"""},
        "next": "核心函数已可验证。最后一章把代码拆成模块，并比较函数式设计与简单类封装。",
    },
    {
        "file": "course-chapter-time.ipynb",
        "number": 13,
        "title": "模块、类与项目组织",
        "bridge": "前 12 章已经实现记账助手的主要零件。本章组织文件结构、入口和可选的面向对象封装。",
        "task": "设计 finance_app 项目结构，理解 import 与 __name__，并用 Record 类封装一条账目。",
        "outline": ["13.1 模块、包与导入", "13.2 __name__ 与程序入口", "13.3 类、实例与 __str__", "13.4 项目分层与重构"],
        "goals": ["说明模块和包的职责", "使用受保护的主程序入口", "定义简单类与实例方法", "判断何时使用函数或类", "画出记账助手模块依赖"],
        "observations": ["import 模块时会执行模块顶层代码", "入口保护避免导入时启动菜单", "类将相关数据和行为放在一起", "文件拆分应遵循职责而不是代码行数"],
        "sections": [
            section("13.1 模块、包与导入", "一个 .py 文件就是模块；带 __init__.py 的目录可以作为包。导入应清楚指出来源，避免 import *。", """import json
from datetime import datetime
from pathlib import Path

print("json 模块：", json.__name__)
print("datetime 类：", datetime.__name__)
print("当前目录：", Path.cwd())""", "显示模块和类名称，并输出当前工作目录。"),
            section("13.2 __name__ 与程序入口", "只有直接运行 main.py 时才启动交互菜单；被测试或其他模块导入时只提供函数。", """def main():
    print("启动个人日常记账助手")

print("当前模块名称：", __name__)
if __name__ == "__main__":
    main()""", "在 Notebook 中 __name__ 通常为 __main__，因此调用 main。"),
            section("13.3 Record 类", "当日期、类型、金额和显示行为总是一起出现时，可以使用类。基础项目仍可保持字典与函数实现。", """class Record:
    def __init__(self, date, record_type, category, amount, note=""):
        self.date = date
        self.record_type = record_type
        self.category = category
        self.amount = float(amount)
        self.note = note

    def __str__(self):
        fields = (
            self.date,
            self.record_type,
            self.category,
            f"{self.amount:.2f}",
            self.note,
        )
        return " | ".join(fields)

record = Record("2026-08-06", "支出", "餐饮", 35.5, "午餐")
print(record)""", "打印一行格式统一的账目文本。"),
            section("13.4 项目职责拆分", "file_handler 只读写，operations 处理记录，utils 校验输入，main 负责交互。模块间传递参数和返回值，不依赖隐式全局变量。", """project_files = {
    "main.py": ["main", "show_menu"],
    "modules/file_handler.py": ["load_data", "save_data"],
    "modules/operations.py": ["add_record", "search_records", "delete_record", "statistics"],
    "modules/utils.py": ["validate_date", "validate_amount", "input_choice"],
}
for file_name, functions in project_files.items():
    print(f"{file_name:<28} -> {', '.join(functions)}")""", "输出四个文件及各自负责的函数，职责不重复。"),
        ],
        "mistakes": ["导入模块时立即启动 input 循环", "把所有代码拆成很多只有一两行的文件", "用全局变量在模块间共享记录", "为了加分类而把简单函数全部改成类", "模块之间相互导入形成循环依赖"],
        "guided": {"prompt": "为 Record 类增加 `to_dict()`，并确保结果可被 json.dumps 序列化。", "scaffold": """import json

class Record:
    def __init__(self, date, record_type, category, amount, note=""):
        self.date = date
        self.record_type = record_type
        self.category = category
        self.amount = float(amount)
        self.note = note

    def to_dict(self):
        # TODO: 返回只包含 JSON 基本类型的字典
        pass
"""},
        "challenge": {"prompt": "设计 AccountBook 类：保存 records，并复用已有的 add、search 和 statistics 函数；不要在类中调用 input。", "scaffold": """class AccountBook:
    def __init__(self, records=None):
        self.records = [] if records is None else records

    # TODO: add、search、statistics
""", "solution": """class AccountBook:
    def __init__(self, records=None):
        self.records = [] if records is None else list(records)

    def add(self, record):
        self.records.append(record)

    def search(self, record_type=None):
        if record_type is None:
            return list(self.records)
        return [item for item in self.records if item["type"] == record_type]

    def statistics(self):
        income = sum(item["amount"] for item in self.records if item["type"] == "收入")
        expense = sum(item["amount"] for item in self.records if item["type"] == "支出")
        return {"income": income, "expense": expense, "balance": income - expense}

book = AccountBook()
book.add({"type": "收入", "amount": 5000.0})
book.add({"type": "支出", "amount": 35.5})
print(book.search("支出"))
print(book.statistics())
_ok = book.statistics()["balance"] == 4964.5
print("诊断：", "通过" if _ok else "检查实例状态或统计方法")"""},
        "next": "现在可以进入模块大作业：把数据模型、函数、JSON、异常和菜单组合成完整记账助手。",
    },
]


def notebook_metadata(chapter):
    number = chapter["number"]
    title = chapter["title"]
    return {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.11"},
        "chapter": number,
        "chapter_title": title,
        "chapter_label": f"第{number}章 {title}",
        "chapter_module": "python",
        "estimated_minutes": 45,
        "tags": ["Python基础", "渐进课程", "个人记账助手"],
        "python_foundation_version": VERSION,
        "learning_loop_version": LEARNING_LOOP_VERSION,
    }


def build_lesson(chapter):
    number = chapter["number"]
    slug = chapter["file"].replace(".ipynb", "")
    supplement = SUPPLEMENTS[number]
    method_focus = TOPIC_BY_PARENT[number]
    method_drill = METHOD_DRILLS[number]
    outline = "\n".join(f"- {item}" for item in chapter["outline"])
    goals = "\n".join(f"- {item}" for item in chapter["goals"])
    observations = "\n".join(f"- {item}" for item in chapter["observations"])
    mistakes = "\n".join(f"- {item}" for item in chapter["mistakes"])
    cells = [markdown(slug, "title", f"# 第{number}章 {chapter['title']}\n\n{chapter['bridge']}")]
    cells.extend(
        markdown(slug, f"orientation-{index}", f"## {item['title']}\n\n{item['body']}")
        for index, item in enumerate(chapter.get("orientation", []), start=1)
    )
    cells.extend([
        markdown(
            slug,
            "task",
            "## 这一章要解决什么\n\n"
            f"{chapter['task']}\n\n{supplement['plain']}",
        ),
        markdown(slug, "outline", f"## 这一章怎么走\n\n{outline}"),
        markdown(
            slug,
            "goals",
            f"## 学完以后，你应该能做到\n\n{goals}",
        ),
        markdown(
            slug,
            "observations",
            f"## 跑代码时别只看“没报错”\n\n{observations}",
        ),
    ])
    for index, item in enumerate(chapter["sections"], start=1):
        cells.extend([
            markdown(slug, f"section-{index}", f"## {item['title']}\n\n{item['explanation']}"),
            code(slug, f"example-{index}", item["example"], ["example"]),
            markdown(
                slug,
                f"expected-{index}",
                "### 这段代码到底说明了什么\n\n"
                f"{item['expected']}\n\n"
                "别急着往下点。改一个输入，先猜结果，再运行。",
            ),
        ])
    cells.extend([
        markdown(
            slug,
            "method-toolbox",
            "## 常用函数与方法\n\n" + supplement["toolbox"],
        ),
        markdown(
            slug,
            "method-focus",
            "## 把方法用在这一章\n\n"
            f"### 进一步练习：{method_focus['title']}\n\n"
            f"{method_focus['why']} 下面的内容和前面的核心概念属于同一件事，"
            "现在把它们连起来练。",
        ),
    ])
    for index, item in enumerate(supplement["sections"], start=1):
        cells.extend([
            markdown(
                slug,
                f"method-section-{index}",
                f"## {item['title']}\n\n{item['explanation']}",
            ),
            code(slug, f"method-example-{index}", item["example"], ["example"]),
            markdown(
                slug,
                f"method-result-{index}",
                f"### 运行后要看什么\n\n{item['expected']}",
            ),
        ])
    method_drill_cells = [
        markdown(
            slug,
            "method-drill-title",
            f"## 小练习：{method_drill['title']}\n\n"
            f"{method_drill['prompt']}\n\n"
            "先自己运行和修改代码，再打开参考实现核对每一步。",
        ),
        code(
            slug,
            "method-drill",
            method_drill["scaffold"],
            ["exercise", "method-drill"],
        ),
        markdown(
            slug,
            "method-drill-solution-title",
            "### 参考实现\n\n"
            "核对时不要只看最后一个输出：先确认输入有没有被转换，"
            "再确认中间变量和边界判断是否符合题意。",
        ),
        code(
            slug,
            "method-drill-solution",
            method_drill["solution"],
            ["solution", "check"],
        ),
    ]
    if not chapter.get("intro_checklist"):
        cells.extend(method_drill_cells)
    cells.append(markdown(slug, "mistakes", f"## 最容易踩的坑\n\n{mistakes}"))
    if chapter.get("intro_checklist"):
        checklist = "\n".join(f"- {item}" for item in chapter["intro_checklist"])
        cells.extend([
            markdown(
                slug,
                "intro-checklist",
                "## 本章先做到这些\n\n"
                f"{checklist}\n\n"
                "本章到这里就够了：先熟悉页面和运行过程，不需要独立编写业务代码。",
            ),
            markdown(
                slug,
                "intro-next-step",
                "## 下一章再开始写\n\n"
                "第 2 章会从变量、类型和运算符开始。到那时你会在已有 Notebook 工作方式的基础上，"
                "逐步修改输入、运行计算并检查结果。",
            ),
        ])
    else:
        cells.extend([
        markdown(slug, "guided-title", f"## 跟着做一遍\n\n{chapter['guided']['prompt']}"),
        code(slug, "guided", chapter["guided"]["scaffold"], ["exercise", "guided"]),
        markdown(slug, "challenge-title", f"## 现在你自己来\n\n{chapter['challenge']['prompt']}\n\n先独立完成，再展开参考实现。"),
        code(slug, "challenge", chapter["challenge"]["scaffold"], ["exercise"]),
        markdown(slug, "solution-title", "## 做完再看参考\n\n别只核对最后一个数字。逐行比较参数、返回值和边界处理，看看自己的代码为什么对，或者具体错在哪。"),
        code(slug, "solution", chapter["challenge"]["solution"], ["solution", "check"]),
        ])
    cells.append(markdown(
        slug,
        "summary",
        "## 收个尾，再往下一章走\n\n"
        f"{chapter['next']}\n\n"
        "别拿“代码跑过了”当完成。你至少要能关掉参考答案，"
        "重新写一遍，并说清一个边界情况。",
    ))
    return {"cells": cells, "metadata": notebook_metadata(chapter), "nbformat": 4, "nbformat_minor": 5}


EXTRA_CHAPTERS = [
    {
        "file": "course-chapter-7.ipynb",
        "number": 7,
        "title": "条件判断：把规则写清楚",
        "bridge": "上一章已经有结构化账目。本章把金额、类型、分类和日期规则转成明确分支。",
        "task": "为一条账目生成“有效、需复核、拒绝”标签，并验证所有临界值。",
        "outline": ["7.1 布尔表达式与 if", "7.2 elif、else 与规则顺序", "7.3 嵌套条件与条件表达式"],
        "goals": ["写出产生 bool 的条件", "使用 if/elif/else 处理互斥分支", "安排规则优先级", "测试刚好等于门槛的值"],
        "observations": ["分支从上到下判断", "只执行第一个满足的分支", "and 和 or 会短路", "条件表达式只适合简单二选一"],
        "sections": [
            section("7.1 布尔表达式与 if", "条件表达式回答是或否。先打印单个条件，再决定是否组合，便于定位是哪条规则失败。", """record = {"type": "支出", "category": "餐饮", "amount": 35.5}
type_ok = record["type"] in {"收入", "支出"}
category_ok = record["category"] in {"餐饮", "交通", "购物", "工资", "其他"}
amount_ok = record["amount"] > 0
print(type_ok, category_ok, amount_ok)
if type_ok and category_ok and amount_ok:
    print("记录有效")""", "三个条件均为 True，随后输出“记录有效”。"),
            section("7.2 多分支和优先级", "先判断最不能接受的情况，再判断需要人工复核的情况，最后才是正常记录。分支顺序就是业务口径。", """amount = 5200.0
if amount <= 0:
    label = "拒绝：金额必须为正数"
elif amount >= 5000:
    label = "需复核：大额交易"
else:
    label = "有效"
print(label)""", "5200 被标记为大额交易；0 和负数必须进入拒绝分支。"),
            section("7.3 组合规则与条件表达式", "复杂规则先拆成命名布尔值。条件表达式用于很短的二选一展示，不应用来嵌套多层业务规则。", """record_type = "支出"
category = "工资"
amount = 5000.0
type_category_match = not (record_type == "支出" and category == "工资")
amount_label = "大额" if amount >= 5000 else "普通"
print("类型分类匹配：", type_category_match)
print("金额标签：", amount_label)""", "类型分类不匹配为 False，金额标签为“大额”。"),
        ],
        "mistakes": ["把更宽泛的条件写在更严格条件之前", "只测试正常值，不测试 0、门槛和空值", "使用多个嵌套条件代替具名布尔变量", "混淆 and 与 or"],
        "guided": {"prompt": "校验收入不能使用餐饮分类，支出不能使用工资分类，输出明确原因。", "scaffold": """record_type = "支出"
category = "工资"
# TODO: 设置 valid 和 reason
valid = True
reason = ""
print(valid, reason)"""},
        "challenge": {"prompt": "实现一段账目校验：依次检查类型、金额、分类和大额复核门槛。", "scaffold": """record = {"type": "支出", "category": "购物", "amount": 5000.0}
# TODO: 生成 status 和 reason
""", "solution": """record = {"type": "支出", "category": "购物", "amount": 5000.0}
allowed_categories = {"餐饮", "交通", "购物", "工资", "其他"}
if record["type"] not in {"收入", "支出"}:
    status, reason = "拒绝", "未知类型"
elif record["amount"] <= 0:
    status, reason = "拒绝", "金额必须为正数"
elif record["category"] not in allowed_categories:
    status, reason = "拒绝", "未知分类"
elif record["amount"] >= 5000:
    status, reason = "复核", "金额达到 5000 元"
else:
    status, reason = "有效", "通过全部规则"
print(status, reason)
_ok = status == "复核" and "5000" in reason
print("诊断：", "通过" if _ok else "检查分支顺序和边界")"""},
        "next": "一条记录已经可以分类。下一章通过循环把同一组规则应用到整批账目。",
    },
    {
        "file": "course-chapter-8.ipynb",
        "number": 8,
        "title": "循环与迭代：批量处理账目",
        "bridge": "条件分支处理一条记录，循环让同一规则稳定地处理多条记录。",
        "task": "遍历账目列表，累计收入和支出，跳过无效记录，并生成带编号的处理结果。",
        "outline": ["8.1 for、range 与 enumerate", "8.2 累计、continue 与 break", "8.3 while 与未知次数循环"],
        "goals": ["遍历列表和字典", "使用 enumerate 获取展示编号", "维护累计变量", "区分 continue、break 和 pass", "写出可终止的 while"],
        "observations": ["累计变量必须在循环前初始化", "continue 只跳过当前轮", "break 结束整个循环", "while 条件必须最终发生变化"],
        "sections": [
            section("8.1 for 与 enumerate", "for 直接遍历数据；enumerate 在展示或删除时提供编号，避免手动维护索引。", """records = [
    {"category": "餐饮", "amount": 35.5},
    {"category": "交通", "amount": 18.0},
]
for number, record in enumerate(records, start=1):
    print(f"{number}. {record['category']:<4} {record['amount']:>7.2f} 元")""", "输出两行编号账目，分类和金额对齐。"),
            section("8.2 累计与循环控制", "累计变量在循环前创建。遇到无效值时先记录原因，再 continue；只有确认无需继续时才 break。", """amounts = [35.5, -1, 18.0, 0, 299.0]
total = 0.0
valid_count = 0
for amount in amounts:
    if amount <= 0:
        print("跳过：", amount)
        continue
    total += amount
    valid_count += 1
print("有效数量：", valid_count)
print("有效合计：", total)""", "跳过 -1 和 0，有效数量 3，合计 352.5。"),
            section("8.3 while 与终止条件", "while 适合次数未知、由状态决定的重复操作。必须明确状态如何变化，并设置合理的退出条件。", """balance = 1000.0
month = 0
while balance < 1200:
    balance += 80
    month += 1
    if month >= 12:
        break
print(month, balance)""", "3 个月后余额为 1240.0，循环正常结束。"),
        ],
        "mistakes": ["在循环内部重置累计变量", "continue 前忘记更新 while 状态", "修改正在遍历的列表", "用 range(len(...)) 代替可读的直接遍历"],
        "guided": {"prompt": "遍历账目，分别累计收入和支出，并输出每条记录的处理编号。", "scaffold": """records = [
    {"type": "收入", "amount": 5000.0},
    {"type": "支出", "amount": 35.5},
    {"type": "支出", "amount": 18.0},
]
income_total = 0.0
expense_total = 0.0
# TODO: 遍历并累计
"""},
        "challenge": {"prompt": "批量处理含坏金额的文本记录，分别保留 valid 和 rejected，并计算有效金额合计。", "scaffold": """rows = ["餐饮|35.5", "交通|bad", "购物|299.0", "其他|-1"]
valid = []
rejected = []
total = 0.0
# TODO: split、转换、判断并累计
""", "solution": """rows = ["餐饮|35.5", "交通|bad", "购物|299.0", "其他|-1"]
valid = []
rejected = []
total = 0.0
for row in rows:
    category, amount_text = row.split("|")
    try:
        amount = float(amount_text)
    except ValueError:
        rejected.append({"raw": row, "reason": "金额格式错误"})
        continue
    if amount <= 0:
        rejected.append({"raw": row, "reason": "金额必须为正数"})
        continue
    valid.append({"category": category, "amount": amount})
    total += amount
print(valid, rejected, total)
_ok = len(valid) == 2 and len(rejected) == 2 and total == 334.5
print("诊断：", "通过" if _ok else "检查异常记录或累计位置")"""},
        "next": "循环中的解析、校验和累计开始变长。下一章把这些稳定步骤封装成小函数。",
    },
    {
        "file": "course-chapter-9.ipynb",
        "number": 9,
        "title": "函数基础：参数、返回值与职责",
        "bridge": "循环能批量工作，但重复代码难以测试和复用。本章先把一个动作封装成一个函数。",
        "task": "实现金额校验、结余计算和记录格式化函数，并组合成一条可测试的处理流程。",
        "outline": ["9.1 def、调用与文档字符串", "9.2 参数、默认参数与关键字参数", "9.3 return、多返回值与作用域"],
        "goals": ["定义并调用单一职责函数", "设计位置参数和默认参数", "区分 return 与 print", "解包多个返回值", "说明局部变量作用域"],
        "observations": ["定义函数时不会执行函数体", "无 return 时返回 None", "默认参数只应保存稳定的不可变值", "局部变量在函数外不可直接访问"],
        "sections": [
            section("9.1 定义、调用与文档字符串", "函数名说明动作，文档字符串说明输入和返回值。调用时参数进入函数，运行到 return 后结果交回调用方。", """def calculate_balance(income, expense):
    \"\"\"返回收入扣除支出后的结余。\"\"\"
    return income - expense

balance = calculate_balance(5000.0, 1320.0)
print("结余：", balance)""", "函数返回 3680.0，调用方决定如何显示。"),
            section("9.2 参数和默认值", "必需信息使用位置参数；常见且稳定的规则可使用默认参数。关键字调用能增强可读性。", """def apply_fee(amount, fee_rate=0.006):
    \"\"\"返回扣除手续费后的到账金额。\"\"\"
    fee = amount * fee_rate
    return amount - fee

print(apply_fee(1000))
print(apply_fee(amount=1000, fee_rate=0.01))""", "默认费率到账 994.0；1% 费率到账 990.0。"),
            section("9.3 return、多返回值与作用域", "return 可以返回一个值或打包多个值。函数内部的局部变量只服务当前调用，避免污染外部状态。", """def summarize_amounts(amounts):
    \"\"\"返回合计、平均值、最小值和最大值。\"\"\"
    total = sum(amounts)
    average = total / len(amounts)
    return total, average, min(amounts), max(amounts)

total, average, minimum, maximum = summarize_amounts([35.5, 18.0, 299.0])
print(total, round(average, 2), minimum, maximum)""", "合计 352.5，平均值 117.5，最小 18.0，最大 299.0。"),
            section("9.4 return 与 print 的区别", "print 只显示信息并返回 None；return 让结果可以赋值、比较、传给另一个函数或写入文件。", """def show_total(values):
    print("合计：", sum(values))

def get_total(values):
    return sum(values)

shown = show_total([10, 20])
returned = get_total([10, 20])
print("show_total 的返回值：", shown)
print("get_total 的返回值：", returned)""", "show_total 返回 None，get_total 返回 30。"),
        ],
        "mistakes": ["只定义函数却没有调用", "用 print 代替 return", "默认参数使用可变列表或字典", "函数同时读取输入、写文件、统计和打印", "忘记处理空列表"],
        "guided": {"prompt": "编写 `validate_amount(value)`，成功时返回 `(True, 数值, '')`，失败时返回 `(False, None, 原因)`。", "scaffold": """def validate_amount(value):
    \"\"\"校验并转换正数金额。\"\"\"
    # TODO: 处理格式错误和非正数
    pass

for sample in ["35.5", "bad", "0"]:
    print(sample, validate_amount(sample))"""},
        "challenge": {"prompt": "实现并组合 `validate_amount`、`calculate_balance` 和 `format_summary` 三个函数。", "scaffold": """def validate_amount(value):
    pass

def calculate_balance(income, expense):
    pass

def format_summary(income, expense, balance):
    pass

# TODO: 组合调用并处理无效输入
""", "solution": """def validate_amount(value):
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return False, None, "金额必须是数字"
    if amount < 0:
        return False, None, "金额不能为负数"
    return True, amount, ""

def calculate_balance(income, expense):
    return income - expense

def format_summary(income, expense, balance):
    return f"收入 {income:.2f} | 支出 {expense:.2f} | 结余 {balance:.2f}"

income_result = validate_amount("5000")
expense_result = validate_amount("1320")
if income_result[0] and expense_result[0]:
    income = income_result[1]
    expense = expense_result[1]
    balance = calculate_balance(income, expense)
    print(format_summary(income, expense, balance))
_ok = balance == 3680.0
print("诊断：", "通过" if _ok else "检查函数返回值和组合顺序")"""},
        "next": "基础函数已经能组合。下一章学习把函数作为参数、使用 key 和 lambda，并构建查询与统计函数。",
    },
    {
        "file": "course-chapter-2.ipynb",
        "number": 2,
        "title": "变量、数据类型与运算符",
        "bridge": "上一章已经会保存输入。本章进一步明确每个变量的类型、单位和业务含义。",
        "task": "根据单价、数量、优惠券和会员状态，计算一笔订单的应付金额与规则标签。",
        "outline": ["2.1 变量、命名与动态类型", "2.2 数值运算和类型转换", "2.3 比较与逻辑运算"],
        "goals": ["识别 str、int、float、bool 和 None", "使用具名中间变量拆解公式", "理解 /、//、% 和 **", "用比较与逻辑运算表达规则"],
        "observations": ["type 返回变量的运行时类型", "普通除法通常返回 float", "比较表达式的结果是 True 或 False"],
        "sections": [
            section("2.1 变量、命名与动态类型", "变量无需预先声明类型，但名称必须说明内容。金额、数量、状态和缺失值应使用不同类型。", """product = "机械键盘"
quantity = 2
unit_price = 299.0
is_member = True
coupon = None
for value in [product, quantity, unit_price, is_member, coupon]:
    print(repr(value), "->", type(value).__name__)""", "依次显示 str、int、float、bool 和 NoneType。"),
            section("2.2 数值运算和中间变量", "复杂公式应拆成小计、优惠和应付金额。每个变量只表达一个口径，便于检查。", """unit_price = 128.0
quantity = 3
coupon_amount = 30.0
subtotal = unit_price * quantity
payable = subtotal - coupon_amount
average_price = payable / quantity
print(subtotal, payable, round(average_price, 2))""", "小计 384.0，应付 354.0，平均每件 118.0。"),
            section("2.3 比较与逻辑运算", "先把单个规则保存为布尔变量，再使用 and、or、not 组合，避免一行条件难以排错。", """payable = 354.0
quantity = 3
is_member = True
free_shipping = payable >= 300
needs_review = payable >= 5000 or quantity >= 20
valid_order = payable > 0 and quantity > 0
print(free_shipping, needs_review, valid_order, is_member)""", "依次得到 True、False、True、True。"),
        ],
        "mistakes": ["使用 = 代替 == 判断相等", "变量名覆盖 sum、list 等内置函数", "金额和数量混用，输出没有单位", "直接对不确定的文本调用 int"],
        "guided": {"prompt": "把会员九折改为满 300 减 30，并判断优惠后是否仍满足包邮。", "scaffold": """subtotal = 384.0
# TODO: 满 300 减 30，否则不减
discount = 0.0
payable = subtotal - discount
free_shipping = False
print(discount, payable, free_shipping)"""},
        "challenge": {"prompt": "计算一笔账目的税后金额：金额必须为正，税率在 0 到 1 之间，并输出规则检查结果。", "scaffold": """amount = 1000.0
tax_rate = 0.06
# TODO: 计算 tax 和 total，并定义 inputs_valid
""", "solution": """amount = 1000.0
tax_rate = 0.06
inputs_valid = amount > 0 and 0 <= tax_rate <= 1
tax = amount * tax_rate
total = amount + tax
print(f"税额：{tax:.2f}，含税金额：{total:.2f}")
print("诊断：", "通过" if inputs_valid and total == 1060.0 else "检查类型、范围或公式")"""},
        "next": "真实输入通常先以字符串出现。下一章会把一行文本拆成可继续计算的字段。",
    },
    {
        "file": "course-chapter-3.ipynb",
        "number": 3,
        "title": "字符串：从文本到字段",
        "bridge": "上一章的变量已经有明确类型，但用户输入和文件内容最初通常都是字符串。",
        "task": "把一条带空格、大小写混杂的账目文本清洗为日期、类型、分类、金额和备注。",
        "outline": ["3.1 定义、索引与切片", "3.2 清洗、查找与替换", "3.3 拆分、拼接与格式化"],
        "goals": ["使用索引和切片读取文本", "用 strip 和 replace 清洗字段", "用 split 拆分、join 拼接", "使用 f-string 控制金额格式"],
        "observations": ["字符串不可原地修改", "split 返回列表", "strip 只移除两端字符", "f-string 可以控制小数位和对齐"],
        "sections": [
            section("3.1 定义、索引与切片", "索引读取一个字符，切片读取一个范围；负数索引从末尾开始。字符串不可变，操作会返回新字符串。", """date_text = "2026-08-06"
print("年份：", date_text[:4])
print("月份：", date_text[5:7])
print("日期：", date_text[-2:])
print("原文本仍是：", date_text)""", "年份 2026、月份 08、日期 06，原文本不变。"),
            section("3.2 清洗、查找与替换", "清洗时先去两端空白，再统一有限字段的写法。replace 适合确定的替换规则，不适合模糊删除。", """raw_type = "  EXPENSE  "
raw_note = "午餐，客户会议"
record_type = raw_type.strip().lower().replace("expense", "支出")
note = raw_note.replace("，", ",")
print(repr(record_type), repr(note))""", "类型变为“支出”，中文逗号被替换为英文逗号。"),
            section("3.3 拆分、拼接与格式化", "先检查分隔规则，再拆分和逐段清洗。固定字段可以解包；字段数量不确定时先保存列表。", """raw = " 2026-08-06 | 支出 | 餐饮 | 35.5 | 午餐 "
parts = [part.strip() for part in raw.split("|")]
date, record_type, category, amount_text, note = parts
summary = " / ".join([date, record_type, category])
print(summary)
print(f"金额文本：{amount_text}，备注：{note}")""", "得到 5 个干净字段，并输出日期 / 类型 / 分类。"),
        ],
        "mistakes": ["把字符串方法当作原地修改，没有接收返回值", "使用 strip 删除中间字符", "字段数不正确时直接解包", "一次罗列几十个字符串方法但不知道任务"],
        "guided": {"prompt": "清洗 ` 2026/08/07 ; INCOME ; 工资 ; 5000 `，统一分隔符、类型和日期格式。", "scaffold": """raw = " 2026/08/07 ; INCOME ; 工资 ; 5000 "
# TODO: split、strip，并将 / 替换为 -，INCOME 替换为 收入
fields = []
print(fields)"""},
        "challenge": {"prompt": "编写代码清洗一条 5 字段账目文本，并检查字段数量与金额文本是否可以表示正数。", "scaffold": """raw = "2026-08-08|支出|交通|18.0|地铁"
# TODO: 拆分、检查字段数、转换金额并输出标准文本
""", "solution": """raw = "2026-08-08|支出|交通|18.0|地铁"
fields = [part.strip() for part in raw.split("|")]
field_count_ok = len(fields) == 5
date, record_type, category, amount_text, note = fields
amount = float(amount_text)
amount_ok = amount > 0
print(f"{date} | {record_type} | {category} | {amount:.2f} | {note}")
print("诊断：", "通过" if field_count_ok and amount_ok else "检查字段数或金额")"""},
        "next": "单条文本已经可以变成字段。下一章使用列表保存和处理多条账目。",
    },
    {
        "file": "course-chapter-4.ipynb",
        "number": 4,
        "title": "列表：管理多条记录",
        "bridge": "上一章处理了一条账目。本章把多条记录放入有顺序、可修改的列表。",
        "task": "完成账目列表的新增、查询、删除、排序和筛选，同时保留原始数据。",
        "outline": ["4.1 创建、索引与切片", "4.2 增删改查与复制", "4.3 排序、筛选与推导式"],
        "goals": ["创建并读取列表", "使用 append、insert、pop 和 remove", "区分 sort 与 sorted", "使用简单列表推导式"],
        "observations": ["append 会修改原列表", "切片返回新列表", "sort 返回 None", "浅复制可避免顶层列表被一起修改"],
        "sections": [
            section("4.1 创建、索引与切片", "列表适合保存有顺序的一批同类记录。索引读取一项，切片读取一段；越界索引会报错。", """amounts = [35.5, 18.0, 299.0, 12.0]
print("第一笔：", amounts[0])
print("最后一笔：", amounts[-1])
print("前两笔：", amounts[:2])
print("记录数：", len(amounts))""", "第一笔 35.5，最后一笔 12.0，前两笔组成新列表。"),
            section("4.2 增删改查与复制", "append 追加，insert 指定位置插入，pop 按索引删除并返回元素。修改前复制可以保留基准数据。", """records = ["餐饮:35.5", "交通:18.0"]
baseline = records.copy()
records.append("购物:299.0")
removed = records.pop(1)
print("当前：", records)
print("删除：", removed)
print("基准：", baseline)""", "当前列表发生变化，baseline 仍保留原来的两条记录。"),
            section("4.3 排序、筛选与推导式", "sorted 返回新列表；列表推导式适合简短的映射或筛选。复杂规则应使用普通循环。", """amounts = [35.5, 18.0, 299.0, 12.0]
descending = sorted(amounts, reverse=True)
large = [amount for amount in amounts if amount >= 100]
labels = [f"{amount:.2f} 元" for amount in amounts]
print(descending)
print(large)
print(labels)""", "降序列表不改变原列表；large 只包含 299.0。"),
        ],
        "mistakes": ["把 append 的返回值赋回列表", "边遍历边删除同一个列表", "混淆 sort 原地修改和 sorted 返回新列表", "索引从 1 开始计算"],
        "guided": {"prompt": "在金额列表中追加两笔记录，删除第 2 笔，再输出最高的 3 笔金额。", "scaffold": """amounts = [35.5, 18.0, 299.0]
# TODO: 追加 66 和 120，删除索引 1，输出 top_three
top_three = []
print(top_three)"""},
        "challenge": {"prompt": "从账目字典列表中筛选支出并按金额降序排列，不修改原列表。", "scaffold": """records = [
    {"type": "支出", "category": "餐饮", "amount": 35.5},
    {"type": "收入", "category": "工资", "amount": 5000.0},
    {"type": "支出", "category": "购物", "amount": 299.0},
]
# TODO: 生成 expenses 和 ranked
""", "solution": """records = [
    {"type": "支出", "category": "餐饮", "amount": 35.5},
    {"type": "收入", "category": "工资", "amount": 5000.0},
    {"type": "支出", "category": "购物", "amount": 299.0},
]
expenses = [record for record in records if record["type"] == "支出"]
ranked = sorted(expenses, key=lambda record: record["amount"], reverse=True)
print(ranked)
_ok = len(ranked) == 2 and ranked[0]["amount"] == 299.0
print("诊断：", "通过" if _ok else "检查筛选或排序键")"""},
        "next": "列表可修改，适合批量记录。下一章用元组表达不希望被随意改变的固定字段结构。",
    },
    {
        "file": "course-chapter-5.ipynb",
        "number": 5,
        "title": "元组：固定字段与解包",
        "bridge": "列表负责保存一批记录；元组适合表达一条记录中位置固定、不希望被随意改写的字段。",
        "task": "定义账目字段模式，完成创建、索引、解包、扩展解包与不可变性实验。",
        "outline": ["5.1 创建与单元素元组", "5.2 索引、切片与不可变性", "5.3 解包与函数多返回值"],
        "goals": ["正确创建普通与单元素元组", "说明元组不可变的含义", "使用基本和星号解包", "读取函数返回的多个结果"],
        "observations": ["逗号而不是括号决定元组", "元组不能给索引重新赋值", "解包变量数必须匹配", "多返回值本质上是元组"],
        "sections": [
            section("5.1 创建与单元素元组", "固定字段名和只读选项可以放在元组中。单元素元组必须保留尾部逗号。", """schema = ("date", "type", "category", "amount", "note")
only_category = ("餐饮",)
print(schema)
print(type(only_category).__name__, len(only_category))""", "schema 有 5 项，only_category 的类型是 tuple。"),
            section("5.2 索引、切片与不可变性", "元组支持读取、切片和成员检查，但不支持 append、pop 或索引赋值。不可变有助于稳定字段约定。", """record = ("2026-08-06", "支出", "餐饮", 35.5, "午餐")
print(record[0], record[-1])
print(record[:3])
print("支出" in record)""", "输出日期、备注、前三个字段，并确认“支出”存在。"),
            section("5.3 解包与多返回值", "解包让位置含义显式化；星号变量接收中间的多项。函数的多个返回值可以直接解包。", """record = ("2026-08-06", "支出", "餐饮", 35.5, "午餐")
date, record_type, category, amount, note = record
first, *middle, last = record
print(date, amount)
print(first, middle, last)""", "基本解包得到 5 个变量；middle 是包含 3 项的列表。"),
        ],
        "mistakes": ["把 `(1)` 当作单元素元组", "尝试修改元组索引", "解包变量数量与元素数量不一致", "把所有数据都改成元组，失去字段名称"],
        "guided": {"prompt": "把一条账目元组解包，生成“日期 分类 金额”的摘要，同时保留备注。", "scaffold": """record = ("2026-08-07", "支出", "交通", 18.0, "地铁")
# TODO: 解包并输出摘要
"""},
        "challenge": {"prompt": "定义函数 `amount_range`，返回金额列表的最小值、最大值和跨度，并使用元组解包结果。", "scaffold": """def amount_range(amounts):
    # TODO: 返回 minimum, maximum, span
    pass

minimum, maximum, span = amount_range([35.5, 18.0, 299.0])
""", "solution": """def amount_range(amounts):
    minimum = min(amounts)
    maximum = max(amounts)
    return minimum, maximum, maximum - minimum

minimum, maximum, span = amount_range([35.5, 18.0, 299.0])
print(minimum, maximum, span)
_ok = (minimum, maximum, span) == (18.0, 299.0, 281.0)
print("诊断：", "通过" if _ok else "检查返回顺序或跨度")"""},
        "next": "元组的位置含义仍需记忆。下一章改用字典为字段命名，并使用集合解决去重问题。",
    },
    {
        "file": "course-chapter-6.ipynb",
        "number": 6,
        "title": "字典与集合：命名记录与去重",
        "bridge": "元组稳定但依赖位置。字典用键命名字段，集合用于唯一成员和集合关系。",
        "task": "把账目表示为字典，安全读写字段，按分类聚合，并发现重复记录编号。",
        "outline": ["6.1 字典创建、访问与更新", "6.2 遍历与字典推导式", "6.3 集合去重与关系运算"],
        "goals": ["创建并更新字典", "区分索引访问与 get", "遍历 keys、values 和 items", "使用集合去重、交集和差集"],
        "observations": ["访问不存在的键会触发 KeyError", "get 可返回默认值", "集合不保证业务展示顺序", "字典和集合推导式会生成新容器"],
        "sections": [
            section("6.1 创建、访问与更新", "一条业务记录优先使用字典，因为键直接表达字段含义。get 适合可选字段，方括号适合必须存在的字段。", """record = {
    "date": "2026-08-06",
    "type": "支出",
    "category": "餐饮",
    "amount": 35.5,
}
record["note"] = "午餐"
print(record["amount"])
print(record.get("merchant", "未填写"))""", "金额为 35.5，缺失商户字段显示“未填写”。"),
            section("6.2 遍历、嵌套与聚合", "items 同时提供键和值。聚合时用分类作为键，用累计金额作为值；get(分类, 0) 可以初始化。", """records = [
    {"category": "餐饮", "amount": 35.5},
    {"category": "交通", "amount": 18.0},
    {"category": "餐饮", "amount": 22.0},
]
totals = {}
for record in records:
    category = record["category"]
    totals[category] = totals.get(category, 0) + record["amount"]
print(totals)""", "餐饮合计 57.5，交通合计 18.0。"),
            section("6.3 集合去重与关系", "集合适合回答“是否出现”“共同有哪些”“只在一边有哪些”。需要保持顺序时不能简单用 set 替换列表。", """record_ids = ["R001", "R002", "R003", "R002"]
duplicates = {item for item in record_ids if record_ids.count(item) > 1}
planned = {"餐饮", "交通", "购物"}
actual = {"餐饮", "交通", "医疗"}
print("重复：", duplicates)
print("共同：", planned & actual)
print("计划外：", actual - planned)""", "重复编号是 R002；共同分类有餐饮、交通；计划外有医疗。"),
        ],
        "mistakes": ["访问可选键时直接使用方括号", "遍历字典时误以为直接得到键和值", "用 set 去重后仍假设保留原顺序", "把可变列表作为字典键或集合元素"],
        "guided": {"prompt": "按收入/支出类型累计金额，并输出每种类型的记录数。", "scaffold": """records = [
    {"type": "收入", "amount": 5000.0},
    {"type": "支出", "amount": 35.5},
    {"type": "支出", "amount": 18.0},
]
# TODO: 生成 totals 和 counts 两个字典
"""},
        "challenge": {"prompt": "发现重复编号，只保留第一次出现的记录，同时把重复记录放入 rejected。", "scaffold": """records = [
    {"id": "R001", "amount": 35.5},
    {"id": "R002", "amount": 18.0},
    {"id": "R001", "amount": 99.0},
]
seen = set()
valid = []
rejected = []
# TODO: 完成去重
""", "solution": """records = [
    {"id": "R001", "amount": 35.5},
    {"id": "R002", "amount": 18.0},
    {"id": "R001", "amount": 99.0},
]
seen = set()
valid = []
rejected = []
for record in records:
    if record["id"] in seen:
        rejected.append(record)
    else:
        seen.add(record["id"])
        valid.append(record)
print(valid, rejected)
_ok = len(valid) == 2 and len(rejected) == 1
print("诊断：", "通过" if _ok else "检查 seen 的更新位置")"""},
        "next": "字典已经能表达完整记录。下一章使用条件分支把业务校验规则写成代码。",
    },
]

CHAPTERS.extend(EXTRA_CHAPTERS)


SUPPLEMENTS = {
    1: {
        "plain": "Notebook 就像一张可以边写说明、边跑代码的草稿纸。真正要养成的习惯不是记住按钮，而是把一件事拆成“输入是什么、怎么算、结果怎么看”三步。代码能运行只是起点，别人重新从第一格跑到最后一格也能得到同样结果，才算靠谱。",
        "toolbox": """| 工具 | 它解决什么问题 | 你要记住的点 |
|---|---|---|
| `print()` | 主动输出带说明的结果 | `sep` 控制间隔，`end` 控制结尾 |
| `type()` | 看一个值的实际类型 | 返回类型对象，不是字符串 |
| `isinstance()` | 判断值是不是某类数据 | 比较 `type(x) == ...` 更灵活 |
| `dir()` | 看对象提供了哪些名字 | 适合探索，不需要全部背下来 |
| `help()` | 查看函数或方法说明 | 重点看参数和返回值 |
| `input()` | 接收键盘输入 | 返回值永远是字符串 |""",
        "sections": [
            section(
                "1.4 print 的 sep、end 和 repr",
                "`print()` 不只是把值扔到屏幕上。`sep` 决定多个值之间放什么，`end` 决定这一行怎么结束；`repr()` 则会把空格、换行这类看不见的字符暴露出来，排查文本问题很有用。",
                """date = "2026-08-06"
category = "餐饮"
amount = 35.5
print(date, category, amount, sep=" | ")
print("金额：", end="")
print(amount)
note = " 午餐 "
print("原始备注：", repr(note))""",
                "第一行用竖线分隔字段，第二、三次 `print` 连在同一行。`repr(note)` 会显示备注两边真实存在的空格。",
            ),
            section(
                "1.5 type 和 isinstance：先确认手里是什么",
                "很多初学者遇到报错就盯着公式，其实问题常常出在类型。`type(value)` 告诉你实际类型；`isinstance(value, (int, float))` 可以一次接受多个数值类型。注意：布尔值在 Python 里是整数的子类，金额校验时要单独排除。",
                """amount = 35.5
raw_amount = "35.5"
print(type(amount))
print(type(raw_amount))
print(isinstance(amount, (int, float)))
print(isinstance(raw_amount, (int, float)))
print(isinstance(True, int))""",
                "浮点金额属于数值类型，字符串金额不属于。最后一行是 `True`，以后写金额校验时不能只判断 `isinstance(value, int)`。",
            ),
            section(
                "1.6 dir、help 和 callable：不会就现场查",
                "Python 对象会把能用的属性和方法暴露出来。`dir()` 适合先找名字，`callable()` 判断一个名字能不能像函数一样调用，`help()` 再看具体用法。课程里不会穷举所有方法，学会查比死记更重要。",
                """public_names = [
    name for name in dir(str) if not name.startswith("_")
]
print("字符串公开名称数量：", len(public_names))
print("前 12 个：", public_names[:12])
print("strip 能调用吗：", callable(str.strip))
print("upper 能调用吗：", callable(str.upper))
print("字符串长度能调用吗：", callable("abc".__len__))""",
                "你会看到字符串有很多可用方法，但现在只需要知道怎么找到它们。`str.strip`、`str.upper` 和绑定后的 `__len__` 都可调用。",
            ),
            section(
                "1.7 input 永远返回字符串",
                "用户在键盘上输入 `35.5`，`input()` 拿到的仍是 `'35.5'`。所以交互程序要先保留原始文本，再在明确的位置转换。Notebook 自动运行时不要直接停在 `input()`，先用字符串模拟输入。",
                """# 真实交互写法：raw_amount = input("金额：")
raw_amount = "35.5"
print("原始值：", raw_amount)
print("原始类型：", type(raw_amount).__name__)
amount = float(raw_amount)
print("转换后：", amount)
print("转换后类型：", type(amount).__name__)""",
                "转换前是 `str`，转换后是 `float`。后面学习异常处理时，还要解决用户输入“abc”导致转换失败的问题。",
            ),
        ],
    },
    2: {
        "plain": "变量不是贴在盒子上的永久标签，它只是当前指向某个值的名字。Python 会根据右边的值决定类型，所以同一个名字可以先指向数字、再指向字符串，但业务代码里最好别这么做。运算符也不是孤立符号，它们要和数据类型、业务口径一起看。",
        "toolbox": """| 工具或运算符 | 用途 | 例子 |
|---|---|---|
| `int()`、`float()`、`str()` | 显式转换类型 | `float("35.5")` |
| `abs()` | 绝对值 | `abs(-18)` 得到 `18` |
| `round()` | 按位数舍入 | `round(35.567, 2)` |
| `divmod()` | 同时得到商和余数 | `divmod(125, 60)` |
| `//`、`%`、`**` | 整除、余数、幂 | `125 // 60`、`2 ** 3` |
| `is None` | 判断缺失占位值 | 不要写成 `== None` |
| `+=`、`-=`、`*=` | 在原值基础上更新 | `total += amount` |""",
        "sections": [
            section(
                "2.4 显式类型转换：别靠 Python 猜",
                "`int()`、`float()`、`str()` 会创建转换后的新值。`int(35.9)` 是直接截掉小数部分，不是四舍五入；`bool()` 看的是值是否为空，不是在理解“是/否”这两个汉字。",
                """raw_amount = "35.50"
amount = float(raw_amount)
whole_part = int(amount)
label = str(amount)
print(amount, type(amount).__name__)
print(whole_part)
print(label, type(label).__name__)
print(bool("False"), bool(""), bool(0), bool(1))""",
                "金额转换成 35.5；`int` 得到 35。非空字符串 `'False'` 依然是真值，空字符串和 0 才是假值。",
            ),
            section(
                "2.5 /、//、% 和 divmod：除法不止一种",
                "`/` 永远得到浮点结果；`//` 取整除商；`%` 取余数。要同时拿到商和余数时，`divmod()` 比重复计算更清楚。它常用来做分钟与小时、分页和周期计算。",
                """total_minutes = 135
hours = total_minutes // 60
minutes = total_minutes % 60
same_hours, same_minutes = divmod(total_minutes, 60)
print(total_minutes / 60)
print(hours, minutes)
print(same_hours, same_minutes)""",
                "普通除法得到 2.25；整除和余数得到 2 小时 15 分钟；`divmod` 一次返回同样的两个结果。",
            ),
            section(
                "2.6 abs、round 和浮点误差",
                "二进制浮点数不能精确表示所有十进制小数，所以 `0.1 + 0.2` 可能不是肉眼期待的 0.3。展示金额可以 `round` 或格式化；真正的财务系统通常使用 `Decimal`，这里先理解误差来源。",
                """difference = 35.5 - 53.5
print("差额绝对值：", abs(difference))
raw_total = 0.1 + 0.2
print("原始结果：", raw_total)
print("保留两位：", round(raw_total, 2))
print(f"金额格式：{raw_total:.2f}")""",
                "差额绝对值是 18.0。原始浮点结果会露出微小误差，但舍入和金额格式显示为 0.30。",
            ),
            section(
                "2.7 运算优先级和增强赋值",
                "乘除先于加减，但业务公式不要靠读者背优先级，括号能把口径写清楚。`total += amount` 等价于 `total = total + amount`，很适合后面的循环累计。",
                """price = 35.5
quantity = 2
discount = 5
payable = price * quantity - discount
same_payable = (price * quantity) - discount
total = 0
total += payable
total += 18
print(payable, same_payable, total)""",
                "两个应付金额都为 66.0，累计总额为 84.0。括号没有改变结果，但把先算商品总价的意图写明白了。",
            ),
            section(
                "2.8 None、相等和值的身份",
                "`None` 表示“现在没有值”，它不等于 0、空字符串或空列表。判断 `None` 用 `is None` 或 `is not None`。业务上要分清“金额为 0”和“金额还没填写”。",
                """amount = None
zero_amount = 0
print(amount is None)
print(zero_amount is None)
print(amount == 0)
print(zero_amount == 0)
amount = 35.5
print(amount is not None)""",
                "`None` 和 0 的业务含义不同。赋值 35.5 后，`amount is not None` 才变为 `True`。",
            ),
        ],
    },
    3: {
        "plain": "账目里的日期、分类和备注进程序时几乎都是字符串。字符串处理不是“会拼一句话”就结束了，你还要能清掉多余空格、拆字段、判断前后缀、找到关键词，并把结果按固定格式输出。所有字符串方法都会返回新字符串，原值不会被悄悄改掉。",
        "toolbox": """| 方法 | 作用 | 是否修改原字符串 |
|---|---|---|
| `strip()`、`lstrip()`、`rstrip()` | 去掉两端空白 | 否 |
| `split()`、`partition()` | 拆分文本 | 否，返回列表或元组 |
| `join()` | 用分隔符连接多段文本 | 否 |
| `replace()` | 替换指定片段 | 否 |
| `find()`、`count()` | 查位置、数次数 | 否 |
| `startswith()`、`endswith()` | 判断前后缀 | 否，返回布尔值 |
| `isdigit()`、`isdecimal()` | 判断数字字符 | 否，返回布尔值 |
| `zfill()` | 左侧补零 | 否 |""",
        "sections": [
            section(
                "3.4 startswith、endswith、find 和 count",
                "要判断一段文本是否以某个内容开头或结尾，用 `startswith/endswith`，不要手写切片。`find` 找不到时返回 -1，`index` 找不到会报错；不确定是否存在时通常先用 `in` 或 `find`。",
                """note = "报销：客户午餐（电子发票）"
print(note.startswith("报销"))
print(note.endswith("电子发票）"))
print("午餐" in note)
print(note.find("午餐"))
print(note.find("地铁"))
print(note.count("餐"))""",
                "前后缀判断为真，`午餐` 能找到，`地铁` 返回 -1。`count` 返回实际出现次数，不会告诉你位置。",
            ),
            section(
                "3.5 partition 和 split：只拆一次还是全部拆",
                "`split(':')` 会把所有冒号都拆开；`partition(':')` 只找第一次，并固定返回“左边、分隔符、右边”三个值。处理 `分类:备注` 这类键值文本时，`partition` 往往更稳。",
                """raw = "餐饮:午餐:客户会面"
all_parts = raw.split(":")
category, separator, note = raw.partition(":")
print(all_parts)
print(category)
print(separator)
print(note)""",
                "`split` 得到三项列表；`partition` 保留第一次冒号后的完整备注，因此 note 仍是 `午餐:客户会面`。",
            ),
            section(
                "3.6 isdigit、isdecimal 和安全转换",
                "字符判断方法只能说明字符长什么样，不能替代所有数字转换。小数点和负号会让 `isdigit()` 返回假，所以金额仍应尝试 `float()` 并处理异常；流水号的纯数字部分则很适合 `isdigit()`。",
                """record_id = "R0018"
amount_text = "35.50"
negative_text = "-18"
print(record_id[1:].isdigit())
print(amount_text.isdigit())
print(negative_text.isdigit())
print("18".isdecimal())
print(float(amount_text))""",
                "流水号数字部分和 `'18'` 能通过字符判断；带小数点或负号的文本不能，但仍可能是合法数值。",
            ),
            section(
                "3.7 zfill、对齐和 f-string 格式",
                "固定宽度编号可以用 `zfill`；金额用 `:.2f`；百分比用 `:.1%`；文本对齐可用 `<`、`>`、`^`。格式化只负责展示，不会改变原始数值。",
                """sequence = 18
record_id = "R" + str(sequence).zfill(4)
amount = 35.5
share = 0.237
print(record_id)
print(f"金额：{amount:>10.2f} 元")
print(f"占比：{share:.1%}")
print(f"{'餐饮':<8}|{amount:>10.2f}")""",
                "编号显示为 R0018，金额固定两位小数，占比显示为 23.7%。原来的 amount 仍是浮点数 35.5。",
            ),
            section(
                "3.8 字符串不可变：方法返回新值",
                "`strip/replace/upper` 都不会原地修改字符串。忘记接住返回值是常见错误。可以连续调用方法，但链条太长时拆成中间变量更容易检查。",
                """raw_category = "  food  "
raw_category.strip()
print("没接返回值：", repr(raw_category))
cleaned = raw_category.strip()
translated = cleaned.replace("food", "餐饮")
print("清洗后：", repr(cleaned))
print("替换后：", translated)
print("原字符串还在：", repr(raw_category))""",
                "第一次调用没有改变原字符串。把返回值存进 cleaned 和 translated 后，才得到真正可用的新文本。",
            ),
        ],
    },
    4: {
        "plain": "列表适合保存“有顺序、会增删”的一批记录。这里最容易混淆的是两件事：某个方法到底是改原列表，还是返回新列表；删除时拿到的是值、索引，还是被删掉的元素。把这两点弄清，列表就不会越学越乱。",
        "toolbox": """| 方法或函数 | 做什么 | 返回值/副作用 |
|---|---|---|
| `append(x)` | 末尾加一个元素 | 改原列表，返回 `None` |
| `extend(items)` | 末尾加入多个元素 | 改原列表，返回 `None` |
| `insert(i, x)` | 指定位置插入 | 改原列表，返回 `None` |
| `remove(x)` | 删除第一个匹配值 | 改原列表，找不到会报错 |
| `pop(i)` | 按索引删除 | 改原列表，并返回被删元素 |
| `index(x)`、`count(x)` | 找位置、数次数 | 不改原列表 |
| `sort()`、`reverse()` | 原地排序、反转 | 改原列表，返回 `None` |
| `sorted()`、`reversed()` | 生成排序或反向结果 | 不改原列表 |""",
        "sections": [
            section(
                "4.4 append、extend 和 insert 别混用",
                "`append` 把参数当成一个整体；`extend` 逐个加入可迭代对象里的元素；`insert` 在指定索引前插入。把一批记录错误地 `append` 进去，会得到嵌套列表。",
                """categories = ["餐饮", "交通"]
categories.append("购物")
categories.extend(["医疗", "其他"])
categories.insert(1, "工资")
print(categories)

wrong = ["餐饮"]
wrong.append(["交通", "购物"])
print(wrong)""",
                "第一个列表保持一层结构；wrong 的第二个元素本身又是列表，这就是 `append` 和 `extend` 的差别。",
            ),
            section(
                "4.5 remove、pop、del 和 clear 怎么选",
                "知道值、不知道位置时用 `remove`；知道索引并且还想拿回被删元素时用 `pop`；`del` 可删索引或切片；`clear` 清空整个列表。删除前先明确你手里拿的是值还是位置。",
                """categories = ["餐饮", "交通", "购物", "其他"]
categories.remove("交通")
removed = categories.pop(1)
del categories[:1]
print("pop 返回：", removed)
print("剩余：", categories)
categories.clear()
print("清空后：", categories)""",
                "remove 删交通，pop 删并返回购物，del 再删第一项，最后 clear 得到空列表。",
            ),
            section(
                "4.6 index、count 和成员检查",
                "`in` 只回答在不在；`count` 回答出现几次；`index` 返回第一次出现的位置，找不到会抛 `ValueError`。如果值可能不存在，先用 `in` 再取索引。",
                """categories = ["餐饮", "交通", "餐饮", "购物"]
print("餐饮" in categories)
print(categories.count("餐饮"))
if "购物" in categories:
    print("购物第一次在索引：", categories.index("购物"))
if "医疗" not in categories:
    print("医疗还没有出现")""",
                "餐饮存在两次，购物第一次出现在索引 3。对不存在的医疗没有直接调用 index，因此不会报错。",
            ),
            section(
                "4.7 sort 和 sorted：一个改原列表，一个不改",
                "`list.sort()` 原地修改并返回 `None`；`sorted()` 接收任何可迭代对象，返回新列表。业务数据通常保留原顺序，再生成一个展示用排序结果。`key` 决定按哪个字段比较。",
                """records = [
    {"date": "2026-08-07", "amount": 18.0},
    {"date": "2026-08-06", "amount": 35.5},
]
by_date = sorted(records, key=lambda item: item["date"])
by_amount = sorted(
    records,
    key=lambda item: item["amount"],
    reverse=True,
)
print("原顺序：", records)
print("按日期：", by_date)
print("按金额降序：", by_amount)""",
                "records 的顺序没变；另外两个新列表分别按日期升序、金额降序。后面函数章节会细讲 `key=lambda ...`。",
            ),
            section(
                "4.8 copy 和切片都是浅复制",
                "`copy()`、`list()` 和 `[:]` 会创建新外层列表，但里面的可变字典仍是同一个对象。只改外层结构互不影响；修改内部字典会同时反映到两边。需要完全独立时再考虑 `copy.deepcopy()`。",
                """records = [{"category": "餐饮", "tags": ["工作餐"]}]
shallow = records.copy()
shallow.append({"category": "交通", "tags": []})
print("外层长度：", len(records), len(shallow))
shallow[0]["tags"].append("可报销")
print("原列表内部：", records[0])
print("复制列表内部：", shallow[0])""",
                "两个外层列表长度不同，但第一条记录里的 tags 同时多出“可报销”，说明内部对象仍被共享。",
            ),
        ],
    },
}


SUPPLEMENTS.update({
    5: {
        "plain": "元组不是“不能改的列表”这么简单。它更适合表达字段数量和顺序已经约定好的结果，比如函数一次返回收入、支出和结余。元组的方法很少，正是因为它不负责增删；重点应放在打包、解包和稳定结构上。",
        "toolbox": """| 写法或方法 | 用途 | 结果 |
|---|---|---|
| `(value,)` | 创建单元素元组 | 逗号不能省 |
| `tuple(items)` | 把可迭代对象转成元组 | 返回新元组 |
| `count(x)` | 统计值出现次数 | 返回整数 |
| `index(x)` | 找第一次出现的位置 | 找不到会报错 |
| `a, b = pair` | 按位置解包 | 数量必须匹配 |
| `first, *rest = items` | 星号解包 | `rest` 是列表 |
| `namedtuple()` | 给位置字段加名字 | 仍保持元组特性 |""",
        "sections": [
            section(
                "5.4 count、index 和成员检查",
                "元组虽然没有增删方法，但可以用 `in` 判断成员、`count` 数次数、`index` 找第一次出现的位置。`index` 找不到同样会抛 `ValueError`，不要把它当成 -1。",
                """schema = ("date", "type", "category", "amount", "note")
print("amount" in schema)
print(schema.count("amount"))
print(schema.index("category"))
if "merchant" not in schema:
    print("当前结构没有 merchant 字段")""",
                "amount 出现一次，category 的索引是 2。merchant 不存在，所以没有贸然调用 index。",
            ),
            section(
                "5.5 打包、解包和星号接收",
                "用逗号把多个值放在一起叫打包，把元组拆到多个变量叫解包。星号变量可以接住数量不固定的中间项，但一次解包最多只能有一个星号变量。",
                """record = "2026-08-06", "支出", "餐饮", 35.5, "午餐"
date, record_type, *details = record
*main_fields, note = record
print(date, record_type)
print(details)
print(main_fields)
print(note)""",
                "details 是后三项列表，main_fields 是前四项列表。原来的 record 仍是五项元组。",
            ),
            section(
                "5.6 用元组做字典键",
                "字典键必须可哈希，列表不能做键，内容也不可变的元组通常可以。把 `(月份, 分类)` 作为组合键，就能表示“某月某分类”的汇总结果。元组里如果包含列表，整体仍不能做键。",
                """monthly_totals = {
    ("2026-08", "餐饮"): 320.5,
    ("2026-08", "交通"): 88.0,
    ("2026-09", "餐饮"): 210.0,
}
key = ("2026-08", "餐饮")
print(monthly_totals[key])
for (month, category), total in monthly_totals.items():
    print(month, category, total)""",
                "组合键可以直接查询 2026-08 的餐饮总额；循环中还能把组合键再次解包。",
            ),
            section(
                "5.7 namedtuple：保留元组，也给字段起名字",
                "普通元组的 `record[3]` 很难一眼看懂。`collections.namedtuple` 会生成一种带字段名的元组类型，既能 `record.amount` 访问，也能索引和解包。小项目仍可用字典，先知道这条路存在。",
                """from collections import namedtuple


Record = namedtuple(
    "Record",
    ["date", "record_type", "category", "amount", "note"],
)
record = Record("2026-08-06", "支出", "餐饮", 35.5, "午餐")
print(record.amount)
print(record[3])
date, record_type, category, amount, note = record
print(date, category, amount)""",
                "字段访问和索引访问都得到 35.5，完整解包仍然可用。它是不可变结构，不能给 amount 重新赋值。",
            ),
        ],
    },
    6: {
        "plain": "字典解决“这个位置到底是什么意思”，集合解决“哪些值只保留一份”。学习这两种容器时，不要只会大括号：要分清读取、补默认值、合并、删除，以及集合删除不存在元素时是报错还是安静跳过。",
        "toolbox": """| 方法或运算符 | 用途 | 关键区别 |
|---|---|---|
| `get(k, default)` | 安全读取可选键 | 不会写入默认值 |
| `setdefault(k, default)` | 读取或创建默认值 | 可能修改字典 |
| `copy()`、`update()` | 复制后合并字典 | copy 返回新字典，update 改目标字典 |
| `pop(k)`、`popitem()` | 删除并返回 | 一个按键，一个删最后一对 |
| `keys/values/items` | 取得动态视图 | 字典变化后视图也变化 |
| `add/update` | 集合加一个/加多个 | 都改原集合 |
| `remove/discard` | 集合删除 | discard 找不到不报错 |
| `&`、`|`、`-`、`^` | 交、并、差、对称差 | 返回新集合 |""",
        "sections": [
            section(
                "6.4 get 和 setdefault：都能给默认值，但不一样",
                "`get` 只是读取，键不存在也不会写进去；`setdefault` 会在键不存在时真正创建键。做累计时，`get` 适合数值相加，`setdefault` 适合先准备一个列表再追加。",
                """record = {"category": "餐饮", "amount": 35.5}
print(record.get("note", "未填写"))
print("note" in record)
record.setdefault("tags", []).append("工作餐")
record.setdefault("tags", []).append("可报销")
print(record)
print(record.setdefault("category", "其他"))""",
                "get 返回“未填写”但没有创建 note；setdefault 创建 tags 列表。已有 category 时，默认值“其他”不会覆盖餐饮。",
            ),
            section(
                "6.5 copy、update 和覆盖顺序",
                "`copy` 先创建新字典，`update` 再修改目标字典。键冲突时，新值会覆盖旧值。合并用户输入前要确认哪些字段允许被覆盖，不能让输入随便改记录 id。",
                """base = {"id": "R0001", "category": "餐饮", "amount": 35.5}
changes = {"category": "交通", "note": "地铁"}
merged = base.copy()
merged.update(changes)
print("base：", base)
print("merged：", merged)
base.update({"note": "午餐"})
print("update 后：", base)""",
                "竖线合并没有修改 base，冲突的 category 采用 changes 中的交通；update 随后直接给 base 增加 note。",
            ),
            section(
                "6.6 pop、popitem、del 和动态视图",
                "`pop(key)` 删除指定键并返回值；提供默认值后，键不存在也不会报错。`popitem()` 删除最后加入的一对。`keys/items` 返回的是动态视图，不是固定快照。",
                """record = {
    "id": "R0001",
    "category": "餐饮",
    "amount": 35.5,
    "note": "午餐",
}
keys_view = record.keys()
removed_note = record.pop("note")
missing = record.pop("merchant", "无商户")
record["type"] = "支出"
print(removed_note, missing)
print(list(keys_view))
last_pair = record.popitem()
print("最后一对：", last_pair)""",
                "keys_view 会反映后续增删。pop 返回午餐和默认文本；popitem 删除最后插入的 type 键值对。",
            ),
            section(
                "6.7 add、update、remove 和 discard",
                "集合的 `add` 只加一个元素，`update` 会逐个加入多个元素。`remove` 删除不存在的元素会报 `KeyError`；`discard` 不会。清理可选标签时，discard 通常更顺手。",
                """categories = {"餐饮", "交通"}
categories.add("购物")
categories.update(["医疗", "其他", "餐饮"])
categories.discard("不存在")
categories.remove("交通")
print(categories)
print("分类数：", len(categories))""",
                "重复的餐饮只保留一份，不存在的元素用 discard 删除不会报错，交通被 remove 正常移除。",
            ),
            section(
                "6.8 集合关系：交集、差集和子集",
                "集合运算适合比较权限、计划分类和实际分类。`<=` 判断是否为子集，`isdisjoint` 判断两组是否完全不重叠。展示前要排序，因为集合本身没有稳定业务顺序。",
                """allowed = {"餐饮", "交通", "购物", "医疗", "其他"}
actual = {"餐饮", "交通", "游戏"}
print("合法且出现：", sorted(actual & allowed))
print("不合法：", sorted(actual - allowed))
print("全部合法吗：", actual <= allowed)
print("完全不重叠：", actual.isdisjoint({"工资", "奖金"}))
print("所有涉及分类：", sorted(actual | allowed))""",
                "交集找出合法且实际出现的分类，差集找出游戏这个非法分类。actual 不是 allowed 的子集。",
            ),
        ],
    },
    7: {
        "plain": "条件判断不是把业务规则塞进一个超长 `if`。先把每条规则写成有名字的布尔值，再按优先级组合，代码才容易核对。尤其要盯住边界：到底是大于 5000，还是大于等于 5000，不能凭感觉。",
        "toolbox": """| 写法或函数 | 用途 | 常见场景 |
|---|---|---|
| `if/elif/else` | 处理互斥分支 | 金额等级、状态分类 |
| `and/or/not` | 组合或反转条件 | 多字段校验 |
| `in/not in` | 成员判断 | 类型、分类白名单 |
| `any()` | 至少一个条件为真 | 任一字段命中风险 |
| `all()` | 所有条件为真 | 全部字段校验通过 |
| `x if cond else y` | 简单二选一 | 短标签，不写复杂流程 |
| `dict.get()` | 按固定键查找动作 | 菜单命令、有限状态 |""",
        "sections": [
            section(
                "7.4 真值、any 和 all",
                "空字符串、空容器、0 和 None 在条件里是假，其余大多数值是真。`all` 要求全部为真，`any` 只要一个为真。不要把空字符串和 0 混成同一种业务含义。",
                """record = {
    "date": "2026-08-06",
    "type": "支出",
    "category": "餐饮",
    "amount": 35.5,
    "note": "",
}
required = [
    record["date"],
    record["type"],
    record["category"],
    record["amount"] > 0,
]
print("必填项都有效：", all(required))
print("存在空值：", any(not value for value in record.values()))""",
                "必填项检查通过，但 note 为空，所以“存在空值”为真。是否允许空 note 要由业务规则决定。",
            ),
            section(
                "7.5 and 和 or 会短路",
                "Python 从左向右判断 `and/or`，结果已经确定后不会继续算。短路可以先检查值存在，再调用方法，避免对 None 调用 `strip()`。顺序写反就可能报错。",
                """note = None
has_note = note is not None and note.strip() != ""
print(has_note)

category = ""
display_category = category or "其他"
print(display_category)

amount_text = "35.5"
can_convert = amount_text and amount_text.replace(".", "", 1).isdigit()
print(can_convert)""",
                "note 为 None 时，后面的 strip 不会执行；空分类用 or 得到“其他”。最后只做简单格式预检，真正转换仍需异常处理。",
            ),
            section(
                "7.6 早返回比层层嵌套更清楚",
                "校验函数可以先处理失败情况并立即 `return`，后面的主流程就不用缩进很多层。这种写法也叫守卫条件。每个返回值带上具体原因，比只返回 True/False 更利于定位问题。",
                """def check_record(record):
    if not record.get("date"):
        return False, "缺少日期"
    if record.get("type") not in {"收入", "支出"}:
        return False, "类型不合法"
    if record.get("amount", 0) <= 0:
        return False, "金额必须大于 0"
    return True, "记录有效"


samples = [
    {"type": "支出", "amount": 35.5},
    {"date": "2026-08-06", "type": "未知", "amount": 35.5},
]
for sample in samples:
    print(check_record(sample))""",
                "第一条在日期检查处结束，第二条在类型检查处结束。函数不会继续执行没有意义的后续判断。",
            ),
            section(
                "7.7 字典分派：固定菜单的另一种写法",
                "菜单选项只是固定值到文字或函数的对应关系时，可以用字典表达，再用 `get` 提供兜底值。这种写法适合简单映射；每个分支有多步流程时，普通 if/elif 仍然更清楚。",
                """actions = {
    "1": "添加账目",
    "2": "查看账目",
    "3": "查询账目",
    "4": "删除账目",
    "5": "统计汇总",
    "6": "退出",
}
for choice in ["3", "9"]:
    action = actions.get(choice, "未知选项")
    print(choice, action)""",
                "选项 3 查到“查询账目”，不存在的 9 使用 get 的默认值“未知选项”。",
            ),
            section(
                "7.8 用边界表检查 > 和 >=",
                "规则写完后，至少测试门槛前一个值、刚好等于门槛、门槛后一个值。只测一个普通值，看不出 `>` 和 `>=` 写错。下面把规则变成一张可重复检查的表。",
                """def amount_level(amount):
    if amount <= 0:
        return "拒绝"
    if amount >= 5000:
        return "需复核"
    return "正常"


cases = [
    (-0.01, "拒绝"),
    (0, "拒绝"),
    (0.01, "正常"),
    (4999.99, "正常"),
    (5000, "需复核"),
]
for value, expected in cases:
    actual = amount_level(value)
    print(value, actual, actual == expected)""",
                "五个临界案例都应输出 True。以后修改门槛，只要重跑这张表就能发现边界是否被破坏。",
            ),
        ],
    },
    8: {
        "plain": "循环的本质是“把同一套步骤交给一批数据”。真正难点不在 `for` 拼写，而在累计变量放在哪、什么时候跳过、什么时候停止，以及循环结束后你要留下什么结果。先写清循环前、循环中、循环后三个阶段。",
        "toolbox": """| 工具或语句 | 用途 | 提醒 |
|---|---|---|
| `range()` | 生成整数序列 | 结束值不包含在内 |
| `enumerate()` | 同时得到序号和值 | 可用 `start=1` |
| `zip()` | 并行遍历多组数据 | 默认按最短序列停止 |
| `break` | 立即结束当前循环 | 常用于找到目标 |
| `continue` | 跳过本轮剩余代码 | 常用于过滤无效值 |
| `for...else` | 没有 break 时执行 else | 适合查找失败提示 |
| `iter()`、`next()` | 手动取得迭代器和下一项 | 理解循环底层即可 |""",
        "sections": [
            section(
                "8.4 range 的起点、终点和步长",
                "`range(stop)` 从 0 开始；`range(start, stop, step)` 可以指定起点和步长，stop 永远不包含。倒序时步长必须为负。range 本身不是列表，需要展示全部值时再转成 list。",
                """print(list(range(5)))
print(list(range(1, 6)))
print(list(range(0, 11, 2)))
print(list(range(5, 0, -1)))

records = ["R0001", "R0002", "R0003"]
for index in range(len(records)):
    print(index, records[index])""",
                "四个 range 分别展示默认起点、包含 1 到 5、偶数步长和倒序。只需要值和序号时，下一节的 enumerate 更直观。",
            ),
            section(
                "8.5 enumerate 和 zip：少手动管理索引",
                "`enumerate(records, start=1)` 直接给用户序号；`zip` 把多组对应数据并排配对。两组长度不一致时 zip 默认在最短处停止，关键数据要先检查长度。",
                """categories = ["餐饮", "交通", "购物"]
amounts = [35.5, 18.0, 299.0]
for number, (category, amount) in enumerate(
    zip(categories, amounts),
    start=1,
):
    print(number, category, amount)

print("长度一致：", len(categories) == len(amounts))""",
                "用户序号从 1 开始，分类和金额正确配对。没有自己写 index += 1，也没有重复索引列表。",
            ),
            section(
                "8.6 break、continue 和 for...else",
                "`continue` 跳过当前无效记录，`break` 找到目标后立即停止。`for` 后面的 `else` 只有在循环没有被 break 打断时执行，很适合输出“没有找到”。",
                """records = [
    {"id": "R0001", "amount": 35.5},
    {"id": "R0002", "amount": -1},
    {"id": "R0003", "amount": 299.0},
]
valid_total = 0
for record in records:
    if record["amount"] <= 0:
        continue
    valid_total += record["amount"]
print("有效合计：", valid_total)

target = "R0003"
for record in records:
    if record["id"] == target:
        print("找到了：", record)
        break
else:
    print("没有找到：", target)""",
                "负数记录被跳过，合计为 334.5。找到 R0003 后 break，因此 for 的 else 不执行。",
            ),
            section(
                "8.7 嵌套循环和推导式别写过头",
                "嵌套循环适合二维数据，但复杂度会快速增加。简单的“筛选并转换”可用列表推导式；一旦条件或副作用变复杂，就回到普通循环。可读性比少写两行更重要。",
                """records = [
    {"type": "支出", "category": "餐饮", "amount": 35.5},
    {"type": "收入", "category": "工资", "amount": 5000.0},
    {"type": "支出", "category": "交通", "amount": 18.0},
]
expense_labels = [
    f"{record['category']}:{record['amount']:.2f}"
    for record in records
    if record["type"] == "支出"
]
print(expense_labels)

matrix = [[1, 2], [3, 4]]
flattened = [value for row in matrix for value in row]
print(flattened)""",
                "第一段只生成两条支出标签；第二段按从左到右的循环顺序把二维列表摊平成一层。",
            ),
            section(
                "8.8 iter 和 next：for 循环背后发生了什么",
                "`for` 会先调用 `iter()` 得到迭代器，再不断 `next()`。数据耗尽时会出现 `StopIteration`，for 会自动处理。平时不用手写，但理解后就知道为什么迭代器只能一路向前消费。",
                """amounts = [35.5, 18.0, 299.0]
iterator = iter(amounts)
print(next(iterator))
print(next(iterator))
print("剩余值：", list(iterator))
print("再次转列表：", list(iterator))""",
                "前两次 next 取走 35.5 和 18.0，第一次 list 取得剩余的 299.0；迭代器耗尽后再次转列表只能得到空列表。",
            ),
        ],
    },
})


SUPPLEMENTS.update({
    9: {
        "plain": "函数不是为了把代码包起来显得高级，而是给一段逻辑划清边界：它需要什么输入、完成什么职责、返回什么结果。函数里如果又读取输入、又打印、又修改文件，就很难测试。先把“算什么”写成小函数，再由菜单负责问用户和展示。",
        "toolbox": """| 语法或工具 | 作用 | 要点 |
|---|---|---|
| `def` | 定义函数 | 定义后不会自动执行 |
| `return` | 把结果交给调用方 | 执行后立即离开函数 |
| 位置参数 | 按顺序传值 | 简短明确时好用 |
| 关键字参数 | 按名字传值 | 调用更易读，可改变顺序 |
| 默认参数 | 调用时可省略 | 默认值只在定义时创建一次 |
| `*` | 后面的参数只能按关键字传 | 防止调用含义不清 |
| 类型标注 | 说明预期类型 | 默认不会自动校验 |
| `__doc__` | 读取文档字符串 | `help()` 也会展示它 |""",
        "sections": [
            section(
                "9.5 位置参数、关键字参数和仅关键字参数",
                "参数顺序很直观时可以按位置传；容易混淆的参数应写名字。函数定义中的单独 `*` 表示后面的参数必须用关键字传，这能避免把 category 和 note 传反。",
                """def create_record(
    date,
    record_type,
    amount,
    *,
    category="其他",
    note="",
):
    return {
        "date": date,
        "type": record_type,
        "amount": float(amount),
        "category": category,
        "note": note,
    }


record = create_record(
    "2026-08-06",
    "支出",
    35.5,
    note="午餐",
    category="餐饮",
)
print(record)""",
                "前三个参数按位置传，category 和 note 必须写名字，因此顺序可以交换且含义仍然清楚。",
            ),
            section(
                "9.6 默认参数的坑：不要默认放可变对象",
                "默认参数在函数定义时创建一次，不是每次调用都创建。把 `[]` 当默认值会让多次调用共享同一列表。安全写法用 `None` 占位，在函数内部新建列表。",
                """def unsafe_add(value, bucket=[]):
    bucket.append(value)
    return bucket


print("不安全：", unsafe_add("餐饮"))
print("不安全：", unsafe_add("交通"))


def safe_add(value, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(value)
    return bucket


print("安全：", safe_add("餐饮"))
print("安全：", safe_add("交通"))""",
                "unsafe_add 第二次会带着第一次的餐饮；safe_add 每次不传 bucket 时都从新的空列表开始。",
            ),
            section(
                "9.7 return、提前结束和隐式 None",
                "函数执行到 `return` 就立刻结束，后面的代码不会运行。没有写 return，或者只写 `return`，调用结果都是 None。校验函数常用提前返回处理错误，让正常路径保持清楚。",
                """def normalize_note(note):
    if note is None:
        return ""
    cleaned = str(note).strip()
    if not cleaned:
        return ""
    return cleaned


def show_note(note):
    print(normalize_note(note))


print(repr(normalize_note(None)))
print(repr(normalize_note("  午餐  ")))
result = show_note("地铁")
print("show_note 返回：", result)""",
                "normalize_note 对缺失、空白和正常文本分别返回明确字符串；show_note 只打印没有 return，所以 result 是 None。",
            ),
            section(
                "9.8 文档字符串和类型标注",
                "文档字符串说明函数做什么、参数和返回值是什么；类型标注让编辑器和读者更容易检查接口，但 Python 默认不会因为传错类型自动拦截。可以通过 `__doc__` 和 `__annotations__` 查看。",
                """def calculate_balance(income: float, expense: float) -> float:
    '''Return income minus expense without printing the result.'''
    return income - expense


print(calculate_balance(5000.0, 1320.0))
print(calculate_balance.__doc__)
print(calculate_balance.__annotations__)""",
                "函数返回 3680.0，随后展示文档字符串和参数/返回值标注。标注是说明，不等于运行时校验。",
            ),
            section(
                "9.9 局部变量、全局变量和闭包",
                "函数内部赋值默认创建局部变量，不会覆盖外部同名变量。读取配置可以通过参数传入；不要用 `global` 到处修改状态。内部函数记住外层变量的现象叫闭包，后面高阶函数会用到。",
                """tax_rate = 0.03


def amount_with_tax(amount, rate=tax_rate):
    result = amount * (1 + rate)
    return round(result, 2)


def make_checker(limit):
    def is_large(amount):
        return amount >= limit

    return is_large


check_large = make_checker(5000)
print(amount_with_tax(100))
print(check_large(4999), check_large(5000))
print("外部税率仍是：", tax_rate)""",
                "局部 result 不会跑到函数外。check_large 记住了 limit=5000，这就是一个简单闭包。",
            ),
            section(
                "9.10 纯函数和副作用分开",
                "只根据参数计算并返回新结果的函数更容易测试。打印、修改传入列表、写文件都属于副作用，不是不能做，而是要明确放在哪一层。下面一个函数返回新列表，另一个负责展示。",
                """def with_record(records, record):
    return [*records, record]


def format_count(records):
    return f"当前共有 {len(records)} 条账目"


original = [{"id": "R0001"}]
updated = with_record(original, {"id": "R0002"})
message = format_count(updated)
print(message)
print("原列表长度：", len(original))
print("新列表长度：", len(updated))""",
                "with_record 没有修改 original，而是返回新列表；format_count 只返回文本，调用方决定什么时候 print。",
            ),
        ],
    },
    10: {
        "plain": "Python 的很多内置函数都允许你把“规则函数”传进去。`sorted(..., key=...)` 里的 key、`filter()` 的筛选条件、`map()` 的转换规则，本质上都是函数。`lambda` 只是写短函数的简写，不是越多越高级；规则稍微复杂就应该起正式名字。",
        "toolbox": """| 函数 | 输入和输出 | 记账场景 |
|---|---|---|
| `len()` | 容器 -> 数量 | 记录数 |
| `sum()` | 数值序列 -> 合计 | 总收入、总支出 |
| `min/max(..., key=...)` | 序列 -> 极值元素 | 最大一笔支出 |
| `sorted(..., key=...)` | 可迭代对象 -> 新列表 | 按日期或金额排序 |
| `enumerate()` | 序列 -> 序号和值 | 展示用户编号 |
| `zip()` | 多个序列 -> 对应组合 | 配对字段和值 |
| `any/all()` | 布尔序列 -> 单个布尔值 | 任一风险、全部校验 |
| `map/filter()` | 转换或筛选迭代器 | 提取金额、筛选支出 |
| `callable()` | 对象 -> 布尔值 | 判断能否作为函数调用 |""",
        "sections": [
            section(
                "10.5 len、sum、min、max、abs 和 round",
                "内置函数先解决最常见的汇总，不要每次都手写循环。空列表上 `sum` 返回 0，但 `min/max` 默认会报错；可以用 `default=None` 明确表示没有记录。",
                """amounts = [35.5, 18.0, 299.0]
print("笔数：", len(amounts))
print("合计：", sum(amounts))
print("最小：", min(amounts, default=None))
print("最大：", max(amounts, default=None))
print("差额绝对值：", abs(35.5 - 53.5))
print("平均值：", round(sum(amounts) / len(amounts), 2))
print("空列表最大值：", max([], default=None))""",
                "笔数、合计、最小、最大和平均值一次得到；空列表最大值安全返回 None，没有让程序崩掉。",
            ),
            section(
                "10.6 enumerate、zip、any 和 all 组合使用",
                "这些函数经常一起出现：zip 配对，enumerate 编号，all 检查全部，any 检查至少一个。它们返回可迭代结果时，循环一次消费最自然，不必到处先转列表。",
                """fields = ["date", "type", "category", "amount"]
values = ["2026-08-06", "支出", "餐饮", 35.5]
record = dict(zip(fields, values))
for number, (key, value) in enumerate(record.items(), start=1):
    print(number, key, value)

required = [record.get(field) for field in fields]
print("必填都存在：", all(required))
print("包含大额：", any(value > 5000 for value in [35.5, 18.0]))""",
                "zip 生成字典字段配对，enumerate 从 1 编号。必填字段齐全，金额列表里没有超过 5000 的值。",
            ),
            section(
                "10.7 把函数当参数：写一个通用筛选器",
                "函数可以像数字和字符串一样传给另一个函数。下面的 `select` 不知道什么叫支出或大额，它只负责逐条调用 predicate。业务规则由命名函数提供，测试起来更直接。",
                """def select(records, predicate):
    return [record for record in records if predicate(record)]


def is_expense(record):
    return record["type"] == "支出"


def is_large(record):
    return record["amount"] >= 5000


records = [
    {"type": "支出", "amount": 35.5},
    {"type": "收入", "amount": 5000.0},
]
print(select(records, is_expense))
print(select(records, is_large))
print(callable(is_expense))""",
                "同一个 select 被两条规则复用。命名函数比复杂 lambda 更容易单独运行和定位错误。",
            ),
            section(
                "10.8 * 和 **：调用时拆开参数",
                "定义函数时 `*args/**kwargs` 是收集参数；调用函数时 `*sequence/**mapping` 是拆开参数。字段顺序固定的数据可以星号拆开，字典键与参数名一致时可以双星号传入。",
                """def format_amount(category, amount, note=""):
    suffix = f"（{note}）" if note else ""
    return f"{category}：{amount:.2f} 元{suffix}"


positional = ("餐饮", 35.5)
keyword_data = {
    "category": "交通",
    "amount": 18.0,
    "note": "地铁",
}
print(format_amount(*positional))
print(format_amount(**keyword_data))""",
                "单星号按位置拆元组，双星号按名字拆字典。字典里多余键或缺失必填键都会触发 TypeError。",
            ),
            section(
                "10.9 itemgetter：简单取字段不一定要 lambda",
                "`operator.itemgetter('amount')` 会生成一个取字典字段的函数。一次性简单规则用 lambda 很直观，重复使用同一字段时 itemgetter 可以减少重复。两者没有高低，选更易读的。",
                """from operator import itemgetter


records = [
    {"category": "餐饮", "amount": 35.5},
    {"category": "购物", "amount": 299.0},
    {"category": "交通", "amount": 18.0},
]
amount_of = itemgetter("amount")
print(sorted(records, key=amount_of))
print(max(records, key=amount_of))
print(list(map(amount_of, records)))""",
                "同一个 amount_of 同时用于排序、最大值和 map，分别得到按金额排序、最大记录和金额列表。",
            ),
            section(
                "10.10 map/filter 是惰性的，只能一路消费",
                "Python 3 的 map/filter 返回迭代器，不会立刻生成完整列表。它节省内存，但消费后不会自动回到开头。需要反复查看时立刻转 list；简单转换筛选仍可优先推导式。",
                """records = [
    {"type": "支出", "amount": 35.5},
    {"type": "收入", "amount": 5000.0},
    {"type": "支出", "amount": 18.0},
]
expense_iterator = filter(
    lambda record: record["type"] == "支出",
    records,
)
first_pass = list(expense_iterator)
second_pass = list(expense_iterator)
amounts = [record["amount"] for record in first_pass]
print(first_pass)
print(second_pass)
print(amounts)""",
                "第一次消费得到两条支出，第二次只剩空列表。推导式从已保存的 first_pass 提取金额，读起来也更直接。",
            ),
        ],
    },
    11: {
        "plain": "文件操作不是“能写进去就行”。你要明确路径指向哪里、文本用什么编码、打开模式会不会覆盖旧内容、JSON 顶层结构是不是预期列表。把路径作为参数传给函数，测试时才能换到临时目录，不会误伤真实数据。",
        "toolbox": """| 工具或方法 | 用途 | 关键点 |
|---|---|---|
| `Path()` | 创建路径对象 | 不代表文件一定存在 |
| `exists/is_file/is_dir` | 检查路径状态 | 返回布尔值 |
| `mkdir()` | 创建目录 | 常用 `parents=True` |
| `read_text/write_text` | 一次读写完整文本 | 适合小文件 |
| `open()` | 流式读写 | 配合 `with` 自动关闭 |
| `read/readline/readlines` | 读取全部、一行、多行 | 返回类型不同 |
| `json.dump/load` | JSON 与文件对象互转 | 直接操作文件 |
| `json.dumps/loads` | JSON 与字符串互转 | 方便传输和检查 |
| `os.path` | 传统路径函数 | 新代码通常优先 Path |""",
        "sections": [
            section(
                "11.5 Path 的 name、suffix、parent 和 with_suffix",
                "Path 会把路径当成结构，不用自己切斜杠。`name` 是完整文件名，`stem` 不带扩展名，`suffix` 是扩展名，`parent` 是上级目录；`with_suffix` 返回换扩展名后的新路径。",
                """from pathlib import Path


path = Path("finance_app/data/records.json")
print("文件名：", path.name)
print("主干名：", path.stem)
print("扩展名：", path.suffix)
print("上级目录：", path.parent)
print("备份路径：", path.with_suffix(".backup.json"))
print("原路径没变：", path)""",
                "所有属性都从路径结构直接取得，with_suffix 生成新 Path，没有修改原来的 records.json 路径。",
            ),
            section(
                "11.6 exists、is_file、is_dir 和 glob",
                "存在不代表一定是文件。读数据前可区分文件和目录；`glob('*.json')` 可以查当前目录匹配项，`rglob` 会递归子目录。下面使用临时目录，不会创建课程外文件。",
                """from pathlib import Path
from tempfile import TemporaryDirectory


with TemporaryDirectory() as folder:
    root = Path(folder)
    data_dir = root / "data"
    data_dir.mkdir()
    (data_dir / "records.json").write_text("[]", encoding="utf-8")
    (data_dir / "settings.json").write_text("{}", encoding="utf-8")
    print(data_dir.exists(), data_dir.is_dir())
    print((data_dir / "records.json").is_file())
    print(sorted(path.name for path in data_dir.glob("*.json")))""",
                "目录和文件检查分别为真，glob 找到两个 JSON 文件。临时目录离开 with 后自动清理。",
            ),
            section(
                "11.7 r、w、a 模式和 read 系列方法",
                "`r` 读取，`w` 会清空后重写，`a` 在末尾追加。`read()` 读剩余全部内容，`readline()` 读一行，`readlines()` 返回剩余行列表。文本模式总要明确 encoding。",
                """from pathlib import Path
from tempfile import TemporaryDirectory


with TemporaryDirectory() as folder:
    path = Path(folder) / "notes.txt"
    with path.open("w", encoding="utf-8") as file:
        file.write("午餐\\n")
        file.write("地铁\\n")
    with path.open("a", encoding="utf-8") as file:
        file.write("购物\\n")
    with path.open("r", encoding="utf-8") as file:
        first_line = file.readline().strip()
        remaining = [line.strip() for line in file.readlines()]
    print(first_line)
    print(remaining)""",
                "w 先写两行，a 追加第三行。readline 取午餐，readlines 取得剩余的地铁和购物。",
            ),
            section(
                "11.8 dump/load 和 dumps/loads 别少一个 s",
                "没有 s 的版本直接配合文件对象；带 s 的版本处理字符串。调试时可先 dumps 看序列化文本，网络传输后再 loads。JSON 只支持有限类型，Path、set 和自定义对象不能直接写入。",
                """import json


records = [
    {
        "date": "2026-08-06",
        "type": "支出",
        "amount": 35.5,
    }
]
json_text = json.dumps(records, ensure_ascii=False, indent=2)
restored = json.loads(json_text)
print(json_text)
print(restored)
print(type(restored).__name__)
print(restored == records)""",
                "dumps 返回字符串，loads 还原成列表；中文没有变成转义串，往返后的数据与原记录相等。",
            ),
            section(
                "11.9 os.path 和 Path 怎么对应",
                "老项目经常用 `os.path`，需要能看懂。`os.path.join/exists/basename/splitext` 分别对应 Path 的 `/`、`exists/name/stem+suffix` 思路。一个项目里尽量统一，不要来回转字符串。",
                """import os
from pathlib import Path


old_style = os.path.join("finance_app", "data", "records.json")
new_style = Path("finance_app") / "data" / "records.json"
print(old_style)
print(new_style)
print(os.path.basename(old_style))
print(os.path.splitext(old_style))
print(new_style.name, new_style.stem, new_style.suffix)""",
                "两种写法表达同一路径。os.path 返回字符串片段，Path 通过属性读取，组合更接近路径结构。",
            ),
        ],
    },
    12: {
        "plain": "异常处理不是用一个大 `except Exception` 把所有问题藏起来。先判断哪些错误你能解释、哪些需要继续抛出；捕获范围要小，错误信息要告诉用户下一步怎么改。测试也不只是跑成功案例，日期错误、金额为 0、文件损坏和编号越界都要主动验证。",
        "toolbox": """| 语法或工具 | 用途 | 提醒 |
|---|---|---|
| `try/except` | 捕获能处理的异常 | 只包可能失败的语句 |
| 多个 `except` | 分情况给出原因 | 先具体，后宽泛 |
| `else` | try 没异常时执行 | 放成功后续逻辑 |
| `finally` | 无论如何都执行 | 适合清理，不负责吞错 |
| `raise` | 主动拒绝非法状态 | 错误信息要具体 |
| `raise ... from ...` | 保留异常因果链 | 封装底层错误 |
| `assert` | 验证程序内部假设 | 不能代替用户输入校验 |
| `repr()`、`type()` | 看清值和类型 | 调试空格与类型问题 |""",
        "sections": [
            section(
                "12.5 常见异常类型要分得出来",
                "`ValueError` 是类型能接受但值不合法，`TypeError` 是对象类型不支持操作，`KeyError/IndexError` 是容器查找失败，`FileNotFoundError` 是路径不存在。分清类型，提示才能准确。",
                """def capture_error(action):
    try:
        action()
    except Exception as exc:
        return type(exc).__name__, str(exc)
    return "NoError", ""


cases = [
    lambda: float("abc"),
    lambda: 1 + "1",
    lambda: {}["amount"],
    lambda: [][0],
]
for action in cases:
    print(capture_error(action))""",
                "四个案例依次得到 ValueError、TypeError、KeyError 和 IndexError。这里只为演示统一捕获，业务函数应捕获更具体类型。",
            ),
            section(
                "12.6 多个 except、else 和 finally 的完整流程",
                "把不同失败原因拆开处理；只有完全成功才走 else；finally 无论成功失败都执行。文件关闭通常交给 with，finally 更适合释放外部资源或记录操作结束。",
                """def parse_positive_amount(raw):
    try:
        amount = float(raw)
        if amount <= 0:
            raise ValueError("金额必须大于 0")
    except TypeError:
        message = "输入类型不支持"
    except ValueError as exc:
        message = f"输入值错误：{exc}"
    else:
        message = f"有效金额：{amount:.2f}"
    finally:
        status = "校验已结束"
    return message, status


for sample in ["35.5", "abc", 0, None]:
    print(sample, parse_positive_amount(sample))""",
                "四个输入分别走成功、值错误、主动 raise 和类型错误分支；每次都带回“校验已结束”。",
            ),
            section(
                "12.7 raise from：给底层错误加业务说明",
                "底层 `float()` 只知道转换失败，不知道这是金额。用 `raise ValueError(...) from exc` 可以给用户业务提示，同时保留原始异常作为 `__cause__`，调试时不会丢线索。",
                """def validate_amount(raw):
    try:
        amount = float(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError("金额必须是数字") from exc
    if amount <= 0:
        raise ValueError("金额必须大于 0")
    return amount


try:
    validate_amount("三十五")
except ValueError as exc:
    print("业务错误：", exc)
    print("原始类型：", type(exc.__cause__).__name__)""",
                "外层看到“金额必须是数字”，异常因果链里仍保留 float 转换产生的原始 ValueError。",
            ),
            section(
                "12.8 自定义异常：区分业务错误",
                "项目变大后，可以定义自己的异常类型，让菜单只捕获可预期业务错误，编程错误仍正常暴露。自定义异常通常继承 ValueError 或 Exception，本身可以很简单。",
                """class RecordValidationError(ValueError):
    pass


def validate_record_type(record_type):
    allowed = {"收入", "支出"}
    if record_type not in allowed:
        raise RecordValidationError(
            f"未知类型：{record_type}"
        )
    return record_type


for sample in ["收入", "借款"]:
    try:
        print(validate_record_type(sample))
    except RecordValidationError as exc:
        print("记录校验失败：", exc)""",
                "收入正常返回，借款抛出专门的 RecordValidationError。调用方不必把它和文件、索引错误混为一谈。",
            ),
            section(
                "12.9 assert、表驱动测试和 repr 调试",
                "`assert actual == expected` 适合验证程序内部结果。把输入、期望放进列表，可以批量覆盖边界。失败时把 `repr` 放进消息，空格和换行就不会藏起来。",
                """def normalize_category(value):
    return str(value).strip().replace("food", "餐饮")


cases = [
    (" 餐饮 ", "餐饮"),
    ("food", "餐饮"),
    (" 交通", "交通"),
]
for raw, expected in cases:
    actual = normalize_category(raw)
    assert actual == expected, (
        f"输入 {raw!r} 得到 {actual!r}，期望 {expected!r}"
    )
    print(raw, "->", actual)
print("全部案例通过")""",
                "三个案例都通过。若修改函数造成失败，断言消息会把输入、实际值和期望值完整显示。",
            ),
        ],
    },
    13: {
        "plain": "模块解决“代码放哪”，类解决“哪些数据和行为总是一起出现”。这两件事不能混着学：先把校验、文件、业务操作拆成模块，再判断是否真的需要类来保存状态。一个只有 `__init__`、其余全是原函数复制进去的类，并不会自动让项目更好。",
        "toolbox": """| 语法或工具 | 用途 | 例子 |
|---|---|---|
| `import module` | 导入整个模块 | `json.loads(...)` 来源清楚 |
| `from module import name` | 导入指定名字 | 频繁使用时更短 |
| `__name__` | 判断模块怎样被运行 | 控制是否启动 main |
| `__init__` | 初始化实例状态 | 创建对象时自动调用 |
| 实例方法 | 操作某个实例 | 第一个参数通常是 self |
| `@classmethod` | 操作类或替代构造 | 第一个参数是 cls |
| `@staticmethod` | 放置不依赖实例的工具 | 没有 self/cls |
| `@property` | 用属性语法读取计算值 | 可保护状态接口 |
| `@dataclass` | 自动生成常用样板方法 | 适合数据对象 |""",
        "sections": [
            section(
                "13.5 import 的三种常见写法",
                "`import json` 保留模块前缀，来源最清楚；`from pathlib import Path` 适合频繁使用的明确名字；`import ... as ...` 用于约定俗成或解决名字过长。不要使用 `from module import *`，它会让名字来源消失。",
                """import json
import statistics as stats
from pathlib import Path


data = json.loads('[35.5, 18.0, 299.0]')
path = Path("records.json")
print("平均值：", stats.mean(data))
print("文件名：", path.name)
print("json 来源：", json.__name__)
print("Path 来源：", Path.__module__)""",
                "模块前缀让 json.loads 和 stats.mean 的来源一眼可见；Path 虽直接导入，仍能通过 __module__ 查看来源。",
            ),
            section(
                "13.6 类属性和实例属性不是一回事",
                "类属性由所有实例共享，实例属性属于某一个对象。可变列表通常不要直接放成类属性，否则不同账本会共享数据。常量适合类属性，记录列表应在 `__init__` 中为每个实例创建。",
                """class AccountBook:
    version = "1.0"

    def __init__(self, name):
        self.name = name
        self.records = []


personal = AccountBook("个人账本")
work = AccountBook("工作账本")
personal.records.append({"amount": 35.5})
print(personal.version, work.version)
print(personal.records)
print(work.records)
print(personal.__dict__)""",
                "两个实例共享 version 常量，但各自有独立 records。`__dict__` 显示当前实例真正保存的属性。",
            ),
            section(
                "13.7 实例方法、classmethod 和 staticmethod",
                "实例方法需要具体对象；类方法常用来提供替代构造方式；静态方法只是放在类命名空间里的工具，不读取 self 或 cls。别为了用装饰器而用，先看它依赖什么数据。",
                """class Record:
    def __init__(self, date, amount):
        self.date = date
        self.amount = float(amount)

    def display(self):
        return f"{self.date} | {self.amount:.2f}"

    @classmethod
    def from_dict(cls, data):
        return cls(data["date"], data["amount"])

    @staticmethod
    def is_positive(amount):
        return float(amount) > 0


record = Record.from_dict({"date": "2026-08-06", "amount": 35.5})
print(record.display())
print(Record.is_positive(18))""",
                "from_dict 通过 cls 创建实例，display 读取该实例状态，is_positive 不依赖任何实例也能由类直接调用。",
            ),
            section(
                "13.8 property：像属性一样读取计算结果",
                "`@property` 让方法通过属性语法访问，适合由内部状态计算出的只读值。不要把所有 getter 都改成 property；只有当它确实表现得像对象的一个属性时才用。",
                """class Summary:
    def __init__(self, income, expense):
        self.income = float(income)
        self.expense = float(expense)

    @property
    def balance(self):
        return self.income - self.expense

    @property
    def expense_rate(self):
        if self.income == 0:
            return None
        return self.expense / self.income


summary = Summary(5000, 1320)
print(summary.balance)
print(f"支出率：{summary.expense_rate:.1%}")""",
                "调用时没有括号，但 balance 和 expense_rate 每次都根据当前收入支出重新计算，没有额外存一份可能过期的数据。",
            ),
            section(
                "13.9 dataclass：少写数据类样板代码",
                "`@dataclass` 会根据类型标注自动生成初始化和可读的 repr，还能按需要生成比较方法。它适合主要负责保存数据的 Record；复杂校验可放在 `__post_init__`。",
                """from dataclasses import asdict, dataclass


@dataclass
class Record:
    date: str
    record_type: str
    category: str
    amount: float
    note: str = ""

    def __post_init__(self):
        self.amount = float(self.amount)
        if self.amount <= 0:
            raise ValueError("金额必须大于 0")


record = Record("2026-08-06", "支出", "餐饮", "35.5", "午餐")
print(record)
print(asdict(record))""",
                "dataclass 自动接收五个字段并生成展示；__post_init__ 把金额转成 float。asdict 方便后续写入 JSON。",
            ),
            section(
                "13.10 组合优先：AccountBook 管理 Record",
                "AccountBook 不需要继承 Record，它应该“拥有多条 Record”。这种关系叫组合。账本负责添加、查询和统计，记录只负责自身数据，两边职责更清楚。",
                """class AccountBook:
    def __init__(self, records=None):
        self.records = [] if records is None else list(records)

    def add(self, record):
        self.records.append(record)

    def search(self, category=None):
        if category is None:
            return list(self.records)
        return [
            record
            for record in self.records
            if record.category == category
        ]

    @property
    def total(self):
        return sum(record.amount for record in self.records)


book = AccountBook()
book.add(Record("2026-08-06", "支出", "餐饮", 35.5))
book.add(Record("2026-08-07", "支出", "交通", 18.0))
print(book.search("餐饮"))
print(book.total)""",
                "AccountBook 保存 Record 实例列表，搜索返回餐饮记录，总额为 53.5。两个类通过组合协作，没有错误继承关系。",
            ),
        ],
    },
})


METHOD_DRILLS = {
    1: {
        "title": "确认 Notebook 里的输入类型",
        "prompt": "把模拟表单中的金额文本转成数值，并确认金额不是布尔值。",
        "scaffold": """form_data = {"amount": "35.50", "confirmed": "yes"}

# TODO: 转换 amount，生成 confirmed 和 amount_is_number
amount = None
confirmed = None
amount_is_number = None

print(amount, confirmed, amount_is_number)""",
        "solution": """form_data = {"amount": "35.50", "confirmed": "yes"}

amount = float(form_data["amount"])
confirmed = form_data["confirmed"] == "yes"
amount_is_number = (
    isinstance(amount, (int, float))
    and not isinstance(amount, bool)
)
print(amount, type(amount).__name__)
print(confirmed, amount_is_number)
_ok = amount == 35.5 and confirmed and amount_is_number
print("诊断：", "通过" if _ok else "检查转换和类型判断")""",
    },
    2: {
        "title": "把文本金额变成可计算结果",
        "prompt": "把金额文本转换为浮点数，计算两件商品的合计和折后金额，并用 divmod 把 135 分钟拆成小时和分钟。",
        "scaffold": """raw_price = "125.75"
quantity = 2
discount = 10.0
total_minutes = 135

# TODO: 完成 price、subtotal、payable、hours、minutes
""",
        "solution": """raw_price = "125.75"
quantity = 2
discount = 10.0
total_minutes = 135

price = float(raw_price)
subtotal = price * quantity
payable = round(subtotal - discount, 2)
hours, minutes = divmod(total_minutes, 60)
print(f"小计：{subtotal:.2f}")
print(f"应付：{payable:.2f}")
print(f"学习时长：{hours} 小时 {minutes} 分钟")
_ok = payable == 241.5 and (hours, minutes) == (2, 15)
print("诊断：", "通过" if _ok else "检查类型转换或除法")""",
    },
    3: {
        "title": "从一行文本提取账目字段",
        "prompt": "清理一条带多余空格的文本记录，拆出日期、分类、金额和备注，并把金额转为浮点数。",
        "scaffold": """raw_row = " 2026-08-06 | 餐饮 | 35.50 | 午餐 "

# TODO: 清理文本，拆分字段，转换 amount
""",
        "solution": """raw_row = " 2026-08-06 | 餐饮 | 35.50 | 午餐 "

normalized_row = raw_row.strip().replace(" | ", "|")
parts = normalized_row.split("|")
date, category, raw_amount, note = parts
amount = float(raw_amount)
print(date, category, amount, note, sep=" | ")
_ok = parts == ["2026-08-06", "餐饮", "35.50", "午餐"]
print("诊断：", "通过" if _ok and amount == 35.5 else "检查 split 或 strip")""",
    },
    4: {
        "title": "复制后再整理列表",
        "prompt": "保留原始记录列表不变，在副本中删除一条撤销记录、加入新记录并按编号排序。",
        "scaffold": """record_ids = ["R003", "R001", "R002"]

# TODO: 使用 copy、remove、append 和 sort 完成 working_ids
working_ids = None
print(record_ids)
print(working_ids)""",
        "solution": """record_ids = ["R003", "R001", "R002"]

working_ids = record_ids.copy()
working_ids.remove("R002")
working_ids.append("R004")
working_ids.sort()
print("原列表：", record_ids)
print("整理后：", working_ids)
_ok = record_ids == ["R003", "R001", "R002"]
_ok = _ok and working_ids == ["R001", "R003", "R004"]
print("诊断：", "通过" if _ok else "检查副本和原列表是否混用")""",
    },
    5: {
        "title": "解包固定格式的账目",
        "prompt": "把一个四字段元组解包为有意义的变量，并用扩展解包取出前两个字段和剩余字段。",
        "scaffold": """record = ("2026-08-06", "支出", "餐饮", 35.5)

# TODO: 普通解包，再完成 head 和 tail 的扩展解包
""",
        "solution": """record = ("2026-08-06", "支出", "餐饮", 35.5)

date, record_type, category, amount = record
head, *tail = record
print(date, record_type, category, amount, sep=" | ")
print("首字段：", head)
print("剩余字段：", tail)
_ok = category == "餐饮" and amount == 35.5
_ok = _ok and tail == ["支出", "餐饮", 35.5]
print("诊断：", "通过" if _ok else "检查解包顺序")""",
    },
    6: {
        "title": "累计分类并识别重复编号",
        "prompt": "用字典的 get 累计两笔餐饮支出，并用集合判断新编号是否重复。",
        "scaffold": """totals = {"餐饮": 35.5}
seen_ids = {"R001", "R002"}
new_amount = 18.0
new_id = "R002"

# TODO: 更新 totals，生成 is_duplicate
""",
        "solution": """totals = {"餐饮": 35.5}
seen_ids = {"R001", "R002"}
new_amount = 18.0
new_id = "R002"

totals["餐饮"] = totals.get("餐饮", 0) + new_amount
is_duplicate = new_id in seen_ids
if not is_duplicate:
    seen_ids.add(new_id)
print("分类合计：", totals)
print("编号重复：", is_duplicate)
_ok = totals["餐饮"] == 53.5 and is_duplicate
print("诊断：", "通过" if _ok else "检查 get 或集合成员判断")""",
    },
    7: {
        "title": "把校验条件写成可解释的结论",
        "prompt": "为一条账目分别检查类型、金额和分类，再用 all 和 any 给出整体状态与复核状态。",
        "scaffold": """record = {"type": "支出", "category": "购物", "amount": 5200.0}
allowed_categories = {"餐饮", "交通", "购物", "工资", "其他"}

# TODO: 生成 checks、is_valid 和 needs_review
""",
        "solution": """record = {"type": "支出", "category": "购物", "amount": 5200.0}
allowed_categories = {"餐饮", "交通", "购物", "工资", "其他"}

checks = {
    "type": record["type"] in {"收入", "支出"},
    "amount": record["amount"] > 0,
    "category": record["category"] in allowed_categories,
}
is_valid = all(checks.values())
needs_review = any([record["amount"] >= 5000, record["category"] == "其他"])
print(checks)
print("有效：", is_valid)
print("需复核：", needs_review)
_ok = is_valid and needs_review
print("诊断：", "通过" if _ok else "检查条件组合")""",
    },
    8: {
        "title": "成对遍历并跳过无效金额",
        "prompt": "把分类和金额配对遍历，跳过非正金额，并输出用户从 1 开始看到的有效记录编号。",
        "scaffold": """categories = ["餐饮", "交通", "购物"]
amounts = [35.5, -1, 299.0]

# TODO: 使用 zip、enumerate 和 continue 输出有效记录
""",
        "solution": """categories = ["餐饮", "交通", "购物"]
amounts = [35.5, -1, 299.0]

valid_number = 0
valid_total = 0.0
for category, amount in zip(categories, amounts):
    if amount <= 0:
        print("跳过：", category, amount)
        continue
    valid_number += 1
    valid_total += amount
    print(f"{valid_number}. {category} {amount:.2f}")
print("有效合计：", valid_total)
_ok = valid_number == 2 and valid_total == 334.5
print("诊断：", "通过" if _ok else "检查 continue 或累计位置")""",
    },
    9: {
        "title": "写一个职责单一的格式化函数",
        "prompt": "实现一个只负责格式化金额的函数，支持默认货币符号，并验证它不修改原始金额。",
        "scaffold": """def format_amount(amount, currency="CNY "):
    # TODO: 返回格式化后的文本
    pass

raw_amount = 35.5
print(format_amount(raw_amount))""",
        "solution": """def format_amount(amount, currency="CNY "):
    # Return one display string without changing amount.
    return f"{currency}{amount:.2f}"


raw_amount = 35.5
text = format_amount(raw_amount)
usd_text = format_amount(raw_amount, currency="$")
print(text)
print(usd_text)
print("原始金额：", raw_amount)
_ok = text == "CNY 35.50" and raw_amount == 35.5
print("诊断：", "通过" if _ok else "检查返回值和默认参数")""",
    },
    10: {
        "title": "筛选、排序并找出最大支出",
        "prompt": "筛选支出记录，按金额从高到低排序，并找出最大的一笔；原始列表不能被修改。",
        "scaffold": """records = [
    {"type": "支出", "category": "餐饮", "amount": 35.5},
    {"type": "收入", "category": "工资", "amount": 5000.0},
    {"type": "支出", "category": "购物", "amount": 299.0},
]

# TODO: 生成 expenses、ranked 和 largest
""",
        "solution": """records = [
    {"type": "支出", "category": "餐饮", "amount": 35.5},
    {"type": "收入", "category": "工资", "amount": 5000.0},
    {"type": "支出", "category": "购物", "amount": 299.0},
]

expenses = list(filter(lambda item: item["type"] == "支出", records))
ranked = sorted(expenses, key=lambda item: item["amount"], reverse=True)
largest = max(expenses, key=lambda item: item["amount"], default=None)
print("排序后：", ranked)
print("最大支出：", largest)
_ok = largest["category"] == "购物"
_ok = _ok and records[0]["category"] == "餐饮"
print("诊断：", "通过" if _ok else "检查筛选或 key 函数")""",
    },
    11: {
        "title": "完成一次 JSON 往返",
        "prompt": "把一条账目转换为 JSON 文本，再读回 Python 字典；同时拼出数据文件的 Path 对象。",
        "scaffold": """from pathlib import Path
import json

record = {"date": "2026-08-06", "category": "餐饮", "amount": 35.5}

# TODO: 生成 data_path、json_text 和 restored
""",
        "solution": """from pathlib import Path
import json

record = {"date": "2026-08-06", "category": "餐饮", "amount": 35.5}

data_path = Path("finance_app") / "data" / "records.json"
json_text = json.dumps(record, ensure_ascii=False)
restored = json.loads(json_text)
print("路径：", data_path)
print("JSON：", json_text)
print("读回：", restored)
_ok = restored == record and data_path.name == "records.json"
print("诊断：", "通过" if _ok else "检查 dumps 和 loads 的方向")""",
    },
    12: {
        "title": "把无效输入变成明确错误",
        "prompt": "实现正金额转换函数：文本不能转数字或结果不大于 0 时，都要抛出 ValueError。",
        "scaffold": """def parse_positive_amount(raw_value):
    # TODO: 转为 float，并处理转换和范围错误
    pass

for raw_value in ["35.5", "bad", "0"]:
    # TODO: 调用函数并打印结果或错误原因
    pass""",
        "solution": """def parse_positive_amount(raw_value):
    try:
        amount = float(raw_value)
    except (TypeError, ValueError) as exc:
        raise ValueError("金额必须是数字") from exc
    if amount <= 0:
        raise ValueError("金额必须大于 0")
    return amount


for raw_value in ["35.5", "bad", "0"]:
    try:
        print(raw_value, "->", parse_positive_amount(raw_value))
    except ValueError as error:
        print(raw_value, "->", error)

_ok = parse_positive_amount("35.5") == 35.5
print("诊断：", "通过" if _ok else "检查异常路径")""",
    },
    13: {
        "title": "让记录对象和账本对象协作",
        "prompt": "定义一个账目数据类和一个只保存记录的账本类，并通过方法计算账本总额。",
        "scaffold": """from dataclasses import dataclass


@dataclass
class Record:
    # TODO: 定义 category 和 amount 字段
    pass


class AccountBook:
    # TODO: 初始化 records，完成 add 和 total
    pass""",
        "solution": """from dataclasses import dataclass


@dataclass
class Record:
    category: str
    amount: float


class AccountBook:
    def __init__(self):
        self.records = []

    def add(self, record):
        self.records.append(record)

    def total(self):
        return sum(record.amount for record in self.records)


book = AccountBook()
book.add(Record("餐饮", 35.5))
book.add(Record("交通", 18.0))
print(book.records)
print("总额：", book.total())
_ok = book.total() == 53.5
print("诊断：", "通过" if _ok else "检查对象状态和实例方法")""",
    },
}


TOPICS = [
    {
        "parent": 1,
        "file": "course-extra-python-notebook-tools.ipynb",
        "title": "Notebook 的输入、检查与探索",
        "why": "把 print、type、isinstance、dir 和输入转换单独练熟。",
    },
    {
        "parent": 2,
        "file": "course-extra-python-number-rules.ipynb",
        "title": "数值、类型转换与运算规则",
        "why": "集中处理金额转换、除法、浮点展示和 None。",
    },
    {
        "parent": 3,
        "file": "course-extra-python-text-cleaning.ipynb",
        "title": "字符串清洗、拆分与格式化",
        "why": "把文本清洗、字段拆分、编号和金额格式独立出来。",
    },
    {
        "parent": 4,
        "file": "course-extra-python-list-operations.ipynb",
        "title": "列表增删、排序与复制",
        "why": "专门解决列表副作用、删除方式、排序和浅复制。",
    },
    {
        "parent": 5,
        "file": "course-extra-python-tuple-unpacking.ipynb",
        "title": "元组解包与固定结构",
        "why": "把固定字段、组合键和 namedtuple 放在一个专题里。",
    },
    {
        "parent": 6,
        "file": "course-extra-python-dict-set.ipynb",
        "title": "字典读写与集合运算",
        "why": "专门练默认值累计、更新覆盖、删除键和集合关系。",
    },
    {
        "parent": 7,
        "file": "course-extra-python-validation-branches.ipynb",
        "title": "布尔逻辑、边界与分支设计",
        "why": "把 all、any、短路、早返回和边界表拆开练。",
    },
    {
        "parent": 8,
        "file": "course-extra-python-iteration-patterns.ipynb",
        "title": "range、zip 与循环控制",
        "why": "专门解决序号、配对遍历、跳过、终止和迭代器。",
    },
    {
        "parent": 9,
        "file": "course-extra-python-function-contracts.ipynb",
        "title": "函数接口、参数与作用域",
        "why": "把参数类型、默认值、返回、作用域和副作用拆开。",
    },
    {
        "parent": 10,
        "file": "course-extra-python-functional-tools.ipynb",
        "title": "内置函数、lambda 与高阶函数",
        "why": "单独训练排序键、筛选、转换、参数解包和函数传参。",
    },
    {
        "parent": 11,
        "file": "course-extra-python-file-json.ipynb",
        "title": "Path、文件模式与 JSON",
        "why": "将路径、读写模式、文本编码和 JSON 往返放在一个专题。",
    },
    {
        "parent": 12,
        "file": "course-extra-python-error-testing.ipynb",
        "title": "异常设计、断言与测试",
        "why": "把异常分类、raise from、断言和测试表单独练清楚。",
    },
    {
        "parent": 13,
        "file": "course-extra-python-oop-patterns.ipynb",
        "title": "模块导入、数据类与对象协作",
        "why": "将导入方式、实例状态、property、dataclass 和组合单独组织。",
    },
]

TOPIC_BY_PARENT = {topic["parent"]: topic for topic in TOPICS}


def topic_metadata(topic):
    parent = topic["parent"]
    topic_id = topic["file"].replace("course-extra-", "").replace(
        ".ipynb",
        "",
    )
    return {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3",
        },
        "language_info": {"name": "python", "version": "3.7"},
        "course_id": f"python-topic-{topic_id}",
        "chapter": parent,
        "sort_order": parent + 0.1,
        "chapter_title": topic["title"],
        "chapter_label": f"专题 · {topic['title']}",
        "chapter_module": "python",
        "chapter_kind": "extra",
        "estimated_minutes": 35,
        "tags": ["Python基础", "专题", "方法练习"],
        "python_foundation_version": VERSION,
        "learning_loop_version": LEARNING_LOOP_VERSION,
    }


def build_topic(topic):
    parent = topic["parent"]
    supplement = SUPPLEMENTS[parent]
    slug = topic["file"].replace(".ipynb", "")
    outline = "\n".join(
        f"- {item['title']}" for item in supplement["sections"]
    )
    cells = [
        markdown(
            slug,
            "title",
            f"# 专题：{topic['title']}\n\n"
            f"对应第{parent}章。本专题不引入新的大主题，"
            "只把一个容易混淆的功能练透。",
        ),
        markdown(slug, "why", f"## 这节只解决一件事\n\n{topic['why']}"),
        markdown(slug, "outline", f"## 本专题内容\n\n{outline}"),
        markdown(
            slug,
            "toolbox",
            "## 需要会用的函数和方法\n\n" + supplement["toolbox"],
        ),
    ]
    for index, item in enumerate(supplement["sections"], start=1):
        cells.extend([
            markdown(
                slug,
                f"section-{index}",
                f"## {item['title']}\n\n{item['explanation']}",
            ),
            code(slug, f"example-{index}", item["example"], ["example"]),
            markdown(
                slug,
                f"result-{index}",
                f"### 运行后要看什么\n\n{item['expected']}",
            ),
        ])
    cells.extend([
        markdown(
            slug,
            "finish",
            "## 学完这节再回到项目\n\n"
            "把上面的例子从头运行一遍，再回到“个人日常记账助手”。"
            "你应该能指出这些方法具体落在哪个函数里，而不是只记住名字。",
        ),
    ])
    return {
        "cells": cells,
        "metadata": topic_metadata(topic),
        "nbformat": 4,
        "nbformat_minor": 5,
    }


CAPSTONE_REFERENCE = r'''from datetime import datetime
from json import JSONDecodeError
import json
import math
from pathlib import Path


DATA_FILE = Path("finance_app/data/records.json")
ALLOWED_TYPES = {"收入", "支出"}
ALLOWED_CATEGORIES = {
    "餐饮",
    "交通",
    "购物",
    "工资",
    "奖金",
    "医疗",
    "其他",
}


def validate_date(date_text):
    """Validate YYYY-MM-DD text and return its normalized value."""
    if not isinstance(date_text, str):
        raise TypeError("日期必须是字符串")
    try:
        parsed = datetime.strptime(date_text, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError("日期必须是有效的 YYYY-MM-DD") from exc
    normalized = parsed.strftime("%Y-%m-%d")
    if normalized != date_text:
        raise ValueError("月份和日期必须补足两位")
    return normalized


def validate_amount(value):
    """Convert input to a positive finite float."""
    if isinstance(value, bool):
        raise TypeError("布尔值不能作为金额")
    try:
        amount = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("金额必须是数字") from exc
    if not math.isfinite(amount) or amount <= 0:
        raise ValueError("金额必须是大于 0 的有限数字")
    return round(amount, 2)


def validate_choice(value, allowed, field_name):
    """Return a value only when it belongs to the allowed set."""
    if value not in allowed:
        options = "、".join(sorted(allowed))
        raise ValueError(f"{field_name}必须是：{options}")
    return value


def load_data(path=DATA_FILE):
    """Load a JSON list; initialize missing files as an empty list."""
    path = Path(path)
    if not path.exists():
        return []
    try:
        with path.open("r", encoding="utf-8") as file:
            records = json.load(file)
    except JSONDecodeError as exc:
        raise ValueError(f"数据文件不是有效 JSON：{path}") from exc
    except OSError as exc:
        raise OSError(f"无法读取数据文件：{path}") from exc
    if not isinstance(records, list):
        raise ValueError("数据文件顶层必须是列表")
    return records


def save_data(records, path=DATA_FILE):
    """Persist records as readable UTF-8 JSON."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("w", encoding="utf-8") as file:
            json.dump(records, file, ensure_ascii=False, indent=2)
    except OSError as exc:
        raise OSError(f"无法保存数据文件：{path}") from exc


def next_record_id(records):
    """Create a stable display id without reusing the list index."""
    numbers = []
    for record in records:
        record_id = str(record.get("id", ""))
        if record_id.startswith("R") and record_id[1:].isdigit():
            numbers.append(int(record_id[1:]))
    next_number = max(numbers, default=0) + 1
    return f"R{next_number:04d}"


def add_record(
    records,
    date,
    record_type,
    amount,
    category,
    note="",
):
    """Validate, append, and return one new record."""
    record = {
        "id": next_record_id(records),
        "date": validate_date(date),
        "type": validate_choice(record_type, ALLOWED_TYPES, "类型"),
        "amount": validate_amount(amount),
        "category": validate_choice(
            category,
            ALLOWED_CATEGORIES,
            "分类",
        ),
        "note": str(note).strip(),
    }
    records.append(record)
    return record


def view_all(records):
    """Return a date-sorted text table without mutating records."""
    header = "序号 编号   日期         类型  分类      金额       备注"
    separator = "-" * 67
    lines = [header, separator]
    ordered = sorted(
        records,
        key=lambda item: (item["date"], item.get("id", "")),
    )
    for number, record in enumerate(ordered, start=1):
        line = (
            f"{number:>4} "
            f"{record.get('id', '-'):6} "
            f"{record['date']:12} "
            f"{record['type']:4} "
            f"{record['category']:8} "
            f"{record['amount']:10.2f} "
            f"{record.get('note', '')}"
        )
        lines.append(line)
    if not records:
        lines.append("暂无账目")
    return "\n".join(lines)


def search_records(
    records,
    start_date=None,
    end_date=None,
    record_type=None,
    category=None,
):
    """Combine optional filters and return date-sorted records."""
    if start_date is not None:
        start_date = validate_date(start_date)
    if end_date is not None:
        end_date = validate_date(end_date)
    if start_date and end_date and start_date > end_date:
        raise ValueError("开始日期不能晚于结束日期")
    if record_type is not None:
        validate_choice(record_type, ALLOWED_TYPES, "类型")
    if category is not None:
        validate_choice(category, ALLOWED_CATEGORIES, "分类")

    def matches(record):
        return (
            (start_date is None or record["date"] >= start_date)
            and (end_date is None or record["date"] <= end_date)
            and (record_type is None or record["type"] == record_type)
            and (category is None or record["category"] == category)
        )

    matched = list(filter(lambda record: matches(record), records))
    return sorted(matched, key=lambda record: record["date"])


def delete_record(records, number):
    """Delete by the one-based row number shown by view_all()."""
    if isinstance(number, bool):
        raise TypeError("编号必须是整数")
    try:
        index = int(number) - 1
    except (TypeError, ValueError) as exc:
        raise ValueError("编号必须是整数") from exc
    if index < 0:
        raise IndexError("编号超出范围")
    ordered = sorted(
        records,
        key=lambda item: (item["date"], item.get("id", "")),
    )
    try:
        selected = ordered[index]
    except IndexError as exc:
        raise IndexError("编号超出范围") from exc
    records.remove(selected)
    return selected


def statistics(records):
    """Return totals, category shares, and largest records."""
    income_records = list(
        filter(lambda record: record["type"] == "收入", records)
    )
    expense_records = list(
        filter(lambda record: record["type"] == "支出", records)
    )
    income = sum(map(lambda record: record["amount"], income_records))
    expense = sum(map(lambda record: record["amount"], expense_records))
    category_totals = {}
    for record in expense_records:
        category = record["category"]
        category_totals[category] = (
            category_totals.get(category, 0) + record["amount"]
        )
    category_shares = {
        category: total / expense
        for category, total in category_totals.items()
        if expense > 0
    }
    return {
        "income": income,
        "expense": expense,
        "balance": income - expense,
        "category_totals": category_totals,
        "category_shares": category_shares,
        "largest_income": max(
            income_records,
            key=lambda record: record["amount"],
            default=None,
        ),
        "largest_expense": max(
            expense_records,
            key=lambda record: record["amount"],
            default=None,
        ),
    }


def show_statistics(summary):
    """Print a statistics result returned by statistics()."""
    print(f"总收入：{summary['income']:.2f} 元")
    print(f"总支出：{summary['expense']:.2f} 元")
    print(f"结余：  {summary['balance']:.2f} 元")
    print("支出分类占比：")
    ranked = sorted(
        summary["category_shares"].items(),
        key=lambda item: item[1],
        reverse=True,
    )
    for category, share in ranked:
        total = summary["category_totals"][category]
        print(f"  {category}：{total:.2f} 元（{share:.1%}）")
    print("最大收入：", summary["largest_income"] or "无")
    print("最大支出：", summary["largest_expense"] or "无")


def show_menu():
    """Display the six commands of the application."""
    print("\n个人日常记账助手")
    print("1. 添加账目")
    print("2. 查看所有账目")
    print("3. 查询账目")
    print("4. 删除账目")
    print("5. 统计汇总")
    print("6. 退出")


def optional_input(prompt):
    """Convert an empty interactive answer to None."""
    value = input(prompt).strip()
    return value or None


def main(path=DATA_FILE):
    """Run the command-line menu until the user chooses exit."""
    try:
        records = load_data(path)
    except (OSError, ValueError) as exc:
        print(f"加载失败：{exc}")
        records = []

    while True:
        show_menu()
        choice = input("请选择 1-6：").strip()
        try:
            if choice == "1":
                record = add_record(
                    records,
                    date=input("日期 YYYY-MM-DD：").strip(),
                    record_type=input("类型（收入/支出）：").strip(),
                    amount=input("金额：").strip(),
                    category=input("分类：").strip(),
                    note=input("备注（可空）：").strip(),
                )
                save_data(records, path)
                print("已添加：", record)
            elif choice == "2":
                print(view_all(records))
            elif choice == "3":
                result = search_records(
                    records,
                    start_date=optional_input("开始日期（可空）："),
                    end_date=optional_input("结束日期（可空）："),
                    record_type=optional_input("类型（可空）："),
                    category=optional_input("分类（可空）："),
                )
                print(view_all(result))
                total = sum(record["amount"] for record in result)
                print(f"查询到 {len(result)} 条，金额合计 {total:.2f} 元")
            elif choice == "4":
                print(view_all(records))
                number = input("输入要删除的行号（从 1 开始）：")
                removed = delete_record(records, number)
                save_data(records, path)
                print("已删除：", removed)
            elif choice == "5":
                show_statistics(statistics(records))
            elif choice == "6":
                print("数据已保存，再见。")
                break
            else:
                print("无效选项，请输入 1-6。")
        except (IndexError, OSError, TypeError, ValueError) as exc:
            print(f"操作失败：{exc}")
        finally:
            print("本次操作结束。")
'''


def split_capstone_reference():
    markers = (
        "\ndef load_data(",
        "\ndef view_all(",
        "\ndef show_statistics(",
    )
    positions = [CAPSTONE_REFERENCE.index(marker) for marker in markers]
    starts = [0, *positions]
    ends = [*positions, len(CAPSTONE_REFERENCE)]
    return [
        CAPSTONE_REFERENCE[start:end].strip()
        for start, end in zip(starts, ends)
    ]


def capstone_metadata():
    return {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3",
        },
        "language_info": {"name": "python", "version": "3.11"},
        "chapter": 13,
        "chapter_title": "个人日常记账助手",
        "chapter_label": "Python 基础大作业·个人日常记账助手",
        "chapter_module": "python",
        "chapter_kind": "capstone",
        "course_role": "module-capstone",
        "estimated_minutes": 240,
        "tags": ["Python基础", "模块大作业", "个人记账助手"],
        "python_foundation_version": VERSION,
        "learning_loop_version": LEARNING_LOOP_VERSION,
    }


def build_capstone():
    slug = "module-capstone-python"
    reference_parts = split_capstone_reference()
    cells = [
        markdown(
            slug,
            "title",
            """# Python 基础大作业：个人日常记账助手

这不是一道把所有代码一次写完的题。你会沿用前 13 章形成的记录结构，逐步完成校验、持久化、查询、删除、统计和命令行菜单。每个阶段都先确认输入与输出，再组合成完整程序。""",
        ),
        markdown(
            slug,
            "deliverables",
            """## 1. 项目目标与验收结果

最终程序应支持六项操作：添加、查看、组合查询、删除、统计、退出，并把数据保存到 JSON 文件。

完成后应能回答：

- 为什么业务函数接收参数而不是直接调用 `input()`？
- `load_data()`、`save_data()` 分别处理哪些异常？
- 为什么查询返回新列表，而删除会修改原列表？
- `key=lambda ...` 在排序和最大值中分别决定了什么？
- 空账本、错误日期、0 金额、越界编号会得到什么结果？""",
        ),
        markdown(
            slug,
            "contract",
            """## 2. 先定数据契约

每条账目是一个字典，字段必须保持一致：

| 字段 | 类型 | 示例 | 规则 |
|---|---|---|---|
| `id` | `str` | `R0001` | 程序生成，展示用 |
| `date` | `str` | `2026-08-06` | 有效的 `YYYY-MM-DD` |
| `type` | `str` | `支出` | 只能是收入或支出 |
| `amount` | `float` | `35.50` | 大于 0 的有限数字 |
| `category` | `str` | `餐饮` | 必须在预设分类中 |
| `note` | `str` | `午餐` | 可为空 |

先约定结构，后面的排序、筛选、统计和 JSON 才能共享同一套字段。""",
        ),
        code(
            slug,
            "contract-example",
            '''sample_record = {
    "id": "R0001",
    "date": "2026-08-06",
    "type": "支出",
    "amount": 35.5,
    "category": "餐饮",
    "note": "午餐",
}
required_fields = {"id", "date", "type", "amount", "category", "note"}
print("字段完整：", set(sample_record) == required_fields)
print("金额类型：", type(sample_record["amount"]).__name__)''',
            ["example", "check"],
        ),
        markdown(
            slug,
            "project-toolbox",
            """## 2.1 这个项目会真正用到哪些函数和方法

| 函数或方法 | 在项目里负责什么 | 返回值与副作用 |
|---|---|---|
| `str.strip()` | 清掉输入两端空格 | 返回新字符串，不改原字符串 |
| `datetime.strptime()` | 把日期文本按格式解析 | 成功返回日期对象，失败抛异常 |
| `math.isfinite()` | 拒绝 `inf` 和 `nan` 金额 | 返回布尔值 |
| `list.append()` | 加入新账目 | 修改原列表，返回 `None` |
| `list.pop()`、`remove()` | 删除账目 | 修改原列表，pop 还返回元素 |
| `dict.get()` | 读取可选字段或累计默认值 | 不修改字典 |
| `sorted(..., key=...)` | 按日期、金额排序 | 返回新列表 |
| `filter()`、`map()` | 筛选记录、提取金额 | 返回可消费的迭代器 |
| `sum()`、`max(..., key=...)` | 汇总金额、找最大一笔 | 返回数字或整条记录 |
| `enumerate(..., start=1)` | 生成用户看到的行号 | 返回序号和值 |
| `Path.mkdir()`、`open()` | 建目录、打开文件 | mkdir 改文件系统，open 返回文件对象 |
| `json.load/dump` | JSON 文件与 Python 对象互转 | load 返回对象，dump 写文件 |""",
        ),
        code(
            slug,
            "project-toolbox-example",
            '''records = [
    {"date": "2026-08-07", "type": "支出", "amount": 18.0},
    {"date": "2026-08-06", "type": "收入", "amount": 5000.0},
    {"date": "2026-08-08", "type": "支出", "amount": 35.5},
]
expenses = list(
    filter(lambda record: record["type"] == "支出", records)
)
amounts = list(map(lambda record: record["amount"], expenses))
ordered = sorted(records, key=lambda record: record["date"])
largest = max(expenses, key=lambda record: record["amount"], default=None)
for number, record in enumerate(ordered, start=1):
    print(number, record)
print("支出金额：", amounts)
print("支出合计：", sum(amounts))
print("最大支出：", largest)''',
            ["example"],
        ),
        markdown(
            slug,
            "architecture",
            """## 3. 从 Notebook 走向模块

先在 Notebook 中完成并测试函数，再按职责拆到下面的目录。拆分时移动代码，不要重新发明一套实现。

```text
finance_app/
├── data/
│   └── records.json
├── modules/
│   ├── __init__.py
│   ├── file_handler.py    # load_data, save_data
│   ├── operations.py      # add, view, search, delete, statistics
│   └── utils.py           # 日期、金额、选项校验
└── main.py                # show_menu, main
```

依赖方向是 `main -> operations/file_handler -> utils`。底层函数不反过来读取菜单输入。""",
        ),
        markdown(
            slug,
            "function-contracts",
            """## 3.1 先把每个函数的账算清楚

| 函数 | 主要参数 | 返回什么 | 会改数据吗 |
|---|---|---|---|
| `validate_date` | 日期字符串 | 规范日期字符串 | 不会 |
| `validate_amount` | 字符串或数字 | 正的两位小数浮点数 | 不会 |
| `load_data` | 文件路径 | 记录列表 | 只读文件 |
| `save_data` | 记录列表、路径 | `None` | 写文件 |
| `add_record` | 记录列表和五个字段 | 新记录字典 | 会 append |
| `view_all` | 记录列表 | 表格字符串 | 不会，只生成排序副本 |
| `search_records` | 记录列表和可选条件 | 筛选后的新列表 | 不会 |
| `delete_record` | 记录列表、行号 | 被删除记录 | 会 remove |
| `statistics` | 记录列表 | 统计字典 | 不会 |
| `show_menu` | 无 | `None` | 只打印 |
| `main` | 数据路径 | `None` | 组织输入、输出和保存 |

这张表是整个项目的接口约定。写函数前先看这一行：如果返回值和副作用说不清，函数职责通常还没有拆好。""",
        ),
        markdown(
            slug,
            "milestone-1",
            """## 4. 阶段一：输入校验

校验函数的契约要稳定：合法输入返回规范化值，非法输入抛出带原因的异常。这样菜单可以统一捕获错误，测试也不依赖人工输入。

边界至少包括：闰年日期、月份未补零、数字字符串、0、负数、`nan`、布尔值。""",
        ),
        code(
            slug,
            "validation-workspace",
            '''from datetime import datetime
import math


def validate_date(date_text):
    # TODO: 解析日期，拒绝非字符串和未补零日期
    pass


def validate_amount(value):
    # TODO: 转为 float，拒绝 bool、非数字、非有限数和非正数
    pass


date_cases = ["2026-08-06", "2026-02-29", "2024-02-29", "2026-8-6"]
amount_cases = ["35.5", 0, -1, "abc", float("nan"), True]
print("先预测每个案例会返回还是抛出异常，再逐个测试。")''',
            ["exercise", "guided"],
        ),
        markdown(
            slug,
            "milestone-2",
            """## 5. 阶段二：文件读写

`load_data(path)` 只负责把 JSON 转回列表；文件不存在时返回空列表，JSON 损坏时不能假装它是空文件。`save_data(records, path)` 要先创建父目录，再用 UTF-8 写入。

`with` 保证正常结束或抛出异常时都关闭文件。`ensure_ascii=False` 让中文直接保存在 JSON 中，`indent=2` 方便人工检查。""",
        ),
        code(
            slug,
            "persistence-workspace",
            '''from json import JSONDecodeError
import json
from pathlib import Path


def load_data(path):
    # TODO: 缺失返回 []；损坏 JSON 给出明确错误
    pass


def save_data(records, path):
    # TODO: 创建父目录并写入 UTF-8 JSON
    pass''',
            ["exercise", "guided"],
        ),
        markdown(
            slug,
            "milestone-3",
            """## 6. 阶段三：让业务函数可组合

把“计算”和“展示”分开：

- `add_record` 修改列表并返回新增记录；
- `view_all` 返回表格字符串，不偷偷保存文件；
- `search_records` 返回筛选后的新列表；
- `delete_record` 按用户看到的 1 起始编号删除；
- `statistics` 返回统计字典，由展示函数决定怎样打印。

这样的函数既能被菜单调用，也能直接写断言测试。""",
        ),
        code(
            slug,
            "operations-workspace",
            '''def search_records(
    records,
    start_date=None,
    end_date=None,
    record_type=None,
    category=None,
):
    # TODO: 逐项应用非 None 条件，最后按日期排序
    pass


def statistics(records):
    # TODO: 返回收入、支出、结余、分类占比和两种最大记录
    pass


def delete_record(records, number):
    # TODO: 把 1 起始编号转成索引，捕获越界
    pass''',
            ["exercise"],
        ),
        markdown(
            slug,
            "function-map",
            """## 7. 函数调用关系

```text
main
├── load_data / save_data
├── add_record
│   ├── validate_date
│   ├── validate_amount
│   └── validate_choice
├── view_all
├── search_records
├── delete_record
└── show_statistics
    └── statistics
```

观察参数如何向下传递，返回值如何向上汇总。`main()` 负责流程，具体规则留在小函数中。""",
        ),
        markdown(
            slug,
            "reference-intro",
            """## 8. 完整参考实现

先比较你的函数契约，再运行参考实现。这里没有省略号或待补函数。代码按职责拆成四格，必须从上往下运行；前一格定义的函数会被后一格使用。""",
        ),
        markdown(
            slug,
            "reference-validation-title",
            """### 8.1 常量与输入校验

这一格先建立允许值集合，再实现日期、金额和选项校验。校验函数只接收参数，不调用 `input()`；成功就返回规范值，失败就抛出具体异常。""",
        ),
        code(
            slug,
            "reference-validation",
            reference_parts[0],
            ["solution"],
        ),
        markdown(
            slug,
            "reference-persistence-title",
            """### 8.2 JSON 持久化与添加记录

`load_data` 和 `save_data` 只负责文件；`next_record_id` 只负责编号；`add_record` 组合前面的校验函数并修改记录列表。这样文件错误和输入错误不会混成一团。""",
        ),
        code(
            slug,
            "reference-persistence",
            reference_parts[1],
            ["solution"],
        ),
        markdown(
            slug,
            "reference-operations-title",
            """### 8.3 查看、组合查询、删除和统计

这一格是业务核心。`view_all/search_records/statistics` 都不修改原列表；`delete_record` 明确会修改。查看与删除使用同一套排序规则，屏幕第 1 行才会对应真正删除的第 1 行。""",
        ),
        code(
            slug,
            "reference-operations",
            reference_parts[2],
            ["solution"],
        ),
        markdown(
            slug,
            "reference-menu-title",
            """### 8.4 展示函数和主菜单

最后一格才出现 `input()` 和大量 `print()`。`main` 不重新实现校验、查询或统计，它只负责根据用户选择调用前面已经测试过的函数，并在增删后保存文件。""",
        ),
        code(
            slug,
            "reference-menu",
            reference_parts[3],
            ["solution"],
        ),
        markdown(
            slug,
            "verification-intro",
            """## 9. 非交互自动验收

下面不启动菜单，而是在临时目录完成两次添加、保存、重新读取、组合查询、统计和删除。临时文件会自动清理，不会污染正式账本。所有断言通过才说明主流程真正闭环。""",
        ),
        code(
            slug,
            "verification",
            '''from tempfile import TemporaryDirectory


with TemporaryDirectory() as temp_dir:
    test_path = Path(temp_dir) / "data" / "records.json"
    records = []
    first = add_record(
        records,
        "2026-08-07",
        "支出",
        "35.50",
        "餐饮",
        "午餐",
    )
    second = add_record(
        records,
        "2026-08-06",
        "收入",
        5000,
        "工资",
        "八月工资",
    )
    save_data(records, test_path)
    loaded = load_data(test_path)
    expenses = search_records(loaded, record_type="支出")
    summary = statistics(loaded)

    assert first["id"] == "R0001"
    assert second["id"] == "R0002"
    assert loaded == records
    assert len(expenses) == 1
    assert summary["income"] == 5000.0
    assert summary["expense"] == 35.5
    assert summary["balance"] == 4964.5
    assert summary["largest_expense"]["category"] == "餐饮"
    table = view_all(loaded)
    assert table.index("R0002") < table.index("R0001")

    removed = delete_record(loaded, 1)
    assert removed["id"] == "R0002"
    assert len(loaded) == 1

print("自动验收通过：添加、存读、查询、统计、展示、删除均正常。")''',
            ["check"],
        ),
        markdown(
            slug,
            "error-tests",
            """## 10. 失败路径验收

成功案例不够。继续测试错误输入，确认程序给出可理解的错误，而不是悄悄写入坏数据。""",
        ),
        code(
            slug,
            "failure-check",
            '''invalid_cases = [
    (validate_date, "2026-02-29"),
    (validate_date, "2026-8-6"),
    (validate_amount, 0),
    (validate_amount, "abc"),
    (validate_amount, float("inf")),
]
errors = []
for function, value in invalid_cases:
    try:
        function(value)
    except (TypeError, ValueError) as exc:
        errors.append(str(exc))

try:
    delete_record([], 1)
except IndexError as exc:
    errors.append(str(exc))

assert len(errors) == 6
print("失败路径通过：")
for message in errors:
    print("-", message)''',
            ["check"],
        ),
        markdown(
            slug,
            "interactive",
            """## 11. 启动真实菜单

自动验收通过后，取消下一格最后一行的注释即可使用真实文件。退出菜单后重新启动，检查数据是否仍存在。交作业时不要让 Notebook 自动卡在 `input()` 上。""",
        ),
        code(
            slug,
            "run-main",
            '''# 确认自动验收通过后再手动运行：
# main()''',
            ["optional", "interactive"],
        ),
        markdown(
            slug,
            "rubric",
            """## 12. 提交清单与评分标准

| 维度 | 分值 | 可验证证据 |
|---|---:|---|
| 功能完整性 | 40 | 六项菜单功能与成功/失败路径均可运行 |
| 函数应用 | 25 | 职责单一、参数清楚、有返回值和文档字符串；合理使用内置函数与 lambda |
| 代码质量 | 20 | PEP 8、命名清楚、无重复逻辑、界面层与业务层分开 |
| 数据持久化 | 10 | JSON 重启后仍存在，缺失和损坏文件处理明确 |
| 拓展 | 5 | 在基础验收全通过后再做类、预算提醒或图表 |

提交前从“重启内核并运行全部”开始，不能依赖隐藏的旧变量。保留自动验收输出，并用三条自己的账目完成一次人工演示。""",
        ),
        markdown(
            slug,
            "extension",
            """## 13. 加分项：从字典到类

基础版本稳定后，可以用 `Record` 表达单条记录，用 `AccountBook` 管理列表和文件。类不是为了把函数换一种写法，而是把长期共享的状态与行为放在一起。

迁移顺序建议：先给 `Record` 增加 `to_dict()`，再让 `AccountBook` 调用已经验证过的查询与统计函数，最后才考虑图形界面。""",
        ),
        code(
            slug,
            "extension-workspace",
            '''class Record:
    def __init__(self, date, record_type, amount, category, note=""):
        self.date = validate_date(date)
        self.record_type = validate_choice(
            record_type,
            ALLOWED_TYPES,
            "类型",
        )
        self.amount = validate_amount(amount)
        self.category = validate_choice(
            category,
            ALLOWED_CATEGORIES,
            "分类",
        )
        self.note = note

    def to_dict(self):
        return {
            "date": self.date,
            "type": self.record_type,
            "amount": self.amount,
            "category": self.category,
            "note": self.note,
        }


class AccountBook:
    def __init__(self, path=DATA_FILE):
        self.path = Path(path)
        self.records = load_data(self.path)

    def save(self):
        save_data(self.records, self.path)

    # TODO: 复用已完成函数实现 add、search、delete、statistics''',
            ["exercise", "optional"],
        ),
        markdown(
            slug,
            "finish",
            """## 完成标准

当你能从空目录启动程序、添加并重启读取数据、完成组合查询与删除、解释统计中的 `filter/map/max(key=...)`，并让两组自动验收全部通过，这个模块才算闭环。""",
        ),
    ]
    return {
        "cells": cells,
        "metadata": capstone_metadata(),
        "nbformat": 4,
        "nbformat_minor": 5,
    }


def write_notebook(path, notebook):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(notebook, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main():
    for topic in TOPICS:
        topic_path = COURSE_DIR / topic["file"]
        if topic_path.exists():
            topic_path.unlink()

    lesson_paths = []
    for chapter in sorted(CHAPTERS, key=lambda item: item["number"]):
        path = COURSE_DIR / chapter["file"]
        write_notebook(path, build_lesson(chapter))
        lesson_paths.append(path)

    capstone_path = (
        COURSE_DIR / "module-capstones" / "module-capstone-python.ipynb"
    )
    write_notebook(capstone_path, build_capstone())
    print(
        f"Built {len(lesson_paths)} integrated Python lessons and 1 capstone."
    )


if __name__ == "__main__":
    main()
