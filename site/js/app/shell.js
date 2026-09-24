"use strict";
/* shell.js — 앱 상태(목적지·출발층) · 화면 전환 go() · 실사 3D 연결 · 뒤로가기 · 즐겨찾기
   (예전 한 파일 main.js 의 428~768줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
/* ========== 상태 ========== */
var target=null, curFloor=null, steps=[], si=0;
var fpHoloGrid=null; /* 버그 수정: 선언 없이 대입만 하면 strict 모드에서 ReferenceError로 앱 전체가 멈춤 */
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
var SCREENS=['s1','s2','scat','s3','s4','s5','s6','s7','sph','sset','sguide','sfav','ssug','sadmin','sphmgr','spwgate','phsort','sqr','sqrok','saidat','spick'];
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
  fr.title = '군산대 공대 3호관 실사 3D';
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
  if(typeof id==='number') id='s'+id;
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
function reset(){ clearSearch(); go('s1'); }
/* 도착 화면 '다른 곳 찾기' : 처음(시작) 화면이 아니라 카테고리 선택 화면으로 바로 연결 */
function findAnother(){ clearSearch(); go('scat'); }
/* 도착 화면 '종료' : 앱(브라우저 창/웹뷰)을 닫는다.
   스크립트로 열지 않은 일반 탭에서는 브라우저가 window.close()를 막을 수 있어,
   그런 경우를 위해 잠깐 뒤 안내 문구를 보여준다. */
function exitApp(){
  window.close();
  setTimeout(function(){
    alert((LANG==='ko') ? '이 창을 닫아 주세요.' : 'Please close this window.');
  }, 300);
}
/* ========== 안드로이드 하드웨어 뒤로가기 ==========
   갤럭시 등 안드로이드의 뒤로가기 키는 '브라우저 히스토리를 한 칸 되돌리는' 동작이다.
   그런데 이 앱은 화면 전환을 전부 자바스크립트(go)로만 처리해서 히스토리에 아무것도
   쌓이지 않았고, 그래서 어느 화면에서 눌러도 곧장 앱이 종료돼 버렸다.
   → 항상 '더미 히스토리 한 칸'을 채워 두고(backGuardArm), 뒤로가기가 눌리면(popstate)
     앱 안에서 한 단계만 뒤로 간 뒤 그 칸을 다시 채운다.
     첫 화면(s1)에서는 다시 채우지 않고 그대로 흘려보내 앱이 종료되게 한다. */
function appBackStep(){
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
  // ⑥ 화면별 뒤로가기
  var cur = document.querySelector('.screen.on');
  var id  = cur ? cur.id : 's1';
  if(id === 's1') return false;                    // 첫 화면 → 앱 종료
  if(id === 's6'){                                 // 길안내 : 단계를 하나씩 되돌린다
    if(typeof si==='number' && si>0){ si--; render6(); return true; }
    go(4); return true;
  }
  if(id === 's7'){ go(6); return true; }           // 도착 화면 → 마지막 안내 단계로
  if(id === 'sguide'){                             // 이용안내 : 페이지를 하나씩 되돌린다
    if(typeof guideIdx==='number' && guideIdx>0){ guidePrev(); return true; }
    go('sset'); return true;
  }
  /* 나머지 화면은 그 화면 좌측 상단 '←' 버튼과 똑같이 동작시킨다.
     (뒤로가기 규칙을 두 군데에 따로 적어 두면 나중에 어긋나므로) */
  var btn = cur.querySelector('.bar .back');
  if(btn){ btn.click(); return true; }
  go('s1'); return true;
}
var backGuardOn = false;
function backGuardArm(){
  if(backGuardOn) return;
  try{ history.pushState({gunsanGuard:1}, ''); backGuardOn = true; }catch(e){}
}
(function backGuardInit(){
  if(!window.history || !history.pushState) return;
  /* ★ 2026-09-25 : 예전에는 여기서 곧바로 칸을 채웠다. 그런데 크로미움 계열 브라우저는
     "사용자가 아직 손대지도 않았는데 페이지가 스스로 쌓은 히스토리 칸"을 뒤로가기 때 건너뛴다
     (Chrome 74 부터의 history manipulation intervention — 삼성 인터넷도 크로미움이라 같다).
     그래서 삼성 폰에서는 이 칸이 통째로 무시되고 어느 화면에서 눌러도 앱이 바로 꺼졌다.
     같은 장치가 없는 아이폰 사파리는 멀쩡했고 — 그래서 기종을 타는 것처럼 보였다.
     → 사용자가 화면을 처음 건드린 순간에 채운다. 손댄 뒤에 쌓은 칸은 건너뛰지 않는다.
     (뒤로가기가 한 번 먹은 뒤에도 이 귀는 그대로 달려 있어, 다음 손짓에 저절로 다시 채워진다) */
  ['pointerdown','touchstart','keydown'].forEach(function(ev){
    window.addEventListener(ev, backGuardArm, {passive:true, capture:true});
  });
  window.addEventListener('popstate', function(){
    backGuardOn = false;
    if(appBackStep()){
      backGuardArm();                 // 앱 안에서 처리했으면 다음 뒤로가기를 위해 다시 채워 둔다
    }else{
      /* 첫 화면에서 눌렀을 때 : 남은 히스토리를 한 칸 더 되돌려
         웹뷰·홈화면 앱이 닫히게 한다(일반 브라우저 탭이면 이전 페이지로 나간다). */
      try{ window.close(); }catch(e){}
      try{ history.back(); }catch(e){}
    }
  });
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
  try{ return JSON.parse(localStorage.getItem('favRooms')||'[]'); }catch(e){ return []; }
}
function saveFavs(list){ localStorage.setItem('favRooms', JSON.stringify(list)); }
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
