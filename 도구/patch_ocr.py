# -*- coding: utf-8 -*-
"""v52 → v53 : 사진 속 호실 번호판을 읽어 위치·층을 알아낸다 (OCR) + 층 선택 + 메모 힌트 버그 수정
  1. 제보 사진에서 숫자를 읽는다(tesseract.js, 숫자만). '13512' 같은 호실 번호 → 방이면 그 방, 복도면 5층 복도.
     내장 기준사진 133장 중 번호판이 찍힌 29장에서 실제로 읽힘 (정확 24장, 일부 5장).
  2. 제보 화면에 '몇 층에서 찍으셨나요?' 선택 버튼 — 누르면 메모에 'N층'이 붙어 층 힌트로 쓰인다.
  3. 버그 수정 : 제보 메모가 AI 판정에 전달되지 않고 있었다 (v45부터). 이제 실제로 힌트로 쓰인다.
  4. 층 힌트(메모·번호판)를 상위 8개가 아니라 전체 순위에서 찾는다 → 그 층 후보가 항상 올라온다.
  5. OCR 라이브러리는 건의함 화면에 들어갈 때 미리 받아 둔다 (같은 서버 lib/tess/ → 없으면 CDN). 못 받으면 조용히 건너뛴다.
"""
import io, sys
SRC='/home/claude/gunsan_b3nav_AI3_v52.html'; DST='/home/claude/gunsan_b3nav_OCR_v53.html'
s=io.open(SRC,encoding='utf-8').read(); orig=len(s); done=[]
def patch(name, old, new, count=1):
    global s
    n=s.count(old)
    if n!=count: print('  [실패] %s : 앵커 %d개'%(name,n)); sys.exit(1)
    s=s.replace(old,new,count); done.append(name); print('  [OK] %s'%name)

# ═══ 1. CSS : 층 선택 버튼 · 안내문 ═══
patch('CSS',
"""  #ssug{overflow-y:auto;-webkit-overflow-scrolling:touch;}""",
"""  #ssug{overflow-y:auto;-webkit-overflow-scrolling:touch;}
  /* v53 : 층 선택 버튼 + 촬영 안내 */
  .sugFloorRow{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px;font-size:12px;color:#7C8AA0;}
  .sugFloorRow button{background:#131A24;color:#94B8E0;border:1px solid #2A3644;border-radius:8px;padding:6px 11px;font-size:13px;white-space:nowrap;}
  .sugFloorRow button.on{background:#1B3A2E;color:#39FF88;border-color:#39FF88;}
  .sugTip{margin-top:8px;font-size:12px;line-height:1.5;color:#7C8AA0;background:#0F141B;border:1px dashed #2A3644;border-radius:8px;padding:8px 10px;}
  .sugTip b{color:#94B8E0;font-weight:600;}""")

# ═══ 2. 제보 화면 : 안내문 + 층 선택 ═══
patch('층 선택 UI',
"""      <button class="big" style="margin-top:10px;" onclick="sugSubmit()" data-ko="건의함에 올리기" data-en="Submit to Suggestion Box">건의함에 올리기</button>""",
"""      <div class="sugFloorRow" id="sugFloorRow">
        <span data-ko="몇 층에서 찍으셨나요? (선택)" data-en="Which floor? (optional)">몇 층에서 찍으셨나요? (선택)</span>
        <button type="button" data-f="지하 1층" data-ko="지하 1층" data-en="B1" onclick="sugFloorSel(this)">지하 1층</button>
        <button type="button" data-f="1층" data-ko="1층" data-en="1F" onclick="sugFloorSel(this)">1층</button>
        <button type="button" data-f="2층" data-ko="2층" data-en="2F" onclick="sugFloorSel(this)">2층</button>
        <button type="button" data-f="3층" data-ko="3층" data-en="3F" onclick="sugFloorSel(this)">3층</button>
        <button type="button" data-f="4층" data-ko="4층" data-en="4F" onclick="sugFloorSel(this)">4층</button>
        <button type="button" data-f="5층" data-ko="5층" data-en="5F" onclick="sugFloorSel(this)">5층</button>
      </div>
      <div class="sugTip" data-ko="💡 복도·엘리베이터 앞처럼 어느 층이나 비슷한 곳은, <b>가까운 호실 번호판</b>이 함께 나오게 찍어 주세요. AI가 번호를 읽어 층을 알아냅니다." data-en="💡 For hallways and elevator lobbies that look alike on every floor, include a <b>nearby room-number plate</b> in the shot — the AI reads the number to tell the floor.">💡 복도·엘리베이터 앞처럼 어느 층이나 비슷한 곳은, <b>가까운 호실 번호판</b>이 함께 나오게 찍어 주세요. AI가 번호를 읽어 층을 알아냅니다.</div>
      <button class="big" style="margin-top:10px;" onclick="sugSubmit()" data-ko="건의함에 올리기" data-en="Submit to Suggestion Box">건의함에 올리기</button>""")

