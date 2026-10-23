# 졸업작품 발표 Step 2(해결형) — 중간발표(교수님께 칭찬받은 자료)의 흐름과 모양으로 PowerPoint 파일을 만든다
#
#   2026-10-23 사용자 : 「조원들과 투표해서 졸업작품 발표는 Step 2 로 하기로 했다.
#                       중간발표 자료가 교수님께 칭찬을 들어서 Step 2 도 저런 흐름으로 만들고 싶다」 · 발표 20~25분
#   · 순서는 교수님 스토리라인 예시 Type 2(문제 해결 과정 이야기) 그대로 —
#       표지 · 들어가며 · 문제점 · 해결 아이디어 · 설계 및 구현 · 핵심 기능 시연(+기능 1 · 기능 2) · 변화 · 발전 방향 · 마무리 · Q&A
#   · 흐름과 모양은 중간발표(도구\발표_캡스톤_틀.html) — 차례 표 + 「오늘 한 가지만」 · 01~05 간지 · 쪽마다 한 줄 결론 상자 ·
#     ○△× 비교표 · 단계 흐름 · 사람 카드 · 한 장 요약. 색 : 먹색 #1E2227 + 호박색 #E8A664 / #B4530F, 글꼴 맑은 고딕
#   · 발표자 나눔은 아직 안 정해져 쪽에 적지 않는다(정해지면 노트나 간지에)
#
#   PowerPoint(COM)로 직접 그린다 — 글자 · 표 · 도형이 전부 고칠 수 있는 PowerPoint 개체다. 쪽마다 발표 노트(대본)를 넣는다.
#   그림은 도구\발표그림\ppt\ (본 서버를 아이폰 크기 390×844 로 찍은 화면 · 장소 사진 · 정문 QR)
#   사용법 : pwsh -File 도구\발표PPT_Step2_만들기.ps1      → 생성물\발표\ 에 .pptx 와 .pdf
param([string]$OutDir = '', [switch]$Desktop)
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$IMG  = Join-Path $PSScriptRoot '발표그림\ppt'
if(-not $OutDir){ $OutDir = Join-Path $ROOT '생성물\발표' }
New-Item -ItemType Directory -Force $OutDir | Out-Null
$NAME = '캡스톤 발표 Step 2 (중간발표 흐름)'
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

