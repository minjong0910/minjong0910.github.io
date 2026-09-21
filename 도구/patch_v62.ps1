# v62 — 번호판을 못 읽은 사진의 신뢰도를 실측에 맞춘다
#
#   기준집에 넣지 않은 5층 복도 사진 17장으로 실제로 재보니
#     층까지 맞힌 것    6 / 17
#     좌우까지 맞힌 것  2 / 17
#   그런데 화면에는 '신뢰도 보통' 이라고 나왔다(유사도가 0.70 을 넘어서).
#   유사도가 높다고 맞는 게 아니다 — 복도는 층마다 똑같이 생겼기 때문이다.
#
#   (1) 번호판을 못 읽었으면 신뢰도는 무조건 '낮음'
#   (2) 왜 못 믿는지 한 줄로 알려준다
#   (3) 번호판으로 확정한 게 아니면 후보를 5개까지 보여준다 (관리자가 고르기 쉽게)
#
#   사용법 : pwsh -File patch_v62.ps1 <대상파일>
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

# ── 1. 신뢰도 계산 ──────────────────────────────────────────────
Swap @'
    var sure = (ai.verdict==='match'||ai.verdict==='same');
    var conf = sure ? '높음' : (t.sim >= 0.70 ? '보통' : '낮음');
    var low = (conf === '낮음');
'@ @'
    var sure = (ai.verdict==='match'||ai.verdict==='same');
    /* v62 : 번호판을 못 읽었으면 유사도가 높아도 믿을 수 없다.
       기준집에 없는 5층 복도 사진 17장으로 실측 — 층 6/17, 좌우까지 2/17.
       유사도 0.72 짜리가 다른 층 엘리베이터로 나오는 일이 흔했다. */
    var hasPlate = (ai.codeSource==='ocr') || (ai.floorSource==='ocr') || !!ai.pickedByUser;
    var conf = !hasPlate ? '낮음' : (sure ? '높음' : (t.sim >= 0.70 ? '보통' : '낮음'));
    var low = (conf === '낮음');
'@ '신뢰도는 번호판 유무로 정한다'

# ── 2. 왜 못 믿는지 알려준다 ────────────────────────────────────
Swap @'
    if(ai.top[1] && low){
      h += '<span class="sub">다음 후보 : '+codeLabel(ai.top[1].code)+' '+Math.round(ai.top[1].sim*100)+'%'
'@ @'
    if(!hasPlate){
      h += '<span class="sub warnsub">⚠ 사진에 호실 번호판이 안 보입니다 — 층도 자리도 확인할 수 없습니다.'
         + ' 복도·엘리베이터 앞은 층마다 똑같이 생겨서, 이 경우 실측 정답률이 낮습니다(17장 중 2장).'
         + ' 아래 후보에서 직접 골라 주세요.</span>';
    }
    if(ai.top[1] && low){
      h += '<span class="sub">다음 후보 : '+codeLabel(ai.top[1].code)+' '+Math.round(ai.top[1].sim*100)+'%'
'@ '번호판 없음 안내 추가'

# ── 3. 후보를 넉넉히 보여준다 ───────────────────────────────────
Swap @'
    var cands = (ai.verdict==='match'||ai.verdict==='same') ? (ai.top||[]) : ((ai.all||ai.top||[]).slice(0,5));
'@ @'
    /* v62 : 번호판으로 확정한 게 아니면 1등이 자주 틀리므로 후보를 넉넉히 준다 */
    var plateSure = (ai.codeSource==='ocr') || !!ai.pickedByUser || ai.verdict==='same';
    var cands = plateSure ? (ai.top||[]) : ((ai.all||ai.top||[]).slice(0,5));
'@ '후보 5개까지'

# ── 4. 안내문 스타일 ────────────────────────────────────────────
Swap @'
  #sadmin .sugLearnTip{
'@ @'
  #sadmin .where .warnsub{color:#E8B339;background:#2A2113;border:1px solid #4A3A16;
    border-radius:8px;padding:6px 8px;margin-top:6px;line-height:1.5;}
  #sadmin .sugLearnTip{
'@ '안내문 스타일'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
