; 安装前的清理钩子（由 tauri.conf.json 的 bundle.windows.nsis.installerHooks 引入）。
;
; 为什么需要：NSIS 默认**只覆盖同名文件**，不会删除新版本里已不存在的旧文件。
; 于是升级安装时会出现"新旧混杂"——实测正是这类残留导致内核起不来：
;   site-packages 里遗留了一个没有 METADATA 的 python_json_logger-4.1.0.dist-info，
;   它遮蔽了正常的 4.2.0，使 importlib.metadata.version("python-json-logger")
;   返回 None，jupyter_events 随即抛 InvalidVersion 崩溃。
;
; 因此这里在**复制文件之前**清掉整个 python-runtime 目录，保证每次安装都是干净的一份。
;
; 安全性：用户的全部数据（学习记录、笔记、自定义 notebook、日志）都在
;   %APPDATA%\com.python.datastudio\ 下，不在安装目录内，删除 python-runtime
;   不影响任何用户数据。datasets 与主程序也会被新包重新写入，无需清理。

!macro NSIS_HOOK_PREINSTALL
  DetailPrint "清理旧的 Python 运行时..."

  ; 只删运行时目录：它包含数千个文件，最容易出现跨版本残留。
  ; /r 递归，/REBOOTOK 表示目标被占用时等重启后再删，避免安装中途失败。
  RMDir /r /REBOOTOK "$INSTDIR\python-runtime"

  ; 主程序被正在运行的实例占用时，先尝试结束它，否则覆盖会失败。
  ; 仅在存在旧安装时才做。
  IfFileExists "$INSTDIR\python-data-studio.exe" 0 +3
    DetailPrint "关闭正在运行的旧版本..."
    nsExec::ExecToLog 'taskkill /F /IM python-data-studio.exe /T'
    Pop $0
!macroend
