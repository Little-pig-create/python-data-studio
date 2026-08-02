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
  & $runtimePython -m pip install --upgrade pip
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
    Copy-Item -LiteralPath (Join-Path $baseRoot $directory) -Destination $output -Recurse -Force
  }
$baseLib = Join-Path $baseRoot "Lib"
$runtimeLib = Join-Path $output "Lib"
Copy-Item -Path (Join-Path $baseLib "*") -Destination $runtimeLib -Recurse -Force
Remove-Item -LiteralPath (Join-Path $output "pyvenv.cfg") -Force -ErrorAction SilentlyContinue

# Trim __pycache__, standard-library test/demo folders and site-packages test
# suites so the bundled runtime stays small and packaging stays fast.
& (Join-Path $PSScriptRoot "trim-native-runtime.ps1")

$runtimePython = Join-Path $output "python.exe"
} else {
  $runtimePython = if (Test-Path -LiteralPath (Join-Path $output "python.exe")) { Join-Path $output "python.exe" } else { Join-Path $output "Scripts\python.exe" }
}

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