# ══ PowerPoint 열기 ══════════════════════════════════════════
$app = New-Object -ComObject PowerPoint.Application
$pres = $app.Presentations.Add(0)
$pres.PageSetup.SlideWidth = $W; $pres.PageSetup.SlideHeight = $H
try{
# ───────────────────────────────────────── 1 표지
$script:pg++
$sl = $pres.Slides.Add(1, 12); Bg $sl $AC
T $sl 68 120 560 16 '군산대학교 공과대학 · 졸업작품 발표' 11 'B9BBBE' -spacing 5 | Out-Null
T $sl 68 150 600 64 '공대 3호관 길안내' 46 'FFFFFF' -bold -lines 1.05 | Out-Null
T $sl 68 222 600 66 '건물 안에서 길을 잃는 문제를 해결하기 위한\n[[새로운 제안]]' 19 'E2E3E5' -lines 1.4 -accent $MINT | Out-Null
Rect $sl 68 304 113 5 $MINT | Out-Null
T $sl 68 330 560 40 '**팀 공3길**    김민종 · 손의윤 · 문성일\n**지도교수**    강규창 교수님' 12 'A4A7AB' -lines 1.75 -boldColor 'E2E3E5' | Out-Null
Pic $sl '화면07_3D.jpg' 700 60 0 420 '44484D' -round | Out-Null
Foot $sl '공대 3호관 길안내 · 팀 공3길' -dark
Notes $sl '안녕하십니까, 팀 공3길입니다. 저희 졸업작품은 「공대 3호관 길안내」입니다.\n건물 앞까지는 지도 앱이 데려다주지만, 건물 안에 들어서는 순간부터는 아무도 길을 알려 주지 않습니다. 저희는 그 문제를 어떻게 풀었는지 이야기하겠습니다.'

# ───────────────────────────────────────── 2 차례
$sl = Page '차 례' '다섯 차례로 [[말씀드립니다]]' '공대 3호관 길안내' '오늘 발표는 다섯 차례입니다. 표의 오른쪽 한 줄이 각 차례의 결론입니다.\n그리고 오늘 한 가지만 기억해 주신다면 — 이 앱은 내 위치를 알아내지 않습니다. 「어느 문으로 들어오셨나요?」라고 묻습니다.'
Tbl $sl $M 108 @(62, 236, 58, 490) @(
  @('차례', '무엇을', '쪽', '한 줄'),
  @('**첫째**', '**혹시 이런 불편함, 겪어 보셨나요**', '3~6', '길안내는 **건물 앞에서 멈춥니다** — 지금 있는 방법으로는 풀리지 않았습니다'),
  @('**둘째**', '**우리의 해결 아이디어**', '7~9', '위치를 재지 말고 **묻는다 · 담아 둔다 · 함께 고친다**'),
  @('**셋째**', '**솔루션 설계 및 구현**', '10~13', '계산은 **전부 휴대폰 안에서**, 서버는 사진을 맡아 둘 뿐입니다'),
  @('**넷째**', '**핵심 기능 시연**', '14~20', 'QR 한 장으로 출발점 · 사진으로 한 단계씩 · **모르면 모른다고 하는 AI**'),
  @('**다섯째**', '**우리가 만든 변화와 다음 단계**', '21~26', '장치 0대 · 0원 · 비행기 모드에서도 — 그리고 다음 단계')
) -fs 12 -rowH 38 -align @{ 1 = 2; 3 = 2 } | Out-Null
Strip $sl 378 '**오늘 한 가지만 기억하신다면** — 이 앱은 내 위치를 알아내지 않습니다. **「어느 문으로 들어오셨나요?」라고 묻고**, 그다음은 그 자리의 **실제 사진**으로 안내합니다.' 60 $AC 13.5 | Out-Null

# ───────────────────────────────────────── 3 간지 01
Part '01' '첫 째  차 례' '혹시 이런 불편함,\n[[겪어 보셨나요?]]' '길안내 앱은 건물 앞까지 데려다줍니다.\n문을 열고 들어선 그 순간부터는 — **혼자입니다.**' '첫째 차례입니다. 저희가 어떤 불편함에서 시작했는지부터 말씀드리겠습니다.' | Out-Null

# ───────────────────────────────────────── 4 들어가며
$sl = Page '01 · 들어가며' '수업 5분 전, [[처음 가 보는 강의실]]' '01 · 혹시 이런 불편함, 겪어 보셨나요' '수업 5분 전, 처음 가 보는 강의실을 찾는다고 생각해 보십시오.\n엘리베이터 문이 열렸는데 왼쪽인지 오른쪽인지 모르고, 복도에 들어서도 그 끝에 강의실이 있는지 모릅니다. 벽에 안내도가 있어도 내가 찾는 호실은 안 보입니다.\n지도 앱은 건물 앞에서 끝나고, 그다음은 지나가는 사람에게 묻는 수밖에 없습니다.'
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

# ───────────────────────────────────────── 5 문제점
$sl = Page '01 · 우리가 발견한 문제점' '길안내는 [[건물 앞에서]] 멈춥니다' '01 · 혹시 이런 불편함, 겪어 보셨나요' '왜 건물 안에서는 길안내가 멈출까요. 이유는 세 가지입니다.\n첫째, GPS 는 건물 안에서 층도 방향도 모릅니다. 실내 측위 장치는 수십 대와 공사가 필요한데 학생은 설치 허가를 받을 수 없습니다.\n둘째, 길을 잃는 곳은 하필 지하, 계단, 엘리베이터 안이라 인터넷이 필요한 앱은 거기서 멈춥니다.\n셋째, 공간이 바뀌면 사진도 안내도도 틀려지는데, 다시 찍고 정리할 사람이 없습니다. 저희는 이 셋째가 가장 아프다고 봤습니다.'
$pains = @(
  @('PAIN POINT 1', '내 위치를 모른다', '**GPS는 건물 안에서** 층도 방향도 모릅니다. 비콘 · Wi-Fi 측위는 장치 수십 대와 공사가 필요한데, 학생은 **설치 허가를 받을 수 없습니다.**', '기존 방식 — 지도 앱 · 실내 측위 장치', $false),
  @('PAIN POINT 2', '헤매는 곳은 신호가 없다', '길을 잃는 곳은 하필 **지하 · 계단 · 엘리베이터 안**입니다. 인터넷이 있어야 도는 앱은 **정작 거기서 멈춥니다.**', '기존 방식 — 온라인 지도 · 웹 안내 페이지', $false),
  @('PAIN POINT 3', '안내는 금방 낡는다', '게시판 · 가구 · 공사로 공간이 바뀌면 **사진도 안내도도 틀려집니다.** 다시 찍고 분류해야 하는데, **그 일을 할 사람이 없습니다.**', '기존 방식 — 벽의 층 안내도 · 사진 안내', $true))
for($i = 0; $i -lt 3; $i++){
  $xx = $M + $i * ($cw3 + 22); $p = $pains[$i]
  $fill = $(if($p[4]){ 'FDF5EE' } else { $CARD }); $ln = $(if($p[4]){ 'E0B48C' } else { $LINE })
  Card $sl $xx 106 $cw3 290 $fill $ln | Out-Null
  T $sl ($xx + 20) 124 ($cw3 - 40) 14 $p[0] 9.5 $(if($p[4]){ $AM } else { $DIM }) -bold -spacing 2 | Out-Null
  T $sl ($xx + 20) 144 ($cw3 - 40) 28 $p[1] 17 $(if($p[4]){ $AM } else { $INK }) -bold | Out-Null
  T $sl ($xx + 20) 186 ($cw3 - 40) 150 $p[2] 12.5 $INK2 -lines 1.5 | Out-Null
  Line $sl ($xx + 20) 352 ($xx + $cw3 - 20) 352 $LINE2 0.75 -dash | Out-Null
  T $sl ($xx + 20) 362 ($cw3 - 40) 16 $p[3] 9.5 $DIM | Out-Null
}
Strip $sl 414 '**가장 아픈 곳은 PAIN POINT 3** — 만드는 것보다 **계속 맞게 유지하는 것**이 어렵습니다. 학생이 만든 앱은 **만든 사람이 졸업하면** 멈춥니다.' 52 $AM | Out-Null

# ───────────────────────────────────────── 6 기존 방식의 한계 (○△× 비교표)
$sl = Page '01 · 기존 방식의 한계' '지금 있는 방법으로는 [[풀리지 않았습니다]]' '01 · 혹시 이런 불편함, 겪어 보셨나요' '그렇다면 지금 있는 방법들로는 왜 안 될까요. 네 가지 기준으로 하나씩 따져 봤습니다.\n지도 앱은 건물 안에서 층과 방향을 모르고, 인터넷이 있어야 합니다. 실내 측위 장치는 위치를 잴 수 있지만 장치 수십 대와 공사 허가가 필요합니다.\n벽 안내도는 내 위치와 가는 길을 알려 주지 않고, 공간이 바뀌면 다시 만들어 붙여야 합니다. 사람에게 묻는 것이 가장 확실하지만, 아는 사람이 없으면 거기서 끝입니다.\n네 칸을 다 채우는 방법이 없었습니다. 그래서 저희는 조건 네 가지를 먼저 걸고 직접 만들기로 했습니다.'
T $sl $M 104 $CW 22 '건물 안에서 길을 찾는 방법은 이미 여럿 있습니다. **네 가지 기준**으로 하나씩 따져 봤습니다.' 13 | Out-Null
Tbl $sl $M 134 @(196, 162, 162, 162, 164) @(
  @('방법', '건물 안에서 길안내', '신호 없는 곳에서', '바뀌면 다시 맞추기', '비용 · 설치'),
  @('**지도 앱**\n~~GPS · 온라인 지도~~', '{{×}}  ~~층 · 방향을 모름~~', '{{×}}  ~~인터넷이 있어야~~', '[[△]]  ~~실내는 안 고쳐 줌~~', '**○**  ~~무료~~'),
  @('**실내 측위 장치**\n~~비콘 · Wi-Fi~~', '**○**  ~~위치를 잼~~', '[[△]]  ~~장치가 살아 있어야~~', '[[△]]  ~~장치 관리가 필요~~', '{{×}}  ~~수십 대 · 공사 허가~~'),
  @('**벽 안내도**\n~~층마다 붙은 평면도~~', '[[△]]  ~~그 앞에서만 보임~~', '**○**  ~~종이라 상관없음~~', '{{×}}  ~~다시 만들어 붙여야~~', '[[△]]  ~~제작 · 교체 비용~~'),
  @('**사람에게 묻기**\n~~지나가는 학생 · 경비실~~', '[[△]]  ~~아는 사람이 있어야~~', '**○**', '**○**', '**○**'),
  @('[[공대 3호관 길안내]]', '**○**  ~~들어온 문 · 사진 대조~~', '**○**  ~~비행기 모드에서도~~', '**○**  ~~이용자가 찍어 고침~~', '**○**  ~~0원 · 장치 0대~~')
) -hi @(5) -fs 13 -rowH 46 | Out-Null
Strip $sl 418 '**네 칸을 다 채우는 방법이 없었습니다.** 그래서 만들기 전에 **조건 네 가지**를 먼저 걸고, 직접 만들기로 했습니다.' 50 | Out-Null

# ───────────────────────────────────────── 7 간지 02
Part '02' '둘 째  차 례' '그래서 우리는\n[[이렇게 생각했습니다]]' '위치를 알아내려 애쓰지 않았습니다.\n대신 **묻고, 담아 두고, 함께 고치기로** 했습니다.' '둘째 차례, 저희의 해결 아이디어입니다.' | Out-Null

# ───────────────────────────────────────── 8 해결 아이디어
$sl = Page '02 · 우리의 해결 아이디어' '[[묻는다 · 담아 둔다 · 함께 고친다]]' '02 · 우리의 해결 아이디어' '세 가지 문제에 세 가지로 답했습니다.\n내 위치를 모르니, 재지 말고 묻습니다 — 어느 문으로 들어왔는지. 출입문 네 곳에 QR 한 장씩을 붙였습니다.\n신호가 없으니, 처음 한 번 휴대폰에 통째로 담아 둡니다 — 설치형 웹앱이라 비행기 모드에서도 안내합니다.\n안내가 낡으니, 지나가는 이용자가 찍어 올리고 어디 사진인지는 AI 가 가립니다. 단 AI 는 확신할 때만 답하고, 반영은 사람이 승인합니다.'
$ideas = @(
  @('PAIN 1 · 내 위치를 모른다', '묻는다', '위치를 **재지 말고**,\n어느 문으로 들어왔는지 **묻자**', '→ 출입문 4곳에 **QR 스티커** 한 장씩', $AC),
  @('PAIN 2 · 신호가 없다', '담아 둔다', '필요한 것을 처음 한 번에\n**휴대폰에 통째로** 담아 두자', '→ **설치형 웹앱(PWA)** — 비행기 모드에서도 안내', $AC),
  @('PAIN 3 · 안내가 낡는다', '함께 고친다', '낡은 사진은 **지나가는 이용자**가 찍어 올리고,\n어디 사진인지는 **AI**가 가리자', '→ 단, AI는 **확신할 때만** 답하고 **사람이 승인**', $AM))
for($i = 0; $i -lt 3; $i++){
  $xx = $M + $i * ($cw3 + 22); $d = $ideas[$i]
  Card $sl $xx 104 $cw3 300 $(if($i -eq 2){ 'FDF5EE' } else { $CARD }) $(if($i -eq 2){ 'E0B48C' } else { $LINE }) | Out-Null
  Rect $sl $xx 104 $cw3 6 $d[4] | Out-Null
  T $sl ($xx + 20) 126 ($cw3 - 40) 14 $d[0] 9.5 $DIM -bold -spacing 1 | Out-Null
  T $sl ($xx + 20) 148 ($cw3 - 40) 44 $d[1] 30 $d[4] -bold | Out-Null
  T $sl ($xx + 20) 206 ($cw3 - 40) 90 $d[2] 13 $INK2 -lines 1.5 | Out-Null
  Chip $sl ($xx + 16) 340 ($cw3 - 32) 46 $d[3] $(if($i -eq 2){ 'FFFFFF' } else { $AC2 }) $INK2 10.5 -align 1 | Out-Null
}
Strip $sl 424 '**한 문장으로** — 건물에 장치를 다는 대신, **모두가 이미 들고 있는 휴대폰**으로 길을 안내합니다.' 46 | Out-Null

# ───────────────────────────────────────── 9 조건이 선택을 정했다
$sl = Page '02 · 선택' '조건이 [[선택을 정했습니다]]' '02 · 우리의 해결 아이디어' '이 아이디어들은 저희가 특별히 창의적이어서 나온 것이 아닙니다. 만들기 전에 조건 네 가지를 먼저 걸었습니다. 표의 왼쪽 칸입니다.\n저희가 졸업하면 요금 낼 사람이 없으니 돈은 0원, 학생은 공사 허가를 받을 수 없으니 공사도 0, 길을 잃는 곳이 하필 지하와 계단이니 통신이 없어도 돼야 하고, 사람 손이 계속 가는 것은 1년을 못 가니 손이 안 가야 합니다. 그 조건을 지키려니 길이 하나뿐이었습니다.\n표의 오른쪽 칸, 「치른 대가」를 봐 주십시오. 공짜로 얻은 것은 없습니다. 예를 들어 QR 은 출발점만 알 뿐, 걸어가는 동안의 위치는 모릅니다. 그 빈자리를 실제 사진으로 채웠습니다.\n그리고 네 번째 줄, 이용자가 찍어 올린 사진을 누가 가리느냐는 실제로 풀어야 할 문제로 남았습니다. 넷째 차례의 기능 2 에서 보여 드립니다.'
T $sl $M 104 $CW 22 '만들기 전에 **조건 네 가지**를 먼저 걸었습니다(왼쪽 칸). **그 조건을 지키려니 길이 하나뿐이었습니다.**' 13 | Out-Null
Tbl $sl $M 136 @(120, 220, 250, 256) @(
  @('조건', '보통 하는 법', '저희가 고른 것', '치른 대가'),
  @('**① 돈 0원**', '서버에서 계산해 내려 준다', '**휴대폰이 직접 계산**\n~~GitHub Pages + Firestore 무료 한도~~', '폰이 느리면 그만큼 느립니다'),
  @('**② 공사 0**', 'Wi-Fi · 비콘을 수십 개 단다', '**출입문에 QR 네 장**\n~~스티커 한 장이 전부~~', '{{걸어가는 동안의 위치는 모릅니다}} — 출발점만 압니다'),
  @('**③ 통신 0**', '필요할 때마다 서버에서 받는다', '**처음에 16.5MB를 통째로**\n~~서비스 워커가 폰에 저장~~', '처음 받을 때 한 번 시간이 걸립니다'),
  @('**④ 손 안 가게**', '관리자가 주기적으로 사진을 다시 찍는다', '**이용자가 찍어 올리게**\n~~AI가 짐작 · 관리자가 승인~~', '**AI가 틀릴 수 있습니다** — 그래서 확신할 때만 답합니다')
) -hi @(4) -fs 11.5 -rowH 52 | Out-Null
Strip $sl 418 '앞의 세 줄은 기술 선택으로 풀렸습니다. **네 번째 줄은 실제로 풀어야 할 문제**로 남았습니다 — 기능 2에서 보여 드립니다.' 46 | Out-Null

# ───────────────────────────────────────── 10 간지 03
Part '03' '셋 째  차 례' '솔루션 [[설계 및 구현]]' '무엇으로 만들었고, 휴대폰에 무엇이 들어가며,\n그것이 어떤 구조로 돌아가는지.' '셋째 차례, 설계와 구현입니다.' | Out-Null

# ───────────────────────────────────────── 11 전체 구조
$sl = Page '03 · 전체 구조' '판단은 [[휴대폰이]], 서버는 맡아 둘 뿐' '03 · 솔루션 설계 및 구현' '전체 구조입니다. 왼쪽 큰 상자가 이용자 휴대폰, 오른쪽이 서버와 배포입니다.\n길 찾기, 3D, 사진 판정까지 계산은 전부 휴대폰 안에서 합니다. 서버는 이용자가 올린 제보 사진을 맡아 두고, 관리자가 승인한 사진을 나눠 줄 뿐입니다.\n그래서 서버가 멈추거나 통신이 끊겨도 길안내는 그대로 됩니다. 저희가 직접 쓴 앱 코드는 31개 파일, 약 2만 4천 줄이고, 서버에 올라간 저희 코드는 보안 규칙 130줄이 전부입니다. 서버와 배포 비용은 0원입니다.'
Card $sl $M 104 520 284 | Out-Null
T $sl ($M + 18) 116 480 18 '**이용자 휴대폰**  ~~설치형 웹앱(PWA) — 계산은 전부 여기서~~' 13 $INK | Out-Null
$grp = @(
  @('길안내', 150, @('출입문 QR 읽기', '목적지 찾기 · 초성', '길 만들기'), @('3D · 층 상세 · 1인칭', '실제 사진 단계')),
  @('사진 제보', 240, @('흔들림 · 밝기 검사', '번호판 글자 읽기', '모양 비교 · 1·2등 격차'), @()),
  @('저장', 312, @('서비스 워커 — 249개 · 16.5MB'), @()))
foreach($gr in $grp){
  T $sl ($M + 18) ($gr[1] + 4) 70 16 $gr[0] 10.5 $AM -bold | Out-Null
  $cx = $M + 92
  foreach($chip in $gr[2]){ $cwid = [Math]::Max(110, $chip.Length * 9.6 + 20); Chip $sl $cx $gr[1] $cwid 26 $chip | Out-Null; $cx += $cwid + 8 }
  if($gr[3].Count){ $cx = $M + 92; foreach($chip in $gr[3]){ $cwid = [Math]::Max(110, $chip.Length * 9.6 + 20); Chip $sl $cx ($gr[1] + 34) $cwid 26 $chip | Out-Null; $cx += $cwid + 8 } }
  if($gr[0] -ne '저장'){ Line $sl ($M + 18) ($gr[1] + $(if($gr[3].Count){ 76 } else { 44 })) ($M + 502) ($gr[1] + $(if($gr[3].Count){ 76 } else { 44 })) $LINE2 0.75 | Out-Null }
}
$sx = $M + 600; $sw = $CW - 600
Card $sl $sx 104 $sw 178 | Out-Null
T $sl ($sx + 16) 116 ($sw - 32) 18 '**서버**  ~~Firebase~~' 13 $INK | Out-Null
Chip $sl ($sx + 14) 144 ($sw - 28) 34 '**문지기** — 보안 규칙 · 승인은 관리자만' $AC2 $INK2 10 -align 1 | Out-Null
Chip $sl ($sx + 14) 184 ($sw - 28) 34 '**제보 대기함 · 승인 사진 창고**' $AC2 $INK2 10 -align 1 | Out-Null
Chip $sl ($sx + 14) 224 ($sw - 28) 34 '**관리자 로그인** — 이용자는 가입 없음' $AC2 $INK2 10 -align 1 | Out-Null
Rect $sl $sx 296 $sw 92 $CARD $LINE 0.75 5.7 -dash | Out-Null
T $sl ($sx + 16) 308 ($sw - 32) 18 '**배포**  ~~GitHub Pages · Actions~~' 13 $INK | Out-Null
T $sl ($sx + 16) 334 ($sw - 32) 44 '올리면 **자동 검사 23가지** → 통과해야 배포. 앱스토어 없이 주소로' 10.5 $INK2 -lines 1.35 | Out-Null
$ax1 = $M + 524; $ax2 = $sx - 4
Line $sl $ax1 160 $ax2 160 $INK2 1.25 -arrow | Out-Null
T $sl ($ax1 + 2) 140 ($ax2 - $ax1) 14 '제보 사진' 9.5 $DIM -align 2 | Out-Null
Line $sl $ax2 206 $ax1 206 $INK2 1.25 -arrow | Out-Null
T $sl ($ax1 + 2) 210 ($ax2 - $ax1) 14 '승인 사진' 9.5 $DIM -align 2 | Out-Null
Line $sl $ax2 342 $ax1 342 $INK2 1.25 -arrow | Out-Null
T $sl ($ax1 + 2) 346 ($ax2 - $ax1) 28 '앱 · 안내 사진\n처음 한 번' 9 $DIM -align 2 -lines 1.15 | Out-Null
$stats = @(@('31개 · 약 2만 4천 줄', '직접 쓴 앱 코드 — 묶음 도구 없이 순수 JavaScript'), @('130줄', '서버에 올린 우리 코드는 보안 규칙이 전부'), @('0원', '서버 · 배포 비용 (무료 한도 안)'))
for($i = 0; $i -lt 3; $i++){
  $xx = $M + $i * ($CW / 3)
  Rect $sl $xx 408 5 52 $AM | Out-Null
  T $sl ($xx + 16) 406 ($CW / 3 - 24) 30 $stats[$i][0] 22 $INK -bold | Out-Null
  T $sl ($xx + 16) 440 ($CW / 3 - 24) 16 $stats[$i][1] 10 $DIM | Out-Null
}

# ───────────────────────────────────────── 12 쓴 기술
$sl = Page '03 · 재료' '전부 [[휴대폰 안에서]] 돕니다' '03 · 솔루션 설계 및 구현' '무엇으로 만들었는지입니다. 표의 가운데는 그것이 하는 일, 오른쪽은 왜 그것을 골랐는지입니다.\nAI 는 사진 한 장을 숫자 1,280개로 바꾸는 MobileNet 을 썼습니다. 폰 브라우저에서 도는 가장 작은 축이라 골랐습니다.\n3D 건물은 모델 파일 없이 좌표 표에서 직접 그려 냅니다. 건물 도면을 3D 로 만들어 줄 사람도 프로그램도 없었기 때문입니다.\n표의 모든 도구가 휴대폰 안에서 돌아갑니다.'
Tbl $sl $M 106 @(150, 360, 336) @(
  @('무엇을 썼나', '무슨 일을 하나', '왜 이것이었나'),
  @('**MobileNet v2**\n~~α 0.5 · TensorFlow.js~~', '사진 한 장을 **숫자 1,280개**로 바꿉니다. 그 숫자가 비슷하면 같은 자리로 봅니다', '폰 브라우저에서 도는 **가장 작은 축**. 학습용 GPU도 시간도 없었습니다'),
  @('**Tesseract.js**', '사진 속 **호실 번호 · 엘리베이터 층 표시**를 읽습니다', '글자가 읽히면 **모양보다 글자를 믿습니다** — 훨씬 확실합니다'),
  @('**three.js**', '건물을 **좌표 표에서 그려 냅니다** — 3D 모델 파일이 없습니다', '건물 도면을 3D로 만들 사람도 프로그램도 없었습니다'),
  @('**jsQR**', '문에 붙인 **QR을 읽어** 출발점을 정합니다', '장치를 달지 않고 출발점을 정하는 **가장 싼 방법**'),
  @('**Firestore**\n~~+ 서비스 워커~~', '제보 사진을 **맡아 두고 나눠** 줍니다 · 앱 전체를 **폰에 저장**합니다', '무료 한도 안이라 **서버 비용 0원** · 지하 · 계단은 전파가 없습니다')
) -fs 11.5 -rowH 48 | Out-Null
Strip $sl 414 '직접 쓴 앱 코드는 **31개 파일 · 약 2만 4천 줄**입니다. 그중 **서버에 올라가는 우리 코드는 보안 규칙 130줄이 전부**입니다 — 나머지는 전부 휴대폰에서 돕니다.' 52 | Out-Null

# ───────────────────────────────────────── 13 무엇을 받는가
$sl = Page '03 · 휴대폰에 들어가는 것' '앱을 깐다는 게 [[무엇을 받는 일]]인가' '03 · 솔루션 설계 및 구현' '앱스토어가 없습니다. 브라우저에서 「홈 화면에 추가」를 누르면, 그때 필요한 것을 통째로 내려받습니다.\n앱 화면과 코드, 안내 사진 169장, 3D 재료까지 249개 파일, 16.5MB 를 처음 한 번 받아 둡니다. 그 뒤로는 비행기 모드에서도 열립니다.\nAI 자료와 라이브러리는 합쳐 30MB 가 넘어서 저장하지 않고, 사진을 판정할 때만 받습니다. 길안내는 오프라인으로 보장하고, 사진 판정은 인터넷이 있을 때만 쓰는 기능으로 나눈 것 — 이것이 설계의 핵심입니다.'
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

# ───────────────────────────────────────── 14 간지 04
Part '04' '넷 째  차 례' '공대 3호관 길안내는\n[[이렇게 동작합니다]]' '출입문 QR을 찍는 순간부터 강의실 문 앞까지.\n그리고 사진이 낡았을 때 고치는 길까지.' '넷째 차례, 실제로 어떻게 동작하는지 보여 드리겠습니다. (가능하면 이 차례에서 실제 폰으로 시연합니다)' | Out-Null

# ───────────────────────────────────────── 15 시연 ①
$sl = Page '04 · 핵심 기능 시연 ①' '들어와서 [[길을 받기까지]]' '04 · 핵심 기능 시연' '출입문의 QR 을 휴대폰 기본 카메라로 찍으면 앱스토어 없이 바로 앱이 열립니다. 초록색 켜는 화면이 지나면, 처음 온 사람에게 쉬운 사용모드를 켤지 묻습니다.\n그다음이 이 앱의 출발점, 「여기가 맞나요?」입니다. 찍은 문의 실제 사진을 보여 주고 맞는지 확인합니다. 저희는 위치를 알아내지 않고 물어봅니다.\n확인하면 무엇을 찾는지 고르고, 강의실 번호나 교수님 성함, 초성으로 목적지를 찾습니다.'
Phones $sl @(
  @('화면01_초록.jpg', '① QR을 찍는다', '앱스토어 없이 바로 열림'),
  @('화면02_쉬운모드창.jpg', '② 쉬운 사용모드', '누를 곳을 알려 줄까요?'),
  @('화면03_여기가맞나요.jpg', '③ 출발점 확인', '사진으로 「여기가 맞나요?」'),
  @('화면05_무엇을찾으세요.jpg', '④ 무엇을 찾나', '강의실 · 화장실 · 비상계단'),
  @('화면06_검색.jpg', '⑤ 목적지를 고른다', '번호 · 교수님 성함 · 초성')
) -h 290 | Out-Null
Strip $sl 446 '**③번이 이 앱의 출발점입니다.** 내 위치를 알아내지 않고 **물어봅니다** — QR이 안 읽히면 네 문 가운데서 직접 고르면 됩니다.' 50 | Out-Null

# ───────────────────────────────────────── 16 시연 ②
$sl = Page '04 · 핵심 기능 시연 ②' '안내를 따라 [[걸어가기]]' '04 · 핵심 기능 시연' '목적지를 고르면 3D 건물 위에 가는 길이 통째로 보입니다. 층을 누르면 그 층을 위에서 내려다본 지도가 나오고, 걷는 눈높이로 미리 걸어 볼 수도 있습니다.\n길안내를 시작하면 단계마다 그 자리의 실제 사진과 화살표, 한 문장이 나옵니다. 눈앞 풍경이 사진과 다르면 잘못 든 것입니다. 측위를 하지 않는 대신 이용자가 스스로 대조하게 했습니다.\n여기까지는 모두 통신이 없어도 됩니다.'
Phones $sl @(
  @('화면07_3D.jpg', '⑥ 길을 통째로 본다', '3D 건물 위에 가는 길'),
  @('화면08_층상세.jpg', '⑦ 층을 내려다본다', '층 상세 지도'),
  @('화면09_1인칭.jpg', '⑧ 미리 걸어 본다', '걷는 눈높이 미리보기'),
  @('화면11_단계2.jpg', '⑨ 사진을 보며 걷는다', '「엘리베이터를 타고 5층으로」'),
  @('화면13_도착.jpg', '⑩ 도착', '「13524호 · PC실 도착」')
) -h 290 | Out-Null
Strip $sl 446 '**단계마다 그 자리의 실제 사진**을 보여 줍니다 — 측위를 하지 않는 대신 **이용자가 스스로 대조**합니다. ⑥~⑩은 **통신이 없어도** 됩니다.' 50 | Out-Null

# ───────────────────────────────────────── 17 기능 1
$sl = Page '04 · 핵심 기능 · 기능 1' '「내 위치를 모른다」를 해결하는 [[출입문 QR]]' '04 · 핵심 기능 시연' '기능 1, 출입문 QR 입니다. 실내에서는 위치를 잴 수 없고, 재려면 장치가 필요한데 저희는 장치를 달 수 없었습니다.\n그래서 질문을 바꿨습니다. 「지금 어디인가」가 아니라 「어느 문으로 들어왔나」. 정문, 후문, 동문, 서문 네 곳에 이 스티커를 한 장씩 붙입니다.\n찍으면 앱이 바로 열리고, 그 문의 사진으로 「여기가 맞나요?」를 확인합니다. 그 문에서 출발하는 길이 만들어집니다.\n결과는 장치 0대, 0원입니다. QR 은 오류 정정 최고 등급이라 30% 가 가려져도 읽힙니다.'
Rows $sl @(
  @('문제', '실내에서는 위치를 잴 수 없습니다. 재려면 장치가 필요하고, **장치는 달 수 없습니다.**', ''),
  @('발상 전환', '「지금 어디인가」 대신 **「어느 문으로 들어왔나」**를 묻습니다. 정문 · 후문 · 동문 · 서문에 QR 한 장씩.', 'am'),
  @('해결', '휴대폰 **기본 카메라로 찍으면 앱이 바로 열리고**, 그 문 사진으로 「여기가 맞나요?」를 확인합니다. 그 문에서 출발하는 길이 만들어집니다.', ''),
  @('해결', '앱 전체를 **처음 한 번 휴대폰에 저장** — 그 뒤로는 비행기 모드에서도 안내합니다 (249개 · 16.5MB).', ''),
  @('결과', '**장치 0대 · 0원** · QR은 오류 정정 최고 등급(H) — **30%가 가려져도** 읽힙니다.', 'dark')
) $M 106 510 62 12 | Out-Null
$qh = 250; $q = ImgSize (Join-Path $IMG 'QR_정문.png'); $qw = $qh * $q[0] / $q[1]
$f3 = ImgSize (Join-Path $IMG '화면03_여기가맞나요.jpg'); $fw = $qh * $f3[0] / $f3[1]; $fx = $M + $CW - $fw
$qx = $fx - 12 - $qw
Pic $sl 'QR_정문.png' $qx 108 $qw $qh $LINE | Out-Null
Pic $sl '화면03_여기가맞나요.jpg' $fx 108 $fw $qh -round | Out-Null
T $sl ($qx - 10) 366 ($qw + 20) 16 '문에 붙이는 스티커 (9 × 12cm)' 9.5 $DIM -align 2 | Out-Null
T $sl ($fx - 14) 366 ($fw + 28) 30 '찍으면 바로\n「여기가 맞나요?」' 9.5 $DIM -align 2 -lines 1.15 | Out-Null
Strip $sl 440 '**스티커 한 장**이 실내 측위 장치가 하던 일 — **「출발점 정하기」**를 대신합니다.' 46 | Out-Null

# ───────────────────────────────────────── 18 기능 2
$sl = Page '04 · 핵심 기능 · 기능 2' '「안내는 금방 낡는다」를 개선하는 [[제보 + AI 판정]]' '04 · 핵심 기능 시연' '기능 2 입니다. 사진이 낡는데 다시 찍을 사람이 없으니, 이용자가 찍어 올리게 했습니다. 건의함에서 하루 세 번까지 올릴 수 있습니다.\n그러면 새 문제가 생깁니다. 올라온 사진이 어디인지 누가 가리느냐. AI 가 사진을 숫자 1,280개로 바꿔 기준 자료 5,752개와 비교합니다.\n처음에는 전부 답하게 했더니 많이 틀렸습니다. 그래서 1등 점수가 아니라 1등과 2등의 차이로 확신을 재고, 확신한 만큼만 답하게 했습니다. 번호판이나 층 표시가 보이면 글자를 먼저 읽습니다.\n그리고 관리자가 승인하기 전에는 누구의 화면에도 반영되지 않습니다. 이용자에게 보이는 답은 세 가지뿐입니다.'
Rows $sl @(
  @('문제', '사진이 낡는데 다시 찍을 사람이 없습니다 → **이용자가 찍어 올리게** 했습니다 (건의함 · 하루 3번).', ''),
  @('새 문제', '올라온 사진이 어디인지 누가 가립니까? → AI가 사진을 **숫자 1,280개**로 바꿔 **기준 자료 5,752개**와 비교합니다.', 'am'),
  @('해결 ①', '1등 점수가 아니라 **1·2등 격차**로 확신을 재고, **확신한 만큼만** 답합니다.', ''),
  @('해결 ②', '번호판 · 층 표시가 보이면 **글자를 먼저** 읽습니다 → 엘리베이터 안 **97%** 적중, 틀린 층 **0건**.', ''),
  @('안전장치', '관리자가 **승인하기 전에는 누구의 화면에도 반영되지 않습니다.**', 'dark')
) $M 106 520 62 12 | Out-Null
Pic $sl '화면17_건의함.jpg' 598 106 0 290 -round | Out-Null
$ax = 742
T $sl $ax 108 162 16 '**이용자가 받는 답**' 11 $INK | Out-Null
T $sl $ax 126 162 14 '확신한 만큼만' 9.5 $DIM | Out-Null
$ans = @(@('「아마 여기예요 : 13101호」', '확신 높음'), @('「층은 3층 같아요」', '층만 확신'), @('「어디인지 알 수 없어요」', '모름'))
for($i = 0; $i -lt 3; $i++){
  $yy = 150 + $i * 78
  Card $sl $ax $yy 162 66 | Out-Null
  T $sl ($ax + 12) ($yy + 12) 140 20 $ans[$i][0] 11 $INK -bold | Out-Null
  T $sl ($ax + 12) ($yy + 38) 140 16 $ans[$i][1] 9.5 $(if($i -eq 2){ $RD } else { $DIM }) | Out-Null
}
Strip $sl 440 '**이용자에게 보이는 답은 세 가지뿐입니다** — 확신하면 자리, 덜 확신하면 층만, 모르면 **「모르겠다」**.' 46 $AM | Out-Null

# ───────────────────────────────────────── 19 사진 한 장이 모두의 화면이 되기까지 (5단계 흐름)
$sl = Page '04 · 기능 2 · 사진이 바뀌는 길' '사진 한 장이 [[모두의 화면]]이 되기까지' '04 · 핵심 기능 시연' '이용자가 올린 사진이 다른 사람의 화면에 나타나기까지는 다섯 단계를 거칩니다.\n건의함에서 지금 모습을 찍어 올리면, 휴대폰이 먼저 흔들리거나 어두운 사진을 되돌립니다. 그다음 AI 가 번호판 글자를 먼저 읽고 모양을 비교해 어디인지 짐작하는데, 확신한 만큼만 답합니다.\n관리자가 승인하기 전에는 누구의 화면에도 나가지 않고, 승인되면 그 자리의 대표 사진이 바뀌어 다음 사람이 맞는 사진을 보게 됩니다.\n그래서 AI 는 전부 답하지 않습니다. 확신 큰 사진만 답하면 자리 정답이 92.9%, 전부 답하게 하면 55.6% 입니다.'
T $sl $M 104 $CW 22 '이용자가 찍어 올린 사진은 **다섯 단계**를 거쳐야 다른 사람의 화면에 나타납니다.' 13 | Out-Null
$steps5 = @(
  @('1', '이용자가\n찍는다', '건의함에서\n**지금 모습**을\n찍어 올립니다\n~~하루 3번까지~~', $ACT, $false),
  @('2', '휴대폰이\n먼저 거른다', '흔들리거나 어두운\n사진은 **올리기 전에**\n되돌립니다', $ACT, $false),
  @('3', 'AI가 어디인지\n짐작한다', '번호판 글자를\n먼저 읽고, 모양을\n비교해 **확신한\n만큼만** 답합니다', $AM, $true),
  @('4', '관리자가\n승인한다', '승인 전에는\n**누구의 화면에도**\n나가지 않습니다', $ACT, $false),
  @('5', '모두의 화면이\n바뀐다', '그 자리의 대표\n사진이 바뀌어\n**다음 사람**이\n맞는 사진을 봅니다', $ACT, $false))
$sw5 = ($CW - 4 * 26) / 5
for($i = 0; $i -lt 5; $i++){
  $xx = $M + $i * ($sw5 + 26); $st = $steps5[$i]
  Card $sl $xx 144 $sw5 224 $(if($st[4]){ 'FDF5EE' } else { $CARD }) $(if($st[4]){ 'E0B48C' } else { $LINE }) | Out-Null
  $o = $sl.Shapes.AddShape(9, $xx + 16, 162, 34, 34); $o.Line.Visible = 0; $o.Fill.ForeColor.RGB = (C $st[3]); $o.Shadow.Visible = 0
  $otf = $o.TextFrame; $otf.MarginLeft = 0; $otf.MarginRight = 0; $otf.MarginTop = 0; $otf.MarginBottom = 0; $otf.VerticalAnchor = 3
  $otr = $otf.TextRange; $otr.Text = $st[0]; $otr.Font.Name = $FONT; $otr.Font.Size = 15; $otr.Font.Bold = -1; $otr.Font.Color.RGB = (C 'FFFFFF'); $otr.ParagraphFormat.Alignment = 2
  T $sl ($xx + 16) 210 ($sw5 - 24) 40 $st[1] 13.5 $(if($st[4]){ $AM } else { $INK }) -bold -lines 1.2 | Out-Null
  T $sl ($xx + 16) 266 ($sw5 - 24) 96 $st[2] 11.5 $INK2 -lines 1.45 | Out-Null
  if($i -lt 4){ Line $sl ($xx + $sw5 + 4) 256 ($xx + $sw5 + 22) 256 $INK2 1.5 -arrow | Out-Null }
}
Strip $sl 390 '**그래서 AI는 전부 답하지 않습니다** — 확신 큰 사진만 답하면 자리 정답 **92.9%**, 전부 답하게 하면 55.6%.\n잘못 찍힌 사진 한 장이 **모든 이용자에게 퍼지지 않습니다.**' 62 $AM | Out-Null

# ───────────────────────────────────────── 20 처음 온 누구나
$sl = Page '04 · 그리고' '처음 온 [[누구나]] 쓰게' '04 · 핵심 기능 시연' '마지막으로, 처음 온 누구나 쓸 수 있게 한 것들입니다.\n쉬운 사용모드를 켜면 화면마다 누를 곳을 노란 테두리와 손가락으로 짚어 줍니다. 한국어와 영어를 바로 바꿀 수 있고, 햇빛 아래를 위해 밝은 화면도 있습니다.\n길안내 도중 앱이 꺼져도, 30분 안에 다시 열면 보던 단계부터 이어서 안내합니다. 앱 안의 이용안내 11쪽도 실제 화면 사진으로 만들었습니다.'
Phones $sl @(
  @('화면04_쉬운모드_말풍선.jpg', '쉬운 사용모드', '누를 곳을 노란 테두리 · 손가락으로'),
  @('화면18_영어.jpg', '한국어 / English', '외국인 학생 · 손님도'),
  @('화면15_밝은화면.jpg', '밝은 화면', '햇빛 아래에서도 — ☰ 메뉴'),
  @('화면20_이어하기.jpg', '길안내 이어 하기', '앱이 꺼져도 30분 안이면 그 단계부터')
) -h 274 -x ($M + 40) -w ($CW - 80) | Out-Null
Strip $sl 446 'QR을 찍으면 **초록 화면 → 쉬운 사용모드 → 「여기가 맞나요?」** 순서로, 처음 온 사람도 **누를 곳 하나씩**만 따라가면 됩니다. 앱 안 **이용안내 11쪽**도 실제 화면 사진입니다.' 50 | Out-Null

# ───────────────────────────────────────── 21 간지 05
Part '05' '다 섯 째  차 례' '우리가 만든 [[변화]]' '무엇이 달라지는지, 누가 덜 헤매는지,\n그리고 다음 단계.' '다섯째 차례, 이 앱으로 무엇이 달라지는지와 다음 단계입니다.' | Out-Null

# ───────────────────────────────────────── 22 달라지는 것
$sl = Page '05 · 우리가 만든 변화' '공대 3호관 길안내로 [[달라지는 것]]' '05 · 우리가 만든 변화' '지금까지와 무엇이 달라지는지 표로 정리했습니다.\n길 찾기는 QR 한 번 찍고 문 앞까지, 설치비와 운영비는 0원에 장치 0대, 지하와 계단에서는 비행기 모드에서도 안내합니다.\n사진 관리는 관리자가 다시 찍는 대신 이용자가 찍고 AI 가 가리며, 관리자는 승인만 합니다.\n하지만 숫자보다 큰 변화는 마지막 줄입니다. 만든 사람이 졸업해도, 이용자가 사진을 고쳐 가며 앱이 계속 맞게 돌아갑니다.'
Tbl $sl $M 104 @(118, 238, 34, 456) @(
  @('무엇이', '지금까지', '', '공대 3호관 길안내'),
  @('**길 찾기**', '지나가는 사람에게 묻고 헤맨다', '→', '[[QR 한 번 찍고 문 앞까지]]\n~~네 문 · 지하 1층~5층 · 옥상 · 한국어/영어~~'),
  @('**설치 · 운영비**', '측위 장치 수십 대 · 공사 · 배터리', '→', '[[0원 · 장치 0대]]\n~~QR 스티커 4장 · 무료 호스팅~~'),
  @('**지하 · 계단**', '신호가 없으면 멈춘다', '→', '[[비행기 모드에서도 안내]]\n~~처음 한 번 16.5MB 저장~~'),
  @('**사진 관리**', '관리자가 다시 찍고 분류한다', '→', '[[이용자가 찍고 AI가 가린다]]\n~~관리자는 승인만~~'),
  @('**AI의 답**', '전부 답하면 자리 정답 55.6%', '→', '[[확신할 때만 답한다 — 92.9%]]\n~~확신 상위 10% · 나머지는 층만, 또는 「모르겠다」~~'),
  @('**처음 온 사람**', '어디부터 눌러야 할지 모른다', '→', '[[쉬운 사용모드가 누를 곳을 짚어 준다]]\n~~초록 화면 → 쉬운 사용모드 → 여기가 맞나요?~~')
) -fs 11.5 -rowH 43 -align @{ 3 = 2 } | Out-Null
Strip $sl 418 '**숫자보다 큰 변화** — 만든 사람이 졸업해도, **이용자가 사진을 고쳐 가며** 앱이 계속 맞게 돌아갑니다.' 48 | Out-Null

# ───────────────────────────────────────── 23 이런 분들이 덜 헤맵니다 (사람 카드 4장)
$sl = Page '05 · 누구를 위해' '이런 분들이 [[덜 헤맵니다]]' '05 · 우리가 만든 변화' '이 앱으로 누가 덜 헤매게 되는지입니다.\n첫 학기 강의실을 찾는 신입생은 시간표의 호실 번호를 그대로 검색하면 됩니다. 학과 사무실이나 연구실을 찾는 학부모와 손님은 교수님 성함이나 사무실 이름으로 찾고, 쉬운 사용모드가 누를 곳을 알려 줍니다.\n처음 와 본 건물에서 시험을 보는 수험생은 출입문 QR 로 바로 출발하고, 외국인 유학생은 영어로 안내를 받습니다.\n공통점은 하나, 이 건물이 처음이라는 것입니다. 3호관을 잘 아는 사람보다 처음 온 사람에게 꼭 필요한 앱입니다.'
$ppl = @(
  @('🎒', '신입생 · 편입생', '첫 학기, 처음 가 보는 강의실', '시간표의 **호실 번호를\n그대로** 검색하면\n사진을 따라 문 앞까지'),
  @('👪', '학부모 · 외부 손님', '학과 사무실 · 교수님\n연구실을 찾을 때', '**교수님 성함**이나\n**사무실 이름**으로 찾고,\n**쉬운 사용모드**가\n누를 곳을 짚어 줍니다'),
  @('📝', '시험 보러 온 수험생', '처음 와 본 건물의 고사실', '**출입문 QR**을 찍으면\n그 문에서 바로 출발,\n신호 없는 지하 · 계단도\n**비행기 모드**로 안내'),
  @('🌏', '외국인 유학생', '한국어 안내판을 읽기 어려울 때', '**English** 한 번 누르면\n길안내 전체가 영어로'))
$pw4 = ($CW - 3 * 16) / 4
for($i = 0; $i -lt 4; $i++){
  $xx = $M + $i * ($pw4 + 16); $p4 = $ppl[$i]
  Card $sl $xx 106 $pw4 292 | Out-Null
  $o = $sl.Shapes.AddShape(9, $xx + 18, 124, 54, 54); $o.Line.Visible = 0; $o.Fill.ForeColor.RGB = (C $AC2); $o.Shadow.Visible = 0
  Emo $sl ($xx + 18) 124 54 54 $p4[0] 24 | Out-Null
  T $sl ($xx + 18) 192 ($pw4 - 36) 22 $p4[1] 15 $INK -bold | Out-Null
  T $sl ($xx + 18) 218 ($pw4 - 36) 36 $p4[2] 11 $DIM -lines 1.3 | Out-Null
  Line $sl ($xx + 18) 262 ($xx + $pw4 - 18) 262 $LINE2 0.75 | Out-Null
  T $sl ($xx + 18) 274 ($pw4 - 36) 14 '앱에서는' 9.5 $AM -bold -spacing 1 | Out-Null
  T $sl ($xx + 18) 294 ($pw4 - 36) 96 $p4[3] 12 $INK2 -lines 1.45 | Out-Null
}
Strip $sl 418 '공통점은 하나 — **이 건물이 처음**이라는 것입니다. 3호관을 잘 아는 사람보다 **처음 온 사람에게 꼭 필요한** 앱입니다.' 48 | Out-Null

# ───────────────────────────────────────── 24 다음 단계
$sl = Page '05 · 향후 발전 방향' '더 나은 서비스를 위한 [[다음 단계]]' '05 · 우리가 만든 변화' '다음 단계입니다. 지금 10월까지 네 문 QR, 지하부터 옥상까지 안내, 쉬운 사용모드, 사진 제보와 AI 위치 판정까지 왔고, 공개 주소로 배포 중입니다.\n최종 발표 전까지는 QR 스티커를 실제 문에 붙여 현장 시험을 하고, 엘리베이터 앞처럼 서로 비슷한 자리의 사진을 보강합니다.\n그다음은 넓히는 일입니다. 다른 건물에서는 앱 화면, AI 판정 방식, 제보와 서버를 그대로 쓰고 좌표 표와 사진, QR 만 새로 만들면 됩니다. 스토어 앱으로 감싸면 AI 판정까지 오프라인이 됩니다.'
$cols3 = @(
  @('지금 · 10월', '여기까지 왔습니다', @('네 문 QR · 지하 1층~5층 · 옥상 안내', '쉬운 사용모드 · 이용안내 · 한/영 · 밝은 화면', '사진 제보 · AI 위치 판정 · 관리자 승인', '공개 주소로 배포 중'), $AC),
  @('11월 · 최종 발표 전', '다듬습니다', @('QR 스티커를 실제 문에 붙이고 **현장 시험**', '**약한 자리 사진 보강** — 엘리베이터 앞처럼 비슷한 곳', '처음 온 사람의 **사용성 시험**'), $AC),
  @('그다음', '넓힙니다', @('**다른 건물로** — 앱 · AI 판정 · 제보 · 서버는 그대로, 좌표표 · 사진 · QR만 새로', '**스토어 앱으로 감싸기** — AI 판정까지 오프라인', '제보 사진 속 **얼굴 자동 가림**'), $AM))
Line $sl ($M + 10) 120 ($M + $CW - 10) 120 $LINE 1.5 | Out-Null
for($i = 0; $i -lt 3; $i++){
  $xx = $M + $i * ($cw3 + 22); $cc = $cols3[$i]
  $dot = $sl.Shapes.AddShape(9, $xx, 111, 18, 18); $dot.Line.Visible = -1; $dot.Line.ForeColor.RGB = (C $cc[3]); $dot.Line.Weight = 3
  if($i -eq 0){ $dot.Fill.ForeColor.RGB = (C $cc[3]) } else { $dot.Fill.ForeColor.RGB = (C $BG) }
  T $sl $xx 140 $cw3 14 $cc[0] 10 $DIM -bold -spacing 1.5 | Out-Null
  T $sl $xx 158 $cw3 26 $cc[1] 17 $cc[3] -bold | Out-Null
  $yy = 196
  foreach($b in $cc[2]){
    T $sl $xx $yy 12 16 '•' 12 $cc[3] -bold | Out-Null
    T $sl ($xx + 14) $yy ($cw3 - 14) 44 $b 11.5 $INK2 -lines 1.35 | Out-Null
    Line $sl $xx ($yy + 46) ($xx + $cw3) ($yy + 46) $LINE2 0.75 | Out-Null
    $yy += 52
  }
}
Strip $sl 418 '**목표는 하나** — 처음 온 사람이 **누구에게도 묻지 않고** 3호관 어느 문 앞이든 찾아가는 것입니다.' 48 | Out-Null

# ───────────────────────────────────────── 25 마무리하며 (한 장으로 보는 길안내)
$sl = Page '05 · 마무리하며' '한 장으로 보는 [[공대 3호관 길안내]]' '05 · 우리가 만든 변화' '마무리하겠습니다. 한 장으로 보면 이렇습니다.\n출입문 QR 로 출발점을 정하고, 목적지를 찾고, 3D 로 길을 통째로 본 뒤, 그 자리의 실제 사진을 따라 걸어서 문 앞에 도착합니다. 그리고 사진이 낡으면 이용자가 함께 고칩니다.\n그래서 장치 0대, 0원으로, 통신이 없어도 길을 안내하고, 이용자가 함께 고치며, AI 는 모르면 모른다고 말합니다.\nQR 한 장으로 시작해서 실제 사진을 따라 문 앞까지 — 저희는 건물에 아무것도 달지 않았습니다.'
$flow6 = @(
  @('화면03_여기가맞나요.jpg', '① QR로 출발점'), @('화면05_무엇을찾으세요.jpg', '② 목적지 찾기'), @('화면07_3D.jpg', '③ 길을 통째로'),
  @('화면11_단계2.jpg', '④ 사진 따라 걷기'), @('화면13_도착.jpg', '⑤ 문 앞 도착'), @('화면17_건의함.jpg', '⑥ 낡으면 함께 고침'))
$fh6 = 212; $slot6 = $CW / 6
for($i = 0; $i -lt 6; $i++){
  $sz6 = ImgSize (Join-Path $IMG $flow6[$i][0]); $fw6 = $fh6 * $sz6[0] / $sz6[1]
  $fx6 = $M + $slot6 * $i + ($slot6 - $fw6) / 2
  Pic $sl $flow6[$i][0] $fx6 104 $fw6 $fh6 -round | Out-Null
  T $sl ($M + $slot6 * $i) (104 + $fh6 + 7) $slot6 16 $flow6[$i][1] 11 $(if($i -eq 5){ $AM } else { $INK }) -bold -align 2 | Out-Null
  if($i -lt 5){ Line $sl ($fx6 + $fw6 + 5) (104 + $fh6 / 2) ($fx6 + $slot6 - 5) (104 + $fh6 / 2) $INK2 1.25 -arrow | Out-Null }
}
$pills = @('**장치 0대 · 0원**', '**통신이 없어도** 길안내', '**이용자가** 함께 고친다', '**모르면 모른다고** 말하는 AI')
$plw = ($CW - 3 * 14) / 4
for($i = 0; $i -lt 4; $i++){ Chip $sl ($M + $i * ($plw + 14)) 352 $plw 38 $pills[$i] $CARD $INK2 12.5 -line $LINE -radius 19 | Out-Null }
Strip $sl 412 'QR 한 장으로 시작해서, **그 자리의 실제 사진**을 따라, 문 앞까지 — **건물에는 아무것도 달지 않았습니다.**' 50 | Out-Null

# ───────────────────────────────────────── 26 마지막 · Q&A
$script:pg++
$sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl $AC
T $sl $M 92 560 16 '마 지 막 으 로' 10 'B9BBBE' -bold -spacing 4 | Out-Null
T $sl $M 120 600 120 '건물에 장치를 다는 대신,\n[[모두의 휴대폰]]으로 문 앞까지.' 34 'FFFFFF' -bold -lines 1.25 -accent $MINT | Out-Null
Rect $sl $M 262 113 5 $MINT | Out-Null
T $sl $M 286 600 60 'Q & A' 44 'FFFFFF' -bold | Out-Null
T $sl $M 344 600 24 '질의응답 — 들어 주셔서 감사합니다' 15 'D5D7DA' | Out-Null
T $sl $M 392 600 40 '**공대 3호관 길안내** · 팀 공3길\n김민종 · 손의윤 · 문성일   |   지도교수 강규창 교수님' 11.5 'A4A7AB' -lines 1.6 -boldColor 'E2E3E5' | Out-Null
Rect $sl 690 86 214 348 'FFFFFF' '' 0 8 | Out-Null
T $sl 690 100 214 18 '지금 바로 써 보기' 12 $AC -bold -align 2 | Out-Null
Pic $sl 'QR_정문.png' 707 124 180 0 '' | Out-Null
T $sl 690 406 214 16 'minjong0910.github.io' 10.5 $AC -bold -align 2 | Out-Null
Foot $sl '공대 3호관 길안내 · 김민종 · 손의윤 · 문성일' -dark
Notes $sl '마지막으로 한 문장으로 정리하면, 건물에 장치를 다는 대신 모두의 휴대폰으로 문 앞까지 안내하는 것이 저희 작품입니다.\n오른쪽 QR 을 지금 찍으시면 바로 써 보실 수 있습니다. 들어 주셔서 감사합니다. 질문 받겠습니다.'

# ══ 저장 ══════════════════════════════════════════════════════
if($pres.Slides.Count -ne 26){ throw ('쪽 수가 26 이 아닙니다 : ' + $pres.Slides.Count) }
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
