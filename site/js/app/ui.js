"use strict";
/* ui.js — 한/영 전환 · 이용안내 · 카테고리 · 최근 검색 · 검색 · 층 버튼
   (예전 한 파일 main.js 의 1713~2129줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
/* ========== 한/영 전환: data-ko / data-en 속성이 있는 모든 요소에 즉시 적용(전체 화면 공통) ========== */
var LANG='ko';
function setLang(lang){
  LANG = (lang==='en') ? 'en' : 'ko';
  applyLang();
}
function toggleLang(){ setLang(LANG==='ko' ? 'en' : 'ko'); }
function applyLang(){
  document.querySelectorAll('[data-ko]').forEach(function(el){
    var v = el.getAttribute(LANG==='ko' ? 'data-ko' : 'data-en');
    if(v!==null) el.innerHTML = v;
  });
  document.querySelectorAll('[data-ko-placeholder]').forEach(function(el){
    var v = el.getAttribute(LANG==='ko' ? 'data-ko-placeholder' : 'data-en-placeholder');
    if(v!==null) el.placeholder = v;
  });
  var koBtn=document.getElementById('langKo'), enBtn=document.getElementById('langEn');
  if(koBtn && enBtn){
    koBtn.classList.toggle('langActive', LANG==='ko');
    enBtn.classList.toggle('langActive', LANG==='en');
  }
  var favBox=document.getElementById('favList');
  if(favBox && typeof renderFavorites==='function') renderFavorites();
  if(document.getElementById('recentList') && typeof renderRecent==='function') renderRecent();
  if(typeof guideRender==='function' && document.getElementById('gTitle')) guideRender(guideIdx);
  if(document.getElementById('cats') && typeof buildCats==='function') buildCats();
  if(typeof target!=='undefined' && target && document.getElementById('t4') && typeof t4TitleFor==='function'){
    document.getElementById('t4').textContent = t4TitleFor(target);
  }
  if(typeof syncTripBtn==='function') syncTripBtn();
  if(typeof rebuildAllFloors==='function') rebuildAllFloors();
  if(typeof curFloor!=='undefined' && curFloor!==undefined && typeof groupB!=='undefined' && groupB && typeof showFloorDetail==='function') showFloorDetail(curFloor);
  if(typeof refreshGuideTitles==='function') refreshGuideTitles();
  if(typeof refreshAllPhotoLang==='function') refreshAllPhotoLang();
  if(typeof steps!=='undefined' && steps && steps.length && typeof render6==='function' && document.getElementById('ins')) render6(true);
  document.title = (LANG==='ko') ? '공대 3호관 길안내' : 'Engineering Bldg.3 Navigation';
}

