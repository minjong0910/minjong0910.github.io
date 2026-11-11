"use strict";
/* 견본 /sample/blocked-fallback/ — 권한이 막힌 폰에서도 「그냥 되게」 (2026-11-11 사용자 「샘플로 해줘」)
   실제 앱(index.html 그대로)을 띄우고 이 파일만 맨 끝에 더한다. 실제 앱 파일은 하나도 바꾸지 않는다.

   · 마이크(말로 찾기 오브) : 휴대폰이 이 사이트 마이크를 막아 두었으면(permissions 'denied') 오브를 누르는 순간 음성 인식 대신
     「말하거나 적어 주세요」 글자 칸을 열고 키보드를 띄운다 — 키보드의 🎤(삼성 · 구글 · 아이폰 키보드)는 브라우저가 아니라 키보드 앱의
     마이크 권한을 써서 사이트가 막혀 있어도 된다. 적힌 말은 오브와 똑같이 「여기가 맞나요?」로 이어진다(VOICE.think).
     막힘인 줄 몰랐다가 음성 인식이 「허락 없음」 · 「이 브라우저는 안 돼요」로 멈추면 그때 같은 글자 칸으로 바꾼다.
   · 카메라(출입문 QR 스캔) : 카메라가 막혀 있으면 긴 안내 대신 누르는 순간 휴대폰 기본 카메라 앱을 연다(앱에 원래 있던 「사진으로 QR 찍기」 —
     카메라 앱으로 찍은 사진을 읽어서 권한이 필요 없다). 실패 화면의 긴 「차단」 안내도 큰 단추 하나로. */
