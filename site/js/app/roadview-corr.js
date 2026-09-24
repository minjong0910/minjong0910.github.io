"use strict";
/* roadview-corr.js — 1인칭 로드뷰 — 엘리베이터 홀 · 복도 · 층별 복도 짓기
   (예전 한 파일 main.js 의 10803~11529줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
/* 엘리베이터 승강장 마감 — 지하부터 5층까지 똑같은 모양으로 쓴다.
   (예전엔 지하 1층만 예전 코드가 남아 문도 넓고 버튼판도 없었다) */
function fpMakeEvLanding(g, lv, evZ, evW, evH, H, ko){
  var EVX=FP_WALL_X-0.03, JW=0.16, MET=0xB9C6D0, MET2=0x8A97A2;
  [-1,1].forEach(function(sn){                      // 양옆 문설주
    var j=fpMkPlane(JW, evH+JW*2, MET, 1);
    j.rotation.y=-Math.PI/2;
    j.position.set(EVX, (evH+JW*2)/2-JW, evZ+sn*(evW/2+JW/2)); g.add(j);
    var jl=fpMkPlane(0.03, evH+JW*2, MET2, 1);
    jl.rotation.y=-Math.PI/2;
    jl.position.set(EVX-0.004, (evH+JW*2)/2-JW, evZ+sn*(evW/2+JW-0.02)); g.add(jl);
  });
  var jt=fpMkPlane(evW+JW*2, JW, MET, 1);           // 윗설주
  jt.rotation.y=-Math.PI/2; jt.position.set(EVX, evH+JW/2, evZ); g.add(jt);
  var evSill=fpMkBox(0.20, 0.035, evW, MET2, 1);    // 문턱
  evSill.position.set(FP_WALL_X-0.06, 0.075, evZ); g.add(evSill);
  var evLite=new THREE.PointLight(0xCFE8FF, 0.9, 4.5);   // 복도에서도 문이 밝게 보이도록
  evLite.position.set(FP_WALL_X-0.9, evH*0.65, evZ); g.add(evLite);
  /* 층 표시기 : 윗설주와 복도 천장(2.55) 사이 틈에 딱 들어가게 둔다 */
  var indH=Math.max(0.16, Math.min(0.24, H-(evH+JW)-0.06));
  var evInd=fpMkTex(indH*2.5, indH, fpEvHallTex(lvLabel(lv), 0), 1);
  evInd.rotation.y=-Math.PI/2;
  evInd.position.set(EVX-0.02, (evH+JW+H)/2, evZ); g.add(evInd);
  fpEvInds.push(evInd);
  var callZ=evZ+(evW/2+JW+0.32);                    // 호출 버튼판 — 문 반대쪽
  var cpB=fpMkPlane(0.28, 0.44, MET2, 1);
  cpB.rotation.y=-Math.PI/2; cpB.position.set(EVX-0.004, 1.18, callZ); g.add(cpB);
  var cpT=fpMkTex(0.22, 0.36, fpEvCallTex(), 1);
  cpT.rotation.y=-Math.PI/2; cpT.position.set(EVX-0.02, 1.18, callZ); g.add(cpT);
  [-1,1].forEach(function(s2){                      // 개구부 테두리
    /* 이 사이버펑크풍 시안 네온 트림이 복도에서 보면 정체불명의
       파란 줄무늬(특히 안쪽 깊숙이 볼 때 천장 쪽으로 길게 번져 보임)로
       보였다 — 실제 엘리베이터 문틀처럼 무광 금속 트림으로 자연스럽게
       바꾼다(발광 없음). */
    var e=fpMkPlane(0.04,evH,MET2,1);
    e.rotation.y=-Math.PI/2; e.position.set(FP_WALL_X-0.02, evH/2, evZ+s2*(evW/2+0.01)); g.add(e);
  });

}
/* ── 실사형 개선 : 복도 천장 신설 + 매립등 조명 ──────────────────────────
   기존엔 복도 위쪽이 그냥 뚫려 있었다(1인칭 전용 어두운 캡만 카메라를
   따라다녔을 뿐, 고정된 천장 메시가 없었다) — 실제 사진처럼 밝은 회색
   천장판을 복도 길이에 맞춰 고정 배치하고, 그 중앙을 따라 일정 간격으로
   매립등 기구(자발광 플레이트) + 연한 아이보리빛 PointLight를 두어
   따뜻한 실내 조명을 낸다. 파라미터는 각 상수 옆 주석 참고. */
