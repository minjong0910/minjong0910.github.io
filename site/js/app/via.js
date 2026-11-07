"use strict";
/* via.js — 강의실 찾기 → 「○층까지 어떻게 갈까요?」 [엘리베이터 | 중앙계단] → 3D 전체 건물도 (2026-11-07 사용자)
   11/05 견본(생성물\견본_엘리베이터_계단_고르기)의 「A · 사진 카드 두 장」을 실제 앱으로 옮겼다 —
   사용자 「QR 로 들어오든 기본 주소로 들어오든 고르는 창이 똑같이 떠야 한다」.

   · 강의실 찾기(s3)에서 결과를 누르면, 1층(출입문 · 1층 엘리베이터)에서 2~5층 강의실로 올라갈 때만 3D 로 가기 전에 묻는다.
     1층 강의실 · 다른 층에서 출발 · 즐겨찾기 · 공유 링크 · 이어 하기는 예전처럼 바로 3D.
     출입문 QR 로 들어왔든(?gate=) 기본 주소로 들어왔든 같은 조건이다(둘 다 출발 층 1).
   · 고른 것은 길안내 계단 길(guide.js GUIDE_VIA · b3nav_via)을 그대로 쓴다 — 길안내 화면 위 [엘리베이터 | 계단] 단추와 같은 값.
   · 3D 전체 건물도에도 「가는 방법 [엘리베이터 | 중앙계단]」 한 줄 — 거기서도 바꿀 수 있다.
   · 남은 것 : 3D 「▶ 경로 미리보기」 움직임은 아직 엘리베이터 길 그대로다(길안내 사진 · 문장은 고른 길). */
