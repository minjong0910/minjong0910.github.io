# 앱 설치 · 인터넷 없이 열기 · 출입문 QR 검사 — Edge 헤드리스로 tests/pwa.html 을 열어 결과를 읽는다
#   pwsh -File tests\run_pwa.ps1
#   검사 : QR 주소(?gate=)로 열기 · 첫 화면 앱 다운로드 문구 · 설정의 앱 다운로드 · 기기별 설치 안내 13가지 ·
#          앱 이름·아이콘 · sw.js 12MB 저장과 인터넷 끊김 흉내 · AI 는 인터넷 될 때만 · 인쇄 QR 4장 다시 읽기
#
#   다른 검사(run_check 등)처럼 --dump-dom + --virtual-time-budget 을 쓰지 않는다 — 가상 시계가 서비스 워커의
#   파일 받기를 기다려 주지 않아, 12MB 를 받는 중에 결과를 읽어 버린다. 그래서 진짜 시간으로 돌리고,
#   디버깅 포트의 탭 목록(/json/list)에서 탭 제목("PWA-RESULT {…}")을 읽는다.
param([int]$Port = 8080, [int]$LimitSec = 240)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$EDGE = if($env:B3NAV_BROWSER){ $env:B3NAV_BROWSER } else { 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' }   # 다른 컴퓨터는 환경 변수로
$prof = Join-Path $env:TEMP ('b3nav_pwa_' + [guid]::NewGuid().ToString('N').Substring(0,8))
$url = "http://localhost:$Port/tests/pwa.html"
$t0 = Get-Date
$extra = if($env:GITHUB_ACTIONS -eq 'true'){ @('--enable-unsafe-swiftshader', '--ignore-gpu-blocklist') } else { @() }
$argv = @('--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0') + $extra + @("--user-data-dir=$prof", $url)
$proc = Start-Process -FilePath $EDGE -ArgumentList $argv -PassThru -WindowStyle Hidden
$res = $null; $last = ''
try {
  # 브라우저가 고른 디버깅 포트
  $portFile = Join-Path $prof 'DevToolsActivePort'; $dbg = 0
  for($i = 0; $i -lt 100 -and -not $dbg; $i++){
    Start-Sleep -Milliseconds 200
    if(Test-Path $portFile){ $l = @(Get-Content $portFile -ErrorAction SilentlyContinue); if($l.Count -and $l[0] -match '^\d+$'){ $dbg = [int]$l[0] } }
  }
  if(-not $dbg){ Write-Host '  브라우저가 켜지지 않았습니다' -ForegroundColor Red; exit 2 }
  while(((Get-Date) - $t0).TotalSeconds -lt $LimitSec){
    Start-Sleep -Milliseconds 700
    $tabs = $null; try { $tabs = Invoke-RestMethod "http://127.0.0.1:$dbg/json/list" -TimeoutSec 5 } catch { continue }
    $pg = @($tabs | Where-Object { $_.type -eq 'page' -and $_.url -like '*tests/pwa.html*' })[0]
    if(-not $pg){ continue }
    $last = [System.Net.WebUtility]::HtmlDecode([string]$pg.title)     # 제목의 " 는 &quot; 로 온다
    if($last -like 'PWA-RESULT *'){ try { $res = $last.Substring(11) | ConvertFrom-Json } catch {}; break }
  }
} finally {
  try { Stop-Process -Id $proc.Id -Force -ErrorAction Stop } catch {}
  Start-Sleep -Milliseconds 500
  try { Remove-Item -Recurse -Force $prof -ErrorAction Stop } catch {}
}
$secs = [int]((Get-Date) - $t0).TotalSeconds
if(-not $res){ Write-Host "  결과를 읽지 못함 ($secs 초) — 마지막 제목 : $last" -ForegroundColor Red; exit 2 }
if($res.error){ Write-Host "  멈춤 : $($res.error)" -ForegroundColor Red }
$n = 0
foreach($p in $res.bad.PSObject.Properties){
  foreach($m in @($p.Value)){ $n++; Write-Host ("  ✗ [{0}] {1}" -f $p.Name, $m) -ForegroundColor Red }
}
$o = $res.info.offline
if($o){ Write-Host ("  인터넷 없이 열기 : 파일 {0}개 · {1}MB 저장 (앱이 쓰는 파일 {2}개 모두 확인)" -f $o.files, $o.MB, $o.appFilesChecked) }
if($res.info.devices){ Write-Host ("  기기별 설치 안내 {0}가지 확인" -f @($res.info.devices.PSObject.Properties).Count) }
if($res.info.qr){ Write-Host ("  인쇄 QR {0}장 다시 읽음" -f @($res.info.qr.PSObject.Properties).Count) }
if($res.ok){ Write-Host "  통과 ($secs 초)" -ForegroundColor Green; exit 0 } else { Write-Host "  실패 ($secs 초) — $n 가지" -ForegroundColor Red; exit 1 }
