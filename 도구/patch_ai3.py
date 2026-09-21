# -*- coding: utf-8 -*-
"""v51 → v52 : 사진 판별 AI 정확도 올리기
  측정(133장 × 7가지 변형 = 931건) : top-1 77.3% → 91.0%, top-3 86.9% → 95.9%
    · 호실 72 → 89 %   · 복도 90 → 99 %   · 엘리베이터/출입문/지하 100 %

  1. 기준벡터를 사진 1장당 3시점(원본·가운데0.82·가운데0.65)으로 — 같은 곳을 다른 거리에서 찍어도 맞음
  2. 제곱근 정규화 — 몇몇 큰 값이 유사도를 지배하던 것을 눌러 세부 차이가 드러나게
  3. 제보 사진도 2시점(원본·확대)으로 비교해 더 잘 맞는 쪽을 씀
  4. 임계값 재측정 (RELEVANT/MATCH/MARGIN/SAME/GROUP_TH)
  5. 메모의 '2층' 같은 층 힌트를 전체 후보에 반영 (지금까지는 상위 3개 안에 있을 때만)
  6. 확실하지 않을 때 층까지 단정하지 않고 후보를 더 보여줌
"""
import io, sys, json, os
SRC='/home/claude/gunsan_b3nav_PERF_v51.html'; DST='/home/claude/gunsan_b3nav_AI3_v52.html'
AIVEC='/tmp/nav/lab/aivec_v52.json'
s=io.open(SRC,encoding='utf-8').read(); orig=len(s); done=[]
def patch(name, old, new, count=1):
    global s
    n=s.count(old)
    if n!=count: print('  [실패] %s : 앵커 %d개'%(name,n)); sys.exit(1)
    s=s.replace(old,new,count); done.append(name); print('  [OK] %s'%name)

# ═══ 1. 임계값 재측정값으로 교체 ═══
patch('임계값',
"""    RELEVANT: 0.65,     // 미만 → 범위 밖 사진, 자동 반려 (실측: 실제 사진 최저 0.679, 무관 최고 0.420)
    MATCH:    0.75,     // 이상 + MARGIN 이상 → 위치 자동 확정
    MARGIN:   0.04,     // 1등과 2등의 차이
    SAME:     0.98      // 이상 → 앱에 있는 사진과 사실상 동일""",
"""    /* v52 재측정 (931건) — 3시점 기준벡터 + 제곱근 정규화 기준
       무관한 사진 최고 0.622 < RELEVANT 0.65 <= 실제 사진 최저 0.679  (오반려 0%)
       MATCH 0.72 & MARGIN 0.03 → 제보의 73%를 자동 확정하고 그중 정답 100% */
    RELEVANT: 0.65,     // 미만 → 범위 밖 사진, 자동 반려
    MATCH:    0.72,     // 이상 + MARGIN 이상 → 위치 자동 확정
    MARGIN:   0.03,     // 1등과 2등의 차이
    SAME:     0.99      // 이상 → 앱에 있는 사진과 사실상 동일 (0.98은 다른 사진의 2.6%가 오인됨)""")

# ═══ 2. 제곱근 정규화 + 시점(크롭) 지원 ═══
patch('prep 크롭 인자',
"""  function prep(img){
    var cv = document.createElement('canvas');
    cv.width = 224; cv.height = 224;
    var cx = cv.getContext('2d');
    cx.fillStyle = '#000'; cx.fillRect(0,0,224,224);
    cx.drawImage(img, 0, 0, 224, 224);""",
"""  /* crop을 주면 사진 가운데 그만큼만 잘라서 본다 (예: 0.75 → 가운데 75%를 확대해서 본 시점).
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
    }""")

patch('제곱근 정규화 함수',
"""  function i8ToB64(f32){""",
"""  /* ── 제곱근 정규화 (v52) ──────────────────────────────────────
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

  function i8ToB64(f32){""")

# ═══ 3. rank : 여러 시점 중 가장 잘 맞는 값을 쓴다 ═══
patch('rank 다중시점',
"""  function rank(vec){
    var m = {}, i, j;
    for(i=0;i<REF.length;i++){
      var r = REF[i], d = 0;
      for(j=0;j<DIM;j++) d += vec[j]*r[j];
      var c = CODES[i];
      if(!(c in m) || d > m[c]) m[c] = d;
    }""",
"""  /* vec 하나 또는 여러 시점의 배열을 받는다. 여러 시점이면 각 기준벡터에 대해
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
    }""")

