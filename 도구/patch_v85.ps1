# v85 — 부팅 화면 : 가짜 문구를 없애고, 실제로 준비된 것만 진짜 숫자로
#
#   예전 부팅 화면은 실제로 하지 않는 일 20줄을 타이머로 한 글자씩 찍었다.
#     "KERNEL LOADED" · "BIM 데이터 로드" · "보안 프로토콜 확인... PASS" · "시스템 무결성 검사... 100%" …
#   이 앱에는 커널도, BIM 자료도, 보안 검사도 없다. 그리고 그 글자를 다 찍느라 앱을 열 때마다
#   7초쯤(안전장치는 10초) 기다리게 했다 — 준비가 끝났어도.
#
#   이제는
#     · 실제로 준비된 것만, 진짜 숫자로 적는다 — 건물 자료(층·호실 수), 3D, 사진 수,
#       AI 사진 판별 자료(장소·기준 수), 출발 위치(QR)
#     · 부팅 화면이 실제로 가리고 있던 대기 시간은 AI 자료(aivec.js, 8.5MB)를 받는 시간이다.
#       그 동안 "받는 중"이라고 정직하게 적고, 다 받으면 숫자로 바꾼다.
#     · 준비가 끝나면 바로 닫는다 (가장 짧게 0.7초 — 번쩍하고 사라지지 않게). 모양(네온 터미널)은 그대로.
#
#   사용법 : pwsh -File patch_v85.ps1 <대상파일>
param([string]$Target)
$ErrorActionPreference = 'Stop'
if(-not (Test-Path $Target)){ throw "파일이 없습니다: $Target" }
$s = [System.IO.File]::ReadAllText($Target, [System.Text.Encoding]::UTF8)
$n = 0
function SwapRange([string]$from, [string]$to, [string]$new, [string]$label){
  $script:n++
  $from = $from -replace "`r`n", "`n"; $to = $to -replace "`r`n", "`n"; $new = $new -replace "`r`n", "`n"
  $a = ([regex]::Matches($script:s, [regex]::Escape($from))).Count
  $b = ([regex]::Matches($script:s, [regex]::Escape($to))).Count
  if($a -ne 1 -or $b -ne 1){ throw ("[{0}] 시작 앵커 {1}개 · 끝 앵커 {2}개" -f $label, $a, $b) }
  $i = $script:s.IndexOf($from); $j = $script:s.IndexOf($to)
  if($j -le $i){ throw ("[{0}] 끝 앵커가 시작보다 앞에 있음" -f $label) }
  $script:s = $script:s.Substring(0, $i) + $new + $script:s.Substring($j + $to.Length)   # 끝 앵커까지 바꾼다
  Write-Host ("  [OK] {0}  ({1}자 → {2}자)" -f $label, ($j - $i), $new.Length) -ForegroundColor Green
}

