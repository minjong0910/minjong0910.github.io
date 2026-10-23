# 졸업작품 모의 발표 자료 두 벌 — 조원 두 사람이 한 벌씩, 처음부터 끝까지 혼자 발표한다 (PowerPoint)
#
#   2026-10-24 사용자 : 「방금까지 만든 건 나만의 발표자료 — 조원 2명의 발표 자료가 필요. 지금까지 만든 방식 말고 내용 · 자료 사진 · 설명이
#                       각각 다른 유형으로. 두 자료끼리 겹치면 안 되고, 모든 내용이 실제 우리 앱 기반」 · 완전히 새로 · PowerPoint · 15쪽 이내
#   10/24 다시 : 「주제를 똑같이 — 평가할 때 주제가 달라 어렵다. 주제는 같고 안의 내용만 전혀 다르게」 → 두 벌 모두 같은 주제 · Type 2 양식 같은 순서 12쪽
#   ① 이용자 편 — 실제 앱 화면으로(흰 바탕 + 보라). 화면은 10/24 본 서버를 아이폰 크기로 찍은 것(발표그림\모의\A*.jpg · E*.jpg)
#   ② 현장 편   — 앱 화면 없이 3호관에서 직접 찍은 장소 사진만 (종이색 + 먹회색 + 산호색). 안내 문장은 앱의 실제 길안내 기록(tests\golden\v150.json)
#   두 자료 모두 : 구조도 · 블록도 · 흐름도 없음 · 정확도 수치 없음 · 발표자 나눔 표시 없음(한 사람이 한 벌) · 김민종 발표(Type 2 12쪽)와 그림 · 내용이 겹치지 않게
#     (QR 도 나눔 : 김민종 발표 = 동문, ① = 후문, ② = 서문)
#
#   사용법 : pwsh -File 도구\발표PPT_모의_만들기.ps1 [-Kind A|B] [-Desktop]   → 생성물\발표\ 에 .pptx 와 .pdf
param([ValidateSet('전부','A','B')][string]$Kind = '전부', [string]$OutDir = '', [switch]$Desktop)
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$IMG  = Join-Path $PSScriptRoot '발표그림\모의'
if(-not $OutDir){ $OutDir = Join-Path $ROOT '생성물\발표' }
New-Item -ItemType Directory -Force $OutDir | Out-Null
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
  $s.Height = $h
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

# 앞에 점(·)이 붙는 줄 목록
function Bullets($s){
  $tr = $s.TextFrame.TextRange
  $tr.ParagraphFormat.Bullet.Visible = -1; $tr.ParagraphFormat.Bullet.Character = 183
  $s.TextFrame.Ruler.Levels.Item(1).FirstMargin = 0; $s.TextFrame.Ruler.Levels.Item(1).LeftMargin = 10
}
function Oval($sl, [double]$x, [double]$y, [double]$d, [string]$fill, [string]$text, [double]$fs = 10.5, [string]$color = 'FFFFFF'){
  $o = $sl.Shapes.AddShape(9, $x, $y, $d, $d); $o.Line.Visible = 0; $o.Fill.ForeColor.RGB = (C $fill); $o.Shadow.Visible = 0
  $tf = $o.TextFrame; $tf.MarginLeft = 0; $tf.MarginRight = 0; $tf.MarginTop = 0; $tf.MarginBottom = 0; $tf.VerticalAnchor = 3; $tf.WordWrap = 0
  $tr = $tf.TextRange; $tr.Text = $text; $tr.Font.Name = $FONT; $tr.Font.Size = $fs; $tr.Font.Bold = -1; $tr.Font.Color.RGB = (C $color); $tr.ParagraphFormat.Alignment = 2
  return $o
}
# 글상자 높이를 글에 맞춰 줄이고 그 높이를 돌려준다
function Fit($s){ $h = $s.TextFrame.TextRange.BoundHeight; $s.Height = $h + 2; return $h }
function PhoneW([string]$file, [double]$h){ $sz = ImgSize (Join-Path $IMG $file); return $h * $sz[0] / $sz[1] }

function NewPres(){
  $script:pres = $app.Presentations.Add(0)
  $pres.PageSetup.SlideWidth = $W; $pres.PageSetup.SlideHeight = $H
  $script:pg = 0
}
function SavePres([string]$name, [int]$want){
  if($pres.Slides.Count -ne $want){ throw ($name + ' : 쪽 수가 ' + $want + ' 이 아닙니다 (' + $pres.Slides.Count + ')') }
  $pptx = Join-Path $OutDir ($name + '.pptx'); $pdf = Join-Path $OutDir ($name + '.pdf')
  $pres.SaveAs($pptx, 24); $pres.SaveAs($pdf, 32); $pres.Close()
  '저장 : ' + $pptx
  if($Desktop){ $dk = [Environment]::GetFolderPath('Desktop'); Copy-Item $pptx (Join-Path $dk ($name + '.pptx')) -Force; '바탕화면에도 놓음 : ' + $name + '.pptx' }
}

# ═════════════════════════════════════════════════════════════════════════
#  두 벌 모두 같은 주제 · 같은 순서(교수님 Type 2 양식 10단계 + 기능 1 · 2 = 12쪽) — 쪽 제목도 양식 문장. 안의 예시 · 사진 · 설명만 전혀 다르게
#   2026-10-24 사용자 : 「주제를 똑같이 맞춰줘. 평가할 때 주제가 달라서 어떻게 평가해야 할지 모르겠어.
#                       주제는 똑같지만 안의 내용을 전혀 다른 2개로」 → 순서도 Type 2 로 같게(사용자 고름)
#   ① 앱 화면으로 보는 이용자 이야기 (흰 바탕 + 보라) · ② 3호관 현장 사진으로 보는 공간 이야기 (종이색 + 산호색)
# ═════════════════════════════════════════════════════════════════════════
$STEPS8 = @('들어가며', '문제점', '해결 아이디어', '설계 및 구현', '기능 시연', '변화', '발전 방향', '마무리')
function CrumbM([string]$cur){ return (($STEPS8 | ForEach-Object { if($_ -eq $cur){ '[[' + $_ + ']]' } else { $_ } }) -join '  ›  ') }

# ── ① 쪽 틀
function PaletteA(){
  $script:BG = 'FFFFFF'; $script:INK = '1B1F3B'; $script:INK2 = '474C68'; $script:DIM = '7A7F96'
  $script:LINE = 'D9D4F6'; $script:LINE2 = 'ECE9FB'; $script:CARD = 'FFFFFF'
  $script:AC = '5B3FE0'; $script:AC2 = 'F0EDFF'; $script:ACT = '3B2A9E'; $script:AM = '5B3FE0'; $script:RD = 'D93A5B'; $script:MINT = '0AB3D4'
}
function PgA([string]$kick, [string]$title, [string]$lead, [string]$crumb, [string]$notes){
  $script:pg++
  $sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl 'FFFFFF'
  Rect $sl 0 0 8 $H $AC | Out-Null
  Chip $sl $M 26 (22 + 9.6 * $kick.Length) 22 $kick $AC 'FFFFFF' 10 -bold -radius 11 | Out-Null
  T $sl $M 54 $CW 32 $title 21 $INK -bold -accent $AC -lines 1.1 | Out-Null
  if($lead){ T $sl $M 90 $CW 20 $lead 12 $INK2 | Out-Null }
  Line $sl $M $FOOTY ($M + $CW) $FOOTY $LINE2 0.75 | Out-Null
  T $sl $M ($FOOTY + 6) 700 14 (CrumbM $crumb) 8.5 $DIM -spacing 0.6 | Out-Null
  T $sl ($M + $CW - 100) ($FOOTY + 6) 100 14 ([string]$script:pg) 8.5 $DIM -align 3 | Out-Null
  Notes $sl $notes
  return $sl
}
function PhonesA($sl, [object[]]$items, [double]$x, [double]$y, [double]$ph, [double]$gap = 14){
  foreach($it in $items){
    $pw = PhoneW $it[0] $ph
    Pic $sl $it[0] $x $y $pw $ph 'CFC6F7' -round | Out-Null
    if($it[1]){ T $sl ($x - 12) ($y + $ph + 6) ($pw + 24) 16 $it[1] 10 $INK2 -bold -align 2 | Out-Null }
    $x += $pw + $gap
  }
  return $x
}
function StepsA($sl, [object[]]$items, [double]$x, [double]$y, [double]$bw, [double]$gap = 12){
  T $sl $x $y $bw 16 '이렇게 씁니다' 10 $AC -bold -spacing 1.5 | Out-Null
  $y += 24
  for($i = 0; $i -lt $items.Count; $i++){
    Oval $sl $x $y 22 $AC ([string]($i + 1)) 10.5 | Out-Null
    $t = T $sl ($x + 32) ($y + 1) ($bw - 32) 200 ('**' + $items[$i][0] + '**' + $(if($items[$i][1]){ '\n' + $items[$i][1] } else { '' })) 11.5 $INK2 -lines 1.32 -boldColor $INK
    $th = Fit $t
    $y += [Math]::Max(24, $th) + $gap
  }
  return $y
}
function BoxA($sl, [double]$x, [double]$y, [double]$bw, [string]$label, [string]$text){
  $b = Rect $sl $x $y $bw 50 $AC2 '' 0 6
  T $sl ($x + 14) ($y + 9) ($bw - 28) 14 $label 9.5 $AC -bold -spacing 1 | Out-Null
  $t = T $sl ($x + 14) ($y + 26) ($bw - 28) 100 $text 11 $INK -lines 1.3
  $th = Fit $t; $b.Height = 26 + $th + 12
  return ($y + $b.Height)
}
function StripA($sl, [double]$y, [string]$text, [double]$sh = 44){
  Rect $sl $M $y $CW $sh $AC2 '' 0 6 | Out-Null
  Rect $sl $M $y 6 $sh $AC | Out-Null
  $t = T $sl ($M + 22) $y ($CW - 40) $sh $text 12.5 $INK -anchor 3 -lines 1.3
  $t.Height = $sh
}

