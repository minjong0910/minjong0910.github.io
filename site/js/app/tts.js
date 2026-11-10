"use strict";
/* tts.js — 음성 안내 (2026-11-10 사용자 「음성 안내 이제 실제 앱에 반영해줘」)
   처음 온 세 사람 평가에서 받은 의견 9가지 중 남아 있던 하나 — 「걸으면서 화면 보기 어렵다 → 음성 안내로」.

   · 길안내 단계가 바뀔 때마다(길안내 시작 · 다음 · 이전 · 좌우로 밀기 · 휴대폰 뒤로가기 · 엘리베이터/계단 바꾸기 · 이어 하기 · 다시 출발)
     그 단계 문장(guide.js 의 steps[si].tko / 영어면 .ten)을 소리로 읽고 짧게 진동한다.
   · 도착 화면에 오면 「13524호, 도착했습니다. 문 옆 명패를 확인하세요.」
   · 노란 안내판 오른쪽 🔊 단추로 켜고 끈다(이 폰에 기억 — b3nav_tts, 처음엔 켜짐). 켜져 있을 때 안내판을 누르면 다시 읽는다.
     읽는 동안 단추가 깜빡인다. (설정의 「음성 안내」 줄은 넣었다가 뺐다 — 사용자 11/10 「설정에 넣지 말 것」, 줄이 늘어 「문제 기록」이 밀려났다)
   · 길안내 · 도착 화면을 떠나거나, 화면이 꺼지거나 다른 앱으로 가면 읽던 것을 멈춘다. 같은 단계를 다시 그릴 때는 되풀이하지 않는다.
   · 폰에 들어 있는 목소리(speechSynthesis) — 서버 · 비용 없음, 인터넷 없이도 대개 된다(안드로이드 · 아이폰 기본 한국어 목소리).
     아이폰은 「누른 그 순간」에만 처음 소리를 낼 수 있어서, 단계를 그리는 그 자리에서 바로 읽는다(기다렸다 읽지 않는다).
   · 영어로 쓸 때는 영어 문장을 영어 목소리로 읽는다.
   guide.js render6 · startGuide, shell.js go 를 감싼다(story.js · voice.js 다음에 읽는다). */
