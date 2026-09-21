# v58 — 사진 위치판별 개선 적용
#   전처리 : 표지판 크롭 + 정사각 1.0 + 정사각 0.6 (자동 명암보정 제거, 종횡비 보존)
#   후처리 : 평균 빼기 + 제1주성분 제거 (제곱근 정규화 제거)
#   판정   : AI 단독 자동 확정 제거 (실측 정답률 0% 였음)
$ErrorActionPreference = 'Stop'
$SRC = 'D:\군산대\index.html'
$DST = 'D:\군산대\index_new.html'
$VEC = 'D:\군산대\생성물\aivec_new.json'

$s = [System.IO.File]::ReadAllText($SRC, [System.Text.Encoding]::UTF8)
$orig = $s.Length
$n = 0
function Swap([string]$old, [string]$new, [string]$label){
  $script:n++
  $c = ([regex]::Matches($script:s, [regex]::Escape($old))).Count
  if($c -ne 1){ throw ("[{0}] 앵커가 {1}개 (1개여야 함): {2}" -f $label, $c, $old.Substring(0,[Math]::Min(60,$old.Length))) }
  $script:s = $script:s.Replace($old, $new)
  Write-Host ("  [OK] {0}" -f $label) -ForegroundColor Green
}

# ── 1. 판정 문턱 ────────────────────────────────────────────────
Swap @'
    RELEVANT: 0.65,     // 미만 → 범위 밖 사진, 자동 반려
    MATCH:    0.72,     // 이상 + MARGIN 이상 → 위치 자동 확정
    MARGIN:   0.03,     // 1등과 2등의 차이
    SAME:     0.99      // 이상 → 앱에 있는 사진과 사실상 동일 (0.98은 다른 사진의 2.6%가 오인됨)
'@ @'
    /* v58 재측정 — 자기 사진을 후보에서 빼고 240장으로 다시 쟀다(leave-one-out).
       예전 값(RELEVANT .65 / MATCH .72)은 시험 사진이 이미 자료집에 들어 있는
       상태로 측정한 것이라 "정답 100%"가 나왔다. 사진이 자기 자신과 같다는 것을
       확인했을 뿐이다. 새로 찍은 사진으로 다시 재니 자동 확정의 정답률은 0% 였다.
       → AI 단독 자동 확정을 없앤다. MATCH 를 닿을 수 없는 값으로 둔다.
         AI 는 후보를 5개까지 제시하고, 확정은 번호판 OCR 이나 사용자가 한다.     */
    RELEVANT: 0.15,     // 미만 → 범위 밖 사진, 자동 반려 (정상 제보를 잘못 반려하지 않도록 낮게)
    MATCH:    9.99,     // 자동 확정 안 함 (실측 정답률 0%)
    MARGIN:   0.20,     // 1등과 2등의 차이 — 여유가 클수록 맞을 확률이 오른다(0.20에서 50%)
    SAME:     0.97      // 이상 → 자료집에 이미 있는 사진과 사실상 동일
'@ '판정 문턱'

