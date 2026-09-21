# v66 — 글자 읽기 개선 (번호판 · 엘리베이터 층 표시 · 비상대피 안내판 제목)
#
#   ① 번호판 : 파란 판 둘레에서 '숫자 줄'만 찾아 그 덩어리 픽셀만 흰 바탕에 검게 다시 그리고
#      기울기를 바로잡아 한 줄 모드(psm 7)로 읽는다. 예전에는 KSNU 로고 띠·종이 테두리가 같이
#      들어가 tesseract 가 글자 줄을 못 찾아, 사람 눈엔 또렷한 13209 도 못 읽었다.
#      (복도 사진 60장 실측 : 번호를 읽어 층을 맞힌 것 9장 → 22장, 잘못 읽은 것 0)
#   ② 엘리베이터 안 : 문 위·버튼판의 층 표시기(검은 판 위 파랑~보라로 빛나는 글자)를 찾아 읽는다.
#      AI 순위 5등 안에 '엘리베이터 안'이 있을 때만 읽는다 (다른 사진에선 파란 물건을 숫자로 읽는다).
#      (엘리베이터 안 30장 : 층 29장 맞힘 · 틀림 0 — 사진 모양만으로는 11.5%. 엘리베이터 앞 230장에 돌려도 틀린 층 0)
#      바깥 표시기는 "칸이 있는 층"을 보여 주므로 안/밖 구분이 핵심 — 밝기 대비 조건 + AI 순위 조건 + 지하(B1) 규칙.
#   ③ 비상대피 안내판 : 제목 띠 "공과대학 3호관 N층 비상대피 경로"(남색 바탕 흰 글씨)를 잘라
#      흑백을 뒤집어 한국어 모델로 읽는다. 숫자가 뭉개지면 그 한 글자만 숫자 전용으로 다시 읽는다.
#      AI 순위 5등 안에 '안내판'이 있을 때만 읽고, 한국어 모델(1.1MB)도 그때만 인터넷에서 받는다.
#      (안내판 51장 : 층 23장 맞힘 · 틀림 0 — 사진 모양만으로는 21.6%)
#
#   ②③ 으로 정한 층은 '층 확정'으로 쓰되 자동 승인은 하지 않는다 — 후보 맨 앞에 놓고 관리자가 고른다.
#
#   사용법 : pwsh -File patch_v66.ps1 <대상파일>
param([string]$Target)
$ErrorActionPreference = 'Stop'
if(-not (Test-Path $Target)){ throw "파일이 없습니다: $Target" }
$s = [System.IO.File]::ReadAllText($Target, [System.Text.Encoding]::UTF8)
$n = 0
function Swap([string]$old, [string]$new, [string]$label){
  $script:n++
  $old = $old -replace "`r`n", "`n"; $new = $new -replace "`r`n", "`n"
  $c = ([regex]::Matches($script:s, [regex]::Escape($old))).Count
  if($c -ne 1){ throw ("[{0}] 앵커가 {1}개" -f $label, $c) }
  $script:s = $script:s.Replace($old, $new)
  Write-Host ("  [OK] {0}" -f $label) -ForegroundColor Green
}

