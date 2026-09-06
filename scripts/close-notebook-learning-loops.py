"""Close the teaching loop in published course notebooks.

The published notebooks are generated from several historical sources.  This
pass deliberately avoids replacing their subject examples.  It adds the
teaching contract around them: observable goals, a student attempt before a
reference implementation, and a diagnostic reflection instead of opaque
assertion failures.
"""

from __future__ import annotations

import ast
import hashlib
import io
import json
import re
import tokenize
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
COURSE_ROOT = ROOT / "public" / "course"
VERSION = "2026-08-06-learning-loop-v4"


def text_of(cell: dict) -> str:
    source = cell.get("source", "")
    return "".join(source) if isinstance(source, list) else str(source or "")


def source_lines(text: str) -> list[str]:
    return [line + "\n" for line in text.strip("\n").splitlines()]


def cell_id(path: Path, label: str) -> str:
    digest = hashlib.sha1(f"{path.as_posix()}::{label}".encode("utf-8")).hexdigest()[:16]
    return f"learning-loop-{digest}"


def markdown(path: Path, label: str, value: str) -> dict:
    return {
        "id": cell_id(path, label),
        "cell_type": "markdown",
        "metadata": {},
        "source": source_lines(value),
    }


def code(path: Path, label: str, value: str, tags: list[str]) -> dict:
    return {
        "id": cell_id(path, label),
        "cell_type": "code",
        "execution_count": None,
        "metadata": {"tags": tags},
        "outputs": [],
        "source": source_lines(value),
    }


def title_of(notebook: dict) -> str:
    for cell in notebook.get("cells", []):
        if cell.get("cell_type") != "markdown":
            continue
        for line in text_of(cell).splitlines():
            if line.startswith("# "):
                return line[2:].strip()
    return "本章"


def module_of(notebook: dict) -> str:
    metadata = notebook.get("metadata", {})
    course = metadata.get("course", {}) if isinstance(metadata.get("course"), dict) else {}
    module = metadata.get("chapter_module") or metadata.get("module") or course.get("module") or ""
    return str(module).lower()


def kind_of(notebook: dict, path: Path) -> str:
    metadata = notebook.get("metadata", {})
    if metadata.get("chapter_kind") == "capstone" or "module-capstones" in path.parts:
        return "capstone"
    module = module_of(notebook)
    if "machine" in module:
        return "ml"
    if "numpy" in module:
        return "numpy"
    if "pandas" in module:
        return "pandas"
    if "matplotlib" in module:
        return "matplotlib"
    if "seaborn" in module:
        return "seaborn"
    if "plotly" in module:
        return "plotly"
    if "project" in module:
        return "project"
    return "python"


OBJECTIVES = {
    "python": [
        "能说清本章输入、处理中间变量和输出各自代表什么。",
        "能在不改变题意的前提下修改一个输入，并解释输出变化。",
        "能识别一个常见边界条件，并给出可读的处理方式。",
    ],
    "numpy": [
        "能先用 shape 和 ndim 描述数组，再进行索引、运算或聚合。",
        "能解释向量化、axis 或广播改变的是哪一个维度。",
        "能用一个小数组验证自己的判断，而不是只记住语法。",
    ],
    "pandas": [
        "能说明一行数据代表什么，并在处理前后核对行数和字段。",
        "能选择合适的清洗、筛选或分组操作，并解释结果粒度。",
        "能把一个表格结果写成有证据的业务结论。",
    ],
    "matplotlib": [
        "能为图表补齐标题、坐标轴和单位，使问题与数据关系清楚。",
        "能只修改一项视觉编码，并说明它改善了什么阅读任务。",
        "能用图形中的证据描述趋势或差异，而不是只描述颜色和形状。",
    ],
    "seaborn": [
        "能说明一行观察、分组字段和统计量各自代表什么。",
        "能选择与问题匹配的统计图，并解释类别或分布差异。",
        "能检查排序、样本量和不确定性是否影响结论。",
    ],
    "plotly": [
        "能先完成一个默认可读的图，再添加服务于问题的交互。",
        "能用标题、单位和 hover 明细解释图表编码。",
        "能判断一个交互控件是否真正帮助比较，而不是增加干扰。",
    ],
    "ml": [
        "能明确预测时点、目标变量、可用特征和评价指标。",
        "能在相同数据切分下比较基线与模型，而不是只报告单个分数。",
        "能指出数据泄漏、误差或适用范围中的至少一项限制。",
    ],
    "project": [
        "能把问题、数据来源、处理规则、证据和建议连成可复现的分析链。",
        "能保留关键中间结果，并说明它如何支持最终结论。",
        "能写清结果限制和下一步，而不是把相关关系写成因果。",
    ],
    "capstone": [
        "能把项目拆成数据质量、核心分析、结果表达和交付复现四个阶段。",
        "能为每个阶段留下可核对的中间结果和一句解释。",
        "能交付可从头运行的 Notebook，并写清限制与下一步。",
    ],
}

