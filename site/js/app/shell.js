"use strict";
/* shell.js — 앱 상태(목적지·출발층) · 화면 전환 go() · 실사 3D 연결 · 뒤로가기 · 즐겨찾기
   (예전 한 파일 main.js 의 428~768줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
/* ========== 상태 ========== */
var target=null, curFloor=null, steps=[], si=0;
var fpHoloGrid=null; /* 버그 수정: 선언 없이 대입만 하면 strict 모드에서 ReferenceError로 앱 전체가 멈춤 */
var holoGround=null, holoPool=null;   /* 조감도 바닥판 · 바닥 빛웅덩이 (view3d.js 가 만들고 overview3d.js holoFloorTune 이 다룬다) */
var startFloor=1;   // 사용자가 지금 있는 층(기본 1층=정문). 출발층 선택으로 바뀜.

function targetPos(){
  if(!target) return {x:0,z:0};
  if(target.kind==='toilet') return {x:FACILITIES.toilet.x, z:FACILITIES.toilet.z};
  // 예전엔 (0,0) — 코어 바로 옆이라 "엘리베이터에서 몇 걸음"으로 끝나 버렸음. 존 한가운데를 목적지로.
  if(target.kind==='zone')   return {x:B1_ZONE_MID_X, z:B1_ZONE_MID_Z};
  if(target.kind==='emstair'){
    var ep = EMSTAIR_POS[target.floor];
    return ep ? {x:ep.xWhole, z:ep.z} : {x:0,z:0};
  }
  var L = FLOOR_LAYOUT[target.floor];
  var info = L.lookup[target.code];
  /* ★ 2026-09-27 : 13121-A 처럼 한 칸을 둘로 나눈 방은 lookup 에 부모(13121)만 있다.
     그래서 여기서 못 찾고 (0,0) — 건물 한가운데 — 를 목적지로 돌려주고 있었다.
     그 결과 13121-A·13121-B 는 빨간 안내선이 엉뚱한 곳으로 가고,
     안내도 늘 '엘리베이터에서 가까운 곳'으로 나왔다. 나뉜 칸의 제 좌표를 찾아 쓴다. */
  if(!info){
    var par = L.lookup[String(target.code).replace(/-[A-Za-z]$/, '')];
    if(par && par.cells)
      for(var ci = 0; ci < par.cells.length; ci++)
        if(par.cells[ci].code === target.code) info = par.cells[ci];
    if(!info) info = par;
  }
  return info ? {x:info.x, z:info.z} : {x:0,z:0};
}
function targetLabel(){
  if(!target) return '';
  if(target.kind==='toilet') return (LANG==='ko') ? '화장실' : 'Restroom';
  if(target.kind==='zone')   return (LANG==='ko') ? '크리에이티브 존' : 'Creative Zone';
  if(target.kind==='emstair') return (LANG==='ko') ? '비상계단' : 'Emergency Stairs';
  return roomTitle(target.code);
}
function isTargetMesh(o){
  if(!target || !o.userData) return false;
  if(target.kind==='toilet') return o.userData.toilet && o.userData.floor===target.floor;
  if(target.kind==='zone')   return !!o.userData.zone;
  if(target.kind==='emstair') return o.userData.evst==='emstair' && o.userData.floor===target.floor;
  if(!o.userData.code) return false;
  var full = o.userData.parent || o.userData.code;
  return full===target.code && o.userData.floor===target.floor;
}

/* ========== 도착 파티클 효과 ========== */
/* containerId 안에 작은 발광 파티클들을 사방으로 흩뿌리듯 터뜨린다.
   길안내 마지막 단계(s6)와 도착 화면(s7)에서 공용으로 쓴다. */
function spawnParticles(containerId){
  var box = document.getElementById(containerId);
  if(!box) return;
  box.innerHTML = '';
  var colors = ['#00E5FF','#FF2E88','#7B5CFF','#1FE0A8','#FFC93C'];
  var ring = document.createElement('span'); ring.className = 'ring';
  box.appendChild(ring);
  var count = 28;
  for(var i=0;i<count;i++){
    var el = document.createElement('span');
    el.className = 'p';
    var ang = (Math.PI*2)*(i/count) + (Math.random()*0.5-0.25);
    var dist = 55 + Math.random()*130;
    var dx = Math.cos(ang)*dist, dy = Math.sin(ang)*dist;
    var size = 4 + Math.random()*7;
    var dur = 0.75 + Math.random()*0.65;
    var delay = Math.random()*0.12;
    var c = colors[i % colors.length];
    el.style.left = '50%'; el.style.top = '50%';
    el.style.width = size+'px'; el.style.height = size+'px';
    el.style.background = c; el.style.boxShadow = '0 0 8px '+c;
    el.style.setProperty('--dx', dx+'px');
    el.style.setProperty('--dy', dy+'px');
    el.style.animationDuration = dur+'s';
    el.style.animationDelay = delay+'s';
    box.appendChild(el);
  }
  // 재생이 끝나면 정리(같은 화면을 다시 봐도 매번 새로 터지도록)
  setTimeout(function(){ if(box) box.innerHTML=''; }, 2000);
}

