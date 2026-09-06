import { useCallback, useEffect, useMemo, useState } from "react";
import { Tooltip } from "@mui/material";
import CodeRounded from "@mui/icons-material/CodeRounded";
import DataObjectOutlined from "@mui/icons-material/DataObjectOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import FolderRounded from "@mui/icons-material/FolderRounded";
import ImageOutlined from "@mui/icons-material/ImageOutlined";
import InsertDriveFileOutlined from "@mui/icons-material/InsertDriveFileOutlined";
import TableChartOutlined from "@mui/icons-material/TableChartOutlined";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import { formatRuntimeFileSize, loadCourseResourceTree } from "../runtimeFileTree";
import { moduleAbbrev } from "../utils/moduleAbbrev";
import { chapterProgress, matchesCourseSearch, moduleStats } from "../utils/progressHelpers";
import { ChapterProgressRing } from "./ChapterProgressRing";
import { FilePreviewDialog } from "./FilePreviewDialog";

const MODULE_NODE_PREFIX = "module:";
const COURSE_ROOT_NODE_ID = "root:course";
const RESOURCE_DIRECTORY_PREFIX = "runtime-directory:";
const tableExtensions = new Set(["csv", "data", "names", "test", "tsv", "xls", "xlsx", "parquet"]);
const codeExtensions = new Set(["py", "js", "mjs", "ts", "tsx", "jsx", "css", "html", "sql"]);
const imageExtensions = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

function chapterNavigationLabel(item) {
  return item.label || `第${item.chapter}章 ${item.title}`;
}

function chapterKindLabel(item) {
  if (item.kind === "capstone") return "模块大作业";
  if (item.kind === "project") return "综合项目";
  if (item.kind === "extra") return "专题";
  return "";
}

function chapterClassName(item, baseClass) {
  const kindClass = item.kind ? ` is-${item.kind}` : "";
  return `${baseClass}${kindClass}`;
}

function moduleNodeId(moduleId) {
  return `${MODULE_NODE_PREFIX}${moduleId}`;
}

