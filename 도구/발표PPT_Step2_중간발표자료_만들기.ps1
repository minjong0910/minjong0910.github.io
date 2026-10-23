# 졸업작품 발표 Step 2(해결형) — 중간발표 자료(교수님께 칭찬받은 30쪽)의 내용을 Step 2 순서에 맞춰 다시 짠 PowerPoint 20쪽
#
#   2026-10-23 사용자 : 「내가 준 중간발표 자료를 가지고 Step 2 의 조건을 가지고 만들어 달라고 한 거였어.
#                       중간발표처럼 만들라고 한 게 아니라」 → 20쪽(20~25분) · 중간발표 모양으로 고름
#   · 순서는 교수님 스토리라인 예시 Type 2 : 표지 · 들어가며 · 문제점 · 해결 아이디어 · 설계 및 구현 · 시연 + 기능 1 · 기능 2 ·
#     변화 · 발전 방향 · 마무리 · Q&A
#   · 내용은 중간발표(바탕화면 캡스톤 중간발표.pdf · 도구\발표_캡스톤_틀.html) 쪽을 가져와 그 순서에 넣었다 — 쪽마다 ( ) 안에 원래 쪽 번호
#     숫자는 지금 앱에 맞게 고침 : 249개 · 16.5MB · 사진 169장 · 코드 31개 파일 · 보안 규칙 130줄 · 이용자에게 보이는 AI 답 세 가지
#   · 구조도 · 블록도 · 흐름도 · 격차 그래프는 중간발표 PDF 를 3배로 그려 잘라 낸 그림(도구\발표그림\ppt\중간_*.png)
#   · 앱 화면은 지금 화면(도구\발표그림\ppt\화면*.jpg) — 중간발표 때 화면은 옛 모습이라 시연과 안 맞는다
#   · 앞서 만든 26쪽(발표PPT_Step2_만들기.ps1 = Step 2 내용을 중간발표 모양에)은 사용자가 원한 것이 아니었다
#
#   PowerPoint(COM)로 직접 그린다 — 글자 · 표 · 도형은 고칠 수 있는 PowerPoint 개체, 쪽마다 발표 노트(대본)
#   사용법 : pwsh -File 도구\발표PPT_Step2_중간발표자료_만들기.ps1 [-Desktop]   → 생성물\발표\ 에 .pptx 와 .pdf
param([string]$OutDir = '', [switch]$Desktop)
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$IMG  = Join-Path $PSScriptRoot '발표그림\ppt'
if(-not $OutDir){ $OutDir = Join-Path $ROOT '생성물\발표' }
New-Item -ItemType Directory -Force $OutDir | Out-Null
$NAME = '캡스톤 발표 Step 2 (중간발표 자료)'
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
# 중간발표 그림 쪽 — 왼쪽 흰 카드에 그림, 오른쪽에 한 줄 · 구현 · 이유 · 쉬운 말로 하면
#   글을 먼저 넣고 높이를 잰 다음, 남는 높이를 칸 사이에 나눠 오른쪽 끝을 그림 카드 아래 끝에 맞춘다
function FigPage($sl, [string]$file, [string]$head, [string]$implT, [string[]]$impl, [string]$why, [string]$bar, [string]$easy){
  $y0 = 102; $fh = 381
  $sz = ImgSize (Join-Path $IMG $file); $fw = $fh * $sz[0] / $sz[1]
  Card $sl $M $y0 $fw $fh | Out-Null
  Pic $sl $file ($M + 2) ($y0 + 2) ($fw - 4) ($fh - 4) '' | Out-Null
  $x = $M + $fw + 22; $w = $M + $CW - $x
  $hd = T $sl $x $y0 $w 80 $head 15 $INK -bold -lines 1.25
  $hh = $hd.TextFrame.TextRange.BoundHeight
  $c1 = Card $sl $x 0 $w 50
  $t1 = T $sl ($x + 16) 0 ($w - 32) 16 $implT 10.5 $ACT -bold
  $b1 = T $sl ($x + 16) 0 ($w - 32) 400 ($impl -join '\n') 11 $INK2 -lines 1.3 -after 3
  Bullets $b1
  $ih = 32 + $b1.TextFrame.TextRange.BoundHeight + 12
  $c2 = Rect $sl $x 0 $w 50 $CARD $LINE2 0.75; $c2b = Rect $sl $x 0 7 50 $bar
  $t2 = T $sl ($x + 22) 0 ($w - 40) 400 $why 11.5 $INK2 -lines 1.32
  $wh = $t2.TextFrame.TextRange.BoundHeight + 24
  $c3 = Rect $sl $x 0 $w 50 $BG $LINE 0.75 5.7 -dash
  $t3l = T $sl ($x + 16) 0 ($w - 32) 14 '쉬운 말로 하면' 9.5 $AM -bold -spacing 1.5
  $t3 = T $sl ($x + 16) 0 ($w - 32) 400 $easy 11 $DIM -lines 1.35 -boldColor $INK2
  $eh = 27 + $t3.TextFrame.TextRange.BoundHeight + 12
  $free = $fh - ($hh + $ih + $wh + $eh)
  if($free -lt 30){ throw ($file + ' : 오른쪽 글이 그림 카드보다 깁니다 (남는 높이 ' + [int]$free + ')') }
  $gap = [Math]::Min(22, $free / 3)
  $y = $y0 + $hh + $gap
  $c1.Top = $y; $c1.Height = $ih; $t1.Top = $y + 11; $b1.Top = $y + 32; $b1.Height = $ih - 38
  $y += $ih + $gap
  $c2.Top = $y; $c2.Height = $wh; $c2b.Top = $y; $c2b.Height = $wh; $t2.Top = $y; $t2.Height = $wh; $t2.TextFrame.VerticalAnchor = 3
  $y += $wh + $gap
  $c3.Top = $y; $c3.Height = $eh; $t3l.Top = $y + 9; $t3.Top = $y + 27; $t3.Height = $eh - 30
  # 둥근 모서리 비율은 처음 높이(50) 기준이라 늘린 뒤 다시 맞춘다
  foreach($c in @($c1, $c3)){ $c.Adjustments.Item(1) = [Math]::Min(0.5, 5.7 / [Math]::Min($c.Width, $c.Height)) }
}
$S1 = '01 · 들어가며'; $S2 = '02 · 우리가 발견한 문제점'; $S3 = '03 · 우리의 해결 아이디어'; $S4 = '04 · 솔루션 설계 및 구현'
$S5 = '05 · 핵심 기능 시연'; $S6 = '06 · 우리가 만든 변화'; $S7 = '07 · 향후 발전 방향'; $S8 = '08 · 마무리하며'