# 끝 앵커 = 옛 부팅 코드의 마지막 두 줄 — 이 두 줄까지 함께 바꾼다
SwapRange '(function bootSequence(){' @'
  setTimeout(finishBoot, safetyMs);
})();
'@ @'
(function bootSequence(){
  var boot = makeOverlay('fx-boot');
  var ko = (typeof LANG === 'undefined' || LANG === 'ko');
  boot.innerHTML =
    '<div class="fx-scan-noise"></div>' +
    '<div class="fx-boot-body"><pre id="fxBootLog"></pre><div class="fx-boot-skip">' +
    (ko ? '탭하여 건너뛰기' : 'Tap to skip') + '</div></div>';
  /* v85 : 예전에는 실제로 하지 않는 일(KERNEL LOADED · BIM 데이터 · 보안 프로토콜 PASS 등) 20줄을
     타이머로 찍느라 앱을 열 때마다 7초쯤 기다리게 했다. 이제는 실제로 준비된 것만 진짜 숫자로 적고,
     준비가 끝나면 바로 닫는다. 모양(네온 터미널 · 한 글자씩 · 스캔인)은 그대로 둔다. */
  var log = document.getElementById('fxBootLog');
  var lines = [], queue = [], typing = false, done = false, ready = false, t0 = Date.now();
  var MIN_MS = 700, MAX_MS = 12000;
  function num(v){ return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function paint(cur){ log.textContent = lines.join('\n') + (cur !== undefined ? (lines.length ? '\n' : '') + cur : ''); }
  /* 줄을 한 글자씩 찍는다 (한 글자 6ms — 멋은 살리되 기다리게 하지는 않는다) */
  function say(text){ queue.push(text); if(!typing) typeNext(); }
  function typeNext(){
    if(!queue.length){ typing = false; maybeFinish(); return; }
    typing = true;
    var text = queue.shift(), ci = 0;
    (function step(){
      if(done) return;
      if(ci < text.length){ ci += 2; paint(text.slice(0, ci) + '▊'); setTimeout(step, 12); }
      else { lines.push(text); paint(); setTimeout(typeNext, 40); }
    })();
  }
  /* 이미 끝난 줄을 고친다 (AI 자료 '받는 중' → 숫자) */
  function fix(prefix, text){
    for(var i = lines.length - 1; i >= 0; i--) if(lines[i].indexOf(prefix) === 0){ lines[i] = text; paint(); return true; }
    for(i = 0; i < queue.length; i++) if(queue[i].indexOf(prefix) === 0){ queue[i] = text; return true; }
    return false;
  }
  function maybeFinish(){
    if(!ready || !d3Done || typing || queue.length || done) return;
    var wait = MIN_MS - (Date.now() - t0);
    setTimeout(finishBoot, Math.max(0, wait));
  }
  function finishBoot(){
    if(done) return; done = true;
    scanReveal(boot, function(){ boot.remove(); });
  }
  boot.addEventListener('click', finishBoot);
  setTimeout(finishBoot, MAX_MS);   // 안전장치 — 무슨 일이 있어도 이 시간 뒤에는 앱을 보여 준다

  /* ① 지금 이미 준비된 것 — 이 줄보다 앞의 코드가 만들어 둔 값을 센다 */
  var rooms = 0;
  for(var lv = 1; lv <= FLOORS; lv++) if(FLOOR_LAYOUT[lv]) rooms += Object.keys(FLOOR_LAYOUT[lv].lookup).length;
  var pk = 0, pc = 0;
  if(typeof ROOM_PHOTOS === 'object' && ROOM_PHOTOS) Object.keys(ROOM_PHOTOS).forEach(function(k){
    var c = (ROOM_PHOTOS[k] || []).length; if(c){ pk++; pc += c; }
  });
  say(ko ? '> 공대 3호관 길안내' : '> Engineering Bldg 3 Navigator');
  say(ko ? ('> 건물 자료 ··· 지상 ' + FLOORS + '개 층 · 지하 1층 · 호실 ' + rooms + '곳')
         : ('> Building ··· ' + FLOORS + ' floors · B1 · ' + rooms + ' rooms'));
  /* 3D 는 글꼴을 받은 뒤(최대 1.5초) bootApp 이 만든다. 첫 화면에는 3D 가 없으므로 오래 기다리지 않는다 —
     문서를 다 읽은 뒤 1.5초 안에 안 되면 "이어서 준비"라고 적고 닫는다 (3D 는 뒤에서 계속 만들어진다). */
  var D3_KO = '> 3D 화면 ··· ', D3_EN = '> 3D view ··· ', d3Done = false, loadedAt = 0;
  say(ko ? D3_KO + '준비 중…' : D3_EN + 'preparing…');
  /* WebGL 이 되는지는 한 번만 본다 — 확인용 그림판을 자꾸 만들면 브라우저가 앱의 3D 를 밀어낼 수 있다 */
  var glOK = null;
  function webglOK(){
    if(glOK === null){ try { var c = document.createElement('canvas'); glOK = !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch(e){ glOK = false; } }
    return glOK;
  }
  (function wait3D(){
    if(typeof renderer !== 'undefined' && renderer){
      fix(ko ? D3_KO : D3_EN, ko ? D3_KO + '준비됨' : D3_EN + 'ready');
    } else if(!webglOK()){
      fix(ko ? D3_KO : D3_EN, ko ? D3_KO + '이 기기에서는 쓸 수 없음 (글로 안내합니다)' : D3_EN + 'not available (text guidance)');
    } else if(loadedAt && Date.now() - loadedAt > 1500){
      fix(ko ? D3_KO : D3_EN, ko ? D3_KO + '이어서 준비합니다 (첫 화면에는 필요 없음)' : D3_EN + 'continuing in background');
    } else { setTimeout(wait3D, 50); return; }
    d3Done = true; maybeFinish();
  })();
  say(ko ? ('> 장소 사진 ··· ' + pk + '곳 · ' + num(pc) + '장') : ('> Photos ··· ' + pk + ' places · ' + num(pc)));
  var AI_KO = '> AI 사진 판별 자료 ··· ', AI_EN = '> Photo-AI data ··· ';
  say(ko ? AI_KO + '받는 중…' : AI_EN + 'loading…');

  /* ② 문서를 다 읽으면(AI 자료 aivec.js 까지 받으면) 나머지를 적고 닫는다 */
  function afterLoad(){
    loadedAt = Date.now();
    var d = window.AIVEC_DATA, p = ko ? AI_KO : AI_EN;
    var places = 0;
    if(d && d.codes){ var seen = {}; d.codes.forEach(function(c){ seen[String(c).toUpperCase()] = 1; }); places = Object.keys(seen).length; }
    fix(p, d && d.codes
      ? p + (ko ? ('장소 ' + places + '곳 · 기준 ' + num(d.n || d.codes.length) + '개') : (places + ' places · ' + num(d.n || d.codes.length) + ' refs'))
      : p + (ko ? '사진으로 위치를 찾을 때 받습니다' : 'loaded when you search by photo'));
    var g = (typeof QRNAV !== 'undefined' && QRNAV.gate) ? QRNAV.gate() : null;
    var GN = {MAIN:['정문', 'main gate'], BACK:['후문', 'back gate'], EAST:['동문', 'east gate'], WEST:['서문', 'west gate']};
    say(ko ? ('> 출발 위치 ··· ' + (g && GN[g] ? GN[g][0] + ' (QR로 확인)' : '정하지 않음 — 1층에서 출발'))
           : ('> Start ··· ' + (g && GN[g] ? GN[g][1] + ' (from QR)' : 'not set — starting at 1F')));
    say(ko ? '> 시작합니다' : '> Starting');
    ready = true; maybeFinish();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', afterLoad);
  else setTimeout(afterLoad, 0);
})();
'@ '부팅 화면'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