/* ========== 화면 전환 ========== */
var SCREENS=['s1','s2','scat','s3','s4','s5','s6','s7','sph','sset','sguide','sfav','ssug','sadmin','sphmgr','spwgate','phsort','sqr','sqrok','saidat','spick','stt','salm','srcv'];   /* stt 내 시간표 · salm 수업 알림 · srcv 받은 길 (2026-11-03) */
/* ========== '여기가 맞나요?' 화면의 실사 3D ==========
   군산대 공대 3호관 실사 3D 페이지(three.js 포함)를 base64로 통째로 품고 있다가,
   iframe의 srcdoc으로 풀어서 띄운다. 외부 파일·인터넷 연결이 필요 없다.
   화면을 처음 열 때 한 번만 만들고, 그 뒤로는 그대로 둔다. */
var BLD3D_DONE = false;
function mountBld3D(){
  /* 실사 3D 는 3d/realistic.html 로 따로 있다 (예전에는 base64 로 품었다가 srcdoc 으로 풀었다).
     three.js 는 앱과 같은 파일(js/vendor/three.min.js)을 쓰므로 브라우저가 한 번만 받는다. */
  if(BLD3D_DONE) return;
  var box = document.getElementById('b3dBox');
  if(!box) return;
  BLD3D_DONE = true;
  var fr = document.createElement('iframe');
  fr.id = 'b3dFrame';
  fr.title = (LANG === 'ko') ? '군산대 공대 3호관 실사 3D' : "Kunsan Nat'l Univ. Engineering Bldg.3 — 3D view";
  fr.setAttribute('data-ko-title', '군산대 공대 3호관 실사 3D'); fr.setAttribute('data-en-title', "Kunsan Nat'l Univ. Engineering Bldg.3 — 3D view");   // 말을 바꾸면 ui.js applyLang 이 바꾼다
  fr.setAttribute('allow', 'fullscreen');
  fr.setAttribute('scrolling', 'no');
  fr.onload = function(){
    var ld = document.getElementById('b3dLoad');
    if(ld) ld.style.display = 'none';
    bld3DHook(fr);                                   // v51
  };
  fr.src = '3d/realistic.html';
  box.appendChild(fr);
}/* 화면에 들어올 때마다 3D를 '전체보기 + 자동회전'으로 되돌린다.
   (사용자가 3D를 직접 만진 뒤에는 3D 쪽에서 알아서 무시한다) */
/* v51 : 건물 3D(iframe)는 2번 화면에 있을 때만 그린다.
   iframe 안 코드는 손대지 않고 그 창의 requestAnimationFrame을 감싸서, 2번 화면이 아니면
   다음 프레임 예약을 붙들어 두었다가(BLD3D.queue) 돌아오면 그때 이어서 돌린다. */
var BLD3D = { paused:true, queue:[], raw:null };
function bld3DHook(fr){
  try{
    var w = fr.contentWindow;
    if(!w || w.__b3navHooked) return;
    w.__b3navHooked = true;
    var raw = w.requestAnimationFrame.bind(w);
    BLD3D.raw = raw;
    w.requestAnimationFrame = function(cb){
      if(BLD3D.paused){ BLD3D.queue.push(cb); return 0; }
      return raw(cb);
    };
    /* 폰이면 iframe 렌더러의 해상도 배율을 메인 3D와 같은 1.4로 (기본 2 → 픽셀 처리량 절반) */
    var mob = ('ontouchstart' in window) || navigator.maxTouchPoints>0 || /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);
    if(mob && w.renderer && typeof w.renderer.setPixelRatio === 'function'){
      w.renderer.setPixelRatio(Math.min(w.devicePixelRatio || 1, 1.4));
      if(typeof w.resize === 'function') w.resize();
    }
    var s2 = document.getElementById('s2');
    if(s2 && s2.classList.contains('on') && !document.hidden) bld3DResume(); else BLD3D.paused = true;
  }catch(e){}
}
function bld3DResume(){
  if(!BLD3D.raw) return;
  BLD3D.paused = false;
  var q = BLD3D.queue; BLD3D.queue = [];
  for(var i=0;i<q.length;i++){ try{ BLD3D.raw(q[i]); }catch(e){} }
}
function bld3DLeave(){ BLD3D.paused = true; }
function bld3DEnter(){
  try{
    bld3DResume();                                     // v51 : 렌더 루프 재개
    var fr = document.getElementById('b3dFrame');
    var w  = fr && fr.contentWindow;
    if(w && typeof w.enterView === 'function') w.enterView();
  }catch(e){}
}
/* 시작 화면에서 미리 만들어 두어, 2번째 화면으로 넘어갔을 때 기다리지 않게 한다 */
window.addEventListener('load', function(){ setTimeout(mountBld3D, 2500); });   // v51 : 첫 화면이 자리 잡은 뒤

