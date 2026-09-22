"use strict";
/* roadview-stairs.js — 1인칭 로드뷰 — 계단실
   (예전 한 파일 main.js 의 5793~6712줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
function fpRoofDeckH(x, z){
  var G=fpRoofDeckGeo; if(!G) return 0;
  if(z>=G.z0 && z<=G.z1 && x>=G.x0 && x<=G.x1){          // 계단 위: 첫 단~꼭대기 사이 비례
    var t=Math.max(0, Math.min(1, (x-G.x0)/(G.x1-G.x0)));
    return G.fy + (G.y-G.fy)*t;
  }
  if(x>G.x1 && x<=G.x2 && z>=G.z0-0.02) return G.y;       // 데크 위(계단 폭~벽 쪽)
  return 0;
}
/* 요청 반영(버그 수정): B1↔1F 한 도막 계단(straightUp)은 반 층이 아니라 전체 층
   높이(SP)를 오르는데, 이전에 20단으로만 늘렸더니 단 하나 높이(rise=SP/20)가
   다른 층의 반 층 계단(rise=HALF/14=SP/28)보다 여전히 높아서 계단이 유난히
   가파르게 느껴지고, 걷는 모션과도 안 맞아 보였다 — 다른 층과 정확히 같은
   단 높이가 되도록 단 수를 정확히 2배(28단)로 늘린다(총 길이는 그대로 유지). */
var FP_ST_N_UP = FP_ST_N*2;
/* 요청 반영: B1↔1F 한 도막 직선 계단은 한 층 전체(SP=6.6m)를 다른 층의 반 층짜리
   계단과 똑같은 길이(3.43m) 안에서 올라가서 62도로 지나치게 가팔랐다(실사진은
   훨씬 완만하다). 계단실 깊이(FP_ST_WD_B1F=8.37m) 안에서 쓸 수 있는 만큼 길이를
   늘려 경사를 완만하게 편다 — 계단 꼭대기가 x≈9.0에 오므로 후문 로비(x≈10.5)와
   사람이 서는 자리(x≈9.87)는 그대로 남는다.
   그리기(fpMakeStairwell)·걷기(fpStairGo)·1층 바닥 개구부가 모두 이 값 하나를
   공유하도록 여기 한 곳에만 둔다. */
