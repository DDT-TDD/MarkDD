# Prepare production Node.js resources for Tauri 2.0 bundle
# This script is called automatically by tauri.conf.json beforeBuildCommand
# and can also be run manually before 'cargo tauri build'.
#
# Layout produced:
#   src-tauri/resources/
#     src/          <- copy of src/ (renderer + main + common)
#     package.json  <- root package.json (version source of truth)
#     node_modules/ <- production-only deps (no Electron, no electron-builder)
$ErrorActionPreference = "Stop"

# Resolve workspace root relative to this script's location regardless of CWD
$workspaceRoot = (Resolve-Path "$PSScriptRoot\..").Path
$resourcesDir  = "$workspaceRoot\resources"

Write-Host "[prepare-resources] Workspace root : $workspaceRoot"
Write-Host "[prepare-resources] Resources dir  : $resourcesDir"

# ── Clean previous build ──────────────────────────────────────────────────────
if (Test-Path $resourcesDir) {
    Write-Host "[prepare-resources] Removing old resources directory..."
    Remove-Item $resourcesDir -Recurse -Force
}
New-Item -ItemType Directory -Path $resourcesDir -Force | Out-Null

# ── Copy source code ──────────────────────────────────────────────────────────
Write-Host "[prepare-resources] Copying src/..."
Copy-Item "$workspaceRoot\src" "$resourcesDir\src" -Recurse -Force

# ── Copy examples ─────────────────────────────────────────────────────────────
if (Test-Path "$workspaceRoot\examples") {
    Write-Host "[prepare-resources] Copying examples/..."
    Copy-Item "$workspaceRoot\examples" "$resourcesDir\examples" -Recurse -Force
}

# ── Copy package.json (single version source of truth) ───────────────────────
Write-Host "[prepare-resources] Copying package.json..."
Copy-Item "$workspaceRoot\package.json" "$resourcesDir\" -Force

# ── Install production dependencies ──────────────────────────────────────────
Write-Host "[prepare-resources] Installing production dependencies..."

# Skip Puppeteer's heavy browser download — the backend uses findSystemBrowser()
$env:PUPPETEER_SKIP_DOWNLOAD = "true"
$env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "true"

# --omit=dev   : exclude devDependencies (electron, electron-builder, etc.)
# --ignore-scripts : skip postinstall hooks (prevents electron rebuild attempts)
# --prefix     : install into resources dir so node_modules lands there
cmd.exe /c "npm install --omit=dev --ignore-scripts --prefix `"$resourcesDir`""
if ($LASTEXITCODE -ne 0) {
    Write-Error "[prepare-resources] npm install failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

# Clean up the lockfile npm creates in the resources dir
$lockFile = "$resourcesDir\package-lock.json"
if (Test-Path $lockFile) { Remove-Item $lockFile -Force }

# Clean environment
$env:PUPPETEER_SKIP_DOWNLOAD = $null
$env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = $null

Write-Host "[prepare-resources] Done. Resources ready at: $resourcesDir"
