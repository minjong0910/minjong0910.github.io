# 엘리베이터 폴더(EV1~EV5)를 세 갈래로 나눈다.
#
#   EV#   : 엘리베이터 문·호출버튼이 사진의 주인공인 것만 남긴다
#   LNG#  : 그 앞의 열린 공간 (2~5층 = 라운지, 1층 = 로비)
#   EVIN# : 엘리베이터 '안'에서 찍은 사진 (폴더를 잘못 들어가 있었다)
#
#   남길 목록은 도구\라운지_EV유지_N.txt 에 파일 이름 한 줄씩 적어 둔다.
#   옮긴 내역은 도구\라운지_이동기록.csv 에 남기므로 되돌릴 수 있다.
#
#   사용법 : pwsh -File 라운지_분리.ps1            (실제로 옮김)
#            pwsh -File 라운지_분리.ps1 -WhatIf2   (옮기지 않고 결과만 본다)
param([switch]$WhatIf2)
$ErrorActionPreference = 'Stop'
$BASE = 'D:\군산대\사진원본'
$TOOL = 'D:\군산대\도구'
$LOG  = Join-Path $TOOL '라운지_이동기록.csv'

$rows = New-Object System.Collections.ArrayList
function Plan($from, $to){ [void]$rows.Add([pscustomobject]@{ from=$from; to=$to }) }

foreach($n in 1..5){
  $src  = Join-Path $BASE "EV$n"
  $keepFile = Join-Path $TOOL "라운지_EV유지_$n.txt"
  if(-not (Test-Path $keepFile)){ throw "남길 목록이 없습니다: $keepFile" }
  $keep = @(Get-Content -LiteralPath $keepFile -Encoding UTF8 | ForEach-Object { $_.Trim() } | Where-Object { $_ })

  $word = if($n -eq 1){ '로비' } else { '라운지' }
  $rep  = 0

  foreach($f in (Get-ChildItem $src -File | Sort-Object Name)){
    if($keep -contains $f.Name){ continue }                 # EV# 에 그대로 둔다

    # 파일 이름 끝의 짧은 번호(e035 · d031 · b068 · 014 · v03 …)를 꼬리표로 쓴다
    $stem = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
    $tail = ($stem -split '-')[-1]
    if($tail -notmatch '^[A-Za-z]?\d{2,4}$'){ $rep++; $tail = ('대표{0:D2}' -f $rep) }

    if($f.Name -match '엘리베이터\s*안'){
      $dst = Join-Path $BASE "EVIN$n"
      $new = "{0}층-EVIN{0}-엘리베이터안-{1}.jpg" -f $n, $tail
    } else {
      $dst = Join-Path $BASE "LNG$n"
      $new = "{0}층-LNG{0}-{1}-{2}.jpg" -f $n, $word, $tail
    }
    Plan $f.FullName (Join-Path $dst $new)
  }
}

# ── 이름이 겹치지 않는지 먼저 확인한다 ──────────────────────────
$dups = $rows | Group-Object to | Where-Object { $_.Count -gt 1 }
if($dups){ $dups | ForEach-Object { Write-Host ('  겹침: ' + $_.Name) -ForegroundColor Red }; throw '옮길 이름이 겹칩니다' }
foreach($r in $rows){ if(Test-Path $r.to){ throw ('이미 있는 파일: ' + $r.to) } }

$rows | Group-Object { Split-Path (Split-Path $_.to -Parent) -Leaf } |
  Sort-Object Name | ForEach-Object { Write-Host ('  {0,-7} {1,3} 장' -f $_.Name, $_.Count) }

if($WhatIf2){ Write-Host '  (연습 모드 — 옮기지 않았습니다)' -ForegroundColor Yellow; return }

foreach($n in 1..5){
  foreach($p in @("LNG$n")){
    $d = Join-Path $BASE $p
    if(-not (Test-Path $d)){ New-Item -ItemType Directory -Path $d | Out-Null }
  }
}
foreach($r in $rows){ Move-Item -LiteralPath $r.from -Destination $r.to }
$rows | Export-Csv -LiteralPath $LOG -NoTypeInformation -Encoding UTF8
Write-Host ("  옮김 {0} 장 · 기록 {1}" -f $rows.Count, (Split-Path $LOG -Leaf)) -ForegroundColor Green
