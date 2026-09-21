# -*- coding: utf-8 -*-
"""v54 → v55 : 「AI 사진 파악 자료집」
  관리자가 학교 곳곳의 사진을 위치별로 모아 두면, AI가 그 사진들까지 기준으로 삼아 위치를 판별한다.
  · 이 사진들은 AI 학습 자료로만 쓰이고, 길안내 화면에 보이는 사진은 바뀌지 않는다 (사진 등록과 구분).
  · 사진 1장당 3시점(원본·가운데0.82·가운데0.65) 벡터를 뽑아 저장 — 앱 내장 기준벡터와 같은 방식.
  · 저장은 IndexedDB (localStorage는 5MB 한계라 수백 장을 못 담는다).
  · 자료집 벡터는 판별할 때 내장 기준벡터·학습분과 함께 후보로 쓰인다.
"""
import io, sys
SRC='/home/claude/gunsan_b3nav_ZOOM_v54.html'; DST='/home/claude/gunsan_b3nav_AIDATA_v55.html'
s=io.open(SRC,encoding='utf-8').read(); orig=len(s); done=[]
def patch(name, old, new, count=1):
    global s
    n=s.count(old)
    if n!=count: print('  [실패] %s : 앵커 %d개'%(name,n)); sys.exit(1)
    s=s.replace(old,new,count); done.append(name); print('  [OK] %s'%name)

# ═══ 1. 화면 목록에 등록 ═══
patch('SCREENS',
"""var SCREENS=['s1','s2','scat','s3','s4','s5','s6','s7','sph','sset','sguide','sfav','ssug','sadmin','sphmgr','spwgate','phsort','sqr','sqrok'];""",
"""var SCREENS=['s1','s2','scat','s3','s4','s5','s6','s7','sph','sset','sguide','sfav','ssug','sadmin','sphmgr','spwgate','phsort','sqr','sqrok','saidat'];""")

patch('go() 훅',
"""  if(id==='phsort' && typeof phSortRender==='function') phSortRender();""",
"""  if(id==='phsort' && typeof phSortRender==='function') phSortRender();
  if(id==='saidat' && typeof aidEnter==='function') aidEnter();     /* v55 : AI 사진 파악 자료집 */""")

