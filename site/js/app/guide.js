"use strict";
/* guide.js — 길안내 단계 만들기(buildSteps) · 몇 번째 방 · 안내 화면(6번)
   (예전 한 파일 main.js 의 16214~16537줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
/* ========== 안내 단계 생성 ========== */
var ORD_EN = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'];
function ordWordEn(k){ return (k>=1 && k<=ORD_EN.length) ? ORD_EN[k-1] : (k+'th'); }
function buildSteps(){
  var lv=target.floor, out=[];
  var sf = startFloor;                        // 지금 계신 층
  var sameFloor = (sf===lv);                  // 목적지와 같은 층이면 엘리베이터 불필요

  /* v147: QR·직접선택으로 문이 정해져 있고 지금 1층이면,
     '그 문으로 들어와 복도로 나온다'를 맨 앞 단계로 하나 더 넣는다(4단계 → 5단계).
     처음 온 사람은 문을 지나 복도까지 나오는 이 첫 구간이 제일 막막하기 때문. */
  var gk = (typeof currentGateKey==='function') ? currentGateKey() : null;
  if(gk && sf===1 && ROOM_PHOTOS['GATE_'+gk]){
    var GN = {MAIN:{ko:'정문', en:'the main gate'},  BACK:{ko:'후문', en:'the back gate'},
              EAST:{ko:'동문', en:'the east gate'}, WEST:{ko:'서문', en:'the west gate'}};
    var gn = GN[gk] || GN.MAIN;
    out.push({a:'↑', type:'straight',
              tko: gn.ko+'으로 들어오세요',
              ten: 'Enter through '+gn.en,
              ph: '[ '+gn.ko+' 사진 ]', code:'GATE_'+gk});
  }
  // 출발층 엘리베이터 앞 사진(있으면). B1은 EV 사진이 없으므로 EV1로 대체.
  var startEV = (typeof sf==='number') ? ('EV'+sf) : 'EV1';
  var sfName = typeof sf==='number' ? lvName(sf) : lvName(1);

  /* 멘트 규칙 : 한 줄에 들어가게 짧게, 모두 '~세요'로 끝을 맞춘다.
     예전에는 '~으로 이동'(명사끝)과 '~하세요'가 섞여 있고 문장이 길어 두 줄로 넘어갔다. */
  if(!sameFloor){
    var goUp = lvIndex(lv) > lvIndex(sf);
    out.push({a: goUp?'↑':'↓', type:'lift',
              tko: '엘리베이터로 '+lvName(lv)+'까지 '+(goUp?'올라가세요':'내려가세요'),
              ten: 'Take the elevator '+(goUp?'up to ':'down to ')+lvName(lv),
              ph:'['+sfName+' 엘리베이터 사진 ]', code:startEV});
  }
  if(target.kind==='zone'){
    if(sameFloor) out.push({a:'↑', type:'straight', tko:'정면 넓은 곳으로 가세요', ten:'Head to the open area ahead', ph:'[ 지하 1층 사진 ]', code:'B1'});
    else          out.push({a:'↑', type:'straight', tko:'내려서 정면으로 가세요', ten:'Get off and head to the open area ahead', ph:'[ 지하 1층 사진 ]', code:'B1'});
    out.push({a:'✓', type:'arrive', tko:'크리에이티브 존에 도착했습니다', ten:'You have arrived at the Creative Zone', ph:'[ 크리에이티브 존 사진 ]', code:'B1'});
    return out;
  }

  var p=targetPos();
  /* ── 좌우 안내 기준 ────────────────────────────────────────────
     '어느 쪽으로 도는가'와 '방이 어느 쪽에 있는가'는 서로 다른 기준이다.
     예전에는 둘 다 방의 X좌표 하나로 정해서, 13524처럼
     "왼쪽으로 돈 뒤 오른쪽 끝"에 있는 방을 "왼쪽 세 번째"라고 잘못 안내했다.

       · 엘리베이터(x=+6.3)에서 복도로 나오면 −X 방향을 보고 선다
       · −X를 보고 서면 왼손 쪽이 +Z  → 목적지가 +Z 쪽이면 '왼쪽으로 돈다'
       · +Z를 보고 걸으면 왼손 쪽이 +X → 목적지가 −X면 '오른쪽에 있다'

     13524(x=−6.3, z=+18.3) → 왼쪽으로 돌고, 오른쪽에 있다. 실제와 일치.
     혹시 현장에서 전부 반대로 느껴지면 GUIDE_FLIP만 true로 바꾸면 된다. */
  var GUIDE_FLIP = false;
  var evp   = evXZ(lv);
  var faceX = (evp.x >= 0) ? -1 : 1;                  // 엘리베이터에서 복도로 나오는 방향
  var dz    = (p.z >= evp.z) ? 1 : -1;                // 복도에서 걸어갈 방향
  var turnLeft = ((dz === -faceX) !== GUIDE_FLIP);            // 내려서 도는 방향

  /* v150: 문으로 들어와 같은 층(1층)을 찾아갈 때는 엘리베이터를 아예
     거치지 않는다 → '엘리베이터 앞에서 왼쪽으로' 같은 안내가 맞지 않았다.
     기준점을 '들어온 문'으로 바꾸고, 방향·차례·거리 표현을 전부 다시 잡는다.
       · 동문(복도 남쪽 끝) : 들어서면 이미 복도 정면(+Z) → 돌 필요 없음
       · 서문(복도 북쪽 끝) : 들어서면 이미 복도 정면(-Z) → 돌 필요 없음
       · 정문(-X 옆벽)     : 복도로 나와 좌/우로 한 번 돈다
       · 후문(+X 계단홀)   : 복도로 나와 좌/우로 한 번 돈다                    */
  var fromGateHere = !!(gk && sf===1 && lv===1);
  var gateFace = null, gateZ = 0;
  if(fromGateHere){
    if(gk==='EAST'){ gateZ = GLOBAL_BOT_Z;                     gateFace = 'Z+'; }
    else if(gk==='WEST'){ gateZ = GLOBAL_TOP_Z;                gateFace = 'Z-'; }
    else if(gk==='BACK'){ gateZ = (FLOOR_LAYOUT[1]||{}).stZ||0; gateFace = 'X-'; }
    else {                gateZ = 0;                            gateFace = 'X+'; }
    dz = (p.z >= gateZ) ? 1 : -1;
    /* 몸이 향한 쪽 기준 왼손 방향 : +Z를 보면 왼손이 +X, -X를 보면 왼손이 +Z
       (기존 주석의 규칙을 그대로 따른다) */
    if(gateFace==='X+')      turnLeft = (dz === -1);   // +X를 보면 왼손이 -Z
    else if(gateFace==='X-') turnLeft = (dz ===  1);   // -X를 보면 왼손이 +Z
    else                     turnLeft = false;         // 이미 복도 정면 — 돌지 않는다
    if(GUIDE_FLIP) turnLeft = !turnLeft;
  }
  var noTurn = !!(fromGateHere && (gateFace==='Z+' || gateFace==='Z-'));
  var roomLeft = ((((p.x > 0) ? 1 : -1) === dz) !== GUIDE_FLIP);  // 걷는 동안 방이 있는 쪽
  var turnWord = turnLeft ? '왼쪽' : '오른쪽';
  var turnWordEn = turnLeft ? 'left' : 'right';
  var arw      = turnLeft ? '←' : '→';
  var side     = roomLeft ? '왼쪽' : '오른쪽';
  var sideEn   = roomLeft ? 'left' : 'right';
  var lead = fromGateHere ? '복도로 나와 ' : (sameFloor ? '엘리베이터 앞에서 ' : '내려서 ');
  var leadEn = fromGateHere ? 'Step into the hallway and turn '
                            : (sameFloor ? 'At the elevator, turn ' : 'Get off and turn ');
  /* v151: 돌기 단계 사진.
     예전엔 문에서 출발하면 1단계와 똑같은 문 사진을 그대로 다시 썼다 —
     "복도로 나와 왼쪽으로 도세요"인데 화면은 아직 문 앞이라 어긋났다.
     이 단계에서 실제로 보게 되는 건 '돌아선 쪽 복도'이므로 그 사진을 쓴다.
     (엘리베이터에서 출발할 때는 예전대로 엘리베이터 앞 사진) */
  var turnPhCode = fromGateHere ? ('HALL'+lv+(turnLeft?'L':'R')) : ('EV'+lv);
  var turnPhTxt  = fromGateHere ? ('['+lvName(lv)+' 복도 사진 ]')
                                : ('['+lvName(lv)+' 엘리베이터 앞 사진 ]');

  if(target.kind==='toilet'){
    out.push({a:arw, type:'turn', tko:'복도 건너 '+turnWord+'으로 가세요', ten:'Cross the hallway to the '+turnWordEn, ph:turnPhTxt, code:turnPhCode});
    out.push({a:'✓', type:'arrive', tko:'화장실에 도착했습니다', ten:'You have arrived at the restroom', ph:'[ 화장실 앞 사진 ]', code:'WC'+lv});
    return out;
  }

  if(target.kind==='emstair'){
    // 비상계단은 복도 맨 끝(강의실보다 더 바깥쪽)에 있으므로, 화장실처럼 바로 옆이 아니라
    // 강의실 안내처럼 "돌기 → 복도를 따라 쭉 → 도착" 3단계로 안내한다.
    if(!noTurn)   // v150: 동문·서문으로 들어오면 이미 복도 정면이라 돌 필요가 없다
      out.push({a:arw, type:'turn', tko:lead+turnWord+'으로 도세요', ten:leadEn+turnWordEn, ph:turnPhTxt, code:turnPhCode});
    out.push({a:'↑', type:'straight', tko:'복도 끝까지 쭉 가세요', ten:'Go straight to the end of the hallway', ph:'['+lvName(lv)+' 복도 사진 ]',
              code:'HALL'+lv+(turnLeft?'L':'R')});
    out.push({a:'✓', type:'arrive', tko:'비상계단에 도착했습니다', ten:'You have arrived at the emergency stairs', ph:'[ 비상계단 사진 ]', code:'EMS'+lv});   /* v79 : ES 는 중앙계단 */
    return out;
  }

  // 강의실
  var L=FLOOR_LAYOUT[lv];
  var nearCore = Math.abs(p.z) < UNIT_Z*1.4;
  var farEdge  = p.z>0 ? (p.z > L.topOuterZ*0.6) : (p.z < L.bottomOuterZ*0.6);
  var distTxt = nearCore ? '엘리베이터에서 가까운 곳' : (farEdge ? '복도 끝 쪽' : '복도 중간쯤');
  var distTxtEn = nearCore ? 'near the elevator' : (farEdge ? 'near the end of the hallway' : 'in the middle of the hallway');
  var ord = roomOrdinal(lv, p);   // 엘리베이터(코어)에서 세어 몇 번째 방인지
  /* v150: 동문·서문은 복도 '끝'에서 들어오므로, 코어에서 센 차례를 뒤집어야
     들어온 사람 기준의 차례가 된다(끝에서 첫 번째 = 코어 기준 마지막). */
  /* 단, roomOrdinal은 '코어 기준 같은 Z반쪽'만 세므로, 목적지가 그 문과 같은
     반쪽에 있을 때만 뒤집는 게 맞다. 반대쪽 방은 어차피 코어를 지나가므로
     코어 기준 차례가 그대로 맞다. */
  if(fromGateHere && ord && ord.n && ord.total &&
     ((gk==='EAST' && p.z < 0) || (gk==='WEST' && p.z > 0)))
    ord = {n: ord.total - ord.n + 1, total: ord.total};
  var _rtKo = roomTitle(target.code, 'ko');
  var _rtEn = roomTitle(target.code, 'en');

  if(!noTurn)   // v150: 동문·서문으로 들어오면 이미 복도 정면이라 돌 필요가 없다
    out.push({a:arw, type:'turn', tko:lead+turnWord+'으로 도세요', ten:leadEn+turnWordEn, ph:turnPhTxt, code:turnPhCode});
  /* 문 바로 앞 방(들어와서 첫 번째)이면 '쭉 가세요'가 오히려 헷갈린다 → 생략 */
  var justInside = !!(fromGateHere && ord && ord.n === 1);
  if(!justInside)
    out.push({a:'↑', type:'straight', tko:'복도를 따라 쭉 가세요', ten:'Go straight down the hallway', ph:'['+lvName(lv)+' 복도 사진 ]',
              code:'HALL'+lv+(turnLeft?'L':'R')});
  // '복도 중간쯤'처럼 두루뭉술한 표현 대신, 엘리베이터에서 몇 번째 문인지 세어서 알려준다.
  // 호실번호·이름은 화면 맨 위 제목("13524호 · PC실 가는 길")에 이미 있으므로 여기서는 뺀다.
  // 그 줄의 마지막 방이면 몇 번째인지 세는 것보다 '맨 끝'이 훨씬 잘 와닿는다.
  var arriveTxtKo, arriveTxtEn, _where;
  if(ord.n && ord.n === ord.total && ord.total >= 2){
    _where = side+' 맨 끝에 ';
    arriveTxtEn = _rtEn+' is at the far '+sideEn+' end.';
  } else if(ord.n){
    _where = side+'에서 '+ordWord(ord.n)+' 방에 ';
    arriveTxtEn = _rtEn+' is the '+ordWordEn(ord.n)+' room on the '+sideEn+'.';
  } else {
    _where = distTxt+'에 ';
    arriveTxtEn = _rtEn+' is '+distTxtEn+'.';
  }
  arriveTxtKo = _where + _rtKo + subjParticle(_rtKo) + ' 있습니다';
  out.push({a:'✓', type:'arrive', tko:arriveTxtKo, ten:arriveTxtEn,
            ph:'[ '+target.code+'호 문 앞 사진 ]', code:target.code});
  return out;
}
/* 엘리베이터에서 복도를 따라 걸어갈 때, 목적지가 그쪽 줄에서 몇 번째 문인지 센다.
   (같은 쪽 벽 = x부호 같음, 같은 방향 = z부호 같음. 가벽으로 나뉜 방은 한 칸으로 묶어 센다) */
