"use strict";
/* roadview-1f.js — 1인칭 로드뷰 — 1층 출입문 · 후문 곁가지 · 1층 중앙계단 홀
   (예전 한 파일 main.js 의 5142~5792줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
/* 실제 출입문(정문·동문·서문) — 알루미늄 프레임 + 청록 유리 2짝 + 세로 손잡이.
   로컬 +Z 가 실내(복도) 쪽을 향한다. */
function fpMakeGate(o){
  var g=new THREE.Group();
  var w=o.w||3.3, h=o.h||2.24, fw=0.09;
  var AL=0xC6D6DE, GL=0x2C5E64;   // 유리(발광 없는 단순 색 — 정문·동문·서문 모두 동일)
  /* o.single : 입구가 하나뿐인 외짝 문(예: 지하 벽 장식문). 기본은 예전처럼 양쪽으로
     열리는 두 짝 문. 외짝일 때는 문틀 안을 통짝 유리 한 장으로 채운다. */
  var leaves = o.single ? [0] : [-1,1];
  var pw = o.single ? (w-fw*2) : (w-fw*3)/2;
  leaves.forEach(function(sn){
    /* 문에 다가가면 자동으로 열리도록, 유리(gp)·손잡이(hd)·하부레일(kb)·반사선(rf)을
       경첩(pivot) 안에 담는다. 경첩은 손잡이 반대쪽인 바깥 프레임 쪽에 두고
       (양짝 문이면 좌우로 대칭 벌어지게 서로 반대 방향으로 회전),
       외짝 문은 왼쪽 가장자리를 경첩으로 삼는다. */
    var hingeX = (sn===0) ? -pw/2 : sn*(pw+fw/2);
    var leafGrp=new THREE.Group();
    var pivot=new THREE.Group();
    pivot.position.set(hingeX,0,0);
    leafGrp.position.set(-hingeX,0,0);
    pivot.add(leafGrp);
    var gp=fpMkPlane(pw, h-fw*2, GL, 0.55);      // 발광 없음 — 문에서 빛이 새지 않게
    gp.position.set(sn*(pw/2+fw/2), h/2, 0.012); leafGrp.add(gp);
    /* 왼쪽 문만 안쪽이 안 보이는 문제 — 원인은 문 유리(gp)가
       depthWrite:true(fpMkPlane 기본값)라서, 문 주변에 겹겹이 쌓인 다른 반투명
       유리·필름(코너 리턴, 흰 필름 띠, 트랜섬 등)과의 앞뒤 정렬이 카메라 각도에
       따라 뒤집혀 한쪽 문짝만 불투명하게 보이는 순서로 그려지곤 했다.
       문 유리는 depthWrite를 꺼서 항상 뒤 배경이 비치도록 고정한다. */
    gp.material.depthWrite=false; gp.renderOrder=-1;
    gp.material.opacity=0.42;   // 사진처럼 안쪽이 잘 비치도록 살짝 더 투명하게
    var hd=fpMkPlane(0.06, 0.78, 0xE8813C, 0.97);          // 세로 손잡이(주황 봉)
    hd.position.set(o.single ? (pw/2-0.17) : sn*(fw/2+0.17), h*0.47, 0.05); leafGrp.add(hd);
    var kb=fpMkPlane(pw, 0.14, AL, 1);                      // 하부 레일
    kb.position.set(sn*(pw/2+fw/2), 0.08, 0.034); leafGrp.add(kb);
    var rf=fpMkPlane(pw*0.9, 0.02, 0xEAFBFF, 0.22);         // 유리 반사선
    rf.position.set(sn*(pw/2+fw/2), h*0.66, 0.03); leafGrp.add(rf);
    g.add(pivot);
    /* 문짝(leafGrp)을 바깥에서도 찾을 수 있게 남겨 둔다 — 문 유리에 붙는
       레터링·로고 같은 장식을 문짝에 같이 붙여야 문이 열릴 때 함께 움직인다
       (예전엔 장식이 벽 쪽 그룹에 붙어 있어서, 문이 열리면 글씨만
       허공에 남아 있었다). 닫힌 상태의 leafGrp 좌표계는 문 전체 좌표계와
       같으므로, 문 기준 좌표를 그대로 써서 붙이면 된다. */
    /* 가운데 세로 검은 바는 고정 기둥이 아니라 문짝에 붙은
       '맞댐 선대(meeting stile)'다 — 예전엔 벽 쪽 그룹(g)에 통짜로 붙어 있어서
       문이 열려도 가운데 바만 허공에 그대로 남아 있었다. 이제 문짝(leafGrp)에
       반쪽씩 붙여, 닫히면 하나로 맞물리고 열리면 문과 함께 갈라진다. */
    if(!o.single && !o.noMullion){
      var stile=fpMkPlane(fw/2, h, AL, 1);
      stile.position.set(sn*(fw/4), h/2, 0.036); leafGrp.add(stile);
    }
    if(!g.userData.gateLeaves) g.userData.gateLeaves=[];
    g.userData.gateLeaves.push({sign:(sn||1), leaf:leafGrp, pivot:pivot, paneW:pw});
    // 모든 문에 자동 등록하지 않고, 호출 쪽에서 o.autoOpen을 켠 경우에만
    // (지하1층 크리에이티브 존 문) — 밖(복도)에서 들어올 때만 열리도록 한 방향으로 제한.
    if(o.autoOpen) fpRegisterAutoDoor(g, pivot, w, sn||1, 1.05, o.trigDist, (o.oneWay!==undefined?o.oneWay:-1), o.push);
  });
  /* o.noMullion : 양짝 자동문(여닫이)에서는 가운데 고정 멀리언을 두지 않는다 —
     문짝이 열려도 가운데 세로 기둥이 그대로 남아 있으면 "문이 두 개 겹쳐 있는"
     것처럼 보이고, 열린 문 사이로 지나가는 느낌도 나지 않는다. */
  /* 고정 기둥은 좌우 문틀 두 개뿐이다 — 가운데 바는 위에서 문짝에 붙였다. */
  [-w/2+fw/2, w/2-fw/2].forEach(function(px){
    var p=fpMkPlane(fw, h, AL, 1); p.position.set(px, h/2, 0.036); g.add(p);
  });
  var top=fpMkPlane(w, fw*1.5, AL, 1); top.position.set(0, h-fw*0.75, 0.036); g.add(top);
  var trH = Math.max(0, FP_CEIL_H - h - 0.05);              // 문 위 채광창
  /* 이 자동 채광창(어두운 유리, 반투명)이 지하1층 크리에이티브 존
     문처럼 문 위에 이미 벽 글씨(레터링)가 따로 붙는 문에서는, 그 글씨 자리에
     작은 사각형 그림자처럼 겹쳐 보였다 — o.noTransom을 준 문은 생략한다. */
  if(trH > 0.14 && !o.noTransom){
    var tr=fpMkPlane(w, trH, GL, 0.26); tr.position.set(0, h+trH/2+0.04, 0.012); g.add(tr);
    var tb=fpMkPlane(w, fw, AL, 1); tb.position.set(0, h+0.03, 0.036); g.add(tb);
  }
  if(o.sign){
    /* 현판 : 예전엔 문 윗틀과 천장 사이 틈(30cm 남짓)에 억지로 맞추느라
       판 높이가 10cm까지 줄어들어 글씨가 아예 안 읽혔다.
       → 문 윗틀에 살짝 걸쳐도 좋으니 틈 전체를 쓰고, 가로로 긴 현판을 단다. */
    var bh=0.34, bw=Math.min(w*0.94, bh*6.4);
    var sy=Math.min(h + 0.06 + bh/2, FP_CEIL_H - 0.03 - bh/2);
    var sp=fpMkTex(bw, bh, fpBannerTex(o.sign, o.accent||'#8FE3E0', true), 1);
    sp.position.set(0, sy, 0.07); g.add(sp);
  }
  if(o.dark){
    /* 사진의 크리에이티브 존 문 : 검은 알루미늄 프레임 + 스테인리스 세로 손잡이.
       유리·손잡이가 이제 경첩(pivot) 안에 중첩돼 있으므로 g.children이 아니라
       g.traverse로 모든 하위 메시까지 훑는다. */
    g.traverse(function(c){
      if(!c.material || !c.material.color) return;
      var hx=c.material.color.getHex();
      if(hx===0xC6D6DE) c.material.color.setHex(0x1B1E24);
      else if(hx===0xE8813C) c.material.color.setHex(0xCFD8DE);
    });
  }
  return g;
}
/* ══════════════════════════════════════════════════════════════════
   1층 중앙계단 → 지하 후문 곁가지 (전면 재설계, 2026 리팩토링)
   예전 버전은 fpMakeStairwell 안쪽에 lowX/lowY 같은 클로저 변수를 그대로
   끌어다 쓰는 하나의 거대한 if 블록이었다. 여기서는 좌표·치수를 전부 인자로
   받는 독립 함수들로 쪼개서, 계단 본체 코드와 완전히 분리했다 — 함수 이름과
   인자만 봐도 무엇을 어디에 세우는지 알 수 있게 하는 것이 목표다.

   좌표계 : x=착지 지점(계단 진행축), y=그 지점의 바닥 높이(계단 기준 0=1층
   로비 바닥), zNear=계단 쪽(통로 입구), zFar=zNear에서 안쪽으로 len만큼 들어간
   막다른 끝(후문이 서는 자리). +X가 정면(문을 마주보고), +Z가 계단 쪽(오른쪽).
   ══════════════════════════════════════════════════════════════════ */
