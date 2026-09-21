# -*- coding: utf-8 -*-
"""v56 → v57 ② : 사람이 사진 보고 고르는 안전망

  AI가 확신하지 못하면(또는 사용자가 "아니에요"를 누르면) 사진을 보여주고 직접 고르게 한다.
  · AI 추천 5곳을 사진 카드로 보여준다 (유사도 표시)
  · 층을 고르면 그 층의 모든 장소가 사진과 함께 나온다
  · 고른 답은 AI가 그 자리에서 학습한다 — 다음부터 같은 자리는 AI가 맞힌다
  · "모르겠어요"를 누르면 위치 없이 접수되어 관리자가 정한다
  AI가 틀려도 결과는 항상 맞게 되고, 쓸수록 정확해진다.
"""
import io, sys

SRC = '/home/claude/gunsan_b3nav_OCR2_v57.html'
DST = '/home/claude/gunsan_b3nav_PICK_v57.html'

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

# ── 1) 화면 등록
rep(r"""  <!-- 사진 등록 -->
  <!-- v55 : AI 사진 파악 자료집 — AI가 위치를 알아보기 위해 참고하는 사진 모음 -->""",
r"""  <!-- v57 : 어디인지 직접 고르기 — AI가 확신 못 할 때의 안전망 -->
  <section class="screen" id="spick">
    <div class="bar"><button class="back" onclick="pickCancel()">←</button><h3 data-ko="어디에서 찍으셨나요?" data-en="Where was this taken?">어디에서 찍으셨나요?</h3></div>
    <div class="pkTop">
      <img id="pkShot" alt="">
      <div class="pkWhy" id="pkWhy"></div>
    </div>
    <div class="pkLab" id="pkSugLab">AI가 짐작한 곳 — 맞는 것을 눌러 주세요</div>
    <div class="pkGrid" id="pkSug"></div>
    <div class="pkLab">여기 없다면 — 번호·이름으로 찾거나 층을 고르세요</div>
    <input type="text" id="pkQ" class="pkQ" autocomplete="off" oninput="pickSearch()"
           data-ko-placeholder="예 : 13312 · 실험실 · 복도 · 화장실" data-en-placeholder="e.g. 13312 · lab · hall"
           placeholder="예 : 13312 · 실험실 · 복도 · 화장실">
    <div class="pkFloors" id="pkFloors"></div>
    <div class="pkGrid" id="pkAll"></div>
    <div class="row">
      <button class="big ghost" onclick="pickUnknown()" data-ko="모르겠어요 · 그냥 보내기" data-en="Not sure · send anyway">모르겠어요 · 그냥 보내기</button>
    </div>
    <div class="mini">고른 곳은 AI가 바로 배웁니다 — 다음부터 같은 자리는 AI가 알아봅니다.</div>
  </section>

  <!-- 사진 등록 -->
  <!-- v55 : AI 사진 파악 자료집 — AI가 위치를 알아보기 위해 참고하는 사진 모음 -->""",
'고르기 화면 HTML')

rep(r"""'sqr','sqrok','saidat'];""",
r"""'sqr','sqrok','saidat','spick'];""",
'SCREENS 등록')

