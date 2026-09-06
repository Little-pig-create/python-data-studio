# -*- coding: utf-8 -*-
"""模块级补强（C）：补齐 numpy 模块「核心概念」讲解。

现状：numpy 各章核心概念应统一为「背景引入(+口诀) + 要点」。
  - ch15/16/17/18 已有背景引入；ch14（数组基础）核心概念仍为 3 条光秃要点，
    与同模块不一致。本脚本只对 ch14 的核心概念细胞补充与同模块一致的
    「背景引入 + 口诀」，并把其余各章核心概念统一补一条「口诀」句，保证整模块
    的「概念类比 + 口诀」讲解风格一致。

幂等：目标文本已存在则跳过，不会重复注入。
只修改目标 markdown 细胞的 source，保留 cell id / metadata / 其余内容。
写回后交由 normalize-notebook-architecture.py 统一稳定 id 与 content_fingerprint。
"""
import json, os, sys, shutil, re

sys.stdout.reconfigure(encoding="utf-8")

ROOT = r"D:\Research\Python数据工作台_2026-07-22"
COURSE = os.path.join(ROOT, "public", "course")
BACKUP = os.path.join(ROOT, ".backup-numpy-coreedit")

# (file_no, 新增/替换的核心概念文本)
# ch14：把「无背景引入」的 3 条要点替换为「背景引入+口诀+要点」。
CH14_NEW = (
    "## 17.1 核心概念\n\n"
    "**背景引入**：数组是整批数据的“统一容器”，先记住三个属性就够用——"
    "**shape**（形状）回答“排成几行几列”，**ndim**（维数）回答“有几个维度”，"
    "**dtype**（类型）回答“里面放的是哪种数”。一维像一列数，二维像一张表，"
    "读到逗号就多一个维度——记住这条口诀，数组的“形状”就不会再绕晕你。\n\n"
    "- NumPy数组通常存储同一类型的数据。\n"
    "- shape描述各维长度，ndim描述维数。\n"
    "- 固定数值类型能提高运算效率并减少隐式转换。\n"
)

# 其余 numpy 章的核心概念追加一条「口诀」句（与 ch15/示例口诀风格一致）。
# key: 文件号, value: 追加到要点之后的「口诀」句
CH_POINTER = {
    16: "**口诀**：reshape 只重排不丢数，T 换行列视角，ravel 摊平回一列。\n",
    17: "**口诀**：末尾对齐才广播，有个维度是 1 就能扩；能算不等于算对，先确认轴和单位。\n",
    18: "**口诀**：看整体水平用均值，看波动用标准差，怕极端值被带偏就补个中位数和分位。\n",
}


def src(c):
    s = c.get("source", [])
    return "".join(s) if isinstance(s, list) else s


def find_core(cells):
    for i, c in enumerate(cells):
        if c.get("cell_type") == "markdown" and re.search(r"^##\s+\d+\.\d*\s*核心概念", src(c), re.M):
            return i, c
    return None, None


def enrich(path, new_text, pointer=None):
    with open(path, "r", encoding="utf-8") as fh:
        nb = json.load(fh)
    idx, cell = find_core(nb["cells"])
    if cell is None:
        print(f"[MISS] {os.path.basename(path)}: 未找到核心概念细胞")
        return "MISS"
    cur = src(cell)
    if new_text is not None:
        if "背景引入" in cur or "统一容器" in cur:
            print(f"[SKIP] {os.path.basename(path)}: 核心概念已含背景引入")
            return "SKIP"
        cell["source"] = new_text.splitlines(keepends=True)
    elif pointer:
        if pointer.strip() in cur:
            print(f"[SKIP] {os.path.basename(path)}: 口诀已存在")
            return "SKIP"
        text = cur.rstrip("\n") + "\n\n" + pointer
        cell["source"] = text.splitlines(keepends=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(nb, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    print(f"[OK] {os.path.basename(path)}: 已补核心概念讲解")
    return "OK"


def main():
    os.makedirs(BACKUP, exist_ok=True)
    # ch14 替换为带背景引入+口诀的版本
    p = os.path.join(COURSE, "course-chapter-14.ipynb")
    shutil.copy2(p, os.path.join(BACKUP, "course-chapter-14.ipynb"))
    enrich(p, CH14_NEW)

    # ch16/17/18 核心概念补一条口诀
    for n in (16, 17, 18):
        p = os.path.join(COURSE, f"course-chapter-{n}.ipynb")
        shutil.copy2(p, os.path.join(BACKUP, f"course-chapter-{n}.ipynb"))
        enrich(p, None, CH_POINTER[n])


if __name__ == "__main__":
    main()
