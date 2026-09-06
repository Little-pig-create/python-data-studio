const packageNamePattern = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;

export const studentPackageCatalog = Object.freeze([
  { name: "requests", label: "requests", description: "发送 HTTP 请求，适合接口数据练习。", browser: "可尝试" },
  { name: "rich", label: "rich", description: "在 Notebook 中输出更清晰的终端文本。", browser: "可尝试" },
  { name: "python-dateutil", label: "python-dateutil", description: "补充日期和时间处理能力。", browser: "可尝试" },
  { name: "openpyxl", label: "openpyxl", description: "读写 Excel 工作簿。", browser: "需验证" },
  { name: "statsmodels", label: "statsmodels", description: "统计模型与回归分析。", browser: "需验证" },
]);

// 这里将“运行时内置”和“课程按需提供”分开显示：前者不需要安装，后者在代码导入时
// 由课程运行时自动准备，避免学生误以为所有库都已经预装在浏览器中。
export const studentRuntimePackageGroups = Object.freeze([
  {
    id: "stdlib",
    label: "Python 标准库",
    description: "无需安装，可直接 import。",
    status: "默认可用",
    packages: ["math", "json", "re", "datetime", "pathlib", "statistics", "csv", "collections"],
  },
  {
    id: "course",
    label: "课程数据分析包",
    description: "在代码导入时按需准备，不需要写 requirements。",
    status: "课程内置",
    packages: ["numpy", "pandas", "matplotlib", "scipy", "scikit-learn", "seaborn", "plotly"],
  },
  {
    id: "installer",
    label: "浏览器安装工具",
    description: "用于安装与验证兼容的第三方纯 Python 包。",
    status: "可安装扩展",
    packages: ["piplite"],
  },
]);

const INSTALLED_PACKAGE_RECORDS_KEY = "python-data-studio:student-installed-packages:v1";

export function readInstalledPackages(userId) {
  if (!userId || typeof window === "undefined") return [];
  try {
    const allRecords = JSON.parse(window.localStorage?.getItem(INSTALLED_PACKAGE_RECORDS_KEY) || "{}");
    return normalizeDependencies(allRecords?.[userId] || []);
  } catch {
    return [];
  }
}

export function saveInstalledPackages(userId, packages) {
  if (!userId || typeof window === "undefined") return;
  try {
    const allRecords = JSON.parse(window.localStorage?.getItem(INSTALLED_PACKAGE_RECORDS_KEY) || "{}");
    allRecords[userId] = normalizeDependencies(packages);
    window.localStorage?.setItem(INSTALLED_PACKAGE_RECORDS_KEY, JSON.stringify(allRecords));
  } catch {
    // 存储空间不可用时不影响当前运行时安装。
  }
}

export function normalizeDependency(value) {
  const text = String(value || "").trim();
  if (!text || text.startsWith("#")) return null;
  const match = text.match(/^([A-Za-z0-9][A-Za-z0-9_.-]{0,127})(.*)$/);
  if (!match || !packageNamePattern.test(match[1])) return null;
  return `${match[1]}${match[2].trim()}`;
}

export function dependencyName(value) {
  return normalizeDependency(value)?.match(/^([A-Za-z0-9][A-Za-z0-9_.-]{0,127})/)?.[1] || "";
}

export function normalizeDependencies(values) {
  const source = Array.isArray(values) ? values : String(values || "").split(/\r?\n|[,，]/);
  return [...new Set(source.map(normalizeDependency).filter(Boolean))].slice(0, 40);
}

export function dependenciesToRequirements(values) {
  return normalizeDependencies(values).join("\n");
}
