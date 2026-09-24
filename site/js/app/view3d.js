"use strict";
/* view3d.js — 건물 3D 기본(렌더러·카메라·회전) · 장소 좌표 place3D · 길찾기 그래프 NAVGRAPH · 후보 평면도 · 사람 표시 이동
   (예전 한 파일 main.js 의 2130~2798줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
/* ========== 3D 공통 ========== */
var renderer,scene,camera,floorGroups=[],personG,buildingRoot;
var theta=0.85, phi=1.05, radius=90, spin=true, drag=false, lx=0, ly=0;
var pulseTargets=[];  // 목적지(강의실·화장실·비상계단) 메시 — 은은하게 숨쉬듯 빛나게(beacon 효과)
var pulseFloorTargets=[];  // 가야 할 층의 나머지 강의실들 — 노란색으로 반짝여서 "이 층이다"를 알려줌
function setMatColor(o, hex){
  o.material.color.setHex(hex);
  if(o.material.emissive) o.material.emissive.setHex(hex);
}
/* 이동 재생 구간(inRideView)에서 쓰는 카메라 목표점.
   예전에는 '사람 뒤·위'를 따라다니는 3인칭 추적 카메라였지만, 이제는 아래 1인칭
   로드뷰(fpTick)가 계산한 눈높이·시선을 그대로 받아서 쓴다. */
var chaseEye = null, chaseAim = null, _chaseLast = 0;
function resetChaseCam(){ chaseEye = null; chaseAim = null; _chaseLast = 0; }
var BASE_FOV = 50;                          // 기본 세로 시야각 — 천장이 높아진 만큼 개방감 위해 소폭 확대(45→50)
/* 1인칭에서 확보할 가로 시야각. 세로로 긴 폰 화면은 가로 시야각이 아주 좁아져서
   복도가 바늘구멍처럼 보이므로, '가로로 이만큼은 보이게' 잡고 세로 시야각을 역산한다. */
var RIDE_MIN_HFOV = 74*Math.PI/180;
var autoRadius = 0;                         // 화면 크기에 맞춰 자동 계산된 기준 거리
var _frameLast = 0;                         // 프레임 간격(초) 계산용
var rideSaved = null, rideBlend = 0;
// 건물이 북쪽(위)보다 남쪽(아래)으로 더 길게 뻗어있어(실제 평면도 상 그러함), 회전 중심을 z=0(복도 코어)에 두면
// 화면상 한쪽만 길게 도는 것처럼 불균일해 보임 → 실제 건물 전체의 Z축 무게중심을 회전 기준점으로 사용해 균일하게 보이도록 함.
var BUILDING_MID_Z = (GLOBAL_TOP_Z+GLOBAL_BOT_Z)/2;
// 5번(건물 3D 위치 표시) 화면에서만 건물이 더 길어 보이도록 복도 방향(Z축)으로만 시각적으로 늘림.
// buildingRoot 그룹 전체를 늘리는 방식이라 실제 방 좌표·층 상세(6번) 화면·검색 로직에는 전혀 영향 없음(순수 화면용 배율).
var BUILDING_Z_STRETCH = 1.45;
var camTarget=new THREE.Vector3(0,FLOOR_H*2,BUILDING_MID_Z*BUILDING_Z_STRETCH);

