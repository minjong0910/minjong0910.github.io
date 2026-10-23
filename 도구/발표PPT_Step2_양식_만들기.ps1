# 졸업작품 발표 Step 2 — 교수님 스토리라인 예시 Type 2 양식 그대로(10단계 · 기능 1 · 2 세부 쪽 = 12쪽)에 중간발표 자료의 내용을 채운 PowerPoint
#
#   2026-10-23 사용자 : 「내가 준 중간발표 자료를 참고해서 이 양식에 맞춰서 만들어줘」 — 양식(문장 그대로) :
#     1 표지 : [프로젝트 제목] - OOO 문제 해결을 위한 새로운 제안   2 들어가며 : 혹시 이런 불편함, 겪어보셨나요?
#     3 우리가 발견한 문제점 : 기존 방식의 한계와 명확한 Pain Point   4 우리의 해결 아이디어 : 그래서 우리는 OOO을 생각했습니다
#     5 솔루션 설계 및 구현 : [서비스 이름]의 전체 구조와 개발 기술   6 핵심 기능 시연 : [서비스 이름]은 이렇게 동작합니다
#       (세부) 기능 1 : [문제 A]를 해결하는 [기능 1]  ·  (세부) 기능 2 : [불편함 B]를 개선하는 [기능 2]
#     7 우리가 만든 변화 : [서비스 이름] 도입으로 기대되는 효과   8 향후 발전 방향 : 더 나은 서비스를 위한 다음 단계
#     9 마무리하며 : 프로젝트 요약 및 결론   10 Q&A : 질의응답
#   · 쪽 제목은 양식 문장 그대로, 쪽 아래에는 양식의 어느 단계인지 길잡이(지금 단계는 호박색)
#   · 내용은 중간발표(바탕화면 캡스톤 중간발표.pdf) — 조건 네 가지 → Pain Point 넷, 조건이 고른 것 · 치른 대가 → 해결 아이디어,
#     구조도 · 재료 → 설계 및 구현, 흐름도 1 → 기능 1, 격차 측정 → 기능 2, 한 일과 결과 → 변화, 앱으로 만든다면 → 발전 방향, 마지막 문장 → 마무리
#   · 모양은 중간발표 모양(먹색 띠 + 호박색), 숫자는 지금 앱에 맞춤
#   · 앞서 만든 26쪽 · 20쪽은 양식과 쪽이 1 : 1 로 맞지 않아 사용자가 원한 것이 아니었다
#
#   PowerPoint(COM)로 직접 그린다 — 글자 · 표 · 도형은 고칠 수 있는 PowerPoint 개체, 쪽마다 발표 노트(대본)
#   사용법 : pwsh -File 도구\발표PPT_Step2_양식_만들기.ps1 [-Desktop]   → 생성물\발표\ 에 .pptx 와 .pdf
param([string]$OutDir = '', [switch]$Desktop)
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$IMG  = Join-Path $PSScriptRoot '발표그림\ppt'
if(-not $OutDir){ $OutDir = Join-Path $ROOT '생성물\발표' }
New-Item -ItemType Directory -Force $OutDir | Out-Null
$NAME = '캡스톤 발표 Step 2 (Type 2 양식)'
Add-Type -AssemblyName System.Drawing

# ── 색 · 글꼴 · 자리 (중간발표 틀과 같은 값) ─────────────────────
$AC='1E2227'; $MINT='E8A664'; $AM='B4530F'; $RD='A3301E'; $BG='F2F4F6'; $AC2='E9EBEE'; $CARD='FFFFFF'
$INK='15181C'; $INK2='4A5560'; $DIM='6B7684'; $LINE='D6DCE2'; $LINE2='E7EBEF'; $ACT='2B3138'
$FONT = 'Malgun Gothic'
$W=960; $H=540; $M=57; $CW=846; $BAND=82; $TOP=104; $FOOTY=510
function C([string]$hex){ $h = $hex.TrimStart('#'); return [int]("0x" + $h.Substring(4,2)) * 65536 + [int]("0x" + $h.Substring(2,2)) * 256 + [int]("0x" + $h.Substring(0,2)) }

