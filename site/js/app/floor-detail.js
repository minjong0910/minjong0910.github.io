"use strict";
/* floor-detail.js — 층 상세 3D(5번 화면) · 층 다시 짓기 · 테두리 선 합치기 · 성능 표시
   (예전 한 파일 main.js 의 14867~15168줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
/* ========== 층 상세 3D (5번) ========== */
var rB,sB,cB,groupB=null;
var thetaB=-Math.PI/2, phiB=0.10, radiusB=60, dragB=false, bx=0, by=0;
var camTargetB=new THREE.Vector3(0,0,0), pinchB=null;

function initB(){
  var cv=document.getElementById('cfd');
  /* 요청 반영(성능 개선): 이 렌더러는 메인 3D(옥탑/걷기)와 달리 모바일
     여부를 전혀 확인하지 않고 항상 antialias:true, 픽셀비 2까지 써서
     휴대폰에서 불필요하게 무거웠다 — 메인 렌더러와 같은 기준으로 맞춘다. */
  var __isMobB = ('ontouchstart' in window) || navigator.maxTouchPoints>0 || /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);
  rB=new THREE.WebGLRenderer({canvas:cv,antialias:!__isMobB,powerPreference:'high-performance'});
  rB.setPixelRatio(Math.min(devicePixelRatio, __isMobB?1.75:2));
  sB=new THREE.Scene(); sB.background=new THREE.Color(0x0E1217);
  cB=new THREE.PerspectiveCamera(65,1,0.3,150);
  sB.add(new THREE.AmbientLight(0xffffff,0.8));
  var d=new THREE.DirectionalLight(0xffffff,0.7); d.position.set(30,70,40); sB.add(d);
  /* 예전엔 여기서 앱 시작과 동시에 이 루프를 켰다 — 그러면 층 상세(5번) 화면을
     한 번도 안 열어도 앱을 켜는 순간부터 계속 렌더링돼서 늘 손해였다.
     이제는 go('s5')가 실제로 그 화면에 들어갈 때만 켠다(아래 animateBRunning). */
  cv.addEventListener('mousedown',function(e){dragB=true;bx=e.clientX;by=e.clientY;});
  window.addEventListener('mouseup',function(){dragB=false;});
  window.addEventListener('mousemove',function(e){
    if(!dragB) return;
    var dx=e.clientX-bx, dy=e.clientY-by;
    bx=e.clientX; by=e.clientY;
    panB(dx,dy);   // 층 상세는 항상 탑뷰 이동만(회전 없음) — 드래그 중 각도가 바뀌어 방향이 헷갈리는 것을 방지
  });
  cv.addEventListener('wheel',function(e){e.preventDefault();
    zoomByFactor(e.deltaY>0?1.1:0.9);},{passive:false});
  cv.addEventListener('touchstart',function(e){
    if(e.touches.length===1){ bx=e.touches[0].clientX; by=e.touches[0].clientY; dragB=true; pinchB=null; }
    else if(e.touches.length===2){ dragB=false; pinchB=tDist(e); }
  },{passive:true});
  cv.addEventListener('touchmove',function(e){
    if(e.touches.length===2){
      var d2=tDist(e);
      if(pinchB) zoomByFactor(pinchB/d2);
      pinchB=d2; return;
    }
    if(!dragB||e.touches.length!==1) return;
    var dx=e.touches[0].clientX-bx, dy=e.touches[0].clientY-by;
    bx=e.touches[0].clientX; by=e.touches[0].clientY;
    panB(dx,dy);   // 층 상세는 항상 탑뷰 이동만(회전 없음)
  },{passive:true});
  cv.addEventListener('touchend',function(){dragB=false;pinchB=null;});
}
function tDist(e){var a=e.touches[0],b=e.touches[1];return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);}