/* ========== 이용안내: 페이지형(다음/이전) ========== */
var guideIdx = 0;
var GUIDE_PAGES = [
  { ko:{ t:'📖 기본 사용법 (1/2)',
         b:'<b>👋 환영합니다</b><br>공대 3호관이 처음이거나 강의실 위치가 헷갈리는 신입생·재학생을 위한 앱이에요.<br><br>' +
           '<b>① 강의실 찾기</b><br>"시작하기"를 누르고 검색창에 강의실 번호(예: 13101), 교수님 성함, 또는 학과 사무실 이름을 입력하세요. 시간표에 적힌 번호 그대로 입력하면 되고, 오타가 나도 비슷한 번호가 자동으로 함께 나와요.<br><br>' +
           '<b>② 3D 화면 보기</b><br>손가락 1개로 드래그하면 회전, 2개로 드래그하면 확대·이동이 돼요. 층을 누르면 그 층만 자세히 볼 수 있고, ⟳ 버튼으로 처음 각도로 돌아옵니다.<br><br>' +
           '<b>③ 층별 상세 화면</b><br>실제로 그 층에 들어섰을 때 보는 방향(헤딩업)에 맞춰져 있어서, 복도를 걸으며 지도 보듯 방향을 확인할 수 있어요.<br><br>' +
           '<b>④ 길안내 시작</b><br>정문 맞은편 엘리베이터가 출발점이에요. "길안내 시작"을 누르면 빨간 화살표와 실제 사진을 따라 한 단계씩 안내받고, "▶ 경로 미리보기"를 누르면 실제로 걷는 눈높이로 문 앞까지 자동으로 보여주고, "🚶 직접 걸어보기"를 누르면 바닥을 눌러 직접 걸어다닐 수 있어요.' },
    en:{ t:'📖 Basics (1/2)',
         b:"<b>👋 Welcome</b><br>This app is for new and current students who are unfamiliar with Engineering Building 3 or still get confused about room locations.<br><br>" +
           "<b>① Find a room</b><br>Tap \"Start\", then type a room number (e.g. 13101), professor name, or department office name into the search box. Just type what's on your timetable — even with a small typo, similar numbers show up automatically.<br><br>" +
           "<b>② Use the 3D view</b><br>Drag with 1 finger to rotate, 2 fingers to zoom and pan. Tap a floor to see it in detail, and tap ⟳ to return to the original angle.<br><br>" +
           "<b>③ Floor detail view</b><br>It's oriented to match the direction you'd actually face on that floor, so you can check direction like reading a map while walking.<br><br>" +
           "<b>④ Start navigation</b><br>All routes start from the elevator across from the main entrance. Tap \"Start Navigation\" to follow the red arrow and real photos step by step, or watch the whole route at eye level with \"▶ Route Preview\" — or roam the corridors yourself with \"🚶 Walk It Yourself\"." } },
  { ko:{ t:'📖 즐겨찾기 & 팁 (2/2)',
         b:'<b>⑤ 즐겨찾기</b><br>강의실 화면에서 별표를 누르면 저장돼요. 첫 화면 오른쪽 위 ⭐ 버튼으로 다시 볼 수 있어요. 학기 초에 이번 학기 강의실을 미리 즐겨찾기 해두면 훨씬 빠릅니다.<br><br>' +
           '<b>⑥ 지하 1층(B1) 창의존</b><br>B1엔 창의존(창의 활동 공간)이 있어요. 층 선택에서 "B1"을 누르면 엘리베이터·계단 위치와 나가는 문을 볼 수 있어요.<br><br>' +
           '<b>⑦ 사진이 실제와 다르면?</b><br>설정 화면의 "건의함"에서 지금 보이는 모습을 직접 촬영해 올려주세요. 검토 후 반영되면 다음에 오는 학생들에게도 도움이 됩니다.<br><br>' +
           '<b>⑧ 한/영 전환</b><br>설정 화면에서 "한글"/"영어" 버튼을 누르면 앱 전체 언어가 바로 바뀝니다.<br><br>' +
           '<b>💡 팁</b><br>검색이 안 되면 숫자만 정확히 입력했는지 확인해보고, 방향이 헷갈리면 사진 속 화살표와 실제 복도 모습을 나란히 비교해보세요. 불편한 점은 언제든 건의함으로 알려주세요.' },
    en:{ t:'📖 Favorites & Tips (2/2)',
         b:"<b>⑤ Favorites</b><br>Tap the star on a room screen to save it, and view it again with the ⭐ button at top right. Favoriting this semester's rooms early makes things much faster.<br><br>" +
           "<b>⑥ B1 Creative Zone</b><br>B1 has a Creative Zone. Tap \"B1\" in the floor selector to see the elevator, stairs, and the door leading out.<br><br>" +
           "<b>⑦ Photo looks different?</b><br>Go to \"Suggestion Box\" in Settings and upload a photo of what you actually see. Once reviewed, it helps future students too.<br><br>" +
           "<b>⑧ Switch language</b><br>In Settings, tap \"한글\"/\"영어\" to switch the whole app's language instantly.<br><br>" +
           "<b>💡 Tips</b><br>If search finds nothing, double-check the numbers you typed. If direction feels confusing, compare the photo's arrow with the real hallway. Feel free to report anything inconvenient via the Suggestion Box." } }
];
function guideRenderProg(){
  var wrap = document.getElementById('gProg');
  if(!wrap) return;
  wrap.innerHTML = GUIDE_PAGES.map(function(_,i){ return '<i class="'+(i<=guideIdx?'on':'')+'"></i>'; }).join('');
}
function guideRender(idx){
  if(typeof idx==='number') guideIdx = Math.max(0, Math.min(GUIDE_PAGES.length-1, idx));
  var p = GUIDE_PAGES[guideIdx];
  var d = (LANG==='ko') ? p.ko : p.en;
  var tEl = document.getElementById('gTitle'), bEl = document.getElementById('gBody');
  if(!tEl || !bEl) return;
  tEl.innerHTML = d.t;
  bEl.innerHTML = d.b;
  var scroller = document.getElementById('gScroll');
  if(scroller) scroller.scrollTop = 0;
  var pv = document.getElementById('gPv'), nx = document.getElementById('gNx');
  if(pv) pv.style.visibility = (guideIdx===0) ? 'hidden' : 'visible';
  if(nx){
    if(guideIdx === GUIDE_PAGES.length-1){
      nx.innerHTML = (LANG==='ko') ? '닫기' : 'Close';
      nx.onclick = function(){ go('sset'); };
    } else {
      nx.innerHTML = (LANG==='ko') ? '다음 ›' : 'Next ›';
      nx.onclick = function(){ guideNext(); };
    }
  }
  guideRenderProg();
}
function guideNext(){ guideRender(guideIdx+1); }
function guidePrev(){ guideRender(guideIdx-1); }