# ── 글자 꾸밈 : **굵게** · [[강조색]] · {{빨강}} · ~~작고 흐리게~~ · \n 줄바꿈 ──
function Parse([string]$s){
  $plain = New-Object System.Text.StringBuilder; $runs = New-Object System.Collections.ArrayList
  $rx = [regex]'\*\*(.+?)\*\*|\[\[(.+?)\]\]|\{\{(.+?)\}\}|~~(.+?)~~'
  $pos = 0
  foreach($m in $rx.Matches($s)){
    [void]$plain.Append($s.Substring($pos, $m.Index - $pos))
    if($m.Groups[1].Success){ $k='b'; $v=$m.Groups[1].Value } elseif($m.Groups[2].Success){ $k='a'; $v=$m.Groups[2].Value }
    elseif($m.Groups[3].Success){ $k='r'; $v=$m.Groups[3].Value } else { $k='s'; $v=$m.Groups[4].Value }
    $v = $v.Replace('\n', "`r")
    $a = $plain.ToString().Replace('\n', "`r").Length
    [void]$runs.Add(@{ s = $a; l = $v.Length; k = $k })
    [void]$plain.Append($v); $pos = $m.Index + $m.Length
  }
  [void]$plain.Append($s.Substring($pos))
  return ,@($plain.ToString().Replace('\n', "`r"), $runs)
}
function Rich($tr, [string]$text, [double]$size, [string]$color, [bool]$bold, [string]$accent, [string]$boldColor){
  $p = Parse $text
  $tr.Text = $p[0]
  $f = $tr.Font; $f.Name = $FONT; $f.NameFarEast = $FONT; $f.Size = $size; $f.Color.RGB = (C $color); $f.Bold = $(if($bold){ -1 } else { 0 })
  foreach($r in $p[1]){
    if($r.l -le 0){ continue }
    $c = $tr.Characters($r.s + 1, $r.l)
    switch($r.k){
      'b' { $c.Font.Bold = -1; $c.Font.Color.RGB = (C $boldColor) }
      'a' { $c.Font.Bold = -1; $c.Font.Color.RGB = (C $accent) }
      'r' { $c.Font.Bold = -1; $c.Font.Color.RGB = (C $RD) }
      's' { $c.Font.Size = [Math]::Max(8, $size - 2.5); $c.Font.Color.RGB = (C $DIM); $c.Font.Bold = 0 }
    }
  }
}
# 글상자
function T($sl, [double]$x, [double]$y, [double]$w, [double]$h, [string]$text, [double]$size = 13, [string]$color = $INK2,
           [switch]$bold, [int]$align = 1, [double]$lines = 1.3, [string]$accent = $AM, [string]$boldColor = $INK,
           [int]$anchor = 1, [double]$after = 0, [double]$spacing = 0){
  $s = $sl.Shapes.AddTextbox(1, $x, $y, $w, $h)
  $tf = $s.TextFrame; $tf.WordWrap = -1; $tf.AutoSize = 0
  $tf.MarginLeft = 0; $tf.MarginRight = 0; $tf.MarginTop = 0; $tf.MarginBottom = 0; $tf.VerticalAnchor = $anchor
  Rich $tf.TextRange $text $size $color $bold.IsPresent $accent $boldColor
  $pf = $tf.TextRange.ParagraphFormat; $pf.Alignment = $align; $pf.LineRuleWithin = -1; $pf.SpaceWithin = $lines; $pf.SpaceAfter = $after
  if($spacing -ne 0){ $s.TextFrame2.TextRange.Font.Spacing = $spacing }
  return $s
}
# 네모 (둥근 모서리는 $radius pt)
function Rect($sl, [double]$x, [double]$y, [double]$w, [double]$h, [string]$fill, [string]$line = '', [double]$lw = 0.75, [double]$radius = 0, [switch]$dash){
  $type = $(if($radius -gt 0){ 5 } else { 1 })
  $s = $sl.Shapes.AddShape($type, $x, $y, $w, $h)
  if($radius -gt 0){ $s.Adjustments.Item(1) = [Math]::Min(0.5, $radius / [Math]::Min($w, $h)) }
  if($fill){ $s.Fill.Visible = -1; $s.Fill.Solid(); $s.Fill.ForeColor.RGB = (C $fill) } else { $s.Fill.Visible = 0 }
  if($line){ $s.Line.Visible = -1; $s.Line.ForeColor.RGB = (C $line); $s.Line.Weight = $lw; if($dash){ $s.Line.DashStyle = 4 } } else { $s.Line.Visible = 0 }
  $s.Shadow.Visible = 0
  return $s
}
# 안에 글이 든 작은 칸 (칩)
function Chip($sl, [double]$x, [double]$y, [double]$w, [double]$h, [string]$text, [string]$fill = $AC2, [string]$color = $ACT,
              [double]$size = 10.5, [switch]$bold, [int]$align = 2, [string]$line = '', [double]$radius = 4){
  $s = Rect $sl $x $y $w $h $fill $line 0.75 $radius
  $tf = $s.TextFrame; $tf.WordWrap = -1; $tf.AutoSize = 0
  $tf.MarginLeft = 6; $tf.MarginRight = 6; $tf.MarginTop = 2; $tf.MarginBottom = 2; $tf.VerticalAnchor = 3
  Rich $tf.TextRange $text $size $color $bold.IsPresent $AM $INK
  $pf = $tf.TextRange.ParagraphFormat; $pf.Alignment = $align; $pf.LineRuleWithin = -1; $pf.SpaceWithin = 1.15
  return $s
}
function Line($sl, [double]$x1, [double]$y1, [double]$x2, [double]$y2, [string]$color = $LINE, [double]$w = 0.75, [switch]$arrow, [switch]$dash){
  $l = $sl.Shapes.AddLine($x1, $y1, $x2, $y2); $l.Line.ForeColor.RGB = (C $color); $l.Line.Weight = $w
  if($arrow){ $l.Line.EndArrowheadStyle = 2 }
  if($dash){ $l.Line.DashStyle = 4 }
  return $l
}
# 그림 — 높이(또는 너비)에 맞춰 비율 그대로 / 상자를 꽉 채우게 잘라서
function ImgSize([string]$path){ $im = [Drawing.Image]::FromFile($path); $r = @($im.Width, $im.Height); $im.Dispose(); return ,$r }
function Pic($sl, [string]$file, [double]$x, [double]$y, [double]$w = 0, [double]$h = 0, [string]$border = $LINE, [switch]$round){
  $path = Join-Path $IMG $file; $sz = ImgSize $path
  if($w -le 0){ $w = $h * $sz[0] / $sz[1] } elseif($h -le 0){ $h = $w * $sz[1] / $sz[0] }
  $p = $sl.Shapes.AddPicture($path, 0, -1, $x, $y, $w, $h)
  if($round){ try{ $p.AutoShapeType = 5; $p.Adjustments.Item(1) = 0.045 }catch{} }
  if($border){ $p.Line.Visible = -1; $p.Line.ForeColor.RGB = (C $border); $p.Line.Weight = 0.75 }
  return $p
}
function PicCover($sl, [string]$file, [double]$x, [double]$y, [double]$w, [double]$h, [string]$border = $LINE){
  $path = Join-Path $IMG $file
  $p = $sl.Shapes.AddPicture($path, 0, -1, $x, $y)
  $p.LockAspectRatio = 0
  $nw = $p.Width; $nh = $p.Height; $tr = $w / $h; $ir = $nw / $nh
  if($ir -gt $tr){ $cut = ($nw - $nh * $tr) / 2; $p.PictureFormat.CropLeft = $cut; $p.PictureFormat.CropRight = $cut }
  else { $cut = ($nh - $nw / $tr) / 2; $p.PictureFormat.CropTop = $cut; $p.PictureFormat.CropBottom = $cut }
  $p.Left = $x; $p.Top = $y; $p.Width = $w; $p.Height = $h
  try{ $p.AutoShapeType = 5; $p.Adjustments.Item(1) = 0.04 }catch{}
  if($border){ $p.Line.Visible = -1; $p.Line.ForeColor.RGB = (C $border); $p.Line.Weight = 0.75 }
  return $p
}
# 표 — 첫 줄은 머리줄. $hi = 옅은 회색으로 칠할 줄 번호(1 부터, 머리줄 제외). $merge = @(@(r1,c1,r2,c2), …)
function Tbl($sl, [double]$x, [double]$y, [double[]]$cols, [object[]]$rows, [int[]]$hi = @(), [double]$fs = 12, [double]$rowH = 30,
             [object[]]$merge = @(), [hashtable]$align = @{}, [double]$hfs = 11){
  $nr = $rows.Count; $nc = $cols.Count; $w = ($cols | Measure-Object -Sum).Sum
  $shp = $sl.Shapes.AddTable($nr, $nc, $x, $y, $w, $nr * $rowH)
  $tb = $shp.Table
  try{ $tb.ApplyStyle('{2D5ABB26-0587-4C30-8999-92F81FD0307C}', $false) }catch{}
  for($c = 1; $c -le $nc; $c++){ $tb.Columns.Item($c).Width = $cols[$c - 1] }
  for($r = 1; $r -le $nr; $r++){
    for($c = 1; $c -le $nc; $c++){
      $cell = $tb.Cell($r, $c); $sh = $cell.Shape; $tf = $sh.TextFrame
      $tf.MarginLeft = 9; $tf.MarginRight = 7; $tf.MarginTop = 4; $tf.MarginBottom = 4; $tf.VerticalAnchor = 3
      $txt = [string]$rows[$r - 1][$c - 1]
      if($r -eq 1){ Rich $tf.TextRange $txt $hfs $ACT $true $AM $INK }
      else { Rich $tf.TextRange $txt $fs $INK2 $false $AM $INK }
      $pf = $tf.TextRange.ParagraphFormat; $pf.LineRuleWithin = -1; $pf.SpaceWithin = 1.12
      $pf.Alignment = $(if($align.ContainsKey($c)){ $align[$c] } else { 1 })
      $isHi = ($r -eq 1) -or ($hi -contains ($r - 1))
      $sh.Fill.Visible = -1; $sh.Fill.Solid(); $sh.Fill.ForeColor.RGB = (C $(if($isHi){ $AC2 } else { $CARD }))
      foreach($b in 1..4){ $bd = $cell.Borders.Item($b); $bd.Visible = -1; $bd.ForeColor.RGB = (C $LINE); $bd.Weight = 0.75 }
    }
    $tb.Rows.Item($r).Height = $rowH
  }
  foreach($mg in $merge){ $tb.Cell($mg[0], $mg[1]).Merge($tb.Cell($mg[2], $mg[3])) }
  # 합치면 빈 칸들의 줄바꿈이 붙어 들어온다 — 첫 칸 글을 다시 넣는다
  foreach($mg in $merge){
    $tf = $tb.Cell($mg[0], $mg[1]).Shape.TextFrame
    Rich $tf.TextRange ([string]$rows[$mg[0] - 1][$mg[1] - 1]) $fs $INK2 $false $AM $INK
    $pf = $tf.TextRange.ParagraphFormat; $pf.LineRuleWithin = -1; $pf.SpaceWithin = 1.12
    $pf.Alignment = $(if($align.ContainsKey($mg[1])){ $align[$mg[1]] } else { 1 }); $tf.VerticalAnchor = 3
  }
  return $shp
}
# 한 줄 결론 상자 — 흰 바탕 + 왼쪽 막대 (중간발표 .strip)
function Strip($sl, [double]$y, [string]$text, [double]$h = 46, [string]$bar = $AC, [double]$fs = 13, [double]$x = $M, [double]$w = $CW){
  Rect $sl $x $y $w $h $CARD $LINE2 0.75 | Out-Null
  Rect $sl $x $y 7 $h $bar | Out-Null
  $t = T $sl ($x + 22) $y ($w - 40) $h $text $fs $INK2 -anchor 3 -lines 1.32
  $t.Height = $h   # 글상자는 만들 때 한 줄 높이로 줄어든다 — 상자 높이로 되돌려야 글이 가운데에 온다
}
# 카드 (흰 · 테두리 · 둥근)
function Card($sl, [double]$x, [double]$y, [double]$w, [double]$h, [string]$fill = $CARD, [string]$line = $LINE){ return (Rect $sl $x $y $w $h $fill $line 0.75 5.7) }
# 그림 글자(아이콘) — 맑은 고딕에는 없어서 Segoe UI Symbol(한 가지 색)로, 상자 한가운데
#   Segoe UI Emoji 는 PowerPoint 화면에선 컬러, PDF 에선 흑백이라 둘이 달라진다
function Emo($sl, [double]$x, [double]$y, [double]$w, [double]$h, [string]$ch, [double]$size = 24, [string]$color = $ACT){
  $s = $sl.Shapes.AddTextbox(1, $x, $y, $w, $h)
  $tf = $s.TextFrame; $tf.WordWrap = 0; $tf.AutoSize = 0
  $tf.MarginLeft = 0; $tf.MarginRight = 0; $tf.MarginTop = 0; $tf.MarginBottom = 0; $tf.VerticalAnchor = 3
  $tr = $tf.TextRange; $tr.Text = $ch; $tr.Font.Name = 'Segoe UI Symbol'; $tr.Font.Size = $size; $tr.Font.Color.RGB = (C $color); $tr.ParagraphFormat.Alignment = 2
  $s.Left = $x; $s.Top = $y; $s.Width = $w; $s.Height = $h
  return $s
}

