"use strict";
/* roadview-free.js — 1인칭 로드뷰 — 자유 탐색(눌러서 이동 · 엘리베이터/계단 고르기 · 둘러보기)
   (예전 한 파일 main.js 의 11938~13481줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
/* ══════════ 자유 탐색(로드뷰처럼 눌러서 이동) ══════════════════
   자동재생(대본)과 나란히 존재하는 두 번째 모드. 바닥에 깔린 이동 지점을
   누르면 그 자리로 걸어가고, 화면을 끌면 고개만 돌아간다. 엘리베이터와
   계단은 직접 눌러 층을 옮긴다.
   카메라·문·캡 갱신은 자동재생과 똑같은 함수(fpCommit)를 쓰고,
   엘리베이터 탑승·계단 이동처럼 '연출이 필요한 구간'만 자동재생과 같은
   대본 형식(fpRunSeq)으로 잠깐 돌린다. */
var fpFree=false;            // 자유 탐색 중인가
var fpB1WasInExit=false;     // 버그 수정: 지하 나가는 계단(exit1/exit2) 진입 순간만 감지해 시선을 한 번 수평으로 되돌리기 위한 상태
var fpSeq=false, fpSeqDone=null;   // 자유 탐색 안에서 잠깐 도는 연출 대본
var fpFloorNow=1;            // 지금 서 있는 층
var fpNodes=[], fpNodeG=null;
var fpPath=null;             // 걸어가는 중 {wp,i,t,dur,x0,z0,node}
var fpFaceYaw=null;          // 멈춰 서서 바라볼 방향
var fpBusy=false;            // 엘리베이터·계단 연출 중(입력 잠금)

/* ── 이동 지점 만들기 : 복도 직선 + 각 문 앞 + 엘리베이터/계단 앞 + 1층 현관 ── */
function fpBuildNodes(lv){
  if(lv==='R'){
    /* 예전엔 옥상 전체(바깥 데크 포함)에 골고루 이동 지점을 흩어 둬서, 문
       바깥까지 걸어 나갈 수 있었다 — 이제 옥탑방 안(fpBuildRooms의 'R' 방
       경계와 같은 범위)에서만 움직이도록 계단 앞 지점 두 개만 둔다. */
    var rn=[], stSpot=fpRoofStSpot(), esSpot=fpRoofEsSpot();
    rn.push({x:stSpot.x, z:stSpot.z, kind:'st'});
    if(esSpot) rn.push({x:esSpot.x, z:esSpot.z, kind:'es'});
    /* "문을 누르면 밖으로 나갈 수 있게" — 철문 안쪽/바깥쪽에
       이동 지점을 하나씩 둔다. 두 지점 모두 문 중심선(z=문 z) 위에 있어서
       서로 오갈 때 반드시 문을 통과한다(철문은 1.6m 앞에서 자동으로 열린다).
       viaAlways : 문 반대편에서 출발할 때만 문 앞을 먼저 들르게 하는 경유점. */
    if(FP_ROOF_LANDING){
      var _dx=FP_ROOF_DOOR_X, _dz=FP_ROOF_LANDING.z;
      rn.push({x:_dx-1.35, z:_dz, kind:'roofout', gateX:_dx,
               viaAlways:[{x:_dx+1.15, z:_dz}]});
      rn.push({x:_dx+1.45, z:_dz, kind:'roofin', gateX:_dx,
               viaAlways:[{x:_dx-1.15, z:_dz}]});
    }
    /* 버그 수정: 비상계단 옥탑방에는 이런 문 안팎 이동 지점이
       하나도 없고 계단 앞 'es' 지점 하나뿐이었다 — 그래서 그 방에서는
       바깥 데크를 눌러도 "누른 자리와 서 있는 자리가 다른 방"이라 가장 가까운
       지점(=서 있는 그 자리)으로만 스냅돼, 사실상 한 발짝도 움직일 수 없었다.
       중앙계단 옥탑방과 똑같이 철문 안쪽/바깥쪽 지점을 하나씩 둔다.
       (좌표는 fpBuildRooms의 roofDoorE 계산과 같은 식을 쓴다) */
    (function(){
      var esR=EMSTAIR_POS[5]; if(!esR) return;
      var ST0=BUILDING_Z_STRETCH;
      var esz0=esR.z*ST0, esx0=(esR.xWhole>0?1:-1);
      var emD0=FP_ST_WD+0.25;
      var ehx0=esx0>0?(FP_WALL_X-0.25):(-FP_WALL_X-emD0);
      var ehx1=esx0>0?(FP_WALL_X+emD0):(-FP_WALL_X+0.25);
      var eDoorX=(esx0>0?ehx0-0.03:ehx1+0.03);
      var din=esx0;                       // 옥탑방 안쪽을 향하는 방향
      rn.push({x:eDoorX-din*1.35, z:esz0, kind:'roofout', gateX:eDoorX,
               viaAlways:[{x:eDoorX+din*1.15, z:esz0}]});
      rn.push({x:eDoorX+din*1.45, z:esz0, kind:'roofin', gateX:eDoorX,
               viaAlways:[{x:eDoorX-din*1.15, z:esz0}]});
    })();
    return rn;
  }
  var ST=BUILDING_Z_STRETCH, L=(lv==='B1')?null:FLOOR_LAYOUT[lv];
  var ev=evXZ(lv), evZ=ev.z*ST;
  var stZ=stZOf(lv)*ST;
  var n=[], z;
  var z0=GLOBAL_BOT_Z*ST+1.5, z1=GLOBAL_TOP_Z*ST-1.5;
  for(z=z0; z<=z1; z+=5.4) n.push({x:0, z:z, kind:'corr'});
  if(L){
    L.cells.forEach(function(c){
      if(!c.code) return;
      var sd=(c.x>0?1:-1);
      n.push({x:0, z:fpDoorZ(c.parent||c.code, c.z*ST), kind:'door', code:c.parent||c.code, side:sd});
    });
    /* 통로 안으로 한 걸음 들어가, 각 문을 비스듬히 마주 보는 자리.
       문 바로 옆에 붙으면 문이 화면을 가득 채워 무슨 문인지 안 보인다.
       버그 수정 — 통로 폭은 되돌리고 여기만 유지: 통로 자체를
       넓히는 시도는 바로 옆방(WC_ADJ_FLIP 방들)과 벽이 겹치는 새 문제를
       만들어 되돌렸다 — 대신 서 있는 자리의 치우침만 0.55m로 줄여서(옆
       통로 벽까지 0.6m→1.1m 여유), 통로 폭은 원래대로 두면서도 옆을
       바라볼 때 벽이 너무 바짝 채워 보이는 정도는 줄인다. */
    var tl=FACILITIES.toilet, ts=(tl.x>0?1:-1), tz0=fpToiletZ(lv);
    var tax=ts*(FP_WALL_X+FP_ALC_DX-1.15), tdx=ts*(FP_WALL_X+FP_ALC_DX);
    [['M',-1],['W',1]].forEach(function(a){
      var nx=tax, nz=tz0+a[1]*0.55;
      n.push({x:nx, z:nz, kind:'wc', side:ts, wcSex:a[0],
              faceYaw:Math.atan2(tdx-nx, (tz0+a[1]*FP_ALC_HW)-nz)});
    });
    var es=EMSTAIR_POS[lv];
    if(es){ var ss=(es.xWhole>0?1:-1); n.push({x:0, z:es.z*ST, kind:'es', side:ss}); }
  }
  n.push({x:0.55, z:evZ, kind:'ev'});
  n.push({x:0.65, z:stZ, kind:'st'});
  if(L && lv!==1){
    var tlz2=FACILITIES.toilet.z*ST;
    var oa2=-CORE_HALF*ST+0.35, ob2=tlz2-FP_ALC_HW-2.45;
    if(ob2-oa2 > 4){
      var oc=(oa2+ob2)/2;
      var ogate=[{x:0, z:oc, ifOutside:true}];
      n.push({x:-2.2, z:oc, kind:'open', via:ogate});
      n.push({x:-FP_OPEN_D+0.9, z:oc-(ob2-oa2)*0.26, kind:'open', via:ogate});
      n.push({x:-FP_OPEN_D+0.9, z:oc+(ob2-oa2)*0.26, kind:'open', via:ogate});
    }
  }
  if(lv==='B1'){
    /* 지하 : 복도는 막다른 끝 ~ 존 출입문까지, 그 너머가 크리에이티브 존 */
    n=n.filter(function(d){ return d.kind!=='corr'
                 || (d.z>FP_B1_ZEND+1.2 && d.z<FP_B1_ZTOP-1.4); });
    var Z0=FP_B1_ZTOP, gate=[{x:0, z:Z0+1.6, ifOutside:true}];
    n.push({x:0, z:Z0-4.2, kind:'zonedoor'});
    /* 존 입구 옆 벽감(문 앞)으로도 걸어 들어갈 수 있게 이동 지점을 둔다 */
    n.push({x:-FP_WALL_X-FP_B1_ALC_D*0.55, z:Z0-FP_B1_ALC_W*0.55, kind:'corr'});
    /* 중앙계단 옆 빈 공간 — 계단 옆을 지나 안쪽 검은 문 앞까지 */
    (function(){
      var nk=fpB1StairNook(stZ, null);
      if(!nk) return;
      var nz=(nk.z0+nk.z1)/2;
      n.push({x:FP_WALL_X+1.1, z:nz, kind:'corr'});          // 계단참 옆 초입
      n.push({x:nk.x1-1.0,     z:stZ-1.70, kind:'corr'});    // 안쪽 검은 문 앞
    })();
    // 가운데 통로(비워 둔 공간)
    n.push({x:-1.4, z:Z0+4.0,  kind:'zone', via:gate});
    n.push({x:-1.4, z:Z0+9.0,  kind:'zone', via:gate});
    n.push({x:-1.4, z:Z0+13.4, kind:'zone', via:gate});
    // 왼쪽(+X) 열람 공간 / 오른쪽(-X) 원목 부스 라운지
    // 방 폭을 좁히면서(zx1=7.0) 좌표를 새 벽 안쪽으로 당겼다.
    n.push({x:5.5,  z:Z0+6.7,  kind:'zone', via:gate});
    n.push({x:5.5,  z:Z0+16.0, kind:'zone', via:gate});
    /* 창가 라운지(소파·짙은 카펫) 쪽 이동 지점 — 소파 앞 통로와
       카펫 안쪽 두 자리. 가구와 겹치지 않는 좌표로 잡았다. */
    n.push({x:11.8, z:Z0+8.4,  kind:'zone', via:gate});
    n.push({x:11.8, z:Z0+14.5, kind:'zone', via:gate});
    n.push({x:11.8, z:Z0+20.5, kind:'zone', via:gate});
    n.push({x:-9.3, z:Z0+7.2,  kind:'zone', via:gate});
    n.push({x:-9.3, z:Z0+16.0, kind:'zone', via:gate});
    /* 회의실 1·2는 지웠고(북쪽에 새로 만들 예정) 접근 노드도 같이 뺐다 —
       안 그러면 검색에서 더는 존재하지 않는 방으로 안내하게 된다. */
    /* 나가는 문 : 이중문(안쪽 문 → 방풍실 → 바깥 문) → 계단 1구간 → 오른쪽 90도
       → 계단 2구간 → 맨 위 문 앞.
       ※ 걸어서 올라가는 건 1구간 계단까지만이다. 두 번에 나눠 선다 :
         ① 이중문을 둘 다 지난 뒤, 첫 계단 앞
         ② 1구간을 오른 계단참 — 여기가 끝. 2구간 계단과 그 위 문은 구조로만 보인다. */
    (function(){
      var P=fpB1ExitPts();
      var footPt={x:P.xA0, z:P.zA0-1.8};           // 카메라를 zDoorOut-0.9m 지점(문 바로 안쪽)에 오도록 조정
      var landPt={x:P.xA0, z:P.zA1+0.5};            // ② 계단참(여기까지만 올라간다) — 뒤쪽 벽돌벽에서 더 떨어지도록 계단참 안쪽 초입에 세운다(기존: 계단참 정중앙)
      /* 버그 수정: 이중문을 지나 첫 계단 앞에서 뒤로가기를 누르면,
         근처에 스냅할 만한 '존' 쪽 노드가 하나도 없어서(제일 가까운 존 노드가
         20m 넘게 떨어져 있었다) 잘게 걷는 자리 이동으로 넘어갔는데, 그 이동은
         지금 서 있는 방(계단실) 경계 안쪽으로만 움직이게 되어 있어 문 앞
         0.55m에서 더는 못 나가고 갇혔었다 — 문 바로 안쪽(존 영역)에 실제로
         스냅 가능한 지점을 하나 둬서 뒤로가기가 정상적으로 존 쪽으로 넘어가게 한다. */
      n.push({x:footPt.x, z:(Z0+30.0)-0.5, kind:'zoneexit'});
      n.push({x:footPt.x, z:footPt.z, kind:'zonefoot', via:gate});
      n.push({x:landPt.x, z:landPt.z, kind:'zoneland', via:gate.concat([footPt])});
      /* 버그 수정: via에 footPt/landPt까지 그대로 넣어뒀더니, 이미
         계단참 근처에 서 있는데도 "문 앞(footPt)까지 되돌아갔다가 다시 계단참을
         거쳐" 오는 식으로 경로가 잡혀서 순간 뒤로 확 밀렸다가 오는 것처럼
         보였다 — zonecorr는 (자유이동 스냅 조건상) 항상 계단참 바로 근처에서만
         요청되므로, 거기서부터 곧장 잇는 지점들만 남긴다. */
      var cornerPt={x:P.xA0, z:P.zMid};
      var stairBotPt={x:P.xB0, z:P.zMid};
      var stairTopPt={x:P.xB1, z:P.zMid};
      var corrPt={x:P.xB2-P.dir*0.9, z:P.zMid};
      n.push({x:corrPt.x, z:corrPt.z, kind:'zonecorr',
              via:[cornerPt, stairBotPt, stairTopPt]});
    })();
  }
  if(lv===1){
    n.push({x:-3.2, z:0, kind:'hall'});
    n.push({x:-7.0, z:0, kind:'hall'});
    n.push({x:FP_GATE_X+1.15, z:0, kind:'gate'});
    /* 중앙계단 로비(후문 참) 진입 노드 — 문턱의 'st' 지점에서 이 노드로
       한 걸음 들어가면, 그다음부터는 fpRoomAt이 인식하는 'lobby1' 방
       안이라 바닥 탭·전진 버튼으로 자유롭게 돌아다닐 수 있다. */
    n.push({x:FP_WALL_X+0.6, z:stZ, kind:'hall'});
  }
  return n;
}
/* 크리에이티브 존·회의실·열린 공간처럼 '넓게 트인 방' 범위.
   이 안에서는 이동 지점을 거치지 않고 누른 자리로 곧장 걸어간다
   (복도용 경로 규칙을 그대로 쓰면 문 앞까지 되돌아갔다 오느라 빙글빙글 돌았다). */
