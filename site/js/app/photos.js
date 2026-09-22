"use strict";
/* photos.js — 장소 사진 — 목록 정리 · 사진 이름 읽기 · 사진 넣기(관리자) · AI 도우미 · 사진 자료 묶음 · 사진 상자
   (예전 한 파일 main.js 의 15169~16213줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
/* ================================================================
   ③ 사진 라이브러리 — 호실 사진을 앱에 넣는 기능
   ----------------------------------------------------------------
   ROOM_PHOTOS['13201'] = [{n:'파일명', u:'data:image/jpeg;base64,...'}, ...]
   파일 이름에 들어 있는 5자리 호실번호를 읽어 자동으로 분류합니다.
   ================================================================ */
var ROOM_PHOTOS = {};
var PH_MAXDIM = 1280;      // 저장할 때 줄이는 최대 가로/세로 픽셀
var PH_Q      = 0.72;      // JPEG 품질
var PH_SKIP   = [];        // 호실번호를 못 찾은 파일 이름

/* 미리 담겨 있는 사진이 있으면 불러오기 */
(function(){
  /* 사진 목록은 data/photos.js 가 window.PHOTO_INDEX 에 넣는다. 고쳐도 원본이 안 바뀌게 복사해서 쓴다. */
  if(window.PHOTO_INDEX){ try{ ROOM_PHOTOS = JSON.parse(JSON.stringify(window.PHOTO_INDEX)) || {}; }catch(e){ ROOM_PHOTOS = {}; } }
})();

/* v147: 길안내 1단계에서 쓸 '문별 사진'.
   확인 화면(여기가 맞나요?)이 쓰는 바로 그 사진 한 장만 골라 따로 등록한다 —
   code를 'BLD'로 주면 건물 사진 8장이 전부 딸려 와 눌러 넘기게 되기 때문이다.
   사진 객체를 그대로 참조하므로 용량은 늘지 않는다. */
function phBuildGateLists(){
  var list = ROOM_PHOTOS['BLD'];
  if(!list || !list.length) return;
  var MAP = {MAIN:'정문내부', BACK:'후문내부', EAST:'동문내부', WEST:'서문내부'};
  Object.keys(MAP).forEach(function(k){
    var tag = '('+MAP[k]+')', outer = '('+MAP[k].replace('내부','')+')', hit=null, alt=null;
    for(var i=0;i<list.length;i++){
      var t = (list[i].cap||'')+' '+(list[i].n||'');
      if(t.indexOf(tag)!==-1){ hit=list[i]; break; }
      if(!alt && t.indexOf(outer)!==-1) alt=list[i];
    }
    var pick = hit || alt;
    if(pick) ROOM_PHOTOS['GATE_'+k] = [pick];
  });
}

/* 공용 사진 정리 : 캡션과 사진이 어긋나는 문제를 막는다.
   ① EV1~EV5 에는 '엘리베이터'가 들어간 사진만 남기고(예: 'EV1_정문 들어가는 길'은
      캡션이 "1층 엘리베이터 앞"으로 나와 처음 온 사람이 헷갈리므로) 건물 외부(BLD)로 옮긴다.
   ② 파일명 끝 번호(-1,-2,…)순으로 정렬해 첫 장이 항상 대표 사진이 되게 한다. */
function phNormalize(){
  phBuildGateLists();          // v147: 문별 한 장짜리 목록도 같이 갱신
  ['EV1','EV2','EV3','EV4','EV5'].forEach(function(k){
    var list = ROOM_PHOTOS[k]; if(!list || !list.length) return;
    var keep = [], move = [];
    list.forEach(function(p){ (/엘리베이터/.test(p.n) ? keep : move).push(p); });
    if(!keep.length) return;                 // 엘리베이터 사진이 하나도 없으면 그대로 둔다
    ROOM_PHOTOS[k] = keep;
    if(move.length){
      if(!ROOM_PHOTOS.BLD) ROOM_PHOTOS.BLD = [];
      move.forEach(function(p){
        if(!ROOM_PHOTOS.BLD.some(function(x){ return x.n === p.n; })) ROOM_PHOTOS.BLD.push(p);
      });
    }
  });
  function seq(n){ var m = String(n).match(/-(\d+)\.jpe?g$/i); return m ? parseInt(m[1],10) : 0; }
  Object.keys(ROOM_PHOTOS).forEach(function(k){
    if(!/^(BLD|B1|EV[1-5]|HALL[1-5][LR]|WC[1-5]|ES[1-5]|EMS[1-5]|LNG[1-5])$/.test(k)) return;   /* v79 */
    ROOM_PHOTOS[k].sort(function(a,b){ return seq(a.n) - seq(b.n); });
  });
}
phNormalize();
sphApplyDeleted();

/* 호실 외 공용 사진 키
   BLD=건물 외부 · B1=지하1층 · EV1~EV5=각 층 엘리베이터 앞 · HALL1L~HALL5R=각 층 왼쪽/오른쪽 복도 */
var PH_LABEL = {BLD:'공대 3호관', B1:'지하 1층'};
var PH_LABEL_EN = {BLD:'Engineering Bldg.3', B1:'B1'};
(function(){
  for(var i=1;i<=5;i++){
    PH_LABEL['EV'+i]      = i+'층 엘리베이터 앞';
    PH_LABEL['HALL'+i+'L']= i+'층 왼쪽 복도';
    PH_LABEL['HALL'+i+'R']= i+'층 오른쪽 복도';
    PH_LABEL['WC'+i]      = i+'층 화장실';
    PH_LABEL['ES'+i]      = i+'층 계단';                /* v79 : AI 쪽과 같게 — ES = 계단, EMS = 비상계단 */
    PH_LABEL['EMS'+i]     = i+'층 비상계단';
    PH_LABEL_EN['EV'+i]      = 'Floor '+i+' elevator';
    PH_LABEL_EN['HALL'+i+'L']= 'Floor '+i+' left hallway';
    PH_LABEL_EN['HALL'+i+'R']= 'Floor '+i+' right hallway';
    PH_LABEL_EN['WC'+i]      = 'Floor '+i+' restroom';
    PH_LABEL_EN['ES'+i]      = 'Floor '+i+' stairs';
    PH_LABEL_EN['EMS'+i]     = 'Floor '+i+' emergency stairs';
  }
})();
function phCap(code){
  if(LANG==='en' && PH_LABEL_EN[code]) return PH_LABEL_EN[code];
  if(PH_LABEL[code]) return PH_LABEL[code];
  if(!/^\d{5}/.test(code)) return rn(ROOM_NAME[code]) || code;   // KTC 등 숫자가 아닌 코드는 '호' 붙이지 않음
  return code + ((LANG==='ko')?'호':'');
}

