$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$native = Join-Path $root "runtime\native"
$requirements = Join-Path $native "requirements.lock"
$output = Join-Path $native "dist\python-runtime"
$pythonCommand = if ($env:PDS_PYTHON) { $env:PDS_PYTHON } else { "py" }

if (-not $env:PDS_SKIP_INSTALL) {
  if (Test-Path -LiteralPath $output) { Remove-Item -LiteralPath $output -Recurse -Force }
  $pythonArgs = if ([System.IO.Path]::GetExtension($pythonCommand) -eq ".exe") { @("-m", "venv", $output) } else { @("-3.12", "-m", "venv", $output) }
  & $pythonCommand @pythonArgs
  if ($LASTEXITCODE -ne 0) { throw "Unable to create Python 3.12 runtime. Set PDS_PYTHON to a compatible launcher." }
  $runtimePython = Join-Path $output "Scripts\python.exe"
  $env:PYTHONNOUSERSITE = "1"
  & $runtimePython -m pip install --upgrade pip
  if ($LASTEXITCODE -ne 0) { throw "Unable to bootstrap pip in the native runtime." }
  & $runtimePython -m pip install --no-cache-dir --requirement $requirements
  if ($LASTEXITCODE -ne 0) { throw "Native runtime dependency installation failed." }

  # A Windows venv only contains a launcher and points back to the build
  # machine. Copy the CPython distribution into the artifact so it is usable
  # on a clean computer without relying on a system Python installation.
  $baseRoot = (& $runtimePython -c "import sys; print(sys.base_prefix)").Trim()
  if (-not (Test-Path -LiteralPath (Join-Path $baseRoot "python312.dll"))) { throw "Unable to locate the CPython base distribution." }
  Copy-Item -LiteralPath (Join-Path $baseRoot "python.exe") -Destination (Join-Path $output "python.exe") -Force
  Copy-Item -LiteralPath (Join-Path $baseRoot "pythonw.exe") -Destination (Join-Path $output "pythonw.exe") -Force
  Get-ChildItem -LiteralPath $baseRoot -Filter "*.dll" | Copy-Item -Destination $output -Force
  foreach ($directory in @("DLLs", "libs", "tcl")) {
    $sourceDirectory = Join-Path $baseRoot $directory
    if (Test-Path -LiteralPath $sourceDirectory) {
      Copy-Item -LiteralPath $sourceDirectory -Destination $output -Recurse -Force
    }
  }

  # Conda base distributions keep some runtime C libraries (libffi, OpenSSL,
  # SQLite, zlib, expat) in Library\bin. Without them _ctypes/ssl/sqlite fail.
  $condaBin = Join-Path $baseRoot "Library\bin"
  $requiredRuntimeDlls = @("ffi-7.dll", "ffi-8.dll", "ffi.dll", "libcrypto-3-x64.dll", "libssl-3-x64.dll", "sqlite3.dll", "zlib.dll", "libexpat.dll", "expat.dll")
  foreach ($dll in $requiredRuntimeDlls) {
    $candidate = Join-Path $condaBin $dll
    if (Test-Path -LiteralPath $candidate) { Copy-Item -LiteralPath $candidate -Destination $output -Force }
  }
  # A conda venv does not copy the standard library; it references the base
  # distribution via pyvenv.cfg. Copy the base stdlib into the artifact,
  # but keep the venv's own site-packages (clean pip + installed deps).
  $baseLib = Join-Path $baseRoot "Lib"
  $runtimeLib = Join-Path $output "Lib"
  Get-ChildItem -LiteralPath $baseLib -Force | Where-Object { $_.Name -ne "site-packages" } | Copy-Item -Destination $runtimeLib -Recurse -Force
  Remove-Item -LiteralPath (Join-Path $output "pyvenv.cfg") -Force -ErrorAction SilentlyContinue

  # Trim __pycache__, standard-library test/demo folders and selected package
  # test suites so the bundled runtime stays small and packaging stays fast.
  & (Join-Path $PSScriptRoot "trim-native-runtime.ps1")

  # 让课程里的 "/datasets/xxx.csv" 在内核中可读。
  #
  # 课程 67 个章节都写作 pd.read_csv("/datasets/titanic.csv")，那是 Jupyter 的
  # contents 路径；在 Python 内核里它只是普通绝对路径，Windows 上会解析成
  # <盘符>:\datasets\…，从而 FileNotFoundError。Rust 启动 Jupyter 时已通过
  # PDS_DATASETS_DIR 给出真实目录，但此前没有任何 Python 代码读取它。
  # sitecustomize 会在解释器启动时自动导入，用它把该前缀重定向到真实目录。
  $siteCustomizeSource = Join-Path $PSScriptRoot "..\runtime\native\sitecustomize.py"
  if (-not (Test-Path -LiteralPath $siteCustomizeSource)) {
    throw "缺少 sitecustomize.py：$siteCustomizeSource（课程将无法读取 /datasets）"
  }
  Copy-Item -LiteralPath $siteCustomizeSource -Destination (Join-Path $runtimeLib "sitecustomize.py") -Force
  Write-Output "Installed sitecustomize.py (maps /datasets -> PDS_DATASETS_DIR)"

  # Isolate the embedded interpreter from the build machine's user/system
  # site-packages. Keeping site-packages as an explicit path still allows the
  # bundled packages to import without relying on implicit site discovery.
  #
  # 末行的 `import site` 是**必需的**：存在 ._pth 文件时 Python 进入隔离模式，
  # 默认不会导入 site 模块，从而**不会**自动执行 Lib\sitecustomize.py。
  # 而课程里的 pd.read_csv("/datasets/xxx.csv") 正是靠 sitecustomize 把该前缀
  # 重定向到 PDS_DATASETS_DIR 指向的真实目录；缺了它，67 个章节读数据的
  # 单元格都会 FileNotFoundError。
  # 这里显式启用 site，同时上面的显式路径保证不会引入宿主机的 site-packages。
  @(
    "python312.zip"
    "DLLs"
    "Lib"
    "Lib\site-packages"
    "import site"
  ) | Set-Content -LiteralPath (Join-Path $output "python312._pth") -Encoding ascii

  $runtimePython = Join-Path $output "python.exe"

  # ── 修正 kernelspec（两个必需改动，缺一则内核无法启动）────────────────────
  #
  # ① argv[0] 必须是**打包的绝对路径**。
  #    ipykernel 安装时写入的是裸命令 "python"，运行时按 PATH 解析，
  #    会被用户自己的 Miniconda / 系统 Python 抢先命中。那样内核由错误解释器
  #    启动，既缺依赖又连不上服务，表现为前端"内核一直加载失败"。
  #
  # ② 追加 --IPKernelApp.parent_handle=0。
  #    jupyter_server 在 Windows 上会向内核传入一个父进程句柄；
  #    ipykernel 的 ParentPollerWindows 监听它，一旦被 signal 就立刻
  #    os._exit(1)，日志为 "Parent appears to have exited, shutting down."。
  #    在 Tauri 这类进程树中该句柄会被立即触发，导致内核刚启动就自杀。
  #    传 0 表示"无父句柄"，poller 不再启动。
  #
  # 实测（打包运行时 + jupyter_server）：
  #    默认            → 内核 starting 后立刻 "Parent appears to have exited"
  #    仅修 argv[0]    → 仍然自杀（说明 ② 才是主因）
  #    仅修 ②          → 内核存活并监听 ZMQ，但 argv[0] 仍是 PATH 上的 Python
  #    两者都修        → 客户端 READY，执行代码返回 EXEC_OK，
  #                      且 sys.executable 指向打包解释器
  $kernelSpec = Join-Path $output "share\jupyter\kernels\python3\kernel.json"
  if (Test-Path -LiteralPath $kernelSpec) {
    $spec = Get-Content -LiteralPath $kernelSpec -Raw | ConvertFrom-Json
    $spec.argv[0] = $runtimePython
    if ($spec.argv -notcontains "--IPKernelApp.parent_handle=0") {
      $spec.argv += "--IPKernelApp.parent_handle=0"
    }
    $spec | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $kernelSpec -Encoding utf8
    Write-Output "kernelspec pinned: argv[0]=$runtimePython (+parent_handle=0)"
  } else {
    throw "未找到 kernelspec：$kernelSpec —— 内核将无法启动"
  }
} else {
  $runtimePython = if (Test-Path -LiteralPath (Join-Path $output "python.exe")) { Join-Path $output "python.exe" } else { Join-Path $output "Scripts\python.exe" }
}