function go(id){
  if(typeof TOPMENU!=='undefined') TOPMENU.close();      /* 화면이 바뀌면 오른쪽 위 ☰ 메뉴는 닫는다 */
  if(typeof RESUME!=='undefined') RESUME.onScreen(typeof id==='number' ? 's'+id : id);   /* 길안내 이어 하기 — 새로 시작했거나 다 왔으면 지운다 */
  if(typeof id==='number') id='s'+id;
  navRecord(id);                                         /* 지나온 화면 기록 — 휴대폰 뒤로가기가 이것을 따라 한 칸씩 돌아간다 */
  var target=document.getElementById(id);
  SCREENS.forEach(function(sid){
    var el=document.getElementById(sid);
    if(sid!==id) el.classList.remove('on');
  });
  /* 애니메이션이 매번 확실히 재생되도록 잠깐 꺼서 리플로우(강제 재계산)시킨 뒤 다시 켠다 */
  target.classList.remove('on');
  void target.offsetWidth;
  target.classList.add('on');
  var order={'s1':1,'s2':2,'scat':3,'s3':4,'s4':5,'s5':6,'s6':7,'s7':8};
  for(var i=1;i<=8;i++){
    var li=document.getElementById('l'+i);
    if(li) li.classList.toggle('now', i===order[id]);
  }
  if(id!=='sqr' && typeof QRNAV!=='undefined') QRNAV.stopCam();
  if(id==='s2'){ mountBld3D(); bld3DEnter(); }
  if(id==='s4') resize3D();
  if(id==='s4') updateFavBtn();
  /* v51 : 목적지 3D 루프는 s4에서만 */
  if(typeof animateRunning!=='undefined'){
    if(id==='s4') animateStart(); else animateRunning=false;
  }
  /* v51 : 건물 확인 3D(iframe)도 s2를 벗어나면 멈춘다 */
  if(id!=='s2' && typeof bld3DLeave==='function') bld3DLeave();
  if(id==='s5' && typeof resizeB==='function') resizeB();
  /* s5(층 상세) 화면일 때만 두 번째 3D 렌더러 루프를 돌리고, 나가면 바로 멈춘다. */
  if(typeof animateBRunning!=='undefined'){
    if(id==='s5'){ if(!animateBRunning && typeof rB!=='undefined' && rB){ animateBRunning=true; animateB(); } }
    else animateBRunning=false;
  }
  if(id==='ssug' && typeof SUGAI!=='undefined') SUGAI.warmup();
  if(id==='ssug' && typeof SUGDB!=='undefined') SUGDB.prepSubmit();
  if(id==='ssug' && typeof sugQuotaRender==='function') sugQuotaRender();   /* 하루 3번 — 남은 횟수 */
  if(id==='sadmin' && typeof SUGDB!=='undefined') SUGDB.watchAdmin();
  if(id!=='sadmin' && typeof SUGDB!=='undefined') SUGDB.unwatchAdmin();
  if(id==='sph'){ phRender(); if(typeof sugBadgeSync==='function') sugBadgeSync();
                  if(typeof phAiLearnRender==='function') phAiLearnRender(); }
  if(id==='sadmin' && typeof sugAdminRender==='function') sugAdminRender();
  if(id==='sphmgr' && typeof sphMgrRender==='function') sphMgrRender();
  if(id==='phsort' && typeof phSortRender==='function') phSortRender();
  if(id==='saidat' && typeof aidEnter==='function') aidEnter();     /* v55 : AI 사진 파악 자료집 */
  if(id==='sfav') renderFavorites();
  if(id==='s7') spawnParticles('arrivalFx');   // "안내를 마칩니다" 도착 파티클 효과
}
/* 즐겨찾기·설정은 어느 화면에서 열었든, 닫으면 그 이전 화면으로 되돌아간다 */
var beforeOverlay='s1';
function openOverlay(id){
  var cur=document.querySelector('.screen.on');
  if(cur && cur.id!==id && cur.id!=='sset' && cur.id!=='sfav' && cur.id!=='sguide') beforeOverlay=cur.id;
  go(id);
}
function closeOverlay(){ go(beforeOverlay); }
/* 도착 화면 '처음으로 돌아가기' : 검색어를 지우고 첫 화면(공대 3호관 길안내)으로 간다.
   2026-09-25 : 예전에는 여기가 '종료'라서 창(웹뷰)을 아예 닫았다. 앱을 다시 켜야 해서
   불편하기도 하고, 브라우저가 window.close() 를 막으면 "이 창을 닫아 주세요" 하는
   난데없는 알림만 떴다 — 앱을 끄는 일은 기기의 뒤로가기에 맡기고, 이 버튼은 처음으로 보낸다. */
