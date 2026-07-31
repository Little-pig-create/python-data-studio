#!/bin/bash
# Python 数据工作台 - 快速启动脚本
# 用途：一键启动开发服务器

set -e

PROJECT_DIR="D:/Research/Python数据工作台_2026-07-22"
cd "$PROJECT_DIR"

echo "================================"
echo "  Python 数据工作台"
echo "  快速启动脚本"
echo "================================"
echo ""

# Step 1: 检查依赖
echo "📋 Step 1: 检查依赖..."
if ! command -v npm &> /dev/null; then
    echo "❌ 未找到 npm，请先安装 Node.js"
    exit 1
fi
echo "✅ npm 版本: $(npm -v)"
echo ""

# Step 2: 构建课程
echo "📚 Step 2: 构建课程 Notebook..."
npm run build:course > /dev/null
echo "✅ 课程构建完成"
echo ""

# Step 3: 构建运行时
echo "🔨 Step 3: 构建 JupyterLite 运行时..."
echo "   (这可能需要 1-2 分钟...)"
npm run build:runtime > /dev/null 2>&1
echo "✅ 运行时构建完成"
echo ""

# Step 4: 启动开发服务器
echo "🚀 Step 4: 启动开发服务器..."
echo "   访问地址: http://127.0.0.1:8766"
echo "   课程首页: http://127.0.0.1:8766/course/chapter-1"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "================================"
echo ""

npm run dev -- --port 8766
