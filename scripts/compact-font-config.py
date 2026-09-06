# -*- coding: utf-8 -*-
"""把可视化章节 setup 单元格里「中文字体配置」从多行压成紧凑形式。

此前 black 把
    plt.rcParams["font.sans-serif"] = [
        "Microsoft YaHei",
        ...
    ]
    plt.rcParams["axes.unicode_minus"] = False
拆成一行一词（8 行），对初学者反而显得臃肿。本脚本把它压回 2 行：
    plt.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", ...]
    plt.rcParams["axes.unicode_minus"] = False

安全：仅改这一配置块的排版，语义不变；逐 cell ast.parse 兜底；幂等。
"""
import ast, json, os, re, shutil, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"
BACKUP = ROOT / ".backup-font-compact"

# 捕获 plt.rcParams["font.sans-serif"] = [ ... ]
FONT_RE = re.compile(r'plt\.rcParams\["font\.sans-serif"\]\s*=\s*\[(.*?)\]', re.S)
Q = re.compile(r'"([^"]*)"')


def compact_font(source: str) -> str:
    def repl(m):
        body = m.group(1)
        fonts = Q.findall(body)
        if not fonts:
            return m.group(0)
        return 'plt.rcParams["font.sans-serif"] = ["' + '", "'.join(fonts) + '"]'
    return FONT_RE.sub(repl, source)


def main():
    files = sorted(COURSE.rglob("*.ipynb"))
    os.makedirs(BACKUP, exist_ok=True)
    changed_files = changed_cells = 0
    for p in files:
        nb = json.loads(p.read_text(encoding="utf-8"))
        dirty = False
        for cell in nb.get("cells", []):
            if cell.get("cell_type") != "code":
                continue
            source = "".join(cell.get("source", []))
            if "font.sans-serif" not in source:
                continue
            new = compact_font(source)
            if new != source:
                try:
                    ast.parse(new)
                except Exception:
                    continue
                cell["source"] = new.splitlines(keepends=True)
                dirty = True
                changed_cells += 1
        if dirty:
            shutil.copy2(p, BACKUP / p.name)
            p.write_text(json.dumps(nb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            changed_files += 1
    print(f"改写文件={changed_files}  改写 cell={changed_cells}")


if __name__ == "__main__":
    main()