/* ── 호실 이름(용도) 인덱스 : 사진 파일명에서 자동 추출 ──
   파일명 형식 "N. 13115_학과사무실-1.jpg" 에서 '학과사무실'만 뽑아
   ROOM_NAME[13115] = '학과사무실' 로 저장. 별도 데이터 입력 없이 사진만으로 만들어짐. */
/* 방 이름(용도)은 사진 파일명에서 그대로 뽑히므로 대부분 특정 연구실·교수님 성함처럼
   고유명사라 자동 번역이 위험하다. 다만 아래처럼 자주 나오는 일반 용어 몇 개만
   영어 표기를 함께 등록해 두고, 없는 이름은 원문(한글)을 그대로 보여준다. */
var ROOM_NAME_EN = {
  '강의실':'Classroom', '대학원 강의실':'Graduate Classroom',
  'PC 실습실':'PC Lab', 'PC실':'PC Lab', '임베디드실습실':'Embedded Systems Lab',
  '학과사무실':'Department Office', '학부장실':"Dean's Office", '안내실':'Information Desk',
  '캡스톤디자인실':'Capstone Design Room', '캡스톤디자인 취업실':'Capstone Design Career Room',
  '캡스톤 디자인 실습실':'Capstone Design Practice Room', '캡스톤디자인 회의실':'Capstone Design Meeting Room',
  '명예교수 및 시간강사실':'Emeritus & Adjunct Faculty Office'
};
function rn(nm){ if(!nm || LANG!=='en') return nm; return ROOM_NAME_EN[nm] || nm; }
var ROOM_NAME = {};
/* 사진을 새로 등록한 뒤에도 방 이름을 다시 뽑을 수 있게 이름 있는 함수로 둔다. */
function phRebuildRoomNames(){
  function nameFrom(fn){
    var m = String(fn).match(/^\s*\d+\.\s*[^_]+_(.+?)(?:-\d+)?\.jpe?g$/i);
    return m ? m[1].trim() : null;
  }
  Object.keys(ROOM_PHOTOS).forEach(function(k){
    var code = k.split('-')[0];              // 13121-A → 13121
    if(!/^\d{5}$/.test(code)) return;
    if(ROOM_NAME[code]) return;
    (ROOM_PHOTOS[k]||[]).some(function(p){
      var nm = nameFrom(p.n);
      if(nm && nm!=='표기 없음'){ ROOM_NAME[code]=/교수$/.test(nm)?(nm+'님 연구실'):nm; return true; }
      return false;
    });
  });
}
phRebuildRoomNames();
/* 캡션·상세에서 '13115호 · 학과사무실' 처럼 이름을 곁들임 */
/* 층 상세 칸 안에 한 줄로 곁들일 짧은 이름.
   앞의 학과·전공 표기와 '·' 뒤 두 번째 이름을 떼고, 그래도 길면 끝을 줄인다. */
function shortRoomName(nm){
  if(!nm) return '';
  var t = String(nm).split('·')[0].trim();
  t = t.replace(/^\S*(?:공학과|공학전공|융합전공|전공|학과)\s+/, '');
  if(t.length > 13) t = t.slice(0,12) + '…';
  return t;
}
function roomTitle(code, forceLang){
  var lang = forceLang || LANG;
  var raw = ROOM_NAME[code];
  var nm = (lang==='en') ? ((ROOM_NAME_EN[raw]) || raw) : raw;
  if(lang==='en') return nm ? ('Room '+code+' · '+nm) : ('Room '+code);
  return nm ? (code+'호 · '+nm) : (code+'호');
}
/* 한국어 주격 조사(이/가) — 앞 글자 받침 여부로 결정 */
function subjParticle(word){
  var c = word.charCodeAt(word.length-1);
  if(c>=0xAC00 && c<=0xD7A3) return ((c-0xAC00)%28!==0) ? '이' : '가';
  return '가';
}

function phCodeOf(path){
  var b = String(path).split('/').pop().split('\\').pop();
  var sp = b.match(/^(BLD|B1|EV[1-5]|HALL[1-5][LR]|WC[1-5]|EMS[1-5]|ES[1-5]|LNG[1-5])(?![0-9A-Za-z가-힣])/i);   /* v79 */
  if(sp) return sp[1].toUpperCase();
  if(/^\s*(\d+\.\s*)?ktc/i.test(b) || /_KTC|KTC동아리|KTC 동아리/i.test(b)) return 'KTC';
  var m = b.match(/13[1-5]\d{2}/);
  if(!m) return null;
  var code = m[0];
  var mm = b.slice(m.index + 5).match(/^\s*[-_]?\s*([AB])(?![0-9A-Za-z가-힣])/i);
  if(mm) code += '-' + mm[1].toUpperCase();
  return code;
}

/* ══════════════════════════════════════════════════════════════════
   PHFIX — 사진 읽기 안정화 (v44)

   기존 phShrink는 브라우저가 파일을 못 읽으면 그냥 실패했다. 특히
   아이폰 기본 촬영 포맷인 HEIC는 사파리는 읽지만 안드로이드 크롬은
   못 읽어서, "사진을 처리하지 못했어요" 한 줄만 뜨고 끝났다.

   · 파일 앞부분(매직 넘버)을 읽어 실제 형식을 알아낸다 (확장자는 못 믿는다)
   · HEIC면 heic2any를 그때 내려받아 변환한다
   · 읽기를 3단계로 시도한다 (createImageBitmap → blob URL → FileReader)
   · 아이폰 캔버스 픽셀 한계(약 1,670만)에 맞춰 자동 축소
   · 실패 원인을 PHFIX.lastError 에 남겨 사용자에게 이유를 알려준다
   ══════════════════════════════════════════════════════════════════ */
