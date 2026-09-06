"""Check or update targeted teaching sections without rebuilding course code."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
TAG = "module-teaching-design"
POLICY_MARKER = "<!-- module-teaching-assessment -->"


def source_text(cell: dict) -> str:
    source = cell.get("source", "")
    return "".join(source) if isinstance(source, list) else source


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_resource(root: Path, url: str) -> Path:
    if not isinstance(url, str) or not url.startswith("/course/"):
        raise ValueError(f"invalid course resource path: {url}")
    path = (root / "public" / url.lstrip("/")).resolve()
    if not path.is_relative_to((root / "public" / "course").resolve()) or path.suffix != ".ipynb":
        raise ValueError(f"resource outside course directory: {url}")
    return path


def validate_catalog(root: Path, catalog: dict) -> dict:
    chapters = catalog.get("chapters", [])
    modules = [item["id"] for item in catalog.get("modules", [])]
    if not chapters or not modules or len(set(modules)) != len(modules):
        raise ValueError("catalog must contain chapters and unique modules")
    for field in ("id", "path", "sortOrder"):
        values = [item[field] for item in chapters]
        if len(set(values)) != len(values):
            raise ValueError(f"duplicate catalog {field}")
    if chapters != sorted(chapters, key=lambda item: item["sortOrder"]):
        raise ValueError("catalog is not in learning order")
    numbered = [item["chapter"] for item in chapters if item["kind"] != "capstone"]
    if numbered != list(range(1, len(numbered) + 1)):
        raise ValueError("display chapter numbers must be continuous and unique")

    notebooks = {}
    for item in chapters:
        if item["module"] not in modules:
            raise ValueError(f"unknown module: {item['id']}")
        path = resolve_resource(root, item["path"])
        notebook = read_json(path)
        cells = notebook.get("cells", [])
        ids = [cell.get("id") for cell in cells]
        if not cells or not all(ids) or len(set(ids)) != len(ids):
            raise ValueError(f"missing or duplicate cell IDs: {item['path']}")
        heading = next((source_text(cell).splitlines()[0] for cell in cells
                        if cell["cell_type"] == "markdown" and source_text(cell).startswith("# ")), "")
        if item["title"] not in heading:
            raise ValueError(f"catalog title differs from notebook: {item['path']}")
        if any(output.get("output_type") == "error"
               for cell in cells for output in cell.get("outputs", [])):
            raise ValueError(f"saved error output: {item['path']}")
        if item["kind"] == "capstone":
            tasks = [i for i, cell in enumerate(cells)
                     if "capstone-stage" in cell.get("metadata", {}).get("tags", [])]
            answers = [i for i, cell in enumerate(cells)
                       if "teacher-answer" in cell.get("metadata", {}).get("tags", [])]
            if len(tasks) != 3 or len(answers) != 3 or min(answers) <= max(tasks):
                raise ValueError(f"capstone requires three tasks before three answers: {item['id']}")
            if any("solution" not in cells[i]["metadata"]["tags"] for i in answers):
                raise ValueError(f"capstone answer is not collapsed by the UI: {item['id']}")
        notebooks[item["path"]] = notebook
    for module in modules:
        items = [item for item in chapters if item["module"] == module]
        if sum(item["kind"] == "capstone" for item in items) != 1 or items[-1]["kind"] != "capstone":
            raise ValueError(f"module must end in one capstone: {module}")
    return notebooks


def validate_design(catalog: dict, design: dict) -> None:
    specs = design["modules"]
    if set(specs) != {item["id"] for item in catalog["modules"]}:
        raise ValueError("teaching design must cover exactly the catalog modules")
    by_path = {item["path"]: item for item in catalog["chapters"]}
    all_goals = set()
    for module, spec in specs.items():
        capstone = next(item for item in catalog["chapters"]
                        if item["module"] == module and item["kind"] == "capstone")
        if len(spec["outcomes"]) != 3 or len(spec["readiness"]) != 3:
            raise ValueError(f"three outcomes and recovery routes required: {module}")
        for outcome in spec["outcomes"]:
            if not outcome["goal"].strip() or not outcome["evidence"].strip() or outcome["goal"] in all_goals:
                raise ValueError(f"empty or duplicate learning outcome: {module}")
            all_goals.add(outcome["goal"])
        for step in spec["readiness"]:
            item = by_path.get("/course/" + step["resource"])
            if not item or item["module"] != module or item["sortOrder"] >= capstone["sortOrder"]:
                raise ValueError(f"invalid recovery resource: {module}/{step['resource']}")
            if not step["gap"].strip() or not step["task"].strip():
                raise ValueError(f"empty recovery task: {module}")
        if not spec["gate"].strip() or not spec["transfer"].strip():
            raise ValueError(f"missing assessment or transfer task: {module}")


def markdown_cell(text: str, previous: dict | None = None) -> dict:
    cell = copy.deepcopy(previous) if previous else {"cell_type": "markdown", "metadata": {}}
    cell["source"] = (text.strip() + "\n").splitlines(keepends=True)
    tags = cell.setdefault("metadata", {}).setdefault("tags", [])
    if TAG not in tags:
        tags.append(TAG)
    return cell


def section_index(cells: list[dict], heading: str) -> int:
    matches = [i for i, cell in enumerate(cells)
               if cell["cell_type"] == "markdown" and source_text(cell).splitlines()[:1] == [heading]]
    if len(matches) != 1:
        raise ValueError(f"expected one section, found {len(matches)}: {heading}")
    return matches[0]


def assessment_policy(spec: dict) -> str:
    return f"""{POLICY_MARKER}
