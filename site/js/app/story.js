/* 길안내 · 도착 화면 — 인스타 감성 + 공항 표지판 (2026-10-28 사용자)
   견본(9_합친3_눌러보기.html)을 사용자가 고쳐 가며 정한 모양 :
     · 실제 사진이 화면 맨 위부터 맨 아래까지 — 경로(동문 → 13310호) · 단계 막대 · 「📷 지금 자리」는 사진 위에
       (2026-11-05 사용자 「너무 확대돼 전체가 안 보인다」 → 사진은 위 · 아래 칸 사이에 통째로, 둘레는 같은 사진을 흐리게 — 아래 「사진 전체가 보이게」)
     · 아래 공항 안내판 : 노란 칸 그림(직진 = 굵은 화살표 · 좌/우회전 = 앱의 원래 화살표(Lucide) · 엘리베이터 그림 · 도착 ✓) + 큰 글 + 영어
     · 사진을 누르면 누른 곳이 2배(「🔍 누르면 크게 / 작게」) · 좌우로 밀면 이전 · 다음
   guide.js 의 render6 · startGuide 와 photos.js 의 phFill 을 감싸서 얹기만 한다 — 단계 만들기 · 이어 하기 · 쉬운 사용모드는 그대로.
   예전 화면의 글자 칸(#ar · #ins · #stepno · 걷는 사람)은 그대로 두고 감춘다(다른 파일이 읽는다). 모양은 app.css 「인스타 감성 + 공항 표지판」. */