/* ========== 카테고리 (단어 추후 추가) ========== */
var CATEGORIES=[
  {ic:'🚪', name:{ko:'강의실',en:'Rooms'}, sub:{ko:'강의실 번호, 교수님 성함, 기타 등으로 찾기',en:'Search by room number, professor name, etc.'}, act:function(){
      clearSearch(); go('s3');
      var nq=document.getElementById('nq');
      if(nq) setTimeout(function(){ nq.focus(); }, 120);   // 화면 들어오면 바로 자판이 올라오게
    }},
  {ic:'🚻', name:{ko:'화장실',en:'Restroom'}, sub:{ko:'가장 가까운 화장실로 길안내',en:'Directions to the nearest restroom'}, act:function(){ pickToilet(); }},
  {ic:'📚', name:{ko:'크리에이티브 존',en:'Creative Zone'}, sub:{ko:'지하 1층 · 자유 열람 공간',en:'B1 · Free study space'}, act:function(){ pickZone(); }},
  {ic:'🚨', name:{ko:'비상계단',en:'Emergency Stairs'}, sub:{ko:'가장 가까운 비상계단으로 길안내',en:'Directions to the nearest emergency stairs'}, act:function(){ pickEmstair(); }},
  {ic:'🛠️', name:{ko:'추후 변경',en:'Coming soon'}, sub:{ko:'추후 업데이트 예정입니다',en:'This feature is coming in a future update.'}}
];
function t4TitleFor(t){
  if(!t) return '';
  if(t.kind==='toilet')  return (LANG==='ko') ? '화장실 위치' : 'Restroom location';
  if(t.kind==='zone')    return (LANG==='ko') ? '크리에이티브 존 위치' : 'Creative Zone location';
  if(t.kind==='emstair') return (LANG==='ko') ? '비상계단 위치' : 'Emergency stairs location';
  if(t.kind==='room')    return roomTitle(t.code) + ((LANG==='ko') ? ' 위치' : ' location');
  return '';
}
function openTarget(t, floor){
  target=t; curFloor=floor;
  if(typeof fpHideRoofAsk==='function') fpHideRoofAsk();  // 새 목적지를 고르면 옥상 확인 패널이 남아있지 않게
  /* v42 : QR로 출입문을 스캔했으면 그 문의 층에서 출발한다. 스캔 안 했으면 기존대로 1층. */
  startFloor = (typeof QRNAV!=='undefined' && QRNAV.floor()) || 1;   // 기본 출발층 = 1층(정문). 첫 방문자는 대개 정문에서 시작하므로. 다른 층이면 사용자가 직접 선택.
  document.getElementById('t4').textContent=t4TitleFor(t);
  // 카메라가 항상 건물 한가운데(0, 건물 Z중앙)만 보고 있어서, 목적지가 건물 양 끝(정문·서문 쪽)에
  // 있으면 목적지 이름표·강의실이 화면 가장자리에 걸려 잘리는 문제가 있었음 → 목적지 쪽으로
  // 시선을 어느 정도 옮긴다(완전히 목적지로만 쏠리면 건물 전체 모양이 안 보이므로 60%만 이동).
  if(typeof targetPos==='function'){
    var tp = targetPos();
    camTarget.x = tp.x*0.6;
    camTarget.z = (BUILDING_MID_Z + (tp.z-BUILDING_MID_Z)*0.6) * BUILDING_Z_STRETCH;
  }
  buildFloorPicker(); buildStartFloorPicker(); highlight3D(); startPersonTrip(); go('s4');
  // highlight3D()→layout()가 카메라 높이(camTarget.y)를 건물 세로 한가운데로 되돌려 놓기 때문에,
  // 목적지가 맨 위(5F)나 맨 아래(B1)처럼 끝쪽 층이면 층 번호·라벨이 화면 위/아래 끝에 걸려
  // 잘리는 문제가 있었음 → 출발층·목적지층의 중간 높이 쪽으로 절반만 옮겨서 보정한다.
  if(typeof lvIndex==='function' && typeof SP!=='undefined'){
    var midIdx = (lvIndex(startFloor) + lvIndex(target.floor)) / 2;
    var wantY = midIdx*SP + SLAB + 0.8;
    var defY = SP*(LEVELS.length-1)/2;
    camTarget.y = defY + (wantY-defY)*0.5;
  }
}
/* 화장실·크리에이티브 존은 번호 검색 화면을 거치지 않고 바로 들어오므로,
   뒤로가기도 '무엇을 찾으세요?' 화면으로 돌아가야 한다. */
