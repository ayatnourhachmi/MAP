param(
    [string]$OutputDir = "deploy",
    [string]$ZipNamePrefix = "web-deploy"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$webRoot = Resolve-Path (Join-Path $scriptDir "..")

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resolvedOutputDir = Join-Path $webRoot $OutputDir
$zipPath = Join-Path $resolvedOutputDir ("{0}-{1}.zip" -f $ZipNamePrefix, $timestamp)

# Skip local build artifacts and dependency folders.
$excludeTopLevelDirs = @(
    "node_modules",
    ".next",
    ".git",
    "deploy",
    "out"
)

$excludeRelativePrefixes = @(
    "app\[locale]\coming-soon",
    "app\[locale]\concierge"
)

$excludeFileNames = @(
    ".DS_Store"
)

if (-not (Test-Path $resolvedOutputDir)) {
    New-Item -ItemType Directory -Path $resolvedOutputDir | Out-Null
}

$allFiles = Get-ChildItem -Path $webRoot -Recurse -File
$filesToZip = $allFiles | Where-Object {
    $relativePath = $_.FullName.Substring($webRoot.Path.Length + 1)

    $hasExcludedPath = $false
    foreach ($dirName in $excludeTopLevelDirs) {
        if ($relativePath -match "^(?:$([Regex]::Escape($dirName)))(\\|$)") {
            $hasExcludedPath = $true
            break
        }
    }

    if (-not $hasExcludedPath) {
        foreach ($prefix in $excludeRelativePrefixes) {
            if ($relativePath -like "$prefix*") {
                $hasExcludedPath = $true
                break
            }
        }
    }

    if ($hasExcludedPath) { return $false }
    if ($excludeFileNames -contains $_.Name) { return $false }

    return $true
}

if (-not $filesToZip -or $filesToZip.Count -eq 0) {
    throw "No files found to package from $webRoot"
}

$relativePaths = $filesToZip | ForEach-Object {
    $_.FullName.Substring($webRoot.Path.Length + 1)
}

$stagingDir = Join-Path $resolvedOutputDir ("staging-{0}" -f $timestamp)
New-Item -ItemType Directory -Path $stagingDir | Out-Null

try {
    foreach ($relativePath in $relativePaths) {
        $sourcePath = Join-Path $webRoot $relativePath
        $destinationPath = Join-Path $stagingDir $relativePath
        $destinationFolder = Split-Path -Parent $destinationPath

        if (-not (Test-Path $destinationFolder)) {
            New-Item -ItemType Directory -Path $destinationFolder -Force | Out-Null
        }

        Copy-Item -Path $sourcePath -Destination $destinationPath -Force
    }

    if (Test-Path $zipPath) {
        Remove-Item -Path $zipPath -Force
    }

    Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $zipPath -CompressionLevel Optimal

    Write-Host "Deploy zip created: $zipPath" -ForegroundColor Green
    Write-Host "Included files: $($relativePaths.Count)" -ForegroundColor Cyan
}
finally {
    if (Test-Path $stagingDir) {
        Remove-Item -Path $stagingDir -Recurse -Force
    }
}
