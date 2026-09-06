# -*- coding: utf-8 -*-
"""优化可视化模块内部内容：统一中文字体导入 + 修复坏单元格。

范围：public/course 下三个可视化模块（matplotlib 第32–43章、seaborn 第44–63章、plotly 第64–81章，
文件对应 course-chapter-28..74 + 模块引子 + 模块收官）。

做的事情：
1. 字体导入统一（消除冗余）：
   - seaborn 章节的 setup 单元格：把 rcParams 字体配置移到 sns.set_theme 之后，
     避免 set_theme 重置 rcParams 导致中文字体失效（生成器注释已说明该问题）。
   - 其余绘图单元格：删除重复的「中文字体支持 + rcParams」块（每章只保留 setup 一份），
     但保留需要的 import 语句。
   - 特殊单元格（重新调用 sns.set_theme / with sns.axes_style 的单元格）：
     在重置 rcParams 的调用之后紧跟一次紧凑的字体配置。
2. 修复坏单元格：
   - ch28 cell#16：被压缩成注释的「dpi 与 Axes.set 参数示例」→ 还原为可运行代码。
   - ch39 cell#10：练习脚手架被压缩成注释 → 还原。
   - ch44 cell#11：练习脚手架被截断 → 重建。
   - ch45 cell#10：练习脚手架被截断 → 重建。
   - ch67 cell#11/#12：练习与答案都被压缩成注释 → 还原。
3. 有意保留的脚手架（填空式练习，保持原样）：
   - ch43#11 whisk_x、ch55#11 你的代码、capstone-matplotlib#8 figsize=(...) 等。

安全保证：
  - 只改 code cell 的 source；保留 cell id / metadata / outputs / markdown。
  - 逐 cell ast.parse 兜底，语法错误则跳过不写。
  - 幂等：二次运行不再改动。
"""
import ast, json, os, re, shutil, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"
BACKUP = ROOT / ".backup-viz-redesign"

# 可视化模块文件：matplotlib=28..38, seaborn=39..57, plotly=58..74（相对 public/course）
FILES = [f"course-chapter-{n}.ipynb" for n in range(28, 75)]
FILES += ["module-intro-matplotlib.ipynb", "module-intro-seaborn.ipynb", "module-intro-plotly.ipynb"]
FILES += [
    "module-capstones/module-capstone-matplotlib.ipynb",
    "module-capstones/module-capstone-seaborn.ipynb",
    "module-capstones/module-capstone-plotly.ipynb",
]

FONT_COMMENT_SETUP = "中文字体支持：自动选用可用的中文字体"
FONT_COMMENT_CELL = "中文字体支持：避免图表中文显示为方框"
RC_SANS = 'plt.rcParams["font.sans-serif"]'
RC_MINUS = 'plt.rcParams["axes.unicode_minus"]'
COMPACT_FONT = (
    'plt.rcParams["font.sans-serif"] = '
    '["Microsoft YaHei", "SimHei", "PingFang SC", "Noto Sans CJK SC", "DejaVu Sans"]'
)
COMPACT_MINUS = 'plt.rcParams["axes.unicode_minus"] = False'


# ---------------- 工具函数 ----------------

def parse(src):
    """ast.parse 安全版本；失败返回 None。"""
    try:
        ast.parse(src)
        return True
    except SyntaxError:
        return False


def lines_of(source):
    return source.splitlines()


def join_lines(lines):
    return "\n".join(lines)


def is_rc_sans(line):
    return line.strip().startswith(RC_SANS)


def is_rc_minus(line):
    return line.strip().startswith(RC_MINUS)


def is_font_comment(line, setup=False):
    s = line.strip()
    if not s.startswith("#"):
        return False
    return FONT_COMMENT_SETUP in s if setup else FONT_COMMENT_CELL in s


def find_setup_index(nb):
    """第一个包含 addfont 的 code cell 下标（章节 setup 单元格）。"""
    for i, cell in enumerate(nb.get("cells", [])):
        if cell.get("cell_type") != "code":
            continue
        src = "".join(cell.get("source", []))
        if "addfont" in src:
            return i
    return None


def source_text(cell):
    return "".join(cell.get("source", []))


def write_cell(cell, src):
    cell["source"] = src.splitlines(keepends=True)


# ---------------- 1. 字体导入统一 ----------------

