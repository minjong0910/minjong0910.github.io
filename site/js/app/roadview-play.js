"use strict";
/* roadview-play.js — 1인칭 로드뷰 — 재생(대본 만들기 · 시작 · 멈춤 · 도착)
   (예전 한 파일 main.js 의 11530~11937줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
function fpClearCorr(){
  if(!fpCorrG) return;
  scene.remove(fpCorrG);
  fpCorrG.traverse(function(o){
    if(o.geometry) o.geometry.dispose();
    if(o.material) o.material.dispose();     // 텍스처는 캐시(FP_TEX)라 그대로 둔다
  });
  for(var hi=0; hi<fpHiddenSt.length; hi++) fpHiddenSt[hi].visible=true;
  fpCorrG=null; fpCorrMats=[]; fpTgtGlow=[]; fpHiddenSt=[]; fpAutoDoors=[];
}

/* ── 재생 대본 만들기 ───────────────────────────────────────────
   각 단계는 {dur, to, yaw, y, door, label} 형태. to가 있으면 그 지점까지 걷고
   (걷는 시간은 거리 ÷ 속도로 자동 계산), yaw가 있으면 그 방향을 바라보고,
   y가 있으면 그 높이까지 엘리베이터로 이동, door는 0(닫힘)~1(열림). */