$env:PYTHONNOUSERSITE = "1"
$manifest = [ordered]@{
  schemaVersion = 1
  runtimeVersion = "py312-data-2026.08.01"
  pythonVersion = (& $runtimePython --version).Trim().Replace("Python ", "")
  platform = [System.Runtime.InteropServices.RuntimeInformation]::OSDescription
  architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
  buildDate = (Get-Date).ToUniversalTime().ToString("o")
  minimumAppVersion = "0.1.0"
  packages = @()
}
$packageJson = (& $runtimePython -m pip list --format=json | Out-String)
if ($LASTEXITCODE -ne 0) { throw "Unable to inspect packages in the native runtime." }
$packageRows = ConvertFrom-Json -InputObject $packageJson
$manifest.packages = @()
foreach ($package in $packageRows) {
  $manifest.packages += [ordered]@{ name = $package.name; version = $package.version }
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $output "runtime-manifest.json") -Encoding utf8
$manifestBytes = [System.IO.File]::ReadAllBytes((Join-Path $output "runtime-manifest.json"))
$manifestHash = [System.BitConverter]::ToString(([System.Security.Cryptography.SHA256]::Create().ComputeHash($manifestBytes))).Replace("-", "")
Set-Content -LiteralPath (Join-Path $output "checksums.txt") -Value "$manifestHash  runtime-manifest.json" -Encoding ascii

Write-Output "Native runtime built at $output"