EXPECTED_OBSERVATIONS = {
    "python": "运行示例后，应看到带标签的输入、中间结果和最终输出。修改一个输入后，先预测哪一项会变化，再比较实际结果。",
    "numpy": "运行示例后，应同时观察数值和 shape。若筛选、聚合或广播后的形状与预测不同，先回看操作作用的维度。",
    "pandas": "运行示例后，应看到表格行数、字段或汇总结果。处理前后至少核对一次“一行代表什么”和记录数量。",
    "matplotlib": "运行示例后，应看到带标题、坐标轴和单位的图表。先确认图形回答的问题，再判断趋势、比较或异常是否有图中证据。",
    "seaborn": "运行示例后，应看到类别、分布或关系的统计图。解读前先确认每个点或条形代表的观察单位和统计量。",
    "plotly": "运行示例后，应先检查默认视图是否可读，再悬停查看明细。交互应补充比较信息，而不能替代标题、单位或坐标轴。",
    "ml": "运行示例后，应同时保留基线、模型指标和同一数据切分。只有指标、预测时点和特征都可解释时，结果才可以用于结论。",
    "project": "运行示例后，应至少得到数据质量盘点、核心表或图，以及对应的限制说明。每个结论都要能回到数据和处理规则。",
    "capstone": "从头运行后，应在四个阶段分别留下质量检查、核心处理结果、证据表或图，以及可复现交付说明。",
}


def has_heading(notebook: dict, heading: str) -> bool:
    return any(
        cell.get("cell_type") == "markdown" and text_of(cell).lstrip().startswith(heading)
        for cell in notebook.get("cells", [])
    )


def has_tag(notebook: dict, tag: str) -> bool:
    return any(tag in (cell.get("metadata", {}).get("tags") or []) for cell in notebook.get("cells", []))


def insert_after_title(notebook: dict, cells: list[dict]) -> None:
    for index, cell in enumerate(notebook.get("cells", [])):
        if cell.get("cell_type") == "markdown" and text_of(cell).lstrip().startswith("# "):
            notebook["cells"][index + 1:index + 1] = cells
            return
    notebook.setdefault("cells", [])[0:0] = cells


def practice_insert_index(notebook: dict) -> int:
    preferred = ("## 教学实验", "## 综合练习", "## 本章小结", "## 项目验收")
    for index, cell in enumerate(notebook.get("cells", [])):
        if cell.get("cell_type") != "markdown":
            continue
        source = text_of(cell).lstrip()
        if source.startswith(preferred):
            return index
    return len(notebook.get("cells", []))


