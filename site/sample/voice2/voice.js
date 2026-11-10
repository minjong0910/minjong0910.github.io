/* 말로 찾기 견본 2 (2026-11-10 사용자) — 실제 앱 첫 화면(「공대 3호관 길안내」) 아래에 구슬(오브) 하나만.
   ① 한 번 누르면 구슬 위 말풍선 「가시고 싶은 목적지를 말씀해주세요」
   ② 말하는 동안 그 말이 말풍선에 그대로 써진다(구슬은 목소리에 맞춰 출렁인다)
   ③ 말이 끝나면 「찾으시는 목적지가 여기가 맞나요?」 + 그 장소 사진 + [길안내 시작] / 그 밑 [다시 말하기]
   이 파일은 견본 페이지(sample/voice2/index.html)가 실제 앱 안에 끼워 넣는다 — 실제 앱 파일은 건드리지 않는다.
   앱의 것을 그대로 쓴다 : 방 목록(VALID_FULL5 · ROOM_NAME · RFIX) · 장소 사진(SHARE.photoOf) · 길안내 시작(openSearchHit · openTarget).
   음성 인식은 바깥(견본 페이지, 맨 위 창)의 브라우저 기능으로 — 아이폰처럼 틀 안에서 마이크를 막는 브라우저가 있어서. */
