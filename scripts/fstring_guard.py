"""Guard course-notebook f-strings against line-splitting formatters.

`autopep8 --aggressive` (and any formatter that treats braces as break
opportunities) turns::

    print(f"Diamonds {len(diamonds):,} | Taxis {len(taxis):,} 行")

into::

    print(
        f"Diamonds {
            len(diamonds):,    } | Taxis {
                len(taxis):,        } 行"
    )

The damaged form still compiles under PEP 701 (Python 3.12+) but crashes at
runtime with ``ValueError: Invalid format specifier ',    '``. These helpers
detect the damage and rebuild each affected f-string from its AST parts, so
the result is a clean single-line literal again.

Used by ``format-course-notebooks.py`` (post-format repair + safety fallback)
and by the ``--repair-only`` pass that fixes already-damaged cells.
"""

from __future__ import annotations

import ast

_CONVERSIONS = {114: "!r", 115: "!s", 97: "!a"}


def _spec_text(value: ast.FormattedValue) -> str | None:
    """Literal text of a replacement field's format specifier, if any."""
    if value.format_spec is None:
        return None
    return "".join(
        piece.value
        for piece in value.format_spec.values
        if isinstance(piece, ast.Constant)
    )


def _spec_is_damaged(spec: str | None) -> bool:
    """True when a specifier carries whitespace a formatter injected."""
    if not spec:
        return False
    return "\n" in spec or spec != spec.strip() or "  " in spec


def _fixed_spec(spec: str) -> str:
    """Collapse injected line breaks/indentation back out of a specifier."""
    return " ".join(spec.split())


def _rebuilt_fstring(node: ast.JoinedStr) -> str:
    """Unparse ``node`` with every damaged format specifier repaired."""
    values: list[ast.expr] = []
    for value in node.values:
        if isinstance(value, ast.Constant):
            values.append(ast.Constant(value=value.value))
            continue
        if not isinstance(value, ast.FormattedValue):  # pragma: no cover
            raise TypeError(f"unexpected f-string part: {type(value).__name__}")
        spec = _spec_text(value)
        format_spec = None
        if spec is not None:
            repaired = _fixed_spec(spec)
            if repaired:
                format_spec = ast.JoinedStr(
                    values=[ast.Constant(value=repaired)]
                )
        values.append(
            ast.FormattedValue(
                value=value.value,
                conversion=value.conversion,
                format_spec=format_spec,
            )
        )
    # `ast.unparse` handles all escaping/quoting for the rebuilt literal.
    return ast.unparse(ast.JoinedStr(values=values))


def _line_byte_starts(source: str) -> list[int]:
    """UTF-8 byte offset of the start of each source line (ast uses bytes)."""
    starts = [0]
    position = 0
    for line in source.split("\n")[:-1]:
        position += len(line.encode("utf-8")) + 1
        starts.append(position)
    return starts


def count_damaged_specs(source: str) -> int:
    """How many replacement fields carry a damaged format specifier."""
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return 0
    total = 0
    for node in ast.walk(tree):
        if not isinstance(node, ast.JoinedStr):
            continue
        for value in node.values:
            if isinstance(value, ast.FormattedValue) and _spec_is_damaged(
                _spec_text(value)
            ):
                total += 1
    return total


def repair_fstrings(source: str) -> tuple[str, int]:
    """Rebuild every f-string whose format specifier was damaged.

    Returns the repaired source and the number of repaired fields. The
    repaired string is guaranteed to keep the same literal text and the same
    field expressions, with injected whitespace removed from specifiers.
    """
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return source, 0

    targets: list[ast.JoinedStr] = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.JoinedStr):
            continue
        if any(
            isinstance(value, ast.FormattedValue)
            and _spec_is_damaged(_spec_text(value))
            for value in node.values
        ):
            targets.append(node)

    if not targets:
        return source, 0

    raw = source.encode("utf-8")
    starts = _line_byte_starts(source)
    repaired = 0
    # Replace from the end so earlier byte offsets stay valid.
    for node in sorted(targets, key=lambda n: (n.lineno, n.col_offset), reverse=True):
        repaired += sum(
            1
            for value in node.values
            if isinstance(value, ast.FormattedValue)
            and _spec_is_damaged(_spec_text(value))
        )
        begin = starts[node.lineno - 1] + node.col_offset
        end = starts[node.end_lineno - 1] + node.end_col_offset
        raw = raw[:begin] + _rebuilt_fstring(node).encode("utf-8") + raw[end:]

    return raw.decode("utf-8"), repaired
