import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const catalog = JSON.parse(fs.readFileSync(path.join(publicDir, "course", "catalog.json"), "utf8"));
const write = process.argv.includes("--write");

function codeDigest(notebook) {
  const source = (notebook.cells ?? [])
    .filter((cell) => cell.cell_type === "code")
    .map((cell) => cell.source ?? []);
  return crypto.createHash("sha256").update(JSON.stringify(source)).digest("hex");
}

function parseOutline(notebook, chapter) {
  const sections = [];
  let active = null;

  for (const cell of notebook.cells ?? []) {
    if (cell.cell_type !== "markdown") continue;
    for (const line of cell.source ?? []) {
      const h2 = line.match(new RegExp(`^## ${chapter}\\.(\\d+)\\s+(.+?)\\r?\\n?$`));
      if (h2) {
        if (Number(h2[1]) === 0) continue;
        active = { number: Number(h2[1]), title: h2[2].trim(), children: [] };
        sections.push(active);
        continue;
      }

      const h3 = line.match(new RegExp(`^### ${chapter}\\.(\\d+)\\.(\\d+)\\s+(.+?)\\r?\\n?$`));
      if (h3 && active && Number(h3[1]) === active.number) {
        active.children.push({ number: Number(h3[2]), title: h3[3].trim() });
      }
    }
  }

  return sections;
}

function fallbackChild(title) {
  return `掌握“${title}”的核心要点`;
}

function boardLines(chapter, title, sections) {
  const lines = ["\n", `## ${chapter}.0 本章板书\n`, "\n", "```text\n", `第 ${chapter} 章  ${title}\n`, "│\n"];

  sections.forEach((section, sectionIndex) => {
    const lastSection = sectionIndex === sections.length - 1;
    const childPrefix = lastSection ? "   " : "│  ";
    const children = section.children.length
      ? section.children
      : [{ number: 1, title: fallbackChild(section.title) }];

    lines.push(`${lastSection ? "└─" : "├─"} ${chapter}.${section.number} ${section.title}\n`);
    children.forEach((child, childIndex) => {
      const lastChild = childIndex === children.length - 1;
      lines.push(`${childPrefix}${lastChild ? "└─" : "├─"} ${chapter}.${section.number}.${child.number} ${child.title}\n`);
    });
    if (!lastSection) lines.push("│\n");
  });

  lines.push("```\n", "\n", "> **板书主线**：先明确本章问题，再依次完成概念理解、示例观察与结果核对。\n", "\n");
  return lines;
}

const changes = [];
const errors = [];

for (const entry of catalog.chapters ?? []) {
  const chapter = Number(entry.chapter);
  const relativePath = String(entry.path ?? "").replace(/^\//, "");
  const filePath = path.join(publicDir, relativePath);
  if (!Number.isFinite(chapter) || !fs.existsSync(filePath)) {
    errors.push(`无法处理：${entry.id ?? relativePath}`);
    continue;
  }

  const notebook = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const current = JSON.stringify(notebook);
  const beforeCodeDigest = codeDigest(notebook);
  const boardHeading = `## ${chapter}.0 本章板书`;
  if ((notebook.cells ?? []).some((cell) => (cell.source ?? []).some((line) => line.trim() === boardHeading))) continue;

  const sections = parseOutline(notebook, chapter);
  const titleCell = (notebook.cells ?? []).find((cell) => cell.cell_type === "markdown" && (cell.source ?? []).some((line) => line.startsWith(`# ${chapter}. `)));
  if (!titleCell || sections.length === 0) {
    errors.push(`缺少标题或章节目录：${relativePath}`);
    continue;
  }

  const titleLineIndex = titleCell.source.findIndex((line) => line.startsWith(`# ${chapter}. `));
  const title = titleCell.source[titleLineIndex].replace(new RegExp(`^# ${chapter}\\.\\s*`), "").trim();
  titleCell.source.splice(titleLineIndex + 1, 0, ...boardLines(chapter, title, sections));

  if (codeDigest(notebook) !== beforeCodeDigest) {
    throw new Error(`代码单元格意外变化：${relativePath}`);
  }

  if (JSON.stringify(notebook) !== current) {
    changes.push(relativePath);
    if (write) fs.writeFileSync(filePath, `${JSON.stringify(notebook, null, 2)}\n`, "utf8");
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
}

console.log(`${write ? "已写入" : "将写入"} ${changes.length} 个教学板书目录。`);
