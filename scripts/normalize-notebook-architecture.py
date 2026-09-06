"""统一课程 Notebook 的内部结构、稳定 cell ID 和内容指纹。

用途：
    python scripts/normalize-notebook-architecture.py
    python scripts/normalize-notebook-architecture.py --check
    python scripts/normalize-notebook-architecture.py --sync-runtime
"""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import shutil
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
ARCHITECTURE_VERSION = 2
CELL_ID_SCHEME = "content-sha256-v1"


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, notebook: dict) -> None:
    path.write_text(json.dumps(notebook, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def source_text(cell: dict) -> str:
    source = cell.get("source", "")
    return "".join(source) if isinstance(source, list) else str(source or "")


def source_lines(source: str) -> list[str]:
    if not source:
        return []
    return [line + "\n" for line in source.splitlines()]


def logical_path(path: Path) -> str:
    path = path.resolve()
    mappings = [
        (ROOT / "notebooks" / "course", "course"),
        (ROOT / "notebooks" / "extras", "extras"),
        (ROOT / "public" / "runtime" / "files" / "course", "course"),
        (ROOT / "public" / "runtime" / "files" / "extras", "extras"),
        (ROOT / "public" / "course", "app"),
    ]
    for base, prefix in mappings:
        base = base.resolve()
        try:
            return f"{prefix}/{path.relative_to(base).as_posix()}"
        except ValueError:
            continue
    return path.relative_to(ROOT.resolve()).as_posix()


def notebook_files(scope: str) -> list[Path]:
    roots: list[Path] = []
    if scope in {"all", "source"}:
        roots.extend([ROOT / "notebooks" / "course", ROOT / "notebooks" / "extras"])
    if scope in {"all", "runtime"}:
        roots.extend([ROOT / "public" / "runtime" / "files" / "course", ROOT / "public" / "runtime" / "files" / "extras"])
    if scope in {"all", "app"}:
        roots.append(ROOT / "public" / "course")

    files: list[Path] = []
    for root in roots:
        if root.exists():
            files.extend(root.rglob("*.ipynb"))
    return sorted(set(files))


def add_tag(tags: list[str], tag: str) -> list[str]:
    if tag not in tags:
        tags.append(tag)
    return tags


def infer_tags(cell: dict, previous_heading: str) -> list[str]:
    tags = [str(tag) for tag in cell.get("metadata", {}).get("tags", []) if str(tag)]
    if cell.get("cell_type") != "code":
        return tags

    source = source_text(cell)
    heading = previous_heading.lower()
    if "solution" not in tags and "答案" not in heading and "参考答案" not in heading:
        if "TODO" in source or "练习" in heading or "exercise" in heading:
            add_tag(tags, "exercise")
    if "自检" in source or "assert " in source:
        add_tag(tags, "check")
    if "答案" in heading or "solution" in heading:
        add_tag(tags, "solution")
    return tags


def normalize_notebook(path: Path) -> tuple[dict, bool]:
    notebook = read_json(path)
    cells = notebook.get("cells", [])
    logical = logical_path(path)
    occurrences: dict[str, int] = {}
    normalized_cells: list[dict] = []
    previous_heading = ""

    for cell in cells:
        cell = dict(cell)
        cell_type = cell.get("cell_type") or cell.get("type") or "code"
        source = source_text(cell)
        metadata = dict(cell.get("metadata") or {})
        tags = infer_tags({**cell, "cell_type": cell_type}, previous_heading)
        if tags:
            metadata["tags"] = tags
        elif "tags" in metadata:
            metadata.pop("tags", None)

        cell_key = hashlib.sha256(
            json.dumps(
                {
                    "cell_type": cell_type,
                    "source": source,
                    "tags": tags,
                },
                ensure_ascii=False,
                sort_keys=True,
            ).encode("utf-8")
        ).hexdigest()
        occurrence = occurrences.get(cell_key, 0)
        occurrences[cell_key] = occurrence + 1
        stable_id = "cell-" + hashlib.sha256(
            f"{logical}\0{cell_key}\0{occurrence}".encode("utf-8")
        ).hexdigest()[:20]

        cell["id"] = stable_id
        cell["cell_type"] = cell_type
        cell["metadata"] = metadata
        cell["source"] = source_lines(source)
        if cell_type == "code":
            cell.setdefault("execution_count", None)
            cell.setdefault("outputs", [])
        else:
            cell.pop("execution_count", None)
            cell.pop("outputs", None)

        normalized_cells.append(cell)
        if cell_type == "markdown":
            first_lines = source.strip().splitlines()
            if first_lines and first_lines[0].startswith("#"):
                previous_heading = first_lines[0]

    notebook["cells"] = normalized_cells
    metadata = dict(notebook.get("metadata") or {})
    metadata["notebook_architecture_version"] = ARCHITECTURE_VERSION
    metadata["cell_id_scheme"] = CELL_ID_SCHEME

    fingerprint_payload = [
        {
            "cell_type": cell["cell_type"],
            "source": source_text(cell),
            "tags": cell.get("metadata", {}).get("tags", []),
        }
        for cell in normalized_cells
    ]
    metadata["content_fingerprint"] = hashlib.sha256(
        json.dumps(fingerprint_payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()[:24]
    notebook["metadata"] = metadata

    before = path.read_text(encoding="utf-8")
    after = json.dumps(notebook, ensure_ascii=False, indent=2) + "\n"
    return notebook, before != after


def sync_runtime_copies() -> int:
    pairs = [
        (ROOT / "notebooks" / "course", ROOT / "public" / "runtime" / "files" / "course"),
        (ROOT / "notebooks" / "extras", ROOT / "public" / "runtime" / "files" / "extras"),
    ]
    copied = 0
    for source_root, runtime_root in pairs:
        for source_path in sorted(source_root.rglob("*.ipynb")):
            target = runtime_root / source_path.relative_to(source_root)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source_path, target)
            copied += 1
    return copied


def validate(paths: Iterable[Path], check_parity: bool = True) -> list[str]:
    errors: list[str] = []
    fingerprints: dict[str, str] = {}

    for path in paths:
        try:
            notebook = read_json(path)
        except Exception as exc:
            errors.append(f"{path}: JSON 无法解析：{exc}")
            continue

        ids: set[str] = set()
        cell_payload = []
        for index, cell in enumerate(notebook.get("cells", [])):
            cell_id = cell.get("id")
            if not isinstance(cell_id, str) or not cell_id:
                errors.append(f"{path}: 第 {index + 1} 个单元格缺少稳定 id")
            elif cell_id in ids:
                errors.append(f"{path}: 第 {index + 1} 个单元格 id 重复：{cell_id}")
            else:
                ids.add(cell_id)

            cell_type = cell.get("cell_type")
            source = source_text(cell)
            tags = cell.get("metadata", {}).get("tags", [])
            cell_payload.append({"cell_type": cell_type, "source": source, "tags": tags})
            if cell_type == "code":
                try:
                    ast.parse(source)
                except SyntaxError as exc:
                    errors.append(f"{path}: 第 {index + 1} 个代码单元格语法错误：{exc}")

        metadata = notebook.get("metadata", {})
        fingerprint = metadata.get("content_fingerprint")
        if not fingerprint:
            errors.append(f"{path}: 缺少 content_fingerprint")
        else:
            expected = hashlib.sha256(
                json.dumps(cell_payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
            ).hexdigest()[:24]
            if fingerprint != expected:
                errors.append(f"{path}: content_fingerprint 不匹配")
        fingerprints[logical_path(path)] = json.dumps(cell_payload, ensure_ascii=False, sort_keys=True)

    if check_parity:
        source_root = ROOT / "notebooks"
        runtime_root = ROOT / "public" / "runtime" / "files"
        for source_path in [*source_root.joinpath("course").rglob("*.ipynb"), *source_root.joinpath("extras").rglob("*.ipynb")]:
            relative = source_path.relative_to(source_root).as_posix()
            runtime_path = runtime_root / Path(relative)
            if not runtime_path.exists():
                errors.append(f"运行时副本缺失：{runtime_path}")
                continue
            source_nb = read_json(source_path)
            runtime_nb = read_json(runtime_path)
            source_cells = [
                {"cell_type": c.get("cell_type"), "source": source_text(c), "tags": c.get("metadata", {}).get("tags", [])}
                for c in source_nb.get("cells", [])
            ]
            runtime_cells = [
                {"cell_type": c.get("cell_type"), "source": source_text(c), "tags": c.get("metadata", {}).get("tags", [])}
                for c in runtime_nb.get("cells", [])
            ]
            if source_cells != runtime_cells:
                errors.append(f"源文件与运行时副本内容不一致：{relative}")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scope", choices=["all", "source", "runtime", "app"], default="all")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--sync-runtime", action="store_true")
    args = parser.parse_args()

    if args.sync_runtime and args.scope in {"all", "runtime"}:
        copied = sync_runtime_copies()
        print(f"runtime copies synced: {copied}")

    paths = notebook_files(args.scope)
    if args.check:
        errors = validate(paths, check_parity=args.scope in {"all", "source", "runtime"})
        if errors:
            for error in errors:
                print(f"ERROR: {error}")
            return 1
        print(f"notebook architecture check passed: {len(paths)} files")
        return 0

    changed = 0
    for path in paths:
        notebook, did_change = normalize_notebook(path)
        if did_change:
            write_json(path, notebook)
        changed += int(did_change)
    print(f"normalized: {len(paths)} files, changed: {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
