$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$jupyter = Join-Path $root ".venv\Scripts\jupyter.exe"
$output = Join-Path $root "public\runtime"

if (-not (Test-Path -LiteralPath $jupyter)) {
  throw "Missing .venv. Install jupyterlite-core and jupyterlite-pyodide-kernel first."
}

$extensionScript = Join-Path $PSScriptRoot "build-extensions.ps1"
& $extensionScript
if ($LASTEXITCODE -ne 0) {
  throw "JupyterLab extension build failed"
}

if (Test-Path -LiteralPath $output) {
  Remove-Item -LiteralPath $output -Recurse -Force
}

# ── 同步当前课程发布内容到运行时内容源 ──────────────────────────────────────
# 课程内容权威在 public/course/(由生成器与 sync-catalog.mjs 维护)。
# notebooks/course 只是 JupyterLite 打包输入，每次构建前从发布内容整体同步，
# 避免双内容源漂移；notebooks/extras 补充练习保留原样由 --contents 一并打包。
$courseSource = Join-Path $root "public\course"
$courseTarget = Join-Path $root "notebooks\course"
if (Test-Path -LiteralPath $courseSource) {
  New-Item -ItemType Directory -Force -Path $courseTarget | Out-Null
  Get-ChildItem -LiteralPath $courseTarget -Recurse -File -Filter "*.ipynb" | Remove-Item -Force
  Get-ChildItem -LiteralPath $courseSource -File -Filter "*.ipynb" | Copy-Item -Destination $courseTarget -Force
  $capSource = Join-Path $courseSource "module-capstones"
  $capTarget = Join-Path $courseTarget "module-capstones"
  if (Test-Path -LiteralPath $capSource) {
    New-Item -ItemType Directory -Force -Path $capTarget | Out-Null
    Get-ChildItem -LiteralPath $capSource -File -Filter "*.ipynb" | Copy-Item -Destination $capTarget -Force
  }
  Write-Output "Synced course content into $courseTarget"
}

$arguments = @(
  "lite", "build",
  "--config", (Join-Path $root "runtime\jupyter_lite_config.json"),
  "--output-dir", $output,
  "--contents", (Join-Path $root "notebooks"),
  "--apps", "lab",
  "--force"
)
& $jupyter @arguments

if ($LASTEXITCODE -ne 0) {
  throw "JupyterLite build failed with exit code $LASTEXITCODE"
}

# 统一运行时 Notebook 的稳定 cell ID、标签和内容指纹。
# JupyterLite 构建会先清空 public/runtime，因此规范化必须放在构建之后。
$python = $null
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
if (Test-Path -LiteralPath $venvPython) {
  $python = $venvPython
} else {
  $pythonCommand = Get-Command python.exe -ErrorAction SilentlyContinue
  if ($pythonCommand) {
    $python = $pythonCommand.Source
  }
}
if (-not $python) {
  throw "Missing Python. Notebook architecture normalization requires python.exe."
}
& $python (Join-Path $root "scripts\normalize-notebook-architecture.py") --scope runtime
if ($LASTEXITCODE -ne 0) {
  throw "Notebook architecture normalization failed with exit code $LASTEXITCODE"
}

Write-Output "JupyterLite runtime built at $output"
