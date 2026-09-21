# -*- coding: utf-8 -*-
"""v56 → v57 ① : 번호판 읽기 대폭 강화

  지금까지 : 줄인 사진(1280px) 전체와 4조각을 통째로 OCR → 문 사진 68장 중 25장(37%)만 읽음
  바꾼 뒤   : ① 제보 사진을 OCR용으로만 2400px 로 따로 준비 (번호판 픽셀을 살린다)
              ② 진한 파란 표지판을 색으로 찾아 번호판 영역만 잘라낸다
              ③ 잘라낸 곳을 크게 확대하고 흑백 대비를 극대화, 흰 글씨/검은 글씨 두 가지로 읽는다
              ④ 못 찾으면 예전 방식(전체 + 4조각)으로 넘어간다
  번호판은 두 종류지만(흰 바탕 검은 숫자 / 파란 바탕 흰 숫자) 둘 다 진한 파란 사각형이 있고,
  복도의 나머지는 전부 베이지·회색·갈색이라 이 색이 아주 좋은 단서가 된다.
"""
import io, sys

SRC = '/home/claude/gunsan_b3nav_AILIB_v56.html'
DST = '/home/claude/gunsan_b3nav_OCR2_v57.html'

s = io.open(SRC, encoding='utf-8').read()
n_ok = 0

def rep(old, new, label, count=1):
    global s, n_ok
    n = s.count(old)
    if n != count:
        print('  [실패] %s : 앵커 %d개 (기대 %d)' % (label, n, count)); sys.exit(1)
    s = s.replace(old, new)
    n_ok += 1
    print('  [OK]', label)

# ── 1) PHFIX.shrink 에 '최대 픽셀'을 넘길 수 있게 (OCR용 큰 사본을 만들기 위해)
rep(r'''  function shrink(blob, cb){
    lastError = '';
    if(!blob || !blob.size){ lastError='empty'; cb(null); return; }''',
r'''  function shrink(blob, cb, maxdim, quality){
    lastError = '';
    if(!blob || !blob.size){ lastError='empty'; cb(null); return; }''',
'shrink 인자')

rep(r'''      var sc = Math.min(1, PH_MAXDIM / Math.max(w, h));''',
r'''      var sc = Math.min(1, (maxdim || PH_MAXDIM) / Math.max(w, h));''',
'shrink 최대 픽셀')

rep(r'''        var out = cv.toDataURL('image/jpeg', PH_Q);''',
r'''        var out = cv.toDataURL('image/jpeg', quality || PH_Q);''',
'shrink 품질')

rep(r'''function phShrink(blob, cb){ PHFIX.shrink(blob, cb); }''',
r'''function phShrink(blob, cb, maxdim, quality){ PHFIX.shrink(blob, cb, maxdim, quality); }''',
'phShrink 인자')

# ── 2) 번호판 찾기 · 자르기 · 다듬기 (SUGAI 안, ocrTiles 앞에 넣는다)
rep(r'''  /* 사진을 4조각(가로세로 55%씩, 45% 간격)으로 나눠 2배 확대 — 멀리 있는 작은 번호판용 */
  function ocrTiles(img){''',
r'''  /* ── v57 : 번호판 찾기 ────────────────────────────────────────
     공대 3호관의 호실 표지판은 두 종류다.
       ㉠ 복도로 튀어나온 표지판 — 흰 바탕에 검은 숫자 + 진한 파란 몸통에 흰 방 이름
       ㉡ 문에 붙인 종이 — 파란 바탕에 흰 숫자
     둘 다 '진한 파란 사각형'을 갖고 있고, 복도의 나머지(베이지·회색·갈색)에는 이 색이 없다.
     그래서 파란 덩어리를 찾아 그 둘레를 넉넉히 잘라내면 번호가 그 안에 들어온다.
     찾은 곳만 크게 확대해 읽으므로, 사진 전체를 훑던 예전 방식보다 훨씬 잘 읽힌다.       */
  var PLATE = { W:512, MINPX:60, MAXAREA:0.10, MINFILL:0.35, ARLO:0.25, ARHI:4.0, MAX:3 };

  function plateBoxes(img){
    var k = Math.min(1, PLATE.W / Math.max(img.width || 1, img.height || 1));
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
      if(cnt < PLATE.MINPX || area > PLATE.MAXAREA*n) continue;
      if(cnt/area < PLATE.MINFILL) continue;
      if(ar < PLATE.ARLO || ar > PLATE.ARHI) continue;
      out.push({ n:cnt, x0:x0/w, y0:y0/h, x1:(x1+1)/w, y1:(y1+1)/h });
    }
    out.sort(function(a,b){ return b.n - a.n; });
    return out.slice(0, PLATE.MAX);
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
  function ocrTiles(img){''',
'번호판 찾기·자르기·다듬기')

# ── 3) ocrRun : 번호판 먼저, 못 찾으면 예전 방식
rep(r'''      }).then(function(im){
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
      });''',
r'''      }).then(function(im){
        var words = [], plateWords = [], usedPlate = false;
        /* ① 번호판으로 보이는 곳부터 — 찾은 곳만 크게 확대해 읽는다 (흰 글씨/검은 글씨 둘 다) */
        var boxes = [];
        try{ boxes = plateBoxes(im); }catch(e){ boxes = []; }
        var shots = [], bi, cvv;
        for(bi=0; bi<boxes.length; bi++){
          cvv = plateCrop(im, boxes[bi]);
          if(!cvv) continue;
          shots.push(ocrPrep(cvv, false));
          shots.push(ocrPrep(cvv, true));
        }
        var si = 0;
        function plateStep(){
          if(si >= shots.length) return null;
          return ocrWords(w, shots[si++], 11).then(function(ws){
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
          /* ② 번호판을 못 찾았거나 못 읽었으면 예전 방식(사진 전체 + 4조각) */
          return ocrWords(w, im, 11).then(function(ws){
            words = words.concat(ws);
            var first = ocrParse(words);
            if(first && first.code && first.conf >= 80) return first;
            var tiles = [im].concat(ocrTiles(im)), i = 0;
            function next(){
              if(i >= tiles.length){
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
      });''',
'ocrRun 번호판 우선')

