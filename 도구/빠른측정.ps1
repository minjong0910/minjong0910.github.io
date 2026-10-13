# 빠른 측정 — 발표 중에 한 번 눌러 쓰는 것
#
#   바탕화면 「빠른측정」 바로가기가 이 파일을 부른다.
#   미리보기 서버가 꺼져 있으면 켜고, 측정 화면을 열면서 7초 측정을 바로 시작한다.
#
# ※ 왜 .bat 이 아니라 .ps1 인가 (2026-10-14)
#   처음에는 .bat 으로 만들었는데 바탕화면에서 누르면 탐색기만 떴다.
#   원인이 둘이었다.
#     ① .bat 을 UTF-8 로 저장했다 — cmd.exe 는 배치 파일을 콘솔 코드페이지로 읽어서
#        한글 주석이 토막 난 명령으로 실행됐다. ('하면' is not recognized …)
#     ② cp949 로 다시 써도, 맨 위의 chcp 65001 때문에 한글 경로 리터럴(D:\군산대)이
#        다시 깨졌다. .bat 안에 한글을 두는 한 빠져나올 수 없는 고리다.
#   그래서 한글이 들어가는 부분을 전부 PowerShell 로 옮겼다 — 여기는 유니코드가 안전하다.
#   바탕화면에는 .bat 대신 바로가기(.lnk)를 둔다. 바로가기는 경로를 유니코드로 담는다.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$ROOT = Split-Path $PSScriptRoot -Parent
$URL  = 'http://localhost:8080/site/eval_all.html?auto=fast'

function Alive { try { (New-Object Net.Sockets.TcpClient('localhost', 8080)).Close(); $true } catch { $false } }

if(-not (Test-Path (Join-Path $ROOT 'preview.ps1'))){
  Write-Host "[!] preview.ps1 을 찾지 못했습니다 : $ROOT" -ForegroundColor Red
  Write-Host "    이 파일은 저장소의 도구\ 폴더 안에 있어야 합니다." -ForegroundColor Red
  Read-Host "엔터를 누르면 닫습니다"; exit 1
}

if(Alive){
  Write-Host "미리보기 서버가 이미 켜져 있습니다." -ForegroundColor DarkGray
} else {
  Write-Host "미리보기 서버를 켭니다..." -ForegroundColor Cyan
  # preview.ps1 은 반드시 pwsh(7)로 — powershell.exe(5.1)는 BOM 없는 한글 스크립트를 깨뜨린다
  $pwsh = (Get-Command pwsh -ErrorAction SilentlyContinue)
  if(-not $pwsh){
    Write-Host "[!] pwsh(PowerShell 7)가 없습니다. 미리보기_실행.bat 을 먼저 켜 주세요." -ForegroundColor Red
    Read-Host "엔터를 누르면 닫습니다"; exit 1
  }
  Start-Process $pwsh.Source -ArgumentList '-NoProfile','-File',(Join-Path $ROOT 'preview.ps1') `
                -WorkingDirectory $ROOT -WindowStyle Minimized
  $ok = $false
  foreach($i in 1..20){ Start-Sleep -Milliseconds 700; if(Alive){ $ok = $true; break } }
  if(-not $ok){
    Write-Host "[!] 서버가 켜지지 않았습니다." -ForegroundColor Red
    Read-Host "엔터를 누르면 닫습니다"; exit 1
  }
}

Write-Host "측정 화면을 엽니다 — 7초 뒤에 결과가 나옵니다." -ForegroundColor Green
Start-Process $URL
Start-Sleep 2
