$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node).Source
$builder = Join-Path $root "node_modules\@jupyterlab\builder\lib\build-labextension.js"
$core = Join-Path $root "runtime\build-core"
$extensions = @(
  (Join-Path $root "runtime\extensions\jupyterlite-course-bridge"),
  (Join-Path $root "runtime\extensions\jupyterlite-course-theme")
)

foreach ($extension in $extensions) {
  & $node $builder $extension --core-path $core
  if ($LASTEXITCODE -ne 0) {
    throw "JupyterLab extension build failed for $extension"
  }

  # JupyterLite consumes these values as URLs; the Windows builder emits '\\'.
  $metadataPath = Join-Path $extension "static\package.json"
  $metadata = Get-Content -Raw -Encoding UTF8 $metadataPath | ConvertFrom-Json
  $metadata.jupyterlab._build.load = $metadata.jupyterlab._build.load -replace '\\', '/'
  if ($metadata.jupyterlab._build.style) {
    $metadata.jupyterlab._build.style = $metadata.jupyterlab._build.style -replace '\\', '/'
  }
  $metadataJson = $metadata | ConvertTo-Json -Depth 20
  [System.IO.File]::WriteAllText(
    $metadataPath,
    $metadataJson,
    [System.Text.UTF8Encoding]::new($false)
  )
}

Write-Output "Course JupyterLab extensions built."
