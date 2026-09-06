import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(root, "public", "course");

function formatPythonSource(source) {
  const lines = String(source || "").split(/\r?\n/).map((line) => {
    let formatted = line.replace(/\t/g, "    ").replace(/\s+$/, "");
    if (/^\s*[A-Za-z_]\w*\s*=/.test(formatted) && !/==|!=|<=|>=/.test(formatted)) {
      formatted = formatted.replace(/^(\s*[A-Za-z_]\w*)\s*=\s*/, "$1 = ");
    }
    return formatted.replace(/,\s*(?=[A-Za-z_\"'\[({])/g, ", ");
  });
  const imports = [];
  const body = [];
  for (const line of lines) {
    if (/^(?:import\s+|from\s+)[A-Za-z_]/.test(line)) imports.push(line);
    else body.push(line);
  }
  const uniqueImports = [...new Set(imports)].sort((left, right) => {
    const leftStdlib = /^(?:import|from)\s+(?:collections|datetime|pathlib|math|os|re|statistics|typing|urllib|warnings)\b/.test(left);
    const rightStdlib = /^(?:import|from)\s+(?:collections|datetime|pathlib|math|os|re|statistics|typing|urllib|warnings)\b/.test(right);
    return Number(rightStdlib) - Number(leftStdlib) || left.localeCompare(right);
  });
  if (!uniqueImports.length) return body.join("\n");
  return [...uniqueImports, "", ...body].join("\n");
}

let changed = 0;
for (const file of fs.readdirSync(directory).filter((name) => name.endsWith(".ipynb"))) {
  const fullPath = path.join(directory, file);
  const notebook = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  let dirty = false;
  notebook.cells = (notebook.cells || []).map((cell) => {
    if (cell.cell_type !== "code") return cell;
    const source = (cell.source || []).join("");
    const formatted = formatPythonSource(source);
    if (formatted === source) return cell;
    dirty = true;
    return { ...cell, source: formatted.split(/(?<=\n)/) };
  });
  if (dirty) {
    fs.writeFileSync(fullPath, `${JSON.stringify(notebook, null, 2)}\n`, "utf8");
    changed += 1;
  }
}
console.log(`Formatted ${changed} course notebooks.`);