/* 탑뷰 이동 : 화면 세로 = 건물 긴 축(Z=복도방향), 화면 가로 = 건물 폭(X) */
function panB(dx,dy){
  var cv=document.getElementById('cfd');
  var h=cv.clientHeight||500;
  var k=(2*radiusB*Math.tan(cB.fov*Math.PI/360))/h;   // px → world 단위
  // 화면을 "손가락으로 잡고 미는" 방향과 화면에 보이는 내용이 같은 방향으로 따라오도록
  // (드래그 방향 = 콘텐츠가 움직이는 방향) 부호를 맞춤. 실측(스크린샷 픽셀 비교)으로 확인한 부호.
  camTargetB.z += dy*k;
  camTargetB.x += dx*k;
  clampB();
}
var clampHalfX=GLOBAL_HALF_X, clampTopZ=GLOBAL_TOP_Z, clampBotZ=GLOBAL_BOT_Z;
/* 이름 충돌 버그 수정: 예전에는 이 함수 이름이 바로 아래 상태변수(zoomB)와 같아서
   'var zoomB = 1;' 선언이 이 함수 자체를 숫자로 덮어써버렸다 — 그 결과 휠/두 손가락 확대가
   호출될 때마다 "zoomB is not a function" 에러가 나며 조용히 실패했다.
   함수 이름을 zoomByFactor로 분리해 상태변수 zoomB와 더 이상 겹치지 않게 한다. */
function zoomByFactor(f){
  radiusB=Math.max(14,Math.min(260,radiusB*f));
  zoomB = radiusB / fitRadius(cB, clampHalfX+0.8, (clampTopZ-clampBotZ)/2+1.3);
  clampB();
}
function clampB(){
  camTargetB.x=Math.max(-clampHalfX,Math.min(clampHalfX,camTargetB.x));
  camTargetB.z=Math.max(clampBotZ-3,Math.min(clampTopZ+3,camTargetB.z));
}
/* 1이면 층 전체가 화면에 딱 맞고, 작을수록 당겨서(확대해서) 본다. */
var zoomB = 1;
function resizeB(){
  var cv=document.getElementById('cfd');
  var w=cv.clientWidth||330, h=cv.clientHeight||330;
  rB.setSize(w,h,false); cB.aspect=w/h; cB.updateProjectionMatrix();
  radiusB = fitRadius(cB, clampHalfX+0.8, (clampTopZ-clampBotZ)/2+1.3) * zoomB;
}
/* 층 상세(5번) 화면을 벗어나 있는 동안에는 이 루프 자체를 멈춘다.
   예전엔 이 화면을 한 번이라도 열면 requestAnimationFrame이 다른 화면으로
   넘어가도 계속 재귀 호출되며 안티앨리어싱까지 켠 두 번째 렌더러를 매 프레임
   그리고 있었다 — 이후 앱 전체가 은근히 무거워지던 원인 중 하나였다. */
var animateBRunning=false;
function animateB(){
  if(!animateBRunning) return;
  requestAnimationFrame(animateB);
  if(!rB) return;
  var x=camTargetB.x + radiusB*Math.sin(phiB)*Math.cos(thetaB);
  var y=camTargetB.y + radiusB*Math.cos(phiB);
  var z=camTargetB.z + radiusB*Math.sin(phiB)*Math.sin(thetaB);
  if(phiB<0.28) cB.up.set(0,0,1); else cB.up.set(0,1,0);
  cB.position.set(x,y,z); cB.lookAt(camTargetB);
  rB.render(sB,cB);
}
function labelSprite(text,color){
  var px=44, cv=document.createElement('canvas'), ctx=cv.getContext('2d');
  ctx.font='bold '+px+'px Pretendard,"맑은 고딕",sans-serif';
  cv.width=ctx.measureText(text).width+16; cv.height=px+16;
  ctx=cv.getContext('2d'); ctx.font='bold '+px+'px Pretendard,"맑은 고딕",sans-serif';
  ctx.fillStyle=color; ctx.textBaseline='top'; ctx.fillText(text,8,8);
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));
  sp.scale.set(cv.width*0.014, cv.height*0.014, 1);
  return sp;
}

/* 선택한 층만 떼어내서 상세 표시 + 빨간 화살표 동선 */
/* 언어 전환 시 3D 라벨(화장실·중앙계단·크리에이티브 존 등)을 새 언어로 다시 그리기 위해
   건물 전체 홀로그램의 각 층 그룹을 비우고 다시 채운다. */
function rebuildAllFloors(){
  if(!floorGroups || !floorGroups.length) return;
  for(var i=0;i<LEVELS.length;i++){
    var g = floorGroups[i];
    if(!g) continue;
    while(g.children.length) g.remove(g.children[0]);
    addLevelContents(g, LEVELS[i], false);
    if(edgeMergeOn()) mergeFloorEdges(g);         // v82
  }
  if(typeof highlight3D==='function') highlight3D();
}