# ═══ 2. CSS ═══
patch('CSS',
"""  #sph .aiLearn{margin-top:10px;font-size:11.5px;color:#5D6B80;text-align:center;line-height:1.6;}""",
"""  #sph .aiLearn{margin-top:10px;font-size:11.5px;color:#5D6B80;text-align:center;line-height:1.6;}

  /* ── v55 : AI 사진 파악 자료집 ───────────────────────────── */
  /* 화면 전체가 아래로 스크롤되게 (전체 사진 관리와 같은 느낌) */
  #saidat{overflow-y:auto;-webkit-overflow-scrolling:touch;display:block;}
  #saidat .aidWhat{background:#0D1420;border:1px solid #1D2B3E;border-radius:12px;padding:12px 13px;
    font-size:12px;line-height:1.6;color:#8FA6C0;margin-bottom:10px;}
  #saidat .aidWhat b{color:#39FF88;font-weight:600;}
  #saidat .aidWhat .warn{color:#FFC93C;}
  #saidat .aidStat{background:#0D0F18;border:1px solid #1A1D2B;border-radius:12px;padding:11px 13px;
    font-size:12.5px;color:#94B8E0;line-height:1.6;}
  #saidat .aidStat b{color:#E7F6FF;}
  #saidat .aidStat .sub{display:block;color:#5D6B80;font-size:11.5px;margin-top:3px;}
  #saidat .aidBox{margin-top:10px;background:#0B0E14;border:1px solid #1A1D2B;border-radius:12px;padding:12px;}
  #saidat .aidLab{font-size:12px;color:#7C8AA0;margin-bottom:6px;}
  #saidat input[type=text]{width:100%;background:#111722;border:1px solid #2A3644;border-radius:9px;
    color:#E7F6FF;font-size:15px;padding:10px 11px;}
  #saidat .aidHit{margin-top:6px;font-size:12px;color:#39FF88;min-height:17px;}
  #saidat .aidHit.bad{color:#FF6B6B;}
  #saidat .aidDrop{margin-top:10px;border:2px dashed #2A3345;border-radius:14px;padding:20px 14px;
    text-align:center;color:#7C8AA0;font-size:12.5px;line-height:1.7;background:#0D0F18;cursor:pointer;}
  #saidat .aidDrop.over{border-color:#00E5FF;background:rgba(0,229,255,.08);}
  #saidat .aidDrop b{color:#39FF88;font-weight:600;}
  #saidat .aidDrop .ic{font-size:22px;display:block;margin-bottom:6px;}
  #saidat .aidFloor{color:#94B8E0;font-size:12px;font-weight:700;margin:16px 0 7px;padding-bottom:5px;
    border-bottom:1px solid #1E2735;display:flex;align-items:center;gap:7px;}
  #saidat .aidFloor:first-child{margin-top:0;}
  #saidat .aidFloor .n{color:#39FF88;font-weight:600;}
  #saidat .aidFloor .none{color:#4A5566;font-weight:400;}
  #saidat .aidStage{margin-top:10px;background:#0B1017;border:1px solid #1E2735;border-radius:12px;padding:10px;}
  #saidat .aidStage .sHd{display:flex;align-items:center;gap:8px;font-size:12px;color:#94B8E0;margin-bottom:8px;flex-wrap:wrap;}
  #saidat .aidStage .sHd .auto{color:#39FF88;}
  #saidat .aidStage .sHd .miss{color:#FFC93C;}
  #saidat .aidStage .sRows{max-height:300px;overflow-y:auto;-webkit-overflow-scrolling:touch;
    display:flex;flex-direction:column;gap:5px;}
  #saidat .aidStage .sRow{display:flex;align-items:center;gap:7px;background:#131A24;border:1px solid #232D3A;
    border-radius:9px;padding:6px;}
  #saidat .aidStage .sRow.none{border-color:#4A3A18;background:#171208;}
  #saidat .aidStage .sRow img{width:38px;height:38px;object-fit:cover;border-radius:6px;flex:0 0 auto;background:#05060A;}
  #saidat .aidStage .sName{flex:1 1 auto;min-width:0;font-size:11px;color:#7C8AA0;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  #saidat .aidStage .sName b{display:block;color:#E7F6FF;font-size:11.5px;font-weight:600;}
  #saidat .aidStage input.sCode{flex:0 0 96px;width:96px;background:#0D131C;border:1px solid #2A3644;
    border-radius:7px;color:#E7F6FF;font-size:13px;padding:6px 7px;text-align:center;}
  #saidat .aidStage .sRow .x{background:none;border:none;color:#6A7686;font-size:14px;padding:2px 4px;flex:0 0 auto;}
  #saidat .aidProg{margin-top:9px;font-size:12px;color:#7C8AA0;min-height:16px;}
  #saidat .aidProg .bar2{margin-top:5px;height:5px;background:#161C26;border-radius:3px;overflow:hidden;}
  #saidat .aidProg .bar2 i{display:block;height:100%;width:0;background:#39FF88;transition:width .2s;}
  #saidat .aidList{margin-top:12px;display:flex;flex-direction:column;gap:8px;padding-bottom:8px;}
  #saidat .aidCard{background:#0D0F18;border:1px solid #1A1D2B;border-radius:12px;padding:10px;}
  #saidat .aidCard .hd{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
  #saidat .aidCard .nm{flex:1;min-width:0;color:#E7F6FF;font-size:13px;font-weight:600;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  #saidat .aidCard .cnt{color:#39FF88;font-size:12px;flex:0 0 auto;}
  #saidat .aidCard .del{background:#1A1116;color:#FF8A8A;border:1px solid #3A2028;border-radius:8px;
    padding:5px 9px;font-size:11.5px;flex:0 0 auto;}
  #saidat .aidThumbs{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px;}
  #saidat .aidThumbs .t{position:relative;flex:0 0 auto;width:66px;height:66px;}
  #saidat .aidThumbs img{width:66px;height:66px;object-fit:cover;border-radius:8px;background:#05060A;
    cursor:zoom-in;display:block;}
  #saidat .aidThumbs .vw{position:absolute;left:0;right:0;bottom:0;background:rgba(5,8,14,.82);
    color:#94B8E0;font-size:9.5px;line-height:14px;height:14px;text-align:center;
    border-radius:0 0 8px 8px;white-space:nowrap;overflow:hidden;pointer-events:none;}
  #saidat .aidCard .views{margin-top:7px;font-size:11px;color:#5D6B80;line-height:1.5;}
  #saidat .aidCard .views b{color:#39FF88;font-weight:600;}
  #saidat .aidThumbs .x{position:absolute;top:-4px;right:-4px;width:20px;height:20px;border-radius:50%;
    background:#2A1218;border:1px solid #4A2430;color:#FF8A8A;font-size:11px;line-height:18px;text-align:center;padding:0;}
  #saidat .aidEmpty{color:#5A6472;font-size:13px;text-align:center;padding:30px 10px;line-height:1.7;}
  #saidat .mini{margin-top:8px;font-size:11.5px;color:#5D6B80;line-height:1.6;}""")

# ═══ 3. 관리자 홈(#sph)에 버튼 ═══
patch('관리자 홈 버튼',
"""    <div class="row">
      <button class="big ghost" onclick="go('sphmgr')">전체 사진 관리 →</button>
    </div>""",
"""    <div class="row">
      <button class="big ghost" onclick="go('sphmgr')">전체 사진 관리 →</button>
    </div>
    <div class="row">
      <button class="big ghost" onclick="go('saidat')" data-ko="🤖 AI 사진 파악 자료집 →" data-en="🤖 AI reference photo library →">🤖 AI 사진 파악 자료집 →</button>
    </div>""")