# ── 쪽 틀 ────────────────────────────────────────────────────
$script:pg = 0
function Bg($sl, [string]$hex){ $sl.FollowMasterBackground = 0; $sl.Background.Fill.Solid(); $sl.Background.Fill.ForeColor.RGB = (C $hex) }
function Notes($sl, [string]$text){ try{ $sl.NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text = $text.Replace('\n', "`r") }catch{} }
function Foot($sl, [string]$left, [switch]$dark){
  $lc = $(if($dark){ '44484D' } else { $LINE }); $tc = $(if($dark){ '8A8D91' } else { $DIM })
  Line $sl $M $FOOTY ($M + $CW) $FOOTY $lc 0.75 | Out-Null
  T $sl $M ($FOOTY + 6) 500 14 $left 8.5 $tc -spacing 0.6 | Out-Null
  T $sl ($M + $CW - 100) ($FOOTY + 6) 100 14 ([string]$script:pg) 8.5 $tc -align 3 | Out-Null
}
# 내용 쪽 : 위를 가로지르는 먹색 띠 안에 작은 머리말 + 흰 제목([[ ]] 은 호박색)
function Page([string]$kick, [string]$title, [string]$foot, [string]$notes){
  $script:pg++
  $sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl $BG
  Rect $sl 0 0 $W $BAND $AC | Out-Null
  T $sl $M 17 $CW 14 $kick 9.5 'C3C5C8' -bold -spacing 2.5 | Out-Null
  T $sl $M 36 $CW 34 $title 22 'FFFFFF' -bold -accent $MINT -boldColor 'FFFFFF' -lines 1.1 | Out-Null
  Foot $sl $foot
  Notes $sl $notes
  return $sl
}
# 간지 : 전면 먹색 + 오른쪽에 아주 큰 번호
function Part([string]$no, [string]$which, [string]$title, [string]$sub, [string]$notes){
  $script:pg++
  $sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl $AC
  T $sl 520 95 395 330 $no 210 '393D42' -bold -align 3 -lines 1.0 -anchor 3 | Out-Null
  $nl = ($title -split '\\n').Count; $ty = $(if($nl -gt 1){ 168 } else { 190 })
  T $sl $M $ty 600 20 $which 12 $MINT -bold -spacing 4 | Out-Null
  T $sl $M ($ty + 28) 680 (48 * $nl) $title 34 'FFFFFF' -bold -accent $MINT -boldColor 'FFFFFF' -lines 1.1 | Out-Null
  T $sl $M ($ty + 28 + 48 * $nl + 18) 640 80 $sub 14.5 'D5D7DA' -lines 1.65 -boldColor 'FFFFFF' | Out-Null
  Foot $sl ($no + ' · ' + ($which -replace '\s','')) -dark
  Notes $sl $notes
  return $sl
}
# 폰 화면 줄 — @( @(그림, '굵은 설명', '작은 설명'), … )
function Phones($sl, [object[]]$items, [double]$y = $TOP, [double]$h = 292, [double]$x = $M, [double]$w = $CW){
  $n = $items.Count; $slot = $w / $n
  for($i = 0; $i -lt $n; $i++){
    $it = $items[$i]; $sz = ImgSize (Join-Path $IMG $it[0]); $pw = $h * $sz[0] / $sz[1]
    $px = $x + $slot * $i + ($slot - $pw) / 2
    Pic $sl $it[0] $px $y $pw $h -round | Out-Null
    T $sl ($x + $slot * $i + 4) ($y + $h + 7) ($slot - 8) 16 $it[1] 11 $INK -bold -align 2 | Out-Null
    T $sl ($x + $slot * $i + 4) ($y + $h + 24) ($slot - 8) 16 $it[2] 9.5 $DIM -align 2 | Out-Null
  }
}
# 왼쪽에 이름표 칩, 오른쪽에 글 — 기능 쪽의 「문제 / 해결 / 결과」 줄
function Rows($sl, [object[]]$rows, [double]$x, [double]$y, [double]$w, [double]$rowH = 50, [double]$fs = 12){
  for($i = 0; $i -lt $rows.Count; $i++){
    $r = $rows[$i]; $yy = $y + $i * $rowH
    $kind = $r[2]
    $fill = switch($kind){ 'dark' { $AC } 'am' { 'FBEADB' } default { $AC2 } }
    $col  = switch($kind){ 'dark' { 'FFFFFF' } 'am' { $AM } default { $ACT } }
    Chip $sl $x ($yy + 4) 64 22 $r[0] $fill $col 9.5 -bold | Out-Null
    T $sl ($x + 78) ($yy + 2) ($w - 78) ($rowH - 6) $r[1] $fs $INK2 -lines 1.3 | Out-Null
    if($i -lt $rows.Count - 1){ Line $sl $x ($yy + $rowH - 2) ($x + $w) ($yy + $rowH - 2) $LINE2 0.75 | Out-Null }
  }
}

