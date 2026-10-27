# 졸업작품 발표 — 키노트형 20쪽 (교수님 스토리라인 Type 2 순서 · 20분 안)
#
#   2026-10-27 사용자 : 「모의 리허설 — 20분 안 · PPT 20장 · Type 2 양식. 지난 자료는 수준이 낮다」
#     아쉬운 점(사용자 고름) : 디자인이 촌스럽다 · 그림 · 도식이 흐리다 · 내용(기술 깊이)이 얕다 → 모양은 「키노트형」(사용자 고름)
#   · 검은 바탕 · 한 장 한 메시지 · 큰 글씨 · 큰 앱 화면(본 서버를 아이폰 크기 DPR3 로 새로 찍음 — 도구\발표그림\최종\)
#   · 도식은 그림을 붙이지 않고 PowerPoint 도형으로 직접 그린다(흐리지 않게, 고칠 수 있게)
#   · 숫자는 지금 앱에서 다시 셈 : 목적지 111곳 × 출발 10가지 = 길 1,110가지(안전망 v151) · 사진 169장 · 249개 16.6MB ·
#     검사 23가지 · 정확도는 생성물\eval_all.json(1,844장) 그대로
#   · 쪽마다 발표 노트 = 대본 + ⏱ 시간 · 누적 — 시간은 대본 길이로 어림(1초 4자 + 4초), 합계가 19분을 넘으면 만들지 않는다
#   · 쪽 제목은 양식 문장을 그대로 쓰거나 그 낱말을 살린다 · 마무리 문장은 사용자가 고른 것(「건물에 붙인 건 QR 네 장뿐 …」)
#
#   사용법 : pwsh -File 도구\발표PPT_최종20쪽_만들기.ps1 [-Desktop]   → 생성물\발표\ 에 .pptx · .pdf · 리허설 대본 .txt
param([string]$OutDir = '', [switch]$Desktop)
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$IMG  = Join-Path $PSScriptRoot '발표그림\최종'
if(-not $OutDir){ $OutDir = Join-Path $ROOT '생성물\발표' }
New-Item -ItemType Directory -Force $OutDir | Out-Null
$NAME = '졸업작품 발표 — 공대 3호관 길안내 (20쪽)'
Add-Type -AssemblyName System.Drawing

# ── 색 · 글꼴 · 자리 ───────────────────────────────────────────
$BG='0B0F14'; $CARD='131A23'; $CARD2='18212D'; $LN='26354A'; $TX='F2F6FA'; $TX2='B4C0CC'; $DM='6E7C8B'
$CY='22D3EE'; $CYD='0E5566'; $PK='FF4D8D'; $PKD='4A1830'; $AMB='FBBF24'
$KF = 'Malgun Gothic'; $NF = 'Bahnschrift'
$W=960; $H=540; $L=56; $CWID=848
$SECT = @('들어가며', '문제점', '해결 아이디어', '설계 및 구현', '기능 시연', '변화', '발전 방향', '마무리')
$TOTAL = 20
function C([string]$hex){ $h = $hex.TrimStart('#'); return [int]("0x" + $h.Substring(4,2)) * 65536 + [int]("0x" + $h.Substring(2,2)) * 256 + [int]("0x" + $h.Substring(0,2)) }

# ── 글자 꾸밈 : **흰 굵게** · [[하늘색]] · {{분홍}} · ~~작고 흐리게~~ · \n 줄바꿈 ──
function Parse([string]$s){
  $plain = New-Object System.Text.StringBuilder; $runs = New-Object System.Collections.ArrayList
  $rx = [regex]'\*\*(.+?)\*\*|\[\[(.+?)\]\]|\{\{(.+?)\}\}|~~(.+?)~~'
  $pos = 0
  foreach($m in $rx.Matches($s)){
    [void]$plain.Append($s.Substring($pos, $m.Index - $pos))
    if($m.Groups[1].Success){ $k='b'; $v=$m.Groups[1].Value } elseif($m.Groups[2].Success){ $k='a'; $v=$m.Groups[2].Value }
    elseif($m.Groups[3].Success){ $k='p'; $v=$m.Groups[3].Value } else { $k='s'; $v=$m.Groups[4].Value }
    $v = $v.Replace('\n', "`r")
    $a = $plain.ToString().Replace('\n', "`r").Length
    [void]$runs.Add(@{ s = $a; l = $v.Length; k = $k })
    [void]$plain.Append($v); $pos = $m.Index + $m.Length
  }
  [void]$plain.Append($s.Substring($pos))
  return ,@($plain.ToString().Replace('\n', "`r"), $runs)
}
function Rich($tr, [string]$text, [double]$size, [string]$color, [bool]$bold, [string]$font){
  $p = Parse $text
  $tr.Text = $p[0]
  $f = $tr.Font; $f.Name = $font; $f.NameFarEast = $KF; $f.Size = $size; $f.Color.RGB = (C $color); $f.Bold = $(if($bold){ -1 } else { 0 })
  foreach($r in $p[1]){
    if($r.l -le 0){ continue }
    $c = $tr.Characters($r.s + 1, $r.l)
    switch($r.k){
      'b' { $c.Font.Bold = -1; $c.Font.Color.RGB = (C $TX) }
      'a' { $c.Font.Bold = -1; $c.Font.Color.RGB = (C $CY) }
      'p' { $c.Font.Bold = -1; $c.Font.Color.RGB = (C $PK) }
      's' { $c.Font.Size = [Math]::Max(8, $size - 2.5); $c.Font.Color.RGB = (C $DM); $c.Font.Bold = 0 }
    }
  }
}
# 글상자 — 만들 때 한 줄 높이로 줄어드는 것을 요청한 높이로 되돌린다(가운데 맞춤이 먹게)
function T($sl, [double]$x, [double]$y, [double]$w, [double]$h, [string]$text, [double]$size = 14, [string]$color = $TX2,
           [switch]$bold, [int]$align = 1, [double]$lines = 1.2, [int]$anchor = 1, [double]$spacing = 0, [string]$font = $KF, [double]$after = 0){
  $s = $sl.Shapes.AddTextbox(1, $x, $y, $w, $h)
  $tf = $s.TextFrame; $tf.WordWrap = -1; $tf.AutoSize = 0
  $tf.MarginLeft = 0; $tf.MarginRight = 0; $tf.MarginTop = 0; $tf.MarginBottom = 0; $tf.VerticalAnchor = $anchor
  Rich $tf.TextRange $text $size $color $bold.IsPresent $font
  $pf = $tf.TextRange.ParagraphFormat; $pf.Alignment = $align; $pf.LineRuleWithin = -1; $pf.SpaceWithin = $lines; $pf.SpaceAfter = $after
  if($spacing -ne 0){ $s.TextFrame2.TextRange.Font.Spacing = $spacing }
  $s.Height = $h
  return $s
}
function Box($sl, [double]$x, [double]$y, [double]$w, [double]$h, [string]$fill, [string]$line = '', [double]$lw = 1, [double]$radius = 0, [switch]$dash, [double]$transp = 0){
  $type = $(if($radius -gt 0){ 5 } else { 1 })
  $s = $sl.Shapes.AddShape($type, $x, $y, $w, $h)
  if($radius -gt 0){ $s.Adjustments.Item(1) = [Math]::Min(0.5, $radius / [Math]::Min($w, $h)) }
  if($fill){ $s.Fill.Visible = -1; $s.Fill.Solid(); $s.Fill.ForeColor.RGB = (C $fill); $s.Fill.Transparency = $transp } else { $s.Fill.Visible = 0 }
  if($line){ $s.Line.Visible = -1; $s.Line.ForeColor.RGB = (C $line); $s.Line.Weight = $lw; if($dash){ $s.Line.DashStyle = 4 } } else { $s.Line.Visible = 0 }
  $s.Shadow.Visible = 0
  return $s
}
function Oval($sl, [double]$x, [double]$y, [double]$d, [string]$fill, [string]$line = '', [double]$lw = 1){
  $s = $sl.Shapes.AddShape(9, $x, $y, $d, $d); $s.Shadow.Visible = 0
  if($fill){ $s.Fill.Solid(); $s.Fill.ForeColor.RGB = (C $fill) } else { $s.Fill.Visible = 0 }
  if($line){ $s.Line.ForeColor.RGB = (C $line); $s.Line.Weight = $lw } else { $s.Line.Visible = 0 }
  return $s
}
# 동그라미 안 숫자·글자
function Badge($sl, [double]$x, [double]$y, [double]$d, [string]$text, [string]$fill = $CY, [string]$color = '0B0F14', [double]$size = 11){
  $o = Oval $sl $x $y $d $fill
  $tf = $o.TextFrame; $tf.MarginLeft = 0; $tf.MarginRight = 0; $tf.MarginTop = 0; $tf.MarginBottom = 0; $tf.VerticalAnchor = 3; $tf.WordWrap = 0
  $tr = $tf.TextRange; $tr.Text = $text; $tr.Font.Name = $NF; $tr.Font.NameFarEast = $KF; $tr.Font.Size = $size; $tr.Font.Bold = -1; $tr.Font.Color.RGB = (C $color); $tr.ParagraphFormat.Alignment = 2
  return $o
}
function Ln($sl, [double]$x1, [double]$y1, [double]$x2, [double]$y2, [string]$color = $LN, [double]$w = 1, [switch]$arrow, [switch]$dash){
  $l = $sl.Shapes.AddLine($x1, $y1, $x2, $y2); $l.Line.ForeColor.RGB = (C $color); $l.Line.Weight = $w
  if($arrow){ $l.Line.EndArrowheadStyle = 2; $l.Line.EndArrowheadLength = 2; $l.Line.EndArrowheadWidth = 2 }
  if($dash){ $l.Line.DashStyle = 4 }
  return $l
}
function Pill($sl, [double]$x, [double]$y, [double]$w, [double]$h, [string]$text, [string]$fill = $CARD2, [string]$color = $TX, [double]$size = 11, [string]$line = '', [switch]$bold, [int]$align = 2){
  $s = Box $sl $x $y $w $h $fill $line 1 ($h / 2)
  $tf = $s.TextFrame; $tf.WordWrap = -1; $tf.AutoSize = 0; $tf.MarginLeft = 8; $tf.MarginRight = 8; $tf.MarginTop = 1; $tf.MarginBottom = 1; $tf.VerticalAnchor = 3
  Rich $tf.TextRange $text $size $color $bold.IsPresent $KF
  $tf.TextRange.ParagraphFormat.Alignment = $align
  return $s
}
# 은은한 빛 덩어리(키노트 느낌의 바탕)
function Blob($sl, [double]$x, [double]$y, [double]$d, [string]$color, [double]$transp = 0.85){
  $o = $sl.Shapes.AddShape(9, $x, $y, $d, $d); $o.Line.Visible = 0; $o.Shadow.Visible = 0
  $o.Fill.Solid(); $o.Fill.ForeColor.RGB = (C $color); $o.Fill.Transparency = $transp
  try{ $o.SoftEdge.Radius = [Math]::Min(100, $d / 3) }catch{}
  return $o
}
function ImgSize([string]$path){ $im = [Drawing.Image]::FromFile($path); $r = @($im.Width, $im.Height); $im.Dispose(); return ,$r }
function PhoneW([string]$file, [double]$h){ $sz = ImgSize (Join-Path $IMG $file); return $h * $sz[0] / $sz[1] }
# 휴대폰 화면 — 얇은 틀 + 둥근 모서리, 원하면 하늘색 빛
function Phone($sl, [string]$file, [double]$x, [double]$y, [double]$h, [switch]$glow){
  $w = PhoneW $file $h
  $fr = Box $sl ($x - 4) ($y - 4) ($w + 8) ($h + 8) '05070B' '2B3646' 1 14
  if($glow){ try{ $fr.Glow.Radius = 16; $fr.Glow.Color.RGB = (C $CY); $fr.Glow.Transparency = 0.82 }catch{} }
  $p = $sl.Shapes.AddPicture((Join-Path $IMG $file), 0, -1, $x, $y, $w, $h)
  try{ $p.AutoShapeType = 5; $p.Adjustments.Item(1) = 0.05 }catch{}
  $p.Line.Visible = 0
  return $w
}
# 사진 — 칸을 꽉 채우게 잘라서 둥근 모서리
function Photo($sl, [string]$file, [double]$x, [double]$y, [double]$w, [double]$h, [double]$round = 0.04){
  $p = $sl.Shapes.AddPicture((Join-Path $IMG $file), 0, -1, $x, $y)
  $p.LockAspectRatio = 0
  $nw = $p.Width; $nh = $p.Height; $tr = $w / $h; $ir = $nw / $nh
  if($ir -gt $tr){ $cut = ($nw - $nh * $tr) / 2; $p.PictureFormat.CropLeft = $cut; $p.PictureFormat.CropRight = $cut }
  else { $cut = ($nh - $nw / $tr) / 2; $p.PictureFormat.CropTop = $cut; $p.PictureFormat.CropBottom = $cut }
  $p.Left = $x; $p.Top = $y; $p.Width = $w; $p.Height = $h
  try{ $p.AutoShapeType = 5; $p.Adjustments.Item(1) = $round }catch{}
  $p.Line.Visible = 0
  return $p
}
# 사진 아래쪽을 어둡게 — 위에 흰 글을 얹는다
function Shade($sl, [double]$x, [double]$y, [double]$w, [double]$h){
  $s = $sl.Shapes.AddShape(1, $x, $y, $w, $h); $s.Line.Visible = 0; $s.Shadow.Visible = 0
  $s.Fill.TwoColorGradient(1, 1)
  $s.Fill.ForeColor.RGB = (C '000000'); $s.Fill.BackColor.RGB = (C '000000')
  try{ $s.Fill.GradientStops.Item(1).Transparency = 1; $s.Fill.GradientStops.Item(2).Transparency = 0.15 }catch{}
  return $s
}