function fpBuildScript(){
  var f  = (target && target.floor!==undefined) ? target.floor : startFloor;
  var ev = evXZ(startFloor);
  var frontX = ev.x - fpEvW(startFloor)/2;          // 엘리베이터 문(복도 쪽) X
  var evzW   = ev.z * BUILDING_Z_STRETCH;           // 건물이 Z로 늘어나 있으므로 월드 좌표로 환산
  var lobbyX = frontX - 1.5;                        // 문 바로 앞(복도 쪽) 대기 위치
  var standX = frontX + FP_STAND;                   // 캡 안에서 설 자리
  /* 엘리베이터 캡 문(x=frontX+0.03)이 건물 3D의 엘리베이터 상자 앞면(x=frontX)보다
     3cm 뒤에 있어서, 복도 쪽에서 보면 상자(주황색 면)가 캡 문을 덮어 버렸다
     (벽을 뚫어 개구부를 만들기 전에는 벽에 가려 안 보이던 문제) → 캡을 복도 쪽으로
     조금 당겨 문이 항상 상자보다 앞에 오게 한다. */
  fpCabPos = {x: frontX - 0.13 + FP_CAB_D/2, z: evzW};
  var yS = fpSlabY(startFloor), yT = fpSlabY(f);
  var p  = targetPos();
  var rx = p.x, rz = p.z*BUILDING_Z_STRETCH;
  /* 지하 크리에이티브 존은 자유 탐색과 같은 새 배치(복도 끝 문 안쪽)를 쓴다
     → 자동재생도 그 자리로 걸어가야 두 모드가 어긋나지 않는다. */
  if(target && target.kind==='zone'){ rx = 0; rz = FP_B1_ZTOP + 6.0; }
  /* 1층 화장실은 통로가 로비 밖으로 옮겨져 있으므로 목적지 z도 그 자리로 맞춘다 */
  if(target && target.kind==='toilet') rz = fpToiletZ(f);
  var ride = Math.abs(yT-yS) > 0.01;
  var ko = (LANG==='ko');
  var S = [];

  /* ── 출발 지점 ────────────────────────────────────────────────
     예전에는 엘리베이터 앞에서 툭 시작해서, 처음 오는 사람은 "그 엘리베이터가
     어디 있는 건지"를 알 수 없었다 → 현재 위치가 1층이면 실제로 찾아오는 순서
     그대로 '문 앞'에서 출발해 문 → 복도 → 엘리베이터로 걸어 들어간다.
     v142: 예전엔 무조건 정문에서만 출발했다 — QR을 찍거나 직접 고른
     문(정문·후문·동문·서문)에서 출발하도록 문마다 진입 구간을 따로 만든다. */
  var fromGate = (startFloor === 1);
  var corrZ = evzW;                                 // 복도에 들어섰을 때의 Z
  var gateKey = null;
  if(fromGate && typeof QRNAV!=='undefined' && QRNAV.gate) gateKey = QRNAV.gate();
  var GATE_KO = {MAIN:'정문', BACK:'후문', EAST:'동문', WEST:'서문'};
  var GATE_EN = {MAIN:'the main gate', BACK:'the back gate',
                 EAST:'the east gate', WEST:'the west gate'};
  if(fromGate && (gateKey==='EAST' || gateKey==='WEST')){
    /* 동문·서문은 복도 양 끝에 있다 → 문 안쪽에서 시작해 복도를 따라 곧장 걸어온다.
       (문 바깥은 어두운 배경판이라 밖에서 시작하면 캄캄한 화면으로 시작된다) */
    var gdir= (gateKey==='EAST') ? 1 : -1;          // 복도 안쪽으로 들어가는 방향
    /* v143: 시작 자리는 직접 걸어보기와 똑같이 fpGateStart1F()에서 가져온다 */
    var gs = fpGateStart1F();
    fpPos = {x: gs.x, y: yS, z: gs.z};
    fpYaw = gs.yaw;                                 // 복도 안쪽을 바라봄
    fpDoorK = 0;
    S.push({dur:1.8, panel:lvLabel(startFloor),
            label: ko ? ('공대 3호관 '+GATE_KO[gateKey]+' 안쪽') : ('Inside '+GATE_EN[gateKey])});
    S.push({to:{x:0, z: gs.z + gdir*2.6},
            label: ko ? (GATE_KO[gateKey]+'으로 들어갑니다') : ('Entering through '+GATE_EN[gateKey])});
    /* v146: 예전엔 목적지와 상관없이 무조건 엘리베이터 앞(evzW)까지
       걸어갔다 → 동문 바로 옆 비상계단처럼 문 근처가 목적지일 때도 복도를 끝까지
       갔다가 되돌아오는 이상한 길이 됐다. 엘리베이터를 실제로 탈 때(ride)만 그리로
       가고, 아니면 문 안쪽에서 곧바로 목적지 쪽으로 향한다. */
    corrZ = gs.z + gdir*2.6;
    if(ride){
      S.push({to:{x:0, z: evzW},
              label: ko ? '복도를 따라 이동' : 'Along the corridor'});
      corrZ = evzW;
    }
  }else if(fromGate && gateKey==='BACK'){
    /* v144: 후문 문 앞(1층 중앙계단실 = 후문 로비의 유리문 안쪽)에서
       출발해 → 계단홀을 가로질러 → 복도로 나간다. 좌표는 직접 걸어보기와 같은
       fpGateStart1F()에서 가져온다. */
    var gsB = fpGateStart1F(), stZW = gsB.z;
    fpPos = {x: gsB.x, y:yS, z: stZW};
    fpYaw = gsB.yaw;                                // -X(계단홀 안쪽) 쪽을 바라봄
    fpDoorK = 0;
    S.push({dur:1.8, panel:lvLabel(startFloor),
            label: ko ? '공대 3호관 후문 앞' : 'At the back gate'});
    S.push({to:{x: FP_WALL_X + FP_ST_LAND*0.5, z: stZW},
            label: ko ? '후문으로 들어와 계단홀을 지납니다' : 'In through the back gate, across the stair hall'});
    S.push({to:{x: 0, z: stZW},
            label: ko ? '복도 한가운데로' : 'To the middle of the corridor'});
    corrZ = stZW;                                   // v146: 엘리베이터로 가는 건 ride일 때만
    if(ride){
      S.push({to:{x: 0, z: evzW},
              label: ko ? '복도를 따라 이동' : 'Along the corridor'});
      corrZ = evzW;
    }
  }else if(fromGate){
    /* 정문 — 예전과 같은 '광장에서 출발' 연출(밖에 광장·하늘이 지어져 있는 유일한 문) */
    fpPos = {x: FP_GATE_OUT, y: yS, z: 0};
    fpYaw = Math.PI/2;                              // +X(건물 정문) 쪽을 바라봄
    fpDoorK = 0;
    S.push({dur:1.8, panel:lvLabel(startFloor),
            label: ko ? '공대 3호관 정문 앞' : 'At the main gate'});
    S.push({to:{x: FP_GATE_X + 3.2, z: 0},
            label: ko ? '정문으로 들어갑니다' : 'Entering through the main gate'});
    S.push({to:{x: -CORR_HALF - 1.2, z: 0},
            label: ko ? '현관을 지나 로비로' : 'Through the entrance hall'});
    corrZ = 0;
  }

  if(ride){
    if(fromGate){
      S.push({to:{x:lobbyX, z:evzW}, label: ko ? '엘리베이터 앞으로' : 'To the elevator'});
    }else{
      fpPos={x:lobbyX, y:yS, z:evzW}; fpYaw=Math.PI/2; fpDoorK=0;   // +X(엘리베이터)를 마주봄
    }
    S.push({dur:1.1, door:1, yaw:Math.PI/2, panel:lvLabel(startFloor),
            label: ko ? '엘리베이터 문이 열립니다' : 'Elevator doors opening'});
    S.push({to:{x:standX, z:evzW},
            label: ko ? '엘리베이터 탑승' : 'Stepping in'});
    S.push({dur:1.5, door:0, yaw:-Math.PI/2,
            label: ko ? '문이 닫힙니다' : 'Doors closing'});
    S.push({dur:1.3 + Math.abs(lvIndex(f)-lvIndex(startFloor))*0.75, y:yT, hide:true,
            label: ko ? (lvName(f)+'으로 이동 중') : ('Going to '+lvName(f))});
    S.push({dur:1.1, door:1, panel:lvLabel(f),
            label: ko ? (lvName(f)+' 도착 · 문이 열립니다') : (lvName(f)+' · doors opening')});
    S.push({to:{x:lobbyX, z:evzW},
            label: ko ? '엘리베이터에서 내립니다' : 'Stepping out'});
    S.push({dur:1.2, door:0,
            label: ko ? '문이 닫힙니다' : 'Doors closing'});   // 내린 뒤 문을 닫는다
    corrZ = evzW;
  }else if(!fromGate){
    fpPos={x:lobbyX, y:yT, z:evzW}; fpYaw=-Math.PI/2; fpDoorK=1;  // -X(복도)를 바라봄
    S.push({dur:0.9, panel:lvLabel(f),
            label: ko ? (lvName(f)+' 엘리베이터 앞에서 출발') : ('Starting at the '+lvName(f)+' elevator')});
  }

  /* 복도 한가운데로 나온 다음 목적지 쪽으로 몸을 돌린다
     (예전에는 복도 건너편 벽만 바라본 채 걸어서 벽이 화면을 가득 채웠다) */
  var dir = (rz >= corrZ) ? 1 : -1;
  var corrYaw = (dir > 0) ? 0 : Math.PI;            // +Z / -Z 중 목적지가 있는 쪽
  /* 같은 층(1층) 목적지라도 현관에서 곧장 방 쪽으로 걸으면 현관 옆벽을 뚫고 지나간다
     → 어떤 경우든 복도 한가운데(x=0)로 먼저 나온 뒤에 이동한다. */
  S.push({to:{x:0, z:corrZ}, label: ko ? '복도로 나갑니다' : 'Into the corridor'});
  S.push({dur:0.95, yaw:corrYaw, label: ko ? '목적지 방향으로' : 'Turning to the corridor'});

  /* 도착 : 복도 벽에 달린 '그 방 문' 바로 앞에 서서 문을 정면으로 마주 본다.
     (예전엔 조금 못 미친 곳에 비스듬히 서서 문이 작고 비껴 보였다) */
  var doorX  = (rx > 0.01) ? CORR_HALF : ((rx < -0.01) ? -CORR_HALF : 0);
  var atDoor = !!(target && doorX!==0 &&
                  (target.kind==='room' || target.kind==='toilet' || target.kind==='emstair'));
  if(atDoor){
    /* 문 바로 앞(복도 한가운데)에 서면 1.8m밖에 안 떨어져 문이 화면을 넘쳐 버린다
       → 복도 반대쪽으로 조금 물러선 자리에 서서 문 전체와 명찰이 함께 보이게 한다. */
    var standAt = -doorX*0.52;
    S.push({to:{x:standAt, z:rz}, label: ko ? '복도를 따라 이동' : 'Along the corridor'});
    S.push({dur:1.5, yaw:(doorX>0 ? Math.PI/2 : -Math.PI/2),
            label: ko ? '목적지 문 앞에 도착' : 'At the destination door'});
  }else{
    // 지하 크리에이티브 존처럼 '문'이 없는 목적지는 예전처럼 조금 못 미쳐 서서 바라본다
    var stopZ = rz - dir*3.8;
    if((stopZ-corrZ)*dir < 0) stopZ = corrZ;
    if(Math.abs(stopZ-corrZ) > 0.4)
      S.push({to:{x:0, z:stopZ}, label: ko ? '복도를 따라 이동' : 'Along the corridor'});
    S.push({dur:1.4, yaw: Math.atan2(rx, rz-stopZ),
            label: ko ? '목적지 앞에 도착' : 'At the destination'});
  }
  /* v148: 마지막에 '여기가 목적지'라는 느낌이 약했다 →
     목적지 바닥에 초록 고리를 띄워 두근두근 커졌다 작아지게 한다.
     비상계단처럼 문패가 없는 목적지에서 특히 효과가 크다. */
  S.push({dur:2.6, arrive:{x:rx, z:rz, y:yT},
          label: ko ? (targetLabel()+' 도착!') : ('Arrived · '+targetLabel())});

  // 걷는 구간 : 거리에 맞춰 시간 계산 + 첫 걸음은 서서히 출발, 마지막은 서서히 정지
  var px=fpPos.x, pz=fpPos.z, first=-1, last=-1;
  for(var i=0;i<S.length;i++){
    if(!S[i].to) continue;
    var d=Math.sqrt(Math.pow(S[i].to.x-px,2)+Math.pow(S[i].to.z-pz,2));
    S[i].dur = Math.max(0.35, d/FP_WALK);
    S[i].ease = 'lin';
    px=S[i].to.x; pz=S[i].to.z;
    if(first<0) first=i;
    last=i;
  }
  if(first>=0) S[first].ease = (first===last) ? 'io' : 'in';
  if(last>=0 && last!==first) S[last].ease = 'out';
  fpSteps = S;
}

