# v72 — 층마다 라운지를 새 장소로 만든다 (LNG1~LNG5)
#
#   그동안 EV1~EV5(엘리베이터 앞) 폴더에는 엘리베이터 문이 보이지도 않는
#   라운지·로비 사진이 217장 중 179장이나 섞여 있었다. 그래서
#     · AI 가 라운지 사진을 "엘리베이터 앞"이라고 답했고
#     · 제보를 승인해도 안내가 엉뚱한 곳을 가리켰다.
#   사진을 LNG1~LNG5 로 갈라냈으므로, 앱도 이 코드를 알아야 한다.
#   (안 넣으면 SCOPE.allow 가 막아서 "범위 밖"으로 제보가 거절된다 — v65 와 같은 사고)
#
#   1층은 라운지라기보다 로비(안내실·출입문)라서 이름만 다르게 붙인다.
#
#   사용법 : pwsh -File patch_v72.ps1 <대상파일>
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

# ── 1. 건의함 접수 범위에 넣는다 ────────────────────────────────
Swap @'
      if(/^(EVIN|SIGN|EMS|WIN)[1-5]$/.test(code)) return true;
'@ @'
      if(/^(EVIN|SIGN|EMS|WIN)[1-5]$/.test(code)) return true;
      if(/^LNG[1-5]$/.test(code)) return true;                  /* v72 : 층별 라운지(1층은 로비) */
'@ '접수 범위에 라운지 추가'

# ── 2. 사람이 읽는 이름 ─────────────────────────────────────────
Swap @'
    if(/^EVIN\d$/.test(code)) return code.slice(4) + (ko()?'층 엘리베이터 안':'F inside elevator');
'@ @'
    if(/^EVIN\d$/.test(code)) return code.slice(4) + (ko()?'층 엘리베이터 안':'F inside elevator');
    /* v72 : 1층은 라운지가 아니라 로비(안내실·정문)다 */
    if(code === 'LNG1')       return ko()?'1층 로비':'1F lobby';
    if(/^LNG\d$/.test(code))  return code.slice(3) + (ko()?'층 라운지':'F lounge');
'@ '라운지 이름'

# ── 3. 몇 층인지 ────────────────────────────────────────────────
Swap @'
    var m = code.match(/^(?:EVIN|EMS|SIGN|WIN|EV|HALL|WC|ES)([1-5])/); if(m) return m[1]+'층';
'@ @'
    var m = code.match(/^(?:EVIN|EMS|SIGN|WIN|LNG|EV|HALL|WC|ES)([1-5])/); if(m) return m[1]+'층';
'@ '층 계산'

# ── 4. '복도처럼 열린 곳' 취급 ──────────────────────────────────
#   라운지는 호실이 아니라 열린 공간이다. 여기서 찍은 사진에 멀리 번호판이
#   찍혀 있어도 그 번호를 위치로 삼으면 안 된다 — EV 와 같은 규칙을 쓴다.
Swap @'
  function isCorridor(code){ return /^(HALL|EV|WC|ES|EMS|SIGN|WIN)/.test(String(code||'').toUpperCase()); }
'@ @'
  function isCorridor(code){ return /^(HALL|EV|WC|ES|EMS|SIGN|WIN|LNG)/.test(String(code||'').toUpperCase()); }
'@ '열린 공간 취급'

# ── 5. 관리자가 메모에 적은 코드도 알아듣게 ─────────────────────
Swap @'
  m = up.match(/(?:^|[^A-Z0-9])(HALL[1-5][LR]|EV[1-5]|WC[1-5]|ES[1-5]|BLD|KTC)(?![A-Z0-9])/); if(m) return m[1];
'@ @'
  m = up.match(/(?:^|[^A-Z0-9])(HALL[1-5][LR]|LNG[1-5]|EV[1-5]|WC[1-5]|ES[1-5]|BLD|KTC)(?![A-Z0-9])/); if(m) return m[1];
'@ '메모에서 코드 읽기'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
