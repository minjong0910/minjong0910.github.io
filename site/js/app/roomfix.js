"use strict";
/* roomfix.js — 「구성 및 변경」 : 관리자가 층 지도에서 방을 눌러 번호·이름·영어 이름·메모를 고친다 (2026-10-18 사용자 요청)

   · 고친 내용은 서버 rooms/{방 코드} 에 있다(누구나 읽고 관리자만 씀 — 서버/firestore.rules).
     모든 폰이 앱을 열면 받아서 이 폰에 저장해 두고(인터넷 없이도), 사진 이름에서 나온 ROOM_NAME 위에 덮어쓴다.
   · 번호는 「화면에 보이는 번호」만 바꾼다. 앱 안에서 쓰는 원래 번호(사진·AI·길안내·즐겨찾기 열쇠)는 그대로라
     옛 번호로도 검색된다. 보이는 번호 = dispNo(코드).
   · 메모는 적은 방에만 회색 한 줄로 보인다(비우면 아무 데도 안 보임). 보여 줄 곳은 방마다 고른다 —
     s 검색 결과 · d 3D 화면(제목 아래) · a 도착 화면(방 이름 아래). 크리에이티브 존은 열쇠 'ZONE'(메모만).
   · 층 버튼은 지하 1층 ~ 5층. 옥상은 고칠 방이 없어 뺐다 (사용자). */
