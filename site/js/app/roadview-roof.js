"use strict";
/* roadview-roof.js — 1인칭 로드뷰 — 옥상 · 복층
   (예전 한 파일 main.js 의 9115~10802줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
function fpRoofBox(){
  var ST=BUILDING_Z_STRETCH;
  return {HX:GLOBAL_HALF_X-0.5,
          z0:GLOBAL_BOT_Z*ST+0.8,
          z1:GLOBAL_TOP_Z*ST-0.8};
}
var FP_MEZ_HH = 4.00;   // 중앙계단 옥탑방(복층이 있는 방) 천장고 — 사진처럼 높다
/* 옥상에서 "계단 앞"에 서는 좌표 — 중앙계단은 다 올라온 계단 꼭대기(개구부 옆)
   안쪽 자리, 비상계단은 그 옥탑방 안쪽 자리. 자유 탐색 이동 지점(fpBuildNodes)과
   비상계단 도착(fpEmGo) 양쪽에서 똑같이 써서, 옥탑방 밖(철문 바깥)으로 나가는
   자리가 이동 지점으로 잡히지 않게 한다. */
function fpRoofStSpot(){
  /* 자유 탐색 중에도 다른 층 계단 근처처럼 "다가가면 멈추고
     버튼이 뜨는" 동작이 되도록, 이 근접감지 지점을 안내(fpStairGo/
     fpShowRoofChoice) 도착 지점과 똑같은 철문 앞 점자블록 좌표로 맞춘다.
     FP_ROOF_LANDING은 fpMakeHeadhouse(중앙계단 옥탑방)가 지어질 때
     채워지는데, fpSetFloor가 fpBuildCorr → fpBuildNodes 순서로 부르므로
     이 함수가 실행되는 시점엔 이미 값이 들어 있다. 아주 드물게 아직 없다면
     기존 계단 꼭대기 좌표로 대체한다. */
  if(FP_ROOF_LANDING) return {x: FP_ROOF_LANDING.x, z: FP_ROOF_LANDING.z};
  var ST=BUILDING_Z_STRETCH, stZ=(FLOOR_LAYOUT[5]?FLOOR_LAYOUT[5].stZ:0)*ST;
  return {x: FP_WALL_X+FP_ST_LAND+FP_ST_N*FP_ST_RUN+0.3, z: stZ};
}
/* "계단 앞"에서 스킵플로어(오름 계단+사물함) 쪽을 정면으로 바라보기 위한
   대략적인 목표 좌표 — fpMakeRoof/fpMakeRoofSkipFloor와 완전히 같은 공식으로
   계산한다(예전 공식이 그대로 남아있어 방을 실측 비율로 좁힌 뒤로
   좌표가 크게 어긋나 있었다 — "내려가기" 버튼이 뜨는 시점의 카메라 시선이
   엉뚱한 방향을 보게 만든 원인이었다). */
function fpRoofSkipCentroid(){
  var ST=BUILDING_Z_STRETCH, stZ=(FLOOR_LAYOUT[5]?FLOOR_LAYOUT[5].stZ:0)*ST;
  var ROOF_OW_MUL=1.0, ROW=FP_ST_OW*ROOF_OW_MUL, RM_DX=0.45, RM_DZ=0.35;   // v115: 0.45로 복귀 (fpMakeRoof와 동일)
  var mainCX1=FP_WALL_X+FP_ST_WD-0.80+0.35+RM_DX;
  /* 구조 정정: 중앙계단 열 맞바꿈을 되돌렸으므로(_colFlip=1),
     내려가는 단은 -Z열이다 — fpMakeRoof와 완전히 같은 공식을 쓴다. */
  var realDnZ0pre=stZ-(ROW/4+0.02)-(ROW/2-0.10)/2-0.10;
  var realDnZ1pre=stZ-(ROW/4+0.02)+(ROW/2-0.10)/2+0.10;
  var downFlightW=realDnZ1pre-realDnZ0pre;
  var skipGap=0.06;
  var ROOM_WIDEN=0.6;
  var mainCZ0=realDnZ0pre+0.03;   // v114: 옥탑방 -Z 벽을 다른 층 계단실 옆벽(zc-hw)과 같은 면(2cm 뒤)에 — 5층 옆벽과 옥상 옆벽이 한 면으로 이어지고 계단참 철문이 5층 벽에 가려지지 않는다
  var mainCZ1=realDnZ1pre+2.92;   // v111: +Z 벽을 데크 계단(시작 realDnZ1pre-0.08, 폭 2.95) 오른쪽에 딱 붙인다 — 계단과 벽 사이 공간 없음. v110의 +1.5m 확장 취소
  var wallZ1=mainCZ1-0.02;
  var freeZ0=realDnZ1pre+0.06, freeZ1=mainCZ1-0.3;
  /* 데크 왼쪽(-Z) 끝을 방 벽면까지 완전히 붙인다 — 예전엔 여유
     0.1m + 시작점 보정 때문에 벽과 데크 사이에 틈이 남아 있었다. */
  var zw=Math.max(0.1, (wallZ1-0.02)-freeZ0);
  var dz1=wallZ1-0.02, dz0=dz1-zw;
  var DKX1=mainCX1-0.02, DKX0=DKX1-1.90;   // v115: fpMakeRoofSkipFloor의 데크 깊이(1.90)와 동일하게
  var N=8, run=0.30;
  var stepX0=DKX0-N*run;
  return {x:(stepX0+DKX1)/2, z:(dz0+dz1)/2};
}
function fpRoofEsSpot(){
  var ST=BUILDING_Z_STRETCH, es=EMSTAIR_POS[5];
  if(!es) return null;
  var esz=es.z*ST, esx=(es.xWhole>0?1:-1);
  var ex0 = esx>0 ? (FP_WALL_X-0.25) : (-FP_WALL_X-3.3);
  var ex1 = esx>0 ? (FP_WALL_X+3.3)  : (-FP_WALL_X+0.25);
  return {x: (esx>0 ? ex0+0.9 : ex1-0.9), z: esz};
}
/* 스테인리스 난간 전용(요청 스펙) — 기존 fpMkPipe는 금속성 0.9/거칠기 0.1로
   고정돼 있어 살짝 더 반짝인다. 여기서는 metalness 0.85/roughness 0.2/
   color 0xd0d0d0로 정확히 맞춘 별도 파이프 함수를 쓴다. */
function fpMkPipeRail(len, r, axis, tilt){
  var env=fpEnsureEnvMap();
  var mat=new THREE.MeshStandardMaterial({color:0xD0D0D0, metalness:0.9, roughness:0.15,
    envMap:env, envMapIntensity:1.0});
  var geo=new THREE.CylinderGeometry(r, r, len, 12);
  var mb=new THREE.Mesh(geo, mat);
  if(axis==='x') mb.rotation.z=Math.PI/2+(tilt||0);
  else if(axis==='z') mb.rotation.x=Math.PI/2+(tilt||0);
  mb.castShadow=true;
  return mb;
}
/* ── 옥상 중앙계단 옥탑방 '뒤쪽'(철문을 등지고 돌아봤을 때) 스킵 플로어 ──
   실제로 오르내리는 중앙계단(fpMakeStairwell)은 이 방의 -Z쪽(뒤돌아봤을 때
   화면 오른쪽)에 이미 개구부·난간과 함께 자리 잡고 있다 — 그 자리를 다시
   짓지 않고 그대로 "내려가는 계단"으로 삼는다. 그 반대쪽(+Z, 뒤돌아봤을 때
   화면 왼쪽)의 비어 있는 공간에 낮은 복층(스킵 플로어)을 새로 짓는다.
   * 실제 사진 목표와 좌우가 반대로 보일 수 있다 — 이 방에서는 진짜 계단의
     자리가 이미 고정돼 있어(-Z쪽), 겹치지 않는 나머지 공간(+Z쪽)에 지었다. */