var PHFIX = (function(){
  'use strict';
  var IOS_MAX_PX = 16700000;        // 아이폰 사파리 캔버스 상한
  var HEIC2ANY = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
  var heicLoading = null;

  function sniff(buf){
    var b = new Uint8Array(buf);
    if(b.length < 12) return 'empty';
    if(b[0]===0xFF && b[1]===0xD8) return 'jpeg';
    if(b[0]===0x89 && b[1]===0x50 && b[2]===0x4E && b[3]===0x47) return 'png';
    if(b[0]===0x47 && b[1]===0x49 && b[2]===0x46) return 'gif';
    if(b[0]===0x42 && b[1]===0x4D) return 'bmp';
    var s = String.fromCharCode(b[4],b[5],b[6],b[7]);
    if(s === 'ftyp'){
      var brand = String.fromCharCode(b[8],b[9],b[10],b[11]).toLowerCase();
      if(brand.indexOf('heic')===0 || brand.indexOf('heix')===0 ||
         brand.indexOf('hevc')===0 || brand.indexOf('mif1')===0 ||
         brand.indexOf('msf1')===0 || brand.indexOf('heim')===0) return 'heic';
      if(brand.indexOf('avif')===0 || brand.indexOf('avis')===0) return 'avif';
      return 'video';
    }
    if(String.fromCharCode(b[0],b[1],b[2],b[3])==='RIFF' &&
       String.fromCharCode(b[8],b[9],b[10],b[11])==='WEBP') return 'webp';
    return 'unknown';
  }

  function head(blob){
    return new Promise(function(res){
      var r = new FileReader();
      r.onload  = function(){ res(sniff(r.result)); };
      r.onerror = function(){ res('unreadable'); };
      r.readAsArrayBuffer(blob.slice(0, 16));
    });
  }

  function loadHeic(){
    if(window.heic2any) return Promise.resolve(true);
    if(heicLoading) return heicLoading;
    heicLoading = new Promise(function(res){
      var sc = document.createElement('script');
      sc.src = HEIC2ANY;
      sc.onload  = function(){ res(!!window.heic2any); };
      sc.onerror = function(){ res(false); };
      document.head.appendChild(sc);
      setTimeout(function(){ res(!!window.heic2any); }, 20000);
    });
    return heicLoading;
  }

  /* 세 가지 방법으로 이미지 열기를 시도한다 */
  function decode(blob){
    return new Promise(function(res, rej){
      function viaImg(){
        var u = URL.createObjectURL(blob), im = new Image();
        im.onload  = function(){ res({el:im, w:im.naturalWidth, h:im.naturalHeight, url:u}); };
        im.onerror = function(){ URL.revokeObjectURL(u); viaReader(); };
        im.src = u;
      }
      function viaReader(){
        var r = new FileReader();
        r.onload = function(){
          var im = new Image();
          im.onload  = function(){ res({el:im, w:im.naturalWidth, h:im.naturalHeight}); };
          im.onerror = function(){ rej('decode'); };
          im.src = r.result;
        };
        r.onerror = function(){ rej('read'); };
        r.readAsDataURL(blob);
      }
      if(window.createImageBitmap){
        createImageBitmap(blob, {imageOrientation:'from-image'}).then(function(bm){
          res({el:bm, w:bm.width, h:bm.height, bitmap:bm});
        })['catch'](viaImg);
      } else viaImg();
    });
  }

  var lastError = '';
  function shrink(blob, cb, maxdim, quality){
    lastError = '';
    if(!blob || !blob.size){ lastError='empty'; cb(null); return; }

    head(blob).then(function(kind){
      PHFIX.lastKind = kind;
      if(kind === 'video'){ lastError='video'; cb(null); return null; }
      if(kind === 'empty' || kind === 'unreadable'){ lastError='corrupt'; cb(null); return null; }

      if(kind === 'heic'){
        /* 사파리는 HEIC를 그대로 읽으므로 먼저 시도하고, 실패할 때만 변환한다 */
        return decode(blob)['catch'](function(){
          if(typeof phHeicNote === 'function') phHeicNote(true);
          return loadHeic().then(function(ok){
            if(!ok){ throw 'heic-nolib'; }
            return window.heic2any({blob: blob, toType:'image/jpeg', quality:0.85});
          }).then(function(out){
            var b = Array.isArray(out) ? out[0] : out;
            return decode(b);
          }).then(function(d){
            if(typeof phHeicNote === 'function') phHeicNote(false);
            return d;
          }, function(e){
            /* Promise.finally 는 구형 브라우저에 없어서 then(성공,실패) 두 갈래로 처리한다 */
            if(typeof phHeicNote === 'function') phHeicNote(false);
            throw e;
          });
        });
      }
      return decode(blob);
    }).then(function(d){
      if(!d) return;
      var w = d.w, h = d.h;
      if(!w || !h){ lastError='decode'; cb(null); return; }
      var sc = Math.min(1, (maxdim || PH_MAXDIM) / Math.max(w, h));
      /* 아이폰 캔버스 픽셀 한계 대응 */
      if(w*sc * h*sc > IOS_MAX_PX) sc = Math.sqrt(IOS_MAX_PX / (w*h));
      var cv = document.createElement('canvas');
      cv.width  = Math.max(1, Math.round(w*sc));
      cv.height = Math.max(1, Math.round(h*sc));
      try{
        cv.getContext('2d').drawImage(d.el, 0, 0, cv.width, cv.height);
        var out = cv.toDataURL('image/jpeg', quality || PH_Q);
        if(d.url) URL.revokeObjectURL(d.url);
        if(d.bitmap && d.bitmap.close) d.bitmap.close();
        cb(out);
      }catch(e){ lastError='canvas'; cb(null); }
    })['catch'](function(e){
      lastError = (typeof e === 'string') ? e : 'decode';
      cb(null);
    });
  }

  /* 실패 원인을 사람이 읽을 수 있는 문장으로 */
  function reason(){
    var ko = (typeof LANG==='undefined' || LANG==='ko');
    switch(lastError){
      case 'video':     return ko?'사진이 아니라 동영상 파일이에요. 사진으로 다시 올려주세요.'
                                 :'That is a video, not a photo. Please upload a photo.';
      case 'empty':     return ko?'파일이 비어 있어요.':'The file is empty.';
      case 'corrupt':   return ko?'파일이 손상됐거나 지원하지 않는 형식이에요.':'The file is damaged or unsupported.';
      case 'heic-nolib':return ko?'아이폰 HEIC 사진이에요. 인터넷 연결을 확인하시거나, [설정 › 카메라 › 포맷]을 "높은 호환성"으로 바꾼 뒤 다시 찍어주세요.'
                                 :'This is an iPhone HEIC photo. Check your connection, or set Settings › Camera › Formats to "Most Compatible" and retake.';
      case 'canvas':    return ko?'사진이 너무 커서 처리하지 못했어요. 조금 작게 찍어주세요.':'The photo is too large to process.';
      default:          return ko?'사진을 열지 못했어요. 다른 사진으로 다시 시도해 주세요.':'Could not open the photo. Please try another one.';
    }
  }

  /* 콘솔 진단 : PHFIX.check() 후 사진을 고르면 형식·원인이 출력된다 */
  function check(){
    var i = document.createElement('input'); i.type='file'; i.accept='image/*';
    i.onchange = function(){
      var f = i.files[0]; if(!f) return;
      head(f).then(function(k){
        console.log('파일명 :', f.name, '\nMIME :', f.type || '(없음)', '\n실제형식 :', k, '\n크기 :', (f.size/1024).toFixed(0)+'KB');
        shrink(f, function(u){ console.log('처리결과 :', u ? '성공 ('+(u.length/1024).toFixed(0)+'KB)' : '실패 — '+lastError); });
      });
    };
    i.click();
  }

  return { shrink:shrink, sniff:sniff, head:head, check:check, reason:reason,
           get lastError(){ return lastError; }, lastKind:'' };
})();

