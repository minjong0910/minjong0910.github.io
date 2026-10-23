# 졸업작품 모의 발표 자료 두 벌 — 조원 두 사람이 한 벌씩, 처음부터 끝까지 혼자 발표한다 (PowerPoint)
#
#   2026-10-24 사용자 : 「방금까지 만든 건 나만의 발표자료 — 조원 2명의 발표 자료가 필요. 지금까지 만든 방식 말고 내용 · 자료 사진 · 설명이
#                       각각 다른 유형으로. 두 자료끼리 겹치면 안 되고, 모든 내용이 실제 우리 앱 기반」 · 완전히 새로 · PowerPoint · 15쪽 이내
#   ① 사용 설명서편 — 기능 12가지를 실제 앱 화면으로 (흰 바탕 + 보라). 화면은 10/24 본 서버를 아이폰 크기로 찍은 것(발표그림\모의\A*.jpg)
#   ② 현장 답사편   — 앱 화면 없이 3호관에서 직접 찍은 장소 사진만 (종이색 + 먹회색 + 산호색). 안내 문장은 앱의 실제 길안내 기록(tests\golden\v150.json)
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
#  A — 사용 설명서형 : 흰 바탕 + 보라(앱 QR 카드 색) + 하늘색. 왼쪽은 실제 앱 화면, 오른쪽은 「이렇게 써요」
# ═════════════════════════════════════════════════════════════════════════
function PaletteA(){
  $script:BG = 'FFFFFF'; $script:INK = '1B1F3B'; $script:INK2 = '474C68'; $script:DIM = '7A7F96'
  $script:LINE = 'D9D4F6'; $script:LINE2 = 'ECE9FB'; $script:CARD = 'FFFFFF'
  $script:AC = '5B3FE0'; $script:AC2 = 'F0EDFF'; $script:ACT = '3B2A9E'; $script:AM = '5B3FE0'; $script:RD = 'D93A5B'; $script:MINT = '0AB3D4'
}
function PgA([string]$tag, [string]$title, [string]$lead, [string]$notes){
  $script:pg++
  $sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl 'FFFFFF'
  Rect $sl 0 0 8 $H $AC | Out-Null
  Chip $sl $M 28 86 22 $tag $AC 'FFFFFF' 10 -bold -radius 11 | Out-Null
  T $sl $M 56 $CW 32 $title 21 $INK -bold -accent $AC -lines 1.1 | Out-Null
  if($lead){ T $sl $M 92 $CW 20 $lead 12 $INK2 | Out-Null }
  Line $sl $M $FOOTY ($M + $CW) $FOOTY $LINE2 0.75 | Out-Null
  T $sl $M ($FOOTY + 6) 500 14 '공대 3호관 길안내 · 사용 설명서' 8.5 $DIM -spacing 0.6 | Out-Null
  T $sl ($M + $CW - 100) ($FOOTY + 6) 100 14 ([string]$script:pg) 8.5 $DIM -align 3 | Out-Null
  Notes $sl $notes
  return $sl
}
# 폰 화면 여러 장을 왼쪽부터 — 아래에 짧은 이름
function PhonesA($sl, [object[]]$items, [double]$x, [double]$y, [double]$h, [double]$gap = 14){
  foreach($it in $items){
    $w = PhoneW $it[0] $h
    Pic $sl $it[0] $x $y $w $h 'CFC6F7' -round | Out-Null
    if($it[1]){ T $sl ($x - 10) ($y + $h + 6) ($w + 20) 16 $it[1] 10 $INK2 -bold -align 2 | Out-Null }
    $x += $w + $gap
  }
  return $x
}
# 「이렇게 써요」 번호 목록 — @( @('굵은 말', '설명'), … ) · 끝난 y 를 돌려준다
function StepsA($sl, [object[]]$items, [double]$x, [double]$y, [double]$w, [double]$gap = 12){
  T $sl $x $y $w 16 '이렇게 써요' 10 $AC -bold -spacing 1.5 | Out-Null
  $y += 24
  for($i = 0; $i -lt $items.Count; $i++){
    Oval $sl $x $y 22 $AC ([string]($i + 1)) 10.5 | Out-Null
    $t = T $sl ($x + 32) ($y + 1) ($w - 32) 200 ('**' + $items[$i][0] + '**' + $(if($items[$i][1]){ '\n' + $items[$i][1] } else { '' })) 11.5 $INK2 -lines 1.32 -boldColor $INK
    $h = Fit $t
    $y += [Math]::Max(24, $h) + $gap
  }
  return $y
}
function TipA($sl, [double]$x, [double]$y, [double]$w, [string]$text){
  $b = Rect $sl $x $y $w 50 $AC2 '' 0 6
  T $sl ($x + 14) ($y + 9) 120 14 '이럴 때 좋아요' 9.5 $AC -bold -spacing 1 | Out-Null
  $t = T $sl ($x + 14) ($y + 26) ($w - 28) 100 $text 11 $INK -lines 1.3
  $h = Fit $t; $b.Height = 26 + $h + 12
  return ($y + $b.Height)
}
# 화면 위 번호 표시 — 그림 안의 비율 자리(fx, fy)에
function MarkA($sl, [double]$px, [double]$py, [double]$pw, [double]$ph, [double]$fx, [double]$fy, [int]$n){
  $ox = $(if($fx -gt 0.75){ $px + $pw + 6 } else { $px - 28 })
  Oval $sl $ox ($py + $ph * $fy - 11) 22 $RD ([string]$n) 10.5 | Out-Null
}
function CalloutsA($sl, [object[]]$items, [double]$x, [double]$y, [double]$w, [double]$gap = 9){
  for($i = 0; $i -lt $items.Count; $i++){
    Oval $sl $x $y 22 $RD ([string]($i + 1)) 10.5 | Out-Null
    $t = T $sl ($x + 32) ($y + 1) ($w - 32) 200 ('**' + $items[$i][0] + '**' + $(if($items[$i][1]){ ' — ' + $items[$i][1] } else { '' })) 11.5 $INK2 -lines 1.32 -boldColor $INK
    $h = Fit $t
    $y += [Math]::Max(24, $h) + $gap
  }
  return $y
}

