# -*- coding: utf-8 -*-
"""v50 → v51 : 폰에서 렉 없애기
  1. 메인 3D(4번 화면) 렌더 루프 — 그 화면이 보일 때만 돈다 (지금까지는 앱을 켜는 순간부터 끝까지 매 프레임)
  2. 건물 3D(2번 화면, iframe) — 화면을 벗어나면 멈추고 들어오면 다시 돈다 (iframe 안 코드는 건드리지 않음)
  3. 폰에서는 4번 화면 그리기를 초당 30장으로 제한 (조작 이벤트가 끼어들 여유 확보)
  4. 앱이 백그라운드로 가면 모든 3D 정지, 돌아오면 보고 있던 화면 것만 재개
  5. 안 보이는 화면의 CSS 애니메이션 정지
  6. 앱 시작 때 16MB HTML 복사본 만들던 것 — 웹에서는 안 만들고 내보내기 때 내려받는다
  7. 승인 사진 내려받기 — 500KB Firebase SDK 대신 가벼운 REST 한 번 (일반 사용자는 SDK를 안 받는다)
  8. 건물 3D 미리 만들기 1.2초 → 2.5초 (첫 화면이 자리 잡은 뒤)
"""
import io, sys
SRC='/home/claude/gunsan_b3nav_DB_v50.html'; DST='/home/claude/gunsan_b3nav_PERF_v51.html'
s=io.open(SRC,encoding='utf-8').read(); orig=len(s); done=[]
def patch(name, old, new, count=1):
    global s
    n=s.count(old)
    if n!=count: print('  [실패] %s : 앵커 %d개'%(name,n)); sys.exit(1)
    s=s.replace(old,new,count); done.append(name); print('  [OK] %s'%name)

# ═══ 1+3. 메인 3D(목적지 화면 s4) 루프 — s4일 때만, 폰에서는 30fps ═══
patch('animate 게이트',
"""function animate(){
  requestAnimationFrame(animate);
""",
"""/* v51 : 이 루프는 s4(목적지 3D)가 보일 때만 돈다. 예전에는 앱을 켜는 순간부터 어느 화면에 있든
   매 프레임 건물 전체(드로우콜 600~700)를 그려서 첫 화면·목록·건의함까지 전부 버벅였다.
   다른 화면에서는 다음 프레임을 예약하지 않고 빠져나가고(animateRunning=false),
   go('s4')가 animateStart()로 다시 켠다. (s5의 animateB와 같은 방식) */
var animateRunning = false;
var A3D_MOBILE = ('ontouchstart' in window) || navigator.maxTouchPoints>0 || /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);
var A3D_LAST = 0, A3D_SKIP = false;
function animateStart(){ if(!animateRunning){ animateRunning = true; animate(); } }
function animate(){
  if(!animateRunning) return;
  requestAnimationFrame(animate);
  /* 폰에서는 초당 30장으로 제한 — 상태 갱신(사람 이동·회전·반짝임)은 매 프레임 하고 그리기만 거른다.
     (사람 이동은 시간 기준(dt)이라 그리기를 걸러도 속도는 그대로) */
  if(A3D_MOBILE){
    var _now = performance.now();
    if(_now - A3D_LAST < 26){ A3D_SKIP = true; } else { A3D_SKIP = false; A3D_LAST = _now; }
  }
""")
patch('animate 렌더 스킵',
"""    });
  }
  renderer.render(scene,camera);
}
/* 건물 전체 뷰에서 보고 싶은 곳으로 카메라 중심(camTarget) 자체를 옮기는 '이동(팬)'.""",
"""    });
  }
  if(!A3D_SKIP) renderer.render(scene,camera);
}
/* 건물 전체 뷰에서 보고 싶은 곳으로 카메라 중심(camTarget) 자체를 옮기는 '이동(팬)'.""")

patch('go()에서 s4·s2 루프 제어',
"""  if(id==='s4') resize3D();
  if(id==='s4') updateFavBtn();""",
"""  if(id==='s4') resize3D();
  if(id==='s4') updateFavBtn();
  /* v51 : 목적지 3D 루프는 s4에서만 */
  if(typeof animateRunning!=='undefined'){
    if(id==='s4') animateStart(); else animateRunning=false;
  }
  /* v51 : 건물 확인 3D(iframe)도 s2를 벗어나면 멈춘다 */
  if(id!=='s2' && typeof bld3DLeave==='function') bld3DLeave();""")