/* '1번째 방'은 어색하므로 우리말 차례말로 바꾼다(첫·두·세…). 열을 넘으면 숫자 그대로. */
var ORD_KO = ['첫','두','세','네','다섯','여섯','일곱','여덟','아홉','열'];
function ordWord(k){ return (k>=1 && k<=ORD_KO.length) ? (ORD_KO[k-1]+' 번째') : (k+'번째'); }
function roomOrdinal(lv, p){
  var L = FLOOR_LAYOUT[lv];
  if(!L || !L.cells || !L.lookup || !target || !target.code) return 0;
  var tc = L.lookup[target.code];
  if(!tc) return 0;
  // lookup 항목은 {cells:[...], x, z} 형태라 코드·parent는 cells[0]에서 꺼내야 한다
  var tCell = (tc.cells && tc.cells[0]) ? tc.cells[0] : null;
  var tKey = tCell ? (tCell.parent || tCell.code) : target.code;
  var seen = {}, list = [];
  L.cells.forEach(function(c){
    if(!c.code || c.searchable===false) return;
    if((c.x>0) !== (p.x>0)) return;      // 복도 반대쪽 벽
    if((c.z>0) !== (p.z>0)) return;      // 코어 기준 반대 방향
    var key = c.parent || c.code;
    if(seen[key]) return;
    seen[key] = 1;
    list.push({key:key, z:Math.abs(c.z)});
  });
  list.sort(function(a,b){ return a.z - b.z; });   // 코어에서 가까운 순
  for(var i=0;i<list.length;i++) if(list[i].key===tKey) return {n:i+1, total:list.length};
  return {n:0, total:0};
}
function refreshGuideTitles(){
  var t6=document.getElementById('t6'), t7=document.getElementById('t7');
  if(!t6 || !target) return;
  t6.textContent = (LANG==='ko') ? (targetLabel()+' 가는 길') : ('Directions to '+targetLabel());
  t7.textContent = (LANG==='ko') ? (targetLabel()+' 도착') : ('Arrived at '+targetLabel());
}
function startGuide(){
  steps=buildSteps(); si=0;
  refreshGuideTitles();
  /* 도착 화면 사진 — 마지막 단계(✓ 도착)가 이미 가진 사진 코드를 그대로 쓴다.
     예전에는 강의실(kind==='room')일 때만 넣어서, 화장실(WC)·비상계단(EMS)·
     크리에이티브 존(B1)으로 안내하면 도착 화면 사진이 비어 있었다 (2026-09-24 사용자 제보). */
  var last = steps.length ? steps[steps.length-1] : null;
  phFill(document.getElementById('ph7'), last && last.code,
         (last && last.ph) || ('[ '+targetLabel()+' 사진 ]'));
  render6(true); go(6);
}
/* 트랙(.prog와 같은 폭) 위에서 현재 단계에 해당하는 x좌표(px)를 계산한다.
   1번째 단계(si=0)는 트랙의 왼쪽 끝(출발 📍)에 서 있고, 그 다음부터는 단계가
   끝날 때마다 그 칸의 오른쪽 끝(2번째 칸 끝, 3번째 칸 끝 …)으로 옮겨간다.
   마지막 단계에서는 자연히 트랙 오른쪽 끝(도착 🏁)에 닿는다. 아직 레이아웃 전이면 null. */