function BuildA(){
  PaletteA; NewPres
  # ── 1 표지
  $script:pg++
  $sl = $pres.Slides.Add(1, 12); Bg $sl $AC
  $o = $sl.Shapes.AddShape(9, 560, -120, 520, 520); $o.Line.Visible = 0; $o.Fill.ForeColor.RGB = (C '7B62F0'); $o.Fill.Transparency = 0.35; $o.Shadow.Visible = 0
  T $sl $M 118 520 16 '졸업작품 모의 발표 · 기능 편' 11 'D9D2FF' -bold -spacing 3 | Out-Null
  T $sl $M 144 520 110 '공대 3호관 길안내\n[[사용 설명서]]' 40 'FFFFFF' -bold -accent '8FEBFA' -lines 1.1 | Out-Null
  T $sl $M 264 500 44 '처음 켜는 순간부터 설정까지 —\n기능 12가지를 실제 화면으로 따라가 봅니다' 14 'E6E2FF' -lines 1.45 | Out-Null
  Rect $sl $M 330 90 4 '8FEBFA' | Out-Null
  T $sl $M 350 500 40 '**팀 공3길**    김민종 · 손의윤 · 문성일\n**지도교수**    강규창 교수님' 11.5 'D9D2FF' -lines 1.7 -boldColor 'FFFFFF' | Out-Null
  $w1 = PhoneW 'A02_쉬운모드_첫화면.jpg' 390
  Pic $sl 'A02_쉬운모드_첫화면.jpg' 548 75 $w1 390 '8C78F2' -round | Out-Null
  Pic $sl '화면11_단계2.jpg' (548 + $w1 + 14) 75 $w1 390 '8C78F2' -round | Out-Null
  Notes $sl '안녕하십니까. 오늘은 공대 3호관 길안내를 사용 설명서처럼, 실제 화면을 한 장씩 넘기며 소개하겠습니다.\n앱을 처음 켜는 순간부터 설정까지, 기능 열두 가지를 쓰는 순서대로 보여 드리겠습니다.'

  # ── 2 차례
  $sl = PgA '차 례' '기능 [[12가지]], 쓰는 순서대로 보여 드립니다' '쪽마다 왼쪽은 실제 앱 화면, 오른쪽은 「이렇게 써요」입니다.' '오늘 소개할 기능 열두 가지입니다. 앱을 켜고, 찾고, 보고, 따라가고, 편하게 쓰고, 함께 고치는 순서입니다.\n쪽마다 왼쪽에는 지금 운영 중인 앱의 실제 화면을, 오른쪽에는 쓰는 방법을 정리했습니다.'
  $items = @(
    @('01', '처음 켜기', '「처음이세요?」에 한 번 답하기', 3), @('02', '쉬운 사용모드', '누를 곳을 손가락으로', 4),
    @('03', '출입문 QR', '카메라가 막혀도 시작', 5), @('04', '찾기', '번호 · 성함 · 초성', 6),
    @('05', '3D 건물', '손가락으로 돌려 보기', 7), @('06', '층 상세 · 1인칭', '위에서 보고, 미리 걷기', 8),
    @('07', '단계 안내', '한 화면을 읽는 순서', 9), @('08', '즐겨찾기 · 이어 하기', '다시 찾지 않게', 10),
    @('09', '☰ 메뉴 · 밝은 화면', '햇빛 아래에서도', 11), @('10', '인터넷이 끊겨도', '오른쪽 위를 보세요', 12),
    @('11', '앱 다운로드', '홈 화면에 한 번', 13), @('12', 'English · 건의함', '함께 쓰고 함께 고치기', 14))
  $cardW = ($CW - 3 * 12) / 4
  for($i = 0; $i -lt 12; $i++){
    $x = $M + ($i % 4) * ($cardW + 12); $y = 126 + [Math]::Floor($i / 4) * 116; $it = $items[$i]
    Card $sl $x $y $cardW 104 $(if(($i % 2) -eq 0){ 'FFFFFF' } else { 'FAF9FF' }) $LINE | Out-Null
    T $sl ($x + 14) ($y + 12) 60 26 $it[0] 20 $AC -bold | Out-Null
    T $sl ($x + $cardW - 64) ($y + 16) 50 14 ([string]$it[3] + '쪽') 9.5 $DIM -align 3 | Out-Null
    T $sl ($x + 14) ($y + 46) ($cardW - 28) 20 $it[1] 13.5 $INK -bold | Out-Null
    T $sl ($x + 14) ($y + 70) ($cardW - 28) 18 $it[2] 10.5 $DIM | Out-Null
  }

  # ── 3 기능 01 처음 켜기
  $sl = PgA '기능 01' '앱을 켜면 [[딱 한 번]] 묻습니다' '「처음이세요?」 — 누를 곳을 하나씩 알려 드릴지 고르는 창입니다.' '첫 번째 기능은 처음 켜기입니다. 앱을 켜면 초록 로고 글이 지나간 뒤 「처음이세요?」 창이 뜹니다.\n「네, 알려 주세요」를 누르면 쉬운 사용모드가 켜져서, 오른쪽 화면처럼 첫 화면부터 노란 테두리와 손가락이 누를 곳을 짚어 줍니다. 「아니요」를 누르면 바로 첫 화면입니다.\n마음이 바뀌면 첫 화면 노란 칸이나 설정에서 언제든 바꿀 수 있고, 출입문 QR 로 들어오면 매번 물어봅니다.'
  $x = PhonesA $sl @(@('A01_쉬운모드창.jpg', '「처음이세요?」'), @('A02_쉬운모드_첫화면.jpg', '「네」를 누르면')) $M 124 352
  $rx = $x + 18; $rw = $M + $CW - $rx
  $y = StepsA $sl @(
    @('초록 로고 글이 지나가면', '「처음이세요?」 창이 뜹니다'),
    @('「네, 알려 주세요」', '쉬운 사용모드가 켜지고, 첫 화면부터 손가락이 짚어 줍니다'),
    @('「아니요, 혼자 할게요」', '바로 첫 화면으로 갑니다'),
    @('나중에 바꾸려면', '첫 화면 노란 칸의 「켜짐 · 꺼짐」이나 설정에서 언제든')) $rx 124 $rw
  TipA $sl $rx ($y + 4) $rw '출입문 QR로 들어오면 **매번 물어봅니다** — 처음 온 사람을 놓치지 않으려고요.' | Out-Null

  # ── 4 기능 02 쉬운 사용모드
  $sl = PgA '기능 02' '쉬운 사용모드는 [[손가락]]이 길을 짚어 줍니다' '설명서를 따로 넘기지 않아도 — 지금 보고 있는 진짜 화면 위에서 알려 줍니다.' '두 번째, 쉬운 사용모드가 하는 일입니다.\n지금 눌러야 할 버튼에 노란 테두리와 손가락이 붙고, 말풍선이 「공대 3호관이 맞으면 눌러요」처럼 할 일을 한 문장으로 알려 줍니다. 말풍선은 사진이나 3D 를 가리지 않는 빈자리에 앉습니다.\n말풍선의 ✕ 를 누르면 쉬운 사용모드가 꺼지고, 설정의 이용안내에서는 실제 화면 그림에 번호를 붙인 안내 11쪽을 볼 수 있습니다.'
  $x = PhonesA $sl @(@('A03_쉬운모드_다음.jpg', '말풍선 + 손가락'), @('A13_이용안내3.jpg', '이용안내 11쪽')) $M 124 352
  $rx = $x + 18; $rw = $M + $CW - $rx
  $y = StepsA $sl @(
    @('노란 테두리 + 👆', '지금 누를 버튼을 표시합니다'),
    @('말풍선 한 문장', '「공대 3호관이 맞으면 눌러요」처럼 할 일만'),
    @('사진 · 3D를 가리지 않게', '말풍선이 화면의 빈자리에 앉습니다'),
    @('말풍선의 ✕', '누르면 쉬운 사용모드가 꺼집니다'),
    @('이용안내 11쪽', '설정 → 이용안내 — 실제 화면 그림에 번호를 붙여서')) $rx 124 $rw 10
  TipA $sl $rx ($y + 2) $rw '폰이 익숙하지 않은 분께 건넬 때 — **「켜짐」 한 번**이면 됩니다.' | Out-Null

  # ── 5 기능 03 출입문 QR
  $sl = PgA '기능 03' '출입문 QR — [[카메라가 막혀도]] 시작할 수 있습니다' '폰 기본 카메라로 찍으면 그 문에서 바로 열리고, 앱 안에서도 찍을 수 있습니다.' '세 번째, 출입문 QR 입니다. 정문 · 후문 · 동문 · 서문에 QR 이 하나씩 붙습니다.\n폰 기본 카메라로 찍으면 앱스토어 없이 그 문의 「여기가 맞나요?」로 바로 열리고, 앱 첫 화면의 「출입문 QR 스캔하고 시작」으로도 찍을 수 있습니다.\n카메라 권한이 막혀 있으면 오른쪽 화면처럼 안내가 나오고, 「사진으로 QR 찍기」로 권한 없이 찍거나, 아래 네 문 버튼으로 직접 고를 수 있습니다.'
  $qh = 300; $qw = PhoneW 'QR_후문.png' $qh
  Pic $sl 'QR_후문.png' $M 140 $qw $qh '' | Out-Null
  T $sl $M (140 + $qh + 8) $qw 16 '후문 QR (인쇄본)' 10 $INK2 -bold -align 2 | Out-Null
  $x = PhonesA $sl @(,@('A11_QR스캔.jpg', '카메라가 막혔을 때')) ($M + $qw + 18) 124 352
  $rx = $x + 18; $rw = $M + $CW - $rx
  $y = StepsA $sl @(
    @('폰 기본 카메라로 문 QR', '앱스토어 없이 그 문의 「여기가 맞나요?」로'),
    @('앱 안 「출입문 QR 스캔하고 시작」', '첫 화면에서 바로 카메라'),
    @('권한이 막혔다면', '「사진으로 QR 찍기」 — 권한 없이'),
    @('그래도 안 되면', '정문 · 후문 · 동문 · 서문 버튼으로 직접')) $rx 124 $rw 10
  TipA $sl $rx ($y + 2) $rw '어느 문으로 들어와도 — **그 문에서 출발**합니다.' | Out-Null

  # ── 6 기능 04 찾기
  $sl = PgA '기능 04' '번호 · 성함 · [[초성]] — 아는 만큼만 쳐도 찾습니다' '「무엇을 찾으세요?」에서 강의실을 누르면 검색창이 열립니다.' '네 번째, 찾기입니다. 검색창 하나로 세 가지 방법을 씁니다.\n시간표의 호실 번호를 그대로 쳐도 되고, 교수님 성함 「이재호」를 치면 전자공학과 이재호 교수님 연구실, 3층 13310 이 나옵니다.\n이름이 가물가물하면 첫소리만 쳐도 됩니다. 「ㅎㄱㅅㅁㅅ」라고 치면 학과사무실, 1층 13115 를 찾습니다. 한 번 찾은 곳은 검색창 아래 최근 기록에 남습니다.'
  $x = PhonesA $sl @(@('A04_초성검색.jpg', '「ㅎㄱㅅㅁㅅ」'), @('A05_성함검색.jpg', '「이재호」')) $M 124 352
  $rx = $x + 18; $rw = $M + $CW - $rx
  $y = StepsA $sl @(
    @('호실 번호', '시간표에 적힌 번호 그대로 — 예) 13524'),
    @('교수님 성함', '「이재호」 → 전자공학과 이재호 교수님 연구실 · 3층 13310'),
    @('초성만', '「ㅎㄱㅅㅁㅅ」 → 학과사무실 · 1층 13115'),
    @('최근 기록', '한 번 찾은 곳은 검색창 아래에 남습니다')) $rx 124 $rw
  TipA $sl $rx ($y + 4) $rw '이름이 가물가물해도 — **첫소리만** 기억나면 됩니다.' | Out-Null

  # ── 7 기능 05 3D 건물
  $sl = PgA '기능 05' '건물을 통째로 — [[손가락으로 돌려 보는]] 3D' '목적지를 고르면 3D 건물 위에 가야 할 층과 방이 색으로 표시됩니다.' '다섯 번째, 3D 건물입니다. 목적지를 고르면 이 화면이 나옵니다.\n왼쪽 위 범례는 목적지, 가야 할 층, 현재 층, 엘리베이터, 계단을 색으로 구분합니다. 손가락 하나로 돌리고, 두 개로 확대하고 옮기고, 층을 누르면 그 층을 자세히 보여 줍니다.\n아래에는 경로 미리보기와 직접 걸어보기, 층 상세 버튼, 지금 몇 층에 있는지 고르는 줄, 그리고 길안내 시작 버튼이 있습니다. 오른쪽 위 별은 즐겨찾기입니다.'
  $ph = 384; $pw = PhoneW 'A08_13310_3D.jpg' $ph; $px = $M + 70; $py = 112
  Pic $sl 'A08_13310_3D.jpg' $px $py $pw $ph 'CFC6F7' -round | Out-Null
  $marks = @(@(0.1, 0.15), @(0.9, 0.11), @(0.1, 0.59), @(0.1, 0.665), @(0.1, 0.735), @(0.1, 0.855), @(0.1, 0.945))
  for($i = 0; $i -lt 7; $i++){ MarkA $sl $px $py $pw $ph $marks[$i][0] $marks[$i][1] ($i + 1) }
  $rx = $px + $pw + 60; $rw = $M + $CW - $rx
  $y = CalloutsA $sl @(
    @('범례', '목적지 · 가야 할 층 · 현재 층 · 엘리베이터 · 계단을 색으로'),
    @('☆ 즐겨찾기', '누르면 ★ — 다음엔 메뉴에서 바로'),
    @('손가락 조작', '1개로 돌리고, 2개로 확대 · 이동, 층을 누르면 자세히'),
    @('경로 미리보기 · 직접 걸어보기', '가는 길을 움직여 보여 주기 / 1인칭으로 걷기'),
    @('층 상세', 'B1~5F · 옥상 — 그 층을 위에서'),
    @('현재 위치', '지금 몇 층에 있는지 고르기'),
    @('길안내 시작', '사진 단계 안내로')) $rx 118 $rw 8
  TipA $sl $rx ($y + 4) $rw '어느 층으로 가야 하는지 — **노란 층**만 보면 됩니다.' | Out-Null

  # ── 8 기능 06 층 상세 · 1인칭
  $sl = PgA '기능 06' '위에서 내려다보고, [[미리 걸어 봅니다]]' '3D에서 층 버튼을 누르면 층 상세, 「직접 걸어보기」를 누르면 1인칭 화면입니다.' '여섯 번째, 층 상세와 1인칭입니다.\n층 상세는 그 층을 위에서 내려다본 지도로, 방 번호가 모두 적혀 있고 빨간 안내선이 들어온 문에서 목적지까지 이어집니다.\n「직접 걸어보기」를 누르면 걷는 눈높이의 1인칭 화면이 나와, 출발 전에 복도를 미리 걸어 볼 수 있습니다. 바닥에는 「엘리베이터 앞으로」 같은 이름표가 보입니다.'
  $x = PhonesA $sl @(@('화면08_층상세.jpg', '층 상세'), @('화면09_1인칭.jpg', '1인칭 직접 걸어보기')) $M 124 352
  $rx = $x + 18; $rw = $M + $CW - $rx
  $y = StepsA $sl @(
    @('층 상세', '그 층을 위에서 내려다본 지도 — 방 번호가 모두'),
    @('빨간 안내선', '들어온 문에서 시작해 목적지까지'),
    @('직접 걸어보기', '걷는 눈높이로 복도를 미리 걸어 봅니다'),
    @('바닥의 이름표', '「엘리베이터 앞으로」처럼 다음에 갈 곳을')) $rx 124 $rw
  TipA $sl $rx ($y + 4) $rw '처음 가는 길이 긴장될 때 — **출발 전에 한 번** 걸어 보세요.' | Out-Null

  # ── 9 기능 07 단계 안내 읽는 법
  $sl = PgA '기능 07' '한 단계, 한 화면 — [[읽는 순서]]가 있습니다' '길안내를 시작하면 단계마다 이 화면이 한 장씩 넘어갑니다.' '일곱 번째, 단계 안내 화면을 읽는 순서입니다.\n맨 위 진행 막대와 「2 / 5 단계」로 지금 어디까지 왔는지 보고, 큰 화살표로 방향을, 한 문장으로 할 일을 봅니다.\n그다음 그 자리의 실제 사진을 눈앞 풍경과 맞춰 봅니다. 사진이 두 장이면 오른쪽 위에 「1 / 2 · 눌러서 다음」이 보이고, 눌러서 넘깁니다. 맨 아래 이전 · 다음으로 단계를 오갑니다.'
  $ph = 384; $pw = PhoneW '화면11_단계2.jpg' $ph; $px = $M + 70; $py = 112
  Pic $sl '화면11_단계2.jpg' $px $py $pw $ph 'CFC6F7' -round | Out-Null
  $marks = @(@(0.1, 0.115), @(0.1, 0.21), @(0.1, 0.285), @(0.1, 0.62), @(0.9, 0.375), @(0.1, 0.925))
  for($i = 0; $i -lt 6; $i++){ MarkA $sl $px $py $pw $ph $marks[$i][0] $marks[$i][1] ($i + 1) }
  $rx = $px + $pw + 60; $rw = $M + $CW - $rx
  $y = CalloutsA $sl @(
    @('진행 막대 · 「2 / 5 단계」', '지금 어디까지 왔는지'),
    @('큰 화살표', '돌아야 할 방향'),
    @('한 문장', '「엘리베이터를 타고 5층으로 올라가세요」'),
    @('그 자리의 실제 사진', '눈앞 풍경과 같은지 맞춰 보기'),
    @('「1 / 2 · 눌러서 다음」', '사진이 두 장이면 눌러서 넘기기'),
    @('이전 · 다음', '단계를 앞뒤로')) $rx 118 $rw 10
  TipA $sl $rx ($y + 4) $rw '읽는 순서 — **화살표 → 문장 → 사진**. 풍경이 사진과 다르면 한 단계 돌아가 보세요.' | Out-Null

  # ── 10 기능 08 즐겨찾기 · 이어 하기
  $sl = PgA '기능 08' '즐겨찾기 · 이어 하기 — [[다시 찾지 않게]]' '자주 가는 곳은 담아 두고, 앱이 꺼져도 보던 단계부터 이어 갑니다.' '여덟 번째, 즐겨찾기와 이어 하기입니다.\n3D 화면 오른쪽 위 별을 누르면 채워진 별이 되면서 즐겨찾기에 담기고, ☰ 메뉴의 즐겨찾기에서 「열기」로 바로 갑니다.\n길안내 중에 전화를 받거나 앱이 꺼져도, 30분 안에 다시 켜면 「아까 보던 길안내가 있어요」 카드가 뜹니다. 「이어서 보기」를 누르면 보던 단계부터 다시 안내합니다.'
  $x = PhonesA $sl @(@('A09_즐겨찾기_별.jpg', '☆ → ★'), @('A10_즐겨찾기목록.jpg', '즐겨찾기'), @('화면20_이어하기.jpg', '이어 하기')) $M 124 318 12
  $rx = $x + 16; $rw = $M + $CW - $rx
  $y = StepsA $sl @(
    @('3D 화면의 ☆', '누르면 ★ — 즐겨찾기에 담깁니다'),
    @('☰ → 즐겨찾기', '「열기 ›」로 바로, ✕로 지우기'),
    @('앱이 꺼져도', '30분 안에 다시 켜면 「아까 보던 길안내가 있어요」'),
    @('「이어서 보기」', '보던 단계부터 다시')) $rx 124 $rw 8
  TipA $sl $rx ($y + 2) $rw '길안내 중 전화가 와도 — **처음부터 다시 찾지 않습니다.**' | Out-Null

  # ── 11 기능 09 ☰ 메뉴 · 밝은 화면
  $sl = PgA '기능 09' '오른쪽 위 [[두 개]]면 충분합니다 — ☰ 메뉴와 밝은 화면' '버튼을 줄여 화면을 넓게 쓰고, 햇빛 아래에서는 밝은 화면으로 바꿉니다.' '아홉 번째, ☰ 메뉴와 밝은 화면입니다.\n화면 오른쪽 위에는 인터넷 상태와 ☰ 두 개만 둡니다. ☰ 를 누르면 밝은 화면, 처음으로, 즐겨찾기, 설정이 펼쳐집니다.\n밝은 화면 스위치를 켜면 글자 크기는 그대로 두고 바탕만 밝게 바뀝니다. 한낮 야외에서 폰 화면이 잘 안 보일 때 씁니다. 버튼 테두리는 3픽셀 하늘색으로 또렷하게 했습니다.'
  $x = PhonesA $sl @(@('화면14_메뉴.jpg', '☰ 를 누르면'), @('화면15_밝은화면.jpg', '밝은 화면')) $M 124 352
  $rx = $x + 18; $rw = $M + $CW - $rx
  $y = StepsA $sl @(
    @('오른쪽 위는 두 개뿐', '인터넷 상태 · ☰'),
    @('☰ 를 누르면', '밝은 화면 · 처음으로 · 즐겨찾기 · 설정'),
    @('밝은 화면 스위치', '글자 크기는 그대로, 바탕만 밝게'),
    @('버튼 테두리', '3픽셀 하늘색 — 어디를 누를지 또렷하게')) $rx 124 $rw
  TipA $sl $rx ($y + 4) $rw '한낮 야외 · 햇빛 아래 — **밝은 화면**으로 바꾸면 잘 보입니다.' | Out-Null

  # ── 12 기능 10 인터넷이 끊겨도
  $sl = PgA '기능 10' '인터넷이 끊기면 — [[오른쪽 위]]가 알려 줍니다' '한 번 받아 둔 앱은 인터넷 없이도 열리고, 지금 상태를 오른쪽 위에서 바로 봅니다.' '열 번째, 인터넷이 끊겼을 때입니다.\n인터넷이 끊기면 오른쪽 위 동그라미가 주황색 「오프라인」으로 바뀝니다. 눌러 보면 지금 무엇이 되고 무엇이 쉬는지 알려 줍니다.\n길안내, 3D, 사진은 그대로 되고, 사진으로 위치를 찾는 AI 만 쉽니다. 「인터넷 없이 열기 : 준비됨」이면 처음 한 번 받아 둔 것으로 열립니다.'
  $x = PhonesA $sl @(@('A15_오프라인.jpg', '주황 「오프라인」'), @('A16_저장상태.jpg', '누르면 지금 상태')) $M 124 352
  $rx = $x + 18; $rw = $M + $CW - $rx
  $y = StepsA $sl @(
    @('끊기면 주황색 「오프라인」', '설정을 열지 않아도 한눈에'),
    @('눌러 보면', '무엇이 되고 무엇이 쉬는지 한 줄씩'),
    @('그대로 되는 것', '길안내 · 3D · 사진 — 쉬는 것은 사진으로 위치 찾기(AI)뿐'),
    @('「인터넷 없이 열기 : 준비됨」', '처음 한 번 받아 둔 것으로 열립니다')) $rx 124 $rw
  TipA $sl $rx ($y + 4) $rw '신호가 약한 계단 · 엘리베이터 안에서도 — **안내는 멈추지 않습니다.**' | Out-Null

  # ── 13 기능 11 앱 다운로드
  $sl = PgA '기능 11' '앱 다운로드 — [[홈 화면에 한 번]] 담아 두기' '앱스토어 없이, 설정의 「앱 다운로드」에서 폰에 맞는 버튼을 누릅니다.' '열한 번째, 앱 다운로드입니다. 이 앱은 앱스토어에 없습니다. 첫 화면 아래 「앱을 다운로드 하시려면 설정에 들어가주세요」를 누르면 설정이 열립니다.\n삼성 폰은 「삼성 →」 버튼 한 번으로 설치되고, 아이폰은 애플이 그 버튼을 막아 두어서 「아이폰 →」을 누르면 공유, 홈 화면에 추가, 추가 세 단계를 그림으로 보여 줍니다.\n설치하지 않아도 브라우저에서 그대로 쓸 수 있고, 홈 화면에 아이콘이 생기면 다음부터는 QR 없이 바로 엽니다.'
  $x = PhonesA $sl @(@('A02_쉬운모드_첫화면.jpg', '첫 화면 맨 아래'), @('A14_아이폰설치.jpg', '아이폰 세 단계')) $M 124 352
  $rx = $x + 18; $rw = $M + $CW - $rx
  $y = StepsA $sl @(
    @('첫 화면 맨 아래 노란 줄', '「앱을 다운로드 하시려면 설정에」'),
    @('「삼성 →」', '버튼 한 번으로 설치'),
    @('「아이폰 →」', '공유 → 홈 화면에 추가 → 추가, 세 단계 그림 안내'),
    @('설치하지 않아도', '브라우저에서 그대로 쓸 수 있습니다')) $rx 124 $rw
  TipA $sl $rx ($y + 4) $rw '홈 화면에 아이콘이 생기면 — 다음부터는 **QR 없이 바로** 엽니다.' | Out-Null

  # ── 14 기능 12 English · 건의함
  $sl = PgA '기능 12' 'English · 건의함 — [[함께 쓰고, 함께 고칩니다]]' '말이 달라도 같은 길을, 건물이 바뀌어도 맞는 사진을.' '열두 번째, 영어와 건의함입니다.\n설정에서 English 를 누르면 안내 문장, 버튼, 층 이름까지 모두 영어로 바뀝니다. 「Enter through the main gate」처럼 단계 안내도 그대로 영어입니다.\n건의함에서는 실제 모습과 달라진 곳을 찍어 올립니다. 한 사람이 하루 세 번까지 올릴 수 있고, 관리자가 확인한 뒤에 모든 사람의 화면에 반영됩니다.'
  $x = PhonesA $sl @(@('화면18_영어.jpg', 'English'), @('화면17_건의함.jpg', '건의함')) $M 124 352
  $rx = $x + 18; $rw = $M + $CW - $rx
  $y = StepsA $sl @(
    @('설정 → English', '안내 문장 · 버튼 · 층 이름까지 영어로'),
    @('건의함', '실제와 달라진 곳을 찍어 올립니다'),
    @('하루 3번까지', '오늘 올릴 수 있는 횟수가 화면에 — 관리자는 제한 없이'),
    @('관리자가 확인한 뒤', '모든 사람의 화면에 반영')) $rx 124 $rw
  TipA $sl $rx ($y + 4) $rw '공사로 바뀐 복도를 봤다면 — **사진 한 장**이 다음 사람을 돕습니다.' | Out-Null

  # ── 15 마무리
  $script:pg++
  $sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl $AC
  $o = $sl.Shapes.AddShape(9, -160, 300, 460, 460); $o.Line.Visible = 0; $o.Fill.ForeColor.RGB = (C '7B62F0'); $o.Fill.Transparency = 0.4; $o.Shadow.Visible = 0
  T $sl $M 70 600 16 '마 무 리' 11 'D9D2FF' -bold -spacing 3 | Out-Null
  T $sl $M 96 620 90 '설명서는 여기까지 —\n[[직접 눌러 보십시오.]]' 32 'FFFFFF' -bold -accent '8FEBFA' -lines 1.15 | Out-Null
  $tasks = @(@('1', '후문 QR 찍기', '「여기가 맞나요?」에 후문 사진이 뜹니다'), @('2', '「ㅎㄱㅅㅁㅅ」 검색', '초성만으로 학과사무실'), @('3', '☰ → 밝은 화면', '바탕이 밝게 바뀝니다'))
  for($i = 0; $i -lt 3; $i++){
    $yy = 214 + $i * 74
    Rect $sl $M $yy 560 62 'FFFFFF' '' 0 8 | Out-Null
    Oval $sl ($M + 16) ($yy + 16) 30 $AC $tasks[$i][0] 13 | Out-Null
    T $sl ($M + 60) ($yy + 11) 480 20 $tasks[$i][1] 14 $INK -bold | Out-Null
    T $sl ($M + 60) ($yy + 34) 480 16 $tasks[$i][2] 11 $INK2 | Out-Null
  }
  T $sl $M 448 600 20 '질의응답 — 들어 주셔서 감사합니다' 13 'E6E2FF' | Out-Null
  $qh = 330; $qw = PhoneW 'QR_후문.png' $qh
  Pic $sl 'QR_후문.png' (903 - $qw) 92 $qw $qh '' | Out-Null
  T $sl (903 - $qw) (92 + $qh + 8) $qw 16 '지금 찍어 보십시오' 11 'FFFFFF' -bold -align 2 | Out-Null
  Notes $sl '설명서는 여기까지입니다. 이제 직접 눌러 보시면 좋겠습니다.\n오른쪽 후문 QR 을 찍으면 「여기가 맞나요?」에 후문 사진이 뜹니다. 검색창에 「ㅎㄱㅅㅁㅅ」만 쳐 보시고, ☰ 메뉴에서 밝은 화면도 켜 보십시오.\n들어 주셔서 감사합니다. 질문 받겠습니다.'

  SavePres '졸업작품 모의 발표 ① 사용 설명서편' 15
}

