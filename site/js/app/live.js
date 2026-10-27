/* 발표장 실시간 「지금 켜 둔 사람」 (2026-10-28) — 발표장 QR(site/live/go.html)로 들어온 폰만.
   go.html 이 이 창(sessionStorage b3live)에 발표 이름 · 폰 번호(무작위 16자, 개인정보 아님)를 적어 두면,
   화면이 보이는 동안 15초마다 서버 live/<발표>/here/<번호> 의 시각 t 를 새로 쓰고, 화면이 가려지거나 닫히면 지운다.
   발표 화면(site/live/)은 t 가 40초 안인 것만 센다 — 지우기가 서버에 못 닿아도 40초 뒤면 빠진다.
   표시가 없는 보통 이용자(출입문 QR · 바로 연 사람)에게는 아무것도 하지 않는다 — 서버에 아무것도 보내지 않음.
   2시간이 지나면 그만둔다. 앱의 다른 파일에 기대지 않는다. */
(function(){
  'use strict';
  var S = null;
  try{ S = JSON.parse(sessionStorage.getItem('b3live') || 'null'); }catch(e){ S = null; }
  if(!S || !/^[a-z0-9-]{1,20}$/.test(S.e || '') || !/^[A-Za-z0-9]{16}$/.test(S.p || '') || !window.fetch) return;
  var LIFE = 2 * 3600 * 1000;
  if(!(Date.now() - (+S.s || 0) < LIFE)){ try{ sessionStorage.removeItem('b3live'); }catch(e){} return; }
  var PROJ = 'minjong-b974c', KEY = 'AIzaSyBclnF6tX3FbuKxjBPaxVjkHF1rfRZAjnw';
  var BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJ + '/databases/(default)/documents';
  var PATH = 'live/' + S.e + '/here/' + S.p;
  var timer = null;
  function beat(){
    if(!(Date.now() - S.s < LIFE)){ off(true); return; }
    fetch(BASE + ':commit?key=' + KEY, {method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({writes: [{update: {name: 'projects/' + PROJ + '/databases/(default)/documents/' + PATH, fields: {}},
        updateMask: {fieldPaths: []}, updateTransforms: [{fieldPath: 't', setToServerValue: 'REQUEST_TIME'}]}]})})['catch'](function(){});
  }
  function on(){ if(timer) return; beat(); timer = setInterval(beat, 15000); }
  function off(closing){
    if(timer){ clearInterval(timer); timer = null; }
    try{ fetch(BASE + '/' + PATH + '?key=' + KEY, {method: 'DELETE', keepalive: !!closing})['catch'](function(){}); }catch(e){}
  }
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'visible') on(); else off(false); });
  window.addEventListener('pagehide', function(){ off(true); });
  window.addEventListener('pageshow', function(){ if(document.visibilityState === 'visible') on(); });
  if(document.visibilityState === 'visible') on();
})();