function reset(){ clearSearch(); go('s1'); }
/* 도착 화면 '다른 곳 찾기' : 처음(시작) 화면이 아니라 카테고리 선택 화면으로 바로 연결 */
function findAnother(){ clearSearch(); go('scat'); }
/* ========== 휴대폰 뒤로가기 (2026-11-03 다시 만듦 — 사용자가 견본으로 정한 규칙) ==========
   사용자 : 「앱 안에서 뒤로가기를 누르면 어떤 곳은 전 화면으로 가는데 어떤 페이지에서는 바로 앱이 꺼진다 —
             전 화면으로 가게, 첫 화면에서 뒤로가기는 '정말로 앱을 종료하시겠습니까?'」 · 「핸드폰 중심으로」.
   왜 꺼졌나 : 예전에는 히스토리 칸을 하나만 깔고, 뒤로가기를 받은 뒤(popstate 안에서) 다시 깔았다.
     그런데 뒤로가기 단추는 화면을 「누른」 것이 아니라서, 그때 깐 칸은 크롬 · 삼성 인터넷이
     「사용자가 누르지 않은 사이 페이지가 넣은 칸」으로 보고 다음 뒤로가기 때 건너뛴다(history manipulation intervention).
     → 화면을 안 누르고 뒤로가기를 연달아 누르면 앱 밖으로 나갔다. 깊은 화면일수록 여러 번 눌러야 해서 「어떤 페이지에서만」으로 보였다.
   이제 :
     ① 지나온 화면을 순서대로 기억한다(navRecord) — 뒤로가기는 바로 전에 있던 화면으로.
        첫 화면으로 가면 비우고, 이미 지나온 화면으로 다시 가면 그 앞까지만 남긴다.
        한 번에 여러 화면을 건너뛰는 길(공유 링크 · 이어 보기 · QR 확인 → 찾기 → 목적지 → 길안내)은 거쳐 간 화면을 쌓지 않는다.
     ② 히스토리 칸(받침)은 「화면을 진짜로 누른 그 순간」에 하나씩만 넣는다(B3BACK.tap, 3칸까지).
        2026-11-03 폰 시험(사용자) : 「마지막 페이지에서 뒤로가기 → 전 페이지, 거기서 한 번 더 → 앱이 꺼진다」.
        한 번 누를 때 칸을 여러 개 넣거나, 뒤로가기를 받는 중에(바로 전에 화면을 눌렀어도) 칸을 넣으면
        크롬은 그 칸들을 「누름 없이 넣은 칸」으로 보고 건너뛴다 → 누름 하나에 칸 하나, 뒤로가기 중에는 넣지 않는다.
        뒤로가기로 칸 하나를 쓰면 새 칸을 넣지 않고 history.forward() 로 그 칸에 되돌아간다 — 같은 칸을 몇 번이든 다시 쓴다.
     ③ 떠 있는 것(사진 크게 보기 · ☰ · 아래 창 · 확인창)부터 닫고, 길안내 단계 · 이용안내 쪽은 한 칸씩.
     ④ 첫 화면에서 누르면 「앱을 종료하시겠어요?」 — [취소] · [종료]. 창이 떠 있을 때 한 번 더 누르면 [취소].
     ⑤ 화면 왼쪽 위 ← 도 같은 규칙(창 · 단계는 건너뛰고 화면만 한 칸).
   아이폰은 뒤로가기 단추가 없지만 사파리의 「왼쪽 끝에서 밀기」가 같은 히스토리 뒤로가기라 똑같이 움직인다. */
var NAV = {stack: [], cur: 's1', backing: false, chainFrom: null, chainTo: null};
var NAV_SKIP = {sqr: 1};          // 카메라 화면은 되돌아가지 않는다 — 돌아가면 카메라가 꺼진 빈 화면이다
/* 관리자 화면은 각자의 ← (정리할 것이 있다 — 고르기 취소 등)를 그대로 쓴다 */
var NAV_ADMIN = {sph: 1, sadmin: 1, sphmgr: 1, spwgate: 1, phsort: 1, saidat: 1, spick: 1};
/* 한 번의 동작(누름 하나 · 링크로 열기 하나) 안에서 화면이 이어서 바뀌면 처음 화면만 기록한다 —
   공유 링크 · 이어 보기는 「여기가 맞나요? → 찾기 → 목적지 → 길안내」를 한꺼번에 지나가는데, 사용자는 그 화면들을 본 적이 없다.
   (처음에는 시간(80ms)으로 갈랐는데, 목적지 3D 준비가 그보다 오래 걸려 목적지가 기록에 남았다 — 같은 동작인지로 가른다) */