function fpMakeRoofSkipFloor(g, cx1, freeZ0, freeZ1, ko, wallZ1, stairZ0){
  var DKY=1.30, DKT=0.12;                 // 스킵 플로어 바닥 높이 · 두께. v107: 1.42→1.30 (실사진 비율)
  wallZ1 = (wallZ1!==undefined) ? wallZ1 : freeZ1;
  /* 뒷벽 전체 폭에 메쉬가 이어지도록, 예전에 있던 2.6m 상한을 없애고
     이 방에서 실제로 비어 있는 자리(freeZ0~freeZ1) 전체를 채운다. */
  /* 데크 왼쪽(-Z) 끝을 방 벽면까지 완전히 붙인다 — 예전엔 여유
     0.1m + 시작점 보정 때문에 벽과 데크 사이에 틈이 남아 있었다. */
  var zw=Math.max(0.1, (wallZ1-0.02)-freeZ0);
  /* 데크·계단 모두 실제 방의 우측 벽(wallZ1)에 밀착시킨다 —
     예전엔 자유공간 한가운데 떠 있어서 옆으로 여백이 남아 있었다. */
  var dz1=wallZ1-0.02, dz0=dz1-zw;
  var zc=(dz0+dz1)/2;
  var DKX1=cx1-0.02, DKX0=DKX1-1.90;      // 뒷벽(=창문 벽) 위에 밀착. v115: 깊이 1.90 — 데크 계단(8단×0.26=2.08m) 첫 단이 개구부 시작선보다 약 1.1m 안쪽(x≈4.3)에서 시작해, 5층에서 올라온 자리와 계단 사이에 바닥이 남는다
  /* v141: 데크 바닥 · 밑을 채운 공간 · 그 바닥 띠가 서로 다른 색·재질이라
     따로 노는 물건 세 개처럼 보였다 → 아래 한 쌍의 상수로 전부 통일한다.
     색은 옥탑방·계단실 벽과 같은 0xC9C0AE, 재질은 그 벽들이 쓰는 Phong(emissive)
     계열(fpMkPlane/fpMkBox의 emi 분기)로 맞춰, 데크와 채움면이 한 덩어리로 읽히게 한다. */
  var SKIN=0xC9C0AE, SKIN_EMI=0x39352B;
  /* 데크(무대형 상부 바닥) */
  var deck=fpMkBox(DKX1-DKX0, DKT, dz1-dz0, SKIN, 1, SKIN_EMI);
  deck.position.set((DKX0+DKX1)/2, DKY+DKT/2, zc); g.add(deck);
  /* v114: 데크 밑면은 조명이 위에만 있어 새까맣게 보였고, 5층 계단에서 올려다보면
     옥상 천장이 뚫린 것처럼 읽혔다 — 밝은 밑면 판(자체발광)을 붙여 아래 계단참의 천장처럼 보이게. */
  var deckUnder=fpMkPlane(DKX1-DKX0, dz1-dz0, SKIN, 1, SKIN_EMI);
  deckUnder.rotation.x=Math.PI/2; deckUnder.position.set((DKX0+DKX1)/2, DKY-0.006, (dz0+dz1)/2); g.add(deckUnder);
  var deckTop=fpMkBox(DKX1-DKX0-0.04, 0.01, dz1-dz0-0.04, SKIN, 1, SKIN_EMI);
  deckTop.position.set((DKX0+DKX1)/2, DKY+DKT+0.005, zc); g.add(deckTop);
  /* 앞 가장자리 마감 — 예전엔 바닥까지 이어지는 통짜 회색 박스로 막아서
     실사 사진과 반대로 "거대한 회색 블록"이 창문을 가리고 하부를 완전히
     막아버렸다(하부 개방, 창문이 보이도록 얇은 상단 띠만 남긴다). */
  /* v103(실사진 반영): 데크 앞면은 두꺼운 회색 띠가 아니라 얇은 흰색 보 — 높이 0.18, 벽에 가까운 밝은 톤 */
  var fascia=fpMkBox(0.06, 0.18, dz1-dz0, SKIN, 1, SKIN_EMI);
  fascia.position.set(DKX0-0.03, DKY+0.02, zc); g.add(fascia);
  /* 옆면(양 끝)도 마감해, 옆에서 보는 각도에서 "중간에 잘린" 것처럼 보이지
     않고 어느 방향에서 봐도 하나로 이어진 받침대로 읽히게 한다. */
  /* v97 버그 수정: 이 옆 마감띠를 데크 바깥쪽(f[0]+f[1]*0.03)으로
     내밀어 두었는데, 데크가 방 벽에 밀착된 뒤로는 -Z쪽 띠의 바깥 면이 옥탑방
     바깥 벽돌 껍질(cz0-0.04)과 정확히 같은 평면에 놓여, 옥상에서 벽돌 벽
     한가운데 회색 판이 비쳐 보였다(프레임 깨짐). 데크 안쪽으로 물려 넣고
     6mm만 내밀어, 데크 옆면은 덮되 벽에는 닿지 않게 한다. */
  [[dz0,-1],[dz1,1]].forEach(function(f){
    var sideFascia=fpMkBox(DKX1-DKX0, 0.18, 0.06, SKIN, 1, SKIN_EMI);   // v141: 데크·채움면과 같은 색·재질
    sideFascia.position.set((DKX0+DKX1)/2, DKY+0.02, f[0]-f[1]*0.024); g.add(sideFascia);
  });
  /* 데크 위 캐비닛/장롱 — 뒷벽에 바짝 붙여 배치. 데크가 방 전체 폭으로 넓어진
     뒤로는 캐비닛 하나만 덩그러니 있어 허전했다 — 레퍼런스 사진처럼
     캐비닛 옆에 포장된 자재·기대어 세운 패널·라디에이터 같은 잡동사니를
     더해 채운다. */
  /* 잡동사니를 데크 오른쪽(+Z, 계단 쪽) 끝으로 몰고, 실사진처럼
     물건 종류를 조금 더 늘린다. 왼쪽(-Z) 끝은 아래에서 다는 철문 앞 공간으로
     비워 둔다. 데크 위 모든 물건은 뒷벽(DKX1)에 등을 붙여 세운다. */
  (function(){
    var deckW=dz1-dz0, topY=DKY+DKT;
    var zR=dz1-0.15;                       // 오른쪽 끝(물건들이 채워 나가는 시작점)
    var zStop=dz0+1.45;                    // 왼쪽 끝은 철문 앞 공간으로 비워 둔다
    function backX(depth){ return DKX1-depth/2-0.04; }   // 뒷벽에 붙인 x
    /* ① 목재 캐비닛(장롱) — 맨 오른쪽 */
    var cw=Math.min(deckW*0.42, 2.6), cd=0.55, chh=1.15;
    var cz=zR-cw/2;
    /* 버그 수정: fpMkBox의 인자는 (X폭, Y높이, Z깊이)인데 여기만
       폭(cw=최대 2.6m)을 X에 넣어 뒀다 — 데크를 따라 놓여야 할 장롱이 뒷벽
       방향(X)으로 2.6m나 뻗어 나가, 옥탑방 벽을 뚫고 옥상 바깥으로 90cm쯤
       삐져나온 '허공에 뜬 검은 상자'가 됐다(밖에서 옥탑방 뒤로 돌아가면
       보이던 그것). 아래 줄눈(seam) 계산은 이미 cw를 Z방향으로 쓰고 있으므로
       상자 쪽 인자만 바로잡는다. */
    var cab=fpMkBox(cd, chh, cw, 0x6E5233, 1);
    cab.position.set(backX(cd), topY+chh/2, cz); g.add(cab);
    var nSeam=Math.max(2, Math.round(cw/0.9));
    for(var si=1; si<nSeam; si++){
      var seam=fpMkPlane(0.02, chh*0.86, 0x2A1D12, 0.85);
      seam.rotation.y=Math.PI/2;
      seam.position.set(DKX1-0.025, topY+chh*0.5, cz-cw/2+cw*si/nSeam); g.add(seam);
    }
    var zc2=cz-cw/2-0.20;                  // 다음 물건이 놓일 위치(왼쪽으로 진행)
    /* ② 회색 철제 사물함 2칸 — 실사진의 캐비닛 무리 */
    if(zc2-1.30>zStop){
      [0,0.62].forEach(function(off){
        var lk=fpMkBox(0.58, 1.75, 0.45, 0xA9ADA6, 1, 0x3A3D38);
        lk.position.set(backX(0.45), topY+0.875, zc2-0.29-off); g.add(lk);
        var hd=fpMkPlane(0.02, 0.12, 0x4A4E48, 1);
        hd.rotation.y=Math.PI/2;
        hd.position.set(DKX1-0.27, topY+1.05, zc2-0.29-off-0.16); g.add(hd);
      });
      zc2-=1.30;
    }
    /* ③ 파란 비닐로 포장된 자재 묶음 3개 */
    if(zc2-1.00>zStop){
      [0,0.34,0.66].forEach(function(off,pi){
        var ph=1.65-pi*0.28;
        var wrap=fpMkBox(0.30, ph, 0.42, 0x4A6FA5, 0.95);
        wrap.position.set(backX(0.42), topY+ph/2, zc2-0.16-off); g.add(wrap);
      });
      zc2-=1.00;
    }
    /* ④ 기대어 세운 흰 보양 패널(포스코 판넬처럼) 3장 */
    if(zc2-0.85>zStop){
      [0,0.24,0.48].forEach(function(off){
        var panel=fpMkBox(0.60, 1.75, 0.05, 0xEDEDE8, 1, 0x9A9C96);
        panel.rotation.x=-0.10;
        panel.position.set(DKX1-0.42, topY+0.875, zc2-0.12-off); g.add(panel);
      });
      zc2-=0.85;
    }
    /* ⑤ 종이 상자 더미(2단) + 하얀 방수포 더미 */
    if(zc2-0.90>zStop){
      [[0.52,0.38,0],[0.44,0.32,0.40]].forEach(function(b2){
        var bx2=fpMkBox(b2[0], b2[1], 0.46, 0xC49A62, 1, 0x6E5233);
        bx2.position.set(backX(0.46), topY+b2[2]+b2[1]/2, zc2-0.30); g.add(bx2);
      });
      var tarp=fpMkBox(0.52, 0.46, 0.48, 0xEDEDE6, 0.95);
      tarp.position.set(backX(0.48), topY+0.23, zc2-0.90); g.add(tarp);
      zc2-=1.15;
    }
    /* ⑥ 접어 세운 알루미늄 사다리 — 뒷벽에 기대 놓았다 */
    if(zc2-0.35>zStop){
      var lad=new THREE.Group();
      [-0.16,0.16].forEach(function(o){
        var rail=fpMkBox(0.05, 1.90, 0.05, 0xC9CDD1, 1, 0x6A6E72);
        rail.position.set(0, 0.95, o); lad.add(rail);
      });
      for(var ri=0; ri<6; ri++){
        var rung=fpMkBox(0.04, 0.03, 0.30, 0xC9CDD1, 1);
        rung.position.set(0, 0.28+ri*0.30, 0); lad.add(rung);
      }
      lad.rotation.x=-0.12;
      lad.position.set(DKX1-0.22, topY, zc2-0.20); g.add(lad);
      zc2-=0.55;
    }
    /* ⑦ 페인트 통 두 개 — 바닥에 굴러다니는 소품 */
    if(zc2-0.30>zStop){
      [[0,0.16],[0.34,0.13]].forEach(function(b3){
        var pail=new THREE.Mesh(new THREE.CylinderGeometry(b3[1],b3[1],0.30,14),
          new THREE.MeshStandardMaterial({color:0xD8D4CB, roughness:0.85}));
        pail.position.set(DKX1-0.30, topY+0.15, zc2-0.15-b3[0]); g.add(pail);
      });
    }
  })();
  /* 검은 철문을 뒷벽(DKX1)이 아니라 데크 왼쪽(-Z) 끝벽으로 옮기고,
     그 벽을 정면으로 보도록(판이 +Z를 향하게) 세운다.
     복도 강의실 문과 같은 톤(문짝 0x1A2029 / 문틀 0x39434E). */
  (function(){
    var topY=DKY+DKT, dW=0.95, dH=2.00;
    var dxc=(DKX0+DKX1)/2 + 0.28;          // 데크 가운데보다 살짝 뒷벽 쪽
    var zW=dz0+0.015;                       // 끝벽 안쪽면 바로 앞
    var fr=fpMkPlane(dW+0.16, dH+0.14, 0x39434E, 1);
    fr.position.set(dxc, topY+(dH+0.14)/2, zW); g.add(fr);
    var lf=fpMkPlane(dW, dH, 0x1A2029, 1);
    lf.position.set(dxc, topY+dH/2, zW+0.008); g.add(lf);
    /* 손잡이가 두 개(왼쪽 네모 판 + 오른쪽 둥근 손잡이)로 보여서
       한 문에 손잡이가 둘 달린 것처럼 어색했다 — 왼쪽 네모(원래는 경첩 표현)를
       없애고 오른쪽 둥근 손잡이 하나만 남기고, 위치도 조금 낮춘다. */
    var kb=new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8),
      new THREE.MeshStandardMaterial({color:0xB8BDC2, roughness:0.35, metalness:0.6}));
    kb.position.set(dxc+dW/2-0.13, topY+0.88, zW+0.030); g.add(kb);
    var kbR=fpMkDisc(0.045, 0xA6ABB0, 1);          // 손잡이 밑 둥근 좌판
    kbR.position.set(dxc+dW/2-0.13, topY+0.88, zW+0.016); g.add(kbR);
  })();
  /* 데크 아래(main floor 벽면) 하부 창문 2개 — 초록 알루미늄 프레임 + 밝은 유리 */
  function win(wz){
    var WW=1.35, WHt=0.95, wy=DKY*0.52, wx=cx1-0.02;
    var rec=fpMkPlane(WHt+0.10, WW+0.10, 0xDCD8CE, 1);
    rec.rotation.y=Math.PI/2; rec.position.set(wx-0.005, wy, wz); g.add(rec);
    var gl=fpMkPlane(WHt, WW, 0x9FD6BC, 0.95);
    gl.rotation.y=Math.PI/2; gl.position.set(wx-0.012, wy, wz); g.add(gl);
    var day=fpMkPlane(WHt-0.10, WW-0.10, 0xFFFFFF, 0.30);
    day.material.blending=THREE.AdditiveBlending; day.material.depthWrite=false;
    day.rotation.y=Math.PI/2; day.position.set(wx-0.02, wy, wz); g.add(day);
    [[0.05,WW+0.06,WHt/2,0],[0.05,WW+0.06,-WHt/2,0],
     [WHt+0.06,0.05,0,-WW/2],[WHt+0.06,0.05,0,WW/2]].forEach(function(f){
      var m=fpMkPlane(f[0], f[1], 0x3F8F63, 1);
      m.rotation.y=Math.PI/2; m.position.set(wx-0.02, wy+f[2], wz+f[3]); g.add(m);
    });
    var sill=fpMkBox(0.12, 0.05, WW+0.14, 0xE6E3DA, 1);
    sill.position.set(wx-0.06, wy-WHt/2-0.04, wz); g.add(sill);
  }
  /* 데크 아래 초록 프레임 창문 2개를 삭제한다 — 문을 등지고
     돌아봤을 때 벽에 초록 액자 두 개가 붙어 있는 것처럼 어색해 보였다.
     (win 함수 자체는 나중에 되살릴 수 있게 남겨 둔다) */
  /* win(dz0+0.65); win(dz1-0.65); */
  /* 오르는 계단(6단) — 메인 바닥(y=0.06)에서 자연스럽게 시작해 데크 앞
     가장자리까지, 우측(벽 쪽)에 밀착시킨다(첫 발판이 메인 바닥
     높이에서 시작하도록 기준 높이를 floorY로 맞춘다). */
  var floorY=0.06;
  var N=8, rise=(DKY-floorY)/N, run=0.26;   // v115
  /* 계단 폭이 2.2m로 묶여 있어 데크(zw)보다 좁았고, 그 차이만큼
     계단 옆에 아무것도 없는 바닥 띠가 남아 있었다 — 데크가 원래 덮던 폭
     (2.95m)까지 넓힌다. */
  /* v99, 실사진: 오르는 계단은 벽 쪽이 아니라 내려가는 계단(개구부)
     바로 옆에 붙는다 — 실사진처럼 오르는 계단과 내려가는 계단이 난간 하나를
     사이에 두고 나란히 놓인다. stairZ0(개구부 +Z 가장자리 바로 옆)이 넘어오면
     거기서부터 +Z로 계단 폭만큼, 아니면 예전처럼 벽에 밀착. */
  var SW, sZ0, sZ1;
  if(stairZ0!==undefined){ sZ0=stairZ0; SW=dz1-sZ0-0.02; sZ1=sZ0+SW; }   // v111: 벽까지 꽉 채운다(오른쪽 여유 없음)
  else { SW=Math.min(2.95, zw-0.05); sZ1=dz1; sZ0=sZ1-SW; }
  var stepZc=(sZ0+sZ1)/2;
  var stepX0=DKX0-N*run;
  fpRoofDeckGeo={x0:stepX0, x1:DKX0, x2:DKX1, z0:sZ0, z1:sZ1, y:DKY+DKT, fy:floorY};   // v122: 걷기 높이 계산용
  var stepTexBase=fpTerrazzoTex();
  for(var i=0;i<N;i++){
    var y=floorY+rise*(i+1);
    var st=fpMkSolid(run, y, SW, 0x8E8A80, 1);
    st.position.set(stepX0+run*(i+0.5), y/2, stepZc); g.add(st);
    /* 발판(디딤판) 표면은 단색 대신 바닥과 같은 화강석/도끼다시 텍스처를 입혀
       바닥과 자연스럽게 이어지는 콘크리트 계단으로 보이게 한다. */
    var trTex=stepTexBase.clone(); trTex.needsUpdate=true;
    trTex.repeat.set(Math.max(1,Math.round(run/0.30)), Math.max(1,Math.round(SW/0.30)));
    var tr=fpMkTex(run*0.98, SW, trTex, 1);
    tr.rotation.x=-Math.PI/2; tr.position.set(stepX0+run*(i+0.5), y+0.008, stepZc); g.add(tr);
    var rs=fpMkSolid(0.02, rise*0.95, SW, 0xB7B2A6, 1);
    rs.position.set(stepX0+run*i+0.006, y-rise/2, stepZc); g.add(rs);
    var no=fpMkPlane(0.05, SW, 0xE0BE2E, 1);              // 노란 단코(레퍼런스 계단 반영)
    no.rotation.x=-Math.PI/2;
    no.position.set(stepX0+run*i+0.045, y+0.014, stepZc); g.add(no);
  }
  /* 스테인리스 난간(요청 스펙: metalness 0.85 / roughness 0.2 / 0xd0d0d0) — 세로 살을
     촘촘히 박아 실제 건물용 난간처럼 보이게 한다. 벽 쪽(sZ1)은 이제 실제
     벽에 밀착돼 있어 난간이 필요 없으므로, 열린 쪽(sZ0) 한 줄만 세운다. */
  var RH=0.88;   // v106: 데크 앞 난간 높이 0.98→0.88 — 실사진의 난간 비율에 맞춰 낮춤
  function slopeRail(x0,x1,y0,y1,zs){
    var dxr=x1-x0, dyr=y1-y0, len=Math.sqrt(dxr*dxr+dyr*dyr), ang=Math.atan2(dyr,dxr);
    [0,-0.34].forEach(function(off){
      var bar=fpMkPipeRail(len, off===0?0.028:0.020, 'x', ang);
      bar.position.set((x0+x1)/2, (y0+y1)/2+RH+off, zs); g.add(bar);
    });
    var npS=Math.max(3, Math.round(len/0.16));
    for(var spi=0; spi<=npS; spi++){
      var spt=spi/npS;
      var po=fpMkPipeRail(RH, 0.018);
      po.position.set(x0+dxr*spt, y0+dyr*spt+RH/2, zs); g.add(po);
    }
  }
  /* 오름 계단 옆 난간을 삭제한다. */
  /* slopeRail(stepX0, DKX0, floorY, DKY, sZ0); */
  /* v103(실사진 반영): 데크 앞 가장자리에 스테인리스 난간을 다시 세운다 — 상단 손잡이 1줄 +
     촘촘한 세로 살. 오르는 계단이 도착하는 구간(sZ0~sZ1)은 비우고, 그 끝에 기둥 하나. */
  (function(){
    /* v110: 계단 양쪽 데크 앞면 모두(왼쪽 dz0~sZ0, 오른쪽 sZ1~dz1). 끝 기둥이 계단 손잡이와
       만나는 모서리 기둥이 된다. */
    [[dz0+0.03, sZ0-0.06],[sZ1+0.06, dz1-0.03]].forEach(function(seg){
      var rz0=seg[0], rz1=seg[1];
      if(rz1-rz0<0.3) return;
      var frontBar=fpMkPipeRail(rz1-rz0, 0.028, 'z');
      frontBar.position.set(DKX0+0.05, DKY+DKT+RH, (rz0+rz1)/2); g.add(frontBar);
      var npFront=Math.max(3, Math.round((rz1-rz0)/0.16));
      for(var fpi=0; fpi<=npFront; fpi++){
        var fpt=fpi/npFront;
        var po=fpMkPipeRail(RH, fpi===0||fpi===npFront?0.024:0.016);
        po.position.set(DKX0+0.05, DKY+DKT+RH/2, rz0+(rz1-rz0)*fpt); g.add(po);
      }
    });
  })();
  /* v110(실사진 반영): 오르는 계단 양옆 사선 손잡이 — 데크 앞 난간의 모서리 기둥까지 이어진다 */
  slopeRail(stepX0, DKX0, floorY, DKY, sZ0-0.06);   // v111: 오른쪽(sZ1)은 벽에 붙어 손잡이 없음
  /* v119: 계단 뒤쪽 — 데크 밑, 계단 꼭대기 옆면 아래 — 로 뚫려 보이던 빈 공간을 막는다.
     데크 앞면(DKX0)부터 뒷벽(DKX1)까지, 계단의 열린 옆면 선(sZ0)에 바닥~데크 밑면 높이의 벽판을 세운다. */
  (function(){
    /* v141: fpMkWallFlat(=fpMkPlane)은 이미 양면이라 두 장 겹칠 필요가 없다 —
       겹쳐 두면 반투명이 두 번 덧칠돼 그 면만 밝게 떠 보였다(요청하신 색 차이의 원인 하나). */
    var bw=fpMkWallFlat(DKX1-DKX0, DKY-floorY, SKIN, (DKX0+DKX1)/2, floorY+(DKY-floorY)/2, sZ0, 0); g.add(bw);
    /* v141: 이 바닥 띠만 fpMkBox의 Standard 분기(emi 생략)라 판들과 다른 톤이었다 → 같은 Phong으로 */
    var cap=fpMkBox(DKX1-DKX0, 0.04, 0.06, SKIN, 1, SKIN_EMI); cap.position.set((DKX0+DKX1)/2, floorY+0.02, sZ0); g.add(cap);
  })();
  /* v140: 데크 밑 마감을 '건물의 일부'로 보이게 — 주변 벽과 완전히 같은
     방식으로 짓는다. 옥탑방·계단실 벽은 모두 fpMkWallFlat(=fpMkPlane, 0xC9C0AE)로
     세워져 있고, 그 재질은 fpCorrMats에 등록돼 건물 전체와 함께 서서히 나타났다 사라진다.
       · v138 : 같은 색이지만 판을 2겹씩 겹쳐 세워(fpMkPlane은 이미 양면이라 불필요)
                반투명이 두 번 덧칠돼 그 면만 밝았고, 걸레받이는 다른 헬퍼(fpMkBox)라 또 다른 톤이었다.
       · v139 : 빛을 안 받는 MeshBasicMaterial이라 색은 균일했지만 주변 벽처럼
                조명·페이드를 따라가지 않아 '붙여 놓은 판'처럼 떠 보였다.
     → 면마다 한 장씩, 주변 벽과 똑같은 헬퍼로 세운다. */
  (function(){
    var uh = DKY - floorY;                       // 바닥 ~ 데크 밑면 높이
    if(uh < 0.1) return;
    var uy = floorY + uh/2, WALLC = SKIN;        // 데크·바닥 띠와 완전히 같은 색 상수
    /* ① 데크 앞면(DKX0) — 계단이 도착하는 면 */
    g.add(fpMkWallFlat(dz1-dz0, uh, WALLC, DKX0, uy, zc, Math.PI/2));
    /* ② 데크 -Z쪽 끝(dz0) — v119 판(sZ0)은 계단 폭 기준이라 이 14cm 틈이 남아 있었다 */
    g.add(fpMkWallFlat(DKX1-DKX0, uh, WALLC, (DKX0+DKX1)/2, uy, dz0, 0));
  })();
  /* v117: 개구부 시작선 ~ 데크 계단 첫 단 사이의 바닥 가장자리(개구부 +Z 변)에도
     난간 — 사선 손잡이와 같은 선(sZ0-0.06) 위에 수평으로 이어져, 5층에서 올라와 데크 계단으로
     걸어가는 구간에서 개구부 쪽이 트여 있지 않게 한다. */
  (function(){
    var hx0=FP_WALL_X+FP_ST_LAND-0.10+0.03, hx1=stepX0-0.04, hz=sZ0-0.06;
    if(hx1-hx0<0.25) return;
    var top=fpMkPipeRail(hx1-hx0, 0.028, 'x');
    top.position.set((hx0+hx1)/2, floorY+RH, hz); g.add(top);
    var np=Math.max(2, Math.round((hx1-hx0)/0.16));
    for(var i=0;i<=np;i++){
      var t=i/np;
      var po=fpMkPipeRail(RH, (i===0||i===np)?0.024:0.016);
      po.position.set(hx0+(hx1-hx0)*t, floorY+RH/2, hz); g.add(po);
    }
  })();
  /* v112: 데크 계단 앞 노란 점자 발판 제거 — 실사진에 없음 */
  /* 이 구역 전용 은은한 채움광(전면 문쪽 조명과는 별도로, 뒤쪽까지 고르게) */
  var fill=new THREE.PointLight(0xF4F1E9, 0.20, 9);
  fill.position.set((DKX0+cx1)/2, DKY+0.9, zc); g.add(fill);
}
function fpMakeHeadhouse(g, cx0, cx1, cz0, cz1, ko, label, hhOpt, mezVoid, farPad, mainStair){
  var HH=(hhOpt||2.95), wallC=0x8E5140;
  var mx=(cx0+cx1)/2, mz=(cz0+cz1)/2, dx=cx1-cx0, dz=cz1-cz0;
  /* 옥탑방 안쪽은 옥상 바깥 초록 방수 바닥이 아니라 회색 실내 바닥이어야 한다
     (사진 반영 — 문 열고 나가기 전까지는 초록 바닥이 보이면 안 된다).
     초록 바닥(y=0.02)과 높이차가 1cm뿐이라 넓은 면에서 z-파이팅으로 초록이
     얼룩덜룩 비쳐 올라왔다 → 충분히 띄우고 방보다 살짝 넓게 깐다. */
  if(mezVoid){
    /* 복층 아래로 내려가는 장식 계단이 바닥 밑에 파묻혀 보이던 문제 해결 —
       바닥 Plane에 계단실 개구부(사각 구멍)를 실제로 뚫는다(Shape+hole). */
    var hx0=mezVoid.x0, hx1=mezVoid.x1, hz0=mezVoid.z0, hz1=mezVoid.z1;
    var fx0=mx-dx/2-0.15, fx1=mx+dx/2+0.15, fz0=mz-dz/2-0.15, fz1=mz+dz/2+0.15;
    /* 주의: 이 메쉬는 rotation.x=-Math.PI/2 로 눕히므로 Shape의 로컬 Y가 월드 -Z로
       매핑된다(즉 world Z = -localY). 실제 z좌표를 그대로 moveTo/lineTo에 넣으면
       바닥과 구멍이 반대쪽(-Z)에 그려져, 정작 서 있는 자리엔 바닥이 없어서 그
       틈으로 옥상 바깥 초록 바닥이 훤히 비쳐 보이는 문제가 있었다 — 부호를
       뒤집어(-z) 넣어야 회전 후 원래 의도한 월드 Z에 맞게 놓인다. */
    var shp=new THREE.Shape();
    shp.moveTo(fx0,-fz0); shp.lineTo(fx1,-fz0); shp.lineTo(fx1,-fz1); shp.lineTo(fx0,-fz1); shp.closePath();
    var hole=new THREE.Path();
    hole.moveTo(hx0,-hz0); hole.lineTo(hx1,-hz0); hole.lineTo(hx1,-hz1); hole.lineTo(hx0,-hz1); hole.closePath();
    shp.holes.push(hole);
    var fgeo=new THREE.ShapeGeometry(shp);
    var fpos=fgeo.attributes.position;
    var fuv=fgeo.attributes.uv;
    for(var vi=0; vi<fpos.count; vi++){
      fuv.setXY(vi, (fpos.getX(vi)-fx0)/(fx1-fx0), (-fpos.getY(vi)-fz0)/(fz1-fz0));
    }
    /* v110(실사진 반영): 옥탑방 바닥도 5층 계단참과 같은 테라조(도끼다시) — 개구부 경계에서 재질이 끊기지 않게 */
    var ftex=fpTerrazzoTex().clone(); ftex.needsUpdate=true;
    ftex.repeat.set(Math.max(1,Math.round((fx1-fx0)/0.30)), Math.max(1,Math.round((fz1-fz0)/0.30)));
    ftex.wrapS=ftex.wrapT=THREE.RepeatWrapping;
    var fmat=new THREE.MeshStandardMaterial({map:ftex, roughness:0.55, metalness:0.05});
    var inFl=new THREE.Mesh(fgeo, fmat);
    inFl.rotation.x=-Math.PI/2; inFl.position.y=0.06; g.add(inFl);
    /* v114: 이 바닥판은 윗면만 그려져서, 5층 계단에서 개구부를 통해 올려다보면 바닥이
       투명하게 뚫려 옥탑방 안(데크 계단 밑면 등)이 그대로 보였다("옥상 천장이 뚫려 보인다").
       같은 모양의 밑면 판(아래 계단실 천장 역할, 자체발광 밝은 색)을 바닥 바로 아래에 깐다. */
    var fUnderMat=new THREE.MeshPhongMaterial({color:0xDAD6CD, emissive:0x8E8A82, emissiveIntensity:0.45, side:THREE.BackSide});
    var inFlU=new THREE.Mesh(fgeo, fUnderMat);   // 윗판과 같은 회전(구멍 위치가 같도록) + BackSide로 아래에서만 보이게
    inFlU.rotation.x=-Math.PI/2; inFlU.position.y=-0.01; g.add(inFlU);
    /* 개구부 3면(문 반대쪽 벽에 붙지 않은 면)에 짧은 수직 스커트를 대 구멍이
       종잇장처럼 얇지 않고 실제 바닥 두께가 있는 것처럼 보이게 한다. */
    var skirtH=0.10, skirtC=0xC9C0AE;   // v103: 얇게·벽과 같은 톤 — 회색 두꺼운 테두리가 '별도 틀'처럼 읽히던 것 완화
    function skirt(x0s,x1s,z0s,z1s,rot){
      var sk=fpMkPlane(Math.max(x1s-x0s, z1s-z0s), skirtH, skirtC, 1);
      sk.rotation.y=rot; sk.position.set((x0s+x1s)/2, 0.06-skirtH/2, (z0s+z1s)/2); g.add(sk);
    }
    skirt(hx0,hx1,hz1,hz1,0);           // 계단 안쪽(먼 쪽) 면
    skirt(hx1,hx1,hz0,hz1,Math.PI/2);   // +X 쪽(계단 안쪽 끝)
    // -X 쪽(hx0)은 실제 계단 첫 단과 같은 높이로 자연스럽게 이어지므로 스커트 없음
    /* 개구부 가장자리 스테인리스 난간 — 문에서 걸어 들어오는 쪽(-X, 계단 첫 단과
       바닥이 같은 높이라 걸려 넘어질 일 없는 면)만 비우고 나머지 3면(양옆 Z·
       계단 안쪽 끝 +X)을 막는다.
       사각 박스가 아니라 진짜 원통(CylinderGeometry) 파이프로 짓고, 사진처럼
       확실히 반짝이도록 금속성/거칠기를 더 높인다(metalness 0.9 / roughness 0.1). */
    var VRH=0.98, VRC=0xd0d0d0;
    /* 이 개구부는 fpMakeStairwell(roofOpen)이 짓는 실제 계단실 자체에도 이미
       똑같은 위치(WD 긴 변 양쪽)에 파이프 난간이 서 있다 — 옥탑방 바닥에서
       또 한 겹 난간을 두르면 완전히 겹쳐 두꺼운 흰 울타리처럼 보였다(요청
       반영: 구멍을 두른 펜스 완전 제거). 계단실 자체 난간에게 맡기고 여기서는
       짓지 않는다. */
    /* 점자블록이 방 전체를 가로지르는 긴 띠라 실사 사진보다 훨씬 과했다
 — 개구부 앞 짧은 패드 정도로 줄인다. */
    /* v127: 개구부 시작선 옆에 붙어 있던 작은 점자 패드(0.42×0.9) 제거 — 계단 꼭대기
       노란 논슬립 띠와 겹쳐 두 줄로 보였다. 노란 띠 하나만 일자로 남긴다. */
  }else{
    var floorTex2=fpEnsureFloorTileTex().clone(); floorTex2.needsUpdate=true;
    floorTex2.repeat.set(Math.max(1,Math.round(dx/0.45)), Math.max(1,Math.round(dz/0.45)));
    var floorMat2=new THREE.MeshStandardMaterial({map:floorTex2, roughness:0.55, metalness:0.05});
    var inFl=new THREE.Mesh(new THREE.PlaneGeometry(dx+0.3, dz+0.3), floorMat2);
    inFl.rotation.x=-Math.PI/2; inFl.position.set(mx, 0.06, mz); g.add(inFl);
  }
  function brickWall(w,h,px,py,pz,roty,noSkirt){
    /* 완벽한 흰색은 레퍼런스 사진보다 밝고 납작해 보인다 — 차분한 오프화이트로
       톤다운(요청 스펙 #D5D2CA)한다. */
    var m=fpMkWallFlat(w,h,0xC9C0AE,px,py,pz,roty); g.add(m);   // v126: 계단실 벽과 같은 재질(회벽 텍스처 대신)   // v102: 옥탑방 실내 벽도 계단실(cWall 0xC9C0AE)과 같은 색으로 — 옥상↔5층이 한 공간으로 이어져 보이게
    /* 진회색 걸레받이 몰딩(요청 스펙 #2C2C2C, 높이 10cm) — 벽면보다 살짝
       카메라 쪽으로 당겨 붙여서 z-파이팅 없이 뚜렷한 몰딩 선으로 보이게 한다. */
    var off=0.004;
    var sx=px+(roty===Math.PI/2?off:(roty===-Math.PI/2?-off:0));
    var sz=pz+(roty===0?off:(roty===Math.PI?-off:0));
    if(noSkirt) return;   // v116: 개구부 위 뒷벽은 걸레받이 생략(아래 계단실 벽과 같은 평면에서 z-파이팅 → 검은 띠)
    var skirt=fpMkPlane(w,0.10,0x3A3532,1);
    skirt.rotation.y=roty||0; skirt.position.set(sx,0.05,sz); g.add(skirt);
  }
  /* 실사진(옥탑방 바깥쪽 — 붉은 벽돌)을 반영해, 위 brickWall이
     짓는 안쪽 면(베이지) 바로 바깥쪽에 붉은 벽돌 텍스처 껍질을 한 겹 더
     씌운다. 안쪽 벽과 겹치지 않게 0.03m 더 바깥으로 밀어서 세우므로, 방
     안에서는 여전히 베이지 벽만 보이고(더 가까운 면이 가림) 문을 열고
     나간 바깥에서는 이 벽돌 면이 보인다. */
  function brickWallOuter(w,h,px,py,pz,roty){
    var tex=fpBrickExteriorTex().clone(); tex.needsUpdate=true;
    /* 벽돌이 듬성듬성해 보였다 — 반복 밀도를 훨씬 촘촘하게 올려
       실제 적벽돌처럼 자잘하게 보이게 한다. */
    tex.repeat.set(Math.max(1,Math.round(w/0.55)), Math.max(1,Math.round(h/0.30)));
    var mat=new THREE.MeshStandardMaterial({color:0xFFFFFF, map:tex, roughness:0.94, metalness:0.02,
      side:THREE.DoubleSide});
    var m=new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat);
    m.rotation.y=roty||0; m.position.set(px,py,pz); g.add(m);
  }
  /* 문쪽(-X) 벽은 원래 cx0-0.01(거의 방 경계선)에 서 있었는데, 문틀·문짝·손잡이·
     트랜섬·EXIT 표지판 등 문 부속 전체가 그보다 더 바깥쪽(cx0-0.05 ~ -0.18, 특히
     손잡이가 cx0-0.175까지 튀어나옴)에 배치돼 있었다 — 즉 문이 이 벽보다 뒤(바깥)에
     있어서, 방 안(x가 더 큰 쪽)에서 문을 바라보면 이 불투명한 벽 한 장이 문 전체를
     완전히 가려 버렸다("문이 없다"의 정체). 벽을 문 부속 전체보다 더 바깥쪽으로
     밀어내어, 문이 벽보다 방 안쪽(카메라 쪽)에 오도록 한다. */
  /* 버그 수정: "문쪽 벽"을 dz 폭 그대로 통짜 판으로 지으면, 문
     자체는 그 앞에 별도로 지어지는 작은 문틀(frGeo, 문 폭만큼만 구멍 뚫림)
     뒤에 이 통짜 벽이 그대로 남아 있어 — 문을 열어도 그 뒤에 뚫리지 않은
     벽이 가로막고 있어 바깥이 안 보이고 지나갈 수도 없었다(옥상 밖으로
     나가는 동선이 없던 그동안은 아무도 알아채지 못한 잠복 버그). 문틀과
     같은 폭(doorHalf*2)만큼은 벽을 비워 실제로 뚫려 있게 한다. */
  var doorHalf=1.08;   // frW/2와 동일(문 폭 1.92 + 여유 0.24)
  brickWall(mz-doorHalf-cz0, HH, cx0-0.22, HH/2, (cz0+(mz-doorHalf))/2, Math.PI/2);
  brickWall(cz1-(mz+doorHalf), HH, cx0-0.22, HH/2, ((mz+doorHalf)+cz1)/2, Math.PI/2);
  /* 버그 수정: 문 자리를 비울 때 바닥부터 천장까지 통째로 비워 놨는데,
     문틀(바깥 테두리 높이 frH-0.10 = 2.46m)은 천장(HH)까지 닿지 않는다 —
     그 사이(2.46m~천장)가 벽 없이 뻥 뚫려서, 문 위로 옥상 하늘과 바깥 차양
     콘크리트가 그대로 비쳐 보였다("문 위 프레임이 깨져 보인다"의 정체).
     문 위 인방(lintel)만큼 벽을 채운다. 걸레받이가 딸려 오면 문간 허공에
     뜨므로 brickWall 대신 벽면만 직접 만든다. */
  /* 문틀 바깥 테두리가 문짝(2.16m) 위로 더 올라가는 양 — 아래 문틀 생성부의
     frH와 반드시 같은 값을 써야 한다(예전엔 양쪽에 0.40을 따로 적어 뒀다).
     문 위 트랜섬(채광창)을 '덧댄 판'이 아니라 문틀에 실제로 뚫은
     개구부로 바꾸면서, 그 구멍이 들어갈 자리만큼 문틀 상부를 키운다. */
  var DOOR_HEAD_EXTRA = 0.56;
  var DOOR_LINTEL_Y = (2.16+DOOR_HEAD_EXTRA)-0.10;   // 문틀 바깥 테두리 윗변(frH-0.10)과 동일
  if(HH-DOOR_LINTEL_Y > 0.02){
    /* 폭은 비워 둔 자리(doorHalf*2)와 정확히 같게 — 조금이라도 넓게 하면
       옆 벽과 겹친 만큼이 한 단 튀어나온 것처럼 보인다. */
    g.add(fpMkWallFlat(doorHalf*2, HH-DOOR_LINTEL_Y, 0xC9C0AE,
                      cx0-0.22, (DOOR_LINTEL_Y+HH)/2, mz, Math.PI/2));
  }
  /* 버그 수정, 근본 원인: 이 cx1 벽(및 계단실 자체가 같은 위치에
     짓는 맞은편 벽)이 방 실사용 폭(dz)만큼만 뻗어 있었다 — 그런데 계단을
     내려가며 반대쪽 단으로 돌아서는 지점은 바로 이 벽 코앞(가로 0.1~0.2m
     거리)이라, 그렇게 가까운 자리에서 화면 시야각(FOV)이 넓게 벌어지면
     시선이 벽 폭 끝(z=dz 부근)보다 훨씬 먼 지점(계산상 4m 이상 더 먼 곳)을
     스치듯 지나가며 벽이 끝나는 가장자리 '밖'을 보게 된다 — 그 너머엔 벽이
     전혀 없어 옥상 바깥 하늘·산이 그대로 보였다("프레임이 깨진다"의 정체).
     벽 자체를 필요한 실사용 폭보다 넉넉히(양쪽으로 4m씩) 길게 만들어, 이런
     가까운 거리·넓은 화각의 스침 각도에서도 항상 벽 안에 들어오게 한다. */
  /* 이 여유폭(4m)은 옥상 데크에서 보면 옥탑방 옆으로 삐져나온
     '허공에 뜬 큰 판'으로 보인다 — 계단실 자체 옆벽이 이미 시야를 막아 주는
     비상계단 옥탑방에서는 호출 쪽에서 farPad로 줄여 쓴다. */
  /* 이 여유폭을 4m나 주었더니, 옥상 데크에서 옥탑방 옆을 지나갈 때
     방보다 8m나 긴 벽 한 장이 허공에 떠서 이어지는 것처럼 보였다("옥상 뒤쪽에
     이상한 벽"). 옆벽(cz0/cz1)이 이미 같은 모서리를 막고 있으므로 여유폭은
     모서리를 확실히 물리는 정도(0.25m)면 충분하다. */
  var FAR_WALL_PAD=(farPad!==undefined)?farPad:0.25;
  brickWall(dz+FAR_WALL_PAD*2, HH, cx1+0.01, HH/2, mz, -Math.PI/2, mainStair);   // v116: 중앙계단 옥탑방 뒷벽은 걸레받이 없이(개구부 위 검은 띠의 원인)
  brickWall(dx, HH, mx, HH/2, cz0-0.01, Math.PI);
  brickWall(dx, HH, mx, HH/2, cz1+0.01, 0);
  /* 버그 수정: 옥탑방 벽은 y=0~HH 구간에만 있었다 — 그래서 옥상에서
     계단을 타고 슬래브 아래로 내려가는 순간 사방이 트여 바깥 하늘·산·배경
     땅면이 그대로 비쳐 보였다(예전에 이 벽 폭을 4m씩 넓혀 뒀던 것도 같은 증상을
     가리려던 대응이었는데, 원인이 '폭'이 아니라 '높이'라 실제로는 낫지 않았다).
     한 개 층 깊이만큼 벽을 아래로 연장한다 — 계단 개구부(realDn*)보다 바깥
     경계에 있으므로 내려가는 계단 자체를 가리지 않는다. */
  (function(){
    var SK=4.4, skY=-SK/2, SKC=0xC9C6BE;
    g.add(fpMkWallLit(dz+0.12, SK, SKC, cx1+0.01, skY, mz, -Math.PI/2));
    g.add(fpMkWallLit(dx+0.12, SK, SKC, mx, skY, cz0-0.01, Math.PI));
    g.add(fpMkWallLit(dx+0.12, SK, SKC, mx, skY, cz1+0.01, 0));
    g.add(fpMkWallLit(dz+0.12, SK, SKC, cx0-0.22, skY, mz, Math.PI/2));
  })();
  /* 문쪽 벽을 0.21m 뒤로 물리면서 양옆 벽과 만나는 모서리에 그만큼 틈이
     생겼다 — 그 틈만큼 짧은 리턴(귀퉁이) 벽 두 장으로 메운다. */
  /* 버그 수정: 문쪽 벽(cx0-0.22)과 옆벽(cz0/cz1)이 만나는 모서리를
     0.22m짜리 조각 하나로만 막아 두어서, 각도에 따라 그 사이로 바깥이 비치는
     가느다란 세로 틈이 보였다 — 조각을 넉넉히(0.50m) 키워 확실히 겹치게 한다. */
  /* 버그 수정: 조각을 키울 때 바깥(-X)으로 늘렸더니 문쪽 벽면보다
     0.22m 튀어나와, 옥상 밖에서 보면 벽 모서리에 벽돌 한 줄이 삐죽 나와
     보였다 — 바깥쪽 끝은 벽면(cx0-0.22)에 딱 맞추고 안쪽(+X)으로만 늘린다. */
  brickWall(0.50, HH, cx0+0.03, HH/2, cz0-0.01, Math.PI);
  brickWall(0.50, HH, cx0+0.03, HH/2, cz1+0.01, 0);
  /* 실사진처럼 옥탑방 바깥은 붉은 벽돌 — 위 안쪽 베이지 벽
     바로 바깥에 벽돌 껍질을 덧씌운다(문쪽 벽만 해당 — 문을 열고 나가면
     정면으로 보이는 면이라 가장 눈에 띈다. 나머지 3면은 난간 밖이라
     평소 시야에 잘 안 들어와 생략해 부담을 줄인다). 안쪽 벽과 마찬가지로
     문 폭만큼은 비워 실제로 뚫려 있게 한다. */
  var OUT=0.03;
  brickWallOuter(mz-doorHalf-cz0, HH, cx0-0.22-OUT, HH/2, (cz0+(mz-doorHalf))/2, Math.PI/2);
  brickWallOuter(cz1-(mz+doorHalf), HH, cx0-0.22-OUT, HH/2, ((mz+doorHalf)+cz1)/2, Math.PI/2);
  /* 버그 수정: 이 두 귀퉁이(리턴) 벽은 안쪽 베이지 벽과 '똑같은 z'에
     놓여 있었다 — OUT(0.03) 오프셋을 X로만 줬는데 이 면은 ±Z를 보는 면이라
     아무 소용이 없었고, 두 판이 같은 평면에서 z-파이팅을 일으켜 실내 벽
     모서리에 붉은 벽돌 줄무늬가 번져 보였다("벽 모서리 프레임이 깨져 보인다"의
     정체). 바깥 벽돌 껍질을 바깥쪽(±Z)으로 밀어 겹치지 않게 한다. */
  brickWallOuter(0.50, HH, cx0+0.03-OUT, HH/2, cz0-0.01-OUT, Math.PI);
  brickWallOuter(0.50, HH, cx0+0.03-OUT, HH/2, cz1+0.01+OUT, 0);
  /* 예전에는 문쪽 한 면에만 벽돌 외피를 씌우고 나머지 3면은
     생략했다(난간 밖이라 안 보인다고 봤다). 그런데 철문을 열고 옥상 데크를
     돌아다닐 수 있게 된 뒤로는, 옆·뒤에서 보면 실내용 베이지 벽 한 장이
     덩그러니 서 있는 것처럼 보였다("이상한 벽"). 네 면 모두 벽돌로 마감해
     밖에서 보면 하나의 건물 덩어리로 읽히게 한다. */
  brickWallOuter(dz+0.12, HH, cx1+0.01+OUT, HH/2, mz, -Math.PI/2);
  brickWallOuter(dx+0.12, HH, mx, HH/2, cz0-0.01-OUT, Math.PI);
  brickWallOuter(dx+0.12, HH, mx, HH/2, cz1+0.01+OUT, 0);
  // 바깥쪽(벽돌 면)도 문 위 인방만큼 같이 막는다 — 안 그러면 밖에서 볼 때 똑같이 뚫려 보인다
  if(HH-DOOR_LINTEL_Y > 0.02){
    brickWallOuter(doorHalf*2, HH-DOOR_LINTEL_Y, cx0-0.22-OUT,
                   (DOOR_LINTEL_Y+HH)/2, mz, Math.PI/2);
  }
  /* 콘크리트 파라펫 몰딩 — 옥탑방 꼭대기 네 면을 모두 두르는 밝은 회색 띠(사진 반영) */
  (function(){
    var copeH=0.14, copeC=0xC7C4B8, copeY=HH+copeH/2, ov=0.03;
    var cp1=fpMkPlane(dz+0.5, copeH, copeC, 1); cp1.rotation.y=Math.PI/2;
    cp1.position.set(cx0-0.22-OUT-0.02, copeY, mz); g.add(cp1);
    var cp2=fpMkPlane(dz+0.06, copeH, copeC, 1); cp2.rotation.y=-Math.PI/2;
    cp2.position.set(cx1+0.01+0.02, copeY, mz); g.add(cp2);
    var cp3=fpMkPlane(dx+0.06, copeH, copeC, 1); cp3.rotation.y=Math.PI;
    cp3.position.set(mx, copeY, cz0-0.01-ov); g.add(cp3);
    var cp4=fpMkPlane(dx+0.06, copeH, copeC, 1);
    cp4.position.set(mx, copeY, cz1+0.01+ov); g.add(cp4);
  })();
  /* 삭제: 철문 위에 달아 두었던 콘크리트 캐노피(어닝)를 없앤다 —
     옥상 데크에서 옥탑방 옆을 지나며 보면, 처마가 아니라 벽돌 벽 위쪽에
     덩그러니 붙은 갈색 상자처럼 보였다. */
  /* 문 옆 '금연구역' 표지판 삭제 */
  /* 문 좌측 벽면에 흰 프레임 유리창(사진 반영) — 창틀은 무광 흰색,
     유리는 낮은 roughness/약간의 metalness로 은은한 반사감을 준다. */
  /* 삭제: 비상계단 옥탑방 바깥 벽에 붙어 있던 이 유리창은 실제
     사진에 없고 회색 판때기처럼만 보인다 — 중앙계단 옥탑방에만 남긴다. */
  /* 삭제: 중앙계단 옥탑방 문 옆에 남겨 두었던 이 흰 프레임 유리창도
     없앤다 — 옥상 데크에서 보면 벽돌 벽에 회색 판 하나가 덧대어진 것처럼만
     보였다(비상계단 쪽은 앞서 같은 이유로 이미 지웠다). 이제 문쪽 벽은
     철문과 그 위 인방만 있는 깔끔한 벽돌 면이 된다. */
  /* 옥상 철문 왼쪽 벽(문을 마주보고 섰을 때 왼쪽 = +Z)에 실사진처럼
     '금연구역' 안내문 한 장을 붙인다 — 흰 종이 + 붉은 금연 픽토그램 + 붉은 글씨.
     실내 쪽 벽면(cx0-0.22)보다 살짝 앞(+X)에 붙여 z-파이팅을 피한다. */
  (function(){
    /* 예전 크기(가로 25cm)로는 문 앞에서 봤을 때 벽에 붙은 흰 점처럼
       보여 안내문인지 알아볼 수 없었다 — 실제 게시물 크기(A3 정도)로 키우고,
       문틀에서 조금 더 가깝게 붙여 문을 마주보면 바로 눈에 들어오게 한다. */
    /* 더 왼쪽(+Z)으로 옮기고 크기도 한 단계 더 키운다. */
    /* 문 옆 좁은 벽에 붙어 있던 걸 옆벽(+Z) 넓은 면 한가운데로 옮긴다 —
       문 옆 자리는 폭이 0.77m뿐이라 확대한 안내문이 벽 모서리 밖으로 삐져나왔다. */
    /* 한 단계 더 키운다(2.15 → 2.95). 종이 크기는 약 0.80 x 1.03m —
       옥탑방 왼쪽 벽(가로 8.8m / 높이 3.05m) 안에 넉넉히 들어가고, 철문 앞에서
       바라볼 때 글씨와 금연 픽토그램이 바로 읽힌다. */
    var S=2.95;                            // 예전 대비 확대 배율(2.15 → 2.95)
    var sx=cx0+1.45;                       // 옆벽 위, 문에서 조금 안쪽
    /* 옥탑방 안에는 계단실 자체의 옆벽(fpMakeStairwell의 zc+hw)이 방 벽(cz1)보다
       더 안쪽에 한 겹 더 서 있다 — 방 벽 기준으로 붙이면 그 벽 뒤에 가려서
       아예 안 보인다. 실제로 보이는 면(둘 중 더 안쪽)에 붙인다. */
    /* 버그 수정: 중앙계단 옥탑방은 계단실이 방 한복판에 뚫린
       개구부라, 계단실 자체의 옆벽을 바닥 위로는 아예 세우지 않는다
       (fpMakeStairwell의 roofOpen 분기 — 슬래브 아래 pit 벽만 있다).
       그런데 여기서는 그 '없는 벽' 자리(z≈5.93)를 기준으로 안내문을 붙이고
       있어서, 방 안에서 보면 종이가 벽이 아니라 허공에 떠 있었다.
       중앙계단 쪽은 실제로 서 있는 방 왼쪽 벽(cz1)에 딱 붙이고,
       비상계단 옥탑방만 예전처럼 한 겹 더 안쪽에 서 있는 계단실 옆벽
       기준으로 잡는다(그쪽은 roofOpen이 아니라 자체 벽이 실제로 있다). */
    var __zwall = mainStair
      ? cz1
      : ((EMSTAIR_POS[5]?EMSTAIR_POS[5].z*BUILDING_Z_STRETCH:0) + (FP_EM_OW*1.15/2+0.03));
    var sz=Math.min(cz1, __zwall) - 0.01;
    var sy=1.55;                           // 눈높이
    var ROT=Math.PI;                       // 판의 앞면이 방 안(-Z)을 보게
    /* 안내문 한 장(종이 전체가 그려진 텍스처) + 뒤에 얇은 그림자 테두리 판 */
    var shW=0.27*S, shH=0.35*S;
    var shBk=fpMkPlane(shW+0.035, shH+0.035, 0xCFCCC2, 1);
    shBk.rotation.y=ROT; shBk.position.set(sx, sy, sz); g.add(shBk);
    var shPg=fpMkTex(shW, shH, fpNoSmokeTex(ko), 1);
    shPg.rotation.y=ROT; shPg.position.set(sx, sy, sz-0.006); g.add(shPg);
  })();
  /* 문 앞 옥상 바닥의 잡동사니(사진 반영: 의자·박스 더미·쓰레기통) —
     간단한 상자 조합으로 분위기만 낸다.
     버그 수정: "비상계단 옥상 외부에는 이 장식들이 안 어울린다"는
     지적에 따라 중앙계단에서만 짓도록 mezVoid로 걸어 뒀었는데, 비상계단
     옥탑방도 바닥 개구부를 뚫느라 mezVoid를 똑같이 넘겨받고 있어서 조건이
     전혀 걸러지지 않았다 — 호출 쪽에서 명시적으로 넘기는 mainStair로 바꾼다. */
  if(mainStair) (function(){
    /* 의자·박스 더미·쓰레기통이 철문 바로 앞에 붙어 있어
       문을 열고 나서면 곧장 걸리는 자리였다 — 옥상 바깥(-X) 쪽으로
       1.0m 더 물리고, 문 정면 통로에서도 살짝 비켜 놓는다. */
    var deckX=FP_ROOF_OUT-1.15, floorY=0.02;
    /* 버그 수정: 의자가 공중에 떠 보였다 — 다리 4개를 바닥(floorY)에
       정확히 닿게 다시 세우고, 좌판 높이도 다리 위에 맞춘다. */
    var seatH=0.44, seatCx=deckX-0.3, seatCz=mz+0.9;
    var chSeat=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.05,0.42),
      new THREE.MeshStandardMaterial({color:0x3D5A8C, roughness:0.7}));
    chSeat.position.set(seatCx, floorY+seatH, seatCz); g.add(chSeat);
    var chBack=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.36,0.05),
      new THREE.MeshStandardMaterial({color:0x3D5A8C, roughness:0.7}));
    chBack.position.set(seatCx, floorY+seatH+0.18, seatCz+0.19); g.add(chBack);
    var legMat=new THREE.MeshStandardMaterial({color:0xB9BBBD, roughness:0.4, metalness:0.6});
    [[-0.17,-0.17],[0.17,-0.17],[-0.17,0.17],[0.17,0.17]].forEach(function(off){
      var leg=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,seatH,6), legMat);
      leg.position.set(seatCx+off[0], floorY+seatH/2, seatCz+off[1]); g.add(leg);
    });
    // 박스 더미
    /* 버그 수정: '+' 오프셋이 실제로는 실내(+X) 방향이라, 박스·
       쓰레기통·실외기가 문 밖이 아니라 안쪽 로비에 그대로 들어와 있었다
       (원형 탁자 옆 "이상한 박스"의 정체). 옥상 바깥(-X) 방향으로 부호를
       뒤집는다. */
    for(var bi=0;bi<4;bi++){
      var bxm=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.10,0.24),
        new THREE.MeshStandardMaterial({color:0xC7A874, roughness:0.9}));
      bxm.position.set(deckX-0.75, floorY+0.03+bi*0.105, mz+1.35); g.add(bxm);
    }
    // 흰 쓰레기통
    var bin=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.14,0.42,10),
      new THREE.MeshStandardMaterial({color:0xEDEDE8, roughness:0.8}));
    bin.position.set(deckX-1.25, floorY+0.21, mz+1.35); g.add(bin);
    /* 문 앞에 있던 에어컨 실외기(회색 박스 + 원형 팬)를 삭제한다 —
       옥상 데크에서 보면 덩그러니 놓인 정체불명의 상자처럼 보였다. */
  })();
  /* 왼쪽 벽에 붙어 있던 안내문/포스터 종이 3장을 없앤다. */
  var cap=fpMkBox(dx+0.34, 0.28, dz+0.34, 0xB9B3A4, 1);  // 윗변 콘크리트 두겁
  cap.position.set(mx, HH+0.14, mz); g.add(cap);
  /* 삭제: 지붕 두겁 위에 얹어 둔 환기구 상자를 없앤다 — 옥상
     바깥에서 옥탑방 뒤로 돌아가 올려다보면, 벽돌 벽 꼭대기에 정체불명의
     검은 상자가 하나 얹혀 있는 것처럼만 보였다. */
  /* ── 실내 천장(텍스 타일 패널 + 매립 LED) ──────────────────────────
     위 cap 상자는 지붕 두겁(바깥)이라, 안에서 올려다봤을 때는 그 밑면이
     그대로 천장으로 보였다(패턴·조명 없는 밋밋한 단색). 절차적 격자
     텍스처를 입힌 별도 천장판을 두겁 바로 아래에 깔고, 그 안에 형광등
     메쉬(자체발광) + 실제 광원(PointLight)을 심어 문·바닥에 그림자가
     지도록 한다. */
  /* v110(실사진 반영): 옥탑방 천장은 밝은 베이지 격자 대신 회색 텍스타일(흡음 타일) —
     0.6×1.2m 직사각 패널, 줄눈이 또렷하게 보이도록 전용 텍스처를 쓴다. */
  var ceilTile=(mainStair ? fpRoofCeilTileTex() : fpEnsureCeilTileTex());
  var ceilTexC=ceilTile.clone(); ceilTexC.needsUpdate=true;
  ceilTexC.wrapS=ceilTexC.wrapT=THREE.RepeatWrapping;
  ceilTexC.repeat.set(Math.max(1,Math.round(dx/(mainStair?1.2:0.6))), Math.max(1,Math.round(dz/0.6)));
  /* 예전엔 광원(0.09짜리 3개)이 약해 천장이 짙은 회색으로 보였다(레퍼런스는
     밝은 텍스 천장) — 은은한 자체발광을 더해 조명과 무관하게 밝게 읽히게 한다. */
  var ceilMat=new THREE.MeshStandardMaterial({map:ceilTexC, color:(mainStair?0xD9DBD7:0xD5D2CA), roughness:0.92, metalness:0.02,
    emissive:(mainStair?0xB9BBB7:0xADA9A0), emissiveIntensity:(mainStair?0.42:0.32)});   // v114: 옥탑방 천장은 아래에서도 밝게
  /* 버그 수정: 천장판이 방 폭(dx)만큼만 있어서 문쪽 벽(cx0-0.22)과
     천장 끝(cx0) 사이 22cm가 비어 있었다 — 그 틈으로 바깥 파라펫 몰딩이
     실내에서 얇은 띠처럼 비쳐 보였다. 문쪽으로만 0.24m 늘려 틈을 덮되,
     바깥 벽돌면(cx0-0.25)보다는 안쪽에 머무르게 해 밖에서는 안 보이게 한다. */
  var ceilPl=new THREE.Mesh(new THREE.PlaneGeometry(dx+0.24, dz), ceilMat);
  ceilPl.rotation.x=Math.PI/2; ceilPl.position.set(mx-0.12, HH-0.02, mz);
  ceilPl.receiveShadow=true; g.add(ceilPl);
  if(mainStair){
    /* v110: 실사진의 천장 보 — 뒷벽 위(데크 위)와 -Z 벽 위를 따라 어두운 회색 보 */
    /* v120: v110에서 넣었던 천장 보 두 개(뒷벽 위·-Z 벽 위)를 없앤다 — -Z 벽 위 보가
       "벽 위에 걸린 네모난 긴 것"으로 읽혀 어색하다는 피드백. 천장은 텍스타일 판만 남긴다. */
  }
  var ledStrip=fpMkPlane(1.30, 0.20, 0xF6FBE8, 1, 0xEFF6C8);   // 매립 LED 형광등(자체발광)
  ledStrip.rotation.x=Math.PI/2; ledStrip.position.set(mx, HH-0.035, mz); g.add(ledStrip);
  /* r128 코어 빌드에는 RectAreaLight에 필요한 RectAreaLightUniformsLib
     (three examples 애드온)이 포함돼 있지 않아 그대로 쓰면 빛이 안 나온다.
     예전엔 세기 0.55짜리 PointLight 하나를 심었는데, 방을 좁힌 뒤로 벽까지
     거리가 가까워지면서(역제곱 감쇠) 문 정면이 하얗게 뜨는 얼룩이 생겼다
     → 그 한 점 대신, LED 형광등 길이(1.3m)를 따라 약한 광원 3개를 늘어놓아
     "면광원"처럼 흉내 낸다. 그림자도 꺼서(다중 그림자 캐스터로 인한 계단식
     경계선 아티팩트 방지) 훨씬 더 은은하고 고르게 퍼진다. */
  [-0.5, 0, 0.5].forEach(function(off){
    var fill=new THREE.PointLight(0xF6FBE8, 0.22, 6.5);   // 레퍼런스처럼 밝은 실내가 되게 상향(0.09→0.22)
    fill.position.set(mx+off, HH-0.35, mz);
    g.add(fill);
  });
  /* 디자인 변경: 실제 방화문 사진 기준으로 다시 만든다 —
     회녹색 톤 대신 밝은 회색(스틸 도어 특유의 페인트 색), 문짝마다
     따로 있던 손잡이·미는 판을 없애고 가운데(오른쪽 문짝)에만 원통형
     잠금장치+레버 손잡이를 두며, 위에는 눈에 띄는 도어클로저 암을,
     양옆 바깥쪽에는 경첩을 단다. */
  var DOOR_GRAY=0xD6D8D6, FRAME_GRAY=0xC7CAC8;
  var DW=1.92, DH=2.16, fx=cx0-0.03;
  var FP_TRANSOM=null;   // 문틀에 뚫은 트랜섬 개구부 좌표(아래 문틀 생성부가 채운다)
  /* 문틀(frame) : 예전엔 문 폭+높이 전체를 덮는 '뚫린 구멍 없는 통짜 판'이었다
     — 문쪽 벽을 뒤로 물려도, 이번엔 이 문틀 판 자체가 또 문짝을 완전히 가리는
     같은 종류의 버그였다. Shape+hole로 문짝 자리만큼 실제 구멍을 뚫어서,
     'ㄷ자 테두리'만 남는 진짜 문틀 모양으로 다시 만든다(깊이 순서에 기대지
     않으므로 이 문제가 근본적으로 재발하지 않는다). */
  (function(){
    /* 버그 수정: 문틀이 벽 개구부보다 살짝 작아서, 문틀과 벽
       사이에 실오라기 같은 틈이 생겨 그 틈으로 옥상 바깥(하늘)이 보였다
       (옆면·특히 위쪽에서 두드러짐) — 문틀 바깥 테두리를 벽 개구부보다
       확실히 크게 만들어 벽과 넉넉히 겹치게 한다. */
    var frW=DW+0.50, frH=DH+DOOR_HEAD_EXTRA;    // 문틀 바깥 테두리 크기(벽과 겹치도록 확장)
    var y0=0, y1=DH, z0=mz-DW/2, z1=mz+DW/2;     // 뚫을 구멍 = 문짝 자리 그대로
    var oy0=-0.10, oy1=frH-0.10, oz0=mz-frW/2, oz1=mz+frW/2;
    /* rotation.y=Math.PI/2 로 세우면 world Z = -shapeX, world Y = shapeY다
       (아래 mezVoid 바닥 구멍과 같은 원리, 축만 X→Y로 다르다). */
    var shp=new THREE.Shape();
    shp.moveTo(-oz0,oy0); shp.lineTo(-oz1,oy0); shp.lineTo(-oz1,oy1); shp.lineTo(-oz0,oy1); shp.closePath();
    var hole=new THREE.Path();
    hole.moveTo(-z0,y0); hole.lineTo(-z1,y0); hole.lineTo(-z1,y1); hole.lineTo(-z0,y1); hole.closePath();
    shp.holes.push(hole);
    /* 버그 수정: 문 위 트랜섬(채광창)이 예전에는 문틀과 '완전히
       같은 평면(fx-0.02)'에 판 두 장을 덧대는 방식이었다 — 두 면이 겹쳐
       z-파이팅이 나면서 문틀 위쪽에 톱니(빗살) 무늬가 생겼고, 판 윗부분이
       문틀 테두리 밖(벽면)으로 삐져나와 "프레임이 깨져 보인다"의 정체였다.
       문틀에 트랜섬 자리만큼 진짜 구멍을 뚫고, 유리는 그 구멍 뒤에 끼운다. */
    var tz0=mz-(DW/2-0.05), tz1=mz+(DW/2-0.05);
    var ty0=DH+0.08, ty1=oy1-0.08;
    var thole=new THREE.Path();
    thole.moveTo(-tz0,ty0); thole.lineTo(-tz1,ty0); thole.lineTo(-tz1,ty1); thole.lineTo(-tz0,ty1); thole.closePath();
    shp.holes.push(thole);
    FP_TRANSOM={z0:tz0, z1:tz1, y0:ty0, y1:ty1};
    var frGeo=new THREE.ShapeGeometry(shp);
    var env=fpEnsureEnvMap();
    var frMat=new THREE.MeshStandardMaterial({color:FRAME_GRAY, metalness:0.2, roughness:0.7,
      envMap:env, envMapIntensity:0.3, side:THREE.DoubleSide});
    var fr=new THREE.Mesh(frGeo, frMat);
    fr.rotation.y=Math.PI/2; fr.position.set(fx-0.02, 0, 0);
    fr.castShadow=true; fr.receiveShadow=true; g.add(fr);
    /* 문틀 안쪽 면에 짙은 그림자 선(reveal) — 문짝과 문틀 사이 단차가
       또렷하게 입체로 읽히도록 문 구멍 테두리를 따라 얇은 어두운 띠를 두른다. */
    var revC=0x14201C;
    var revTop=fpMkPlane(DW+0.10, 0.08, revC, 1);
    revTop.rotation.y=Math.PI/2; revTop.position.set(fx-0.035, DH+0.03, mz); g.add(revTop);
    [-1,1].forEach(function(sn){
      var revSide=fpMkPlane(0.08, DH+0.10, revC, 1);
      revSide.rotation.y=Math.PI/2; revSide.position.set(fx-0.035, DH/2, mz+sn*(DW/2+0.04)); g.add(revSide);
    });
  })();
  /* 문짝은 바깥쪽 끝을 축으로 여닫힌다 — 다 오르면 열리면서 옥상이 펼쳐진다 */
  [-1,1].forEach(function(sn){
    var pivot=new THREE.Group();
    pivot.position.set(fx-0.05, 0, mz+sn*(DW/2));
    var leaf=fpMkDoorMetal(0.04, DH, DW/2-0.02, DOOR_GRAY, 1);
    leaf.rotation.y=0; leaf.position.set(0, DH/2, -sn*(DW/4));
    leaf.castShadow=true; leaf.receiveShadow=true; pivot.add(leaf);
    /* 도어클로저 : 사진처럼 문 위에서 눈에 띄게 튀어나온 은색 팔(암) —
       기존엔 작은 판때기 하나뿐이라 클로저처럼 안 보였다. 몸통(실린더) +
       꺾여 나온 팔 두 부재로 다시 짓는다. */
    var dcBody=fpMkPipe(0.30, 0.05, 0x9AA0A0, 1, 'z');
    dcBody.rotation.z=Math.PI/2; dcBody.position.set(-0.03, DH-0.05, -sn*(DW/2-0.16)); pivot.add(dcBody);
    var dcArm=fpMkPipe(0.42, 0.022, 0x7D8380, 1, 'z');
    dcArm.rotation.y=sn*0.55; dcArm.position.set(-0.05, DH-0.05, -sn*(DW/2-0.34)); pivot.add(dcArm);
    /* 경첩 : 바깥쪽(축) 가장자리에 세로로 3개 — 짙은 금속 사각 블록 */
    [0.28, DH*0.5, DH-0.28].forEach(function(hy){
      var hinge=fpMkBox(0.03, 0.16, 0.05, 0x8A9090, 1);
      hinge.position.set(0.025, hy, -sn*0.005); pivot.add(hinge);
    });
    /* 가운데(문이 맞물리는 안쪽 끝)에 원통형 잠금장치 + 레버 손잡이 —
       사진처럼 두 문짝 중앙에 하나씩, 문 가운데 갭에 가깝게 둔다. */
    /* 버그 수정 + 디테일: 손잡이가
         ① 문짝의 '경첩 쪽'(pivot에서 겨우 0.10m — 바깥 모서리)에 붙어 있었고,
         ② 레버가 거기서 다시 바깥으로 뻗어 문틀을 향해 돌아가 있었다.
       실제 양여닫이 문은 두 문짝이 맞물리는 '가운데 쪽' 끝에 손잡이가 있고,
       레버는 그 반대(바깥 모서리) 방향으로 뻗는다 — 자리와 방향을 모두
       바로잡는다. 참고 사진처럼 둥근 좌판(로제트) + 목 + 살짝 굵어지는
       레버 + 둥근 끝단 + 아래 원통 잠금장치까지 만들어 디테일을 살린다.
       그리고 예전에는 이 손잡이가 바깥면(-X)에만 있어서, 옥탑방 안에서
       문을 보면 손잡이가 아예 없었다 — 안쪽면(+X)에도 같은 자리에 단다.
       (이 함수는 중앙계단·비상계단 옥탑방 양쪽에서 다 불리므로 두 문 다 적용) */
    var HZ=-sn*0.84, HY=1.03;               // 손잡이 중심(가운데 쪽 끝에서 0.12m)
    function leverSet(fo){                   // fo=-1 바깥면, +1 안쪽면
      var col=0xC2C8CB;
      var rose=fpMkDisc(0.058, 0xAEB4B8, 1);            // 둥근 좌판(로제트)
      rose.rotation.y=Math.PI/2; rose.position.set(fo*0.026, HY, HZ); pivot.add(rose);
      var roseIn=fpMkDisc(0.044, col, 1);               // 좌판 안쪽 밝은 면
      roseIn.rotation.y=Math.PI/2; roseIn.position.set(fo*0.034, HY, HZ); pivot.add(roseIn);
      var neck=fpMkPipe(0.055, 0.026, col, 1, 'x');     // 좌판에서 나오는 목
      neck.position.set(fo*0.055, HY, HZ); pivot.add(neck);
      var bar=fpMkPipe(0.19, 0.021, col, 1, 'z');       // 레버 — 바깥 모서리 쪽으로 뻗는다
      bar.position.set(fo*0.078, HY, HZ+sn*0.105); pivot.add(bar);
      var tip=new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8),
        new THREE.MeshStandardMaterial({color:col, roughness:0.3, metalness:0.75}));
      tip.position.set(fo*0.078, HY-0.012, HZ+sn*0.198); pivot.add(tip);
      var lock=fpMkDisc(0.034, 0xA2A8AC, 1);            // 아래 원통 잠금장치
      lock.rotation.y=Math.PI/2; lock.position.set(fo*0.026, HY-0.19, HZ); pivot.add(lock);
      var key=fpMkDisc(0.010, 0x2E3A45, 1);             // 열쇠구멍
      key.rotation.y=Math.PI/2; key.position.set(fo*0.031, HY-0.19, HZ); pivot.add(key);
      rose.castShadow=true; bar.castShadow=true;
    }
    leverSet(-1); leverSet(1);
    g.add(pivot);
    /* 옥상 밖으로 나가는 별도 연출(문 열기 애니메이션+카메라 이동)을
       없애고, 지하1층 크리에이티브 존 문과 똑같이 다가가면 저절로(경첩으로
       앞으로) 열리는 자동문으로 바꾼다 — 옆으로 미끄러지는 슬라이딩 문이
       아니라 지금과 같은 경첩 회전(pivot.rotation.y)을 그대로 쓰되, 트리거를
       스크립트가 아니라 거리 기반으로 건다. */
    /* 버그 수정: 열리는 방향이 반대였다 — 실제로는 문이 옥상
       바깥쪽으로 밀려 열려야 하는데 안쪽(옥탑방 쪽)으로 열리고 있었다.
       회전 부호(swing)를 반대로 준다. */
    fpRegisterAutoDoor(g, pivot, DW, -sn, 1.75, 1.6, 0);
  });
  /* 버그 수정: 두 문짝 사이 틈을 표시하려고 둔 이 짙은 세로
     막대가, 문이 열려 있을 때도 그대로 그 자리에 고정돼 있어서(문짝을
     따라 움직이지 않음) 문이 활짝 열려도 한가운데에 막대 하나가 계속
     서 있는 것처럼 보였다("가운데 선") — 문 닫힘 상태에서는 문틀의
     그림자 선(reveal)만으로도 이미 틈이 충분히 또렷하게 보이므로,
     이 막대는 아예 없앤다. */
  /* 문 위 등 — 예전 자리(DH+0.28=2.44m)는 이제 트랜섬 개구부 한가운데라
     유리와 겹쳐 또 z-파이팅이 난다. 문틀 위 인방 벽면 앞으로 올려 붙인다. */
  var lamp=fpMkPlane(0.36, 0.14, 0xF6FBE8, 1);           // 문 위 등
  lamp.rotation.y=Math.PI/2; lamp.position.set(cx0-0.22+0.02, DOOR_LINTEL_Y+0.18, mz); g.add(lamp);
  /* 문 위 "중앙계단/MAIN STAIRS" 글씨 삭제 — 위에 새로 생긴
     콘크리트 캐노피와 높이가 겹쳐 잘려 보이기도 했고, 정리된 외관을 위해
     아예 없앤다. */
  /* 문 위 유리 트랜섬(채광창) — 사진 반영.
     이제 문틀 자체에 뚫린 개구부(FP_TRANSOM) 안쪽에 유리를 끼운다. 문틀
     평면(fx-0.02)보다 확실히 바깥(-X)으로 물려서 겹치지 않게 한다. */
  if(FP_TRANSOM) (function(){
    var t=FP_TRANSOM, tw=t.z1-t.z0, th=t.y1-t.y0, tyc=(t.y0+t.y1)/2;
    var glX=fx-0.07;
    var trGl=fpMkPlane(tw+0.04, th+0.04, 0x9FC7CE, 0.55);
    trGl.rotation.y=Math.PI/2; trGl.position.set(glX, tyc, mz); g.add(trGl);
    var trMul=fpMkPlane(0.04, th, FRAME_GRAY, 1);           // 가운데 문설주
    trMul.rotation.y=Math.PI/2; trMul.position.set(glX+0.012, tyc, mz); g.add(trMul);
  })();
  /* 버그 수정 겸 디자인 변경: 여기 있던 초록 비상구(EXIT) 표지판이
     위 콘크리트 캐노피와 계속 높이가 어긋나며 캐노피 밖으로 살짝 삐져나온
     초록색 얇은 조각처럼 보이는 문제("프레임이 깨져 보인다")가 있었다 —
     실제 사진(레퍼런스) 기준으로도 이 문에는 EXIT 표지판이 없으므로,
     문제의 원인인 표지판 자체를 없앤다. */

  /* 레퍼런스 사진처럼 문 왼쪽엔 원형 탁자, 오른쪽엔 소화전함을 둔다.
     단, 이 함수(fpMakeHeadhouse)는 중앙계단·비상계단 옥탑방 양쪽에 다 쓰이는데
     조건 없이 여기 있어서 비상계단 옥탑방에도 똑같은 탁자·소화전함이 겹쳐
     지어지고 있었다. mezVoid로 걸러 보려 했지만 비상계단 옥탑방도 바닥
     개구부 때문에 mezVoid를 넘겨받으므로 소용이 없었다 — mainStair로 건다. */
  if(mainStair) (function(){
    var tz=mz-1.6;      // 문 왼쪽
    var legX=fx+0.75;
    var topY=0.74;
    var tableTop=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.04,24),
      new THREE.MeshStandardMaterial({color:0xEDEAE0, roughness:0.75, metalness:0.05}));
    tableTop.position.set(legX, topY, tz); g.add(tableTop);
    var pole=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,topY-0.06,12),
      new THREE.MeshStandardMaterial({color:0xB9B4A8, roughness:0.5, metalness:0.4}));
    pole.position.set(legX, (topY-0.06)/2, tz); g.add(pole);
    var base=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.03,20),
      new THREE.MeshStandardMaterial({color:0xB9B4A8, roughness:0.5, metalness:0.4}));
    base.position.set(legX, 0.03, tz); g.add(base);
    /* 원형 탁자 옆에 있던 소화전함 박스를 삭제한다(밋밋한 상자로만
       보여 "이상한 박스"로 지적됨 — 깔끔하게 치운다). */
  })();

  /* 소화전함ㆍ금지 표지판ㆍ금연구역 표지판을 모두 지워 깔끔한
     벽면으로 남긴다. */
  /* 문 앞 점자블록 — 복도를 따라 문턱까지 */
  (function(){
    /* 삭제: 비상계단 옥탑방에서는 문 앞 세로 점자블록을 깔지 않는다
       (계단 앞 가로 유도블록만 남긴다). 중앙계단 옥탑방은 그대로 둔다. */
    /* v127: 철문 앞 바닥의 점자 패드(1.7×0.6, 3칸) 제거 — 실사진에 없음 */
    /* 옥상→5층 하강 버튼이 이 철문 앞 점자블록 위치에서 뜨도록,
       중앙계단 옥탑방(mezVoid가 있는 호출)일 때만 이 좌표를 전역에 기록해
       fpStairGo가 참조할 수 있게 한다(비상계단 옥탑방에는 영향 없음). */
    /* 문 바로 앞이 아니라 점자블록 위에서 조금 더 뒤로(문에서
       멀어지는 쪽으로) 서게 한다 — fx+1.0 → fx+1.3, 점자블록(길이 1.7,
       중심 fx+1.0) 안쪽에 그대로 머무른다. */
    /* 문에서 조금 더 뒤로(fx+1.3 → fx+1.6) 물린다 —
       점자블록(길이 1.7, 중심 fx+1.0, 범위 fx+0.15~fx+1.85) 안쪽에 그대로 머무른다. */
    /* 문에서 조금 더 뒤로(fx+1.6 → fx+1.8) 물린다 —
       점자블록(범위 fx+0.15~fx+1.85) 뒤쪽 가장자리 가까이까지 물러난다. */
    /* 버그 수정: 이 좌표는 중앙계단 옥탑방일 때만 기록해야 하는데
       mezVoid로 걸어 뒀던 탓에, 나중에 지어지는 비상계단 옥탑방(같은 mezVoid를
       넘겨받는다)이 값을 덮어써서 FP_ROOF_LANDING이 비상계단 쪽(z≈−62)을
       가리키고 있었다 — fpRoofStSpot()이 이 값을 그대로 쓰므로 옥상 도착·
       '계단 앞' 근접 지점이 엉뚱한 자리로 잡혔다. mainStair로 정확히 건다. */
    if(mainStair){ FP_ROOF_LANDING = {x: fx+1.8, z: mz}; }
  })();
}
/* ── 중앙계단 옥탑방 안의 복층(메자닌) 창고 ──
   실제 사진(사진3) 기준으로 전면 재구성했다. 이전 판이 사진과 달랐던 점들을 하나씩 고쳤다 :
   - 나무 널판 + 가는 다리 4개(테이블처럼 보였다) → 두꺼운 콘크리트 슬래브 + 전면 보(fascia) + 각기둥
   - 판때기 한 장짜리 난간 → 스테인리스 기둥 + 상부 손스침 + 중간 가로대 2줄
   - 벽에 붙은 초록 사각형(창문) → 흰 프레임 + 중간 문설주 + 창턱 + 안쪽 깊이
   - 계단 옆 세로 막대 하나 → 계단 경사를 따라가는 경사 난간(기둥 + 손스침)
   - 천장이 아예 없어 어두웠다 → 텍스 천장판 격자 + 형광등 + 보
   - 사진 속 적치물(캐비닛/서랍장/라디에이터/적층 패널/파이프/공구 바구니/박스/호스) 배치
   철문 앞에서 뒤돌아봤을 때 보이는 장식용 공간이라 실제로 걸어 올라가지는 않는다. */
