"use strict";
/* roadview.js — 1인칭 로드뷰 — 기본값 · 그림(텍스처) · 소품 만들기
   (예전 한 파일 main.js 의 2799~5141줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
/* ===================================================================
   1인칭 '로드뷰' 경로 미리보기
   -------------------------------------------------------------------
   「이동 경로 보기」를 누르면, 예전처럼 사람 마커가 걸어가는 걸 밖에서
   구경하는 게 아니라 **내가 직접 건물 안을 걸어 다니는 눈높이 시점**으로
   재생한다. 순서는 실제로 찾아갈 때와 똑같이 :

     엘리베이터 앞 → 문이 열림 → 탑승 → 문이 닫힘 → 목적지 층으로 이동
     → 문이 열림 → 복도로 나옴 → 복도를 따라 걸음 → 강의실로 들어감

   재생 중에는 화면을 손가락으로 끌어 로드뷰처럼 고개를 돌려볼 수 있다.
   =================================================================== */
var FP_EYE   = 1.55;   // 바닥(슬래브 윗면)에서 눈높이
var fpEyeOffset = 0;   // 요청 반영(화각 정밀 교정): 특정 지점에서만 눈높이를 살짝 낮추기 위한 보정값(기본 0)
/* 옥상 철문 앞(fpShowRoofChoice)에서만 쓰는 카메라 절대 위치 보정값 —
   요청대로 "조금 더 높고 전진된" 위치를 눈높이(FP_EYE)에 더해서 만든다.
   0이면 다른 층·장면에는 전혀 영향이 없다(fpCommit에서 fpFloorNow==='R'일 때만 더함). */
var fpRoofEyeLift = 0;
var FP_CAB_D = 3.4;    // 엘리베이터 캡 깊이(문 → 안쪽, X방향) — 실제 사진 비율로 축소
var FP_CAB_W = 2.4;    // 실제 15인승 캡처럼 좁고 깊게
/* 문이 캅 폭 전체만큼 벌어져 있어 입구가 터무니없이 넓어 보였다
   → 실제 엘리베이터처럼 가운데만 둘로 열리고 양옆은 막힌 면으로 둘다. */
var FP_EV_DW = 1.50;   // 열리는 문 폭(Z방향) — 실제 문 폭 비율
    // 캡 폭(Z방향)
var FP_CAB_H = 2.42;   // 캡 높이 — 복도 천장(FP_CEIL_H)보다 낮아야 천장면이 캡 안을 가로지르지 않는다
/* 캡 안에서 설 자리(문에서 이만큼 떨어진 곳). 문에 바짝 붙어 서면 화면이 문짝 하나로
   꽉 차서 '파란 벽' 처럼 보였다 → 바닥·천장·옆벽이 같이 보이도록 뒤로 물러서게 한다. */
var FP_STAND = 2.35;
var FP_CEIL_H = 3.3;  // 복도 천장 높이(1인칭일 때만 덮어 준다) — 답답해 보인다는 피드백으로 추가 상향(2.9→3.3)
var FP_WALK  = 4.6;    // 걷는 속도(유닛/초)
var FP_TURN  = 2.4;    // 시선이 돌아가는 최대 속도(rad/초) — 코너에서 홱 돌지 않게
var FP_LOOK_Y = 1.15, FP_LOOK_P = 0.5;   // 손가락으로 둘러볼 수 있는 좌우/위아래 한계

var fpActive=false, fpSteps=null, fpI=0, fpT=0;
var fpPos={x:0,y:0,z:0}, fpYaw=0, fpDoorK=0, fpBob=0, fpLabel='', fpStairTilt=0;
var fpLookYaw=0, fpLookPitch=0;          // 둘러보기(로드뷰) 오프셋
var fpLastEye=null, fpLastAim=null;      // animate()가 카메라 목표로 그대로 쓰는 값
var fpCabPos={x:0,z:0};
var fpCab=null, fpDoorL=null, fpDoorR=null, fpPanelCv=null, fpPanelTex=null, fpPanelTxt='';
var fpCeil=null;

function fpEvW(f){ return (f==='B1') ? B1_EVST_W : (ROOM_W-0.25); }
/* 동선의 X-Ray 겹레이어는 '밖에서 볼 때 다른 층에 가려진 경로를 비쳐 보이게' 하려고
   깊이 검사를 꺼 둔 것이라, 1인칭에서는 엘리베이터 벽 뒤 승강로까지 빨갛게 비쳐 보인다. */
function fpSetXray(v){
  if(!routeA) return;
  routeA.traverse(function(o){ if(o.userData && o.userData.routeXray) o.visible = v; });
}
function fpSlabY(f){ return lvIndex(f)*SP + SLAB; }
function fpClamp(v,a,b){ return v<a?a:(v>b?b:v); }
function fpEase(mode,k){
  if(mode==='lin') return k;
  if(mode==='in')  return k*k;
  if(mode==='out') return 1-(1-k)*(1-k);
  return easeIO(k);
}
function fpCap(txt){
  var el=document.getElementById('fpCap');
  if(!el) return;
  if(txt){ el.textContent=txt; el.classList.add('on'); }
  else   { el.classList.remove('on'); }
}

/* ── 엘리베이터 캡(안에서 보는 상자) ─────────────────────────────
   건물(buildingRoot)은 복도 방향으로 1.45배 늘려 놨기 때문에, 그 밑에 붙이면
   캡이 한쪽으로 찌그러진다 → 캡은 scene에 직접 붙이고 월드 좌표로 옮긴다. */
/* 엘리베이터 안 버튼판(층 버튼 · 열림/닫힘 · 작은 표시창) */
var fpCabBtnPanel=null, fpCabSel=null;      // 캅 버튼판 · 지금 누른(가려는) 층
function fpCabPanelTex(sel, cur){
  var key='cabpanel|'+(sel===null||sel===undefined?'-':sel)+'|'+(cur||'');
  if(FP_TEX[key]) return FP_TEX[key];
  var W=260, H=560;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  var gd=x.createLinearGradient(0,0,W,0);
  gd.addColorStop(0,'#8E9AA6'); gd.addColorStop(0.4,'#C6D0D8'); gd.addColorStop(1,'#7E8A96');
  x.fillStyle=gd; x.fillRect(0,0,W,H);
  x.strokeStyle='#5B6670'; x.lineWidth=5; x.strokeRect(3,3,W-6,H-6);
  // 위쪽 작은 표시창
  x.fillStyle='#0B1118'; x.fillRect(28,26,W-56,74);
  x.textAlign='center'; x.textBaseline='middle';
  x.fillStyle='#FF9E3D'; x.font='bold 46px Pretendard,sans-serif';
  x.fillText(cur ? cur : '\u2014', W/2, 64);
  // 층 버튼(2열)
  var labels=[['5','4'],['3','2'],['1','B1']];
  labels.forEach(function(row, ri){
    row.forEach(function(t, ci){
      var cx=(ci===0)?86:174, cy=160+ri*84;
      /* 지금 가려는 층은 실제 엘리베이터처럼 빨간불이 들어온다 */
      /* lvLabel은 '5F' 처럼 F가 붙어 있고 버튼 글자는 '5' 라 그대로 비교하면 안 맞는다 */
      var selN=(sel===null||sel===undefined) ? '' : String(sel).replace(/F$/,'');
      var on=(selN!=='' && selN===t);
      if(on){
        x.beginPath(); x.arc(cx,cy,40,0,Math.PI*2);
        x.fillStyle='rgba(255,60,60,0.28)'; x.fill();
      }
      x.beginPath(); x.arc(cx,cy,32,0,Math.PI*2);
      x.fillStyle=on?'#B03028':'#E9EEF2'; x.fill();
      x.lineWidth=5; x.strokeStyle=on?'#FF5A4A':'#6E7A85'; x.stroke();
      x.beginPath(); x.arc(cx,cy,24,0,Math.PI*2);
      x.fillStyle=on?'#FF4438':'#F7FAFC'; x.fill();
      x.fillStyle=on?'#FFF1EE':'#16202B';
      x.font='bold '+(t.length>1?24:30)+'px Pretendard,sans-serif';
      x.fillText(t,cx,cy+1);
    });
  });
  // 열림 / 닫힘
  [['\u25c0\u25b6',86],['\u25b6\u25c0',174]].forEach(function(a,i){
    x.beginPath(); x.arc(a[1],430,30,0,Math.PI*2);
    x.fillStyle='#DCE3E9'; x.fill();
    x.lineWidth=5; x.strokeStyle='#6E7A85'; x.stroke();
    x.fillStyle='#16202B'; x.font='bold 24px Pretendard,sans-serif';
    x.fillText(a[0],a[1],430);
  });
  // 비상호출
  x.beginPath(); x.arc(130,506,26,0,Math.PI*2);
  x.fillStyle='#E8813C'; x.fill();
  x.lineWidth=5; x.strokeStyle='#8C4E1E'; x.stroke();
  x.fillStyle='#2A1408'; x.font='bold 22px Pretendard,sans-serif';
  x.fillText('\u260e',130,507);
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* 층 버튼판 다시 그리기 : sel=가려는 층, cur=지금 층 표시 */
function fpSetCabButtons(sel, cur){
  if(sel!==undefined) fpCabSel=sel;
  if(!fpCabBtnPanel) return;
  fpCabBtnPanel.material.map=fpCabPanelTex(fpCabSel, cur||fpPanelTxt||'');
  fpCabBtnPanel.material.needsUpdate=true;
}
function fpMakeCab(){
  var D=FP_CAB_D, W=FP_CAB_W, H=FP_CAB_H, dh=H*0.85;
  var g=new THREE.Group();
  function panel(w,h,col,emi,ei){
    return new THREE.Mesh(new THREE.PlaneGeometry(w,h),
      new THREE.MeshPhongMaterial({color:col, emissive:emi, emissiveIntensity:(ei===undefined?0.5:ei),
        shininess:50, side:THREE.DoubleSide}));
  }
  function strip(w,h,col,op){
    return new THREE.Mesh(new THREE.PlaneGeometry(w,h),
      new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:(op===undefined?0.9:op)}));
  }
  /* 요청 반영(실사진 대조): 실제 캐빈 내부는 '검은 거울(흑경) 벽 + 스테인리스
     기둥 + 가느다란 선형 조명'이고, 바닥은 얼룩덜룩한 화강석이다 —
     기존의 남색 벽 + 청록 네온 라인은 실제와 전혀 달라서 톤을 맞춘다. */
  var fl=panel(D,W,0x9A958C,0x3A3833); fl.rotation.x=-Math.PI/2; fl.position.y=0.02; g.add(fl);
  var flc=strip(D*0.96, W*0.34, 0xB6B0A5, 0.9); flc.rotation.x=-Math.PI/2;
  flc.position.set(0, 0.028, 0); g.add(flc);
  var cl=panel(D,W,0x0A0C10,0x000000); cl.rotation.x= Math.PI/2; cl.position.y=H;    g.add(cl);
  var bw=panel(W,H,0x14171C,0x000000); bw.rotation.y=-Math.PI/2; bw.position.set(D/2,H/2,0); g.add(bw);
  var sL=panel(D,H,0x14171C,0x000000); sL.position.set(0,H/2,-W/2); g.add(sL);
  var sR=panel(D,H,0x14171C,0x000000); sR.position.set(0,H/2, W/2); g.add(sR);
  // 벽 상단 스테인리스 띠(흑경 패널을 가르는 가로 조인트)
  [-1,1].forEach(function(sgn){
    var jt=strip(D*0.98,0.035,0x8C949B,0.85);
    jt.position.set(0, H*0.62, sgn*(W/2-0.015)); g.add(jt);
  });
  // 벽 하단 스테인리스 걸레받이
  [-1,1].forEach(function(sgn){
    var kb=strip(D*0.98,0.10,0x6E767D,0.9);
    kb.position.set(0, 0.06, sgn*(W/2-0.015)); g.add(kb);
  });
  // 천장 조명 : 실제처럼 가느다란 선형 등 여러 줄 + 실제 광원 1개
  [-1,1].forEach(function(sgn){
    var lz=strip(D*0.82,0.05,0xF2FAFF,0.95); lz.rotation.x=Math.PI/2;
    lz.position.set(0,H-0.012,sgn*W*0.26); g.add(lz);
  });
  var lamp=strip(D*0.82,0.05,0xF2FAFF,0.95); lamp.rotation.x=Math.PI/2;
  lamp.position.set(0,H-0.012,0); g.add(lamp);
  var pl=new THREE.PointLight(0xEAF6FF,0.95,10); pl.position.set(0,H-0.3,0); g.add(pl);
  // 양옆 벽 스테인리스 손잡이(핸드레일) — 실제 사진에 뚜렷하게 보인다
  [-1,1].forEach(function(sgn){
    var hr=strip(D*0.72,0.045,0xC2CAD0,0.95);
    hr.position.set(0, H*0.40, sgn*(W/2-0.03)); g.add(hr);
  });
  // 문 2짝 — 가운데에서 좌우(±Z)로 갈라져 열린다.
  // 문짝 하나가 통짜 판으로 보이면 그냥 파란 벽 같아서, 아래 걸레받이·가로 몰딩·
  // 맞닿는 쪽 세로 네온선을 넣어 '엘리베이터 문'으로 읽히게 한다.
  var DW=FP_EV_DW, HW=DW/2;
  function door(sgn){
    /* 요청 반영(재조정): 밝은 은색(0xB9C2C9)에 발광까지 얹었더니 화면이 하얗게
       날아가 로고가 아예 안 보였다 — 발광을 없애고 중간 톤 스테인리스로 낮춘다.
       (실제 사진의 문도 반사는 강하지만 밝기 자체는 중간 회색에 가깝다.) */
    /* 요청 반영(버그 수정 — 흰 원의 정체): 문 재질에 밝은 스페큘러(0xB8C4CC)와
       높은 광택(shininess 110)을 줬는데, 캐빈 안 PointLight가 이 문 바로 뒤에
       있어서 문 한가운데에 둥근 스페큘러 하이라이트가 크게 생겼다 — 로고를
       덮어버리던 '흰 원'이 바로 이것. 반사광을 거의 없애 하이라이트를 지운다.
       (재조정): 그래도 캐빈 안에서는 바로 앞 조명 때문에 문이 하얗게 날아가
       로고가 안 보였다 — 바탕색 자체를 더 어두운 스테인리스로 내려 대비를 준다. */
    var m=new THREE.Mesh(new THREE.PlaneGeometry(HW,dh),
      new THREE.MeshPhongMaterial({color:0x525A61, emissive:0x000000,
        specular:0x1A1D20, shininess:8, side:THREE.DoubleSide}));
    m.rotation.y=Math.PI/2; m.position.y=dh/2;
    var kick=strip(HW,0.22,0x3E464C,1); kick.position.set(0,-dh/2+0.11,0.012); m.add(kick);
    for(var li=1; li<3; li++){                         // 스테인리스 결(세로 헤어라인)
      var ln2=strip(0.012,dh*0.94,0xD3DDE3,0.28);
      ln2.position.set(-HW/2+HW*li/3,0,0.013); m.add(ln2);
      var ln2b=strip(0.012,dh*0.94,0xD3DDE3,0.28);      // 복도에서 보는 면에도 같은 결
      ln2b.position.set(-HW/2+HW*li/3,0,-0.013); m.add(ln2b);
    }
    var seam=strip(0.035,dh*0.98,0x4E585F,0.9); seam.position.set(-sgn*(HW/2-0.02),0,0.014); m.add(seam);
    var seamB=strip(0.035,dh*0.98,0x4E585F,0.9); seamB.position.set(-sgn*(HW/2-0.02),0,-0.014); m.add(seamB);
    return m;
  }
  fpDoorL=door( 1); fpDoorL.position.x=-D/2+0.03; fpDoorL.position.z=-HW/2; g.add(fpDoorL);
  fpDoorR=door(-1); fpDoorR.position.x=-D/2+0.03; fpDoorR.position.z= HW/2; g.add(fpDoorR);
  /* 문 안쪽의 KSNU 원형 로고(실제 사진 반영) — 두 짝에 반씩 나눠 붙여 닫히면 하나로 보인다 */
  (function(){
    var lc=document.createElement('canvas'); lc.width=512; lc.height=512;
    var lx=lc.getContext('2d');
    lx.strokeStyle='#FFFFFF'; lx.fillStyle='#FFFFFF';
    lx.lineWidth=11; lx.beginPath(); lx.arc(256,256,225,0,Math.PI*2); lx.stroke();
    lx.font='bold 96px Arial'; lx.textAlign='center'; lx.textBaseline='middle';
    lx.fillText('KSNU',256,276);
    lx.lineWidth=10; lx.beginPath(); lx.moveTo(132,212); lx.quadraticCurveTo(256,152,380,212); lx.stroke();
    lx.font='bold 27px Arial';
    var rt='KUNSAN NATIONAL UNIVERSITY';
    for(var ci=0; ci<rt.length; ci++){
      var an=-Math.PI*0.82 + (Math.PI*1.64)*ci/(rt.length-1);
      lx.save(); lx.translate(256+Math.sin(an)*190, 256-Math.cos(an)*190);
      lx.rotate(an); lx.fillText(rt[ci],0,0); lx.restore();
    }
    /* 요청 반영: 복도 쪽에서 봤을 때 로고 좌우(어느 문짝에 KS/NU가 붙는지)가
       반대로 보인다는 확인이 있어, 두 문짝에 배정하는 텍스처 절반을 서로
       맞바꾼다(문 순서 자체는 그대로 두고 a[1] 값만 교환). */
    var LGW=0.40, LGH=0.80;   // 요청 반영: 크기를 조금 키움(0.34x0.68 → 0.40x0.80)
    [[fpDoorL,0.0,1],[fpDoorR,0.5,-1]].forEach(function(a){
      [0.016,-0.016].forEach(function(zo){         // 안쪽 면 + 바깥쪽(복도) 면 모두에 로고를 붙인다
        var t2=new THREE.CanvasTexture(lc); t2.minFilter=THREE.LinearFilter;
        /* 요청 반영: 바깥(복도) 쪽은 지금 상태가 맞다고 확인받았으니 그대로
           두고, 안쪽(캐빈) 쪽만 좌우를 스왑한다 — 지금까지는 두 면이 같은
           a[1] 값을 공유해서 한쪽을 바꾸면 반대쪽도 같이 바뀌었다(이전 요청
           때 바깥도 같이 뒤집혔던 원인). 안쪽 전용 오프셋을 따로 계산해
           두 면이 서로 독립적으로 조정되게 한다. */
        var insideOff=(a[1]+0.5)%1;
        if(zo<0){ t2.repeat.set(-0.5,1); t2.offset.x=a[1]+0.5; }
        else    { t2.repeat.set(0.5,1);  t2.offset.x=insideOff; }
        var hm=new THREE.Mesh(new THREE.PlaneGeometry(LGW,LGH),
          new THREE.MeshBasicMaterial({map:t2, transparent:true, opacity:1.0, side:THREE.DoubleSide}));
        /* 요청 반영: 로고를 문 세로 가운데에 맞춘다 — 기존 y=0.30은 문
           아래쪽에 치우쳐 있었다(dh는 문 높이). 문 높이의 절반으로 올린다. */
        /* 요청 반영(버그 수정): 로고는 문(m)의 '자식'이라 위치가 문의 로컬
           좌표계 기준이다 — 문 자신은 이미 m.position.y=dh/2로 위로 이동해
           있으므로(문 평면은 로컬 -dh/2~+dh/2에 걸쳐 있음), 자식에 다시
           dh/2를 더하면 로컬 상단(=문 꼭대기)에 붙어버린다("로고가 위로
           갔다"의 원인). 로컬 중심 0이 문의 세로 가운데다. */
        hm.position.set(-a[2]*(HW/2-LGW/2), 0, zo);
        a[0].add(hm);
      });
    });
  })();
  /* 문 양옆 막힌 면 + 스테인리스 문설주 */
  var sideW=(W-DW)/2;
  [-1,1].forEach(function(sgn){
    var fp2=panel(sideW,dh,0x222C3A,0x101E2A);
    fp2.rotation.y=Math.PI/2;
    fp2.position.set(-D/2+0.02, dh/2, sgn*(DW/2+sideW/2)); g.add(fp2);
    var jm=strip(0.10,dh,0xC2CFD8,0.95);
    jm.rotation.y=Math.PI/2; jm.position.set(-D/2+0.045, dh/2, sgn*(DW/2+0.05)); g.add(jm);
  });
  // 문 위쪽 상인방 + 층 표시등
  var lin=panel(W,H-dh,0x212B3B,0x102838); lin.rotation.y=-Math.PI/2;
  lin.position.set(-D/2+0.03,(H+dh)/2,0); g.add(lin);
  fpPanelCv=document.createElement('canvas'); fpPanelCv.width=256; fpPanelCv.height=128;
  fpPanelTex=new THREE.CanvasTexture(fpPanelCv); fpPanelTex.minFilter=THREE.LinearFilter;
  var pan=new THREE.Mesh(new THREE.PlaneGeometry(0.8,0.30),
    new THREE.MeshBasicMaterial({map:fpPanelTex, transparent:true}));
  pan.rotation.y=Math.PI/2; pan.position.set(-D/2+0.07,(H+dh)/2,0); g.add(pan);
  fpPanelTxt=''; fpSetPanel(lvLabel(startFloor));

  /* ── 실제 엘리베이터처럼 보이게 하는 속 마감 ──
     예전엔 색종이 바른 빈 상자여서 '타고 있다'는 느낌이 안 났다. */
  function bar(w2,h2,d2,col,emi){
    return new THREE.Mesh(new THREE.BoxGeometry(w2,h2,d2),
      new THREE.MeshPhongMaterial({color:col, emissive:(emi===undefined?0x0A1622:emi),
        emissiveIntensity:0.35, shininess:80}));
  }
  // 스테인리스 손잡이 : 뒤벽 + 양옆벽
  var hr1=bar(0.05, 0.05, W-0.30, 0xC9D8E2, 0x1A2A34);
  hr1.position.set(D/2-0.10, 0.92, 0); g.add(hr1);
  [-1,1].forEach(function(sgn){
    var hr=bar(D-0.55, 0.05, 0.05, 0xC9D8E2, 0x1A2A34);
    hr.position.set(0.06, 0.92, sgn*(W/2-0.10)); g.add(hr);
    [-1,1].forEach(function(e){
      var br=bar(0.045,0.12,0.045,0xA9BCC8,0x14222C);
      br.position.set(0.06+e*(D-0.55)/2*0.86, 0.86, sgn*(W/2-0.05)); g.add(br);
    });
  });
  // 뒤벽 거울(흑경) + 빛 반사 — 요청 반영: 실사진은 청록빛이 아니라 검은 거울이다
  var mir=panel(W-0.44, H-1.30, 0x1A1D22, 0x000000, 0.85);
  mir.rotation.y=-Math.PI/2; mir.position.set(D/2-0.012, 1.62, 0); g.add(mir);
  [-1,1].forEach(function(sgn){
    var sh=strip(0.10, H-1.5, 0xE9FAFF, 0.10);
    sh.rotation.y=-Math.PI/2; sh.position.set(D/2-0.02, 1.62, sgn*(W*0.18)); g.add(sh);
  });
  // 오른쪽 벽(문 옆) 버튼판
  var bp=new THREE.Mesh(new THREE.PlaneGeometry(0.36,0.80),
    new THREE.MeshBasicMaterial({map:fpCabPanelTex(fpCabSel, ''), transparent:true, side:THREE.DoubleSide}));
  fpCabBtnPanel=bp;
  bp.rotation.y=Math.PI; bp.position.set(-D/2+0.62, 1.42, W/2-0.040); g.add(bp);
  var bpf=bar(0.40,0.85,0.02,0x93A2AE,0x121E28);       // 테두리는 버튼판 뒤에
  bpf.position.set(-D/2+0.62, 1.42, W/2-0.012); g.add(bpf);
  // 바닥 줄눈늬 + 문턱
  [-1,1].forEach(function(sgn){
    var fg=strip(D*0.9, 0.02, 0x6E8798, 0.35); fg.rotation.x=-Math.PI/2;
    fg.position.set(0, 0.03, sgn*W*0.22); g.add(fg);
  });
  var sill=bar(0.10, 0.03, W, 0xB9C8D2, 0x1A2A34);
  sill.position.set(-D/2+0.03, 0.015, 0); g.add(sill);
  // 문짝 스테인리스 결
  [fpDoorL, fpDoorR].forEach(function(dm){
    for(var i=1;i<4;i++){
      var ln=strip(0.012, dh*0.92, 0xBFD6E4, 0.16);
      ln.position.set(-W/4 + (W/2)*i/4, 0, 0.013); dm.add(ln);
    }
  });
  return g;
}
/* ── 복도 천장 ────────────────────────────────────────────────────
   건물 3D는 밖에서 내려다보는 홀로그램이라 천장이 아예 없다. 그대로 1인칭으로
   걸으면 머리 위가 새까맣게 뻥 뚫려 있어 '복도'로 안 읽힌다 → 재생 중에만
   층 위에 천장 한 장을 덮고, 복도를 따라 형광등 띠를 이어 준다. */
