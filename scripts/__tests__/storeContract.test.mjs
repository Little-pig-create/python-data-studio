// 静态一致性检查：防止"调用 store 上不存在的方法"这类运行时错误。
//
// 背景：清理 useAppStore 的死字段时，删掉了 setRuntime，
// 但 CourseView.jsx 里还有一处 `store.setRuntime(state, 100)` —— 因为它写在一行
// 很长的 JSX 里，人工搜索漏掉了，直到浏览器报 "store.setRuntime is not a function"。
//
// 这类错误**构建阶段发现不了**（JS 不做静态检查），因此这里用测试来兜住：
//   1. 读两个 store 的实现，收集它们真正导出的方法名
//   2. 扫描所有 "const store = useXxxStore()" 的组件
//   3. 检查该组件里每一处 store.<method> 调用是否真实存在

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const srcDir = join(repoRoot, "src");

/** 递归收集 src 下所有 .js/.jsx 文件。 */
function collectSourceFiles(dir = srcDir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name === "stubs") continue;
      out.push(...collectSourceFiles(full));
    } else if (name.endsWith(".js") || name.endsWith(".jsx")) {
      out.push(full);
    }
  }
  return out;
}

/** 解析 store 文件，取出它定义的方法名（值为箭头函数的键）。 */
function extractStoreMethods(fileName) {
  const text = readFileSync(join(srcDir, fileName), "utf8");
  const methods = new Set();
  // 形如 `  setRuntime: (...) => set(...)` 或 `  setRuntime: function`
  const pattern = /^\s{2}([A-Za-z_$][\w$]*)\s*:\s*(?:\(|function\b|async\b)/gm;
  for (const match of text.matchAll(pattern)) methods.add(match[1]);
  return methods;
}

const APP_STORE = extractStoreMethods("store.js");
const NOTEBOOK_STORE = extractStoreMethods("notebookStore.js");

test("能从两个 store 中解析出方法列表", () => {
  assert.ok(APP_STORE.size > 3, `useAppStore 方法过少：${[...APP_STORE]}`);
  assert.ok(NOTEBOOK_STORE.size > 3, `useNotebookStore 方法过少：${[...NOTEBOOK_STORE]}`);
  // 抽查关键方法存在（这些是组件依赖的契约）
  assert.ok(APP_STORE.has("setActiveChapter"), "useAppStore 应导出 setActiveChapter");
  assert.ok(NOTEBOOK_STORE.has("setRuntime"), "useNotebookStore 应导出 setRuntime");
  assert.ok(NOTEBOOK_STORE.has("setDocument"), "useNotebookStore 应导出 setDocument");
});

test("组件里调用的 store 方法都真实存在", () => {
  const problems = [];
  for (const file of collectSourceFiles()) {
    const text = readFileSync(file, "utf8");
    const rel = file.slice(repoRoot.length + 1).replace(/\\/g, "/");

    // 该文件把哪个 store 赋给了 store 变量？
    const binding = text.match(/const\s+store\s*=\s*use(AppStore|NotebookStore)\s*\(/);
    if (!binding) continue;
    const methods = binding[1] === "AppStore" ? APP_STORE : NOTEBOOK_STORE;

    // 逐个检查 store.<name>( 的调用
    for (const call of text.matchAll(/\bstore\.([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = call[1];
      if (!methods.has(name)) {
        const line = text.slice(0, call.index).split("\n").length;
        problems.push(`${rel}:${line} 调用了 ${binding[1]} 上不存在的 ${name}()`);
      }
    }
  }
  assert.deepEqual(problems, [], `发现 store 方法调用错误：\n${problems.join("\n")}`);
});

test("store 之间不重复导出同名方法（避免职责混淆）", () => {
  // runtimeState 曾经在两个 store 里都有，造成"改哪个"的困惑。
  // 这里锁住：同名方法只允许出现在一个 store 里。
  const overlap = [...APP_STORE].filter((name) => NOTEBOOK_STORE.has(name));
  assert.deepEqual(overlap, [], `两个 store 重复定义了方法：${overlap.join(", ")}`);
});