function walkerTargetX(){
  var track=document.getElementById('walkTrack');
  var prog=document.getElementById('prog');
  if(!track || !prog || !steps.length) return null;
  var tRect=track.getBoundingClientRect();
  var pRect=prog.getBoundingClientRect();
  if(!pRect.width) return null;
  var n = steps.length;
  var frac = (si===0) ? 0 : Math.min(1, (si+1)/n);
  return (pRect.left - tRect.left) + frac*pRect.width;
}
/* 다음/이전을 누를 때마다 곧장 자리를 옮기지 않고, 약 2.6초에 걸쳐 실제로
   걸어서 이동하는 것처럼 보이게 한다(진척도가 눈에 잘 보이도록). 마지막 단계에
   도착했을 때는 이 이동이 다 끝난 뒤에야 '골인' 튐 효과를 시작해서, 사람이
   결승선에 실제로 닿는 순간에 효과가 보이게 한다(전에는 이동과 동시에 재생돼
   화면(특히 폰)에서는 거의 안 보이고 지나갔었다). */
var walkerAnimId = null;
var ridePrevCamPos = null, rideTmpVec3 = null;   // 이동경로 재생 중 라벨 페이드용 임시 벡터
function stopWalkerAnim(){
  if(walkerAnimId){ cancelAnimationFrame(walkerAnimId); walkerAnimId = null; }
}
function walkerTo(x, isArrival, animate){
  var walker=document.getElementById('walker');
  if(!walker || x===null) return;
  stopWalkerAnim();
  if(!animate){
    walker.style.left = x+'px';
    walker.className = isArrival ? 'walker arrived' : 'walker walk';
    return;
  }
  var startX = parseFloat(walker.style.left) || x;
  var DUR = 2600, t0 = null;
  walker.className = 'walker walk';   // 이동하는 동안은 계속 걷는 모션
  function step(ts){
    if(t0===null) t0 = ts;
    var k = Math.min(1, (ts - t0) / DUR);
    var e = easeIO(k);
    walker.style.left = (startX + (x - startX) * e) + 'px';
    if(k < 1){
      walkerAnimId = requestAnimationFrame(step);
    }else{
      walkerAnimId = null;
      if(isArrival){
        // 클래스를 껐다 켜서(reflow) 골인 애니메이션이 도착한 시점에 새로 시작되게 한다
        walker.classList.remove('walk');
        void walker.offsetWidth;
        walker.classList.add('arrived');
      }
    }
  }
  walkerAnimId = requestAnimationFrame(step);
}
function render6(instant){
  var s=steps[si];
  var ar=document.getElementById('ar');
  ar.textContent=s.a;
  var cls = 'arrow';
  if(s.a==='✓'){
    cls += ' done';
  }else{
    var animType = s.type==='lift' ? 'anim-lift' : (s.type==='turn' ? 'anim-turn' : 'anim-straight');
    cls += ' ' + animType;
    if(s.a==='↓') cls += ' dir-down';
    else if(s.a==='←') cls += ' dir-left';
    else if(s.a==='→') cls += ' dir-right';
  }
  ar.className = cls;
  document.getElementById('ins').textContent=(LANG==='ko')?s.tko:s.ten;
  phFill(document.getElementById('ph'), s.code, s.ph);
  document.getElementById('stepno').textContent=(LANG==='ko')
    ? ((si+1)+' / '+steps.length+' 단계')
    : ('Step '+(si+1)+' / '+steps.length);
  var p=document.getElementById('prog'); p.innerHTML='';
  for(var i=0;i<steps.length;i++){
    var b=document.createElement('i'); if(i<=si) b.className='on'; p.appendChild(b);
  }
  // 걷는 사람을 출발(📍)~도착(🏁) 트랙 위, 지금 단계에 해당하는 위치로 옮긴다.
  // 화면에 막 들어왔을 때(instant)는 바로 그 자리에 세워두고, 다음/이전 버튼으로
  // 단계가 바뀔 때는 이전 자리에서 새 자리까지 걸어가는 모습을 보여준다.
  var x = walkerTargetX();
  if(x===null){
    // 화면 전환 애니메이션이 끝나 실제 크기가 잡힌 뒤 다시 시도
    requestAnimationFrame(function(){ walkerTo(walkerTargetX(), s.type==='arrive', false); });
  }else{
    walkerTo(x, s.type==='arrive', !instant);
  }
  document.getElementById('nx').textContent = (si===steps.length-1)
    ? ((LANG==='ko')?'도착했어요':"I've arrived")
    : ((LANG==='ko')?'다음 ›':'Next ›');
  // 첫 단계의 '이전'은 층 상세 화면으로 빠져나가는 버튼이므로 그렇게 적어준다
  document.getElementById('pv').textContent = (si===0)
    ? ((LANG==='ko')?'‹ 층 상세':'‹ Floor view')
    : ((LANG==='ko')?'‹ 이전':'‹ Prev');
  if(s.type==='arrive') spawnParticles('stepFx');   // 마지막(도착) 단계 파티클 효과
}
function prev(){
  if(si>0){ si--; render6(); }
  else go(5);          // 첫 단계 : 층 상세 화면으로 빠져나감
}
function next(){
  if(si<steps.length-1){ si++; render6(); }
  else go(7);
}

/* v51 : 앱이 백그라운드로 가면 3D 루프를 전부 멈추고, 돌아오면 보고 있던 화면 것만 다시 켠다 */
document.addEventListener('visibilitychange', function(){
  var s4on = document.getElementById('s4') && document.getElementById('s4').classList.contains('on');
  var s5on = document.getElementById('s5') && document.getElementById('s5').classList.contains('on');
  var s2on = document.getElementById('s2') && document.getElementById('s2').classList.contains('on');
  if(document.hidden){
    if(typeof animateRunning!=='undefined') animateRunning = false;
    if(typeof animateBRunning!=='undefined') animateBRunning = false;
    if(typeof bld3DLeave==='function') bld3DLeave();
  }else{
    if(s4on && typeof animateStart==='function') animateStart();
    if(s5on && typeof animateBRunning!=='undefined' && !animateBRunning && typeof rB!=='undefined' && rB){ animateBRunning=true; animateB(); }
    if(s2on && typeof bld3DEnter==='function') bld3DEnter();
  }
});