# ── ② 쪽 틀
function PaletteB(){
  $script:BG = 'F5F1EA'; $script:INK = '23292F'; $script:INK2 = '4E565E'; $script:DIM = '857C70'
  $script:LINE = 'DDD3C4'; $script:LINE2 = 'E9E1D4'; $script:CARD = 'FFFDF9'
  $script:AC = '23292F'; $script:AC2 = 'ECE4D6'; $script:ACT = '23292F'; $script:AM = 'D9482B'; $script:RD = 'B3261E'; $script:MINT = 'D9482B'
}
function PgB([string]$kick, [string]$title, [string]$lead, [string]$crumb, [string]$notes){
  $script:pg++
  $sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl $BG
  Oval $sl $M 29 12 $AM '' | Out-Null
  T $sl ($M + 20) 26 600 16 $kick 10 $AM -bold -spacing 2 | Out-Null
  T $sl $M 48 $CW 32 $title 21 $INK -bold -accent $AM -lines 1.1 | Out-Null
  if($lead){ T $sl $M 84 $CW 20 $lead 12 $INK2 | Out-Null }
  Line $sl $M $FOOTY ($M + $CW) $FOOTY $LINE 0.75 | Out-Null
  T $sl $M ($FOOTY + 6) 700 14 (CrumbM $crumb) 8.5 $DIM -spacing 0.6 | Out-Null
  T $sl ($M + $CW - 100) ($FOOTY + 6) 100 14 ([string]$script:pg) 8.5 $DIM -align 3 | Out-Null
  Notes $sl $notes
  return $sl
}
function PhotoB($sl, [string]$file, [double]$x, [double]$y, [double]$bw, [double]$bh){
  $p = PicCover $sl $file $x $y $bw $bh ''
  try{ $p.AutoShapeType = 1 }catch{}
  $p.Line.Visible = 0
  return $p
}
function TagB($sl, [double]$x, [double]$y, [string]$text, [string]$fill = 'D9482B'){
  $tw = [Math]::Min(260, 16 + 8.2 * $text.Length)
  Chip $sl $x $y $tw 20 $text $fill 'FFFFFF' 9 -bold -radius 0 | Out-Null
}
function StripB($sl, [double]$y, [string]$text, [double]$sh = 44){
  Rect $sl $M $y $CW $sh $CARD $LINE 0.75 | Out-Null
  Rect $sl $M $y 5 $sh $AM | Out-Null
  $t = T $sl ($M + 20) $y ($CW - 36) $sh $text 12 $INK2 -anchor 3 -lines 1.3
  $t.Height = $sh
}

# 표지 · Q&A 의 공통 글 — 두 벌 모두 같은 주제
$TOPIC = '공대 3호관 길안내'
$TOPIC_SUB = '건물 안에서 길을 잃는 문제 해결을 위한\n[[새로운 제안]]'