function init3D(){
  var cv=document.getElementById('c3d');
  var isMobilePerf = ('ontouchstart' in window) || navigator.maxTouchPoints>0 || /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);
  /* 모바일 성능 최적화 : 1인칭 실내(fpMakeCorr·fpMakeB1 등)에서 쓰는
     MeshStandardMaterial(PBR)은 픽셀마다 GGX 반사 계산까지 들어가서 무겁다.
     이 프로젝트에서는 항상 {color/map, roughness, metalness}만 넘기고
     나중에 roughness·metalness를 동적으로 바꾸는 곳이 없으므로(확인 완료),
     생성자 자체를 가로채 모바일에서는 자동으로 더 가벼운 MeshLambertMaterial로
     바꿔치기한다. 이렇게 해두면 앞으로 실내 디테일을 추가할 때 계속
     new THREE.MeshStandardMaterial(...)로만 만들어도 모바일 최적화가 계속 자동 적용된다.
     (데스크톱은 그대로 PBR 재질 사용) */
  if(isMobilePerf){
    var _StdMat = THREE.MeshStandardMaterial;
    THREE.MeshStandardMaterial = function(params){
      params = params || {};
      /* Lambert는 스펙큘러(반짝임)가 아예 없어서, 특히 난간·손잡이 같은
         금속 부품(metalness 높음)이 유독 밋밋해 보인다. MeshPhongMaterial은
         PBR(GGX)보다 훨씬 싸면서도 블린-퐁 하이라이트가 있어서 금속·유광
         바닥 느낌을 어느 정도 되살려준다. roughness/metalness 값을 대략적인
         shininess·specular로 변환해서 넘긴다. */
      var rough = (params.roughness!==undefined) ? params.roughness : 0.5;
      var metal = (params.metalness!==undefined) ? params.metalness : 0;
      var p2={};
      for(var k in params){ if(k!=='roughness' && k!=='metalness' && k!=='envMapIntensity') p2[k]=params[k]; }
      p2.shininess = Math.round(4 + (1-rough)*116 + metal*80);   // 대략 4~200
      var sc = 0.12 + metal*0.55 + (1-rough)*0.15;
      p2.specular = new THREE.Color(sc, sc, sc);
      /* ★★ 2026-09-25 : '옥상 문이 투명하다'의 진짜 원인이 여기였다.
         fpEnsureEnvMap() 이 주는 환경맵은 PMREM(CubeUV · mapping 306)이라 PBR 전용이다.
         그걸 Phong 에 그대로 넘기면 three.js 가 ENVMAP_TYPE_CUBE_UV 셰이더를 만드는데,
         Phong 에는 거기 필요한 값이 없어서 **셰이더가 컴파일에 실패한다.**
         컴파일에 실패한 재질은 아무것도 안 그려진다 — 문짝·난간·의자 다리가 통째로 사라진다.
         (콘솔에 "SHADER_NAME MeshPhongMaterial … ENVMAP_TYPE_CUBE_UV … syntax error")
         데스크톱은 PBR 을 그대로 쓰므로 멀쩡했고, 그래서 여태 재현이 안 됐다.
         → 폰에서는 이 환경맵을 떼고 specular(아래 값)로만 금속 느낌을 낸다.
         PMREM 이 아닌 보통 환경맵이면 그대로 쓰되, 세기만 reflectivity 로 옮긴다. */
      if(p2.envMap && p2.envMap.mapping === THREE.CubeUVReflectionMapping){
        delete p2.envMap;
      }else if(params.envMap && params.envMapIntensity !== undefined){
        p2.reflectivity = params.envMapIntensity;
      }
      return new THREE.MeshPhongMaterial(p2);
    };
    THREE.MeshStandardMaterial.__isMobileFallback = true;
  }
  /* 2026-09-25 : 폰에서 계단현상 보정을 끄고 있었는데(antialias:!isMobilePerf),
     의자 다리(굵기 3.5cm)·문틀처럼 얇은 것이 화면에서 한 점보다 가늘어지면 통째로 사라져 보였다
     ("크리에이티브 존 의자 다리가 없다" 제보). 폰에서도 켠다 —
     요즘 폰 GPU 에서 MSAA 는 싸고, 이 장면은 픽셀보다 '그리는 개수'가 병목이라 부담이 크지 않다. */
  renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:false,powerPreference:'high-performance'});
  /* 모바일 성능 최적화 : PCFSoftShadowMap은 그림자 지는 라이트마다 픽셀당 여러 번
     텍셀 샘플링을 해서 모바일 GPU에 부담이 크다 — 모바일에서는 그림자 자체를 꺼서
     프레임을 확보하고(그림자 없이도 앰비언트/디렉셔널 조명으로 입체감은 유지됨),
     데스크톱에서는 기존처럼 부드러운 그림자를 그대로 쓴다. */
  renderer.shadowMap.enabled=!isMobilePerf;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  /* 추가 성능 개선: 드로우콜(한 프레임에 그리는 개별 객체 수)이
     600~700개로 꽤 많아서(장식용 작은 메쉬가 많음), 화면 해상도 배율까지
     높게 잡으면 그 부담이 그대로 배가된다 — 선명도를 조금 양보하고
     1.75 → 1.4로 낮춰 픽셀(프래그먼트) 처리량 자체를 줄인다. */
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobilePerf?1.4:2));
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x040814);
  // 뒤로 최대한 스크롤(줌아웃, radius 최대 260)해도 건물이 안개에 묻혀 어두워지지 않도록,
  // 안개가 실제로 시작되는 거리를 카메라가 갈 수 있는 최대 거리보다 훨씬 멀리 둔다.
  scene.fog=new THREE.Fog(0x040814, 340, 900);
  // Z-파이팅 원인 3: 실내 씬은 far=1000까지 필요 없다 —
  // far를 줄여 깊이버퍼 정밀도(far/near 비율)를 높여서 겹치는 유리·프레임의 깜빡임을 줄인다.
  // 버그 수정: far를 150으로 낮췄더니, 두 손가락으로 최대한
  // 축소(zoom out, radius 최대 260)했을 때 카메라와 대상 사이 거리가 far(150)를
  // 넘어서면서 건물 전체가 원근 절두체(far plane) 밖으로 잘려 사라지는
  // 문제가 생겼다 — far를 radius 최대치(260)보다 확실히 여유 있게(320) 올려서
  // 최대로 축소해도 건물이 계속 보이게 한다(near=0.3은 그대로 두어 앞서
  // 개선한 깊이버퍼 정밀도는 유지).
  camera=new THREE.PerspectiveCamera(65,1,0.3,320);
  // 실사형 개선(2차) : 건물 자체의 조명은 "미래형 홀로그램"이 아니라 실내
  // 형광등 + 창으로 들어오는 자연광이 섞인 실제 공간처럼 보이도록 톤을 낮춘다.
  // (UI의 #00E5FF/#FF2E88/#7B5CFF 브랜드 색상은 CSS이며 여기 영향받지 않는다.
  //  건물 외곽의 시안색 발판 격자·글로우는 "제품샷" 배경 연출이라 그대로 둔다.)
  scene.add(new THREE.AmbientLight(0xEDE7DA,0.42));
  var d=new THREE.DirectionalLight(0xFFF3DE,0.30); d.position.set(40,80,50); scene.add(d);
  var d2=new THREE.DirectionalLight(0xE9ECE8,0.16); d2.position.set(-50,30,-40); scene.add(d2);
  /* 실사형 개선(1차) : 아주 옅은 반구광(천장 쪽은 밝고 바닥 쪽은 살짝 어둡게) —
     기존 홀로그램 무드(청색 앰비언트 + 2방향 디렉셔널)는 그대로 두고,
     벽·바닥이 이제 조명을 받는 재질(MeshStandardMaterial)로 바뀌면서 생긴
     그림자 진 구석이 너무 새까맣게 죽지 않도록 아주 약하게만 채워 준다. */
  scene.add(new THREE.HemisphereLight(0xF3EFE4, 0x22201B, 0.13));
  // 바닥에 깔리는 시안색 격자 — SF 홀로그램 플랫폼 느낌(건물 전체를 밖에서 보는
  // 조감도 모드용 연출). 버그 수정: 1인칭으로 걸어 들어갔을 때도
  // 이 격자가 바닥 아래로 계속 비쳐 보여서 실내 바닥이 "3D 청사진 격자판"처럼
  // 보였다 — 걷기 모드(fpActive)에서는 꺼지도록 animate()에서 토글한다.
  /* 2026-09-25 : 두 손가락으로 최대한 축소(radius 260)하면 이 격자가 240(±120)밖에 안 돼
     건물 뒤쪽이 그냥 검은 배경으로 보였다("바닥이 안 보인다"는 제보).
     칸 크기(5)는 그대로 두고 판만 넓혀, 최대로 축소해도 바닥이 화면을 채우게 한다.
     선 묶음 하나(LineSegments)라 넓혀도 그리는 부담은 거의 늘지 않는다. */
  fpHoloGrid=new THREE.GridHelper(560, 112, 0x1E7A94, 0x0D2A33);
  var grid = fpHoloGrid;
  grid.position.y=-0.4; grid.material.transparent=true; grid.material.opacity=0.38;
  scene.add(grid);
  // 격자 밑에 은은하게 번지는 시안색 빛웅덩이 — 건물이 홀로그램 발판 위에 떠 있는 듯한
  // '제품샷' 느낌을 준다(실사 조명 대신 캔버스 그라디언트로 값싸게 흉내).
  (function(){
    var gcv=document.createElement('canvas'); gcv.width=gcv.height=256;
    var gx=gcv.getContext('2d');
    var rg=gx.createRadialGradient(128,128,0,128,128,128);
    rg.addColorStop(0.00,'rgba(0,229,255,0.30)');
    rg.addColorStop(0.45,'rgba(0,229,255,0.12)');
    rg.addColorStop(1.00,'rgba(0,229,255,0)');
    gx.fillStyle=rg; gx.fillRect(0,0,256,256);
    var poolMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(gcv),
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending});
    var pool=new THREE.Mesh(new THREE.PlaneGeometry(260,260), poolMat);
    pool.rotation.x=-Math.PI/2; pool.position.y=-0.55;
    scene.add(pool);
  })();

  buildingRoot = new THREE.Group();
  buildingRoot.scale.set(1,1,BUILDING_Z_STRETCH);
  scene.add(buildingRoot);

  for(var i=0;i<LEVELS.length;i++){
    var g=new THREE.Group();
    addLevelContents(g, LEVELS[i], false);
    if(edgeMergeOn()) mergeFloorEdges(g);         // v82 : ?merge=1 일 때만
    buildingRoot.add(g); floorGroups.push(g);
  }
  layout();

  // 사람 마커 : 층 사이를 엘리베이터로 이동해야 하므로 buildingRoot 직속으로 붙임
  personG = makePerson();
  // 건물 전체를 담는 뷰에서는 실제 비율의 사람이 점처럼 보이므로 크게 키워 눈에 띄게 한다.
  var PS = 2.65;
  personG.scale.set(PS, PS, PS/BUILDING_Z_STRETCH);   // Z는 부모의 늘림을 상쇄
  /* v137 [핵심 버그 수정] three.js는 Group을 만나면 그 Group의 renderOrder를
     'groupOrder'로 삼고, 정렬할 때 groupOrder를 자식들의 renderOrder보다 **먼저**
     비교한다. makePerson()의 traverse가 그룹 자신에게도 renderOrder=999를 걸어버려서
     사람의 groupOrder가 999가 되었고, 층 그룹(groupOrder 0) 안에 있는 문 이름표는
     renderOrder를 아무리 높여도(1002) 항상 사람보다 먼저 그려졌다.
     → 그룹 자체는 0으로 되돌리고(자식들은 999 그대로) 같은 groupOrder 안에서
       renderOrder로만 앞뒤가 정해지게 한다.
       사람(999) < 출발 문짝(1001) < 문 이름표(1002)                       */
  personG.renderOrder = 0;
  buildingRoot.add(personG);
  placePerson(startFloor, true);
  syncTripBtn();

  animate();
}

