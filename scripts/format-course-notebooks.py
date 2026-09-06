"""Format Python code cells in all course notebooks with autopep8.

Only code-cell source is changed; outputs, execution counts, metadata, and
markdown cells are preserved.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import autopep8
from black import FileMode, format_file_contents
from black.parsing import InvalidInput
from black.report import NothingChanged

ROOT = Path(__file__).resolve().parents[1]
NOTEBOOKS = ROOT / "public" / "course"

# Black 会把超长的中文字体配置列表拆成一行一词（8 行），对初学者反而臃肿。
# 这里把被拆开的 plt.rcParams["font.sans-serif"] = [ ... ] 压回一行。
FONT_LIST_RE = re.compile(
    r'plt\.rcParams\["font\.sans-serif"\]\s*=\s*\[[^\[\]]*\]',
    re.M,
)


def _compact_font_lists(source: str) -> str:
    def repl(m):
        body = m.group(0)
        eq = body.find("=")
        fonts = re.findall(r'"([^"\n]*)"', body[eq + 1 :])
        return 'plt.rcParams["font.sans-serif"] = ["' + '", "'.join(fonts) + '"]'

    return FONT_LIST_RE.sub(repl, source)


def format_source(source: str) -> str:
    formatted = autopep8.fix_code(
        source,
        options={
            "aggressive": 2,
            "max_line_length": 79,
        },
    )
    # Black provides deterministic wrapping for valid cells. Incomplete TODO
    # exercise cells are intentionally retained and handled by autopep8 only.
    try:
        formatted = format_file_contents(
            formatted,
            fast=True,
            mode=FileMode(line_length=79),
        )
    except (InvalidInput, NothingChanged, ValueError):
        pass
    # Black intentionally keeps long string literals intact.  These repeated
    # notebook status messages are shown to beginners, so split them into
    # readable lines instead of suppressing E501 in the course checker.
    formatted = _compact_font_lists(formatted)
    replacements = {
        '''print(
    f"UCI Online Retail 公开数据：{len(large_orders):,} 行 × {large_orders.shape[1]} 列"
)''': '''print("UCI Online Retail 公开数据：")
print(f"  {len(large_orders):,} 行 × {large_orders.shape[1]} 列")''',
        '''print(
    f"Diamonds：{len(diamonds):,} 行；NYC Taxis：{len(taxis):,} 行；Flights：{len(flights):,} 行"
)''': '''print("数据规模：")
print(f"  Diamonds：{len(diamonds):,} 行")
print(f"  NYC Taxis：{len(taxis):,} 行")
print(f"  Flights：{len(flights):,} 行")''',
        '''print(
    f"Diamonds：{len(diamonds):,} 行；Flights：{len(flights):,} 行；Gapminder：{len(gapminder):,} 行"
)''': '''print("数据规模：")
print(f"  Diamonds：{len(diamonds):,} 行")
print(f"  Flights：{len(flights):,} 行")
print(f"  Gapminder：{len(gapminder):,} 行")''',
        '''print(
        f"Top {share:.0%}: 名单{len(top)}, 转化率{top.y.mean():.2%}, lift={lift:.2f}, 覆盖转化{top.y.sum()/ranked.y.sum():.1%}"
    )''': '''print(f"Top {share:.0%}: 名单 {len(top)}")
    print(f"  转化率 {top.y.mean():.2%}，lift={lift:.2f}")
    print(f"  覆盖转化 {top.y.sum() / ranked.y.sum():.1%}")''',
        '''print(
    f"Top 10% 样本={k}, precision={top.y.mean():.3f}, lift={lift:.2f}, recall={top.y.sum()/ranked.y.sum():.3f}"
)''': '''print(f"Top 10% 样本数：{k}")
print(f"precision={top.y.mean():.3f}，lift={lift:.2f}")
print(f"recall={top.y.sum() / ranked.y.sum():.3f}")''',
        '''print(
    f"类型优化前：{before_mb:.1f} MB，优化后：{after_mb:.1f} MB，节省 {(1-after_mb/before_mb):.1%}"
)''': '''print(f"类型优化前：{before_mb:.1f} MB")
print(f"类型优化后：{after_mb:.1f} MB")
print(f"节省：{(1 - after_mb / before_mb):.1%}")''',
    }
    for original, replacement in replacements.items():
        formatted = formatted.replace(original, replacement)
    # Notebook cells should not accumulate trailing blank lines.
    return formatted.rstrip() + "\n" if formatted.strip() else ""


def main() -> int:
    changed = 0
    cells_changed = 0
    for path in sorted(NOTEBOOKS.rglob("*.ipynb")):
        notebook = json.loads(path.read_text(encoding="utf-8"))
        dirty = False
        for cell in notebook.get("cells", []):
            if cell.get("cell_type") != "code":
                continue
            source = "".join(cell.get("source", []))
            formatted = format_source(source)
            if formatted != source:
                cell["source"] = formatted.splitlines(keepends=True)
                dirty = True
                cells_changed += 1
        if dirty:
            path.write_text(json.dumps(notebook, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            changed += 1
    print(f"Formatted {cells_changed} code cells in {changed} course notebooks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
