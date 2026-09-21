# v63b — v63(aivec.js 분리)에서 생긴 버그 수정
#
#   v63 전에는 기준 데이터를 읽을 때마다 JSON.parse 로 새 객체를 만들었다.
#   v63 부터는 window.AIVEC_DATA 를 그대로 쓰는데, 그러면
#     CODES = d.codes
#   가 원본 배열을 그대로 가리킨다. 학습분·서버 승인분을 CODES.push 로 덧붙이면
#   원본 목록 자체가 늘어나고, 기준집을 다시 만들 때마다 쌓여서
#   벡터(REF)와 장소 이름(CODES)의 짝이 어긋난다 → 학습한 사진이 엉뚱한 장소로 붙는다.
#
#   읽을 때 목록을 복사해서 쓴다. (v58 이 고치는 줄은 건드리지 않는다)
#
#   사용법 : pwsh -File patch_v63b.ps1 <대상파일>
param([string]$Target)
$ErrorActionPreference = 'Stop'
if(-not (Test-Path $Target)){ throw "파일이 없습니다: $Target" }
$s = [System.IO.File]::ReadAllText($Target, [System.Text.Encoding]::UTF8)
$old = @'
    if(!d || !d.dim) return false;
    try{
'@
$new = @'
    if(!d || !d.dim) return false;
    /* v63b : 원본 목록을 그대로 쓰면 뒤에 덧붙인 학습분이 원본에 쌓인다 — 복사해서 쓴다 */
    d = {dim:d.dim, n:d.n, q:d.q, codes:(d.codes || []).slice(), names:(d.names || []).slice(),
         mean:d.mean, pc:d.pc, pc2:d.pc2, post:d.post, views:d.views};
    try{
'@
$c = ([regex]::Matches($s, [regex]::Escape($old))).Count
if($c -ne 1){ throw "앵커가 $c 개" }
$s = $s.Replace($old, $new)
[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  [OK] 기준 목록 복사해서 쓰기 -> {0}" -f (Split-Path $Target -Leaf)) -ForegroundColor Green
