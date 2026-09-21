# v63 — 기준 데이터를 index.html 밖으로 뺄 수 있게 한다
#
#   지금은 2,705개 기준벡터(4.6MB)가 index.html 안에 박혀 있다.
#   그래서 사진이 늘 때마다 24MB 짜리 파일을 통째로 다시 올려야 하고,
#   깃허브 웹 업로드 한계(25MB)에도 곧 걸린다.
#
#   aivec.js 라는 파일 하나로 빼면
#     · index.html 은 약 19.6MB 로 줄어 여유가 생기고
#     · 사진이 늘어도 aivec.js(4.6MB)만 다시 올리면 된다
#
#   읽는 쪽만 고친다. 예전처럼 파일 안에 박혀 있어도 그대로 읽는다.
#
#   사용법 : pwsh -File patch_v63.ps1 <대상파일>
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

Swap @'
  function loadVectors(){
    if(REF) return true;
    var el = $('EMBEDDED_AIVEC');
    if(!el) return false;
    try{
      var d = JSON.parse(el.textContent);
'@ @'
  function loadVectors(){
    if(REF) return true;
    /* v63 : 기준 데이터는 옆 파일 aivec.js 가 window.AIVEC_DATA 에 넣어 준다.
       예전처럼 index.html 안에 박혀 있는 경우도 그대로 읽는다(둘 다 동작). */
    var d = null;
    if(window.AIVEC_DATA){
      d = window.AIVEC_DATA;
    }else{
      var el = $('EMBEDDED_AIVEC');
      if(!el) return false;
      try{ d = JSON.parse(el.textContent); }catch(e){ return false; }
    }
    if(!d || !d.dim) return false;
    try{
'@ 'loadVectors — 바깥 파일도 읽게'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
