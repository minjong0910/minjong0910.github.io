/* 안전망 (tests/golden.js)
   ─────────────────────────────────────────────────────────────
   앱을 크게 고치기 전에, 지금 앱이 내는 결과를 전부 기록해 두고(capture),
   고친 앱을 같은 방법으로 돌려 기록과 한 글자·한 점까지 비교한다(compare).

   기록하는 것
     logic  : 모든 목적지 × 출발층의 길안내 문장(한/영), 152곳의 3D 위치·이름·층·접수 범위,
              관리자 장소 목록, 사진 설명, 층 배치, 길찾기 경로, 코드 읽기 함수
     photos : 앱에 들어 있는 사진 파일의 내용(바이트 지문) — 사진을 파일로 빼도 같은 사진인지
     dom    : 화면의 모든 id, 글자, 요소마다의 모양(계산된 CSS)
     shots  : 3D 화면 그림 — 목적지 3D 8장면, 층 상세 7층

   같은 결과가 나오게 하는 장치
     · 시계를 멈춘다 (performance.now · Date.now) — 반짝임·사람 표시가 시간에 따라 바뀌기 때문
     · 글꼴이 다 받아진 뒤 층 그림을 다시 짓는다 — 이름표가 글꼴에 따라 달라지기 때문
     · 카메라 각도·거리를 정해 두고 한 장면만 그린다
     · 서버(Firestore)에서 오는 사진은 빼고, 앱에 들어 있는 사진만 본다

   결과는 #OUT 에 JSON 한 줄로 쓰고 제목을 GOLDEN-OK / GOLDEN-FAIL 로 바꾼다 (run_golden.ps1 이 읽는다).
   capture 는 /api/save?dir=golden 으로 tests/golden/ 에 저장한다. */
