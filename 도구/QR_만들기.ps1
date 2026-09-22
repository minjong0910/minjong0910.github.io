# 출입문 QR 인쇄용 그림을 만든다 — QR인쇄\ 에 4장(정문·후문·동문·서문) + A4 인쇄용 PDF
#
#   도구\QR_만들기.html 을 Edge 헤드리스로 열어 그림을 받고, 앱의 QR 읽기(jsQR)로 다시 읽어 맞는지 확인한 뒤 저장한다.
#   QR 내용은 앱의 QRNAV.payload() 그대로 — https://minjong0910.github.io/?gate=MAIN (BACK · EAST · WEST)
#   사이트 주소가 바뀌면 site\js\app\qrnav.js 의 SITE_URL 을 고치고 이것을 다시 돌려 새로 인쇄해야 한다.
#
#   미리보기 서버(미리보기_실행.bat, 8080)가 켜져 있어야 한다.
#   사용법 : pwsh -File 도구\QR_만들기.ps1
param([int]$Port = 8080)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ROOT = Split-Path $PSScriptRoot -Parent
$OUT  = Join-Path $ROOT 'QR인쇄'
$EDGE = if($env:B3NAV_BROWSER){ $env:B3NAV_BROWSER } else { 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' }
$page = "http://localhost:$Port/" + [uri]::EscapeDataString('도구') + '/' + [uri]::EscapeDataString('QR_만들기.html')

$prof = Join-Path $env:TEMP ('b3nav_qr_' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$dom = & $EDGE --headless=new --disable-gpu --no-first-run "--user-data-dir=$prof" --virtual-time-budget=20000 --dump-dom $page 2>$null | Out-String
$raw = [regex]::Match($dom, '(?s)<pre id="R">(.*?)</pre>').Groups[1].Value.Replace('&lt;','<').Replace('&gt;','>').Replace('&quot;','"').Replace('&amp;','&')
$res = $null; try { $res = $raw | ConvertFrom-Json } catch {}
if(-not $res -or -not $res.files){ Write-Host "  결과를 읽지 못했습니다 — 미리보기 서버가 켜져 있나요? : $($raw.Substring(0, [Math]::Min(200, $raw.Length)))" -ForegroundColor Red; exit 2 }
foreach($c in $res.checks){
  $mark = if($c.ok){ '✓' } else { '✗' }
  Write-Host ("  {0} {1,-5} 버전 {2} · 오류정정 {3} · 다시 읽음 : {4}" -f $mark, $c.key, $c.version, $c.level, $c.read)
}
if(-not $res.ok){ Write-Host '  다시 읽기가 맞지 않아 저장하지 않았습니다' -ForegroundColor Red; exit 1 }

if(-not (Test-Path $OUT)){ New-Item -ItemType Directory -Force -Path $OUT | Out-Null }
foreach($f in $res.files){
  $b64 = $f.data.Substring($f.data.IndexOf(',') + 1)
  [IO.File]::WriteAllBytes((Join-Path $OUT $f.name), [Convert]::FromBase64String($b64))
  Write-Host ("  저장 : QR인쇄\{0}  ({1:N0} KB)" -f $f.name, ((Get-Item (Join-Path $OUT $f.name)).Length / 1KB))
}

# A4 인쇄용 PDF — 스티커가 실제 크기(90×120mm)로 찍힌다. Edge 는 한글 경로에 PDF 를 못 쓰니 TEMP 에 쓰고 옮긴다
$tmp = Join-Path $env:TEMP ('b3nav_qr_' + [guid]::NewGuid().ToString('N').Substring(0, 8) + '.pdf')
& $EDGE --headless=new --disable-gpu --no-first-run "--user-data-dir=$prof" --virtual-time-budget=20000 --no-pdf-header-footer "--print-to-pdf=$tmp" ($page + '?pdf=1') 2>$null | Out-Null
if(Test-Path $tmp){
  Move-Item -Force $tmp (Join-Path $OUT '출입문QR_4장_A4.pdf')
  Write-Host ("  저장 : QR인쇄\출입문QR_4장_A4.pdf  ({0:N0} KB)" -f ((Get-Item (Join-Path $OUT '출입문QR_4장_A4.pdf')).Length / 1KB))
} else { Write-Host '  A4 PDF 는 만들지 못했습니다 (그림 4장은 저장됨)' -ForegroundColor Yellow }
try { Remove-Item -Recurse -Force $prof } catch {}
Write-Host '  완료' -ForegroundColor Green
