"use strict";
/* topmenu.js — 오른쪽 위 세 줄(☰) 메뉴 · 밝은 화면 (2026-10-19 사용자 요청)

   · 오른쪽 위에는 [인터넷] [☰] 두 개만 둔다. 아이콘이 많아 붐비던 것을 줄이고 화면 제목 자리를 넓힌다.
     처음으로 · 즐겨찾기 · 설정 · 밝은 화면은 ☰ 를 누르면 세로 목록으로 펼쳐진다(사용자가 견본을 보고 고름).
   · 펼치는 데 0.22초 — 사용자가 움직이는 견본으로 0.12~0.4초를 비교해 보고 고른 값(app.css --tmDur). 닫힐 때는 0.7배.
   · 밝은 화면 = <html class="lt">. 햇빛 아래에서 잘 보이게 흰 바탕 · 진한 글자 · 진한 파랑(app.css 「밝은 화면」 묶음).
     글자 크기는 그대로(사용자 — 지금도 글씨·그림이 화면을 많이 차지한다). 고른 값은 이 폰에 기억(b3nav_theme).
     앱이 켜질 때 깜빡이지 않게 class 는 head 에서 가장 먼저 읽는 pwa.js 가 붙인다. */
var TOPMENU = (function(){
  var KEY = 'b3nav_theme';
  function $(id){ return document.getElementById(id); }
  function isLight(){ return document.documentElement.classList.contains('lt'); }
  function paintSw(){
    var s = $('tmSw'); if(!s) return;
    s.classList.toggle('on', isLight());
    s.parentNode.setAttribute('aria-checked', isLight() ? 'true' : 'false');
  }
  function setLight(on){
    document.documentElement.classList.toggle('lt', !!on);
    try{ localStorage.setItem(KEY, on ? 'light' : 'dark'); }catch(e){}
    var m = document.querySelector('meta[name="theme-color"]'); if(m) m.setAttribute('content', on ? '#EEF3F8' : '#0B0E13');
    /* 층 상세(5번) 지도의 바탕 — 3D 그림이라 CSS 로는 안 바뀐다 */
    if(typeof sB !== 'undefined' && sB && sB.background) sB.background.setHex(on ? 0xDCE4EE : 0x0E1217);
    paintSw();
  }
  function isOpen(){ var w = $('tmMenu'); return !!(w && w.classList.contains('tmOpen')); }
  function setOpen(on){
    var w = $('tmMenu'), b = $('tmBtn'); if(!w || !b) return;
    if(on === isOpen()) return;
    w.classList.toggle('tmOpen', on);
    b.setAttribute('aria-expanded', on ? 'true' : 'false');
    b.innerHTML = (typeof LUCIDE !== 'undefined') ? LUCIDE.svg(on ? 'x' : 'menu') : (on ? '✕' : '☰');
  }
  function toggle(e){ if(e) e.stopPropagation(); setOpen(!isOpen()); }
  /* 목록에서 고르면 닫고 그 화면으로 */
  function pick(fn){ setOpen(false); if(typeof fn === 'function') fn(); }
  /* 밝은 화면 스위치 — 메뉴는 열어 둔 채로 바뀌는 걸 바로 보여 준다 */
  function light(e){ if(e) e.stopPropagation(); setLight(!isLight()); }
  /* 메뉴 밖을 누르면 닫기만 한다(그 아래 버튼은 눌리지 않게)
     2026-10-20 종합검진 : 아이폰 사파리는 빈 곳 · 글자처럼 누를 수 없는 곳을 탭하면 click 을 아예 안 보내서 메뉴가 안 닫혔다
     → 손가락이 닿는 순간(pointerdown)에 닫고, 곧이어 오는 click 은 삼킨다(그 아래 버튼이 눌리지 않게). */
  var swallowUntil = 0;
  document.addEventListener('pointerdown', function(e){
    if(!isOpen()) return;
    var w = $('tmMenu'); if(w && w.contains(e.target)) return;
    setOpen(false); swallowUntil = Date.now() + 600;
  }, true);
  document.addEventListener('click', function(e){
    var w = $('tmMenu'), inside = !!(w && w.contains(e.target));
    if(isOpen()){ if(inside) return; setOpen(false); e.stopPropagation(); e.preventDefault(); return; }
    if(!inside && Date.now() < swallowUntil){ swallowUntil = 0; e.stopPropagation(); e.preventDefault(); }
  }, true);
  /* 관리자 화면 · QR 카메라 화면 · 사진 위치 고르기는 밝은 화면에서도 어두운 채로 (.dk — app.css 「밝은 화면」) */
  ['sqr', 'spick', 'sph', 'sadmin', 'sphmgr', 'spwgate', 'phsort', 'saidat'].forEach(function(id){
    var el = $(id); if(el) el.classList.add('dk');
  });
  /* 층 상세 지도는 앱이 켜진 뒤에 만들어지므로, 밝은 화면이면 그때 한 번 더 맞춘다 */
  window.addEventListener('load', function(){ setTimeout(function(){ if(isLight()) setLight(true); }, 0); });
  paintSw();
  return { toggle:toggle, pick:pick, light:light, close:function(){ setOpen(false); }, isOpen:isOpen,
           setLight:setLight, isLight:isLight };
})();
