# AI 건물 밖 사진 측정 — 「건물과 무관한 사진에도 장소를 말한다」를 숫자로 잰다 (2026-11-10 외부 점검 A-2)
#
#   pwsh -File 도구\AI_건물밖사진_측정.ps1            (미리보기 서버 8080 이 켜져 있어야 한다)
#
# 무엇을 재나
#   앱이 실제로 쓰는 판정(tests/ai_reject.html → 앱의 SUGAI.classify · quality)으로 사진 한 장마다 1등 유사도(sim)와 1·2등 격차(margin)를 잰다.
#   · 정상(POS) : 3호관 사진인데 AI 기준 자료에 안 들어간 것 — 기준 자료에 이미 있는 사진(유사도 0.97 이상 = 자기 자신)은 뺀다.
#   · 무관(NEG) : 건물과 상관없는 사진 — 풍경 · 그림 · 화면 캡처.
#   그리고 「정상 사진을 몇 % 남기면서 무관한 사진을 몇 % 거르는가」를 문턱마다 표로 만든다.
#
# 사진은 저장소에 넣지 않는다(개인정보 · 용량 · 저작권). 아래 폴더를 바꿔 다른 묶음으로 다시 잴 수 있다.
#   결과 : 생성물\AI측정\건물밖_<날짜>.csv (사진마다) · 문서\AI_건물밖사진_측정.txt (요약 — 덮어씀)
param(
  [string[]]$PosDirs = @('_보류_5층복도', '_4층_확인필요', '사진원본_정리대기'),
  [int]$PosMaxPerDir = 160,
  [hashtable]$NegDirs = @{ '풍경 · 배경 사진' = 'C:\Windows\Web'; '그림 · 도표 · QR' = '도구\발표그림'; '앱 화면 캡처' = '도구\발표그림' },
  [int]$Port = 8080
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$ROOT = Split-Path $PSScriptRoot -Parent
$EDGE = if($env:B3NAV_BROWSER){ $env:B3NAV_BROWSER } else { 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' }
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ── 사진 고르기 ──
function Imgs($dir){ Get-ChildItem $dir -Recurse -File -Include *.jpg, *.jpeg, *.png -ErrorAction SilentlyContinue | Sort-Object FullName }
$items = New-Object System.Collections.ArrayList
foreach($d in $PosDirs){
  $p = Join-Path $ROOT $d; if(-not (Test-Path $p)){ continue }
  $all = @(Imgs $p); $step = [Math]::Max(1, [Math]::Floor($all.Count / $PosMaxPerDir))
  for($i = 0; $i -lt $all.Count -and ($i / $step) -lt $PosMaxPerDir; $i += $step){ [void]$items.Add([pscustomobject]@{ kind='POS'; cat=$d; path=$all[$i].FullName }) }
}
# 발표그림 안의 3호관 사진(현장 · 실제 사진 · AI 예시 · 증거)은 무관한 사진이 아니므로 뺀다. 앱 화면 캡처(사진이 일부 들어 있음)는 따로 센다.
$rxBuilding = '현장_|사진_|AI예시|AI실제|증거|복도|엘리베이터'
$rxScreen   = '^(화면|K\d|A\d|R\d|동문|g\d|흐름0)'
foreach($cat in $NegDirs.Keys){
  $p = $NegDirs[$cat]; if(-not [IO.Path]::IsPathRooted($p)){ $p = Join-Path $ROOT $p }
  if(-not (Test-Path $p)){ continue }
  foreach($f in (Imgs $p)){
    if($p -like '*발표그림*'){
      if($f.Name -match $rxBuilding){ continue }
      $isScreen = $f.Name -match $rxScreen
      if(($cat -eq '앱 화면 캡처') -ne $isScreen){ continue }
    }
    [void]$items.Add([pscustomobject]@{ kind='NEG'; cat=$cat; path=$f.FullName })
  }
}
Write-Host ("사진 : 정상 후보 {0}장 · 무관 {1}장" -f @($items | Where-Object kind -eq 'POS').Count, @($items | Where-Object kind -eq 'NEG').Count)

# ── 한 장을 폰이 올리는 크기(긴 변 1280)로 줄여 data URL 로 (사진 방향 EXIF 를 반영한다 — 다시 저장하면 EXIF 가 사라지므로) ──
function ToDataUrl($path){
  $im = [Drawing.Image]::FromFile($path)
  try{
    if($im.PropertyIdList -contains 0x0112){
      $o = $im.GetPropertyItem(0x0112).Value[0]
      switch($o){ 3 { $im.RotateFlip('Rotate180FlipNone') } 6 { $im.RotateFlip('Rotate90FlipNone') } 8 { $im.RotateFlip('Rotate270FlipNone') } }
    }
    # 주의 : [Math]::Min(1, 0.3) 은 PowerShell 이 정수끼리 비교로 골라 0 이 된다 — 1.0 으로 써야 한다 (첫 측정에서 큰 사진이 1×1 로 들어갔다)
    $s = [Math]::Min(1.0, 1280.0 / [Math]::Max($im.Width, $im.Height))
    $w = [Math]::Max(1, [int]($im.Width * $s)); $h = [Math]::Max(1, [int]($im.Height * $s))
    $bmp = New-Object Drawing.Bitmap $w, $h
    $g = [Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = 'HighQualityBicubic'; $g.Clear([Drawing.Color]::White); $g.DrawImage($im, 0, 0, $w, $h); $g.Dispose()
    $ms = New-Object IO.MemoryStream
    $enc = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
    $ep = New-Object Drawing.Imaging.EncoderParameters 1; $ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality), 85L
    $bmp.Save($ms, $enc, $ep); $bmp.Dispose()
    return 'data:image/jpeg;base64,' + [Convert]::ToBase64String($ms.ToArray())
  } finally { $im.Dispose() }
}

# ── Edge 헤드리스 + 개발자 연결(CDP) ──
$prof = Join-Path $env:TEMP ('b3_air_' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$dport = 9341
$proc = Start-Process $EDGE -ArgumentList @('--headless=new', "--remote-debugging-port=$dport", "--user-data-dir=$prof", '--no-first-run', '--disable-sync', '--window-size=800,600', 'about:blank') -PassThru
$rows = New-Object System.Collections.ArrayList
try{
  $tab = $null
  for($i = 0; $i -lt 40 -and -not $tab; $i++){ Start-Sleep -Milliseconds 250; try{ $tab = (Invoke-RestMethod "http://127.0.0.1:$dport/json") | Where-Object { $_.type -eq 'page' } | Select-Object -First 1 }catch{} }
  $ws = New-Object System.Net.WebSockets.ClientWebSocket
  $ws.ConnectAsync([Uri]$tab.webSocketDebuggerUrl, [Threading.CancellationToken]::None).Wait()
  $script:id = 0
  function Send($method, $params){
    $script:id++
    $msg = @{ id = $script:id; method = $method; params = $params } | ConvertTo-Json -Depth 10 -Compress
    $buf = [Text.Encoding]::UTF8.GetBytes($msg)
    $ws.SendAsync([ArraySegment[byte]]::new($buf), 'Text', $true, [Threading.CancellationToken]::None).Wait()
    while($true){
      $ms = New-Object IO.MemoryStream
      do{ $rb = New-Object byte[] 1048576; $r = $ws.ReceiveAsync([ArraySegment[byte]]::new($rb), [Threading.CancellationToken]::None).Result; $ms.Write($rb, 0, $r.Count) } while(-not $r.EndOfMessage)
      $j = [Text.Encoding]::UTF8.GetString($ms.ToArray()) | ConvertFrom-Json
      if($j.id -eq $script:id){ return $j }
    }
  }
  function Eval($js){ $r = Send 'Runtime.evaluate' @{ expression = $js; awaitPromise = $true; returnByValue = $true }; return $r.result.result.value }
  Send 'Page.navigate' @{ url = "http://localhost:$Port/tests/ai_reject.html" } | Out-Null
  $t0 = Get-Date
  while(-not (Eval 'window.READY === true')){
    if(((Get-Date) - $t0).TotalSeconds -gt 180){ throw 'AI 자료가 3분 안에 준비되지 않음 — 미리보기 서버(8080)를 확인하세요' }
    Start-Sleep -Milliseconds 500
  }
  Write-Host ('AI 준비됨 (' + [int]((Get-Date) - $t0).TotalSeconds + '초)')
  $n = 0
  foreach($it in $items){
    $n++
    try{ $du = ToDataUrl $it.path }catch{ continue }
    $res = Eval ("window.measure(" + ($du | ConvertTo-Json -Compress) + ")")
    if(-not $res -or $res.err){ continue }
    [void]$rows.Add([pscustomobject]@{ kind=$it.kind; cat=$it.cat; file=($it.path.Replace($ROOT + '\', '')); sim=[double]$res.sim; margin=[double]$res.margin; code=$res.code; top=$res.top; sharp=$res.sharp; bright=$res.bright; qBad=$res.qBad })
    if($n % 25 -eq 0){ Write-Host ("  {0}/{1}" -f $n, $items.Count) }
  }
} finally {
  try{ $ws.Dispose() }catch{}
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like "*$prof*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 500; Remove-Item -Recurse -Force $prof -ErrorAction SilentlyContinue
}

# ── 정리 ──
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$outDir = Join-Path $ROOT '생성물\AI측정'; New-Item -ItemType Directory -Force $outDir | Out-Null
$csv = Join-Path $outDir ("건물밖_$stamp.csv"); $rows | Export-Csv $csv -NoTypeInformation -Encoding utf8BOM
$pos = @($rows | Where-Object { $_.kind -eq 'POS' -and $_.sim -lt 0.97 -and -not $_.qBad })     # 기준 자료에 이미 있는 사진 · 품질 탈락은 뺀다
$posIn = @($rows | Where-Object { $_.kind -eq 'POS' -and $_.sim -ge 0.97 }).Count
$posQ  = @($rows | Where-Object { $_.kind -eq 'POS' -and $_.sim -lt 0.97 -and $_.qBad }).Count
$neg = @($rows | Where-Object kind -eq 'NEG')
function Pct($a, $b){ if($b){ '{0:N1}%' -f (100.0 * $a / $b) } else { '-' } }
function Q($arr, $q){ $s = @($arr | Sort-Object); if(-not $s.Count){ return '-' }; '{0:N3}' -f $s[[Math]::Min($s.Count - 1, [Math]::Floor($s.Count * $q))] }
$L = New-Object System.Collections.ArrayList
[void]$L.Add('AI 건물 밖 사진 측정 — ' + (Get-Date -Format 'yyyy-MM-dd HH:mm') + ' (도구\AI_건물밖사진_측정.ps1 · tests\ai_reject.html)')
[void]$L.Add('')
[void]$L.Add(('정상(3호관, 기준 자료에 없는 사진) : {0}장   — 기준 자료에 이미 있어 뺀 사진 {1}장 · 사진 품질로 먼저 걸러진 사진 {2}장' -f $pos.Count, $posIn, $posQ))
[void]$L.Add(('  1등 유사도 : 가장 낮은 {0} · 하위 1% {1} · 하위 3% {2} · 하위 5% {3} · 가운데 {4}' -f (Q $pos.sim 0), (Q $pos.sim 0.01), (Q $pos.sim 0.03), (Q $pos.sim 0.05), (Q $pos.sim 0.5)))
foreach($c in ($neg | Group-Object cat)){
  $ok = @($c.Group | Where-Object { -not $_.qBad })
  [void]$L.Add(('무관 · {0} : {1}장 (사진 품질로 먼저 걸러짐 {2}장)' -f $c.Name, $c.Count, ($c.Count - $ok.Count)))
  [void]$L.Add(('  1등 유사도 : 가운데 {0} · 상위 5% {1} · 가장 높은 {2}' -f (Q $ok.sim 0.5), (Q $ok.sim 0.95), (Q $ok.sim 1)))
}
[void]$L.Add('')
[void]$L.Add('문턱(1등 유사도 미만이면 「건물 사진이 아닌 것 같아요」)마다 — 정상 사진을 남기는 비율 / 무관한 사진을 거르는 비율(품질 관문 포함)')
$best = $null
for($t = 0.30; $t -le 0.901; $t += 0.02){
  $keep = @($pos | Where-Object { $_.sim -ge $t }).Count
  $rej  = @($neg | Where-Object { $_.qBad -or $_.sim -lt $t }).Count
  $line = ('  {0:N2} : 정상 남김 {1} · 무관 거름 {2}' -f $t, (Pct $keep $pos.Count), (Pct $rej $neg.Count))
  foreach($c in ($neg | Group-Object cat)){ $line += (' · ' + $c.Name + ' ' + (Pct (@($c.Group | Where-Object { $_.qBad -or $_.sim -lt $t }).Count) $c.Count)) }
  [void]$L.Add($line)
  if($pos.Count -and ($keep / $pos.Count) -ge 0.98){ $best = [Math]::Round($t, 2) }
}
# AUROC — 무관한 사진(품질 통과)보다 정상 사진의 유사도가 높을 확률
$negOk = @($neg | Where-Object { -not $_.qBad }); $wins = 0.0
foreach($a in $pos){ foreach($b in $negOk){ if($a.sim -gt $b.sim){ $wins += 1 } elseif($a.sim -eq $b.sim){ $wins += 0.5 } } }
$auc = if($pos.Count -and $negOk.Count){ $wins / ($pos.Count * $negOk.Count) } else { 0 }
[void]$L.Add('')
[void]$L.Add(('AUROC (정상과 무관을 1등 유사도로 가르는 힘, 1 = 완벽) : {0:N3}' -f $auc))
[void]$L.Add(('정상 사진을 98% 이상 남기는 가장 높은 문턱 : {0}' -f $(if($null -ne $best){ $best } else { '없음' })))
[void]$L.Add('')
[void]$L.Add('한계 : 무관한 사진이 풍경 · 그림 · 화면 캡처뿐이다. 다른 건물의 복도 · 강의실처럼 「비슷하지만 다른 곳」은 이 묶음에 없다 — 그런 사진은 이 문턱으로 걸러지지 않을 수 있다.')
[void]$L.Add('사진마다 결과 : ' + $csv.Replace($ROOT + '\', ''))
$txt = Join-Path $ROOT '문서\AI_건물밖사진_측정.txt'
[IO.File]::WriteAllText($txt, ($L -join "`r`n") + "`r`n", (New-Object Text.UTF8Encoding($true)))
$L | ForEach-Object { $_ }
