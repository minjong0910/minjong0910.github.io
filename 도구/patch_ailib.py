# -*- coding: utf-8 -*-
"""v55 → v56 : 자료집을 index.html 에 담아 배포 (EMBEDDED_AILIB)

  · 파일에 담긴 '기본 자료집'을 모든 기기의 AI가 쓴다 (관리자 폰뿐 아니라 사용자 폰까지)
  · 관리자는 컴퓨터에서 사진을 넣고 빼고 → 「자료집을 담은 index.html 내려받기」 → GitHub 덮어쓰기
  · 기본 자료집의 사진을 빼면 그 기기에서만 숨겨진다 (되돌리기 버튼) — 내려받기에도 빠진 채로 담긴다
  · 폴더 이름(5층/13524_PC실/…)과 '1층-HALL1L-복도-왼쪽' 같은 정리된 이름도 알아본다
  · 화장실 → WC1~5, 지하 → B1, 정문·후문·동문·서문·출입구 → BLD
"""
import io, sys, re

SRC = '/home/claude/gunsan_b3nav_AIDATA_v55.html'
DST = '/home/claude/gunsan_b3nav_AILIB_v56.html'

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

# ── 1) 기본 자료집이 들어갈 자리 (처음엔 비어 있다 — 생성 단계에서 채운다)
rep(r'''<script id="EMBEDDED_AIVEC" type="application/json">''',
r'''<script id="EMBEDDED_AILIB" type="application/json">{"ver":1,"n":0,"items":[]}</script>
<script id="EMBEDDED_AIVEC" type="application/json">''',
'EMBEDDED_AILIB 자리')

# ── 2) SUGAI : 기본 자료집 읽기 + 숨김 + 합치기
rep(r'''  /* 자료집을 한 번만 읽어 메모리에 올린다. IndexedDB를 못 쓰면 조용히 빈 자료집으로 둔다. */
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
  }''',
r'''  /* ── v56 : 파일에 담겨 배포되는 '기본 자료집' ─────────────────────
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
      var el = document.getElementById('EMBEDDED_AILIB');
      if(el && el.textContent.trim()){
        var d = JSON.parse(el.textContent);
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
  }''',
'libEnsure v56 (기본 자료집 합치기)')

rep(r'''  function libDel(id){
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
  }''',
r'''  /* 빼기 : 기본 자료집 사진은 이 기기에서 숨기고, 기기에서 넣은 사진은 저장소에서 지운다 */
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
  }''',
'libDel/libDelCode/libClear v56')

rep(r'''  function libStats(){
    var by = {}, bytes = 0;
    for(var i=0;i<LIB.length;i++){
      var r = LIB[i];
      by[r.code] = (by[r.code]||0) + 1;
      bytes += (r.thumb ? r.thumb.length : 0) + (r.vecs ? r.vecs.join('').length : 0);
    }
    return { n: LIB.length, codes: by, nCodes: Object.keys(by).length, bytes: bytes, ready: libLoaded };
  }
  function libUsable(){ return !!window.indexedDB; }''',
r'''  function libStats(){
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
  function libUsable(){ return !!window.indexedDB; }''',
'libStats v56')

rep(r'''           libAll:libAll, libStats:libStats, libUsable:libUsable, rebuildRef:rebuildRef,''',
r'''           libAll:libAll, libStats:libStats, libUsable:libUsable, rebuildRef:rebuildRef,
           libExport:libExport, libUnhideAll:libUnhideAll, libKey:libKey,''',
'SUGAI 노출')

# ── 3) codeLabel : 화장실·계단도 이름이 붙게
rep(r'''    if(/^EV\d$/.test(code)) return (ko()?'엘리베이터 ':'Elevator ') + code.slice(2) + (ko()?'층':'F');''',
r'''    if(/^EV\d$/.test(code)) return (ko()?'엘리베이터 ':'Elevator ') + code.slice(2) + (ko()?'층':'F');
    if(/^WC\d$/.test(code)) return code.slice(2) + (ko()?'층 화장실':'F restroom');
    if(/^ES\d$/.test(code)) return code.slice(2) + (ko()?'층 계단':'F stairs');''',
'codeLabel WC/ES')

