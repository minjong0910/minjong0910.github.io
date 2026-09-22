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
})();