function backFromS4(){
  go(target && target.kind!=='room' ? 'scat' : 's3');
}
/* 3D 화면 전체화면 모드 : 헤더·안내문·층 버튼 등을 숨기고 3D 캔버스만 화면 가득 채운다.
   유튜브 쇼츠처럼 안(좌측 상단 뒤로가기 · 그 오른쪽 이동경로 버튼)에서 바로 조작할 수 있게 한다. */
function enterFullscreen3D(){
  var s4=document.getElementById('s4'), ph=document.querySelector('.phone');
  if(s4) s4.classList.add('fsMode');
  if(ph) ph.classList.add('fsActive');
  resize3D();
  setTimeout(function(){ resize3D(); }, 80);
}
function exitFullscreen3D(){
  var s4=document.getElementById('s4'), ph=document.querySelector('.phone');
  if(s4) s4.classList.remove('fsMode');
  if(ph) ph.classList.remove('fsActive');
  resize3D();
  setTimeout(function(){ resize3D(); }, 80);
}
function pickToilet(){ openTarget({kind:'toilet', floor:1}, 1, '화장실 위치'); }
function pickZone(){ openTarget({kind:'zone', floor:'B1'}, 'B1', '크리에이티브 존 위치'); }
/* v146: 예전엔 어느 층에 있든 1층 비상계단으로 안내했다 →
   지금 서 있는 층의 비상계단(= 가장 가까운 비상계단)으로 안내한다. */
function pickEmstair(){
  var sf = (typeof startFloor!=='undefined' && startFloor) ? startFloor : 1;
  openTarget({kind:'emstair', floor:sf}, sf, '비상계단 위치');
}
function buildCats(){
  var box=document.getElementById('cats'); box.innerHTML='';
  CATEGORIES.forEach(function(c){
    var b=document.createElement('button');
    var nm = (LANG==='ko') ? c.name.ko : c.name.en;
    var sb = c.sub ? ((LANG==='ko') ? c.sub.ko : c.sub.en) : '';
    b.innerHTML='<span class="ic">'+c.ic+'</span>'
      +'<span class="txt"><span class="nm">'+nm+'</span>'
      +(sb?'<small>'+sb+'</small>':'')+'</span>';
    if(c.act) b.onclick=c.act; else b.style.opacity='0.45';
    box.appendChild(b);
  });
}