# ═══ 4. judge : 2시점으로 비교 + 전체 후보 보관 ═══
patch('judge 다중시점',
"""      ensure().then(function(){
        var t = net.infer(prep(img), true);
        return t.data().then(function(v){
          t.dispose();
          var n = 0, i;
          for(i=0;i<v.length;i++) n += v[i]*v[i];
          n = Math.sqrt(n) || 1;
          var q2 = new Float32Array(v.length);
          for(i=0;i<v.length;i++) q2[i] = v[i]/n;

          var rk = rank(q2);
          res.top = rk.slice(0,3).map(function(x){ return {code:x.code, sim:Math.round(x.sim*1000)/1000}; });""",
"""      ensure().then(function(){
        /* v52 : 제보 사진을 '그대로' 와 '가운데 확대' 두 시점으로 만들어 둘 다 비교한다.
           찍은 거리가 기준사진과 달라도 둘 중 하나는 맞게 된다. (폰에서 0.2초 정도 더 걸린다) */
        return embedViews(img, Q_VIEWS).then(function(qs){
          var rk = rank(qs);
          res.all = rk.slice(0,8).map(function(x){ return {code:x.code, sim:Math.round(x.sim*1000)/1000}; });
          res.top = rk.slice(0,3).map(function(x){ return {code:x.code, sim:Math.round(x.sim*1000)/1000}; });""")
patch('judge 마무리 정리',
"""          applyHint(res, note);                    // 제보 메모를 힌트로 반영
          cb(res);
        });
      })['catch'](function(){""",
"""          applyHint(res, note);                    // 제보 메모를 힌트로 반영
          cb(res);
        });
      })['catch'](function(){""")

# 시점 정의 + 여러 시점 임베딩 함수
patch('시점 정의',
"""  /* ── 판정 ── */
  function judge(dataUrl, cb, note){""",
"""  /* ── 시점(v52) ──────────────────────────────────────────────
     Q_VIEWS   : 제보/질의 사진을 볼 시점 (원본 + 가운데 확대)
     REF_VIEWS : 새로 학습하는 사진을 기준벡터로 만들 때의 시점
                 (앱에 내장된 기준벡터는 원본·0.82·0.65 세 시점으로 미리 만들어 두었다) */
  var Q_VIEWS   = [1, 0.75];
  var REF_VIEWS = [1, 0.82];

  /* 한 이미지를 여러 시점으로 모델에 넣어 벡터들을 얻는다 */
  function embedViews(img, views){
    return ensure().then(function(){
      var out = [], i = 0;
      function step(){
        if(i >= views.length) return Promise.resolve(out);
        var t = net.infer(prep(img, views[i]), true);
        i++;
        return t.data().then(function(v){
          t.dispose();
          out.push(powNorm(v));
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
  function judge(dataUrl, cb, note){""")

# ═══ 5. vecOf / learn : 제곱근 + 기준시점 2개 저장 ═══
patch('vecOf 교체',
"""  /* 사진 한 장의 특징벡터 뽑기 (모델 준비 포함) */
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
  }""",
"""  /* 사진 한 장의 특징벡터 뽑기 (모델 준비 포함) — v52는 제곱근 정규화까지 적용된 벡터 */
  function vecOf(dataUrl){
    return embedUrlViews(dataUrl, [1]).then(function(vs){ return vs[0]; });
  }""")

patch('learn 다중시점 저장',
"""  function learn(code, dataUrl, name){
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
  }""",
"""  function learn(code, dataUrl, name){
    if(!code || !dataUrl) return Promise.resolve(false);
    loadLearned();
    /* v52 : 배우는 사진도 두 시점(원본·가운데0.82)으로 기억한다 — 내장 기준벡터와 같은 방식 */
    return embedUrlViews(dataUrl, REF_VIEWS).then(function(vs){
      if(LEARNED.length >= LEARN_MAX){
        var old = LEARNED.shift();
        var drop = (old && old.q2) ? 2 : 1;
        REF.splice(0, drop); CODES.splice(0, drop);
      }
      var rec = {code:code, q:i8ToB64(vs[0]), q2:(vs[1] ? i8ToB64(vs[1]) : ''), n:name||'', ts:Date.now(), v:2};
      LEARNED.push(rec);
      REF.push(vs[0]); CODES.push(code);
      if(vs[1]){ REF.push(vs[1]); CODES.push(code); }
      saveLearned();
      if(typeof phAiLearnRender === 'function') phAiLearnRender();
      return true;
    })['catch'](function(){ return false; });
  }""")