function fpMakeMezzanine(g, cx0, cx1, cz0, cz1, owEff){
  var HH=FP_MEZ_HH;                                  // 옥탑방 천장고
  var STOW=owEff||FP_ST_OW;                          // 옥상 호출 시 넓힌 값(ROW)이 들어온다
  var dcz=(cz0+cz1)/2;
  /* 복층 슬래브 : 뒤쪽(cx1) 벽에 붙은 콘크리트 바닥 */
  var UND=2.30, SLB=0.26, TOP=UND+SLB;               // 슬래브 밑면 / 두께 / 윗면(복층 바닥)
  var DW=2.20, dx0=cx1-DW;                           // 앞 가장자리 x
  var dz0=cz0+0.15, dz1=cz1-0.15, ddz=dz1-dz0;
  var CONC=0xBDB9AE, CONC_D=0x9C978B, STEEL=0xAEB8C0, STEEL_D=0x8A949C;

  var slab=fpMkSolid(DW, SLB, ddz, CONC, 1);
  slab.position.set((dx0+cx1)/2, UND+SLB/2, dcz); g.add(slab);
  var deckTop=fpMkSolid(DW-0.04, 0.01, ddz-0.04, 0xADA79A, 1);   // 윗면 마감(약간 어둡게)
  deckTop.position.set((dx0+cx1)/2, TOP+0.005, dcz); g.add(deckTop);
  /* 전면 보(fascia) — 사진에서 복층 앞 가장자리가 두툼한 띠로 보이는 부분 */
  var FSC=0.42;
  var fascia=fpMkBox(0.16, FSC, ddz, CONC_D, 1);
  fascia.position.set(dx0-0.08, UND+SLB-FSC/2, dcz); g.add(fascia);
  /* 받침 각기둥 : 가는 막대가 아니라 사각기둥으로, 앞 가장자리를 따라 4개 */
  [dz0+0.32, dz1-0.32].forEach(function(pz){   // 중앙 시야를 막지 않도록 벽쪽으로 2개만
    var col=fpMkBox(0.19, UND, 0.19, CONC, 1);
    col.position.set(dx0+0.05, UND/2, pz); g.add(col);
  });

  /* ── 계단 : 복층으로 올라가는 진짜 계단을 좌측(-Z, dcz보다 작은 쪽)에 짓는다.
     레퍼런스 사진 기준으로 상행 계단은 왼쪽, 개구부는 오른쪽이어야 하는데
     지금까진 반대(오른쪽 상행)로 지어놨었다 — 좌우를 맞바꾼다.
     단, 이 옥탑방 안에는 실제로 오르내리는 중앙계단(fpMakeStairwell)도 같이
     서 있고, 그 계단은 항상 dcz보다 작은 쪽(zDn = zc-OW/4 부근, 대략
     dcz-2.17~dcz-0.07 구간)에서만 단을 만든다. 그 구간과 안 겹치도록 더
     왼쪽(dcz-3.55~dcz-4.85)에 짓는다. */
  var RH=1.02;
  var SW=1.55;                          // 계단 폭(z) — 요청대로 조금 더 넓힘(1.30→1.55)
  /* 진짜 5층→옥상 계단(중앙, fpMakeStairwell)의 위쪽 착지 지점과 좁은 간격 없이
     바로 이어 붙여서 "같은 계단실에서 갈라져 올라가는" 느낌을 준다. 예전엔
     서로 뚝 떨어진 자리에 따로 지어서 두 계단이 남남처럼 보였다. */
  /* 레퍼런스 사진(공대3호관 개선요청) 재확인 결과 상행 계단은 왼쪽이 아니라
     오른쪽 벽면 쪽이어야 한다 — 실제로 밟고 오르내리는 중앙계단(zDn 쪽,
     아래층으로 이어지는 개구부)은 그대로 두고, 장식용 복층 계단만 반대편
     (zUp 쪽, 옥상에선 실제 단이 없어 비어 있는 자리)으로 옮겨 짓는다.
     "철문 앞" 시점의 카메라 화각(가로 22도 남짓, 매우 좁음)이 앞쪽 중심선
     근처만 비추므로, 계단을 화면 옆으로 멀리 떨어뜨리면 아예 안 보인다 —
     fpMakeRoof에서 실제 개구부(mezVoid) 오른쪽 가장자리로 쓰는 것과 똑같은
     공식(dcz-(FP_ST_OW/4+0.02)+(FP_ST_OW/2-0.10)/2+0.10)으로 그 가장자리를
     구해, 개구부 난간과 거의 맞닿는 자리부터 오른쪽으로 짧게 이어 짓는다. */
  var voidEdgeZ=dcz+(STOW/4+0.02)-(STOW/2-0.10)/2-0.10;   // 실제 개구부의 카메라 쪽 가장자리(열 맞바꿈 반영)
  var realXs=FP_WALL_X+FP_ST_LAND;      // 중앙계단이 착지하는 안쪽 지점의 X
  /* 계단이 개구부 난간과 "하나의 모서리 기둥"에서 이어지도록 — 이 값은
     fpMakeRoof가 mezVoid.z1로 넘기는 realDnZ1과 완전히 같은 공식이라
     voidEdgeZ === 개구부 우측 난간의 Z좌표(hz1)다. 간격을 두지 않고 그대로
     맞물리게 한다(레퍼런스 사진처럼 난간이 끊김 없이 이어짐). */
  var sZ0=voidEdgeZ, sZ1=sZ0+SW;
  /* ── 직선 계단으로 단순화 ──
     기존 ㄱ자(코너+2구간+다리) 구조가 실사 레퍼런스보다 훨씬 복잡해서, 코너
     참·꺾인 난간이 겹쳐 보이며 "계단이 이상하다"는 지적을 받았다. 레퍼런스
     사진은 꺾임 없는 단순한 일자(直) 계단이므로 그대로 맞춘다 — 개구부
     뒤쪽에서 시작해 곧장 +X로 올라 복층 앞 가장자리까지 짧은 평지로 잇는다. */
  /* xA0을 개구부 난간의 X 시작점(realDnX0 = realXs-0.10, fpMakeRoof 공식과 동일)에
     정확히 맞춰, 개구부 난간의 모서리 기둥과 계단 난간의 첫 기둥이 같은
     (X,Z) 좌표에서 만나게 한다. */
  var xA0=realXs-0.10;
  var sMz=sZ0+SW/2;
  /* ── 계단을 카메라에서 더 깊숙이, ㄱ자로 다시 짠다 ──
     "계단이 카메라 앞까지 튀어나와 화면을 가린다"는 지적 — 지난 턴엔 개구부
     난간 바로 그 자리(xA0)에서 곧장 단이 시작해서, 문에서 몇 걸음만 걸어도
     넓은 계단 폭(SW)이 시야 전체를 채웠다. 이번엔 실제 디딤판은 xA0에서
     한참(2.4m) 더 들어간 자리부터 시작하고, 그 사이는 빈 바닥(점자블록 포함)
     으로 남겨 사진처럼 "복도가 먼저 보이고 계단은 안쪽에" 있게 한다.
     또한 1자로 쭉 뻗지 않도록 중간에 계단참을 두고 90도 꺾어 오른쪽(+Z,
     실제 벽 쪽)으로 마저 오르는 진짜 ㄱ자 구조로 되돌린다. */
  var riseStep=0.173, N=Math.max(10, Math.round(TOP/riseStep)), rise=TOP/N;
  var runStep=0.30;
  var N1=Math.round(N*0.45), N2=N-N1;                 // 1구간(+X)·2구간(+Z) 단수 배분
  var MID=N1*rise;
  var stepX0=xA0+2.4;                                  // 실제 디딤판 시작 X(개구부에서 2.4m 안쪽)
  var x1Top=stepX0+N1*runStep;                         // 1구간 꼭대기(계단참 앞 가장자리)
  var cornerXc=x1Top+SW/2;                             // 계단참(SW×SW) 중심 X = 2구간 X
  var z2Top=sZ1+N2*runStep;                            // 2구간이 오르며 나아간 끝 Z
  function flight(x0, n, run, rise, y0, zc2){        // +X 방향으로 오르는 구간
    for(var i=0;i<n;i++){
      var y=y0+rise*(i+1);
      var st=fpMkSolid(run, y, SW, 0x8E8A80, 1);
      st.position.set(x0+run*(i+0.5), y/2, zc2); g.add(st);
      var tr=fpMkSolid(run*0.98, 0.02, SW, 0xC2BEB2, 1);
      tr.position.set(x0+run*(i+0.5), y+0.006, zc2); g.add(tr);
      var rs=fpMkSolid(0.02, rise*0.95, SW, 0xB7B2A6, 1);   // 챌판(리서) : 디딤판보다 살짝 어둡게 해 명암을 뚜렷이
      rs.position.set(x0+run*i+0.006, y-rise/2, zc2); g.add(rs);
    }
  }
  function flightZ(z0, n, run, rise, y0, xc2){       // +Z 방향으로 오르는 구간(꺾인 뒤)
    for(var i=0;i<n;i++){
      var y=y0+rise*(i+1);
      var st=fpMkSolid(SW, y, run, 0x8E8A80, 1);
      st.position.set(xc2, y/2, z0+run*(i+0.5)); g.add(st);
      var tr=fpMkSolid(SW, 0.02, run*0.98, 0xC2BEB2, 1);
      tr.position.set(xc2, y+0.006, z0+run*(i+0.5)); g.add(tr);
      var rs=fpMkSolid(SW, rise*0.95, 0.02, 0xB7B2A6, 1);
      rs.position.set(xc2, y-rise/2, z0+run*i+0.006); g.add(rs);
    }
  }
  flight(stepX0, N1, runStep, rise, 0, sMz);
  var landCorner=fpMkSolid(SW, 0.14, SW, 0x8E8A80, 1);
  landCorner.position.set(cornerXc, MID-0.07, sMz); g.add(landCorner);
  var landCornerTop=fpMkSolid(SW-0.04, 0.02, SW-0.04, 0xC2BEB2, 1);
  landCornerTop.position.set(cornerXc, MID+0.007, sMz); g.add(landCornerTop);
  flightZ(sZ1, N2, runStep, TOP-MID, MID, cornerXc);
  /* 2구간 꼭대기 ~ 복층 슬래브 앞 가장자리(dx0) 사이를 잇는 짧은 평지(복도) —
     복층 슬래브가 Z 방향으로 넓게 깔려 있어(dz0~dz1) X로만 이어도 닿는다. */
  var bridgeLen=Math.max(0.4, dx0-cornerXc);
  var bridge=fpMkSolid(bridgeLen, 0.14, SW, 0x8E8A80, 1);
  bridge.position.set(cornerXc+bridgeLen/2, TOP-0.07, z2Top); g.add(bridge);
  var bridgeTop=fpMkSolid(bridgeLen-0.04, 0.02, SW-0.04, 0xC2BEB2, 1);
  bridgeTop.position.set(cornerXc+bridgeLen/2, TOP+0.007, z2Top); g.add(bridgeTop);
  /* 은색 스테인리스 파이프 난간 (metalness 0.9 / roughness 0.1 — fpMkPipe 기본값) */
  var RAIL_COL=0xCCCCCC;
  function slopeRail2(x0, x1, y0, y1, zs){            // +X로 기울어진 구간의 옆 난간
    var dxr=x1-x0, dyr=y1-y0, len=Math.sqrt(dxr*dxr+dyr*dyr), ang=Math.atan2(dyr, dxr);
    [0, -0.36].forEach(function(off, oi){
      var bar=fpMkPipe(len, oi===0?0.042:0.028, RAIL_COL, 1, 'x', ang);
      bar.position.set((x0+x1)/2, (y0+y1)/2+RH+off, zs); g.add(bar);
    });
    var np=Math.max(1, Math.round(len/0.35));   // 실사진 반영(3차): 세로 살 촘촘하게
    for(var i=0;i<=np;i++){
      var t=i/np, px=x0+dxr*t, py=y0+dyr*t;
      var po=fpMkPipe(RH, 0.027, RAIL_COL, 1);
      po.position.set(px, py+RH/2, zs); g.add(po);
    }
  }
  function slopeRailZ(z0, z1, y0, y1, xs){            // +Z로 기울어진 구간(2구간)의 옆 난간
    var dzr=z1-z0, dyr=y1-y0, len=Math.sqrt(dzr*dzr+dyr*dyr), ang=Math.atan2(dyr, dzr);
    [0, -0.36].forEach(function(off, oi){
      var bar=fpMkPipe(len, oi===0?0.042:0.028, RAIL_COL, 1, 'z', -ang);
      bar.position.set(xs, (y0+y1)/2+RH+off, (z0+z1)/2); g.add(bar);
    });
    var np=Math.max(1, Math.round(len/0.35));   // 실사진 반영(3차): 세로 살 촘촘하게
    for(var i=0;i<=np;i++){
      var t=i/np, pz=z0+dzr*t, py=y0+dyr*t;
      var po=fpMkPipe(RH, 0.027, RAIL_COL, 1);
      po.position.set(xs, py+RH/2, pz); g.add(po);
    }
  }
  function flatRail(x0,x1,z0,z1,y){                   // 평평한 참/다리/복도 가장자리 난간(직선)
    var len=Math.sqrt((x1-x0)*(x1-x0)+(z1-z0)*(z1-z0)), ang=Math.atan2(z1-z0,x1-x0);
    [0,-0.36].forEach(function(off,oi){
      var bar=fpMkPipe(len, oi===0?0.042:0.028, RAIL_COL, 1, 'xz', -ang);
      bar.position.set((x0+x1)/2, y+RH+off, (z0+z1)/2); g.add(bar);
    });
    var np=Math.max(1, Math.round(len/0.35));   // 실사진 반영(3차): 세로 살 촘촘하게
    for(var i=0;i<=np;i++){
      var t=i/np;
      var po=fpMkPipe(RH, 0.027, RAIL_COL, 1);
      po.position.set(x0+(x1-x0)*t, y+RH/2, z0+(z1-z0)*t); g.add(po);
    }
  }
  /* 개구부 난간의 모서리 기둥(xA0, sZ0)에서 끊김 없이 시작 — 평지(개구부~계단
     시작)→1구간(+X, 오름)→계단참→2구간(+Z, 오름)→복도까지 한 줄로 이어 짓는다. */
  flatRail(xA0-0.15, stepX0, sZ0, sZ0, 0);
  flatRail(xA0-0.15, stepX0, sZ1, sZ1, 0);
  slopeRail2(stepX0, x1Top, 0, MID, sZ0);
  slopeRail2(stepX0, x1Top, 0, MID, sZ1);
  flatRail(x1Top, x1Top+SW, sZ1, sZ1, MID);            // 계단참 먼 쪽 가장자리
  slopeRailZ(sZ1, z2Top, MID, TOP, x1Top);
  slopeRailZ(sZ1, z2Top, MID, TOP, x1Top+SW);
  flatRail(cornerXc, dx0, z2Top, z2Top, TOP);
  // 계단 진입부 노란 점자블록 — 이제 개구부 난간 바로 앞(빈 복도가 시작되는 지점)에 둔다
  (function(){
    var tt=fpTactileTex().clone(); tt.needsUpdate=true;
    var len=1.0, wid=SW+0.3;
    tt.repeat.set(Math.max(1,Math.round(len/0.30)), Math.max(1,Math.round(wid/0.30)));
    var tp=fpMkTex(len, wid, tt, 1);
    tp.rotation.x=-Math.PI/2; tp.position.set(stepX0-0.65, 0.075, sMz); g.add(tp);
  })();
  // 계단·복층 난간에 그림자를 드리우는 조명(계단 위쪽에서 비스듬히)
  var stairShadowLite=new THREE.SpotLight(0xFFF6E8, 0.6, 16, Math.PI/4.0, 0.5, 1.2);
  stairShadowLite.position.set(cornerXc, HH-0.25, z2Top-0.4);
  stairShadowLite.target.position.set(cornerXc, 0, z2Top);
  stairShadowLite.castShadow=true;
  stairShadowLite.shadow.mapSize.set(512,512);
  stairShadowLite.shadow.bias=-0.0025;
  g.add(stairShadowLite); g.add(stairShadowLite.target);

  /* 예전엔 여기(좌측 -Z 하단)에 "왼쪽 아래로 내려가는 느낌"을 주려고 장식용
     계단 몇 단 + 바닥 개구부(구멍) + 철제 난간 케이지를 지어 넣었는데,
     이 구역이 다른 조명에서 멀어 항상 새까맣게 렌더링되면서 오히려 사용자
     눈에는 "정체불명의 검은 삼각 프레임/지지대" 잡동사니로 보였다. 실제
     목표 사진에도 이런 바닥 구멍은 없으므로 완전히 제거하고 평범한
     테라조 바닥으로 되돌린다(불필요한 구조물 삭제). */

  /* ── 창문 : 복층 바로 아래, 계단·가구와 같은 왼쪽(-Z) 벽면에 가로형 두 개.
     예전엔 정면(cx1) 벽에 얼굴을 마주보게 뒀는데, 레퍼런스 사진은 창문이
     계단·복층과 같은 쪽 옆벽에 있어서 그쪽으로 옮긴다. */
  function mezWin(wz){
    /* 문 앞에서 창문까지 약 10m라 예전 크기(1.30×0.85)로는 화면에서 점처럼 작게
       보였다 — 레퍼런스 사진처럼 초록 프레임 창이 뚜렷이 보이도록 키우고,
       유리도 바깥 햇빛이 들어오는 밝은 색으로 올린다. */
    var WW=2.10, WHt=1.30, wy=1.40, wx=cx1-0.02;
    var rec=fpMkPlane(WHt+0.10, WW+0.10, 0xDCD8CE, 1);
    rec.rotation.y=Math.PI/2; rec.position.set(wx-0.005, wy, wz); g.add(rec);
    var gl=fpMkPlane(WHt, WW, 0x9FD6BC, 0.95);
    gl.rotation.y=Math.PI/2; gl.position.set(wx-0.012, wy, wz); g.add(gl);
    var day=fpMkPlane(WHt-0.10, WW-0.10, 0xFFFFFF, 0.30);     // 바깥 햇빛 느낌
    day.material.blending=THREE.AdditiveBlending; day.material.depthWrite=false;
    day.rotation.y=Math.PI/2; day.position.set(wx-0.02, wy, wz); g.add(day);
    var fr=[[0.06,WW+0.08,WHt/2,0],[0.06,WW+0.08,-WHt/2,0],
            [WHt+0.08,0.06,0,-WW/2],[WHt+0.08,0.06,0,WW/2],
            [WHt,0.045,0,0]];
    fr.forEach(function(f){
      var m=fpMkPlane(f[0], f[1], 0x3F8F63, 1);
      m.rotation.y=Math.PI/2; m.position.set(wx-0.02, wy+f[2], wz+f[3]); g.add(m);
    });
    var sill=fpMkBox(0.14, 0.06, WW+0.16, 0xE6E3DA, 1);
    sill.position.set(wx-0.07, wy-WHt/2-0.05, wz); g.add(sill);
  }
  mezWin(sMz+0.75); mezWin(sMz-0.85);   // ㄱ자로 꺾인 뒤 실제 도착 지점(sMz) 기준으로 배치

  /* ── 천장 : 텍스 천장판 격자 + 매립형 LED + 보 ──
     레퍼런스 사진처럼 사각 패널 격자가 눈에 들어오고, 직사각형 매립등이 방 전체에
     줄지어 박혀 있어야 한다. 예전엔 줄눈이 너무 옅고(0.02폭) 등도 고정 위치에 두
     개뿐이라, 방을 넓히고 나니 천장이 허옇게 비어 보였다. */
  var ceil=fpMkPlane(cx1-cx0, cz1-cz0, 0xE8E6DE, 1);
  ceil.rotation.x=Math.PI/2; ceil.position.set((cx0+cx1)/2, HH-0.01, dcz); g.add(ceil);
  for(var gx=cx0+1.2; gx<cx1; gx+=1.2){                      // 격자 줄눈(가로) — 좀 더 또렷하게
    var gl1=fpMkPlane(0.05, cz1-cz0, 0xC3BFB4, 0.95);
    gl1.rotation.x=Math.PI/2; gl1.rotation.z=Math.PI/2;
    gl1.position.set(gx, HH-0.015, dcz); g.add(gl1);
  }
  for(var gz=cz0+1.2; gz<cz1; gz+=1.2){                      // 격자 줄눈(세로)
    var gl2=fpMkPlane(cx1-cx0, 0.05, 0xC3BFB4, 0.95);
    gl2.rotation.x=Math.PI/2;
    gl2.position.set((cx0+cx1)/2, HH-0.015, gz); g.add(gl2);
  }
  var beam=fpMkBox(cx1-cx0, 0.30, 0.26, 0xDAD7CE, 1);        // 천장 보
  beam.position.set((cx0+cx1)/2, HH-0.15, dcz-2.4); g.add(beam);
  /* 매립형 LED : 방 전체에 x 2줄 × z 3줄로 넉넉히 배치(문 앞에서 올려다봐도 보이게) */
  [cx0+2.2, cx0+5.0].forEach(function(lx){
    [dcz-3.0, dcz, dcz+3.0].forEach(function(lz){
      var housing=fpMkPlane(1.30, 0.34, 0xBFC3C2, 1);        // 등 테두리(하우징)
      housing.rotation.x=Math.PI/2; housing.position.set(lx, HH-0.025, lz); g.add(housing);
      var lamp=fpMkPlane(1.18, 0.24, 0xFFFBEC, 1);           // 발광면
      lamp.rotation.x=Math.PI/2; lamp.position.set(lx, HH-0.035, lz); g.add(lamp);
    });
  });
  /* 조명 : 넓어진 방을 골고루 밝힌다(예전엔 point 하나뿐이라 구석이 새까맸다) */
  [[cx0+2.2, dcz-2.6],[cx0+2.2, dcz+2.6],[cx0+5.2, dcz]].forEach(function(lp){
    var pl=new THREE.PointLight(0xF4F1E9, 0.42, 16);
    pl.position.set(lp[0], HH-0.55, lp[1]); g.add(pl);
  });
  var mezAmb=new THREE.HemisphereLight(0xFFFFFF, 0xBFBCB2, 0.30);   // 은은한 전체 채움광
  g.add(mezAmb);
  // 좌측 개구부(계단 내려가는 구멍)는 다른 조명에서 멀어 새까맣게 보였다 — 전용 조명 추가
  // (좌측 하단 개구부용 조명은 그 구조물 자체를 제거하면서 함께 삭제)

  /* ── 적치물 ──
     이전 판은 물건이 카메라에서 너무 멀고 작아 화면이 텅 비어 보였다.
     실제 사진처럼 (1) 문 앞 가까운 바닥에 크게 깔고 (2) 색을 확실히 나눠 배치한다.
     시선 기준 : +Z가 오른쪽, -Z(cz0)가 왼쪽, +X가 정면 안쪽. */
  function box(w,h,d,x,y,z,c,ry){
    var m=fpMkBox(w,h,d,c,1); m.position.set(x,y,z); if(ry) m.rotation.y=ry; g.add(m);
    return m;
  }
  var FLR=0.06;                                   // 실내 바닥 높이

  /* 1. 복층 위 : 목재 수납장 + 서랍장 + 라디에이터를 벽을 따라 늘어놓는다.
     예전엔 문짝 두 개짜리 옷장을 딱 붙여놔서 멀리서 보면 '갈색 이중문'처럼
     보였다 — 색을 서로 다르게 하고, 문짝 사이 홈(세로 판재 선)을 실제로
     파서 옷장이라는 게 한눈에 보이게 한다. */
  function wardrobe(x, y0, z, w, h, d, c){
    box(w, h, d, x, y0+h/2, z, c);
    // 문짝 패널 선(세로) — 3등분해서 문틀처럼 보이게
    var seamC=0x3A2A1C;
    [ -w/3, 0, w/3 ].forEach(function(sx){
      var seam=fpMkPlane(0.02, h*0.86, seamC, 0.85);
      seam.rotation.y=Math.PI/2;
      seam.position.set(x+sx, y0+h*0.5, z+d/2+0.005); g.add(seam);
    });
    // 손잡이 두 개
    [-w/6, w/6].forEach(function(hx){
      var hd=fpMkBox(0.05,0.05,0.05,0xC9B79A,1);
      hd.position.set(x+hx, y0+h*0.55, z+d/2+0.03); g.add(hd);
    });
  }
  wardrobe(cx1-0.55, TOP, sMz+1.05, 0.72, 1.60, 0.86, 0x7A5539);
  wardrobe(cx1-0.55, TOP, sMz+0.15, 0.72, 1.60, 0.86, 0x6B4A34);
  wardrobe(cx1-0.55, TOP, sMz-0.75, 0.72, 1.60, 0.86, 0x7E5A3C);
  // 서랍장(낮고 넓은 가구) — 옷장 옆에 나란히 (요청대로 캐비닛 세트를 4개로 늘림)
  box(0.70, 0.72, 0.80, cx1-0.55, TOP+0.36, sMz-1.55, 0x8A6A46);
  [0.20,0.44].forEach(function(dy){
    var seam=fpMkPlane(0.62,0.02,0x3A2A1C,0.8);
    seam.rotation.y=Math.PI/2;
    seam.position.set(cx1-0.55, TOP+dy, sMz-1.55+0.41); g.add(seam);
  });
  // 소형 라디에이터(히터) — 서랍장 옆 벽쪽 바닥
  (function(){
    var RW=0.62, RH2=0.55, RD=0.13;
    var body=fpMkBox(RD, RH2, RW, 0xD9DCDD, 1);
    body.position.set(cx1-0.10, TOP+RH2/2, sMz+1.85); g.add(body);
    for(var fi=0; fi<7; fi++){
      var fin=fpMkPlane(RD+0.02, RH2-0.05, 0xB9BEC0, 1);
      fin.rotation.y=Math.PI/2;
      fin.position.set(cx1-0.10, TOP+RH2/2, sMz+1.85-RW/2+0.05+fi*(RW-0.1)/6); g.add(fin);
    }
  })();

  /* 2. 문 앞 왼쪽 바닥 : 나무 상자(보관함) 1개 */
  (function(){
    var bx=cx0+1.05, bz=cz0+0.85;
    box(0.55,0.42,0.55, bx, FLR+0.21, bz, 0x8C6B45);
    var lid=fpMkPlane(0.55,0.55,0x6E5233,1);
    lid.rotation.x=-Math.PI/2; lid.position.set(bx, FLR+0.425, bz); g.add(lid);
    var band=fpMkPlane(0.57,0.06,0x4A3722,0.9);
    band.rotation.y=Math.PI/2; band.position.set(bx, FLR+0.21, bz+0.276); g.add(band);
  })();

  /* 6. 노란 점자블록 : 돌기 무늬 텍스처를 입혀 문 앞에서 계단 쪽으로 길게 깐다 */
  function tacStrip(px, pz, len, wid, rz){
    var tt=fpTactileTex().clone(); tt.needsUpdate=true;
    tt.repeat.set(Math.max(1, Math.round(len/0.30)), Math.max(1, Math.round(wid/0.30)));
    var m=fpMkTex(len, wid, tt, 1);
    m.rotation.x=-Math.PI/2; m.rotation.z=rz||0;
    m.position.set(px, FLR+0.015, pz); g.add(m);
  }
  tacStrip(2.10, dcz+1.55, 3.60, 0.62, 0);
  tacStrip(4.15, dcz+0.55, 2.20, 0.62, -Math.PI/2);
}
function fpMakeRoof(ko){
  var g=new THREE.Group(), ST=BUILDING_Z_STRETCH;
  fpRoofDoorLs=[]; fpRoofDoorRs=[];   // 옥상을 다시 지을 때마다 문짝 목록도 새로 모은다
  var R=fpRoofBox(), HX=R.HX, z0=R.z0, z1=R.z1, zc=(z0+z1)/2, zl=z1-z0;
  /* 옥탑방(중앙계단·비상계단) 바깥 경계를 먼저 계산해 둔다 — 아래 녹색 방수 바닥에
     이 자리만큼 실제로 구멍을 뚫기 위해서다(예전엔 구멍 없이 통짜라, 옥탑방
     안쪽 바닥 개구부·계단실 위로 이 초록 바닥이 그대로 비쳐 보이는 버그가 있었다:
     실내 바닥(y=0.06)보다 낮고 계단실 자체 바닥(y=0.01)보다는 높아서, 개구부
     사이로 계단 대신 엉뚱하게 초록 바닥이 끼어 보였다). */
  var stZ=(FLOOR_LAYOUT[5]?FLOOR_LAYOUT[5].stZ:0)*ST;
  /* "좁고 막힌 굴 같다"는 피드백 반영. 두 가지를 함께 넓힌다:
     ① 옥탑방 자체를 좌우로 훨씬 넉넉하게(RM_DZ) — 도착해 뒤돌아봤을 때 옆으로
        트인 넓은 실내 공간처럼 보이게 한다.
     ② 실제로 밟는 계단실(fpMakeStairwell)의 폭 자체도 ROOF_OW_MUL배 넓힌다.
        걷기 애니메이션의 좌우 위치(zSide/zBack, fpStairGo가 기존 FP_ST_OW 기준
        으로 계산)는 그대로 두는데, 더 넓어진 디딤판의 폭(fw)이 항상 그 위치를
        감싸므로(중심에서 멀어질수록만 넓어짐) 사람이 딛는 자리가 계단 밖으로
        벗어나 보일 위험 없이 안전하게 넓어진다. */
  /* ── 옥탑방 크기 재조정 (2026 리팩토링) ────────────────────────────
     이전엔 "좁고 막힌 굴 같다"는 피드백으로 RM_DX/RM_DZ를 크게 키워
     방이 넓은 로비처럼 되어버렸다. 실제 사진(계단실 전실)은 그 반대로,
     계단 바로 위에 붙은 작은 전실 — 좌우 벽이 가깝고 몇 걸음이면
     철문 앞에 닿는 크기다. 계단 자체 폭(ROW)은 실제로 밟는 자리라
     줄이지 않되(걷기 애니메이션 좌표와 어긋나면 벽을 뚫고 지나감),
     그 바깥으로 덧붙이던 여유 공간(RM_DX/RM_DZ)만 최소한으로 줄인다. */
  /* 실사 사진 확인 결과: 내려가는 계단 폭 + 올라가는 계단 폭을 더하면 딱
     옥탑방 가로(Z) 폭과 같다 — 그런데 예전엔 "좁고 막힌 굴 같다"는 피드백으로
     계단 폭을 1.4배 넓히고 방 자체도 훨씬 넓게 잡아서, 실제 계단 두 개를
     합친 것보다 방이 훨씬 넓어져 버렸다(실측 비율로 축소).
     계단 폭은 다른 층과 같은 실치수(1.0배)로 되돌리고, 방 경계(mainCZ0/1)는
     "내려가는 계단 + 약간의 틈 + 올라가는 계단(스킵플로어) + 벽 여유"를
     역산해서 딱 그만큼만 잡는다. */
  var ROOF_OW_MUL=1.0, ROW=FP_ST_OW*ROOF_OW_MUL;
  var RM_DX=0.45, RM_DZ=0.35;   // v115: v112의 +1.5m 깊이 확장을 되돌린다 — 뒷벽이 창문 벽(계단실 뒷벽)보다 뒤로 가면 데크 밑에 바닥 턱이 생겨 실사진(데크가 창문 벽 위에 바로 얹힘)과 달라졌다. 데크 계단 앞 바닥 공간은 대신 데크 깊이를 줄여 확보한다(예전 2.30/3.4 → 대폭 축소)
  /* 옥탑방 천장고도 낮춘다 — 예전엔 복층(메자닌)을 담기 위해 4.00m로 높였는데,
     이번 요청은 복층 없이 "낮고 평평한 실제 계단실 전실" 느낌이 목표다.
     복층 장식(fpMakeMezzanine)은 아래에서 호출을 빼되, 함수 자체는 남겨 둔다
     (나중에 다시 필요해지면 한 줄만 되살리면 되도록). */
  var FP_VEST_H = 4.00;   // v123: 3.05→4.00 — 데크(1.42m) 위에 서면 눈높이(+1.55)가 천장에 닿아 지붕을 뚫고 보였다. 실사진의 복층 계단실처럼 천장을 높여 데크 위 머리 여유 ≈1m 확보(옥탑방 바깥 상자도 그만큼 높아짐)

  var mainCX0=FP_WALL_X-2.30, mainCX1=FP_WALL_X+FP_ST_WD-0.80+0.35+RM_DX;
  /* 진짜 내려가는 계단(개구부)의 Z범위를 먼저 구해서, 방 경계를 여기서부터
     역산한다(예전엔 반대로 — 넓은 방을 먼저 정하고 계단을 그 안에 끼워 넣었다). */
  /* 구조 정정: 중앙계단 열 맞바꿈을 되돌렸으므로(_colFlip=1),
     옥상에서 내려가는 단은 다시 -Z열이다 — 옥탑방 바닥 개구부 좌표도 같은
     쪽으로 되돌린다(철문을 바라볼 때 오른쪽 = -Z). */
  var realDnZ0pre=stZ-(ROW/4+0.02)-(ROW/2-0.10)/2-0.10;
  var realDnZ1pre=stZ-(ROW/4+0.02)+(ROW/2-0.10)/2+0.10;
  var downFlightW=realDnZ1pre-realDnZ0pre;      // 내려가는 계단 폭
  var skipGap=0.06;                             // 계단참에서 스킵플로어로 넘어가는 최소 틈(더 좁혀 붙임)
  /* 레퍼런스 사진처럼 문 앞 좌우 폭을 넓힌다 — 양쪽에 각각 0.6m씩
     더 준다(원형 탁자·소화전이 들어갈 여유). 뒤쪽 데크(mainCZ0~mainCZ1 기준
     비율로 폭을 잡으므로)도 이 확장에 맞춰 함께 넓어진다. */
  var ROOM_WIDEN=0.6;
  /* 개구부가 방의 -Z쪽으로 돌아왔으므로, 남는 자리(스킵플로어)도 반대쪽(+Z)에
     둔다(방 전체 크기는 그대로). */
  var mainCZ0=realDnZ0pre+0.03;   // v114: 옥탑방 -Z 벽을 다른 층 계단실 옆벽(zc-hw)과 같은 면(2cm 뒤)에 — 5층 옆벽과 옥상 옆벽이 한 면으로 이어지고 계단참 철문이 5층 벽에 가려지지 않는다
  var mainCZ1=realDnZ1pre+2.92;   // v111: +Z 벽을 데크 계단(시작 realDnZ1pre-0.08, 폭 2.95) 오른쪽에 딱 붙인다 — 계단과 벽 사이 공간 없음. v110의 +1.5m 확장 취소
  var es=EMSTAIR_POS[5], emCX0=null, emCX1=null, emCZ0=null, emCZ1=null, esz=0, esx=1;
  if(es){
    esz=es.z*ST; esx=(es.xWhole>0?1:-1);
    /* 구조 변경: 예전엔 비상계단 옥탑방 깊이가 3.55m뿐이라,
       실제 계단실(깊이 FP_ST_WD=6.2m)이 방 밖으로 2.9m나 삐져나와 있었다.
       그래서 방 바닥(통짜)·옥상 녹색 방수 바닥·배경 땅면이 모두 계단 위를
       덮어, 옥탑방 안에서 내려다봐도 아래로 내려가는 계단이 전혀 안 보였다.
       → 중앙계단 옥탑방과 같이 방 깊이를 계단실 전체 깊이까지 늘린다.
         이러면 바닥에 뚫는 구멍(mezVoid)이 방 안에 온전히 들어오고,
         녹색 바닥·땅면 구멍(둘 다 이 emC 사각형을 그대로 씀)도 계단실
         전체를 덮게 되어 세 겹 모두 한 번에 해결된다.
         (+0.25는 계단실 자체 뒷벽(x0+WD)과 방 뒷벽이 같은 평면에 겹쳐
          깜빡이지 않도록 살짝 물린 값) */
    var EM_ROOM_D=FP_ST_WD+0.25;
    if(esx>0){ emCX0=FP_WALL_X-0.25; emCX1=FP_WALL_X+EM_ROOM_D; }
    else     { emCX0=-FP_WALL_X-EM_ROOM_D; emCX1=-FP_WALL_X+0.25; }
    emCZ0=esz-1.85; emCZ1=esz+1.85;
  }
  /* 바깥 풍경 : 사방 하늘판 + 윗하늘 */
  /* 하늘판은 수평선(산능선)이 눈높이에 오도록 높이를 맞춰 세운다.
     난간 너머에 아무것도 없으면 검은 허공이 보이므로 멀리 땅면도 깔아 둔다. */
  /* 버그 수정: 하늘 박스가 카메라의 far 평면(150) 밖까지 뻗어 있어서
     좌우로 고개를 돌릴 때 먼 모서리가 잘려 나가 하늘이 깨져 보였다.
     실측: 정면 하늘판은 127m라 far 안이지만, 박스 모서리는 156~184m로 far를
     넘었다 — 정면만 볼 땐 멀쩡하고 좌우로 돌릴 때만 깨지던 이유.
     카메라 far를 키우면 건물 전체의 깊이 정밀도에 영향을 주므로, 하늘 박스
     쪽을 far 안(넉넉히 여유를 두고 ~120m 이내)으로 줄인다. */
  var SKY=40, SH=86, SKYC=30, sky=fpRoofSkyTex();
  /* 땅면도 위 윗하늘과 같은 이유(광원이 닿지 않는 먼 배경)로 어둡게 나올 수
     있어, 하늘판과 똑같이 빛을 받지 않는 재질로 통일한다. */
  var gndMat=new THREE.MeshBasicMaterial({color:0x6E8F6A, side:THREE.DoubleSide});
  /* 버그 수정: 이 '먼 배경 땅면'은 난간 너머로 보이라고 깔아 둔
     판인데, 옥상 바닥에서 겨우 3.2m 아래에 세계 전체(101×178m)를 덮는
     통짜 평면으로 놓여 있었다 — 그래서 옥상에서 5층으로 내려가는 계단을
     내려다보면, 계단 첫 도막과 두 번째 도막 사이(딱 -3.2m 지점)를 이 초록
     땅면이 가로막아 그 아래 계단이 전혀 안 보였다("초록색 무언가로 막혀 있다").
     옥탑방(중앙계단·비상계단) 발자국만큼은 실제로 구멍을 뚫어, 다른 층처럼
     계단실이 아래까지 뻥 뚫려 보이게 한다. 난간 너머 바깥 풍경 쪽은 옥탑방이
     가리고 있어 이 구멍이 보일 일이 없다.
     (좌표 규약은 아래 녹색 방수 바닥과 동일 — rotation.x=-π/2 라 Shape 로컬 Y가
      월드 -Z로 매핑되므로 z는 부호를 뒤집어 넣는다.) */
  var gndShape=new THREE.Shape();
  var gX=HX+SKY, gZ0=z0-SKY, gZ1=z1+SKY;
  gndShape.moveTo(-gX,-gZ0); gndShape.lineTo(gX,-gZ0);
  gndShape.lineTo(gX,-gZ1); gndShape.lineTo(-gX,-gZ1); gndShape.closePath();
  [[mainCX0,mainCX1,mainCZ0,mainCZ1],[emCX0,emCX1,emCZ0,emCZ1]].forEach(function(h){
    if(h[0]===null||h[0]===undefined) return;
    var hp=new THREE.Path();
    hp.moveTo(h[0],-h[2]); hp.lineTo(h[1],-h[2]);
    hp.lineTo(h[1],-h[3]); hp.lineTo(h[0],-h[3]); hp.closePath();
    gndShape.holes.push(hp);
  });
  var gnd=new THREE.Mesh(new THREE.ShapeGeometry(gndShape), gndMat);
  gnd.renderOrder=-2;
  gnd.rotation.x=-Math.PI/2; gnd.position.set(0, -3.2, 0); g.add(gnd);
  [[0, z1+SKY, Math.PI, (HX+SKY)*2],
   [0, z0-SKY, 0,       (HX+SKY)*2]].forEach(function(a){
    var m=fpMkTex(a[3], SH, sky, 1);
    m.rotation.y=a[2]; m.position.set(a[0], SKYC, a[1]); g.add(m);
  });
  [[HX+SKY, -Math.PI/2],[-HX-SKY, Math.PI/2]].forEach(function(a){
    var m=fpMkTex((zl+SKY*2), SH, sky, 1);
    m.rotation.y=a[1]; m.position.set(a[0], SKYC, zc); g.add(m);
  });
  /* 버그 수정: 옆면 하늘판 4장은 fpMkTex(빛을 받지 않는 MeshBasicMaterial)
     인데 윗하늘만 fpMkPlane(빛을 받는 MeshStandardMaterial)로 만들어져 있었다 —
     y≈100의 고공에는 광원이 하나도 없어서 이 판만 새까맣게 렌더링됐고, 옥상에서
     하늘을 올려다보면 검은 덩어리가 사선으로 하늘을 덮은 것처럼 보였다(하늘이
     깨져 보이던 원인). 옆면과 똑같이 빛을 받지 않는 재질로 통일한다. */
  var topMat=new THREE.MeshBasicMaterial({color:0x6FA9E0, side:THREE.DoubleSide});
  var top=new THREE.Mesh(new THREE.PlaneGeometry((HX+SKY)*2, zl+SKY*2), topMat);
  top.renderOrder=-2;
  top.rotation.x=Math.PI/2; top.position.set(0, SKYC+SH/2-0.5, zc); g.add(top);
  /* 녹색 방수 바닥 — 옥탑방들이 서는 자리는 구멍을 뚫어 뺀다(위 설명 참고).
     Shape+holes를 쓰지 않고 통짜 Plane 하나만 쓰던 것을 여기서 구멍 낸 버전으로 바꾼다. */
  /* 주의: 아래 fl 메쉬는 rotation.x=-Math.PI/2 로 눕히므로 Shape 로컬 Y가
     월드 -Z로 매핑된다(world Z = -localY) — 실제 z값을 그대로 넣으면 바닥과
     구멍이 반대쪽에 그려진다. 부호를 뒤집어(-z) 넣는다. */
  var flShape=new THREE.Shape();
  flShape.moveTo(-HX,-z0); flShape.lineTo(HX,-z0); flShape.lineTo(HX,-z1); flShape.lineTo(-HX,-z1); flShape.closePath();
  function roomHole(hx0,hx1,hz0,hz1){
    if(hx0===null) return;
    var hp=new THREE.Path();
    hp.moveTo(hx0,-hz0); hp.lineTo(hx1,-hz0); hp.lineTo(hx1,-hz1); hp.lineTo(hx0,-hz1); hp.closePath();
    flShape.holes.push(hp);
  }
  roomHole(mainCX0,mainCX1,mainCZ0,mainCZ1);
  roomHole(emCX0,emCX1,emCZ0,emCZ1);
  var flGeo=new THREE.ShapeGeometry(flShape);
  var flPos=flGeo.attributes.position, flUv=flGeo.attributes.uv;
  for(var fvi=0; fvi<flPos.count; fvi++){
    flUv.setXY(fvi, (flPos.getX(fvi)+HX)/(HX*2), (-flPos.getY(fvi)-z0)/zl);
  }
  var flTex=fpRoofPaintTex().clone(); flTex.needsUpdate=true;
  flTex.wrapS=flTex.wrapT=THREE.RepeatWrapping;
  flTex.repeat.set(Math.max(1,Math.round((HX*2)/1.4)), Math.max(1,Math.round(zl/1.4)));
  var flMat=new THREE.MeshStandardMaterial({map:flTex, color:0xFFFFFF, roughness:0.96, metalness:0.0});
  var fl=new THREE.Mesh(flGeo, flMat);
  fl.rotation.x=-Math.PI/2; fl.position.set(0, 0.02, 0); g.add(fl);
  function inRoom(px,pz,hx0,hx1,hz0,hz1){
    return hx0!==null && px>hx0 && px<hx1 && pz>hz0 && pz<hz1;
  }
  for(var si=0; si<14; si++){                            // 물 마른 얼룩
    var sx=((si*37)%100)/100*HX*1.8-HX*0.9;
    var sz=z0+((si*53)%100)/100*zl;
    /* 옥탑방 바닥(실내) 위로는 이 얼룩이 뚫린 구멍 사이로 비쳐 보이면 안 되므로,
       두 옥탑방 발자국 안에 떨어지는 얼룩은 아예 건너뛴다. */
    if(inRoom(sx,sz,mainCX0,mainCX1,mainCZ0,mainCZ1)) continue;
    if(inRoom(sx,sz,emCX0,emCX1,emCZ0,emCZ1)) continue;
    var st2=fpMkPlane(1.6+((si*7)%3), 1.2+((si*5)%3), 0x63A176, 0.55);
    st2.rotation.x=-Math.PI/2; st2.position.set(sx, 0.03, sz); g.add(st2);
  }
  /* 난간(파라펙) — 네 변 */
  var PH=1.08;
  [[HX,1],[-HX,-1]].forEach(function(a){
    var w=fpMkBox(0.32, PH, zl, 0xCFCCC0, 1);
    w.position.set(a[0]-a[1]*0.16, PH/2, zc); g.add(w);
    var cp=fpMkBox(0.44, 0.09, zl, 0xE4E1D6, 1);
    cp.position.set(a[0]-a[1]*0.16, PH+0.045, zc); g.add(cp);
    var mo=fpMkPlane(zl, 0.30, 0x7E8F82, 1);             // 안쪽 녹색 도장 띄
    mo.rotation.y=(a[1]>0)?Math.PI/2:-Math.PI/2;
    mo.position.set(a[0]-a[1]*0.33, 0.15, zc); g.add(mo);
  });
  [[z1,1],[z0,-1]].forEach(function(a){
    var w=fpMkBox(HX*2, PH, 0.32, 0xCFCCC0, 1);
    w.position.set(0, PH/2, a[0]-a[1]*0.16); g.add(w);
    var cp=fpMkBox(HX*2, 0.09, 0.44, 0xE4E1D6, 1);
    cp.position.set(0, PH+0.045, a[0]-a[1]*0.16); g.add(cp);
  });
  /* 중앙계단 옥탑방 + 그 안의 계단실(아래층에서 올라오는 단) —
     계단실 옆벽도 옥탑방과 같은 낮은 천장고(FP_VEST_H)까지만 올린다
     (예전엔 복층용 FP_MEZ_HH를 그대로 썼는데, 이제 복층이 없으므로 맞춘다). */
  g.add(fpMakeStairwell('R', stZ, ko, false, FP_VEST_H-0.05, ROOF_OW_MUL));
  /* 계단 꼭대기와 문 사이가 25cm밖에 안 돼 갑갑했다 → 밖으로 더 내어 낙참을 만든다 */
  /* 사진 속 공간감에 맞춰 방을 넓혔다 — 문 쪽 벽(cx0)은 문 위치와 맞물려 있어 그대로 두고,
     계단 안쪽(cx1)과 양옆(cz0/cz1)만 넉넉히 늘렸다. 옥상 난간까지 여유(X 약 2.7m)가 있어
     안전한 범위 안에서 확장. */
  /* FP_ST_WD를 계단참 확장을 위해 두 차례 늘렸으므로(누적 -0.80), 옥탑방 바깥
     경계가 예전과 똑같은 자리에 남도록 그만큼 빼서 보정한다. */
  /* 문 앞 바닥 개구부 : 진짜로 오르내리는 5층↔옥상 중앙계단(fpMakeStairwell,
     zDn 쪽 내려가는 단)이 지금까지는 옥탑방 바닥 Plane에 덮여 파묻혀 보였다.
     새 가짜 계단을 또 짓는 대신, 실제 계단이 있는 그 자리에 맞춰 바닥에
     구멍을 뚫고 난간을 둘러 '진짜 계단실 개구부'처럼 보이게 한다.
     (계단 폭을 ROW로 넓혔으므로 개구부도 그 폭에 맞춘다.) */
  /* v100: 바닥 개구부를 계단 끝(xs+N*run)에서 끊지 않고 계단실 뒷벽
     (FP_WALL_X+FP_ST_WD)까지 — 즉 계단 아래 계단참 위쪽까지 — 뚫는다. 예전엔
     계단 끝~뒷벽 사이 1.5m가 옥상 바닥으로 막혀 있어, 위에서 내려다보면 데크
     밑에 밝은 판이 하나 걸려 있는 것처럼 보였고 실사진처럼 계단참이 내려다보이지
     않았다. 데크(y=1.42, x=뒷벽-2.1~뒷벽)는 그 위에 그대로 떠 있다. */
  var realDnX0=FP_WALL_X+FP_ST_LAND+FP_R_XSHIFT-0.10, realDnX1=FP_WALL_X+FP_ST_WD-0.02;   // v109: 개구부 시작도 짧아진 옥상 도막 첫 단에 맞춰 안쪽으로
  var realDnZ0=stZ-(ROW/4+0.02)-(ROW/2-0.10)/2-0.10;
  var realDnZ1=stZ-(ROW/4+0.02)+(ROW/2-0.10)/2+0.10;
  fpMakeHeadhouse(g, mainCX0, mainCX1, mainCZ0, mainCZ1, ko,
                     ko?'중앙계단':'MAIN STAIRS', FP_VEST_H,
                     /* v131: 바닥 개구부가 데크(DKX0=mainCX1-1.92 ~ DKX1) 밑까지 들어와 있어서,
                        5층에서 데크를 올려다보면 밑면 -Z쪽 절반(Z<realDnZ1)만 4.5m 아래까지 뻥 뚫려 보이고
                        +Z쪽 절반은 옥탑방 바닥으로 막혀 있어 "반쪽만 채워진" 상태였다. 데크가 위를 덮고 있어
                        이 구간은 옥상에서 내려다볼 일이 없으므로, 개구부를 데크 앞 가장자리(DKX0)에서 끊어
                        데크 밑면 전체가 +Z쪽과 같은 테라조 바닥으로 받쳐지게 한다. */
                     {x0:realDnX0, x1:mainCX1-1.92, z0:mainCZ0-0.02, z1:realDnZ1},   // v116: 뒷벽이 다시 계단실 뒷벽과 같은 자리 — 바닥 절단면이 벽 뒤로 숨게 2cm 더 뚫는다   // v101: -Z·뒷벽 쪽은 벽면까지 완전히 뚫어 바닥 테두리 조각이 안 남게. v105: 벽면보다 2cm 더 뚫어 바닥 절단면이 벽 뒤로 숨게(위에서 볼 때 벽·바닥 사이 실선 제거)
                     0.02, true);
  /* ↑ farPad: 뒷벽(cx1) 안쪽 베이지 벽의 ±Z 여유를 기본 0.25 → 0.02로 줄인다.
     0.25면 그 벽 끝이 바깥 벽돌 껍질(cz±0.04)보다 0.21m 밖으로 삐져나와, 아래
     벽돌 채움 상자를 붙인 뒤 옥상에서 보면 벽돌 면 한가운데 세로 베이지 줄로
     보였다(v96). 안쪽 옆벽(cz±0.01)은 0.02로도 빈틈 없이 덮인다. */
  /* v96: 옥탑방 뒷벽(cx1)과 옥상 난간(파라펫) 사이 틈을 같은 붉은
     벽돌의 막힌 상자로 채워, 옥상에서 보면 옥탑방이 난간까지 붙어 보이게 한다.
     겉껍질만 덧붙이는 A안 — 옥탑방 실내·바닥 개구부·걷기 영역(rMainX1)·
     스킵플로어 좌표는 전혀 건드리지 않는다. 치수는 fpMakeHeadhouse의 바깥
     벽돌 껍질(cx±0.01±OUT, OUT=0.03)·두겁(cap dx+0.34, 0.28 높이)과 맞춘다.
     v97: 비상계단 옥탑방에도 같이 쓰도록 함수로 뺐다(+X쪽 난간을 향한 방만). */
  function fillToParapet(cx1, cz0, cz1, HH){
    var OUT=0.03;
    var fx0=cx1+0.02, fx1=HX-0.32;                  // 옥탑방 벽돌 면 ~ 난간 안쪽 면 (껍질 끝 cx1+0.06과 4cm 겹침)
    var fz0=cz0-0.01-OUT-0.006, fz1=cz1+0.01+OUT+0.006;   // 옥탑방 껍질과 같은 평면에 두면 겹친 부분에 z-파이팅 줄이 생기고, 정확히 맞대면 실선 틈이 보인다 — 6mm 바깥으로 빼서 겹친다
    if(fx1-fx0<0.2) return;
    var fdx=fx1-fx0, fdz=fz1-fz0, fmx=(fx0+fx1)/2, fmz=(fz0+fz1)/2;
    function fillWall(w,h,px,py,pz,roty){
      var tex=fpBrickExteriorTex().clone(); tex.needsUpdate=true;
      tex.repeat.set(Math.max(1,Math.round(w/0.55)), Math.max(1,Math.round(h/0.30)));
      var mat=new THREE.MeshStandardMaterial({color:0xFFFFFF, map:tex, roughness:0.94, metalness:0.02,
        side:THREE.DoubleSide});
      var m=new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat);
      m.rotation.y=roty||0; m.position.set(px,py,pz); g.add(m);
    }
    fillWall(fdx, HH, fmx, HH/2, fz0, Math.PI);       // -Z 면
    fillWall(fdx, HH, fmx, HH/2, fz1, 0);             // +Z 면
    fillWall(fdz, HH, fx1, HH/2, fmz, -Math.PI/2);    // 난간 쪽(+X) 면 — 난간 위로 보이는 부분
    var fcap=fpMkBox(fdx+0.34, 0.28, fdz+0.34-0.06, 0xB9B3A4, 1);   // 두겁 — 옥탑방 두겁과 같은 높이·색
    fcap.position.set(fmx+0.17, HH+0.14, fmz); g.add(fcap);
  }
  fillToParapet(mainCX1, mainCZ0, mainCZ1, FP_VEST_H);
  /* 뒤쪽(철문을 등지고 돌아본 방향) 스킵 플로어 — 낮춘 천장(FP_VEST_H)에 맞춘
     축소판이라, 기존 4m짜리 fpMakeMezzanine(주석 처리, 필요시 되살릴 수 있음)과는
     별개다.
     구조 정정: 계단 개구부가 다시 방의 -Z쪽으로 돌아왔으므로,
     스킵플로어(창고 데크)는 겹치지 않게 반대쪽(+Z) 남은 자리에 짓는다.
     이 함수는 넘겨준 wallZ1 쪽(최대 Z)에 데크를 밀착시키므로, 옥탑방 +Z
     벽면을 기준으로 잡아 준다. */
  /* 데크(복층 슬래브)가 뒷벽 폭의 +Z쪽 절반(계단 개구부 반대편)만
     덮고 있어서, 왼쪽 끝이 허공에서 뚝 끊긴 것처럼 보였다 — 시작점을 방
     경계(mainCZ0)까지 당겨 뒷벽 전체 폭을 채운다. 데크가 놓이는 X구간
     (뒷벽에서 2.1m)은 계단 개구부(realDnX1)보다 거의 안쪽이라, 넓혀도
     내려가는 계단을 덮지 않는다. */
  fpMakeRoofSkipFloor(g, mainCX1, mainCZ0+0.02, mainCZ1-0.3, ko, mainCZ1-0.02, realDnZ1pre-0.08);   // v105: 오르는 계단을 내려가는 계단 가장자리(realDnZ1pre-0.10)에 2cm까지 붙인다 — 실사진처럼 두 계단이 난간 하나 사이에 두고 맞닿게
  /* 옆벽(mainCZ1)에 달았던 진한 초록 프레임 창문을 없앤다 —
     사용자가 화면에서 어색하게 튀어 보인다고 지적했다. */
  /* 지난번 추가했던 "연결 난간"이, 방 폭을 실측 비율로 좁힌 뒤로는 좌표가
     어긋나 오히려 계단을 가로막는 이상한 펜스처럼 보였다(제거).
     두 난간의 연결감은 걷기 쉬운 배치(간격 축소)만으로 대신한다. */
  /* fpMakeMezzanine(g, mainCX0, mainCX1, mainCZ0, mainCZ1, ROW); */
  /* 비상계단 옥탑방 */
  if(es){
    /* 문(옥탑방)만 있고 정작 그 안의 계단·벽이 없어서, 문을 열면 계단 없이
       뻥 뚫린 채로 하늘이 비쳐 보이거나 깜깜하게 보였다 — 중앙계단과 똑같이
       실제 오르내리는 계단실 구조를 지어 넣는다. */
    /* 옥상 비상계단은 좌우(Z) 폭이 다른 층보다 좁아 보인다는 옥탑방 자체(emCZ 기준 3.7m)는 여유가 있으므로, owMul로 옥상에서만
       개구부 폭(FP_EM_OW)을 살짝 넓힌다(걷기 경로는 그대로라 항상 그 안쪽에
       들어온다 — 위 owMul 주석 참고). */
    g.add(fpMakeStairwell('R', esz, ko, true, 2.90, 1.0));   // v129: 1.15→1.0 — 옥상 비상계단실만 15% 넓어, 5층 계단실 옆벽이 계단참 위 45cm 구간에서 20cm 안쪽으로 튀어나온 턱(띠)처럼 보였다. 5층과 같은 폭으로 맞춘다
    /* 중앙계단 옥탑방과 똑같이, 아래층으로 내려가는 계단 자리만큼
       방 바닥에 실제로 구멍을 뚫는다(예전엔 통짜 바닥이라 계단이 바닥 밑에
       파묻혀 보이지 않았다). 좌표식은 fpMakeStairwell이 계단을 놓는 공식
       (xs=x0+LAND, zDn=zc-OW/4-0.02, 계단 폭 fw=OW/2-0.10)과 똑같이 맞춘다 —
       여기 OW는 위 호출에서 준 owMul(1.15)이 곱해진 값이다. */
    var emOWr=FP_EM_OW*1.15;
    var emDnX0=FP_WALL_X+FP_ST_LAND-0.10;
    var emDnX1=FP_WALL_X+FP_ST_LAND+FP_ST_N*FP_ST_RUN+0.10;
    var emDnZ0=esz-(emOWr/4+0.02)-(emOWr/2-0.10)/2-0.10;
    var emDnZ1=esz-(emOWr/4+0.02)+(emOWr/2-0.10)/2+0.10;
    fpMakeHeadhouse(g, emCX0, emCX1, emCZ0, emCZ1, ko, ko?'비상계단':'EMERGENCY',
                    undefined, {x0:emDnX0, x1:emDnX1, z0:emDnZ0, z1:emDnZ1}, 0.02, false);   // farPad 0.15→0.02: 중앙계단 옥탑방과 같은 이유(벽돌 채움 뒤 세로 베이지 줄 방지)
    /* v97: 비상계단 옥탑방도 중앙계단과 같이 뒷벽~난간 틈을 벽돌로 채운다.
       문이 -X쪽(cx0)에 있으므로 난간이 +X쪽에 있을 때(esx>0)만 해당한다. */
    if(esx>0) fillToParapet(emCX1, emCZ0, emCZ1, 2.95);
  }
  /* ── 옥상 바깥 장식물 ──────────────────────────────────────────────
     예전에 난간을 따라 줄지어 놓았던 '실외기 6대 + 배관 기둥'은
     삭제했다(박스에 평면 팬 한 장을 붙인 형태라 옥상 데크에서 보면 정체불명의
     상자처럼 보였다). 대신 실제 대학 건물 옥상에 있을 법한 설비·휴게 요소를
     배치해 허전함을 채운다. 건물 구조(난간·옥탑방·바닥)는 전혀 건드리지 않고
     장식 메쉬만 얹는다.
     좌표 기준 : 중앙계단 옥탑방은 x −0.2~8.3 / z 0.26~6.92 이고, 철문을 나서면
     x≈−0.9, z≈3.6 에 선다. 그 정면 통로(x −6~0, z 2~5)는 비워 둔다. */
  (function(){
    var FY=0.02;                                  // 옥상 방수 바닥 윗면
    var STL=0xB9BDC0, STL2=0x8E969B, CONC=0xC2BFB4;

    /* ① 스테인리스 물탱크 2기 — 각파이프 받침 위에 얹힌 원통 */
    [[-7.4,-6.6],[-7.4,-3.0]].forEach(function(p){
      var tx=p[0], tz=p[1], legH=0.62, tR=0.95, tH=1.75;
      [[-0.62,-0.62],[0.62,-0.62],[-0.62,0.62],[0.62,0.62]].forEach(function(o){
        var lg=fpMkBox(0.10, legH, 0.10, STL2, 1);
        lg.position.set(tx+o[0], FY+legH/2, tz+o[1]); g.add(lg);
      });
      var pad=fpMkBox(1.7, 0.10, 1.7, STL2, 1);
      pad.position.set(tx, FY+legH+0.05, tz); g.add(pad);
      /* 금속(metalness가 높은) 재질은 반사할 환경맵이 없으면 야외에서도
         새까맣게 렌더링된다 — 다른 스테인리스 부재와 똑같이 envMap을 물린다. */
      var env2=fpEnsureEnvMap();
      var body=new THREE.Mesh(new THREE.CylinderGeometry(tR, tR, tH, 18),
        new THREE.MeshStandardMaterial({color:0xD8DDE0, roughness:0.34, metalness:0.55,
          envMap:env2, envMapIntensity:1.0}));
      body.position.set(tx, FY+legH+0.10+tH/2, tz); g.add(body);
      var lid=new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.14, 14),
        new THREE.MeshStandardMaterial({color:0xC6CCD0, roughness:0.38, metalness:0.5,
          envMap:env2, envMapIntensity:1.0}));
      lid.position.set(tx, FY+legH+0.10+tH+0.07, tz); g.add(lid);
      // 급수 배관 — 탱크 옆면에서 바닥으로 내려온다
      var dp=fpMkPipe(FY+legH+0.6, 0.055, 0x9AA3A8, 1);
      dp.position.set(tx+tR+0.10, (FY+legH+0.6)/2, tz); g.add(dp);
    });

    /* ② 태양광 패널 어레이 — 옥탑방 뒤쪽(−Z)에 3열, 남향으로 기울여 세운다 */
    [-4.2, -6.9, -9.6].forEach(function(pz){
      for(var c=0;c<3;c++){
        var px=2.2+c*2.3;
        var frameH=0.34;
        [-0.95, 0.95].forEach(function(o){
          var lg=fpMkBox(0.07, frameH, 0.07, STL2, 1);
          lg.position.set(px+o, FY+frameH/2, pz-0.55); g.add(lg);
          var lg2=fpMkBox(0.07, frameH+0.42, 0.07, STL2, 1);
          lg2.position.set(px+o, FY+(frameH+0.42)/2, pz+0.55); g.add(lg2);
        });
        var pnl=new THREE.Mesh(new THREE.BoxGeometry(2.10, 0.05, 1.30),
          new THREE.MeshStandardMaterial({color:0x1F3A63, roughness:0.28, metalness:0.45}));
        pnl.rotation.x=-0.30;
        pnl.position.set(px, FY+frameH+0.24, pz); g.add(pnl);
        var edge=new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.03, 1.38),
          new THREE.MeshStandardMaterial({color:0xC9CDD0, roughness:0.4, metalness:0.6}));
        edge.rotation.x=-0.30;
        edge.position.set(px, FY+frameH+0.215, pz); g.add(edge);
      }
    });

    /* ③ 삭제: 야외 원형 테이블 + 벤치 두 개를 없앤다. */

    /* ④ 화단 상자 — 난간(−X) 쪽을 따라 세 개, 관목 몇 그루씩 */
    [13.4, 15.6, 17.8].forEach(function(pz, pi){
      var px=-8.9;
      var box=fpMkBox(0.9, 0.44, 1.7, 0xA9654A, 1);
      box.position.set(px, FY+0.22, pz); g.add(box);
      var soil=fpMkPlane(0.8, 1.6, 0x4A3A2C, 1);
      soil.rotation.x=-Math.PI/2; soil.position.set(px, FY+0.445, pz); g.add(soil);
      for(var b=0;b<3;b++){
        var bush=new THREE.Mesh(new THREE.SphereGeometry(0.24+((b+pi)%2)*0.05, 10, 8),
          new THREE.MeshStandardMaterial({color:(b%2)?0x4E7F42:0x5E9150, roughness:0.95}));
        bush.scale.y=0.8;
        bush.position.set(px, FY+0.60, pz-0.55+b*0.55); g.add(bush);
      }
    });

    /* ⑤ 위성/통신 안테나 — 삼각대 위 접시 */
    (function(){
      var ax=8.2, az=12.6;
      [[-0.45,-0.26],[0.45,-0.26],[0,0.52]].forEach(function(o){
        var lg=fpMkBox(0.08, 0.95, 0.08, STL2, 1);
        lg.position.set(ax+o[0], FY+0.475, az+o[1]); g.add(lg);
      });
      var dish=new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 10, 0, Math.PI*2, 0, Math.PI/2.6),
        new THREE.MeshStandardMaterial({color:0xEDEEEA, roughness:0.55, metalness:0.15,
          side:THREE.DoubleSide}));
      dish.rotation.z=Math.PI/2; dish.rotation.y=-0.5;
      dish.position.set(ax, FY+1.35, az); g.add(dish);
      var arm=fpMkPipe(0.55, 0.035, STL2, 1, 'x');
      arm.position.set(ax-0.30, FY+1.35, az); g.add(arm);
    })();

    /* ⑥ 삭제: 환기 후드·배기 파이프(콘크리트 받침 + 원통 덕트 +
       원뿔 후드) 세 무리를 없앤다. */

    /* ⑦ 피뢰침 — 모서리에 가늘고 높게 */
    (function(){
      var lx=HX-1.2, lz=zc+41;   // 옥탑방·통로에서 충분히 떨어진 +Z 끝 모서리
      var mast=fpMkPipe(3.2, 0.045, 0x8E969B, 1);
      mast.position.set(lx, FY+1.6, lz); g.add(mast);
      var tip=new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.34, 8),
        new THREE.MeshStandardMaterial({color:0xD8DDE0, roughness:0.3, metalness:0.8}));
      tip.position.set(lx, FY+3.2+0.17, lz); g.add(tip);
      var foot=fpMkBox(0.42, 0.14, 0.42, CONC, 1);
      foot.position.set(lx, FY+0.07, lz); g.add(foot);
    })();

    /* ⑧ 안전 안내 표지판 — 난간 안쪽에 세워 둔 노란 경고판 */
    (function(){
      var sx=-9.4, sz=6.4;
      [-0.34, 0.34].forEach(function(o){
        var lg=fpMkPipe(1.15, 0.028, STL2, 1);
        lg.position.set(sx, FY+0.575, sz+o); g.add(lg);
      });
      var bd2=fpMkPlane(0.86, 0.58, 0xE8C33A, 1);
      bd2.rotation.y=Math.PI/2; bd2.position.set(sx, FY+1.28, sz); g.add(bd2);
      var bd2b=fpMkPlane(0.78, 0.50, 0x2E2A22, 1);
      bd2b.rotation.y=Math.PI/2; bd2b.position.set(sx+0.006, FY+1.28, sz); g.add(bd2b);
      var bd2c=fpMkPlane(0.70, 0.42, 0xE8C33A, 1);
      bd2c.rotation.y=Math.PI/2; bd2c.position.set(sx+0.010, FY+1.28, sz); g.add(bd2c);
      var txt2=fpMkTex(0.56, 0.16, fpWallTextTex('난간에 기대지 마시오','#2E2A22'), 1);
      txt2.rotation.y=Math.PI/2; txt2.position.set(sx+0.014, FY+1.24, sz); g.add(txt2);
    })();
  })();
  return g;
}