# ═══ 2+8. 건물 확인 3D(iframe) — 들어갈 때만 돌고, 나가면 멈춤 ═══
# iframe 안 코드는 그대로 두고, 그 창의 requestAnimationFrame을 부모가 감싼다.
# (srcdoc이라 같은 출처 → 부모가 iframe 창의 전역을 만질 수 있다. 3D 파일을 나중에 바꿔도 그대로 동작)
patch('iframe 훅 설치',
"""    fr.onload = function(){
      var ld = document.getElementById('b3dLoad');
      if(ld) ld.style.display = 'none';
    };""",
"""    fr.onload = function(){
      var ld = document.getElementById('b3dLoad');
      if(ld) ld.style.display = 'none';
      bld3DHook(fr);                                   // v51
    };""")
patch('iframe 재개/정지 함수',
"""function bld3DEnter(){
  try{
    var fr = document.getElementById('b3dFrame');
    var w  = fr && fr.contentWindow;
    if(w && typeof w.enterView === 'function') w.enterView();
  }catch(e){}
}""",
"""/* v51 : 건물 3D(iframe)는 2번 화면에 있을 때만 그린다.
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
}""")
patch('iframe 미리 만들기 시점',
"""window.addEventListener('load', function(){ setTimeout(mountBld3D, 1200); });""",
"""window.addEventListener('load', function(){ setTimeout(mountBld3D, 2500); });   // v51 : 첫 화면이 자리 잡은 뒤""")

# ═══ 4. 탭이 뒤로 가면 모든 3D 정지, 돌아오면 재개 ═══
patch('백그라운드 정지',
"""/* ========== 시작 ========== */""",
"""/* v51 : 앱이 백그라운드로 가면 3D 루프를 전부 멈추고, 돌아오면 보고 있던 화면 것만 다시 켠다 */
document.addEventListener('visibilitychange', function(){
  var s4on = document.getElementById('s4') && document.getElementById('s4').classList.contains('on');
  var s5on = document.getElementById('s5') && document.getElementById('s5').classList.contains('on');
  var s2on = document.getElementById('s2') && document.getElementById('s2').classList.contains('on');
  if(document.hidden){
    if(typeof animateRunning!=='undefined') animateRunning = false;
    if(typeof animateBRunning!=='undefined') animateBRunning = false;
    if(typeof bld3DLeave==='function') bld3DLeave();
  }else{
    if(s4on && typeof animateStart==='function') animateStart();
    if(s5on && typeof animateBRunning!=='undefined' && !animateBRunning && typeof rB!=='undefined' && rB){ animateBRunning=true; animateB(); }
    if(s2on && typeof bld3DEnter==='function') bld3DEnter();
  }
});

/* ========== 시작 ========== */""")

# ═══ 5. 안 보이는 화면의 CSS 애니메이션 정지 ═══
patch('숨은 화면 CSS 애니메이션 정지',
"""  .screen.on{opacity:1;visibility:visible;transform:none;}""",
"""  .screen.on{opacity:1;visibility:visible;transform:none;}
  /* v51 : 보이지 않는 화면 안의 CSS 애니메이션(스캔 레이저·배너 등)은 멈춰 둔다 */
  .screen:not(.on) *{animation-play-state:paused !important;}""")