# ═══ 4. 화면 만들기 ═══
patch('화면 HTML',
"""  <section class="screen" id="sph">""",
"""  <!-- v55 : AI 사진 파악 자료집 — AI가 위치를 알아보기 위해 참고하는 사진 모음 -->
  <section class="screen" id="saidat">
    <div class="bar"><button class="back" onclick="go('sph')">←</button><h3>AI 사진 파악 자료집</h3></div>
    <div class="aidWhat">
      학교 곳곳의 사진을 <b>위치별로 모아 두면</b> AI가 그 사진들과 대조해서 위치를 알아냅니다.
      같은 곳을 <b>각도·거리를 바꿔 2~3장씩</b> 넣을수록 정확해집니다.
      파일 이름에 위치가 들어 있으면 <b>여러 층을 한꺼번에</b> 넣어도 알아서 나눠 담습니다.<br>
      여기 넣은 사진은 <b>AI가 보는 자료로만</b> 쓰이고, 길안내 화면에 나오는 사진은 바뀌지 않습니다.
      <span class="warn">위치를 잘못 지정하면 오히려 더 틀리니 확인하고 넣어주세요.</span>
    </div>
    <div class="aidStat" id="aidStat"></div>

    <div class="aidBox">
      <div class="aidLab">1. 사진 넣기 — <b style="color:#39FF88;">파일 이름으로 위치를 알아서 나눠 담습니다</b></div>
      <input type="file" id="aidFile" multiple accept="image/*,.zip" style="display:none">
      <div class="aidDrop" id="aidDrop" onclick="aidPick()">
        <span class="ic">🖼️</span>
        <b>사진을 여기에 끌어다 놓으세요</b> (컴퓨터) · 눌러서 <b>고르기</b> (휴대폰)<br>
        <span style="color:#5D6B80;">파일 이름에 <b style="color:#94B8E0;">13501</b> · <b style="color:#94B8E0;">5층 좌측 복도</b> ·
        <b style="color:#94B8E0;">EV3</b> · <b style="color:#94B8E0;">정문</b> 같은 위치가 들어 있으면 알아서 그 자리로 갑니다.
        여러 층을 한꺼번에 넣어도 되고, ZIP도 그대로 됩니다.<br>
        이름 끝에 <b style="color:#94B8E0;">(왼쪽)</b> <b style="color:#94B8E0;">(오른쪽)</b> 처럼 적으면
        <b style="color:#94B8E0;">같은 곳을 어느 각도로 찍었는지</b>까지 기억합니다 —
        각도를 다양하게 모을수록 AI가 잘 맞힙니다.</span>
      </div>
      <div class="aidLab" style="margin-top:12px;">2. 이름으로 못 알아낸 사진에 쓸 위치 (선택)</div>
      <input type="text" id="aidCode" list="aidCodeList" autocomplete="off" autocapitalize="characters"
             placeholder="비워 두어도 됩니다 — 넣기 전에 하나씩 고칠 수 있어요" oninput="aidCodeCheck()">
      <datalist id="aidCodeList"></datalist>
      <div class="aidHit" id="aidHit"></div>
      <div class="aidProg" id="aidProg"></div>
      <div class="aidStage" id="aidStage" style="display:none;">
        <div class="sHd" id="aidStageHd"></div>
        <div class="sRows" id="aidStageRows"></div>
        <div class="row" style="margin-top:10px;">
          <button class="big" onclick="aidCommit()" id="aidCommitBtn">이대로 자료집에 넣기</button>
          <button class="big ghost" onclick="aidStageClear()">취소</button>
        </div>
      </div>
    </div>

    <div class="aidList" id="aidList"></div>
    <div class="row">
      <button class="big ghost" onclick="aidClearAll()">자료집 전체 비우기</button>
    </div>
    <div class="mini">※ 자료집은 이 기기(브라우저)에 저장됩니다. 앱을 새로 열어도 남아 있습니다.
      다른 기기의 AI에도 반영하려면 사진을 그 기기에서도 넣어 주세요.</div>
  </section>

  <section class="screen" id="sph">""")

