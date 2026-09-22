# 한 파일 앱(index_new.html, 1,840만 자)을 site\ 폴더의 여러 파일로 나눈다 — 한 번만 쓰는 이사 도구
#
#   입력 : index_new.html (지금 배포되는 빌드 결과 — patch_v58 이 원본에 고쳐 넣은 코드까지 들어 있는 '진짜 앱')
#   출력 : site\  ← 이제부터 이 폴더가 앱의 원본이다. 패치 스크립트 방식은 여기서 끝난다.
#
#     site\index.html              화면 틀(HTML)만
#     site\css\app.css · boot.css  모양
#     site\js\app\*.js             앱 코드 (원래 <script> 덩어리 순서 그대로 — 실행 순서가 같다)
#     site\js\vendor\*.js          three.js r128 · JSZip 3.10.1 · jsQR 1.4.0 (바이트 그대로)
#     site\data\photos\<장소>\NN.jpg + photos.js   장소 사진 (예전 EMBEDDED_PHOTOS)
#     site\data\ailib.js           AI 사진 자료집 (예전 EMBEDDED_AILIB)
#     site\data\aivec.js           AI 기준 자료 (예전 aivec.js)
#     site\3d\realistic.html + tex\  실사 3D (예전 B3D_SRC base64 를 풀어서, 그림도 파일로)
#
#   코드는 세 군데만 바꾼다 (파일에서 읽도록) : 사진 목록 · AI 자료집 · 실사 3D 띄우기.
#   바꾼 뒤 tests\run_golden.ps1 로 예전 앱과 결과를 견준다.
#
#   사용법 : pwsh -File 도구\split_site.ps1 [-Force]
param([switch]$Force)
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$SRC  = Join-Path $ROOT 'index_new.html'
$OUT  = Join-Path $ROOT 'site'
$UTF8 = New-Object System.Text.UTF8Encoding($false)
if(Test-Path $OUT){
  if(-not $Force){ throw "site 폴더가 이미 있습니다. 다시 만들려면 -Force (site 안에서 고친 것이 사라집니다)" }
  Remove-Item -LiteralPath $OUT -Recurse -Force
}
function W([string]$rel, [string]$text){
  $p = Join-Path $OUT $rel
  $d = Split-Path $p -Parent; if(-not (Test-Path $d)){ New-Item -ItemType Directory -Force -Path $d | Out-Null }
  [IO.File]::WriteAllText($p, ($text -replace "`r`n", "`n"), $UTF8)
}
function WB([string]$rel, [byte[]]$bytes){
  $p = Join-Path $OUT $rel
  $d = Split-Path $p -Parent; if(-not (Test-Path $d)){ New-Item -ItemType Directory -Force -Path $d | Out-Null }
  [IO.File]::WriteAllBytes($p, $bytes)
}
function ExtOf([string]$mime){ switch($mime){ 'image/jpeg' {'jpg'} 'image/jpg' {'jpg'} 'image/png' {'png'} 'image/webp' {'webp'} 'image/gif' {'gif'} default { throw "모르는 그림 형식 $mime" } } }
function Swap1([string]$text, [string]$old, [string]$new, [string]$label){
  $c = ([regex]::Matches($text, [regex]::Escape($old))).Count
  if($c -ne 1){ throw ("[{0}] 바꿀 곳이 {1}개" -f $label, $c) }
  Write-Host ("  [코드] {0}" -f $label) -ForegroundColor Green
  return $text.Replace($old, $new)
}

$s = [IO.File]::ReadAllText($SRC, [Text.Encoding]::UTF8)
Write-Host ("입력 {0} : {1:N0}자" -f (Split-Path $SRC -Leaf), $s.Length)