# ═════════════════════════════════════════════════════════════════════════
#  ① 앱 화면으로 보는 이용자 이야기
# ═════════════════════════════════════════════════════════════════════════
function BuildA(){
  PaletteA; NewPres
  # ── 1 표지
  $script:pg++
  $sl = $pres.Slides.Add(1, 12); Bg $sl $AC
  $o = $sl.Shapes.AddShape(9, 560, -120, 520, 520); $o.Line.Visible = 0; $o.Fill.ForeColor.RGB = (C '7B62F0'); $o.Fill.Transparency = 0.35; $o.Shadow.Visible = 0
  T $sl $M 120 480 16 '졸업작품 모의 발표 ① · 이용자의 손끝에서' 11 'D9D2FF' -bold -spacing 2 | Out-Null
  T $sl $M 146 480 56 $TOPIC 40 'FFFFFF' -bold | Out-Null
  T $sl $M 212 480 60 $TOPIC_SUB 19 'E6E2FF' -lines 1.4 -accent '8FEBFA' | Out-Null
  Rect $sl $M 292 90 4 '8FEBFA' | Out-Null
  T $sl $M 314 480 40 '**팀 공3길**    김민종 · 손의윤 · 문성일\n**지도교수**    강규창 교수님' 11.5 'D9D2FF' -lines 1.7 -boldColor 'FFFFFF' | Out-Null
  $pw1 = PhoneW 'A02_쉬운모드_첫화면.jpg' 390
  Pic $sl 'A02_쉬운모드_첫화면.jpg' 548 75 $pw1 390 '8C78F2' -round | Out-Null
  Pic $sl 'E06_단계1.jpg' (548 + $pw1 + 14) 75 $pw1 390 '8C78F2' -round | Out-Null
  Notes $sl '안녕하십니까. 팀 공3길의 졸업작품 「공대 3호관 길안내」를 발표하겠습니다. 건물 안에서 길을 잃는 문제를 해결하기 위한 새로운 제안입니다.\n오늘은 이 앱을 쓰는 사람의 손끝에서, 실제 화면을 따라 말씀드리겠습니다.'

  # ── 2 들어가며
  $sl = PgA '02 · 들어가며' '혹시 이런 불편함, [[겪어 보셨나요?]]' '처음 3호관에 오는 사람은 — 저마다 다른 것을 손에 쥐고 옵니다.' '들어가며' '처음 3호관에 오는 사람을 떠올려 보십시오. 저마다 손에 쥔 정보가 다릅니다.\n신입생은 시간표의 13524 라는 번호만 들고 옵니다. 몇 층인지는 모릅니다. 학부모나 손님은 교수님 성함만 압니다. 호실 번호는 모릅니다. 그리고 폰이 낯선 분은 앱을 깔고 가입하라는 말에서 멈춥니다.\n길을 찾는 사람마다 손에 쥔 정보가 다른데, 안내는 한 가지 방식뿐입니다.'
  $cards = @(
    @('13524', '「시간표엔 13524 —\n몇 층으로 가야 하죠?」', '번호만 아는 신입생'),
    @('이재호 교수님', '「교수님 성함만 알아요 —\n호실은 모르고요」', '성함만 아는 학부모 · 손님'),
    @('앱 설치 · 가입?', '「앱을 깔고\n가입까지 해야 하나요?」', '폰이 낯선 방문객'))
  $cw3 = ($CW - 2 * 18) / 3
  for($i = 0; $i -lt 3; $i++){
    $xx = $M + $i * ($cw3 + 18)
    Card $sl $xx 124 $cw3 270 $(if($i -eq 2){ 'FAF9FF' } else { 'FFFFFF' }) $LINE | Out-Null
    Rect $sl $xx 124 $cw3 5 $AC | Out-Null
    T $sl ($xx + 20) 146 ($cw3 - 40) 40 $cards[$i][0] 24 $AC -bold | Out-Null
    T $sl ($xx + 20) 206 ($cw3 - 40) 90 $cards[$i][1] 16 $INK -bold -lines 1.4 | Out-Null
    Line $sl ($xx + 20) 330 ($xx + $cw3 - 20) 330 $LINE2 0.75 | Out-Null
    T $sl ($xx + 20) 344 ($cw3 - 40) 20 $cards[$i][2] 11.5 $DIM | Out-Null
  }
  StripA $sl 412 '길을 찾는 사람마다 **손에 쥔 정보가 다릅니다** — 그런데 안내는 한 가지 방식뿐입니다.' 46

  # ── 3 문제점
  $sl = PgA '03 · 우리가 발견한 문제점' '기존 방식의 한계와 명확한 [[Pain Point]]' '이용자 쪽에서 보면 — 지금 있는 안내는 세 군데에서 막힙니다.' '문제점' '이용자 쪽에서 보면 지금 있는 안내는 세 군데에서 막힙니다.\n첫째, 내가 아는 것으로 못 찾습니다. 벽의 안내도에서는 교수님 성함이나 학과 사무실 이름을 찾기 어렵고, 지도 앱은 건물 이름까지만 압니다.\n둘째, 앱이 문턱입니다. 설치하고 가입하고 메뉴를 익혀야 하는데, 폰이 낯선 분은 여기서 시작도 못 합니다.\n셋째, 한국어뿐입니다. 유학생이나 외국인 방문객은 안내판과 호실 이름을 읽기 어렵습니다.\n가장 아픈 곳은 둘째입니다. 앱이 어려우면 안내가 아무리 좋아도 쓰이지 않습니다.'
  $pp = @(
    @('PAIN POINT 1', '「아는 것」으로 못 찾는다', '벽의 안내도에서는 **교수님 성함 · 학과 사무실 이름**을 찾기 어렵고, 지도 앱은 **건물 이름까지만** 압니다.', '기존 — 벽 안내도 · 지도 앱', $false),
    @('PAIN POINT 2', '「앱」이 문턱이다', '설치하고, 가입하고, 메뉴를 익혀야 — **폰이 낯선 분은 시작도 못 합니다.**', '기존 — 앱스토어에서 받는 앱', $true),
    @('PAIN POINT 3', '「한국어」뿐이다', '안내판도 호실 이름도 한국어 — **유학생 · 외국인 방문객**은 읽기 어렵습니다.', '기존 — 한국어 안내판', $false))
  for($i = 0; $i -lt 3; $i++){
    $xx = $M + $i * ($cw3 + 18); $hot = $pp[$i][4]
    Card $sl $xx 124 $cw3 268 $(if($hot){ 'F4F1FF' } else { 'FFFFFF' }) $(if($hot){ 'B9AEF2' } else { $LINE }) | Out-Null
    T $sl ($xx + 20) 142 ($cw3 - 40) 14 $pp[$i][0] 9.5 $(if($hot){ $AC } else { $DIM }) -bold -spacing 1.5 | Out-Null
    T $sl ($xx + 20) 164 ($cw3 - 40) 26 $pp[$i][1] 17 $(if($hot){ $AC } else { $INK }) -bold | Out-Null
    T $sl ($xx + 20) 204 ($cw3 - 40) 110 $pp[$i][2] 12.5 $INK2 -lines 1.55 | Out-Null
    Line $sl ($xx + 20) 340 ($xx + $cw3 - 20) 340 $LINE 0.75 -dash | Out-Null
    T $sl ($xx + 20) 352 ($cw3 - 40) 20 $pp[$i][3] 10 $DIM | Out-Null
  }
  StripA $sl 410 '가장 아픈 곳은 **PAIN POINT 2** — 앱이 어려우면, 안내가 아무리 좋아도 **시작조차 못 합니다.**' 46

  # ── 4 해결 아이디어
  $sl = PgA '04 · 우리의 해결 아이디어' '그래서 우리는 [[아는 만큼만 찾는 길안내]]를 생각했습니다' '세 가지 막힘에 하나씩 — 이용자가 따로 배울 것이 없게 했습니다.' '해결 아이디어' '그래서 저희는 아는 만큼만 입력하면 찾아 주는 길안내를 생각했습니다.\n아는 것이 제각각인 문제에는 검색창 하나로 호실 번호, 교수님 성함, 초성까지 받습니다. 앱이 문턱인 문제에는 설치도 가입도 없이 QR 한 번이면 열리고, 쉬운 사용모드가 누를 곳을 손가락으로 짚어 줍니다. 한국어뿐인 문제에는 English 한 번으로 안내 전체를 영어로 바꿉니다.\n한 문장으로, 아는 것만 들고 와도 누를 곳을 따라가면 문 앞까지 갑니다.'
  $ideas = @(
    @('A04_초성검색.jpg', 'PAIN 1 → 아는 대로 찾는다', '검색창 하나에 **호실 번호 · 교수님 성함 · 초성**'),
    @('E03_무엇을찾으세요.jpg', 'PAIN 2 → 설치 없이, 손가락이 안내', '**QR 한 번**이면 바로 열리고, **쉬운 사용모드**가 누를 곳을'),
    @('화면18_영어.jpg', 'PAIN 3 → English 한 번', '안내 문장 · 버튼 · 층 이름까지 **모두 영어로**'))
  for($i = 0; $i -lt 3; $i++){
    $xx = $M + $i * ($cw3 + 18)
    Card $sl $xx 120 $cw3 280 'FAF9FF' $LINE | Out-Null
    $pw = PhoneW $ideas[$i][0] 190
    Pic $sl $ideas[$i][0] ($xx + ($cw3 - $pw) / 2) 132 $pw 190 'CFC6F7' -round | Out-Null
    T $sl ($xx + 16) 332 ($cw3 - 32) 18 $ideas[$i][1] 12.5 $AC -bold | Out-Null
    T $sl ($xx + 16) 354 ($cw3 - 32) 40 $ideas[$i][2] 11 $INK2 -lines 1.35 | Out-Null
  }
  StripA $sl 414 '**한 문장으로** — 아는 것만 들고 와도, **누를 곳을 따라가면** 문 앞까지.' 44

  # ── 5 설계 및 구현
  $sl = PgA '05 · 솔루션 설계 및 구현' '공대 3호관 길안내의 [[전체 구조와 개발 기술]]' '이용자가 만나는 화면 다섯 개 — 화면마다 쓰인 기술입니다.' '설계 및 구현' '이용자가 만나는 화면은 크게 다섯 개입니다. 화면마다 무엇으로 만들었는지 보시겠습니다.\n첫 화면을 포함한 앱 전체는 앱스토어 없이 브라우저에서 열리는 설치형 웹앱입니다. 찾기 화면의 초성 검색은 글자의 첫소리를 직접 비교하도록 만들었습니다. 3D 화면은 three.js 로 좌표에서 건물을 그립니다. 단계 화면은 서비스 워커가 휴대폰에 저장해 둔 실제 사진과 한 문장을 보여 주고, 즐겨찾기와 이어 하기는 휴대폰 안에 저장합니다.\n화면 설계에는 원칙이 있습니다. 오른쪽 위는 인터넷과 메뉴 두 개만, 버튼 테두리는 또렷하게, 말풍선은 사진을 가리지 않게 했습니다.'
  $scr = @(
    @('A02_쉬운모드_첫화면.jpg', '첫 화면', '설치형 웹앱(PWA)', '앱스토어 없이 브라우저에서'),
    @('E04_성함검색.jpg', '찾기', '초성 검색', '첫소리를 직접 비교'),
    @('E05_3D.jpg', '3D 건물', 'three.js', '좌표에서 건물을 그림'),
    @('E07_단계2.jpg', '단계 안내', '서비스 워커', '사진을 폰에 저장 — 오프라인'),
    @('E10_도착.jpg', '도착 · 다음', 'localStorage', '즐겨찾기 · 이어 하기 저장'))
  $slot5 = $CW / 5
  for($i = 0; $i -lt 5; $i++){
    $pw = PhoneW $scr[$i][0] 236; $xx = $M + $i * $slot5
    Pic $sl $scr[$i][0] ($xx + ($slot5 - $pw) / 2) 118 $pw 236 'CFC6F7' -round | Out-Null
    T $sl $xx 360 $slot5 16 $scr[$i][1] 11 $INK -bold -align 2 | Out-Null
    Chip $sl ($xx + 10) 380 ($slot5 - 20) 22 $scr[$i][2] $AC 'FFFFFF' 9.5 -bold -radius 11 | Out-Null
    T $sl $xx 406 $slot5 14 $scr[$i][3] 9.5 $DIM -align 2 | Out-Null
  }
  StripA $sl 432 '**화면 설계 원칙** — 오른쪽 위는 인터넷 · ☰ 두 개만 · 버튼 테두리 3px · 말풍선은 사진을 가리지 않게 · 글자 크기는 그대로' 42

  # ── 6 핵심 기능 시연
  $sl = PgA '06 · 핵심 기능 시연' '공대 3호관 길안내는 [[이렇게 동작합니다]]' '정문에서 「이재호 교수님」만 알고 출발 — 쉬운 사용모드를 켠 채로 따라가 봅니다.' '기능 시연' '이제 실제로 따라가 보겠습니다. 정문에서, 교수님 성함만 알고 출발하는 경우입니다. 쉬운 사용모드는 켜 두었습니다.\n정문 QR 을 찍으면 「여기가 맞나요?」에 정문 사진이 나옵니다. 「무엇을 찾으세요?」에서 강의실을 누르고, 「이재호」를 치면 전자공학과 이재호 교수님 연구실, 3층 13310 이 나옵니다.\n3D 에서 빨간 곳이 가는 곳이고, 길안내를 시작하면 다섯 단계 — 정문으로 들어오세요, 엘리베이터를 타고 3층으로, 내려서 우회전, 복도를 따라 직진, 그리고 도착입니다.\n노란 말풍선이 매 화면 할 일 한 가지만 알려 줍니다.'
  $flow = @(
    @('E02_여기가맞나요.jpg', '① 정문 QR', '「여기가 맞나요?」'), @('E03_무엇을찾으세요.jpg', '② 무엇을 찾나', '강의실'),
    @('E04_성함검색.jpg', '③ 「이재호」', '3층 13310'), @('E05_3D.jpg', '④ 3D', '빨간 곳이 가는 곳'),
    @('E06_단계1.jpg', '⑤ 1 / 5', '정문으로 들어오세요'), @('E07_단계2.jpg', '⑥ 2 / 5', '엘리베이터 3층'),
    @('E08_단계3.jpg', '⑦ 3 / 5', '내려서 우회전'), @('E10_도착.jpg', '⑧ 도착', '13310호 연구실'))
  $fx0 = 22; $slot8 = ($W - 2 * $fx0) / 8; $phh = 250
  for($i = 0; $i -lt 8; $i++){
    $pw = PhoneW $flow[$i][0] $phh; $xx = $fx0 + $slot8 * $i
    Pic $sl $flow[$i][0] ($xx + ($slot8 - $pw) / 2) 120 $pw $phh 'CFC6F7' -round | Out-Null
    T $sl $xx 378 $slot8 16 $flow[$i][1] 10.5 $(if($i -ge 4 -and $i -le 6){ $AC } else { $INK }) -bold -align 2 | Out-Null
    T $sl $xx 396 $slot8 14 $flow[$i][2] 9 $DIM -align 2 | Out-Null
  }
  StripA $sl 432 '노란 말풍선이 매 화면 **할 일 한 가지만** — 「사진과 같은 곳까지 걸어가서 눌러요」.' 42

  # ── 7 기능 1
  $sl = PgA '06 · 핵심 기능 시연 · 기능 1' '「앱이 낯설다」를 해결하는 [[쉬운 사용모드]]' '설명서를 따로 넘기지 않아도 — 지금 보고 있는 진짜 화면 위에서 알려 줍니다.' '기능 시연' '기능 1 입니다. 앱이 낯설다는 문제를 해결하는 쉬운 사용모드입니다.\n앱을 켜면 「처음이세요?」라고 묻고, 「네」를 누르면 켜집니다. 그다음부터는 지금 눌러야 할 버튼에 노란 테두리와 손가락이 붙고, 말풍선이 할 일을 한 문장으로 알려 줍니다. 길안내 중에는 「1/5」처럼 몇 번째 단계인지도 말풍선에 나옵니다.\n말풍선의 ✕ 를 누르면 꺼지고, 첫 화면 노란 칸이나 설정에서 언제든 다시 켭니다. 설정의 이용안내에는 실제 화면 그림에 번호를 붙인 안내가 11쪽 있습니다.'
  $xr = PhonesA $sl @(@('A01_쉬운모드창.jpg', '「처음이세요?」'), @('E07_단계2.jpg', '단계마다 말풍선'), @('A13_이용안내3.jpg', '이용안내 11쪽')) $M 120 318 12
  $rx = $xr + 14; $rw = $M + $CW - $rx
  $yy = StepsA $sl @(
    @('「처음이세요?」 → 「네」', '앱을 켜면 한 번, QR로 들어오면 매번 묻습니다'),
    @('노란 테두리 + 👆', '지금 누를 버튼에'),
    @('말풍선 한 문장', '단계 번호(1/5)와 할 일 한 가지'),
    @('✕ 를 누르면 꺼짐', '첫 화면 노란 칸 · 설정에서 다시 켜기')) $rx 120 $rw 9
  BoxA $sl $rx ($yy + 2) $rw '이럴 때 좋아요' '폰이 익숙하지 않은 분께 건넬 때 — **「네」 한 번**이면 됩니다.' | Out-Null

  # ── 8 기능 2
  $sl = PgA '06 · 핵심 기능 시연 · 기능 2' '「아는 것이 제각각」을 개선하는 [[하나의 검색창]]' '번호 · 성함 · 초성 — 그리고 English. 아는 만큼만 쳐도 찾습니다.' '기능 시연' '기능 2 입니다. 사람마다 아는 것이 제각각이라는 문제를 하나의 검색창으로 개선했습니다.\n시간표의 호실 번호를 그대로 쳐도 되고, 교수님 성함을 쳐도 됩니다. 이름이 가물가물하면 첫소리만 쳐도 됩니다. 「ㅎㄱㅅㅁㅅ」라고 치면 학과사무실, 1층 13115 가 나옵니다. 한 번 찾은 곳은 최근 기록에 남습니다.\n그리고 설정에서 English 를 누르면 안내 문장, 버튼, 층 이름까지 모두 영어로 바뀝니다.'
  $xr = PhonesA $sl @(@('A04_초성검색.jpg', '「ㅎㄱㅅㅁㅅ」'), @('E04_성함검색.jpg', '「이재호」'), @('화면18_영어.jpg', 'English')) $M 120 318 12
  $rx = $xr + 14; $rw = $M + $CW - $rx
  $yy = StepsA $sl @(
    @('호실 번호', '시간표의 번호 그대로 — 13524'),
    @('교수님 성함', '「이재호」 → 3층 13310 연구실'),
    @('초성만', '「ㅎㄱㅅㅁㅅ」 → 1층 13115 학과사무실'),
    @('English', '설정에서 한 번 — 안내 전체가 영어로')) $rx 120 $rw 9
  BoxA $sl $rx ($yy + 2) $rw '이럴 때 좋아요' '이름이 가물가물해도 — **첫소리만** 기억나면 됩니다.' | Out-Null

  # ── 9 변화
  $sl = PgA '07 · 우리가 만든 변화' '공대 3호관 길안내 도입으로 [[기대되는 효과]]' '처음 한 번이 아니라 — 두 번째, 세 번째가 편해지는 것들입니다.' '변화' '이 앱을 쓰면 무엇이 달라지는지, 쓰는 사람의 하루로 보겠습니다.\n자주 가는 연구실은 별 하나로 즐겨찾기에 담아 다음엔 메뉴에서 바로 엽니다. 길안내 중에 전화가 와서 앱이 꺼져도, 30분 안이면 보던 단계부터 이어 갑니다.\n한낮 야외에서 화면이 안 보이면 메뉴에서 밝은 화면으로 바꾸고, 신호가 끊겨도 오른쪽 위에 「오프라인」이 뜰 뿐 안내는 그대로입니다.\n처음 길을 찾는 것보다, 두 번째와 세 번째가 편해지는 앱입니다.'
  $fx = @(
    @('A09_즐겨찾기_별.jpg', '즐겨찾기', '자주 가는 곳도 매번 다시 검색', '☆ 한 번 — 메뉴에서 바로'),
    @('화면20_이어하기.jpg', '이어 하기', '앱이 꺼지면 처음부터 다시', '30분 안이면 보던 단계부터'),
    @('화면15_밝은화면.jpg', '밝은 화면', '한낮 야외에선 화면이 안 보임', '☰ 에서 밝은 화면 한 번'),
    @('A15_오프라인.jpg', '오프라인 표시', '신호가 끊기면 멈추는 지도 앱', '「오프라인」이어도 안내는 그대로'))
  $c4 = ($CW - 3 * 14) / 4
  for($i = 0; $i -lt 4; $i++){
    $xx = $M + $i * ($c4 + 14)
    Card $sl $xx 116 $c4 290 'FFFFFF' $LINE | Out-Null
    $pw = PhoneW $fx[$i][0] 160
    Pic $sl $fx[$i][0] ($xx + ($c4 - $pw) / 2) 128 $pw 160 'CFC6F7' -round | Out-Null
    T $sl ($xx + 14) 296 ($c4 - 28) 18 $fx[$i][1] 13 $INK -bold | Out-Null
    T $sl ($xx + 14) 320 ($c4 - 28) 14 '지금까지' 8.5 $DIM -bold -spacing 1 | Out-Null
    T $sl ($xx + 14) 336 ($c4 - 28) 30 $fx[$i][2] 10.5 $DIM -lines 1.3 | Out-Null
    T $sl ($xx + 14) 366 ($c4 - 28) 14 '이제는' 8.5 $AC -bold -spacing 1 | Out-Null
    T $sl ($xx + 14) 382 ($c4 - 28) 24 $fx[$i][3] 11 $INK -bold -lines 1.3 | Out-Null
  }
  StripA $sl 420 '처음 한 번 길을 찾는 것보다 — **두 번째, 세 번째가 편해지는 앱**입니다.' 44

  # ── 10 발전 방향
  $sl = PgA '08 · 향후 발전 방향' '더 나은 서비스를 위한 [[다음 단계]]' '이용자 쪽에서 준비 중인 것 하나, 그리고 다음에 넣을 후보 둘입니다.' '발전 방향' '다음 단계입니다. 이용자 쪽에서 준비 중인 것 하나와 다음 후보 둘입니다.\n먼저 NFC 태그입니다. QR 이 훼손되거나 잘 안 읽힐 때 폰을 문에 대기만 하면 그 문에서 시작합니다. 앱은 QR 과 같은 주소를 쓰기 때문에 고칠 것이 없고, 지금 태그 구매 승인을 기다리고 있습니다.\n다음 후보는 카카오톡 미리보기입니다. 친구에게 앱 주소를 보내면 앱 이름과 그림이 미리 보이게 하려 합니다.\n그리고 방 번호 읽는 법입니다. 13524 의 가운데 숫자 5 가 층이라는 것을 알려 주면, 번호만 봐도 몇 층으로 갈지 압니다.'
  $nx = @(
    @('준비 중 · 태그 승인 대기', 'NFC 태그로 열기', 'QR이 훼손되거나 안 읽힐 때 — **폰을 문에 대기만** 하면 그 문에서 시작', '앱은 QR과 같은 주소 — 고칠 것 없이 준비됨'),
    @('다음 후보', '카카오톡 미리보기', '친구에게 주소를 보내면 — **앱 이름과 그림이 미리** 보이게', '「여기로 와」 한마디에 길안내까지'),
    @('다음 후보', '방 번호 읽는 법', '「13524」의 **가운데 숫자 5가 층** — 번호만 봐도 몇 층인지', '시간표만 보고도 엘리베이터 버튼을'))
  for($i = 0; $i -lt 3; $i++){
    $xx = $M + $i * ($cw3 + 18); $ready = ($i -eq 0)
    Card $sl $xx 120 $cw3 278 $(if($ready){ 'F4F1FF' } else { 'FFFFFF' }) $(if($ready){ 'B9AEF2' } else { $LINE }) | Out-Null
    Chip $sl ($xx + 18) 138 (22 + 9 * $nx[$i][0].Length) 22 $nx[$i][0] $(if($ready){ $AC } else { 'FFFFFF' }) $(if($ready){ 'FFFFFF' } else { $AC }) 9.5 -bold -line $(if($ready){ '' } else { $AC }) -radius 11 | Out-Null
    T $sl ($xx + 18) 176 ($cw3 - 36) 26 $nx[$i][1] 17 $INK -bold | Out-Null
    T $sl ($xx + 18) 214 ($cw3 - 36) 100 $nx[$i][2] 12.5 $INK2 -lines 1.55 | Out-Null
    Line $sl ($xx + 18) 340 ($xx + $cw3 - 18) 340 $LINE 0.75 -dash | Out-Null
    T $sl ($xx + 18) 352 ($cw3 - 36) 36 $nx[$i][3] 10.5 $DIM -lines 1.3 | Out-Null
  }
  StripA $sl 414 '**목표는 하나** — 폰이 낯선 사람도 **누구에게도 묻지 않고** 시작하게.' 44

  # ── 11 마무리
  $sl = PgA '09 · 마무리하며' '프로젝트 [[요약 및 결론]]' '' '마무리' '마무리하겠습니다. 저희는 이용자가 막히는 세 곳에 하나씩 답했습니다.\n아는 것이 제각각인 문제에는 번호, 성함, 초성을 모두 받는 하나의 검색창으로, 앱이 문턱인 문제에는 설치 없는 QR 한 번과 쉬운 사용모드로, 한국어뿐인 문제에는 English 한 번으로 답했습니다.\n(잠깐 멈추고) 아는 것만 들고 오십시오. 누를 곳만 따라오면, 문 앞입니다.'
  $sum = @(
    @('아는 것이 제각각', '하나의 검색창', '번호 · 성함 · 초성 — 아는 만큼만'),
    @('앱이 문턱', 'QR 한 번 + 쉬운 사용모드', '설치 · 가입 없이, 손가락만 따라'),
    @('한국어뿐', 'English 한 번', '안내 문장 · 버튼 · 층 이름까지'))
  for($i = 0; $i -lt 3; $i++){
    $xx = $M + $i * ($cw3 + 18)
    Card $sl $xx 100 $cw3 178 'FFFFFF' $LINE | Out-Null
    T $sl ($xx + 18) 116 ($cw3 - 36) 16 ('막힘 — ' + $sum[$i][0]) 10.5 $DIM -bold | Out-Null
    T $sl ($xx + 18) 142 ($cw3 - 36) 56 $sum[$i][1] 18 $AC -bold -lines 1.2 | Out-Null
    T $sl ($xx + 18) 226 ($cw3 - 36) 40 $sum[$i][2] 11.5 $INK2 -lines 1.35 | Out-Null
  }
  Rect $sl $M 296 $CW 176 $AC '' 0 8 | Out-Null
  T $sl ($M + 30) 318 ($CW - 60) 70 '아는 것만 들고 오십시오.\n누를 곳만 따라오면 — [[문 앞입니다.]]' 26 'FFFFFF' -bold -accent '8FEBFA' -lines 1.25 | Out-Null
  T $sl ($M + 30) 410 ($CW - 60) 50 '번호든 성함이든 첫소리든 — 설치도 가입도 없이, 노란 손가락이 짚어 주는 곳만 누르면 됩니다.' 12.5 'E6E2FF' -lines 1.5 | Out-Null

  # ── 12 Q&A
  $script:pg++
  $sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl $AC
  $o = $sl.Shapes.AddShape(9, -160, 300, 460, 460); $o.Line.Visible = 0; $o.Fill.ForeColor.RGB = (C '7B62F0'); $o.Fill.Transparency = 0.4; $o.Shadow.Visible = 0
  T $sl $M 120 520 16 '1 0 · Q & A' 10 'D9D2FF' -bold -spacing 3 | Out-Null
  T $sl $M 146 520 80 'Q [[&]] A' 60 'FFFFFF' -bold -accent '8FEBFA' -boldColor 'FFFFFF' | Out-Null
  T $sl $M 232 520 24 '질의응답 — 들어 주셔서 감사합니다' 16 'E6E2FF' | Out-Null
  Rect $sl $M 276 90 4 '8FEBFA' | Out-Null
  T $sl $M 298 520 40 ('**' + $TOPIC + '** · 팀 공3길\n김민종 · 손의윤 · 문성일   |   지도교수 강규창 교수님') 12 'D9D2FF' -lines 1.6 -boldColor 'FFFFFF' | Out-Null
  T $sl $M 368 520 40 '후문 QR을 찍고 — **쉬운 사용모드를 켠 채로** 직접 따라가 보십시오.' 12.5 'E6E2FF' -boldColor 'FFFFFF' | Out-Null
  $qh = 330; $qw = PhoneW 'QR_후문.png' $qh
  Pic $sl 'QR_후문.png' (903 - $qw) 96 $qw $qh '' | Out-Null
  Notes $sl '들어 주셔서 감사합니다. 오른쪽 후문 QR 을 찍고, 쉬운 사용모드를 켠 채로 직접 따라가 보십시오.\n질문 받겠습니다.'

  SavePres '졸업작품 모의 발표 ① 이용자 편' 12
}

