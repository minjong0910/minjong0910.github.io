/* 길안내 중 「여기가 어디인지 모르겠어요」 — 사진 골라 다시 출발 · 현재 계신 층 (2026-11-04 사용자 「실제 앱에 반영」)
   견본(생성물\견본_재출발_층고르기)을 사용자가 고쳐 가며 정한 것 그대로 :
     · 길안내 화면 아래 안내판 바로 위에 노란 테두리 단추 「🤔 여기가 어디인지 모르겠어요 · Lost?」
     · 누르면 「지금 보이는 사진을 골라 주세요」 — 지금 단계 앞뒤의 길 위 사진(많아야 3장) + 그 층 옆길(안 지나는 복도) 한 장
         길 위 사진을 고르면 그 단계로 바로 · 옆길을 고르면 그 층 엘리베이터 앞에서 다시
     · 맨 아래 「현재 계신 층이 어디신가요?」 → 지하 1층 ~ 5층 엘리베이터 정면 사진(img/evfront/) → 고른 층 엘리베이터 앞에서 목적지까지 다시
       (10/27 견본의 「다 아니에요 — 출입문 QR 다시 찍기」는 사용자가 없앴다)
   다시 만들 때 출입문(QR)은 지운다 — 1층을 골랐는데 「동문으로 들어오세요」부터 다시 나오면 안 되므로.
   단계는 guide.js 의 startGuide(buildSteps) 그대로 만든다 — 엘리베이터 사진 · 「3층에서 내려서 …」 문장도 거기서 온다.
   모양은 app.css 「사진 골라 다시 출발」 묶음(공항 표지판 노랑 · 검정, 밝은 화면에서도 그대로). */