# ═══ 6. 시작 시 16MB 문서 복사(PRISTINE_HTML)를 웹에서는 하지 않음 ═══
patch('PRISTINE 지연',
"""var PRISTINE_HTML = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;""",
"""/* v51 : 원본 HTML 사본은 '사진 담아서 저장'(개발용)에만 필요하다. 예전에는 앱을 켤 때마다
   16MB 문서를 통째로 문자열로 복사해 두었다(시간 + 메모리). 파일로 연 개발 모드에서만
   즉시 복사하고, 웹에서는 필요할 때 서버에서 원본을 받아 쓴다. */
var PRISTINE_HTML = (location.protocol === 'file:') ? ('<!DOCTYPE html>\\n' + document.documentElement.outerHTML) : null;
function phPristine(cb){
  if(PRISTINE_HTML){ cb(PRISTINE_HTML); return; }
  fetch(location.href.split('#')[0], {cache:'no-store'}).then(function(r){ if(!r.ok) throw 'http'+r.status; return r.text(); }).then(function(t){
    PRISTINE_HTML = t; cb(t);
  })['catch'](function(){
    PRISTINE_HTML = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML; cb(PRISTINE_HTML);
  });
}""")
patch('phExport 지연 사용',
"""function phExport(){
  if(!phCount()){ alert('먼저 사진을 넣어주세요.'); return; }
  var json = JSON.stringify(ROOM_PHOTOS).replace(/</g, '\\\\u003c');""",
"""function phExport(){
  if(!phCount()){ alert('먼저 사진을 넣어주세요.'); return; }
  phPristine(phExportWith);
}
function phExportWith(PRISTINE_HTML){
  var json = JSON.stringify(ROOM_PHOTOS).replace(/</g, '\\\\u003c');""")

# ═══ 7. 승인 사진 내려받기 : REST 우선, 실패하면 예전 SDK 경로 ═══
patch('loadPhotos REST',
"""  /* 앱 시작 시 : 서버에 올라온 승인 사진을 내려받아 앱 사진에 합친다 */
  function loadPhotos(){
    if(!online()) return Promise.resolve(0);
    return ensure().then(function(){
      return db.collection(COL_PH).get();
    }).then(function(snap){
      var n = 0;
      var items = [];
      snap.forEach(function(d){ var x = d.data(); x.pid = d.id; items.push(x); });
      items.sort(""",
"""  /* v51 : Firestore REST 응답의 값 표기({stringValue:..} 등)를 보통 값으로 */
  function fromValue(v){
    if(!v || typeof v !== 'object') return v;
    if('stringValue' in v) return v.stringValue;
    if('integerValue' in v) return Number(v.integerValue);
    if('doubleValue' in v) return v.doubleValue;
    if('booleanValue' in v) return v.booleanValue;
    if('nullValue' in v) return null;
    if('timestampValue' in v) return Date.parse(v.timestampValue);
    if('mapValue' in v) return fromFields((v.mapValue && v.mapValue.fields) || {});
    if('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(fromValue);
    return null;
  }
  function fromFields(f){ var o = {}; for(var k in f) o[k] = fromValue(f[k]); return o; }
  /* v51 : 승인 사진 목록은 공개 읽기라 SDK 없이 REST 한 번으로 받는다
     (Firebase SDK 500KB를 길안내만 쓰는 사람 폰에 내려받지 않게). 실패하면 예전 SDK 경로로. */
  function restPhotos(){
    if(typeof fetch !== 'function') return Promise.reject('nofetch');
    var url = 'https://firestore.googleapis.com/v1/projects/' + CFG.projectId + '/databases/(default)/documents/' + COL_PH +
              '?pageSize=300&key=' + encodeURIComponent(CFG.apiKey);
    return fetch(url).then(function(r){ if(!r.ok) throw 'http'+r.status; return r.json(); }).then(function(j){
      var items = [];
      (j.documents || []).forEach(function(d){
        var x = fromFields(d.fields || {}); x.pid = String(d.name || '').split('/').pop(); items.push(x);
      });
      return items;
    });
  }
  function sdkPhotos(){
    return ensure().then(function(){ return db.collection(COL_PH).get(); }).then(function(snap){
      var items = [];
      snap.forEach(function(d){ var x = d.data(); x.pid = d.id; items.push(x); });
      return items;
    });
  }

  /* 앱 시작 시 : 서버에 올라온 승인 사진을 내려받아 앱 사진에 합친다 */
  function loadPhotos(){
    if(!online()) return Promise.resolve(0);
    return restPhotos()['catch'](function(){ return sdkPhotos(); }).then(function(items){
      var n = 0;
      items.sort(""")

io.open(DST,'w',encoding='utf-8').write(s)
print('\n원본 %d → %d bytes (%+d) · 패치 %d개'%(orig,len(s),len(s)-orig,len(done)))