/* ── 사람 마커 위치·이동 ─────────────────────────────────────────
   사람은 항상 '엘리베이터 앞'(코어)에 서 있고, 현재 위치 층에 맞춰 높이가 정해진다.
   목적지 층이 다르면 엘리베이터를 타고 그 층까지 올라가는 모션을 반복 재생한다. */
/* 기본은 '사람이 가만히 서 있는' 상태이고, 「이동 경로 보기」 버튼을 눌렀을 때만 1회 재생한다.
   (예전엔 계속 자동 반복 재생 + 건물 자동회전이 겹쳐서 눈으로 따라가기 어려웠음) */
var personAnim = {from:1, to:1, t:0, playing:false, done:false};
var inRideView = false;   // 이동 재생 중(엘리베이터+복도) true — 카메라가 사람을 뒤따르는 3인칭 구도로 전환됨
/* 재생 구간별 시간(초). 예전엔 왕복 9.3초 중 실제 이동이 4.4초뿐이라 너무 빨랐음 → 이동만 약 7.4초. */
var TRIP = {wait:0.7, ride:3.0, stop:0.6, walk:4.4, hold:1.4};
var routeSplit = 0;        // 동선 전체 길이 중 '엘리베이터로 층 이동'이 끝나는 지점(0~1)
var spinBefore = true;     // 재생 전 자동회전 상태(재생이 끝나면 되돌리기 위해 기억)
var spinHeld   = false;
function spinPause(){ if(!spinHeld){ spinBefore = spin; spinHeld = true; } spin = false; }
function spinResume(){ if(spinHeld){ spin = spinBefore; spinHeld = false; } }
function easeIO(k){ k = Math.max(0, Math.min(1, k)); return k<0.5 ? 2*k*k : 1-Math.pow(-2*k+2,2)/2; }
function personY(f){ return lvIndex(f)*SP + SLAB; }
/* 그 층 '엘리베이터'의 평면 좌표. 사람 마커와 빨간 동선은 모두 여기서 출발한다.
   (예전에는 z=0, 즉 엘리베이터와 계단 사이 한가운데에서 출발해서 헷갈렸음) */
function evXZ(f){
  if(f==='B1') return {x: B1_evX, z: B1_evZ};
  var L = FLOOR_LAYOUT[f];
  return L ? {x: L.coreX, z: L.evZ} : {x: 0, z: 0};
}
/* v132 : QR을 찍었거나(또는 직접 선택해서) 확정된 출입문이 있으면, 1층에서는
   그 문 좌표를 '출발 지점'으로 쓴다. 이 4곳의 실제 좌표는 1층 상세 렌더링에서
   출입문을 그릴 때 쓰는 것과 완전히 같은 계산식(FLOORS_DATA[1].doors + doorGeom)
   이다 — 다른 값을 새로 만들면 문 그림 위치와 사람 위치가 서로 어긋나 버린다. */
var GATE_KEY_TO_NAME = {MAIN:'정문', BACK:'후문', EAST:'동문', WEST:'서문'};
function gateXZ(key){
  var name = GATE_KEY_TO_NAME[key];
  if(!name || !FLOOR_LAYOUT[1]) return null;
  var dd = null;
  FLOORS_DATA[1].doors.forEach(function(d){ if(d.name===name) dd = d; });
  if(!dd) return null;
  var L = FLOOR_LAYOUT[1];
  var southZ = EMSTAIR_POS[1] ? (EMSTAIR_POS[1].z - EMSTAIR_RENDER_D/2) : L.bottomOuterZ;
  var doorGeom = {
    north:{x:0, z:L.topOuterZ},
    south:{x:0, z:southZ},
    west: {x:L.halfX, z:L.stZ},
    east: {x:-L.halfX, z:0}
  };
  return doorGeom[dd.side] || null;
}
/* 지금 확정된 출입문 키(MAIN/BACK/EAST/WEST) — QR 스캔·수동 선택 모두 QRNAV.gate()로 동일하게 잡힌다. */
function currentGateKey(){
  return (typeof QRNAV!=='undefined' && QRNAV.gate) ? QRNAV.gate() : null;
}

/* v78 : 장소 코드 하나 → 건물 위 좌표 {floor, x, z, kind, exact, w, d}
   AI 가 아는 모든 장소를 3D 에 놓는다. 3D 검사 · 길찾기 그래프 · 확신도 지도가 이 함수 하나를 쓴다.
   좌표는 전부 앱이 이미 쓰는 값(FLOOR_LAYOUT · evXZ · gateXZ · EMSTAIR_POS · FACILITIES)에서 온다.
   exact:false = 평면도에 표시가 없어 '그 층 어디쯤'으로 둔 곳 (화장실·안내판·창밖·라운지).
   w·d 가 있으면 한 점이 아니라 구역이다 (복도 한쪽 전체, 지하 존 등). */
