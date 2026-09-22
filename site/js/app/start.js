"use strict";
/* start.js — 앱 시작(bootApp) — 글꼴을 기다린 뒤 3D·화면을 준비한다
   (예전 한 파일 main.js 의 16538~16561줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
/* ========== 시작 ========== */
/* 3D 안 글씨는 캔버스에 '그려 박는' 방식이라, 웹폰트가 도착하기 전에 그리면
   예전 글씨체로 굳어버린다. 폰트를 먼저 기다렸다가 시작하되,
   인터넷이 없거나 늦으면 1.5초 뒤 그냥 시작한다(그 경우 기존 맑은 고딕으로 표시). */
function bootApp(){
  init3D();
  initB();
  buildCats();
  phRender();
  applyLang();
  window.addEventListener('resize',function(){resize3D();resizeB();});
  go(1);
}
if(document.fonts && document.fonts.load){
  var waitFont = Promise.all([
    document.fonts.load('700 44px Pretendard'),
    document.fonts.load('400 16px Pretendard')
  ]);
  var timeout = new Promise(function(r){ setTimeout(r, 1500); });
  Promise.race([waitFont, timeout]).then(bootApp, bootApp);
}else{
  bootApp();
}
