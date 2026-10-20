"use strict";
/* easy.js — 쉬운 사용모드 (2026-10-18 시험판으로 만듦 · 2026-10-20 본 앱으로 옮김 — 사용자)

   사용자 요청 : 사용설명서를 따로 보여 주는 대신, **실제 앱 화면 위에서** 「여기를 누르세요」를 하나씩 알려 준다.
   QR 을 찍고 들어온 첫 화면(「여기가 맞나요?」)부터 도착까지. 보는 사람이 어린아이여도 알아들을 만큼 쉬운 말로.

   어떻게 :
   · 정해진 순서로 끌고 가지 않는다 — 사람마다 길이 다르다(QR/시작하기, 카메라가 막혀 문 고르기, 강의실/화장실 …).
     → **화면마다** '여기서 누를 곳'(HINTS)을 정해 두고, 지금 보이는 화면에 맞는 것을 띄운다.
   · 앱을 막지 않는다 — 덮개는 눌림을 통과시킨다(pointer-events:none). 다른 버튼도 그대로 눌린다.
   · 누를 곳 자리는 그림이 아니라 **실제 버튼의 위치**를 그때그때 잰다 — 앱 모양이 바뀌어도 어긋나지 않는다.
   · 켜고 끄기 : 처음 한 번 묻기 · 첫 화면 노란 버튼 · 설정 · 말풍선의 ✕. 고른 것은 기억한다(localStorage).
   · 시험용 주소 : ?easy=1 켜기 · ?easy=0 끄기 · ?easyask=1 「처음이세요?」를 다시 묻기
*/
var EASY = (function(){
  /* 2026-10-20 본 앱으로 옮기며 「물어봤음」 이름을 새로 — 시험 페이지에서 답한 기억이 본 앱으로 넘어와,
     출입문 QR 로 열어도 「처음이세요?」를 안 묻고 쉬운 사용모드가 꺼진 채일 수 있다(사용자 : QR 로 열었는데 쉬운 사용모드가 없다). 본 앱에서는 모두에게 한 번 새로 묻는다. */
  var KEY_ON = 'b3nav_easy', KEY_ASK = 'b3nav_easy_asked2';
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  var on = lsGet(KEY_ON) === '1';
  var qs = location.search || '';
  if(/[?&]easy=1(&|$)/.test(qs)){ on = true;  lsSet(KEY_ON, '1'); lsSet(KEY_ASK, '1'); }
  if(/[?&]easy=0(&|$)/.test(qs)){ on = false; lsSet(KEY_ON, '0'); lsSet(KEY_ASK, '1'); }
  if(/[?&]easyask=1(&|$)/.test(qs)){ try{ localStorage.removeItem(KEY_ASK); }catch(e){} }

  function ko(){ return typeof LANG === 'undefined' || LANG !== 'en'; }
  function T(k, e){ return ko() ? k : e; }
  function $(sel){ return document.querySelector(sel); }
  function shown(el){ if(!el) return null; var r = el.getBoundingClientRect(); return (r.width > 4 && r.height > 4) ? el : null; }

  /* 화면마다 '여기서 누를 곳' — el : 누를 곳 · say : 굵은 한 문장 · sub : 작은 한 줄
     말풍선 자리 (사진·3D·버튼은 가리지도, 줄이지도 않는다 — 사용자 : 「사진이 작아지면 눈이 아프다」)
     · cover : 사진·3D 가 있는 화면은 **같은 뜻의 안내 글이나 진행 표시**를 잠깐 감추고 그 자리에 얹는다.
               compact:true 는 자리가 좁아 한 문장만 작게.
     · 그 밖의 화면은 누를 곳 바로 위(after:true 면 바로 아래)에 빈칸을 끼워 넣는다 — 사진이 없는 화면이라 줄어들 것이 없다. */
  var HINTS = {
    s1:    function(){ return { el:$('#s1 .qrStart'), ic:'📷', after:true,   /* 아래로 — 위의 「시작하기」를 가리지 않게 */
             say:T('문에 붙은 QR을 찍어서 시작해요', 'Start by scanning the QR on the door'),
             sub:T('QR이 없으면 위의 「시작하기」를 눌러요', 'No QR? Tap "Start" above') }; },
    sqr:   function(){ return { el:$('#sqr .qrManual .row'), ic:'📷',
             say:T('카메라로 문에 붙은 QR을 비춰요', 'Point the camera at the QR on the door'),
             sub:T('잘 안 되면 들어온 문을 눌러요', 'Not working? Tap the door you came in') }; },
    sqrok: function(){ return { el:$('#sqrok .okBtns .big'), ic:'✅', cover:['#qrOkSub'],   /* 「이 사진 속 장소에 계신 것이 맞다면…」 자리 */
             say:T('사진이 눈앞에 보이는 장소와 맞으면 눌러요', 'Tap if the photo matches the place in front of you'),
             sub:T('다르면 아래 「다시 스캔」', 'If not, tap "Scan again" below') }; },
    s2:    function(){ return { el:$('#s2 > .big'), ic:'🏫', cover:['#s2 .binfo p'],
             say:T('공대 3호관이 맞으면 눌러요', 'In Engineering Bldg. 3? Tap here'), sub:'' }; },
    scat:  function(){ return { el:$('#cats > *'), ic:'🚪',
             say:T('가고 싶은 곳을 눌러요', 'Tap where you want to go'),
             sub:T('강의실 · 화장실 · 비상계단', 'Room · Restroom · Emergency stairs') }; },
    s3:    function(){
             var inp = $('#nq'), hit = $('#nres > *');
             if(inp && inp.value.trim() && shown(hit))
               return { el:hit, ic:'👆', say:T('찾으시는 곳을 누르세요', 'Tap the place you are looking for'), sub:'' };
             return { el:inp, ic:'🔢', after:true, say:T('강의실 번호나 교수님 성함을 써요', 'Type a room number or professor name'),
                      sub:T('예) 13101', 'e.g. 13101') }; },
    s4:    function(){ return { el:$('#s4 > .big'), ic:'▶️', cover:['#s4 > .tip'], compact:true,   /* 「손가락 1개로 드래그…」 자리 */
             say:T('빨간 곳이 가는 곳이에요. 눌러서 출발!', 'Red is where you are going. Tap to start!'),
             sub:T('건물은 손가락으로 돌려 볼 수 있어요', 'You can turn the building with your finger') }; },
    s5:    function(){ return { el:$('#s5 > .big'), ic:'▶️', cover:['#s5 > .tip'], compact:true,
             say:T('눌러서 출발해요', 'Tap to start'), sub:T('빨간 화살표가 가는 길이에요', 'The red arrow is your way') }; },
    s6:    function(){
             var last = (typeof steps !== 'undefined' && typeof si !== 'undefined' && si === steps.length - 1);
             var m = /(\d+)\s*\/\s*(\d+)/.exec(($('#stepno') || {}).textContent || '');   // 감춘 「1 / 3 단계」는 말풍선 머리에 옮겨 단다
             return { el:$('#nx'), ic: m ? m[1] + '/' + m[2] : (last ? '🏁' : '👣'), icNum:!!m,
                      cover:['#walkTrack', '#stepno'], compact:true,                  /* 위쪽 진행 표시 자리 — 사진은 그대로 */
                      say: last ? T('도착했으면 눌러요', 'Tap when you get there')
                                : T('사진과 같은 곳까지 걸어가서 눌러요', 'Walk to the place in the photo, then tap'),
                      sub: last ? '' : T('사진이 눈앞에 보이는 장소와 맞으면 잘 가고 있어요', 'If the photo matches what you see, you are on track') }; },
    s7:    function(){ return { el:$('#s7 .big:not(.ghost)'), ic:'🎉', say:T('도착했습니다. 다른 장소도 찾을까요?', 'You have arrived. Find another place?'),
             sub:T('다른 장소로 가려면 「다른 장소 찾기」', 'To go somewhere else, tap "Find another place"') }; }
  };

  /* ── 덮개 ── */
  var phone = null, layer = null, spot, ring, finger, bubble, bIc, bSay, bSub, timer = null, lastKey = '';
  function build(){
    phone = $('.phone'); if(!phone) return false;
    layer = document.createElement('div'); layer.className = 'ezLayer'; layer.id = 'ezLayer';
    layer.innerHTML = '<div class="ezSpot"></div><div class="ezRing"></div><div class="ezFinger">👆</div>'
      + '<div class="ezBubble"><span class="ezIc"></span><div class="ezTx"><b></b><small></small></div>'
      + '<button class="ezOff" type="button" onclick="EASY.set(false)">✕</button></div>';
    phone.appendChild(layer);
    spot = layer.querySelector('.ezSpot'); ring = layer.querySelector('.ezRing'); finger = layer.querySelector('.ezFinger');
    bubble = layer.querySelector('.ezBubble'); bIc = layer.querySelector('.ezIc');
    bSay = layer.querySelector('.ezTx b'); bSub = layer.querySelector('.ezTx small');
    return true;
  }
  function hide(){ if(layer){ layer.classList.remove('on'); bubble.classList.remove('compact'); } dropGap(); setHid([]); }

  /* ── 감춰 둔 자리 ── cover 로 고른 것(같은 뜻의 안내 글·진행 표시)만 잠깐 안 보이게. 자리 크기는 그대로라 사진·3D 가 안 움직인다 */
  var hidEls = [];
  function setHid(list){
    hidEls.forEach(function(e){ if(list.indexOf(e) < 0) e.classList.remove('ezHid'); });
    list.forEach(function(e){ e.classList.add('ezHid'); });
    hidEls = list;
  }
  function solid(e){                                          // 화면 흐름 안에서 실제로 자리를 차지하는 것
    var cs = getComputedStyle(e); if(cs.position === 'absolute' || cs.position === 'fixed') return false;
    var r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4;
  }
  function nearSib(e, scr, dir, skip){                        // 위(previous)·아래(next)로 가장 가까운 이웃 — 형제가 없으면 한 단계 바깥에서
    var k = dir + 'ElementSibling';
    for(; e && e !== scr; e = e.parentElement)
      for(var s = e[k]; s; s = s[k]) if(skip.indexOf(s) < 0 && solid(s)) return s;
    return null;
  }
  function inkEdge(e, side){                                  // 칸 끝 — 큰 글자(화살표 등)가 칸 밖으로 삐져나온 것까지
    var r = e.getBoundingClientRect(), v = r[side];
    for(var n = e.firstChild; n; n = n.nextSibling){
      if(n.nodeType !== 3 || !/\S/.test(n.nodeValue)) continue;
      var rr = document.createRange(); rr.selectNodeContents(n); var rs = rr.getClientRects();
      for(var i = 0; i < rs.length; i++) v = (side === 'top') ? Math.min(v, rs[i].top) : Math.max(v, rs[i].bottom);
    }
    return v;
  }

  /* ── 말풍선 자리 ── 화면 안에 진짜 빈칸(.ezGap)을 끼워 넣고 말풍선은 그 위에 띄운다.
     덮개 위에 그냥 얹으면 사진·3D·옆 버튼을 가린다(사용자 지적). 빈칸만큼 사진·3D 가 줄어든다. */
  var gap = null;
  function topChild(el, scr){ while(el && el.parentElement !== scr) el = el.parentElement; return el; }
  function refit(scr){                                        // 3D 가 들어 있는 화면은 줄어든 크기에 다시 맞춘다
    var id = scr && scr.id;
    setTimeout(function(){ try{
      if(id === 's4' && typeof resize3D === 'function') resize3D();
      if(id === 's5' && typeof resizeB === 'function') resizeB();
    }catch(e){} }, 30);
  }
  function putGap(scr, anchor, after, hgt){
    if(!gap){ gap = document.createElement('div'); gap.className = 'ezGap'; gap.setAttribute('aria-hidden', 'true'); }
    var moved = false;
    if(after){ if(anchor.nextElementSibling !== gap){ scr.insertBefore(gap, anchor.nextSibling); moved = true; } }
    else if(anchor.previousElementSibling !== gap){ scr.insertBefore(gap, anchor); moved = true; }
    var hs = Math.round(hgt) + 'px'; if(gap.style.height !== hs){ gap.style.height = hs; moved = true; }
    if(moved) refit(scr);
  }
  function dropGap(){ if(gap && gap.parentNode){ var s = gap.parentNode; s.removeChild(gap); refit(s); } }

  /* ── 손가락 자리 ── 누를 곳 안에서 글자가 없는 곳을 먼저 찾고, 없으면 바로 아래(👆)나 위(👇)에.
     글자 자리는 화면 안 글자 마디를 그때그때 잰다 — 버튼 글자가 바뀌어도 따라간다. */
  var rg = document.createRange(), cvx = null, fSig = '';
  function inkRects(root){
    var out = [], tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, i, rs;
    while((n = tw.nextNode())){
      if(!/\S/.test(n.nodeValue)) continue;
      rg.selectNodeContents(n); rs = rg.getClientRects();
      for(i = 0; i < rs.length; i++) if(rs[i].width > 1 && rs[i].height > 1) out.push(rs[i]);
    }
    root.querySelectorAll('input').forEach(function(inp){   // 입력칸 글자·안내 글은 글자 마디가 아니라서 따로 잰다
      var t = inp.value || inp.placeholder, r = inp.getBoundingClientRect(); if(!t || r.width < 4) return;
      var cs = getComputedStyle(inp); cvx = cvx || document.createElement('canvas').getContext('2d');
      cvx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var x0 = r.left + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.borderLeftWidth) || 0);
      out.push({ left:x0, right:Math.min(r.right, x0 + cvx.measureText(t).width), top:r.top + r.height * 0.2, bottom:r.bottom - r.height * 0.2 });
    });
    return out;
  }
  function overlap(a, b){
    var w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return (w > 0 && h > 0) ? w * h : 0;
  }
  function pickFinger(r, scr, bubR, B){                       // r : 누를 곳 · bubR : 말풍선 · B : 폰 안쪽 (모두 화면 좌표)
    finger.textContent = '👆';
    var fw = finger.offsetWidth || 44, fh = finger.offsetHeight || 48, ink = inkRects(scr), C = [], best = null;
    var cy = r.top + (r.height - fh) / 2;
    for(var x = r.left + 4; x <= r.right - fw - 4; x += 8){    // ① 누를 곳 안 — 오른쪽 70% 근처를 조금 더 좋아한다
      var bx = Math.abs(x + fw / 2 - (r.left + r.width * 0.72)) * 0.02;
      C.push({ x:x, y:cy, ic:'👆', bias:bx });
      C.push({ x:x, y:r.bottom - fh * 0.5, ic:'👆', bias:12 + bx });   //    글자가 꽉 차면 아래 가장자리에 걸쳐서
      C.push({ x:x, y:r.bottom - fh * 0.3, ic:'👆', bias:16 + bx });
      C.push({ x:x, y:r.bottom - 2, ic:'👆', bias:20 + bx });           //    손끝만 아래 테두리에 닿게
      C.push({ x:x, y:r.bottom + 4, ic:'👆', bias:24 + bx });           //    노란 테두리 바로 밑에서
    }
    [0.8, 0.5, 0.2].forEach(function(f, i){
      var x = r.left + r.width * f - fw / 2;
      C.push({ x:x, y:r.bottom - fh * 0.25, ic:'👆', bias:40 + i * 4 });   // ② 바로 아래에서 위로
      C.push({ x:x, y:r.top - fh * 0.75, ic:'👇', bias:60 + i * 4 });      // ③ 바로 위에서 아래로
    });
    C.forEach(function(c){
      var b = { left:c.x - 6, top:c.y - 10, right:c.x + fw + 3, bottom:c.y + fh + 3 };   // 톡톡 움직이는 만큼(왼쪽 위로 4·6px) + 여유
      if(c.x < B.left - 4 || c.x + fw > B.right + 4 || c.y < B.top - 4 || c.y + fh > B.bottom + 12) return;   // 아래는 손등이 조금 잘려도 된다
      var s = c.bias; ink.forEach(function(k){ s += overlap(b, k); }); if(bubR) s += overlap(b, bubR) * 3;
      if(!best || s < best.s){ best = c; best.s = s; }
    });
    return best || { x:r.right - fw - 4, y:cy, ic:'👆' };
  }

  function update(){
    if(!on){ hide(); return; }
    if(!layer && !build()) return;
    if($('.ezAsk') || $('.rsCard')){ hide(); return; }      // 「처음이세요?」 · 「아까 보던 길안내」를 묻는 동안은 쉰다
    var scr = $('.screen.on'); var fn = scr && HINTS[scr.id];
    if(!fn || document.querySelector('.fx-overlay')){ hide(); return; }   // 설정·즐겨찾기 같은 화면, 부팅 연출 중
    var h = fn(); var el = shown(h.el);
    if(!el){ hide(); return; }                               // 누를 곳이 지금 안 보임(전체화면 등)
    var P = phone.getBoundingClientRect(), W = P.width, H = P.height;
    var bw = phone.clientWidth, bh = phone.clientHeight;      // 테두리를 뺀 안쪽
    var ox = P.left + (W - bw) / 2, oy = P.top + (H - bh) / 2;
    layer.classList.add('on');
    var key = scr.id + '|' + h.say + '|' + h.ic;
    if(key !== lastKey){                                      // 문구가 바뀔 때만 다시 쓰고 살짝 튀어나오게
      lastKey = key; bIc.textContent = h.ic; bIc.classList.toggle('num', !!h.icNum); bSay.textContent = h.say; bSub.textContent = h.sub || '';
      bSub.style.display = h.sub ? '' : 'none';
      bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
    }
    /* 말풍선 자리 : ① cover 가 있으면 그 자리(위아래 이웃 사이 한가운데) ② 없으면 누를 곳 옆에 빈칸 */
    var cov = (h.cover || []).map(function(sel){ return $(sel); }).filter(function(e){ return e && e.getBoundingClientRect().height > 0; });
    var up = cov.length ? nearSib(cov[0], scr, 'previous', cov) : null, dn = cov.length ? nearSib(cov[cov.length - 1], scr, 'next', cov) : null;
    var bH, bTop;
    if(up && dn){
      dropGap(); setHid(cov); bubble.classList.toggle('compact', !!h.compact);
      bH = bubble.offsetHeight || 56;
      bTop = (inkEdge(up, 'bottom') + inkEdge(dn, 'top')) / 2 - bH / 2;
    }else{
      setHid([]); bubble.classList.remove('compact');
      bH = bubble.offsetHeight || 80;
      putGap(scr, topChild(el, scr), !!h.after, bH + 16);
      bTop = gap.getBoundingClientRect().top + 8;
    }
    bubble.style.top = Math.round(bTop - oy) + 'px';
    /* 누를 곳 : 밝게 + 노란 테두리 */
    var r = el.getBoundingClientRect(), pad = 6;
    var x = r.left - ox - pad, y = r.top - oy - pad, w = r.width + pad * 2, hh = r.height + pad * 2;
    [spot, ring].forEach(function(d){ d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.width = w + 'px'; d.style.height = hh + 'px'; });
    /* 손가락 : 글자를 가리지 않는 곳 — 누를 곳이나 말풍선이 움직였을 때만 다시 고른다 */
    var sig = key + '|' + [r.left, r.top, r.width, r.height, bTop].map(Math.round).join(',');
    if(sig !== fSig){
      fSig = sig;
      var bubR = { left:ox + 12, right:ox + bw - 12, top:bTop, bottom:bTop + bH };
      var f = pickFinger(r, scr, bubR, { left:ox, top:oy, right:ox + bw, bottom:oy + bh });
      finger.textContent = f.ic; finger.style.left = Math.round(f.x - ox) + 'px'; finger.style.top = Math.round(f.y - oy) + 'px';
    }
  }
  function loop(){ if(timer) return; timer = setInterval(update, 200); update(); }
  function stop(){ if(timer){ clearInterval(timer); timer = null; } hide(); }

  /* ── 켜고 끄기 ── */
  function syncButtons(){
    var t = on ? T('켜짐', 'On') : T('꺼짐', 'Off');
    document.querySelectorAll('.ezState').forEach(function(s){ s.textContent = t; });
    document.querySelectorAll('.ezToggle').forEach(function(b){ b.classList.toggle('isOn', on); });
  }
  function set(v){
    on = !!v; lsSet(KEY_ON, on ? '1' : '0'); lsSet(KEY_ASK, '1');
    syncButtons(); lastKey = ''; fSig = '';
    if(on) loop(); else stop();
  }
  function toggle(){ set(!on); }

  /* ── 처음 한 번 묻기 ── 순서 : 앱을 켠다 → 초록 글자 켜는 화면(boot.js) → 「처음이세요?」 → 앱 첫 화면 (2026-10-19 사용자).
     켜는 화면이 저절로 끝나든 「탭하여 건너뛰기」로 넘기든, 그 화면이 사라지는 순간 바로 묻는다.
     켜는 화면이 아예 없으면(새 판으로 조용히 바꿔 단 직후 — b3nav_quiet) 앱이 뜨자마자 묻는다.
     (10-18 에는 「너무 늦게 뜬다」고 해서 켜는 화면보다 먼저 띄웠는데, 켜는 화면 앞에 뜨는 것도 어색하다 —
      예전에 늦었던 건 켜는 화면이 끝난 뒤에도 3D 준비(appBooted)와 0.45초를 더 기다렸기 때문이라, 이제는 기다리지 않는다) */
  function ask(){
    if(lsGet(KEY_ASK) === '1' || !phone || $('.ezAsk')) return;   // 이미 떠 있으면 또 띄우지 않는다
    var a = document.createElement('div'); a.className = 'ezAsk';
    a.innerHTML = '<div class="card"><div class="ic">👆</div>'
      + '<b>' + T('처음이세요?', 'First time here?') + '</b>'
      + '<p>' + T('누를 곳을 하나씩 알려 드릴까요?', 'Shall we show you what to tap, one step at a time?') + '</p>'
      + '<div class="note">⚙️ ' + T('설정에서 언제든 켜고 끌 수 있어요', 'You can turn this on or off anytime in Settings') + '</div>'
      + '<button class="big" type="button" data-a="1">' + T('네, 알려 주세요', 'Yes, show me') + '</button>'
      + '<button class="big ghost" type="button" data-a="0">' + T('아니요, 혼자 할게요', "No thanks, I'll explore") + '</button></div>';
    a.addEventListener('click', function(e){
      var b = e.target.closest('button[data-a]'); if(!b) return;
      a.remove(); set(b.getAttribute('data-a') === '1');
    });
    phone.appendChild(a);
  }
  /* 켜는 화면이 사라지면 곧바로 — 묻기(처음인 사람) · 말풍선 시작(이미 켜 둔 사람) */
  var askFired = false;   // 켜는 화면이 끝나 「처음이세요?」 차례가 지났는가 — resume.js 가 그다음에 묻는다(EASY.busy)
  function whenReady(){
    var t0 = Date.now(), sawBoot = false;
    function fire(){
      if(askFired) return; askFired = true;
      if(!phone) build();
      syncButtons();
      if(!on) ask(); else loop();                                 // 이미 켜 둔 사람에게는 묻지 않는다
    }
    (function wait(){
      if(askFired) return;
      var boot = $('.fx-boot');
      if(boot){ sawBoot = true; }
      else if(sawBoot){ fire(); return; }                         // 켜는 화면이 막 사라졌다 (끝났거나 건너뜀)
      else if(document.readyState !== 'loading'){                 // boot.js 까지 다 읽었는데 켜는 화면이 없다 = 건너뛴 판
        if($('.screen.on')){ fire(); return; }
      }
      if(Date.now() - t0 < 180000) setTimeout(wait, 50);         // 켜는 화면을 오래 보고 있어도 놓치지 않게 (3분까지)
    })();
  }
  whenReady();
  window.addEventListener('resize', function(){ if(on) update(); });
  /* 한/영을 바꾸면 「켜짐/꺼짐」 글자도 따라가게 (ui.js 는 건드리지 않고 여기서 본다) */
  var _lang = null; setInterval(function(){ var l = (typeof LANG !== 'undefined') ? LANG : 'ko'; if(l !== _lang){ _lang = l; syncButtons(); } }, 800);

  /* ask : 「처음이세요?」를 다시 띄운다 (설정의 '처음 안내 다시 보기' 등에 쓸 수 있다) */
  function askAgain(){ try{ localStorage.removeItem(KEY_ASK); }catch(e){} if(!phone) build(); ask(); }
  /* busy : 아직 「처음이세요?」 차례이거나 묻는 중 — 길안내 이어 하기 카드(resume.js)는 이게 끝난 뒤에 뜬다 */
  function busy(){ return !askFired || !!$('.ezAsk'); }
  return { set:set, toggle:toggle, isOn:function(){ return on; }, update:update, ask:askAgain, busy:busy, HINTS:HINTS };
})();