function fpEnterStep(){
  var st = fpSteps && fpSteps[fpI];
  if(!st){
    if(fpSeq){ var cb=fpSeqDone; fpSeq=false; fpSeqDone=null; buildingRoot.visible=true; if(cb) cb(); return; }
    fpFinish(); return;
  }
  st.x0=fpPos.x; st.z0=fpPos.z; st.y0=fpPos.y; st.yaw0=fpYaw; st.d0=fpDoorK; st.r0=fpRoofDoorK;
  // 층 이동 구간은 문이 닫혀 있어 밖이 안 보이므로, 캡이 각 층 바닥을 뚫고 지나가는 게
  // 보이지 않도록 그 동안만 건물을 통째로 숨긴다(문이 열리는 순간 다시 켜진다).
  buildingRoot.visible = !st.hide;
  if(st.panel) fpSetPanel(st.panel);
  fpLabel = st.label || '';
  fpCap(fpLabel);
  syncTripBtn();
}

function fpStart(){
  if(!target || !camera || !personG) return;
  fpBuildScript();
  if(!fpSteps || !fpSteps.length) return;
  if(!fpCab){ fpCab = fpMakeCab(); scene.add(fpCab); }
  if(!fpCeil){ fpCeil = fpMakeCeil(); scene.add(fpCeil); }
  fpBuildCorr();            // 복도 벽·문·명찰을 이번 경로에 맞게 새로 세운다
  /* 빨간 동선은 '엘리베이터를 타고 올라가는 길'을 그린 것이라,
     출발층과 목적층이 같은 때는 엘리베이터에서 뿗어나온 선이 오히려 헷갈린다. */
  var sameFl = !!(target && target.floor===startFloor);
  fpRouteFloor(!sameFl);
  if(sameFl && typeof routeA!=='undefined' && routeA) routeA.visible=false;
  if(typeof fpSetCabButtons==='function')
    fpSetCabButtons(sameFl ? null : lvLabel(target.floor));
  fpEvDir = sameFl ? 0 : ((lvIndex(target.floor) > lvIndex(startFloor)) ? 1 : -1);
  fpCab.visible = (startFloor!=='R');
  fpSetXray(false);
  var lg=document.getElementById('legend3d'); if(lg) lg.style.display='none';  // 밖에서 볼 때용 범례는 접어 둔다
  fpActive = true;
  fpPaused = false;
  personAnim.playing = true; personAnim.done = false; personAnim.t = 0;
  personG.visible = false;          // 1인칭에서는 내가 곧 사람이므로 마커는 감춘다
  fpLookYaw = 0; fpLookPitch = 0; fpBob = 0;
  spinPause();                      // 재생 중엔 건물 자동회전을 멈춘다
  resetChaseCam();
  fpI = 0; fpT = 0;
  fpEnterStep();
  fpTick(0);                        // 첫 프레임부터 눈높이가 잡히도록 한 번 계산
}
/* 재생 종료 공통 처리. silent=true 면 목적지가 바뀌어 조용히 정리하는 경우. */
function fpEnd(done, silent){
  fpArriveHide();                                  // v148: 도착 고리는 끝나면 반드시 끈다
  fpFree=false; fpSeq=false; fpSeqDone=null; fpBusy=false; fpPath=null; fpFaceYaw=null;
  if(typeof fpSelHide==='function') fpSelHide('fpEnd');
  if(typeof fpClearNodeG==='function') fpClearNodeG();
  var gd=document.getElementById('fpGuide'); if(gd) gd.classList.remove('on');
  var ct=document.getElementById('fpCtl'); if(ct) ct.classList.remove('on');
  fpRouteFloor(false);      // 동선을 원래 높이(밖에서 보는 용)로 되돌린다
  if(typeof fpSetCabButtons==='function') fpSetCabButtons(null);
  fpEvDir=0;
  fpActive = false;
  fpPaused = false;
  fpZoom = 1;
  inRideView = false;
  personAnim.playing = false;
  personAnim.done = !!done;
  fpLabel = '';
  fpCap('');
  buildingRoot.visible = true;
  fpSetXray(true);
  if(personG) personG.visible = true;
  var lg=document.getElementById('legend3d'); if(lg) lg.style.display='';
  spinResume();
  if(!silent) syncTripBtn();
}
function fpStop(silent){ fpEnd(false, silent); }
function fpFinish(){ fpEnd(true, false); }

