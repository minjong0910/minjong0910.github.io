# 선행기술 조사 PDF 만들기
#   문서\선행기술조사.html 을 Edge 로 A4 PDF 로 뽑는다. 변리사 상담에 들고 갈 문서다.
#
#   pwsh -File 도구\특허PDF_만들기.ps1
#
#   ※ Edge 헤드리스는 한글 경로를 주면 실패한다 — %TEMP% 아래 영문 경로에서 만든 뒤 옮긴다.
#   ※ 내용이 인쇄 영역보다 넓으면 Edge 가 문서 전체를 몰래 줄인다. 표 폭을 넘기지 말 것.
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$SRC  = Join-Path $ROOT '문서\선행기술조사.html'
$OUT  = Join-Path $ROOT '선행기술조사_특허성검토.pdf'
$EDGE = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$TMP  = Join-Path $env:TEMP 'b3nav_pat'
New-Item -ItemType Directory -Force -Path $TMP | Out-Null

if(-not (Test-Path $SRC)){ throw "원본이 없습니다 : $SRC" }
if(-not (Test-Path $EDGE)){ throw "Edge 를 찾지 못했습니다 : $EDGE" }

$html    = [System.IO.File]::ReadAllText($SRC, [System.Text.Encoding]::UTF8)
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
