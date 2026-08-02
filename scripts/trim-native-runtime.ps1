$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$rt = Join-Path $root "runtime\native\dist\python-runtime"
$rt = [System.IO.Path]::GetFullPath($rt)

if (-not (Test-Path -LiteralPath $rt)) {
  throw "Runtime directory not found: $rt"
}

function Remove-VerifiedTree([string[]]$Targets, [string]$Label) {
  $removed = 0
  foreach ($target in $Targets) {
    if (-not $target) { continue }
    $full = [System.IO.Path]::GetFullPath($target)
    if (-not $full.StartsWith($rt + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to delete outside runtime directory: $full"
    }
    if (Test-Path -LiteralPath $full) {
      Remove-Item -LiteralPath $full -Recurse -Force
      $removed++
    }
  }
  Write-Output "$Label : removed $removed"
}

$before = Get-ChildItem -LiteralPath $rt -Recurse -File
Write-Output "Before: $($before.Count) files, $([math]::Round((($before | Measure-Object Length -Sum).Sum) / 1MB, 1)) MB"

# A. All __pycache__ directories (compiled bytecode is regenerated on demand).
$pycache = Get-ChildItem -LiteralPath $rt -Recurse -Directory -Filter "__pycache__"
Remove-VerifiedTree -Targets $pycache.FullName -Label "A. __pycache__"

# B. Standard library test/demo/installer folders that are not needed at runtime.
$stdDirs = @()
foreach ($name in @("test", "idlelib", "turtledemo", "lib2to3", "ensurepip", "__phello__")) {
  $candidate = Join-Path $rt "Lib\$name"
  if (Test-Path -LiteralPath $candidate) { $stdDirs += $candidate }
}
$unittestTests = Join-Path $rt "Lib\unittest\test"
if (Test-Path -LiteralPath $unittestTests) { $stdDirs += $unittestTests }
Remove-VerifiedTree -Targets $stdDirs -Label "B. stdlib test/idlelib/lib2to3/ensurepip"

# C. Test directories inside site-packages (never imported at runtime).
$siteTests = Get-ChildItem -LiteralPath (Join-Path $rt "Lib\site-packages") -Recurse -Directory |
  Where-Object { $_.Name -in @("test", "tests", "testing") }
Remove-VerifiedTree -Targets $siteTests.FullName -Label "C. site-packages tests"

$after = Get-ChildItem -LiteralPath $rt -Recurse -File
Write-Output "After: $($after.Count) files, $([math]::Round((($after | Measure-Object Length -Sum).Sum) / 1MB, 1)) MB"
Write-Output "Trim complete: $rt"
