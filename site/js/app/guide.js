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
  /* ★ 2026-09-27 : 문별 절차 — 사용자가 정한 순서를 그대로 따른다.
       ① 그 문의 **외관** 사진 — ○문으로 들어오세요   (아직 안 정한 문은 예전처럼 문 안쪽 사진)
       ② 들어와서 본 복도     — 복도를 따라 직진하세요
       ③ 1층 엘리베이터 정면  — 엘리베이터를 타고 …
     지하 크리에이티브 존이 목적지면 아래 zone 갈래에서 ④⑤⑥ 이 이어진다.
     GATE_OUT  : 그 문의 '바깥' 사진 — ①에 쓴다. 없는 문은 예전처럼 문 안쪽 사진을 쓴다.
     GATE_FLOW : '복도를 지나 엘리베이터로 가는' 문 — ②③ 이 붙는다.
                 후문은 바로 옆 계단으로 내려가므로 여기 없고, 아래에 따로 있다. */
  var GATE_OUT  = {EAST:'GATE_EAST_OUT', WEST:'GATE_WEST_OUT',
                   BACK:'GATE_BACK_OUT', MAIN:'GATE_MAIN_OUT'};
  var GATE_FLOW = {
    /* 동문·서문은 복도 끝에 있어 복도를 따라 걸어 들어온다 */
    EAST: {hall:'GATE_E',         tko:'복도를 따라 직진하세요', ten:'Go straight along the hallway'},
    WEST: {hall:'GATE_W',         tko:'복도를 따라 직진하세요', ten:'Go straight along the hallway'},
    /* 정문은 옆면에 있어 들어서면 바로 로비다 — 복도가 아니라 엘리베이터 쪽으로 간다.
       다만 위층 호실로 갈 때는 이 단계를 넣지 않는다(skipOnUp) — 바로 '엘리베이터를 타고'로 간다. */
    MAIN: {hall:'GATE_MAIN_WAY',  tko:'엘리베이터 앞으로 가세요',  ten:'Head to the elevator', skipOnUp:true},
    /* 후문은 들어서면 1층 라운지다. 엘리베이터는 늘 오른쪽에 있으므로 방향이 고정이다. */
    BACK: {hall:'LNG1',           tko:'1층 라운지에서 우회전 하세요', ten:'In the lobby, turn right'}
  };
  var flow = (gk && sf === 1) ? GATE_FLOW[gk] : null;
  /* 문·층별로 '엘리베이터로 올라가 좌·우회전' 절차를 정해 둔 표 (아래에서 단계를 만든다).
     여기서는 '그 절차를 쓰는 길인가'만 먼저 안다 — 위 정문 단계를 넣을지 말지에 쓰인다. */
  var UP_FLOW = {EAST:[2, 3], WEST:[2, 3], MAIN:[2, 3], BACK:[2]};
  var onUpFlow = !!(gk && sf === 1 && target.kind === 'room' &&
                    UP_FLOW[gk] && UP_FLOW[gk].indexOf(lv) >= 0);
  /* 후문 → 크리에이티브 존은 엘리베이터가 아니라 바로 옆 계단으로 내려간다(아래 전용 갈래).
     그 길에서는 '1층 라운지에서 우회전'(=엘리베이터 쪽)이 끼면 반대로 가라는 말이 된다 → 넣지 않는다. */
  var backStairZone = !!(gk === 'BACK' && sf === 1 && target.kind === 'zone');
  if(gk && sf===1 && ROOM_PHOTOS['GATE_'+gk]){
    var GN = {MAIN:{ko:'정문', en:'the main gate'},  BACK:{ko:'후문', en:'the back gate'},
              EAST:{ko:'동문', en:'the east gate'}, WEST:{ko:'서문', en:'the west gate'}};
    var gn = GN[gk] || GN.MAIN;
    out.push({a:'↑', type:'straight',
              tko: gn.ko+'으로 들어오세요',
              ten: 'Enter through '+gn.en,
              ph: '[ '+gn.ko+' 사진 ]',
              code: (gk && GATE_OUT[gk] && ROOM_PHOTOS[GATE_OUT[gk]]) ? GATE_OUT[gk] : ('GATE_'+gk)});
    /* 이 복도 단계는 '문 → 엘리베이터' 구간이다. 목적지가 1층이면 엘리베이터에 갈 일이 없고,
       아래에서 어차피 '복도를 따라 쭉 가세요'가 나오므로 같은 말이 두 번 겹친다 → 그때는 넣지 않는다. */
    if(flow && !sameFloor && !backStairZone && !(flow.skipOnUp && onUpFlow) && ROOM_PHOTOS[flow.hall])
      out.push({a:'↑', type:'straight',
                tko:flow.tko, ten:flow.ten,
                ph:'[ '+gn.ko+' 안쪽 사진 ]', code:flow.hall});
  }
  /* ★ 후문 → 크리에이티브 존 : 사용자가 정한 네 단계.
     후문은 들어서면 바로 옆이 지하로 내려가는 계단이라 엘리베이터를 타지 않는다
     → 여기서 끝내고 아래 엘리베이터 단계로 내려가지 않는다.
       ① 후문 외관        후문으로 들어오세요            (위에서 이미 넣었다)
       ② 지하로 내려가는 계단  좌측에 보이는 계단을 통해 내려가세요
       ③ 계단 중간에서 본 존   좌측에 크리에이티브 존이 있습니다
       ④ 존 정면            크리에이티브 존에 도착했습니다 */
  if(gk === 'BACK' && sf === 1 && target.kind === 'zone' &&
     ROOM_PHOTOS['GATE_BACK_STAIR'] && ROOM_PHOTOS['B1PATH']){
    out.push({a:'↓', type:'lift',
              tko:'좌측에 보이는 계단을 통해 내려가세요', ten:'Take the stairs on your left down',
              ph:'[ 후문 계단 사진 ]', code:'GATE_BACK_STAIR'});
    out.push({a:'←', type:'turn',
              tko:'좌측에 크리에이티브 존이 있습니다', ten:'The Creative Zone is on your left',
              ph:'[ 계단 중간 사진 ]', code:'B1PATH'});
    out.push({a:'✓', type:'arrive',
              tko:'크리에이티브 존에 도착했습니다', ten:'You have arrived at the Creative Zone',
              ph:'[ 크리에이티브 존 사진 ]', code:'B1'});
    return out;
  }

  // 출발층 엘리베이터 앞 사진(있으면). B1은 EV 사진이 없으므로 EV1로 대체.
  var startEV = (typeof sf==='number') ? ('EV'+sf) : 'EV1';
  var sfName = typeof sf==='number' ? lvName(sf) : lvName(1);

  /* 멘트 규칙 : 한 줄에 들어가게 짧게, 모두 '~세요'로 끝을 맞춘다.
     예전에는 '~으로 이동'(명사끝)과 '~하세요'가 섞여 있고 문장이 길어 두 줄로 넘어갔다. */
  if(!sameFloor){
    var goUp = lvIndex(lv) > lvIndex(sf);
    out.push({a: goUp?'↑':'↓', type:'lift',
              /* 절차를 정한 문의 문구는 사용자가 정한 그대로 — '엘리베이터를 타고 ○○으로 …' */
              tko: flow ? ('엘리베이터를 타고 '+lvName(lv)+'으로 '+(goUp?'올라가세요':'내려가세요'))
                        : ('엘리베이터로 '+lvName(lv)+'까지 '+(goUp?'올라가세요':'내려가세요')),
              ten: 'Take the elevator '+(goUp?'up to ':'down to ')+lvName(lv),
              ph:'['+sfName+' 엘리베이터 사진 ]', code:startEV});
  }
  if(target.kind==='zone'){
    /* ★ 절차를 정한 문(동문·서문) → 크리에이티브 존 : 사용자가 정한 ④⑤⑥ 단계
         ④ 지하에서 엘리베이터 안에서 밖을 본 사진 — 내려서 왼쪽으로 가세요
         ⑤ 엘리베이터 앞에서 존 문을 본 사진     — 정면에 크리에이티브 존이 있습니다
         ⑥ 존 문 정면                            — 크리에이티브 존에 도착했습니다 */
    if(flow && !sameFloor && ROOM_PHOTOS['EVB1'] && ROOM_PHOTOS['B1WAY']){
      out.push({a:'←', type:'turn',
                tko:'내려서 왼쪽으로 가세요', ten:'Get off and turn left',
                ph:'[ 지하 1층 엘리베이터 사진 ]', code:'EVB1'});
      out.push({a:'↑', type:'straight',
                tko:'정면에 크리에이티브 존이 있습니다', ten:'The Creative Zone is straight ahead',
                ph:'[ 크리에이티브 존 입구 사진 ]', code:'B1WAY'});
      out.push({a:'✓', type:'arrive',
                tko:'크리에이티브 존에 도착했습니다', ten:'You have arrived at the Creative Zone',
                ph:'[ 크리에이티브 존 사진 ]', code:'B1'});
      return out;
    }
    if(sameFloor) out.push({a:'↑', type:'straight', tko:'정면 넓은 곳으로 가세요', ten:'Head to the open area ahead', ph:'[ 지하 1층 사진 ]', code:'B1'});
    else          out.push({a:'↑', type:'straight', tko:'내려서 정면으로 가세요', ten:'Get off and head to the open area ahead', ph:'[ 지하 1층 사진 ]', code:'B1'});
    out.push({a:'✓', type:'arrive', tko:'크리에이티브 존에 도착했습니다', ten:'You have arrived at the Creative Zone', ph:'[ 크리에이티브 존 사진 ]', code:'B1'});
    return out;
  }

  var p=targetPos();

  /* ★ 2026-09-27 : 복도 끝 문(동문·서문) → 1층 호실 — 사용자가 정한 안내.
     기준은 '그 문으로 들어와 반대쪽 문을 향해 걸어가는 자세'다.
       · 동문은 +Z 쪽으로 걷는다 → 엘리베이터와 같은 쪽(x>0)이 왼손 쪽
       · 서문은 -Z 쪽으로 걷는다 → 그 반대(x<0)가 왼손 쪽
       · 엘리베이터 앞에 있는 방   → ① 문 ② 도착                    (두 단계)
       · 엘리베이터를 지나야 하는 방 → ① 문 ② 지나 직진 ③ 도착        (세 단계)
       · '몇 번째'는 그 구간의 시작(문 / 엘리베이터)부터 그 쪽 방만 센다.
     ※ 이 두 문 + 1층 호실만 여기서 처리하고 곧바로 끝낸다. 정문·후문·다른 층·
       화장실·비상계단은 아래의 기존 안내를 그대로 쓴다(아직 절차를 정하지 않았다).
       dir  : 걸어가는 방향(+1 = +Z, -1 = -Z)
       pass : '엘리베이터를 지나 …' 단계에 쓸, 그 방향으로 뻗은 복도 사진 */
  /* ★ 2026-09-27 : 옆면 문(정문·후문) → 1층 호실 — 사용자가 정한 안내.
     이 두 문은 건물 옆면이라 들어서면 복도를 가로질러 마주 본다. 거기서 좌·우로 한 번 돈다.
       ① 문 외관     ○문으로 들어오세요
       ② 라운지      (엘리베이터 / 1층 라운지)에서 좌회전·우회전 하세요
       ③ 그 쪽 복도   복도를 따라 직진하세요
       ④ 도착        왼쪽/오른쪽에서 몇 번째 방에 …
     두 문은 서로 마주 보고 있어 좌우가 정반대다 — leftDir 이 '좌회전하면 가는 쪽'이다.
       정문(-X 를 등지고 +X 를 봄) : 왼손이 -Z(동문 쪽)
       후문(+X 를 등지고 -X 를 봄) : 왼손이 +Z(서문 쪽)
     '몇 번째'는 어느 쪽이든 복도 한가운데(엘리베이터·라운지)에서부터 센다. */
  var SIDE_FLOW = {
    MAIN: {lobby:'GATE_MAIN_WAY', from:'엘리베이터에서 ', fromEn:'At the elevator, turn ', leftDir:-1},
    BACK: {lobby:'LNG1',          from:'1층 라운지에서 ', fromEn:'In the lobby, turn ',    leftDir: 1}
  };
  var sfl = (gk && sf === 1 && lv === 1 && target.kind === 'room') ? SIDE_FLOW[gk] : null;
  if(sfl && ROOM_PHOTOS[sfl.lobby]){
    var evZm  = evXZ(1).z;
    var dirM  = (p.z >= evZm) ? 1 : -1;                 // 돌고 나서 걸어갈 방향
    var turnL = (dirM === sfl.leftDir);                 // 좌회전인가
    var isLeftM = function(x){ return (dirM > 0) ? (x > 0) : (x < 0); };   // 걸을 때 왼손 쪽
    var leftM = isLeftM(p.x);
    var baseM = String(target.code).replace(/-[A-Za-z]$/, '');
    var matesM = [];
    Object.keys(FLOOR_LAYOUT[1].lookup).forEach(function(k){
      var q = place3D(k);
      if(q && (isLeftM(q.x) === leftM) && (((q.z >= evZm) ? 1 : -1) === dirM)) matesM.push({code:k, z:q.z});
    });
    matesM.sort(function(a, b){ return (a.z - b.z) * dirM; });   // 복도 한가운데에서 가까운 순
    var nthM = 0;
    for(var mj = 0; mj < matesM.length; mj++) if(matesM[mj].code === baseM) nthM = mj + 1;
    out.push({a: turnL ? '←' : '→', type:'turn',
              tko: sfl.from + (turnL ? '좌회전' : '우회전') + ' 하세요',
              ten: sfl.fromEn + (turnL ? 'left' : 'right'),
              ph:'[ 1층 라운지 사진 ]', code:sfl.lobby});
    out.push({a:'↑', type:'straight',
              tko:'복도를 따라 직진하세요', ten:'Go straight along the hallway',
              ph:'[ 1층 복도 사진 ]', code:(dirM > 0 ? 'HALL1L' : 'HALL1R'),
              cap:{ko:'1층 복도', en:'Floor 1 hallway'}});
    var sideKoM = leftM ? '왼쪽' : '오른쪽', sideEnM = leftM ? 'left' : 'right';
    var ttlKoM = roomTitle(target.code, 'ko'), ttlEnM = roomTitle(target.code, 'en');
    out.push({a:'✓', type:'arrive',
              tko: (nthM ? (sideKoM+'에서 '+ordWord(nthM)+' 방에 ') : (sideKoM+'에 ')) +
                   ttlKoM + subjParticle(ttlKoM) + ' 있습니다',
              ten: ttlEnM + (nthM ? (' is the '+ordWordEn(nthM)+' room on the '+sideEnM+'.')
                                  : (' is on the '+sideEnM+'.')),
              ph:'[ '+target.code+'호 문 앞 사진 ]', code:target.code});
    return out;
  }

  var END_FLOW = {EAST:{dir: 1, pass:'EV1WEST'}, WEST:{dir:-1, pass:'EV1EAST'}};
  var ef = (gk && sf === 1 && lv === 1 && target.kind === 'room') ? END_FLOW[gk] : null;
  if(ef && ROOM_PHOTOS[ef.pass]){
    var evZ1  = evXZ(1).z;
    var isPast = function(z){ return (ef.dir > 0) ? (z > evZ1) : (z < evZ1); };
    var isLeft = function(x){ return (ef.dir > 0) ? (x > 0)    : (x < 0);    };
    var past  = isPast(p.z);               // 엘리베이터를 지나야 하는 방인가
    var leftS = isLeft(p.x);               // 걷는 방향 기준 왼손 쪽인가
    var base  = String(target.code).replace(/-[A-Za-z]$/, '');   // 13121-A → 13121
    var mates = [];
    Object.keys(FLOOR_LAYOUT[1].lookup).forEach(function(k){
      var q = place3D(k);
      if(q && (isLeft(q.x) === leftS) && (isPast(q.z) === past)) mates.push({code:k, z:q.z});
    });
    mates.sort(function(a, b){ return (a.z - b.z) * ef.dir; });  // 들어온 문에서 가까운 순
    var nth = 0;
    for(var mi = 0; mi < mates.length; mi++) if(mates[mi].code === base) nth = mi + 1;
    if(past)
      out.push({a:'↑', type:'straight',
                tko:'엘리베이터를 지나 앞으로 직진하세요',
                ten:'Pass the elevator and keep going straight',
                ph:'[ 1층 복도 사진 ]', code:ef.pass});
    var sideKo1 = leftS ? '왼쪽' : '오른쪽', sideEn1 = leftS ? 'left' : 'right';
    var ttlKo1 = roomTitle(target.code, 'ko'), ttlEn1 = roomTitle(target.code, 'en');
    out.push({a:'✓', type:'arrive',
              tko: (nth ? (sideKo1+'에서 '+ordWord(nth)+' 방에 ') : (sideKo1+'에 ')) +
                   ttlKo1 + subjParticle(ttlKo1) + ' 있습니다',
              ten: ttlEn1 + (nth ? (' is the '+ordWordEn(nth)+' room on the '+sideEn1+'.')
                                 : (' is on the '+sideEn1+'.')),
              ph:'[ '+target.code+'호 문 앞 사진 ]', code:target.code});
    return out;
  }

  /* ★ 2026-09-27 : 문으로 들어와 엘리베이터로 올라간 층의 호실 — 사용자가 정한 안내.
     ①②③(문 외관 · 복도 · 엘리베이터 타기)은 위에서 이미 넣었고 여기서 ④⑤⑥ 을 잇는다.
       ④ 엘리베이터 안에서 밖을 본 사진   엘리베이터에서 내려서 좌회전/우회전 하세요
       ⑤ 그 쪽 복도                      복도를 따라 직진하세요
       ⑥ 도착                            왼쪽/오른쪽에서 몇 번째 방에 …
     엘리베이터에서 내리면 -X(복도)를 보고 선다 → 왼손이 +Z(서문 쪽), 오른손이 -Z(동문 쪽).
     '몇 번째'는 엘리베이터에서부터 그 쪽 방만 센다.
     엘리베이터에서 내린 뒤는 어느 문으로 들어왔든 똑같으므로, 위쪽 UP_FLOW 표에 문을 한 줄
     더 적으면 그대로 따라온다 — 지금은 네 문의 2층과 동문·서문·정문의 3층까지 정했다. */
  if(onUpFlow && ROOM_PHOTOS['EVIN'+lv] && ROOM_PHOTOS['HALL'+lv+'L'] && ROOM_PHOTOS['HALL'+lv+'R']){
    var evZu   = evXZ(lv).z;
    var dirU   = (p.z >= evZu) ? 1 : -1;                // +1 = 서문 쪽(좌회전) · -1 = 동문 쪽(우회전)
    var isLeftU = function(x){ return (dirU > 0) ? (x > 0) : (x < 0); };
    var leftU  = isLeftU(p.x);
    var baseU  = String(target.code).replace(/-[A-Za-z]$/, '');
    var matesU = [];
    Object.keys(FLOOR_LAYOUT[lv].lookup).forEach(function(k){
      var q = place3D(k);
      if(q && (isLeftU(q.x) === leftU) && (((q.z >= evZu) ? 1 : -1) === dirU)) matesU.push({code:k, z:q.z});
    });
    matesU.sort(function(a, b){ return (a.z - b.z) * dirU; });   // 엘리베이터에서 가까운 순
    var nthU = 0;
    for(var mu = 0; mu < matesU.length; mu++) if(matesU[mu].code === baseU) nthU = mu + 1;
    out.push({a: dirU > 0 ? '←' : '→', type:'turn',
              tko:'엘리베이터에서 내려서 ' + (dirU > 0 ? '좌회전' : '우회전') + ' 하세요',
              ten:'Get off the elevator and turn ' + (dirU > 0 ? 'left' : 'right'),
              ph:'['+lvName(lv)+' 엘리베이터 안 사진 ]', code:'EVIN'+lv});
    out.push({a:'↑', type:'straight',
              tko:'복도를 따라 직진하세요', ten:'Go straight along the hallway',
              ph:'['+lvName(lv)+' 복도 사진 ]', code:'HALL'+lv+(dirU > 0 ? 'L' : 'R')});
    var sideKoU = leftU ? '왼쪽' : '오른쪽', sideEnU = leftU ? 'left' : 'right';
    var ttlKoU = roomTitle(target.code, 'ko'), ttlEnU = roomTitle(target.code, 'en');
    out.push({a:'✓', type:'arrive',
              tko: (nthU ? (sideKoU+'에서 '+ordWord(nthU)+' 방에 ') : (sideKoU+'에 ')) +
                   ttlKoU + subjParticle(ttlKoU) + ' 있습니다',
              ten: ttlEnU + (nthU ? (' is the '+ordWordEn(nthU)+' room on the '+sideEnU+'.')
                                  : (' is on the '+sideEnU+'.')),
              ph:'[ '+target.code+'호 문 앞 사진 ]', code:target.code});
    return out;
  }

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
  /* 보는 방향 — 2·3·4·5층은 엘리베이터에서 '내려서' 복도로 나오므로 −X 를 보고 선다.
     1층은 다르다. 1층은 엘리베이터를 타고 내리는 층이 아니라 밖에서 걸어 들어오는 층이라,
     이미 1층에 있는 사람은 엘리베이터 쪽으로 걸어가 **엘리베이터를 마주 보고** 선다(+X).
     보는 방향이 정반대이므로 좌우도 정반대다 — 예전에는 1층도 '내렸을 때' 기준으로 말해
     왼쪽·오른쪽이 뒤집혀 있었다 (2026-09-24 사용자 제보).
     ※ 문(QR)으로 들어온 경우는 아래에서 문 기준으로 따로 다시 계산한다. */
  var facingEV = (lv === 1 && sameFloor);             // 1층에서 엘리베이터를 마주 보고 선 자세
  var faceX = ((evp.x >= 0) ? -1 : 1) * (facingEV ? -1 : 1);
  var dz    = (p.z >= evp.z) ? 1 : -1;                // 복도에서 걸어갈 방향
  var turnLeft = ((dz === -faceX) !== GUIDE_FLIP);            // 그 자세에서 도는 방향

  /* 복도 사진은 '어느 쪽으로 도는가'가 아니라 '목적지가 어느 복도에 있는가'로 골라야 한다.
     +Z(층 자료의 Top) = 왼쪽 복도(HALL..L) — README 「좌표 기준」.
     문으로 들어오면 몸이 향한 방향이 엘리베이터에서와 달라 아래에서 turnLeft 를 다시 계산하는데,
     예전에는 그 turnLeft 로 복도 사진까지 골랐다. 그래서 1층에서 사진이 어긋났다 —
     정문은 늘 반대, 동문·서문은 목적지와 상관없이 늘 오른쪽 복도 (2026-09-24 사용자 제보). */
  var hallCode = 'HALL' + lv + ((p.z >= evp.z) ? 'L' : 'R');

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
  /* 복도 이름('1층 왼쪽 복도')은 엘리베이터에서 **내렸을 때**를 기준으로 붙은 이름이다.
     1층처럼 다른 자세(엘리베이터를 마주 봄 · 문으로 들어옴)를 기준으로 말하면
     "오른쪽으로 도세요" 밑에 "왼쪽 복도"가 적혀 한 화면에서 엇갈려 보인다.
     그래서 그때는 사진 설명에서 좌우를 빼고 '○층 복도'로만 적는다. */
  var hallCap = (facingEV || fromGateHere) ? {ko: lv+'층 복도', en:'Floor '+lv+' hallway'} : null;
  var roomLeft = ((((p.x > 0) ? 1 : -1) === dz) !== GUIDE_FLIP);  // 걷는 동안 방이 있는 쪽
  var turnWord = turnLeft ? '왼쪽' : '오른쪽';
  var turnWordEn = turnLeft ? 'left' : 'right';
  var arw      = turnLeft ? '←' : '→';
  var side     = roomLeft ? '왼쪽' : '오른쪽';
  var sideEn   = roomLeft ? 'left' : 'right';
  /* 어느 자세에서 도는지 말로도 분명히 한다 — 1층은 '엘리베이터를 마주 보고'가 기준이다 */
  var lead = fromGateHere ? '복도로 나와 '
           : (facingEV ? '엘리베이터를 마주 보고 '
           : (sameFloor ? '엘리베이터 앞에서 ' : '내려서 '));
  var leadEn = fromGateHere ? 'Step into the hallway and turn '
             : (facingEV ? 'Facing the elevator, turn '
             : (sameFloor ? 'At the elevator, turn ' : 'Get off and turn '));
  /* v151: 돌기 단계 사진.
     예전엔 문에서 출발하면 1단계와 똑같은 문 사진을 그대로 다시 썼다 —
     "복도로 나와 왼쪽으로 도세요"인데 화면은 아직 문 앞이라 어긋났다.
     이 단계에서 실제로 보게 되는 건 '돌아선 쪽 복도'이므로 그 사진을 쓴다.
     (엘리베이터에서 출발할 때는 예전대로 엘리베이터 앞 사진) */
  var turnPhCode = fromGateHere ? hallCode : ('EV'+lv);
  var turnPhTxt  = fromGateHere ? ('['+lvName(lv)+' 복도 사진 ]')
                                : ('['+lvName(lv)+' 엘리베이터 앞 사진 ]');

  if(target.kind==='toilet'){
    out.push({a:arw, type:'turn',
              tko:(facingEV ? '엘리베이터를 마주 보고 ' : '복도 건너 ')+turnWord+'으로 가세요',
              ten:(facingEV ? 'Facing the elevator, go ' : 'Cross the hallway to the ')+turnWordEn,
              ph:turnPhTxt, code:turnPhCode, cap:(turnPhCode===hallCode ? hallCap : null)});
    out.push({a:'✓', type:'arrive', tko:'화장실에 도착했습니다', ten:'You have arrived at the restroom', ph:'[ 화장실 앞 사진 ]', code:'WC'+lv});
    return out;
  }

  if(target.kind==='emstair'){
    // 비상계단은 복도 맨 끝(강의실보다 더 바깥쪽)에 있으므로, 화장실처럼 바로 옆이 아니라
    // 강의실 안내처럼 "돌기 → 복도를 따라 쭉 → 도착" 3단계로 안내한다.
    if(!noTurn)   // v150: 동문·서문으로 들어오면 이미 복도 정면이라 돌 필요가 없다
      out.push({a:arw, type:'turn', tko:lead+turnWord+'으로 도세요', ten:leadEn+turnWordEn, ph:turnPhTxt, code:turnPhCode, cap:(turnPhCode===hallCode ? hallCap : null)});
    out.push({a:'↑', type:'straight', tko:'복도 끝까지 쭉 가세요', ten:'Go straight to the end of the hallway', ph:'['+lvName(lv)+' 복도 사진 ]',
              code:hallCode, cap:hallCap});
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
    out.push({a:arw, type:'turn', tko:lead+turnWord+'으로 도세요', ten:leadEn+turnWordEn, ph:turnPhTxt, code:turnPhCode, cap:(turnPhCode===hallCode ? hallCap : null)});
  /* 문 바로 앞 방(들어와서 첫 번째)이면 '쭉 가세요'가 오히려 헷갈린다 → 생략 */
  var justInside = !!(fromGateHere && ord && ord.n === 1);
  if(!justInside)
    out.push({a:'↑', type:'straight', tko:'복도를 따라 쭉 가세요', ten:'Go straight down the hallway', ph:'['+lvName(lv)+' 복도 사진 ]',
              code:hallCode, cap:hallCap});
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
  phFill(document.getElementById('ph'), s.code, s.ph, s.cap);
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
