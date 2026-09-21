# v60 — 관리자 화면에서 "무엇으로 정한 위치인지"를 구분해 보여준다
#
#   지금까지 'AI 위치 확정' 한 가지 표시에 신뢰도가 전혀 다른 두 경로가 섞여 있었다.
#     · 번호판 OCR 이 호실 번호를 읽은 것      → 믿을 만하다
#     · 사진 판별(CNN) 유사도가 높았던 것       → 실측 정답률 0%
#   관리자가 표시만 보고 승인하면 틀린 위치가 그대로 들어가고,
#   승인 시 AI 가 그것을 학습하므로 틀린 것을 배우게 된다.
#
#   사용법 : pwsh -File patch_v60.ps1 <대상파일>
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

# ── 1. 사진 판별만으로는 자동 확정하지 않는다 ───────────────────
Swap @'
  if(ai.codeSource === 'ocr') return true;
  if((ai.sim || 0) >= 0.82 && (ai.margin || 0) >= 0.04) return true;
  return false;
'@ @'
  if(ai.codeSource === 'ocr') return true;
  /* v60 : 사진 판별(CNN)만으로는 확정하지 않는다.
     240장으로 재보니 이 경로의 정답률이 0% 였다 — 유사도가 높을수록
     오히려 더 틀렸다. 문턱을 올려도 나아지지 않는다. */
  return false;
'@ '사진 판별만으로는 확정 안 함'

# ── 2. 관리자 배지에 근거를 표시한다 ────────────────────────────
Swap @'
    if(ai.verdict==='match'){ cls='aiOk'; txt='AI 위치 확정'; }
    else if(ai.verdict==='uncertain'){ cls='aiWarn'; txt='AI 불확실'; }
'@ @'
    /* v60 : 같은 '확정'이라도 무엇으로 정했는지에 따라 신뢰도가 전혀 다르다 */
    if(ai.verdict==='match'){
      if(ai.codeSource==='ocr'){ cls='aiOk';   txt='🔢 번호판으로 확정'; }
      else if(ai.pickedByUser){  cls='aiOk';   txt='🙋 사용자가 고름'; }
      else {                     cls='aiWarn'; txt='📷 사진 판별 (참고용 · 자주 틀림)'; }
    }
    else if(ai.verdict==='uncertain'){ cls='aiWarn'; txt='📷 사진 판별 (참고용 · 자주 틀림)'; }
'@ '배지에 근거 표시'

# ── 3. 코드 입력란은 믿을 만한 경우에만 미리 채운다 ─────────────
Swap @'
  function autoCode(s){
    if(!s.ai) return '';
    return (s.ai.verdict === 'match' || s.ai.verdict === 'same') ? (s.ai.code || '') : '';
  }
'@ @'
  function autoCode(s){
    if(!s.ai) return '';
    /* v60 : 번호판으로 읽었거나 사용자가 직접 고른 경우에만 미리 채운다.
       사진 판별 결과를 채워 두면 관리자가 그대로 승인하기 쉽고,
       승인하면 AI 가 그 틀린 위치를 학습해 버린다. */
    if(s.ai.codeSource === 'ocr' || s.ai.pickedByUser) return s.ai.code || '';
    if(s.ai.verdict === 'same') return s.ai.code || '';
    return '';
  }
'@ '코드 자동입력은 번호판·사용자선택만'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