function fpMakeCorrCeiling(z0, z1, holes){
  var g=new THREE.Group();
  var ceilY=FP_CEIL_H-0.02;                      // 천장 마감면 높이 — 벽 상단과 거의 맞닿게
  var cw=CORR_HALF*2+0.24, len=z1-z0, cz=(z0+z1)/2;
  /* 계단(중앙·비상) 개구부 자리는 천장판을 비워 둔다 — 계단을
     오르내릴 때 카메라가 이 판을 그대로 뚫고 지나가는 것처럼 보이던 문제. */
  holes = holes || [];
  (function(){
    var segs=[], cur=z0;
    holes.slice().sort(function(a,b){ return a.z-b.z; }).forEach(function(h){
      var a=h.z-h.w/2, b=h.z+h.w/2;
      if(a>cur) segs.push([cur,a]);
      cur=Math.max(cur,b);
    });
    if(z1>cur) segs.push([cur,z1]);
    segs.forEach(function(s){
      var segLen=s[1]-s[0], segCz=(s[0]+s[1])/2;
      if(segLen<=0.02) return;
      var ceil=fpMkPlane(cw, segLen, 0xF2F0EA, 1);   // 흰색/밝은 회색 천장 마감(색상만 조정 가능)
      ceil.rotation.x=Math.PI/2; ceil.position.set(0, ceilY, segCz); g.add(ceil);
    });
  })();

  var FIX_GAP=3.6;                                // ← 매립등 기구(시각적 플레이트) 간격(m)
  var FIX_W=0.9, FIX_D=0.28;                      // ← 매립등 기구 크기(m)
  var FIX_INTENSITY=0.24, FIX_DIST=4.2;           // ← PointLight 세기/도달거리(눈부심 추가로 낮춤)
  var LIGHT_MAX=8;                                // ← 복도 하나당 실제 PointLight 최대 개수
  var n=Math.max(1, Math.round(len/FIX_GAP));
  var lightEvery=Math.max(1, Math.ceil(n/LIGHT_MAX));  // 기구는 촘촘히, 실제 광원은 성능을 위해 듬성듬성
  var placed=0;
  for(var i=0;i<n;i++){
    var fz=z0 + (i+0.5)*(len/n);
    var inHole = holes.some(function(h){ return Math.abs(fz-h.z) < h.w/2; });
    if(inHole) continue;               // 뚫린 자리 위에는 매립등을 두지 않는다
    var fix=fpMkPlane(FIX_W, FIX_D, 0xE8D9AE, 1, 0xE8D9AE);  // 자발광(emissive) 매립등 플레이트(색 자체도 낮춤)
    fix.rotation.x=Math.PI/2; fix.position.set(0, ceilY-0.02, fz); g.add(fix);
    if(placed%lightEvery===0){
      var pl=new THREE.PointLight(0xFFF8E7, FIX_INTENSITY, FIX_DIST, 2);  // 아이보리빛, 아래로 은은하게
      pl.position.set(0, ceilY-0.08, fz);
      g.add(pl);
    }
    placed++;
  }
  return g;
}
function fpMakeCorr(lv){
  var koL=(LANG==='ko');
  if(lv==='R')  return fpMakeRoof(koL);    // 옥상은 바깥이라 또 따로 짓는다
  if(lv==='B1') return fpMakeB1(koL);      // 지하는 구조가 완전히 달라 따로 짓는다
  var g=new THREE.Group();
  var ST=BUILDING_Z_STRETCH, H=FP_CEIL_H;
  var L=FLOOR_LAYOUT[lv];
  var z0=GLOBAL_BOT_Z*ST, z1=GLOBAL_TOP_Z*ST;
  var ko=(LANG==='ko');

  /* 벽 조각 하나 : 벽면 + 걸레받이 + 천장 쪽 네온선 */
  function seg(side, zc, w, y0, h, bright){
    if(w<=0.02 || h<=0.02) return;
    var rot=(side>0) ? -Math.PI/2 : Math.PI/2;
    var wall=fpMkPlane(w,h,0xE8DFC8,1,0x9C8F6E);   // 크림색 벽지
    /* 버그 수정: 화장실 알코브 옆에 덧댄 보강 패널(13119 등)이
       알코브 입구 그늘에 가려 다른 복도 벽보다 훨씬 어둡게(짙은 남색에
       가깝게) 렌더링돼, 문 위가 뻥 뚫린 것처럼 보였다 — 이 패널만 발광
       강도를 높여, 주변 조명 상황과 상관없이 다른 복도 벽과 똑같이 밝은
       크림색으로 보이게 한다. */
    if(bright) wall.material.emissiveIntensity = 1.15;
    wall.rotation.y=rot; wall.position.set(side*FP_WALL_X, y0+h/2, zc); g.add(wall);
    if(y0<0.01){
      var kb=fpMkPlane(w,0.19,0x080C13,1);
      kb.rotation.y=rot; kb.position.set(side*(FP_WALL_X-0.012), 0.095, zc); g.add(kb);
    }
    /* 실사형 개선 : 벽-천장 경계가 흐릿하다는 피드백 반영 — 기존 반투명
       시안 네온 라인(예전 사이버펑크 시안 잔재, opacity 0.22라 존재감이
       약했다) 대신, 실제 사진처럼 짙은 크라운 몰딩(불투명)을 벽 맨 위에
       둔다. 새로 생긴 복도 천장판(fpMakeCorrCeiling) 바로 아래라 경계가
       뚜렷하게 잡힌다. */
    if(y0+h > H-0.02){
      var mold=fpMkPlane(w,0.05,0x5B4F3D,1);
      mold.rotation.y=rot; mold.position.set(side*(FP_WALL_X-0.012), H-0.03, zc); g.add(mold);
    }
  }
  /* 개구부(엘리베이터)만 비워 두고 벽을 이어 붙인다 */
  function wall(side, holes){
    holes.sort(function(a,b){ return a.z-b.z; });
    var cur=z0;
    holes.forEach(function(o){
      var a=o.z-o.w/2, b=o.z+o.w/2;
      if(a>cur) seg(side,(cur+a)/2, a-cur, 0, H);
      seg(side, o.z, o.w, o.h, H-o.h);          // 개구부 위 상인방
      cur=Math.max(cur,b);
    });
    if(z1>cur) seg(side,(cur+z1)/2, z1-cur, 0, H);
  }
  /* 벽에 문을 붙인다. depth 를 주면 복도 벽보다 그만큼 안쪽(알코브 안)에 선다. */
  function putAt(side, zc, o, depth){
    var d=fpMakeDoor(o);
    d.rotation.y=(side>0) ? -Math.PI/2 : Math.PI/2;
    d.position.set(side*(FP_WALL_X+(depth||0)-0.035), 0, zc);
    g.add(d);
  }
  function put(side, zc, o){ putAt(side, zc, o, 0); }

  // ── 엘리베이터 개구부(캡이 그 뒤에 있으므로 벽을 뚫어 둔다) ──
  var ev=evXZ(lv);
  var evZ=ev.z*ST, evW=FP_EV_DW+0.14, evH=FP_CAB_H*0.85+0.06;
  var isG = (lv===1);                       // 1층에만 정문·동문·서문이 있다
  var stZ0=stZOf(lv)*ST;
  /* 비상계단도 중앙계단처럼 벽을 뚫어 개방한다(예전엔 닫힌 문만 있었다) */
  var esP0=EMSTAIR_POS[lv], esZW=(esP0 && esP0.xWhole>0) ? esP0.z*ST : null;
  /* 버그 수정: 중앙계단 개구부 폭은 fpMakeStairwell의 owAuto가
     "1층이거나, 위/아래층이 1층이면 1.4배"로 정한다 — 즉 B1·1층·2층 세 층이
     넓은 개구부를 쓴다. 그런데 여기 복도 벽 구멍(holesR)은 lv===1 일 때만
     1.4배를 적용하고 있어서, B1·2층은 실제 계단실보다 벽 구멍이 0.88m씩
     좁았다. 그 결과 개구부 테두리 띠(아래 fpMakeStairwell의 c9cfd4 세로선)가
     구멍 가장자리가 아니라 통짜 벽 한복판에 얹혀, 계단실 안에서 보면 벽에
     회색 막대 하나가 붙어 있는 것처럼 보였다 — owAuto와 같은 규칙으로 맞춘다. */
  var _stIdx = lvIndex(lv);
  var stOWreal = FP_ST_OW *
    ((lv===1 || LEVELS[_stIdx+1]===1 || LEVELS[_stIdx-1]===1) ? 1.4 : 1);
  /* 원복 + 재수정: 한 번은 중앙계단 개구부를 복도 천장(H)까지
     뚫어 인방(개구부 위 통짜 벽)을 없애 봤는데, 계단실 위로 한 층 층고가
     통째로 드러나 오히려 어색했고 1층은 위가 뻥 뚫려 보였다 — 개구부
     높이는 원래대로 되돌리고, 대신 그 인방을 실제 사진(1층 후문 통로)처럼
     '개구부 윗선 리빌(그림자 홈) + 검은 사인 밴드'로 마감해서, 밋밋한
     크림색 빈 면이 아니라 의도된 헤더로 읽히게 한다. */
  var holesR=[{z:evZ, w:evW, h:evH}, {z:stZ0, w:stOWreal, h:FP_ST_OH}];
  if(esZW!==null) holesR.push({z:esZW, w:FP_EM_OW, h:FP_ST_OH});
  wall( 1, holesR);
  (function(){
    /* 여기에 '중앙계단 CENTRAL STAIRS' 검은 사인 밴드를 달아 봤는데
       글씨가 너무 커서 오히려 눈에 걸렸다 — 밴드·글씨·몰딩은 없애고, 비상계단
       개구부처럼 개구부 윗선의 얇은 리빌(그림자 홈) 하나만 남겨 깔끔하게 둔다. */
    var revH=0.055;
    [[1, FP_WALL_X+0.02, Math.PI/2], [-1, FP_WALL_X-0.02, -Math.PI/2]].forEach(function(f){
      var rev=fpMkPlane(stOWreal+0.10, revH, 0x14181D, 1);      // 개구부 윗선 그림자 홈
      rev.rotation.y=f[2]; rev.position.set(f[1], FP_ST_OH+revH/2, stZ0); g.add(rev);
    });
    /* 계단실 안에서 복도 쪽을 돌아보면, 이 인방(개구부 위 벽)만
       복도 벽지(밝은 크림 0xE8DFC8)라 그 위로 이어지는 계단실 벽(0xC9C0AE)과
       색이 뚝 끊겨, 밝은 띠 하나가 덧대어진 것처럼 보였다 — 계단실 쪽 면만
       계단실 벽과 같은 톤의 판으로 덮어 위아래가 한 장의 벽으로 읽히게 한다.
       (복도 쪽 면은 그대로 크림색 벽지 — 복도에서는 벽이 이어져야 맞다) */
    var covH=H-(FP_ST_OH+revH);
    if(covH>0.05){
      var cov=fpMkPlane(stOWreal+0.30, covH, 0xC9C0AE, 1, 0x39352B);
      cov.rotation.y=Math.PI/2;
      cov.position.set(FP_WALL_X+0.025, FP_ST_OH+revH+covH/2, stZ0); g.add(cov);
    }
  })();
  /* 버그 수정: 이 계단 개구부 프레임(차콜 테두리)이 여러 층이
     동시에 그려지는 걷기 연출 중에 다른 층의 프레임과 비스듬한 각도에서
     겹쳐 보여, 벽 사이에 떠 있는 가느다란 기둥처럼 보이는 문제가 있었다
     — 장식용 요소이므로 문제를 없애기 위해 아예 없앤다. */
  /* 2~5층 : 엘리베이터 맞은편이 통짜 벽이라 '큰 빈 공간'이 안 보였다
     → 코어 앞부터 화장실 앞까지를 크게 뚫고 그 안에 열린 공간을 만든다. */
  var openZc=null, openSpan=0;
  if(!isG && L){
    var tlz=FACILITIES.toilet.z*ST;
    var oa=-CORE_HALF*ST+0.35, ob=tlz-FP_ALC_HW-2.45;   // 화장실 알코브 자리는 비워 둔다
    if(ob-oa > 4){ openSpan=ob-oa; openZc=(oa+ob)/2; }
  }
  var holesL = isG ? [{z:0, w:FP_HALL_HW*2, h:H}]
                   : (openZc!==null ? [{z:openZc, w:openSpan, h:H}] : []);
  /* 화장실은 복도 벽에 바로 붙어 있지 않고, 사진처럼
     복도에서 살짝 안쪽으로 들어간 공간 안에 문이 있다 → 그만큼 벽을 뚫는다. */
  if(L && FACILITIES.toilet.x < 0)
    holesL.push({z:fpToiletZ(lv), w:FP_ALC_HW*2, h:FP_ALC_H});
  wall(-1, holesL);
  /* 복도 바닥 : 건물 3D의 바닥/상자가 복도 밑으로 비쳐 노란 덩어리가 보였다
     → 재생 중에만 복도 폭만큼 불투명한 바닥을 한 겹 덮는다.
     원상복구: 복도 바닥·천장에 계단 개구부 구멍을 뚫었더니 복도
     쪽에서 계단실이 창문처럼 뚫려 보이는 부작용이 생겼다 — 복도 바닥·천장은
     다시 통짜 판으로 되돌린다(계단 헤드룸 문제는 계단실 쪽에서 따로 고친다). */
  var cfl=fpMkFloorGloss(CORR_HALF*2+0.24, z1-z0, fpTerrazzoTex());
  cfl.rotation.x=-Math.PI/2; cfl.position.set(0, 0.06, (z0+z1)/2); g.add(cfl);
  g.add(fpMakeCorrCeiling(z0, z1));
  /* ── 엘리베이터 밖기기(복도 쪽) ──
     예전엔 물색 테두리만 있는 회색 벽이라 엘리베이터로 안 보였다
     → 실제처럼 스테인리스 문설주 + 호출 버튼판 + 층 표시기 + 문턱을 달아 둔다. */
  fpMakeEvLanding(g, lv, evZ, evW, evH, H, ko);
  /* 열린 공간과 화장실 통로 사이의 복도 벽 — 사진처럼 게시판을 붙이고
     그 앞에 정수기와 쓰레기통을 둔다. (예전엔 폭이 70cm밖에 안 돼 아무것도 못 놓았다) */
  if(L && openZc!==null && FACILITIES.toilet.x < 0){
    var pnZ=(openZc+openSpan/2 + (FACILITIES.toilet.z*ST-FP_ALC_HW))/2;
    var pnX=-FP_WALL_X+0.05;
    var nb=fpMakeNotice(1.72, ko?'알림마당':'NOTICE', ko);
    nb.rotation.y=Math.PI/2; nb.position.set(pnX, 0, pnZ); g.add(nb);
    var cw2=fpMakeCooler();
    cw2.rotation.y=Math.PI/2; cw2.position.set(pnX-0.02, 0, pnZ-1.02); g.add(cw2);
    var bn2=fpMakeBins();
    bn2.rotation.y=Math.PI/2; bn2.position.set(pnX-0.02, 0, pnZ+1.05); g.add(bn2);
  }

  /* ── 엘리베이터 정면 ──
     여기 붙어 있던 층 안내 게시판은 없앤다(실제 건물에는 없다).
     빈 공간이 생기는 층은 창틀·사물함·정수기가 있는 열린 공간으로 채운다. */
  if(openZc!==null) g.add(fpMakeOpenArea(lv, openZc, openSpan, ko, lv===2));

  // ── 중앙계단 : 문이 아니라 뚫린 계단실 ──
  /* 1층 중앙계단만 실사 사진처럼 넓게 — owMul(원래 옥상 전용 파라미터)을 재사용해
     개구부·단 폭을 1.4배로 키운다(1.3~1.5배 범위). 2~5층은 owMul 생략(=1)
     이라 기존 폭 그대로다. */
  /* 버그 수정: 여기서 owMul을 항상 넘기고 있어서(1층이 아니면 1),
     fpMakeStairwell 안의 owAuto("1층과 맞닿는 층은 1.4배")가 아예 동작하지
     못했다 — 정작 복도 벽 구멍(holesR)은 위에서 stOWreal로 owAuto와 같은
     규칙(2층도 1.4배)을 쓰고 있었기 때문에, 2층만 "벽 구멍은 6.16m인데
     계단실은 4.4m"라 계단실 벽·바닥이 구멍보다 좁아 그 틈으로 바깥(빈 공간)이
     그대로 보였다("2층 계단 프레임이 뒤틀려 보인다"의 정체). 또 같은 이유로
     2층의 내려가는 단이 1층의 올라가는 단과 폭·중심이 어긋나 있었다.
     1층만 명시적으로 1.4배를 주고, 나머지 층은 owAuto가 판단하게 둔다. */
  g.add(fpMakeStairwell(lv, stZ0, ko, false, undefined, (lv===1?1.4:undefined)));
  /* 최종: "1층에 서 있어도 지하 계단이 보이게" 하려고 B1의 계단
     매스를 1층 씬에 함께 끼워 넣었었는데, 1층 바닥을 다시 통짜로 막은
     뒤로는 이 B1 매스의 윗부분(1층 바닥보다 0.45m 위까지 올라온 부분)이
     바닥을 뚫고 튀어나온 상자처럼 보이는 새 버그가 생겼다(사진 반영).
     이 "살짝 보이기" 기능 자체를 포기했으므로, B1 매스를 1층에 끼워 넣는
     것 자체를 그만둔다 — 그 경계를 표시하던 빨간 선도 같이 없앤다. */

  // ── 강의실 문 + 명찰 ──
  if(L){
    /* 화장실 알코브 바로 옆 호실은 명찰이 뻗는 방향(복도 쪽)에 알코브 입구의 빈 공간이
       있어 벽 없이 허공에 떠 보였다 — 이 호실들만 명찰을 반대쪽(실제 벽이 있는 쪽)으로 뒤집는다. */
    var WC_ADJ_FLIP = {'13119':1,'13224':1,'13324':1,'13419':1,'13522':1};
    L.cells.forEach(function(c){
      if(!c.code) return;
      var full=c.parent || c.code;
      var isT=(target && target.kind==='room' &&
               isTargetMesh({userData:{floor:lv, code:c.code, parent:c.parent}}));
      var nm=shortRoomName(rn(ROOM_NAME[full]));
      /* 엘리베이터 기준 어느 쪽 복도인지에 따라 문틀·명찰 색을 나눈다
         (정면 안내판의 ← 시안 / → 주황과 같은 색) — 어느 방향으로 가야 하는지
         문만 봐도 바로 구분된다. */
      var sideAc = (c.z >= ev.z) ? '#00E5FF' : '#FFB33C';
      put((c.x>0?1:-1), fpDoorZ(full, c.z*ST), {
        plate: full, plateSub: nm || '',
        roomName: ROOM_NAME[full] || '', kind: fpRoomKind(ROOM_NAME[full]),
        accent: isT ? '#FF2E88' : sideAc, target: !!isT,
        labelFlip: !!WC_ADJ_FLIP[full]
      });
      /* 위 labelFlip은 명찰 방향만 뒤집었을 뿐, 화장실 알코브 개구부(holesL)가
         이 호실 문 자리까지 넓게 뻗어 있어서 실제로는 문 옆/뒤가 뻥 뚫린 채
         비어 보이는 문제가 남아 있었다 — 그 남는 구멍만 복도 벽과 같은
         마감의 패널로 막는다.
         (버그 수정): 예전엔 호실 자리에 폭 1.4m 패널을 통째로 세웠는데,
         이 패널 구간(z 9.52~10.92)이 층마다 같은 반면 알코브 개구부는 1층만
         +0.88m 밀려 있다(fpToiletZ가 lv===1을 특수 처리) — 그래서 1층에서는
         이 패널이 개구부(7.23~10.53) 한가운데를 1m나 가로막아 화장실 앞에서
         복도가 벽으로 막힌 것처럼 보였다(다른 층은 0.13m만 걸쳐 티가 안 났다).
         이제 알코브 개구부 '바깥'으로 삐져나온 부분만 남기고 잘라낸다. */
      /* 버그 수정: 여기서 이 호실들(13119·13224·13324·13419·13522)
         자리에 '보강 패널'을 한 겹 더 세우고 있었는데, 그 패널이 복도 벽과
         정확히 같은 평면(x=±FP_WALL_X)에 놓여 있어 두 면이 서로 앞다투어
         그려졌다(z-fighting) — 문 위쪽이 흰색으로 번쩍이며 깨져 보이던 정체다.
         이 패널은 원래 "알코브 개구부가 문 자리까지 넓게 뻗어 벽이 비던" 걸
         메우려던 것인데, 이제 문을 개구부에서 0.9m 떨어뜨려 놓았으므로
         복도 벽(wall())이 그 구간을 이미 온전히 막고 있다 — 통째로 없앤다. */
    });
    /* ── 화장실 : 복도에서 꿗어 들어가는 통로 안에 있고,
       두 문은 통로 양옆 벽에서 서로 마주 본다.
       엘리베이터 쪽에서 걸어와 통로로 들어서면 왼쪽이 남자, 오른쪽이 여자. */
    var tl=FACILITIES.toilet, tsd=(tl.x>0?1:-1), tz=fpToiletZ(lv);
    var isTt=(target && target.kind==='toilet' && target.floor===lv);
    var tAc = isTt ? '#FF2E88' : '#00E5FF';
    var aX0=tsd*FP_WALL_X, aXb=tsd*(FP_WALL_X+FP_ALC_D), aXm=(aX0+aXb)/2;
    /* 실제 사진처럼 어두운 홀로그램 톤이 아니라 밝은 타일 바닥 · 크림색 벽 통로 */
    var afl=fpMkPlane(FP_ALC_D, FP_ALC_HW*2, 0xB7B2A6, 1);
    afl.rotation.x=-Math.PI/2; afl.position.set(aXm, 0.062, tz); g.add(afl);
    var acl=fpMkPlane(FP_ALC_D+0.06, FP_ALC_HW*2+0.06, 0xE9E5D9, 1);
    acl.rotation.x=Math.PI/2; acl.position.set(aXm, FP_ALC_H+0.012, tz); g.add(acl);
    var abw=fpMkPlane(FP_ALC_HW*2, FP_ALC_H, 0xDCD7C9, 1, 0x1B1912);   // 통로 끝 막힌 벽
    abw.rotation.y=Math.PI/2; abw.position.set(aXb, FP_ALC_H/2, tz); g.add(abw);
    /* 사진처럼 막다른 벽에 초록 게시판이 붙어 있다 — 밋밋한 빈 벽 대신 실제 공간 느낌 */
    var abd=fpMkBox(0.05, 1.05, 1.85, 0x2E6B4A, 1, 0x0E2418);
    abd.position.set(aXb-0.03, FP_ALC_H*0.52, tz); g.add(abd);
    var abdFr=fpMkPlane(0.06, 1.15, 1.95, 0xC7CDD2, 0.9);
    abdFr.rotation.y=Math.PI/2; abdFr.position.set(aXb-0.055, FP_ALC_H*0.52, tz); g.add(abdFr);
    [-1,1].forEach(function(sn){                                        // 양옆 벽 + 걸레받이
      var asw=fpMkPlane(FP_ALC_D, FP_ALC_H, 0xDCD7C9, 1, 0x1B1912);
      asw.position.set(aXm, FP_ALC_H/2, tz+sn*FP_ALC_HW); g.add(asw);
      var ask=fpMkPlane(FP_ALC_D, 0.16, 0x2A2820, 1);
      ask.position.set(aXm, 0.08, tz+sn*(FP_ALC_HW-0.012)); g.add(ask);
    });
    var alp=fpMkPlane(FP_ALC_D*0.55, FP_ALC_HW*1.2, 0xFFF6E2, 0.85);    // 통로 천장등(형광등 톤)
    alp.rotation.x=Math.PI/2; alp.position.set(aXm, FP_ALC_H-0.03, tz); g.add(alp);
    // 복도에서도 보이도록 입구 상인방에 화장실 표시
    /* 천장판이 새로 생기면서(H와 같은 높이) 기존 계산식((FP_ALC_H+H)/2)이
       천장 바로 그 높이(=천장판과 겹침)에 표지판을 놓아, 낮은 각도에서 보면
       천장을 뚫고 글자가 깨져 보이는 문제가 있었다(확실히 천장
       아래로 내린다). */
    /* 삭제: 통로 입구 상인방에 붙여 두었던 남/여 픽토그램을 없앤다 —
       그 자리가 복도 천장판이 끝나는 어두운 구간이라, 벽에 붙은 표지가 아니라
       허공에 떠 있는 파란 사람 두 명처럼 보였다. 화장실 표시는 통로 안쪽
       두 문에 붙은 표지판으로 충분하다. */
    /* 통로 양옆 벽에 마주 보는 두 문.
       -Z 벽 문은 +Z 를 바라보고(rotation.y=0), +Z 벽 문은 그 반대. */
    function putFacing(zWall, faceZ, o){
      var d=fpMakeDoor(o);
      d.rotation.y=(faceZ>0) ? 0 : Math.PI;
      d.position.set(tsd*(FP_WALL_X+FP_ALC_DX), 0, zWall);
      g.add(d);
    }
    /* 남자화장실은 지금 쓰던 색(시안)을 그대로 두고, 여자화장실만
       분홍으로 구분한다. 목적지일 때도 색으로 남/여를 구분해야 하므로 색은
       바꾸지 않고, 목적지 표시는 문 둘레의 맥동 발광(o.target)으로만 준다. */
    putFacing(tz-FP_ALC_HW+0.035, 1, {w:1.24, window:false, sign:'wcM', accent:'#00B4E6',
      target:!!isTt, plate: ko?'남자화장실':'MEN', plateSub:'MEN'});
    putFacing(tz+FP_ALC_HW-0.035, -1, {w:1.24, window:false, sign:'wcW', accent:'#F2569B',
      target:!!isTt, plate: ko?'여자화장실':'WOMEN', plateSub:'WOMEN'});
    // ── 비상계단 : 닫힌 문 대신 개방된 계단실 — 직접 오르내릴 수 있다 ──
    if(esZW!==null){
      g.add(fpMakeStairwell(lv, esZW, ko, true));
      /* 입구 철제 쌍여닫이문(살구색) — 사진처럼 활짝 열려 복도 벽에 붙어 있다
         (닫힌 모습으로 바꿨더니 화면을 꽉 채워 오히려 답답해 보여서
         다시 열린 모습으로 되돌린다). */
      var emFrCol=0x7E93A6, emDrCol=0xE4B18C, emLfW=FP_EM_OW/2-0.06;
      [-1,1].forEach(function(dsn){
        var emJb=fpMkBox(0.12, 2.24, 0.14, emFrCol, 1);
        emJb.position.set(FP_WALL_X-0.02, 1.12, esZW+dsn*(FP_EM_OW/2+0.06)); g.add(emJb);
        var emLf=fpMkBox(0.06, 2.10, emLfW, emDrCol, 1, 0x3A2A1C);
        emLf.position.set(FP_WALL_X-0.11, 1.05, esZW+dsn*(FP_EM_OW/2+emLfW/2+0.13)); g.add(emLf);
        var emCl=fpMkBox(0.05, 0.07, 0.30, 0xB6BEC4, 1);   // 도어클로저
        emCl.position.set(FP_WALL_X-0.15, 2.02, esZW+dsn*(FP_EM_OW/2+0.34)); g.add(emCl);
      });
      var emHd=fpMkBox(0.12, 0.14, FP_EM_OW+0.36, emFrCol, 1);
      emHd.position.set(FP_WALL_X-0.02, 2.31, esZW); g.add(emHd);
      /* v149: 목적지일 때 개구부 위에 얹던 분홍 표시선(0xFF2E88)은 없앤다 —
         초록 비상구 표지판 바로 위에 형광 띠가 하나 더 걸려 있어 지저분했고,
         '여기가 목적지'라는 신호는 v148에서 넣은 바닥 초록 고리가 대신한다. */
    }
  }

  // ── 복도 양 끝 : 1층은 실제 출입문(동문·서문), 나머지 층은 막음벽 ──
  if(isG){
    /* 동문·서문도 정문과 똑같은 모양으로 세운다.
       (예전에는 폭이 복도보다 좁고 좌우 마감이 없어 문만 덩그러니 떠 보였다) */
    var sgW = CORR_HALF*2 - 0.3, sgS = (CORR_HALF*2 - sgW)/2;   // 정문과 같은 비율
    [[z0, 1, ko?'\ub3d9\ubb38':'EAST GATE'], [z1, -1, ko?'\uc11c\ubb38':'WEST GATE']].forEach(function(a){
      var zc=a[0], dir=a[1], nm=a[2];
      // 문 좌우 벽 + 문 위 상인방(정문 현관과 같은 마감)
      [-1,1].forEach(function(sn){
        var w=fpMkPlane(sgS,H,0xE8DFC8,1,0x9C8F6E);
        w.position.set(sn*(sgW/2+sgS/2),H/2,zc); g.add(w);
      });
      var gate=fpMakeGate({w:sgW, sign:nm, accent:'#8FE3E0'});   // 정문과 동일(높이도 기본값)
      if(dir<0) gate.rotation.y=Math.PI;
      gate.position.set(0,0,zc+dir*0.05); g.add(gate);
      // 문 바깥쪽(건물 밖) 어둡게 막고 문턱 라인
      var bk=fpMkPlane(CORR_HALF*2,H,0x0A1018,1);
      bk.position.set(0,H/2,zc-dir*0.06); g.add(bk);
      var ed=fpMkPlane(CORR_HALF*2,0.16,0xB0B6BC,1);        // 문턱 금속 라인(복도와 통일 —)
      ed.rotation.x=-Math.PI/2; ed.position.set(0,0.07,zc+dir*0.30); g.add(ed);
    });
  }else{
    var cA=fpMkPlane(CORR_HALF*2,H,0xE8DFC8,1); cA.position.set(0,H/2,z0); g.add(cA);
    var cB=fpMkPlane(CORR_HALF*2,H,0xE8DFC8,1); cB.position.set(0,H/2,z1); g.add(cB);
    [[z0,1],[z1,-1]].forEach(function(a){
      var ln=fpMkPlane(CORR_HALF*2,0.05,0x5B4F3D,1);        // 크라운 몰딩(복도와 통일 —)
      ln.position.set(0,H-0.03,a[0]+a[1]*0.01); g.add(ln);
    });
  }

  /* ── 1층 정문 현관 ────────────────────────────────────────────
     로드뷰는 실제로 찾아오는 것과 똑같이 '정문 앞'에서 출발하므로,
     정문 유리문 · 현관 통로(양옆 벽) · 문 앞 광장을 함께 세운다. */
  if(isG){
    var hw=FP_HALL_HW, gx=FP_GATE_X, inX=-FP_WALL_X;
    var hallLen=inX-gx;                                   // 정문 → 복도까지 거리
    // 현관 바닥(복도와 같은 톤) + 천장(복도와 같은 톤으로 통일 —)
    var hfl=fpMkPlane(hallLen, hw*2, 0x39465A, 1);
    hfl.rotation.x=-Math.PI/2; hfl.position.set(gx+hallLen/2, 0.055, 0); g.add(hfl);
    var hce=fpMkPlane(hallLen, hw*2, 0xF2F0EA, 1);        // 복도 천장과 같은 밝은 회색/흰색
    hce.rotation.x=Math.PI/2; hce.position.set(gx+hallLen/2, H-0.02, 0); g.add(hce);
    // 현관 양옆 벽(+ 걸레받이 + 크라운 몰딩)
    [-1,1].forEach(function(sn){
      var sw=fpMkPlane(hallLen,H,0xE8DFC8,1,0x9C8F6E);   // 크림색 벽지로 변경
      sw.rotation.y=(sn<0)?0:Math.PI;
      sw.position.set(gx+hallLen/2, H/2, sn*hw); g.add(sw);
      var sk=fpMkPlane(hallLen,0.19,0x080C13,1);
      sk.rotation.y=(sn<0)?0:Math.PI;
      sk.position.set(gx+hallLen/2, 0.095, sn*(hw-0.012)); g.add(sk);
      var sl=fpMkPlane(hallLen,0.05,0x5B4F3D,1);          // 크라운 몰딩(복도와 통일 —)
      sl.rotation.y=(sn<0)?0:Math.PI;
      sl.position.set(gx+hallLen/2, H-0.03, sn*(hw-0.012)); g.add(sl);
    });
    /* 현관 왼쪽(-Z) 벽 가운데 : 공용 컴퓨터 책상과 복사기.
       정문으로 들어오면 바로 왼쪽에 보이는 벽이라 펍 비어 있었다. */
    var hmX=gx+hallLen*0.70;   // 중문 안쪽 로비 가운데 — 방풍실과 겹치지 않게
    var cx0=hmX+0.95, cz0=-hw+0.38, cf=cz0+0.37;          // 복사기 중심 / 앞면
    var cpB=fpMkBox(0.88,0.78,0.72,0xD6DDE3,1); cpB.position.set(cx0,0.39,cz0); g.add(cpB);
    var cpT=fpMkBox(0.92,0.30,0.76,0xC0C9D1,1); cpT.position.set(cx0,0.93,cz0); g.add(cpT);
    var cpG=fpMkBox(0.64,0.035,0.52,0x2A333C,1); cpG.position.set(cx0,1.10,cz0); g.add(cpG);
    var cpP=fpMkPlane(0.36,0.15,0x1E262E,1); cpP.position.set(cx0,0.86,cf+0.02); g.add(cpP);
    var cpL=fpMkPlane(0.11,0.035,0x39FF88,0.9); cpL.position.set(cx0-0.09,0.86,cf+0.03); g.add(cpL);
    [0.56,0.40,0.24].forEach(function(ty){
      var tr=fpMkPlane(0.68,0.035,0x8A949C,1); tr.position.set(cx0,ty,cf+0.01); g.add(tr);
    });
    var dx0=hmX-1.00, dz0=-hw+0.36;                        // 컴퓨터 책상
    var dtp=fpMkBox(1.52,0.06,0.68,0x8C7A63,1,0x201A12); dtp.position.set(dx0,0.74,dz0); g.add(dtp);
    [-1,1].forEach(function(sn){
      var lg=fpMkBox(0.07,0.71,0.62,0x4A5566,1);
      lg.position.set(dx0+sn*0.69,0.355,dz0); g.add(lg);
    });
    var mz=dz0+0.06;                                       // 모니터(화면은 복도 쪽을 본다)
    var mst=fpMkBox(0.26,0.05,0.20,0x2B333B,1); mst.position.set(dx0-0.20,0.80,mz); g.add(mst);
    var mnk=fpMkBox(0.06,0.24,0.06,0x2B333B,1); mnk.position.set(dx0-0.20,0.92,mz); g.add(mnk);
    var mbz=fpMkBox(0.68,0.44,0.05,0x1F262D,1); mbz.position.set(dx0-0.20,1.26,mz); g.add(mbz);
    var msc=fpMkPlane(0.60,0.36,0x2A6F8C,0.95); msc.position.set(dx0-0.20,1.26,mz+0.031); g.add(msc);
    var mgl=fpMkPlane(0.60,0.05,0xBFEBFA,0.35); mgl.position.set(dx0-0.20,1.36,mz+0.033); g.add(mgl);
    var kbd=fpMkBox(0.44,0.025,0.16,0x2B333B,1); kbd.position.set(dx0-0.20,0.79,dz0+0.24); g.add(kbd);
    var pcT=fpMkBox(0.20,0.44,0.44,0x232A31,1); pcT.position.set(dx0+0.50,0.22,dz0); g.add(pcT);
    var pcL=fpMkPlane(0.05,0.05,0x39FF88,0.9); pcL.position.set(dx0+0.50,0.36,dz0+0.225); g.add(pcL);
    /* ── 현관 : 사진과 같은 구성 ──
       바깥 정문 → 짧은 방풍실 → 중문 → 로비.
       방풍실 오른쪽에 빨간 음료 자판기가 붙어 있고,
       로비 오른쪽 벽에 학과 게시판 세 개·정수기·쓰레기통이 있다. */
    /* 방풍실이 2m밖이 안 돼서, 정문으로 들어서면 바로 중문에 코가 닿았다.
       사진처럼 자판기 옆에 사람이 설 공간이 남게 깊이를 늘린다. */
    var vestX = gx + 3.20, mdW = 2.60, mdH = 2.26;
    var sideW = hw - mdW/2;
    /* 중문 : 예전엔 부재마다 x 오프셋이 제각각이고(=이음새가 어긋나 보이고),
       손잡이 기둥만 허공에 떠 보였다 → 문설주·헤더·문짝 틀을 두께 있는 상자로,
       전부 같은 x(vestX)에 정렬해 "한 몸으로 연결된 문틀"로 다시 세운다. */
    var vjFR=0.14;                                   // 문틀 두께(X)
    [-1,1].forEach(function(sn){
      // 옆 고정 유리(측면 판) — 문설주·끝 기둥과 겹치도록 넉넉히 늘려서 어떤 각도에서도
      // 틈이 안 보이게 한다(딱 맞닿기만 하면 비스듬한 각도에서 실선처럼 가는 틈이 보였다).
      var gp=fpMkPlane(sideW+0.16, H-0.02, 0x3E5F6E, 0.34);
      gp.rotation.y=Math.PI/2;
      gp.position.set(vestX, (H-0.02)/2, sn*(mdW/2+sideW/2)); g.add(gp);
      // 문설주(개구부 양쪽 세로 기둥) — 바닥에서 천장까지, 상인방과 맞닿는다
      var mu=fpMkBox(vjFR, H, 0.12, 0xC6D2DA, 1);
      mu.position.set(vestX, H/2, sn*(mdW/2)); g.add(mu);
      // 벽 쪽 끝 기둥
      var ge=fpMkBox(vjFR, H, 0.10, 0xC6D2DA, 1);
      ge.position.set(vestX, H/2, sn*(hw-0.05)); g.add(ge);
      // 옆 판 가로 중간대 — 문설주와 끝 기둥 사이를 겹치게 이어서 틈을 없앤다
      var gm=fpMkBox(vjFR-0.04, 0.08, sideW+0.16, 0xC6D2DA, 1);
      gm.position.set(vestX, 1.05, sn*(mdW/2+sideW/2)); g.add(gm);
    });
    // 문 위 헤더 : 두 문설주 위를 가로질러 연결(기둥이 중간에 끊겨 보이지 않게)
    var vjHd=fpMkBox(vjFR, 0.10, mdW+vjFR, 0xC6D2DA, 1);
    vjHd.position.set(vestX, mdH+0.05, 0); g.add(vjHd);
    var mdLin=fpMkPlane(hw*2, Math.max(0.04,H-mdH-0.10), 0xD3DBE0, 1);
    mdLin.rotation.y=Math.PI/2; mdLin.position.set(vestX, (H+mdH+0.10)/2, 0); g.add(mdLin);
    // 미닫이 유리문 두 짝 : 유리 + 세로틀(스타일) + 상·중·하 레일 + 손잡이를
    // 문짝 하나의 그룹으로 묶어 붙인다(손잡이가 문에서 떨어져 떠 보이지 않게).
    [-1,1].forEach(function(sn){
      var vjLf=new THREE.Group();
      var vjW=mdW/2-0.03;
      var vjGl=fpMkPlane(vjW, mdH, 0x46707F, 0.30);
      vjGl.rotation.y=Math.PI/2; vjGl.position.set(0, mdH/2, 0); vjLf.add(vjGl);
      [ -vjW/2+0.045, vjW/2-0.045 ].forEach(function(zz){       // 세로 스타일(문짝 양끝 틀)
        var vjSt=fpMkBox(0.10, mdH, 0.09, 0xC6D2DA, 1);
        vjSt.position.set(0, mdH/2, zz); vjLf.add(vjSt);
      });
      [0.10, 1.02, mdH-0.06].forEach(function(yy){              // 아래·중간·위 레일
        var vjRl=fpMkBox(0.10, (yy===1.02)?0.12:0.10, vjW, 0xC6D2DA, 1);
        vjRl.position.set(0, yy, 0); vjLf.add(vjRl);
      });
      var vjHnd=fpMkBox(0.06, 0.92, 0.06, 0x9FB2BE, 1);         // 손잡이(가운데 맞닿는 틀에)
      vjHnd.position.set(-0.10, 1.12, -sn*(vjW/2-0.10)); vjLf.add(vjHnd);
      vjLf.position.set(vestX, 0, sn*(mdW/4));
      g.add(vjLf);
      /* 다가가면 옆으로 미끄러져 열리는 애니메이션 — 문짝이 각자 바깥쪽
         고정 유리(gp) 뒤로 vjW만큼 밀려나가 열린 것처럼 보이게 한다.
         경로 미리보기·직접 걸어보기 둘 다 같은 fpPos를 보므로 동일하게 동작한다. */
      fpRegisterAutoSlideDoor(vjLf, sn*(mdW/4), sn*vjW*0.94, 2.6, 0);
    });
    /* 1층 로비 오른쪽(게시판 쪽) 벽에 붙어 있던 영문 레터링
       (KUNSAN NATIONAL UNIVERSITY)을 삭제한다 — 실제 사진에는 이 자리에
       그런 글씨가 없다. */
    /* 자판기는 방풍실 왼쪽(-Z) 벽 — 정문으로 들어오면 왼손 쪽이다 */
    var vvm=fpMakeVending();
    vvm.position.set(gx+2.30, 0, -hw+0.42); g.add(vvm);
    /* 로비 오른쪽(+Z) 벽 : 학과 게시판 세 개 + 정수기 + 쓰레기통 */
    var rz = hw - 0.05;
    function putR(obj, x){
      obj.rotation.y = Math.PI;
      obj.position.set(x, 0, rz); g.add(obj);
    }
    var bdNames = ko ? ['전자공학과','전기공학과']
                     : ['Electronic Eng.','Electrical Eng.'];
    /* 실제 사진(1층 엘리베이터 앞) 반영: 게시판 밑에 나무 카운터/받침 같은 건
       없고, 게시판은 그냥 벽에 붙어 있고 정수기·상자·거치대·쓰레기통은 전부
       바닥에 직접 놓여 있다 — 이전에 넣었던 카운터(ledB/ledge)를 없애고,
       상자도 바닥에 놓는다. 겹치지 않도록 순서대로 간격을 둔다. */
    var bdX0=vestX+1.25;
    [0,1].forEach(function(bi){
      putR(fpMakeNotice(1.42, bdNames[bi], ko), bdX0+bi*1.48);
    });
    putR(fpMakeCardboardBox(), bdX0+2.55);
    putR(fpMakeCooler(), bdX0+3.15);   // 브로슈어 거치대 자리와 맞바꾼 위치
    putR(fpMakeBins(), bdX0+3.85);
    // 브로슈어 거치대(fpMakeRack)는 삭제 — 함수 정의는 남겨 둔다.
    // 정문 외벽(문 좌우 벽 + 문 위 상인방) — 문 폭 3.3 만 비워 둔다
    /* 사진처럼 정문은 한 덩어리가 아니라 가운데 기둥을 두고 두 개로 나눠져 있다 */
    var gw=2.55, pierW=1.10;
    var gzc=gw/2+pierW/2, sidew=hw-(gzc+gw/2);
    /* 문이 벽면보다 살짝 안쪽(gx-0.012)에 있어서, 기둥·옆벽을 문 폭에 딱 맞춰 세우면
       뒤돌아볼 때(반대쪽에서 볼 때) 문과 기둥/옆벽 사이에 아주 얇은 틈이 비쳐 보였다.
       기둥과 옆벽을 문 쪽으로 살짝(overlap) 더 겹치게 넓혀서 그 틈을 원천적으로 없앤다. */
    var ovl=0.05;
    [-1,1].forEach(function(sn){
      if(sidew>0.02){
        var sidewR=sidew+ovl;
        var fpn=fpMkPlane(sidewR,H,0xE8DFC8,1,0x9C8F6E);
        fpn.rotation.y=Math.PI/2;
        fpn.position.set(gx, H/2, sn*(hw-sidewR/2)); g.add(fpn);
      }
    });
    var pierWR=pierW+ovl*2;
    var pier=fpMkPlane(pierWR,H,0xE8DFC8,1,0x9C8F6E);
    pier.rotation.y=Math.PI/2; pier.position.set(gx, H/2, 0); g.add(pier);
    var pierF=fpMkPlane(pierWR-0.14,H-0.24,0x6E7681,1);
    pierF.rotation.y=-Math.PI/2; pierF.position.set(gx-0.02, H/2, 0); g.add(pierF);
    [-1,1].forEach(function(sn){
      var gt=fpMakeGate({w:gw,
        accent:'#8FE3E0', autoOpen:true, oneWay:0});
      /* 예전엔 문을 벽면(gx)에서 0.62m나 안쪽으로 들여 세워서, 옆쪽을 막는 벽이 없는
         그 0.62m 구간이 문과 벽 사이 빈틈처럼 뚫려 보였다. 이제는 0.012m만 들이고,
         위에서 기둥·옆벽도 문 쪽으로 겹치게 넓혔으니 어느 각도에서 봐도 틈이 없다. */
      gt.rotation.y=-Math.PI/2; gt.position.set(gx-0.012, 0, sn*gzc); g.add(gt);
    });
    /* 버그 수정: 정문 앞 광장에는 바닥판 하나뿐이고 하늘·먼 배경이
       전혀 없어서, 재생을 멈추고 위를 올려다보면 새까만 허공만 보였다(게다가
       거기에 목적지 층 복도 조각까지 떠 보였다 — 그쪽은 animate에서 따로
       가렸다). 옥상에서 쓰는 것과 같은 하늘 배경판으로 광장 둘레와 위를
       덮어, 실제 야외처럼 하늘·먼 산·나무가 보이게 한다.
       (건물 바깥쪽 x<gx 구간에만 세우므로 실내에서는 정문 유리 너머로만 보인다) */
    /* 광장에서 위를 올려다보면 건물이 있어야 할 자리가 새까맣게
       비어 있었다 — 걷기용 1층 구조에는 위층 외벽이 없기 때문이다. 광장에서
       보이는 범위만큼만 간단한 콘크리트 외벽 한 장을 세워 건물처럼 읽히게 한다. */
    (function(){
      var facH=22.0, facW=22.0;
      var fac=new THREE.Mesh(new THREE.PlaneGeometry(facW, facH),
        new THREE.MeshBasicMaterial({color:0xA8A79C, side:THREE.DoubleSide}));
      fac.renderOrder=-2; fac.rotation.y=-Math.PI/2;
      fac.position.set(gx-0.05, H+facH/2, 0); g.add(fac);
      for(var fi=1; fi<=4; fi++){                    // 층 경계 띠
        var bnd=new THREE.Mesh(new THREE.PlaneGeometry(facW, 0.34),
          new THREE.MeshBasicMaterial({color:0x8C8B82, side:THREE.DoubleSide}));
        bnd.renderOrder=-2; bnd.rotation.y=-Math.PI/2;
        bnd.position.set(gx-0.06, H+fi*4.6, 0); g.add(bnd);
      }
    })();
    (function(){
      var sky=fpRoofSkyTex();
      var pD=16.0, pW=22.0, SH=30.0, SYC=SH*0.349;   // 텍스처의 나무 밑동이 y≈0에 오도록
      var fx=gx-pD, cxm=gx-pD/2;
      var sfar=fpMkTex(pW, SH, sky, 1);
      sfar.rotation.y=Math.PI/2; sfar.position.set(fx, SYC, 0); g.add(sfar);
      [-1,1].forEach(function(sn){
        var sside=fpMkTex(pD, SH, sky, 1);
        sside.rotation.y=(sn>0)?Math.PI:0;
        sside.position.set(cxm, SYC, sn*pW/2); g.add(sside);
      });
      var stop=new THREE.Mesh(new THREE.PlaneGeometry(pD, pW),
        new THREE.MeshBasicMaterial({color:0x6FA9E0, side:THREE.DoubleSide}));
      stop.renderOrder=-2; stop.rotation.x=Math.PI/2;
      stop.position.set(cxm, SYC+SH/2-0.4, 0); g.add(stop);
      // 광장 포장 바깥으로 이어지는 먼 잔디 지면(하늘판 밑동까지)
      var gnd2=new THREE.Mesh(new THREE.PlaneGeometry(pD-0.04, pW),
        new THREE.MeshBasicMaterial({color:0x6E8F6A, side:THREE.DoubleSide}));
      gnd2.renderOrder=-2; gnd2.rotation.x=-Math.PI/2;
      gnd2.position.set(cxm-0.02, 0.004, 0); g.add(gnd2);
    })();
    // 정문 앞 광장 바닥 + 문턱 라인
    var plz=fpMkPlane(10.5, hw*2+4.5, 0x333F4E, 1);
    plz.rotation.x=-Math.PI/2; plz.position.set(gx-5.25, 0.015, 0); g.add(plz);
    var edge=fpMkPlane(0.16, hw*2+4.5, 0x00E5FF, 0.22);
    edge.rotation.x=-Math.PI/2; edge.position.set(gx-0.12, 0.03, 0); g.add(edge);
  }
  return g;
}
/* 빨간 동선은 바닥에서 0.8 띄워 그려 놓은 굵은 관이라, 눈높이(1.55)로 걷는
   로드뷰에서는 코앞에서 화면을 통째로 가로막는다 → 재생 중에만 바닥에 붙는
   유도선처럼 낮추고 살짝 투명하게 해서 '따라 걸으면 되는 선'으로 보이게 한다. */