function place3D(code){
  var c = String(code || '').toUpperCase(), m, L, fl;
  function P(floor, x, z, kind, exact, w, d){ return {floor:floor, x:x, z:z, kind:kind, exact:exact, w:w||0, d:d||0}; }
  if((m = c.match(/^13([1-5])\d\d/))){                       /* 호실 — 13121-A 처럼 나뉜 방은 그 칸 */
    fl = +m[1]; L = FLOOR_LAYOUT[fl]; if(!L) return null;
    var info = L.lookup[c.replace(/-[A-Z]$/, '')]; if(!info) return null;
    var cell = info.cells.filter(function(q){ return String(q.code).toUpperCase() === c; })[0];
    return cell ? P(fl, cell.x, cell.z, 'room', true, cell.w, cell.d) : P(fl, info.x, info.z, 'room', true);
  }
  if(c === 'KTC'){ var k = FLOOR_LAYOUT[4] && FLOOR_LAYOUT[4].lookup.KTC; return k ? P(4, k.x, k.z, 'room', true) : null; }
  if(c === 'B1')   return P('B1', B1_ZONE_MID_X, B1_ZONE_MID_Z, 'zone', true, B1_ZONE_WIDTH_X, B1_ZONE_TOP_Z - B1_ZONE_BOT_Z);
  if(c === 'EVB1'){ var eb = evXZ('B1'); return P('B1', eb.x, eb.z, 'lift', true); }
  if((m = c.match(/^GATE_(MAIN|BACK|EAST|WEST|E|W)$/))){
    var g = gateXZ({E:'EAST', W:'WEST'}[m[1]] || m[1]);
    return g ? P(1, g.x, g.z, 'gate', true) : null;
  }
  if(!(m = c.match(/^(EVIN|EV|ES|EMS|WC|HALL|SIGN|WIN|LNG)([1-5])([LR]?)$/))) return null;   /* BLD 는 한 점이 아니다 */
  var kind = m[1], sd = m[3]; fl = +m[2]; L = FLOOR_LAYOUT[fl]; if(!L) return null;
  var ev = evXZ(fl);
  switch(kind){
    case 'EV': case 'EVIN': return P(fl, ev.x, ev.z, 'lift', true);
    case 'ES':   return P(fl, L.coreX, L.stZ, 'stairs', true);
    case 'EMS':  var es = EMSTAIR_POS[fl]; return es ? P(fl, es.xWhole, es.z, 'emstair', true) : null;
    case 'WC':   return P(fl, FACILITIES.toilet.x, FACILITIES.toilet.z, 'toilet', false);   /* FACILITIES 에도 '평면도 미표시' */
    case 'HALL': /* 왼쪽 복도 = 코어 북쪽(+Z), 오른쪽 = 남쪽(−Z) — 엘리베이터에서 내려 −X 를 보고 섰을 때 (buildSteps 와 같은 기준) */
      if(sd === 'L') return P(fl, 0, (CORE_HALF + L.topOuterZ)/2, 'hall', true, CORR_HALF*2, L.topOuterZ - CORE_HALF);
      if(sd === 'R') return P(fl, 0, (L.bottomOuterZ - CORE_HALF)/2, 'hall', true, CORR_HALF*2, -CORE_HALF - L.bottomOuterZ);
      return null;
    case 'WIN':  /* 좌우 표시가 있으면 그쪽 복도 끝 창, 없으면 라운지 창가
                    (2026-09-21 사진 배치 감사 : 3층 라운지 사진이 창밖 폴더와 78% 닮음) */
      if(sd === 'L') return P(fl, 0, L.topOuterZ, 'window', false);
      if(sd === 'R') return P(fl, 0, L.bottomOuterZ, 'window', false);
      return P(fl, 0, ev.z, 'window', false);
    case 'SIGN': return P(fl, 0, ev.z, 'sign', false);     /* 비상대피 안내판 — 엘리베이터 앞 (평면도 미표시) */
    case 'LNG':  return P(fl, 0, ev.z, 'lounge', false);   /* 라운지·로비 — 엘리베이터에서 내리면 보이는 홀 */
  }
  return null;
}

/* v80 : 길찾기 그래프 — 건물 데이터에서 점(방 문·복도·엘리베이터·계단·출입문)과 선을 만들고
   다익스트라로 가장 빠른 길을 찾는다. 화면 안내(buildSteps)는 그대로 두고, 이 그래프는
   ① 모든 장소에 갈 수 있는지 ② 안내가 맞는지 확인하고 ③ 축척이 정해지면 거리·시간을 낸다.
   비용(어림값) : 걷기 1칸 = 1 · 엘리베이터 = 기다림 15 + 층마다 3 · 계단 = 층마다 12.
   지하 1층은 엘리베이터로만 잇는다 (지하 계단 위치가 평면도에 없다). */
