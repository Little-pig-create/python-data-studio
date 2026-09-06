# -*- coding: utf-8 -*-
"""完善 notebook 内部代码：导入归位（E402 修复，安全、跨全课程）。

把被塞进「中文字体支持」注释块里的
        import os
        from matplotlib import font_manager as fm
    移到顶部导入区：import os（标准库）置最前并空一行，font_manager 紧跟
    import matplotlib.pyplot。不改变任何运行语义。

安全保证：逐 cell ast.parse 兜底；只改 code cell source；幂等。
"""
import ast, json, os, re, shutil, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"
BACKUP = ROOT / ".backup-code-tidy"


def reorder_imports(source: str) -> str:
    lines = source.split("\n")
    os_idx = next((i for i, l in enumerate(lines) if l.strip() == "import os"), None)
    fm_idx = next((i for i, l in enumerate(lines) if l.strip() == "from matplotlib import font_manager as fm"), None)
    if os_idx is None or fm_idx is None:
        return source
    # 仅当二者相邻（字体块内）才归位；且 import os 尚未在顶部
    if abs(os_idx - fm_idx) != 1 or os_idx == 0:
        return source
    # 删除两行（先高索引）
    del lines[max(os_idx, fm_idx)]
    del lines[min(os_idx, fm_idx)]
    plt_idx = next((i for i, l in enumerate(lines) if re.match(r"^import matplotlib\.pyplot", l.strip())), None)
    if plt_idx is not None:
        lines.insert(plt_idx + 1, "from matplotlib import font_manager as fm")
    else:
        lines.insert(0, "from matplotlib import font_manager as fm")
    lines.insert(0, "import os")
    lines.insert(1, "")  # 标准库与第三方之间空一行
    return "\n".join(lines)


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
            if not source.strip():
                continue
            try:
                new = reorder_imports(source)
                if new != source:
                    ast.parse(new)
                    cell["source"] = new.splitlines(keepends=True)
                    dirty = True
                    changed_cells += 1
            except Exception:
                continue
        if dirty:
            shutil.copy2(p, BACKUP / p.name)
            p.write_text(json.dumps(nb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            changed_files += 1
    print(f"改写文件={changed_files}  改写 cell={changed_cells}")


if __name__ == "__main__":
    main()
