# Zustand 状态模型

## 1. 原则

- Zustand 只保存应用可观察状态；
- Notebook 文件内容由 JupyterLite 管理；
- 大型数据不进入全局 Store；
- Store 通过 actions 修改，不允许业务组件任意写内部字段；
- 持久化状态必须有 schema version 和迁移函数。

## 2. Store 划分

```text
stores/
├─ courseStore
├─ notebookStore
├─ runtimeStore
├─ layoutStore
├─ progressStore
└─ preferenceStore
```

## 3. courseStore

状态：

```text
manifest
activeChapterId
expandedModuleIds
searchQuery
recentChapterIds
manifestStatus
```

动作：

- `loadManifest`
- `openChapter`
- `toggleModule`
- `setSearchQuery`
- `recordRecentChapter`

持久化：

- `activeChapterId`
- `expandedModuleIds`
- `recentChapterIds`

## 4. notebookStore

状态：

```text
activeNotebookPath
activeNotebookTitle
loadState
saveState
isDirty
outline
selectedCellId
lastError
```

动作：

- `requestOpen`
- `markOpened`
- `markDirty`
- `markSaving`
- `markSaved`
- `setOutline`
- `setSelectedCell`
- `setNotebookError`

`selectedCellId` 不持久化。

## 5. runtimeStore

状态机：

```text
idle
loading
ready
busy
restarting
interrupted
error
```

附加状态：

```text
kernelName
activeExecutionId
loadingStage
loadingProgress
lastExecutionMs
lastError
```

动作：

- `startLoading`
- `updateLoadingStage`
- `markReady`
- `markBusy`
- `markExecutionComplete`
- `markRestarting`
- `markInterrupted`
- `markRuntimeError`
- `resetRuntime`

运行时状态不持久化。页面重载后必须重新握手。

## 6. layoutStore

状态：

```text
sidebarMode
sidebarWidth
activeSidebarTab
mobileDrawerOpen
auxiliaryPanel
auxiliaryPanelWidth
commandPaletteOpen
```

动作：

- `toggleSidebar`
- `setSidebarMode`
- `setActiveSidebarTab`
- `openMobileDrawer`
- `closeMobileDrawer`
- `openAuxiliaryPanel`
- `closeAuxiliaryPanel`

持久化：

- `sidebarMode`
- `sidebarWidth`
- `activeSidebarTab`
- `auxiliaryPanelWidth`

临时弹层状态不持久化。

## 7. progressStore

状态：

```text
completedChapterIds
startedChapterIds
lastVisitedAt
executionCounts
moduleProgress
```

章节完成规则首期采用显式完成或最低行为组合：

- 用户主动标记完成；或
- 章节已访问且含代码章节至少成功运行一个单元格。

纯阅读章节不能因为没有运行代码而无法完成。

持久化：

- 全部 progress 状态；
- 使用版本化 localStorage key；
- 提供导出和清除入口。

## 8. preferenceStore

状态：

```text
theme
uiFontScale
editorFontSize
reducedMotion
showLineNumbers
wrapCode
```

来源优先级：

1. 用户显式设置；
2. 系统偏好；
3. 产品默认值。

主题和编辑器设置通过 Runtime Bridge 同步到 JupyterLite。

## 9. 派生状态

派生状态通过 selector 计算：

- 当前模块；
- 总完成率；
- 当前模块完成率；
- 下一章节；
- 是否可以运行；
- 是否显示加载遮罩；
- 是否允许恢复原始 Notebook。

不得把可计算值重复存入多个 Store。

## 10. 持久化版本

```text
python-data-studio:course:v1
python-data-studio:layout:v1
python-data-studio:progress:v1
python-data-studio:preferences:v1
```

版本升级时：

- 先读取旧版本；
- 执行纯函数迁移；
- 校验字段；
- 写入新版本；
- 迁移失败时保留原始数据并使用默认值。

## 11. 调试与测试

桌面版的 Notebook 工作副本由 Tauri 命令写入用户数据目录 `notebooks/`；浏览器版继续使用 IndexedDB。两者都不写入课程原稿、`src` 或安装资源。

- 每个 Store 单独测试 actions 和 selectors；
- Bridge 事件通过适配器写入 Store；
- 不在测试中启动真实 Pyodide 来验证 Store；
- 运行时 Store 使用模拟事件测试状态转换；
- 开发环境允许查看 Store，但生产环境不暴露敏感调试入口。