/* ========== 최근 기록 (강의실 검색) ========== */
/* 최대 개수 : 화면에 너무 많이 쌓이지 않도록 4개까지만 기억한다. */
var RECENT_MAX = 4;
/* 아이폰 등 일부 브라우저(특히 file:// 로 열었을 때)는 localStorage가 매번
   안정적으로 남아있지 않을 수 있다. 길안내를 마치고 강의실 찾기로 돌아왔을 때
   최근 기록이 사라져 보이는 문제를 막기 위해, 앱이 켜져 있는 동안은 메모리에도
   따로 들고 있다가(우선 사용) localStorage에는 "가능하면" 같이 저장해 둔다. */
var recentRoomsMem = null;
function loadRecent(){
  if(recentRoomsMem) return recentRoomsMem;
  var list = [];
  try{ list = JSON.parse(localStorage.getItem('recentRooms')||'[]'); }catch(e){ list = []; }
  recentRoomsMem = list;
  return recentRoomsMem;
}
function saveRecent(list){
  recentRoomsMem = list;
  try{ localStorage.setItem('recentRooms', JSON.stringify(list)); }catch(e){ /* 저장 실패해도 메모리엔 남아있음 */ }
}
function addRecent(entry){
  var list = loadRecent().filter(function(r){ return r.code!==entry.code; });
  list.unshift(entry);
  if(list.length>RECENT_MAX) list.length=RECENT_MAX;
  saveRecent(list);
}
function removeRecent(code){
  saveRecent(loadRecent().filter(function(r){ return r.code!==code; }));
  renderRecent();
}
function showRecentIfEmpty(){
  var nq=document.getElementById('nq');
  if(nq && !nq.value.trim()){
    var rw=document.getElementById('recentWrap'); if(rw) rw.classList.remove('hidden');
    renderRecent();
  }
}
/* 네이버 지도류 앱처럼, 각 기록 줄을 왼쪽으로 스와이프하면 삭제되게 한다.
   (누르면 열기 / X 버튼으로도 바로 삭제 가능하고, 스와이프는 추가 제스처) */
function attachSwipeDelete(el, onDelete){
  var startX=0, dx=0, dragging=false;
  el.addEventListener('touchstart', function(e){
    if(!e.touches || e.touches.length!==1) return;
    startX = e.touches[0].clientX; dx=0; dragging=true; el.style.transition='none';
  }, {passive:true});
  el.addEventListener('touchmove', function(e){
    if(!dragging) return;
    dx = e.touches[0].clientX - startX;
    if(dx>0) dx=0;                 // 왼쪽으로만 밀림
    if(dx<-120) dx=-120;
    el.style.transform='translateX('+dx+'px)';
  }, {passive:true});
  el.addEventListener('touchend', function(){
    if(!dragging) return;
    dragging=false; el.style.transition='transform .2s ease';
    if(dx < -70){
      el.style.transform='translateX(-110%)'; el.style.opacity='0';
      setTimeout(onDelete, 180);
    }else{
      el.style.transform='translateX(0)';
    }
    dx=0;
  });
}
function renderRecent(){
  var box=document.getElementById('recentList');
  if(!box) return;
  var list=loadRecent();
  box.innerHTML='';
  if(!list.length){
    var e=document.createElement('div'); e.className='recentEmpty';
    e.textContent = LANG==='ko' ? '최근 검색 기록이 없어요' : 'No recent searches';
    box.appendChild(e); return;
  }
  list.forEach(function(r){
    var it=document.createElement('div'); it.className='recentItem';
    var row=document.createElement('div'); row.className='rrow';
    var txt=document.createElement('span'); txt.className='rtxt'; txt.textContent = roomTitle(r.code) || r.title || r.code;
    row.innerHTML='<span class="ric">🕓</span>';
    row.appendChild(txt);
    var xBtn=document.createElement('button'); xBtn.className='rx'; xBtn.textContent='✕';
    xBtn.onclick=function(ev){ ev.stopPropagation(); removeRecent(r.code); };
    row.appendChild(xBtn);
    row.onclick=function(){ openSearchHit({code:r.code, floor:r.floor}); };
    attachSwipeDelete(row, function(){ removeRecent(r.code); });
    it.appendChild(row);
    box.appendChild(it);
  });
}
/* 최근 기록을 위로 스크롤할 때 아이폰에서 입력창의 자판이 같이 사라지는 문제 방지.
   목록 스크롤을 브라우저 기본 동작(overflow-y:auto) 대신 직접 손가락 이동량만큼
   scrollTop을 옮기는 방식으로 처리해서, 입력창이 포커스를 잃지 않게 한다. */
