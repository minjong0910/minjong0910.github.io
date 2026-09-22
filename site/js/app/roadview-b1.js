"use strict";
/* roadview-b1.js — 1인칭 로드뷰 — 지하 1층 크리에이티브 존 · 트인 공간
   (예전 한 파일 main.js 의 6713~9114줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
/* 아래 걷기용 좌표(zA0~zA2, xA0~xA2)는 fpMakeB1(그리기)과 fpBuildNodes/fpGoTo(걷기)이
   똑같이 계산해 쓰도록 함수로 빼 둔다. */
/* 중앙계단 옆(계단 단의 -Z 쪽) 빈 공간의 범위 — 그리기(fpMakeB1)·걷기 영역
   (fpBuildRooms)·이동 지점(fpBuildNodes)이 모두 이 한 곳을 쓴다.
   stZ: 계단 중심 z, sideZ: 계단실 -Z 옆벽 z(못 찾으면 근사값). */
function fpB1StairNook(stZ, sideZ){
  var OW=FP_ST_OW*1.4, fw=OW/2-0.10;
  var zUp=stZ+(OW/4+0.02);                 // 올라가는 단이 놓인 열(중심)
  var z0=(sideZ!==undefined&&sideZ!==null?sideZ:(stZ-OW/2))+0.03;
  var z1=zUp-fw/2-0.03;                    // 계단 단 바로 앞까지
  var x0=FP_WALL_X+FP_ST_LAND, x1=FP_WALL_X+FP_ST_WD_B1F;
  if(x1-x0<0.4||z1-z0<0.4) return null;
  return {x0:x0, x1:x1, z0:z0, z1:z1};
}
function fpB1ExitPts(){
  var zz1 = FP_B1_ZTOP+30.0;
  var vestD = 1.7;                       // 방풍실(이중문 사이) 깊이 — fpMakeB1과 같은 값
  var zDoorOut = zz1 + vestD;            // 바깥 문 자리(여기부터 계단이 시작된다)
  var zA0 = zDoorOut + 0.9;              // 1구간 첫 단
  var zA1 = zA0 + FP_B1_EXIT_N1*FP_B1_EXIT_RUN;   // 1구간 끝 = 계단참 시작
  var zA2 = zA1 + FP_B1_EXIT_LAND_D;              // 계단참 끝(막힌 벽)
  var zMid = (zA1+zA2)/2;                // 계단참 한가운데 — 2구간은 이 높이(Z)에서 옆으로 뻗는다
  var dir = FP_B1_EXIT_TURNDIR;
  var xA0 = FP_B1_EXIT_X;                // 1구간이 오르는 X(계단참 가운데)
  var xB0 = xA0 + dir*FP_B1_EXIT_SW/2;   // 2구간 첫 단(계단참 옆면에서 시작)
  var xB1 = xB0 + dir*FP_B1_EXIT_N2*FP_B1_EXIT_RUN;  // 2구간 끝
  var xB2 = xB1 + dir*1.0;               // 맨 위 참 + 문 자리
  return {zz1:zz1, vestD:vestD, zDoorOut:zDoorOut,
          zA0:zA0, zA1:zA1, zA2:zA2, zMid:zMid,
          xA0:xA0, xB0:xB0, xB1:xB1, xB2:xB2, dir:dir};
}
/* 지하 나가는 계단(exit1/exit2)에서 자유롭게 걸어 다닐 수 있게 하면서,
   스크립트로 짜인 "오르는 연출" 없이도 실제로 계단을 밟은 만큼 눈높이(y)가 저절로
   따라오게 하는 함수 — 지금 서 있는 (x,z) 위치만 보고 매 프레임 눈높이를 계산한다.
   1구간(문→계단참)은 z 진행률로, 2구간(계단참 옆 90도 꺾인 계단)은 x 진행률로 높이를 보간한다. */
function fpB1ExitY(x, z){
  var P=fpB1ExitPts();
  var h1=FP_B1_EXIT_H1, topY=h1+FP_B1_EXIT_N2*FP_B1_EXIT_RISE;
  if(z<=P.zA0) return 0;
  if(z<P.zA1){
    var t1=fpClamp((z-P.zA0)/(P.zA1-P.zA0), 0, 1);
    return h1*t1;
  }
  // 계단참(zA1~zA2) 이후 : 2구간 계단은 x축으로 오르므로, 지금 x가 그 계단 폭 안에
  // 있으면 x 진행률로, 그 밖(계단참 전체 또는 맨 위 참)이면 계단참/맨 위 높이 그대로.
  var xLo=Math.min(P.xB0,P.xB1), xHi=Math.max(P.xB0,P.xB1);
  if(x>=xLo && x<=xHi){
    var t2=fpClamp((x-P.xB0)/(P.xB1-P.xB0), 0, 1);
    return h1 + t2*(topY-h1);
  }
  var pastStair2 = (P.dir>0) ? (x>xHi) : (x<xLo);
  if(pastStair2) return topY;
  return h1;
}
/* ══════════ 지하 1층 : 크리에이티브 존 ══════════════════════════
   실제 배치(사진 기준) :
     엘리베이터에서 내려 오른쪽(-Z)은 막다른 벽,
     왼쪽(+Z)으로 돌면 계단을 지나 복도 끝에 크리에이티브 존 출입문이 정면으로 보인다.
     문은 검은 프레임 유리 두 짝, 안은 스터디카페 같은 열람 공간이고
     그 안쪽 오른편 끝에 밖으로 나가는 계단이 있다. */
