import { readActiveKernelFileTree, readActiveRuntimeDirectory } from "./notebookRuntime";
import { datasetFileTree } from "./datasetFileTree";

const MAX_TREE_DEPTH = 12;
const MAX_TREE_ITEMS = 2000;
const hiddenTopLevelDirectories = new Set(["extras", ".ipython", ".ipynb_checkpoints", "__pycache__"]);
const fileNameCollator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });

function normalizePath(path) {
  return String(path || "").replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
}

function runtimeContentsUrl(path) {
  const encodedPath = normalizePath(path)
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `/runtime/api/contents${encodedPath ? `/${encodedPath}` : ""}/all.json`;
}

async function readPublishedDirectory(path) {
  const response = await fetch(runtimeContentsUrl(path), { cache: "no-store" });
  if (!response.ok) throw new Error(`文件目录加载失败（${response.status}）`);
  return response.json();
}

function compareEntries(left, right) {
  if (left.type === "directory" && right.type !== "directory") return -1;
  if (left.type !== "directory" && right.type === "directory") return 1;
  return fileNameCollator.compare(left.name || "", right.name || "");
}

async function hydrateDirectory(readDirectory, path, depth, budget, source = "runtime") {
  if (depth > MAX_TREE_DEPTH || budget.count >= MAX_TREE_ITEMS) return null;
  const model = await readDirectory(path);
  if (!model || model.type !== "directory") return null;
  budget.count += 1;
  const entries = Array.isArray(model.content) ? [...model.content].sort(compareEntries) : [];
  const children = [];

  for (const entry of entries) {
    if (budget.count >= MAX_TREE_ITEMS) break;
    if (entry.type === "directory") {
      const child = await hydrateDirectory(readDirectory, entry.path, depth + 1, budget, source);
      if (child) children.push(child);
      continue;
    }
    budget.count += 1;
    children.push({
      id: `runtime-file:${normalizePath(entry.path)}`,
      name: entry.name,
      path: normalizePath(entry.path),
      type: entry.type || "file",
      size: Number(entry.size) || 0,
      mimetype: entry.mimetype || "",
      lastModified: entry.last_modified || null,
      source,
      children: []
    });
  }

  const normalizedPath = normalizePath(model.path ?? path);
  return {
    id: `runtime-directory:${normalizedPath || "/"}`,
    name: normalizedPath ? (model.name || normalizedPath.split("/").at(-1)) : "/",
    path: normalizedPath,
    type: "directory",
    size: 0,
    mimetype: "",
    lastModified: model.last_modified || null,
    source,
    children
  };
}

async function loadActiveRuntimeTree() {
  const root = await readActiveRuntimeDirectory("");
  if (!root) return null;
  return hydrateDirectory(readActiveRuntimeDirectory, "", 0, { count: 0 }, "runtime");
}

function normalizeRuntimeNode(node) {
  return normalizeTreeNode(node, "runtime");
}

function normalizeTreeNode(node, source) {
  if (!node) return null;
  const path = normalizePath(node.path);
  const type = node.type === "directory" ? "directory" : (node.type || "file");
  const children = (node.children || [])
    .map((child) => normalizeTreeNode(child, source))
    .filter(Boolean)
    .sort(compareEntries);
  return {
    id: type === "directory" ? `runtime-directory:${path || "/"}` : `runtime-file:${path}`,
    name: node.name || (path ? path.split("/").at(-1) : "/"),
    path,
    type,
    size: Number(node.size) || 0,
    mimetype: node.mimetype || "",
    lastModified: node.lastModified || null,
    source,
    children
  };
}

function mergeRuntimeTrees(base, incoming) {
  if (!base) return incoming;
  if (!incoming) return base;
  if (base.type !== "directory" || incoming.type !== "directory") return incoming;
  const children = [...base.children];
  incoming.children.forEach((incomingChild) => {
    const index = children.findIndex((child) => child.path === incomingChild.path && child.type === incomingChild.type);
    if (index >= 0) children[index] = mergeRuntimeTrees(children[index], incomingChild);
    else children.push(incomingChild);
  });
  return { ...base, children: children.sort(compareEntries) };
}

function keepWorkspaceDirectories(root) {
  if (!root || root.type !== "directory") return root;
  return {
    ...root,
    children: root.children.filter((child) => (
      child.type === "directory"
      && !child.name.startsWith(".")
      && !hiddenTopLevelDirectories.has(child.name)
    ))
  };
}

export async function loadRuntimeFileTree() {
  const publishedTree = await hydrateDirectory(readPublishedDirectory, "", 0, { count: 0 }, "course");
  let combinedTree = publishedTree;
  const datasetTree = normalizeTreeNode(datasetFileTree, "dataset");
  combinedTree = mergeRuntimeTrees(combinedTree, {
    ...publishedTree,
    children: datasetTree ? [datasetTree] : []
  });
  try {
    const activeTree = await loadActiveRuntimeTree();
    combinedTree = mergeRuntimeTrees(combinedTree, activeTree);
  } catch {
    // Runtime contents are optional until the first Python kernel starts.
  }
  try {
    const kernelTree = normalizeRuntimeNode(await readActiveKernelFileTree());
    combinedTree = mergeRuntimeTrees(combinedTree, kernelTree);
  } catch {
    // Keep the published tree available if the active kernel cannot be inspected.
  }
  return keepWorkspaceDirectories(combinedTree);
}

export async function loadCourseResourceTree() {
  let root = {
    id: "runtime-directory:/",
    name: "/",
    path: "",
    type: "directory",
    size: 0,
    mimetype: "",
    lastModified: null,
    source: "runtime",
    children: []
  };
  const datasetTree = normalizeTreeNode(datasetFileTree, "dataset");
  if (datasetTree) root = mergeRuntimeTrees(root, { ...root, children: [datasetTree] });
  try {
    root = mergeRuntimeTrees(root, await loadActiveRuntimeTree());
  } catch {
    // The contents service is optional until the runtime starts.
  }
  try {
    root = mergeRuntimeTrees(root, normalizeRuntimeNode(await readActiveKernelFileTree()));
  } catch {
    // Dataset browsing remains available if the active kernel cannot be inspected.
  }
  const visibleRoot = keepWorkspaceDirectories(root);
  return {
    ...visibleRoot,
    children: visibleRoot.children.filter((child) => child.name !== "course")
  };
}

export function filterRuntimeFileTree(node, query) {
  const normalizedQuery = String(query || "").trim().toLocaleLowerCase("zh-CN");
  if (!normalizedQuery) return node;
  const matchingChildren = (node.children || [])
    .map((child) => filterRuntimeFileTree(child, normalizedQuery))
    .filter(Boolean);
  const matches = `${node.name || ""} ${node.path || ""}`.toLocaleLowerCase("zh-CN").includes(normalizedQuery);
  if (!matches && !matchingChildren.length) return null;
  return { ...node, children: matchingChildren };
}

export function collectRuntimeDirectoryIds(node, target = []) {
  if (!node) return target;
  if (node.type === "directory") target.push(node.id);
  (node.children || []).forEach((child) => collectRuntimeDirectoryIds(child, target));
  return target;
}

export function runtimeFileCount(node) {
  if (!node) return 0;
  if (node.type !== "directory") return 1;
  return (node.children || []).reduce((total, child) => total + runtimeFileCount(child), 0);
}

export function formatRuntimeFileSize(size) {
  const bytes = Number(size) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
