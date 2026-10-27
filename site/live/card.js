/* 발표장 QR 카드 — 출입문 QR 스티커(도구/QR_만들기.html)와 같은 모양, 띠 색만 분홍 · 이름 「발표장」.
   발표 실시간 화면(site/live/index.html)과 발표 자료용 그림(도구/QR_발표장.html)이 같이 쓴다. QR 은 qr.js(QRENC). */
var LIVECARD = (function(){
  'use strict';
  var SITE = 'https://minjong0910.github.io/';
  function goUrl(ev){ return SITE + 'live/go.html' + (ev && ev !== 'grad' ? '?e=' + ev : ''); }
  function rr(c, x, y, w, h, r){
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  /* 90 × 120 mm 비율 · dpi 로 크기를 정한다(발표 화면 150 · 그림 파일 300) */
  function draw(ev, icon, dpi){
    var mm = function(v){ return Math.round(v * (dpi || 300) / 25.4); };
    var SW = mm(90), SH = mm(120), url = goUrl(ev), color = '#FF468C', F = 'Pretendard, "Malgun Gothic", sans-serif';
    var cv = document.createElement('canvas'); cv.width = SW; cv.height = SH;
    var c = cv.getContext('2d'), pad = mm(4);
    c.fillStyle = '#FFFFFF'; rr(c, pad, pad, SW - 2 * pad, SH - 2 * pad, mm(4)); c.fill();   // 둥근 카드 바깥은 투명 — 어두운 발표 화면에 흰 모서리가 안 보이게
    c.lineWidth = mm(1.2); c.strokeStyle = color; rr(c, pad, pad, SW - 2 * pad, SH - 2 * pad, mm(4)); c.stroke();
    c.save(); rr(c, pad, pad, SW - 2 * pad, mm(15), mm(4)); c.fillStyle = color; c.fill(); c.restore();
    c.fillStyle = color; c.fillRect(pad, pad + mm(11), SW - 2 * pad, mm(4));
    var iz = mm(10), title = '공대 3호관 길안내';
    c.font = '700 ' + mm(5.2) + 'px ' + F;
    var tw = c.measureText(title).width, gap = mm(2.5), x0 = (SW - (iz + gap + tw)) / 2;
    if(icon){ c.save(); rr(c, x0, pad + mm(2.5), iz, iz, mm(2.2)); c.clip(); c.drawImage(icon, x0, pad + mm(2.5), iz, iz); c.restore(); }
    c.fillStyle = '#FFFFFF'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(title, x0 + iz + gap, pad + mm(7.7));
    var qr = QRENC.encode(url, 'H');
    var cells = qr.size + 8, px = Math.floor(mm(56) / cells), full = cells * px;
    QRENC.draw(c, qr, Math.round((SW - full) / 2), pad + mm(17), px, 4);
    var y = pad + mm(17) + full;
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.font = '800 ' + mm(12) + 'px ' + F; c.fillStyle = '#141820'; c.fillText('발표장', SW / 2, y + mm(12.5));
    c.font = '700 ' + mm(4) + 'px ' + F; c.fillStyle = color; c.fillText('● LIVE', SW / 2, y + mm(19));
    c.font = '600 ' + mm(3.5) + 'px ' + F; c.fillStyle = '#4B5566'; c.fillText('휴대폰 카메라로 찍으면 길안내 앱이 열려요', SW / 2, SH - pad - mm(9));
    c.font = '400 ' + mm(2.6) + 'px ' + F; c.fillStyle = '#AAB2BE'; c.fillText(url, SW / 2, SH - pad - mm(4));
    return {canvas: cv, url: url, qr: qr};
  }
  return {draw: draw, goUrl: goUrl};
})();
