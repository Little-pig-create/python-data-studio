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

  # Isolate the embedded interpreter from the build machine's user/system
  # site-packages. Keeping site-packages as an explicit path still allows the
  # bundled packages to import without relying on `import site`.
  @(
    "python312.zip"
    "DLLs"
    "Lib"
    "Lib\site-packages"
  ) | Set-Content -LiteralPath (Join-Path $output "python312._pth") -Encoding ascii

  $runtimePython = Join-Path $output "python.exe"
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