var fpRouteG=null;
function fpRouteFloor(on){
  if(fpRouteG){
    buildingRoot.remove(fpRouteG);
    fpRouteG.traverse(function(o){ if(o.geometry) o.geometry.dispose(); if(o.material) o.material.dispose(); });
    fpRouteG=null;
  }
  if(routeA) routeA.visible = !on;
  if(!on || !routeCurve) return;
  var g=new THREE.Group();
  var tube=new THREE.Mesh(new THREE.TubeGeometry(routeCurve, 260, 0.10, 10, false),
    new THREE.MeshBasicMaterial({color:0xFF6A4A, transparent:true, opacity:0.62}));
  g.add(tube);
  // 진행 방향을 알려주는 작은 화살촉(바닥에 그린 유도 표시처럼 보이도록 작게)
  var total=routeCurve.getLength(), cnt=Math.max(2, Math.min(9, Math.round(total/8)));
  var up=new THREE.Vector3(0,1,0);
  for(var i=1;i<=cnt;i++){
    var t=i/(cnt+1);
    var cn=new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.44, 12),
      new THREE.MeshBasicMaterial({color:0xFF8A66, transparent:true, opacity:0.7}));
    cn.position.copy(routeCurve.getPointAt(t));
    cn.quaternion.setFromUnitVectors(up, routeCurve.getTangentAt(t).normalize());
    g.add(cn);
  }
  g.position.y = -0.74;          // 바닥(슬래브 윗면) 바로 위로 내린다
  fpRouteG=g; buildingRoot.add(g);
}

