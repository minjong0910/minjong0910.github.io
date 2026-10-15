# 데이터레시피 「분석 결과 예시」 그래프 2장 — 생성물\사진별_판정결과.csv 로 그린다
#
#   pwsh -File 도구\레시피_그래프.ps1          (먼저 도구\사진별결과_CSV.ps1 을 돌려 둘 것)
#
#   ① 답하는 비율별 자리 정확도 — 격차 기준 vs 1위 점수 기준
#   ② 자리 종류별 정확도 — 자리 / 층
#   SVG 를 HTML 에 넣고 Edge 로 찍어 PNG 를 만든다(파이썬 없이).
#   색은 발표 자료에서 검증한 두 계열 그대로 : #1A6FB5(파랑) · #B4530F(호박) — 흰 바탕 대비·색각 검사 통과.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ROOT = Split-Path $PSScriptRoot -Parent
$GEN  = Join-Path $ROOT '생성물'
$EDGE = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

$rows = Import-Csv (Join-Path $GEN '사진별_판정결과.csv') -Encoding UTF8 | ForEach-Object {
  [pscustomobject]@{ type=$_.place_type; s1=[double]$_.top1_sim; gap=[double]$_.gap; e=[int]$_.place_correct; f=[int]$_.floor_correct } }
$n = $rows.Count
if($n -ne 1844){ throw "사진 수가 1844 가 아닙니다 : $n" }

# ── ① 곡선 : 상위 k% 만 답할 때의 자리 정확도 ───────────────────────
function Curve($key){
  $s = @($rows | Sort-Object -Property $key -Descending -Stable)
  $pts = @(); $acc = 0; $next = 1
  for($i = 0; $i -lt $n; $i++){
    $acc += $s[$i].e
    $pct = [Math]::Round(100.0 * ($i + 1) / $n, 6)
    while($next -le 100 -and $i + 1 -ge [int][Math]::Round($n * $next / 100.0)){
      $pts += ,@($next, (100.0 * $acc / ($i + 1))); $next++   # 쉼표가 나눗셈보다 먼저 묶이므로 괄호 필수
    }
  }
  return ,$pts
}
$cg = Curve 'gap'; $cs = Curve 's1'
function At($c, $p){ ($c | Where-Object { $_[0] -eq $p })[1] }
$g10 = At $cg 10; $s10 = At $cs 10; $all = At $cg 100
Write-Host ("  상위 10% : 격차 {0:N1}% · 1위 점수 {1:N1}% · 전체 {2:N1}%" -f $g10, $s10, $all)