function notebookPath(item) {
  const fallback = `${item.id || "notebook"}.ipynb`;
  const rawPath = String(item.path || item.fileName || fallback)
    .split(/[?#]/, 1)[0]
    .replaceAll("\\", "/");
  const courseRoot = rawPath.indexOf("/course/");
  const relativePath = courseRoot >= 0
    ? rawPath.slice(courseRoot + "/course/".length)
    : rawPath.replace(/^\/+/, "");
  try {
    return decodeURIComponent(relativePath || fallback);
  } catch {
    return relativePath || fallback;
  }
}

function buildNotebookNodes(chapters) {
  return chapters.map((item) => {
    const relativePath = notebookPath(item);
    return { id: item.id, item, relativePath };
  });
}

function sameValues(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function openChapter(item, store, navigate, onClose) {
  store.setActiveChapter(item.id);
  store.setSearchQuery("");
  navigate("/course/" + item.id);
  onClose?.();
}

export function ChapterLink({ item, store, navigate, onClose, className = "course-tree-chapter", detail }) {
  const progress = chapterProgress(store, item.id);
  const kindLabel = chapterKindLabel(item);
  return <button
    type="button"
    className={chapterClassName(item, className) + (store.activeChapterId === item.id ? " is-selected" : "")}
    onClick={() => openChapter(item, store, navigate, onClose)}
  >
    <ChapterProgressRing value={progress} />
    <span className="course-link-copy">
      <span>{chapterNavigationLabel(item)}</span>
      {(kindLabel || detail) && <small className={kindLabel ? `course-link-kind kind-${item.kind}` : ""}>{kindLabel || detail}</small>}
    </span>
  </button>;
}

export function SearchResults({ catalog, store, navigate, onClose, query }) {
  const results = catalog.chapters.filter((item) => matchesCourseSearch(item, catalog.modules.find((module) => module.id === item.module), query));
  if (!results.length) return <div className="course-search-empty">未找到匹配章节</div>;
  return <div className="course-search-results" aria-live="polite">
    {results.map((item) => {
      const module = catalog.modules.find((candidate) => candidate.id === item.module);
      return <ChapterLink key={item.id} item={item} store={store} navigate={navigate} onClose={onClose} className="course-search-result" detail={module?.label} />;
    })}
  </div>;
}

export function CollapsedRail({ catalog, store, navigate, onClose }) {
  const activeChapter = catalog.chapters.find((item) => item.id === store.activeChapterId);
  const activeModuleId = activeChapter?.module;
  return <div className="course-rail" aria-label="课程模块（折叠）">
    {catalog.modules.map((module) => {
      const { moduleChapters, completedCount, total } = moduleStats(catalog, module, store.completedIds);
      const done = total > 0 && completedCount === total;
      const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
      const isActive = module.id === activeModuleId;
      return <Tooltip key={module.id} placement="right" title={`${module.label} · ${completedCount}/${total} 已完成 (${percent}%)`}>
        <button
          type="button"
          className={`course-rail-item ${isActive ? "is-active" : ""} ${done ? "is-done" : ""}`}
          style={{ "--rail-color": module.color }}
          aria-label={`${module.label}，已完成 ${completedCount} / ${total}`}
          onClick={() => {
            const target = moduleChapters.find((ch) => !store.completedIds.includes(ch.id)) || moduleChapters[0];
            store.setSidebarMode("full");
            if (!store.expandedModules.includes(module.id)) store.setExpandedModules([...store.expandedModules, module.id]);
            if (target) openChapter(target, store, navigate, onClose);
          }}
        >
          <span className="course-rail-chip">{done ? "✓" : moduleAbbrev[module.id] || module.label.slice(0, 2)}</span>
          <span className="course-rail-count">{completedCount}/{total}</span>
        </button>
      </Tooltip>;
    })}
  </div>;
}

function ModuleLabel({ module, completedCount, total }) {
  return <span className="course-tree-folder-label">
    <FolderRounded className="course-tree-folder-icon" fontSize="inherit" />
    <span className="course-tree-folder-name">{module.label}</span>
    <span className="course-tree-folder-count">{completedCount}/{total}</span>
  </span>;
}

function CourseRootLabel({ total }) {
  return <span className="course-tree-folder-label course-tree-path-folder-label">
    <FolderRounded className="course-tree-folder-icon" fontSize="inherit" />
    <span className="course-tree-folder-name">course</span>
    <span className="course-tree-folder-count">{total}</span>
  </span>;
}

function NotebookLabel({ node, store }) {
  const { item, relativePath } = node;
  const progress = chapterProgress(store, item.id);
  const kindLabel = chapterKindLabel(item);
  return <Tooltip title={item.path || relativePath} placement="right" enterDelay={500}>
    <span className="course-tree-notebook-label">
      <InsertDriveFileOutlined className="course-tree-notebook-icon" fontSize="inherit" />
      <span className="course-tree-notebook-copy">
        <span>{chapterNavigationLabel(item)}</span>
        <small>
          <span>{relativePath}</span>
          {kindLabel && <b className={`course-link-kind kind-${item.kind}`}>{kindLabel}</b>}
        </small>
      </span>
      <ChapterProgressRing value={progress} />
    </span>
  </Tooltip>;
}

function renderNotebookNode(node, store) {
  return <TreeItem
    key={node.id}
    itemId={node.id}
    className={chapterClassName(node.item, "course-tree-notebook")}
    label={<NotebookLabel node={node} store={store} />}
  />;
}

function extensionOf(name) {
  const match = String(name || "").match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function ResourceFileIcon({ node }) {
  const extension = extensionOf(node.name);
  if (tableExtensions.has(extension)) return <TableChartOutlined />;
  if (codeExtensions.has(extension)) return <CodeRounded />;
  if (imageExtensions.has(extension)) return <ImageOutlined />;
  if (extension === "json" || extension === "geojson") return <DataObjectOutlined />;
  return <DescriptionOutlined />;
}

function ResourceFolderLabel({ node }) {
  return <span className="course-tree-folder-label course-tree-resource-folder-label">
    <FolderRounded className="course-tree-folder-icon" fontSize="inherit" />
    <span className="course-tree-folder-name">{node.name}</span>
    <span className="course-tree-folder-count">{node.children.length}</span>
  </span>;
}

function ResourceFileLabel({ node }) {
  return <Tooltip title={`/${node.path}`} placement="right" enterDelay={500}>
    <span className="course-tree-resource-file-label">
      <span className={`course-tree-resource-file-icon type-${extensionOf(node.name) || "file"}`}><ResourceFileIcon node={node} /></span>
      <span className="course-tree-resource-file-copy">
        <span>{node.name}</span>
        <small>{formatRuntimeFileSize(node.size)}</small>
      </span>
    </span>
  </Tooltip>;
}

function renderResourceNode(node) {
  if (node.type === "directory") {
    return <TreeItem key={node.id} itemId={node.id} label={<ResourceFolderLabel node={node} />}>
      {node.children.map(renderResourceNode)}
    </TreeItem>;
  }
  return <TreeItem key={node.id} itemId={node.id} label={<ResourceFileLabel node={node} />} />;
}

function collectResourceFiles(nodes, target = new Map()) {
  nodes.forEach((node) => {
    if (node.type === "directory") collectResourceFiles(node.children, target);
    else target.set(node.id, node);
  });
  return target;
}

export function CourseTree({ catalog, store, navigate, onClose }) {
  const [courseRootExpanded, setCourseRootExpanded] = useState(true);
  const [resourceNodes, setResourceNodes] = useState([]);
  const [resourceExpandedItems, setResourceExpandedItems] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const modules = useMemo(() => catalog.modules.map((module) => {
    const stats = moduleStats(catalog, module, store.completedIds);
    return {
      module,
      ...stats,
      children: buildNotebookNodes(stats.moduleChapters)
    };
  }), [catalog, store.completedIds]);
  const chaptersById = useMemo(
    () => new Map(catalog.chapters.map((item) => [item.id, item])),
    [catalog.chapters]
  );
  const resourceFilesById = useMemo(() => collectResourceFiles(resourceNodes), [resourceNodes]);
  const refreshResources = useCallback(async () => {
    const tree = await loadCourseResourceTree();
    setResourceNodes(tree?.children || []);
  }, []);

  useEffect(() => {
    void refreshResources();
    let refreshTimer;
    const handleRuntimeFilesChanged = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void refreshResources(), 250);
    };
    window.addEventListener("runtime-files-changed", handleRuntimeFilesChanged);
    return () => {
      window.clearTimeout(refreshTimer);
      window.removeEventListener("runtime-files-changed", handleRuntimeFilesChanged);
    };
  }, [refreshResources]);

  const expandedItems = [
    ...(courseRootExpanded ? [COURSE_ROOT_NODE_ID] : []),
    ...store.expandedModules.map(moduleNodeId),
    ...resourceExpandedItems,
  ];

  const handleExpandedItemsChange = (_event, itemIds) => {
    const nextModules = itemIds
      .filter((id) => id.startsWith(MODULE_NODE_PREFIX))
      .map((id) => id.slice(MODULE_NODE_PREFIX.length));
    if (!sameValues(nextModules, store.expandedModules)) store.setExpandedModules(nextModules);
    setResourceExpandedItems(itemIds.filter((id) => id.startsWith(RESOURCE_DIRECTORY_PREFIX)));
    setCourseRootExpanded(itemIds.includes(COURSE_ROOT_NODE_ID));
  };

  const handleSelectedItemsChange = (_event, itemId) => {
    const item = chaptersById.get(itemId);
    if (item) {
      openChapter(item, store, navigate, onClose);
      return;
    }
    const resourceFile = resourceFilesById.get(itemId);
    if (resourceFile) setPreviewFile(resourceFile);
  };

  return <><SimpleTreeView
    className="course-path-tree"
    aria-label="按路径组织的课程 Notebook"
    expansionTrigger="content"
    itemChildrenIndentation={16}
    expandedItems={expandedItems}
    selectedItems={store.activeChapterId}
    onExpandedItemsChange={handleExpandedItemsChange}
    onSelectedItemsChange={handleSelectedItemsChange}
  >
    <TreeItem itemId={COURSE_ROOT_NODE_ID} label={<CourseRootLabel total={catalog.chapters.length} />}>
      {modules.map(({ module, children, completedCount, total }) => <TreeItem
        key={module.id}
        itemId={moduleNodeId(module.id)}
        label={<ModuleLabel module={module} completedCount={completedCount} total={total} />}
      >
        {children.map((node) => renderNotebookNode(node, store))}
      </TreeItem>)}
      {resourceNodes.map(renderResourceNode)}
    </TreeItem>
  </SimpleTreeView>
  <FilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} />
  </>;
}