var FP_BD_LANDING_N = 2;     // 계단 본체에서 몇 단 내려간 참에서 후문이 갈라지는가
var FP_BD_LEN        = 2.6;  // 후문 통로 길이(Z)
var FP_BD_WIDTH       = 1.0; // 후문 통로 폭(X)
var FP_BD_DOOR_W      = 1.86;
var FP_BD_DOOR_H      = 2.12;
var FP_BD_CEIL_GAP    = 0.30;                    // 문 위~천장 틈
var FP_BD_CEIL_H      = FP_BD_DOOR_H + FP_BD_CEIL_GAP;

/* 계단 본체 쪽 벽에 뚫어야 하는 구멍(후문 통로 입구) 좌표.
   fpMakeStairwell의 벽 생성 루프가 이 값을 그대로 가져다 쓴다. */
function fpBDWallHole(xs, run, rise){
  var cx = xs + FP_BD_LANDING_N*run;
  return {x0:cx-0.5, x1:cx+0.5, y0:-FP_BD_LANDING_N*rise, y1:-FP_BD_LANDING_N*rise+FP_BD_CEIL_H};
}
/* 바닥 + 천장 — 통로 전체 길이를 덮는 밋밋한 두 판. */
function fpBDFloorCeil(g, x, y, zc){
  var fl=fpMkPlane(FP_BD_WIDTH, FP_BD_LEN, 0xB7B2A6, 1);
  fl.rotation.x=-Math.PI/2; fl.position.set(x, y+0.01, zc); g.add(fl);
  var cl=fpMkPlane(FP_BD_WIDTH, FP_BD_LEN, 0xE9E5D9, 1);
  cl.rotation.x=Math.PI/2; cl.position.set(x, y+FP_BD_CEIL_H, zc); g.add(cl);
}
/* 좌/우 벽 — 왼쪽(-X, 문을 마주보고 왼쪽)은 회색 사각 판넬 타일, 오른쪽은
   계단실과 같은 마감 벽.
   (한때 이 우측 벽을 없애 상행 계단과 트이게 하려 했지만, 벽을 치우자 계단이
   아니라 아무것도 없는 빈 허공이 드러났다 — 두 모듈이 실제로 옆으로 붙어있는
   구조가 아니라는 뜻이다. 진짜로 한 공간처럼 합치려면 계단실·후문을 통째로
   다시 배치해야 하는 더 큰 작업이라, 일단 벽은 되돌려 막아 둔다.) */
function fpBDWalls(g, x, y, zc, cWall, eWall){
  var tileWall=fpMkTilePanel(FP_BD_LEN, FP_BD_CEIL_H, x-FP_BD_WIDTH/2, y+FP_BD_CEIL_H/2, zc, Math.PI/2);
  g.add(tileWall);
  var plainWall=fpMkPlane(FP_BD_LEN, FP_BD_CEIL_H, cWall, 1, eWall);
  plainWall.rotation.y=Math.PI/2;
  plainWall.position.set(x+FP_BD_WIDTH/2, y+FP_BD_CEIL_H/2, zc); g.add(plainWall);
}
/* 좌측 벽 안쪽에 파인 소형 출입구(엘리베이터 틀) 장식 — 실제로 열리지 않는
   장식용 프레임이라 안쪽은 짙은 닫힌 면으로 채운다. zAnchor는 통로 입구(zNear)
   기준 오프셋. */
function fpBDAlcove(g, x, y, zAnchor){
  var nx=x-FP_BD_WIDTH/2-0.005, nz=zAnchor, nw=0.95, nh=1.86;
  var shadow=fpMkPlane(nw+0.16, nh+0.16, 0x8A8D8C, 1);
  shadow.rotation.y=Math.PI/2; shadow.position.set(nx-0.01, y+nh/2+0.02, nz); g.add(shadow);
  var frame=fpMkMetal(0.05, nh, nw, 0xB9BEC0, 1);
  frame.position.set(nx+0.02, y+nh/2+0.02, nz); g.add(frame);
  var inner=fpMkPlane(nw-0.10, nh-0.10, 0x2B2E31, 1);
  inner.rotation.y=Math.PI/2; inner.position.set(nx+0.05, y+nh/2+0.02, nz); g.add(inner);
  var callPlate=fpMkPlane(0.10, 0.16, 0xE7E4DC, 1);
  callPlate.rotation.y=Math.PI/2; callPlate.position.set(nx+0.06, y+1.30, nz+nw/2-0.14); g.add(callPlate);
}
/* 후문 자체 — 맑은 유리 + 은회색 금속 프레임(fpMakeGate를 만든 뒤 색만 다시
   입힌다). 문 뒤는 야외를 만들지 않고 마감벽으로 막는다. */
