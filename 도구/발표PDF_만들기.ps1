# 중간 발표 PDF 만들기
#   발표_중간발표.html 에 측정 JSON(생성물\eval_all.json · eval_ablation.json)을 넣고 Edge 로 PDF 를 뽑는다.
#   표와 차트는 JSON 에서 그대로 그리므로, 측정을 다시 하면 이 스크립트만 다시 돌리면 된다.
#
#   pwsh -File 도구\발표PDF_만들기.ps1
#
#   ※ Edge 헤드리스는 한글 경로를 주면 실패한다 — %TEMP% 아래 영문 경로에서 만든 뒤 옮긴다.
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$SRC  = Join-Path $ROOT '발표_중간발표.html'
$OUT  = Join-Path $ROOT '졸업작품_중간발표_자료.pdf'
$EDGE = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$TMP  = Join-Path $env:TEMP 'b3nav_pdf'
New-Item -ItemType Directory -Force -Path $TMP | Out-Null

$all = Get-Content (Join-Path $ROOT '생성물\eval_all.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$abl = Get-Content (Join-Path $ROOT '생성물\eval_ablation.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$d = [ordered]@{
  kind = $all.종류별; two = $all.두장; conf = $all.혼동; sidecuts = $all.좌우구간
  sel  = [ordered]@{ g = $all.확신도.차이.pts; s1 = $all.확신도.일등점수.pts }
  ci   = $all.신뢰구간
  abl  = $abl.결과; pair = $abl.짝비교; rep = $abl.재현
}
$json = $d | ConvertTo-Json -Depth 8 -Compress

$html = [System.IO.File]::ReadAllText($SRC, [System.Text.Encoding]::UTF8)
if(([regex]::Matches($html, [regex]::Escape('/*DATA*/null'))).Count -ne 1){ throw 'DATA 자리를 찾지 못함' }
$html = $html.Replace('/*DATA*/null', $json)
$tmpHtml = Join-Path $TMP 'doc.html'
$tmpPdf  = Join-Path $TMP 'doc.pdf'
[System.IO.File]::WriteAllText($tmpHtml, $html, (New-Object System.Text.UTF8Encoding($false)))
if(Test-Path $tmpPdf){ Remove-Item $tmpPdf -Force }

$prof = Join-Path $TMP 'profile'
$uri  = 'file:///' + ($tmpHtml -replace '\\','/')
& $EDGE --headless=new --disable-gpu --no-first-run "--user-data-dir=$prof" --no-pdf-header-footer `
        --virtual-time-budget=15000 "--print-to-pdf=$tmpPdf" $uri 2>$null | Out-Null
Start-Sleep -Milliseconds 500
if(-not (Test-Path $tmpPdf)){ throw 'PDF 가 만들어지지 않았습니다' }
Copy-Item $tmpPdf $OUT -Force
$kb = [math]::Round((Get-Item $OUT).Length / 1KB)
Write-Host ("PDF : {0}  ({1} KB)" -f (Split-Path $OUT -Leaf), $kb)
