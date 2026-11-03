"use strict";
/* share.js — 길 공유하기 (2026-11-03 사용자가 견본으로 정한 것)
   · 보내는 분 : 설정 → 길 공유하기 → 호실 번호 · (받는 분이 들어올 문) → 카카오톡 · 문자로 보내기 / 링크만 복사하기
     링크 : https://minjong0910.github.io/?to=호실&from=문   (문을 정하지 않으면 from 이 없다)
   · 받는 분 : 링크를 누르면 초록 글 → 바로 길안내 1단계 (「보내 주신 길」 카드). 문이 없으면 문 사진 넷 중 고르기(#srcv).
     도착하면 「보낸 분께 「도착했어요」 알리기」. 처음 동의 화면 · 쉬운 사용모드는 묻지 않는다(누르기만 하면 바로).
   · 주소의 ?to= · from= 은 pwa.js 가 먼저 떼어 둔다(PWA.takeShare). 시간표 알림을 눌러 열린 것(tt=1)은 timetable.js 가 받는다.
   · 길안내를 여는 길(route)과 길안내 위 카드(ctx)는 시간표(timetable.js)도 같이 쓴다. */
(function(){
  var U = B3UI, $ = U.$, $$ = U.$$, mk = U.mk, esc = U.esc, T = U.T, IC = U.IC;
  var SITE = 'https://minjong0910.github.io/';
  var GATES = ['MAIN', 'BACK', 'EAST', 'WEST'];
  var GK = {MAIN: '정문', BACK: '후문', EAST: '동문', WEST: '서문'}, GE = {MAIN: 'Main gate', BACK: 'Back gate', EAST: 'East gate', WEST: 'West gate'};
  var MAP_URL = 'https://map.kakao.com/link/search/' + encodeURIComponent('군산대학교 공과대학 3호관');
  function gName(k){ return U.ko() ? GK[k] : GE[k]; }

  /* ── 호실 ── (관리자가 번호를 바꾼 방은 새 번호로도 — building.js parseRoomInput) */
  function info(no){ try{ return parseRoomInput(String(no)); }catch(e){ return null; } }
  function dno(code){ try{ return typeof dispNo === 'function' ? dispNo(code) : code; }catch(e){ return code; } }
  function rname(code){ try{ return (typeof ROOM_NAME === 'object' && ROOM_NAME[code]) || ''; }catch(e){ return ''; } }
  function floorOf(code){ try{ return VALID_FULL5[code] ? VALID_FULL5[code].floor : null; }catch(e){ return null; } }
  function flName(f){ try{ return typeof lvName === 'function' ? lvName(f) : f + '층'; }catch(e){ return f + '층'; } }
  function roomLine(code){ var n = rname(code), f = floorOf(code); return dno(code) + T('호', '') + (n ? ' · ' + n : '') + (f != null ? ' · ' + flName(f) : ''); }
  function photoOf(code){
    try{ var c = typeof phResolve === 'function' ? phResolve(code) : code, l = ROOM_PHOTOS[c]; return (l && l[0] && l[0].u) || ''; }catch(e){ return ''; }
  }
  function roomField(inp, out, onChange){
    function check(){
      var v = inp.value.replace(/\D/g, '').slice(0, 5); if(v !== inp.value) inp.value = v;
      out.innerHTML = '';
      var r = v.length === 5 ? info(v) : null;
      if(r){ out.innerHTML = '<div class="syOk">' + IC.check + esc(roomLine(r.code)) + ' <small>' + T('길안내 돼요', 'Route available') + '</small></div>'; onChange(r.code); return; }
      onChange(null);
      if(v.length === 5){ out.innerHTML = '<div class="syBad">' + T(v + '호는 3호관에 없어요 — 번호를 다시 확인해 주세요', 'Room ' + v + ' is not in Bldg 3 — please check the number') + '</div>'; return; }
      if(v.length >= 2){
        var hits = [];
        try{ Object.keys(VALID_FULL5).forEach(function(c){ var d = dno(c); if(d.indexOf(v) === 0 || c.indexOf(v) === 0) hits.push(c); }); }catch(e){}
        hits.sort(function(a, b){ return dno(a) < dno(b) ? -1 : 1; }); hits = hits.slice(0, 6);
        if(!hits.length){ out.innerHTML = '<div class="syBad">' + T('「' + v + '」로 시작하는 호실이 없어요', 'No room starts with “' + v + '”') + '</div>'; return; }
        var h = mk('div', 'syHits');
        hits.forEach(function(c){ var b = mk('button', '', '<b>' + esc(dno(c)) + '</b> ' + esc(rname(c))); b.type = 'button'; b.onclick = function(){ inp.value = dno(c); check(); }; h.appendChild(b); });
        out.appendChild(h); return;
      }
      out.innerHTML = '<div class="syTip">' + T('5자리 호실 번호 — 교수님 연구실 · 학과사무실도 번호로 돼요', '5-digit room number — offices work too') + '</div>';
    }
    inp.addEventListener('input', check); check();
  }

  /* ── 길안내 열기 : 문(MAIN…)이면 그 문에서, F1~F5 면 그 층 엘리베이터 앞에서 (resume.js 이어 보기와 같은 길) ── */
  var CTX = null, routing = false;
  function route(code, start, ctx){
    var f = floorOf(code); if(f == null) return false;
    CTX = ctx || null; routing = true;
    try{
      if(GK[start] && typeof QRNAV !== 'undefined'){ QRNAV.manual(start); QRNAV.confirm(); }
      else if(typeof QRNAV !== 'undefined') QRNAV.clear();
      openTarget({kind: 'room', floor: f, code: code}, f);
      var m = /^F(\d)$/.exec(start || '');
      if(m) startFloor = +m[1];
      if(typeof buildStartFloorPicker === 'function') buildStartFloorPicker();
      startGuide();
    }catch(e){ routing = false; CTX = null; return false; }
    routing = false;
    paintCtx();
    return true;
  }
  if(typeof startGuide === 'function'){
    var _sg = startGuide;
    window.startGuide = function(){ if(!routing) CTX = null; return _sg.apply(this, arguments); };   // 평소처럼 찾아 들어온 길안내에는 카드가 없다
  }
  if(typeof render6 === 'function'){
    var _r6 = render6;
    window.render6 = function(){ var r = _r6.apply(this, arguments); try{ paintCtx(); }catch(e){} return r; };
  }
  function ctxHost(){
    var s6 = document.getElementById('s6'), bot = s6 && s6.querySelector('.stBottom'); if(!bot) return null;
    var el = document.getElementById('ctx6');
    if(!el){ el = mk('div'); el.id = 'ctx6'; bot.insertBefore(el, bot.firstChild); }
    return el;
  }
  function paintCtx(){
    var cx = ctxHost(); if(!cx) return;
    cx.innerHTML = '';
    if(!CTX || typeof si === 'undefined' || si !== 0 || typeof target === 'undefined' || !target) return;
    var code = target.code, n = rname(code);
    if(CTX.mode === 'recv'){
      cx.innerHTML = '<div class="syCtx"><div class="l1">' + IC.send + T('보내 주신 길 · ', 'Shared route · ') + esc(dno(code)) + T('호', '') + (n ? ' ' + esc(n) : '') + '</div>' +
        '<div class="l2"><span>' + esc(startText()) + T('부터 한 단계씩 안내해요', ' — step by step') + '</span><button type="button">' + IC.map + T('3호관 지도', 'Map') + '</button></div></div>';
      $('button', cx).onclick = openMap;
    }
    if(CTX.mode === 'tt'){
      cx.innerHTML = '<div class="syCtx"><div class="l1">' + IC.cal + esc(CTX.cls.s + ' ' + CTX.cls.n) + (CTX.left ? '<em>' + esc(CTX.left) + '</em>' : '') + '</div>' +
        '<div class="l2"><span>' + esc(CTX.from) + '</span><button type="button" data-a="st">' + T('출발 바꾸기', 'Change start') + '</button><button type="button" data-a="else">' + T('다른 곳', 'Elsewhere') + '</button></div></div>';
      $('[data-a=st]', cx).onclick = startSheet;
      $('[data-a=else]', cx).onclick = function(){ CTX = null; if(typeof findAnother === 'function') findAnother(); else go('scat'); };
    }
  }
  function startText(){ try{ var g = QRNAV.gate(); if(g && QRNAV.floor() === startFloor) return gName(g); }catch(e){} return flName(startFloor) + T(' 엘리베이터 앞', ' elevator'); }
  function openMap(){ try{ window.open(MAP_URL, '_blank', 'noopener'); }catch(e){ location.href = MAP_URL; } }

  /* 시간표 길안내 — 「출발 바꾸기」 */
  function startSheet(){
    var cur = (typeof QRNAV !== 'undefined' && QRNAV.gate()) || ('F' + startFloor), g = '', f = '';
    GATES.forEach(function(k){ g += '<button class="syGate' + (k === cur ? ' pick' : '') + '" data-k="' + k + '" type="button"><img src="' + photoOf('GATE_' + k + '_OUT') + '" alt=""><b>' + gName(k) + '</b></button>'; });
    for(var i = 1; i <= 5; i++) f += '<button type="button" data-k="F' + i + '" class="' + (cur === 'F' + i ? 'on' : '') + '">' + flName(i) + '</button>';
    var s = U.sheet('<h4>' + IC.map + T('어디서 출발하세요?', 'Where are you starting?') + '</h4><div class="lab">' + T('건물 밖이면 — 들어올 문', 'Outside — the door you will use') + '</div><div class="syGates">' + g + '</div>' +
      '<div class="lab">' + T('건물 안이면 — 지금 층 (엘리베이터 앞에서 출발)', 'Inside — your floor (from the elevator)') + '</div><div class="syStartFl">' + f + '</div>');
    $$('[data-k]', s).forEach(function(b){ b.onclick = function(){
      var k = b.getAttribute('data-k'), o = CTX, code = target.code;
      if(o) o.from = GK[k] ? T(GK[k] + '에서 출발 (바꿈)', 'From the ' + GE[k] + ' (changed)') : T(k.slice(1) + '층 엘리베이터 앞에서 출발 (바꿈)', 'From the ' + k.slice(1) + 'F elevator (changed)');
      U.closeSheet(); route(code, k, o);
    }; });
  }

  /* ════════ 보내는 분 : 설정 → 길 공유하기 ════════ */
  var SH = {code: null, gate: 'MAIN'};
  function msgText(code, gate){
    var n = rname(code);
    return '[공대 3호관 길안내]\n' + dno(code) + '호' + (n ? '(' + n + ')' : '') + '로 오시는 길이에요.\n' +
      (gate ? GK[gate] + ' 앞에서' : '3호관 출입문 앞에서') + ' 아래 링크를 누르면 사진으로 한 단계씩 알려 드려요.\n';
  }
  function linkText(code, gate){ return SITE + '?to=' + dno(code) + (gate ? '&from=' + gate : ''); }
  function copy(t, ok){
    function old(){
      try{ var ta = mk('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;'; document.body.appendChild(ta); ta.select(); var r = document.execCommand('copy'); ta.remove(); return r; }catch(e){ return false; }
    }
    try{ if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(ok, function(){ if(old()) ok(); else U.toast(T('복사하지 못했어요 — 글을 길게 눌러 복사해 주세요', 'Could not copy — long-press to copy'), true); }); return; } }catch(e){}
    if(old()) ok(); else U.toast(T('복사하지 못했어요 — 글을 길게 눌러 복사해 주세요', 'Could not copy — long-press to copy'), true);
  }
  function open(){
    if(!document.querySelector('#sset.on') && typeof openOverlay === 'function') openOverlay('sset');
    SH.code = null;
    var g = '';
    GATES.forEach(function(k){ g += '<button class="syGate' + (k === SH.gate ? ' pick' : '') + '" data-g="' + k + '" type="button"><img src="' + photoOf('GATE_' + k + '_OUT') + '" alt=""><b>' + gName(k) + '</b></button>'; });
    var s = U.sheet('<h4>' + IC.send + T('길 공유하기', 'Share a route') + '</h4>' +
      '<p class="sub">' + T('찾아올 분께 링크를 보내면, 받는 분은 <b>누르기만 하면</b> 바로 길안내가 시작돼요. 앱 설치 · 번호 입력이 필요 없어요.', 'Send a link — the other person <b>just taps it</b> and the directions start. No install needed.') + '</p>' +
      '<div class="lab">' + T('① 어느 호실로 오시나요?', '① Which room?') + '</div><input class="syInp" id="shRoom" inputmode="numeric" pattern="[0-9]*" maxlength="5" autocomplete="off" placeholder="' + T('호실 번호 5자리 (예 : 13324)', '5-digit room (e.g. 13324)') + '"><div id="shOut"></div>' +
      '<div class="lab">' + T('② 받는 분이 어느 문으로 오시나요?', '② Which door will they use?') + '</div><div class="syGates">' + g + '</div>' +
      '<button class="syWho' + (SH.gate ? '' : ' pick') + '" type="button">' + T('잘 모르겠어요 — 받는 분이 문 앞에서 고르게 할게요', 'Not sure — let them choose at the door') + '</button>' +
      '<div class="lab">' + T('보낼 글 (미리 보기)', 'Message preview') + '</div><div class="syMsg empty" id="shMsg"></div>' +
      '<button class="big" type="button" id="shSend" disabled>' + IC.msg + T('카카오톡 · 문자로 보내기', 'Send via KakaoTalk · SMS') + '</button>' +
      '<button class="big ghost" type="button" id="shCopy" disabled>' + IC.link + T('링크만 복사하기', 'Copy link only') + '</button>');
    function paint(){
      var m = $('#shMsg', s);
      if(!SH.code){ m.className = 'syMsg empty'; m.textContent = T('호실 번호를 넣으면 보낼 글이 만들어져요', 'Enter a room number to build the message'); }
      else { m.className = 'syMsg'; m.innerHTML = esc(msgText(SH.code, SH.gate)) + '<u>' + esc(linkText(SH.code, SH.gate)) + '</u>'; }
      $('#shSend', s).disabled = $('#shCopy', s).disabled = !SH.code;
      $$('.syGate', s).forEach(function(b){ b.classList.toggle('pick', b.getAttribute('data-g') === SH.gate); });
      $('.syWho', s).classList.toggle('pick', !SH.gate);
    }
    $$('.syGate', s).forEach(function(b){ b.onclick = function(){ SH.gate = b.getAttribute('data-g'); paint(); }; });
    $('.syWho', s).onclick = function(){ SH.gate = null; paint(); };
    roomField($('#shRoom', s), $('#shOut', s), function(c){ SH.code = c; paint(); });
    $('#shSend', s).onclick = function(){
      var msg = msgText(SH.code, SH.gate), url = linkText(SH.code, SH.gate);
      if(navigator.share){
        navigator.share({title: '공대 3호관 길안내', text: msg, url: url}).then(function(){ U.closeSheet(); U.toast('✓ ' + T('보냈어요', 'Sent')); }, function(){});
        return;
      }
      copy(msg + url, function(){ U.toast(T('✓ 복사했어요 — 이 기기는 공유 창이 없어요. 카톡 · 문자에 붙여 넣어 주세요', '✓ Copied — paste it into a chat')); });
    };
    $('#shCopy', s).onclick = function(){ copy(msgText(SH.code, SH.gate) + linkText(SH.code, SH.gate), function(){ U.toast(T('✓ 복사했어요 — 카톡 · 문자에 붙여 넣으면 돼요', '✓ Copied — paste it into a chat')); }); };
    paint();
    setTimeout(function(){ try{ $('#shRoom', s).focus(); }catch(e){} }, 300);
  }

  /* ════════ 받는 분 ════════ */
  function recvPick(code){
    var el = document.getElementById('srcv'); if(!el) return;
    var n = rname(code), g = '';
    GATES.forEach(function(k){ g += '<div class="g" data-g="' + k + '"><img src="' + photoOf('GATE_' + k + '_OUT') + '" alt=""><b>' + GK[k] + ' <small>' + GE[k].replace(' gate', '') + '</small></b></div>'; });
    el.innerHTML = '<span class="got">' + IC.send + T('보내 주신 길', 'Shared route') + '</span>' +
      '<h2><b>' + esc(dno(code)) + T('호', '') + '</b>' + (n ? ' ' + esc(n) : '') + T(' 가는 길', '') + '</h2>' +
      '<div class="q">' + T('지금 어느 문 앞에 계세요?', 'Which door are you at?') + '</div><div class="qe">' + T('눈앞의 모습과 같은 사진을 눌러 주세요', 'Tap the photo that matches what you see') + '</div>' +
      '<div class="grid">' + g + '</div><div class="out">' + IC.map + T('아직 3호관에 못 왔어요 — 지도로 찾기', 'Not at Bldg 3 yet — open the map') + '</div>';
    $$('.g', el).forEach(function(t){ t.onclick = function(){ t.classList.add('pick'); setTimeout(function(){ route(code, t.getAttribute('data-g'), {mode: 'recv'}); }, 250); }; });
    $('.out', el).onclick = openMap;
    go('srcv');
  }
  /* 도착 화면 — 받은 길이면 「도착했어요」 알리기 */
  function paintTell(){
    var s7 = document.getElementById('s7'), bot = s7 && s7.querySelector('.stBottom'); if(!bot) return;
    var t = document.getElementById('tell7');
    if(!t){ t = mk('div'); t.id = 'tell7'; var b2 = bot.querySelector('.stBtns'); bot.insertBefore(t, b2 || null); }
    t.innerHTML = '';
    if(!CTX || CTX.mode !== 'recv' || typeof target === 'undefined' || !target) return;
    var code = target.code, b = mk('button', 'syTell', IC.send + T('보낸 분께 「도착했어요」 알리기', 'Tell them “I have arrived”')); b.type = 'button';
    b.onclick = function(){
      var txt = dno(code) + '호에 도착했어요 😊\n(공대 3호관 길안내에서 보냄)';
      if(navigator.share){ navigator.share({text: txt}).then(function(){ U.toast('✓ ' + T('알렸어요', 'Sent')); }, function(){}); return; }
      copy(txt, function(){ U.toast(T('✓ 복사했어요 — 보내 주신 분과의 대화방에 붙여 넣어 주세요', '✓ Copied — paste it into your chat')); });
    };
    t.appendChild(b);
  }
  var s7 = document.getElementById('s7');
  if(s7 && window.MutationObserver) new MutationObserver(function(){ if(s7.classList.contains('on')) paintTell(); }).observe(s7, {attributes: true, attributeFilter: ['class']});

  /* 링크로 열렸으면 — 앱이 준비되는 대로(초록 글 아래에서) 길안내를 깔아 둔다. 초록 글이 걷히면 바로 1단계가 보인다. */
  function take(){
    var sh = (typeof PWA !== 'undefined' && PWA.takeShare) ? PWA.takeShare() : null;
    if(!sh) return;
    var r = info(sh.to); if(!r) return;
    if(sh.tt){ if(typeof TIMETABLE !== 'undefined' && TIMETABLE.fromNoti) TIMETABLE.fromNoti(r.code, sh.cid); return; }
    if(sh.from && GK[sh.from]) route(r.code, sh.from, {mode: 'recv'});
    else recvPick(r.code);
  }
  (function wait(){
    var t0 = Date.now();
    (function tick(){
      if(typeof appBooted !== 'undefined' && appBooted){ setTimeout(take, 0); return; }
      if(Date.now() - t0 < 60000) setTimeout(tick, 40);
    })();
  })();

  window.SHARE = {open: open, route: route, recvPick: recvPick, roomField: roomField, roomLine: roomLine, photoOf: photoOf, info: info, dno: dno, rname: rname,
                  floorOf: floorOf, flName: flName, gName: gName, GK: GK, GE: GE, GATES: GATES, ctx: function(){ return CTX; }, paintCtx: paintCtx, openMap: openMap};
})();
