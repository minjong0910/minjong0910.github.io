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

/* 켜는 화면이 걷히는 장면 — 살짝 커지며 투명해진다.
   걷히기 시작하면 willChange = 'clip-path' 를 단다 : pwa.js 는 이것을 보고 「켜는 화면이 이미 끝났다」고 본다(새 판 갈아타기),
   시험(tests/pwa.html)도 「걷히는 중」으로 센다. (2026-11-03 전에는 청록 줄이 위에서 아래로 훑는 「스캔인」이었다) */
function reveal(boot, cb){
  boot.style.willChange = 'clip-path';
  boot.style.transition = 'opacity .42s ease, transform .42s ease';
  boot.style.transformOrigin = '50% 60%';
  requestAnimationFrame(function(){ boot.style.opacity = '0'; boot.style.transform = 'scale(1.05)'; });
  setTimeout(function(){ if(cb) cb(); }, 450);
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
  /* 2026-10-21 : 켜는 화면 도중에 새 판으로 갈아탔으면(pwa.js applyUpdate — b3nav_boot_cont) 처음부터 다시 보이지 않고
     끝 장면 가까이에서 이어 간다 — 사용자 눈에는 켜는 화면이 한 번만 뜬다(사용자 : 「초록 화면이 두 번 뜬다」). */
  var cont = false;
  try{ cont = sessionStorage.getItem('b3nav_boot_cont') === '1'; if(cont) sessionStorage.removeItem('b3nav_boot_cont'); }catch(err){}

  var boot = pre || makeOverlay('fx-boot');
  if(pre){ pre.removeAttribute('id'); pre.classList.remove('fx-pre'); }
  var ko = (typeof LANG === 'undefined' || LANG === 'ko');
  /* 2026-11-03 사용자 : 「초록 로고 글 화면을 빼고 그 자리에 밝은 화면 시작 화면 견본을」 — 학생이 3호관 복도를 걸어 13324 강의실 문 앞에 도착하는 장면.
     견본(3D)을 그대로 찍은 동영상 img/splash.mp4(5.3초)를 재생하고, 제목은 그 위에 글자로 얹는다(한국어 · 영어).
     앱에서 3D 로 직접 그리면 폰마다 느리고 앱도 늦게 켜져서(윈도 노트북 시험 : 3D 준비에만 4초) 동영상으로 했다 — 만들기는 도구\시작화면\영상_만들기.ps1.
     동영상은 index.html 의 바탕(#fxPre)에 미리 넣어 두어 큰 파일을 받는 동안에도 바로 재생된다. 예전 초록 글 줄은 없앴다. 앱의 밝은 · 어두운 모드와 상관없이 늘 밝은 화면. */
  var vid = boot.querySelector('video.spVid');
  if(!vid){
    vid = document.createElement('video'); vid.className = 'spVid'; vid.muted = true; vid.playsInline = true; vid.setAttribute('playsinline', ''); vid.setAttribute('muted', '');
    vid.preload = 'auto'; vid.poster = 'img/splash_first.jpg'; vid.src = 'img/splash.mp4'; boot.insertBefore(vid, boot.firstChild);
  }
  Array.prototype.forEach.call(boot.querySelectorAll('.spPre'), function(e){ e.remove(); });
  boot.insertAdjacentHTML('beforeend', '<div class="spScrim"></div>' +
    '<div class="spTtl"><div class="k"><i></i>' + (ko ? '공대 3호관 길안내' : 'Eng. Bldg 3 Navigator') + '</div>' +
    '<h1>' + (ko ? '사진을 따라, 문 앞까지' : 'Follow the photos to the door') + '</h1>' +
    '<p>' + (ko ? '처음 온 곳도 사진만 따라오면 돼요' : 'New here? Just follow the photos.') + '</p></div>' +
    '<div class="spSkip">' + (ko ? '화면을 누르면 바로 시작해요' : 'Tap to start') + '</div>');
  var ttl = boot.querySelector('.spTtl'), skip = boot.querySelector('.spSkip'), scrim = boot.querySelector('.spScrim');
  var done = false, ready = false, animDone = false, d3Done = false, flat = false, MAX_MS = 12000;
  var T_TITLE0 = 4.05, T_TITLE1 = 4.85, T_END = 5.1;   // 동영상 안 시각(초) — 견본과 같다
  /* 동영상을 못 트는 폰(아이폰 저전력 모드 · 동영상 막힘 · 처음 열 때 너무 느린 인터넷) — 끝 장면 그림에 제목만 얹고 잠깐 뒤에 닫는다 */
  function goFlat(){
    if(flat || done) return; flat = true;
    boot.classList.add('spFlat');
    setTimeout(function(){ animDone = true; maybeFinish(); }, cont ? 300 : 1400);
  }
  vid.addEventListener('error', goFlat);
  vid.addEventListener('ended', function(){ animDone = true; maybeFinish(); });
  try{ vid.muted = true; if(cont && vid.readyState >= 1) vid.currentTime = 3.6; var pr = vid.play(); if(pr && pr['catch']) pr['catch'](goFlat); }catch(err){ goFlat(); }
  if(cont) vid.addEventListener('loadedmetadata', function(){ try{ if(vid.currentTime < 3.6) vid.currentTime = 3.6; }catch(err){} });
  setTimeout(function(){ if(!done && !flat && (vid.currentTime || 0) < .05) goFlat(); }, 2500);   // 2.5초가 지나도 안 움직이면
  (function tick(){
    if(done) return;
    var t = flat ? T_TITLE1 : (vid.currentTime || 0);
    var tp = Math.max(0, Math.min(1, (t - T_TITLE0) / (T_TITLE1 - T_TITLE0))); tp = 1 - Math.pow(1 - tp, 3);
    ttl.style.opacity = tp; ttl.style.transform = 'translateY(' + (14 * (1 - tp)) + 'px)'; scrim.style.opacity = tp; skip.style.opacity = .8 * (1 - tp);
    if(!flat && !animDone && t >= T_END){ animDone = true; maybeFinish(); }
    requestAnimationFrame(tick);
  })();
  function maybeFinish(){
    if(!ready || !d3Done || !animDone || done) return;
    finishBoot();
  }
  function finishBoot(){
    if(done) return; done = true;
    /* 사용자 순서 (2026-10-20) : QR → 앱 켜짐 → 켜는 화면 → 쉬운 사용모드 켜기/끄기 → 「여기가 맞나요?」 — 한 단계씩.
       물어야 하면 쉬운 사용모드 화면(불투명)을 이 켜는 화면 **바로 아래**에 먼저 깔아 두고 걷는다 → 켜는 화면이 걷히면
       앱이 아니라 그 화면이 드러난다. 답하면 그 화면이 사라지며 앱이 보인다(easy.js askFirst). 켜는 화면과 함께 뜨지 않는다. */
    boot.style.willChange = 'clip-path';
    if(typeof EASY !== 'undefined' && EASY.askFirst) EASY.askFirst();
    reveal(boot, function(){ try{ vid.pause(); vid.removeAttribute('src'); vid.load(); }catch(err){} boot.remove(); });
  }
  boot.addEventListener('click', finishBoot);   // 누르면 바로 시작
  setTimeout(finishBoot, MAX_MS);               // 안전장치 — 무슨 일이 있어도 이 시간 뒤에는 앱을 보여 준다

  /* 앱의 3D 는 글꼴을 받은 뒤(최대 1.5초) bootApp 이 만든다. 첫 화면에는 3D 가 없으므로 오래 기다리지 않는다 —
     문서를 다 읽은 뒤 1.5초 안에 안 되면 그냥 닫는다 (3D 는 뒤에서 계속 만들어진다). */
  var glOK = null, loadedAt = 0;
  function webglOK(){
    if(glOK === null){ try { var c = document.createElement('canvas'); glOK = !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch(e){ glOK = false; } }
    return glOK;
  }
  (function wait3D(){
    var have = typeof renderer !== 'undefined' && renderer;
    if(!have && webglOK() && !(loadedAt && Date.now() - loadedAt > 1500)){ setTimeout(wait3D, 50); return; }
    d3Done = true; maybeFinish();
  })();
  function afterLoad(){ loadedAt = Date.now(); ready = true; maybeFinish(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', afterLoad);
  else setTimeout(afterLoad, 0);
})();
})();