var NAV_M_PER_UNIT = null;   /* 1칸이 몇 m 인가 — 현장에서 재기 전에는 비워 둔다. 거리를 지어내지 않는다 */
var NAVGRAPH = (function(){
  var N = {}, E = {}, codeNode = {}, built = false;
  var WAIT = 15, LIFT = 3, STAIR = 12;
  function node(id, floor, x, z, kind, code){
    if(!N[id]) N[id] = {id:id, floor:floor, x:x, z:z, kind:kind, code:code || null};
    E[id] = E[id] || [];
    return id;
  }
  function link(a, b, w, kind, oneWay){
    E[a].push({to:b, w:w, kind:kind || 'walk'});
    if(!oneWay) E[b].push({to:a, w:w, kind:kind || 'walk'});
  }
  function dist(a, b){ var p = N[a], q = N[b]; return Math.sqrt((p.x-q.x)*(p.x-q.x) + (p.z-q.z)*(p.z-q.z)); }
  function nearestCorridor(floor, x, z){
    var best = null, bd = 1e9;
    Object.keys(N).forEach(function(id){
      var q = N[id]; if(q.floor !== floor || q.kind !== 'corridor') return;
      var d = Math.sqrt((q.x-x)*(q.x-x) + (q.z-z)*(q.z-z)); if(d < bd){ bd = d; best = id; }
    });
    return best;
  }
  function build(){
    if(built) return; built = true;
    for(var lv = 1; lv <= FLOORS; lv++){
      var L = FLOOR_LAYOUT[lv]; if(!L) continue;
      /* 복도 중앙선 위의 점 — 복도 양 끝 · 엘리베이터 앞 · 계단 앞 · 방마다 문 앞 · 화장실 앞 */
      var zs = {};
      var addZ = function(z){ zs[z.toFixed(2)] = z; };
      addZ(L.topOuterZ); addZ(L.bottomOuterZ); addZ(L.evZ); addZ(L.stZ); addZ(FACILITIES.toilet.z);
      L.cells.forEach(function(c){ if(c.code) addZ(c.z); });
      if(lv === 1) ['MAIN', 'BACK', 'EAST', 'WEST'].forEach(function(k){   /* 출입문은 제 자리에서 복도와 만난다 */
        var g = gateXZ(k); if(g) addZ(Math.max(L.bottomOuterZ, Math.min(L.topOuterZ, g.z)));
      });
      var zl = Object.keys(zs).map(function(k){ return zs[k]; }).sort(function(a, b){ return a - b; });
      var corr = function(z){ return 'C' + lv + '@' + z.toFixed(2); };
      zl.forEach(function(z){ node(corr(z), lv, 0, z, 'corridor'); });
      for(var i = 1; i < zl.length; i++) link(corr(zl[i-1]), corr(zl[i]), zl[i] - zl[i-1]);
      /* 엘리베이터 — 탈 때만 기다림 비용 (그래서 한쪽 방향 선 두 개) */
      node('EV' + lv, lv, L.coreX, L.evZ, 'lift', 'EV' + lv);
      link(corr(L.evZ), 'EV' + lv, L.coreX + WAIT, 'walk', true);
      link('EV' + lv, corr(L.evZ), L.coreX, 'walk', true);
      node('ST' + lv, lv, L.coreX, L.stZ, 'stairs', 'ES' + lv);
      link(corr(L.stZ), 'ST' + lv, L.coreX);
      /* 방 — 복도 쪽 벽의 문 */
      L.cells.forEach(function(c){
        if(!c.code) return;
        var id = node('R' + lv + ':' + c.code, lv, (c.x > 0 ? CORR_HALF : -CORR_HALF), c.z, 'room', c.code);
        link(corr(c.z), id, CORR_HALF);
        codeNode[String(c.code).toUpperCase()] = id;
        if(c.parent && !codeNode[String(c.parent).toUpperCase()]) codeNode[String(c.parent).toUpperCase()] = id;
      });
      node('WC' + lv, lv, -CORR_HALF, FACILITIES.toilet.z, 'toilet', 'WC' + lv);
      link(corr(FACILITIES.toilet.z), 'WC' + lv, CORR_HALF);
      var es = EMSTAIR_POS[lv];
      if(es){
        node('EMS' + lv, lv, es.xWhole, es.z, 'emstair', 'EMS' + lv);
        link(corr(L.bottomOuterZ), 'EMS' + lv, dist(corr(L.bottomOuterZ), 'EMS' + lv));
        codeNode['EMS' + lv] = 'EMS' + lv;
      }
      codeNode['EV' + lv] = 'EV' + lv; codeNode['EVIN' + lv] = 'EV' + lv;
      codeNode['ES' + lv] = 'ST' + lv; codeNode['WC' + lv] = 'WC' + lv;
      /* 구역·어림한 곳 — place3D 좌표에서 가장 가까운 복도 점 */
      ['HALL' + lv + 'L', 'HALL' + lv + 'R', 'LNG' + lv, 'SIGN' + lv, 'WIN' + lv, 'WIN' + lv + 'L', 'WIN' + lv + 'R'].forEach(function(code){
        var p = place3D(code); if(p) codeNode[code] = nearestCorridor(lv, 0, p.z);
      });
      if(lv > 1){
        link('EV' + (lv-1), 'EV' + lv, LIFT, 'lift');
        link('ST' + (lv-1), 'ST' + lv, STAIR, 'stairs');
        if(N['EMS' + (lv-1)] && N['EMS' + lv]) link('EMS' + (lv-1), 'EMS' + lv, STAIR, 'stairs');
      }
    }
    ['MAIN', 'BACK', 'EAST', 'WEST'].forEach(function(k){
      var g = gateXZ(k); if(!g) return;
      var id = node('GATE_' + k, 1, g.x, g.z, 'gate', 'GATE_' + k);
      var c = nearestCorridor(1, g.x, g.z); if(c) link(id, c, dist(id, c));
      codeNode['GATE_' + k] = id;
    });
    codeNode.GATE_E = codeNode.GATE_EAST; codeNode.GATE_W = codeNode.GATE_WEST;
    var eb = evXZ('B1');
    node('EVB1', 'B1', eb.x, eb.z, 'lift', 'EVB1');
    node('ZB1', 'B1', B1_ZONE_MID_X, B1_ZONE_MID_Z, 'zone', 'B1');
    link('ZB1', 'EVB1', dist('ZB1', 'EVB1') + WAIT, 'walk', true);
    link('EVB1', 'ZB1', dist('ZB1', 'EVB1'), 'walk', true);
    if(N.EV1) link('EVB1', 'EV1', LIFT, 'lift');
    codeNode.EVB1 = 'EVB1'; codeNode.B1 = 'ZB1';
  }
  /* 가장 빠른 길 — opt.noStairs 면 계단 선을 쓰지 않는다 (휠체어·무거운 짐) */
  function route(fromCode, toCode, opt){
    build(); opt = opt || {};
    var s = codeNode[String(fromCode).toUpperCase()], t = codeNode[String(toCode).toUpperCase()];
    if(!s || !t) return {ok:false, why: !s ? '출발 장소를 그래프에서 모름' : '도착 장소를 그래프에서 모름'};
    var D = {}, prev = {}, done = {}, Q = [s]; D[s] = 0;
    while(Q.length){
      var bi = 0; for(var i = 1; i < Q.length; i++) if(D[Q[i]] < D[Q[bi]]) bi = i;
      var u = Q.splice(bi, 1)[0];
      if(done[u]) continue; done[u] = 1;
      if(u === t) break;
      E[u].forEach(function(e){
        if(opt.noStairs && e.kind === 'stairs') return;
        var nd = D[u] + e.w;
        if(D[e.to] === undefined || nd < D[e.to]){ D[e.to] = nd; prev[e.to] = {from:u, kind:e.kind}; Q.push(e.to); }
      });
    }
    if(D[t] === undefined) return {ok:false, why:'이어지는 길이 없음'};
    var path = [t], walk = 0, lift = 0, stairs = 0, x = t;
    while(x !== s){
      var p = prev[x];
      if(p.kind === 'walk') walk += dist(p.from, x);
      else if(p.kind === 'lift') lift++;
      else if(p.kind === 'stairs') stairs++;
      x = p.from; path.unshift(x);
    }
    return {ok:true, cost:D[t], walk:walk, liftFloors:lift, stairFloors:stairs, path:path,
            points: path.map(function(id){ var q = N[id]; return {floor:q.floor, x:q.x, z:q.z, kind:q.kind}; }),
            meters: NAV_M_PER_UNIT ? walk * NAV_M_PER_UNIT : null};
  }
  return {
    route: route,
    has: function(code){ build(); return !!codeNode[String(code).toUpperCase()]; },
    stats: function(){ build(); var e = 0; Object.keys(E).forEach(function(k){ e += E[k].length; });
                       return {nodes:Object.keys(N).length, edges:e, places:Object.keys(codeNode).length}; },
    nodes: function(){ build(); return N; }
  };
})();

/* v83 : 관리자 건의함 — AI 후보를 층 평면도 위 점으로.
   cands 는 순위대로 [{code, sim}], labelFn 은 코드 → 한글 이름.
   위쪽 = 엘리베이터에서 내려 바라보는 방향(−X), 왼쪽 = 왼쪽 복도(+Z). */
