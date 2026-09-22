@echo off
chcp 65001 >nul
rem 앱(site\)을 고친 뒤 올리기 전에 — 파일 검사 + 브라우저 검사 (약 1분)
rem 미리보기_실행.bat 을 먼저 켜 두세요. 로드뷰까지 보려면 : pwsh -File 검사.ps1 -Full
pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0검사.ps1"
echo.
pause