/* 매 프레임 호출 : 대본을 한 단계씩 진행시키며 눈높이·시선·문·캡 위치를 갱신 */
/* v148 : 도착 지점 바닥에 띄우는 초록 고리 — 목적지에 닿았다는 느낌을 준다.
   렌더 순서를 높이고 depthTest를 꺼서, 문틀·계단에 살짝 가려도 항상 보이게 한다. */
var fpArriveG = null;
function fpArriveMk(){
  if(fpArriveG) return fpArriveG;
  var g = new THREE.Group();
  var ringM = new THREE.MeshBasicMaterial({color:0x39FF88, transparent:true, opacity:0.85,
                 side:THREE.DoubleSide, depthTest:false, depthWrite:false});
  var ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.92, 44), ringM);
  ring.rotation.x = -Math.PI/2; ring.name='ring'; g.add(ring);
  var discM = new THREE.MeshBasicMaterial({color:0x39FF88, transparent:true, opacity:0.20,
                 side:THREE.DoubleSide, depthTest:false, depthWrite:false});
  var disc = new THREE.Mesh(new THREE.CircleGeometry(0.62, 44), discM);
  disc.rotation.x = -Math.PI/2; disc.name='disc'; g.add(disc);
  g.traverse(function(o){ o.renderOrder = 1200; });
  g.visible = false; scene.add(g);
  fpArriveG = g; return g;
}
function fpArriveShow(a, t){
  var g = fpArriveMk();
  g.position.set(a.x, (a.y||0) + 0.035, a.z);
  g.visible = true;
  var pulse = 1 + 0.16*Math.sin(t*4.2);          // 천천히 두근거리는 크기
  g.scale.set(pulse, 1, pulse);
  var ring=g.getObjectByName('ring'), disc=g.getObjectByName('disc');
  var fade = Math.min(1, t/0.45);                 // 나타날 때 부드럽게
  if(ring) ring.material.opacity = 0.85*fade;
  if(disc) disc.material.opacity = 0.20*fade;
}
function fpArriveHide(){ if(fpArriveG) fpArriveG.visible = false; }

