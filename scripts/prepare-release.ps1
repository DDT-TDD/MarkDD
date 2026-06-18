<#
prepare-release.ps1

Creates a `release/` directory and copies the minimal set of files required for packaging based on `package.json` build.files and extraFiles entries.

Usage (PowerShell):
  ./scripts/prepare-release.ps1
#>

Param()

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
# Repository root is parent of the scripts directory
$root = Split-Path -Parent $scriptDir
Set-Location $root

Write-Host "Preparing release directory..."

$pkg = Get-Content -Raw -Encoding UTF8 "package.json" | ConvertFrom-Json

$releaseDir = Join-Path $root 'release'
if (Test-Path $releaseDir) { Remove-Item $releaseDir -Recurse -Force }
New-Item -ItemType Directory -Path $releaseDir | Out-Null

function Copy-Glob([string]$pattern, [string]$destRoot) {
    # Normalize pattern to full path so Get-ChildItem interprets it relative to repo root
    $fullPattern = Join-Path $root $pattern
    $matches = Get-ChildItem -Path $fullPattern -Recurse -File -ErrorAction SilentlyContinue
    foreach ($m in $matches) {
        $rel = $m.FullName.Substring($root.Length).TrimStart('\','/')
        $target = Join-Path $destRoot $rel
        $tdir = Split-Path $target -Parent
        if (!(Test-Path $tdir)) { New-Item -ItemType Directory -Path $tdir | Out-Null }
        Copy-Item -Path $m.FullName -Destination $target -Force
    }
}

# Copy files globs from build.files in package.json. If files is absent, fall back to default list.
$files = @()
if ($pkg.build -and $pkg.build.files) {
    $files = $pkg.build.files
} else {
    $files = @('src/**/*','assets/**/*','*.md')
}

foreach ($f in $files) {
    Write-Host "Processing pattern: $f"
    try {
        # Treat node_modules specially: do not copy entire node_modules tree from repo
        if ($f -match 'node_modules') {
            Write-Host "Skipping direct node_modules copy; will install production deps in release/ instead."
            continue
        }

        if ($f -like '*[*?]*' -or $f -like '*/*') {
            Copy-Glob -pattern $f -destRoot $releaseDir
        } else {
            # simple file or directory
            $full = Join-Path $root $f
            if (Test-Path $full) {
                $rel = $full.Substring($root.Length).TrimStart('\','/')
                $target = Join-Path $releaseDir $rel
                $tdir = Split-Path $target -Parent
                if (!(Test-Path $tdir)) { New-Item -ItemType Directory -Path $tdir | Out-Null }
                Copy-Item -Path $full -Destination $target -Recurse -Force
            } else {
                Write-Host "Skipping missing path: $f"
            }
        }
    } catch {
        Write-Warning "Failed to process pattern '$f': $_"
    }
}

# Copy extraFiles as configured in build.extraFiles (handles simple from->to mappings)
if ($pkg.build -and $pkg.build.extraFiles) {
    foreach ($ef in $pkg.build.extraFiles) {
        if ($ef.from) {
            $from = $ef.from
            $to = if ($ef.to) { $ef.to } else { Split-Path $from -Leaf }
            $fullFrom = Join-Path $root $from
            $dest = Join-Path $releaseDir $to
            $tdir = Split-Path $dest -Parent
            if (!(Test-Path $tdir)) { New-Item -ItemType Directory -Path $tdir | Out-Null }
            if (Test-Path $fullFrom) { Copy-Item -Path $fullFrom -Destination $dest -Recurse -Force }
        }
    }
}

# Create minimal production node_modules inside release: copy package.json and package-lock.json then run npm ci --production
Write-Host "Preparing production dependencies inside release..."
Copy-Item -Path (Join-Path $root 'package.json') -Destination (Join-Path $releaseDir 'package.json') -Force
if (Test-Path (Join-Path $root 'package-lock.json')) {
    Copy-Item -Path (Join-Path $root 'package-lock.json') -Destination (Join-Path $releaseDir 'package-lock.json') -Force
}

# If npm is available, run npm ci --production inside release to create a minimal node_modules
try {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($npm) {
        Write-Host "Running safe 'npm ci' in release/ (will skip lifecycle scripts)..."
        Push-Location $releaseDir

        # Determine npm version to choose compatible flags
        $npmVersion = (& npm --version) -as [string]
        Write-Host "Detected npm version: $npmVersion"

        # Default args: prefer --ignore-scripts to skip lifecycle scripts
        $args = @('ci','--production','--ignore-scripts')

        # Older npm versions may not support --ignore-scripts with ci; if ci fails, fallback to install.
        try {
            & npm @args
        } catch {
            Write-Warning "'npm ci --ignore-scripts' failed, retrying with 'npm install --production --ignore-scripts'..."
            try {
                & npm 'install','--production','--ignore-scripts'
            } catch {
                Write-Warning "Production install with ignored scripts failed: $_\nThe release/ folder will contain package.json only."
            }
        }

        Pop-Location
    } else {
        Write-Host "npm not found in PATH; skipping production install. The release/ will contain package.json only."
    }
} catch {
    Write-Warning "npm install step failed: $_"
}

Write-Host "Release directory prepared at: $releaseDir"