def rewrite_asserts(notebook: dict) -> bool:
    """Turn assertion-only checks into messages students can act on."""
    changed = False
    for cell in notebook.get("cells", []):
        if cell.get("cell_type") != "code" or "assert" not in text_of(cell):
            continue
        lines = text_of(cell).splitlines()
        replacement: list[str] = []
        counter = 0
        for line in lines:
            match = re.match(r"^(\s*)(assert\s+.+)$", line)
            if not match:
                replacement.append(line)
                continue
            try:
                parsed = ast.parse(match.group(2)).body[0]
            except SyntaxError:
                replacement.append(line)
                continue
            if not isinstance(parsed, ast.Assert):
                replacement.append(line)
                continue
            counter += 1
            indent = match.group(1)
            assertion = match.group(2)[len("assert "):]
            trailing = ""
            depth = 0
            try:
                tokens = tokenize.generate_tokens(io.StringIO(assertion).readline)
                for token in tokens:
                    if token.type != tokenize.OP:
                        continue
                    if token.string in "([{":
                        depth += 1
                    elif token.string in ")]}":
                        depth = max(0, depth - 1)
                    elif token.string == ";" and depth == 0:
                        trailing = assertion[token.end[1]:].strip()
                        assertion = assertion[:token.start[1]].strip()
                        break
            except tokenize.TokenError:
                pass
            expression = assertion
            message = repr("请回看输入、处理步骤和预期结果。")
            depth = 0
            try:
                tokens = tokenize.generate_tokens(io.StringIO(assertion).readline)
                for token in tokens:
                    if token.type != tokenize.OP:
                        continue
                    if token.string in "([{":
                        depth += 1
                    elif token.string in ")]}":
                        depth = max(0, depth - 1)
                    elif token.string == "," and depth == 0:
                        expression = assertion[:token.start[1]].strip()
                        message = assertion[token.end[1]:].strip() or message
                        break
            except tokenize.TokenError:
                pass
            name = f"_check_{counter}"
            label = f"自检 {counter}：{expression} ->"
            replacement.extend(
                [
                    f"{indent}{name} = bool({expression})",
                    f"{indent}print({label!r}, \"通过\" if {name} else \"需要检查\")",
                    f"{indent}if not {name}:",
                    f"{indent}    print(\"建议：\", {message})",
                ]
            )
            if trailing:
                replacement.append(f"{indent}{trailing}")
        if replacement != lines:
            cell["source"] = source_lines("\n".join(replacement))
            changed = True
    return changed


def repair_compound_assert_migration(notebook: dict) -> bool:
    """Repair the only v1 cell already split by the old migration logic."""
    changed = False
    for cell in notebook.get("cells", []):
        source = text_of(cell)
        if "df['hour_sin']" not in source or "bool(not set(features) & set(forbidden)" not in source:
            continue
        fixed = """df['hour_sin'] = np.sin(2 * np.pi * df.hr / 24)
df['hour_cos'] = np.cos(2 * np.pi * df.hr / 24)
df['month_sin'] = np.sin(2 * np.pi * df.mnth / 12)
df['month_cos'] = np.cos(2 * np.pi * df.mnth / 12)
features = [
    'season', 'yr', 'mnth', 'hr', 'holiday', 'weekday', 'workingday',
    'weathersit', 'temp', 'atemp', 'hum', 'windspeed', 'hour_sin',
    'hour_cos', 'month_sin', 'month_cos',
]
_check_1 = not set(features) & set(forbidden)
print('自检：特征不包含泄漏字段 ->', '通过' if _check_1 else '需要检查')
if not _check_1:
    print('建议：从 features 中移除 target、casual、registered 等预测时点后不可获得字段。')
print('特征数量:', len(features))
display(df[['hr', 'hour_sin', 'hour_cos', 'mnth', 'month_sin', 'month_cos']].head())"""
        if source != fixed + "\n":
            cell["source"] = source_lines(fixed)
            changed = True
    return changed


def repair_diagnostic_checks(notebook: dict) -> bool:
    """Repair v1 generated checks so the migration is safe to re-run."""
    changed = False
    for cell in notebook.get("cells", []):
        if cell.get("cell_type") != "code":
            continue
        lines = text_of(cell).splitlines()
        repaired: list[str] = []
        for line in lines:
            fixed = line.replace(
                "print(\"建议：\", 请回看输入、处理步骤和预期结果。)",
                "print(\"建议：\", \"请回看输入、处理步骤和预期结果。\")",
            )
            match = re.match(r'^(\s*)print\("自检 (\d+)：(.*) ->", (.*)$', fixed)
            if match:
                label = f"自检 {match.group(2)}：{match.group(3)} ->"
                fixed = f"{match.group(1)}print({label!r}, {match.group(4)}"
            repaired.append(fixed)
        if repaired != lines:
            cell["source"] = source_lines("\n".join(repaired))
            changed = True
    return changed


