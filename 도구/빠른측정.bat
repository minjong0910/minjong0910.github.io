@echo off
chcp 65001 >nul
title 빠른 측정 — 공대 3호관 길안내

rem ══════════════════════════════════════════════════════════════
rem  발표 중에 더블클릭 한 번으로 측정을 돌려 보이려고 둔 것.
rem    · 미리보기 서버가 꺼져 있으면 켜고
rem    · 브라우저에 측정 페이지를 열면서 곧바로 빠른 측정(7초)을 시작한다
rem
rem  ※ preview.ps1 은 반드시 pwsh(7)로 돌린다.
rem    powershell.exe(5.1)는 UTF-8 BOM 없는 한글 스크립트를 깨뜨린다 — 실제로 당했다.
rem  ※ 전체 측정(152초)이 필요하면 열린 화면에서 [전체 측정 시작] 을 누른다.
rem ══════════════════════════════════════════════════════════════

set ROOT=%~dp0..
set URL=http://localhost:8080/eval_all.html?auto=fast

rem 서버가 이미 떠 있나
powershell -NoProfile -Command "try{ (New-Object Net.Sockets.TcpClient('localhost',8080)).Close(); exit 0 }catch{ exit 1 }" >nul 2>&1
if %errorlevel%==0 (
  echo 미리보기 서버가 이미 켜져 있습니다.
  goto open
)

echo 미리보기 서버를 켭니다...
where pwsh >nul 2>&1
if %errorlevel%==0 (
  start "" /min pwsh -NoProfile -File "%ROOT%\preview.ps1"
) else (
  echo [!] pwsh(PowerShell 7)를 찾지 못했습니다. 미리보기_실행.bat 을 먼저 켜 주세요.
  pause
  exit /b 1
)

rem 켜질 때까지 최대 15초 기다린다
for /l %%i in (1,1,15) do (
  powershell -NoProfile -Command "try{ (New-Object Net.Sockets.TcpClient('localhost',8080)).Close(); exit 0 }catch{ exit 1 }" >nul 2>&1
  if not errorlevel 1 goto open
  timeout /t 1 /nobreak >nul
)
echo [!] 서버가 켜지지 않았습니다.
pause
exit /b 1

:open
echo 측정 페이지를 엽니다 — 7초 뒤에 결과가 나옵니다.
start "" "%URL%"
exit /b 0