var RFIX = (function(){
  var KEY = 'b3nav_rooms';
  var FLOORS = ['B1', 1, 2, 3, 4, 5];
  var MAP = {};          // 코드 → {no, name, en, memo, show:{s,d,a}, ts}
  var ORIG = {};         // 코드 → 덮어쓰기 전 이름 (없던 이름은 null)
  var EN_ADDED = {};     // ROOM_NAME_EN 에 이 파일이 넣은 「한글 이름 → 영어」 (원래 있던 짝은 건드리지 않는다)
  var NO2CODE = {};      // 바꾼 번호 → 원래 코드

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function lsGet(){ try{ return JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){ return null; } }
  function lsSet(m){ try{ localStorage.setItem(KEY, JSON.stringify(m)); }catch(e){} }
  /* 서버에서 받은 것과 지금 것이 같은지 — 칸 순서가 달라도 같게 본다 */
  function norm(v){
    if(!v || typeof v !== 'object') return v;
    var o = {}; Object.keys(v).sort().forEach(function(k){ o[k] = norm(v[k]); }); return o;
  }
  function same(a, b){ return JSON.stringify(norm(a || {})) === JSON.stringify(norm(b || {})); }

  /* ── 덮어쓰기 : 먼저 지난번 것을 되돌리고 새로 얹는다 ── */
  function apply(m){
    Object.keys(ORIG).forEach(function(c){ if(ORIG[c] === null) delete ROOM_NAME[c]; else ROOM_NAME[c] = ORIG[c]; });
    Object.keys(EN_ADDED).forEach(function(k){ if(ROOM_NAME_EN[k] === EN_ADDED[k]) delete ROOM_NAME_EN[k]; });
    ORIG = {}; EN_ADDED = {}; NO2CODE = {};
    MAP = (m && typeof m === 'object') ? m : {};
    /* 이름은 화면 여러 곳에서 HTML 로 들어간다 — 서버 값에 꺾쇠 같은 글자가 섞여도 화면이 깨지지 않게 걸러 둔다 */
    function clean(s, n){ return String(s == null ? '' : s).replace(/[<>&"'`]/g, '').trim().slice(0, n); }
    Object.keys(MAP).forEach(function(c){
      var f = MAP[c] = (MAP[c] && typeof MAP[c] === 'object') ? MAP[c] : {};
      if(f.name) f.name = clean(f.name, 40);
      if(f.en) f.en = clean(f.en, 60);
      if(f.no) f.no = /^\d{5}$/.test(String(f.no)) ? String(f.no) : '';
      if(f.memo) f.memo = String(f.memo).slice(0, 80);
      if(f.name){ ORIG[c] = Object.prototype.hasOwnProperty.call(ROOM_NAME, c) ? ROOM_NAME[c] : null; ROOM_NAME[c] = f.name; }
      if(f.name && f.en && !ROOM_NAME_EN[f.name]){ ROOM_NAME_EN[f.name] = f.en; EN_ADDED[f.name] = f.en; }
      if(f.no && /^\d{5}$/.test(c)) NO2CODE[f.no] = c;
    });
  }
  function origName(c){ return Object.prototype.hasOwnProperty.call(ORIG, c) ? ORIG[c] : (ROOM_NAME[c] || null); }

  function dispNo(code){
    var s = String(code == null ? '' : code), m = s.match(/^(\d{5})(.*)$/);
    if(!m) return s;
    var f = MAP[m[1]];
    return (f && f.no) ? (f.no + m[2]) : s;
  }
  function codeOfNo(no){ return NO2CODE[no] || null; }
  /* 메모 — where : 's' 검색 결과 · 'd' 3D 화면 · 'a' 도착 화면 */
  function memo(code, where){
    var f = MAP[code]; if(!f || !f.memo) return '';
    if(where && f.show && f.show[where] === false) return '';
    return f.memo;
  }
  function memoHtml(code, where, cls){
    var t = memo(code, where);
    return t ? '<span class="rfMemo' + (cls ? ' ' + cls : '') + '">🕓 ' + esc(t) + '</span>' : '';
  }
  function keyOfTarget(t){
    if(!t) return '';
    if(t.kind === 'zone') return 'ZONE';
    if(t.kind === 'room') return String(t.code || '').split('-')[0];
    return '';
  }
  /* 3D 화면(제목 아래)·도착 화면(방 이름 아래)의 메모 한 줄 */
  function paintLine(anchorId, lineId, where){
    var a = $(anchorId); if(!a) return;
    var el = $(lineId);
    var t = (typeof target !== 'undefined') ? memo(keyOfTarget(target), where) : '';
    if(!t){ if(el) el.remove(); return; }
    if(!el){ el = document.createElement('div'); el.id = lineId; el.className = 'rfMemo ' + lineId; }
    el.textContent = '🕓 ' + t;
    if(a.nextSibling !== el) a.parentNode.insertBefore(el, a.nextSibling);
  }
  function paint4(){ var bar = document.querySelector('#s4 > .bar'); if(bar && !bar.id) bar.id = 's4bar'; paintLine('s4bar', 't4memo', 'd'); }
  function paint7(){ paintLine('t7', 't7memo', 'a'); }

  /* 바뀐 것을 화면에 — 3D 는 그릴 때마다 ROOM_NAME 을 새로 읽으므로 따로 할 일이 없다 */
  function afterChange(){
    var s3 = $('s3'), nq = $('nq');
    if(s3 && s3.classList.contains('on') && nq && nq.value && typeof roomSearch === 'function') roomSearch(nq.value);
    if($('cats') && typeof buildCats === 'function') buildCats();
    if(typeof renderRecent === 'function' && $('recentList')) renderRecent();
  }

  /* 앱이 켜질 때 : 이 폰에 저장해 둔 것을 곧바로 얹고(인터넷 없이도), 조금 뒤 서버에서 새로 받는다 */
  apply(lsGet() || {});
  function refresh(){
    if(typeof SUGDB === 'undefined' || !SUGDB.roomsRest) return Promise.resolve(false);
    return SUGDB.roomsRest().then(function(m){
      if(same(m, MAP)) return false;
      lsSet(m); apply(m); afterChange(); return true;
    })['catch'](function(){ return false; });   // 규칙이 아직 옛것(읽기 거절)·인터넷 없음 → 저장해 둔 것 그대로
  }
  if(location.protocol === 'http:' || location.protocol === 'https:') setTimeout(refresh, 2500);

  /* ══════════ 관리자 : 구성 및 변경 화면 (층 상세 5번 화면을 고치는 모드로 빌려 쓴다) ══════════ */
  var editing = false, saved = null, curLv = 1, selKey = '', selMeshes = [], built = false, listOn = false;
  var show = {s:true, d:true, a:true};

  function lvTitle(lv){ return lv === 'B1' ? '지하 1층' : lv + '층'; }
  function nameLine(key){
    if(key === 'ZONE') return '지하 1층 · 크리에이티브 존';
    var nm = ROOM_NAME[key] || '';
    return /^\d{5}$/.test(key) ? (dispNo(key) + '호' + (nm ? ' · ' + nm : '')) : (key + (nm ? ' ' + nm : ''));
  }
  function build(){
    if(built) return;
    built = true;
    var s5 = $('s5'), cv = $('cfd');
    var top = document.createElement('div'); top.className = 'rfOnly rfTop';
    top.innerHTML = '<div class="rfFloors" id="rfFloors"></div>' +
      '<button class="rfListBtn" id="rfListBtn" onclick="RFIX.toggleList()"></button>';
    s5.insertBefore(top, cv);
    var hint = document.createElement('div'); hint.className = 'rfOnly rfHint'; hint.id = 'rfHint';
    hint.textContent = '👆 바꿀 방을 지도에서 누르세요';
    var panel = document.createElement('div'); panel.className = 'rfOnly rfPanel'; panel.id = 'rfPanel';
    var list = document.createElement('div'); list.className = 'rfOnly rfList'; list.id = 'rfList';
    var after = cv.nextSibling;
    s5.insertBefore(hint, after); s5.insertBefore(panel, after); s5.insertBefore(list, after);
    /* 지도에서 방 누르기 — 끌어서 옮기는 것과 구별(10px 안, 0.7초 안에 뗀 것만) */
    var down = null;
    cv.addEventListener('pointerdown', function(e){ down = {x:e.clientX, y:e.clientY, t:Date.now()}; });
    cv.addEventListener('pointerup', function(e){
      var d = down; down = null;
      if(!editing || !d || listOn) return;
      if(Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || Date.now() - d.t > 700) return;
      pick(e.clientX, e.clientY);
    });
  }
  function paintFloors(){
    var box = $('rfFloors'); if(!box) return;
    box.innerHTML = '';
    FLOORS.forEach(function(lv){
      var b = document.createElement('button');
      b.textContent = lvLabel(lv);
      if(lv === curLv) b.className = 'on';
      b.onclick = function(){ floor(lv); };
      box.appendChild(b);
    });
    var lb = $('rfListBtn'), n = Object.keys(MAP).length;
    if(lb) lb.textContent = listOn ? '🗺 지도로' : ('📝 바꾼 방 목록' + (n ? ' (' + n + ')' : ''));
  }
  function title(){
    var t = $('t5'); if(t) t.textContent = listOn ? '바꾼 방 목록' : ('구성 및 변경 · ' + lvTitle(curLv));
  }
  function relayout(){ requestAnimationFrame(function(){ if(typeof resizeB === 'function') resizeB(); }); }

  function enter(){
    build();
    if(!editing){
      saved = {target:(typeof target !== 'undefined') ? target : null, curFloor:(typeof curFloor !== 'undefined') ? curFloor : undefined};
      target = null;
      editing = true;
    }
    listOn = false;
    $('s5').classList.add('rfEdit');
    $('s5').classList.remove('rfListOn');
    floor(curLv);
    /* 관리자는 서버의 최신 목록으로 (다른 관리자가 고친 것까지) */
    if(typeof SUGDB !== 'undefined' && SUGDB.roomsSdk){
      SUGDB.roomsSdk().then(function(m){
        if(!same(m, MAP)){ lsSet(m); apply(m); afterChange(); }
        paintFloors(); if(listOn) renderList();
      })['catch'](function(){});
    }
  }
  function exit(){
    if(!editing) return;
    editing = false; listOn = false;
    unselect();
    var s5 = $('s5'); s5.classList.remove('rfEdit', 'rfOpen', 'rfListOn');
    var p = $('rfPanel'); if(p) p.innerHTML = '';
    if(saved){ target = saved.target; if(saved.curFloor !== undefined) curFloor = saved.curFloor; }
    saved = null;
    go('sph');
  }
  function floor(lv){
    curLv = lv;
    close();
    showFloorDetail(lv);
    title(); paintFloors();
    $('s5').scrollTop = 0;
    relayout();
  }

  function pick(x, y){
    if(typeof groupB === 'undefined' || !groupB || typeof cB === 'undefined') return;
    var cv = $('cfd'), r = cv.getBoundingClientRect();
    var ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    cB.updateMatrixWorld(); groupB.updateMatrixWorld(true);
    var rc = new THREE.Raycaster(); rc.setFromCamera(ndc, cB);
    var cands = groupB.children.filter(function(o){ return o.isMesh && o.userData && (o.userData.code || o.userData.zone); });
    var hit = rc.intersectObjects(cands, false)[0];
    if(!hit) return;
    var ud = hit.object.userData;
    open(ud.zone ? 'ZONE' : String(ud.parent || ud.code));
  }
  /* 고르는 방을 하늘색으로 — 나뉜 방(13121-A·B)은 두 칸 다 */
  function unselect(){
    selMeshes.forEach(function(x){ if(x.m.material && x.m.material.color) x.m.material.color.setHex(x.c); });
    selMeshes = [];
  }
  function select(key){
    unselect();
    if(typeof groupB === 'undefined' || !groupB) return;
    groupB.children.forEach(function(o){
      if(!o.isMesh || !o.userData || !o.material || !o.material.color) return;
      var k = o.userData.zone ? 'ZONE' : String(o.userData.parent || o.userData.code || '');
      if(k && k === key){ selMeshes.push({m:o, c:o.material.color.getHex()}); o.material.color.setHex(0x00E5FF); }
    });
  }
  function chips(){
    var lab = selKey === 'ZONE' ? {s:'고르는 화면', d:'3D 화면', a:'도착 화면'} : {s:'검색 결과', d:'3D 화면', a:'도착 화면'};
    return ['s', 'd', 'a'].map(function(k){
      return '<button type="button" class="rfChip' + (show[k] ? ' on' : '') + '" data-k="' + k + '" onclick="RFIX.chip(this)"><span class="bx"></span>' + lab[k] + '</button>';
    }).join('');
  }
  function open(key){
    selKey = key; select(key);
    var f = MAP[key] || {}, isNo = /^\d{5}$/.test(key), isZone = (key === 'ZONE');
    show = {s:true, d:true, a:true};
    if(f.show) ['s', 'd', 'a'].forEach(function(k){ if(f.show[k] === false) show[k] = false; });
    var p = $('rfPanel');
    p.innerHTML =
      '<div class="rfHead"><b>' + esc(nameLine(key)) + '</b><button class="rfX" aria-label="닫기" onclick="RFIX.close()">✕</button></div>' +
      (isZone ? '' :
        '<div class="rfRow">' +
          (isNo ? '<label class="rfL rfNoL">새 번호<input id="rfNo" inputmode="numeric" maxlength="5" autocomplete="off" value="' + esc(dispNo(key)) + '"></label>' : '') +
          '<label class="rfL">새 이름<input id="rfName" maxlength="40" autocomplete="off" value="' + esc(ROOM_NAME[key] || '') + '" placeholder="' + esc(origName(key) || '이름 없음') + '"></label>' +
        '</div>' +
        '<label class="rfL">영어 이름<input id="rfEn" maxlength="60" autocomplete="off" value="' + esc(f.en || '') + '" placeholder="비우면 한글 이름 그대로"></label>') +
      '<div class="rfErr" id="rfErr"></div>' +
      '<label class="rfL">메모 (운영 시간 · 면담 시간 · 알림 등)<input id="rfMemoIn" maxlength="80" autocomplete="off" value="' + esc(f.memo || '') + '" placeholder="없으면 비워 두세요"></label>' +
      '<div class="rfL">메모를 보여 줄 곳</div><div class="rfChips" id="rfChips">' + chips() + '</div>' +
      '<div class="rfTip">💡 메모를 비워 두면 아무 데도 안 보여요 — 필요한 방에만 적으세요</div>' +
      '<div class="rfBtns">' + (MAP[key] ? '<button class="big ghost" onclick="RFIX.undo()">↺ 원래대로</button>' : '') +
        '<button class="big" id="rfSave" onclick="RFIX.save()">저장</button></div>';
    p.querySelectorAll('input').forEach(function(inp){
      inp.addEventListener('focus', function(){ setTimeout(function(){ inp.scrollIntoView({block:'center', behavior:'smooth'}); }, 350); });
      inp.addEventListener('input', function(){ var er = $('rfErr'); if(er) er.textContent = ''; if(inp.id === 'rfNo') inp.classList.remove('bad'); });
    });
    $('s5').classList.add('rfOpen');
    relayout();
    setTimeout(function(){ p.scrollIntoView({block:'nearest', behavior:'smooth'}); }, 60);
  }
  function close(){
    unselect(); selKey = '';
    var p = $('rfPanel'); if(p) p.innerHTML = '';
    var s5 = $('s5'); if(s5) s5.classList.remove('rfOpen');
    relayout();
  }
  function chip(b){ var k = b.getAttribute('data-k'); show[k] = !show[k]; b.classList.toggle('on', show[k]); }

  function err(msg){ var e = $('rfErr'); if(e) e.textContent = msg; }
  /* 저장할 내용 만들기 — 원래와 같은 칸은 넣지 않는다. 아무것도 안 남으면 null(= 원래대로) */
  function collect(key){
    var d = {}, v;
    var noEl = $('rfNo'), nmEl = $('rfName'), enEl = $('rfEn'), mmEl = $('rfMemoIn');
    if(noEl){
      v = noEl.value.trim();
      if(v && v !== key){
        if(!/^\d{5}$/.test(v)){ noEl.classList.add('bad'); err('⚠ 번호는 숫자 5자리로 넣어 주세요'); return false; }
        var taken = (typeof VALID_FULL5 !== 'undefined' && VALID_FULL5[v]) || (NO2CODE[v] && NO2CODE[v] !== key);
        if(taken){ noEl.classList.add('bad'); err('⚠ ' + v + '호는 이미 있어요 — 다른 번호를 넣어 주세요'); return false; }
        d.no = v;
      }
    }
    if(nmEl){ v = nmEl.value.replace(/[<>&"'`]/g, '').trim(); if(v && v !== origName(key)) d.name = v; }
    if(enEl){ v = enEl.value.replace(/[<>&"'`]/g, '').trim(); if(v) d.en = v; }
    v = mmEl ? mmEl.value.trim() : '';
    if(v){ d.memo = v; d.show = {s:!!show.s, d:!!show.d, a:!!show.a}; }
    if(d.en && !d.name){
      /* 이름은 그대로 두고 영어만 붙이는 경우 — 원래 한글 이름에 짝을 지어 준다 */
      if(!origName(key)){ err('⚠ 영어 이름을 쓰려면 한글 이름도 넣어 주세요'); return false; }
      d.name = origName(key);
    }
    if(!Object.keys(d).length) return null;
    d.ts = Date.now();
    return d;
  }
  function describe(key, before, after){
    var out = [];
    var b = before || {}, a = after || {};
    var on = origName(key) || '이름 없음';
    if((b.no || '') !== (a.no || '')) out.push('번호 ' + (b.no || key) + ' → ' + (a.no || key));
    if((b.name || on) !== (a.name || on)) out.push((b.name || on) + ' → ' + (a.name || on));
    if((b.en || '') !== (a.en || '')) out.push('영어 ' + (a.en || '(없음)'));
    if((b.memo || '') !== (a.memo || '')) out.push(a.memo ? '메모 「' + a.memo + '」' : '메모 지움');
    return out.length ? out.join('<br>') : '바뀐 것 없음';
  }
  function write(key, data){
    var btn = $('rfSave'); if(btn) btn.disabled = true;
    var before = MAP[key] || null;
    if(typeof SUGDB === 'undefined' || !SUGDB.saveRoom){ err('⚠ 서버에 연결할 수 없어요'); return Promise.resolve(false); }
    return SUGDB.saveRoom(key, data, before).then(function(){
      var m = {}; Object.keys(MAP).forEach(function(k){ m[k] = MAP[k]; });
      if(data) m[key] = data; else delete m[key];
      lsSet(m); apply(m); afterChange();
      if(listOn){ renderList(); paintFloors(); }
      else done(key, before, data);
      return true;
    })['catch'](function(e){
      if(btn) btn.disabled = false;
      var c = (e && (e.code || e.message)) || '';
      err(/permission-denied/.test(c)
        ? '⚠ 서버가 거절했어요 — 새 서버 규칙을 아직 안 붙여 넣었거나 관리자 명단에 없어요 (서버\\하루3번_방정보_설정_안내.txt)'
        : /b3\/login/.test(c) ? '⚠ 관리자 로그인이 풀렸어요 — 다시 로그인해 주세요'
        : '⚠ 저장하지 못했어요. 인터넷을 확인해 주세요 (' + c + ')');
      return false;
    });
  }
  function save(){
    if(!selKey) return;
    var d = collect(selKey);
    if(d === false) return;
    if(d === null && !MAP[selKey]){ err('바뀐 것이 없어요'); return; }
    write(selKey, d);
  }
  function undo(key){
    key = key || selKey; if(!key || !MAP[key]) return;
    if(!confirm(nameLine(key) + '\n원래대로 되돌릴까요?')) return;
    write(key, null);
  }
  function done(key, before, after){
    /* 바뀐 번호가 지도에 보이게 다시 그리고, 그 방을 계속 하늘색으로 */
    var keepLv = curLv;
    showFloorDetail(keepLv); title(); paintFloors();
    select(key);
    var p = $('rfPanel');
    p.innerHTML =
      '<div class="rfDone"><span class="rfOk">✅</span><span>' + (after ? '저장했어요' : '원래대로 되돌렸어요') +
        '<small>' + esc(nameLine(key)) + '<br>' + describe(key, before, after).split('<br>').map(esc).join('<br>') +
        '<br>사용자 폰에는 다음에 앱을 열 때 반영돼요</small></span></div>' +
      '<div class="rfBtns">' + (after ? '<button class="big ghost" onclick="RFIX.undo()">↺ 원래대로</button>' : '') +
        '<button class="big" onclick="RFIX.close()">다른 방 고치기</button></div>';
    $('s5').classList.add('rfOpen');
    relayout();
  }

  /* ── 바꾼 방 목록 ── */
  function when(ts){
    if(!ts) return '';
    var d = new Date(ts), h = d.getHours();
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + (h < 12 ? '오전 ' : '오후 ') + ((h % 12) || 12) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function renderList(){
    var box = $('rfList'); if(!box) return;
    var keys = Object.keys(MAP).sort(function(a, b){ return (MAP[b].ts || 0) - (MAP[a].ts || 0); });
    if(!keys.length){ box.innerHTML = '<div class="rfEmpty">아직 바꾼 방이 없어요</div>'; return; }
    box.innerHTML = keys.map(function(k){
      var f = MAP[k], head = (k === 'ZONE') ? '크리에이티브 존' : (/^\d{5}$/.test(k) ? k + '호' + (f.no ? ' → ' + f.no + '호' : '') : k);
      var lines = [];
      if(f.name && f.name !== origName(k)) lines.push(esc(origName(k) || '이름 없음') + ' → <b>' + esc(f.name) + '</b>');
      if(f.no) lines.push('화면에 보이는 번호만 바뀌어요 · 옛 번호로도 검색돼요');
      var extra = [];
      if(f.en) extra.push('영어 ' + esc(f.en));
      if(f.memo){
        var wh = [];
        if(!f.show || f.show.s !== false) wh.push(k === 'ZONE' ? '고르는 화면' : '검색');
        if(!f.show || f.show.d !== false) wh.push('3D');
        if(!f.show || f.show.a !== false) wh.push('도착');
        extra.push('메모 「' + esc(f.memo) + '」' + (wh.length ? ' · ' + wh.join('·') : ' · 보여 줄 곳 없음'));
      }
      return '<div class="rfItem"><div class="rfItemHd"><b>' + esc(head) + '</b>' +
        '<button class="ghost" onclick="RFIX.undo(\'' + esc(k) + '\')">↺ 원래대로</button></div>' +
        lines.map(function(l){ return '<div class="rfItemTx">' + l + '</div>'; }).join('') +
        (extra.length ? '<div class="rfItemEx">' + extra.join(' · ') + '</div>' : '') +
        '<div class="rfItemTs">🕓 ' + when(f.ts) + '</div></div>';
    }).join('') + '<div class="rfEmpty">고친 기록은 서버에 남아요 — 누가 · 언제 · 무엇을</div>';
  }
  function toggleList(){
    listOn = !listOn;
    var s5 = $('s5');
    if(listOn){ close(); renderList(); }
    s5.classList.toggle('rfListOn', listOn);
    title(); paintFloors(); relayout();
    s5.scrollTop = 0;
  }

  return { apply:apply, refresh:refresh, dispNo:dispNo, codeOfNo:codeOfNo, memo:memo, memoHtml:memoHtml,
           paint4:paint4, paint7:paint7,
           enter:enter, exit:exit, editing:function(){ return editing; }, close:close, chip:chip,
           save:save, undo:undo, toggleList:toggleList,
           get map(){ return MAP; } };
})();
/* 화면에 보이는 호실 번호 (관리자가 바꾼 번호) — 원래 번호가 앱 안의 열쇠다 */
function dispNo(code){ return RFIX.dispNo(code); }