# ═════════════════════════════════════════════════════════════════════════
#  B — 현장 답사형 : 종이색 바탕 + 먹회색 + 산호색 핀. 앱 화면 없이 3호관에서 직접 찍은 사진만
# ═════════════════════════════════════════════════════════════════════════
function PaletteB(){
  $script:BG = 'F5F1EA'; $script:INK = '23292F'; $script:INK2 = '4E565E'; $script:DIM = '857C70'
  $script:LINE = 'DDD3C4'; $script:LINE2 = 'E9E1D4'; $script:CARD = 'FFFDF9'
  $script:AC = '23292F'; $script:AC2 = 'ECE4D6'; $script:ACT = '23292F'; $script:AM = 'D9482B'; $script:RD = 'B3261E'; $script:MINT = 'D9482B'
}
function PgB([string]$stop, [string]$title, [string]$notes){
  $script:pg++
  $sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl $BG
  Oval $sl $M 30 12 $AM '' | Out-Null
  T $sl ($M + 20) 27 300 16 $stop 10 $AM -bold -spacing 2 | Out-Null
  T $sl $M 50 $CW 34 $title 22 $INK -bold -accent $AM -lines 1.1 | Out-Null
  Line $sl $M $FOOTY ($M + $CW) $FOOTY $LINE 0.75 | Out-Null
  T $sl $M ($FOOTY + 6) 500 14 '현장 답사 · 공대 3호관 길안내' 8.5 $DIM -spacing 0.6 | Out-Null
  T $sl ($M + $CW - 100) ($FOOTY + 6) 100 14 ([string]$script:pg) 8.5 $DIM -align 3 | Out-Null
  Notes $sl $notes
  return $sl
}
# 사진을 칸에 꽉 채워 자르고, 모서리는 각지게
function PhotoB($sl, [string]$file, [double]$x, [double]$y, [double]$w, [double]$h){
  $p = PicCover $sl $file $x $y $w $h ''
  try{ $p.AutoShapeType = 1 }catch{}
  $p.Line.Visible = 0
  return $p
}
# 사진 왼쪽 아래 이름표
function TagB($sl, [double]$x, [double]$y, [string]$text, [string]$fill = 'D9482B'){
  $w = [Math]::Min(260, 16 + 8.2 * $text.Length)
  Chip $sl $x $y $w 20 $text $fill 'FFFFFF' 9 -bold -radius 0 | Out-Null
}
function StripB($sl, [double]$y, [string]$text, [double]$h = 44){
  Rect $sl $M $y $CW $h $CARD $LINE 0.75 | Out-Null
  Rect $sl $M $y 5 $h $AM | Out-Null
  $t = T $sl ($M + 20) $y ($CW - 36) $h $text 12 $INK2 -anchor 3 -lines 1.3
  $t.Height = $h
}

