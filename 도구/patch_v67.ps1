# v67 — 사진 비교에서 번호판 조각 시점을 뺀다
#
#   v58 부터 사진 한 장을 세 시점(번호판 조각 · 정사각 1.0 · 정사각 0.6)으로 비교했다.
#   그런데 번호판 조각은 숫자만 빼면 어느 층이든 똑같이 생겨서, 복도·화장실·창밖 사진에서
#   다른 층의 같은 자리를 끌어왔다. 번호판은 이제 글자 읽기(v66)가 맡는다.
#
#   실측 (다른 조원이 찍은 사진으로 맞히기, 강의실 제외 1,468장)
#                         정확한 자리        층              5등 안
#       전체               41.1% → 46.0%    55.0% → 57.2%   71.6% → 74.9%
#       복도               37.6% → 44.0%    53.8% → 55.8%   70.5% → 74.8%
#       화장실              15.6% → 31.3%    15.6% → 34.4%   50.0% → 59.4%
#       엘리베이터 앞        57.4% → 55.7%    67.4% → 65.2%   75.7% → 75.7%
#     강의실 (한 장씩 빼고 맞히기, 214장) : 6.1% → 4.2% · 5등 안 25.2% → 17.3%
#       — 강의실은 사진 모양으로는 원래 거의 못 맞히고 번호판 글자로 맞히는 곳이다.
#
#   고치는 곳 (두 군데)
#     ① 원본 index.html 의 loadVectors : 내장 기준(aivec.js)에서 번호판 조각 벡터를 걸러낸다.
#        aivec 은 사진마다 벡터가 이어져 있고, 3개짜리 사진의 첫 벡터가 번호판 조각이다
#        (1,753장 중 1,350장 → 벡터 4,856 개 중 1,350 개를 뺀다). aivec.js 는 다시 만들 필요 없다.
#     ② 빌드 스크립트 patch_v58.ps1 의 aiViews : 질의·새로 배우는 사진에서 번호판 조각을 만들지 않는다.
#        (aiViews 는 빌드 때 끼워 넣는 코드라 거기서 고쳤다 — 이 스크립트는 ① 만 한다)
#
#   사용법 : pwsh -File patch_v67.ps1 <대상파일>
param([string]$Target)
$ErrorActionPreference = 'Stop'
if(-not (Test-Path $Target)){ throw "파일이 없습니다: $Target" }
$s = [System.IO.File]::ReadAllText($Target, [System.Text.Encoding]::UTF8)
$n = 0
function Swap([string]$old, [string]$new, [string]$label){
  $script:n++
  $old = $old -replace "`r`n", "`n"; $new = $new -replace "`r`n", "`n"
  $c = ([regex]::Matches($script:s, [regex]::Escape($old))).Count
  if($c -ne 1){ throw ("[{0}] 앵커가 {1}개" -f $label, $c) }
  $script:s = $script:s.Replace($old, $new)
  Write-Host ("  [OK] {0}" -f $label) -ForegroundColor Green
}

Swap @'
        for(var k=0;k<DIM;k++) v[k] /= s;      // 양자화 오차 보정용 재정규화
        REF.push(v);
      }
      return true;
'@ @'
        for(var k=0;k<DIM;k++) v[k] /= s;      // 양자화 오차 보정용 재정규화
        REF.push(v);
      }
      /* v67 : 번호판 조각 시점은 비교에서 뺀다 — 숫자만 빼면 어느 층이든 똑같이 생겨서
         다른 층 복도를 끌어왔다 (다른 조원 사진 1,468장 : 정확한 자리 41.1% → 46.0%).
         aivec 은 사진마다 벡터가 이어져 있고, 3개짜리 사진의 첫 벡터가 번호판 조각이다. */
      if(d.views && d.views[0] === 'plate' && NAMES.length === REF.length && CODES.length === REF.length){
        var kr = [], kc = [], kn = [];
        for(var t=0; t<REF.length; t++){
          var nm = NAMES[t];
          if(nm && NAMES[t+1] === nm && NAMES[t+2] === nm && NAMES[t-1] !== nm) continue;   // 번호판 조각
          kr.push(REF[t]); kc.push(CODES[t]); kn.push(nm);
        }
        REF = kr; CODES = kc; NAMES = kn;
      }
      return true;
'@ '내장 기준에서 번호판 조각 빼기'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