# ═══ 5. SUGAI 안에 자료집 저장소 ═══
patch('SUGAI 자료집',
"""  /* ── 분류 : 등록용 (판정 문구 없이 순위만) ── */""",
"""  /* ══════════════════════════════════════════════════════════════
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
    for(var i=0;i<LIB.length;i++){
      var r = LIB[i], vs = r.vecs || [];
      for(var j=0;j<vs.length;j++){
        try{ REF.push(b64ToVec(vs[j])); CODES.push(r.code); }catch(e){}
      }
    }
    return true;
  }

  /* 자료집을 한 번만 읽어 메모리에 올린다. IndexedDB를 못 쓰면 조용히 빈 자료집으로 둔다. */
  function libEnsure(){
    if(libLoaded) return Promise.resolve(LIB);
    if(libLoading) return libLoading;
    libLoading = idbAll().then(function(rows){
      rows.sort(function(a,b){ return (a.ts||0) - (b.ts||0); });
      LIB = rows; libLoaded = true; libLoading = null;
      rebuildRef();
      return LIB;
    })['catch'](function(){
      LIB = []; libLoaded = true; libLoading = null;   // 저장소를 못 써도 판별은 그대로 동작
      return LIB;
    });
    return libLoading;
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
  function libDel(id){
    return libEnsure().then(function(){
      return idbReq(function(st){ return st['delete'](id); });
    }).then(function(){
      LIB = LIB.filter(function(r){ return r.id !== id; });
      rebuildRef(); return true;
    });
  }
  function libDelCode(code){
    return libEnsure().then(function(){
      var ids = LIB.filter(function(r){ return r.code === code; }).map(function(r){ return r.id; });
      var i = 0;
      function next(){
        if(i >= ids.length) return Promise.resolve(true);
        return idbReq(function(st){ return st['delete'](ids[i++]); }).then(next);
      }
      return next();
    }).then(function(){
      LIB = LIB.filter(function(r){ return r.code !== code; });
      rebuildRef(); return true;
    });
  }
  function libClear(){
    return libEnsure().then(function(){
      return idbReq(function(st){ return st.clear(); });
    }).then(function(){ LIB = []; rebuildRef(); return true; });
  }
  function libAll(){ return LIB.slice(); }
  function libStats(){
    var by = {}, bytes = 0;
    for(var i=0;i<LIB.length;i++){
      var r = LIB[i];
      by[r.code] = (by[r.code]||0) + 1;
      bytes += (r.thumb ? r.thumb.length : 0) + (r.vecs ? r.vecs.join('').length : 0);
    }
    return { n: LIB.length, codes: by, nCodes: Object.keys(by).length, bytes: bytes, ready: libLoaded };
  }
  function libUsable(){ return !!window.indexedDB; }

  /* ── 분류 : 등록용 (판정 문구 없이 순위만) ── */""")

# ═══ 6. 판정·분류가 자료집을 쓰도록 ═══
patch('judge에서 자료집 반영',
"""      /* v53 : 번호판 읽기는 별도 워커에서 돌므로 CNN과 동시에 시작한다 */
      var ocrP = ocrRun(dataUrl);
      ensure().then(function(){""",
"""      /* v53 : 번호판 읽기는 별도 워커에서 돌므로 CNN과 동시에 시작한다 */
      var ocrP = ocrRun(dataUrl);
      /* v55 : 관리자가 넣어 둔 자료집도 후보에 포함시킨다 */
      ensure().then(function(){ return libEnsure(); }).then(function(){""")
patch('classify에서 자료집 반영',
"""  function classify(dataUrl){
    loadLearned();
    /* v52 : 판정과 같은 2시점 비교. 묶기(cluster)에 쓰는 vec은 원본 시점 것을 준다. */
    return embedUrlViews(dataUrl, Q_VIEWS).then(function(vs){""",
"""  function classify(dataUrl){
    loadLearned();
    /* v52 : 판정과 같은 2시점 비교. 묶기(cluster)에 쓰는 vec은 원본 시점 것을 준다.
       v55 : 자료집까지 후보에 넣는다. */
    return libEnsure().then(function(){ return embedUrlViews(dataUrl, Q_VIEWS); }).then(function(vs){""")

patch('노출',
"""           ocrEnsure:ocrEnsure, ocrRun:ocrRun, ocrParse:ocrParse, applyOcr:applyOcr, OCR:OCR,""",
"""           libEnsure:libEnsure, libAdd:libAdd, libDel:libDel, libDelCode:libDelCode, libClear:libClear,
           libAll:libAll, libStats:libStats, libUsable:libUsable, rebuildRef:rebuildRef,
           ocrEnsure:ocrEnsure, ocrRun:ocrRun, ocrParse:ocrParse, applyOcr:applyOcr, OCR:OCR,""")

