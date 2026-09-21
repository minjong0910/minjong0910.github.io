# v61 — 제보 완료 화면에서 사용자에게 필요 없는 문구 정리
#
#   (1) "✓ 서버에 전송됨 — 관리자 화면에 바로 보입니다"  → 없앰
#       서버로 갔는지는 앱이 알아서 할 일이다. 실패했을 때만 알리면 된다.
#   (2) "사람이 직접 확인할 거예요"                      → 없애고
#       "제보가 정상 접수됐습니다." 한 줄만 남김
#   (3) "선명도 1682"                                    → 없앰
#
#   사용법 : pwsh -File patch_v61.ps1 <대상파일>
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

# ── 1. "서버에 전송됨" 문구 제거 ────────────────────────────────
#    보내는 중 문구가 남지 않게 빈 값으로 지운다.
#    실패했을 때의 안내("인터넷이 없어 이 폰에 저장했어요")는 그대로 둔다.
Swap @'
      syncMsg('✓ 서버에 전송됨 — 관리자 화면에 바로 보입니다', 'on');
'@ @'
      /* v61 : 전송 성공은 사용자가 알 필요 없다 — '보내는 중' 문구만 지운다.
         실패했을 때는 아래 catch 에서 안내가 나간다. */
      syncMsg('');
'@ '서버 전송 문구 제거'

# ── 2. 접수 카드 문구 한 줄로 ───────────────────────────────────
Swap @'
      t.icon='📮'; t.cls='aiInfo'; t.tag=ko()?'접수됨':'Accepted';
      t.title=ko()?'사람이 직접 확인할 거예요':'A person will review it';
      t.body= (ai.why==='model')
        ? (ko()?'AI 모델을 불러오지 못했어요(인터넷 문제일 수 있어요). 제보는 정상 접수됐습니다.'
               :'Could not load the AI model. Your report was still submitted.')
        : (ko()?'제보가 정상 접수됐습니다.':'Your report was submitted.');
'@ @'
      /* v61 : 사용자에게는 접수됐다는 사실 한 줄이면 충분하다.
         AI가 위치를 정했는지, 누가 확인하는지는 안쪽 사정이다. */
      t.icon='📮'; t.cls='aiInfo'; t.tag=ko()?'접수됨':'Accepted';
      t.title=ko()?'제보가 정상 접수됐습니다.':'Your report was submitted.';
      t.body='';
'@ '접수 카드 문구 정리'

# ── 3. "선명도" 표시 제거 ───────────────────────────────────────
Swap @'
    if(ai.quality && ai.quality.sharp !== undefined){
      t.why += (t.why?' · ':'') + (ko()?'선명도 ':'sharpness ') + Math.round(ai.quality.sharp);
    }
'@ @'
    /* v61 : 선명도 수치는 사용자에게 의미가 없다 — 관리자 화면에는 그대로 나온다 */
'@ '선명도 표시 제거'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