var RESTART = (function(){
  'use strict';
  var s6 = document.getElementById('s6'), bot = s6 ? s6.querySelector('.stBottom') : null;
  if(!s6 || !bot || typeof render6 !== 'function' || typeof startGuide !== 'function') return {};
  function ko(){ return typeof LANG === 'undefined' || LANG === 'ko'; }
  function T(k, e){ return ko() ? k : e; }
  function $(sel, root){ return (root || document).querySelector(sel); }
  function $$(sel, root){ return [].slice.call((root || document).querySelectorAll(sel)); }
  function mk(tag, cls, html){ var e = document.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function phone(){ return document.querySelector('.phone') || document.body; }
  function toast(t){
    $$('.syToast').forEach(function(e){ e.remove(); });
    var e = mk('div', 'syToast info'); e.textContent = t; phone().appendChild(e);
    setTimeout(function(){ e.classList.add('out'); }, 2600); setTimeout(function(){ e.remove(); }, 3100);
  }

  /* ── 사진 · 이름 ── */
  function photoOf(code){ try{ var c = phResolve(code), l = ROOM_PHOTOS[c]; return (l && l.length) ? l[0].u : ''; }catch(e){ return ''; } }
  function capOf(s){
    if(s.cap) return ko() ? s.cap.ko : (s.cap.en || s.cap.ko);
    try{ return phCap(phResolve(s.code)); }catch(e){ return ''; }
  }
  /* 사진 코드 → 층 (EV3 · EVIN3 · HALL3L · WC3 → 3, B1WAY → B1, 문 → 1, 13310 → 3) */
  function floorOf(code){
    var c = String(code || ''), m = /^(?:EVIN|EV|HALL|WC|EMS|ES|LNG)(B1|\d)/.exec(c);
    if(m) return m[1];
    if(/^B1/.test(c)) return 'B1';
    if(/^(GATE|BLD)/.test(c)) return '1';
    if(/^\d{5}/.test(c)) return c.charAt(2);
    return null;
  }
  function flName(f){ return f === 'B1' ? T('지하 1층', 'B1') : T(f + '층', 'Floor ' + f); }

  /* ── 단추 : 안내판 바로 위 ── */
  var btn = mk('button', 'rxLost'); btn.type = 'button';
  bot.insertBefore(btn, bot.firstChild);
  btn.onclick = function(){ pickSheet(); };
  function paintBtn(){
    btn.innerHTML = ko() ? '🤔 <b>여기가 어디인지 모르겠어요</b><small>· Lost?</small>' : '🤔 <b>Lost? Not sure where you are</b>';
  }

  /* ── 아래에서 올라오는 창 ── */
  function closeSheet(){ $$('.rxDim, .rxSheet').forEach(function(e){ e.remove(); }); }
  function openSheet(html, cls){
    closeSheet();
    var d = mk('div', 'rxDim'); d.onclick = closeSheet; phone().appendChild(d);
    var s = mk('div', 'rxSheet' + (cls ? ' ' + cls : ''), html); s.setAttribute('role', 'dialog'); phone().appendChild(s);
    return s;
  }
  function card(u, cap, tag, attr){
    return '<button class="rxCard" type="button"' + attr + '><img alt="" src="' + esc(u) + '">' + tag + '<span class="cp">' + esc(cap) + '</span></button>';
  }

  /* ① 지금 보이는 사진 고르기 — 길 위 사진(지금 단계 앞뒤, 같은 사진은 한 번) + 그 층에서 이 길이 안 지나는 복도 한 장 */
  function pickSheet(){
    if(typeof steps === 'undefined' || !steps.length) return;
    var L = steps, idx = [], seen = {};
    [si - 1, si, si + 1, si + 2, si - 2].forEach(function(i){
      if(i < 0 || i >= L.length || idx.length >= 3) return;
      var u = photoOf(L[i].code); if(!u || seen[u]) return;
      seen[u] = 1; idx.push(i);
    });
    idx.sort(function(a, b){ return a - b; });
    var fl = floorOf(L[si].code), side = null;
    if(fl && fl !== 'B1'){
      var used = {}; L.forEach(function(s){ used[phResolve(s.code)] = 1; });
      ['HALL' + fl + 'L', 'HALL' + fl + 'R'].some(function(k){ if(!used[k] && photoOf(k)){ side = k; return true; } return false; });
    }
    var h = '<h4>' + T('지금 보이는 사진을 골라 주세요', 'Which one do you see now?') + '</h4>' +
      '<p class="sub">' + T('Which one do you see now? — 고르면 그 자리부터 다시 안내해요', 'Pick one and we’ll guide you from there') + '</p><div class="rxGrid">' +
      idx.map(function(i){ return card(photoOf(L[i].code), capOf(L[i]), '<span class="tg">' + T('길 위 · On route', 'On route') + '</span>', ' data-i="' + i + '"'); }).join('') +
      (side ? card(photoOf(side), phCap(side), '<span class="tg side">' + T('옆길 · Nearby', 'Nearby') + '</span>', ' data-side="' + fl + '"') : '') + '</div>' +
      '<button class="rxFloor" type="button"><b>' + T('현재 계신 층이 어디신가요?', 'Which floor are you on?') + '</b><small>' +
      T('Which floor are you on? — 누르면 층마다 엘리베이터 사진이 나와요', 'Tap to see the elevator on each floor') + '</small></button>';
    var s = openSheet(h, 'pk');
    $$('.rxCard', s).forEach(function(c){ c.onclick = function(){
      closeSheet();
      if(c.hasAttribute('data-side')){ restart(c.getAttribute('data-side'), true); return; }
      si = +c.getAttribute('data-i'); render6();
      toast(T('고른 사진 자리부터 다시 안내해요', 'Guiding you from the photo you picked'));
    }; });
    $('.rxFloor', s).onclick = floorSheet;
  }

  /* ② 현재 계신 층 — 지하 1층 ~ 5층 엘리베이터 정면 사진 (앱의 EV2~5 는 라운지, EVB1 은 엘리베이터 안이라 사진원본에서 따로 골랐다 — 2~5층은 정면 사진이 없어 문이 보이는 비스듬한 사진) */
  var FLOORS = ['B1', '1', '2', '3', '4', '5'];
  function floorSheet(){
    var h = '<h4>' + T('현재 계신 층이 어디신가요?', 'Which floor are you on?') + '</h4>' +
      '<p class="sub">' + T('Which floor are you on? — 지금 계신 층의 엘리베이터 사진을 눌러 주세요', 'Tap the elevator photo of your floor') + '</p><div class="rxGrid">' +
      FLOORS.map(function(f){
        return card('img/evfront/EV' + f + '.jpg', phCap('EV' + f), '<span class="fl">' + (f === 'B1' ? 'B1' : f + 'F') + '</span>', ' data-f="' + f + '"');
      }).join('') +
      '</div><button class="rxBack" type="button">' + T('‹ 사진 다시 고르기', '‹ Pick a photo again') + '</button>';
    var s = openSheet(h, 'fs');
    $$('.rxCard', s).forEach(function(c){ c.onclick = function(){ closeSheet(); restart(c.getAttribute('data-f'), false); }; });
    $('.rxBack', s).onclick = pickSheet;
  }

  /* 그 층 엘리베이터 앞에서 다시 출발 — 출입문을 지우고 출발층만 바꿔 길안내를 새로 만든다 */
  function restart(f, nearby){
    try{ if(typeof QRNAV !== 'undefined' && QRNAV.gate && QRNAV.gate()) QRNAV.clear(); }catch(e){}
    startFloor = (f === 'B1') ? 'B1' : +f;
    if(typeof buildStartFloorPicker === 'function') buildStartFloorPicker();
    startGuide();                                  // 단계 새로 · 1단계부터 (이미 길안내 화면이라 지나온 화면 기록은 그대로)
    toast(ko() ? ((nearby ? '옆길이라 가까운 ' : '') + flName(f) + ' 엘리베이터 앞에서 다시 안내해요')
               : ('Guiding you again from the ' + (nearby ? 'nearest ' : '') + flName(f) + ' elevator'));
  }

  /* ── 휴대폰 뒤로가기 : 층 창 → 사진 창 → 닫기 ── */
  if(typeof appBackStep === 'function'){
    var _back = appBackStep;
    window.appBackStep = function(){
      var sh = document.querySelector('.rxSheet');
      if(sh){ if(sh.classList.contains('fs')) pickSheet(); else closeSheet(); return true; }
      return _back.apply(this, arguments);
    };
  }
  /* 길안내 화면을 떠나면 창도 닫는다 */
  if(window.MutationObserver){
    new MutationObserver(function(){ if(!s6.classList.contains('on')) closeSheet(); }).observe(s6, {attributes: true, attributeFilter: ['class']});
  }
  /* 그릴 때마다(말을 바꿀 때도 — ui.js) 단추 글을 그 말로 */
  var _render6 = render6;
  window.render6 = function(){ var r = _render6.apply(this, arguments); try{ paintBtn(); }catch(e){} return r; };
  paintBtn();

  return {pick: pickSheet, floors: floorSheet, restart: restart, close: closeSheet};
})();
