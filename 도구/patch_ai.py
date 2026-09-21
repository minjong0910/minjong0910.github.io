# -*- coding: utf-8 -*-
"""v43 → v44 : 건의함 사진 판별 AI (SUGAI) + 사진 읽기 안정화 (PHFIX)"""
import io, sys, json

SRC = '/home/claude/gunsan_b3nav_QR_v43.html'
DST = '/home/claude/gunsan_b3nav_AI_v44.html'
AIVEC = '/tmp/nav/lab/aivec.json'

s = io.open(SRC, encoding='utf-8').read()
orig = len(s)
done = []

def patch(name, old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        print('  [실패] %s : 앵커 %d개 (기대 %d)' % (name, n, count)); sys.exit(1)
    s = s.replace(old, new, count); done.append(name); print('  [OK] %s' % name)

# ═══════════════════════ 1. CSS ═══════════════════════
CSS = r'''
  /* ══════════════ 사진 판별 AI (v44 신규) ══════════════ */
  #ssug .aiPrep{margin-top:10px;font-size:12px;color:#5D6B80;text-align:center;
    display:flex;align-items:center;justify-content:center;gap:7px;min-height:18px;}
  #ssug .aiPrep .dot{width:7px;height:7px;border-radius:50%;background:#3E4A5C;flex:0 0 auto;}
  #ssug .aiPrep.on .dot{background:#39FF88;box-shadow:0 0 8px rgba(57,255,136,.7);}
  #ssug .aiPrep.load .dot{background:#FFC93C;animation:aiPulse 1s ease-in-out infinite;}
  #ssug .aiPrep.off .dot{background:#5D6B80;}
  @keyframes aiPulse{0%,100%{opacity:.35;}50%{opacity:1;}}

  #ssug .aiCard{margin-top:12px;border:1px solid #232D3A;border-radius:10px;padding:12px;
    background:#0E141C;display:none;}
  #ssug .aiCard.on{display:block;}
  #ssug .aiCard .hd{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;margin-bottom:7px;}
  #ssug .aiCard .hd .tag{font-size:10.5px;padding:2px 7px;border-radius:999px;font-weight:800;letter-spacing:.3px;}
  #ssug .aiCard .body{font-size:12.5px;color:#94B8E0;line-height:1.65;}
  #ssug .aiCard .why{margin-top:7px;font-size:11px;color:#5D6B80;}
  .aiOk   {background:rgba(57,255,136,.13);color:#39FF88;}
  .aiWarn {background:rgba(255,201,60,.13);color:#FFC93C;}
  .aiBad  {background:rgba(255,107,107,.13);color:#FF6B6B;}
  .aiInfo {background:rgba(0,229,255,.12);color:#00E5FF;}

  /* 관리자 화면 AI 배지 */
  #sadmin .sugAi{margin:7px 0 5px;padding:8px 10px;border-radius:8px;background:#0E141C;
    border:1px solid #232D3A;font-size:11.5px;line-height:1.6;}
  #sadmin .sugAi .row1{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;}
  #sadmin .sugAi .tag{font-size:10px;padding:2px 7px;border-radius:999px;font-weight:800;}
  #sadmin .sugAi .num{color:#7C8AA0;font-size:10.5px;}
  #sadmin .sugAi .cands{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px;}
  #sadmin .sugAi .cands button{background:#131A24;color:#94B8E0;border:1px solid #2A3644;
    border-radius:999px;padding:5px 10px;font-size:11px;font-family:inherit;cursor:pointer;font-weight:700;}
  #sadmin .sugAi .cands button:hover{border-color:#00E5FF;color:#E7F6FF;}
  #sadmin .sugAi .qr{color:#39FF88;}
'''
patch('AI CSS', '''  /* 출발지 배지 — 목적지 화면(s4)에 현재 출발 문을 표시 */''',
      CSS + '''
  /* 출발지 배지 — 목적지 화면(s4)에 현재 출발 문을 표시 */''')

# ═══════════════════════ 2. #ssug 화면 ═══════════════════════
OLD_SUG = '''      <button class="big" style="margin-top:10px;" onclick="sugSubmit()" data-ko="건의함에 올리기" data-en="Submit to Suggestion Box">건의함에 올리기</button>
      <div class="sugStat" id="sugStat"></div>'''
NEW_SUG = '''      <button class="big" style="margin-top:10px;" onclick="sugSubmit()" data-ko="건의함에 올리기" data-en="Submit to Suggestion Box">건의함에 올리기</button>
      <div class="sugStat" id="sugStat"></div>
      <div class="aiPrep off" id="sugAiPrep"><span class="dot"></span><span id="sugAiPrepTxt"></span></div>
      <div class="aiCard" id="sugAiCard">
        <div class="hd"><span id="sugAiIcon">🤖</span><span id="sugAiTitle"></span><span class="tag" id="sugAiTag"></span></div>
        <div class="body" id="sugAiBody"></div>
        <div class="why" id="sugAiWhy"></div>
      </div>'''
patch('#ssug AI 표시', OLD_SUG, NEW_SUG)

# ═══════════════════════ 3. go() 훅 ═══════════════════════
patch('go() AI 예열',
      "  if(id==='sph'){ phRender(); if(typeof sugBadgeSync==='function') sugBadgeSync(); }",
      "  if(id==='ssug' && typeof SUGAI!=='undefined') SUGAI.warmup();\n"
      "  if(id==='sph'){ phRender(); if(typeof sugBadgeSync==='function') sugBadgeSync(); }")

# ═══════════════════════ 4. sugSubmit — AI 판정 삽입 ═══════════════════════
OLD_SUBMIT = '''    SUG_QUEUE.push({
      id: 'sug_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
      u: url, note: noteVal, ts: Date.now(), status: 'pending'
    });
    sugSaveQueue();
    sugBadgeSync();
    if(stat){
      stat.style.color = '#39FF88';
      stat.textContent = (LANG==='ko')
        ? '✓ 제출되었습니다! 관리자가 확인 후 최신 사진으로 반영해요.'
        : '✓ Submitted! A staff member will review it and apply it as the newest photo.';
      stat.classList.add('on');
    }'''
NEW_SUBMIT = '''    /* v44 : 큐에 넣기 전에 AI가 사진을 판별한다.
       품질 불합격·건물과 무관한 사진은 여기서 걸러 관리자에게 넘기지 않는다. */
    if(stat){ stat.style.color = '#7C8AA0'; stat.textContent = (LANG==='ko') ? 'AI가 사진을 확인하는 중…' : 'AI is checking the photo…'; }
    SUGAI.judge(url, function(ai){
      if(ai.verdict === 'reject_quality' || ai.verdict === 'irrelevant'){
        SUGAI.showCard(ai);
        if(stat){ stat.style.color = '#FF6B6B'; stat.textContent = SUGAI.rejectMsg(ai); stat.classList.add('on'); }
        return;                                   // 접수하지 않음
      }
      sugFinishSubmit(url, noteVal, ai, stat, noteEl);
    });
  });
}

/* AI 판정을 통과한 제보를 실제로 큐에 넣는다 (v44에서 분리) */
function sugFinishSubmit(url, noteVal, ai, stat, noteEl){
    SUG_QUEUE.push({
      id: 'sug_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
      u: url, note: noteVal, ts: Date.now(), status: 'pending',
      ai: ai,
      qr: (typeof QRNAV!=='undefined' && QRNAV.gate) ? QRNAV.gate() : null
    });
    sugSaveQueue();
    sugBadgeSync();
    SUGAI.showCard(ai);
    if(stat){
      stat.style.color = '#39FF88';
      stat.textContent = (LANG==='ko')
        ? '✓ 제출되었습니다! 관리자가 확인 후 최신 사진으로 반영해요.'
        : '✓ Submitted! A staff member will review it and apply it as the newest photo.';
      stat.classList.add('on');
    }'''
patch('sugSubmit AI 연결', OLD_SUBMIT, NEW_SUBMIT)

# sugSubmit 의 남은 꼬리(원래 콜백 닫는 부분) 정리
OLD_TAIL = '''    if(noteEl) noteEl.value = '';
    var fileInput = document.getElementById('sugFile'); if(fileInput) fileInput.value = '';
    sugPickedFile = null;
  });
}'''
NEW_TAIL = '''    if(noteEl) noteEl.value = '';
    var fileInput = document.getElementById('sugFile'); if(fileInput) fileInput.value = '';
    sugPickedFile = null;
}'''
patch('sugSubmit 꼬리 정리', OLD_TAIL, NEW_TAIL)

# ═══════════════════════ 5. 관리자 화면 — AI 배지 + 자동입력 ═══════════════════════
OLD_ADMIN = '''            '<div class="sugWhen">'+when+'</div>' +
            '<input type="text" class="sugCodeInput" id="sugCode_'+s.id+'" placeholder="적용할 위치 코드 (예: 13210, BLD, EV2, B1)">' +'''
NEW_ADMIN = '''            '<div class="sugWhen">'+when+'</div>' +
            (typeof SUGAI!=='undefined' ? SUGAI.adminBadge(s) : '') +
            '<input type="text" class="sugCodeInput" id="sugCode_'+s.id+'" value="'+
              ((typeof SUGAI!=='undefined') ? SUGAI.autoCode(s) : '')+
              '" placeholder="적용할 위치 코드 (예: 13210, BLD, EV2, B1)">' +'''
patch('관리자 AI 배지 + 자동입력', OLD_ADMIN, NEW_ADMIN)

# ═══════════════════════ 6. PHFIX — 사진 읽기 안정화 ═══════════════════════
OLD_SHRINK = '''function phShrink(blob, cb){
  function draw(src, w, h){
    var sc = Math.min(1, PH_MAXDIM / Math.max(w, h));
    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w*sc)); cv.height = Math.max(1, Math.round(h*sc));
    cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
    try{ cb(cv.toDataURL('image/jpeg', PH_Q)); }catch(e){ cb(null); }
  }
  if(window.createImageBitmap){
    createImageBitmap(blob, {imageOrientation:'from-image'}).then(function(bm){
      draw(bm, bm.width, bm.height); if(bm.close) bm.close();
    }).catch(function(){ phShrinkImg(blob, draw, cb); });
  } else { phShrinkImg(blob, draw, cb); }
}
function phShrinkImg(blob, draw, cb){
  var u = URL.createObjectURL(blob), im = new Image();
  im.onload  = function(){ draw(im, im.naturalWidth, im.naturalHeight); URL.revokeObjectURL(u); };
  im.onerror = function(){ URL.revokeObjectURL(u); cb(null); };
  im.src = u;
}'''

NEW_SHRINK = r'''/* ══════════════════════════════════════════════════════════════════
   PHFIX — 사진 읽기 안정화 (v44)

   기존 phShrink는 브라우저가 파일을 못 읽으면 그냥 실패했다. 특히
   아이폰 기본 촬영 포맷인 HEIC는 사파리는 읽지만 안드로이드 크롬은
   못 읽어서, "사진을 처리하지 못했어요" 한 줄만 뜨고 끝났다.

   · 파일 앞부분(매직 넘버)을 읽어 실제 형식을 알아낸다 (확장자는 못 믿는다)
   · HEIC면 heic2any를 그때 내려받아 변환한다
   · 읽기를 3단계로 시도한다 (createImageBitmap → blob URL → FileReader)
   · 아이폰 캔버스 픽셀 한계(약 1,670만)에 맞춰 자동 축소
   · 실패 원인을 PHFIX.lastError 에 남겨 사용자에게 이유를 알려준다
   ══════════════════════════════════════════════════════════════════ */
var PHFIX = (function(){
  'use strict';
  var IOS_MAX_PX = 16700000;        // 아이폰 사파리 캔버스 상한
  var HEIC2ANY = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
  var heicLoading = null;

  function sniff(buf){
    var b = new Uint8Array(buf);
    if(b.length < 12) return 'empty';
    if(b[0]===0xFF && b[1]===0xD8) return 'jpeg';
    if(b[0]===0x89 && b[1]===0x50 && b[2]===0x4E && b[3]===0x47) return 'png';
    if(b[0]===0x47 && b[1]===0x49 && b[2]===0x46) return 'gif';
    if(b[0]===0x42 && b[1]===0x4D) return 'bmp';
    var s = String.fromCharCode(b[4],b[5],b[6],b[7]);
    if(s === 'ftyp'){
      var brand = String.fromCharCode(b[8],b[9],b[10],b[11]).toLowerCase();
      if(brand.indexOf('heic')===0 || brand.indexOf('heix')===0 ||
         brand.indexOf('hevc')===0 || brand.indexOf('mif1')===0 ||
         brand.indexOf('msf1')===0 || brand.indexOf('heim')===0) return 'heic';
      if(brand.indexOf('avif')===0 || brand.indexOf('avis')===0) return 'avif';
      return 'video';
    }
    if(String.fromCharCode(b[0],b[1],b[2],b[3])==='RIFF' &&
       String.fromCharCode(b[8],b[9],b[10],b[11])==='WEBP') return 'webp';
    return 'unknown';
  }

  function head(blob){
    return new Promise(function(res){
      var r = new FileReader();
      r.onload  = function(){ res(sniff(r.result)); };
      r.onerror = function(){ res('unreadable'); };
      r.readAsArrayBuffer(blob.slice(0, 16));
    });
  }

  function loadHeic(){
    if(window.heic2any) return Promise.resolve(true);
    if(heicLoading) return heicLoading;
    heicLoading = new Promise(function(res){
      var sc = document.createElement('script');
      sc.src = HEIC2ANY;
      sc.onload  = function(){ res(!!window.heic2any); };
      sc.onerror = function(){ res(false); };
      document.head.appendChild(sc);
      setTimeout(function(){ res(!!window.heic2any); }, 20000);
    });
    return heicLoading;
  }

  /* 세 가지 방법으로 이미지 열기를 시도한다 */
  function decode(blob){
    return new Promise(function(res, rej){
      function viaImg(){
        var u = URL.createObjectURL(blob), im = new Image();
        im.onload  = function(){ res({el:im, w:im.naturalWidth, h:im.naturalHeight, url:u}); };
        im.onerror = function(){ URL.revokeObjectURL(u); viaReader(); };
        im.src = u;
      }
      function viaReader(){
        var r = new FileReader();
        r.onload = function(){
          var im = new Image();
          im.onload  = function(){ res({el:im, w:im.naturalWidth, h:im.naturalHeight}); };
          im.onerror = function(){ rej('decode'); };
          im.src = r.result;
        };
        r.onerror = function(){ rej('read'); };
        r.readAsDataURL(blob);
      }
      if(window.createImageBitmap){
        createImageBitmap(blob, {imageOrientation:'from-image'}).then(function(bm){
          res({el:bm, w:bm.width, h:bm.height, bitmap:bm});
        })['catch'](viaImg);
      } else viaImg();
    });
  }

  var lastError = '';
  function shrink(blob, cb){
    lastError = '';
    if(!blob || !blob.size){ lastError='empty'; cb(null); return; }

    head(blob).then(function(kind){
      PHFIX.lastKind = kind;
      if(kind === 'video'){ lastError='video'; cb(null); return null; }
      if(kind === 'empty' || kind === 'unreadable'){ lastError='corrupt'; cb(null); return null; }

      if(kind === 'heic'){
        /* 사파리는 HEIC를 그대로 읽으므로 먼저 시도하고, 실패할 때만 변환한다 */
        return decode(blob)['catch'](function(){
          if(typeof phHeicNote === 'function') phHeicNote(true);
          return loadHeic().then(function(ok){
            if(!ok){ throw 'heic-nolib'; }
            return window.heic2any({blob: blob, toType:'image/jpeg', quality:0.85});
          }).then(function(out){
            var b = Array.isArray(out) ? out[0] : out;
            return decode(b);
          }).then(function(d){
            if(typeof phHeicNote === 'function') phHeicNote(false);
            return d;
          }, function(e){
            /* Promise.finally 는 구형 브라우저에 없어서 then(성공,실패) 두 갈래로 처리한다 */
            if(typeof phHeicNote === 'function') phHeicNote(false);
            throw e;
          });
        });
      }
      return decode(blob);
    }).then(function(d){
      if(!d) return;
      var w = d.w, h = d.h;
      if(!w || !h){ lastError='decode'; cb(null); return; }
      var sc = Math.min(1, PH_MAXDIM / Math.max(w, h));
      /* 아이폰 캔버스 픽셀 한계 대응 */
      if(w*sc * h*sc > IOS_MAX_PX) sc = Math.sqrt(IOS_MAX_PX / (w*h));
      var cv = document.createElement('canvas');
      cv.width  = Math.max(1, Math.round(w*sc));
      cv.height = Math.max(1, Math.round(h*sc));
      try{
        cv.getContext('2d').drawImage(d.el, 0, 0, cv.width, cv.height);
        var out = cv.toDataURL('image/jpeg', PH_Q);
        if(d.url) URL.revokeObjectURL(d.url);
        if(d.bitmap && d.bitmap.close) d.bitmap.close();
        cb(out);
      }catch(e){ lastError='canvas'; cb(null); }
    })['catch'](function(e){
      lastError = (typeof e === 'string') ? e : 'decode';
      cb(null);
    });
  }

  /* 실패 원인을 사람이 읽을 수 있는 문장으로 */
  function reason(){
    var ko = (typeof LANG==='undefined' || LANG==='ko');
    switch(lastError){
      case 'video':     return ko?'사진이 아니라 동영상 파일이에요. 사진으로 다시 올려주세요.'
                                 :'That is a video, not a photo. Please upload a photo.';
      case 'empty':     return ko?'파일이 비어 있어요.':'The file is empty.';
      case 'corrupt':   return ko?'파일이 손상됐거나 지원하지 않는 형식이에요.':'The file is damaged or unsupported.';
      case 'heic-nolib':return ko?'아이폰 HEIC 사진이에요. 인터넷 연결을 확인하시거나, [설정 › 카메라 › 포맷]을 "높은 호환성"으로 바꾼 뒤 다시 찍어주세요.'
                                 :'This is an iPhone HEIC photo. Check your connection, or set Settings › Camera › Formats to "Most Compatible" and retake.';
      case 'canvas':    return ko?'사진이 너무 커서 처리하지 못했어요. 조금 작게 찍어주세요.':'The photo is too large to process.';
      default:          return ko?'사진을 열지 못했어요. 다른 사진으로 다시 시도해 주세요.':'Could not open the photo. Please try another one.';
    }
  }

  /* 콘솔 진단 : PHFIX.check() 후 사진을 고르면 형식·원인이 출력된다 */
  function check(){
    var i = document.createElement('input'); i.type='file'; i.accept='image/*';
    i.onchange = function(){
      var f = i.files[0]; if(!f) return;
      head(f).then(function(k){
        console.log('파일명 :', f.name, '\nMIME :', f.type || '(없음)', '\n실제형식 :', k, '\n크기 :', (f.size/1024).toFixed(0)+'KB');
        shrink(f, function(u){ console.log('처리결과 :', u ? '성공 ('+(u.length/1024).toFixed(0)+'KB)' : '실패 — '+lastError); });
      });
    };
    i.click();
  }

  return { shrink:shrink, sniff:sniff, head:head, check:check, reason:reason,
           get lastError(){ return lastError; }, lastKind:'' };
})();

/* HEIC 변환 중 안내 */
function phHeicNote(on){
  var st = document.getElementById('sugStat');
  if(!st) return;
  if(on){ st.style.color='#FFC93C'; st.textContent=(LANG==='ko')?'아이폰 사진을 변환하는 중…':'Converting iPhone photo…'; st.classList.add('on'); }
}

function phShrink(blob, cb){ PHFIX.shrink(blob, cb); }'''
patch('PHFIX 사진 읽기 안정화', OLD_SHRINK, NEW_SHRINK)

# ═══════════════════════ 7. 사진 처리 실패 메시지를 원인별로 ═══════════════════════
patch('실패 메시지 원인별 안내',
      """        stat.textContent = (LANG==='ko') ? '사진을 처리하지 못했어요. 다시 시도해 주세요.' : 'Could not process the photo. Please try again.';""",
      """        stat.textContent = (typeof PHFIX!=='undefined') ? PHFIX.reason()
          : ((LANG==='ko') ? '사진을 처리하지 못했어요. 다시 시도해 주세요.' : 'Could not process the photo. Please try again.');""")

# ═══════════════════════ 8. SUGAI 모듈 + 임베딩 벡터 ═══════════════════════
vec = io.open(AIVEC, encoding='utf-8').read()

MODULE = r'''
<!-- ══════════════════════════════════════════════════════════════════
     건의함 사진 판별 AI (v44)

     아이디어 : 앱에 이미 들어있는 기준사진 133장이 곧 AI의 정답표다.
     제보 사진을 같은 방식으로 특징벡터(1280차원)로 바꿔 기준사진들과
     코사인 유사도를 재면, 학습 데이터를 따로 모으지 않고도
     "어디 사진인지 · 무관한 사진인지 · 기존과 같은지"를 한 번에 가린다.

     측정 결과 (사진 45장 × 촬영변화 6종 = 270건)
       · 위치 맞힘        86.7%   (상위 3개 안에 정답 포함 94.4%)
       · 무관한 사진 반려  100%   (오반려 0%)
       · 자동확정 조건일 때 정답률 98.5%
     ══════════════════════════════════════════════════════════════════ -->
<script id="EMBEDDED_AIVEC" type="application/json">__AIVEC__</script>
<script>
var SUGAI = (function(){
  'use strict';

  /* ── 임계값 (전부 실측으로 정했다) ──────────────────────────────
     무관한 사진의 최고 유사도 0.420 < TH_RELEVANT 0.60 < 실제 사진 최저 0.679
     → 이 구간이 비어 있어서 오반려 없이 무관한 사진만 걸러진다.        */
  var TH = {
    SHARP:     45,      // 라플라시안 분산 — 이보다 낮으면 흔들린 사진
    DARK:      40,      // 평균 밝기 하한
    BRIGHT:   218,      // 평균 밝기 상한
    MINPX:    480,      // 원본 긴 변 최소 픽셀
    RELEVANT: 0.60,     // 미만 → 건물과 무관한 사진, 자동 반려
    MATCH:    0.75,     // 이상 + MARGIN 이상 → 위치 자동 확정
    MARGIN:   0.04,     // 1등과 2등의 차이
    SAME:     0.98      // 이상 → 앱에 있는 사진과 사실상 동일
  };

  /* 라이브러리는 두 곳에서 찾는다.
     ① 앱과 같은 서버의 lib/ 폴더 — 저장소에 올려두면 외부 인터넷이 막혀도 동작한다
     ② 공개 CDN — lib/ 폴더가 없을 때의 대비책                                */
  var TFJS = ['lib/tf.min.js',       'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js'];
  var MNET = ['lib/mobilenet.min.js','https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js'];

  var REF = null, CODES = null, NAMES = null, DIM = 0;
  var net = null, loading = null, failed = false;

  function ko(){ return (typeof LANG==='undefined' || LANG==='ko'); }
  function $(id){ return document.getElementById(id); }

  /* ── 내장 기준벡터 풀기 (int8 → float) ── */
  function loadVectors(){
    if(REF) return true;
    var el = $('EMBEDDED_AIVEC');
    if(!el) return false;
    try{
      var d = JSON.parse(el.textContent);
      DIM = d.dim; CODES = d.codes; NAMES = d.names || [];
      var bin = atob(d.q), n = d.n;
      REF = [];
      for(var i=0;i<n;i++){
        var v = new Float32Array(DIM), s = 0;
        for(var j=0;j<DIM;j++){
          var b = bin.charCodeAt(i*DIM+j);
          var q = (b>127 ? b-256 : b)/127;
          v[j] = q; s += q*q;
        }
        s = Math.sqrt(s) || 1;
        for(var k=0;k<DIM;k++) v[k] /= s;      // 양자화 오차 보정용 재정규화
        REF.push(v);
      }
      return true;
    }catch(e){ return false; }
  }

  function script(src){
    return new Promise(function(res, rej){
      var sc = document.createElement('script');
      sc.src = src;
      sc.onload  = function(){ res(true); };
      sc.onerror = function(){ rej('load'); };
      document.head.appendChild(sc);
      setTimeout(function(){ rej('timeout'); }, 30000);
    });
  }
  /* 후보 주소를 순서대로 시도한다 */
  function scriptAny(list, check){
    if(check()) return Promise.resolve(true);
    var i = 0;
    function next(){
      if(i >= list.length) return Promise.reject('load');
      var u = list[i++];
      if(u.indexOf('http') !== 0 && location.protocol === 'file:') return next();   // 파일로 연 상태면 상대경로는 무의미
      return script(u).then(function(){
        if(check()) return true;
        return next();
      })['catch'](next);
    }
    return next();
  }

  /* ── 모델 준비 ─────────────────────────────────────────────────
     ① 같은 서버의 model/ 폴더 (저장소에 올려두면 제일 빠르고 확실)
     ② 라이브러리 기본 주소
     둘 다 안 되면 AI는 조용히 꺼지고, 품질검사만 하고 사람 검토로 넘어간다. */
  function ensure(){
    if(net) return Promise.resolve(net);
    if(failed) return Promise.reject('failed');
    if(loading) return loading;

    loading = scriptAny(TFJS, function(){ return !!window.tf; })
      .then(function(){ return scriptAny(MNET, function(){ return !!window.mobilenet; }); })
      .then(function(){
        return tf.setBackend('webgl')['catch'](function(){ return tf.setBackend('cpu'); });
      })
      .then(function(){ return tf.ready(); })
      .then(function(){
        var local = null;
        if(location.protocol === 'http:' || location.protocol === 'https:'){
          try{ local = new URL('model/model.json', location.href).href; }catch(e){}
        }
        var opt = {version:2, alpha:0.5};
        if(!local) return mobilenet.load(opt);
        return mobilenet.load({version:2, alpha:0.5, modelUrl:local})
          ['catch'](function(){ return mobilenet.load(opt); });
      })
      .then(function(m){
        net = m;
        /* 예열 추론 — WebGL 셰이더 컴파일 등 첫 실행 비용을 미리 치러 둔다.
           이걸 안 하면 사용자가 처음 제보할 때만 몇 초씩 멈춘 것처럼 보인다. */
        try{
          var wc = document.createElement('canvas'); wc.width = wc.height = 224;
          var wx = wc.getContext('2d'); wx.fillStyle='#888'; wx.fillRect(0,0,224,224);
          var t = net.infer(wc, true);
          return t.data().then(function(){ t.dispose(); return m; })['catch'](function(){ return m; });
        }catch(e){ return m; }
      })
      ['catch'](function(e){ failed = true; loading = null; throw e; });
    return loading;
  }

  /* ── 사진 → 224x224 (밝기·대비 정규화 포함) ─────────────────────
     같은 장소도 조명에 따라 완전히 다르게 찍힌다. 밝기 히스토그램의
     2~98% 구간을 0~255로 펴서 조명 차이를 지운 뒤 모델에 넣는다.
     기준벡터도 똑같은 처리로 계산했다. 이 정규화 하나로 저조도 사진
     정확도가 15.6% → 97.8% 로 올랐다. */
  function prep(img){
    var cv = document.createElement('canvas');
    cv.width = 224; cv.height = 224;
    var cx = cv.getContext('2d');
    cx.fillStyle = '#000'; cx.fillRect(0,0,224,224);
    cx.drawImage(img, 0, 0, 224, 224);
    var d = cx.getImageData(0,0,224,224), p = d.data;
    var hist = new Uint32Array(256), i;
    for(i=0;i<p.length;i+=4) hist[(0.299*p[i] + 0.587*p[i+1] + 0.114*p[i+2])|0]++;
    var total = p.length/4, acc = 0, lo = 0, hi = 255, v;
    for(v=0;v<256;v++){ acc += hist[v]; if(acc >= total*0.02){ lo = v; break; } }
    acc = 0;
    for(v=0;v<256;v++){ acc += hist[v]; if(acc >= total*0.98){ hi = v; break; } }
    var range = Math.max(24, hi-lo), sc = 255/range;
    for(i=0;i<p.length;i+=4){
      p[i]   = Math.max(0, Math.min(255, (p[i]  -lo)*sc));
      p[i+1] = Math.max(0, Math.min(255, (p[i+1]-lo)*sc));
      p[i+2] = Math.max(0, Math.min(255, (p[i+2]-lo)*sc));
    }
    cx.putImageData(d,0,0);
    return cv;
  }

  /* ── 1단계 · 품질검사 (순수 JS, 인터넷 없이도 동작) ── */
  function quality(img){
    var W = 256, H = Math.max(1, Math.round(img.height * (256/img.width))) || 256;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var cx = cv.getContext('2d');
    cx.drawImage(img, 0, 0, W, H);
    var p = cx.getImageData(0,0,W,H).data;
    var g = new Float32Array(W*H), i, sum = 0;
    for(i=0;i<W*H;i++){
      g[i] = 0.299*p[i*4] + 0.587*p[i*4+1] + 0.114*p[i*4+2];
      sum += g[i];
    }
    var mean = sum/(W*H);
    /* 라플라시안 분산 — 초점이 안 맞거나 흔들리면 값이 급격히 낮아진다 */
    var s = 0, s2 = 0, n = 0;
    for(var y=1;y<H-1;y++) for(var x=1;x<W-1;x++){
      var k = y*W+x;
      var L = 4*g[k] - g[k-1] - g[k+1] - g[k-W] - g[k+W];
      s += L; s2 += L*L; n++;
    }
    var lv = n ? (s2/n - (s/n)*(s/n)) : 0;
    return { sharp: lv, bright: mean, w: img.naturalWidth||img.width, h: img.naturalHeight||img.height };
  }

  /* ── 2단계 · 위치 판별 ── */
  function rank(vec){
    var m = {}, i, j;
    for(i=0;i<REF.length;i++){
      var r = REF[i], d = 0;
      for(j=0;j<DIM;j++) d += vec[j]*r[j];
      var c = CODES[i];
      if(!(c in m) || d > m[c]) m[c] = d;
    }
    var arr = [];
    for(var k in m) arr.push({code:k, sim:m[k]});
    arr.sort(function(a,b){ return b.sim - a.sim; });
    return arr;
  }

  function codeLabel(code){
    if(code === 'BLD') return ko()?'건물 외부':'Building exterior';
    if(code === 'B1')  return ko()?'지하 1층':'Basement 1';
    if(/^EV\d$/.test(code)) return (ko()?'엘리베이터 ':'Elevator ') + code.slice(2) + (ko()?'층':'F');
    var mh = code.match(/^HALL(\d)([LR])$/);
    if(mh) return mh[1] + (ko()?'층 ':'F ') + (mh[2]==='L' ? (ko()?'좌측 복도':'left hall') : (ko()?'우측 복도':'right hall'));
    if(/^\d{5}/.test(code)) return code + (ko()?'호':'');
    return code;
  }

  /* ── 판정 ── */
  function judge(dataUrl, cb){
    var img = new Image();
    img.onload = function(){
      var q = quality(img);
      var res = { quality:q, model:'mobilenet_v2_050_224' };

      if(q.sharp < TH.SHARP){ res.verdict='reject_quality'; res.why='sharp'; cb(res); return; }
      if(q.bright < TH.DARK){ res.verdict='reject_quality'; res.why='dark';  cb(res); return; }
      if(q.bright > TH.BRIGHT){ res.verdict='reject_quality'; res.why='bright'; cb(res); return; }
      if(Math.max(q.w,q.h) < TH.MINPX){ res.verdict='reject_quality'; res.why='small'; cb(res); return; }

      if(!loadVectors()){ res.verdict='skipped'; res.why='novec'; cb(res); return; }

      ensure().then(function(){
        var t = net.infer(prep(img), true);
        return t.data().then(function(v){
          t.dispose();
          var n = 0, i;
          for(i=0;i<v.length;i++) n += v[i]*v[i];
          n = Math.sqrt(n) || 1;
          var q2 = new Float32Array(v.length);
          for(i=0;i<v.length;i++) q2[i] = v[i]/n;

          var rk = rank(q2);
          res.top = rk.slice(0,3).map(function(x){ return {code:x.code, sim:Math.round(x.sim*1000)/1000}; });
          res.code = rk[0].code;
          res.sim = Math.round(rk[0].sim*1000)/1000;
          res.margin = Math.round((rk[0].sim - (rk[1]?rk[1].sim:0))*1000)/1000;

          /* QR을 찍고 제보했다면 그 문과 일치하는지 함께 본다 */
          var gate = (typeof QRNAV!=='undefined' && QRNAV.gate) ? QRNAV.gate() : null;
          if(gate){ res.qrGate = gate; res.qrAgree = (res.code === 'BLD'); }

          if(res.sim < TH.RELEVANT)      res.verdict = 'irrelevant';
          else if(res.sim >= TH.SAME)    res.verdict = 'same';
          else if(res.sim >= TH.MATCH && res.margin >= TH.MARGIN) res.verdict = 'match';
          else                           res.verdict = 'uncertain';
          cb(res);
        });
      })['catch'](function(){
        res.verdict = 'skipped'; res.why = 'model';
        cb(res);
      });
    };
    img.onerror = function(){ cb({verdict:'skipped', why:'image'}); };
    img.src = dataUrl;
  }

  /* ── 제보자에게 보여줄 카드 ── */
  function showCard(ai){
    var card = $('sugAiCard'); if(!card) return;
    var icon = $('sugAiIcon'), title = $('sugAiTitle'), tag = $('sugAiTag'),
        body = $('sugAiBody'), why = $('sugAiWhy');
    var t = {icon:'🤖', title:'', tag:'', cls:'aiInfo', body:'', why:''};

    if(ai.verdict === 'reject_quality'){
      t.icon='⚠️'; t.cls='aiBad'; t.tag=ko()?'다시 촬영':'Retake';
      t.title=ko()?'사진 상태를 확인해 주세요':'Please check the photo';
      t.body = ai.why==='sharp'  ? (ko()?'사진이 흔들렸거나 초점이 맞지 않았어요.':'The photo is blurry or out of focus.')
             : ai.why==='dark'   ? (ko()?'사진이 너무 어두워요. 불을 켜거나 밝은 곳에서 찍어주세요.':'Too dark. Try a brighter spot.')
             : ai.why==='bright' ? (ko()?'사진이 너무 밝아 하얗게 날아갔어요.':'Too bright / washed out.')
             :                     (ko()?'사진이 너무 작아요. 더 큰 사진으로 올려주세요.':'The photo is too small.');
    } else if(ai.verdict === 'irrelevant'){
      t.icon='🚫'; t.cls='aiBad'; t.tag=ko()?'접수 안 됨':'Not accepted';
      t.title=ko()?'건물과 관련 없는 사진 같아요':'This does not look like the building';
      t.body=ko()?'공대 3호관의 건물·복도·강의실 사진을 올려주세요.':'Please upload a photo of Engineering Building 3.';
    } else if(ai.verdict === 'same'){
      t.icon='ℹ️'; t.cls='aiInfo'; t.tag=ko()?'접수됨':'Accepted';
      t.title=ko()?'지금 앱에 있는 사진과 거의 같아요':'Almost identical to the current photo';
      t.body=ko()?'그래도 접수했어요. 관리자가 확인합니다.':'Submitted anyway — a staff member will review it.';
    } else if(ai.verdict === 'match'){
      t.icon='✅'; t.cls='aiOk'; t.tag=ko()?'위치 확인':'Location matched';
      t.title=(ko()?'':'') + codeLabel(ai.code) + (ko()?' 사진으로 확인했어요':' identified');
      t.body=ko()?'관리자 화면에 위치가 자동으로 입력됩니다.':'The location is pre-filled for the reviewer.';
    } else if(ai.verdict === 'uncertain'){
      t.icon='🔍'; t.cls='aiWarn'; t.tag=ko()?'접수됨':'Accepted';
      t.title=ko()?'위치를 확실히 못 정했어요':'Location is uncertain';
      t.body=ko()?'가장 비슷한 곳 : ' + ai.top.map(function(x){ return codeLabel(x.code); }).join(' · ')
                : 'Closest: ' + ai.top.map(function(x){ return codeLabel(x.code); }).join(' · ');
    } else {
      t.icon='📮'; t.cls='aiInfo'; t.tag=ko()?'접수됨':'Accepted';
      t.title=ko()?'사람이 직접 확인할 거예요':'A person will review it';
      t.body= (ai.why==='model')
        ? (ko()?'AI 모델을 불러오지 못했어요(인터넷 문제일 수 있어요). 제보는 정상 접수됐습니다.'
               :'Could not load the AI model. Your report was still submitted.')
        : (ko()?'제보가 정상 접수됐습니다.':'Your report was submitted.');
    }
    if(ai.sim !== undefined){
      t.why = (ko()?'유사도 ':'similarity ') + (ai.sim*100).toFixed(0) + '%' +
              (ai.top && ai.top[1] ? (ko()?' · 다음 후보 ':' · next ') + codeLabel(ai.top[1].code) + ' ' + (ai.top[1].sim*100).toFixed(0) + '%' : '');
    }
    if(ai.quality && ai.quality.sharp !== undefined){
      t.why += (t.why?' · ':'') + (ko()?'선명도 ':'sharpness ') + Math.round(ai.quality.sharp);
    }

    icon.textContent = t.icon;
    title.textContent = t.title;
    tag.textContent = t.tag;
    tag.className = 'tag ' + t.cls;
    body.textContent = t.body;
    why.textContent = t.why;
    card.classList.add('on');
  }

  function rejectMsg(ai){
    if(ai.verdict === 'irrelevant')
      return ko()?'건물과 관련 없는 사진 같아요. 다시 확인해 주세요.':'This does not look like the building.';
    return ko()?'사진 상태 때문에 접수하지 못했어요. 위 안내를 확인해 주세요.':'Not submitted — please check the notice above.';
  }

  /* ── 관리자 화면용 ── */
  /* 관리자 화면의 위치 코드 칸을 미리 채워준다.
     match  : 유사도·격차 조건을 모두 넘긴 확신 판정
     same   : 기존 사진과 사실상 동일 → 위치는 오히려 가장 확실하다
     그 외(uncertain·skipped)는 비워 두고, 후보 버튼으로 고르게 한다. */
  function autoCode(s){
    if(!s.ai) return '';
    return (s.ai.verdict === 'match' || s.ai.verdict === 'same') ? (s.ai.code || '') : '';
  }
  function adminBadge(s){
    var ai = s.ai;
    if(!ai) return '';
    var cls, txt;
    if(ai.verdict==='match'){ cls='aiOk'; txt='AI 위치 확정'; }
    else if(ai.verdict==='uncertain'){ cls='aiWarn'; txt='AI 불확실'; }
    else if(ai.verdict==='same'){ cls='aiInfo'; txt='기존과 거의 동일'; }
    else { cls='aiInfo'; txt='AI 판별 안 됨'; }

    var h = '<div class="sugAi"><div class="row1">' +
            '<span class="tag '+cls+'">'+txt+'</span>';
    if(ai.sim !== undefined) h += '<span class="num">유사도 '+(ai.sim*100).toFixed(0)+'% · 격차 '+(ai.margin*100).toFixed(0)+'%p</span>';
    if(ai.quality) h += '<span class="num">선명도 '+Math.round(ai.quality.sharp)+'</span>';
    if(s.qr) h += '<span class="num qr">⛶ '+s.qr+' QR 스캔 후 제보</span>';
    h += '</div>';
    if(ai.top && ai.top.length){
      h += '<div class="cands">';
      for(var i=0;i<ai.top.length;i++){
        var c = ai.top[i];
        h += '<button onclick="SUGAI.pick(\''+s.id+'\',\''+c.code+'\')">'+c.code+' <span class="num">'+(c.sim*100).toFixed(0)+'%</span></button>';
      }
      h += '</div>';
    }
    return h + '</div>';
  }
  function pick(id, code){
    var el = document.getElementById('sugCode_'+id);
    if(el){ el.value = code; el.focus(); }
  }

  /* ── 미리 준비 (건의함 화면 진입 시) ── */
  function warmup(){
    var box = $('sugAiPrep'), txt = $('sugAiPrepTxt');
    var card = $('sugAiCard'); if(card) card.classList.remove('on');
    if(!box) return;
    if(!loadVectors()){
      box.className = 'aiPrep off';
      if(txt) txt.textContent = ko()?'AI 준비 안 됨 — 사람이 직접 확인해요':'AI unavailable — manual review';
      return;
    }
    if(net){ box.className='aiPrep on'; if(txt) txt.textContent = ko()?'AI 준비 완료':'AI ready'; return; }
    box.className = 'aiPrep load';
    if(txt) txt.textContent = ko()?'AI 준비하는 중…':'Preparing AI…';
    ensure().then(function(){
      box.className='aiPrep on';
      if(txt) txt.textContent = ko()?'AI 준비 완료 — 사진을 올리면 자동으로 확인해요':'AI ready — photos are checked automatically';
    })['catch'](function(){
      box.className='aiPrep off';
      if(txt) txt.textContent = ko()?'AI를 불러오지 못했어요 — 사람이 직접 확인해요':'AI unavailable — manual review';
    });
  }

  /* ── 콘솔 진단 : SUGAI.tune() 후 사진을 고르면 수치가 표로 출력된다 ── */
  function tune(){
    var i = document.createElement('input'); i.type='file'; i.accept='image/*';
    i.onchange = function(){
      var f = i.files[0]; if(!f) return;
      PHFIX.shrink(f, function(u){
        if(!u){ console.log('사진 처리 실패 :', PHFIX.lastError); return; }
        judge(u, function(r){
          console.log('판정 :', r.verdict, r.why||'');
          if(r.quality) console.table({선명도:Math.round(r.quality.sharp), 밝기:Math.round(r.quality.bright), 가로:r.quality.w, 세로:r.quality.h});
          if(r.top) console.table(r.top.map(function(x){ return {코드:x.code, 이름:codeLabel(x.code), 유사도:(x.sim*100).toFixed(1)+'%'}; }));
        });
      });
    };
    i.click();
  }

  return { judge:judge, warmup:warmup, showCard:showCard, rejectMsg:rejectMsg,
           adminBadge:adminBadge, autoCode:autoCode, pick:pick, tune:tune,
           codeLabel:codeLabel, TH:TH,
           get ready(){ return !!net; } };
})();
</script>
</body>'''

MODULE = MODULE.replace('__AIVEC__', vec)
patch('SUGAI 모듈 + 기준벡터', '</body>', MODULE)

io.open(DST, 'w', encoding='utf-8').write(s)
print('')
print('원본 : %s bytes' % orig)
print('결과 : %s bytes (+%s, +%.2f MB)' % (len(s), len(s)-orig, (len(s)-orig)/1024/1024))
print('적용 : %d개 패치' % len(done))
print('출력 : %s' % DST)