var FP_B1F_RUN_MUL = 1.68;
var FP_B1F_RUN_LEN = FP_ST_N*FP_ST_RUN*FP_B1F_RUN_MUL;
function fpMakeStairwell(lv, zc, ko, em, roofH, owMul){
  var g=new THREE.Group();
  var idx=lvIndex(lv), upLv=LEVELS[idx+1], dnLv=LEVELS[idx-1];
  /* B1↔1F 구간은 실사진(1번·4번 사진)처럼 계단 앞뒤로 여유 있는 로비 공간이
     있다 — 다른 층과 같은 계단실 깊이(FP_ST_WD)로는 문·유리창 쪽이 비좁아
     보인다(요청 반영). 이 구간(B1의 오르는 쪽, 1F의 후문 로비 쪽) 양쪽 모두
     같은 폭을 써야 겹침 없이 맞물리므로, 두 그룹 모두에서 이 조건으로
     동일하게 넓힌다. */
  var pairB1F = (!em && ((lv==='B1' && upLv===1) || (lv===1 && dnLv==='B1')));
  var x0=FP_WALL_X, WD=pairB1F ? FP_ST_WD_B1F : FP_ST_WD;                 // 계단실 깊이
  /* 1층 중앙계단은 폭을 1.4배 넓혔는데(요청 반영), 이 계단은 물리적으로
     '1층 쪽 절반'과 '2층/지하1층 쪽 절반'을 각 층이 따로 그린다(걷기 연출 중엔
     두 층이 동시에 렌더링됨). 1층 쪽만 넓히고 반대쪽(2층의 '내려가는 쪽',
     지하1층의 '올라가는 쪽')을 그대로 두면 폭이 안 맞아 겹쳐 보이는 버그가
     생긴다 — 1층과 맞닿는 쪽은 어느 층이 그리든 항상 같은 폭을 쓰게 한다. */
  var owAuto = (!em && (lv===1 || upLv===1 || dnLv===1)) ? 1.4 : 1;
  var OW = (em ? FP_EM_OW : FP_ST_OW) * (owMul!==undefined ? owMul : owAuto);   // 비상계단은 중앙계단보다 좁다(사진 반영).
  var HALF=SP/2;                             // 반 층(중간 계단참까지) 높이
  /* 비상계단은 지하만 제외하고 잇는다(옥상까지도 수직으로 뚫려 있다 — 지하는 여전히 중앙계단 전용) */
  if(em){ if(lv===1) dnLv=null; }
  /* 1층 중앙계단 홀 : 실사진(후문·SW간판·타일벽) 반영 장식은 전부 이 플래그로
     분기해 fpMake1FStairHall(독립 함수)에 맡긴다 — 2~5층·옥상·비상계단의
     공통 구조는 이 플래그가 false라 단 한 줄도 달라지지 않는다. */
  var lobby1F = (!em && lv===1 && dnLv==='B1');
  /* B1↔1F 구간은 실제로 계단참 U턴 없이 한 방향으로 쭉 이어지는 단일 계단이다
     (사진 반영, 요청 반영). 이 계단실 매스는 B1 쪽 그룹(lv==='B1', upLv===1)이
     전담해서 짓는데, 기존 '반 층씩 두 도막'과 달리 한 도막으로 전체 한 층
     높이(SP)를 오르므로, 단 개수(N, X방향 길이)는 그대로 두고 단 하나의
     높이(rise)만 두 배로 잡는다 — 계단실 폭(X)을 넘어서지 않으면서도 실제
     사진처럼 꺾이지 않는 한 도막 계단이 된다. */
  var straightUp = (!em && lv==='B1' && upLv===1);
  /* 사용자 요청: 이 중앙계단에서 지하로 내려가는 하행 단은 실제 위치가 아니라고
     확인됨(후문 쪽 실제 지하 입구는 나중에 별도 반영 예정) — 1층 중앙계단에서는
     하행 계단을 짓지 않고, 그 자리를 걸어다닐 수 있는 평평한 바닥으로 되돌린다.
     dnLv 자체는 다른 로직(화장실 간격 등)에 계속 쓰이므로 건드리지 않고,
     "실제로 하행 단을 그릴지" 여부만 별도 플래그로 분리한다. */
  var showDown = dnLv && !lobby1F;
  /* 옥상은 위로 더 올라갈 층이 없고, 지하 1층은 아래로 더 내려갈 층이 없으므로
     계단실 통로를 그쪽 바닥 높이에서 잘라 뚫려 보이지 않게 한다.
     단, 옥상(lv==='R')은 이 계단실이 옥탑방(headhouse) 실내 한복판에 뚫린
     개구부이기도 하다 — 옆벽을 문턱 높이(0.05)에서 끊어버리면 사람 눈높이부터
     위로는 벽이 아예 없어서 옆으로 야외 하늘·산이 훤히 보이는 문제가 있었다.
     옥탑방 천장 높이(roofH)까지 옆벽을 그대로 올려 실내처럼 완전히 막는다. */
  var yB=dnLv ? (-HALF-0.45) : -0.05,
      yT=upLv ? ((straightUp?SP:HALF)+0.45) : (lv==='R' ? (roofH||2.9) : 0.05), WH=yT-yB;
  var hw=OW/2+0.03;
  var LAND=FP_ST_LAND;
  /* 실제 사진 기준 마감 : 중앙계단 = 베이지 석재 타일 벽, 비상계단 = 크림색 페인트 벽.
     단 옥상(lv==='R')은 예외 — 중앙계단 옥탑방은 roofOpen 분기에서 별도의
     중간 톤(0xADA79A류)을 쓰는데, 비상계단은 그 톤다운 없이 평소 크림색을
     그대로 써서 유난히 밝아 보였다(요청 반영: 옥상에서만 중앙계단과 비슷한
     중간 톤으로 낮춘다 — 다른 층의 크림색 마감은 그대로 둔다). */
  /* v124(요청 반영): 비상계단 옥상 그룹만 다른 회색빛(0xB2AC9C)을 쓰고 있어, 5층 그룹 벽과
     같은 평면에 겹치는 계단참 주변(±0.45m)에서 두 색이 z-파이팅으로 번갈아 보이며 띠가 생겼다.
     옥상도 다른 층 비상계단과 같은 색으로 통일한다(같은 색끼리 겹치면 띠가 안 보인다). */
  var cWall = em ? 0xEFEBE2 : 0xC9C0AE;
  var eWall = 0x39352B;
  /* 1층↔지하 구간만 실제로는 다른 층들의 '반 층+180도 꺾기' 구조가 아니라,
     FP_BD_LANDING_N단만 내려간 얕은 참에서 후문이 갈라지고, 나머지는 꺾지 않고
     한 번에 쭉 내려가는 구조다(사진 반영). 후문 자체는 fpMakeBackDoorBranch
     (위쪽, 완전히 분리된 모듈)가 전담한다 — 여기서는 그 통로가 뚫고 나가는
     자리에 구멍만 남겨 둔다. */
  /* straightUp 구간은 단 수를 FP_ST_N_UP으로 늘리되, 총 계단 길이(N*run)는
     기존(FP_ST_N*FP_ST_RUN)과 똑같이 맞춰서 계단실 벽·바닥 개구부·1층 로비
     경계 등 이 길이에 기대어 계산되는 다른 모든 좌표가 그대로 맞는다. */
  var N = straightUp ? FP_ST_N_UP : ((lv==='R' && !em) ? FP_ST_N_R : FP_ST_N);   // v109: 옥상 도막만 10단
  var run = straightUp ? FP_B1F_RUN_LEN/FP_ST_N_UP : FP_ST_RUN;
  var rise=(straightUp?SP:HALF)/N, fw=OW/2-0.10;
  /* 요청 반영(구조 정정) : 사용자가 실제 건물 기준을 다시 확인해 주었다 —
     2~5층에서 계단실을 바라보면 "오른쪽(+Z)이 위층으로 올라가는 계단,
     왼쪽(-Z)이 아래층으로 내려가는 계단"이고, 옥상에서도 철문을 바라볼 때
     내려가는 계단이 오른쪽(-Z)에 온다(같은 규칙의 결과다).
     예전에는 "1층 상행 계단이 B1↔1F 직선 계단과 같은 열에 포개진다"는 것을
     버그로 보고 중앙계단 전체를 반대 열로 맞바꿔 뒀는데(_colFlip=-1),
     실제 건물이 바로 그 구조였다 — 지하로 내려가는 계단이 그대로 있고 그
     바로 위에 2층으로 올라가는 계단이 겹쳐 얹혀 있다(사진으로 확인).
     → 맞바꿈을 되돌려 상행을 +Z열로 되돌린다. B1↔1F 직선 계단(straightUp)과
       비상계단(em)은 원래 +Z열이라 그대로고, 결과적으로 1층 상행 계단과
       지하 계단이 같은 열에 놓여 실제 구조와 일치하게 된다.
     ※ 걷기 경로(fpStairGo의 zSide/zBack)와 옥상 개구부·스킵플로어 좌표도
       같은 기준으로 함께 되돌렸다. */
  var _colFlip = 1;
  var xs=x0+LAND+((lv==='R' && !em)?FP_R_XSHIFT:0), zUp=zc+_colFlip*(OW/4+0.02), zDn=zc-_colFlip*(OW/4+0.02);   // v109: 옥상 도막은 첫 단을 안쪽으로 밀어 꼭대기(xs+N*run)가 5층 계단참과 그대로 만나게
  var flTex=fpTerrazzoTex().clone(); flTex.needsUpdate=true;
  flTex.wrapS=flTex.wrapT=THREE.RepeatWrapping;
  /* 요청 반영(버그 수정): 이 계단실 문턱 바닥은 지금까지 공용 텍스처
     객체를 복제 없이 그대로 썼고 repeat도 지정하지 않아(기본 1x1) 무늬가
     늘어난 채로 뿌옇게 한 장만 깔려 보였다 — 로비 바닥(landFl)과 같은
     축척(0.6m 단위)으로 반복시켜 나머지 바닥과 동일하게 보이게 한다. */
  flTex.repeat.set(Math.max(1,Math.round(LAND/0.6)), Math.max(1,Math.round((hw*2)/0.6)));
  /* 요청 반영(버그 수정): fpMkTex는 오버레이용(depthWrite:false)이라, 이
     계단실 문턱 바닥처럼 실제 "바닥 그 자체"로 쓰면 아래쪽 계단 매스가
     비쳐 보이는 반투명한 것처럼 보였다(전 층 공통) — 불투명한
     fpMkFloorGloss로 바꿔 다른 복도 바닥처럼 확실히 막히게 한다. */
  var fl=fpMkFloorGloss(LAND,hw*2, flTex); fl.rotation.x=-Math.PI/2;
  fl.position.set(x0+LAND/2,0.01,zc); g.add(fl);
  if(!em){          // 중앙계단 문턱의 노란 점자블록 — 다른 층은 문턱 폭(0.42m)만,
    // 옥상은 "계단 앞 덩그러니 놓인 패드"로 보이지 않도록 계단 입구까지 이어지는
    // 긴 띠(요청 반영)로 늘린다.
    if(lobby1F){
      /* 1층 : 밋밋한 노란 판 대신 실제 돌기(도트)가 그려진 점자 유도블록으로.
         하행 계단 쪽(zDn)은 더 이상 계단이 아니라 걸을 수 있는 일반 바닥이라
         유도블록을 두지 않는다(요청 반영) — 문턱을 가로지르는 유도 띠만 남긴다. */
      var tt2=fpTactileTex().clone(); tt2.needsUpdate=true;
      tt2.repeat.set(2, Math.max(2,Math.round((hw*2-0.2)/0.30)));
      var tp2=fpMkTex(0.44, hw*2-0.2, tt2, 1);
      tp2.rotation.x=-Math.PI/2; tp2.position.set(x0+0.22, 0.021, zc); g.add(tp2);
    }else{
      var tacLen = (lv==='R') ? 0.55 : 0.42;
      var tac=fpMkPlane(tacLen,1.30,0xDDB63E,1); tac.rotation.x=-Math.PI/2;
      tac.position.set(x0+tacLen/2-0.03,0.022,zc); g.add(tac);
    }
  }
  /* 1층→지하 후문 곁가지 : 직접 렌더링해서 확인해 보니, 이 구멍-옆 벽 조각이
     후문 통로(fpMakeBackDoorBranch, 완전히 다른 좌표 기준)와 자리가 안 맞아
     허공에 뜬 것처럼 겹쳐 보이는 게 확인됐다(요청 반영: 원상복구). 벽 구멍을
     다시 없애 매끈한 통짜 벽으로 되돌린다. */
  var lowBrHole = null;
  /* 옥상은 이 계단실이 넓은 옥탑방(headhouse) 한복판에 뚫린 개구부라, 계단실 자체의
     옆벽·뒷벽·천장을 세우면 넓힌 방 안에 폭 6m짜리 좁은 굴이 하나 더 생기는 꼴이었다
     (레퍼런스 사진은 계단 옆이 트인 넓은 참이다). 게다가 뒷벽(x=계단실 끝)이 바로 뒤의
     복층 슬래브·목재 캐비닛·초록 창문을 정확히 가려서, 문 앞에서 봤을 때 그것들이
     전혀 안 보이는 원인이었다. 옥상에서는 옥탑방 벽이 사방을 감싸 주므로 계단실
     자체 벽은 생략하고 계단·난간만 남긴다.
     단 비상계단은 예외 : 계단실 깊이(6.2m)가 그 옥탑방(3.55m)보다 2.9m나 길어서
     방 밖으로 삐져나와 있다 — 자체 벽을 없애면 그 삐져나온 부분이 그대로 하늘로
     뚫려 야외가 보인다. 그래서 비상계단은 예전처럼 자체 벽을 그대로 세운다. */
  var roofOpen = (lv==='R' && !em);
  var ROOF_WALL_IN = 0.006;   // v114: 옥탑방 벽이 zc-hw-0.02로 왔으므로 6mm만(5층 옆벽과 같은 면에 두면 z-파이팅)   // v101: 옥상 중앙계단 -Z 옆벽을 옥탑방 벽면(mainCZ0)까지 물리는 양. v105: 0.155→0.165 — 벽이 바닥 개구부 가장자리(mainCZ0)보다 5mm 안쪽에 있어 그 틈으로 옥상 초록 바닥이 실선(띠)으로 비쳤다. 개구부 가장자리 5mm 바깥으로 보낸다
  /* v104(요청 반영): 옥상 내려가는 계단과 -Z 벽 사이에 남아 있던 약 19cm 틈(그 틈으로
     아래 바닥 띠가 비쳐 보였다)을 없앤다 — 계단을 벽 쪽으로만 넓혀 벽에 2cm까지 붙인다.
     +Z 쪽 가장자리(zDn+fw/2, 난간·stairRail 기준)는 그대로라 반대쪽은 변화 없음. */
  if(roofOpen){
    var _wg=(zDn-fw/2)-(zc-hw-ROOF_WALL_IN)-0.005;   // v105: 벽에 완전히 붙인다(2cm→0.5cm)
    if(_wg>0){ zDn-=_wg/2; fw+=_wg; }
  }
  [-1,1].forEach(function(sn){
    if(roofOpen){
      /* 개구부 아래쪽 : 예전엔 "그늘져 보이라고" 어두운 톤(0x5C574F)으로 막았는데,
         실제로는 개구부 전체가 새까만 구덩이(pit)로만 읽혀서 레퍼런스 사진
         (내려가는 계단·계단참·밝은 벽이 훤히 내려다보이는 계단실)과 정반대였다
         — 실내 계단실 벽처럼 밝은 크림색 + 은은한 자체발광으로 바꾸고,
         아래쪽 uwLite 광원과 함께 내려가는 단이 실제로 보이게 한다. */
      var dH=-yB;
      /* 스킵플로어와 맞닿는 쪽(+Z, sn=1)은 이제 간격이 0.06m로 거의 붙어 있어
         이 벽·난간이 스킵플로어 계단 바로 앞을 가로막는 것처럼 보였다(요청
         반영: 그쪽은 큰 벽 대신, 계단참을 돌 때만 걸리는 낮은 배경판을
         무릎 높이까지만 세워 배경(하늘·산)이 갈라져 보이는 것만 가리고,
         그 위쪽은 스킵플로어 계단이 계속 보이게 비워 둔다). */
      if(sn>0){
        /* 요청 반영(버그 수정, 근본 원인): 무릎 높이(1.05m)까지만 막고 그
           위는 스킵플로어가 보이도록 비워 뒀는데, 계단을 오르내리는 사람의
           눈높이(약 1.5~1.7m)는 이미 그 위 — 게다가 계단참에서 반대쪽
           단으로 돌아서는 자리가 바로 이 벽 코앞이라, 넓은 화각으로 잠깐만
           둘러봐도 이 낮은 벽 위로 옥상 바깥 하늘·산이 그대로 보였다
           ("프레임이 깨진다"의 정체). 스킵플로어를 살짝 보여주는 것보다
           이 틈을 막는 쪽이 더 중요하므로, 눈높이 위까지 완전히 막힌
           벽으로 바꾸고(높이 dH로), 폭도 넉넉히 늘려 가까운 거리·넓은
           화각의 스침 각도에서도 항상 벽 안에 들어오게 한다. */
        var lw=fpMkPlane(WD+8.0, dH, cWall, 1, eWall);   // v102: 옥상 개구부 벽도 다른 층 계단실과 같은 벽지색
        lw.rotation.y=Math.PI;
        lw.position.set(x0+WD/2, yB+dH/2, zc+sn*hw); g.add(lw);
        return;
      }
      if(dH>0.05){
        /* v101: 옥탑방 -Z 벽(fpMakeRoof의 mainCZ0 = 개구부-0.12)이 이 계단실 옆벽(zc-hw)
           보다 0.155m 바깥에 있어, 바닥 개구부를 옥탑방 벽면까지 뚫은 뒤에는 그 사이
           16cm 틈으로 아래가 내려다보였다 — 옥상 중앙계단의 -Z 옆벽은 옥탑방 벽면에
           맞춰 바깥으로 물린다(ROOF_WALL_IN, 아래 계단참 철문도 같은 값을 쓴다). */
        var dwZ = zc+sn*hw - ((sn<0 && !em) ? ROOF_WALL_IN : 0);
        /* v103: 옥탑방 실내 벽(fpMkWallLit, 회벽 텍스처 + 조명 반응)과 같은 재질로 지어
           바닥 높이(y=0)에서 재질·톤이 바뀌는 수평 이음선을 없앤다 — 위·아래가 한 벽으로 읽힌다. */
        /* v105: 벽 쪽(-Z)은 옥상 바닥 높이보다 10cm 더 올려 세운다 — 옥탑방 안쪽 벽의 걸레받이
           몰딩·초록 옥상 바닥·바닥 절단면이 이 벽과 거의 같은 평면(±1cm)에 겹쳐 있어, 위에서
           내려다보면 접합선이 얇은 띠로 비쳤다. 같은 재질의 이 벽이 그 구간을 덮어 가린다. */
        var dwH = dH + ((sn<0 && !em) ? 0.10 : 0);
        var dw=fpMkWallFlat(WD,dwH,cWall, x0+WD/2, yB+dwH/2, dwZ, (sn<0)?0:Math.PI); g.add(dw);   // v126: 5층 벽과 같은 재질
      }
      /* 레퍼런스 사진처럼 개구부 가장자리를 은색 스테인리스 파이프 난간으로 감싼다
         (바닥 위, 양쪽 긴 변 — 문 쪽 짧은 변은 계단 진입로라 비워 둔다).
         fpMkPipe(0.9/0.1)는 SwiftShader에서 하얗게 뭉개지므로 스테인리스 스펙
         (metalness 0.85/roughness 0.2)인 fpMkPipeRail로 통일한다. */
      /* 요청 반영: 이 난간이 계단실 깊이(WD) 전체에 걸쳐 있어서, 철문에서
         들어서는 문턱 구간(x0~x0+LAND)까지 뻗어 나왔다 — 그 구간은 바닥이
         멀쩡히 막혀 있는 자리라, 아무것도 없는 바닥 위에 난간만 서 있는
         것처럼 보였다. 실제로 구멍이 뚫린 구간(첫 단부터, x=xs)부터만 세운다. */
      /* 요청 반영(삭제): 옥상 개구부 둘레의 스테인리스 파이프 난간을 없앤다.
         (직전에는 문턱 구간까지 뻗어 나온 부분만 잘라 냈지만, 난간 자체를
         빼 달라는 요청 — 계단을 따라가는 flight() 난간은 그대로 남는다) */
      return;
    }
    if(sn<0 && lowBrHole){
      var hx0=lowBrHole.x0, hx1=lowBrHole.x1;
      if(hx0>x0+0.05){
        var swA=fpMkPlane(hx0-x0,WH,cWall,1,eWall); swA.rotation.y=0;
        swA.position.set(x0+(hx0-x0)/2,(yT+yB)/2,zc+sn*hw); g.add(swA);
      }
      if(x0+WD>hx1){
        var swB=fpMkPlane((x0+WD)-hx1,WH,cWall,1,eWall); swB.rotation.y=0;
        swB.position.set(hx1+((x0+WD)-hx1)/2,(yT+yB)/2,zc+sn*hw); g.add(swB);
      }
      var swT=fpMkPlane(hx1-hx0,yT-lowBrHole.y1,cWall,1,eWall); swT.rotation.y=0;
      swT.position.set((hx0+hx1)/2,(lowBrHole.y1+yT)/2,zc+sn*hw); g.add(swT);
      if(lowBrHole.y0>yB){
        var swBt=fpMkPlane(hx1-hx0,lowBrHole.y0-yB,cWall,1,eWall); swBt.rotation.y=0;
        swBt.position.set((hx0+hx1)/2,(yB+lowBrHole.y0)/2,zc+sn*hw); g.add(swBt);
      }
      return;
    }
    var sw=fpMkPlane(WD,WH,cWall,1,eWall);
    sw.rotation.y=(sn<0)?0:Math.PI; sw.position.set(x0+WD/2,(yT+yB)/2,zc+sn*hw); g.add(sw);
    if(!em && !(lobby1F && sn<0)){   // 중앙계단 벽의 큰 석재 타일 줄눈
      // (1층 좌측(-Z) 벽은 fpMake1FStairHall의 대형 사각 타일 패널이 덮으므로,
      //  베이지 줄눈이 그 위에 떠 보이지 않게 그 벽에서만 생략한다)
      for(var jj=1; jj<5; jj++){
        var jl=fpMkPlane(WD-0.1,0.016,0xA79E8C,0.8);
        jl.rotation.y=(sn<0)?0:Math.PI;
        jl.position.set(x0+WD/2, yB+WH*jj/5, zc+sn*(hw-0.012)); g.add(jl);
      }
    }
    // 벽 밑둥의 빨간 안전선(사진 반영) — 중앙·비상계단 모두
    {
      var rkb=fpMkPlane(WD-0.06,0.05,0xC0342B,1);
      rkb.rotation.y=(sn<0)?0:Math.PI;
      rkb.position.set(x0+WD/2, yB+0.028, zc+sn*(hw-0.01)); g.add(rkb);
    }
  });
  /* 1층 중앙계단 홀 : 실사진 반영 장식 일체(타일벽·포스터·소화전함·천장걸이
     SW간판·유리 후문·바깥 풍경·주광)를 독립 함수 fpMake1FStairHall에 맡긴다.
     예전의 "왼쪽 벽에 붙인 간판" 방식은 사진(통로 상단에 매달린 대형 검은
     패널)과 달라서 이 함수로 통째 대체했다. 계단 본체 좌표(zUp/zDn/xs 등,
     fpStairGo 걷기 경로가 공유)는 일절 손대지 않는다. */
  if(lobby1F){
    fpMake1FStairHall(g, {x0:x0, WD:WD, LAND:LAND, hw:hw, zc:zc,
                          yB:yB, yT:yT, cWall:cWall, eWall:eWall, ko:ko,
                          zUp:zUp, zDn:zDn, fw:fw, xs:xs, N:N, run:run, rise:rise});
  }
  if(!roofOpen){
    if(!lobby1F){   // 1층 중앙계단은 fpMake1FStairHall이 유리 후문이 뚫린 뒷벽을 대신 세운다
      /* 요청 반영(버그 수정): 옥상 계단참 벽과 똑같은 원인 — 이 벽도 실사용
         폭(hw*2)만큼만 있어서, 계단을 오르내리며 이 벽에 가까이 붙어 넓은
         화각으로 옆을 볼 때 벽 가장자리 밖(옥상이라면 하늘·산, 다른 층이라면
         빈 공간)이 보일 수 있다 — 폭을 넉넉히 늘려 어느 층에서든 이런 스침
         각도에서도 항상 벽 안에 들어오게 한다. */
      /* 요청 반영(버그 수정): 이 뒷벽은 스침 각도에서 벽 밖이 보이지 않도록
         일부러 실사용 폭(hw*2)보다 8m나 넓게 만들어 뒀는데, 옥상 비상계단은
         계단실이 옥탑방 밖으로 삐져나와 있던 탓에 그 넓은 벽이 옥상 데크에서
         '허공에 뜬 커다란 판'처럼 그대로 보였다. 이제 옥탑방이 계단실 전체를
         감싸므로(위 EM_ROOM_D 참고) 옥상 비상계단에서는 넓힐 필요가 없다. */
      var bwW=(lv==='R' && em) ? (hw*2+0.4) : (hw*2+8.0);
      var bw=fpMkPlane(bwW,WH,cWall,1,eWall);
      bw.rotation.y=-Math.PI/2; bw.position.set(x0+WD,(yT+yB)/2,zc); g.add(bw);
    }
    /* 요청 반영(버그 수정): 위층(upLv)이 있는 경우에도 이 천장판을 무조건
       씌우고 있었다 — yT는 위층이 있으면 이미 "뚫려 있어야 할" 높이로
       계산되는데(위 yT 식 참고), 그 자리를 이 판이 다시 막아버려서 계단
       첫 칸을 오를 때 바로 위가 막힌 것처럼 보였다. 위층이 없을 때
       (맨 위층·옥상 바로 아래)만 실제로 막힌 천장이 필요하므로 그때만 씌운다. */
    /* 요청 반영(버그 수정): 위층이 있는 계단실은 천장을 아예 안 만들었는데,
       걷기 중에는 "지금 층 + 가려는 층" 두 층만 지어지므로 위층 계단실이
       없는 상황(그 층에 그냥 서 있을 때, 아래로 내려갈 때)에서는 계단실
       위쪽이 통째로 뚫려 바깥(배경)이 그대로 보였다 — 층마다 천장판을 항상
       만들되, 위층이 함께 지어졌을 때만 fpBuildCorr가 이 판을 감춘다. */
    /* 요청 반영(버그 수정): 이 뚜껑을 yT(=중간 계단참보다 겨우 0.45m 위)에
       덮고 있었다 — 위층이 아직 안 지어진 상태(그 층에 그냥 서 있을 때)에서
       계단실을 올려다보면, 계단참 바로 위 0.45m에 판이 하나 떠 있는 꼴이라
       "계단 위쪽 공간이 떠 보인다"였다. 위층이 있는 계단실은 실제로 다음 층
       바닥(SP)까지 뚫려 있어야 하므로, 뚜껑을 그 높이로 올리고 그 사이(yT~SP)
       옆벽·뒷벽도 같이 이어 붙인다. 위층이 함께 지어지면 이 껍질 전체를
       fpBuildCorr가 감추므로(stCap) 겹치지 않는다. */
    var capY = (upLv && SP > yT+0.05) ? SP : yT;
    var cl=fpMkPlane(WD+0.6,hw*2+0.6,0xE9E5D9,1,0x000000); cl.rotation.x=Math.PI/2;
    cl.position.set(x0+WD/2,capY,zc);
    if(upLv) cl.userData.stCap=true;
    g.add(cl);
    if(capY > yT+0.05){
      var upH=capY-yT, upYc=(yT+capY)/2;
      [-1,1].forEach(function(sn2){                       // 양 옆벽 연장
        /* 옆벽은 회전 0/π (판의 가로가 월드 X를 덮는다) — rotation.y=±π/2로
           두면 가로가 Z를 덮어 벽이 90도 어긋난다(처음에 그렇게 넣었다가
           위쪽 모서리로 배경이 새는 걸 확인하고 바로잡았다). */
        var swU=fpMkPlane(WD+0.6, upH, cWall, 1, eWall);
        swU.rotation.y=(sn2<0)?0:Math.PI;
        swU.position.set(x0+WD/2, upYc, zc+sn2*hw); swU.userData.stCap=true; g.add(swU);
      });
      var bwU=fpMkPlane(hw*2+0.6, upH, cWall, 1, eWall);  // 안쪽 끝벽 연장
      bwU.rotation.y=-Math.PI/2; bwU.position.set(x0+WD, upYc, zc);
      bwU.userData.stCap=true; g.add(bwU);
      var ewU=fpMkPlane(hw*2+3.0, upH, cWall, 1, eWall);  // 복도(입구) 쪽 연장
      ewU.rotation.y=Math.PI/2; ewU.position.set(x0-0.015, upYc, zc);
      ewU.userData.stCap=true; g.add(ewU);
    }
    /* 같은 이유로 계단실 '아래쪽'도 막는다 — 아래층이 같이 지어지지 않은
       상태에서 계단실 안을 내려다보면 내려가는 단 옆·아래로 바닥이 전혀
       없어 배경(짙은 남색)이 그대로 보였다(전 층 공통). 아래층이 함께
       지어졌을 때만 fpBuildCorr가 이 판을 감춘다. */
    var flC=fpMkPlane(WD+0.6,hw*2+0.6,0x9B978C,1,0x2E2B24); flC.rotation.x=-Math.PI/2;
    flC.position.set(x0+WD/2,yB,zc);
    if(dnLv) flC.userData.stCapDn=true;
    g.add(flC);
    /* 요청 반영(버그 수정): 계단실 입구 쪽(x0)은 복도 벽이 대신 막아 주는데,
       그 복도 벽은 그 층 천장 높이(FP_CEIL_H=3.3)까지밖에 없다 — 계단참처럼
       그보다 높은 자리(반 층 = 3.3m 위)에서 복도 쪽을 바라보면 벽 위로 남은
       0.45m 틈과 바닥 아래 구간이 그대로 뚫려 있어서, 그 사이로 건물 바깥
       (배경)이 보였다("계단 내려갈 때 프레임이 깨진다"의 남은 원인 — 두 번째
       도막을 내려가는 내내 정면에 보인다). 그 위·아래 구간만 벽으로 막는다.
       (복도 벽이 있는 0~FP_CEIL_H 구간은 건드리지 않으므로 개구부는 그대로다) */
    var fTop1=Math.min(yT, upLv ? SP : yT);
    if(fTop1 > FP_CEIL_H+0.02){
      var fwUp=fpMkPlane(hw*2+3.0, fTop1-FP_CEIL_H, cWall, 1, eWall);
      fwUp.rotation.y=Math.PI/2;
      fwUp.position.set(x0-0.015, (FP_CEIL_H+fTop1)/2, zc); g.add(fwUp);
    }
    if(yB < -0.02){
      var fwDn=fpMkPlane(hw*2+3.0, -yB, cWall, 1, eWall);
      fwDn.rotation.y=Math.PI/2;
      fwDn.position.set(x0-0.045, yB/2, zc); g.add(fwDn);
    }
  }else{
    /* 개구부 뒤쪽 막음벽도 옆벽과 같은 밝은 크림색으로 — 속이 새까만 pit이
       아니라 레퍼런스처럼 밝은 계단실 속으로 읽히게 한다. */
    var dHb=-yB;
    if(dHb>0.05){
      /* 요청 반영(버그 수정, 근본 원인): 계단을 내려가며 반대쪽 단으로
         돌아서는 지점이 바로 이 벽 코앞(가로로 몇십 cm 거리)이다 — 그렇게
         가까운 자리에서 화면 시야각(FOV)이 넓게 벌어지면, 정면 방향에서
         살짝만 옆으로 돌아봐도 시선이 이 벽의 Z방향 끝(zc±hw)보다 훨씬 먼
         지점을 스치듯 지나가며 벽 가장자리 '밖'을 보게 된다 — 그 너머엔
         벽이 없어 옥상 바깥 하늘·산이 그대로 보였다("프레임이 깨진다"의
         정체). 벽 자체를 실사용 폭(hw*2)보다 넉넉히(양쪽 4m씩) 길게 만들어,
         이런 가까운 거리·넓은 화각의 스침 각도에서도 항상 벽 안에 들어오게
         한다(옥상 바깥 풍경판보다는 안쪽에 있으므로 다른 곳에서는 안 보인다). */
      /* 요청 반영(버그 수정): 위 대응으로 이 벽을 세로로도 6m나 키워 놨는데
         (중심을 +3.0 올려 옥상 바닥 위로 3m가 솟는다), 그 솟은 부분이 옥상
         데크에서 보면 옥탑방 옆에 세워진 폭 24m짜리 거대한 베이지 판으로
         그대로 보였다("옥상 뒤쪽에 이상한 벽"의 정체 — 4m 여유폭보다 이쪽이
         훨씬 컸다). 이 벽이 실제로 필요한 구간은 슬래브 아래(yB~0)뿐이고,
         그 위는 옥탑방 벽이 이미 막고 있다 — 딱 옥상 바닥 높이까지만 세운다.
         (좌우 폭은 슬래브 아래라 데크에서 보이지 않으므로 그대로 둔다) */
      /* v106: 옆벽과 같은 이유로 뒷벽도 옥상 바닥 위 10cm까지 올려 세운다 — 옥탑방 뒷벽 밑의
         진회색 걸레받이 몰딩(y 0~0.10)이 개구부 위로 검은 띠처럼 드러나 있었다("중간 띠"). */
      var bwDH=dHb+((!em)?0.10:0);   // v116: 옥탑방 뒷벽이 다시 계단실 뒷벽 자리(v115)로 돌아와, 그 밑 걸레받이·바닥 절단면 슬롯이 개구부 위에 검은 띠로 보였다 — v106처럼 이 벽을 바닥 위 10cm까지 올려 덮는다
      var bwD=fpMkWallFlat(hw*2+20.0,bwDH,cWall, x0+WD+((!em)?0.006:0), yB+bwDH/2, zc, -Math.PI/2); g.add(bwD);   // v126: 5층 벽과 같은 재질   // v103: 옥탑방 벽과 같은 재질. v114: 5층 뒷벽(x0+WD)과 같은 평면에 있어 z-파이팅으로 벽 아래 밝은 띠가 생겼다 — 6mm 뒤로
      /* 요청 반영(버그 수정, 세 번째 지점): 계단실 입구 쪽(x0=2.1)과 옥탑방
         자체 문쪽 벽(cx0=-0.2) 사이에 약 2.3m 폭의 빈 공간이 있는데, 이
         구간은 옥탑방 벽(문 높이 위, y≥roof 바닥)만 있고 그 아래(계단을
         오르내리는 중간 높이)를 막는 벽이 전혀 없었다 — 계단을 내려가다
         입구 쪽을 대각선으로 돌아보면 그 빈 틈 사이로 옥상 바깥 하늘이
         그대로 보였다. 위 bwD(계단실 안쪽 끝)와 똑같은 방식으로, 입구 쪽
         끝에도 같은 높이의 배경벽을 하나 더 세운다(실제 통행로인 xIn~x0+WD
         구간보다 더 앞쪽에 있으므로 걷는 경로를 막지 않는다). */
      var bwEnt=fpMkPlane(hw*2+20.0,dHb,cWall,1,eWall);   // v102: 같은 벽지색
      bwEnt.rotation.y=Math.PI/2; bwEnt.position.set(x0-1.0, yB+dHb/2, zc); g.add(bwEnt);
    }
    /* 개구부 우물 속 조명 — 내려가는 단·계단참·벽이 위(철문 앞)에서 훤히
       내려다보이도록 반 층 아래 높이에 따뜻한 광원 하나를 심는다(옥상 전용). */
    var uwLite=new THREE.PointLight(0xF4F1EA, 0.40, 11);
    uwLite.position.set(x0+WD*0.55, yB*0.5, zc); g.add(uwLite);
  }
  /* 요청 반영(버그 수정): B1↔1층 직선 계단(straightUp)은 yT가 SP+0.45라
     이 천장등·하우징이 1층 바닥(y=SP)보다 0.42m 위에 떠 버렸다 — 1층에 서면
     계단 개구부 옆 바닥에 회색 판이 놓여 있는 것처럼 보였다(3번 사진).
     실제 천장인 1층 바닥 밑면에 붙인다. */
  var lampY = straightUp ? Math.min(yT, SP) : yT;
  /* 요청 반영(버그 수정): 이 '매립등 + 하우징 테두리'는 계단실 천장(yT)에 붙는
     물건인데, 일반 층(반 층씩 두 도막인 지그재그 계단)의 yT는 '중간 계단참보다
     겨우 0.45m 위'다 — 천장이 아니라 계단참 바로 위 허공이다. 그래서
       · 1층→2층 계단참에 서면 폭 3.5m짜리 회색 판이 무릎 높이로 가로질러
         떠 있는 것처럼 보였고(사진 1),
       · 3~5층에서 계단을 오르며 위를 올려다보면 그 판이 계단실 한가운데
         천장을 한 단 내려앉힌 것처럼 보였다(사진 2).
     실제 천장에 붙는 경우(옥상 옥탑방 lv==='R', 그리고 1층 바닥 밑면에
     맞춰 둔 B1 직선계단 straightUp)만 그대로 두고, 나머지 층에서는 눈에
     보이는 판(등 + 하우징)을 그리지 않는다 — 조명(PointLight)은 그대로
     두므로 계단실 밝기는 달라지지 않는다. */
  var lampOnCeil = (lv==='R') || straightUp || !upLv;
  if(lampOnCeil){
    /* 요청 반영(v95): B1 직선계단의 이 등·하우징은 1층 바닥 밑면(y=SP)에 붙어 있는데,
       하우징 폭(0.34)이 홀 중심선(zc)에 걸쳐 있어 1층 바닥 개구부(zc 바로 +Z쪽부터
       뚫림) 안으로 절반이 삐져나와, 1층에서 내려다보면 개구부 가장자리에 회색
       철판이 놓인 것처럼 보였다. 개구부 반대쪽(-Z, 1층 바닥이 막혀 있는 쪽)으로
       옮겨 B1 천장등은 그대로 두되 1층에서는 보이지 않게 한다. */
    var lampZ = straightUp ? zc-0.6 : zc;
    var lamp=fpMkPlane(WD*0.4,0.28,0xFFF6E2,0.9); lamp.rotation.x=Math.PI/2;
    lamp.position.set(x0+WD*0.45,lampY-0.03,lampZ); g.add(lamp);
    var lampFrame=fpMkBox(WD*0.42, 0.03, 0.34, 0x9BA0A6, 1);   // 매립형 등 하우징 테두리(사진 반영)
    lampFrame.position.set(x0+WD*0.45, lampY-0.016, lampZ); g.add(lampFrame);
  }
  /* 실제 조명처럼 계단실 전체에 부드러운 명암을 주는 따뜻한 천장등 —
     이전엔 벽·단은 조명을 받는 재질(MeshPhongMaterial)인데 정작 광원이 하나도 없어서
     사실상 무光(그림자 없는 평면색)으로 보였다. */
  var stLite=new THREE.PointLight(0xF4F1EA, 0.36, 12);
  stLite.position.set(x0+WD*0.45, lampY-0.35, zc); g.add(stLite);
  /* 요청 반영: 이 조명은 계단실 "윗쪽"(yT 근처)에만 있어서, B1→1F 구간처럼
     아래쪽 도착 지점(문·소화전이 있는 실사진 속 로비)이 어두워 위에서
     개구부로 내려다봐도 안 보였다. 바닥(yB) 근처에도 같은 톤의 조명을
     하나 더 둔다 — dnLv가 없는 바닥 쪽(계단실 맨 아래, 예: B1)에서만. */
  if(!dnLv){
    var stLiteLo=new THREE.PointLight(0xF4F1EA, 0.24, 9);   // 과다노출 우려로 세기 낮춤(0.40→0.24)
    stLiteLo.position.set(x0+WD*0.45, yB+0.9, zc); g.add(stLiteLo);
  }
  /* 계단참 창문 : 예전엔 폭 1.5m나 되어서, 계단참에서 돌아서는 순간 창문(연두색 유리)이
     화면을 거의 다 채워 마치 뻥 뚫린 것처럼 보였다 — 실제 계단창 크기로 줄인다. */
  function stWin(cy){
    var wfr=fpMkPlane(1.34,0.98,0xEDEFEA,1);
    wfr.rotation.y=-Math.PI/2; wfr.position.set(x0+WD-0.02,cy,zc); g.add(wfr);
    [-1,1].forEach(function(wsn){
      var wgl=fpMkPlane(0.58,0.82,0x6FAF9A,0.9);
      wgl.rotation.y=-Math.PI/2; wgl.position.set(x0+WD-0.03,cy,zc+wsn*0.32); g.add(wgl);
    });
  }
  /* 계단참 벽에 붙어 있던 창문(스텐레스 프레임+연두색 유리) — 옥상(roofOpen)은
     그 벽 자체를 없앴으므로, 이 창문을 그대로 두면 허공에 뜬 초록색 판자
     조각처럼 보인다("계단 옆 이상한 초록 선"의 정체). 벽이 있을 때만 짓는다. */
  /* 요청 반영: 계단참 창문(연두색 유리)을 없앤다 — 사용자가 화면에서
     어색하게 튀어 보인다고 지적했다(옥상뿐 아니라 일반 층 계단참에도
     있었다). 함수는 남겨 두되 호출을 모두 끈다. */
  if(false && upLv && !roofOpen && !straightUp) stWin(HALF+0.95);
  if(false && dnLv && !(!em && lv===1) && !roofOpen) stWin(-HALF+1.55);
  /* 요청 반영(v97): 중앙계단 계단참(위층으로 도는 자리) —
     ① 정면(뒷벽 x0+WD)에 실제 계단창 비율(폭 0.9 × 높이 1.25, 세로형)의 창문 2개를
        나란히 배치, ② 계단참에서 돌아섰을 때 정면이 되는 -Z 옆벽에 검정 철문
        (폭 0.9 × 높이 2.05, 오른쪽에 원형 손잡이).
     v98 정정 두 가지:
     · 1↔2층 계단참 — 1층 그룹(lobby1F)은 뒷벽 자리에 유리 후문이 있고, 계단참 위쪽
       뒷벽은 함께 지어지는 2층 그룹의 bw(x0+FP_ST_WD, 1층 계단참 끝과 같은 x)가
       담당한다. 그래서 이 계단참의 창·문은 2층 그룹이 '내려가는 쪽 계단참'
       (y=-HALF)에 짓는다(dnLv===1인 경우).
     · 2↔3층 계단참 — 2층 계단실은 1층과 맞닿아 폭이 1.4배(hw 3.11)인데, 함께
       지어지는 3층 계단실은 기본 폭(hw 2.23)이라 3층 옆벽이 2층 옆벽보다 0.88m
       안쪽에 서서 2층 옆벽에 단 문을 가렸다("2→3층 계단참에 문이 없다").
       문은 위층 옆벽 위치(hwUp)에 달고, 위층이 안 지어진 상태에서 문이 허공에
       뜨지 않도록 stCap 규칙(위층이 지어지면 감춤)을 따르는 받침 벽판을 함께 둔다.
     옥상(roofOpen)·B1 직선계단·비상계단은 제외. */
  function stLandingDeco(lY, hwEff, noWin, opt){
    opt=opt||{};
    var bx=x0+WD;
    /* ① 창문 2개 — 흰 프레임 + 옅은 하늘색 유리 + 십자 멀리언
       (v125: 비상계단은 계단실 폭 2.7m에 맞춰 작은 창 — opt로 크기 지정) */
    var wW=opt.wW||0.90, wH=opt.wH||1.25, sill=opt.sill||0.95, gap=opt.gap||0.35;
    (noWin?[]:[-1,1]).forEach(function(ws){
      var wz=zc+ws*(gap/2+wW/2), wy=lY+sill+wH/2;
      var fr=fpMkPlane(wW+0.10, wH+0.10, 0xF2F2EE, 1, 0x3A3A38);
      fr.rotation.y=-Math.PI/2; fr.position.set(bx-0.015, wy, wz); g.add(fr);
      /* v113: 유리는 조명을 받지 않는 재질로 — 옥상 조명 아래(5층↔옥상 계단참)에서
         하이라이트로 하얗게 날아가 창이 흰 판처럼 보이던 것을 다른 층과 같은 하늘색으로 통일 */
      var gl=new THREE.Mesh(new THREE.PlaneGeometry(wW, wH),
        new THREE.MeshBasicMaterial({color:0xA9CBE0, side:THREE.DoubleSide}));
      gl.rotation.y=-Math.PI/2; gl.position.set(bx-0.025, wy, wz); g.add(gl);
      var mv=fpMkPlane(0.05, wH, 0xF2F2EE, 1, 0x3A3A38);
      mv.rotation.y=-Math.PI/2; mv.position.set(bx-0.032, wy, wz); g.add(mv);
      var mh=fpMkPlane(wW, 0.05, 0xF2F2EE, 1, 0x3A3A38);
      mh.rotation.y=-Math.PI/2; mh.position.set(bx-0.032, lY+sill+wH*0.62, wz); g.add(mh);
      var sl=fpMkBox(0.08, 0.04, wW+0.20, 0xDDDBD3, 1);          // 창턱
      sl.position.set(bx-0.04, lY+sill-0.05, wz); g.add(sl);
    });
    if(opt.noDoor) return;
    /* ② -Z 옆벽 철문 — 계단참 X 구간 한가운데. 손잡이는 계단참에서 문을 볼 때
       오른쪽(+X)에 온다. */
    var lx0=xs+N*run, lD=Math.max(0.5, (x0+WD)-lx0-0.04);
    var dW=0.90, dH=2.05, dX=lx0+lD/2, wz0=zc-hwEff;
    if(hwEff < hw-0.05){                                        // 옆벽이 안쪽으로 들어온 경우의 받침 벽판
      var bk=fpMkPlane(lD+0.6, dH+0.9, cWall, 1, eWall);
      bk.position.set(dX, lY+(dH+0.9)/2-0.2, wz0+0.003); bk.userData.stCap=true; g.add(bk);
    }
    var dfr=fpMkPlane(dW+0.10, dH+0.06, 0x9C9590, 1);
    dfr.position.set(dX, lY+dH/2+0.02, wz0+0.008); g.add(dfr);
    var dlf=fpMkPlane(dW, dH, 0x161616, 1, 0x050505);
    dlf.position.set(dX, lY+dH/2, wz0+0.014); g.add(dlf);
    var knob=fpMkDisc(0.035, 0x8A8D8F, 1);
    knob.position.set(dX+dW/2-0.10, lY+0.95, wz0+0.024); g.add(knob);
  }
  if(!em && !roofOpen && !straightUp && !lobby1F){
    if(upLv && upLv!=='R'){
      /* 위층 계단실의 실제 옆벽 위치 — fpMakeStairwell의 owAuto 규칙(1층과 맞닿는 층만 1.4배)을 위층 기준으로 계산 */
      var upUp=LEVELS[idx+2];
      var owAutoUp=(upLv===1 || lv===1 || upUp===1) ? 1.4 : 1;
      var hwUp=FP_ST_OW*owAutoUp/2+0.03;
      stLandingDeco(HALF, Math.min(hw, hwUp));
    }
    if(dnLv===1) stLandingDeco(-HALF, hw);                      // 1↔2층 계단참(1층 그룹 대신 2층 그룹이 담당)
  }
  /* 요청 반영(v101): 5층↔옥상 계단참에도 다른 층처럼 -Z 옆벽 철문. 옥상 그룹(lv='R')이
     내려가는 쪽 계단참(y=-HALF)에 짓는다 — 옥상에 서 있을 때는 5층 그룹이 없어도
     보이고, 5층에서 올라올 때도 옥상 그룹은 항상 함께 지어진다. 창문은 그 뒷벽이
     데크 밑 어두운 벽이라 생략. 5층 그룹 쪽(upLv==='R')은 위에서 이미 제외돼 중복 없음. */
  if(!em && lv==='R' && dnLv===5) stLandingDeco(-HALF, hw+ROOF_WALL_IN, false);
  /* v125(요청 반영): 비상계단 1~5층 계단참(1↔2, 2↔3, 3↔4, 4↔5) 뒷벽에도 창문 2개 — 계단실이
     좁으므로(폭 2.7m) 0.55×0.85m 작은 창, 간격 0.22m. 문은 없음. 옥상 계단참(5↔R)은 제외. */
  if(em && !roofOpen && !straightUp && upLv && upLv!=='R' && typeof upLv==='number'){
    stLandingDeco(HALF, hw, false, {noDoor:true, wW:0.55, wH:0.85, sill:1.0, gap:0.22});
  }
  /* v128(요청 반영): 비상계단 5층↔옥상 계단참에도 같은 작은 창 2개 — 중앙계단과 같이 옥상 그룹이
     내려가는 쪽 계단참(y=-HALF)에 짓는다(옥상에서 자유 탐색할 때도, 5층에서 올라올 때도 보임). */
  if(em && lv==='R' && dnLv===5){
    stLandingDeco(-HALF, hw, false, {noDoor:true, wW:0.55, wH:0.85, sill:1.0, gap:0.22});
  }   // v102: 실사진처럼 데크 아래 계단참 뒷벽에 창문 2개도 함께

  /* ── 1층→2층 계단 밑면(soffit) : 실사진(3번 사진) 반영 ──
     실제 건물은 계단 밑이 '매끈한 비스듬한 콘크리트 판'이고, 그 판을 따라
     벽 패널이 대각선으로 잘려 있다. 예전 모델은 디딤판 상자가 바닥까지
     꽉 찬 통짜 덩어리라, 계단 옆에서 보면 계단이 아니라 커다란 사각 블록
     하나로만 보였다(2번 사진의 그 덩어리). → 디딤판은 고정 두께만 남기고
     (아래 openUnder), 그 밑을 이 경사판 하나가 매끈하게 받쳐 준다.
     이 판이 밑을 완전히 막아 주므로, 예전에 openUnder를 켰을 때 단과 단
     사이로 보이던 시커먼 빈틈 문제도 같이 사라진다.
     ※ 2~5층은 계단 밑이 보이는 공간 자체가 없어 그대로 통짜로 둔다. */
  var stSoffit = (lobby1F && upLv);
  var stTreadT = Math.max(0.28, rise*1.35);   // 디딤판 상자 두께(단 사이 틈 방지)
  if(stSoffit){
    var soA=Math.atan2(rise, run);                     // 계단 경사각
    var soL=Math.sqrt(N*run*N*run + N*rise*N*rise);    // 경사면 길이
    /* 슬래브 두께는 디딤판 상자가 절대 밑으로 삐져나오지 않을 만큼 잡는다 —
       얇게 잡으면 아래에서 올려다볼 때 매끈한 경사면이 아니라 계단 상자
       밑면이 층층이 드러난다(지하로 내려가며 위를 볼 때 확인). */
    var soT=stTreadT/Math.cos(soA) + 0.06;
    var soB=fpMkBox(soL+0.08, soT, fw, 0x9B978C, 1, 0x37342C);
    soB.rotation.z=soA;
    soB.position.set(xs + N*run/2 + Math.sin(soA)*soT/2,
                     N*rise/2 - Math.cos(soA)*soT/2, zUp);
    g.add(soB);
  }
  // 올라가는 단(+Z 쪽) / 내려가는 단(-Z 쪽) — 가운데 벽으로 나뉜 실제 계단 형태
  /* 단코 색 : 실사진 기준 다른 층은 빨간 안전선인데, 옥상 레퍼런스 사진의
     계단은 노란 미끄럼방지선이다 — 옥상(roofOpen)에서만 노란색으로 바꾼다. */
  var noseC = roofOpen ? 0xE0BE2E : 0xC0342B;
  for(var i=0;i<N;i++){
    if(upLv){
      /* [열린 하부] 1층→2층 행 계단만: 실사진처럼 계단 밑으로 지하 계단
         입구가 트여 보여야 하므로, 디딤판 박스가 바닥(Y=0)까지 꽉 채워
         내려가지 않게 한다 — 매 단의 높이를 (i+1)*rise 전부가 아니라
         고정 두께(STAIR_SLAB_T)만큼만 만들고, 그 아래는 비워 둔다.
         다른 층 계단은 기존 그대로(통짜) 유지 — 그쪽엔 밑에 뚫려 보여야
         할 공간이 없으므로 굳이 바꿀 이유가 없다. */
      /* 요청 반영(버그 수정): 이 "밑이 트인" 디딤판 때문에 1층→2층 계단을
         오르는 도중 단과 단 사이로 시커먼 빈 공간(바닥판이 없는 것처럼
         보이는 구멍)이 계속 보였다 — 지하 계단이 살짝 보이는 효과보다
         계단이 통짜로 막혀 있는 쪽이 우선이므로, 다른 층과 똑같이 항상
         통짜 디딤판으로 만든다. */
      /* 요청 반영(재적용): 이제 위에서 만든 경사 슬래브(stSoffit)가 계단 밑을
         통째로 막아 주므로, 1층→2층 구간만 다시 '밑이 트인' 디딤판으로 되돌린다.
         두께는 단 높이(rise)보다 넉넉히 두어(1.6배) 단과 단 사이에 틈이 생기지
         않게 한다 — 예전 버그(단 사이로 보이던 검은 구멍)의 원인이 이 두께였다. */
      var openUnder = stSoffit;
      var STAIR_SLAB_T = stTreadT;
      var suH = openUnder ? Math.min((i+1)*rise, STAIR_SLAB_T) : (i+1)*rise;
      var su=fpMkBox(run,suH,fw,0x8A867B,1,0x2E2B24);
      su.position.set(xs+run*(i+0.5),(i+1)*rise-suH/2,zUp); g.add(su);
      var tu=fpMkFloorPlane(run*0.99,fw,0xC2BEB2,1);           // 화강석 디딤판
      tu.rotation.x=-Math.PI/2;
      tu.position.set(xs+run*(i+0.5),(i+1)*rise+0.004,zUp); g.add(tu);
      var ruH = openUnder ? Math.min(rise*0.96, STAIR_SLAB_T) : rise*0.96;
      /* 요청 반영: 디딤판(밝은 베이지)과 챌판(앞면)이 거의 같은 색이라, 위에서
         내려다볼 때 계단 하나하나가 구분 안 되고 밋밋한 경사면처럼 보였다
         — 챌판을 뚜렷이 어둡게 눌러 단 사이 그림자 대비를 살린다. */
      var ru2=fpMkPlane(fw,ruH,0x716C60,1);         // 챌판(앞면) — 대비 강화
      ru2.rotation.y=-Math.PI/2;
      ru2.position.set(xs+run*i+0.004,(i+1)*rise-ruH/2,zUp); g.add(ru2);
      var nu=fpMkPlane(0.08,fw,noseC,1);   // 단코 미끄럼방지 빨간 안전선(중앙·비상계단 모두, 사진 반영)
      nu.rotation.x=-Math.PI/2;
      nu.position.set(xs+run*i+0.045,(i+1)*rise+0.009,zUp); g.add(nu);
    }
    if(showDown){
      var sd=fpMkBox(run,(N-i)*rise,fw,0x7E7A70,1,0x28251F);
      sd.position.set(xs+run*(i+0.5),-(i+N)*rise/2,zDn); g.add(sd);
      var td=fpMkFloorPlane(run*0.99,fw,0xC2BEB2,1);
      td.rotation.x=-Math.PI/2;
      td.position.set(xs+run*(i+0.5),-i*rise+0.004,zDn); g.add(td);
      var rd2=fpMkPlane(fw,rise*0.96,0x716C60,1);   // 챌판 대비 강화(위와 동일)
      rd2.rotation.y=-Math.PI/2;
      rd2.position.set(xs+run*i+0.004,-i*rise-rise*0.5,zDn); g.add(rd2);
      var nd=fpMkPlane(0.08,fw,noseC,1);   // 단코 미끄럼방지 빨간 안전선(중앙·비상계단 모두, 사진 반영)
      nd.rotation.x=-Math.PI/2;
      nd.position.set(xs+run*i+0.045,-i*rise+0.009,zDn); g.add(nd);
    }
  }
  /* 계단 끝 참 : 위층 쪽 단이 있을 때만 그린다(직선 한 도막인 B1↔1F는 전체
     높이(SP)의 꼭대기, 나머지 층은 반 층(HALF)의 꼭대기). */
  /* [버그 수정] 이 '도착 참' 바닥(lnd/lndT)은 원래 모든 층 계단 위에 공통으로
     깔리는데, B1→1F 구간(lv==='B1', upLv===1)만은 1층 쪽에서 fpMake1FStairHall이
     이미 같은 자리(xs+N*run ~ x0+WD)를 통째로 덮는 자기 바닥(landFl/fl)을 따로
     깔고 있어 두 바닥이 살짝 다른 높이(topY-0.06/+0.006 대 1층의 0.008/0.01)로
     겹쳐 Z-fighting과 "공중에 뜬 흰 삼각형" 아티팩트를 만들었다. 이 조합에서만
     중복 바닥을 생략한다(다른 층 전환에는 영향 없음 — 그쪽은 이 lnd가 유일한
     도착 바닥이라 그대로 유지). */
  if(upLv && !(lv==='B1' && upLv===1)){
    var topY = (straightUp?SP:HALF);
    var lx0=xs+N*run;
    /* [버그 수정] 1층 로비는 후문 공간을 위해 계단실 폭(WD) 자체를 넓혔을 뿐,
       계단 착지참까지 그만큼 넓어질 이유가 없다 — 이 공식을 그대로 쓰면
       착지참이 후문 벽까지 뻗어나가는 거대한 판(여러 스크린샷에서 보고된
       "박스")이 된다. 1층에서만 일반 층과 같은 폭(FP_ST_WD)·실제 계단 폭
       (fw) 기준으로 착지참 크기를 원래대로 되돌리고, 중심도 홀 전체 중심
       (zc)이 아니라 실제 계단이 있는 열(zUp)로 맞춘다. */
    var WDeff = lobby1F ? FP_ST_WD : WD;
    var lD=Math.max(0.5, (x0+WDeff)-lx0-0.04);
    /* 요청 반영(버그 수정): 1층에서만 착지참을 '올라가는 단 폭(fw+0.6)'으로
       좁혀 두었는데, 이 참은 2층에서 내려온 사람이 반대쪽 단으로 돌아서는
       계단참 전체이기도 하다 — 내려가는 단 쪽(zDn 열)에는 바닥이 아예 없어서
       2층→1층으로 내려오다 계단참에 발을 딛는 순간 계단 사이가 뻥 뚫려
       보였다("계단 사이 구멍"). 깊이(X)만 1층용으로 줄이고, 폭(Z)은 다른
       층과 똑같이 계단실 전체 폭으로 되돌린다. */
    var lndW = hw*2-0.08;
    var lndZ = zc;
    /* v113(요청 반영): 5층↔옥상 계단참은 옥상 그룹의 -Z 옆벽이 옥탑방 벽면(zc-hw-ROOF_WALL_IN)에
       있어, 이 계단참 슬래브(폭 hw*2-0.08)와 그 벽 사이에 약 20cm 틈이 남아 위에서 보면
       슬래브 옆면(갈색)이 띠처럼 보였다. 슬래브를 그 벽까지 늘린다. 뒷벽 쪽(+X)도 4cm 여유를 없앤다. */
    var lndPadZ = (upLv==='R' && !em) ? (ROOF_WALL_IN+0.04) : 0;
    if(lndPadZ>0){ lndW += lndPadZ; lndZ -= lndPadZ/2; }
    var lDx = (upLv==='R' && !em) ? lD+0.04 : lD;
    var lnd=fpMkBox(lDx, 0.12, lndW, 0x8A867B, 1, 0x2E2B24);
    lnd.position.set(lx0+lDx/2, topY-0.06, lndZ); g.add(lnd);
    var lndT=fpMkFloorGloss(lDx-(lndPadZ>0?0.02:0.06), lndW-(lndPadZ>0?0.02:0.08), fpTerrazzoTex());
    lndT.rotation.x=-Math.PI/2; lndT.position.set(lx0+lDx/2, topY+0.006, lndZ); g.add(lndT);
  }
  /* ── 스테인리스 금속 난간 : 계단 가운데 뚫린 공간(반대쪽 단이 보이는 쪽) 가장자리를 따라
     오르내리는 경사 난간 + 세로 간살을 세운다. 실제 사진처럼 광택 있는 크롬 재질로,
     기존 fpMkBox(무광 MeshBasicMaterial)가 아니라 fpMkMetal(조명을 받는
     MeshStandardMaterial, metalness:0.85 / roughness:0.2)을 쓴다. */
  var RAIL_H=0.98, RAIL_COL2=0xDCDCDC;
  function stairRail(zEdge, y0r, y1r, xStart, xEnd){
    var dxr=xEnd-xStart, len=Math.sqrt(dxr*dxr+(y1r-y0r)*(y1r-y0r)), ang=Math.atan2(y1r-y0r, dxr);
    [0, -0.34].forEach(function(off, oi){
      var bar=fpMkPipe(len, oi===0?0.042:0.028, RAIL_COL2, 1, 'x', ang);
      bar.position.set((xStart+xEnd)/2, (y0r+y1r)/2+RAIL_H+off, zEdge); g.add(bar);
    });
    var np=1;   // 단순화: 촘촘한 세로 창살 대신 양끝 기둥만 남긴다(요청 반영, 가로 파이프가 주가 되게)
    for(var i=0;i<=np;i++){
      var t=i/np;
      var po=fpMkPipe(RAIL_H, 0.027, RAIL_COL2, 1);
      po.position.set(xStart+dxr*t, y0r+(y1r-y0r)*t+RAIL_H/2, zEdge); g.add(po);
    }
  }
  if(upLv && !straightUp){
    // 올라가는 단 : 가운데(빈 공간) 쪽 가장자리
    /* 요청 반영(버그 수정): B1↔1F 직선 계단(straightUp)은 위 flight()에서
       이미 옥상과 같은 촘촘한 파이프 난간을 양쪽 가장자리(zi·zo) 모두에
       세운다 — 여기서 또 이 안쪽 난간과 팔꿈치(elbowU) 조각을 겹쳐 지으면,
       가는 파이프·토러스 조각들이 여러 겹 겹쳐 위에서 내려다볼 때 "정체불명의
       가는 흰 선/V자" 잡동사니처럼 보인다. straightUp은 여기서 짓지 않는다. */
    stairRail(zUp-fw/2, 0, N*rise, xs, xs+N*run);
    var elbowU=new THREE.Mesh(new THREE.TorusGeometry(0.15,0.042,10,14,Math.PI*0.55),
      new THREE.MeshStandardMaterial({color:RAIL_COL2, metalness:0.85, roughness:0.2,
        envMap:fpEnsureEnvMap(), envMapIntensity:1.15}));
    elbowU.rotation.set(Math.PI/2, 0, Math.PI*0.62);
    elbowU.position.set(xs+N*run, N*rise+RAIL_H, zUp-fw/2); g.add(elbowU);
  }
  if(showDown && !straightUp && !roofOpen){   // v110: 옥상은 flight()의 파이프 난간만 — 흰 기둥이 겹쳐 서던 것 제거
    stairRail(zDn+fw/2, 0, -N*rise, xs, xs+N*run);
  }
  /* 1층→지하 후문 + U턴 착지참 : 직접 렌더링해 확인해 보니 계단실 벽 구멍이
     후문 통로와 좌표가 안 맞아 허공에 뜬 벽 조각으로 겹쳐 보였고, U턴 착지참도
     충분히 검증 못 한 상태였다 — 전부 제거하고 원래의 매끈한 직선 계단으로
     되돌린다(요청 반영). 관련 함수 정의(fpMakeBackDoorBranch 등)는 남겨 둔다. */
  /* 계단 사이 칸막이 벽 : 예전엔 계단참 구간까지 벽이 끝까지 이어져 있어서,
     계단참에서 반대쪽 단으로 건너가는 순간 이 벽 속으로 파고들어가
     화면 가득 허연 면(벽 안쪽)만 보이는 문제가 있었다. 계단참 자리(landing)는
     실제 사진처럼 막힘 없이 트인 하나의 평평한 공간이어야 하므로,
     칸막이는 계단 오르내리는 구간(N*run)까지만 세우고 계단참 앞에서 끊는다. */
  var midLen = Math.min(WD-LAND, N*run);
  if(roofOpen || (lv==='R' && em)){
    /* 옥상(lv==='R')은 upLv가 없어 '오르는 단'이 애초에 없다 — 그런데도 이전
       코드는 em/1층과 똑같이 허리 높이 흰색 칸막이+난간(mid/midRail, 색
       0xEFEBE2)을 문 정면 한가운데(zc)에 그대로 지어서, 실제로는 아무것도
       나누지 않는 이 벽이 오히려 철문 앞에서 정면 시야(복층·개구부)를
       가로막는 '정체불명의 흰 울타리'로 보이는 원인이었다. 옥상에서는
       이 칸막이/난간을 아예 짓지 않는다(요청 반영 — 정면 완전히 개방).
       요청 반영(버그 수정): 이 조건은 원래 중앙계단(roofOpen, em=false)만
       걸러냈는데, 비상계단 쪽(em=true) 옥상도 upLv가 없기는 마찬가지라
       똑같이 걸러야 했다 — 안 그러면 emergency 쪽만 아래 "else" 문단으로
       빠져서 천장까지 닿는 통짜 칸막이 벽(WH 높이)이 그대로 남아, 옥탑방
       안에서 계단을 내려다볼 때 계단실 한복판을 가로막는 벽으로 보였다. */
  }else if(upLv && (em || (!em && lv===1))){
    /* 비상계단은 사진처럼 가운데가 허리 높이 난간이라 입구에서 계단 전체가
       탁 트여 보인다 — 예전에는 여기도 천장까지 막힌 벽이라 입구 정면이
       답답하게 가로막힌 것처럼 보였다.
       1층 중앙계단도 마찬가지 — 후문 곁가지가 갈라지는 참을 레퍼런스 사진처럼
       상행 계단과 한눈에 보이는 하나의 열린 참으로 두려면, 오르는 단과
       내려가는 단 사이를 천장까지 막지 말고 허리 높이 난간으로 틔워야 한다.
       단, upLv가 없으면(옥상 비상계단처럼 더 올라갈 계단 자체가 없을 때)
       이 칸막이/난간이 나눠줄 '오르는 단'이 애초에 없어서, 텅 빈 바닥 위에
       난간만 둥둥 떠 있는 것처럼 보였다(요청 반영: upLv 있을 때만 짓는다). */
    var midH = 1.05;
    var mid=fpMkBox(midLen, midH, 0.10, 0xEFEBE2, 1, 0x2E2B24);
    mid.position.set(x0+LAND+midLen/2, yB+midH/2, zc); g.add(mid);
    var midRail=fpMkRailBox(midLen, 0.045, 0.045, 0x9AA4AC, 1);
    midRail.position.set(x0+LAND+midLen/2, yB+midH+0.03, zc); g.add(midRail);
  }else if(straightUp){
    /* 요청 반영(삭제): B1↔1층 직선 계단은 오르내리는 단이 한 열뿐이라 이
       칸막이 벽이 나눠 줄 반대쪽 단이 아예 없다 — 그런데도 높이 6.6m·길이
       5.8m짜리 통짜 벽이 계단실 한복판에 서 있어서, 지하 복도에서 보면
       시야를 완전히 가로막는 커다란 ㄷ자 덩어리로 보였다. B1 구간에서만
       이 벽을 짓지 않는다(2~5층은 위 else 분기 그대로 유지). */
  }else{
    var midTop = yT;
    var midHt = midTop - yB;
    var mid=fpMkBox(midLen,midHt,0.10, 0xB9B0A0, 1, 0x2E2B24);
    mid.position.set(x0+LAND+midLen/2,(midTop+yB)/2,zc); g.add(mid);
  }
  /* 난간 : 스테인리스(사진 반영) — 칸막이 쪽 기둥 난간 + 바깥 벽 핸드레일
     예전엔 이 바깥쪽 난간을 사각 박스 3단(0.94/0.66/0.40)+촘촘한 사각 기둥으로
     지어서, 벽이 없는 옥상에서는 마치 "흰색 세로 창살 울타리"처럼 두드러져
     보였다(원목 손잡이 하나만 스테인리스 파이프였고 나머지는 전부 박스였다) —
     레퍼런스 사진처럼 상단 손잡이 1단 + 중단 파이프 1단, 원형 파이프로 다시 짓는다. */
  var Lr=Math.sqrt(Math.pow(N*run,2)+Math.pow(N*rise,2)), ang=Math.atan2(N*rise,N*run);
  function flight(sgn, zSide, dirUp){
    var zi = zSide - sgn*(fw/2-0.07);
    var zo = zSide + sgn*(fw/2-0.05);
    var a  = dirUp ? ang : -ang;
    if(roofOpen || lv==='R' || straightUp){
      /* 옥상 개구부 속 계단 : 옆벽 자체가 없으므로(roofOpen에서 벽 생략)
         꽉 찬 흰 파라펫을 그대로 두면 위에서 내려다볼 때 허공에 뜬 흰
         화살표처럼 보였다 — 레퍼런스 사진처럼 양쪽 모두 은색 파이프 난간
         (상단 손잡이 + 중단 가로대 + 촘촘한 세로 살)으로만 짓는다.
         fpMkPipe(0.9/0.1)는 SwiftShader/저조도에서 하얗게 뭉개져 "흰색 두꺼운
         울타리"처럼 보이므로, 스테인리스 스펙(metalness 0.85/roughness 0.2)인
         fpMkPipeRail을 대신 쓴다.
         비상계단(em)도 옥상(lv==='R')에서는 같은 방식을 쓴다 — 꽉 찬 흰
         파라펫이 좁은 옥탑방 안에서는 비스듬한 대각선 기둥처럼 보이는 문제가
         있었다(요청 반영).
         요청 반영: B1↔1F 직선 계단(straightUp)도 벽으로 둘러싸인 일반
         계단실이 아니라 옥상처럼 사방이 트인 후문 로비 한복판이라, 얇은
         판때기 파라펫(아래 else 분기)이 위에서 내려다볼 때 정체불명의 가는
         흰 선처럼 보였다 — 옥상과 같은 촘촘한 파이프 난간으로 통일한다. */
      /* 요청 반영(v99): 옥상 중앙계단의 내려가는 계단은 이제 -Z 쪽이 옥탑방 벽에
         바로 붙어 있다(mainCZ0 = 개구부-0.12). 그 벽 쪽(zi, sgn=1이라 -Z)의
         촘촘한 창살 난간은 실사진처럼 벽 손잡이 1줄 + 브라켓으로 바꾼다. */
      var wallSideZ=(roofOpen && !em && !dirUp) ? zi : null;
      [zi, zo].forEach(function(zr){
        if(zr===wallSideZ) return;   // v101: 벽 쪽에는 손잡이·난간 어떤 것도 세우지 않는다(요청 반영: 여긴 그냥 벽)
        [0,-0.34].forEach(function(off, oi){
          var bar=fpMkPipeRail(Lr, oi===0?0.036:0.024, 'x', a);
          bar.position.set(xs+N*run/2, (dirUp?N*rise/2:-N*rise/2)+0.94+off, zr); g.add(bar);
        });
        var npFlight=Math.max(3, Math.round(Lr/0.16));   // 요청 반영: 촘촘한 세로 살
        for(var fbi=0; fbi<=npFlight; fbi++){
          var fbt=fbi/npFlight;
          var py=(dirUp? N*rise*fbt : -N*rise*fbt);
          var po=fpMkPipeRail(0.94, 0.018);
          po.position.set(xs+N*run*fbt, py+0.47, zr); g.add(po);
        }
      });
      return;
    }
    /* 레퍼런스 사진의 계단 안쪽은 창살 난간이 아니라 "꽉 찬 흰색 낮은 벽(파라펫)
       + 맨 위 은색 파이프 손잡이 1줄" — 그대로 재현한다. */
    /* 예전엔 이 파라펫에 강한 emissive 틴트(0x33302A)를 줘서 MeshPhongMaterial로
       그렸는데, 계단실 입구처럼 파라펫을 거의 옆에서(그레이징 앵글로) 보는 시점에서는
       emissive가 면 사이 음영차를 지워버려 "앞면+윗면"이 한 장의 납작하고 뾰족한
       흰색 삼각형처럼 보이는 버그가 있었다(요청 반영: 실사용 스크린샷에서 확인된
       "벽에서 삐져나온 삼각형" 정체). emissive를 빼면 fpMkBox가 기본
       MeshStandardMaterial(약한 프로시저럴 노이즈 텍스처 + 정상 음영)을 쓰게 되어
       조명 방향에 따라 면이 자연스럽게 갈려 입체로 읽힌다. */
    var par=fpMkBox(Lr, 0.88, 0.07, 0xF2EFE8, 1);
    par.rotation.z=a;
    par.position.set(xs+N*run/2, (dirUp?N*rise/2:-N*rise/2)+0.44, zi); g.add(par);
    var topRail=fpMkPipe(Lr, 0.032, 0xCCCCCC, 1, 'x', a);
    topRail.position.set(xs+N*run/2, (dirUp?N*rise/2:-N*rise/2)+0.94, zi); g.add(topRail);
    var hr=fpMkBox(Lr, 0.045, 0.05, 0x9C6B3F, 1, 0x1A0F08);   // 사진처럼 벽쪽은 나무 손잡이
    hr.rotation.z=a;
    hr.position.set(xs+N*run/2, (dirUp?N*rise/2:-N*rise/2)+0.92, zo); g.add(hr);
    for(var bi=0; bi<=3; bi++){                                // 벽 브라켓
      var bt=bi/3, bx=xs+N*run*bt, by=(dirUp? N*rise*bt : -N*rise*bt);
      var brk=fpMkRailBox(0.05, 0.05, 0.10, 0x8A9096, 1);
      brk.position.set(bx, by+0.86, zo+sgn*0.05); g.add(brk);
    }
  }
  if(upLv) flight(-1, zUp, true);
  if(showDown) flight( 1, zDn, false);
  /* 하행 계단을 지운 좌측(zDn) 공간의 바닥은 1층 전용 landFl(위쪽,
     fpMake1FStairHall에서 이미 x0+LAND~x0+WD 전체 폭을 덮어 놓았다)이
     그대로 걸어다닐 수 있는 바닥 역할을 한다 — 별도 바닥을 또 깔면
     같은 높이에서 겹쳐 z-fighting(깜빡임)이 나므로 추가하지 않는다. */


  // 개구부 테두리 + 안내 현판
  /* 요청 반영(삭제): 계단실 개구부 양옆에 세워 두던 가느다란 테두리 띠
     (중앙계단 연회색 / 비상계단 연두색, 폭 6cm)를 모두 없앤다. 복도 벽면과
     계단실 옆벽이 만나는 모서리에 겹쳐 서 있어서, 계단실 안이나 옥탑방에서
     보면 벽에 회색·연두색 막대 하나가 툭 붙어 있는 것처럼만 보였다. */
  var txt = em ? (ko?'비상계단':'EXIT STAIRS') : (ko?'계단':'STAIRS');
  if(upLv) txt += '   \u2191 '+lvLabel(upLv);
  if(dnLv) txt += '   \u2193 '+lvLabel(dnLv);
  if(!em){
    // 비상계단은 새로 단 초록 EXIT 표지판이 이 역할을 대신하므로, 뒤에 겹쳐 있던
    // 예전 '비상계단' 현판은 없앤다. 중앙계단의 "계단 ↑/↓ 층" 현판도 사용자가
    // "공중에 뜬 AR 팻말"이라고 지적해 완전히 제거한다 — 층 정보는 위쪽 2D
    // HUD 배너("13524호·PC실" 등)가 이미 보여주므로 3D 메쉬로 중복 표시하지 않는다.
  }
  /* 요청 반영: 실제 사진(중앙계단 앞)을 보면 중앙계단 개구부도 비상계단과
     똑같이 짙은 회색 스틸 문틀이 개구부를 빙 두르고, 그 위에 초록 비상구
     표지판이 달려 있다 — 지금까지 이 문틀을 비상계단(em)에만 세우고 있어서
     중앙계단은 벽에 네모난 구멍만 뚫린 밋밋한 모습이었다. 같은 문틀·표지판을
     중앙계단에도 세운다(문짝은 달지 않는다 — 요청).
     지하 1층은 개구부 높이가 다르고(stOpenH=2.80) 옥상은 옥탑방 문이 따로
     있으므로 두 층은 제외한다. */
  if(lv!=='R' && lv!=='B1'){
    /* 비상계단 입구 : 회색 문틀 + 한쪽으로 살짝 열린 베이지색 방화문 + 초록 비상구 표지판
       (사진 반영). 문틀은 개구부 테두리를 두르는 각진 콘크리트/스틸 프레임, 문은 문틀
       오른쪽 문설주에 경첩을 두고 복도 쪽으로 열려 있어 계단 시야를 가리지 않는다.
       옥상(lv==='R')은 이 계단실이 좁은 옥탑방 안쪽이라 이 문틀 기둥(jL/jR)이
       방 한가운데 정체불명의 '기둥'처럼 보이는 원인이었다 — 옥상은 옥탑방 자체
       문(fpMakeHeadhouse)이 이미 있으므로 여기서는 짓지 않는다(요청 반영). */
    /* 요청 반영(다듬기): 문틀 상자가 복도 쪽으로 0.30m나 튀어나와 있어서,
       복도를 비스듬히 훑어보면 벽면에 두꺼운 혹이 하나 붙은 것처럼 보였다.
       상자 깊이(0.32)는 그대로 두고 위치만 계단실 안쪽으로 밀어, 복도로는
       0.12m만 나오게 한다 — 정면에서 보이는 문틀 테두리 모양은 그대로다. */
    var jambD=0.32, jambW=0.12, jambH=FP_ST_OH+0.10, jambCol=0xB9B7B2;
    var jambX=FP_WALL_X-jambD/2+0.20;
    var jL=fpMkBox(jambD, jambH, jambW, jambCol, 1);
    jL.position.set(jambX, jambH/2, zc-OW/2-jambW/2); g.add(jL);
    var jR=fpMkBox(jambD, jambH, jambW, jambCol, 1);
    jR.position.set(jambX, jambH/2, zc+OW/2+jambW/2); g.add(jR);
    var jT=fpMkBox(jambD, jambW, OW+jambW*2, jambCol, 1);
    jT.position.set(jambX, jambH-jambW/2, zc); g.add(jT);
    /* 방화문 — 복도 쪽(fpMakeCorr)에서 이미 벽에 붙은 쌍여닫이 방화문을 따로
       짓고 있어서, 여기서 또 각도로 열린 문짝 하나를 더 지으면 복도 벽 문과
       겹쳐 두 개의 문(하나는 벽에 붙어 있고 하나는 허공에서 열린 채)이
       보이는 문제가 있었다(요청 반영: 이 문짝은 없애고 문틀·표지판만 남긴다). */
    // 초록 비상구(EXIT) 표지판 — 문 위, 복도에서도 잘 보이게
    // (문구 텍스처가 8:1 비율로 그려지는데 이전엔 3.3:1 평면에 욱여넣어서
    //  글자가 위아래로 눌리며 판 밖으로 잘려 보였다 — 평면 비율을 텍스처에 맞춘다)
    /* 요청 반영: 초록 비상구 표지판은 비상계단 개구부에만 단다 —
       중앙계단에는 문틀만 두고 표지판은 달지 않는다. */
    if(em){
      /* v148(요청 반영): 예전에는 초록 배경판(0.66x0.20)과 글씨판(0.60x0.075)을
         따로 겹쳐 놨는데, 글씨판이 배경판보다 훨씬 납작해서 글자가 위아래로
         눌리고 판 안에서 잘려 보였다 → 금연 안내문(fpNoSmokeTex)처럼 배경·글자를
         한 장의 텍스처로 그리고, 캔버스 비율을 판 비율과 정확히 같게 맞춘다.
         표지판 자체도 조금 키워 복도 끝에서도 읽히게 한다. */
      var exSignW=0.86, exSignH=0.26;
      var exSign=fpMkTex(exSignW, exSignH, fpExitSignTex(), 1);
      exSign.rotation.y=-Math.PI/2;
      exSign.position.set(FP_WALL_X-0.09, FP_ST_OH+0.34, zc); g.add(exSign);
    }
    // 입구 바로 위 매립등 — 표지판·문틀이 은은하고 밝게 보이도록 국부 조명 추가
    var esDoorLite=new THREE.PointLight(0xF7F3EA, 0.32, 5);
    esDoorLite.position.set(FP_WALL_X+0.55, jambH+0.15, zc); g.add(esDoorLite);
  }
  return g;
}
/* ══════════ 지하 1층 : 크리에이티브 존 ══════════════════════════
   B1은 위층들과 구조가 전혀 다르다(복도 양옆에 강의실이 늘어선 형태가 아님).
   실제 배치 : 엘리베이터에서 내리면
     · 오른쪽(-Z) 은 막다른 벽
     · 왼쪽(+Z) 에 위로 올라가는 계단
     · 정면(-X) 에 크리에이티브 존 출입문 → 안은 스터디카페 같은 열람 공간
     · 존 안쪽 끝에 밖으로 나가는 계단
   위층용 fpMakeCorr 대신 이 함수로 따로 짓는다. */
