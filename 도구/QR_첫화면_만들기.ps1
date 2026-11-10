# 발표 시험용 「앱 첫 화면」 QR 그림을 만든다 (2026-11-11 사용자)
#   QR 내용 = https://minjong0910.github.io/ (출입문 QR 처럼 ?gate= 가 없다 — 찍으면 앱 첫 화면, 출발 문은 정하지 않음)
#   도구\QR_첫화면.html 을 Edge 헤드리스로 열어 그림을 받고, 앱의 QR 읽기(jsQR)로 원래 크기 · 1/4 크기 두 번 다시 읽어
#   주소가 그대로이고 출입문 QR 로 읽히지 않을 때만 저장한다 → QR인쇄\앱첫화면_QR.png + 바탕화면 「앱 첫 화면 QR (발표 시험용).png」
#   미리보기 서버(8080)가 켜져 있어야 한다.   사용법 : pwsh -File 도구\QR_첫화면_만들기.ps1
param([int]$Port = 8080)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ROOT = Split-Path $PSScriptRoot -Parent
$OUT  = Join-Path $ROOT 'QR인쇄\앱첫화면_QR.png'
$DESK = Join-Path ([Environment]::GetFolderPath('Desktop')) '앱 첫 화면 QR (발표 시험용).png'
$EDGE = if($env:B3NAV_BROWSER){ $env:B3NAV_BROWSER } else { 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' }
$page = "http://localhost:$Port/" + [uri]::EscapeDataString('도구') + '/' + [uri]::EscapeDataString('QR_첫화면.html')
$prof = Join-Path $env:TEMP ('b3nav_qrh_' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$dom = & $EDGE --headless=new --disable-gpu --no-first-run "--user-data-dir=$prof" --virtual-time-budget=20000 --dump-dom $page 2>$null | Out-String
$raw = [regex]::Match($dom, '(?s)<pre id="R">(.*?)</pre>').Groups[1].Value.Replace('&lt;','<').Replace('&gt;','>').Replace('&quot;','"').Replace('&amp;','&')
$res = $null; try { $res = $raw | ConvertFrom-Json } catch {}
try { Remove-Item $prof -Recurse -Force -ErrorAction Stop } catch {}
if(-not $res -or -not $res.data){ Write-Host "  결과를 읽지 못했습니다 — 미리보기 서버가 켜져 있나요?" -ForegroundColor Red; exit 2 }
Write-Host ("  {0} 주소 {1} · 버전 {2} · 오류정정 {3} · 다시 읽음 {4} · 1/4 크기 {5} · 출입문으로 읽힘 {6}" -f $(if($res.ok){ '✓' } else { '✗' }), $res.url, $res.version, $res.level, $res.read, $res.readSmall, $(if($res.gate){ $res.gate } else { '아니요' }))
if(-not $res.ok){ Write-Host '  다시 읽기가 맞지 않아 저장하지 않았습니다' -ForegroundColor Red; exit 1 }
$bytes = [Convert]::FromBase64String($res.data.Substring($res.data.IndexOf(',') + 1))
New-Item -ItemType Directory -Force -Path (Split-Path $OUT) | Out-Null
[IO.File]::WriteAllBytes($OUT, $bytes); [IO.File]::WriteAllBytes($DESK, $bytes)
Write-Host ("  저장 : {0} ({1:N0} KB)`n  바탕화면 : {2}" -f $OUT, ($bytes.Length / 1KB), $DESK) -ForegroundColor Green
