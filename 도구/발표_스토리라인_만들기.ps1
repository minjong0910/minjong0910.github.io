# 졸업작품 발표 — 교수님이 주신 「발표자료 스토리라인 예시」를 따른 자료
#
#   pwsh -File 도구\발표_스토리라인_만들기.ps1              (둘 다)
#   pwsh -File 도구\발표_스토리라인_만들기.ps1 -Type 2      (1 · 2 · 3 중 하나만)
#   → 문서\발표_*.html · 캡스톤_발표_*.pdf (저장소 뿌리 + 바탕화면)
#
#   1 : 표준형 11장 (도구\발표_표준형_틀.html)
#       표지 · 개요 · 배경 · 문제(As-Is) · 솔루션(To-Be) · 아키텍처 · 핵심 기능 · 시연 · 기대 효과 · 결론 · Q&A
#   2 : 해결형 12장 (도구\발표_해결형_틀.html) — 문제 해결 과정을 강조하는 이야기 구성
#       표지 · 들어가며 · 문제점 · 해결 아이디어 · 설계 및 구현 · 시연 + 기능 1 · 기능 2 · 변화 · 발전 방향 · 마무리 · Q&A
#   3 : 가치형 10장 (도구\발표_가치형_틀.html) — 서비스가 주는 가치와 혜택 (IR 발표형)
#       표지 · Intro · Our Solution · How it works · Live DEMO · 핵심 가치 1 · 핵심 가치 2 · 활용과 확장 · Summary · Q&A
#   실제 발표용 표준 구성이라 구조도·앱 화면·측정 수치를 쓴다 (모의 발표 자료의 금지 조건과 다르다).
#
#   하는 일
#     ① 틀에 <!--SVG:구조도--> 가 있으면 문서\도면.html 의 구조도를 끼운다 — 도면 글자 규칙도 대조
#     ② 사진 : data-pic="이름"(도구\발표그림) · data-photo="site:…"(site\data\photos) · data-qr="정문_MAIN.png"(QR인쇄)
#        사진은 줄여서 박고, QR 은 줄이면 못 읽을 수 있어 PNG 그대로 박는다.
#     ③ Edge 로 PDF, 쪽 수가 정해진 장 수와 같은지 센다
#
#   ※ 고칠 때는 문서\발표_*.html 이 아니라 도구\발표_*_틀.html 을 고친다.
param([ValidateSet('전부','1','2','3')][string]$Type = '전부')
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing
$ROOT = Split-Path $PSScriptRoot -Parent
$EDGE = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$DESK = [Environment]::GetFolderPath('Desktop')

$DECKS = @(
  @{ k='1'; tpl='발표_표준형_틀.html'; html='문서\발표_표준형.html'; pdf='캡스톤_발표_표준형.pdf'; n=11 }
  @{ k='2'; tpl='발표_해결형_틀.html'; html='문서\발표_해결형.html'; pdf='캡스톤_발표_해결형.pdf'; n=12 }
  @{ k='3'; tpl='발표_가치형_틀.html'; html='문서\발표_가치형.html'; pdf='캡스톤_발표_가치형.pdf'; n=10 }
)

function Shrink([string]$path){
  $im = [Drawing.Image]::FromFile($path)
  try{
    try{ $o = $im.GetPropertyItem(0x0112).Value[0]
         if($o -eq 6){ $im.RotateFlip('Rotate90FlipNone') } elseif($o -eq 8){ $im.RotateFlip('Rotate270FlipNone') } elseif($o -eq 3){ $im.RotateFlip('Rotate180FlipNone') } }catch{}
    $sc = [Math]::Min(1.0, 1200.0 / [Math]::Max($im.Width, $im.Height))
    $w = [int]($im.Width * $sc); $h = [int]($im.Height * $sc)
    $bmp = New-Object Drawing.Bitmap $w, $h
    $g = [Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = 'HighQualityBicubic'; $g.DrawImage($im, 0, 0, $w, $h); $g.Dispose()
    $enc = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $ps = New-Object Drawing.Imaging.EncoderParameters 1
    $ps.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality), ([long]85)
    $ms = New-Object IO.MemoryStream; $bmp.Save($ms, $enc, $ps); $bmp.Dispose()
    return 'data:image/jpeg;base64,' + [Convert]::ToBase64String($ms.ToArray())
  } finally { $im.Dispose() }
}