var FP_B1_DOOR_W = 1.9;      // 크리에이티브 존 출입문 폭 — 요청 반영: 옆벽을 더 넓히기 위해 재조정(2.2→1.9, 옆벽 0.7m→0.85m씩)
var FP_B1_DOOR_H = 2.26;
var FP_B1_ZTOP   = 8.3;      // 복도 끝(= 크리에이티브 존 출입문이 있는 벽)
var FP_B1_ZEND   = -7.9;     // 엘리베이터에서 나와 오른쪽 — 막다른 끝
/* 크리에이티브 존 입구 옆(-X 벽) 벽감 — 그리기(fpMakeB1)·걷기 영역(fpBuildRooms)·
   이동 지점(fpBuildNodes)이 모두 같은 값을 쓰도록 여기 한 곳에 둔다. */
/* 요청 반영: 계단을 내려오면 바로 보이는 이 벽감이 너무 얕아(1.55m) 문 두 짝이
   복도 벽면에 거의 붙어 있는 것처럼 보였다 — 실제처럼 안으로 더 파 들어간
   공간으로 만든다. 걷기 영역(b1alc)·이동 지점·뒷벽·옆문 위치는 모두 이 값에서
   계산되므로 여기만 고치면 전부 따라온다. */
var FP_B1_ALC_D  = 2.60;     // 벽감 깊이(-X 방향)
var FP_B1_ALC_W  = 5.0;      // 벽감 폭(Z 방향, 존 입구 벽에 붙어 있다)
/* 나가는 계단(존 안쪽 → 밖) 치수 — fpMakeB1(그리기)과 fpBuildNodes/fpGoStairsOut(걷기)이
   같은 숫자를 쓰도록 여기 한 곳에만 정의해 둔다. */