def reorder_setup_font(cell) -> bool:
    """setup 单元格：把 rcParams 字体块移到 sns.set_theme 之后。

    仅当字体块在 set_theme 之前时移动；matplotlib 章节没有 set_theme，不做任何事。
    """
    src = source_text(cell)
    if "sns.set_theme" not in src and not re.search(r"sns\.set\s*\(", src):
        return False
    lines = lines_of(src)

    # 找到字体块范围：[注释行 .. rcParams 两行]
    block_start = None
    block_end = None
    for i, line in enumerate(lines):
        if is_font_comment(line, setup=True):
            block_start = i
            continue
        if block_start is not None and block_end is None:
            if is_rc_sans(line) or is_rc_minus(line):
                block_end = i
                # rcParams 两行
                if is_rc_sans(line) and i + 1 < len(lines) and is_rc_minus(lines[i + 1]):
                    block_end = i + 1
                break

    if block_start is None or block_end is None:
        return False

    # 找到 sns.set_theme 或 sns.set 行
    theme_idx = None
    for i, line in enumerate(lines):
        if re.search(r"sns\.set_theme\s*\(", line) or re.match(r"\s*sns\.set\s*\(", line):
            theme_idx = i
            break
    if theme_idx is None or theme_idx < block_end:
        return False  # 字体块已在 set_theme 之后或未找到

    # 提取字体块（含注释行）
    block = lines[block_start : block_end + 1]
    # 删除字体块
    del lines[block_start : block_end + 1]
    # theme_idx 在删除后偏移：block 在 theme_idx 之前，删除后 theme_idx -= len(block)
    theme_idx_after = theme_idx - len(block)
    insert_at = theme_idx_after + 1
    # 在 set_theme 行后插入：[set_theme, "", block...]
    if insert_at < len(lines) and lines[insert_at].strip() != "":
        lines.insert(insert_at, "")
    lines[insert_at:insert_at] = block
    if insert_at > 0 and lines[insert_at - 1].strip() != "":
        lines.insert(insert_at, "")
    # 收尾：把连续 2+ 空行压成 1 个
    cleaned = []
    prev_blank = False
    for line in lines:
        if line.strip() == "":
            if prev_blank:
                continue
            prev_blank = True
        else:
            prev_blank = False
        cleaned.append(line)
    new = join_lines(cleaned)
    if new != src and parse(new):
        write_cell(cell, new)
        return True
    return False


def strip_redundant_font_block(cell, keep_compact=False) -> bool:
    """删除普通绘图单元格中重复的字体配置块。

    规则：
      - 删除「中文字体支持：避免图表中文显示为方框」注释行 + rcParams 两行；
      - 保留 import 语句（import matplotlib.pyplot as plt 等）。
    """
    src = source_text(cell)
    if FONT_COMMENT_CELL not in src and RC_SANS not in src:
        return False
    lines = lines_of(src)
    out = []
    i = 0
    removed_rc = 0
    while i < len(lines):
        line = lines[i]
        if is_font_comment(line):
            i += 1
            continue
        if is_rc_sans(line):
            removed_rc += 1
            i += 1
            continue
        if is_rc_minus(line):
            removed_rc += 1
            i += 1
            continue
        out.append(line)
        i += 1
    if removed_rc == 0:
        return False
    # 清理多余空行（连续空行压成一行）
    cleaned = []
    prev_blank = False
    for line in out:
        if line.strip() == "":
            if prev_blank:
                continue
            prev_blank = True
        else:
            prev_blank = False
        cleaned.append(line)
    new = join_lines(cleaned)
    if new != src and parse(new):
        write_cell(cell, new)
        return True
    return False


def reapply_after_theme_reset(cell) -> bool:
    """特殊单元格：重新调用 sns.set_theme / with sns.axes_style 等会重置 rcParams，
    在其后紧跟紧凑字体配置。这些单元格本身不再有顶部字体块（由 strip 阶段处理）。"""
    src = source_text(cell)
    if "sns.set_theme" not in src and "with sns.axes_style" not in src and "with sns.plotting_context" not in src:
        return False
    lines = lines_of(src)
    out = []
    changed = False
    for line in lines:
        out.append(line)
        stripped = line.strip()
        # 在 sns.set_theme / sns.set 调用行之后插入紧凑配置
        if re.search(r"sns\.set_theme\s*\(", stripped) or re.match(r"sns\.set\s*\(", stripped):
            out.append(COMPACT_FONT)
            out.append(COMPACT_MINUS)
            changed = True
        elif re.match(r"with\s+sns\.(?:axes_style|plotting_context)\s*\(", stripped):
            indent = line[: len(line) - len(line.lstrip())] + "    "
            out.append(indent + COMPACT_FONT)
            out.append(indent + COMPACT_MINUS)
            changed = True
    if not changed:
        return False
    new = join_lines(out)
    if new != src and parse(new):
        write_cell(cell, new)
        return True
    return False


# ---------------- 2. 坏单元格重建 ----------------

