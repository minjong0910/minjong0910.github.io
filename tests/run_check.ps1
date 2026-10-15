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
# ※ 검사마다 Edge 프로필을 새로 만든다(앞선 실행의 캐시가 섞이지 않게). 이걸 지우지 않아서
#   실행마다 70MB 씩 임시 폴더에 쌓였다 — 2026-10-15 에 103개 · 1.25GB 가 C 드라이브를 채우고 있었다.
#   그래서 끝날 때 반드시 지운다. exit 는 맨 끝에서 한 번만 한다(중간에 exit 하면 정리를 건너뛴다).
$code = 0
try {
  $dom = & $EDGE --headless=new --disable-gpu --no-first-run @extra "--user-data-dir=$prof" --virtual-time-budget=180000 --dump-dom $url 2>$null | Out-String
  $secs = [int]((Get-Date) - $t0).TotalSeconds
  $raw = [regex]::Match($dom, '(?s)<pre id="R">(.*?)</pre>').Groups[1].Value.Replace('&lt;','<').Replace('&gt;','>').Replace('&quot;','"').Replace('&amp;','&')
  $res = $null; try { $res = $raw | ConvertFrom-Json } catch {}
  if(-not $res){
    Write-Host "  결과를 읽지 못함 ($secs 초) : $($raw.Substring(0, [Math]::Min(200, $raw.Length)))" -ForegroundColor Red; $code = 2
  } elseif($res.error){
    Write-Host "  실패 : $($res.error)" -ForegroundColor Red; $code = 1
  } else {
    $bad = 0
    foreach($p in $res.bad.PSObject.Properties){
      $l = @($p.Value)
      if($l.Count){ $bad++; Write-Host ("  ✗ {0} {1}곳 : {2}" -f $p.Name, $l.Count, (($l | Select-Object -First 8) -join ', ')) -ForegroundColor Red }
    }
    Write-Host ("  장소 {0}곳 · 사진 {1}장 · 기준 {2}개 · 그래프 점 {3}개 · 어림한 3D 위치 {4}곳" -f $res.places, $res.photos, $res.vectors, $res.graph.nodes, @($res.approx3D).Count)
    if($res.ok){ Write-Host "  통과 ($secs 초)" -ForegroundColor Green; $code = 0 } else { Write-Host "  실패 ($secs 초) — $bad 가지" -ForegroundColor Red; $code = 1 }
  }
} finally {
  # Edge 가 끝난 직후에는 프로필 파일을 잠깐 붙잡고 있을 수 있다 — 몇 번 다시 시도한다
  for($i = 0; $i -lt 10 -and (Test-Path -LiteralPath $prof); $i++){
    try { Remove-Item -LiteralPath $prof -Recurse -Force -ErrorAction Stop } catch { Start-Sleep -Milliseconds 300 }
  }
}
exit $code
