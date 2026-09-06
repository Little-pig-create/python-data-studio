# -*- coding: utf-8 -*-
"""简化 setup cell 中文字体导入：删除冗余字体配置代码。

平台运行时（notebookRuntime.js）会在每个涉及 matplotlib/seaborn 的 cell 执行前
自动注入 _studio_ensure_cjk_font()，负责 addfont + 设置 rcParams，并处理 seaborn
set_theme 重置。因此 notebook 文件里手写的字体代码是冗余的，删除可显著简化导入。

仅处理含 addfont 的 setup cell（matplotlib 28-38 / seaborn 39-57；plotly 无字体配置）。

安全：只改 code cell source；删除前逐 cell 校验结果语法；幂等。
"""
import ast, json, os, re, shutil, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"
BACKUP = ROOT / ".backup-simplify-font"

# 字体块整体（正则，含变体空行）
FONT_BLOCK_RE = re.compile(
    r'^import os\s*\n'
    r'\n'
    r'import matplotlib\.pyplot as plt\s*\n'
    r'from matplotlib import font_manager as fm\s*\n',
    re.M,
)

# 字体配置注释 + if addfont + rcParams 两行（含前后空行）
FONT_CFG_RE = re.compile(
    r'# 中文字体支持：自动选用可用的中文字体，避免图表中文显示为方框\s*\n'
    r'\n?'
    r'if os\.path\.exists\("/tmp/NotoSansSC-Regular\.otf"\):\s*\n'
    r'    fm\.fontManager\.addfont\("/tmp/NotoSansSC-Regular\.otf"\)\s*\n'
    r'\n?'
    r'plt\.rcParams\["font\.sans-serif"\] = \[[^\]]*\]\s*\n'
    r'plt\.rcParams\["axes\.unicode_minus"\] = False\s*\n'
    r'\n?',
    re.M,
)

FONT_NOTE = "# 中文字体支持：由平台运行时自动配置"


def strip_font_block(source: str) -> str:
    """删除字体配置注释 + addfont + rcParams 块，并把 import os / font_manager 行清理。"""
    new = FONT_CFG_RE.sub("", source)
    # 清理 import os 与 font_manager 行（它们在 import 区）
    new = re.sub(r'^import os\s*\n', "", new, flags=re.M)
    new = re.sub(r'^from matplotlib import font_manager as fm\s*\n', "", new, flags=re.M)
    return new


def insert_font_note(source: str) -> str:
    """在 import 区结束（首个紧随 import 的空行处）插入字体说明注释。"""
    if FONT_NOTE in source:
        return source
    lines = source.split("\n")
    # 找到最后一个 import 行之后的位置
    last_import = -1
    for i, line in enumerate(lines):
        if re.match(r'^(import |from )', line.strip()):
            last_import = i
    insert_at = last_import + 1
    while insert_at < len(lines) and lines[insert_at].strip() == "":
        insert_at += 1
    lines.insert(insert_at, "")
    lines.insert(insert_at, FONT_NOTE)
    return "\n".join(lines)


def main():
    os.makedirs(BACKUP, exist_ok=True)
    changed = []
    for n in range(28, 58):
        rel = f"course-chapter-{n}.ipynb"
        p = COURSE / rel
        if not p.exists():
            continue
        nb = json.loads(p.read_text(encoding="utf-8"))
        shutil.copy2(p, BACKUP / rel)
        dirty = False
        for c in nb.get("cells", []):
            if c.get("cell_type") != "code":
                continue
            src = "".join(c.get("source", []))
            if "addfont" not in src:
                continue
            new = strip_font_block(src)
            new = insert_font_note(new)
            # 校验语法
            if new != src:
                try:
                    ast.parse(new)
                except SyntaxError as e:
                    print(f"  !! {rel} 化简后语法错误: {e}，跳过")
                    continue
                c["source"] = new.splitlines(keepends=True)
                dirty = True
            break  # setup cell 只处理第一个
        if dirty:
            p.write_text(json.dumps(nb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            changed.append(rel)
    print(f"改写文件={len(changed)}")
    for f in changed:
        print(f"  - {f}")


if __name__ == "__main__":
    main()