function aiMapEsc(t){ return String(t).replace(/[&<>"]/g, function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]; }); }
function aiMiniMapHtml(cands, labelFn){
  if(!cands || !cands.length || typeof place3D !== 'function') return '';
  labelFn = labelFn || function(c){ return c; };
  var byFloor = {}, orderF = [], outside = [], tot = 0;
  cands.forEach(function(c, i){
    tot += c.sim || 0;
    var p = place3D(c.code);
    if(!p){ outside.push({c:c, rank:i + 1}); return; }
    var fk = String(p.floor);
    if(!byFloor[fk]){ byFloor[fk] = {floor:p.floor, items:[], sum:0}; orderF.push(fk); }
    byFloor[fk].items.push({c:c, p:p, rank:i + 1}); byFloor[fk].sum += c.sim || 0;
  });
  if(!orderF.length) return '';
  orderF.sort(function(a, b){ return byFloor[b].sum - byFloor[a].sum; });
  var h = '<div class="aiMap">';
  orderF.slice(0, 3).forEach(function(fk){ h += aiMiniMapFloor(byFloor[fk], tot, labelFn); });
  var notes = [];
  orderF.slice(3).forEach(function(fk){
    var F = byFloor[fk];
    notes.push((F.floor === 'B1' ? '지하 1층' : F.floor + '층') + ' : ' +
      F.items.map(function(it){ return it.rank + ' ' + labelFn(it.c.code); }).join(', '));
  });
  outside.forEach(function(o){ notes.push(o.rank + ' ' + labelFn(o.c.code) + ' (평면도에 없는 곳)'); });
  if(notes.length) h += '<div class="aiMapNote">그 밖의 후보 — ' + aiMapEsc(notes.join(' · ')) + '</div>';
  h += '<div class="aiMapNote">번호 = 위 후보 버튼의 순위 · 채운 점 = 1등 · 점선 = 평면도에 표시가 없어 어림한 자리'
     + '<br>지도 위쪽이 엘리베이터에서 내려 바라보는 쪽입니다</div>';
  return h + '</div>';
}
function aiMiniMapFloor(F, tot, labelFn){
  var isB1 = (F.floor === 'B1'), L = FLOOR_LAYOUT[isB1 ? 1 : F.floor];
  if(!L) return '';
  var TOP = GLOBAL_TOP_Z, BOT = GLOBAL_BOT_Z, HX = GLOBAL_HALF_X, PAD = 1.8;   /* 점(반지름 1.55)이 가장자리에서 잘리지 않게 */
  var W = (TOP - BOT) + PAD * 2, H = HX * 2 + PAD * 2;
  function X(z){ return (TOP - z + PAD).toFixed(2); }
  function Y(x){ return (x + HX + PAD).toFixed(2); }
  function R(x, z, w, d, cls){   /* 세계 좌표의 상자(가운데 x,z · X 폭 w · Z 길이 d) */
    return '<rect class="' + cls + '" x="' + X(z + d / 2) + '" y="' + Y(x - w / 2) + '" width="' + Math.abs(d).toFixed(2) + '" height="' + Math.abs(w).toFixed(2) + '"/>';
  }
  function T(x, z, txt, anchor){ return '<text class="t" x="' + X(z) + '" y="' + Y(x) + '" text-anchor="' + (anchor || 'middle') + '" dominant-baseline="central">' + txt + '</text>'; }
  var name = isB1 ? '지하 1층' : F.floor + '층';
  var share = tot ? Math.round(F.sum / tot * 100) : 0;
  var h = '<div class="fl"><b>' + name + '</b> · 후보 ' + F.items.length + '개 · 유사도 몫 ' + share + '%</div>';
  var s = '<svg viewBox="0 0 ' + W.toFixed(2) + ' ' + H.toFixed(2) + '" role="img" aria-label="' + aiMapEsc(name + ' 평면도의 AI 후보 위치') + '">';
  if(!isB1){
    s += R(0, (L.topOuterZ + L.bottomOuterZ) / 2, L.halfX * 2, L.topOuterZ - L.bottomOuterZ, 'o');   /* 지하는 평면도가 없다 — 1층 윤곽을 겹치지 않는다 */
    s += R(0, (L.topOuterZ + L.bottomOuterZ) / 2, CORR_HALF * 2, L.topOuterZ - L.bottomOuterZ, 'c');
    L.cells.forEach(function(c){ if(c.code) s += R(c.x, c.z, c.w - 0.3, c.d - 0.3, 'r'); });
    s += R(L.coreX, L.evZ, ROOM_W - 0.3, UNIT_Z, 'k') + T(L.coreX, L.evZ, 'EV');
    s += R(L.coreX, L.stZ, ROOM_W - 0.3, UNIT_Z, 'k') + T(L.coreX, L.stZ, '계단');
    var es = EMSTAIR_POS[F.floor];
    if(es) s += R(es.xWhole, es.z, es.w, es.d, 'k') + T(es.xWhole - 1, es.z, '비상') + T(es.xWhole + 1, es.z, '계단');   /* 칸이 좁아 두 줄 */
    s += T(-HX + 1.4, TOP - 0.6, '← 왼쪽 복도', 'start') + T(-HX + 1.4, L.bottomOuterZ + 0.6, '오른쪽 복도 →', 'end');
  } else {
    s += R(B1_ZONE_MID_X, B1_ZONE_MID_Z, B1_ZONE_WIDTH_X, B1_ZONE_TOP_Z - B1_ZONE_BOT_Z, 'r')
       + T(B1_ZONE_MID_X - B1_ZONE_WIDTH_X / 2 + 1.4, B1_ZONE_TOP_Z - 0.6, '크리에이티브 존', 'start');   /* 가운데는 점 자리 */
    var eb = evXZ('B1'); s += R(eb.x, eb.z, 4, UNIT_Z, 'k') + T(eb.x, eb.z, 'EV');
  }
  /* 같은 자리에 겹치는 후보(엘리베이터 앞 · 라운지 · 안내판 등)는 복도 방향으로 조금씩 비켜 놓는다 */
  var used = {}, dots = F.items.map(function(it){
    var key = it.p.x.toFixed(1) + ',' + it.p.z.toFixed(1), k = used[key] || 0; used[key] = k + 1;
    return {it:it, x:it.p.x, z:it.p.z + (k ? (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 3.4 : 0)};
  });
  dots.forEach(function(d){   /* 구역(복도 한쪽 전체 · 지하 존)은 먼저 옅게 */
    var p = d.it.p; if(p.w && p.d) s += R(p.x, p.z, p.w, p.d, 'z');
  });
  dots.slice().reverse().forEach(function(d){   /* 1등이 맨 위에 오도록 뒤 순위부터 */
    var it = d.it, first = (it.rank === 1);
    var tip = it.rank + '등 ' + labelFn(it.c.code) + ' ' + Math.round((it.c.sim || 0) * 100) + '%' + (it.p.exact ? '' : ' (어림한 자리)');
    s += '<g><title>' + aiMapEsc(tip) + '</title>'
       + '<circle class="' + (first ? 'd1' : 'd') + (it.p.exact ? '' : ' ap') + '" cx="' + X(d.z) + '" cy="' + Y(d.x) + '" r="1.55"/>'
       + '<text class="n' + (first ? ' n1' : '') + '" x="' + X(d.z) + '" y="' + Y(d.x) + '">' + it.rank + '</text></g>';
  });
  return h + s + '</svg>';
}
/* v143 : 1층에서 '어느 문 안쪽에 서서 시작하는가' — 경로 미리보기(fpStart)와
   직접 걸어보기(fpStartFree)가 반드시 같은 자리를 써야 두 모드가 어긋나지 않으므로
   좌표를 여기 한 곳에만 적어 두고 양쪽에서 함께 불러 쓴다.
   yaw 규약 : fx=sin(yaw), fz=cos(yaw) → 0=+Z, π=-Z, π/2=+X, -π/2=-X          */
function fpGateStart1F(){
  var ST = BUILDING_Z_STRETCH;
  var z0 = GLOBAL_BOT_Z*ST, z1 = GLOBAL_TOP_Z*ST;   // 복도 양 끝(=동문·서문 자리)
  switch(currentGateKey()){
    /* 동문·서문은 복도 양 끝에 실제 유리문이 서 있다. 문턱에 바짝 붙이면 유리 너머
       어두운 배경이 화면을 덮으므로 2.6m 안쪽에서 복도를 바라보고 선다. */
    case 'EAST': return {x:0, z:z0+2.6, yaw:0,          ko:'동문'};
    case 'WEST': return {x:0, z:z1-2.6, yaw:Math.PI,    ko:'서문'};
    /* v144: 후문도 '문 앞'에서 출발한다. 1층 중앙계단실은 실제로 후문
       로비이고, 그 끝벽(x0+WD)에 유리 출입문이 서 있다(fpMake1FStairHall의 bx).
       1층 계단실은 지하와 짝이라 깊이가 FP_ST_WD_B1F인 점에 주의 — FP_ST_WD로
       계산하면 문보다 2m 앞(계단 위)에 서게 된다. */
    case 'BACK': return {x: FP_WALL_X + FP_ST_WD_B1F - 1.30,
                         z:(FLOOR_LAYOUT[1]?FLOOR_LAYOUT[1].stZ:0)*ST,
                         yaw:-Math.PI/2, ko:'후문'};   // -X(계단홀·복도) 쪽을 바라봄
    /* 정문(기본) — 문을 안 골랐을 때도 여기로 온다(예전과 동일) */
    default:     return {x:FP_GATE_X+1.15, z:0, yaw:Math.PI/2, ko:'정문'};
  }
}
/* '출발 지점' 좌표 : 1층 + 출입문이 확정된 경우에만 그 문 좌표, 그 외에는 기존처럼 엘리베이터 앞. */
function startXZ(f){
  if(f===1 || f==='1'){
    var gp = gateXZ(currentGateKey());
    if(gp) return gp;
  }
  return evXZ(f);
}
function personXZ(f){ return startXZ(f); }
function placePerson(f, immediate){
  if(!personG) return;
  var p = personXZ(f);
  personG.position.set(p.x, personY(f), p.z);
  if(immediate){ personAnim.playing = false; }
}
/* v132 : 첫 화면의 「시작하기」 — QR을 안 쓰고 그냥 시작하는 길.
   QRNAV는 스캔 결과를 3시간 동안 기억하므로(localStorage), 이걸 지우지 않으면
   예전에 고른 문이 남아서 '서문 출발' 배지와 문 앞 사람 마커가 계속 따라온다.
   그냥 시작할 때는 문을 지워서 예전처럼 '1층 엘리베이터 출발'이 되게 한다. */
function plainStart(){
  if(typeof QRNAV!=='undefined' && QRNAV.clear) QRNAV.clear();
  startFloor = 1;                                           // 출발층도 기본값(1층)으로
  if(typeof buildStartFloorPicker==='function') buildStartFloorPicker();
  go(2);
}
/* 목적지나 현재 위치 층이 바뀌었을 때 : 사람을 '현재 위치 층 엘리베이터 앞'에 다시 세워두기만 한다.
   실제 걸어가는 모습은 사용자가 「이동 경로 보기」를 눌렀을 때만 재생된다. */
function startPersonTrip(){
  if(!personG) return;
  fpStop(true);            // 재생 중이었다면 1인칭 시점을 먼저 정리하고
  var to = (target && target.floor!==undefined) ? target.floor : startFloor;
  personAnim.from = startFloor;
  personAnim.to   = to;
  personAnim.t    = 0;
  personAnim.playing = false;
  personAnim.done    = false;
  spinResume();
  resetChaseCam();
  autoRadius = 0;          // 새 목적지를 열 때는 확대 배율도 기본값으로
  placePerson(startFloor, true);
  syncTripBtn();
}
/* 「경로 미리보기」 일시정지/계속 */
var fpPaused=false;
function togglePause(){
  if(!fpActive) return;
  fpPaused = !fpPaused;
  syncTripBtn();
}
/* 「이동 경로 보기」 버튼 : 서 있음 ↔ 1인칭 재생 */
function toggleTrip(){
  if(!personG || !routeCurve) return;
  if(fpActive) fpStop();      // 재생 중이면 멈추고 원래 보던 각도로 되돌아간다
  else         fpStart();     // 내가 직접 걸어 들어가는 시점으로 처음부터 재생
}
/* 버튼 글씨·상태 줄 갱신 */
function syncTripBtn(){
  var b = document.getElementById('tripBtn'), st = document.getElementById('tripSt');
  var bFS = document.getElementById('tripBtnFS');
  if(!b) return;
  if(!routeCurve){
    b.style.display='none'; if(st) st.textContent='';
    if(bFS) bFS.style.display='none';
    return;
  }
  b.style.display = '';
  if(bFS) bFS.style.display = '';
  var label, cls;
  if(personAnim.playing){      label = (LANG==='ko') ? '■ 미리보기 종료' : '■ Stop Preview';  cls = 'trip on'; }
  else if(personAnim.done){    label = (LANG==='ko') ? '↻ 다시 보기' : '↻ Replay';     cls = 'trip'; }
  else {                       label = (LANG==='ko') ? '▶ 경로 미리보기' : '▶ Route Preview'; cls = 'trip'; }
  b.textContent = label; b.className = cls;
  if(bFS){ bFS.textContent = label; bFS.className = cls; }
  /* 「직접 걸어보기」 버튼 — 미리보기 재생 중에는 숨겨서 두 모드가 섞이지 않게 한다 */
  var fb=document.getElementById('freeBtn'), fbFS=document.getElementById('freeBtnFS');
  var fLabel = fpFree ? ((LANG==='ko')?'■ 걷기 종료':'■ Stop Walking')
                      : ((LANG==='ko')?'🚶 직접 걸어보기':'🚶 Walk It Yourself');
  var fCls   = fpFree ? 'trip on' : 'trip ghost2';
  var fShow  = !(fpActive && !fpFree);
  [fb, fbFS].forEach(function(x){
    if(!x) return;
    x.textContent=fLabel; x.className=fCls;
    x.style.display = fShow ? '' : 'none';
  });
  /* 「일시정지」 버튼 — 예전엔 자동재생(경로 미리보기) 중에만 보였는데,
     직접 걸어보기 중에도(특히 계단 오르내리는 연출 도중) 멈춰서 사진을 찍을 수
     있어야 한다는 요청이 있어 자유 탐색 중에도 보이게 한다. */
  var pb=document.getElementById('pauseBtn'), pbFS=document.getElementById('pauseBtnFS');
  var pShow = fpActive;
  var pLabel = fpPaused ? ((LANG==='ko')?'▶ 계속':'▶ Resume')
                        : ((LANG==='ko')?'⏸ 정지':'⏸ Stop');
  [pb, pbFS].forEach(function(x){
    if(!x) return;
    x.textContent=pLabel; x.className = fpPaused ? 'trip on' : 'trip ghost2';
    x.style.display = pShow ? '' : 'none';
  });
  /* 세밀 이동 패드는 없앴다(불편하다는 요청) — 정지 중에는 화면을 드래그해서
     자유롭게 둘러보는 것만으로 충분하다(아래 fpLook은 fpPaused와 무관하게 항상 동작). */
  if(fpFree){
    b.style.display='none'; if(bFS) bFS.style.display='none';
  }
  if(st){
    if(!target){ st.textContent=''; }
    else if(personAnim.playing){
      st.textContent = fpPaused ? ((LANG==='ko') ? '일시정지 중' : 'Paused')
                                : (fpLabel || ((LANG==='ko') ? '이동 중' : 'Moving'));
    }
    else if(personAnim.done){    st.textContent = (LANG==='ko') ? '도착' : 'Arrived'; }
    else if(target.floor===startFloor){ st.textContent = lvName(startFloor)+((LANG==='ko') ? ' 안에서' : ''); }
    else {
      // 파랑=출발 고리, 빨강=목적지 방. 3D 색과 글자 색을 맞춰 범례 없이도 읽히게 한다.
      st.innerHTML = '<b style="color:#8FD8FF">'+lvName(startFloor)+'</b>'
                   + ' <span style="color:#7C8896">→</span> '
                   + '<b style="color:#E0553F">'+lvName(target.floor)+'</b>';
    }
  }
}
/* 매 프레임 호출 : 올라가는 중이면 높이를 보간, 도착하면 잠시 멈췄다가 반복 */
var _personLast = 0;
/* 사람이 빨간 동선(routeCurve)을 그대로 따라 걷는다.
   동선은 [현재위치 층 엘리베이터] → [목적지 층] → [복도] → [목적지 방] 순서라
   따라가기만 하면 엘리베이터 탑승 + 복도 이동이 자연스럽게 재현된다. */
function updatePerson(){
  var now = (typeof performance!=='undefined' ? performance.now() : Date.now());
  var dt = _personLast ? Math.max(0, Math.min((now-_personLast)/1000, 0.1)) : 0;
  _personLast = now;
  if(!personG) return;
  // 1인칭(로드뷰) 재생 중에는 사람 마커를 감춰 두므로 예전 3인칭 이동 연출을 돌리지 않는다.
  if(fpActive) return;

  // 머리 위 마커를 살짝 위아래로 + 빛무리를 천천히 커졌다 작아지게 (서 있을 때도 계속)
  var pin = personG.getObjectByName('pin');
  if(pin) pin.position.y = 3.0 + Math.sin(now/380)*0.16;
  var glow = personG.getObjectByName('glow');
  if(glow){ var gs = 2.5 + Math.sin(now/620)*0.25; glow.scale.set(gs,gs,1); }

  if(!personAnim.playing || !routeCurve){
    // 재생 중이 아니면 제자리에 서 있는다(버튼을 누르기 전 기본 상태)
    inRideView = false;
    return;
  }
  personAnim.t += dt;             // 이제 실제 '초' 단위. 구간별 길이는 위 TRIP에서 정한다.
  var t  = personAnim.t;
  var uE = routeSplit;                             // 엘리베이터 구간이 끝나는 지점
  var hasRide = uE > 0.001;                        // 같은 층이면 엘베 구간이 없다
  var tA = TRIP.wait;                              // 출발 전 대기 끝
  var tB = tA + (hasRide ? TRIP.ride : 0);         // 엘리베이터로 목적지 층 도착
  var tC = tB + (hasRide ? TRIP.stop : 0);         // 내려서 잠깐 멈춤("여기서 내리는구나")
  var tD = tC + TRIP.walk;                         // 복도 이동 끝(목적지 도착)
  inRideView = t>=tA && t<tD;                      // 대기 후 도착 전까지(엘리베이터+복도 이동) : 3인칭 추적 카메라로 전환
  var u;                          // 곡선 위 진행도 0~1
  if(t < tA)      u = 0;                                          // 엘베 앞에 서서 대기
  else if(t < tB) u = uE * easeIO((t-tA)/TRIP.ride);               // 엘리베이터로 층 이동
  else if(t < tC) u = uE;                                          // 내리는 순간 정지
  else if(t < tD) u = uE + (1-uE)*easeIO((t-tC)/TRIP.walk);        // 복도를 따라 목적지까지
  else{
    u = 1;
    if(t > tD + TRIP.hold){       // 도착 후 잠깐 머물렀다가 종료(반복하지 않음)
      personAnim.playing = false;
      personAnim.done    = true;
      spinResume();
      syncTripBtn();
    }
  }

  var p = routeCurve.getPointAt(Math.max(0,Math.min(1,u)));
  // 동선은 바닥에서 0.8 띄워 그려져 있으므로, 사람 발이 바닥에 닿도록 내려줌
  personG.position.set(p.x, p.y - 0.8, p.z);

  // 진행 방향을 바라보게 회전(제자리에서 뒤뚱거리지 않도록 살짝 앞을 봄)
  // 동선이 코너(예: 엘리베이터→복도, 복도→방 문)에서 방향이 꺾이는 지점에서는
  // 예전엔 매 프레임 각도를 그대로 대입해서 3인칭 추적 카메라가 그 순간 홱 돌아가 보였다.
  // → 목표 각도로 즉시 스냅하지 않고, 초당 최대 회전 속도만큼만 부드럽게 따라가게 한다.
  if(u > 0 && u < 1){
    var look = routeCurve.getPointAt(Math.min(1, u+0.01));
    var dx = look.x - p.x, dz = (look.z - p.z);
    if(Math.abs(dx)+Math.abs(dz) > 0.0001){
      var targetRy = Math.atan2(dx, dz);
      var curRy = personG.rotation.y;
      var diff = Math.atan2(Math.sin(targetRy-curRy), Math.cos(targetRy-curRy)); // -PI~PI로 정규화
      var maxStep = 3.2 * dt;  // 초당 최대 회전 속도(라디안) — 90도 코너를 약 0.5초에 걸쳐 돌게
      if(Math.abs(diff) <= maxStep || !dt) personG.rotation.y = targetRy;
      else personG.rotation.y = curRy + (diff>0?1:-1)*maxStep;
    }
  }
}
