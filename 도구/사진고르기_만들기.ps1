# 사진고르기_만들기.ps1 — 「사진 고르기」 화면을 만든다 (인터넷 주소로 열린다)
#
#   사진원본\ 의 사진 전부를 작은 미리보기로 구워 site\pick\ 에 담고,
#   장소별로 늘어놓은 고르기 화면(site\pick\index.html)을 만든다.
#   올리면 https://minjong0910.github.io/pick/ 으로 누구나 열 수 있다 —
#   조원들이 각자 컴퓨터·휴대폰에서 고르고, 「고른 것 저장 ↓」으로 받은 파일을 보내 주면 된다.
#
#   실행 : pwsh -File 도구\사진고르기_만들기.ps1
#          (이미 구운 미리보기는 건너뛴다. -Force 면 전부 다시 굽는다)
#
#   ※ site\pick\ 은 오프라인 저장 목록에서 빠져 있다(도구\오프라인목록.ps1 의 $SKIP).
#     앱 사용자가 이 사진까지 내려받는 일은 없다.

param([switch]$Force)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$src  = Join-Path $root '사진원본'
$cur  = Join-Path $root 'site\data\photos'
$out  = Join-Path $root 'site\pick'
$thumb= Join-Path $out '사진'
$LONG = 480      # 미리보기 긴 변 — 고르기에 충분하면서 가볍다
$Q    = 72

if(-not (Test-Path $thumb)){ New-Item -ItemType Directory -Path $thumb -Force | Out-Null }

$enc  = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$pars = New-Object System.Drawing.Imaging.EncoderParameters 1
$pars.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([int]$Q)

