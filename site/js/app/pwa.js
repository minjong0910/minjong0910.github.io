"use strict";
/* pwa.js — 앱 다운로드(홈 화면에 설치) · 인터넷 없이 열기(sw.js) · 출입문 QR 주소(?gate=) 받기

   head 에서 일찍 읽는다. 이유 두 가지
     ① 안드로이드 크롬이 "설치할 수 있어요" 신호(beforeinstallprompt)를 한 번만 주는데, 놓치면 버튼이 안 된다.
        이 신호를 받으면 브라우저가 스스로 띄우는 설치 알림은 막는다 — 설치는 설정의 「앱 다운로드」에서만.
     ② 출입문 QR(https://…/?gate=MAIN)로 들어오면, 뒤로가기 장치(shell.js)가 주소를 복사하기 전에
        ?gate= 를 떼어 둔다. 안 떼면 새로고침할 때마다 "정문에 계신가요?"가 다시 뜬다.

   설치 방법은 기기마다 다르다
     안드로이드 크롬·삼성 인터넷   신호가 왔으면 버튼 한 번 → 브라우저의 설치 창
     아이폰·아이패드               웹이 대신 설치할 수 없다 → 공유 → 홈 화면에 추가 그림 안내
     카카오톡·인스타 같은 앱 안     설치가 안 된다 → 크롬/사파리로 열기 안내
     그 밖(신호가 아직 없음·PC)     브라우저 메뉴의 "앱 설치 / 홈 화면에 추가" 안내 */
