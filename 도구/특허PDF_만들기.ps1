# 특허 관련 문서를 PDF 로 — 변리사·산학협력단에 들고 갈 것들
#
#   pwsh -File 도구\특허PDF_만들기.ps1              (둘 다 만든다)
#   pwsh -File 도구\특허PDF_만들기.ps1 -Doc 조사     (선행기술조사만)
#   pwsh -File 도구\특허PDF_만들기.ps1 -Doc 신고서   (발명신고서 작성안내만)
#
#   ※ Edge 헤드리스는 한글 경로를 주면 실패한다 — %TEMP% 아래 영문 경로에서 만든 뒤 옮긴다.
#   ※ 내용이 인쇄 영역보다 넓으면 Edge 가 문서 전체를 몰래 줄인다. 표 폭을 넘기지 말 것.
#   ※ 쪽이 제대로 찍혔는지는 도구\PDF_쪽그림.ps1 로 그림을 떠서 눈으로 본다.
param([ValidateSet('전부','조사','신고서','설명서','발표')][string]$Doc = '전부')

$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$EDGE = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$TMP  = Join-Path $env:TEMP 'b3nav_pat'
New-Item -ItemType Directory -Force -Path $TMP | Out-Null
if(-not (Test-Path $EDGE)){ throw "Edge 를 찾지 못했습니다 : $EDGE" }

$DOCS = @(
  @{ key='조사';   src='문서\선행기술조사.html';        out='선행기술조사_특허성검토.pdf' }
  @{ key='신고서'; src='문서\발명신고서_작성안내.html'; out='발명신고서_작성안내.pdf'     }
  @{ key='설명서'; src='문서\발명의내용설명서.html';    out='발명의내용설명서.pdf'        }
  @{ key='발표';   src='문서\발표_상세설계.html';       out='졸업작품_상세설계_발표.pdf'  }
)

foreach($d in $DOCS){
  if($Doc -ne '전부' -and $Doc -ne $d.key){ continue }
  $src = Join-Path $ROOT $d.src
  $out = Join-Path $ROOT $d.out
  if(-not (Test-Path $src)){ throw "원본이 없습니다 : $src" }

  $html    = [System.IO.File]::ReadAllText($src, [System.Text.Encoding]::UTF8)
  $tmpHtml = Join-Path $TMP ($d.key + '.html')
  $tmpPdf  = Join-Path $TMP ($d.key + '.pdf')
  [System.IO.File]::WriteAllText($tmpHtml, $html, (New-Object System.Text.UTF8Encoding($false)))
  if(Test-Path $tmpPdf){ Remove-Item $tmpPdf -Force }

  $prof = Join-Path $TMP 'profile'
  $uri  = 'file:///' + ($tmpHtml -replace '\\','/')
  & $EDGE --headless=new --disable-gpu --no-first-run "--user-data-dir=$prof" --no-pdf-header-footer `
          --virtual-time-budget=15000 "--print-to-pdf=$tmpPdf" $uri 2>$null | Out-Null
  Start-Sleep -Milliseconds 500
  if(-not (Test-Path $tmpPdf)){ throw "PDF 가 만들어지지 않았습니다 : $($d.out)" }
  Copy-Item $tmpPdf $out -Force
  $kb = [math]::Round((Get-Item $out).Length / 1KB)
  Write-Host ("PDF : {0}  ({1} KB)" -f $d.out, $kb)
}