var FP_B1_EXIT_X    = -6.2;
var FP_B1_EXIT_N1   = 5;                 // 1구간(문 지나 바로 오르는 계단) 단 수
/* 요청 반영: 1구간·계단참·2구간을 오갈 때 "계단을 밟으며 오르는" 바운스
   연출(stairs 애니메이션)만 잠시 꺼둔다 — 이동 자체는 막지 않는다(내부 구조를
   보면서 꾸밀 수 있어야 하므로). 눈높이(y)는 목적지에 맞게 그대로 바뀌고,
   단지 한 칸씩 밟는 느낌의 바운스만 생략된 평범한 걷기가 된다. */
var FP_B1_STAIR_NAV_ENABLED = false;
/* 나가는 문(이중문)의 문 폭·높이 — 존 북쪽 끝벽(zback)에 이 문만큼 구멍을 뚫는
   코드와, 실제 문짝을 만드는 코드가 같은 숫자를 쓰도록 여기 한 곳에만 둔다.
   (요청 반영: 예전엔 zback이 통짜 한 장이라 문 유리 바로 뒤를 크림색 벽이
   막고 있었다 — 문이 열려도 방풍실·계단이 안 보이고 벽만 보였다.) */
var FP_B1_EXIT_DOOR_W = 2.6;
var FP_B1_EXIT_DOOR_H = 2.24;
/* 나가는 이중문이 열리기 시작하는 거리(m). 안쪽 문 앞 노드(zoneexit)에서
   바깥 문까지가 약 2.15m라, 그보다 넉넉히 잡아야 한 번의 이동으로 문 앞에
   섰을 때 두 문이 함께 열린다(요청 반영). */