function navRecord(id){
  var from = NAV.cur;
  if(id === from) return;
  NAV.cur = id;
  if(NAV.backing) return;
  if(NAV.chainFrom === null){ NAV.chainFrom = from; setTimeout(navCommit, 0); }
  NAV.chainTo = id;
}
function navCommit(){
  var from = NAV.chainFrom, id = NAV.chainTo;
  NAV.chainFrom = NAV.chainTo = null;
  if(from === null || from === id) return;
  if(id === 's1'){ NAV.stack = []; return; }
  var k = NAV.stack.indexOf(id);
  if(k >= 0){ NAV.stack = NAV.stack.slice(0, k); return; }
  if(!NAV_SKIP[from]) NAV.stack.push(from);
}
function navGo(id){ NAV.backing = true; try{ go(id); }finally{ NAV.backing = false; } }
/* 화면 한 칸 뒤로 (떠 있는 것 · 단계는 보지 않는다) */
function navBack(){
  if(NAV.chainFrom !== null) navCommit();                // 막 옮긴 기록이 아직 안 적혔으면 먼저
  var cur = document.querySelector('.screen.on'), id = cur ? cur.id : 's1';
  if(NAV_ADMIN[id]){ var btn = cur.querySelector('.bar .back'); if(btn){ btn.click(); return true; } }
  if(NAV.stack.length){ navGo(NAV.stack.pop()); return true; }
  if(id !== 's1'){ navGo('s1'); return true; }          // 링크 · QR 로 바로 연 화면 — 지나온 화면이 없으면 첫 화면으로
  exitAsk(); return true;
}
function appBackStep(){
  // ⓪ 「앱을 종료하시겠어요?」가 떠 있으면 닫는다 (= 취소)
  if(document.querySelector('.syExit')){ exitClose(); return true; }
  // ⓪ 사진 크게 보기 창이 떠 있으면 그것부터 닫는다 (2026-10-26 — 길안내 사진도 한 번 누르면 이 창이 뜬다)
  if(typeof izIsOpen==='function' && izIsOpen()){ closeZoom(); return true; }
  // ⓪ 오른쪽 위 ☰ 메뉴가 펼쳐져 있으면 그것부터 닫는다 (2026-10-19)
  if(typeof TOPMENU!=='undefined' && TOPMENU.isOpen()){ TOPMENU.close(); return true; }
  if(typeof RESUME!=='undefined' && RESUME.isAsking()){ RESUME.dismiss(); return true; }   // 「아까 보던 길안내」 카드
  if(typeof VIACHOOSE!=='undefined' && VIACHOOSE.isOpen()){ VIACHOOSE.close(); return true; }   // 「○층까지 어떻게 갈까요?」 창 (via.js) — 강의실 찾기에 그대로
  // 앱 설치 · 인터넷 상태 안내 창
  if(document.getElementById('pwaSheet') && typeof PWA!=='undefined'){ PWA.close(); return true; }
  // 쉬운 사용모드 「처음이세요?」 — 「아니요, 혼자 할게요」와 같다
  var ez = document.querySelector('.ezAsk button[data-a="0"]'); if(ez){ ez.click(); return true; }
  // ① 직접 그린 확인창(삭제 확인 등)이 떠 있으면 그것부터 닫는다
  var cf = document.querySelector('.appConfirmOverlay');
  if(cf && cf.parentNode){ cf.parentNode.removeChild(cf); return true; }
  // ③ 사진 위치 고르기 오버레이(관리자 화면)
  var pk = document.getElementById('phPick');
  if(pk && pk.classList.contains('on')){
    if(typeof phPickClose==='function') phPickClose(); else pk.classList.remove('on');
    return true;
  }
  // ④ 로드뷰 재생 중이면 재생만 멈춘다(화면은 그대로 3D에 남는다)
  if(typeof fpActive!=='undefined' && fpActive){
    if(typeof fpStop==='function') fpStop();
    return true;
  }
  // ⑤ 3D 전체화면이면 전체화면만 빠져나온다
  var s4 = document.getElementById('s4');
  if(s4 && s4.classList.contains('fsMode')){ exitFullscreen3D(); return true; }
  // ⑥ 화면 안의 단계 — 길안내는 단계를 · 이용안내는 쪽을 하나씩
  var cur = document.querySelector('.screen.on'), id = cur ? cur.id : 's1';
  if(id === 's6' && typeof si==='number' && si>0){ si--; render6(); return true; }
  if(id === 'sguide' && typeof guideIdx==='number' && guideIdx>0){ guidePrev(); return true; }
  // ⑦ 바로 전에 있던 화면 · 첫 화면이면 종료 확인
  return navBack();
}
/* 화면 왼쪽 위 ← 도 휴대폰 뒤로가기와 같은 규칙 — 화면마다 따로 적어 둔 목적지(go('sset') 등) 대신 지나온 화면으로 */
document.addEventListener('click', function(e){
  var b = e.target && e.target.closest ? e.target.closest('.bar .back, #s6 .stBack') : null;
  if(!b) return;
  var scr = b.closest('.screen');
  if(!scr || NAV_ADMIN[scr.id] || scr.id === 'sqr' || scr.id === 's4' && scr.classList.contains('fsMode')) return;   // QR 카메라 ← 는 카메라를 끄는 일을 한다(QRNAV.close)
  e.preventDefault(); e.stopPropagation();
  B3BACK.tap(e);                                         // ← 도 화면을 누른 것 — 받침 칸 하나
  navBack();
}, true);

