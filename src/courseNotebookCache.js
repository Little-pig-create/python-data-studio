function cloneNotebook(notebook) {
  return typeof structuredClone === "function"
    ? structuredClone(notebook)
    : JSON.parse(JSON.stringify(notebook));
}

/** 课程内容更新后应立即可见，因此每次都请求最新 Notebook 文件。 */
export async function loadCourseNotebook(path) {
  if (!path) throw new Error("Notebook 路径不能为空");
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${path}${separator}_=${Date.now()}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Notebook 文件未找到");
  return cloneNotebook(await response.json());
}

export function clearCourseNotebookCache() {}
