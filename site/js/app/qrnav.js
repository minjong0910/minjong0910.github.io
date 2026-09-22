var QRNAV = (function(){
  'use strict';

  /* ── 출입문 정의 ─────────────────────────────────────────────
     floor : 그 문으로 들어왔을 때의 층. 3호관은 4개 문이 모두 1층이지만,
             경사지 건물이라 문마다 층이 다르면 이 숫자만 바꾸면 된다.
     sub   : 앱 안 BLD 사진의 세부위치 태그(사진을 찾아 보여주기 위함).
             '내부' 사진을 쓰는 이유 — QR은 문 안쪽에 붙이므로 스캔한
             사람이 실제로 보고 있는 장면과 같아야 확인이 쉽다.        */
  var GATES = {
    MAIN: {ko:'정문', en:'Front Gate', floor:1, sub:'정문내부'},
    BACK: {ko:'후문', en:'Back Gate',  floor:1, sub:'후문내부'},
    EAST: {ko:'동문', en:'East Gate',  floor:1, sub:'동문내부'},
    WEST: {ko:'서문', en:'West Gate',  floor:1, sub:'서문내부'}
  };

  var PREFIX  = 'B3NAV1:BLD:';      // 순수 텍스트 QR
  var KEEP_MS = 3*60*60*1000;       // 스캔 결과 유지 시간(3시간)

  var stream=null, rafId=null, detector=null, loopOn=false;
  var pending=null;                 // 확인 화면에서 대기 중인 문 키
  var entry=null;                   // 확정된 출입문 {key, ts}

  /* ── 저장·복원 ── */
  try{
    var raw = localStorage.getItem('qrEntry');
    if(raw){
      var e = JSON.parse(raw);
      if(e && GATES[e.key] && (Date.now()-e.ts) < KEEP_MS) entry = e;
    }
  }catch(err){}

  function save(){
    try{
      if(entry) localStorage.setItem('qrEntry', JSON.stringify(entry));
      else localStorage.removeItem('qrEntry');
    }catch(err){}
  }

  function ko(){ return (typeof LANG==='undefined' || LANG==='ko'); }
  function $(id){ return document.getElementById(id); }
  function say(msg, isErr){
    var el=$('qrStat'); if(!el) return;
    el.textContent = msg||'';
    el.classList.toggle('err', !!isErr);
  }

  /* ── QR 문자열 해석 ───────────────────────────────────────────
     받아들이는 형식
       B3NAV1:BLD:MAIN                       ← 지금 인쇄하는 형식
       https://…/q/BLD.MAIN                  ← 서버 도입 후 형식
       B3NAV1:BLD:MAIN:a7f3c1                ← 서명이 붙어도 무시하고 인식
     서버가 없어도 문자열만으로 위치가 나오므로 오프라인에서 그대로 동작한다. */
  function parse(text){
    if(!text) return null;
    var t = String(text).trim().toUpperCase();
    var m = t.match(/B3NAV\d*\s*:\s*BLD\s*:\s*([A-Z]+)/);
    if(m && GATES[m[1]]) return m[1];
    m = t.match(/\/Q\/BLD[.\-]([A-Z]+)/);          // URL 형식
    if(m && GATES[m[1]]) return m[1];
    for(var k in GATES){                            // 최후 : 코드만 들어있는 경우
      if(t === k) return k;
    }
    return null;
  }

  /* ── 화면 열기 ─────────────────────────────────────────────────
     ★ 핵심 : 권한 요청(getUserMedia)을 사용자가 버튼을 누른 '바로 그 순간'에
     보낸다. 화면 전환(go)을 먼저 하면 브라우저가 "사용자 조작으로 시작된
     요청"으로 보지 않아 동의창을 그냥 무시해 버리는 경우가 있다.
     그래서 요청 → 화면 전환 → 결과 처리 순서로 바꿨다.               */
  function open(){
    pending = null;
    var req = null;
    if(camPossible()){
      try{ req = navigator.mediaDevices.getUserMedia(CAM_SPEC); }catch(e){ req = null; }
    }
    if(typeof go==='function') go('sqr');
    say('');
    if(req) attach(req);
    else    startCam();          // 요청 자체를 못 보낸 경우 — 원인별 안내로
  }
  function close(){ stopCam(); if(typeof go==='function') go('s1'); }

  /* ── 카메라 ─────────────────────────────────────────────────── */
  var CAM_SPEC = {
    video:{ facingMode:{ideal:'environment'}, width:{ideal:1280}, height:{ideal:720} },
    audio:false
  };

  function secure(){
    return window.isSecureContext ||
           location.protocol==='https:' ||
           location.hostname==='localhost' || location.hostname==='127.0.0.1';
  }
  function camPossible(){
    return secure() && navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
  }

  /* 브라우저마다 카메라 권한을 되돌리는 위치가 다르다 */
  function resetHint(){
    var ua = navigator.userAgent;
    if(/iPhone|iPad|iPod/.test(ua))
      return ko() ? '주소창 왼쪽 <b>ᴀA</b> → 웹사이트 설정 → 카메라 → 허용'
                  : 'Tap <b>aA</b> in the address bar → Website Settings → Camera → Allow';
    if(/SamsungBrowser/.test(ua))
      return ko() ? '주소창 왼쪽 <b>자물쇠</b> → 권한 → 카메라 → 허용'
                  : 'Lock icon in the address bar → Permissions → Camera → Allow';
    return ko() ? '주소창 왼쪽 <b>자물쇠</b>(또는 ⓘ) → 권한 → 카메라 → 허용'
                : 'Lock icon (or ⓘ) in the address bar → Permissions → Camera → Allow';
  }

  /* 화면 아래에 붙는 작은 진단 줄 — 문제가 생겼을 때 원인을 바로 알 수 있다 */
  function diag(state){
    var proto = location.protocol.replace(':','');
    return '<span class="qrDiag">' + proto +
           (state ? ' · ' + (ko()?'권한 ':'perm ') + state : '') + '</span>';
  }

  /* 안내 화면
     body 아래에 「📷 사진으로 QR 찍기」 큰 버튼을 항상 함께 보여준다.
     이 방식은 휴대폰 기본 카메라 앱을 여는 것이라 웹 카메라 권한이
     전혀 필요 없다 — 권한이 막혀 있어도 무조건 동작하는 길이다. */
  function showOff(title, body, opts){
    opts = opts || {};
    var off=$('qrOff'), vid=$('qrVideo'), fr=$('qrFrame');
    if(vid) vid.style.display='none';
    if(fr)  fr.style.display='none';
    if(!off) return;
    var html = '<b>'+title+'</b><span>'+body+'</span>' +
      '<button class="qrFix" onclick="QRNAV.pickFile()">📷 ' +
        (ko()?'사진으로 QR 찍기':'Take a photo of the QR') + '</button>';
    if(opts.retry){
      html += '<button class="qrFix ghost" onclick="QRNAV.retry()">' +
              (ko()?'카메라 권한 다시 요청하기':'Ask for camera permission again') + '</button>';
    }
    html += diag(opts.state);
    off.style.display='block';
    off.innerHTML = html;
  }

  /* 권한 상태 조회 (지원하는 브라우저에서만) */
  function permState(cb){
    if(!navigator.permissions || !navigator.permissions.query){ cb(''); return; }
    try{
      navigator.permissions.query({name:'camera'})
        .then(function(p){ cb(p.state); })['catch'](function(){ cb(''); });
    }catch(e){ cb(''); }
  }

  /* 요청 결과 처리 */
  function attach(req){
    var off=$('qrOff'), vid=$('qrVideo'), fr=$('qrFrame');
    if(off) off.innerHTML = '<b>'+(ko()?'카메라를 준비하는 중…':'Preparing camera…')+'</b><span>'+
                            (ko()?'「허용」을 눌러주세요.':'Please tap Allow.')+'</span>';
    req.then(function(st){
      stream = st;
      vid.srcObject = st;
      vid.setAttribute('playsinline','');        // 아이폰에서 전체화면으로 튀는 것 방지
      return vid.play();
    }).then(function(){
      if(off) off.style.display='none';
      vid.style.display='block';
      if(fr) fr.style.display='block';
      say(ko()?'출입문에 붙은 QR을 사각형 안에 맞춰주세요':'Line up the door QR inside the frame');
      beginLoop();
    })['catch'](function(err){
      failed(err && err.name || '');
    });
  }

  /* 실패 원인별 안내 */
  function failed(name){
    permState(function(state){
      var title, msg, retry = true;

      if(name==='NotAllowedError' && state==='denied'){
        /* 브라우저가 이미 '거부'로 기억하고 있어서 동의창이 다시 뜨지 않는 상태.
           이 경우만큼은 설정에서 직접 되돌려야 한다. */
        title = ko()?'카메라가 차단되어 있어요':'The camera is blocked';
        msg   = ko()?'이 사이트의 카메라가 <b>차단</b>으로 저장돼 있어서<br>동의창이 다시 뜨지 않아요.<br><br>'+resetHint()+'<br><br>바꾼 뒤 맨 아래 <b>↻ 카메라 다시 시도</b>를 눌러주세요.<br><br><span style="color:#5D6B80">번거로우면 아래 「📷 사진으로 QR 찍기」가<br>권한 없이 바로 됩니다.</span>'
                    :'The camera is saved as <b>Blocked</b> for this site,<br>so the prompt no longer appears.<br><br>'+resetHint()+'<br><br>Then tap <b>Retry camera</b> at the bottom.<br><br><span style="color:#5D6B80">Or just use "Take a photo of the QR" — no permission needed.</span>';
        retry = false;
      } else if(name==='NotAllowedError'){
        title = ko()?'카메라 권한이 필요해요':'Camera permission needed';
        msg   = ko()?'아래 버튼을 누르면 동의창이 다시 떠요.<br>「허용」을 눌러주세요.'
                    :'Tap below to bring the prompt back, then choose Allow.';
      } else if(name==='NotFoundError' || name==='OverconstrainedError'){
        title = ko()?'카메라를 찾지 못했어요':'No camera found';
        msg   = ko()?'이 기기에서 쓸 수 있는 카메라가 없어요.<br>사진으로 인식하거나 문을 직접 선택해 주세요.'
                    :'No usable camera on this device.<br>Scan from a photo or pick a gate manually.';
        retry = false;
      } else if(name==='NotReadableError'){
        title = ko()?'카메라를 다른 앱이 쓰고 있어요':'The camera is in use';
        msg   = ko()?'카메라를 쓰는 다른 앱을 닫고 다시 시도해 주세요.'
                    :'Close the other app using the camera and try again.';
      } else if(location.protocol === 'file:'){
        /* HTML 파일 하나로 배포하는 이 앱에서 가장 흔한 경우 */
        title = ko()?'파일로 열면 카메라가 막혀요':'The camera is blocked for local files';
        msg   = ko()?'브라우저는 HTML 파일을 직접 열었을 때<br>카메라를 열어주지 않아요.<br><br><span style="color:#5D6B80">웹 주소(https)로 올리면 바로 열립니다.<br>지금은 아래 방법을 써주세요.</span>'
                    :'Browsers block the camera when a file is opened directly.<br><br><span style="color:#5D6B80">Hosting over https fixes it. For now, use the option below.</span>';
        retry = false;
      } else {
        title = ko()?'카메라를 열 수 없어요':'Cannot open the camera';
        msg   = ko()?'잠시 뒤 다시 시도해 주세요.':'Please try again in a moment.';
      }
      showOff(title, msg, {retry:retry, state:state});
    });
  }

  /* 버튼(다시 시도)에서 부르는 진입점 — 여기서도 사용자 조작 직후에 요청한다 */
  function startCam(){
    if(!secure()){
      showOff(ko()?'카메라를 쓸 수 없는 환경이에요':'Camera is unavailable here',
              ko()?'브라우저 보안 정책 때문에 이 화면에서는<br>카메라가 열리지 않아요.<br><br><span style="color:#5D6B80">웹 주소(https)로 올리면 바로 열립니다.</span>'
                  :'Browser security policy prevents the camera here.<br><br><span style="color:#5D6B80">Hosting over https fixes it.</span>',
              {state:'insecure'});
      return;
    }
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      showOff(ko()?'이 브라우저는 카메라를 지원하지 않아요':'This browser has no camera support',
              ko()?'사진으로 인식하거나 문을 직접 선택해 주세요.':'Scan from a photo or pick a gate manually.');
      return;
    }
    var req;
    try{ req = navigator.mediaDevices.getUserMedia(CAM_SPEC); }
    catch(e){ failed(e && e.name || ''); return; }
    attach(req);
  }

  function stopCam(){
    loopOn=false;
    if(rafId){ cancelAnimationFrame(rafId); rafId=null; }
    if(stream){
      stream.getTracks().forEach(function(t){ try{ t.stop(); }catch(e){} });
      stream=null;
    }
    var vid=$('qrVideo'); if(vid){ try{ vid.srcObject=null; }catch(e){} }
  }

  function retry(){ stopCam(); startCam(); }

  /* ── 인식 루프 : BarcodeDetector 우선, 없으면 jsQR ── */
  function beginLoop(){
    loopOn = true;
    if('BarcodeDetector' in window && !detector){
      try{ detector = new window.BarcodeDetector({formats:['qr_code']}); }catch(e){ detector=null; }
    }
    var cv = document.createElement('canvas');
    var cx = cv.getContext('2d', {willReadFrequently:true});
    var busy = false, tick = 0;

    function step(){
      if(!loopOn) return;
      rafId = requestAnimationFrame(step);
      var vid = $('qrVideo');
      if(!vid || vid.readyState < 2 || busy) return;
      tick++;
      if(tick % 4) return;                          // 초당 약 15회로 제한 (발열·배터리 절약)

      if(detector){
        busy = true;
        detector.detect(vid).then(function(codes){
          busy=false;
          if(codes && codes.length) handle(codes[0].rawValue);
        })['catch'](function(){ busy=false; detector=null; });
        return;
      }
      /* jsQR 폴백 — 긴 변 480px로 줄여서 계산량을 낮춘다 */
      var vw=vid.videoWidth, vh=vid.videoHeight;
      if(!vw || !vh) return;
      var scale = Math.min(1, 480/Math.max(vw,vh));
      cv.width = Math.round(vw*scale); cv.height = Math.round(vh*scale);
      cx.drawImage(vid, 0, 0, cv.width, cv.height);
      try{
        var img = cx.getImageData(0,0,cv.width,cv.height);
        var res = window.jsQR && window.jsQR(img.data, img.width, img.height, {inversionAttempts:'dontInvert'});
        if(res && res.data) handle(res.data);
      }catch(e){}
    }
    step();
  }

  /* ── 인식 결과 처리 ── */
  function handle(text){
    var key = parse(text);
    if(!key){
      say(ko()?'3호관 QR이 아니에요. 출입문에 붙은 QR을 찍어주세요.'
             :'Not a Building 3 QR. Please scan the one on the door.', true);
      return;
    }
    stopCam();
    if(navigator.vibrate){ try{ navigator.vibrate(60); }catch(e){} }
    showConfirm(key);
  }

  /* ── 사진 파일로 인식 (카메라 권한이 막힌 환경용) ── */
  function pickFile(){ var el=$('qrFile'); if(el){ el.value=''; el.click(); } }
  function onFile(input){
    var f = input && input.files && input.files[0];
    if(!f) return;
    say(ko()?'사진을 확인하는 중…':'Reading the photo…');
    var url = URL.createObjectURL(f);
    var im = new Image();
    im.onload = function(){
      var scale = Math.min(1, 1000/Math.max(im.width, im.height));
      var cv = document.createElement('canvas');
      cv.width = Math.round(im.width*scale); cv.height = Math.round(im.height*scale);
      var cx = cv.getContext('2d', {willReadFrequently:true});
      cx.drawImage(im, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      var res = null;
      try{
        var d = cx.getImageData(0,0,cv.width,cv.height);
        res = window.jsQR && window.jsQR(d.data, d.width, d.height);
      }catch(e){}
      if(res && res.data) handle(res.data);
      else say(ko()?'사진에서 QR을 찾지 못했어요. 더 가까이서 다시 찍어주세요.'
                  :'No QR found in the photo. Try again from closer up.', true);
    };
    im.onerror = function(){
      URL.revokeObjectURL(url);
      say(ko()?'사진을 열지 못했어요. 다른 사진으로 시도해 주세요.'
             :'Could not open the photo. Try another one.', true);
    };
    im.src = url;
  }

  /* ── 수동 선택 ── */
  function manual(key){ if(!GATES[key]) return; stopCam(); showConfirm(key); }

  /* ── 확인 화면 ── */
  function gatePhoto(sub){
    /* BLD 사진 8장 중 이 문의 '내부' 사진을 찾는다.
       파일명·캡션에 '(정문내부)' 처럼 괄호로 태그가 들어 있다. */
    try{
      var list = (typeof ROOM_PHOTOS!=='undefined') && ROOM_PHOTOS['BLD'];
      if(!list || !list.length) return null;
      var exact = '('+sub+')';
      for(var i=0;i<list.length;i++){
        var p=list[i], tag=(p.cap||'')+' '+(p.n||'');
        if(tag.indexOf(exact) !== -1) return p.u;
      }
      var outer = '('+sub.replace('내부','')+')';    // 내부 사진이 없으면 바깥 사진
      for(var j=0;j<list.length;j++){
        var q=list[j], tg=(q.cap||'')+' '+(q.n||'');
        if(tg.indexOf(outer) !== -1) return q.u;
      }
    }catch(e){}
    return null;
  }

  function showConfirm(key){
    pending = key;
    var g = GATES[key];
    if(typeof go==='function') go('sqrok');

    var nm=$('qrOkName'); if(nm) nm.textContent = ko()? g.ko : g.en;
    var ch=$('qrOkChip');
    if(ch) ch.textContent = (ko()? '지금 계신 곳 · ' : 'You are here · ') +
                            (typeof lvLabel==='function' ? lvLabel(g.floor) : g.floor+'F');
    var ph=$('qrOkPhoto'), src=gatePhoto(g.sub);
    if(ph){
      if(src){ ph.src=src; ph.classList.remove('hide'); }
      else   { ph.removeAttribute('src'); ph.classList.add('hide'); }
    }
  }

  /* ── 확정 ── */
  function confirm_(){
    if(!pending) return;
    entry = {key:pending, ts:Date.now()};
    pending = null;
    save();

    var g = GATES[entry.key];
    if(typeof startFloor!=='undefined') startFloor = g.floor;   // 경로 안내 출발층
    if(typeof buildStartFloorPicker==='function') buildStartFloorPicker();
    paintChip();
    if(typeof go==='function') go('scat');    // 건물 확인(s2)은 건너뛴다 — 이미 건물 안이므로
  }

  /* ── 목적지 화면(s4)에 "정문에서 출발" 배지 ── */
  function paintChip(){
    var host = document.getElementById('t4');
    if(!host) return;
    var old = document.getElementById('entryChip');
    if(old && old.parentNode) old.parentNode.removeChild(old);
    if(!entry) return;
    var g = GATES[entry.key];
    var chip = document.createElement('span');
    chip.id = 'entryChip';
    chip.className = 'entryChip';
    chip.textContent = '⛶ ' + (ko() ? (g.ko+' 출발') : ('from '+g.en));
    if(host.parentNode) host.parentNode.insertBefore(chip, host.nextSibling);
  }

  /* ── 외부에서 쓰는 값 ── */
  function floor(){ return entry ? GATES[entry.key].floor : 0; }
  function gate(){  return entry ? entry.key : null; }
  function gateName(){ return entry ? (ko()? GATES[entry.key].ko : GATES[entry.key].en) : ''; }
  function clear(){ entry=null; save(); paintChip(); }

  /* ── QR 원문 생성 (인쇄용 스크립트와 반드시 같은 문자열) ── */
  function payload(key){ return PREFIX + key; }

  document.addEventListener('DOMContentLoaded', paintChip);

  return {
    open:open, close:close, retry:retry, stopCam:stopCam,
    pickFile:pickFile, onFile:onFile, manual:manual,
    confirm:confirm_, floor:floor, gate:gate, gateName:gateName,
    clear:clear, payload:payload, parse:parse, GATES:GATES
  };
})();