var TTS = (function(){
  var KEY = 'b3nav_tts';
  var syn = window.speechSynthesis, Utt = window.SpeechSynthesisUtterance;
  var ok = !!(syn && Utt);
  function lsGet(){ try{ return localStorage.getItem(KEY); }catch(e){ return null; } }
  function lsSet(v){ try{ localStorage.setItem(KEY, v); }catch(e){} }
  var on = lsGet() !== '0';
  function ko(){ return typeof LANG === 'undefined' || LANG === 'ko'; }
  function T(k, e){ return ko() ? k : e; }
  var s6 = document.getElementById('s6'), s7 = document.getElementById('s7');
  function vis(el){ return !!(el && el.classList.contains('on')); }

  /* ── 목소리 고르기 — 그 말의 목소리 중 폰 안에 있는 것(인터넷 없이 되는 것)을 먼저 ── */
  var voices = [];
  function loadVoices(){ try{ voices = syn.getVoices() || []; }catch(e){ voices = []; } }
  if(ok){ loadVoices(); try{ syn.addEventListener('voiceschanged', loadVoices); }catch(e){ try{ syn.onvoiceschanged = loadVoices; }catch(e2){} } }
  function pickVoice(lang){
    var want = lang.slice(0, 2).toLowerCase(), best = null;
    for(var i = 0; i < voices.length; i++){
      var v = voices[i], l = String(v.lang || '').toLowerCase();
      if(l.indexOf(want) !== 0) continue;
      if(!best || (v.localService && !best.localService)) best = v;
    }
    return best;
  }
  /* 읽기 좋게 — 화살표 · 기호는 빼고, 영어 문장의 「3층」은 floor 3 */
  function clean(t){
    t = String(t || '');
    if(!ko()) t = t.replace(/(\d)\s*층/g, 'floor $1').replace(/\b(\d)F\b/g, 'floor $1').replace(/\bB1\b/g, 'basement 1');   // 「3F」를 「three F」로 읽지 않게
    return t.replace(/[←→↑↓↗↖↘↙✓›‹·「」]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  var btn = null, timer = 0;
  function talking(yes){ if(btn) btn.classList.toggle('talk', !!yes); }
  function say(text){
    if(!ok || !on) return;
    text = clean(text); if(!text) return;
    var lang = ko() ? 'ko-KR' : 'en-US';
    function speak(){
      try{
        var u = new Utt(text); u.lang = lang;
        var v = pickVoice(lang); if(v) u.voice = v;
        u.rate = ko() ? 1.0 : 0.95; u.pitch = 1; u.volume = 1;
        u.onstart = function(){ talking(true); };
        u.onend = u.onerror = function(){ talking(false); };
        syn.speak(u);
      }catch(e){ talking(false); }
    }
    clearTimeout(timer);
    var busy = false; try{ busy = syn.speaking || syn.pending; }catch(e){}
    if(busy){ try{ syn.cancel(); }catch(e){} timer = setTimeout(speak, 80); }   // 크롬은 cancel 바로 뒤 speak 가 가끔 묻힌다
    else speak();                                                               // 아이폰 : 누른 그 순간에 바로
  }
  function stop(){ clearTimeout(timer); talking(false); if(ok){ try{ syn.cancel(); }catch(e){} } }
  function buzz(){ if(on && navigator.vibrate){ try{ navigator.vibrate(35); }catch(e){} } }

  /* ── 무엇을 읽나 ── */
  function stepText(){
    try{ var s = steps[si]; return s ? (ko() ? s.tko : (s.ten || s.tko)) : ''; }catch(e){ return ''; }
  }
  function arriveText(){
    var b = s7 && s7.querySelector('.stBand .ko'), d = b ? b.textContent : '';
    if(ko()){ d = d.replace(/\s*도착\s*$/, ''); return (d ? d + ', ' : '') + '도착했습니다. 문 옆 명패를 확인하세요.'; }
    d = d.replace(/^\s*Arrived\s*·\s*/, ''); return 'You have arrived' + (d ? ' at ' + d : '') + '. Check the name plate next to the door.';
  }
  var lastKey = '';
  function speakStep(force){
    if(!vis(s6)) return;
    var t = stepText(), k = 's6|' + (typeof si !== 'undefined' ? si : '') + '|' + (ko() ? 'k' : 'e') + '|' + t;
    if(!force && k === lastKey) return;                // 같은 단계를 다시 그릴 때(사진 넘기기 · 크기 바뀜)는 되풀이하지 않는다
    lastKey = k; buzz(); say(t);
  }
  function speakArrive(force){
    if(!vis(s7)) return;
    var t = arriveText(), k = 's7|' + (ko() ? 'k' : 'e') + '|' + t;
    if(!force && k === lastKey) return;
    lastKey = k; buzz(); say(t);
  }

  /* ── 노란 안내판 오른쪽 🔊 단추 ── */
  var SPK = '<path d="M11 5 6 9H2v6h4l5 4V5z"/>';
  var ICON_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + SPK + '<path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.7 5.3a9.5 9.5 0 0 1 0 13.4"/></svg>';
  var ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + SPK + '<path d="M22 9l-6 6"/><path d="M16 9l6 6"/></svg>';
  function paint(){
    if(btn){
      btn.innerHTML = on ? ICON_ON : ICON_OFF;
      btn.classList.toggle('off', !on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? T('음성 안내 끄기', 'Turn off voice guidance') : T('음성 안내 켜기', 'Turn on voice guidance'));
      btn.title = btn.getAttribute('aria-label');
    }
  }
  function set(v){ on = !!v; lsSet(on ? '1' : '0'); if(!on) stop(); paint(); }
  var sign = s6 && s6.querySelector('.stSign');
  if(sign){
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ttsBtn';
    sign.appendChild(btn);
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      set(!on);
      if(on){ lastKey = ''; speakStep(true); }
    });
    sign.addEventListener('click', function(e){                 // 켜져 있으면 안내판을 눌러 다시 듣기
      if(e.target.closest && e.target.closest('.ttsBtn')) return;
      if(on){ lastKey = ''; speakStep(true); }
    });
  }
  paint();

  /* ── 감싸기 ── */
  if(typeof render6 === 'function'){
    var _r6 = render6;
    window.render6 = function(){ var r = _r6.apply(this, arguments); paint(); try{ speakStep(false); }catch(e){} return r; };
  }
  if(typeof startGuide === 'function'){
    var _sg = startGuide;   // 길안내 시작 → 단계를 그린 다음 화면이 바뀌므로(그릴 때는 아직 안 보임) 바뀐 뒤 그 자리에서 읽는다
    window.startGuide = function(){ lastKey = ''; var r = _sg.apply(this, arguments); try{ speakStep(false); }catch(e){} return r; };   // 안에서 go(6) 이 이미 읽었으면 되풀이하지 않는다
  }
  if(typeof go === 'function'){
    var _go = go;
    window.go = function(id){
      var r = _go.apply(this, arguments);
      var to = typeof id === 'number' ? 's' + id : String(id);
      try{
        if(to === 's6') speakStep(false);
        else if(to === 's7') speakArrive(false);
        else { stop(); lastKey = ''; }
        paint();
      }catch(e){}
      return r;
    };
  }
  document.addEventListener('visibilitychange', function(){ if(document.hidden){ stop(); lastKey = ''; } });

  return {
    isOn: function(){ return on; },
    supported: function(){ return ok; },
    /* 켜고 끄기(누른 자리에서 부를 것 — 켤 때 한마디로 아이폰 소리가 열린다) */
    toggle: function(){ set(!on); if(on) say(T('음성 안내를 켰어요. 길안내 단계마다 읽어 드릴게요.', 'Voice guidance is on.')); },
    set: set, say: say, stop: stop,
    /* 검사용 */
    text: function(){ return vis(s7) ? arriveText() : stepText(); }
  };
})();