# ── 2. 전처리·후처리 함수 추가 ──────────────────────────────────
Swap @'
  function vecOf(dataUrl){
'@ @'
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
'@ '전처리·후처리 함수 추가'

# ── 3. embedViews 교체 ──────────────────────────────────────────
Swap @'
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
'@ @'
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
'@ 'embedViews 교체'

# ── 4. loadVectors 에서 평균·주성분 읽기 ────────────────────────
Swap @'
      DIM = d.dim; CODES = d.codes; NAMES = d.names || [];
'@ @'
      DIM = d.dim; CODES = d.codes; NAMES = d.names || [];
      /* v58 : 평균·제1주성분 (Float32 를 base64 로 담았다) */
      try{ AIMEAN = d.mean ? b64ToF32(d.mean) : null; }catch(e){ AIMEAN = null; }
      try{ AIPC   = d.pc   ? b64ToF32(d.pc)   : null; }catch(e){ AIPC   = null; }
      try{ AIPC2  = d.pc2  ? b64ToF32(d.pc2)  : null; }catch(e){ AIPC2  = null; }
'@ 'loadVectors 평균·주성분'

# ── 5. rebuildRef — 옛 방식으로 만든 자료집 벡터는 쓰지 않는다 ──
Swap @'
    for(var i=0;i<LIB.length;i++){
      var r = LIB[i], vs = r.vecs || [];
'@ @'
    /* v58 : 전처리가 바뀌어 예전 방식으로 만든 벡터는 더 이상 맞지 않는다.
       V58_FROM 이후에 등록된 사진만 쓴다(그 사진들은 새 방식으로 만들어진다). */
    for(var i=0;i<LIB.length;i++){
      var r = LIB[i], vs = (r.ts && r.ts >= V58_FROM) ? (r.vecs || []) : [];
'@ 'rebuildRef 옛 벡터 제외'

# ── 6. loadLearned — 옛 학습분 제외 ─────────────────────────────
Swap @'
          var v1 = b64ToVec(L.q);
          REF.push(L.v === 2 ? v1 : toV2(v1)); CODES.push(L.code);
          if(L.q2){ REF.push(b64ToVec(L.q2)); CODES.push(L.code); }
'@ @'
          /* v58 : v3 이전 학습분은 옛 전처리로 만들어져 지금 기준과 섞으면 안 된다 */
          if(L.v !== 3) continue;
          REF.push(b64ToVec(L.q)); CODES.push(L.code);
          if(L.q2){ REF.push(b64ToVec(L.q2)); CODES.push(L.code); }
          if(L.q3){ REF.push(b64ToVec(L.q3)); CODES.push(L.code); }
'@ 'loadLearned 옛 학습분 제외'

# ── 7. learn — 새 형식으로 저장 (시점 3개) ──────────────────────
Swap @'
      var rec = {code:code, q:i8ToB64(vs[0]), q2:(vs[1] ? i8ToB64(vs[1]) : ''), n:name||'', ts:Date.now(), v:2};
'@ @'
      var rec = {code:code, q:i8ToB64(vs[0]), q2:(vs[1] ? i8ToB64(vs[1]) : ''),
                 q3:(vs[2] ? i8ToB64(vs[2]) : ''), n:name||'', ts:Date.now(), v:3};
'@ 'learn 새 형식 저장'

Swap @'
      REF.push(vs[0]); CODES.push(code);
      if(vs[1]){ REF.push(vs[1]); CODES.push(code); }
'@ @'
      REF.push(vs[0]); CODES.push(code);
      if(vs[1]){ REF.push(vs[1]); CODES.push(code); }
      if(vs[2]){ REF.push(vs[2]); CODES.push(code); }
'@ 'learn 세 번째 시점 반영'

# ── 8. V58_FROM 상수 ────────────────────────────────────────────
Swap @'
var SUGAI = (function(){
  'use strict';
'@ @'
var SUGAI = (function(){
  'use strict';

  /* v58 적용 시각 — 이전에 만들어진 벡터는 전처리가 달라 섞어 쓸 수 없다 */
  var V58_FROM = __V58_TS__;
'@ 'V58_FROM 상수'

# v58 기준선은 고정값이다 — 2026-09-17 00:00 (한국시간), v58 을 처음 배포한 날.
#   예전에는 빌드할 때마다 '지금 시각'을 넣어서, 다시 빌드할 때마다 기준선이 앞으로 밀려
#   그 사이 관리자 폰에서 등록한 자료집 사진이 무시되고, 코드가 안 바뀌어도 index.html 이 달라졌다.
$s = $s.Replace('__V58_TS__', '1789570800000')

# ── 9. 기준 데이터를 바깥 파일(aivec.js)로 뺀다 ─────────────────
#    index.html 안에 4.6MB 를 박아 두면 사진이 늘 때마다 24MB 를 통째로
#    다시 올려야 한다. 따로 두면 바뀐 쪽만 올리면 된다.
$json = [System.IO.File]::ReadAllText($VEC, [System.Text.Encoding]::UTF8)
$rx = [regex]'(?s)<script id="EMBEDDED_AIVEC"[^>]*>.*?</script>'
if($rx.Matches($s).Count -ne 1){ throw 'EMBEDDED_AIVEC 태그를 찾지 못함' }
$s = $rx.Replace($s, '<script src="aivec.js"></script>', 1)
$AIVECJS = Join-Path (Split-Path $DST -Parent) 'aivec.js'
[System.IO.File]::WriteAllText($AIVECJS, ('window.AIVEC_DATA=' + $json + ';'), (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  [OK] 기준 데이터 분리 -> {0} ({1:N0} bytes)" -f (Split-Path $AIVECJS -Leaf), (Get-Item $AIVECJS).Length) -ForegroundColor Green

[System.IO.File]::WriteAllText($DST, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ''
Write-Host ("완료 : {0}" -f $DST)
Write-Host ("  원본 {0:N0} bytes  ->  새 파일 {1:N0} bytes" -f $orig, $s.Length)
Write-Host ("  바꾼 곳 {0} 군데 + 기준벡터" -f $n)