### 达标与返工规则

- 总分至少 60/100，共同能力至少 18/30，模块核心能力至少 42/70，且下列关键门槛全部满足，才视为达标。
- **本模块关键门槛：** {spec['gate']}
- 每项按证据给分：独立完成且处理边界为该项满分；主流程正确但证据不全为约 75%；最小流程可复现为约 60%；未完成或关键方法错误为 0–50%。教师须记录扣分依据。
- 学生作品须在不运行参考答案的情况下，重启内核并从头复现；参考答案中产生的变量、文件和输出不能作为自己的完成证据。
- 运行进度、摘要填写和勾选状态仅是学习记录，不是自动评分。关键门槛未满足时先返工再评，不用其他高分抵消。
- **可选迁移：** {spec['transfer']} 迁移不另设加分，不挤占必做任务；可作为相应维度的边界或解释证据。
"""


def enrich_capstone(notebook: dict, item: dict, spec: dict, by_path: dict) -> dict:
    result = copy.deepcopy(notebook)
    cells = result["cells"]
    objectives = section_index(cells, "## 本章目标")
    rows = "\n".join(f"| {row['goal']} | {row['evidence']} |" for row in spec["outcomes"])
    cells[objectives] = markdown_cell(
        "## 本章目标\n\n| 完成后能够 | 对应完成证据 |\n|---|---|\n" + rows,
        cells[objectives],
    )
    routes = []
    for step in spec["readiness"]:
        target = by_path["/course/" + step["resource"]]
        # Catalog IDs, not filename numbers, define the app's chapter routes.
        routes.append(f"| {step['gap']} | [{target['label']}](/course/{target['id']}) | {step['task']} |")
    readiness = markdown_cell(
        "## 学习准备与补学路径\n\n先独立尝试下面的小任务。遇到困难时回看对应章节，再返回当前里程碑；它们不另设章节作业，也不单独计分。\n\n"
        "| 遇到的问题 | 回看章节 | 再做一次 |\n|---|---|---|\n" + "\n".join(routes)
    )
    existing = [i for i, cell in enumerate(cells)
                if source_text(cell).startswith("## 学习准备与补学路径\n")]
    if existing:
        if len(existing) != 1 or TAG not in cells[existing[0]].get("metadata", {}).get("tags", []):
            raise ValueError(f"unmanaged or duplicate readiness section: {item['id']}")
        cells[existing[0]] = markdown_cell(source_text(readiness), cells[existing[0]])
    else:
        cells.insert(objectives + 1, readiness)

    rubric_index = section_index(cells, "## 评分标准（100 分）")
    rubric = source_text(cells[rubric_index]).split(POLICY_MARKER)[0].rstrip()
    # Preserve the existing seven criteria; reject a changed scoring contract.
    core_start = rubric.index("### 本模块核心能力：70 分")
    common = sum(map(int, re.findall(r"\*\*[^\n]*?（(\d+) 分）\*\*", rubric[:core_start])))
    core = sum(map(int, re.findall(r"\*\*[^\n]*?（(\d+) 分）\*\*", rubric[core_start:])))
    if common != 30 or core != 70:
        raise ValueError(f"rubric weights must be 30 + 70: {item['id']}")
    cells[rubric_index] = markdown_cell(rubric + "\n\n" + assessment_policy(spec), cells[rubric_index])

    logical = "app/" + item["path"].removeprefix("/course/")
    for cell in cells:
        if TAG not in cell.get("metadata", {}).get("tags", []):
            continue
        payload = {"cell_type": cell["cell_type"], "source": source_text(cell), "tags": cell["metadata"]["tags"]}
        key = hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()
        cell["id"] = "cell-" + hashlib.sha256(f"{logical}\0{key}\0{0}".encode("utf-8")).hexdigest()[:20]
    payload = [{"cell_type": cell["cell_type"], "source": source_text(cell),
                "tags": cell.get("metadata", {}).get("tags", [])} for cell in cells]
    result["metadata"]["content_fingerprint"] = hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()[:24]
    return result


def teaching_guide(catalog: dict, specs: dict) -> str:
    lines = ["# 内部教学资源实施指南", "",
             "本文件由 `scripts/maintain-teaching-resources.py --write` 生成。模块设计维护于 `scripts/course-teaching-design.json`；显示章号、标题和资源位置取自当前 catalog，不从文件名猜章号。", "",
             "## 1. 使用边界", "",
             "保留普通章节、六个模块导学和八个独立大作业，不新增计分章节作业。导学中的新 API 任务属于学后形成性练习，不应当作学生入学前必须掌握的能力。模块大作业中的补学任务只用于定位困难。", "",
             "## 2. 当前资源与排课", "",
             f"目录包含 {len(catalog['chapters'])} 个资源。下表章号是应用展示号，不是 Notebook 文件名中的编号。", "",
             "| 模块 | 展示章号 | 普通/项目章 | 独立导学 | 大作业 | 建议大作业时间 |",
             "|---|---|---:|---:|---|---:|"]
    for module in catalog["modules"]:
        items = [item for item in catalog["chapters"] if item["module"] == module["id"]]
        capstone = next(item for item in items if item["kind"] == "capstone")
        numbers = [item["chapter"] for item in items if item["kind"] != "capstone"]
        lessons = sum(item["kind"] in {"lesson", "project"} for item in items)
        intros = sum(item["kind"] == "intro" for item in items)
        link = "../public" + capstone["path"]
        lines.append(f"| {module['label']} | {min(numbers)}–{max(numbers)} | {lessons} | {intros} | [{capstone['title']}]({link}) | {capstone['estimatedMinutes']} 分钟 |")
    lines.extend(["", "## 3. 三条选学路径", "",
                  "- **零基础完整路径**：Python → NumPy → Pandas → Matplotlib → Seaborn → Plotly → 综合项目 → 机器学习；每模块用大作业检验迁移。",
                  "- **业务分析路径**：Python、NumPy 的数据结构基础 → Pandas → Matplotlib → Seaborn 或 Plotly → 综合项目。统计分布比较优先 Seaborn，交互交付优先 Plotly；未选模块不计为已完成。",
                  "- **已有分析基础的建模路径**：先用 Python、NumPy、Pandas 的补学任务核对基础，再进入机器学习导学、切分与 Pipeline，最后选择一项业务项目完成模型评审。不能因会调用模型 API 而跳过泄漏和基线检查。", "",
                  "## 4. 一次课堂如何组织", "",
                  "以 45 分钟教学片段为例：5 分钟用小输入暴露误解，10 分钟演示最小方法，15 分钟独立修改与核对，10 分钟解释输出和反例，5 分钟记录下一步。复杂章节可分多个片段；这不是对 catalog 学习时长的替换。", "",
                  "- **课前**：教师在目标运行环境核对数据、依赖和输出目录；真实个人数据先脱敏，不上传到公共课程资源。",
                  "- **课堂**：先预测输出，再运行最小示例；学生至少改变一个输入或条件，用一句话解释为什么变化。",
                  "- **里程碑反馈**：指出具体证据位置、最重要的误解、对应补学章节和一次重试任务。只改影响当前目标的问题。",
                  "- **课后复现**：只运行学生实现，不借用隐藏答案产生的变量或文件；记录缺失数据与环境差异，不能以截图代替可复现作品。", "",
                  "## 5. 八个模块的目标与补学", ""])
    by_path = {item["path"]: item for item in catalog["chapters"]}
    for module in catalog["modules"]:
        spec = specs[module["id"]]
        lines.extend([f"### {module['label']}", "", "| 能力目标 | 完成证据 |", "|---|---|"])
        lines.extend(f"| {row['goal']} | {row['evidence']} |" for row in spec["outcomes"])
        lines.extend(["", "| 困难信号 | 补学资源 | 重试任务 |", "|---|---|---|"])
        for step in spec["readiness"]:
            target = by_path["/course/" + step["resource"]]
            lines.append(f"| {step['gap']} | [{target['label']}](../public{target['path']}) | {step['task']} |")
        lines.extend(["", f"**关键门槛：** {spec['gate']}", "", f"**可选迁移：** {spec['transfer']}", ""])
    lines.extend(["## 6. 验收与维护", "",
                  "评分按 [模块大作业评分量规](CAPSTONE_RUBRICS.md) 与 Notebook 中相同的 30+70 权重执行；总分、分组下限与关键门槛同时满足才达标。进度和摘要完整性不代表能力已经通过评阅。", "",
                  "```powershell", "npm run build:teaching", "npm run check:teaching", "npm run test:teaching",
                  "python scripts/normalize-notebook-architecture.py --check --scope app", "```", "",
                  "维护脚本只替换大作业目标、补学表和评分规则附注，保留任务、代码、答案、输出以及无关元数据。默认只读检查；先验证全部输入，再执行写入。目录变更后重新生成文档与补学链接。", "",
                  "静态检查覆盖目录与文件、显示顺序、模块末大作业、补学链接、分步答案标签和设计漂移；它不执行学生代码，也不证明离线运行、图形可读性或统计结论正确。正式发布另按 [发布手册](RELEASE_RUNBOOK.md) 在浏览器与桌面运行环境冷启动验收。", ""])
    return "\n".join(lines)


def rubric_guide(catalog: dict, notebooks: dict) -> str:
    lines = ["# 模块大作业评分量规", "",
             "本文件由教学资源维护脚本从当前八份大作业的评分单元生成，不再维护一套独立权重。修改权重应先修改对应 Notebook，并审阅全部大作业的共同规则。", "",
             "## 1. 评分与反馈流程", "",
             "1. 先检查学生实现能否独立复现，以及模块关键门槛是否满足。隐藏答案只用于教师比较思路，不计作学生证据。",
             "2. 按共同能力 30 分和模块能力 70 分逐项给分，记录证据位置与扣分理由。",
             "3. 达标须同时满足总分至少 60、共同能力至少 18、核心能力至少 42，以及关键门槛全部通过。90–100 为优秀，75–89 为良好，60–74 为合格；未满足任一门槛均需返工。",
             "4. 反馈写明：一项已有证据、一项最重要的问题、对应补学章节、可观察的重试结果。修订后重新核对受影响维度，不用完成进度替代评分。", "",
             "## 2. 教师记录模板", "",
             "| 学生/版本 | 维度及满分 | 得分 | 证据位置 | 扣分与重试要求 | 复核结果 |",
             "|---|---|---|---|---|---|",
             "| 记录作品版本 | 使用下方对应维度 | 记录实际评分 | Cell 标题或交付文件 | 一项明确问题及补学任务 | 待复核/通过/返工 |", "",
             "## 3. 各模块现行量规", ""]
    for item in catalog["chapters"]:
        if item["kind"] != "capstone":
            continue
        notebook = notebooks[item["path"]]
        rubric = source_text(notebook["cells"][section_index(notebook["cells"], "## 评分标准（100 分）")])
        lines.extend([f"### {item['title']}", "", f"来源：[课程 Notebook](../public{item['path']})", ""])
        for line in rubric.splitlines()[1:]:
            if line == POLICY_MARKER:
                continue
            lines.append(f"**{line[4:]}**" if line.startswith("### ") else line)
        lines.append("")
    return "\n".join(lines)


def planned_updates(root: Path) -> tuple[dict[Path, str], dict]:
    catalog = read_json(root / "public/course/catalog.json")
    design = read_json(root / "scripts/course-teaching-design.json")
    notebooks = validate_catalog(root, catalog)
    validate_design(catalog, design)
    by_path = {item["path"]: item for item in catalog["chapters"]}
    desired = {}
    for item in catalog["chapters"]:
        if item["kind"] != "capstone":
            continue
        notebook = enrich_capstone(notebooks[item["path"]], item, design["modules"][item["module"]], by_path)
        notebooks[item["path"]] = notebook
        desired[resolve_resource(root, item["path"])] = json.dumps(notebook, ensure_ascii=False, indent=2) + "\n"
    desired[root / "docs/MODULE_TEACHING_RESOURCES.md"] = teaching_guide(catalog, design["modules"])
    desired[root / "docs/CAPSTONE_RUBRICS.md"] = rubric_guide(catalog, notebooks)
    changed = {path: text for path, text in desired.items()
               if not path.exists() or path.read_text(encoding="utf-8") != text}
    return changed, catalog


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="read-only check (default)")
    mode.add_argument("--write", action="store_true", help="update owned teaching sections and guides")
    args = parser.parse_args()
    try:
        changed, catalog = planned_updates(ROOT)
    except (ValueError, KeyError, TypeError, OSError) as error:
        print(f"ERROR: {error}")
        return 1
    for path, text in changed.items():
        if args.write:
            path.write_text(text, encoding="utf-8")
        print(f"{'updated' if args.write else 'stale'}: {path.relative_to(ROOT)}")
    print(f"catalog checked: {len(catalog['chapters'])} resources, {len(catalog['modules'])} modules; "
          f"{'updated' if args.write else 'stale'} files: {len(changed)}")
    return int(bool(changed) and not args.write)


if __name__ == "__main__":
    raise SystemExit(main())