$TMP = Join-Path $env:TEMP ('b3nav_story_' + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Force -Path $TMP | Out-Null
$bad = 0
try{
  foreach($D in $DECKS){
    if($Type -ne '전부' -and $Type -ne $D.k){ continue }
    Write-Host "`n━━ Type $($D.k) : $($D.tpl)"
    $tpl = [IO.File]::ReadAllText((Join-Path $PSScriptRoot $D.tpl), [Text.Encoding]::UTF8)

    # ① 구조도 (자리가 있을 때만)
    $nSvg = ([regex]::Matches($tpl, '<!--SVG:구조도-->')).Count
    if($nSvg -gt 1){ throw '틀에 <!--SVG:구조도--> 자리가 둘 이상입니다' }
    if($nSvg -eq 1){
      $src  = [IO.File]::ReadAllText((Join-Path $ROOT '문서\도면.html'), [Text.Encoding]::UTF8)
      $svgs = @([regex]::Matches($src, '(?s)<svg viewBox.*?</svg>') | ForEach-Object { $_.Value })
      if($svgs.Count -ne 5){ throw "문서\도면.html 의 도면이 5장이 아닙니다 : $($svgs.Count)" }
      $norm  = { param($x) ($x -replace '\s+', ' ').Trim() }
      $rules = @([regex]::Matches($src, '(?m)^\s*svg\s+\.\w+\s*\{[^}]*\}') | ForEach-Object { & $norm $_.Value })
      $tplN = & $norm $tpl
      foreach($r in $rules){ if($tplN -notlike "*$r*"){ throw "틀에 도면 글자 규칙이 없거나 값이 다릅니다 : $r" } }
      $tpl = $tpl.Replace('<!--SVG:구조도-->', $svgs[0])
      Write-Host "  구조도 · 글자 규칙 $($rules.Count)가지 같음"
    }

    # ② 사진
    $n = 0
    foreach($m in @([regex]::Matches($tpl, '<img([^>]*?)data-(pic|photo|qr)="([^"]+)"([^>]*?)>'))){
      $how = $m.Groups[2].Value; $ref = $m.Groups[3].Value
      switch($how){
        'pic'   { $file = @('jpg','png') | ForEach-Object { Join-Path $PSScriptRoot "발표그림\$ref.$_" } | Where-Object { Test-Path $_ } | Select-Object -First 1 }
        'photo' { $file = Join-Path $ROOT ('site\data\photos\' + ($ref -replace '^site:','' -replace '/','\')) }
        'qr'    { $file = Join-Path $ROOT "QR인쇄\$ref" }
      }
      if(-not $file -or -not (Test-Path -LiteralPath $file)){ throw "사진이 없습니다 : $ref" }
      $data = if($how -eq 'qr'){ 'data:image/png;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes($file)) } else { Shrink $file }
      $tpl = $tpl.Replace($m.Value, '<img' + $m.Groups[1].Value + 'src="' + $data + '"' + $m.Groups[4].Value + '>')
      $n++
    }
    Write-Host "  사진 $n 장"
    [IO.File]::WriteAllText((Join-Path $ROOT $D.html), $tpl, (New-Object Text.UTF8Encoding($false)))

    # ③ PDF — Edge 헤드리스는 한글 경로에서 실패하므로 영문 임시 경로에서 만든다
    $th = Join-Path $TMP ($D.k + '.html'); $tp = Join-Path $TMP ($D.k + '.pdf')
    [IO.File]::WriteAllText($th, $tpl, (New-Object Text.UTF8Encoding($false)))
    & $EDGE --headless=new --disable-gpu --no-first-run "--user-data-dir=$(Join-Path $TMP 'profile')" --no-pdf-header-footer `
            --virtual-time-budget=15000 "--print-to-pdf=$tp" ('file:///' + ($th -replace '\\','/')) 2>$null | Out-Null
    $tries = 0; while(-not (Test-Path $tp) -and $tries -lt 40){ Start-Sleep -Milliseconds 250; $tries++ }
    if(-not (Test-Path $tp)){ throw "PDF 가 만들어지지 않았습니다 : $($D.pdf)" }
    $nPage  = ([regex]::Matches([Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes($tp)), '/Type\s*/Page[^s]')).Count
    $nSlide = ([regex]::Matches($tpl, '<section class="slide')).Count
    Copy-Item $tp (Join-Path $ROOT $D.pdf) -Force
    Copy-Item $tp (Join-Path $DESK $D.pdf) -Force
    Write-Host ("  슬라이드 {0}장 → PDF {1}쪽  ({2:N0} KB)  → 바탕화면\{3}" -f $nSlide, $nPage, ((Get-Item $tp).Length/1KB), $D.pdf)
    if($nPage -ne $nSlide -or $nSlide -ne $D.n){ Write-Host "  ★ $($D.n)쪽이 아닙니다 — 넘친 쪽이 있거나 순서가 빠졌습니다" -ForegroundColor Red; $bad++ }
  }
} finally {
  for($i = 0; $i -lt 10 -and (Test-Path -LiteralPath $TMP); $i++){ try { Remove-Item -LiteralPath $TMP -Recurse -Force -ErrorAction Stop } catch { Start-Sleep -Milliseconds 300 } }
}
if($bad){ exit 1 }
Write-Host "`n완료" -ForegroundColor Green