# ── 2) CSS
rep(r"""  #saidat .aidThumbs .t.mine img{outline:2px solid #FFD166;outline-offset:-2px;}""",
r"""  /* ── v57 : 어디인지 고르기 ─────────────────────────────── */
  #spick{overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:28px;}
  #spick .pkTop{display:flex;gap:12px;align-items:flex-start;margin:4px 2px 14px;}
  #spick .pkTop img{width:112px;height:112px;object-fit:cover;border-radius:12px;
    border:1px solid rgba(90,140,200,.30);background:#0A1018;flex:0 0 auto;}
  #spick .pkWhy{font-size:12.5px;color:#7C8AA0;line-height:1.7;}
  #spick .pkWhy b{color:#94B8E0;font-weight:600;}
  #spick .pkWhy .hi{color:#39FF88;}
  #spick .pkLab{font-size:12px;color:#5D6B80;margin:14px 2px 8px;letter-spacing:.2px;}
  #spick .pkQ{width:100%;padding:11px 13px;border-radius:12px;font-size:14px;margin:0 0 10px;
    background:rgba(10,18,30,.9);color:#E8EDF2;border:1px solid rgba(90,140,200,.30);}
  #spick .pkQ::placeholder{color:#4A5566;}
  #spick .pkFloors{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 12px;}
  #spick .pkFloors button{flex:0 0 auto;padding:9px 13px;border-radius:999px;font-size:12.5px;
    background:rgba(20,32,50,.85);color:#94B8E0;border:1px solid rgba(90,140,200,.28);}
  #spick .pkFloors button.on{background:linear-gradient(135deg,#39FF88,#00C2FF);color:#06111C;font-weight:700;border-color:transparent;}
  #spick .pkGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:9px;}
  #spick .pkGrid:empty{display:none;}
  #spick .pkCard{background:rgba(14,22,36,.92);border:1px solid rgba(90,140,200,.22);
    border-radius:12px;overflow:hidden;text-align:left;padding:0 0 7px;}
  #spick .pkCard img{width:100%;height:78px;object-fit:cover;display:block;background:#0A1018;}
  #spick .pkCard .noimg{width:100%;height:78px;display:flex;align-items:center;justify-content:center;
    color:#3C4A5A;font-size:22px;background:#0A1018;}
  #spick .pkCard .nm{display:block;font-size:12px;color:#E8EDF2;font-weight:600;margin:6px 7px 0;line-height:1.35;}
  #spick .pkCard .sub{display:block;font-size:10.5px;color:#6B7A90;margin:2px 7px 0;line-height:1.35;}
  #spick .pkCard .sim{display:inline-block;font-size:10px;color:#39FF88;margin:3px 7px 0;}
  #spick .pkCard.best{border-color:rgba(57,255,136,.55);}
  #saidat .aidThumbs .t.mine img{outline:2px solid #FFD166;outline-offset:-2px;}""",
'고르기 CSS')

# ── 3) 화면 동작
rep(r"""function aidClearAll(){""",
r"""/* ══════════════════════════════════════════════════════════════
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

function aidClearAll(){""",
'고르기 화면 동작')

# ── 4) 제보 흐름에 끼워 넣기
rep(r"""    function ai2Cb(ai){
      if(ai.verdict === 'reject_quality' || ai.verdict === 'irrelevant' || ai.verdict === 'out_of_scope'){
        SUGAI.showCard(ai);
        if(stat){ stat.style.color = '#FF6B6B'; stat.textContent = SUGAI.rejectMsg(ai); stat.classList.add('on'); }
        return;                                   // 접수하지 않음
      }
      sugFinishSubmit(url, noteVal, ai, stat, noteEl);
    }""",
r"""    function ai2Cb(ai){
      /* 흐릿·너무 어두움 같은 사진 자체의 문제는 예전처럼 여기서 거른다 (위치 문제가 아니다) */
      if(ai.verdict === 'reject_quality'){
        SUGAI.showCard(ai);
        if(stat){ stat.style.color = '#FF6B6B'; stat.textContent = SUGAI.rejectMsg(ai); stat.classList.add('on'); }
        return;
      }
      /* 메모에 '옥상'처럼 범위 밖이라고 적혀 있으면 그대로 반려 */
      if(ai.verdict === 'out_of_scope' && ai.why === 'note'){
        SUGAI.showCard(ai);
        if(stat){ stat.style.color = '#FF6B6B'; stat.textContent = SUGAI.rejectMsg(ai); stat.classList.add('on'); }
        return;
      }
      /* v57 : AI가 확신할 때만 바로 접수하고, 그 밖에는 사람이 사진 보고 고른다.
         공대 3호관은 문·복도가 층마다 비슷해서 AI 혼자로는 한계가 뚜렷하다. */
      if(sugSure(ai)){
        sugFinishSubmit(url, noteVal, ai, stat, noteEl);
        return;
      }
      if(stat){ stat.textContent = ''; stat.classList.remove('on'); }
      pickOpen(url, noteVal, ai, function(code, ai2){
        if(!code){ ai2.verdict = 'unknown'; ai2.code = ''; }
        sugFinishSubmit(url, noteVal, ai2, stat, noteEl);
        go('ssug');
      });
    }""",
'제보 흐름에 고르기 연결')