(function(){
  if(window.__VS2) return; window.__VS2 = true;
  var D = document;
  function ko(){ return typeof LANG === 'undefined' || LANG !== 'en'; }
  function T(k, e){ return ko() ? k : e; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function phone(){ return D.querySelector('.phone') || D.body; }

  /* ── 모양 ── */
  var css = D.createElement('style'); css.id = 'vsStyle';
  css.textContent = [
    '.vsOrb{position:absolute;left:50%;bottom:calc(20px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:40;width:66px;height:66px;padding:0;border:0;border-radius:50%;cursor:pointer;',
    ' background:radial-gradient(circle at 50% 45%,#12324A 0%,#0A1622 62%,#060B12 100%);box-shadow:0 0 0 2px rgba(0,229,255,.45),0 0 26px rgba(0,229,255,.35);transition:transform .25s,box-shadow .25s;}',
    '.vsOrb canvas{width:66px;height:66px;display:block;border-radius:50%;}',
    '.vsOrb.on{z-index:96;transform:translateX(-50%) scale(1.22);box-shadow:0 0 0 2px rgba(0,229,255,.8),0 0 40px rgba(0,229,255,.55);}',
    '.vsOrb.hide{display:none;}',
    '.vsDim{position:absolute;inset:0;z-index:90;background:rgba(2,4,8,.58);opacity:0;pointer-events:none;transition:opacity .25s;}',
    '.vsDim.on{opacity:1;pointer-events:auto;}',
    '.vsBub{position:absolute;left:18px;right:18px;bottom:calc(122px + env(safe-area-inset-bottom));z-index:97;padding:16px 18px;border-radius:20px;',
    ' background:#101A26;border:2px solid #1FA9C9;color:#E7F6FF;text-align:center;font-size:19px;font-weight:800;line-height:1.4;word-break:keep-all;',
    ' box-shadow:0 10px 30px rgba(0,0,0,.45);opacity:0;transform:translateY(14px) scale(.96);transition:opacity .22s,transform .25s cubic-bezier(.2,.9,.3,1.2);pointer-events:none;}',
    '.vsBub.on{opacity:1;transform:none;}',
    '.vsBub:after{content:"";position:absolute;left:50%;bottom:-11px;width:18px;height:18px;margin-left:-9px;background:#101A26;border-right:2px solid #1FA9C9;border-bottom:2px solid #1FA9C9;transform:rotate(45deg);}',
    '.vsBub .ask{color:#9FEFFF;}',
    '.vsBub .ask i{display:inline-block;width:6px;height:6px;margin-left:4px;border-radius:50%;background:#00E5FF;animation:vsDot 1.2s infinite;}',
    '.vsBub .ask i:nth-child(2){animation-delay:.2s;} .vsBub .ask i:nth-child(3){animation-delay:.4s;}',
    '@keyframes vsDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}',
    '.vsBub .int{color:#7F93A8;}',
    '.vsBub small{display:block;margin-top:6px;font-size:13px;font-weight:700;color:#7F93A8;}',
    '.vsBub.warn{border-color:#FF9A5C;} .vsBub.warn:after{border-color:#FF9A5C;}',
    '.vsCard{position:absolute;left:0;right:0;bottom:0;z-index:98;background:#101722;border-top:3px solid #1FA9C9;border-radius:24px 24px 0 0;color:#E7F6FF;',
    ' padding:12px 18px calc(18px + env(safe-area-inset-bottom));transform:translateY(105%);transition:transform .32s cubic-bezier(.2,.9,.3,1.05);max-height:94%;overflow:auto;text-align:center;}',
    '.vsCard.on{transform:none;}',
    '.vsCard .grab{width:44px;height:5px;border-radius:9px;background:#33404F;margin:0 auto 10px;}',
    '.vsCard .x{position:absolute;right:12px;top:10px;width:40px;height:40px;border:0;border-radius:50%;background:rgba(255,255,255,.06);color:#9FB2C8;font-size:20px;cursor:pointer;}',
    '.vsCard h4{margin:4px 0 12px;font-size:20px;font-weight:900;letter-spacing:-.02em;}',
    '.vsCard .said{margin:-6px 0 12px;color:#7F93A8;font-size:13px;font-weight:700;}',
    '.vsPh{position:relative;width:100%;aspect-ratio:4/3;border-radius:16px;overflow:hidden;background:#0B1118;border:1px solid #1F2A38;}',
    '.vsPh .bg{position:absolute;inset:-20px;background-size:cover;background-position:center;filter:blur(18px) brightness(.55);}',
    '.vsPh img{position:relative;width:100%;height:100%;object-fit:contain;display:block;}',
    '.vsPh .none{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#9FB2C8;font-weight:800;}',
    '.vsPh .none b{font-size:34px;color:#E7F6FF;}',
    '.vsName{margin-top:12px;font-size:22px;font-weight:900;}',
    '.vsName small{display:block;margin-top:2px;font-size:14px;font-weight:700;color:#9FB2C8;}',
    '.vsAlt{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:10px;}',
    '.vsAlt span{font-size:12px;font-weight:800;color:#7F93A8;align-self:center;}',
    '.vsAlt button{border:1.5px solid #2A6F86;background:rgba(0,229,255,.07);color:#CFEFFF;border-radius:99px;padding:6px 11px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;}',
    '.vsAlt button.pick{border-color:#00E5FF;background:rgba(0,229,255,.2);color:#fff;}',
    '.vsGo{display:block;width:100%;margin-top:14px;padding:16px;border:0;border-radius:14px;font:inherit;font-size:18px;font-weight:900;color:#0B0F16;cursor:pointer;background:linear-gradient(90deg,#00E5FF,#7C5CFF);}',
    '.vsAgain{display:block;width:100%;margin-top:10px;padding:14px;border:2px solid #00E5FF;border-radius:14px;font:inherit;font-size:16px;font-weight:800;color:#00E5FF;background:transparent;cursor:pointer;}',
    '.vsText{display:block;width:100%;margin-top:8px;padding:10px;border:0;background:none;color:#7F93A8;font:inherit;font-size:13px;font-weight:700;text-decoration:underline;cursor:pointer;}'
  ].join('\n');
  D.head.appendChild(css);

  /* ── 구슬(오브) : 점으로 된 공 — 견본 1(sample/voice)과 같은 그림 ── */
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

  /* ── 붙이기 ── */
  var btn = D.createElement('button'); btn.type = 'button'; btn.className = 'vsOrb'; btn.setAttribute('aria-label', T('말로 목적지 찾기', 'Find by voice'));
  btn.innerHTML = '<canvas width="132" height="132"></canvas>';
  var dim = D.createElement('div'); dim.className = 'vsDim';
  var bub = D.createElement('div'); bub.className = 'vsBub'; bub.setAttribute('aria-live', 'polite');
  var card = D.createElement('div'); card.className = 'vsCard'; card.setAttribute('role', 'dialog');
  var ph = phone(); ph.appendChild(dim); ph.appendChild(bub); ph.appendChild(card); ph.appendChild(btn);
  var orb = Orb(btn.querySelector('canvas'), 140, 2.4, .4);
  (function loop(now){ if(!btn.classList.contains('hide')) orb.draw(now); requestAnimationFrame(loop); })(performance.now());

  /* 첫 화면에서만 보인다 — 동의 화면 · 켜는 화면 · 「처음이세요?」 · 다른 창이 떠 있으면 숨는다 */
  setInterval(function(){
    var s1 = D.getElementById('s1');
    var home = s1 && s1.classList.contains('on');
    var cover = D.querySelector('.syAgree, .ezAsk, .phone > .sySheet, .syDoc, .syHome, #pwaSheet') || (typeof appBooted !== 'undefined' && !appBooted);
    var show = (home && !cover) || ACTIVE;
    btn.classList.toggle('hide', !show);
  }, 300);

  /* ── 말 → 목적지 (견본 1과 같은 규칙, 방 목록은 앱의 것) ── */
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
    if(!on){ bub.classList.remove('on'); orb.set('idle'); }
  }
  function stopRec(){ clearTimeout(timer); if(REC){ try{ REC.onend = null; REC.onerror = null; REC.abort(); }catch(e){} REC = null; } }
  function closeAll(){ stopRec(); card.classList.remove('on'); setActive(false); }
  function listen(){
    card.classList.remove('on'); stopRec(); setActive(true);
    finalTxt = ''; alts = []; lastLen = 0; errMsg = '';
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
      bubble((errMsg || T('잘 안 들렸어요', "I couldn't hear you")) + '<small>' + T('구슬을 다시 누르고 말해 주세요 · 화면을 누르면 닫혀요', 'Tap the orb and try again · tap to close') + '</small>', true);
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
    bub.classList.remove('on');
    var h = '<div class="grab"></div><button class="x" type="button" aria-label="' + T('닫기', 'Close') + '">✕</button>';
    if(m.kind === 'room' || m.kind === 'toilet'){
      orb.set('done');
      h += '<h4>' + T('찾으시는 목적지가 여기가 맞나요?', 'Is this where you want to go?') + '</h4>' +
           '<div class="said">「' + esc(said) + '」</div><div id="vsPick"></div>' +
           '<button class="vsGo" type="button">' + T('길안내 시작', 'Start directions') + '</button>' +
           '<button class="vsAgain" type="button">' + T('다시 말하기', 'Say it again') + '</button>';
      card.innerHTML = h; card.classList.add('on');
      var cur = 0, items = m.items || [];
      function paint(){
        var box = card.querySelector('#vsPick');
        if(m.kind === 'toilet'){
          box.innerHTML = photoBox(photoOf('WC' + m.floor), 'WC') + '<div class="vsName">' + flName(m.floor) + ' ' + T('화장실', 'restroom') + '<small>' + T('「3층 화장실」처럼 층도 말할 수 있어요', 'You can say the floor too') + '</small></div>';
          return;
        }
        var r = items[cur];
        box.innerHTML = photoBox(photoOf(r.code), r.no) + '<div class="vsName">' + esc(r.no) + T('호', '') + (r.name ? ' · ' + esc(r.name) : '') + '<small>' + flName(r.floor) + '</small></div>' +
          (items.length > 1 ? '<div class="vsAlt"><span>' + T('다른 곳', 'Others') + '</span>' + items.map(function(x, i){ return '<button type="button" data-i="' + i + '" class="' + (i === cur ? 'pick' : '') + '">' + esc(x.no) + '</button>'; }).join('') + '</div>' : '');
        [].forEach.call(box.querySelectorAll('.vsAlt button'), function(b){ b.onclick = function(){ cur = +b.getAttribute('data-i'); paint(); }; });
      }
      paint();
      card.querySelector('.vsGo').onclick = function(){
        closeAll();
        if(m.kind === 'toilet'){ try{ openTarget({kind:'toilet', floor:m.floor}, m.floor); }catch(e){} return; }
        var r = items[cur];
        try{ openSearchHit({code:r.code, floor:r.floor}); }catch(e){}   // 검색해서 고른 것과 똑같이 — 엘리베이터/중앙계단 고르기 → 3D 길안내
      };
    } else {
      orb.set('none');
      h += '<h4>' + (m.kind === 'nonum' ? T(m.num + '호는 3호관에 없어요', 'Room ' + m.num + ' is not in Bldg.3') : T('잘 알아듣지 못했어요', "Sorry, I didn't catch that")) + '</h4>' +
           '<div class="said">「' + esc(said) + '」</div>' +
           '<div class="vsName" style="font-size:15px;font-weight:700;color:#9FB2C8;margin-top:0">' + T('호실 번호(예 : 13524)나 교수님 성함(예 : 김현섭 교수님)으로 말해 주세요', 'Say a room number (e.g. 13524) or a professor name') + '</div>' +
           '<button class="vsAgain" type="button" style="margin-top:16px">' + T('다시 말하기', 'Say it again') + '</button>' +
           '<button class="vsText" type="button">' + T('글자로 찾기', 'Search by typing') + '</button>';
      card.innerHTML = h; card.classList.add('on');
      card.querySelector('.vsText').onclick = function(){ closeAll(); try{ plainStart(); }catch(e){} };
    }
    card.querySelector('.vsAgain').onclick = listen;
    card.querySelector('.x').onclick = closeAll;
  }

  btn.onclick = function(){ if(ACTIVE && REC){ try{ REC.stop(); }catch(e){} return; } listen(); };   // 듣는 중에 한 번 더 누르면 바로 끝낸다
  dim.onclick = closeAll;
  /* 휴대폰 뒤로가기 — 듣는 중이거나 확인 창이 떠 있으면 그것부터 닫는다 */
  if(typeof appBackStep === 'function'){
    var _b = appBackStep;
    window.appBackStep = function(){ if(ACTIVE || card.classList.contains('on')){ closeAll(); return true; } return _b.apply(this, arguments); };
  }
  window.__VS2API = {match:match, think:think, show:show, listen:listen, closeAll:closeAll,                                   // 검사용
    demo:function(said, inter){ card.classList.remove('on'); setActive(true); orb.set('listen'); orb.bump(.9);
      if(said || inter) bubble(esc(said || '') + (inter ? '<span class="int">' + esc(inter) + '</span>' : ''));
      else bubble('<span class="ask">' + T('가시고 싶은 목적지를 말씀해주세요', 'Tell me where you want to go') + '<i></i><i></i><i></i></span>'); }};
})();
