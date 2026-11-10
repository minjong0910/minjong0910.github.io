"use strict";
/* voice.js — 말로 찾기 (2026-11-10 사용자 · 견본 /sample/voice3/ 을 사용자가 폰으로 확인하고 「실제 앱에 넣고 배포해줘」)
   참고 영상 : Siri 같은 점 구슬(오브) 로딩 모션 — 점으로 된 공이 상태마다 다르게 움직인다(이 파일의 Orb, 2D 캔버스).

   ① 첫 화면 아래에 오브 + 늘 붙은 말풍선 「눌러서 목적지를 말해주세요.」(말풍선을 눌러도 같다)
   ② 한 번 누르면 오브가 가운데로 와서 커지고, 위 말풍선에 「가시고 싶은 목적지를 말씀해주세요」
   ③ 말하는 동안 그 말이 말풍선에 그대로 써진다(구슬은 목소리에 맞춰 출렁인다) · 말이 끝나면 저절로 멈춘다(듣는 중에 한 번 더 누르면 바로 끝)
   ④ 「찾으시는 목적지가 여기가 맞나요?」 + 그 장소 사진 · 호실 · 층 (후보가 여럿이면 「다른 곳」 단추) → [길안내 시작] / 그 밑 [다시 말하기]
   ⑤ [길안내 시작] → 3D 전체 건물도를 거치지 않고 길안내 첫 화면(1단계)으로 바로 — 뒤로 가면 첫 화면 (사용자 정정 11/10)

   말풍선 자리는 폰마다 재서 고른다(사용자 : 「다른 글씨 안 가려지고 좋은 위치에」) — place() :
   · 글씨와 오브 사이가 넉넉하면 → 오브 바로 위(꼬리가 아래로). 조금 모자라면 오브를 10px 내려서라도 위에
   · 그래도 좁으면 → [오브] 「말풍선」 을 한 줄로 묶어 가운데에(오브가 왼쪽으로 비켜서고 꼬리가 왼쪽으로)
   · 오브가 글씨에 닿을 만큼 작은 폰이면 → 첫 화면 내용을 조금 위로 올리고, 그래도 모자라면 오브를 0.8배로
   첫 화면이 아니거나, 동의 · 「처음이세요?」 · 이어 하기 카드 · 시간표 카드 · 종료 창 같은 것이 떠 있으면 숨는다.

   말 → 목적지 : 13524 · 일삼오이사 · 만삼천오백이십사 · 1만 3524 · 3층 10호 · 삼층 십호 · 524호(끝자리) · 교수님 성함(이름만도) · 실 이름 · 피씨실 · 화장실(층, 말 안 하면 1층).
   방 목록(VALID_FULL5 · ROOM_NAME · RFIX) · 사진(SHARE.photoOf) · 길안내(openSearchHit · openTarget · startGuide)는 앱의 것을 그대로 쓴다.
   음성 인식 = 브라우저 기능(Web Speech API — 크롬 · 삼성 인터넷은 구글, 아이폰 사파리는 애플 서버) — 인터넷이 있어야 하고, 카톡 등 앱 안 브라우저는 안 될 수 있다.
   들은 말은 글자로만 화면에 보이고 어디에도 보내거나 남기지 않는다(우리 서버 X). 화면에 넣을 때는 모두 esc(). */