(function(){
'use strict';
var Q = new URLSearchParams(location.search);
var MODE = Q.get('mode') || 'compare';
var APP  = Q.get('app') || '../site/index.html';
var TAG  = Q.get('tag') || 'base';
/* 비교할 부분 — 기본은 전부. GitHub 자동 검사(다른 컴퓨터)에서는 글꼴·그래픽이 달라
   글자 폭(dom.style)과 3D 그림(shots)이 점 단위로 같을 수 없어서 parts=ci 로 그 둘을 뺀다. */
var PARTS = (Q.get('parts') === 'ci') ? ['logic', 'photos', 'dom.ids', 'dom.text', 'dom.css', 'dyn']
          : ['logic', 'photos', 'dom.ids', 'dom.text', 'dom.style', 'dom.css', 'dyn', 'shots'];
function want(p){ return PARTS.indexOf(p) >= 0; }
var PIX_TOL = +(Q.get('pixtol') || 16);      // 한 점의 색이 이만큼(0~255) 넘게 달라야 '다른 점'
var PIX_MAX = +(Q.get('pixmax') || 0.002);   // 다른 점이 그림의 이 비율을 넘으면 실패
var R = document.getElementById('R'), F = document.getElementById('F');
var T_FIXED = 123456.789, D_FIXED = 1789570800000;

function log(t){ R.textContent += t + '\n'; }
function finish(res){
  document.getElementById('OUT').textContent = JSON.stringify(res);
  document.title = res.ok ? 'GOLDEN-OK' : 'GOLDEN-FAIL';
  log(res.ok ? '■ 통과' : '■ 실패 — ' + (res.error || (res.fails || []).join(', ')));
}
function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
function rnd(v){
  if(typeof v === 'number') return Math.round(v * 1e4) / 1e4;
  if(Array.isArray(v)) return v.map(rnd);
  if(v && typeof v === 'object'){ var o = {}; Object.keys(v).sort().forEach(function(k){ o[k] = rnd(v[k]); }); return o; }
  return v;
}
function up(c){ return String(c).toUpperCase(); }

/* ── 바이트 지문 (FNV-1a 32비트 두 개 + 길이) ── */
function fp(bytes){
  var h1 = 0x811c9dc5, h2 = 0x01000193 ^ 0x5bd1e995;
  for(var i = 0; i < bytes.length; i++){
    h1 ^= bytes[i]; h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= bytes[(bytes.length - 1 - i)]; h2 = Math.imul(h2, 0x01000193) >>> 0;
  }
  return bytes.length + ':' + h1.toString(16) + ':' + h2.toString(16);
}
function b64bytes(dataUrl){
  var b = atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), a = new Uint8Array(b.length);
  for(var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
  return a;
}
function photoBytes(w, u){
  if(/^data:/.test(u)) return Promise.resolve(b64bytes(u));
  return w.fetch(u).then(function(r){ return r.arrayBuffer(); }).then(function(b){ return new Uint8Array(b); });
}

/* ── 앱이 준비될 때까지 ── */
function waitApp(){
  return new Promise(function(resolve, reject){
    var t0 = Date.now();
    F.addEventListener('load', function tick(){
      (function poll(){
        var w = F.contentWindow;
        var ok = w && w.SUGAI && w.SUGAI.SCOPE && w.FLOOR_LAYOUT && w.FLOOR_LAYOUT[1]
                 && w.scene && w.renderer && typeof w.buildSteps === 'function' && typeof w.openTarget === 'function';
        /* AI 자료는 앱이 필요할 때만 받는다(site/ 부터) — 검사는 모든 장소를 봐야 하므로 직접 받게 한다 */
        if(ok && !w.AIVEC_DATA && w.SUGAI.ensureData) return w.SUGAI.ensureData().then(function(){ resolve(w); }, reject);
        if(ok && w.AIVEC_DATA && w.AIVEC_DATA.codes) return resolve(w);
        if(Date.now() - t0 > 120000) return reject(new Error('앱이 120초 안에 준비되지 않음'));
        setTimeout(poll, 300);
      })();
    }, {once:true});
    F.src = APP + (APP.indexOf('?') >= 0 ? '&' : '?') + 'golden=1';
  });
}

/* ── logic ── */
function stepList(w){
  return w.buildSteps().map(function(s){ return {a:s.a, type:s.type, tko:s.tko, ten:s.ten, ph:s.ph, code:s.code || null}; });
}
function captureLogic(w){
  var S = w.SUGAI, out = {};
  var seen = {}, codes = [];
  w.AIVEC_DATA.codes.forEach(function(c){ c = up(c); if(!seen[c]){ seen[c] = 1; codes.push(c); } });
  codes.sort(); out.codes = codes;
  out.place = {}; out.label = {}; out.scope = {}; out.floor = {}; out.adminFloor = {};
  codes.forEach(function(c){
    out.place[c] = rnd(w.place3D ? w.place3D(c) : null);
    out.label[c] = S.codeLabel(c);
    out.scope[c] = !!S.SCOPE.allow(c);
    var fg = S.floorGuess([{code:c, sim:1}]); out.floor[c] = fg ? fg.floor : null;
    out.adminFloor[c] = w.aidFloorOf ? w.aidFloorOf(c) : null;
  });
  out.known = (w.aidKnownCodes ? w.aidKnownCodes() : []).slice().sort();
  out.phLabel = rnd(w.PH_LABEL || null); out.phLabelEn = rnd(w.PH_LABEL_EN || null);
  out.phTargets = w.phTargets ? w.phTargets().map(function(t){ return {code:t.code, label:t.label, g:t.g, f:t.f}; }) : null;
  out.layout = {};
  for(var lv = 1; lv <= 5; lv++){
    var L = w.FLOOR_LAYOUT[lv];
    out.layout[lv] = rnd({top:L.topOuterZ, bot:L.bottomOuterZ, halfX:L.halfX, coreX:L.coreX, evZ:L.evZ, stZ:L.stZ,
      cells: L.cells.map(function(c){ return {code:c.code, parent:c.parent, label:c.label, x:c.x, z:c.z, w:c.w, d:c.d, s:c.searchable}; })});
  }
  out.roomTitle = {};
  for(lv = 1; lv <= 5; lv++) Object.keys(w.FLOOR_LAYOUT[lv].lookup).forEach(function(k){
    out.roomTitle[k] = w.roomTitle ? [w.roomTitle(k, 'ko'), w.roomTitle(k, 'en')] : null;
  });
  /* 길안내 : 목적지 × 출발층, 1층은 출입문(QR)마다도 */
  var targets = [];
  for(lv = 1; lv <= 5; lv++){
    Object.keys(w.FLOOR_LAYOUT[lv].lookup).forEach(function(k){ targets.push({kind:'room', floor:lv, code:k}); });
    targets.push({kind:'toilet', floor:lv}); targets.push({kind:'emstair', floor:lv});
  }
  targets.push({kind:'zone', floor:'B1'});
  var starts = ['B1', 1, 2, 3, 4, 5];
  var saveT = w.target, saveS = w.startFloor, saveGate = w.QRNAV && w.QRNAV.gate;
  out.steps = {};
  try {
    targets.forEach(function(t){
      starts.forEach(function(sf){
        w.target = JSON.parse(JSON.stringify(t)); w.startFloor = sf;
        if(w.QRNAV) w.QRNAV.gate = function(){ return null; };
        out.steps[t.kind + ':' + (t.code || t.floor) + '@' + sf] = stepList(w);
      });
      /* 문별 경로 — 어느 층이든 전부 기록한다(출발은 1층).
         2026-09-27 : 처음엔 1층 목적지만, 다음엔 지하만 더 담았는데, '동문 → 2층' 절차를
         새로 만들고 보니 그것도 안 담겨 있어 바뀌어도 아무도 몰랐다. 문별 안내를 층마다
         하나씩 정하는 중이므로, 처음부터 전부 담아 두는 편이 맞다. */
      if(w.QRNAV) ['MAIN', 'BACK', 'EAST', 'WEST'].forEach(function(g){
        w.target = JSON.parse(JSON.stringify(t)); w.startFloor = 1;
        w.QRNAV.gate = function(){ return g; };
        out.steps[t.kind + ':' + (t.code || t.floor) + '@1/' + g] = stepList(w);
      });
    });
  } finally { w.target = saveT; w.startFloor = saveS; if(w.QRNAV) w.QRNAV.gate = saveGate; }
  /* 길찾기 그래프 */
  if(w.NAVGRAPH){
    out.graph = {stats: w.NAVGRAPH.stats(), routes:{}};
    codes.forEach(function(c){
      var r = w.NAVGRAPH.route('GATE_MAIN', c), r2 = w.NAVGRAPH.route('GATE_MAIN', c, {noStairs:true});
      out.graph.routes[c] = rnd([r.ok ? r.path : r.why, r.ok ? r.cost : null, r2.ok ? r2.path.length : r2.why]);
    });
  }
  /* 이름 읽기 함수 */
  var names = ['13101_강의실.jpg', 'EMS3_01.jpg', 'ES3_01.jpg', 'LNG4 (2).jpg', 'ems5-x.png', 'HALL5L_a.jpg', 'B1_x.jpg', 'EV2.jpg', 'KTC_1.jpg', '13121-A.jpg'];
  out.phCodeOf = w.phCodeOf ? names.map(function(n){ return w.phCodeOf(n); }) : null;
  var notes = ['EMS2 사진', 'ES2', '라운지 LNG3', '3층 복도 왼쪽', '13310 앞', 'KTC 동아리방', '4층 엘리베이터'];
  out.aidCodeOfPart = w.aidCodeOfPart ? notes.map(function(n){ return w.aidCodeOfPart(n); }) : null;
  out.miniMap = w.aiMiniMapHtml ? codes.map(function(c){ return w.aiMiniMapHtml([{code:c, sim:1}], S.codeLabel).length; }) : null;
  return out;
}

/* ── photos : 앱에 들어 있는 사진 (서버 사진 제외) ── */
function localPhotoList(w){
  var el = w.document.getElementById('EMBEDDED_PHOTOS');
  if(el && el.textContent.trim()){
    var d = JSON.parse(el.textContent), list = [];
    Object.keys(d).sort().forEach(function(code){ (d[code] || []).forEach(function(p, i){ list.push({code:code, i:i, n:p.n, cap:p.cap || null, u:p.u}); }); });
    return Promise.resolve(list);
  }
  /* site/ 구조 : data/photos.js 가 window.PHOTO_INDEX 에 목록을 넣고, 사진은 파일(상대 주소)이다 */
  if(w.PHOTO_INDEX){
    var d2 = w.PHOTO_INDEX, list2 = [];
    Object.keys(d2).sort().forEach(function(code){ (d2[code] || []).forEach(function(p, i){ list2.push({code:code, i:i, n:p.n, cap:p.cap || null, u:p.u}); }); });
    return Promise.resolve(list2);
  }
  return Promise.resolve([]);
}
function capturePhotos(w){
  return localPhotoList(w).then(function(list){
    var out = [], k = 0;
    function next(){
      if(k >= list.length) return Promise.resolve(out);
      var p = list[k++];
      return photoBytes(w, p.u).then(function(b){ out.push({code:p.code, i:p.i, n:p.n, cap:p.cap, fp:fp(b)}); return next(); });
    }
    return next();
  });
}

/* ── dom : id · 글자 · 계산된 모양 ── */
var PROPS = ['display', 'position', 'color', 'background-color', 'font-size', 'font-weight', 'font-family', 'border-radius',
             'padding', 'margin', 'width', 'height', 'text-align', 'opacity', 'z-index', 'border-top', 'box-shadow', 'grid-template-columns', 'gap'];
function captureDom(w){
  var d = w.document, out = {ids:[], text:'', style:[]};
  d.querySelectorAll('[id]').forEach(function(e){ if(!e.closest('script,style')) out.ids.push(e.tagName.toLowerCase() + '#' + e.id); });
  out.ids.sort();
  /* 부팅 화면(.fx-boot)은 글자를 한 자씩 찍는 연출이라 찍힌 시점마다 글자 수·높이가 달라서 뺀다.
     (같은 앱을 두 번 돌려 확인한 유일한 흔들림 — 2단계에서 부팅 화면을 따로 고친다) */
  var SKIP = 'script,style,svg,canvas,iframe,template,.fx-boot';
  var clone = d.body.cloneNode(true);
  clone.querySelectorAll('script,style,template,.fx-boot').forEach(function(e){ e.remove(); });
  out.text = clone.textContent.replace(/\s+/g, ' ').trim();
  var all = d.body.querySelectorAll('*');
  for(var i = 0; i < all.length; i++){
    var e = all[i];
    if(e.closest(SKIP)) continue;
    if(e.id === 'EMBEDDED_PHOTOS') continue;
    var cs = w.getComputedStyle(e), row = [e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '')];
    PROPS.forEach(function(p){ row.push(cs.getPropertyValue(p)); });
    out.style.push(row.join('|'));
  }
  /* 앱의 CSS 규칙 전부 — 순서까지 (나중에 JS 가 만드는 화면의 모양은 위 '계산된 모양'으로는 못 잡는다.
     2026-09-22 관리자 지도 글자색을 바꾼 사본을 놓친 뒤 넣었다). 밖에서 받는 글꼴 CSS 는 읽을 수 없어 뺀다. */
  out.css = [];
  Array.prototype.forEach.call(d.styleSheets, function(sh){
    var rules; try { rules = sh.cssRules; } catch(e){ return; }
    if(!rules || (sh.href && sh.href.indexOf(w.location.origin) !== 0)) return;
    Array.prototype.forEach.call(rules, function(r){ out.css.push(r.cssText); });
  });
  return out;
}
/* JS 가 나중에 만드는 화면 — 관리자 AI 카드 · 길안내 단계 화면. 사진 주소는 방식이 바뀔 것이라 'IMG' 로 바꾼다 */
function normHtml(h){
  return String(h).replace(/src="[^"]*"/g, 'src="IMG"').replace(/url\((&quot;|'|")?[^)]*\)/g, 'url(IMG)').replace(/\s+/g, ' ').trim();
}
function captureDynamic(w){
  var out = {badge:{}, guide:{}};
  function mk(a){ return a.map(function(x){ return {code:x[0], sim:x[1]}; }); }
  var fakes = {
    corridor: {id:'gA', ai:{verdict:'uncertain', sim:0.41, margin:0.01, top:mk([['HALL4L',.41],['HALL5L',.40],['EV4',.39]]), all:mk([['HALL4L',.41],['HALL5L',.40],['EV4',.39],['LNG4',.385],['HALL3L',.38]]), side:{side:'L', sure:false}}},
    plate:    {id:'gB', ai:{verdict:'match', codeSource:'ocr', floorSource:'ocr', ocr:{floor:'3층', code:'13310', scene:'plate'}, sim:0.82, margin:0.2, top:mk([['13310',.82],['13311',.62],['13312',.58]])}},
    b1:       {id:'gC', ai:{verdict:'uncertain', sim:0.5, margin:0.05, top:mk([['B1',.5],['EVB1',.45],['BLD',.44]]), all:mk([['B1',.5],['EVB1',.45],['BLD',.44],['GATE_MAIN',.40],['EMS1',.39]])}},
    none:     {id:'gD', ai:null}
  };
  Object.keys(fakes).forEach(function(k){ out.badge[k] = w.SUGAI.adminBadge(fakes[k]); });
  var saveT = w.target, saveS = w.startFloor, saveGate = w.QRNAV && w.QRNAV.gate;
  /* 2026-09-27 : 출입문이 남아 있으면 안내 단계 수가 달라져 기록이 들쭉날쭉했다
     (emstair@4 · zone@2 가 2단계로 찍히는 일이 두 번 있었다). 위 captureLogic 처럼
     여기서도 '문 없음'으로 못박고, 끝나면 되돌린다. */
  if(w.QRNAV) w.QRNAV.gate = function(){ return null; };
  try {
    [[{kind:'room', floor:3, code:'13310'}, 1], [{kind:'emstair', floor:4}, 4], [{kind:'zone', floor:'B1'}, 2]].forEach(function(x){
      w.target = JSON.parse(JSON.stringify(x[0])); w.startFloor = x[1];
      w.startGuide();
      var el = w.document.getElementById('s6');
      out.guide[(x[0].code || x[0].kind) + '@' + x[1]] = normHtml(el ? el.innerHTML : '');
    });
  } finally {
    w.target = saveT; w.startFloor = saveS;
    if(w.QRNAV) w.QRNAV.gate = saveGate;
  }
  w.go('s1');
  return out;
}