function fpBDDoor(g, x, y, zFar){
  var door=fpMakeGate({w:FP_BD_DOOR_W, h:FP_BD_DOOR_H});
  door.traverse(function(c){
    if(!c.material || !c.material.color) return;
    var hx=c.material.color.getHex();
    if(hx===0x2C5E64){ c.material.color.setHex(0xD9EEF0); c.material.opacity=Math.min(c.material.opacity,0.40); }
    else if(hx===0xE8813C) c.material.color.setHex(0xAAB4BC);
  });
  door.position.set(x, y, zFar+0.05); g.add(door);
  var cap=fpMkPlane(FP_BD_DOOR_W+0.5, FP_BD_CEIL_H, 0xDCD9D0, 1);
  cap.position.set(x, y+FP_BD_CEIL_H/2, zFar-0.06); g.add(cap);
}
/* 문 위 검은 대형 간판 — "SW중심대학사업". */
function fpBDSign(g, x, y, zc, ko){
  var h=0.5, sy=y+FP_BD_CEIL_H-h/2-0.03;
  var plate=fpMkPlane(FP_BD_LEN-0.1, h, 0x14161A, 1);
  plate.rotation.x=-Math.PI/2; plate.rotation.y=Math.PI/2;
  plate.position.set(x, sy, zc); g.add(plate);
  var label=fpMkTex(FP_BD_LEN-0.3, 0.30,
    fpWallTextTex(ko?'SW중심대학사업':'SW-Centered University', '#EDEFEA'), 1);
  label.rotation.y=Math.PI/2; label.position.set(x, sy, zc); g.add(label);
}
/* 노란 점자블록 — 통로 전체를 따라 문 앞까지. */
function fpBDTactile(g, x, y, zc){
  var strip=fpMkPlane(0.4, FP_BD_LEN-0.3, 0xE8C43E, 1);
  strip.rotation.x=-Math.PI/2; strip.position.set(x-0.25, y+0.02, zc); g.add(strip);
}
/* 조립 : 위 조각들을 한 자리에서 순서대로 세운다.
   (입구 쪽에 있던 가짜 엘리베이터 틀 장식(fpBDAlcove)은 실제 사진에
   없는 요소였고, 안쪽이 짙은 빈 면이라 "벽에 뚫린 이상한 구멍"처럼 보여서 뺀다.) */
/* 좌측 벽에 붙은 검은 문 하나 — 실사진(SW중심대학사업 간판 통로)에서
   계단 쪽(입구, zNear)에 가까운 자리에 있는 문. 벽을 뚫지 않고 벽면 위에
   문짝만 얹는 장식용(다른 층 검은 장식문과 같은 방식). */
function fpBDSideDoor(g, x, y, zNear){
  var wallX=x-FP_BD_WIDTH/2, dW=0.86, dH=2.02, doorZ=zNear-0.85;
  var frame=fpMkPlane(dW+0.10, dH+0.08, 0x9C9590, 1);
  frame.rotation.y=Math.PI/2; frame.position.set(wallX+0.006, y+dH/2+0.02, doorZ); g.add(frame);
  var leaf=fpMkPlane(dW, dH, 0x161616, 1);
  leaf.rotation.y=Math.PI/2; leaf.position.set(wallX+0.012, y+dH/2, doorZ); g.add(leaf);
  var handle=fpMkDisc(0.02, 0x8A8D8F, 1);
  handle.rotation.y=Math.PI/2; handle.position.set(wallX+0.018, y+dH*0.46, doorZ-dW/2+0.10); g.add(handle);
}
function fpMakeBackDoorBranch(g, x, y, zNear, cWall, eWall, ko){
  var zFar=zNear-FP_BD_LEN, zc=(zNear+zFar)/2;
  fpBDFloorCeil(g, x, y, zc);
  fpBDWalls(g, x, y, zc, cWall, eWall);
  fpBDSideDoor(g, x, y, zNear);
  fpBDDoor(g, x, y, zFar);
  fpBDSign(g, x, y, zc, ko);
  fpBDTactile(g, x, y, zc);
}
/* ══════════════════════════════════════════════════════════════════
   1층 중앙계단 홀 전용 장식(실사진 반영, 2026-08 리팩토링).
   fpMakeStairwell 안에서 (!em && lv===1 && dnLv==='B1') 일 때만 한 번 호출되는
   완전 독립 함수 — 계단 본체(단·난간·걷기 경로 좌표)는 일절 건드리지 않고,
   ① 좌측(-Z) 벽 대형 사각 타일 마감 + 공지 포스터 2장 + 소화전함(상단 적색
      표시등·세로 '소화전' 글씨), ② 통로 상단에 천장에서 매달린 대형 검은
      'SW중심대학사업' 간판(흰 필기체), ③ 뒷벽(x0+WD)을 막힌 벽 대신
      "가운데 유리 출입문 + 문 너머 바깥 풍경"이 있는 벽으로 재구성, ④ 문 앞
      주광(daylight) 포인트 라이트 — 만 세운다.
   호출부에서 이 함수가 뒷벽을 대신 세우므로, fpMakeStairwell의 기본 뒷벽
   (bw)은 이 경우에만 생략된다(천장은 그대로 유지). */
/* 실사형 개선(2차) : 벽-바닥 접점 AO(그림자) ─────────────────────────
   벽 밑동이 바닥과 만나는 곳, 문틀 아래 등은 실제로는 빛이 덜 들어와
   살짝 어두워 보인다. 전체 화면에 비네트를 씌우는 대신, 그 자리에만
   옅은 그라디언트 판을 바닥 위에 깔아 "그 지점의 geometry에서" 어두워
   보이게 한다. 텍스처는 1장만 만들어 공유하므로(다른 노이즈 텍스처와
   같은 패턴) 여러 번 불러도 추가 텍스처 로딩 비용이 없다. */
function fpAOStripTex(){
  if(FP_TEX['aostrip']) return FP_TEX['aostrip'];
  var W=32, H=32;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  // 좌우 대칭(가운데 어둡고 양끝 투명) 그라디언트로 만들어, 평면을 회전시켜도
  // "어두운 쪽"이 방향에 따라 반대로 뒤집힐 위험이 없다(중앙 = 벽 밑동 위치).
  var gr=x.createLinearGradient(0,0,0,H);
  gr.addColorStop(0.00,'rgba(0,0,0,0)');
  gr.addColorStop(0.45,'rgba(0,0,0,0.30)');
  gr.addColorStop(0.55,'rgba(0,0,0,0.30)');
  gr.addColorStop(1.00,'rgba(0,0,0,0)');
  x.fillStyle=gr; x.fillRect(0,0,W,H);
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping; t.minFilter=THREE.LinearFilter;
  FP_TEX['aostrip']=t; return t;
}
/* len: 벽을 따라가는 길이, depth: 벽 밑동에서 방 안쪽으로 번지는 폭,
   cx/cz: 띠의 중심 좌표, axis: 벽이 뻗는 방향('x'=기본, 'z'=문 옆벽처럼
   세로 방향). 평면을 두 번 회전시켜 조합하면(rotation.x 다음 rotation.z)
   순서에 따라 결과가 달라지기 쉬워서, 대신 axis='z'일 때는 지오메트리의
   가로/세로만 맞바꾸고 텍스처를 90도 돌려 방향을 맞춘다(안전한 방식).
   바닥 타일보다 살짝(0.011) 위에 얹어 z-fighting 없이 겹쳐 보이게 한다. */
