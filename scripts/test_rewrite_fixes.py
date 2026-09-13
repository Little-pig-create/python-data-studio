"""Tests for the course-rewrite helper logic.

Focus: `demo_rename_map` must protect a whole illustration run, not one cell at
a time. Regressing to per-cell protection is what left the what-if cells of
ch79-105 reading a demo `X` while predicting with the chapter's own `model`.

Run with:
    python -m unittest scripts/test_rewrite_fixes.py -v
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent / "rewrite_python_basics"))

from rewrite_python_basics.transform_rest import (  # noqa: E402
    demo_rename_map,
    rename_demo_variables,
)

EXPERIMENT = {"experiment"}
ERROR_RECOVERY = {"error-recovery"}
PLAIN: set[str] = set()


def code(source: str, tags: set[str]) -> tuple[str, dict, str, set[str]]:
    return ("other", {}, source, tags)


def markdown(source: str) -> tuple[str, dict, str, set[str]]:
    return ("md", {}, source, PLAIN)


class RenameDemoVariablesTests(unittest.TestCase):
    def test_renames_definition_and_reads(self) -> None:
        source = "X = build()\nprint(X.shape)\n"
        out = rename_demo_variables(source, {"X"})
        self.assertEqual(out, "_demo_X = build()\nprint(_demo_X.shape)\n")

    def test_leaves_attributes_and_keyword_arguments(self) -> None:
        source = "frame = load()\nmodel.fit(data=frame)\nprint(frame.data)\n"
        out = rename_demo_variables(source, {"frame"})
        self.assertIn("_demo_frame = load()", out)
        self.assertIn("data=_demo_frame", out)
        self.assertIn("_demo_frame.data", out)


class DemoRenameMapTests(unittest.TestCase):
    def test_demo_and_following_what_if_cell_share_one_rename(self) -> None:
        items = [
            code('X = demo_data()\nmodel = LinearRegression().fit(X, y)\n', EXPERIMENT),
            markdown("### 第一个结果怎么读"),
            code("X_changed = X.copy()\nmodel.predict(X_changed)\n", EXPERIMENT),
        ]
        renames = demo_rename_map(items, {"X", "model"})
        self.assertEqual(renames[0], {"X", "model"})
        self.assertEqual(renames[2], {"X", "model"})

    def test_plain_code_cell_ends_the_group(self) -> None:
        items = [
            code("X = demo_data()\n", EXPERIMENT),
            code("X = chapter_data()\n", PLAIN),
            code("X = other_demo()\n", EXPERIMENT),
        ]
        renames = demo_rename_map(items, {"X"})
        self.assertEqual(renames[0], {"X"})
        self.assertNotIn(1, renames)
        self.assertEqual(renames[2], {"X"})

    def test_self_contained_demo_is_left_alone(self) -> None:
        items = [
            code("reg_X = demo_data()\nreg_model = fit(reg_X)\n", EXPERIMENT),
            markdown("heading"),
            code("reg_X_changed = reg_X.copy()\nreg_model.predict(reg_X_changed)\n", EXPERIMENT),
        ]
        self.assertEqual(demo_rename_map(items, {"X", "model"}), {})

    def test_error_recovery_joins_the_same_group(self) -> None:
        items = [
            code("sales = demo()\n", ERROR_RECOVERY),
            markdown("heading"),
            code("print(sales)\n", EXPERIMENT),
        ]
        renames = demo_rename_map(items, {"sales"})
        self.assertEqual(renames[0], {"sales"})
        self.assertEqual(renames[2], {"sales"})


if __name__ == "__main__":
    unittest.main()
