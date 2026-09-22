"use strict";
/* suggest.js — 건의함(사진 제보) · 관리자 제보 검토 · 관리자 로그인 입구 · 전체 사진 관리
   (예전 한 파일 main.js 의 769~1712줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
/* ========== 건의함 : 실제 모습과 다른 건물 사진을 사용자가 찍어 올리면, 관리자가 직접
   검토(승인/거절)한 뒤 승인한 사진만 최신 사진으로 반영하는 사진 제보 시스템.
   1단계로 AI 자동판별 대신 '사람이 검토하는 관리자 페이지'로 구현한다.
   흐름 : 사용자 제출 → localStorage 대기열(SUG_QUEUE) 저장
         → 관리자가 #sph(사진 등록, 개발자 전용)에서 이어지는 #sadmin 화면에서 사진·메모를 보고
           적용할 위치 코드(호실번호 또는 BLD·B1·EV1~5·HALL1~5L/R)를 입력해 승인
         → 승인 즉시 ROOM_PHOTOS[코드] 맨 앞에 추가되어 그 위치의 대표 사진이 되고,
           서버(Firestore photos)에 올라가 다른 사용자의 앱도 다음에 열 때 받는다. ========== */
var sugPickedFile = null;
function sugLoadQueue(){
  try{ return JSON.parse(localStorage.getItem('sugQueue')||'[]'); }catch(e){ return []; }
}
function sugSaveQueue(){ try{ localStorage.setItem('sugQueue', JSON.stringify(SUG_QUEUE)); }catch(e){} }
var SUG_QUEUE = sugLoadQueue();
/* v49 : 서버에서 실시간으로 받은 대기 제보. 로그인한 관리자 기기에서 채워진다. */
var SUG_REMOTE = [];
/* 대기 목록 = 서버 목록 + 아직 서버로 못 보낸 이 폰의 제보 */
function sugPending(){
  var local = SUG_QUEUE.filter(function(s){ return s.status==='pending' && !s.synced; });
  return SUG_REMOTE.concat(local);
}
function sugFind(id){
  var r = null;
  SUG_REMOTE.forEach(function(x){ if(x.id===id) r = x; });
  if(r) return r;
  return SUG_QUEUE.find(function(x){ return x.id===id; }) || null;
}
function sugHandled(){ return SUG_QUEUE.filter(function(s){ return s.status!=='pending'; }); }
function sugBadgeSync(){
  var b = document.getElementById('sugAdminBadge');
  if(b){ var n = sugPending().length; b.textContent = n ? ' ('+n+')' : ''; }
}
function sugEsc(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

function sugPreview(input){
  var file = input.files && input.files[0];
  var box = document.getElementById('sugShot');
  if(!file || !box) return;
  sugPickedFile = file;
  var url = URL.createObjectURL(file);
  box.classList.add('has');
  box.innerHTML = '<img src="'+url+'" alt="제보 사진 미리보기">';
  /* v69 : 첫 장을 고른 뒤에만 "한 장 더" 를 보여 준다 */
  var more = document.getElementById('sugShot2');
  if(more) more.style.display = 'block';
}
/* v69 : 같은 자리에서 찍은 두 번째 사진 — 위치를 찾는 데만 쓰고 제보에는 첫 장만 남는다.
   실측(복도 920장) : 자리 54.9% → 61.5%, 층 63.3% → 70.1%, 5등 81.6% → 87.8% */
var sugPickedFile2 = null;
function sugPreview2(input){
  var file = input.files && input.files[0];
  var box = document.getElementById('sugShot2');
  if(!file || !box) return;
  sugPickedFile2 = file;
  box.classList.add('has');
  box.innerHTML = '<span class="ic">✅</span><span>'
    + ((LANG==='ko') ? '두 번째 사진 준비됨 — 다시 누르면 바꿀 수 있어요'
                     : 'Second photo ready — tap to replace') + '</span>';
}
function sugReset2(){
  sugPickedFile2 = null;
  var f2 = document.getElementById('sugFile2'); if(f2) f2.value = '';
  var box = document.getElementById('sugShot2');
  if(box){
    box.classList.remove('has');
    box.style.display = 'none';
    box.innerHTML = '<span class="ic">➕</span><span>'
      + ((LANG==='ko') ? '같은 자리에서 한 장 더 찍으면 더 잘 찾아요 (선택)'
                       : 'One more photo from the same spot helps (optional)') + '</span>';
  }
}
/* v53 : 층 선택 버튼 — 고른 층은 메모 끝에 'N층'으로 붙어 AI 힌트가 된다 */
var sugFloorPick = '';
function sugFloorSel(btn){
  var row = document.getElementById('sugFloorRow'); if(!row) return;
  var was = btn.classList.contains('on');
  Array.prototype.forEach.call(row.querySelectorAll('button'), function(b){ b.classList.remove('on'); });
  if(was){ sugFloorPick = ''; return; }
  btn.classList.add('on'); sugFloorPick = btn.getAttribute('data-f') || '';
}
function sugFloorReset(){
  sugFloorPick = '';
  var row = document.getElementById('sugFloorRow');
  if(row) Array.prototype.forEach.call(row.querySelectorAll('button'), function(b){ b.classList.remove('on'); });
}
/* 방금 보낸 제보 — '위치 바꾸기'로 고칠 수 있게 기억해 둔다 */
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
  var stat = document.getElementById('sugStat');
  if(!sugPickedFile){
    if(stat){
      stat.style.color = '#FF6B6B';
      stat.textContent = (LANG==='ko') ? '사진을 먼저 선택해 주세요.' : 'Please choose a photo first.';
      stat.classList.add('on');
    }
    return;
  }
  var btn = document.querySelector('#ssug .card .big');
  if(btn) btn.disabled = true;
  if(stat){
    stat.style.color = '#7C8AA0';
    stat.textContent = (LANG==='ko') ? '제출하는 중…' : 'Submitting…';
    stat.classList.add('on');
  }
  var noteEl = document.getElementById('sugNote');
  var noteVal = noteEl ? noteEl.value.trim() : '';
  /* v53 : 층 버튼을 골랐고 메모에 층이 없으면 메모에 붙인다 (관리자에게도 보이고, AI 힌트로도 쓰인다) */
  if(sugFloorPick && !/([1-5]\s*층|지하|B1)/i.test(noteVal)) noteVal = (noteVal ? noteVal + ' ' : '') + sugFloorPick;
  var pickedFile = sugPickedFile;
  // 사진 라이브러리와 같은 방식(phShrink)으로 압축해 저장 용량을 줄인다.
  phShrink(pickedFile, function(url){
    if(btn) btn.disabled = false;
    if(!url){
      if(stat){
        stat.style.color = '#FF6B6B';
        stat.textContent = (typeof PHFIX!=='undefined') ? PHFIX.reason()
          : ((LANG==='ko') ? '사진을 처리하지 못했어요. 다시 시도해 주세요.' : 'Could not process the photo. Please try again.');
      }
      return;
    }
    /* v44 : 큐에 넣기 전에 AI가 사진을 판별한다.
       품질 불합격·건물과 무관한 사진은 여기서 걸러 관리자에게 넘기지 않는다. */
    if(stat){ stat.style.color = '#7C8AA0'; stat.textContent = (LANG==='ko') ? 'AI가 사진을 확인하는 중…' : 'AI is checking the photo…'; }
    /* v57 : 번호판을 읽으려면 사진이 커야 한다. 저장은 1280px 그대로 두고,
       번호판 읽기에만 쓸 2400px 사본을 따로 만들어 넘긴다 (실패하면 그냥 원래 것으로 읽는다). */
    phShrink(pickedFile, function(big){
      /* v69 : 두 번째 사진이 있으면 위치 판별에만 함께 쓴다 (저장되는 사진은 첫 장) */
      if(!sugPickedFile2){ sugJudgeWith(url, big, noteVal, ai2Cb); return; }
      phShrink(sugPickedFile2, function(u2){
        sugJudgeWith(url, big, noteVal, ai2Cb, u2 ? [u2] : null);
      });
    }, 2400, 0.85);

    function ai2Cb(ai){
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
      /* v59 : 위치를 못 정해도 그냥 접수한다.
         예전에는 여기서 "어디에서 찍으셨나요?" 화면을 띄워 사용자에게 고르게 했는데,
         처음 온 사람은 건물 구조도 호실 번호도 모른다 — 길을 잃어서 앱을 켠 사람에게
         어디인지 맞히라고 하는 셈이었다.
         AI 가 짐작한 후보는 기록에 그대로 남으므로, 관리자 화면에서 후보 5개를
         눌러 고르거나 직접 입력해 확정한다. */
      ai.verdict = 'unknown';
      ai.code = '';
      sugFinishSubmit(url, noteVal, ai, stat, noteEl);
    }
  });
}
/* v57 : AI 혼자 결정해도 되는가
   자료집에 있는 자리와 사진이 아주 많이 닮았고(0.82 이상) 2등과 차이도 뚜렷할 때만 바로 접수한다.
   (측정 : 이 조건에서 239장 중 99.2% 정확)

   번호판을 읽었을 때는 바로 확정하지 않는다. 측정해 보니 잘못 읽은 번호도 '확실하다'고 나오는 일이
   적지 않았고(68장 중 10건), 그중 절반은 실제로 있는 호실 번호라 걸러낼 방법이 없었다.
   대신 읽은 번호를 고르기 화면 맨 앞에 놓아 한 번 눌러 확인받는다 — 한 번의 탭으로 확실해진다. */
