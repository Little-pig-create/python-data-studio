#!/usr/bin/env node
/**
 * 综合项目升级集成脚本
 * 用途：将升级后的项目代码自动集成到 course-content-projects.mjs
 * 使用：node scripts/integrate-enhanced-projects.mjs
 */

import fs from "fs";
import path from "path";

const projectDir = process.cwd();
const sourceFile = path.join(projectDir, "scripts/course-content-projects.mjs");
const backupFile = path.join(projectDir, "scripts/course-content-projects.mjs.backup");
const enhancedFile = path.join(projectDir, "scripts/project-72-enhanced.mjs");

console.log("🔧 综合项目升级集成工具\n");

// Step 1: 检查文件
console.log("📋 第一步：检查文件...");
if (!fs.existsSync(sourceFile)) {
  console.error(`❌ 源文件不存在: ${sourceFile}`);
  process.exit(1);
}
if (!fs.existsSync(enhancedFile)) {
  console.error(`❌ 升级文件不存在: ${enhancedFile}`);
  console.error("   请确保 scripts/project-72-enhanced.mjs 已创建");
  process.exit(1);
}
console.log("✅ 文件检查完成\n");

// Step 2: 备份原文件
console.log("💾 第二步：备份原文件...");
const sourceContent = fs.readFileSync(sourceFile, "utf-8");
fs.writeFileSync(backupFile, sourceContent);
console.log(`✅ 备份文件已创建: ${backupFile}\n`);

// Step 3: 提取升级后的代码块
console.log("📖 第三步：提取升级后的代码块...");
const enhancedContent = fs.readFileSync(enhancedFile, "utf-8");

// 简单的正则提取 codeCells 数组
const cellsMatch = enhancedContent.match(/const cells = \[([\s\S]*?)\];/);
if (!cellsMatch) {
  console.error("❌ 无法从升级文件中提取代码块");
  process.exit(1);
}
const cellsArray = `[\n${cellsMatch[1]}\n  ]`;
console.log(`✅ 成功提取 ${cellsArray.split('title:').length - 1} 个代码块\n`);

// Step 4: 替换源文件中的项目72代码块
console.log("🔄 第四步：集成升级代码...");

// 找到项目72的 codeCells 开始和结束位置
const project72Start = sourceContent.indexOf('72: project({');
const project72End = sourceContent.indexOf('73: project({');

if (project72Start === -1 || project72End === -1) {
  console.error("❌ 无法定位项目72-73的边界");
  process.exit(1);
}

// 找到项目72内的 codeCells 数组
const project72Content = sourceContent.substring(project72Start, project72End);
const codeCellsStart = project72Content.indexOf('codeCells: [');
const codeCellsEnd = project72Content.lastIndexOf('],');

if (codeCellsStart === -1 || codeCellsEnd === -1) {
  console.error("❌ 无法定位项目72的 codeCells 数组");
  process.exit(1);
}

// 计算绝对位置
const actualCodeCellsStart = project72Start + codeCellsStart + 'codeCells: '.length;
const actualCodeCellsEnd = project72Start + codeCellsEnd + '],'.length;

// 替换
const newContent =
  sourceContent.substring(0, actualCodeCellsStart) +
  cellsArray +
  sourceContent.substring(actualCodeCellsEnd);

fs.writeFileSync(sourceFile, newContent);
console.log("✅ 项目72代码块已更新\n");

// Step 5: 验证
console.log("✔️ 第五步：验证集成...");
const newCellCount = newContent.match(/title:/g).length;
const oldCellCount = sourceContent.match(/title:/g).length;
console.log(`  原有 title 总数: ${oldCellCount}`);
console.log(`  更新后 title 总数: ${newCellCount}`);
console.log(`  增加了 ${newCellCount - oldCellCount} 个 title（项目72内）\n`);

// Step 6: 提示下一步
console.log("✅ 集成完成！\n");
console.log("📝 下一步操作：");
console.log("  1. npm run build:course       # 重新生成 Notebook");
console.log("  2. npm run build:runtime      # 构建 JupyterLite 运行时");
console.log("  3. npm run dev -- --port 8766 # 启动开发服务器");
console.log("  4. 打开浏览器访问 http://127.0.0.1:8766/course/chapter-72");
console.log("\n💡 如果需要回滚，请运行：");
console.log(`  cp ${backupFile} ${sourceFile}`);