/* HEIC 변환 중 안내 */
function phHeicNote(on){
  var st = document.getElementById('sugStat');
  if(!st) return;
  if(on){ st.style.color='#FFC93C'; st.textContent=(LANG==='ko')?'아이폰 사진을 변환하는 중…':'Converting iPhone photo…'; st.classList.add('on'); }
}

function phShrink(blob, cb, maxdim, quality){ PHFIX.shrink(blob, cb, maxdim, quality); }

function phIsImg(n){ return /\.(jpe?g|png|webp|gif|bmp)$/i.test(n); }

/* 파일/ZIP 목록 → 사진 목록으로 펼치기 */
function phCollect(files, done){
  var out = [], pend = 0, i;
  function fin(){ if(pend===0) done(out); }
  for(i=0;i<files.length;i++){
    (function(f){
      var nm = f.webkitRelativePath || f.name;
      if(/\.zip$/i.test(nm)){
        if(typeof JSZip === 'undefined'){ PH_SKIP.push(nm + ' (인터넷 연결 필요)'); return; }
        pend++;
        JSZip.loadAsync(f).then(function(z){
          var ents = [];
          z.forEach(function(rel, e){ if(!e.dir && phIsImg(rel)) ents.push(e); });
          var k = 0;
          (function nextE(){
            if(k >= ents.length){ pend--; fin(); return; }
            var e = ents[k++];
            e.async('blob').then(function(b){ out.push({n:e.name, b:b}); nextE(); })
                           .catch(function(){ nextE(); });
          })();
        }).catch(function(){ PH_SKIP.push(nm + ' (압축 열기 실패)'); pend--; fin(); });
      } else if(phIsImg(nm)){
        out.push({n:nm, b:f});
      }
    })(files[i]);
  }
  fin();
}

var phBusy = false;
function phAdd(files){
  if(phBusy) return;
  phBusy = true; PH_SKIP = [];
  phSay('파일을 여는 중…', 2);
  phCollect(files, function(items){
    if(!items.length){ phBusy=false; phSay('넣을 수 있는 사진이 없습니다. (jpg·png·zip)', 0); return; }
    var i = 0, ok = 0;
    (function step(){
      if(i >= items.length){
        phBusy = false;
        phSay('사진 ' + ok + '장을 읽었습니다. 넣을 위치를 확인해 주세요.', 100);
        if(ok) go('phsort'); else phRender();
        return;
      }
      var it = items[i++];
      phSay('사진 읽는 중…  ' + i + ' / ' + items.length, Math.round(i/items.length*100));
      /* 예전에는 파일명에서 호실번호를 못 찾으면 그 자리에서 버렸다(=직접 넣을 방법이 없었음).
         이제는 위치를 비워 둔 채로 대기 목록(PH_STAGE)에 담아 두고,
         '넣을 위치 확인' 화면에서 사람이 직접 지정할 수 있게 한다. */
      phShrink(it.b, function(url){
        if(url){
          var base = it.n.split('/').pop();
          var code = phCodeOf(it.n);
          PH_STAGE.push({n:base, u:url, code:code || '', auto:!!code, sel:false});
          ok++;
        } else { PH_SKIP.push(it.n.split('/').pop()); }
        setTimeout(step, 0);
      });
    })();
  });
}

function phSay(msg, pct){
  var st = document.getElementById('phStat');
  if(!st) return;
  st.firstChild.nodeValue = msg + ' ';
  var b = document.getElementById('phBar');
  if(b) b.style.width = (pct||0) + '%';
}

function phCount(){ var n=0; for(var k in ROOM_PHOTOS) n += ROOM_PHOTOS[k].length; return n; }

function phFloorOf(code){
  if(code === 'KTC') return 4;
  var m = String(code).match(/^(?:EV|HALL|WC|ES)([1-5])/);
  if(m) return parseInt(m[1], 10);
  if(code === 'BLD' || code === 'B1') return 0;
  var d = parseInt(String(code).substr(2,1), 10);
  return (d>=1 && d<=5) ? d : null;
}


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
  if(!code){ alert('이 장소 이름을 입력해 주세요. (예: 13210, HALL3L)'); return; }
  if(typeof SUGAI!=='undefined' && SUGAI.SCOPE && !SUGAI.SCOPE.allow(code)){
    if(!confirm('「'+code+'」은 건의함 접수 범위(지하 1층~5층·출입문) 밖입니다.\n앱에 사진은 넣을 수 있지만, 이 장소 제보는 AI가 받지 않습니다.\n그래도 넣을까요?')) return;
  }
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

/* ══════════ 넣을 위치 확인 / 직접 배치 ══════════
   PH_STAGE : 아직 ROOM_PHOTOS에 반영되지 않은 대기 사진들
              [{n:파일명, u:데이터URL, code:'13524'|'', auto:자동분류여부, sel:선택여부}] */
var PH_STAGE = [];
var PH_ONLY_NONE = false;      // '미지정만 보기' 필터
var PH_PICK_IDX = -1;          // 위치 고르기 대상 (-1 = 선택한 것 여러 장)

/* 고를 수 있는 모든 위치 목록 — 공용 자리 + 실제로 존재하는 모든 호실 */
/* 층 구분값(f) : 'BLD'=건물 외부, 'B1'=지하 1층, 1~5=해당 층
   ft = 그 층을 가리키는 검색어 모음. 호실 이름에는 '3층' 같은 표기가 없어서
        '3층'으로 검색해도 공용 자리만 나왔는데, 이 값을 같이 훑어 층 검색이 되게 한다. */