(function(){
  'use strict';
  var s6 = document.getElementById('s6'), s7 = document.getElementById('s7');
  if(!s6 || !s7 || typeof render6 !== 'function' || typeof phFill !== 'function') return;
  function ko(){ return typeof LANG === 'undefined' || LANG === 'ko'; }
  function $(sel, root){ return (root || document).querySelector(sel); }
  function mk(tag, cls, html){ var e = document.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; }

  /* ── 그림 (검정 선 · 노란 칸 안) ── */
  var SV = '<svg viewBox="0 0 48 48" aria-hidden="true">';
  function arrowFill(rot){ return '<svg viewBox="0 0 48 48" aria-hidden="true" style="transform:rotate(' + rot + 'deg)"><path d="M24 4 L42 24 H31 V44 H17 V24 H6 Z" fill="#111"/></svg>'; }
  /* 좌·우회전 : 앱이 원래 쓰던 화살표(icons.js 의 Lucide arrow-right / arrow-left)를 굵은 검정 선으로 */
  function arrowLucide(dir){
    var d = dir === 'left' ? '<path d="M20 12H5"/><path d="M12 4.5 4.5 12l7.5 7.5"/>' : '<path d="M4 12h15"/><path d="m12 4.5 7.5 7.5-7.5 7.5"/>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  var LIFT = SV.replace('>', ' fill="none" stroke="#111" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">') +
    '<rect x="8" y="5" width="32" height="38" rx="2"/><path d="M24 9 V39" stroke-width="2"/><path d="M12 20 L16 14 L20 20 Z M28 28 L32 34 L36 28 Z" fill="#111" stroke-width="1.5"/></svg>';
  /* 계단(2026-11-05) : 오른쪽 위로 오르는 계단 네 칸 + 위쪽 화살표 */
  var STAIRS = SV.replace('>', ' fill="none" stroke="#111" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">') +
    '<path d="M5 42 H15 V33 H24 V24 H33 V15 H43"/><path d="M8 25 L22 11 M13 10 H23 V20"/></svg>';
  function check(c){ return '<svg viewBox="0 0 48 48" fill="none" stroke="' + c + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 25 L20 36 L40 12"/></svg>'; }
  function mag(plus){ return '<svg viewBox="0 0 24 24" fill="none" stroke="#FFC400" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M15 15 L21 21 M7 10 h6' + (plus ? ' M10 7 v6' : '') + '"/></svg>'; }
  var CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="#FFC400" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>';
  var ROT = {'↑': 0, '→': 90, '←': -90, '↓': 180, '↗': 45, '↖': -45, '↘': 135, '↙': -135};
  function iconOf(s){
    if(s.a === '✓' || s.type === 'arrive') return {h: check('#111'), c: ''};
    if(s.type === 'lift') return {h: LIFT, c: ''};
    if(s.type === 'stairs') return {h: STAIRS, c: ''};
    if(s.type === 'turn' && (s.a === '→' || s.a === '←')) return {h: arrowLucide(s.a === '←' ? 'left' : 'right'), c: s.a === '←' ? 'turnL' : 'turnR'};
    return {h: arrowFill(ROT[s.a] || 0), c: ''};
  }

  /* ── 글 ── */
  function enFix(t){ return String(t || '').replace(/(\d)층/g, '$1F'); }      // 영어 문장에 섞여 나오던 「3층」
  function placeOf(s){
    if(s.cap) return ko() ? s.cap.ko : (s.cap.en || s.cap.ko);
    try{ return phCap(phResolve(s.code)); }catch(e){ return ''; }
  }
  function startName(){
    try{ if(typeof QRNAV !== 'undefined' && QRNAV.gateName && QRNAV.gateName() && QRNAV.floor() === startFloor) return QRNAV.gateName(); }catch(e){}
    try{ return typeof lvName === 'function' ? lvName(startFloor) : (startFloor + (ko() ? '층' : 'F')); }catch(e){ return ''; }
  }
  function destShort(){
    try{
      if(target && target.kind === 'room' && /^\d{5}/.test(target.code)){
        var no = (typeof dispNo === 'function') ? dispNo(target.code) : target.code;
        return ko() ? no + '호' : 'Room ' + no;
      }
      return targetLabel();
    }catch(e){ return ''; }
  }
  function destName(){
    try{
      if(target && target.kind === 'room'){
        var raw = ROOM_NAME[target.code]; if(!raw) return '';
        return ko() ? raw : ((typeof roomEn === 'function') ? roomEn(raw) : raw);
      }
    }catch(e){}
    return '';
  }

  /* ── 사진 누르기 : 누른 곳을 2배 · 다시 누르면 원래대로 / 좌우로 밀기 : 이전 · 다음 ── */
  function zoomChip(scr){ var z = $('.stZm', scr); if(z) z.innerHTML = mag(!scr.classList.contains('zoomed')) + (scr.classList.contains('zoomed') ? (ko() ? '누르면 작게' : 'Tap to zoom out') : (ko() ? '누르면 크게' : 'Tap to zoom in')); }
  function unzoom(scr){ scr.classList.remove('zoomed'); var im = $('.photo img', scr); if(im) im.style.transformOrigin = ''; zoomChip(scr); }
  function hook(scr, ph, swipe){
    var sx = null, sy = null;
    ph.addEventListener('pointerdown', function(e){ sx = e.clientX; sy = e.clientY; });
    ph.addEventListener('pointercancel', function(){ sx = null; });
    ph.addEventListener('dragstart', function(e){ e.preventDefault(); });
    ph.addEventListener('pointerup', function(e){
      if(sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if(e.target.closest && e.target.closest('.cnt')) return;           // 「1 / 2 · 다음 사진」은 사진 넘기기
      if(swipe && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2){ swipe(dx < 0 ? 1 : -1); return; }
      if(Math.abs(dx) > 10 || Math.abs(dy) > 10) return;
      var im = $('img', ph); if(!im) return;
      if(!scr.classList.contains('zoomed')){
        var r = im.getBoundingClientRect();
        im.style.transformOrigin = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)) + '% ' + Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100)) + '%';
        scr.classList.add('zoomed');
      } else scr.classList.remove('zoomed');
      zoomChip(scr);
    });
  }

  /* ── 길안내 화면(s6) ── */
  s6.classList.add('story');
  var top6 = mk('div', 'stTop'), shade6 = mk('div', 'stShade'), zm6 = mk('div', 'stZm'), bot6 = mk('div', 'stBottom'), sign = mk('div', 'stSign');
  top6.innerHTML = '<div class="row"><button class="stBack" type="button" aria-label="뒤로" data-ko-aria="뒤로" data-en-aria="Back">←</button><span class="rt"></span><span class="no"></span></div>' +
                   '<div class="stSegs"></div><div class="stWhere"></div>';
  sign.innerHTML = '<div class="ic"></div><div class="tx"><div class="ko"></div><div class="en"></div></div>';
  var nav = $('.navrow', s6), hint6 = mk('div', 'stHint');
  bot6.appendChild(sign); if(nav) bot6.appendChild(nav); bot6.appendChild(hint6);
  s6.appendChild(shade6); s6.appendChild(top6); s6.appendChild(zm6);
  s6.appendChild(mk('div', 'stEdge l', '‹')); s6.appendChild(mk('div', 'stEdge r', '›'));
  s6.appendChild(bot6);
  $('.stBack', top6).onclick = function(){ if(typeof go === 'function') go(4); };

  /* ── [엘리베이터 | 계단] (2026-11-05 사용자 「계단으로 올라가면서 라이브를 찍겠다」 · guide.js GUIDE_VIA) ──
     1층에서 2~5층으로 올라가는 길에만 보인다. 바꾸면 단계를 다시 만들되, 이미 지나온 같은 단계는 그 자리 그대로 둔다. */
  var via = mk('div', 'stVia'); via.setAttribute('role', 'group'); top6.appendChild(via);
  function viaIc(svg){ return svg.replace('<svg ', '<svg class="vi" ').replace(/#111/g, 'currentColor'); }
  function paintVia(){
    var ok = (typeof guideStairsOK === 'function') && guideStairsOK();
    via.hidden = !ok; if(!ok) return;
    var st = (GUIDE_VIA === 'stairs');
    via.setAttribute('aria-label', ko() ? '어떻게 올라갈까요' : 'How to go up');
    via.innerHTML = '<button type="button" data-v="ev" class="' + (st ? '' : 'on') + '" aria-pressed="' + !st + '">' + viaIc(LIFT) + (ko() ? '엘리베이터' : 'Elevator') + '</button>' +
                    '<button type="button" data-v="stairs" class="' + (st ? 'on' : '') + '" aria-pressed="' + st + '">' + viaIc(STAIRS) + (ko() ? '계단' : 'Stairs') + '</button>';
  }
  function viaToast(t){
    var ph = document.querySelector('.phone') || document.body;
    [].forEach.call(document.querySelectorAll('.syToast'), function(e){ e.remove(); });
    var e = mk('div', 'syToast info'); e.textContent = t; ph.appendChild(e);
    setTimeout(function(){ e.classList.add('out'); }, 2200); setTimeout(function(){ e.remove(); }, 2700);
  }
  via.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('button[data-v]') : null; if(!b) return;
    var v = b.getAttribute('data-v'); if(v === GUIDE_VIA || typeof buildSteps !== 'function') return;
    var old = steps.slice(), cur = steps[si], oldSi = si;
    setGuideVia(v);
    steps = buildSteps();
    /* 앞부분(문 · 복도)이 같으면 그 자리 그대로, 달라진 곳부터는 같은 사진의 단계(위층 복도 등)가 있으면 거기로 */
    var d = 0;
    while(d < old.length && d < steps.length && old[d].code === steps[d].code && old[d].tko === steps[d].tko) d++;
    var ni = oldSi;
    if(oldSi >= d){
      ni = d;
      for(var k = d; k < steps.length; k++) if(cur && steps[k].code === cur.code && steps[k].type === cur.type){ ni = k; break; }
    }
    si = Math.max(0, Math.min(steps.length - 1, ni));
    render6(true);
    viaToast(v === 'stairs' ? (ko() ? '🚶 중앙계단으로 가는 길로 바꿨어요' : '🚶 Switched to the main stairs')
                            : (ko() ? '🛗 엘리베이터로 가는 길로 바꿨어요' : '🛗 Switched to the elevator'));
  });

  function paint6(){
    if(typeof steps === 'undefined' || !steps.length) return;
    var s = steps[si]; if(!s) return;
    $('.rt', top6).innerHTML = '';
    $('.rt', top6).appendChild(document.createTextNode(startName() + ' → '));
    var b = mk('b'); b.textContent = destShort(); $('.rt', top6).appendChild(b);
    $('.no', top6).innerHTML = '<b>' + (si + 1) + '</b> / ' + steps.length;
    var seg = ''; for(var k = 0; k < steps.length; k++) seg += '<i class="' + (k <= si ? 'on' : '') + '"></i>';
    $('.stSegs', top6).innerHTML = seg;
    $('.stWhere', top6).innerHTML = CAM; $('.stWhere', top6).appendChild(document.createTextNode(' ' + placeOf(s)));
    var ic = iconOf(s), icEl = $('.ic', sign);
    icEl.className = 'ic' + (ic.c ? ' ' + ic.c : ''); icEl.innerHTML = ic.h;
    /* 한국어일 때만 아래에 영어 한 줄(공항 표지판식) — 영어로 쓸 때는 영어만(사용자 11/04 「영어 길안내를 쓸 때는 한국어가 안 보이게」) */
    var big = ko() ? s.tko : enFix(s.ten), small = ko() ? enFix(s.ten) : '';
    $('.ko', sign).textContent = big; $('.ko', sign).classList.toggle('long', big.length > 30);
    $('.en', sign).textContent = small;
    hint6.textContent = ko() ? '사진을 누르면 크게 · 작게 — 좌우로 밀면 이전 · 다음' : 'Tap the photo to zoom · swipe for back / next';
    paintVia();
    unzoom(s6);
    fit6();
  }
  hook(s6, document.getElementById('ph'), function(d){ if(d > 0){ if(typeof next === 'function') next(); } else if(typeof prev === 'function') prev(); });

  /* ── 도착 화면(s7) ── */
  s7.classList.add('story');
  var band = mk('div', 'stBand'), shade7 = mk('div', 'stShade'), zm7 = mk('div', 'stZm'), bot7 = mk('div', 'stBottom'), who = mk('div', 'stWho'), btns = mk('div', 'stBtns');
  band.innerHTML = '<div class="ck">' + check('#FFC400') + '</div><div><div class="ko"></div><div class="en"></div></div>';
  var ghost = $('.big.ghost', s7), again = $('.big:not(.ghost)', s7);
  if(ghost) btns.appendChild(ghost); if(again) btns.appendChild(again);
  bot7.appendChild(who); bot7.appendChild(btns);
  s7.appendChild(shade7); s7.appendChild(band); s7.appendChild(zm7); s7.appendChild(bot7);
  function paint7(){
    var d = destShort();
    $('.ko', band).textContent = ko() ? d + ' 도착' : 'Arrived · ' + d;
    $('.en', band).textContent = ko() ? 'You have arrived · ' + (/^\d/.test(d) ? 'Room ' + d.replace('호', '') : d) : '';
    var nm = destName();
    who.innerHTML = '';
    if(nm){ who.appendChild(document.createTextNode(nm)); var sm = mk('small'); sm.innerHTML = CAM.replace('#FFC400', '#B5B5B5'); sm.appendChild(document.createTextNode(' ' + (ko() ? d + ' 문 앞 — 문 옆 명패를 확인하세요' : 'At the door of ' + d + ' — check the name plate'))); who.appendChild(sm); }
    unzoom(s7);
    fit7();
  }
  hook(s7, document.getElementById('ph7'), null);

  /* ── 사진 전체가 보이게 (2026-11-05 사용자 「길안내 사진이 너무 확대돼 전체가 안 보인다」) ──
     사진은 위 칸(경로 · 단계 · 자리 · [엘리베이터|계단] · 오른쪽 칩)의 아래 끝과 아래 칸(안내판 · 버튼)의 위 끝 사이에 통째로 들어간다(app.css).
     두 칸의 높이는 폰 크기 · 글 길이 · 단추가 보이는지에 따라 달라서, 그릴 때마다 재어 --phT · --phB 로 넘긴다.
     둘레의 흐린 배경은 같은 사진(--phBg) — 「1 / 3 · 다음 사진」으로 바꾸면 사진이 다시 읽힐 때 따라 바뀐다. */
  var ph6 = document.getElementById('ph'), ph7 = document.getElementById('ph7');
  function fitArea(scr, items, bot){
    if(!scr.offsetHeight) return;                                    // 안 보이는 화면은 잴 수 없다 — 보일 때 다시(sync)
    var sr = scr.getBoundingClientRect(), t = 0;
    items.forEach(function(e){
      if(!e || e.hidden || !e.getClientRects().length) return;
      var r = e.getBoundingClientRect(); if(r.height) t = Math.max(t, r.bottom - sr.top);
    });
    var b = bot ? Math.max(0, sr.bottom - bot.getBoundingClientRect().top) : 0;
    scr.style.setProperty('--phT', Math.round(t + 8) + 'px');
    scr.style.setProperty('--phB', Math.round(b + 8) + 'px');
  }
  function fit6(){ fitArea(s6, [$('.row', top6), $('.stSegs', top6), $('.stWhere', top6), via, zm6, ph6 && $('.cnt', ph6)], bot6); }
  function fit7(){ fitArea(s7, [band, $('.rfMemo', s7), zm7, ph7 && $('.cnt', ph7)], bot7); }
  function fitAll(){ try{ fit6(); fit7(); }catch(e){} }
  function backdrop(el){
    var im = el && $('img', el); if(!im) return;
    function set(){ el.style.setProperty('--phBg', 'url("' + String(im.currentSrc || im.src).replace(/["\\]/g, '\\$&') + '")'); }
    set(); im.addEventListener('load', set);
  }
  window.addEventListener('resize', fitAll);
  window.addEventListener('orientationchange', function(){ setTimeout(fitAll, 300); });
  if(window.ResizeObserver){ var ro = new ResizeObserver(fitAll); [top6, bot6, band, bot7].forEach(function(e){ ro.observe(e); }); }
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);

  /* ── 감싸기 : 그릴 때마다 위 칸을 새로, 사진 상자의 「누르면 크게 보기 창」 대신 제자리 2배 ── */
  var _render6 = render6, _phFill = phFill, _startGuide = (typeof startGuide === 'function') ? startGuide : null;
  window.render6 = function(){ var r = _render6.apply(this, arguments); try{ paint6(); paint7(); }catch(e){} return r; };   // 말을 바꿀 때(ui.js setLang)도 이것을 부른다
  window.phFill = function(el){
    var r = _phFill.apply(this, arguments);
    if(el && (el.id === 'ph' || el.id === 'ph7')){
      el.onclick = null; backdrop(el);
      requestAnimationFrame(fitAll);                                 // 「1 / 3 · 다음 사진」 칩이 생기고 없어짐에 따라 위 칸 끝이 달라진다
    }
    return r;
  };
  if(_startGuide) window.startGuide = function(){ var r = _startGuide.apply(this, arguments); try{ paint7(); }catch(e){} return r; };

  /* 이 두 화면이 보일 때만 오른쪽 위 [인터넷][☰] 테두리를 노랑으로 · 화면에 들어올 때 제자리(작게) */
  var was6 = false, was7 = false;
  function sync(){
    var on6 = s6.classList.contains('on'), on7 = s7.classList.contains('on');
    document.documentElement.classList.toggle('stOn', on6 || on7);
    if(on6 && !was6){ unzoom(s6); fitAll(); requestAnimationFrame(fitAll); }
    if(on7 && !was7){ try{ paint7(); }catch(e){} fitAll(); requestAnimationFrame(fitAll); }
    was6 = on6; was7 = on7;
  }
  if(window.MutationObserver){
    var mo = new MutationObserver(sync);
    mo.observe(s6, {attributes: true, attributeFilter: ['class']}); mo.observe(s7, {attributes: true, attributeFilter: ['class']});
  }
  sync(); zoomChip(s6); zoomChip(s7);
  window.STORY = {paint6: paint6, paint7: paint7};
})();
