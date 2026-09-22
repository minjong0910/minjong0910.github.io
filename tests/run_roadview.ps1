# 1인칭 로드뷰 점검 돌리기 — pwsh -File tests\run_roadview.ps1 [-App ../site/index.html]
param([string]$App = '../site/index.html', [int]$Port = 8080)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$EDGE = if($env:B3NAV_BROWSER){ $env:B3NAV_BROWSER } else { 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' }   # 다른 컴퓨터는 환경 변수로
$prof = Join-Path $env:TEMP ('b3nav_rv_' + [guid]::NewGuid().ToString('N').Substring(0,8))
$url = "http://localhost:$Port/tests/roadview.html?app=" + [uri]::EscapeDataString($App)
$t0 = Get-Date
$extra = if($env:GITHUB_ACTIONS -eq 'true'){ @('--enable-unsafe-swiftshader', '--ignore-gpu-blocklist') } else { @() }   # 그래픽 카드 없는 컴퓨터
$dom = & $EDGE --headless=new --disable-gpu --no-first-run --window-size=1000,1000 @extra "--user-data-dir=$prof" --virtual-time-budget=300000 --dump-dom $url 2>$null | Out-String
$secs = [int]((Get-Date) - $t0).TotalSeconds
$dec = { param($x) $x.Replace('&lt;','<').Replace('&gt;','>').Replace('&quot;','"').Replace('&amp;','&') }
Write-Host (& $dec ([regex]::Match($dom, '(?s)<pre id="R">(.*?)</pre>').Groups[1].Value))
$raw = & $dec ([regex]::Match($dom, '(?s)<pre id="OUT">(.*?)</pre>').Groups[1].Value)
if(-not $raw){ Write-Host "  결과 없음 ($secs 초)" -ForegroundColor Red; exit 2 }
$res = $raw | ConvertFrom-Json
if($res.ok){ Write-Host "  통과 ($secs 초)" -ForegroundColor Green; exit 0 } else { Write-Host "  실패 ($secs 초)" -ForegroundColor Red; exit 1 }
