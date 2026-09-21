# -*- coding: utf-8 -*-
"""v44 → v45 : AI 자동 학습 · 사진 일괄 자동분류 · 새 장소 묶기 · 메모 힌트"""
import io, sys

SRC = '/home/claude/gunsan_b3nav_AI_v44.html'
DST = '/home/claude/gunsan_b3nav_AI_v45.html'

s = io.open(SRC, encoding='utf-8').read()
orig = len(s)
done = []

def patch(name, old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        print('  [실패] %s : 앵커 %d개 (기대 %d)' % (name, n, count)); sys.exit(1)
    s = s.replace(old, new, count); done.append(name); print('  [OK] %s' % name)

# ═══════════════ 1. CSS ═══════════════
CSS = r'''
  /* ══════════════ AI 자동 학습·분류 (v45 신규) ══════════════ */
  #phsort .aiBar{display:flex;gap:8px;margin-bottom:10px;flex:0 0 auto;}
  #phsort .aiBar button{flex:1;background:linear-gradient(90deg,#00E5FF,#7B5CFF);color:#05060A;
    border:none;border-radius:6px;padding:12px 8px;font-size:13px;font-weight:800;
    font-family:inherit;cursor:pointer;}
  #phsort .aiBar button:disabled{background:#1A2230;color:#5D6B80;cursor:default;}
  #phsort .aiBar button.ghost{background:transparent;color:#00E5FF;border:1px solid #2A3644;font-weight:700;}
  #phsort .aiProg{font-size:11.5px;color:#7C8AA0;text-align:center;margin-bottom:8px;min-height:16px;}

  #phsort .pit .aiRec{display:block;margin-top:4px;font-size:10.5px;color:#39FF88;font-weight:700;}
  #phsort .pit .aiRec.warn{color:#FFC93C;}
  #phsort .pit .aiRec.newp{color:#FF2E88;}

  /* 새 장소 묶음 */
  #phsort .newGroups{margin-bottom:10px;}
  #phsort .ngCard{background:#0E141C;border:1px solid #2A3644;border-radius:10px;
    padding:10px;margin-bottom:8px;}
  #phsort .ngCard .ngHd{font-size:12.5px;font-weight:800;color:#FF2E88;margin-bottom:6px;}
  #phsort .ngCard .ngThumbs{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;}
  #phsort .ngCard .ngThumbs img{width:46px;height:46px;object-fit:cover;border-radius:6px;
    border:1px solid #232D3A;}
  #phsort .ngCard .ngRow{display:flex;gap:6px;}
  #phsort .ngCard input{flex:1;background:#131A24;border:1px solid #2A3644;color:#E7F6FF;
    border-radius:6px;padding:10px;font-size:12.5px;font-family:inherit;}
  #phsort .ngCard button{background:rgba(57,255,136,.14);color:#39FF88;border:1px solid rgba(57,255,136,.5);
    border-radius:6px;padding:10px 14px;font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer;}
  #phsort .ngCard .ngTip{font-size:10.5px;color:#5D6B80;margin-top:6px;line-height:1.5;}

  /* 학습 현황 (사진 등록 화면) */
  #sph .aiLearn{margin-top:10px;font-size:11.5px;color:#5D6B80;text-align:center;line-height:1.6;}
  #sph .aiLearn b{color:#39FF88;}

  /* 메모 힌트 표시 */
  #sadmin .sugAi .hint{color:#00E5FF;}
'''
patch('v45 CSS', '''  /* 출발지 배지 — 목적지 화면(s4)에 현재 출발 문을 표시 */''',
      CSS + '''
  /* 출발지 배지 — 목적지 화면(s4)에 현재 출발 문을 표시 */''')

# ═══════════════ 2. #phsort 화면에 AI 도구 ═══════════════
patch('#phsort AI 도구 추가',
'''    <div class="sum" id="phSortSum"></div>
    <div class="tools">''',
'''    <div class="sum" id="phSortSum"></div>
    <div class="aiBar">
      <button id="phAiBtn" onclick="phAiSort()">🤖 AI로 위치 찾기</button>
      <button class="ghost" id="phAiClearBtn" onclick="phAiClear()">추천 지우기</button>
    </div>
    <div class="aiProg" id="phAiProg"></div>
    <div class="newGroups" id="phNewGroups"></div>
    <div class="tools">''')

# ═══════════════ 3. #sph 학습 현황 ═══════════════
patch('#sph 학습 현황',
      '''    <div class="list" id="phList"></div>''',
      '''    <div class="aiLearn" id="phAiLearn"></div>
    <div class="list" id="phList"></div>''')

# ═══════════════ 4. phSortRender — AI 추천 표시 ═══════════════
patch('사진 카드에 AI 추천 표시',
'''    bt.innerHTML = (it.code ? '📍 ' : '⚠ ') + phDestName(it.code)
                 + (it.code && it.auto ? '<span class="auto">자동</span>' : '');
    bt.onclick = function(ev){ ev.stopPropagation(); phPickOpen(idx); };
    meta.appendChild(fn); meta.appendChild(bt);''',
'''    bt.innerHTML = (it.code ? '📍 ' : '⚠ ') + phDestName(it.code)
                 + (it.code && it.auto ? '<span class="auto">자동</span>' : '');
    bt.onclick = function(ev){ ev.stopPropagation(); phPickOpen(idx); };
    meta.appendChild(fn); meta.appendChild(bt);
    /* v45 : AI가 본 결과를 카드에 함께 보여준다 */
    if(it.ai){
      var rec = document.createElement('span');
      rec.className = 'aiRec' + (it.ai.kind==='new' ? ' newp' : (it.ai.kind==='weak' ? ' warn' : ''));
      if(it.ai.kind === 'new'){
        rec.textContent = '🤖 새로운 장소 ' + (it.ai.group!=null ? '묶음 '+(it.ai.group+1) : '');
      }else{
        rec.textContent = '🤖 ' + (it.ai.kind==='auto' ? '자동 배정 ' : '추천 ')
                        + it.ai.code + ' ' + Math.round(it.ai.sim*100) + '%';
      }
      meta.appendChild(rec);
    }''')

# ═══════════════ 5. phSortCommit — 넣을 때 AI 학습 ═══════════════
patch('사진 반영 시 AI 학습',
'''    ROOM_PHOTOS[x.code].push({n:x.n, u:x.u});
    ok++;
  });
  PH_STAGE = left;''',
'''    ROOM_PHOTOS[x.code].push({n:x.n, u:x.u});
    /* v45 : 넣는 순간 AI에게도 가르친다 — 이 사진이 이 위치라는 것 */
    if(typeof SUGAI !== 'undefined') SUGAI.learn(x.code, x.u, x.n);
    ok++;
  });
  PH_STAGE = left;''')

# ═══════════════ 6. sugApprove — 승인한 제보도 학습 ═══════════════
patch('제보 승인 시 AI 학습',
'''  phNormalize();
  phRender();
  s.status = 'approved'; s.code = code + (sub ? ('-'+sub) : ''); s.handledTs = Date.now();''',
'''  phNormalize();
  phRender();
  /* v45 : 관리자가 승인한 사진도 AI 정답표에 더한다 */
  if(typeof SUGAI !== 'undefined') SUGAI.learn(code, s.u, '건의함_'+id);
  s.status = 'approved'; s.code = code + (sub ? ('-'+sub) : ''); s.handledTs = Date.now();''')

# ═══════════════ 7. sugSubmit — 메모를 힌트로 전달 ═══════════════
patch('제보 메모를 AI 힌트로',
"    SUGAI.judge(url, function(ai){",
"    SUGAI.judge(url, function(ai){", 1)   # 자리표시 (아래에서 judge 시그니처 확장)
patch('judge 호출에 메모 전달',
"""    if(stat){ stat.style.color = '#7C8AA0'; stat.textContent = (LANG==='ko') ? 'AI가 사진을 확인하는 중…' : 'AI is checking the photo…'; }
    SUGAI.judge(url, function(ai){""",
"""    if(stat){ stat.style.color = '#7C8AA0'; stat.textContent = (LANG==='ko') ? 'AI가 사진을 확인하는 중…' : 'AI is checking the photo…'; }
    SUGAI.judge(url, function(ai){""")

# judge(dataUrl, cb) → judge(dataUrl, cb, note)
patch('judge에 메모 인자 추가',
      "  function judge(dataUrl, cb){",
      "  function judge(dataUrl, cb, note){")
patch('judge 호출부에 메모 넘기기',
      "    SUGAI.judge(url, function(ai){",
      "    SUGAI.judge(url, function(ai){")

# ═══════════════ 8. SUGAI 확장 모듈 ═══════════════
EXT = r'''
  /* ══════════════════════════════════════════════════════════════
     v45 확장 : 학습 · 자동분류 · 새 장소 묶기 · 메모 힌트
     ══════════════════════════════════════════════════════════════ */

  var LEARN_KEY = 'aiLearned';
  var LEARN_MAX = 400;              // localStorage 용량을 고려한 상한
  var LEARNED = [];                 // [{code, q:'base64 int8', n, ts}]
  var loadedLearn = false;

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
        try{ REF.push(b64ToVec(LEARNED[i].q)); CODES.push(LEARNED[i].code); }catch(e){}
      }
    }
  }
  function saveLearned(){
    try{ localStorage.setItem(LEARN_KEY, JSON.stringify(LEARNED)); return true; }
    catch(e){
      /* 용량이 꽉 차면 오래된 것부터 버린다 */
      while(LEARNED.length > 40){
        LEARNED.splice(0, 20);
        try{ localStorage.setItem(LEARN_KEY, JSON.stringify(LEARNED)); return true; }catch(e2){}
      }
      return false;
    }
  }

  /* 사진 한 장의 특징벡터 뽑기 (모델 준비 포함) */
  function vecOf(dataUrl){
    return ensure().then(function(){
      return new Promise(function(res, rej){
        var im = new Image();
        im.onload = function(){
          try{
            var t = net.infer(prep(im), true);
            t.data().then(function(v){
              t.dispose();
              var n = 0, i;
              for(i=0;i<v.length;i++) n += v[i]*v[i];
              n = Math.sqrt(n) || 1;
              var o = new Float32Array(v.length);
              for(i=0;i<v.length;i++) o[i] = v[i]/n;
              res(o);
            })['catch'](rej);
          }catch(e){ rej(e); }
        };
        im.onerror = function(){ rej('image'); };
        im.src = dataUrl;
      });
    });
  }

  /* ── 학습 : 이 사진이 이 위치라는 것을 AI에게 가르친다 ──
     앱에 사진을 넣거나 제보를 승인할 때 자동으로 불린다.
     결과는 브라우저에 저장되어 다음에 앱을 열어도 유지된다. */
  function learn(code, dataUrl, name){
    if(!code || !dataUrl) return Promise.resolve(false);
    loadLearned();
    return vecOf(dataUrl).then(function(v){
      if(LEARNED.length >= LEARN_MAX){ LEARNED.shift(); REF.shift(); CODES.shift(); }
      var rec = {code:code, q:i8ToB64(v), n:name||'', ts:Date.now()};
      LEARNED.push(rec);
      REF.push(v); CODES.push(code);
      saveLearned();
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

  /* ── 분류 : 등록용 (판정 문구 없이 순위만) ── */
  function classify(dataUrl){
    loadLearned();
    return vecOf(dataUrl).then(function(v){
      var rk = rank(v);
      return { vec:v, top:rk.slice(0,3), sim:rk[0].sim, code:rk[0].code,
               margin: rk[0].sim - (rk[1] ? rk[1].sim : 0) };
    });
  }

  /* ── 새 장소 묶기 ──────────────────────────────────────────────
     기존 위치와 안 닮은(=처음 보는) 사진들끼리 서로 비교해서,
     서로 닮은 것들을 한 묶음으로 만든다. 옥상 사진 5장을 넣으면
     "이 5장은 같은 곳"까지는 AI가 알아낸다. 그 장소의 '이름'만
     사람이 한 번 정해주면 그때부터 AI가 그 이름으로 인식한다. */
  var GROUP_TH = 0.72;
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

  /* 힌트를 판정에 반영 : 후보 안에 있으면 1순위로 올린다 */
  function applyHint(res, note){
    var hint = noteCode(note);
    if(!hint) return res;
    res.noteCode = hint;
    if(!res.top) return res;
    var idx = -1;
    for(var i=0;i<res.top.length;i++) if(res.top[i].code === hint) idx = i;
    if(idx === 0){
      res.noteAgree = true;                       // 사진과 메모가 일치 → 확신
      if(res.verdict === 'uncertain' && res.sim >= TH.RELEVANT) res.verdict = 'match';
    }else if(idx > 0){
      res.noteAgree = true;                       // 후보 안에 있음 → 그걸로 승격
      var pick = res.top.splice(idx,1)[0];
      res.top.unshift(pick);
      res.code = pick.code; res.sim = pick.sim;
      if(res.verdict === 'uncertain') res.verdict = 'match';
    }else{
      res.noteAgree = false;                      // 사진과 메모가 다름 → 관리자 판단
    }
    return res;
  }
'''

# SUGAI 내부에 확장 코드 삽입 (반환문 앞)
patch('SUGAI 확장 코드 삽입',
      "  /* ── 콘솔 진단 : SUGAI.tune() 후 사진을 고르면 수치가 표로 출력된다 ── */",
      EXT + "\n  /* ── 콘솔 진단 : SUGAI.tune() 후 사진을 고르면 수치가 표로 출력된다 ── */")

# judge 내부에서 메모 힌트 적용 + 학습분 포함
patch('judge에 학습분·메모힌트 반영',
"""      if(!loadVectors()){ res.verdict='skipped'; res.why='novec'; cb(res); return; }""",
"""      loadLearned();
      if(!REF){ res.verdict='skipped'; res.why='novec'; cb(res); return; }""")

patch('judge 결과에 메모 힌트 적용',
"""          if(res.sim < TH.RELEVANT)      res.verdict = 'irrelevant';
          else if(res.sim >= TH.SAME)    res.verdict = 'same';
          else if(res.sim >= TH.MATCH && res.margin >= TH.MARGIN) res.verdict = 'match';
          else                           res.verdict = 'uncertain';
          cb(res);""",
"""          if(res.sim < TH.RELEVANT)      res.verdict = 'irrelevant';
          else if(res.sim >= TH.SAME)    res.verdict = 'same';
          else if(res.sim >= TH.MATCH && res.margin >= TH.MARGIN) res.verdict = 'match';
          else                           res.verdict = 'uncertain';
          applyHint(res, note);                    // 제보 메모를 힌트로 반영
          cb(res);""")

# 반환 객체 확장
patch('SUGAI 반환 확장',
"""  return { judge:judge, warmup:warmup, showCard:showCard, rejectMsg:rejectMsg,
           adminBadge:adminBadge, autoCode:autoCode, pick:pick, tune:tune,
           codeLabel:codeLabel, TH:TH,
           get ready(){ return !!net; } };""",
"""  return { judge:judge, warmup:warmup, showCard:showCard, rejectMsg:rejectMsg,
           adminBadge:adminBadge, autoCode:autoCode, pick:pick, tune:tune,
           codeLabel:codeLabel, TH:TH,
           learn:learn, learnStats:learnStats, forgetAll:forgetAll,
           classify:classify, cluster:cluster, noteCode:noteCode, vecOf:vecOf,
           ensure:ensure,
           get ready(){ return !!net; } };""")

# 관리자 배지에 메모 힌트 표시
patch('관리자 배지에 메모 일치 표시',
"""    if(s.qr) h += '<span class="num qr">⛶ '+s.qr+' QR 스캔 후 제보</span>';""",
"""    if(s.qr) h += '<span class="num qr">⛶ '+s.qr+' QR 스캔 후 제보</span>';
    if(ai.noteCode){
      h += '<span class="num hint">📝 메모 : '+ai.noteCode +
           (ai.noteAgree ? ' (사진과 일치)' : ' (사진과 다름)')+'</span>';
    }""")

# ═══════════════ 9. 사진 등록 화면의 AI 도구 함수들 ═══════════════
TOOLS = r'''
/* ══════════════════════════════════════════════════════════════════
   사진 일괄 등록 AI 도우미 (v45)

   파일 이름에 호실번호가 없어도, 사진을 보고 위치를 찾아준다.
   · 이미 등록된 장소와 충분히 닮으면        → 위치 자동 배정
   · 조금 닮았으면                          → 추천만 표시 (사람이 확인)
   · 어디와도 안 닮았으면                    → 처음 보는 장소로 판단하고
                                             같은 장소끼리 묶어서 제안
   ══════════════════════════════════════════════════════════════════ */
var PH_NEW_GROUPS = [];        // [{idxs:[PH_STAGE 인덱스], code:''}]

function phAiSay(msg){
  var el = document.getElementById('phAiProg');
  if(el) el.textContent = msg || '';
}

function phAiSort(){
  if(typeof SUGAI === 'undefined'){ phAiSay('AI를 쓸 수 없습니다.'); return; }
  var targets = [];
  PH_STAGE.forEach(function(x, i){ if(!x.code) targets.push(i); });
  if(!targets.length){ phAiSay('위치가 비어 있는 사진이 없습니다.'); return; }

  var btn = document.getElementById('phAiBtn');
  if(btn){ btn.disabled = true; }
  phAiSay('AI를 준비하는 중…');

  SUGAI.ensure().then(function(){
    var vecs = {}, k = 0, autoN = 0, recN = 0, newIdx = [];

    (function step(){
      if(k >= targets.length){ finish(); return; }
      var i = targets[k++];
      phAiSay('사진을 보는 중…  ' + k + ' / ' + targets.length);
      SUGAI.classify(PH_STAGE[i].u).then(function(r){
        vecs[i] = r.vec;
        var it = PH_STAGE[i];
        if(r.sim >= SUGAI.TH.MATCH && r.margin >= SUGAI.TH.MARGIN){
          it.code = r.code; it.auto = true;
          it.ai = {kind:'auto', code:r.code, sim:r.sim};
          autoN++;
        }else if(r.sim >= SUGAI.TH.RELEVANT){
          it.ai = {kind:'weak', code:r.code, sim:r.sim};
          recN++;
        }else{
          it.ai = {kind:'new', code:null, sim:r.sim, group:null};
          newIdx.push(i);
        }
        setTimeout(step, 0);
      })['catch'](function(){ setTimeout(step, 0); });
    })();

    function finish(){
      /* 처음 보는 장소들끼리 묶기 */
      PH_NEW_GROUPS = [];
      if(newIdx.length){
        var groups = SUGAI.cluster(newIdx.map(function(i){ return vecs[i]; }));
        groups.forEach(function(g, gi){
          var idxs = g.map(function(p){ return newIdx[p]; });
          idxs.forEach(function(i){ PH_STAGE[i].ai.group = gi; });
          PH_NEW_GROUPS.push({idxs:idxs, code:''});
        });
      }
      if(btn) btn.disabled = false;
      phAiSay('자동 배정 ' + autoN + '장 · 추천 ' + recN + '장 · 처음 보는 장소 '
              + newIdx.length + '장' + (PH_NEW_GROUPS.length ? ' (' + PH_NEW_GROUPS.length + '묶음)' : ''));
      phSortRender();
    }
  })['catch'](function(){
    if(btn) btn.disabled = false;
    phAiSay('AI 모델을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');
  });
}

function phAiClear(){
  PH_STAGE.forEach(function(x){
    if(x.ai && x.ai.kind === 'auto' && x.auto) x.code = '';
    delete x.ai;
  });
  PH_NEW_GROUPS = [];
  phAiSay('');
  phSortRender();
}

/* 처음 보는 장소 묶음을 화면에 그린다 */
function phNewGroupsRender(){
  var box = document.getElementById('phNewGroups');
  if(!box) return;
  if(!PH_NEW_GROUPS.length){ box.innerHTML = ''; return; }
  var h = '';
  PH_NEW_GROUPS.forEach(function(g, gi){
    var alive = g.idxs.filter(function(i){ return PH_STAGE[i] && !PH_STAGE[i].code; });
    if(!alive.length) return;
    h += '<div class="ngCard">' +
         '<div class="ngHd">🆕 처음 보는 장소 ' + (gi+1) + ' — 사진 ' + alive.length + '장</div>' +
         '<div class="ngThumbs">';
    alive.slice(0,8).forEach(function(i){ h += '<img src="'+PH_STAGE[i].u+'" alt="">'; });
    h += '</div><div class="ngRow">' +
         '<input type="text" id="ngCode_'+gi+'" placeholder="이 장소 이름 (예: 옥상, RF, 13210)">' +
         '<button onclick="phNewGroupApply('+gi+')">이 묶음에 적용</button>' +
         '</div>' +
         '<div class="ngTip">AI가 이 사진들을 같은 장소로 봤지만, 앱에 등록된 어떤 곳과도 다릅니다.<br>' +
         '이름을 한 번만 정해주면 다음부터 AI가 이 장소를 알아봅니다.<br>' +
         '<b>한글 이름도 됩니다</b> — 「옥상」처럼 적어두면 제보 메모에 "옥상"이라고 쓴 것도 AI가 알아봅니다.</div>' +
         '</div>';
  });
  box.innerHTML = h;
}

function phNewGroupApply(gi){
  var g = PH_NEW_GROUPS[gi];
  if(!g) return;
  var el = document.getElementById('ngCode_'+gi);
  var code = el ? el.value.trim().toUpperCase() : '';
  if(!code){ alert('이 장소의 코드를 입력해 주세요. (예: RF)'); return; }
  g.idxs.forEach(function(i){
    if(PH_STAGE[i] && !PH_STAGE[i].code){
      PH_STAGE[i].code = code;
      PH_STAGE[i].auto = false;
      if(PH_STAGE[i].ai) PH_STAGE[i].ai = {kind:'auto', code:code, sim:1};
    }
  });
  g.code = code;
  phAiSay('처음 보는 장소 ' + (gi+1) + ' → ' + code + ' 로 지정했습니다. 「넣기」를 누르면 AI가 배웁니다.');
  phSortRender();
}

/* 학습 현황 표시 (사진 등록 화면) */
function phAiLearnRender(){
  var el = document.getElementById('phAiLearn');
  if(!el || typeof SUGAI === 'undefined') return;
  var st = SUGAI.learnStats();
  if(!st.n){ el.innerHTML = ''; return; }
  var codes = Object.keys(st.codes).sort();
  el.innerHTML = '🤖 AI가 추가로 배운 사진 <b>' + st.n + '장</b> · 위치 ' + codes.length + '곳 (' +
                 codes.slice(0,8).join(', ') + (codes.length>8 ? ' 외' : '') + ')' +
                 '<br><span style="cursor:pointer;text-decoration:underline" onclick="phAiForget()">배운 것 지우기</span>';
}
function phAiForget(){
  if(!confirm('AI가 추가로 배운 내용을 모두 지울까요?\n(앱에 원래 들어있던 사진 학습은 그대로 남습니다)')) return;
  SUGAI.forgetAll();
  phAiLearnRender();
}
'''
patch('사진 등록 AI 도우미 함수',
      "/* ══════════ 넣을 위치 확인 / 직접 배치 ══════════",
      TOOLS + "\n/* ══════════ 넣을 위치 확인 / 직접 배치 ══════════")

# phSortRender 안에서 새 장소 묶음도 그리기
patch('phSortRender에 묶음 렌더 연결',
      "  box.innerHTML = '';\n  if(!st.tot){",
      "  if(typeof phNewGroupsRender === 'function') phNewGroupsRender();\n  box.innerHTML = '';\n  if(!st.tot){")

# 사진 등록 화면 진입 시 학습 현황 갱신
patch('sph 진입 시 학습현황 갱신',
      "  if(id==='sph'){ phRender(); if(typeof sugBadgeSync==='function') sugBadgeSync(); }",
      "  if(id==='sph'){ phRender(); if(typeof sugBadgeSync==='function') sugBadgeSync();\n"
      "                  if(typeof phAiLearnRender==='function') phAiLearnRender(); }")


# ═══════════════ 10. 내보내기에 학습 내용 포함 ═══════════════
LEARN_EXPORT = (
"  var html = PRISTINE_HTML.replace(rx, '');\n"
"  /* v45 : AI가 배운 내용도 함께 담는다.\n"
"     이렇게 해야 내보낸 파일을 다른 사람이 열어도 AI가 새 위치를 그대로 안다. */\n"
"  try{\n"
"    var lj = localStorage.getItem('aiLearned');\n"
"    if(lj && lj !== '[]'){\n"
"      var ltag = '<scr' + 'ipt id=\"EMBEDDED_AILEARN\" type=\"application/json\">' +\n"
"                 lj.replace(/</g, " + repr('\\u003c') + ") + '</scr' + 'ipt>';\n"
"      var lrx = new RegExp('<scr' + 'ipt id=\"EMBEDDED_AILEARN\"" + repr('[\\s\\S]')[1:-1] + "*?<" + repr('\\/')[1:-1] + "scr' + 'ipt>', 'i');\n"
"      html = html.replace(lrx, '');\n"
"      tag = tag + '" + repr('\n')[1:-1] + "' + ltag;\n"
"    }\n"
"  }catch(e){}"
)
patch('사진 담아서 저장에 AI 학습 포함',
      "  var html = PRISTINE_HTML.replace(rx, '');",
      LEARN_EXPORT)

io.open(DST, 'w', encoding='utf-8').write(s)
print('')
print('원본 : %s bytes' % orig)
print('결과 : %s bytes (+%s)' % (len(s), len(s)-orig))
print('적용 : %d개 패치' % len(done))
print('출력 : %s' % DST)