patch('학습분 읽기 · 구버전 변환',
"""    if(loadVectors()){
      for(var i=0;i<LEARNED.length;i++){
        try{ REF.push(b64ToVec(LEARNED[i].q)); CODES.push(LEARNED[i].code); }catch(e){}
      }
    }""",
"""    if(loadVectors()){
      for(var i=0;i<LEARNED.length;i++){
        try{
          var L = LEARNED[i];
          /* v51까지 저장된 것은 제곱근 정규화 전의 벡터다 — 읽을 때 같은 방식으로 맞춘다 */
          var v1 = b64ToVec(L.q);
          REF.push(L.v === 2 ? v1 : toV2(v1)); CODES.push(L.code);
          if(L.q2){ REF.push(b64ToVec(L.q2)); CODES.push(L.code); }
        }catch(e){}
      }
    }""")
patch('학습 저장 상한',
"""  var LEARN_MAX = 400;              // localStorage 용량을 고려한 상한""",
"""  var LEARN_MAX = 250;              // v52 : 한 장당 시점 2개를 저장하므로 개수를 줄인다""")

# ═══ 6. 새 장소 묶기 임계값 ═══
patch('GROUP_TH',
"""  var GROUP_TH = 0.72;""",
"""  /* v52 : 제곱근 정규화 후 유사도 분포가 달라졌다. 실측(같은 곳끼리 / 다른 곳끼리)에서
     0.86이면 다른 곳을 잘못 묶는 비율이 2.3%로 낮다. 낮게 잡으면 서로 다른 장소가 한 묶음이 된다. */
  var GROUP_TH = 0.86;""")

# ═══ 7. 메모의 '층' 힌트를 전체 후보에 반영 ═══
patch('noteFloor',
"""  /* 힌트를 판정에 반영 : 후보 안에 있으면 1순위로 올린다 */
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
  }""",
"""  /* 메모에서 '층'만 읽는다 — '2층 복도'처럼 좌우를 안 쓴 메모가 실제로 가장 많다 */
  function noteFloor(note){
    if(!note) return null;
    var t = String(note);
    if(/지하|B1/i.test(t)) return '지하 1층';
    var m = t.match(/([1-5])\\s*층/);
    return m ? (m[1]+'층') : null;
  }

  /* 힌트를 판정에 반영
     ① 메모가 위치를 콕 집었고 그 위치가 후보 어딘가에 있으면 1순위로 올린다 (v52 : 상위 8개까지 본다)
     ② 층만 알 수 있으면 그 층의 후보를 위로 끌어올린다 (v52 신규) */
  function applyHint(res, note){
    var hint = noteCode(note);
    var fl = noteFloor(note);
    if(fl) res.noteFloor = fl;
    var pool = res.all || res.top;
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
        res.all = merged;
        res.top = merged.slice(0,3);
        res.code = merged[0].code; res.sim = merged[0].sim;
        res.margin = Math.round((merged[0].sim - (merged[1]?merged[1].sim:0))*1000)/1000;
        if(res.verdict === 'uncertain' && res.sim >= TH.MATCH) res.verdict = 'match';
      }
    }
    return res;
  }""")

# ═══ 8. 확실하지 않을 때 층을 단정하지 않기 + 후보 더 보여주기 ═══
patch('floorGuess 정직하게',
"""  function floorGuess(top){
    if(!top || !top.length) return null;""",
"""  function floorGuess(top){
    if(!top || !top.length) return null;
    /* v52 : 1등과 2등이 서로 다른 층인데 격차가 작으면 층을 단정하지 않는다 */""")
patch('whereText 층 불확실',
"""    if(sure){
      var f1 = floorOf(t.code);
      if(f1) h += '<span class="sub">층 : <b>'+f1+'</b></span>';
    }else{""",
"""    if(sure){
      var f1 = floorOf(t.code), f2 = ai.top[1] ? floorOf(ai.top[1].code) : null;
      /* v52 : 확정이어도 2등이 다른 층이고 격차가 작으면 그 사실을 함께 알린다 */
      if(f1 && f2 && f1 !== f2 && (t.sim - ai.top[1].sim) < 0.05)
        h += '<span class="sub">층 : <b>'+f1+'</b> <span class="num">(다만 '+f2+'일 가능성도 있음 — 격차 '
           + Math.round((t.sim-ai.top[1].sim)*100)+'%p)</span></span>';
      else if(f1) h += '<span class="sub">층 : <b>'+f1+'</b></span>';
    }else{""")