# ═══ 7. 화면 동작 ═══
patch('화면 JS',
"""<!-- ══ v54 : 사진 크게 보기 ═══════════════════════════════════ -->""",
"""<script>
/* ══════════════════════════════════════════════════════════════
   AI 사진 파악 자료집 (v55) — 화면 동작
   ══════════════════════════════════════════════════════════════ */
var AID_BUSY = false, AID_STOP = false;

function aidLabel(code){
  if(!code) return '';
  if(typeof SUGAI !== 'undefined' && SUGAI.codeLabel) return SUGAI.codeLabel(code);
  return code;
}
/* 앱이 아는 위치 코드 전부 모으기 */
function aidKnownCodes(){
  var set = {}, k, i;
  if(typeof VALID_FULL5 === 'object') for(k in VALID_FULL5) set[k] = 1;
  ['B1','BLD','KTC'].forEach(function(c){ set[c] = 1; });
  for(i=1;i<=5;i++){ set['EV'+i]=1; set['HALL'+i+'L']=1; set['HALL'+i+'R']=1; set['WC'+i]=1; set['ES'+i]=1; }
  if(typeof ROOM_PHOTOS === 'object') for(k in ROOM_PHOTOS) set[String(k).toUpperCase()] = 1;
  if(typeof SUGAI !== 'undefined' && SUGAI.libAll)
    SUGAI.libAll().forEach(function(r){ set[String(r.code).toUpperCase()] = 1; });
  return Object.keys(set).sort();
}
function aidFillList(){
  var dl = document.getElementById('aidCodeList');
  if(!dl) return;
  var codes = aidKnownCodes();
  dl.innerHTML = codes.map(function(c){
    var lb = aidLabel(c);
    return '<option value="'+c+'">' + (lb && lb !== c ? c+' — '+lb : c) + '</option>';
  }).join('');
}
function aidCodeCheck(){
  var el = document.getElementById('aidCode'), hit = document.getElementById('aidHit');
  if(!el || !hit) return '';
  var v = el.value.trim().toUpperCase();
  if(!v){ hit.className = 'aidHit'; hit.textContent = ''; return ''; }
  var lb = aidLabel(v);
  var known = aidKnownCodes().indexOf(v) >= 0;
  hit.className = 'aidHit';
  hit.textContent = known ? ('✓ ' + (lb && lb !== v ? lb : v) + ' 으로 넣습니다')
                          : ('※ 앱에 없던 새 위치 「' + v + '」로 넣습니다');
  return v;
}
/* 위치 코드 → 층 (목록을 층별로 묶는 데 쓴다) */
var AID_FLOORS = ['지하 1층','1층','2층','3층','4층','5층','건물 외부','기타'];
function aidFloorOf(code){
  var c = String(code || '').toUpperCase();
  if(c === 'B1') return '지하 1층';
  if(c === 'BLD') return '건물 외부';
  if(c === 'KTC') return '4층';
  var m = c.match(/^(?:EV|HALL|WC|ES)([1-5])/);  if(m) return m[1] + '층';
  m = c.match(/^13([1-5])\\d{2}/);                if(m) return m[1] + '층';
  return '기타';
}
function aidStatRender(){
  var el = document.getElementById('aidStat');
  if(!el || typeof SUGAI === 'undefined') return;
  if(!SUGAI.libUsable()){
    el.innerHTML = '<b style="color:#FF8A8A;">이 브라우저에서는 자료집을 저장할 수 없습니다.</b>' +
                   '<span class="sub">사생활 보호 모드(시크릿)에서는 저장이 막힐 수 있어요. 일반 창에서 열어 주세요.</span>';
    return;
  }
  var st = SUGAI.libStats();
  var total = aidKnownCodes().length;
  var mb = st.bytes / 1048576;
  /* 층별로 몇 장 들어있는지 한눈에 — 비어 있는 층도 회색으로 보여 준다 */
  var byFloor = {};
  SUGAI.libAll().forEach(function(r){ var f = aidFloorOf(r.code); byFloor[f] = (byFloor[f]||0) + 1; });
  var line = AID_FLOORS.filter(function(f){ return f !== '기타' || byFloor[f]; }).map(function(f){
    return byFloor[f] ? ('<b>' + f + ' ' + byFloor[f] + '장</b>')
                      : ('<span style="color:#4A5566">' + f + ' 0</span>');
  }).join(' · ');
  el.innerHTML = '자료집 사진 <b>' + st.n + '장</b> · 위치 <b>' + st.nCodes + '곳</b>' +
    (st.n ? ' · 약 ' + (mb < 0.1 ? Math.round(st.bytes/1024)+'KB' : mb.toFixed(1)+'MB') : '') +
    '<span class="sub">' + line + '</span>' +
    '<span class="sub">앱이 아는 위치 ' + total + '곳 중 ' + st.nCodes + '곳에 자료가 있습니다</span>';
}
function aidRender(){
  var list = document.getElementById('aidList');
  if(!list || typeof SUGAI === 'undefined') return;
  aidStatRender();
  var rows = SUGAI.libAll();
  if(!rows.length){
    list.innerHTML = '<div class="aidEmpty">아직 자료집이 비어 있습니다.<br>' +
      '위치를 고르고 그 자리에서 찍은 사진을 넣어 주세요.</div>';
    return;
  }
  /* 층 → 위치 → 사진 순으로 묶어서 보여 준다 */
  var by = {};
  rows.forEach(function(r){ (by[r.code] = by[r.code] || []).push(r); });
  var codes = Object.keys(by).sort();
  var byFloor = {};
  codes.forEach(function(c){ var f = aidFloorOf(c); (byFloor[f] = byFloor[f] || []).push(c); });

  function cardHtml(c){
    var arr = by[c];
    var thumbs = arr.map(function(r){
      return '<span class="t">' +
        (r.thumb ? '<img src="'+r.thumb+'" alt="'+c+'" onclick="aidZoom('+r.id+')">' : '<img alt="">') +
        (r.v ? '<span class="vw">'+r.v+'</span>' : '') +
        '<button class="x" onclick="aidDel('+r.id+')" title="이 사진 빼기">✕</button></span>';
    }).join('');
    /* 이 위치를 어느 각도로 찍어 두었는지 — 각도를 다양하게 모을수록 AI가 잘 맞힌다 */
    var vs = [], seen = {};
    arr.forEach(function(r){ if(r.v && !seen[r.v]){ seen[r.v] = 1; vs.push(r.v); } });
    var noView = arr.filter(function(r){ return !r.v; }).length;
    var vline = (vs.length || noView)
      ? '<div class="views">각도 : ' + (vs.length ? '<b>' + vs.join('</b> · <b>') + '</b>' : '') +
        (noView ? (vs.length ? ' · ' : '') + '표시 없음 ' + noView + '장' : '') + '</div>'
      : '';
    return '<div class="aidCard">' +
      '<div class="hd"><span class="nm">' + aidLabel(c) + '</span>' +
      '<span class="cnt">' + arr.length + '장</span>' +
      '<button class="del" onclick="aidDelCode(\\''+c+'\\')">이 위치 전부 빼기</button></div>' +
      '<div class="aidThumbs">' + thumbs + '</div>' + vline + '</div>';
  }
  var html = '';
  AID_FLOORS.forEach(function(f){
    var cs = byFloor[f];
    if(!cs || !cs.length) return;
    var n = cs.reduce(function(a,c){ return a + by[c].length; }, 0);
    html += '<div class="aidFloor">' + f + ' <span class="n">' + n + '장</span>' +
            '<span class="none">· ' + cs.length + '곳</span></div>';
    html += cs.map(cardHtml).join('');
  });
  list.innerHTML = html;
}
function aidZoom(id){
  var r = SUGAI.libAll().filter(function(x){ return x.id === id; })[0];
  if(!r || !r.thumb || typeof openZoom !== 'function') return;
  openZoom(r.thumb, aidLabel(r.code) + (r.v ? ' (' + r.v + ')' : '') + (r.n ? ' · ' + r.n : ''));
}
/* 컴퓨터에서 사진을 끌어다 놓기 — 화면에 처음 들어올 때 한 번만 연결한다 */
function aidBindDrop(){
  var z = document.getElementById('aidDrop');
  if(!z || z.__bound) return;
  z.__bound = true;
  ['dragenter','dragover'].forEach(function(ev){
    z.addEventListener(ev, function(e){ e.preventDefault(); e.stopPropagation(); z.classList.add('over'); });
  });
  ['dragleave','dragend'].forEach(function(ev){
    z.addEventListener(ev, function(e){ e.preventDefault(); z.classList.remove('over'); });
  });
  z.addEventListener('drop', function(e){
    e.preventDefault(); e.stopPropagation(); z.classList.remove('over');
    var fs = (e.dataTransfer && e.dataTransfer.files) ? e.dataTransfer.files : null;
    if(!fs || !fs.length){ aidProg('넣을 파일이 없습니다.'); return; }
    aidTake(fs);          /* 위치는 파일 이름에서 알아낸다 */
  });
}
function aidEnter(){
  aidFillList();
  aidBindDrop();
  if(typeof SUGAI === 'undefined') return;
  SUGAI.libEnsure().then(aidRender)['catch'](aidRender);
  SUGAI.ensure()['catch'](function(){});     // 모델 미리 준비 (사진 넣을 때 기다리지 않게)
}
function aidProg(msg, pct){
  var el = document.getElementById('aidProg');
  if(!el) return;
  el.innerHTML = (msg || '') + (pct === undefined ? '' :
    '<div class="bar2"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></div>');
}
/* 파일 이름에서 위치를 알아낸다.
   ① phCodeOf : 13501 · EV3 · HALL5L · BLD · B1 · KTC 처럼 코드가 들어 있는 경우 (사진 등록과 같은 규칙)
   ② SUGAI.noteCode : '5층 좌측 복도' · '3층 엘리베이터' · '지하' · '정문' 같은 한글 표현 */
function aidCodeFromName(name){
  var base = String(name || '').split('/').pop().split('\\\\').pop();
  var noExt = base.replace(/\\.[A-Za-z0-9]+$/, '');
  try{ var c = phCodeOf(base); if(c) return c; }catch(e){}
  try{
    if(typeof SUGAI !== 'undefined' && SUGAI.noteCode){
      var n = SUGAI.noteCode(noExt);
      if(n) return String(n).toUpperCase();
    }
  }catch(e){}
  return '';
}

/* 파일 이름 끝의 괄호를 '각도'로 읽는다.
     1층 13501 호실번호 (왼쪽).jpg  →  코드 13501 · 각도 '왼쪽'
   코드는 그대로 두고 각도만 따로 기억하므로, AI는 같은 13501로 보되
   관리자는 어느 각도를 찍어 두었는지 한눈에 볼 수 있다.
   윈도우가 붙이는 '(1)' '(2)' 같은 숫자 괄호는 각도로 보지 않는다. */
var AID_VIEW_WORDS = ['왼쪽','좌측','오른쪽','우측','정면','앞','뒤','후면','위','아래',
                      '가까이','멀리','입구','안쪽','창가','복도쪽','전체'];
function aidAllDigits(t){
  if(!t) return false;
  for(var i=0;i<t.length;i++){ var c = t.charAt(i); if(c < '0' || c > '9') return false; }
  return true;
}
function aidViewFromName(name){
  var base = String(name || '').split('/').pop().split(String.fromCharCode(92)).pop();
  var dot = base.lastIndexOf('.');
  var noExt = (dot > 0 ? base.slice(0, dot) : base).trim();
  /* ① 이름 끝의 괄호 : (왼쪽) (오른쪽) (창가쪽) … */
  if(noExt.charAt(noExt.length-1) === ')'){
    var open = noExt.lastIndexOf('(');
    if(open >= 0){
      var v = noExt.slice(open+1, noExt.length-1).trim();
      if(v && v.length <= 12 && !aidAllDigits(v)) return v;
    }
  }
  /* ② 괄호가 없으면 이름 끝의 방향 낱말 : … 왼쪽.jpg */
  for(var i=0;i<AID_VIEW_WORDS.length;i++){
    var w = AID_VIEW_WORDS[i];
    if(noExt.length > w.length && noExt.slice(noExt.length - w.length) === w){
      var before = noExt.charAt(noExt.length - w.length - 1);
      if(before === ' ' || before === '_' || before === '-') return w;
    }
  }
  return '';
}

/* 넣기 전 대기 목록 : [{n:파일명, u:사진, t:작은미리보기, code, auto, view}] */
var AID_STAGE = [];

function aidMini(url, cb){
  var im = new Image();
  im.onload = function(){
    try{
      var M = 76, k = Math.min(1, M/Math.max(im.width||M, im.height||M));
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round((im.width||M)*k));
      cv.height = Math.max(1, Math.round((im.height||M)*k));
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      cb(cv.toDataURL('image/jpeg', 0.6));
    }catch(e){ cb(''); }
  };
  im.onerror = function(){ cb(''); };
  im.src = url;
}

function aidPick(){
  if(AID_BUSY){ AID_STOP = true; return; }
  var f = document.getElementById('aidFile');
  if(!f) return;
  f.value = '';
  f.onchange = function(){ aidTake(f.files); };
  f.click();
}

/* 고르거나 끌어다 놓은 파일들을 읽어 대기 목록에 담는다 (ZIP도 풀어서) */
function aidTake(files){
  if(!files || !files.length) return;
  if(typeof SUGAI === 'undefined'){ aidProg('AI를 쓸 수 없습니다.'); return; }
  var fallback = (document.getElementById('aidCode') || {}).value || '';
  fallback = fallback.trim().toUpperCase();
  AID_BUSY = true; AID_STOP = false;
  aidProg('파일을 여는 중…', 3);
  phCollect(files, function(items){
    if(!items.length){ AID_BUSY = false; aidProg('넣을 수 있는 사진이 없습니다. (jpg·png·zip)'); return; }
    var i = 0, skip = 0;
    (function step(){
      if(AID_STOP || i >= items.length){
        AID_BUSY = false;
        aidProg(skip ? ('사진 ' + AID_STAGE.length + '장 준비됨 · ' + skip + '장은 읽지 못했어요') : '');
        aidStageRender();
        return;
      }
      var it = items[i++];
      aidProg('사진 읽는 중… ' + i + '/' + items.length, i/items.length*100);
      phShrink(it.b, function(u){
        if(!u){ skip++; setTimeout(step, 0); return; }
        var base = String(it.n).split('/').pop();
        var found = aidCodeFromName(it.n);
        var code = found || fallback;
        var view = aidViewFromName(it.n);
        aidMini(u, function(t){
          AID_STAGE.push({ n: base, u: u, t: t, code: code, auto: !!found, view: view });
          setTimeout(step, 0);
        });
      });
    })();
  });
}

function aidStageRender(){
  var box = document.getElementById('aidStage'), rows = document.getElementById('aidStageRows'),
      hd = document.getElementById('aidStageHd');
  if(!box || !rows) return;
  if(!AID_STAGE.length){ box.style.display = 'none'; rows.innerHTML = ''; return; }
  box.style.display = '';
  var auto = 0, miss = 0;
  AID_STAGE.forEach(function(r){ if(r.code) auto++; else miss++; });
  hd.innerHTML = '넣을 사진 <b>' + AID_STAGE.length + '장</b> · ' +
    '<span class="auto">위치 찾음 ' + auto + '장</span>' +
    (miss ? ' · <span class="miss">못 찾음 ' + miss + '장 (직접 넣어 주세요)</span>' : '');
  rows.innerHTML = AID_STAGE.map(function(r, i){
    var lb = (r.code ? aidLabel(r.code) : '위치 없음') + (r.view ? ' (' + r.view + ')' : '');
    return '<div class="sRow' + (r.code ? '' : ' none') + '">' +
      (r.t ? '<img src="'+r.t+'" alt="">' : '<img alt="">') +
      '<span class="sName"><b>' + lb + '</b>' + r.n + '</span>' +
      '<input class="sCode" value="' + (r.code || '') + '" placeholder="위치" ' +
        'oninput="aidStageSet(' + i + ', this.value)" list="aidCodeList">' +
      '<button class="x" onclick="aidStageDel(' + i + ')" title="빼기">✕</button></div>';
  }).join('');
}
function aidStageSet(i, v){
  if(!AID_STAGE[i]) return;
  AID_STAGE[i].code = String(v || '').trim().toUpperCase();
  var rows = document.getElementById('aidStageRows');
  var row = rows ? rows.children[i] : null;
  if(row){
    var nm = row.querySelector('.sName b');
    if(nm) nm.textContent = (AID_STAGE[i].code ? aidLabel(AID_STAGE[i].code) : '위치 없음') +
                            (AID_STAGE[i].view ? ' (' + AID_STAGE[i].view + ')' : '');
    row.className = 'sRow' + (AID_STAGE[i].code ? '' : ' none');
  }
  var hd = document.getElementById('aidStageHd');
  if(hd){
    var auto = 0, miss = 0;
    AID_STAGE.forEach(function(r){ if(r.code) auto++; else miss++; });
    hd.innerHTML = '넣을 사진 <b>' + AID_STAGE.length + '장</b> · <span class="auto">위치 찾음 ' + auto + '장</span>' +
      (miss ? ' · <span class="miss">못 찾음 ' + miss + '장 (직접 넣어 주세요)</span>' : '');
  }
}
function aidStageDel(i){ AID_STAGE.splice(i, 1); aidStageRender(); }
function aidStageClear(){ AID_STAGE = []; aidStageRender(); aidProg(''); }

/* 대기 목록을 실제 자료집에 넣는다 */
function aidCommit(){
  if(AID_BUSY){ AID_STOP = true; return; }
  var todo = AID_STAGE.filter(function(r){ return !!r.code; });
  var miss = AID_STAGE.length - todo.length;
  if(!todo.length){ aidProg('위치가 정해진 사진이 없습니다.'); return; }
  var byCode = {}, viewsOf = {};
  todo.forEach(function(r){
    byCode[r.code] = (byCode[r.code]||0) + 1;
    if(r.view){ (viewsOf[r.code] = viewsOf[r.code] || []).push(r.view); }
  });
  var lines = Object.keys(byCode).sort().map(function(c){
    var vs = viewsOf[c];
    return '· ' + aidLabel(c) + ' ' + byCode[c] + '장' + (vs && vs.length ? ' (' + vs.join(', ') + ')' : '');
  });
  if(!confirm('자료집에 넣습니다.\\n\\n' + lines.join('\\n') +
              (miss ? ('\\n\\n※ 위치를 못 정한 ' + miss + '장은 빼고 넣습니다.') : ''))) return;

  AID_BUSY = true; AID_STOP = false;
  var btn = document.getElementById('aidCommitBtn');
  if(btn) btn.textContent = '그만하기';
  var okN = 0, failN = 0, i = 0;
  (function step(){
    if(AID_STOP || i >= todo.length){
      AID_BUSY = false;
      if(btn) btn.textContent = '이대로 자료집에 넣기';
      var doneIds = {};
      todo.slice(0, i).forEach(function(r){ doneIds[r.n + '|' + r.code] = 1; });
      AID_STAGE = AID_STAGE.filter(function(r){ return !doneIds[r.n + '|' + r.code]; });
      aidProg('✓ ' + okN + '장을 자료집에 넣었습니다.' +
              (failN ? ' (' + failN + '장 실패)' : '') + (AID_STOP ? ' — 중간에 멈췄습니다.' : ''));
      aidStageRender(); aidRender();
      return;
    }
    var r = todo[i++];
    aidProg('AI에게 보여주는 중… ' + i + '/' + todo.length, i/todo.length*100);
    SUGAI.libAdd(r.code, r.u, r.n, r.view)
      .then(function(){ okN++; setTimeout(step, 0); })
      ['catch'](function(){ failN++; setTimeout(step, 0); });
  })();
}
function aidDel(id){
  SUGAI.libDel(id).then(aidRender)['catch'](function(){ aidProg('지우지 못했습니다.'); });
}
function aidDelCode(code){
  if(!confirm('「' + aidLabel(code) + '」 자료를 모두 뺄까요?')) return;
  SUGAI.libDelCode(code).then(aidRender)['catch'](function(){ aidProg('지우지 못했습니다.'); });
}
function aidClearAll(){
  if(!confirm('자료집을 전부 비울까요?\\n(앱에 원래 들어있던 사진 학습은 그대로 남습니다)')) return;
  SUGAI.libClear().then(function(){ aidProg(''); aidRender(); })['catch'](function(){ aidProg('비우지 못했습니다.'); });
}
</script>

<!-- ══ v54 : 사진 크게 보기 ═══════════════════════════════════ -->""")

io.open(DST,'w',encoding='utf-8').write(s)
print('\n원본 %d → %d bytes (%+d) · 패치 %d개'%(orig,len(s),len(s)-orig,len(done)))
