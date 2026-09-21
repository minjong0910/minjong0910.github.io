# v76 — 장소 목록에서 눈에 거슬리는 세 가지를 정리한다
#
#   v75 를 띄워 보니 목록이 이렇게 나왔다.
#     · '지하 1층'을 고르면 "지하 1층" 하나뿐이고, 지하 엘리베이터는 '기타'에 가 있다
#       (aidFloorOf 의 정규식이 EV 뒤에 숫자를 요구해서 EVB1 이 어디에도 안 걸렸다)
#     · '건물 외부'를 고르면 "동문"이 두 번, "서문"이 두 번 나온다
#       (같은 문이 GATE_E 와 GATE_EAST 두 이름으로 들어 있다. 사진이 실제로 붙는
#        쪽은 GATE_EAST/GATE_WEST 라서, 관리자가 GATE_E 를 고르면 승인해도
#        안내 화면에는 아무 변화가 없다 — 조용한 실패다)
#     · 지하 홀(B1)이 '그 밖'에 있다. 크리에이티브 존이니 라운지 쪽이 맞다
#
#   사용법 : pwsh -File patch_v76.ps1 <대상파일>
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

# ── 1. 지하 엘리베이터를 지하 1층으로 ───────────────────────────
Swap @'
  if(c === 'B1') return '지하 1층';
  if(c === 'BLD') return '건물 외부';
  if(c === 'KTC') return '4층';
'@ @'
  if(c === 'B1' || c === 'EVB1') return '지하 1층';                 /* v76 : EVB1 이 '기타'로 빠졌다 */
  if(c === 'BLD') return '건물 외부';
  if(c === 'KTC') return '4층';
'@ '지하 엘리베이터 층'

# ── 2. 지하 홀은 라운지 쪽으로 ──────────────────────────────────
Swap @'
  {t:'라운지·로비',   rx:/^LNG[1-5]$/},
'@ @'
  {t:'라운지·로비',   rx:/^(LNG[1-5]|B1)$/},
'@ '지하 홀 묶음'

# ── 3. 같은 문이 두 번 나오지 않게 ──────────────────────────────
Swap @'
  var mine = all.filter(function(c){ return sugFloorOf(c) === floor; });
'@ @'
  var mine = all.filter(function(c){ return sugFloorOf(c) === floor; });
  /* v76 : 동문·서문이 GATE_E 와 GATE_EAST 두 이름으로 들어 있다.
     승인한 사진이 실제로 붙는 쪽(ROOM_PHOTOS 가 쓰는 이름)만 남긴다.
     짧은 쪽을 고르면 승인해도 안내 화면이 그대로여서 알아채기 어렵다. */
  mine = mine.filter(function(c){
    if(c === 'GATE_E' && mine.indexOf('GATE_EAST') >= 0) return false;
    if(c === 'GATE_W' && mine.indexOf('GATE_WEST') >= 0) return false;
    return true;
  });
'@ '문 이름 중복 없애기'

# ── 4. 긴 표기도 접수 범위 안에 ─────────────────────────────────
Swap @'
      if(code === 'EVB1' || /^GATE_(MAIN|BACK|E|W)$/.test(code)) return true;
'@ @'
      if(code === 'EVB1' || /^GATE_(MAIN|BACK|EAST|WEST|E|W)$/.test(code)) return true;  /* v76 */
'@ '접수 범위(문)'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