var fpRooms=[];
function fpBuildRooms(lv){
  if(lv==='R'){
    /* 예전엔 옥상 전체(바깥 데크 포함)를 하나의 방으로 열어 둬서, 바닥 아무 데나
       눌러도 (닫혀 있는) 철문을 그냥 지나쳐 바깥으로 걸어 나가 버렸다 —
       fpMakeRoof가 옥탑방을 짓는 것과 똑같은 경계로 좁혀, 문 밖(바깥 데크)은
       걸어갈 수 있는 방으로 아예 등록하지 않는다.
       (fpMakeRoof가 계단 실측 비율로 방을 좁힌 뒤에도 이 함수가
       옛 1.4배 폭 공식을 그대로 쓰고 있어서, 실제 벽보다 넓은 영역이 "걸을 수
       있는 방"으로 등록돼 그 틈으로 밖으로 빠져나가는 버그가 있었다 — 아래
       공식을 fpMakeRoof와 완전히 동일하게 맞춘다.) */
    var ST0=BUILDING_Z_STRETCH;
    var rStZ=(FLOOR_LAYOUT[5]?FLOOR_LAYOUT[5].stZ:0)*ST0;
    var ROOF_OW_MUL0=1.0, ROW0=FP_ST_OW*ROOF_OW_MUL0, RM_DX0=0.45, RM_DZ0=0.35;   // v115: fpMakeRoof와 동일
    var rRealDnZ0=rStZ-(ROW0/4+0.02)-(ROW0/2-0.10)/2-0.10;
    var rRealDnZ1=rStZ-(ROW0/4+0.02)+(ROW0/2-0.10)/2+0.10;
    var rDownFlightW=rRealDnZ1-rRealDnZ0;
    var rSkipGap=0.06;
    var rRoomWiden=0.6;
    var rZ0=rRealDnZ0+0.03;        // v114: fpMakeRoof의 mainCZ0와 동일 공식
    var rZ1=rRealDnZ1+2.92;   // v111: fpMakeRoof의 mainCZ1과 동일
    /* 버그 수정: x0 경계가 정확히 벽 안쪽 끝(문 앞)이라, 방 안에서
       걸을 때(fpGoPoint)의 0.55m 클램프 여유 때문에 실제로는 문 근처에도
       못 가고 그 앞에서 멈춰 버렸다 — 문을 지나 옥상 데크 쪽으로 자연스럽게
       이어져 걸어나갈 수 있도록, 문 밖(FP_ROOF_OUT)을 확실히 넘어서까지
       경계를 넓힌다(그 너머는 어차피 roofDeck과 겹치므로 안전하다). */
    /* 재적용: "벽을 누르면 벽 바깥으로 나가진다 — 문으로만
       나갔으면 좋겠다". 예전에 되돌렸던 '문으로만 드나들기'를, 이번에는
       경계에서 튕기지 않게 세 가지를 같이 맞춰서 다시 넣는다.
         ① 옥탑방 방(roofMain/roofEm)은 문쪽 벽 '안쪽'에서 끝난다.
         ② 바깥 데크(roofDeck)에는 옥탑방이 서 있는 자리만큼 실제로 구멍
            (holes)을 뚫는다 — 그래야 옥탑방 안에서 데크를 눌러도
            fpFreePick의 "누른 자리와 서 있는 자리가 같은 방일 때만 곧장
            간다" 규칙에 걸려 벽을 통과하지 않는다.
         ③ 대신 문짝 자리에 딱 맞는 좁은 통로 방(roofDoorN)을 하나 걸쳐
            둬서, ▲(앞으로) 걷기로 문을 지나 데크로, 데크에서 다시 안으로
            자연스럽게 이어져 걸을 수 있게 한다(철문은 fpRegisterAutoDoor로
            1.6m 앞에서 저절로 열린다). */
    var rMainX0=FP_WALL_X-2.30, rMainX1=FP_WALL_X+FP_ST_WD-0.80+0.35+RM_DX0;
    var rDoorX=rMainX0-0.03, rDoorW=1.92, rMz=(rZ0+rZ1)/2;
    /* v122: 데크 앞면(계단 폭 바깥, 개구부 위쪽)으로는 못 올라서게 구멍 — 데크는 계단으로만 오른다.
       (fpMakeRoofSkipFloor와 같은 공식: 데크 깊이 1.90, 계단 시작 z = 개구부 +Z 가장자리 - 0.08) */
    var rDkX1=rMainX1-0.02, rDkX0=rDkX1-1.90, rStZ0=rRealDnZ1-0.08;
    var rr=[{x0:rMainX0+0.10, x1:rMainX1, z0:rZ0, z1:rZ1, id:'roofMain',
             holes:[{x0:rDkX0, x1:rMainX1, z0:rZ0, z1:rStZ0-0.02}]}];
    rr.push({x0:rDoorX-1.70, x1:rDoorX+1.30, z0:rMz-rDoorW/2-0.04, z1:rMz+rDoorW/2+0.04,
             id:'roofDoor'});
    var rHoles=[{x0:rMainX0, x1:rMainX1, z0:rZ0, z1:rZ1}];
    var esR0=EMSTAIR_POS[5];
    if(esR0){
      var esz0=esR0.z*ST0, esx0=(esR0.xWhole>0?1:-1);
      var emD0=FP_ST_WD+0.25;
      var ehx0=esx0>0?(FP_WALL_X-0.25):(-FP_WALL_X-emD0);
      var ehx1=esx0>0?(FP_WALL_X+emD0):(-FP_WALL_X+0.25);
      var ex0=esx0>0?(FP_WALL_X-0.25):(-FP_WALL_X-3.3);
      var ex1=esx0>0?(FP_WALL_X+3.3):(-FP_WALL_X+0.25);
      rr.push({x0:(esx0>0?ex0+0.10:ex0), x1:(esx0>0?ex1:ex1-0.10),
               z0:esz0-1.85, z1:esz0+1.85, id:'roofEm'});
      var eDoorX=(esx0>0?ehx0-0.03:ehx1+0.03);
      rr.push({x0:eDoorX-(esx0>0?1.70:-1.30), x1:eDoorX+(esx0>0?1.30:1.70),
               z0:esz0-rDoorW/2-0.04, z1:esz0+rDoorW/2+0.04, id:'roofDoorE'});
      rHoles.push({x0:ehx0, x1:ehx1, z0:esz0-1.85, z1:esz0+1.85});
    }
    var RB=fpRoofBox();
    rr.push({x0:-RB.HX, x1:RB.HX, z0:RB.z0, z1:RB.z1, id:'roofDeck', holes:rHoles});
    return rr;
  }
  var r=[];
  if(lv==='B1'){
    var Z0=FP_B1_ZTOP, zz1=Z0+30.0;
    // 회의실 1·2 visual은 지웠고 북쪽에 새로 만들 예정이라, 걸을 수 있는
    // 영역 정의(meet1/meet2)도 일단 같이 뺐다 — 안 그러면 새 벽 바깥
    // 빈 공간을 걸어다닐 수 있는 방으로 착각하게 된다.
    /* 창가 쪽 라운지(올리브그린·차콜 소파, 주황 오토만, 짙은 카펫
       바닥)까지 걸어갈 수 있게 존의 걷기 영역을 x=9.0 → 13.9로 넓힌다.
       (창가 열람 카운터가 x≈14.2부터라, fpGoPoint의 0.55m 여백까지 감안하면
        카운터 바로 앞에서 자연스럽게 멈춘다.)
       단, 존 입구 쪽(z<11.2)의 x>9.6 구간은 중앙계단실 뒷벽(x=10.47) 너머라
       실제로는 벽 속이다 — hole로 빼서 그쪽으로는 못 걸어가게 한다. */
    r.push({x0:-12.0, x1:13.9, z0:Z0+0.3, z1:zz1, id:'zone',
            holes:[{x0:9.6, x1:14.0, z0:Z0+0.3, z1:11.2}]});
    /* 존 입구 옆 벽감(검은 문·소화기가 있는 오목한 자리)도 걸어
       들어갈 수 있게 방으로 등록한다. 복도 쪽으로 1.3m 겹쳐 두어야
       (fpGoPoint의 0.55m 여백 때문에) 이음매에서 막히지 않는다. */
    r.push({x0:-FP_WALL_X-FP_B1_ALC_D, x1:-FP_WALL_X+1.3,
            z0:Z0-FP_B1_ALC_W, z1:Z0-0.05, id:'b1alc'});
    /* 중앙계단 옆 빈 공간(끝에 검은 문) — 계단참(x=FP_WALL_X~)에서
       문 앞까지 걸어갈 수 있게 방으로 등록한다. 복도 쪽으로 넉넉히 겹친다. */
    (function(){
      var nk=fpB1StairNook(stZOf('B1')*BUILDING_Z_STRETCH, null);
      if(!nk) return;
      r.push({x0:FP_WALL_X-0.9, x1:nk.x1, z0:nk.z0, z1:nk.z1, id:'b1stnook'});
    })();
    // 방 폭을 26m→17m로 좁히면서 걸을 수 있는 영역 경계도 맞췄다.
    /* 이중문 → 계단 1구간 → 계단참 → 90도 꺾인 2구간 계단 →
       맨 위 참까지 걸을 수 있다. 2구간 쪽(exit2)은 exit1과 겹치지 않는
       X 범위라 별도 사각형으로 등록해야 한다 — 안 그러면 그 구간의 중간
       경유점(코너·계단 시작/끝)이 '방 밖'으로 인식돼, 길찾기가 엉뚱하게
       메인 복도 중앙(x=0)을 거쳐 크게 돌아가는 버그가 생긴다(요청하신
       "계단참에서 움직일 때 밖으로 나가 엄청 뒤로 가는" 오류의 원인). */
    (function(){
      var P=fpB1ExitPts(), sW=FP_B1_EXIT_SW, hw2=sW/2;
      /* 버그 수정: 예전에는 exit1·exit2 이음매의 틈을 없애려고 두
         사각형의 '네 변 모두'를 0.6m씩 넓혀 뒀다 — 그런데 그 여유가 그대로
         "벽 안쪽으로 걸어 들어갈 수 있는 폭"이 됐다. fpGoPoint가 방 경계에서
         0.55m를 빼 주므로, 결국 벽면을 0.05m 지나친 자리까지 걸어갈 수 있었고
         나가는 문 밖 벽돌 벽에 다가가면 몸이 벽에 파묻히고 그 너머가 보였다.
         → 각 구간의 경계를 실제 벽면에 정확히 맞추고, 겹침은 '벽이 없는
           이음매 쪽'으로만 준다(계단참은 두 구간이 공유하는 실제 바닥이라
           그쪽으로 겹쳐도 벽을 뚫지 않는다).
         실측 기준: 방풍실 폭 = exW+0.9(fpMakeB1과 동일), 1구간 계단·계단참
         옆 벽돌벽 = xA0 ± SW/2, 2구간 옆벽 = zA1 ~ zA2. */
      var vhw=(FP_B1_EXIT_DOOR_W+0.9)/2;
      r.push({x0:P.xA0-vhw, x1:P.xA0+vhw, z0:zz1, z1:P.zDoorOut+0.30, id:'exitvest'});
      r.push({x0:P.xA0-hw2, x1:P.xA0+hw2, z0:P.zDoorOut-0.20, z1:P.zA2, id:'exit1'});
      var e2x0=Math.min(P.xB0,P.xB2), e2x1=Math.max(P.xB0,P.xB2);
      if(P.dir<0) e2x1 += 2.20; else e2x0 -= 2.20;      // 계단참 쪽으로만 넉넉히 겹친다(이음매 끊김 방지)
      r.push({x0:e2x0, x1:e2x1, z0:P.zA1, z1:P.zA2, id:'exit2'});
    })();
  }else{
    var L=FLOOR_LAYOUT[lv];
    if(L && lv!==1){
      var ST=BUILDING_Z_STRETCH, tlz=FACILITIES.toilet.z*ST;
      var oa=-CORE_HALF*ST+0.35, ob=tlz-FP_ALC_HW-2.45;
      if(ob-oa>4) r.push({x0:-FP_WALL_X-FP_OPEN_D, x1:-FP_WALL_X, z0:oa, z1:ob, id:'open'});
    }
    if(lv===1){
      /* 1층 중앙계단 로비 : 지난 세션에 하행 계단을 지우고 걸을 수 있는 바닥으로
         채운 좌측(zDn) 공간 + 후문 참 전체를, 실제로 바닥을 눌러 걸어가거나
         ▲ 버튼으로 걸어들어갈 수 있는 '방'으로 등록한다. 상행 계단 매스
         (실제 디딤판이 있는 곳)는 holes로 빼서 그 속으로 걸어 들어가지 않게 한다.
         계산식은 fpMakeStairwell 내부와 동일(1층만 폭 1.4배 — owAuto). */
      var ST1=BUILDING_Z_STRETCH;
      var stZ1=stZOf(1)*ST1;
      var OW1=FP_ST_OW*1.4, hw1=OW1/2+0.03;
      var x01=FP_WALL_X, WD1=FP_ST_WD_B1F, LAND1=FP_ST_LAND;
      var N1=FP_ST_N, run1=FP_ST_RUN, fw1=OW1/2-0.10;
      var xs1=x01+LAND1, zUp1=stZ1+OW1/4+0.02;
      var lobby={x0:x01+0.35, x1:x01+WD1-0.35, z0:stZ1-hw1+0.35, z1:stZ1+hw1-0.35, id:'lobby1'};
      var upFlightHole={x0:xs1-0.15, x1:xs1+N1*run1+0.15, z0:zUp1-fw1/2, z1:zUp1+fw1/2};
      lobby.holes=[upFlightHole];
      r.push(lobby);
    }
  }
  return r;
}
function fpRoomAt(x,z){
  /* 버그 수정: exit1(1구간+계단참)·exit2(2구간)처럼 이음매를
     없애려고 일부러 겹쳐 둔 방들이 있는데, 예전엔 배열에서 먼저 나오는
     방을 무조건 선택해서 — 실제로는 다음 방(exit2) 안쪽으로 더 걸어
     들어갈 수 있는 자리인데도 먼저 걸린 방(exit1)의 좁은 여백에 막혀
     계단참에서 2구간 계단으로 못 넘어가고 딱 멈춰버렸다. 겹치는 자리에서는
     "가장자리에서 가장 멀리 떨어진(=가장 안쪽인)" 방을 골라야, 그 방의
     여백에 걸리지 않고 자연스럽게 이어서 걸어갈 수 있다. */
  var best=null, bestMargin=-1;
  for(var i=0;i<fpRooms.length;i++){
    var q=fpRooms[i];
    if(x<q.x0||x>q.x1||z<q.z0||z>q.z1) continue;
    var inHole=false;
    if(q.holes) q.holes.forEach(function(h){
      if(x>=h.x0&&x<=h.x1&&z>=h.z0&&z<=h.z1) inHole=true;
    });
    if(inHole) continue;
    var margin=Math.min(x-q.x0, q.x1-x, z-q.z0, q.z1-z);
    if(margin>bestMargin){ bestMargin=margin; best=q; }
  }
  return best;
}
/* 방 안에서 누른 자리로 곧장 걸어가기(벽에 붙지 않도록 조금 안쪽으로 당긴다) */
function fpGoPoint(q, px, pz){
  var m=0.55;
  px=Math.max(q.x0+m, Math.min(q.x1-m, px));
  pz=Math.max(q.z0+m, Math.min(q.z1-m, pz));
  /* hole(계단 매스 등 실제로 막혀 있는 자리) 안으로 목표점이 떨어지면,
     가장 가까운 바깥 가장자리로 밀어낸다 — 안 그러면 눈에 보이는 계단
     속으로 카메라가 그대로 걸어 들어가 버린다. */
  if(q.holes) q.holes.forEach(function(h){
    if(px<h.x0-m || px>h.x1+m || pz<h.z0-m || pz>h.z1+m) return;
    var dLeft=px-(h.x0-m), dRight=(h.x1+m)-px, dNear=pz-(h.z0-m), dFar=(h.z1+m)-pz;
    var minD=Math.min(dLeft,dRight,dNear,dFar);
    if(minD===dLeft) px=h.x0-m;
    else if(minD===dRight) px=h.x1+m;
    else if(minD===dNear) pz=h.z0-m;
    else pz=h.z1+m;
  });
  var pts=[{x:fpPos.x,z:fpPos.z}];
  pts.push({x:px,z:pz});
  var segL=[], total=0;
  for(var pi2=1; pi2<pts.length; pi2++){
    var sl=Math.sqrt(Math.pow(pts[pi2].x-pts[pi2-1].x,2)+Math.pow(pts[pi2].z-pts[pi2-1].z,2));
    segL.push(sl); total+=sl;
  }
  if(total<0.25) return;
  fpFaceYaw=null;
  fpYaw += fpLookYaw; fpLookYaw = 0;
  fpPath={pts:pts, segL:segL, total:total, t:0,
          dur: Math.max(0.4, total/FP_WALK)+0.3, sx:fpPos.x, sz:fpPos.z,
          node:{x:px, z:pz, kind:'spot'}};
  fpCap('');
}
/* 이동 지점 바닥 표시 — 지금은 눈에 보이지 않게 해 둔다(투명).
   실제 로드뷰처럼 바닥이 깔끔하게 보이면서도, 누르면 그대로 걸어간다. */