/* ── 첫 화면에서 뒤로가기 : 「앱을 종료하시겠어요?」 ── */
function exitAsk(){
  if(document.querySelector('.syExit')) return;
  var ph = document.querySelector('.phone'); if(!ph) return;
  var ko = (typeof LANG === 'undefined' || LANG !== 'en');
  var w = document.createElement('div'); w.className = 'syExit';
  w.innerHTML = '<div class="card" role="dialog" aria-label="' + (ko ? '앱 종료' : 'Exit') + '"><div class="ic"><img src="img/icon-192.png" alt=""></div>' +
    '<b>' + (ko ? '앱을 종료하시겠어요?' : 'Close the app?') + '</b>' +
    '<p>' + (ko ? '「종료」를 누르면 공대 3호관 길안내가 닫혀요.<br>즐겨찾기 · 내 시간표는 그대로 남아 있어요.' : 'Tap “Close” to exit.<br>Your favorites and timetable stay saved.') + '</p>' +
    '<div class="bt"><button type="button" class="no">' + (ko ? '취소' : 'Cancel') + '</button><button type="button" class="yes">' + (ko ? '종료' : 'Close') + '</button></div></div>';
  w.addEventListener('click', function(e){ if(e.target === w) exitClose(); });          // 창 바깥을 눌러도 취소
  w.querySelector('.no').onclick = exitClose;
  w.querySelector('.yes').onclick = function(){ exitClose(); B3BACK.leave(); };
  ph.appendChild(w);
}
function exitClose(){ var w = document.querySelector('.syExit'); if(w) w.remove(); }

/* ── 휴대폰 뒤로가기를 앱 안에서 받는 방법 두 가지 ──
   2026-11-03 사용자 : 「종료를 누르면 바로 안 꺼지고 '한 번 더 뒤로가기' 가 뜬다 — 종료 버튼만 누르면 꺼지게」.
   브라우저는 「지나온 칸이 하나뿐인 창」만 스크립트가 닫게 해 준다(window.close). 그런데 뒤로가기를 받으려고 깐 받침(history 칸)이
   바로 그 지나온 칸이라, 받침을 쓰는 한 「종료」로 창을 닫을 수 없었다.
   ① 닫기 감시(CloseWatcher) — 크롬 120 이상(안드로이드)은 뒤로가기 단추가 페이지의 「닫기 감시」를 먼저 부른다.
      칸을 하나도 안 쓰므로 지나온 칸이 1개로 남고 → 「종료」 = window.close() 로 정말 닫힌다.
      뒤로가기를 받을 때마다 감시를 새로 걸어 둔다(받은 뒤에는 새 감시가 따로 걸린다 — 몇 번을 눌러도 받는다).
      크롬(안드로이드 120+)은 처음부터 이 방법. 다른 브라우저(삼성 인터넷 등)는 ②로 시작하면서 감시도 함께 걸어 두고,
      뒤로가기가 감시로 오는 것을 한 번 보면 기억했다가(b3nav_cw_ok) 다음에 켤 때부터 이 방법.
   ② 받침 칸(history) — 아이폰 · 닫기 감시가 없는 브라우저. 「종료」는 칸을 걷고 창을 닫아 보며, 그래도 안 닫히면 안내한다.
   (컴퓨터에서 시험할 때는 주소에 ?cw=1 을 붙이면 ① — Esc 키가 휴대폰 뒤로가기와 같다) */
