# 3인 모의 발표 자료 두 벌 — 같은 작품, 기존 캡스톤 자료(A)와 전혀 다른 자료
#
#   pwsh -File 도구\발표_모의_만들기.ps1              (둘 다)
#   pwsh -File 도구\발표_모의_만들기.ps1 -Kind 1
#
#   1 : 이용자편 — 누가 헤매나 · 무엇이 달라지나 · 졸업 뒤에도 (도구\발표_모의1_틀.html)
#   2 : 제작기편 — 세 사람의 여덟 달 · 사진을 모으다 · 부딪히고 배운 것 (도구\발표_모의2_틀.html)
#
#   2026-10-17 사용자가 정한 조건 (첫 판 B·C 는 조건을 잘못 읽어 버렸다)
#     ① 두 자료 모두 15쪽 이내
#     ② 기존 자료(도구\발표_캡스톤_틀.html)와 비슷하거나 같은 내용이 없어야 한다
#     ③ 정확도 같은 측정 수치는 넣지 않는다
#     ④ 구조도 · 블록도 · 흐름도는 넣지 않는다
#     ⑤ 간단하지만 압축된 내용
#     ⑥ 두 자료끼리도 다루는 내용과 형식이 겹치면 안 된다
#        (1 은 이용자·서비스 쪽, 2 는 만든 과정 쪽 — 앱 사용 화면은 둘 다 쓰지 않는다)
#   ①③④ 와 ② 의 일부(기존 자료의 그림을 다시 쓰지 않음)는 아래에서 기계로 막는다.
#
#   사진
#     data-pic="이름"            → 도구\발표그림\이름.jpg|png
#     data-photo="site:EMS3/01.jpg" → site\data\photos\EMS3\01.jpg
#     data-photo="raw:HALL5L/파일"  → 사진원본\HALL5L\파일
#     폰 원본은 4000px 이 넘으므로 긴 변 1100px · JPEG 82 로 줄이고 EXIF 방향을 바로잡아 base64 로 박는다.
#
#   ※ 고칠 때는 문서\발표_모의*.html 이 아니라 도구\발표_모의*_틀.html 을 고친다.
param([ValidateSet('전부','1','2')][string]$Kind = '전부')
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing
$ROOT = Split-Path $PSScriptRoot -Parent
$PIC  = Join-Path $PSScriptRoot '발표그림'
$EDGE = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$DESK = [Environment]::GetFolderPath('Desktop')
$MAXPAGE = 15

$KINDS = @(
  @{ k='1'; tpl='발표_모의1_틀.html'; html='문서\발표_모의1.html'; pdf='캡스톤_발표_1_이용자편.pdf' }
  @{ k='2'; tpl='발표_모의2_틀.html'; html='문서\발표_모의2.html'; pdf='캡스톤_발표_2_제작기편.pdf' }
)

# ③ 기존 자료의 측정 수치 — 이것들이 보이면 멈춘다
$BANNED_NUM = @('55.6','92.9','64.7','34.6','28.2','66.8','97.8','87.5','73.8','95.1','84.9','%p','신뢰구간','95% 구간')
# ② · ④ 기존 자료에서 가져오면 안 되는 그림과 도면
$BANNED_PIC = @('흐름0','흐름1','증거1_','증거2_','증거3_','측정1_','측정2_','그림_개념도','그림_격차곡선')
$BANNED_TXT = @('구조도','블록도','흐름도','<!--SVG:')

function Shrink([string]$path){
  $im = [Drawing.Image]::FromFile($path)
  try{
    try{ $o = $im.GetPropertyItem(0x0112).Value[0]
         if($o -eq 6){ $im.RotateFlip('Rotate90FlipNone') } elseif($o -eq 8){ $im.RotateFlip('Rotate270FlipNone') } elseif($o -eq 3){ $im.RotateFlip('Rotate180FlipNone') } }catch{}
    $sc = [Math]::Min(1.0, 1100.0 / [Math]::Max($im.Width, $im.Height))
    $w = [int]($im.Width * $sc); $h = [int]($im.Height * $sc)
    $bmp = New-Object Drawing.Bitmap $w, $h
    $g = [Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = 'HighQualityBicubic'; $g.DrawImage($im, 0, 0, $w, $h); $g.Dispose()
    $enc = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $ps = New-Object Drawing.Imaging.EncoderParameters 1
    $ps.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality), ([long]82)
    $ms = New-Object IO.MemoryStream
    $bmp.Save($ms, $enc, $ps); $bmp.Dispose()
    return [Convert]::ToBase64String($ms.ToArray())
  } finally { $im.Dispose() }
}

