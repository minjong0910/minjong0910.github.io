# 졸업작품 발표 — 조원이 자기 파트를 고쳐 온 쪽을 내 발표 자료에 붙인다 (2026-10-28 사용자)
#
#   사용자 : 「조원에게 자기 파트(12~17쪽)를 자기 발표 스타일로 고쳐 오라고 했다 — 문성일 조원이 한 것을 내가 만든 것에 붙여 줘」
#   문성일 파일(21쪽)은 내 20쪽의 12~16쪽(시연 · 누구나 · 기능 1 · 기능 2 · 검증)을 12~17쪽 여섯 장으로 고쳤고(「누구나」를 「기능 한눈에 ①②」 두 장으로),
#   18쪽부터(변화 · 발전 방향 · 마무리 · Q&A)는 내 것과 같다.
#   → 내 자료의 12~16쪽을 빼고 그 자리에 조원 파일의 12~17쪽을 넣는다. 조원 쪽은 한 글자도 고치지 않는다.
#     쪽 번호(「08 / 20」)와 발표 노트 맨 위 ⏱ 줄의 누적 · 전체 시간만 새 순서에 맞게 다시 쓴다(각 쪽의 「이 쪽 몇 초」는 그대로).
#
#   사용법 : pwsh -File 도구\발표PPT_조원파트_합치기.ps1 [-Desktop]
#            (내 자료는 먼저 도구\발표PPT_최종20쪽_만들기.ps1 로 만든다 — 조원 파일은 도구\발표_조원\ 에 둔다)
param([string]$Base = '', [string]$Team = '', [int]$CutFrom = 12, [int]$CutTo = 16, [int]$TeamFrom = 12, [int]$TeamTo = 17, [switch]$Desktop)
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$OUTD = Join-Path $ROOT '생성물\발표'
if(-not $Base){ $Base = Join-Path $OUTD '졸업작품 발표 — 공대 3호관 길안내 (20쪽).pptx' }
if(-not $Team){ $Team = Join-Path $PSScriptRoot '발표_조원\문성일_12-17쪽.pptx' }
$NAME = '졸업작품 발표 — 공대 3호관 길안내 (문성일 파트 합침)'
$pptx = Join-Path $OUTD ($NAME + '.pptx'); $pdf = Join-Path $OUTD ($NAME + '.pdf'); $txt = Join-Path $OUTD ($NAME + ' 리허설 대본.txt')
Copy-Item $Base $pptx -Force
function Mmss([int]$s){ return ('{0}:{1:D2}' -f [Math]::Floor($s / 60), ($s % 60)) }

