# v65 — 앱이 모르던 장소 이름을 받아들이게 한다
#
#   사진을 모으면서 이런 장소를 새로 만들었다.
#     EVIN1~5   엘리베이터 안 (문 위 층수 표시기)
#     SIGN1~5   층별 비상대피 안내판
#     WIN2~5 · WIN5L · WIN5R   창밖
#     EMS1~5    비상계단
#     EVB1      지하 1층 엘리베이터
#     GATE_BACK · GATE_E · GATE_W · GATE_MAIN   출입문
#   그런데 앱의 허용 목록(SCOPE.allow)에 이 이름들이 없었다.
#   그래서 AI 가 이 장소를 1등으로 고르면 제보가
#     "건의함이 받는 범위(지하 1층~5층·출입문) 밖이라 접수하지 않았어요."
#   로 거절됐다. (4층 비상대피 안내판 사진으로 실제로 확인함)
#   이 검사가 번호판 읽기보다 먼저라, 번호판이 보여도 무시됐다.
#
#   고치는 곳
#     ① SCOPE.allow  — 허용 목록에 추가
#     ② floorOf      — 몇 층인지 알게 (번호판으로 층을 읽었을 때 후보를 층으로 거르는 데 쓴다)
#     ③ codeLabel    — 관리자 화면에 "EVIN4" 대신 "4층 엘리베이터 안" 으로
#     ④ isCorridor   — 비상계단·안내판·창밖도 '층마다 비슷한 장면' 으로 취급
#     ⑤ v62 안내문의 실측 숫자 정정 (잘못된 모델로 쟀던 값)
#
#   사용법 : pwsh -File patch_v65.ps1 <대상파일>
param([string]$Target)
$ErrorActionPreference = 'Stop'
if(-not (Test-Path $Target)){ throw "파일이 없습니다: $Target" }
$s = [System.IO.File]::ReadAllText($Target, [System.Text.Encoding]::UTF8)
$n = 0
function Swap([string]$old, [string]$new, [string]$label){
  $script:n++
  $c = ([regex]::Matches($script:s, [regex]::Escape($old))).Count
  if($c -ne 1){ throw ("[{0}] 앵커가 {1}개" -f $label, $c) }
  $script:s = $script:s.Replace($old, $new)
  Write-Host ("  [OK] {0}" -f $label) -ForegroundColor Green
}

# ── ① 허용 목록 ─────────────────────────────────────────────────
Swap @'
      if(/^(EV|WC|ES)[1-5]$/.test(code)) return true;
'@ @'
      if(/^(EV|WC|ES)[1-5]$/.test(code)) return true;
      /* v65 : 사진을 모으며 새로 만든 장소 — 빠져 있어서 이 장소로 판별되면 제보가 거절됐다 */
      if(/^(EVIN|SIGN|EMS|WIN)[1-5]$/.test(code)) return true;
      if(/^WIN[1-5][LR]$/.test(code)) return true;
      if(code === 'EVB1' || /^GATE_(MAIN|BACK|E|W)$/.test(code)) return true;
'@ '허용 목록에 새 장소 추가'

# ── ② 몇 층인지 ─────────────────────────────────────────────────
Swap @'
    var m = code.match(/^(?:EV|HALL|WC|ES)([1-5])/); if(m) return m[1]+'층';
'@ @'
    if(code === 'EVB1') return '지하 1층';                       /* v65 */
    if(/^GATE_/.test(code)) return '1층';                         /* v65 : 출입문은 전부 1층 */
    var m = code.match(/^(?:EVIN|EMS|SIGN|WIN|EV|HALL|WC|ES)([1-5])/); if(m) return m[1]+'층';
'@ '층 알아내기에 새 장소 추가'

# ── ③ 보여줄 이름 ───────────────────────────────────────────────
Swap @'
    if(/^ES\d$/.test(code)) return code.slice(2) + (ko()?'층 계단':'F stairs');
'@ @'
    if(/^ES\d$/.test(code)) return code.slice(2) + (ko()?'층 계단':'F stairs');
    /* v65 : 새로 만든 장소 이름 */
    if(/^EVIN\d$/.test(code)) return code.slice(4) + (ko()?'층 엘리베이터 안':'F inside elevator');
    if(/^SIGN\d$/.test(code)) return code.slice(4) + (ko()?'층 비상대피 안내판':'F evacuation map');
    if(/^EMS\d$/.test(code))  return code.slice(3) + (ko()?'층 비상계단':'F emergency stairs');
    var mw = code.match(/^WIN(\d)([LR]?)$/);
    if(mw) return mw[1] + (ko()?'층 ':'F ') + (mw[2]==='L' ? (ko()?'왼쪽 ':'left ') : mw[2]==='R' ? (ko()?'오른쪽 ':'right ') : '') + (ko()?'창밖':'window view');
    if(code === 'EVB1') return ko()?'엘리베이터 지하 1층':'Elevator B1';
    var GATE_KO = {MAIN:'정문', BACK:'후문', E:'동문', W:'서문'}, GATE_EN = {MAIN:'Main gate', BACK:'Back gate', E:'East gate', W:'West gate'};
    var mg = code.match(/^GATE_(MAIN|BACK|E|W)$/);
    if(mg) return ko() ? GATE_KO[mg[1]] : GATE_EN[mg[1]];
'@ '관리자 화면 이름'

# ── ④ 층마다 비슷한 장면 ────────────────────────────────────────
Swap @'
  function isCorridor(code){ return /^(HALL|EV|WC|ES)/.test(String(code||'').toUpperCase()); }
'@ @'
  /* v65 : 비상계단·안내판·창밖도 층만 다르고 모양이 같은 장면이다 (EVIN 은 EV 로 이미 걸린다) */
  function isCorridor(code){ return /^(HALL|EV|WC|ES|EMS|SIGN|WIN)/.test(String(code||'').toUpperCase()); }
'@ '층마다 비슷한 장면에 포함'

# ── ⑤ v62 숫자 정정 ─────────────────────────────────────────────
#    v62 때 쟀던 "17장 중 2장" 은 PC 의 로컬 AI 모델(기준 데이터와 다른 모델)로 잰 값이었다.
#    기준 데이터와 같은 인터넷 모델로 다시 재니 1등이 5층 복도인 것 0/17, 5등 안 9/17.
Swap @'
       기준집에 없는 5층 복도 사진 17장으로 실측 — 층 6/17, 좌우까지 2/17.
'@ @'
       기준집에 없는 번호판 없는 5층 복도 사진 17장으로 실측(v65 에서 올바른 모델로 다시 잼)
       — 1등이 5층 복도인 것 0/17, 5등 안에 드는 것 9/17.
'@ 'v62 주석 숫자 정정'

Swap @'
         + ' 복도·엘리베이터 앞은 층마다 똑같이 생겨서, 이 경우 실측 정답률이 낮습니다(17장 중 2장).'
'@ @'
         + ' 복도·엘리베이터 앞은 층마다 똑같이 생겨서, 이 경우 1등이 맞는 일이 거의 없습니다'
         + ' (시험한 17장 중 0장 — 5등 안에는 9장).'
'@ 'v62 안내문 숫자 정정'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
