# 캡스톤 발표 자료 만들기 — 도구\발표_캡스톤_틀.html + 문서\도면.html 의 도면 5장
#                                              →  문서\발표_캡스톤.html
#
#   pwsh -File 도구\발표_캡스톤_만들기.ps1
#
# 왜 이렇게 만드나
#   발표 자료에 들어가는 구조도·블록도·흐름도는 문서\도면.html 에 있는 것과
#   **같은 그림이어야 한다.** 손으로 복사해 두면 도면을 고쳤을 때 발표 자료만 옛 그림이 된다
#   (바탕화면 사본이 묵었던 것과 같은 함정). 그래서 돌릴 때마다 원본에서 가져온다.
#
#   ※ 고칠 때는 문서\발표_캡스톤.html 이 아니라 도구\발표_캡스톤_틀.html 을 고친다.
#     문서\발표_캡스톤.html 은 생성물이다.

$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$TPL  = Join-Path $PSScriptRoot '발표_캡스톤_틀.html'
$SRC  = Join-Path $ROOT '문서\도면.html'
$OUT  = Join-Path $ROOT '문서\발표_캡스톤.html'

foreach($p in @($TPL, $SRC)){ if(-not (Test-Path $p)){ throw "없습니다 : $p" } }

Write-Host "`n[1] 도면 읽기"
$src = [IO.File]::ReadAllText($SRC, [Text.Encoding]::UTF8)
# 도면.html 안의 <svg> 는 표지 뒤부터 구조도 · 블록도(폰) · 블록도(서버) · 흐름도(길안내) · 흐름도(갱신) 순서다
$svgs = [regex]::Matches($src, '(?s)<svg viewBox.*?</svg>') | ForEach-Object { $_.Value }
Write-Host ("  도면 {0}장" -f $svgs.Count)
if($svgs.Count -ne 5){ throw "도면이 5장이어야 하는데 $($svgs.Count)장입니다 — 문서\도면.html 을 확인하세요" }

$slot = @('구조도','블록도폰','블록도서버','흐름길안내','흐름갱신')

Write-Host "`n[2] 도면 글자 규칙 대조"
# 도면.html 의 <svg> 만 가져오고 그쪽 <style> 은 안 가져온다.
#   그래서 글자 크기 규칙(svg .lbl 등)이 틀에도 **같은 값으로** 있어야 한다.
#   2026-10-13 : 실제로 빠져 있어 발표 자료의 도면 글자가 전부 기본 16px 로 떨어져 있었다.
#   조용히 틀어지는 종류라서 대조로 막는다.
$tpl = [IO.File]::ReadAllText($TPL, [Text.Encoding]::UTF8)
$norm = { param($x) ($x -replace '\s+', ' ').Trim() }
$rules = [regex]::Matches($src, '(?m)^\s*svg\s+\.\w+\s*\{[^}]*\}') | ForEach-Object { & $norm $_.Value }
if($rules.Count -lt 5){ throw "문서\도면.html 에서 글자 규칙을 $($rules.Count)개밖에 못 찾았습니다" }
$tplN = & $norm $tpl
foreach($r in $rules){
  if($tplN -notlike "*$r*"){ throw "틀에 이 규칙이 없거나 값이 다릅니다 : $r" }
}
Write-Host ("  규칙 {0}가지 모두 같습니다" -f $rules.Count)

Write-Host "`n[3] 발표 자료에 끼우기"
for($i = 0; $i -lt 5; $i++){
  $mark = '<!--SVG:' + $slot[$i] + '-->'
  if($tpl -notmatch [regex]::Escape($mark)){ throw "틀에 $mark 자리가 없습니다" }
  $tpl = $tpl.Replace($mark, $svgs[$i])
  Write-Host ("  {0}" -f $slot[$i])
}
# 도면 안의 marker id 가 한 문서 안에서 겹치지 않게 — 도면.html 은 A~E 로 이미 다르다
[IO.File]::WriteAllText($OUT, $tpl, (New-Object Text.UTF8Encoding($false)))

Write-Host "`n[4] 사진 넣기"
# 발표 자료는 PDF 로 뽑을 때 영문 임시 경로로 옮겨 가므로, 사진을 파일로 두면 끊긴다.
#   (한글 경로에서 Edge 가 실패해 영문 경로로 복사하는 구조 — 도구\특허PDF_만들기.ps1)
#   그래서 그림을 글자(base64)로 바꿔 HTML 안에 박아 넣는다. 파일 하나로 끝난다.
$PIC = Join-Path $PSScriptRoot '발표그림'
$used = 0
[regex]::Matches($tpl, '<img([^>]*?)data-pic="([^"]+)"([^>]*?)>') | ForEach-Object {
  $name = $_.Groups[2].Value
  $file = Join-Path $PIC ($name + '.jpg')
  if(-not (Test-Path $file)){ throw "발표그림에 없습니다 : $name.jpg" }
  $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($file))
  $rep = '<img' + $_.Groups[1].Value + 'src="data:image/jpeg;base64,' + $b64 + '"' + $_.Groups[3].Value + '>'
  $tpl = $tpl.Replace($_.Value, $rep)
  $used++
  Write-Host ("  {0}  ({1:N0} KB)" -f $name, ((Get-Item $file).Length / 1KB))
}
if($used -eq 0){ Write-Host "  (사진 없음)" }
[IO.File]::WriteAllText($OUT, $tpl, (New-Object Text.UTF8Encoding($false)))

Write-Host "`n[5] 확인"

$bad = 0
if($tpl -match '<!--SVG:'){ Write-Host "  안 채워진 자리가 남았습니다 ★" -ForegroundColor Red; $bad++ }
$n = ([regex]::Matches($tpl, '<section class="slide')).Count
$m = ([regex]::Matches($tpl, '<svg viewBox')).Count
Write-Host ("  슬라이드 {0}장 · 도면 {1}장" -f $n, $m)
if($m -ne 5){ Write-Host "  도면이 5장이 아닙니다 ★" -ForegroundColor Red; $bad++ }
if($bad){ exit 1 }
Write-Host "`n완료 — 도구\특허PDF_만들기.ps1 -Doc 캡스톤 으로 PDF 를 만드세요" -ForegroundColor Green