function fpMakeB1(ko){
  var g=new THREE.Group();
  var H=FP_CEIL_H, X=FP_WALL_X;
  var evZ=B1_evZ*BUILDING_Z_STRETCH, stZ=B1_stZ*BUILDING_Z_STRETCH;
  var zEnd=FP_B1_ZEND, zTop=FP_B1_ZTOP;

  function wallSeg(side, zc, w, y0, h){
    if(w<=0.02||h<=0.02) return;
    var rot=(side>0)?-Math.PI/2:Math.PI/2;
    /* 실사진(지하 1층 엘리베이터 앞) 기준 — 다른 층과 같은
       크림색 벽지로 통일한다. 예전의 어두운 사이버펑크 남색·시안 네온선은
       이 실제 사진과 전혀 다른 색이었다. */
    var m=fpMkPlane(w,h,0xE8DFC8,1,0x9C8F6E);
    m.rotation.y=rot; m.position.set(side*X, y0+h/2, zc); g.add(m);
    if(y0<0.01){
      var kb=fpMkPlane(w,0.16,0x080C13,1);
      kb.rotation.y=rot; kb.position.set(side*(X-0.012),0.08,zc); g.add(kb);
    }
    if(y0+h>H-0.02){
      var mold=fpMkPlane(w,0.05,0x5B4F3D,1);   // 네온선 대신 다른 층과 같은 짙은 크라운 몰딩
      mold.rotation.y=rot; mold.position.set(side*(X-0.012),H-0.03,zc); g.add(mold);
    }
  }
  /* ── 복도 바닥 : 위층 복도(fpMakeCorr)와 같은 테라조 광택 바닥으로 통일 ──
     예전엔 이 구간(zEnd~zTop, 엘리베이터·계단 앞)에 바닥판이 아예 없어서
     건물 3D 상자의 밋밋한 색이 그대로 비쳤다(다른 층 복도처럼).
     원상복구: 바닥·천장에 구멍을 뚫었더니 복도 쪽에서 계단실이
     창문처럼 뚫려 보이는 부작용이 생겼다 — 통짜 판으로 되돌린다. */
  var b1cfl=fpMkFloorGloss(X*2+0.24, zTop-zEnd, fpTerrazzoTex());
  b1cfl.rotation.x=-Math.PI/2; b1cfl.position.set(0, 0.06, (zEnd+zTop)/2); g.add(b1cfl);

  /* ── 천장 : 1층 복도(fpMakeCorrCeiling)와 같은 밝은 천장 + 매립등 ──
     크리에이티브 존(zTop 너머)은 제외하고, 승강장·계단 앞
     복도 구간(zEnd~zTop)만 1층과 동일한 톤으로 통일한다. 기존엔 이 구간에
     전용 천장판이 없어 건물 전체를 덮는 어두운 공용 천장(fpCeil)만 보였다. */
  (function(){
    var ceilY=H-0.02;
    /* 벽(크림 0xE8DFC8)과 색 차이가 커서 천장을 올려다볼 때 흰
       면처럼 눈부시게 붕 떠 보였다 — 벽과 비슷한 계열의 톤으로 낮춘다. */
    var ceil=fpMkPlane(X*2+0.24, zTop-zEnd, 0xE9E0C9, 1);
    ceil.rotation.x=Math.PI/2; ceil.position.set(0, ceilY, (zEnd+zTop)/2); g.add(ceil);
    var FIX_W=0.9, FIX_D=0.28, FIX_INTENSITY=0.14, FIX_DIST=3.4;
    var len=zTop-zEnd;
    var n=Math.max(1, Math.round(len/3.6));
    /* 성능 개선: 등 플레이트(시각 요소)는 그대로 촘촘히 두고,
       실제 계산 비용이 드는 PointLight만 최대 4개로 줄인다 — fpMakeCorr의
       복도 조명과 같은 방식. */
    var LIGHT_MAX=4;
    var lightEvery=Math.max(1, Math.ceil(n/LIGHT_MAX));
    var boost=Math.min(2.2, lightEvery);
    for(var i=0;i<n;i++){
      var fz=zEnd + (i+0.5)*(len/n);
      var fix=fpMkPlane(FIX_W, FIX_D, 0xE8D9AE, 1, 0xE8D9AE);
      fix.rotation.x=Math.PI/2; fix.position.set(0, ceilY-0.02, fz); g.add(fix);
      if(i%lightEvery===0){
        var pl=new THREE.PointLight(0xFFF8E7, FIX_INTENSITY*boost, FIX_DIST*Math.sqrt(boost), 2);
        pl.position.set(0, ceilY-0.14, fz); g.add(pl);
      }
    }
  })();

  /* ── 복도 : 엘리베이터·계단이 있는 +X 벽 ── */
  var evW=FP_EV_DW+0.14, evH=FP_CAB_H*0.85+0.06;   // 위층들과 같은 문 폭
  /* ── 최종: 엘리베이터와 계단 사이 벽은 아무것도 없는 평평한 벽이다.
     예전엔 이 자리에 (a) 문만 붙인 장식 → (b) 깊은 사각 벽감 + 검은 문 →
     (c) 계단까지 이어지는 긴 벽감 → (d) 계단 옆 얕은 벽감 + 검은 문 순으로
     바뀌어 왔는데, 실제로는 문도 벽감도 없이 그냥 평평한 벽이라 전부 삭제한다.
     이제 이 +X 벽에 뚫리는 것은 엘리베이터 개구부와 계단 개구부뿐이다. */
  var b1StairG=fpMakeStairwell('B1', stZ, ko);
  /* 계단실 양옆 벽의 z를 실제 메쉬에서 읽어 온다 — 계단실 폭이 층마다 달라
     (지하는 1.4배) 상수로 못 박는다. 복도 개구부를 이 두 벽까지 넓혀야
     계단 양옆에 복도 벽 조각이 기둥처럼 튀어나와 보이지 않는다. */
  var b1StSideZ=null, b1StSideZ2=null;              // -Z 쪽 / +Z 쪽 옆벽
  b1StairG.traverse(function(o){
    if(!o.isMesh||!o.geometry||!o.geometry.parameters) return;
    var pr=o.geometry.parameters;
    if(pr.width===undefined||pr.height===undefined) return;
    /* 옆벽만 고른다 — 계단실 안쪽 끝 벽은 폭(14.22)도 다르고 z축에 수직이 아니라
       (rotation.y=±90°) 여기서 걸러내지 않으면 +Z 옆벽으로 잘못 잡힌다. */
    if(Math.abs(pr.width-FP_ST_WD_B1F)>0.3||pr.height<3) return;
    if(Math.abs(Math.sin(o.rotation.y))>0.2) return;
    if(o.position.z<stZ){ if(b1StSideZ===null||o.position.z>b1StSideZ) b1StSideZ=o.position.z; }
    else               { if(b1StSideZ2===null||o.position.z<b1StSideZ2) b1StSideZ2=o.position.z; }
  });
  if(b1StSideZ===null)  b1StSideZ =stZ-FP_ST_OW/2-0.90;
  if(b1StSideZ2===null) b1StSideZ2=stZ+FP_ST_OW/2+0.90;
  /* 보라색 표시 = 계단 옆에 기둥처럼 서 있던 벽 조각: 계단실은 복도 개구부(4.4m)보다 넓게(지하는 1.4배) 지어져서, 계단실 -Z 옆벽
     (b1StSideZ)과 복도 개구부 가장자리(stZ-FP_ST_OW/2) 사이에 0.9m쯤 되는 복도 벽
     조각이 남아 있었다 — 그 뒤로 계단실 옆벽이 그대로 비쳐서, 계단 옆에 크림색
     기둥이 하나 서 있는 것처럼 보이던 원인. 개구부의 -Z 쪽 끝을 계단실 옆벽까지
     넓혀서 그 조각을 없앤다(위쪽 상인방은 그대로 둔다 — 없애면 그 위 어두운
     천장 공간이 그대로 드러나 더 어색했다). */
  var stHoleZ0=Math.min(b1StSideZ, stZ-FP_ST_OW/2),
      stHoleZ1=Math.max(b1StSideZ2, stZ+FP_ST_OW/2);   // +Z 쪽(크리에이티브 존 쪽)도 계단실 옆벽까지 넓힌다
  /* 계단 위 흰 판때기: 개구부 높이가 2.18m밖에 안 돼 그 위로 크림색 벽이
     1.1m나 걸쳐 있었다 — 계단에서 내려다보면 흰 판때기가 얹혀 있는 것처럼 보이던 것.
     개구부를 2.80m까지 올려 그 띠를 0.5m로 줄이고, 실사진처럼 검은색으로 칠해
     '계단 입구 검은 헤더'로 읽히게 한다.
     (완전히 천장까지 뚫어도 봤지만, 그 위 건물 공용 천장이 어두운 남색이라
     계단 위가 시커멓게 뚫려 보여 훨씬 어색했다.) */
  var stOpenH=2.80;
  var holes=[{z:evZ,w:evW,h:evH},
             {z:(stHoleZ0+stHoleZ1)/2, w:stHoleZ1-stHoleZ0, h:stOpenH}];
  holes.sort(function(a,b){ return a.z-b.z; });
  var cur=zEnd;
  holes.forEach(function(o){
    var a=o.z-o.w/2, b=o.z+o.w/2;
    if(a>cur) wallSeg(1,(cur+a)/2,a-cur,0,H);
    wallSeg(1,o.z,o.w,o.h,H-o.h);
    cur=Math.max(cur,b);
  });
  if(zTop>cur) wallSeg(1,(cur+zTop)/2,zTop-cur,0,H);
  fpMakeEvLanding(g, 'B1', evZ, evW, evH, H, ko);   // 위층과 똑같은 승강장 마감
  g.add(b1StairG);                                  // 계단실 — 옆벽 등 손대지 않고 그대로 쓴다
  /* ── 중앙계단 옆(계단 단의 -Z 쪽) 빈 공간 ──
     실제로는 계단 옆으로 바닥이 이어져 있고, 그 끝(계단실 안쪽 끝 벽)에 검은 문이 있다.
     그런데 이 구간에는 바닥판이 아예 없어서 파란 배경이 그대로 드러났고, 걸어
     들어갈 수도 없었다 — 바닥·걸레받이·조명을 깔아 문 앞까지 걸어갈 수 있게 한다.
     (걷기 영역·이동 지점은 fpBuildRooms / fpBuildNodes 쪽에 같이 등록한다.) */
  (function(){
    var r=fpB1StairNook(stZ, b1StSideZ);
    if(!r) return;
    var nfl=fpMkFloorGloss(r.x1-r.x0, r.z1-r.z0, fpTerrazzoTex());
    nfl.rotation.x=-Math.PI/2; nfl.position.set((r.x0+r.x1)/2, 0.012, (r.z0+r.z1)/2); g.add(nfl);
    var nkb=fpMkPlane(r.x1-r.x0, 0.14, 0x080C13, 1);        // 옆벽 아래 걸레받이
    nkb.position.set((r.x0+r.x1)/2, 0.07, r.z0+0.012); g.add(nkb);
    /* 버그 수정: 이 천장판이 벽감 사각형(r.z0~r.z1)에 딱 맞게만
       깔려 있어서, 양쪽 끝과 실제 벽 사이에 2~3cm짜리 틈이 남아 있었다
       (레이캐스트 확인: z=3.75, z≤0.60 에서 위로 쏘면 천장을 지나쳐 6.60의
       건물 슬래브가 맞았다). 눈높이에서 비스듬히 올려다보면 그 몇 cm 틈이
       천장선을 따라 길게 이어진 검은 띠로 보인다 — 앞뒤로 0.2m씩 더 넉넉히
       깔아 벽 안쪽까지 물리게 한다(넘치는 부분은 벽·계단 매스에 가려진다). */
    var nceD=(r.z1-r.z0)+0.40;
    var nce=fpMkPlane(r.x1-r.x0, nceD, 0xE9E0C9, 1);        // 천장 — 위쪽 어두운 계단실 공간을 가린다
    nce.rotation.x=Math.PI/2; nce.position.set((r.x0+r.x1)/2, H-0.02, (r.z0+r.z1)/2); g.add(nce);
    /* 버그 수정: 복도 천장은 x≈2.22에서 끝나고 이 벽감 천장은
       x=3.25(계단참 끝)부터 시작해서, 그 사이 계단참 폭 약 1m만큼 천장이
       아예 없었다 — 엘리베이터와 중앙계단 사이에서 위를 올려다보면 천장
       한가운데를 가로지르는 검은 띠로 보였다(레이캐스트 확인: x=2.23~3.20
       구간에서 위로 쏘면 천장을 지나쳐 6.60의 건물 슬래브가 맞았다).
       그 구간만 덮는 판을 하나 더 깐다 — 양쪽 천장과 조금씩 겹치게 하되
       높이를 1.5cm 낮춰 같은 평면이 되지 않게 한다(z-파이팅 방지). */
    var lndCeX0=FP_WALL_X+0.04, lndCeX1=r.x0+0.06;
    if(lndCeX1-lndCeX0>0.05){
      var lndCe=fpMkPlane(lndCeX1-lndCeX0, nceD, 0xE9E0C9, 1);
      lndCe.rotation.x=Math.PI/2;
      lndCe.position.set((lndCeX0+lndCeX1)/2, H-0.035, (r.z0+r.z1)/2); g.add(lndCe);
    }
    [0.3, 0.7].forEach(function(t){                          // 천장 매립등 2개
      var fix=fpMkPlane(0.9, 0.26, 0xE8D9AE, 1, 0xE8D9AE);
      fix.rotation.x=Math.PI/2;
      fix.position.set(r.x0+(r.x1-r.x0)*t, H-0.05, (r.z0+r.z1)/2); g.add(fix);
    });
    var lite=new THREE.PointLight(0xFFF8E7, 0.26, 7.0);
    lite.position.set((r.x0+r.x1)/2, H-0.3, (r.z0+r.z1)/2); g.add(lite);
    /* 버그 수정: 이 벽감 천장(y=H) 위에서 1층 바닥판(y=SP) 아래까지,
       계단실의 -Z쪽 절반이 통째로 뻥 뚫린 빈 상자였다 — 1층에서 중앙계단으로
       지하에 내려가면서 오른쪽(계단 단의 -Z쪽)을 보면, 바로 옆에 벽이 있어야
       할 자리가 4.6m 깊이의 텅 빈 공간이고 저 멀리 계단실 반대편 벽만 보였다.
       (레이캐스트로 확인: 단 옆에서 -Z로 쏘면 첫 충돌이 4.59m 떨어진 z=0.59
        계단실 벽이었다 — 그 사이에 아무 면도 없었다.)
       벽감 천장 윗선부터 1층 바닥까지를 계단 옆면(벽감 앞선)에서 막아,
       내려가는 사람 눈에는 옆에 이어지는 벽으로 보이게 한다.
       (걷는 자리는 +Z쪽 단이고 벽감 안은 이 벽 아래라, 통행에는 닿지 않는다.) */
    var sideY0=H, sideY1=SP+0.05;
    if(sideY1-sideY0>0.05){
      var sideW=r.x1-FP_WALL_X;
      var vw2=fpMkPlane(sideW, sideY1-sideY0, 0xC9C0AE, 1, 0x39352B);
      vw2.position.set((FP_WALL_X+r.x1)/2, (sideY0+sideY1)/2, r.z1+0.02); g.add(vw2);
      /* 벽 밑동에 계단실과 같은 짙은 걸레받이 띠 — 천장선과 벽이 만나는 자리가
         칼로 자른 듯 붙어 보이는 걸 막는 마감선 */
      var vwk=fpMkPlane(sideW, 0.10, 0x9C978B, 1, 0x2A2721);
      vwk.position.set((FP_WALL_X+r.x1)/2, sideY0+0.05, r.z1+0.03); g.add(vwk);
    }
    /* 검은 문 앞에 서면 문 오른쪽(+Z, 계단이 끝나는 쪽) 구석이
       비어 있었다 — 계단 매스는 x=9.0에서 끝나는데 계단실 안쪽 끝 벽은
       x=10.47이라, 그 사이 1.5m 폭 구간만 계단도 벽도 없는 빈 구멍으로
       남아 있었고 문 앞에서 그 틈이 그대로 들여다보였다. 계단이 끝나는
       지점부터 안쪽 끝 벽까지를 벽체로 채운다(계단·걷는 경로와는 겹치지
       않는다 — 계단은 x<9.0, 오르내리는 경로는 y가 이 벽 위로 지나간다). */
    var stEndX = FP_WALL_X + FP_ST_LAND + FP_B1F_RUN_LEN;
    var nzEnd  = stZ + (FP_ST_OW*1.4/2 + 0.03);
    if(r.x1-stEndX > 0.05 && nzEnd-r.z1 > 0.05){
      var fillW=r.x1-stEndX, fillD=nzEnd-r.z1;
      /* 이 채움벽만 옆 계단실 벽보다 눈에 띄게 밝은 크림색으로
         떠 보였다 — 벽 색(0xC9C0AE)은 같지만 이 면이 정면(-Z)을 향해 빛을
         거의 정면으로 받는 탓에 실제 렌더 밝기가 옆벽의 1.4배쯤 됐다.
         옆 계단실 벽과 같은 밝기로 보이도록 기본색만 그만큼 낮춘다. */
      var fillB=fpMkBox(fillW, H, fillD, 0x898377, 1, 0x39352B);
      fillB.position.set((stEndX+r.x1)/2, H/2, (r.z1+nzEnd)/2); g.add(fillB);
      var fillK=fpMkPlane(fillW, 0.14, 0x080C13, 1);       // 문 앞에서 보이는 면의 걸레받이
      fillK.position.set((stEndX+r.x1)/2, 0.07, r.z1-0.012); g.add(fillK);
    }
  })();
  /* ── 계단 입구 헤더 : 개구부 위 남은 0.5m 띠를 실사진처럼 검게 칠한다.
     복도 쪽·계단실 쪽 양면에 한 장씩 덧대어 어느 쪽에서 봐도 검은 헤더로 보인다.
     ── 계단실 입구 위 천장 패치도 함께 둔다(가파른 각도에서 어두운 공용 천장이
     비치지 않게). */
  (function(){
    var hdH=H-stOpenH, hdW=stHoleZ1-stHoleZ0;
    if(hdH>0.02){
      [[X-0.014, -Math.PI/2],[X+0.014, Math.PI/2]].forEach(function(a){
        var hd=fpMkPlane(hdW, hdH, 0x14181D, 1);
        hd.rotation.y=a[1]; hd.position.set(a[0], stOpenH+hdH/2, (stHoleZ0+stHoleZ1)/2); g.add(hd);
      });
    }
    /* 버그 수정: 여기 있던 계단실 입구 천장 패치(y=H-0.022 = 3.278)는
       1층 바닥 높이와 거의 같은 자리라, 1층에서 중앙계단으로 내려가려고 하면
       계단 구멍을 뚜껑처럼 덮어 "계단이 막혀 있는" 것처럼 보였다 — 삭제한다.
       (개구부 위 어두운 부분이 살짝 보이는 것보다 계단이 뚫려 있는 게 중요하다.) */
  })();

  /* ── 계단 옆 '들어가는 곳'의 정면 벽(지하에서 중앙계단을 바라볼 때
     마주 보이는 벽 = 계단실 안쪽 끝 벽)에 검은 문 한 짝을 단다.
     예전엔 계단실 -Z 옆벽에 달아 뒀는데, 정면에서 보면 문이 옆으로 서 있어
     잘 보이지 않았다. 계단 왼쪽(작은 z) 빈 구간에 놓아 계단 자체와 겹치지 않게 한다.
     장식용이라 자동문 목록에는 넣지 않는다(항상 닫힘). */
  (function(){
    var sdW=0.95, sdH=2.10;
    var sdX=X+FP_ST_WD_B1F;                         // 계단실 안쪽 끝 벽(정면으로 보이는 면)
    var sdZ=stZ-1.70;                               // 계단 왼쪽(작은 z) — 계단 단과 겹치지 않는 자리
    var sdFr=fpMkPlane(sdW+0.12, sdH+0.10, 0x9C8F6E, 1);
    sdFr.rotation.y=-Math.PI/2; sdFr.position.set(sdX-0.015, sdH/2+0.02, sdZ); g.add(sdFr);
    var sdDoor=fpMkPlane(sdW, sdH, 0x0E1319, 1, 0x000000);
    sdDoor.rotation.y=-Math.PI/2; sdDoor.position.set(sdX-0.02, sdH/2, sdZ); g.add(sdDoor);
    var sdKn=fpMkDisc(0.045, 0x6F8A9C, 1);
    sdKn.rotation.y=-Math.PI/2; sdKn.position.set(sdX-0.03, sdH*0.46, sdZ-sdW/2+0.12); g.add(sdKn);
  })();

  /* (엘리베이터~계단 사이 벽감·검은 문은 요청에 따라 삭제 — 평평한 벽만 남는다) */

  /* ── 크리에이티브 존 입구 옆(-X 벽) 벽감 : 실사진(2번째) 반영 ──
     위치 이동, 지하만: 예전에는 이 벽감이 계단 도착 지점(stZ) 정면에
     있었는데, 실제 건물에서는 크리에이티브 존 입구 코너에 붙어 있다 —
     존 문 바로 앞(-X 벽 끝)으로 옮기고, 사진과 같은 구성으로 다시 만든다.
       · 뒷벽   : 검은 문(계단 쪽) + 회색 방화문(존 쪽)이 나란히
       · 옆벽   : 계단 쪽(-Z) 반환벽에 노란 스티커가 붙은 검은 문(뒷벽 문과 90도)
       · 바닥   : 회색 방화문 앞에 빨간 소화기 두 개
     계단 도착 지점(stZ)은 이제 평평한 복도 벽이 된다(아래 wallSeg가 자동 처리). */
  /* 벽감을 존 입구 벽(zTop)에 딱 붙여, 사이에 남던 0.2m짜리 복도 벽
     조각(모서리처럼 튀어나와 보이던 부분)을 없앤다 — 벽감 +Z 반환벽이 곧바로
     존 입구 벽과 한 면으로 이어진다. */
  /* 계단을 내려오면서 두 문이 모두 보이도록 벽감을 2.7 → 4.0m로 넓힌다
     (계단 쪽으로 1.3m 더 열린다). */
  var alcW=FP_B1_ALC_W, alcD=FP_B1_ALC_D, alcZ1=zTop, alcZ0=alcZ1-alcW,
      alcZc=(alcZ0+alcZ1)/2, backX=-X-alcD;
  // 벽감 좌우 옆벽(복도 평면 -X와 벽감 뒤쪽 backX 사이를 잇는 반환벽)
  [alcZ0, alcZ1].forEach(function(zc){
    var ret=fpMkPlane(alcD, H, 0xE8DFC8, 1, 0x9C8F6E);
    /* 버그 수정: +Z쪽 반환벽(alcZ1)은 크리에이티브 존 입구 벽과
       z가 완전히 같은 평면(z=zTop)이었다 — 두 면이 0.000m 간격으로 겹쳐
       깊이 판정이 매 픽셀 뒤집히면서, 벽감 안쪽 모서리에 점점이 찍힌
       검은 세로 띠(z-파이팅)가 생겼다. 복도 쪽으로 3cm 물려 세운다. */
    ret.position.set(-X-alcD/2, H/2, (zc===alcZ1 ? zc-0.03 : zc)); g.add(ret);
  });
  // 벽감 뒤쪽 벽(문 두 짝이 달리는 면) + 걸레받이 + 바닥·천장 패치
  var backWall=fpMkPlane(alcW, H, 0xE8DFC8, 1, 0x9C8F6E);
  backWall.rotation.y=-Math.PI/2; backWall.position.set(backX, H/2, alcZc); g.add(backWall);
  var backSkirt=fpMkPlane(alcW,0.16,0x080C13,1);
  backSkirt.rotation.y=-Math.PI/2; backSkirt.position.set(backX+0.012,0.08,alcZc); g.add(backSkirt);
  var alcFl=fpMkFloorGloss(alcD, alcW, fpTerrazzoTex());
  alcFl.rotation.x=-Math.PI/2; alcFl.position.set(-X-alcD/2, 0.06, alcZc); g.add(alcFl);
  var alcCe=fpMkPlane(alcD, alcW, 0xE9E0C9, 1);
  alcCe.rotation.x=Math.PI/2; alcCe.position.set(-X-alcD/2, H-0.02, alcZc); g.add(alcCe);
  /* 벽감 천장 매립등 — 복도 등(x=0)에서 빛이 닿지 않아 안쪽이 어둡게(퍼렇게) 죽어
     보였다. 걸어 들어갈 수 있는 자리이므로 은은한 등을 두 개 넣는다. */
  [-1.2, 1.2].forEach(function(dz){
    var alcFix=fpMkPlane(0.8, 0.24, 0xE8D9AE, 1, 0xE8D9AE);
    alcFix.rotation.x=Math.PI/2; alcFix.position.set(-X-alcD/2, H-0.04, alcZc+dz); g.add(alcFix);
  });
  var alcLite=new THREE.PointLight(0xFFF8E7, 0.20, 4.6);
  alcLite.position.set(-X-alcD/2, H-0.22, alcZc); g.add(alcLite);

  /* 뒷벽 : 검은 문 하나(회색 방화문과 도어클로저는 삭제) */
  (function(){
    var dW=0.92, dH=2.10, dZ=alcZc-0.35;   // 넓어진 벽감 안에서 계단 쪽에 가깝게
    var fr=fpMkPlane(dW+0.12, dH+0.10, 0x9C8F6E,1);
    fr.rotation.y=-Math.PI/2; fr.position.set(backX+0.015, dH/2+0.02, dZ); g.add(fr);
    var lf=fpMkPlane(dW, dH, 0x0E1319, 1, 0x000000);
    lf.rotation.y=-Math.PI/2; lf.position.set(backX+0.02, dH/2, dZ); g.add(lf);
    var kn=fpMkDisc(0.045, 0x6F8A9C, 1);
    kn.rotation.y=-Math.PI/2; kn.position.set(backX+0.03, dH*0.46, dZ-dW/2+0.12); g.add(kn);
    // 문 옆 바닥 소화기 두 개(사진 반영)
    [-0.12, 0.14].forEach(function(dz){
      var fe=fpMakeExtinguisher();
      fe.position.set(backX+0.28, 0, dZ-0.78+dz); g.add(fe);
    });
  })();

  /* 옆벽 90도 문 — 원위치: 다시 계단 쪽(-Z) 반환벽으로 되돌린다.
     실사진처럼 계단에서 보면 오른쪽에 서는 문이다. 이 문은 +Z(벽감 안쪽)를
     향하므로, 벽감 자체를 계단 도착 지점보다 앞(alcZ0=3.3)까지 넓혀 두어야
     내려오면서 문 면이 보인다 — 위에서 alcW를 5.0m로 잡은 이유. */
  (function(){
    /* 이 옆벽 문은 한 짝짜리였는데, 실제로는 두 짝(양여닫이)이다 —
       문틀 폭을 두 배로 잡고 문짝을 좌우 두 장으로 나눈다. 손잡이는 두 짝이
       맞물리는 가운데 쪽에 하나씩 두고 레버는 바깥쪽으로 뻗게 한다. */
    var rdLW=0.90, rdW=rdLW*2, rdH=2.10, rdX=-X-alcD/2, rdZ=alcZ0;
    /* 문틀 + 그 안쪽 어두운 개구부 */
    var rdFr=fpMkPlane(rdW+0.14, rdH+0.10, 0x9C8F6E, 1);
    rdFr.position.set(rdX, rdH/2+0.02, rdZ+0.012); g.add(rdFr);
    var rdHole=fpMkPlane(rdW, rdH, 0x14181D, 1);
    rdHole.position.set(rdX, rdH/2, rdZ+0.018); g.add(rdHole);
    /* 문은 '열린 문'처럼 보이게 만들지 않고 닫힌 상태로 둔다 —
       문틀 안에 문짝을 그대로 끼우고 레버 손잡이만 단다. 이 옆벽은 +Z(벽감 안쪽)를
       향하므로, 벽감을 계단 도착 지점보다 앞(alcZ0=3.3)까지 넓혀 둔 덕분에
       내려오면서 문 면과 손잡이가 그대로 보인다. */
    [-1,1].forEach(function(sn){
      var rdDoor=fpMkPlane(rdLW-0.02, rdH-0.02, 0x0E1319, 1, 0x000000);
      rdDoor.position.set(rdX+sn*rdLW/2, rdH/2, rdZ+0.022); g.add(rdDoor);
      var rdRose=fpMkDisc(0.052, 0x6F8A9C, 1);
      rdRose.position.set(rdX+sn*0.17, rdH*0.46, rdZ+0.032); g.add(rdRose);
      var rdLever=fpMkBox(0.17, 0.038, 0.038, 0x9FB2BE, 1);
      rdLever.position.set(rdX+sn*0.30, rdH*0.46, rdZ+0.065); g.add(rdLever);
    });
    var rdMul=fpMkPlane(0.035, rdH-0.02, 0x2A3038, 1);   // 두 짝이 맞물리는 가운데 선
    rdMul.position.set(rdX, rdH/2, rdZ+0.026); g.add(rdMul);
    /* 문 가운데(손잡이 위)에 '관계자 외 출입금지' 명찰을 붙인다 —
       테두리판 + 흰 아크릴판 + 붉은 글씨. 가운데 문설주선(z+0.026)보다
       앞(z+0.040~0.046)에 두어 선이 글씨를 가르지 않게 한다. */
    (function(){
      var pY=1.62;
      var pBd=fpMkPlane(0.98, 0.26, 0x8A8578, 1, 0x2A2721);
      pBd.position.set(rdX, pY, rdZ+0.040); g.add(pBd);
      var pFc=fpMkPlane(0.92, 0.20, 0xF4F2EC, 1, 0x8D8A82);
      pFc.position.set(rdX, pY, rdZ+0.044); g.add(pFc);
      var pTx=fpMkTex(0.84, 0.105,
        fpWallTextTex(ko?'관계자 외 출입금지':'AUTHORIZED PERSONNEL ONLY', '#B3261E'), 1);
      pTx.position.set(rdX, pY, rdZ+0.048); g.add(pTx);
    })();
  })();

  /* ── 복도 : 반대쪽(-X) 벽은 벽감 구간을 뺀 나머지를 막는다 ── */
  if(alcZ0>zEnd) wallSeg(-1,(zEnd+alcZ0)/2, alcZ0-zEnd, 0, H);
  if(zTop>alcZ1) wallSeg(-1,(alcZ1+zTop)/2, zTop-alcZ1, 0, H);

  /* ── 오른쪽(-Z) 막다른 끝 : 실제로는 창고문(사진 반영) ── */
  var capA=fpMkPlane(X*2,H,0xE8DFC8,1); capA.position.set(0,H/2,zEnd); g.add(capA);
  var stoDW=1.05, stoDH=2.15;
  var stoFr=fpMkPlane(stoDW+0.12, stoDH+0.10, 0x9C8F6E,1);
  stoFr.position.set(0, stoDH/2+0.02, zEnd+0.015); g.add(stoFr);
  var stoDoor=fpMkPlane(stoDW, stoDH, 0x0E1319,1,0x000000);
  stoDoor.position.set(0, stoDH/2, zEnd+0.02); g.add(stoDoor);
  var stoKn=fpMkDisc(0.045,0x6F8A9C,1); stoKn.position.set(stoDW/2-0.12, stoDH*0.46, zEnd+0.03); g.add(stoKn);
  /* 문 위 "창고" 글씨 삭제. */

  /* ── 왼쪽(+Z) 복도 끝 : 크리에이티브 존 출입문이 정면으로 보인다 ── */
  var sw=(X*2-FP_B1_DOOR_W)/2;
  [-1,1].forEach(function(sn){
    var wSeg=fpMkPlane(sw,H,0xE8DFC8,1,0x9C8F6E);   // 문 좌우 벽(사진처럼 밝은 회색 타일 톤)
    var wx = sn*(FP_B1_DOOR_W/2+sw/2);
    /* 위 벽감 반환벽과 같은 이유 — 존 안쪽에서 세우는 입구 벽(zz0)과 정확히
       같은 평면이라 겹쳐 있었다. 복도 쪽으로 3cm 물린다(문 옆 카드리더기 등
       부착물은 zTop-0.06 이후라 여전히 벽보다 앞이다). */
    wSeg.position.set(wx,H/2,zTop-0.03); g.add(wSeg);
  });

  var lint=fpMkPlane(FP_B1_DOOR_W,Math.max(0.02,H-FP_B1_DOOR_H),0xE8DFC8,1,0x9C8F6E);
  lint.position.set(0,(H+FP_B1_DOOR_H)/2,zTop); g.add(lint);
  /* 버그 수정: 이 문은 oneWay 기본값(-1)이라 복도 쪽(z가 작은 쪽)에서
     들어올 때만 열렸다 — 크리에이티브 존 안에서 중앙계단 쪽으로 나갈 때는
     다가가도 닫힌 채라 문을 그냥 통과해 버리는 느낌이었다.
     나가는 문(exDoorIn/exDoorOut)과 똑같이 oneWay:0으로 바꿔서 양쪽 방향
     모두 여닫이(경첩)로 열리게 하고, 트리거 거리도 같은 값
     (FP_B1_EXIT_DOOR_TRIG)으로 맞춰 한 번에 문 앞까지 걸어가도 도착 전에
     다 열려 있게 한다. */
  var zdoor=fpMakeGate({w:FP_B1_DOOR_W, h:FP_B1_DOOR_H, dark:true, autoOpen:true, noTransom:true,
                        oneWay:0, trigDist:FP_B1_EXIT_DOOR_TRIG, push:true});
  zdoor.rotation.y=Math.PI; zdoor.position.set(0,0,zTop-0.05); g.add(zdoor);
  /* 사진처럼 문 위 벽에 글씨로 이름을 붙인다(간판이 아니라 벽에 붙인 레터링).
     상인방이 좁아(문 높이 2.26 / 천장 2.55) 글씨가 묻히므로,
     문 좌우 벽까지 쓰는 넓은 띠로 배치한다.
     실제 사진은 밝은 타일 벽 위에 검은색 개별 레터링이라
     글씨색을 흰색 → 검은 계열로 바꾼다(밝은 벽에 흰 글씨는 대비가 반대). */
  var lintTop=(H+FP_B1_DOOR_H)/2;
  var ztx=fpMkTex(3.6,0.45,fpWallTextTex('Campus Creative Zone','#14181D'),1);
  ztx.rotation.y=Math.PI; ztx.position.set(0, lintTop+0.02, zTop-0.07); g.add(ztx);

  /* 문 오른쪽 벽에 안내판(예: 학과명)과 카드리더기(사진 반영) */
  (function(){
    /* 버그 수정: 실제로 렌더링해보면 이 +wxR 값이 화면상
       왼쪽에 나왔다 — 이 복도를 바라보는 시점 기준으로는 부호가 반대라,
       실제 사진(카드리더가 문 오른쪽)과 맞추려면 음수를 써야 한다. */
    var wxR = -(FP_B1_DOOR_W/2+0.42);
    /* 삭제: 카드리더기 위에 붙어 있던 'SW중심대학' 안내판을 없앤다 —
       글씨가 벽 색·조명에 묻혀 거의 안 보이는 탓에, 안내판이 아니라 벽에
       덧댄 흰 띠 하나가 떠 있는 것처럼만 보였다. */
    /* 카드리더기 */
    var rdBody=fpMkPlane(0.16,0.24,0x1B1E24,1);
    rdBody.rotation.y=Math.PI; rdBody.position.set(wxR, 1.05, zTop-0.06); g.add(rdBody);
    var rdLed=fpMkDisc(0.02,0x4CD97A,1);
    rdLed.rotation.y=Math.PI/2; rdLed.position.set(wxR, 1.10, zTop-0.075); g.add(rdLed);
  })();
  /* 실제 사진처럼 문 반대쪽(왼쪽) 벽에 소화전함을 설치한다. */
  (function(){
    var wxL = FP_B1_DOOR_W/2+0.42;
    var fe=fpMakeExtinguisher();
    fe.rotation.y=Math.PI; fe.position.set(wxL, 0, zTop-0.06); g.add(fe);
  })();

  /* 문 앞 바닥 초록색 현관 매트(사진 반영) */
  var doorMat=fpMkPlane(FP_B1_DOOR_W*0.86, 1.05, 0x1F5C3E, 1);
  doorMat.rotation.x=-Math.PI/2; doorMat.position.set(0, 0.075, zTop-0.6); g.add(doorMat);

  /* == 크리에이티브 존 내부(사진 실측 반영) ==
     문을 열고 +Z로 걸어갈 때 기준 :
       왼쪽(+X) = 창가 열람테이블 + 색색 라운지 의자 → 맨 끝에 회의실1·2(나란히, 검은 프레임 유리문)
       가운데   = 철제 프레임 + 책장 + 원목 대형 테이블(공부 공간)
       오른쪽(-X) = 원목 패널 벽감 부스 라운지(초록/자주 포인트)
       나가는 문 = 가운데와 오른쪽 사이, 안쪽 끝(+Z) 벽 — 문 열면 실제 계단이 위로 이어진다(사진 반영) */
  var ZH=3.05, zz0=zTop, zz1=zTop+30.0, zx0=-12.0, zx1=15.5;
  // 19m → 21m로 살짝 더 넓힘.
  var zfl=fpMkPlane(zx1-zx0, zz1-zz0, 0xC7C0AF,1);
  zfl.rotation.x=-Math.PI/2; zfl.position.set((zx0+zx1)/2,0.02,(zz0+zz1)/2); g.add(zfl);
  /* 실사진 대조: 밋밋한 단색 천장이었는데, 실제로는 흰색 계열
     미세 타공 흡음 텍스(타일) 천장에 둥근 매립 다운라이트가 박혀 있었다 —
     옥탑방에서 이미 쓰던 흡음 텍스 텍스처(fpEnsureCeilTileTex)를 재사용한다.
     (버그 수정): 이 천장을 fpMkTex로 만들었는데 그 헬퍼는 transparent+
     depthWrite:false라 깊이를 전혀 쓰지 않는다 — 천장보다 위에 있는 물체
     (계단실 가산혼합 하늘판 등)가 카메라 위치에 따라 정렬 순서가 바뀌면
     천장을 뚫고 그려졌다. "나가는 문으로 갔다가 존으로 돌아오면 천장이
     깨진다"는 현상의 원인(카메라가 옮겨가며 정렬이 뒤집힘). 깊이를 정상적으로
     쓰는 불투명 메쉬로 만들어, 어느 각도에서도 위쪽을 확실히 가리게 한다. */
  var ceilTex=fpEnsureCeilTileTex().clone(); ceilTex.needsUpdate=true;
  var ceilTile=1.2;
  ceilTex.repeat.set(Math.max(1,Math.round((zx1-zx0)/ceilTile)), Math.max(1,Math.round((zz1-zz0)/ceilTile)));
  var zclMat=new THREE.MeshBasicMaterial({map:ceilTex, side:THREE.DoubleSide,
    transparent:false, depthWrite:true, depthTest:true});
  var zcl=new THREE.Mesh(new THREE.PlaneGeometry(zx1-zx0, zz1-zz0), zclMat);
  zcl.renderOrder=-3;
  zcl.rotation.x=Math.PI/2; zcl.position.set((zx0+zx1)/2,ZH,(zz0+zz1)/2); g.add(zcl);
  /* 크리에이티브 존 안쪽에 조명이 하나도 없어서(건물 전체
     기본 광량만 받음) 어둡고 차갑게 보였다 — 실사진처럼 환한 느낌을
     내도록 따뜻한 톤 조명을 공간 길이를 따라 몇 개 둔다. */
  [0.18,0.5,0.82].forEach(function(t){
    var lx=new THREE.PointLight(0xFFF3DE, 0.55, 14);
    lx.position.set((zx0+zx1)/2, ZH-0.4, zz0+(zz1-zz0)*t);
    g.add(lx);
    /* 버그 수정: 매립등 원판을 천장(ZH)에서 1.5cm 아래에 뒀는데,
       둘 다 반투명이라 카메라를 돌리면 거리순 정렬이 뒤집히며 깜빡였다
       ("멈추면 괜찮은데 돌리면 깨진다"는 증상). 간격을 넉넉히 벌리고
       renderOrder를 천장(-3)보다 확실히 뒤로 고정해 항상 천장 위에 그린다. */
    var downlight=fpMkDisc(0.16,0xFFFAEF,0.95);
    downlight.renderOrder=2;
    downlight.rotation.x=Math.PI/2; downlight.position.set((zx0+zx1)/2, ZH-0.05, zz0+(zz1-zz0)*t); g.add(downlight);
  });
  /* 실사진 재대조: 동쪽(zx0, 부스 쪽) 벽은 실제로는 크림 벽지가 아니라
     부스 사이사이 세로 기둥까지도 전부 따뜻한 골드톤 자작나무 합판이었다 —
     서쪽(zx1, 라운지·창가) 벽은 기존 크림 벽지 그대로 두고, 동쪽만 분리해서
     따뜻한 우드톤으로 바꾼다. */
  var wBirch=fpMkPlane(zz1-zz0,ZH,0xE3C48A,1,0x6B4A1F);
  wBirch.rotation.y=Math.PI/2; wBirch.position.set(zx0,ZH/2,(zz0+zz1)/2); g.add(wBirch);
  var wCream=fpMkPlane(zz1-zz0,ZH,0xE8DFC8,1,0x9C8F6E);
  wCream.rotation.y=Math.PI/2; wCream.position.set(zx1,ZH/2,(zz0+zz1)/2); g.add(wCream);
  /* Z-파이팅 잔여 원인: 이 zback 한 장이 원래 북쪽 끝벽 전체(zx0~zx1)를
     덮는데, 그 위에 나가는 문 스토어프론트(유리·프레임)가 정확히 같은 Z(zz1)에
     다시 그려지고 있었다 — 오른쪽은 문-회의실 유리 패널이 나중에 그려져 운 좋게
     덜 튀었을 뿐, 왼쪽(유리벽)은 그대로 겹쳐서 계속 깜빡였다. 스토어프론트가 이제
     이 벽 전체를 앞에서 가리므로, zback을 살짝 뒤로(z+0.05) 물려서 같은 평면에
     겹치지 않게 한다(안 보이는 뒷벽이라 위치를 옮겨도 시각적으로 차이 없다). */
  /* 버그 수정: 이 뒷벽이 통짜 한 장이라 나가는 문(스토어프론트)
     유리 바로 뒤 5cm에 크림색 벽이 그대로 서 있었다 — 문이 열려도(그리고 유리
     너머로도) 방풍실·바깥문·계단이 전혀 안 보이고 벽만 보이는 원인이었다.
     문 개구부(폭 FP_B1_EXIT_DOOR_W · 높이 FP_B1_EXIT_DOOR_H)만큼 실제로 뚫고,
     좌우 벽 + 문 위 상인방으로 나눠서 그린다. */
  (function(){
    var exDX=FP_B1_EXIT_X, exDW=FP_B1_EXIT_DOOR_W, exDH=FP_B1_EXIT_DOOR_H;
    var oz=zz1+0.05, oh0=exDX-exDW/2, oh1=exDX+exDW/2;
    [[zx0,oh0],[oh1,zx1]].forEach(function(sp){
      if(sp[1]-sp[0]<=0.02) return;
      var w=fpMkPlane(sp[1]-sp[0],ZH,0xE8DFC8,1,0x9C8F6E);
      w.position.set((sp[0]+sp[1])/2,ZH/2,oz); g.add(w);
    });
    if(ZH-exDH>0.02){                       // 문 위 상인방
      var lin=fpMkPlane(exDW,ZH-exDH,0xE8DFC8,1,0x9C8F6E);
      lin.position.set(exDX,(ZH+exDH)/2,oz); g.add(lin);
    }
  })();
  [[zx0,-FP_B1_DOOR_W/2],[FP_B1_DOOR_W/2,zx1]].forEach(function(sp){
    var w=fpMkPlane(sp[1]-sp[0],ZH,0xE8DFC8,1,0x9C8F6E);
    w.position.set((sp[0]+sp[1])/2,ZH/2,zz0); g.add(w);
  });

  /* 문 열고 들어오자마자 왼쪽 벽 : 정수기 + 소화기 + 쓰레기통(실사진 반영,
     지하1층 계단실 앞 배치를 참고). 저 안쪽 창가의 정수기·휴지통(아래쪽 참고)과는
     별개로, 입구 바로 옆에 두어 실사진처럼 문 옆에서 바로 보이게 한다.
     (정수기·쓰레기통 자리를 서로 맞바꾸고, 시계는 이 무리에서
     떼어내 문 쪽으로 더 오른쪽에 따로 단다) */
  (function(){
    var ex=-(FP_B1_DOOR_W/2+0.55), ez=zz0+0.32;
    var binXpos=ex, coolerX=ex-1.15, exX=ex-0.62, purifierX=ex-1.77;   // 정수기·쓰레기통 자리 맞교환
    var cooler=fpMakeCooler(); cooler.position.set(coolerX,0,ez); g.add(cooler);
    var fireEx=fpMakeExtinguisher(); fireEx.position.set(exX,0,ez); g.add(fireEx);
    var bin=fpMkBox(0.40,0.62,0.40,0x2A62B8,1,0x0C1A2E); bin.position.set(binXpos,0.31,ez); g.add(bin);
    var binRim=fpMkBox(0.44,0.05,0.44,0x1E4A8C,1); binRim.position.set(binXpos,0.64,ez); g.add(binRim);
    var binBag=fpMkPlane(0.30,0.09,0x1A1D22,1); binBag.position.set(binXpos,0.60,ez+0.21); g.add(binBag);
    /* 정수기 좌측(더 -X 쪽)에 공기청정기 — 실사진의 회색 제습기처럼
       바퀴 달린 세로형 박스 + 위쪽 검은 그릴 + 작은 초록 디스플레이 */
    var pf=new THREE.Group();
    var pfBody=fpMkBox(0.46,1.05,0.42,0xC9CDD1,1,0x4A4E52); pfBody.position.set(0,0.53,0); pf.add(pfBody);
    var pfGrille=fpMkPlane(0.40,0.32,0x2B2E33,0.95); pfGrille.position.set(0,0.98,0.211); pf.add(pfGrille);
    var pfDisp=fpMkPlane(0.16,0.06,0x3ADB6B,0.9); pfDisp.position.set(0,0.72,0.211); pf.add(pfDisp);
    var pfBase=fpMkBox(0.46,0.06,0.42,0x2B2E33,1); pfBase.position.set(0,0.03,0); pf.add(pfBase);
    pf.position.set(purifierX,0,ez); g.add(pf);
    /* 공기청정기 왼쪽 벽에 붙어 있던 스테인리스 분전반(LP-B1)
       패널과 그 명판은 삭제한다. */
  })();
  // 문 중앙 위 : 초록 비상구 표지등
  var exitSign=fpMkTex(0.62,0.31,fpExitSignTex(),1);
  exitSign.position.set(0, FP_B1_DOOR_H+0.30, zz0+0.03); g.add(exitSign);
  // 시계를 비품 무리(왼쪽)에서 떼어내 비상구 표지등 오른쪽(+X, 오른쪽 벽 쪽)으로 이동
  var clock=fpMkTex(0.34,0.34,fpClockTex(),1);
  clock.position.set(FP_B1_DOOR_W/2+0.55, 1.85, zz0+0.03); g.add(clock);

  /* 분전반(스테인리스 패널) 왼쪽에 실사진처럼 자주색 패널 벽 +
     흰 테두리 패널 + 회색 누빔 벤치 라운지를 다시 만든다(비품 무리와는
     겹치지 않게 분전반 왼쪽부터 시작). */
  (function(){
    var nkX0=-9.7, nkX1=-4.3;   // 방 폭을 좁히면서 새 zx0(-10.0)에 맞춰 범위 축소
    var nkCx=(nkX0+nkX1)/2, nkW=nkX1-nkX0;
    var pink=fpMkPlane(nkW, ZH-0.35, 0xC2185B, 1);
    pink.position.set(nkCx, (ZH-0.35)/2, zz0+0.02); g.add(pink);
    // 흰 테두리 패널 3장(사진처럼 세로로 긴 낱장 패널)
    var panelN=3, panelW=nkW/panelN-0.14;
    for(var pi=0; pi<panelN; pi++){
      var pcx=nkX0+nkW/panelN*(pi+0.5);
      var rim=fpMkPlane(panelW, ZH-0.85, 0xF4F1E8, 1);
      rim.position.set(pcx, (ZH-0.85)/2+0.30, zz0+0.028); g.add(rim);
      var inner=fpMkPlane(panelW-0.10, ZH-0.99, 0xC2185B, 1);
      inner.position.set(pcx, (ZH-0.99)/2+0.30, zz0+0.031); g.add(inner);
    }
    // 회색 누빔 벤치(좌석 + 등받이)
    var bench=fpMkBox(nkW-0.2, 0.46, 0.55, 0x8C8478, 1, 0x2A281F);
    bench.position.set(nkCx, 0.23, zz0+0.32); g.add(bench);
    var benchBack=fpMkBox(nkW-0.2, 0.85, 0.12, 0x8C8478, 1, 0x2A281F);
    benchBack.position.set(nkCx, 0.65, zz0+0.06); g.add(benchBack);
    // 빈 공간이 남아 보여서 테이블·의자를 2개 더 늘려 총 4개로
    [-nkW*0.38, -nkW*0.13, nkW*0.13, nkW*0.38].forEach(function(dx){
      var tblCx=nkCx+dx, tblCz=zz0+1.55;
      var leg=fpMkPipe(0.70,0.035,0x1B1E24,1); leg.position.set(tblCx,0.35,tblCz); g.add(leg);
      var top=fpMkBox(0.75,0.05,0.55,0x8C7A63,1,0x201A12); top.position.set(tblCx,0.72,tblCz); g.add(top);
      var chZ=tblCz+0.55;
      var chLeg=fpMkPipe(0.44,0.03,0x1B1E24,1); chLeg.position.set(tblCx,0.22,chZ); g.add(chLeg);
      var chSeat=fpMkBox(0.36,0.05,0.36,0xB0293F,1); chSeat.position.set(tblCx,0.45,chZ); g.add(chSeat);
      var chBack=fpMkBox(0.36,0.38,0.05,0x1B1E24,1); chBack.position.set(tblCx,0.66,chZ+0.16); g.add(chBack);
    });
  })();

  /* 문 오른쪽(+X) 벽 — 실사진(2번째 사진)처럼 아트월 줄눈 + 벽부등 3개 +
     스탠드 안내판 + 스툴/네이비 벤치/화이트 L자 테이블까지 채운 버전.
     이 벽은 남쪽 벽이라 기본 방향(+Z를 바라봄)이 맞고, 바닥/천장 부착물만
     ±X/±Y 축으로 90도 돌린다. */
  (function(){
    var rx=FP_B1_DOOR_W/2+0.55, rz=zz0+0.03;
    var wallX0=rx-0.5, wallX1=Math.min(rx+6.0, zx1-0.3);   // 아트월 줄눈 — 좁아진 벽 폭을 넘지 않게 clamp

    // 1) 아트월 패널 줄눈 — 얇은 어두운 선으로 가로 1단 + 세로 분할을 표현
    var lineCol=0x8A8477;
    var hLine=fpMkPlane(wallX1-wallX0, 0.012, lineCol, 0.8);
    hLine.position.set((wallX0+wallX1)/2, 1.42, rz+0.004); g.add(hLine);
    for(var vx=wallX0+0.9; vx<wallX1; vx+=0.9){
      var vLine=fpMkPlane(0.012, ZH-0.35, lineCol, 0.6);
      vLine.position.set(vx, (ZH-0.35)/2, rz+0.004); g.add(vLine);
    }

    /* 시계 옆에 있던 화재경보 벨박스(은색 원판 + 빨간 점)는 삭제한다. */

    /* CCTV 돔 — 반구形, 어두운 천장색과 대비되는 밝은 크림색 */
    var cctvDome=new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI*2, 0, Math.PI/2),
      new THREE.MeshPhongMaterial({color:0xEDEAE0, shininess:40})
    );
    cctvDome.rotation.x = Math.PI;
    cctvDome.position.set(rx+1.7, ZH-0.02, zz0+0.6); g.add(cctvDome);
    var cctvLens=fpMkDisc(0.04,0x141414,0.95);
    cctvLens.rotation.x=Math.PI/2;
    cctvLens.position.set(rx+1.7, ZH-0.10, zz0+0.6); g.add(cctvLens);

    /* 2) 벽부등 3개 — 반원형(반구) 형태 + emissive 자체발광, 실제 광원 없음(모바일 최적화) */
    for(var si=0; si<3; si++){
      var sconce=new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 10, 6, 0, Math.PI*2, 0, Math.PI/2),
        new THREE.MeshPhongMaterial({color:0xFFEBC2, emissive:0xFFCB6B, emissiveIntensity:0.85, shininess:10})
      );
      sconce.rotation.x = Math.PI/2;   // 반구 평평한 면이 벽에 붙고, 볼록한 쪽이 +Z(방 안쪽)로 튀어나오게
      sconce.position.set(rx+2.4+si*1.3, 1.85, rz+0.02); g.add(sconce);
    }

    /* 3) 스탠드 안내판 — 문 바로 오른쪽 바닥, 검은 얇은 프레임 + 사각 표지판 */
    var standPole=fpMkPipe(1.05,0.018,0x1B1E24,1); standPole.position.set(rx-0.25,0.525,zz0+0.75); g.add(standPole);
    var standBase=fpMkPipe(0.03,0.14,0x1B1E24,1); standBase.position.set(rx-0.25,0.02,zz0+0.75); g.add(standBase);
    var standBoard=fpMkBox(0.46,0.32,0.02,0x1B2A4A,1,0x0A1530); standBoard.position.set(rx-0.25,1.0,zz0+0.75); g.add(standBoard);
    var standTxt=fpMkPlane(0.38,0.22,0xE8ECEF,0.95); standTxt.position.set(rx-0.25,1.0,zz0+0.762); g.add(standTxt);

    /* 4) 가구 — 그레이 패브릭+골드 림 스툴 */
    var stool=fpMkPipe(0.40,0.19,0x8C8478,1,undefined,undefined); stool.position.set(rx+0.6,0.20,zz0+1.0); g.add(stool);
    var stoolTop=fpMkDisc(0.19,0x6E685C,1);
    stoolTop.rotation.x=-Math.PI/2;
    stoolTop.position.set(rx+0.6,0.40,zz0+1.0); g.add(stoolTop);
    var stoolRim=fpMkPipe(0.02,0.195,0xC8A331,1); stoolRim.position.set(rx+0.6,0.02,zz0+1.0); g.add(stoolRim);

    // 다크블루 벤치(각진 형태 — 모서리를 접은 육각형 느낌으로 박스 2개를 겹쳐 표현)
    var benchX=rx+1.9, benchZ=zz0+1.15;
    var bench1=fpMkBox(0.62,0.42,0.62,0x16234A,1,0x0A1530); bench1.position.set(benchX,0.21,benchZ); g.add(bench1);
    var bench2=fpMkBox(0.44,0.42,0.44,0x16234A,1,0x0A1530);
    bench2.rotation.y=Math.PI/4; bench2.position.set(benchX,0.21,benchZ); g.add(bench2);

    // 화이트 L자 파티션 테이블(벤치 뒤편을 감싸듯)
    var tblCol=0xF2F0EA, tblEdge=0xB8B4AA;
    var tblA=fpMkBox(0.9,0.74,0.06,tblCol,1,tblEdge);
    tblA.position.set(benchX,0.37,benchZ-0.42); g.add(tblA);
    var tblB=fpMkBox(0.06,0.74,0.7,tblCol,1,tblEdge);
    tblB.position.set(benchX-0.42,0.37,benchZ-0.05); g.add(tblB);

    /* 5) 바닥 짙은 카펫 — 다크블루 벤치 밑에서부터 자연스럽게 시작하도록 범위 조정 */
    var mat=fpMkPlane(3.4,2.2,0x4A4E52,1);
    mat.rotation.x=-Math.PI/2; mat.position.set(benchX-0.3,0.025,benchZ); g.add(mat);
  })();

  [4.0,9.0,14.0,19.0,24.0].forEach(function(dz){
    var ln=fpMkPlane((zx1-zx0)*0.85,0.32,0xCFF4FF,0.42);
    ln.rotation.x=Math.PI/2; ln.position.set((zx0+zx1)/2,ZH-0.03,zz0+dz); g.add(ln);
  });

  /* 서쪽(+X) 벽을 실사진(2번째 사진)처럼 다시 만든다 —
     통창 + 펜던트 조명(색색, emissive만, 실제 광원 없음) + 검은 프레임/버건디
     좌판 의자가 달린 긴 창가 카운터 + 알록달록 라운지 의자 클러스터 +
     회색 소파 + 안쪽 유리 회의실 2칸 + 라운지 구간 짙은 카펫 바닥. */

  // 통창(격자 창살) + 펜던트 조명(케이블 + 검은 돔형 갓 + 따뜻한 전구)
  // + 창문 사이 콘크리트 기둥(줄눈 라인)
  // 실사진 대조: 색색 원뿔 갓이 아니라 전부 같은 검은 돔형 갓이었다.
  for(var wz=zz0+2.6; wz<zz0+22.0; wz+=3.4){
    var winFr=fpMkPlane(2.5,1.55,0x14181D,1,0x05070A);
    winFr.rotation.y=Math.PI/2; winFr.position.set(zx1-0.015,2.05,wz); g.add(winFr);
    var winGlass=fpMkPlane(2.3,1.35,0xCDEAF5,0.6);
    winGlass.rotation.y=Math.PI/2; winGlass.position.set(zx1-0.04,2.05,wz); g.add(winGlass);
    // 격자 창살(세로 2개 + 가로 2개 — 3x3 분할된 창문)
    for(var gx=-0.77; gx<=0.77; gx+=0.77){
      var mV=fpMkPlane(0.03,1.35,0x14181D,1); mV.rotation.y=Math.PI/2;
      mV.position.set(zx1-0.03,2.05,wz+gx); g.add(mV);
    }
    for(var gy=-0.45; gy<=0.45; gy+=0.45){
      var mHh=fpMkPlane(2.3,0.03,0x14181D,1); mHh.rotation.y=Math.PI/2;
      mHh.position.set(zx1-0.03,2.05+gy,wz); g.add(mHh);
    }
    // 콘크리트 기둥(창문 사이, 얇은 줄눈 라인 2개) — 3번째 창문 쪽에서
    // 카운터 의자랑 겹쳐 보여서, 기둥 폭을 줄이고 창문 쪽으로 더 붙여 의자 자리와 안 겹치게 한다
    var pillar=fpMkPlane(0.42,ZH,0xC7C2B4,1,0x8A8577);
    pillar.rotation.y=Math.PI/2; pillar.position.set(zx1-0.02,ZH/2,wz+1.7); g.add(pillar);
    [0.62,-0.62].forEach(function(oy){
      var jl=fpMkPlane(0.32,0.02,0x8A8577,0.7); jl.rotation.y=Math.PI/2;
      jl.position.set(zx1-0.014,ZH/2+oy,wz+1.7); g.add(jl);
    });
    var pWire=fpMkPipe(0.55,0.008,0x1B1E24,1); pWire.position.set(zx1-1.0,ZH-0.30,wz); g.add(pWire);
    var pShade=new THREE.Mesh(
      new THREE.SphereGeometry(0.15,12,8,0,Math.PI*2,0,Math.PI*0.55),
      new THREE.MeshPhongMaterial({color:0x1B1E24, shininess:35})
    );
    pShade.rotation.x=Math.PI; pShade.position.set(zx1-1.0,ZH-0.56,wz); g.add(pShade);
    /* 갓 아래로 살짝 보이는 따뜻한 전구 — 실제 광원 없이 emissive 원판만(모바일 최적화) */
    var pBulb=fpMkDisc(0.045,0xFFE7A8,0.95);
    pBulb.rotation.x=-Math.PI/2; pBulb.position.set(zx1-1.0,ZH-0.635,wz); g.add(pBulb);
  }

  /* 목재 루버(슬랫) 천장 — 가로로 길게 이어지는 판을 일정 간격으로 반복하고,
     그 틈마다 밝은 가짜 LED 라인(emissive, 실제 광원 아님)을 매립한다.
     (버그 수정): 슬랫을 ZH+0.02, LED를 ZH+0.055에 두어 존 천장(zcl, y=ZH)보다
     '위'에 있었다 — 천장판에 완전히 가려 실제로는 한 번도 보이지 않았다.
     실사진의 서쪽 구간 나무 루버 천장이 안 보이던 원인. 천장 아래로 내려서
     슬랫이 보이고, 그 사이 틈으로 LED 라인이 비치도록 순서를 잡는다. */
  (function(){
    var lz0=zz0+1.0, lz1=zz0+22.6, lx0=zx1-6.6, lx1=zx1+0.05;
    var ledY=ZH-0.03, slatY=ZH-0.09;          // LED가 슬랫보다 살짝 위(틈으로 보임)
    for(var lx2=lx0+0.12; lx2<lx1; lx2+=0.90){
      var led=fpMkPlane(0.16,lz1-lz0,0xFFF3D6,0.95);
      led.renderOrder=2;
      led.rotation.x=-Math.PI/2; led.position.set(lx2,ledY,(lz0+lz1)/2); g.add(led);
    }
    for(var lx=lx0; lx<lx1; lx+=0.30){
      var slat=fpMkBox(0.24,0.06,lz1-lz0,0x8A6A45,1,0x3A2716);
      slat.renderOrder=3;
      slat.position.set(lx,slatY,(lz0+lz1)/2); g.add(slat);
    }
  })();

  // 긴 창가 카운터(원목 상판) + 검은 프레임·버건디 좌판 롤링 의자
  /* 실사진 대조: 예전엔 카운터가 벽에서 1.35m 떨어져 있고 의자가 카운터와
     창문 벽 '사이'에 놓여 있어서, 앉으면 벽을 등지고 방 안쪽을 보게 돼 있었다 —
     실제로는 카운터가 창가 벽에 붙어 있고 의자는 방 쪽에서 벽(창)을 마주본다.
     카운터를 벽 쪽으로 붙이고(zx1-0.75), 의자를 반대편(방 쪽)으로 옮긴다. */
  function longBench(z0, z1){
    var cx=zx1-0.75;
    var top=fpMkBox(0.62,0.06,z1-z0,0x8C7A63,1,0x201A12);
    top.position.set(cx,0.74,(z0+z1)/2); g.add(top);
    var n=Math.max(2, Math.round((z1-z0)/0.9));
    for(var i=0;i<n;i++){
      var cz=z0+(z1-z0)*(i+0.5)/n;
      var chX=cx-0.62;                                  // 방 쪽(작은 x) — 앉으면 창가 벽을 마주본다
      var chLeg=fpMkPipe(0.44,0.03,0x1B1E24,1); chLeg.position.set(chX,0.22,cz); g.add(chLeg);
      var chSeat=fpMkBox(0.40,0.05,0.40,0xB0293F,1); chSeat.position.set(chX,0.45,cz); g.add(chSeat);
      var chBack=fpMkBox(0.05,0.42,0.40,0x1B1E24,1); chBack.position.set(chX-0.24,0.66,cz); g.add(chBack);
    }
  }
  longBench(zz0+1.8, zz0+10.6);   // 끝을 살짝 당겨서 3번째 창문 기둥과 겹치지 않게
  longBench(zz0+12.6, zz0+21.8);

  /* 실사진 대조: 카운터와 안쪽 라운지 사이 통로에 작은 원형 카페 테이블 +
     레드/버건디 포인트 체어 조합이 실제로는 두 세트 더 있었는데 코드에는 빠져 있었다. */
  (function(){
    function cafeSpot(tx, tz, chairCol){
      // 원형 테이블(크림 상판 + 크롬 X자 다리)
      var top=fpMkDisc(0.34,0xEDE6D6,1);
      top.rotation.x=-Math.PI/2; top.position.set(tx,0.72,tz); g.add(top);
      var edge=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.04,16),
        new THREE.MeshStandardMaterial({color:0xEDE6D6, roughness:0.7}));
      edge.position.set(tx,0.70,tz); g.add(edge);
      var pole=fpMkPipe(0.66,0.028,0xB8BCC0,1); pole.position.set(tx,0.35,tz); g.add(pole);
      [0,Math.PI/2].forEach(function(rotY){
        var xleg=fpMkBox(0.5,0.03,0.045,0xB8BCC0,1);
        xleg.rotation.y=rotY+Math.PI/4; xleg.position.set(tx,0.05,tz); g.add(xleg);
      });
      // 레드/버건디 포인트 체어(라운지 에그체어의 축소판) — 테이블 옆에 하나
      var cx=tx+0.62, cz=tz+0.35;
      var base=fpMkDisc(0.14,0x2B2E33,1); base.rotation.x=-Math.PI/2; base.position.set(cx,0.03,cz); g.add(base);
      var chPole=fpMkPipe(0.34,0.032,0x2B2E33,1); chPole.position.set(cx,0.20,cz); g.add(chPole);
      var seat=fpMkPipe(0.13,0.27,chairCol,1); seat.position.set(cx,0.37,cz); g.add(seat);
      var shell=new THREE.Mesh(
        new THREE.SphereGeometry(0.28,12,8,0,Math.PI*2,0,Math.PI*0.62),
        new THREE.MeshPhongMaterial({color:chairCol, shininess:12})
      );
      shell.rotation.x=Math.PI; shell.position.set(cx,0.60,cz); g.add(shell);
    }
    /* 버그 수정: 두 번째 세트가 소파 줄(z≈13.9~14.7)과 창가 카운터
       사이에 끼어 테이블·의자가 소파를 뚫고 있었다 — 소파 앞쪽(작은 z)으로 당기고
       x도 카운터에서 떨어뜨린다. */
    cafeSpot(zx1-2.7, zz0+3.0, 0xB0293F);   // 버건디 포인트 체어
    cafeSpot(zx1-2.9, zz0+4.1, 0x8A2E2A);   // 다크레드 포인트 체어
  })();

  /* 알록달록 곡선형 라운지 체어(에그체어 느낌) — 원기둥 좌석 + 반구 등받이 +
     가느다란 별 모양 다리(원판으로 단순화) — 초록·버건디·머스터드·블랙
     (조금 더 안쪽/뒤쪽으로 이동 + 사진처럼 디테일 보강) */
  var lngCz=zz0+13.4, lngCx=zx1-3.4;
  // 테이블 다리를 사진처럼 X자(십자) 금속 다리로
  var lngTbl=fpMkPipe(0.05,0.42,0xEDE6D6,1); lngTbl.position.set(lngCx,0.72,lngCz); g.add(lngTbl);
  [0, Math.PI/2].forEach(function(rotY){
    var xleg=fpMkBox(0.62,0.03,0.05,0xB8BCC0,1);
    xleg.rotation.y=rotY+Math.PI/4; xleg.position.set(lngCx,0.06,lngCz); g.add(xleg);
  });
  var lngPole=fpMkPipe(0.66,0.03,0xB8BCC0,1); lngPole.position.set(lngCx,0.35,lngCz); g.add(lngPole);
  [[0x4E7A3A,-0.95,-0.75],[0xB0293F,0.95,-0.55],[0xC8A331,-0.75,0.95],[0x1B1E24,0.90,0.90]].forEach(function(c){
    var ex=lngCx+c[1], ez=lngCz+c[2];
    var base=fpMkDisc(0.16,0x2B2E33,1); base.rotation.x=-Math.PI/2; base.position.set(ex,0.03,ez); g.add(base);
    var pole=fpMkPipe(0.36,0.035,0x2B2E33,1); pole.position.set(ex,0.21,ez); g.add(pole);
    var seat=fpMkPipe(0.14,0.30,c[0],1); seat.position.set(ex,0.40,ez); g.add(seat);
    var shell=new THREE.Mesh(
      new THREE.SphereGeometry(0.32,12,8,0,Math.PI*2,0,Math.PI*0.62),
      new THREE.MeshPhongMaterial({color:c[0], shininess:12})
    );
    shell.rotation.x=Math.PI; shell.position.set(ex,0.66,ez); g.add(shell);
  });
  // 사진처럼 오렌지색 오토만 — 실측보다 훨씬 길고 낮은 벤치형 + 위에 얹은 회색 쿠션 하나
  /* 버그 수정: 오토만(길이 1.7)이 lngCx+2.0(=14.1)에 있어 창가 카운터와
     그 의자를 그대로 뚫고 있었다 — 라운지 서쪽(창 반대쪽)으로 옮긴다. */
  var ottX=lngCx-2.0, ottZ=lngCz+0.3;
  var ott=fpMkBox(1.7,0.40,0.62,0xE8813C,1,0x8A3E10); ott.position.set(ottX,0.20,ottZ); g.add(ott);
  var ottPillow=fpMkBox(0.44,0.16,0.50,0xD8D6CE,1,0x9A968A);
  ottPillow.rotation.y=0.12; ottPillow.position.set(ottX-0.55,0.48,ottZ-0.02); g.add(ottPillow);

  /* 라운지·카운터 구간 바닥 — 실사진 대조: 짙은 회색 한 장이라
     밋밋했는데, 실제로는 창가 카운터 아래가 밝은 베이지 비닐 바닥이고 그
     안쪽이 회색 카펫, 둘 사이에 밝은 경계띠가 지나간다. 3단으로 나눈다.
     (Z-파이팅을 피하려고 높이를 조금씩 다르게 준다.) */
  var loungeCz=zz0+11.5, loungeLen=21.0;
  var flBeige=fpMkPlane(2.6, loungeLen, 0xC9BE9E, 1);          // 창가 카운터 아래 밝은 띠
  flBeige.rotation.x=-Math.PI/2; flBeige.position.set(zx1-1.3, 0.024, loungeCz); g.add(flBeige);
  var flEdge=fpMkPlane(0.45, loungeLen, 0xE6E2D6, 1);          // 밝은 경계띠
  flEdge.rotation.x=-Math.PI/2; flEdge.position.set(zx1-2.75, 0.026, loungeCz); g.add(flEdge);
  var loungeFl=fpMkPlane(3.6, loungeLen, 0x585C61, 1);         // 안쪽 회색 카펫
  loungeFl.rotation.x=-Math.PI/2; loungeFl.position.set(zx1-4.8, 0.022, loungeCz); g.add(loungeFl);

  // 전면 하단 화이트 카운터 2개(원근감용, 입구 쪽 바닥)
  [[-0.6,0],[0.6,1.0]].forEach(function(o){
    var cnt=fpMkBox(0.9,0.85,0.55,0xF2F0EA,1,0xC9C5BA);
    cnt.position.set(zx1-5.6+o[0], 0.425, zz0+2.2+o[1]); g.add(cnt);
  });

  /* 실사진 대조: 검은 ㄱ자 코너소파 하나였는데, 실제로는 올리브그린 소파와
     차콜그레이 소파(더 김) 두 개가 나란히 놓여 있었다 — 색·개수를 실사진에 맞춘다. */
  (function(){
    /* 버그 수정: 예전 lx(zx1-4.6=10.9)로는 차콜그레이 소파(폭 3.1)가
       x=15.2까지 뻗어 창가 열람 카운터(x 13.8~14.5)와 그 의자들을 뚫고 지나갔고,
       소파 앞 원형 테이블도 카운터 위에 얹혀 있었다 — 소파 무리를 서쪽으로 1.9m
       옮겨 카운터 앞 통로를 비운다. */
    var lx=zx1-6.5, lz=zz0+6.0;

    // 스트레이트 2~3인용 소파(색·모서리색을 인자로 받는다)
    function sofaSeg(cx, cz, w, d, rotY, col, edgeCol){
      var grp=new THREE.Group();
      var seat=fpMkBox(w,0.42,d,col,1,edgeCol); seat.position.set(0,0.21,0); grp.add(seat);
      var back=fpMkBox(w,0.62,0.14,col,1,edgeCol); back.position.set(0,0.52,-d/2+0.07); grp.add(back);
      var arm1=fpMkBox(0.14,0.5,d,col,1,edgeCol); arm1.position.set(-w/2+0.07,0.46,0); grp.add(arm1);
      var arm2=fpMkBox(0.14,0.5,d,col,1,edgeCol); arm2.position.set(w/2-0.07,0.46,0); grp.add(arm2);
      grp.rotation.y=rotY; grp.position.set(cx,0,cz); g.add(grp);
    }
    sofaSeg(lx,      lz, 2.2, 0.85, 0, 0x6B7A3E, 0x2E3A1C);   // 올리브그린 소파
    sofaSeg(lx+2.75, lz, 3.1, 0.85, 0, 0x3B3F45, 0x17191C);   // 차콜그레이 소파(더 김)

    function roundTable(tx, tz){
      var tblTop=fpMkDisc(0.52,0x8C7A63,1);
      tblTop.rotation.x=-Math.PI/2; tblTop.position.set(tx,0.44,tz); g.add(tblTop);
      var tblEdge=new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.52,0.05,20),
        new THREE.MeshStandardMaterial({color:0x8C7A63, roughness:0.85}));
      tblEdge.position.set(tx,0.415,tz); g.add(tblEdge);
      var tblLeg=fpMkPipe(0.42,0.06,0x2B2E33,1); tblLeg.position.set(tx,0.21,tz); g.add(tblLeg);
      var tblBase=fpMkDisc(0.24,0x2B2E33,1); tblBase.rotation.x=-Math.PI/2; tblBase.position.set(tx,0.02,tz); g.add(tblBase);
    }
    roundTable(lx+0.05,    lz+1.05);   // 그린 소파 앞
    roundTable(lx+3.35,    lz+1.05);   // 그레이 소파 앞
  })();

  /* 가운데 빈 공간에 실사진(2·3번째)처럼 검은 철제 트렐리스 +
     격자무늬 프로스티드 유리 파티션 + 원목 대형 회의 테이블(검은 프레임·
     버건디 좌판 롤링 의자) + 돌판 마감 기둥 + 잡지 진열대를 만든다.
     위치는 나중에 조정하기로 했으니 일단 중앙(x≈-2~4, 문에서 4~11m)에 배치. */
  (function(){
    var cz0=zz0+13.7, cz1=zz0+20.7, cx0=-4.3, cx1=1.9, trH=2.6;
    // 북쪽 끝에 회의실 자리를 남겨야 해서 5m 정도 앞(문 쪽)으로 당김
    // 동쪽 벽 왼쪽에서 3번째 초록 부스(z=zz0+22.2) 앞으로 이동

    // 0) 헤링본 원목 바닥 — 이 구역만 캔버스 텍스처로 V자 나뭇결 바닥재 적용
    /* 버그 수정: 이 텍스처는 가로세로 어떤 크기에 깔든 항상
       고정된 repeat(3,3)만 썼다 — 바닥이 정사각형이 아니라서(가로 8.2m,
       세로 9.0m) 같은 3칸을 서로 다른 실제 길이에 나눠 깔다 보니 널빤지가
       한쪽 방향으로만 눌리거나 늘어나 보였다. 실제 물리 치수 기준으로
       한 칸(약 1.4m)당 반복 횟수를 따로 계산해 널빤지 비율을 정사각으로
       맞춘다. */
    var hbW=cx1-cx0+2.0, hbH=cz1-cz0+2.0, hbTile=1.4;
    var hbTex=fpHerringboneTex().clone(); hbTex.needsUpdate=true;
    hbTex.repeat.set(Math.max(1,Math.round(hbW/hbTile)), Math.max(1,Math.round(hbH/hbTile)));
    var hbFloor=fpMkTex(hbW, hbH, hbTex, 1);
    /* 버그 수정: 이 헤링본 바닥판이 밑에 깔린 존 전체 바닥(zfl, y=0.02)과
       불과 0.003m 차이로 거의 같은 높이에 겹쳐 있어서, 카메라가 멀어지거나
       비스듬한 각도로 보면 두 바닥이 깊이(depth) 정밀도 한계로 서로 뚫고
       나오는 것처럼 깜빡이며(Z-파이팅) 마치 카펫/나뭇결 조각이 삐져나온
       것처럼 보였다 — 두 바닥 사이 높이 차를 넉넉히 벌려 확실히 위에 오도록 한다. */
    hbFloor.rotation.x=-Math.PI/2; hbFloor.position.set((cx0+cx1)/2,0.05,(cz0+cz1)/2); g.add(hbFloor);

    // 1) 검은 철제 트렐리스 — 각진 박공(경사) 지붕 프레임. 굵은 세로 기둥 + 도리(가로 보) +
    //    경사진 서까래(대각 보)를 반복해서 그물 같은 격자 지붕을 만든다(부재를 더 굵게).
    var postCol=0x14181D;
    function post(cx,cz,h){ var p=fpMkBox(0.09,h,0.09,postCol,1); p.position.set(cx,h/2,cz); g.add(p); }
    [cx0,cx1].forEach(function(px){ [cz0,cz1].forEach(function(pz){ post(px,pz,trH); }); });
    // 세로 보(도리) — 앞뒤로 이어지는 두 갈래
    [cx0,cx1].forEach(function(px){
      var beam=fpMkBox(0.08,0.08,cz1-cz0,postCol,1); beam.position.set(px,trH,(cz0+cz1)/2); g.add(beam);
    });
    // 경사진 서까래(가로 방향, 일정 간격 반복, 가운데가 볼록한 박공 느낌으로 살짝 올림)
    var raftN=6;
    for(var ri=0; ri<=raftN; ri++){
      var rz=cz0+(cz1-cz0)*ri/raftN;
      var r1=fpMkBox(Math.sqrt(Math.pow((cx1-cx0)/2,2)+0.09)+0.02,0.07,0.07,postCol,1);
      r1.position.set((cx0+cx1)/2-(cx1-cx0)/4, trH+0.15, rz);
      r1.rotation.z = Math.atan2(0.30, (cx1-cx0)/2);
      g.add(r1);
      var r2=fpMkBox(Math.sqrt(Math.pow((cx1-cx0)/2,2)+0.09)+0.02,0.07,0.07,postCol,1);
      r2.position.set((cx0+cx1)/2+(cx1-cx0)/4, trH+0.15, rz);
      r2.rotation.z = -Math.atan2(0.30, (cx1-cx0)/2);
      g.add(r2);
      // 5) 가짜 매립 스팟(서까래 마디마다, 실제 광원 없이 밝은 원판만)
      var spot=fpMkDisc(0.055,0xFFF6DE,0.9);
      spot.rotation.x=-Math.PI/2; spot.position.set((cx0+cx1)/2, trH+0.10, rz); g.add(spot);
    }
    // 용마루(박공 꼭대기 세로 보)
    var ridge=fpMkBox(0.07,0.07,cz1-cz0,postCol,1);
    ridge.position.set((cx0+cx1)/2, trH+0.30, (cz0+cz1)/2); g.add(ridge);

    // 2) 격자무늬 프로스티드 유리 파티션 2장(모서리, 기존)
    [ [cx0-0.02, cz0+1.2], [cx0-0.02, cz1-1.2] ].forEach(function(pp){
      var px=pp[0], pz=pp[1], pw=1.0, ph=2.1;
      var frame=fpMkPlane(pw,ph,0x14181D,1,0x000000);
      frame.rotation.y=Math.PI/2; frame.position.set(px,ph/2,pz); g.add(frame);
      var glass=fpMkPlane(pw-0.10,ph-0.10,0xCDEAF5,0.35);
      glass.rotation.y=Math.PI/2; glass.position.set(px+0.008,ph/2,pz); g.add(glass);
      for(var gy=0.30; gy<ph; gy+=0.42){
        var gl=fpMkPlane(pw-0.06,0.02,0x14181D,0.8);
        gl.rotation.y=Math.PI/2; gl.position.set(px+0.012,gy,pz); g.add(gl);
      }
      var glV=fpMkPlane(0.02,ph-0.10,0x14181D,0.8);
      glV.rotation.y=Math.PI/2; glV.position.set(px+0.012,ph/2,pz); g.add(glV);
    });

    /* 트렐리스 프레임 자체의 좌우 긴 면(cx0/cx1 쪽)을 사진처럼
       반투명 프로스티드 유리로 채워서, 안쪽 테이블·의자 윤곽만 은은하게
       비치도록 한다. 무거운 굴절/투과 연산 없이 MeshPhongMaterial +
       opacity로만 눈속임(모바일 최적화 조건 그대로 준수).
       (한 장 통유리로 막으니 너무 꽉 막혀 보여서, 실사진처럼
       가운데 드나들 수 있는 틈을 두고 유리를 앞뒤 두 장으로 나눈다.) */
    function fpGlassPanel(w,h){
      var mat=new THREE.MeshPhongMaterial({
        color:0xEEF2F5, transparent:true, opacity:0.60, shininess:30,
        side:THREE.DoubleSide, depthWrite:false
      });
      var m=new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat);
      m.renderOrder=-1;
      return m;
    }
    var gapW=1.1;   // 사람이 드나들 수 있는 가운데 틈
    [cx0,cx1].forEach(function(px){
      var gH=trH-0.12;
      var segLen=(cz1-cz0-gapW)/2 - 0.07;
      [ [cz0+0.07, cz0+0.07+segLen], [cz1-0.07-segLen, cz1-0.07] ].forEach(function(sp){
        var segW=sp[1]-sp[0]; if(segW<=0.1) return;
        var segCz=(sp[0]+sp[1])/2;
        var pane=fpGlassPanel(segW,gH);
        pane.rotation.y=Math.PI/2; pane.position.set(px, gH/2+0.06, segCz); g.add(pane);
        // 검은 격자 틀(가로 2단 + 세로 여러 칸) — 프레임 위에 얇은 선으로만 표현
        for(var ggy=gH/3; ggy<gH; ggy+=gH/3){
          var ggl=fpMkPlane(segW,0.02,0x14181D,0.85); ggl.rotation.y=Math.PI/2;
          ggl.position.set(px+0.006, ggy+0.06, segCz); g.add(ggl);
        }
        for(var ggx=sp[0]+segW/3; ggx<sp[1]; ggx+=segW/3){
          var ggv=fpMkPlane(0.02,gH,0x14181D,0.85); ggv.rotation.y=Math.PI/2;
          ggv.position.set(px+0.006, gH/2+0.06, ggx); g.add(ggv);
        }
      });
    });

    // 4) 노출 콘크리트 마감 사각 기둥(둥근 폼타이 자국) — 실사진 대조: //    베이지 돌판 톤 + 작은 점이었는데, 실제로는 회색 노출 콘크리트에
    //    둥글고 또렷한 폼타이(거푸집 고정 볼트) 자국이 격자로 찍혀 있었다.
    var tblCx=(cx0+cx1)/2+0.9, tblCz=(cz0+cz1)/2;   // 오른쪽(+X)으로 살짝 더 이동
    var colX=tblCx, colZ=tblCz;
    var colW=1.15;
    var col=fpMkBox(colW,ZH,colW,0xB7B2A6,1,0x6B675C); col.position.set(colX,ZH/2,colZ); g.add(col);
    for(var cy2=0.55; cy2<ZH; cy2+=0.6){
      [-colW/2-0.002,colW/2+0.002].forEach(function(dxp){
        var jn=fpMkPlane(colW,0.012,0x8A8577,0.7); jn.rotation.y=Math.PI/2;
        jn.position.set(colX+dxp,cy2,colZ); g.add(jn);
      });
      // 둥근 폼타이 자국(실사진처럼 크고 또렷하게, 가로 3줄 격자)
      [-colW*0.32,0,colW*0.32].forEach(function(dz){
        [colX-colW/2-0.003, colX+colW/2+0.003].forEach(function(fx){
          var tieRing=fpMkDisc(0.045,0x8A8577,0.9); tieRing.rotation.y=Math.PI/2;
          tieRing.position.set(fx,cy2+0.22,colZ+dz); g.add(tieRing);
          var tieDot=fpMkDisc(0.020,0x53504A,0.9); tieDot.rotation.y=Math.PI/2;
          tieDot.position.set(fx+0.001,cy2+0.22,colZ+dz); g.add(tieDot);
        });
      });
    }

    // 3) 원목 대형 회의 테이블(두껍게) — 기둥을 사이에 두고 앞뒤 두 구간으로 나눠
    //    "테이블이 기둥을 감싸며 지나가는" 느낌을 낸다 + 검은 프레임·버건디 좌판
    //    바퀴 달린 롤링 의자(캐스터 4개 + 십자 다리)
    var tblTh=0.09;   // 두께 상향(0.06→0.09)
    var gap=colW/2+0.18;
    [[cz0+1.0, colZ-gap],[colZ+gap, cz1-1.0]].forEach(function(seg){
      var segLen=seg[1]-seg[0]; if(segLen<=0.2) return;
      var tbl=fpMkBox(1.15,tblTh,segLen,0x5A3D26,1,0x2A1A0E);
      tbl.position.set(tblCx,0.74,(seg[0]+seg[1])/2); g.add(tbl);
    });
    var tblLeg=fpMkBox(0.9,0.68,0.06,0x1B1E24,1);
    [cz0+1.0, cz1-1.0].forEach(function(lz){ var lg=tblLeg.clone(); lg.position.set(tblCx,0.37,lz); g.add(lg); });
    for(var tz2=cz0+1.0; tz2<cz1-0.7; tz2+=0.6){
      if(Math.abs(tz2-colZ)<gap+0.2) continue;   // 기둥 자리엔 의자를 놓지 않는다
      (function(tzc){
        [-1,1].forEach(function(sn){
          var chX=tblCx+sn*0.75;
          // 십자형 캐스터 다리 + 바퀴 4개
          var crossA=fpMkBox(0.34,0.025,0.06,0x1B1E24,1); crossA.position.set(chX,0.06,tzc); g.add(crossA);
          var crossB=fpMkBox(0.06,0.025,0.34,0x1B1E24,1); crossB.position.set(chX,0.06,tzc); g.add(crossB);
          [[-0.15,-0.15],[0.15,-0.15],[-0.15,0.15],[0.15,0.15]].forEach(function(w){
            var wheel=fpMkDisc(0.028,0x0C0D10,0.95); wheel.rotation.x=-Math.PI/2;
            wheel.position.set(chX+w[0],0.028,tzc+w[1]); g.add(wheel);
          });
          var chLeg=fpMkPipe(0.40,0.03,0x1B1E24,1); chLeg.position.set(chX,0.26,tzc); g.add(chLeg);
          var chSeat=fpMkBox(0.38,0.05,0.38,0xB0293F,1); chSeat.position.set(chX,0.47,tzc); g.add(chSeat);
          var chBack=fpMkBox(0.05,0.42,0.38,0x1B1E24,1); chBack.position.set(chX+sn*0.19,0.68,tzc); g.add(chBack);
        });
      })(tz2);
    }

    // 5) 잡지 진열대(검은 프레임, 비스듬한 선반) — 트렐리스 왼쪽 벽 쪽
    var rkX=cx0+0.4, rkZ0=cz0+0.6, rkZ1=cz1-0.6, rkH=1.9;   // 바깥→안쪽으로 이동
    post(rkX, rkZ0, rkH); post(rkX, rkZ1, rkH);
    var rkTop=fpMkBox(0.05,0.05,rkZ1-rkZ0,postCol,1); rkTop.position.set(rkX,rkH,(rkZ0+rkZ1)/2); g.add(rkTop);
    var mCols=[0xC0392B,0x2E7D46,0x2A5DB0,0xC8A331,0xE8ECEF];
    /* 버그 수정: 선반(shelf2)과 잡지(mg)에 rotation.x=-0.35를 줬는데,
       이 진열대는 길이 방향이 Z축이라 X축으로 돌리면 '선반면이 뒤로 눕는' 게 아니라
       선반 전체가 z가 커질수록 위로 올라가는 비탈이 된다 — 책장이 통째로 기울어져
       보이던 원인. 회전을 없애고 선반은 수평, 잡지는 똑바로 세워 꽂는다. */
    for(var rsh=0.35; rsh<rkH-0.1; rsh+=0.5){
      var shelf2=fpMkBox(0.24,0.03,rkZ1-rkZ0-0.3,0x1B1F24,1);
      shelf2.position.set(rkX,rsh,(rkZ0+rkZ1)/2); g.add(shelf2);
      for(var mz=rkZ0+0.3; mz<rkZ1-0.2; mz+=0.16){
        var mg=fpMkBox(0.16,0.20,0.02,mCols[Math.floor(Math.random()*mCols.length)],1);
        mg.position.set(rkX,rsh+0.115,mz); g.add(mg);
      }
    }

    /* 테이블 동쪽(+X, cx1 쪽) 빈 바닥이 휑해 보여서, 개인 학습용
       책상 3개 + 의자를 벽 쪽으로 나란히 배치(도서관 열람석 느낌). */
    (function(){
      var dkX=cx1-0.55, dkZ0=cz0+1.2, dkZ1=cz1-1.2;
      var dkN=3, dkGap=(dkZ1-dkZ0)/dkN;
      for(var di=0; di<dkN; di++){
        var dz=dkZ0+dkGap*(di+0.5);
        var top=fpMkBox(0.62,0.05,0.55,0x8C7A63,1,0x201A12); top.position.set(dkX,0.74,dz); g.add(top);
        var leg1=fpMkPipe(0.72,0.028,0x1B1E24,1); leg1.position.set(dkX-0.24,0.36,dz-0.2); g.add(leg1);
        var leg2=fpMkPipe(0.72,0.028,0x1B1E24,1); leg2.position.set(dkX+0.24,0.36,dz-0.2); g.add(leg2);
        var chLeg=fpMkPipe(0.42,0.03,0x1B1E24,1); chLeg.position.set(dkX,0.21,dz+0.42); g.add(chLeg);
        var chSeat=fpMkBox(0.38,0.05,0.38,0xB0293F,1); chSeat.position.set(dkX,0.44,dz+0.42); g.add(chSeat);
        var chBack=fpMkBox(0.38,0.40,0.05,0x1B1E24,1); chBack.position.set(dkX,0.64,dz+0.60); g.add(chBack);
        var lamp=fpMkBox(0.06,0.22,0.06,0x1B1E24,1); lamp.position.set(dkX+0.24,0.87,dz-0.15); g.add(lamp);
        var lampHead=fpMkBox(0.14,0.03,0.10,0x2B2E33,1); lampHead.position.set(dkX+0.24,0.98,dz-0.12); g.add(lampHead);
      }
    })();

    // 6) 트렐리스 구역(헤링본)과 동쪽 부스 사이 복도 — 밝은 그레이 타일
    //    바닥으로 분리하고, 천장 매립등을 일렬로 배치해 동선을 강조한다.
    var corX0=zx0+2.4, corX1=cx0-0.5;   // 부스 앞쪽 끝 ~ 트렐리스/잡지진열대 앞
    if(corX1>corX0){
      var corFl=fpMkPlane(corX1-corX0, cz1-cz0+1.0, 0xC7C0AF, 1);
      corFl.rotation.x=-Math.PI/2; corFl.position.set((corX0+corX1)/2,0.024,(cz0+cz1)/2); g.add(corFl);
      for(var spz=cz0+0.8; spz<cz1; spz+=1.6){
        var cSpot=fpMkDisc(0.07,0xFFF6DE,0.9);
        cSpot.rotation.x=-Math.PI/2; cSpot.position.set((corX0+corX1)/2,ZH-0.02,spz); g.add(cSpot);
      }
    }
  })();

  /* -- 오른쪽(-X) : 원목 벽감 부스 라운지 --
     근본 원인 수정: 지금까지 패널·가구가 벽감 '입구' 쪽(zx0+d 근처)에
     붙어 있었다 — 실제로는 그 자리가 복도와 가장 가까운 카메라 쪽이라,
     Three.js가 반투명 오브젝트를 카메라 거리순으로 그리면서 겹쳐 쌓은 색
     패널(back)이 항상 흰 테두리보다 나중에(위에) 그려져 테두리를 덮어버렸다.
     그리고 벽감 안쪽 깊이(2.15m)가 있는데도 패널·가구가 전부 입구 쪽에
     몰려 있어서 안쪽이 통째로 비어 보였다(깊이감 없음의 진짜 원인).
     지금은 패널을 벽감 '진짜 뒷벽'(zx0 바로 앞)에 붙이고, 가구도
     뒤(패널)→가운데(테이블)→앞(의자, 입구 쪽) 순서로 다시 배치한다. */
  function booth(cz, accent, wantPendant){
    /* 실사진 대조: 개구부가 폭 2.9m / 높이 3.05m라 세로로 긴 '문'처럼
       보였는데, 실제 사진의 벽감은 가로로 넓적하다(폭 > 높이) — 폭을 넓히고
       상부에 나무 소핏(헤더)을 넣어 개구부 높이를 낮춘다. */
    var bw=3.7, d=2.15, oh=2.42;   // 개구부 폭 / 깊이 / 개구부 높이(소핏 아래)
    var backX=zx0+0.02;   // 벽감 진짜 뒷벽 — 패널이 여기 붙는다
    var openX=zx0+d;      // 벽감 입구 — 복도와 만나는 자리

    // 1) 벽감(알코브) 몸체 — 옆벽 2장 + 천장 + 상부 소핏. 천장을 옆벽보다
    //    어둡게 하고 안쪽 코너에 짙은 선을 넣어서, 실제 그림자 없는 모바일
    //    렌더링에서도 깊이감이 또렷하게 읽히게 한다(가짜 AO).
    /* 버그 수정: 옆벽·천장·바닥이 90도 돌아가 있었다.
       fpMkPlane(w,h)는 로컬 X가 w인데, 여기에 rotation.y=90°를 주면 그 w가 월드 Z로
       간다 — 옆벽은 '벽감 깊이(d) 방향으로 뻗은 벽'이어야 하는데도 폭 2.15m짜리 판이
       벽감 한가운데(x=-10.9)에 Z 방향으로 서 버려서, 안에 놓인 테이블을 그대로
       관통했다(사진의 보라색 부분). 옆벽은 회전 없이 두어야 월드 X로 뻗는다.
       천장·바닥도 같은 이유로 가로·세로(bw ↔ d)를 맞바꾼다. */
    var side1=fpMkPlane(d,oh,0xDCC08A,1,0x5C3E18);
    side1.position.set(zx0+d/2,oh/2,cz-bw/2); g.add(side1);
    var side2=fpMkPlane(d,oh,0xDCC08A,1,0x5C3E18);
    side2.position.set(zx0+d/2,oh/2,cz+bw/2); g.add(side2);
    var ceil=fpMkPlane(d,bw,0xB8935A,1,0x3D2A10);
    ceil.rotation.x=Math.PI/2; ceil.position.set(zx0+d/2,oh,cz); g.add(ceil);
    // 개구부 위 나무 소핏(헤더) — 복도 쪽에서 보이는 면
    var soffit=fpMkPlane(bw, ZH-oh, 0xE3C48A, 1, 0x6B4A1F);
    soffit.rotation.y=Math.PI/2; soffit.position.set(openX-0.01, (ZH+oh)/2, cz); g.add(soffit);
    [-1,1].forEach(function(sn){
      var corner=fpMkPlane(d,0.05,0x2A1B0C,0.55);
      corner.position.set(zx0+d/2, oh-0.025, cz+sn*bw/2); g.add(corner);   // 옆벽과 같은 방향(월드 X)
    });

    // 2) 포인트 컬러 패널 — 뒷벽에 딱 붙여서(backX), 색 채움(먼저) 위에
    //    흰 테두리선(그 다음, 살짝 앞)을 그린다 — 카메라가 항상 입구
    //    쪽(openX 방향)에 있으므로 이 순서라야 흰 테두리가 항상 위로 보인다.
    /* 실사진 대조: 패널이 벽감을 거의 꽉 채울 만큼 커서(2.8 x 1.68)
       둘레에 보여야 할 자작나무 여백이 사라지고 '색 블록 하나'처럼 보였다 —
       실제 사진처럼 패널을 줄이고 위쪽으로 올려서, 아래는 벤치가 가리고
       좌우·위에는 나무 벽이 넉넉히 보이게 한다. */
    var pnW=bw-0.9, pnH=1.15, pnY=1.42;    // 패널 폭/높이/중심 높이
    var fill=fpMkPlane(pnW, pnH, accent, 1);
    fill.rotation.y=Math.PI/2; fill.position.set(backX+0.02, pnY, cz); g.add(fill);
    // 흰 테두리 — 패널 둘레를 감싸는 사각 프레임(위·아래 가로선 2 + 좌·우 세로선 2)
    var trimW=0.07;
    [[pnW, trimW, 0,  (pnH-trimW)/2],
     [pnW, trimW, 0, -(pnH-trimW)/2],
     [trimW, pnH,  (pnW-trimW)/2, 0],
     [trimW, pnH, -(pnW-trimW)/2, 0]].forEach(function(seg){
      var line=fpMkPlane(seg[0], seg[1], 0xF4F1E8, 1);
      line.rotation.y=Math.PI/2;
      line.position.set(backX+0.06, pnY+seg[3], cz+seg[2]); g.add(line);
    });

    // 3) 패널 위쪽 구석 환풍구(뒷벽, 테두리선보다 살짝 더 앞)
    var vent=fpMkPlane(0.16,0.16,0x1B1E24,0.95);
    vent.rotation.y=Math.PI/2; vent.position.set(backX+0.09, ZH*0.60, cz-bw*0.22); g.add(vent);
    for(var vl=0; vl<4; vl++){
      var vline=fpMkPlane(0.13,0.012,0x0A0C10,0.9);
      vline.rotation.y=Math.PI/2; vline.position.set(backX+0.10, ZH*0.60-0.055+vl*0.035, cz-bw*0.22); g.add(vline);
    }

    // 4) 발밑 콘센트(뒷벽)
    var outlet=fpMkPlane(0.05,0.08,0x2B2E33,0.95);
    outlet.rotation.y=Math.PI/2; outlet.position.set(backX+0.05, 0.32, cz+bw*0.30); g.add(outlet);

    // 5) 패널 위 작은 창(뒷벽 — 창틀→유리→세로 멀리언 순으로 앞으로 쌓는다)
    var winY=pnY+pnH/2+0.40;
    var winFr=fpMkPlane(0.89,0.46,0xB9B7B2,1);
    winFr.rotation.y=Math.PI/2; winFr.position.set(backX+0.04, winY, cz); g.add(winFr);
    var win=fpMkPlane(0.85,0.42,0xCDEAF5,0.55);
    win.rotation.y=Math.PI/2; win.position.set(backX+0.07, winY, cz); g.add(win);
    var winMul=fpMkPlane(0.02,0.42,0xB9B7B2,1);
    winMul.rotation.y=Math.PI/2; winMul.position.set(backX+0.10, winY, cz); g.add(winMul);

    // 6) 매립 라인조명(가짜 발광 스트립) + 첫 부스에만 펜던트등(입구 쪽에 매단다)
    var ceilLine=fpMkPlane(0.05, bw-0.4, 0xFFF6E0, 0.9);   // 벽감 폭(Z) 방향으로 흐르는 라인조명
    ceilLine.renderOrder=2;
    ceilLine.rotation.x=Math.PI/2; ceilLine.position.set(zx0+d*0.5, oh-0.06, cz); g.add(ceilLine);
    if(wantPendant){
      var pend=new THREE.PointLight(0xFFF6E0, 0.6, 6);
      pend.position.set(openX+0.4, ZH-0.35, cz+bw*0.32); g.add(pend);
      var globe=fpMkDisc(0.11,0xFFF6E0,0.95);
      globe.rotation.y=Math.PI/2; globe.position.set(openX+0.4, ZH-0.55, cz+bw*0.32); g.add(globe);
      var wire=fpMkPipe(0.35,0.008,0x1B1E24,1); wire.position.set(openX+0.4, ZH-0.18, cz+bw*0.32); g.add(wire);
    }

    // 7) 바닥 + 회색 누빔(채널 터프팅) 벤치 — 벤치는 뒷벽(패널) 바로 앞에 등을 대고 놓는다
    /* 실사진 대조: 벽감 안에 짙은 회색 카펫을 깔았는데 실제로는 반대였다 —
       사진 속 벽감 바닥은 밝은 우드 톤(합판 마감이 바닥까지 이어짐)이고, 회색은
       바깥 복도 쪽이다. 벽감 깊이만큼만 밝은 우드 바닥을 깐다. */
    var boothFl = fpMkPlane(d, bw-0.06, 0xD9C298, 1);
    boothFl.rotation.x=-Math.PI/2; boothFl.position.set(zx0+d/2, 0.05, cz); g.add(boothFl);
    /* 버그 수정: 벤치를 fpMkBox(bw-0.3, h, 0.10)으로 만들어서 긴 변(3.4m)이
       X축(벽감 깊이 방향)으로 누워 있었다 — 벤치가 뒷벽을 뚫고 나가 통로까지 3.4m나
       뻗은 채, 화면에서는 '테이블이 벽을 뚫고 있는' 것처럼 보였다.
       벽감 폭 방향(Z)으로 눕도록 가로·세로를 맞바꾼다(등받이는 얇게 X축 0.10). */
    var seatBk=fpMkBox(0.10,0.55,bw-0.3,0x8C8478,1,0x2A281F);
    seatBk.position.set(backX+0.10, 0.55, cz); g.add(seatBk);
    var seat=fpMkBox(0.60,0.42,bw-0.3,0x8C8478,1,0x2A281F);
    seat.position.set(backX+0.45, 0.21, cz); g.add(seat);
    var seatBkW=bw-0.3, tuftN=Math.max(3,Math.round(seatBkW/0.34));
    for(var tf=1; tf<tuftN; tf++){
      var tfZ=cz-seatBkW/2+seatBkW*tf/tuftN;
      var tuftLine=fpMkPlane(0.02,0.48,0x5A544A,0.55);
      tuftLine.rotation.y=Math.PI/2; tuftLine.position.set(backX+0.16,0.55,tfZ); g.add(tuftLine);
    }

    // 8) 테이블 2개 + 의자 4개 — 뒷벽 순서로 벤치 다음 자리에 테이블, 그
    //    앞(입구 쪽)에 의자를 놓아 의자가 벤치를 바라보게 한다. 의자는
    //    입구(openX)에서 0.2m 이상 안쪽에 머물러 통로로 튀어나가지 않는다.
    /* 실사진 대조: 벤치(앞면 backX+0.75) → 살짝 띄운 테이블 → 그 앞 의자
       순으로 다시 잡는다. 의자는 벽감 입구(openX)에서 최소 0.1m 안쪽에 머문다. */
    var tblX = backX+1.20;                      // 테이블 중심(폭 0.85 → 벤치 앞면에서 0.03 띄움)
    [-0.78, 0.78].forEach(function(sn){
      var tz = cz+sn;
      var leg=fpMkPipe(0.70,0.035,0x1B1E24,1); leg.position.set(tblX,0.35,tz); g.add(leg);
      var tblTop=fpMkBox(0.85,0.05,0.50,0x8C7A63,1,0x201A12); tblTop.position.set(tblX,0.72,tz); g.add(tblTop);
      [-0.27,0.27].forEach(function(cdx){
        var chX=tblX+0.63;                      // 테이블 앞면에서 0.03 띄운 자리(등받이는 입구 안쪽)
        var chLeg=fpMkPipe(0.44,0.03,0x1B1E24,1); chLeg.position.set(chX,0.22,tz+cdx); g.add(chLeg);
        var chSeat=fpMkBox(0.34,0.05,0.34,0xB0293F,1); chSeat.position.set(chX,0.45,tz+cdx); g.add(chSeat);
        var chBack=fpMkBox(0.05,0.38,0.34,0x1B1E24,1); chBack.position.set(chX+0.16,0.66,tz+cdx); g.add(chBack);
      });
    });
  }
  var BOOTHS=[[zz0+3.0, 0xC2185B, true],[zz0+7.8, 0xC2185B, false],[zz0+12.6, 0x4A9E3C, false],
              [zz0+17.4, 0x4A9E3C, false],[zz0+22.2, 0x4A9E3C, false],[zz0+27.0, 0x4A9E3C, false]];
  BOOTHS.forEach(function(b){ booth(b[0], b[1], b[2]); });
  /* 근본 원인 수정: 벽감은 옆벽(핀)만 방 안쪽으로 튀어나와 있고
     벽감과 벽감 '사이'(기둥 자리)는 뻥 뚫려 있었다 — 그 틈으로 뒤쪽 평평한
     벽이 그대로 보여서, 전체가 '벽에 파인 박스'가 아니라 납작한 판때기처럼
     읽혔다(박스 모양이 안 잡히던 진짜 이유). 실제 사진처럼 그 자리를 꽉 찬
     자작나무 기둥으로 채운다 — 벽감 입구면(openX)까지 나오는 통짜 벽. */
  (function(){
    var BW=3.7, BD=2.15, openX=zx0+BD;
    var edges=[zz0];                                  // 첫 부스 앞(입구 쪽) 끝
    BOOTHS.forEach(function(b){ edges.push(b[0]-BW/2, b[0]+BW/2); });
    edges.push(zz1);                                  // 마지막 부스 뒤 끝
    for(var i=0; i<edges.length; i+=2){
      var z0=edges[i], z1=edges[i+1];
      var pw=z1-z0; if(pw<=0.05) continue;
      var pz=(z0+z1)/2;
      // 기둥 앞면(복도를 마주보는 면)
      var face=fpMkPlane(pw, ZH, 0xE3C48A, 1, 0x6B4A1F);
      face.rotation.y=Math.PI/2; face.position.set(openX, ZH/2, pz); g.add(face);
      /* 버그 수정: 예전엔 여기에 기둥 윗면(cap)을 ZH-0.01에 깔았는데,
         존 전체 천장(zcl, y=ZH)과 불과 0.01m 차이라 깊이 정밀도 한계로 서로
         뚫고 나오며 깜빡였다(Z-파이팅) — 존 안에서 고개를 위아래로 움직일 때
         천장이 깨져 보이던 원인. 기둥 위는 어차피 존 천장이 덮으므로 지운다. */
    }
  })();

  /* 정체가 애매하게 남아있던 짙은 남색 자판기 박스 제거 */

  /* -- 나가는 문 : 가운데 공부공간과 오른쪽 원목 부스 '사이', 안쪽 끝(+Z) --
     사진처럼 1층 정문과 똑같은 '이중문(방풍실)' 구조 :
       존 → 안쪽 문(두 짝) → 짧은 방풍실 → 바깥 문(두 짝) → 계단 1구간
       → 오른쪽 90도 → 계단 2구간 → 그 위 문.
     계단은 실제로 걸어 올라갈 수 있고, 맨 위 문 밖으로는 나가지 않는다. */
  var P=fpB1ExitPts();
  // 문 폭 / 높이는 뒷벽(zback) 개구부와 같은 값을 써야 하므로 전역 상수에서 가져온다
  var exW=FP_B1_EXIT_DOOR_W, exH=FP_B1_EXIT_DOOR_H, vestD=P.vestD;
  var N1=FP_B1_EXIT_N1, N2=FP_B1_EXIT_N2, RUN=FP_B1_EXIT_RUN, RISE=FP_B1_EXIT_RISE;
  var h1=FP_B1_EXIT_H1, topY=FP_B1_EXIT_TOPY, dir=P.dir, sW=FP_B1_EXIT_SW;
  var exZ=P.zz1, exX=FP_B1_EXIT_X;
  /* 실사진 반영: 나가는 문을 검은 알루미늄 프레임 통유리 스토어프론트로
     다시 디자인한다 — 문 좌우(적어도 왼쪽, 오른쪽은 회의실이 바로 붙어 있어 자리가 없음)
     통유리 벽 + 위쪽 트랜섬 유리 + 초록 비상구 표지등 + KSNU 로고/영문 레터링. */
  var glassFrColor=0x14181D, exGlassH=exH;   // 문 높이(exH)와 정확히 맞춰서 문-유리 경계 트랜섬 라인이 끊기지 않게
  /* 실사진 대비 리얼리티 개선: (1) 프레임을 두께 없는 판(fpMkPlane) 대신 광택 있는 입체 각재(Box+envMap)로 만든다
         — 사진의 검은 알루미늄 프레임은 모서리마다 하이라이트가 생겨서 입체로 읽힌다.
     (2) 유리·프레임 모두 크리에이티브 존 출입문(fpMakeGate)과 같은 무광 단색으로 통일한다
         — 반사(envMap)를 쓰면 유리·프레임이 과하게 번들거려서 존 안 다른 문들과 안 어울린다. */
  var EXFR_D=0.07;                           // 프레임 각재 두께(앞뒤)
  function exFrameBar(w,h,d){                // 검은 알루미늄 각재(무광 — 반사 없음, 두께만 유지)
    var mat=new THREE.MeshStandardMaterial({color:glassFrColor, metalness:0.04,
      roughness:0.88, transparent:true, opacity:1, depthWrite:true});
    fpCorrMats.push({m:mat, op:1});
    var mb=new THREE.Mesh(new THREE.BoxGeometry(w,h,(d===undefined?EXFR_D:d)), mat);
    mb.renderOrder=-2; return mb;             // 프레임(불투명에 가까움) 먼저 그린다
  }
  function exGlassPane(w,h){
    /* 실제 사진처럼 맑은 유리: 기존 0x223344/opacity 0.55는 색이 짙고
       불투명도가 높아서 유리라기보다 진한 색 판유리처럼 보였다 — 실제 사진 속
       유리는 거의 투명하고 옅은 청록빛만 살짝 비친다. 색을 밝게, 불투명도를
       크게 낮춰(0.2) 맑은 느낌을 낸다. depthWrite:false는 그대로 유지해
       겹친 유리판 사이 Z-파이팅을 막는다. */
    var mat=new THREE.MeshPhongMaterial({color:0xAFC9CE, shininess:40,
      transparent:true, opacity:0.2, side:THREE.DoubleSide, depthWrite:false});
    fpCorrMats.push({m:mat, op:0.2});
    var ms=new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat);
    ms.renderOrder=-1;                        // 프레임(-2) 다음, 텍스트/로고(기본 0)보다 먼저
    return ms;
  }
  /* 실사진: 문 라인 위로 '트랜섬(상부 고정창) 유리 띠'를 한 줄 더 올린다.
     사진처럼 바닥~문높이(하부 유리) → 검은 가로 프레임 → 트랜섬 유리 → 천장 직전 헤더 순서. */
  var exTransTop = ZH-0.12;                  // 트랜섬 유리 윗변(천장 바로 아래)
  function exTransomRow(cx0, cx1){           // 주어진 x구간에 트랜섬 유리 한 줄 + 멀리언
    var wz=cx1-cx0; if(wz<=0.05) return;
    var tH=exTransTop-(exGlassH+0.09); if(tH<=0.05) return;
    var tN=Math.max(1,Math.round(wz/1.3)), tW=wz/tN;
    for(var ti=0; ti<tN; ti++){
      var tx0=cx0+tW*ti, tcx=tx0+tW/2;
      var tg=exGlassPane(tW-0.05, tH-0.06);
      tg.position.set(tcx, exGlassH+0.09+tH/2, exZ-0.006); g.add(tg);
      var tm=exFrameBar(0.06, tH);
      tm.position.set(tx0, exGlassH+0.09+tH/2, exZ); g.add(tm);
    }
    var tmEnd=exFrameBar(0.06, tH);
    tmEnd.position.set(cx1, exGlassH+0.09+tH/2, exZ); g.add(tmEnd);
    var tTop=exFrameBar(wz, 0.09);
    tTop.position.set((cx0+cx1)/2, exTransTop, exZ); g.add(tTop);
    var tHdr=exFrameBar(wz, Math.max(0.03,ZH-exTransTop));
    tHdr.position.set((cx0+cx1)/2, (exTransTop+ZH)/2, exZ); g.add(tHdr);
  }
  /* Z-파이팅 원인 4, 중복 지오메트리 제거: 예전에는 오른쪽 전체(exX+exW/2~zx1)에
     이 자리에서 크림색 배경벽(wR)을 깔았는데, 그 뒤로 회의실 코드가 같은 Z(exZ)에
     '문-회의실1 사이 유리 패널'을 그 위에 다시 그리면서 정확히 같은 좌표에 두 벽이
     겹쳐 깜빡였다(Z-fighting). 그 자리는 이제 회의실 코드가 전담해서 채우므로 여기서는
     따로 벽을 만들지 않는다(중복 제거). */
  /* 나가는 문을 마주봤을 때 오른쪽(코드상 zx0 쪽)은 검은 프레임
     통유리 스토어프론트였는데,
       ① 반투명 유리라 그 뒤 존 안쪽 벽(자작나무 합판 파티션 등)이 그대로
          비쳐, 격자 유리와 뒷벽이 서로 겹쳐 보였고("벽돌이나 무언가와 겹쳐"),
       ② 반대쪽(왼쪽) 벽은 베이지 금속 패널이라 양쪽이 전혀 달라 보였다.
     왼쪽과 똑같은 베이지 금속 패널 벽으로 바꾼다 — 불투명이라 뒤가 비치지
     않으니 겹침도 함께 사라진다. (패널 색·줄눈 간격은 왼쪽 벽과 동일) */
  (function(){
    var lx0=zx0, lx1=exX-exW/2;
    if(lx1-lx0 <= 0.05) return;
    var wz=lx1-lx0, wcx=(lx0+lx1)/2;
    var PANEL=0xD6D0C2, PANEL2=0xC9C2B2, JOINT=0x9A9486;
    var JOINT_Y=[0.95, 1.85, 2.55];
    var pwR=fpMkPlane(wz, ZH, PANEL, 1, JOINT);
    pwR.rotation.y=Math.PI; pwR.position.set(wcx, ZH/2, exZ-0.02); g.add(pwR);
    JOINT_Y.forEach(function(jy){
      var hl=fpMkPlane(wz, 0.02, JOINT, 0.75);
      hl.rotation.y=Math.PI; hl.position.set(wcx, jy, exZ-0.03); g.add(hl);
    });
    for(var jx=lx0+1.15; jx<lx1-0.15; jx+=1.15){
      var vl=fpMkPlane(0.02, ZH, JOINT, 0.55);
      vl.rotation.y=Math.PI; vl.position.set(jx, ZH/2, exZ-0.03); g.add(vl);
    }
    // 문 쪽 끝의 살짝 튀어나온 기둥(반대편 벽과 대칭)
    var pierW=Math.min(1.30, wz*0.55), pierD=0.34, pierX1=lx1, pierX0=lx1-pierW;
    var pfz=exZ-pierD;
    var pfR=fpMkPlane(pierW, ZH, PANEL, 1, JOINT);
    pfR.rotation.y=Math.PI; pfR.position.set((pierX0+pierX1)/2, ZH/2, pfz); g.add(pfR);
    JOINT_Y.forEach(function(jy){
      var hl2=fpMkPlane(pierW, 0.02, JOINT, 0.75);
      hl2.rotation.y=Math.PI; hl2.position.set((pierX0+pierX1)/2, jy, pfz-0.01); g.add(hl2);
    });
    [[pierX0, Math.PI/2],[pierX1, -Math.PI/2]].forEach(function(sd){
      var side=fpMkPlane(pierD, ZH, PANEL2, 1, JOINT);
      side.rotation.y=sd[1]; side.position.set(sd[0], ZH/2, exZ-pierD/2); g.add(side);
    });
    var skirtR=fpMkPlane(wz, 0.10, 0x8A8577, 1);
    skirtR.rotation.y=Math.PI; skirtR.position.set(wcx, 0.05, exZ-0.035); g.add(skirtR);
  })();
  // 문 위쪽도 사진처럼 트랜섬 유리(문 상부 고정창)
  var lint2=exFrameBar(exW, 0.08);
  lint2.position.set(exX, exH+0.05, exZ); g.add(lint2);
  exTransomRow(exX-exW/2, exX+exW/2);
  // 문 좌우 검은 세로 프레임 기둥(스토어프론트 느낌) — 사진처럼 굵고 광택 있는 입체 각재
  [-exW/2,exW/2].forEach(function(fx){
    var pcol=exFrameBar(0.10, ZH, 0.10);
    pcol.position.set(exX+fx, ZH/2, exZ); g.add(pcol);
  });
  /* 문 앞 천장 다운라이트 2개 — 반사를 없앴으므로 밝기를 낮춰 은은하게만 남긴다 */
  [-0.75, 0.75].forEach(function(dx){
    var dl=new THREE.PointLight(0xFFF2DC, 0.28, 4.5);
    dl.position.set(exX+dx, ZH-0.18, exZ-1.0); g.add(dl);
    var dlDisc=fpMkDisc(0.12, 0xFFF6E4, 0.9);
    dlDisc.rotation.x=Math.PI/2; dlDisc.position.set(exX+dx, ZH-0.04, exZ-1.0); g.add(dlDisc);
  });
  /* 삭제: 이 흰색 필름 띠는 통유리 벽에 붙는 시트지였는데, 그 벽을
     불투명 금속 패널로 바꿨으므로 더 이상 의미가 없다(패널 위에 흰 띠만
     덩그러니 남는다) — 없앤다. */
  /* 벽을 금속 패널로 바꿨으니 끝(zx0)의 코너 리턴도 같은 패널로
     마감한다 — 예전엔 유리 리턴이라 패널 벽과 재질이 어긋났다. */
  (function(){
    var retW=0.5, retZ0=exZ-retW, retZ1=exZ;
    var PANEL2=0xC9C2B2, JOINT=0x9A9486;
    var retP=fpMkPlane(retW, ZH, PANEL2, 1, JOINT);
    retP.rotation.y=Math.PI/2; retP.position.set(zx0+0.01, ZH/2, (retZ0+retZ1)/2); g.add(retP);
    var retCap=fpMkPlane(0.6, ZH, 0xB0553A, 1);
    retCap.rotation.y=Math.PI/2; retCap.position.set(zx0, ZH/2, retZ0-0.03); g.add(retCap);
  })();
  // 초록 비상구 표지등(문 위)
  /* 버그 수정 : 발광 뒤판(glow)이 표지판 텍스처보다 시청자 쪽(exZ-0.10 < exZ-0.06)에
     더 가깝게 놓여 있어서, 실제 픽토그램 그림이 안 보이고 초록 사각형만 보였다.
     뒤판은 텍스처보다 '뒤(벽 쪽, z가 더 큰 쪽)'에 있어야 한다 — 순서를 바로잡는다. */
  /* 표지등이 작고 어두워 잘 안 보였다 — 판 크기를 키우고
     뒤판 발광도 밝게 올려서 존 안쪽에서도 확실히 눈에 띄게 한다. */
  /* 버그 수정: 여기 있던 초록 발광 뒤판(exExitGlow)은
     fpMkBox(0.94, 0.02, 0.46) — 높이 2cm에 깊이 46cm짜리 '납작하게 누운' 판이라,
     표지판(exZ-0.08)보다 18cm나 앞(exZ-0.26)까지 튀어나와 있었다.
     눈높이(1.6m)에서 2.6m 높이의 표지등을 올려다보면 이 판의 아랫면(0.94×0.46)이
     그대로 보여서, 초록 덩어리가 비상구 픽토그램을 가려버렸다 — 판을 삭제하고
     표지판 텍스처만 남긴다. */
  var exExitSign=fpMkTex(0.90,0.44,fpExitSignTex(),1);
  exExitSign.rotation.y=Math.PI; exExitSign.position.set(exX, exH+0.34, exZ-0.08); g.add(exExitSign);
  /* 안쪽 문(존에서 보이는 문) — 검은 프레임 + KUNSAN NATIONAL UNIVERSITY 레터링 + KSNU 로고
     나갈 때 다가가면 실제로 여닫이(경첩)로 열리는 모션을 추가한다 —
     크리에이티브 존 입구 문과 같은 fpRegisterAutoDoor 메커니즘을 그대로 쓰되,
     이 문은 "나가는" 문이므로 존 안쪽(작은 z, 곧 exZ보다 작은 쪽)에서 다가갈
     때만 열리게 한다(oneWay:-1 — 입구 문이 복도 쪽에서만 열리는 것과 같은 방식). */
  /* 수정: 예전엔 안쪽 2.6m / 바깥 1.7m로 어긋나게 잡아서, 한 번에
     문 앞까지 이동하면 안쪽 문만 열리고 바깥 문은 한 번 더 눌러야 열렸다 —
     두 문 다 같은 거리(FP_B1_EXIT_DOOR_TRIG)에서 열리게 맞춰, 나가는 문 앞에
     서면 이중문이 한꺼번에 열린다.
     oneWay:0 : 나갈 때(존 → 계단)뿐 아니라 다시 들어올 때(계단 → 존)도 열린다
     (예전엔 -1이라 한쪽 방향에서만 열렸다). */
  var exDoorIn=fpMakeGate({w:exW, h:exH, dark:true, accent:'#8FE3E0',
                           autoOpen:true, oneWay:0, noMullion:true, push:true,
                           trigDist:FP_B1_EXIT_DOOR_TRIG});
  exDoorIn.rotation.y=Math.PI; exDoorIn.position.set(exX,0,exZ-0.05); g.add(exDoorIn);
  /* ── 문 유리 레터링(KUNSAN NATIONAL UNIVERSITY) + KSNU 로고 ──
     버그 수정: 예전엔 이 장식들을 문이 아니라 벽 쪽 그룹(g)에 붙여
     뒀다 — 문이 열려도 글씨는 그 자리에 그대로 떠 있어서, 문이 열린 건지
     아닌지 알 수 없었고 "문이 두 개 겹쳐 있는" 느낌도 여기서 왔다.
     이제는 문짝(leafGrp)에 직접 붙여서 문과 함께 갈라지며 열린다.
     글씨가 두 짝에 걸쳐 있으므로, 같은 텍스처를 좌/우 절반씩만 보이게
     잘라서(repeat/offset) 각 문짝에 한 장씩 나눠 붙인다. */
  function exGateDecals(gate, faceZ, backZ){
    var lv=(gate.userData&&gate.userData.gateLeaves)||[];
    if(lv.length<2) return;
    var halfW=(exW-0.1)/2;
    lv.forEach(function(o){
      var sgn=o.sign;                                   // -1 = 왼쪽 문짝, +1 = 오른쪽 문짝
      /* 앞면(문을 정면으로 보는 쪽) : 텍스처 좌/우 절반을 그대로 쓴다.
         fpMkTex는 기본이 양면(DoubleSide)이라 반대쪽에서도 그대로 비쳐 거울
         글씨로 보인다 — 앞·뒷면 두 장을 따로 붙이므로 각 장을 단면으로 바꾼다. */
      var tA=fpWallTextTex('KUNSAN NATIONAL UNIVERSITY','#080F1C').clone();
      tA.needsUpdate=true; tA.repeat.set(0.5,1); tA.offset.set(sgn<0?0:0.5, 0);
      var mA=fpMkTex(halfW, 0.30, tA, 1);
      mA.material.side=THREE.FrontSide;
      mA.position.set(sgn*halfW/2, 1.28, faceZ); o.leaf.add(mA);
      /* 뒷면(계단 쪽에서 다시 들어올 때) : 판을 180도 돌리면 좌우가 뒤바뀌므로,
         두 문짝이 쓰는 텍스처 절반도 서로 맞바꿔야 글자가 정방향으로 읽힌다. */
      if(backZ!==undefined){
        var tB=fpWallTextTex('KUNSAN NATIONAL UNIVERSITY','#080F1C').clone();
        tB.needsUpdate=true; tB.repeat.set(0.5,1); tB.offset.set(sgn<0?0.5:0, 0);
        var mB=fpMkTex(halfW, 0.30, tB, 1);
        mB.material.side=THREE.FrontSide;
        mB.rotation.y=Math.PI; mB.position.set(sgn*halfW/2, 1.28, backZ); o.leaf.add(mB);
      }
      /* 로고는 원형이라 두 짝으로 못 나눈다 — 실제 유리문처럼 오른쪽 문짝
         한 장에만 붙인다(문 가운데 살짝 오른쪽). */
      if(sgn>0){
        var lg=fpMkDisc(0.15,0xF2EFE6,0.95);
        lg.position.set(0.30, 1.68, faceZ+0.005); o.leaf.add(lg);
        var lt=fpMkTex(0.28,0.15,fpWallTextTex('KSNU','#12213D'),1);
        lt.material.side=THREE.FrontSide;
        lt.position.set(0.30, 1.68, faceZ); o.leaf.add(lt);
        if(backZ!==undefined){
          var lt2=fpMkTex(0.28,0.15,fpWallTextTex('KSNU','#12213D'),1);
          lt2.material.side=THREE.FrontSide;
          lt2.rotation.y=Math.PI; lt2.position.set(0.30, 1.68, backZ); o.leaf.add(lt2);
        }
      }
    });
  }
  /* 안쪽 문 : 존 쪽(앞면)뿐 아니라, 계단에서 다시 들어올 때 방풍실 쪽(뒷면)에서도
     보인다 — 한 장만 붙이면 반대쪽에서 글자가 거울처럼 뒤집혀 보이므로
     양면에 각각 붙인다. */
  /* 삭제: 이 문 유리에 붙어 있던 장식 세 가지를 모두 없앤다 —
     ① 'KUNSAN NATIONAL UNIVERSITY' 레터링, ② 그 오른쪽 흰 원판(로고 바탕),
     ③ 원판 위 'KSNU' 글씨. 문 유리는 아무것도 없는 맑은 유리로 둔다.
     (exGateDecals 함수 자체는 남겨 두되 호출하지 않는다) */
  /* 방풍실(두 문 사이 짧은 공간) — 바닥·천장·양옆 유리벽 */
  /* ══════════════════════════════════════════════════════════════
     방풍실 + 바깥문 + 계단실 — 전체를 처음부터 다시 정리해서 작성.
     사진 기준 순서 그대로: 방풍실 → 바깥문(오른쪽 문 살짝 열림) → 계단 5단
     → 계단참(정면 벽돌 벽에서 끝) — 걸어서 못 올라가는 2구간·위쪽 문은
     화면에 계속 혼란을 줘서 아예 만들지 않는다.
     ══════════════════════════════════════════════════════════════ */

  /* ── 1. 방풍실 (이중문 사이 전실) : 폭 exW+0.9 × 깊이 vestD × 높이 vH ── */
  /* 계단실 벽돌벽 높이(sH)를 방풍실 코드보다 먼저 써야 해서 앞으로 끌어왔다 —
     값 자체는 그대로(계단참 정면 적벽돌 벽이 유리문 시야를 위까지 가득 채우도록 4.6). */
  var sH=6.4;   // 2구간 계단이 2.8m까지 오르므로, 맨 위 문·트랜섬이 들어가도록 더 높인다
  var vZ0=exZ, vZ1=exZ+vestD, vH=exH+0.85;   // 층고가 낮아 보여서 exH+0.32 → exH+0.85로 높인다
  var vfl2=fpMkPlane(exW+0.9, vestD, 0xB7B2A6, 1);
  vfl2.rotation.x=-Math.PI/2; vfl2.position.set(exX,0.02,(vZ0+vZ1)/2); g.add(vfl2);
  var vcl2=fpMkPlane(exW+0.9, vestD, 0xE9E5D9, 1);
  vcl2.rotation.x=Math.PI/2; vcl2.position.set(exX,vH,(vZ0+vZ1)/2); g.add(vcl2);
  /* 실사진 3·4 대조: 방풍실 양옆이 파란 유리판 한 장뿐이라 너무 휑했다.
     실제로는 ① 유리 너머로 바깥 붉은 벽돌벽(-X)과 안쪽 베이지 석재 타일벽(+X)이 보이고,
     ② 유리 자체는 검은 알루미늄 프레임(하부·상부 레일 + 세로 멀리언)으로 나뉘어 있으며,
     ③ 가운데 높이에 흰색 프로스트(시트지) 띠가 가로로 지나간다.
     그 세 가지를 채워 넣는다. */
  [-1,1].forEach(function(sn){
    var vWX=exX+sn*(exW+0.9)/2, vZc=(vZ0+vZ1)/2, FRM=0x14181D;

    // ① 유리 너머 배경 벽 + 그 사이 바닥·천장(허공으로 보이지 않게)
    /* 배경벽 폭은 방풍실 깊이(vestD)에 딱 맞춘다 — 이보다 넓게 잡으면 바깥
       벽돌 파사드(z=vZ1+0.02) 너머로 삐져나와, 계단에서 돌아볼 때 벽돌벽 위에
       엉뚱한 타일판이 서 있는 것처럼 보인다(버그 수정). */
    var backGap=0.85, backW=vestD;
    var backMat;
    if(sn<0){
      backMat=new THREE.MeshBasicMaterial({map:fpBrickTexFor(backW, vH), side:THREE.DoubleSide,
        transparent:false, depthWrite:true});                       // 바깥 마당 붉은 벽돌
    }else{
      var tt=fpTilePanelTex().clone(); tt.needsUpdate=true;
      tt.wrapS=tt.wrapT=THREE.RepeatWrapping;
      tt.repeat.set(Math.max(1,Math.round(backW/1.1)), Math.max(1,Math.round(vH/1.1)));
      backMat=new THREE.MeshBasicMaterial({map:tt, side:THREE.DoubleSide,
        transparent:false, depthWrite:true});                       // 안쪽 복도 베이지 석재 타일
    }
    var backW2=new THREE.Mesh(new THREE.PlaneGeometry(backW, vH), backMat);
    backW2.renderOrder=-2; backW2.rotation.y=Math.PI/2;
    backW2.position.set(vWX+sn*backGap, vH/2, vZc); g.add(backW2);
    var gapFl=fpMkPlane(backGap, backW, 0xC4C0B6, 1);               // 유리 밖 바닥(포장 띠)
    gapFl.rotation.x=-Math.PI/2; gapFl.position.set(vWX+sn*backGap/2, 0.03, vZc); g.add(gapFl);
    var gapCl=fpMkPlane(backGap, backW, 0x2B2E33, 1);               // 유리 밖 천장(어두운 처마)
    gapCl.rotation.x=Math.PI/2; gapCl.position.set(vWX+sn*backGap/2, vH-0.01, vZc); g.add(gapCl);

    // ② 유리 — 배경이 비쳐 보이도록 조금 더 맑게
    var vg2=new THREE.Mesh(new THREE.PlaneGeometry(vestD, vH),
      new THREE.MeshBasicMaterial({color:0x3E5F6E, transparent:true, opacity:0.20, side:THREE.DoubleSide}));
    vg2.rotation.y=Math.PI/2; vg2.position.set(vWX, vH/2, vZc); g.add(vg2);

    // ③ 검은 알루미늄 프레임(하부·상부 레일 + 세로 멀리언 3개) — 방풍실 안쪽에서 보이게 살짝 앞으로
    var fx=vWX-sn*0.03;
    var botR=fpMkPlane(vestD, 0.14, FRM, 1);
    botR.rotation.y=Math.PI/2; botR.position.set(fx, 0.07, vZc); g.add(botR);
    var topR=fpMkPlane(vestD, 0.12, FRM, 1);
    topR.rotation.y=Math.PI/2; topR.position.set(fx, vH-0.06, vZc); g.add(topR);
    [vZ0, vZc, vZ1].forEach(function(mz){
      var mul=fpMkPlane(0.08, vH, FRM, 1);
      mul.rotation.y=Math.PI/2; mul.position.set(fx, vH/2, mz); g.add(mul);
    });

    /* ④ 삭제: 방풍실 옆 유리벽 가운데의 흰색 프로스트 시트지 띠를
       없앤다 — 존에서 나가는 문을 정면으로 보면 문 좌우 끝에 흰 사각형
       두 개가 떠 있는 것처럼만 보였다. 유리는 그대로 맑게 둔다. */
  });
  /* 방풍실 옆 유리벽은 높이가 vH(층고)까지만 있는데, 계단실 벽돌벽은
     그보다 훨씬 높은 sH까지 있다 — 카메라가 위쪽을 보면 방풍실 유리벽 위로
     아무것도 없는 빈 공간(캄캄한 배경)이 삼각형 모양으로 드러나 보였다.
     같은 자리(방풍실 옆면)에 벽돌 텍스처로 그 위쪽 틈을 마저 채운다.
     (버그 수정): 이 판을 fpMkTex로 만들었는데 그 헬퍼는 depthWrite:false +
     renderOrder:-1이라, 방풍실 천장(vcl2)보다 나중에 그려지면서 천장을 뚫고
     비쳐 나왔다 — 존 안에서 나가는 문을 볼 때 천장 위로 벽돌 삼각형이
     드러나 보이던 원인. 깊이를 정상적으로 쓰는 불투명 메쉬로 만든다. */
  if(sH>vH){
    [-1,1].forEach(function(sn){
      var fillH=sH-vH;
      var bMat=new THREE.MeshBasicMaterial({map:fpBrickTexFor(vestD, fillH),
        side:THREE.DoubleSide, transparent:false, depthWrite:true});
      var brickFill=new THREE.Mesh(new THREE.PlaneGeometry(vestD, fillH), bMat);
      brickFill.renderOrder=-2;
      brickFill.rotation.y=Math.PI/2;
      brickFill.position.set(exX+sn*(exW+0.9)/2, vH+fillH/2, (vZ0+vZ1)/2); g.add(brickFill);
    });
  }
  // 천장에 하얗게 도드라져 보이던 매립 스폿등 3개를 제거한다(발광 메쉬가 하얀 얼룩처럼 보였음).

  /* ── 2. 바깥 문 (방풍실 끝, 폭 exW×높이 exH) ──
     버그 수정: 예전엔 이 문을 처음부터 양쪽 1.2rad로 활짝 벌려
     '고정'해 뒀다. 그래서 존 안에서 나가는 문을 보면 닫혀 있는 안쪽 문짝 뒤로
     활짝 열린 바깥 문짝이 겹쳐 보여서 "문이 두 개 겹쳐 있는" 것처럼 보였고,
     안쪽 문이 열려도 달라지는 게 없어 열린 티가 나지 않았다.
     → 안쪽 문과 똑같이 평소엔 닫혀 있다가 다가가면 여닫이(경첩)로 열리는
       자동문으로 바꾼다(oneWay:-1 = 존/방풍실 쪽에서 나갈 때만 열림). */
  var exDoorOut=fpMakeGate({w:exW, h:exH, accent:'#8FE3E0',
                            autoOpen:true, oneWay:0, noMullion:true, push:true,
                            trigDist:FP_B1_EXIT_DOOR_TRIG});
  exDoorOut.rotation.y=Math.PI; exDoorOut.position.set(exX,0,vZ1-0.05); g.add(exDoorOut);
  (function(){
    exDoorOut.traverse(function(c){
      if(c.isMesh && c.material && c.material.transparent && c.material.opacity<0.6){
        c.material.depthWrite=false; c.renderOrder=-1;
      }
    });
  })();
  /* 근본 수정, 비상구 표지등과 같은 문제: 이 레터링도 방풍실 쪽과
     계단 쪽 양쪽에서 다 보이는데, 한 장짜리 판은 한쪽 방향에서만 정방향으로
     읽히고 반대쪽에서는 거울처럼 뒤집혀 보인다 — 실제 유리문 시트지도 보통
     양면에 각각 붙이는 것처럼, 두 장을 각 방향에 맞는 회전으로 겹쳐 둔다. */
  /* 바깥 문에는 레터링·로고를 붙이지 않는다. 안쪽 문과 똑같은 글씨를
     같은 높이에 한 번 더 붙이면, 존에서 유리 너머로 볼 때 두 글씨가 겹쳐 보여서
     ("문이 두 개 겹쳐 있다") 안쪽 문이 열렸는지 알아보기 어려웠다 —
     실제 방풍실처럼 안쪽 문에만 시트지를 붙이고 바깥 문은 맑은 유리로 둔다. */
  /* 버그 수정: 이 비상구 표지등은 원래 계단 쪽(z 큰 쪽)에서 보는
     걸 기준으로 글로우판/픽토그램 앞뒤 순서를 잡아 뒀는데, zonefoot 카메라는
     반대로 방풍실 안쪽(z 작은 쪽)에서 문을 보고 있어서 순서가 뒤집혀 —
     초록 글로우 판이 픽토그램보다 카메라에 더 가깝게 그려져 그냥 초록색
     덩어리처럼 보였다. 이 시점 기준으로 앞뒤를 다시 맞춘다. */
  /* 근본 수정: 이 표지등은 방풍실 쪽(zonefoot, 작은 z)에서도 보고
     계단/바깥 쪽(크리에이티브 존으로 들어오는 길, 큰 z)에서도 봐야 하는데,
     글로우판+픽토그램 두 장을 한 세트만 쓰면 앞뒤 순서가 한쪽 방향에만 맞고
     반대쪽에서는 글로우판이 픽토그램을 가려버린다(둘 다 만족 불가능).
     → 글로우판을 가운데 두고, 픽토그램 판을 양쪽에 하나씩 복제해 샌드위치
     구조로 만든다 — 어느 방향에서 봐도 글로우판보다 픽토그램이 더 가깝다. */
  /* 실제 사진에는 이 작은 비상구 표지판이 없다 — 삭제.
     (기존 exExitGlow2 / exExitSignA / exExitSignB 3개 메쉬 제거) */
  /* 유리를 맑게(opacity 0.2) 바꾸면서, 뒤쪽 계단이 안 보이게 막던
     불투명 배면판(exBack)도 함께 지운다 — 이제는 그 뒤로 계단·벽돌·숲이
     실제 사진처럼 비쳐 보여야 하므로 막을 필요가 없다. */

  /* 문 앞이 휑해 보여서, 실제 출입구처럼 안쪽 매트·문턱 스트립과
     문 좌우 벽 디테일(스테인리스 킥플레이트 톤 띠 + 작은 안내 표지)을 채운다.
     내비게이션 좌표와는 무관한 장식 메쉬만 추가한다. */
  (function(){
    // 안쪽 바닥 매트(문 바로 앞) + 스테인리스 문턱 스트립
    var matZ=vZ1-0.62;
    var mat=fpMkPlane(exW+0.5, 0.95, 0x2E3439, 1);
    mat.rotation.x=-Math.PI/2; mat.position.set(exX, 0.045, matZ); g.add(mat);
    for(var mi=1; mi<7; mi++){                       // 매트 결(가로 홈)
      var ml=fpMkPlane(exW+0.42, 0.02, 0x1A1F23, 0.8);
      ml.rotation.x=-Math.PI/2; ml.position.set(exX, 0.052, matZ-0.42+mi*0.12); g.add(ml);
    }
    var thr=fpMkPlane(exW+0.5, 0.14, 0xB9BCC0, 1);
    thr.rotation.x=-Math.PI/2; thr.position.set(exX, 0.05, vZ1-0.10); g.add(thr);
    // 문 좌우 벽 아래쪽 킥플레이트 톤 띠 — 유리 옆 빈 벽면을 채운다
    [-1,1].forEach(function(sn){
      var kp=fpMkPlane(0.9, 0.34, 0xA8ADB2, 1);
      kp.rotation.y=Math.PI/2;
      kp.position.set(exX+sn*(exW/2+0.46), 0.20, vZ1-0.5); g.add(kp);
    });
    // 문 오른쪽 벽에 작은 안내 표지(짙은 판 + 흰 띠 2줄)
    var sgX=exX+(exW/2+0.46), sgZ=vZ1-1.05;
    var sg=fpMkPlane(0.30, 0.22, 0x1B2A4A, 1);
    sg.rotation.y=Math.PI/2; sg.position.set(sgX, 1.45, sgZ); g.add(sg);
    [0.04,-0.04].forEach(function(dy){
      var sl=fpMkPlane(0.22, 0.025, 0xE8ECEF, 0.95);
      sl.rotation.y=Math.PI/2; sl.position.set(sgX-0.004, 1.45+dy, sgZ); g.add(sl);
    });
  })();

  /* ══════════════════════════════════════════════════════════════
     [역방향(계단 위→바깥 문) 시점 보강] 실제 사진(후문 외부)처럼 '중앙 양방향 유리문 + 좌우 통유리 파티션
     + 상단 고정창'이 하나의 대형 블랙 메탈 프레임으로 이어지도록,
     방풍실 폭(exW+0.9) 전체를 감싸는 사이드라이트·트랜섬·엠보 띠·
     루버 천장·바깥쪽 벽돌 기둥을 추가한다(기존 문짝 exDoorOut은 그대로 둠).
     ══════════════════════════════════════════════════════════════ */
  (function(){
    var frCol=0x14181D;                     // 블랙 메탈 프레임
    var vestW=exW+0.9;                      // 방풍실 전체 폭(vfl2/vcl2와 동일)
    var sideW=(vestW-exW)/2;                // 좌우 사이드라이트 폭
    var sx0=exX-vestW/2, sx1=exX+vestW/2;
    var doorX0=exX-exW/2, doorX1=exX+exW/2;
    var glassZ=vZ1-0.06;                    // 문짝(vZ1-0.05)보다 살짝 안쪽

    // 1) 좌우 사이드라이트(통유리 파티션) — 뒤쪽 실내 복도 벽면이 유리 너머로 비치는 느낌
    [[sx0,doorX0],[doorX1,sx1]].forEach(function(seg){
      var w=seg[1]-seg[0]; if(w<=0.05) return;
      var cx=(seg[0]+seg[1])/2;
      var pane=fpMkPlane(w-0.04, exH-0.06, 0xBFD8E0, 0.5);
      pane.position.set(cx, exH/2+0.03, glassZ); g.add(pane);
      var mul=fpMkPlane(0.05, exH, frCol, 1);
      mul.position.set(seg[0], exH/2, glassZ+0.01); g.add(mul);
    });
    var mulR=fpMkPlane(0.05, exH, frCol, 1);
    mulR.position.set(sx1, exH/2, glassZ+0.01); g.add(mulR);

    // 2) 상단 고정창(트랜섬) — 사이드라이트+문 위, 방풍실 천장 밑까지
    var transH=vH-exH;
    if(transH>0.05){
      var trPane=fpMkPlane(vestW-0.06, transH-0.05, 0xBFD8E0, 0.45);
      trPane.position.set(exX, exH+transH/2, glassZ); g.add(trPane);
      var trTop=fpMkPlane(vestW, 0.07, frCol, 1);
      trTop.position.set(exX, exH+0.02, glassZ+0.01); g.add(trTop);
      var trBar=fpMkPlane(vestW, 0.06, frCol, 1);
      trBar.position.set(exX, vH-0.03, glassZ+0.01); g.add(trBar);
    }
    // 프레임 하단 문턱 바
    var thresh=fpMkPlane(vestW, 0.08, frCol, 1);
    thresh.rotation.x=-Math.PI/2; thresh.position.set(exX, 0.04, glassZ); g.add(thresh);

    /* 3) 반투명 엠보(프로스트) 띠 — 좌우 사이드라이트에만 붙인다.
       버그 수정: 예전엔 방풍실 폭 전체(vestW-0.06)를 가로지르는 한 장이라
       문짝 앞까지 덮고 있었다 — 크리에이티브 존에서 나가는 문을 보면 문 가운데에
       흰 띠가 겹쳐 보이고(문 유리 레터링과도 겹침), 문이 열려도 그 자리에 그대로
       떠 있었다. 복도 쪽 필름 띠(bandX1=exX-exW/2에서 끊은 것)와 같은 방식으로
       문 개구부를 비우고 좌우 유리에만 남긴다. */
    /* 삭제: 좌우 사이드라이트에 남겨 뒀던 프로스트 띠도 없앤다 —
       존에서 나가는 문을 보면 문 좌우 끝에 흰 사각형 두 개가 떠 있는 것처럼
       보였다(방풍실 옆 유리의 띠와 같은 이유). 사이드라이트도 맑은 유리로 둔다. */

    // 4) 상단 루버 천장 — 문 상단을 감싸는 민트/청회색 선형 알루미늄 패널
    var louverCol=0xAFC7C4, louverN=9;
    /* 버그 수정: 루버 슬랫이 방풍실 바깥(vZ1+0.4)까지 뻗어 있어서,
       문 위를 벽돌로 막은 뒤에도 그 슬랫 끝과 앞면 띠가 벽돌을 뚫고 밖으로
       삐져나와 문 위에 회색 막대들처럼 보였다 — 방풍실 안쪽에만 있도록 줄인다. */
    var louverDepth=vestD-0.15;              // 방풍실 안에만
    var louverCz=vZ1-louverDepth/2-0.10;
    for(var li2=0; li2<louverN; li2++){
      var lx2=sx0+ (vestW*(li2+0.5)/louverN);
      var slat=fpMkBox(vestW/louverN-0.03, 0.05, louverDepth, louverCol, 1, 0x6E827E);
      slat.position.set(lx2, vH-0.03, louverCz); g.add(slat);
    }
    var louverFascia=fpMkPlane(vestW+0.1, 0.14, louverCol, 1);
    louverFascia.position.set(exX, vH-0.10, vZ1-0.12); g.add(louverFascia);   // 파사드 벽돌 안쪽으로

    /* 5) 실사진 대조: 문 양옆에 세워 뒀던 벽돌 각기둥 2개는 삭제한다 —
       실제로는 기둥 없이 벽돌 벽면이 문까지 그대로 이어진다. */

    /* 6) 출입구 벽돌 벽(파사드) — 계단 쪽에서 나가는 문을 돌아보면 문틀·기둥 양옆이 계단실 폭(sW=12m)
       끝까지 뻥 뚫려 있어서, 그 너머의 크리에이티브 존 뒷벽(크림색)과 그 위
       빈 배경(검은 띠)이 그대로 보였다. 실제 사진처럼 이 출입구는 붉은 벽돌
       벽 한가운데에 유리문이 끼워진 형태이므로, 계단실 폭 전체를 벽돌로 막고
       방풍실 폭(vestW)×높이(vH)만큼만 문 구멍으로 남긴다.
       (재질은 계단실 벽돌벽과 같은 fpBrickTexFor 텍스처를 쓰되, 큰 면적을
        확실히 가려야 하므로 옥탑방 벽돌 껍질처럼 불투명·깊이쓰기 메쉬로 만든다
        — 반투명 큐에 들어가면 그리는 순서에 따라 뒷벽이 비쳐 보인다.) */
    (function(){
      var fz=vZ1+0.02;                       // 유리 프레임(vZ1-0.06)보다 살짝 바깥
      /* 실사진 대조: 예전엔 문 구멍을 방풍실 전체 높이(vH=3.09)로 뚫어 둬서,
         밖에서 문 위를 올려다보면 방풍실 트랜섬 유리와 루버 천장이 그대로 보였다 —
         실제로는 문 위가 벽돌로 꽉 막혀 있다. 구멍을 문 높이만큼만 남기고
         그 위는 전부 벽돌로 채운다. */
      /* 문 위를 트랜섬(고정 유리)까지 '문 구멍'으로 뚫어 뒀더니,
         밖에서 돌아보면 문 위가 유리로 뚫려 보였다 — 그냥 벽돌로 채워 달라는
         요청이라 구멍을 문짝 윗선까지만 남기고 그 위는 전부 벽돌로 막는다.
         (방풍실 안쪽 트랜섬 유리는 그대로 두되, 이 벽돌면이 8cm 앞에서
          완전히 가리므로 밖에서는 보이지 않는다 — 같은 평면이 아니라
          깜빡임(z-fighting)도 생기지 않는다.) */
      var openH=exH+0.02;                    // 문 구멍 높이 — 문짝 윗선까지만
      var fx0=exX-sW/2, fx1=exX+sW/2;
      var ox0=exX-vestW/2, ox1=exX+vestW/2;
      function brickPanel(w, h, cx, cy){
        if(w<=0.02||h<=0.02) return;
        var m=new THREE.MeshBasicMaterial({map:fpBrickTexFor(w,h), side:THREE.DoubleSide,
          transparent:false, depthWrite:true});
        var ms=new THREE.Mesh(new THREE.PlaneGeometry(w,h), m);
        ms.renderOrder=-2;
        ms.position.set(cx, cy, fz); g.add(ms);
      }
      /* 파사드 높이를 계단실 벽(sH)보다 3m 더 올린다 — 밖에서 문 위를
         올려다볼 때 벽돌이 끝나고 그 위로 하늘판/빈 공간이 드러나던 것을 없앤다.
         (실제로도 이 문 위로는 건물이 계속 올라간다) */
      var facH=sH+3.0;
      brickPanel(ox0-fx0, facH, (fx0+ox0)/2, facH/2);      // 문 왼쪽
      brickPanel(fx1-ox1, facH, (ox1+fx1)/2, facH/2);      // 문 오른쪽
      brickPanel(vestW, facH-openH, exX, (openH+facH)/2);  // 문 위 인방(천장까지 꽉)

      /* 실사진 2·3 대조: 벽돌 면만 있어서 계단에서 돌아보면 양옆이
         휑했다 — 실제로는 ① 문 앞을 덮는 짙은 청록회색 금속 패널 처마(리브 줄눈 +
         매립 다운라이트), ② 벽 아래 밝은 콘크리트 걸레받이 띠, ③ 구석의 소화기가 있다. */
      /* 처마(와 그 위 벽돌)를 조금 더 앞으로 내밀어, 2구간 계단
         옆 벽면(z=P.zA1 — 계단참이 시작되는 선)과 딱 맞춘다. 예전엔 벽면에서
         1.55m만 나와 있어 그 앞이 어중간하게 비어 보였다. */
      var cz0=fz+0.02, cz1=Math.max(fz+1.55, P.zA1), cy=3.30, canW=Math.min(sW, vestW+5.0);
      var soff=fpMkPlane(canW, cz1-cz0, 0x51605C, 1);
      soff.rotation.x=Math.PI/2; soff.position.set(exX, cy, (cz0+cz1)/2); g.add(soff);
      for(var rz=cz0+0.20; rz<cz1-0.05; rz+=0.20){        // 금속 패널 리브(줄눈)
        var rib=fpMkPlane(canW, 0.02, 0x3A4643, 0.85);
        rib.rotation.x=Math.PI/2; rib.position.set(exX, cy-0.008, rz); g.add(rib);
      }
      var fascia=fpMkPlane(canW, 0.24, 0x5B6A66, 1);      // 처마 끝단(앞면 띠)
      fascia.position.set(exX, cy+0.12, cz1); g.add(fascia);
      /* 버그 수정: 처마(검은 판) 위가 파사드(z=fz)와 처마 앞면(z=cz1)
         사이로 벽 꼭대기까지 뻥 뚫린 빛우물이었다 — 문 밖에서 올려다보면 벽에
         네모난 구멍이 뚫려 그 속이 들여다보이는 것처럼 보였다("검은 판 위가
         뚫려 있다"). 처마 앞면 선에서 파사드 꼭대기까지를 벽돌로 막아, 처마가
         '벽에 붙은 차양'으로 읽히게 한다. (윗면은 v66에서 넣은 마감판이 덮는다) */
      (function(){
        /* 버그 수정: 이 벽돌면을 처마 끝단 띠(fascia: y cy~cy+0.24,
           같은 z=cz1)와 완전히 같은 평면에 겹쳐 놓아서, 겹치는 24cm 구간이
           서로 앞다투어 그려지며 깜빡였다(z-fighting) — 벽돌은 띠 위(cy+0.24)
           에서 시작하고, 평면도 4mm 앞으로 살짝 내밀어 겹침을 없앤다. */
        var upTop=sH+3.0, upBot=cy+0.24, upH=upTop-upBot;
        if(upH<=0.05) return;
        var bm=new THREE.MeshBasicMaterial({map:fpBrickTexFor(canW, upH), side:THREE.DoubleSide,
          transparent:false, depthWrite:true});
        var bms=new THREE.Mesh(new THREE.PlaneGeometry(canW, upH), bm);
        bms.renderOrder=-2; bms.position.set(exX, upBot+upH/2, cz1+0.004); g.add(bms);
        var canTop=fpMkPlane(canW, cz1-cz0, 0xB9B4A8, 1);   // 처마 윗면(콘크리트 톤)
        canTop.rotation.x=Math.PI/2; canTop.position.set(exX, cy+0.012, (cz0+cz1)/2); g.add(canTop);
      })();
      /* 처마에 달았던 매립 다운라이트 2개는 삭제한다. */
      var base=fpMkPlane(sW, 0.18, 0xB9B4A8, 1);          // 벽 하부 콘크리트 띠
      base.position.set(exX, 0.09, fz+0.02); g.add(base);
      /* 문 밖 구석 소화기는 삭제한다. */
    })();
  })();

  /* == 회의실 1·2 (기존 그대로 — 이번 요청은 방풍실·계단만 대상) == */
  (function(){
    var ROOM_D=3.0, frontZ=exZ-ROOM_D, doorW=1.05, doorH=2.16, glassH=2.45;
    var doorGap=4.5, gapW=0.2, cornerMargin=0.4;
    var blockStart=exX+exW/2+doorGap;
    var totalW=(zx1-cornerMargin)-blockStart;
    var roomW=(totalW-gapW)/2;

    (function(){
      var gx0=exX+exW/2, gx1=blockStart;
      if(gx1-gx0 <= 0.05) return;
      /* 실사진 대조: 나가는 문을 마주봤을 때 왼쪽(+X) — 문과 회의실 블록
         사이 구간은 예전엔 텅 빈 유리 파티션이라 허전했다. 실제로는 베이지 금속 패널로
         마감한 '각진 기둥+벽'이 서 있다(사진 2). 유리 대신 그 벽을 세운다. */
      var wz=gx1-gx0, wcx=(gx0+gx1)/2;
      var PANEL=0xD6D0C2, PANEL2=0xC9C2B2, JOINT=0x9A9486;
      var JOINT_Y=[0.95, 1.85, 2.55];
      // 1) 벽면(존 쪽을 바라보는 면) — 바닥부터 천장까지
      var pw0=fpMkPlane(wz, ZH, PANEL, 1, JOINT);
      pw0.rotation.y=Math.PI; pw0.position.set(wcx, ZH/2, exZ-0.02); g.add(pw0);
      // 2) 대형 금속 패널 줄눈(가로 3줄 + 세로 일정 간격)
      JOINT_Y.forEach(function(jy){
        var hl=fpMkPlane(wz, 0.02, JOINT, 0.75);
        hl.rotation.y=Math.PI; hl.position.set(wcx, jy, exZ-0.03); g.add(hl);
      });
      for(var jx=gx0+1.15; jx<gx1-0.15; jx+=1.15){
        var vl=fpMkPlane(0.02, ZH, JOINT, 0.55);
        vl.rotation.y=Math.PI; vl.position.set(jx, ZH/2, exZ-0.03); g.add(vl);
      }
      // 3) 문 쪽 끝의 살짝 튀어나온 기둥(사진의 각진 모서리) — 앞면 + 양옆면
      var pierW=Math.min(1.30, wz*0.55), pierD=0.34, pierX0=gx0, pierX1=gx0+pierW;
      var pfz=exZ-pierD;
      var pf=fpMkPlane(pierW, ZH, PANEL, 1, JOINT);
      pf.rotation.y=Math.PI; pf.position.set((pierX0+pierX1)/2, ZH/2, pfz); g.add(pf);
      JOINT_Y.forEach(function(jy){
        var hl2=fpMkPlane(pierW, 0.02, JOINT, 0.75);
        hl2.rotation.y=Math.PI; hl2.position.set((pierX0+pierX1)/2, jy, pfz-0.01); g.add(hl2);
      });
      [[pierX0, Math.PI/2],[pierX1, -Math.PI/2]].forEach(function(sd){
        var side=fpMkPlane(pierD, ZH, PANEL2, 1, JOINT);
        side.rotation.y=sd[1]; side.position.set(sd[0], ZH/2, exZ-pierD/2); g.add(side);
      });
      // 4) 기둥 앞 소화기(사진처럼 벽 앞 바닥에 하나)
      var fe=fpMakeExtinguisher();
      fe.position.set(gx1-0.55, 0, exZ-0.38); g.add(fe);
      // 5) 벽 아래 걸레받이 — 존 바닥 마감과 이어지게
      var skirt=fpMkPlane(wz, 0.10, 0x8A8577, 1);
      skirt.rotation.y=Math.PI; skirt.position.set(wcx, 0.05, exZ-0.035); g.add(skirt);
    })();

    var r1x0=blockStart, r1x1=r1x0+roomW;
    var r2x0=r1x1+gapW, r2x1=r2x0+roomW;

    function meetingRoomFrontEW(cx0, cx1, label){
      var wx=cx1-cx0;
      var dx0=cx0, dx1=cx0+doorW;
      var segs=[]; if(cx1>dx1+0.05) segs.push([dx1,cx1]);
      var panelMuls=[cx0,dx1,cx1];
      segs.forEach(function(sp){
        var segW=sp[1]-sp[0], panelN=Math.max(1,Math.round(segW/1.3)), panelW=segW/panelN;
        for(var pi=0; pi<panelN; pi++){
          var px0=sp[0]+panelW*pi, px1=px0+panelW, scx=(px0+px1)/2;
          var clear=fpMkPlane(panelW-0.04, glassH*0.62, 0xCDEAF5, 0.55);
          clear.rotation.y=Math.PI; clear.position.set(scx, ZH-0.9, frontZ); g.add(clear);
          var frost=fpMkPlane(panelW-0.04, glassH*0.38-0.04, 0xB9C0C4, 0.75);
          frost.rotation.y=Math.PI; frost.position.set(scx, glassH*0.19+0.02, frontZ); g.add(frost);
          if(pi>0) panelMuls.push(px0);
        }
      });
      panelMuls.forEach(function(bx){
        var mul=fpMkPlane(0.06, glassH, 0x14181D, 1);
        mul.rotation.y=Math.PI; mul.position.set(bx, glassH/2, frontZ-0.012); g.add(mul);
      });
      var topFrame=fpMkPlane(wx, 0.08, 0x14181D, 1);
      topFrame.rotation.y=Math.PI; topFrame.position.set((cx0+cx1)/2, glassH+0.02, frontZ-0.012); g.add(topFrame);
      var botFrame=fpMkPlane(wx, 0.06, 0x14181D, 1);
      botFrame.rotation.y=Math.PI; botFrame.position.set((cx0+cx1)/2, 0.03, frontZ-0.012); g.add(botFrame);
      var header=fpMkPlane(wx, Math.max(0.05,ZH-glassH-0.10), 0x14181D, 1);
      header.rotation.y=Math.PI; header.position.set((cx0+cx1)/2, (glassH+ZH-0.05)/2, frontZ-0.012); g.add(header);

      var door=fpMakeGate({w:doorW, h:doorH, dark:true, single:true});
      door.rotation.y=Math.PI; door.position.set((dx0+dx1)/2, 0, frontZ); g.add(door);
      var deco=fpMkTex(0.62,0.30,fpWallTextTex('KUNSAN NATIONAL UNIVERSITY','#EDEAE0'),0.85);
      deco.rotation.y=Math.PI; deco.position.set((dx0+dx1)/2, 1.20, frontZ-0.03); g.add(deco);

      var plq=fpMkTex(0.60,0.29,fpMeetingPlateTex(label),1);
      plq.rotation.y=Math.PI; plq.position.set(dx1+0.36, 1.62, frontZ-0.03); g.add(plq);

      /* 버그 수정: 의자를 테이블과 '같은 z(inZ)'에 놓아서 의자가 통째로
         테이블 안에 박혀 있었다(테이블 깊이 1.86m, 의자도 그 한가운데).
         테이블을 방 한가운데로 옮기고 깊이를 줄인 뒤, 의자를 테이블 앞뒤 양쪽에
         나눠 놓아 서로 마주보게 한다. */
      var inZ=frontZ+ROOM_D*0.50;                       // 테이블 = 방 한가운데
      var tblD=ROOM_D*0.34;                             // 테이블 깊이(≈1.0m)
      var tbl=fpMkBox(wx*0.55,0.05,tblD,0xC9C2B0,1,0x8A8270); tbl.position.set((cx0+cx1)/2,0.74,inZ); g.add(tbl);
      var chN=Math.max(2, Math.round(wx/1.15));
      var chZoff=tblD/2+0.32;                           // 테이블 가장자리에서 0.32m 띄운 의자 중심
      [-1,1].forEach(function(row){
        var czr=inZ+row*chZoff;
        for(var ci=0; ci<chN; ci++){
          var cx=cx0+wx*(0.18+ci*(0.64/Math.max(1,chN-1)));
          var chLeg=fpMkPipe(0.44,0.03,0x1B1E24,1); chLeg.position.set(cx,0.22,czr); g.add(chLeg);
          var chSeat=fpMkBox(0.42,0.05,0.42,0xB0293F,1); chSeat.position.set(cx,0.45,czr); g.add(chSeat);
          var chBack=fpMkBox(0.42,0.42,0.05,0x1B1E24,1);
          chBack.position.set(cx,0.66,czr+row*0.19); g.add(chBack);   // 등받이는 테이블 반대쪽 = 마주보게
        }
      });
      var liN=Math.max(3, Math.round(wx/1.3));
      for(var li=0; li<liN; li++){
        var lx=cx0+wx*(0.1+li*(0.8/(liN-1)));
        var lamp=fpMkDisc(0.05,0xFFEBC2,0.95);
        lamp.rotation.x=-Math.PI/2; lamp.position.set(lx,ZH-0.05,inZ); g.add(lamp);
      }
      [cx0,cx1].forEach(function(ex){
        var retD=ROOM_D;
        var ret=fpMkPlane(retD, ZH, 0xD9D2BF, 0.9);
        ret.rotation.y = (ex===cx1) ? -Math.PI/2 : Math.PI/2;
        ret.position.set(ex, ZH/2, frontZ+retD/2); g.add(ret);
      });
    }

    meetingRoomFrontEW(r1x0, r1x1, '회의실 2');
    meetingRoomFrontEW(r2x0, r2x1, '회의실 1');

    if(r2x0-r1x1>0.02){
      var div=fpMkPlane(ROOM_D, ZH, 0xB9C0C4, 0.6);
      div.rotation.y=Math.PI/2; div.position.set((r1x1+r2x0)/2, ZH/2, (frontZ+exZ)/2); g.add(div);
    }
  })();

  /* ── 3. 계단실 (바깥 문 0.9m 앞부터 시작, 폭 sW) : 화강석 5단 + 적벽돌 벽 ──
     sH은 위(방풍실 코드보다 앞)에서 이미 선언해 뒀다(값: 4.6). */
  var sfl=fpMkPlane(sW,P.zA1-exZ,0xC7C0AF,1); sfl.rotation.x=-Math.PI/2;
  sfl.position.set(exX,0.02,(exZ+P.zA1)/2); g.add(sfl);
  [-1,1].forEach(function(sn){
    var w=fpMkTex(P.zA1-exZ,sH,fpBrickTexFor(P.zA1-exZ,sH),1);
    w.rotation.y=Math.PI/2; w.position.set(exX+sn*sW/2,sH/2,(exZ+P.zA1)/2); g.add(w);
  });
  var slamp=fpMkPlane(sW*0.5,0.3,0xCFF4FF,0.5); slamp.rotation.x=Math.PI/2;
  slamp.position.set(exX,sH-0.03,(exZ+P.zA1)/2); g.add(slamp);
  for(var i1=0;i1<N1;i1++){
    var zC=P.zA0+RUN*(i1+0.5);
    var sp3=fpMkBox(sW-0.5,(i1+1)*RISE,RUN,0x5C5852,1,0x14120F);
    sp3.position.set(exX,(i1+1)*RISE/2,zC); g.add(sp3);
    /* 계단 입체감 정밀 교정: 디딤판 색을 밝게 올려(0x6C6863→0x9A9186)
       챌면(sp3, 어두운 톤)과의 명암 대비를 키워서 단 경계선이 또렷하게 보이게 한다. */
    var td3=fpMkPlane(sW-0.5,RUN*0.94,0x9A9186,0.98);
    td3.rotation.x=-Math.PI/2; td3.position.set(exX,(i1+1)*RISE+0.004,zC); g.add(td3);
    // 디딤판 앞쪽 모서리(코받이)에 더 밝은 얇은 선 하나 — 단 끝 경계가 더 선명해 보인다
    var nosing=fpMkPlane(sW-0.5,0.025,0xC9C2B4,1);
    nosing.rotation.x=-Math.PI/2;
    nosing.position.set(exX,(i1+1)*RISE+0.006,zC-RUN*0.94/2+0.012); g.add(nosing);
  }

  /* ── 4. 계단참(1구간 끝) : 화강암 바닥 + 정면·옆면 적벽돌 벽 ── */
  var land1=fpMkPlane(sW,FP_B1_EXIT_LAND_D,0x5C5852,1,0x14120F); land1.rotation.x=-Math.PI/2;
  land1.position.set(exX,h1+0.02,P.zMid); g.add(land1);
  var land1Cl=fpMkPlane(sW,FP_B1_EXIT_LAND_D,0xEDE7D8,1); land1Cl.rotation.x=Math.PI/2;
  land1Cl.position.set(exX,sH,P.zMid); g.add(land1Cl);
  var landSideW=fpMkTex(FP_B1_EXIT_LAND_D,sH,fpBrickTexFor(FP_B1_EXIT_LAND_D,sH),1);
  landSideW.rotation.y=Math.PI/2;
  landSideW.position.set(exX-dir*sW/2,sH/2,P.zMid); g.add(landSideW);
  // 계단참 정면(사진 속 벽돌 배경과 가장 직접 대응되는 벽) — 여기서 시야가 끝난다
  var land1Bk=fpMkTex(sW,sH,fpBrickTexFor(sW,sH),1);
  land1Bk.position.set(exX,sH/2,P.zA2); g.add(land1Bk);

  /* ── 열린 하늘/채광 느낌 ── 지금까지는 계단·계단참 위가 그냥
     장면 전체의 어두운 배경색(캄캄한 무한 허공)이라 실내 지하처럼 보였다.
     실제 사진처럼 "건물 사이 트인 마당"처럼 느껴지도록, 벽 위로 밝은 채광판을
     달아 위를 올려다보면 빛이 들어오는 것처럼 보이게 한다(실제 광원 추가 없이
     발광 메쉬만 사용 — 모바일 최적화 유지). */
  (function(){
    var skyY=sH+0.05, skyLen=(P.zA2-exZ)+1.0, skyCz=(exZ+P.zA2)/2;
    var sky=fpMkPlane(sW+1.0, skyLen, 0xCFE3EA, 0.9);
    sky.rotation.x=Math.PI/2; sky.position.set(exX, skyY, skyCz); g.add(sky);
    sky.material.blending=THREE.AdditiveBlending; sky.material.depthWrite=false;
    // 벽 위쪽 가장자리를 밝게 — 사진처럼 위층 창에서 빛이 새어 나오는 느낌
    [-1,1].forEach(function(sn){
      var glow=fpMkPlane(skyLen,0.5,0xFFF6E0,0.55);
      glow.rotation.y=Math.PI/2; glow.position.set(exX+sn*sW/2,sH-0.02,skyCz); g.add(glow);
    });
    /* 버그 수정: 이 채광판 위(벽 높이 sH ~ 파사드 높이 sH+3.0)는
       지금까지 아무것도 없는 빈 공간이었다. 채광판은 가산(additive) 블렌딩이라
       뒤가 비어 있으면 캄캄한 배경 위에 옅게 얹힌 '판때기'처럼 보이는데,
       문 밖에서 처마(검은 판) 위를 올려다보면 딱 그 모습이 보였다
       ("문 위 검은 판 위의 빈 공간"). 파사드가 벽보다 3m 더 높은 그만큼을
       벽돌로 둘러싸서, 위를 봐도 건물이 계속 올라가는 벽돌 벽으로 보이게 한다. */
    (function(){
      var upH=3.0, upY=sH+upH/2, upZ0=P.zDoorOut, upZ1=P.zA2, upLen=upZ1-upZ0;
      if(upLen<=0.1) return;
      [-1,1].forEach(function(sn){                       // 양옆 벽돌 벽
        var w=fpMkTex(upLen, upH, fpBrickTexFor(upLen, upH), 1);
        w.rotation.y=Math.PI/2;
        w.position.set(exX+sn*sW/2, upY, (upZ0+upZ1)/2); g.add(w);
      });
      var bk=fpMkTex(sW, upH, fpBrickTexFor(sW, upH), 1);   // 계단참 쪽 막음 벽
      bk.position.set(exX, upY, upZ1); g.add(bk);
      var cap=fpMkPlane(sW+0.1, upLen+0.1, 0x2B2F33, 1);    // 맨 위 마감(어두운 천장)
      cap.rotation.x=Math.PI/2; cap.position.set(exX, sH+upH, (upZ0+upZ1)/2); g.add(cap);
    })();
  })();

  /* ── 5. 우측(2구간) 나가는 통로 : 실사진(유리 지붕 계단 + 맨 위 유리문) 반영 ──
     계단참에서 90도 꺾어(dir 방향, X축으로) 실제로 오르는 계단(N2단)을 만들고,
     맨 위 작은 참을 거쳐 바깥으로 나가는 이중 유리문(고정)까지 이어진다.
     zonecorr 노드로 내비게이션 연결(계단 애니메이션 포함) 완료. */
  (function(){
    var CW=FP_B1_EXIT_LAND_D;
    var corZ0=P.zA1, corZ1=P.zA2;
    /* 좌우 반전: 실사진처럼 오른쪽이 적벽돌, 왼쪽이 검은 프레임
       다단 유리창이 되도록 두 변을 서로 바꿔 배정한다. */
    var glassSideZ=(dir>0)?corZ0:corZ1;   // 유리벽 쪽(왼쪽 — 야외 수목이 비치는 쪽)
    var brickSideZ=(dir>0)?corZ1:corZ0;   // 벽돌벽 쪽(오른쪽)
    /* 버그 수정: 안/밖 방향 오프셋을 dir 부호로 추측해서 계산했더니
       실제로는 반대 방향(안쪽/벽돌 쪽)으로 밀려서 초록 배경판이 벽돌벽과
       겹쳐 보이는 문제가 있었다 — zMid 기준으로 glassSideZ가 어느 쪽인지
       직접 비교해서 부호를 구한다(항상 정확함). */
    var glassOutSign = (glassSideZ > P.zMid) ? 1 : -1;   // 유리벽에서 바깥(수목) 방향
    var glassInSign = -glassOutSign;                      // 유리벽에서 통로 안쪽 방향
    var stairLen=Math.abs(P.xB1-P.xB0);
    if(stairLen<=0.05) return;
    var topLandLen=Math.abs(P.xB2-P.xB1);
    var corTopY=h1+N2*RISE;               // 2구간 다 오른 높이(맨 위 참)
    var frCol2=0x14181D;

    // 계단(2구간) — 1구간과 같은 톤·명암비로, X축 방향(dir)으로 오른다
    for(var i2=0;i2<N2;i2++){
      var xC=P.xB0+dir*RUN*(i2+0.5);
      var stepH=(i2+1)*RISE;
      var sp4=fpMkBox(RUN, stepH, CW, 0x5C5852,1,0x14120F);
      sp4.position.set(xC, h1+stepH/2, P.zMid); g.add(sp4);
      var td4=fpMkPlane(RUN*0.94, CW, 0x9A9186, 0.98);
      td4.rotation.x=-Math.PI/2;
      td4.position.set(xC, h1+stepH+0.004, P.zMid); g.add(td4);
      var nosing2=fpMkPlane(0.025, CW, 0xC9C2B4, 1);
      nosing2.rotation.x=-Math.PI/2;
      nosing2.position.set(xC-dir*(RUN*0.94/2-0.012), h1+stepH+0.006, P.zMid); g.add(nosing2);
    }

    /* 버그 수정: 이 벽들을 fpMkTex로 만들었는데 그 헬퍼는
       transparent+depthWrite:false+renderOrder:-1이라 깊이를 전혀 쓰지 않는다 —
       문 밖 숲 배경판(역시 fpMkTex)이 그리는 순서에 따라 벽돌벽을 뚫고 그려져서,
       2구간을 바라볼 때 왼쪽 벽에 초록 풍경 사각형이 뚫린 것처럼 보였다.
       깊이를 정상적으로 쓰는 불투명 메쉬로 만들어 확실히 가리게 한다. */
    function corBrickWall(w, h, cx, cy, cz, rotY){
      if(w<=0.02||h<=0.02) return null;
      var m=new THREE.MeshBasicMaterial({map:fpBrickTexFor(w,h), side:THREE.DoubleSide,
        transparent:false, depthWrite:true});
      var ms=new THREE.Mesh(new THREE.PlaneGeometry(w,h), m);
      ms.renderOrder=-2; if(rotY) ms.rotation.y=rotY;
      ms.position.set(cx, cy, cz); g.add(ms); return ms;
    }
    // 계단 옆 벽(양쪽 모두 적벽돌 — 원래 통유리였던 쪽도 벽돌로 교체)
    corBrickWall(stairLen, sH, (P.xB0+P.xB1)/2, sH/2, brickSideZ);
    corBrickWall(stairLen, sH, (P.xB0+P.xB1)/2, sH/2, glassSideZ);

    // 맨 위 참(계단 다 오른 뒤, 문 앞까지) — 화강암 바닥 + 벽 계속
    var topFl=fpMkPlane(topLandLen, CW, 0x5C5852, 1, 0x14120F);
    topFl.rotation.x=-Math.PI/2;
    topFl.position.set((P.xB1+P.xB2)/2, corTopY+0.02, P.zMid); g.add(topFl);
    /* 버그 수정: 여기서 sH(지붕 높이)에서 N2*RISE만 빼고 있었는데,
       실제로 이 참의 바닥(corTopY)은 1구간(h1)까지 이미 오른 높이라 h1만큼
       누락돼 있었다 — 그 결과 벽 윗변(corTopY+topWallH)이 지붕보다 h1만큼 더
       높이 튀어나와, 특히 유리벽(왼쪽) 쪽에서 지붕과 어긋난 틈처럼 보였다.
       corTopY(h1+N2*RISE) 전체를 빼야 벽 윗변이 지붕(sH) 높이에 정확히 닿는다. */
    var topWallH=Math.max(1.2, sH-corTopY);
    corBrickWall(topLandLen, topWallH, (P.xB1+P.xB2)/2, corTopY+topWallH/2, brickSideZ);
    corBrickWall(topLandLen, topWallH, (P.xB1+P.xB2)/2, corTopY+topWallH/2, glassSideZ);
    /* 맨 위 참 아래(참 바닥~계단 아래)도 같은 벽돌로 채워 틈이 생기지 않게 한다 */
    if(corTopY>0.05){
      corBrickWall(topLandLen, corTopY, (P.xB1+P.xB2)/2, corTopY/2, brickSideZ);
      corBrickWall(topLandLen, corTopY, (P.xB1+P.xB2)/2, corTopY/2, glassSideZ);
    }

    /* 버그 수정: 통로를 밝히려고 여기에 '가산혼합 발광판(corFill)'을
       통로 한가운데 눈높이 근처(y=sH*0.55)에 수평으로 눕혀 뒀는데, 계단에서
       옆 벽을 보면 그 판의 아랫면이 벽 위에 겹쳐 그려지면서 경계가 칼같이
       선 밝은 쐐기꼴 띠가 생겼다 — 벽에 구멍이 뚫려 그 너머 밝은 벽돌이
       보이는 것처럼 읽혔다("두번째 계단 오른쪽이 뚫려").
       (게다가 옆벽·계단 벽돌은 MeshBasic이라 조명을 안 받는데, 이 판만
        가산으로 얹히니 유독 그 부분만 밝아졌다.)
       면을 없애고, 같은 밝기 보정을 실제 광원(PointLight) 세 개로 대신한다 —
       광원은 면이 아니므로 경계선 자체가 생기지 않는다. */
    [0.18, 0.5, 0.82].forEach(function(ct){
      var corLite=new THREE.PointLight(0xE6F6F3, 0.40, 18);
      corLite.position.set(P.xB0+(P.xB2-P.xB0)*ct, sH*0.78, P.zMid);
      g.add(corLite);
    });

    /* 청록 유리 지붕(사선) + 검은 트러스 — 계단 구간+맨 위 참을 하나로 이어
       붙이되, 완전 수평 대신 벽돌 쪽이 살짝 더 높은 사선(외쪽매)
       지붕으로 살짝 기울여 실사진의 각진 느낌을 살린다. */
    /* 지붕을 사선(외쪽매)으로 살짝 기울여 뒀는데, 계단을 다 올라
       문을 정면으로 보면 지붕선이 삐뚤어져 보였다 — 완전히 평평하게 되돌린다. */
    var roofY=sH+0.02, roofTilt=0;
    var roof=new THREE.Mesh(new THREE.PlaneGeometry(stairLen+topLandLen, CW+0.6),
      new THREE.MeshBasicMaterial({color:0x4FC0C6, transparent:true, opacity:0.45, side:THREE.DoubleSide}));
    roof.rotation.x=Math.PI/2+roofTilt; roof.position.set((P.xB0+P.xB2)/2, roofY, P.zMid); g.add(roof);
    var trussN=Math.max(2, Math.round((stairLen+topLandLen)/1.3));
    for(var ti=0; ti<=trussN; ti++){
      var tx=P.xB0+(P.xB2-P.xB0)*(ti/trussN);
      var truss=fpMkBox(0.07, 0.14, CW, frCol2, 1, 0x000000);
      truss.rotation.x=roofTilt;
      truss.position.set(tx, roofY+0.06, P.zMid); g.add(truss);
    }

    /* 맨 위 이중 유리문(고정, 닫힌 채) — 실사진 반영. exFrameBar/exGlassPane는
       위(나가는 문) 코드에서 이미 만들어 둔 함수를 그대로 재사용한다.
       근본 수정: 문의 모든 y좌표가 바닥을 0(지상)으로 가정하고 있었는데,
       이 참의 실제 바닥은 corTopY(1구간+2구간을 다 오른 높이)만큼 떠 있다 —
       그래서 문 전체가 눈에 보이는 바닥보다 한참 아래(땅속)에 지어져, 정면에서
       보면 문이 아예 없이 뻥 뚫려 바깥 숲만 보이는 것처럼 보였다. corTopY를
       바닥 기준으로 더해 실제 참 바닥 위에 서도록 맞춘다. */
    var doorX=P.xB2, doorW=2.2, doorH=exH, doorRotY=(dir>0)?-Math.PI/2:Math.PI/2;
    [-1,1].forEach(function(sd){
      var gp=exGlassPane(doorW/2-0.02, doorH);
      gp.rotation.y=doorRotY;
      gp.position.set(doorX, corTopY+doorH/2, P.zMid+sd*doorW/4); g.add(gp);
      /* 손잡이를 다시 단다. 예전엔 새까맣고 얇은 봉이 유리 한복판에
         떠 있어 '풍경 속 검은 막대'로 보였다 — 실제 유리문처럼 가운데 문설주
         바로 옆에 붙는 스테인리스 세로 손잡이(브래킷 2개 포함)로 만들어,
         문에 붙어 있는 손잡이로 읽히게 한다. */
      var hz=P.zMid+sd*0.20, hy=corTopY+doorH*0.46;
      var hbar=fpMkBox(0.05, 0.90, 0.05, 0xC9D0D6, 1);
      hbar.position.set(doorX-dir*0.075, hy, hz); g.add(hbar);
      [-1,1].forEach(function(bs){
        var hbr=fpMkBox(0.075, 0.042, 0.042, 0xAEB6BC, 1);
        hbr.position.set(doorX-dir*0.038, hy+bs*0.40, hz); g.add(hbr);
      });
    });
    // 문 중앙 가로 엠보 띠(KSNU 로고 + 군산 텍스트)는 삭제한다.
    var vMid=exFrameBar(EXFR_D, doorH, 0.10); vMid.rotation.y=doorRotY;
    vMid.position.set(doorX, corTopY+doorH/2, P.zMid); g.add(vMid);
    [-1,1].forEach(function(sd){
      var vSide=exFrameBar(EXFR_D, doorH, 0.10); vSide.rotation.y=doorRotY;
      vSide.position.set(doorX, corTopY+doorH/2, P.zMid+sd*doorW/2); g.add(vSide);
    });
    var hTop=exFrameBar(doorW, EXFR_D, 0.10); hTop.rotation.y=doorRotY;
    hTop.position.set(doorX, corTopY+doorH, P.zMid); g.add(hTop);
    /* 버그 수정: 트랜섬을 지붕 바로 밑까지 늘렸더니, 그만큼
       숲 배경판도 같이 높아져서 1구간 계단실 저 멀리·다른 각도에서 다시
       벽 틈으로 새어 보이는 문제가 되살아났다("살짝 깨져 보인다"는 창문
       모양 얼룩) — 트랜섬 유리 높이는 원래의 안전한 값(roofY-0.05)으로
       되돌리고, 그 위 남는 좁은 틈(문틀 위~지붕)은 아래 오파크(불투명)
       상인방 띠로 막아서, 숲 배경판 크기는 그대로 유지한 채 "위쪽이 잘려
       보이는" 문제만 따로 해결한다. */
    /* 버그 수정: 문 위 트랜섬을 '고정 유리'로 두었는데, 그 유리는
       바깥 숲 배경판(지붕선 아래로 낮춰 둔 상태)보다 위에 있어서 유리 너머가
       아무것도 없는 캄캄한 배경으로 보였다 — 계단을 다 올라 문을 보면 문 위가
       검은 띠로 나오던 원인이다. 유리 대신 양옆 끝벽과 같은 벽돌 인방으로
       채워, 문 위가 벽으로 자연스럽게 이어지게 한다. */
    var transomH=0;
    (function(){
      var lintelH=roofY-(corTopY+doorH);
      if(lintelH<=0.02) return;
      corBrickWall(doorW+0.06, lintelH, doorX, corTopY+doorH+lintelH/2, P.zMid, doorRotY);
    })();
    /* 버그 수정: 트랜섬 유리 맨 위(roofY-0.05)와 지붕(roofY) 사이에
       남는 좁은 틈을 불투명한 상인방(헤더) 띠로 막는다 — 실제 건물에서도
       유리문 위 꼭대기는 보통 이런 마감 프레임으로 끝나므로 자연스럽다.
       숲 배경판을 다시 늘리지 않고도 "위쪽이 잘린 것 같다"는 인상을 없앤다. */
    /* 문(폭 doorW) 양옆이 뻥 뚫려 바깥 숲이 그대로 보였다 —
       통로 폭(CW) 중 문을 뺀 좌우를 벽돌로 막는다(문 앞 끝벽). */
    (function(){
      var sideW=(CW-doorW)/2;
      if(sideW<=0.03) return;
      var endH=roofY-corTopY;
      [-1,1].forEach(function(sd){
        corBrickWall(sideW, endH, doorX, corTopY+endH/2,
                     P.zMid+sd*(doorW/2+sideW/2), doorRotY);
      });
    })();
    /* 위 벽돌 인방이 문 위 전체를 덮으므로, 예전에 틈막이로 넣었던
       짙은 회색 헤더 띠는 없앤다(그 띠도 '문 위 검은 부분'의 일부였다). */

    /* 정면 유리문·좌측 유리 파티션 너머로 울창한 초록 야외 숲이
       비치도록, 로우폴리 나무 대신 부드러운 캔버스 숲 배경판 하나로 대체한다. */
    (function(){
      var outCx=doorX+dir*2.6, groundY=corTopY;
      /* 버그 수정: 숲 배경판 높이를 6.5m로 크게 잡아서, 위쪽이
         지붕(roofY≈sH+0.02)보다 1.8m 넘게 더 올라가 있었다 — 1구간 계단실은
         지붕 대신 뚫린 "하늘" 표현(가산혼합 발광판)만 있어서 실제로 아무것도
         막아 주지 않다 보니, 이 판 위쪽 튀어나온 부분이 계단실 저 뒤쪽 먼
         곳·다른 각도에서 벽 위로 삐죽 보여 벽돌 틈에 초록 얼룩처럼 비쳤다
         (요청하신 "가까이서는 괜찮은데 멀리서 이상하게 보인다" 버그의 원인).
         판 높이를 지붕선 아래로 낮추고 중심도 문 높이에 맞춰 내려서,
         문 앞에서 보는 모습은 그대로 유지하되 지붕 위로는 튀어나오지
         않게 한다. */
      /* 배경판 크기 : 문에서 1.3m 뒤에 있으므로, 문 앞에 서서 봤을 때 유리 전체가
         풍경으로 꽉 차려면 문 폭·높이보다 2배 이상 커야 한다(원근 보정).
         옆벽·끝벽이 불투명 메쉬라 이만큼 키워도 벽 밖으로는 새지 않는다. */
      /* 버그 수정: 배경판이 문에서 2.6m나 뒤에 있어서, 문 앞에 서면
         원근 때문에 유리 가운데 일부만 풍경으로 차고 가장자리는 캄캄하게
         비었다. 그렇다고 판을 키우면 지붕(반투명 유리라 뒤가 비친다) 위로
         삐져나와 멀리서 초록 얼룩으로 보이는 예전 버그가 되살아난다.
         → 판을 문 바로 뒤(0.35m)로 당긴다. 이러면 문에 가장 가까이 설 수 있는
           자리(문에서 0.55m)에서 유리 네 모서리를 잇는 시선이 판 안쪽에
           들어오므로, 판 높이를 지붕선 아래로 유지한 채 유리 전체가 풍경으로
           꽉 찬다(계산: 위 6.31m < 지붕 6.42m, 폭 3.6m < 판 5.0m). */
      var outCxN=doorX+dir*0.35;
      var fgTop=roofY-0.03, fgBot=groundY-1.35, fgH=fgTop-fgBot, fgCy=(fgTop+fgBot)/2;
      var frontForest=fpMkTex(5.0, fgH, fpForestBackdropTex(), 0.95);
      frontForest.rotation.y=doorRotY;
      frontForest.position.set(outCxN, fgCy, P.zMid);
      g.add(frontForest);
      /* 버그 수정: 위에서 바닥판까지 같이 넓혔더니, 안쪽 복도
         바닥과 다른 높이/각도로 겹치면서 초록 바닥이 실내에 붕 떠 있는
         것처럼 보였다 — 숲 배경 이미지 자체로 바깥 느낌은 충분하므로
         이 바닥판은 아예 지운다. */
    })();

  })();

  return g;
}
/* 엘리베이터에서 내리면 정면(복도 건너편)에 있는 큰 빈 공간.
   지금까지는 밋밋한 벽으로 막혀 있어서 '여기가 뚫린 공간'이라는 게 안 보였다.
   2층만 책상·의자를 놓아 쉼터로 꾸민다. */
