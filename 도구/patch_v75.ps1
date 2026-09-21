# v75 — 고를 수 있는 장소 목록을 'AI 가 아는 장소' 그대로 맞춘다
#
#   v74 로 한글 이름 고르기를 넣고 실제로 띄워 보니, 목록에 8곳이 빠져 있었다.
#     EVB1(지하 엘리베이터) · GATE_E/GATE_W(동문·서문) · WIN2~WIN5R(창밖)
#   aidKnownCodes() 가 목록을 만들 때 SUGAI.libAll() 에 기대고 있었는데,
#   그 함수는 AI 기준 데이터를 아직 안 읽었을 때 0개를 돌려준다. 그래서
#   AI 는 "3층 창밖"이라고 답하는데 관리자는 그 장소를 고를 수가 없었다.
#
#   고치는 방법 : 기준벡터(AIVEC_DATA.codes)를 직접 읽는다.
#   이게 'AI 가 아는 장소'의 유일한 정답지다. 사진 폴더를 새로 만들어도
#   기준벡터만 다시 만들면 목록에 저절로 들어온다 — 앞으로 빠뜨릴 일이 없다.
#
#   덤 : 동문·서문이 GATE_EAST/GATE_WEST 로도 불려서 이름이 'GATE_EAST' 로
#        그냥 나오고 있었다. 이름표에 두 표기를 모두 넣는다.
#
#   사용법 : pwsh -File patch_v75.ps1 <대상파일>
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

# ── 1. 기준벡터에서 장소를 그대로 가져온다 ──────────────────────
Swap @'
  if(typeof SUGAI !== 'undefined' && SUGAI.libAll)
    SUGAI.libAll().forEach(function(r){ set[String(r.code).toUpperCase()] = 1; });
  return Object.keys(set).sort();
'@ @'
  if(typeof SUGAI !== 'undefined' && SUGAI.libAll)
    SUGAI.libAll().forEach(function(r){ set[String(r.code).toUpperCase()] = 1; });
  /* v75 : AI 기준벡터가 '앱이 아는 장소'의 정답지다.
     libAll() 은 기준 데이터를 아직 안 읽었으면 0개를 돌려줘서,
     창밖(WIN)·지하 엘리베이터(EVB1)·동문/서문이 목록에서 빠져 있었다. */
  if(typeof window !== 'undefined' && window.AIVEC_DATA && window.AIVEC_DATA.codes){
    var ac = window.AIVEC_DATA.codes;
    for(i=0;i<ac.length;i++) set[String(ac[i]).toUpperCase()] = 1;
  }
  return Object.keys(set).sort();
'@ '기준벡터에서 장소 읽기'

# ── 2. 동문·서문의 다른 표기도 이름을 붙여 준다 ─────────────────
Swap @'
    var GATE_KO = {MAIN:'정문', BACK:'후문', E:'동문', W:'서문'}, GATE_EN = {MAIN:'Main gate', BACK:'Back gate', E:'East gate', W:'West gate'};
    var mg = code.match(/^GATE_(MAIN|BACK|E|W)$/);
'@ @'
    /* v75 : 같은 문이 GATE_E 와 GATE_EAST 두 가지로 불린다 — 둘 다 받는다 */
    var GATE_KO = {MAIN:'정문', BACK:'후문', E:'동문', W:'서문', EAST:'동문', WEST:'서문'},
        GATE_EN = {MAIN:'Main gate', BACK:'Back gate', E:'East gate', W:'West gate', EAST:'East gate', WEST:'West gate'};
    var mg = code.match(/^GATE_(MAIN|BACK|EAST|WEST|E|W)$/);
'@ '동문·서문 이름'

# ── 3. 기준벡터가 없어도 창밖은 고를 수 있게 ────────────────────
Swap @'
  for(i=1;i<=5;i++){ set['LNG'+i]=1; set['EVIN'+i]=1; set['SIGN'+i]=1; set['EMS'+i]=1; }   /* v73 */
'@ @'
  for(i=1;i<=5;i++){ set['LNG'+i]=1; set['EVIN'+i]=1; set['SIGN'+i]=1; set['EMS'+i]=1; }   /* v73 */
  ['WIN2','WIN3','WIN4','WIN5L','WIN5R','EVB1'].forEach(function(c){ set[c]=1; });          /* v75 */
'@ '창밖·지하 엘리베이터 보강'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