/* ── shots : 3D 그림 ── */
function freezeTime(w){
  w.performance.now = function(){ return T_FIXED; };
  w.Date.now = function(){ return D_FIXED; };
}
function renderOnce(w, runFlag, loopFn){
  var raf = w.requestAnimationFrame;
  w.requestAnimationFrame = function(){ return 0; };
  try { w[runFlag] = true; w[loopFn](); } finally { w[runFlag] = false; w.requestAnimationFrame = raf; }
}
function shotS4(w, t, start){
  w.openTarget(JSON.parse(JSON.stringify(t)), t.floor);
  if(start !== undefined && start !== w.startFloor){
    var want = w.lvLabel(start), btn = null;
    w.document.querySelectorAll('#sfp button').forEach(function(b){ if(b.textContent === want) btn = b; });
    if(!btn) throw new Error('출발층 버튼 없음 : ' + want);
    btn.click();
  }
  w.animateRunning = false;
  w.spin = false; w.theta = 0.85; w.phi = 1.05;
  w.camera.fov = w.BASE_FOV; w.camera.updateProjectionMatrix();
  w.resize3D(true);
  renderOnce(w, 'animateRunning', 'animate');
  return w.renderer.domElement.toDataURL('image/png');
}
function shotS5(w, lv){
  w.showFloorDetail(lv);
  w.animateBRunning = false;
  if(w.resizeB) w.resizeB();
  renderOnce(w, 'animateBRunning', 'animateB');
  return w.rB.domElement.toDataURL('image/png');
}
var S4 = [
  ['s4_13310_from1', {kind:'room', floor:3, code:'13310'}, 1],
  ['s4_13524_from1', {kind:'room', floor:5, code:'13524'}, 1],
  ['s4_13101_from3', {kind:'room', floor:1, code:'13101'}, 3],
  ['s4_KTC_from1',   {kind:'room', floor:4, code:'KTC'}, 1],
  ['s4_13121_from2', {kind:'room', floor:1, code:'13121'}, 2],
  ['s4_toilet2',     {kind:'toilet', floor:1}, 2],
  ['s4_emstair4',    {kind:'emstair', floor:1}, 4],
  ['s4_zoneB1_from3',{kind:'zone', floor:'B1'}, 3]
];
var S5 = ['B1', 1, 2, 3, 4, 5, 'R'];
function captureShots(w){
  var shots = {};
  S4.forEach(function(s){ shots[s[0]] = shotS4(w, s[1], s[2]); });
  S5.forEach(function(lv){ shots['s5_' + lv] = shotS5(w, lv); });
  w.go('s1');
  return shots;
}