var FP_B1_EXIT_DOOR_TRIG = 3.4;
/* 요청 반영(실사진 대조) : 2구간 계단이 4단(길이 1.2m·높이 0.7m)뿐이라 실제보다
   훨씬 짧고 낮았다 — 사진처럼 길고 높게 12단으로 늘린다(길이 3.6m·높이 2.1m).
   계단 좌표(fpB1ExitPts)·걷기 눈높이(fpB1ExitY)·계단 메쉬가 모두 이 값에서
   계산되므로 여기만 바꾸면 전부 따라온다. */
var FP_B1_EXIT_N2   = 16;                // 2구간(오른쪽으로 꺾은 뒤 오르는 계단) 단 수 — 요청 반영: 12 → 16단(길이 4.8m·높이 2.8m)
var FP_B1_EXIT_RISE = 0.175;
var FP_B1_EXIT_RUN  = 0.30;
var FP_B1_EXIT_N    = FP_B1_EXIT_N1+FP_B1_EXIT_N2;         // 총 단 수(참고용)
var FP_B1_EXIT_H1   = FP_B1_EXIT_N1*FP_B1_EXIT_RISE;       // 1구간 다 오른 높이(계단참)
var FP_B1_EXIT_TOPY = FP_B1_EXIT_N*FP_B1_EXIT_RISE;        // 2구간까지 다 오른 높이
var FP_B1_EXIT_TURNDIR = -1;             // 계단참에서 꺾는 방향(화면에서 오른쪽으로 보이는 쪽)
/* 계단실 폭 — 계단·계단참·양옆 벽돌벽·걸어다닐 수 있는 범위가 전부 이 값 하나를
   공유한다. 요청 반영: 12.0m는 문(3.5m) 양옆에 벽돌이 4.25m씩이나 남아 너무
   휑해 보였다 → 8.0m로 줄여 양옆을 2.25m씩으로 좁힌다. */
var FP_B1_EXIT_SW   = 6.5;   // 요청 반영: 8.0 → 6.5m (문 양옆 벽돌이 1.5m씩)
var FP_B1_EXIT_LAND_D = 3.2;             // 계단참(꺾이는 자리) 깊이 — 요청 반영: 뒷벽이 너무 가까워 보여서 1.8→3.2로 더 뒤로 민다