def exercise_scaffold(path: Path, kind: str) -> list[dict]:
    task = {
        "python": "把示例中的一项输入改成自己的情境，并补充一个边界条件。",
        "numpy": "先预测 shape，再修改一个数组或筛选条件，解释结果变化。",
        "pandas": "替换一个字段或分组口径，并核对处理前后的行数与粒度。",
        "matplotlib": "复制最接近的示例，只修改一种视觉编码，并说明阅读任务如何变化。",
        "seaborn": "修改一个分组、排序或统计设置，并比较修改前后的结论。",
        "plotly": "在默认图可读的前提下，增加一个 hover 字段或筛选交互。",
        "ml": "在不改变数据切分和指标的前提下，比较基线与一个模型设置。",
        "project": "基于本章数据替换一个字段、口径或筛选条件，并记录结论是否改变。",
        "capstone": "完成当前阶段的最小可运行版本，再补充一项可核对的证据。",
    }[kind]
    return [
        markdown(
            path,
            "independent-practice-intro",
            f"## 独立迁移练习\n\n{task}\n\n先在下面单元格完成自己的版本；需要参考时再回看紧邻的示例或参考实现。",
        ),
        code(
            path,
            "independent-practice",
            "# TODO: 在此粘贴或改写最接近的示例。\n"
            "# 记录：我改了什么？预期会发生什么？实际观察到什么？\n"
            "change_note = \"待填写\"\n"
            "expected_change = \"待填写\"\n"
            "observed_change = \"运行后填写\"\n"
            "print({\"修改\": change_note, \"预期\": expected_change, \"观察\": observed_change})",
            ["exercise"],
        ),
    ]


def reflection_check(path: Path, kind: str) -> list[dict]:
    focus = {
        "python": ["输入类型或取值范围", "中间变量含义", "边界条件"],
        "numpy": ["输入与输出 shape", "axis / 广播方向", "结果是否符合预测"],
        "pandas": ["一行代表什么", "处理前后行数", "汇总结果粒度"],
        "matplotlib": ["标题与单位", "图形编码是否匹配问题", "结论是否有图中证据"],
        "seaborn": ["观察单位与分组", "统计量含义", "样本量或排序影响"],
        "plotly": ["默认视图是否可读", "交互是否服务问题", "标题、单位与 hover 一致"],
        "ml": ["预测时点与特征", "基线与同一评价指标", "泄漏或误差限制"],
        "project": ["数据来源与处理规则", "核心证据", "限制与下一步"],
        "capstone": ["阶段中间结果", "交付物可复现性", "限制与下一步"],
    }[kind]
    rows = ",\n    ".join(f'"{item}": "待确认"' for item in focus)
    return [
        markdown(path, "reflection-check-intro", "## 诊断式自检\n\n不要只看代码是否报错。运行后逐项填写或口头说明下列检查项；任何一项不清楚，都应回到对应的输入、处理中间结果或图表。"),
        code(
            path,
            "reflection-check",
            f"review = {{\n    {rows}\n}}\n"
            "for item, status in review.items():\n"
            "    print(f\"{'待补充' if status == '待确认' else '已确认'}：{item} -> {status}\")\n"
            "print(\"完成后，用一句话写出结果支持的结论和仍存在的限制。\")",
            ["check"],
        ),
    ]


