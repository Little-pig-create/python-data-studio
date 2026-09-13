"""course-chapter-24 数据读取与保存"""

TITLE = "数据读取与保存"
EST_MINUTES = 55

CELLS = [
    ("md", """\
# 第28章 数据读取与保存

清洗好的表要存出去、别人的 CSV 要读进来——这是数据工作的进出口。
本章以 CSV 为主线（最通用的格式），顺带覆盖 JSON 与 Excel，
重点讲清**读入参数**：列类型、日期解析、编码——
90% 的“读进来的数据不对劲”都出在这里。""", []),

    ("md", """## 学习目标

学完本章，你能够：

- 用 `read_csv` 读文件，用 `dtype` / `parse_dates` 控制列类型；
- 用 `to_csv` 保存，决定要不要带索引；
- 处理编码问题（utf-8 / gbk）并识别其症状；
- 避开三大坑：索引列重复保存、类型全变 object、路径找不到。""", []),

    ("md", """## 1. read_csv：读对类型，事半功倍

**概念**：CSV 是纯文本，**所有类型信息都会丢失**——
“2026-08-01”读进来是字符串、编号“001”读进来是整数 1。
`dtype` 指定列类型、`parse_dates` 指定日期列，
**在读取时声明类型**比事后 astype 更稳、更省内存。""", []),

    ("md", "### 例 1｜最小例子：默认读取的坑", []),

    ("code", """\
import pandas as pd
from pathlib import Path

path = Path("course_out") / "mini.csv"
path.parent.mkdir(exist_ok=True)
Path(path).write_text(
    "id,date,amount\\n001,2026-08-01,25.5\\n002,2026-08-02,4.0\\n",
    encoding="utf-8")

df = pd.read_csv(path)
print(df.dtypes)     # id 是 int64（前导 0 丢了！date 是 object）

df = pd.read_csv(path, dtype={"id": "string"}, parse_dates=["date"])
print(df.dtypes)     # 这次对了""", ["example"]),

    ("md", "### 例 2｜业务例子：读取真实账单", []),

    ("code", """\
import pandas as pd
from pathlib import Path

# 课程数据集里的一份个人账单流水（83 行）
df = pd.read_csv(
    "/datasets/module1_ledger.csv",
    dtype={"分类": "string"},
    parse_dates=["日期"],
)
print(df.shape)
print(df.head(3))
print(df.dtypes)   # 日期已是 datetime64，分类是 string""", ["example"]),

    ("md", "### 例 3｜常见错误：编码乱码", []),

    ("code", """\
import pandas as pd

# 症状：读出来全是乱码字符（锟斤拷…）或直接 UnicodeDecodeError
# 原因：文件是 GBK 编码，默认按 utf-8 解

# 修复：声明正确编码
# df = pd.read_csv(path, encoding="gbk")

# 排查顺序：utf-8 -> gbk -> utf-8-sig（Excel 导出的 utf-8 带 BOM）
print("常见编码：utf-8（默认）、gbk（国产 Excel/老系统）、utf-8-sig")""", ["example"]),

    ("md", """\
**要点**：乱码先换 `encoding`；编号列前导 0 丢失用 `dtype="string"`；
日期列一律 `parse_dates`。**读取参数写清楚，下游少一半清洗。**""", []),

    ("md", """## 2. to_csv：存出去别埋雷

**概念**：`df.to_csv(路径)` 默认**会把行索引存成第一列**——
下一次读回来会多出一列 `Unnamed: 0`。
不要索引就写 `index=False`。同样地，`encoding` 决定别人能否打开。""", []),

    ("md", "### 例 1｜最小例子：index 的坑", []),

    ("code", """\
import pandas as pd
from pathlib import Path

out = Path("course_out")
out.mkdir(exist_ok=True)
df = pd.DataFrame({"item": ["咖啡", "地铁"], "amount": [18.0, 4.0]})

df.to_csv(out / "bad.csv")                     # 索引被存进去！
print(pd.read_csv(out / "bad.csv").columns.tolist())
# ['Unnamed: 0', 'item', 'amount']

df.to_csv(out / "good.csv", index=False)       # 规范写法
print(pd.read_csv(out / "good.csv").columns.tolist())""", ["example"]),

    ("md", "### 例 2｜业务例子：清洗结果落盘", []),

    ("code", """\
import pandas as pd
from pathlib import Path

ledger = pd.DataFrame({
    "date": pd.to_datetime(["2026-08-01", "2026-08-02"]),
    "category": ["餐饮", "交通"],
    "amount": [25.5, 4.0],
})

out = Path("course_out")
ledger.to_csv(out / "ledger_clean.csv", index=False)   # 干净落盘

# 读回验证：保存-读取闭环必须自查
back = pd.read_csv(out / "ledger_clean.csv", parse_dates=["date"])
print(back.dtypes)
if back.shape != ledger.shape:
    raise ValueError(f"读回校验失败：{back.shape} != {ledger.shape}")
print("闭环验证通过")""", ["example"]),

    ("md", "### 例 3｜常见错误：覆盖与路径", []),

    ("code", """\
from pathlib import Path

# 反例 1：to_csv 直接覆盖同名文件，历史数据无备份就没了
# 好习惯：重要产物按日期命名
# out = Path("course_out") / "ledger_20260812.csv"

# 反例 2：目录不存在 -> FileNotFoundError
try:
    (Path("no_such_dir") / "x.csv").write_text("a")
except FileNotFoundError as e:
    print("目录不存在，先 mkdir:", e)

# 修复：parent.mkdir(parents=True, exist_ok=True) 再写
target = Path("no_such_dir") / "x.csv"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text("ok", encoding="utf-8")
print(target.read_text(encoding="utf-8"))""", ["example"]),

    ("md", """\
**要点**：**写文件前先 `mkdir(parents=True, exist_ok=True)`；
重要产物带日期命名，防覆盖。**""", []),

    ("md", """## 3. 其他格式：JSON、Excel 与格式选择

**概念**：
`read_json` / `to_json` 适合结构化交换（网页接口、配置）；
`read_excel` / `to_excel` 面向业务同事（需要 openpyxl 依赖）；
CSV 是通用交换格式。**记住各自丢什么**：CSV 不存类型，Excel 存样式不存分析口径。""", []),

    ("md", "### 例 1｜业务例子：账本的 JSON 往返", []),

    ("code", """\
import pandas as pd
from pathlib import Path

ledger = pd.DataFrame({
    "summary": ["咖啡", "地铁"],
    "amount": [18.0, 4.0],
})
out = Path("course_out")

# to_json: orient="records" 每行一个字典（最常用的交换形态）
ledger.to_json(out / "ledger.json", orient="records", force_ascii=False,
               indent=2)
back = pd.read_json(out / "ledger.json")
print(back)
print(back.dtypes)     # JSON 不保类型：18.0 可能读回为数值，需自查""", ["example"]),

    ("md", "### 例 2｜常见错误：JSON 读回类型漂移", []),

    ("code", """\
import pandas as pd
from pathlib import Path

out = Path("course_out")
pd.DataFrame({"id": ["001", "002"], "amount": [18.0, 4.0]}).to_json(
    out / "t.json", orient="records", force_ascii=False)

back = pd.read_json(out / "t.json")
print(back.dtypes)     # id 读回 int64？字符串编号又丢了前导 0

# 修复：读回后立即声明类型（JSON 类型系统比 CSV 还弱）
back = pd.read_json(out / "t.json", dtype={"id": "string"})
print(back.dtypes)""", ["example"]),

    ("md", """\
**要点**：**CSV/JSON 都不保存类型**——保存前注释好字段口径，
读取时用 `dtype`/`parse_dates` 重新声明。类型管理永远是读取方的责任。""", []),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 24.1：规范的保存与读回", ["exercise"]),

    ("code", """\
import pandas as pd
from pathlib import Path

df = pd.DataFrame({
    "date": pd.to_datetime(["2026-08-01", "2026-08-02", "2026-08-03"]),
    "summary": ["咖啡", "地铁", "电影"],
    "amount": [18.0, 4.0, 45.0],
})

# TODO 1：保存到 course_out/ledger.csv，不带索引
# TODO 2：读回（date 用 parse_dates），打印 dtypes
# TODO 3：用 if + raise 验证行数一致，打印“闭环通过”""", ["exercise"]),

    ("md", "### 练一练 24.2：读取参数实战", ["exercise"]),

    ("code", """\
import pandas as pd
from pathlib import Path

# 先造一份“脏”文件模拟外部数据
out = Path("course_out")
out.mkdir(exist_ok=True)
(out / "raw.csv").write_text(
    "编号,日期,金额\\nA01,2026/8/1,25.5\\nA02,2026/8/2,4.0\\n",
    encoding="utf-8")

# TODO 1：默认 read_csv 读取，打印 dtypes 观察问题
# TODO 2：带参数重读：编号转 string、日期 parse_dates
# TODO 3：打印“编号 A01 是否保留前导字母”，确认类型正确""", ["exercise"]),

    ("md", "### 练一练 24.3：格式选择判断", ["exercise"]),

    ("md", """\
不写代码，口答选 CSV / JSON / Excel：

1. 给不会编程的业务同事看汇总表；
2. 程序接口之间交换账目记录；
3. 存档百万行的流水供下次分析读取。

并说明：三种格式各自丢失什么信息？""", ["exercise"]),

    ("md", """## 易错点清单

- 读 CSV 编码乱码：依次试 utf-8 / gbk / utf-8-sig；
- `to_csv` 默认带索引，规范写法 `index=False`；
- 编号列前导 0 丢失：读取时 `dtype="string"`；
- 日期列读取时 `parse_dates`，否则下游 `.dt` 全报错；
- 写文件前 `mkdir(parents=True, exist_ok=True)`；
- CSV/JSON 都不保类型——类型管理是读取方的责任。""", []),

    ("md", """## 本章小结

- 读与写是一对闭环：保存时埋的雷（索引、类型）会在读取时炸。
- read_csv 的三个关键参数：dtype、parse_dates、encoding。
- 格式选择：CSV 通用、JSON 交换、Excel 面向人。
- 下一章：把读进来的表“算出结论”——分组聚合与透视。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 24.1 参考答案
import pandas as pd
from pathlib import Path

df = pd.DataFrame({
    "date": pd.to_datetime(["2026-08-01", "2026-08-02", "2026-08-03"]),
    "summary": ["咖啡", "地铁", "电影"],
    "amount": [18.0, 4.0, 45.0],
})
out = Path("course_out")
out.mkdir(exist_ok=True)
df.to_csv(out / "ledger.csv", index=False)

back = pd.read_csv(out / "ledger.csv", parse_dates=["date"])
print(back.dtypes)
if back.shape != df.shape:
    raise ValueError(f"读回校验失败：{back.shape} != {df.shape}")
print("闭环通过")""", ["solution"]),

    ("code", """\
# 练一练 24.2 参考答案
import pandas as pd
from pathlib import Path

path = Path("course_out") / "raw.csv"
df = pd.read_csv(path)          # TODO 1：观察 dtypes
print(df.dtypes)

df = pd.read_csv(path, dtype={"编号": "string"}, parse_dates=["日期"])
print(df.dtypes)
print("前导字母保留:", df["编号"].iloc[0] == "A01")""", ["solution"]),

    ("code", """\
# 练一练 24.3 参考答案
# 1. Excel —— 面向人，可看可改可排版；
# 2. JSON —— 程序接口交换，保留结构（列表装字典）；
# 3. CSV —— 通用紧凑，读写快。
# 丢失的信息：CSV 丢类型与索引；JSON 丢类型精度（如日期）；Excel 不存
# 计算口径，且多 sheet 容易藏“影子版本”。""", ["solution"]),

    ("code", """\
# 清理本章产物（放在最后：参考答案运行完再删）
import shutil
from pathlib import Path

d = Path("course_out")
if d.exists():
    shutil.rmtree(d)
    print("已清理 course_out/")
else:
    print("无产物")""", []),
]
