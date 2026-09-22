/* ══════════════════════════════════════════════════════════════
   사진 크게 보기 (v54)
   앱은 user-scalable=no 라서 브라우저 기본 확대가 막혀 있다.
   그래서 두 손가락 확대·두 번 탭·끌어서 이동을 직접 구현한다.
   변형은 transform: translate(x,y) scale(sc) 하나로 처리한다.
   ══════════════════════════════════════════════════════════════ */
var IZ = { sc:1, x:0, y:0, bw:0, bh:0, p0:null, drag:null, moved:false,
           lastTap:0, lastX:0, lastY:0, MIN:1, MAX:6 };

function izEl(id){ return document.getElementById(id); }

/* 화면에 실제로 그리기 — 사진이 화면 밖으로 달아나지 않게 이동 범위를 제한한다 */
function izApply(){
  var im = izEl('izImg'), st = izEl('izStage');
  if(!im || !st) return;
  var sw = st.clientWidth, sh = st.clientHeight;
  var mx = Math.max(0, (IZ.bw*IZ.sc - sw)/2);
  var my = Math.max(0, (IZ.bh*IZ.sc - sh)/2);
  IZ.x = Math.max(-mx, Math.min(mx, IZ.x));
  IZ.y = Math.max(-my, Math.min(my, IZ.y));
  im.style.transform = 'translate('+IZ.x.toFixed(1)+'px,'+IZ.y.toFixed(1)+'px) scale('+IZ.sc.toFixed(3)+')';
  var pct = izEl('izPct'); if(pct) pct.textContent = Math.round(IZ.sc*100) + '%';
  st.style.cursor = IZ.sc > 1.02 ? 'grab' : 'zoom-in';
}

/* 화면의 한 점(무대 중심 기준)을 붙잡은 채로 배율만 바꾼다 */
function izZoomAt(mx, my, target){
  target = Math.max(IZ.MIN, Math.min(IZ.MAX, target));
  IZ.x = mx - (mx - IZ.x) * (target/IZ.sc);
  IZ.y = my - (my - IZ.y) * (target/IZ.sc);
  IZ.sc = target;
  if(IZ.sc <= IZ.MIN + 0.001){ IZ.sc = IZ.MIN; IZ.x = 0; IZ.y = 0; }
  izApply();
}
function izPoint(cx, cy){
  var st = izEl('izStage'); if(!st) return {x:0,y:0};
  var r = st.getBoundingClientRect();
  return { x: cx - (r.left + r.width/2), y: cy - (r.top + r.height/2) };
}
function izStep(dir){ izZoomAt(0, 0, dir > 0 ? IZ.sc*1.5 : IZ.sc/1.5); }
function izReset(){ IZ.sc = 1; IZ.x = 0; IZ.y = 0; izApply(); }

function openZoom(url, cap){
  var box = izEl('imgZoom'), im = izEl('izImg'), cp = izEl('izCap'), hint = izEl('izHint');
  if(!box || !im || !url) return;
  if(cp) cp.textContent = cap || '';
  if(hint) hint.textContent = ('ontouchstart' in window)
    ? '두 손가락으로 확대 · 두 번 탭하면 확대/원래대로 · 끌어서 이동'
    : '마우스 휠로 확대 · 끌어서 이동 · 두 번 클릭하면 확대/원래대로';
  IZ.sc = 1; IZ.x = 0; IZ.y = 0; IZ.p0 = null; IZ.drag = null;
  im.style.transform = '';
  box.classList.add('on');
  im.onload = function(){
    var r = im.getBoundingClientRect();
    IZ.bw = r.width; IZ.bh = r.height;
    izApply();
  };
  im.src = url;
  if(im.complete && im.naturalWidth) im.onload();
  document.addEventListener('keydown', izKey);
}
function closeZoom(){
  var box = izEl('imgZoom'), im = izEl('izImg');
  if(box) box.classList.remove('on');
  if(im){ im.removeAttribute('src'); im.style.transform = ''; }   // 큰 사진을 메모리에서 놓아준다
  document.removeEventListener('keydown', izKey);
}
function izKey(e){ if(e.key === 'Escape' || e.keyCode === 27) closeZoom(); }

/* 관리자 건의함 카드에서 부르는 입구 — 사진과 함께 메모·AI 추정을 제목줄에 보여준다 */
function zoomFromSug(id){
  var s = (typeof sugFind === 'function') ? sugFind(id) : null;
  if(!s || !s.u) return;
  var parts = [];
  parts.push(s.note ? s.note : '메모 없음');
  if(s.ai && s.ai.code && typeof SUGAI !== 'undefined' && SUGAI.codeLabel){
    parts.push('AI 추정 ' + SUGAI.codeLabel(s.ai.code));
  }
  if(s.ai && s.ai.ocr && s.ai.ocr.floor){
    parts.push('🔢 번호판 ' + (s.ai.ocr.code || s.ai.ocr.raw || '') + ' → ' + s.ai.ocr.floor);
  }
  if(s.ts){
    var d = new Date(s.ts);
    parts.push((d.getMonth()+1)+'/'+d.getDate()+' '+(d.getHours()<10?'0':'')+d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes());
  }
  openZoom(s.u, parts.join(' · '));
}

