# 앱 켜는 화면 동영상 만들기 (2026-11-03) — site/img/splash.mp4 · splash_first.jpg · splash_end.jpg
#   사용자가 고른 「밝은 화면 시작 화면 견본(2판)」을 그대로 찍어 동영상으로. 앱에서 실시간 3D 로 그리면 폰마다 느리고
#   (윈도 노트북 시험 : 3D 준비에만 4초, 앱도 같이 늦어짐) 화질도 들쭉날쭉해서, 같은 장면을 동영상으로 재생한다.
#   제목 글자는 넣지 않는다(?notitle=1) — 앱(boot.js)이 동영상 위에 한국어 · 영어로 얹는다.
#
#   순서 : 시작화면_틀.html 을 tests\_splash_rec.html 로 잠깐 복사(시험 서버가 한글 폴더를 못 연다) → 헤드리스 Edge 로
#          window.__seek(초) 를 한 장씩 넘기며 찍기(25장/초) → KMPlayer 안의 ffmpeg 로 MP4 · 첫 장 · 끝 장 → 복사본 지움
#   필요한 것 : 시험 서버(localhost:8080, D:\군산대 를 연다) · Edge · ffmpeg(아래 경로)
#   사용법 : pwsh -File 도구\시작화면\영상_만들기.ps1
param([int]$Port = 8080, [double]$Dur = 5.3, [int]$Fps = 25, [string]$Ffmpeg = 'C:\Program Files\KMPlayer 64X\LAVFilters64\ffmpeg.exe')
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$tpl = Join-Path $PSScriptRoot '시작화면_틀.html'
$rec = Join-Path $root 'tests\_splash_rec.html'
$out = Join-Path $root 'site\img'
$frames = Join-Path $env:TEMP ('b3splash_' + [guid]::NewGuid().ToString('N').Substring(0, 6))
if(-not (Test-Path $Ffmpeg)){ throw ('ffmpeg 이 없다 : ' + $Ffmpeg) }
(Get-Content -Raw -Encoding UTF8 $tpl).Replace('../../site/', '../site/') | Set-Content -Encoding utf8NoBOM -NoNewline $rec
New-Item -ItemType Directory -Force $frames | Out-Null
$W = 390; $H = 844; $DPR = 2
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$tmp = Join-Path $env:TEMP ('b3r_' + [guid]::NewGuid().ToString('N').Substring(0, 6)); New-Item -ItemType Directory $tmp | Out-Null
$dport = 9355 + (Get-Random -Maximum 200)
$proc = Start-Process -FilePath $edge -ArgumentList @('--headless=new', '--no-first-run', "--user-data-dir=$tmp\p", "--remote-debugging-port=$dport", '--hide-scrollbars', "--window-size=$W,$H", 'about:blank') -PassThru -WindowStyle Hidden
$script:id = 0
function Recv($c){ $buf = New-Object byte[] 4194304; $ms = New-Object IO.MemoryStream
  do{ $r = $c.ReceiveAsync([ArraySegment[byte]]::new($buf), [Threading.CancellationToken]::None); $r.Wait(); $ms.Write($buf, 0, $r.Result.Count) } while(-not $r.Result.EndOfMessage)
  return ([Text.Encoding]::UTF8.GetString($ms.ToArray()) | ConvertFrom-Json) }
function Send($c, $method, $params){ $script:id++; $b = [Text.Encoding]::UTF8.GetBytes((@{ id = $script:id; method = $method; params = $params } | ConvertTo-Json -Depth 8 -Compress))
  $c.SendAsync([ArraySegment[byte]]::new($b), 'Text', $true, [Threading.CancellationToken]::None).Wait()
  while($true){ $j = Recv $c; if($j.id -eq $script:id){ return $j } } }
try{
  $ws = $null; $t0 = Get-Date
  while(((Get-Date) - $t0).TotalSeconds -lt 30){ Start-Sleep -Milliseconds 400; try { $list = Invoke-RestMethod "http://127.0.0.1:$dport/json/list" -TimeoutSec 3 } catch { continue }
    $pg = $list | Where-Object { $_.type -eq 'page' } | Select-Object -First 1; if($pg){ $ws = $pg.webSocketDebuggerUrl; break } }
  $c = New-Object System.Net.WebSockets.ClientWebSocket; $c.ConnectAsync([Uri]$ws, [Threading.CancellationToken]::None).Wait()
  Send $c 'Page.enable' @{} | Out-Null; Send $c 'Runtime.enable' @{} | Out-Null
  Send $c 'Emulation.setDeviceMetricsOverride' @{ width = $W; height = $H; deviceScaleFactor = $DPR; mobile = $true } | Out-Null
  Send $c 'Page.navigate' @{ url = "http://localhost:$Port/tests/_splash_rec.html?t=0&rec=1&notitle=1" } | Out-Null
  $t1 = Get-Date; $ok = $false
  while(((Get-Date) - $t1).TotalSeconds -lt 60){ Start-Sleep -Milliseconds 400; $r = Send $c 'Runtime.evaluate' @{ expression = 'document.title'; returnByValue = $true }; if($r.result.result.value -eq 'G-READY'){ $ok = $true; break } }
  if(-not $ok){ throw '견본 페이지가 준비되지 않았다(시험 서버가 켜져 있는지)' }
  $n = [int][Math]::Round($Dur * $Fps)
  for($i = 0; $i -lt $n; $i++){
    $t = [Math]::Round($i / $Fps, 4)
    Send $c 'Runtime.evaluate' @{ expression = ("window.__seek($t); new Promise(function(r){ requestAnimationFrame(function(){ requestAnimationFrame(function(){ r(1); }); }); })"); awaitPromise = $true; returnByValue = $true } | Out-Null
    $s = Send $c 'Page.captureScreenshot' @{ format = 'png'; clip = @{ x = 0; y = 0; width = $W; height = $H; scale = 1 } }
    [IO.File]::WriteAllBytes((Join-Path $frames ('f_{0:D4}.png' -f $i)), [Convert]::FromBase64String($s.result.data))
  }
  ('찍음 {0}장' -f $n)
} finally {
  Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -match [regex]::Escape($tmp) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 600; try { Remove-Item $tmp -Recurse -Force -ErrorAction Stop } catch {}
  Remove-Item $rec -Force -ErrorAction SilentlyContinue
}
# 동영상 : 540 너비(폰 화면에 충분), H.264 main · 소리 없음 · 앞에 목차(faststart — 받는 중에도 바로 재생)
$last = (Get-ChildItem $frames -Filter 'f_*.png' | Sort-Object Name | Select-Object -Last 1).FullName
& $Ffmpeg -hide_banner -loglevel error -y -framerate $Fps -i (Join-Path $frames 'f_%04d.png') -vf 'scale=540:-2:flags=lanczos' -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 25 -preset slow -movflags +faststart -an (Join-Path $out 'splash.mp4')
& $Ffmpeg -hide_banner -loglevel error -y -i (Join-Path $frames 'f_0000.png') -vf 'scale=540:-2:flags=lanczos' -q:v 5 (Join-Path $out 'splash_first.jpg')
& $Ffmpeg -hide_banner -loglevel error -y -i $last -vf 'scale=540:-2:flags=lanczos' -q:v 5 (Join-Path $out 'splash_end.jpg')
Remove-Item $frames -Recurse -Force
foreach($f in 'splash.mp4', 'splash_first.jpg', 'splash_end.jpg'){ ('{0} : {1:N0} KB' -f $f, ((Get-Item (Join-Path $out $f)).Length / 1KB)) }