function fpMakeCeil(){
  var g=new THREE.Group();
  var ST=BUILDING_Z_STRETCH;
  var w=GLOBAL_HALF_X*2+2, d=(GLOBAL_TOP_Z-GLOBAL_BOT_Z)*ST+6;
  /* 요청 반영(버그 수정): 이 공용 천장판은 "바닥+3.3m"에 건물 전체(24×105m)를
     덮는 짙은 남색 판이라, 천장이 3.3m보다 훨씬 높은 계단실(위·아래 반 층이
     한 통으로 뚫려 있다) 위를 그대로 가로막고 있었다 — 복도에서 계단실을
     들여다보거나 계단을 오르내리면, 계단 위쪽 절반이 늘 검은 띠로 잘려
     보였다(전 층 공통). 계단실이 서는 자리만큼 실제로 구멍을 뚫는다.
     (그 자리는 계단실 자체의 벽·천장판(fpMakeStairwell)이 대신 막아 준다.)
     ※ 이 그룹은 z 중심이 건물 중앙(cz)에 놓이고 rotation.x=+PI/2 이므로
       Shape 로컬 Y가 월드 Z로 그대로 매핑된다(부호 뒤집기 없음). */
  var cz=((GLOBAL_TOP_Z+GLOBAL_BOT_Z)/2)*ST;
  var shp=new THREE.Shape();
  shp.moveTo(-w/2,-d/2); shp.lineTo(w/2,-d/2); shp.lineTo(w/2,d/2); shp.lineTo(-w/2,d/2);
  shp.closePath();
  var _hs=[];
  function ceilHole(x0,x1,z0,z1){
    for(var i=0;i<_hs.length;i++){
      var q=_hs[i];
      if(!(x1<q[0]-0.01 || x0>q[1]+0.01 || z1<q[2]-0.01 || z0>q[3]+0.01)) return; // 겹치면 건너뛴다
    }
    _hs.push([x0,x1,z0,z1]);
    var hp=new THREE.Path();
    hp.moveTo(x0,z0-cz); hp.lineTo(x1,z0-cz); hp.lineTo(x1,z1-cz); hp.lineTo(x0,z1-cz);
    hp.closePath(); shp.holes.push(hp);
  }
  var stx0=FP_WALL_X-0.05, stx1=FP_WALL_X+FP_ST_WD_B1F+0.6;
  [1,'B1'].forEach(function(lv){
    var sz=stZOf(lv)*ST;
    ceilHole(stx0, stx1, sz-3.7, sz+3.7);
  });
  if(typeof EMSTAIR_POS!=='undefined') LEVELS.forEach(function(lv){
    var e=EMSTAIR_POS[lv]; if(!e) return;
    var sg=(e.xWhole>0?1:-1), ez=e.z*ST;
    var ex0 = sg>0 ? (FP_WALL_X-0.3) : (-FP_WALL_X-FP_ST_WD-0.6);
    var ex1 = sg>0 ? (FP_WALL_X+FP_ST_WD+0.6) : (-FP_WALL_X+0.3);
    ceilHole(ex0, ex1, ez-2.5, ez+2.5);
  });
  var m=new THREE.Mesh(new THREE.ShapeGeometry(shp),
    new THREE.MeshPhongMaterial({color:0x141D2A, emissive:0x0C2534, emissiveIntensity:0.6,
      side:THREE.DoubleSide, transparent:true}));
  m.rotation.x=Math.PI/2; m.userData.baseOp=1; m.renderOrder=-2; g.add(m);
  /* v121(요청 반영): 이 큰 천장판 한가운데를 따라 길게 깔던 옅은 하늘색 띠(0.34m × 건물 전체
     길이, 조명선 흉내)를 없앤다 — 복도 천장은 fpMakeCorr가 형광등까지 따로 그리므로, 이 띠는
     복도 천장 위에 파란 줄이 겹쳐 보이는 원인이었다. 천장판 자체는 그대로 둔다. */
  return g;
}
/* 캡 안 층 표시등 글씨 갱신(같은 글씨면 다시 그리지 않는다) */
function fpSetPanel(txt){
  if(!fpPanelCv || fpPanelTxt===txt) return;
  fpPanelTxt=txt;
  var w=fpPanelCv.width, h=fpPanelCv.height, x=fpPanelCv.getContext('2d');
  x.clearRect(0,0,w,h);
  /* 요청 반영(실사진 대조): 기존엔 청록 테두리 사각 박스 + 큰 시안 숫자였는데,
     실제 표시기는 '아래로 볼록한 검은 아치형 판'에 작은 도트매트릭스 화살표와
     숫자만 옅은 보랏빛 흰색으로 떠 있다 — 모양과 색을 그쪽으로 맞춘다. */
  // 아치형 검은 판(윗변 직선, 아랫변이 완만한 곡선)
  x.fillStyle='#0A0C0F';
  x.beginPath();
  x.moveTo(0,0); x.lineTo(w,0); x.lineTo(w,h*0.62);
  x.quadraticCurveTo(w/2, h*1.02, 0, h*0.62);
  x.closePath(); x.fill();
  // 판 위아래 스테인리스 테두리(얇게)
  x.strokeStyle='rgba(190,200,208,0.55)'; x.lineWidth=4;
  x.beginPath(); x.moveTo(0,3); x.lineTo(w,3); x.stroke();
  // 도트매트릭스 방향 화살표(운행 중일 때만) + 층 숫자
  var dir=(typeof fpEvDir!=='undefined') ? fpEvDir : 0;
  var cx=w/2, cy=h*0.36;
  x.fillStyle='#C9C4F0';
  if(dir!==0){
    var ay=cy, s=13;                      // 삼각형을 점으로 찍어 도트매트릭스 느낌
    for(var r=0;r<4;r++){
      var n=(dir>0)?(r+1):(4-r);
      for(var c2=0;c2<n;c2++){
        var px=cx-92-(n-1)*s/2+c2*s, py=ay-24+r*s;
        x.fillRect(px,py,s-4,s-4);
      }
    }
  }
  x.textAlign='center'; x.textBaseline='middle';
  x.font='bold 62px "Courier New",monospace';
  x.fillText(txt, cx+(dir!==0?26:0), cy);
  if(fpPanelTex) fpPanelTex.needsUpdate=true;
  if(typeof fpSetCabButtons==='function') fpSetCabButtons(undefined, txt);
  /* 복도 쪽 표시기도 같은 층을 보여 준다.
     올라가는 중이면 ▲, 내려가는 중이면 ▼ 가 같이 켜진다. */
  if(typeof fpSetHallInd==='function') fpSetHallInd(txt, (typeof fpEvDir!=='undefined') ? fpEvDir : 0);
}

/* ── 복도 벽 · 강의실 문 · 문패(명찰) ─────────────────────────────
   예전 로드뷰는 복도 양옆이 그냥 뻥 뚫린 홀로그램 상자였다 → 엘리베이터에서
   내려도 "복도"로 읽히지 않았다. 재생 중에만 복도 양쪽에 실제 벽을 세우고,
   호실마다 문 + 호실번호 명찰을 달고, 화장실·계단은 픽토그램 표지판으로
   구분되게 한다. (건물 데이터·검색 로직은 전혀 건드리지 않고, 이 그룹은
   천장(fpCeil)처럼 scene에 직접 붙였다가 재생이 끝나면 사라진다.)
   ---------------------------------------------------------------- */
var FP_WALL_X  = CORR_HALF;          // 복도 벽 X(중앙에서 좌우로)
var FP_GATE_X    = -GLOBAL_HALF_X;   // 정문(건물 서쪽 외벽) X
var FP_GATE_OUT  = FP_GATE_X - 4.8;  // 정문 앞 광장(로드뷰 출발 지점)
var FP_HALL_HW = 3.90;              // 정문 현관 통로 반폭(Z)
var FP_DOOR_W  = 1.14;               // 문 폭
var FP_DOOR_H  = 2.10;               // 문 높이
/* 화장실은 복도에서 오른쪽으로 꿗어 들어가는 통로 안에 있고,
   남·여 두 문이 통로 양옆에서 서로 마주 본다. */
var FP_OPEN_D  = 6.60;               // 엘리베이터 정면 열린 공간의 깊이
var FP_ALC_D   = 5.60;               // 통로 깊이(복도 벽에서 안쪽 끝까지) — 사진처럼 더 깊게
var FP_ALC_HW  = 1.65;               // 통로 폭(Z)의 절반 — 넓히되 같은 벽의 옆방(KTC 등)과 안 겹치는 한도
/* 요청 반영(버그 수정 — 되돌림): 2.20으로 넓혔더니, 화장실 통로 입구가
   바로 옆방(13119·13224·13324·13419·13522 — WC_ADJ_FLIP에 등록된, 원래도
   "겹치지 않는 한도"로 빠듯하게 붙어 있던 방들)의 벽 폭까지 파고들어,
   그 방 문 위로 천장 대신 배경(짙은 남색 허공)이 그대로 드러나 보이는
   새 문제가 생겼다 — 원래 폭(1.65)으로 되돌린다. "옆을 보면 벽이 꽉
   차 보인다"는 문제는 통로 자체를 넓히는 대신, 서 있는 자리 쪽에서
   해결한다(아래 fpBuildNodes의 wc 자리 계산 참고). */
var FP_ALC_H   = FP_CEIL_H;          // 통로 입구 높이 — 복도 천장과 같은 높이로(낮은 상자 느낌 제거)
var FP_ALC_DX  = 3.00;               // 복도 벽에서 두 문 중심까지의 깊이
/* 1층 화장실 통로는 원 좌표대로면 로비(정문 현관, |z|<FP_HALL_HW)와 0.35m 겹쳐서
   통로 옆벽·화장실 문이 로비 오른쪽 벽의 게시판을 가리고(프레임이 짤려 보이고),
   문 위 WC 표시가 로비 벽 위로 튀어나와 떠 보였다
   → 1층에서만 통로를 +Z로 밀어 로비 바깥(z ≥ FP_HALL_HW+0.35)에서 시작하게 한다.
   로드뷰(벽·문·이동 지점·경로 목적지)가 모두 이 함수를 쓰므로 서로 어긋나지 않는다. */
/* 특정 호실만 '문 위치'를 원래 호실 좌표에서 살짝 옮겨야 할 때 쓰는 보정값.
   FLOOR_LAYOUT의 c.z(호실 데이터)는 2D 평면도의 방 사각형까지 정의하므로 건드리지
   않고, 3D 문짝과 길찾기 문 노드만 이 값을 똑같이 참조해서 함께 움직인다
   (둘이 같은 값을 쓰므로 화살표·도착 판정이 문과 계속 일치한다).
   13119: 1층만 중앙계단이 1.4배 넓어(fpToiletZ) 화장실 통로가 +0.88m 밀리는 바람에
   이 방 문이 통로 개구부(z 7.23~10.53) 안에 들어가 버려, 문 옆에 있어야 할 벽이
   0.3m밖에 남지 않았다 — 개구부 밖 벽면으로 문을 내보낸다. */
/* 요청 반영: 13119·13224·13324·13419·13522는 모두 화장실 통로(알코브) 바로
   옆방이라, 문짝(폭 1.14m)의 가장자리가 알코브 개구부 가장자리에 딱 붙어
   있었다 — 문 앞에 설 자리가 없어 눌러도 화장실 쪽으로 끌려가고, 안내
   문구도 원하는 쪽으로 안 떴다. 문과 명찰, 길찾기 문 지점(fpDoorZ를 쓰는
   세 곳)이 모두 이 값을 함께 참조하므로 같이 움직인다 — 2D 평면도의 방
   사각형(c.z)은 그대로라, 방 정면(폭 약 6.5m) 안에서 문만 옮기는 셈이다.
   1층은 화장실 통로 자체가 +0.88m 밀려 있어(fpToiletZ) 그만큼 더 준다. */
var FP_DOOR_DZ = {'13119': 1.80, '13224': 0.95, '13324': 0.95,
                  '13419': 0.95, '13522': 0.95};
function fpDoorZ(code, zAbs){
  var d = FP_DOOR_DZ[code];
  return (typeof d === 'number') ? zAbs + d : zAbs;
}
function fpToiletZ(lv){
  var z = FACILITIES.toilet.z*BUILDING_Z_STRETCH;
  /* 중앙계단(폭 FP_ST_OW)과 화장실 통로(반폭 FP_ALC_HW)가 겹치지 않도록
     항상 최소 간격을 띄운다 — 안 그러면 두 구조물이 서로 파고들어
     카메라가 벽 속에 끼는(화면이 두꺼운 판으로 덮이는) 버그가 생긴다. */
  var stZ = stZOf(lv)*BUILDING_Z_STRETCH;
  /* 1층은 계단실을 1.4배 넓혔으므로(요청 반영), 화장실과의 최소 간격도 그 넓어진
     폭 기준으로 계산해야 두 구조물이 겹치지 않는다. */
  var owForGap = (lv===1) ? FP_ST_OW*1.4 : FP_ST_OW;
  var minGap = owForGap/2 + FP_ALC_HW + 0.45;
  if(Math.abs(z - stZ) < minGap) z = (z>=stZ) ? stZ+minGap : stZ-minGap;
  if(lv===1) z = Math.max(z, FP_HALL_HW + FP_ALC_HW + 0.35);
  return z;
}
var fpCorrG    = null;               // 현재 재생용 복도 그룹
var fpCorrMats = [];                 // 페이드인용 재질 목록 [{m, op}]
var fpTgtGlow  = [];                 // 목적지 문 주변 발광(맥동)
var fpHiddenSt = [];                 // 로드뷰 동안 감출 건물 3D의 계단 상자
var FP_TEX = {};                     // 문패·픽토그램 텍스처 캐시