$W = 1000; $H = 600; $L = 90; $R = 40; $T = 70; $B = 80
$pw = $W - $L - $R; $ph = $H - $T - $B
function X($p){ $L + $pw * ($p - 1) / 99.0 }
function Y($v){ $T + $ph * (1 - ($v - 40) / 60.0) }        # 세로축 40~100%
function Path($c){ ($c | ForEach-Object { '{0:N1},{1:N1}' -f (X $_[0]), (Y $_[1]) }) -join ' ' }
$grid = ''
foreach($v in 40,50,60,70,80,90,100){
  $grid += "<line x1='$L' x2='$($W-$R)' y1='$(Y $v)' y2='$(Y $v)' stroke='#E3E7EC' stroke-width='1'/>"
  $grid += "<text x='$($L-12)' y='$((Y $v)+5)' text-anchor='end' class='ax'>$v%</text>"
}
foreach($p in 10,20,30,40,50,60,70,80,90,100){
  $grid += "<text x='$(X $p)' y='$($H-$B+28)' text-anchor='middle' class='ax'>$p%</text>"
}
$svg1 = @"
<svg xmlns='http://www.w3.org/2000/svg' width='$W' height='$H' viewBox='0 0 $W $H'>
<style>.ax{font:15px 'Malgun Gothic';fill:#4A5560}.t{font:bold 22px 'Malgun Gothic';fill:#15181C}.l{font:bold 16px 'Malgun Gothic'}.s{font:14px 'Malgun Gothic';fill:#4A5560}</style>
<rect width='100%' height='100%' fill='#FFFFFF'/>
<text x='$L' y='34' class='t'>답하는 사진 비율별 자리 정확도 (사진 1,844장)</text>
<text x='$L' y='56' class='s'>확신이 큰 순서로 줄 세워 위에서부터 그 비율만 답할 때 — 나머지는 「모름」으로 사람에게 넘김</text>
$grid
<text x='$($L + $pw/2)' y='$($H-18)' text-anchor='middle' class='ax'>답하는 사진 비율 (확신 큰 순)</text>
<polyline points='$(Path $cs)' fill='none' stroke='#B4530F' stroke-width='3'/>
<polyline points='$(Path $cg)' fill='none' stroke='#1A6FB5' stroke-width='3'/>
<circle cx='$(X 10)' cy='$(Y $g10)' r='6' fill='#1A6FB5' stroke='#fff' stroke-width='2'/>
<circle cx='$(X 10)' cy='$(Y $s10)' r='6' fill='#B4530F' stroke='#fff' stroke-width='2'/>
<circle cx='$(X 100)' cy='$(Y $all)' r='6' fill='#4A5560' stroke='#fff' stroke-width='2'/>
<text x='$((X 10)+12)' y='$((Y $g10)-8)' class='l' fill='#1A6FB5'>격차 기준 $('{0:N1}' -f $g10)%</text>
<text x='$((X 10)+12)' y='$((Y $s10)+46)' class='l' fill='#B4530F'>1위 점수 기준 $('{0:N1}' -f $s10)%</text>
<text x='$((X 100)-10)' y='$((Y $all)+26)' text-anchor='end' class='l' fill='#4A5560'>전부 답하면 $('{0:N1}' -f $all)%</text>
<rect x='$($W-$R-260)' y='$($T+8)' width='16' height='4' fill='#1A6FB5'/><text x='$($W-$R-238)' y='$($T+15)' class='s'>격차 기준 (1위−2위 유사도 차이)</text>
<rect x='$($W-$R-260)' y='$($T+32)' width='16' height='4' fill='#B4530F'/><text x='$($W-$R-238)' y='$($T+39)' class='s'>1위 점수 기준 (비교용)</text>
</svg>
"@

# ── ② 자리 종류별 정확도 ───────────────────────────────────────────
$byType = $rows | Group-Object type | ForEach-Object {
  $c = $_.Count
  [pscustomobject]@{ type=$_.Name; n=$c; e=100.0*($_.Group | Measure-Object e -Sum).Sum/$c; f=100.0*($_.Group | Measure-Object f -Sum).Sum/$c } } |
  Sort-Object n -Descending
$W2 = 1000; $rowH = 46; $T2 = 92; $L2 = 230; $R2 = 60
$H2 = $T2 + $rowH * $byType.Count + 50
$pw2 = $W2 - $L2 - $R2
$bars = ''; $yy = $T2
foreach($ty in $byType){
  $we = $pw2 * $ty.e / 100; $wf = $pw2 * $ty.f / 100
  $bars += "<text x='$($L2-12)' y='$($yy+20)' text-anchor='end' class='c'>$($ty.type)</text>"
  $bars += "<text x='$($L2-12)' y='$($yy+37)' text-anchor='end' class='s'>$($ty.n)장</text>"
  $bars += "<rect x='$L2' y='$($yy+4)' width='$('{0:N1}' -f $wf)' height='16' rx='3' fill='#B4530F'/>"
  $bars += "<rect x='$L2' y='$($yy+22)' width='$('{0:N1}' -f $we)' height='16' rx='3' fill='#1A6FB5'/>"
  $bars += "<text x='$($L2+$wf+6)' y='$($yy+17)' class='s'>$('{0:N1}' -f $ty.f)%</text>"
  $bars += "<text x='$($L2+$we+6)' y='$($yy+35)' class='s'>$('{0:N1}' -f $ty.e)%</text>"
  $yy += $rowH
}
$svg2 = @"
<svg xmlns='http://www.w3.org/2000/svg' width='$W2' height='$H2' viewBox='0 0 $W2 $H2'>
<style>.c{font:bold 15px 'Malgun Gothic';fill:#15181C}.s{font:13px 'Malgun Gothic';fill:#4A5560}.t{font:bold 22px 'Malgun Gothic';fill:#15181C}</style>
<rect width='100%' height='100%' fill='#FFFFFF'/>
<text x='40' y='34' class='t'>자리 종류별 정확도 (모든 사진에 답할 때, 사진 1,844장)</text>
<rect x='40' y='52' width='16' height='12' rx='2' fill='#B4530F'/><text x='62' y='63' class='s'>층을 맞힘</text>
<rect x='150' y='52' width='16' height='12' rx='2' fill='#1A6FB5'/><text x='172' y='63' class='s'>자리까지 맞힘</text>
$bars
</svg>
"@

# ── PNG 로 찍기 ──────────────────────────────────────────────────
$prof = Join-Path $env:TEMP 'edge_shot_profile'
function Shot($svg, $w, $h, $name){
  $html = Join-Path $env:TEMP "$name.html"
  [IO.File]::WriteAllText($html, "<!doctype html><meta charset='utf-8'><style>html,body{margin:0;background:#fff}</style>$svg", (New-Object Text.UTF8Encoding($false)))
  $png = Join-Path $GEN "$name.png"
  if(Test-Path $png){ Remove-Item $png -Force }
  & $EDGE --headless=new --disable-gpu --no-first-run "--user-data-dir=$prof" --hide-scrollbars --force-device-scale-factor=2 `
    "--window-size=$w,$h" "--screenshot=$png" ([Uri]$html).AbsoluteUri 2>$null | Out-Null
  $tries = 0; while(-not (Test-Path $png) -and $tries -lt 40){ Start-Sleep -Milliseconds 250; $tries++ }
  if(-not (Test-Path $png)){ throw "PNG 를 만들지 못했습니다 : $name" }
  Write-Host ("  {0}.png  {1:N0} 바이트" -f $name, (Get-Item $png).Length)
}
Shot $svg1 $W $H '레시피그래프1_답하는비율별정확도'
Shot $svg2 $W2 $H2 '레시피그래프2_자리종류별정확도'
