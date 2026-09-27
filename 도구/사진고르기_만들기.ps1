# 사진고르기_만들기.ps1 — 「사진 고르기」 화면을 만든다 (인터넷 주소로 열린다)
#
#   사진원본\ 의 사진 전부를 작은 미리보기로 구워 site\pick\ 에 담고,
#   장소별로 늘어놓은 고르기 화면(site\pick\index.html)을 만든다.
#   올리면 https://minjong0910.github.io/pick/ 으로 누구나 열 수 있다.
#
#   실행 : pwsh -File 도구\사진고르기_만들기.ps1
#          (이미 구운 미리보기는 건너뛴다. -Force 면 전부 다시 굽는다)
#
#   ※ site\pick\ 은 오프라인 저장 목록에서 빠져 있다(도구\오프라인목록.ps1 의 $SKIP).
#     앱 사용자가 이 사진까지 내려받는 일은 없다.
#
#   2026-09-28 에 두 가지를 바꿨다 (조원 한 분이 못 하게 되어 혼자 고르게 됨) :
#     ① 「가 / 나」로 나누던 것을 없애고 한 화면으로 합쳤다.
#     ② 장소마다 **그 폴더의 사진만** 고를 수 있던 것을, **전체 사진 어느 것이든**
#        가져다 넣을 수 있게 했다. 그래서 사진원본\ 에 폴더가 없는 곳
#        (문 외관 4곳처럼 다른 곳 사진을 빌려 쓰던 자리)도 이제 고를 수 있다.

param([switch]$Force)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$src  = Join-Path $root '사진원본'
$cur  = Join-Path $root 'site\data\photos'
$jsP  = Join-Path $root 'site\data\photos.js'
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

# 앱이 안내에서 쓰지만 사진원본\ 에 제 폴더가 없는 곳 — 다른 곳 사진을 빌려 쓰고 있다.
# 이 곳들이 예전 고르기 화면에는 아예 없어서 바꿀 방법이 없었다 (2026-09-28 에 넣음).
#   pick=$false 는 '고르는 자리는 아니지만 사진 창고로는 쓰는 곳'.
$앱전용 = [ordered]@{
  'GATE_MAIN_OUT'   = @{ label = '정문 외관 — 안내 ①「정문으로 들어오세요」'; floor = '외부' }
  'GATE_BACK_OUT'   = @{ label = '후문 외관 — 안내 ①「후문으로 들어오세요」'; floor = '외부' }
  'GATE_EAST_OUT'   = @{ label = '동문 외관 — 안내 ①「동문으로 들어오세요」'; floor = '외부' }
  'GATE_WEST_OUT'   = @{ label = '서문 외관 — 안내 ①「서문으로 들어오세요」'; floor = '외부' }
  'GATE_MAIN_WAY'   = @{ label = '정문에서 엘리베이터 쪽 — 정문 안내 ②';      floor = '1' }
  'GATE_BACK_STAIR' = @{ label = '후문 옆 지하 계단 — 존 안내 ②';             floor = '1' }
  'EV1EAST'         = @{ label = '1층 복도 — 동문 쪽으로 지나갈 때';          floor = '1' }
  'EV1WEST'         = @{ label = '1층 복도 — 서문 쪽으로 지나갈 때';          floor = '1' }
  'B1PATH'          = @{ label = '지하로 내려가는 통로 — 존 안내 ③';          floor = 'B1' }
  'B1WAY'           = @{ label = '크리에이티브 존 입구 — 존 안내';            floor = 'B1' }
  'BLD'             = @{ label = '건물 외부'; floor = '외부'; pick = $false }
}

function 장소이름($code){
  if($앱전용.Contains($code)){ return $앱전용[$code].label }
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
  if($code -eq 'KTC'){ return 'KTC 프로그래밍 동아리실' }
  if($code -eq 'GATE_BACK'){ return '후문 · 지하로 내려가는 계단' }
  if($code -eq 'GATE_E'){ return '동문으로 들어올 때 — 동문 안내 ②' }
  if($code -eq 'GATE_W'){ return '서문으로 들어올 때 — 서문 안내 ②' }
  return $code
}

# 층은 파일 이름 맨 앞('3층-', '지하1층-', '옥상-')에서 읽는다 — 코드로 추측하는 것보다 확실하다
function 층찾기($files, $code){
  if($앱전용.Contains($code)){ return $앱전용[$code].floor }
  foreach($f in $files){
    if($f -match '^0?_?(지하\s*1층|B1)'){ return 'B1' }
    if($f -match '^0?_?(\d)층'){ return $Matches[1] }
    if($f -match '^0?_?옥상'){ return 'R' }
  }
  if($code -match '^13(\d)'){ return $Matches[1] }
  return '기타'
}