/* ── 비교 ── */
function diffObj(a, b, path, out, lim){
  if(out.length >= lim) return;
  if(a === b) return;
  var ta = Object.prototype.toString.call(a), tb = Object.prototype.toString.call(b);
  if(ta !== tb){ out.push(path + ' : ' + short(a) + ' → ' + short(b)); return; }
  if(Array.isArray(a)){
    if(a.length !== b.length) out.push(path + ' : 길이 ' + a.length + ' → ' + b.length);
    for(var i = 0; i < Math.min(a.length, b.length); i++) diffObj(a[i], b[i], path + '[' + i + ']', out, lim);
    return;
  }
  if(a && typeof a === 'object'){
    var ks = {}; Object.keys(a).forEach(function(k){ ks[k] = 1; }); Object.keys(b).forEach(function(k){ ks[k] = 1; });
    Object.keys(ks).sort().forEach(function(k){
      if(!(k in a)) out.push(path + '.' + k + ' : (없음) → ' + short(b[k]));
      else if(!(k in b)) out.push(path + '.' + k + ' : ' + short(a[k]) + ' → (없음)');
      else diffObj(a[k], b[k], path + '.' + k, out, lim);
    });
    return;
  }
  out.push(path + ' : ' + short(a) + ' → ' + short(b));
}
function short(v){ var s = JSON.stringify(v); return s && s.length > 140 ? s.slice(0, 140) + '…' : s; }
function imgData(src){
  return new Promise(function(res, rej){
    var im = new Image();
    im.onload = function(){
      var c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      var x = c.getContext('2d'); x.drawImage(im, 0, 0); res(x.getImageData(0, 0, im.width, im.height));
    };
    im.onerror = function(){ rej(new Error('그림을 못 읽음 : ' + String(src).slice(0, 60))); };
    im.src = src;
  });
}
function comparePix(refSrc, newSrc){
  return Promise.all([imgData(refSrc), imgData(newSrc)]).then(function(p){
    var a = p[0], b = p[1];
    if(a.width !== b.width || a.height !== b.height) return {ok:false, why:'크기 ' + a.width + 'x' + a.height + ' → ' + b.width + 'x' + b.height};
    var n = 0, max = 0;
    for(var i = 0; i < a.data.length; i += 4){
      var d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i+1] - b.data[i+1]), Math.abs(a.data[i+2] - b.data[i+2]));
      if(d > PIX_TOL) n++;
      if(d > max) max = d;
    }
    var ratio = n / (a.width * a.height);
    return {ok: ratio <= PIX_MAX, diff:n, ratio: Math.round(ratio * 1e5) / 1e5, max:max};
  });
}
function save(name, body){
  return fetch('/api/save?dir=golden&name=' + encodeURIComponent(name), {method:'POST', body: body})
    .then(function(r){ if(!r.ok) throw new Error('저장 실패 ' + name); return r.json(); });
}

