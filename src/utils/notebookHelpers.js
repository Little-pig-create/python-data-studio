// ---- Helper functions extracted from NotebookWorkspace.jsx ----

import { stopNotebookRuntime } from "../notebookRuntime";

export const outputText = (value) => {
  const text = Array.isArray(value) ? value.join("") : String(value ?? "");
  return text.replace(/[\u001b\u009b]\[[0-?]*[ -/]*[@-~]/g, "");
};

export const formatPythonSource = (source) => String(source || "").split(/\r?\n/).map((line) => {
  let formatted = line.replace(/\t/g, "    ").replace(/\s+$/, "");
  if (/^\s*[A-Za-z_]\w*\s*=/.test(formatted) && !/==|!=|<=|>=/.test(formatted)) {
    formatted = formatted.replace(/^(\s*[A-Za-z_]\w*)\s*=\s*/, "$1 = ");
  }
  formatted = formatted.replace(/,\s*(?=[A-Za-z_\"'\[({])/g, ", ");
  return formatted;
}).join("\n");

export const markdownOutline = (notebook) => (notebook?.cells || []).flatMap((cell) => {
  if (cell.type !== "markdown") return [];
  return String(cell.source || "").split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/);
    if (!match) return [];
    return [{ cellId: cell.id, level: match[1].length, title: match[2] }];
  });
});

export const kernelStatusLabels = { idle: "未启动", ready: "空闲", busy: "运行中", error: "错误" };

export const kernelStatusDetails = {
  unknown: ["loading", "⏳ 正在连接内核..."],
  starting: ["loading", "🚀 正在启动 Python（首次需要 10 秒）..."],
  idle: ["ready", "✓ 内核就绪"],
  busy: ["busy", "▶ 代码运行中..."],
  terminating: ["loading", "⏹ 正在关闭内核..."],
  restarting: ["loading", "🔄 正在重启 Python..."],
  autorestarting: ["loading", "🔧 正在恢复 Python..."],
  dead: ["error", "❌ Python 内核已停止"]
};

export const moduleLabels = {
  python: "Python 基础",
  numpy: "NumPy",
  pandas: "Pandas",
  matplotlib: "Matplotlib",
  seaborn: "Seaborn",
  plotly: "Plotly",
  projects: "综合项目",
  "machine-learning": "机器学习"
};

export const getChapterMeta = (lesson) => {
  const isProject = lesson.kind === "project";
  const difficulty = lesson.difficulty || (isProject ? "项目实训" : lesson.chapter <= 10 ? "基础" : lesson.chapter <= 75 ? "进阶" : "实训");
  const description = lesson.description || (isProject
    ? `围绕"${lesson.title}"完成一个从数据理解、清洗、建模到结果解读的完整实训。`
    : `通过 Notebook 动手掌握${lesson.title}，把概念、代码和运行结果连成一条可复用的学习路径。`);
  const objectives = Array.isArray(lesson.objectives) && lesson.objectives.length
    ? lesson.objectives
    : [
      `理解${lesson.title}的核心概念和使用场景`,
      "运行示例代码，并根据提示完成一处修改",
      isProject ? "整理关键指标，形成可解释的分析结论" : "记录本节的关键方法，迁移到下一道练习"
    ];
  return {
    moduleLabel: moduleLabels[lesson.module] || "课程章节",
    difficulty,
    description,
    objectives,
    estimatedMinutes: Number(lesson.estimatedMinutes) || 45,
    isProject
  };
};

export const getChapterColor = (moduleId) => {
  const palette = { python: "#3B82F6", numpy: "#10B981", pandas: "#F59E0B", matplotlib: "#EF4444", seaborn: "#8B5CF6", plotly: "#EC4899", projects: "#06B6D4", "machine-learning": "#F97316" };
  return palette[moduleId] || "#6B7280";
};

export async function shutdownNotebookRuntime(runtime) {
  const session = runtime?.session;
  if (!session) return;
  if (runtime.dispose) { await runtime.dispose(); return; }
  try {
    await session.shutdown();
  } catch {
    session.dispose?.();
  }
  if (runtime.native) await stopNotebookRuntime(runtime);
}