var PWA = (function(){
  var APP_NAME = '3호관 길안내';
  var deferred = null;          // 안드로이드 크롬이 준 설치 신호 (한 번 쓰면 끝)
  var justInstalled = false;
  var gateFromUrl = null;
  var off = {state:'', done:0, total:0, bytes:0};   // 인터넷 없이 열기 준비 상태 (sw.js 가 알려 준다)

  /* ── ① 출입문 QR 주소 ── */
  try{
    var gm = location.search.match(/[?&]gate=([A-Za-z]+)/);
    if(gm){
      gateFromUrl = gm[1].toUpperCase();
      var rest = location.search.replace(/([?&])gate=[^&]*(&|$)/, '$1').replace(/[?&]$/, '');
      history.replaceState(history.state, '', location.pathname + rest + location.hash);
    }
  }catch(e){}
  /* QRNAV.fromUrl() 이 한 번 가져간다 */
  function takeGate(){ var g = gateFromUrl; gateFromUrl = null; return g; }

  /* ── 기기 알아보기 ── (검사가 여러 기기 흉내를 넣어 볼 수 있게 글자만 받는 함수로) */
  var UA = navigator.userAgent || '';
  function envOf(ua, platform, touch){
    var ios = /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && touch > 1);   // 아이패드는 PC 인 척한다
    var android = /Android/.test(ua), app = '';
    /* 앱 안 브라우저 — 여기서는 어떤 기기든 설치가 안 된다 */
    if(/KAKAOTALK/i.test(ua)) app = '카카오톡';
    else if(/NAVER\(inapp/i.test(ua)) app = '네이버';
    else if(/Instagram/.test(ua)) app = '인스타그램';
    else if(/FBAN|FBAV|FB_IAB/.test(ua)) app = '페이스북';
    else if(/\bLine\//.test(ua)) app = '라인';
    else if(/DaumApps/.test(ua)) app = '다음';
    else if(/everytimeApp/i.test(ua)) app = '에브리타임';
    else if(android && /; wv\)/.test(ua)) app = '앱';
    return {ios:ios, android:android, inapp:app};
  }
  var ENV = envOf(UA, navigator.platform, navigator.maxTouchPoints || 0);
  function isIOS(){ return ENV.ios; }
  function isAndroid(){ return ENV.android; }
  function inAppName(){ return ENV.inapp; }
  /* 어떤 안내를 보일지 — 이미 앱 → 앱 안 브라우저 → 안드로이드 설치 신호 → 아이폰 → 방금 설치 → 안드로이드/PC */
  function pick(env){
    if(env.standalone) return 'already';
    if(env.inapp) return 'inapp';
    if(env.prompt) return 'prompt';
    if(env.ios) return 'ios';
    if(env.installed) return 'done';
    return env.android ? 'android' : 'desktop';
  }
  function standalone(){
    try{ if(window.matchMedia('(display-mode: standalone)').matches) return true; }catch(e){}
    return navigator.standalone === true;
  }
  function ko(){ return (typeof LANG === 'undefined' || LANG === 'ko'); }

  /* ── ② 안드로이드 설치 신호 ── */
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();          // 브라우저가 알아서 띄우는 설치 알림은 막는다 (설치는 설정에서만)
    deferred = e;
    sync();
  });
  window.addEventListener('appinstalled', function(){ deferred = null; justInstalled = true; sync(); });

  /* 설정의 「앱 다운로드」 버튼 글자 */
  function sync(){
    var b = document.getElementById('pwaBtn');
    if(!b) return;
    var done = standalone() || justInstalled;
    b.setAttribute('data-ko', done ? '설치됨 ✓' : '받기 →');
    b.setAttribute('data-en', done ? 'Installed ✓' : 'Get →');
    b.innerHTML = ko() ? b.getAttribute('data-ko') : b.getAttribute('data-en');
    syncOff();
  }

  /* ── 버튼을 눌렀을 때 ── */
  function install(){
    var kind = pick({standalone:standalone(), inapp:inAppName(), prompt:!!deferred, ios:isIOS(),
                     installed:justInstalled, android:isAndroid()});
    if(kind !== 'prompt') return sheet(kind, inAppName());
    var ev = deferred; deferred = null;             // 신호는 한 번만 쓸 수 있다
    try{
      ev.prompt();                                  // 브라우저의 설치 창 — 사용자가 「설치」를 누르면 끝
      ev.userChoice.then(function(c){
        if(c && c.outcome === 'accepted'){ justInstalled = true; sheet('done'); }
        sync();
      })['catch'](function(){});
    }catch(err){ sheet('android'); }
    return 'prompt';
  }

  /* ── 안내 창 ── */
  var ICON_SHARE = '<svg viewBox="0 0 30 30" aria-hidden="true"><rect x="7" y="11" width="16" height="15" rx="3" fill="none" stroke="#4FC3F7" stroke-width="2"/><path d="M15 3v14M10 8l5-5 5 5" fill="none" stroke="#4FC3F7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_ADD   = '<svg viewBox="0 0 30 30" aria-hidden="true"><rect x="4" y="4" width="22" height="22" rx="5" fill="none" stroke="#E7F6FF" stroke-width="2"/><path d="M15 10v10M10 15h10" stroke="#E7F6FF" stroke-width="2" stroke-linecap="round"/></svg>';
  var ICON_DOTS  = '<svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="7" r="2.4" fill="#E7F6FF"/><circle cx="15" cy="15" r="2.4" fill="#E7F6FF"/><circle cx="15" cy="23" r="2.4" fill="#E7F6FF"/></svg>';
  function iconImg(){ return '<img src="img/icon-180.png" alt="">'; }
  function head(sub){
    return '<div class="pwaHead">' + iconImg() + '<div><b>' + APP_NAME + '</b><span>' + sub + '</span></div></div>';
  }
  function step(n, icon, html){ return '<li><i>' + n + '</i>' + (icon || '') + '<span>' + html + '</span></li>'; }
  function sizeText(){ return off.bytes ? (Math.round(off.bytes / 1048576 * 10) / 10) + 'MB' : '약 12MB'; }

  function sheet(kind, app){
    close();
    var K = ko(), h = '', btns = '';
    var sub = K ? ('홈 화면에 앱으로 설치 · ' + sizeText()) : ('Install to your home screen · ' + sizeText());
    if(kind === 'ios'){
      h = head(sub) + '<ol class="pwaSteps">' +
        step(1, ICON_SHARE, K ? '화면 아래(아이패드는 위) <b>공유</b> 버튼을 누르세요.<br><small>안 보이면 <b>⋯</b> 를 먼저 누르세요.</small>'
                              : 'Tap the <b>Share</b> button at the bottom (top on iPad).<br><small>If you can\'t see it, tap <b>⋯</b> first.</small>') +
        step(2, ICON_ADD, K ? '목록을 내려 <b>홈 화면에 추가</b>를 누르세요.' : 'Scroll down and tap <b>Add to Home Screen</b>.') +
        step(3, iconImg().replace('<img', '<img style="width:30px;height:30px;border-radius:7px"'),
             K ? '오른쪽 위 <b>추가</b>를 누르면 홈 화면에<br><b>' + APP_NAME + '</b> 아이콘이 생겨요.'
               : 'Tap <b>Add</b> — the <b>' + APP_NAME + '</b> icon appears on your home screen.') +
        '</ol><p class="pwaNote">' + (K ? '사파리에서 가장 잘 돼요. 설치한 앱은 처음 한 번만 인터넷이 될 때 열어 주세요 — 그때 ' + sizeText() + '를 저장하고, 그 뒤로는 인터넷 없이도 열려요 (AI 사진 판별만 인터넷이 필요해요).'
                                          : 'Works best in Safari. Open the installed app once while online — it saves ' + sizeText() + ', then it opens without internet (only the AI photo check needs it).') + '</p>';
    } else if(kind === 'inapp'){
      var android = isAndroid();
      h = head(K ? (app + ' 안에서는 설치가 안 돼요') : 'Can\'t install inside this app') +
        '<p class="pwaNote">' + (K
          ? (android ? '오른쪽 위 <b>⋮</b> → <b>다른 브라우저로 열기</b>(크롬)를 누른 뒤,<br>다시 설정 → 앱 다운로드를 눌러 주세요.'
                     : '오른쪽 아래 <b>⋯</b> 또는 공유 → <b>Safari로 열기</b>를 누른 뒤,<br>다시 설정 → 앱 다운로드를 눌러 주세요.')
          : (android ? 'Tap <b>⋮</b> → <b>Open in another browser</b> (Chrome), then Settings → Install App again.'
                     : 'Tap <b>⋯</b> or Share → <b>Open in Safari</b>, then Settings → Install App again.')) + '</p>';
      if(android) btns += '<button class="go" onclick="PWA.openChrome()">' + (K ? '크롬으로 열기' : 'Open in Chrome') + '</button>';
      btns += '<button onclick="PWA.copyLink(this)">' + (K ? '주소 복사하기' : 'Copy link') + '</button>';
    } else if(kind === 'android'){
      h = head(sub) + '<ol class="pwaSteps">' +
        step(1, ICON_DOTS, K ? '크롬 오른쪽 위 <b>⋮</b> (삼성 인터넷은 아래 <b>≡</b>)를 누르세요.' : 'Tap <b>⋮</b> at the top right of Chrome (<b>≡</b> in Samsung Internet).') +
        step(2, ICON_ADD, K ? '<b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 누르세요.' : 'Tap <b>Install app</b> or <b>Add to Home screen</b>.') +
        '</ol><p class="pwaNote">' + (K ? '이미 설치했다면 홈 화면에서 <b>' + APP_NAME + '</b>를 찾아 주세요.'
                                          : 'Already installed? Look for <b>' + APP_NAME + '</b> on your home screen.') + '</p>';
    } else if(kind === 'desktop'){
      h = head(sub) + '<p class="pwaNote">' + (K
        ? '주소창 오른쪽의 <b>설치</b> 아이콘(⊕)이나 브라우저 메뉴 → <b>앱 설치</b>를 누르세요.<br>휴대폰에서는 출입문 QR을 찍어 연 뒤 설정 → 앱 다운로드를 누르면 돼요.'
        : 'Use the <b>Install</b> icon (⊕) in the address bar or the browser menu → <b>Install app</b>.') + '</p>';
    } else if(kind === 'done'){
      h = head(K ? '설치했어요!' : 'Installed!') + '<p class="pwaNote">' + (K
        ? '홈 화면의 <b>' + APP_NAME + '</b> 아이콘으로 여세요. 인터넷이 없어도 열려요.'
        : 'Open it from the <b>' + APP_NAME + '</b> icon on your home screen. It works offline.') + '</p>';
    } else if(kind === 'already'){
      h = head(K ? '이미 앱으로 쓰고 있어요 ✓' : 'You are already using the app ✓') + '<p class="pwaNote">' + (K
        ? '인터넷 없이 열기 : ' + offText() : 'Offline: ' + offText()) + '</p>';
    }
    var ov = document.createElement('div');
    ov.className = 'pwaSheet'; ov.id = 'pwaSheet'; ov.setAttribute('data-kind', kind);
    ov.innerHTML = '<div class="pwaBox" role="dialog" aria-label="' + (K ? '앱 다운로드' : 'Install app') + '">' + h + btns +
                   '<button onclick="PWA.close()">' + (K ? '닫기' : 'Close') + '</button></div>';
    ov.addEventListener('click', function(e){ if(e.target === ov) close(); });
    document.body.appendChild(ov);
    return kind;
  }
  function close(){ var o = document.getElementById('pwaSheet'); if(o && o.parentNode) o.parentNode.removeChild(o); }

  /* 앱 안 브라우저에서 크롬으로 넘기기 (안드로이드) */
  function openChrome(){
    var url = location.origin + location.pathname;
    if(/KAKAOTALK/i.test(UA)) location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
    else location.href = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
  }
  function copyLink(btn){
    var url = location.origin + location.pathname;
    function ok(){ if(btn) btn.textContent = ko() ? '복사했어요 ✓' : 'Copied ✓'; }
    try{ navigator.clipboard.writeText(url).then(ok, function(){ prompt('', url); }); }
    catch(e){ prompt('', url); }
  }

  /* ── ③ 인터넷 없이 열기 (sw.js) ──
     미리보기 서버(localhost)에서는 끈다 — 고친 파일이 바로 보여야 한다 (?sw=1 을 붙이면 켠다).
     검사 페이지의 iframe 안에서도 건드리지 않는다 (검사가 직접 등록·해제한다). */
  function local(){ return /^(localhost|127\.0\.0\.1)$/.test(location.hostname); }
  function swWanted(){
    if(!('serviceWorker' in navigator)) return false;
    if(!(location.protocol === 'https:' || local())) return false;
    if(local() && !/[?&]sw=1/.test(location.search)) return false;
    return true;
  }
  function offText(){
    var K = ko();
    if(off.state === 'ready') return (K ? '준비됨 ✓ (' : 'Ready ✓ (') + sizeText() + ')';
    if(off.state === 'saving') return (K ? '저장하는 중 ' : 'Saving ') + (off.total ? Math.floor(off.done / off.total * 100) : 0) + '%';
    if(off.state === 'fail') return K ? '저장 못 함 — 다음에 열 때 다시 해요' : 'Not saved — will retry next time';
    if(off.state === 'nosupport') return K ? '이 브라우저는 안 돼요' : 'Not supported in this browser';
    if(off.state === 'dev') return K ? '미리보기에서는 꺼 둠' : 'Off in preview';
    return K ? '준비하는 중…' : 'Preparing…';
  }
  function syncOff(){
    var el = document.getElementById('offStat');
    if(el) el.textContent = offText();
  }
  function onMsg(e){
    var d = e.data || {};
    if(d.type === 'progress'){ off.state = 'saving'; off.done = d.done; off.total = d.total; off.bytes = d.bytes || off.bytes; }
    else if(d.type === 'status'){ off.state = d.cached >= d.total ? 'ready' : 'saving'; off.done = d.cached; off.total = d.total; off.bytes = d.bytes; }
    else if(d.type === 'ready'){ off.state = 'ready'; off.done = off.total = d.total; off.bytes = d.bytes; }
    else if(d.type === 'fail'){ off.state = 'fail'; }
    else return;
    syncOff();
  }
  function askStatus(){
    navigator.serviceWorker.ready.then(function(reg){
      if(reg.active) reg.active.postMessage({type:'status'});
    });
  }
  if(window.top === window.self){
    if(!('serviceWorker' in navigator)) off.state = 'nosupport';
    else if(swWanted()){
      navigator.serviceWorker.addEventListener('message', onMsg);
      /* 새 판이 나오면 화면을 한 번만 새로 고친다.
         sw.js 는 skipWaiting 으로 곧바로 새것이 되지만, 이미 열려 있는 화면은
         조금 전에 받아 둔 옛 파일을 그대로 쓰고 있다. 그래서 앱을 껐다 켜도
         한 번은 옛 화면이 보이고 두 번째에야 새 화면이 나왔다 (2026-09-24 사용자 제보).
         처음 설치될 때(원래 맡은 워커가 없던 때)는 새로 고치지 않는다 — 괜히 한 번 깜빡인다. */
      var hadSW = !!navigator.serviceWorker.controller;
      var reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', function(){
        if(!hadSW || reloaded) return;
        reloaded = true;
        location.reload();
      });
      window.addEventListener('load', function(){
        /* updateViaCache:'none' — sw.js 자체는 브라우저 캐시를 거치지 않고 늘 새로 확인한다 */
        navigator.serviceWorker.register('sw.js', {updateViaCache:'none'}).then(function(reg){
          askStatus();
          reg.addEventListener('updatefound', function(){ off.state = 'saving'; syncOff(); });
          try{ reg.update(); }catch(err){}          // 앱을 열 때마다 새 판이 있는지 물어본다
        })['catch'](function(){ off.state = 'fail'; syncOff(); });
      });
    } else {
      off.state = local() ? 'dev' : 'nosupport';
      /* 예전에 켜 둔 것이 남아 있으면 끈다 — 남아 있으면 고친 파일 대신 저장해 둔 옛 파일이 보인다 */
      if(local()){
        try{ navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); }); }catch(e){}
      }
    }
  }
  document.addEventListener('DOMContentLoaded', sync);

  return {
    install:install, close:close, openChrome:openChrome, copyLink:copyLink, takeGate:takeGate, sync:sync,
    get offline(){ return {state:off.state, done:off.done, total:off.total, bytes:off.bytes, text:offText()}; },
    /* 검사(tests/pwa.html)가 설치 갈래를 확인할 때 쓴다 */
    _env:function(){ return {ios:isIOS(), android:isAndroid(), inapp:inAppName(), standalone:standalone(), prompt:!!deferred}; },
    _envOf:envOf, _pick:pick, _sheet:sheet, _fakePrompt:function(ev){ deferred = ev; sync(); }
  };
})();