function fpClearNodeG(){
  if(!fpNodeG) return;
  scene.remove(fpNodeG);
  fpNodeG.traverse(function(o){ if(o.geometry) o.geometry.dispose(); if(o.material) o.material.dispose(); });
  fpNodeG=null;
}
function fpMakeNodeG(lv){
  var g=new THREE.Group(), y=fpSlabY(lv)+0.07;
  var tCode=(target && target.kind==='room') ? target.code : null;
  fpNodes.forEach(function(nd){
    var col=0x6FD8FF, op=0.34;
    if(nd.kind==='ev'){ col=0xE0A458; op=0.55; }
    else if(nd.kind==='st'){ col=0x7FE9B0; op=0.55; }
    else if(nd.kind==='es'){ col=0x39FF88; op=0.42; }
    else if(nd.kind==='gate'||nd.kind==='hall'){ col=0x8FE3E0; op=0.4; }
    if(nd.kind==='door' && tCode && nd.code===tCode){ col=0xFF2E88; op=0.85; }
    if(nd.kind==='wc' && target && target.kind==='toilet' && target.floor===lv){ col=0xFF2E88; op=0.85; }
    var m=new THREE.Mesh(new THREE.RingGeometry(0.34,0.54,24),
      new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0,
        side:THREE.DoubleSide, depthWrite:false, depthTest:false}));
    m.rotation.x=-Math.PI/2; m.position.set(nd.x, y, nd.z);
    m.renderOrder=6; m.userData.node=nd;
    g.add(m);
    var fillM=new THREE.Mesh(new THREE.CircleGeometry(0.60,24),
      new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0,
        side:THREE.DoubleSide, depthWrite:false, depthTest:false}));
    fillM.rotation.x=-Math.PI/2; fillM.position.set(nd.x, y-0.002, nd.z);
    fillM.renderOrder=5; fillM.userData.node=nd;
    g.add(fillM);
  });
  scene.add(g);
  return g;
}
/* 그 층으로 갈아타기 : 복도·이동 지점을 그 층 것으로 새로 짓는다 */
function fpSetFloor(lv){
  fpFloorNow=lv;
  if(lv!=='R') fpRoofEyeLift=0;   // 옥상을 벗어나면 옥상 전용 카메라 높이 보정을 원래대로 되돌린다
  if(fpCab) fpCab.visible=(lv!=='R');   // 옥상에서 내려오면 다시 보이게
  fpPos.y=fpSlabY(lv);
  /* 1층 로비 바닥에는 지하로 내려다보이는 개구부(landFl hole)가
     뚫려 있는데, 그동안은 이 함수가 딱 그 층 하나만 지어서 지하(B1) 계단
     자체가 씬에 존재하지 않았다 — 그래서 구멍은 뚫려 있어도 밑으로 아무것도
     안 보였다. 1층에 서 있을 때만 B1도 같이 지어서, 개구부 너머로 실제
     지하 계단(B1 쪽 straightUp 한 도막 계단)이 항상 보이게 한다. */
  fpBuildCorr(lv===1 ? [1,'B1'] : [lv]);
  fpNodes=fpBuildNodes(lv);
  fpRooms=fpBuildRooms(lv);
  fpClearNodeG(); fpNodeG=fpMakeNodeG(lv);
  /* v145: 직접 걸어보기 중 층이 바뀌면 바닥 빨간 유도선도 그 층 기준으로 다시 판단한다.
     (미리보기는 자체 대본에서 켜고 끄므로 자유 탐색일 때만 손댄다) */
  if(fpFree && typeof fpRouteFloor==='function'){
    var sameNow = !!(target && target.floor===lv);
    fpRouteFloor(!sameNow);
    if(typeof routeA!=='undefined' && routeA) routeA.visible=false;
  }
}
/* 연출 구간(엘리베이터 탑승 등)을 자동재생과 같은 대본 형식으로 잠깐 돌린다 */
function fpRunSeq(steps, done){
  /* 걷는 구간(to)의 시간을 거리에 맞춰 계산해 둔다.
     예전엔 dur을 안 주면 fpTick이 그 구간을 한 프레임에 끝내버려서,
     엘리베이터 탑승·계단 이동이 순간이동처럼 튀었다. */
  var px=fpPos.x, pz=fpPos.z, py=fpPos.y, first=-1, last=-1;
  for(var i=0;i<steps.length;i++){
    var st=steps[i];
    if(!st.to){
      if(st.y!==undefined && st.dur===undefined)
        st.dur=Math.max(0.6, Math.abs(st.y-py)/3.2);
      if(st.y!==undefined) py=st.y;
      continue;
    }
    var dx=st.to.x-px, dz=st.to.z-pz;
    var dy=(st.y!==undefined) ? (st.y-py) : 0;
    var d=Math.sqrt(dx*dx+dz*dz);
    /* 계단처럼 높이까지 변하는 구간은 수직 거리도 같이 세서
       한 칸씩 밟고 오르는 속도로 보이게 한다. */
    if(st.dur===undefined)
      st.dur=Math.max(0.45, (d + Math.abs(dy)*0.55)/FP_WALK);
    if(!st.ease) st.ease='lin';
    px=st.to.x; pz=st.to.z; if(st.y!==undefined) py=st.y;
    if(first<0) first=i;
    last=i;
  }
  if(first>=0) steps[first].ease=(first===last)?'io':'in';
  if(last>=0 && last!==first) steps[last].ease='out';
  fpSteps=steps; fpI=0; fpT=0; fpSeq=true; fpSeqDone=done;
  fpEnterStep();
}
/* ── 걸어가기 : 복도 한가운데(x=0)를 거쳐 가므로 벽을 뚫지 않는다 ── */
function fpGoTo(nd){
  if(fpBusy) return;
  /* 버그 수정: 노드 마커를 직접 탭해서 걷는 이 경로는 그동안
     #fpSel/#fpB1Panel이 열려 있는지 확인하지 않았다 — 옥상 하강 버튼이
     뜬 채로 마커를 탭하면 이 함수가 그대로 이동을 진행했고, 도착 처리
     후반부의 무조건 fpSelHide() 호출 때문에 버튼이 곧바로 사라져 보였다
     (fpStepMove/fpFreePick만 막아 뒀지 이 경로는 빠져 있었다). */
  var __selElG=document.getElementById('fpSel');
  if(__selElG && __selElG.classList.contains('on')) return;
  var __b1ElG=document.getElementById('fpB1Panel');
  if(__b1ElG && __b1ElG.classList.contains('on')) return;
  /* 경로점 : 복도 한가운데(x=0)를 거쳐 가므로 벽을 뚫지 않는다.
     문을 지나야만 갈 수 있는 자리는 nd.via 에 적어 둔 지점을 먼저 들른다. */
  var pts=[{x:fpPos.x, z:fpPos.z}];
  function push(px,pz){
    var last=pts[pts.length-1];
    if(Math.abs(px-last.x)>0.05 || Math.abs(pz-last.z)>0.05) pts.push({x:px, z:pz});
  }
  var vias = nd.via ? (nd.via.length ? nd.via : [nd.via]) : [];
  /* 경유점('via')은 원래 '복도에서 방으로 들어올 때'만 필요한 문 앞 지점들이다.
     이미 그 방 안에 서 있는데도 다 거치면, 예를 들어 지하 계단참(zoneland)으로
     걸어갈 때 이미 지나온 문 앞(footPt)까지 도로 되돌아갔다가 다시 앞으로 오는
     식으로 걸어서 — 걷는 도중 갑자기 몸을 홱 돌려 뒤로 갔다 오는 것처럼 보이고
     시야각도 요동쳤다(요청하신 "카메라 각도 이상하게 변하고 벽에 튕기는" 현상의
     원인). 예전엔 'ifOutside' 표시가 붙은 경유점만 걸러냈는데, 표시가 없는
     다른 경유점(footPt 등)도 똑같이 "방 안에서는 필요 없는 경유점"이므로,
     이미 방 안에 서 있다면 경유점 전부를 건너뛰고 목적지로 곧장 간다. */
  if(fpRoomAt(fpPos.x, fpPos.z)) vias = [];
  /* 문을 반드시 통과해야 하는 지점(옥상 철문 안/밖)은, 지금 문 반대편에 서
     있을 때만 문 앞 경유점을 살려 둔다 — 같은 편에 있으면 곧장 걸어간다. */
  if(nd.viaAlways && nd.gateX!==undefined){
    var _sN=(fpPos.x>=nd.gateX), _sT=(nd.x>=nd.gateX);
    vias = (_sN!==_sT) ? nd.viaAlways : [];
  }
  /* 방 안(크리에이티브 존·열린 공간·계단참)은 복도가 아니라 열린 바닥이므로,
     마지막 구간까지 'x=0 복도 중앙'을 거치게 하면 오히려 벽을 뚫고 지나간다.
     → 그런 지점은 마지막 한 구간만 곧장 걸어간다. */
  var inRoom = (nd.kind==='zone'||nd.kind==='zoneroom'||nd.kind==='zoneexit'
              ||nd.kind==='zonefoot'||nd.kind==='zoneland'||nd.kind==='zonestair'
              ||nd.kind==='zonecorr'||nd.kind==='zoneoutside'
              ||nd.kind==='open');
  var list = vias.concat([{x:nd.x, z:nd.z}]);
  var cx=fpPos.x, cz=fpPos.z;
  list.forEach(function(w, wi){
    var last=(wi===list.length-1);
    /* 지금 서 있는 자리가 넓게 트인 방이면 복도 규칙(x=0 중앙선 경유)을 쓰지 않는다.
       예전에는 존 안에서 나가는 계단으로 갈 때도 복도 중앙까지 돌아 나갔다. */
    var curInRoom = !!fpRoomAt(cx, cz);
    if(!(last && inRoom) && !curInRoom){
      if(Math.abs(cx)>0.06 && Math.abs(w.z-cz)>0.06) push(0, cz);
      if(Math.abs(w.z-cz)>0.06) push(Math.abs(cx)>0.06 ? 0 : cx, w.z);
    }
    push(w.x, w.z);
    cx=w.x; cz=w.z;
  });
  if(pts.length<2){ fpArriveNode(nd); return; }
  /* 지하 나가는 계단(1구간 → 오른쪽 90도 → 2구간)을 지나갈 때는 눈높이(y)가 실제로
     계단을 오르듯 바뀌어야 한다 — 이 구간만 평면 이동 대신 계단 전용 연출로 걷는다. */
  /* 지하 나가는 계단(1구간/2구간) 구간도 이제 자유롭게 걸어 다닐 수 있어야 하므로,
     여기서 계단 전용 연출(fpRunSeq 애니메이션)로 가로채지 않는다 — 이 아래의 일반 경로
     이동으로 그대로 진행하고, 눈높이(y)는 fpFreeTick에서 fpB1ExitY()로 매 프레임 계산한다. */
  var total=0, segL=[];
  for(var i=1;i<pts.length;i++){
    var d=Math.sqrt(Math.pow(pts[i].x-pts[i-1].x,2)+Math.pow(pts[i].z-pts[i-1].z,2));
    segL.push(d); total+=d;
  }
  fpFaceYaw=null;
  /* 둘러보느라 돌려 둔 시선을 몸 방향으로 합쳐 둔다
     (안 그러면 걷기 시작하는 순간 시야가 그만큼 홱 틀어진다) */
  fpYaw += fpLookYaw; fpLookYaw = 0;
  fpPath={pts:pts, segL:segL, total:total, t:0,
          dur: Math.max(0.45, total/FP_WALK) + 0.35,   // 출발·도착이 완만하도록 여유
          sx:fpPos.x, sz:fpPos.z, node:nd};
  fpCap('');
}
/* 폴리라인 위에서 '앞에서부터 d만큼 간 지점'과 그 방향을 구한다 */
function fpPathAt(d){
  var pts=fpPath.pts, segL=fpPath.segL, acc=0;
  for(var i=0;i<segL.length;i++){
    if(d<=acc+segL[i] || i===segL.length-1){
      var t=segL[i]>0 ? Math.min(1,(d-acc)/segL[i]) : 1;
      var a=pts[i], b=pts[i+1];
      return {x:a.x+(b.x-a.x)*t, z:a.z+(b.z-a.z)*t, dx:b.x-a.x, dz:b.z-a.z};
    }
    acc+=segL[i];
  }
  var e=pts[pts.length-1];
  return {x:e.x, z:e.z, dx:0, dz:0};
}
/* 도착했을 때 : 바라볼 방향을 정하고, 엘리베이터·계단이면 층 선택을 띄운다 */
function fpArriveNode(nd){
  var ko=(LANG==='ko');
  fpEyeOffset = 0;   // 노드 진입 시 눈높이 보정을 기본값으로 되돌리고, 필요한 지점에서만 아래서 다시 조정
  if(nd.kind==='zonedoor'||nd.kind==='zone'||nd.kind==='zoneroom'){
    fpFaceYaw=0;                                           // 크리에이티브 존 안쪽(+Z)을 본다
    if(nd.kind==='zone'||nd.kind==='zoneroom') fpLookPitch=-0.16;
  }
  else if(nd.kind==='zoneexit'||nd.kind==='zonefoot'){
    fpFaceYaw=0;                                           // 이중문 → 계단 쪽(+Z)
    /* 버그 수정: 바로 앞(zone/zoneroom)에서 넘어올 때 남아 있던
       -0.16 아래쪽 시선(fpLookPitch)이 여기까지 그대로 이어져, 나가는 문
       안쪽에서 다른 층 복도를 걸을 때와 달리 화면이 아래로 기울어진 채
       움직이는 것처럼 보였다 — 다른 복도와 똑같이 수평(0)으로 되돌린다. */
    fpLookPitch=0;
  }
  /* 버그 수정 계속: 여기서도 계단참 도착 시 2구간(숨김 처리됨) 방향으로
     90도 돌려세우고 있었다 — 걷기 애니메이션에서 회전을 뺀 것과 별개로, 도착 후
     시선도 여기서 다시 옆으로 틀어버려서 뒤로가기가 계속 어긋났다. 이제는 문 쪽
     (+Z, zonefoot/zoneexit와 동일)을 그대로 바라보게 한다. */
  else if(nd.kind==='zoneland'||nd.kind==='zonestair'){
    fpFaceYaw=0;
    fpLookPitch=0;   // 버그 수정: zoneexit/zonefoot와 같은 이유로 시선을 수평으로 되돌린다
  }
  else if(nd.kind==='zonecorr'){
    /* 계단참에서 90도 꺾인 통로 안쪽(문 쪽)을 바라본다 —
       dir(+1/-1)에 따라 복도가 +X 또는 -X로 뻗어 있으므로 그 방향을 그대로 yaw로 쓴다.
       카메라 정렬: 문 프레임 기둥이 기울어 보이지 않도록 상하 시선(pitch)을
       0으로 명시적으로 되돌린다. */
    var __P=fpB1ExitPts();
    fpFaceYaw=(__P.dir>0) ? Math.PI/2 : -Math.PI/2;
    fpLookPitch=0;
  }
  else if(nd.kind==='spot'){
    fpFaceYaw=null;
    /* 버그 수정: 나가는 문 안쪽(exit1/exit2)에서 잘게 걷는 이동은
       대부분 이 'spot' 자리로 도착하는데, 그 앞에 지나온 'zone' 자리에서
       걸어둔 -0.16 아래쪽 시선이 그대로 남아 있어 다른 층 복도를 걸을 때와
       달리 화면이 계속 아래로 기운 채 움직이는 것처럼 보였다 — 이 구간
       안쪽에서는 다른 복도와 똑같이 수평 시선으로 되돌린다. */
    if(fpFloorNow==='B1'){
      var __sq=fpRoomAt(nd.x, nd.z);
      if(__sq && (__sq.id==='exit1' || __sq.id==='exit2')) fpLookPitch=0;
    }
  }
  else if(nd.kind==='open'){
    fpFaceYaw=-Math.PI/2;                                  // 빈 공간 안쪽(-X)
    fpLookPitch=-0.16;                                     // 책상·의자가 눈높이보다 낮다
  }
  else if(nd.kind==='wc')
    /* 화장실은 통로 양옆에 마주 보고 있으므로 복도 쪽이 아니라 그 문을 돌아본다 */
    fpFaceYaw=(nd.faceYaw!==undefined) ? nd.faceYaw
            : ((nd.wcSex==='M') ? Math.PI : 0);
  else if(nd.kind==='door'||nd.kind==='es')
    fpFaceYaw=((nd.side>0)?Math.PI/2:-Math.PI/2) - 0.23;   // 명찰이 붙은 쪽으로 약 13도
  else if(nd.kind==='ev'||nd.kind==='st') fpFaceYaw=Math.PI/2;
  else if(nd.kind==='gate'||nd.kind==='hall') fpFaceYaw=Math.PI/2;
  else if(nd.kind==='corr'){
    /* 복도 한가운데에 서면 언제나 복도를 따라 바라본다.
       (예전엔 진행 방향 그대로 서서, 현관에서 나오면 건너편 안내판을 코앞에서 마주 봤다) */
    var far=(target && target.floor===fpFloorNow) ? targetPos().z*BUILDING_Z_STRETCH : null;
    if(far!==null && Math.abs(far-nd.z)>0.8){
      fpFaceYaw=(far>nd.z) ? 0 : Math.PI;           // 목적지가 있는 복도 쪽
    }else if((nd._lastDz||0) > (nd._lastDx||0)){
      fpFaceYaw=null;                                // 복도를 따라 왔으면 오던 방향 그대로
    }else{
      /* 옆에서 들어왔는데 목적지도 이 층에 없다 → 복도가 긴 쪽을 바라본다 */
      var midZ=((GLOBAL_TOP_Z+GLOBAL_BOT_Z)/2)*BUILDING_Z_STRETCH;
      fpFaceYaw=(nd.z<=midZ) ? 0 : Math.PI;
    }
  }
  else fpFaceYaw=null;
  if(nd.kind==='ev'){
    /* 자유탐색으로 걸어와 엘리베이터 앞에 서면, 타기 전에도 문이 지금 층의 제 자리에 보여야 한다 */
    var evNow=evXZ(fpFloorNow), evzWNow=evNow.z*BUILDING_Z_STRETCH, frontXNow=evNow.x-fpEvW(fpFloorNow)/2;
    fpCabPos={x:frontXNow-0.13+FP_CAB_D/2, z:evzWNow};
    fpSelShow('ev'); fpCap(ko?'몇 층으로 갈까요?':'Which floor?'); return;
  }
  if(nd.kind==='st'){
    /* 예전엔 1층에서 계단 지점에 도착하면 "후문·간판·타일벽이 한 화면에
       보이도록" 카메라를 계단실 문턱(x=0.65)이 아니라 fpMakeBackDoorBranch가
       쓰는 것과 같은 좌표의 후문 곁가지 서브 계단참(바닥보다 낮고 폭 1m뿐인
       좁은 통로) 안쪽으로 옮겨 세웠다. 그런데 그 자리가 실제로는 벽·구조물에
       너무 가깝게 붙어 있어서, 걸어서 도착했을 때 벽 속에 낑긴 것처럼 보이는
       문제가 있었다(이 특수 이동을 없애고 다른 층과 똑같이 기본
       계단 앞 자리에 서게 한다). */
    /* 실사진 대비 후문이 작고 계단에 가려 보이는 문제 — 원인은 위치가 아니라
       거리다: 계단실이 깊어서(6.2m) 훨씬 가까운 계단이 화면 오른쪽을 크게
       채우는 동안, 문턱에서 6m 넘게 떨어진 후문은 상대적으로 작게 보인다.
       문·계단·벽은 실제 위치 그대로 두고, 1층 도착 시에만 시야각을 살짝
       좁혀(줌인) 후문 쪽 중심부를 더 크게, 계단 쪽 주변부 비중을 줄인다
       ("공간을 옮기지 말고 카메라 위치·시야각만 조정"). */
    fpZoom = (fpFloorNow===1) ? 1.15 : 1;
    fpSelShow('st'); fpCap(''); return;
  }
  /* 버그 수정 계속: 시간 기준(0.45초) 방어만으로는 부족했다 —
     이전에 다른 곳을 탭해서 걷기 시작한 경로가, 그 도중에 계단 근처를
     지나며 버튼이 자동으로 뜬 뒤에도 계속 걷고 있다가 원래 목적지(계단과
     무관한 지점)에 몇 초 뒤에나 도착해서, 그 "관련 없는 도착 처리"가
     뒤늦게 버튼을 지워버렸다 — 지금 실제로 계단(중앙·비상) 바로 근처에
     서 있다면, 도착 처리가 언제 끝나든 그 버튼을 함부로 닫지 않는다. */
  var __nearStair=false;
  if(fpFloorNow==='R' && fpNodes){
    for(var __i=0;__i<fpNodes.length;__i++){
      var __nd=fpNodes[__i];
      if(__nd.kind!=='st' && __nd.kind!=='es') continue;
      var __dx=__nd.x-fpPos.x, __dz=__nd.z-fpPos.z;
      if(__dx*__dx+__dz*__dz < 6.76){ __nearStair=true; break; }
    }
  }
  if(!fpSelJustShown() && !__nearStair) fpSelHide('fpArriveNode-other');
  var reached=false;
  if(nd.kind==='door'){
    reached=(target && target.kind==='room' && target.code===nd.code && target.floor===fpFloorNow);
    fpCap((reached?'\u2605 ':'')+roomTitle(nd.code)+(reached?(ko?' 도착!':' — arrived!'):''));
  }else if(nd.kind==='wc'){
    reached=(target && target.kind==='toilet' && target.floor===fpFloorNow);
    var wcNm = (nd.wcSex==='M') ? (ko?'남자화장실':'Men\u2019s restroom')
                                : (ko?'여자화장실':'Women\u2019s restroom');
    fpCap(wcNm+(reached?(ko?' 도착!':' — arrived!'):''));
  }else if(nd.kind==='es'){
    reached=(target && target.kind==='emstair' && target.floor===fpFloorNow);
    fpCap((ko?'비상계단 — 위·아래를 고르세요':'Emergency stairs — up or down')
          +(reached?(ko?' \u00b7 도착!':' \u00b7 arrived!'):''));
    fpSelShow('es');
  }else if(nd.kind==='zone'||nd.kind==='zoneroom'){
    reached=(target && target.kind==='zone' && target.floor==='B1');
    fpCap((ko?'크리에이티브 존':'Creative Zone')+(reached?(ko?' 도착!':' — arrived!'):''));
    /* 존 안에 들어오면 바닥 빨간 유도선은 끈다. 단, fpRouteFloor(false)는
       그 유도선을 끄는 동시에 건물 전체보기용 굵은 빨간 경로관(routeA)을
       다시 켜 버리는 부작용이 있다(fpStartFree에서도 같은 이유로 호출
       직후 routeA를 따로 숨긴다) — 여기서도 똑같이 뒤따라 꺼서, 자유 탐색
       중 존을 나와 엘리베이터 쪽으로 걸어갈 때 그 큰 빨간 관이 허공에
       떠 보이던 문제를 없앤다. */
    if(reached){
      fpRouteFloor(false);
      if(typeof routeA!=='undefined' && routeA) routeA.visible=false;
    }
  }else if(nd.kind==='zonefoot'){
    /* 이 구간만 화각(zoom)·눈높이를 따로 좁혀둬서, 다른 층을 걸을 때와
       달리 이 안에서는 걸을 때마다 화면이 좁아졌다 넓어졌다 하며 어색하게
       느껴졌다 — 다른 층과 똑같이 기본값(zoom 1, 눈높이 보정 0)을 쓰도록 되돌린다. */
    fpZoom = 1;
    fpEyeOffset = 0;
    fpCap('');   // 이 지점의 설명 문구를 지운다
  }else if(nd.kind==='zoneland'){
    fpZoom = 1;   // 다른 층과 같은 기본 화각으로 통일(기존 0.85 → 1)
    fpCap('');   // 이 지점의 설명 문구도 지운다
  }else if(nd.kind==='zonecorr'){
    fpZoom = 1;   // 다른 층과 같은 기본 화각으로 통일(기존 58/60 → 1)
    fpCap('');
  }else fpCap('');
  /* 지점 종류가 안 맞아도, 목적지 문 바로 앞(2.4m 이내)에 서 있으면 도착이다.
     예전에는 문 코앞까지 가고도 지점이 달라 도착으로 안 잊혀졌다. */
  if(!reached && target && target.floor===fpFloorNow){
    var tp=fpTargetXZ();
    if(tp && tp.door){
      var dd=Math.sqrt(Math.pow(tp.x-nd.x,2)+Math.pow(tp.z-nd.z,2));
      if(dd < 2.4){
        reached=true;
        fpFaceYaw=((tp.x>0)?Math.PI/2:-Math.PI/2);
        fpCap('\u2605 '+targetLabel()+(ko?' 도착!':' — arrived!'));
      }
    }
  }
  /* 목적지 문 앞에 서면 자동재생과 똑같이 '도착'으로 기록해서,
     탐색을 끝냈을 때 버튼이 '다시 보기'가 되고 도착 화면으로 이어질 수 있게 한다. */
  if(reached){ personAnim.done=true; syncTripBtn(); }
}
/* ── 층 선택 패널(엘리베이터 / 계단) ── */
var fpSelShownAt=0;
function fpSelShow(kind){
  var el=document.getElementById('fpSel'); if(!el) return;
  fpSelShownAt = (typeof performance!=='undefined') ? performance.now() : Date.now();
  var ko=(LANG==='ko'), html='';
  if(kind==='ev'){
    for(var i=LEVELS.length-1;i>=0;i--){
      var lv=LEVELS[i];
      if(lv==='R') continue;              // 옥상은 엘리베이터가 안 선다(계단으로만)
      html += '<button'+(lv===fpFloorNow?' class="now"':'')
           +' onclick="fpEvRide('+(typeof lv==='string'?"'"+lv+"'":lv)+')">'+lvLabel(lv)+'</button>';
    }
  }else if(kind==='es'){
    /* 비상계단 : 지하만 빼고 오르내린다(옥상까지 이어져 있다) */
    var upE=LEVELS[lvIndex(fpFloorNow)+1];
    var dnE=(fpFloorNow!==1) ? LEVELS[lvIndex(fpFloorNow)-1] : null;
    if(upE)                html += '<button onclick="fpEmGo(1)">\u2191 '+lvLabel(upE)+'</button>';
    if(dnE && dnE!=='B1') html += '<button onclick="fpEmGo(-1)">\u2193 '+lvLabel(dnE)+'</button>';
  }else{
    var up=LEVELS[lvIndex(fpFloorNow)+1], dn=LEVELS[lvIndex(fpFloorNow)-1];
    /* 최종: 지하로 내려가는 옵션은 이 패널에서 뺀다 — B1으로
       내려가는 버튼은 후문 로비(도착 지점)에 서 있을 때만 별도로 뜬다. */
    if(fpFloorNow===1) dn=null;
    /* 옥상(R)에서는 위로 갈 곳이 없고, 내려가기도 일반
       fpStairGo가 아니라 올라온 길을 그대로 되짚는 fpRoofChoice를 쓴다
       (계단참에서 자연스럽게 돌아서는 연출까지 포함되어 있다). */
    if(fpFloorNow==='R'){
      /* 삭제: '밖으로 나가기' 버튼은 없앤다 — 철문(또는 문 앞
         바닥)을 눌러 걸어 나가는 방식만 남긴다(fpBuildNodes의 roofout/roofin
         이동 지점이 그 역할을 한다). fpRoofGoOut() 함수 자체는 남겨 둔다. */
      html += '<button onclick="fpStairGo(-1)">\u2193 '+lvLabel(dn)+'</button>';
    }else{
      if(up) html += '<button onclick="fpStairGo(1)">\u2191 '+lvLabel(up)+'</button>';
      if(dn) html += '<button onclick="fpStairGo(-1)">\u2193 '+lvLabel(dn)+'</button>';
    }
  }
  html += '<button class="x" onclick="fpSelHideBtn()">\u2715</button>';
  el.innerHTML=html; el.classList.add('on');
}
/* 옥상 철문 밖(데크)으로 걸어 나간다 — 문 안쪽/바깥쪽 이동 지점을 잇는
   경로라 실제로 문을 통과한다. 다시 들어올 때는 옥탑방 안쪽을 누르면
   같은 방식으로 문을 지나 돌아온다(fpBuildNodes의 roofin 지점). */