(function(){
  var list = document.getElementById('recentList');
  if(!list) return;
  var startX = 0, startY = 0, startTop = 0, touching = false, axis = null;
  list.addEventListener('touchstart', function(e){
    if(!e.touches || e.touches.length!==1) return;
    if(e.target && e.target.closest && e.target.closest('.rx')) return;   // 삭제 버튼은 그대로 동작
    touching = true; axis = null;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTop = list.scrollTop;
  }, {passive:true});
  list.addEventListener('touchmove', function(e){
    if(!touching || !e.touches || e.touches.length!==1) return;
    var dx = e.touches[0].clientX - startX, dy = e.touches[0].clientY - startY;
    if(!axis){
      if(Math.abs(dx)<6 && Math.abs(dy)<6) return;             // 방향이 아직 불명확하면 대기
      axis = Math.abs(dy) >= Math.abs(dx) ? 'v' : 'h';          // 세로면 목록 스크롤, 가로면 기존 '스와이프로 삭제' 제스처에 맡김
    }
    if(axis!=='v') return;
    e.preventDefault();   // 입력창 포커스를 유지한 채 목록만 스크롤
    list.scrollTop = startTop + (startY - e.touches[0].clientY);
  }, {passive:false});
  list.addEventListener('touchend', function(){ touching = false; axis = null; });
  list.addEventListener('touchcancel', function(){ touching = false; axis = null; });
})();

/* ========== 검색 ========== */
/* 번호·이름 통합 검색.
   전용 숫자 키패드를 없애고 휴대폰 기본 자판을 그대로 쓰므로
   한글·영문·숫자 전환이 자유롭다 → 번호칸과 이름칸을 나눌 이유가 없어져 하나로 합쳤다.
   숫자만 입력하면 호실번호에서, 글자가 섞이면 이름·용도에서 찾는다. */
var searchHits = [];
function roomSearch(qraw){
  var box=document.getElementById('nres');
  var err=document.getElementById('err');
  var recentWrap=document.getElementById('recentWrap');
  var q=(qraw||'').trim().toLowerCase().replace(/\s+/g,'');
  box.innerHTML=''; err.textContent=''; searchHits=[];
  if(!q){
    if(recentWrap) recentWrap.classList.remove('hidden');
    renderRecent();
    return;
  }
  if(recentWrap) recentWrap.classList.add('hidden');
  var isNum = /^[0-9]+$/.test(q);
  Object.keys(VALID_FULL5).forEach(function(code){
    var nm = ROOM_NAME[code] || '';
    var ok = isNum ? (code.indexOf(q) >= 0)
                   : (nm && nm.toLowerCase().replace(/\s+/g,'').indexOf(q) >= 0);
    if(ok) searchHits.push({code:code, nm:nm, floor:VALID_FULL5[code].floor,
                            head:(isNum && code.indexOf(q)===0) ? 0 : 1});
  });
  // 번호가 앞에서부터 맞는 것 → 낮은 층 → 호실 순
  searchHits.sort(function(a,b){ return a.head-b.head || a.floor-b.floor || (a.code<b.code?-1:1); });
  if(!searchHits.length){
    var d=document.createElement('div'); d.className='none';
    if(LANG==='ko'){
      d.textContent = isNum ? ('"'+qraw.trim()+'" 번호의 강의실이 없습니다.')
                            : ('"'+qraw.trim()+'" 검색 결과가 없습니다. 번호로도 찾아보세요.');
    } else {
      d.textContent = isNum ? ('No room found for "'+qraw.trim()+'".')
                            : ('No results for "'+qraw.trim()+'". Try searching by room number too.');
    }
    box.appendChild(d); return;
  }
  searchHits.slice(0,40).forEach(function(h){
    var b=document.createElement('button');
    b.innerHTML='<span class="nm">'+(rn(h.nm) || ((LANG==='ko')?'강의실':'Room'))+'</span>'
              + '<span class="rc">'+lvName(h.floor)+' '+h.code+'</span>';
    b.onclick=function(){ openSearchHit(h); };
    box.appendChild(b);
  });
}
function openSearchHit(h){
  document.getElementById('err').textContent='';
  addRecent({code:h.code, floor:h.floor, title:roomTitle(h.code)});
  openTarget({kind:'room', floor:h.floor, code:h.code}, h.floor);
}
/* 자판의 확인/검색 키 : 결과가 하나뿐이거나 번호가 딱 맞으면 바로 연다 */
function searchEnter(){
  var v=(document.getElementById('nq').value||'').trim();
  var exact = parseRoomInput(v);
  if(exact){ openSearchHit({code:exact.code, floor:exact.floor}); return; }
  if(searchHits.length===1){ openSearchHit(searchHits[0]); return; }
  if(!searchHits.length && v)
    document.getElementById('err').textContent=(LANG==='ko')
      ? '검색 결과가 없습니다. 번호 5자리나 이름을 확인해주세요.'
      : 'No results found. Please check the 5-digit number or the name.';
}

