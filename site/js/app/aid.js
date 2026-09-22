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
  for(i=1;i<=5;i++){ set['LNG'+i]=1; set['EVIN'+i]=1; set['SIGN'+i]=1; set['EMS'+i]=1; }   /* v73 */
  ['WIN2','WIN3','WIN4','WIN5L','WIN5R','EVB1'].forEach(function(c){ set[c]=1; });          /* v75 */
  if(typeof ROOM_PHOTOS === 'object') for(k in ROOM_PHOTOS) set[String(k).toUpperCase()] = 1;
  if(typeof SUGAI !== 'undefined' && SUGAI.libAll)
    SUGAI.libAll().forEach(function(r){ set[String(r.code).toUpperCase()] = 1; });
  /* v75 : AI 기준벡터가 '앱이 아는 장소'의 정답지다.
     libAll() 은 기준 데이터를 아직 안 읽었으면 0개를 돌려줘서,
     창밖(WIN)·지하 엘리베이터(EVB1)·동문/서문이 목록에서 빠져 있었다. */
  /* AI 자료(8.5MB)는 필요할 때만 받으므로, 장소 이름은 늘 있는 data/places.js 의 목록을 쓴다 */
  var ac = window.PLACE_CODES || (window.AIVEC_DATA && window.AIVEC_DATA.codes) || [];
  for(i=0;i<ac.length;i++) set[String(ac[i]).toUpperCase()] = 1;
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
  if(c === 'B1' || c === 'EVB1') return '지하 1층';                 /* v76 : EVB1 이 '기타'로 빠졌다 */
  if(/^GATE_/.test(c)) return '건물 외부';                          /* v77 : 출입문이 '기타'로 빠졌다 */
  if(c === 'BLD') return '건물 외부';
  if(c === 'KTC') return '4층';
  /* v73 : EVIN·SIGN·EMS·WIN·LNG 이 전부 '기타'로 빠지고 있었다 (EV 뒤가 숫자가 아니라서) */
  var m = c.match(/^(?:EVIN|EMS|SIGN|WIN|LNG|EV|HALL|WC|ES)([1-5])/);  if(m) return m[1] + '층';
  m = c.match(/^13([1-5])\d{2}/);                if(m) return m[1] + '층';
  return '기타';
}
function aidStatRender(){
  var el = document.getElementById('aidStat');
  if(!el || typeof SUGAI === 'undefined') return;
  var st = SUGAI.libStats();
  if(!SUGAI.libUsable() && !st.n){
    el.innerHTML = '<b style="color:#FF8A8A;">이 브라우저에서는 자료집을 저장할 수 없습니다.</b>' +
                   '<span class="sub">사생활 보호 모드(시크릿)에서는 저장이 막힐 수 있어요. 일반 창에서 열어 주세요.</span>';
    return;
  }
  var total = aidKnownCodes().length;
  var mb = st.bytes / 1048576;
  /* 층별로 몇 장 들어있는지 한눈에 — 비어 있는 층도 회색으로 보여 준다 */
  var byFloor = {};
  SUGAI.libAll().forEach(function(r){ var f = aidFloorOf(r.code); byFloor[f] = (byFloor[f]||0) + 1; });
  var line = AID_FLOORS.filter(function(f){ return f !== '기타' || byFloor[f]; }).map(function(f){
    return byFloor[f] ? ('<b>' + f + ' ' + byFloor[f] + '장</b>')
                      : ('<span style="color:#4A5566">' + f + ' 0</span>');
  }).join(' · ');
  /* v56 : 파일에 담긴 기본 자료집 / 이 기기에서 넣은 것 / 숨긴 것을 구분해서 보여 준다 */
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
  if(un) un.style.display = st.nHidden ? '' : 'none';
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
      var idq = "'" + String(r.id).replace(/[^0-9A-Za-z_-]/g, '') + "'";
      return '<span class="t' + (r.emb ? '' : ' mine') + '">' +
        (r.thumb ? '<img src="'+r.thumb+'" alt="'+c+'" onclick="aidZoom('+idq+')">' : '<img alt="">') +
        (r.v ? '<span class="vw">'+r.v+'</span>' : '') +
        '<button class="x" onclick="aidDel('+idq+')" title="' + (r.emb ? '이 기기에서 숨기기' : '이 사진 빼기') + '">✕</button></span>';
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
      '<button class="del" onclick="aidDelCode(\''+c+'\')">이 위치 전부 빼기</button></div>' +
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
  var r = SUGAI.libAll().filter(function(x){ return String(x.id) === String(id); })[0];
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
/* v56 : 한 조각(파일 이름 또는 폴더 이름)에서 위치 코드 읽기
     13524_PC실 · 1층-HALL1L-복도-왼쪽 · 지하1층-EVB1-엘리베이터 안 · 3층-화장실 · 1층-정문 외관 · KTC 동아리실 */
function aidCodeOfPart(t){
  t = String(t || '').trim();
  if(!t) return '';
  var m;
  try{ var c = phCodeOf(t); if(c) return c; }catch(e){}
  var up = t.toUpperCase();
  m = up.match(/(?:^|[^A-Z0-9])(HALL[1-5][LR]|LNG[1-5]|EV[1-5]|WC[1-5]|EMS[1-5]|ES[1-5]|BLD|KTC)(?![A-Z0-9])/); if(m) return m[1];
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
}

/* 파일 이름 끝의 괄호를 '각도'로 읽는다.
     1층 13501 호실번호 (왼쪽).jpg  →  코드 13501 · 각도 '왼쪽'
   코드는 그대로 두고 각도만 따로 기억하므로, AI는 같은 13501로 보되
   관리자는 어느 각도를 찍어 두었는지 한눈에 볼 수 있다.
   윈도우가 붙이는 '(1)' '(2)' 같은 숫자 괄호는 각도로 보지 않는다. */
var AID_VIEW_WORDS = ['왼쪽','좌측','오른쪽','우측','정면','앞','뒤','후면','위','아래',
                      '가까이','멀리','입구','안쪽','창가','복도쪽','전체',
                      '엘리베이터 안','엘리베이터 앞','외관','내부','통로','계단'];
/* 긴 낱말부터 맞춰 본다 — '엘리베이터 앞'이 '앞'으로 잘리지 않게 */
AID_VIEW_WORDS.sort(function(a,b){ return b.length - a.length; });
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
        /* 출입문(BLD)·지하(B1)는 문 이름까지 각도에 남긴다 : '정문 외관' '후문 정면' */
        if((code === 'BLD' || code === 'B1') && typeof aidDescView === 'function'){
          var dv = aidDescView(it.n); if(dv) view = dv;
        }
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
  if(!confirm('자료집에 넣습니다.\n\n' + lines.join('\n') +
              (miss ? ('\n\n※ 위치를 못 정한 ' + miss + '장은 빼고 넣습니다.') : ''))) return;

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
/* ══════════════════════════════════════════════════════════════
   v57 : 어디인지 직접 고르기 (사람이 고르는 안전망)
   AI는 문이 다 똑같이 생긴 건물에서 번호판을 못 읽으면 확신할 수 없다.
   그럴 때 사진을 보여주고 사람이 고르게 하면 결과는 항상 맞는다.
   고른 답은 곧바로 AI에게 가르치므로, 쓸수록 AI가 스스로 정확해진다.
   ══════════════════════════════════════════════════════════════ */
var PICK = { url:'', note:'', ai:null, after:null, floor:'' };

/* 이 위치를 대표하는 사진 한 장 — ① 앱에 등록된 사진 ② 자료집 사진 */
function pickPhoto(code){
  try{
    var k = (typeof phResolve === 'function') ? phResolve(code) : code;
    var arr = (typeof ROOM_PHOTOS === 'object') ? ROOM_PHOTOS[k] : null;
    if(arr && arr.length && arr[0].u) return arr[0].u;
  }catch(e){}
  try{
    var lib = SUGAI.libAll().filter(function(r){ return r.code === code && r.thumb; });
    if(lib.length) return lib[0].thumb;
  }catch(e){}
  return '';
}
/* 이 위치의 이름 — 13115호 · 학과사무실 */
function pickName(code){
  var lb = (typeof SUGAI !== 'undefined' && SUGAI.codeLabel) ? SUGAI.codeLabel(code) : code;
  return lb || code;
}
function pickSub(code){
  try{
    var base = String(code).split('-')[0];
    var nm = (typeof ROOM_NAME === 'object') ? ROOM_NAME[base] : '';
    if(nm) return (typeof rn === 'function') ? rn(nm) : nm;
  }catch(e){}
  /* 앱에 사진이 없는 방은 자료집 사진의 파일 이름에서 이름을 뽑는다
     '3층-13312-전자공학과 유상선 교수-왼쪽.jpg' → '전자공학과 유상선 교수' */
  try{
    var lib = SUGAI.libAll(), i, j, t, cut;
    for(i=0;i<lib.length;i++){
      if(lib[i].code !== code || !lib[i].n) continue;
      t = String(lib[i].n).replace(/\.[A-Za-z0-9]+$/, '').split('-');
      j = 1;                                   /* 0번은 '3층' */
      while(j < t.length && /^\s*([0-9]+|[A-Za-z])\s*$/.test(t[j])) j++;
      cut = t.length;
      if(lib[i].v && t[cut-1] && t[cut-1].trim() === lib[i].v) cut--;
      var mid = t.slice(j, cut).join('-').trim();
      if(mid && mid !== '표기 없음') return mid;
    }
  }catch(e){}
  return '';
}
function pickCard(code, sim, best){
  var u = pickPhoto(code), sub = pickSub(code);
  return '<button class="pkCard' + (best ? ' best' : '') + '" onclick="pickChoose(\'' +
    String(code).replace(/[^0-9A-Za-z_-]/g, '') + '\')">' +
    (u ? '<img src="' + u + '" alt="">' : '<span class="noimg">🏛</span>') +
    '<span class="nm">' + pickName(code) + '</span>' +
    (sub ? '<span class="sub">' + sub + '</span>' : '') +
    (sim ? '<span class="sim">닮은 정도 ' + Math.round(sim*100) + '%</span>' : '') +
    '</button>';
}
/* 접수 범위 안의 장소를 층별로 모은다 */
function pickPlaces(floor){
  var out = [], i, k;
  var add = function(c){
    if(out.indexOf(c) >= 0) return;
    if(typeof SUGAI !== 'undefined' && SUGAI.SCOPE && !SUGAI.SCOPE.allow(c)) return;
    if(typeof aidFloorOf === 'function' && aidFloorOf(c) !== floor) return;
    out.push(c);
  };
  if(typeof VALID_FULL5 === 'object') for(k in VALID_FULL5) add(k);
  if(typeof ROOM_PHOTOS === 'object') for(k in ROOM_PHOTOS) add(String(k).toUpperCase());
  for(i=1;i<=5;i++){ add('EV'+i); add('HALL'+i+'L'); add('HALL'+i+'R'); add('WC'+i); }
  add('B1'); add('BLD'); add('KTC');
  out.sort();
  return out;
}
/* 번호나 이름으로 바로 찾기 — 문 앞에 서 있으면 번호판을 보고 치는 게 가장 빠르다 */
function pickAllPlaces(){
  var out = [], f, i;
  var fs = ['지하 1층','1층','2층','3층','4층','5층','건물 외부'];
  for(i=0;i<fs.length;i++) out = out.concat(pickPlaces(fs[i]));
  return out;
}
function pickSearch(){
  var el = document.getElementById('pkQ'), box = document.getElementById('pkAll');
  if(!el || !box) return;
  var q = el.value.trim().toLowerCase().replace(/\s+/g, '');
  if(!q){
    if(PICK.floor) pickFloorSel(PICK.floor); else box.innerHTML = '';
    return;
  }
  var hit = pickAllPlaces().filter(function(c){
    var t = (String(c) + ' ' + pickName(c) + ' ' + pickSub(c)).toLowerCase().replace(/\s+/g, '');
    return t.indexOf(q) >= 0;
  }).slice(0, 60);
  var row = document.getElementById('pkFloors');
  if(row) Array.prototype.forEach.call(row.querySelectorAll('button'), function(b){ b.classList.remove('on'); });
  PICK.floor = '';
  box.innerHTML = hit.length ? hit.map(function(c){ return pickCard(c, 0, false); }).join('')
                             : '<div class="mini">찾는 곳이 없습니다. 층을 골라 목록에서 찾아보세요.</div>';
}
function pickFloorSel(f){
  PICK.floor = f;
  var q0 = document.getElementById('pkQ'); if(q0) q0.value = '';
  var row = document.getElementById('pkFloors');
  if(row) Array.prototype.forEach.call(row.querySelectorAll('button'), function(b){
    b.classList.toggle('on', b.getAttribute('data-f') === f);
  });
  var box = document.getElementById('pkAll');
  if(!box) return;
  var list = pickPlaces(f);
  box.innerHTML = list.length ? list.map(function(c){ return pickCard(c, 0, false); }).join('')
                              : '<div class="mini">이 층에 등록된 장소가 없습니다.</div>';
}
/* 판정 결과를 들고 고르기 화면을 연다.
   after(code) 로 고른 결과를 돌려준다 (code 가 '' 면 모르겠음). */
function pickOpen(url, note, ai, after){
  PICK = { url:url, note:note, ai:ai, after:after, floor:'' };
  var sh = document.getElementById('pkShot'); if(sh) sh.src = url;
  var why = document.getElementById('pkWhy');
  if(why){
    var v = ai && ai.verdict, txt;
    if(ai && ai.ocr && ai.ocr.code && ai.codeSource === 'ocr')
      txt = '문패에서 <b>' + ai.ocr.code + '</b> 을(를) 읽었어요. 맞는지 확인해 주세요.';
    else if(v === 'irrelevant' || v === 'out_of_scope')
      txt = '<b>AI가 이 사진의 위치를 찾지 못했어요.</b><br>공대 3호관은 문과 복도가 층마다 비슷하게 생겨서, 문패가 안 보이면 AI도 헷갈립니다.';
    else
      txt = '<b>AI가 확신하지 못했어요.</b><br>아래에서 <span class="hi">맞는 곳을 눌러 주세요.</span> 한 번만 골라 주시면 AI가 배웁니다.';
    why.innerHTML = txt;
  }
  var sug = document.getElementById('pkSug'), lab = document.getElementById('pkSugLab');
  var cands = (ai && (ai.all || ai.top)) ? (ai.all || ai.top).slice(0, 5) : [];
  if(sug){
    sug.innerHTML = cands.map(function(c, i){ return pickCard(c.code, c.sim, i === 0); }).join('');
    if(lab) lab.style.display = cands.length ? '' : 'none';
  }
  var fr = document.getElementById('pkFloors');
  if(fr){
    var fs = ['지하 1층','1층','2층','3층','4층','5층','건물 외부'];
    fr.innerHTML = fs.map(function(f){
      return '<button type="button" data-f="' + f + '" onclick="pickFloorSel(\'' + f + '\')">' + f + '</button>';
    }).join('');
  }
  var all = document.getElementById('pkAll'); if(all) all.innerHTML = '';
  var q = document.getElementById('pkQ'); if(q) q.value = '';
  var sc = document.getElementById('spick'); if(sc) sc.scrollTop = 0;
  /* 메모나 층 버튼으로 층을 이미 알려줬으면 그 층을 미리 펼쳐 준다 */
  var pre = '';
  try{ pre = (typeof SUGAI !== 'undefined' && SUGAI.noteFloor) ? (SUGAI.noteFloor(note) || '') : ''; }catch(e){}
  if(!pre && ai && ai.noteFloor) pre = ai.noteFloor;
  if(!pre && ai && ai.ocr && ai.ocr.floor) pre = ai.ocr.floor;
  go('spick');
  if(pre) setTimeout(function(){ pickFloorSel(pre); }, 0);
}
function pickChoose(code){
  if(!code) return;
  var ai = PICK.ai || {};
  ai.code = code;
  ai.pickedByUser = true;
  ai.verdict = 'match';
  ai.sim = ai.sim || 0;
  /* 고른 답을 AI에게 가르친다 — 다음부터 같은 자리는 AI가 알아본다 */
  try{ if(typeof SUGAI !== 'undefined' && SUGAI.learn) SUGAI.learn(code, PICK.url); }catch(e){}
  var after = PICK.after;
  PICK.after = null;
  if(after) after(code, ai);
}
function pickUnknown(){
  var ai = PICK.ai || {};
  ai.pickedByUser = false;
  ai.userUnknown = true;
  var after = PICK.after;
  PICK.after = null;
  if(after) after('', ai);
}
function pickCancel(){
  PICK.after = null;
  go('ssug');
}

function aidClearAll(){
  if(!confirm('자료집을 전부 비울까요?\n· 앱 파일에 담긴 기본 자료는 이 기기에서만 숨겨집니다 (되돌리기 가능)\n· 이 기기에서 넣은 사진은 지워집니다\n(앱에 원래 들어있던 사진 학습은 그대로 남습니다)')) return;
  SUGAI.libClear().then(function(){ aidProg(''); aidRender(); })['catch'](function(){ aidProg('비우지 못했습니다.'); });
}
/* v56 : 숨긴 기본 자료 되돌리기 */
function aidUnhide(){
  SUGAI.libUnhideAll().then(function(){ aidProg('숨겼던 기본 자료를 되돌렸습니다.'); aidRender(); })
    ['catch'](function(){ aidProg('되돌리지 못했습니다.'); });
}
/* 지금 자료집을 data/ailib.js 파일로 내려받기
   내려받은 파일로 site/data/ailib.js 를 바꿔 올리면 모든 사용자의 AI가 같은 자료집을 쓴다.
   (예전에는 자료집을 박은 index.html 을 통째로 내려받게 했다) */
function aidExportFile(){
  if(typeof SUGAI === 'undefined') return;
  var st = SUGAI.libStats();
  if(!st.n){ alert('자료집이 비어 있습니다.'); return; }
  var msg = '자료집 ' + st.n + '장을 담은 ailib.js 를 내려받습니다.' +
            (st.nMine ? '\n(이 기기에서 넣은 ' + st.nMine + '장이 새로 담깁니다)' : '') +
            (st.nHidden ? '\n(숨긴 ' + st.nHidden + '장은 빠집니다)' : '') +
            '\n\n내려받은 파일로 site/data/ailib.js 를 바꿔 올리면\n모든 사용자의 AI가 이 자료집을 씁니다.';
  if(!confirm(msg)) return;
  try{
    var js = '/* AI 사진 자료집 — 관리자 화면 \'AI 사진 자료집\'에서 내려받은 파일 */\n' +
             'window.AILIB_DATA = ' + SUGAI.libExport() + ';\n';
    saveBlob(new Blob([js], {type:'text/javascript;charset=utf-8'}), 'ailib.js');
    aidProg('✓ ailib.js 를 내려받았습니다 (자료집 ' + st.n + '장, 약 ' + (js.length/1048576).toFixed(1) + 'MB). ' +
            'site/data/ailib.js 를 이 파일로 바꿔 올리면 모든 사용자에게 적용됩니다.');
  }catch(e){ aidProg('파일을 만들지 못했습니다. (' + (e && e.message || e) + ')'); }
}
