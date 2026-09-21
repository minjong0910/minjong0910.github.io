# v59 — "어디에서 찍으셨나요?" 강제 선택 화면 제거
#
#   처음 온 사람은 건물 구조도 호실 번호도 모른다. 그 사람에게 "어디인지 고르세요"라고
#   묻는 것은 앱이 해야 할 일을 사용자에게 떠넘기는 것이다.
#   → 사진만 올리면 바로 접수되고, 위치는 번호판 OCR 이나 관리자가 정한다.
#
#   사용법 : pwsh -File patch_v59.ps1 [대상파일]
#            생략하면 D:\군산대\index_new.html 을 제자리에서 고친다.
param([string]$Target = 'D:\군산대\index_new.html')

$ErrorActionPreference = 'Stop'
if(-not (Test-Path $Target)){ throw "파일이 없습니다: $Target" }
$s = [System.IO.File]::ReadAllText($Target, [System.Text.Encoding]::UTF8)
$before = $s.Length
$n = 0
function Swap([string]$old, [string]$new, [string]$label){
  $script:n++
  $c = ([regex]::Matches($script:s, [regex]::Escape($old))).Count
  if($c -ne 1){ throw ("[{0}] 앵커가 {1}개 (1개여야 함)" -f $label, $c) }
  $script:s = $script:s.Replace($old, $new)
  Write-Host ("  [OK] {0}" -f $label) -ForegroundColor Green
}

# ── 1. 번호판을 읽었으면 그것으로 확정한다 ──────────────────────
#    지금까지는 OCR 로 호실을 읽어내도 확신으로 쳐주지 않아 고르기 화면으로 보냈다.
#    실측에서 OCR 이 사진 판별보다 훨씬 정확했다. 읽혔으면 그게 답이다.
Swap @'
  if((ai.sim || 0) >= 0.82 && (ai.margin || 0) >= 0.04 && ai.codeSource !== 'ocr') return true;
  return false;
'@ @'
  /* v59 : 번호판을 읽어 호실이 나왔으면 그것이 가장 확실하다.
     applyOcr 이 codeSource='ocr' 로 표시하는 경우는 이미
     "믿을 만한가" 검사(확신 60 이상 또는 앱이 아는 번호)를 통과한 것이다. */
  if(ai.codeSource === 'ocr') return true;
  if((ai.sim || 0) >= 0.82 && (ai.margin || 0) >= 0.04) return true;
  return false;
'@ 'OCR 결과를 확신으로 인정'

# ── 2. 강제 선택 화면 제거 ──────────────────────────────────────
Swap @'
      if(stat){ stat.textContent = ''; stat.classList.remove('on'); }
      pickOpen(url, noteVal, ai, function(code, ai2){
        if(!code){ ai2.verdict = 'unknown'; ai2.code = ''; }
        sugFinishSubmit(url, noteVal, ai2, stat, noteEl);
        go('ssug');
      });
'@ @'
      /* v59 : 위치를 못 정해도 그냥 접수한다.
         예전에는 여기서 "어디에서 찍으셨나요?" 화면을 띄워 사용자에게 고르게 했는데,
         처음 온 사람은 건물 구조도 호실 번호도 모른다 — 길을 잃어서 앱을 켠 사람에게
         어디인지 맞히라고 하는 셈이었다.
         AI 가 짐작한 후보는 기록에 그대로 남으므로, 관리자 화면에서 후보 5개를
         눌러 고르거나 직접 입력해 확정한다. */
      ai.verdict = 'unknown';
      ai.code = '';
      sugFinishSubmit(url, noteVal, ai, stat, noteEl);
'@ '강제 선택 화면 제거'

# ── 3. 접수 후 '위치 바꾸기' 단추도 숨긴다 ──────────────────────
Swap @'
    var fixRow = document.getElementById('sugFixRow');
    if(fixRow) fixRow.style.display = (ai && ai.code && !ai.pickedByUser) ? '' : 'none';
'@ @'
    /* v59 : 이 단추도 같은 고르기 화면을 여는 것이라 함께 숨긴다.
       (화면과 함수는 그대로 남겨 두었으니 필요하면 이 한 줄만 되돌리면 된다) */
    var fixRow = document.getElementById('sugFixRow');
    if(fixRow) fixRow.style.display = 'none';
'@ '위치 바꾸기 단추 숨김'

# ── 4. 사용자 카드에 유사도·후보를 보여주지 않는다 ──────────────
#    위치를 못 정했을 때 "유사도 43% · 다음 후보 13419" 같은 줄은
#    사용자에게 의미도 없고 혼란만 준다. 관리자 화면에는 그대로 나온다.
Swap @'
    if(ai.sim !== undefined){
      t.why = (ko()?'유사도 ':'similarity ') + (ai.sim*100).toFixed(0) + '%' +
'@ @'
    if(ai.sim !== undefined && ai.verdict !== 'unknown'){
      t.why = (ko()?'유사도 ':'similarity ') + (ai.sim*100).toFixed(0) + '%' +
'@ '사용자 카드에서 유사도 줄 숨김'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ''
Write-Host ("완료 : {0}" -f $Target)
Write-Host ("  {0:N0} bytes -> {1:N0} bytes   ({2} 군데)" -f $before, $s.Length, $n)
