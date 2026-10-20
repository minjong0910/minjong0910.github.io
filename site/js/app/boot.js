(function(){
"use strict";
var phoneEl = document.querySelector('.phone');
if(!phoneEl) return; // 안전장치 : 기대한 구조가 아니면 아무것도 하지 않음

function makeOverlay(cls){
  var d = document.createElement('div');
  d.className = 'fx-overlay ' + (cls||'');
  phoneEl.appendChild(d);
  return d;
}

/* 터미널 로그가 타이핑된 뒤, 청록색 스캔 라인이 위→아래로 훑고 지나가며
   그 자리에서 실제 앱 화면이 드러나는 "스캔인" 전환으로 마무리된다. */
function scanReveal(boot, cb){
  var beam = document.createElement('div'); beam.className = 'fx-scan-beam';
  boot.appendChild(beam);
  boot.style.willChange = 'clip-path';
  var dur = 640, start = null;
  function ease(t){ return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function frame(ts){
    if(!start) start = ts;
    var t = Math.min(1, (ts - start) / dur);
    var e = ease(t);
    var pct = e * 100;
    beam.style.top = pct + '%';
    beam.style.opacity = (t < 0.05 || t > 0.95) ? Math.min(t / 0.05, (1 - t) / 0.05, 1) : 1;
    boot.style.clipPath = 'inset(' + pct + '% 0 0 0)';
    if(t < 1){ requestAnimationFrame(frame); }
    else {
      var flash = document.createElement('div'); flash.className = 'fx-scan-flash';
      boot.appendChild(flash);
      requestAnimationFrame(function(){ flash.classList.add('go'); });
      setTimeout(function(){
        flash.classList.remove('go');
        setTimeout(function(){ if(cb) cb(); }, 180);
      }, 90);
    }
  }
  requestAnimationFrame(frame);
}

(function bootSequence(){
  /* 새 판으로 조용히 바꿔 다는 중이면 켜는 화면을 아예 건너뛴다.
     pwa.js 가 화면을 새로 고치기 직전에 이 표시를 남긴다 — 그래야 사용자 눈에는
     '앱이 한 번 켜졌다'로만 보이고, 켜는 장면이 두 번 나오지 않는다.
     (앱 자체는 start.js 가 켜므로 이 덮개를 건너뛰어도 화면은 정상으로 뜬다) */
  /* 2026-10-20 : 이 파일은 3D 같은 큰 파일 뒤에 읽혀서, 그것들을 받는 동안 앱 첫 화면이 먼저 비쳤다
     (사용자 : 「QR 을 찍으면 설명한 순서대로 안 뜬다」 — 처음 여는 폰은 1초 넘게). 그래서 index.html 맨 앞에
     켜는 화면의 바탕(#fxPre)을 미리 그려 두고, 여기서 그것을 이어받는다. */
  var pre = document.getElementById('fxPre');
  try{
    if(sessionStorage.getItem('b3nav_quiet') === '1'){
      sessionStorage.removeItem('b3nav_quiet');
      if(pre) pre.remove();                 // pwa.js 가 미리 감춰 두었다(html.bootQuiet)
      return;
    }
  }catch(err){}
  /* 2026-10-21 : 켜는 화면 도중에 새 판으로 갈아탔으면(pwa.js applyUpdate — b3nav_boot_cont) 처음부터 다시 한 글자씩 찍지 않고
     줄을 한꺼번에 보이며 이어 간다 — 사용자 눈에는 켜는 화면이 한 번만 뜬다(사용자 : 「초록 화면이 두 번 뜬다」). */
  var cont = false;
  try{ cont = sessionStorage.getItem('b3nav_boot_cont') === '1'; if(cont) sessionStorage.removeItem('b3nav_boot_cont'); }catch(err){}

  var boot = pre || makeOverlay('fx-boot');
  var preFirst = '';                        // 바탕에 미리 찍혀 있던 첫 줄 (커서 ▊ 뺌)
  if(pre){ var pp = pre.querySelector('pre'); preFirst = pp ? pp.textContent.replace(/▊$/, '') : ''; pre.removeAttribute('id'); pre.classList.remove('fx-pre'); }
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
    if(cont){ lines.push(text); paint(); setTimeout(typeNext, 0); return; }   // 이어서 — 한 줄씩 한꺼번에
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
    /* 사용자 순서 (2026-10-20) : QR → 앱 켜짐 → 초록 글 화면 → 쉬운 사용모드 켜기/끄기 → 「여기가 맞나요?」 — 한 단계씩.
       물어야 하면 쉬운 사용모드 화면(불투명)을 이 초록 화면 **바로 아래**에 먼저 깔아 두고 걷는다 → 스캔이 지나가면
       앱이 아니라 그 화면이 드러난다. 답하면 그 화면이 사라지며 앱이 보인다(easy.js askFirst). 초록 글과 함께 뜨지 않는다. */
    if(typeof EASY !== 'undefined' && EASY.askFirst) EASY.askFirst();
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
  /* 첫 줄은 index.html 의 바탕(#fxPre)에 이미 찍혀 있으면 그대로 두고 이어서 찍는다 — 처음 여는 폰이 큰 파일을 받는 동안에도 초록 글이 보이게 (2026-10-20) */
  var FIRST = ko ? '> 공대 3호관 길안내' : '> Engineering Bldg 3 Navigator';
  if(preFirst === FIRST){ lines.push(FIRST); paint(); } else say(FIRST);
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
  /* AI 자료(10MB)는 여기서 받지 않는다 — 사진으로 찾을 때 SUGAI.ensureData() 가 받는다 */
  var nPlace = (window.PLACE_CODES || []).length;
  say(ko ? AI_KO + '장소 ' + nPlace + '곳 · 자료는 사진으로 찾을 때 받습니다'
         : AI_EN + nPlace + ' places · data loads when you search by photo');

  /* ② 문서를 다 읽으면 나머지를 적고 닫는다 */
  function afterLoad(){
    loadedAt = Date.now();
    /* 방금 찍은 출입문 QR 이 먼저(아직 「여기가 맞나요?」 전이라도) — 예전에 확정한 문(3시간 기억)보다 앞선다. 「정하지 않음」으로 쓰지 않게 (2026-10-20) */
    var g = (typeof PWA !== 'undefined' && PWA.peekGate) ? PWA.peekGate() : null;
    if(!g && typeof QRNAV !== 'undefined' && QRNAV.gate) g = QRNAV.gate();
    var GN = {MAIN:['정문', 'main gate'], BACK:['후문', 'back gate'], EAST:['동문', 'east gate'], WEST:['서문', 'west gate']};
    say(ko ? ('> 출발 위치 ··· ' + (g && GN[g] ? GN[g][0] + ' (QR로 확인)' : '정하지 않음 — 1층에서 출발'))
           : ('> Start ··· ' + (g && GN[g] ? GN[g][1] + ' (from QR)' : 'not set — starting at 1F')));
    say(ko ? '> 시작합니다' : '> Starting');
    ready = true; maybeFinish();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', afterLoad);
  else setTimeout(afterLoad, 0);
})();
})();