var B3BACK = (function(){
  var ok = !!(window.history && history.pushState);
  var pos = 0, leaving = false, popping = false, CUSHION = 3;
  var ua = navigator.userAgent || '';
  var hasCW = (typeof CloseWatcher === 'function');
  var cm = /Chrome\/(\d+)/.exec(ua), android = /Android/.test(ua);
  var chromeAndroid = android && !!cm && +cm[1] >= 120 &&
                      !/SamsungBrowser|; wv\)|Whale|KAKAOTALK|NAVER|EdgA|OPR|YaBrowser|Firefox|Line\//i.test(ua);
  /* 2026-11-03 폰 시험 「종료를 눌러도 안 꺼진다」 : 삼성 인터넷도 28판부터 뒤로가기를 닫기 감시로 보낸다 — ① 로 */
  var sm = /SamsungBrowser\/(\d+)/.exec(ua), samsungOK = android && !!sm && +sm[1] >= 28;
  var learned = false;
  try{ learned = localStorage.getItem('b3nav_cw_ok') === '1'; }catch(e){}
  var useCW = hasCW && (chromeAndroid || samsungOK || (android && learned) || /[?&]cw=1(&|$)/.test(location.search));
  var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function standalone(){ try{ return !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }catch(e){ return false; } }
  function browserName(){
    if(sm) return '삼성 인터넷 ' + sm[1];
    if(/KAKAOTALK/i.test(ua)) return '카카오톡'; if(/NAVER\(inapp/i.test(ua)) return '네이버'; if(/Whale/i.test(ua)) return '웨일';
    if(ios) return '아이폰'; if(cm) return (android ? '크롬 ' : 'PC ') + cm[1]; return '기타';
  }

  /* ① 닫기 감시 */
  var cw = null;
  function arm(){
    if(!hasCW || cw || leaving) return;
    try{ cw = new CloseWatcher(); }catch(e){ cw = null; return; }
    cw.onclose = function(){
      cw = null;
      if(leaving) return;
      if(android) try{ localStorage.setItem('b3nav_cw_ok', '1'); }catch(e){}   // 이 폰 브라우저는 뒤로가기가 감시로 온다 — 다음에는 ① 로 (컴퓨터의 Esc 는 세지 않는다)
      popping = true;
      try{ appBackStep(); }finally{ popping = false; }          // 뒤로가기 한 번 = 앱 안에서 한 걸음
      arm();                                                     // 다음 뒤로가기도 받게 새로 건다
      if(!cw) setTimeout(arm, 0);
    };
  }

  /* ② 받침 칸 */
  function push(){ try{ history.pushState({b3i: pos + 1}, ''); pos++; return true; }catch(e){ return false; } }
  /* 화면을 진짜로 누를 때 칸 하나 — 누름 하나에 하나만, 뒤로가기를 받는 중에는 넣지 않는다 (위 ② 참고). 받침은 CUSHION 칸이면 충분하다 */
  function tap(e){
    if(useCW){ if(!cw && !leaving) arm(); return; }            // ① 은 칸을 안 쓴다 (감시가 풀려 있으면 다시 건다)
    if(!ok || leaving || popping) return;
    if(e && e.isTrusted === false) return;                     // 코드가 대신 누른 것(element.click())은 사람이 누른 게 아니다
    if(navigator.userActivation && !navigator.userActivation.isActive) return;
    if(pos < CUSHION) push();
  }
  if(useCW) arm();
  else if(ok){
    try{ pos = (history.state && typeof history.state.b3i === 'number') ? history.state.b3i : 0; }catch(e){ pos = 0; }
    if(pos === 0) push();          // 켜자마자 뒤로가기를 눌러도 받도록 한 칸 (아이폰 · 다른 브라우저용 — 크롬은 화면을 한 번 누른 뒤부터 받는다)
    if(hasCW) arm();               // 이 브라우저가 뒤로가기를 감시로 보내는지 알아 둔다 (보내면 이번에도 감시가 먼저 받는다)
    window.addEventListener('popstate', function(e){
      var to = (e.state && typeof e.state.b3i === 'number') ? e.state.b3i : 0;
      if(leaving){ pos = to; return; }
      if(to >= pos){ pos = to; return; }                        // 앞으로 가기(아래에서 되돌려 놓은 것) — 할 일 없음
      pos = to;
      popping = true;
      try{ appBackStep(); }finally{ popping = false; }          // 뒤로가기 한 번 = 앱 안에서 한 걸음
      /* 2026-11-03 폰 시험 뒤 : 쓴 칸을 새로 넣지 않고 「앞으로 가기」로 그 칸에 되돌아간다.
         새 칸을 넣는 게 아니라서 크롬이 건너뛸 칸이 생기지 않고, 같은 칸을 몇 번이든 다시 쓴다 —
         뒤로가기를 몇 번 누르든 앱 안에서 받고, 앱을 닫는 건 첫 화면의 「종료」뿐이다. */
      try{ history.forward(); }catch(err){}
    });
  }
  window.addEventListener('click', tap);                       // 누른 일이 다 끝난 뒤(단계 · 화면이 바뀐 뒤)
  window.addEventListener('keydown', function(e){ if(e.key !== 'Escape') tap(e); });
  window.addEventListener('pageshow', function(){ leaving = false; if(useCW) arm(); });

  /* 「종료」 — 창을 닫는다. 못 닫는 경우(아이폰 · 지나온 칸이 남은 창)에만 안내한다. */
  function notice(){
    var ko = (typeof LANG === 'undefined' || LANG !== 'en');
    var t = ios ? (ko ? '아이폰은 앱이 스스로 닫히지 않아요 — 화면 아래를 위로 밀어 나가 주세요' : 'On iPhone, swipe up from the bottom to leave the app')
                : (ko ? '뒤로가기를 한 번 더 누르면 앱이 닫혀요' : 'Press back once more to close the app');
    if(typeof B3UI !== 'undefined') B3UI.toast(t, true);
  }
  /* 못 닫았을 때 — 왜인지 「설정 → 문제 기록」에 남긴다(브라우저 · 방식 · 지나온 칸 수 · 설치한 앱인지). 폰에서만 생기는 일이라 원인을 보려면 이것뿐이다 */
  function failLog(){
    try{ localStorage.setItem('b3nav_exit_diag', [browserName(), useCW ? '감시' : '받침', '칸 ' + history.length, standalone() ? '설치한 앱' : '브라우저'].join(' · ')); }catch(e){}
    try{ DIAG.paint(); }catch(e){}
  }
  function leave(){
    leaving = true;
    if(cw){ try{ cw.destroy(); }catch(e){} cw = null; }
    if(useCW || !ok){
      try{ window.close(); }catch(e){}
      setTimeout(function(){                                     // 아직 여기 있으면 — 앞에 다른 페이지가 있는 창(지나온 칸이 남음)
        try{ if(history.length > 1) history.back(); }catch(e){}
        /* 그래도 못 닫았으면 감시를 다시 걸지 않는다 — 다음 뒤로가기가 그대로 휴대폰에 가서 앱이 닫힌다.
           (예전에는 여기서 감시를 다시 걸어, 「한 번 더 누르면 닫혀요」라고 해 놓고 누르면 종료 창이 또 떴다)
           화면을 다시 누르면(앱을 계속 쓰면) tap() 이 감시를 다시 건다. */
        setTimeout(function(){ leaving = false; failLog(); notice(); }, 600);
      }, 300);
      return;
    }
    var n = pos;
    if(n > 0) history.go(-n);
    setTimeout(function(){
      try{ window.close(); }catch(e){}
      try{ history.back(); }catch(e){}
      setTimeout(function(){ leaving = false; pos = 0; failLog(); notice(); }, 700);
    }, n > 0 ? 350 : 0);
  }
  return {tap: tap, leave: leave, mode: function(){ return useCW ? 'CW' : 'history'; }, depth: function(){ return useCW ? (cw ? 'CW' : 'CW-off') : pos; },
          browser: browserName, standalone: standalone};
})();