function fpMkContactAO(len, depth, cx, cz, axis){
  var geo, tex;
  if(axis==='z'){
    geo=new THREE.PlaneGeometry(depth, len);
    tex=fpAOStripTex().clone(); tex.center.set(0.5,0.5); tex.rotation=Math.PI/2; tex.needsUpdate=true;
  }else{
    geo=new THREE.PlaneGeometry(len, depth);
    tex=fpAOStripTex();
  }
  var mat=new THREE.MeshBasicMaterial({map:tex, transparent:true, depthWrite:false, opacity:0.85});
  var m=new THREE.Mesh(geo, mat);
  m.rotation.x=-Math.PI/2;
  m.position.set(cx, 0.011, cz);
  m.renderOrder=-1;
  return m;
}
function fpMake1FStairHall(g, p){
  var x0=p.x0, WD=p.WD, LAND=p.LAND, hw=p.hw, zc=p.zc,
      yB=p.yB, yT=p.yT, cWall=p.cWall, eWall=p.eWall, ko=p.ko,
      zUp=p.zUp, zDn=p.zDn, fw=p.fw, xs=p.xs, N=p.N, run=p.run, rise=p.rise;
  var zL=zc-hw;                                  // 좌측 벽면(-Z) z
  /* ── ⓪ 전체 바닥 참(Landing) : 문턱(LAND)부터 정면 출입문까지 이어지는 넓은
     테라조 타일 바닥. 기존 'fl'(문턱 폭 LAND만)은 계단 진입부만 덮어서, 계단
     양옆(문 오른쪽 벽 앞쪽 등) 빈 공간이 바닥 없이 뚫려 보이는 문제가 있었다
     ("정면 출입문까지 이어지는 넓은 평면 타일 바닥"). 계단 매스
     자체는 그 위에 얹히는 별도 지오메트리라 겹쳐도 문제없다. */
  /* [지하 계단 개구부] 실사진(계단 내려다본 사진)처럼, 후문 로비
     바닥에 지하로 내려가는 계단이 그대로 내려다보이는 사각 개구부를 만든다.
     구조 정정: 예전에는 이 구멍을 zDn 열에 뚫었는데, 실제 B1행
     계단은 zUp 열(1층 자신의 2층행 상행 계단과 같은 열 — 내려가는 계단 바로
     위에 올라가는 계단이 얹혀 있는 실제 구조)에 있다. 아래 난간·안전선도
     이미 zUp 기준으로 세워져 있어 구멍만 반대쪽에 나 있던 상태였다.
     구멍의 변이 바닥 바깥 윤곽선과 거의 맞닿아 Shape+hole 방식은 삼각분할이
     깨진다 — 바닥을 세 장의 사각형으로 나눠 깔아 그 문제를 없앤다. */
  var landFl;
  (function(){
    var fx0=xs-0.4, fx1=x0+WD, fz0=zc-hw+0.025, fz1=zc+hw-0.025;
    /* 개구부 = 지하 계단(B1 그룹의 직선 계단, 길이 FP_B1F_RUN_LEN)이 차지하는 자리 */
    var hx0=Math.max(fx0, xs-0.10), hx1=Math.min(fx1, xs+FP_B1F_RUN_LEN+0.10);
    var hz0=Math.max(fz0, zUp-fw/2-0.05), hz1=Math.min(fz1, zUp+fw/2+0.05);
    function slab(ax0,ax1,az0,az1){
      if(ax1-ax0<=0.05 || az1-az0<=0.05) return null;
      var t=fpTerrazzoTex().clone(); t.needsUpdate=true;
      t.wrapS=t.wrapT=THREE.RepeatWrapping;
      t.repeat.set(Math.max(1,Math.round((ax1-ax0)/0.6)), Math.max(1,Math.round((az1-az0)/0.6)));
      var m=fpMkFloorGloss(ax1-ax0, az1-az0, t);
      m.rotation.x=-Math.PI/2; m.position.set((ax0+ax1)/2, 0.008, (az0+az1)/2); g.add(m);
      return m;
    }
    slab(fx0, hx0, fz0, fz1);              // 계단 시작 앞(-X)쪽 좁은 바닥
    landFl=slab(hx1, fx1, fz0, fz1);       // 계단 위쪽(+X) 로비 바닥 — 사람이 서는 자리
    slab(hx0, hx1, fz0, hz0);              // 올라가는 계단이 놓이는 반대 열(-Z) 바닥
    slab(hx0, hx1, hz1, fz1);              // +Z 벽 쪽 자투리(거의 0폭이면 생략)
    if(!landFl) landFl=slab(fx0, fx1, fz0, hz0);
    /* 개구부 테두리 바닥 두께 — 계단이 올라와 바닥과 만나는 +X쪽(hx1)은 생략 */
    var skH=0.16, skC=0x9C978B;
    var sk1=fpMkPlane(hx1-hx0, skH, skC, 1);
    sk1.position.set((hx0+hx1)/2, 0.008-skH/2, hz0); g.add(sk1);
    var sk2=fpMkPlane(hz1-hz0, skH, skC, 1);
    sk2.rotation.y=Math.PI/2; sk2.position.set(hx0, 0.008-skH/2, (hz0+hz1)/2); g.add(sk2);
  })();
  /* 버그 수정: 이 로비 전용 천장이 1층→2층으로 올라가는 계단
     바로 위 공간(x0~x0+WD 전체)을 통짜로 덮고 있었다 — 1층은 위층(2층)이
     항상 있으므로, 계단을 오를 때 이 판을 그대로 뚫고 지나가는 것처럼
     보였다(다른 층 계단실 천장과 마찬가지로 위층으로 이어지는
     자리는 막지 않는다 — 그냥 이 로비 전용 천장 자체를 없앤다).
     대신 조명(포인트라이트)만은 남겨서 로비가 어두워지지 않게 한다. */
  (function(){
    var ceilY=FP_CEIL_H-0.02;
    var len=WD, cz=zc;
    /* 성능 개선: 실제 PointLight 개수를 최대 4개로 제한한다
       (다른 복도 조명 루프에 이미 적용된 것과 같은 방식) — 휴대폰에서
       조명 개수가 많을수록 프레임마다 계산량이 늘어 렉의 큰 원인이 된다.
       빛이 드문드문해 보이지 않도록 세기·도달거리를 함께 늘려 보완한다. */
    var FIX_INTENSITY=0.24, FIX_DIST=4.2, LIGHT_MAX=4;
    var n=Math.max(1, Math.round(len/3.6));
    var lightEvery=Math.max(1, Math.ceil(n/LIGHT_MAX));
    var boost=Math.min(2.2, lightEvery);
    for(var i=0;i<n;i++){
      if(i%lightEvery!==0) continue;
      var fx=x0 + (i+0.5)*(len/n);
      var pl=new THREE.PointLight(0xFFF8E7, FIX_INTENSITY*boost, FIX_DIST*Math.sqrt(boost), 2);
      pl.position.set(fx, ceilY-0.08, cz); g.add(pl);
    }
  })();
  /* ── ① 좌측 벽 : 대형 사각 판넬 타일(사진의 회색 대형 타일) ──
     기존 크림색 벽(sw)의 표면 위에 살짝(0.006m) 띄워 덧붙이는 방식이라
     벽 구조·구멍은 전혀 건드리지 않는다. 지하로 내려가는 시야까지 이어지도록
     벽 전체 높이(yB~yT)를 덮는다. */
  g.add(fpMkTilePanel(WD-0.05, (yT-yB)-0.05, x0+WD/2, (yT+yB)/2, zL+0.006, 0, 0xFFFFFF));
  g.add(fpMkContactAO(WD-0.05, 0.5, x0+WD/2, zL, 'x'));   // 벽-바닥 접점 AO
  /* ── ①-b 계단실 입구 쪽(-X) 아랫벽 : 1층 바닥 밑 ~ 지하 천장 사이 막음 ──
     1층에서 지하로 내려가는 연출 중에 앞(-X)을 보면, 지하 복도
     천장(월드 y=B1바닥+FP_CEIL_H)과 1층 바닥(월드 y=1층슬래브) 사이가 아무것도
     없이 뻥 뚫려 있어서 그 틈으로 바깥(홀로그램·검은 배경)이 그대로 보였다.
     게다가 그 틈 아래로 지하 복도 벽 윗부분만 삐죽 남아 '역 기역자' 모양의
     크림색 조각처럼 떠 보였다. 딱 그 틈 높이만큼 크림색 벽을 세워 막으면
     두 문제가 한 번에 사라진다(지하 복도 벽 윗부분도 이 벽 뒤로 가려진다).
     1층 바닥(y=0)보다 아래에만 있으므로 1층에서 걸어다닐 때는 보이지 않는다. */
  (function(){
    var voidH = SP - (FP_CEIL_H-0.02);        // 지하 천장 ~ 1층 바닥 사이 높이
    if(voidH <= 0.05) return;
    var vw=fpMkWallLit(hw*2+1.2, voidH, cWall, x0+0.02, 0.02-voidH/2, zc, Math.PI/2);
    g.add(vw);
  })();
  /* 이 좌측 벽에 붙여 두었던 공지사항 포스터 4장을 없앤다 —
     실사진(3번 사진)의 같은 벽에는 아무것도 붙어 있지 않고 석재 패널 마감만
     있다. 패널(위 fpMkTilePanel)은 실사진과 일치하므로 그대로 남긴다. */
  /* 소화전함을 없앤다. */
  /* ── ② 천장걸이 대형 검은 간판 'SW중심대학사업'(흰 필기체) ──
     주의: 1인칭 모드에는 건물 전체를 덮는 어두운 천장판(fpCeil, 바닥+2.55m)이
     따로 있어서, 그보다 높이 달면 윗부분이 천장에 잘려 얇은 띠로만 보인다
     (렌더로 확인). 판 전체(1.95~2.50)를 그 아래에 넣고, x=4.3으로 안쪽에 달아
     ① 관람 시선이 천장판에 막히기 전(교차점 x=4.50)에 판에 닿고
     ② 계단 오르내리기 연출의 눈높이가 이 x를 지날 땐 항상 판 위(≥2.90)라
     몸이 판을 뚫지 않는다(좌표 검증 완료). */
  /* 간판을 더 위로. 천장(FP_CEIL_H)이 3.3으로 상향되어 여유가
     생겼으므로, 사람 눈높이(≥2.90) 위 불변식을 유지하는 선에서 살짝만
     더 올린다(2.225→2.50, 판 상단 2.50→2.775, 여전히 2.90 미만). */
  var sgX=x0+2.50, sgW=2.30, sgH=0.55, sgD=0.14, sgYc=2.50;
  /* 간판이 우측 상행 계단 쪽까지 넘어가면 안 되고, 왼쪽 벽~계단
     시작 전(좌측 계단 공간) 사이에만 들어와야 한다. 상행 계단의 안쪽(중심 쪽)
     가장자리는 zUp-fw/2 = (OW/4+0.02)-(OW/2-0.10)/2 인데, OW 항이 서로
     상쇄되어 hw(폭)와 무관하게 항상 zc+0.07로 고정된다 — 그보다 0.3m 여유를
     두고 판 오른쪽 끝이 zc-0.3에 오도록 중심을 zc-1.45로 옮긴다. */
  var sgZOff = -1.45;
  var sgGrp=new THREE.Group(), sgTilt=new THREE.Group();
  sgGrp.add(sgTilt);                                            // 기울임은 내부 그룹에 한 번만
  var sgBody=fpMkBox(sgW, sgH, sgD, 0x0F1114, 1, 0x050608);      // 두께 있는 박스 — 밑면·뒷면이
  sgBody.position.set(0,0,0); sgTilt.add(sgBody);                // 어두운 프레임으로 자연스럽게 보인다
  var sgEdge=fpMkPlane(sgW, 0.03, 0x3A3E44, 1);                 // 판 하단 알루미늄 몰딩
  sgEdge.position.set(0,-sgH/2+0.015,sgD/2+0.004); sgTilt.add(sgEdge);
  (function(){                                                  // 흰 필기체(기울임+스큐)
    var cv=document.createElement('canvas'); cv.width=1024; cv.height=176;
    var c=cv.getContext('2d');
    c.clearRect(0,0,1024,176); c.textAlign='center'; c.textBaseline='middle';
    c.save(); c.translate(512,92); c.transform(1,0,-0.24,1,0,0);
    c.fillStyle='#F2F3EF';
    c.font='italic 900 92px "Segoe Script","Brush Script MT",Pretendard,"맑은 고딕",cursive';
    c.fillText(ko?'SW중심대학사업':'SW-Centered Univ.', 0, 4, 940);
    c.restore();
    var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
    var tx=fpMkTex(sgW-0.24, (sgW-0.24)*176/1024, t, 1);
    tx.position.set(0,0,sgD/2+0.006); sgTilt.add(tx);
  })();
  sgGrp.rotation.y=-Math.PI/2;                                  // 판이 복도 입구(-X)를 본다
  sgTilt.rotation.x=0.10;   // 윗변이 앞으로 나오며 글씨면이 살짝 아래(관람자)를 향한다(사진 반영)
  sgGrp.position.set(sgX, sgYc, zc+sgZOff); g.add(sgGrp);
  [-1,1].forEach(function(sn){                                  // 천장 매다는 봉 2개
    var rod=fpMkBox(0.035, yT-(sgYc+sgH/2)-0.02, 0.035, 0x24272C, 1);
    rod.position.set(sgX, (yT+(sgYc+sgH/2))/2, zc+sgZOff+sn*(sgW/2-0.35)); g.add(rod);
  });
  /* ── ③ 뒷벽 재구성 : 가운데 프레임형 유리 출입문 + 문 너머 바깥 풍경 ──
     원상복구: 예전에 "문 좌측 벽을 절반으로 줄이고 문을 왼쪽으로
     당겨 붙여 달라"는 요청으로 문 중심을 zc에서 shiftAmt만큼 옮겨 두었는데,
     그 결과 후문이 계단홀 한가운데가 아니라 한쪽으로 치우쳐 보였다(4번 사진의
     "밀려 있다"). 문 중심을 다시 홀 중심(zc)에 맞추고 좌우 벽 폭도 같게 한다. */
  var bx=x0+WD, dw=2.30, dh=2.14;
  var sideW0=hw-dw/2, shiftAmt=0;             // 0 = 홀 중앙 정렬
  var dcz=zc-shiftAmt;                        // 문 중심 z
  var sideWL=sideW0-shiftAmt, sideWR=sideW0+shiftAmt;   // 좌우 같은 폭
  var und=fpMkPlane(hw*2, -yB, cWall, 1, eWall);                // 바닥 아래(지하 계단 뒷벽)
  und.rotation.y=-Math.PI/2; und.position.set(bx, yB/2, zc); g.add(und);
  [[-1,sideWL],[1,sideWR]].forEach(function(pr){                // 문 좌우 벽(비대칭 폭)
    var sn=pr[0], sideW=pr[1];
    var swp=fpMkPlane(sideW, yT, cWall, 1, eWall);
    swp.rotation.y=-Math.PI/2;
    swp.position.set(bx, yT/2, dcz+sn*(dw/2+sideW/2)); g.add(swp);
    /* 실사진(후문 참) 반영 : 문 좌우 벽도 좌측 벽과 같은 베이지 대형 판넬 타일 */
    g.add(fpMkTilePanel(sideW-0.04, yT-0.04, bx-0.008, yT/2, dcz+sn*(dw/2+sideW/2), Math.PI/2, 0xFFFFFF));
    g.add(fpMkContactAO(sideW-0.04, 0.45, bx, dcz+sn*(dw/2+sideW/2), 'z'));  // 벽-바닥 접점 AO
  });
  var ovr=fpMkPlane(dw, yT-(dh+0.42), cWall, 1, eWall);         // 문+채광창 위 벽
  ovr.rotation.y=-Math.PI/2; ovr.position.set(bx, (dh+0.42+yT)/2, dcz); g.add(ovr);
  /* '금연구역' 표지는 아래에서 후문 왼쪽으로 옮겨 새로 붙인다. */
  /* 실사진 반영(4차) : 정면 유리 출입문을 입체적으로 다시 짓는다 —
     ① 벽체가 안쪽으로 오목하게 들어가는 두꺼운 문틀(리빌) 추가
     ② 문 상단 중앙에 도어클로저 메탈박스
     ③ 문짝을 하나가 아니라 실제 사진처럼 양개형(두 짝, 서로 반대쪽
        문설주에 경첩) 유리문으로. */
  (function(){
    var REC=0.16;                              // 오목하게 들어간 깊이
    var dX=bx+REC;                              // 실제 문짝이 서는 자리(복도쪽 벽면보다 안쪽)
    var jambCol=0x8A8F94;
    var revTop=fpMkBox(REC, 0.07, dw+0.10, jambCol, 1);   // 위쪽 리빌(인방 밑면)
    revTop.position.set(bx+REC/2, dh+0.035, dcz); g.add(revTop);
    [-1,1].forEach(function(sn){                          // 좌우 리빌(문설주 옆면)
      var revSide=fpMkBox(REC, dh, 0.05, jambCol, 1);
      revSide.position.set(bx+REC/2, dh/2, dcz+sn*(dw/2+0.025)); g.add(revSide);
    });
    var closerBox=fpMkBox(0.34, 0.08, 0.10, 0x2B2E33, 1);  // 도어클로저 — 문 상단 정중앙
    closerBox.position.set(dX-0.02, dh+0.08, dcz); g.add(closerBox);

    var leafW=dw/2-0.06, leafH=dh-0.05, leafT=0.04;
    var openAng=0.18;
    [-1,1].forEach(function(sn){
      var hingeZ=dcz+sn*(dw/2-0.03);            // 바깥쪽(각 문설주)에서 경첩
      var pivot=new THREE.Group();
      pivot.position.set(dX, 0, hingeZ);
      pivot.rotation.y = -sn*openAng;
      g.add(pivot);
      var leaf=fpMkPlane(leafW, leafH, 0xEAF6F8, 0.38);
      leaf.material.map=null; leaf.material.depthWrite=false;
      leaf.rotation.y=-Math.PI/2;
      leaf.position.set(0, leafH/2+0.03, -sn*leafW/2); pivot.add(leaf);
      var rf=fpMkPlane(leafW*0.85, 0.02, 0xEAFBFF, 0.14);
      rf.material.map=null; rf.material.depthWrite=false;
      rf.rotation.y=-Math.PI/2;
      rf.position.set(0.01, leafH*0.68, -sn*leafW/2); pivot.add(rf);
      var frTop=fpMkBox(leafT*0.6, leafT*0.9, leafW+0.03, 0x5B6469, 1);
      frTop.position.set(0, leafH+0.03, -sn*leafW/2); pivot.add(frTop);
      var frBot=fpMkBox(leafT*0.6, leafT*0.9, leafW+0.03, 0x5B6469, 1);
      frBot.position.set(0, 0.03, -sn*leafW/2); pivot.add(frBot);
      var frOuter=fpMkBox(leafT*0.6, leafH, leafT*0.9, 0x5B6469, 1);   // 경첩 쪽(바깥) 세로 프레임
      frOuter.position.set(0, leafH/2+0.03, 0); pivot.add(frOuter);
      var frInner=fpMkBox(leafT*0.6, leafH, leafT*0.9, 0x5B6469, 1);   // 가운데(맞닿는 쪽) 세로 프레임
      frInner.position.set(0, leafH/2+0.03, -sn*leafW); pivot.add(frInner);
      var handle=fpMkPipe(leafH*0.42, 0.022, 0xC7CDD1, 1);            // 스테인리스 세로 손잡이(가운데 쪽)
      handle.position.set(0.05, leafH*0.52+0.03, -sn*(leafW-0.10)); pivot.add(handle);
    });
    var seam=fpMkPlane(0.03, dh-0.05, 0x2E332F, 0.9);       // 양문 가운데 갭
    seam.rotation.y=-Math.PI/2; seam.position.set(dX+0.005, dh/2, dcz); g.add(seam);
    /* 버그 수정: 바닥에 눕히는 판(rotation.x=-π/2)은 PlaneGeometry의
       첫 인자가 X(문에 수직) 방향, 둘째 인자가 Z(문과 나란한) 방향이 된다.
       문턱 금속판과 점자블록 모두 인자가 뒤바뀌어 있어서, 문과 나란히 깔려야 할
       띠가 문을 뚫고 바깥으로 뻗어 나가 있었다(4번 사진에서 노란 블록이 옆으로
       밀려 보이던 원인) — 두 값을 서로 바꾼다. */
    var thresh=fpMkPlane(0.16, dw+0.10, 0xB7BCBE, 1);       // 바닥 문턱 금속판
    thresh.rotation.x=-Math.PI/2; thresh.position.set(dX-0.02, 0.006, dcz); g.add(thresh);
    g.add(fpMkContactAO(dw+0.10, 0.4, dX, dcz, 'z'));       // 문틀 밑 AO
    /* 문 앞 바닥에 노란 점자블록(경고용 타일) 띠를 얇게 깐다.
       기존 로비 바닥(landFl, y=0.008)과 겹치지 않도록 y를 살짝 더 띄운다. */
    var tacT=fpTactileTex().clone(); tacT.needsUpdate=true;
    tacT.wrapS=tacT.wrapT=THREE.RepeatWrapping;
    tacT.repeat.set(2, Math.max(2, Math.round((dw+0.6)/0.30)));
    var tactile=new THREE.Mesh(new THREE.PlaneGeometry(0.62, dw+0.6),
      new THREE.MeshStandardMaterial({map:tacT, roughness:0.92, metalness:0.02}));
    tactile.rotation.x=-Math.PI/2; tactile.position.set(dX-0.60, 0.013, dcz); g.add(tactile);
  })();
  /* 후문 수정에 맞춰 문 왼쪽(sideWL 벽)에 '금연구역' 표지를 새로 붙인다. */
  (function(){
    var nsZ=dcz-(dw/2+sideWL/2), nsY=1.55;
    var pap=fpMkPlane(0.34, 0.26, 0xF4F3EE, 1);
    pap.rotation.y=-Math.PI/2; pap.position.set(bx-0.008, nsY, nsZ); g.add(pap);
    var cvn=document.createElement('canvas'); cvn.width=256; cvn.height=192;
    var cn=cvn.getContext('2d');
    cn.strokeStyle='#D22B22'; cn.lineWidth=12;
    cn.beginPath(); cn.arc(128,72,46,0,Math.PI*2); cn.stroke();
    cn.beginPath(); cn.moveTo(96,104); cn.lineTo(160,40); cn.stroke();
    cn.fillStyle='#8A8F94'; cn.fillRect(104,66,48,12);
    cn.fillStyle='#C7342B'; cn.textAlign='center'; cn.textBaseline='middle';
    cn.font='800 34px Pretendard,"맑은 고딕",sans-serif';
    cn.fillText(ko?'금연구역':'NO SMOKING', 128, 156);
    var tn=new THREE.CanvasTexture(cvn); tn.minFilter=THREE.LinearFilter;
    var nsTx=fpMkTex(0.29, 0.22, tn, 1);
    nsTx.rotation.y=-Math.PI/2; nsTx.position.set(bx-0.012, nsY, nsZ); g.add(nsTx);
  })();
  var out=fpMkTex(4.7, 2.65, fpBackDoorOutsideTex(), 0.82);             // 바깥 풍경 살짝 톤 낮춤(역광 눈부심 완화)
  out.rotation.y=-Math.PI/2; out.position.set(bx+0.85, 1.30, dcz); g.add(out);
  var outFl=fpMkPlane(0.9, hw*2, 0x9AA4AA, 1);                  // 문턱 밖 짧은 외부 바닥
  outFl.rotation.x=-Math.PI/2; outFl.position.set(bx+0.45, 0.005, zc); g.add(outFl);
  var day=new THREE.PointLight(0xFFF6E0, 0.10, 6);              // 문으로 들이치는 주광(여전히 밝다는 피드백으로 추가 하향)
  day.position.set(bx-0.85, 1.75, dcz); g.add(day);
  /* ── 정면 우측(계단 쪽, +Z) 벽 : 사각 창문 + 하단 비상구 안내판 (사진 반영) ──
     문 오른쪽 벽(sideW 폭, sn=1)에 붙인다. 창 안쪽에 바깥 풍경을 한 번 더 넣어
     실제 창처럼 깊이가 있어 보이게 한다. */
  (function(){
    var winZ=dcz+dw/2+sideWR/2;                                  // 문 오른쪽(넓어진) 벽 중심 z
    var winW=Math.min(1.10, sideWR-0.14), winH=1.30, winYc=1.42;
    /* 초록(민트) 프레임·세로 방범창살·바깥 풍경 톤을 걷어내고,
       실사진(2번째 사진)처럼 회색 알루미늄 틀의 2연동 미닫이창으로 다시 만든다. */
    var alumOuter=0x9CA0A0, alumInner=0xB8BBBB, alumDark=0x707475;
    var frm=fpMkPlane(winW+0.14, winH+0.14, alumDark, 1);          // 바깥 몰딩(짙은 회색)
    frm.rotation.y=-Math.PI/2; frm.position.set(bx-0.005, winYc, winZ); g.add(frm);
    var frmIn=fpMkPlane(winW+0.05, winH+0.05, alumOuter, 1);       // 창틀 본체(밝은 회색)
    frmIn.rotation.y=-Math.PI/2; frmIn.position.set(bx-0.008, winYc, winZ); g.add(frmIn);
    /* 유리가 반짝여 보였다 — 조명 반사(specular)가 생기는
       MeshStandardMaterial 대신, 빛을 받지 않는 무광 재질(MeshBasicMaterial)로
       직접 만들어 하이라이트가 전혀 생기지 않게 한다. */
    var wglassMat=new THREE.MeshBasicMaterial({color:0xEFF4F4, transparent:true, opacity:0.55, side:THREE.DoubleSide});
    var wglass=new THREE.Mesh(new THREE.PlaneGeometry(winW-0.06, winH-0.06), wglassMat);
    wglass.rotation.y=-Math.PI/2; wglass.position.set(bx-0.012, winYc, winZ); g.add(wglass);
    /* 가운데 세로 멀리언(미닫이 두 짝 경계) + 각 짝 안쪽 얇은 프레임 */
    var mullMid=fpMkPlane(0.045, winH-0.02, alumInner, 1);
    mullMid.rotation.y=-Math.PI/2; mullMid.position.set(bx-0.014, winYc, winZ); g.add(mullMid);
    [-1,1].forEach(function(sn){
      var paneCx = winZ + sn*(winW/4);
      var paneW = winW/2 - 0.06;
      var vL=fpMkPlane(0.03, winH-0.08, alumInner, 1);             // 짝 좌우 세로 얇은 틀
      vL.rotation.y=-Math.PI/2; vL.position.set(bx-0.013, winYc, paneCx-sn*(paneW/2-0.03)); g.add(vL);
      var hT=fpMkPlane(paneW, 0.03, alumInner, 1);                 // 짝 상단 얇은 틀
      hT.rotation.y=-Math.PI/2; hT.position.set(bx-0.013, winYc+winH/2-0.08, paneCx); g.add(hT);
      var hB=fpMkPlane(paneW, 0.03, alumInner, 1);                 // 짝 하단 얇은 틀
      hB.rotation.y=-Math.PI/2; hB.position.set(bx-0.013, winYc-winH/2+0.08, paneCx); g.add(hB);
      var handle=fpMkPlane(0.02, 0.10, 0x2B2E31, 1);               // 손잡이(사진처럼 검은 세로 막대)
      handle.rotation.y=-Math.PI/2; handle.position.set(bx-0.015, winYc, paneCx+sn*(paneW/2-0.06)); g.add(handle);
    });
    /* 실사진 반영: 문과 창 사이 벽의 파란 머리글 공지 포스터 */
    var poZ=dcz+dw/2+0.28;
    var poP=fpMkPlane(0.30, 0.42, 0xF2F3F0, 1);
    poP.rotation.y=-Math.PI/2; poP.position.set(bx-0.010, 1.58, poZ); g.add(poP);
    var poH=fpMkPlane(0.26, 0.07, 0x4A7FC1, 1);
    poH.rotation.y=-Math.PI/2; poH.position.set(bx-0.014, 1.72, poZ); g.add(poH);
    for(var pl=0; pl<4; pl++){
      var pln=fpMkPlane(0.22, 0.012, 0x9AA0A6, 0.9);
      pln.rotation.y=-Math.PI/2; pln.position.set(bx-0.014, 1.60-pl*0.055, poZ); g.add(pln);
    }
    /* 창 아래 "비상구" 유도등 표지를 삭제한다. */
  })();
  /* 실사진 반영 : 정면 유리 출입문 좌측, 계단 쪽에 가까운 타일벽 위에 붙은
     검은 문. 타일벽(fpMkTilePanel)이 구멍 없는 통짜 평면이라 안쪽으로 오목하게
     넣으면 그 앞을 덮는 통짜 패널에 완전히 가려 안 보이는 문제가 있었다
     (버그 수정) — 대신 다른 층 장식용 검은 문과 같은 방식으로, 타일벽 표면
     바로 앞(패널보다 카메라 쪽)에 문틀+문짝을 얹는 표면 부착형으로 바꾼다.
     기존 포스터(0.42~3.48)·소화전(2.10)·후문 코너(bx)와 겹치지 않는
     빈 구간(WD의 약 60% 지점)에 둔다. */
  (function(){
    var dX=x0+WD*0.60+1.4, dW=1.0, dH=2.2;
    var wallZ=zL+0.006;                      // 타일벽 패널 표면(카메라 쪽)
    var frame=fpMkPlane(dW+0.10, dH+0.08, 0x9C9590, 1);
    frame.position.set(dX, dH/2+0.02, wallZ+0.006); g.add(frame);
    var leaf=fpMkPlane(dW, dH, 0x161616, 1);
    leaf.position.set(dX, dH/2, wallZ+0.012); g.add(leaf);
    var handle=fpMkDisc(0.02, 0x8A8D8F, 1);
    handle.position.set(dX+dW/2-0.10, dH*0.46, wallZ+0.018); g.add(handle);
    var plate=fpMkPlane(0.16, 0.22, 0xF0EFEA, 1);         // 문 옆 작은 안내판
    plate.position.set(dX+dW/2+0.20, 1.5, wallZ+0.010); g.add(plate);
    g.add(fpMkContactAO(dW+0.10, 0.4, dX, zL, 'x'));       // 문틀 밑 AO
  })();
  /* [구조 수정] 기존 난간·유도블록은 실제로 존재하지 않는 위치(zDn)에 세워진
     장식용 표시였다 — 실제 B1행 계단은 zUp 열(1층 자신의 2층행 상행 계단과
     같은 열)에 있다는 것을 코드로 확인했다(둘 다 fpMakeStairwell의 zUp 공식을
     공유). 위에서 뚫은 진짜 개구부(zUp, xs~xs+N*run) 둘레에 실제 난간을
     세운다 — 계단이 시작되는 가까운 쪽(x=xs)은 첫 단 자체가 경계이므로
     난간을 세우지 않고, 나머지 3면(먼 쪽 + 양 긴 변)만 막는다. */
  if(fw!==undefined && xs!==undefined && N!==undefined && run!==undefined){
    (function(){
      var vx0=xs, vx1=xs+N*run+0.6, vz0=zUp-fw/2, vz1=zUp+fw/2;   // 개구부 확장(0.6)에 맞춰 난간 먼 쪽도 같이 늘린다
      /* v95: 실사진(후문 안쪽에서 본 지하 계단 개구부)처럼 검정 각파이프
         난간 — 굵은 상단 가로대 + 가는 가로대 3줄 + 약 0.9m 간격 세로 기둥.
         X축 방향(개구부 긴 변)으로만 쓴다. */
      var railH=0.95, frameCol=0x1D2023;
      function railRun(len, cx, cz){
        var top=fpMkBox(len, 0.05, 0.05, frameCol, 1);
        top.position.set(cx, railH-0.025, cz); g.add(top);
        [0.72, 0.48, 0.24].forEach(function(by){
          var bar=fpMkBox(len, 0.025, 0.025, frameCol, 1);
          bar.position.set(cx, by, cz); g.add(bar);
        });
        var nPost=Math.max(2, Math.round(len/0.9));
        for(var pi=0; pi<=nPost; pi++){
          var post=fpMkBox(0.045, railH, 0.045, frameCol, 1);
          post.position.set(cx-len/2+len*pi/nPost, railH/2, cz); g.add(post);
        }
      }
      /* v95: 개구부 우측 긴 변(vz0, 로비 타일 바닥과 맞닿는 쪽)에만 난간을
         세운다 — 실사진에서 난간이 있는 자리. 계단 쪽(vz1)은 계속 열어 둔다. */
      var rx0=xs-0.10, rx1=xs+FP_B1F_RUN_LEN+0.10;   // 위 바닥 개구부(hx0~hx1)와 같은 X 구간
      railRun(rx1-rx0, (rx0+rx1)/2, vz0);
      /* [중복 제거] vz0(=zUp-fw/2) 쪽은 fpMakeStairwell 자신의 stairRail()이
         실제 상행 계단을 따라 이미 같은 자리에 난간을 세우고 있다 — 여기서
         또 세우면 겹쳐서(Z-fighting) 두꺼운 울타리처럼 보인다. 그쪽은 빼고
         나머지 2면(반대편 긴 변 + 먼 쪽 가로대)만 세운다. */
      /* 울타리(난간)가 오히려 계단을 가려 안 보이게 만든다는
         피드백 — 난간 2면을 없애고, 아래로 뚫린 계단 자체가 그대로 보이게
         한다(빨간 안전선만 개구부 가장자리 표시로 남긴다). */
      /* 실사진(2번째 첨부)에서 직접 확인되는 요소만 반영 : 개구부 가장자리의
         빨간 안전선(다른 층 계단에도 이미 쓰는 색 0xC0342B, 사진에 없는 노란 점자블록은 임의로 추정해 넣지 않는다). */
      /* 삭제: 개구부 가장자리에 둘러 둔 빨간 안전선 3줄(양 긴 변 +
         먼 쪽)을 없앤다 — 지하로 내려가는 연출 중 아래·옆에서 보면 벽 위에
         붉은 가느다란 실선이 떠 있는 것처럼 보인다는 지적. */
      /* [slab/soffit] 1층 자신의 2층행 상행 계단 밑면 — 실사진처럼 위층으로
         올라가는 단의 아랫면이 비스듬히 기울어져 개구부 위쪽 시야를 가린다.
         rise가 전달된 경우에만 만든다(임의의 치수를 추정하지 않는다). */
      /* [열린 하부로 전환] 계단 밑을 별도의 평면 soffit으로 덮는 대신,
         디딤판 자체를 고정 두께(STAIR_SLAB_T)만 남기고 그 아래를 비우는
         방식으로 바꿨다(위 tu/su 루프, lobby1F에서만 적용). 매끈한 판
         하나를 통째로 덧대면 계단 단이 안 보이고 다시 하나의 매끈한
         쐐기로 뭉쳐 보이므로, 이 블록은 만들지 않는다. */
    })();
  }
}
/* 중앙계단 — 예전에는 강의실과 똑같은 문 한 짝이라 '계단'으로 안 읽혔다.
   실제처럼 벽을 넓게 뚫고, 그 안에 위로 올라가는 단과 아래로 내려가는 단을
   함께 세운다(지하 캡스톤실도 계단으로 내려갈 수 있다는 걸 보여주기 위해).
   로컬 좌표는 fpMakeCorr와 같다(y=0 이 그 층 바닥면). */
