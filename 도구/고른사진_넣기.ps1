# 고른사진_넣기.ps1 — 사람이 고른 사진을 앱에 넣는다
#
#   사진고르기.html 에서 「고른 것 저장 ↓」 으로 받은 고른사진.txt 를 읽어,
#   사진원본\ 의 그 사진을 앱 크기(긴 변 900)로 구워 site\data\photos\<코드>\01.jpg 로 넣고
#   site\data\photos.js 의 이름표도 함께 고친다.
#
#   실행 : pwsh -File 도구\고른사진_넣기.ps1 -Pick "...\고른사진_가.txt","...\고른사진_나.txt"
#          (두 사람이 나눠 골랐으면 두 파일을 한 번에 준다. 안 주면 내려받기 폴더에서 고른사진*.txt 를 찾는다)
#   한 뒤 : pwsh -File 도구\오프라인목록.ps1   →   pwsh -File 검사.ps1 -Full

param([string[]]$Pick = @(), [switch]$WhatIfOnly)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$src  = Join-Path $root '사진원본'
$dst  = Join-Path $root 'site\data\photos'
$jsP  = Join-Path $root 'site\data\photos.js'
$LONG = 900          # 긴 변 길이 — 지금 앱에 들어 있는 사진과 같은 기준
$Q    = 82           # JPEG 품질

if(-not $Pick.Count){
  $Pick = @(Get-ChildItem (Join-Path $env:USERPROFILE 'Downloads') -File -Filter '고른사진*.txt' -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime | ForEach-Object { $_.FullName })
  $Pick += @(Get-ChildItem $root -File -Filter '고른사진*.txt' -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
}
$Pick = @($Pick | Where-Object { Test-Path $_ })
if(-not $Pick.Count){ throw "고른사진*.txt 를 찾지 못했습니다. -Pick 으로 경로를 알려주세요." }
$Pick | ForEach-Object { Write-Output "  고른 목록 : $_" }

$names = (Get-Content (Join-Path $root '도구\방이름.json') -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable)['이름']

# ── JPEG 굽기 (EXIF 방향 반영 · 긴 변 $LONG · 품질 $Q) ──────────────
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$pars = New-Object System.Drawing.Imaging.EncoderParameters 1
$pars.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([int]$Q)

function 굽기($from, $to){
  $im = [System.Drawing.Image]::FromFile($from)
  try{
    # 사진을 세운 방향 그대로 — 폰으로 찍으면 EXIF 에만 방향이 적혀 있는 경우가 있다
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
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($im, (New-Object System.Drawing.Rectangle 0, 0, $w, $h))
    $g.Dispose()
    $bm.Save($to, $enc, $pars)
    $bm.Dispose()
    return "$w x $h"
  } finally { $im.Dispose() }
}

# ── 고른 목록 읽기 ──────────────────────────────────────────────
$map = [ordered]@{}          # 같은 곳이 두 파일에 겹치면 나중 파일이 이긴다
foreach($file in $Pick){
  foreach($line in (Get-Content $file -Encoding utf8)){
    if($line -match '^\s*(#|$)'){ continue }
    $p = $line -split "`t", 2
    if($p.Count -lt 2){ Write-Warning "건너뜀(형식이 이상함) : $line"; continue }
    $map[$p[0].Trim()] = $p[1].Trim()
  }
}
$picks = @($map.Keys | ForEach-Object { [pscustomobject]@{ code = $_; file = $map[$_] } })
Write-Output "  적힌 장소 : $($picks.Count) 곳"

# ── 넣기 ───────────────────────────────────────────────────────
$js = Get-Content $jsP -Raw -Encoding utf8
$done = 0; $same = 0; $miss = @()

foreach($p in $picks){
  if($p.file -eq '(그대로)'){ $same++; continue }
  $from = Join-Path (Join-Path $src $p.code) $p.file
  if(-not (Test-Path $from)){ $miss += "$($p.code) : $($p.file)"; continue }
  $outDir = Join-Path $dst $p.code
  if(-not (Test-Path $outDir)){ New-Item -ItemType Directory -Path $outDir | Out-Null }
  $to = Join-Path $outDir '01.jpg'
  if($WhatIfOnly){ Write-Output "    (시늉) $($p.code) ← $($p.file)"; $done++; continue }
  $tmp = "$to.tmp"
  $size = 굽기 $from $tmp
  Move-Item -Force $tmp $to
  # 이름표(n) — 방 이름이 있는 곳은 앱이 읽는 형식으로 맞춰 둔다
  $nm = if($names.ContainsKey($p.code)){ $names[$p.code] } else { $null }
  if($nm){
    $newN = "1. $($p.code)_$nm-1.jpg"
    $pat  = '"' + [regex]::Escape($p.code) + '":\[\{"n":"[^"]*"'
    $js   = [regex]::Replace($js, $pat, ('"' + $p.code + '":[{"n":"' + $newN.Replace('$','$$') + '"'))
  }
  Write-Output ("    {0,-10} ← {1}  ({2})" -f $p.code, $p.file, $size)
  $done++
}

if(-not $WhatIfOnly){ [System.IO.File]::WriteAllText($jsP, $js, (New-Object System.Text.UTF8Encoding $false)) }

Write-Output ""
Write-Output "  바꾼 사진 $done 장 · 그대로 둔 곳 $same 곳"
if($miss.Count){
  Write-Output "  ※ 원본을 못 찾은 곳 $($miss.Count) 곳 :"
  $miss | ForEach-Object { Write-Output "     $_" }
}
Write-Output ""
Write-Output "  다음 : pwsh -File 도구\오프라인목록.ps1   →   pwsh -File 검사.ps1 -Full"