(function(){
  var D = document, T = (window.B3UI && B3UI.T) ? B3UI.T : function(a){ return a; };
  var PERM = {camera: '', microphone: ''};
  ['camera', 'microphone'].forEach(function(n){
    try{ navigator.permissions.query({name: n}).then(function(p){ PERM[n] = p.state; try{ p.onchange = function(){ PERM[n] = p.state; }; }catch(e){} }, function(){}); }catch(e){}
  });

  /* ── 견본 표시 ── */
  var tag = D.createElement('div');
  tag.textContent = '견본';
  tag.style.cssText = 'position:fixed;top:calc(8px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:3000;background:#FF4D8D;color:#fff;font:700 12px Pretendard,"Malgun Gothic",sans-serif;padding:3px 10px;border-radius:999px;pointer-events:none;';
  D.body.appendChild(tag);

  /* ════════ 마이크 : 글자 칸(키보드 🎤) ════════ */
  var css = D.createElement('style');
  css.textContent =
    '.bfDim{position:absolute;inset:0;z-index:960;background:rgba(5,10,18,.62);}' +
    '.bfCard{position:absolute;left:16px;right:16px;top:18%;z-index:961;background:#12253A;border:1.5px solid #4FC3F7;border-radius:16px;padding:16px 16px 14px;color:#EAF4FF;font-family:Pretendard,"Malgun Gothic",sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.45);word-break:keep-all;}' +
    '.bfCard b{display:block;font-size:17px;margin-bottom:10px;}' +
    '.bfCard input{width:100%;box-sizing:border-box;font-size:17px;padding:13px 12px;border-radius:10px;border:1.5px solid #2A4D73;background:#0B0E13;color:#fff;outline:none;}' +
    '.bfCard input:focus{border-color:#4FC3F7;}' +
    '.bfCard small{display:block;color:#A9C1D9;font-size:13px;margin:9px 2px 12px;}' +
    '.bfCard .big{width:100%;}' +
    'html.lt .bfCard{background:#fff;color:#0F1B2D;} html.lt .bfCard input{background:#F3F6FA;color:#0F1B2D;} html.lt .bfCard small{color:#44546A;}';
  D.head.appendChild(css);

  var open = null;
  function closeType(){ if(open){ open.dim.remove(); open.card.remove(); clearTimeout(open.timer); open = null; } }
  function openType(focusNow){
    closeType();
    var ph = D.querySelector('.phone') || D.body;
    var dim = D.createElement('div'); dim.className = 'bfDim';
    var card = D.createElement('div'); card.className = 'bfCard';
    card.innerHTML = '<b>' + T('가고 싶은 곳을 말하거나 적어 주세요', 'Say or type where you want to go') + '</b>' +
      '<input type="search" enterkeyhint="search" autocomplete="off" placeholder="' + T('예 : 13524 · 김현섭 교수님 · 3층 화장실', 'e.g. 13524 · restroom 3F') + '">' +
      '<small>🎤 ' + T('키보드의 마이크 단추를 눌러 말해도 돼요', 'You can also tap the mic key on your keyboard') + '</small>' +
      '<button class="big" type="button">' + T('찾기', 'Search') + '</button>';
    ph.appendChild(dim); ph.appendChild(card);
    var inp = card.querySelector('input');
    open = {dim: dim, card: card, timer: 0};
    function go(){
      var v = inp.value.trim(); if(!v) { inp.focus(); return; }
      closeType();
      try{ inp.blur(); }catch(e){}
      if(typeof VOICE !== 'undefined' && VOICE.think) VOICE.think([v], v);   // 오브와 같은 「여기가 맞나요?」
    }
    card.querySelector('.big').onclick = go;
    inp.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); go(); } });
    /* 키보드 🎤로 말하면 글자가 한꺼번에 들어온다 — 1.5초 멈추면 저절로 찾기 */
    inp.addEventListener('input', function(){ clearTimeout(open && open.timer); if(open && inp.value.trim().length >= 2) open.timer = setTimeout(go, 1500); });
    dim.onclick = closeType;
    if(focusNow){ try{ inp.focus(); }catch(e){} }     // 누른 그 순간이라 키보드가 바로 뜬다
    return inp;
  }

  /* 오브 · 말풍선을 누르는 순간 — 마이크가 막혀 있으면 음성 인식 대신 글자 칸(앞에서 가로챈다) */
  D.addEventListener('click', function(e){
    var t = e.target && e.target.closest && e.target.closest('.vsOrb, .vsHint');
    if(!t || PERM.microphone !== 'denied') return;
    if(typeof VOICE !== 'undefined' && VOICE.isOpen && VOICE.isOpen()) return;     // 이미 열린 것을 닫는 누름은 그대로
    e.stopImmediatePropagation(); e.preventDefault();
    openType(true);
  }, true);

  /* 막힘인 줄 몰랐다가 음성 인식이 멈추면(허락 없음 · 이 브라우저는 안 됨) — 그 말풍선 대신 글자 칸 */
  setInterval(function(){
    var bub = D.querySelector('.vsBub.on');
    if(!bub || open) return;
    var s = bub.textContent || '';
    if(/허락|allow the microphone|음성 인식이 안 돼요|not supported/i.test(s)){
      try{ VOICE.close(); }catch(e){}
      openType(false);
    }
  }, 250);

  /* ════════ 카메라 : 휴대폰 카메라 앱으로 ════════ */
  function photoOff(){
    var off = D.getElementById('qrOff'), vid = D.getElementById('qrVideo'), fr = D.getElementById('qrFrame');
    if(vid) vid.style.display = 'none'; if(fr) fr.style.display = 'none';
    if(!off) return;
    off.style.display = 'block';
    off.innerHTML = '<b>' + T('휴대폰 카메라로 QR 을 찍어 주세요', 'Take a photo of the QR with your camera') + '</b>' +
      '<span>' + T('찍으면 바로 출발 문이 정해져요', 'The gate is set as soon as you take it') + '</span>' +
      '<button class="qrFix" type="button" onclick="QRNAV.pickFile()">📷 ' + T('사진으로 QR 찍기', 'Take a photo of the QR') + '</button>';
    off.setAttribute('data-bf', '1');
  }
  if(typeof QRNAV !== 'undefined' && QRNAV.open){
    var _open = QRNAV.open;
    QRNAV.open = function(){
      if(PERM.camera === 'denied'){                       // 막혀 있으면 누른 그 순간 카메라 앱을 연다
        if(typeof go === 'function') go('sqr');
        photoOff();
        try{ QRNAV.pickFile(); }catch(e){}
        return;
      }
      return _open.apply(this, arguments);
    };
  }
  /* 카메라를 켜려다 「차단」으로 멈춘 화면의 긴 안내 → 큰 단추 하나 */
  setInterval(function(){
    var off = D.getElementById('qrOff');
    if(!off || off.style.display === 'none' || off.getAttribute('data-bf') === '1') return;
    if(/차단되어|is blocked/.test(off.textContent || '')) photoOff();
  }, 250);
  var _obs = D.getElementById('qrOff');
  if(_obs) new MutationObserver(function(){ if(_obs.getAttribute('data-bf') === '1' && !/사진으로 QR|photo of the QR/.test(_obs.textContent || '')) _obs.removeAttribute('data-bf'); }).observe(_obs, {childList: true, subtree: true});

  window.BLOCKFIX = {perm: PERM, openType: openType, closeType: closeType, photoOff: photoOff};
})();
