# 앱 검사 돌리기 — Edge 헤드리스로 tests/check.html 을 열어 결과를 읽는다
#   pwsh -File tests\run_check.ps1 [-App site/index.html]
#   검사 : 152곳의 접수·이름·층·관리자 목록 · 3D 위치 · 길찾기(좌우·차례) · 실사 3D · 후보 평면도 ·
#          장소 목록(data/places.js)과 AI 자료의 일치
param([string]$App = "../site/index.html", [int]$Port = 8080)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$EDGE = if($env:B3NAV_BROWSER){ $env:B3NAV_BROWSER } else { 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' }   # 다른 컴퓨터는 환경 변수로
$prof = Join-Path $env:TEMP ('b3nav_check_' + [guid]::NewGuid().ToString('N').Substring(0,8))
$url = "http://localhost:$Port/tests/check.html?app=" + [uri]::EscapeDataString($App)
$t0 = Get-Date
# 그래픽 카드가 없는 컴퓨터(GitHub 자동 검사)에서는 브라우저가 WebGL 을 꺼 버린다 — 소프트웨어 3D 를 허용한다
$extra = if($env:GITHUB_ACTIONS -eq 'true'){ @('--enable-unsafe-swiftshader', '--ignore-gpu-blocklist') } else { @() }
$dom = & $EDGE --headless=new --disable-gpu --no-first-run @extra "--user-data-dir=$prof" --virtual-time-budget=180000 --dump-dom $url 2>$null | Out-String
$secs = [int]((Get-Date) - $t0).TotalSeconds
$raw = [regex]::Match($dom, '(?s)<pre id="R">(.*?)</pre>').Groups[1].Value.Replace('&lt;','<').Replace('&gt;','>').Replace('&quot;','"').Replace('&amp;','&')
$res = $null; try { $res = $raw | ConvertFrom-Json } catch {}
if(-not $res){ Write-Host "  결과를 읽지 못함 ($secs 초) : $($raw.Substring(0, [Math]::Min(200, $raw.Length)))" -ForegroundColor Red; exit 2 }
if($res.error){ Write-Host "  실패 : $($res.error)" -ForegroundColor Red; exit 1 }
$bad = 0
foreach($p in $res.bad.PSObject.Properties){
  $l = @($p.Value)
  if($l.Count){ $bad++; Write-Host ("  ✗ {0} {1}곳 : {2}" -f $p.Name, $l.Count, (($l | Select-Object -First 8) -join ', ')) -ForegroundColor Red }
}
Write-Host ("  장소 {0}곳 · 사진 {1}장 · 기준 {2}개 · 그래프 점 {3}개 · 어림한 3D 위치 {4}곳" -f $res.places, $res.photos, $res.vectors, $res.graph.nodes, @($res.approx3D).Count)
if($res.ok){ Write-Host "  통과 ($secs 초)" -ForegroundColor Green; exit 0 } else { Write-Host "  실패 ($secs 초) — $bad 가지" -ForegroundColor Red; exit 1 }