/* v82 : 층 그룹 안의 테두리 선을 색·투명도가 같은 것끼리 하나로 합친다 (?merge=1 일 때만).
   선마다 층 그룹 기준 좌표로 옮겨 붙이므로 위치는 그대로다. 층을 벌리는 layout() 은
   그룹째 움직이므로 합친 선도 같이 움직인다. highlight3D 는 이름표 없는 선에
   층 단위로 같은 투명도를 주므로(가는 층·지금 층 1, 나머지 0.07) 합쳐도 규칙이 같다. */
function edgeMergeOn(){ return /[?&]merge=1(&|$)/.test(location.search || ''); }   /* 함수로 둔다 — 처음 짓는 코드가 이 줄보다 먼저 돌 수 있다 */
function mergeFloorEdges(g){
  if(!g) return 0;
  g.updateMatrixWorld(true);
  var buckets = {}, order = [];
  g.traverse(function(o){
    if(o.type !== 'LineSegments') return;
    if(o.userData && Object.keys(o.userData).length) return;      // 비상계단·출입문 선은 따로 다룬다
    var m = o.material, geo = o.geometry;
    if(!m || Array.isArray(m) || m.type !== 'LineBasicMaterial' || m.map) return;
    if(!geo || geo.index || !geo.attributes.position || geo.attributes.position.itemSize !== 3) return;
    if(Object.keys(geo.attributes).length !== 1) return;
    var M = o.matrix.clone(), p = o.parent, ok = o.visible;
    while(ok && p && p !== g){                                    // 문 부품 아래·숨긴 것 아래는 건너뛴다
      var ud = p.userData || {};
      if(!p.visible || ud.door || ud.gatePart || ud.b1door) ok = false;
      M.premultiply(p.matrix); p = p.parent;
    }
    if(!ok || p !== g) return;
    var key = [m.color.getHex(), m.opacity, m.transparent, m.depthWrite, m.depthTest, m.blending,
               m.linewidth, o.renderOrder, m.side, m.fog, m.toneMapped, m.vertexColors].join('|');
    if(!buckets[key]){ buckets[key] = {mat:m, ro:o.renderOrder, parts:[], n:0}; order.push(key); }
    buckets[key].parts.push({o:o, geo:geo, M:M}); buckets[key].n += geo.attributes.position.count;
  });
  var removed = 0, v = new THREE.Vector3();
  order.forEach(function(key){
    var b = buckets[key]; if(b.parts.length < 2) return;
    var arr = new Float32Array(b.n * 3), off = 0;
    b.parts.forEach(function(pt){
      var pos = pt.geo.attributes.position;
      for(var i = 0; i < pos.count; i++){
        v.fromBufferAttribute(pos, i).applyMatrix4(pt.M);
        arr[off++] = v.x; arr[off++] = v.y; arr[off++] = v.z;
      }
    });
    var ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    ng.computeBoundingSphere();
    var nl = new THREE.LineSegments(ng, b.mat.clone());
    nl.renderOrder = b.ro; nl.name = 'mergedEdges';
    g.add(nl);
    b.parts.forEach(function(pt){ pt.o.parent.remove(pt.o); pt.geo.dispose(); pt.o.material.dispose(); removed++; });
  });
  return removed;
}

/* v82 : ?perf=1 — 목적지 3D 를 그리는 동안 왼쪽 위에 성능을 1초마다 표시한다.
   fps = 실제로 그린 장면 수(폰은 30 이 상한), calls = 드로우콜, ms = renderer.render 한 번에 든 시간.
   폰에서 재는 방법은 3D_성능_재는법.txt. */
