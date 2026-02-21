# Two-step dev for Windows - run in two separate terminals if pnpm dev fails
# Terminal 1: .\scripts\dev-windows.ps1 web
# Terminal 2: .\scripts\dev-windows.ps1 electron

param([Parameter(Mandatory=$true)][ValidateSet("web","electron")]$Step)

$ErrorActionPreference = "Stop"

if ($Step -eq "web") {
  Write-Host "[Step 1/2] Starting web dev server on http://localhost:5173" -ForegroundColor Cyan
  Write-Host "Keep this terminal open. When you see 'Local: http://localhost:5173', open a NEW terminal and run:" -ForegroundColor Yellow
  Write-Host "  pnpm -F @accomplish/desktop dev:fast" -ForegroundColor Green
  Write-Host ""
  pnpm -F @accomplish/web dev
} else {
  Write-Host "[Step 2/2] Starting Electron (ensure web server is running on :5173)" -ForegroundColor Cyan
  $env:ACCOMPLISH_ROUTER_URL = "http://localhost:5173"
  pnpm -F @accomplish/desktop dev:fast
}