# 앞에 점(·)이 붙는 줄 목록 — 줄이 넘어가도 글이 점 뒤에 맞춰진다
function Bullets($s){
  $tr = $s.TextFrame.TextRange
  $tr.ParagraphFormat.Bullet.Visible = -1; $tr.ParagraphFormat.Bullet.Character = 183
  $s.TextFrame.Ruler.Levels.Item(1).FirstMargin = 0; $s.TextFrame.Ruler.Levels.Item(1).LeftMargin = 10
}
# 아래쪽 길잡이 — 양식의 어느 단계인지 (지금 단계는 호박색)
function Crumb([string]$cur){
  $all = @('들어가며', '문제점', '해결 아이디어', '설계 및 구현', '기능 시연', '변화', '발전 방향', '마무리')
  return (($all | ForEach-Object { if($_ -eq $cur){ '[[' + $_ + ']]' } else { $_ } }) -join '  ›  ')
}

# ══ PowerPoint 열기 ══════════════════════════════════════════
$app = New-Object -ComObject PowerPoint.Application
$pres = $app.Presentations.Add(0)
$pres.PageSetup.SlideWidth = $W; $pres.PageSetup.SlideHeight = $H
try{
# ───────────────────────────────────────── 1. 표지 : [프로젝트 제목] - OOO 문제 해결을 위한 새로운 제안
$script:pg++
$sl = $pres.Slides.Add(1, 12); Bg $sl $AC
T $sl 68 124 560 16 '군산대학교 공과대학 · 졸업작품 발표' 11 'B9BBBE' -spacing 5 | Out-Null
T $sl 68 152 600 64 '공대 3호관 길안내' 46 'FFFFFF' -bold -lines 1.05 | Out-Null
T $sl 68 224 600 66 '건물 안에서 길을 잃는 문제 해결을 위한\n[[새로운 제안]]' 19 'E2E3E5' -lines 1.4 -accent $MINT | Out-Null
Rect $sl 68 306 113 5 $MINT | Out-Null
T $sl 68 332 560 40 '**팀 공3길**    김민종 · 손의윤 · 문성일\n**지도교수**    강규창 교수님' 12 'A4A7AB' -lines 1.75 -boldColor 'E2E3E5' | Out-Null
Pic $sl '화면07_3D.jpg' 700 60 0 420 '44484D' -round | Out-Null
Notes $sl '발표 시작하겠습니다. 저희는 팀 공3길이고, 졸업작품은 「공대 3호관 길안내」입니다.\n건물 안에서 길을 잃는 문제를 해결하기 위한 새로운 제안입니다. 오늘은 어떤 어려움을 어떻게 풀었는지, 그 과정을 순서대로 말씀드리겠습니다.'

# ───────────────────────────────────────── 2. 들어가며 : 혹시 이런 불편함, 겪어보셨나요?
$sl = Page '02 · 들어가며' '혹시 이런 불편함, [[겪어 보셨나요?]]' (Crumb '들어가며') '수업 5분 전, 처음 가 보는 강의실을 찾는다고 생각해 보십시오.\n엘리베이터 문이 열렸는데 왼쪽인지 오른쪽인지 모르고, 복도에 들어서도 그 끝에 강의실이 있는지 모릅니다. 벽에 안내도가 있어도 내가 찾는 호실은 안 보입니다.\n세 사진 모두 공대 3호관에서 저희가 직접 찍은 것입니다. 지도 앱은 건물 앞에서 끝나고, 그다음은 지나가는 사람에게 묻는 수밖에 없습니다.'
T $sl $M 104 $CW 22 '수업 5분 전, 처음 가 보는 강의실. 건물 안에서 길을 잃는 순간은 **세 번** 옵니다 — 모두 공대 3호관에서 직접 찍었습니다.' 13 | Out-Null
$ph = @(@('사진_엘리베이터3층.jpg', '「문이 열렸는데…\n왼쪽이야, 오른쪽이야?」', '3층 엘리베이터 안'),
        @('사진_동문.jpg', '「찾는 강의실이\n이 복도 끝에 있긴 한 걸까?」', '1층 동문으로 들어오자마자'),
        @('사진_비상대피도3층.jpg', '「안내도는 있는데,\n내가 찾는 호실은 어디?」', '3층 비상대피 경로도'))
$cw3 = ($CW - 2 * 22) / 3
for($i = 0; $i -lt 3; $i++){
  $xx = $M + $i * ($cw3 + 22)
  PicCover $sl $ph[$i][0] $xx 138 $cw3 190 | Out-Null
  T $sl $xx 338 $cw3 40 $ph[$i][1] 13 $INK -bold -lines 1.25 | Out-Null
  T $sl $xx 380 $cw3 16 $ph[$i][2] 10 $DIM | Out-Null
}
Strip $sl 418 '**지도 앱은 건물 앞에서 끝납니다.** 그다음은 — 지나가는 사람에게 묻는 수밖에 없습니다.' 48 | Out-Null

# ───────────────────────────────────────── 3. 우리가 발견한 문제점 : 기존 방식의 한계와 명확한 Pain Point
$sl = Page '03 · 우리가 발견한 문제점' '기존 방식의 한계와 명확한 [[Pain Point]]' (Crumb '문제점') '건물 안에서 길을 찾는 방법은 이미 있습니다. 그런데 학생이 만들어서 계속 돌아가게 하려니, 기존 방식마다 막히는 곳이 있었습니다.\n첫째, 서버가 길을 계산하고 장치를 다는 방식은 돈이 계속 듭니다. 저희가 졸업하면 요금 낼 사람이 없습니다.\n둘째, Wi-Fi 나 비콘으로 위치를 재려면 장치 수십 대와 공사가 필요한데, 학생은 공사 허가를 받을 수 없습니다.\n셋째, 길을 잃는 곳이 하필 지하, 계단, 엘리베이터 안이라 인터넷이 있어야 도는 앱은 거기서 멈춥니다.\n넷째, 공간이 바뀌면 사진도 안내도도 틀려지는데, 사람이 다시 찍어야 하는 방식은 1년을 못 갑니다.\n가장 아픈 곳은 네 번째입니다. 만드는 것보다 계속 맞게 유지하는 것이 어렵습니다.'
T $sl $M 104 $CW 22 '건물 안 길안내 방법은 이미 있습니다. 그런데 **학생이 만들어 계속 돌아가게** 하려니, 기존 방식마다 막히는 곳이 있었습니다.' 13 | Out-Null
$pp = @(
  @('PAIN POINT 1', '돈이 계속 든다', '서버가 길을 계산하고 장치를 달면 **서버비 · 장치비**가 계속 듭니다. 저희가 졸업하면 [[요금 낼 사람이 없습니다.]]', '기존 방식 — 서버가 계산해 내려 줌', $false),
  @('PAIN POINT 2', '장치를 달 수 없다', 'Wi-Fi · 비콘 측위는 **장치 수십 대와 공사**가 필요합니다. 학생은 [[공사 허가를 받을 수 없습니다.]]', '기존 방식 — 실내 측위 장치', $false),
  @('PAIN POINT 3', '헤매는 곳은 신호가 없다', '길을 잃는 곳이 하필 [[지하 · 계단 · 엘리베이터 안]]입니다. 인터넷이 있어야 도는 앱은 거기서 멈춥니다.', '기존 방식 — 온라인 지도 · 웹 안내', $false),
  @('PAIN POINT 4', '안내는 금방 낡는다', '공간이 바뀌면 사진도 안내도도 틀려집니다. 사람이 다시 찍어야 하는 것은 **1년을 못 갑니다.**', '기존 방식 — 관리자가 다시 찍고 분류', $true))
$cw4 = ($CW - 3 * 16) / 4
for($i = 0; $i -lt 4; $i++){
  $xx = $M + $i * ($cw4 + 16); $p = $pp[$i]; $hot = $p[4]
  Card $sl $xx 136 $cw4 250 $(if($hot){ 'FDF5EE' } else { $CARD }) $(if($hot){ 'E0B48C' } else { $LINE }) | Out-Null
  T $sl ($xx + 16) 152 ($cw4 - 32) 14 $p[0] 9 $(if($hot){ $AM } else { $DIM }) -bold -spacing 1.5 | Out-Null
  T $sl ($xx + 16) 172 ($cw4 - 32) 24 $p[1] 15 $(if($hot){ $AM } else { $INK }) -bold -lines 1.2 | Out-Null
  T $sl ($xx + 16) 210 ($cw4 - 32) 120 $p[2] 12 $INK2 -lines 1.55 | Out-Null
  Line $sl ($xx + 16) 340 ($xx + $cw4 - 16) 340 $LINE 0.75 -dash | Out-Null
  T $sl ($xx + 16) 348 ($cw4 - 32) 30 $p[3] 9.5 $DIM -lines 1.3 | Out-Null
}
Strip $sl 400 '**가장 아픈 곳은 PAIN POINT 4** — 만드는 것보다 **계속 맞게 유지하는 것**이 어렵습니다. 학생이 만든 앱은 만든 사람이 졸업하면 멈춥니다.' 50 $AM | Out-Null

# ───────────────────────────────────────── 4. 우리의 해결 아이디어 : 그래서 우리는 OOO을 생각했습니다
$sl = Page '04 · 우리의 해결 아이디어' '그래서 우리는 [[장치 없는 길안내]]를 생각했습니다' (Crumb '해결 아이디어') '그래서 저희는 장치 없는 길안내를 생각했습니다. 저희가 창의적이어서 다르게 만든 것이 아닙니다. 네 가지 한계를 피하려니 길이 하나뿐이었습니다.\n돈이 들면 안 되니 서버 대신 이용자 휴대폰이 계산합니다. 장치를 달 수 없으니 위치를 재지 않고, 어느 문으로 들어왔는지 출입문 QR 로 묻습니다. 신호가 없으니 필요한 것을 처음 한 번에 휴대폰에 통째로 담아 둡니다. 안내가 낡으니 이용자가 찍어 올리고, 어디인지는 AI 가 가립니다.\n카드 아래에 적은 것처럼 공짜로 얻은 것은 없습니다. 예를 들어 QR 은 출발점만 알 뿐, 걸어가는 동안의 위치는 모릅니다. 그 빈자리를 실제 사진으로 채웠습니다.\n한 문장으로, 건물에 장치를 다는 대신 모두가 이미 들고 있는 휴대폰으로 길을 안내합니다.'
T $sl $M 104 $CW 22 '저희가 창의적이어서 다르게 만든 것이 아닙니다. **네 가지 한계를 피하려니 길이 하나뿐이었습니다.**' 13 | Out-Null
$ideas = @(
  @('PAIN 1 · 돈이 계속 든다', '휴대폰이\n계산한다', '길 계산도 사진 판정도 서버가 아니라 **이용자 휴대폰**이 합니다.', '→ 서버 · 배포 **0원**', '치른 대가 — 폰이 느리면 느립니다', $false),
  @('PAIN 2 · 장치를 달 수 없다', '들어온 문을\n묻는다', '위치를 재지 않고 **어느 문으로 들어왔는지** 묻습니다.', '→ 출입문에 **QR 스티커 네 장**', '치른 대가 — 걷는 동안 위치는 모름', $false),
  @('PAIN 3 · 신호가 없다', '통째로\n담아 둔다', '필요한 것을 **처음 한 번에** 휴대폰에 저장합니다.', '→ **16.5MB** · 비행기 모드에서도', '치른 대가 — 첫 실행이 한 번 느립니다', $false),
  @('PAIN 4 · 안내가 낡는다', '함께\n고친다', '낡은 사진은 **이용자가 찍어 올리고**, 어디인지는 **AI가 가립니다.**', '→ 단, AI는 **확신할 때만** 답한다', '치른 대가 — AI가 틀릴 수 있습니다', $true))
for($i = 0; $i -lt 4; $i++){
  $xx = $M + $i * ($cw4 + 16); $d = $ideas[$i]; $hot = $d[5]
  Card $sl $xx 134 $cw4 256 $(if($hot){ 'FDF5EE' } else { 'F7F8FA' }) $(if($hot){ 'E0B48C' } else { $LINE }) | Out-Null
  Rect $sl $xx 134 $cw4 4 $(if($hot){ $AM } else { $AC }) | Out-Null
  T $sl ($xx + 16) 150 ($cw4 - 32) 14 $d[0] 9 $DIM -bold | Out-Null
  T $sl ($xx + 16) 170 ($cw4 - 32) 60 $d[1] 20 $(if($hot){ $AM } else { $INK }) -bold -lines 1.1 | Out-Null
  T $sl ($xx + 16) 236 ($cw4 - 32) 60 $d[2] 11.5 $INK2 -lines 1.45 | Out-Null
  Chip $sl ($xx + 12) 304 ($cw4 - 24) 32 $d[3] $CARD $INK2 11 -align 1 -line $LINE2 | Out-Null
  T $sl ($xx + 16) 346 ($cw4 - 32) 32 $d[4] 9.5 $DIM -lines 1.3 | Out-Null
}
Strip $sl 404 '**한 문장으로** — 건물에 장치를 다는 대신, **모두가 이미 들고 있는 휴대폰**으로 길을 안내합니다.' 48 | Out-Null

# ───────────────────────────────────────── 5. 솔루션 설계 및 구현 : [서비스 이름]의 전체 구조와 개발 기술
$sl = Page '05 · 솔루션 설계 및 구현' '공대 3호관 길안내의 [[전체 구조와 개발 기술]]' (Crumb '설계 및 구현') '전체 구조입니다. 왼쪽 그림에서 왼쪽이 휴대폰, 오른쪽이 서버입니다.\n판단은 휴대폰이 합니다. QR 읽기, 목적지 찾기, 길 만들기, 3D 와 사진 보여 주기, AI 가 사진이 어디인지 판단하는 일까지 전부 휴대폰 안에서 합니다. 서버는 사진을 맡아 둘 뿐입니다.\n쓴 기술은 오른쪽 표입니다. 사진을 숫자 1,280개로 바꾸는 MobileNet, 번호판 글자를 읽는 Tesseract, 건물을 좌표 표에서 3D 로 그리는 three.js, QR 을 읽는 jsQR, 그리고 사진을 맡아 두는 Firestore 와 앱을 폰에 저장하는 서비스 워커입니다.\n직접 쓴 코드는 31개 파일, 약 2만 4천 줄이고, 서버에 올라가는 저희 코드는 보안 규칙 130줄이 전부입니다. 서버와 배포 비용은 0원입니다.'
$fw = 296 * 1773 / 1706
Card $sl $M 104 $fw 296 | Out-Null
Pic $sl '중간_구조도.png' ($M + 2) 106 ($fw - 4) 292 '' | Out-Null
$rx = $M + $fw + 22; $rw = $M + $CW - $rx
T $sl $rx 104 $rw 22 '판단은 **휴대폰**이 하고, 서버는 **사진을 맡아 둘 뿐**입니다.' 13 | Out-Null
Tbl $sl $rx 134 @(148, ($rw - 148)) @(
  @('개발 기술', '무슨 일을 하나'),
  @('**MobileNet v2**\n~~TensorFlow.js~~', '사진을 **숫자 1,280개**로 바꿔 같은 자리인지 비교'),
  @('**Tesseract.js**', '사진 속 **호실 번호 · 층 표시**를 읽음'),
  @('**three.js**', '건물을 **좌표 표에서 3D로** 그려 냄 — 모델 파일 없음'),
  @('**jsQR**', '문에 붙인 **QR을 읽어** 출발점을 정함'),
  @('**Firestore**\n~~+ 서비스 워커~~', '제보 사진을 **맡아 두고**, 앱 전체를 **폰에 저장**')
) -fs 11 -rowH 44 -hfs 10.5 | Out-Null
$stats = @(@('31개 · 약 2만 4천 줄', '직접 쓴 앱 코드 — 묶음 도구 없이 순수 JavaScript'), @('130줄', '서버에 올린 우리 코드는 보안 규칙이 전부'), @('0원', '서버 · 배포 비용 (무료 한도 안)'))
$sw3 = ($CW - 2 * 22) / 3
for($i = 0; $i -lt 3; $i++){
  $xx = $M + $i * ($sw3 + 22)
  Rect $sl $xx 420 5 50 $MINT | Out-Null
  T $sl ($xx + 16) 418 ($sw3 - 16) 28 $stats[$i][0] 20 $INK -bold | Out-Null
  T $sl ($xx + 16) 450 ($sw3 - 16) 16 $stats[$i][1] 10 $DIM | Out-Null
}

# ───────────────────────────────────────── 6. 핵심 기능 시연 : [서비스 이름]은 이렇게 동작합니다
$sl = Page '06 · 핵심 기능 시연' '공대 3호관 길안내는 [[이렇게 동작합니다]]' (Crumb '기능 시연') '이제 실제로 어떻게 동작하는지 보여 드리겠습니다.\n출입문의 QR 을 휴대폰 기본 카메라로 찍으면 앱스토어 없이 바로 앱이 열립니다. 찍은 문의 실제 사진을 보여 주며 「여기가 맞나요?」라고 확인합니다. 저희는 위치를 알아내지 않고 물어봅니다.\n무엇을 찾는지 고르고 목적지를 정하면 3D 건물 위에 가는 길이 통째로 보이고, 길안내를 시작하면 단계마다 그 자리의 실제 사진과 한 문장이 나옵니다. 그렇게 문 앞까지 갑니다.\n다음 두 장에서 이 기능들이 어떤 문제를 어떻게 풀었는지 하나씩 보여 드리겠습니다.'
Phones $sl @(
  @('화면01_초록.jpg', '① QR을 찍는다', '앱스토어 없이 바로'),
  @('화면03_여기가맞나요.jpg', '② 출발점 확인', '「여기가 맞나요?」'),
  @('화면05_무엇을찾으세요.jpg', '③ 무엇을 찾나', '강의실 · 화장실 · 계단'),
  @('화면07_3D.jpg', '④ 길을 통째로', '3D 건물 위 경로'),
  @('화면10_단계1.jpg', '⑤ 사진을 따라', '「정문으로 들어오세요」'),
  @('화면13_도착.jpg', '⑥ 도착', '「13524호 · PC실 도착」')
) -h 286 | Out-Null
Strip $sl 444 '다음 두 장에서 — 이 기능들이 **어떤 문제를 어떻게 풀었는지** 하나씩 보여 드립니다.' 48 | Out-Null

# ───────────────────────────────────────── 6-1. 기능 1 : [문제 A]를 해결하는 [기능 1]
$sl = Page '06 · 핵심 기능 시연 · 기능 1' '「장치도 신호도 없다」를 해결하는 [[QR 출발 · 오프라인 길안내]]' (Crumb '기능 시연') '기능 1 입니다. Pain Point 2 와 3, 장치를 달 수 없고 신호도 없는 문제를 푸는 기능입니다.\n실내에서는 위치를 잴 수 없고, 재려면 장치가 필요한데 장치는 달 수 없습니다. 그래서 발상을 바꿨습니다. 「지금 어디인가」 대신 「어느 문으로 들어왔나」를 묻습니다. 출입문 네 곳에 QR 을 붙였고, 안 읽히면 네 문 가운데서 직접 고르면 됩니다.\n그다음은 단계마다 그 자리의 실제 사진을 보여 줍니다. 눈앞 풍경과 다르면 잘못 든 것이라 이용자가 스스로 대조합니다.\n오른쪽 흐름도의 점선 구간은 인터넷 없이 됩니다. 앱 전체 249개 파일, 16.5MB 를 처음 한 번 휴대폰에 저장해 두기 때문입니다. 결과적으로 장치 0대로, 비행기 모드에서도 152곳까지 안내합니다.'
$fw = 316 * 1599 / 1706
$lw = $CW - $fw - 24
Rows $sl @(
  @('문제', '실내에서는 위치를 잴 수 없습니다. 재려면 장치가 필요하고, **장치는 달 수 없습니다.**', ''),
  @('발상 전환', '「지금 어디인가」 대신 **「어느 문으로 들어왔나」**를 묻습니다. 출입문 4곳에 QR — 안 읽히면 네 문 중 직접 고릅니다.', 'am'),
  @('해결', '그다음은 단계마다 **그 자리의 실제 사진**. 눈앞 풍경과 다르면 잘못 든 것 — 이용자가 스스로 대조합니다.', ''),
  @('해결', '앱 전체를 **처음 한 번 휴대폰에 저장**(249개 · 16.5MB) — 점선 구간은 **통신 0회**', ''),
  @('결과', '**장치 0대** · 네 문에서 지하 1층~5층 **152곳까지** · **비행기 모드에서도** 안내', 'dark')
) $M 104 $lw 62 11.5
$fx = $M + $lw + 24
Card $sl $fx 104 $fw 316 | Out-Null
Pic $sl '중간_흐름도_길안내.png' ($fx + 2) 106 ($fw - 4) 312 '' | Out-Null
Strip $sl 432 '**스티커 한 장**이 실내 측위 장치가 하던 일 — **「출발점 정하기」**를 대신합니다. 길을 잃는 지하 · 계단에서도 멈추지 않습니다.' 46 | Out-Null

# ───────────────────────────────────────── 6-2. 기능 2 : [불편함 B]를 개선하는 [기능 2]
$sl = Page '06 · 핵심 기능 시연 · 기능 2' '「안내는 금방 낡는다」를 개선하는 [[제보 + AI 판정]]' (Crumb '기능 시연') '기능 2 입니다. 가장 아픈 Pain Point 4, 안내가 낡는 문제를 개선합니다.\n사진이 낡는데 다시 찍을 사람이 없으니 이용자가 건의함에서 찍어 올리게 했습니다. 그러면 새 문제가 생깁니다. 올라온 사진이 어디인지 누가 가립니까? 사람이 하면 Pain Point 4 가 다시 깨집니다. 그래서 AI 가 사진을 숫자 1,280개로 바꿔 기준 자료와 비교합니다.\n처음에는 전부 답하게 했더니 자리 정답이 55.6% 였습니다. 엘리베이터 안처럼 층마다 똑같은 곳은 0% 였습니다.\n그래서 두 가지를 바꿨습니다. 1등 점수가 아니라 1등과 2등의 격차로 확신을 재고 확신한 만큼만 답하게 했더니, 상위 10% 에서 92.9% 가 됐습니다. 같은 사진을 1등 점수로 고르면 64.7% 입니다. 그리고 번호판이나 층 표시가 보이면 글자를 먼저 읽어 엘리베이터 안에서 97% 를 맞힙니다.\n이용자에게는 확신한 만큼만 말하고, 관리자가 승인하기 전에는 누구의 화면에도 반영되지 않습니다.'
$lw = 470
Rows $sl @(
  @('문제', '사진이 낡는데 다시 찍을 사람이 없습니다 → **이용자가 찍어 올리게** 했습니다 (건의함 · 하루 3번)', ''),
  @('새 문제', '올라온 사진이 어디인지 **누가 가립니까?** 사람이 하면 Pain Point 4가 다시 깨집니다', 'am'),
  @('부딪힌 벽', 'AI가 전부 답하게 하니 **자리 정답 55.6%** — 층마다 똑같은 엘리베이터 안은 **0%**', 'am'),
  @('해결 ①', '1등 점수가 아니라 **1·2등 격차**로 확신을 재고, **확신한 만큼만** 답합니다', ''),
  @('해결 ②', '번호판 · 층 표시가 보이면 **글자를 먼저** 읽습니다 → 엘리베이터 안 **97%** 적중', ''),
  @('안전장치', '관리자가 승인하기 전에는 **누구의 화면에도 반영되지 않습니다**', 'dark')
) $M 104 $lw 50 11
$rx = $M + $lw + 22; $rw = $M + $CW - $rx
Card $sl $rx 104 $rw 156 | Out-Null
T $sl ($rx + 16) 115 ($rw - 32) 18 '**자리를 맞힌 비율**  ~~시험 사진 1,844장~~' 11.5 $INK | Out-Null
$bars = @(@('전부 답할 때', 55.6, 'AEB6BF', $INK2), @('확신 상위 10% · 1등 점수로 고르면', 64.7, 'DDBE9C', $INK2), @('확신 상위 10% · 1·2등 격차로 고르면', 92.9, $AM, $AM))
$bw = $rw - 32
for($i = 0; $i -lt 3; $i++){
  $yy = 142 + $i * 37; $b = $bars[$i]
  T $sl ($rx + 16) $yy ($bw - 50) 14 $b[0] 10 $INK2 | Out-Null
  T $sl ($rx + 16 + $bw - 50) $yy 50 14 ([string]$b[1] + '%') 10.5 $b[3] -bold -align 3 | Out-Null
  Rect $sl ($rx + 16) ($yy + 18) $bw 9 $AC2 '' 0 4.5 | Out-Null
  Rect $sl ($rx + 16) ($yy + 18) ($bw * $b[1] / 100) 9 $b[2] '' 0 4.5 | Out-Null
}
Card $sl $rx 270 $rw 134 | Out-Null
T $sl ($rx + 16) 281 ($rw - 32) 18 '**이용자가 받는 답**  ~~확신한 만큼만~~' 11.5 $INK | Out-Null
$ans = @(@('「아마 여기예요 : 13101호」', '확신 높음'), @('「층은 3층 같아요」', '층만 확실'), @('「어디인지 알 수 없어요」', '모름'))
for($i = 0; $i -lt 3; $i++){
  $yy = 306 + $i * 32
  Rect $sl ($rx + 14) $yy ($rw - 28) 27 'F4F5F7' '' 0 4 | Out-Null
  T $sl ($rx + 24) ($yy + 6) ($rw - 110) 16 ('**' + $ans[$i][0] + '**') 10.5 $INK | Out-Null
  T $sl ($rx + $rw - 96) ($yy + 7) 72 14 $ans[$i][1] 9.5 $DIM -align 3 | Out-Null
}
Strip $sl 416 '**55.6%와 92.9%는 같은 AI, 같은 사진입니다** — 다른 것은 **「답할지 말지를 정하는 기준」** 하나뿐입니다.' 48 $AM | Out-Null

# ───────────────────────────────────────── 7. 우리가 만든 변화 : [서비스 이름] 도입으로 기대되는 효과
$sl = Page '07 · 우리가 만든 변화' '공대 3호관 길안내 도입으로 [[기대되는 효과]]' (Crumb '변화') '공대 3호관 길안내를 도입하면 무엇이 달라지는지 표로 정리했습니다.\n길 찾기는 지나가는 사람에게 묻는 대신 QR 한 번 찍고 문 앞까지 갑니다. 설치비와 운영비는 0원, 장치는 0대입니다. 지하와 계단에서도 비행기 모드로 안내합니다.\n사진 관리는 관리자가 다시 찍는 대신 이용자가 찍고 AI 가 가리며, 관리자는 승인만 합니다. AI 는 확신할 때만 답해서 92.9% 를 맞히고, 나머지는 층만 말하거나 모른다고 합니다. 처음 온 사람에게는 쉬운 사용모드가 누를 곳을 짚어 줍니다.\n하지만 숫자보다 큰 변화는 이것입니다. 만든 사람이 졸업해도, 이용자가 사진을 고쳐 가며 앱이 계속 맞게 돌아갑니다.'
Tbl $sl $M 104 @(132, 262, 36, 416) @(
  @('무엇이', '지금까지', '', '공대 3호관 길안내'),
  @('**길 찾기**', '지나가는 사람에게 묻고 헤맨다', '[[→]]', '**QR 한 번 찍고 문 앞까지**\n~~네 문 × 지하 1층~5층 · 152곳 · 한국어 / 영어~~'),
  @('**설치 · 운영비**', '측위 장치 수십 대 · 공사 · 서버비', '[[→]]', '**0원 · 장치 0대**\n~~QR 스티커 4장 · 무료 한도 안~~'),
  @('**지하 · 계단**', '신호가 없으면 멈춘다', '[[→]]', '**비행기 모드에서도 안내**\n~~처음 한 번 16.5MB 저장~~'),
  @('**사진 관리**', '관리자가 다시 찍고 분류한다', '[[→]]', '**이용자가 찍고 AI가 가린다**\n~~관리자는 승인만~~'),
  @('**AI의 답**', '전부 답하면 자리 정답 55.6%', '[[→]]', '**확신할 때만 답한다 — 92.9%**\n~~나머지는 층만, 또는 「모르겠다」~~'),
  @('**처음 온 사람**', '어디부터 눌러야 할지 모른다', '[[→]]', '**쉬운 사용모드가 누를 곳을 짚어 준다**\n~~English 한 번이면 전체가 영어로~~')
) -fs 12 -rowH 43 -align @{ 3 = 2 } | Out-Null
Strip $sl 418 '**숫자보다 큰 변화** — 만든 사람이 졸업해도, **이용자가 사진을 고쳐 가며** 앱이 계속 맞게 돌아갑니다.' 48 | Out-Null

# ───────────────────────────────────────── 8. 향후 발전 방향 : 더 나은 서비스를 위한 다음 단계
$sl = Page '08 · 향후 발전 방향' '더 나은 서비스를 위한 [[다음 단계]]' (Crumb '발전 방향') '다음 단계입니다. 지금 10월까지 네 문에서 지하 1층부터 5층까지 152곳 안내, 사진 제보와 AI 위치 판정, 쉬운 사용모드와 영어 안내까지 만들어 공개 주소로 배포 중입니다.\n최종 발표 전까지는 다듬습니다. 측정해 보니 5층 사진의 22% 를 4층으로 봤습니다. 이렇게 약한 자리의 사진을 보강하고, QR 스티커를 실제 문에 붙여 네 문에서 각 층까지 직접 걸어 확인합니다.\n그다음은 넓힙니다. 지금은 AI 자료를 받아 두지 않아 사진 판정만 인터넷이 필요한데, 스토어 앱으로 감싸면 이것까지 설치 파일에 넣어 인터넷 없이 됩니다. 설치 크기는 47MB 안팎입니다. 지금 웹앱인 것은 못 해서가 아니라 돈 0원 조건 때문이고, 화면은 새로 만들 필요 없이 지금 코드를 그대로 감싸면 됩니다.\n목표는 하나, 처음 온 사람이 누구에게도 묻지 않고 3호관 어느 문 앞이든 찾아가는 것입니다.'
$tl = @(
  @('지금 · 10월', '여기까지 왔습니다', @('네 문에서 지하 1층~5층 **152곳** 안내', '사진 제보 · **AI 위치 판정** 동작', '쉬운 사용모드 · 영어 · **공개 주소로 배포 중**'), $AC, $INK),
  @('11월 · 최종 발표 전', '다듬습니다', @('**약한 자리 사진 보강** — 5층 사진의 22%를 4층으로 봤습니다', '**QR 스티커 현장 시험** — 네 문에서 각 층까지 직접 걸어 확인', '최종 보고서 · 시연 연습'), $AC, $INK),
  @('그다음', '넓힙니다', @('**스토어 앱으로 감싸기** — AI 판정까지 인터넷 없이 (설치 47MB 안팎)', '지금 코드를 **그대로 감싸면** 됩니다 — 화면을 새로 만들 필요 없음', '다른 건물로 — 좌표표 · 사진 · QR만 새로'), $AM, $AM))
$tw3 = ($CW - 2 * 24) / 3
Line $sl $M 118 ($M + $CW) 118 $LINE 1.5 | Out-Null
for($i = 0; $i -lt 3; $i++){
  $xx = $M + $i * ($tw3 + 24); $c = $tl[$i]
  $o = $sl.Shapes.AddShape(9, $xx, 109, 18, 18); $o.Fill.ForeColor.RGB = (C $(if($i -eq 0){ $c[3] } else { 'FFFFFF' })); $o.Line.ForeColor.RGB = (C $c[3]); $o.Line.Weight = 3.5; $o.Shadow.Visible = 0
  T $sl $xx 138 $tw3 14 $c[0] 9.5 $DIM -bold -spacing 1 | Out-Null
  T $sl $xx 156 $tw3 24 $c[1] 17 $c[4] -bold | Out-Null
  $b = T $sl $xx 196 $tw3 210 ($c[2] -join '\n') 13 $INK2 -lines 1.45 -after 12
  Bullets $b
}
Strip $sl 418 '**목표는 하나** — 처음 온 사람이 **누구에게도 묻지 않고** 3호관 어느 문 앞이든 찾아가는 것입니다.' 48 | Out-Null

# ───────────────────────────────────────── 9. 마무리하며 : 프로젝트 요약 및 결론
$sl = Page '09 · 마무리하며' '프로젝트 [[요약 및 결론]]' (Crumb '마무리') '마무리하겠습니다. 저희가 발견한 네 가지 문제에 이렇게 답했습니다.\n돈이 계속 드는 문제는 휴대폰이 계산하게 해서 서버와 배포 비용 0원으로, 장치를 달 수 없는 문제는 들어온 문을 묻는 출입문 QR 로, 신호가 없는 문제는 처음 한 번 통째로 담는 설치형 웹앱으로, 안내가 낡는 문제는 이용자가 찍고 AI 가 확신할 때만 가리는 방식으로 답했습니다.\n그리고 결론입니다. 틀릴 걸 알면서 답하는 AI 는 쓸 수가 없습니다. 그래서 저희는 정확도를 올리는 대신 「모르겠다」고 말하는 법을 가르쳤습니다. 전부 답하면 55.6%, 답할 것만 골라 답하면 92.9% — 같은 AI, 같은 사진입니다.\n이 앱이 할 줄 아는 가장 중요한 말은 「여기가 어디인지 모르겠습니다」입니다.'
Tbl $sl $M 104 @(196, 400, 250) @(
  @('우리가 발견한 문제', '우리의 답', '그래서'),
  @('**돈이 계속 든다**', '서버 대신 [[휴대폰이 계산한다]]', '서버 · 배포 **0원**'),
  @('**장치를 달 수 없다**', '위치를 재지 않고 [[들어온 문을 묻는다]] — 출입문 QR', '장치 **0대**로 문 앞까지'),
  @('**헤매는 곳은 신호가 없다**', '처음 한 번 [[휴대폰에 통째로 담는다]] — 설치형 웹앱', '**비행기 모드**에서도 안내'),
  @('**안내는 금방 낡는다**', '[[이용자가 찍고 AI가 가린다]] — 확신할 때만', '확신 상위 10%에서 **92.9%**')
) -fs 12 -rowH 40 | Out-Null
Rect $sl $M 322 $CW 150 $AC '' 0 5.7 | Out-Null
T $sl ($M + 28) 340 ($CW - 56) 28 '[[틀릴 걸 알면서 답하는 AI는, 쓸 수가 없습니다.]]' 18 'FFFFFF' -bold -accent $MINT | Out-Null
T $sl ($M + 28) 376 ($CW - 56) 90 '그래서 저희는 정확도를 올리는 대신, **「모르겠다」고 말하는 법**을 가르쳤습니다. 전부 답하면 55.6% · 골라 답하면 **92.9%** — 같은 AI, 같은 사진입니다.\n이 앱이 할 줄 아는 가장 중요한 말은 **「여기가 어디인지 모르겠습니다」**입니다.' 12.5 'D5D7DA' -lines 1.6 -boldColor 'FFFFFF' | Out-Null

# ───────────────────────────────────────── 10. Q&A : 질의응답
$script:pg++
$sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl $AC
T $sl $M 120 600 16 '1 0 · Q & A' 10 'B9BBBE' -bold -spacing 3 | Out-Null
T $sl $M 146 600 80 'Q [[&]] A' 60 'FFFFFF' -bold -accent $MINT -boldColor 'FFFFFF' | Out-Null
T $sl $M 232 600 24 '질의응답 — 들어 주셔서 감사합니다' 16 'D5D7DA' | Out-Null
Rect $sl $M 276 113 5 $MINT | Out-Null
T $sl $M 300 600 40 '**공대 3호관 길안내** · 팀 공3길\n김민종 · 손의윤 · 문성일   |   지도교수 강규창 교수님' 12 'A4A7AB' -lines 1.6 -boldColor 'E2E3E5' | Out-Null
Rect $sl 690 86 214 348 'FFFFFF' '' 0 8 | Out-Null
T $sl 690 100 214 18 '지금 바로 써 보기' 12 $AC -bold -align 2 | Out-Null
Pic $sl 'QR_정문.png' 707 124 180 0 '' | Out-Null
T $sl 690 406 214 16 'minjong0910.github.io' 10.5 $AC -bold -align 2 | Out-Null
Foot $sl '공대 3호관 길안내 · 김민종 · 손의윤 · 문성일' -dark
Notes $sl '들어 주셔서 감사합니다. 오른쪽 QR 을 지금 휴대폰 카메라로 찍으시면 바로 써 보실 수 있습니다.\n질문 받겠습니다.'

# ══ 저장 ══════════════════════════════════════════════════════
if($pres.Slides.Count -ne 12){ throw ('쪽 수가 12 가 아닙니다 : ' + $pres.Slides.Count) }
$pptx = Join-Path $OutDir ($NAME + '.pptx'); $pdf = Join-Path $OutDir ($NAME + '.pdf')
$pres.SaveAs($pptx, 24)
$pres.SaveAs($pdf, 32)
'저장 : ' + $pptx
'저장 : ' + $pdf
} finally {
  try{ $pres.Close() }catch{}
  if($app.Presentations.Count -eq 0){ try{ $app.Quit() }catch{} }
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}
if($Desktop){
  $dk = [Environment]::GetFolderPath('Desktop')
  Copy-Item (Join-Path $OutDir ($NAME + '.pptx')) (Join-Path $dk ($NAME + '.pptx')) -Force
  '바탕화면에도 놓음 : ' + (Join-Path $dk ($NAME + '.pptx'))
}
