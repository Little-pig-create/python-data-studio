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

Write-Output "JupyterLite runtime built at $output"
