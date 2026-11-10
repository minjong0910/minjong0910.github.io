# 열어 둔 크롬 창에 명령을 보낸다 : JS 실행 → (기다림) → 사진
#   pwsh -File do.ps1 -Js "..." [-Shot 이름] [-WaitMs 800] [-Emu]
param([string]$Js = '', [string]$Shot = '', [int]$WaitMs = 600, [int]$Port = 9350, [switch]$Emu, [int]$W = 430, [int]$H = 900,
      [int]$Frames = 1, [int]$IntervalMs = 700, [string]$Sheet = '', [int]$Cols = 4, [string]$Plan = '')
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OUT = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) '생성물\걷기점검'
New-Item -ItemType Directory -Force $OUT | Out-Null
$tab = (Invoke-RestMethod "http://127.0.0.1:$Port/json") | Where-Object { $_.type -eq 'page' } | Select-Object -First 1
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
    do { $rb = New-Object byte[] 4194304; $r = $ws.ReceiveAsync([ArraySegment[byte]]::new($rb), [Threading.CancellationToken]::None).Result; $ms.Write($rb, 0, $r.Count) } while(-not $r.EndOfMessage)
    $j = [Text.Encoding]::UTF8.GetString($ms.ToArray()) | ConvertFrom-Json
    if($j.id -eq $script:id){ return $j }
  }
}
try {
  if($Emu){ Send 'Emulation.setDeviceMetricsOverride' @{ width = $W; height = $H; deviceScaleFactor = 2; mobile = $false } | Out-Null; 'emulation ' + $W + 'x' + $H }
  if($Js){
    $r = Send 'Runtime.evaluate' @{ expression = $Js; awaitPromise = $true; returnByValue = $true }
    if($r.result.exceptionDetails){ 'JS ERR : ' + $r.result.exceptionDetails.exception.description } else { [string]$r.result.result.value }
  }
  $files = @()
  if($Plan){
    # 계획표 : [{js, wait, name}] — 한 연결로 차례대로 실행하고 한 장씩 찍는다
    $steps = Get-Content $Plan -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach($st in $steps){
      if($st.js){ $r = Send 'Runtime.evaluate' @{ expression = $st.js; awaitPromise = $true; returnByValue = $true }
        if($r.result.exceptionDetails){ "$($st.name) JS ERR : " + $r.result.exceptionDetails.exception.description } elseif($r.result.result.value){ "$($st.name) : " + [string]$r.result.result.value } }
      if($st.name){
        Start-Sleep -Milliseconds ([int]($(if($st.wait){ $st.wait } else { 500 })))
        $s = Send 'Page.captureScreenshot' @{ format = 'jpeg'; quality = 85 }
        $p = Join-Path $OUT "$($st.name).jpg"; [IO.File]::WriteAllBytes($p, [Convert]::FromBase64String($s.result.data)); $files += $p
      }
    }
    if(-not $Shot){ $Shot = 'plan' }
    $Frames = 0
  }
  if($Shot){
    if($Frames){ Start-Sleep -Milliseconds $WaitMs }
    for($f = 0; $f -lt $Frames; $f++){
      if($f){ Start-Sleep -Milliseconds $IntervalMs }
      $s = Send 'Page.captureScreenshot' @{ format = 'jpeg'; quality = 85 }
      $name = if($Frames -gt 1){ '{0}_{1:D2}' -f $Shot, $f } else { $Shot }
      $p = Join-Path $OUT "$name.jpg"
      [IO.File]::WriteAllBytes($p, [Convert]::FromBase64String($s.result.data)); $files += $p
    }
    if($Frames -eq 1){ "shot $($files[0])" }
    if($Sheet){
      # 여러 장을 한 장에 — 각 장을 폭 360 으로 줄여 Cols 칸씩, 번호를 붙인다
      Add-Type -AssemblyName System.Drawing
      $imgs = $files | ForEach-Object { [Drawing.Image]::FromFile($_) }
      $tw = 360; $th = [int]($imgs[0].Height * $tw / $imgs[0].Width)
      $rows = [Math]::Ceiling($imgs.Count / $Cols)
      $bmp = New-Object Drawing.Bitmap ($tw * [Math]::Min($Cols, $imgs.Count)), ($th * $rows)
      $g = [Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = 'HighQualityBicubic'
      $font = New-Object Drawing.Font 'Arial', 16, ([Drawing.FontStyle]::Bold)
      for($k = 0; $k -lt $imgs.Count; $k++){
        $x = ($k % $Cols) * $tw; $y = [Math]::Floor($k / $Cols) * $th
        $g.DrawImage($imgs[$k], $x, $y, $tw, $th)
        $g.FillRectangle([Drawing.Brushes]::Black, $x, $y, 34, 26); $g.DrawString([string]$k, $font, [Drawing.Brushes]::Yellow, $x + 4, $y + 2)
      }
      $sp = Join-Path $OUT "$Sheet.jpg"; $bmp.Save($sp, [Drawing.Imaging.ImageFormat]::Jpeg)
      $g.Dispose(); $bmp.Dispose(); $imgs | ForEach-Object { $_.Dispose() }
      "sheet $sp ($($files.Count)장)"
    }
  }
} finally { try { $ws.Dispose() } catch {} }