var PERF_ON = /[?&]perf=1(&|$)/.test(location.search || '');
var PERF = {n:0, ms:0, t0:0, el:null};
function perfRender(){
  var t = performance.now();
  renderer.render(scene, camera);
  var now = performance.now();
  PERF.n++; PERF.ms += now - t;
  if(!PERF.t0) PERF.t0 = now;
  if(now - PERF.t0 >= 1000){
    if(!PERF.el){
      PERF.el = document.createElement('div');
      PERF.el.style.cssText = 'position:fixed;left:6px;top:6px;z-index:99999;padding:4px 8px;border-radius:6px;' +
        'background:rgba(0,0,0,.72);color:#9FF;font:12px/1.4 monospace;pointer-events:none;white-space:pre';
      document.body.appendChild(PERF.el);
    }
    var fps = PERF.n * 1000 / (now - PERF.t0);
    PERF.el.textContent = 'fps ' + fps.toFixed(1) + '  calls ' + renderer.info.render.calls +
      '\nms ' + (PERF.ms / PERF.n).toFixed(1) + '  ' + renderer.domElement.width + 'x' + renderer.domElement.height +
      ' @' + renderer.getPixelRatio().toFixed(2) + '\n' + (edgeMergeOn() ? 'merge ON' : 'merge off') + (A3D_MOBILE ? ' · mobile' : '');
    PERF.n = 0; PERF.ms = 0; PERF.t0 = now;
  }
}
function showFloorDetail(lv){
  document.getElementById('t5').textContent = (LANG==='ko')
    ? (lv==='B1' ? '지하 1층 · 크리에이티브 존'
                 : (lv==='R' ? '옥상 상세' : lv+'층 상세'))
    : (lv==='B1' ? 'B1 · Creative Zone'
                 : (lv==='R' ? 'Rooftop Detail' : 'Floor '+lv+' Detail'));
  var legEs = document.getElementById('legEmstair');
  if(legEs) legEs.style.display = (lv==='B1') ? 'none' : '';
  if(legEs && lv==='R') legEs.style.display='';
  // 출입문(정문·후문·동문·서문)은 1층에만 있으므로, 2~5층 상세에서는 범례에서 빼서
  // 실제로 그 층엔 없는 항목이 헷갈리지 않게 한다.
  var legDoor = document.getElementById('legDoor');
  if(legDoor) legDoor.style.display = (lv===1) ? '' : 'none';
  // 나가는 문(노랑)은 지하 1층에만, 휴지통(파랑)은 옥상을 뺀 모든 층에 표시
  var legBx = document.getElementById('legB1exit');
  if(legBx) legBx.style.display = (lv==='B1') ? '' : 'none';
  var legBn = document.getElementById('legBin');
  if(legBn) legBn.style.display = (lv==='R') ? 'none' : '';
  if(groupB){ sB.remove(groupB); }
  groupB=new THREE.Group();
  addLevelContents(groupB, lv, true);
  groupB.position.y = -SLAB;

  if(lv==='R'){
    /* 옥상은 방 배치도가 없고 건물 외곽 그대로다 */
    clampHalfX=GLOBAL_HALF_X; clampTopZ=GLOBAL_TOP_Z; clampBotZ=GLOBAL_BOT_Z;
  }else if(lv!=='B1'){
    var L=FLOOR_LAYOUT[lv];
    clampHalfX=L.halfX; clampTopZ=L.topOuterZ; clampBotZ=L.bottomOuterZ;
    // 비상계단이 기존 층 외곽(bottomOuterZ)보다 더 바깥쪽(-Z)에 있으므로, 층 상세보기에서도
    // 드래그해서 볼 수 있도록 팬 범위·초기 프레이밍을 비상계단까지 넓혀준다.
    // tightBotZ는 addLevelContents의 슬래브(바닥)와 똑같은 기준(실제로 그려지는 비상계단·동문
    // 바깥쪽 가장자리)이라 슬래브 가장자리 너머로 남는 빈 화면은 없다. 다만 화면에 처음 뜨는
    // 카메라 프레임(fit)이 clampBotZ 끝까지 딱 맞춰 보여주지는 않는 특성이 있어서(3D 화면의
    // 기존 특성), tightBotZ를 그대로 clampBotZ로 쓰면 동문이 초기 화면 밖으로 살짝 잘린다.
    // EMSTAIR_FRAME_PAD는 그 카메라 프레임 여유만을 위한 값 — 슬래브 크기는 건드리지 않는다.
    if(EMSTAIR_POS[lv]){
      clampBotZ = Math.min(clampBotZ, EMSTAIR_POS[lv].tightBotZ - EMSTAIR_FRAME_PAD);
    }
  }else{
    clampHalfX=GLOBAL_HALF_X; clampTopZ=GLOBAL_TOP_Z; clampBotZ=GLOBAL_BOT_Z;
  }

  // 찾는 강의실 빨간색 강조 + 화살표 동선 : 엘리베이터 앞 → 복도 → 목적지
  if(target && lv===target.floor){
    var p2=targetPos();
    var ev2=evXZ(lv);
    // 지하1층 상세보기는 엘리베이터·존 자리가 건물 전체 홀로그램과 다르게 그려지므로
    // (오른쪽 위 코너 배치), 화살표 동선도 여기서 실제로 그려진 자리에 맞춰야 한다.
    if(lv==='B1'){
      ev2 = {x:B1_evX_D, z:B1_evZ_D};
      if(target.kind==='zone') p2 = {x:B1_ZONE_MID_X_D, z:B1_ZONE_MID_Z_D};
    }
    var AY=SLAB+0.55;
    // 4번 화면과 같은 문제(엘베와 계단 사이로 돌아 나옴)가 있어 동일하게 수정
    var raw=[ new THREE.Vector3(ev2.x,AY,ev2.z),   // 엘리베이터에서 출발
              new THREE.Vector3(0,AY,ev2.z),       // 복도로 곧장 나옴
              new THREE.Vector3(0,AY,p2.z),        // 복도를 따라 이동
              new THREE.Vector3(p2.x,AY,p2.z) ];
    var pts=[];
    raw.forEach(function(v){ if(!pts.length || pts[pts.length-1].distanceTo(v)>0.15) pts.push(v); });
    if(pts.length>=2){
      var curve=new THREE.CatmullRomCurve3(pts,false,'catmullrom',0);   // 복도를 따라 직각으로
      var tubeR2=0.32;                         // 기존(0.2)보다 두껍게 — 층상세에서 잘 보이도록
      var ROUTE_COLOR = 0xFF3B30;              // 기존 주황빛 빨강(E0553F)보다 선명한 빨강
      // 은은한 네온 글로우 레이어(가장 바깥) → 중간 → 코어 순으로 겹쳐 발광 효과
      groupB.add(new THREE.Mesh(new THREE.TubeGeometry(curve,300,tubeR2*2.2,20,false),
        new THREE.MeshBasicMaterial({color:ROUTE_COLOR,transparent:true,opacity:0.22,depthWrite:false})));
      groupB.add(new THREE.Mesh(new THREE.TubeGeometry(curve,300,tubeR2*1.5,20,false),
        new THREE.MeshBasicMaterial({color:ROUTE_COLOR,transparent:true,opacity:0.35,depthWrite:false})));
      groupB.add(new THREE.Mesh(new THREE.TubeGeometry(curve,300,tubeR2,20,false),
        new THREE.MeshBasicMaterial({color:ROUTE_COLOR})));
      addRouteArrows(groupB, curve, tubeR2, 3.2, ROUTE_COLOR);
    }
  }
  /* 층상세는 처음 열릴 때 항상 그 층 전체 평면도가 빈 공간(어두운 배경) 없이 화면에
     꽉 차게 보이도록 한다. 예전에는 목적지가 있으면 자동으로 그쪽으로 줌인했는데,
     목적지가 층 끝쪽에 있을 때 카메라가 건물 바깥(빈 배경)까지 보여주는 문제가 있었다.
     이제는 항상 층 전체를 기준으로 맞추고, 확대는 사용자가 두 손가락(또는 휠)으로 직접 하게 한다. */
  camTargetB.set(0, 0, (clampTopZ+clampBotZ)/2);
  zoomB = 1;
  thetaB=-Math.PI/2; phiB=0.12;   // 기존 0.24는 비스듬히 내려다봐서 평면도가 평행사변형처럼 살짝
                                    // 틀어져 보였다 — 더 수직에 가깝게(0.12) 낮춰서 도면이 반듯하게 보이도록.
  sB.add(groupB);
  go('s5');
  resizeB();
}
function pos(o,x,y,z){ o.position.set(x,y,z); return o; }
function bigLabel(t,c,k){ var l=labelSprite(t,c); l.scale.multiplyScalar(k||1.7); return l; }
/* 라벨이 자기 상자 폭(및 필요하면 세로 깊이)을 넘어가 옆 요소와 겹치지 않도록 크기를 제한해서 그룹에 추가.
   maxH를 생략하면 폭만 제한(기존 동작과 동일) — 화장실처럼 세로로 얇은 박스에서만 maxH를 넘김. */
function addClampedLabel(g, text, color, x, y, z, maxW, fontScale, maxH){
  var sp = bigLabel(text, color, fontScale);
  var s = 1;
  if(sp.scale.x > maxW) s = Math.min(s, maxW/sp.scale.x);
  if(maxH!==undefined && sp.scale.y*s > maxH) s = Math.min(s, maxH/sp.scale.y);
  if(s<1){ sp.scale.x*=s; sp.scale.y*=s; }
  g.add(pos(sp, x, y, z));
  return sp;
}