patch('층 선택 JS + 메모 전달 버그 수정',
"""function sugSubmit(){""",
"""/* v53 : 층 선택 버튼 — 고른 층은 메모 끝에 'N층'으로 붙어 AI 힌트가 된다 */
var sugFloorPick = '';
function sugFloorSel(btn){
  var row = document.getElementById('sugFloorRow'); if(!row) return;
  var was = btn.classList.contains('on');
  Array.prototype.forEach.call(row.querySelectorAll('button'), function(b){ b.classList.remove('on'); });
  if(was){ sugFloorPick = ''; return; }
  btn.classList.add('on'); sugFloorPick = btn.getAttribute('data-f') || '';
}
function sugFloorReset(){
  sugFloorPick = '';
  var row = document.getElementById('sugFloorRow');
  if(row) Array.prototype.forEach.call(row.querySelectorAll('button'), function(b){ b.classList.remove('on'); });
}
function sugSubmit(){""")
patch('메모에 층 붙이기',
"""  var noteEl = document.getElementById('sugNote');
  var noteVal = noteEl ? noteEl.value.trim() : '';
  var pickedFile = sugPickedFile;""",
"""  var noteEl = document.getElementById('sugNote');
  var noteVal = noteEl ? noteEl.value.trim() : '';
  /* v53 : 층 버튼을 골랐고 메모에 층이 없으면 메모에 붙인다 (관리자에게도 보이고, AI 힌트로도 쓰인다) */
  if(sugFloorPick && !/([1-5]\\s*층|지하|B1)/i.test(noteVal)) noteVal = (noteVal ? noteVal + ' ' : '') + sugFloorPick;
  var pickedFile = sugPickedFile;""")
patch('judge에 메모 전달',
"""      sugFinishSubmit(url, noteVal, ai, stat, noteEl);
    });
  });
}""",
"""      sugFinishSubmit(url, noteVal, ai, stat, noteEl);
    }, noteVal);    /* v53 : 메모를 힌트로 넘긴다 — 지금까지 이 인자가 빠져 있어서 메모 힌트가 실제로는 안 쓰였다 */
  });
}""")
patch('제출 후 층 선택 초기화',
"""    if(noteEl) noteEl.value = '';
    var fileInput = document.getElementById('sugFile'); if(fileInput) fileInput.value = '';
    sugPickedFile = null;""",
"""    if(noteEl) noteEl.value = '';
    var fileInput = document.getElementById('sugFile'); if(fileInput) fileInput.value = '';
    sugPickedFile = null;
    if(typeof sugFloorReset === 'function') sugFloorReset();""")

