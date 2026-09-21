# v70 — 학습 한도에 닿았을 때 내장 기준 벡터가 지워지던 문제
#
#   AI 가 배운 사진은 LEARNED(최대 250장)에 쌓이고, 벡터는 REF 뒤에 이어 붙는다.
#   REF = [내장 기준 3,506개] + [학습분] + [자료집] 순서다.
#   그런데 한도를 넘었을 때 코드가 REF 의 **앞에서** 잘라냈다(REF.splice(0, …)).
#   앞쪽은 내장 기준이라, 오래된 학습분 대신 **내장 장소가 하나씩 지워졌다**.
#   (학습분은 그대로 남고, 지워진 내장 장소는 다음에 앱을 새로 열 때까지 후보에서 빠진다)
#
#   아직 250장까지 배운 적이 없어 표면화되지 않았지만, 관리자가 승인을 쌓으면 반드시 닿는다.
#   고치는 방법 : 목록에서만 빼고 기준 전체를 다시 조립한다(rebuildRef).
#   저장 용량이 꽉 차서 오래된 학습분을 버릴 때도 마찬가지로 다시 조립한다.
#
#   사용법 : pwsh -File patch_v70.ps1 <대상파일>
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
      if(LEARNED.length >= LEARN_MAX){
        var old = LEARNED.shift();
        var drop = (old && old.q2) ? 2 : 1;
        REF.splice(0, drop); CODES.splice(0, drop);
      }
'@ @'
      /* v70 : 한도를 넘으면 가장 오래된 학습분을 뺀다.
         예전 코드는 REF 앞에서 잘라냈는데 그 앞쪽은 내장 기준 벡터라,
         오래된 학습분 대신 내장 장소가 지워졌다. 이제는 목록에서만 빼고 아래에서 다시 조립한다. */
      var trimmed = false;
      if(LEARNED.length >= LEARN_MAX){ LEARNED.shift(); trimmed = true; }
'@ '학습 한도 — 내장 기준 보호'

Swap @'
      saveLearned();
      if(typeof phAiLearnRender === 'function') phAiLearnRender();
'@ @'
      saveLearned();
      if(trimmed) rebuildRef();      /* v70 : 오래된 학습분을 뺐으면 기준 전체를 다시 조립 */
      if(typeof phAiLearnRender === 'function') phAiLearnRender();
'@ '학습 한도 — 다시 조립'

Swap @'
      /* 용량이 꽉 차면 오래된 것부터 버린다 */
      while(LEARNED.length > 40){
        LEARNED.splice(0, 20);
        try{ localStorage.setItem(LEARN_KEY, JSON.stringify(LEARNED)); return true; }catch(e2){}
      }
'@ @'
      /* 용량이 꽉 차면 오래된 것부터 버린다 */
      while(LEARNED.length > 40){
        LEARNED.splice(0, 20);
        try{
          localStorage.setItem(LEARN_KEY, JSON.stringify(LEARNED));
          rebuildRef();              /* v70 : 버린 만큼 기준도 다시 조립한다 */
          return true;
        }catch(e2){}
      }
'@ '저장 실패 시 다시 조립'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