# ── 4) 화면 : 상태줄 (기본/기기/숨김 구분) + 시크릿 모드여도 기본 자료집은 보이게
rep(r'''  if(!SUGAI.libUsable()){
    el.innerHTML = '<b style="color:#FF8A8A;">이 브라우저에서는 자료집을 저장할 수 없습니다.</b>' +
                   '<span class="sub">사생활 보호 모드(시크릿)에서는 저장이 막힐 수 있어요. 일반 창에서 열어 주세요.</span>';
    return;
  }
  var st = SUGAI.libStats();''',
r'''  var st = SUGAI.libStats();
  if(!SUGAI.libUsable() && !st.n){
    el.innerHTML = '<b style="color:#FF8A8A;">이 브라우저에서는 자료집을 저장할 수 없습니다.</b>' +
                   '<span class="sub">사생활 보호 모드(시크릿)에서는 저장이 막힐 수 있어요. 일반 창에서 열어 주세요.</span>';
    return;
  }''',
'상태줄 시크릿 처리')

rep(r'''  el.innerHTML = '자료집 사진 <b>' + st.n + '장</b> · 위치 <b>' + st.nCodes + '곳</b>' +
    (st.n ? ' · 약 ' + (mb < 0.1 ? Math.round(st.bytes/1024)+'KB' : mb.toFixed(1)+'MB') : '') +
    '<span class="sub">' + line + '</span>' +
    '<span class="sub">앱이 아는 위치 ' + total + '곳 중 ' + st.nCodes + '곳에 자료가 있습니다</span>';''',
r'''  /* v56 : 파일에 담긴 기본 자료집 / 이 기기에서 넣은 것 / 숨긴 것을 구분해서 보여 준다 */
  var src = '';
  if(st.nFile || st.nMine || st.nHidden){
    src = '<span class="sub">앱 파일에 담긴 기본 자료 <b>' + st.nEmb + '장</b>' +
          (st.nMine ? ' · 이 기기에서 넣은 사진 <b style="color:#FFD166;">' + st.nMine + '장</b> (아직 파일에는 없음)' : '') +
          (st.nHidden ? ' · 이 기기에서 숨긴 기본 사진 ' + st.nHidden + '장' : '') + '</span>';
  }
  el.innerHTML = '자료집 사진 <b>' + st.n + '장</b> · 위치 <b>' + st.nCodes + '곳</b>' +
    (st.n ? ' · 약 ' + (mb < 0.1 ? Math.round(st.bytes/1024)+'KB' : mb.toFixed(1)+'MB') : '') +
    '<span class="sub">' + line + '</span>' + src +
    '<span class="sub">앱이 아는 위치 ' + total + '곳 중 ' + st.nCodes + '곳에 자료가 있습니다</span>';
  var ex = document.getElementById('aidExportRow');
  if(ex) ex.style.display = st.n ? '' : 'none';
  var un = document.getElementById('aidUnhideBtn');
  if(un) un.style.display = st.nHidden ? '' : 'none';''',
'상태줄 v56')

# ── 5) 화면 : 썸네일 id 가 'e12' 같은 글자여도 되게 (따옴표) + 기본 자료 표시
rep(r'''    var thumbs = arr.map(function(r){
      return '<span class="t">' +
        (r.thumb ? '<img src="'+r.thumb+'" alt="'+c+'" onclick="aidZoom('+r.id+')">' : '<img alt="">') +
        (r.v ? '<span class="vw">'+r.v+'</span>' : '') +
        '<button class="x" onclick="aidDel('+r.id+')" title="이 사진 빼기">✕</button></span>';
    }).join('');''',
r'''    var thumbs = arr.map(function(r){
      var idq = "'" + String(r.id).replace(/[^0-9A-Za-z_-]/g, '') + "'";
      return '<span class="t' + (r.emb ? '' : ' mine') + '">' +
        (r.thumb ? '<img src="'+r.thumb+'" alt="'+c+'" onclick="aidZoom('+idq+')">' : '<img alt="">') +
        (r.v ? '<span class="vw">'+r.v+'</span>' : '') +
        '<button class="x" onclick="aidDel('+idq+')" title="' + (r.emb ? '이 기기에서 숨기기' : '이 사진 빼기') + '">✕</button></span>';
    }).join('');''',
'썸네일 id 따옴표')

rep(r'''function aidZoom(id){
  var r = SUGAI.libAll().filter(function(x){ return x.id === id; })[0];''',
r'''function aidZoom(id){
  var r = SUGAI.libAll().filter(function(x){ return String(x.id) === String(id); })[0];''',
'aidZoom id 비교')

