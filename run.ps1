# Start the Drawing Teacher backend + frontend (run from the repo root).
# Assumes backend\venv exists and frontend\node_modules is installed.
$here = $PSScriptRoot
Start-Process pwsh -ArgumentList '-NoExit','-Command',"Set-Location '$here\backend'; .\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000"
Start-Process pwsh -ArgumentList '-NoExit','-Command',"Set-Location '$here\frontend'; npx expo start"