# ═══ 3. SUGAI : OCR 모듈 ═══
patch('OCR 모듈',
"""  /* ── 시점(v52) ──────────────────────────────────────────────""",
"""  /* ══════════════════════════════════════════════════════════════
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
  var OCR = { ENABLED:true, TIMEOUT:25000, MINCONF:40 };
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
          opt = { workerPath: base + 'worker.min.js', corePath: base.replace(/\\/$/, ''), langPath: base.replace(/\\/$/, ''), gzip:true };
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
      else if(t.length === 4 && /^3[1-5]\d{2}$/.test(t) && known['1'+t]){ cand = '1'+t; c *= 0.8; }
      else if(t.length === 4 && /^1[1-5]\d{2}$/.test(t) && known['13'+t.slice(1)]){ cand = '13'+t.slice(1); c *= 0.7; }
      else if(/^13[1-5]\d?$/.test(t) && c >= 60){ floorOnly = floorOnly || (t.charAt(2)+'층'); }
      if(cand){
        cands.push({code:cand, conf:Math.round(c)});
        if(!best || c > best.c) best = {code:cand, c:c, raw:t};
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
  /* 사진 한 장 OCR — 실패·시간초과면 null (판정은 그대로 진행)
     ① 사진 전체를 '흩어진 글자' 모드로 → 확신(80 이상)이 있으면 끝
     ② 아니면 전체를 '한 덩어리' 모드로 + 4조각 확대 → 전부 모아 가장 확실한 번호를 고른다
     (내장 사진 104장으로 측정 : ①만 24장 → ①+② 50장에서 번호를 읽음, 오독 0) */
  function ocrRun(dataUrl){
    if(!OCR.ENABLED) return Promise.resolve(null);
    var timer = null;
    var work = ocrEnsure().then(function(w){
      return new Promise(function(res, rej){
        var im = new Image();
        im.onload = function(){ res(im); };
        im.onerror = function(){ rej('image'); };
        im.src = dataUrl;
      }).then(function(im){
        var words = [];
        return ocrWords(w, im, 11).then(function(ws){
          words = words.concat(ws);
          var first = ocrParse(words);
          if(first && first.code && first.conf >= 80) return first;
          var tiles = [im].concat(ocrTiles(im)), i = 0;
          function next(){
            if(i >= tiles.length) return ocrParse(words);
            return ocrWords(w, tiles[i++], 6).then(function(ws2){ words = words.concat(ws2); return next(); });
          }
          return next();
        });
      });
    })['catch'](function(){ return null; });
    var late = new Promise(function(res){ timer = setTimeout(function(){ res(null); }, OCR.TIMEOUT); });
    return Promise.race([work, late]).then(function(v){ if(timer) clearTimeout(timer); return v; });
  }
  function isCorridor(code){ return /^(HALL|EV|WC|ES)/.test(String(code||'').toUpperCase()); }

  /* 번호판 결과를 판정에 반영 (전체 순위 rk 기준)
     · 방 장면 + 번호가 정확히 읽힘 → 그 방으로 확정
     · 복도 장면(상위 3개 중 2개 이상이 복도·엘베) → 번호의 층에 있는 복도·엘베 후보를 맨 위로, 층 확정
     · 그 밖에 → 그 층 후보를 위로 */
  function applyOcr(res, ocr, rk){
    if(!ocr || !ocr.floor) return res;
    res.ocr = ocr;
    /* 믿을 만한가 : 확신 60 이상이거나, 앱이 아는 5자리 번호가 정확히 읽혔으면(35 이상) 우연일 가능성이 매우 낮다 */
    var trust = ocr.conf >= 60 || (ocr.conf >= 35 && !!ocr.code && !!knownCodes()[ocr.code]);
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
    if(!corridor && ocr.code && SCOPE.allow(ocr.code)){
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

  /* ── 시점(v52) ──────────────────────────────────────────────""")