function fpRoofGoOut(){
  if(fpSelJustShown()) return;
  fpSelHide('fpRoofGoOut');
  var nd=null;
  for(var i=0;i<fpNodes.length;i++){ if(fpNodes[i].kind==='roofout'){ nd=fpNodes[i]; break; } }
  if(nd) fpGoTo(nd);
}
function fpSelHide(reason){
  var el=document.getElementById('fpSel');
  if(el){ el.classList.remove('on'); el.innerHTML=''; }
  if(typeof fpHideRoofAsk==='function') fpHideRoofAsk();
}
/* 버그 수정 후보: 계단 근처에 다가가 버튼이 뜨는 그 순간, 걷기용
   탭이 화면 고정 위치(하단 중앙)에 막 나타난 이 버튼과 같은 자리에 겹쳐서,
   "걸으려던 탭"이 그대로 이 버튼을 눌러버리는 것처럼 보였다(버튼이 뜨자마자
   바로 사라지는 것처럼 느껴진 원인으로 추정) — 버튼이 뜬 직후 아주 짧은
   시간(0.45초) 동안은 이 선택지 버튼들의 탭을 무시해서, 걷기 탭이 실수로
   버튼을 누르지 않게 한다. */
function fpSelJustShown(){
  var now=(typeof performance!=='undefined') ? performance.now() : Date.now();
  return (now - fpSelShownAt) < 450;
}
function fpSelHideBtn(){
  if(fpSelJustShown()) return;
  fpSelHide('closeBtn-X');
}
function fpEvRide(lv2){
  if(fpSelJustShown()) return;
  if(fpBusy || lv2===fpFloorNow){ fpSelHide('fpEvRide-reject'); return; }
  fpBusy=true; fpSelHide('fpEvRide-start'); fpPath=null; fpFaceYaw=null;
  var ko=(LANG==='ko'), lvFrom=fpFloorNow;
  var ev=evXZ(lvFrom), evzW=ev.z*BUILDING_Z_STRETCH;
  var frontX=ev.x-fpEvW(lvFrom)/2, lobbyX=frontX-1.5, standX=frontX+FP_STAND;
  fpCabPos={x:frontX-0.13+FP_CAB_D/2, z:evzW};
  fpBuildCorr([lvFrom, lv2]);          // 두 층 복도를 함께 세워 두고 이동한다
  fpClearNodeG();
  fpSetCabButtons(lvLabel(lv2));       // 가려는 층 버튼에 빨간불
  fpEvDir = (lvIndex(lv2) > lvIndex(lvFrom)) ? 1 : -1;
  fpSetHallInd(lvLabel(lvFrom), fpEvDir);
  fpRunSeq([
    {dur:1.0, door:1, yaw:Math.PI/2, panel:lvLabel(lvFrom),
     label: ko?'엘리베이터 문이 열립니다':'Doors opening'},
    {to:{x:standX, z:evzW}, label: ko?'엘리베이터 탑승':'Stepping in'},
    {dur:1.3, door:0, yaw:-Math.PI/2, label: ko?'문이 닫힙니다':'Doors closing'},
    {dur:1.2+Math.abs(lvIndex(lv2)-lvIndex(lvFrom))*0.7, y:fpSlabY(lv2), hide:true,
     label: ko?(lvName(lv2)+'으로 이동 중'):('Going to '+lvName(lv2))},
    {dur:1.0, door:1, panel:lvLabel(lv2),
     label: ko?(lvName(lv2)+' 도착 · 문이 열립니다'):(lvName(lv2)+' · doors opening')},
    {to:{x:lobbyX, z:evzW}, label: ko?'엘리베이터에서 내립니다':'Stepping out'},
    /* 내린 뒤에는 문이 닫혔야 한다.
       예전엔 열린 채로 남아서, 다른 층으로 갔다 와도 계속 벌어져 있었다. */
    {dur:1.2, door:0, label: ko?'문이 닫힙니다':'Doors closing'}
  ], function(){
    fpSetFloor(lv2);
    fpSetCabButtons(null);             // 내렸으니 불을 끔다
    fpEvDir=0; fpSetHallInd(lvLabel(lv2), 0);
    fpBusy=false; fpFaceYaw=-Math.PI/2; fpCap('');
  });
}
/* ── 계단으로 한 층 이동 ── */
function fpStairGo(dir){
  if(fpSelJustShown()) return;
  var lv2=LEVELS[lvIndex(fpFloorNow)+dir];
  if(fpBusy || !lv2){ fpSelHide('fpStairGo-reject'); return; }
  fpBusy=true; fpSelHide('fpStairGo-start'); fpPath=null; fpFaceYaw=null;
  var ko=(LANG==='ko'), lvFrom=fpFloorNow, ST=BUILDING_Z_STRETCH;
  var stZ=stZOf(lvFrom)*ST;
  /* 1층 계단 지점에 도착하면 fpArriveNode가 "후문·간판·타일벽이 한 화면에
     보이도록" 카메라를 계단 본체에서 두 칸 내려간 후문 곁가지 통로 안쪽
     (바닥보다 낮고, 폭 1m짜리 좁은 통로 안)으로 스냅해 둔다. 그 상태 그대로
     아래 걷기 연출(첫 스텝이 xIn/stZ로 직선 이동)을 시작하면, 통로 옆벽과
     계단실 벽을 비스듬히 뚫고 지나가며 화면 가득 벽면이 스치는 "벽에 끼임"
     현상이 났다 — 연출을 시작하기 전에 카메라를 원래 계단 문턱 자리로
     먼저 되돌려 놓는다(위/아래 선택창을 띄우기 전 좌표와 동일). */
  if(lvFrom===1){
    fpPos.x=0.65; fpPos.y=fpSlabY(1); fpPos.z=stZ;
  }
  fpBuildCorr([lvFrom, lv2]);
  fpClearNodeG();
  /* 실제 계단처럼 지그재그로 오르내린다 : 개구부 → 한쪽 단으로 반 층 →
     중간 계단참에서 반 바퀴 → 반대쪽 단으로 나머지 반 층 → 복도.
     예전에는 가운데 칸막이 벽을 뚚고 지나가며 수직으로 솔아올라
     엘리베이터처럼 보였다. */
  var yA=fpSlabY(lvFrom), yZ=fpSlabY(lv2), yMid=(yA+yZ)/2;
  /* 계단참 회전 반경 완화 : 옆단은 벽에서 조금 더 떨어져 걷고(턴 시 벽에 바짝
     붙지 않게), 계단참 꼭대기(xTop)는 이번에 넓힌 계단참 안쪽으로 더 들어가
     돌 자리를 넉넉히 확보한다.
     1층과 맞닿는 구간(1F→2F 또는 1F→B1)은 실제 계단 지오메트리가 1.4배
     넓게 그려지므로(fpMakeStairwell의 owAuto), 걷는 경로의 좌우 오프셋도
     같은 배율을 써야 한다 — 안 그러면 몸이 이제 훨씬 굵어진 반대쪽 단
     옆구리에 바짝 붙어 걷게 되어 화면이 계단 옆면으로 꽉 막혀 보인다. */
  var stOwWalk = (lvFrom===1 || lv2===1) ? FP_ST_OW*1.4 : FP_ST_OW;
  /* 구조 정정에 맞춤: 중앙계단의 올라가는 단이 다시 +Z열로
     돌아갔다(fpMakeStairwell의 _colFlip 참고) — 걷는 자리도 부호를 함께 되돌린다. */
  var zSide = stZ + dir*(stOwWalk/4-0.06);   // 올라갈 때는 +Z 단, 내려갈 때는 -Z 단
  var zBack = stZ - dir*(stOwWalk/4-0.06);   // 계단참에서 돌아 타는 반대쪽 단
  /* 버그 수정: B1↔1F 구간은 지그재그 두 도막이 아니라 실제로는
     +Z쪽 한 도막(zUp)짜리 단일 직선 계단이다. 그런데 위 zSide는 dir 부호에
     따라 오르내림마다 반대쪽(-Z)으로 뒤집혀서, 내려갈 때(dir<0)는 실제
     계단이 없는 반대쪽 자리를 걷는 것처럼 계산돼 왔다 — 그래서 1F→B1
     시작 위치/방향이 실제 계단 입구와 어긋나고, B1→1F 시작점과도 서로
     달라졌다. 이 구간만은 dir과 무관하게 항상 같은 +Z쪽 고정 좌표를 쓴다. */
  var zFlight = stZ + (stOwWalk/4-0.06);
  var xIn   = FP_WALL_X + 0.50;
  var xFoot = FP_WALL_X + FP_ST_LAND + 0.12;
  /* B1↔1F 직선 계단은 길이가 다르므로(FP_B1F_RUN_LEN) 꼭대기 좌표도 따로 잡는다 */
  var straightB1Fpre = ((lvFrom===1 && lv2==='B1') || (lvFrom==='B1' && lv2===1));
  var xTop  = FP_WALL_X + FP_ST_LAND
            + (straightB1Fpre ? FP_B1F_RUN_LEN : FP_ST_N*FP_ST_RUN) + 0.58;
  var up = (dir>0);
  /* B1↔1F 구간은 실제 사진(계단참 U턴 없이 한 방향으로 쭉 이어지다가 1층 후문
     로비로 바로 이어지는 단일 직선 계단)과 다르게, 지금까지는 다른 층들과 똑같은
     "반 층 오름 → 계단참에서 180도 돌아 반대편 단으로 건너감 → 나머지 반 층"
     지그재그로 걸었다. fpMakeStairwell 쪽도 이제 이 구간만 단 높이(rise)를
     두 배로 잡아 한 도막(N단)으로 전체 한 층을 오르는 실제 구조로 바꿨으므로,
     걷기도 중간에 멈추지 않고 한 번에 쭉 오른다 — B1→1F 방향은 계단을 다 오른
     그 자리에서 곧장 후문 로비(fpMake1FStairHall, 유리문·SW간판 공간)로
     걸어 들어가 멈춘다(창문 있는 중간 계단참에 서지 않는다). */
  var straightB1F = ((lvFrom===1 && lv2==='B1') || (lvFrom==='B1' && lv2===1));
  var arriveInHall = straightB1F;   // B1↔1F 방향 모두 각자의 로비/복도로 바로 들어간다(옆걸음 없이)
  var steps=[];
  /* 1F→B1 방향은 "지하로" 버튼이 뜨는 그 자리(후문 로비, 이미
     계단 꼭대기 바로 앞)에서 바로 시작한다 — 다른 방향들처럼 계단실 입구
     (xIn)까지 되돌아갔다가 다시 오는 불필요한 왕복 없이, 곧장 계단 위쪽
     끝(xTop)으로 걸어가서 그대로 그 계단을 타고 내려간다. */
  if(straightB1F && !up){
    /* "내려가는 계단 앞"(가운데서 멈춰 서는 중간 단계) 없이,
       버튼을 누르자마자 곧장 계단을 내려가기 시작한다 — 시작 위치를
       계단 맨 위(xTop, zFlight)로 미리 옮겨 두고, 실제로 내려가는
       연출 한 칸만 재생한다. */
    fpPos.x = xTop; fpPos.z = zFlight; fpYaw = -Math.PI/2;
    steps.push(
      /* 이 구간은 단 하나 높이(rise)가 평소의 2배라, 걷기 연출도
         평소 N수(FP_ST_N)가 아니라 늘린 단 수(FP_ST_N_UP)로 잘게 밟아야
         한 칸마다 출렁이는 폭이 줄어든다. dur은 전체 소요 시간이 늘어나지
         않도록 한 칸당 시간을 그만큼 줄여 총합을 그대로 맞춘다.
         bobScale도 절반으로 줄여 장식용 출렁임까지 겹쳐 커지지 않게 한다. */
      {to:{x:xFoot, z:zFlight}, y:yZ, ease:'lin', stairs:FP_ST_N_UP, slook:-1,
       dur:FP_ST_N*0.30, bobScale:0.5,
       label: ko?'지하 1층으로 내려갑니다':'Down to B1'}
    );
    fpRunSeq(steps, function(){
      fpSetFloor(lv2);
      fpBusy=false; fpFaceYaw=null; fpCap('');
    });
    return;
  }
  /* v109: 옥상 도막(계단참↔옥상 바닥)은 10단·첫 단이 FP_R_XSHIFT만큼 안쪽 — 그 도막을 걷는 구간만
     발 위치(xFootR)·단 수(FP_ST_N_R)를 바꿔 실제 단 위를 밟게 한다. */
  var roofLeg = (lv2==='R' || lvFrom==='R');
  var xFootR = xFoot + FP_R_XSHIFT;
  var xFootFrom = (lvFrom==='R') ? xFootR : xFoot;      // 첫 도막(출발 층 쪽)
  var xFootTo   = (lv2==='R')    ? xFootR : xFoot;      // 둘째 도막(도착 층 쪽)
  var nFrom = (lvFrom==='R') ? FP_ST_N_R : FP_ST_N, nTo = (lv2==='R') ? FP_ST_N_R : FP_ST_N;
  var stB1Start = (straightB1F && !up) ? xTop : xFootFrom;
  var stB1End   = (straightB1F && !up) ? xFoot : xTop;
  var zStep = straightB1F ? zFlight : zSide;   // 직선 계단 구간은 dir 부호와 무관하게 항상 같은 자리
  steps.push(
    {to:{x:xIn, z:stZ}, yaw:Math.PI/2,
     label: ko?'계단실로 들어갑니다':'Into the stairwell'},
    {to:{x:stB1Start, z:zStep},
     label: ko?(up?'올라가는 계단 앞':'내려가는 계단 앞')
              :(up?'At the up flight':'At the down flight')},
    {dur:0.32, label:''}
  );
  if(straightB1F){
    /* 계단참에서 멈추거나 꺾지 않고, 한 번에 전체 한 층 높이를 쭉 걸어 오른다.
       (단 하나 높이가 평소의 2배인 구간이므로, 위의 1F→B1 분기와 마찬가지로
       걷기 연출은 늘린 단 수(FP_ST_N_UP)와 절반 bobScale을 쓴다.) */
    steps.push(
      {to:{x:stB1End, z:zStep}, y:yZ, ease:'lin', stairs:FP_ST_N_UP, slook:(up?1:-1),
       dur:FP_ST_N*0.30, bobScale:0.5,
       label: ko?(lvName(lv2)+'으로 '+(up?'올라갑니다':'내려갑니다'))
                :((up?'Up to ':'Down to ')+lvName(lv2))}
    );
  }else{
    steps.push(
      {to:{x:xTop, z:zSide}, y:yMid, ease:'lin', stairs:nFrom, slook:(up?1:-1),
       dur:nFrom*0.28,
       label: ko?(up?'계단을 오릅니다':'계단을 내려갑니다')
                :(up?'Going up':'Going down')},
      /* 계단참에서: 제자리 90도 회전 → 계단참을 가로질러 한 걸음 → 다시 90도 회전.
         (계단이 가운데 벽을 사이에 두고 두 도막으로 나뉘어 있으므로, 그 사이 계단참을
         실제로 가로질러 건너가는 동작으로 표현한다 — 전에는 여기서 한 번에 대각선으로
         가로질러 계단 두 도막을 관통하는 것처럼 보였다.) */
      {dur:0.5, yaw:(up?Math.PI:0),
       label: ko?'계단참에서 돌아섭니다':'Turning at the landing'},
      {to:{x:xTop, z:zBack},
       label: ko?'계단참을 가로지릅니다':'Crossing the landing'},
      {dur:0.4, yaw:-Math.PI/2, label:''},
      {to:{x:xFootTo, z:zBack}, y:yZ, ease:'lin', stairs:nTo, slook:(up?1:-1),
       dur:nTo*0.28,
       label: ko?(lvName(lv2)+'으로 '+(up?'올라갑니다':'내려갑니다'))
                :((up?'Up to ':'Down to ')+lvName(lv2))},
      {dur:0.35, yaw:-Math.PI/2, label:''}
    );
  }
  if(arriveInHall){
    if(up){
      /* 계단 꼭대기(xTop)는 이미 후문 로비 바닥(fpMake1FStairHall의 landFl,
         x0+LAND~x0+WD) 안쪽이다 — 문 쪽으로 조금 더 걸어 들어가 로비 한복판에
         멈춘다(문에 바짝 붙지 않도록 살짝 여유를 둔다). */
      var hallX = FP_WALL_X + FP_ST_WD_B1F - 0.6;
      steps.push({to:{x:hallX, z:stZ},
        label: ko?'1층 후문 로비로 들어갑니다':'Into the 1F back-door hall'});
    }
    /* 반대 방향(1F→B1)은 엉뚱하게 옆(x=0.65)으로 이동하는 스텝을
       타지 않는다 — 계단을 다 내려온 그 자리(xTop, zSide)가 이미 B1 계단실
       바닥이므로, 추가 옆걸음 없이 그대로 멈춘다. */
    fpRunSeq(steps, function(){
      fpSetFloor(lv2);
      fpBusy=false; fpFaceYaw = up ? Math.PI/2 : null; fpCap('');
    });
    return;
  }
  /* 옥상에 도착하면 문 앞까지 더 걸어 들어가지 않고, 계단을 다 오른 그 자리
     ("계단 앞")에서 곧장 멈춰 내려가기 패널을 띄운다 — 문 쪽으로는 걷지 않으므로
     옥상 밖(철문 바깥 데크)으로 나가는 동선 자체가 없다.
     멈추는 자리를 계단 가장자리(+0.2)보다 더 뒤로(+0.6, 노란
     점자블록이 있는 자리 쪽으로) 물린다 — 이 if(lv2==='R') 분기는 옥상으로
     갈 때만 타므로 다른 층 이동에는 영향이 없다. */
  /* 단순화: 옥상 도착 동작을 다른 층과 똑같이 단순하게 만든다 —
     계단을 다 오른 그 자리에서 곧장 멈춘다. 예전에는 여기서 문 쪽으로
     두 걸음 더 걸어가는(+0.6, 그다음 점자블록 자리까지 대각선으로) 연출을
     추가했는데, 그 대각선 걸음이 여러 번의 회전 뒤에 이어지면서 다른 층
     도착보다 유난히 방향 전환이 많고 어색하게 느껴졌다("애니메이션이
     이상하다") — 다른 층(예: 4층→5층)처럼 계단을 다 오른 자리에서 바로
     멈추도록 되돌린다. */
  if(lv2==='R'){
    fpRunSeq(steps, function(){
      fpBusy=false;
      fpArriveRoof({from:lvFrom, stZ:stZ, xIn:xIn, xFoot:xFootR, xFootLo:xFoot, xTop:xTop,   // v109: xFoot=옥상 도막 발치(안쪽), xFootLo=5층 도막 발치
        zSide:zSide, zBack:zBack, yA:yA, yMid:yMid, yZ:yZ, up:up});
    });
    return;
  }
  steps.push(
    {dur:0.35, rdoor:0, yaw:-Math.PI/2, label:''},
    {to:{x:0.65, z:stZ}, yaw:-Math.PI/2,
     label: ko?(lvName(lv2)+' 복도'):(lvName(lv2)+' corridor')}
  );
  fpRunSeq(steps, function(){
    fpSetFloor(lv2);
    fpBusy=false; fpFaceYaw=-Math.PI/2; fpCap('');
  });
}
/* 계단을 다 오른 그 자리("계단 앞")에 도착하면, 이제 문 쪽으로는 더 걷지 않으므로
   그 자리에서 제자리로 뒤돌아 서게 해서 위쪽 복층(창고)이 자연스럽게 눈에 들어오게 한다.
   이후 다시 내려가려면 #fpSel 패널(엘리베이터·비상계단과 같은 스타일)의 버튼 하나만 누르면 된다. */