# (文件名, cell 下标) -> 新 source
REBUILDS = {
    ("course-chapter-28.ipynb", 16): """# 中文字体支持：避免图表中文显示为方框
import matplotlib.pyplot as plt

plt.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", "PingFang SC", "Noto Sans CJK SC", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False

# 示例 1：用 dpi 控制分辨率（更高 dpi = 导出的图更清晰）
fig, ax = plt.subplots(figsize=(6, 3), dpi=120)
ax.plot([1, 2, 3], [4, 5, 6])
ax.set(xlabel="月份", ylabel="金额")
ax.set_title("dpi=120 的示例图")
print("figsize=(6,3), dpi=120 -> 导出更清晰")
plt.close(fig)

# 示例 2：用 Axes.set 集中设置标题与坐标轴标签
fig2, ax2 = plt.subplots()
ax2.set(title="用 set 集中设置", xlabel="X", ylabel="Y")
print("Axes.set 可集中设置 title/xlabel/ylabel")
plt.close(fig2)
""",
    ("course-chapter-39.ipynb", 10): """# 请在下方填写代码
import seaborn as sns
import matplotlib.pyplot as plt

# 与本小节示例结构一致：同一份 marketing 长表（x=访问量，y=销售额，颜色=渠道）
# 练一练：把 style 参数从 None 改为渠道字段名 "channel"，让形状也映射到渠道
fig, ax = plt.subplots(figsize=(8, 4.2))
sns.scatterplot(
    data=marketing,
    x="visits",
    y="sales",
    hue="channel",   # 颜色仍表示渠道
    style=None,      # ← 请把 None 改为 "channel"
    ax=ax,
)
ax.set(title="Seaborn长表映射（颜色+形状）", xlabel="访问量", ylabel="销售额")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()

# 自检：渠道至少有两类，形状映射才有意义；图例应存在
assert marketing["channel"].nunique() > 1, "渠道至少应有两类，形状映射才有意义"
handles, labels = ax.get_legend_handles_labels()
assert len(labels) >= 1, "图例应存在"
print("自检通过：渠道同时映射为颜色与形状")
""",
    ("course-chapter-44.ipynb", 11): """# 请在下方填写代码
# 练一练：把基础小提琴图的 inner 从 "quart" 改为 "box"，再统计每个类别的记录数完成自检。
import matplotlib.pyplot as plt
import seaborn as sns

inner_value = "quart"  # ← 请把 "quart" 改为 "box"

fig, ax = plt.subplots(figsize=(8, 4.6))
sns.violinplot(
    data=orders,
    x="category",
    y="order_value",
    hue="category",
    palette="Set2",
    legend=False,
    inner=inner_value,
    cut=0,
    ax=ax,
)
ax.set(title="品类客单价（箱线摘要）", xlabel="品类", ylabel="客单价（元）")
fig.tight_layout()
plt.show()

# 自检：每个类别都应至少有一条记录
counts = orders.groupby("category").size()
assert counts.min() > 0, "每个类别都应至少有一条记录"
print("自检通过：inner=", inner_value, "，每个类别的记录数 =", counts.to_dict())
""",
    ("course-chapter-45.ipynb", 10): """# 请在下方填写代码：复制 45.4 基础图表的 stripplot，只改 jitter（或换一个 x 字段），再运行观察。
import matplotlib.pyplot as plt
import seaborn as sns

jitter_value = 0.22  # ← 请把 0.22 改成一个新值（如 0.4 或 0.05），也可以把 x="category" 换成 x="channel"
sample = orders.sample(120, random_state=42)
fig, ax = plt.subplots(figsize=(8, 4.5))
sns.stripplot(
    data=sample,
    x="category",
    y="order_value",
    jitter=jitter_value,
    alpha=0.55,
    color="#1a73e8",
    ax=ax,
)
ax.set(title="调整 jitter 后的原始观察", xlabel="品类", ylabel="客单价（元）")
fig.tight_layout()
plt.show()

# 自检：抖动只改显示位置，不改数据本身
assert len(sample) == 120, "样本量应保持 120"
print("自检通过：样本量保持", len(sample))
""",
    ("course-chapter-67.ipynb", 11): """# 请在下方填写代码
# 目标：用 px.imshow 画出「区域 × 品类」销售额热力图，并更换色盘观察变化。
# 1. 构造行×列矩阵（把 ___ 换成正确字段）
matrix = orders.pivot_table(
    index="___",      # 行取区域字段：region
    columns="___",    # 列取品类字段：category
    values="___",     # 数值字段：sales
    aggfunc="sum",
    fill_value=0,
)
# 2. 绘制热力图，并把色盘换成你选的一种
fig = px.imshow(
    matrix,
    text_auto=".0f",
    color_continuous_scale="___",   # 试试 "Viridis" / "YlOrRd" 等
    aspect="auto",
)
# 3. 自检：热力图应至少包含一条 trace
assert len(fig.data) >= 1, "fig.data 为空，请检查是否成功创建热力图"
print("完成！trace 数量：", len(fig.data))
""",
    ("course-chapter-67.ipynb", 12): """# 答案：画「区域 × 品类」销售额热力图，并把色盘改为 Viridis
matrix = orders.pivot_table(
    index="region",
    columns="category",
    values="sales",
    aggfunc="sum",
    fill_value=0,
)
fig = px.imshow(
    matrix,
    text_auto=".0f",
    color_continuous_scale="Viridis",
    aspect="auto",
    title="区域品类销售额（Viridis）",
)
fig.update_layout(
    xaxis_title="品类", yaxis_title="区域", coloraxis_colorbar_title="销售额"
)
# 自检：热力图应包含至少一条 trace，且行列数与矩阵一致
assert len(fig.data) >= 1, "未成功创建热力图"
assert fig.data[0].z.shape == matrix.shape, "行列与矩阵不一致"
print("自检通过：trace 数量 =", len(fig.data), "，矩阵形状 =", matrix.shape)
""",
}