# ═══ 4. judge : OCR을 CNN과 동시에 돌리고 결과를 합친다 ═══
patch('judge OCR 병행',
"""      ensure().then(function(){
        /* v52 : 제보 사진을 '그대로' 와 '가운데 확대' 두 시점으로 만들어 둘 다 비교한다.
           찍은 거리가 기준사진과 달라도 둘 중 하나는 맞게 된다. (폰에서 0.2초 정도 더 걸린다) */
        return embedViews(img, Q_VIEWS).then(function(qs){
          var rk = rank(qs);""",
"""      /* v53 : 번호판 읽기는 별도 워커에서 돌므로 CNN과 동시에 시작한다 */
      var ocrP = ocrRun(dataUrl);
      ensure().then(function(){
        /* v52 : 제보 사진을 '그대로' 와 '가운데 확대' 두 시점으로 만들어 둘 다 비교한다.
           찍은 거리가 기준사진과 달라도 둘 중 하나는 맞게 된다. (폰에서 0.2초 정도 더 걸린다) */
        return embedViews(img, Q_VIEWS).then(function(qs){
          var rk = rank(qs);""")
patch('judge 결과 합치기',
"""          if(res.sim < TH.RELEVANT)      res.verdict = 'irrelevant';
          else if(res.sim >= TH.SAME)    res.verdict = 'same';
          else if(res.sim >= TH.MATCH && res.margin >= TH.MARGIN) res.verdict = 'match';
          else                           res.verdict = 'uncertain';
          applyHint(res, note);                    // 제보 메모를 힌트로 반영
          cb(res);
        });
      })['catch'](function(){""",
"""          if(res.sim < TH.RELEVANT)      res.verdict = 'irrelevant';
          else if(res.sim >= TH.SAME)    res.verdict = 'same';
          else if(res.sim >= TH.MATCH && res.margin >= TH.MARGIN) res.verdict = 'match';
          else                           res.verdict = 'uncertain';
          return ocrP.then(function(ocr){
            applyOcr(res, ocr, rk);                // v53 : 번호판
            applyHint(res, note, rk);              // 제보 메모를 힌트로 반영
            cb(res);
          });
        });
      })['catch'](function(){""")

# ═══ 5. applyHint : 전체 순위에서 층 후보를 찾는다 ═══
patch('applyHint 전체 순위',
"""  function applyHint(res, note){
    var hint = noteCode(note);
    var fl = noteFloor(note);
    if(fl) res.noteFloor = fl;
    var pool = res.all || res.top;""",
"""  function applyHint(res, note, rk){
    var hint = noteCode(note);
    var fl = noteFloor(note);
    if(fl) res.noteFloor = fl;
    if(res.floorSource === 'ocr' && fl && res.ocr && res.ocr.floor !== fl) res.floorConflict = true;   // 번호판과 메모가 다름
    if(res.floorSource === 'ocr' && !hint) return res;   // 번호판이 층을 확정했으면 메모의 층은 참고만
    /* v53 : 상위 8개가 아니라 전체 순위에서 찾는다 — 그 층 후보는 항상 있다 */
    var pool = (rk && rk.length) ? rk.map(function(x){ return {code:x.code, sim:Math.round(x.sim*1000)/1000}; }) : (res.all || res.top);""")
patch('applyHint 결과 8개로 자르기',
"""      if(same.length && other.length && floorOf(pool[0].code) !== fl){
        res.floorHintUsed = true;
        var merged = same.concat(other);
        res.all = merged;
        res.top = merged.slice(0,3);""",
"""      if(same.length && other.length && floorOf(pool[0].code) !== fl){
        res.floorHintUsed = true;
        var merged = same.concat(other);
        res.all = merged.slice(0,8);
        res.top = merged.slice(0,3);""")
patch('applyHint 정확 힌트 8개로',
"""        var pick = pool.splice(idx,1)[0];
        pool.unshift(pick);
        res.top = pool.slice(0,3);""",
"""        var pick = pool.splice(idx,1)[0];
        pool.unshift(pick);
        res.all = pool.slice(0,8);
        res.top = pool.slice(0,3);""")

