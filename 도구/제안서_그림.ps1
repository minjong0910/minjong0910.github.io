# 제안서용 그림 3장 — 「2026 NEXT WAVE-UP 아이디어 리그」 제안서(한글 표 안)에 넣는다
#
#   pwsh -File 도구\제안서_그림.ps1          (먼저 도구\사진별결과_CSV.ps1 을 돌려 둘 것)
#
#   ① 제안서그림1_개념도.png      — 출입문 QR → 안내 → 제보 → 판정(자리/층/보류) → 확정 → 갱신
#   ② 제안서그림2_앱화면.png      — 공개 배포 중인 앱의 실제 화면 5장 (도구\발표그림)
#   ③ 제안서그림3_격차정확도.png  — 답하는 비율별 자리 정확도, 격차 기준 vs 1위 점수 기준
#
#   ※ 크기 : 한글 표 칸 폭(약 150mm)에 넣었을 때 본문과 비슷한 9pt 이상이 되도록
#     캔버스 1000px 에 글자 19~22px 로 그린다. (1000px → 150mm 이면 20px ≒ 3mm ≒ 8.5pt)
#   ※ 색 : 발표 자료에서 검증한 두 계열 #1A6FB5(파랑) · #B4530F(호박) + 회색. 흑백 인쇄에서도
#     「자리/층/보류」가 글자로 구별되게 색에만 기대지 않는다.
#   ※ 흐름02_QR스캔.jpg 는 '카메라가 차단되어 있어요' 오류 화면이라 쓰지 않는다.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ROOT = Split-Path $PSScriptRoot -Parent
$GEN  = Join-Path $ROOT '생성물'
$PIC  = Join-Path $PSScriptRoot '발표그림'
$EDGE = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$FONT = "'Malgun Gothic','맑은 고딕',sans-serif"

# ── ① 개념도 ────────────────────────────────────────────────────
function Box($x, $y, $w, $h, $num, $title, $lines, $stroke = '#4A5560', $fill = '#F4F6F8'){
  $s = "<rect x='$x' y='$y' width='$w' height='$h' rx='10' fill='$fill' stroke='$stroke' stroke-width='2'/>"
  $tx = $x + 16
  if($num){
    $s += "<circle cx='$($x+30)' cy='$($y+30)' r='17' fill='#1E2227'/><text x='$($x+30)' y='$($y+37)' text-anchor='middle' class='n'>$num</text>"
    $tx = $x + 58
  }
  $s += "<text x='$tx' y='$($y+37)' class='h'>$title</text>"
  $ly = $y + 70
  foreach($l in $lines){ $s += "<text x='$($x+18)' y='$ly' class='b'>$l</text>"; $ly += 27 }
  return $s
}
function Arrow($x1, $y1, $x2, $y2, $c = '#4A5560'){ "<line x1='$x1' y1='$y1' x2='$x2' y2='$y2' stroke='$c' stroke-width='2.5' marker-end='url(#ah)'/>" }

$W1 = 1000
$g  = ''
# 1줄 : ① → ② → ③
$g += Box 30  20 290 120 '1' '진입' @('출입문 QR 촬영','→ 들어온 문·층 확정')
$g += Box 355 20 290 120 '2' '안내' @('폰에 저장된 자료로 안내','통신 없이 3D·실제 사진')
$g += Box 680 20 290 120 '3' '제보' @('안내 사진이 달라졌으면','찍어서 건의함에 올림')
$g += Arrow 320 80 352 80
$g += Arrow 645 80 677 80
# ④ 판정
$g += Arrow 825 140 825 178
$g += Box 30 182 940 92 '4' '판정 — 1위·2위 장소의 유사도 차이(격차)로 답의 수준을 고른다' @('사진 → 특징벡터 1,280차원 → 등록된 152곳과 비교 → 1위와 2위의 유사도 차이 계산')
# 세 갈래
$bx = @(30, 355, 680)
$g += Arrow 185 274 185 312
$g += Arrow 500 274 500 312
$g += Arrow 825 274 825 312
$g += Box $bx[0] 316 290 116 '' '격차 ≥ 0.22 → 자리 제시' @('「아마 여기예요 :','  4층 오른쪽 복도」') '#1A6FB5' '#E8F1FA'
$g += Box $bx[1] 316 290 116 '' '격차 ≥ 0.16 → 층만 제시' @('「4층 같아요 —','  자리는 확실하지 않아요」') '#B4530F' '#FBEEE4'
$g += Box $bx[2] 316 290 116 '' '그 밖 → 응답 보류' @('「번호판이 보이게','  한 장 더 찍어 주세요」') '#6B7684' '#EEF0F2'
# ⑤ 확정
$g += Arrow 185 432 185 470; $g += Arrow 500 432 500 470; $g += Arrow 825 432 825 470
$g += Box 30 474 940 92 '5' '확정 — 아래 셋 중 하나가 있을 때만 (AI 혼자서는 확정하지 않음)' @('번호판 글자 인식  ·  이용자 선택  ·  관리자 승인') '#1E2227' '#FFFFFF'
# ⑥ 갱신
$g += Arrow 500 566 500 604
$g += Box 30 608 940 70 '6' '갱신 — 확정된 장소의 안내 사진을 교체해 모든 이용자에게 배포' @()
# 되돌아가는 점선 : ⑥ → ②  (왼쪽 여백을 타고 올라가 ② 아래로)
$g += "<path d='M30,643 L12,643 L12,154 L470,154 L470,144' fill='none' stroke='#1A6FB5' stroke-width='2.5' stroke-dasharray='8 6' marker-end='url(#ahb)'/>"
$g += "<text x='26' y='177' class='loop'>안내가 스스로 최신화</text>"
$H1 = 690
$svg1 = @"
<svg xmlns='http://www.w3.org/2000/svg' width='$W1' height='$H1' viewBox='0 0 $W1 $H1'>
<defs>
 <marker id='ah'  markerWidth='10' markerHeight='10' refX='8' refY='5' orient='auto'><path d='M0,0 L10,5 L0,10 z' fill='#4A5560'/></marker>
 <marker id='ahb' markerWidth='10' markerHeight='10' refX='8' refY='5' orient='auto'><path d='M0,0 L10,5 L0,10 z' fill='#1A6FB5'/></marker>