# ═════════════════════════════════════════════════════════════════════════
#  ② 3호관 현장 사진으로 보는 공간 이야기 — 앱 화면 없이 장소 사진만, 안내 문장은 앱의 실제 기록(tests\golden\v150.json)
# ═════════════════════════════════════════════════════════════════════════
function BuildB(){
  PaletteB; NewPres
  # ── 1 표지
  $script:pg++
  $sl = $pres.Slides.Add(1, 12); Bg $sl $AC
  PhotoB $sl '현장_정문.jpg' 0 0 $W $H | Out-Null
  $ov = Rect $sl 0 0 $W $H '1A1F24'; $ov.Fill.Transparency = 0.32
  $ov2 = Rect $sl 0 236 $W 304 '1A1F24'; $ov2.Fill.Transparency = 0.18
  Oval $sl $M 262 12 'FF7A5C' '' | Out-Null
  T $sl ($M + 20) 259 600 16 '졸업작품 모의 발표 ② · 3호관 현장에서' 10.5 'F3D7CC' -bold -spacing 2 | Out-Null
  T $sl $M 284 820 56 $TOPIC 40 'FFFFFF' -bold | Out-Null
  T $sl $M 346 820 60 $TOPIC_SUB 19 'EDE6DC' -lines 1.4 -accent 'FF7A5C' | Out-Null
  T $sl $M 434 820 20 '**팀 공3길**   김민종 · 손의윤 · 문성일    |    **지도교수**   강규창 교수님' 11.5 'D8D0C4' -boldColor 'FFFFFF' | Out-Null
  T $sl ($W - 260) 500 220 14 '사진 : 공대 3호관 정문' 9 'D8D0C4' -align 3 | Out-Null
  Notes $sl '안녕하십니까. 팀 공3길의 졸업작품 「공대 3호관 길안내」를 발표하겠습니다. 건물 안에서 길을 잃는 문제를 해결하기 위한 새로운 제안입니다.\n오늘은 앱 화면 대신, 3호관을 직접 걸으며 찍은 사진으로 말씀드리겠습니다.'

  # ── 2 들어가며
  $sl = PgB '02 · 들어가며' '혹시 이런 불편함, [[겪어 보셨나요?]]' '3호관 안에서 직접 찍은 사진입니다 — 길을 잃는 순간은 건물 곳곳에 있습니다.' '들어가며' '3호관 안에서 직접 찍은 사진 세 장입니다.\n1층 로비에 들어섰는데 어느 쪽으로 가야 할지 모릅니다. 위층에 올라가면 복도가 다 똑같아서 여기가 몇 층인지 헷갈립니다. 그리고 문은 많은데, 이 방이 맞는지 가까이 가 봐야 압니다.\n3호관은 문이 넷, 층이 여섯입니다. 길을 잃는 순간은 건물 곳곳에 있습니다.'
  $ph3 = @(@('현장_1층로비.jpg', '「로비에 들어섰는데…\n어느 쪽이지?」', '1층 로비'), @('현장_3층복도L.jpg', '「복도가 다 똑같은데…\n여기 몇 층이지?」', '3층 복도'), @('현장_13410.jpg', '「문은 많은데…\n이 방이 맞나?」', '4층 연구실 문 앞'))
  $c3 = ($CW - 2 * 18) / 3
  for($i = 0; $i -lt 3; $i++){
    $xx = $M + $i * ($c3 + 18)
    PhotoB $sl $ph3[$i][0] $xx 114 $c3 220 | Out-Null
    TagB $sl $xx 314 $ph3[$i][2] $AC
    T $sl $xx 344 $c3 50 $ph3[$i][1] 14 $INK -bold -lines 1.3 | Out-Null
  }
  StripB $sl 412 '3호관은 **문이 넷, 층이 여섯** — 길을 잃는 순간은 건물 안 곳곳에 있습니다.' 46

  # ── 3 문제점
  $sl = PgB '03 · 우리가 발견한 문제점' '기존 방식의 한계와 명확한 [[Pain Point]]' '공간 쪽에서 보면 — 3호관에는 헷갈리는 이유가 세 가지 있습니다.' '문제점' '공간 쪽에서 보면 3호관에는 헷갈리는 이유가 세 가지 있습니다.\n첫째, 문이 넷입니다. 정문, 후문, 동문, 서문 — 들어온 문마다 엘리베이터까지 가는 길이 다릅니다. 지도 앱은 건물 앞까지만 데려다줍니다.\n둘째, 복도가 닮았습니다. 층마다 같은 모습이라 눈으로는 층을 가리기 어렵고, 층마다 붙은 안내도는 그 앞에 서야 보입니다.\n셋째, 번호판은 가까이 가야 보입니다. 문 앞까지 가서 하나씩 확인해야 합니다.\n가장 아픈 곳은 둘째입니다. 몇 층인지 헷갈리면 그다음 안내는 모두 틀어집니다.'
  $pp = @(
    @('현장_후문.jpg', 'PAIN POINT 1', '문이 넷이다', '들어온 문마다 **엘리베이터까지 가는 길**이 다릅니다.', '기존 — 지도 앱은 건물 앞까지', $false),
    @('현장_4층복도R.jpg', 'PAIN POINT 2', '복도가 닮았다', '층마다 같은 모습 — **눈으로는 층을 가리기 어렵습니다.**', '기존 — 층 안내도는 그 앞에서만', $true),
    @('현장_13524.jpg', 'PAIN POINT 3', '번호판은 가까이에서만', '문 앞까지 가서 **하나씩 확인**해야 합니다.', '기존 — 직접 걸으며 번호 확인', $false))
  for($i = 0; $i -lt 3; $i++){
    $xx = $M + $i * ($c3 + 18); $hot = $pp[$i][5]
    PhotoB $sl $pp[$i][0] $xx 110 $c3 150 | Out-Null
    Rect $sl $xx 260 $c3 136 $(if($hot){ 'FBE9E4' } else { $CARD }) $(if($hot){ 'EDB9AC' } else { $LINE }) 0.75 | Out-Null
    T $sl ($xx + 16) 270 ($c3 - 32) 14 $pp[$i][1] 9.5 $(if($hot){ $AM } else { $DIM }) -bold -spacing 1.5 | Out-Null
    T $sl ($xx + 16) 290 ($c3 - 32) 24 $pp[$i][2] 16 $(if($hot){ $AM } else { $INK }) -bold | Out-Null
    T $sl ($xx + 16) 320 ($c3 - 32) 44 $pp[$i][3] 11.5 $INK2 -lines 1.4 | Out-Null
    T $sl ($xx + 16) 370 ($c3 - 32) 16 $pp[$i][4] 9.5 $DIM | Out-Null
  }
  StripB $sl 410 '가장 아픈 곳은 **PAIN POINT 2** — 몇 층인지 헷갈리면, **그다음 안내는 모두 틀어집니다.**' 46

  # ── 4 해결 아이디어
  $sl = PgB '04 · 우리의 해결 아이디어' '그래서 우리는 [[사진으로 걷는 길안내]]를 생각했습니다' '헷갈리는 세 곳마다 — 그 자리의 실제 사진과 짧은 한 문장을 놓았습니다.' '해결 아이디어' '그래서 저희는 사진으로 걷는 길안내를 생각했습니다. 헷갈리는 세 곳마다 그 자리의 실제 사진과 짧은 한 문장을 놓았습니다.\n문이 넷인 문제에는 문마다 첫걸음을 따로 정했습니다. 복도가 닮은 문제에는 엘리베이터를 기준점으로 삼아, 내린 방향으로 좌우를 말합니다. 번호판이 멀리서 안 보이는 문제에는 「오른쪽에서 여섯 번째 방」처럼 문을 세게 했습니다.\n눈앞 풍경과 사진을 맞춰 보며 걸으면 됩니다.'
  $id = @(
    @('현장_서문복도.jpg', 'PAIN 1 → 문마다 첫걸음', '서문은 「복도를 따라 직진하세요」 — **문마다 따로**'),
    @('현장_1층엘리베이터.jpg', 'PAIN 2 → 엘리베이터가 기준점', '「엘리베이터에서 내려서 **우회전** 하세요」'),
    @('현장_KTC.jpg', 'PAIN 3 → 도착은 문을 세서', '「왼쪽에서 **첫 번째 방**에 KTC 프로그래밍 동아리실」'))
  for($i = 0; $i -lt 3; $i++){
    $xx = $M + $i * ($c3 + 18)
    PhotoB $sl $id[$i][0] $xx 110 $c3 210 | Out-Null
    T $sl $xx 330 $c3 18 $id[$i][1] 12.5 $AM -bold | Out-Null
    T $sl $xx 352 $c3 44 $id[$i][2] 11.5 $INK2 -lines 1.35 | Out-Null
  }
  StripB $sl 410 '**한 문장으로** — 그 자리의 **실제 사진**과 **짧은 한 문장**이면, 눈앞 풍경과 맞춰 보며 걸을 수 있습니다.' 46

  # ── 5 설계 및 구현
  $sl = PgB '05 · 솔루션 설계 및 구현' '공대 3호관 길안내의 [[전체 구조와 개발 기술]]' '길안내를 이루는 재료 네 가지 — 그리고 같은 목적지를 네 문에서 설계한 예입니다.' '설계 및 구현' '길안내를 이루는 재료는 네 가지입니다. 직접 찍은 장소 사진 169장, 한국어와 영어로 쓴 안내 문장 754가지, 네 문과 여섯 층의 안내 절차, 그리고 3D 건물을 그리는 좌표입니다.\n오른쪽은 설계의 예입니다. 4층 13410호를 네 문에서 가면, 엘리베이터를 탄 뒤로는 모두 같고 두 번째 걸음만 다릅니다. 정문은 들어서면 바로 엘리베이터라 다섯 단계, 나머지는 여섯 단계입니다.\n문별 절차는 작은 표 네 개로 정해 두었기 때문에, 층을 하나 늘리려면 숫자 하나만 넣으면 됩니다.'
  $mat = @(@('169장', '직접 찍은 장소 사진'), @('754가지', '안내 문장 · 한국어 / 영어'), @('네 문 × 여섯 층', '문별 · 층별 안내 절차'), @('three.js', '좌표에서 3D 건물을 그림'))
  for($i = 0; $i -lt 4; $i++){
    $yy = 106 + $i * 74
    Rect $sl $M $yy 250 64 $CARD $LINE 0.75 | Out-Null
    Rect $sl $M $yy 5 64 $AM | Out-Null
    T $sl ($M + 18) ($yy + 8) 220 28 $mat[$i][0] 20 $INK -bold | Out-Null
    T $sl ($M + 18) ($yy + 38) 220 18 $mat[$i][1] 10.5 $INK2 | Out-Null
  }
  $tx = $M + 270; $twid = $M + $CW - $tx
  T $sl $tx 106 $twid 16 '설계 예 — 4층 13410호 (IT융합통신공학과 지석근 교수님 연구실)' 10.5 $AM -bold | Out-Null
  $rows = @(@('정문', '— 바로 엘리베이터', '5단계'), @('후문', '1층 라운지에서 우회전', '6단계'), @('동문', '복도를 따라 직진', '6단계'), @('서문', '복도를 따라 직진', '6단계'))
  for($r = 0; $r -lt 4; $r++){
    $yy = 130 + $r * 50
    Rect $sl $tx $yy 58 42 $AC | Out-Null
    T $sl $tx $yy 58 42 $rows[$r][0] 13 'FFFFFF' -bold -align 2 -anchor 3 | Out-Null
    Chip $sl ($tx + 64) $yy 104 42 ('들어오세요') $CARD $INK2 10 -line $LINE -radius 3 | Out-Null
    Chip $sl ($tx + 174) $yy 150 42 $rows[$r][1] $(if($r -eq 0){ $BG } else { 'FBE9E4' }) $(if($r -eq 0){ $DIM } else { $AM }) 10.5 -bold:($r -ne 0) -line $(if($r -eq 0){ $LINE } else { 'EDB9AC' }) -radius 3 | Out-Null
    Chip $sl ($tx + 330) $yy ($twid - 330 - 58) 42 '엘리베이터 4층 → 우회전 → 직진 → 여섯 번째 방' $CARD $INK2 9.5 -line $LINE -radius 3 | Out-Null
    T $sl ($tx + $twid - 52) $yy 52 42 $rows[$r][2] 11 $INK -bold -align 3 -anchor 3 | Out-Null
  }
  T $sl $tx 334 $twid 30 '엘리베이터를 탄 뒤로는 **네 문 모두 같은 길** — 다른 건 문에서 엘리베이터까지 **한 걸음**뿐입니다.' 11 $INK2 -lines 1.35 | Out-Null
  StripB $sl 418 '구현 — 문별 절차는 **작은 표 네 개**로 정해 두어, 층을 하나 늘리려면 **숫자 하나**만 넣으면 됩니다.' 44

  # ── 6 핵심 기능 시연
  $sl = PgB '06 · 핵심 기능 시연' '공대 3호관 길안내는 [[이렇게 동작합니다]]' '서문에서 4층 13410호까지 — 앱이 단계마다 보여 주는 사진 그대로 걸어 봅니다.' '기능 시연' '이제 실제로 걸어 보겠습니다. 서문에서 4층 13410호 연구실까지입니다.\n서문으로 들어와 복도를 따라 직진하고, 엘리베이터를 타고 4층으로 올라가, 내려서 우회전, 복도를 따라 직진하면 오른쪽에서 여섯 번째 방입니다.\n앱이 단계마다 보여 주는 사진이 바로 이 장면들입니다. 눈앞 풍경이 사진과 같으면 맞게 가고 있는 것입니다.'
  $sc = @(@('현장_서문.jpg', '서문으로 들어오세요'), @('현장_서문복도.jpg', '복도를 따라 직진하세요'), @('현장_1층엘리베이터.jpg', '엘리베이터를 타고\n4층으로'), @('현장_4층엘리베이터안.jpg', '내려서 우회전 하세요'), @('현장_4층복도R.jpg', '복도를 따라 직진하세요'), @('현장_13410.jpg', '오른쪽 여섯 번째 방\n— 도착'))
  $s6 = ($CW - 5 * 10) / 6
  for($i = 0; $i -lt 6; $i++){
    $xx = $M + $i * ($s6 + 10)
    PhotoB $sl $sc[$i][0] $xx 110 $s6 240 | Out-Null
    Oval $sl ($xx + 8) 118 24 $(if($i -eq 5){ $AM } else { $AC }) ([string]($i + 1)) 11 | Out-Null
    if($i -lt 5){ Line $sl ($xx + $s6 + 1) 230 ($xx + $s6 + 9) 230 $AM 2 -arrow | Out-Null }
    T $sl $xx 358 $s6 36 $sc[$i][1] 10.5 $INK -bold -lines 1.3 | Out-Null
  }
  StripB $sl 410 '앱이 단계마다 보여 주는 사진이 **바로 이 장면들**입니다 — 눈앞 풍경이 사진과 같으면 맞게 가고 있는 것입니다.' 46

  # ── 7 기능 1
  $sl = PgB '06 · 핵심 기능 시연 · 기능 1' '「문이 넷이라 헷갈린다」를 해결하는 [[문마다 다른 첫걸음]]' '어느 문으로 들어왔는지에 따라 — 처음 마주치는 풍경과 첫 문장이 달라집니다.' '기능 시연' '기능 1 입니다. 문이 넷이라 헷갈리는 문제를, 문마다 다른 첫걸음으로 해결했습니다.\n정문은 들어서면 바로 엘리베이터 쪽이라 위층으로 갈 때 「엘리베이터 앞으로 가세요」를 빼고 다섯 단계입니다. 후문은 「1층 라운지에서 우회전」, 동문과 서문은 「복도를 따라 직진」으로 시작합니다.\n지하 크리에이티브 존은 더 다릅니다. 후문에서는 왼쪽 계단으로 내려가 네 단계면 되지만, 정문에서는 엘리베이터로 내려가 여섯 단계입니다.'
  $gt = @(@('현장_정문.jpg', '정문', '들어서면 바로 엘리베이터 —\n위층은 다섯 단계'), @('현장_후문.jpg', '후문', '「1층 라운지에서 우회전」\n지하는 왼쪽 계단으로'), @('현장_동문.jpg', '동문', '「복도를 따라 직진하세요」'), @('현장_서문.jpg', '서문', '「복도를 따라 직진하세요」'))
  $g4 = ($CW - 3 * 12) / 4
  for($i = 0; $i -lt 4; $i++){
    $xx = $M + $i * ($g4 + 12)
    PhotoB $sl $gt[$i][0] $xx 110 $g4 196 | Out-Null
    TagB $sl $xx 286 $gt[$i][1] $AC
    T $sl $xx 314 $g4 40 $gt[$i][2] 11 $INK -bold -lines 1.35 | Out-Null
  }
  $bx = $M; $by = 364
  foreach($p in @(@('현장_후문계단.jpg', '좌측 계단으로'), @('현장_크리에이티브존.jpg', '크리에이티브 존'))){
    PhotoB $sl $p[0] $bx $by 150 100 | Out-Null
    TagB $sl $bx ($by + 80) $p[1] $AM
    $bx += 158
  }
  Rect $sl $bx $by ($M + $CW - $bx) 100 $CARD $LINE 0.75 | Out-Null
  Rect $sl $bx $by 5 100 $AM | Out-Null
  T $sl ($bx + 18) $by ($M + $CW - $bx - 30) 100 '지하 크리에이티브 존 — **후문**에서는 「좌측에 보이는 계단을 통해 내려가세요」 **네 단계**, 정문에서는 엘리베이터로 **여섯 단계**.' 12 $INK2 -anchor 3 -lines 1.35 | Out-Null

  # ── 8 기능 2
  $sl = PgB '06 · 핵심 기능 시연 · 기능 2' '「복도가 닮았다」를 개선하는 [[엘리베이터 기준 · 홀 표지]]' '복도는 닮았어도 — 엘리베이터 앞 홀은 층마다 얼굴이 다릅니다.' '기능 시연' '기능 2 입니다. 복도가 닮아 층이 헷갈리는 문제를 두 가지로 개선했습니다.\n첫째, 엘리베이터를 기준점으로 삼았습니다. 위층 길은 모두 엘리베이터에서 갈라지고, 「엘리베이터에서 내려서 우회전」처럼 내린 방향으로 좌우를 말합니다. 단계 사진마다 「5층 복도」처럼 층 이름도 붙였습니다.\n둘째, 엘리베이터 앞 홀입니다. 1층은 안내실이 있는 로비, 2층은 카페 테이블이 있는 라운지, 3층과 4층은 사물함이 늘어선 홀입니다. 내리자마자 몇 층인지 눈으로 확인하는 표지가 됩니다.'
  $lg = @(@('현장_1층로비.jpg', '1층 · 로비', '안내실 · 정문 쪽 유리문'), @('현장_2층라운지.jpg', '2층 · 라운지', '카페 테이블 · 책상'), @('현장_3층라운지.jpg', '3층 · 홀', '사물함이 늘어선 홀'), @('현장_4층라운지.jpg', '4층 · 홀', '창가로 트인 사물함 홀'))
  for($i = 0; $i -lt 4; $i++){
    $xx = $M + $i * ($g4 + 12)
    PhotoB $sl $lg[$i][0] $xx 106 $g4 186 | Out-Null
    TagB $sl $xx 272 $lg[$i][1] $(if($i -eq 1){ $AM } else { $AC })
    T $sl $xx 298 $g4 18 $lg[$i][2] 10.5 $INK2 | Out-Null
  }
  $pts = @(@('엘리베이터가 기준점', '위층 길은 모두 엘리베이터에서 — 「내려서 우회전 하세요」'), @('사진마다 층 이름', '「5층 복도」처럼 — 단계 사진 아래에'), @('홀이 곧 표지', '내리자마자 몇 층인지 눈으로 확인'))
  $p3 = ($CW - 2 * 12) / 3
  for($i = 0; $i -lt 3; $i++){
    $xx = $M + $i * ($p3 + 12)
    Rect $sl $xx 330 $p3 70 $CARD $LINE 0.75 | Out-Null
    T $sl ($xx + 14) 340 ($p3 - 28) 18 $pts[$i][0] 12.5 $AM -bold | Out-Null
    T $sl ($xx + 14) 362 ($p3 - 28) 34 $pts[$i][1] 10.5 $INK2 -lines 1.3 | Out-Null
  }
  StripB $sl 414 '복도는 닮았어도 **엘리베이터에서 시작**하고 **홀 모습으로 확인**하면 — 층을 헷갈리지 않습니다.' 44

  # ── 9 변화
  $sl = PgB '07 · 우리가 만든 변화' '공대 3호관 길안내 도입으로 [[기대되는 효과]]' '강의실만이 아니라 — 몰라서 묻던 곳까지 사진으로 찾아갑니다.' '변화' '이 앱을 쓰면 무엇이 달라지는지, 3호관 안의 세 곳으로 보겠습니다.\n화장실은 이제 「어디예요?」라고 묻지 않아도 됩니다. 네 문 어디로 들어와도 그 문에서 가는 길로 안내하고, 2층부터 5층은 엘리베이터에서 내려 좌회전하면 바로입니다.\n비상계단은 복도 끝에 있어 평소에는 지나치기 쉽습니다. 이제는 「오른쪽 복도 끝에 비상계단」까지 일곱 걸음으로 안내합니다.\n지하 크리에이티브 존은 있는지도 모르는 분이 많습니다. 후문에서 계단으로 네 단계면 됩니다.'
  $ch = @(
    @('현장_1층화장실.jpg', '화장실', '「화장실 어디예요?」 — 물어서 찾기', '네 문 어디서든 그 문에서 가는 길로 · 2~5층은 내려서 좌회전'),
    @('현장_3층비상계단.jpg', '비상계단', '복도 끝에 있어 평소엔 지나치기 쉬움', '「오른쪽 복도 끝에 비상계단」 — 정문에서 일곱 걸음'),
    @('현장_크리에이티브존.jpg', '지하 크리에이티브 존', '지하에 있는지도 모르는 곳', '후문에서 계단으로 — 네 단계'))
  for($i = 0; $i -lt 3; $i++){
    $xx = $M + $i * ($c3 + 18)
    PhotoB $sl $ch[$i][0] $xx 106 $c3 170 | Out-Null
    TagB $sl $xx 256 $ch[$i][1]
    Rect $sl $xx 276 $c3 122 $CARD $LINE 0.75 | Out-Null
    T $sl ($xx + 14) 286 ($c3 - 28) 14 '지금까지' 8.5 $DIM -bold -spacing 1 | Out-Null
    T $sl ($xx + 14) 302 ($c3 - 28) 30 $ch[$i][2] 11 $DIM -lines 1.3 | Out-Null
    T $sl ($xx + 14) 336 ($c3 - 28) 14 '이제는' 8.5 $AM -bold -spacing 1 | Out-Null
    T $sl ($xx + 14) 352 ($c3 - 28) 40 $ch[$i][3] 11.5 $INK -bold -lines 1.3 | Out-Null
  }
  StripB $sl 412 '처음 온 사람이 **묻지 않고 찾는 곳**이 늘어납니다 — 강의실만이 아니라 화장실 · 비상계단 · 지하까지.' 44

  # ── 10 발전 방향
  $sl = PgB '08 · 향후 발전 방향' '더 나은 서비스를 위한 [[다음 단계]]' '지금은 3호관 문 앞에서 시작해 방 앞에서 끝납니다 — 그 앞뒤를 잇는 다음 후보입니다.' '발전 방향' '다음 단계입니다. 지금 길안내는 3호관 문 앞에서 시작해 방 앞에서 끝납니다. 그 앞과 뒤를 잇는 것이 다음 후보입니다.\n첫째, 3호관까지 오는 길입니다. 캠퍼스에 처음 온 사람이 3호관의 네 문 가운데 가장 가까운 문까지 오게 하려 합니다.\n둘째, 나가는 길입니다. 도착한 곳에서 가장 가까운 출입문으로 다시 안내합니다.\n셋째, 강의실에서 강의실로입니다. 다음 수업 장소로 바로 이어서 안내합니다.\n목표는 바깥에서 안까지, 그리고 안에서 다시 바깥까지 이어지는 길안내입니다.'
  $nx = @(
    @('현장_서문.jpg', '3호관까지 오는 길', '캠퍼스에서 — **가장 가까운 문**까지'),
    @('현장_정문안.jpg', '나가는 길', '도착한 곳에서 — **가장 가까운 출입문**으로'),
    @('현장_13524.jpg', '강의실 → 강의실', '다음 수업 장소로 — **바로 이어서**'))
  for($i = 0; $i -lt 3; $i++){
    $xx = $M + $i * ($c3 + 18)
    PhotoB $sl $nx[$i][0] $xx 110 $c3 200 | Out-Null
    Chip $sl ($xx + 10) 120 72 20 '다음 후보' $AM 'FFFFFF' 9 -bold -radius 0 | Out-Null
    T $sl $xx 322 $c3 22 $nx[$i][1] 15 $INK -bold | Out-Null
    T $sl $xx 350 $c3 40 $nx[$i][2] 12 $INK2 -lines 1.35 | Out-Null
  }
  StripB $sl 410 '**목표는 하나** — 3호관 **바깥에서 안까지, 안에서 다시 바깥까지** 이어지는 길안내.' 46

  # ── 11 마무리
  $sl = PgB '09 · 마무리하며' '프로젝트 [[요약 및 결론]]' '' '마무리' '마무리하겠습니다. 3호관에서 헷갈리는 세 곳에 하나씩 답했습니다.\n문이 넷인 문제에는 문마다 다른 첫걸음으로, 복도가 닮은 문제에는 엘리베이터 기준과 층마다 다른 홀로, 번호판이 멀리서 안 보이는 문제에는 몇 번째 방인지 세는 도착 문장으로 답했습니다.\n(잠깐 멈추고) 건물은 그대로입니다. 그 건물을 사진으로 휴대폰에 담았고, 사진 속 3호관이 길을 알려 줍니다.'
  $sm = @(@('문이 넷', '문마다 다른 첫걸음'), @('복도가 닮았다', '엘리베이터 기준 · 홀 표지'), @('번호판이 안 보인다', '「오른쪽에서 몇 번째 방」'))
  for($i = 0; $i -lt 3; $i++){
    $yy = 100 + $i * 62
    Rect $sl $M $yy 470 52 $CARD $LINE 0.75 | Out-Null
    Rect $sl $M $yy 5 52 $AM | Out-Null
    T $sl ($M + 18) $yy 150 52 $sm[$i][0] 13 $DIM -bold -anchor 3 | Out-Null
    T $sl ($M + 170) $yy 290 52 ('→  ' + $sm[$i][1]) 14 $INK -bold -anchor 3 | Out-Null
  }
  PhotoB $sl '현장_3층라운지.jpg' ($M + 488) 100 358 176 | Out-Null
  TagB $sl ($M + 488) 256 '3층 · 엘리베이터 앞 홀' $AC
  Rect $sl $M 296 $CW 176 $AC '' 0 0 | Out-Null
  T $sl ($M + 30) 318 ($CW - 60) 70 '건물은 그대로입니다.\n[[사진 속 3호관]]이 길을 알려 줍니다.' 26 'FFFFFF' -bold -accent 'FF7A5C' -lines 1.25 | Out-Null
  T $sl ($M + 30) 410 ($CW - 60) 50 '문마다 첫걸음 · 엘리베이터 기준 · 몇 번째 방 — 눈앞 풍경과 사진을 맞춰 보며 걸으면 됩니다.' 12.5 'D8D0C4' -lines 1.5 | Out-Null

  # ── 12 Q&A
  $script:pg++
  $sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl $AC
  PhotoB $sl '현장_서문.jpg' 0 0 $W $H | Out-Null
  $ov = Rect $sl 0 0 $W $H '1A1F24'; $ov.Fill.Transparency = 0.22
  T $sl $M 120 520 16 '1 0 · Q & A' 10 'F3D7CC' -bold -spacing 3 | Out-Null
  T $sl $M 146 520 80 'Q [[&]] A' 60 'FFFFFF' -bold -accent 'FF7A5C' -boldColor 'FFFFFF' | Out-Null
  T $sl $M 232 520 24 '질의응답 — 들어 주셔서 감사합니다' 16 'EDE6DC' | Out-Null
  Rect $sl $M 276 90 4 'FF7A5C' | Out-Null
  T $sl $M 298 520 40 ('**' + $TOPIC + '** · 팀 공3길\n김민종 · 손의윤 · 문성일   |   지도교수 강규창 교수님') 12 'D8D0C4' -lines 1.6 -boldColor 'FFFFFF' | Out-Null
  T $sl $M 368 520 40 '서문 QR을 찍고 — 오늘 본 **여섯 장면**을 직접 걸어 보십시오.' 12.5 'EDE6DC' -boldColor 'FFFFFF' | Out-Null
  $qh = 320; $qw = PhoneW 'QR_서문.png' $qh
  Pic $sl 'QR_서문.png' (903 - $qw) 96 $qw $qh '' | Out-Null
  Notes $sl '들어 주셔서 감사합니다. 오른쪽 서문 QR 을 찍고, 오늘 본 여섯 장면을 직접 걸어 보십시오.\n질문 받겠습니다.'

  SavePres '졸업작품 모의 발표 ② 현장 편' 12
}

# ══ 만들기 ══════════════════════════════════════════════════════
$app = New-Object -ComObject PowerPoint.Application
try{
  if($Kind -in @('전부', 'A')){ BuildA }
  if($Kind -in @('전부', 'B')){ BuildB }
} finally {
  try{ if($script:pres){ $script:pres.Close() } }catch{}
  if($app.Presentations.Count -eq 0){ try{ $app.Quit() }catch{} }
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}