rep(r'''  #saidat .aidThumbs .x{position:absolute;top:-4px;right:-4px;''',
r'''  #saidat .aidThumbs .t.mine img{outline:2px solid #FFD166;outline-offset:-2px;}
  #saidat .aidExportRow{margin:14px 0 4px;}
  #saidat .aidExportRow .big{background:linear-gradient(135deg,#39FF88,#00C2FF);color:#06111C;font-weight:700;}
  #saidat .aidExportNote{font-size:11.5px;color:#7C8AA0;line-height:1.65;margin:6px 2px 0;}
  #saidat .aidExportNote b{color:#94B8E0;font-weight:600;}
  #saidat .aidThumbs .x{position:absolute;top:-4px;right:-4px;''',
'CSS v56')

# ── 6) 화면 : 빼기 문구 + 내려받기 + 되돌리기
rep(r'''function aidClearAll(){
  if(!confirm('자료집을 전부 비울까요?\n(앱에 원래 들어있던 사진 학습은 그대로 남습니다)')) return;
  SUGAI.libClear().then(function(){ aidProg(''); aidRender(); })['catch'](function(){ aidProg('비우지 못했습니다.'); });
}''',
r'''function aidClearAll(){
  if(!confirm('자료집을 전부 비울까요?\n· 앱 파일에 담긴 기본 자료는 이 기기에서만 숨겨집니다 (되돌리기 가능)\n· 이 기기에서 넣은 사진은 지워집니다\n(앱에 원래 들어있던 사진 학습은 그대로 남습니다)')) return;
  SUGAI.libClear().then(function(){ aidProg(''); aidRender(); })['catch'](function(){ aidProg('비우지 못했습니다.'); });
}
/* v56 : 숨긴 기본 자료 되돌리기 */
function aidUnhide(){
  SUGAI.libUnhideAll().then(function(){ aidProg('숨겼던 기본 자료를 되돌렸습니다.'); aidRender(); })
    ['catch'](function(){ aidProg('되돌리지 못했습니다.'); });
}
/* v56 : 지금 자료집을 담은 index.html 내려받기
   내려받은 파일을 GitHub 의 index.html 에 덮어쓰면 모든 사용자의 AI가 같은 자료집을 쓴다.
   (사진 등록의 '사진 담아서 저장'과 같은 방식 — 파일 원본에서 자료집 부분만 바꿔 끼운다) */
function aidExportHtml(){
  if(typeof SUGAI === 'undefined') return;
  var st = SUGAI.libStats();
  if(!st.n){ alert('자료집이 비어 있습니다.'); return; }
  var msg = '자료집 ' + st.n + '장을 담은 index.html 을 내려받습니다.' +
            (st.nMine ? '\n(이 기기에서 넣은 ' + st.nMine + '장이 새로 담깁니다)' : '') +
            (st.nHidden ? '\n(숨긴 ' + st.nHidden + '장은 빠집니다)' : '') +
            '\n\n내려받은 파일을 GitHub 의 index.html 에 덮어쓰면\n모든 사용자의 AI가 이 자료집을 씁니다.';
  if(!confirm(msg)) return;
  aidProg('파일을 만드는 중…');
  phPristine(function(src){
    try{
      var json = SUGAI.libExport().replace(/</g, '\\u003c');
      var tag  = '<scr' + 'ipt id="EMBEDDED_AILIB" type="application/json">' + json + '</scr' + 'ipt>';
      var rx   = new RegExp('<scr' + 'ipt id="EMBEDDED_AILIB"[\\s\\S]*?<\\/scr' + 'ipt>', 'i');
      var html = rx.test(src) ? src.replace(rx, function(){ return tag; })
                              : src.replace(/<body[^>]*>/i, function(m){ return m + '\n' + tag; });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([html], {type:'text/html;charset=utf-8'}));
      a.download = 'index.html';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 6000);
      aidProg('✓ index.html 을 내려받았습니다 (자료집 ' + st.n + '장, 약 ' + (html.length/1048576).toFixed(1) + 'MB). ' +
              'GitHub 저장소의 index.html 에 덮어쓰면 모든 사용자에게 적용됩니다.');
    }catch(e){ aidProg('파일을 만들지 못했습니다. (' + (e && e.message || e) + ')'); }
  });
}''',
'내려받기/되돌리기 함수')