# ── 1. plateBoxes 가 설정값을 받게 (숫자 줄·안내판 띠는 더 큰 해상도·다른 모양으로 찾는다) ──
Swap @'
  function plateBoxes(img){
    var k = Math.min(1, PLATE.W / Math.max(img.width || 1, img.height || 1));
'@ @'
  function plateBoxes(img, P){
    P = P || PLATE;                                  /* v66 : 설정을 바꿔 부를 수 있게 */
    var k = Math.min(1, P.W / Math.max(img.width || 1, img.height || 1));
'@ 'plateBoxes 설정값 받기'

Swap @'
      if(cnt < PLATE.MINPX || area > PLATE.MAXAREA*n) continue;
      if(cnt/area < PLATE.MINFILL) continue;
      if(ar < PLATE.ARLO || ar > PLATE.ARHI) continue;
'@ @'
      if(cnt < P.MINPX*(P.W/512)*(P.W/512) || area > P.MAXAREA*n) continue;
      if(cnt/area < P.MINFILL) continue;
      if(ar < P.ARLO || ar > P.ARHI) continue;
'@ 'plateBoxes 조건'

Swap @'
    return out.slice(0, PLATE.MAX);
'@ @'
    return out.slice(0, P.MAX);
'@ 'plateBoxes 개수'

# ── 2. 새 기능 묶음 (ocrRun 바로 앞) ─────────────────────────────
Swap @'
  /* 사진 한 장 OCR — 실패·시간초과면 null (판정은 그대로 진행)
'@ @'
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
  function v66DigitLines(img, b, R, TH, max){
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
        if(h >= Math.max(8, H*0.035) && h <= H*0.4 && w <= h*4 && w >= h*0.1 && fill > 0.12 && fill < 0.92 &&
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
'@ 'v66 기능 묶음'

# ── 3. ocrRun : 숫자 줄을 먼저 읽는다 ─────────────────────────────
Swap @'
        var shots = [], bi, cvv;
        for(bi=0; bi<boxes.length; bi++){
          cvv = plateCrop(im, boxes[bi]);
          if(!cvv) continue;
          shots.push(ocrPrep(cvv, false));
          shots.push(ocrPrep(cvv, true));
        }
'@ @'
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
'@ 'ocrRun 숫자 줄 먼저'

Swap @'
          return ocrWords(w, shots[si++], 11).then(function(ws){
'@ @'
          var shot = shots[si++];
          return ocrWords(w, shot.cv, shot.psm).then(function(ws){
'@ 'ocrRun 조각별 읽기 방식'

# ── 3-2. ocrRun : 시간이 다 되면 남은 읽기를 그만둔다 ─────────────
#    예전에는 32초가 지나 결과를 버린 뒤에도 워커가 남은 조각을 계속 읽었다.
#    그러면 뒤이어 읽을 엘리베이터 층 표시가 그 뒤에 줄을 서다 시간이 초과됐다(실제로 확인).
Swap @'
  function ocrRun(dataUrl){
'@ @'
  function ocrRun(dataUrl, ctl){
    ctl = ctl || {};                    /* v66 : ctl.noWide — 엘리베이터 안·안내판으로 보이면 사진 전체·4조각 읽기를 건너뛴다 */
'@ 'ocrRun 제어값 받기'

Swap @'
    var timer = null;
    var work = ocrEnsure().then(function(w){
'@ @'
    var timer = null, dead = false;     /* v66 : 시간이 다 되면 남은 읽기를 그만둔다 */
    var work = ocrEnsure().then(function(w){
'@ 'ocrRun 멈춤 표시'

Swap @'
          if(si >= shots.length) return null;
'@ @'
          if(dead || si >= shots.length) return null;
'@ 'ocrRun 번호판 단계 멈춤'

Swap @'
          words = words.concat(plateWords);
          /* ② 번호판을 못 찾았거나 못 읽었으면 예전 방식(사진 전체 + 4조각) */
          return ocrWords(w, im, 11).then(function(ws){
'@ @'
          words = words.concat(plateWords);
          if(dead || ctl.noWide) return p0;
          /* ② 번호판을 못 찾았거나 못 읽었으면 예전 방식(사진 전체 + 4조각) */
          return ocrWords(w, im, 11).then(function(ws){
'@ 'ocrRun 전체 단계 멈춤'

Swap @'
              if(i >= tiles.length){
'@ @'
              if(dead || ctl.noWide || i >= tiles.length){
'@ 'ocrRun 4조각 단계 멈춤'

Swap @'
    var late = new Promise(function(res){ timer = setTimeout(function(){ res(null); }, OCR.TIMEOUT); });
'@ @'
    var late = new Promise(function(res){ timer = setTimeout(function(){ dead = true; res(null); }, OCR.TIMEOUT); });
'@ 'ocrRun 시간 초과 표시'

# ── 4. judge : 번호판 다음에 엘리베이터·안내판 ───────────────────
#    AI 순위에 엘리베이터 안·안내판이 있으면 번호판 읽기의 무거운 뒷단계(사진 전체·4조각)를 건너뛴다.
#    그 단계의 한 조각이 20초 넘게 걸려 층 표시 읽기가 시간 초과되는 일이 실제로 있었다.
Swap @'
      var ocrP = ocrRun(ocrUrl || dataUrl);   /* v57 : 번호판 픽셀을 살린 큰 사본으로 읽는다 */
'@ @'
      var ocrCtl = {};
      var ocrP = ocrRun(ocrUrl || dataUrl, ocrCtl);   /* v57 : 번호판 픽셀을 살린 큰 사본으로 읽는다 */
'@ 'judge 번호판 읽기 제어값'

Swap @'
          var rk = rank(qs);
'@ @'
          var rk = rank(qs);
          if(sceneWanted(rk)) ocrCtl.noWide = true;   /* v66 */
'@ 'judge 장면이면 무거운 단계 생략'

Swap @'
          return ocrP.then(function(ocr){
            applyOcr(res, ocr, rk);                // v53 : 번호판
            applyHint(res, note, rk);              // 제보 메모를 힌트로 반영
            cb(res);
          });
'@ @'
          return ocrP.then(function(ocr){
            applyOcr(res, ocr, rk);                // v53 : 번호판
            /* v66 : 번호판으로 층을 못 정했고 AI 가 엘리베이터 안·비상대피 안내판으로 보면 층 표시·제목을 읽는다 */
            return sceneRun(ocrUrl || dataUrl, rk, res).then(function(sc){
              applyScene(res, sc, rk);
              applyHint(res, note, rk);            // 제보 메모를 힌트로 반영
              cb(res);
            });
          });
'@ 'judge 에 장면 글자 읽기'

# ── 5. 화면 문구 : 무엇에서 층을 읽었는지 ─────────────────────────
Swap @'
      if(fo) h += '<span class="sub">층 : <b>'+fo+'</b> <span class="num">(사진 속 번호판 '+(ai.ocr.code||ai.ocr.raw||'')+'에서 읽음)</span></span>';
'@ @'
      var from = ai.ocr.scene === 'lift' ? '엘리베이터 안 층 표시에서 읽음'
               : ai.ocr.scene === 'sign' ? '비상대피 안내판 제목에서 읽음'
               : '사진 속 번호판 '+(ai.ocr.code||ai.ocr.raw||'')+'에서 읽음';     /* v66 */
      if(fo) h += '<span class="sub">층 : <b>'+fo+'</b> <span class="num">('+from+')</span></span>';
'@ '관리자 안내문 출처'

Swap @'
      if(ai.codeSource==='ocr'){ cls='aiOk';   txt='🔢 번호판으로 확정'; }
'@ @'
      if(ai.codeSource==='ocr'){ cls='aiOk';   txt='🔢 번호판으로 확정'; }
      else if(ai.codeSource==='scene'){ cls='aiOk'; txt = (ai.ocr && ai.ocr.scene==='lift') ? '🛗 엘리베이터 층 표시로 층 확정' : '🗺 안내판 제목으로 층 확정'; }   /* v66 */
'@ '관리자 배지'

Swap @'
      h += '<span class="num hint">🔢 번호판 '+(ai.ocr.code || ai.ocr.raw || '')+' → '+ai.ocr.floor
'@ @'
      h += '<span class="num hint">' + (ai.ocr.scene === 'lift' ? '🛗 엘리베이터 층 표시' : ai.ocr.scene === 'sign' ? '🗺 안내판 제목' : '🔢 번호판 '+(ai.ocr.code || ai.ocr.raw || '')) + ' → '+ai.ocr.floor
'@ '관리자 힌트 줄'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
