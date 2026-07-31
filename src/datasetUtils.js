export function parseDelimitedPreview(text, maxRows = 8) {
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;
  const value = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '"') {
      if (quoted && value[index + 1] === '"') { field += '"'; index += 1; } else quoted = !quoted;
    } else if (!quoted && (char === "," || char === ";" || char === "\t")) {
      row.push(field); field = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && value[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((item) => item.trim())) rows.push(row);
      row = [];
      if (rows.length >= maxRows + 1) break;
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [headers = [], ...data] = rows;
  return { headers, rows: data.slice(0, maxRows) };
}

export const formatFileSize = (size) => size < 1024 * 1024
  ? `${Math.max(1, Math.round(size / 1024))} KB`
  : `${(size / 1024 / 1024).toFixed(1)} MB`;