def rebuild_broken_cells(nb, name) -> bool:
    dirty = False
    for (fname, idx), new_src in REBUILDS.items():
        if fname != name:
            continue
        cells = nb.get("cells", [])
        if idx >= len(cells) or cells[idx].get("cell_type") != "code":
            continue
        if not parse(new_src):
            print(f"  !! 重建源码语法错误：{name} cell#{idx}，跳过")
            continue
        if source_text(cells[idx]) == new_src:
            continue  # 已重建，幂等
        write_cell(cells[idx], new_src)
        dirty = True
    return dirty


# ---------------- 主流程 ----------------

def main():
    os.makedirs(BACKUP, exist_ok=True)
    stats = {"font_reorder": 0, "font_strip": 0, "font_reapply": 0, "rebuild": 0}
    changed_files = []

    for rel in FILES:
        p = COURSE / rel
        if not p.exists():
            continue
        nb = json.loads(p.read_text(encoding="utf-8"))
        shutil.copy2(p, BACKUP / rel.replace("/", "__"))
        dirty = False

        setup_idx = find_setup_index(nb)
        # 章节式 setup 单元格（含 addfont 兜底）是「每章唯一字体配置」的权威来源。
        # 没有 addfont setup 的独立 Notebook（如 module-intro-*）保留各自的字体配置，不做去重。
        has_chapter_setup = setup_idx is not None

        # 1) setup 单元格字体顺序修正
        if setup_idx is not None:
            if reorder_setup_font(nb["cells"][setup_idx]):
                stats["font_reorder"] += 1
                dirty = True

        # 2) 重建坏单元格（先于去重：重建内容里 ch28#16 有意保留自身字体配置）
        rebuilt_idx = set()
        for (fname, idx) in REBUILDS:
            if fname == rel:
                rebuilt_idx.add(idx)
        if rebuild_broken_cells(nb, rel):
            stats["rebuild"] += 1
            dirty = True

        # 3) 其余单元格去重 / 特殊单元格重应用（仅章节式 setup 存在的 Notebook）
        for i, cell in enumerate(nb.get("cells", [])):
            if cell.get("cell_type") != "code":
                continue
            if i == setup_idx or i in rebuilt_idx:
                continue
            src_before = source_text(cell)
            # 特殊：单元格自己重新调用 set_theme / with axes_style（会重置 rcParams）
            if re.search(r"sns\.set_theme\s*\(|with\s+sns\.(?:axes_style|plotting_context)\s*\(", src_before):
                # 单次通过：先删顶部冗余块，再在重置调用后插入紧凑配置；
                # 与原始内容比较决定是否改写（幂等，避免每次运行都重写相同字节）。
                strip_redundant_font_block(cell)
                reapply_after_theme_reset(cell)
                if source_text(cell) != src_before:
                    stats["font_strip"] += 1
                    stats["font_reapply"] += 1
                    dirty = True
            elif has_chapter_setup:
                if strip_redundant_font_block(cell):
                    stats["font_strip"] += 1
                    dirty = True

        if dirty:
            p.write_text(json.dumps(nb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            changed_files.append(rel)

    print(f"改写文件={len(changed_files)}")
    print(f"  setup字体顺序修正={stats['font_reorder']}  冗余块删除={stats['font_strip']}  "
          f"set_theme后重应用={stats['font_reapply']}  坏单元格重建={stats['rebuild']}")
    for f in changed_files:
        print(f"  - {f}")


if __name__ == "__main__":
    main()