rep(r"""/* 메모를 힌트로 넘기고(v53), 번호판은 큰 사본으로 읽는다(v57) */""",
r"""/* v57 : AI 혼자 결정해도 되는가
   자료집에 있는 자리와 사진이 아주 많이 닮았고(0.82 이상) 2등과 차이도 뚜렷할 때만 바로 접수한다.
   (측정 : 이 조건에서 239장 중 99.2% 정확)

   번호판을 읽었을 때는 바로 확정하지 않는다. 측정해 보니 잘못 읽은 번호도 '확실하다'고 나오는 일이
   적지 않았고(68장 중 10건), 그중 절반은 실제로 있는 호실 번호라 걸러낼 방법이 없었다.
   대신 읽은 번호를 고르기 화면 맨 앞에 놓아 한 번 눌러 확인받는다 — 한 번의 탭으로 확실해진다. */
function sugSure(ai){
  if(!ai || ai.verdict !== 'match' || !ai.code) return false;
  if(ai.pickedByUser) return true;
  if((ai.sim || 0) >= 0.82 && (ai.margin || 0) >= 0.04 && ai.codeSource !== 'ocr') return true;
  return false;
}

/* 메모를 힌트로 넘기고(v53), 번호판은 큰 사본으로 읽는다(v57) */""",
'확신 판단')

# ── 5) 결과 카드에 '위치 바꾸기'
rep(r"""      <button class="big" style="margin-top:10px;" onclick="sugSubmit()" data-ko="건의함에 올리기" data-en="Submit to Suggestion Box">건의함에 올리기</button>
      <div class="sugStat" id="sugStat"></div>""",
r"""      <button class="big" style="margin-top:10px;" onclick="sugSubmit()" data-ko="건의함에 올리기" data-en="Submit to Suggestion Box">건의함에 올리기</button>
      <button class="big ghost" style="margin-top:8px;display:none;" id="sugFixRow" onclick="sugFixPlace()" data-ko="AI가 정한 위치 바꾸기" data-en="Change the place">AI가 정한 위치 바꾸기</button>
      <div class="sugStat" id="sugStat"></div>""",
'위치 바꾸기 버튼')

rep(r"""    SUGAI.showCard(ai);
    if(stat){
      stat.style.color = '#39FF88';""",
r"""    SUGAI.showCard(ai);
    /* v57 : AI가 알아서 정한 경우, 틀렸으면 바로 고칠 수 있게 버튼을 띄운다 */
    var fixRow = document.getElementById('sugFixRow');
    if(fixRow) fixRow.style.display = (ai && ai.code && !ai.pickedByUser) ? '' : 'none';
    SUG_LAST = { id: rec.id, url: url, note: noteVal, ai: ai };
    if(stat){
      stat.style.color = '#39FF88';""",
'결과 카드 연결')

rep(r"""function sugSubmit(){
  var stat = document.getElementById('sugStat');""",
r"""/* 방금 보낸 제보 — '위치 바꾸기'로 고칠 수 있게 기억해 둔다 */
var SUG_LAST = null;
function sugFixPlace(){
  if(!SUG_LAST) return;
  var keep = SUG_LAST;
  pickOpen(keep.url, keep.note, keep.ai, function(code, ai2){
    go('ssug');
    if(!code) return;
    var i;
    for(i=0;i<SUG_QUEUE.length;i++){
      if(SUG_QUEUE[i].id === keep.id){
        SUG_QUEUE[i].ai = ai2;
        sugSaveQueue();
        if(typeof SUGDB !== 'undefined' && SUGDB.pushOne) SUGDB.pushOne(SUG_QUEUE[i]);
        break;
      }
    }
    var st = document.getElementById('sugStat');
    if(st){ st.style.color = '#39FF88'; st.textContent = '✓ 위치를 「' + pickName(code) + '」(으)로 고쳤습니다.'; st.classList.add('on'); }
    var fixRow = document.getElementById('sugFixRow');
    if(fixRow) fixRow.style.display = 'none';
  });
}

function sugSubmit(){
  var stat = document.getElementById('sugStat');""",
'위치 바꾸기 동작')

rep(r"""    var fileInput = document.getElementById('sugFile'); if(fileInput) fileInput.value = '';
    sugPickedFile = null;""",
r"""    var fileInput = document.getElementById('sugFile'); if(fileInput) fileInput.value = '';
    sugPickedFile = null;
    var fixRow0 = document.getElementById('sugFixRow'); if(fixRow0) fixRow0.style.display = 'none';""",
'초기화')

io.open(DST, 'w', encoding='utf-8').write(s)
print('\n%d개 패치 적용 → %s (%d bytes)' % (n_ok, DST, len(s.encode('utf-8'))))