rep(r'''           ocrEnsure:ocrEnsure, ocrRun:ocrRun, ocrParse:ocrParse, applyOcr:applyOcr, OCR:OCR,''',
r'''           ocrEnsure:ocrEnsure, ocrRun:ocrRun, ocrParse:ocrParse, applyOcr:applyOcr, OCR:OCR,
           plateBoxes:plateBoxes, plateCrop:plateCrop, ocrPrep:ocrPrep, ocrWords:ocrWords,
           plateDebug:function(img){ var bs = plateBoxes(img), o = [], i, c;
             for(i=0;i<bs.length;i++){ c = plateCrop(img, bs[i]); if(!c) continue;
               o.push(ocrPrep(c,false).toDataURL('image/png')); o.push(ocrPrep(c,true).toDataURL('image/png')); }
             return o; },''',
'번호판 디버그 노출')

rep(r'''  var OCR = { ENABLED:true, TIMEOUT:25000, MINCONF:40 };''',
r'''  var OCR = { ENABLED:true, TIMEOUT:32000, MINCONF:40 };''',
'OCR 제한시간')

# ── 4) 번호판에서 읽은 번호는 더 믿는다
rep(r'''    var trust = ocr.conf >= 60 || (ocr.conf >= 35 && !!ocr.code && !!knownCodes()[ocr.code]);''',
r'''    /* v57 : 번호판 영역을 콕 집어 읽은 번호는 우연히 맞을 가능성이 거의 없다 */
    var trust = ocr.conf >= 60 || (ocr.conf >= 35 && !!ocr.code && !!knownCodes()[ocr.code])
                || (ocr.fromPlate && ocr.conf >= 30 && !!ocr.code && !!knownCodes()[ocr.code]);''',
'번호판 신뢰도')

# ── 5) judge 가 OCR용 큰 사진을 따로 받도록
rep(r'''  function judge(dataUrl, cb, note){''',
r'''  function judge(dataUrl, cb, note, ocrUrl){''',
'judge 인자')

rep(r'''      var ocrP = ocrRun(dataUrl);''',
r'''      var ocrP = ocrRun(ocrUrl || dataUrl);   /* v57 : 번호판 픽셀을 살린 큰 사본으로 읽는다 */''',
'judge OCR 사본')

# ── 6) 제보 화면 : OCR용 큰 사본을 만들어 넘긴다
rep(r'''    if(stat){ stat.style.color = '#7C8AA0'; stat.textContent = (LANG==='ko') ? 'AI가 사진을 확인하는 중…' : 'AI is checking the photo…'; }
    SUGAI.judge(url, function(ai){''',
r'''    if(stat){ stat.style.color = '#7C8AA0'; stat.textContent = (LANG==='ko') ? 'AI가 사진을 확인하는 중…' : 'AI is checking the photo…'; }
    /* v57 : 번호판을 읽으려면 사진이 커야 한다. 저장은 1280px 그대로 두고,
       번호판 읽기에만 쓸 2400px 사본을 따로 만들어 넘긴다 (실패하면 그냥 원래 것으로 읽는다). */
    phShrink(pickedFile, function(big){
      sugJudgeWith(url, big, noteVal, ai2Cb);
    }, 2400, 0.85);

    function ai2Cb(ai){''',
'제보 : 큰 사본 준비')

rep(r'''      sugFinishSubmit(url, noteVal, ai, stat, noteEl);
    }, noteVal);    /* v53 : 메모를 힌트로 넘긴다 — 지금까지 이 인자가 빠져 있어서 메모 힌트가 실제로는 안 쓰였다 */
  });
}''',
r'''      sugFinishSubmit(url, noteVal, ai, stat, noteEl);
    }
  });
}
/* 메모를 힌트로 넘기고(v53), 번호판은 큰 사본으로 읽는다(v57) */
function sugJudgeWith(url, big, noteVal, cb){
  SUGAI.judge(url, cb, noteVal, big || null);
}''',
'제보 : 판정 호출 분리')

# ── 7) 앱이 아는 호실 번호를 우선한다 (읽힌 후보가 여럿일 때)
rep(r"""      if(cand){
        cands.push({code:cand, conf:Math.round(c)});
        if(!best || c > best.c) best = {code:cand, c:c, raw:t};
      }""",
r"""      if(cand){
        /* v57 : 앱에 실제로 있는 호실을 우선 고른다 (13399 처럼 없는 번호는 오독).
           다만 '얼마나 확실한가' 값 자체는 부풀리지 않는다 — 부풀리면 잘못 읽은 번호까지 믿게 된다. */
        var score = known[cand] ? c*1.35 : c;
        cands.push({code:cand, conf:Math.round(Math.min(100, c)), known:!!known[cand]});
        if(!best || score > best.s) best = {code:cand, c:Math.min(100, c), s:score, raw:t};
      }""",
'아는 번호 우선')

io.open(DST, 'w', encoding='utf-8').write(s)
print('\n%d개 패치 적용 → %s (%d bytes)' % (n_ok, DST, len(s.encode('utf-8'))))