/* ── 손가락·마우스 조작 ── */
(function(){
  function bind(){
    var st = izEl('izStage'), box = izEl('imgZoom');
    if(!st || !box || st.__izBound) return;
    st.__izBound = true;

    function dist(t){ var dx=t[0].clientX-t[1].clientX, dy=t[0].clientY-t[1].clientY; return Math.sqrt(dx*dx+dy*dy); }
    function mid(t){ return izPoint((t[0].clientX+t[1].clientX)/2, (t[0].clientY+t[1].clientY)/2); }

    st.addEventListener('touchstart', function(e){
      if(e.touches.length === 2){
        IZ.p0 = { d:dist(e.touches), sc:IZ.sc, x:IZ.x, y:IZ.y, m:mid(e.touches) };
        IZ.drag = null; IZ.moved = true;
        e.preventDefault();
      } else if(e.touches.length === 1){
        var t = e.touches[0], now = Date.now();
        IZ.drag = { x:t.clientX, y:t.clientY, ox:IZ.x, oy:IZ.y };
        IZ.moved = false;
        if(now - IZ.lastTap < 320 && Math.abs(t.clientX-IZ.lastX) < 30 && Math.abs(t.clientY-IZ.lastY) < 30){
          var p = izPoint(t.clientX, t.clientY);
          izZoomAt(p.x, p.y, IZ.sc > 1.05 ? 1 : 2.6);
          IZ.lastTap = 0; IZ.moved = true; IZ.drag = null;
          e.preventDefault();
        } else { IZ.lastTap = now; IZ.lastX = t.clientX; IZ.lastY = t.clientY; }
      }
    }, {passive:false});

    st.addEventListener('touchmove', function(e){
      if(e.touches.length === 2 && IZ.p0){
        var d = dist(e.touches), m = mid(e.touches);
        var sc = Math.max(IZ.MIN, Math.min(IZ.MAX, IZ.p0.sc * (d / (IZ.p0.d || 1))));
        var k = sc / IZ.p0.sc;
        IZ.x = IZ.p0.m.x - (IZ.p0.m.x - IZ.p0.x) * k + (m.x - IZ.p0.m.x);
        IZ.y = IZ.p0.m.y - (IZ.p0.m.y - IZ.p0.y) * k + (m.y - IZ.p0.m.y);
        IZ.sc = sc;
        izApply(); e.preventDefault();
      } else if(e.touches.length === 1 && IZ.drag && IZ.sc > 1.02){
        var t = e.touches[0];
        if(Math.abs(t.clientX-IZ.drag.x) > 4 || Math.abs(t.clientY-IZ.drag.y) > 4) IZ.moved = true;
        IZ.x = IZ.drag.ox + (t.clientX - IZ.drag.x);
        IZ.y = IZ.drag.oy + (t.clientY - IZ.drag.y);
        izApply(); e.preventDefault();
      }
    }, {passive:false});

    st.addEventListener('touchend', function(e){
      if(e.touches.length < 2) IZ.p0 = null;
      if(e.touches.length === 0) IZ.drag = null;
    });

    /* PC : 휠 확대 · 끌어서 이동 · 두 번 클릭 */
    st.addEventListener('wheel', function(e){
      e.preventDefault();
      var p = izPoint(e.clientX, e.clientY);
      izZoomAt(p.x, p.y, e.deltaY < 0 ? IZ.sc*1.18 : IZ.sc/1.18);
    }, {passive:false});
    st.addEventListener('mousedown', function(e){
      IZ.drag = { x:e.clientX, y:e.clientY, ox:IZ.x, oy:IZ.y }; IZ.moved = false;
      st.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', function(e){
      if(!IZ.drag || !izEl('imgZoom') || !izEl('imgZoom').classList.contains('on')) return;
      if(IZ.sc <= 1.02) return;
      if(Math.abs(e.clientX-IZ.drag.x) > 3 || Math.abs(e.clientY-IZ.drag.y) > 3) IZ.moved = true;
      IZ.x = IZ.drag.ox + (e.clientX - IZ.drag.x);
      IZ.y = IZ.drag.oy + (e.clientY - IZ.drag.y);
      izApply();
    });
    document.addEventListener('mouseup', function(){ IZ.drag = null; });
    st.addEventListener('dblclick', function(e){
      var p = izPoint(e.clientX, e.clientY);
      izZoomAt(p.x, p.y, IZ.sc > 1.05 ? 1 : 2.6);
      IZ.moved = true;
    });

    /* 사진 바깥(빈 곳)을 그냥 탭하면 닫기 — 끌던 중이었으면 닫지 않는다 */
    st.addEventListener('click', function(e){
      if(e.target && e.target.id === 'izImg') return;
      if(IZ.moved) { IZ.moved = false; return; }
      closeZoom();
    });
    /* 기기 회전·창 크기 변경 시 기준 크기를 다시 잰다 */
    window.addEventListener('resize', function(){
      if(!box.classList.contains('on')) return;
      var im = izEl('izImg'); if(!im || !im.src) return;
      var sc = IZ.sc, x = IZ.x, y = IZ.y;
      im.style.transform = '';
      var r = im.getBoundingClientRect();
      IZ.bw = r.width; IZ.bh = r.height; IZ.sc = sc; IZ.x = x; IZ.y = y;
      izApply();
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