# ── 쪽 틀 ─────────────────────────────────────────────────────
$script:pg = 0; $script:tsum = 0; $script:plan = New-Object System.Collections.ArrayList
function Bg($sl){ $sl.FollowMasterBackground = 0; $sl.Background.Fill.Solid(); $sl.Background.Fill.ForeColor.RGB = (C $BG) }
function Mmss([int]$s){ return ('{0}:{1:D2}' -f [Math]::Floor($s / 60), ($s % 60)) }
# 쪽 시간 = 대본 길이로 어림(1초에 4자 — 발표 말하기 빠르기) + 넘기고 숨 고르는 4초, 5초 단위로 올림.
#   $secs 는 그보다 길게 잡아야 하는 쪽(시연 · 퀴즈)만의 최소값. 노트는 마지막에 합계를 알고 나서 한꺼번에 쓴다.
$CPS = 4.0
function SetNotes($sl, [int]$secs, [string]$title, [string]$script){
  $chars = ([regex]::Matches($script, '[가-힣A-Za-z0-9]')).Count
  $est = [int]([Math]::Ceiling(($chars / $CPS + 4) / 5) * 5)
  $use = [Math]::Max($secs, $est)
  $script:tsum += $use
  [void]$script:plan.Add([pscustomobject]@{ n = $script:pg; slide = $sl; title = $title; secs = $use; est = $est; cum = $script:tsum; text = $script.Replace('\n', "`n") })
}
function WriteNotes(){
  foreach($p in $script:plan){
    $head = '⏱ 이 쪽 ' + $(if($p.secs -ge 60){ ('{0}분 {1}초' -f [Math]::Floor($p.secs / 60), ($p.secs % 60)) } else { ('{0}초' -f $p.secs) }) +
            ' · 누적 ' + (Mmss $p.cum) + ' / 전체 ' + (Mmss $script:tsum) + ' (한도 20:00)'
    try{ $p.slide.NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text = ($head + "`r`r" + $p.text.Replace("`n", "`r")) }catch{}
  }
}
function Footer($sl, [int]$sec, [string]$accent = $CY){
  $parts = for($i = 0; $i -lt $SECT.Count; $i++){ if($i -eq $sec - 1){ '[[' + $SECT[$i] + ']]' } else { $SECT[$i] } }
  $t = T $sl $L 509 640 14 ($parts -join '   ·   ') 8 $DM -spacing 0.3
  if($accent -ne $CY -and $sec -ge 1){ $r = $t.TextFrame.TextRange; $k = $r.Find($SECT[$sec - 1]); if($k){ $k.Font.Color.RGB = (C $accent) } }
  T $sl ($W - $L - 120) 509 120 14 ('{0:D2} / {1}' -f $script:pg, $TOTAL) 8.5 $DM -align 3 -font $NF | Out-Null
}
# 내용 쪽 : 위에 작은 머리말(번호 · 단계 · 소제목) + 큰 제목, 아래 단계 길잡이
function Page([int]$sec, [string]$kick, [string]$title, [int]$secs, [string]$notes, [string]$accent = $CY, [double]$tsize = 27){
  $script:pg++
  $sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl
  Blob $sl 700 -200 460 $(if($accent -eq $PK){ $PK } else { $CY }) 0.9 | Out-Null
  $num = '{0:D2}' -f ($sec + 1)
  $k = T $sl $L 30 700 16 ($num + '    ' + $kick) 10 $TX2 -bold -spacing 1.6
  $k.TextFrame.TextRange.Characters(1, 2).Font.Color.RGB = (C $accent); $k.TextFrame.TextRange.Characters(1, 2).Font.Name = $NF
  $tt = T $sl $L 52 $CWID 40 $title $tsize $TX -bold -lines 1.05 -spacing -0.6
  if($accent -eq $PK){ $tt.TextFrame.TextRange.Font.Color.RGB = (C $TX); }
  Footer $sl $sec $accent
  SetNotes $sl $secs ($kick + ' — ' + ((Parse $title)[0] -replace "`r", ' ')) $notes
  return $sl
}

