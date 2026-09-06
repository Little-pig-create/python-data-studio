import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const catalogPath = path.join(publicDir, "course", "catalog.json");
const write = process.argv.includes("--write");

if (!fs.existsSync(catalogPath)) {
  throw new Error(`找不到课程目录：${catalogPath}`);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const headingPattern = /^(#{1,6})\s+(.+?)(\r?\n)?$/;

function cleanHeading(text) {
  return text
    .replace(/^第\s*\d+\s*章\s*[:：.]?\s*/u, "")
    .replace(/^\d+(?:\.\d+){0,3}\.?\s*/u, "")
    .trim();
}

function normalizeNotebook(filePath, chapter) {
  const notebook = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let foundTitle = false;
  let section = 0;
  let subsection = 0;
  let changed = false;

  for (const cell of notebook.cells ?? []) {
    if (cell.cell_type !== "markdown" || !Array.isArray(cell.source)) continue;

    cell.source = cell.source.map((line) => {
      const match = line.match(headingPattern);
      if (!match) return line;

      const [, hashes, rawText, newline = ""] = match;
      const level = hashes.length;
      const text = cleanHeading(rawText);
      let next = line;

      if (level === 1 && !foundTitle) {
        foundTitle = true;
        next = `# ${chapter}. ${text}${newline}`;
      } else if (level === 2) {
        const isBoardOutline = text === "本章板书" && section === 0;
        if (!isBoardOutline) section += 1;
        subsection = 0;
        next = `## ${chapter}.${section} ${text}${newline}`;
      } else if (level >= 3) {
        if (section === 0) section = 1;
        subsection += 1;
        next = `### ${chapter}.${section}.${subsection} ${text}${newline}`;
      }

      if (next !== line) changed = true;
      return next;
    });
  }

  if (!foundTitle) {
    throw new Error(`缺少一级标题：${filePath}`);
  }

  return { notebook, changed };
}

const issues = [];
const changes = [];

for (const entry of catalog.chapters ?? []) {
  const relativePath = String(entry.path ?? "").replace(/^\//, "");
  const filePath = path.join(publicDir, relativePath);
  if (!relativePath.endsWith(".ipynb") || !fs.existsSync(filePath)) {
    issues.push(`${entry.id ?? entry.path}: Notebook 文件不存在`);
    continue;
  }

  const chapter = Number(entry.chapter);
  if (!Number.isFinite(chapter) || chapter <= 0) {
    issues.push(`${entry.id ?? entry.path}: 无效章节号`);
    continue;
  }

  const { notebook, changed } = normalizeNotebook(filePath, chapter);
  if (changed) {
    changes.push(path.relative(root, filePath));
    if (write) fs.writeFileSync(filePath, `${JSON.stringify(notebook, null, 2)}\n`, "utf8");
  }
}

if (issues.length) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
}

console.log(`${write ? "已更新" : "将更新"} ${changes.length} 个 Notebook。`);
for (const file of changes) console.log(`- ${file}`);