/* ── 실행 ── */
function run(){
  var w, rec = {}, t0 = Date.now();
  log('앱 : ' + APP + ' · 방식 : ' + MODE + ' · 기록 이름 : ' + TAG);
  return waitApp().then(function(win){
    w = win;
    log('앱 준비됨 (' + Math.round((Date.now() - t0) / 1000) + '초)');
    return (w.document.fonts && w.document.fonts.ready) ? w.document.fonts.ready : null;
  }).then(function(){
    return sleep(1500);   /* 처음 화면(부팅 글자 등)이 자리를 잡을 시간 */
  }).then(function(){
    rec.dom = captureDom(w);          log('화면 : id ' + rec.dom.ids.length + '개 · 요소 ' + rec.dom.style.length + '개');
    freezeTime(w);
    if(w.rebuildAllFloors) w.rebuildAllFloors();   /* 글꼴이 다 받아진 뒤 이름표를 다시 그린다 */
    rec.logic = captureLogic(w);      log('길안내 : ' + Object.keys(rec.logic.steps).length + '가지 · 장소 ' + rec.logic.codes.length + '곳');
    rec.dyn = captureDynamic(w);      log('나중에 생기는 화면 : 관리자 카드 ' + Object.keys(rec.dyn.badge).length + ' · 길안내 화면 ' + Object.keys(rec.dyn.guide).length + ' · CSS 규칙 ' + rec.dom.css.length + '개');
    return capturePhotos(w);
  }).then(function(ph){
    rec.photos = ph;                  log('사진 : ' + ph.length + '장');
    rec.shots = (MODE === 'capture' || want('shots')) ? captureShots(w) : {};      log('3D 그림 : ' + Object.keys(rec.shots).length + '장');
    return MODE === 'capture' ? doCapture() : doCompare();
  }).catch(function(e){ finish({ok:false, error: e.message || String(e)}); });

  function doCapture(){
    var meta = {tag:TAG, app:APP, made:new Date(D_FIXED).toISOString(), realTime:new Date().toString(),
                logic:rec.logic, dyn:rec.dyn, photos:rec.photos, dom:rec.dom, shots:Object.keys(rec.shots)};
    var jobs = [save(TAG + '.json', JSON.stringify(meta))];
    Object.keys(rec.shots).forEach(function(k){ jobs.push(save(TAG + '_' + k + '.png', rec.shots[k])); });
    return Promise.all(jobs).then(function(){
      finish({ok:true, mode:'capture', tag:TAG, steps:Object.keys(rec.logic.steps).length, photos:rec.photos.length,
              ids:rec.dom.ids.length, elements:rec.dom.style.length, shots:Object.keys(rec.shots).length});
    });
  }
  function doCompare(){
    return fetch('golden/' + TAG + '.json', {cache:'no-store'}).then(function(r){
      if(!r.ok) throw new Error('기록 golden/' + TAG + '.json 이 없음');
      return r.json();
    }).then(function(ref){
      var res = {ok:true, mode:'compare', tag:TAG, app:APP, fails:[], detail:{}};
      function part(name, a, b, lim){
        var d = []; diffObj(a, b, name, d, lim || 40);
        res.detail[name] = d; if(d.length){ res.ok = false; res.fails.push(name + ' ' + d.length + (d.length >= (lim || 40) ? '+' : '') + '곳'); }
        log((d.length ? '✗ ' : '✓ ') + name + (d.length ? ' — ' + d.length + '곳 다름' : ''));
        d.slice(0, 8).forEach(function(x){ log('    ' + x); });
      }
      /* 목록은 순서대로 견주면 하나만 빠져도 뒤가 전부 밀려 보인다 → 빠진 것 / 생긴 것으로 알린다.
         (CSS 는 순서가 뜻을 가지므로 목록 비교에 더해 순서도 본다) */
      function partList(name, a, b, keepOrder){
        var ca = {}, cb = {}, d = [];
        a.forEach(function(x){ ca[x] = (ca[x] || 0) + 1; }); b.forEach(function(x){ cb[x] = (cb[x] || 0) + 1; });
        Object.keys(ca).forEach(function(x){ if((cb[x] || 0) < ca[x]) d.push('빠짐 : ' + short(x)); });
        Object.keys(cb).forEach(function(x){ if((ca[x] || 0) < cb[x]) d.push('생김 : ' + short(x)); });
        if(!d.length && keepOrder && JSON.stringify(a) !== JSON.stringify(b)) d.push('같은 규칙인데 순서가 바뀜');
        res.detail[name] = d; if(d.length){ res.ok = false; res.fails.push(name + ' ' + d.length + '곳'); }
        log((d.length ? '✗ ' : '✓ ') + name + (d.length ? ' — ' + d.length + '곳 다름' : ''));
        d.slice(0, 10).forEach(function(x){ log('    ' + x); });
      }
      if(want('logic')) part('logic', ref.logic, rec.logic, 60);
      if(want('photos')) part('photos', ref.photos, rec.photos);
      if(want('dom.ids')) partList('dom.ids', ref.dom.ids, rec.dom.ids);
      if(want('dom.text')) part('dom.text', ref.dom.text, rec.dom.text);
      if(want('dom.style')) partList('dom.style', ref.dom.style, rec.dom.style);
      if(want('dom.css')) partList('dom.css', ref.dom.css, rec.dom.css, true);
      if(want('dyn')) part('dyn', ref.dyn, rec.dyn);
      var names = want('shots') ? ref.shots : [], k = 0; res.detail.shots = {};
      function next(){
        if(k >= names.length) return Promise.resolve();
        var nm = names[k++];
        if(!rec.shots[nm]){ res.ok = false; res.fails.push('그림 ' + nm + ' 없음'); return next(); }
        return comparePix('golden/' + TAG + '_' + nm + '.png', rec.shots[nm]).then(function(c){
          res.detail.shots[nm] = c;
          if(!c.ok){ res.ok = false; res.fails.push('그림 ' + nm); }
          log((c.ok ? '✓ ' : '✗ ') + '그림 ' + nm + ' — ' + (c.why || ('다른 점 ' + c.diff + ' (' + (c.ratio * 100).toFixed(3) + '%) · 최대 ' + c.max)));
          return next();
        });
      }
      return next().then(function(){ finish(res); });
    });
  }
}
run();
})();