function sugSure(ai){
  if(!ai || ai.verdict !== 'match' || !ai.code) return false;
  if(ai.pickedByUser) return true;
  /* v59 : 번호판을 읽어 호실이 나왔으면 그것이 가장 확실하다.
     applyOcr 이 codeSource='ocr' 로 표시하는 경우는 이미
     "믿을 만한가" 검사(확신 60 이상 또는 앱이 아는 번호)를 통과한 것이다. */
  if(ai.codeSource === 'ocr') return true;
  /* v60 : 사진 판별(CNN)만으로는 확정하지 않는다.
     240장으로 재보니 이 경로의 정답률이 0% 였다 — 유사도가 높을수록
     오히려 더 틀렸다. 문턱을 올려도 나아지지 않는다. */
  return false;
}

/* 메모를 힌트로 넘기고(v53), 번호판은 큰 사본으로 읽는다(v57) */
function sugJudgeWith(url, big, noteVal, cb, extras){
  SUGAI.judge(url, cb, noteVal, big || null, extras || null);   /* v69 : extras = 같은 자리 추가 사진 */
}

/* AI 판정을 통과한 제보를 실제로 큐에 넣는다 (v44에서 분리) */
function sugFinishSubmit(url, noteVal, ai, stat, noteEl){
    var rec = {
      id: 'sug_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
      u: url, note: noteVal, ts: Date.now(), status: 'pending',
      ai: ai,
      qr: (typeof QRNAV!=='undefined' && QRNAV.gate) ? QRNAV.gate() : null
    };
    SUG_QUEUE.push(rec);
    sugSaveQueue();
    sugBadgeSync();
    /* v49 : 서버로 보낸다. 실패하면 이 폰에 남겨뒀다가 연결되면 다시 보낸다. */
    if(typeof SUGDB !== 'undefined') SUGDB.pushOne(rec);
    SUGAI.showCard(ai);
    /* v57 : AI가 알아서 정한 경우, 틀렸으면 바로 고칠 수 있게 버튼을 띄운다 */
    /* v59 : 이 단추도 같은 고르기 화면을 여는 것이라 함께 숨긴다.
       (화면과 함수는 그대로 남겨 두었으니 필요하면 이 한 줄만 되돌리면 된다) */
    var fixRow = document.getElementById('sugFixRow');
    if(fixRow) fixRow.style.display = 'none';
    SUG_LAST = { id: rec.id, url: url, note: noteVal, ai: ai };
    if(stat){
      stat.style.color = '#39FF88';
      stat.textContent = (LANG==='ko')
        ? '✓ 제출되었습니다! 관리자가 확인 후 최신 사진으로 반영해요.'
        : '✓ Submitted! A staff member will review it and apply it as the newest photo.';
      stat.classList.add('on');
    }
    var box = document.getElementById('sugShot');
    if(box){
      box.classList.remove('has');
      box.innerHTML = '<span class="ic">📷</span><span data-ko="탭해서 지금 보이는 모습을 촬영하거나 사진을 선택하세요" data-en="Tap to take a photo of what you see, or choose one">'
        + ((LANG==='ko') ? '탭해서 지금 보이는 모습을 촬영하거나 사진을 선택하세요' : 'Tap to take a photo of what you see, or choose one') + '</span>';
    }
    if(noteEl) noteEl.value = '';
    var fileInput = document.getElementById('sugFile'); if(fileInput) fileInput.value = '';
    sugPickedFile = null;
    if(typeof sugReset2 === 'function') sugReset2();     /* v69 */
    var fixRow0 = document.getElementById('sugFixRow'); if(fixRow0) fixRow0.style.display = 'none';
    if(typeof sugFloorReset === 'function') sugFloorReset();
}