var PH_FLOOR_TABS = [
  {f:null,  name:'전체'},
  {f:'BLD', name:'건물 외부'},
  {f:'B1',  name:'지하'},
  {f:1, name:'1층'}, {f:2, name:'2층'}, {f:3, name:'3층'},
  {f:4, name:'4층'}, {f:5, name:'5층'}
];
function phFloorWords(f){
  if(f === 'BLD') return '건물 외부 바깥 정면 출입문 외관 bld';
  if(f === 'B1')  return '지하 지하1층 지하 1층 b1 지하층';
  return f + '층 ' + f + ' 층 ' + f + 'f';
}
function phTargets(){
  var out = [];
  out.push({code:'BLD', label:'건물 외부 · 출입문', g:'건물 외부', f:'BLD'});
  out.push({code:'B1',  label:'지하 1층',          g:'지하 1층',   f:'B1'});
  for(var i=1;i<=5;i++){
    out.push({code:'EV'+i,       label:i+'층 엘리베이터 앞', g:i+'층 공용', f:i});
    out.push({code:'HALL'+i+'L', label:i+'층 왼쪽 복도',    g:i+'층 공용', f:i});
    out.push({code:'HALL'+i+'R', label:i+'층 오른쪽 복도',  g:i+'층 공용', f:i});
    out.push({code:'WC'+i,       label:i+'층 화장실',       g:i+'층 공용', f:i});
    out.push({code:'ES'+i,       label:i+'층 계단',         g:i+'층 공용', f:i});
    out.push({code:'EMS'+i,      label:i+'층 비상계단',     g:i+'층 공용', f:i});   /* v79 */
    if(i === 4) out.push({code:'KTC', label:'KTC 동아리방',  g:'4층 공용', f:4});
  }
  Object.keys(VALID_FULL5).sort().forEach(function(c){
    var f = phFloorOf(c);
    out.push({code:c, label:c+'호'+(ROOM_NAME[c] ? ' · '+ROOM_NAME[c] : ''),
              g:(f||'?')+'층 호실', f:(f||null)});
  });
  out.forEach(function(t){ t.ft = (t.f===null) ? '' : phFloorWords(t.f); });
  // 층 단추로 걸렀을 때 '공용 자리 → 호실' 순서가 되도록 층 기준으로 안정 정렬
  return out;
}
function phDestName(code){
  if(!code) return '미지정';
  if(PH_LABEL[code]) return PH_LABEL[code];
  if(/^\d{5}/.test(code)) return code+'호'+(ROOM_NAME[code.split('-')[0]] ? ' · '+ROOM_NAME[code.split('-')[0]] : '');
  return code;
}
function phStageStats(){
  var n = {tot:PH_STAGE.length, none:0, sel:0};
  PH_STAGE.forEach(function(x){ if(!x.code) n.none++; if(x.sel) n.sel++; });
  return n;
}
function phSortRender(){
  var box = document.getElementById('phSortList');
  if(!box) return;
  var st = phStageStats();
  var sum = document.getElementById('phSortSum');
  if(sum){
    sum.innerHTML = '사진 <b>'+st.tot+'장</b> 중 자동으로 위치를 찾은 것 <b>'+(st.tot-st.none)+'장</b>'
      + (st.none ? ', <b class="warn">미지정 '+st.none+'장</b>' : '')
      + (st.sel ? '<br>선택됨 <b>'+st.sel+'장</b>' : '')
      + (PH_SKIP.length ? '<br><span style="color:#7C8AA0">읽지 못한 파일 '+PH_SKIP.length+'개는 제외했습니다.</span>' : '');
  }
  var f = document.getElementById('phOnlyNone');
  if(f){ f.classList.toggle('on', PH_ONLY_NONE); f.disabled = !st.none && !PH_ONLY_NONE; }
  var bb = document.getElementById('phBulkBtn');
  if(bb) bb.disabled = !st.sel;
  var cb = document.getElementById('phCommitBtn');
  if(cb) cb.textContent = (st.tot-st.none) ? ((st.tot-st.none)+'장 넣기') : '넣기';

  if(typeof phNewGroupsRender === 'function') phNewGroupsRender();
  box.innerHTML = '';
  if(!st.tot){
    var e = document.createElement('div'); e.className='mini';
    e.textContent = '대기 중인 사진이 없습니다.';
    box.appendChild(e); return;
  }
  PH_STAGE.forEach(function(it, idx){
    if(PH_ONLY_NONE && it.code) return;
    var d = document.createElement('div');
    d.className = 'pit' + (it.sel ? ' sel' : '') + (it.code ? '' : ' none');
    var tick = document.createElement('div'); tick.className='tick'; tick.textContent = it.sel ? '✓' : '';
    var im = document.createElement('img'); im.src = it.u; im.alt='';
    var meta = document.createElement('div'); meta.className='meta';
    var fn = document.createElement('div'); fn.className='fn'; fn.textContent = it.n;
    var bt = document.createElement('button');
    bt.className = 'dest' + (it.code ? '' : ' empty');
    bt.innerHTML = (it.code ? '📍 ' : '⚠ ') + phDestName(it.code)
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
    }
    var rm = document.createElement('button'); rm.className='drop1'; rm.textContent='✕';
    rm.title = '이 사진 빼기';
    rm.onclick = function(ev){ ev.stopPropagation(); PH_STAGE.splice(idx,1); phSortRender(); };
    // 카드를 누르면 선택 토글 (여러 장을 한꺼번에 같은 위치로 보낼 때 씀)
    d.onclick = function(){ it.sel = !it.sel; phSortRender(); };
    d.appendChild(tick); d.appendChild(im); d.appendChild(meta); d.appendChild(rm);
    box.appendChild(d);
  });
}
function phSortToggleFilter(){ PH_ONLY_NONE = !PH_ONLY_NONE; phSortRender(); }
function phSortSelectAll(){
  PH_STAGE.forEach(function(x){ if(!PH_ONLY_NONE || !x.code) x.sel = true; });
  phSortRender();
}
function phSortSelectNone(){ PH_STAGE.forEach(function(x){ x.sel = false; }); phSortRender(); }

/* ── 위치 고르기 오버레이 ── */
function phPickOpen(idx){
  PH_PICK_IDX = idx;
  var t = document.getElementById('phPickTitle');
  if(t){
    if(idx < 0){ t.textContent = '선택한 '+phStageStats().sel+'장을 어디에?'; }
    else{ t.textContent = '이 사진을 어디에?'; }
  }
  var q = document.getElementById('phPickQ');
  if(q){ q.value=''; }
  // 이미 위치가 정해진 사진이면 그 층을 미리 골라 둬서, 같은 층 안에서 바꾸기 쉽게 한다.
  PH_PICK_FLOOR = null;
  if(idx >= 0 && PH_STAGE[idx] && PH_STAGE[idx].code){
    var cur = PH_STAGE[idx].code;
    PH_PICK_FLOOR = (cur === 'BLD') ? 'BLD' : (cur === 'B1' ? 'B1' : (phFloorOf(cur) || null));
  }
  phPickFloorTabs();
  phPickRender('');
  var p = document.getElementById('phPick');
  if(p) p.classList.add('on');
}
function phPickClose(){
  var p = document.getElementById('phPick');
  if(p) p.classList.remove('on');
}
var PH_PICK_FLOOR = null;      // 층 단추로 걸러 놓은 층 (null = 전체)
/* '3층' '지하' '건물 외부'처럼 층만 가리키는 검색어는 글자 겹침으로 찾지 않고
   그 층 전체를 곧바로 보여준다. (안 그러면 '1층'을 쳤을 때 이름에 '1층'이 들어간
   '지하 1층'까지 섞여 나온다) */