function fpMakeOpenArea(lv, zc, span, ko, lounge){
  var g=new THREE.Group();
  var x0=-FP_WALL_X, D=FP_OPEN_D, OH=2.86;   // 안쪽 깊이 / 천장 높이
  var hw=span/2, xb=x0-D;
  /* 사진처럼 창으로 빛이 가득 들어오는 공간이라 복도보다 밝다 */
  var fl=fpMkPlane(D,span,(lv===2)?0xB9AE97:0x5A6779,1); fl.rotation.x=-Math.PI/2;
  fl.position.set(x0-D/2,0.02,zc); g.add(fl);
  var cl=fpMkPlane(D,span,0x2A3442,1); cl.rotation.x=Math.PI/2;
  cl.position.set(x0-D/2,OH,zc); g.add(cl);
  /* 2층은 사진처럼 왼쪽 벽이 크림색, 오른쪽 벽은 짙은 회색(게시판이 붙는 벽)이다 */
  [-1,1].forEach(function(sn){
    /* 옥탑방·비상계단 옥탑방·크리에이티브존 내부를 뺀 모든 벽지를
       크림색으로 통일한다 — 게시판이 붙는 쪽도 포함해서 양쪽 다 크림색. */
    var wc2=0xE8DFC8, we2=0x9C8F6E;
    var w=fpMkPlane(D,OH,wc2,1,we2);
    w.rotation.y=(sn<0)?0:Math.PI; w.position.set(x0-D/2,OH/2,zc+sn*hw); g.add(w);
  });
  /* 2층은 사진처럼 정면 벽이 연두색으로 칠해져 있다 */
  var bwC=0xB8B2A4, bwE=0x2B2A24;   // 정면은 콘크리트색
  var bw=fpMkPlane(span,OH,bwC,1,bwE);
  bw.rotation.y=Math.PI/2; bw.position.set(xb,OH/2,zc); g.add(bw);
  /* 천장 형광등 : 사진처럼 가로·세로로 껴서 박힌 판형 등 */
  for(var lr=-1; lr<=1; lr++){
    for(var lc=0; lc<3; lc++){
      var ln=fpMkPlane(1.15,0.34,0xE8FBFF,0.55); ln.rotation.x=Math.PI/2;
      ln.position.set(x0-1.3-lc*1.9, OH-0.03, zc+lr*span*0.24); g.add(ln);
    }
  }
  /* 안쪽 벽(정면) : 사진처럼 가로로 긴 창틀 — 엘리베이터에서 내리면
     정면으로 밖이 환하게 보인다. (예전에는 여기에 층 안내판이 붙어 있었다) */
  /* 사진을 보면 창은 백벽 전체가 아니라 왼쪽(사물함 쪽) 절반젠만 차있고
     오른쪽은 민 백벽이다 */
  var winW=Math.min(span*0.76, 9.4), sillY=0.92, winH=1.62;
  var zw=zc+hw-0.70-winW/2;              // 창의 가운데(왼쪽으로 치우쳐 있다)
  var DEP=0.20;                       // 벽 두께 — 유리가 이만큼 안으로 들어가 있다
  var xg=xb+0.02, xf=xb+DEP;          // 유리면 / 창틀 바깥면
  /* 창 아래 난간(사진의 콘크리트 턱) — 윈도우실이 두께를 갖게 해준다 */
  var par=fpMkBox(DEP+0.05, sillY, winW+0.42, 0x8E9AA6, 1);
  par.position.set(xb+(DEP+0.05)/2, sillY/2, zw); g.add(par);
  var pcap=fpMkBox(DEP+0.09, 0.05, winW+0.46, 0xB6C1C9, 1);   // 창털(윈도우 보드)
  pcap.position.set(xb+(DEP+0.09)/2, sillY+0.025, zw); g.add(pcap);
  /* 바깥 풍경 — 벽에서 DEP 만큼 안쪽에 두어서 진짜 창처럼 깊이감이 생긴다 */
  var out=fpMkTex(winW, winH, fpOutsideTex(), 1);
  out.rotation.y=Math.PI/2; out.position.set(xg, sillY+winH/2, zw); g.add(out);
  /* 창질(reveal) : 위·양옆 안쪽 면 — 이게 있어야 벽에 뚫린 창으로 보인다 */
  var rvT=fpMkPlane(DEP, winW, 0xC3CDD5, 1);
  rvT.rotation.x=Math.PI/2; rvT.position.set(xb+DEP/2, sillY+winH, zw); g.add(rvT);
  [-1,1].forEach(function(sn){
    var rv=fpMkPlane(DEP, winH, 0xB2BDC6, 1);
    rv.position.set(xb+DEP/2, sillY+winH/2, zw+sn*winW/2); g.add(rv);
  });
  /* 알루미늄 창틀 : 바깥면에 네 변 테두리 + 가로바 + 세로 창살 */
  var FRM=0xE4EBF0, FRD=0xAFBAC3;
  function hbar(len, th, y){
    var b=fpMkPlane(len, th, FRM, 1);
    b.rotation.y=Math.PI/2; b.position.set(xf, y, zw); g.add(b);
  }
  hbar(winW+0.24, 0.11, sillY-0.03);
  hbar(winW+0.24, 0.11, sillY+winH+0.03);
  hbar(winW, 0.06, sillY+winH*0.70);                 // 가로 창살(사진처럼 위에 작은 칸)
  [-1,1].forEach(function(sn){
    var v=fpMkPlane(0.11, winH+0.22, FRM, 1);
    v.rotation.y=Math.PI/2; v.position.set(xf, sillY+winH/2, zw+sn*(winW/2+0.065)); g.add(v);
  });
  var nMul=Math.max(4, Math.round(winW/1.5));
  for(var mi=1; mi<nMul; mi++){
    var mz=zw-winW/2+winW*mi/nMul;
    var mb=fpMkPlane(0.075, winH, FRM, 1);
    mb.rotation.y=Math.PI/2; mb.position.set(xf, sillY+winH/2, mz); g.add(mb);
    var ms=fpMkPlane(0.028, winH, FRD, 1);           // 창살 그림자
    ms.rotation.y=Math.PI/2; ms.position.set(xf-0.006, sillY+winH/2, mz+0.05); g.add(ms);
  }
  /* 창으로 들어온 햇빛이 바닥에 길게 누워 있다 */
  var spill=fpMkPlane(3.0, winW*0.9, 0xCFE4F5, 0.17);
  spill.rotation.x=-Math.PI/2; spill.position.set(xb+1.45, 0.07, zw); g.add(spill);
  /* ── 층마다 실제 사진과 같은 집기 배치 ──
     엘리베이터에서 나와 정면(-X)을 볼 때 : 오른쪽 벽 = -Z, 왼쪽 벽 = +Z */
  var zR=zc-hw, zL=zc+hw;
  /* 삭제: 창 오른쪽에 붙여 뒀던 작은 액자형 안내판(회색 판 두 장)을
     없앤다 — 실제 좌표가 창틀 가장자리(zw-winW/2)와 거의 겹쳐서, 엘리베이터에서
     내려 정면을 보면 창문 위에 정체불명의 회색 사각형이 반쯤 떠 있는 것처럼
     보였다(2~5층 전 층 공통 — 이 함수 하나가 모든 층의 '엘리베이터 정면'을
     만든다). */
  function place(obj, x, z, faceRight){
    obj.rotation.y = faceRight ? 0 : Math.PI;   // 오른쪽 벽은 +Z 를, 왼쪽 벽은 -Z 를 바라본다
    obj.position.set(x, 0, z); g.add(obj);
  }
  if(lv===2){
    /* ── 2층 : 실제 사진 그대로 ──
       창에는 블라인드, 창 밑에 긴 상담과 바퀴의자,
       왼쪽 벽에 나무 칸장, 오른쪽 짙은 벽에 큰 게시판,
       가운데에 '정숙' 판이 올려진 나무 선반. */
    /* 블라인드 : 창 안쪽에 가로줄로 내려서 밖이 절반쯤 가려 보인다 */
    var blH=winH*0.66;
    var bl=fpMkPlane(winW-0.06, blH, 0xE4DFD0, 0.96);
    bl.rotation.y=Math.PI/2; bl.position.set(xf-0.05, sillY+winH-blH/2, zw); g.add(bl);
    for(var bi=0; bi<11; bi++){
      var sl=fpMkPlane(winW-0.06, 0.018, 0xB7B0A0, 0.95);
      sl.rotation.y=Math.PI/2;
      sl.position.set(xf-0.06, sillY+winH-blH+blH*(bi+0.5)/11, zw); g.add(sl);
    }
    /* 창 밑 긴 상담 + 바퀴의자 */
    var cnt=fpMkBox(0.62, 0.05, winW*0.86, 0xA8896A, 1);
    cnt.position.set(xb+0.42, 0.74, zw); g.add(cnt);
    var cntF=fpMkBox(0.58, 0.70, winW*0.86, 0x8E9AA6, 1);
    cntF.position.set(xb+0.42, 0.36, zw); g.add(cntF);
    for(var ci2=-1; ci2<=1; ci2++){
      var chz=zw+ci2*1.9;
      var seat=fpMkBox(0.52,0.09,0.52,0x2F3B46,1); seat.position.set(xb+1.20,0.46,chz); g.add(seat);
      var bk=fpMkBox(0.10,0.52,0.50,0x2F3B46,1);   bk.position.set(xb+1.44,0.76,chz); g.add(bk);
      var pole=fpMkBox(0.07,0.42,0.07,0x9AA3A8,1); pole.position.set(xb+1.20,0.21,chz); g.add(pole);
      var base=fpMkBox(0.46,0.05,0.46,0x4A5058,1); base.position.set(xb+1.20,0.03,chz); g.add(base);
    }
    /* 왼쪽 벽 : 나무 칸장(사진의 부분별 서가) */
    var shX=xb+1.9, shZ=zL-0.24, shW=3.2, shH=2.10;
    var shB=fpMkBox(shW, shH, 0.46, 0x8A6A46, 1); shB.position.set(shX, shH/2, shZ); g.add(shB);
    for(var sc=0; sc<5; sc++){
      for(var sr=0; sr<4; sr++){
        var cell=fpMkPlane(shW/5-0.10, shH/4-0.10, 0x3D2E1E, 1);
        cell.rotation.y=Math.PI;
        cell.position.set(shX-shW/2+(shW/5)*(sc+0.5), (shH/4)*(sr+0.5), shZ-0.24); g.add(cell);
      }
    }
    /* 오른쪽 짙은 벽 : 큰 게시판(나무틀 + 녹색 면 + 종이들) */
    var nbX=xb+2.9, nbZ=zR+0.06;
    var nbF=fpMkPlane(4.2, 1.62, 0x6B4A2C, 1);
    nbF.position.set(nbX, 1.58, nbZ+0.02); g.add(nbF);
    var nbS=fpMkPlane(4.0, 1.44, 0x3E6B52, 1);
    nbS.position.set(nbX, 1.58, nbZ+0.04); g.add(nbS);
    for(var pi2=0; pi2<8; pi2++){
      var pw=0.34+((pi2*7)%3)*0.05, ph2=0.46+((pi2*5)%3)*0.06;
      var pp=fpMkPlane(pw, ph2, 0xF4F6F2, 1);
      pp.position.set(nbX-1.72+pi2*0.46, 1.58+(((pi2%2)?-1:1)*0.12), nbZ+0.06); g.add(pp);
    }
    var swp=fpMkPlane(0.24,0.16,0xEDEFEA,1); swp.position.set(nbX+2.5,1.30,nbZ+0.04); g.add(swp);
    /* 가운데 나무 선반 + 파란 '정숙' 판 */
    /* 선반이 방 한가운데를 막아 창이 안 보여서, 사진처럼 오른쪽으로 비켜 놓는다 */
    var mfX=x0-3.4, mfZ=zc-hw*0.42, mfW=2.6, mfH=1.20;
    var mf=fpMkBox(0.42, mfH, mfW, 0xA98A62, 1); mf.position.set(mfX, mfH/2, mfZ); g.add(mf);
    for(var mc=0; mc<3; mc++){
      for(var mr=0; mr<3; mr++){
        var mcell=fpMkPlane(mfW/3-0.12, mfH/3-0.10, 0x2F2419, 1);
        mcell.rotation.y=-Math.PI/2;
        mcell.position.set(mfX-0.22, (mfH/3)*(mr+0.5), mfZ-mfW/2+(mfW/3)*(mc+0.5)); g.add(mcell);
      }
    }
    var sgn=fpMkPlane(1.9, 0.52, 0x1B3A8C, 1);
    sgn.rotation.y=-Math.PI/2; sgn.position.set(mfX-0.24, mfH+0.30, mfZ); g.add(sgn);
    var sgt=fpMkTex(1.7, 0.34, fpWallTextTex(ko?'정 숙 · 연구실 앞':'QUIET PLEASE','#FFFFFF'),1);
    sgt.rotation.y=-Math.PI/2; sgt.position.set(mfX-0.26, mfH+0.30, mfZ); g.add(sgt);
  }else if(lv===3){
    /* 3층 : 오른쪽 벽에 사물함, 왼쪽 벽 안쪽(창쪽)에 빨간 자판기 */
    place(fpMakeLockers(3.4), xb+2.3, zR+0.06, true);
    place(fpMakeVending(),    xb+0.95, zL-0.10, false);
    /* 정수기·알림판을 치우고, 그 자리에 큰 흰색 보드판을 달았다 */
    var wbF=fpMkPlane(2.60, 1.35, 0xB6BEC6, 1);
    wbF.rotation.y=Math.PI; wbF.position.set(x0-2.10, 1.52, zL-0.05); g.add(wbF);
    var wbS=fpMkPlane(2.48, 1.24, 0xF7FAFC, 1);
    wbS.rotation.y=Math.PI; wbS.position.set(x0-2.10, 1.52, zL-0.07); g.add(wbS);
    var wbT=fpMkPlane(2.48, 0.10, 0x8E9AA6, 1);   // 필기구 받침대
    wbT.rotation.y=Math.PI; wbT.position.set(x0-2.10, 0.86, zL-0.09); g.add(wbT);
  }else if(lv===4){
    /* 4층 : 왼쪽 벽에 사물함.
       (화분 세 개는 엘리베이터에서 내리면 정면에 바로 보여서 치웠다 —) */
    /* 사물함을 정수기·알림판이 있던 복도 쪽 끝으로 옮겼다 */
    place(fpMakeLockers(3.4), x0-2.10, zL-0.10, false);
  }else if(lv===5){
    /* 5층 : 왼쪽 벽에 사물함만 */
    /* 5층 : 왼쪽 벽에 긴 사물함 한 줄, 오른쪽 벽에 목재 수납장과 흰 캐비닛,
       창 밑에 회색 소파 — 실제 사진 그대로 */
    /* 창 밑 소파·오른쪽 수납장과 캐비닛·정수기·알림판을 모두 치워
       왼쪽 벽의 긴 사물함 한 줄만 남긴다 */
    place(fpMakeLockers(5.0), x0-3.4, zL-0.10, false);
  }
  return g;
}
/* 한 층치 복도(양쪽 벽 + 문 + 표지판). 로컬 y=0 이 그 층 바닥면. */
/* ── 옥상 ──
   바깥이므로 복도가 아니라 넘은 바닥 + 난간 + 옥탑방 구조다.
   올라오는 길은 중앙계단·비상계단 둘뿐이라, 그 자리에 철문 달린 옥탑방을 세운다. */