$app = New-Object -ComObject PowerPoint.Application
$p = $app.Presentations.Open($pptx, 0, 0, 0)
try{
  for($i = $CutTo; $i -ge $CutFrom; $i--){ $p.Slides.Item($i).Delete() }
  [void]$p.Slides.InsertFromFile($Team, $CutFrom - 1, $TeamFrom, $TeamTo)
  # 넣은 쪽의 바탕색은 원래 파일 것을 그대로 — InsertFromFile 은 쪽마다 칠한 바탕을 버리고 받는 쪽 기본(흰 바탕)으로 바꿔 놓는다
  $tp = $app.Presentations.Open($Team, -1, 0, 0)
  try{
    for($k = $TeamFrom; $k -le $TeamTo; $k++){
      $src = $tp.Slides.Item($k); $dst = $p.Slides.Item($CutFrom + $k - $TeamFrom)
      $rgb = $(if($src.FollowMasterBackground){ $src.Master.Background.Fill.ForeColor.RGB } else { $src.Background.Fill.ForeColor.RGB })
      $dst.FollowMasterBackground = 0; $dst.Background.Fill.Solid(); $dst.Background.Fill.ForeColor.RGB = $rgb
    }
  } finally { $tp.Close() }
  $N = $p.Slides.Count
  # 쪽 번호 「nn / 20」 → 새 자리 · 새 전체
  foreach($s in $p.Slides){
    foreach($sh in $s.Shapes){
      try{ if($sh.HasTextFrame -and $sh.TextFrame.HasText -and $sh.TextFrame.TextRange.Text -match '^\d{2} / \d{2}$'){ $sh.TextFrame.TextRange.Text = ('{0:D2} / {1}' -f $s.SlideIndex, $N) } }catch{}
    }
  }
  # 발표 노트 맨 위 ⏱ 줄 — 「이 쪽」은 그대로, 누적 · 전체를 다시 센다
  $rows = @(); $sum = 0
  foreach($s in $p.Slides){
    $tr = $null; try{ $tr = $s.NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange }catch{}
    $all = if($tr){ $tr.Text } else { '' }
    $secs = 0
    if($all -match '이 쪽 (\d+)분 (\d+)초'){ $secs = [int]$Matches[1] * 60 + [int]$Matches[2] } elseif($all -match '이 쪽 (\d+)초'){ $secs = [int]$Matches[1] }
    $sum += $secs
    $title = ''; foreach($sh in $s.Shapes){ try{ if($sh.HasTextFrame -and $sh.TextFrame.HasText -and $sh.Top -lt 100 -and $sh.TextFrame.TextRange.Font.Size -ge 20){ $title = $sh.TextFrame.TextRange.Text.Replace("`r", ' '); break } }catch{} }
    $body = ($all -split "`r", 2)
    $rows += [pscustomobject]@{ n = $s.SlideIndex; secs = $secs; cum = $sum; tr = $tr; body = $(if($body.Count -gt 1){ $body[1].TrimStart("`r") } else { '' }); title = $title }
  }
  foreach($r in $rows){
    if(-not $r.tr){ continue }
    $head = '⏱ 이 쪽 ' + $(if($r.secs -ge 60){ ('{0}분 {1}초' -f [Math]::Floor($r.secs / 60), ($r.secs % 60)) } else { ('{0}초' -f $r.secs) }) + ' · 누적 ' + (Mmss $r.cum) + ' / 전체 ' + (Mmss $sum) + ' (한도 20:00)'
    $r.tr.Text = $head + "`r`r" + $r.body
  }
  $p.Save()
  $p.SaveAs($pdf, 32)
  ('합친 자료 : {0}쪽 · 전체 {1}' -f $N, (Mmss $sum))
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine(('졸업작품 발표 리허설 대본 — 공대 3호관 길안내 ({0}쪽 · 전체 {1} · 한도 20분) — 12~17쪽은 문성일 조원 파트' -f $N, (Mmss $sum)))
  [void]$sb.AppendLine('쪽 시간은 각 쪽 발표 노트의 「이 쪽」 시간입니다. ( ) 안은 행동 지시라 읽지 않습니다.')
  [void]$sb.AppendLine('')
  foreach($r in $rows){
    [void]$sb.AppendLine(('[{0:D2}] {1}{2}' -f $r.n, $r.title, $(if($r.n -ge $CutFrom -and $r.n -le ($CutFrom + $TeamTo - $TeamFrom)){ '   ← 문성일' } else { '' })))
    [void]$sb.AppendLine(('      이 쪽 {0}초 · 끝나는 시각 {1}' -f $r.secs, (Mmss $r.cum)))
    foreach($ln in ($r.body -split "`r")){ if($ln.Trim()){ [void]$sb.AppendLine('      ' + $ln) } }
    [void]$sb.AppendLine('')
  }
  [void]$sb.AppendLine(('합계 {0} — 20분까지 {1} 남음' -f (Mmss $sum), (Mmss ([Math]::Max(0, 1200 - $sum)))))
  [IO.File]::WriteAllText($txt, $sb.ToString(), (New-Object System.Text.UTF8Encoding($true)))
  foreach($r in $rows){ ('{0:D2} {1,3}초 누적 {2}  {3}' -f $r.n, $r.secs, (Mmss $r.cum), $r.title) }
} finally {
  try{ $p.Close() }catch{}
  if($app.Presentations.Count -eq 0){ try{ $app.Quit() }catch{} }
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}
if($Desktop){
  $dk = [Environment]::GetFolderPath('Desktop')   # 2026-10-29 사용자 : 폴더 말고 바탕화면에 바로
  foreach($f in $pptx, $pdf, $txt){ Copy-Item $f $dk -Force }
  '바탕화면에도 놓음'
}
