/* QR_encode.js — QR 코드 만들기 (글자는 바이트 방식 · 버전 1~10 · 오류정정 L/M/Q/H)

   출입문 QR 인쇄용(도구/QR_만들기.html)으로만 쓴다 — 앱에는 들어가지 않는다.
   이 PC 에 파이썬·노드가 없어 예전 make_qr.py 를 못 돌리고, 남의 코드를 받아 오지 않으려고 직접 짰다.
   맞게 만들었는지는 앱이 쓰는 QR 읽기(jsQR)로 다시 읽어 확인한다 (QR_만들기.html · tests/pwa.html).

   순서 (QR 표준 ISO/IEC 18004 그대로)
     ① 글자 → 비트 (방식 0100 · 글자 수 · 바이트 · 끝 표시 · 채움 EC 11 EC 11 …)
     ② 블록으로 나눠 블록마다 리드-솔로몬 오류정정 부호를 붙이고, 블록을 번갈아 섞는다
     ③ 찾기 무늬·타이밍·정렬 무늬를 그리고, 남은 칸에 지그재그로 비트를 채운다
     ④ 마스크 8가지 중 벌점이 가장 적은 것을 골라 씌우고, 형식 정보(오류정정 등급·마스크)를 적는다 */
var QRENC = (function(){
  'use strict';

  /* ── GF(256) 곱셈 (원시 다항식 x^8+x^4+x^3+x^2+1 = 0x11D) ── */
  var EXP = new Array(512), LOG = new Array(256);
  (function(){
    var x = 1;
    for(var i = 0; i < 255; i++){ EXP[i] = x; LOG[x] = i; x <<= 1; if(x & 0x100) x ^= 0x11D; }
    for(var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function mul(a, b){ return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  /* 생성 다항식 (x-α^0)(x-α^1)…(x-α^(n-1)) — 계수는 높은 차수부터 */
  function genPoly(n){
    var g = [1];
    for(var i = 0; i < n; i++){
      var ng = new Array(g.length + 1);
      for(var k = 0; k < ng.length; k++) ng[k] = 0;
      for(var j = 0; j < g.length; j++){ ng[j] ^= g[j]; ng[j + 1] ^= mul(g[j], EXP[i]); }
      g = ng;
    }
    return g;
  }
  /* 오류정정 부호 = (자료 × x^n) 을 생성 다항식으로 나눈 나머지 */
  function rsEC(data, n){
    var g = genPoly(n), res = [];
    for(var k = 0; k < n; k++) res.push(0);
    for(var i = 0; i < data.length; i++){
      var f = data[i] ^ res[0];
      res.shift(); res.push(0);
      if(f) for(var j = 0; j < n; j++) res[j] ^= mul(g[j + 1], f);
    }
    return res;
  }

  /* ── 버전·등급별 블록 구성 [블록당 오류정정 수, 1묶음 블록 수, 1묶음 자료 수, 2묶음 블록 수, 2묶음 자료 수] ── */
  var EC = {
    1:{L:[7,1,19,0,0],   M:[10,1,16,0,0],  Q:[13,1,13,0,0],  H:[17,1,9,0,0]},
    2:{L:[10,1,34,0,0],  M:[16,1,28,0,0],  Q:[22,1,22,0,0],  H:[28,1,16,0,0]},
    3:{L:[15,1,55,0,0],  M:[26,1,44,0,0],  Q:[18,2,17,0,0],  H:[22,2,13,0,0]},
    4:{L:[20,1,80,0,0],  M:[18,2,32,0,0],  Q:[26,2,24,0,0],  H:[16,4,9,0,0]},
    5:{L:[26,1,108,0,0], M:[24,2,43,0,0],  Q:[18,2,15,2,16], H:[22,2,11,2,12]},
    6:{L:[18,2,68,0,0],  M:[16,4,27,0,0],  Q:[24,4,19,0,0],  H:[28,4,15,0,0]},
    7:{L:[20,2,78,0,0],  M:[18,4,31,0,0],  Q:[18,2,14,4,15], H:[26,4,13,1,14]},
    8:{L:[24,2,97,0,0],  M:[22,2,38,2,39], Q:[22,4,18,2,19], H:[26,4,14,2,15]},
    9:{L:[30,2,116,0,0], M:[22,3,36,2,37], Q:[20,4,16,4,17], H:[24,4,12,4,13]},
    10:{L:[18,2,68,2,69],M:[26,4,43,1,44], Q:[24,6,19,2,20], H:[28,6,15,2,16]}
  };
  var ALIGN = {1:[],2:[6,18],3:[6,22],4:[6,26],5:[6,30],6:[6,34],7:[6,22,38],8:[6,24,42],9:[6,26,46],10:[6,28,50]};
  var EC_BITS = {L:1, M:0, Q:3, H:2};

  function utf8(s){
    var out = [], e = unescape(encodeURIComponent(s));
    for(var i = 0; i < e.length; i++) out.push(e.charCodeAt(i));
    return out;
  }
  function dataCount(v, lv){ var t = EC[v][lv]; return t[1] * t[2] + t[3] * t[4]; }

  /* ① 글자 → 자료 바이트 */
  function makeData(bytes, v, lv){
    var bits = [];
    function put(val, len){ for(var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4);                                   // 바이트 방식
    put(bytes.length, v < 10 ? 8 : 16);          // 글자 수
    bytes.forEach(function(b){ put(b, 8); });
    var cap = dataCount(v, lv) * 8;
    put(0, Math.min(4, cap - bits.length));      // 끝 표시
    while(bits.length % 8) bits.push(0);
    var out = [];
    for(var i = 0; i < bits.length; i += 8){
      var b = 0; for(var j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; out.push(b);
    }
    for(var p = 0; out.length < cap / 8; p++) out.push(p % 2 ? 0x11 : 0xEC);
    return out;
  }

  /* ② 블록 나누기 · 오류정정 · 섞기 */
  function interleave(data, v, lv){
    var t = EC[v][lv], blocks = [], pos = 0;
    for(var g = 0; g < 2; g++){
      var cnt = g ? t[3] : t[1], len = g ? t[4] : t[2];
      for(var b = 0; b < cnt; b++){
        var d = data.slice(pos, pos + len); pos += len;
        blocks.push({d:d, e:rsEC(d, t[0])});
      }
    }
    var out = [], maxD = Math.max(t[2], t[4]);
    for(var i = 0; i < maxD; i++) blocks.forEach(function(bk){ if(i < bk.d.length) out.push(bk.d[i]); });
    for(var k = 0; k < t[0]; k++) blocks.forEach(function(bk){ out.push(bk.e[k]); });
    return out;
  }

  /* ③ 그리기 */
  function build(codewords, v, lv, mask){
    var n = 17 + 4 * v, m = [], fn = [];
    for(var y = 0; y < n; y++){ m.push([]); fn.push([]); for(var x = 0; x < n; x++){ m[y].push(0); fn[y].push(false); } }
    function set(x, y, dark){ m[y][x] = dark ? 1 : 0; fn[y][x] = true; }

    for(var i = 0; i < n; i++){ set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }          // 타이밍
    [[3, 3], [n - 4, 3], [3, n - 4]].forEach(function(c){                                   // 찾기 무늬 (+ 흰 테두리)
      for(var dy = -4; dy <= 4; dy++) for(var dx = -4; dx <= 4; dx++){
        var xx = c[0] + dx, yy = c[1] + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
        if(xx >= 0 && xx < n && yy >= 0 && yy < n) set(xx, yy, d !== 2 && d !== 4);
      }
    });
    var al = ALIGN[v], L = al.length;                                                        // 정렬 무늬
    for(var a = 0; a < L; a++) for(var b = 0; b < L; b++){
      if((a === 0 && b === 0) || (a === 0 && b === L - 1) || (a === L - 1 && b === 0)) continue;
      for(var dy2 = -2; dy2 <= 2; dy2++) for(var dx2 = -2; dx2 <= 2; dx2++)
        set(al[a] + dx2, al[b] + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
    }
    formatBits(set, n, lv, 0);                                                              // 자리 잡기 (값은 ④에서)
    if(v >= 7){                                                                             // 버전 정보
      var r = v; for(var q = 0; q < 12; q++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      var vb = (v << 12) | r;
      for(var s = 0; s < 18; s++){
        var bit = (vb >>> s) & 1, aa = n - 11 + s % 3, bb = Math.floor(s / 3);
        set(aa, bb, bit); set(bb, aa, bit);
      }
    }

    /* 지그재그로 비트 채우기 — 오른쪽 아래에서 두 칸씩, 위로 갔다 아래로 갔다, 6번 세로줄(타이밍)은 건너뛴다 */
    var bits = [];
    codewords.forEach(function(c){ for(var k = 7; k >= 0; k--) bits.push((c >>> k) & 1); });
    var bi = 0;
    for(var right = n - 1; right >= 1; right -= 2){
      if(right === 6) right = 5;
      for(var vert = 0; vert < n; vert++){
        for(var j = 0; j < 2; j++){
          var x2 = right - j, up = ((right + 1) & 2) === 0, y2 = up ? n - 1 - vert : vert;
          if(!fn[y2][x2]){ m[y2][x2] = bi < bits.length ? bits[bi] : 0; bi++; }
        }
      }
    }
    /* ④ 마스크 */
    for(var yy2 = 0; yy2 < n; yy2++) for(var xx2 = 0; xx2 < n; xx2++){
      if(!fn[yy2][xx2] && maskHit(mask, xx2, yy2)) m[yy2][xx2] ^= 1;
    }
    formatBits(set, n, lv, mask);
    return m;
  }
  function maskHit(k, x, y){
    switch(k){
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      case 5: return x * y % 2 + x * y % 3 === 0;
      case 6: return (x * y % 2 + x * y % 3) % 2 === 0;
      default: return ((x + y) % 2 + x * y % 3) % 2 === 0;
    }
  }
  /* 형식 정보 15비트 (등급 2 + 마스크 3 + BCH 10, 0x5412 로 뒤섞음) — 두 곳에 적는다 */
  function formatBits(set, n, lv, mask){
    var d = (EC_BITS[lv] << 3) | mask, r = d;
    for(var i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    var bits = ((d << 10) | r) ^ 0x5412;
    function b(k){ return (bits >>> k) & 1; }
    for(var a = 0; a <= 5; a++) set(8, a, b(a));
    set(8, 7, b(6)); set(8, 8, b(7)); set(7, 8, b(8));
    for(var c = 9; c < 15; c++) set(14 - c, 8, b(c));
    for(var e = 0; e < 8; e++) set(n - 1 - e, 8, b(e));
    for(var f = 8; f < 15; f++) set(8, n - 15 + f, b(f));
    set(8, n - 8, 1);                                                                       // 늘 검은 칸
  }

  /* 벌점 (표준의 4가지) — 읽기 쉬운 마스크를 고르는 데만 쓴다 */
  function penalty(m){
    var n = m.length, p = 0, dark = 0;
    function lines(get){
      for(var i = 0; i < n; i++){
        var run = 1, row = [];
        for(var j = 0; j < n; j++) row.push(get(i, j));
        for(var k = 1; k <= n; k++){
          if(k < n && row[k] === row[k - 1]) run++;
          else { if(run >= 5) p += 3 + run - 5; run = 1; }
        }
        var s = row.join('');
        var hits = s.split('10111010000').length - 1 + s.split('00001011101').length - 1;
        p += 40 * hits;
      }
    }
    lines(function(i, j){ return m[i][j]; });
    lines(function(i, j){ return m[j][i]; });
    for(var y = 0; y < n - 1; y++) for(var x = 0; x < n - 1; x++){
      var c = m[y][x];
      if(c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
    }
    for(var yy = 0; yy < n; yy++) for(var xx = 0; xx < n; xx++) dark += m[yy][xx];
    p += 10 * Math.floor(Math.abs(dark * 100 / (n * n) - 50) / 5);
    return p;
  }

  /* 만들기 : text → {version, level, mask, size, modules[y][x] (1=검정)} */
  function encode(text, level){
    var lv = level || 'H', bytes = utf8(text), v = 0;
    for(var t = 1; t <= 10; t++){
      if(4 + (t < 10 ? 8 : 16) + bytes.length * 8 <= dataCount(t, lv) * 8){ v = t; break; }
    }
    if(!v) throw new Error('글자가 너무 깁니다 (버전 10 까지만)');
    var cw = interleave(makeData(bytes, v, lv), v, lv);
    var best = null, bestP = Infinity, bestK = 0;
    for(var k = 0; k < 8; k++){
      var m = build(cw, v, lv, k), p = penalty(m);
      if(p < bestP){ bestP = p; best = m; bestK = k; }
    }
    return {version:v, level:lv, mask:bestK, size:best.length, modules:best};
  }

  /* 캔버스에 그리기 — quiet : 둘레 흰 칸 수 (표준 4) */
  function draw(ctx, qr, x, y, px, quiet){
    var q = quiet === undefined ? 4 : quiet, full = (qr.size + 2 * q) * px;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, full, full);
    ctx.fillStyle = '#000000';
    for(var r = 0; r < qr.size; r++) for(var c = 0; c < qr.size; c++){
      if(qr.modules[r][c]) ctx.fillRect(x + (c + q) * px, y + (r + q) * px, px, px);
    }
    return full;
  }

  return {encode:encode, draw:draw, _rsEC:rsEC};
})();