var FP_ST_OW = 4.40;    // 중앙계단 개구부 폭(복도 Z 방향) — 실제 사진처럼 넓게
var FP_EM_OW = 2.70;    // 비상계단 개구부 폭 — 중앙계단보다 좁다(사진 반영)
var FP_ST_OH = 2.18;
var FP_ST_WD   = 6.20;   // 계단실 깊이(X) — 단 한 바퀴 + 중간 계단참(기존 대비 약 1.4배 깊게)
var FP_ST_WD_B1F = FP_ST_WD*1.35;  // B1↔1F 전용: 실사진처럼 문·창 앞 로비가 여유 있도록 더 깊게
var FP_ST_LAND = 1.15;   // 문턱에서 첫 단까지 — 문을 열고 들어섰을 때의 초입 계단참(약 1.4배 확장)
var FP_ST_N    = 14;     // 반 층당 단 수
var FP_ST_RUN  = 0.245;  // 단 하나 깊이    // 개구부 높이
/* v109: 5층→옥상 두 번째 도막(계단참→옥상 바닥)만 단 수를 14→10으로 줄여 짧게 만든다.
   같은 반 층 높이를 10단으로 오르므로 단이 조금 높아지지만, 옥상 바닥 개구부가 그만큼(4단×0.245≈1m)
   안쪽에서 시작해 실사진처럼 철문에서 개구부까지 평평한 바닥이 넓어지고, 데크로 오르는 계단도
   더 안쪽에서 시작한다. 걷기 연출·바닥 개구부·데크 계단이 모두 이 값을 함께 쓴다. */
var FP_ST_N_R = FP_ST_N;   // v111: 옥상 도막 단축(10단)을 되돌려 다른 층과 같은 14단·같은 시작점으로. (관련 코드는 그대로 두고 값만 되돌림 — FP_R_XSHIFT=0)
var FP_R_XSHIFT = (FP_ST_N - FP_ST_N_R) * FP_ST_RUN;   // 옥상 도막의 첫 단이 +X로 밀리는 양(≈0.98m)
/* v122: 자유 탐색에서 옥탑방 데크 계단을 밟고 데크 위까지 올라갈 수 있게 —
   fpMakeRoofSkipFloor가 지은 계단·데크의 실제 치수를 여기에 적어 두고(옥탑방 로컬 좌표,
   y는 옥상 바닥 기준), fpFreeTick이 매 프레임 서 있는 자리의 높이를 이 값으로 계산한다. */
var fpRoofDeckGeo=null;