/* 재설계: 계단으로 올라온 순간에는 버튼을 띄우지 않는다 —
   위치·시선만 맞추고 되짚기 상태(fpRoofState)만 기록해 둔다. 버튼은
   철문을 나갔다가 다시 들어올 때만 뜨고(fpCheckRoofDoorReturn), 이때는
   다른 층 선택 패널처럼 X를 눌러야만 다시 움직일 수 있다 — 옥상만 유독
   내려가기 버튼이 뜨는 타이밍이 헷갈린다는 지적을 반영해, "문 안으로
   돌아왔다"는 명확한 사건 하나로만 뜨게 단순화했다. */
/* 최종 단순화: 옥상만 따로 "문 나갔다 들어옴" 감지를 만들었더니
   계속 인식이 어긋났다 — 다른 층 계단과 완전히 같은 표준 근접감지
   (fpCheckStairProximity)로 통일한다. 도착 시엔 위치·시선만 맞추고,
   근접감지를 한 번 무장 해제(disarm)해서 도착 직후엔 안 뜨게만 해둔다.
   이후엔 표준 시스템 그대로: 멀어졌다(문 밖으로 나가 2.65m 이상) 다시
   가까워지면(1.5m 이내) 자동으로 멈추고 버튼이 뜬다 — 1층 등과 완전히
   동일한 동작이라 더 이상 별도로 헷갈릴 일이 없다. */