# ── 덩어리 16개를 차례대로 찾는다 (순서·모양이 예상과 다르면 멈춘다) ──
$rx = [regex]'(?s)<(script|style)\b([^>]*)>(.*?)</\1>'
$ms = @($rx.Matches($s))
if($ms.Count -ne 16){ throw "덩어리가 $($ms.Count)개 — 16개를 예상함" }
# 번호 : 파일 이름 (코드 덩어리) — 첫 줄로 정체를 확인한다
$plan = @(
  @{i=0;  kind='css';   file='css/app.css';           check='*{margin:0;padding:0;box-sizing:border-box;}'},
  @{i=1;  kind='css';   file='css/boot.css';          check='부팅 인트로'},
  @{i=2;  kind='b3d'},
  @{i=3;  kind='photos'},
  @{i=4;  kind='js';    file='js/vendor/three.min.js'; check='three.js r128'},
  @{i=5;  kind='js';    file='js/vendor/jszip.min.js'; check='JSZip 3.10.1'},
  @{i=6;  kind='js';    file='js/app/main.js';        check='"use strict";'},
  @{i=7;  kind='js';    file='js/app/boot.js';        check='(function(){'},
  @{i=8;  kind='js';    file='js/vendor/jsqr.min.js'; check='jsqr@1.4.0'},
  @{i=9;  kind='js';    file='js/app/qrnav.js';       check='var QRNAV = (function(){'},
  @{i=10; kind='ailib'},
  @{i=11; kind='aivec'},
  @{i=12; kind='js';    file='js/app/sugai.js';       check='var SUGAI = (function(){'},
  @{i=13; kind='js';    file='js/app/sugdb.js';       check='var SUGDB = (function(){'},
  @{i=14; kind='js';    file='js/app/aid.js';         check='AI 사진 파악 자료집'},
  @{i=15; kind='js';    file='js/app/zoom.js';        check='사진 크게 보기'}
)
$repl = @{}   # 덩어리 번호 → 그 자리에 들어갈 태그
$code = @{}   # 파일 → 코드 (아래에서 세 군데 고친 뒤 쓴다)
foreach($p in $plan){
  $m = $ms[$p.i]; $body = $m.Groups[3].Value; $attr = $m.Groups[2].Value
  if($p.check -and $body.IndexOf($p.check) -lt 0 -and $attr.IndexOf($p.check) -lt 0){ throw "덩어리 $($p.i+1) 가 예상과 다름 : $($p.check) 없음" }
  switch($p.kind){
    'css' {
      W $p.file ($body.Trim("`n") + "`n")
      $idAttr = if($attr -match 'id="([^"]+)"'){ ' id="' + $Matches[1] + '"' } else { '' }
      $repl[$p.i] = '<link rel="stylesheet" href="' + $p.file + '"' + $idAttr + '>'
    }
    'js' {
      $t = $body
      if($p.file -like 'js/vendor/jsqr*'){ $t = [regex]::Replace($t, '(?m)^//# sourceMappingURL=.*$', '') }   # 우리 서버엔 없는 주소
      $code[$p.file] = $t.Trim("`n") + "`n"
      $repl[$p.i] = '<script src="' + $p.file + '"></script>'
    }
    'photos' {
      $ph = $body | ConvertFrom-Json
      $idx = [ordered]@{}; $nPhoto = 0; $bytesAll = 0
      foreach($codeName in $ph.PSObject.Properties.Name){
        $safe = $codeName -replace '[^A-Za-z0-9_\-]', '_'
        $arr = @(); $k = 0
        foreach($e in $ph.$codeName){
          $k++
          if($e.u -notmatch '^data:([a-z/+.-]+);base64,(.*)$'){ throw "사진 $codeName #$k 가 data URL 이 아님" }
          $mime = $Matches[1]; $b = [Convert]::FromBase64String($Matches[2])
          $rel = 'data/photos/' + $safe + '/' + ('{0:D2}' -f $k) + '.' + (ExtOf $mime)
          WB $rel $b; $nPhoto++; $bytesAll += $b.Length
          $o = [ordered]@{ n = $e.n; u = $rel }
          if($null -ne $e.cap){ $o.cap = $e.cap }
          $arr += [pscustomobject]$o
        }
        $idx[$codeName] = $arr
      }
      $json = ($idx | ConvertTo-Json -Depth 5 -Compress)
      W 'data/photos.js' ("/* 장소 사진 목록 — 사진 파일은 data/photos/<장소>/ 에 있다.`n   관리자 화면의 '사진 자료 묶음 내려받기'가 이 파일과 사진을 함께 만든다. */`nwindow.PHOTO_INDEX = " + $json + ";`n")
      $repl[$p.i] = '<script src="data/photos.js"></script>'
      Write-Host ("  [사진] {0}곳 · {1}장 · {2:N1} MB" -f $idx.Count, $nPhoto, ($bytesAll / 1MB)) -ForegroundColor Green
    }
    'ailib' {
      W 'data/ailib.js' ("/* AI 사진 자료집 (예전 index.html 안의 EMBEDDED_AILIB) — 관리자 화면 'AI 사진 자료집'에서 내려받은 파일로 바꾼다 */`nwindow.AILIB_DATA = " + $body.Trim() + ";`n")
      $repl[$p.i] = '<script src="data/ailib.js"></script>'
    }
    'aivec' {
      if($attr -notmatch 'src="aivec.js"'){ throw 'aivec.js 태그가 아님' }
      $d = Join-Path $OUT 'data'; if(-not (Test-Path $d)){ New-Item -ItemType Directory -Force -Path $d | Out-Null }
      Copy-Item -LiteralPath (Join-Path $ROOT 'aivec.js') -Destination (Join-Path $d 'aivec.js')
      $repl[$p.i] = '<script src="data/aivec.js"></script>'
    }
    'b3d' {
      $page = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(($body -replace '\s', '')))
      $PH = '<script>/*THREE_FROM_PARENT*/</script>'
      if($page.IndexOf($PH) -lt 0){ throw '실사 3D 에 three.js 자리표시가 없음' }
      $page = $page.Replace($PH, '<script src="../js/vendor/three.min.js"></script>')
      # 페이지 안의 그림(data URL)을 파일로 — 따옴표 안에 든 것만
      $k = 0; $saved = 0
      $page = [regex]::Replace($page, "(['""])data:(image/[a-z+.-]+);base64,([A-Za-z0-9+/=]+)\1", {
        param($mm)
        $script:k++
        $b = [Convert]::FromBase64String($mm.Groups[3].Value)
        $rel = 'tex/' + ('{0:D2}' -f $script:k) + '.' + (ExtOf $mm.Groups[2].Value)
        WB ('3d/' + $rel) $b; $script:saved += $b.Length
        return $mm.Groups[1].Value + $rel + $mm.Groups[1].Value
      })
      if($page -match 'data:image/'){ Write-Host '  [주의] 실사 3D 안에 따옴표 밖 data:image 가 남음' -ForegroundColor Yellow }
      W '3d/realistic.html' $page
      $repl[$p.i] = ''
      Write-Host ("  [실사 3D] 페이지 {0:N0}자 · 그림 {1}개 {2:N1} MB" -f $page.Length, $k, ($saved / 1MB)) -ForegroundColor Green
    }
  }
}

