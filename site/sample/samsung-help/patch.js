"use strict";
/* 견본 /sample/samsung-help/ — 삼성 인터넷에서만 : 오브를 누르고 5초 안에 음성 인식이 안 되면 말풍선에 「잘 안 들렸어요」 + 마이크 켜는 길 (2026-11-11 사용자)
   사용자 : 「오브를 눌렀는데 5초 안에 음성 인식이 안 되면, 5초 뒤 『잘 안 들렸어요, 구슬을 다시 누르고 말해 주세요』에 덧붙여
            『주소창 왼쪽 자물쇠 아이콘 → 권한 → 카메라 · 마이크 · 알림을 「허용」』을 쉽게 알아들을 수 있게. 아이폰은 지금도 잘 되니 삼성만」
   실제 앱(index.html 그대로)을 띄우고 이 파일만 맨 끝에 더한다 — 실제 앱 파일은 바꾸지 않는다.
   · 삼성 인터넷(UA 에 SamsungBrowser)일 때만 켠다. 다른 폰에서 미리 보려면 주소 끝에 &samsung=1.
   · 오브를 누른 때부터 5초 동안 말이 들어오지 않으면(글자가 한 자도 안 나옴 · 오류로 멈춤) 5초가 지난 순간 듣기를 멈추고 말풍선을 안내로 바꾼다.
     5초 안에 음성 인식이 오류로 먼저 멈춰도 그 오류 말풍선은 5초까지 「말씀해주세요」로 둔다(사용자 : 5초 후에).
   · 5초 안에 말이 글자로 나오기 시작하면 아무것도 하지 않는다(원래대로 「여기가 맞나요?」). */
(function(){
  var D = document;
  var ON = /SamsungBrowser/.test(navigator.userAgent) || /[?&]samsung=1/.test(location.search);

  var tag = D.createElement('div');
  tag.textContent = '견본 · 판 1' + (ON ? ' · 삼성' : '');
  tag.style.cssText = 'position:fixed;top:calc(8px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:3000;background:#FF4D8D;color:#fff;font:700 12px Pretendard,"Malgun Gothic",sans-serif;padding:3px 10px;border-radius:999px;pointer-events:none;';
  D.body.appendChild(tag);
  if(!ON){ window.SAMSUNGHELP = {on: false}; return; }                // 아이폰 · 크롬 등은 지금 그대로

  var css = D.createElement('style');
  css.textContent =
    '.vsBub .shHelp{margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,154,92,.55);font-size:14px;line-height:1.5;color:#E7F6FF;font-weight:600;text-align:left;}' +
    '.vsBub .shHelp em{text-align:center;}' +
    'body.shOn .vsHint{display:none !important;}' +
    '.vsBub .shHelp em{display:block;font-style:normal;color:#FFB27A;font-weight:800;margin-bottom:6px;}' +
    '.vsBub .shHelp ol{margin:0;padding:0;list-style:none;}' +
    '.vsBub .shHelp li{display:flex;gap:8px;align-items:flex-start;margin:5px 0;}' +
    '.vsBub .shHelp li i{flex:none;width:20px;height:20px;border-radius:50%;background:#FF9A5C;color:#101A26;font-style:normal;font-weight:900;font-size:12px;display:flex;align-items:center;justify-content:center;margin-top:1px;}' +
    '.vsBub .shHelp b{color:#FFFFFF;}' +
    'html.lt .vsBub .shHelp{color:#0F1B2D;} html.lt .vsBub .shHelp b{color:#0F1B2D;}';
  D.head.appendChild(css);

  var HELP =
    '<b style="font-size:17px;">잘 안 들렸어요</b>' +
    '<small style="color:#C9D6E3;">구슬을 다시 누르고 말해 주세요</small>' +
    '<div class="shHelp"><em>그래도 안 되면 — 마이크를 켜 주세요</em><ol>' +
      '<li><i>1</i><span>화면 위 주소(minjong0910…) <b>왼쪽 🔒 자물쇠</b>를 눌러요</span></li>' +
      '<li><i>2</i><span><b>「권한」</b>을 눌러요</span></li>' +
      '<li><i>3</i><span><b>카메라 · 마이크 · 알림</b>을 모두 <b>「허용」</b>으로 바꿔요</span></li>' +
      '<li><i>4</i><span>이 화면으로 돌아와 <b>구슬을 다시 눌러요</b></span></li>' +
    '</ol></div>';
  var ASK = '<span class="ask">가시고 싶은 목적지를 말씀해주세요<i></i><i></i><i></i></span>';

  var watch = null;                                                   // {t0, timer}
  function stopWatch(){ if(watch){ clearInterval(watch.timer); watch = null; } }
  function showHelp(){
    stopWatch();
    try{ VOICE.close(); }catch(e){}                                    // 듣기를 멈춘다(어두운 막도 걷힘)
    setTimeout(function(){
      var bub = D.querySelector('.vsBub'); if(!bub) return;
      bub.innerHTML = HELP; bub.classList.add('warn'); bub.classList.add('on');
      D.body.classList.add('shOn');                                     // 안내가 떠 있는 동안 「눌러서 목적지를…」 말풍선은 숨김
    }, 30);
  }
  function hideHelp(){
    var bub = D.querySelector('.vsBub');
    if(bub && bub.querySelector('.shHelp')){ bub.classList.remove('on'); bub.classList.remove('warn'); }
    D.body.classList.remove('shOn');
  }
  D.addEventListener('click', function(e){
    /* 안내가 떠 있을 때 안내 밖을 누르면 안내를 닫는다(누른 것은 그대로 — 구슬이면 다시 듣기) */
    if(D.body.classList.contains('shOn') && !(e.target && e.target.closest && e.target.closest('.vsBub'))) hideHelp();
    var t = e.target && e.target.closest && e.target.closest('.vsOrb, .vsHint');
    if(!t) return;
    if(typeof VOICE !== 'undefined' && VOICE.isOpen && VOICE.isOpen()){ stopWatch(); return; }   // 듣는 중에 한 번 더 누름 = 끝내기 — 원래대로
    stopWatch();
    var t0 = Date.now();
    watch = {t0: t0, timer: setInterval(function(){
      var bub = D.querySelector('.vsBub'), card = D.querySelector('.vsCard.on');
      if(card){ stopWatch(); return; }                                  // 「여기가 맞나요?」까지 갔으면 성공
      if(bub && bub.classList.contains('on') && !bub.classList.contains('warn') && !bub.querySelector('.ask') && (bub.textContent || '').trim()){ stopWatch(); return; }   // 말이 글자로 나오는 중 = 성공
      if(Date.now() - t0 >= 5000){ showHelp(); return; }
      /* 5초 전에 오류로 먼저 멈췄으면 — 5초까지는 「말씀해주세요」로 둔다 */
      if(bub && bub.classList.contains('warn') && !bub.querySelector('.shHelp')){ bub.classList.remove('warn'); bub.innerHTML = ASK; bub.classList.add('on'); }
    }, 100)};
  }, true);

  window.SAMSUNGHELP = {on: ON, showHelp: showHelp};
})();