var fpRoofState=null;
function fpArriveRoof(state){
  fpRoofState=state;
  fpSetFloor('R');            // 계단 앞에 선 순간부터 옥상(R)층으로 취급한다(밖으로 나가는 단계 없이)
  fpFaceYaw = Math.atan2(FP_ROOF_DOOR_X-fpPos.x, state.stZ-fpPos.z);
  fpRoofEyeLift = 0;
  fpLookPitch = 0.0;
  fpCap((LANG==='ko')?'계단 앞':'At the stairs');
  fpNearStairArmed = false;   // 도착 직후엔 뜨지 않는다 — 멀어졌다 오면 다시 뜬다
}
function fpRoofChoice(goOut){
  if(fpSelJustShown()) return;
  var st=fpRoofState; if(!st){ fpSelHide('fpRoofChoice-noState'); return; }
  fpSelHide('fpRoofChoice-start');
  var ko=(LANG==='ko');
  fpBusy=true; fpPath=null; fpFaceYaw=null;
  /* 다시 내려가기 : 문을 열지 않은 채로 계단을 되짚어 내려간다(올라온 길을 그대로 되감기)
     버그 수정: 아래 순서가 올라올 때(fpStairGo, lv2==='R' 분기)의
     정확한 역순이 아니었다 — 첫 번째 내려가는 도막에서 z좌표를 st.zBack이
     아니라 st.zSide로 잘못 써서, 계단참에서 따로 가로질러야 할 거리를
     첫 번째 도막을 걷는 도중에 한꺼번에 대각선으로 가로질러 버렸다(계단
     칸막이 벽을 비스듬히 뚫고 지나가는 것처럼 보이는 원인). 계단참을
     가로지르는 건 별도의 "가로지르기" 스텝으로 분리하고, 회전(yaw) 값도
     실제 이동 방향에 맞게 전부 다시 계산했다(올라올 때와 정확히 반대).
     추가 개선: 맨 첫 번째 회전(도착 시 문 쪽을 보던 방향 →
     계단 방향)은 상황에 따라 180도 가까이 돌아야 할 수도 있는데, 실제
     회전 속도(FP_TURN, 초당 최대 약 137도)로는 0.4초 안에 다 못 돈다 —
     이 스텝의 타이머가 먼저 끝나 버리면 몸이 채 다 돌기도 전에 다음
     스텝(계단 내려가기)이 시작돼 이상하게 보였다. 넉넉히(1.3초) 늘려
     항상 다 돌고 나서 다음 단계로 넘어가게 한다. */
  fpRunSeq([
    {dur:1.6, yaw:Math.PI/2, label:''},
    {to:{x:st.xTop, z:st.zBack}, y:st.yMid, ease:'lin', stairs:FP_ST_N_R, slook:-1, dur:FP_ST_N_R*0.28,   // v109: 옥상 도막 10단
     label: ko?'다시 계단을 내려갑니다':'Heading back down'},
    {dur:0.5, yaw:0, label: ko?'중간 계단참에서 돌아서':'Turning at the landing'},
    {to:{x:st.xTop, z:st.zSide}, label: ko?'계단참을 가로지릅니다':'Crossing the landing'},
    {dur:0.4, yaw:-Math.PI/2, label:''},
    {to:{x:(st.xFootLo!==undefined?st.xFootLo:st.xFoot), z:st.zSide}, y:st.yA, ease:'lin', stairs:FP_ST_N, slook:-1, dur:FP_ST_N*0.28,   // v109: 5층 도막은 원래 발치
     label: ko?(lvName(st.from)+'으로 내려갑니다'):('Down to '+lvName(st.from))},
    {dur:0.32, label:''},
    {to:{x:st.xIn, z:st.stZ}, yaw:-Math.PI/2, label:''},
    {to:{x:0.65, z:st.stZ}, yaw:-Math.PI/2,
     label: ko?(lvName(st.from)+' 복도'):(lvName(st.from)+' corridor')}
  ], function(){
    fpRoofState=null;
    fpSetFloor(st.from);
    fpBusy=false; fpFaceYaw=-Math.PI/2; fpCap('');
  });
}
/* ── 비상계단으로 한 층 이동(지하 제외, 옥상까지 가능) : 중앙계단과 같은 지그재그로 오르내린다 ── */
function fpEmGo(dir){
  if(fpSelJustShown()) return;
  var lv2=LEVELS[lvIndex(fpFloorNow)+dir];
  if(fpBusy || !lv2 || lv2==='B1'){ fpSelHide('fpEmGo-reject1'); return; }
  var esP=EMSTAIR_POS[fpFloorNow];
  if(!esP || !EMSTAIR_POS[lv2]){ fpSelHide('fpEmGo-reject2'); return; }
  fpBusy=true; fpSelHide('fpEmGo-start'); fpPath=null; fpFaceYaw=null;
  var ko=(LANG==='ko'), lvFrom=fpFloorNow, ST=BUILDING_Z_STRETCH;
  var stZ=esP.z*ST;
  fpBuildCorr([lvFrom, lv2]);
  fpClearNodeG();
  var yA=fpSlabY(lvFrom), yZ=fpSlabY(lv2), yMid=(yA+yZ)/2;
  /* 중앙계단과 동일하게 회전 반경을 넓힌다(요청: 비상계단도 애니메이션 동일하게) */
  var zSide = stZ + dir*(FP_EM_OW/4-0.06);
  var zBack = stZ - dir*(FP_EM_OW/4-0.06);
  var xIn   = FP_WALL_X + 0.50;
  var xFoot = FP_WALL_X + FP_ST_LAND + 0.12;
  var xTop  = FP_WALL_X + FP_ST_LAND + FP_ST_N*FP_ST_RUN + 0.58;
  var up = (dir>0);
  fpRunSeq([
    {to:{x:xIn, z:stZ}, yaw:Math.PI/2,
     label: ko?'비상계단으로 들어갑니다':'Into the emergency stairs'},
    {to:{x:xFoot, z:zSide},
     label: ko?(up?'올라가는 계단 앞':'내려가는 계단 앞')
              :(up?'At the up flight':'At the down flight')},
    {dur:0.32, label:''},
    {to:{x:xTop, z:zSide}, y:yMid, ease:'lin', stairs:FP_ST_N, slook:(up?1:-1),
     dur:FP_ST_N*0.28,
     label: ko?(up?'비상계단을 오릅니다':'비상계단을 내려갑니다')
              :(up?'Going up':'Going down')},
    /* 중앙계단과 같은 방식(제자리 회전 → 계단참 가로지르기 → 다시 회전)으로 수정
       (주석은 fpStairGo 참고) */
    {dur:0.5, yaw:(up?Math.PI:0),
     label: ko?'계단참에서 돌아섭니다':'Turning at the landing'},
    {to:{x:xTop, z:zBack},
     label: ko?'계단참을 가로지릅니다':'Crossing the landing'},
    {dur:0.4, yaw:-Math.PI/2, label:''},
    {to:{x:xFoot, z:zBack}, y:yZ, ease:'lin', stairs:FP_ST_N, slook:(up?1:-1),
     dur:FP_ST_N*0.28,
     label: ko?(lvName(lv2)+'으로 '+(up?'올라갑니다':'내려갑니다'))
              :((up?'Up to ':'Down to ')+lvName(lv2))},
    {dur:0.55, yaw:-Math.PI/2, label:''},
    {to:(lv2==='R' ? fpRoofEsSpot() : {x:0.65, z:stZ}), yaw:-Math.PI/2,
     label: ko?(lvName(lv2)+(lv2==='R'?'':' 복도')):(lvName(lv2)+(lv2==='R'?'':' corridor'))}
  ], function(){
    fpSetFloor(lv2);
    fpBusy=false; fpFaceYaw=-Math.PI/2; fpCap('');
    /* 옥상에 비상계단으로 도착하면 정확히 그 표시 위에 서게 되어 바닥을 눌러도
       '제자리라 이동 없음'으로 무시된다 → 도착하자마자 바로 위/아래 선택 패널을 띄운다. */
    if(lv2==='R' && typeof fpSelShow==='function') fpSelShow('es');
  });
}
/* ── 매 프레임 : 걸어가기 · 바라보기 · 안내 표시 ── */
function fpFreeTick(dt){
  /* 정지(fpPaused) 중에는 걷는 중이어도 그 자리에서 얼어붙는다 —
     계단 오르내리는 도중이 아니라 평범하게 걷다가도 멈추고 사진 찍을 수 있게.
     단, 시선(fpLookYaw/Pitch)은 계속 반영해야 화면을 드래그해서 둘러볼 수 있다.
     ※ 예전엔 여기서 fpCommit(fpYaw+fpLookYaw, ...)로 불러서, fpCommit 안에서
     "그 값 그대로 fpYaw에 즉시 대입"되는 바람에 매 프레임 fpLookYaw가 fpYaw에
     누적되어(2배, 3배…) 결국 드래그해도 화면이 안 움직이는 것처럼 보였다.
     fpYaw는 그대로 두고 그냥 fpYaw만 넘겨서, fpCommit 내부에서 fpLookYaw를
     한 번만 더해 카메라 각도를 계산하게 한다. */
  if(fpPaused){ fpCommit(fpYaw, 0, 0); return; }
  var want=fpYaw, bob=0;
  if(fpPath){
    fpPath.t += dt;
    var k=(fpPath.dur>0) ? Math.min(1, fpPath.t/fpPath.dur) : 1;
    var p=fpPathAt(easeIO(k)*fpPath.total);
    fpBob += Math.abs(p.x-fpPos.x)+Math.abs(p.z-fpPos.z);
    fpPos.x=p.x; fpPos.z=p.z;
    if(Math.abs(p.dx)+Math.abs(p.dz)>0.03) want=Math.atan2(p.dx, p.dz);
    bob=Math.sin(fpBob*1.9)*0.045;
    if(k>=1){
      var nd=fpPath.node;
      nd._lastDx=Math.abs(nd.x-fpPath.sx); nd._lastDz=Math.abs(nd.z-fpPath.sz);
      fpPath=null; fpArriveNode(nd);
    }
  }else if(fpFaceYaw!==null){ want=fpFaceYaw; }
  /* 지하 나가는 계단(exit1/exit2)에서는 정해진 연출 없이 자유롭게 걸어 다녀도
     실제로 계단을 밟은 만큼 눈높이가 저절로 따라오게, 매 프레임 위치 기준으로 다시 계산한다. */
  /* v122: 옥상 — 데크 계단·데크 위에 서 있으면 그 높이로(옥탑방은 옥상 바닥 fpSlabY('R') 기준) */
  if(fpFloorNow==='R' && fpRoofDeckGeo){
    fpPos.y = fpSlabY('R') + fpRoofDeckH(fpPos.x, fpPos.z);
  }
  if(fpFloorNow==='B1'){
    var __b1q=fpRoomAt(fpPos.x, fpPos.z);
    var __b1InExit=!!(__b1q && (__b1q.id==='exit1' || __b1q.id==='exit2'));
    if(__b1InExit) fpPos.y = fpB1ExitY(fpPos.x, fpPos.z);
    /* 버그 수정: 바로 앞 '크리에이티브 존' 자리에서 걸어 둔
       -0.16 아래쪽 시선이, 이 계단실로 잘게 걸어 들어오는 동안(스팟 이동은
       거의 항상 중간에 새 걸음으로 대체돼 도착 이벤트가 안 걸린다)
       그대로 남아 있어서 다른 층 복도를 걸을 때와 달리 화면이 계속
       아래로 기운 채 움직이는 것처럼 보였다 — 존 밖에서 이 계단실로 막
       "들어오는 그 순간"에 한 번만 수평으로 되돌린다(그 뒤로 사용자가
       손가락으로 둘러보는 것은 그대로 존중한다). */
    if(__b1InExit && !fpB1WasInExit) fpLookPitch=0;
    fpB1WasInExit=__b1InExit;
  }
  fpCommit(want, dt, bob);
  fpMarkersNear();
  fpCheckStairProximity();
  fpCheckB1EntryProximity();
  fpFreeHud();
}
/* 최종: 옥상 "내려가기" 버튼은 다른 층 계단과 완전히 같은
   표준 근접감지(fpCheckStairProximity, 아래)를 그대로 쓴다 — 문 나갔다
   들어오는 걸 별도로 감지하려던 여러 시도가 계속 어긋나서, 결국 검증된
   기존 방식(멀어졌다 다시 가까워지면 자동으로 뜬다)으로 통일했다. */