/* ── 건의함 관리자(#sadmin) : 사람이 직접 승인/거절하는 검토 화면 ──
   BLD(건물 외부) 코드 하나에는 정문·후문·동문·서문의 안/밖 사진 8장이 한 묶음으로 들어있어서,
   그냥 앞자리에 끼워넣기만 하면 "그 자리 사진만" 정확히 바꿀 수 없다. 그래서 BLD로 승인할 때는
   세부 위치(정문/정문내부/후문/후문내부/동문/동문내부/서문/서문내부)를 선택해서, 기존 사진들
   중 그 위치 태그가 붙은 사진 딱 하나만 골라 교체하고 나머지 7장·순서는 그대로 둔다. */
var BLD_SUBLOCS = ['정문','정문내부','후문','후문내부','동문','동문내부','서문','서문내부'];
/* v73 : 빠른 버튼 → 코드 칸 채우기 */
function sugSetCode(id, code){
  var el = document.getElementById('sugCode_' + id);
  if(!el) return;
  el.value = code;
  sugSyncName(id);
}

/* ── v74 : 코드 대신 한글 이름으로 고르기 ──────────────────────
   관리자는 위치 코드를 알 필요가 없어야 한다. 코드를 아는 사람은 이 앱을
   만든 사람뿐이라, 코드를 요구하면 관리자를 다른 사람에게 넘길 수가 없다. */

/* 위치 코드 → 몇 층 묶음인가 (출입문은 '건물 외부'로 본다) */
function sugFloorOf(code){
  var c = String(code || '').toUpperCase();
  if(/^GATE_/.test(c)) return '건물 외부';
  return (typeof aidFloorOf === 'function') ? aidFloorOf(c) : '기타';
}
/* 위치 코드 → 사람이 읽는 이름. 호실은 학과 이름까지 붙여 준다 */
function sugPlaceName(code){
  var c = String(code || '');
  if(/^\d{5}/.test(c) && typeof roomTitle === 'function'){
    try { return roomTitle(c, 'ko'); } catch(e){}
  }
  return (typeof aidLabel === 'function') ? aidLabel(c) : c;
}
/* 한 층 안에서 장소를 성격별로 묶는다 (자주 쓰는 것이 위로 오게) */
var SUG_GROUPS = [
  {t:'라운지·로비',   rx:/^(LNG[1-5]|B1)$/},
  {t:'복도',          rx:/^HALL[1-5][LR]$/},
  {t:'엘리베이터',    rx:/^(EV[1-5]|EVIN[1-5]|EVB1)$/},
  {t:'강의실·연구실', rx:/^(\d{5}|KTC$)/},
  {t:'화장실·계단',   rx:/^(WC[1-5]|ES[1-5]|EMS[1-5])$/},
  {t:'출입문·외부',   rx:/^(BLD|GATE_)/}
];
function sugPlaceOptions(floor){
  var all = (typeof aidKnownCodes === 'function') ? aidKnownCodes() : [];
  var mine = all.filter(function(c){ return sugFloorOf(c) === floor; });
  /* v76 : 동문·서문이 GATE_E 와 GATE_EAST 두 이름으로 들어 있다.
     승인한 사진이 실제로 붙는 쪽(ROOM_PHOTOS 가 쓰는 이름)만 남긴다.
     짧은 쪽을 고르면 승인해도 안내 화면이 그대로여서 알아채기 어렵다. */
  mine = mine.filter(function(c){
    if(c === 'GATE_E' && mine.indexOf('GATE_EAST') >= 0) return false;
    if(c === 'GATE_W' && mine.indexOf('GATE_WEST') >= 0) return false;
    return true;
  });
  if(!mine.length) return '<option value="">이 층에 등록된 장소가 없습니다</option>';
  var used = {}, html = '<option value="">장소 고르기</option>';
  SUG_GROUPS.forEach(function(g){
    var items = mine.filter(function(c){ return !used[c] && g.rx.test(c); });
    items.forEach(function(c){ used[c] = 1; });
    if(!items.length) return;
    html += '<optgroup label="'+g.t+'">' + items.map(function(c){
      return '<option value="'+c+'">'+sugPlaceName(c)+'</option>'; }).join('') + '</optgroup>';
  });
  var rest = mine.filter(function(c){ return !used[c]; });
  if(rest.length){
    html += '<optgroup label="그 밖">' + rest.map(function(c){
      return '<option value="'+c+'">'+sugPlaceName(c)+'</option>'; }).join('') + '</optgroup>';
  }
  return html;
}
function sugPickFloor(id){
  var fs = document.getElementById('sugFloor_'+id), ps = document.getElementById('sugPlace_'+id);
  if(!fs || !ps) return;
  ps.innerHTML = fs.value ? sugPlaceOptions(fs.value) : '<option value="">← 먼저 층을 고르세요</option>';
  ps.value = '';
}
function sugPlacePick(id){
  var ps = document.getElementById('sugPlace_'+id), el = document.getElementById('sugCode_'+id);
  if(!ps || !el) return;
  if(ps.value) el.value = ps.value;
  sugSyncName(id);
}
/* 지금 고른 것이 무엇인지 한 줄로 보여 준다 — 승인 직전에 눈으로 확인하는 칸 */
function sugSyncName(id){
  var el = document.getElementById('sugCode_'+id), box = document.getElementById('sugChosen_'+id);
  if(!el || !box) return;
  var code = String(el.value || '').trim().toUpperCase();
  if(!code){ box.className = 'sugChosen none'; box.textContent = '아직 고르지 않았습니다'; return; }
  var known = (typeof aidKnownCodes === 'function') && aidKnownCodes().indexOf(code) >= 0;
  if(known){
    box.className = 'sugChosen';
    box.textContent = '✔ ' + sugPlaceName(code) + '  (' + code + ')';
  } else {
    box.className = 'sugChosen warn';
    box.textContent = '※ 앱에 없던 새 위치 「' + code + '」로 넣습니다';
  }
}
/* 화면을 다시 그린 뒤, 이미 채워져 있는 코드에 맞춰 층·장소 칸을 맞춰 둔다 */
function sugPresetOne(id){
  var el = document.getElementById('sugCode_'+id);
  if(!el) return;
  var code = String(el.value || '').trim().toUpperCase();
  if(!code) return;
  var fs = document.getElementById('sugFloor_'+id), fl = sugFloorOf(code);
  if(fs && typeof AID_FLOORS !== 'undefined' && AID_FLOORS.indexOf(fl) >= 0){
    fs.value = fl;
    sugPickFloor(id);
    var ps = document.getElementById('sugPlace_'+id);
    if(ps) ps.value = code;
  }
  sugSyncName(id);
}
function sugPresetAll(){
  sugPending().forEach(function(s){
    var el = document.getElementById('sugCode_'+s.id);
    if(!el) return;
    var code = String(el.value || '').trim().toUpperCase();
    if(code){
      var fs = document.getElementById('sugFloor_'+s.id);
      var fl = sugFloorOf(code);
      if(fs && AID_FLOORS.indexOf(fl) >= 0){
        fs.value = fl;
        sugPickFloor(s.id);
        var ps = document.getElementById('sugPlace_'+s.id);
        if(ps) ps.value = code;
      }
    }
    sugSyncName(s.id);
  });
}
/* v73 : 코드 칸에서 고를 수 있게 앱이 아는 위치를 한국어 이름과 함께 채운다.
   손으로 치지 않아도 되고, 없는 코드를 지어내는 실수도 줄어든다. */