function BuildB(){
  PaletteB; NewPres
  # ── 1 표지
  $script:pg++
  $sl = $pres.Slides.Add(1, 12); Bg $sl $AC
  PhotoB $sl '현장_정문.jpg' 0 0 $W $H | Out-Null
  $ov = Rect $sl 0 0 $W $H '1A1F24'; $ov.Fill.Transparency = 0.32
  $ov2 = Rect $sl 0 250 $W 290 '1A1F24'; $ov2.Fill.Transparency = 0.2
  Oval $sl $M 288 12 'FF7A5C' '' | Out-Null
  T $sl ($M + 20) 285 600 16 'FIELD REPORT · 졸업작품 모의 발표' 10.5 'F3D7CC' -bold -spacing 2.5 | Out-Null
  T $sl $M 310 820 60 '공대 3호관을 [[걸어서]] 읽다' 40 'FFFFFF' -bold -accent 'FF7A5C' | Out-Null
  T $sl $M 374 820 24 '네 개의 문 · 여섯 개의 층 — 길안내가 따라가는 실제 공간' 15 'EDE6DC' | Out-Null
  T $sl $M 430 820 20 '**팀 공3길**   김민종 · 손의윤 · 문성일    |    **지도교수**   강규창 교수님' 11.5 'D8D0C4' -boldColor 'FFFFFF' | Out-Null
  T $sl ($W - 260) 500 220 14 '사진 : 공대 3호관 정문' 9 'D8D0C4' -align 3 | Out-Null
  Notes $sl '안녕하십니까. 오늘은 앱 화면 대신, 공대 3호관을 직접 걸으며 찍은 사진으로 발표하겠습니다.\n길안내 앱은 결국 실제 건물을 따라갑니다. 네 개의 문과 여섯 개의 층을 답사하듯 함께 걸어 보겠습니다.'

  # ── 2 답사 범위
  $sl = PgB 'STOP 00 · 답사 범위' '지하 1층부터 5층까지 — [[여섯 개 층]]을 걸었습니다' '먼저 답사 범위입니다. 공대 3호관은 지상 다섯 개 층과 지하 1층, 모두 여섯 개 층이고, 출입문은 정문 · 후문 · 동문 · 서문 네 곳입니다.\n앱이 안내하는 호실은 100곳입니다. 1층에는 네 출입문과 로비, 학과사무실이 있고, 2층에는 카페 테이블이 있는 라운지, 3층부터 5층에는 사물함이 늘어선 넓은 홀과 연구실, 강의실이 있습니다. 지하 1층은 크리에이티브 존입니다.\n이제 문부터 차례로 걸어 보겠습니다.'
  $floors = @(
    @('5F', '연구실 · 강의실 · PC실(13524) · 사물함 홀'), @('4F', '연구실 · 프로그래밍 동아리실(KTC) · 사물함 홀'),
    @('3F', '연구실 · 강의실 · 사물함 홀'), @('2F', '강의실 · 카페 테이블이 있는 라운지'),
    @('1F', '네 출입문 · 로비(안내실) · 학과사무실 · 강의실'), @('B1', '크리에이티브 존 — 자유 열람 공간'))
  for($i = 0; $i -lt 6; $i++){
    $yy = 104 + $i * 50; $hot = ($i -eq 4)
    Rect $sl $M $yy 470 42 $(if($hot){ 'FBE9E4' } else { $CARD }) $(if($hot){ 'EDB9AC' } else { $LINE }) 0.75 | Out-Null
    Rect $sl $M $yy 52 42 $(if($hot){ $AM } else { $AC }) | Out-Null
    T $sl $M $yy 52 42 $floors[$i][0] 15 'FFFFFF' -bold -align 2 -anchor 3 | Out-Null
    T $sl ($M + 66) $yy 396 42 $floors[$i][1] 12 $INK2 -anchor 3 | Out-Null
  }
  $stats = @(@('4', '출입문'), @('6', '층 (지하 1층 포함)'), @('100', '안내하는 호실'))
  for($i = 0; $i -lt 3; $i++){
    $xx = $M + 500 + $i * 118
    T $sl $xx 104 110 50 $stats[$i][0] 38 $AM -bold | Out-Null
    T $sl $xx 156 110 30 $stats[$i][1] 10.5 $INK2 -lines 1.25 | Out-Null
  }
  PhotoB $sl '현장_3층라운지.jpg' ($M + 500) 200 346 200 | Out-Null
  TagB $sl ($M + 500) 380 '3층 · 엘리베이터 앞 홀'
  StripB $sl 412 '앱이 안내하는 곳은 모두 이 여섯 개 층 안에 있습니다 — 오늘은 **문에서 출발해 위로**, 그리고 **지하로** 걸어 봅니다.' 46

  # ── 3 네 개의 문
  $sl = PgB 'STOP 01 · 출입문' '문이 넷이면, [[첫걸음도 넷]]입니다' '3호관의 네 출입문입니다. 생김새도, 들어서면 처음 보이는 풍경도 다릅니다.\n정문은 「전자정보관」 현판 아래 계단을 올라 큰 유리문으로 들어가고, 들어서면 바로 엘리베이터 쪽입니다. 후문으로 들어서면 1층 라운지가 나오고, 왼쪽에 지하로 내려가는 계단이 있습니다.\n동문은 벽돌 벽 사이 계단, 서문은 초록 차양 아래 유리문이고, 둘 다 긴 복도를 따라 엘리베이터까지 갑니다. 그래서 안내의 첫걸음도 문마다 따로 정했습니다.'
  $gates = @(
    @('현장_정문.jpg', '정문', '「전자정보관」 현판 아래 계단 · 들어서면 바로 엘리베이터 쪽'),
    @('현장_후문.jpg', '후문', '들어서면 1층 라운지 · 왼쪽에 지하로 내려가는 계단'),
    @('현장_동문.jpg', '동문', '벽돌 벽 사이 계단 · 긴 복도를 따라 엘리베이터로'),
    @('현장_서문.jpg', '서문', '초록 차양 아래 유리문 · 동문처럼 긴 복도'))
  $gw = ($CW - 3 * 12) / 4
  for($i = 0; $i -lt 4; $i++){
    $xx = $M + $i * ($gw + 12)
    PhotoB $sl $gates[$i][0] $xx 100 $gw 236 | Out-Null
    TagB $sl $xx 316 $gates[$i][1]
    T $sl $xx 346 $gw 50 $gates[$i][2] 11 $INK2 -lines 1.35 | Out-Null
  }
  StripB $sl 412 '문마다 안에서 처음 마주치는 풍경이 다릅니다 — 그래서 **문에서 엘리베이터까지 가는 한 걸음**을 문마다 따로 정했습니다.' 46

  # ── 4 같은 연구실, 네 갈래
  $sl = PgB 'STOP 02 · 같은 목적지' '4층 13410호까지 — 문마다 [[두 번째 걸음]]이 다릅니다' '같은 목적지, 4층 13410호 IT융합통신공학과 지석근 교수님 연구실을 네 문에서 가 보겠습니다.\n정문은 들어서면 바로 엘리베이터라 다섯 단계입니다. 후문은 「1층 라운지에서 우회전」, 동문과 서문은 「복도를 따라 직진」이라는 한 걸음이 더 붙어 여섯 단계가 됩니다.\n엘리베이터를 탄 뒤로는 네 문 모두 똑같습니다. 다른 것은 문에서 엘리베이터까지, 딱 한 걸음입니다.'
  $rows = @(
    @('정문', @('정문으로\n들어오세요', '', '엘리베이터 4층으로', '내려서 우회전', '복도를 따라 직진', '오른쪽 여섯 번째 방'), '5단계'),
    @('후문', @('후문으로\n들어오세요', '1층 라운지에서\n우회전', '엘리베이터 4층으로', '내려서 우회전', '복도를 따라 직진', '오른쪽 여섯 번째 방'), '6단계'),
    @('동문', @('동문으로\n들어오세요', '복도를 따라 직진', '엘리베이터 4층으로', '내려서 우회전', '복도를 따라 직진', '오른쪽 여섯 번째 방'), '6단계'),
    @('서문', @('서문으로\n들어오세요', '복도를 따라 직진', '엘리베이터 4층으로', '내려서 우회전', '복도를 따라 직진', '오른쪽 여섯 번째 방'), '6단계'))
  $cx = $M + 62; $cg = 9; $cwid = ($CW - 62 - 5 * $cg) / 6
  for($i = 0; $i -lt 6; $i++){ T $sl ($cx + $i * ($cwid + $cg)) 98 $cwid 14 ('STEP ' + ($i + 1)) 8.5 $DIM -bold -align 2 -spacing 1 | Out-Null }
  for($r = 0; $r -lt 4; $r++){
    $yy = 118 + $r * 66; $row = $rows[$r]
    Rect $sl $M $yy 52 54 $AC | Out-Null
    T $sl $M ($yy + 6) 52 24 $row[0] 14 'FFFFFF' -bold -align 2 | Out-Null
    T $sl $M ($yy + 30) 52 16 $row[2] 9 'D8D0C4' -align 2 | Out-Null
    for($i = 0; $i -lt 6; $i++){
      $xx = $cx + $i * ($cwid + $cg); $txt = $row[1][$i]
      if($i -eq 1){
        if($txt){ Chip $sl $xx $yy $cwid 54 $txt 'FBE9E4' $AM 10.5 -bold -line 'EDB9AC' -radius 3 | Out-Null }
        else { Chip $sl $xx $yy $cwid 54 '— 바로 엘리베이터' $BG $DIM 10 -line $LINE -radius 3 | Out-Null }
      } else { Chip $sl $xx $yy $cwid 54 $txt $CARD $INK2 10.5 -line $LINE -radius 3 | Out-Null }
    }
  }
  StripB $sl 392 '엘리베이터를 탄 뒤로는 **네 문 모두 같은 길** — 다른 건 문에서 엘리베이터까지 **한 걸음뿐**입니다.' 46
  T $sl $M 446 $CW 16 '목적지 : 13410호 · IT융합통신공학과 지석근 교수님 연구실 (앱의 실제 안내 문장, 줄여 적음)' 9.5 $DIM | Out-Null

  # ── 5 후문에서 지하로
  $sl = PgB 'STOP 03 · 후문 → 지하 1층' '후문에서 지하로는 — [[엘리베이터보다 계단]]' '후문에서 지하 1층 크리에이티브 존으로 가는 길입니다.\n후문으로 들어서면 왼쪽에 바로 계단이 보입니다. 그 계단으로 내려가면 왼쪽에 크리에이티브 존 입구가 있습니다. 네 단계면 끝납니다.\n같은 곳을 정문에서 가면 엘리베이터 앞으로 가서 지하 1층으로 내려가고, 내려서 왼쪽, 정면, 도착까지 여섯 단계입니다. 후문에서는 엘리베이터를 찾을 필요가 없습니다.'
  $steps = @(@('현장_후문.jpg', '1  후문으로 들어오세요'), @('현장_후문계단.jpg', '2  좌측에 보이는 계단을 통해 내려가세요'), @('현장_지하복도.jpg', '3  좌측에 크리에이티브 존이 있습니다'), @('현장_크리에이티브존.jpg', '4  크리에이티브 존에 도착했습니다'))
  $sw = ($CW - 3 * 12) / 4
  for($i = 0; $i -lt 4; $i++){
    $xx = $M + $i * ($sw + 12)
    PhotoB $sl $steps[$i][0] $xx 100 $sw 236 | Out-Null
    T $sl $xx 344 $sw 40 $steps[$i][1] 11.5 $INK -bold -lines 1.3 | Out-Null
    if($i -lt 3){ Line $sl ($xx + $sw + 1) 218 ($xx + $sw + 11) 218 $AM 2 -arrow | Out-Null }
  }
  StripB $sl 400 '같은 곳을 **정문**에서 가면 — 엘리베이터 앞 → 지하 1층으로 → 내려서 왼쪽 → 정면 → 도착, **여섯 단계**. 후문은 **네 단계**입니다.' 50

  # ── 6 엘리베이터
  $sl = PgB 'STOP 04 · 엘리베이터' '위층으로 가는 길은 모두 [[엘리베이터]]에서 갈라집니다' '2층부터 5층까지 어디를 가든, 길은 엘리베이터를 지납니다.\n그래서 안내의 기준도 엘리베이터입니다. 「엘리베이터에서 내려서 우회전 하세요」처럼, 내린 방향을 기준으로 좌우를 말합니다.\n엘리베이터 안 사진도 안내에 들어갑니다. 문 위 표시기와 안쪽 버튼으로 몇 층인지 확인하고 내리면 됩니다.'
  $pics = @(@('현장_1층엘리베이터.jpg', '1층 · 엘리베이터 앞'), @('현장_4층엘리베이터안.jpg', '4층에 내리기 직전'), @('현장_4층복도R.jpg', '내려서 우회전 → 4층 복도'))
  $pw3 = ($CW - 2 * 12) / 3
  for($i = 0; $i -lt 3; $i++){
    $xx = $M + $i * ($pw3 + 12)
    PhotoB $sl $pics[$i][0] $xx 100 $pw3 220 | Out-Null
    TagB $sl $xx 300 $pics[$i][1] $(if($i -eq 1){ $AM } else { $AC })
  }
  $pts = @(@('2~5층 어디든', '엘리베이터를 타고 그 층으로'), @('좌우의 기준', '「엘리베이터에서 내려서」 — 내린 방향으로 좌회전 · 우회전'), @('엘리베이터 안 사진', '문 위 표시기로 몇 층인지 확인하고 내리기'))
  for($i = 0; $i -lt 3; $i++){
    $xx = $M + $i * ($pw3 + 12)
    Rect $sl $xx 332 $pw3 72 $CARD $LINE 0.75 | Out-Null
    T $sl ($xx + 14) 342 ($pw3 - 28) 18 $pts[$i][0] 12.5 $INK -bold | Out-Null
    T $sl ($xx + 14) 364 ($pw3 - 28) 36 $pts[$i][1] 10.5 $INK2 -lines 1.3 | Out-Null
  }
  StripB $sl 418 '그래서 안내 문장은 늘 **엘리베이터를 기준점**으로 시작합니다 — 「엘리베이터에서 내려서 좌회전 하세요」.' 44

  # ── 7 몇 층일까요
  $sl = PgB 'STOP 05 · 복도' '이 복도는 [[몇 층]]일까요?' '잠깐 퀴즈입니다. 네 장의 복도 사진, 몇 층일까요?\n(잠시 기다렸다가) 왼쪽부터 3층, 4층, 5층, 2층입니다. 층마다 복도가 닮아서 사진만 보고는 맞히기 어렵습니다.\n그래서 안내 문장마다 층과 방향을 꼭 넣고, 단계 사진에는 「5층 복도」처럼 어느 층인지 이름을 붙였습니다.'
  $q = @(@('현장_3층복도L.jpg', '3층'), @('현장_4층복도R.jpg', '4층'), @('현장_5층복도L.jpg', '5층'), @('현장_2층복도R.jpg', '2층'))
  $qw = ($CW - 3 * 12) / 4
  for($i = 0; $i -lt 4; $i++){
    $xx = $M + $i * ($qw + 12)
    PhotoB $sl $q[$i][0] $xx 96 $qw 250 | Out-Null
    Oval $sl ($xx + $qw / 2 - 22) 198 44 $AM '?' 22 | Out-Null
    Chip $sl $xx 354 $qw 30 ('정답 : ' + $q[$i][1]) $AC2 $INK 11 -bold -radius 3 | Out-Null
  }
  StripB $sl 400 '층마다 복도가 닮아 **사진만으로는 층을 알기 어렵습니다** — 그래서 안내 문장마다 **층과 방향**을, 단계 사진마다 「5층 복도」처럼 **층 이름**을 붙였습니다.' 50

  # ── 8 1층 화장실
  $sl = PgB 'STOP 06 · 1층 화장실' '같은 화장실, [[네 가지 길]]' '1층 화장실 하나를 네 문에서 가는 길입니다.\n정문은 1층 라운지에서 우측, 후문은 라운지에서 좌측으로 꺾습니다. 동문은 1층 중앙계단을 지나 우측, 서문은 왼쪽 네 번째 강의실 13119호를 지나 좌측으로 꺾습니다.\n눈에 띄는 것, 계단이나 호실 번호를 지나서 꺾으라고 말하는 것이 포인트입니다. 2층부터 5층은 더 간단해서, 엘리베이터에서 내려 좌회전하면 바로 화장실입니다.'
  $wc = @(@('현장_화장실_정문길.jpg', '정문', '1층 라운지에서\n우측으로'), @('현장_화장실_후문길.jpg', '후문', '1층 라운지에서\n좌측으로'), @('현장_1층복도L.jpg', '동문', '1층 중앙계단을\n지나 우측으로'), @('현장_화장실_서문길.jpg', '서문', '13119호실을\n지나 좌측으로'))
  $ww = 128; $wh = 150
  for($i = 0; $i -lt 4; $i++){
    $xx = $M + ($i % 2) * ($ww * 2 + 14); $yy = 98 + [Math]::Floor($i / 2) * ($wh + 8)
    PhotoB $sl $wc[$i][0] $xx $yy $ww $wh | Out-Null
    TagB $sl $xx $yy $wc[$i][1] $AC
    T $sl ($xx + $ww + 8) ($yy + 50) ($ww - 12) 50 $wc[$i][2] 11 $INK -bold -lines 1.3 | Out-Null
  }
  $bx = $M + 2 * ($ww * 2 + 14) + 6
  Line $sl ($bx - 14) 250 ($bx - 4) 250 $AM 2 -arrow | Out-Null
  PhotoB $sl '현장_1층화장실.jpg' $bx 98 170 308 | Out-Null
  TagB $sl $bx 386 '1층 화장실 도착'
  $tx = $bx + 186; $tw = $M + $CW - $tx
  T $sl $tx 104 $tw 16 '2~5층은' 10 $AM -bold -spacing 1 | Out-Null
  T $sl $tx 124 $tw 60 '엘리베이터에서\n내려서 **좌회전**하면\n바로 화장실' 12.5 $INK2 -lines 1.35 -boldColor $INK | Out-Null
  PhotoB $sl '현장_3층화장실.jpg' $tx 196 $tw 210 | Out-Null
  TagB $sl $tx 386 '3층 화장실'
  StripB $sl 418 '꺾는 곳은 **눈에 띄는 것**으로 — 「중앙계단을 지나」, 「13119호실을 지나」처럼 지나칠 표지를 함께 말합니다.' 44

  # ── 9 비상계단
  $sl = PgB 'STOP 07 · 비상계단' '비상계단은 [[복도 끝]] — 정문에서 3층까지 일곱 걸음' '비상계단입니다. 3층 비상계단을 정문에서 가 보면 일곱 단계입니다.\n정문으로 들어와 엘리베이터 앞으로, 3층으로 올라가 엘리베이터 정면에서 좌측으로 꺾고, 복도를 따라 직진하면 오른쪽 복도 끝에 비상계단이 있습니다.\n비상계단은 층마다 복도 끝에 있어서, 앱에서는 화장실처럼 검색 없이 고르면 가장 가까운 곳으로 안내합니다. 지하 1층은 비상계단 목록에서 뺐습니다.'
  PhotoB $sl '현장_3층비상계단.jpg' $M 96 280 372 | Out-Null
  TagB $sl $M 448 '3층 · 복도 끝 비상계단'
  $route = @('정문으로 들어오세요', '엘리베이터 앞으로 가세요', '엘리베이터를 타고 3층으로 올라가세요', '엘리베이터 정면에서 좌측으로 꺾으세요', '복도를 따라 직진하세요', '오른쪽 복도 끝에 비상계단이 위치해 있습니다', '비상계단에 도착했습니다')
  $rx = $M + 306; $rw = $M + $CW - $rx
  Line $sl ($rx + 13) 112 ($rx + 13) 418 $LINE 2 | Out-Null
  for($i = 0; $i -lt 7; $i++){
    $yy = 100 + $i * 48; $last = ($i -eq 6)
    Oval $sl $rx $yy 26 $(if($last){ $AM } else { $AC }) ([string]($i + 1)) 11 | Out-Null
    T $sl ($rx + 40) ($yy + 3) ($rw - 40) 22 $route[$i] 13 $(if($last){ $AM } else { $INK }) -bold:$last | Out-Null
  }
  T $sl $rx 444 $rw 20 '지하 1층은 비상계단 목록에서 뺐습니다.' 10.5 $DIM | Out-Null

  # ── 10 라운지
  $sl = PgB 'STOP 08 · 엘리베이터 앞 홀' '엘리베이터 앞 홀 — [[층마다 다른 얼굴]]' '엘리베이터 앞 넓은 공간은 층마다 생김새가 다릅니다.\n1층은 안내실이 있는 로비, 2층은 카페 테이블과 책상이 있는 라운지, 3층과 4층은 사물함이 늘어선 넓은 홀입니다.\n복도는 층마다 닮았지만 이 홀은 달라서, 엘리베이터에서 내리자마자 「지금 몇 층인가」를 눈으로 확인하는 표지가 됩니다.'
  $lg = @(@('현장_1층로비.jpg', '1층 로비', '안내실과 정문 쪽 유리문'), @('현장_2층라운지.jpg', '2층 라운지', '카페 테이블 · 책상 · 사물함'), @('현장_3층라운지.jpg', '3층 홀', '사물함이 늘어선 넓은 홀'), @('현장_4층라운지.jpg', '4층 홀', '창가로 트인 사물함 홀'))
  $lw4 = ($CW - 3 * 12) / 4
  for($i = 0; $i -lt 4; $i++){
    $xx = $M + $i * ($lw4 + 12)
    PhotoB $sl $lg[$i][0] $xx 96 $lw4 250 | Out-Null
    TagB $sl $xx 326 $lg[$i][1] $(if($i -eq 1){ $AM } else { $AC })
    T $sl $xx 354 $lw4 20 $lg[$i][2] 11 $INK2 | Out-Null
  }
  StripB $sl 396 '복도는 닮았지만 엘리베이터 앞 홀은 층마다 다릅니다 — 내리자마자 **「지금 몇 층인가」를 눈으로 확인하는 표지**입니다.' 46

  # ── 11 도착 문장
  $sl = PgB 'STOP 09 · 도착' '마지막 한마디는 — [[몇 번째 방]]인가' '도착입니다. 마지막 안내 문장은 늘 문을 셉니다.\n「오른쪽에서 여섯 번째 방에 13410호」, 「오른쪽에서 세 번째 방에 13524호 PC실」, 「왼쪽에서 첫 번째 방에 KTC 프로그래밍 동아리실」처럼요.\n번호판이 보이기 전부터 몇 번째 문인지 세며 다가갈 수 있습니다. 그리고 앱에는 그 문 앞 사진이 있어서, 마지막에 사진과 문을 맞춰 보면 됩니다.'
  $ar = @(@('현장_13410.jpg', '13410호', '「오른쪽에서 여섯 번째 방에\n13410호 · IT융합통신공학과\n지석근 교수님 연구실이 있습니다」'), @('현장_13524.jpg', '13524호', '「오른쪽에서 세 번째 방에\n13524호 · PC실이 있습니다」'), @('현장_KTC.jpg', 'KTC', '「왼쪽에서 첫 번째 방에\nKTC 프로그래밍 동아리실이\n있습니다」'))
  $aw = ($CW - 2 * 14) / 3
  for($i = 0; $i -lt 3; $i++){
    $xx = $M + $i * ($aw + 14)
    PhotoB $sl $ar[$i][0] $xx 96 $aw 230 | Out-Null
    TagB $sl $xx 306 $ar[$i][1]
    T $sl $xx 336 $aw 60 $ar[$i][2] 11.5 $INK -lines 1.35 | Out-Null
  }
  StripB $sl 412 '번호판이 보이기 전부터 — **「오른쪽에서 몇 번째 방」**으로 문을 세며 다가갈 수 있습니다.' 44

  # ── 12 여섯 장면
  $sl = PgB 'STOP 10 · 처음부터 끝까지' '서문에서 4층 연구실까지 — [[여섯 장면]]' '이제 처음부터 끝까지 한 번에 따라가 보겠습니다. 서문에서 4층 13410호까지입니다.\n서문으로 들어와 복도를 따라 직진, 엘리베이터를 타고 4층, 내려서 우회전, 복도를 따라 직진, 그리고 오른쪽에서 여섯 번째 방.\n앱이 단계마다 보여 주는 사진이 바로 이 장면들입니다. 눈앞 풍경이 사진과 같으면 맞게 가고 있는 것입니다.'
  $sc = @(@('현장_서문.jpg', '서문으로 들어오세요'), @('현장_서문복도.jpg', '복도를 따라 직진하세요'), @('현장_1층엘리베이터.jpg', '엘리베이터를 타고 4층으로'), @('현장_4층엘리베이터안.jpg', '내려서 우회전 하세요'), @('현장_4층복도R.jpg', '복도를 따라 직진하세요'), @('현장_13410.jpg', '오른쪽 여섯 번째 방\n— 도착'))
  $s6 = ($CW - 5 * 10) / 6
  for($i = 0; $i -lt 6; $i++){
    $xx = $M + $i * ($s6 + 10)
    PhotoB $sl $sc[$i][0] $xx 100 $s6 250 | Out-Null
    Oval $sl ($xx + 8) 108 24 $(if($i -eq 5){ $AM } else { $AC }) ([string]($i + 1)) 11 | Out-Null
    T $sl $xx 358 $s6 36 $sc[$i][1] 10.5 $INK -bold -lines 1.3 | Out-Null
  }
  StripB $sl 404 '앱이 단계마다 보여 주는 사진이 **바로 이 장면들**입니다 — 눈앞 풍경이 사진과 같으면 맞게 가고 있는 것입니다.' 46

  # ── 13 안내 말의 규칙
  $sl = PgB 'STOP 11 · 안내 문장' '현장에서 정한 [[안내 말의 규칙]]' '현장을 걸으며 안내 문장의 규칙을 정했습니다.\n「쭉 이동하세요」 대신 「직진하세요」처럼 짧고 분명하게, 좌우는 엘리베이터에서 내린 방향을 기준으로 말합니다.\n정문에서 위층으로 갈 때는 들어서면 바로 엘리베이터라 「엘리베이터 앞으로 가세요」를 뺐습니다. 도착은 몇 번째 방인지 세고, 꺾는 곳은 계단이나 호실 번호처럼 눈에 띄는 것을 지나서 꺾으라고 말합니다.'
  $rules = @(
    @('짧고 분명하게', '「복도를 따라 직진하세요」', '「쭉 이동하세요」 대신'),
    @('엘리베이터 기준', '「엘리베이터에서 내려서 우회전」', '좌우는 내린 방향으로'),
    @('필요 없는 걸음은 빼기', '정문 → 위층은 다섯 단계', '들어서면 바로 엘리베이터라 「엘리베이터 앞으로」를 뺌'),
    @('도착은 문 세기', '「오른쪽에서 여섯 번째 방」', '번호판보다 먼저 보이는 것'),
    @('지나칠 표지', '「1층 중앙계단을 지나 우측으로」', '눈에 띄는 것을 지나서 꺾기'),
    @('호실 번호도 이정표', '「13119호실을 지나 좌측으로」', '번호를 확인하며 꺾기'))
  $rw3 = ($CW - 2 * 12) / 3
  for($i = 0; $i -lt 6; $i++){
    $xx = $M + ($i % 3) * ($rw3 + 12); $yy = 98 + [Math]::Floor($i / 3) * 148
    Rect $sl $xx $yy $rw3 136 $CARD $LINE 0.75 | Out-Null
    T $sl ($xx + 16) ($yy + 14) 40 30 ('0' + ($i + 1)) 20 $AM -bold | Out-Null
    T $sl ($xx + 16) ($yy + 48) ($rw3 - 32) 18 $rules[$i][0] 13 $INK -bold | Out-Null
    T $sl ($xx + 16) ($yy + 72) ($rw3 - 32) 22 $rules[$i][1] 11.5 $AM -bold | Out-Null
    T $sl ($xx + 16) ($yy + 98) ($rw3 - 32) 32 $rules[$i][2] 10.5 $INK2 -lines 1.3 | Out-Null
  }
  T $sl $M 400 $CW 16 '모두 앱의 실제 안내 문장입니다.' 9.5 $DIM | Out-Null

  # ── 14 바로잡은 것
  $sl = PgB 'STOP 12 · 바로잡은 것' '걸어 보고 [[바로잡은 것]]' '마지막으로, 직접 걸어 보고 바로잡은 것들입니다.\n9월 24일에는 1층 길안내의 좌우가 반대인 것을 찾아, 엘리베이터를 마주 보는 기준으로 고쳤습니다. 1층 복도 사진이 반대로 나오던 것도 함께 고쳤습니다.\n「KTC호」라고 적혀 있던 곳은 현장 이름대로 「프로그래밍 동아리실」로 바꿨고, 1층 비상계단은 엘리베이터 정면에서 시작하도록 했습니다.\n10월 19일에는 정문 길 미리보기가 두 문 사이 기둥으로 걸어 들어가던 것을, 오른쪽 문으로 들어가게 바로잡았습니다. 오른쪽 사진이 그 정문의 두 문입니다.'
  $fx = @(
    @('9/24', '1층 길안내의 좌우가 반대', '→ 「엘리베이터를 마주 보고」 기준으로'),
    @('9/24', '1층 복도 사진이 반대 방향', '→ 걷는 방향의 사진으로'),
    @('9/27', '「KTC호」라는 이름', '→ 현장 이름대로 「프로그래밍 동아리실」'),
    @('9/28', '1층 비상계단 안내', '→ 엘리베이터 정면에서 시작'),
    @('9/28', '2~5층 화장실 안내', '→ 「엘리베이터에서 내려서」 — 호실 안내와 같은 말'),
    @('10/19', '정문 미리보기가 두 문 사이 기둥으로', '→ 오른쪽 문으로 들어가게'))
  for($i = 0; $i -lt 6; $i++){
    $yy = 98 + $i * 52
    Chip $sl $M $yy 58 40 $fx[$i][0] $AC 'FFFFFF' 11 -bold -radius 3 | Out-Null
    T $sl ($M + 72) ($yy + 2) 440 18 $fx[$i][1] 12.5 $INK -bold | Out-Null
    T $sl ($M + 72) ($yy + 22) 440 18 $fx[$i][2] 11 $AM | Out-Null
  }
  PhotoB $sl '현장_정문안.jpg' ($M + 540) 98 306 230 | Out-Null
  TagB $sl ($M + 540) 308 '정문 안쪽 — 두 개의 문'
  T $sl ($M + 540) 340 306 60 '두 문 사이에는 기둥이 있습니다 — 미리보기가 그 기둥으로 걸어 들어가던 것을 **오른쪽 문**으로 바로잡았습니다.' 11 $INK2 -lines 1.35 | Out-Null
  StripB $sl 418 '도면만 보고는 몰랐던 것들입니다 — **직접 걸어 봐야** 안내가 실제와 맞습니다.' 44

  # ── 15 마무리
  $script:pg++
  $sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl $AC
  PhotoB $sl '현장_서문.jpg' 0 0 $W $H | Out-Null
  $ov = Rect $sl 0 0 $W $H '1A1F24'; $ov.Fill.Transparency = 0.22
  Oval $sl $M 120 12 'FF7A5C' '' | Out-Null
  T $sl ($M + 20) 117 400 16 '답사를 마치며' 10.5 'F3D7CC' -bold -spacing 2.5 | Out-Null
  T $sl $M 144 560 100 '다음 답사는 —\n[[여러분 차례]]입니다.' 34 'FFFFFF' -bold -accent 'FF7A5C' -lines 1.15 | Out-Null
  T $sl $M 256 540 50 '서문 QR을 찍고, 오늘 본 **여섯 장면**을 직접 걸어 보십시오.\n앱의 사진과 눈앞 풍경이 같은지 — 그게 이 앱의 전부입니다.' 13 'EDE6DC' -lines 1.6 -boldColor 'FFFFFF' | Out-Null
  T $sl $M 340 540 20 '질의응답 — 들어 주셔서 감사합니다' 13 'D8D0C4' | Out-Null
  $qh = 320; $qw = PhoneW 'QR_서문.png' $qh
  Pic $sl 'QR_서문.png' (903 - $qw) 96 $qw $qh '' | Out-Null
  Notes $sl '답사는 여기까지입니다. 다음 답사는 여러분 차례입니다.\n오른쪽 서문 QR 을 찍고, 오늘 본 여섯 장면을 직접 걸어 보십시오. 앱의 사진과 눈앞 풍경이 같은지 확인하는 것, 그게 이 앱의 전부입니다.\n들어 주셔서 감사합니다. 질문 받겠습니다.'

  SavePres '졸업작품 모의 발표 ② 현장 답사편' 15
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
