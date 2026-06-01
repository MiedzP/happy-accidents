# Setup and start the Drawing Teacher backend
Set-Location $PSScriptRoot

# Create .env from example if it doesn't exist
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ""
    Write-Host "ACTION REQUIRED: Open drawing-teacher-api\.env and add your API keys!" -ForegroundColor Yellow
    Write-Host "  ANTHROPIC_API_KEY = get yours at console.anthropic.com" -ForegroundColor Cyan
    Write-Host "  OPENAI_API_KEY    = optional, enables step images (platform.openai.com)" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter after you've added your keys"
}

# Create and activate virtual environment
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Green
    python -m venv venv
}

Write-Host "Installing dependencies..." -ForegroundColor Green
& .\venv\Scripts\pip install -r requirements.txt -q

Write-Host ""
Write-Host "Starting server at http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

& .\venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8000