rep(r'''    <div class="aidList" id="aidList"></div>
    <div class="row">
      <button class="big ghost" onclick="aidClearAll()">자료집 전체 비우기</button>
    </div>
    <div class="mini">※ 자료집은 이 기기(브라우저)에 저장됩니다. 앱을 새로 열어도 남아 있습니다.
      다른 기기의 AI에도 반영하려면 사진을 그 기기에서도 넣어 주세요.</div>''',
r'''    <div class="aidList" id="aidList"></div>
    <div class="row aidExportRow" id="aidExportRow" style="display:none;">
      <button class="big" onclick="aidExportHtml()">📥 자료집을 담은 index.html 내려받기</button>
    </div>
    <div class="aidExportNote">
      <b>모든 사용자에게 적용하려면</b> — 컴퓨터에서 사진을 넣거나 뺀 뒤 위 버튼으로 <b>index.html</b> 을 내려받아
      GitHub 저장소의 index.html 에 덮어쓰세요. 그러면 모든 사람의 AI가 같은 자료집으로 위치를 알아봅니다.<br>
      노란 테두리 사진은 <b>아직 이 기기에만</b> 있는 사진입니다. 파일에 담긴 기본 사진을 ✕ 로 빼면
      이 기기에서 숨겨지고, 그 상태로 내려받으면 파일에서도 빠집니다.
    </div>
    <div class="row">
      <button class="big ghost" onclick="aidClearAll()">자료집 전체 비우기</button>
      <button class="big ghost" id="aidUnhideBtn" onclick="aidUnhide()" style="display:none;">숨긴 기본 사진 되돌리기</button>
    </div>''',
'화면 HTML v56')

rep(r'''      여기 넣은 사진은 <b>AI가 보는 자료로만</b> 쓰이고, 길안내 화면에 나오는 사진은 바뀌지 않습니다.
      <span class="warn">위치를 잘못 지정하면 오히려 더 틀리니 확인하고 넣어주세요.</span>''',
r'''      여기 넣은 사진은 <b>AI가 보는 자료로만</b> 쓰이고, 길안내 화면에 나오는 사진은 바뀌지 않습니다.<br>
      앱 파일(index.html)에 담긴 <b>기본 자료집</b>은 모든 사용자의 AI가 함께 씁니다.
      컴퓨터에서 넣고 뺀 뒤 <b>index.html 내려받기</b>로 담아 올리면 됩니다.
      <span class="warn">위치를 잘못 지정하면 오히려 더 틀리니 확인하고 넣어주세요.</span>''',
'안내문 v56')

rep(r'''        여러 층을 한꺼번에 넣어도 되고, ZIP도 그대로 됩니다.<br>''',
r'''        여러 층을 한꺼번에 넣어도 되고, ZIP도 그대로 됩니다.
        폴더로 정리한 ZIP(<b style="color:#94B8E0;">5층/13524_PC실/…</b>)이나
        <b style="color:#94B8E0;">1층-HALL1L-복도-왼쪽.jpg</b> · <b style="color:#94B8E0;">3층-화장실.jpg</b> ·
        <b style="color:#94B8E0;">1층-정문 외관.jpg</b> 같은 이름도 알아봅니다.<br>''',
'끌어놓기 안내 v56')

