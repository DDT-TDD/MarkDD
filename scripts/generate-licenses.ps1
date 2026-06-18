<#
generate-licenses.ps1

Creates a consolidated HTML file `licenses/LICENSES.html` and a zip archive `licenses/licenses.zip`
containing the main `LICENSE`, `THIRD-PARTY-LICENSES.md`, and all files under `third_party/*/LICENSE`.

Usage (PowerShell):
  ./scripts/generate-licenses.ps1
#>

Param()
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
# Repository root is the parent of the scripts directory
$root = Split-Path -Parent $scriptDir
Set-Location $root

$outDir = Join-Path $root 'licenses'
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir | Out-Null

function Html-Escape([string]$s) {
    if ($null -eq $s) { return '' }
    $s = $s -replace '&','&amp;'
    $s = $s -replace '<','&lt;'
    $s = $s -replace '>','&gt;'
    $s = $s -replace '"','&quot;'
    return $s
}

function Add-Section($title, $content) {
    return "<h2>" + (Html-Escape $title) + "</h2>`n<pre>" + (Html-Escape $content) + "</pre>`n"
}

$html = @()
$html += "<html><head><meta charset='utf-8'><title>Consolidated Licenses</title></head><body>"
$html += "<h1>Consolidated Licenses for MarkDD Editor</h1>`n"

# Add main LICENSE
if (Test-Path (Join-Path $root 'LICENSE')) {
    $lic = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'LICENSE')
    $html += Add-Section -title 'Project LICENSE (MIT)' -content $lic
}

# Add THIRD-PARTY-LICENSES.md
if (Test-Path (Join-Path $root 'THIRD-PARTY-LICENSES.md')) {
    $tpl = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'THIRD-PARTY-LICENSES.md')
    $html += Add-Section -title 'THIRD-PARTY-LICENSES.md' -content $tpl
}

# Add vendored third_party licenses
$tp = Join-Path $root 'third_party'
if (Test-Path $tp) {
    Get-ChildItem -Path $tp -Directory | ForEach-Object {
        $pkgName = $_.Name
        $licPath = Join-Path $_ 'LICENSE'
        if (Test-Path $licPath) {
            $content = Get-Content -Raw -Encoding UTF8 $licPath
            $html += Add-Section -title "third_party/$pkgName/LICENSE" -content $content
        }
    }
}

$html += "</body></html>"

$outHtml = Join-Path $outDir 'LICENSES.html'
[System.IO.File]::WriteAllText($outHtml, ($html -join "`n"), [System.Text.Encoding]::UTF8)

# Create a zip archive of the LICENSES.html and included LICENSE files
$zipPath = Join-Path $outDir 'licenses.zip'
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$temp = Join-Path $outDir 'temp_for_zip'
New-Item -ItemType Directory -Path $temp | Out-Null
Copy-Item -Path $outHtml -Destination $temp
if (Test-Path $tp) { Copy-Item -Path (Join-Path $tp '*\LICENSE') -Destination $temp -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path (Join-Path $root 'THIRD-PARTY-LICENSES.md')) { Copy-Item -Path (Join-Path $root 'THIRD-PARTY-LICENSES.md') -Destination $temp -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($temp, $zipPath)

Remove-Item -Path $temp -Recurse -Force

Write-Host "Created: $outHtml"
Write-Host "Created: $zipPath"