var VIACHOOSE = (function(){
  if(typeof openTarget !== 'function' || typeof buildSteps !== 'function' || typeof setGuideVia !== 'function') return { isOpen:function(){ return false; }, close:function(){} };
  function $(s, r){ return (r || document).querySelector(s); }
  function $$(s, r){ return [].slice.call((r || document).querySelectorAll(s)); }
  function mk(tag, cls, html){ var e = document.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function ko(){ return typeof LANG === 'undefined' || LANG === 'ko'; }
  function T(k, e){ return ko() ? k : e; }
  function phone(){ return $('.phone') || document.body; }

  /* 그림 — 길안내 화면(story.js)의 엘리베이터 · 계단 그림과 같은 모양, 색만 글자색을 따른다 */
  var LIFT = '<svg class="vi" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="8" y="5" width="32" height="38" rx="2"/><path d="M24 9 V39" stroke-width="2"/><path d="M12 20 L16 14 L20 20 Z M28 28 L32 34 L36 28 Z" fill="currentColor" stroke-width="1.5"/></svg>';
  var STAIRS = '<svg class="vi" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5 42 H15 V33 H24 V24 H33 V15 H43"/><path d="M8 25 L22 11 M13 10 H23 V20"/></svg>';

  function toast(t){
    $$('.syToast').forEach(function(e){ e.remove(); });
    var e = mk('div', 'syToast info'); e.textContent = t; phone().appendChild(e);
    setTimeout(function(){ e.classList.add('out'); }, 2400); setTimeout(function(){ e.remove(); }, 2900);
  }
  function photo(code){ try{ var c = phResolve(code), l = ROOM_PHOTOS[c]; return (l && l.length) ? l[0].u : ''; }catch(e){ return ''; } }
  /* 지금 출발 층 — 출입문을 정했으면 그 문의 층(1), 아니면 3D 화면 「현재 위치」와 같은 값(처음엔 1) */
  function startFl(){
    try{ if(typeof QRNAV !== 'undefined' && QRNAV.floor && QRNAV.floor()) return QRNAV.floor(); }catch(e){}
    return (typeof startFloor !== 'undefined' && startFloor) ? startFloor : 1;
  }
  function gateName(){ try{ return (QRNAV.gate && QRNAV.gate()) ? QRNAV.gateName() : ''; }catch(e){ return ''; } }
  /* 고르는 창을 띄울 길인가 — 1층에서 2~5층 강의실로 올라갈 때 (guide.js guideStairsOK 와 같은 조건, 강의실만) */
  function needAsk(t){
    return !!(t && t.kind === 'room' && typeof t.floor === 'number' && t.floor >= 2 && t.floor <= 5 && startFl() === 1 &&
              typeof ROOM_PHOTOS !== 'undefined' && ROOM_PHOTOS['ES1'] && ROOM_PHOTOS['EV' + t.floor]);
  }
  /* 두 길의 단계 수 — 실제 길안내의 buildSteps 로 잠깐 만들어 본다(값은 되돌려 놓는다) */
  function stepsFor(t, via){
    var oT = target, oS = startFloor, oV = GUIDE_VIA;
    try{ target = t; startFloor = startFl(); GUIDE_VIA = via; return buildSteps(); }
    catch(e){ return []; }
    finally{ target = oT; startFloor = oS; GUIDE_VIA = oV; }
  }
  function chosenBefore(){ try{ var v = localStorage.getItem('b3nav_via'); return (v === 'ev' || v === 'stairs') ? v : null; }catch(e){ return null; } }

  /* ── ① 고르는 창 (사진 카드 두 장) ── */
  var asking = false;
  function close(){ $$('.vcDim, .vcWrap').forEach(function(e){ e.remove(); }); asking = false; }
  function isOpen(){ return !!$('.vcWrap'); }
  function ask(t, floor){
    close(); asking = true;
    var ev = stepsFor(t, 'ev'), st = stepsFor(t, 'stairs'), last = chosenBefore();
    var fl = lvName(t.floor), ttl = roomTitle(t.code), gn = gateName();
    var from = gn ? (gn + ' → ') : T('1층 → ', '1F → ');
    var opts = [
      {v:'ev', ic:LIFT, name:T('엘리베이터', 'Elevator'), what:T('엘리베이터를 타고 ' + fl + '까지', 'Ride up to ' + lvLabel(t.floor)),
       note:T('편하게 · 짐이 있거나 다리가 불편할 때', 'Easy · with bags or if walking is hard'), n:ev.length, ph:photo('EV1'), cap:T('1층 엘리베이터 앞', '1F elevator')},
      {v:'stairs', ic:STAIRS, name:T('중앙계단', 'Main stairs'), what:T('엘리베이터 바로 옆 계단으로 걸어서 ' + fl + '까지', 'Walk up the stairs next to the elevator to ' + lvLabel(t.floor)),
       note:T('엘리베이터를 기다리지 않아요', 'No waiting for the elevator'), n:st.length, ph:photo('ES1'), cap:T('1층 중앙계단', '1F main stairs')}
    ];
    var html = '<div class="vcCard"><div class="vcHead"><span class="vcTo">' + esc(from) + '<b>' + esc(ttl) + '</b></span>' +
      '<button class="vcX" type="button" aria-label="' + T('닫기', 'Close') + '">✕</button></div>' +
      '<h4>' + esc(T(fl + '까지 어떻게 갈까요?', 'How do you want to go up?')) + '</h4>' +
      '<p class="vcSub">' + T('고른 길로 3D 화면과 길안내를 보여 드려요', 'The 3D view and directions follow your choice') + '</p>' +
      '<div class="vcGrid">' + opts.map(function(o){
        return '<button class="vcOpt' + (o.v === last ? ' last' : '') + '" type="button" data-v="' + o.v + '">' +
          (o.v === last ? '<span class="vcTag">' + T('지난번에 고른 길', 'Last time') + '</span>' : '') +
          '<span class="vcPh"><img alt="" src="' + esc(o.ph) + '"><span class="vcCap">' + esc(o.cap) + '</span></span>' +
          '<span class="vcNm">' + o.ic + esc(o.name) + '</span>' +
          '<span class="vcWhat">' + esc(o.what) + '</span>' +
          '<span class="vcMeta"><b>' + o.n + T('단계', ' steps') + '</b><span class="nt"> · ' + esc(o.note) + '</span></span></button>';
      }).join('') + '</div>' +
      '<p class="vcFoot">' + T('고른 것은 이 폰에 기억해요 · 3D 화면과 길안내 화면 위에서도 바꿀 수 있어요',
                               'Remembered on this phone · you can switch on the 3D and directions screens too') + '</p></div>';
    var dim = mk('div', 'vcDim'); phone().appendChild(dim);
    var wrap = mk('div', 'vcWrap', html); wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); phone().appendChild(wrap);
    dim.onclick = close;                                         // 닫으면 강의실 찾기에 그대로 있다
    $('.vcX', wrap).onclick = close;
    wrap.addEventListener('click', function(e){ if(e.target === wrap) close(); });
    $$('[data-v]', wrap).forEach(function(b){ b.onclick = function(){
      var v = b.getAttribute('data-v');
      setGuideVia(v); close();
      toast(v === 'stairs' ? T('🚶 중앙계단으로 가는 길을 보여 드려요', '🚶 Showing the way by the main stairs') : T('🛗 엘리베이터로 가는 길을 보여 드려요', '🛗 Showing the way by elevator'));
      _open(t, floor);
    }; });
  }
  var _open = window.openTarget;
  window.openTarget = function(t, floor){
    var scr = $('.screen.on');
    if(!asking && scr && scr.id === 's3' && needAsk(t)){ ask(t, floor); return; }
    return _open.apply(this, arguments);
  };

  /* ── ② 3D 전체 건물도 : 「가는 방법」 한 줄 ── */
  var s4 = $('#s4'), row = null;
  if(s4){
    row = mk('div', 'vcRow'); row.hidden = true;
    s4.insertBefore(row, $('.triprow', s4) || null);
    row.addEventListener('click', function(e){
      var b = e.target.closest('button[data-v]'); if(!b) return;
      var v = b.getAttribute('data-v'); if(v === GUIDE_VIA) return;
      setGuideVia(v); paintRow();
      toast(v === 'stairs' ? T('🚶 중앙계단으로 바꿨어요', '🚶 Switched to the main stairs') : T('🛗 엘리베이터로 바꿨어요', '🛗 Switched to the elevator'));
    });
  }
  function paintRow(){
    if(!row) return;
    var ok = typeof guideStairsOK === 'function' && guideStairsOK();
    row.hidden = !ok; if(!ok) return;
    var st = GUIDE_VIA === 'stairs';
    row.innerHTML = '<span class="lb">' + T('가는 방법', 'Go by') + '</span><div class="seg">' +
      '<button type="button" data-v="ev" class="' + (st ? '' : 'on') + '" aria-pressed="' + !st + '">' + LIFT + T('엘리베이터', 'Elevator') + '</button>' +
      '<button type="button" data-v="stairs" class="' + (st ? 'on' : '') + '" aria-pressed="' + st + '">' + STAIRS + T('중앙계단', 'Stairs') + '</button></div>';
  }
  /* 화면이 바뀌면(뒤로가기 포함) 고르는 창은 닫고, 3D 화면에 오면 「가는 방법」 줄을 다시 그린다 */
  var _go = window.go;
  window.go = function(id){
    close();
    var r = _go.apply(this, arguments);
    if(id === 4 || id === 's4') setTimeout(paintRow, 0);
    return r;
  };
  /* 3D 화면 「현재 위치」 층을 바꾸면 계단 길이 되는지 다시 본다 */
  document.addEventListener('click', function(e){ if(e.target.closest && e.target.closest('#sfp')) setTimeout(paintRow, 60); }, true);

  return { isOpen:isOpen, close:close, paintRow:paintRow };
})();
