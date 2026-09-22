var SUGAI = (function(){
  'use strict';

  /* v58 적용 시각 — 이전에 만들어진 벡터는 전처리가 달라 섞어 쓸 수 없다 */
  var V58_FROM = 1789570800000;

  /* ── 임계값 (전부 실측으로 정했다) ──────────────────────────────
     무관한 사진의 최고 유사도 0.420 < TH_RELEVANT 0.60 < 실제 사진 최저 0.679
     → 이 구간이 비어 있어서 오반려 없이 무관한 사진만 걸러진다.        */
  var TH = {
    SHARP:     45,      // 라플라시안 분산 — 이보다 낮으면 흔들린 사진
    DARK:      40,      // 평균 밝기 하한
    BRIGHT:   218,      // 평균 밝기 상한
    MINPX:    480,      // 원본 긴 변 최소 픽셀
    /* v52 재측정 (931건) — 3시점 기준벡터 + 제곱근 정규화 기준
       무관한 사진 최고 0.622 < RELEVANT 0.65 <= 실제 사진 최저 0.679  (오반려 0%)
       MATCH 0.72 & MARGIN 0.03 → 제보의 73%를 자동 확정하고 그중 정답 100% */
    /* v58 재측정 — 자기 사진을 후보에서 빼고 240장으로 다시 쟀다(leave-one-out).
       예전 값(RELEVANT .65 / MATCH .72)은 시험 사진이 이미 자료집에 들어 있는
       상태로 측정한 것이라 "정답 100%"가 나왔다. 사진이 자기 자신과 같다는 것을
       확인했을 뿐이다. 새로 찍은 사진으로 다시 재니 자동 확정의 정답률은 0% 였다.
       → AI 단독 자동 확정을 없앤다. MATCH 를 닿을 수 없는 값으로 둔다.
         AI 는 후보를 5개까지 제시하고, 확정은 번호판 OCR 이나 사용자가 한다.     */
    RELEVANT: 0.15,     // 미만 → 범위 밖 사진, 자동 반려 (정상 제보를 잘못 반려하지 않도록 낮게)
    MATCH:    9.99,     // 자동 확정 안 함 (실측 정답률 0%)
    MARGIN:   0.20,     // MATCH 와 함께만 쓰인다 — 지금은 쓰이지 않는다. 확신도는 아래 CONF
    SAME:     0.97      // 이상 → 자료집에 이미 있는 사진과 사실상 동일
  };

  /* 확신도 = 1등과 2등 장소의 유사도 차이(격차). 1등 유사도 자체는 확신도가 못 된다
     (유사도가 높은 순으로 줄 세우면 상위 10% 도 자리 60%).
     2026-09-21 eval_all.html 측정 — 다른 조원이 찍은 사진 1,522장(강의실 제외).
     사진을 반으로 나눠 한쪽에서 문턱을 정하고 다른 쪽에 적용한 값이다(문턱을 맞춘 데이터로 잰 값이 아님).
       격차 ≥ 0.22 → 자리 93.1% (사진의 약 9%)     격차 ≥ 0.16 → 층 97.9% (약 19%)
       전체         → 자리 53.3% · 층 65.6%
     이 문턱으로 '아마 여기' / '층은 N층' / '모름' 을 나눠 말한다. 자동 확정은 여전히 하지 않는다 — 관리자가 승인한다. */
  var CONF = { PLACE: 0.22, FLOOR: 0.16 };
  function confTier(ai){
    if(!ai) return 'none';
    if(ai.codeSource === 'ocr' || ai.pickedByUser) return 'plate';   // 번호판으로 읽었거나 사람이 고름
    var m = ai.margin || 0;
    if(m >= CONF.PLACE) return 'place';
    if(m >= CONF.FLOOR) return 'floor';
    return 'none';
  }

  /* 라이브러리는 두 곳에서 찾는다.
     ① 앱과 같은 서버의 lib/ 폴더 — 저장소에 올려두면 외부 인터넷이 막혀도 동작한다
     ② 공개 CDN — lib/ 폴더가 없을 때의 대비책                                */
  /* ── 건의함 접수 범위 ─────────────────────────────────────────
     지하 1층(크리에이티브 존) ~ 5층, 그리고 건물 출입문(정문·후문·동문·서문).
     옥상처럼 범위 밖인 장소는 사진이 아무리 선명해도 접수하지 않는다.
     · allow  : 이 위치 코드가 범위 안인가
     · outRx  : 제보 메모에 이런 말이 있으면 범위 밖으로 본다              */
  var SCOPE = {
    label: { ko:'지하 1층(크리에이티브 존) ~ 5층 · 건물 출입문', en:'B1 (Creative Zone) to 5F · building gates' },
    allow: function(code){
      if(!code) return false;
      code = String(code).toUpperCase();
      if(code === 'B1' || code === 'BLD' || code === 'KTC') return true;
      if(/^(EV|WC|ES)[1-5]$/.test(code)) return true;
      /* v65 : 사진을 모으며 새로 만든 장소 — 빠져 있어서 이 장소로 판별되면 제보가 거절됐다 */
      if(/^(EVIN|SIGN|EMS|WIN)[1-5]$/.test(code)) return true;
      if(/^LNG[1-5]$/.test(code)) return true;                  /* v72 : 층별 라운지(1층은 로비) */
      if(/^WIN[1-5][LR]$/.test(code)) return true;
      if(code === 'EVB1' || /^GATE_(MAIN|BACK|EAST|WEST|E|W)$/.test(code)) return true;  /* v76 */
      if(/^HALL[1-5][LR]$/.test(code)) return true;
      if(/^13[1-5]\d{2}(-[AB])?$/.test(code)) return true;
      return false;
    },
    outRx: /옥상|옥탑|루프탑|rooftop|\bRF\b|[6-9]\s*층|1[0-9]\s*층/i
  };

  var TFJS = ['lib/tf.min.js',       'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js'];
  var MNET = ['lib/mobilenet.min.js','https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js'];

  var REF = null, CODES = null, NAMES = null, DIM = 0;
  var net = null, loading = null, failed = false;

  /* ── AI 자료는 쓸 때 받는다 ──
     data/aivec.js(기준 자료 8.5MB)와 data/ailib.js(자료집 2MB)는 사진으로 위치를 찾거나
     관리자 화면을 열 때만 필요하다. 예전에는 앱을 열 때마다 모든 사람이 받았다.
     자료가 필요한 입구(판별 · 준비 · 분류 · 배우기 · 자료집 · 모델)는 먼저 ensureData() 를 거친다.
     받기에 실패하면(인터넷 끊김 등) DATA_FAILED 로 두고, 예전처럼 자료 없이(사람 검토로) 진행한다. */
  var DATA_READY = !!(window.AIVEC_DATA && window.AILIB_DATA), DATA_FAILED = false, DATA_LOADING = null;
  function loadScript(src, key){
    return new Promise(function(res, rej){
      if(window[key]) return res();
      var s = document.createElement('script');
      s.src = src;
      s.onload = function(){ if(window[key]) res(); else rej(new Error(src + ' 에 ' + key + ' 없음')); };
      s.onerror = function(){ rej(new Error(src + ' 받기 실패')); };
      document.head.appendChild(s);
    });
  }
  function ensureData(){
    if(DATA_READY) return Promise.resolve(true);
    if(DATA_LOADING) return DATA_LOADING;
    DATA_LOADING = Promise.all([loadScript('data/aivec.js', 'AIVEC_DATA'), loadScript('data/ailib.js', 'AILIB_DATA')])
      .then(function(){
        DATA_READY = true; DATA_FAILED = false;
        /* 자료 없이 먼저 만들어진 값은 버린다 — 다음에 쓸 때 자료를 넣어 다시 만든다 */
        REF = null; CODES = null; loadedLearn = false; EMB = null;
        if(!libLoading){ libLoaded = false; LIB = []; }
        return true;
      }, function(e){ DATA_FAILED = true; DATA_LOADING = null; throw e; });
    return DATA_LOADING;
  }
  function dataPending(){ return !DATA_READY && !DATA_FAILED; }

  /* ── 인터넷이 없을 때 ──
     앱은 폰에 저장해 둔 것으로 열리지만(sw.js), AI 자료·모델은 저장하지 않는다 — AI 는 인터넷이 될 때만.
     끊긴 동안 받기에 실패했으면, 인터넷이 돌아왔을 때 다시 받을 수 있게 실패 표시를 푼다. */
  function isOffline(){ return navigator.onLine === false; }
  function onNetChange(){
    if(!isOffline()){
      if(!DATA_READY){ DATA_FAILED = false; DATA_LOADING = null; }
      if(!net){ failed = false; loading = null; }
    }
    var cur = document.querySelector('.screen.on');
    if(cur && cur.id === 'ssug') warmup();
  }
  window.addEventListener('online', onNetChange);
  window.addEventListener('offline', onNetChange);

  function ko(){ return (typeof LANG==='undefined' || LANG==='ko'); }
  function $(id){ return document.getElementById(id); }

  /* ── 내장 기준벡터 풀기 (int8 → float) ── */
  function loadVectors(){
    if(REF) return true;
    /* v63 : 기준 데이터는 옆 파일 aivec.js 가 window.AIVEC_DATA 에 넣어 준다.
       예전처럼 index.html 안에 박혀 있는 경우도 그대로 읽는다(둘 다 동작). */
    var d = null;
    if(window.AIVEC_DATA){
      d = window.AIVEC_DATA;
    }else{
      var el = $('EMBEDDED_AIVEC');
      if(!el) return false;
      try{ d = JSON.parse(el.textContent); }catch(e){ return false; }
    }
    if(!d || !d.dim) return false;
    /* v63b : 원본 목록을 그대로 쓰면 뒤에 덧붙인 학습분이 원본에 쌓인다 — 복사해서 쓴다 */
    d = {dim:d.dim, n:d.n, q:d.q, codes:(d.codes || []).slice(), names:(d.names || []).slice(),
         mean:d.mean, pc:d.pc, pc2:d.pc2, post:d.post, views:d.views};
    try{
      DIM = d.dim; CODES = d.codes; NAMES = d.names || [];
      /* v58 : 평균·제1주성분 (Float32 를 base64 로 담았다) */
      try{ AIMEAN = d.mean ? b64ToF32(d.mean) : null; }catch(e){ AIMEAN = null; }
      try{ AIPC   = d.pc   ? b64ToF32(d.pc)   : null; }catch(e){ AIPC   = null; }
      try{ AIPC2  = d.pc2  ? b64ToF32(d.pc2)  : null; }catch(e){ AIPC2  = null; }
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
      /* v67 : 번호판 조각 시점은 비교에서 뺀다 — 숫자만 빼면 어느 층이든 똑같이 생겨서
         다른 층 복도를 끌어왔다 (다른 조원 사진 1,468장 : 정확한 자리 41.1% → 46.0%).
         aivec 은 사진마다 벡터가 이어져 있고, 3개짜리 사진의 첫 벡터가 번호판 조각이다. */
      if(d.views && d.views[0] === 'plate' && NAMES.length === REF.length && CODES.length === REF.length){
        var kr = [], kc = [], kn = [];
        for(var t=0; t<REF.length; t++){
          var nm = NAMES[t];
          if(nm && NAMES[t+1] === nm && NAMES[t+2] === nm && NAMES[t-1] !== nm) continue;   // 번호판 조각
          kr.push(REF[t]); kc.push(CODES[t]); kn.push(nm);
        }
        REF = kr; CODES = kc; NAMES = kn;
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

    loading = ensureData()['catch'](function(){})   /* 자료를 못 받아도 모델은 받는다 (배우기에는 모델만 있으면 된다) */
      .then(function(){ return scriptAny(TFJS, function(){ return !!window.tf; }); })
      .then(function(){ return scriptAny(MNET, function(){ return !!window.mobilenet; }); })
      .then(function(){
        return tf.setBackend('webgl')['catch'](function(){ return tf.setBackend('cpu'); });
      })
      .then(function(){ return tf.ready(); })
      .then(function(){
        /* 모델은 늘 tfhub 의 원래 모델(mobilenet_v2_050_224)을 쓴다. 기준 자료가 이 모델로 만들어졌다.
           예전에는 같은 서버의 model/ 을 먼저 찾았는데, 로컬 모델은 값이 달라 판별이 전부 틀어졌고
           (2026-09-18) 두지 않기로 해서 매번 404 만 남겼다. 앱으로 포장할 때는 tfhub 모델 파일을 그대로 받아 넣는다. */
        return mobilenet.load({version:2, alpha:0.5});
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
      .then(function(m){ setTimeout(function(){ srvDrain(); }, 200); return m; })   /* v64 */
      ['catch'](function(e){ failed = true; loading = null; throw e; });
    return loading;
  }

  /* ── 사진 → 224x224 (밝기·대비 정규화 포함) ─────────────────────
     같은 장소도 조명에 따라 완전히 다르게 찍힌다. 밝기 히스토그램의
     2~98% 구간을 0~255로 펴서 조명 차이를 지운 뒤 모델에 넣는다.
     기준벡터도 똑같은 처리로 계산했다. 이 정규화 하나로 저조도 사진
     정확도가 15.6% → 97.8% 로 올랐다. */
  /* crop을 주면 사진 가운데 그만큼만 잘라서 본다 (예: 0.75 → 가운데 75%를 확대해서 본 시점).
     같은 장소라도 찍은 거리가 다르면 특징이 꽤 달라지므로, 여러 시점을 만들어 비교한다. */
  function prep(img, crop){
    var cv = document.createElement('canvas');
    cv.width = 224; cv.height = 224;
    var cx = cv.getContext('2d');
    cx.fillStyle = '#000'; cx.fillRect(0,0,224,224);
    if(crop && crop < 1){
      var sw = img.width*crop, sh = img.height*crop;
      cx.drawImage(img, (img.width-sw)/2, (img.height-sh)/2, sw, sh, 0, 0, 224, 224);
    } else {
      cx.drawImage(img, 0, 0, 224, 224);
    }
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
  /* vec 하나 또는 여러 시점의 배열을 받는다. 여러 시점이면 각 기준벡터에 대해
     가장 잘 맞는 시점의 값을 쓴다 (제보 사진을 확대해서도 대보는 효과). */
  function rank(vec){
    var qs = (vec && vec.length && vec[0] && vec[0].length) ? vec : [vec];
    var m = {}, i, j, k;
    for(i=0;i<REF.length;i++){
      var r = REF[i], d = -2;
      for(k=0;k<qs.length;k++){
        var q = qs[k], t = 0;
        for(j=0;j<DIM;j++) t += q[j]*r[j];
        if(t > d) d = t;
      }
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
    if(/^WC\d$/.test(code)) return code.slice(2) + (ko()?'층 화장실':'F restroom');
    if(/^ES\d$/.test(code)) return code.slice(2) + (ko()?'층 계단':'F stairs');
    /* v65 : 새로 만든 장소 이름 */
    if(/^EVIN\d$/.test(code)) return code.slice(4) + (ko()?'층 엘리베이터 안':'F inside elevator');
    /* v72 : 1층은 라운지가 아니라 로비(안내실·정문)다 */
    if(code === 'LNG1')       return ko()?'1층 로비':'1F lobby';
    if(/^LNG\d$/.test(code))  return code.slice(3) + (ko()?'층 라운지':'F lounge');
    if(/^SIGN\d$/.test(code)) return code.slice(4) + (ko()?'층 비상대피 안내판':'F evacuation map');
    if(/^EMS\d$/.test(code))  return code.slice(3) + (ko()?'층 비상계단':'F emergency stairs');
    var mw = code.match(/^WIN(\d)([LR]?)$/);
    if(mw) return mw[1] + (ko()?'층 ':'F ') + (mw[2]==='L' ? (ko()?'왼쪽 ':'left ') : mw[2]==='R' ? (ko()?'오른쪽 ':'right ') : '') + (ko()?'창밖':'window view');
    if(code === 'EVB1') return ko()?'엘리베이터 지하 1층':'Elevator B1';
    if(code === 'KTC')  return ko()?'4층 KTC 동아리방':'4F KTC club room';     /* v77 */
    /* v75 : 같은 문이 GATE_E 와 GATE_EAST 두 가지로 불린다 — 둘 다 받는다 */
    var GATE_KO = {MAIN:'정문', BACK:'후문', E:'동문', W:'서문', EAST:'동문', WEST:'서문'},
        GATE_EN = {MAIN:'Main gate', BACK:'Back gate', E:'East gate', W:'West gate', EAST:'East gate', WEST:'West gate'};
    var mg = code.match(/^GATE_(MAIN|BACK|EAST|WEST|E|W)$/);
    if(mg) return ko() ? GATE_KO[mg[1]] : GATE_EN[mg[1]];
    var mh = code.match(/^HALL(\d)([LR])$/);
    if(mh) return mh[1] + (ko()?'층 ':'F ') + (mh[2]==='L' ? (ko()?'좌측 복도':'left hall') : (ko()?'우측 복도':'right hall'));
    if(/^\d{5}/.test(code)) return code + (ko()?'호':'');
    return code;
  }

  /* ══════════════════════════════════════════════════════════════
     v53 : 번호판 읽기 (OCR)
     복도·엘리베이터 앞은 어느 층이나 똑같이 생겨서 사진 생김새만으로는 층을 알 수 없다.
     대신 벽에 붙은 호실 번호판(13512 등)을 읽으면 층(첫 자리 뒤 숫자)이 확실해진다.
     tesseract.js 를 숫자만 읽도록 설정해 쓴다. 라이브러리는
       ① 같은 서버 lib/tess/  ② 공개 CDN  순으로 찾고, 못 받으면 조용히 건너뛴다(예전과 같은 판정).
     ══════════════════════════════════════════════════════════════ */
  var TESS_JS  = ['lib/tess/tesseract.min.js', 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'];
  var TESS_CDN = { worker:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
                   core:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',
                   lang:'https://tessdata.projectnaptha.com/4.0.0_fast' };
  var OCR = { ENABLED:true, TIMEOUT:32000, MINCONF:40 };
  var ocrWorker = null, ocrLoading = null, ocrFailed = false, ocrSrc = '';

  function ocrLocalOk(){
    if(location.protocol !== 'http:' && location.protocol !== 'https:') return Promise.resolve(false);
    if(typeof fetch !== 'function') return Promise.resolve(false);
    var u; try{ u = new URL('lib/tess/worker.min.js', location.href).href; }catch(e){ return Promise.resolve(false); }
    return fetch(u, {method:'HEAD'}).then(function(r){ return !!r.ok; })['catch'](function(){ return false; });
  }
  function ocrEnsure(){
    if(ocrWorker) return Promise.resolve(ocrWorker);
    if(ocrFailed) return Promise.reject('failed');
    if(ocrLoading) return ocrLoading;
    if(location.protocol === 'file:' || typeof Worker === 'undefined' || typeof WebAssembly !== 'object'){
      ocrFailed = true; return Promise.reject('unsupported');
    }
    ocrLoading = scriptAny(TESS_JS, function(){ return !!window.Tesseract; })
      .then(ocrLocalOk)
      .then(function(local){
        var opt;
        if(local){
          var base = new URL('lib/tess/', location.href).href;
          opt = { workerPath: base + 'worker.min.js', corePath: base.replace(/\/$/, ''), langPath: base.replace(/\/$/, ''), gzip:true };
          ocrSrc = 'local';
        }else{
          opt = { workerPath: TESS_CDN.worker, corePath: TESS_CDN.core, langPath: TESS_CDN.lang, gzip:true };
          ocrSrc = 'cdn';
        }
        return Tesseract.createWorker('eng', 1, opt);
      })
      .then(function(w){
        /* 숫자만, 흩어진 글자 찾기(psm 11) — 번호판처럼 사진 어딘가에 있는 짧은 숫자를 잡는다 */
        return w.setParameters({ tessedit_char_whitelist:'0123456789', tessedit_pageseg_mode:'11' })
                .then(function(){ ocrWorker = w; return w; });
      })
      ['catch'](function(e){ ocrFailed = true; ocrLoading = null; throw e; });
    return ocrLoading;
  }
  /* 앱이 아는 위치 코드 전부 (내장 + 학습 + 사진 목록) */
  function knownCodes(){
    var set = {}, i;
    loadLearned();
    if(CODES) for(i=0;i<CODES.length;i++) set[String(CODES[i]).toUpperCase()] = 1;
    if(typeof ROOM_PHOTOS !== 'undefined') for(var k in ROOM_PHOTOS) set[String(k).toUpperCase()] = 1;
    return set;
  }
  /* OCR 단어 목록에서 호실 번호를 찾는다.
     정확히 5자리(13xyz)면 그대로, 앞자리가 빠진 4자리(3512→13512, 1512→13512)는 아는 코드일 때만 보정.
     번호가 안 잡혀도 '13x'로 시작하는 3~4자리가 있으면 층만이라도 쓴다. */
  function ocrParse(words){
    if(!words || !words.length) return null;
    var known = knownCodes(), toks = [], i;
    for(i=0;i<words.length;i++){
      var w = words[i], t = String(w.text||'').replace(/\D/g, '');
      if(t.length >= 3 && (w.confidence||0) >= OCR.MINCONF) toks.push({t:t, c:w.confidence});
    }
    var best = null, floorOnly = null, raw = [], cands = [];
    for(i=0;i<toks.length;i++){
      var t = toks[i].t, c = toks[i].c, cand = null, m;
      raw.push(t);
      m = t.match(/13[1-5]\d{2}/);
      if(m){ cand = m[0]; if(t.length !== 5) c *= 0.9; }
      /* v69 : 네 자리 보정은 확신 60 이상일 때만 — "1313" 을 13313 으로 읽어
         1층 복도 사진을 3층으로 만들 뻔한 오독이 실측에서 나왔다. */
      else if(t.length === 4 && c >= 60 && /^3[1-5]\d{2}$/.test(t) && known['1'+t]){ cand = '1'+t; c *= 0.8; }
      else if(t.length === 4 && c >= 60 && /^1[1-5]\d{2}$/.test(t) && known['13'+t.slice(1)]){ cand = '13'+t.slice(1); c *= 0.7; }
      else if(/^13[1-5]\d?$/.test(t) && c >= 60){ floorOnly = floorOnly || (t.charAt(2)+'층'); }
      if(cand){
        /* v57 : 앱에 실제로 있는 호실을 우선 고른다 (13399 처럼 없는 번호는 오독).
           다만 '얼마나 확실한가' 값 자체는 부풀리지 않는다 — 부풀리면 잘못 읽은 번호까지 믿게 된다. */
        var score = known[cand] ? c*1.35 : c;
        cands.push({code:cand, conf:Math.round(Math.min(100, c)), known:!!known[cand]});
        if(!best || score > best.s) best = {code:cand, c:Math.min(100, c), s:score, raw:t};
      }
    }
    if(best) return { code:best.code, floor:best.code.charAt(2)+'층', conf:Math.round(best.c), raw:best.raw, all:raw, cands:cands };
    if(floorOnly) return { code:null, floor:floorOnly, conf:60, raw:'', all:raw };
    return null;
  }
  function ocrWords(w, src, psm){
    return w.setParameters({ tessedit_pageseg_mode: String(psm) })
      .then(function(){ return w.recognize(src); })
      .then(function(r){ return (r && r.data && r.data.words) ? r.data.words : []; });
  }
  /* ── v57 : 번호판 찾기 ────────────────────────────────────────
     공대 3호관의 호실 표지판은 두 종류다.
       ㉠ 복도로 튀어나온 표지판 — 흰 바탕에 검은 숫자 + 진한 파란 몸통에 흰 방 이름
       ㉡ 문에 붙인 종이 — 파란 바탕에 흰 숫자
     둘 다 '진한 파란 사각형'을 갖고 있고, 복도의 나머지(베이지·회색·갈색)에는 이 색이 없다.
     그래서 파란 덩어리를 찾아 그 둘레를 넉넉히 잘라내면 번호가 그 안에 들어온다.
     찾은 곳만 크게 확대해 읽으므로, 사진 전체를 훑던 예전 방식보다 훨씬 잘 읽힌다.       */
  var PLATE = { W:512, MINPX:60, MAXAREA:0.10, MINFILL:0.35, ARLO:0.25, ARHI:4.0, MAX:3 };

  function plateBoxes(img, P){
    P = P || PLATE;                                  /* v66 : 설정을 바꿔 부를 수 있게 */
    var k = Math.min(1, P.W / Math.max(img.width || 1, img.height || 1));
    var w = Math.max(1, Math.round((img.width||1) * k));
    var h = Math.max(1, Math.round((img.height||1) * k));
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var d;
    try{
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      d = cv.getContext('2d').getImageData(0, 0, w, h).data;
    }catch(e){ return []; }
    var n = w*h, mask = new Uint8Array(n), i, p, r, g, b, mx, mn;
    for(i=0;i<n;i++){
      p = i<<2; r = d[p]; g = d[p+1]; b = d[p+2];
      mx = r > g ? (r > b ? r : b) : (g > b ? g : b);
      mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
      /* 진한 파랑 : 파랑이 빨강·초록보다 뚜렷하게 크고, 너무 어둡지도 하얗지도 않다 */
      if(b - r > 35 && b - g > 20 && b > 55 && b < 240 && mx - mn > 38) mask[i] = 1;
    }
    var seen = new Uint8Array(n), stack = new Int32Array(n), out = [], sp, j, x, y, x0, y0, x1, y1, cnt;
    for(i=0;i<n;i++){
      if(!mask[i] || seen[i]) continue;
      sp = 0; stack[sp++] = i; seen[i] = 1;
      x0 = w; y0 = h; x1 = -1; y1 = -1; cnt = 0;
      while(sp){
        j = stack[--sp]; cnt++;
        x = j % w; y = (j / w) | 0;
        if(x < x0) x0 = x;
        if(x > x1) x1 = x;
        if(y < y0) y0 = y;
        if(y > y1) y1 = y;
        if(x+1 < w && mask[j+1] && !seen[j+1]){ seen[j+1] = 1; stack[sp++] = j+1; }
        if(x   > 0 && mask[j-1] && !seen[j-1]){ seen[j-1] = 1; stack[sp++] = j-1; }
        if(y+1 < h && mask[j+w] && !seen[j+w]){ seen[j+w] = 1; stack[sp++] = j+w; }
        if(y   > 0 && mask[j-w] && !seen[j-w]){ seen[j-w] = 1; stack[sp++] = j-w; }
      }
      var bw = x1-x0+1, bh = y1-y0+1, area = bw*bh, ar = bw/bh;
      if(cnt < P.MINPX*(P.W/512)*(P.W/512) || area > P.MAXAREA*n) continue;
      if(cnt/area < P.MINFILL) continue;
      if(ar < P.ARLO || ar > P.ARHI) continue;
      out.push({ n:cnt, x0:x0/w, y0:y0/h, x1:(x1+1)/w, y1:(y1+1)/h });
    }
    out.sort(function(a,b){ return b.n - a.n; });
    return out.slice(0, P.MAX);
  }

  /* 흑백으로 바꾸고 대비를 끝까지 늘린다 (tesseract 는 검은 글씨·흰 바탕을 가장 잘 읽는다).
     inv=true 면 흑백을 뒤집는다 — 파란 바탕에 흰 숫자인 표지판용.                        */
  function ocrPrep(src, inv){
    var w = src.width, h = src.height, cx = src.getContext('2d'), im;
    try{ im = cx.getImageData(0, 0, w, h); }catch(e){ return src; }
    var d = im.data, n = w*h, hist = new Uint32Array(256), gray = new Uint8Array(n), i, v;
    for(i=0;i<n;i++){
      v = (d[i<<2]*0.299 + d[(i<<2)+1]*0.587 + d[(i<<2)+2]*0.114) | 0;
      gray[i] = v; hist[v]++;
    }
    var lo = 0, hi = 255, acc = 0, cut = n*0.03;
    for(i=0;i<256;i++){ acc += hist[i]; if(acc >= cut){ lo = i; break; } }
    acc = 0;
    for(i=255;i>=0;i--){ acc += hist[i]; if(acc >= cut){ hi = i; break; } }
    var sp = (hi > lo) ? 255/(hi-lo) : 1;
    var out = document.createElement('canvas'); out.width = w; out.height = h;
    var oc = out.getContext('2d'), im2 = oc.createImageData(w, h), d2 = im2.data;
    for(i=0;i<n;i++){
      v = (gray[i]-lo)*sp;
      v = v < 0 ? 0 : (v > 255 ? 255 : v);
      if(inv) v = 255 - v;
      d2[i<<2] = d2[(i<<2)+1] = d2[(i<<2)+2] = v; d2[(i<<2)+3] = 255;
    }
    oc.putImageData(im2, 0, 0);
    return out;
  }

  /* 파란 덩어리 둘레를 넉넉히(위로 많이 — 번호가 표지판 윗부분에 있다) 잘라 크게 확대한다 */
  function plateCrop(img, b){
    var bw = b.x1-b.x0, bh = b.y1-b.y0;
    var x0 = Math.max(0, b.x0 - 0.40*bw), x1 = Math.min(1, b.x1 + 0.40*bw);
    var y0 = Math.max(0, b.y0 - 0.95*bh), y1 = Math.min(1, b.y1 + 0.30*bh);
    var sx = Math.round(x0*img.width), sy = Math.round(y0*img.height);
    var sw = Math.round((x1-x0)*img.width), sh = Math.round((y1-y0)*img.height);
    if(sw < 10 || sh < 10) return null;
    var k = Math.min(420/sh, 1100/sw);
    if(k < 1) k = 1;
    if(k > 8) k = 8;
    var cv = document.createElement('canvas');
    cv.width = Math.round(sw*k); cv.height = Math.round(sh*k);
    try{ cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height); }
    catch(e){ return null; }
    return cv;
  }

  /* 사진을 4조각(가로세로 55%씩, 45% 간격)으로 나눠 2배 확대 — 멀리 있는 작은 번호판용 */
  function ocrTiles(img){
    var W = img.width, H = img.height, tw = Math.floor(W*0.55), th = Math.floor(H*0.55), out = [];
    var pos = [[0,0],[1,0],[0,1],[1,1]];
    for(var i=0;i<pos.length;i++){
      var cv = document.createElement('canvas'); cv.width = tw*2; cv.height = th*2;
      var cx = cv.getContext('2d');
      cx.drawImage(img, Math.floor(pos[i][0]*W*0.45), Math.floor(pos[i][1]*H*0.45), tw, th, 0, 0, tw*2, th*2);
      out.push(cv);
    }
    return out;
  }
  /* ══════════════════════════════════════════════════════════════
     v66 : 글자 읽기 개선
     ① 번호판 — 파란 판 둘레에서 '숫자 줄'만 찾아, 그 덩어리 픽셀만 흰 바탕에 검게 다시 그리고
        기울기를 바로잡아 한 줄 모드로 읽는다. KSNU 로고 띠·종이 테두리가 섞이면 tesseract 가
        글자 줄을 못 찾아 또렷한 번호도 못 읽었다. (복도 60장 : 층 9장 → 22장, 오독 0)
     ② 엘리베이터 안 — 층 표시기(검은 판 위 파랑~보라 빛 글자)를 읽는다. 화살표는 모양·자리로 거른다.
        (엘리베이터 안 30장 : 층 29장, 오독 0 — 사진 모양만으로는 11.5% · 엘리베이터 앞 230장 : 오독 0)
     ③ 비상대피 안내판 — 제목 띠 "…3호관 N층 비상대피 경로"를 한국어 모델로 읽는다.
     ②③ 은 AI 순위 5등 안에 그 장면이 있을 때만 읽는다(다른 사진에서는 엉뚱한 숫자를 읽는다).
     ══════════════════════════════════════════════════════════════ */
  var PLATE2 = { W:1024, MINPX:60, MAXAREA:0.10, MINFILL:0.35, ARLO:0.25, ARHI:4.0, MAX:5 };
  var BAR    = { W:1024, MINPX:60, MAXAREA:0.10, MINFILL:0.30, ARLO:0.25, ARHI:25,  MAX:10 };
  var SCENE  = { TOPK:5, TIMEOUT:30000 };

  function v66Canvas(w, h){ var c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
  function v66Img(url){
    return new Promise(function(res, rej){ var im = new Image(); im.onload = function(){ res(im); }; im.onerror = function(){ rej('image'); }; im.src = url; });
  }

  /* ── ① 숫자 줄 ──
     b : 파란 판(0~1 좌표), R : 판 위아래로 볼 범위(판 높이 배수), TH : 확대 후 높이 */
  function v66DigitLines(img, b, R, TH, max, minH){
    var bw = b.x1-b.x0, bh = b.y1-b.y0;
    var x0 = Math.max(0, b.x0-0.18*bw), x1 = Math.min(1, b.x1+0.18*bw), y0 = Math.max(0, b.y0+R[0]*bh), y1 = Math.min(1, b.y0+R[1]*bh);
    var sx = Math.round(x0*img.width), sy = Math.round(y0*img.height), sw = Math.round((x1-x0)*img.width), sh = Math.round((y1-y0)*img.height);
    if(sw < 10 || sh < 10) return [];
    var k = Math.min(TH/sh, 1400/sw); k = Math.max(0.5, Math.min(8, k));
    var W = Math.round(sw*k), H = Math.round(sh*k), cv = v66Canvas(W, H), d;
    try{ var cx = cv.getContext('2d'); cx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H); d = cx.getImageData(0, 0, W, H).data; }catch(e){ return []; }
    var n = W*H, g = new Float32Array(n), I = new Float64Array((W+1)*(H+1)), i, j, x, y;
    for(i=0;i<n;i++) g[i] = d[i<<2]*0.299 + d[(i<<2)+1]*0.587 + d[(i<<2)+2]*0.114;
    for(y=0;y<H;y++){ var row = 0; for(x=0;x<W;x++){ row += g[y*W+x]; I[(y+1)*(W+1)+x+1] = I[y*(W+1)+x+1] + row; } }
    var r = Math.max(6, Math.round(Math.min(W, H)/10)), out = [];
    var m = new Uint8Array(n), lab = new Int32Array(n), st = new Int32Array(n);
    /* 0 : 흰 바탕 검은 글씨, 1 : 어두운 바탕 흰 글씨 — 문턱 두 단계(흐려서 글자가 붙을 때 대비) */
    var PASSES = [[0,0.82],[1,1.18],[0,0.68],[1,1.4]];
    for(var pi=0; pi<PASSES.length; pi++){
      var pol = PASSES[pi][0], fk = PASSES[pi][1];
      for(y=0;y<H;y++){
        var ya = Math.max(0, y-r), yb = Math.min(H, y+r+1);
        for(x=0;x<W;x++){
          var xa = Math.max(0, x-r), xb = Math.min(W, x+r+1);
          var mean = (I[yb*(W+1)+xb]-I[ya*(W+1)+xb]-I[yb*(W+1)+xa]+I[ya*(W+1)+xa])/((yb-ya)*(xb-xa)), v = g[y*W+x];
          m[y*W+x] = pol === 0 ? (v < mean*fk-4 ? 1 : 0) : (v > mean*fk+4 ? 1 : 0);
        }
      }
      for(i=0;i<n;i++) lab[i] = 0;
      var comps = [], L = 0;
      for(i=0;i<n;i++){
        if(!m[i] || lab[i]) continue;
        L++; var sp = 0; st[sp++] = i; lab[i] = L;
        var cx0 = W, cx1 = 0, cy0 = H, cy1 = 0, cnt = 0;
        while(sp){
          var p = st[--sp], px = p % W, py = (p / W) | 0; cnt++;
          if(px < cx0) cx0 = px; if(px > cx1) cx1 = px; if(py < cy0) cy0 = py; if(py > cy1) cy1 = py;
          if(px > 0   && m[p-1] && !lab[p-1]){ lab[p-1] = L; st[sp++] = p-1; }
          if(px < W-1 && m[p+1] && !lab[p+1]){ lab[p+1] = L; st[sp++] = p+1; }
          if(py > 0   && m[p-W] && !lab[p-W]){ lab[p-W] = L; st[sp++] = p-W; }
          if(py < H-1 && m[p+W] && !lab[p+W]){ lab[p+W] = L; st[sp++] = p+W; }
        }
        var w = cx1-cx0+1, h = cy1-cy0+1, fill = cnt/(w*h);
        if(h >= (minH ? minH : Math.max(8, H*0.035)) && h <= H*0.4 && w <= h*4 && w >= h*0.1 && fill > 0.12 && fill < 0.92 &&
           cx0 > 0 && cy0 > 0 && cx1 < W-1 && cy1 < H-1)
          comps.push({L:L, x0:cx0, x1:cx1, y0:cy0, y1:cy1, w:w, h:h, cy:(cy0+cy1)/2});
      }
      /* 키가 비슷하고 한 줄로 늘어선 덩어리끼리 묶는다 */
      comps.sort(function(a, b2){ return a.x0 - b2.x0; });
      var par = []; for(i=0;i<comps.length;i++) par.push(i);
      var find = function(q){ while(par[q] !== q){ par[q] = par[par[q]]; q = par[q]; } return q; };
      for(i=0;i<comps.length;i++) for(j=i+1;j<comps.length;j++){
        var a = comps[i], c = comps[j], hm = Math.max(a.h, c.h);
        if(c.x0 - a.x1 > hm) continue;
        if(c.x0 < a.x0 + a.w*0.3) continue;
        if(Math.abs(a.h-c.h) > hm*0.3 || Math.abs(a.cy-c.cy) > hm*0.35) continue;
        par[find(j)] = find(i);
      }
      var groups = {};
      for(i=0;i<comps.length;i++){ var root = find(i); (groups[root] = groups[root] || []).push(comps[i]); }
      for(var key in groups){
        var grp = groups[key], hs = 0, est = 0, q2;
        for(q2=0;q2<grp.length;q2++){ hs += grp[q2].h; est += Math.max(1, Math.round(grp[q2].w/(0.6*grp[q2].h))); }  /* 붙은 글자는 폭으로 글자 수 어림 */
        var hmean = hs/grp.length;
        if(est < 3 || est > 8) continue;
        if(grp.length < 3 && est < 4) continue;
        /* 기울기 : 글자 아래 끝을 직선으로 맞춘다 */
        var mx = 0, my = 0, sxx = 0, sxy = 0;
        for(q2=0;q2<grp.length;q2++){ mx += (grp[q2].x0+grp[q2].x1)/2; my += grp[q2].y1; }
        mx /= grp.length; my /= grp.length;
        for(q2=0;q2<grp.length;q2++){ var ddx = (grp[q2].x0+grp[q2].x1)/2 - mx; sxx += ddx*ddx; sxy += ddx*(grp[q2].y1-my); }
        var ang = sxx ? Math.atan(sxy/sxx) : 0;
        var gx0 = W, gx1 = 0, gy0 = H, gy1 = 0, set = {};
        for(q2=0;q2<grp.length;q2++){ var cc = grp[q2]; set[cc.L] = 1; if(cc.x0 < gx0) gx0 = cc.x0; if(cc.x1 > gx1) gx1 = cc.x1; if(cc.y0 < gy0) gy0 = cc.y0; if(cc.y1 > gy1) gy1 = cc.y1; }
        var score = -Math.abs(est-5)*10 + hmean/H*20 + ((fk === 0.82 || fk === 1.18) ? 1 : 0);
        /* 가. 그 덩어리 픽셀만 흰 바탕에 검게 */
        var s = 40/hmean, pad = Math.round(hmean*s*0.6), gw = gx1-gx0+1, gh = gy1-gy0+1;
        var src = v66Canvas(gw, gh), sctx = src.getContext('2d'), sd = sctx.createImageData(gw, gh);
        for(y=gy0;y<=gy1;y++) for(x=gx0;x<=gx1;x++){
          var o = ((y-gy0)*gw+(x-gx0))<<2, on = set[lab[y*W+x]] === 1;
          sd.data[o] = sd.data[o+1] = sd.data[o+2] = on ? 0 : 255; sd.data[o+3] = 255;
        }
        sctx.putImageData(sd, 0, 0);
        var oc = v66Canvas(Math.round(gw*s)+2*pad, Math.round(gh*s)+2*pad), o2 = oc.getContext('2d');
        o2.fillStyle = '#fff'; o2.fillRect(0, 0, oc.width, oc.height);
        o2.translate(oc.width/2, oc.height/2); o2.rotate(-ang); o2.drawImage(src, -gw*s/2, -gh*s/2, gw*s, gh*s);
        out.push({cv:oc, score:score});
        /* 나. 같은 자리를 회색조 그대로 (흐린 사진은 흑백으로 자르면 획이 뭉개진다) */
        var gp = Math.round(hmean*0.45), qx = Math.max(0, gx0-gp), qy = Math.max(0, gy0-gp);
        var qw = Math.min(W, gx1+gp+1)-qx, qh = Math.min(H, gy1+gp+1)-qy, lo = 255, hi = 0;
        for(y=0;y<qh;y++) for(x=0;x<qw;x++){ var vv = g[(qy+y)*W+qx+x]; if(vv < lo) lo = vv; if(vv > hi) hi = vv; }
        var spn = hi > lo ? 255/(hi-lo) : 1, gc = v66Canvas(qw, qh), gctx = gc.getContext('2d'), gd = gctx.createImageData(qw, qh);
        for(y=0;y<qh;y++) for(x=0;x<qw;x++){
          var v2 = (g[(qy+y)*W+qx+x]-lo)*spn; if(pol === 1) v2 = 255-v2;
          var o3 = (y*qw+x)<<2; gd.data[o3] = gd.data[o3+1] = gd.data[o3+2] = v2; gd.data[o3+3] = 255;
        }
        gctx.putImageData(gd, 0, 0);
        var g2 = v66Canvas(Math.round(qw*s)+24, Math.round(qh*s)+24), g2x = g2.getContext('2d');
        g2x.fillStyle = '#fff'; g2x.fillRect(0, 0, g2.width, g2.height);
        g2x.translate(g2.width/2, g2.height/2); g2x.rotate(-ang); g2x.drawImage(gc, -qw*s/2, -qh*s/2, qw*s, qh*s);
        out.push({cv:g2, score:score-0.5});
      }
    }
    out.sort(function(a, b2){ return b2.score - a.score; });
    return out.slice(0, max || 6);
  }
  /* 판 모양별로 숫자가 있을 만한 곳 : 세로 종이는 맨 위 흰 칸 / 가로 판은 위에 튀어나온 흰 칸 */
  function v66PlateLines(img){
    var boxes = plateBoxes(img, PLATE2), out = [], i, j, q;
    for(i=0;i<boxes.length;i++){
      var b = boxes[i], ar = (b.x1-b.x0)/(b.y1-b.y0);
      var regs = ar < 0.75 ? [[-0.25,0.45],[-0.9,0.1]] : [[-0.9,0.1],[-0.15,0.7]];
      for(j=0;j<regs.length;j++){ var ls = v66DigitLines(img, b, regs[j], 360, 6); for(q=0;q<ls.length;q++) out.push(ls[q]); }
    }
    out.sort(function(a, b2){ return b2.score - a.score; });
    return out.slice(0, 12);
  }

  /* ── ② 엘리베이터 층 표시 ──
     화살표(↑↓) : 가는 기둥 한가운데 + 한쪽 끝에 좌우로 똑같이 벌어진 머리.
     "4" 는 위쪽 절반이 넓고, "1" 은 깃발이 왼쪽에만 있어 여기에 걸리지 않는다. */
  function v66IsArrow(lab, W, L, x0, x1, y0, y1){
    var h = y1-y0+1, w = x1-x0+1, rmin = new Int32Array(h), rmax = new Int32Array(h), q, x, y, mx = 0;
    for(q=0;q<h;q++){ rmin[q] = 1e9; rmax[q] = -1; }
    for(y=y0;y<=y1;y++) for(x=x0;x<=x1;x++) if(lab[y*W+x] === L){ q = y-y0; if(x < rmin[q]) rmin[q] = x; if(x > rmax[q]) rmax[q] = x; }
    function span(k){ return rmax[k] >= 0 ? rmax[k]-rmin[k]+1 : 0; }
    for(q=0;q<h;q++) mx = Math.max(mx, span(q));
    function rows(a, b){ var o = []; for(var k=Math.floor(a*h); k<Math.ceil(b*h); k++) o.push(Math.min(h-1, k)); return o; }
    function test(head, stem){
      var narrow = 0, i, cs = [];
      for(i=0;i<stem.length;i++) if(span(stem[i]) <= mx*0.45) narrow++;
      if(narrow < stem.length*0.85) return false;
      for(i=0;i<stem.length;i++) if(rmax[stem[i]] >= 0) cs.push((rmin[stem[i]]+rmax[stem[i]])/2);
      if(!cs.length) return false;
      cs.sort(function(a, b){ return a-b; });
      var sc = cs[cs.length>>1], hr = -1, hsp = 0;
      for(i=0;i<head.length;i++) if(span(head[i]) > hsp){ hsp = span(head[i]); hr = head[i]; }
      if(hr < 0 || hsp < mx*0.9) return false;
      var left = sc-rmin[hr], right = rmax[hr]-sc;
      return Math.min(left, right) >= 0.55*Math.max(left, right) && Math.min(left, right) >= 0.2*w;
    }
    return test(rows(0.65,1), rows(0,0.5)) || test(rows(0,0.35), rows(0.5,1));
  }
  /* 검은 판 위에서 파랑~보라로 빛나는 글자 덩어리. dil : 끊긴 획을 잇는 두께(1~3) */
  function v66Glow(img, dil){
    var k = Math.min(1, 1400/Math.max(img.width || 1, img.height || 1)), W = Math.round(img.width*k), H = Math.round(img.height*k);
    var cv = v66Canvas(W, H), d;
    try{ var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, W, H); d = cx.getImageData(0, 0, W, H).data; }catch(e){ return []; }
    var n = W*H, m0 = new Uint8Array(n), m = new Uint8Array(n), gray = new Uint8Array(n), i, x, y, R = dil || 1;
    for(i=0;i<n;i++){
      var r = d[i<<2], g = d[(i<<2)+1], b = d[(i<<2)+2];
      gray[i] = (r*0.299 + g*0.587 + b*0.114) | 0;
      /* 초록이 가장 약하고 파랑이 뚜렷이 세다 — 폰마다 색상각이 240(파랑)~300(보라)으로 다르게 찍힌다 */
      if(Math.max(r, b) >= 90 && b-g >= 28 && r-g >= -6 && r <= b*1.35) m0[i] = 1;
    }
    for(y=R;y<H-R;y++) for(x=R;x<W-R;x++){
      var on = 0;
      for(var dy=-R; dy<=R && !on; dy++) for(var dx=-R; dx<=R; dx++) if(m0[(y+dy)*W+x+dx]){ on = 1; break; }
      if(on) m[y*W+x] = 1;
    }
    var lab = new Int32Array(n), st = new Int32Array(n), comps = [], L = 0;
    for(i=0;i<n;i++){
      if(!m[i] || lab[i]) continue;
      L++; var sp = 0; st[sp++] = i; lab[i] = L;
      var x0 = W, x1 = 0, y0 = H, y1 = 0, c = 0;
      while(sp){
        var p = st[--sp], px = p % W, py = (p / W) | 0; c++;
        if(px < x0) x0 = px; if(px > x1) x1 = px; if(py < y0) y0 = py; if(py > y1) y1 = py;
        if(px > 0   && m[p-1] && !lab[p-1]){ lab[p-1] = L; st[sp++] = p-1; }
        if(px < W-1 && m[p+1] && !lab[p+1]){ lab[p+1] = L; st[sp++] = p+1; }
        if(py > 0   && m[p-W] && !lab[p-W]){ lab[p-W] = L; st[sp++] = p-W; }
        if(py < H-1 && m[p+W] && !lab[p+W]){ lab[p+W] = L; st[sp++] = p+W; }
      }
      var w = x1-x0+1, h = y1-y0+1;
      if(h < Math.max(10, H*0.009) || h > H*0.15 || h < w || h > w*7 || c/(w*h) < 0.12 || c/(w*h) > 0.85) continue;
      /* 표시기는 검은 판이다 : 글자 둘레가 어두워야 한다 (파란 하늘·창문 빛은 둘레가 밝다) */
      var pd = Math.round(h*0.4), sum = 0, cnt = 0, yy, xx;
      for(yy=Math.max(0, y0-pd); yy<=Math.min(H-1, y1+pd); yy++) for(xx=Math.max(0, x0-pd); xx<=Math.min(W-1, x1+pd); xx++){
        var jj = yy*W+xx; if(!m[jj]){ sum += gray[jj]; cnt++; }
      }
      var ring = cnt ? sum/cnt : 255, bs = 0, bn = 0;
      for(yy=y0; yy<=y1; yy++) for(xx=x0; xx<=x1; xx++){ var j2 = yy*W+xx; if(m0[j2] && lab[j2] === L){ bs += Math.max(d[j2<<2], d[(j2<<2)+2]); bn++; } }
      var bright = bn ? bs/bn : 0;
      /* 진짜 표시기 : 어두운 판(둘레 ≤80) 위의 밝은 글자(≥130), 대비 ≥70.
         로비의 남색 간판(흰 글씨) 조각을 숫자로 읽던 오탐이 이 조건으로 대부분 빠진다 (실측 8장 중 7장) */
      if(ring > 80 || bright < 130 || bright - ring < 70) continue;
      comps.push({L:L, x0:x0, x1:x1, y0:y0, y1:y1, w:w, h:h, cx:(x0+x1)/2, cy:(y0+y1)/2, arrow:v66IsArrow(lab, W, L, x0, x1, y0, y1)});
    }
    /* 같은 표시기 안에서 숫자 왼쪽(문 위) 또는 위(버튼판)에 붙은 덩어리는 화살표다 */
    var a, bb, ai, bi;
    for(ai=0; ai<comps.length; ai++) for(bi=0; bi<comps.length; bi++){
      if(ai === bi) continue;
      a = comps[ai]; bb = comps[bi];
      var hm = Math.max(a.h, bb.h);
      if(Math.abs(a.h-bb.h) > hm*0.4) continue;
      if(bb.x0 > a.x1 && bb.x0-a.x1 < hm*1.6 && Math.abs(a.cy-bb.cy) < hm*0.35) a.lead = true;
      if(bb.y0 > a.y1 && bb.y0-a.y1 < hm*0.9 && Math.abs(a.cx-bb.cx) < hm*0.45) a.lead = true;
    }
    var out = [];
    for(ai=0; ai<comps.length; ai++){
      var q = comps[ai], s = 30/q.h, pad2 = Math.round(q.h*s*0.5);
      var src = v66Canvas(q.w, q.h), sc = src.getContext('2d'), sd = sc.createImageData(q.w, q.h);
      for(y=q.y0;y<=q.y1;y++) for(x=q.x0;x<=q.x1;x++){
        var o = ((y-q.y0)*q.w+(x-q.x0))<<2, onn = lab[y*W+x] === q.L;
        sd.data[o] = sd.data[o+1] = sd.data[o+2] = onn ? 0 : 255; sd.data[o+3] = 255;
      }
      sc.putImageData(sd, 0, 0);
      var oc = v66Canvas(Math.round(q.w*s)+2*pad2, Math.round(q.h*s)+2*pad2), o2 = oc.getContext('2d');
      o2.fillStyle = '#fff'; o2.fillRect(0, 0, oc.width, oc.height); o2.drawImage(src, pad2, pad2, q.w*s, q.h*s);
      out.push({cv:oc, h:q.h, skip:!!(q.lead || q.arrow)});
    }
    out.sort(function(p1, p2){ return (p1.skip - p2.skip) || (p2.h - p1.h); });
    return out.slice(0, 8);
  }
  function v66ReadLiftOnce(w, img, dil){
    var blobs = v66Glow(img, dil), votes = {}, i = 0, tried = 0;
    /* 큰 덩어리부터 5개까지만, 같은 숫자가 두 번 나오면 바로 끝 (폰에서 오래 걸리지 않게) */
    function step(){
      if(i >= blobs.length || tried >= 5) return Promise.resolve();
      var b = blobs[i++];
      if(b.skip) return step();
      tried++;
      return w.recognize(b.cv).then(function(r){
        var t = String((r && r.data && r.data.text) || '').replace(/\D/g, ''), c = Math.round((r && r.data && r.data.confidence) || 0);
        if(t.length === 1 && c >= 50){
          var v = votes[t] = votes[t] || {n:0, s:0}; v.n++; v.s += c;
          if(v.n >= 2) return;
        }
        return step();
      });
    }
    return w.setParameters({tessedit_pageseg_mode:'10', tessedit_char_whitelist:'12345'}).then(step).then(function(){
      var E = []; for(var k in votes) E.push([k, votes[k]]);
      E.sort(function(a, b){ return (b[1].n - a[1].n) || (b[1].s - a[1].s); });
      /* 서로 다른 숫자가 같은 횟수로 나오면 모른다고 한다 (화살표를 숫자로 읽은 경우가 이렇다) */
      if(!E.length || (E.length > 1 && E[0][1].n === E[1][1].n)) return null;
      return {kind:'lift', floor:E[0][0], conf:Math.round(E[0][1].s/E[0][1].n)};
    });
  }
  function v66ReadLift(w, img, ctl){
    var dils = [1, 2, 3], i = 0;
    function next(){
      if(i >= dils.length || (ctl && ctl.dead)) return Promise.resolve(null);
      return v66ReadLiftOnce(w, img, dils[i++]).then(function(r){ return r || next(); });
    }
    function restore(r){
      return w.setParameters({tessedit_char_whitelist:'0123456789', tessedit_pageseg_mode:'11'}).then(function(){ return r; });
    }
    return next().then(restore, function(){ return restore(null); });
  }

  /* ── ③ 비상대피 안내판 ── */
  var korWorker = null, korLoading = null, korFailed = false;
  function korEnsure(){
    if(korWorker) return Promise.resolve(korWorker);
    if(korFailed) return Promise.reject('failed');
    if(korLoading) return korLoading;
    korLoading = ocrEnsure().then(function(){
      var opt;
      if(ocrSrc === 'local'){
        var base = new URL('lib/tess/', location.href).href.replace(/\/$/, '');
        opt = { workerPath: base + '/worker.min.js', corePath: base, langPath: TESS_CDN.lang, gzip:true };
      }else{
        opt = { workerPath: TESS_CDN.worker, corePath: TESS_CDN.core, langPath: TESS_CDN.lang, gzip:true };
      }
      return Tesseract.createWorker('kor', 1, opt);
    }).then(function(w){ korWorker = w; return w; })
      ['catch'](function(e){ korFailed = true; korLoading = null; throw e; });
    return korLoading;
  }
  /* 제목 띠는 왼쪽 파랑 → 오른쪽 검정 그라데이션이라 파란 부분만 잡힌다. 어두운 칸이 이어지는 만큼 좌우로 늘린다 */
  function v66GrowBar(img, b){
    var k = Math.min(1, 1024/Math.max(img.width, img.height)), W = Math.round(img.width*k), H = Math.round(img.height*k);
    var c = v66Canvas(W, H), x = c.getContext('2d'); x.drawImage(img, 0, 0, W, H);
    var y0 = Math.round(b.y0*H), y1 = Math.max(y0+1, Math.round(b.y1*H)), h = y1-y0, d = x.getImageData(0, y0, W, h).data;
    function col(cx){ var s = 0; for(var y=0;y<h;y++){ var o = (y*W+cx)<<2; if(d[o]*0.299+d[o+1]*0.587+d[o+2]*0.114 < 95) s++; } return s/h; }
    var L = Math.round(b.x0*W), R = Math.round(b.x1*W)-1, miss = 0, cx;
    for(cx=R+1; cx<W; cx++){ if(col(cx) >= 0.3){ R = cx; miss = 0; } else if(++miss > 4) break; }
    miss = 0;
    for(cx=L-1; cx>=0; cx--){ if(col(cx) >= 0.3){ L = cx; miss = 0; } else if(++miss > 4) break; }
    return {x0:L/W, x1:(R+1)/W, y0:b.y0, y1:b.y1};
  }
  /* weak : 막연한 "N층" 도 받는가 — 제목 띠만 잘라 읽었을 때만 받는다 (게시물의 "2층 사무실" 같은 글에 속지 않게) */
  function v66SignFloor(text, weak){
    var t = String(text || '').replace(/\s+/g, ''), m;
    m = t.match(/호관([1-5])층/) || t.match(/관([1-5])층/) || t.match(/3호.?([1-5])층/);
    if(m) return m[1];
    m = t.match(/([1-5])층비상/) || t.match(/([1-5])층비/);
    if(m) return m[1];
    if(!weak) return null;
    m = t.match(/(?:^|[^0-9])([1-5])층/);
    return m ? m[1] : null;
  }
  /* "N층" 의 숫자가 뭉개졌을 때(증·[ 등) : 층/증 글자 자리(또는 그 앞 한 글자)만 숫자 전용으로 다시 읽는다 */
  function v66Rescue(we, pc, words){
    var j = 0;
    function next(){
      for(; j<words.length; j++){
        if(!/[층증]/.test(words[j].text)) continue;
        var after = words.slice(j+1, j+4).map(function(q){ return q.text; }).join('');
        if(!/비|상|대|피|경|로/.test(after)) continue;
        var prev = words[j-1], bb;
        if(prev && String(prev.text).length === 1 && !/[관호과학]/.test(prev.text)) bb = prev.bbox;
        else { var b = words[j].bbox; bb = {x0:b.x0, y0:b.y0, x1:b.x0+Math.round((b.x1-b.x0)*0.45), y1:b.y1}; }
        var w = bb.x1-bb.x0, h = bb.y1-bb.y0;
        if(w < 4 || h < 8) continue;
        /* 글자 크기에 따라 tesseract 가 한 글자 모드에서 빈칸을 낸다 — 높이 30px 로 줄인 것과 원래 크기를 차례로 */
        var tries = [];
        [30/h, 1].forEach(function(sc){
          var pad = sc === 1 ? Math.round(h*0.3) : 10, dc = v66Canvas(Math.round(w*sc)+2*pad, Math.round(h*sc)+2*pad), x = dc.getContext('2d');
          x.fillStyle = '#fff'; x.fillRect(0, 0, dc.width, dc.height); x.drawImage(pc, bb.x0, bb.y0, w, h, pad, pad, w*sc, h*sc);
          tries.push(dc);
        });
        j++;
        var ti = 0;
        var one = function(){
          if(ti >= tries.length) return next();
          return we.recognize(tries[ti++]).then(function(r){
            var t = String((r && r.data && r.data.text) || '').replace(/\D/g, ''), c = Math.round((r && r.data && r.data.confidence) || 0);
            return (t.length === 1 && c >= 60) ? t : one();
          });
        };
        return one();
      }
      return Promise.resolve(null);
    }
    return next();
  }
  function v66ReadSign(wk, we, img, ctl){
    var txt = '', jobs = [], i;
    function aspect(b){ return (b.x1-b.x0)*img.width/((b.y1-b.y0)*img.height); }
    /* 가. 제목 띠 자체를 잘라 흑백을 뒤집어 한 줄로 */
    var bars = plateBoxes(img, BAR).filter(function(b){ return aspect(b) >= 4; }).slice(0, 4);
    bars.forEach(function(b0){
      var b = v66GrowBar(img, b0), bw = (b.x1-b.x0)*img.width, bh = (b.y1-b.y0)*img.height;
      var sx = Math.max(0, b.x0*img.width-0.02*bw), ex = Math.min(img.width, b.x1*img.width+0.02*bw);
      var sy = Math.max(0, b.y0*img.height-0.15*bh), ey = Math.min(img.height, b.y1*img.height+0.15*bh);
      var k = Math.max(1, Math.min(6, 90/(ey-sy)));
      [true, false].forEach(function(inv){
        jobs.push(function(){
          var c = v66Canvas(Math.round((ex-sx)*k), Math.round((ey-sy)*k));
          c.getContext('2d').drawImage(img, sx, sy, ex-sx, ey-sy, 0, 0, c.width, c.height);
          var pc = ocrPrep(c, inv);
          return wk.setParameters({tessedit_pageseg_mode:'7'}).then(function(){ return wk.recognize(pc); }).then(function(r){
            txt += ' ' + ((r && r.data && r.data.text) || '');
            var f = v66SignFloor(txt, true);
            if(f) return f;
            return v66Rescue(we, pc, (r && r.data && r.data.words) || []);
          });
        });
      });
    });
    /* 나. 안내판 아래 남색 띠 위쪽(제목 자리)을 크게 */
    var bands = plateBoxes(img, {W:1024, MINPX:60, MAXAREA:0.10, MINFILL:0.3, ARLO:0.25, ARHI:14, MAX:8})
                  .filter(function(b){ return aspect(b) >= 2.5; }).slice(0, 3);
    bands.forEach(function(b){
      var bw = (b.x1-b.x0)*img.width;
      var sx = Math.max(0, b.x0*img.width-0.08*bw), ex = Math.min(img.width, b.x1*img.width+0.08*bw);
      var sy = Math.max(0, b.y0*img.height-0.95*bw), ey = Math.min(img.height, b.y1*img.height);
      if(ex-sx < 20 || ey-sy < 20) return;
      jobs.push(function(){
        var k = Math.min(4, 1800/(ex-sx)), c = v66Canvas(Math.round((ex-sx)*k), Math.round((ey-sy)*k));
        c.getContext('2d').drawImage(img, sx, sy, ex-sx, ey-sy, 0, 0, c.width, c.height);
        return wk.setParameters({tessedit_pageseg_mode:'11'}).then(function(){ return wk.recognize(c); }).then(function(r){
          txt += ' ' + ((r && r.data && r.data.text) || ''); return v66SignFloor(txt);
        });
      });
    });
    /* 다. 사진 전체 */
    jobs.push(function(){
      var k = Math.min(1, 1600/Math.max(img.width, img.height)), c = v66Canvas(Math.round(img.width*k), Math.round(img.height*k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return wk.setParameters({tessedit_pageseg_mode:'11'}).then(function(){ return wk.recognize(c); }).then(function(r){
        txt += ' ' + ((r && r.data && r.data.text) || ''); return v66SignFloor(txt);
      });
    });
    i = 0;
    function next(){
      if(i >= jobs.length || (ctl && ctl.dead)) return Promise.resolve(null);
      return jobs[i++]().then(function(f){ return f ? {kind:'sign', floor:f, conf:70} : next(); }, function(){ return next(); });
    }
    function restore(r){
      return we.setParameters({tessedit_char_whitelist:'0123456789', tessedit_pageseg_mode:'11'}).then(function(){ return r; });
    }
    return we.setParameters({tessedit_pageseg_mode:'10', tessedit_char_whitelist:'12345'}).then(next).then(restore, function(){ return restore(null); });
  }

  function sceneWanted(rk){
    if(!rk || !rk.length) return false;
    return rk.slice(0, SCENE.TOPK).some(function(x){ return /^(EVIN|SIGN)[1-5]$/.test(String(x.code).toUpperCase()); });
  }
  /* ②③ 실행 : 번호판으로 층을 못 정했고, AI 순위 5등 안에 그 장면이 있을 때만 */
  function sceneRun(url, rk, res){
    if(!OCR.ENABLED || !rk || !rk.length) return Promise.resolve(null);
    if(res && res.floorSource === 'ocr') return Promise.resolve(null);
    var top = rk.slice(0, SCENE.TOPK).map(function(x){ return String(x.code).toUpperCase(); });
    var lift = top.some(function(c){ return /^EVIN[1-5]$/.test(c); });
    var sign = top.some(function(c){ return /^SIGN[1-5]$/.test(c); });
    if(!lift && !sign) return Promise.resolve(null);
    var timer = null, ctl = {dead:false};
    var work = v66Img(url).then(function(im){
      var p = Promise.resolve(null);
      if(lift) p = ocrEnsure().then(function(w){ return v66ReadLift(w, im, ctl); }).then(function(r){
        /* 지하 1층 표시기는 "B1" 이다 — B 를 화살표처럼 건너뛰고 1 만 읽으면 1층이 된다.
           AI 순위에 지하가 있으면 1 은 믿지 않는다 (실측 : 틀린 4장이 전부 이 경우, 1층 엘리베이터 사진엔 지하 후보가 없었다) */
        if(r && r.floor === '1' && top.some(function(c){ return /^(EVB1|B1)$/.test(c); })) return null;
        return r;
      });
      if(sign) p = p.then(function(r){
        if(r && r.floor) return r;
        return ocrEnsure().then(function(we){ return korEnsure().then(function(wk){ return v66ReadSign(wk, we, im, ctl); }); });
      });
      return p;
    })['catch'](function(){ return null; });
    var late = new Promise(function(r){ timer = setTimeout(function(){ ctl.dead = true; r(null); }, SCENE.TIMEOUT); });
    return Promise.race([work, late]).then(function(v){ if(timer) clearTimeout(timer); return v; });
  }
  /* 읽은 층을 판정에 반영 : 그 장면·그 층을 맨 앞에, 같은 층 후보를 그 뒤에. 자동 승인은 하지 않는다 */
  function applyScene(res, sc, rk){
    if(!sc || !sc.floor || !rk || !rk.length) return res;
    var fl = sc.floor + '층', code = (sc.kind === 'lift' ? 'EVIN' : 'SIGN') + sc.floor;
    if(!SCOPE.allow(code)) return res;
    res.ocr = { code:null, floor:fl, conf:sc.conf || 60, raw:'', scene:sc.kind };
    res.floorSource = 'ocr';
    res.codeSource = 'scene';
    var pool = rk.map(function(x){ return {code:x.code, sim:Math.round(x.sim*1000)/1000}; }), idx = -1, i;
    for(i=0;i<pool.length;i++) if(pool[i].code === code) idx = i;
    var item = idx >= 0 ? pool.splice(idx, 1)[0] : {code:code, sim:pool[0].sim, ocrOnly:true};
    var same = [], other = [];
    for(i=0;i<pool.length;i++) (floorOf(pool[i].code) === fl ? same : other).push(pool[i]);
    var list = [item].concat(same, other);
    res.all = list.slice(0, 8); res.top = list.slice(0, 3);
    res.code = item.code; res.sim = item.sim;
    res.margin = Math.round((item.sim - (list[1] ? list[1].sim : 0))*1000)/1000;
    if(res.verdict === 'uncertain' || res.verdict === 'irrelevant') res.verdict = 'match';
    return res;
  }

  /* 사진 한 장 OCR — 실패·시간초과면 null (판정은 그대로 진행)
     ① 사진 전체를 '흩어진 글자' 모드로 → 확신(80 이상)이 있으면 끝
     ② 아니면 전체를 '한 덩어리' 모드로 + 4조각 확대 → 전부 모아 가장 확실한 번호를 고른다
     (내장 사진 104장으로 측정 : ①만 24장 → ①+② 50장에서 번호를 읽음, 오독 0) */
  /* v69 : 파란 판을 못 찾았거나 못 읽었을 때 — 사진 전체에서 숫자 줄을 찾는다 (멀리 있는 번호판)
     복도 60장 시험 : 21장 → 22장, 한 장에 0.2초 더. 파란 판으로 읽히면 여기까지 오지 않는다. */
  function v69WholeLines(img){
    return v66DigitLines(img, {x0:0, y0:0, x1:1, y1:1}, [0,1], 900, 8, 11);
  }
  /* v69 : 복도 좌우 투표 — 층은 몰라도 좌우는 잘 맞는다.
     상위 20개 후보의 유사도를 왼쪽/오른쪽으로 모아 어느 쪽이 센지 본다.
     실측(복도 920장) : 전체 81.6% · 여유 0.3 이상 98.3%(13%) · 0.1 이상 91.3%(57%) */
  function v69Side(rk){
    if(!rk || !rk.length) return null;
    var L = 0, R = 0, i, m, s;
    for(i=0; i<Math.min(20, rk.length); i++){
      m = String(rk[i].code).match(/^HALL[1-5]([LR])$/);
      if(!m) continue;
      s = rk[i].sim > 0 ? rk[i].sim : 0;
      if(m[1] === 'L') L += s; else R += s;
    }
    var tot = L + R;
    if(tot <= 0) return null;
    var margin = Math.abs(L - R) / tot;
    if(margin < 0.1) return null;
    return { side:(L >= R ? 'L' : 'R'), margin:Math.round(margin*100)/100, sure:(margin >= 0.3) };
  }
  /* v69 : 추가 사진(같은 자리에서 한 장 더)의 시점을 이어 붙인다 */
  function v69Views(img, extras){
    return embedViews(img, Q_VIEWS).then(function(qs){
      if(!extras || !extras.length) return qs;
      var out = qs.slice(), i = 0;
      function step(){
        if(i >= extras.length) return Promise.resolve(out);
        return embedUrlViews(extras[i++], Q_VIEWS).then(function(vs){
          out = out.concat(vs); return step();
        }, function(){ return step(); });
      }
      return step();
    });
  }

  function ocrRun(dataUrl, ctl){
    ctl = ctl || {};                    /* v66 : ctl.noWide — 엘리베이터 안·안내판으로 보이면 사진 전체·4조각 읽기를 건너뛴다 */
    if(!OCR.ENABLED) return Promise.resolve(null);
    var timer = null, dead = false;     /* v66 : 시간이 다 되면 남은 읽기를 그만둔다 */
    var work = ocrEnsure().then(function(w){
      return new Promise(function(res, rej){
        var im = new Image();
        im.onload = function(){ res(im); };
        im.onerror = function(){ rej('image'); };
        im.src = dataUrl;
      }).then(function(im){
        var words = [], plateWords = [], usedPlate = false;
        /* ① 번호판으로 보이는 곳부터 — 찾은 곳만 크게 확대해 읽는다 (흰 글씨/검은 글씨 둘 다) */
        var boxes = [];
        try{ boxes = plateBoxes(im); }catch(e){ boxes = []; }
        var shots = [], bi, cvv;
        /* v66 : 숫자 줄만 깨끗이 다시 그린 것부터 한 줄 모드로 */
        var lines = [];
        try{ lines = v66PlateLines(im); }catch(e){ lines = []; }
        for(bi=0; bi<lines.length; bi++) shots.push({cv:lines[bi].cv, psm:7});
        for(bi=0; bi<boxes.length; bi++){
          cvv = plateCrop(im, boxes[bi]);
          if(!cvv) continue;
          shots.push({cv:ocrPrep(cvv, false), psm:11});
          shots.push({cv:ocrPrep(cvv, true),  psm:11});
        }
        var si = 0, wholeTried = false;
        function plateStep(){
          if(dead) return null;
          if(si >= shots.length){
            /* v69 : 마지막 수단 — 사진 전체에서 숫자 줄 (파란 판을 못 찾은 사진) */
            if(wholeTried) return null;
            wholeTried = true;
            try{
              var wl = v69WholeLines(im), wi;
              for(wi=0; wi<wl.length; wi++) shots.push({cv:wl[wi].cv, psm:7});
            }catch(e){}
            if(si >= shots.length) return null;
          }
          var shot = shots[si++];
          return ocrWords(w, shot.cv, shot.psm).then(function(ws){
            plateWords = plateWords.concat(ws);
            var got = ocrParse(plateWords);
            /* 앱이 아는 호실 번호가 또렷하게 읽히면 더 볼 것 없이 끝낸다 */
            if(got && got.code && got.conf >= 55 && knownCodes()[got.code]) return got;
            return plateStep();
          })['catch'](function(){ return plateStep(); });
        }
        return (shots.length ? plateStep() : Promise.resolve(null)).then(function(hit){
          if(hit){ hit.fromPlate = true; hit.plates = boxes.length; return hit; }
          var p0 = ocrParse(plateWords);
          if(p0 && p0.code){ p0.fromPlate = true; p0.plates = boxes.length; usedPlate = true; }
          words = words.concat(plateWords);
          if(dead || ctl.noWide) return p0;
          /* ② 번호판을 못 찾았거나 못 읽었으면 예전 방식(사진 전체 + 4조각) */
          return ocrWords(w, im, 11).then(function(ws){
            words = words.concat(ws);
            var first = ocrParse(words);
            if(first && first.code && first.conf >= 80) return first;
            var tiles = [im].concat(ocrTiles(im)), i = 0;
            function next(){
              if(dead || ctl.noWide || i >= tiles.length){
                var fin = ocrParse(words);
                if(!fin && p0) return p0;
                if(fin && usedPlate && p0 && p0.code === fin.code) fin.fromPlate = true;
                return fin;
              }
              return ocrWords(w, tiles[i++], 6).then(function(ws2){ words = words.concat(ws2); return next(); });
            }
            return next();
          });
        });
      });
    })['catch'](function(){ return null; });
    var late = new Promise(function(res){ timer = setTimeout(function(){ dead = true; res(null); }, OCR.TIMEOUT); });
    return Promise.race([work, late]).then(function(v){ if(timer) clearTimeout(timer); return v; });
  }
  /* v65 : 비상계단·안내판·창밖도 층만 다르고 모양이 같은 장면이다 (EVIN 은 EV 로 이미 걸린다) */
  function isCorridor(code){ return /^(HALL|EV|WC|ES|EMS|SIGN|WIN|LNG)/.test(String(code||'').toUpperCase()); }

  /* 번호판 결과를 판정에 반영 (전체 순위 rk 기준)
     · 방 장면 + 번호가 정확히 읽힘 → 그 방으로 확정
     · 복도 장면(상위 3개 중 2개 이상이 복도·엘베) → 번호의 층에 있는 복도·엘베 후보를 맨 위로, 층 확정
     · 그 밖에 → 그 층 후보를 위로 */
  function applyOcr(res, ocr, rk){
    if(!ocr || !ocr.floor) return res;
    res.ocr = ocr;
    /* 믿을 만한가 : 확신 60 이상이거나, 앱이 아는 5자리 번호가 정확히 읽혔으면(35 이상) 우연일 가능성이 매우 낮다 */
    /* v57 : 번호판 영역을 콕 집어 읽은 번호는 우연히 맞을 가능성이 거의 없다 */
    var trust = ocr.conf >= 60 || (ocr.conf >= 35 && !!ocr.code && !!knownCodes()[ocr.code])
                || (ocr.fromPlate && ocr.conf >= 30 && !!ocr.code && !!knownCodes()[ocr.code]);
    if(!trust){ res.ocrWeak = true; return res; }
    var pool = (rk && rk.length) ? rk.map(function(x){ return {code:x.code, sim:Math.round(x.sim*1000)/1000}; }) : (res.all || res.top || []);
    if(!pool.length) return res;
    var corr = 0, i;
    /* 번호가 여러 개 읽혔고(옆방 문패까지 찍힘) 그중 하나가 사진 판별 1등과 같으면 그걸 택한다 */
    if(ocr.cands && ocr.cands.length > 1){
      for(i=0;i<ocr.cands.length;i++){
        if(ocr.cands[i].code === pool[0].code && ocr.cands[i].conf >= 35 && ocr.cands[i].code !== ocr.code){
          ocr.code = ocr.cands[i].code; ocr.floor = ocr.code.charAt(2)+'층'; ocr.conf = ocr.cands[i].conf; ocr.pickedByCnn = true;
        }
      }
    }
    for(i=0;i<Math.min(3,pool.length);i++) if(isCorridor(pool[i].code)) corr++;
    var corridor = corr >= 2;
    function finish(list, src){
      res.all = list.slice(0,8); res.top = list.slice(0,3);
      res.code = list[0].code; res.sim = list[0].sim;
      res.margin = Math.round((list[0].sim - (list[1] ? list[1].sim : 0))*1000)/1000;
      res.floorSource = 'ocr'; if(src) res.codeSource = src;
    }
    /* v56 : 앱이 모르는 번호(13297처럼 없는 방)는 번호판 오독일 가능성이 크다 — 층 힌트로만 쓴다 */
    var knownOcr = !!ocr.code && !!knownCodes()[String(ocr.code).toUpperCase()];
    if(ocr.code && !knownOcr) res.ocrUnknown = ocr.code;
    if(!corridor && ocr.code && knownOcr && SCOPE.allow(ocr.code)){
      var idx = -1;
      for(i=0;i<pool.length;i++) if(pool[i].code === ocr.code) idx = i;
      var item = idx >= 0 ? pool.splice(idx,1)[0] : {code:ocr.code, sim:pool[0].sim, ocrOnly:true};
      pool.unshift(item);
      finish(pool, 'ocr');
      if(res.verdict !== 'reject_quality') res.verdict = 'match';
      return res;
    }
    var same = [], other = [];
    for(i=0;i<pool.length;i++) (floorOf(pool[i].code) === ocr.floor ? same : other).push(pool[i]);
    if(!same.length){ res.floorOnly = ocr.floor; return res; }
    if(corridor) same.sort(function(a,b){ return (isCorridor(b.code)?1:0) - (isCorridor(a.code)?1:0) || (b.sim - a.sim); });
    finish(same.concat(other), null);
    if(res.verdict === 'uncertain' && res.sim >= TH.RELEVANT) res.verdict = 'match';
    if(res.verdict === 'irrelevant' && ocr.code) res.verdict = 'uncertain';    // 번호판이 읽혔으면 건물 사진이다
    return res;
  }

  /* ── 시점(v52) ──────────────────────────────────────────────
     Q_VIEWS   : 제보/질의 사진을 볼 시점 (원본 + 가운데 확대)
     REF_VIEWS : 새로 학습하는 사진을 기준벡터로 만들 때의 시점
                 (앱에 내장된 기준벡터는 원본·0.82·0.65 세 시점으로 미리 만들어 두었다) */
  var Q_VIEWS   = [1, 0.75];
  var REF_VIEWS = [1, 0.82];

  /* 한 이미지를 여러 시점으로 모델에 넣어 벡터들을 얻는다 */
  /* v58 : views 인자는 더 쓰지 않는다 — 시점은 aiViews 가 정한다
     (v67 부터 정사각1.0 + 정사각0.6). 호출부를 건드리지 않으려고 인자는 남겨 둔다. */
  function embedViews(img, views){
    return ensure().then(function(){
      var cvs = aiViews(img), out = [], i = 0;
      function step(){
        if(i >= cvs.length) return Promise.resolve(out);
        var t = net.infer(cvs[i], true);
        i++;
        return t.data().then(function(v){
          t.dispose();
          out.push(postVec(v));
          return step();
        });
      }
      return step();
    });
  }
  function embedUrlViews(dataUrl, views){
    return new Promise(function(res, rej){
      var im = new Image();
      im.onload = function(){ embedViews(im, views).then(res, rej); };
      im.onerror = function(){ rej('image'); };
      im.src = dataUrl;
    });
  }

  /* ── 판정 ── */
  function judge(dataUrl, cb, note, ocrUrl, extraUrls){
    if(dataPending()){ var args = arguments; ensureData().then(function(){ judge.apply(null, args); }, function(){ judge.apply(null, args); }); return; }
    /* v69 : 판별에 걸린 시간을 재서 res.ms 에 담는다 (폰 속도 확인용) */
    var t0 = Date.now(), cb0 = cb;
    cb = function(r){ if(r && r.ms === undefined) r.ms = Date.now() - t0; cb0(r); };
    var img = new Image();
    img.onload = function(){
      var q = quality(img);
      var res = { quality:q, model:'mobilenet_v2_050_224' };

      if(q.sharp < TH.SHARP){ res.verdict='reject_quality'; res.why='sharp'; cb(res); return; }
      if(q.bright < TH.DARK){ res.verdict='reject_quality'; res.why='dark';  cb(res); return; }
      if(q.bright > TH.BRIGHT){ res.verdict='reject_quality'; res.why='bright'; cb(res); return; }
      if(Math.max(q.w,q.h) < TH.MINPX){ res.verdict='reject_quality'; res.why='small'; cb(res); return; }

      if(note && SCOPE.outRx.test(String(note))){ res.verdict='out_of_scope'; res.why='note'; cb(res); return; }
      loadLearned();
      if(!REF){ res.verdict='skipped'; res.why='novec'; cb(res); return; }

      /* v53 : 번호판 읽기는 별도 워커에서 돌므로 CNN과 동시에 시작한다 */
      var ocrCtl = {};
      var ocrP = ocrRun(ocrUrl || dataUrl, ocrCtl);   /* v57 : 번호판 픽셀을 살린 큰 사본으로 읽는다 */
      /* v55 : 관리자가 넣어 둔 자료집도 후보에 포함시킨다 */
      ensure().then(function(){ return libEnsure(); }).then(function(){
        /* v52 : 제보 사진을 '그대로' 와 '가운데 확대' 두 시점으로 만들어 둘 다 비교한다.
           찍은 거리가 기준사진과 달라도 둘 중 하나는 맞게 된다. (폰에서 0.2초 정도 더 걸린다) */
        return v69Views(img, extraUrls).then(function(qs){
          var rk = rank(qs);
          if(sceneWanted(rk)) ocrCtl.noWide = true;   /* v66 */
          res.side = v69Side(rk);                     /* v69 : 복도 좌우 */
          res.all = rk.slice(0,8).map(function(x){ return {code:x.code, sim:Math.round(x.sim*1000)/1000}; });
          res.top = rk.slice(0,3).map(function(x){ return {code:x.code, sim:Math.round(x.sim*1000)/1000}; });
          res.code = rk[0].code;
          res.sim = Math.round(rk[0].sim*1000)/1000;
          res.margin = Math.round((rk[0].sim - (rk[1]?rk[1].sim:0))*1000)/1000;

          /* QR을 찍고 제보했다면 그 문과 일치하는지 함께 본다 */
          var gate = (typeof QRNAV!=='undefined' && QRNAV.gate) ? QRNAV.gate() : null;
          if(gate){ res.qrGate = gate; res.qrAgree = (res.code === 'BLD'); }

          if(note && SCOPE.outRx.test(String(note))){ res.verdict = 'out_of_scope'; res.why = 'note'; cb(res); return; }
          if(!SCOPE.allow(res.code)){ res.verdict = 'out_of_scope'; res.why = 'code'; cb(res); return; }
          if(res.sim < TH.RELEVANT)      res.verdict = 'irrelevant';
          else if(res.sim >= TH.SAME)    res.verdict = 'same';
          else if(res.sim >= TH.MATCH && res.margin >= TH.MARGIN) res.verdict = 'match';
          else                           res.verdict = 'uncertain';
          return ocrP.then(function(ocr){
            applyOcr(res, ocr, rk);                // v53 : 번호판
            /* v66 : 번호판으로 층을 못 정했고 AI 가 엘리베이터 안·비상대피 안내판으로 보면 층 표시·제목을 읽는다 */
            return sceneRun(ocrUrl || dataUrl, rk, res).then(function(sc){
              applyScene(res, sc, rk);
              applyHint(res, note, rk);            // 제보 메모를 힌트로 반영
              cb(res);
            });
          });
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
    } else if(ai.verdict === 'out_of_scope'){
      t.icon='🚫'; t.cls='aiBad'; t.tag=ko()?'접수 안 됨':'Not accepted';
      t.title=ko()?'건의함이 받는 범위 밖이에요':'Outside the accepted area';
      t.body=(ai.why==='note')
        ? (ko()?'메모에 적힌 곳은 건의함 대상이 아니에요.<br>받는 범위 : '+SCOPE.label.ko
               :'The place in your note is not covered.<br>Accepted: '+SCOPE.label.en)
        : (ko()?'받는 범위 : '+SCOPE.label.ko+'<br>이 범위 안의 장소 사진을 올려주세요.'
               :'Accepted: '+SCOPE.label.en);
    } else if(ai.verdict === 'irrelevant'){
      t.icon='🚫'; t.cls='aiBad'; t.tag=ko()?'접수 안 됨':'Not accepted';
      t.title=ko()?'건물과 관련 없는 사진 같아요':'This does not look like the building';
      t.body=ko()?'받는 범위 : '+SCOPE.label.ko+'<br>이 범위 안의 복도·강의실·출입문 사진을 올려주세요.'
                 :'Accepted: '+SCOPE.label.en;
    } else if(ai.verdict === 'same'){
      t.icon='ℹ️'; t.cls='aiInfo'; t.tag=ko()?'접수됨':'Accepted';
      t.title=ko()?'지금 앱에 있는 사진과 거의 같아요':'Almost identical to the current photo';
      t.body=ko()?'그래도 접수했어요. 관리자가 확인합니다.':'Submitted anyway — a staff member will review it.';
    } else if(ai.verdict === 'match'){
      t.icon='✅'; t.cls='aiOk'; t.tag=ko()?'위치 확인':'Location matched';
      t.title = (ai.codeSource === 'ocr')
        ? (ko() ? ('번호판으로 확인했어요 : ' + codeLabel(ai.code)) : ('Confirmed by room plate: ' + codeLabel(ai.code)))
        : (codeLabel(ai.code) + (ko() ? ' 로 확인했어요' : ' identified'));
      t.body=ko()?'관리자 화면에 위치가 자동으로 입력됩니다.':'The location is pre-filled for the reviewer.';
    } else if(ai.verdict === 'uncertain'){
      /* 격차(확신도)에 따라 세 가지로 말한다 — 기준과 근거는 위 CONF */
      var tier = confTier(ai), fl = floorOf(ai.code);
      t.tag = ko()?'접수됨':'Accepted';
      if(tier === 'place'){
        t.icon='📍'; t.cls='aiOk';
        t.title = ko() ? ('아마 여기예요 : ' + codeLabel(ai.code)) : ('Probably: ' + codeLabel(ai.code));
        t.body = ko() ? '이만큼 뚜렷한 사진은 시험에서 10장 중 9장 넘게 맞았어요. 관리자가 확인한 뒤 반영돼요.'
                      : 'Photos this distinctive were right more than 9 times in 10 in our tests. A staff member will confirm it.';
      } else if(tier === 'floor' && fl){
        t.icon='🔍'; t.cls='aiWarn';
        t.title = ko() ? ('층은 ' + fl + ' 같아요') : ('Probably ' + fl);
        t.body = ko() ? '층은 시험에서 거의 다 맞았지만(98%), 같은 층 안의 자리는 확실하지 않아요. 호실 번호판이 보이게 한 장 더 찍으면 자리까지 알 수 있어요.'
                      : 'The floor was right 98% of the time in our tests, but not the exact spot. Add a photo showing a room-number plate to pin it down.';
      } else {
        t.icon='🔍'; t.cls='aiWarn';
        t.title = ko() ? '어디인지 알 수 없어요' : 'Location unknown';
        t.body = ko() ? '복도·엘리베이터 앞은 층마다 비슷해서 사진만으로는 구별이 어려워요. 호실 번호판이 보이게 한 장 더 찍어 주시면 확실해져요. 관리자가 확인한 뒤 반영돼요.'
                      : 'Hallways and elevator lobbies look alike on every floor. Add a photo showing a room-number plate — a staff member will review it.';
      }
    } else {
      /* v61 : 사용자에게는 접수됐다는 사실 한 줄이면 충분하다.
         AI가 위치를 정했는지, 누가 확인하는지는 안쪽 사정이다. */
      t.icon='📮'; t.cls='aiInfo'; t.tag=ko()?'접수됨':'Accepted';
      t.title=ko()?'제보가 정상 접수됐습니다.':'Your report was submitted.';
      t.body='';
    }
    /* '유사도 72%' 는 맞을 확률처럼 읽혀서 보여 주지 않는다 (유사도가 높아도 자리 정답은 60% 안팎).
       대신 측정으로 뒷받침되는 확신도만 말한다. 유사도 숫자는 관리자 화면에 그대로 있다. */
    if(ai.sim !== undefined && ai.verdict !== 'unknown' && ai.verdict !== 'same'){
      var tw = { plate: ko()?'확신도 : 번호판으로 확인':'Confidence: plate read',
                 place: ko()?'확신도 : 높음':'Confidence: high',
                 floor: ko()?'확신도 : 층만':'Confidence: floor only',
                 none:  ko()?'확신도 : 낮음':'Confidence: low' }[confTier(ai)];
      t.why = tw + (ai.top && ai.top[1] ? (ko()?' · 다음 후보 ':' · next ') + codeLabel(ai.top[1].code) : '');
    }
    /* v61 : 선명도 수치는 사용자에게 의미가 없다 — 관리자 화면에는 그대로 나온다 */
    if(ai.ocr && ai.ocr.floor){
      t.why += (t.why?' · ':'') + (ko()?'🔢 번호판 ':'🔢 plate ') + (ai.ocr.code || ai.ocr.raw || '') + ' → ' + ai.ocr.floor;
    }

    icon.textContent = t.icon;
    title.textContent = t.title;
    tag.textContent = t.tag;
    tag.className = 'tag ' + t.cls;
    body.innerHTML = t.body;
    why.textContent = t.why;
    card.classList.add('on');
  }

  function rejectMsg(ai){
    if(ai.verdict === 'out_of_scope')
      return ko()?'건의함이 받는 범위(지하 1층~5층·출입문) 밖이라 접수하지 않았어요.':'Outside the accepted area — not submitted.';
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
    /* v60 : 번호판으로 읽었거나 사용자가 직접 고른 경우에만 미리 채운다.
       사진 판별 결과를 채워 두면 관리자가 그대로 승인하기 쉽고,
       승인하면 AI 가 그 틀린 위치를 학습해 버린다. */
    if(s.ai.codeSource === 'ocr' || s.ai.pickedByUser) return s.ai.code || '';
    if(s.ai.verdict === 'same') return s.ai.code || '';
    return '';
  }
  /* 위치 코드 → 층 이름 */
  function floorOf(code){
    code = String(code||'').toUpperCase();
    if(code === 'B1')  return '지하 1층';
    if(code === 'BLD') return '건물 외부';
    if(code === 'KTC') return '4층';
    if(code === 'EVB1') return '지하 1층';                       /* v65 */
    if(/^GATE_/.test(code)) return '1층';                         /* v65 : 출입문은 전부 1층 */
    var m = code.match(/^(?:EVIN|EMS|SIGN|WIN|LNG|EV|HALL|WC|ES)([1-5])/); if(m) return m[1]+'층';
    m = code.match(/^13([1-5])\d{2}/);              if(m) return m[1]+'층';
    return null;
  }
  /* 상위 후보들의 유사도를 층별로 합쳐, 정확한 자리는 몰라도 '몇 층쯤'인지 추정한다 */
  function floorGuess(top){
    if(!top || !top.length) return null;
    /* v52 : 1등과 2등이 서로 다른 층인데 격차가 작으면 층을 단정하지 않는다 */
    var sum = {}, tot = 0, i;
    for(i=0;i<top.length;i++){
      var f = floorOf(top[i].code); if(!f) continue;
      sum[f] = (sum[f]||0) + top[i].sim; tot += top[i].sim;
    }
    var best = null, bv = 0;
    for(var k in sum) if(sum[k] > bv){ bv = sum[k]; best = k; }
    if(!best || !tot) return null;
    var share = bv/tot;
    var others = Object.keys(sum).filter(function(k){ return k!==best; });
    return { floor:best, share:share, sure: share >= 0.6, others:others };
  }
  /* "여기가 어디쯤인지" 한 줄 — 관리자가 코드 몰라도 읽히게 */
  function whereText(ai){
    if(!ai || !ai.top || !ai.top.length) return '';
    var t = ai.top[0], pct = Math.round(t.sim*100);
    var sure = (ai.verdict==='match'||ai.verdict==='same');
    /* v62 : 번호판을 못 읽었으면 유사도가 높아도 믿을 수 없다.
       기준집에 없는 번호판 없는 5층 복도 사진 17장으로 실측(v65 에서 올바른 모델로 다시 잼)
       — 1등이 5층 복도인 것 0/17, 5등 안에 드는 것 9/17.
       유사도 0.72 짜리가 다른 층 엘리베이터로 나오는 일이 흔했다. */
    var hasPlate = (ai.codeSource==='ocr') || (ai.floorSource==='ocr') || !!ai.pickedByUser;
    /* 번호판이 없으면 격차(확신도)로 판단한다 — 기준과 근거는 CONF */
    var tier = confTier(ai);
    var conf = hasPlate ? (sure ? '높음' : (t.sim >= 0.70 ? '보통' : '낮음'))
             : tier === 'place' ? '보통' : '낮음';
    var low = (conf === '낮음');
    var name = codeLabel(t.code);
    /* '으로/로' 조사 : 마지막 글자에 받침이 있으면 '으로'(ㄹ 받침은 '로') */
    var lc = name.charCodeAt(name.length-1), jong = (lc>=0xAC00 && lc<=0xD7A3) ? (lc-0xAC00)%28 : 0;
    var ro = (jong===0 || jong===8) ? '로' : '으로';
    var h = '<div class="where'+(low?' low':'')+'">📍 사진만 보면 <b>'+name+'</b>'
          + (ai.verdict==='same' ? ' — 지금 앱에 있는 사진과 같음' : ro+' 추정')
          + ' <span class="num">(유사도 '+pct+'% · 신뢰도 '+conf+')</span>';
    if(ai.floorSource === 'ocr'){
      /* v53 : 번호판을 읽었으면 층은 확실하다 */
      var fo = floorOf(t.code) || (ai.ocr && ai.ocr.floor);
      var from = ai.ocr.scene === 'lift' ? '엘리베이터 안 층 표시에서 읽음'
               : ai.ocr.scene === 'sign' ? '비상대피 안내판 제목에서 읽음'
               : '사진 속 번호판 '+(ai.ocr.code||ai.ocr.raw||'')+'에서 읽음';     /* v66 */
      if(fo) h += '<span class="sub">층 : <b>'+fo+'</b> <span class="num">('+from+')</span></span>';
    } else if(sure){
      var f1 = floorOf(t.code), f2 = ai.top[1] ? floorOf(ai.top[1].code) : null;
      /* v52 : 확정이어도 2등이 다른 층이고 격차가 작으면 그 사실을 함께 알린다 */
      if(f1 && f2 && f1 !== f2 && (t.sim - ai.top[1].sim) < 0.05)
        h += '<span class="sub">층 : <b>'+f1+'</b> <span class="num">(다만 '+f2+'일 가능성도 있음 — 격차 '
           + Math.round((t.sim-ai.top[1].sim)*100)+'%p)</span></span>';
      else if(f1) h += '<span class="sub">층 : <b>'+f1+'</b></span>';
    }else if(tier === 'none'){
      /* 후보 유사도를 층별로 합친 추정 — 정확도를 잰 적이 없어서 '참고용'으로만 보여 준다.
         격차로 층·자리를 말할 수 있으면(아래 확신도 줄) 이 줄은 뺀다. */
      var fg = floorGuess(ai.top);
      if(fg){
        h += '<span class="sub">층 추정(참고용) : <b>'+fg.floor+'</b>'
           + (fg.sure ? ' — 상위 후보가 이 층에 몰려 있음' : ' 또는 '+fg.others.join('·')) + '</span>';
      }
    }
    /* v69 : 층을 몰라도 좌우는 잘 맞는다 — 복도로 보일 때만 보여 준다 */
    if(ai.side && isCorridor(t.code)){
      h += '<span class="sub">복도 좌우 : <b>' + (ai.side.side === 'L' ? '왼쪽' : '오른쪽') + '</b> '
         + '<span class="num">(' + (ai.side.sure ? '확실 — 이 조건에서 실측 98%' : '아마 — 이 조건에서 실측 89%') + ')</span></span>';
    }
    var gapPt = Math.round((ai.margin || 0) * 100);
    if(!hasPlate && tier === 'place'){
      h += '<span class="sub">확신도 : <b>1·2등 격차 ' + gapPt + '%p</b> '
         + '<span class="num">(격차 22%p 이상인 사진은 시험에서 자리 93% 맞음 — 그래도 사진을 보고 승인해 주세요)</span></span>';
    } else if(!hasPlate && tier === 'floor'){
      h += '<span class="sub">확신도 : <b>층만</b> — 1·2등 격차 ' + gapPt + '%p '
         + '<span class="num">(16%p 이상이면 시험에서 층 98% 맞음, 자리는 불확실)</span></span>';
    }
    if(!hasPlate && tier === 'none'){
      h += '<span class="sub warnsub">⚠ 사진에 호실 번호판이 안 보이고 1·2등 격차도 ' + gapPt + '%p 로 작습니다 — 층도 자리도 확인할 수 없습니다.'
         + ' 복도·엘리베이터 앞은 층마다 똑같이 생겨서, 이 경우 1등이 맞는 일이 거의 없습니다'
         + ' (시험한 17장 중 0장 — 5등 안에는 9장).'
         + ' 아래 후보에서 직접 골라 주세요.</span>';
    }
    if(ai.top[1] && low){
      h += '<span class="sub">다음 후보 : '+codeLabel(ai.top[1].code)+' '+Math.round(ai.top[1].sim*100)+'%'
         + (ai.top[2] ? ' · '+codeLabel(ai.top[2].code)+' '+Math.round(ai.top[2].sim*100)+'%' : '')+'</span>';
    }
    return h + '</div>';
  }

  function adminBadge(s){
    var ai = s.ai;
    if(!ai) return '';
    var cls, txt;
    /* v60 : 같은 '확정'이라도 무엇으로 정했는지에 따라 신뢰도가 전혀 다르다 */
    if(ai.verdict==='match'){
      if(ai.codeSource==='ocr'){ cls='aiOk';   txt='🔢 번호판으로 확정'; }
      else if(ai.codeSource==='scene'){ cls='aiOk'; txt = (ai.ocr && ai.ocr.scene==='lift') ? '🛗 엘리베이터 층 표시로 층 확정' : '🗺 안내판 제목으로 층 확정'; }   /* v66 */
      else if(ai.pickedByUser){  cls='aiOk';   txt='🙋 사용자가 고름'; }
      else {                     cls='aiWarn'; txt='📷 사진 판별 (참고용 · 자주 틀림)'; }
    }
    else if(ai.verdict==='uncertain'){ cls='aiWarn'; txt='📷 사진 판별 (참고용 · 자주 틀림)'; }
    else if(ai.verdict==='same'){ cls='aiInfo'; txt='기존과 거의 동일'; }
    else { cls='aiInfo'; txt='AI 판별 안 됨'; }

    var h = '<div class="sugAi"><div class="row1">' +
            '<span class="tag '+cls+'">'+txt+'</span>';
    if(ai.sim !== undefined) h += '<span class="num">유사도 '+(ai.sim*100).toFixed(0)+'% · 격차 '+(ai.margin*100).toFixed(0)+'%p</span>';
    if(ai.quality) h += '<span class="num">선명도 '+Math.round(ai.quality.sharp)+'</span>';
    if(ai.ms) h += '<span class="num">판별 '+(ai.ms/1000).toFixed(1)+'초</span>';   /* v69 : 폰 속도 확인용 */
    if(s.qr) h += '<span class="num qr">⛶ '+s.qr+' QR 스캔 후 제보</span>';
    if(ai.ocr && ai.ocr.floor){
      h += '<span class="num hint">' + (ai.ocr.scene === 'lift' ? '🛗 엘리베이터 층 표시' : ai.ocr.scene === 'sign' ? '🗺 안내판 제목' : '🔢 번호판 '+(ai.ocr.code || ai.ocr.raw || '')) + ' → '+ai.ocr.floor
         + (ai.codeSource==='ocr' ? ' (이 방으로 확정)' : ' (층 확정)')
         + (ai.floorConflict ? ' · 메모의 층과 다름' : '') + '</span>';
    }
    if(ai.noteCode){
      h += '<span class="num hint">📝 메모 : '+ai.noteCode +
           (ai.noteAgree ? ' (사진과 일치)' : ' (사진과 다름)')+'</span>';
    }else if(ai.noteFloor){
      h += '<span class="num hint">📝 메모 : '+ai.noteFloor+(ai.floorHintUsed ? ' (이 층 후보를 위로 올림)' : '')+'</span>';
    }
    h += '</div>';
    h += whereText(ai);
    /* v52 : 확실하지 않을 때는 후보를 더 많이(5개) 보여준다 — 관리자가 눌러서 바로 고르게 */
    /* v62 : 번호판으로 확정한 게 아니면 1등이 자주 틀리므로 후보를 넉넉히 준다 */
    var plateSure = (ai.codeSource==='ocr') || !!ai.pickedByUser || ai.verdict==='same';
    var cands = plateSure ? (ai.top||[]) : ((ai.all||ai.top||[]).slice(0,5));
    if(cands.length){
      h += '<div class="cands">';
      for(var i=0;i<cands.length;i++){
        var c = cands[i];
        h += '<button onclick="SUGAI.pick(\''+s.id+'\',\''+c.code+'\')" title="'+codeLabel(c.code)+'">'
           + '<span class="rk">'+(i+1)+'</span>'                     /* v83 : 평면도의 점 번호와 같다 */
           + codeLabel(c.code)+' <span class="num">'+c.code+' · '+(c.sim*100).toFixed(0)+'%</span></button>';
      }
      h += '</div>';
      if(typeof aiMiniMapHtml === 'function') h += aiMiniMapHtml(cands, codeLabel);   /* v83 */
    }
    return h + '</div>';
  }
  function pick(id, code){
    var el = document.getElementById('sugCode_'+id);
    if(el){ el.value = code; }
    /* v74 : 코드 칸만 바뀌면 관리자가 무엇을 고른 건지 모른다 — 이름도 같이 갱신 */
    if(typeof sugSyncName === 'function') sugSyncName(id);
    if(typeof sugPresetOne === 'function') sugPresetOne(id);
  }

  /* ── 미리 준비 (건의함 화면 진입 시) ── */
  function warmup(){
    var box = $('sugAiPrep'), txt = $('sugAiPrepTxt');
    var card = $('sugAiCard'); if(card) card.classList.remove('on');
    if(!box) return;
    if(isOffline() && !(DATA_READY && net)){
      box.className = 'aiPrep off';
      if(txt) txt.textContent = ko() ? '📶 인터넷이 없어 AI 사진 판별은 쉬어요 — 제보는 그대로 되고, 사람이 확인해요'
                                     : 'Offline — AI photo check is paused; reports still work (manual review)';
      return;
    }
    if(dataPending()){
      box.className = 'aiPrep load';
      if(txt) txt.textContent = ko() ? 'AI 사진 자료 받는 중… (처음 한 번)' : 'Downloading AI data… (first time only)';
      ensureData().then(warmup, warmup);
      return;
    }
    if(!loadVectors()){
      box.className = 'aiPrep off';
      if(txt) txt.textContent = DATA_FAILED
        ? (ko()?'AI 자료를 받지 못했어요 (인터넷 확인) — 사람이 직접 확인해요':'Could not download AI data (check internet) — manual review')
        : (ko()?'AI 준비 안 됨 — 사람이 직접 확인해요':'AI unavailable — manual review');
      return;
    }
    if(net){ box.className='aiPrep on'; if(txt) txt.textContent = ko()?'AI 준비 완료':'AI ready'; return; }
    box.className = 'aiPrep load';
    if(txt) txt.textContent = ko()?'AI 준비하는 중…':'Preparing AI…';
    ensure().then(function(){
      box.className='aiPrep on';
      var base = ko()?'AI 준비 완료':'AI ready';
      if(txt) txt.textContent = base + (ko()?' · 번호판 읽기 준비 중…':' · loading plate reader…');
      /* v53 : 모델 다음에 번호판 읽기 라이브러리도 미리 받아 둔다 (제보할 때 기다리지 않게).
         준비됐는지를 이 줄에 그대로 보여준다 — 서버에 lib/tess/ 폴더가 있는지 사용자가 눈으로 확인할 수 있게. */
      setTimeout(function(){
        ocrEnsure().then(function(){
          if(txt) txt.textContent = base + (ko()
            ? (' · 🔢 번호판 읽기 준비 완료 (' + (ocrSrc==='local' ? '앱 서버' : '인터넷') + ')')
            : (' · plate reader ready (' + (ocrSrc==='local' ? 'server' : 'internet') + ')'));
        })['catch'](function(){
          if(txt) txt.textContent = base + (ko()
            ? ' · 🔢 번호판 읽기는 못 써요 (사진 판별만 사용)'
            : ' · plate reader unavailable (photo matching only)');
        });
      }, 500);
    })['catch'](function(){
      box.className='aiPrep off';
      if(txt) txt.textContent = ko()?'AI를 불러오지 못했어요 — 사람이 직접 확인해요':'AI unavailable — manual review';
    });
  }


  /* ══════════════════════════════════════════════════════════════
     v45 확장 : 학습 · 자동분류 · 새 장소 묶기 · 메모 힌트
     ══════════════════════════════════════════════════════════════ */

  var LEARN_KEY = 'aiLearned';

  /* v64 : 관리자가 승인해 서버에 올린 사진 — 모든 기기가 같은 것을 배운다.
     사진은 서버에서 받고, 벡터는 각 기기가 한 번만 계산해 이 기기에 캐시한다.
     서버에서 빠진 사진은 캐시에서도 빠진다. */
  var SRV_KEY = 'aiServerRefs', SRV = null, SRV_TODO = [], SRV_BUSY = false;
  function srvLoad(){
    if(SRV) return SRV;
    try{ SRV = JSON.parse(localStorage.getItem(SRV_KEY) || '{}') || {}; }catch(e){ SRV = {}; }
    return SRV;
  }
  function srvSave(){ try{ localStorage.setItem(SRV_KEY, JSON.stringify(SRV || {})); }catch(e){} }
  function srvAppend(){
    srvLoad();
    Object.keys(SRV).forEach(function(pid){
      var S = SRV[pid]; if(!S || S.v !== 3 || !S.q) return;
      try{
        REF.push(b64ToVec(S.q)); CODES.push(S.code);
        if(S.q2){ REF.push(b64ToVec(S.q2)); CODES.push(S.code); }
        if(S.q3){ REF.push(b64ToVec(S.q3)); CODES.push(S.code); }
      }catch(e){}
    });
  }
  function srvRefresh(){ if(REF) rebuildRef(); }
  /* 서버의 승인 사진 목록을 받아 캐시를 맞춘다 : 없어진 것은 빼고, 새것은 계산 대기열에 */
  function syncServer(items){
    srvLoad();
    var want = {}, changed = false;
    (items || []).forEach(function(p){ if(p && p.pid && p.code && p.u) want[p.pid] = p; });
    Object.keys(SRV).forEach(function(pid){ if(!want[pid]){ delete SRV[pid]; changed = true; } });
    Object.keys(want).forEach(function(pid){
      var S = SRV[pid], p = want[pid];
      if(S && S.code !== p.code){ delete SRV[pid]; S = null; changed = true; }
      if(!S && !SRV_TODO.some(function(t){ return t.pid === pid; })) SRV_TODO.push(p);
    });
    if(changed){ srvSave(); srvRefresh(); }
    if(net) srvDrain();            // 모델이 이미 올라와 있으면 지금, 아니면 모델이 올라올 때
    return { cached: Object.keys(SRV).length, pending: SRV_TODO.length };
  }
  /* 이 기기에서 방금 올린 사진 — 바로 배운다 */
  function syncServerOne(p){
    if(!p || !p.pid || !p.u) return Promise.resolve(0);
    SRV_TODO.push(p);
    return ensure().then(srvDrain)['catch'](function(){ return 0; });
  }
  function srvDrain(){
    if(SRV_BUSY || !SRV_TODO.length) return Promise.resolve(0);
    SRV_BUSY = true; srvLoad();
    var done = 0;
    function next(){
      if(!SRV_TODO.length){ SRV_BUSY = false; if(done){ srvSave(); srvRefresh(); } return Promise.resolve(done); }
      var p = SRV_TODO.shift();
      return embedUrlViews(p.u).then(function(vs){
        SRV[p.pid] = {code:p.code, q:i8ToB64(vs[0]), q2:(vs[1] ? i8ToB64(vs[1]) : ''),
                      q3:(vs[2] ? i8ToB64(vs[2]) : ''), v:3, ts:p.ts || Date.now()};
        done++;
      })['catch'](function(){}).then(next);
    }
    return next();
  }
  function srvDrop(pid){
    srvLoad();
    SRV_TODO = SRV_TODO.filter(function(t){ return t.pid !== pid; });
    if(SRV[pid]){ delete SRV[pid]; srvSave(); srvRefresh(); }
  }
  function srvStats(){ srvLoad(); return { cached: Object.keys(SRV).length, pending: SRV_TODO.length }; }
  var LEARN_MAX = 250;              // v52 : 한 장당 시점 2개를 저장하므로 개수를 줄인다
  var LEARNED = [];                 // [{code, q:'base64 int8', n, ts}]
  var loadedLearn = false;

  /* ── 제곱근 정규화 (v52) ──────────────────────────────────────
     모델이 내놓는 1280개 숫자는 몇 개의 큰 값이 유사도를 좌우해서, 서로 다른 실내 공간이
     전부 0.9쯤으로 비슷하게 나오는 문제가 있었다. 각 값에 제곱근을 씌우면 큰 값이 눌리고
     작은 값이 살아나 '그 장소만의 세부 차이'가 유사도에 반영된다.
     기준벡터(EMBEDDED_AIVEC)에는 이미 적용해서 넣어 두었으므로, 비교하는 사진에도 똑같이 건다. */
  function powNorm(v){
    var o = new Float32Array(v.length), n = 0, i;
    for(i=0;i<v.length;i++){ o[i] = Math.sqrt(v[i] < 0 ? 0 : v[i]); n += o[i]*o[i]; }
    n = Math.sqrt(n) || 1;
    for(i=0;i<v.length;i++) o[i] /= n;
    return o;
  }
  /* 예전(v51까지) 방식으로 저장된 학습 벡터를 v52 방식으로 바꾼다 */
  function toV2(v){ return powNorm(v); }

  function i8ToB64(f32){
    var s = '', i;
    for(i=0;i<f32.length;i++){
      var q = Math.round(Math.max(-1, Math.min(1, f32[i])) * 127);
      s += String.fromCharCode(q & 0xFF);
    }
    return btoa(s);
  }
  function b64ToVec(b64){
    var bin = atob(b64), v = new Float32Array(bin.length), s = 0, i;
    for(i=0;i<bin.length;i++){
      var b = bin.charCodeAt(i);
      v[i] = (b>127 ? b-256 : b)/127;
      s += v[i]*v[i];
    }
    s = Math.sqrt(s) || 1;
    for(i=0;i<v.length;i++) v[i] /= s;
    return v;
  }

  function loadLearned(){
    if(loadedLearn) return;
    loadedLearn = true;
    /* ① 파일에 담겨 배포된 학습분 ② 이 브라우저에서 배운 것 — 둘 다 읽어 합친다 */
    var fromFile = [];
    try{
      var fe = document.getElementById('EMBEDDED_AILEARN');
      if(fe && fe.textContent.trim()) fromFile = JSON.parse(fe.textContent) || [];
    }catch(e){ fromFile = []; }
    var mine = [];
    try{
      var raw = localStorage.getItem(LEARN_KEY);
      if(raw) mine = JSON.parse(raw) || [];
    }catch(e){ mine = []; }
    var seen = {};
    LEARNED = [];
    fromFile.concat(mine).forEach(function(r){
      if(!r || !r.code || !r.q) return;
      var k = r.code + '|' + r.q.slice(0, 24);
      if(seen[k]) return;
      seen[k] = 1; LEARNED.push(r);
    });
    /* 내장 벡터 뒤에 학습분을 이어 붙인다 */
    if(loadVectors()){
      for(var i=0;i<LEARNED.length;i++){
        try{
          var L = LEARNED[i];
          /* v51까지 저장된 것은 제곱근 정규화 전의 벡터다 — 읽을 때 같은 방식으로 맞춘다 */
          /* v58 : v3 이전 학습분은 옛 전처리로 만들어져 지금 기준과 섞으면 안 된다 */
          if(L.v !== 3) continue;
          REF.push(b64ToVec(L.q)); CODES.push(L.code);
          if(L.q2){ REF.push(b64ToVec(L.q2)); CODES.push(L.code); }
          if(L.q3){ REF.push(b64ToVec(L.q3)); CODES.push(L.code); }
        }catch(e){}
      }
      srvAppend();              /* v64 : 서버 승인분 — 모든 기기 공통 */
    }
  }
  function saveLearned(){
    try{ localStorage.setItem(LEARN_KEY, JSON.stringify(LEARNED)); return true; }
    catch(e){
      /* 용량이 꽉 차면 오래된 것부터 버린다 */
      while(LEARNED.length > 40){
        LEARNED.splice(0, 20);
        try{
          localStorage.setItem(LEARN_KEY, JSON.stringify(LEARNED));
          rebuildRef();              /* v70 : 버린 만큼 기준도 다시 조립한다 */
          return true;
        }catch(e2){}
      }
      return false;
    }
  }

  /* 사진 한 장의 특징벡터 뽑기 (모델 준비 포함) — v52는 제곱근 정규화까지 적용된 벡터 */
  /* ── v58 : 표지판 크롭 + 정사각 두 배율 ──────────────────────────
     실측에서 사진 전체를 224로 늘리는 방식(Top-1 7.7%)보다
     파란 표지판을 찾아 그 둘레만 잘라 보는 쪽이 훨씬 나았다(18.6%).
     표지판을 못 찾는 사진(약 9%)은 정사각 두 배율만 쓴다.            */
  var AI_PLATE = { W:512, MINPX:60, MAXAREA:0.10, MINFILL:0.35, ARLO:0.25, ARHI:4.0 };
  function aiPlateBox(img){
    var k = Math.min(1, AI_PLATE.W / Math.max(img.width||1, img.height||1));
    var w = Math.max(1, Math.round((img.width||1)*k)), h = Math.max(1, Math.round((img.height||1)*k));
    var cv = document.createElement('canvas'); cv.width=w; cv.height=h;
    var cx = cv.getContext('2d'), d;
    try{ cx.drawImage(img,0,0,w,h); d = cx.getImageData(0,0,w,h).data; }catch(e){ return null; }
    var nn=w*h, mask=new Uint8Array(nn), i,p,r,g,b,mx,mn;
    for(i=0;i<nn;i++){
      p=i<<2; r=d[p]; g=d[p+1]; b=d[p+2];
      mx = r>g ? (r>b?r:b) : (g>b?g:b);
      mn = r<g ? (r<b?r:b) : (g<b?g:b);
      if(b-r>35 && b-g>20 && b>55 && b<240 && mx-mn>38) mask[i]=1;
    }
    var seen=new Uint8Array(nn), stk=new Int32Array(nn), best=null, sp,j,x,y,x0,y0,x1,y1,c;
    for(i=0;i<nn;i++){
      if(!mask[i]||seen[i]) continue;
      sp=0; stk[sp++]=i; seen[i]=1; x0=w; y0=h; x1=-1; y1=-1; c=0;
      while(sp){
        j=stk[--sp]; c++; x=j%w; y=(j/w)|0;
        if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
        if(x+1<w&&mask[j+1]&&!seen[j+1]){seen[j+1]=1;stk[sp++]=j+1;}
        if(x>0&&mask[j-1]&&!seen[j-1]){seen[j-1]=1;stk[sp++]=j-1;}
        if(y+1<h&&mask[j+w]&&!seen[j+w]){seen[j+w]=1;stk[sp++]=j+w;}
        if(y>0&&mask[j-w]&&!seen[j-w]){seen[j-w]=1;stk[sp++]=j-w;}
      }
      var bw=x1-x0+1, bh=y1-y0+1, ar=bw/bh;
      if(c<AI_PLATE.MINPX || bw*bh>AI_PLATE.MAXAREA*nn) continue;
      if(c/(bw*bh)<AI_PLATE.MINFILL) continue;
      if(ar<AI_PLATE.ARLO || ar>AI_PLATE.ARHI) continue;
      if(!best || c>best.n) best={n:c,x0:x0/w,y0:y0/h,x1:(x1+1)/w,y1:(y1+1)/h};
    }
    return best;
  }
  /* ── v67 : 224 로 줄일 때 블록 평균을 직접 계산한다 ─────────────
     브라우저의 기본 축소(drawImage)는 상황(화면 크기·GPU·메모리)에 따라 계단 무늬가 달라져,
     같은 사진의 크기만 다른 사본끼리도 벡터 유사도가 0.82~0.92 밖에 안 나왔다.
     직접 평균내면 0.98~0.99 로 안정된다. gen.html 의 sqView 와 같은 코드여야 한다.   */
  function aiSqView(img, zoom){
    var w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
    var sz = Math.min(w, h) * zoom, S = Math.max(1, Math.round(sz));
    var sx = Math.round((w - sz)/2), sy = Math.round((h - sz)/2);
    var cv = document.createElement('canvas'); cv.width = 224; cv.height = 224;
    var cx = cv.getContext('2d'); cx.fillStyle = '#000'; cx.fillRect(0, 0, 224, 224);
    if(S < 270){ cx.drawImage(img, sx, sy, S, S, 0, 0, 224, 224); return cv; }   /* 늘려야 하는 작은 사진은 예전 방식 */
    var c0 = document.createElement('canvas'); c0.width = S; c0.height = S;
    var d;
    try{
      var x0 = c0.getContext('2d', {willReadFrequently:true});
      x0.drawImage(img, sx, sy, S, S, 0, 0, S, S);
      d = x0.getImageData(0, 0, S, S).data;
    }catch(e){ cx.drawImage(img, sx, sy, S, S, 0, 0, 224, 224); return cv; }
    var od = cx.createImageData(224, 224), x, y, xx, yy;
    for(y=0;y<224;y++){
      var ya = Math.floor(y*S/224), yb = Math.max(ya+1, Math.floor((y+1)*S/224));
      for(x=0;x<224;x++){
        var xa = Math.floor(x*S/224), xb = Math.max(xa+1, Math.floor((x+1)*S/224));
        var r=0, g=0, b=0, cnt=0;
        for(yy=ya; yy<yb; yy++){
          var p = (yy*S+xa)<<2;
          for(xx=xa; xx<xb; xx++){ r+=d[p]; g+=d[p+1]; b+=d[p+2]; p+=4; cnt++; }
        }
        var o = (y*224+x)<<2;
        od.data[o]=r/cnt; od.data[o+1]=g/cnt; od.data[o+2]=b/cnt; od.data[o+3]=255;
      }
    }
    cx.putImageData(od, 0, 0);
    return cv;
  }
  function aiPlateView(img){
    var b=aiPlateBox(img); if(!b) return null;
    var bw=b.x1-b.x0, bh=b.y1-b.y0;
    var x0=Math.max(0,b.x0-0.40*bw), x1=Math.min(1,b.x1+0.40*bw);
    var y0=Math.max(0,b.y0-0.95*bh), y1=Math.min(1,b.y1+0.30*bh);
    var sx=Math.round(x0*img.width), sy=Math.round(y0*img.height);
    var sw=Math.round((x1-x0)*img.width), sh=Math.round((y1-y0)*img.height);
    if(sw<10||sh<10) return null;
    var cv=document.createElement('canvas'); cv.width=224; cv.height=224;
    var cx=cv.getContext('2d'); cx.fillStyle='#000'; cx.fillRect(0,0,224,224);
    cx.drawImage(img,sx,sy,sw,sh,0,0,224,224);
    return cv;
  }
  /* v67 : 번호판 조각 시점은 쓰지 않는다 — 숫자만 빼면 어느 층이든 똑같이 생겨서
     다른 층 복도를 끌어왔다 (다른 조원 사진 1,468장 : 정확한 자리 41.1% → 46.0%).
     번호판은 글자 읽기(v66)가 맡는다. 내장 기준 쪽 번호판 조각은 loadVectors 에서 뺀다(patch_v67). */
  function aiViews(img){
    return [aiSqView(img,1.0), aiSqView(img,0.6)];
  }

  /* ── v58 : 평균 빼기 + 주성분 2개 제거 ───────────────────────────
     모든 실내 사진이 공유하는 성분(복도·문짝·조명)을 걷어낸다.
     이것만으로 "같은 곳"과 "다른 곳"의 분리도가 0.84 → 1.45 로 올랐다.
     평균·주성분은 EMBEDDED_AIVEC 안에 Float32 로 담겨 있다.            */
  var AIMEAN = null, AIPC = null, AIPC2 = null;
  function b64ToF32(b64){
    var bin=atob(b64), u=new Uint8Array(bin.length), i;
    for(i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
    return new Float32Array(u.buffer);
  }
  function postVec(v){
    var d=v.length, o=new Float32Array(d), j, s=0;
    for(j=0;j<d;j++) s+=v[j]*v[j];
    s=Math.sqrt(s)||1;
    for(j=0;j<d;j++) o[j]=v[j]/s;
    if(AIMEAN && AIMEAN.length===d) for(j=0;j<d;j++) o[j]-=AIMEAN[j];
    if(AIPC && AIPC.length===d){
      var p=0; for(j=0;j<d;j++) p+=o[j]*AIPC[j];
      for(j=0;j<d;j++) o[j]-=p*AIPC[j];
    }
    /* 주성분 2개째 — 세 번의 측정에서 1개보다 꾸준히 나았다 (Top-1 +0.7~1.1%p) */
    if(AIPC2 && AIPC2.length===d){
      var p2=0; for(j=0;j<d;j++) p2+=o[j]*AIPC2[j];
      for(j=0;j<d;j++) o[j]-=p2*AIPC2[j];
    }
    s=0; for(j=0;j<d;j++) s+=o[j]*o[j];
    s=Math.sqrt(s)||1;
    for(j=0;j<d;j++) o[j]/=s;
    return o;
  }

  function vecOf(dataUrl){
    return embedUrlViews(dataUrl, [1]).then(function(vs){ return vs[0]; });
  }

  /* ── 학습 : 이 사진이 이 위치라는 것을 AI에게 가르친다 ──
     앱에 사진을 넣거나 제보를 승인할 때 자동으로 불린다.
     결과는 브라우저에 저장되어 다음에 앱을 열어도 유지된다. */
  function learn(code, dataUrl, name){
    if(!code || !dataUrl) return Promise.resolve(false);
    if(dataPending()) return ensureData().then(function(){ return learn(code, dataUrl, name); }, function(){ return learn(code, dataUrl, name); });
    loadLearned();
    /* v52 : 배우는 사진도 두 시점(원본·가운데0.82)으로 기억한다 — 내장 기준벡터와 같은 방식 */
    return embedUrlViews(dataUrl, REF_VIEWS).then(function(vs){
      /* v70 : 한도를 넘으면 가장 오래된 학습분을 뺀다.
         예전 코드는 REF 앞에서 잘라냈는데 그 앞쪽은 내장 기준 벡터라,
         오래된 학습분 대신 내장 장소가 지워졌다. 이제는 목록에서만 빼고 아래에서 다시 조립한다. */
      var trimmed = false;
      if(LEARNED.length >= LEARN_MAX){ LEARNED.shift(); trimmed = true; }
      var rec = {code:code, q:i8ToB64(vs[0]), q2:(vs[1] ? i8ToB64(vs[1]) : ''),
                 q3:(vs[2] ? i8ToB64(vs[2]) : ''), n:name||'', ts:Date.now(), v:3};
      LEARNED.push(rec);
      REF.push(vs[0]); CODES.push(code);
      if(vs[1]){ REF.push(vs[1]); CODES.push(code); }
      if(vs[2]){ REF.push(vs[2]); CODES.push(code); }
      saveLearned();
      if(trimmed) rebuildRef();      /* v70 : 오래된 학습분을 뺐으면 기준 전체를 다시 조립 */
      if(typeof phAiLearnRender === 'function') phAiLearnRender();
      return true;
    })['catch'](function(){ return false; });
  }

  function learnStats(){
    loadLearned();
    var codes = {};
    for(var i=0;i<LEARNED.length;i++) codes[LEARNED[i].code] = (codes[LEARNED[i].code]||0)+1;
    return { n: LEARNED.length, codes: codes, builtin: (CODES ? CODES.length - LEARNED.length : 0) };
  }
  function forgetAll(){
    LEARNED = [];
    try{ localStorage.removeItem(LEARN_KEY); }catch(e){}
    REF = null; CODES = null; loadedLearn = false; loadVectors(); loadLearned();
    if(typeof phAiLearnRender === 'function') phAiLearnRender();
  }

  /* ══════════════════════════════════════════════════════════════
     v55 : AI 사진 파악 자료집
     관리자가 넣어 둔 '이 위치는 이렇게 생겼다' 사진 모음.
     사진 1장당 3시점(원본·가운데0.82·가운데0.65) 벡터를 저장한다 — 앱에 내장된 기준벡터와 같은 방식.
     저장은 IndexedDB : localStorage는 5MB 한계라 수백 장을 담을 수 없다.
     ══════════════════════════════════════════════════════════════ */
  var LIB_VIEWS = [1, 0.82, 0.65];
  var IDB_NAME = 'b3nav_ai', IDB_STORE = 'lib';
  var LIB = [], libLoaded = false, libLoading = null, idbP = null;

  function idbOpen(){
    if(idbP) return idbP;
    idbP = new Promise(function(res, rej){
      var idb = window.indexedDB;
      if(!idb){ rej('no-idb'); return; }
      var rq;
      try{ rq = idb.open(IDB_NAME, 1); }catch(e){ rej(e); return; }
      rq.onupgradeneeded = function(e){
        var db = e.target.result;
        if(!db.objectStoreNames.contains(IDB_STORE))
          db.createObjectStore(IDB_STORE, {keyPath:'id', autoIncrement:true});
      };
      rq.onsuccess = function(){ res(rq.result); };
      rq.onerror   = function(){ rej(rq.error || 'idb-open'); };
      rq.onblocked = function(){ rej('idb-blocked'); };
    })['catch'](function(e){ idbP = null; throw e; });
    return idbP;
  }
  function idbTx(mode){
    return idbOpen().then(function(db){ return db.transaction(IDB_STORE, mode).objectStore(IDB_STORE); });
  }
  function idbReq(fn){
    return idbTx('readwrite').then(function(st){
      return new Promise(function(res, rej){
        var rq = fn(st);
        rq.onsuccess = function(){ res(rq.result); };
        rq.onerror   = function(){ rej(rq.error || 'idb-req'); };
      });
    });
  }
  /* 전부 읽기 — getAll이 없는 브라우저도 있어 커서로 훑는다 */
  function idbAll(){
    return idbTx('readonly').then(function(st){
      return new Promise(function(res, rej){
        var out = [], rq = st.openCursor();
        rq.onsuccess = function(e){
          var c = e.target.result;
          if(c){ out.push(c.value); c['continue'](); } else res(out);
        };
        rq.onerror = function(){ rej(rq.error || 'idb-cursor'); };
      });
    });
  }

  /* 기준벡터 다시 조립 : 내장 + 학습분 + 자료집 */
  function rebuildRef(){
    REF = null; CODES = null; loadedLearn = false;
    if(!loadVectors()) return false;
    loadLearned();
    /* v58 : 전처리가 바뀌어 예전 방식으로 만든 벡터는 더 이상 맞지 않는다.
       V58_FROM 이후에 등록된 사진만 쓴다(그 사진들은 새 방식으로 만들어진다). */
    for(var i=0;i<LIB.length;i++){
      var r = LIB[i], vs = (r.ts && r.ts >= V58_FROM) ? (r.vecs || []) : [];
      for(var j=0;j<vs.length;j++){
        try{ REF.push(b64ToVec(vs[j])); CODES.push(r.code); }catch(e){}
      }
    }
    return true;
  }

  /* ── v56 : 파일에 담겨 배포되는 '기본 자료집' ─────────────────────
     <script id="EMBEDDED_AILIB"> 에 담긴 사진들은 모든 기기의 AI가 똑같이 쓴다.
     · 이 기기에서 넣은 사진(IndexedDB)과 합쳐서 LIB 를 만든다
     · 기본 자료집에서 뺀 사진은 이 기기의 '숨김 목록'(localStorage)에만 적힌다
     · 같은 사진이 양쪽에 있으면(내려받은 파일을 다시 연 경우) 기본 쪽만 남기고 기기 쪽은 지운다 */
  var EMB = null, HIDE_KEY = 'b3nav_ailib_hidden';
  function libKey(r){
    return String(r.code || '') + '|' + ((r.vecs && r.vecs[0]) ? String(r.vecs[0]).slice(0, 48) : String(r.n || ''));
  }
  function libHidden(){
    try{ var j = localStorage.getItem(HIDE_KEY); return j ? (JSON.parse(j) || []) : []; }catch(e){ return []; }
  }
  function libSetHidden(arr){ try{ localStorage.setItem(HIDE_KEY, JSON.stringify(arr)); }catch(e){} }
  function libEmbedded(){
    if(EMB) return EMB;
    EMB = [];
    try{
      var d = window.AILIB_DATA || null;   /* data/ailib.js 가 넣는다 */
      if(d){
        var items = (d && d.items) ? d.items : (Object.prototype.toString.call(d) === '[object Array]' ? d : []);
        for(var i=0;i<items.length;i++){
          var r = items[i];
          if(!r || !r.code || !r.vecs || !r.vecs.length) continue;
          EMB.push({ id:'e'+(i+1), emb:true, code:String(r.code).trim(), n:r.n||'', v:r.v||'',
                     ts:r.ts||0, thumb:r.thumb||'', vecs:r.vecs });
        }
      }
    }catch(e){ EMB = []; }
    return EMB;
  }
  function libHide(r){
    var h = libHidden(), k = libKey(r);
    if(h.indexOf(k) < 0){ h.push(k); libSetHidden(h); }
  }
  /* 자료집을 한 번만 읽어 메모리에 올린다. IndexedDB를 못 쓰면 기본 자료집만으로 동작한다. */
  function libEnsure(){
    if(dataPending()) return ensureData().then(libEnsure, libEnsure);
    if(libLoaded) return Promise.resolve(LIB);
    if(libLoading) return libLoading;
    function merge(rows){
      rows.sort(function(a,b){ return (a.ts||0) - (b.ts||0); });
      var hid = {}; libHidden().forEach(function(k){ hid[k] = 1; });
      var seen = {}, out = [], dup = [];
      libEmbedded().forEach(function(r){
        var k = libKey(r);
        if(hid[k] || seen[k]) return;
        seen[k] = 1; out.push(r);
      });
      rows.forEach(function(r){
        var k = libKey(r);
        if(seen[k]){ dup.push(r.id); return; }
        seen[k] = 1; out.push(r);
      });
      LIB = out; libLoaded = true; libLoading = null;
      rebuildRef();
      /* 기본 자료집과 겹치는 기기 쪽 사진은 조용히 정리한다 (내려받은 파일을 같은 컴퓨터에서 다시 연 경우) */
      if(dup.length){
        (function next(i){
          if(i >= dup.length) return;
          idbReq(function(st){ return st['delete'](dup[i]); }).then(function(){ next(i+1); })['catch'](function(){});
        })(0);
      }
      return LIB;
    }
    libLoading = idbAll().then(merge)['catch'](function(){ return merge([]); });
    return libLoading;
  }
  /* 기본 자료집에서 숨긴 사진을 모두 되돌린다 */
  function libUnhideAll(){
    libSetHidden([]);
    libLoaded = false; libLoading = null;
    return libEnsure();
  }
  /* 지금 자료집(기본 + 이 기기, 숨긴 것 제외)을 파일에 담을 JSON 으로 */
  function libExport(){
    var items = LIB.map(function(r){
      return { code:r.code, n:r.n||'', v:r.v||'', ts:r.ts||0, thumb:r.thumb||'', vecs:r.vecs||[] };
    });
    return JSON.stringify({ ver:1, n:items.length, made:new Date().toISOString().slice(0,10), items:items });
  }

  /* 작은 미리보기 만들기 (자료집 목록에 보여줄 용도) */
  function libThumb(img){
    var M = 132, w = img.width || M, h = img.height || M;
    var k = Math.min(1, M/Math.max(w,h));
    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w*k)); cv.height = Math.max(1, Math.round(h*k));
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    try{ return cv.toDataURL('image/jpeg', 0.6); }catch(e){ return ''; }
  }

  /* 사진 한 장을 자료집에 넣는다 */
  function libAdd(code, dataUrl, name, view){
    if(!code || !dataUrl) return Promise.reject('arg');
    return libEnsure().then(function(){
      return new Promise(function(res, rej){
        var im = new Image();
        im.onload = function(){ res(im); };
        im.onerror = function(){ rej('image'); };
        im.src = dataUrl;
      });
    }).then(function(im){
      return embedViews(im, LIB_VIEWS).then(function(vs){
        var rec = { code: String(code).trim(), n: name || '', v: view || '', ts: Date.now(),
                    thumb: libThumb(im), vecs: vs.map(function(v){ return i8ToB64(v); }) };
        return idbReq(function(st){ return st.add(rec); }).then(function(id){
          rec.id = id; LIB.push(rec); rebuildRef();
          return rec;
        });
      });
    });
  }
  /* 빼기 : 기본 자료집 사진은 이 기기에서 숨기고, 기기에서 넣은 사진은 저장소에서 지운다 */
  function libDrop(rows){
    var i = 0;
    function next(){
      if(i >= rows.length) return Promise.resolve(true);
      var r = rows[i++];
      if(r.emb){ libHide(r); return next(); }
      return idbReq(function(st){ return st['delete'](r.id); }).then(next);
    }
    return next();
  }
  function libDel(id){
    return libEnsure().then(function(){
      return libDrop(LIB.filter(function(r){ return String(r.id) === String(id); }));
    }).then(function(){
      LIB = LIB.filter(function(r){ return String(r.id) !== String(id); });
      rebuildRef(); return true;
    });
  }
  function libDelCode(code){
    return libEnsure().then(function(){
      return libDrop(LIB.filter(function(r){ return r.code === code; }));
    }).then(function(){
      LIB = LIB.filter(function(r){ return r.code !== code; });
      rebuildRef(); return true;
    });
  }
  function libClear(){
    return libEnsure().then(function(){
      LIB.forEach(function(r){ if(r.emb) libHide(r); });
      return idbReq(function(st){ return st.clear(); })['catch'](function(){ return true; });
    }).then(function(){ LIB = []; rebuildRef(); return true; });
  }
  function libAll(){ return LIB.slice(); }
  function libStats(){
    var by = {}, bytes = 0, nEmb = 0;
    for(var i=0;i<LIB.length;i++){
      var r = LIB[i];
      by[r.code] = (by[r.code]||0) + 1;
      if(r.emb) nEmb++;
      bytes += (r.thumb ? r.thumb.length : 0) + (r.vecs ? r.vecs.join('').length : 0);
    }
    return { n: LIB.length, codes: by, nCodes: Object.keys(by).length, bytes: bytes, ready: libLoaded,
             nEmb: nEmb, nMine: LIB.length - nEmb, nHidden: libHidden().length, nFile: libEmbedded().length };
  }
  function libUsable(){ return !!window.indexedDB; }

  /* ── 분류 : 등록용 (판정 문구 없이 순위만) ── */
  function classify(dataUrl){
    if(dataPending()) return ensureData().then(function(){ return classify(dataUrl); }, function(){ return classify(dataUrl); });
    loadLearned();
    /* v52 : 판정과 같은 2시점 비교. 묶기(cluster)에 쓰는 vec은 원본 시점 것을 준다.
       v55 : 자료집까지 후보에 넣는다. */
    return libEnsure().then(function(){ return embedUrlViews(dataUrl, Q_VIEWS); }).then(function(vs){
      var rk = rank(vs);
      return { vec:vs[0], top:rk.slice(0,3), sim:rk[0].sim, code:rk[0].code,
               margin: rk[0].sim - (rk[1] ? rk[1].sim : 0) };
    });
  }

  /* ── 새 장소 묶기 ──────────────────────────────────────────────
     기존 위치와 안 닮은(=처음 보는) 사진들끼리 서로 비교해서,
     서로 닮은 것들을 한 묶음으로 만든다. 옥상 사진 5장을 넣으면
     "이 5장은 같은 곳"까지는 AI가 알아낸다. 그 장소의 '이름'만
     사람이 한 번 정해주면 그때부터 AI가 그 이름으로 인식한다. */
  /* v52 : 제곱근 정규화 후 유사도 분포가 달라졌다. 실측(같은 곳끼리 / 다른 곳끼리)에서
     0.86이면 다른 곳을 잘못 묶는 비율이 2.3%로 낮다. 낮게 잡으면 서로 다른 장소가 한 묶음이 된다. */
  var GROUP_TH = 0.86;
  function cluster(vecs){
    var n = vecs.length, parent = [], i, j;
    for(i=0;i<n;i++) parent.push(i);
    function find(x){ while(parent[x]!==x){ parent[x]=parent[parent[x]]; x=parent[x]; } return x; }
    function join(a,b){ a=find(a); b=find(b); if(a!==b) parent[b]=a; }
    for(i=0;i<n;i++) for(j=i+1;j<n;j++){
      var d = 0, a = vecs[i], b = vecs[j];
      for(var k=0;k<a.length;k++) d += a[k]*b[k];
      if(d >= GROUP_TH) join(i,j);
    }
    var map = {}, out = [];
    for(i=0;i<n;i++){
      var r = find(i);
      if(!(r in map)){ map[r] = out.length; out.push([]); }
      out[map[r]].push(i);
    }
    return out;
  }

  /* ── 메모에서 위치 읽기 ────────────────────────────────────────
     "옥상", "3층 왼쪽 복도", "13210호", "정문" 처럼 사람이 쓴 말에서
     위치 코드를 찾아낸다. 사진 판정과 메모가 같은 곳을 가리키면
     확신도를 올리고, 다르면 관리자에게 둘 다 보여준다. */
  function noteCode(note){
    if(!note) return null;
    var t = String(note).replace(/\s+/g, ' ').trim();
    var m;
    m = t.match(/\b(13[1-5]\d{2})\b/);                       if(m) return m[1];
    m = t.match(/([1-5])\s*층\s*(왼쪽|좌측|왼)\s*복도/);       if(m) return 'HALL'+m[1]+'L';
    m = t.match(/([1-5])\s*층\s*(오른쪽|우측|오른)\s*복도/);    if(m) return 'HALL'+m[1]+'R';
    m = t.match(/([1-5])\s*층\s*(엘리베이터|엘베|EV)/i);        if(m) return 'EV'+m[1];
    if(/지하|B1/i.test(t)) return 'B1';
    if(/정문|후문|동문|서문|출입문|건물\s*외부|외관/.test(t)) return 'BLD';
    if(/KTC/i.test(t)) return 'KTC';
    /* 학습된 위치 이름과 직접 대조 (옥상처럼 새로 등록한 곳) */
    loadLearned();
    if(CODES){
      var up = t.toUpperCase();
      for(var i=0;i<CODES.length;i++){
        var c = String(CODES[i]).toUpperCase();
        if(c.length >= 2 && up.indexOf(c) !== -1) return CODES[i];
      }
    }
    return null;
  }

  /* 메모에서 '층'만 읽는다 — '2층 복도'처럼 좌우를 안 쓴 메모가 실제로 가장 많다 */
  function noteFloor(note){
    if(!note) return null;
    var t = String(note);
    if(/지하|B1/i.test(t)) return '지하 1층';
    var m = t.match(/([1-5])\s*층/);
    return m ? (m[1]+'층') : null;
  }

  /* 힌트를 판정에 반영
     ① 메모가 위치를 콕 집었고 그 위치가 후보 어딘가에 있으면 1순위로 올린다 (v52 : 상위 8개까지 본다)
     ② 층만 알 수 있으면 그 층의 후보를 위로 끌어올린다 (v52 신규) */
  function applyHint(res, note, rk){
    var hint = noteCode(note);
    var fl = noteFloor(note);
    if(fl) res.noteFloor = fl;
    if(res.floorSource === 'ocr' && fl && res.ocr && res.ocr.floor !== fl) res.floorConflict = true;   // 번호판과 메모가 다름
    if(res.floorSource === 'ocr' && !hint) return res;   // 번호판이 층을 확정했으면 메모의 층은 참고만
    /* v53 : 상위 8개가 아니라 전체 순위에서 찾는다 — 그 층 후보는 항상 있다 */
    var pool = (rk && rk.length) ? rk.map(function(x){ return {code:x.code, sim:Math.round(x.sim*1000)/1000}; }) : (res.all || res.top);
    if(hint){
      res.noteCode = hint;
      if(!pool) return res;
      var idx = -1, i;
      for(i=0;i<pool.length;i++) if(pool[i].code === hint) idx = i;
      if(idx === 0){
        res.noteAgree = true;                       // 사진과 메모가 일치 → 확신
        if(res.verdict === 'uncertain' && res.sim >= TH.RELEVANT) res.verdict = 'match';
        return res;
      }
      if(idx > 0){
        res.noteAgree = true;                       // 후보 안에 있음 → 그걸로 승격
        var pick = pool.splice(idx,1)[0];
        pool.unshift(pick);
        res.all = pool.slice(0,8);
        res.top = pool.slice(0,3);
        res.code = pick.code; res.sim = pick.sim;
        res.margin = Math.round((pick.sim - (pool[1]?pool[1].sim:0))*1000)/1000;
        if(res.verdict === 'uncertain') res.verdict = 'match';
        return res;
      }
      res.noteAgree = false;                        // 사진과 메모가 다름 → 관리자 판단
      return res;
    }
    /* 위치를 콕 집지는 못했지만 층은 알 수 있는 경우 */
    if(fl && pool && pool.length){
      var same = [], other = [], j;
      for(j=0;j<pool.length;j++) (floorOf(pool[j].code) === fl ? same : other).push(pool[j]);
      if(same.length && other.length && floorOf(pool[0].code) !== fl){
        res.floorHintUsed = true;
        var merged = same.concat(other);
        res.all = merged.slice(0,8);
        res.top = merged.slice(0,3);
        res.code = merged[0].code; res.sim = merged[0].sim;
        res.margin = Math.round((merged[0].sim - (merged[1]?merged[1].sim:0))*1000)/1000;
        if(res.verdict === 'uncertain' && res.sim >= TH.MATCH) res.verdict = 'match';
      }
    }
    return res;
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

  return { ensureData:ensureData, get dataReady(){ return DATA_READY; }, get dataFailed(){ return DATA_FAILED; },
           judge:judge, warmup:warmup, showCard:showCard, rejectMsg:rejectMsg,
           adminBadge:adminBadge, autoCode:autoCode, pick:pick, tune:tune,
           codeLabel:codeLabel, whereText:whereText, floorGuess:floorGuess, TH:TH, SCOPE:SCOPE,
           learn:learn, learnStats:learnStats, forgetAll:forgetAll,
           syncServer:syncServer, syncServerOne:syncServerOne, srvDrop:srvDrop, srvStats:srvStats,
           classify:classify, cluster:cluster, noteCode:noteCode, noteFloor:noteFloor, vecOf:vecOf,
           embedUrlViews:embedUrlViews, powNorm:powNorm, Q_VIEWS:Q_VIEWS, REF_VIEWS:REF_VIEWS,
           libEnsure:libEnsure, libAdd:libAdd, libDel:libDel, libDelCode:libDelCode, libClear:libClear,
           libAll:libAll, libStats:libStats, libUsable:libUsable, rebuildRef:rebuildRef,
           libExport:libExport, libUnhideAll:libUnhideAll, libKey:libKey,
           ocrEnsure:ocrEnsure, ocrRun:ocrRun, ocrParse:ocrParse, applyOcr:applyOcr, OCR:OCR,
           plateBoxes:plateBoxes, plateCrop:plateCrop, ocrPrep:ocrPrep, ocrWords:ocrWords,
           plateDebug:function(img){ var bs = plateBoxes(img), o = [], i, c;
             for(i=0;i<bs.length;i++){ c = plateCrop(img, bs[i]); if(!c) continue;
               o.push(ocrPrep(c,false).toDataURL('image/png')); o.push(ocrPrep(c,true).toDataURL('image/png')); }
             return o; },
           get ocrSrc(){ return ocrSrc; }, get ocrReady(){ return !!ocrWorker; },
           ensure:ensure,
           get ready(){ return !!net; } };
})();