function sugFillCodeList(){
  var dl = document.getElementById('sugCodeList');
  if(!dl || typeof aidKnownCodes !== 'function') return;
  dl.innerHTML = aidKnownCodes().map(function(c){
    var lb = (typeof aidLabel === 'function') ? aidLabel(c) : c;
    return '<option value="'+c+'">' + (lb && lb !== c ? c+' — '+lb : c) + '</option>';
  }).join('');
}
function sugAdminRender(){
  sugBadgeSync();
  sugFillCodeList();
  var list = document.getElementById('sugAdminList');
  if(!list) return;
  var pending = sugPending();
  if(!pending.length){
    list.innerHTML = '<div class="sugEmpty">대기 중인 제보가 없습니다.</div>';
  } else {
    var subOptions = '<option value="">(정문·후문 사진이면 세부 위치 선택 — 그 자리만 교체)</option>' +
      BLD_SUBLOCS.map(function(k){ return '<option value="'+k+'">'+k+'</option>'; }).join('');
    list.innerHTML = pending.slice().reverse().map(function(s){
      var d = new Date(s.ts);
      var when = (d.getMonth()+1)+'/'+d.getDate()+' '+
        (d.getHours()<10?'0':'')+d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes();
      var noteHtml = s.note ? sugEsc(s.note) : '<span class="sugNoNote">메모 없음</span>';
      return (
        '<div class="sugCard">' +
          /* v54 : 눌러서 크게 보기 (사진 자체는 용량이 커서 onclick에 넣지 않고 id로 찾는다) */
          '<div class="sugThumbWrap" onclick="zoomFromSug(\''+s.id+'\')" title="탭하면 크게 보기">' +
            '<img src="'+s.u+'" class="sugThumb" alt="제보 사진">' +
            '<span class="zoomBadge">🔍</span>' +
          '</div>' +
          '<div class="sugMeta">' +
            '<div class="sugNote">'+noteHtml+'</div>' +
            '<div class="sugWhen">'+when+(s.fid ? '' : '<span class="sugLocal">이 폰에서만 · 서버 미전송</span>')+'</div>' +
            (typeof SUGAI!=='undefined' ? SUGAI.adminBadge(s) : '') +
            /* v74 : 층 → 장소 를 한글 이름으로 고른다 (코드를 몰라도 된다) */
            '<div class="sugPick">' +
              '<select class="sugFloorSel" id="sugFloor_'+s.id+'" onchange="sugPickFloor(\''+s.id+'\')">' +
                '<option value="">층 고르기</option>' +
                (typeof AID_FLOORS !== 'undefined' ? AID_FLOORS : []).map(function(f){
                  return '<option value="'+f+'">'+f+'</option>'; }).join('') +
              '</select>' +
              '<select class="sugPlaceSel" id="sugPlace_'+s.id+'" onchange="sugPlacePick(\''+s.id+'\')">' +
                '<option value="">← 먼저 층을 고르세요</option>' +
              '</select>' +
            '</div>' +
            '<div class="sugChosen none" id="sugChosen_'+s.id+'">아직 고르지 않았습니다</div>' +
            '<div class="sugCodeLine"><label>직접 입력</label>' +
              '<input type="text" class="sugCodeInput" id="sugCode_'+s.id+'" list="sugCodeList" ' +
                'oninput="sugSyncName(\''+s.id+'\')" value="'+
                ((typeof SUGAI!=='undefined') ? SUGAI.autoCode(s) : '')+
                '" placeholder="코드를 아는 경우에만 (예: LNG3)"></div>' +
            /* v73 : 층마다 있는 라운지는 코드를 외우기 어려워 버튼으로 고른다 */
            '<div class="sugQuick">라운지 : ' +
              [1,2,3,4,5].map(function(f){
                return '<button type="button" onclick="sugSetCode(\''+s.id+'\',\'LNG'+f+'\')">' +
                       (f === 1 ? '1층 로비' : f+'층') + '</button>';
              }).join('') +
            '</div>' +
            '<select class="sugSubSel" id="sugSub_'+s.id+'">'+subOptions+'</select>' +
            /* v59 : 학습은 관리자 승인으로만 일어난다 — 위치를 가장 정확히 아는 사람이므로 */
            '<div class="sugLearnTip">✔ 승인하면 이 위치를 AI가 배웁니다 — 코드가 맞는지 확인해 주세요</div>' +
            '<div class="sugBtnRow">' +
              '<button class="sugApprove" onclick="sugApprove(\''+s.id+'\')">승인</button>' +
              '<button class="sugReject" onclick="sugReject(\''+s.id+'\')">거절</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }
  sugPresetAll();                                                   /* v74 */
  var hEl = document.getElementById('sugHandledInfo');
  if(hEl){ var n = sugHandled().length; hEl.textContent = n ? ('처리 완료 '+n+'건') : ''; }
}
function sugApprove(id){
  var s = sugFind(id);
  if(!s) return;
  var subSel = document.getElementById('sugSub_'+id);
  var sub = subSel ? subSel.value : '';
  var input = document.getElementById('sugCode_'+id);
  var code = sub ? 'BLD' : (input ? input.value.trim().toUpperCase() : '');
  if(!code){ alert('위치를 고르지 않았습니다.\n층을 고른 뒤 장소를 고르거나, 정문·후문이면 세부 위치를 선택해 주세요.'); return; }
  if(!ROOM_PHOTOS[code]) ROOM_PHOTOS[code] = [];
  if(sub){
    // 세부 위치 지정 : 그 위치 태그가 붙은 기존 사진 자리만 정확히 교체(전체 순서는 그대로)
    var arr = ROOM_PHOTOS[code];
    var taggedName = '건의함_' + sub + '.jpg';
    var idx = arr.findIndex(function(p){ return p.n.indexOf('('+sub+')') !== -1 || p.n === taggedName; });
    var newEntry = {n:taggedName, u:s.u, cap:s.note || sub};
    if(idx >= 0) arr[idx] = newEntry; else arr.unshift(newEntry);
  } else {
    ROOM_PHOTOS[code].unshift({n:'건의함_'+id+'.jpg', u:s.u, cap:s.note || undefined});
  }
  phNormalize();
  phRender();
  /* v45 : 관리자가 승인한 사진도 AI 정답표에 더한다 */
  /* v64 : 서버에 올라가면 syncServerOne 으로 모든 기기 공통 학습, 못 올라가면 이 기기에만 */
  var sugLearnLocal = function(){ if(typeof SUGAI !== 'undefined') SUGAI.learn(code, s.u, '건의함_'+id); };
  if(!(typeof SUGDB !== 'undefined' && s.fid)) sugLearnLocal();
  s.status = 'approved'; s.code = code + (sub ? ('-'+sub) : ''); s.handledTs = Date.now();
  /* v49 : 서버에도 승인 기록 + 승인된 사진을 모든 사용자에게 배포 */
  if(typeof SUGDB !== 'undefined' && s.fid){
    SUGDB.setStatus(s.fid, {status:'approved', code:s.code, handledTs:s.handledTs});
    SUGDB.publishPhoto({code:code, sub:sub||'', n:(sub ? '건의함_'+sub+'.jpg' : '건의함_'+id+'.jpg'),
                        u:s.u, cap:s.note || (sub||''), ts:Date.now(), sid:s.fid})
      .then(function(ent){
        if(!ent || !ent.pid){
          sugLearnLocal();
          /* v71 : 조용히 넘어가지 않는다 — 무엇이 안 됐는지 관리자에게 알린다 */
          sugSrvNote('⚠ <b>서버에 올리지 못했습니다 — 이 기기에만 반영됩니다.</b><br>'
            + '사유 : ' + ((typeof SUGDB !== 'undefined' && SUGDB.lastPubErr) ? SUGDB.lastPubErr : '알 수 없음') + '<br>'
            + '다른 기기에서는 이 사진도, 이 학습도 보이지 않습니다. '
            + '(사유가 permission-denied 면 Firestore 규칙에서 photos 쓰기를 열어야 합니다)', false);
          return;
        }
        (ROOM_PHOTOS[code] || []).forEach(function(q){ if(q.n === ent.n) q.pid = ent.pid; });
        if(typeof SUGAI !== 'undefined' && SUGAI.syncServerOne) SUGAI.syncServerOne(ent);
        sugSrvNote('✅ <b>서버에 올렸습니다 — 모든 기기에 반영됩니다.</b><br>'
          + '문서 번호 : ' + ent.pid + ' · 위치 : ' + code + '<br>'
          + '다른 기기에서 앱을 새로 열면 이 사진이 보이고, AI도 같이 배웁니다.', true);
      });
    SUG_REMOTE = SUG_REMOTE.filter(function(x){ return x.id!==id; });
  }
  sugSaveQueue();
  sugAdminRender();
}
/* v71 : 승인 결과를 관리자 화면 맨 위에 보여 준다.
   예전에는 서버 업로드가 실패해도 아무 표시 없이 이 기기에만 학습해서,
   "모든 기기에 반영된다"고 착각하기 쉬웠다. */
function sugSrvNote(msg, ok){
  var host = document.getElementById('sadmin');
  if(!host) return;
  var el = document.getElementById('sugSrvNote');
  if(!el){
    el = document.createElement('div');
    el.id = 'sugSrvNote';
    host.insertBefore(el, host.firstChild);
  }
  el.style.cssText = 'margin:10px 0;padding:10px 12px;border-radius:9px;font-size:12.5px;line-height:1.65;'
    + (ok ? 'background:#16301F;border:1px solid #2F6B44;color:#BFEBD0;'
          : 'background:#3A2020;border:1px solid #7C3B3B;color:#FFD2D2;');
  el.innerHTML = msg;
}

function sugReject(id){
  var s = sugFind(id);
  if(!s) return;
  s.status = 'rejected'; s.handledTs = Date.now();
  if(typeof SUGDB !== 'undefined' && s.fid){
    SUGDB.setStatus(s.fid, {status:'rejected', handledTs:s.handledTs});
    SUG_REMOTE = SUG_REMOTE.filter(function(x){ return x.id!==id; });
  }
  sugSaveQueue();
  sugAdminRender();
}
function sugAdminClearHandled(){
  if(!confirm('처리 완료된 제보 기록을 모두 지울까요?')) return;
  SUG_QUEUE = SUG_QUEUE.filter(function(x){ return x.status==='pending'; });
  sugSaveQueue();
  sugAdminRender();
}

/* ── 전체 사진 관리(#sphmgr) : 지금 ROOM_PHOTOS에 들어있는 모든 사진을 보고 골라서 지운다.
   추가는 #sph의 파일 선택·폴더 선택(phAdd)을 그대로 쓰고, 여기서는 조회·삭제만 다룬다. ── */
var sphMgrSelected = new Set();
/* 관리자 화면 입구 — 첫 화면 로고를 1.5초 안에 5번 연달아 누르면 로그인 화면이 뜬다.
   다른 사람이 우연히 들어오지 않게 숨긴 입구일 뿐이고, 막는 일은 서버 규칙이 한다.
   v84 : 예전 숫자 7자리 비밀번호는 코드에 글자 그대로 있어 누구나 볼 수 있었다 — 없앴다.
   관리자는 Firebase 계정(이메일·비밀번호)으로 로그인하고, 서버의 admins 명단에 있어야 한다. */
var pwGateFrom = 'sset';   // 뒤로가기 눌렀을 때 어디로 돌아갈지(설정에서 왔는지, 첫 화면 로고에서 왔는지)
var logoTapCount = 0, logoTapTimer = null;
function logoSecretTap(){
  logoTapCount++;
  if(logoTapTimer) clearTimeout(logoTapTimer);
  // 1.5초 안에 다음 탭이 없으면 카운트 리셋 — 5번을 "연속으로" 눌러야만 인정
  logoTapTimer = setTimeout(function(){ logoTapCount = 0; }, 1500);
  if(logoTapCount >= 5){
    logoTapCount = 0;
    if(logoTapTimer){ clearTimeout(logoTapTimer); logoTapTimer=null; }
    openAdminGate('s1');
  }
}
function openAdminGate(from){
  pwGateFrom = from || 'sset';
  var useFb = (typeof SUGDB !== 'undefined' && SUGDB.online());
  if(useFb){
    if(SUGDB.user()){ go('sph'); return; }          // 이미 관리자로 로그인돼 있으면 바로
    SUGDB.ensure().then(function(){ if(SUGDB.user() && document.getElementById('spwgate').classList.contains('on')) go('sph'); })['catch'](function(){});
  }
  fbGateShow(useFb);
  go('spwgate');
  if(useFb) setTimeout(function(){ var em = document.getElementById('fbEmail'); if(em) em.focus(); }, 60);
}/* 일부 iOS 브라우저/웹뷰 환경에서는 window.confirm()이 아예 응답하지 않아(눌러도 무반응)
   삭제 버튼이 안 눌리는 것처럼 보이는 문제가 있었다. 네이티브 confirm() 대신 직접 그린
   확인창으로 대체해서 안드로이드·아이폰 모두 같은 방식으로 동작하게 한다. */
function appConfirm(message, onYes){
  var ov = document.createElement('div');
  ov.className = 'appConfirmOverlay';
  var box = document.createElement('div');
  box.className = 'appConfirmBox';
  var p = document.createElement('p');
  p.textContent = message;
  var btns = document.createElement('div');
  btns.className = 'appConfirmBtns';
  var cancelBtn = document.createElement('button');
  cancelBtn.type = 'button'; cancelBtn.className = 'appConfirmCancel'; cancelBtn.textContent = '취소';
  var okBtn = document.createElement('button');
  okBtn.type = 'button'; okBtn.className = 'appConfirmOk'; okBtn.textContent = '삭제';
  btns.appendChild(cancelBtn); btns.appendChild(okBtn);
  box.appendChild(p); box.appendChild(btns);
  ov.appendChild(box);
  document.body.appendChild(ov);
  function close(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }
  cancelBtn.addEventListener('click', close);
  okBtn.addEventListener('click', function(){ close(); onYes(); });
  ov.addEventListener('click', function(e){ if(e.target === ov) close(); });
}
/* 관리자가 '전체 사진 관리'에서 지운 사진은 지금까지 메모리(ROOM_PHOTOS)에서만 지워져서,
   화면엔 안 보여도 앱을 껐다 켜면(다시 로드하면) 임베디드 원본이 그대로 되살아났다
   (안드로이드에서 "삭제했는데 재실행하면 그대로 있다"고 보고된 문제).
   지워진 사진의 키만 작게 localStorage에 남겨 두었다가, 다음 로드 때 그 목록을 다시 제외한다. */
function sphDeletedKeys(){
  try{ return JSON.parse(localStorage.getItem('sphDeletedPhotos')||'[]'); }catch(e){ return []; }
}
function sphSaveDeletedKeys(list){
  try{ localStorage.setItem('sphDeletedPhotos', JSON.stringify(list)); }catch(e){ /* 저장 실패해도 이번 세션엔 지워진 채로 보임 */ }
}
function sphMarkDeleted(keys){
  var cur = sphDeletedKeys();
  keys.forEach(function(k){ if(cur.indexOf(k) < 0) cur.push(k); });
  sphSaveDeletedKeys(cur);
}
/* 앱이 켜질 때 ROOM_PHOTOS가 임베디드 원본으로 채워진 직후 한 번 호출해서,
   이전에 삭제해 둔 사진들을 다시 제외시킨다. */
function sphApplyDeleted(){
  var del = sphDeletedKeys();
  if(!del.length) return;
  var delSet = {};
  del.forEach(function(k){ delSet[k] = true; });
  Object.keys(ROOM_PHOTOS).forEach(function(code){
    var arr = ROOM_PHOTOS[code];
    if(!arr) return;
    var keep = arr.filter(function(p){ return !delSet[sphMgrKey(code, p.n)]; });
    if(keep.length !== arr.length){
      if(keep.length) ROOM_PHOTOS[code] = keep; else delete ROOM_PHOTOS[code];
    }
  });
}
function sphMgrKey(code, n){ return code + '|' + n; }
function sphMgrRows(){
  var rows = [];
  Object.keys(ROOM_PHOTOS).forEach(function(code){
    (ROOM_PHOTOS[code] || []).forEach(function(p){ rows.push({code:code, n:p.n, u:p.u}); });
  });
  rows.sort(function(a, b){
    var fa = phFloorOf(a.code); fa = (fa===null || fa===undefined) ? -1 : fa;
    var fb = phFloorOf(b.code); fb = (fb===null || fb===undefined) ? -1 : fb;
    if(fa !== fb) return fa - fb;
    if(a.code !== b.code) return a.code < b.code ? -1 : 1;
    return 0;
  });
  return rows;
}
function sphMgrSyncBtns(){
  var info = document.getElementById('sphMgrSelInfo');
  if(info) info.textContent = sphMgrSelected.size ? (sphMgrSelected.size + '장 선택됨') : '';
  var delBtn = document.getElementById('sphMgrDelBtn');
  if(delBtn) delBtn.disabled = !sphMgrSelected.size;
  var emptyBtn = document.getElementById('sphMgrEmptyBtn');
  if(emptyBtn){
    emptyBtn.classList.toggle('on', sphMgrShowEmpty);
    emptyBtn.textContent = sphMgrShowEmpty ? '빈 위치 숨기기' : '빈 위치도 보기';
  }
}
/* ── 사진 추가(끌어다 놓기) ────────────────────────────────────────
   파일 탐색기에서 사진(또는 ZIP)을 끌어다 원하는 위치 묶음 위에 놓으면 그 자리에 바로 들어간다.
   놓은 위치가 곧 저장 위치이므로, 파일명으로 위치를 추측하는 #phsort 확인 화면을 거치지 않는다.
   (끌어놓기가 안 되는 휴대폰에서는 위치 제목 옆 ＋ 버튼이 같은 일을 한다.) */
var sphMgrShowEmpty = false;    // 사진이 0장인 위치까지 놓을 자리로 펼쳐 보일지
var sphMgrBusy = false;         // 읽는 중 중복 실행 방지

function sphMgrSay(msg){
  var el = document.getElementById('sphMgrDropStat');
  if(el) el.textContent = msg || '';
}
function sphMgrToggleEmpty(){
  sphMgrShowEmpty = !sphMgrShowEmpty;
  sphMgrRender();
}
/* 지운 사진은 sphDeletedPhotos에 키가 남아 다음 로드 때 다시 제외되므로,
   같은 이름으로 새로 넣었다면 그 표시를 지워 줘야 재실행 후에도 남는다. */
function sphUnmarkDeleted(keys){
  var cur = sphDeletedKeys();
  var next = cur.filter(function(k){ return keys.indexOf(k) < 0; });
  if(next.length !== cur.length) sphSaveDeletedKeys(next);
}
/* at : 그 위치의 사진 목록에서 몇 번째 자리에 끼워 넣을지(0 = 맨 앞).
        비워 두면 맨 뒤에 붙인다. 사진 순서는 곧 안내 화면에서 넘겨 보는 순서이고,
        맨 앞 사진이 대표 사진이라 순서를 직접 정할 수 있어야 한다. */
/* v64 : 관리자가 앱 안에서 넣고 뺀 사진을 모든 기기에 반영한다 (로그인 상태일 때) */
function sphSrvOn(){ return typeof SUGDB !== 'undefined' && SUGDB.user && !!SUGDB.user(); }
function sphSrvAdd(code, ent){
  if(!sphSrvOn()) return;
  SUGDB.unhidePhoto(code, ent.n);
  SUGDB.publishPhoto({code:code, n:ent.n, u:ent.u, cap:'', ts:Date.now()}).then(function(r){
    if(!r || !r.pid) return;
    ent.pid = r.pid;
    if(typeof SUGAI !== 'undefined' && SUGAI.syncServerOne) SUGAI.syncServerOne(r);
  });
}
function sphSrvLookup(keys){
  return keys.map(function(key){
    var i = key.indexOf('|'), code = key.slice(0, i), n = key.slice(i + 1);
    var p = (ROOM_PHOTOS[code] || []).filter(function(q){ return q.n === n; })[0];
    return {code:code, n:n, pid:(p && p.pid) || ''};
  });
}
function sphSrvRemove(list){
  if(!sphSrvOn() || !list.length) return;
  list.forEach(function(x){
    if(x.pid){
      SUGDB.unpublishPhoto(x.pid);
      if(typeof SUGAI !== 'undefined' && SUGAI.srvDrop) SUGAI.srvDrop(x.pid);
    }
    SUGDB.hidePhoto(x.code, x.n);          // 원래 사진이든 올린 사진이든 이름으로도 막아 둔다
  });
  sphMgrSay(list.length + '장 뺐습니다 — 모든 기기에 반영됩니다.');
}
function sphMgrAddFiles(code, files, at){
  if(!code || !files || !files.length) return;
  if(sphMgrBusy){ sphMgrSay('앞의 사진을 읽는 중입니다. 잠시만요…'); return; }
  sphMgrBusy = true; PH_SKIP = [];
  sphMgrSay('사진을 여는 중…');
  phCollect(files, function(items){
    if(!items.length){
      sphMgrBusy = false;
      sphMgrSay('넣을 수 있는 사진이 없습니다. (jpg·png·webp·zip)');
      return;
    }
    var i = 0, ok = 0, dup = 0, bad = 0, added = [];
    var have = (ROOM_PHOTOS[code] || []).length;
    var pos = (at === null || at === undefined) ? have : Math.max(0, Math.min(at, have));
    var startPos = pos;
    (function step(){
      if(i >= items.length){
        sphMgrBusy = false;
        if(ok){
          sphUnmarkDeleted(added);
          phRebuildRoomNames();
          phRender();
        }
        sphMgrRender();
        sphMgrSay(phDestName(code) + ' ' + (ok ? ((startPos + 1) + '번째 자리에 ') : '') + ok + '장 넣었습니다.' +
          (dup ? ('  (이름이 같은 ' + dup + '장 건너뜀)') : '') +
          (bad ? ('  (읽지 못한 ' + bad + '장 제외)') : ''));
        return;
      }
      var it = items[i++];
      sphMgrSay('사진 읽는 중…  ' + i + ' / ' + items.length);
      phShrink(it.b, function(url){
        if(url){
          var base = it.n.split('/').pop();
          if(!ROOM_PHOTOS[code]) ROOM_PHOTOS[code] = [];
          if(ROOM_PHOTOS[code].some(function(p){ return p.n === base; })){
            dup++;
          }else{
            var ent = {n:base, u:url};
            ROOM_PHOTOS[code].splice(pos, 0, ent);
            sphSrvAdd(code, ent);               /* v64 : 모든 기기에 반영 */
            pos++;                                    // 여러 장이면 고른 순서 그대로 이어서 끼운다
            added.push(sphMgrKey(code, base));
            ok++;
          }
        }else{ bad++; }
        setTimeout(step, 0);
      });
    })();
  });
}
/* 화면에 그릴 묶음 목록 : [{code, rows}] — '빈 위치도 보기'가 켜져 있으면 사진 0장인 위치도 포함 */
function sphMgrGroups(){
  var map = {}, codes = [];
  sphMgrRows().forEach(function(r){
    if(!map[r.code]){ map[r.code] = []; codes.push(r.code); }
    map[r.code].push(r);
  });
  if(sphMgrShowEmpty){
    phTargets().forEach(function(t){
      if(!map[t.code]){ map[t.code] = []; codes.push(t.code); }
    });
  }
  codes.sort(function(a, b){
    var fa = phFloorOf(a); fa = (fa===null || fa===undefined) ? -1 : fa;
    var fb = phFloorOf(b); fb = (fb===null || fb===undefined) ? -1 : fb;
    if(fa !== fb) return fa - fb;
    return a < b ? -1 : (a > b ? 1 : 0);
  });
  return codes.map(function(c){ return {code:c, rows:map[c]}; });
}
function sphMgrRender(){
  var list = document.getElementById('sphMgrList');
  if(!list) return;
  if(!list._mgrBound){
    list._mgrBound = true;
    list.addEventListener('change', function(e){
      var chk = e.target.closest('.mgrChk');
      if(!chk) return;
      var key = sphMgrKey(chk.dataset.code, chk.dataset.name);
      if(chk.checked) sphMgrSelected.add(key); else sphMgrSelected.delete(key);
      sphMgrSyncBtns();
    });
    list.addEventListener('click', function(e){
      var add = e.target.closest('.mgrAdd');
      if(add){ sphMgrPickFor(add.dataset.code); return; }
      var btn = e.target.closest('.mgrDel');
      if(!btn) return;
      sphMgrDeleteOne(btn.dataset.code, btn.dataset.name);
    });
    /* 끌어다 놓기 : 묶음 테두리로 '어느 위치'인지, 사진 사이 파란 선으로 '몇 번째 자리'인지 보여준다.
       마우스가 어느 사진 줄의 위/아래 절반에 있는지로 끼울 자리를 정한다. */
    var overSec = null;
    function clearIns(){
      var m = list.querySelectorAll('.mgrRow.dropBefore, .mgrRow.dropAfter');
      for(var i=0;i<m.length;i++) m[i].classList.remove('dropBefore', 'dropAfter');
    }
    function setOver(sec){
      if(overSec === sec) return;
      if(overSec) overSec.classList.remove('over');
      overSec = sec;
      if(sec) sec.classList.add('over');
      if(!sec) clearIns();
    }
    /* 커서 위치 → 끼워 넣을 순번(0 = 맨 앞). 사진이 없는 묶음이면 0. */
    function insertIdxAt(sec, y){
      var rows = sec.querySelectorAll('.mgrRow');
      for(var i=0;i<rows.length;i++){
        var r = rows[i].getBoundingClientRect();
        if(y < r.top + r.height/2) return i;
      }
      return rows.length;
    }
    function markIns(sec, idx){
      clearIns();
      var rows = sec.querySelectorAll('.mgrRow');
      if(!rows.length) return;
      if(idx >= rows.length) rows[rows.length-1].classList.add('dropAfter');
      else rows[idx].classList.add('dropBefore');
    }
    function secOf(e){ return (e.target && e.target.closest) ? e.target.closest('.mgrSec') : null; }
    list.addEventListener('dragover', function(e){
      var sec = secOf(e);
      if(!sec){ setOver(null); return; }
      e.preventDefault();
      if(e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      setOver(sec);
      markIns(sec, insertIdxAt(sec, e.clientY));
    });
    list.addEventListener('dragleave', function(e){
      if(!list.contains(e.relatedTarget)) setOver(null);
    });
    list.addEventListener('drop', function(e){
      var sec = secOf(e);
      if(!sec){ setOver(null); return; }
      e.preventDefault(); e.stopPropagation();
      var idx = insertIdxAt(sec, e.clientY);
      setOver(null); clearIns();
      if(e.dataTransfer && e.dataTransfer.files) sphMgrAddFiles(sec.dataset.code, e.dataTransfer.files, idx);
    });
  }
  var groups = sphMgrGroups();
  var rowCount = 0;
  groups.forEach(function(g){ rowCount += g.rows.length; });
  var total = document.getElementById('sphMgrTotal');
  if(total) total.textContent = '총 ' + rowCount + '장';
  if(!groups.length){
    list.innerHTML = '<div class="sugEmpty">등록된 사진이 없습니다. 위의 <b>빈 위치도 보기</b>를 켜면 ' +
      '사진을 끌어다 놓을 위치가 모두 나옵니다.</div>';
    sphMgrSyncBtns();
    return;
  }
  var html = '';
  groups.forEach(function(g){
    html += '<div class="mgrSec" data-code="' + sugEsc(g.code) + '">' +
      '<div class="mgrGroup">' +
        '<span class="mgrGName">' + sugEsc(phCap(g.code)) + ' (' + sugEsc(g.code) + ')</span>' +
        '<span class="mgrGCnt">' + g.rows.length + '장</span>' +
        '<button type="button" class="mgrAdd" data-code="' + sugEsc(g.code) + '" title="이 위치에 사진 넣기">＋</button>' +
      '</div>';
    if(!g.rows.length){
      html += '<div class="mgrEmptyHint">사진 없음 — 여기에 끌어다 놓으세요</div>';
    }
    g.rows.forEach(function(r){
      var key = sphMgrKey(r.code, r.n);
      var checked = sphMgrSelected.has(key) ? 'checked' : '';
      html += '<div class="mgrRow">' +
        '<input type="checkbox" class="mgrChk" data-code="' + sugEsc(r.code) + '" data-name="' + sugEsc(r.n) + '" ' + checked + '>' +
        '<img src="' + r.u + '" class="mgrThumb" alt="">' +
        '<span class="mgrName">' + sugEsc(r.n) + '</span>' +
        '<button type="button" class="mgrDel" data-code="' + sugEsc(r.code) + '" data-name="' + sugEsc(r.n) + '">✕</button>' +
      '</div>';
    });
    html += '</div>';
  });
  list.innerHTML = html;
  sphMgrSyncBtns();
}
/* ＋ 버튼 : 끌어놓기가 안 되는 기기용 — 고른 파일을 그 위치에 그대로 넣는다. */
var sphMgrPickCode = '';
function sphMgrPickFor(code){
  var f = document.getElementById('sphMgrFile');
  if(!f) return;
  sphMgrPickCode = code;
  f.click();
}
function sphMgrRemove(code, name){
  var arr = ROOM_PHOTOS[code];
  if(!arr) return;
  var idx = arr.findIndex(function(p){ return p.n === name; });
  if(idx >= 0) arr.splice(idx, 1);
  if(!arr.length) delete ROOM_PHOTOS[code];
}
function sphMgrDeleteOne(code, name){
  appConfirm('이 사진을 삭제할까요?', function(){
    var srvList = sphSrvLookup([sphMgrKey(code, name)]);     /* v64 */
    sphMgrRemove(code, name);
    sphSrvRemove(srvList);
    sphMgrSelected.delete(sphMgrKey(code, name));
    sphMarkDeleted([sphMgrKey(code, name)]);
    phRender();
    sphMgrRender();
  });
}
function sphMgrDeleteSelected(){
  if(!sphMgrSelected.size){ alert('삭제할 사진을 먼저 선택해 주세요.'); return; }
  var keys = Array.prototype.slice.call(sphMgrSelected);
  appConfirm(sphMgrSelected.size + '장을 삭제할까요? 되돌릴 수 없습니다.', function(){
    var srvList = sphSrvLookup(keys);                         /* v64 */
    keys.forEach(function(key){
      var idx = key.indexOf('|');
      sphMgrRemove(key.slice(0, idx), key.slice(idx + 1));
    });
    sphMarkDeleted(keys);
    sphSrvRemove(srvList);                                    /* v64 : 모든 기기에 반영 */
    sphMgrSelected.clear();
    phRender();
    sphMgrRender();
  });
}
function sphMgrSelectAll(){
  sphMgrRows().forEach(function(r){ sphMgrSelected.add(sphMgrKey(r.code, r.n)); });
  sphMgrRender();
}
function sphMgrClearSel(){
  sphMgrSelected.clear();
  sphMgrRender();
}