/* B1→1F로 계단을 오르면 도착하는 그 자리(후문 로비 한복판,
   fpStairGo의 arriveInHall이 쓰는 hallX/stZ와 정확히 같은 좌표)에
   실제로 서 있을 때만 "↓ B1" 패널을 보여준다 — 계단 선택 패널(fpSel)과
   똑같은 알약 버튼 스타일이지만, 완전히 별개의 패널(fpB1Panel)이고
   위치 근접으로만 뜬다. */
/* 버그 수정: ✕(닫기)를 눌러도 패널이 닫히지 않았다 — 닫기 버튼은
   'on' 클래스를 지우는데, 이 함수가 매 프레임 돌면서 반경 안에 서 있으면
   곧바로 다시 'on'을 붙여 버렸기 때문이다(누른 다음 프레임에 되살아나니
   버튼이 아예 안 먹는 것처럼 보인다).
   옥상 계단 패널(fpCheckStairProximity)이 쓰는 '재무장' 방식을 그대로 쓴다 —
   한 번 닫으면 그 자리에서는 다시 뜨지 않고, 충분히 멀어졌다 돌아와야 다시 뜬다. */
var fpB1EntryArmed=true;
function fpB1PanelClose(){
  var el=document.getElementById('fpB1Panel');
  if(el) el.classList.remove('on');
  fpB1EntryArmed=false;
}
function fpCheckB1EntryProximity(){
  var el=document.getElementById('fpB1Panel'); if(!el) return;
  if(fpFloorNow!==1){ el.classList.remove('on'); fpB1EntryArmed=true; return; }
  var hallX=FP_WALL_X+FP_ST_WD_B1F-0.6, hallZ=stZOf(1)*BUILDING_Z_STRETCH;
  var dx=hallX-fpPos.x, dz=hallZ-fpPos.z, d2=dx*dx+dz*dz;
  if(d2 < 4.0){
    if(fpB1EntryArmed) el.classList.add('on');
  }else{
    el.classList.remove('on');
    if(d2 > 9.0) fpB1EntryArmed=true;      // 충분히 멀어지면 다시 뜰 수 있게
  }
}
/* 옥상 계단(중앙·비상) 근처에 서면 엘리베이터처럼 자동으로 위/아래 선택창을 띄운다.
   한 번 닫은 뒤 그 자리에 계속 서 있어도 다시 뜨지 않다가, 멀어졌다 돌아오면
   다시 뜬다(무한 재등장 방지 겸 '다가가면 뜬다' 느낌은 유지).
   버그 수정: 트리거 반경이 1.5m로 너무 좁아서 정확한 위치에
   서야만 버튼이 뜨고, 살짝만 움직여도(폰 화면을 터치하려고 손가락을 떼는
   그 순간의 미세한 이동만으로도) 다시 멀어진 것으로 처리돼 버튼이 금방
   사라지는 것처럼 느껴졌다 — 뜨는 반경(1.5m→2.6m)과 다시 무장되는 반경
   (2.65m→4.2m)을 모두 넉넉하게 넓힌다. */
var fpNearStairArmed=true;
function fpCheckStairProximity(){
  if(fpFloorNow!=='R' || !fpNodes) return;
  var minD2=1e9, kind=null;
  for(var i=0;i<fpNodes.length;i++){
    var nd=fpNodes[i];
    if(nd.kind!=='st' && nd.kind!=='es') continue;
    var dx=nd.x-fpPos.x, dz=nd.z-fpPos.z, d2=dx*dx+dz*dz;
    if(d2<minD2){ minD2=d2; kind=nd.kind; }
  }
  if(kind===null) return;
  if(minD2 < 6.76){
    if(fpNearStairArmed){
      var sel=document.getElementById('fpSel');
      if(!(sel && sel.classList.contains('on'))) fpSelShow(kind);
      fpNearStairArmed=false;
    }
  }else if(minD2 > 17.64){
    fpNearStairArmed=true;
  }
}
/* 이동 표시가 층 전체에 깔려 있으면 화면이 난잡해진다
   → 지금 자리에서 가까운 것만 남기고 나머지는 숨긴다. */
function fpMarkersNear(){
  if(!fpNodeG) return;
  var kids=fpNodeG.children;
  for(var i=0;i<kids.length;i++){
    var nd=kids[i].userData.node; if(!nd) continue;
    var dx=nd.x-fpPos.x, dz=nd.z-fpPos.z, d2=dx*dx+dz*dz;
    kids[i].visible = (d2 < 132) && (d2 > 0.12);   // 약 11.5m 안쪽, 발밑은 제외
  }
}
/* 목적지 방향·거리 안내(자유롭게 다니다 길을 잃지 않도록) */
/* 목적지가 실제로 서야 할 자리(복도에서 그 방 문 앞).
   targetPos()는 방 한가운데(복도 밖 6m 안쪽) 좌표라, 그걸 그대로 쓰면
   화살표가 벽 안쪽을 가리키고 남은 거리도 실제보다 크게 나왔다. */