/* 문패(명찰) 텍스처 : 위 = 호실번호, 아래 = 방 이름 */
/* 바탕색 위에서 읽히는 글자색(밝은 바탕=검은 글씨) */
function fpInkOn(hex){
  var n=parseInt(hex.slice(1),16), r=(n>>16)&255, gg=(n>>8)&255, b=n&255;
  return (0.299*r+0.587*gg+0.114*b > 150) ? '#06121F' : '#FFFFFF';
}
function fpPlateTex(main, sub, ac, wide){
  var key = 'p3|'+main+'|'+(sub||'')+'|'+ac+'|'+(wide?'w':'n');
  if(FP_TEX[key]) return FP_TEX[key];
  /* wide : 문 위와 천장 사이 틈이 좀아서, 거기 붙일 때만 가로로 긴 3:1 판을 쓴다
     (정사각형에 가까운 판을 그대로 올리면 위가 잘렸다) */
  var cv=document.createElement('canvas'); cv.width=wide?480:320; cv.height=160;
  var x=cv.getContext('2d');
  x.textAlign='center'; x.textBaseline='middle';
  if(sub){
    /* 요청 반영(디자인 정리): 예전엔 판 아래쪽 절반 가까이를 형광 시안/주황
       띠가 차지하고 그 위에 작은 글씨가 얹혀 있어, 문패라기보다 표지 스티커에
       가까웠다 — 실제 대학 강의동 문패처럼 '흰 아크릴판 + 얇은 회색 테두리 +
       왼쪽 색 인덱스 띠 + 진한 남색 호실번호 + 회색 방 이름'으로 정리한다.
       (복도 방향을 알려 주는 색 구분은 왼쪽 세로 띠가 그대로 이어받는다) */
    var CW=cv.width, BAR=16, cxm=(BAR+CW)/2;
    x.fillStyle='#FAFCFD'; x.fillRect(0,0,CW,160);
    x.fillStyle=ac; x.fillRect(0,0,BAR,160);                 // 왼쪽 색 인덱스 띠
    x.strokeStyle='#C6CFD8'; x.lineWidth=4; x.strokeRect(2,2,CW-4,156);
    x.fillStyle='#16263C';
    x.font='700 '+(wide?88:76)+'px Pretendard,"맑은 고딕",sans-serif';
    x.fillText(main, cxm, 62, CW-BAR-58);
    x.fillStyle='#DCE3EA'; x.fillRect(BAR+22, 98, CW-BAR-44, 3);   // 얇은 구분선
    x.fillStyle='#5C6C7D';
    x.font='600 '+(wide?32:30)+'px Pretendard,"맑은 고딕",sans-serif';
    x.fillText(sub, cxm, 128, CW-BAR-40);
  }else{
    var CW2=cv.width;
    x.fillStyle=ac; x.fillRect(0,0,CW2,160);
    x.fillStyle=fpInkOn(ac); x.font='bold 74px Pretendard,"맑은 고딕",sans-serif';
    x.fillText(main,CW2/2,84,CW2-30);
    x.strokeStyle='#F4F8FC'; x.lineWidth=8; x.strokeRect(4,4,CW2-8,152);
  }
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* 벽에 직접 붙인 글씨(사진의 'Campus Creative Zone'처럼 판 없이 글자만) */
function fpWallTextTex(txt, col){
  var key='wt|'+txt+'|'+col;
  if(FP_TEX[key]) return FP_TEX[key];
  var cv=document.createElement('canvas'); cv.width=1024; cv.height=128;   // 8:1
  var x=cv.getContext('2d');
  x.clearRect(0,0,1024,128);
  x.textAlign='center'; x.textBaseline='middle';
  x.fillStyle=col; x.font='800 76px Pretendard,"맑은 고딕",sans-serif';
  x.fillText(txt, 512, 70, 960);
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* v148 : 초록 비상구(EXIT) 표지판 한 장. 캔버스 비율 860:260 은 붙이는 판
   비율(0.86:0.26)과 정확히 같아서, 어떤 크기로 키워도 글자가 눌리거나 잘리지 않는다.
   실제 표지판처럼 '달리는 사람 + 화살표' 픽토그램을 왼쪽에, 글자를 오른쪽에 둔다. */
function fpExitSignTex(ko){
  var key='exitsign|'+(ko?'ko':'en');
  if(FP_TEX[key]) return FP_TEX[key];
  /* v149(요청 반영): 글자를 두세 덩어리로 욱여넣어 복잡했다 →
     실제 비상구 표지판처럼 '픽토그램 + 화살표'만 크게 두고, 글자는 넣지 않는다.
     한눈에 읽히고, 언어에 상관없이 같은 그림이라 훨씬 깔끔하다. */
  var W=860, H=260;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#00843D'; x.fillRect(0,0,W,H);                 // KS 비상구 초록
  x.fillStyle='#FFFFFF';
  // ── 왼쪽 : 문틀을 빠져나가는 사람
  var bx=150, by=40, bw=150, bh=180;
  x.lineWidth=22; x.strokeStyle='#FFFFFF'; x.lineJoin='round'; x.lineCap='round';
  x.beginPath();                                              // 문틀(ㄷ자, 오른쪽 열림)
  x.moveTo(bx+bw, by); x.lineTo(bx, by); x.lineTo(bx, by+bh); x.lineTo(bx+bw, by+bh);
  x.stroke();
  x.beginPath(); x.arc(370, 82, 26, 0, Math.PI*2); x.fill();   // 머리
  x.lineWidth=26;
  x.beginPath(); x.moveTo(368,112); x.lineTo(388,164); x.stroke();   // 몸통
  x.beginPath(); x.moveTo(388,164); x.lineTo(430,214); x.stroke();   // 앞다리
  x.beginPath(); x.moveTo(388,164); x.lineTo(336,214); x.stroke();   // 뒷다리
  x.beginPath(); x.moveTo(376,128); x.lineTo(432,112); x.stroke();   // 팔
  // ── 오른쪽 : 큰 화살표 (계단 쪽 = 이 문 안으로)
  var ax=560, ay=130, aw=210, ah=104;
  x.beginPath();
  x.moveTo(ax, ay-30); x.lineTo(ax+aw-ah*0.9, ay-30);
  x.lineTo(ax+aw-ah*0.9, ay-ah/2-14); x.lineTo(ax+aw, ay);
  x.lineTo(ax+aw-ah*0.9, ay+ah/2+14); x.lineTo(ax+aw-ah*0.9, ay+30);
  x.lineTo(ax, ay+30); x.closePath(); x.fill();
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}

/* 옥상 옥탑방 벽에 붙는 '금연구역' 안내문 한 장 — 예전엔 원·사선·글씨를
   각각 따로 된 판으로 겹쳐 만들었는데, 판을 키울 때마다 글씨판만 비율이
   어긋나 글자가 세로로 늘어나거나 잘려 보였다(요청 반영). 종이 한 장을
   통째로 그린 텍스처 하나로 바꾼다. 캔버스 비율(540:700)은 붙이는 판
   비율(0.27:0.35)과 정확히 같다. */
function fpNoSmokeTex(ko){
  var key='nosmoke|'+(ko?'ko':'en');
  if(FP_TEX[key]) return FP_TEX[key];
  var W=540, H=700, RED='#C0392B';
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#F9F8F4'; x.fillRect(0,0,W,H);
  x.strokeStyle='#D9D6CD'; x.lineWidth=10; x.strokeRect(5,5,W-10,H-10);
  /* 금연 픽토그램 : 붉은 원 + 담배 + 사선 */
  var cx=W/2, cy=252, r=150;
  x.strokeStyle=RED; x.lineWidth=34;
  x.beginPath(); x.arc(cx, cy, r-17, 0, Math.PI*2); x.stroke();
  x.fillStyle='#8A9095';
  x.fillRect(cx-96, cy-14, 150, 28);                 // 담배 몸통
  x.fillStyle='#E4E7E9'; x.fillRect(cx+54, cy-14, 34, 28);   // 필터
  x.fillStyle='#D8DDE0';
  x.fillRect(cx-124, cy-40, 12, 26); x.fillRect(cx-104, cy-56, 12, 26);   // 연기
  x.save();
  x.translate(cx, cy); x.rotate(-Math.PI/4);
  x.fillStyle=RED; x.fillRect(-(r-17), -17, (r-17)*2, 34);   // 사선
  x.restore();
  /* 글씨 */
  x.textAlign='center'; x.textBaseline='middle';
  x.fillStyle=RED;
  x.font='800 104px Pretendard,"맑은 고딕",sans-serif';
  x.fillText(ko?'금연구역':'NO SMOKING', cx, 490, W-70);
  x.fillStyle='#7A8288';
  x.font='600 38px Pretendard,"맑은 고딕",sans-serif';
  x.fillText(ko?'NO SMOKING AREA':'금연구역', cx, 556, W-90);
  x.fillStyle='#C9CDD1';
  x.fillRect(90, 612, W-180, 6);
  x.fillRect(140, 646, W-280, 6);
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* 출입문 위에 다는 가로로 긴 현판(문 폭에 맞춰 납작한 비율) */
function fpBannerTex(txt, ac, wide){
  var key='b2|'+txt+'|'+ac+'|'+(wide?'w':'n');
  if(FP_TEX[key]) return FP_TEX[key];
  /* wide : 정문·동문·서문 현판용. 문 위 틈이 좁아서 판을 낮게 만들 수밖에 없었고,
     판이 낮으니 글씨까지 같이 작아졌다 → 가로로 길게 만들고 글자 비율을 키운다. */
  var W=wide?640:512, HH=wide?100:104, FS=wide?64:54;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=HH;
  var x=cv.getContext('2d');
  x.fillStyle='#070C15'; x.fillRect(0,0,W,HH);
  x.strokeStyle=ac; x.lineWidth=6; x.strokeRect(3,3,W-6,HH-6);
  x.textAlign='center'; x.textBaseline='middle';
  x.fillStyle='#EDFBFF'; x.font='bold '+FS+'px Pretendard,"맑은 고딕",sans-serif';
  x.fillText(txt, W/2, HH/2+2, W-34);
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* 회의실 문 옆 파란 명패(사진 반영: 파란 바탕 + 흰 글씨, KSNU 로고 느낌의 작은 사각 배지) */
function fpMeetingPlateTex(label){
  var key='mp|'+label;
  if(FP_TEX[key]) return FP_TEX[key];
  var W=420, HH=200;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=HH;
  var x=cv.getContext('2d');
  x.fillStyle='#FFFFFF'; x.fillRect(0,0,W,HH);
  x.fillStyle='#173C8A'; x.fillRect(0,0,86,HH);
  x.fillStyle='#FFFFFF'; x.textAlign='center'; x.textBaseline='middle';
  x.font='800 30px Pretendard,"맑은 고딕",sans-serif';
  x.fillText('KSNU', 43, HH/2);
  x.fillStyle='#12213D'; x.textAlign='left';
  x.font='800 56px Pretendard,"맑은 고딕",sans-serif';
  x.fillText(label, 108, HH/2+4);
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* 픽토그램 표지판 텍스처 : 화장실(남/여) · 계단 */
function fpSignTex(kind, ac){
  var key='s|'+kind+'|'+ac;
  if(FP_TEX[key]) return FP_TEX[key];
  var cv=document.createElement('canvas'); cv.width=128; cv.height=128;
  var x=cv.getContext('2d');
  x.fillStyle=ac;
  function head(cx,top,s){ x.beginPath(); x.arc(cx, top+9*s, 9*s, 0, Math.PI*2); x.fill(); }
  if(kind==='wcM'){                       // 남자화장실
    head(64,22,1);
    x.beginPath(); x.moveTo(50,44); x.lineTo(78,44); x.lineTo(73,72); x.lineTo(55,72);
    x.closePath(); x.fill();
    x.fillRect(55,72,9,28); x.fillRect(65,72,9,28);
  }else if(kind==='wcW'){                 // 여자화장실
    head(64,22,1);
    x.beginPath(); x.moveTo(64,42); x.lineTo(86,78); x.lineTo(42,78);
    x.closePath(); x.fill();
    x.fillRect(55,78,9,22); x.fillRect(65,78,9,22);
  }else if(kind==='wc'){
    // 남자
    head(40,24,1);
    x.beginPath(); x.moveTo(27,46); x.lineTo(53,46); x.lineTo(49,72); x.lineTo(31,72);
    x.closePath(); x.fill();
    x.fillRect(31,72,8,26); x.fillRect(41,72,8,26);
    // 여자
    head(90,24,1);
    x.beginPath(); x.moveTo(90,44); x.lineTo(110,78); x.lineTo(70,78);
    x.closePath(); x.fill();
    x.fillRect(81,78,8,20); x.fillRect(91,78,8,20);
    // 가운데 구분선
    x.globalAlpha=0.5; x.fillRect(64,20,2,84); x.globalAlpha=1;
  }else if(kind==='stair'){
    x.beginPath();
    x.moveTo(14,106); x.lineTo(14,86); x.lineTo(40,86); x.lineTo(40,66);
    x.lineTo(66,66);  x.lineTo(66,46); x.lineTo(92,46); x.lineTo(92,26);
    x.lineTo(114,26); x.lineTo(114,106);
    x.closePath(); x.fill();
  }else if(kind==='exit'){
    // 비상계단 : 계단 + 위로 향하는 화살표
    x.beginPath();
    x.moveTo(10,108); x.lineTo(10,90); x.lineTo(34,90); x.lineTo(34,72);
    x.lineTo(58,72);  x.lineTo(58,54); x.lineTo(82,54); x.lineTo(82,108);
    x.closePath(); x.fill();
    x.beginPath(); x.moveTo(102,18); x.lineTo(120,48); x.lineTo(108,48);
    x.lineTo(108,80); x.lineTo(96,80); x.lineTo(96,48); x.lineTo(84,48);
    x.closePath(); x.fill();
  }
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* 목적지 표지 — 문 위에 다는 진분홍 배지(흰 테두리 + 위치 핀 + 글씨).
   요청 반영: 예전엔 일반 문패(fpPlateTex)를 분홍색으로만 칠해 쓴 거라
   '표지판'이라기보다 색만 다른 문패로 보였다 — 전용 디자인으로 분리한다. */
function fpDestTex(txt){
  var key='dest|'+txt;
  if(FP_TEX[key]) return FP_TEX[key];
  var W=640, H=200, R=44, PK='#FF2E88';
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.clearRect(0,0,W,H);
  x.fillStyle='#FFFFFF'; fpRoundRect(x,0,0,W,H,R); x.fill();          // 흰 테두리
  x.fillStyle=PK;       fpRoundRect(x,9,9,W-18,H-18,R-9); x.fill();   // 분홍 바탕
  x.strokeStyle='rgba(255,255,255,0.55)'; x.lineWidth=4;
  fpRoundRect(x,26,26,W-52,H-52,R-24); x.stroke();                    // 안쪽 얇은 흰 선
  /* 위치 핀(흰색) */
  (function(){
    var px=112, py=88, r=34;
    x.fillStyle='#FFFFFF';
    x.beginPath(); x.arc(px, py, r, Math.PI*0.85, Math.PI*0.15); x.fill();
    x.beginPath();
    x.moveTo(px-r*0.86, py+r*0.30); x.lineTo(px+r*0.86, py+r*0.30); x.lineTo(px, py+r*2.05);
    x.closePath(); x.fill();
    x.fillStyle=PK; x.beginPath(); x.arc(px, py-2, r*0.40, 0, Math.PI*2); x.fill();
  })();
  x.textAlign='center'; x.textBaseline='middle';
  x.fillStyle='#FFFFFF';
  x.font='800 92px Pretendard,"맑은 고딕",sans-serif';
  x.fillText(txt, (176+W)/2, H/2+4, W-224);
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* ── 화장실 전용 표지 ────────────────────────────────────────────
   요청 반영: 화장실 문과 문패를 '화장실답게' — 컬러 바탕 + 흰 픽토그램의
   실제 화장실 표지판 모양으로 만든다. 색은 호출부에서 남자=파랑,
   여자=분홍으로 나눠 넘긴다. */
function fpWcFigure(x, kind, col, cx, top, sc){
  x.fillStyle=col;
  x.beginPath(); x.arc(cx, top+9*sc, 9*sc, 0, Math.PI*2); x.fill();     // 머리
  if(kind==='wcW'){                                                     // 치마(삼각형)
    x.beginPath();
    x.moveTo(cx, top+21*sc); x.lineTo(cx+22*sc, top+57*sc); x.lineTo(cx-22*sc, top+57*sc);
    x.closePath(); x.fill();
    x.fillRect(cx-9.5*sc, top+57*sc, 8*sc, 21*sc);
    x.fillRect(cx+1.5*sc, top+57*sc, 8*sc, 21*sc);
  }else{                                                                // 몸통(사다리꼴)
    x.beginPath();
    x.moveTo(cx-14*sc, top+22*sc); x.lineTo(cx+14*sc, top+22*sc);
    x.lineTo(cx+9*sc, top+51*sc);  x.lineTo(cx-9*sc, top+51*sc);
    x.closePath(); x.fill();
    x.fillRect(cx-9.5*sc, top+51*sc, 8*sc, 27*sc);
    x.fillRect(cx+1.5*sc, top+51*sc, 8*sc, 27*sc);
  }
}
function fpRoundRect(x, rx, ry, rw, rh, r){
  x.beginPath();
  x.moveTo(rx+r, ry); x.lineTo(rx+rw-r, ry); x.quadraticCurveTo(rx+rw, ry, rx+rw, ry+r);
  x.lineTo(rx+rw, ry+rh-r); x.quadraticCurveTo(rx+rw, ry+rh, rx+rw-r, ry+rh);
  x.lineTo(rx+r, ry+rh); x.quadraticCurveTo(rx, ry+rh, rx, ry+rh-r);
  x.lineTo(rx, ry+r); x.quadraticCurveTo(rx, ry, rx+r, ry);
  x.closePath();
}
/* 문 한가운데에 붙는 큰 표지판 (세로 3:4) */
function fpWcBoardTex(kind, ac, label, sub){
  var key='wcb|'+kind+'|'+ac+'|'+label+'|'+sub;
  if(FP_TEX[key]) return FP_TEX[key];
  var W=300, H=400;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.clearRect(0,0,W,H);
  x.fillStyle=ac;      fpRoundRect(x,0,0,W,H,26); x.fill();          // 색 테두리
  x.fillStyle='#FFFFFF'; fpRoundRect(x,11,11,W-22,H-22,18); x.fill();// 흰 판
  fpWcFigure(x, kind, ac, W/2, 66, 2.55);                            // 픽토그램
  x.fillStyle=ac; fpRoundRect(x,11,H-104,W-22,93,16); x.fill();      // 아래 색 띠
  x.textAlign='center'; x.textBaseline='middle';
  x.fillStyle='#FFFFFF';
  x.font='700 40px Pretendard,"맑은 고딕",sans-serif';
  x.fillText(label, W/2, H-68, W-30);
  if(sub){
    x.font='600 21px Pretendard,"맑은 고딕",sans-serif';
    x.globalAlpha=0.9; x.fillText(sub, W/2, H-31, W-30); x.globalAlpha=1;
  }
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* 문 옆에 붙는 가로 문패 (2:1) — 왼쪽 색 칸에 픽토그램, 오른쪽에 이름 */
function fpWcPlateTex(kind, ac, label, sub){
  var key='wcp|'+kind+'|'+ac+'|'+label+'|'+sub;
  if(FP_TEX[key]) return FP_TEX[key];
  var W=320, H=160;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#FAFCFD'; x.fillRect(0,0,W,H);
  x.fillStyle=ac; x.fillRect(0,0,112,H);
  fpWcFigure(x, kind, '#FFFFFF', 56, 30, 1.15);
  x.strokeStyle='#C6CFD8'; x.lineWidth=4; x.strokeRect(2,2,W-4,H-4);
  x.textAlign='center'; x.textBaseline='middle';
  x.fillStyle='#16263C';
  x.font='700 38px Pretendard,"맑은 고딕",sans-serif';
  x.fillText(label, (112+W)/2, sub?64:80, W-124);
  if(sub){
    x.fillStyle='#5C6C7D';
    x.font='600 26px Pretendard,"맑은 고딕",sans-serif';
    x.fillText(sub, (112+W)/2, 108, W-136);
  }
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* 초록 비상구(피난) 표지등 — 문 위에 다는 표준 픽토그램.
   요청 반영: 캔버스로 직접 그리지 않고, 보내주신 실제 유도등 사진에서
   초록 표지면만 잘라 투시 보정(네 모서리를 직사각형으로 펴기)한 이미지를
   그대로 붙인다. 512x256 PNG를 data URI로 파일 안에 넣어 두므로 외부
   파일이나 네트워크 없이 로드된다. */
var FP_EXIT_SIGN_SRC='data:image/png;base64,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';
function fpExitSignTex(){
  var key='exitsign';
  if(FP_TEX[key]) return FP_TEX[key];
  var img=new Image();
  var t=new THREE.Texture(img);
  t.minFilter=THREE.LinearFilter; t.magFilter=THREE.LinearFilter;
  /* 요청 반영: 사진 속 표지는 화살표가 왼쪽을 가리키는데, 우리 문에서는
     오른쪽을 가리켜야 한다 — 이미지를 다시 만들지 않고 텍스처 좌표만
     좌우로 뒤집는다(repeat.x=-1, offset.x=1). 사람·문짝도 함께 뒤집혀
     실제 우향 표지와 같은 그림이 된다. */
  t.wrapS=THREE.RepeatWrapping; t.repeat.x=-1; t.offset.x=1;
  img.onload=function(){ t.needsUpdate=true; };
  img.src=FP_EXIT_SIGN_SRC;
  FP_TEX[key]=t; return t;
}
/* 헤링본(V자 나뭇결) 원목 바닥 타일 — 작은 캔버스를 반복(RepeatWrapping)해서
   가운데 대형 테이블 구역 바닥에 깐다. */
function fpHerringboneTex(){
  var key='herringbone';
  if(FP_TEX[key]) return FP_TEX[key];
  var cv=document.createElement('canvas'); cv.width=128; cv.height=128;
  var x=cv.getContext('2d');
  x.fillStyle='#B99568'; x.fillRect(0,0,128,128);
  var plankW=16, plankL=64;
  x.save();
  for(var row=-1; row<5; row++){
    for(var col=-1; col<5; col++){
      var ox=col*plankW*2, oy=row*plankW*2;
      x.save();
      x.translate(ox,oy); x.rotate(Math.PI/4);
      x.fillStyle = ((row+col)%2===0) ? '#C7A277' : '#B08556';
      x.fillRect(-plankL/2,-plankW/2,plankL,plankW*0.92);
      x.strokeStyle='rgba(60,40,20,0.35)'; x.lineWidth=1;
      x.strokeRect(-plankL/2,-plankW/2,plankL,plankW*0.92);
      x.restore();
      x.save();
      x.translate(ox+plankW,oy+plankW); x.rotate(-Math.PI/4);
      x.fillStyle = ((row+col)%2===0) ? '#B08556' : '#C7A277';
      x.fillRect(-plankL/2,-plankW/2,plankL,plankW*0.92);
      x.strokeStyle='rgba(60,40,20,0.35)'; x.lineWidth=1;
      x.strokeRect(-plankL/2,-plankW/2,plankL,plankW*0.92);
      x.restore();
    }
  }
  x.restore();
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=THREE.RepeatWrapping; t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(3,3);
  t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* 동그란 벽시계 — 흰 판 + 검은 테두리 + 눈금 + 시침/분침(장식용, 10시 10분 고정) */
function fpClockTex(){
  var key='clock';
  if(FP_TEX[key]) return FP_TEX[key];
  var cv=document.createElement('canvas'); cv.width=128; cv.height=128;
  var x=cv.getContext('2d');
  var cx=64, cy=64, r=58;
  x.beginPath(); x.arc(cx,cy,r,0,Math.PI*2); x.fillStyle='#F4F1E8'; x.fill();
  x.lineWidth=5; x.strokeStyle='#1B1E24'; x.stroke();
  x.fillStyle='#1B1E24';
  for(var i=0;i<12;i++){
    var a=i*Math.PI/6;
    var ir=(i%3===0)?44:50, or_=54;
    x.beginPath();
    x.moveTo(cx+Math.sin(a)*ir, cy-Math.cos(a)*ir);
    x.lineTo(cx+Math.sin(a)*or_, cy-Math.cos(a)*or_);
    x.lineWidth=(i%3===0)?4:2; x.strokeStyle='#1B1E24'; x.stroke();
  }
  // 시침(10시 방향) · 분침(2시 방향, 10:10 고정 배치)
  x.lineCap='round';
  x.lineWidth=6; x.beginPath(); x.moveTo(cx,cy);
  x.lineTo(cx+Math.sin(-Math.PI*2/3)*26, cy-Math.cos(-Math.PI*2/3)*26); x.stroke();
  x.lineWidth=4; x.beginPath(); x.moveTo(cx,cy);
  x.lineTo(cx+Math.sin(Math.PI/3)*40, cy-Math.cos(Math.PI/3)*40); x.stroke();
  x.beginPath(); x.arc(cx,cy,4,0,Math.PI*2); x.fillStyle='#1B1E24'; x.fill();
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* 엘리베이터에서 내리면 정면 벽에 보이는 안내 표지판 —
   실제 건물처럼 '몇 층인지 + 좌우로 어느 호실이 있는지'를 알려 준다.
   (복도를 바라보는 방향 기준 : 월드 +Z 가 왼쪽, -Z 가 오른쪽) */
function fpDirTex(lv, flip){
  var key='d3|'+lv+'|'+LANG+'|'+(flip?'f':'n');
  if(FP_TEX[key]) return FP_TEX[key];
  var ko=(LANG==='ko');
  var L=(lv==='B1')?null:FLOOR_LAYOUT[lv];
  var evz=evXZ(lv).z;
  /* 엘리베이터 기준 앞(+Z)/뒤(-Z) 두 방향으로만 나눈다.
     예전에는 복도 좌우 블록까지 4칸으로 쪼개서 숫자 범위가 네 줄이 됐는데,
     정작 필요한 건 "어느 쪽으로 걸어가야 하나" 하나뿐이라 오히려 헷갈렸다. */
  var num={A:[], B:[]}, fac={A:[], B:[]};
  if(L) L.cells.forEach(function(c){
    var n=parseInt(c.parent||c.code,10);
    if(!n || isNaN(n)) return;
    num[c.z>=evz?'A':'B'].push(n);
  });
  function addFac(z, ko_, en_){ fac[(z>=evz)?'A':'B'].push(ko?ko_:en_); }
  if(L){
    if(FACILITIES && FACILITIES.toilet) addFac(FACILITIES.toilet.z, '화장실', 'Restroom');
    addFac(L.stZ, '중앙계단', 'Stairs');
    var es=EMSTAIR_POS[lv];
    if(es) addFac(es.z, '비상계단', 'Emergency stairs');
    if(lv===1){                       // 1층은 복도 양 끝이 실제 출입문이다
      fac.A.push(ko?'서문':'West gate');
      fac.B.push(ko?'동문':'East gate');
    }
  }
  /* 호실 번호가 복도 순서대로 이어져 있지 않아서(1층은 특히) 그냥 최소~최대로 묶으면
     양쪽 범위가 서로 겹쳐 버린다 → 실제로 이어지는 구간끼리만 묶어서 보여 준다.
     예) 13301–13306, 13324–13326 */
  function rng(a){
    if(!a.length) return '';
    a = a.slice().sort(function(p,q){ return p-q; });
    /* 중간에 비는 번호(없는 호실)까지 따로 끊으면 '13301, 13303–13304, 13306 …'처럼
       너덜너덜해져 오히려 읽기 나쁘다 → 4 이내로 벌어진 건 한 구간으로 잇는다. */
    var GAP=4, runs=[], st=a[0], pv=a[0];
    for(var i=1;i<=a.length;i++){
      var v=a[i];
      if(v!==undefined && v-pv<=GAP){ pv=v; continue; }
      runs.push(st===pv ? String(st) : (st+'\u2013'+pv));
      st=v; pv=v;
    }
    if(runs.length>2) runs=runs.slice(0,2).concat(['\u2026']);
    return runs.join(',  ');
  }
  var W=680, HH=380, HD=88, AW=126, rh=(HH-HD)/2;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=HH;
  var x=cv.getContext('2d');
  x.fillStyle='#070C15'; x.fillRect(0,0,W,HH);
  // 머리말 : 몇 층인지
  x.fillStyle='#00E5FF'; x.fillRect(0,0,W,HD);
  x.textAlign='center'; x.textBaseline='middle';
  x.fillStyle='#04070C'; x.font='bold 52px Pretendard,"맑은 고딕",sans-serif';
  x.fillText(lvLabel(lv)+'  \u00b7  '+lvName(lv), W/2, HD/2+2, W-40);
  /* 화살표는 '보는 사람 기준'이다 — 엘리베이터에서 내려 -X를 볼 때는 +Z가 왼쪽,
     정문으로 들어와 +X를 볼 때는 +Z가 오른쪽이 되므로 표지판을 뒤집어 만든다. */
  var rows = flip
    ? [{ar:'\u2192', col:'#00E5FF', k:'A'}, {ar:'\u2190', col:'#FFB33C', k:'B'}]
    : [{ar:'\u2190', col:'#00E5FF', k:'A'}, {ar:'\u2192', col:'#FFB33C', k:'B'}];
  var y=HD;
  rows.forEach(function(r, ri){
    x.fillStyle=r.col; x.globalAlpha=0.10; x.fillRect(0,y,W,rh); x.globalAlpha=1;
    x.fillStyle=r.col; x.fillRect(0,y,AW,rh);                       // 방향 색 블록
    x.fillStyle='#04070C'; x.font='bold 104px Pretendard,sans-serif';
    x.textAlign='center'; x.fillText(r.ar, AW/2, y+rh/2+4);
    var rr=rng(num[r.k]), ff=fac[r.k].join('  \u00b7  ');
    x.textAlign='left';
    if(rr){
      x.fillStyle='#F2FCFF'; x.font='bold 54px Pretendard,"맑은 고딕",sans-serif';
      x.fillText(rr, AW+28, y+rh*0.36, W-AW-52);
    }else{
      x.fillStyle='#F2FCFF'; x.font='bold 44px Pretendard,"맑은 고딕",sans-serif';
      x.fillText(ko?'크리에이티브 존':'Creative Zone', AW+28, y+rh*0.36, W-AW-52);
    }
    if(ff){
      x.fillStyle=r.col; x.font='bold 32px Pretendard,"맑은 고딕",sans-serif';
      x.fillText(ff, AW+28, y+rh*0.74, W-AW-52);
    }
    if(ri===0){ x.fillStyle='#0B1220'; x.fillRect(0,y+rh-3,W,6); }
    y+=rh;
  });
  x.strokeStyle='#00E5FF'; x.lineWidth=6; x.strokeRect(3,3,W-6,HH-6);
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* 창밖 풍경 : 하늘·구름·먼 건물·나무·땅 + 유리 반사.
   단색 판을 넣으면 '창'이 아니라 밝은 벽처럼 보여서, 실제 바깥을 그려 넣는다. */
function fpOutsideTex(){
  if(FP_TEX['outside']) return FP_TEX['outside'];
  var W=1024, H=200;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  var sky=x.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#8FBEE6'); sky.addColorStop(0.5,'#C6DFF2'); sky.addColorStop(1,'#E9F2F8');
  x.fillStyle=sky; x.fillRect(0,0,W,H);
  x.fillStyle='rgba(255,255,255,0.55)';                       // 구름
  [[120,38,74,15],[300,24,52,11],[690,44,92,17],[900,30,58,12]].forEach(function(c){
    x.beginPath(); x.ellipse(c[0],c[1],c[2],c[3],0,0,Math.PI*2); x.fill();
  });
  x.fillStyle='#A9BECE';                                      // 멀리 보이는 건물
  [[40,116,116,50],[196,100,86,66],[318,124,66,42],[548,108,138,58],[746,120,78,46],[872,98,112,68]]
    .forEach(function(b){ x.fillRect(b[0],b[1],b[2],b[3]); });
  x.fillStyle='rgba(255,255,255,0.30)';                       // 건물 창문 줄
  for(var bx=0; bx<W; bx+=24){ x.fillRect(bx+5,110,9,5); x.fillRect(bx+5,126,9,5); }
  x.fillStyle='#5F8360';                                      // 나무 띄
  for(var tx=-20; tx<W+40; tx+=34){
    var r=17+((tx*7)%9);
    x.beginPath(); x.arc(tx,158,r,0,Math.PI*2); x.fill();
  }
  x.fillStyle='#4E7052';
  for(var t2=6; t2<W+40; t2+=48){
    x.beginPath(); x.arc(t2,166,13,0,Math.PI*2); x.fill();
  }
  x.fillStyle='#8D98A0'; x.fillRect(0,172,W,H-172);           // 바깥 바닥
  x.fillStyle='#7C878F'; x.fillRect(0,186,W,4);
  x.fillStyle='rgba(186,214,228,0.14)'; x.fillRect(0,0,W,H);  // 유리 색
  /* 요청 반영(삭제): 예전엔 여기에 '유리 반사' 빗금 두 줄을 그렸는데, 실제
     창(폭 6.5m)에 입히면 하늘·나무를 가로지르는 커다란 흰 대각선 줄무늬로
     보여서 창문에 이물질이 낀 것처럼 읽혔다 — 반사 빗금을 없앤다. */
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX['outside']=t; return t;
}
/* 실사진 반영(4차) : 후문 전용 바깥 배경 — 하늘·먼 건물 대신, 사진처럼 문 바로
   앞까지 우거진 숲과 붉은 보도블록 바닥. 공용 fpOutsideTex()(창문 등에서
   여전히 쓰는 하늘 배경)는 그대로 두고, 후문에서만 이 텍스처를 쓴다. */
function fpBackDoorOutsideTex(){
  if(FP_TEX['backdoorOut']) return FP_TEX['backdoorOut'];
  var W=1024, H=200;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  var sky=x.createLinearGradient(0,0,0,H*0.60);
  sky.addColorStop(0,'#3C5A3E'); sky.addColorStop(1,'#4E7048');
  x.fillStyle=sky; x.fillRect(0,0,W,H*0.60);
  function clump(yBase, rMin, rMax, col){
    for(var tx=-20; tx<W+40; tx+=24+Math.random()*16){
      var r=rMin+Math.random()*(rMax-rMin);
      x.fillStyle=col;
      x.beginPath(); x.arc(tx, yBase-r*0.3, r, 0, Math.PI*2); x.fill();
    }
  }
  clump(H*0.52, 18, 30, '#3A5638');
  clump(H*0.60, 22, 38, '#4C6F44');
  clump(H*0.68, 24, 42, '#5C8250');
  x.fillStyle='#9B6B52'; x.fillRect(0, H*0.72, W, H*0.28);        // 붉은 보도블록 바닥
  x.strokeStyle='rgba(60,35,25,0.4)'; x.lineWidth=1.5;
  for(var py=H*0.74; py<H; py+=7){
    x.beginPath(); x.moveTo(0,py); x.lineTo(W,py); x.stroke();
  }
  for(var px2=0; px2<W; px2+=16){
    x.beginPath(); x.moveTo(px2,H*0.72); x.lineTo(px2+6,H); x.stroke();
  }
  var t=new THREE.CanvasTexture(cv);
  t.minFilter=THREE.LinearMipmapLinearFilter; t.generateMipmaps=true;
  FP_TEX['backdoorOut']=t; return t;
}
/* 복도에서 보는 엘리베이터 층 표시기(문 위 주황 세그먼트) */
/* 복도 층 표시기 : 멈추어 있으면 층 번호만, 움직이면 ▲/▼ 와 함께 지나는 층 */
function fpEvHallTex(label, dir){
  var key='evh2|'+label+'|'+(dir||0);
  if(FP_TEX[key]) return FP_TEX[key];
  var W=320, H=128;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#080C12'; x.fillRect(0,0,W,H);
  x.strokeStyle='#39434E'; x.lineWidth=8; x.strokeRect(4,4,W-8,H-8);
  x.textAlign='center'; x.textBaseline='middle';
  if(dir){
    x.fillStyle='#FF6A3D'; x.font='bold 62px Pretendard,sans-serif';
    x.fillText(dir>0?'\u25b2':'\u25bc', 84, H/2+2);
    x.fillStyle='#FFC66B'; x.font='bold 74px Pretendard,sans-serif';
    x.fillText(String(label), 206, H/2+2, 150);
  }else{
    x.fillStyle='#FFC66B'; x.font='bold 78px Pretendard,sans-serif';
    x.fillText(String(label), W/2, H/2+2, 250);
  }
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
var fpEvInds=[], fpEvDir=0;          // 세워 둔 층의 복도 표시기들 · 지금 진행 방향
function fpSetHallInd(label, dir){
  for(var i=0;i<fpEvInds.length;i++){
    var m=fpEvInds[i];
    if(!m || !m.material) continue;
    m.material.map=fpEvHallTex(label, dir);
    m.material.needsUpdate=true;
  }
}
/* 복도 호출 버튼판(▲▼) */
function fpEvCallTex(){
  if(FP_TEX['evcall']) return FP_TEX['evcall'];
  var W=140, H=230;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  var gd=x.createLinearGradient(0,0,W,0);
  gd.addColorStop(0,'#8E9AA6'); gd.addColorStop(0.45,'#C9D3DA'); gd.addColorStop(1,'#7E8A96');
  x.fillStyle=gd; x.fillRect(0,0,W,H);
  x.strokeStyle='#5B6670'; x.lineWidth=5; x.strokeRect(3,3,W-6,H-6);
  x.textAlign='center'; x.textBaseline='middle';
  [['\u25b2',72,'#FF6A4A'],['\u25bc',158,'#39434E']].forEach(function(a){
    x.beginPath(); x.arc(W/2,a[1],34,0,Math.PI*2);
    x.fillStyle='#EDF2F6'; x.fill();
    x.lineWidth=5; x.strokeStyle='#6E7A85'; x.stroke();
    x.fillStyle=a[2]; x.font='bold 34px Pretendard,sans-serif';
    x.fillText(a[0],W/2,a[1]+1);
  });
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX['evcall']=t; return t;
}
/* 복도용 평면 만들기 — 만든 재질은 페이드 목록에 등록해 둔다 */
/* 하이브리드 PBR: 반사가 중요한 [바닥 타일]·[금속 난간]만 MeshStandardMaterial 사용.
   벽·천장은 성능을 위해 기존 MeshBasic/Phong 유지. */
function fpMkFloorPlane(w,h,col,op){
  var mat=new THREE.MeshStandardMaterial({color:col, roughness:0.45, metalness:0.1,
    transparent:true, opacity:op, side:THREE.DoubleSide});
  fpCorrMats.push({m:mat, op:op});
  var ms=new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat);
  ms.renderOrder=-2;
  return ms;
}
/* ── 실사형 개선 : 복도 바닥 광택 테라조 ──────────────────────────
   기존 복도 바닥은 무광 단색(fpMkPlane)이라 반사가 전혀 없었다 — 실제
   사진처럼 천장 조명이 바닥에 은은하고 길게 반사되도록, 테라조 텍스처 +
   MeshStandardMaterial(roughness 0.28 / metalness 0.05)로 별도 마감한다
   (요청 반영: 수치는 여기서만 조정하면 됨). */
function fpMkFloorGloss(w,h,tex){
  var mat=new THREE.MeshStandardMaterial({map:tex, color:0xE2DFD6,
    roughness:0.62, metalness:0.02,             // ← 광택 정도(요청 반영: 빛반사 하이라이트가 너무 강해서 더 낮춤. 0.42→0.62)
    transparent:true, opacity:1, side:THREE.DoubleSide});
  fpCorrMats.push({m:mat, op:1});
  var ms=new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat);
  ms.renderOrder=-2;
  return ms;
}
function fpMkRailBox(w,h,d,col,op){
  var mat=new THREE.MeshStandardMaterial({color:col, roughness:fpJit(0.3,0.03), metalness:0.4,
    transparent:true, opacity:(op===undefined?1:op)});
  fpCorrMats.push({m:mat, op:(op===undefined?1:op)});
  var mb=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  mb.renderOrder=-2;
  return mb;
}
/* ── 실사형 개선(1차) : 공용 미세 노이즈 텍스처 ──────────────────────────
   지금까지 벽·박스 대부분이 MeshBasicMaterial(빛을 전혀 안 받는 자체발광 단색)
   이라, 같은 공간 안에서도 벽마다 명암 차이가 전혀 없이 전부 똑같이 평평해
   보였다(사진 특유의 "구조감·재질감"이 안 느껴지는 가장 큰 원인).
   → 색상은 그대로 두되(기존 팔레트/느낌 유지), 재질만 조명을 받는
   MeshStandardMaterial로 바꾸고, 아주 옅은 회색조 절차적 노이즈를 곱해
   미세한 색상 편차·거친 표면 느낌을 더한다. 노이즈는 1장만 만들어
   재사용하고, 평면 크기에 맞춰 repeat만 조절해 타일링한다(성능 영향 최소화).
   emissive(네온 사인류)는 기존 MeshPhongMaterial 그대로 유지한다. */
var FP_NOISE_TEX=null;
/* 요청 반영(실사진 3번째 사진처럼) : 나가는 문 너머 바깥 벽돌 텍스처는
   아래쪽(fpBrickTex, fpBrickTexFor)에서 한 번에 관리한다. 여기 있던 같은 이름의
   중복 함수 선언은 자바스크립트 호이스팅 규칙상 뒤에 있는 선언에 항상 가려져
   실제로는 한 번도 실행되지 않는 죽은 코드였다 — 혼동을 막기 위해 정리한다. */
function fpEnsureNoiseTex(){
  if(FP_NOISE_TEX) return FP_NOISE_TEX;
  var N=128, cv=document.createElement('canvas'); cv.width=cv.height=N;
  var x=cv.getContext('2d'), img=x.createImageData(N,N);
  for(var i=0;i<N*N;i++){
    /* 190~255 사이의 옅은 회색 얼룩 — 곱연산(Standard의 map*color)에 쓰이므로
       255에 가까울수록 원래 색이 그대로 살고, 낮을수록 살짝 어두운 얼룩이 진다. */
    var v=196+Math.floor(Math.random()*58);
    var k=i*4; img.data[k]=v; img.data[k+1]=v; img.data[k+2]=v; img.data[k+3]=255;
  }
  x.putImageData(img,0,0);
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.minFilter=THREE.LinearMipMapLinearFilter;
  /* 텍스처 오브젝트 하나만 만들어 건물 전체 벽/박스가 공유한다(개별 clone 금지 —
     수천 개 mesh마다 별도 GPU 텍스처를 새로 올리면 초기 로딩이 멎는다).
     repeat도 여기서 한 번만 고정값으로 정해 둔다(면마다 정확히 다른 배율을
     주지는 못하지만, 이 정도 옅은 얼룩은 그 차이가 눈에 띄지 않는다). */
  t.repeat.set(7,7);
  FP_NOISE_TEX=t;
  return t;
}
function fpMkPlane(w,h,col,op,emi){
  var mat;
  if(emi===undefined){
    var nt=fpEnsureNoiseTex();
    mat=new THREE.MeshStandardMaterial({color:col, map:nt, roughness:0.88, metalness:0.04,
      transparent:true, opacity:op, side:THREE.DoubleSide});
  }else{
    mat=new THREE.MeshPhongMaterial({color:col, emissive:emi, emissiveIntensity:0.5, shininess:40,
      transparent:true, opacity:op, side:THREE.DoubleSide});
  }
  fpCorrMats.push({m:mat, op:op});
  var ms=new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat);
  /* 벽·문은 반투명(페이드용)이라 기본 정렬로는 벽 뒤의 이름표 스프라이트가 위에 그려진다
     → 투명 큐에서 가장 먼저 그려 깊이를 먼저 써 두면 뒤쪽 이름표가 정상적으로 가려진다. */
  ms.renderOrder = -2;
  return ms;
}
/* 계단 단·난간처럼 두께가 있어야 입체로 읽히는 부분은 판이 아니라 상자로 만든다 */
function fpMkBox(w,h,d,col,op,emi){
  var mat;
  if(emi===undefined){
    var nt2=fpEnsureNoiseTex();
    mat=new THREE.MeshStandardMaterial({color:col, map:nt2, roughness:0.88, metalness:0.04,
      transparent:true, opacity:op});
  }else{
    mat=new THREE.MeshPhongMaterial({color:col, emissive:emi, emissiveIntensity:0.45, shininess:30,
      transparent:true, opacity:op});
  }
  fpCorrMats.push({m:mat, op:op});
  var mb=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  mb.renderOrder=-2;
  return mb;
}
/* 은색 크롬 메탈 난간 전용 — MeshStandardMaterial(금속성 0.85 / 거칠기 0.2)이라
   조명을 실제로 받아 반사되는 금속처럼 보인다(fpMkBox는 MeshBasicMaterial이라
   빛을 전혀 안 받아서 계단·난간이 전부 납작하게 보이는 문제가 있었다). */
/* 스테인리스 난간이 사진처럼 밝은 은색 광택으로 보이려면 반사할 대상(envMap)이
   있어야 한다 — 이전엔 아예 없어서 금속성을 낮춰(0.22) 자체발광으로 흉내만 냈는데
   요청대로 실제 금속(metalness 0.85 / roughness 0.2) 값을 쓰려면 진짜 envMap이
   필요하다. 실내처럼 밝은 천장·중간 톤 벽·어두운 바닥을 가진 박스를 한 번만
   구워서(PMREM) 전역에서 재사용한다. */
var FP_ENV_MAP=null;
function fpEnsureEnvMap(){
  if(FP_ENV_MAP || !renderer) return FP_ENV_MAP;
  var envScene=new THREE.Scene();
  var mats=[0xF2F0EA,0xF2F0EA,0xFFFFFF,0x8A8578,0xE8E6DE,0xE8E6DE].map(function(c){
    return new THREE.MeshBasicMaterial({color:c, side:THREE.BackSide});
  });
  var box=new THREE.Mesh(new THREE.BoxGeometry(10,10,10), mats);
  envScene.add(box);
  var bulb=new THREE.PointLight(0xFFFFFF, 1.2, 20); bulb.position.set(0,3,0); envScene.add(bulb);
  var pmrem=new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  var rt=pmrem.fromScene(envScene, 0.04);
  FP_ENV_MAP=rt.texture;
  pmrem.dispose();
  return FP_ENV_MAP;
}
/* 실사형 개선(2차) : 완전히 균일한 재질값 대신, 인스턴스마다 아주 작게
   흔들어서(±) 같은 종류의 금속·난간이라도 미세한 개체차가 나게 한다.
   재질은 원래도 호출마다 새로 만들어지므로(공유 X) 추가 비용이 없다. */
function fpJit(v,r){ return v + (Math.random()*2-1)*r; }
function fpMkMetal(w,h,d,col,op){
  var env=fpEnsureEnvMap();
  var mat=new THREE.MeshStandardMaterial({color:col, metalness:0.85, roughness:fpJit(0.2,0.03),
    envMap:env, envMapIntensity:1.15,
    transparent:true, opacity:(op===undefined?1:op)});
  fpCorrMats.push({m:mat, op:(op===undefined?1:op)});
  var mb=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  mb.renderOrder=-2;
  return mb;
}
/* 방화문 전용 — fpMkMetal은 광택 난간(metalness 0.85/roughness 0.2)용이라
   철문에 그대로 쓰면 하얗게 뭉개지는 반사 얼룩이 생겼다. 실제 방화문은
   분체도장된 매트한 표면이라 금속성은 낮추고 거칠기는 크게 올린다. */
function fpMkDoorMetal(w,h,d,col,op){
  var env=fpEnsureEnvMap();
  var mat=new THREE.MeshStandardMaterial({color:col, metalness:0.2, roughness:fpJit(0.78,0.04),
    envMap:env, envMapIntensity:0.35,
    transparent:true, opacity:(op===undefined?1:op)});
  fpCorrMats.push({m:mat, op:(op===undefined?1:op)});
  var mb=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  mb.renderOrder=-2;
  return mb;
}
/* 진짜 원통형 스테인리스 파이프(레퍼런스 사진의 개구부 난간용) — 사각 박스가
   아니라 CylinderGeometry로 만들어 옆에서 봐도 둥근 파이프 단면이 보이고,
   금속성/거칠기를 더 높여(0.9/0.1) 사진처럼 밝게 반사되는 광택을 낸다.
   axis:'y'(기본, 세로 지주)·'x'(가로 바)·'z'(가로 바, z축 방향)로 눕힐 방향을 고른다. */
function fpMkPipe(len, r, col, op, axis, tilt){
  var env=fpEnsureEnvMap();
  var mat=new THREE.MeshStandardMaterial({color:col, metalness:0.9, roughness:fpJit(0.1,0.025),
    envMap:env, envMapIntensity:1.25,
    transparent:true, opacity:(op===undefined?1:op)});
  fpCorrMats.push({m:mat, op:(op===undefined?1:op)});
  var geo=new THREE.CylinderGeometry(r, r, len, 14);
  var mb=new THREE.Mesh(geo, mat);
  /* axis:'x' — 길이(len)가 로컬 X축을 향하게 눕힌다(옛 BoxGeometry(len,h,d) 관례와 맞춰,
     기존 코드의 bar.rotation.z=ang 식 경사 회전을 그대로 이어 쓸 수 있게 tilt를 더한다). */
  if(axis==='x') mb.rotation.z=Math.PI/2+(tilt||0);
  else if(axis==='z') mb.rotation.x=Math.PI/2+(tilt||0);
  else if(axis==='xz'){ mb.rotation.z=Math.PI/2; mb.rotation.y=(tilt||0); }
  mb.renderOrder=-2;
  return mb;
}
/* 계단 디딤판·챌판처럼 빛을 받아 면끼리 명암 차이가 나야 하는 콘크리트/마감재 */
function fpMkSolid(w,h,d,col,op){
  var mat=new THREE.MeshStandardMaterial({color:col, metalness:0.05, roughness:0.85,
    transparent:true, opacity:(op===undefined?1:op)});
  fpCorrMats.push({m:mat, op:(op===undefined?1:op)});
  var mb=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  mb.castShadow=true; mb.receiveShadow=true;
  mb.renderOrder=-2;
  return mb;
}
/* 동그란 면(문손잡이처럼 원형으로 보여야 하는 작은 부품) */
function fpMkDisc(r,col,op){
  var mat=new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:op, side:THREE.DoubleSide});
  fpCorrMats.push({m:mat, op:op});
  var md=new THREE.Mesh(new THREE.CircleGeometry(r,20), mat);
  md.renderOrder=-2;
  return md;
}
function fpMkTex(w,h,tex,op){
  var mat=new THREE.MeshBasicMaterial({map:tex, transparent:true, opacity:op,
    side:THREE.DoubleSide, depthWrite:false});
  fpCorrMats.push({m:mat, op:op});
  var mt=new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat);
  mt.renderOrder = -1;
  return mt;
}
/* 게시판 — 나무틀 + 초록색 매트에 종이가 붙어 있다(사진의 학과 게시판) */
/* ── 실사형 개선 : 우측 벽면 안내판/포스터 텍스처 플레이트 ──────────────
   실제 사진처럼 복도 벽에 안내문·모집 공고 같은 인쇄물이 붙어 있는
   느낌을 캔버스 텍스처로 간단히 만든다(사진을 그대로 쓰는 대신 절차적
   생성 — 팔레트만 바꾸면 다른 느낌의 포스터를 늘릴 수 있다). */
var FP_POSTER_TEX_CACHE={};
function fpEnsurePosterTex(variant){
  if(FP_POSTER_TEX_CACHE[variant]) return FP_POSTER_TEX_CACHE[variant];
  var W=256, H=340, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  var palettes=[['#F4EFE3','#C0392B'],['#EAF2F6','#2E6B8C'],['#F0F4E8','#4A7A3D']];
  var p=palettes[variant%palettes.length];
  x.fillStyle=p[0]; x.fillRect(0,0,W,H);
  x.fillStyle=p[1]; x.fillRect(0,0,W,42);
  x.fillStyle='#ffffff'; x.font='bold 20px sans-serif';
  x.fillText(['안내','모집','공지'][variant%3], 16, 28);
  x.strokeStyle=p[1]; x.lineWidth=4; x.strokeRect(4,4,W-8,H-8);
  x.fillStyle='#33322D';
  for(var i=0;i<7;i++) x.fillRect(20, 70+i*28, W-40-(i%3)*30, 10);
  var t=new THREE.CanvasTexture(cv);
  FP_POSTER_TEX_CACHE[variant]=t;
  return t;
}
function fpMakePosterPlate(w,h,variant){
  return fpMkTex(w,h,fpEnsurePosterTex(variant),1);
}
function fpMakeNotice(w, title, ko){
  var g=new THREE.Group(), h=1.28, y0=0.92;
  var fr=fpMkBox(w+0.10, h+0.12, 0.09, 0x7C6A52, 1);
  fr.position.set(0, y0+h/2, 0.045); g.add(fr);
  var mat=fpMkPlane(w, h, 0x2E6B57, 1);
  mat.position.set(0, y0+h/2, 0.095); g.add(mat);
  var cols=Math.max(3, Math.round(w/0.52));
  for(var c=0;c<cols;c++){
    for(var r=0;r<2;r++){
      if(((c*3+r*7)%5)===0) continue;
      var pw=0.30+((c*7)%3)*0.03, ph=0.40+((r*5+c)%3)*0.04;
      var pa=fpMkPlane(pw, ph, ((c+r)%4===0)?0xE8EFF6:0xF6F8FA, 1);
      pa.position.set(-w/2+w*(c+0.5)/cols, y0+h*0.72-r*0.52, 0.10); g.add(pa);
      var ln=fpMkPlane(pw*0.7, 0.02, 0x9AB0C4, 1);
      ln.position.set(-w/2+w*(c+0.5)/cols, y0+h*0.72-r*0.52+ph*0.28, 0.105); g.add(ln);
    }
  }
  if(title){
    var tb=fpMkBox(w*0.62, 0.20, 0.05, 0x1B4B9B, 1);
    tb.position.set(0, y0+h+0.10, 0.07); g.add(tb);
    var tt=fpMkTex(w*0.56, 0.15, fpWallTextTex(title, '#F2F8FF'), 1);
    tt.position.set(0, y0+h+0.10, 0.10); g.add(tt);
  }
  return g;
}
/* 정수기 */
function fpMakeCooler(){
  var g=new THREE.Group();
  var b=fpMkBox(0.44,1.16,0.40,0xEFF3F6,1); b.position.set(0,0.58,0.20); g.add(b);
  var t=fpMkBox(0.30,0.28,0.30,0x8FD6E8,0.9); t.position.set(0,1.30,0.20); g.add(t);
  var p=fpMkPlane(0.30,0.22,0x2C3742,1); p.position.set(0,0.80,0.41); g.add(p);
  var k=fpMkPlane(0.22,0.05,0x9AA7B4,1); k.position.set(0,0.63,0.415); g.add(k);
  var lg=fpMkPlane(0.10,0.04,0x39FF88,0.9); lg.position.set(0.12,1.02,0.41); g.add(lg);
  return g;
}
/* 소화기 — 빨간 원통 본체 + 검은 손잡이/노즐 + 바닥 빨간 받침(사진 반영) */
function fpMakeExtinguisher(){
  var g=new THREE.Group();
  var baseW=0.22;
  var base=fpMkBox(baseW,0.03,baseW,0xC0392B,1); base.position.set(0,0.015,0); g.add(base);
  var body=fpMkPipe(0.42,0.075,0xD8382B,1); body.position.set(0,0.03+0.21,0); g.add(body);
  var band=fpMkPipe(0.03,0.078,0x1B1E24,1); band.position.set(0,0.03+0.34,0); g.add(band);
  var neck=fpMkPipe(0.07,0.03,0x2B3138,1); neck.position.set(0,0.03+0.45,0); g.add(neck);
  var handle=fpMkBox(0.14,0.03,0.03,0x1B1E24,1); handle.position.set(0,0.03+0.50,0.02); g.add(handle);
  var hose=fpMkPipe(0.16,0.012,0x1B1E24,1,'x',0.5); hose.position.set(-0.06,0.03+0.30,0.06); g.add(hose);
  return g;
}
/* 사물함 한 줄 */
function fpMakeLockers(w){
  var g=new THREE.Group(), h=1.86, d=0.46;
  var b=fpMkBox(w,h,d,0xAEB6BD,1); b.position.set(0,h/2,d/2); g.add(b);
  var cols=Math.max(4,Math.round(w/0.42)), rows=3, cw=w/cols, ch=h/rows;
  for(var ci=0;ci<cols;ci++) for(var ri=0;ri<rows;ri++){
    var pn=fpMkPlane(cw-0.05, ch-0.05, ((ci+ri)%2)?0xEDE7CE:0xE4D586, 1);
    pn.position.set(-w/2+cw*(ci+0.5), ch*(ri+0.5), d+0.005); g.add(pn);
    var hn=fpMkPlane(0.045,0.085,0x6C737A,1);
    hn.position.set(-w/2+cw*(ci+0.5)-cw*0.30, ch*(ri+0.5), d+0.012); g.add(hn);
  }
  return g;
}
/* 화분 */
function fpMakePlant(){
  var g=new THREE.Group();
  var pot=fpMkBox(0.34,0.40,0.34,0xE8E6E0,1); pot.position.set(0,0.20,0.17); g.add(pot);
  var rim=fpMkBox(0.38,0.05,0.38,0xCFCCC4,1); rim.position.set(0,0.42,0.17); g.add(rim);
  var tr=fpMkBox(0.05,0.62,0.05,0x6B5A46,1);  tr.position.set(0,0.72,0.17); g.add(tr);
  [[0.30,1.00,0.34],[-0.26,1.16,0.30],[0.10,1.34,0.26],[-0.12,0.92,0.28]].forEach(function(a){
    var lf=fpMkPlane(a[2],a[2]*0.78,0x4E8A55,1);
    lf.position.set(a[0],a[1],0.17+0.05); g.add(lf);
    var lf2=fpMkPlane(a[2]*0.8,a[2]*0.6,0x63A467,1);
    lf2.position.set(a[0]*0.6,a[1]+0.06,0.17+0.09); g.add(lf2);
  });
  return g;
}
/* 쓰레통 두 개(사진처럼 파란색) */
function fpMakeBins(){
  var g=new THREE.Group();
  [[-0.24,0x3E7BB8],[0.24,0x3E7BB8]].forEach(function(a,i){
    var b=fpMkBox(0.40,0.62,0.40,a[1],1); b.position.set(a[0],0.31,0.22); g.add(b);
    var r=fpMkBox(0.44,0.05,0.44,0x2C5C8E,1); r.position.set(a[0],0.64,0.22); g.add(r);
    var lb=fpMkPlane(0.26,0.10,0xF2F6FA,1); lb.position.set(a[0],0.40,0.425); g.add(lb);
    if(i===1){ var bag=fpMkPlane(0.34,0.10,0x1A1D22,1); bag.position.set(a[0],0.61,0.30); g.add(bag); }
  });
  return g;
}
/* 브로슈어(잡지) 거치대 — 검은 철제 다리 + 위로 갈수록 좁아지는 3단 경사 진열대,
   각 단에 색깔 있는 브로슈어 낱장이 비스듬히 꽂혀 있다(사진 반영, 새로 추가). */
function fpMakeRack(){
  var g=new THREE.Group();
  var W=0.46, D=0.36, H=1.30, frameCol=0x2B2B2E;
  var post=fpMkBox(0.05,H,0.05,frameCol,1); post.position.set(0,H/2,-D/2+0.03); g.add(post);
  var post2=fpMkBox(0.05,H*0.62,0.05,frameCol,1); post2.position.set(0,H*0.31,D/2-0.03); g.add(post2);
  var base=fpMkBox(W,0.04,D,frameCol,1); base.position.set(0,0.02,0); g.add(base);
  var trayCols=[0xD8433A,0x2F6FB0,0xE8C43E];
  for(var ri=0; ri<3; ri++){
    var ty=0.42+ri*0.30, td=D*(1-ri*0.12);
    var tray=fpMkBox(W,0.03,td,frameCol,1);
    tray.position.set(0, ty, D*0.06); g.add(tray);
    var pf=fpMkPlane(W-0.08,0.20,trayCols[ri],1);
    pf.rotation.x=-0.55;
    pf.position.set(0, ty+0.11, D*0.06+0.10); g.add(pf);
  }
  return g;
}
/* 종이 상자(택배 박스) — 사진처럼 카운터 위에 놓인 갈색 상자, 가운데 테이프 자국.
   (사진 반영, 새로 추가) */
function fpMakeCardboardBox(){
  var g=new THREE.Group();
  var w=0.42, h=0.34, d=0.38;
  var b=fpMkBox(w,h,d,0xC69A63,1,0x5C4626); b.position.set(0,h/2,0); g.add(b);
  var tapeV=fpMkBox(0.07,h+0.005,d+0.005,0x8C6A44,1); tapeV.position.set(0,h/2,0); g.add(tapeV);
  var tapeH=fpMkBox(w+0.005,0.06,d+0.005,0x8C6A44,1); tapeH.position.set(0,h-0.04,0); g.add(tapeH);
  return g;
}
/* 컴퓨터 책상 + 의자 */
function fpMakeDeskPC(){
  var g=new THREE.Group();
  var dt=fpMkBox(1.50,0.06,0.68,0x8C7A63,1,0x201A12); dt.position.set(0,0.74,0.36); g.add(dt);
  [-1,1].forEach(function(sn){
    var lg=fpMkBox(0.07,0.71,0.62,0x4A5566,1); lg.position.set(sn*0.68,0.355,0.36); g.add(lg);
  });
  var mst=fpMkBox(0.26,0.05,0.20,0x2B333B,1); mst.position.set(-0.18,0.80,0.22); g.add(mst);
  var mnk=fpMkBox(0.06,0.24,0.06,0x2B333B,1); mnk.position.set(-0.18,0.92,0.22); g.add(mnk);
  var mbz=fpMkBox(0.68,0.44,0.05,0x1F262D,1); mbz.position.set(-0.18,1.26,0.22); g.add(mbz);
  var msc=fpMkPlane(0.60,0.36,0x2A6F8C,0.95);  msc.position.set(-0.18,1.26,0.252); g.add(msc);
  var kbd=fpMkBox(0.44,0.025,0.16,0x2B333B,1); kbd.position.set(-0.18,0.79,0.56); g.add(kbd);
  var pc=fpMkBox(0.20,0.44,0.44,0x232A31,1);   pc.position.set(0.52,0.22,0.36); g.add(pc);
  /* 의자 */
  var se=fpMkBox(0.46,0.07,0.46,0x39434E,1);  se.position.set(-0.18,0.45,0.98); g.add(se);
  var bk=fpMkBox(0.46,0.50,0.07,0x39434E,1);  bk.position.set(-0.18,0.72,1.20); g.add(bk);
  var po=fpMkBox(0.08,0.38,0.08,0x585F66,1);  po.position.set(-0.18,0.22,0.98); g.add(po);
  var ft=fpMkBox(0.52,0.05,0.52,0x585F66,1);  ft.position.set(-0.18,0.04,0.98); g.add(ft);
  return g;
}
/* 빨간 음료 자판기 — 앞면이 +Z 를 향한다(벽에 붙일 때 rotation.y 로 돌려 쓴다) */
function fpMakeVending(){
  var g=new THREE.Group();
  var W=1.02, H=1.92, D=0.72, fz=D/2;
  var body=fpMkBox(W,H,D,0xB0342A,1);  body.position.set(0,H/2,0); g.add(body);
  var cap =fpMkBox(W+0.05,0.32,D+0.05,0x8C2620,1); cap.position.set(0,H-0.16,0); g.add(cap);
  var sign=fpMkPlane(W-0.08,0.21,0xF4F7F9,1);      sign.position.set(0,H-0.16,fz+0.035); g.add(sign);
  var sgl =fpMkPlane(W-0.24,0.055,0xE0473A,0.95);  sgl.position.set(0,H-0.16,fz+0.045); g.add(sgl);
  var base=fpMkBox(W+0.02,0.10,D+0.02,0x6E1F19,1); base.position.set(0,0.05,0); g.add(base);
  /* 진열창 + 음료캔 */
  var win=fpMkPlane(0.70,0.88,0x17202A,1); win.position.set(-0.12,1.16,fz+0.02); g.add(win);
  var wgl=fpMkPlane(0.70,0.10,0xBFE2F5,0.22); wgl.position.set(-0.12,1.52,fz+0.03); g.add(wgl);
  var cols=[0xE2574B,0x4FA3E0,0xE8B84B,0x67C08A];
  for(var r=0;r<3;r++){
    var shelf=fpMkPlane(0.68,0.02,0x3B4653,1);
    shelf.position.set(-0.12,0.78+r*0.30,fz+0.03); g.add(shelf);
    for(var c=0;c<4;c++){
      var can=fpMkPlane(0.11,0.21,cols[(r+c)%4],1);
      can.position.set(-0.40+c*0.16, 0.90+r*0.30, fz+0.03); g.add(can);
      var lid=fpMkPlane(0.11,0.03,0xD8DEE3,1);
      lid.position.set(-0.40+c*0.16, 1.00+r*0.30, fz+0.04); g.add(lid);
    }
  }
  /* 오른쪽 선택 버튼·동전투입구 */
  var bp=fpMkPlane(0.26,0.92,0xE6EAED,1); bp.position.set(0.34,1.16,fz+0.02); g.add(bp);
  for(var bi=0; bi<3; bi++){
    var bt=fpMkPlane(0.17,0.10,0x2B3138,1);
    bt.position.set(0.34,0.90+bi*0.26,fz+0.03); g.add(bt);
    var bl=fpMkPlane(0.05,0.04,0x39FF88,0.9);
    bl.position.set(0.40,0.90+bi*0.26,fz+0.04); g.add(bl);
  }
  var coin=fpMkPlane(0.22,0.20,0x39434E,1); coin.position.set(0.34,0.62,fz+0.03); g.add(coin);
  var slot=fpMkPlane(0.03,0.09,0x0B1017,1); slot.position.set(0.34,0.66,fz+0.04); g.add(slot);
  /* 아래 꾼내는 구멍 */
  var port=fpMkPlane(0.58,0.26,0x121820,1); port.position.set(-0.12,0.36,fz+0.03); g.add(port);
  var flap=fpMkPlane(0.54,0.05,0x505B66,1); flap.position.set(-0.12,0.48,fz+0.04); g.add(flap);
  return g;
}
/* 옥상에서 보이는 바깥 풍경 — 하늘·구름·멀리 보이는 산과 마을 */
function fpRoofSkyTex(){
  if(FP_TEX['roofsky']) return FP_TEX['roofsky'];
  var W=1024, H=360;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  var sky=x.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#4E93D6'); sky.addColorStop(0.45,'#8FC0E8'); sky.addColorStop(0.78,'#D6E8F5');
  sky.addColorStop(1,'#E7F0F6');
  x.fillStyle=sky; x.fillRect(0,0,W,H);
  x.fillStyle='rgba(255,255,255,0.72)';
  [[110,54,86,20],[300,34,58,14],[520,66,104,22],[760,42,72,17],[930,60,64,15]].forEach(function(c){
    x.beginPath(); x.ellipse(c[0],c[1],c[2],c[3],0,0,Math.PI*2); x.fill();
    x.beginPath(); x.ellipse(c[0]+c[2]*0.5,c[1]+6,c[2]*0.6,c[3]*0.8,0,0,Math.PI*2); x.fill();
  });
  x.fillStyle='#7E9EA8';                                   // 멀리 산능선
  x.beginPath(); x.moveTo(0,272);
  [[70,240],[150,262],[240,222],[330,258],[430,236],[520,266],[620,230],[730,258],[840,238],[940,264],[1024,246]]
    .forEach(function(pt){ x.lineTo(pt[0],pt[1]); });
  x.lineTo(W,H); x.lineTo(0,H); x.closePath(); x.fill();
  x.fillStyle='#5E7F63';                                   // 앞쪽 낮은 산
  x.beginPath(); x.moveTo(0,292);
  [[90,278],[190,296],[300,272],[420,294],[540,276],[660,298],[790,274],[910,296],[1024,282]]
    .forEach(function(pt){ x.lineTo(pt[0],pt[1]); });
  x.lineTo(W,H); x.lineTo(0,H); x.closePath(); x.fill();
  for(var bx=0; bx<W; bx+=46){                             // 멀리 동네 건물
    var bh=18+((bx*13)%26), bw=26+((bx*7)%14);
    x.fillStyle='#9AAAB4'; x.fillRect(bx+6, 306-bh, bw, bh);
    x.fillStyle='rgba(255,255,255,0.35)'; x.fillRect(bx+10, 312-bh, bw-8, 4);
  }
  x.fillStyle='#6E8F6A'; x.fillRect(0,304,W,H-304);        // 나무·땅
  for(var tx=-10; tx<W+30; tx+=30){
    x.beginPath(); x.arc(tx,308,14+((tx*5)%7),0,Math.PI*2); x.fill();
  }
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX['roofsky']=t; return t;
}
/* 옥탑방 벙돌벽 */
/* 노란 점자블록 : 이전엔 그냥 노란 사각형 한 장이라 밋밋했다 → 실제처럼 돌기(도트) 격자를 그린다 */
function fpTerrazzoTex(){
  if(FP_TEX['terrazzo']) return FP_TEX['terrazzo'];
  /* 요청 반영: 실사진처럼 타일 사이 줄눈이 뚜렷하게 보이도록 대비를 높이고,
     화강석/테라조 특유의 반점도 더 선명하게 다시 그린다(기존은 밝은 조명
     아래서 거의 무늬가 안 보일 만큼 대비가 약했다). */
  var W=512, H=512;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#C9C6BC'; x.fillRect(0,0,W,H);          // 회색 바탕(더 또렷하게, 실사진처럼 밝게)
  // 타일 줄눈(약 0.6m 타일 가정, 2x2 분할) — 선을 굵고 어둡게
  x.strokeStyle='#5E594C'; x.lineWidth=5;
  [0,256,512].forEach(function(p){
    x.beginPath(); x.moveTo(p,0); x.lineTo(p,H); x.stroke();
    x.beginPath(); x.moveTo(0,p); x.lineTo(W,p); x.stroke();
  });
  // 테라조/화강석 반점 — 개수·명암폭을 늘려 또렷하게
  for(var i=0;i<2200;i++){
    var px=Math.random()*W, py=Math.random()*H, r=0.8+Math.random()*2.4;
    var v=Math.random();
    x.fillStyle = v<0.45 ? 'rgba(90,86,76,0.55)' : (v<0.78?'rgba(230,226,214,0.6)':'rgba(45,43,38,0.5)');
    x.beginPath(); x.arc(px,py,r,0,Math.PI*2); x.fill();
  }
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.minFilter=THREE.LinearMipmapLinearFilter;
  t.generateMipmaps=true; t.anisotropy=4;
  FP_TEX['terrazzo']=t; return t;
}
/* 밝은 테라조 — 옥상 옥탑방 바닥 전용. 레퍼런스 사진의 바닥이 기존 테라조보다
   눈에 띄게 밝은 베이지 톤이라, 같은 무늬 위에 흰색을 옅게 덮어 밝힌 변형을
   따로 만든다(공용 'terrazzo' 텍스처는 그대로 두어 다른 층에 영향 없음). */
function fpTerrazzoTexLight(){
  if(FP_TEX['terrazzoL']) return FP_TEX['terrazzoL'];
  var src=fpTerrazzoTex();
  var W=256, H=256;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.drawImage(src.image, 0, 0);
  x.fillStyle='rgba(255,252,244,0.34)'; x.fillRect(0,0,W,H);
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.minFilter=THREE.LinearFilter;
  FP_TEX['terrazzoL']=t; return t;
}
/* 옥탑방 실내 천장용 — 텍스(석고보드 흡음) 타일 패널 격자.
   60x60cm 정사각 패널이 반복되는 것처럼, 옅은 홈선 + 미세한 얼룩만
   넣는다(사진처럼 아주 옅어야 하므로 채도·명암 차이를 작게 유지). */
function fpEnsureCeilTileTex(){
  if(FP_TEX['ceilTile']) return FP_TEX['ceilTile'];
  var W=256, H=256, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#E9E6DC'; x.fillRect(0,0,W,H);
  for(var i=0;i<90;i++){                       // 패널 표면의 미세한 얼룩
    var px=Math.random()*W, py=Math.random()*H, r=6+Math.random()*16;
    x.fillStyle='rgba(210,206,194,'+(0.06+Math.random()*0.08)+')';
    x.beginPath(); x.arc(px,py,r,0,Math.PI*2); x.fill();
  }
  x.strokeStyle='rgba(150,146,134,0.55)'; x.lineWidth=2;   // 패널 홈선(정사각 격자, 128px=1패널)
  for(var gx=0; gx<=W; gx+=128){ x.beginPath(); x.moveTo(gx,0); x.lineTo(gx,H); x.stroke(); }
  for(var gy=0; gy<=H; gy+=128){ x.beginPath(); x.moveTo(0,gy); x.lineTo(W,gy); x.stroke(); }
  for(var pi=0;pi<W;pi+=8) for(var pj=0;pj<H;pj+=8){        // 텍스 특유의 미세한 구멍 질감(점묘)
    if(Math.random()<0.5) continue;
    x.fillStyle='rgba(180,176,164,0.10)'; x.fillRect(pi+Math.random()*6, pj+Math.random()*6, 1, 1);
  }
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.minFilter=THREE.LinearMipMapLinearFilter;
  FP_TEX['ceilTile']=t; return t;
}
/* v110: 옥탑방 천장용 회색 텍스타일(0.6×1.2m 직사각 패널, 또렷한 줄눈, 미세 점묘) */
function fpRoofCeilTileTex(){
  if(FP_TEX['roofCeil']) return FP_TEX['roofCeil'];
  var W=256, H=256, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#D3D5D1'; x.fillRect(0,0,W,H);
  for(var i=0;i<70;i++){
    var px=Math.random()*W, py=Math.random()*H, r=6+Math.random()*14;
    x.fillStyle='rgba(190,192,188,'+(0.08+Math.random()*0.10)+')';
    x.beginPath(); x.arc(px,py,r,0,Math.PI*2); x.fill();
  }
  for(var pi=0;pi<W;pi+=5) for(var pj=0;pj<H;pj+=5){
    if(Math.random()<0.55) continue;
    x.fillStyle='rgba(110,112,108,0.18)'; x.fillRect(pi+Math.random()*4, pj+Math.random()*4, 1, 1);
  }
  x.strokeStyle='rgba(95,97,93,0.75)'; x.lineWidth=3;   // 패널 줄눈: 가로 2칸(1.2m) × 세로 1칸(0.6m)
  [0,128,256].forEach(function(gx){ x.beginPath(); x.moveTo(gx,0); x.lineTo(gx,H); x.stroke(); });
  [0,256].forEach(function(gy){ x.beginPath(); x.moveTo(0,gy); x.lineTo(W,gy); x.stroke(); });
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.minFilter=THREE.LinearMipMapLinearFilter;
  FP_TEX['roofCeil']=t; return t;
}
/* 옥탑방 실내 바닥용 — 45cm x 45cm 정사각 실내 타일 격자.
   천장 텍스와 같은 계열(옅은 홈선 + 미세 얼룩)이지만, 바닥은 좀 더 밝고
   반사감이 살짝 있어야 하므로 톤을 조금 더 밝게 잡는다. */
function fpEnsureFloorTileTex(){
  if(FP_TEX['floorTile45']) return FP_TEX['floorTile45'];
  var W=256, H=256, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#C7C4BB'; x.fillRect(0,0,W,H);
  for(var i=0;i<70;i++){                       // 타일 표면의 미세한 얼룩·색편차
    var px=Math.random()*W, py=Math.random()*H, r=8+Math.random()*18;
    x.fillStyle='rgba(196,192,178,'+(0.06+Math.random()*0.09)+')';
    x.beginPath(); x.arc(px,py,r,0,Math.PI*2); x.fill();
  }
  /* 화강석/도끼다시(테라조) 특유의 짙고 옅은 골재 알갱이 점박이(요청 반영) —
     단색 타일로 보이지 않도록 작고 진한 점과 밝은 점을 섞어 흩뿌린다. */
  for(var si=0; si<420; si++){
    var sx=Math.random()*W, sy=Math.random()*H, sr=0.6+Math.random()*1.8;
    var sv=Math.random();
    x.fillStyle = sv<0.55 ? 'rgba(90,86,76,'+(0.35+Math.random()*0.3)+')'
                : sv<0.85 ? 'rgba(150,146,132,'+(0.3+Math.random()*0.25)+')'
                          : 'rgba(255,253,246,'+(0.4+Math.random()*0.3)+')';
    x.beginPath(); x.arc(sx,sy,sr,0,Math.PI*2); x.fill();
  }
  x.strokeStyle='rgba(140,136,122,0.6)'; x.lineWidth=2;   // 45cm 줄눈(128px = 0.45m 타일 1장)
  for(var gx=0; gx<=W; gx+=128){ x.beginPath(); x.moveTo(gx,0); x.lineTo(gx,H); x.stroke(); }
  for(var gy=0; gy<=H; gy+=128){ x.beginPath(); x.moveTo(0,gy); x.lineTo(W,gy); x.stroke(); }
  var ft=new THREE.CanvasTexture(cv);
  ft.wrapS=ft.wrapT=THREE.RepeatWrapping; ft.minFilter=THREE.LinearMipMapLinearFilter;
  FP_TEX['floorTile45']=ft; return ft;
}
function fpPlasterTex(){
  if(FP_TEX['plaster']) return FP_TEX['plaster'];
  var W=256, H=256;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#F0ECE2'; x.fillRect(0,0,W,H);
  // 페인트 벽 특유의 은은한 얼룩·붓자국 느낌(테라조보다 훨씬 옅고 흐릿하게)
  for(var i=0;i<160;i++){
    var px=Math.random()*W, py=Math.random()*H, r=8+Math.random()*22;
    var v=Math.random();
    x.fillStyle = v<0.5 ? 'rgba(226,221,209,0.12)' : 'rgba(255,253,247,0.10)';
    x.beginPath(); x.arc(px,py,r,0,Math.PI*2); x.fill();
  }
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.minFilter=THREE.LinearFilter;
  FP_TEX['plaster']=t; return t;
}
/* 옥상 방수 페인트 바닥 — 단색 초록 대신, 칠 벗겨짐·얼룩이 있는 거친
   콘크리트 방수도장 느낌을 낸다(실사진 반영: 채도 낮은 탁한 녹색). */
function fpRoofPaintTex(){
  if(FP_TEX['roofPaint']) return FP_TEX['roofPaint'];
  var W=256, H=256;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#5E8C6E'; x.fillRect(0,0,W,H);           // 채도 낮춘 탁한 녹색 바탕
  for(var i=0;i<260;i++){
    var px=Math.random()*W, py=Math.random()*H, r=3+Math.random()*16;
    var v=Math.random();
    x.fillStyle = v<0.4 ? 'rgba(70,102,80,0.35)' : (v<0.75?'rgba(140,166,140,0.22)':'rgba(40,58,46,0.30)');
    x.beginPath(); x.arc(px,py,r,0,Math.PI*2); x.fill();
  }
  // 갈라짐/때 자국 — 가는 선 몇 개
  x.strokeStyle='rgba(45,60,48,0.35)'; x.lineWidth=1.4;
  for(var c=0;c<10;c++){
    x.beginPath();
    var sx=Math.random()*W, sy=Math.random()*H;
    x.moveTo(sx,sy);
    for(var s=0;s<4;s++){ sx+=Math.random()*30-15; sy+=Math.random()*30-15; x.lineTo(sx,sy); }
    x.stroke();
  }
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.minFilter=THREE.LinearFilter;
  FP_TEX['roofPaint']=t; return t;
}
function fpBrickExteriorTex(){
  if(FP_TEX['brickExt']) return FP_TEX['brickExt'];
  var W=256, H=256;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#8A5A46'; x.fillRect(0,0,W,H);          // 줄눈(어두운 바탕)
  var bw=32, bh=14;                                     // 벽돌 한 장 크기(반복 텍스처 기준)
  var rows=Math.ceil(H/bh)+1;
  for(var r=0;r<rows;r++){
    var offset=(r%2===0)?0:bw/2;
    for(var c=-1;c<=Math.ceil(W/bw)+1;c++){
      var bx=c*bw+offset, by=r*bh;
      var shade=110+Math.floor(Math.random()*36-18);
      x.fillStyle='rgb('+(shade+34)+','+(shade-16)+','+(shade-30)+')';   // 붉은 벽돌색, 장마다 조금씩 다르게
      x.fillRect(bx+1.5, by+1.5, bw-3, bh-3);
    }
  }
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.minFilter=THREE.LinearFilter;
  FP_TEX['brickExt']=t; return t;
}
/* 회색 사각 판넬(대형 타일) 벽 — 1층 중앙계단 후문 쪽 좌측 벽(사진 반영).
   plaster보다 훨씬 또렷한 줄눈이 있는 넓은 직사각 타일 패턴. */
function fpTilePanelTex(){
  if(FP_TEX['tilepanel']) return FP_TEX['tilepanel'];
  /* 요청 반영: 자잘한 2x2 정사각 타일 대신, 실사진처럼 폭이 넓은 가로형
     직사각 석재 패널(1행 3단) + 뚜렷한 어두운 메지(줄눈)로 다시 그린다. */
  var W=256, H=384;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#B7B2A6'; x.fillRect(0,0,W,H);
  var cols=1, rows=3, gw=W/cols, gh=H/rows;
  for(var r=0;r<rows;r++){
    for(var c=0;c<cols;c++){
      var shade=176+Math.floor(Math.random()*12-6);
      x.fillStyle='rgb('+shade+','+(shade-2)+','+(shade-8)+')';
      x.fillRect(c*gw+3, r*gh+3, gw-6, gh-6);
      // 은은한 얼룩
      for(var i=0;i<14;i++){
        var px=c*gw+Math.random()*gw, py=r*gh+Math.random()*gh, rr=4+Math.random()*10;
        x.fillStyle='rgba(150,145,130,0.10)';
        x.beginPath(); x.arc(px,py,rr,0,Math.PI*2); x.fill();
      }
    }
  }
  x.strokeStyle='#5C574C'; x.lineWidth=6;                    // 뚜렷한 줄눈(그라우트)
  for(var gc=0; gc<=cols; gc++){ x.beginPath(); x.moveTo(gc*gw,0); x.lineTo(gc*gw,H); x.stroke(); }
  for(var gr=0; gr<=rows; gr++){ x.beginPath(); x.moveTo(0,gr*gh); x.lineTo(W,gr*gh); x.stroke(); }
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.minFilter=THREE.LinearFilter;
  FP_TEX['tilepanel']=t; return t;
}
function fpMkTilePanel(w,h,px,py,pz,roty,col){
  var tex=fpTilePanelTex().clone(); tex.needsUpdate=true;
  /* 요청 반영: 반복 단위를 0.62m→1.4m로 늘려, 벽 전체에 큼직한 석재
     패널 몇 장만 이어붙인 것처럼 보이게 한다(자잘한 타일 느낌 제거). */
  tex.repeat.set(Math.max(1,w/1.4), Math.max(1,h/1.4));
  var mat=new THREE.MeshStandardMaterial({color:(col!==undefined?col:0xFFFFFF), map:tex, roughness:0.8, metalness:0.03,
    side:THREE.DoubleSide});
  var m=new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat);
  m.rotation.y=roty||0; m.position.set(px,py,pz);
  return m;
}
/* v126: 계단실 벽(fpMkPlane + emissive 0x39352B)과 완전히 같은 재질의 벽 — 옥탑방 실내 벽·옥상
   개구부 벽에 쓴다. 회벽 텍스처(fpMkWallLit)를 쓰면 조명 아래 톤이 더 밝아, 같은 평면에서 만나는
   5층 계단실 벽(계단참 ±0.45m 구간)과 명암 차이가 띠처럼 보였다("다른 층 벽처럼"). */
function fpMkWallFlat(w,h,col,px,py,pz,roty){
  var m=fpMkPlane(w,h,col,1,0x39352B);
  m.rotation.y=roty||0; m.position.set(px,py,pz); return m;
}
function fpMkWallLit(w,h,col,px,py,pz,roty){
  /* 문·표지판 없이 넓게 펼쳐지는 벽은 무광 단색(fpMkPlane, MeshBasicMaterial)이라
     조명을 전혀 안 받아 정말로 '단색 판때기'처럼 보였다. 옅은 얼룩 텍스처 +
     빛을 받는 재질로 바꿔 실내 벽 특유의 자연스러운 질감을 준다. */
  var tex=fpPlasterTex().clone(); tex.needsUpdate=true;
  tex.repeat.set(Math.max(1,w/2.2), Math.max(1,h/2.2));
  /* side:DoubleSide 필수 — 옥탑방 네 벽 중 z축을 바라보는 두 벽(roty 0 / Math.PI)은
     법선이 방 바깥을 향하도록 세워져 있어서, 기본값(FrontSide)이면 방 안에서 볼 때
     뒷면이라 아예 안 그려진다 → 좌·우로 벽이 없는 것처럼 하늘·산이 그대로 보였다.
     양면으로 그려 어느 쪽에서 봐도 벽이 보이게 한다. */
  var mat=new THREE.MeshStandardMaterial({color:col, map:tex, roughness:0.92, metalness:0.02,
    side:THREE.DoubleSide});
  var m=new THREE.Mesh(new THREE.PlaneGeometry(w,h), mat);
  m.rotation.y=roty||0; m.position.set(px,py,pz);
  return m;
}
function fpTactileTex(){
  if(FP_TEX['tactile']) return FP_TEX['tactile'];
  var W=128, H=128;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#D9AE2E'; x.fillRect(0,0,W,H);
  x.strokeStyle='#B8901F'; x.lineWidth=2;
  x.strokeRect(1,1,W-2,H-2);
  var n=5, st=W/n;
  for(var r=0;r<n;r++){
    for(var c=0;c<n;c++){
      var cxp=st*(c+0.5), cyp=st*(r+0.5);
      x.fillStyle='#B8901F';
      x.beginPath(); x.arc(cxp, cyp+1.5, st*0.28, 0, Math.PI*2); x.fill();
      x.fillStyle='#F0C84A';
      x.beginPath(); x.arc(cxp, cyp, st*0.28, 0, Math.PI*2); x.fill();
    }
  }
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.minFilter=THREE.LinearFilter;
  FP_TEX['tactile']=t; return t;
}
/* 벽에 기대 세워둔 적층 패널(사진 속 포장재) — 비닐 포장 위에 글자가 반복 인쇄된 느낌 */
function fpStackPanelTex(base, txt){
  var key='panel_'+base+'_'+txt;
  if(FP_TEX[key]) return FP_TEX[key];
  var W=128, H=256;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle=base; x.fillRect(0,0,W,H);
  x.globalAlpha=0.18; x.fillStyle='#FFFFFF';
  for(var i=0;i<H;i+=26) x.fillRect(0,i,W,9);       // 포장 비닐 줄무늬
  x.globalAlpha=1;
  x.fillStyle='rgba(255,255,255,0.75)';
  x.font='bold 15px sans-serif'; x.textAlign='center';
  for(var j=28;j<H;j+=54) x.fillText(txt, W/2, j);
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
function fpBrickTex(){
  if(FP_TEX['brick']) return FP_TEX['brick'];
  /* 요청 반영(실사진 벽돌처럼): 배경을 벽돌색이 아니라 밝은 회갈색(줄눈/모르타르)으로
     깔고, 벽돌마다 진짜 틈(gap)을 둬서 그 줄눈이 비쳐 보이게 한다 — 이전에는
     배경 자체가 벽돌색이라 줄눈이 거의 안 보여서 가까이서 보면 밋밋한 단색
     얼룩처럼 보였다. 색상도 5가지 톤을 더 뚜렷하게 갈라 개체차를 살린다. */
  var W=512, H=320, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#C9A46A'; x.fillRect(0,0,W,H);
  var brickCols=['#B0553A','#A64E33','#C46A45','#9C4A30','#B85E3E'];
  var bw=52, bh=24, gap=4;
  for(var row=0, ry=0; ry<H; row++, ry+=bh+gap){
    var offset=(row%2===0) ? 0 : -(bw/2);
    for(var bx=offset; bx<W; bx+=bw+gap){
      x.fillStyle=brickCols[Math.floor(Math.random()*brickCols.length)];
      x.fillRect(bx, ry, bw, bh);
      // 벽돌마다 살짝 얼룩(색 편차)을 더해 사진처럼 개체차가 나게 한다
      x.fillStyle='rgba(0,0,0,'+(Math.random()*0.12)+')';
      x.fillRect(bx, ry, bw, bh);
    }
  }
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearMipMapLinearFilter;
  FP_TEX['brick']=t; return t;
}
/* 요청 반영(시야 비율 정밀 교정 + 이음매 불일치 버그 수정): fpBrickTex()를 그대로
   fpMkTex(w,h,...)에 넘기면 텍스처 한 장이 벽 크기에 맞춰 그대로 늘어나서, 벽이
   클수록 벽돌 한 장 한 장이 실제보다 훨씬 크게(뭉개져) 보인다 — 벽의 실제
   크기(w,h)에 비례해 반복(repeat) 횟수를 정한다.
   요청 반영(버그 수정 이력): 예전엔 폭이 좁은(1~2m) 면에서 벽돌이 흐릿해 보이는
   걸 고치려고 "최소 반복 횟수"를 따로 두었는데, 그 최소값이 비례식보다 커지는
   면에서는 옆 큰 벽돌벽보다 벽돌이 더 작게(빽빽하게) 나와 두 벽이 만나는
   모서리에서 벽돌 크기가 안 맞는 이음매(seam)처럼 보였다. 최소값 대신 비례
   계수 자체를 키워서(1.25→2.6) 좁은 면도 자연스럽게 촘촘해지도록 하고,
   모든 벽돌면이 항상 같은 비례식 하나만 쓰게 해 크기가 어디서나 일치하게 한다. */
function fpBrickTexFor(w,h){
  var base=fpBrickTex();
  var t=base.clone(); t.needsUpdate=true;
  t.wrapS=THREE.RepeatWrapping; t.wrapT=THREE.RepeatWrapping;
  var rx=Math.max(1, Math.round(w*2.6)), ry=Math.max(1, Math.round(h*2.6));
  t.repeat.set(rx, ry);
  return t;
}
/* 요청 반영: 2구간 맨 위 유리문 밖으로 보이는 야외 수목 배경 — 로우폴리 나무
   대신, 실제 사진처럼 살짝 흐릿하게 우거진 초록 숲처럼 보이도록 캔버스에
   구름 같은 초록 블롭을 여러 겹 그린 텍스처 한 장으로 대체한다(모바일 최적화
   유지, 저작권 걱정 없는 절차적 생성). */
var FP_FOREST_TEX=null;
function fpForestBackdropTex(){
  if(FP_FOREST_TEX) return FP_FOREST_TEX;
  /* 요청 반영: 기존엔 옅은 하늘띠 + 초록 얼룩뿐이라 '평평한 초록 판'처럼 보여
     바깥 느낌이 거의 없었다 — 하늘 그라디언트 → 안개 낀 원경 산(2겹) →
     나무선 → 잔디 → 포장길 순으로 층을 쌓아 원근감이 생기게 다시 그린다.
     캔버스 한 장이라 모바일 성능 부담은 그대로(광원·지오메트리 추가 없음). */
  var W=512, H=384, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  var HZ=H*0.46;                       // 수평선

  // 1) 하늘 — 위는 진한 하늘색, 수평선 쪽은 옅게(대기 원근)
  var sky=x.createLinearGradient(0,0,0,HZ);
  sky.addColorStop(0,'#8FC4E8'); sky.addColorStop(0.6,'#BEDDF0'); sky.addColorStop(1,'#E4F0F5');
  x.fillStyle=sky; x.fillRect(0,0,W,HZ);
  // 옅은 구름 몇 덩이
  for(var ci=0; ci<7; ci++){
    var cx0=Math.random()*W, cy0=H*0.06+Math.random()*H*0.22, cw=40+Math.random()*70;
    x.fillStyle='rgba(255,255,255,'+(0.28+Math.random()*0.3)+')';
    x.beginPath();
    for(var cb=0; cb<4; cb++)
      x.ellipse(cx0+cb*cw*0.26, cy0+Math.sin(cb)*4, cw*0.34, cw*0.15, 0, 0, Math.PI*2);
    x.fill();
  }

  // 2) 원경 산 2겹 — 뒤쪽일수록 하늘색에 가깝게(안개)
  function ridge(baseY, amp, col, seed){
    x.fillStyle=col; x.beginPath(); x.moveTo(0,H);
    x.lineTo(0, baseY);
    for(var px=0; px<=W; px+=16){
      var yy = baseY - Math.abs(Math.sin((px+seed)*0.011))*amp
                     - Math.sin((px+seed)*0.031)*amp*0.35;
      x.lineTo(px, yy);
    }
    x.lineTo(W,H); x.closePath(); x.fill();
  }
  ridge(HZ+4,  46, '#9DB9AE', 40);     // 먼 산(옅음)
  ridge(HZ+14, 32, '#7BA07F', 190);    // 중간 산

  // 3) 나무선 — 수평선 바로 아래 촘촘한 수관 실루엣
  var trees=['#3E6B39','#4B7B41','#355C2F','#56894A'];
  for(var ti=0; ti<170; ti++){
    var tx=Math.random()*W, ty=HZ+18+Math.random()*26, tr=9+Math.random()*16;
    x.fillStyle=trees[Math.floor(Math.random()*trees.length)];
    x.globalAlpha=0.75+Math.random()*0.25;
    x.beginPath(); x.ellipse(tx,ty,tr,tr*0.8,0,0,Math.PI*2); x.fill();
  }
  x.globalAlpha=1;

  // 4) 잔디밭 — 나무선 아래부터 화면 끝까지, 앞쪽으로 갈수록 밝고 따뜻하게
  var lawn=x.createLinearGradient(0,HZ+30,0,H);
  lawn.addColorStop(0,'#3F6B36'); lawn.addColorStop(0.5,'#57843F'); lawn.addColorStop(1,'#6E9B4A');
  x.fillStyle=lawn; x.fillRect(0,HZ+30,W,H-(HZ+30));
  // 잔디 결(가로로 옅은 띠) — 평평한 색면 느낌을 깬다
  for(var gi=0; gi<26; gi++){
    var gy=HZ+34+Math.random()*(H-HZ-40);
    x.fillStyle='rgba(255,255,255,'+(0.03+Math.random()*0.05)+')';
    x.fillRect(0, gy, W, 1+Math.random()*3);
  }
  // 잔디 위 관목 몇 개(가까울수록 크게)
  for(var si=0; si<26; si++){
    var sx=Math.random()*W, sy=HZ+40+Math.random()*(H-HZ-50);
    var sr=5+((sy-HZ)/(H-HZ))*16;
    x.fillStyle=trees[Math.floor(Math.random()*trees.length)];
    x.globalAlpha=0.55+Math.random()*0.35;
    x.beginPath(); x.ellipse(sx,sy,sr,sr*0.7,0,0,Math.PI*2); x.fill();
  }
  x.globalAlpha=1;

  // 5) 포장길 — 아래에서 위로 좁아지는 사다리꼴(원근). 바깥으로 이어지는 느낌.
  var pTopY=HZ+44, pTopHW=W*0.055, pBotHW=W*0.26, pCx=W*0.5;
  x.fillStyle='#B9B3A6'; x.beginPath();
  x.moveTo(pCx-pTopHW,pTopY); x.lineTo(pCx+pTopHW,pTopY);
  x.lineTo(pCx+pBotHW,H); x.lineTo(pCx-pBotHW,H); x.closePath(); x.fill();
  x.strokeStyle='rgba(255,255,255,0.22)'; x.lineWidth=2;
  x.beginPath(); x.moveTo(pCx-pTopHW,pTopY); x.lineTo(pCx-pBotHW,H); x.stroke();
  x.beginPath(); x.moveTo(pCx+pTopHW,pTopY); x.lineTo(pCx+pBotHW,H); x.stroke();

  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_FOREST_TEX=t; return t;
}
/* 요청 반영: 맨 위 유리문 가운데 가로 엠보 띠(사진 속 흰 글자 프린트 라인) +
   KSNU 로고 — 절차적 캔버스 텍스처 한 장으로 만든다. */
var FP_DOORBAND_TEX=null;
function fpDoorBandTex(){
  if(FP_DOORBAND_TEX) return FP_DOORBAND_TEX;
  var W=640, H=64, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='rgba(210,225,225,0.35)'; x.fillRect(0,0,W,H);
  x.strokeStyle='#C0392B'; x.lineWidth=5; x.lineCap='round';
  x.beginPath(); x.arc(40,32,18,Math.PI*1.2,Math.PI*1.9); x.stroke();
  x.strokeStyle='#123B8F';
  x.beginPath(); x.arc(46,36,18,Math.PI*1.18,Math.PI*1.92); x.stroke();
  x.fillStyle='rgba(255,255,255,0.92)'; x.font='bold 22px Arial,sans-serif';
  x.textAlign='left'; x.textBaseline='middle';
  x.fillText('KSNU  KUNSAN NATIONAL UNIVERSITY', 78, H/2);
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_DOORBAND_TEX=t; return t;
}
/* 방 이름으로 종류를 가린다 — 같은 갈색 문이도 실험실·PC실·연구실은
   복도에서 보이는 모습이 다르다(문 위 유리로 새어나오는 안의 불빛·문에 붙은 명패). */
function fpRoomKind(nm){
  if(!nm) return 'class';
  var t=String(nm);
  if(/\uad50\uc218\ub2d8?\s*\uc5f0\uad6c\uc2e4|\uba85\uc608\uad50\uc218|\uc2dc\uac04\uac15\uc0ac\uc2e4|\ud559\ubd80\uc7a5\uc2e4/.test(t)) return 'office';
  if(/PC|\uc804\uc0b0|\uc2e4\uc2b5\uc2e4/i.test(t)) return 'pc';
  if(/\uc2e4\ud5d8\uc2e4|\uc5f0\uad6c\uc2e4|\uc5f0\uad6c\uc18c|\bLab\b|LAB/i.test(t)) return 'lab';
  return 'class';
}
/* '전기공학과 김현섭 교수님 연구실' → {dept:'전기공학과', prof:'김현섭'} */
function fpOfficeWho(nm){
  var m=String(nm||'').match(/^(.*?)\s*([\uac00-\ud7a3]{2,4})\s*\uad50\uc218\ub2d8?\s*\uc5f0\uad6c\uc2e4/);
  if(m) return {dept:m[1].trim(), prof:m[2]};
  return {dept:'', prof:''};
}
/* 교수님 연구실 문에 붙은 파란 명패(사진과 같은 형태) */
function fpOfficePlateTex(code, dept, prof, sub){
  var key='op|'+code+'|'+dept+'|'+prof+'|'+(sub||'');
  if(FP_TEX[key]) return FP_TEX[key];
  var W=300, H=440;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#F7F9FB'; x.fillRect(0,0,W,H);
  x.strokeStyle='#C3CDD6'; x.lineWidth=4; x.strokeRect(2,2,W-4,H-4);
  // 윗머리 : 학교 로고 자리(흰 바탕 + 빨간·파란 호)
  x.fillStyle='#123B8F'; x.font='bold 30px Pretendard,sans-serif';
  x.textAlign='left'; x.textBaseline='middle';
  x.fillText('KSNU', 22, 48);
  x.strokeStyle='#C0392B'; x.lineWidth=9; x.lineCap='round';
  x.beginPath(); x.arc(150, 108, 96, Math.PI*1.18, Math.PI*1.86); x.stroke();
  x.strokeStyle='#123B8F'; x.lineWidth=9;
  x.beginPath(); x.arc(150, 120, 96, Math.PI*1.16, Math.PI*1.88); x.stroke();
  // 본문 : 진한 파란 바탕
  x.fillStyle='#12307A'; x.fillRect(14, 74, W-28, H-88);
  x.textAlign='center';
  x.fillStyle='#FFFFFF'; x.font='bold 74px Pretendard,sans-serif';
  x.fillText(code, W/2, 150, W-60);
  x.strokeStyle='rgba(255,255,255,0.35)'; x.lineWidth=3;
  x.beginPath(); x.moveTo(46,206); x.lineTo(W-46,206); x.stroke();
  if(prof){
    x.fillStyle='#DCE7FA'; x.font='bold 30px Pretendard,"맑은 고딕",sans-serif';
    x.fillText(dept||'', W/2, 268, W-56);
    x.fillStyle='#BFD2F2'; x.font='bold 24px Pretendard,"맑은 고딕",sans-serif';
    x.fillText('\uad50\uc218', W/2-88, 348);
    x.fillStyle='#FFFFFF'; x.font='bold 54px Pretendard,"맑은 고딕",sans-serif';
    x.fillText(prof, W/2+18, 348, 168);
  }else{
    x.fillStyle='#FFFFFF'; x.font='bold 38px Pretendard,"맑은 고딕",sans-serif';
    x.fillText(sub||'', W/2, 300, W-56);
  }
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* 문 위 란마(작은 유리창) 너머로 엿보이는 방 안 모습 */
function fpTransomTex(kind){
  var key='tr|'+kind;
  if(FP_TEX[key]) return FP_TEX[key];
  var W=320, H=72;
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#1B2833'; x.fillRect(0,0,W,H);
  if(kind==='pc'){
    x.fillStyle='#0E1A24'; x.fillRect(0,H*0.55,W,H*0.45);
    for(var i=0;i<7;i++){                        // 모니터 줄
      var mx=14+i*44;
      x.fillStyle='#2B3A47'; x.fillRect(mx,26,32,24);
      x.fillStyle='#4FC3F7'; x.fillRect(mx+3,29,26,18);
      x.fillStyle='rgba(120,215,255,0.25)'; x.fillRect(mx-3,24,38,4);
    }
    x.fillStyle='rgba(120,200,255,0.16)'; x.fillRect(0,0,W,22);
  }else if(kind==='lab'){
    x.fillStyle='#0F1C22'; x.fillRect(0,H*0.58,W,H*0.42);
    [[18,20,44,32],[86,12,30,40],[132,26,58,26],[210,16,36,36],[262,24,44,28]].forEach(function(b){
      x.fillStyle='#31424E'; x.fillRect(b[0],b[1],b[2],b[3]);
      x.fillStyle='rgba(90,230,200,0.35)'; x.fillRect(b[0]+4,b[1]+4,b[2]-8,5);
    });
    x.fillStyle='rgba(90,230,200,0.20)'; x.fillRect(0,0,W,18);
    x.fillStyle='rgba(255,255,255,0.10)'; x.fillRect(0,0,W,H);
  }else{
    /* 강의실·연구실 란마 : 사진처럼 살창이 가로로 나뉘어 있고 복도 형광등이 비친다 */
    x.fillStyle='#22343F'; x.fillRect(0,0,W,H);
    x.fillStyle='rgba(231,244,255,0.26)'; x.fillRect(18,10,W-36,9);
    x.fillStyle='rgba(120,160,185,0.55)';
    for(var vi=1; vi<5; vi++) x.fillRect(vi*(W/5)-3, 0, 6, H);
    x.fillStyle='rgba(120,160,185,0.45)'; x.fillRect(0, H/2-3, W, 6);
  }
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* 문에 붙이는 작은 종류 표시(플라스크 / 모니터) */
function fpKindIconTex(kind, ac){
  var key='ki|'+kind+'|'+ac;
  if(FP_TEX[key]) return FP_TEX[key];
  var S=96;
  var cv=document.createElement('canvas'); cv.width=S; cv.height=S;
  var x=cv.getContext('2d');
  x.fillStyle='#0B1219'; x.beginPath();
  x.arc(S/2,S/2,S/2-3,0,Math.PI*2); x.fill();
  x.strokeStyle=ac; x.lineWidth=5; x.stroke();
  x.strokeStyle=ac; x.fillStyle=ac; x.lineWidth=6; x.lineJoin='round';
  if(kind==='lab'){                      // 플라스크
    x.beginPath();
    x.moveTo(38,24); x.lineTo(58,24); x.moveTo(44,24); x.lineTo(44,44);
    x.lineTo(28,72); x.lineTo(68,72); x.lineTo(52,44); x.lineTo(52,24);
    x.stroke();
    x.globalAlpha=0.55; x.beginPath();
    x.moveTo(36,58); x.lineTo(60,58); x.lineTo(68,72); x.lineTo(28,72);
    x.closePath(); x.fill(); x.globalAlpha=1;
  }else{                                 // 모니터
    x.strokeRect(24,26,48,34);
    x.globalAlpha=0.5; x.fillRect(29,31,38,24); x.globalAlpha=1;
    x.beginPath(); x.moveTo(48,60); x.lineTo(48,70);
    x.moveTo(34,72); x.lineTo(62,72); x.stroke();
  }
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  FP_TEX[key]=t; return t;
}
/* 문 한 짝(문틀·문짝·손잡이·유리창·명찰·픽토그램) — 로컬 +Z 를 복도 쪽으로 본다 */
/* ── 걸어서 다가가면 문이 자동으로 열리는 효과 ─────────────────────
   fpMakeDoor(강의실·연구실 문)·fpMakeGate(정문/동문/서문·크리에이티브 존
   출입문)에서 만든 경첩(pivot) 그룹을 모아 두고, 매 프레임 플레이어와의
   거리를 재서 가까우면 열고 멀어지면 다시 닫는다. 층이 바뀌거나 복도를
   다시 지을 때는 fpClearCorr()에서 이 목록을 비운다. */
var fpAutoDoors=[];
function fpRegisterAutoDoor(hostGroup, pivot, doorW, swingSign, openAngle, triggerDist, oneWayZSign, pushAway){
  fpAutoDoors.push({
    pivot:pivot,
    host:hostGroup,                        // 문 전체 그룹 — 문짝이 열려도 안 돌아가므로 '문이 향한 방향' 기준으로 쓴다
    push:!!pushAway,                       // true: 다가온 쪽 반대편으로(미는 방향으로) 열린다
    flip:1,                                // push 문이 이번에 어느 쪽으로 열릴지(문이 닫혀 있을 때만 다시 정한다)
    nz:undefined,                          // 기본 회전에서 문짝이 밀려나는 월드 z 방향(캐시)
    k:0,                                   // 0=닫힘 ~ 1=활짝 열림(부드럽게 보간)
    swing:(swingSign||1),
    maxAngle:(openAngle!==undefined?openAngle:1.15),
    trig:(triggerDist!==undefined?triggerDist:Math.max(2.4, (doorW||FP_DOOR_W)+1.3)),
    oneWay:(oneWayZSign||0),               // -1: 문의 월드 z보다 작을 때(바깥/복도)만 열림, +1: 클 때만, 0: 양쪽 다
    wp:new THREE.Vector3()                 // 문의 월드 좌표 캐시(문 자체는 안 움직이므로 한 번만 계산)
  });
}
/* 미닫이(슬라이딩) 문용 자동 열림 등록 — 중문처럼 회전(경첩) 대신 옆으로
   미끄러져 열리는 문에 쓴다. leaf 자체의 기준 z(baseZ)에서 slideZ만큼
   더 바깥쪽으로 밀려나가게(열림) 보간한다. */
function fpRegisterAutoSlideDoor(leaf, baseZ, slideZ, triggerDist, oneWayZSign){
  fpAutoDoors.push({
    slide:true, leaf:leaf, baseZ:baseZ, slideZ:slideZ,
    k:0,
    trig:(triggerDist!==undefined?triggerDist:2.6),
    oneWay:(oneWayZSign||0),
    wp:new THREE.Vector3()
  });
}
function fpUpdateAutoDoors(dt){
  if(!fpAutoDoors.length) return;
  if(!fpCorrG || !fpCorrG.visible) return;   // 1인칭 복도가 안 보이면(건물 전체보기 등) 계산할 필요 없음
  for(var i=0;i<fpAutoDoors.length;i++){
    var d=fpAutoDoors[i];
    if(!d.wp._fpSet){
      if(d.slide) d.leaf.getWorldPosition(d.wp); else d.pivot.getWorldPosition(d.wp);
      d.wp._fpSet=true;
    }
    var dx=fpPos.x-d.wp.x, dz=fpPos.z-d.wp.z;
    var dist=Math.sqrt(dx*dx+dz*dz);
    /* ── 미는 방향으로 열리는 문(push) ─────────────────────────────
       fpMakeGate의 문짝은 기본 회전(rotation.y = -swing*k*maxAngle)에서 항상
       문 로컬 -Z 쪽으로 밀려난다. 그 방향이 월드에서 어느 쪽인지(nz)를 문
       그룹(host)의 회전으로 한 번만 계산해 두고, 플레이어가 서 있는 쪽과
       비교해서 필요하면 회전 부호를 뒤집는다 — 실제 문처럼 항상 '내가 선
       반대쪽으로' 밀리며 열린다.
       열리는 도중에 문을 통과하면 앞뒤가 뒤바뀌어 문이 순간이동하듯 튀므로,
       방향은 문이 완전히 닫혀 있을 때만 새로 정한다(latch). */
    if(d.push && !d.slide){
      if(d.nz===undefined && d.host){
        var _q=new THREE.Quaternion(); d.host.getWorldQuaternion(_q);
        d.nz=new THREE.Vector3(0,0,-1).applyQuaternion(_q).z;
      }
      if(d.k<=0.002 && d.nz!==undefined){
        var want=(fpPos.z<d.wp.z)?1:-1;          // 플레이어 반대쪽(밀어내는 쪽)
        var have=(d.nz>=0)?1:-1;                 // 기본 회전에서 문짝이 가는 쪽
        d.flip=(want===have)?1:-1;
      }
    }
    var sideOk = !d.oneWay || (d.oneWay<0 ? fpPos.z<d.wp.z : fpPos.z>d.wp.z);
    var target=(dist<d.trig && sideOk)?1:0;
    /* 요청 반영: 한 번에 문 앞까지 걸어가는 동안 문이 다 열리지 못하고
       도착해 버리는 일이 없도록 여닫히는 속도를 조금 올린다. */
    var sp=Math.min(1, dt*5.6);            // 문이 여닫히는 속도
    d.k += (target-d.k)*sp;
    if(Math.abs(target-d.k)<0.001) d.k=target;
    if(d.slide){ d.leaf.position.z = d.baseZ + d.slideZ*d.k; }
    else{ d.pivot.rotation.y = -d.swing*d.k*d.maxAngle*(d.push?d.flip:1); }
  }
}
function fpMakeDoor(o){
  var g=new THREE.Group();
  var w=o.w||FP_DOOR_W, h=o.h||FP_DOOR_H;
  var ac=o.accent||'#00E5FF';
  var acN=parseInt(ac.slice(1),16);
  /* 사진과 같은 실제 강의실 문 : 짙은 회색 문틀 + 갈색 문짝 +
     문 위 란마(작은 유리창) + 도어클로저 + 황동빛 둥근 손잡이. */
  /* 요청 반영(디자인): 화장실 문은 나무가 아니라 실제처럼 밝은 회백색 도장
     문으로 구분하고, 강의실 문은 조금 더 밝은 오크 톤으로 정리한다. */
  var isWc=(o.sign==='wcM'||o.sign==='wcW');
  var FRM=0x39434E, LEAF=0xA5866A, LEAF2=0xBB9B7C;  // 문짝 색상 살짝 밝게(요청 반영: 1인칭에서 더 잘 보이도록)
  if(isWc){ FRM=0x7F8992; LEAF=0xE2E7EA; LEAF2=0xF3F6F8; }
  var glass=(o.window!==false);                    // 강의실 문에만 문 위 란마를 둔다
  var lh=glass ? h-0.36 : h;                       // 문짝 높이
  /* 걸어서 다가가면 문이 실제로 열리는 효과 : 문짝(leaf)·손잡이·푸시바처럼
     '문에 붙어서 같이 움직여야 하는' 부분만 pivot(경첩) 그룹에 담고,
     문틀·란마·명찰·카드리더처럼 벽에 고정된 부분은 그대로 g에 남긴다.
     경첩은 손잡이 반대쪽(오른쪽, x=+w/2)에 두고, pivot을 그 위치로 옮긴 뒤
     안쪽 leafGrp을 반대로 -w/2 밀어서 기존 좌표(중앙 0 기준)를 그대로 유지한다. */
  var leafGrp=new THREE.Group();
  var pivot=new THREE.Group();
  pivot.position.set(w/2, 0, 0);
  leafGrp.position.set(-w/2, 0, 0);
  pivot.add(leafGrp);
  // 문틀 안쪽 홈 — 벽에서 살짝 파인 것처럼 보이게
  var rc=fpMkPlane(w+0.28,h+0.18,0x1A2029,1); rc.position.set(0,(h+0.18)/2-0.09,0.004); g.add(rc);
  // 문짝(갈색) + 윗설·걸레받이  (leaf 자체는 pivot을 따라 같이 움직인다)
  var lf=fpMkPlane(w,lh,LEAF,1); lf.position.set(0,lh/2,0.022); leafGrp.add(lf);
  var lt=fpMkPlane(w-0.05,0.045,LEAF2,0.75); lt.position.set(0,lh-0.08,0.030); leafGrp.add(lt);
  var kk=fpMkPlane(w,0.085,isWc?0xAEB6BC:0x6C5643,1); kk.position.set(0,0.043,0.032); leafGrp.add(kk);
  /* 실제 강의동 문처럼, 손잡이 반대쪽에 세로로 긴 좁은 유리(비전 패널)를 둔다 —
     문이 닫혀 있어도 안이 살짝 비쳐 '강의실 문'으로 바로 읽힌다. */
  if(glass && !isWc){
    var vpW=Math.min(0.17, w*0.16), vpH=lh*0.50, vpX=w*0.21, vpY=lh*0.60;
    var vpF=fpMkPlane(vpW+0.05, vpH+0.05, 0x2E3742, 1);
    vpF.position.set(vpX, vpY, 0.030); leafGrp.add(vpF);
    var vpG=fpMkTex(vpW, vpH, fpTransomTex(o.kind||'class'), 0.98);
    vpG.position.set(vpX, vpY, 0.035); leafGrp.add(vpG);
    var vpL=fpMkPlane(vpW*0.66, 0.018, 0xE7F4FF, 0.5);
    vpL.position.set(vpX, vpY+vpH*0.30, 0.038); leafGrp.add(vpL);
  }
  if(glass){
    // 문 위 란마 : 짙은 유리 + 복도 형광등 반사 (란마는 벽/문틀에 고정 — 열려도 안 움직임)
    var tb=fpMkPlane(w+0.02,h-lh,FRM,1);      tb.position.set(0,(lh+h)/2,0.026); g.add(tb);
    /* 란마 너머로 방 안이 엿보인다 — 실험실·PC실은 그 모습이 다르다 */
    var tg2=fpMkTex(w-0.12, h-lh-0.14, fpTransomTex(o.kind||'class'), 0.98);
    tg2.position.set(0,(lh+h)/2,0.032); g.add(tg2);
    var tgl=fpMkPlane(w-0.34,0.045,0xE7F4FF,0.55);     tgl.position.set(0,(lh+h)/2+0.05,0.036); g.add(tgl);
    /* 도어클로저 — 예전엔 넓적한 은색 판 두 장이 문 한가운데쯤에 겹쳐 있어서
       문에 정체불명의 회색 사각형이 붙어 있는 것처럼 보였다(요청 반영: 정리).
       실제처럼 문짝 맨 윗단에 얇은 본체 하나만 붙인다. */
    var dcb=fpMkPlane(0.19,0.052,0xAEB7BE,1); dcb.position.set(w*0.26,lh-0.062,0.046); leafGrp.add(dcb);
  }
  // 손잡이 — 방화문(비상계단)은 밀어서 여는 가로 푸시바로 구분한다 (leaf에 고정 — 같이 움직임)
  if(o.fire){
    var pb=fpMkPlane(w*0.72,0.075,0xD8E8F0,0.95); pb.position.set(0,lh*0.47,0.048); leafGrp.add(pb);
    [-1,1].forEach(function(sn){
      var br=fpMkPlane(0.05,0.16,0xA9C4D2,0.9);
      br.position.set(sn*w*0.30,lh*0.47-0.10,0.046); leafGrp.add(br);
    });
  }else{
    var kx=-(w/2-0.16), ky=lh*0.46;
    /* 요청 반영: 둥근 황동 손잡이 대신, 요즘 강의동에 실제로 달려 있는
       스테인리스 레버 손잡이(둥근 좌판 + 가로 레버)로 바꾼다. */
    var kn=fpMkDisc(0.050, 0xB4BCC3, 1);  kn.position.set(kx,ky,0.048); leafGrp.add(kn);
    var kn2=fpMkDisc(0.030, 0xD8DEE3, 1); kn2.position.set(kx,ky,0.050); leafGrp.add(kn2);
    var lvB=fpMkPlane(0.195,0.033,0xC9D0D6,1); lvB.position.set(kx+0.095,ky,0.052); leafGrp.add(lvB);
    var lvH=fpMkPlane(0.195,0.010,0xF0F4F7,0.9); lvH.position.set(kx+0.095,ky+0.013,0.054); leafGrp.add(lvH);
    if(o.kind==='office'){
      /* 사진처럼 손잡이 바로 위에 세로형 카드키 리더가 붙어 있다 */
      var cr2=fpMkPlane(0.075,0.24,0x1B2129,1); cr2.position.set(kx,ky+0.30,0.048); leafGrp.add(cr2);
      var cr3=fpMkPlane(0.055,0.05,0xC0392B,0.95); cr3.position.set(kx,ky+0.38,0.050); leafGrp.add(cr3);
      var cr4=fpMkPlane(0.045,0.10,0x3A4652,1); cr4.position.set(kx,ky+0.25,0.050); leafGrp.add(cr4);
    }else{
      var lk=fpMkDisc(0.028,0x2B3138,1);  lk.position.set(kx,ky+0.21,0.048); leafGrp.add(lk);
    }
  }
  g.add(pivot);
  // 요청 반영: 문 자동 열림 효과는 이제 지하1층 크리에이티브 존 문 하나에만 적용 —
  // 일반 강의실/연구실 문(이 함수)에서는 자동 등록하지 않는다.
  // 문틀 3면(짙은 회색) + 어느 쪽 복도인지 알려 주는 색 라인
  var fw=0.085;
  var f1=fpMkPlane(fw,h+0.18,FRM,1); f1.position.set(-(w/2+fw/2),(h+0.18)/2-0.09,0.046); g.add(f1);
  var f2=fpMkPlane(fw,h+0.18,FRM,1); f2.position.set( (w/2+fw/2),(h+0.18)/2-0.09,0.046); g.add(f2);
  var f3=fpMkPlane(w+fw*2,fw,FRM,1); f3.position.set(0,h+0.09-fw/2,0.046); g.add(f3);
  var fa=fpMkPlane(w+fw*2,0.024,acN,o.target?0.95:0.55);
  fa.position.set(0,h+0.10,0.050); g.add(fa);
  // 문 옆 카드리더(사진처럼 작은 흰 단말기)
  if(glass){
    var cr=fpMkPlane(0.085,0.125,0xE8EDF2,1); cr.position.set(-(w/2+0.19),1.16,0.048); g.add(cr);
    var cl2=fpMkPlane(0.045,0.016,0x39FF88,0.9); cl2.position.set(-(w/2+0.19),1.20,0.051); g.add(cl2);
    var shF=fpMkPlane(0.172,0.242,0xAAB4BD,1); shF.position.set(-(w/2+0.19),1.52,0.046); g.add(shF);
    var sh=fpMkPlane(0.15,0.22,0xF7FAFC,1); sh.position.set(-(w/2+0.19),1.52,0.048); g.add(sh);
    for(var si=0; si<4; si++){
      var shl=fpMkPlane(0.115,0.013,0x8FA9CC,1);
      shl.position.set(-(w/2+0.19),1.59-si*0.045,0.051); g.add(shl);
    }
  }
  /* 문 옆 명찰(호실번호 + 방 이름). 목적지일 때는
     '목적지' 팫말과 자리를 맞바꿔 번호판이 문 위로 크게 올라온다. */
  /* 요청 반영(버그 수정): 화장실 문(sign 있는 문)의 안내판이 도착 지점에서
     보면 화면을 크게 차지해 문을 가렸다 — 화장실 팻말만 한 단계 더
     작게(0.56→0.40) 줄인다. 다른 문(교수실 등) 명찰 크기는 그대로 둔다. */
  var pw=o.sign?(isWc?0.52:0.40):0.80, labelDir=o.labelFlip?-1:1, sideX=labelDir*(w/2+0.06+pw/2), sideY=Math.min(1.54, h-0.18);
  /* 문틀 윗선과 복도 천장 사이 틈에 딱 들어가도록 크기를 잡는다
     (예전에는 명찰 윗부분이 천장에 가려 번호가 잘려 보였다) */
  var ceilH=(typeof FP_CEIL_H!=='undefined') ? FP_CEIL_H : 2.55;
  var gapB=h+0.12, gapT=ceilH;
  var tpH=Math.max(0.20, Math.min(0.34, (gapT-gapB)-0.04)), tpW=tpH*3;
  var topY=(gapB+gapT)/2;
  /* 요청 반영: 예전엔 목적지 문에서 '호실 문패'를 문 위로 올리고 '목적지'
     표지를 옆으로 내렸는데, 정작 눈에 먼저 들어와야 할 목적지 표지가 옆으로
     밀려나 있었다 — 자리를 서로 맞바꾼다(문패는 늘 옆, 목적지는 문 위 가운데).
     아래 swap 관련 계산은 그대로 두되 항상 false로 둔다. */
  var swap=false;
  /* 교수님 연구실 : 사진처럼 문 한가운데에 파란 명패가 붙고,
     그 아래에 작은 시간표가 한 장 더 붙어 있다. */
  if(o.kind==='office' && o.plate){
    var who=fpOfficeWho(o.roomName), opW=0.28, opH=opW*(440/300);
    var op1=fpMkTex(opW, opH, fpOfficePlateTex(o.plate, who.dept, who.prof, o.plateSub||''),1);
    op1.position.set(0, lh*0.70, 0.046); g.add(op1);
    var op2=fpMkPlane(opW*0.86, 0.075, 0xF2F6FA, 1);
    op2.position.set(0, lh*0.70-opH/2-0.055, 0.046); g.add(op2);
    for(var oi=0; oi<3; oi++){
      var ol=fpMkPlane(opW*0.74, 0.008, 0x8FA9CC, 1);
      ol.position.set(0, lh*0.70-opH/2-0.032-oi*0.022, 0.048); g.add(ol);
    }
  }
  /* 실험실·PC실 : 문에 종류 표시 스티커 */
  if(o.kind==='lab' || o.kind==='pc'){
    var ic=fpMkTex(0.17,0.17,fpKindIconTex(o.kind, o.kind==='lab' ? '#5AE6C8' : '#4FC3F7'),1);
    ic.position.set(w*0.24, lh*0.70, 0.046); g.add(ic);
  }
  if(o.plate){
    var pl;
    if(isWc){
      pl=fpMkTex(pw, pw*0.5, fpWcPlateTex(o.sign, ac, o.plate, o.plateSub||''), 1);
      pl.position.set(sideX, sideY, 0.05);
    }else{
      pl = swap ? fpMkTex(tpW,tpH,fpPlateTex(o.plate,o.plateSub||'',ac,true),1)
                : fpMkTex(pw,pw*0.5,fpPlateTex(o.plate,o.plateSub||'',ac),1);
      if(swap) pl.position.set(0, topY, 0.05);
      else     pl.position.set(sideX, sideY, 0.05);
    }
    g.add(pl);
  }
  // 화장실·계단 픽토그램(문 가운데 + 문 위 표지판)
  if(o.sign){
    if(isWc){
      /* 화장실 문 : 픽토그램만 덩그러니 띄우지 않고, 실제처럼 문 한가운데에
         컬러 표지판(픽토그램 + 한글/영문)을 붙인다. 문짝(leafGrp)에 붙여
         두어 문이 열려도 같이 움직인다. */
      var wbW=Math.min(0.52, w*0.46), wbH=wbW*(400/300);
      var wb=fpMkTex(wbW, wbH, fpWcBoardTex(o.sign, ac, o.plate||'', o.plateSub||''), 1);
      wb.position.set(0, lh*0.60, 0.05); leafGrp.add(wb);
      var s2w=fpMkTex(0.30,0.30,fpSignTex(o.sign,ac),0.95);
      s2w.position.set(0,h+0.26,0.05); g.add(s2w);
    }else{
      var s1=fpMkTex(0.5,0.5,fpSignTex(o.sign,ac),0.95); s1.position.set(0,lh*0.60,0.05); g.add(s1);
      var s2=fpMkTex(0.34,0.34,fpSignTex(o.sign,ac),0.9); s2.position.set(0,h+0.28,0.05); g.add(s2);
    }
  }
  // 목적지 문 : 주변이 은은하게 맥동한다
  if(o.target){
    var gl=fpMkPlane(w+0.86,h+0.66,acN,0.22);
    gl.material.blending=THREE.AdditiveBlending; gl.material.depthWrite=false;
    gl.position.set(0,(h+0.5)/2-0.25,0.008); g.add(gl); fpTgtGlow.push(gl);
    if(!o.sign){
      /* 문 위 틈(gapB~gapT)에 꽉 차게, 문 폭에 맞춘 가로형 배지 */
      var dH=Math.max(0.22, Math.min(0.36, (gapT-gapB)-0.03));
      var dW=Math.min(w+0.30, dH*3.2);
      dH=dW/3.2;
      var tg=fpMkTex(dW, dH, fpDestTex((LANG==='ko')?'목적지':'DESTINATION'), 1);
      tg.position.set(0, Math.min(topY, gapT-dH/2-0.03), 0.052);
      g.add(tg);
    }
  }
  return g;
}