</defs>
<style>
 text{font-family:$FONT}
 .n{font-size:19px;font-weight:700;fill:#fff}
 .h{font-size:21px;font-weight:700;fill:#15181C}
 .b{font-size:19px;fill:#2B3138}
 .loop{font-size:17px;font-weight:700;fill:#1A6FB5}
</style>
<rect width='100%' height='100%' fill='#FFFFFF'/>
$g
</svg>
"@

# ── ② 앱 화면 5장 ───────────────────────────────────────────────
$shots = @(
  @('흐름03_여기가맞나요.jpg', '① 출입문 QR → 들어온 문 확인'),
  @('흐름06_3D경로.jpg',       '② 3D 건물에 경로 표시'),
  @('흐름08_1단계.jpg',        '③ 실제 사진으로 한 단계씩'),
  @('흐름10_도착.jpg',         '④ 도착 — 「왼쪽 네 번째 방」'),
  @('흐름12_사진올림.jpg',     '⑤ 건의함 — 바뀐 곳 사진 제보')
)
$cells = ''
foreach($s in $shots){
  $src = ([Uri](Join-Path $PIC $s[0])).AbsoluteUri
  $cells += "<figure><img src='$src'><figcaption>$($s[1])</figcaption></figure>"
}
$html2 = @"
<style>
 body{margin:0;background:#fff;font-family:$FONT}
 .row{display:flex;gap:14px;padding:10px 12px 6px;width:976px}
 figure{margin:0;flex:1;text-align:center}
 img{width:100%;border-radius:10px;border:2px solid #2B3138;display:block}
 figcaption{font-size:19px;font-weight:700;color:#15181C;margin-top:8px;line-height:1.3;word-break:keep-all}
</style>
<div class='row'>$cells</div>
"@
$W2 = 1000; $H2 = 492

# ── ③ 격차 vs 1위 점수 곡선 ──────────────────────────────────────
$rows = Import-Csv (Join-Path $GEN '사진별_판정결과.csv') -Encoding UTF8 | ForEach-Object {
  [pscustomobject]@{ s1=[double]$_.top1_sim; gap=[double]$_.gap; e=[int]$_.place_correct } }
$n = $rows.Count
if($n -ne 1844){ throw "사진 수가 1844 가 아닙니다 : $n" }
function Curve($key){
  $s = @($rows | Sort-Object -Property $key -Descending -Stable)
  $pts = @(); $acc = 0; $next = 1
  for($i = 0; $i -lt $n; $i++){
    $acc += $s[$i].e
    while($next -le 100 -and $i + 1 -ge [int][Math]::Round($n * $next / 100.0)){
      $pts += ,@($next, (100.0 * $acc / ($i + 1))); $next++     # 쉼표가 나눗셈보다 먼저 묶이므로 괄호 필수
    }
  }
  return ,$pts
}
$cg = Curve 'gap'; $cs = Curve 's1'
function At($c, $p){ ($c | Where-Object { $_[0] -eq $p })[1] }
$g10 = At $cg 10; $s10 = At $cs 10; $all = At $cg 100
$chk = @(('{0:N1}' -f $g10), ('{0:N1}' -f $s10), ('{0:N1}' -f $all))
if(($chk -join '/') -ne '92.9/64.7/55.6'){ throw "발표 숫자와 다릅니다 : $($chk -join '/')" }

$W3 = 1000; $H3 = 500; $L = 84; $R = 30; $T = 24; $B = 74
$pw = $W3 - $L - $R; $ph = $H3 - $T - $B
function X($p){ $L + $pw * ($p - 1) / 99.0 }
function Y($v){ $T + $ph * (1 - ($v - 40) / 60.0) }
function Path($c){ ($c | ForEach-Object { '{0:N1},{1:N1}' -f (X $_[0]), (Y $_[1]) }) -join ' ' }
$grid = ''
foreach($v in 40,50,60,70,80,90,100){
  $grid += "<line x1='$L' x2='$($W3-$R)' y1='$(Y $v)' y2='$(Y $v)' stroke='#E3E7EC' stroke-width='1'/>"
  $grid += "<text x='$($L-10)' y='$((Y $v)+6)' text-anchor='end' class='ax'>$v%</text>"
}
foreach($p in 10,20,30,40,50,60,70,80,90,100){ $grid += "<text x='$(X $p)' y='$($H3-$B+30)' text-anchor='middle' class='ax'>$p%</text>" }
$dots = ''
foreach($p in 20,30,50){ $dots += "<circle cx='$(X $p)' cy='$(Y (At $cg $p))' r='5' fill='#1A6FB5' stroke='#fff' stroke-width='2'/>" }
$svg3 = @"
<svg xmlns='http://www.w3.org/2000/svg' width='$W3' height='$H3' viewBox='0 0 $W3 $H3'>
<style>text{font-family:$FONT}.ax{font-size:19px;fill:#4A5560}.l{font-size:21px;font-weight:700}.s{font-size:19px;fill:#2B3138}</style>
<rect width='100%' height='100%' fill='#FFFFFF'/>
$grid
<text x='$($L + $pw/2)' y='$($H3-10)' text-anchor='middle' class='ax'>답하는 사진 비율 (확신이 큰 순서로 위에서부터)</text>
<polyline points='$(Path $cs)' fill='none' stroke='#B4530F' stroke-width='3.5'/>
<polyline points='$(Path $cg)' fill='none' stroke='#1A6FB5' stroke-width='3.5'/>
$dots
<circle cx='$(X 10)' cy='$(Y $g10)' r='7' fill='#1A6FB5' stroke='#fff' stroke-width='2'/>
<circle cx='$(X 10)' cy='$(Y $s10)' r='7' fill='#B4530F' stroke='#fff' stroke-width='2'/>
<circle cx='$(X 100)' cy='$(Y $all)' r='7' fill='#4A5560' stroke='#fff' stroke-width='2'/>
<text x='$((X 10)+14)' y='$((Y $g10)-10)' class='l' fill='#1A6FB5'>격차 기준 $('{0:N1}' -f $g10)%</text>
<text x='$((X 10)+14)' y='$((Y $s10)+44)' class='l' fill='#B4530F'>1위 점수 기준 $('{0:N1}' -f $s10)%</text>
<text x='$((X 100)-12)' y='$((Y $all)+34)' text-anchor='end' class='l' fill='#4A5560'>전부 답하면 $('{0:N1}' -f $all)%</text>
<rect x='$($W3-$R-330)' y='$($T+14)' width='22' height='5' fill='#1A6FB5'/><text x='$($W3-$R-300)' y='$($T+23)' class='s'>격차 기준 (1위−2위 유사도 차이)</text>
<rect x='$($W3-$R-330)' y='$($T+44)' width='22' height='5' fill='#B4530F'/><text x='$($W3-$R-300)' y='$($T+53)' class='s'>1위 점수 기준 (비교용)</text>
</svg>
"@

# ── PNG 로 찍기 ──────────────────────────────────────────────────
$prof = Join-Path $env:TEMP ('edge_fig_' + [guid]::NewGuid().ToString('N').Substring(0,8))
function Shot($body, $w, $h, $name){
  $html = Join-Path $env:TEMP "$name.html"
  [IO.File]::WriteAllText($html, "<!doctype html><meta charset='utf-8'><style>html,body{margin:0;background:#fff}</style>$body", (New-Object Text.UTF8Encoding($false)))
  $png = Join-Path $GEN "$name.png"
  if(Test-Path $png){ Remove-Item $png -Force }
  & $EDGE --headless=new --disable-gpu --no-first-run "--user-data-dir=$prof" --hide-scrollbars --force-device-scale-factor=2 `
    --allow-file-access-from-files "--window-size=$w,$h" "--screenshot=$png" ([Uri]$html).AbsoluteUri 2>$null | Out-Null
  $tries = 0; while(-not (Test-Path $png) -and $tries -lt 40){ Start-Sleep -Milliseconds 250; $tries++ }
  if(-not (Test-Path $png)){ throw "PNG 를 만들지 못했습니다 : $name" }
  Remove-Item $html -Force -ErrorAction SilentlyContinue
  Write-Host ("  {0}.png  {1}×{2}  {3:N0} 바이트" -f $name, ($w*2), ($h*2), (Get-Item $png).Length)
}
try {
  Shot $svg1  $W1 $H1 '제안서그림1_개념도'
  Shot $html2 $W2 $H2 '제안서그림2_앱화면'
  Shot $svg3  $W3 $H3 '제안서그림3_격차정확도'
} finally {
  for($i = 0; $i -lt 10 -and (Test-Path -LiteralPath $prof); $i++){ try { Remove-Item -LiteralPath $prof -Recurse -Force -ErrorAction Stop } catch { Start-Sleep -Milliseconds 300 } }
}