def capstone_workspace(path: Path) -> list[dict]:
    stages = [
        ("A：输入与质量", "读取数据，输出形状、字段、缺失与异常记录。"),
        ("B：核心处理", "完成清洗、特征、统计或基线，并保留中间结果。"),
        ("C：结果与证据", "生成一张表或图，并写一句仅由数据支持的结论。"),
        ("D：交付与限制", "整理交付物，说明可复现步骤、限制和下一步。"),
    ]
    cells = [markdown(path, "capstone-workspace-intro", "## 项目工作区\n\n以下四个单元格是可编辑的最小项目骨架。不要把整份项目塞进一个单元格；每完成一阶段，都留下一个结果和一句解释。")]
    for index, (name, instruction) in enumerate(stages, start=1):
        cells.append(markdown(path, f"capstone-stage-{index}-intro", f"### 阶段 {name}\n\n{instruction}"))
        cells.append(code(path, f"capstone-stage-{index}", f"# TODO: {instruction}\n# 写完后打印一个可核对的结果，并补充一句解释。", ["exercise"]))
    return cells


def enrich_notebook(path: Path) -> bool:
    notebook = json.loads(path.read_text(encoding="utf-8"))
    metadata = notebook.setdefault("metadata", {})
    previous_version = metadata.get("learning_loop_version")
    if previous_version == VERSION:
        return False

    kind = kind_of(notebook, path)
    changed = rewrite_asserts(notebook)
    changed = repair_diagnostic_checks(notebook) or changed
    changed = repair_compound_assert_migration(notebook) or changed
    cells = notebook.setdefault("cells", [])

    top_cells: list[dict] = []
    if not has_heading(notebook, "## 学习目标"):
        objectives = "\n".join(f"{index}. {item}" for index, item in enumerate(OBJECTIVES[kind], start=1))
        top_cells.append(markdown(path, "learning-objectives", f"## 学习目标\n\n完成“{title_of(notebook)}”后，你应该能够：\n\n{objectives}"))
        changed = True
    if not has_heading(notebook, "## 运行后应观察"):
        top_cells.append(markdown(path, "expected-observations", f"## 运行后应观察\n\n{EXPECTED_OBSERVATIONS[kind]}\n\n如果暂时没有输出，先确认是否按顺序运行了前置单元格；再检查变量名、数据形状或路径，而不是直接跳到参考实现。"))
        changed = True
    if top_cells:
        insert_after_title(notebook, top_cells)

    if kind == "capstone":
        for cell in cells:
            if cell.get("cell_type") == "markdown":
                source = text_of(cell)
                fixed = source.replace("## 4. 进阶完成规则", "## 3. 进阶完成规则")
                if fixed != source:
                    cell["source"] = source_lines(fixed)
                    changed = True
        if not has_heading(notebook, "## 项目工作区"):
            cells[practice_insert_index(notebook):practice_insert_index(notebook)] = capstone_workspace(path)
            changed = True
        if not has_tag(notebook, "check"):
            cells[practice_insert_index(notebook):practice_insert_index(notebook)] = reflection_check(path, kind)
            changed = True
    else:
        if not has_tag(notebook, "exercise"):
            cells[practice_insert_index(notebook):practice_insert_index(notebook)] = exercise_scaffold(path, kind)
            changed = True

        # Visualization notebooks already contain complete chart code under the
        # exercise tag.  Preserve it as a visible reference implementation and
        # place an editable attempt immediately before it.
        if kind in {"matplotlib", "seaborn", "plotly"} and has_tag(notebook, "exercise") and not has_tag(notebook, "solution"):
            for index, cell in enumerate(cells):
                tags = cell.get("metadata", {}).get("tags") or []
                if cell.get("cell_type") == "code" and "exercise" in tags:
                    cells[index:index] = exercise_scaffold(path, kind)
                    cell.setdefault("metadata", {})["tags"] = [tag for tag in tags if tag != "exercise"] + ["solution"]
                    changed = True
                    break

        if not has_tag(notebook, "check"):
            cells[practice_insert_index(notebook):practice_insert_index(notebook)] = reflection_check(path, kind)
            changed = True

    metadata["learning_loop_version"] = VERSION
    if changed or previous_version != VERSION:
        path.write_text(json.dumps(notebook, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return changed or previous_version != VERSION


def main() -> None:
    paths = sorted(COURSE_ROOT.rglob("*.ipynb"))
    changed = sum(enrich_notebook(path) for path in paths)
    print(f"learning loops processed: {len(paths)} notebooks, changed: {changed}")


if __name__ == "__main__":
    main()