var fpRoofDoorL=null, fpRoofDoorR=null, fpRoofDoorK=0;   // 옥상 철문(0=닫힘, 1=활짝 열림)
/* 옥상 철문을 실제로 열고 나가는 기능을 다시 활성화한다.
   문을 실제로 연 적이 있을 때만(fpRoofChoice(true) 완료 후) true — 이 값이
   true일 때만 fpBuildRooms('R')가 문 밖 데크를 걸을 수 있는 방으로 등록한다. */
var fpRoofDoorOpened=false;
/* 중앙계단·비상계단 옥탑방마다 문이 따로 있다(fpMakeHeadhouse가 두 번 불린다).
   예전엔 fpRoofDoorL/R를 한 쌍만 두어 나중에 지은 쪽(비상계단) 문짝으로 덮어써져서,
   중앙계단으로 올라갈 땐 정작 눈앞의 문이 안 열리는 문제가 있었다.
   → 지어지는 문짝을 전부 배열에 모아 두고, 열고 닫을 때 전부 같이 돌린다. */
var fpRoofDoorLs=[], fpRoofDoorRs=[];
/* 옥탑방(중앙계단쪽) 문의 실제 x좌표 — fpMakeHeadhouse 호출 때 cx0=FP_WALL_X-2.30을
   그대로 쓰므로(fx=cx0-0.03) 여기서도 같은 식으로 계산해 항상 일치시킨다.
   예전엔 문 앞에 서는 자리·나가서 서는 자리가 이 값과 안 맞아서, 실제로는 문이
   아니라 벽돌 벽 속에 서 있는 것처럼 보였다. */
var FP_ROOF_DOOR_X = FP_WALL_X - 2.30 - 0.03;
var FP_ROOF_OUT = FP_ROOF_DOOR_X - 0.65;      // 옥탑방 문을 나서면 서는 자리(옥상 바닥)
/* 옥상 철문 앞 점자블록의 실제 (x,z) — fpMakeHeadhouse가 중앙계단 옥탑방을
   지을 때 채워 넣는다. 옥상 도착 시 여기까지 걸어가 멈추게 하는 데 쓴다. */
var FP_ROOF_LANDING = null;