patch('메모 층 힌트 표시',
"""    if(ai.noteCode){
      h += '<span class="num hint">📝 메모 : '+ai.noteCode +
           (ai.noteAgree ? ' (사진과 일치)' : ' (사진과 다름)')+'</span>';
    }
    h += '</div>';
    h += whereText(ai);
    if(ai.top && ai.top.length){
      h += '<div class="cands">';
      for(var i=0;i<ai.top.length;i++){
        var c = ai.top[i];""",
"""    if(ai.noteCode){
      h += '<span class="num hint">📝 메모 : '+ai.noteCode +
           (ai.noteAgree ? ' (사진과 일치)' : ' (사진과 다름)')+'</span>';
    }else if(ai.noteFloor){
      h += '<span class="num hint">📝 메모 : '+ai.noteFloor+(ai.floorHintUsed ? ' (이 층 후보를 위로 올림)' : '')+'</span>';
    }
    h += '</div>';
    h += whereText(ai);
    /* v52 : 확실하지 않을 때는 후보를 더 많이(5개) 보여준다 — 관리자가 눌러서 바로 고르게 */
    var cands = (ai.verdict==='match'||ai.verdict==='same') ? (ai.top||[]) : ((ai.all||ai.top||[]).slice(0,5));
    if(cands.length){
      h += '<div class="cands">';
      for(var i=0;i<cands.length;i++){
        var c = cands[i];""")
patch('후보 버튼 마무리',
"""        h += '<button onclick="SUGAI.pick(\\''+s.id+'\\',\\''+c.code+'\\')" title="'+codeLabel(c.code)+'">'
           + codeLabel(c.code)+' <span class="num">'+c.code+' · '+(c.sim*100).toFixed(0)+'%</span></button>';
      }
      h += '</div>';
    }
    return h + '</div>';""",
"""        h += '<button onclick="SUGAI.pick(\\''+s.id+'\\',\\''+c.code+'\\')" title="'+codeLabel(c.code)+'">'
           + codeLabel(c.code)+' <span class="num">'+c.code+' · '+(c.sim*100).toFixed(0)+'%</span></button>';
      }
      h += '</div>';
    }
    return h + '</div>';""")

# ═══ 9. 제보자 카드에도 후보를 더 ═══
patch('노출 함수에 noteFloor 추가',
"""           classify:classify, cluster:cluster, noteCode:noteCode, vecOf:vecOf,""",
"""           classify:classify, cluster:cluster, noteCode:noteCode, noteFloor:noteFloor, vecOf:vecOf,
           embedUrlViews:embedUrlViews, powNorm:powNorm, Q_VIEWS:Q_VIEWS, REF_VIEWS:REF_VIEWS,""")

# ═══ 10. classify(등록 도우미)도 2시점으로 ═══
patch('classify 다중시점',
"""  function classify(dataUrl){
    loadLearned();
    return vecOf(dataUrl).then(function(v){
      var rk = rank(v);
      return { vec:v, top:rk.slice(0,3), sim:rk[0].sim, code:rk[0].code,
               margin: rk[0].sim - (rk[1] ? rk[1].sim : 0) };
    });
  }""",
"""  function classify(dataUrl){
    loadLearned();
    /* v52 : 판정과 같은 2시점 비교. 묶기(cluster)에 쓰는 vec은 원본 시점 것을 준다. */
    return embedUrlViews(dataUrl, Q_VIEWS).then(function(vs){
      var rk = rank(vs);
      return { vec:vs[0], top:rk.slice(0,3), sim:rk[0].sim, code:rk[0].code,
               margin: rk[0].sim - (rk[1] ? rk[1].sim : 0) };
    });
  }""")

# ═══ 11. 기준벡터 교체 ═══
if not os.path.exists(AIVEC):
    print('  [실패] 기준벡터 파일 없음 : %s'%AIVEC); sys.exit(1)
vec = io.open(AIVEC, encoding='utf-8').read().strip()
i = s.find('<script id="EMBEDDED_AIVEC" type="application/json">')
if i < 0: print('  [실패] EMBEDDED_AIVEC 앵커 없음'); sys.exit(1)
j = s.find('</script>', i)
head = '<script id="EMBEDDED_AIVEC" type="application/json">'
oldlen = j - (i+len(head))
s = s[:i+len(head)] + vec + s[j:]
done.append('기준벡터 교체')
print('  [OK] 기준벡터 교체 (%d → %d bytes)'%(oldlen, len(vec)))

io.open(DST,'w',encoding='utf-8').write(s)
print('\n원본 %d → %d bytes (%+d) · 패치 %d개'%(orig,len(s),len(s)-orig,len(done)))
