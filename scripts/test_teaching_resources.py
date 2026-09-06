"""Regression tests for catalog-driven teaching resources (standard library only)."""

import contextlib
import copy
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock


SCRIPT = Path(__file__).with_name("maintain-teaching-resources.py")
SPEC = importlib.util.spec_from_file_location("teaching_resources", SCRIPT)
teaching = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(teaching)


class TeachingResourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = teaching.read_json(teaching.ROOT / "public/course/catalog.json")
        cls.design = teaching.read_json(teaching.ROOT / "scripts/course-teaching-design.json")
        cls.notebooks = teaching.validate_catalog(teaching.ROOT, cls.catalog)
        cls.by_path = {item["path"]: item for item in cls.catalog["chapters"]}
        cls.capstones = [item for item in cls.catalog["chapters"] if item["kind"] == "capstone"]

    def enrich(self, item, notebook=None):
        return teaching.enrich_capstone(
            notebook if notebook is not None else self.notebooks[item["path"]],
            item, self.design["modules"][item["module"]], self.by_path,
        )

    def test_design_covers_current_modules(self):
        teaching.validate_design(self.catalog, self.design)

    def test_preserves_every_code_cell_including_answers_outputs_and_ids(self):
        for item in self.capstones:
            with self.subTest(module=item["module"]):
                before = copy.deepcopy(self.notebooks[item["path"]])
                code = next(cell for cell in before["cells"] if cell["cell_type"] == "code")
                code["execution_count"] = 7
                code["outputs"] = [{"output_type": "stream", "name": "stdout", "text": ["kept\n"]}]
                code["metadata"]["custom_note"] = "keep"
                after = self.enrich(item, before)
                self.assertEqual([c for c in before["cells"] if c["cell_type"] == "code"],
                                 [c for c in after["cells"] if c["cell_type"] == "code"])
                self.assertEqual([c for c in before["cells"] if c["cell_type"] == "markdown"
                                  and not teaching.source_text(c).startswith(("## 本章目标", "## 学习准备与补学路径", "## 评分标准"))],
                                 [c for c in after["cells"] if c["cell_type"] == "markdown"
                                  and not teaching.source_text(c).startswith(("## 本章目标", "## 学习准备与补学路径", "## 评分标准"))])

    def test_update_is_idempotent_for_all_modules(self):
        for item in self.capstones:
            with self.subTest(module=item["module"]):
                once = self.enrich(item)
                self.assertEqual(once, self.enrich(item, once))
                self.assertEqual(len({c["id"] for c in once["cells"]}), len(once["cells"]))

    def test_links_use_catalog_ids_not_filename_numbers(self):
        item = next(item for item in self.capstones if item["module"] == "numpy")
        notebook = self.enrich(item)
        text = "\n".join(teaching.source_text(cell) for cell in notebook["cells"]
                         if teaching.TAG in cell.get("metadata", {}).get("tags", []))
        self.assertIn("(/course/chapter-17)", text)
        self.assertNotIn("(/course/chapter-14)", text)

    def test_rejects_missing_recovery_resource(self):
        design = copy.deepcopy(self.design)
        design["modules"]["python"]["readiness"][0]["resource"] = "does-not-exist.ipynb"
        with self.assertRaisesRegex(ValueError, "invalid recovery"):
            teaching.validate_design(self.catalog, design)

    def test_rejects_cross_module_recovery_and_duplicate_objectives(self):
        design = copy.deepcopy(self.design)
        design["modules"]["python"]["readiness"][0]["resource"] = "course-chapter-18.ipynb"
        with self.assertRaisesRegex(ValueError, "invalid recovery"):
            teaching.validate_design(self.catalog, design)
        design = copy.deepcopy(self.design)
        design["modules"]["numpy"]["outcomes"][0] = design["modules"]["python"]["outcomes"][0]
        with self.assertRaisesRegex(ValueError, "duplicate learning outcome"):
            teaching.validate_design(self.catalog, design)

    def test_rejects_duplicate_catalog_ids_and_missing_files(self):
        catalog = copy.deepcopy(self.catalog)
        catalog["chapters"][1]["id"] = catalog["chapters"][0]["id"]
        with self.assertRaisesRegex(ValueError, "duplicate catalog id"):
            teaching.validate_catalog(teaching.ROOT, catalog)
        catalog = copy.deepcopy(self.catalog)
        catalog["chapters"][0]["path"] = "/course/does-not-exist.ipynb"
        with self.assertRaises(FileNotFoundError):
            teaching.validate_catalog(teaching.ROOT, catalog)

    def test_rejects_external_and_traversing_paths(self):
        for url in ("https://example.com/a.ipynb", "/course/../../a.ipynb", "/course/notebook.py"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                teaching.resolve_resource(teaching.ROOT, url)

    def test_rejects_unexpected_rubric_weights(self):
        item = self.capstones[0]
        notebook = copy.deepcopy(self.notebooks[item["path"]])
        index = teaching.section_index(notebook["cells"], "## 评分标准（100 分）")
        notebook["cells"][index]["source"] = teaching.source_text(notebook["cells"][index]).replace(
            "可复现性（10 分）", "可复现性（20 分）"
        )
        with self.assertRaisesRegex(ValueError, "rubric weights"):
            self.enrich(item, notebook)

    def test_does_not_overwrite_unmanaged_readiness_section(self):
        item = self.capstones[0]
        notebook = self.enrich(item)
        index = teaching.section_index(notebook["cells"], "## 学习准备与补学路径")
        notebook["cells"][index]["metadata"]["tags"].remove(teaching.TAG)
        with self.assertRaisesRegex(ValueError, "unmanaged"):
            self.enrich(item, notebook)

    def test_dry_check_reports_drift_without_writing(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "notebook.ipynb"
            path.write_text("unchanged", encoding="utf-8")
            with mock.patch.object(teaching, "ROOT", root), \
                    mock.patch.object(teaching, "planned_updates", return_value=({path: "updated"}, self.catalog)), \
                    mock.patch("sys.argv", [str(SCRIPT), "--check"]), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(teaching.main(), 1)
            self.assertEqual(path.read_text(encoding="utf-8"), "unchanged")

    def test_write_mode_and_validation_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "notebook.ipynb"
            with mock.patch.object(teaching, "ROOT", root), \
                    mock.patch.object(teaching, "planned_updates", return_value=({path: "updated"}, self.catalog)), \
                    mock.patch("sys.argv", [str(SCRIPT), "--write"]), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(teaching.main(), 0)
            self.assertEqual(path.read_text(encoding="utf-8"), "updated")
            with mock.patch.object(teaching, "planned_updates", side_effect=ValueError("invalid source")), \
                    mock.patch("sys.argv", [str(SCRIPT), "--write"]), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(teaching.main(), 1)
            self.assertEqual(path.read_text(encoding="utf-8"), "updated")

    def test_rubric_document_is_derived_from_notebooks(self):
        notebooks = dict(self.notebooks)
        for item in self.capstones:
            notebooks[item["path"]] = self.enrich(item)
        text = teaching.rubric_guide(self.catalog, notebooks)
        for item in self.capstones:
            self.assertIn(item["title"], text)
            self.assertIn(self.design["modules"][item["module"]]["gate"], text)
        self.assertEqual(text.count("**共同能力：30 分**"), len(self.capstones))


if __name__ == "__main__":
    unittest.main()