/* 재생 시작 때 : 출발 층 + 목적지 층 복도를 만들어 scene에 올린다 */
function fpBuildCorr(levels){
  fpClearCorr();
  if(!scene) return;
  var f=(target && target.floor!==undefined) ? target.floor : startFloor;
  fpCorrG=new THREE.Group(); fpCorrMats=[]; fpTgtGlow=[]; fpEvInds=[];
  var seen={};
  fpHiddenSt=[];
  var _lvG={};
  /* 한 층을 짓다 실패해도 나머지는 짓고, 무엇보다 아래 '조감도 감출 목록'까지는 반드시 간다.
     예전에는 여기서 터지면 목록이 빈 채로 남아 조감도가 그대로 보였다 —
     1인칭 화면이 통째로 노래지던 갤럭시 S20 증상이 그 모습이다.
     (실패한 층은 「문제 기록」에 남는다 — 어느 층·무슨 이유인지 폰에서 바로 알 수 있게) */
  (levels || [startFloor, f]).forEach(function(lv){
    var k=String(lv); if(seen[k]) return; seen[k]=1;
    try{
      var cg=fpMakeCorr(lv);
      cg.position.y=fpSlabY(lv);
      cg.userData.fpSlabY=fpSlabY(lv);     // 아래 animate에서 '지금 층만 보이게' 하는 데 쓴다
      _lvG[k]=cg;
      fpCorrG.add(cg);
    }catch(err){
      try{ DIAG.add('실내 못 지음 ' + k + '층 : ' + ((err && err.message) || err)); }catch(e2){}
    }
  });
  /* 계단실 천장판(stCap) : 바로 위층도 같이 지어졌다면 그 층의 계단실이
     위를 이어 주므로 이 판은 감춘다(안 감추면 계단을 오를 때 머리 위가
     막힌다). 위층이 없을 때만 남겨 두어 뚫린 배경이 안 보이게 한다. */
  Object.keys(_lvG).forEach(function(k){
    var lv = (k==='B1'||k==='R') ? k : (+k);
    var ui = lvIndex(lv);
    if(ui<0) return;
    var up = LEVELS[ui+1], dn = LEVELS[ui-1];
    if(up!==undefined && seen[String(up)])
      _lvG[k].traverse(function(o){ if(o.userData && o.userData.stCap) o.visible=false; });
    if(dn!==undefined && seen[String(dn)])
      _lvG[k].traverse(function(o){ if(o.userData && o.userData.stCapDn) o.visible=false; });
  });
  /* 건물 3D의 계단 상자(연두)는 앞면이 복도 벽보다 안쪽에 있어서, 계단실을 뚫어 놓아도
     그 상자가 앞을 막아 안이 안 보인다 → 재생 동안만 잠시 감춘다.
     (층별로 고르면 층 그룹이 다시 만들어졌을 때 놓치므로 건물 전체에서 모은다) */
  if(typeof buildingRoot!=='undefined' && buildingRoot) buildingRoot.traverse(function(o){
    /* ① 계단·엘리베이터 상자 : 개구부 가장자리로 비쳐 보인다
       ② 복도를 걷는 층의 강의실 상자와 홀로그램 테두리(EdgesGeometry) :
          복도 양 끝에서는 벽 덮개가 닿지 않아 상자와 파란 테두리 선이 그대로 노출됐다.
       재생 중에는 복도·문 구조물이 그 역할을 대신하므로 함께 감춘다. */
    if(o.userData && o.userData.evst){ fpHiddenSt.push(o); return; }
    /* 건물 3D의 출입문 상자(민트색)는 로드뷰에서 세운 실제 유리문 바로 앞을 덮어,
       문 색을 아무리 바꿔도 화면이 그대로였다 → 재생 중에는 같이 감춘다. */
    if(o.type==='Mesh' && o.userData && o.userData.door){ fpHiddenSt.push(o); return; }
    if(o.type==='LineSegments'){ fpHiddenSt.push(o); return; }
    /* 화장실 상자도 같이 감론다 : 복도 벽을 뚫어 알코브를 만든 뒤로는
       그 반투명 상자가 화장실 문 앞을 덮어 문이 안 보였다. */
    if(o.type==='Mesh' && o.userData && (o.userData.code || o.userData.toilet || o.userData.roomTile)) fpHiddenSt.push(o);
    if(o.userData && o.userData.wcLabel) fpHiddenSt.push(o);
    /* 지하 1층 크리에이티브 존 상자(연보라 반투명)와 나가는 문 표시(노랑)는
       홀로그램/층상세 전용 표시인데, 걷기 중에도 그대로 남아 있어서 존 안에서
       허공에 큰 반투명 판이 떠 있는 것처럼 보였다 → 함께 감춘다. */
    if(o.userData && (o.userData.zone || o.userData.b1door)) fpHiddenSt.push(o);
    /* 버그 수정: 건물 3D의 층 바닥 슬래브(짙은 남회색 0x222B36)는
       계단실 위까지 통째로 덮는 두꺼운 판이라, 걷기 중 계단 중간 계단참에서
       위를 올려다보면 실제 위층 바닥(26.66)보다 26cm 아래(26.40)에 이 판의
       밑면이 걸쳐, 계단실 한가운데 천장만 한 단 내려앉은 것처럼 보였다
       (3~5층 계단에서 특히 두드러짐 — 레이캐스트로 확인: 계단참에서 바로
       위로 쏘면 계단실 폭 전체에서 26.40의 0x222B36이 먼저 맞았다).
       걷는 동안에는 복도 3D가 건물 모델을 대신하므로 이 슬래브도 함께 감춘다
       (아래 floorGroups 일괄 숨김과 같은 취지 — 이 판만 그 그룹 밖에 있었다). */
    if(o.userData && o.userData.bldgSlab) fpHiddenSt.push(o);
  });
  /* 위 규칙들은 '상자' 종류만 하나씩 골라 감췄는데, 그 밖의 홀로그램 덩어리
     (층별 바닥 슬래브, 옥상판, 층 번호 라벨 등)는 그대로 남아 있었다.
     그래서 지하에서 위를 올려다보면 위층 슬래브들이 층층이 겹쳐 보여
     허공에 초록빛 계단이 떠 있는 것처럼 보였다.
     걷는 동안에는 복도 3D가 건물 전체를 대신하므로, 층 그룹(floorGroups) 안의
     것은 전부 감춘다. 경로 화살표·출발 표시 등은 buildingRoot에 따로 붙어 있어
     그대로 남는다. */
  if(typeof floorGroups!=='undefined' && floorGroups) floorGroups.forEach(function(fg){
    if(!fg) return;
    fg.traverse(function(o){
      if(o.type==='Mesh' || o.type==='LineSegments' || o.isSprite) fpHiddenSt.push(o);
    });
  });
  fpCorrG.visible=false;
  scene.add(fpCorrG);
}