function phFloorFromQuery(q){
  var t = String(q||'').replace(/\s+/g,'').toLowerCase();
  if(!t) return undefined;
  if(/^(지하|지하층|지하1층|b1)$/.test(t)) return 'B1';
  if(/^(건물외부|건물|외부|바깥|정면|외관|bld)$/.test(t)) return 'BLD';
  var m = t.match(/^([1-5])\s*(층|f)$/);
  if(m) return parseInt(m[1],10);
  return undefined;
}
function phPickFloorTabs(){
  var box = document.getElementById('phPickFloors');
  if(!box) return;
  box.innerHTML = '';
  PH_FLOOR_TABS.forEach(function(t){
    var b = document.createElement('button');
    b.textContent = t.name;
    if(PH_PICK_FLOOR === t.f) b.className = 'on';
    b.onclick = function(){
      PH_PICK_FLOOR = t.f;
      phPickFloorTabs();
      var q = document.getElementById('phPickQ');
      phPickRender(q ? q.value : '');
    };
    box.appendChild(b);
  });
}
function phPickRender(q){
  var box = document.getElementById('phPickList');
  if(!box) return;
  q = String(q||'').trim().toLowerCase();
  var all = phTargets();
  // ① 층 단추로 먼저 거르고 ② 검색어로 거른다.
  //    검색어는 이름·호실번호뿐 아니라 층 표기(ft)까지 훑기 때문에
  //    '3층'이라고만 쳐도 3층 공용 자리와 3층 호실이 전부 나온다.
  var qf = phFloorFromQuery(q);
  var hit = all.filter(function(t){
    if(PH_PICK_FLOOR !== null && t.f !== PH_PICK_FLOOR) return false;
    if(!q) return true;
    if(qf !== undefined) return t.f === qf;                 // 층만 가리키는 검색어
    return (t.code+' '+t.label+' '+t.ft).toLowerCase().indexOf(q) >= 0;
  });
  box.innerHTML = '';
  if(!hit.length){
    var e=document.createElement('div'); e.className='pkg';
    e.textContent = (PH_PICK_FLOOR !== null && q) ? '그 층에는 찾는 위치가 없습니다.' : '찾는 위치가 없습니다.';
    box.appendChild(e); return;
  }
  // 목록은 스크롤되므로 층 하나가 통째로 나와도 괜찮지만, 지나치게 길어지는 것만 막는다
  if(hit.length > 220) hit = hit.slice(0, 220);
  var lastG = null;
  hit.forEach(function(t){
    if(t.g !== lastG){
      var g=document.createElement('div'); g.className='pkg'; g.textContent=t.g;
      box.appendChild(g); lastG=t.g;
    }
    var have = (ROOM_PHOTOS[t.code]||[]).length;
    var b=document.createElement('button'); b.className='pko';
    b.innerHTML = t.label + '<small>'+t.code+'</small>' + (have ? '<em>이미 '+have+'장</em>' : '');
    b.onclick = function(){ phPickApply(t.code); };
    box.appendChild(b);
  });
}
function phPickApply(code){
  if(PH_PICK_IDX >= 0){
    var it = PH_STAGE[PH_PICK_IDX];
    if(it){ it.code = code; it.auto = false; }
  }else{
    PH_STAGE.forEach(function(x){ if(x.sel){ x.code = code; x.auto = false; x.sel = false; } });
  }
  phPickClose();
  phSortRender();
}

/* ── 실제로 넣기 / 취소 ── */
function phSortCommit(){
  var st = phStageStats();
  if(!(st.tot - st.none)){ alert('넣을 위치가 지정된 사진이 없습니다.'); return; }
  if(st.none && !confirm('위치가 미지정인 '+st.none+'장은 넣지 않고 그대로 둡니다. 계속할까요?')) return;
  var ok = 0, dup = 0, left = [];
  PH_STAGE.forEach(function(x){
    if(!x.code){ x.sel=false; left.push(x); return; }
    if(!ROOM_PHOTOS[x.code]) ROOM_PHOTOS[x.code] = [];
    var already = ROOM_PHOTOS[x.code].some(function(p){ return p.n === x.n; });
    if(already){ dup++; return; }
    ROOM_PHOTOS[x.code].push({n:x.n, u:x.u});
    /* v45 : 넣는 순간 AI에게도 가르친다 — 이 사진이 이 위치라는 것 */
    if(typeof SUGAI !== 'undefined') SUGAI.learn(x.code, x.u, x.n);
    ok++;
  });
  PH_STAGE = left;
  phNormalize();
  if(typeof phRebuildRoomNames === 'function') phRebuildRoomNames();
  go('sph');
  phRender();
  phSay('사진 '+ok+'장을 넣었습니다.'
        + (dup ? ' (같은 이름 '+dup+'장 건너뜀)' : '')
        + (left.length ? ' 미지정 '+left.length+'장은 대기 중입니다.' : ''), 100);
}
function phSortCancel(){
  if(PH_STAGE.length && !confirm('대기 중인 사진 '+PH_STAGE.length+'장을 버릴까요?')) return;
  PH_STAGE = []; PH_ONLY_NONE = false;
  phPickClose();
  go('sph');
  phRender();
}

