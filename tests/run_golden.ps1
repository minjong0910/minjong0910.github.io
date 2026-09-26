# 안전망 돌리기 — Edge 헤드리스로 tests/golden.html 을 열어 결과를 읽는다
#
#   기록 : pwsh -File tests\run_golden.ps1 -Mode capture -Tag v87
#   비교 : pwsh -File tests\run_golden.ps1 -Mode compare -Tag v87
#
#   매번 새 브라우저 프로필을 쓴다 — 예전 실행의 localStorage(최근 검색·즐겨찾기 등)가
#   화면을 바꾸면 비교가 흔들리기 때문이다. 미리보기 서버(8080)가 켜져 있어야 한다.
param(
  [ValidateSet('capture','compare')][string]$Mode = 'compare',
  [string]$Tag = 'v115',
  [string]$App = '../site/index.html',
  [int]$Port = 8080,
  [string]$Parts = ''   # 'ci' = 글자 폭·3D 그림 비교를 뺀다 (다른 컴퓨터)
)
$ErrorActionPreference = 'Stop'
$EDGE = if($env:B3NAV_BROWSER){ $env:B3NAV_BROWSER } else { 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' }   # 다른 컴퓨터는 환경 변수로
if(-not (Test-Path $EDGE)){ throw "브라우저를 찾지 못했습니다 : $EDGE" }
$prof = Join-Path $env:TEMP ('b3nav_golden_' + [guid]::NewGuid().ToString('N').Substring(0,8))
$url = "http://localhost:$Port/tests/golden.html?mode=$Mode&tag=$Tag&parts=$Parts&app=" + [uri]::EscapeDataString($App)
$t0 = Get-Date
# Edge 는 UTF-8 로 내보낸다. 이 PC 의 기본(cp949)으로 읽으면 한글이 깨지면서 따옴표까지 먹어 JSON 이 깨진다.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$extra = if($env:GITHUB_ACTIONS -eq 'true'){ @('--enable-unsafe-swiftshader', '--ignore-gpu-blocklist') } else { @() }   # 그래픽 카드 없는 컴퓨터
try {
  $dom = & $EDGE --headless=new --disable-gpu --no-first-run --window-size=1200,1000 @extra "--user-data-dir=$prof" `
           --virtual-time-budget=600000 --dump-dom $url 2>$null | Out-String
} finally { Remove-Item -Recurse -Force $prof -ErrorAction SilentlyContinue }
$secs = [int]((Get-Date) - $t0).TotalSeconds
$dec = { param($x) $x.Replace('&lt;','<').Replace('&gt;','>').Replace('&quot;','"').Replace('&amp;','&') }
$log = [regex]::Match($dom, '(?s)<pre id="R">(.*?)</pre>').Groups[1].Value
$out = [regex]::Match($dom, '(?s)<pre id="OUT">(.*?)</pre>').Groups[1].Value
Write-Host (& $dec $log)
if(-not $out){ Write-Host "  결과가 없습니다 ($secs 초) — 검사가 끝나기 전에 멈춤" -ForegroundColor Red; exit 2 }
$res = (& $dec $out) | ConvertFrom-Json
if($res.ok){ Write-Host ("  통과 ($secs 초)") -ForegroundColor Green; exit 0 }
Write-Host ("  실패 ($secs 초) : " + ($res.error, ($res.fails -join ', ') | Where-Object { $_ } | Select-Object -First 1)) -ForegroundColor Red
exit 1