function 미리보기굽기($from, $to){
  $im = [System.Drawing.Image]::FromFile($from)
  try{
    if($im.PropertyIdList -contains 0x0112){
      switch([int]$im.GetPropertyItem(0x0112).Value[0]){
        3 { $im.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
        6 { $im.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
        8 { $im.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
      }
    }
    $r = [Math]::Min(1.0, $LONG / [Math]::Max($im.Width, $im.Height))
    $w = [int][Math]::Round($im.Width * $r); $h = [int][Math]::Round($im.Height * $r)
    $bm = New-Object System.Drawing.Bitmap $w, $h
    $g  = [System.Drawing.Graphics]::FromImage($bm)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($im, (New-Object System.Drawing.Rectangle 0, 0, $w, $h))
    $g.Dispose(); $bm.Save($to, $enc, $pars); $bm.Dispose()
  } finally { $im.Dispose() }
}

# ── 방 이름표 ───────────────────────────────────────────────
$names = (Get-Content (Join-Path $root '도구\방이름.json') -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable)['이름']

function 장소이름($code){
  if($names.ContainsKey($code)){ return $names[$code] }
  if($code -match '^HALL(\d)([LR])$'){ return "$($Matches[1])층 " + $(if($Matches[2] -eq 'L'){'왼쪽'}else{'오른쪽'}) + " 복도" }
  if($code -match '^EVIN(\d)$'){ return "$($Matches[1])층 엘리베이터 안" }
  if($code -match '^EV(\d)$'){   return "$($Matches[1])층 엘리베이터 앞" }
  if($code -eq 'EVB1'){ return '지하 1층 엘리베이터' }
  if($code -match '^WC(\d)$'){   return "$($Matches[1])층 화장실 앞" }
  if($code -match '^SIGN(\d)$'){ return "$($Matches[1])층 비상대피 안내판" }
  if($code -match '^LNG(\d)$'){  return $(if($Matches[1] -eq '1'){'1층 로비'}else{"$($Matches[1])층 라운지"}) }
  if($code -match '^WIN(\d)([LR])?$'){ return "$($Matches[1])층 창밖" + $(if($Matches[2] -eq 'L'){' (왼쪽)'}elseif($Matches[2] -eq 'R'){' (오른쪽)'}else{''}) }
  if($code -match '^EMS(\d)$'){  return "$($Matches[1])층 비상계단" }
  if($code -eq 'ES1'){ return '1층 중앙계단' }
  if($code -eq 'B1'){  return '지하 1층 크리에이티브 존' }
  if($code -eq 'KTC'){ return 'KTC 동아리실' }
  if($code -eq 'GATE_BACK'){ return '후문 · 지하로 내려가는 계단' }
  if($code -eq 'GATE_E'){ return '동문으로 들어올 때' }
  if($code -eq 'GATE_W'){ return '서문으로 들어올 때' }
  return $code
}

# 층은 파일 이름 맨 앞('3층-', '지하1층-', '옥상-')에서 읽는다 — 코드로 추측하는 것보다 확실하다
function 층찾기($files, $code){
  foreach($f in $files){
    if($f -match '^0?_?(지하\s*1층|B1)'){ return 'B1' }
    if($f -match '^0?_?(\d)층'){ return $Matches[1] }
    if($f -match '^0?_?옥상'){ return 'R' }
  }
  if($code -match '^13(\d)'){ return $Matches[1] }
  return '기타'
}

# ── 미리보기 굽기 + 목록 만들기 ────────────────────────────────
$places = @(); $baked = 0; $kept = 0
$dirs = @(Get-ChildItem $src -Directory | Sort-Object Name)
$i = 0
foreach($d in $dirs){
  $i++
  Write-Progress -Activity '미리보기 굽는 중' -Status "$($d.Name)  ($i / $($dirs.Count))" -PercentComplete ($i * 100 / $dirs.Count)
  $code  = $d.Name
  $files = @(Get-ChildItem $d.FullName -File -Filter *.jpg | Sort-Object Name)
  if(-not $files.Count){ continue }
  $tdir = Join-Path $thumb $code
  if(-not (Test-Path $tdir)){ New-Item -ItemType Directory -Path $tdir -Force | Out-Null }
  foreach($f in $files){
    $to = Join-Path $tdir $f.Name
    if(-not $Force -and (Test-Path $to) -and ((Get-Item $to).LastWriteTime -ge $f.LastWriteTime)){ $kept++; continue }
    미리보기굽기 $f.FullName $to
    $baked++
  }
  $curFile = $null
  $curDir  = Join-Path $cur $code
  if(Test-Path $curDir){ $curFile = (Get-ChildItem $curDir -File -Filter *.jpg | Sort-Object Name | Select-Object -First 1).Name }
  $names2 = @($files | ForEach-Object { $_.Name })
  $places += [pscustomobject]@{
    code = $code; label = (장소이름 $code); floor = (층찾기 $names2 $code)
    cur = $curFile; files = $names2
  }
}
Write-Progress -Activity '미리보기 굽는 중' -Completed

# 건물 외부(BLD)는 여기서 뺀다 — 정문·후문·동문·서문의 안/밖 8장이 자리마다 정해진 한 묶음이라
# '한 장 고르기'가 성립하지 않는다. 바꿔야 하면 따로 말씀해 주시면 그 자리만 바꾼다.

$json = $places | ConvertTo-Json -Depth 6 -Compress
$html = Get-Content (Join-Path $PSScriptRoot '사진고르기_틀.html') -Raw -Encoding utf8
$html = $html.Replace('/*__DATA__*/', $json)
[System.IO.File]::WriteAllText((Join-Path $out 'index.html'), $html, (New-Object System.Text.UTF8Encoding $true))

$total = ($places | ForEach-Object { $_.files.Count } | Measure-Object -Sum).Sum
$mb    = (Get-ChildItem $thumb -Recurse -File | Measure-Object Length -Sum).Sum / 1MB
Write-Output ("  사진 고르기 화면을 만들었습니다 — 장소 {0}곳 · 사진 {1}장" -f $places.Count, $total)
Write-Output ("  미리보기 : 새로 구운 것 {0}장 · 그대로 둔 것 {1}장 · 모두 {2:N0} MB" -f $baked, $kept, $mb)
Write-Output  "  올린 뒤 주소 : https://minjong0910.github.io/pick/"
