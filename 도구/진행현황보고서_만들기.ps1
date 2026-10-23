# 졸업작품 진행현황 보고서 PDF 만들기 (지도교수님께 드리는 A4)
#   2026-10-24 사용자 : 「졸업작품 진행현황 보고 — 지금까지 한 일 · 개발 현황 · 성능 개선 · 부품 구매 현황 · 남은 일정.
#                       실제 우리 앱을 기반으로, 최신 기록으로. PDF 로」 · 보고 받는 분 : 지도교수님 · 완성 목표 11/11
#   원본 문서\진행현황_보고서.html 의 그림(img/s04 …)은 도구\발표그림\ppt\ 의 앱 화면을 복사해 넣는다.
#
#   pwsh -File 도구\진행현황보고서_만들기.ps1 [-Desktop]   → 생성물\보고\졸업작품_진행현황_보고서.pdf
#
#   ※ Edge 헤드리스는 한글 경로를 주면 실패한다 — %TEMP% 아래 영문 경로에서 만든 뒤 옮긴다.
param([switch]$Desktop)
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$SRC  = Join-Path $ROOT '문서\진행현황_보고서.html'
$IMG  = Join-Path $PSScriptRoot '발표그림\ppt'
$OUTD = Join-Path $ROOT '생성물\보고'
$OUT  = Join-Path $OUTD '졸업작품_진행현황_보고서.pdf'
$EDGE = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$TMP  = Join-Path $env:TEMP 'b3nav_report'
New-Item -ItemType Directory -Force -Path (Join-Path $TMP 'img'), $OUTD | Out-Null

$shots = [ordered]@{ 's04' = '화면04_쉬운모드_말풍선.jpg'; 's20' = '화면20_이어하기.jpg'; 's15' = '화면15_밝은화면.jpg'; 's14' = '화면14_메뉴.jpg'; 's17' = '화면17_건의함.jpg' }
foreach($k in $shots.Keys){ Copy-Item (Join-Path $IMG $shots[$k]) (Join-Path $TMP ("img\{0}.jpg" -f $k)) -Force }

$tmpHtml = Join-Path $TMP 'report.html'
$tmpPdf  = Join-Path $TMP 'report.pdf'
Copy-Item $SRC $tmpHtml -Force
if(Test-Path $tmpPdf){ Remove-Item $tmpPdf -Force }
$prof = Join-Path $TMP 'profile'
$uri  = 'file:///' + ($tmpHtml -replace '\\','/')
& $EDGE --headless=new --disable-gpu --no-first-run "--user-data-dir=$prof" --no-pdf-header-footer `
        --virtual-time-budget=8000 "--print-to-pdf=$tmpPdf" $uri 2>$null | Out-Null
Start-Sleep -Milliseconds 500
if(-not (Test-Path $tmpPdf)){ throw 'PDF 가 만들어지지 않았습니다' }
Copy-Item $tmpPdf $OUT -Force
Remove-Item $prof -Recurse -Force -ErrorAction SilentlyContinue
Write-Host ("PDF : {0}  ({1} KB)" -f $OUT, [math]::Round((Get-Item $OUT).Length / 1KB))
if($Desktop){
  $dk = Join-Path ([Environment]::GetFolderPath('Desktop')) '졸업작품_진행현황_보고서.pdf'
  Copy-Item $OUT $dk -Force
  Write-Host ('바탕화면에도 놓음 : ' + $dk)
}