function phRender(){
  var badge = document.getElementById('phBadge');
  var tot = phCount();
  if(badge) badge.textContent = tot ? '(' + tot + '장)' : '';
  var list = document.getElementById('phList');
  if(!list) return;
  list.innerHTML = '';
  var per = {1:0,2:0,3:0,4:0,5:0}, rooms = {1:0,2:0,3:0,4:0,5:0};
  for(var k in ROOM_PHOTOS){
    var f = phFloorOf(k);
    if(f){ per[f] += ROOM_PHOTOS[k].length; rooms[f]++; }
  }
  var com = 0;
  ['BLD','B1'].forEach(function(k){ if(ROOM_PHOTOS[k]) com += ROOM_PHOTOS[k].length; });
  var cd = document.createElement('div'); cd.className = 'fl';
  cd.innerHTML = '<span><b style="color:#E8EDF2;font-size:13px;">건물 외부 · 지하</b></span>' +
                 '<b class="' + (com ? '' : 'zero') + '">' + (com ? com + '장' : '없음') + '</b>';
  list.appendChild(cd);
  [1,2,3,4,5].forEach(function(f){
    var d = document.createElement('div'); d.className = 'fl';
    d.innerHTML = '<span><b style="color:#E8EDF2;font-size:13px;">' + f + '층</b> &nbsp;호실 ' + rooms[f] + '곳</span>' +
                  '<b class="' + (per[f] ? '' : 'zero') + '">' + (per[f] ? per[f] + '장' : '없음') + '</b>';
    list.appendChild(d);
  });
  if(PH_STAGE.length){
    var q = document.createElement('div'); q.className = 'fl';
    q.style.borderColor = '#FF2E88';
    q.innerHTML = '<span><b style="color:#E8EDF2;font-size:13px;">위치를 못 정한 사진</b></span>'
                + '<b style="color:#FF2E88;">' + PH_STAGE.length + '장</b>';
    q.style.cursor = 'pointer';
    q.onclick = function(){ go('phsort'); };
    list.appendChild(q);
  }
  if(PH_SKIP.length){
    var w = document.createElement('div'); w.className = 'mini';
    w.innerHTML = '이미지로 읽지 못해 넘어간 파일 ' + PH_SKIP.length + '개<br>' +
                  PH_SKIP.slice(0,6).map(function(x){ return '· ' + x; }).join('<br>') +
                  (PH_SKIP.length>6 ? '<br>…' : '');
    list.appendChild(w);
  }
  phFill(document.getElementById('bld'), 'BLD', '[ 공대 3호관 정면 사진 ]');
  if(!phBusy) phSay(tot ? '사진 ' + tot + '장이 들어 있습니다.' : '아직 등록된 사진이 없습니다.', tot?100:0);
}

function phClear(){
  if(!confirm('등록한 사진을 모두 지울까요?')) return;
  ROOM_PHOTOS = {}; PH_SKIP = []; phRender();
}

/* 파일 하나를 내려받게 한다 */
function saveBlob(blob, name){
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 6000);
}

/* 사진 자료 묶음(zip) 내려받기 — 지금 앱의 사진 목록을 site/ 폴더 모양 그대로 담는다.
     data/photos.js            사진 목록 (장소 → [{n, u, cap}])
     data/photos/<장소>/…      이 기기에서 새로 넣은 사진 (이미 파일인 사진은 목록에만 적는다)
   압축을 site/ 에 그대로 풀고 올리면 모든 사용자에게 적용된다.
   서버에서 온 사진(관리자 승인)은 서버에 있으므로 담지 않는다.
   (예전에는 사진을 글자로 바꿔 박은 index.html 한 파일을 내려받게 했다 — 그래서 앱이 18MB 였다) */
function phExport(){
  if(!phCount()){ alert('먼저 사진을 넣어주세요.'); return; }
  if(typeof JSZip === 'undefined'){ alert('묶음 도구(JSZip)를 불러오지 못했습니다.'); return; }
  var zip = new JSZip(), idx = {}, nNew = 0, nAll = 0;
  var t = new Date(), p2 = function(v){ return (v < 10 ? '0' : '') + v; };
  var stamp = '' + t.getFullYear() + p2(t.getMonth() + 1) + p2(t.getDate()) + p2(t.getHours()) + p2(t.getMinutes());
  /* 출입문 목록(GATE_*)은 켤 때마다 phBuildGateLists 가 BLD 사진을 가리켜 다시 만든다 — 담지 않는다 */
  var owned = [];
  Object.keys(ROOM_PHOTOS).forEach(function(code){ if(!/^GATE_/.test(code)) owned = owned.concat(ROOM_PHOTOS[code] || []); });
  Object.keys(ROOM_PHOTOS).sort().forEach(function(code){
    var safe = code.replace(/[^A-Za-z0-9_\-]/g, '_');
    var list = (ROOM_PHOTOS[code] || []).filter(function(p){
      return p && p.u && !p.pid && !(/^GATE_/.test(code) && owned.indexOf(p) >= 0);
    });
    if(!list.length) return;
    idx[code] = list.map(function(p, i){
      var e = {n:p.n}, m = /^data:image\/([a-z+.-]+);base64,(.*)$/.exec(p.u);
      if(m){
        e.u = 'data/photos/' + safe + '/' + stamp + '_' + (i < 9 ? '0' : '') + (i + 1) + '.' + (m[1] === 'png' ? 'png' : 'jpg');
        zip.file(e.u, m[2], {base64:true}); nNew++;
      } else e.u = p.u;
      if(p.cap) e.cap = p.cap;
      nAll++;
      return e;
    });
  });
  zip.file('data/photos.js', '/* 장소 사진 목록 — 사진 파일은 data/photos/<장소>/ 에 있다.\n' +
    '   관리자 화면의 \'사진 자료 묶음 내려받기\'가 이 파일과 사진을 함께 만든다. */\n' +
    'window.PHOTO_INDEX = ' + JSON.stringify(idx) + ';\n');
  zip.generateAsync({type:'blob'}).then(function(b){
    saveBlob(b, '사진자료_' + stamp + '.zip');
    alert('사진 ' + nAll + '장(새 사진 ' + nNew + '장)의 목록을 내려받았습니다.\n\n' +
          '압축을 site 폴더에 그대로 풀고(덮어쓰기) GitHub 에 올리면 모든 사용자에게 적용됩니다.');
  })['catch'](function(e){ alert('묶음을 만들지 못했습니다. (' + (e && e.message || e) + ')'); });
}

/* 사진 상자 채우기 (여러 장이면 눌러서 넘김) */
/* 사진 키 폴백 : 13121처럼 3D는 한 코드인데 사진은 -A/-B로 나뉜 경우를 이어줌 */
function phResolve(code){
  if(!code) return code;
  if(ROOM_PHOTOS[code] && ROOM_PHOTOS[code].length) return code;
  var alt = ['-A','-B','-1','-2'];
  for(var i=0;i<alt.length;i++){
    var k = code + alt[i];
    if(ROOM_PHOTOS[k] && ROOM_PHOTOS[k].length) return k;
  }
  return code;
}
/* 건물 외부(BLD) 사진 8장은 정문·후문·동문·서문의 안/밖 캡션이 고정되어 있어
   작은 사전으로 번역해 둔다. 그 외 사진(강의실 등)은 실제 방 이름과 마찬가지로
   고유한 내용이라 자동 번역하지 않고 원문을 그대로 보여준다. */
