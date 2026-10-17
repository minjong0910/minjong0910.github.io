# 3인 발표용 모의 발표 자료 두 벌 — 같은 작품, 다른 유형
#
#   pwsh -File 도구\발표_모의_만들기.ps1              (B·C 둘 다)
#   pwsh -File 도구\발표_모의_만들기.ps1 -Kind B
#
#   B : 이야기형 — 처음 온 사람의 길을 따라가며 (도구\발표_모의B_틀.html)
#   C : 질문형   — 교수님이 물으실 질문 13개에 차례로 답하며 (도구\발표_모의C_틀.html)
#   (A 는 교수님께 이미 보여 드린 도구\발표_캡스톤_틀.html — 손대지 않는다)
#
#   2026-10-17 : 졸업작품 발표를 한 사람이 아니라 셋이 파트를 나눠 하게 되었다.
#     조원에게 자료를 무작위로 나눠 모의 발표를 하려고, 유형이 다른 자료가 두 벌 더 필요했다.
#     두 자료 모두 1·2·3부로 나뉘고, 부마다 「다음 발표자에게 넘기는 말」이 있다.
#
#   하는 일 (발표_캡스톤_만들기.ps1 과 같은 방식)
#     ① 문서\도면.html 의 도면 5장을 그대로 가져와 <!--SVG:이름--> 자리에 끼운다 — 손으로 복사하지 않는다
#     ② 도면 글자 규칙(svg .lbl 등)이 틀에도 같은 값으로 있는지 대조한다
#     ③ data-pic="이름" 을 도구\발표그림\이름.jpg|png 의 base64 로 바꾼다 — PDF 를 영문 임시 경로에서 만들기 때문
#     ④ Edge 로 PDF 를 만들고 쪽 수를 센다 → 저장소 뿌리 + 바탕화면
#
#   ※ 고칠 때는 문서\발표_모의*.html 이 아니라 도구\발표_모의*_틀.html 을 고친다.
param([ValidateSet('전부','B','C')][string]$Kind = '전부')
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ROOT = Split-Path $PSScriptRoot -Parent
$SRC  = Join-Path $ROOT '문서\도면.html'
$PIC  = Join-Path $PSScriptRoot '발표그림'
$EDGE = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$DESK = [Environment]::GetFolderPath('Desktop')

$KINDS = @(
  @{ k='B'; tpl='발표_모의B_틀.html'; html='문서\발표_모의B.html'; pdf='캡스톤_발표_B_이야기형.pdf' }
  @{ k='C'; tpl='발표_모의C_틀.html'; html='문서\발표_모의C.html'; pdf='캡스톤_발표_C_질문형.pdf' }
)
$slot = @('구조도','블록도폰','블록도서버','흐름길안내','흐름갱신')

$src  = [IO.File]::ReadAllText($SRC, [Text.Encoding]::UTF8)
$svgs = @([regex]::Matches($src, '(?s)<svg viewBox.*?</svg>') | ForEach-Object { $_.Value })
if($svgs.Count -ne 5){ throw "도면이 5장이어야 하는데 $($svgs.Count)장입니다 — 문서\도면.html 을 확인하세요" }
$norm  = { param($x) ($x -replace '\s+', ' ').Trim() }
$rules = @([regex]::Matches($src, '(?m)^\s*svg\s+\.\w+\s*\{[^}]*\}') | ForEach-Object { & $norm $_.Value })
if($rules.Count -lt 5){ throw "문서\도면.html 에서 글자 규칙을 $($rules.Count)개밖에 못 찾았습니다" }

$TMP = Join-Path $env:TEMP ('b3nav_mock_' + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Force -Path $TMP | Out-Null
$bad = 0
try {
  foreach($K in $KINDS){
    if($Kind -ne '전부' -and $Kind -ne $K.k){ continue }
    Write-Host "`n━━ $($K.k) : $($K.tpl)"
    $tpl = [IO.File]::ReadAllText((Join-Path $PSScriptRoot $K.tpl), [Text.Encoding]::UTF8)

    # ② 글자 규칙 대조 — 도면의 <style> 은 안 가져오므로 틀에 같은 값이 있어야 한다
    $tplN = & $norm $tpl
    foreach($r in $rules){ if($tplN -notlike "*$r*"){ throw "틀에 이 도면 글자 규칙이 없거나 값이 다릅니다 : $r" } }

    # ① 도면 끼우기 — 다섯 장 모두 한 번씩 들어가야 한다
    for($i = 0; $i -lt 5; $i++){
      $mark = '<!--SVG:' + $slot[$i] + '-->'
      $cnt = ([regex]::Matches($tpl, [regex]::Escape($mark))).Count
      if($cnt -ne 1){ throw "틀에 $mark 자리가 $cnt 개입니다 (1개여야 함)" }
      $tpl = $tpl.Replace($mark, $svgs[$i])
    }
    Write-Host "  도면 5장 · 글자 규칙 $($rules.Count)가지 같음"

    # ③ 사진 넣기
    $used = @()
    foreach($m in @([regex]::Matches($tpl, '<img([^>]*?)data-pic="([^"]+)"([^>]*?)>'))){
      $name = $m.Groups[2].Value
      $file = @('jpg','png') | ForEach-Object { Join-Path $PIC ("$name.$_") } | Where-Object { Test-Path $_ } | Select-Object -First 1
      if(-not $file){ throw "발표그림에 없습니다 : $name" }
      $mime = if($file -like '*.png'){ 'image/png' } else { 'image/jpeg' }
      $b64  = [Convert]::ToBase64String([IO.File]::ReadAllBytes($file))
      $tpl  = $tpl.Replace($m.Value, '<img' + $m.Groups[1].Value + 'src="data:' + $mime + ';base64,' + $b64 + '"' + $m.Groups[3].Value + '>')
      $used += $name
    }
    Write-Host ("  사진 {0}장" -f $used.Count)

    if($tpl -match '<!--SVG:'){ Write-Host '  안 채워진 도면 자리가 남았습니다 ★' -ForegroundColor Red; $bad++ }
    $out = Join-Path $ROOT $K.html
    [IO.File]::WriteAllText($out, $tpl, (New-Object Text.UTF8Encoding($false)))
    $nSlide = ([regex]::Matches($tpl, '<section class="slide')).Count

    # ④ PDF — Edge 헤드리스는 한글 경로에서 실패하므로 영문 임시 경로에서 만든다
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
    $ok = ($nPage -eq $nSlide)
    if(-not $ok){ $bad++ }
    Write-Host ("  슬라이드 {0}장 → PDF {1}쪽 {2}  ({3:N0} KB)" -f $nSlide, $nPage, $(if($ok){'같음'}else{'다름 ★ — 넘친 쪽이 있다'}), ((Get-Item $tp).Length/1KB))
    Write-Host ("  → 바탕화면\{0}" -f $K.pdf)
  }
} finally {
  for($i = 0; $i -lt 10 -and (Test-Path -LiteralPath $TMP); $i++){ try { Remove-Item -LiteralPath $TMP -Recurse -Force -ErrorAction Stop } catch { Start-Sleep -Milliseconds 300 } }
}
if($bad){ Write-Host "`n확인 실패 $bad 건" -ForegroundColor Red; exit 1 }
Write-Host "`n완료" -ForegroundColor Green