# ══ PowerPoint 열기 ══════════════════════════════════════════
$app = New-Object -ComObject PowerPoint.Application
$pres = $app.Presentations.Add(0)
$pres.PageSetup.SlideWidth = $W; $pres.PageSetup.SlideHeight = $H
try{
# ───────────────────────────────────────── 1 표지
$script:pg++
$sl = $pres.Slides.Add(1, 12); Bg $sl $AC
T $sl $M 140 760 16 '졸 업 작 품 발 표' 11 'B9BBBE' -spacing 4 | Out-Null
T $sl $M 166 760 70 '공대 3호관 [[길안내]]' 46 'FFFFFF' -bold -lines 1.05 -accent $MINT -boldColor 'FFFFFF' | Out-Null
Rect $sl $M 250 113 5 $MINT | Out-Null
T $sl $M 276 760 26 '건물 안에서 길을 잃는 문제를 해결하기 위한 새로운 제안' 17 'E2E3E5' | Out-Null
T $sl $M 306 760 22 '군산대학교 공과대학 3호관' 12.5 'B9BBBE' | Out-Null
T $sl $M 380 760 40 '**팀 공3길**    김민종 · 손의윤 · 문성일\n**지도교수**    강규창 교수님' 12 'A4A7AB' -lines 1.75 -boldColor 'E2E3E5' | Out-Null
Notes $sl '발표 시작하겠습니다. 저희는 팀 공3길이고, 졸업작품은 「공대 3호관 길안내」입니다.\n건물 앞까지는 지도 앱이 데려다주지만, 건물 안에 들어서는 순간부터는 아무도 길을 알려 주지 않습니다. 그 문제를 어떻게 풀었는지 말씀드리겠습니다.'

# ───────────────────────────────────────── 2 들어가며
$sl = Page '01 · 들어가며' '수업 5분 전, [[처음 가 보는 강의실]]' $S1 '수업 5분 전, 처음 가 보는 강의실을 찾는다고 생각해 보십시오.\n엘리베이터 문이 열렸는데 왼쪽인지 오른쪽인지 모르고, 복도에 들어서도 그 끝에 강의실이 있는지 모릅니다. 벽에 안내도가 있어도 내가 찾는 호실은 안 보입니다.\n지도 앱은 건물 앞에서 끝나고, 그다음은 지나가는 사람에게 묻는 수밖에 없습니다.'
T $sl $M 104 $CW 22 '건물 안에서 길을 잃는 순간은 **세 번** 옵니다. 세 사진 모두 공대 3호관에서 저희가 직접 찍은 것입니다.' 13 | Out-Null
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

# ───────────────────────────────────────── 3 문제점 (중간발표 4 · 6쪽)
$sl = Page '02 · 우리가 발견한 문제점' '조건 네 가지, 그리고 [[남은 숙제 하나]]' $S2 '문제를 듣고 바로 만들지 않았습니다. 만들기 전에 스스로 못을 네 개 박았습니다.\n저희가 졸업하면 요금 낼 사람이 없으니 돈이 들면 안 되고, 학생은 공사 허가를 받을 수 없으니 장치를 달 수 없고, 길을 잃는 곳이 하필 지하와 계단이니 통신이 없어도 돼야 하고, 사람 손이 계속 가는 것은 1년을 못 가니 손이 안 가야 합니다.\n앞의 셋은 기술을 고르는 문제라 풀렸습니다. 네 번째가 남았습니다. 사진이 낡으면 지나가는 사람이 찍어 올리게 하면 되는데, 올라온 사진이 어디인지는 누가 판단합니까? 사람이 하면 네 번째 조건이 그 자리에서 깨집니다.\n그래서 기계가 판단해야 하고, 더 어려운 것은 틀릴 때를 아는 것입니다. 맞히는 것보다 「못 맞혔다」를 아는 것이 훨씬 어렵습니다.'
T $sl $M 104 $CW 22 '문제를 듣고 바로 만들지 않았습니다. 만들기 전에 **스스로 못을 네 개 박았고**, 그 네 줄이 뒤의 모든 선택을 결정했습니다.' 13 | Out-Null
$cw4 = ($CW - 3 * 16) / 4
$conds = @(
  @('① 돈이 들면 안 된다', '저희가 졸업하면 [[요금 낼 사람이 없습니다.]] 서버비도 장치비도 **0원**이어야 합니다.', $false),
  @('② 공사를 할 수 없다', '학생은 [[공사 허가를 받을 수 없습니다.]] 벽에 다는 장치는 애초에 선택지가 아닙니다.', $false),
  @('③ 통신이 없어도 된다', '길을 잃는 곳이 하필 [[지하 · 계단 · 엘리베이터 안]]입니다. 거기서 멈추면 있으나 마나입니다.', $false),
  @('④ 손이 안 가야 한다', '사람 손이 계속 가야 하는 것은 **1년을 못 갑니다.** 저희가 떠나도 혼자 돌아가야 합니다.', $true))
for($i = 0; $i -lt 4; $i++){
  $xx = $M + $i * ($cw4 + 16); $c4 = $conds[$i]
  Card $sl $xx 136 $cw4 124 $(if($c4[2]){ $AC2 } else { $CARD }) $(if($c4[2]){ 'BFC6CE' } else { $LINE }) | Out-Null
  T $sl ($xx + 16) 150 ($cw4 - 32) 20 $c4[0] 13.5 $INK -bold | Out-Null
  T $sl ($xx + 16) 176 ($cw4 - 32) 80 $c4[1] 11 $INK2 -lines 1.5 | Out-Null
}
$hw = ($CW - 16) / 2; $rx = $M + $hw + 16
Card $sl $M 274 $hw 104 | Out-Null
T $sl ($M + 20) 287 ($hw - 40) 18 '여기까지는 쉽습니다' 11.5 $DIM -bold | Out-Null
T $sl ($M + 20) 307 ($hw - 40) 22 '**지나가는 사람이 찍어 올리게 하면 된다**' 13.5 $INK | Out-Null
T $sl ($M + 20) 334 ($hw - 40) 40 '그런데 올라온 사진 한 장을 놓고 [[「이게 어디냐」]]를 누가 판단합니까? 사람이 하면 **④번 조건이 그 자리에서 깨집니다.**' 11 $INK2 -lines 1.4 | Out-Null
Card $sl $rx 274 $hw 104 $AC2 'BFC6CE' | Out-Null
T $sl ($rx + 20) 287 ($hw - 40) 18 '그래서 기계가 판단해야 합니다' 11.5 $DIM -bold | Out-Null
T $sl ($rx + 20) 307 ($hw - 40) 44 '**올라온 사진이 어디인지 기계가 맞힐 수 있나 — 그리고 틀릴 때를 알 수 있나**' 13.5 $INK -lines 1.3 | Out-Null
T $sl ($rx + 20) 354 ($hw - 40) 18 '앞 절반은 그림 비교입니다. **어려운 쪽은 뒷 절반**입니다.' 11 $INK2 | Out-Null
Strip $sl 392 '**뒷 문장이 핵심입니다.** 틀린 사진이 안내에 섞여 들어가면 ①②③을 아무리 잘 지켜도 **앱 전체를 믿을 수 없게 됩니다.**\n**맞히는 것보다 「못 맞혔다」를 아는 것이 훨씬 어렵습니다.**' 58 $AC 12.5 | Out-Null

# ───────────────────────────────────────── 4 해결 아이디어 (중간발표 5쪽)
$sl = Page '03 · 우리의 해결 아이디어' '조건이 [[선택을 정했습니다]]' $S3 '그래서 저희가 고른 방법입니다. 저희가 창의적이어서 다르게 만든 것이 아닙니다. 네 조건을 지키려니 길이 하나뿐이었습니다.\n계산은 서버가 아니라 휴대폰이 직접 합니다. 위치를 재는 장치 대신 출입문에 QR 네 장을 붙였습니다. 필요할 때마다 받는 대신 처음에 16.5MB 를 통째로 휴대폰에 저장합니다.\n오른쪽 「치른 대가」도 봐 주십시오. QR 은 출발점만 알 뿐, 걸어가는 동안의 위치는 모릅니다.\n네 번째 줄, 이용자가 찍어 올린 사진을 누가 가리느냐는 실제로 풀어야 할 문제로 남았습니다. 기능 2 에서 보여 드립니다.'
T $sl $M 104 $CW 22 '저희가 창의적이어서 다르게 만든 것이 아닙니다. **네 조건을 지키려니 길이 하나뿐이었습니다.**' 13 | Out-Null
Tbl $sl $M 140 @(127, 202, 254, 263) @(
  @('조건', '보통 하는 법', '저희가 고른 것', '치른 대가'),
  @('**① 돈 0원**', '서버에서 계산해 내려 준다', '**휴대폰이 직접 계산**\n~~GitHub Pages + Firestore 무료 한도~~', '폰이 느리면 그만큼 느립니다'),
  @('**② 공사 0**', 'Wi-Fi · 비콘을 수십 개 단다', '**출입문에 QR 네 장**\n~~스티커 한 장이 전부~~', '[[지금 위치는 모릅니다]] — 출발점만 압니다'),
  @('**③ 통신 0**', '필요할 때마다 서버에서 받는다', '**처음에 16.5MB를 통째로**\n~~서비스 워커가 폰에 저장~~', '첫 실행이 한 번 느립니다'),
  @('**④ 손 안 가게**', '관리자가 주기적으로 사진을 다시 찍는다', '**이용자가 찍어 올리게**\n~~지나가는 사람이 갱신한다~~', '**올라온 사진을 누가 가리나** — 남은 숙제')
) -hi @(4) -fs 12 -rowH 48 | Out-Null
Strip $sl 400 '**앞의 세 줄은 하루면 정할 수 있는 기술 선택입니다.** 네 번째 줄은 **실제 풀어 나가야 할 문제**로 남았습니다 — 기능 2에서 보여 드립니다.' 48 | Out-Null

# ───────────────────────────────────────── 5 재료 (중간발표 11쪽)
$sl = Page '04 · 재료' '전부 [[휴대폰 안에서]] 돕니다' $S4 '무엇으로 만들었는지입니다. 표의 가운데는 그것이 하는 일, 오른쪽은 왜 그것을 골랐는지입니다.\nAI 는 사진 한 장을 숫자 1,280개로 바꾸는 MobileNet 을 썼습니다. 폰 브라우저에서 도는 가장 작은 축이라 골랐습니다. 글자가 보이면 Tesseract 로 호실 번호를 먼저 읽습니다.\n3D 건물은 모델 파일 없이 좌표 표에서 직접 그려 냅니다. 건물 도면을 3D 로 만들어 줄 사람도 프로그램도 없었기 때문입니다.\n직접 쓴 코드는 31개 파일, 약 2만 4천 줄이고, 서버에 올라가는 우리 코드는 보안 규칙 130줄이 전부입니다. 나머지는 전부 휴대폰에서 돕니다.'
Tbl $sl $M 106 @(150, 360, 336) @(
  @('무엇을 썼나', '무슨 일을 하나', '왜 이것이었나'),
  @('**MobileNet v2**\n~~α 0.5 · TensorFlow.js~~', '사진 한 장을 **숫자 1,280개**로 바꿉니다. 그 숫자가 비슷하면 같은 자리로 봅니다', '폰 브라우저에서 도는 **가장 작은 축**. 학습용 GPU도 시간도 없었습니다'),
  @('**Tesseract.js**', '사진 속 **호실 번호 · 엘리베이터 층 표시**를 읽습니다', '글자가 읽히면 **모양보다 글자를 믿습니다** — 훨씬 확실합니다'),
  @('**three.js**', '건물을 **좌표 표에서 그려 냅니다** — 3D 모델 파일이 없습니다', '건물 도면을 3D로 만들 사람도 프로그램도 없었습니다'),
  @('**jsQR**', '문에 붙인 **QR을 읽어** 출발점을 정합니다', '장치를 달지 않고 출발점을 정하는 **가장 싼 방법**'),
  @('**Firestore**\n~~+ 서비스 워커~~', '제보 사진을 **맡아 두고 나눠** 줍니다 · 249개 16.5MB를 **폰에 저장**합니다', '무료 한도 안이라 **서버 비용 0원** · 지하 · 계단은 전파가 없습니다')
) -fs 11.5 -rowH 48 | Out-Null
Strip $sl 414 '직접 쓴 코드는 **31개 파일 · 약 2만 4천 줄**입니다. 그중 **서버에 올라가는 우리 코드는 보안 규칙 130줄이 전부**입니다 — 나머지는 전부 휴대폰에서 돕니다.' 52 | Out-Null

# ───────────────────────────────────────── 6 구조도 (중간발표 17쪽)
$sl = Page '04 · 구조도' '무엇이 [[어디에]] 있나' $S4 '전체 구조입니다. 왼쪽이 휴대폰, 오른쪽이 서버입니다.\n판단은 휴대폰이 합니다. QR 읽기, 목적지 찾기, 길 만들기, 3D 와 사진 보여 주기, 그리고 AI 가 사진이 어디인지 판단하는 일까지 전부 휴대폰 안에서 합니다.\n서버는 사진을 맡아 둘 뿐입니다. 서버에서 도는 저희 코드는 보안 규칙 130줄이 전부이고, 서버 함수는 없습니다.\n쉽게 말하면, 내비게이션은 서버가 길을 계산해 내려 주기 때문에 끊기면 멈춥니다. 저희는 반대로 휴대폰이 계산하고, 서버는 사진 창고입니다.'
FigPage $sl '중간_구조도.png' '판단은 휴대폰이 합니다.\n서버는 [[사진을 맡아 둘 뿐]]입니다.' '구현' @(
  '**휴대폰** — 바닐라 JS, 묶음 도구 없음. <script> 순서가 곧 적재 순서',
  '**서버** — Firestore 컬렉션 6개. **서버에서 도는 우리 코드는 보안 규칙 130줄이 전부**이고 함수(Cloud Functions)는 없습니다',
  '**오가는 것** — 올릴 때 제보 1건 쓰기, 받을 때 승인 사진 · 바뀐 방 이름 읽기') `
  '**이렇게 나눈 이유**\n① 사진이 **어디인지 가려내려고 밖으로 나가지 않습니다**\n② 서버가 멈춰도, 통신이 끊겨도 **길안내는 그대로 됩니다**' $AC `
  '내비게이션은 **서버가 길을 계산해 내려 줍니다.** 그래서 끊기면 멈춥니다.\n저희는 반대로 — **휴대폰이 계산**하고, 서버는 **사진 창고**입니다.'

# ───────────────────────────────────────── 7 블록도 1 (중간발표 18쪽)
$sl = Page '04 · 블록도 1' '휴대폰 안 — 두 가지 일이 [[따로]] 돕니다' $S4 '휴대폰 안을 들여다보면 두 가지 일이 따로 돕니다. 왼쪽은 길안내, 오른쪽은 사진 판정입니다.\n왼쪽 줄은 QR 을 읽고, 목적지를 찾고, 길을 만들어 한 단계씩 보여 줍니다. 내비게이션에도 다 있는 기능입니다.\n오른쪽 줄이 저희가 새로 만든 것입니다. 사진을 찍으면 흔들림과 밝기를 검사하고, 숫자로 바꿔 미리 외워 둔 것과 대조하고, 1등과 2등의 차이를 잽니다.\n가운데 점선이 중요합니다. 들어온 문으로 층을 알면 후보가 152곳에서 그 층 안으로 줄어듭니다. AI 를 손대지 않고 공짜로 얻는 정답률입니다.'
FigPage $sl '중간_블록도_휴대폰.png' '왼쪽은 [[길안내]],\n오른쪽은 [[사진 판정]]입니다.' '구현' @(
  '**길안내** — guide.js 의 인접 표 네 개로 경로를 만듭니다',
  '**사진 판정** — MobileNet v2 → **1,280차원** → 코사인 유사도. WebGL로, 안 되면 CPU로',
  '**점선** — QR로 확정된 층만 후보로 남깁니다 (152곳 → 한 층)',
  '**★** — 1·2등 **격차**를 재어 자리 / 층 / 모름으로 답합니다') `
  '**점선 하나가 왜 중요한가**\n들어온 층을 알면 후보가 **152곳에서 그 층 안으로** 줄어듭니다. AI를 손대지 않고 **공짜로 얻는 정답률**입니다.' $AC `
  '**왼쪽 줄은 내비게이션에도 다 있는 기능**입니다.\n**오른쪽 줄이 저희가 새로 만든 것** — 올라온 사진이 어디인지 알아보는 일.'

# ───────────────────────────────────────── 8 블록도 2 (중간발표 19쪽)
$sl = Page '04 · 블록도 2' '서버 안 — 받아서, 재워 두고, [[나눠 줍니다]]' $S4 '서버 안입니다. 서버는 계산을 하지 않고 맡아 두는 일만 합니다.\n제보한 사진은 먼저 문지기를 지납니다. 문지기는 Firestore 보안 규칙이라 정해진 칸과 크기가 아니면 쓰기 요청 자체를 거부합니다. 올리는 사람이 자기 사진을 「승인됨」으로 만들 수도 없습니다.\n통과한 제보는 대기함에 들어가고, 관리자 명부에 있는 사람이 보고 승인해야 승인 사진 창고로 옮겨집니다.\n대기함과 창고가 따로인 것이 핵심입니다. 그래서 잘못 찍힌 사진 한 장이 모든 이용자에게 퍼지는 일이 없습니다.'
FigPage $sl '중간_블록도_서버.png' '서버는 계산을 하지 않습니다.\n[[맡아 두는 일]]만 합니다.' '구현 — 「문지기」는 Firestore 보안 규칙' @(
  '**쓰기 요청 자체를 거부**합니다 — 서버 코드가 도는 게 아닙니다',
  '칸 **10개만** · 사진 **950,000자 미만** · 상태는 **「대기」 고정**',
  '→ 올리는 사람이 **자기 사진을 「승인됨」으로 못 만듭니다**',
  '관리자 = 명부에 이름(UID)이 있는 사람만') `
  '**대기함과 창고가 따로인 것이 핵심**\n제보는 창고에 바로 못 들어갑니다 — **잘못 찍힌 한 장이 모두에게 퍼지지 않습니다.**' $AM `
  '내비게이션의 **「이 길 공사 중이에요」 제보**와 같습니다 — 올리면 바로 뜨는 게 아니라 **검수를 거쳐** 반영되지요.'

# ───────────────────────────────────────── 9 휴대폰에 들어가는 것 (중간발표 12쪽)
$sl = Page '04 · 휴대폰에 들어가는 것' '앱을 깐다는 게 [[무엇을 받는 일]]인가' $S4 '앱스토어가 없습니다. 브라우저에서 「홈 화면에 추가」를 누르면, 그때 필요한 것을 통째로 내려받습니다.\n앱 화면과 코드, 안내 사진 169장, 3D 재료까지 249개 파일, 16.5MB 를 처음 한 번 받아 둡니다. 그 뒤로는 비행기 모드에서도 열립니다.\nAI 자료와 라이브러리는 합쳐 30MB 가 넘어서 저장하지 않고, 사진을 판정할 때만 받습니다. 길안내는 오프라인으로 보장하고, 사진 판정은 인터넷이 있을 때만 쓰는 기능으로 나눈 것 — 이것이 설계의 핵심입니다.'
T $sl $M 104 $CW 22 '앱스토어가 없습니다. 브라우저에서 **「홈 화면에 추가」**를 누르면 그때 통째로 내려받습니다 **(PWA)**.' 13 | Out-Null
Tbl $sl $M 136 @(250, 96, 170, 330) @(
  @('무엇이 들어가나', '양', '언제', '왜'),
  @('**앱 화면과 코드**\n~~직접 쓴 코드 31개 + three.js · jsQR · JSZip~~', '249개\n**16.5MB**', '**처음 한 번**\n~~열 때 자동으로~~', '지하 · 계단에서 **통신이 없어도 길안내가 되어야** 하기 때문입니다. 받아 둔 뒤로는 **비행기 모드**에서도 열립니다'),
  @('**안내 사진 169장**\n~~단계마다 보여 주는 실제 사진~~', '', '', ''),
  @('**3D 건물 재료 · 장소 목록**\n~~텍스처 · 좌표표~~', '', '', ''),
  @('**AI 기준 자료**\n~~기준 벡터 5,752개~~', '11.6MB', '**사진을 판정할 때만**\n~~인터넷이 있어야~~', '길안내에는 필요 없고 저장해 두기엔 너무 큽니다 — 그래서 [[AI는 오프라인에서 쉽니다]]'),
  @('**AI 모델 · 라이브러리**\n~~MobileNet · TensorFlow.js · Tesseract~~', '18.6MB', '', '')
) -fs 11.5 -rowH 44 -merge @(@(2,2,4,2), @(2,3,4,3), @(2,4,4,4), @(5,3,6,3), @(5,4,6,4)) -align @{ 2 = 3 } | Out-Null
Strip $sl 418 '**둘로 나눈 것이 설계의 핵심입니다.** 길안내는 **오프라인으로 보장**하고, 사진 판정은 **인터넷이 있을 때만 쓰는 기능**으로 두었습니다.' 50 | Out-Null

# ───────────────────────────────────────── 10 시연 ① (중간발표 8쪽 · 지금 화면으로)
$sl = Page '05 · 핵심 기능 시연 ①' '들어와서 [[길을 받기까지]]' $S5 '이제 실제로 어떻게 동작하는지 보여 드리겠습니다.\n출입문의 QR 을 휴대폰 기본 카메라로 찍으면 앱스토어 없이 바로 앱이 열립니다. 처음 온 사람에게는 쉬운 사용모드를 켤지 묻습니다.\n그다음이 이 앱의 출발점, 「여기가 맞나요?」입니다. 찍은 문의 실제 사진을 보여 주고 맞는지 확인합니다. 저희는 위치를 알아내지 않고 물어봅니다. QR 이 안 읽히면 네 문 가운데서 직접 고르면 됩니다.\n확인하면 무엇을 찾는지 고르고, 호실 번호나 교수님 성함으로 목적지를 찾습니다.'
Phones $sl @(
  @('화면01_초록.jpg', '① 문 QR을 찍는다', '앱스토어 없이 바로 열림'),
  @('화면02_쉬운모드창.jpg', '② 쉬운 사용모드', '처음 온 사람에게 묻기'),
  @('화면03_여기가맞나요.jpg', '③ 출발점을 확인', '사진으로 「여기가 맞나요?」'),
  @('화면05_무엇을찾으세요.jpg', '④ 무엇을 찾나', '강의실 · 화장실 · 비상계단'),
  @('화면06_검색.jpg', '⑤ 목적지를 고른다', '호실 번호 · 교수님 성함으로')
) -h 286 | Out-Null
Strip $sl 444 '**③번이 이 앱의 출발점입니다.** 내 위치를 알아내지 않고 **물어봅니다** — QR이 안 읽히면 네 문 가운데서 직접 고르면 됩니다.' 50 | Out-Null

# ───────────────────────────────────────── 11 시연 ② (중간발표 9쪽 · 지금 화면으로)
$sl = Page '05 · 핵심 기능 시연 ②' '안내를 따라 [[걸어가기]]' $S5 '목적지를 고르면 3D 건물 위에 가는 길이 통째로 보입니다. 걷는 눈높이로 미리 걸어 볼 수도 있습니다.\n길안내를 시작하면 단계마다 그 자리의 실제 사진과 화살표, 한 문장이 나옵니다. 「정문으로 들어오세요」, 「엘리베이터에서 내려서 좌회전 하세요」처럼요.\n눈앞 풍경이 사진과 다르면 잘못 든 것입니다. 측위를 하지 않는 대신 이용자가 스스로 대조하게 했습니다.\n여기까지 다섯 단계는 통신이 없어도 됩니다. 인터넷이 필요한 것은 사진 판정 하나뿐입니다.'
Phones $sl @(
  @('화면07_3D.jpg', '⑥ 길을 통째로 본다', '3D 건물 위에 경로'),
  @('화면09_1인칭.jpg', '⑦ 미리 걸어 본다', '걷는 눈높이 1인칭'),
  @('화면10_단계1.jpg', '⑧ 1/5 단계', '「정문으로 들어오세요」'),
  @('화면12_단계3.jpg', '⑨ 3/5 단계', '「엘리베이터에서 내려서 좌회전」'),
  @('화면13_도착.jpg', '⑩ 도착', '「13524호 · PC실 도착」')
) -h 280 | Out-Null
Strip $sl 436 '**단계마다 그 자리의 실제 사진을 함께 보여 줍니다.** 눈앞 풍경이 사진과 다르면 잘못 든 것 — 측위를 하지 않는 대신 **이용자가 스스로 대조**합니다. **⑥~⑩은 통신이 없어도** 됩니다.' 58 | Out-Null

# ───────────────────────────────────────── 12 기능 1 · 흐름도 1 (중간발표 20쪽)
$sl = Page '05 · 기능 1 · 흐름도' '길안내 — 점선 구간은 [[인터넷 없이]]' $S5 '기능 1, 길안내의 흐름입니다. 앱을 열고, 문 QR 을 찍고, 어느 문 몇 층인지 확정하고, 목적지를 골라 길 단계를 만들고, 도착할 때까지 한 단계씩 보여 줍니다.\n왼쪽 점선 구간 전체가 인터넷 없이 됩니다. 네트워크 호출이 0회입니다. 서비스 워커가 휴대폰에 저장해 둔 것에서 꺼내 줍니다.\n왜 오프라인이어야 했느냐 — 길을 잃는 곳이 하필 지하, 계단, 엘리베이터 안이고, 거기서 앱이 멈추면 있으나 마나이기 때문입니다.\n그래서 처음 열 때 16.5MB 를 받아 두면, 그 뒤로는 비행기 모드로 두어도 152곳까지 안내가 됩니다.'
FigPage $sl '중간_흐름도_길안내.png' '길을 잃는 곳이 하필\n[[전파가 안 닿는 곳]]입니다.' '구현' @(
  '점선 구간의 **네트워크 호출 0회**. 서비스 워커가 Cache Storage에서 내줍니다',
  '저장해 두는 것 — **파일 249개 · 16.5MB** (화면 · 코드 · 사진 169장 · 3D 텍스처)',
  '받은 파일은 목록의 **SHA-256 앞 12자리**와 대조 — 옛 파일이 섞이면 다시 받습니다',
  '경로 계산도 폰에서 합니다. 서버에 길을 물어보지 않습니다') `
  '**왜 오프라인이어야 했나**\n지하 · 계단 · 엘리베이터 안에서 앱이 멈추면 **있으나 마나**입니다. 그래서 필요한 것을 **처음 한 번에 전부 내려받아** 둡니다.' $AC `
  '앱을 처음 열 때 **16.5MB**를 받아 둡니다.\n그 뒤로는 **비행기 모드로 두어도 152곳까지 안내**가 됩니다.'

# ───────────────────────────────────────── 13 기능 2 (중간발표 10쪽 · 지금 앱에 맞게)
$sl = Page '05 · 기능 2' '사진이 실제와 다를 때 — [[여기가 AI의 몫]]입니다' $S5 '기능 2 입니다. 안내 사진이 실제와 다르면, 이용자가 건의함에서 지금 보이는 모습을 찍어 올립니다. 하루 세 번까지 올릴 수 있습니다.\n올리는 순간 휴대폰 안에서 네 가지 일이 일어납니다. 흔들리거나 어두운 사진은 올리기 전에 되돌리고, 사진을 숫자 1,280개로 바꿔 기준 자료와 대조하고, 호실 번호판이 보이면 글자로 읽고, 1등과 2등의 격차로 확신을 잽니다.\n이용자에게는 확신한 만큼만 말합니다. 확신이 크면 「아마 여기예요」, 층만 확실하면 「층은 3층 같아요」, 모르면 「어디인지 알 수 없어요」입니다.\n그래도 확정은 하지 않습니다. 관리자가 확인하고 승인해야 그 자리의 대표 사진이 바뀌고, 그때 모든 사람의 화면이 함께 바뀝니다.'
$pw = 330 * 780 / 1688
Pic $sl '화면17_건의함.jpg' ($M + 8) 104 $pw 330 -round | Out-Null
T $sl ($M - 12) 442 ($pw + 40) 34 '⑪ 건의함에서\n지금 모습을 찍어 올린다' 11 $INK -bold -align 2 -lines 1.25 | Out-Null
$rx = $M + $pw + 36; $rw = $M + $CW - $rx
Card $sl $rx 104 $rw 132 | Out-Null
T $sl ($rx + 18) 116 ($rw - 36) 18 '올리는 순간 폰 안에서 벌어지는 일' 12 $INK -bold | Out-Null
$b = T $sl ($rx + 18) 140 ($rw - 36) 90 ('**흔들림 · 밝기 검사** — 못 쓸 사진은 올리기 전에 되돌립니다\n' + '**숫자 1,280개**로 바꿔 기준 자료와 대조합니다\n' + '**호실 번호판이 보이면 글자로 읽습니다** — 읽히면 모양보다 글자를 믿습니다\n' + '**1·2등 격차**를 재어 자리 / 층 / 모름으로 답을 정합니다') 11.5 $INK2 -lines 1.3 -after 2
Bullets $b
Card $sl $rx 246 $rw 128 | Out-Null
Rect $sl $rx 246 6 128 $AM | Out-Null
T $sl ($rx + 22) 258 ($rw - 40) 18 '**이용자에게는 확신한 만큼만 말합니다**' 12 $INK | Out-Null
$ans = @(@('「아마 여기예요 : 13101호」', '확신이 클 때'), @('「층은 3층 같아요」', '층만 확실할 때'), @('「어디인지 알 수 없어요」', '모를 때'))
$aw = ($rw - 44 - 2 * 10) / 3
for($i = 0; $i -lt 3; $i++){ Chip $sl ($rx + 22 + $i * ($aw + 10)) 284 $aw 42 ('**' + $ans[$i][0] + '**\n~~' + $ans[$i][1] + '~~') $AC2 $INK2 11 | Out-Null }
T $sl ($rx + 22) 338 ($rw - 40) 30 '그래도 **확정은 하지 않습니다** — AI가 짐작한 것은 관리자 화면에 넘어가고, **관리자가 확인해야 반영**됩니다.' 11 $INK2 -lines 1.3 | Out-Null
Rect $sl $rx 384 $rw 66 $BG $LINE 0.75 5.7 -dash | Out-Null
T $sl ($rx + 18) 393 ($rw - 36) 14 '반영되면' 9.5 $AM -bold -spacing 1.5 | Out-Null
T $sl ($rx + 18) 411 ($rw - 36) 34 '그 자리의 대표 사진이 바뀌고, **이 앱을 쓰는 모든 사람의 화면이 함께 바뀝니다.**' 11.5 $INK2 | Out-Null

# ───────────────────────────────────────── 14 기능 2 · 흐름도 2 (중간발표 21쪽)
$sl = Page '05 · 기능 2 · 흐름도' '사진 갱신 — 사진이 밖으로 나가는 건 [[한 번뿐]]' $S5 '기능 2 의 흐름입니다. 이 흐름이 이 작품의 핵심이고, 문제점에서 던진 질문 — 올라온 사진이 어디인지 누가 판단하느냐 — 의 답입니다.\n위쪽 괄호가 휴대폰 안, 아래쪽 괄호가 서버입니다. 사진을 찍고, 검사하고, 숫자로 바꿔 대조하고, 1등과 2등의 차이만큼만 답하는 데까지 전부 휴대폰 안에서 끝납니다.\n어디인지 알아보려고 사진을 서버로 보낼 필요가 없습니다. 사진이 밖으로 나가는 때는 제보를 제출할 때 한 번뿐입니다.\n그래도 확정은 사람이 합니다. 기계는 후보를 좁혀 주는 데까지입니다.'
FigPage $sl '중간_흐름도_사진갱신.png' '이 흐름이 이 작품의 핵심입니다.\n[[문제점에서 던진 질문]]의 답입니다.' '구현' @(
  '판정은 전부 폰 안(sugai.js)에서 끝납니다 — 사진을 판정하러 보내지 않습니다',
  '흔들림 · 밝기 검사를 먼저 해 **못 쓸 사진은 올리기 전에 되돌립니다**',
  '올리는 것은 사진 한 건 · 상한 950,000자 · **하루 3번까지**',
  '관리자가 승인해야 **승인 사진 창고**로 옮겨지고, 그때부터 다른 폰이 받아 갑니다') `
  '**판정이 휴대폰 안에서 끝나는 이유**\n어디인지 알아보려고 사진을 서버에 보낼 필요가 없습니다. 사진이 나가는 때는 **제보를 제출할 때 한 번**뿐입니다.' $AC `
  '찍은 사람이 **「여기가 어디인지」 입력하지 않아도** 앱이 먼저 읽어 봅니다.\n그래도 확정은 **사람이 합니다** — 기계는 **후보를 좁혀 주는 데까지**.'

# ───────────────────────────────────────── 15 기능 2 · 증거 (중간발표 24쪽)
$sl = Page '05 · 기능 2 · 증거' '왜 틀리는지 [[눈으로 보십시오]]' $S5 'AI 가 어디서 틀리는지 직접 보시겠습니다.\n왼쪽 두 장은 3층과 4층 엘리베이터 안입니다. 사람 눈으로도 구분이 안 됩니다. 다른 것은 문 위 표시기의 작은 숫자 3 과 4 하나뿐인데, 사진을 224 곱하기 224 로 줄이면 그 숫자가 뭉개집니다. 그래서 모양으로는 자리 0% 입니다.\n오른쪽 지하 홀처럼 건물에 하나뿐인 곳은 89.7% 맞힙니다.\n그래서 글자 읽기를 모양 판정보다 앞에 두었고, 엘리베이터 안에서는 97% 적중합니다.'
$ev = @(@('중간_증거1_엘리3층.jpg', 95, 187, 250, '엘리베이터 안 — 3층', '자리 0%', $RD),
        @('중간_증거2_엘리4층.jpg', 386, 187, 250, '엘리베이터 안 — 4층', '자리 0%', $RD),
        @('중간_증거3_지하홀.jpg', 633, 270, 202, '지하 홀 — 건물에 하나뿐', '자리 89.7%', $INK))
foreach($e in $ev){
  PicCover $sl $e[0] $e[1] 104 $e[2] $e[3] | Out-Null
  T $sl $e[1] (104 + $e[3] + 10) $e[2] 16 $e[4] 11 $INK -bold -align 2 | Out-Null
  T $sl $e[1] (104 + $e[3] + 28) $e[2] 22 $e[5] 16 $e[6] -bold -align 2 | Out-Null
}
Strip $sl 420 '**왼쪽 두 장은 사람 눈으로도 구분이 안 됩니다.** 다른 것은 문 위의 작은 숫자 **3 / 4** 뿐 — 사진을 224×224로 줄이면 그 숫자가 뭉개집니다.\n**그래서 글자 읽기를 모양 판정보다 앞에 두었고, 엘리베이터 안에서는 97% 적중합니다.**' 64 $RD 12 | Out-Null

# ───────────────────────────────────────── 16 기능 2 · 재는 자 (중간발표 26쪽)
$sl = Page '05 · 기능 2 · 결과' '재는 [[「자」]]를 바꿨습니다' $S5 '그렇다면 언제 답해도 되는지는 어떻게 알까요.\n점수가 높다고 맞는 게 아니었습니다. 「1등 90점」이어도 2등이 89점이면 사실은 헷갈리는 것입니다. 그래서 1등 점수가 아니라 1등이 2등을 얼마나 크게 이겼는지로 확신을 쟀습니다.\n가로축은 얼마나 자주 답하느냐, 세로축은 정확한 자리를 맞힌 비율입니다. 전부 답하면 두 방법 모두 55.6% 입니다. 확신이 큰 상위 10% 만 답하면, 보통 방법은 64.7%, 저희 방법은 92.9% 입니다.\n같은 AI, 같은 사진, 같은 계산량입니다. 고르는 기준만 바꿔서 28.2%p 가 올랐습니다.'
T $sl $M 104 $CW 22 '점수가 높다고 맞는 게 아니었습니다. **1등이 2등을 얼마나 크게 이겼는지**를 봐야 했습니다.' 13 | Out-Null
Pic $sl '중간_격차그래프.png' 122 146 738 0 '' | Out-Null
Strip $sl 426 '**「1등 90점」도 2등이 89점이면 사실은 헷갈리는 것입니다.** AI도 사진도 계산량도 그대로 두고 **고르는 기준만** 바꿨습니다.' 50 | Out-Null

# ───────────────────────────────────────── 17 변화 (중간발표 28쪽)
$sl = Page '06 · 우리가 만든 변화' '무엇을 했고, [[무엇이 나왔나]]' $S6 '지금까지 한 일과 그 결과를 한 장으로 정리했습니다.\n위치를 재는 대신 출입문에 QR 네 장을 붙여서, 장치도 공사도 없이 출발점이 정해집니다. 필요한 것을 처음 한 번에 받아 두어 지하와 계단, 비행기 모드에서도 152곳까지 안내합니다. 지도 대신 직접 찍은 사진 169장으로 안내합니다.\n사진 판정은 휴대폰 안에서 끝나 사진이 밖으로 나가지 않고, 1·2등 격차로 확신을 재서 상위 10% 에서 92.9% 를 맞힙니다. 글자를 먼저 읽어 엘리베이터 안에서는 97%, 틀린 층을 말한 적은 0건입니다.\n한 줄로 줄이면, 저희가 한 것은 정확도를 올린 것이 아니라 답해도 되는 것을 골라내게 만든 것입니다.'
Tbl $sl $M 104 @(398, 448) @(
  @('한 일', '나온 결과'),
  @('위치를 재는 대신 **출입문에 QR 네 장**을 붙였다', '장치도 공사도 없이 출발점이 정해집니다 — **설치비 0원**'),
  @('필요한 것을 **처음 한 번에 통째로** 내려받게 했다', '지하 · 계단 · 비행기 모드에서도 **152곳까지 안내**'),
  @('지도 대신 **그 자리의 실제 사진**으로 안내하기로 했다', '단계마다 **직접 찍은 사진 169장**을 3D · 1인칭과 함께'),
  @('사진 판정을 **휴대폰 안에서** 끝냈다', '**사진이 밖으로 나가지 않습니다** — 서버 비용도 0원'),
  @('확신을 1등 점수가 아니라 **1·2등 격차**로 재게 했다', '상위 10%에서 자리 **92.9%** — 점수로 고르면 64.7% (**+28.2%p**)'),
  @('**글자 읽기**를 모양 판정보다 앞에 두었다', '엘리베이터 안 **97%** 적중, **틀린 층을 말한 적 0건**'),
  @('제보가 **사람 승인 전에는** 창고에 못 들어가게 했다', '잘못 찍힌 사진 한 장이 **모든 이용자에게 퍼지지 않습니다**'),
  @('처음 온 사람을 위해 **쉬운 사용모드 · 영어 안내**를 넣었다', '**누를 곳을 하나씩** 짚어 주고, **English** 한 번이면 전체가 영어로')
) -hi @(5) -fs 11.5 -rowH 31 | Out-Null
Strip $sl 404 '**한 줄로 줄이면** — 저희가 한 것은 **정확도를 올린 것이 아니라, 답해도 되는 것을 골라내게 만든 것**입니다.' 48 | Out-Null

# ───────────────────────────────────────── 18 발전 방향 (중간발표 15쪽)
$sl = Page '07 · 향후 발전 방향' '앱으로 만든다면 [[무엇이 더 깔릴까]]' $S7 '다음 단계입니다. 지금은 웹앱이라 브라우저가 앱을 맡아 둡니다. 스토어 앱으로 감싸면 깔리는 것이 이렇게 달라집니다.\n지금은 AI 자료와 라이브러리를 받아 두지 않아서, 사진 판정만은 인터넷이 있어야 합니다. 앱으로 만들면 이것까지 설치 파일에 같이 넣을 수 있어 사진 판정도 인터넷 없이 됩니다. 설치 크기는 47MB 안팎입니다.\n지금 웹앱인 것은 못 해서가 아니라 첫 번째 조건, 돈 0원 때문입니다. 애플 스토어는 매년 99달러가 듭니다.\n화면을 새로 만들 필요는 없습니다. 지금 코드를 그대로 감싸면 되고, 그 순간 「AI 가 오프라인에서 쉰다」는 한계가 없어집니다.'
T $sl $M 104 $CW 22 '지금은 브라우저가 맡아 둡니다. **스토어 앱(APK · IPA)으로 감싸면** 깔리는 것이 이렇게 달라집니다.' 13 | Out-Null
Tbl $sl $M 136 @(253, 119, 220, 254) @(
  @('무엇이', '크기', '지금 — 웹앱(PWA)', '앱으로 만들면'),
  @('**앱 화면 · 코드 · 안내 사진 · 3D**', '16.5MB', '처음 열 때 **받아 둔다**', '**설치 파일 안에 들어간다** — 받을 것이 없다'),
  @('**AI 기준 자료**  ~~기준 벡터 5,752개~~', '11.6MB', '**안 받는다** — 쓸 때만 내려받음', '**같이 깔 수 있다 → 사진 판정도 인터넷 없이** 됩니다'),
  @('**AI 모델 · 라이브러리**  ~~MobileNet · TensorFlow.js · Tesseract~~', '18.6MB', '**안 받는다** — 쓸 때만 내려받음', ''),
  @('**설치 크기 어림**', '', '**16.5MB**  ~~(브라우저 칸)~~', '**47MB 안팎**  ~~(앱 전용 폴더)~~'),
  @('지워질 걱정', '', '공간이 모자라면 **지워질 수 있다**', '**지워지지 않는다**'),
  @('찾는 법 · 드는 돈', '', 'QR · 주소를 알아야 · **0원**', '스토어에서 검색됨 · [[애플 연 99달러]]')
) -hi @(2, 3) -fs 11.5 -rowH 36 -merge @(@(3,4,4,4), @(5,1,5,2), @(6,1,6,2), @(7,1,7,2)) -align @{ 2 = 3 } | Out-Null
Strip $sl 404 '**지금 PWA인 것은 못 해서가 아니라 조건 ①(돈 0원) 때문입니다.** 화면을 새로 만들 필요는 없습니다 — **지금 코드를 그대로 감싸면** 됩니다.\n바꾸는 순간 얻는 가장 큰 것은 **「AI가 오프라인에서 쉰다」는 한계가 없어지는 것**입니다.' 60 $AM 12 | Out-Null

# ───────────────────────────────────────── 19 마무리 (중간발표 30쪽)
$script:pg++
$sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl $AC
T $sl 0 116 $W 16 '마 무 리 하 며' 10 'B9BBBE' -bold -align 2 -spacing 4 | Out-Null
T $sl 0 144 $W 110 '틀릴 걸 알면서 답하는 AI는,\n[[쓸 수가 없습니다.]]' 36 'FFFFFF' -bold -align 2 -lines 1.2 -accent $MINT -boldColor 'FFFFFF' | Out-Null
T $sl 0 300 $W 80 '그래서 저희는 정확도를 올리는 대신, **「모르겠다」고 말하는 법**을 가르쳤습니다.\n전부 답하면 **55.6%** · 답할 것만 골라 답하면 **92.9%** — 같은 AI, 같은 사진, 같은 계산입니다.\n바꾼 것은 **답할지 말지를 정하는 기준 하나**뿐입니다.' 13 'D5D7DA' -align 2 -lines 1.75 -boldColor 'FFFFFF' | Out-Null
T $sl 0 414 $W 50 '이 앱이 할 줄 아는 가장 중요한 말은\n「여기가 어디인지 모르겠습니다」입니다.' 15 'FFFFFF' -bold -align 2 -lines 1.4 | Out-Null
Foot $sl '공대 3호관 길안내 · 김민종 · 손의윤 · 문성일' -dark
Notes $sl '마무리하겠습니다. 틀릴 걸 알면서 답하는 AI 는 쓸 수가 없습니다.\n그래서 저희는 정확도를 올리는 대신, 「모르겠다」고 말하는 법을 가르쳤습니다. 전부 답하면 55.6%, 답할 것만 골라 답하면 92.9% — 같은 AI, 같은 사진, 같은 계산입니다. 바꾼 것은 답할지 말지를 정하는 기준 하나뿐입니다.\n이 앱이 할 줄 아는 가장 중요한 말은 「여기가 어디인지 모르겠습니다」입니다.'

# ───────────────────────────────────────── 20 Q&A
$script:pg++
$sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl $AC
T $sl $M 150 600 80 'Q [[&]] A' 60 'FFFFFF' -bold -accent $MINT -boldColor 'FFFFFF' | Out-Null
T $sl $M 236 600 24 '질의응답 — 들어 주셔서 감사합니다' 16 'D5D7DA' | Out-Null
Rect $sl $M 280 113 5 $MINT | Out-Null
T $sl $M 304 600 40 '**공대 3호관 길안내** · 팀 공3길\n김민종 · 손의윤 · 문성일   |   지도교수 강규창 교수님' 12 'A4A7AB' -lines 1.6 -boldColor 'E2E3E5' | Out-Null
Rect $sl 690 86 214 348 'FFFFFF' '' 0 8 | Out-Null
T $sl 690 100 214 18 '지금 바로 써 보기' 12 $AC -bold -align 2 | Out-Null
Pic $sl 'QR_정문.png' 707 124 180 0 '' | Out-Null
T $sl 690 406 214 16 'minjong0910.github.io' 10.5 $AC -bold -align 2 | Out-Null
Foot $sl '공대 3호관 길안내 · 김민종 · 손의윤 · 문성일' -dark
Notes $sl '들어 주셔서 감사합니다. 오른쪽 QR 을 지금 휴대폰 카메라로 찍으시면 바로 써 보실 수 있습니다.\n질문 받겠습니다.'

# ══ 저장 ══════════════════════════════════════════════════════
if($pres.Slides.Count -ne 20){ throw ('쪽 수가 20 이 아닙니다 : ' + $pres.Slides.Count) }
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