function fpTargetXZ(){
  if(!target) return null;
  var ST=BUILDING_Z_STRETCH, lv=target.floor, fx=FP_WALL_X-0.30;
  if(target.kind==='room'){
    var L=FLOOR_LAYOUT[lv], info=(L && L.lookup) ? L.lookup[target.code] : null;
    if(info) return {x:(info.x>0?1:-1)*fx, z:info.z*ST, door:true};
  }
  if(target.kind==='toilet'){
    var tl=FACILITIES.toilet;
    return {x:(tl.x>0?1:-1)*fx, z:fpToiletZ(lv), door:true};
  }
  if(target.kind==='emstair'){
    var es=EMSTAIR_POS[lv];
    if(es) return {x:(es.xWhole>0?1:-1)*fx, z:es.z*ST, door:true};
  }
  var p=targetPos();
  return {x:p.x, z:p.z*ST, door:false};
}
/* 그 이동 지점이 목적지인가 */
function fpIsTargetNode(nd){
  if(!target || !nd || target.floor!==fpFloorNow) return false;
  if(nd.kind==='door') return target.kind==='room' && nd.code===target.code;
  if(nd.kind==='wc')   return target.kind==='toilet';
  if(nd.kind==='es')   return target.kind==='emstair';
  return false;
}
function fpFreeHud(){
  var el=document.getElementById('fpGuide');
  if(!el) return;
  if(!target || fpBusy){ el.classList.remove('on'); return; }
  /* 목적지에 이미 도착한 뒤(personAnim.done)에는 안내 배너를 아예 숨긴다.
     예전에는 도착 판정 지점(문 앞)에서만 잠깐 '도착!'으로 바뀌고, 그 뒤
     크리에이티브 존처럼 넓은 실내를 더 걸어 들어가면 목적지(문) 좌표에서
     다시 멀어져 "29m" 같은 거리 배너가 되살아났다(도착 후엔 계속 숨김). */
  if(personAnim.done){ el.classList.remove('on'); return; }
  var ko=(LANG==='ko'), p=fpTargetXZ();
  if(!p){ el.classList.remove('on'); return; }
  var ang=0, txt, arrow='\u2191';
  if(target.floor!==fpFloorNow){
    var up=(lvIndex(target.floor)>lvIndex(fpFloorNow));
    ang = up ? 0 : 180;
    txt = targetLabel()+' · '+lvName(target.floor)
        + (ko ? (up?' — 위층':' — 아래층') : (up?' — upstairs':' — downstairs'));
  }else{
    var dx=p.x-fpPos.x, dz=p.z-fpPos.z;
    var d=Math.sqrt(dx*dx+dz*dz);
    if(d < 2.4){
      /* 바로 앞까지 왔으면 화살표 대신 '도착'을 보여 준다 */
      el.innerHTML='<i style="transform:none">\u2605</i><b>'
                 + targetLabel()+(ko?' · 도착!':' · arrived!')+'</b>';
      el.classList.add('on');
      return;
    }
    /* 화살표 방향 : 월드 방위 - 보는 방향.
       화면 회전(CSS rotate)은 시계방향이고 월드 각도는 반시계방향이라
       부호를 뒤집어야 한다. 예전엔 그냥 빼서, 왼쪽에 있는 방을
       오른쪽이라고 가리켰다. */
    var rel = Math.atan2(dx, dz) - (fpYaw + fpLookYaw);
    while(rel >  Math.PI) rel -= Math.PI*2;
    while(rel < -Math.PI) rel += Math.PI*2;
    ang = -rel*180/Math.PI;
    txt = targetLabel()+' · '+Math.max(1,Math.round(d))+'m';
  }
  el.innerHTML='<i style="transform:rotate('+ang.toFixed(0)+'deg)">'+arrow+'</i><b>'+txt+'</b>';
  el.classList.add('on');
}
/* ── 폰 조작용 : 제자리에서 뒤돌기 / 한 지점씩 앞·뒤로 ── */
/* ── 자유 탐색 확대/축소 : 시야각(FOV)을 줄이면 확대, 넓히면 축소 ── */
var fpZoom=1;
function fpZoomStep(d){
  if(!fpActive || !fpFree) return;
  fpZoom = Math.max(0.6, Math.min(2.4, fpZoom*(d>0 ? 1.25 : 0.8)));
}
function fpTurnAround(){
  if(!fpFree || fpBusy) return;
  var cur = fpYaw + fpLookYaw;
  fpYaw = cur; fpLookYaw = 0;
  var t = cur + Math.PI;
  while(t >  Math.PI) t -= Math.PI*2;
  while(t < -Math.PI) t += Math.PI*2;
  fpFaceYaw = t;
  fpPath = null;
}
/* dir=+1 앞으로, -1 뒤로 : 지금 보고 있는 방향에서 가장 가까운 이동 지점으로 한 칸 */
function fpStepMove(dir){
  if(!fpFree || fpBusy || !fpNodes.length) return;
  /* 계단/엘리베이터 선택 패널(#fpSel)이 떠 있는 동안에는 버튼으로
     한 걸음 움직이는 것만으로 패널이 조용히 사라지던 게 혼란스러웠다 —
     이제 패널이 열려 있으면 X(닫기)를 눌러야만 다시 움직일 수 있다.
     같은 이유로 지하 진입 패널(#fpB1Panel, "↓ B1")도 함께 막는다.
     (옥상 하강 안내도 이제 문을 나갔다 들어온 순간에만 뜨는 명확한
     결정 시점이라, 다른 패널과 동일하게 이동을 막는다.) */
  var __selEl=document.getElementById('fpSel');
  if(__selEl && __selEl.classList.contains('on')) return;
  var __b1El=document.getElementById('fpB1Panel');
  if(__b1El && __b1El.classList.contains('on')) return;
  var yaw = fpYaw + fpLookYaw + (dir<0 ? Math.PI : 0);
  var fx = Math.sin(yaw), fz = Math.cos(yaw);
  /* 1층 중앙계단 로비(lobby1)에서만 room을 최우선으로 본다 — 그렇지 않으면
     room 밖 먼 코리도 노드가 방향만 얼추 맞아도 그쪽으로 훌쩍 튀어버려서
     "시선 방향으로 자연스럽게 걷기"가 아니라 순간이동처럼 보인다.
     2~5층의 기존 open 존은 원래대로 노드 우선 동작을 그대로 유지한다
     (다른 층 로직은 건드리지 않는다). */
  /* 버튼 한 번에 이동하는 거리를 더 잘게 쪼갠다 — 예전엔 1.7m씩
     성큼 건너뛰거나, 정면 ±57도·7.5m 안의 "가장 가까운 노드"로 순간이동하듯
     튀어서 원하는 지점에 딱 멈추기 어려웠다. 이제는 훨씬 촘촘한 고정 보폭으로
     세밀하게 조금씩 움직이고, 노드로의 스냅도 아주 가까울 때(2m 이내)만
     허용해 지나치거나 못 미치는 느낌을 줄인다. */
  var hereQ=fpRoomAt(fpPos.x, fpPos.z);
  var FINE_STEP=0.55;
  if(hereQ && hereQ.id==='lobby1'){
    fpGoPoint(hereQ, fpPos.x+fx*FINE_STEP, fpPos.z+fz*FINE_STEP);
    return;
  }
  var best=null, bestD=1e9;
  for(var i=0;i<fpNodes.length;i++){
    var nd=fpNodes[i];
    /* 유리지붕 통로(zonecorr)는 다른 목적지로 가는 길에 우연히
       스쳐서 자동으로 걸어들어가지면 안 된다 — 지금 실제로 계단참(zoneland)에
       서 있을 때만 스냅 후보로 넣는다(그 외에는 완전히 무시). */
    if(nd.kind==='zonecorr'){
      var __P=fpB1ExitPts(), __land={x:__P.xA0, z:__P.zA1+0.5};
      if(Math.hypot(fpPos.x-__land.x, fpPos.z-__land.z) > 0.6) continue;
    }
    var dx=nd.x-fpPos.x, dz=nd.z-fpPos.z;
    var d=Math.sqrt(dx*dx+dz*dz);
    /* 버그 수정: zonecorr(맨 위 문)는 계단참에서 실제 거리가 2m를
       훌쩍 넘는다(계단+참 길이 때문에) — 위에서 이미 "계단참 근처에 서 있을
       때만" 후보로 넣게 막아 뒀으니, 이 노드에 한해서는 거리 제한을 넉넉하게
       풀어 준다. 안 그러면 2m 캡에 걸려 이 노드가 절대 선택되지 못해서,
       버튼으로는 계단을 오르는 애니메이션(높이 변화) 없이 잘게 밀리는 이동만
       되다가 계단 매스를 그대로 뚫고 지나가는 것처럼 보였다. */
    var distCap = (nd.kind==='zonecorr') ? 20.0
                : ((nd.kind==='roofout'||nd.kind==='roofin') ? 6.0 : 2.0);
    if(d<0.35 || d>distCap) continue;             // 아주 가까운 노드만 스냅 대상으로(세밀한 이동 유지)
    var dot=(dx*fx+dz*fz)/d;
    if(dot < 0.55) continue;                 // 대략 앞쪽 ±57도 안에 있는 지점만
    var score=d - dot*1.2;                   // 가깝고 정면일수록 우선
    if(fpIsTargetNode(nd)) score -= 3.0;     // 목적지는 한 칸 앞서 멈추게
    if(score<bestD){ bestD=score; best=nd; }
  }
  if(best){ fpGoTo(best); return; }
  /* 정면 가까이에 딱 맞는 노드가 없으면(코너 등) 노드로 튀지 말고 보는
     방향으로 잘게 한 걸음만 걷는다 — 로비 밖 복도 등 어디서든 동일하게 적용.
     계단실(exit1/exit2)도 이제 fpFreeTick에서 매 프레임 눈높이를
     다시 계산해 주므로, 다른 방과 똑같이 잘게 걷기를 그대로 허용한다. */
  var thereX=fpPos.x+fx*FINE_STEP, thereZ=fpPos.z+fz*FINE_STEP;
  var thereQ=fpRoomAt(thereX, thereZ);
  /* 버그 수정: exit1/exit2처럼 겹치는 두 방 사이 경계에서는
     "지금 서 있는 방(hereQ)"을 그대로 쓰면, 그 방의 여백(margin) 때문에
     실제로는 다음 방(exit2 등)으로 더 들어갈 수 있는데도 경계에서 멈춰버렸다
     (계단참에서 2구간 계단으로 넘어가지 못하고 딱 붙어 멈추는 버그의 원인).
     "가려는 곳(thereQ)"이 있으면 그 방 기준으로 여백을 계산해야, 다음 방으로
     자연스럽게 이어서 걸어 들어간다 — thereQ가 없을 때(벽에 막힌 경우)만
     hereQ로 되돌아가 제자리에 멈추게 한다. */
  if(hereQ || thereQ){
    fpGoPoint(thereQ||hereQ, thereX, thereZ);
    return;
  }
  fpCap((LANG==='ko') ? '그쪽으로는 더 갈 수 없어요' : 'Nothing that way');
}
/* ── 화면을 눌러 이동할 지점 고르기 ── */
function fpFreePick(clientX, clientY){
  if(!fpFree || fpBusy || !fpNodeG || !camera) return;
  /* 위와 같은 이유로, 바닥을 눌러 이동하는 것도 계단/엘리베이터
     선택 패널이나 지하 진입 패널이 열려 있는 동안에는 막는다 —
     X를 눌러야 움직일 수 있다. */
  var __selEl2=document.getElementById('fpSel');
  if(__selEl2 && __selEl2.classList.contains('on')) return;
  var __b1El2=document.getElementById('fpB1Panel');
  if(__b1El2 && __b1El2.classList.contains('on')) return;
  var cv=document.getElementById('c3d'), r=cv.getBoundingClientRect();
  var v=new THREE.Vector2(((clientX-r.left)/r.width)*2-1, -((clientY-r.top)/r.height)*2+1);
  var rc=new THREE.Raycaster(); rc.setFromCamera(v, camera);
  /* 지금 서 있는 곳이 넓게 트인 방이면, 지점 고리를 신경 쓰지 말고
     바닥에서 누른 그 자리로 곧장 걸어간다. */
  var here=fpRoomAt(fpPos.x, fpPos.z);
  /* 계단실(exit1/exit2)도 이제 fpFreeTick이 매 프레임 위치 기준으로
     눈높이(y)를 다시 계산해 주므로, 다른 넓게 트인 방과 똑같이 탭한 자리로
     곧장 걸어가는 지름길을 그대로 써도 계단 매스를 뚫지 않는다. */
  if(here){
    var pl0=new THREE.Plane(new THREE.Vector3(0,1,0), -(fpSlabY(fpFloorNow)+0.07));
    var pt0=new THREE.Vector3();
    if(rc.ray.intersectPlane(pl0, pt0)){
      var there=fpRoomAt(pt0.x, pt0.z);
      if(there===here){ fpGoPoint(here, pt0.x, pt0.z); return; }
    }
  }
  /* 이동 지점 표시를 안 보이게 한 뒤로는 고리를 직접 맞힐 이유가 없다
     → 항상 바닥을 누른 지점 기준으로 가장 가까운 자리를 고른다. */
  /* 표시를 정확히 못 맞혔어도, 바닥에서 가장 가까운 지점으로 보내 준다
     (폰에서는 손가락이 두꺼워 작은 고리를 정확히 누르기 어렵다) */
  var pl=new THREE.Plane(new THREE.Vector3(0,1,0), -(fpSlabY(fpFloorNow)+0.07));
  var pt=new THREE.Vector3();
  if(!rc.ray.intersectPlane(pl, pt)) return;
  var best=null, bd=1e9, bReal=1e9;
  fpNodes.forEach(function(nd){
    /* 유리지붕 통로는 화면을 눌러 이동할 때도, 지금 계단참에
       서 있을 때만 후보로 넣는다(다른 곳 이동 중 우연히 딸려 들어가지 않게). */
    if(nd.kind==='zonecorr'){
      var __P=fpB1ExitPts(), __land={x:__P.xA0, z:__P.zA1+0.5};
      if(Math.hypot(fpPos.x-__land.x, fpPos.z-__land.z) > 0.6) return;
    }
    var d=Math.pow(nd.x-pt.x,2)+Math.pow(nd.z-pt.z,2), w=d;
    /* 목적지 문 앞 자리는 우선해서 잡아 준다
       (복도 지점이 바로 옆에 있어 목적지를 눈앞에 두고도 못 서는 일이 있었다) */
    if(fpIsTargetNode(nd)) w = d*0.25;
    if(w<bd){ bd=w; bReal=d; best=nd; }
  });
  if(best && (bReal < 42 || best.kind==='zonecorr')) fpGoTo(best);   // 동그라미가 안 보이므로 누른 자리 근처를 넣덒하게 잡는다
  // 버그 수정: zonecorr(맨 위 문)는 계단참에서 실제 거리가 6~7m
  // 이상이라 42(≈6.5m) 캡에 걸려 탭으로도 선택되지 못했다 — 이미 위에서
  // "계단참 근처에 서 있을 때만" 후보로 걸러 뒀으니 거리 캡은 면제한다.
}
/* ── 모드 켜기/끄기 ── */
function fpStartFree(){
  if(!camera || !personG) return;
  if(fpActive) fpEnd(false, true);
  if(!fpCab){ fpCab=fpMakeCab(); scene.add(fpCab); }
  if(!fpCeil){ fpCeil=fpMakeCeil(); scene.add(fpCeil); }
  fpFree=true; fpSeq=false; fpSeqDone=null; fpBusy=false; fpPath=null; fpFaceYaw=null;
  fpB1WasInExit=false;   // 버그 수정: 새로 자유 탐색을 시작할 때는 항상 '아직 계단실 밖'으로 본다
  fpFloorNow=startFloor;
  fpZoom=1;
  var ev=evXZ(fpFloorNow), evzW=ev.z*BUILDING_Z_STRETCH;
  var frontX=ev.x-fpEvW(fpFloorNow)/2;
  fpCabPos={x:frontX-0.13+FP_CAB_D/2, z:evzW};
  fpDoorK=0;
  /* v143: 직접 걸어보기도 QR로 고른 문(정문·후문·동문·서문)에서 출발한다.
     좌표는 경로 미리보기와 같은 fpGateStart1F() 한 곳에서 가져와 두 모드를 맞춘다. */
  if(fpFloorNow===1){ var gs1=fpGateStart1F(); fpPos={x:gs1.x, y:fpSlabY(1), z:gs1.z}; fpYaw=gs1.yaw; }
  else { fpPos={x:0, y:fpSlabY(fpFloorNow), z:evzW}; fpYaw=Math.PI/2; }
  fpSetFloor(fpFloorNow);
  /* v145: 직접 걸어보기에도 경로 미리보기와 같은 바닥 빨간 유도선을 켠다.
     (예전에는 화면 위 방향 배지만으로 안내하려고 일부러 껐었다)
     출발층과 목적층이 같을 때 선을 숨기는 규칙은 미리보기와 동일하게 맞춘다 —
     같은 층이면 엘리베이터에서 뻗어 나온 선이 오히려 헷갈린다. */
  var sameFlF = !!(target && target.floor===fpFloorNow);
  fpRouteFloor(!sameFlF);
  if(typeof routeA!=='undefined' && routeA) routeA.visible=false;
  fpCab.visible=(fpFloorNow!=='R'); fpSetXray(false);
  var lg=document.getElementById('legend3d'); if(lg) lg.style.display='none';
  fpActive=true; fpLabel='';
  personG.visible=false;
  personAnim.playing=false; personAnim.done=false;
  fpLookYaw=0; fpLookPitch=0; fpBob=0;
  spinPause(); resetChaseCam();
  fpFreeTick(0);
  var ctl=document.getElementById('fpCtl'); if(ctl) ctl.classList.add('on');
  fpCap((LANG==='ko') ? '▲ 앞으로 · ↺ 뒤돌기 · 바닥을 눌러 이동'
                      : '▲ forward · ↺ turn around · or tap the floor');
  syncTripBtn();
}
function fpEndFree(){
  fpSelHide('fpEndFree'); fpClearNodeG();
  var ctl0=document.getElementById('fpCtl'); if(ctl0) ctl0.classList.remove('on');
  fpPaused=false;
  fpFree=false; fpSeq=false; fpSeqDone=null; fpBusy=false; fpPath=null; fpFaceYaw=null;
  var el=document.getElementById('fpGuide'); if(el) el.classList.remove('on');
  fpEnd(false, false);
}
function toggleFree(){
  if(fpFree) fpEndFree();
  else       fpStartFree();
}

/* 재생 중 화면을 끌면 로드뷰처럼 제자리에서 고개만 돌린다(경로 자체는 그대로 진행) */
function fpLook(dx, dy){
  if(fpFree){
    /* 자유 탐색은 제자리에서 뒤까지 돌아볼 수 있어야 하므로 좌우 제한을 두지 않는다
       (자동재생은 경로를 따라가는 연출이라 예전처럼 좌우 ±66도로 묶어 둔다) */
    fpLookYaw = fpLookYaw - dx*0.006;
    if(fpLookYaw >  Math.PI) fpLookYaw -= Math.PI*2;
    if(fpLookYaw < -Math.PI) fpLookYaw += Math.PI*2;
    fpLookPitch = fpClamp(fpLookPitch - dy*0.004, -0.62, 0.62);
    return;
  }
  fpLookYaw   = fpClamp(fpLookYaw   - dx*0.005, -FP_LOOK_Y, FP_LOOK_Y);
  fpLookPitch = fpClamp(fpLookPitch - dy*0.004, -FP_LOOK_P, FP_LOOK_P);
}