var CAPTION_EN = {
  '공대3호관(정문)':'Engineering Bldg.3 (Main Gate)',
  '공대3호관(정문내부)':'Engineering Bldg.3 (Main Gate, inside)',
  '공대3호관(후문)':'Engineering Bldg.3 (Back Gate)',
  '공대3호관(후문내부)':'Engineering Bldg.3 (Back Gate, inside)',
  '공대3호관(동문)':'Engineering Bldg.3 (East Gate)',
  '공대3호관(동문내부)':'Engineering Bldg.3 (East Gate, inside)',
  '공대3호관(서문)':'Engineering Bldg.3 (West Gate)',
  '공대3호관(서문내부)':'Engineering Bldg.3 (West Gate, inside)'
};
function capFor(cap){ if(!cap) return cap; return (LANG==='en' && CAPTION_EN[cap]) ? CAPTION_EN[cap] : cap; }
function phCntTxt(k, total){
  return (LANG==='ko') ? ((k+1) + ' / ' + total + ' · 눌러서 다음') : ((k+1) + ' / ' + total + ' · Tap for next');
}
/* 언어 전환 시, 이미 화면에 떠 있는 사진의 설명(cap)·장수 카운터(cnt)만 지금 언어로
   다시 그린다 — 사진 자체나 지금 보고 있는 인덱스(el._phIndex)는 그대로 유지한다. */
function refreshAllPhotoLang(){
  document.querySelectorAll('.photo.has').forEach(function(el){
    var list = el._phList, code = el._phCode;
    if(!list || !list.length) return;
    var idx = el._phIndex || 0;
    var capEl = el.querySelector('.cap'), cntEl = el.querySelector('.cnt');
    if(capEl) capEl.textContent = capFor(list[idx].cap) || phCap(code);
    if(cntEl) cntEl.textContent = phCntTxt(idx, list.length);
  });
}
function phFill(el, code, placeholder){
  code = phResolve(code);
  if(!el) return;
  var list = (code && ROOM_PHOTOS[code]) || [];
  /* v78 : 엘리베이터 앞 사진 뒤에 그 층 라운지 사진을 붙인다. 엘리베이터에서 내리면 보이는 곳이
     라운지인데, 길안내에 라운지 자리가 없어 승인한 라운지 사진이 어디에도 안 보였다.
     설명이 없는 사진은 '엘리베이터 앞'이 아니라 라운지 이름으로 보이게 사본에 설명을 붙인다. */
  var mEv = /^EV([1-5])$/.exec(code || '');
  var lng = mEv ? ROOM_PHOTOS['LNG' + mEv[1]] : null;
  if(lng && lng.length){
    var lnName = (typeof SUGAI !== 'undefined' && SUGAI.codeLabel) ? SUGAI.codeLabel('LNG' + mEv[1]) : ('LNG' + mEv[1]);
    list = list.concat(lng.map(function(p){ return {n:p.n, u:p.u, cap:p.cap || lnName}; }));
  }
  el.innerHTML = ''; el.onclick = null;
  el._phList = null; el._phCode = null;
  if(!list.length){ el.classList.remove('has'); el.textContent = placeholder || ((LANG==='ko')?'[ 사진 없음 ]':'[ No photo ]'); return; }
  el.classList.add('has');
  var i = 0;
  el._phList = list; el._phCode = code; el._phIndex = 0;
  var img = document.createElement('img');
  // 가로로 넓은 사진(건물 전경 등)은 cover로 자르면 안 되므로 통째로 보이게 전환
  // 가로로 넓은 사진(건물 전경 등)은 cover로 자르면 안 되므로 상자를 사진 비율에 맞춰 줄이고,
  // 세로 사진으로 되돌아오면 원래(상자 꽉 채우기) 모양으로 복구한다.
  /* 예전에는 사진의 가로세로 비율에 따라 상자 크기를 바꿔서, 사진마다 틀 크기가 들쭉날쭉했음.
     → 상자 크기는 그대로 두고, 사진을 상자에 맞춰 잘라 꽉 채운다(크기 통일). */
  img.style.objectFit = 'cover';
  img.style.width = '100%';
  img.style.height = '100%';
  img.src = list[0].u; el.appendChild(img);
  var cap = document.createElement('div'); cap.className = 'cap'; cap.textContent = capFor(list[0].cap) || phCap(code); el.appendChild(cap);
  if(list.length > 1){
    var cnt = document.createElement('div'); cnt.className = 'cnt';
    // 사진이 여러 장일 때 '눌러서 넘긴다'는 걸 알 수 있게 카운터에 같이 적어준다
    cnt.textContent = phCntTxt(0, list.length); el.appendChild(cnt);
    el.onclick = function(){
      i = (i+1) % list.length; el._phIndex = i;
      img.src = list[i].u; cap.textContent = capFor(list[i].cap) || phCap(code); cnt.textContent = phCntTxt(i, list.length);
    };
  }
}

/* 입력 연결 */
(function(){
  var f = document.getElementById('phFile'), d = document.getElementById('phDir'), z = document.getElementById('phDrop');
  if(f) f.addEventListener('change', function(){ phAdd(this.files); this.value=''; });
  if(d) d.addEventListener('change', function(){ phAdd(this.files); this.value=''; });
  if(z){
    ['dragenter','dragover'].forEach(function(ev){
      z.addEventListener(ev, function(e){ e.preventDefault(); z.classList.add('over'); });
    });
    ['dragleave','drop'].forEach(function(ev){
      z.addEventListener(ev, function(e){ e.preventDefault(); z.classList.remove('over'); });
    });
    z.addEventListener('drop', function(e){ if(e.dataTransfer && e.dataTransfer.files) phAdd(e.dataTransfer.files); });
  }
  /* 전체 사진 관리의 ＋ 버튼으로 고른 파일 → 눌렀던 그 위치로 바로 넣기 */
  var mf = document.getElementById('sphMgrFile');
  if(mf) mf.addEventListener('change', function(){
    if(sphMgrPickCode) sphMgrAddFiles(sphMgrPickCode, this.files);
    this.value = '';
  });
  /* 사진을 빈 공간에 잘못 떨어뜨리면 브라우저가 그 파일을 열어 버려서, 아직 저장(사진 자료 묶음 내려받기)
     하지 않은 작업 내용이 통째로 날아간다. 문서 전체에서 기본 동작을 막아 실수를 방지한다. */
  document.addEventListener('dragover', function(e){ e.preventDefault(); });
  document.addEventListener('drop', function(e){ e.preventDefault(); });
})();