var VOICE = (function(){
  var D = document;
  window.__VS2 = window.__VS3 = true;   // 견본 페이지(/sample/voice2·3/)가 이 앱에 견본 오브를 또 끼워 넣지 않게
  function ko(){ return typeof LANG === 'undefined' || LANG !== 'en'; }
  function T(k, e){ return ko() ? k : e; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function phone(){ return D.querySelector('.phone') || D.body; }

  /* ── 구슬(오브) : 점으로 된 공 — 피보나치 구 위의 점을 돌리며 상태마다 출렁임 · 속도 · 색을 바꾼다 ── */
  function Orb(canvas, n, dot, rad){
    var ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, pts = [], GA = Math.PI*(3 - Math.sqrt(5));
    for(var i = 0; i < n; i++){ var y = 1 - (i + 0.5)/n*2, r = Math.sqrt(1 - y*y), th = i*GA; pts.push({x:Math.cos(th)*r, y:y, z:Math.sin(th)*r, lat:Math.asin(y)}); }
    var P = {amp:.035, speed:.32, scan:0, size:1}, Tg = {amp:.035, speed:.32, scan:0, size:1}, col = [0,229,255], mode = 'idle', level = 0, lvT = 0, t0 = performance.now();
    var COL = {idle:[0,229,255], listen:[0,229,255], think:[160,240,255], done:[57,255,136], none:[255,154,92]};
    function set(m){ mode = m;
      Tg = m === 'listen' ? {amp:.08, speed:.6, scan:0, size:1.04} : m === 'think' ? {amp:.015, speed:1.4, scan:1, size:.98} : m === 'done' ? {amp:.02, speed:.25, scan:0, size:.92} : m === 'none' ? {amp:.02, speed:.2, scan:0, size:.92} : {amp:.035, speed:.32, scan:0, size:1}; }
    function bump(v){ lvT = Math.max(lvT, v); }
    function draw(now){
      var t = (now - t0)/1000, k;
      for(k in Tg) P[k] += (Tg[k] - P[k])*.08;
      var c = COL[mode] || COL.idle; for(k = 0; k < 3; k++) col[k] += (c[k] - col[k])*.08;
      level = Math.max(level*.9, lvT); lvT *= .86;
      ctx.clearRect(0, 0, W, H);
      var cx = W/2, cy = H/2, R = W*rad*P.size, a = t*P.speed, ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(.42), st = Math.sin(.42);
      var scanY = Math.sin(t*2.3)*.95, amp = P.amp + (mode === 'listen' ? level*.2 : 0), br = (mode === 'idle' || mode === 'done') ? Math.sin(t*1.7)*.03 : 0;
      var tint = (mode === 'done' || mode === 'none') ? 0 : .55;
      for(var i = 0; i < pts.length; i++){
        var p = pts[i], x1 = p.x*ca - p.z*sa, z1 = p.x*sa + p.z*ca, y1 = p.y, y2 = y1*ct - z1*st, z2 = y1*st + z1*ct;
        var g = P.scan > .05 ? Math.exp(-Math.pow(y2 - scanY, 2)/.012)*P.scan : 0;
        var kk = 1 + amp*Math.sin(p.lat*7 - t*(mode === 'listen' ? 7 : 3)) + br, pr = 1/(1.55 - z2*.45), d = (z2 + 1)/2, mix = (y2 + 1)/2;
        var sz = (W/150)*dot*(.45 + .75*d)*(1 + g*1.6 + (mode === 'listen' ? level*.5 : 0)), al = Math.min(1, .16 + .84*d*d + g*.8);
        ctx.fillStyle = 'rgba(' + ((col[0] + (124 - col[0])*mix*tint)|0) + ',' + ((col[1] + (92 - col[1])*mix*tint)|0) + ',' + ((col[2] + (255 - col[2])*mix*tint)|0) + ',' + al.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(cx + x1*kk*R*pr*1.05, cy + y2*kk*R*pr*1.05, sz, 0, 6.2832); ctx.fill();
      }
    }
    return {set:set, bump:bump, draw:draw};
  }

  /* ── 붙이기 (모양은 app.css 「말로 찾기」) ── */
  var btn = D.createElement('button'); btn.type = 'button'; btn.className = 'vsOrb hide';
  btn.innerHTML = '<canvas width="132" height="132"></canvas>';
  var dim = D.createElement('div'); dim.className = 'vsDim';
  var bub = D.createElement('div'); bub.className = 'vsBub'; bub.setAttribute('aria-live', 'polite');
  var card = D.createElement('div'); card.className = 'vsCard'; card.setAttribute('role', 'dialog');
  var hint = D.createElement('button'); hint.type = 'button'; hint.className = 'vsHint';
  var probe = D.createElement('div');   // 폰 아래 안전 여백(홈 막대) 재기
  probe.style.cssText = 'position:absolute;left:0;bottom:0;width:1px;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none;';
  var ph = phone(); ph.appendChild(dim); ph.appendChild(bub); ph.appendChild(card); ph.appendChild(btn); ph.appendChild(hint); ph.appendChild(probe);
  function paintWords(){
    btn.setAttribute('aria-label', T('말로 목적지 찾기', 'Find by voice'));
    var txt = T('눌러서 목적지를 말해주세요.', 'Tap and tell me where to go.');
    if(hint.textContent !== txt) hint.textContent = txt;
  }
  paintWords();
  var orb = Orb(btn.querySelector('canvas'), 140, 2.4, .4);
  /* 그리기는 오브가 보일 때만 — 다른 화면(3D 등)에서는 멈춰 둔다 */
  var looping = false;
  function loop(now){ if(btn.classList.contains('hide')){ looping = false; return; } orb.draw(now); requestAnimationFrame(loop); }
  function kick(){ if(!looping && !btn.classList.contains('hide')){ looping = true; requestAnimationFrame(loop); } }

  /* ── 늘 떠 있는 말풍선 자리 ── */
  var PAD0 = null;   // 첫 화면(#s1) 본래 아래 여백 — 작은 폰에서만 늘렸다가, 다시 잴 때마다 되돌려 놓고 잰다
  function phoneBox(){ var r = ph.getBoundingClientRect(); return {left:r.left + ph.clientLeft, top:r.top + ph.clientTop, width:ph.clientWidth, height:ph.clientHeight}; }
  function rectIn(el, pr){ var r = el.getBoundingClientRect(); return {l:r.left - pr.left, t:r.top - pr.top, r:r.right - pr.left, b:r.bottom - pr.top, w:r.width, h:r.height}; }
  /* 오브 자리는 재지 않고 셈한다 — 크기 바뀌는 중(.25초)에 재면 틀리므로. app.css 의 .vsOrb / .lo / .sm 과 같은 숫자
     m : '' = 바닥에서 20px · 'lo' = 10px(조금 내려서 위 말풍선 자리 만들기) · 'sm' = 10px + 0.8배 */
  function orbBox(pr, m, dx){
    var half = m === 'sm' ? 33*.8 : 33, cy = pr.height - (m ? 10 : 20) - probe.offsetHeight - 33, cx = pr.width/2 + (dx || 0);
    return {l:cx - half, r:cx + half, t:cy - half, b:cy + half, half:half};
  }
  var VSX = 0;
  function setDx(dx){ dx = Math.round(dx); if(dx !== VSX){ VSX = dx; btn.style.setProperty('--vsx', dx + 'px'); } }
  function setM(m){ btn.classList.toggle('lo', m === 'lo'); btn.classList.toggle('sm', m === 'sm'); }
  /* 첫 화면 글씨 · 단추의 맨 위와 맨 아래 (쉬운 사용모드 말풍선 포함) */
  function contentBox(pr){
    var top = 1e9, bot = -1e9;
    [].forEach.call(D.querySelectorAll('#s1 > *, .ezBubble, .ezRing'), function(el){
      if(el.classList.contains('topBanner')) return;
      var cs = getComputedStyle(el); if(cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
      var r = rectIn(el, pr); if(r.w < 2 || r.h < 2 || r.b <= 0 || r.t >= pr.height) return;
      if(r.t < top) top = r.t; if(r.b > bot) bot = r.b;
    });
    return {t:top, b:bot};
  }
  var GAP_TXT = 12, GAP_ORB = 9, TAIL = 7, EDGE = 12, lastSig = '';
  function sigOf(pr, c){ return [pr.width, pr.height, Math.round(c.t), Math.round(c.b), hint.textContent, D.documentElement.className].join('|'); }
  function place(force){
    var s1 = D.getElementById('s1');
    /* 첫 화면이 떠 있을 때만 — 다른 화면으로 넘어가는 순간(아직 오브를 숨기기 전)에 재면 첫 화면 글씨가 안 보여 엉뚱한 자리에 뜬다 */
    var want = s1 && s1.classList.contains('on') && !btn.classList.contains('hide') && !ACTIVE && !card.classList.contains('on');
    if(!want){ hint.classList.remove('on'); return; }
    paintWords();
    var pr = phoneBox(), wasOn = hint.classList.contains('on');
    if(!force && wasOn && sigOf(pr, contentBox(pr)) === lastSig) return;   // 바뀐 것이 없으면 다시 재지 않는다
    if(PAD0 === null) PAD0 = s1.style.paddingBottom || '';
    s1.style.paddingBottom = PAD0;
    var c = contentBox(pr);
    /* ① 오브 위가 넉넉하면 → 위 (모자라면 오브를 10px 내려서 한 번 더) */
    hint.className = 'vsHint top' + (wasOn ? ' on' : ''); hint.style.maxWidth = '';
    var hw = hint.offsetWidth, hh = hint.offsetHeight, m, o, MS = ['', 'lo'];
    for(var i = 0; i < MS.length; i++){
      o = orbBox(pr, MS[i]);
      if(o.t - c.b >= hh + TAIL + GAP_ORB + GAP_TXT){
        setM(MS[i]); setDx(0);
        var x = (o.l + o.r)/2 - hw/2; x = Math.max(EDGE, Math.min(pr.width - EDGE - hw, x));
        hint.style.left = x + 'px'; hint.style.top = (o.t - GAP_ORB - TAIL - hh) + 'px';
        hint.classList.add('on'); lastSig = sigOf(pr, c); return;
      }
    }
    /* ② 오브가 글씨에 닿으면 → 오브를 10px 내리고, 첫 화면 내용을 위로(위 여백이 남는 만큼만), 그래도 모자라면 오브를 작게 */
    m = ''; o = orbBox(pr, m);
    if(o.t - c.b < GAP_TXT){ m = 'lo'; o = orbBox(pr, m); }
    if(o.t - c.b < GAP_TXT){
      var cs1 = getComputedStyle(s1), basePad = parseFloat(cs1.paddingBottom) || 0;
      var room = Math.max(0, c.t - (rectIn(s1, pr).t + (parseFloat(cs1.paddingTop) || 0)) - 4);   // 위에 남은 빈칸
      var add = Math.min((GAP_TXT - (o.t - c.b))*2, room*2);   // 가운데 정렬이라 아래 여백을 2만큼 늘리면 내용이 1만큼 올라간다
      if(add > 0){ s1.style.paddingBottom = (basePad + add) + 'px'; c = contentBox(pr); }
      if(o.t - c.b < GAP_TXT){
        m = 'sm'; o = orbBox(pr, m);
        var add2 = Math.min(add + Math.max(0, GAP_TXT - (o.t - c.b))*2, room*2);
        if(add2 > add){ s1.style.paddingBottom = (basePad + add2) + 'px'; c = contentBox(pr); }
      }
    }
    setM(m);
    /* ③ 오브 오른쪽 — [오브] 「말풍선」 을 한 줄로 묶어 가운데에. 폭이 모자라면 두 줄 */
    var GAP_SIDE = TAIL + 6;
    hint.className = 'vsHint side' + (wasOn ? ' on' : '');
    hw = hint.offsetWidth;
    var avail = pr.width - 2*EDGE - 2*o.half - GAP_SIDE;
    if(hw > avail){ hint.classList.add('wrap'); hint.style.maxWidth = avail + 'px'; hw = hint.offsetWidth; }
    hh = hint.offsetHeight;
    var unit = 2*o.half + GAP_SIDE + hw, left0 = Math.max(EDGE, (pr.width - unit)/2);
    setDx(left0 + o.half - pr.width/2); o = orbBox(pr, m, VSX);
    var y = (o.t + o.b)/2 - hh/2; y = Math.max(c.b + 6, Math.min(pr.height - hh - 4, y));
    hint.style.left = (o.r + GAP_SIDE) + 'px'; hint.style.top = y + 'px';
    hint.classList.add('on'); lastSig = sigOf(pr, c);
  }
  window.addEventListener('resize', function(){ setTimeout(function(){ place(true); }, 60); });

  /* 첫 화면에서만 보인다 — 켜는 화면 · 동의 · 「처음이세요?」 · 이어 하기 카드(.rsCard) · 시간표 카드(.rsCard.syHome) · 종료 창 · 다른 창이 떠 있으면 숨는다 */
  var COVER = '.syAgree, .ezAsk, .phone > .sySheet, .syDoc, .syPermDlg, .rsCard, .syExit, #pwaSheet, .vcWrap';
  function tick(){
    var s1 = D.getElementById('s1');
    var home = s1 && s1.classList.contains('on');
    var cover = D.querySelector(COVER) || (typeof appBooted !== 'undefined' && !appBooted);
    var show = (home && !cover) || ACTIVE;
    btn.classList.toggle('hide', !show);
    if(show) kick();
    place(false);
  }
  setInterval(tick, 300);

  /* ── 말 → 목적지 ── */
  var KD = {'영':0,'공':0,'일':1,'이':2,'삼':3,'사':4,'오':5,'육':6,'륙':6,'칠':7,'팔':8,'구':9};
  function koNumber(run){
    if(!/[십백천만]/.test(run)){ var s = ''; for(var i = 0; i < run.length; i++) s += KD[run.charAt(i)]; return s; }
    var total = 0, sec = 0, cur = 0;
    for(var j = 0; j < run.length; j++){ var ch = run.charAt(j);
      if(KD[ch] !== undefined) cur = KD[ch];
      else if(ch === '십'){ sec += (cur || 1)*10; cur = 0; } else if(ch === '백'){ sec += (cur || 1)*100; cur = 0; }
      else if(ch === '천'){ sec += (cur || 1)*1000; cur = 0; } else if(ch === '만'){ total += ((sec + cur) || 1)*10000; sec = 0; cur = 0; } }
    return String(total + sec + cur);
  }
  function norm(s){
    s = String(s || '').replace(/[.,!?~·"'“”‘’]/g, ' ').replace(/(\d)\s*,\s*(\d)/g, '$1$2');
    s = s.replace(/(\d+)\s*만\s*(\d+)/g, function(m, a, b){ return String(+a*10000 + (+b)); });
    s = s.replace(/(일|이|삼|사|오)\s*층/g, function(m, a){ return KD[a] + '층'; });
    s = s.replace(/(\d)\s*층\s*([영공일이삼사오육륙칠팔구십]+)\s*호/g, function(m, f, r){ return f + '층 ' + koNumber(r) + '호'; });
    s = s.replace(/피씨|피시/g, 'PC').replace(/에이아이/g, 'AI').replace(/아이오티/g, 'IoT').replace(/알에프/g, 'RF').replace(/에스오씨/g, 'SoC');
    s = s.replace(/[영공일이삼사오육륙칠팔구십백천만]{2,}(?=\s*(호|번|$))/g, function(m){ return koNumber(m); });
    return s.replace(/\s+/g, ' ').trim();
  }
  var STOP = ['어디에 있어요','어디에 있어','어디 있어요','어디 있어','어디예요','어디에요','어디야','어디','있나요','있어요','있어','가는 길','가는길','알려 줘','알려줘','알려주세요','찾아 줘','찾아줘','찾아주세요','가고 싶어요','가고 싶어','가고싶어','가 줘','가줘','가자','주세요','해 줘','해줘','좀','으로 가','로 가'];
  function tokensOf(s){
    STOP.forEach(function(w){ s = s.split(w).join(' '); });
    return s.split(/\s+/).map(function(t){ return t.length > 2 ? t.replace(/(으로|에서|에게|에는|은요|는요|이요|님이|님은|님)$/, '').replace(/(로|에|은|는|이|가|을|를|의|요)$/, '') : t; })
            .filter(function(t){ return t && t.length >= 2; });
  }
  /* 방 목록 — 관리자가 이름을 바꿨을 수 있어(roomfix.js) 들을 때마다 새로 만든다 */
  var ROOMS = null;
  function rooms(){
    if(ROOMS) return ROOMS;
    ROOMS = [];
    try{ Object.keys(VALID_FULL5).forEach(function(c){
      if(!/^\d{5}$/.test(c)) return;
      var nm = (typeof ROOM_NAME === 'object' && ROOM_NAME[c]) || '', no = (typeof RFIX !== 'undefined' && RFIX.dispNo) ? RFIX.dispNo(c) : c;
      var m = /([가-힣]{2,4}) 교수님/.exec(nm);
      ROOMS.push({code:c, no:no, floor:VALID_FULL5[c].floor, name:nm, prof:m ? m[1] : '', ns:nm.replace(/\s+/g, '').toLowerCase()});
    }); }catch(e){}
    return ROOMS;
  }
  function byNo(d){ var R = rooms(); for(var i = 0; i < R.length; i++) if(R[i].code === d || R[i].no === d) return R[i]; return null; }
  function match(text){
    var s = norm(text), q = s.replace(/\s+/g, '').toLowerCase(), R = rooms();
    var fl = /([1-5])\s*층\s*(\d{1,2})\s*호/.exec(s);
    if(fl){ var r0 = byNo('13' + fl[1] + ('0' + fl[2]).slice(-2)); if(r0) return {kind:'room', items:[r0], said:s}; }
    var nums = s.match(/\d{3,5}/g) || [];
    for(var i = 0; i < nums.length; i++){
      var d = nums[i];
      if(d.length === 5){ var r5 = byNo(d); if(r5) return {kind:'room', items:[r5], said:s}; return {kind:'nonum', num:d, said:s}; }
      var hits = R.filter(function(r){ return r.no.slice(-d.length) === d; });
      if(hits.length) return {kind:'room', items:hits.slice(0, 5), said:s};
    }
    if(/화장실/.test(q)){ var f0 = /([1-5])\s*층/.exec(s), fz = f0 ? +f0[1] : 1; return {kind:'toilet', floor:fz, said:s}; }
    var toks = tokensOf(s), scored = [];
    R.forEach(function(r){
      var sc = 0;
      if(r.prof && q.indexOf(r.prof) >= 0) sc += 100;
      else if(r.prof && /교수/.test(q) && q.indexOf(r.prof.slice(1)) >= 0) sc += 35;
      toks.forEach(function(t){ var tl = t.toLowerCase(); if(tl === '교수님' || tl === '교수' || (tl === '연구실' && r.prof)) return; if(r.ns.indexOf(tl) >= 0) sc += tl.length*6; });
      if(q.length >= 3 && r.ns === q) sc += 40;
      var fq = /([1-5])\s*층/.exec(s); if(fq && sc > 0) sc += (+fq[1] === r.floor) ? 25 : -20;
      if(sc > 0) scored.push({r:r, sc:sc});
    });
    scored.sort(function(a, b){ return b.sc - a.sc || a.r.floor - b.r.floor; });
    if(!scored.length || scored[0].sc < 12) return {kind:'none', said:s};
    var top = scored[0].sc;
    return {kind:'room', items:scored.filter(function(x){ return x.sc >= top*.7; }).slice(0, 5).map(function(x){ return x.r; }), said:s};
  }

  /* ── 듣기 ── */
  var ACTIVE = false, REC = null, finalTxt = '', alts = [], lastLen = 0, errMsg = '', timer = 0;
  /* 견본 페이지(/sample/voice2·3/)처럼 이 앱을 틀(iframe)로 띄운 바깥 창이 허락하면 그 창의 음성 인식을 쓴다 — 아이폰은 틀 안 마이크를 막는다 */
  function recCtor(){
    var hosts = [];
    try{ if(window.parent && window.parent !== window && window.parent.__VS_HOST) hosts.push(window.parent); }catch(e){}
    hosts.push(window);
    for(var i = 0; i < hosts.length; i++){ var S = hosts[i].SpeechRecognition || hosts[i].webkitSpeechRecognition; if(S) return S; }
    return null;
  }
  function inApp(){ return /KAKAOTALK|Instagram|NAVER\(inapp|FBAN|FBAV|Line\//i.test(navigator.userAgent); }
  function bubble(html, warn){ bub.innerHTML = html; bub.classList.toggle('warn', !!warn); bub.classList.add('on'); }
  function setActive(on){
    ACTIVE = on; btn.classList.toggle('on', on); dim.classList.toggle('on', on);
    if(on){ hint.classList.remove('on'); kick(); }
    else { bub.classList.remove('on'); orb.set('idle'); }
  }
  function stopRec(){ clearTimeout(timer); if(REC){ try{ REC.onend = null; REC.onerror = null; REC.abort(); }catch(e){} REC = null; } }
  function closeAll(){ stopRec(); card.classList.remove('on'); setActive(false); setTimeout(function(){ place(true); }, 0); }
  function listen(){
    card.classList.remove('on'); stopRec(); setActive(true);
    finalTxt = ''; alts = []; lastLen = 0; errMsg = ''; ROOMS = null;
    var SR = recCtor();
    if(!SR){
      orb.set('none');
      bubble(T(inApp() ? '이 앱 안 브라우저는 음성 인식이 안 돼요' : '이 브라우저는 음성 인식이 안 돼요', 'Voice is not supported in this browser') +
             '<small>' + T('크롬 · 삼성 인터넷 · 아이폰 사파리로 열어 주세요 — 화면을 누르면 닫혀요', 'Please open in Chrome or Safari — tap to close') + '</small>', true);
      return;
    }
    var r = new SR(); REC = r;
    r.lang = ko() ? 'ko-KR' : 'en-US'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 3;
    orb.set('listen');
    bubble('<span class="ask">' + T('가시고 싶은 목적지를 말씀해주세요', 'Tell me where you want to go') + '<i></i><i></i><i></i></span>');
    r.onspeechstart = function(){ orb.bump(.7); };
    r.onsoundstart = function(){ orb.bump(.35); };
    r.onresult = function(e){
      var fin = '', inter = '';
      for(var i = e.resultIndex; i < e.results.length; i++){
        var res = e.results[i];
        if(res.isFinal){ fin += res[0].transcript; alts = []; for(var k = 0; k < res.length; k++) alts.push(res[k].transcript); }
        else inter += res[0].transcript;
      }
      if(fin) finalTxt = fin;
      var len = (finalTxt + inter).length; if(len > lastLen) orb.bump(Math.min(1, .45 + (len - lastLen)*.08)); lastLen = len;
      bubble(esc(finalTxt) + (inter ? '<span class="int">' + esc(inter) + '</span>' : ''));   // 사용자가 말하는 그대로
    };
    r.onerror = function(e){
      var m = {'not-allowed':T('마이크 사용을 허락해 주세요', 'Please allow the microphone'), 'service-not-allowed':T('마이크 사용을 허락해 주세요', 'Please allow the microphone'),
               'no-speech':T('잘 안 들렸어요', "I couldn't hear you"), 'audio-capture':T('마이크를 찾지 못했어요', 'No microphone found'), 'network':T('음성 인식은 인터넷이 필요해요', 'Voice needs the internet')}[e.error];
      if(e.error === 'aborted') return;
      errMsg = m || T('음성 인식이 멈췄어요', 'Voice stopped');
    };
    r.onend = function(){
      clearTimeout(timer); REC = null;
      if(finalTxt){ think(alts.length ? alts : [finalTxt], finalTxt); return; }
      orb.set('none');
      bubble(esc(errMsg || T('잘 안 들렸어요', "I couldn't hear you")) + '<small>' + T('구슬을 다시 누르고 말해 주세요 · 화면을 누르면 닫혀요', 'Tap the orb and try again · tap to close') + '</small>', true);
      if(errMsg && /허락|allow/.test(errMsg)) bub.querySelector('small').textContent = T('주소창 왼쪽 자물쇠 → 마이크 → 허용', 'Address bar lock icon → Microphone → Allow');
    };
    try{ r.start(); }catch(e){ orb.set('none'); bubble(T('음성 인식을 시작하지 못했어요', 'Could not start voice'), true); return; }
    timer = setTimeout(function(){ try{ r.stop(); }catch(e){} }, 10000);
  }
  function think(list, said){
    orb.set('think');
    setTimeout(function(){
      var best = null;
      list.forEach(function(t){
        var m = match(t), w = m.kind === 'room' ? (m.items.length === 1 ? 3 : 2) : (m.kind === 'toilet' ? 2 : (m.kind === 'nonum' ? 1 : 0));
        if(!best || w > best.w) best = {m:m, w:w};
      });
      show(best.m, said);
    }, 600);
  }

  /* ── 「찾으시는 목적지가 여기가 맞나요?」 ── */
  function photoOf(code){ try{ return (typeof SHARE !== 'undefined' && SHARE.photoOf) ? SHARE.photoOf(code) : ''; }catch(e){ return ''; } }
  function flName(f){ try{ return typeof lvName === 'function' ? lvName(f) : f + '층'; }catch(e){ return f + '층'; } }
  function photoBox(u, big){
    return '<div class="vsPh">' + (u ? '<div class="bg" style="background-image:url(\'' + esc(u) + '\')"></div><img src="' + esc(u) + '" alt="">'
                                     : '<div class="none"><b>' + esc(big) + '</b>' + T('사진 준비 중', 'No photo yet') + '</div>') + '</div>';
  }
  function show(m, said){
    if(!ACTIVE) setActive(true);
    bub.classList.remove('on');
    var h = '<div class="grab"></div><button class="x" type="button" aria-label="' + T('닫기', 'Close') + '">✕</button>';
    if(m.kind === 'room' || m.kind === 'toilet'){
      orb.set('done');
      h += '<h4>' + T('찾으시는 목적지가 여기가 맞나요?', 'Is this where you want to go?') + '</h4>' +
           '<div class="said">「' + esc(said) + '」</div><div class="vsPick"></div>' +
           '<button class="vsGo" type="button">' + T('길안내 시작', 'Start directions') + '</button>' +
           '<button class="vsAgain" type="button">' + T('다시 말하기', 'Say it again') + '</button>';
      card.innerHTML = h; card.classList.add('on');
      var cur = 0, items = m.items || [];
      var paint = function(){
        var box = card.querySelector('.vsPick');
        if(m.kind === 'toilet'){
          box.innerHTML = photoBox(photoOf('WC' + m.floor), 'WC') + '<div class="vsName">' + esc(flName(m.floor)) + ' ' + T('화장실', 'restroom') + '<small>' + T('「3층 화장실」처럼 층도 말할 수 있어요', 'You can say the floor too') + '</small></div>';
          return;
        }
        var r = items[cur];
        box.innerHTML = photoBox(photoOf(r.code), r.no) + '<div class="vsName">' + esc(r.no) + T('호', '') + (r.name ? ' · ' + esc(r.name) : '') + '<small>' + esc(flName(r.floor)) + '</small></div>' +
          (items.length > 1 ? '<div class="vsAlt"><span>' + T('다른 곳', 'Others') + '</span>' + items.map(function(x, i){ return '<button type="button" data-i="' + i + '" class="' + (i === cur ? 'pick' : '') + '">' + esc(x.no) + '</button>'; }).join('') + '</div>' : '');
        [].forEach.call(box.querySelectorAll('.vsAlt button'), function(b){ b.onclick = function(){ cur = +b.getAttribute('data-i'); paint(); }; });
      };
      paint();
      /* 「길안내 시작」 → 3D 전체 건물도를 거치지 않고 길안내 첫 화면(s6 · 1단계)으로 바로 (2026-11-10 사용자 :
         「3D 건물도 전체로 들어가라는 게 아니라 바로 길안내 시작한 후 첫 화면에 들어가지게」).
         목적지 · 출발 층은 앱의 openTarget 이 정하고(3D 화면도 뒤에서 준비만), 이어서 그 화면의 「길안내 시작」(startGuide)을 바로 누른다.
         둘이 한 번에 일어나서 3D 화면은 그려지지 않고, 지나온 화면 기록도 첫 화면 → 길안내(shell.js navRecord) — 뒤로 가면 첫 화면으로 돌아온다.
         엘리베이터 / 중앙계단은 길안내 화면 위 단추로 바꿀 수 있다. */
      card.querySelector('.vsGo').onclick = function(){
        closeAll();
        try{
          if(m.kind === 'toilet') openTarget({kind:'toilet', floor:m.floor}, m.floor);
          else { var r = items[cur]; openSearchHit({code:r.code, floor:r.floor}); }   // 검색해서 고른 것과 같다(최근 찾은 곳에도 남는다)
          if(typeof startGuide === 'function') startGuide();
        }catch(e){ console.warn('길안내를 시작하지 못했습니다', e); }
      };
    } else {
      orb.set('none');
      h += '<h4>' + (m.kind === 'nonum' ? T(esc(m.num) + '호는 3호관에 없어요', 'Room ' + esc(m.num) + ' is not in Bldg.3') : T('잘 알아듣지 못했어요', "Sorry, I didn't catch that")) + '</h4>' +
           '<div class="said">「' + esc(said) + '」</div>' +
           '<div class="vsName" style="font-size:15px;font-weight:700;margin-top:0">' + T('호실 번호(예 : 13524)나 교수님 성함(예 : 김현섭 교수님)으로 말해 주세요', 'Say a room number (e.g. 13524) or a professor name') + '</div>' +
           '<button class="vsAgain" type="button" style="margin-top:16px">' + T('다시 말하기', 'Say it again') + '</button>' +
           '<button class="vsText" type="button">' + T('글자로 찾기', 'Search by typing') + '</button>';
      card.innerHTML = h; card.classList.add('on');
      card.querySelector('.vsText').onclick = function(){ closeAll(); try{ plainStart(); }catch(e){} };
    }
    card.querySelector('.vsAgain').onclick = listen;
    card.querySelector('.x').onclick = closeAll;
  }

  btn.onclick = function(){ if(ACTIVE && REC){ try{ REC.stop(); }catch(e){} return; } listen(); };   // 듣는 중에 한 번 더 누르면 바로 끝낸다
  hint.onclick = function(){ listen(); };
  dim.onclick = closeAll;
  /* 휴대폰 뒤로가기 — 듣는 중이거나 확인 창이 떠 있으면 그것부터 닫는다 */
  if(typeof appBackStep === 'function'){
    var _b = appBackStep;
    window.appBackStep = function(){ if(ACTIVE || card.classList.contains('on')){ closeAll(); return true; } return _b.apply(this, arguments); };
  }
  /* 다른 화면으로 가면(☰ → 설정 등) 듣기 · 확인 창은 닫는다 */
  if(typeof go === 'function'){
    var _go = go;
    window.go = function(){
      if(ACTIVE || card.classList.contains('on')){ stopRec(); card.classList.remove('on'); setActive(false); }
      var r = _go.apply(this, arguments);
      tick();   // 화면이 바뀌는 그 순간 오브 · 말풍선도 따라 숨기거나 보인다(0.3초 기다리지 않게)
      return r;
    };
  }

  return { open:listen, close:closeAll, isOpen:function(){ return ACTIVE || card.classList.contains('on'); }, place:function(){ place(true); },
    /* 검사용 — 마이크 없이 화면만 */
    match:match, think:think, show:show,
    demo:function(said, inter){ card.classList.remove('on'); setActive(true); orb.set('listen'); orb.bump(.9);
      if(said || inter) bubble(esc(said || '') + (inter ? '<span class="int">' + esc(inter) + '</span>' : ''));
      else bubble('<span class="ask">' + T('가시고 싶은 목적지를 말씀해주세요', 'Tell me where you want to go') + '<i></i><i></i><i></i></span>'); } };
})();
