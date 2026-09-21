# v77 — 빌드 검사(eval_build.html)가 처음 돌자마자 찾은 두 가지
#
#   ① KTC 에 한글 이름이 없었다
#      앱의 다른 곳(층 안내·검색)은 'KTC 동아리방'이라고 부르는데, 건의함 AI 결과는
#      codeLabel('KTC') 가 'KTC' 를 그대로 돌려줘 "KTC 사진으로 확인했어요"라고 나왔다.
#
#   ② 개발자용 사진 등록 화면에서 후문·동문·서문이 '기타'로 빠졌다
#      aidFloorOf() 가 GATE_* 를 모른다. v74 에서 관리자 건의함 쪽은 sugFloorOf 로
#      따로 감싸 고쳤지만, 원인 함수는 그대로여서 다른 화면에 남아 있었다.
#      → 원인 함수를 고친다. (sugFloorOf 의 특례는 이제 없어도 되지만 해가 없어 둔다)
#
#   사용법 : pwsh -File patch_v77.ps1 <대상파일>
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
    if(code === 'EVB1') return ko()?'엘리베이터 지하 1층':'Elevator B1';
'@ @'
    if(code === 'EVB1') return ko()?'엘리베이터 지하 1층':'Elevator B1';
    if(code === 'KTC')  return ko()?'4층 KTC 동아리방':'4F KTC club room';     /* v77 */
'@ 'KTC 한글 이름'

Swap @'
  if(c === 'B1' || c === 'EVB1') return '지하 1층';                 /* v76 : EVB1 이 '기타'로 빠졌다 */
'@ @'
  if(c === 'B1' || c === 'EVB1') return '지하 1층';                 /* v76 : EVB1 이 '기타'로 빠졌다 */
  if(/^GATE_/.test(c)) return '건물 외부';                          /* v77 : 출입문이 '기타'로 빠졌다 */
'@ '출입문 층 묶음'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