# ── 코드 세 군데 : 끼워 넣은 자료 대신 파일을 읽는다 ──
$main = $code['js/app/main.js']
$main = Swap1 $main @'
  var el = document.getElementById('EMBEDDED_PHOTOS');
  if(el){ try{ ROOM_PHOTOS = JSON.parse(el.textContent) || {}; }catch(e){ ROOM_PHOTOS = {}; } }
'@ @'
  /* 사진 목록은 data/photos.js 가 window.PHOTO_INDEX 에 넣는다. 고쳐도 원본이 안 바뀌게 복사해서 쓴다. */
  if(window.PHOTO_INDEX){ try{ ROOM_PHOTOS = JSON.parse(JSON.stringify(window.PHOTO_INDEX)) || {}; }catch(e){ ROOM_PHOTOS = {}; } }
'@ '사진 목록 : data/photos.js'
$i0 = $main.IndexOf('function mountBld3D(){'); $i1 = $main.IndexOf('/* 화면에 들어올 때마다 3D를')
if($i0 -lt 0 -or $i1 -le $i0){ throw 'mountBld3D 를 찾지 못함' }
$main = $main.Substring(0, $i0) + @'
function mountBld3D(){
  /* 실사 3D 는 3d/realistic.html 로 따로 있다 (예전에는 base64 로 품었다가 srcdoc 으로 풀었다).
     three.js 는 앱과 같은 파일(js/vendor/three.min.js)을 쓰므로 브라우저가 한 번만 받는다. */
  if(BLD3D_DONE) return;
  var box = document.getElementById('b3dBox');
  if(!box) return;
  BLD3D_DONE = true;
  var fr = document.createElement('iframe');
  fr.id = 'b3dFrame';
  fr.title = '군산대 공대 3호관 실사 3D';
  fr.setAttribute('allow', 'fullscreen');
  fr.setAttribute('scrolling', 'no');
  fr.onload = function(){
    var ld = document.getElementById('b3dLoad');
    if(ld) ld.style.display = 'none';
    bld3DHook(fr);                                   // v51
  };
  fr.src = '3d/realistic.html';
  box.appendChild(fr);
}
'@ + $main.Substring($i1)
Write-Host '  [코드] 실사 3D : 3d/realistic.html' -ForegroundColor Green
$code['js/app/main.js'] = $main

$sg = $code['js/app/sugai.js']
$sg = Swap1 $sg @'
      var el = document.getElementById('EMBEDDED_AILIB');
      if(el && el.textContent.trim()){
        var d = JSON.parse(el.textContent);
'@ @'
      var d = window.AILIB_DATA || null;   /* data/ailib.js 가 넣는다 */
      if(d){
'@ 'AI 자료집 : data/ailib.js'
$code['js/app/sugai.js'] = $sg

foreach($f in $code.Keys){ W $f $code[$f] }

# ── 화면 틀 : 덩어리를 태그로 바꿔 끼운다 (뒤에서부터 — 앞 위치가 안 밀리게) ──
$html = $s
for($j = $ms.Count - 1; $j -ge 0; $j--){
  $m = $ms[$j]
  $html = $html.Substring(0, $m.Index) + $repl[$j] + $html.Substring($m.Index + $m.Length)
}
W 'index.html' $html

$files = Get-ChildItem -LiteralPath $OUT -Recurse -File
Write-Host ("완료 : site\ — 파일 {0}개 · {1:N1} MB · index.html {2:N0}자" -f $files.Count, (($files | Measure-Object Length -Sum).Sum / 1MB), $html.Length)