function fpTick(dt){
  if(!fpActive) return;
  inRideView = true;
  if(fpFree && !fpSeq){ fpFreeTick(dt); return; }   // 자유 탐색(연출 구간이 아닐 때)
  if(fpPaused){ fpCommit(fpYaw, 0, 0); return; }      // 일시정지 — 몸은 멈추지만 고개는 계속 돌아간다
  var st = fpSteps[fpI];
  if(!st){
    if(fpSeq){                                       // 자유 탐색 안의 짧은 연출이 끝났다
      var cb=fpSeqDone; fpSeq=false; fpSeqDone=null;
      buildingRoot.visible = true;
      if(cb) cb();
      return;
    }
    fpFinish(); return;
  }
  fpT += dt;
  var k = (st.dur>0) ? Math.min(1, fpT/st.dur) : 1;
  var e = fpEase(st.ease, k);
  if(st.arrive) fpArriveShow(st.arrive, fpT); else fpArriveHide();   // v148

  if(st.door!==undefined) fpDoorK = st.d0 + (st.door-st.d0)*easeIO(k);
  if(st.rdoor!==undefined) fpRoofDoorK = st.r0 + (st.rdoor-st.r0)*easeIO(k);
  var stepLift = 0;   // 계단 구간에서 "지금 이 한 단을 밟는 중" 진행률(0~1) — bob과 y가 같은 박자를 쓰게 공유
  if(st.y!==undefined){
    /* 계단 구간(st.stairs)은 놓이가 매끄럽게 올라가면 엘리베이터처럼 보인다
       → 단 수만큼 계단처럼 끈끙 끊어서 올리고, 한 칸마다 살짝 물러졌다 오른다. */
    if(st.stairs){
      var ns = st.stairs, kk = k*ns, ci = Math.floor(kk), fr = kk-ci;
      var lift = fpClamp((fr-0.18)/0.62, 0, 1);          // 발을 올리는 구간
      stepLift = lift;
      var sK = fpClamp((ci + easeIO(lift))/ns, 0, 1);
      fpPos.y = st.y0 + (st.y-st.y0)*sK;
    }else{
      fpPos.y = st.y0 + (st.y-st.y0)*easeIO(k);
    }
    // 지나가는 층이 표시등에 그대로 바뀌어 보이게 (실제 엘리베이터처럼)
    var idx = Math.round((fpPos.y - SLAB)/SP);
    fpSetPanel(lvLabel(LEVELS[fpClamp(idx, 0, LEVELS.length-1)]));
  }
  var wantYaw = fpYaw;
  if(st.to){
    var nx = st.x0 + (st.to.x-st.x0)*e;
    var nz = st.z0 + (st.to.z-st.z0)*e;
    fpBob += Math.abs(nx-fpPos.x) + Math.abs(nz-fpPos.z);
    fpPos.x = nx; fpPos.z = nz;
    var sdx = st.to.x-st.x0, sdz = st.to.z-st.z0;
    if(Math.abs(sdx)+Math.abs(sdz) > 0.001) wantYaw = Math.atan2(sdx, sdz);
  }
  if(st.yaw!==undefined){
    if(!st.to){
      /* 계단참에서 제자리로 도는 구간 : 목표 각도로 홱 꺾는 대신,
         시작 각도(st.yaw0)에서 목표 각도까지 이 스텝 자체의 이징(e)을 따라
         부드러운 곡선으로 돈다. fpCommit의 최대 회전 속도 제한과 겹쳐 이중으로
         부드러워진다. */
      var dYaw = Math.atan2(Math.sin(st.yaw-st.yaw0), Math.cos(st.yaw-st.yaw0));
      wantYaw = st.yaw0 + dYaw*e;
    }else{
      wantYaw = st.yaw;
    }
  }
  // 걸을 때만 눈높이를 아주 살짝 위아래로 흔들어 실제로 걷는 느낌을 준다
  /* 계단에서는 한 단 한 단 밟는 타이밍(stepLift)에 맞춰 눈높이가 살짝 들렸다
     내려앉는다 — 미리 정해둔 리듬으로 도는 sine이 아니라 실제 발 딛는 순간과
     맞물려서, 엘리베이터처럼 미끄러지는 느낌이 사라진다.
     고개는 계단을 딛는 동안 발밑을 보듯 살짝 아래로 숙였다가, 계단참·층에
     도착하면(구간 시작·끝) 다시 수평(0)으로 자연스럽게 풀린다. */
  if(st.stairs){
    var bobK = Math.sin(stepLift*Math.PI);              // 0→1→0, 발을 딛는 한 걸음의 굴곡
    /* B1↔1F 한 도막 계단처럼 단 높이(rise)가 평소의 2배로 지어진
       구간은, 실제 오르내리는 높이(fpPos.y)만으로도 이미 출렁임이 2배가 되므로
       여기 장식용 bob까지 평소 크기로 얹으면 한 칸마다 훨씬 크게 붕 뜨는
       것처럼 보인다 — st.bobScale로 그 구간만 장식용 bob 크기를 줄인다
       (기본값 1, 넘겨주지 않은 다른 모든 계단은 기존 그대로). */
    var bobScale = (st.bobScale!==undefined) ? st.bobScale : 1;
    var sBob = (bobK*0.065 + Math.sin(k*st.stairs*Math.PI*2*0.5)*0.015) * bobScale;
    var tiltEnv = fpClamp(k/0.18,0,1)*(1-fpClamp((k-0.84)/0.16,0,1));   // 시작·끝에서 0으로 부드럽게 복귀
    fpStairTilt = -0.16*tiltEnv;                          // 오르내림 상관없이 발밑을 보듯 살짝 아래로
    fpCommit(wantYaw, dt, sBob);
  }else{
    fpStairTilt += (0-fpStairTilt)*Math.min(1, dt*4);
    fpCommit(wantYaw, dt, st.to ? Math.sin(fpBob*1.9)*0.045 : 0);
  }
  if(k>=1){ fpI++; fpT=0; fpEnterStep(); }
}
/* 시선 회전·눈높이·천장·엘리베이터 캡을 실제로 반영한다.
   자동재생(fpTick)과 자유 탐색(fpFreeTick)이 똑같이 쓴다. */
