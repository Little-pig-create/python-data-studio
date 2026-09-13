"""Rewrite course lesson notebooks (python basics + numpy/pandas hand-authored).

Hand-authored chapters use the three-tier structure
(minimal example -> business example -> error counterexample) with
answers separated at the chapter end.

Chapters 28+ are restructured programmatically by transform_rest.py.

Generated notebooks are written to notebooks/course/ (authoring source) and
public/course/ (app copy). The shared pipeline
(`normalize-notebook-architecture.py --sync-runtime`, `sync-catalog.mjs`)
then assigns stable cell ids, fingerprints and runtime copies.

Usage:
    python build.py                # write all hand-authored chapters
    python build.py 1 2 15         # write subset (chapter file numbers)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "notebooks" / "course"
APP_DIR = ROOT / "public" / "course"

REWRITE_VERSION = "2026-09-12-course-rewrite-v1"
BASE_TAGS = ["Python基础", "渐进课程", "个人记账助手", "实训平台"]

# file number -> (display chapter number, title, estimated minutes, style, module)
# style "basic": top-level chapter fields (matches original ch1-13 metadata)
# style "advanced": course.chapter = display number (matches ch14+ siblings)
# module must match the module the chapter belongs to in catalog.json: files
# 14-18 are the numpy lessons and 19-27 the pandas lessons. Hard-coding
# "python" here moved both groups into the python module and left numpy/pandas
# with only an intro and a capstone.
CHAPTERS = {
    "1": (1, "Python 与 Notebook 入门", 45, "basic", "python"),
    "2": (2, "变量、数据类型与运算符", 50, "basic", "python"),
    "3": (3, "字符串：从文本到字段", 50, "basic", "python"),
    "4": (4, "列表：管理多条记录", 50, "basic", "python"),
    "5": (5, "元组：固定字段与解包", 40, "basic", "python"),
    "6": (6, "字典：命名记录与聚合", 50, "basic", "python"),
    "7": (7, "集合：去重与关系", 40, "basic", "python"),
    "8": (8, "条件判断：把规则写清楚", 50, "basic", "python"),
    "9": (9, "循环与迭代：批量处理账目", 55, "basic", "python"),
    "10": (10, "函数基础：参数、返回值与职责", 55, "basic", "python"),
    "11": (11, "函数进阶：内置函数、lambda 与组合", 50, "basic", "python"),
    "12": (12, "文件、路径与 JSON 持久化", 55, "basic", "python"),
    "13": (13, "异常处理、调试与基础测试", 55, "basic", "python"),
    "14": (17, "数组基础（ndarray）", 50, "advanced", "numpy"),
    "15": (18, "索引、切片与筛选", 50, "advanced", "numpy"),
    "16": (19, "形状、合并与拆分", 45, "advanced", "numpy"),
    "17": (20, "向量化与广播", 50, "advanced", "numpy"),
    "18": (21, "统计计算与随机抽样", 50, "advanced", "numpy"),
    "19": (23, "Series与DataFrame", 55, "advanced", "pandas"),
    "20": (24, "选择、筛选与排序", 55, "advanced", "pandas"),
    "21": (25, "行列操作与类型转换", 55, "advanced", "pandas"),
    "22": (26, "数据质量检查与清洗", 55, "advanced", "pandas"),
    "23": (27, "文本、日期与特征处理", 55, "advanced", "pandas"),
    "24": (28, "数据读取与保存", 55, "advanced", "pandas"),
    "25": (29, "分组、聚合与数据透视", 55, "advanced", "pandas"),
    "26": (30, "数据合并与结构转换", 55, "advanced", "pandas"),
    "27": (31, "窗口计算与探索性分析", 55, "advanced", "pandas"),
    "common-modules": (14, "常见 Python 模块", 45, "advanced", "python"),
    "time": (15, "模块、类与项目组织", 50, "advanced", "python"),
}


def chapter_metadata(key: str) -> dict:
    display, title, est_minutes, style, module = CHAPTERS[key]
    file_name = f"course-chapter-{key}.ipynb"
    common = {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3",
        },
        "language_info": {"name": "python", "version": "3.11"},
        "estimated_minutes": est_minutes,
        "rewrite_version": REWRITE_VERSION,
        "course": {
            "chapter": display,
            "title": title,
            "module": module,
            "file_name": file_name,
        },
    }
    if style == "basic":
        common.update(
            {
                "chapter": display,
                "chapter_title": title,
                "chapter_label": f"第{display}章 {title}",
                "chapter_module": module,
                "tags": list(BASE_TAGS),
                "teaching_level": "beginner-progressive",
            }
        )
    return common


def build_cell(kind: str, source: str, tags: list[str]) -> dict:
    lines = [line + "\n" for line in f"{source.strip()}\n".splitlines()]
    cell: dict = {"cell_type": "markdown" if kind == "md" else "code", "metadata": {}, "source": lines}
    if tags:
        cell["metadata"]["tags"] = list(tags)
    if kind == "code":
        cell["execution_count"] = None
        cell["outputs"] = []
    return cell


def build_notebook(key: str, cells_spec: list[tuple]) -> dict:
    cells = [build_cell(kind, source, tags) for kind, source, tags in cells_spec]
    if not any(cell["cell_type"] == "code" for cell in cells):
        raise ValueError(f"第{key}章没有可运行代码")
    first = cells[0]
    if first["cell_type"] != "markdown" or not "".join(first["source"]).startswith("# "):
        raise ValueError(f"第{key}章缺少 H1")
    return {
        "cells": cells,
        "metadata": chapter_metadata(key),
        "nbformat": 4,
        "nbformat_minor": 5,
    }


def load_module(key: str):
    module_name = {"common-modules": "common_modules", "time": "time_module"}.get(key)
    return __import__(module_name or f"ch{int(key):02d}")


def main(argv: list[str]) -> int:
    keys = [a for a in argv[1:]] or sorted(CHAPTERS, key=lambda k: int(k) if k.isdigit() else 999)
    for key in keys:
        if key not in CHAPTERS:
            raise SystemExit(f"未知章节：{key}")
        module = load_module(key)
        cells = [(kind, source, tags) for kind, source, tags in module.CELLS]
        notebook = build_notebook(key, cells)
        payload = json.dumps(notebook, ensure_ascii=False, indent=2) + "\n"
        for target in (SOURCE_DIR, APP_DIR):
            path = target / f"course-chapter-{key}.ipynb"
            path.write_text(payload, encoding="utf-8")
            print(f"wrote {path} ({len(notebook['cells'])} cells)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