# ── 7) 이름 → 위치 : 정리된 이름·폴더 이름까지 읽는다
rep(r'''function aidCodeFromName(name){
  var base = String(name || '').split('/').pop().split('\\').pop();
  var noExt = base.replace(/\.[A-Za-z0-9]+$/, '');
  try{ var c = phCodeOf(base); if(c) return c; }catch(e){}
  try{
    if(typeof SUGAI !== 'undefined' && SUGAI.noteCode){
      var n = SUGAI.noteCode(noExt);
      if(n) return String(n).toUpperCase();
    }
  }catch(e){}
  return '';
}''',
r'''/* v56 : 한 조각(파일 이름 또는 폴더 이름)에서 위치 코드 읽기
     13524_PC실 · 1층-HALL1L-복도-왼쪽 · 지하1층-EVB1-엘리베이터 안 · 3층-화장실 · 1층-정문 외관 · KTC 동아리실 */
function aidCodeOfPart(t){
  t = String(t || '').trim();
  if(!t) return '';
  var m;
  try{ var c = phCodeOf(t); if(c) return c; }catch(e){}
  var up = t.toUpperCase();
  m = up.match(/(?:^|[^A-Z0-9])(HALL[1-5][LR]|EV[1-5]|WC[1-5]|ES[1-5]|BLD|KTC)(?![A-Z0-9])/); if(m) return m[1];
  m = t.match(/([1-5])\s*층[^0-9가-힣]{0,4}(화장실|WC)/i);                                  if(m) return 'WC' + m[1];
  /* '지하1층-…' 처럼 지하로 시작하면 지하. '1층-후문-지하 계단'은 1층 후문(출입문)이다 */
  if(/^\s*(지하|B1(?![0-9]))/i.test(t)) return 'B1';
  if(/정문|후문|동문|서문|출입구|출입문|건물\s*외부|외관/.test(t)) return 'BLD';
  try{
    if(typeof SUGAI !== 'undefined' && SUGAI.noteCode){
      var n = SUGAI.noteCode(t);
      if(n) return String(n).toUpperCase();
    }
  }catch(e){}
  return '';
}
/* 파일 이름에서 못 찾으면 가까운 폴더 이름부터 차례로 본다 :
     5층/13524_PC실/IMG_0012.jpg  →  13524      복도/3층 복도/왼쪽.jpg → (폴더만으로는 좌우를 몰라 비움) */
function aidCodeFromName(name){
  var parts = String(name || '').split('/').join('').split(String.fromCharCode(92)).join('').split('');
  var base = parts.pop();
  var noExt = base.replace(/\.[A-Za-z0-9]+$/, '');
  var c = aidCodeOfPart(noExt);
  if(c) return c;
  for(var i=parts.length-1;i>=0;i--){
    c = aidCodeOfPart(parts[i]);
    if(c) return c;
  }
  return '';
}
/* v56 : 출입문·지하처럼 한 코드에 여러 장소가 묶인 곳은 이름의 설명 부분을 각도로 남긴다
     1층-정문 외관 → '정문 외관'   지하1층-후문-크리에이티브 존 통로 → '후문 크리에이티브 존 통로' */
function aidDescView(name){
  var base = String(name || '').split('/').pop().split(String.fromCharCode(92)).pop();
  var dot = base.lastIndexOf('.');
  var noExt = (dot > 0 ? base.slice(0, dot) : base).trim();
  var toks = noExt.split(/[-_]+/).map(function(x){ return x.trim(); }).filter(function(x){ return !!x; });
  var keep = toks.filter(function(x){
    return !/^(지하\s*1\s*층|B1|EVB1|[1-5]\s*층|BLD|EV[1-5]|HALL[1-5][LR]|WC[1-5]|\d+)$/i.test(x);
  });
  var v = keep.join(' ').replace(/\s+/g, ' ').trim();
  return (v && v.length <= 16) ? v : '';
}''',
'aidCodeFromName v56')

rep(r'''var AID_VIEW_WORDS = ['왼쪽','좌측','오른쪽','우측','정면','앞','뒤','후면','위','아래',
                      '가까이','멀리','입구','안쪽','창가','복도쪽','전체'];''',
r'''var AID_VIEW_WORDS = ['왼쪽','좌측','오른쪽','우측','정면','앞','뒤','후면','위','아래',
                      '가까이','멀리','입구','안쪽','창가','복도쪽','전체',
                      '엘리베이터 안','엘리베이터 앞','외관','내부','통로','계단'];
/* 긴 낱말부터 맞춰 본다 — '엘리베이터 앞'이 '앞'으로 잘리지 않게 */
AID_VIEW_WORDS.sort(function(a,b){ return b.length - a.length; });''',
'각도 낱말 v56')

rep(r'''        var found = aidCodeFromName(it.n);
        var code = found || fallback;
        var view = aidViewFromName(it.n);''',
r'''        var found = aidCodeFromName(it.n);
        var code = found || fallback;
        var view = aidViewFromName(it.n);
        /* 출입문(BLD)·지하(B1)는 문 이름까지 각도에 남긴다 : '정문 외관' '후문 정면' */
        if((code === 'BLD' || code === 'B1') && typeof aidDescView === 'function'){
          var dv = aidDescView(it.n); if(dv) view = dv;
        }''',
'BLD/B1 각도 설명')

# ── 8) OCR : 앱이 모르는 번호(오독)는 위치로 쓰지 않고 층 힌트로만 쓴다
#    (239장 측정에서 틀린 8장이 전부 13297·13499·13533 처럼 없는 방 번호로 읽힌 경우였다)
rep(r"""    if(!corridor && ocr.code && SCOPE.allow(ocr.code)){
      var idx = -1;""",
r"""    /* v56 : 앱이 모르는 번호(13297처럼 없는 방)는 번호판 오독일 가능성이 크다 — 층 힌트로만 쓴다 */
    var knownOcr = !!ocr.code && !!knownCodes()[String(ocr.code).toUpperCase()];
    if(ocr.code && !knownOcr) res.ocrUnknown = ocr.code;
    if(!corridor && ocr.code && knownOcr && SCOPE.allow(ocr.code)){
      var idx = -1;""",
'OCR 모르는 번호는 층 힌트로만')

io.open(DST, 'w', encoding='utf-8').write(s)
print('\n%d개 패치 적용 → %s (%d bytes)' % (n_ok, DST, len(s.encode('utf-8'))))
