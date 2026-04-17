# Build and zip a deployment bundle for the Pi 5.
#
# Output: deploy\toolaccess-Kiosk-<version>.zip
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File UserPortal\deploy\bundle.ps1
#
# Requires: flutter (on PATH)
#
param(
    [switch]$SkipFlutter  # Pass -SkipFlutter to reuse an existing flutter_assets build
)

$ErrorActionPreference = 'Stop'

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$PortalDir  = Split-Path -Parent $ScriptDir
try   { $Version = (Get-Content (Join-Path $PortalDir 'package.json') | ConvertFrom-Json).version }
catch { $Version = $null }
if (-not $Version) { $Version = '0.0.0' }
$OutZip     = Join-Path $ScriptDir "toolaccess-kiosk-$Version.zip"
$Staging    = Join-Path $env:TEMP "toolaccess-kiosk-bundle-$PID"

Write-Host "=== ToolAccess Kiosk bundle v$Version ===" -ForegroundColor Cyan

flutter --version

# --- 1. Build Flutter asset bundle ---
if (-not $SkipFlutter) {
    Write-Host "[1/3] Building Flutter bundle..." -ForegroundColor Cyan
    Push-Location (Join-Path $PortalDir 'flutter_ui')
    flutter build bundle
    if ($LASTEXITCODE -ne 0) { throw "flutter build bundle failed" }
    Pop-Location
} else {
    Write-Host "[1/3] Skipping Flutter build (-SkipFlutter)" -ForegroundColor Yellow
}

$FlutterAssets = Join-Path $PortalDir 'flutter_ui\build\flutter_assets'
if (-not (Test-Path $FlutterAssets)) {
    throw "flutter_assets not found at $FlutterAssets. Run without -SkipFlutter first."
}

# --- 2. Stage files ---
Write-Host "[2/3] Staging files..." -ForegroundColor Cyan

$StagePortal = Join-Path $Staging 'UserPortal'
New-Item -ItemType Directory -Path $StagePortal -Force | Out-Null

# Server code
Copy-Item (Join-Path $PortalDir 'electron')          (Join-Path $StagePortal 'electron')          -Recurse
Copy-Item (Join-Path $PortalDir 'package.json')      (Join-Path $StagePortal 'package.json')
Copy-Item (Join-Path $PortalDir 'requirements.txt')  (Join-Path $StagePortal 'requirements.txt')

# Flutter assets
Copy-Item $FlutterAssets (Join-Path $StagePortal 'flutter_assets') -Recurse

# Deploy scripts/services (exclude bundle.ps1 itself — not needed on Pi)
$StageDeployDir = Join-Path $StagePortal 'deploy'
Copy-Item (Join-Path $PortalDir 'deploy') $StageDeployDir -Recurse -Exclude 'bundle.ps1', '*.zip'

# --- 3. Zip ---
Write-Host "[3/3] Creating $OutZip ..." -ForegroundColor Cyan

if (Test-Path $OutZip) { Remove-Item $OutZip }
Compress-Archive -Path (Join-Path $Staging 'UserPortal') -DestinationPath $OutZip

# Cleanup staging
Remove-Item $Staging -Recurse -Force

Write-Host ""
Write-Host "Bundle ready: $OutZip" -ForegroundColor Green
Write-Host "Copy to Pi and run: sudo bash UserPortal/deploy/install.sh"