# ═══ 6. 표시 : 제보자 카드 · 관리자 배지 · 추정 문장 ═══
patch('제보자 카드 번호판',
"""    if(ai.quality && ai.quality.sharp !== undefined){
      t.why += (t.why?' · ':'') + (ko()?'선명도 ':'sharpness ') + Math.round(ai.quality.sharp);
    }

    icon.textContent = t.icon;""",
"""    if(ai.quality && ai.quality.sharp !== undefined){
      t.why += (t.why?' · ':'') + (ko()?'선명도 ':'sharpness ') + Math.round(ai.quality.sharp);
    }
    if(ai.ocr && ai.ocr.floor){
      t.why += (t.why?' · ':'') + (ko()?'🔢 번호판 ':'🔢 plate ') + (ai.ocr.code || ai.ocr.raw || '') + ' → ' + ai.ocr.floor;
    }

    icon.textContent = t.icon;""")
patch('관리자 배지 번호판',
"""    if(s.qr) h += '<span class="num qr">⛶ '+s.qr+' QR 스캔 후 제보</span>';""",
"""    if(s.qr) h += '<span class="num qr">⛶ '+s.qr+' QR 스캔 후 제보</span>';
    if(ai.ocr && ai.ocr.floor){
      h += '<span class="num hint">🔢 번호판 '+(ai.ocr.code || ai.ocr.raw || '')+' → '+ai.ocr.floor
         + (ai.codeSource==='ocr' ? ' (이 방으로 확정)' : ' (층 확정)')
         + (ai.floorConflict ? ' · 메모의 층과 다름' : '') + '</span>';
    }""")
patch('추정 문장 번호판',
"""    if(sure){
      var f1 = floorOf(t.code), f2 = ai.top[1] ? floorOf(ai.top[1].code) : null;
      /* v52 : 확정이어도 2등이 다른 층이고 격차가 작으면 그 사실을 함께 알린다 */
      if(f1 && f2 && f1 !== f2 && (t.sim - ai.top[1].sim) < 0.05)""",
"""    if(ai.floorSource === 'ocr'){
      /* v53 : 번호판을 읽었으면 층은 확실하다 */
      var fo = floorOf(t.code) || (ai.ocr && ai.ocr.floor);
      if(fo) h += '<span class="sub">층 : <b>'+fo+'</b> <span class="num">(사진 속 번호판 '+(ai.ocr.code||ai.ocr.raw||'')+'에서 읽음)</span></span>';
    } else if(sure){
      var f1 = floorOf(t.code), f2 = ai.top[1] ? floorOf(ai.top[1].code) : null;
      /* v52 : 확정이어도 2등이 다른 층이고 격차가 작으면 그 사실을 함께 알린다 */
      if(f1 && f2 && f1 !== f2 && (t.sim - ai.top[1].sim) < 0.05)""")

# ═══ 7. 건의함 화면 들어갈 때 OCR도 미리 준비 ═══
patch('warmup OCR',
"""    ensure().then(function(){
      box.className='aiPrep on';
      if(txt) txt.textContent = ko()?'AI 준비 완료 — 사진을 올리면 자동으로 확인해요':'AI ready — photos are checked automatically';
    })['catch'](function(){""",
"""    ensure().then(function(){
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
    })['catch'](function(){""")

patch('노출',
"""           embedUrlViews:embedUrlViews, powNorm:powNorm, Q_VIEWS:Q_VIEWS, REF_VIEWS:REF_VIEWS,""",
"""           embedUrlViews:embedUrlViews, powNorm:powNorm, Q_VIEWS:Q_VIEWS, REF_VIEWS:REF_VIEWS,
           ocrEnsure:ocrEnsure, ocrRun:ocrRun, ocrParse:ocrParse, applyOcr:applyOcr, OCR:OCR,
           get ocrSrc(){ return ocrSrc; }, get ocrReady(){ return !!ocrWorker; },""")

io.open(DST,'w',encoding='utf-8').write(s)
print('\n원본 %d → %d bytes (%+d) · 패치 %d개'%(orig,len(s),len(s)-orig,len(done)))
