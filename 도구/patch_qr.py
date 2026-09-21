# -*- coding: utf-8 -*-
"""v41 → v42 : QR 위치판별 시스템 통합 패치"""
import io, re, sys, json

SRC = '/home/claude/v41.html'
DST = '/home/claude/gunsan_b3nav_QR_v43.html'
JSQR = '/tmp/nav/jsQR.min.js'

s = io.open(SRC, encoding='utf-8').read()
orig_len = len(s)
applied = []

def patch(name, old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        print('  [실패] %s : 앵커 %d개 발견 (기대 %d)' % (name, n, count)); sys.exit(1)
    s = s.replace(old, new, count)
    applied.append(name)
    print('  [OK] %s' % name)

# ───────────────────────── 1. CSS ─────────────────────────
CSS = r'''
  /* ══════════════ QR 위치판별 (v42 신규) ══════════════ */
  #s1 .qrStart{background:transparent;color:#39FF88;border:1.5px solid #39FF88;border-radius:4px;
    padding:15px;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;width:100%;
    letter-spacing:.5px;display:flex;align-items:center;justify-content:center;gap:8px;}
  #s1 .qrStart:hover{background:rgba(57,255,136,.10);box-shadow:0 0 18px rgba(57,255,136,.35);}
  #s1 .qrHint{color:#5D6B80;font-size:11.5px;line-height:1.5;margin-top:-6px;}

  #sqr .qrStage{position:relative;flex:1;min-height:0;border-radius:12px;overflow:hidden;
    background:#05070B;border:1px solid #232D3A;display:flex;align-items:center;justify-content:center;}
  #sqr video{width:100%;height:100%;object-fit:cover;display:block;}
  #sqr .qrFrame{position:absolute;inset:0;pointer-events:none;}
  #sqr .qrFrame i{position:absolute;width:38px;height:38px;border:3px solid #00E5FF;}
  #sqr .qrFrame i:nth-child(1){top:22%;left:14%;border-right:0;border-bottom:0;border-radius:8px 0 0 0;}
  #sqr .qrFrame i:nth-child(2){top:22%;right:14%;border-left:0;border-bottom:0;border-radius:0 8px 0 0;}
  #sqr .qrFrame i:nth-child(3){bottom:22%;left:14%;border-right:0;border-top:0;border-radius:0 0 0 8px;}
  #sqr .qrFrame i:nth-child(4){bottom:22%;right:14%;border-left:0;border-top:0;border-radius:0 0 8px 0;}
  #sqr .qrLaser{position:absolute;left:14%;right:14%;height:2px;
    background:linear-gradient(90deg,transparent,#00E5FF,transparent);
    box-shadow:0 0 12px rgba(0,229,255,.8);animation:qrScanMove 2.4s ease-in-out infinite;}
  @keyframes qrScanMove{0%,100%{top:23%;}50%{top:77%;}}
  #sqr .qrOff{color:#7C8AA0;font-size:13px;line-height:1.7;text-align:center;padding:22px;}
  #sqr .qrOff > b{color:#FFC93C;display:block;margin-bottom:8px;font-size:14px;}
  #sqr .qrOff span b{color:#E7F6FF;display:inline;font-size:inherit;margin:0;}
  #sqr .qrFix{display:block;width:100%;margin:16px auto 0;max-width:280px;
    background:linear-gradient(90deg,#00E5FF,#7B5CFF);color:#05060A;border:none;border-radius:6px;
    padding:15px 12px;font-size:14.5px;font-weight:800;font-family:inherit;cursor:pointer;}
  #sqr .qrFix:hover{box-shadow:0 0 18px rgba(0,229,255,.5);}
  #sqr .qrFix.ghost{background:transparent;color:#00E5FF;border:1px solid #00E5FF;
    margin-top:8px;font-size:13px;padding:12px;}
  #sqr .qrDiag{display:block;margin-top:14px;color:#3E4A5C;font-size:10.5px;letter-spacing:.4px;}
  #sqr .qrStat{margin-top:10px;font-size:13px;color:#7C8AA0;text-align:center;min-height:19px;flex:0 0 auto;}
  #sqr .qrStat.err{color:#FF6B6B;}
  #sqr .qrTools{display:flex;gap:8px;margin-top:10px;flex:0 0 auto;}
  #sqr .qrTools button{flex:1;background:transparent;color:#00E5FF;border:1px solid #2A3644;
    border-radius:6px;padding:12px 8px;font-size:12.5px;font-family:inherit;cursor:pointer;font-weight:700;}
  #sqr .qrTools button:hover{border-color:#00E5FF;}
  #sqr .qrTools button.prime{background:rgba(0,229,255,.10);border-color:#00E5FF;}
  #sqr .qrManual{margin-top:10px;flex:0 0 auto;}
  #sqr .qrManual .lbl{color:#5D6B80;font-size:11.5px;margin-bottom:6px;text-align:center;}
  #sqr .qrManual .row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
  #sqr .qrManual button{background:#131A24;color:#94B8E0;border:1px solid #232D3A;border-radius:6px;
    padding:11px 4px;font-size:12.5px;font-family:inherit;cursor:pointer;font-weight:700;}
  #sqr .qrManual button:hover{border-color:#7B5CFF;color:#E7F6FF;}

  #sqrok{align-items:center;text-align:center;}
  #sqrok .okWrap{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:14px;width:100%;}
  #sqrok .okTick{font-size:44px;line-height:1;}
  #sqrok .okName{font-size:26px;font-weight:800;color:#39FF88;letter-spacing:-.5px;}
  #sqrok .okSub{color:#7C8AA0;font-size:13.5px;line-height:1.6;}
  #sqrok .okPhoto{width:100%;max-height:38vh;border-radius:12px;border:1px solid #232D3A;
    object-fit:cover;background:#05070B;}
  #sqrok .okPhoto.hide{display:none;}
  #sqrok .okChip{display:inline-flex;align-items:center;gap:6px;background:rgba(57,255,136,.10);
    border:1px solid rgba(57,255,136,.45);color:#39FF88;border-radius:999px;
    padding:6px 13px;font-size:12px;font-weight:700;}
  #sqrok .okBtns{width:100%;display:flex;flex-direction:column;gap:8px;flex:0 0 auto;margin-top:12px;}

  /* 출발지 배지 — 목적지 화면(s4)에 현재 출발 문을 표시 */
  .entryChip{display:inline-flex;align-items:center;gap:5px;background:rgba(57,255,136,.09);
    border:1px solid rgba(57,255,136,.4);color:#39FF88;border-radius:999px;
    padding:4px 10px;font-size:11px;font-weight:700;margin-left:6px;vertical-align:middle;}
'''
CSS_ANCHOR = '''    .big{ padding:15px; font-size:16px; }
  }
</style>'''
patch('CSS 추가', CSS_ANCHOR, '''    .big{ padding:15px; font-size:16px; }
  }
''' + CSS + '</style>')

# ───────────────────────── 2. SCREENS 배열 ─────────────────────────
patch('SCREENS 배열',
      "'spwgate','phsort'];",
      "'spwgate','phsort','sqr','sqrok'];")

# ───────────────────────── 3. 첫 화면 버튼 ─────────────────────────
OLD_S1 = '''<button class="big" style="margin-top:10px;" onclick="go(2)" data-ko="시작하기" data-en="Start">시작하기</button>'''
NEW_S1 = '''<button class="big" style="margin-top:10px;" onclick="go(2)" data-ko="시작하기" data-en="Start">시작하기</button>
    <button class="qrStart" onclick="QRNAV.open()"><span>⛶</span><span data-ko="출입문 QR 스캔하고 시작" data-en="Scan door QR to start">출입문 QR 스캔하고 시작</span></button>
    <p class="qrHint" data-ko="정문·후문·동문·서문에 붙은 QR을 찍으면<br>지금 계신 위치가 자동으로 설정돼요." data-en="Scan the QR at the front, back, east or west gate<br>and your location is set automatically.">정문·후문·동문·서문에 붙은 QR을 찍으면<br>지금 계신 위치가 자동으로 설정돼요.</p>'''
patch('첫 화면 QR 버튼', OLD_S1, NEW_S1)

# ───────────────────────── 4. 화면 마크업 ─────────────────────────
SECTIONS = '''
  <!-- ══════════════ QR 스캔 (v42 신규) ══════════════ -->
  <section class="screen" id="sqr">
    <div class="bar">
      <button class="back" onclick="QRNAV.close()">←</button>
      <h3 data-ko="출입문 QR 스캔" data-en="Scan door QR">출입문 QR 스캔</h3>
    </div>
    <div class="qrStage" id="qrStage">
      <video id="qrVideo" playsinline muted autoplay style="display:none;"></video>
      <div class="qrFrame" id="qrFrame" style="display:none;"><i></i><i></i><i></i><i></i>
        <div class="qrLaser"></div>
      </div>
      <div class="qrOff" id="qrOff">
        <b data-ko="카메라를 준비하는 중…" data-en="Preparing camera…">카메라를 준비하는 중…</b>
        <span data-ko="잠시만 기다려 주세요." data-en="Please wait a moment.">잠시만 기다려 주세요.</span>
      </div>
    </div>
    <div class="qrStat" id="qrStat"></div>
    <div class="qrTools">
      <button class="prime" onclick="QRNAV.pickFile()" data-ko="📷 사진으로 인식" data-en="📷 Scan from photo">📷 사진으로 인식</button>
      <button onclick="QRNAV.retry()" data-ko="↻ 카메라 다시 시도" data-en="↻ Retry camera">↻ 카메라 다시 시도</button>
    </div>
    <input type="file" id="qrFile" accept="image/*" capture="environment" style="display:none;" onchange="QRNAV.onFile(this)">
    <div class="qrManual">
      <div class="lbl" data-ko="QR이 안 읽히면 직접 선택하세요" data-en="If the QR will not scan, choose manually">QR이 안 읽히면 직접 선택하세요</div>
      <div class="row">
        <button onclick="QRNAV.manual('MAIN')" data-ko="정문" data-en="Front">정문</button>
        <button onclick="QRNAV.manual('BACK')" data-ko="후문" data-en="Back">후문</button>
        <button onclick="QRNAV.manual('EAST')" data-ko="동문" data-en="East">동문</button>
        <button onclick="QRNAV.manual('WEST')" data-ko="서문" data-en="West">서문</button>
      </div>
    </div>
  </section>

  <!-- ══════════════ QR 확인 (v42 신규) ══════════════ -->
  <section class="screen" id="sqrok">
    <div class="bar" style="width:100%;">
      <button class="back" onclick="QRNAV.open()">←</button>
      <h3 data-ko="여기가 맞나요?" data-en="Is this where you are?">여기가 맞나요?</h3>
    </div>
    <div class="okWrap">
      <div class="okTick">📍</div>
      <div class="okName" id="qrOkName">정문</div>
      <div class="okChip" id="qrOkChip">1F</div>
      <img class="okPhoto hide" id="qrOkPhoto" alt="">
      <div class="okSub" id="qrOkSub" data-ko="이 사진 속 장소에 계신 것이 맞다면<br>아래를 눌러주세요." data-en="If this is where you are standing,<br>tap below.">이 사진 속 장소에 계신 것이 맞다면<br>아래를 눌러주세요.</div>
    </div>
    <div class="okBtns">
      <button class="big" onclick="QRNAV.confirm()" data-ko="네, 여기예요" data-en="Yes, I'm here">네, 여기예요</button>
      <button class="big ghost" onclick="QRNAV.open()" data-ko="아니요, 다시 스캔할게요" data-en="No, scan again">아니요, 다시 스캔할게요</button>
    </div>
  </section>

  <!-- 즐겨찾기 -->'''
patch('QR 화면 마크업', '  <!-- 즐겨찾기 -->', SECTIONS)

# ───────────────────────── 5. go() 훅 ─────────────────────────
patch('go() 카메라 정리 훅',
      "  if(id==='s2'){ mountBld3D(); bld3DEnter(); }",
      "  if(id!=='sqr' && typeof QRNAV!=='undefined') QRNAV.stopCam();\n"
      "  if(id==='s2'){ mountBld3D(); bld3DEnter(); }")

# ───────────────────────── 6. openTarget 출발층 ─────────────────────────
patch('openTarget 출발층 QR 연동',
      "  startFloor = 1;   // 기본 출발층 = 1층(정문).",
      "  /* v42 : QR로 출입문을 스캔했으면 그 문의 층에서 출발한다. 스캔 안 했으면 기존대로 1층. */\n"
      "  startFloor = (typeof QRNAV!=='undefined' && QRNAV.floor()) || 1;   // 기본 출발층 = 1층(정문).")

# ───────────────────────── 7. jsQR + QRNAV 모듈 ─────────────────────────
jsqr = io.open(JSQR, encoding='utf-8').read()

MODULE = r'''
<!-- ══════════════════════════════════════════════════════════════════
     QR 위치판별 시스템  (v42 신규)

     정문·후문·동문·서문 4곳에 붙인 QR을 스캔하면 "지금 어느 문으로
     들어왔는지"가 확정되고, 그 값이 경로 안내의 출발점이 된다.

     · QR 내용 : B3NAV1:BLD:MAIN   (순수 텍스트 — 서버·인터넷 불필요)
                 나중에 서버가 생기면 URL 형식도 함께 인식한다.
     · 인식 방법 : ① BarcodeDetector(안드로이드 크롬 기본 탑재, 빠름)
                   ② jsQR(그 외 브라우저 — 아이폰 사파리 등)
                   ③ 사진 파일로 인식 (카메라 권한이 막힌 환경 대비)
                   ④ 수동 선택 버튼 (최후 폴백)
     ══════════════════════════════════════════════════════════════════ -->
<script id="JSQR_LIB">__JSQR__</script>
<script>
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
</script>
</body>'''

MODULE = MODULE.replace('__JSQR__', jsqr)
patch('jsQR + QRNAV 모듈', '</body>', MODULE)

io.open(DST,'w',encoding='utf-8').write(s)
print('')
print('원본 : %s bytes' % orig_len)
print('결과 : %s bytes  (+%s)' % (len(s), len(s)-orig_len))
print('적용 : %d개 패치' % len(applied))
print('출력 : %s' % DST)
