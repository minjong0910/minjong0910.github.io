# v79 — 같은 코드가 두 곳에서 다른 장소를 뜻하던 것 (ES = 계단? 비상계단?)
#
#   길안내·사진 관리는 ES# 를 "N층 비상계단"으로 불렀다 (PH_LABEL, 사진 관리 목록, 비상계단 도착 사진).
#   그런데 AI·건의함은 ES# 를 "N층 계단"(후문·중앙계단, ES1 폴더 사진 20장)으로, 비상계단은 EMS# 로 쓴다.
#   지금은 두 코드 모두 사진이 0장이라 드러나지 않았을 뿐, 그대로 두면
#     · 관리자가 중앙계단 사진을 "1층 계단(ES1)"으로 승인 → 길안내의 "비상계단에 도착" 화면에 뜬다
#     · 비상계단 사진을 "1층 비상계단(EMS1)"으로 승인 → 길안내 어디에도 안 보인다
#   AI 쪽 이름이 기준이다 (사진 1,753장·기준벡터가 그 이름으로 되어 있다). 길안내 쪽을 맞춘다.
#
#   2026-09-21 3D 검사를 만들다 buildSteps 를 읽으며 찾았다.
#
#   사용법 : pwsh -File patch_v79.ps1 <대상파일>
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
    PH_LABEL['ES'+i]      = i+'층 비상계단';
'@ @'
    PH_LABEL['ES'+i]      = i+'층 계단';                /* v79 : AI 쪽과 같게 — ES = 계단, EMS = 비상계단 */
    PH_LABEL['EMS'+i]     = i+'층 비상계단';
'@ '사진 설명 (한국어)'

Swap @'
    PH_LABEL_EN['ES'+i]      = 'Floor '+i+' emergency stairs';
'@ @'
    PH_LABEL_EN['ES'+i]      = 'Floor '+i+' stairs';
    PH_LABEL_EN['EMS'+i]     = 'Floor '+i+' emergency stairs';
'@ '사진 설명 (영어)'

Swap @'
    out.push({code:'ES'+i,       label:i+'층 비상계단',     g:i+'층 공용', f:i});
'@ @'
    out.push({code:'ES'+i,       label:i+'층 계단',         g:i+'층 공용', f:i});
    out.push({code:'EMS'+i,      label:i+'층 비상계단',     g:i+'층 공용', f:i});   /* v79 */
'@ '사진 관리 장소 목록'

Swap @'
    out.push({a:'✓', type:'arrive', tko:'비상계단에 도착했습니다', ten:'You have arrived at the emergency stairs', ph:'[ 비상계단 사진 ]', code:'ES'+lv});
'@ @'
    out.push({a:'✓', type:'arrive', tko:'비상계단에 도착했습니다', ten:'You have arrived at the emergency stairs', ph:'[ 비상계단 사진 ]', code:'EMS'+lv});   /* v79 : ES 는 중앙계단 */
'@ '비상계단 도착 사진'

Swap @'
    if(!/^(BLD|B1|EV[1-5]|HALL[1-5][LR]|WC[1-5]|ES[1-5])$/.test(k)) return;
'@ @'
    if(!/^(BLD|B1|EV[1-5]|HALL[1-5][LR]|WC[1-5]|ES[1-5]|EMS[1-5]|LNG[1-5])$/.test(k)) return;   /* v79 */
'@ '공용 사진 정렬 대상'

Swap @'
  var sp = b.match(/^(BLD|B1|EV[1-5]|HALL[1-5][LR]|WC[1-5]|ES[1-5])(?![0-9A-Za-z가-힣])/i);
'@ @'
  var sp = b.match(/^(BLD|B1|EV[1-5]|HALL[1-5][LR]|WC[1-5]|EMS[1-5]|ES[1-5]|LNG[1-5])(?![0-9A-Za-z가-힣])/i);   /* v79 */
'@ '파일 이름에서 코드 읽기'

Swap @'
  m = up.match(/(?:^|[^A-Z0-9])(HALL[1-5][LR]|LNG[1-5]|EV[1-5]|WC[1-5]|ES[1-5]|BLD|KTC)(?![A-Z0-9])/); if(m) return m[1];
'@ @'
  m = up.match(/(?:^|[^A-Z0-9])(HALL[1-5][LR]|LNG[1-5]|EV[1-5]|WC[1-5]|EMS[1-5]|ES[1-5]|BLD|KTC)(?![A-Z0-9])/); if(m) return m[1];
'@ '메모에서 코드 읽기'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