# ══ PowerPoint 열기 ══════════════════════════════════════════
$app = New-Object -ComObject PowerPoint.Application
$pres = $app.Presentations.Add(0)
$pres.PageSetup.SlideWidth = $W; $pres.PageSetup.SlideHeight = $H
try{
# ───────────────────────────────────────── 1 표지 : [프로젝트 제목] - OOO 문제 해결을 위한 새로운 제안
$script:pg++
$sl = $pres.Slides.Add(1, 12); Bg $sl
Blob $sl 560 -120 560 $CY 0.86 | Out-Null
Blob $sl -160 360 380 $PK 0.9 | Out-Null
T $sl $L 150 520 16 '군산대학교 공과대학 · 졸업작품 발표' 11 $TX2 -spacing 2 | Out-Null
T $sl $L 176 560 64 '공대 3호관 길안내' 46 $TX -bold -spacing -1 | Out-Null
T $sl $L 248 520 60 '건물 안에서 길을 잃는 문제 해결을 위한\n[[새로운 제안]]' 19 $TX2 -lines 1.35 | Out-Null
Box $sl $L 322 56 4 $CY | Out-Null
T $sl $L 344 520 44 '**팀 공3길**    김민종 · 손의윤 · 문성일\n**지도교수**    강규창 교수님' 12 $TX2 -lines 1.7 | Out-Null
$pw = Phone $sl '화면00_표지.jpg' 690 58 424 -glow
$qh = 190; $qw = PhoneW 'QR_동문.png' $qh
$sl.Shapes.AddPicture((Join-Path $IMG 'QR_동문.png'), 0, -1, (690 - 22 - $qw), 292, $qw, $qh) | Out-Null
SetNotes $sl 30 '표지' '안녕하십니까. 팀 공3길입니다. 저희 졸업작품은 「공대 3호관 길안내」, 건물 안에서 길을 잃는 문제를 해결하기 위한 새로운 제안입니다.\n오늘은 어떤 어려움을 어떤 과정으로 풀었는지, 실제 앱과 함께 말씀드리겠습니다.'

# ───────────────────────────────────────── 2 들어가며 : 혹시 이런 불편함, 겪어보셨나요?
$sl = Page 1 '들어가며' '혹시 이런 불편함, [[겪어 보셨나요?]]' 55 '수업 5분 전, 처음 가 보는 강의실을 찾는다고 생각해 보십시오.\n엘리베이터 문이 열렸는데 왼쪽인지 오른쪽인지 모릅니다. 복도에 들어서도 그 끝에 강의실이 있는지 모릅니다. 벽에 안내도가 붙어 있어도, 내가 찾는 호실은 보이지 않습니다.\n세 장 모두 공대 3호관에서 저희가 직접 찍은 사진입니다. 지도 앱은 건물 앞에서 끝나고, 그다음은 지나가는 사람에게 묻는 수밖에 없습니다.'
T $sl $L 98 $CWID 20 '수업 5분 전, 처음 가 보는 강의실 — 공대 3호관에서 직접 찍은 세 장면' 13 $TX2 | Out-Null
$ph = @(@('사진_엘리베이터3층.jpg', '「문이 열렸는데…\n왼쪽이야, 오른쪽이야?」', '3층 엘리베이터 안'),
        @('사진_동문.jpg', '「이 복도 끝에\n강의실이 있긴 한 걸까?」', '1층 동문 복도'),
        @('사진_비상대피도3층.jpg', '「안내도는 있는데,\n내가 찾는 호실은 어디?」', '3층 비상대피 경로도'))
$w3 = ($CWID - 2 * 16) / 3
for($i = 0; $i -lt 3; $i++){
  $x = $L + $i * ($w3 + 16)
  Photo $sl $ph[$i][0] $x 130 $w3 290 0.03 | Out-Null
  Shade $sl $x 300 $w3 120 | Out-Null
  T $sl ($x + 16) 344 ($w3 - 32) 48 $ph[$i][1] 15 $TX -bold -lines 1.25 | Out-Null
  T $sl ($x + 16) 396 ($w3 - 32) 16 $ph[$i][2] 9.5 'C9D2DC' | Out-Null
}
T $sl $L 440 $CWID 24 '지도 앱은 **건물 앞에서 끝납니다.** 그다음은 — 지나가는 사람에게 묻는 수밖에 없습니다.' 15 $TX2 | Out-Null

# ───────────────────────────────────────── 3 들어가며 : 몇 층일까요 (청중 참여)
$sl = Page 1 '들어가며 · 잠깐 퀴즈' '이 복도, [[몇 층]]일까요?' 45 '잠깐 퀴즈를 드리겠습니다. 네 장의 복도 사진, 각각 몇 층일까요? (3초 기다린 뒤 클릭 — 정답이 나타납니다)\n왼쪽부터 2층, 3층, 4층, 5층입니다. 맞히신 분 계십니까?\n3호관은 층마다 복도가 거의 똑같이 생겼습니다. 사람 눈으로도 어렵고, 뒤에서 보여 드리겠지만 AI 에게도 이것이 가장 어려운 문제였습니다.'
$q = @(@('현장_2층복도R.jpg', '2층'), @('현장_3층복도L.jpg', '3층'), @('현장_4층복도R.jpg', '4층'), @('현장_5층복도L.jpg', '5층'))
$w4 = ($CWID - 3 * 14) / 4
for($i = 0; $i -lt 4; $i++){
  $x = $L + $i * ($w4 + 14)
  Photo $sl $q[$i][0] $x 106 $w4 300 0.03 | Out-Null
  $b = Badge $sl ($x + $w4 / 2 - 28) 228 56 '?' $PK 'FFFFFF' 26
  $b.Fill.Transparency = 0.1
  $ans = Pill $sl ($x + $w4 / 2 - 44) 232 88 48 $q[$i][1] $CY '0B0F14' 22 -bold
  # 클릭 한 번 : 물음표가 사라지고 정답이 나타난다(PDF 에는 정답만 보이게 물음표 위에 정답을 둔다)
  $e1 = $sl.TimeLine.MainSequence.AddEffect($b, 10, 0, $(if($i -eq 0){ 1 } else { 2 })); $e1.Exit = -1
  $e2 = $sl.TimeLine.MainSequence.AddEffect($ans, 10, 0, 2)
}
T $sl $L 426 $CWID 40 '층마다 복도가 똑같습니다 — 사람 눈으로도, 사진으로도 [[층을 가리기 어렵습니다.]]' 15 $TX2 | Out-Null

# ───────────────────────────────────────── 4 문제점 ① 기존 방식의 한계
$sl = Page 2 '우리가 발견한 문제점 · 기존 방식의 한계' '기존 방식의 한계 — [[한 칸씩 모자랍니다]]' 60 '건물 안에서 길을 찾는 방법은 이미 있습니다. 네 가지 기준으로 따져 봤습니다.\n지도 앱은 무료지만 건물 안의 층과 방향을 모릅니다. 비콘이나 와이파이로 위치를 재는 실내 측위는 정확하지만 장치 수십 대와 공사가 필요합니다. 벽의 안내도는 그 앞에 서야 보이고, 호실이 바뀌면 다시 만들어 붙여야 합니다. 사람에게 묻는 것이 가장 확실하지만, 아는 사람이 있어야 합니다.\n네 칸을 모두 채우는 방법이 없었습니다. 저희 앱은 이 네 칸을 모두 채우는 것을 목표로 했습니다.' $PK
$cols = @('건물 안 길안내', '신호 없는 곳', '공간이 바뀌면', '비용 · 설치')
$cx0 = $L + 210; $cwd = ($CWID - 210) / 4
for($c = 0; $c -lt 4; $c++){ T $sl ($cx0 + $c * $cwd) 108 $cwd 18 $cols[$c] 11 $TX2 -bold -align 2 | Out-Null }
Ln $sl $L 132 ($L + $CWID) 132 $LN 1 | Out-Null
$rows = @(
  @('지도 앱', 'GPS · 온라인 지도', @(@('x','층 · 방향 모름'), @('x','인터넷 필요'), @('x','실내 정보 없음'), @('o','무료'))),
  @('실내 측위', '비콘 · 와이파이', @(@('o','위치를 잰다'), @('h','장치 전원 · 관리'), @('h','지도 다시 맞춤'), @('x','수십 대 · 공사'))),
  @('벽 안내도', '층마다 붙은 평면도', @(@('h','그 앞에서만'), @('o','종이'), @('x','다시 제작'), @('h','제작 · 교체'))),
  @('사람에게 묻기', '지나가는 학생 · 경비실', @(@('h','아는 사람이 있어야'), @('o','어디서나'), @('o','사람은 안다'), @('o','무료'))),
  @('공대 3호관 길안내', '우리 앱', @(@('o','들어온 문 + 실제 사진'), @('o','비행기 모드'), @('o','이용자가 고친다'), @('o','0원 · 장치 0대'))))
for($r = 0; $r -lt 5; $r++){
  $y = 140 + $r * 52; $ours = ($r -eq 4)
  if($ours){ Box $sl ($L - 8) ($y - 4) ($CWID + 16) 50 $CYD $CY 1.25 8 -transp 0.55 | Out-Null }
  T $sl $L ($y + 4) 200 20 $rows[$r][0] 14 $(if($ours){ $CY } else { $TX }) -bold | Out-Null
  T $sl $L ($y + 24) 200 16 $rows[$r][1] 9.5 $DM | Out-Null
  for($c = 0; $c -lt 4; $c++){
    $cell = $rows[$r][2][$c]; $xx = $cx0 + $c * $cwd + 14
    switch($cell[0]){ 'o' { Oval $sl $xx ($y + 14) 14 $CY | Out-Null } 'h' { Oval $sl $xx ($y + 14) 14 '' $AMB 2 | Out-Null } 'x' { T $sl ($xx - 1) ($y + 8) 18 20 '✕' 15 $PK -bold -align 2 | Out-Null } }
    if($cell[1]){ T $sl ($xx + 22) ($y + 13) ($cwd - 40) 18 $cell[1] 10.5 $TX2 | Out-Null }
  }
  if(-not $ours){ Ln $sl $L ($y + 48) ($L + $CWID) ($y + 48) '1A2533' 0.75 | Out-Null }
}
Oval $sl $L 424 10 $CY | Out-Null; T $sl ($L + 16) 420 60 18 '된다' 10 $TX2 | Out-Null
Oval $sl ($L + 70) 424 10 '' $AMB 1.75 | Out-Null; T $sl ($L + 86) 420 60 18 '조건부' 10 $TX2 | Out-Null
T $sl ($L + 140) 418 14 18 '✕' 11 $PK -bold | Out-Null; T $sl ($L + 156) 420 60 18 '안 된다' 10 $TX2 | Out-Null
T $sl $L 446 $CWID 24 '**네 칸을 모두 채우는 방법이 없었습니다** — 그래서 직접 만들었습니다.' 15 $TX2 | Out-Null

# ───────────────────────────────────────── 5 문제점 ② 명확한 Pain Point
$sl = Page 2 '우리가 발견한 문제점 · Pain Point' '명확한 Pain Point — {{네 가지}}' 60 '그래서 저희가 붙잡은 Pain Point 는 네 가지입니다.\n첫째, 내 위치를 모릅니다. 실내에서는 GPS 가 잡히지 않습니다. 둘째, 헤매는 곳은 하필 신호가 없는 지하와 계단, 엘리베이터 안입니다. 셋째, 안내는 금방 낡습니다. 호실이 옮겨지고 공사를 하면 사진도 안내도도 틀려지는데, 다시 찍을 사람이 없습니다. 넷째, 처음 온 사람에게는 앱 자체가 문턱입니다.\n가장 아픈 곳은 세 번째입니다. 만드는 것보다 계속 맞게 유지하는 것이 훨씬 어렵습니다. 그리고 저희는 학생 팀이라 장치도, 공사도, 운영비도 쓸 수 없었습니다.' $PK
$pp = @(
  @('01', '내 위치를 모른다', '실내에선 GPS가 잡히지 않고,\n측위 장치는 수십 대 · 공사가 필요합니다', $false),
  @('02', '헤매는 곳은 신호가 없다', '지하 · 계단 · 엘리베이터 안 —\n온라인 앱은 거기서 멈춥니다', $false),
  @('03', '안내는 금방 낡는다', '호실 · 공사로 바뀌면 사진이 틀립니다.\n다시 찍을 사람이 없습니다', $true),
  @('04', '처음 온 사람에겐 앱이 문턱', '설치 · 가입 · 메뉴 익히기 —\n그리고 한국어뿐인 안내판', $false))
$cw2 = ($CWID - 16) / 2
for($i = 0; $i -lt 4; $i++){
  $x = $L + ($i % 2) * ($cw2 + 16); $y = 104 + [Math]::Floor($i / 2) * 150; $hot = $pp[$i][3]
  Box $sl $x $y $cw2 136 $(if($hot){ '1E1220' } else { $CARD }) $(if($hot){ $PK } else { $LN }) $(if($hot){ 1.5 } else { 1 }) 12 | Out-Null
  T $sl ($x + 22) ($y + 18) 80 44 $pp[$i][0] 34 $(if($hot){ $PK } else { '3A4A5E' }) -bold -font $NF | Out-Null
  T $sl ($x + 104) ($y + 26) ($cw2 - 124) 26 $pp[$i][1] 19 $TX -bold | Out-Null
  T $sl ($x + 104) ($y + 62) ($cw2 - 124) 56 $pp[$i][2] 12.5 $TX2 -lines 1.4 | Out-Null
  if($hot){ Pill $sl ($x + $cw2 - 112) ($y + 12) 98 22 '가장 아픈 곳' $PK 'FFFFFF' 10 -bold | Out-Null }
}
T $sl $L 412 $CWID 50 '그리고 조건 — 학생 팀이라 {{장치 0대 · 공사 0 · 운영비 0원}}, 그리고 **만든 사람이 졸업해도 돌아가야** 합니다.' 15 $TX2 -lines 1.35 | Out-Null

# ───────────────────────────────────────── 6 해결 아이디어 ① 컨셉
$sl = Page 3 '우리의 해결 아이디어' '그래서 우리는 [[위치를 재지 않는 길안내]]를 생각했습니다' 50 '그래서 저희는 발상을 바꿨습니다. 위치를 재지 않는 길안내입니다.\n「지금 어디에 있나」를 재려면 장치가 필요합니다. 대신 「어느 문으로 들어왔나」를 묻기로 했습니다. 출입문 네 곳에 QR 을 붙이면, 찍는 순간 출발점이 정해집니다.\n그다음부터는 그 자리의 실제 사진이 길을 알려 줍니다. 눈앞 풍경이 사진과 같으면 맞게 가고 있는 것입니다.\n장치 0대, 공사 0, 운영비 0원, 그리고 인터넷이 끊겨도 됩니다.' $CY 25
T $sl $L 116 470 120 '「지금 어디인가」 대신\n[[「어느 문으로 들어왔나」]]' 30 $TX -bold -lines 1.3 -spacing -0.6 | Out-Null
T $sl $L 248 450 80 '출입문 네 곳에 QR — 찍는 순간 **출발점이 정해지고**,\n그다음은 **그 자리의 실제 사진**이 길을 알려 줍니다.' 15 $TX2 -lines 1.55 | Out-Null
$chips = @('장치 0대', '공사 0', '운영비 0원', '인터넷 없이')
for($i = 0; $i -lt 4; $i++){ Pill $sl ($L + $i * 112) 352 100 32 $chips[$i] $CARD2 $CY 12 $LN -bold | Out-Null }
$ph6 = 350; $pw6x = ($L + $CWID) - (PhoneW 'K01_여기가맞나요.jpg' $ph6)
$qh = 220; $qw = PhoneW 'QR_동문.png' $qh; $qx = $pw6x - 52 - $qw
$sl.Shapes.AddPicture((Join-Path $IMG 'QR_동문.png'), 0, -1, $qx, 170, $qw, $qh) | Out-Null
Ln $sl ($qx + $qw + 10) 280 ($pw6x - 12) 280 $CY 2 -arrow | Out-Null
T $sl ($qx + $qw + 2) 290 50 14 '찍으면' 9 $CY -align 2 | Out-Null
Phone $sl 'K01_여기가맞나요.jpg' $pw6x 108 $ph6 -glow | Out-Null

# ───────────────────────────────────────── 7 해결 아이디어 ② Pain → 답
$sl = Page 3 '우리의 해결 아이디어 · 네 가지 답' '네 가지 Pain Point에, [[네 가지 답]]' 60 '네 가지 Pain Point 에 하나씩 답을 냈습니다.\n내 위치를 모르는 문제는 출입문 QR 네 장으로 들어온 문을 물어 해결합니다. 신호가 없는 문제는 처음 한 번 앱 전체를 휴대폰에 담아, 비행기 모드에서도 안내하게 했습니다.\n안내가 낡는 문제는 이용자가 바뀐 곳을 찍어 올리면 AI 가 어디인지 가리고, 관리자가 승인하는 방식으로 풀었습니다. 사진이 스스로 최신이 됩니다.\n앱이 문턱인 문제는 QR 을 찍으면 설치 없이 바로 열리고, 쉬운 사용모드와 영어 안내로 처음 온 누구나 쓰게 했습니다.'
$map = @(
  @('01  내 위치를 모른다', '출입문 QR 네 장으로 [[들어온 문]]을 묻는다', '출발점 확정 · 장치 0대'),
  @('02  신호가 없다', '처음 한 번, 앱 전체(16.6MB)를 [[휴대폰에 담는다]]', '비행기 모드에서도 안내'),
  @('03  안내가 낡는다', '이용자가 찍고 → [[AI가 가리고]] → 관리자가 승인', '사진이 스스로 최신'),
  @('04  앱이 문턱', 'QR = 바로 앱 · [[쉬운 사용모드]] · English', '처음 온 누구나'))
for($i = 0; $i -lt 4; $i++){
  $y = 108 + $i * 80
  Pill $sl $L ($y + 14) 212 36 $map[$i][0] '2A1422' $PK 12 -bold -align 1 | Out-Null
  Ln $sl ($L + 222) ($y + 32) ($L + 252) ($y + 32) $DM 1.5 -arrow | Out-Null
  Box $sl ($L + 262) $y 380 64 $CARD $LN 1 10 | Out-Null
  T $sl ($L + 280) $y 350 64 $map[$i][1] 14.5 $TX -anchor 3 -lines 1.3 | Out-Null
  Ln $sl ($L + 652) ($y + 32) ($L + 682) ($y + 32) $DM 1.5 -arrow | Out-Null
  T $sl ($L + 692) $y 160 64 $map[$i][2] 13.5 $CY -bold -anchor 3 -lines 1.3 | Out-Null
}
T $sl $L 440 $CWID 24 '판단은 **휴대폰**이, 건물에 붙인 것은 **QR 네 장뿐** — 이 네 가지가 앱의 뼈대입니다.' 15 $TX2 | Out-Null

# ───────────────────────────────────────── 8 설계 ① 전체 구조
#   2026-10-27 사용자 : 「8쪽 구조도는 알아보기 힘들다 — 저번에 준 구조도를 붙이고 다시 설명」
#   → 바탕화면 구조도_블록도_흐름도.pdf 2쪽(10/07 KIPRIS 식, 숫자 없음)을 크게 그려 잘라 붙이고(발표그림\최종\구조도_휴대폰_서버.png),
#     칸 이름은 그림 그대로 두고 오른쪽에 칸마다 실제로 무엇인지 한 줄씩
$sl = Page 4 '솔루션 설계 및 구현 · 전체 구조' '공대 3호관 길안내의 [[전체 구조]]' 60 '저희 앱의 구조도입니다. 왼쪽이 휴대폰, 오른쪽이 서버이고, 둘이 만나는 곳은 가운데 화살표 두 줄뿐입니다.\n휴대폰은 위에서부터 차례로 일합니다. 문의 QR 을 찍으면 문 이름으로 출발점이 정해지고, 목적지를 찾아 길을 만들고, 3D 와 실제 사진으로 보여 줍니다. 바뀐 곳은 사진으로 올리고 AI 가 어디인지 판단합니다. 맨 아래 저장 칸 덕분에 길안내는 인터넷 없이 됩니다.\n서버는 맡아 두기만 합니다. 문지기인 보안 규칙이 누가 무엇을 쓸 수 있는지 지키고, 제보는 대기함에서 기다리다 관리자가 승인하면 창고로 옮겨져 모든 휴대폰에 나눠집니다.'
$dgH = 374; $dgW = PhoneW '구조도_휴대폰_서버.png' $dgH
Box $sl $L 98 ($dgW + 18) ($dgH + 18) 'FFFFFF' '' 1 10 | Out-Null
$sl.Shapes.AddPicture((Join-Path $IMG '구조도_휴대폰_서버.png'), 0, -1, ($L + 9), 107, $dgW, $dgH) | Out-Null
$rx = $L + $dgW + 18 + 22; $rw = $L + $CWID - $rx
T $sl $rx 98 $rw 18 '휴대폰 — 길안내는 전부 여기서, [[인터넷 없이]]' 12 $TX -bold | Out-Null
$phb = @(
  @('문에 붙인 QR 4장 찍기', '정문 · 후문 · 동문 · 서문 — 카메라로 찍으면 앱이 열림'),
  @('QR 읽기', 'QR 주소 속 문 이름(gate=EAST) → 출발점 확정'),
  @('목적지 찾기', '호실 번호 · 교수님 성함 · 초성 검색'),
  @('길 만들기', '문별 · 층별 표 4개 → 1,110가지 길을 그 자리에서'),
  @('보여 주기', '3D 건물 · 실제 사진 169장 · 1인칭 걷기'),
  @('사진 찍기', '건의함 — 바뀐 곳을 찍어 올림(하루 3번)'),
  @('AI 가 어디인지 판단', '사진 → 숫자 1,280개 닮음 비교 + 번호판 글자 읽기'),
  @('받아 둔 자료 저장', '249개 · 16.6MB를 폰에 → 비행기 모드에서도'))
for($i = 0; $i -lt 8; $i++){
  $y = 121 + $i * 24
  Box $sl $rx ($y + 5) 3 13 $CY | Out-Null
  T $sl ($rx + 10) $y 124 22 $phb[$i][0] 9.5 $TX -bold -anchor 3 | Out-Null
  T $sl ($rx + 136) $y ($rw - 136) 22 $phb[$i][1] 9 $TX2 -anchor 3 | Out-Null
}
Ln $sl $rx 318 ($rx + $rw) 318 $LN 0.75 | Out-Null
T $sl $rx 323 $rw 15 '[[→ 제보한 사진]]    건의함에서 올린 사진 → 서버의 제보 대기함' 9 $TX2 | Out-Null
T $sl $rx 340 $rw 15 '[[← 안내 사진 · 앱 자료]]    승인된 사진 · 앱 파일 → 모든 휴대폰' 9 $TX2 | Out-Null
T $sl $rx 362 $rw 18 '서버 — [[맡아 둘 뿐]]  ~~Firebase Firestore · GitHub Pages~~' 12 $TX -bold | Out-Null
$svb = @(
  @('문지기', '보안 규칙 141줄 — 누가 무엇을 읽고 쓰나 · 하루 3번'),
  @('제보 대기함', '승인 전 제보 사진이 기다리는 곳'),
  @('관리자 명부', '승인 · 방 이름 바꾸기를 할 수 있는 사람'),
  @('승인 사진 창고', '승인된 사진 · 바꾼 방 이름'),
  @('나눠 주기', '앱 파일은 GitHub Pages, 승인 사진은 Firestore 가'))
for($i = 0; $i -lt 5; $i++){
  $y = 384 + $i * 22
  Box $sl $rx ($y + 5) 3 12 '8FA3B8' | Out-Null
  T $sl ($rx + 10) $y 124 22 $svb[$i][0] 9.5 $TX -bold -anchor 3 | Out-Null
  T $sl ($rx + 136) $y ($rw - 136) 22 $svb[$i][1] 9 $TX2 -anchor 3 | Out-Null
}

# ───────────────────────────────────────── 9 설계 ② 개발 기술
#   2026-10-27 사용자 : 「개발 기술을 더 상세하게 — 어디에서 쓰고, 어디에서 어떤 기능을 하고, 어디 들어가 있는지」
#   → 기술마다 한 줄 : 무엇을 하나 · 앱 어디에서 어떤 일을 · 들어 있는 곳(실제 파일). 「쓰는 곳」이라는 말머리는 쓰지 않는다(10/24)
$sl = Page 4 '솔루션 설계 및 구현 · 개발 기술' '공대 3호관 길안내의 [[개발 기술]]' 60 '쓴 기술을, 앱 어디에 들어 있는지까지 말씀드리겠습니다.\n앱의 뼈대는 묶음 도구 없이 직접 쓴 자바스크립트 31개 파일입니다. 3D 조감도와 층 상세, 1인칭은 three.js 로 건물 좌표에서 그리고, 서비스 워커가 앱 전체를 폰에 담아 두어 비행기 모드에서도 됩니다. 앱 안 QR 스캔은 jsQR 이 맡습니다.\n건의함 사진 판정은 MobileNet 이 사진을 숫자 1,280개로 바꾸고, Tesseract 가 번호판 글자를 먼저 읽습니다. 둘 다 휴대폰 안에서 돕니다.\n서버는 Firebase 하나이고 보안 규칙 141줄이 지킵니다. GitHub Actions 는 검사를 통과해야만 배포합니다.'
$cx = @($L, ($L + 158), ($L + 378), ($L + 662)); $cwd = @(158, 220, 284, 186)
$hd = @('기술', '무엇을 하나', '앱 어디에서 · 어떤 일을', '들어 있는 곳')
for($c = 0; $c -lt 4; $c++){ T $sl ($cx[$c] + 12) 96 ($cwd[$c] - 12) 14 $hd[$c] 9 $DM -bold -spacing 0.5 | Out-Null }
$tech = @(
  @('JavaScript', '휴대폰', '앱의 뼈대 — 묶음 도구 없이 직접 쓴\n31개 파일 · 약 2만 4천 줄', '화면 21개 전환 · 검색(번호 · 성함 · 초성)\n길안내 엔진 · 쉬운 사용모드 · 이어 하기', "site/js/app/*.js\nindex.html · css/"),
  @('three.js', '휴대폰', '웹에서 3D 를 그리는 도구(WebGL)', '3D 조감도 · 층 상세 · 1인칭 로드뷰\n건물 좌표로 벽 · 문 · 계단을 그림', "js/vendor/three.min.js\n← view3d · floor-detail · roadview"),
  @('Service Worker', '휴대폰', '브라우저 안 저장 담당 —\n파일을 폰에 담아 두고 대신 내줌', '처음 한 번 249개 · 16.6MB 저장 · 지문 확인\n→ 비행기 모드 길안내 · 홈 화면 설치', "site/sw.js (등록 pwa.js)\nmanifest.webmanifest"),
  @('jsQR', '휴대폰', '카메라 화면에서 QR 을 읽는 도구', '앱 안 「출입문 QR 스캔하고 시작」 — 읽은 문으로 출발점 확정', "js/vendor/jsqr.min.js\n← qrnav.js"),
  @('TensorFlow.js', '휴대폰 · 쓸 때만 받음', '폰에서 도는 AI · MobileNet v2\n사진 → 숫자 1,280개', '건의함 사진 판정 — 기준 5,752개와\n닮음 비교 → 「아마 여기예요」', "lib/tf · mobilenet · ai-model/\ndata/aivec.js ← sugai.js"),
  @('Tesseract.js', '휴대폰 · 쓸 때만 받음', '사진 속 글자 읽기(OCR)', '문 번호판 · 엘리베이터 층 표시를 먼저 읽음\n— 층 100장 중 97장', "lib/tess/ (영문 · 숫자)\n← sugai.js"),
  @('Firebase', '서버', 'Firestore 저장소 + 익명 로그인\n+ 보안 규칙 141줄', '제보 사진 · 승인 사진 · 방 이름 저장\n하루 3번 제한 · 관리자 승인', "Firestore 6칸 ← sugdb.js\n서버/firestore.rules"),
  @('GitHub Actions', '개발 · 배포 (+ Pages)', '자동 검사 로봇 + 무료 웹 호스팅', 'main 에 올리면 검사 23가지 →\n통과해야 minjong0910.github.io 에 배포', ".github/workflows/\n검사.ps1 · tests/"))
for($i = 0; $i -lt 8; $i++){
  $y = 114 + $i * 46
  Box $sl $L $y $CWID 42 $CARD $LN 0.75 8 | Out-Null
  T $sl ($L + 12) ($y + 5) 146 18 $tech[$i][0] 12.5 $TX -bold -font $NF | Out-Null
  $tagc = $(if($tech[$i][1] -like '휴대폰*'){ $CY } elseif($tech[$i][1] -eq '서버'){ $PK } else { $AMB })
  T $sl ($L + 12) ($y + 24) 146 14 $tech[$i][1] 8 $tagc -bold | Out-Null
  T $sl ($cx[1] + 12) $y ($cwd[1] - 20) 42 $tech[$i][2] 9 $TX2 -anchor 3 -lines 1.15 | Out-Null
  T $sl ($cx[2] + 12) $y ($cwd[2] - 20) 42 $tech[$i][3] 9 $TX -anchor 3 -lines 1.15 | Out-Null
  T $sl ($cx[3] + 10) $y ($cwd[3] - 14) 42 $tech[$i][4] 8 '7FD8E8' -anchor 3 -lines 1.15 -font 'Consolas' | Out-Null
}
T $sl $L 486 $CWID 16 '직접 쓴 앱 코드 [[31개 파일 · 약 2만 4천 줄]]   ·   서버에서 도는 우리 코드 = 보안 규칙 [[141줄]]   ·   서버 · 배포 비용 [[0원]]' 10 $TX2 | Out-Null

# ───────────────────────────────────────── 10 설계 ③ 길안내 엔진
$sl = Page 4 '솔루션 설계 및 구현 · 길안내 엔진' '1,110가지 길을 [[손으로 쓰지 않았습니다]]' 55 '길안내 엔진입니다. 출발점은 네 문과 각 층의 엘리베이터 앞, 모두 열 가지입니다. 목적지는 호실 100곳, 화장실과 비상계단 다섯 곳씩, 그리고 크리에이티브 존까지 111곳입니다.\n열 곱하기 111, 1,110가지 길을 하나하나 쓰지 않았습니다. 문마다, 층마다 안내 절차를 작은 표 네 개로 정해 두면, 엔진이 건물 좌표를 보고 단계를 만들어 냅니다. 「오른쪽에서 몇 번째 방」도 좌표로 셉니다.\n오른쪽이 실제로 만들어진 예입니다. 층을 하나 더하려면 표에 숫자 하나만 넣으면 됩니다.'
$inp = @(@('출발 10가지', '네 문 + 각 층 엘리베이터 앞\n(지하 1층 ~ 5층)'), @('목적지 111곳', '호실 100 · 화장실 5 · 비상계단 5\n크리에이티브 존 1'), @('건물 좌표', '방 위치 · 복도 왼쪽 / 오른쪽\n엘리베이터 · 계단'))
for($i = 0; $i -lt 3; $i++){
  $y = 108 + $i * 96
  Box $sl $L $y 250 82 $CARD $LN 1 10 | Out-Null
  T $sl ($L + 16) ($y + 12) 220 20 $inp[$i][0] 15 $TX -bold | Out-Null
  T $sl ($L + 16) ($y + 38) 220 36 $inp[$i][1] 10.5 $TX2 -lines 1.35 | Out-Null
  Ln $sl ($L + 256) ($y + 41) ($L + 292) 250 $DM 1.25 -arrow | Out-Null
}
Box $sl ($L + 296) 168 214 166 $CYD $CY 1.5 14 -transp 0.4 | Out-Null
T $sl ($L + 310) 184 186 20 '길안내 엔진' 15 $TX -bold -align 2 | Out-Null
T $sl ($L + 310) 210 186 40 '문별 · 층별 안내 절차\n작은 표 4개' 11 $TX2 -align 2 -lines 1.35 | Out-Null
T $sl ($L + 310) 254 186 30 '10 × 111 =' 14 $TX2 -align 2 -font $NF | Out-Null
T $sl ($L + 310) 278 186 40 '[[1,110가지]]' 26 $TX -bold -align 2 | Out-Null
T $sl ($L + 310) 312 186 16 '한국어 · 영어' 9.5 $DM -align 2 | Out-Null
Ln $sl ($L + 514) 250 ($L + 548) 250 $CY 2 -arrow | Out-Null
T $sl ($L + 556) 106 300 16 '예 — 동문 → 13310호 (이재호 교수님 연구실)' 10 $CY -bold | Out-Null
$st = @('동문으로 들어오세요', '복도를 따라 직진하세요', '엘리베이터를 타고 3층으로 올라가세요', '엘리베이터에서 내려서 우회전 하세요', '복도를 따라 직진하세요', '오른쪽에서 첫 번째 방 — 13310호')
for($i = 0; $i -lt 6; $i++){
  $y = 128 + $i * 50; $last = ($i -eq 5)
  Box $sl ($L + 556) $y 292 42 $(if($last){ '10303A' } else { $CARD }) $(if($last){ $CY } else { $LN }) 1 8 | Out-Null
  Badge $sl ($L + 566) ($y + 10) 22 ([string]($i + 1)) $(if($last){ $CY } else { '2C3B50' }) $(if($last){ '0B0F14' } else { $TX }) 10 | Out-Null
  T $sl ($L + 598) $y 244 42 $st[$i] 12 $(if($last){ $TX } else { $TX2 }) -bold:$last -anchor 3 | Out-Null
}
T $sl $L 440 $CWID 24 '「몇 번째 방」은 좌표로 센다 · 층을 하나 더하려면 표에 [[숫자 하나]]만 넣으면 된다' 14 $TX2 | Out-Null

# ───────────────────────────────────────── 11 설계 ④ 품질 관리
$sl = Page 4 '솔루션 설계 및 구현 · 품질 관리' '고칠 때마다 [[자동 검사]] — 통과해야만 배포' 55 '혼자 손으로 확인하면 하나를 고칠 때 다른 곳이 깨집니다. 그래서 검사를 자동으로 만들었습니다.\n코드를 고치면 파일과 보안, 오프라인 목록부터 검사하고, 브라우저에서 설치와 오프라인, 출입문 QR 을 실제로 돌려 봅니다. 안전망은 1,110가지 길과 화면 글자, 3D 그림까지 기록과 비교합니다. 모두 23가지이고, 하나라도 틀리면 GitHub 가 배포를 막습니다.\n그리고 아이폰, 삼성, 작은 폰, 가로 화면, 3D 가 안 되는 폰까지 흉내 내 38단계를 눌러 봤고, 실제 폰에서만 나던 문제들도 찾아 고쳤습니다.'
T $sl $L 100 140 64 '23' 56 $CY -bold -font $NF | Out-Null
T $sl $L 166 140 20 '가지 자동 검사' 13 $TX -bold | Out-Null
T $sl $L 188 140 30 '큰 변경 뒤엔 + 1인칭\n로드뷰 9가지 끝까지 재생' 8.5 $DM -lines 1.3 | Out-Null
$pipe = @(@('파일 검사', '보안 · 문서\n오프라인 목록'), @('앱 검사', '설치 · 오프라인\n출입문 QR'), @('안전망 비교', '길 1,110가지 · 화면\n3D 그림 15장'), @('GitHub 통과', '하나라도 틀리면\n배포 막힘'), @('배포', '공개 주소에\n자동 반영'))
$bx = $L + 156; $bw2 = ($CWID - 156 - 4 * 12) / 5
for($i = 0; $i -lt 5; $i++){
  $x = $bx + $i * ($bw2 + 12); $end = ($i -eq 4)
  Box $sl $x 106 $bw2 96 $(if($end){ '10303A' } else { $CARD }) $(if($end){ $CY } else { $LN }) 1 10 | Out-Null
  T $sl ($x + 8) 120 ($bw2 - 16) 20 $pipe[$i][0] 13 $TX -bold -align 2 | Out-Null
  T $sl ($x + 8) 148 ($bw2 - 16) 46 $pipe[$i][1] 10 $TX2 -align 2 -lines 1.3 | Out-Null
  if($i -lt 4){ Ln $sl ($x + $bw2 + 1) 154 ($x + $bw2 + 11) 154 $CY 1.5 -arrow | Out-Null }
}
$hw = ($CWID - 16) / 2
Box $sl $L 226 $hw 196 $CARD $LN 1 12 | Out-Null
T $sl ($L + 20) 242 ($hw - 40) 20 '폰 흉내 점검 — [[38단계]]' 15 $TX -bold | Out-Null
T $sl ($L + 20) 272 ($hw - 40) 44 'QR → 쉬운 사용모드 → 여기가 맞나요 → 찾기 → 3D → 층 상세 → 길안내 → 도착 → ☰ 메뉴 · 밝은 화면 · 건의함 · 이어 하기' 11 $TX2 -lines 1.4 | Out-Null
$dev = @('아이폰', '삼성', '작은 폰', '가로 화면', '3D 안 되는 폰')
$dx = $L + 20
foreach($d in $dev){ $dw = 26 + $d.Length * 10; Pill $sl $dx 330 $dw 22 $d $CARD2 $TX 9.5 '2C3B50' | Out-Null; $dx += $dw + 6 }
T $sl ($L + 20) 366 ($hw - 40) 40 '다섯 가지 폰 모두 — 앱 오류 [[0]]' 17 $TX -bold | Out-Null
$rx2 = $L + $hw + 16
Box $sl $rx2 226 $hw 196 $CARD $LN 1 12 | Out-Null
T $sl ($rx2 + 20) 242 ($hw - 40) 20 '실제 폰에서만 나던 문제를 [[찾아 고침]]' 15 $TX -bold | Out-Null
$fx = @(@('삼성 폰 1인칭 벽이 노랗게', '안드로이드 GPU → 조명 재질을 단색으로'), @('삼성에서 사진 AI가 꺼짐', '모델 주소가 기기마다 다르게 막힘 → 우리 서버로'), @('QR로 열 때 초록 화면이 두 번', '새 판으로 갈아타는 순간을 조절 → 한 번만'))
for($i = 0; $i -lt 3; $i++){
  $y = 276 + $i * 46
  Oval $sl ($rx2 + 22) ($y + 6) 8 $PK | Out-Null
  T $sl ($rx2 + 38) $y ($hw - 60) 18 $fx[$i][0] 12 $TX -bold | Out-Null
  T $sl ($rx2 + 38) ($y + 20) ($hw - 60) 16 $fx[$i][1] 10.5 $TX2 | Out-Null
}
T $sl $L 440 $CWID 24 '하나를 고치면 다른 곳이 깨지는 일을 — [[기계가 먼저]] 잡습니다.' 14 $TX2 | Out-Null

# ───────────────────────────────────────── 12 시연 ① 이렇게 동작합니다
$sl = Page 5 '핵심 기능 시연' '공대 3호관 길안내는 [[이렇게 동작합니다]]' 70 '이제 실제로 어떻게 동작하는지 보여 드리겠습니다. 동문에서, 교수님 성함 하나만 알고 연구실을 찾아가는 경우입니다.\n동문 QR 을 휴대폰 기본 카메라로 찍으면 앱스토어 없이 바로 열립니다. 초록 로고 화면 뒤에 쉬운 사용모드를 켤지 묻고, 동문의 실제 사진으로 「여기가 맞나요?」를 확인합니다. 강의실을 누르고 「이재호」를 치면 3층 13310 연구실이 나옵니다.\n3D 건물 위에 가야 할 곳이 표시되고, 길안내를 시작하면 단계마다 그 자리의 실제 사진과 한 문장이 나옵니다. 동문으로 들어와, 엘리베이터로 3층, 그리고 연구실 문 앞에 도착합니다.\n(시간이 되면 실제 앱으로 바로 보여 드립니다.)'
T $sl $L 96 $CWID 20 '동문에서, 교수님 성함 하나로 — 3층 13310 연구실까지' 13 $TX2 | Out-Null
$flow = @(@('K01_여기가맞나요.jpg', '① 동문 QR', '「여기가 맞나요?」'), @('K03_성함검색.jpg', '② 「이재호」', '성함으로 찾기'), @('K04_3D.jpg', '③ 3D', '가야 할 곳 표시'),
          @('K06_단계1.jpg', '④ 사진 따라', '「동문으로 들어오세요」'), @('K08_단계3.jpg', '⑤ 엘리베이터', '「3층으로 올라가세요」'), @('K12_도착.jpg', '⑥ 도착', '13310호 연구실'))
$slot = $CWID / 6; $phh2 = 286
for($i = 0; $i -lt 6; $i++){
  $pw = PhoneW $flow[$i][0] $phh2; $x = $L + $slot * $i + ($slot - $pw) / 2
  Phone $sl $flow[$i][0] $x 124 $phh2 -glow:($i -eq 5) | Out-Null
  T $sl ($L + $slot * $i) 420 $slot 18 $flow[$i][1] 12 $(if($i -eq 5){ $CY } else { $TX }) -bold -align 2 | Out-Null
  T $sl ($L + $slot * $i) 440 $slot 16 $flow[$i][2] 9.5 $TX2 -align 2 | Out-Null
  if($i -lt 5){ Ln $sl ($x + $pw + 6) 267 ($L + $slot * ($i + 1) + 2) 267 $DM 1 -arrow | Out-Null }
}
Pill $sl ($W - $L - 210) 92 210 24 '● LIVE  minjong0910.github.io' '2A1422' $PK 10 -bold | Out-Null

# ───────────────────────────────────────── 13 시연 ② 처음 온 누구나
$sl = Page 5 '핵심 기능 시연 · 누구나' '처음 온 [[누구나]] 쓰게' 55 '처음 온 누구나 쓸 수 있게 만든 것들입니다.\n쉬운 사용모드를 켜면 누를 곳을 손가락으로 짚어 줍니다. 검색은 호실 번호, 교수님 성함, 그리고 「ㅎㄱㅅㅁㅅ」 같은 초성만으로도 찾습니다. 설정에서 English 를 누르면 안내 전체가 영어로 바뀝니다.\n길안내 중에 앱이 꺼져도 30분 안에 다시 켜면 보던 단계부터 이어 가고, 햇빛 아래에서는 밝은 화면으로 바꿉니다. 사진을 한 번 누르면 크게 보여서 문 옆 명패 글씨까지 읽을 수 있습니다.'
$ft = @(
  @('동문04_여기가맞나요.jpg', '쉬운 사용모드', '누를 곳을\n손가락으로'), @('A04_초성검색.jpg', '초성 · 성함 검색', '「ㅎㄱㅅㅁㅅ」\n→ 학과사무실'), @('화면18_영어.jpg', 'English', '안내 전체가\n영어로'),
  @('화면20_이어하기.jpg', '이어 하기', '꺼져도 30분 안이면\n그 단계부터'), @('화면15_밝은화면.jpg', '밝은 화면', '햇빛 아래에서도\n잘 보이게'), @('K14_명패크게.jpg', '사진 크게 보기', '한 번 누르면\n명패 글씨까지'))
$slot = $CWID / 6; $fh = 272
for($i = 0; $i -lt 6; $i++){
  $pw = PhoneW $ft[$i][0] $fh; $x = $L + $slot * $i + ($slot - $pw) / 2
  Phone $sl $ft[$i][0] $x 102 $fh | Out-Null
  T $sl ($L + $slot * $i) 386 $slot 20 $ft[$i][1] 13 $TX -bold -align 2 | Out-Null
  T $sl ($L + $slot * $i) 408 $slot 30 $ft[$i][2] 9.5 $TX2 -align 2 -lines 1.3 | Out-Null
}
T $sl $L 456 $CWID 20 '처음 온 학부모 · 유학생 · 신입생 — [[누구에게도 묻지 않고]] 시작할 수 있게' 13 $TX2 | Out-Null

# ───────────────────────────────────────── 14 기능 1
$sl = Page 5 '핵심 기능 시연 · 기능 1' '「내 위치를 모른다」를 해결하는 [[출입문 QR + 오프라인 길안내]]' 65 '기능 1 입니다. 내 위치를 모르고 신호도 없는 문제를 출입문 QR 과 오프라인 길안내로 풀었습니다.\n첫째, 들어온 문을 묻습니다. 네 문마다 들어서면 보이는 풍경이 달라서, 첫걸음도 문마다 다르게 정했습니다. 정문은 바로 엘리베이터, 동문과 서문은 복도를 따라 직진, 후문은 라운지에서 우회전입니다.\n둘째, 그다음은 단계마다 그 자리의 실제 사진으로 안내합니다. 측위를 하지 않는 대신 이용자가 눈앞 풍경과 맞춰 봅니다.\n셋째, 처음 한 번 249개 파일, 16.6MB 를 휴대폰에 담아 둡니다. 파일마다 지문을 확인하고, 그 뒤로는 비행기 모드에서도 길안내와 3D, 사진이 그대로 됩니다.' $CY 23
$c3w = ($CWID - 2 * 18) / 3
$hd = @('① 들어온 문을 묻는다', '② 그다음은 실제 사진으로', '③ 신호가 없어도')
for($i = 0; $i -lt 3; $i++){ T $sl ($L + $i * ($c3w + 18)) 104 $c3w 20 $hd[$i] 14 $CY -bold | Out-Null }
$gates = @(@('현장_정문.jpg', '정문', '바로 엘리베이터'), @('현장_후문.jpg', '후문', '라운지에서 우회전'), @('현장_동문.jpg', '동문', '복도를 따라 직진'), @('현장_서문.jpg', '서문', '복도를 따라 직진'))
$gw = ($c3w - 10) / 2
for($i = 0; $i -lt 4; $i++){
  $x = $L + ($i % 2) * ($gw + 10); $y = 134 + [Math]::Floor($i / 2) * 136
  Photo $sl $gates[$i][0] $x $y $gw 92 0.05 | Out-Null
  T $sl $x ($y + 98) $gw 16 $gates[$i][1] 11.5 $TX -bold | Out-Null
  T $sl $x ($y + 114) $gw 14 $gates[$i][2] 9.5 $TX2 | Out-Null
}
$x2 = $L + $c3w + 18
$pw = Phone $sl 'K06_단계1.jpg' ($x2 + 6) 134 240
T $sl ($x2 + $pw + 22) 150 ($c3w - $pw - 28) 150 '단계마다\n**그 자리의 실제 사진**\n+ 한 문장\n\n눈앞 풍경과\n맞춰 보며 걷는다\n— 측위 대신' 11 $TX2 -lines 1.4 | Out-Null
$x3 = $L + 2 * ($c3w + 18)
$pw3 = Phone $sl 'A15_오프라인.jpg' ($x3 + 6) 134 240
$ofl = @('249개 · 16.6MB를\n처음 한 번 저장', '파일마다\nSHA-256 지문 확인', '비행기 모드에서도\n길안내 · 3D · 사진')
for($i = 0; $i -lt 3; $i++){ T $sl ($x3 + $pw3 + 22) (150 + $i * 60) ($c3w - $pw3 - 28) 56 $ofl[$i] 11 $TX2 -lines 1.35 | Out-Null }
Box $sl $L 402 $CWID 52 '10303A' $CY 1 12 | Out-Null
T $sl ($L + 20) 402 ($CWID - 40) 52 '장치 [[0대]]   ·   출발 [[10가지]] × 목적지 [[111곳]]   ·   지하 1층~5층   ·   길안내 중 통신 [[0회]]' 15 $TX -bold -anchor 3 -align 2 | Out-Null

# ───────────────────────────────────────── 15 기능 2 ① 제보 + AI 판정
$sl = Page 5 '핵심 기능 시연 · 기능 2' '「안내는 금방 낡는다」를 개선하는 [[제보 + AI 판정]]' 65 '기능 2 입니다. 가장 아픈 문제, 안내가 낡는 문제를 이용자 제보와 AI 판정으로 개선했습니다.\n바뀐 곳을 이용자가 건의함에서 찍어 올립니다. 휴대폰이 먼저 흔들림과 밝기를 검사해 못 쓸 사진은 되돌립니다. 번호판이나 엘리베이터 층 표시가 보이면 글자부터 읽고, 그다음 사진을 숫자 1,280개로 바꿔 기준 사진 5,752개와 비교합니다.\n핵심은 마지막입니다. 1등 점수가 아니라 1등이 2등을 얼마나 이겼는지로 확신을 재서, 확실하면 자리를, 층만 확실하면 층을, 모르면 모른다고 답합니다. 그리고 관리자가 승인해야만 모두의 화면이 바뀝니다.'
$pl = @(@('찍어 올린다', '건의함 · 하루 3번'), @('품질 검사', '흔들림 · 밝기'), @('글자 먼저', '번호판 · 층 표시'), @('모양 비교', '숫자 1,280개 ×\n기준 5,752개'), @('확실할 때만 답', '1등과 2등이\n충분히 다를 때'), @('관리자 승인', '→ 모두의 화면'))
$pw6 = ($CWID - 5 * 12) / 6
Box $sl ($L + $pw6 + 6) 98 (4 * $pw6 + 3 * 12 + 12) 140 '' $CY 1 12 -dash | Out-Null
T $sl ($L + $pw6 + 18) 102 300 14 '휴대폰 안에서 — 사진을 판정하러 밖으로 보내지 않는다' 9 $CY | Out-Null
for($i = 0; $i -lt 6; $i++){
  $x = $L + $i * ($pw6 + 12); $key = ($i -eq 4)
  Box $sl $x 124 $pw6 102 $(if($key){ '10303A' } else { $CARD }) $(if($key){ $CY } else { $LN }) 1 10 | Out-Null
  Badge $sl ($x + 10) 134 22 ([string]($i + 1)) $(if($key){ $CY } else { '2C3B50' }) $(if($key){ '0B0F14' } else { $TX }) 10 | Out-Null
  T $sl ($x + 10) 164 ($pw6 - 20) 20 $pl[$i][0] 12.5 $TX -bold | Out-Null
  T $sl ($x + 10) 188 ($pw6 - 20) 34 $pl[$i][1] 9.5 $TX2 -lines 1.3 | Out-Null
  if($i -lt 5){ Ln $sl ($x + $pw6 + 1) 175 ($x + $pw6 + 11) 175 $CY 1.5 -arrow | Out-Null }
}
$hw2 = ($CWID - 16) / 2
Box $sl $L 252 $hw2 190 $CARD $LN 1 12 | Out-Null
T $sl ($L + 20) 266 ($hw2 - 40) 20 '이용자에게는 [[확실한 만큼만]] 말합니다' 14 $TX -bold | Out-Null
$ans = @(@('「아마 여기예요 : 13101호」', '1등이 확실할 때 — 자리까지', $CY), @('「층은 3층 같아요」', '층만 확실할 때', $AMB), @('「어디인지 알 수 없어요」', '모를 때 — 번호판이 보이게 한 장 더', $PK))
for($i = 0; $i -lt 3; $i++){
  $y = 298 + $i * 46
  Box $sl ($L + 18) $y ($hw2 - 36) 38 '0F151D' '' 1 8 | Out-Null
  Box $sl ($L + 18) $y 4 38 $ans[$i][2] | Out-Null
  T $sl ($L + 34) ($y + 3) ($hw2 - 70) 18 $ans[$i][0] 12 $TX -bold | Out-Null
  T $sl ($L + 34) ($y + 21) ($hw2 - 70) 14 $ans[$i][1] 9.5 $TX2 | Out-Null
}
$rx3 = $L + $hw2 + 16
Box $sl $rx3 252 $hw2 190 $CARD $LN 1 12 | Out-Null
T $sl ($rx3 + 20) 266 ($hw2 - 40) 20 '1등과 2등이 [[비슷하면]], 헷갈린 것' 14 $TX -bold | Out-Null
$bars = @(@('1등', 90, $CY), @('2등', 89, $DM))
for($i = 0; $i -lt 2; $i++){
  $y = 304 + $i * 30
  T $sl ($rx3 + 20) $y 40 18 $bars[$i][0] 11 $TX2 | Out-Null
  Box $sl ($rx3 + 60) ($y + 3) (($hw2 - 140) * $bars[$i][1] / 100) 12 $bars[$i][2] '' 1 4 | Out-Null
  T $sl ($rx3 + 60 + ($hw2 - 140) * $bars[$i][1] / 100 + 8) $y 50 18 ([string]$bars[$i][1] + '점') 11 $TX -bold -font $NF | Out-Null
}
T $sl ($rx3 + 20) 370 ($hw2 - 40) 60 '1등이 90점이어도 2등이 89점이면 **사실은 헷갈리는 것**.\n그래서 1등과 2등이 충분히 다를 때만 답합니다.\n~~기준 : 닮음 차이 자리 0.22 · 층 0.16 이상~~' 11 $TX2 -lines 1.4 | Out-Null
T $sl $L 456 $CWID 20 '그리고 확정은 사람이 — [[관리자가 승인하기 전]]에는 누구의 화면에도 반영되지 않습니다.' 13 $TX2 | Out-Null

# ───────────────────────────────────────── 16 기능 2 ② 검증
$sl = Page 5 '핵심 기능 시연 · 기능 2 · 검증' '확실할 때만 답하게 하자, [[10장 중 9장]]' 65 '그 방법이 정말 효과가 있는지 측정했습니다. 시험 사진 1,844장이고, 기준 사진을 만든 촬영 묶음은 빼고 맞혔습니다. 처음 온 사람은 저희가 찍은 사진을 갖고 있지 않기 때문입니다.\n가로축은 얼마나 자주 답하느냐, 세로축은 자리를 맞힌 비율입니다. 아무 때나 다 답하면 55.6%, 두 장 중 한 장꼴입니다. 1등 점수만 보고 골라 답하면 가장 자신 있는 10%여도 64.7%에 머뭅니다. 그런데 1등과 2등이 확실히 다를 때만 답하면 92.9%, 열 장 중 아홉 장입니다. 같은 AI, 같은 사진입니다.\n엘리베이터 안처럼 모양으로는 못 가리는 곳은 글자를 먼저 읽어 백 장 중 아흔일곱 장을 맞히고, 틀린 층을 말한 적은 없습니다. 그리고 이 AI 는 사진만 비교하던 처음 방식보다 2.7배 더 맞힙니다.'
$gx = $L + 44; $gy = 122; $gw = 470; $gh = 280
$ymin = 50; $ymax = 100
function GY([double]$v){ return $gy + $gh - ($v - $ymin) / ($ymax - $ymin) * $gh }
function GX([double]$c){ return $gx + ($c - 0.1) / 0.9 * $gw }
foreach($v in 50, 60, 70, 80, 90, 100){ $yy = GY $v; Ln $sl $gx $yy ($gx + $gw) $yy '1C2735' 0.75 | Out-Null; T $sl ($gx - 40) ($yy - 8) 32 14 ([string]$v + '%') 9 $DM -align 3 -font $NF | Out-Null }
foreach($c in 0.1, 0.3, 0.5, 0.7, 1.0){ $xx = GX $c; T $sl ($xx - 20) ($gy + $gh + 6) 40 14 ([string]([int]($c * 100)) + '%') 9 $DM -align 2 -font $NF | Out-Null }
T $sl $gx ($gy + $gh + 22) $gw 14 '답하는 비율 (확신 큰 것부터)' 9.5 $TX2 -align 2 | Out-Null
T $sl ($gx - 44) ($gy - 28) 120 14 '자리 정답률' 9.5 $TX2 | Out-Null
$covs = 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0
$gap = 92.9, 87.5, 83.2, 77.4, 73.8, 70.1, 65.9, 62.8, 58.9, 55.6
$top = 64.7, 64.8, 65.6, 64.2, 62.1, 61.6, 60.1, 59.1, 57.7, 55.6
for($i = 0; $i -lt 9; $i++){
  Ln $sl (GX $covs[$i]) (GY $top[$i]) (GX $covs[$i + 1]) (GY $top[$i + 1]) '7C8896' 2 | Out-Null
  Ln $sl (GX $covs[$i]) (GY $gap[$i]) (GX $covs[$i + 1]) (GY $gap[$i + 1]) $CY 3 | Out-Null
}
for($i = 0; $i -lt 10; $i++){ Oval $sl ((GX $covs[$i]) - 4) ((GY $gap[$i]) - 4) 8 $CY | Out-Null; Oval $sl ((GX $covs[$i]) - 3) ((GY $top[$i]) - 3) 6 '7C8896' | Out-Null }
Oval $sl ((GX 0.1) - 8) ((GY 92.9) - 8) 16 '' $CY 2.5 | Out-Null
T $sl ((GX 0.1) + 12) ((GY 92.9) - 14) 160 26 '[[92.9%]]' 20 $TX -bold -font $NF | Out-Null
T $sl ((GX 0.1) + 12) ((GY 64.7) - 26) 200 18 '64.7%  ~~1등 점수만 보면~~' 12 'A7B2BE' -bold -font $NF | Out-Null
T $sl ((GX 1.0) - 64) ((GY 55.6) + 6) 70 18 '55.6%' 12 $TX2 -bold -font $NF | Out-Null
T $sl ((GX 0.45)) ((GY 80) - 6) 220 18 '[[━]]  1등과 2등이 확실히 다를 때만' 10.5 $TX2 | Out-Null
$rx4 = 620; $rw4 = $W - $L - $rx4
$kp = @(@('10장 중 9장', '가장 확실한 10% — 자리 92.9% · 층 97.8%', $CY), @('100장 중 97장', '엘리베이터 안 층 — 글자 먼저 읽기 · 틀린 층 0건', $TX), @('2.7배', '사진만 비교(20.4%) → AI 비교(55.6%)', $TX))
for($i = 0; $i -lt 3; $i++){
  $y = 108 + $i * 102
  Box $sl $rx4 $y $rw4 90 $CARD $LN 1 12 | Out-Null
  T $sl ($rx4 + 18) ($y + 10) ($rw4 - 36) 40 $kp[$i][0] 28 $kp[$i][2] -bold -font $NF | Out-Null
  T $sl ($rx4 + 18) ($y + 54) ($rw4 - 36) 30 $kp[$i][1] 10 $TX2 -lines 1.3 | Out-Null
}
T $sl $L 452 $CWID 30 '~~시험 사진 1,844장 · 기준을 만든 촬영 묶음은 빼고 맞힘(38묶음) · 전체 자리 정답 55.6% (95% 구간 51.7 ~ 58.3%) · 2026-09-23 측정~~' 10 $DM | Out-Null

# ───────────────────────────────────────── 17 변화
$sl = Page 6 '우리가 만든 변화' '공대 3호관 길안내 도입으로 [[기대되는 효과]]' 55 '도입하면 무엇이 달라지는지입니다.\n숫자로 보면, 건물에 단 장치는 0대, 서버와 배포 비용은 0원이고, 네 문과 여섯 층에서 1,110가지 길을 한국어와 영어로 안내하며, 길안내 중에는 통신을 한 번도 쓰지 않습니다.\n사람으로 보면, 신입생은 시간표의 호실 번호만으로 문 앞까지 갑니다. 학부모와 유학생은 QR 한 번이면 설치도 가입도 없이 시작하고, 쉬운 사용모드와 영어 안내를 씁니다.\n학교는 호실이 옮겨지거나 공사가 있어도 안내판을 다시 만들 필요 없이, 이용자가 올린 사진을 승인만 하면 됩니다. 만든 사람이 졸업해도 안내가 계속 맞게 돌아갑니다.'
$kpi = @(@('0', '대', '건물에 단 장치'), @('0', '원', '서버 · 배포 비용'), @('1,110', '가지', '길 (한국어 · 영어)'), @('0', '회', '길안내 중 통신'))
$kw = ($CWID - 3 * 14) / 4
for($i = 0; $i -lt 4; $i++){
  $x = $L + $i * ($kw + 14)
  Box $sl $x 104 $kw 118 $CARD $LN 1 12 | Out-Null
  $t = T $sl ($x + 18) 116 ($kw - 36) 56 ($kpi[$i][0] + $kpi[$i][1]) 40 $CY -bold -font $NF
  $t.TextFrame.TextRange.Characters($kpi[$i][0].Length + 1, $kpi[$i][1].Length).Font.Size = 18
  $t.TextFrame.TextRange.Characters($kpi[$i][0].Length + 1, $kpi[$i][1].Length).Font.Color.RGB = (C $TX)
  T $sl ($x + 18) 180 ($kw - 36) 18 $kpi[$i][2] 11.5 $TX2 | Out-Null
}
$who = @(@('신입생', '시간표의 호실 번호 그대로', '검색 한 번 → 사진을 따라 문 앞까지'), @('학부모 · 유학생', 'QR 한 번 · 설치 · 가입 없이', '쉬운 사용모드 · English'), @('학과 · 학교', '공사 · 호실 이전이 있어도', '안내판 다시 만들 필요 없이\n사진 승인만'))
$ww = ($CWID - 2 * 14) / 3
for($i = 0; $i -lt 3; $i++){
  $x = $L + $i * ($ww + 14)
  Box $sl $x 238 $ww 170 $CARD $LN 1 12 | Out-Null
  T $sl ($x + 20) 256 ($ww - 40) 22 $who[$i][0] 17 $TX -bold | Out-Null
  T $sl ($x + 20) 292 ($ww - 40) 20 $who[$i][1] 12 $TX2 | Out-Null
  Ln $sl ($x + 20) 324 ($x + 40) 324 $CY 2 | Out-Null
  T $sl ($x + 20) 336 ($ww - 40) 60 $who[$i][2] 13 $CY -bold -lines 1.35 | Out-Null
}
T $sl $L 430 $CWID 30 '가장 큰 변화 — 만든 사람이 졸업해도, **이용자가 사진을 고쳐 가며** 안내가 계속 맞게 돌아갑니다.' 14 $TX2 | Out-Null

# ───────────────────────────────────────── 18 발전 방향
$sl = Page 7 '향후 발전 방향' '더 나은 서비스를 위한 [[다음 단계]]' 50 '다음 단계입니다. 지금 10월, 네 문과 지하 1층부터 5층까지의 길안내, 사진 제보와 AI 판정, 쉬운 사용모드와 영어, 사진 크게 보기까지 만들어 공개 주소로 운영하고 있습니다.\n11월 11일 완성까지는, QR 이 안 읽힐 때를 대비한 NFC 태그를 붙이고 — 지금 구매 승인을 기다리고 있습니다 — 3호관이 처음인 학생들로 실사용성 시험과 설문을 하고, 아이폰과 삼성 실제 기기로 점검합니다.\n그다음은 스토어 앱으로 감싸 AI 까지 오프라인으로 만들고, 같은 방식으로 다른 건물로 넓히는 것입니다.'
Ln $sl $L 132 ($L + $CWID) 132 $LN 2 | Out-Null
$tl = @(@('지금 · 10월', '운영 중', @('네 문 · 지하 1층~5층 길안내', '사진 제보 · AI 판정', '쉬운 사용모드 · English · 사진 크게 보기', '공개 주소로 운영 중'), $CY, $true),
        @('11월 · 11/11 완성', '다듬는다', @('NFC 태그 — QR이 안 읽힐 때 대비\n(구매 승인 대기)', '실사용성 시험 · 설문조사', '아이폰 · 삼성 실제 기기 점검'), $CY, $false),
        @('그다음', '넓힌다', @('스토어 앱으로 감싸\nAI까지 오프라인 (약 47MB)', '다른 건물로 — 좌표 · 사진 · QR만 새로', '3호관까지 오는 길 — 지도 앱 연결'), $PK, $false))
$tw4 = ($CWID - 2 * 22) / 3
for($i = 0; $i -lt 3; $i++){
  $x = $L + $i * ($tw4 + 22)
  $o = Oval $sl $x 123 18 $(if($tl[$i][4]){ $tl[$i][3] } else { $BG }) $tl[$i][3] 3
  T $sl $x 156 $tw4 16 $tl[$i][0] 10.5 $TX2 -bold -spacing 1 | Out-Null
  T $sl $x 176 $tw4 30 $tl[$i][1] 22 $(if($i -eq 2){ $PK } else { $TX }) -bold | Out-Null
  for($k = 0; $k -lt $tl[$i][2].Count; $k++){
    $y = 220 + $k * 48
    Box $sl $x $y 3 34 $tl[$i][3] | Out-Null
    T $sl ($x + 14) $y ($tw4 - 14) 40 $tl[$i][2][$k] 12 $TX2 -lines 1.3 -anchor 3 | Out-Null
  }
}
T $sl $L 440 $CWID 24 '목표는 하나 — 처음 온 사람이 [[누구에게도 묻지 않고]] 문 앞까지.' 15 $TX2 | Out-Null

# ───────────────────────────────────────── 19 마무리
$sl = Page 8 '마무리하며' '프로젝트 [[요약 및 결론]]' 50 '마무리하겠습니다. 저희는 네 가지 문제에 이렇게 답했습니다. 내 위치를 모르는 문제에는 들어온 문을 묻는 출입문 QR, 신호가 없는 문제에는 휴대폰에 통째로 담는 오프라인 길안내, 안내가 낡는 문제에는 이용자 제보와 확실할 때만 답하는 AI, 그리고 처음 온 사람에게는 쉬운 사용모드입니다.\n(잠깐 멈추고) 건물에 붙인 건 QR 네 장뿐입니다. 길안내는 전부 여러분의 주머니 속에 있습니다.\n(천천히) 안내판 찾지 마시고, 지나가는 사람 붙잡지 마시고, 와이파이 찾지 마시고 — 휴대폰 하나로 끝내시죠.'
$sm = @(@('내 위치를 모른다', '출입문 QR'), @('신호가 없다', '오프라인 길안내'), @('안내가 낡는다', '제보 +\n확실할 때만 답하는 AI'), @('앱이 문턱', '쉬운 사용모드 · English'))
$sw4 = ($CWID - 3 * 12) / 4
for($i = 0; $i -lt 4; $i++){
  $x = $L + $i * ($sw4 + 12)
  Box $sl $x 104 $sw4 86 $CARD $LN 1 10 | Out-Null
  T $sl ($x + 16) 116 ($sw4 - 32) 16 $sm[$i][0] 10.5 $PK -bold | Out-Null
  T $sl ($x + 16) 140 ($sw4 - 32) 40 $sm[$i][1] 13.5 $TX -bold -lines 1.25 | Out-Null
}
Blob $sl 300 220 420 $CY 0.9 | Out-Null
T $sl $L 232 $CWID 100 '건물에 붙인 건 [[QR 네 장뿐.]]\n길안내는 전부 [[여러분의 주머니 속]]에 있습니다.' 30 $TX -bold -lines 1.3 -spacing -0.6 | Out-Null
T $sl $L 354 $CWID 22 '안내판 찾지 마시고, 지나가는 사람 붙잡지 마시고, 와이파이 찾지 마시고 —' 16 $TX2 | Out-Null
T $sl $L 388 $CWID 40 '[[휴대폰 하나로 끝내시죠.]]' 28 $TX -bold -spacing -0.6 | Out-Null

# ───────────────────────────────────────── 20 Q&A
$script:pg++
$sl = $pres.Slides.Add($pres.Slides.Count + 1, 12); Bg $sl
Blob $sl 520 -160 560 $CY 0.88 | Out-Null
T $sl $L 132 440 16 '10    Q & A' 10 $TX2 -bold -spacing 2 | Out-Null
T $sl $L 156 440 80 'Q [[&]] A' 60 $TX -bold -font $NF | Out-Null
T $sl $L 244 440 24 '질의응답 — 들어 주셔서 감사합니다' 17 $TX2 | Out-Null
Box $sl $L 288 56 4 $CY | Out-Null
T $sl $L 308 440 44 '**공대 3호관 길안내** · 팀 공3길\n김민종 · 손의윤 · 문성일   |   지도교수 강규창 교수님' 12 $TX2 -lines 1.6 | Out-Null
T $sl $L 372 440 30 '지금, [[오른쪽 QR을 찍어 보십시오.]]' 18 $TX -bold | Out-Null
T $sl $L 404 440 20 '설치도 가입도 없이 — 찍는 순간 실시간 숫자가 올라갑니다.' 12 $TX2 | Out-Null
#   2026-10-27 사용자 : 「실제로 우리 앱을 연 사람을 세서, 발표 자료에 붙여 그때 열어야 한다」
#   → 가운데 = 발표장 QR(도구\QR_발표장_만들기.ps1 — 찍으면 site\live\go.html 이 숫자를 1 올리고 앱으로 넘김)
#     오른쪽 = 「● LIVE」 카드 : 슬라이드 쇼에서 누르면 실시간 화면(https://minjong0910.github.io/live/)이 브라우저로 열린다
$LIVEURL = 'https://minjong0910.github.io/live/'
$qh = 280; $qw = PhoneW 'QR_발표장.png' $qh
$sl.Shapes.AddPicture((Join-Path $IMG 'QR_발표장.png'), 0, -1, 468, 132, $qw, $qh) | Out-Null
$lx = 684; $lw = $L + $CWID - $lx
$lv = @()
$lv += Box $sl $lx 96 $lw 344 $CARD $LN 1 14
$lv += Pill $sl ($lx + 18) 116 64 20 '●  LIVE' $BG $PK 9 $PK -bold
$lv += T $sl ($lx + 18) 150 ($lw - 36) 18 '지금 이 발표장에서' 11.5 $TX2
$lv += T $sl ($lx + 18) 170 ($lw - 36) 80 '[[몇 명]]이\n열었을까요?' 26 $TX -bold -lines 1.15
$lv += T $sl ($lx + 18) 262 ($lw - 36) 40 'QR을 찍는 순간\n숫자가 실시간으로 올라갑니다' 11 $TX2 -lines 1.4
$btn = Box $sl ($lx + 18) 318 ($lw - 36) 44 $PK '' 1 8
$tf = $btn.TextFrame; $tf.MarginLeft = 4; $tf.MarginRight = 4; $tf.VerticalAnchor = 3; $tf.WordWrap = -1
Rich $tf.TextRange '▶  실시간 화면 열기' 13 'FFFFFF' $true $KF; $tf.TextRange.ParagraphFormat.Alignment = 2
$lv += $btn
$lv += T $sl ($lx + 18) 372 ($lw - 36) 30 '슬라이드 쇼에서 누르면 브라우저로 열려요\nF 전체 화면 · Esc 후 Alt+Tab 으로 돌아오기' 8 $DM -lines 1.35
$lv += T $sl ($lx + 18) 410 ($lw - 36) 16 'minjong0910.github.io/live' 8.5 $CY -font 'Consolas'
foreach($s in $lv){ $a = $s.ActionSettings.Item(1); $a.Action = 7; $a.Hyperlink.Address = $LIVEURL }T $sl ($W - $L - 120) 509 120 14 ('{0:D2} / {1}' -f $script:pg, $TOTAL) 8.5 $DM -align 3 -font $NF | Out-Null
SetNotes $sl 20 'Q&A' '들어 주셔서 감사합니다. 지금 가운데 QR 을 휴대폰 카메라로 찍어 보십시오. (LIVE 를 눌러 실시간 화면 → F) 찍는 순간 숫자가 올라갑니다.\n질문 받겠습니다.'

# ══ 저장 ══════════════════════════════════════════════════════
if($pres.Slides.Count -ne $TOTAL){ throw ('쪽 수가 ' + $TOTAL + ' 이 아닙니다 : ' + $pres.Slides.Count) }
if($script:tsum -gt 19 * 60){ throw ('발표 시간이 19분을 넘습니다 : ' + (Mmss $script:tsum)) }
WriteNotes
$pptx = Join-Path $OutDir ($NAME + '.pptx'); $pdf = Join-Path $OutDir ($NAME + '.pdf')
$pres.SaveAs($pptx, 24)
$pres.SaveAs($pdf, 32)
'저장 : ' + $pptx
} finally {
  try{ $pres.Close() }catch{}
  if($app.Presentations.Count -eq 0){ try{ $app.Quit() }catch{} }
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}
# ── 리허설 대본(.txt) — 쪽마다 시간 · 누적 · 대본, 그리고 대본 길이로 어림한 시간(1초에 4.6자)
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine(('졸업작품 발표 리허설 대본 — 공대 3호관 길안내 (20쪽 · 전체 {0} · 한도 20분)' -f (Mmss $script:tsum)))
[void]$sb.AppendLine('쪽 시간은 대본을 1초에 4자 빠르기로 읽고, 쪽을 넘기며 4초 쉬는 것으로 잡았습니다.')
[void]$sb.AppendLine('리허설에서 「누적」 시각보다 30초 넘게 늦으면, 다음 쪽 대본의 괄호 밖 설명을 줄이세요. ( ) 안은 행동 지시라 읽지 않습니다.')
[void]$sb.AppendLine('')
foreach($p in $script:plan){
  [void]$sb.AppendLine(('[{0:D2}] {1}' -f $p.n, $p.title))
  [void]$sb.AppendLine(('      이 쪽 {0}초 · 끝나는 시각 {1}' -f $p.secs, (Mmss $p.cum)))
  foreach($ln in ($p.text -split "`n")){ [void]$sb.AppendLine('      ' + $ln) }
  [void]$sb.AppendLine('')
}
[void]$sb.AppendLine(('합계 {0} — 20분까지 {1} 남음(질문 받기 전 여유)' -f (Mmss $script:tsum), (Mmss (1200 - $script:tsum))))
$txt = Join-Path $OutDir ($NAME + ' 리허설 대본.txt')
[IO.File]::WriteAllText($txt, $sb.ToString(), (New-Object System.Text.UTF8Encoding($true)))
'대본 : ' + $txt
('전체 {0}' -f (Mmss $script:tsum))
foreach($p in $script:plan){ ('{0:D2} {1,3}초 (대본 {2,3}초) 누적 {3}  {4}' -f $p.n, $p.secs, $p.est, (Mmss $p.cum), $p.title) }
if($Desktop){
  $dk = Join-Path ([Environment]::GetFolderPath('Desktop')) '졸업작품'
  New-Item -ItemType Directory -Force $dk | Out-Null
  Copy-Item $pptx (Join-Path $dk ($NAME + '.pptx')) -Force; Copy-Item $txt (Join-Path $dk ($NAME + ' 리허설 대본.txt')) -Force
  '바탕화면\졸업작품 에도 놓음'
}