/* 검색창·결과·안내문을 처음 상태로 */
function clearSearch(){
  var nq=document.getElementById('nq'); if(nq) nq.value='';
  var nr=document.getElementById('nres'); if(nr) nr.innerHTML='';
  var er=document.getElementById('err');  if(er) er.textContent='';
  searchHits=[];
  var rw=document.getElementById('recentWrap'); if(rw) rw.classList.remove('hidden');
  renderRecent();
}

/* ========== 즐겨찾기 ========== */
function favId(t){ return t.kind+'_'+t.floor+'_'+(t.code||''); }
function loadFavs(){
  try{ return JSON.parse(localStorage.getItem('favRooms')||'[]'); }catch(e){ return favMem || []; }
}
/* 2026-10-20 종합검진 : 사파리 「모든 쿠키 차단」이나 저장 공간이 가득 차면 setItem 이 오류를 던져 ☆ 가 안 눌렸다 — 이 화면 동안은 메모리에 */
var favMem = null;
function saveFavs(list){ favMem = list; try{ localStorage.setItem('favRooms', JSON.stringify(list)); }catch(e){} }
function isFav(t){ return loadFavs().some(function(f){ return f.id===favId(t); }); }
function toggleFav(){
  if(!target) return;
  var list=loadFavs();
  var id=favId(target);
  var idx=list.findIndex(function(f){ return f.id===id; });
  var titleEl=document.getElementById('t4');
  var title=titleEl?titleEl.textContent:'';
  if(idx>=0){ list.splice(idx,1); }
  else{ list.push({id:id, title:title, kind:target.kind, floor:target.floor, code:target.code||null}); }
  saveFavs(list);
  updateFavBtn();
}
function updateFavBtn(){
  var btn=document.getElementById('favBtn');
  if(!btn || !target) return;
  btn.textContent = isFav(target) ? '★' : '☆';
}
/* 즐겨찾기 화면에서 직접 해제 : 방을 열지 않고도 목록의 ✕만 눌러서 바로 지울 수 있게 한다. */
function removeFav(id){
  saveFavs(loadFavs().filter(function(f){ return f.id!==id; }));
  renderFavorites();
  updateFavBtn();   // 지금 보고 있는 방이 방금 해제한 즐겨찾기면 s4의 별 표시도 같이 갱신
}
function renderFavorites(){
  var box=document.getElementById('favList');
  if(!box) return;
  var list=loadFavs();
  if(!list.length){
    box.innerHTML = LANG==='ko'
      ? '<div class="favEmpty">아직 즐겨찾기한 강의실이 없어요.<br>강의실 화면에서 ☆ 버튼을 눌러보세요.</div>'
      : '<div class="favEmpty">No favorite rooms yet.<br>Tap the ☆ button on a room screen to save one.</div>';
    return;
  }
  box.innerHTML='';
  list.forEach(function(f){
    var d=document.createElement('div'); d.className='favItem';
    var span=document.createElement('span'); span.className='favTitle'; span.textContent=t4TitleFor(f)||f.title;
    var actions=document.createElement('div'); actions.className='favActions';
    var openBtn=document.createElement('button');
    openBtn.className='starBtn'; openBtn.style.cssText='font-size:14px;color:#00E5FF;';
    openBtn.textContent=(LANG==='ko')?'열기 →':'Open →';
    openBtn.onclick=function(){ openFavorite(f); };
    var rmBtn=document.createElement('button');
    rmBtn.className='favRemove'; rmBtn.textContent='✕'; rmBtn.title=(LANG==='ko')?'즐겨찾기 해제':'Remove favorite';
    rmBtn.onclick=function(e){ e.stopPropagation(); removeFav(f.id); };
    actions.appendChild(openBtn); actions.appendChild(rmBtn);
    d.appendChild(span); d.appendChild(actions);
    box.appendChild(d);
  });
}
function openFavorite(f){
  openTarget({kind:f.kind, floor:f.floor, code:f.code}, f.floor, f.title);
}
