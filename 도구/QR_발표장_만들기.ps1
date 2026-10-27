# 발표장 QR 그림을 만든다 — 도구\발표그림\최종\QR_발표장.png (발표 자료 20쪽에 들어감)
#
#   도구\QR_발표장.html 을 Edge 헤드리스로 열어 그림을 받고, 앱의 QR 읽기(jsQR)로 다시 읽어 주소가 맞을 때만 저장한다.
#   QR 내용 : https://minjong0910.github.io/live/go.html — 찍으면 숫자를 1 올리고 앱(동문에서 시작)으로 넘어간다(site\live\go.html).
#   미리보기 서버(미리보기_실행.bat, 8080)가 켜져 있어야 한다.
#   사용법 : pwsh -File 도구\QR_발표장_만들기.ps1 [-Ev 이름]
param([int]$Port = 8080, [string]$Ev = 'grad')
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$OUT  = Join-Path $PSScriptRoot '발표그림\최종\QR_발표장.png'
$EDGE = if($env:B3NAV_BROWSER){ $env:B3NAV_BROWSER } else { 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' }
$page = "http://localhost:$Port/" + [uri]::EscapeDataString('도구') + '/' + [uri]::EscapeDataString('QR_발표장.html') + $(if($Ev -ne 'grad'){ '?e=' + $Ev } else { '' })
$prof = Join-Path $env:TEMP ('b3nav_qrl_' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$dom = & $EDGE --headless=new --disable-gpu --no-first-run "--user-data-dir=$prof" --virtual-time-budget=20000 --dump-dom $page 2>$null | Out-String
$raw = [regex]::Match($dom, '(?s)<pre id="R">(.*?)</pre>').Groups[1].Value.Replace('&lt;','<').Replace('&gt;','>').Replace('&quot;','"').Replace('&amp;','&')
$res = $null; try { $res = $raw | ConvertFrom-Json } catch {}
try { Remove-Item $prof -Recurse -Force -ErrorAction Stop } catch {}
if(-not $res -or -not $res.data){ Write-Host "  결과를 읽지 못했습니다 — 미리보기 서버가 켜져 있나요?" -ForegroundColor Red; exit 2 }
Write-Host ("  {0} 주소 {1} · 버전 {2} · 다시 읽음 {3} · 작게 {4}" -f $(if($res.ok){ '✓' } else { '✗' }), $res.url, $res.version, $res.read, $res.readSmall)
if(-not $res.ok){ Write-Host '  다시 읽기가 맞지 않아 저장하지 않았습니다' -ForegroundColor Red; exit 1 }
[IO.File]::WriteAllBytes($OUT, [Convert]::FromBase64String($res.data.Substring($res.data.IndexOf(',') + 1)))
Write-Host ("  저장 : {0} ({1:N0} KB)" -f $OUT, ((Get-Item $OUT).Length / 1KB))