# ── 지금 앱에 들어 있는 사진의 주소 ────────────────────────────
# photos.js 의 첫 장 u 를 그대로 읽는다. 문 외관처럼 **다른 곳 사진을 가리키는** 자리가 있어서
# 'site\data\photos\<코드>\01.jpg 이겠지' 하고 짐작하면 틀린다.
$js = Get-Content $jsP -Raw -Encoding utf8
$지금 = @{}
foreach($m in [regex]::Matches($js, '"([A-Za-z0-9_\-]+)":\[\{(.*?)\}')){
  $u = [regex]::Match($m.Groups[2].Value, '"u":"([^"]+)"')
  if($u.Success){ $지금[$m.Groups[1].Value] = $u.Groups[1].Value }
}

# ── 미리보기 굽기 + 목록 만들기 ────────────────────────────────
$codes = @(Get-ChildItem $src -Directory | ForEach-Object { $_.Name })
foreach($k in $앱전용.Keys){ if($codes -notcontains $k){ $codes += $k } }
$codes = @($codes | Sort-Object)

$places = @(); $baked = 0; $kept = 0
$i = 0
foreach($code in $codes){
  $i++
  Write-Progress -Activity '미리보기 굽는 중' -Status "$code  ($i / $($codes.Count))" -PercentComplete ($i * 100 / $codes.Count)
  $창고만 = $앱전용.Contains($code) -and $앱전용[$code].ContainsKey('pick') -and -not $앱전용[$code].pick
  # 고를 수 있는 사진은 사진원본\ 에 있는 것.
  # 창고로만 쓰는 곳(BLD 8장)은 사진원본\ 에 폴더가 없으므로 앱에 들어 있는 것을 쓴다.
  # 나머지 앱전용 자리는 제 사진이 없다 — 앱 폴더의 01.jpg 는 '지금 쓰는 사진'으로 이미 보여 주므로
  # 여기서 또 담으면 같은 사진이 두 번 나온다.
  $from = Join-Path $src $code
  if((-not (Test-Path $from)) -and $창고만){ $from = Join-Path $cur $code }
  $files = if(Test-Path $from){ @(Get-ChildItem $from -File -Filter *.jpg | Sort-Object Name) } else { @() }
  if($files.Count){
    $tdir = Join-Path $thumb $code
    if(-not (Test-Path $tdir)){ New-Item -ItemType Directory -Path $tdir -Force | Out-Null }
    foreach($f in $files){
      $to = Join-Path $tdir $f.Name
      if(-not $Force -and (Test-Path $to) -and ((Get-Item $to).LastWriteTime -ge $f.LastWriteTime)){ $kept++; continue }
      미리보기굽기 $f.FullName $to
      $baked++
    }
  }
  $names2 = @($files | ForEach-Object { $_.Name })
  $places += [pscustomobject]@{
    code  = $code
    label = (장소이름 $code)
    floor = (층찾기 $names2 $code)
    cur   = $(if($지금.ContainsKey($code)){ $지금[$code] } else { $null })   # 'data/photos/BLD/05.jpg' 같은 주소
    pick  = -not $창고만
    files = $names2
  }
}
Write-Progress -Activity '미리보기 굽는 중' -Completed

$json = $places | ConvertTo-Json -Depth 6 -Compress
$html = Get-Content (Join-Path $PSScriptRoot '사진고르기_틀.html') -Raw -Encoding utf8
$html = $html.Replace('/*__DATA__*/', $json)
[System.IO.File]::WriteAllText((Join-Path $out 'index.html'), $html, (New-Object System.Text.UTF8Encoding $true))

$고를곳 = @($places | Where-Object { $_.pick })
$total  = ($places | ForEach-Object { $_.files.Count } | Measure-Object -Sum).Sum
$mb     = (Get-ChildItem $thumb -Recurse -File | Measure-Object Length -Sum).Sum / 1MB
Write-Output ("  사진 고르기 화면을 만들었습니다 — 고를 곳 {0}곳 · 사진 {1}장 (창고로만 쓰는 곳 {2}곳 포함)" -f $고를곳.Count, $total, ($places.Count - $고를곳.Count))
Write-Output ("  미리보기 : 새로 구운 것 {0}장 · 그대로 둔 것 {1}장 · 모두 {2:N0} MB" -f $baked, $kept, $mb)
Write-Output  "  올린 뒤 주소 : https://minjong0910.github.io/pick/"