function fpCommit(wantYaw, dt, bob){
  // 코너에서 시선이 한 번에 홱 꺾이지 않도록 초당 최대 회전 속도만큼만 따라간다
  var diff = Math.atan2(Math.sin(wantYaw-fpYaw), Math.cos(wantYaw-fpYaw));
  var step = FP_TURN*dt;
  fpYaw = (!dt || Math.abs(diff)<=step) ? wantYaw : fpYaw + (diff>0?1:-1)*step;
  var yaw = fpYaw + fpLookYaw, pit = fpLookPitch + (fpStairTilt||0), ch = Math.cos(pit);
  /* 실사형 개선(2차) : 걷는 동안 아주 미세한 좌우 흔들림도 더한다.
     기존 상하 bob과 같은 값에서 파생시켜(진폭만 더 작게) 정지·일시정지 시엔
     bob이 항상 0으로 넘어오므로 흔들림도 자동으로 0이 된다 — 호출부는 그대로 둔다. */
  var sway=(bob||0)*0.4;
  var ex = fpPos.x + Math.cos(yaw)*sway, ey = fpPos.y + FP_EYE + fpEyeOffset + (bob||0) + fpRoofEyeLift, ez = fpPos.z - Math.sin(yaw)*sway;
  fpLastEye = {x:ex, y:ey, z:ez};
  fpLastAim = {x: ex + Math.sin(yaw)*6*ch, y: ey + Math.sin(pit)*6, z: ez + Math.cos(yaw)*6*ch};
  if(fpCeil) fpCeil.position.set(0, fpPos.y + FP_CEIL_H,
      ((GLOBAL_TOP_Z+GLOBAL_BOT_Z)/2)*BUILDING_Z_STRETCH);
  /* 옥상 철문은 이제 fpRegisterAutoDoor(자동문)가 매 프레임
     스스로 회전을 갱신하므로, 여기서 fpRoofDoorK로 강제로 덮어쓰지 않는다
     (예전엔 이 줄이 자동문 회전을 매 프레임 0으로 되돌려 버렸다). */
  if(fpCab){
    /* 옥상에는 엘리베이터가 안 올라온다 — 캡을 그대로 두면 방수 바닥 위에
       검은 상자가 놓인 것처럼 보인다. */
    if(fpFloorNow==='R') fpCab.visible=false;
    fpCab.position.set(fpCabPos.x, fpPos.y, fpCabPos.z);
    var slide = fpDoorK*(FP_EV_DW/2);
    if(fpDoorL) fpDoorL.position.z = -FP_EV_DW/4 - slide;
    if(fpDoorR) fpDoorR.position.z =  FP_EV_DW/4 + slide;
  }
}