/* ========== 층 선택 버튼 ========== */
function buildFloorPicker(){
  var fp=document.getElementById('fp'); fp.innerHTML='';
  for(var i=LEVELS.length-1; i>=0; i--){
    (function(lv){
      var b=document.createElement('button');
      b.textContent=lvLabel(lv);
      if(target && lv===target.floor) b.classList.add('tgt');
      if(lv===curFloor) b.classList.add('on');
      b.onclick=function(){
        curFloor=lv;
        if(target && target.kind==='toilet' && lv!=='B1' && lv!=='R') target.floor=lv;
        if(target && target.kind==='emstair' && lv!=='B1' && lv!=='R') target.floor=lv;
        buildFloorPicker(); highlight3D();
        flyIntoFloor(lv, function(){ showFloorDetail(lv); });
      };
      fp.appendChild(b);
    })(LEVELS[i]);
  }
}

/* 출발층(지금 계신 층) 버튼 — B1~5F. 목적지 화면 진입 때마다 다시 그림. */
function buildStartFloorPicker(){
  var box=document.getElementById('sfp'); if(!box) return;
  box.innerHTML='';
  // 바로 위 '층 상세' 줄과 순서가 반대(오름차순)여서 같은 층 버튼 위치가 서로 달랐음
  // → 잘못 누르기 쉬웠으므로 위 줄과 똑같이 내림차순(5F…B1)으로 맞춘다.
  for(var i=LEVELS.length-1; i>=0; i--){
    /* 옥상은 엘리베이터가 안 서서 '출발층'로 고르면 경로 미리보기를 만들 수 없다 */
    if(LEVELS[i]==='R') continue;
    (function(lv){
      var b=document.createElement('button');
      b.textContent=lvLabel(lv);
      if(lv===startFloor) b.classList.add('on');
      b.onclick=function(){
        startFloor=lv;
        // 화장실·비상계단은 층마다 있으므로, 출발층을 바꾸면 목적지도 그 층 걸로 따라간다.
        // (1층은 원래도 그대로였으니 그대로 두고, 2~5층에서 엘리베이터 타고 1층 계단으로
        //  잘못 안내되던 문제를 고친다. 지하 1층은 비상계단·화장실이 없어서 그대로 1층 유지)
        if(target && (target.kind==='emstair' || target.kind==='toilet') && lv!=='B1') target.floor=lv;
        buildStartFloorPicker(); buildFloorPicker();
        highlight3D();            // 현재 위치 층을 흰색으로 다시 칠함
        buildRouteA();            // 경로도 현재 위치에서 출발하도록 갱신
        startPersonTrip();        // 사람도 그 층으로 옮겨 다시 이동 시작
      };
      box.appendChild(b);
    })(LEVELS[i]);
  }
}
