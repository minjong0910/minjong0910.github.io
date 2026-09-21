# v81 — 실사 3D 안의 three.js 를 한 벌만 싣기
#
#   앱(index.html)에는 three.js r128 이 두 번 들어 있었다.
#     ① 앱 본문 <script> (603KB)
#     ② '실사 3D' 페이지(B3D_SRC, base64) 안에 똑같은 파일 한 벌 더 (base64 라 804KB)
#   두 벌은 바이트까지 같다 (2026-09-21 md5 로 확인).
#
#   ② 를 빼고 자리표시(<script>/*THREE_FROM_PARENT*/</script>)만 남긴다.
#   실사 3D 를 처음 열 때 mountBld3D 가 ① 의 글자를 그 자리에 채워 넣고 iframe 을 띄운다.
#   iframe 은 예전처럼 자기 three.js 를 따로 실행한다 — 부모 창의 THREE 객체를 빌려 쓰지 않는다.
#   (빌려 쓰면 document·instanceof·requestAnimationFrame 이 부모 창 것으로 바뀌어 미묘하게 달라진다)
#   그래서 3D 동작은 그대로이고 파일만 약 0.8MB 줄어든다.
#
#   사용법 : pwsh -File patch_v81.ps1 <대상파일>
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

# ① 앱 본문 three.js 에 이름표를 단다 (id 가 있어도 스크립트는 그대로 실행된다)
Swap '<script>/* three.js r128 (inlined for offline use) */' '<script id="THREE_SRC">/* three.js r128 (inlined for offline use) */' '앱 three.js 이름표'

# ② 실사 3D 페이지를 풀어서 three.js 를 자리표시로 바꾸고 다시 싼다
$PH = '<script>/*THREE_FROM_PARENT*/</script>'
$m = [regex]::Matches($s, '<script id="B3D_SRC" type="text/plain">([A-Za-z0-9+/=\s]+)</script>')
if($m.Count -ne 1){ throw "B3D_SRC 가 $($m.Count)개" }
$b64 = $m[0].Groups[1].Value
$page = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(($b64 -replace '\s', '')))
if($page.Contains($PH)){ throw '이미 자리표시가 있습니다 (두 번 적용?)' }
$tm = [regex]::Matches($page, '(?s)<script>\s*/\*\*\s*\n \* @license\s*\n \* Copyright 2010-2021 Three\.js Authors.*?</script>')
if($tm.Count -ne 1){ throw "실사 3D 안의 three.js 블록이 $($tm.Count)개" }
$block = $tm[0].Value
# 앱 본문의 three.js 와 정말 같은 코드인지 확인 — 다르면 멈춘다 (한쪽만 고친 판일 수 있다)
$code = ($block -split "`n" | Where-Object { $_.StartsWith('!function(t,e){') })
$app  = [regex]::Match($s, '(?s)<script id="THREE_SRC">.*?</script>').Value
if(@($code).Count -ne 1 -or -not $app.Contains($code)){ throw '실사 3D 의 three.js 가 앱 본문 것과 다릅니다 — 멈춤' }
$page2 = $page.Replace($block, $PH)
$b64n = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($page2))
$s = $s.Replace($m[0].Value, '<script id="B3D_SRC" type="text/plain">' + $b64n + '</script>')
$n++
Write-Host ("  [OK] 실사 3D 속 three.js 빼기 ({0:N0} → {1:N0} 글자)" -f $b64.Length, $b64n.Length) -ForegroundColor Green

# ③ 띄울 때 채워 넣기 — replace 에 함수를 넘겨 three.js 코드 속 '$' 가 치환 기호로 읽히지 않게 한다
Swap @'
    var html = (typeof TextDecoder !== 'undefined')
      ? new TextDecoder('utf-8').decode(buf)
      : decodeURIComponent(escape(bin));
'@ @'
    var html = (typeof TextDecoder !== 'undefined')
      ? new TextDecoder('utf-8').decode(buf)
      : decodeURIComponent(escape(bin));
    /* v81 : 실사 3D 페이지에는 three.js 대신 자리표시만 있다 — 앱 본문의 같은 파일을 채워 넣는다.
       iframe 은 이 코드를 자기 창에서 따로 실행한다 (부모의 THREE 객체를 빌려 쓰지 않는다). */
    var PH = '<script>/*THREE_FROM_PARENT*/</' + 'script>';
    if(html.indexOf(PH) >= 0){
      var tsrc = document.getElementById('THREE_SRC');
      if(!tsrc) throw new Error('THREE_SRC 없음');
      var tcode = tsrc.textContent;
      html = html.replace(PH, function(){ return '<script>' + tcode + '</' + 'script>'; });
    }
'@ '띄울 때 three.js 채우기'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