$TMP = Join-Path $env:TEMP ('b3nav_mock_' + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Force -Path $TMP | Out-Null
$bad = 0
try {
  foreach($K in $KINDS){
    if($Kind -ne '전부' -and $Kind -ne $K.k){ continue }
    Write-Host "`n━━ $($K.k) : $($K.tpl)"
    $tpl = [IO.File]::ReadAllText((Join-Path $PSScriptRoot $K.tpl), [Text.Encoding]::UTF8)

    # 조건 대조 — 글자로 보이는 부분만 본다 (주석 · style 은 뺀다)
    $vis = [regex]::Replace($tpl, '(?s)<!--.*?-->|<style.*?</style>', '')
    $vis = [regex]::Replace($vis, '<[^>]+>', ' ')
    foreach($b in $BANNED_NUM){ if($vis.Contains($b)){ Write-Host "  ★ 측정 수치가 있습니다 : $b" -ForegroundColor Red; $bad++ } }
    foreach($b in $BANNED_TXT){
      $hit = if($b -eq '<!--SVG:'){ $tpl.Contains($b) } else { $vis.Contains($b) }
      if($hit){ Write-Host "  ★ 도면이나 도면 이름이 있습니다 : $b" -ForegroundColor Red; $bad++ }
    }
    foreach($m in @([regex]::Matches($tpl, 'data-pic="([^"]+)"'))){ foreach($b in $BANNED_PIC){ if($m.Groups[1].Value.StartsWith($b)){ Write-Host "  ★ 기존 자료의 그림입니다 : $($m.Groups[1].Value)" -ForegroundColor Red; $bad++ } } }

    # 사진 넣기
    $n = 0
    foreach($m in @([regex]::Matches($tpl, '<img([^>]*?)data-(pic|photo)="([^"]+)"([^>]*?)>'))){
      $src = $m.Groups[2].Value; $ref = $m.Groups[3].Value   # $kind 는 -Kind 매개변수와 같은 변수라 쓰면 안 된다
      if($src -eq 'pic'){
        $file = @('jpg','png') | ForEach-Object { Join-Path $PIC "$ref.$_" } | Where-Object { Test-Path $_ } | Select-Object -First 1
      } elseif($ref -like 'site:*'){
        $file = Join-Path $ROOT ('site\data\photos\' + ($ref.Substring(5) -replace '/','\'))
      } elseif($ref -like 'raw:*'){
        $file = Join-Path $ROOT ('사진원본\' + ($ref.Substring(4) -replace '/','\'))
      } else { $file = $null }
      if(-not $file -or -not (Test-Path -LiteralPath $file)){ throw "사진이 없습니다 : $ref" }
      $b64 = Shrink $file
      $tpl = $tpl.Replace($m.Value, '<img' + $m.Groups[1].Value + 'src="data:image/jpeg;base64,' + $b64 + '"' + $m.Groups[4].Value + '>')
      $n++
    }
    Write-Host ("  사진 {0}장" -f $n)

    $out = Join-Path $ROOT $K.html
    [IO.File]::WriteAllText($out, $tpl, (New-Object Text.UTF8Encoding($false)))
    $nSlide = ([regex]::Matches($tpl, '<section class="slide')).Count

    # PDF — Edge 헤드리스는 한글 경로에서 실패하므로 영문 임시 경로에서 만든다
    $th = Join-Path $TMP ($K.k + '.html'); $tp = Join-Path $TMP ($K.k + '.pdf')
    [IO.File]::WriteAllText($th, $tpl, (New-Object Text.UTF8Encoding($false)))
    & $EDGE --headless=new --disable-gpu --no-first-run "--user-data-dir=$(Join-Path $TMP 'profile')" --no-pdf-header-footer `
            --virtual-time-budget=15000 "--print-to-pdf=$tp" ('file:///' + ($th -replace '\\','/')) 2>$null | Out-Null
    $tries = 0; while(-not (Test-Path $tp) -and $tries -lt 40){ Start-Sleep -Milliseconds 250; $tries++ }
    if(-not (Test-Path $tp)){ throw "PDF 가 만들어지지 않았습니다 : $($K.pdf)" }
    $pdfText = [Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes($tp))
    $nPage = ([regex]::Matches($pdfText, '/Type\s*/Page[^s]')).Count
    Copy-Item $tp (Join-Path $ROOT $K.pdf) -Force
    Copy-Item $tp (Join-Path $DESK $K.pdf) -Force
    if($nPage -ne $nSlide){ Write-Host '  ★ 넘친 쪽이 있습니다' -ForegroundColor Red; $bad++ }
    if($nPage -gt $MAXPAGE){ Write-Host "  ★ $MAXPAGE 쪽을 넘습니다" -ForegroundColor Red; $bad++ }
    Write-Host ("  슬라이드 {0}장 → PDF {1}쪽  ({2:N0} KB)  → 바탕화면\{3}" -f $nSlide, $nPage, ((Get-Item $tp).Length/1KB), $K.pdf)
  }
} finally {
  for($i = 0; $i -lt 10 -and (Test-Path -LiteralPath $TMP); $i++){ try { Remove-Item -LiteralPath $TMP -Recurse -Force -ErrorAction Stop } catch { Start-Sleep -Milliseconds 300 } }
}
if($bad){ Write-Host "`n조건 확인 실패 $bad 건" -ForegroundColor Red; exit 1 }
Write-Host "`n조건 확인 통과 — 15쪽 이내 · 측정 수치 없음 · 도면 없음 · 기존 그림 없음" -ForegroundColor Green
