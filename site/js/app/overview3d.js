"use strict";
/* overview3d.js — 건물 전체 3D — 층 그림 짓기 · 강조(highlight3D) · 목적지 이름표 · 매 장면 그리기(animate)
   (예전 한 파일 main.js 의 13482~14866줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */
/* 한 층(레벨) 내용 생성 — 건물뷰(입체) / 층상세(탑뷰 평면) 공용 */
function addLevelContents(g, lv, detail){
  if(lv==='R'){
    /* 옥상 : 녹색 방수 바닥 + 난간 + 옥탑방 두 개 */
    MESH_HOLO = !detail;
    var rSlab=mesh(GLOBAL_HALF_X*2, SLAB, (GLOBAL_TOP_Z-GLOBAL_BOT_Z), 0x2A3A32);
    rSlab.position.set(0, SLAB/2, (GLOBAL_TOP_Z+GLOBAL_BOT_Z)/2); g.add(rSlab);
    var rTop=mesh(GLOBAL_HALF_X*2-0.6, 0.10, (GLOBAL_TOP_Z-GLOBAL_BOT_Z)-0.6, 0x5FA97C);
    rTop.position.set(0, SLAB+0.05, (GLOBAL_TOP_Z+GLOBAL_BOT_Z)/2); g.add(rTop);
    var rph=detail?0.20:0.9;
    [[GLOBAL_HALF_X-0.15,0,0.3,(GLOBAL_TOP_Z-GLOBAL_BOT_Z)],
     [-GLOBAL_HALF_X+0.15,0,0.3,(GLOBAL_TOP_Z-GLOBAL_BOT_Z)]].forEach(function(a){
      var w=mesh(a[2], rph, a[3], 0xC8C6BA);
      w.position.set(a[0], SLAB+rph/2, (GLOBAL_TOP_Z+GLOBAL_BOT_Z)/2); g.add(w);
    });
    [GLOBAL_TOP_Z-0.15, GLOBAL_BOT_Z+0.15].forEach(function(zz){
      var w=mesh(GLOBAL_HALF_X*2, rph, 0.3, 0xC8C6BA);
      w.position.set(0, SLAB+rph/2, zz); g.add(w);
    });
    var hhZ=(FLOOR_LAYOUT[5]?FLOOR_LAYOUT[5].stZ:0);
    var hh=mesh(4.6, detail?0.5:2.9, 3.4, 0x9A5A44);
    hh.position.set(CORR_HALF+2.3, SLAB+(detail?0.25:1.45), hhZ); g.add(hh);
    var esR=EMSTAIR_POS[5];
    if(esR){
      var hh2=mesh(3.0, detail?0.5:2.9, 2.8, 0x9A5A44);
      hh2.position.set(esR.xWhole>0 ? CORR_HALF+1.5 : -(CORR_HALF+1.5),
                       SLAB+(detail?0.25:1.45), esR.z); g.add(hh2);
    }
    if(detail){
      addClampedLabel(g, (LANG==='ko')?'중앙계단':'Main stairs', '#3A1A12',
                      CORR_HALF+2.3, SLAB+0.6, hhZ, 4.2, 1.0);
      if(esR) addClampedLabel(g, (LANG==='ko')?'비상계단':'Emergency', '#3A1A12',
                      esR.xWhole>0 ? CORR_HALF+1.5 : -(CORR_HALF+1.5), SLAB+0.6, esR.z, 2.8, 1.0);
      addClampedLabel(g, (LANG==='ko')?'옥상':'Rooftop', '#0E3320',
                      -CORR_HALF-3.0, SLAB+0.6, (GLOBAL_TOP_Z+GLOBAL_BOT_Z)/2, 6.0, 1.4);
    }else{
      var rc=chipSprite((LANG==='ko')?'옥상':'Rooftop', '#7FD6A2', '#0B2B1A', 2.6, true);
      rc.userData={floor:'R'};
      g.add(pos(rc, -CORR_HALF-3.0, SLAB+3.4, (GLOBAL_TOP_Z+GLOBAL_BOT_Z)/2));
    }
    MESH_HOLO=false;
    return;
  }
  // 건물 전체 뷰(입체, detail=false)에만 홀로그램 느낌 재질을 적용한다.
  // 층 상세(탑뷰, detail=true)는 실측 도면을 보면서 길을 찾아야 하므로 또렷한 기존 색상을 그대로 유지.
  MESH_HOLO = !detail;
  var halfX = (lv==='B1') ? GLOBAL_HALF_X : FLOOR_LAYOUT[lv].halfX;
  var topZ  = (lv==='B1') ? GLOBAL_TOP_Z  : FLOOR_LAYOUT[lv].topOuterZ;
  var botZ  = (lv==='B1') ? GLOBAL_BOT_Z  : FLOOR_LAYOUT[lv].bottomOuterZ;
  var lenZ  = topZ - botZ, midZ=(topZ+botZ)/2;

  // 슬래브(바닥) 남쪽 끝 : 건물 전체 홀로그램(!detail)은 기존처럼 모든 층이 똑같은 크기로
  // 통일되도록 GLOBAL_BOT_Z를 쓴다. 층 상세보기(detail)는 "전체 폭" 슬래브를 원래 건물 폭
  // (FLOOR_LAYOUT[lv].bottomOuterZ, 실제 강의실이 있는 범위)까지만 깔아서, 비상계단 맞은편
  // (강의실이 없는 쪽)에 빈 배경이 남지 않게 한다 — 비상계단은 원래 건물 밖으로 튀어나온
  // 새 칸이라 맞은편엔 애초에 강의실이 없기 때문에, 전체 폭을 계단 깊이만큼 늘리면 그 반대쪽에
  // 아무것도 없는 빈 공간만 생긴다. 계단 밑 바닥은 아래에서 계단 폭만큼만 따로 좁게 이어붙인다.
  var coreBotZ = (detail && lv!=='B1') ? FLOOR_LAYOUT[lv].bottomOuterZ : GLOBAL_BOT_Z;
  var slab=mesh(GLOBAL_HALF_X*2, SLAB, (GLOBAL_TOP_Z-coreBotZ), 0x222B36);
  slab.position.set(0, SLAB/2, (GLOBAL_TOP_Z+coreBotZ)/2);
  slab.userData.bldgSlab=true;      // 걷기 중에는 감춘다(아래 fpBuildCorr 참고)
  g.add(slab);

  // 비상계단 밑 바닥 patch : 계단 칸과 정확히 같은 폭(EMSTAIR_W)만큼만 원래 건물 폭 바깥으로
  // 이어붙여서, 계단은 바닥이 있는 채로도 그 옆(맞은편)엔 빈 배경이 생기지 않게 한다.
  if(detail && lv!=='B1' && EMSTAIR_POS[lv]){
    var esPatchP = EMSTAIR_POS[lv];
    var stairSlabBotZ = esPatchP.z - EMSTAIR_RENDER_D/2;
    if(stairSlabBotZ < coreBotZ){
      var stairPatch = mesh(EMSTAIR_W, SLAB, (coreBotZ - stairSlabBotZ), 0x222B36);
      stairPatch.position.set(esPatchP.xWhole, SLAB/2, (coreBotZ+stairSlabBotZ)/2);
      stairPatch.userData.bldgSlab=true;
      g.add(stairPatch);
    }
  }

  // 건물 전체 뷰 : 각 층이 몇 층인지 바로 알 수 있도록 층 번호를 층 끝에 세워둠
  if(!detail){
    var fl = addClampedLabel(g, lvLabel(lv), '#FFFFFF',
              0, SLAB+1.6, GLOBAL_TOP_Z+2.2, 7, 3.2);
    // 목적지가 저층일 때 목적지·문 말풍선(renderOrder 999)에 층 번호가 가려지는 문제가
    // 있었다 — 층 번호는 항상 위치 파악에 필요한 정보이므로 그 어떤 라벨보다도 위에 그려지게 한다.
    if(fl){ fl.userData={floorTag:true, floor:lv}; fl.renderOrder = 1000; }
  }
  // 복도(중앙 좁은 띠)는 계단이 있는 층에서는 계단 앞(1층은 동문까지)까지 이어지는 통로처럼
  // 보이도록 원래 폭(coreBotZ)보다 조금 더 남쪽까지 그린다 — 실제로 걸어가는 통로이므로
  // 계단·문 바로 앞까지 이어지는 게 맞고, 코너에 빈 배경이 남는 문제와는 무관하다(복도는
  // 항상 코어 슬래브보다 좁은 CORR_HALF*2 폭이라 옆으로 빈 공간을 만들지 않는다).
  var corrBotZ = (detail && lv!=='B1' && EMSTAIR_POS[lv]) ? EMSTAIR_POS[lv].tightBotZ : coreBotZ;
  var corr=mesh(CORR_HALF*2, 0.1, (GLOBAL_TOP_Z-corrBotZ), 0x39465A);
  corr.position.set(0, SLAB+0.05, (GLOBAL_TOP_Z+corrBotZ)/2); g.add(corr);

  var PY = SLAB+0.09;              // 상세(평면) 높이
  var RH = detail ? 0.55 : 1.9;    // 방 높이 — 평면 느낌을 줄이고 입체감을 주기 위해 상향
  var RY = detail ? (SLAB+RH/2) : 1.9/2+SLAB;
  var LBL_TOP = SLAB+RH+0.16;      // 방/화장실 라벨 높이 — 커진 방 높이 위로 확실히 띄움

  if(lv==='B1'){
    // 지하1층 : 평면도 미제공 — 기존 프로토타입의 개방형 존 형태를 임시 유지 (FACILITIES.zoneB1 참고)
    // 엘리베이터·계단 코어는 비워두고, 나머지 넓은 쪽을 존으로 채운다.
    // 화면별로 코어 위치가 다르므로(건물 전체 홀로그램=1층과 정렬 / 층 상세=오른쪽 위 코너)
    // 존의 위치·크기도 그 화면에 맞는 쪽을 골라 쓴다.
    var zTop = detail ? B1_ZONE_TOP_Z_D : B1_ZONE_TOP_Z;
    var zBot = detail ? B1_ZONE_BOT_Z_D : B1_ZONE_BOT_Z;
    var zw = detail ? B1_ZONE_WIDTH_X_D : B1_ZONE_WIDTH_X;
    var zMidX = detail ? B1_ZONE_MID_X_D : B1_ZONE_MID_X;
    var zd = zTop - zBot, zMidZ = (zTop+zBot)/2;
    var zIsTgt = detail && target && target.kind==='zone';
    // 색을 더 진하고 뚜렷하게(불투명도 상향) + 기존보다 크게
    var zone=mesh(zw, detail?0.16:2.0, zd, zIsTgt?0xE0553F:0x9B7FE0, detail?0.95:0.55);
    zone.position.set(zMidX, detail?PY:1.0+SLAB, zMidZ);
    zone.userData={floor:'B1', zone:true};
    g.add(zone);
    var ze=new THREE.LineSegments(new THREE.EdgesGeometry(zone.geometry),
      new THREE.LineBasicMaterial({color:0xC9B6F5,transparent:true}));
    ze.position.copy(zone.position); g.add(ze);
    if(detail) g.add(pos(bigLabel((LANG==='ko')?'크리에이티브 존':'Creative Zone', zIsTgt?'#FFFFFF':'#2A2140',2.0), zMidX, PY+0.5, zMidZ));

    // 실제 답사 결과, 존의 왼쪽 하단 모서리에 밖으로 나가는 문이 있음.
    // 층 상세(detail)와 건물 전체 홀로그램은 카메라 방향이 서로 달라 같은 X 부호가
    // 화면상 반대쪽으로 보이므로, 화면별로 "왼쪽"에 해당하는 경계를 따로 기준삼는다.
    var zLeftX  = zMidX - zw/2;
    var zRightX = zMidX + zw/2;
    var b1DoorW = Math.min(zw*0.22, 3.2), b1DoorD = 0.5;
    var b1CornerMargin = 0.6;
    /* 화면상 좌우가 detail/hologram에서 반대로 보이므로, 층상세(2D)는 zRightX 쪽을 써야 실제로 왼쪽에 보인다 */
    var b1DoorX = detail ? (zRightX - b1DoorW/2 - b1CornerMargin) : (zLeftX + b1DoorW/2 + b1CornerMargin);
    /* 나가는 문 : 층상세 2D 지도는 좌측 "하단"(zBot)으로, 건물 전체 홀로그램은 기존 그대로 */
    var b1DoorZ = detail ? (zBot + b1DoorD/2 + b1CornerMargin) : (zTop - b1DoorD/2 - b1CornerMargin);

    var b1DoorH = detail ? 0.18 : FLOOR_H*0.5;
    var b1Door = mesh(b1DoorW, b1DoorH, b1DoorD, 0xFFC93C, detail?0.95:0.85);
    b1Door.position.set(b1DoorX, detail?(PY+0.14):(b1DoorH/2+SLAB), b1DoorZ);
    b1Door.userData = {floor:'B1', b1door:true};
    g.add(b1Door);
    var b1DoorEdge = new THREE.LineSegments(new THREE.EdgesGeometry(b1Door.geometry),
      new THREE.LineBasicMaterial({color:0xFFE9A8, transparent:true}));
    b1DoorEdge.position.copy(b1Door.position); g.add(b1DoorEdge);
    if(!detail){
      var b1DoorTile = mesh(b1DoorW,0.1,b1DoorD,0xFFC93C);
      b1DoorTile.position.set(b1DoorX, SLAB+0.05, b1DoorZ); g.add(b1DoorTile);
    }
    /* 계단·엘리베이터와 모양을 맞춰 네모칸로, 글씨도 크게 */
    var b1DoorChip = chipSprite((LANG==='ko')?'나가는 문':'Exit', '#FFC93C', '#4A3400',
                                detail?1.9:3.6, true);
    b1DoorChip.userData = {floor:'B1', b1door:true};
    g.add(pos(b1DoorChip, b1DoorX, detail?(PY+0.5):(b1DoorH+SLAB+1.2), b1DoorZ));

    /* 요청 반영: B1도 다른 층처럼 정수기·휴지통을 표시한다 — B1은 화장실 박스가
       없어(정수기·휴지통이 원래 화장실 칸에 곁다리로 붙는 방식) 이 존 안에
       따로 자리를 만든다. "나가는 문 맞은편" 벽 쪽, 문과 같은 X 위치에
       Z만 반대쪽 끝으로 둔다(문 쪽 코너 마진 계산을 그대로 미러링). */
    (function(){
      var wtZ = detail ? (zTop - b1DoorD/2 - b1CornerMargin) : (zBot + b1DoorD/2 + b1CornerMargin);
      /* 요청 반영: 상세보기(2D 층별 지도)에서 정수기·휴지통이 너무 작아 잘 안 보였다 —
         상세보기일 때만 박스·깊이·글씨를 확 키운다(전체 홀로그램은 기존 크기 유지).
         추가 요청: 위쪽(문 쪽) 가장자리는 그대로 두고, 아래쪽(존 안쪽)으로만 더 늘려서
         더 크게 보이게 한다. */
      var wtTotalW = b1DoorW*(detail?2.4:1.5), wtGap = 0.12;
      var wtD = b1DoorD*(detail?4.2:1.6);
      var wtTopEdge = detail ? (zTop - b1CornerMargin) : (zBot + b1CornerMargin);
      if(detail) wtZ = wtTopEdge - wtD/2;   // 위쪽 가장자리 고정, 아래로만 확장
      var itemW = (wtTotalW - wtGap)/2;
      var wtX0 = b1DoorX - wtTotalW/2 + itemW/2;
      var wtX1 = wtX0 + itemW + wtGap;
      var water=mesh(itemW, RH*1.05, wtD, 0xA7D8E8, 0.97);
      water.position.set(wtX0, RY, wtZ); g.add(water);
      var trash=mesh(itemW, RH*0.9, wtD, 0x2A62B8, 0.97);
      trash.position.set(wtX1, RY, wtZ); g.add(trash);
      water.userData={floor:'B1'}; trash.userData={floor:'B1'};
      addClampedLabel(g, (LANG==='ko')?'정수기':'Water', '#12212E', wtX0, LBL_TOP, wtZ, itemW-0.06, detail?4.2:2.6, wtD-0.1);
      addClampedLabel(g, (LANG==='ko')?'휴지통':'Bin', '#0B1220', wtX1, LBL_TOP, wtZ, itemW-0.06, detail?4.2:2.6, wtD-0.1);
    })();

    // 건물 전체 홀로그램(입체)에서만: 나가는 문을 통해 건물 밖으로 나가서 1층 바닥 높이(SP)까지
    // 실제로 올라가는 계단 모형을 디딤판을 층층이 쌓아 표현한다(건물 안쪽이 아니라 문 바깥쪽 방향으로
    // 뻗어나가며 올라간다). 층 상세 평면도는 실측 도면이 없어 계단을 표시하지 않는다.
    if(!detail){
      var stairW = Math.min(zw*0.22, 3.2);
      var b1StairX = b1DoorX;                 // 나가는 문과 같은 자리에서 시작
      var b1StairBaseZ = b1DoorZ + b1DoorD/2 + 0.3;   // 문 바로 바깥(건물 밖) 쪽에서 출발
      var stairSteps = 12;
      var stairRiseTotal = SP;   // 1층 바닥까지 정확히 닿도록
      var stairRunTotal = 4.2;
      var stepRise = stairRiseTotal/stairSteps;
      var stepRun = stairRunTotal/stairSteps;
      for(var si=0; si<stairSteps; si++){
        var stepY = stepRise*(si+0.5);
        var stepZ = b1StairBaseZ + stepRun*(si+0.5);   // 건물 바깥쪽(-Z)으로 갈수록 더 멀어지며 올라감
        var step = mesh(stairW, stepRise*0.92, stepRun*1.05, 0x7FB069, 0.9);
        step.position.set(b1StairX, stepY, stepZ);
        step.userData = {floor:'B1', b1stair:true};
        g.add(step);
        var stepEdge = new THREE.LineSegments(new THREE.EdgesGeometry(step.geometry),
          new THREE.LineBasicMaterial({color:0xC9F0B0, transparent:true}));
        stepEdge.position.copy(step.position); g.add(stepEdge);
      }
      var b1StairChip = chipSprite((LANG==='ko')?'올라가는 계단':'Stairs up', '#7FB069', '#12240B', 3.0, true);
      b1StairChip.userData = {floor:'B1', b1stair:true};
      g.add(pos(b1StairChip, b1StairX, stairRiseTotal+1.0, b1StairBaseZ + stairRunTotal/2));
    }
  }else{
    var cells = FLOOR_LAYOUT[lv].cells;
    cells.forEach(function(c){
      var isTgt = detail && target && lv===target.floor && target.kind==='room' && isTargetMesh({userData:{floor:lv, code:c.code, parent:c.parent}});
      var isEmpty = !c.code; // '(미사용)' 같은 주석 칸
      var baseColor = isEmpty ? 0x4A5568 : 0x9FB4CC;
      var insetD = roomInsetD(c.d);
      var m=mesh(c.w-0.25, RH, c.d-insetD, isTgt?0xE0553F:baseColor, detail?(isEmpty?0.5:0.95):(isEmpty?0.12:0.22));
      m.position.set(c.x,RY,c.z);
      m.userData={floor:lv, code:c.code, parent:c.parent, searchable:c.searchable};
      g.add(m);
      if(!detail) roomMeshesPush(m);
      var e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),
        new THREE.LineBasicMaterial({color:0x5B7CA0,transparent:true}));
      e.position.copy(m.position); g.add(e);
      if(!detail){
        var tile=mesh(c.w-0.25,0.1,c.d-insetD,baseColor);
        tile.position.set(c.x,SLAB+0.05,c.z);
        tile.userData={floor:lv, roomTile:true};   // 로드뷰에서는 감춰야 한다
        g.add(tile);
      }else if(c.code){
        var lbl = c.label || c.code;
        var lines = lbl.split('\n');
        /* 호실 번호만으로는 무슨 방인지 알 수 없어서, 아래에 용도를 한 줄 더 적는다.
           이름은 사진 파일명에서 자동으로 뽑힌 것(ROOM_NAME)을 쓴다.
           칸이 얕으면(가벽으로 반 나뉜 방) 두 줄이 안 들어가므로 번호만 남긴다. */
        var nmRaw = rn(ROOM_NAME[c.parent || c.code]);
        var nm = (!c.label && c.d >= UNIT_Z*0.7) ? shortRoomName(nmRaw) : '';
        if(nm) lines = lines.concat([nm]);
        var nameIdx = nm ? lines.length-1 : -1;
        /* 예전에는 얕은 방(가벽으로 반 나뉜 13501·13502 등)을 일괄 1.0배로 줄여서
           13504 같은 온전한 방보다 번호가 훨씬 작게 나왔다.
           → 방 깊이 안에 들어가는 한도에서 최대한 크게 잡는다. */
        var drawnD = c.d - insetD;
        var lineGap = Math.max(0.95, Math.min(2.0, drawnD/(lines.length+0.7)));
        var fitH = (lines.length>1) ? lineGap*0.80 : (drawnD-0.4);
        var fontScale = Math.max(0.9, Math.min(1.9, fitH/0.84));
        var maxW = c.w - 1.2;   // 방 폭을 넘어가지 않도록 라벨 폭 제한(옆 칸과 겹침 방지)
        lines.forEach(function(line, li){
          var isNm = (li===nameIdx);
          var sp = bigLabel(line, isTgt?'#FFFFFF':(isNm?'#43596E':'#1B2230'),
                            isNm ? fontScale*0.72 : fontScale);
          if(sp.scale.x > maxW){ var s = maxW/sp.scale.x; sp.scale.x*=s; sp.scale.y*=s; }
          g.add(pos(sp, c.x, LBL_TOP, c.z + ((lines.length-1)/2 - li)*lineGap));
        });
      }
    });

    // 화장실 (평면도 미표시 — 임시 위치, FACILITIES.toilet 참고)
    var tf=FACILITIES.toilet, tIsTgt = detail && target && target.kind==='toilet' && target.floor===lv;
    /* 상세보기에서는 화장실 상자가 실제 화장실 깊이(1.6, 아주 얇은 띠)로 그려져서
       옆의 중앙계단·엘리베이터 상자(깊이 4.5, UNIT_Z)보다 훨씬 얇아 보였다.
       실제 걷기용 치수(tf.d)는 그대로 두고, 상세보기 표시용 깊이만 키운다.
       ※ 화장실 윗변은 바로 위 호실에 이미 딱 붙어 있어서(위쪽 여유 0) 위·아래로
         똑같이 키우는 방식으로는 전혀 커지지 않았다 → 윗변은 그대로 두고
         아래쪽(빈 공간이 남아 있는 방향)으로만 늘려서 중앙계단 깊이(UNIT_Z)까지 키운다. */
    var tfDetailD = tf.d, tfDetailZ = tf.z;
    if(detail){
      var topEdge = tf.z + tf.d/2;                 // 윗변(위 호실에 붙어 있음) — 고정
      var botLimit = topEdge - UNIT_Z;             // 중앙계단만큼 키웠을 때의 아랫변
      var marginGap = 0.04;
      var Lcells = (FLOOR_LAYOUT[lv] && FLOOR_LAYOUT[lv].cells) || [];
      Lcells.forEach(function(c){                  // 아래쪽 호실에 막히면 거기까지만
        if(!c.code) return;
        if((c.x>0) !== (tf.x>0)) return;           // 같은 쪽(복도 기준) 칸만 본다
        if(c.z >= tf.z) return;                    // 위쪽 칸은 윗변 고정이라 볼 필요 없음
        var cTop = c.z + c.d/2 - 0.175 + marginGap;  // 호실은 화면상 0.35 줄여 그려진다
        if(cTop > botLimit) botLimit = cTop;
      });
      [FACILITIES.vending, FACILITIES.printer].forEach(function(fa){   // 1층 자판기·인쇄기
        if(!fa || fa.floor!==lv) return;
        if((fa.x>0) !== (tf.x>0)) return;
        if(fa.z >= tf.z) return;
        var fTop = fa.z + fa.d/2 + marginGap;
        if(fTop > botLimit) botLimit = fTop;
      });
      var newD = topEdge - botLimit;
      if(newD > tf.d){ tfDetailD = newD; tfDetailZ = (topEdge + botLimit)/2; }
    }
    var wc=mesh(tf.w, RH, tfDetailD, tIsTgt?0xE0553F:0x7EA6C9, detail?0.85:0.24);
    wc.position.set(tf.x, RY, tfDetailZ);
    wc.userData={floor:lv, toilet:true};
    g.add(wc);
    var we=new THREE.LineSegments(new THREE.EdgesGeometry(wc.geometry),
      new THREE.LineBasicMaterial({color:0x5B7CA0,transparent:true}));
    we.position.copy(wc.position); g.add(we);
    /* 화장실 칸에서 복도 쪽 끝을 살짝 잘라, 그 자리에 휴지통·정수기를 놓는다(사진 반영).
       tf.x가 음수면 복도(0)에 가까운 쪽은 +X 방향 끝이다.
       예전엔 두 상자 크기를 화장실과 따로 정해서, 화장실 칸보다 아래로 삐져나가거나
       칸 안에서 한쪽에 몰려 보였다 → 두 상자가 화장실 칸 세로선에 정확히 맞춰
       위아래를 꽉 채우도록(정수기 바깥선 = 화장실 바깥선) 크기를 계산한다. */
    if(detail){
      var wcNotchW=1.7;                                     // 눈에 잘 띄도록 넉넉한 폭
      var corridorSign = (tf.x<0) ? 1 : -1;                 // 복도(0)로 향하는 방향
      var notchCx = tf.x + corridorSign*(tf.w/2 - wcNotchW/2);
      var edgePad=0.08, midGap=0.18;                        // 칸 테두리 여백 / 두 상자 사이 틈
      if(lv===1){
        /* 요청 반영(1층만): 직접 걸어보기 3D에서는 정수기·휴지통이 화장실 칸 안이 아니라
           화장실과 인쇄기 사이의 빈 공간(정문 쪽)에 있다. 그 실제 자리에 맞춰 옮긴다.
           앞뒤로 쌓지 말고 나란히(옆으로) 배치. 복도 쪽 가장자리(notchCx 계산 기준)는
           고정한 채, 두 상자를 합친 폭만큼 반대쪽(방 안쪽)으로 더 넓게 잡아서
           상자 하나하나는 예전 크기(wcNotchW)를 그대로 유지하면서도 복도로는
           튀어나오지 않게 한다. */
        var wcNotchW1 = wcNotchW*2 + 0.18;   // 상자 두 개(각 wcNotchW-0.1)+틈이 들어갈 총 폭
        var notchCx1 = tf.x + corridorSign*(tf.w/2 - wcNotchW1/2);
        var pr1 = FACILITIES.printer;
        var gTop = (tfDetailZ - tfDetailD/2) - 0.15;
        var gBot = (pr1.z + pr1.d/2) + 0.15;
        var itemD1 = Math.max(0.5, (gTop - gBot - midGap)/2);   // 기존과 같은 깊이
        var pairGap1 = 0.18;
        var itemW1 = wcNotchW - 0.1;                             // 예전(단독 배치)과 같은 폭
        var wallPad = 0.06;                                      // 화장실 벽에 딱 붙임
        var gapZc = gTop - wallPad - itemD1/2;
        var wpX0g = notchCx1 - itemW1/2 - pairGap1/2;
        var wpX1g = notchCx1 + itemW1/2 + pairGap1/2;
        var water1=mesh(itemW1, RH*1.05, itemD1, 0xA7D8E8, 0.97);
        water1.position.set(wpX0g, RY, gapZc); g.add(water1);
        var trash1=mesh(itemW1, RH*0.9, itemD1, 0x2A62B8, 0.97);
        trash1.position.set(wpX1g, RY, gapZc); g.add(trash1);
        addClampedLabel(g, (LANG==='ko')?'정수기':'Water', '#12212E', wpX0g, LBL_TOP, gapZc, itemW1-0.15, 2.0, itemD1-0.15);
        addClampedLabel(g, (LANG==='ko')?'휴지통':'Bin', '#0B1220', wpX1g, LBL_TOP, gapZc, itemW1-0.15, 2.0, itemD1-0.15);
      }else{
      var itemD = Math.max(0.5, (tfDetailD - edgePad*2 - midGap)/2);
      var zBotIn = tfDetailZ - tfDetailD/2 + edgePad;        // 칸 안쪽 아래 끝
      var wpX = notchCx;
      var wpZ0 = zBotIn + itemD/2;                           // 아래쪽 자리
      var wpZ1 = wpZ0 + itemD + midGap;                      // 위쪽 자리 — 위 끝이 칸 끝과 일치
      /* 정수기를 아래, 휴지통을 위로 자리 맞바꿈.
         휴지통은 화장실 상자(연한 하늘색)와 색이 겹치지 않게 진한 파랑으로 칠하되,
         글씨(검정)가 읽히도록 너무 어둡지 않은 선에서 잡는다. */
      var water=mesh(wcNotchW-0.1, RH*1.05, itemD, 0xA7D8E8, 0.97);
      water.position.set(wpX, RY, wpZ0); g.add(water);
      var trash=mesh(wcNotchW-0.1, RH*0.9, itemD, 0x2A62B8, 0.97);
      trash.position.set(wpX, RY, wpZ1); g.add(trash);
      addClampedLabel(g, (LANG==='ko')?'정수기':'Water', '#12212E', wpX, LBL_TOP, wpZ0, wcNotchW-0.15, 2.0, itemD-0.15);
      addClampedLabel(g, (LANG==='ko')?'휴지통':'Bin', '#0B1220', wpX, LBL_TOP, wpZ1, wcNotchW-0.15, 2.0, itemD-0.15);
      }
    }
    if(!detail){
      // 건물 전체 뷰에서도 화장실이 층마다 어디인지 보이도록 기둥처럼 세우고 라벨을 붙임
      var wh = FLOOR_H*0.55;
      var wcol = mesh(tf.w, wh, tf.d, 0x5FA8D3, 0.9);
      wcol.position.set(tf.x, wh/2+SLAB, tf.z);
      wcol.userData={floor:lv, toilet:true};
      g.add(wcol);
      var wlb = addClampedLabel(g, (LANG==='ko')?'화장실':'Restroom', '#0E2233', tf.x, wh+SLAB+0.05, tf.z, tf.w-0.2, 1.7);
      if(wlb) wlb.userData={floor:lv, wcLabel:true};
    }else{
      // 폭은 넉넉(호실 칸 폭)하지만 세로(d)가 얇으므로, 글자가 위아래로 넘치지 않도록 maxH로도 제한
      addClampedLabel(g, (LANG==='ko')?'화장실':'Restroom', tIsTgt?'#FFFFFF':'#12212E', tf.x, LBL_TOP, tfDetailZ, tf.w-0.6, 1.8, tfDetailD-0.35);
      // 2층 상세보기에서만 : 화장실과 13221 사이에 다른 층에는 없는 빈 공간이 남아서(2층 방 배치만
      // 그렇게 떨어져 있음), 그 자리를 놀리지 않고 동그란 쉼터 표시를 둔다.
      if(lv===2){
        var c13221 = FLOOR_LAYOUT[2].cells.filter(function(c){ return c.code==='13221'; })[0];
        var gapTopZ = tfDetailZ - tfDetailD/2;                                   // 화장실 아래쪽 경계
        var gapBotZ = c13221 ? (c13221.z + c13221.d/2) : (gapTopZ-3);  // 13221 위쪽 경계
        var restX = tf.x, restZ = (gapTopZ+gapBotZ)/2, restR = Math.min(3.4, Math.abs(gapTopZ-gapBotZ)/2 - 0.4);
        if(restR > 0.8){
          var restDisc = new THREE.Mesh(new THREE.CircleGeometry(restR, 40),
            new THREE.MeshBasicMaterial({color:0xC9A8F5, transparent:true, opacity:0.6, side:THREE.DoubleSide}));
          restDisc.rotation.x = -Math.PI/2; restDisc.position.set(restX, PY+0.01, restZ);
          g.add(restDisc);
          var restRing = new THREE.Mesh(new THREE.RingGeometry(restR-0.14, restR, 40),
            new THREE.MeshBasicMaterial({color:0xE7D9FA, transparent:true, opacity:0.95, side:THREE.DoubleSide}));
          restRing.rotation.x = -Math.PI/2; restRing.position.set(restX, PY+0.02, restZ);
          g.add(restRing);
          addClampedLabel(g, (LANG==='ko')?'쉼터':'Rest area', '#3A2A55', restX, PY+0.4, restZ, restR*1.7, 1.6);
        }
      }
    }
  }

  // 엘리베이터 · 계단 (전 층 동일 위치 — 평면도 반영, 좌측 코어). 폭·깊이 모두 호실 하나 크기만큼 키움.
  if(lv!=='B1'){
    var L=FLOOR_LAYOUT[lv];
    var evstW = ROOM_W-0.25;   // 위아래 호실과 같은 폭(호실 렌더링과 동일한 인셋 규칙)
    var eh = detail?0.18:FLOOR_H*0.85, sh2 = detail?0.18:FLOOR_H*0.7;
    var el=mesh(evstW,eh,L.evD,0xE0A458); el.position.set(L.coreX, detail?PY+0.14:eh/2+SLAB, L.evZ);
    el.userData.evst='ev'; g.add(el);
    var st=mesh(evstW,sh2,L.stD,0x7FB069); st.position.set(L.coreX, detail?PY+0.14:sh2/2+SLAB, L.stZ);
    st.userData.evst='st'; g.add(st);
    if(detail){
      addClampedLabel(g, 'EV', '#3A2A10', L.coreX, PY+0.55, L.evZ, evstW-0.6, 2.4);
      addClampedLabel(g, (LANG==='ko')?'중앙계단':'Stairs', '#1E3212', L.coreX, PY+0.55, L.stZ, evstW-0.6, 2.1);
    }else{
      // 건물 전체 뷰에서도 엘리베이터·계단이 어디인지 한눈에 보이도록 라벨을 세워둠
      var lb1=addClampedLabel(g,'EV','#3A2A10',L.coreX, eh+SLAB+0.05, L.evZ, evstW-0.4, 2.2);
      var lb2=addClampedLabel(g,(LANG==='ko')?'중앙계단':'Stairs','#1E3212',L.coreX, sh2+SLAB+0.05, L.stZ, evstW-0.4, 2.0);
      if(lb1) lb1.userData.evst='ev';
      if(lb2) lb2.userData.evst='st';
    }
  }else{
    // 지하1층 : 평면도 미제공이라 정확한 위치는 알 수 없음.
    // 건물 전체 홀로그램(detail=false)에서는 1층과 같은 좌표를, 크리에이티브 존 상세보기(detail=true)에서는
    // 오른쪽 위 코너에 엘리베이터(위)·계단(바로 아래, 틈 없이 붙임)을 배치한다.
    var evX = detail ? B1_evX_D : B1_evX;
    var evZ = detail ? B1_evZ_D : B1_evZ;
    var stZ = detail ? B1_stZ_D : B1_stZ;
    var eh=detail?0.18:FLOOR_H*0.85, sh2=detail?0.18:FLOOR_H*0.7;
    var el=mesh(B1_EVST_W,eh,B1_EVST_D,0xE0A458); el.position.set(evX, detail?PY+0.14:eh/2+SLAB, evZ);
    el.userData.evst='ev'; g.add(el);
    var st=mesh(B1_EVST_W,sh2,B1_EVST_D,0x7FB069); st.position.set(evX, detail?PY+0.14:sh2/2+SLAB, stZ);
    st.userData.evst='st'; g.add(st);
    if(detail){
      addClampedLabel(g, 'EV', '#3A2A10', evX, PY+0.55, evZ, B1_EVST_W-0.6, 2.4);
      addClampedLabel(g, (LANG==='ko')?'중앙계단':'Stairs', '#1E3212', evX, PY+0.55, stZ, B1_EVST_W-0.6, 2.1);
    }
  }

  // 비상계단(1~5층) : 정문 기준 지정 호실(13113·13215·13316·13412·13515) 바로 아래(-Z, 건물 바깥쪽)에
  // 새 구조물만 추가한다. 위에서 계산해둔 EMSTAIR_POS만 사용하고, 해당 호실을 포함한
  // 기존 호실·EV·계단 배치(FLOOR_LAYOUT)는 전혀 건드리지 않는다.
  if(lv!=='B1' && EMSTAIR_POS[lv]){
    var esP = EMSTAIR_POS[lv];
    // x는 상세보기·건물 전체 홀로그램 모두 통일된 값(xWhole)을 쓴다 — 계단실은 건물을 수직으로
    // 관통하는 구조물이라 층마다 자리가 어긋나면 안 되고, 2층 기준 호실(13215)은 다른 층과
    // 좌우가 뒤집힌 자리에 있어(x부호 반대) 그 값을 그대로 쓰면 2층만 반대쪽에 떠 보인다.
    var esX = esP.xWhole;
    // 건물 전체 홀로그램·층 상세보기 모두에서, 실제 호실(13113 등)과 완전히 같은 규격으로 그린다.
    // 크기(EMSTAIR_W·D)뿐 아니라 두께·높이(RH·RY)와 인접 칸 사이 여백(roomInsetD)까지
    // 호실 렌더링 방식을 그대로 따라 해서, 진짜 옆 호실처럼 자연스럽게 이어 붙게 한다.
    var esW = EMSTAIR_W;
    var esD = EMSTAIR_D;                 // 칸 간격(자리) 계산용 — 실제로 그리는 두께는 아래 esRenderD
    var esInset = roomInsetD(EMSTAIR_D);
    var esRenderD = EMSTAIR_D - esInset;
    // "찾는 강의실·동선"(#FF3B30) 색과 헷갈리지 않도록 그보다 옅은(밝은) 빨강을 사용.
    // 다만 비상계단 자체가 목적지(target.kind==='emstair')인 층에서는 화장실·강의실과 같은
    // "목표 지점" 색(0xE0553F)으로 바꿔서 어디로 안내되는지 또렷이 보이게 한다.
    var esIsTgt = detail && target && target.kind==='emstair' && target.floor===lv;
    var esColor = esIsTgt ? 0xE0553F : 0xFF8983;
    var esMesh = mesh(esW, RH, esRenderD, esColor, detail?0.95:0.85);
    esMesh.position.set(esX, RY, esP.z);
    esMesh.userData={evst:'emstair', floor:lv};
    g.add(esMesh);
    var esEdge=new THREE.LineSegments(new THREE.EdgesGeometry(esMesh.geometry),
      new THREE.LineBasicMaterial({color:0xFFE1DD,transparent:true}));
    esEdge.userData={floor:lv, evst:'emstair'};   // 로드뷰(개방된 계단실)에서는 감춘다
    esEdge.position.copy(esMesh.position); g.add(esEdge);
    if(!detail){
      var esTile=mesh(esW,0.1,esRenderD,esColor);
      esTile.userData={floor:lv, evst:'emstair'};   // 로드뷰에서 계단실 바닥으로 비쳐 보이지 않게
      esTile.position.set(esX,SLAB+0.05,esP.z); g.add(esTile);
    }
    var esChip = chipSprite((LANG==='ko')?'비상계단':'Emergency Stairs', '#FF8983', '#4A0E0A', detail?1.4:3.0);
    esChip.userData = {evst:'emstair', floor:lv};
    g.add(pos(esChip, esX, detail?(PY+0.5):(RH+SLAB+1.4), esP.z));
  }

  /* 예전엔 화장실 상자와 따로 떨어진 자리(로드뷰 실측 좌표)에 휴지통 표시를 하나 더
     세워 뒀는데, 이제 화장실 칸 자체에 휴지통·정수기를 붙여 넣었으니(위 참고)
     따로 동떨어져 보이던 이 표시는 지운다. */

  // 1층 전용 : 출입구 4곳(평면도 표기) · 자판기·인쇄기(임시) · 사람
  if(lv===1){
    var L=FLOOR_LAYOUT[1];
    // 남문을 계단 위쪽(북쪽)으로 옮겨 배치 : 계단 구간의 위쪽 끝(=CORE_HALF, 위쪽 호실과 맞닿는 경계)에서
    // 안쪽으로 여유를 두는 위치에 배치(깊이도 그 여유에 맞게 계산).
    // 후문(서쪽)은 계단 칸과 나란히 붙어 있으므로, 계단 박스와 같은 위치·같은 길이로 맞춘다.
    // 동문(남쪽) 위치 : 비상계단 바깥쪽(남쪽) 가장자리에 정확히 맞춘다 — 여러 후보 이미지(A~E)를
    // 비교해서 사용자가 직접 고른 위치(D, 계단 끝에 딱 맞춤).
    var southZ = EMSTAIR_POS[1]
      ? (EMSTAIR_POS[1].z - EMSTAIR_RENDER_D/2)
      : L.bottomOuterZ;
    var doorGeom = {
      north:{x:0, z:L.topOuterZ, w:CORR_HALF*2, d:0.8},
      south:{x:0, z:southZ,      w:CORR_HALF*2, d:0.8},
      west: {x: L.halfX, z:L.stZ, w:0.8, d:L.stD},
      east: {x:-L.halfX, z:0, w:0.8, d:3.2}
    };
    FLOORS_DATA[1].doors.forEach(function(dd){
      var dg = doorGeom[dd.side];
      var dh = detail?0.18:1.7;
      /* 실제 공대 3호관 출입문은 알루미늄 프레임 + 청록 유리 자동문이다.
         예전에는 민트색 덩어리 하나여서 벽인지 문인지 구분이 안 됐다 →
         유리(반투명) + 테두리 + 가운데 세로 프레임(멀리언)으로 나눠 그려서
         두 짝짜리 유리문으로 읽히게 한다. */
      var m=mesh(dg.w,dh,dg.d,0x8FE3E0, detail?0.62:0.34);
      m.position.set(dg.x, detail?PY:dh/2+SLAB, dg.z);
      /* v137 : 출발 문에서는 이 문짝이 사람 마커보다 앞에 그려져야 하므로(사람이 문 뒤에
         서 있는 것처럼), 어느 문의 부품인지 이름을 남겨 둔다 — updateStartTag에서 찾아 쓴다. */
      m.userData.door = true; m.userData.gatePart = dd.name; g.add(m);
      var gEdge=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),
        new THREE.LineBasicMaterial({color:0xD8EEF4, transparent:true, opacity:0.95}));
      gEdge.position.copy(m.position); gEdge.userData.gatePart = dd.name; g.add(gEdge);
      var alongZ = (dg.d >= dg.w);                     // 문이 Z방향으로 긴가(옆문) X방향으로 긴가
      var mull=mesh(alongZ ? dg.w+0.05 : 0.16, dh+0.03, alongZ ? 0.16 : dg.d+0.05, 0xC6D6DE, 1);
      mull.position.set(dg.x, detail?PY+0.02:dh/2+SLAB, dg.z);
      mull.userData.door = true; mull.userData.gatePart = dd.name; g.add(mull);
      if(!detail){                                     // 건물 전체 뷰 : 문 위 채광창 한 겹
        var tr=mesh(dg.w*0.98, 0.5, dg.d*0.9, 0x8FE3E0, 0.22);
        tr.position.set(dg.x, SLAB+dh+0.3, dg.z);
        tr.userData.door = true; tr.userData.gatePart = dd.name; g.add(tr);
      }
      /* 문 이름 : 얇은 글씨는 층 상세처럼 축소되면 읽히지 않아 배경 깔린 알약으로 바꿨다.
         남쪽 옆문도 이제 같이 표시하고, 건물 전체 뷰(3D)에도 네 곳 모두 적는다. */
      // 남쪽(동문)은 안쪽으로 당겨 놓으면 복도 마지막 호실 줄과 겹쳐 보였음 → 당기지 않고
      // 복도 끝(실제 문 위치)에 그대로 띄운다.
      /* 동문(south)만 복도 끝에 붙어 있어 서문과 짝이 안 맞았다 → 같은 만큼 안쪽으로 */
      var lz = dg.z + (dd.side==='north' ? -2.3 : (dd.side==='south' ? 2.3 : 0));
      var isSideDoor = (dd.side==='west'||dd.side==='east');
      // 옆벽 라벨은 슬래브 바깥(건물 실루엣 밖)에 둬서 EV·계단 박스와 겹치지 않게 한다.
      var lx = isSideDoor ? (dg.x>0 ? dg.x+1.7 : dg.x-1.7) : dg.x;
      var DOOR_NAME_EN = {'동문':'East Gate','서문':'West Gate','후문':'Back Gate','정문':'Main Gate'};
      var chip = chipSprite((LANG==='en' ? (DOOR_NAME_EN[dd.name]||dd.name) : dd.name), '#8FE3E0', '#052E2C', detail?1.5:3.4);
      /* v135 : 어느 문인지 나중에 찾아낼 수 있도록 이름을 남긴다. */
      chip.userData = {door:true, floor:1, gateName: dd.name};
      /* v135 : 출발 문 위에는 사람 마커(renderOrder 999)가 서게 되는데, 예전 순서(998)로는
         사람이 글씨를 완전히 덮어 '후문'이 안 보였다 → 문 이름표를 사람보다 앞(1002)에
         그려서, 사람이 이름표 뒤에 서 있는 것처럼 보이게 한다. */
      chip.renderOrder = 1002;
      if(chip.material){ chip.material.depthTest=false; chip.material.depthWrite=false; }
      // 건물 전체 뷰에서는 목적지 이름표(흰 글씨)와 높이가 겹쳐 서문 등이 묻히던 문제가 있어
      // 이름표보다 확실히 높은 자리에 띄운다.
      g.add(pos(chip, lx, detail?PY+0.4:SLAB+dh+2.1, lz));
    });
    // 인쇄기 : 평면도 미표시 — 13104 바로 위에 배치(FACILITIES 참고). 자판기는 요청으로 삭제.
    var ph=detail?0.18:1.2;
    var prn=mesh(FACILITIES.printer.w,ph,FACILITIES.printer.d,0xB0B8C0);
    prn.position.set(FACILITIES.printer.x, detail?PY:ph/2+SLAB, FACILITIES.printer.z);
    prn.userData={floor:lv, roomTile:true};
    g.add(prn);
    if(detail){
      addClampedLabel(g, '인쇄기', '#1B222A', FACILITIES.printer.x, PY+0.4, FACILITIES.printer.z, FACILITIES.printer.w-0.2, 0.85);
    }
    // 사람 마커는 층 사이를 오르내려야 하므로 층 그룹이 아니라 buildingRoot에 붙인다(makeBuilding 뒤에서 생성).
  }
}
var roomMeshes=[];
function roomMeshesPush(m){ roomMeshes.push(m); }

var MESH_HOLO = false;   // true일 때만 addLevelContents가 홀로그램 재질을 켠다(건물 전체 뷰)
function mesh(w,h,d,c,o){
  var geo=new THREE.BoxGeometry(w,h,d);
  var m;
  if(MESH_HOLO){
    // 반투명 발광 패널 + 시안색 와이어프레임 테두리로 '입체 홀로그램' 느낌을 낸다.
    var mat=new THREE.MeshPhongMaterial({color:c, emissive:c, emissiveIntensity:0.28,
      shininess:65, transparent:true, opacity:(o!==undefined?Math.min(o,0.7):0.6)});
    m=new THREE.Mesh(geo,mat);
    var edge=new THREE.LineSegments(new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({color:0x4BE8FF, transparent:true, opacity:0.55}));
    m.add(edge);
  }else{
    var mat2=new THREE.MeshLambertMaterial({color:c,transparent:true});
    mat2.opacity = (o!==undefined)?o:1;
    m=new THREE.Mesh(geo,mat2);
  }
  return m;
}
/* 사람 뒤에 깔아주는 둥근 빛무리. 항상 카메라를 바라보는 스프라이트라
   건물을 어느 각도로 돌려도 같은 크기로 보인다. */
/* 배경이 깔린 알약 모양 글씨. 얇은 글씨만으로는 3D 안에서 잘 안 읽혀서 쓴다. */
function chipSprite(text, bg, fg, k, square){
  var px=44, cv=document.createElement('canvas'), x=cv.getContext('2d');
  x.font='bold '+px+'px Pretendard,"맑은 고딕",sans-serif';
  cv.width=Math.ceil(x.measureText(text).width+30); cv.height=px+24;
  x=cv.getContext('2d'); x.font='bold '+px+'px Pretendard,"맑은 고딕",sans-serif';
  /* square=true 면 계단·엘리베이터 라벨과 같은 네모칸로 그린다 */
  var w=cv.width, h=cv.height, r=square ? 10 : cv.height/2;
  x.fillStyle=bg; x.beginPath();
  x.moveTo(r,0); x.lineTo(w-r,0); x.arcTo(w,0,w,r,r);
  x.lineTo(w,h-r); x.arcTo(w,h,w-r,h,r);
  x.lineTo(r,h); x.arcTo(0,h,0,h-r,r);
  x.lineTo(0,r); x.arcTo(0,0,r,0,r);
  x.closePath(); x.fill();
  x.fillStyle=fg; x.textBaseline='middle'; x.textAlign='center';
  x.fillText(text, w/2, h/2+1);
  var t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter;
  var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,depthWrite:false,transparent:true}));
  sp.scale.set(cv.width*0.014, cv.height*0.014, 1);
  sp.scale.multiplyScalar(k||1.7);
  // depthTest는 꺼져 있어도 반투명끼리는 그리는 순서대로 덧칠되므로, 동선(빨간 튜브)의
  // 반투명 후광 레이어보다 나중에 그려지도록 renderOrder를 확실히 높여 항상 위에 보이게 한다.
  sp.renderOrder = 999;
  sp.userData.chipLabel = true;   // 이동경로 재생 중 카메라 근접 시 라벨 혼잡 완화용 태그
  return sp;
}
function glowSprite(size){
  var cv=document.createElement('canvas'); cv.width=cv.height=128;
  var x=cv.getContext('2d');
  var rg=x.createRadialGradient(64,64,0,64,64,64);
  // 글씨를 덮지 않도록 중심만 살짝 밝고 바깥은 빠르게 사라지게 (예전엔 넓고 진해서 라벨이 씻겼음)
  rg.addColorStop(0.00,'rgba(255,222,120,0.62)');
  rg.addColorStop(0.26,'rgba(255,198,75,0.24)');
  rg.addColorStop(0.55,'rgba(255,180,45,0.06)');
  rg.addColorStop(1.00,'rgba(255,170,30,0)');
  x.fillStyle=rg; x.fillRect(0,0,128,128);
  var sp=new THREE.Sprite(new THREE.SpriteMaterial({
    map:new THREE.CanvasTexture(cv), transparent:true,
    depthTest:false, depthWrite:false, blending:THREE.AdditiveBlending}));
  sp.scale.set(size,size,1);
  return sp;
}
function makePerson(){
  var g=new THREE.Group();
  // 발밑 쪽에 낮게 깔아야 위쪽 글씨(호실 번호 등)를 안 가린다
  var glow=glowSprite(2.5); glow.position.y=0.80; glow.name='glow'; g.add(glow);
  // 건물 전체가 옅은 회청색 계열이고 '현재 위치 층'은 흰색으로 칠해지므로,
  // 사람은 어느 층·색 조합에서도 항상 알아보게 고정된 금색(어디에도 안 쓰는 색)으로 둔다.
  var mat=new THREE.MeshLambertMaterial({color:0xFFD24A, emissive:0x8A6A18, transparent:true});
  var body=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.6,1.4,14),mat);
  body.position.y=0.70; g.add(body);
  var head=new THREE.Mesh(new THREE.SphereGeometry(0.42,16,14),mat);
  head.position.y=1.78; g.add(head);

  // 머리 위 역삼각 마커 — 어느 층에 있는지 멀리서도 바로 보이도록
  var pinMat=new THREE.MeshBasicMaterial({color:0xFFF3C4});   // 몸통(금색)과 구분되게 더 밝게
  var pin=new THREE.Mesh(new THREE.ConeGeometry(0.56,1.14,4),pinMat);
  pin.rotation.x=Math.PI;            // 아래를 가리키게
  // 예전엔 머리에서 한참 떨어져 떠 있어서(층 간격보다 높음) 사람과 따로 노는 것처럼 보였음 → 머리 바로 위로 내림
  pin.position.y=3.0; pin.name='pin';
  g.add(pin);

  // 발밑 원판 — 바닥에 서 있는 위치를 또렷하게
  var ring=new THREE.Mesh(new THREE.CircleGeometry(1.15,26),
            new THREE.MeshBasicMaterial({color:0xFFC85C,transparent:true,opacity:0.88}));
  ring.rotation.x=-Math.PI/2; ring.position.y=0.06; g.add(ring);

  // 반투명 벽·바닥에 가려 안 보이는 문제 방지 — 사람은 항상 건물 위에 그린다
  g.traverse(function(o){
    if(o.material){
      o.material.depthTest = false;
      o.material.depthWrite = false;
    }
    o.renderOrder = 999;
  });
  var gl=g.getObjectByName('glow'); if(gl) gl.renderOrder = 997;   // 빛무리는 사람 뒤쪽에
  return g;
}
var SP = FLOOR_H + 3.4;
function layout(){
  for(var i=0;i<floorGroups.length;i++) floorGroups[i].position.y=i*SP;
  camTarget.y = SP*(LEVELS.length-1)/2;
}
function floorY(f){ return lvIndex(f)*SP + SLAB + 0.8; }

/* 층 버튼을 누르면 층상세로 바로 넘어가지 않고, 건물 3D 카메라가 그 층 쪽으로
   입체적으로 '날아 들어가는' 짧은 연출(약 0.5초)을 먼저 재생한 뒤 화면을 전환한다.
   되돌아올 때(backFromS5)는 원래 보고 있던 각도·거리로 복귀시킨다. */
var flyBefore = null;
function flyIntoFloor(lv, cb){
  if(!camera){ cb && cb(); return; }
  spinPause();
  flyBefore = {theta:theta, phi:phi, radius:radius, cx:camTarget.x, cy:camTarget.y, cz:camTarget.z};
  var targetY = lvIndex(lv)*SP + FLOOR_H/2;
  var start = {theta:theta, phi:phi, radius:radius, cy:camTarget.y};
  var end   = {theta:theta+0.55, phi:Math.max(0.32,phi*0.55), radius:Math.max(24,radius*0.4), cy:targetY};
  var t0=null, DUR=480, done=false;
  function step(ts){
    if(t0===null) t0=ts;
    var k=Math.min(1,(ts-t0)/DUR), e=easeIO(k);
    theta = start.theta + (end.theta-start.theta)*e;
    phi   = start.phi   + (end.phi-start.phi)*e;
    radius= start.radius+ (end.radius-start.radius)*e;
    camTarget.y = start.cy + (end.cy-start.cy)*e;
    if(k<1){ requestAnimationFrame(step); }
    else if(!done){ done=true; cb && cb(); }
  }
  requestAnimationFrame(step);
}
function restoreFlyCamera(){
  if(!flyBefore) return;
  theta=flyBefore.theta; phi=flyBefore.phi; radius=flyBefore.radius;
  camTarget.set(flyBefore.cx, flyBefore.cy, flyBefore.cz);
  flyBefore=null;
  spinResume();
}
function backFromS5(){ restoreFlyCamera(); go(4); }

/* 건물 3D 전체 시점 버튼 : 자유 회전·이동(팬)·확대로 보다가 길을 잃었을 때,
   누르면 처음 이 화면을 열었을 때 보이던 기본 각도·중심·확대 상태로 그대로 되돌아간다. */
var INITIAL_VIEW = {theta:0.85, phi:1.05};
function cycleView3D(){
  if(!camera) return;
  var start = {theta:theta, phi:phi, cx:camTarget.x, cz:camTarget.z};
  var dt = INITIAL_VIEW.theta - start.theta;
  while(dt > Math.PI)  dt -= Math.PI*2;   // 최단 방향으로 돌아가도록 보정(반대로 크게 돌지 않게)
  while(dt < -Math.PI) dt += Math.PI*2;
  var end = {theta:start.theta+dt, phi:INITIAL_VIEW.phi, cx:0, cz:BUILDING_MID_Z*BUILDING_Z_STRETCH};
  var t0=null, DUR=520;
  function step(ts){
    if(t0===null) t0=ts;
    var k=Math.min(1,(ts-t0)/DUR), e=easeIO(k);
    theta = start.theta + (end.theta-start.theta)*e;
    phi   = start.phi   + (end.phi-start.phi)*e;
    camTarget.x = start.cx + (end.cx-start.cx)*e;
    camTarget.z = start.cz + (end.cz-start.cz)*e;
    if(k<1) requestAnimationFrame(step);
    else{ spin=true; spinBefore=true; resize3D(true); }   // 처음 켰을 때처럼 자동회전·기본 확대 상태로 완전히 복귀
  }
  requestAnimationFrame(step);
}

/* 빨간 경로 막대 (건물 전체 뷰) */
var routeA=null, routeCurve=null;
function buildRouteA(){
  if(typeof fpRouteFloor==='function') fpRouteFloor(false);   // 로드뷰용 바닥 유도선도 같이 정리
  if(routeA){ buildingRoot.remove(routeA); routeA=null; }
  routeCurve=null; routeSplit=0;
  if(!target) return;
  var p=targetPos(), f=target.floor;
  var ev = evXZ(f);
  /* v132 : 1층 + 출입문이 확정돼 있으면, 그 문에서 엘리베이터까지 걸어 들어오는
     구간을 동선 맨 앞에 하나 더 붙인다(문이 곧 엘리베이터 자리인 경우엔 startXZ가
     evXZ와 같은 값을 돌려주므로 아래 거리 필터에서 자동으로 걸러져 예전과 완전히 같아진다). */
  var sp0 = startXZ(startFloor);
  /* v135 : 문 → 엘리베이터를 직선 하나로 이으면 가운데 강의실들을 대각선으로
     뚫고 지나간다(동문·서문에서 특히 심했음). 실제로는 어느 문으로 들어와도
       ① 복도 중앙(x=0)으로 나온 다음
       ② 복도를 따라 엘리베이터 앞까지 곧장 걸어가고
       ③ 엘리베이터 앞에서 직각으로 꺾어 들어간다.
     동문·서문은 이미 복도 연장선(x=0)에 있으므로 ①이 필요 없고,
     정문·후문은 옆벽에 있으므로 ①을 한 번 거친다.                    */
  var atGate = (startFloor===1 || startFloor==='1') &&
               (Math.abs(sp0.x-ev.x) > 0.15 || Math.abs(sp0.z-ev.z) > 0.15);
  var yS = floorY(startFloor);
  /* 엘리베이터(coreX, evZ)와 계단(coreX, stZ)은 복도 같은 쪽에 Z축으로 나란히 붙어 있다.
     예전 동선은 엘베 앞에서 Z방향으로 z=0(엘베와 계단의 경계)까지 간 뒤에야 복도로 빠져나가서,
     내리자마자 계단 쪽으로 한 번 돌아 나오는 것처럼 보였다.
     실제로는 엘베 문에서 복도 쪽으로 곧장 직각으로 나온다. → 먼저 X방향으로 복도 중앙까지. */
  /* v149(요청 반영): 예전엔 목적지가 같은 층이어도 무조건 엘리베이터를 들렀다 →
     동문 바로 옆 비상계단인데 화살표가 엘리베이터까지 갔다가 되돌아왔다.
     층이 바뀔 때만 엘리베이터 구간을 넣는다(경로 미리보기 v146과 같은 규칙). */
  var needLift = Math.abs(floorY(startFloor) - floorY(f)) > 0.01;
  var raw=[];
  raw.push({v:new THREE.Vector3(sp0.x, yS, sp0.z), tag:'door'});          // 출발 지점(출입문, 없으면 엘리베이터)
  // ① 옆벽 문(정문·후문)만 : 문 앞에서 복도 중앙(x=0)까지 곧장
  if(atGate && Math.abs(sp0.x) > CORR_HALF)
    raw.push({v:new THREE.Vector3(0, yS, sp0.z), tag:'corrEnter'});
  if(needLift){
    // ② 복도를 따라 엘리베이터 앞 지점까지 일직선으로
    if(atGate) raw.push({v:new THREE.Vector3(0, yS, ev.z), tag:'corrWalk'});
    raw.push({v:new THREE.Vector3(ev.x, yS,        ev.z), tag:'evStart'}); // ③ 꺾어서 엘리베이터 앞
    raw.push({v:new THREE.Vector3(ev.x, floorY(f), ev.z), tag:'evDest'});  // 목적지 층 엘리베이터 앞
  }
  /* 엘리베이터에서 복도로 나오는 꺾임. 문에서 곧장 걸어가는 같은 층 경로에서는
     이미 복도 중앙에 서 있으므로 이 점이 필요 없다(넣으면 되돌아가는 선이 된다). */
  if(needLift || !atGate)
    raw.push({v:new THREE.Vector3(0,   floorY(f), ev.z), tag:'corrIn'});
  raw.push({v:new THREE.Vector3(0,     floorY(f), p.z),  tag:'corrAt'});  // 복도를 따라 목적지 앞까지
  raw.push({v:new THREE.Vector3(p.x,   floorY(f), p.z),  tag:'room'});    // 복도에서 방 안으로
  var pts=[], ptTags=[];
  raw.forEach(function(r){
    if(!pts.length || pts[pts.length-1].distanceTo(r.v)>0.15){ pts.push(r.v); ptTags.push(r.tag); }
  });
  if(pts.length<2) return;
  // 모서리를 둥글게(0.6) 하면 곡선이 방을 대각선으로 가로질러 실제 복도 동선과 어긋났음
  // → 장력 0 : 각 점 사이가 직선이 되어 복도를 따라 직각으로 꺾인다.
  var curve=new THREE.CatmullRomCurve3(pts,false,'catmullrom',0);
  routeCurve = curve;   // 사람이 이 동선을 그대로 따라 걷는다
  // 전체 동선 길이 중 첫 구간(엘리베이터 수직 이동)이 차지하는 비율 — 재생 속도를 구간별로 나누는 데 쓴다
  var cum=[0];
  for(var ci=1; ci<pts.length; ci++) cum.push(cum[ci-1] + pts[ci].distanceTo(pts[ci-1]));
  var totLen = cum[cum.length-1];
  var hasRide = needLift;
  /* v132 : 문이 끼어들어 점 개수가 5개(예전)/6개(문 포함)로 달라질 수 있으므로,
     '몇 번째 점'이 아니라 태그로 '엘리베이터 도착 지점(evDest)'을 찾아 그 누적거리를 쓴다. */
  var evDestIdx = ptTags.indexOf('evDest');
  routeSplit = (hasRide && totLen>0 && evDestIdx>=0) ? (cum[evDestIdx]/totLen) : 0;
  var g=new THREE.Group();
  var tubeR=0.42;
  var tubeGeo=new THREE.TubeGeometry(curve,400,tubeR,20,false);
  g.add(new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({color:0xE0553F})));
  addRouteArrows(g, curve, tubeR, 7);
  /* v133 : '문 → 엘리베이터' 첫 구간은 전체 동선 중 짧은 편이라, 길이 기준으로
     고르게 뿌리는 위 화살표가 대부분 긴 수직(엘리베이터) 구간에 몰려 버렸다.
     그 결과 사람 옆에 화살표가 어정쩡하게 하나 걸친 것처럼 보였다 →
     첫 구간에만 큼직한 화살표를 따로 얹어서 "여기서 저리로 간다"가 바로 읽히게 한다. */
  var evStartIdx = ptTags.indexOf('evStart');
  if(ptTags[0]==='door' && evStartIdx>0 && totLen>0){
    var uDoor = cum[evStartIdx]/totLen;               // 문 → 엘리베이터 구간이 끝나는 지점(0~1)
    if(uDoor > 0.02){
      [0.42, 0.80].forEach(function(k){
        var t = uDoor*k;
        var p2  = curve.getPointAt(t);
        var tan = curve.getTangentAt(t).normalize();
        var cone = new THREE.Mesh(
              new THREE.ConeGeometry(tubeR*2.0, tubeR*4.2, 18),
              new THREE.MeshBasicMaterial({color:0xFF7A5C,
                depthTest:false, depthWrite:false}));   // 사람·벽에 가려도 항상 보이게
        cone.position.copy(p2);
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), tan);
        cone.renderOrder = 1000;
        g.add(cone);
      });
    }
  }
  /* X-Ray : 경로가 다른 층 바닥·방에 가려지면 어디로 가는지 끊겨 보였음.
     같은 관을 한 겹 더 얹되 '항상 위에 흐리게' 그려서, 가려진 구간이 비쳐 보이게 한다. */
  var xr=new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({
        color:0xFF9075, transparent:true, opacity:0.34,
        depthTest:false, depthWrite:false}));
  xr.renderOrder = 5;
  xr.userData.routeXray = true;   // 1인칭 재생 중에는 이 겹레이어를 꺼서 벽 뒤 동선이 비쳐 보이지 않게 한다
  g.add(xr);
  routeA=g; buildingRoot.add(g);
}
/* 경로 화살표를 곡선 길이 기준으로 일정한 간격에 배치(모서리 부근 뭉침 방지) + 진행 방향에 맞춰 자연스럽게 회전 */
function addRouteArrows(g, curve, tubeR, spacing, arrowColor){
  var total = curve.getLength();
  var count = Math.max(2, Math.min(8, Math.round(total/spacing)));
  var up=new THREE.Vector3(0,1,0);
  for(var i=1;i<=count;i++){
    var t=i/(count+1);
    var p=curve.getPointAt(t);
    var tan=curve.getTangentAt(t).normalize();
    var cone=new THREE.Mesh(new THREE.ConeGeometry(tubeR*1.4, tubeR*3.1, 16),
          new THREE.MeshBasicMaterial({color:arrowColor||0xF2705A}));
    cone.position.copy(p);
    cone.quaternion.setFromUnitVectors(up, tan);
    g.add(cone);
  }
}
/* 건물 뷰에서 '가려는 곳'이 어디인지 3D 위에 직접 적어준다.
   호실이면 "13524 · PC실", 화장실/존이면 그 이름. 목적지가 바뀔 때마다 다시 만든다. */
var targetTag = null;
function updateTargetTag(){
  if(targetTag && targetTag.parent) targetTag.parent.remove(targetTag);
  targetTag = null;
  if(!target) return;
  var txt;
  if(target.kind==='toilet')      txt = lvName(target.floor)+((LANG==='ko')?' 화장실':' Restroom');
  else if(target.kind==='zone')   txt = (LANG==='ko')?'크리에이티브 존':'Creative Zone';
  else if(target.kind==='emstair') txt = lvName(target.floor)+((LANG==='ko')?' 비상계단':' Emergency Stairs');
  else {
    var nm = rn(ROOM_NAME[target.code]);
    txt = target.code + (nm ? (' · ' + nm) : ((LANG==='ko')?'호':''));
  }
  if(txt.length > 18) txt = txt.slice(0,17) + '…';   // 너무 길면 줄임
  var p = targetPos();
  if(!p) return;
  // 예전엔 배경 없는 흰 글씨라 밝은 방·바닥 위에서는 거의 안 보였음 → '출발' 표시처럼
  // 배경 깔린 알약(빨강 = 찾는 강의실·동선 색)으로 바꿔 항상 또렷하게 읽히게 한다.
  // 목적지 글씨가 잘 안 보인다는 의견이 있어 다른 칩(출발·문 이름 등)보다 눈에 띄게 더 크게 키움.
  var sp = chipSprite(txt, '#FF3B30', '#FFFFFF', 3.0);
  var maxW = ROOM_W*4.6;
  if(sp.scale.x > maxW){ var k = maxW/sp.scale.x; sp.scale.x*=k; sp.scale.y*=k; }
  sp.position.set(p.x, floorY(target.floor) + FLOOR_H*0.92, p.z);
  sp.scale.z = 1;
  // 벽 뒤에 가리지 않도록 항상 위에 그림
  if(sp.material){ sp.material.depthTest=false; sp.material.depthWrite=false; }
  // 예전엔 정문·후문 같은 문 이름표(renderOrder 999)보다 낮아서(998) 이동경로 재생 중
  // 카메라 각도에 따라 목적지 표시가 문 이름표에 가려지는 경우가 있었다 — 목적지는 길찾기의
  // 핵심 정보이므로 어떤 라벨보다도 위(1001)에 그려지도록 최우선 순위를 준다.
  sp.renderOrder = 1001;
  targetTag = sp;
  buildingRoot.add(sp);
}
/* 출발 지점(현재 위치 층 엘리베이터 앞)에 파란 고리와 '출발' 글씨를 놓는다.
   사람이 걸어가 버리고 나면 어디서 출발했는지 표시가 아무것도 없었음. */
var startRing=null, startTag=null;
function updateStartTag(){
  if(startRing && startRing.parent) startRing.parent.remove(startRing);
  if(startTag  && startTag.parent)  startTag.parent.remove(startTag);
  startRing=null; startTag=null;
  if(!target) return;
  var ev = startXZ(startFloor);   // v132 : 출입문이 확정돼 있으면 '출발' 고리도 문 앞에 놓는다
  /* 옅은 원판 + 또렷한 테두리 한 겹. 깜빡임 없이 가만히 있어도 눈에 들어오게. */
  var mk=new THREE.Group();
  mk.add(new THREE.Mesh(new THREE.CircleGeometry(2.3,36),
        new THREE.MeshBasicMaterial({color:0x2AA6E8, transparent:true, opacity:0.26,
          side:THREE.DoubleSide, depthTest:false, depthWrite:false})));
  var edge=new THREE.Mesh(new THREE.RingGeometry(2.12,2.5,40),
        new THREE.MeshBasicMaterial({color:0x7FDCFF, transparent:true, opacity:0.95,
          side:THREE.DoubleSide, depthTest:false, depthWrite:false}));
  edge.position.z = 0.01;
  mk.add(edge);
  mk.rotation.x = -Math.PI/2;
  mk.scale.set(1, 1/BUILDING_Z_STRETCH, 1);   // 부모(buildingRoot)의 Z 늘림을 상쇄해 정원으로
  mk.position.set(ev.x, personY(startFloor)+0.07, ev.z);
  mk.traverse(function(o){ o.renderOrder = 996; });
  buildingRoot.add(mk); startRing=mk;
  // 사람과 겹치지 않게 복도 쪽으로 살짝 비켜서 낮게 붙인다
  var offZ = (ev.z>0 ? -3.1 : 3.1);

  /* ── v137 : 출발 이름표 & 문 앞뒤 관계 ────────────────────────
     요청 : 사람 마커가 '○문' 글씨와 '문 모양' 둘 다의 뒤에 서 있어야 한다.
     사람은 건물에 가려 사라지면 안 되므로 depthTest를 끈 채로 두고(항상 그려짐),
     대신 '그리는 순서'로만 앞뒤를 만든다.
         사람(999)  <  출발 문짝(1001)  <  문 이름표(1002)
     출발 문이 아닌 나머지 문은 원래대로(0) 되돌려서, 멀리 있는 문이 엉뚱하게
     사람 위에 덧그려지는 일이 없게 한다.
     [v136 버그] LEVELS가 ['B1',1,2,...]라 floorGroups[0]은 지하1층이었다 —
     1층 문을 아예 못 찾고 있었으므로 전체 층을 훑는다. */
  var gKey  = currentGateKey();
  var gName = gKey ? GATE_KEY_TO_NAME[gKey] : null;
  var atGate = !!(gName && (startFloor===1 || startFloor==='1'));
  if(floorGroups && floorGroups.length){
    floorGroups.forEach(function(fg){
      fg.traverse(function(o){
        if(!o.userData) return;
        if(o.userData.gateName){                 // 문 이름표(스프라이트)
          o.visible = true;                      // 예전 버전에서 숨겨졌을 수 있으니 되살린다
          o.renderOrder = 1002;                  // 항상 맨 앞
          if(o.material){ o.material.depthTest=false; o.material.depthWrite=false; }
        }
        if(o.userData.gatePart){                 // 문짝·멀리언·채광창·테두리
          var isStartDoor = (atGate && o.userData.gatePart === gName);
          o.renderOrder = isStartDoor ? 1001 : 0;
          if(o.material){
            o.material.depthTest  = isStartDoor ? false : true;
            o.material.depthWrite = isStartDoor ? false : true;
          }
        }
      });
    });
  }

  var sp = chipSprite('출발', '#0E6FB4', '#F4FBFF', 1.35);   // 배경 깔린 알약 — 얇은 글씨보다 훨씬 잘 읽힘
  sp.position.set(ev.x, floorY(startFloor)+1.15, ev.z+offZ);
  sp.scale.z = 1;
  if(sp.material){ sp.material.depthTest=false; sp.material.depthWrite=false; }
  sp.renderOrder = 998;
  buildingRoot.add(sp); startTag=sp;
}
function highlight3D(){
  layout();
  buildRouteA();
  updateTargetTag();
  updateStartTag();
  pulseTargets.length=0;
  pulseFloorTargets.length=0;
  floorGroups.forEach(function(g,i){
    var lv=LEVELS[i];
    var isTgtFloor = target && lv===target.floor;
    var isFirst = (lv===startFloor);   // 현재 위치 층을 흰색으로 (1층 고정 → 선택한 층)
    g.traverse(function(o){
      if(!o.material) return;
      // 층 번호 라벨 : 모든 층에서 읽히되, 가야 할 층/현재 층을 더 또렷하게
      if(o.userData && o.userData.floorTag){
        o.visible = true;
        o.material.opacity = isTgtFloor ? 1 : (isFirst ? 0.85 : 0.32);
        // 층 번호 글자 색으로도 "목적지 층 / 현재 위치 층"이 한눈에 구분되게(노랑=가야 할 층, 흰색=현재 층)
        o.material.color.setHex(isTgtFloor ? 0xFFD400 : 0xFFFFFF);
        return;
      }
      /* 글씨(EV·계단 등)는 이제 모든 층에서 항상 보이게 한다(요청 반영) — 어느 층에서든
         엘리베이터·중앙계단 위치를 바로 알 수 있어야 하니까. 다만 비상계단 말풍선은
         층마다 하나씩 다 켜면 화면이 너무 복잡해지므로 예전처럼 출발층·목적지층에서만,
         출입문 이름도 마찬가지(다른 층엔 출입문 자체가 없음), 화장실 이름은 목적지일 때만. */
      if(o.isSprite){
        var ud = o.userData || {};
        var keep = (ud.evst==='ev' || ud.evst==='st')
           || ((isTgtFloor || isFirst) && (ud.door || ud.evst==='emstair'))
           || (isTgtFloor && ud.wcLabel && target && target.kind==='toilet');
        o.visible = !!keep;
        if(!keep) return;
      }
      // 화장실 글자 : 색을 덧칠하지 않고 밝기만 조절
      if(o.userData && o.userData.wcLabel){
        o.material.opacity = (isTgtFloor||isFirst) ? 1 : 0.75;   // 다른 층에서도 읽히게
        return;
      }
      // 화장실 : 층마다 어디인지 항상 보여야 하므로 호실과 따로 처리(엘베·계단과 같은 기준)
      if(o.userData && o.userData.toilet){
        var tIsT = isTargetMesh(o);
        if(tIsT){ setMatColor(o,0xE0553F); o.material.opacity=0.97; pulseTargets.push(o); }
        else{
          o.material.color.setHex(0x5FA8D3);                    // 화장실은 항상 파란색
          o.material.opacity = (isTgtFloor||isFirst) ? 0.95 : 0.6;
        }
        return;
      }
      // 비상계단(상자 본체만, 말풍선 라벨은 제외) : 비상계단이 목적지일 때만 화장실·강의실과
      // 같은 목표색으로 강조하고, 그 외에는 항상 옅은 빨강을 유지한다.
      if(o.userData && o.userData.evst==='emstair' && !o.isSprite){
        var esIsT = target && target.kind==='emstair' && target.floor===o.userData.floor;
        if(esIsT){ setMatColor(o,0xE0553F); o.material.opacity=0.97; pulseTargets.push(o); }
        else{
          o.material.color.setHex(0xFF8983);
          o.material.opacity = (isTgtFloor||isFirst) ? 0.95 : 0.6;
        }
        return;
      }
      var isRoom = o.userData && (o.userData.code!==undefined || o.userData.zone);
      if(isRoom){
        var isT = isTargetMesh(o);
        if(isT){                       // 목표 지점 : 빨강(은은하게 숨쉬듯 빛남 — animate()에서 처리)
          setMatColor(o,0xE0553F); o.material.opacity=0.97;
          pulseTargets.push(o);
        }else if(isTgtFloor){          // 가야 할 층 : 노란색으로, 살짝 반짝이게(animate()에서 처리)
          setMatColor(o,0xF2C05A); o.material.opacity=0.55;
          pulseFloorTargets.push(o);
        }else if(isFirst){             // 현재 위치 층 : 흰색(가야 할 층의 노란색과 바로 구분되게)
          setMatColor(o,0xFFFFFF); o.material.opacity=0.5;
        }else{                         // 나머지 층 : 완전히 투명하면 건물이 뻥 뚫린 것처럼 보여서
                                        // 가독성이 떨어지므로, 구조가 은은하게라도 보이게 올림
          o.material.color.setHex(o.userData.zone?0x8E7CC3:0x9FB4CC); o.material.opacity=0.05;
        }
      }else{
        if(o.userData && (o.userData.evst || o.userData.door)){
          // 엘리베이터·계단·출입문은 어느 층이든 잘 보이게(동선 이해의 기준점)
          o.material.opacity = (isTgtFloor||isFirst) ? 1 : 0.55;
        }else{
          o.material.opacity = (isTgtFloor||isFirst) ? 1 : 0.07;
        }
      }
    });
  });
}
function fitRadius(cam, halfW, halfH){
  var vf = cam.fov*Math.PI/180;
  var hf = 2*Math.atan(Math.tan(vf/2)*cam.aspect);
  return Math.max(halfW/Math.tan(hf/2), halfH/Math.tan(vf/2))*1.0;
}
function resize3D(resetZoom){
  var cv=document.getElementById('c3d');
  var w=cv.clientWidth||330, h=cv.clientHeight||330;
  renderer.setSize(w,h,false);
  // 거리 계산은 항상 기본 시야각 기준으로 한다. (재생 중 넓혀 둔 시야각이 남아 있으면
  //  전체화면 전환·기기 회전 때 거리가 엉뚱하게 잡힌다) — 계산 뒤 원래 값으로 되돌려서
  //  재생 도중 전체화면을 켜고 꺼도 시야각이 뚝 끊기지 않게 한다.
  var _keepFov = camera.fov;
  camera.fov=BASE_FOV;
  camera.aspect=w/h; camera.updateProjectionMatrix();
  // 건물이 회전(theta)하며 보이므로 가로/세로를 고정 배정한 fitRadius로는
  // 긴 축(Z, 복도 방향)이 카메라 쪽을 향할 때 화면 밖으로 잘려나갈 수 있음.
  // theta 회전과 무관하게 항상 다 보이도록, 수평(X·Z) 대각선을 반지름으로 하는
  // "감싸는 원기둥" 기준으로 거리를 계산 (구 전체를 쓰는 것보다 덜 과하게 줌아웃됨).
  // hz는 buildingRoot의 Z 늘림(BUILDING_Z_STRETCH)까지 반영한 "실제 화면에 보이는" 절반 길이로 계산.
  var hx=GLOBAL_HALF_X+2, hy=SP*(LEVELS.length-1)/2+FLOOR_H, hz=((GLOBAL_TOP_Z-GLOBAL_BOT_Z)/2)*BUILDING_Z_STRETCH+3;
  var rXZ=Math.sqrt(hx*hx+hz*hz);
  // 세로로 긴 화면(특히 전체화면)에서는 "가로로 다 보이게" 기준만 쓰면 세로쪽에 여백이
  // 많이 남는다(가로 폭 대비 세로가 훨씬 긴데, 가로 기준 거리는 그 여유를 못 씀).
  // 화면 비율이 좁아질수록(세로로 길어질수록) 추가로 더 확대해 여백을 줄인다.
  // fitRadius 자체가 가로세로비가 좁아질수록(세로로 길수록) 값이 커지는데(가로 시야각이
  // 좁아지는 만큼 더 멀리 물러나야 다 보이므로), 정작 세로 공간은 넉넉히 남는다.
  // 그래서 비율이 좁을수록 zoomFactor를 더 크게 낮춰서(더 확대) 그 늘어난 만큼을 상쇄한다.
  var aspect = w/h, zoomFactor = 0.78;
  if(aspect < 0.9){
    var t = Math.min(1, (0.9-aspect)/0.5);   // aspect 0.4 이하에서 최대 보정
    zoomFactor = 0.78 - t*0.40;              // 0.78(일반 박스) → 최소 0.38(세로로 아주 긴 전체화면)
  }
  var newAuto = fitRadius(camera, rXZ, hy) * zoomFactor;
  // 전체화면을 켜고 끄거나 기기를 돌릴 때마다 사용자가 손으로 맞춰 둔 확대 배율이
  // 통째로 초기화되던 문제 → 자동 기준거리 대비 '비율'로 기억했다가 그대로 되살린다.
  var keep = (!resetZoom && autoRadius > 0) ? (radius/autoRadius) : 1;
  if(!(keep > 0.25 && keep < 3)) keep = 1;
  autoRadius = newAuto;
  radius = Math.max(35, Math.min(260, newAuto*keep));
  camera.fov = _keepFov; camera.updateProjectionMatrix();
}
/* v51 : 이 루프는 s4(목적지 3D)가 보일 때만 돈다. 예전에는 앱을 켜는 순간부터 어느 화면에 있든
   매 프레임 건물 전체(드로우콜 600~700)를 그려서 첫 화면·목록·건의함까지 전부 버벅였다.
   다른 화면에서는 다음 프레임을 예약하지 않고 빠져나가고(animateRunning=false),
   go('s4')가 animateStart()로 다시 켠다. (s5의 animateB와 같은 방식) */
var animateRunning = false;
var A3D_MOBILE = ('ontouchstart' in window) || navigator.maxTouchPoints>0 || /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);
var A3D_LAST = 0, A3D_SKIP = false;
function animateStart(){ if(!animateRunning){ animateRunning = true; animate(); } }
function animate(){
  if(!animateRunning) return;
  requestAnimationFrame(animate);
  /* 폰에서는 초당 30장으로 제한 — 상태 갱신(사람 이동·회전·반짝임)은 매 프레임 하고 그리기만 거른다.
     (사람 이동은 시간 기준(dt)이라 그리기를 걸러도 속도는 그대로) */
  if(A3D_MOBILE){
    var _now = performance.now();
    if(_now - A3D_LAST < 26){ A3D_SKIP = true; } else { A3D_SKIP = false; A3D_LAST = _now; }
  }
  if(fpHoloGrid) fpHoloGrid.visible = !fpActive;   // 요청 반영: 걷기 모드에서는 홀로그램 격자를 끈다
  if(spin) theta+=0.003;
  updatePerson();
  // 목적지 상자를 숨쉬듯 은은하게 반짝이게 — 멀리서도 "저기다!" 하고 시선이 가도록 하는
  // 가벼운 beacon 효과(지오메트리·재질은 그대로 두고 emissiveIntensity만 흔든다).
  if(pulseTargets.length){
    var glow = 0.5 + Math.sin(performance.now()*0.0028)*0.32;
    for(var pgi=0; pgi<pulseTargets.length; pgi++){
      var pgm = pulseTargets[pgi].material;
      if(pgm && pgm.emissiveIntensity!==undefined) pgm.emissiveIntensity = glow;
    }
  }
  // 가야 할 층 전체를 노란색으로 반짝이게 — "이 층으로 가야 해요"가 멀리서도 눈에 띄도록.
  if(pulseFloorTargets.length){
    var fglow = 0.34 + Math.sin(performance.now()*0.004)*0.26;
    for(var ffi=0; ffi<pulseFloorTargets.length; ffi++){
      var ffm = pulseFloorTargets[ffi].material;
      if(ffm && ffm.emissiveIntensity!==undefined) ffm.emissiveIntensity = fglow;
    }
  }
  /* 이동 재생 중(엘리베이터+복도 이동 전체) : 카메라가 사람 뒤쪽·위쪽에서 사람을 그대로 따라가는
     3인칭 시점으로 전환된다. 재생이 끝나면 원래 보고 있던 각도·거리로 자연스럽게 되돌아온다. */
  // 블렌드를 프레임 수가 아니라 '초' 기준으로 진행시킨다(느린 기기에서 더 급하게 꺾이던 문제).
  var _fnow = (typeof performance!=='undefined' ? performance.now() : Date.now());
  // 탭이 백그라운드로 갔다 오거나 시계가 되감기면 간격이 음수·거대값이 될 수 있어
  // 0~0.1초로 묶는다(예전엔 이때 전환 진행도가 음수가 되어 카메라가 튀었다).
  var frameDt = _frameLast ? Math.max(0, Math.min((_fnow-_frameLast)/1000, 0.1)) : 0.016;
  _frameLast = _fnow;
  fpTick(frameDt);              // 1인칭 로드뷰 진행(재생 중이 아니면 아무것도 하지 않음)
  fpUpdateAutoDoors(frameDt);   // 걸어서 다가가면 문이 자동으로 열리는 효과
  if(inRideView){
    if(!rideSaved) rideSaved={theta:theta,phi:phi,radius:radius};
    rideBlend = Math.max(0, Math.min(1, rideBlend + frameDt*1.05));   // 약 0.95초에 걸쳐 전환
  }else if(rideSaved){
    rideBlend = Math.max(0, Math.min(1, rideBlend - frameDt*1.05));
    // 원래 시점으로 완전히 돌아온 뒤에 엘리베이터 캡을 치운다(중간에 사라지면 툭 끊겨 보임)
    if(rideBlend<=0){ rideSaved=null; resetChaseCam(); fpLastEye=null;
                      if(fpCab) fpCab.visible=false; if(fpCeil) fpCeil.visible=false;
                      if(fpCorrG) fpCorrG.visible=false; }
  }
  /* 복도 천장은 건물 밖에서 안으로 들어오는 전환 구간에는 방해만 되므로,
     시점이 거의 다 들어왔을 때(rideBlend 0.55~1)만 서서히 나타나게 한다. */
  if(fpCeil){
    var ceilK = Math.max(0, Math.min(1, (rideBlend-0.55)/0.45));
    /* 옥상은 바깥이라 복도 천장을 덮으면 하늘이 가려 까맣게 보인다 */
    /* 요청 반영(버그 수정): 이 공용 천장(fpCeil)은 어두운 남색 판이고 높이가
       바닥+FP_CEIL_H(=3.3)인데, B1 크리에이티브 존은 자체 천장이 3.05에 따로
       있다 — 존 안에서는 이 검은 판이 존 천장 바로 위 0.25m에 겹쳐 있어서
       카메라 각도에 따라 검게 비쳤다 사라졌다 하며 깜빡였다("천장이 검해졌다가
       안그랬다가"의 원인). 존 안(z가 존 시작점을 넘은 B1)에서는 숨긴다. */
    var inB1Zone = (fpFloorNow==='B1' && typeof FP_B1_ZTOP!=='undefined'
                    && fpPos && fpPos.z > FP_B1_ZTOP);
    /* 요청 반영(버그 수정): 이 공용 천장판은 건물 전체(24 x 105m)를 덮는 짙은
       남색 판이라, 1층 정문 앞 광장처럼 '건물 바깥'에 서서 위를 올려다보면
       하늘 대신 이 판의 밑면이 거대한 검은 띠로 가로질러 보였다 — 건물
       바깥에 있을 때는 감춘다(현관 안쪽은 현관 자체 천장이 대신 막아 준다). */
    var outsideBld = (typeof GLOBAL_HALF_X!=='undefined' && fpPos
                      && Math.abs(fpPos.x) > GLOBAL_HALF_X-0.2);
    fpCeil.visible = (ceilK > 0.01) && buildingRoot.visible && !!fpLastEye
                     && fpFloorNow!=='R' && !inB1Zone && !outsideBld;
    for(var cci=0; cci<fpCeil.children.length; cci++){
      var cm=fpCeil.children[cci];
      cm.material.opacity = (cm.userData.baseOp||1)*ceilK;
    }
  }
  /* 복도 벽·문·명찰도 천장과 같은 타이밍으로 서서히 나타났다 사라진다.
     목적지 문 주변만 은은하게 맥동시켜 멀리서도 어느 문인지 바로 보이게 한다. */
  if(fpCorrG){
    var corrK = Math.max(0, Math.min(1, (rideBlend-0.55)/0.45));
    fpCorrG.visible = (corrK > 0.01) && buildingRoot.visible && !!fpLastEye;
    /* 요청 반영(버그 수정): 재생(경로 미리보기)은 '출발 층 + 목적지 층' 두 층을
       한꺼번에 지어 둔다 — 그래서 1층 정문 앞처럼 건물 밖에 서서 위를 올려다보면,
       26m 위에 있는 목적지 층(5층) 복도 바닥·천장·벽 조각들이 새까만 허공에
       둥둥 떠 있는 것처럼 보였다. 카메라 높이에서 한 층 이상 떨어진 층 그룹은
       감춘다(계단으로 한 층 오르내리는 6.6m 구간은 여유 안에 들어오므로,
       중간에 층이 깜빡 사라지는 일은 없다). */
    if(fpCorrG.visible && fpLastEye && fpCorrG.children.length>1){
      for(var cgi=0; cgi<fpCorrG.children.length; cgi++){
        var _cg=fpCorrG.children[cgi];
        if(_cg.userData.fpSlabY===undefined) continue;
        var _dy=fpLastEye.y - _cg.userData.fpSlabY;
        _cg.visible = (_dy > -8.0 && _dy < 9.0);
      }
    }
    for(var hsi=0; hsi<fpHiddenSt.length; hsi++) fpHiddenSt[hsi].visible = !fpCorrG.visible;
    if(fpCorrG.visible){
      for(var cmi=0; cmi<fpCorrMats.length; cmi++)
        fpCorrMats[cmi].m.opacity = fpCorrMats[cmi].op*corrK;
      var tgPulse = 0.55 + Math.sin(_fnow*0.005)*0.45;
      for(var tgi=0; tgi<fpTgtGlow.length; tgi++)
        fpTgtGlow[tgi].material.opacity = 0.26*corrK*tgPulse;
    }
  }
  // 기본(자유 회전) 카메라 위치 — camTarget을 중심으로 도는 기존 궤도 시점
  var ox=camTarget.x+radius*Math.sin(phi)*Math.cos(theta);
  var oy=camTarget.y+radius*Math.cos(phi);
  var oz=camTarget.z+radius*Math.sin(phi)*Math.sin(theta);
  var x=ox, y=oy, z=oz, lookX=camTarget.x, lookY=camTarget.y, lookZ=camTarget.z;
  if(rideSaved && fpLastEye){
    // 선형(k)으로 갈아타면 전환 중간에 각도가 가장 빠르게 변해 툭 끊겨 보인다
    // → 시작·끝이 완만한 곡선(smoothstep)으로 바꿔 자연스럽게 넘어가게 한다.
    var k=rideBlend; k = k*k*(3-2*k);
    /* 1인칭 로드뷰가 계산해 둔 '내 눈 위치'와 '내가 보는 지점'을 그대로 카메라 목표로 쓴다.
       (예전 3인칭 추적 카메라처럼 뒤에서 따라올 필요가 없으므로 지수 감쇠 추적도 하지 않는다 —
        여기서 한 프레임이라도 뒤처지면 걸을 때 화면이 미끄러지듯 밀려 보인다.) */
    var pWx=fpLastEye.x, pWy=fpLastEye.y, pWz=fpLastEye.z;
    chaseEye={x:fpLastEye.x, y:fpLastEye.y, z:fpLastEye.z};
    chaseAim={x:fpLastAim.x, y:fpLastAim.y, z:fpLastAim.z};
    var cx=chaseEye.x, cy=chaseEye.y, cz=chaseEye.z;
    var lx=chaseAim.x, ly=chaseAim.y, lz=chaseAim.z;
    /* 예전에는 카메라 좌표를 직선으로 보간했다. 그런데 궤도 시점은 건물에서 120유닛
       떨어져 있고 추적 시점은 사람 바로 뒤 34유닛이라, 직선으로 이으면 전환 중간에
       건물을 뚫고 지나가듯 각도가 순간적으로 초당 1300도까지 치솟아 화면이 깨져 보였다.
       → 추적 시점도 '시선 지점(chaseAim)을 도는 궤도'로 환산한 뒤, 중심·거리·좌우각·
       상하각을 각각 보간한다. 카메라가 호를 그리며 부드럽게 돌아 들어온다. */
    var dEx=cx-lx, dEy=cy-ly, dEz=cz-lz;
    var rC=Math.sqrt(dEx*dEx+dEy*dEy+dEz*dEz) || 1;
    var phiC=Math.acos(Math.max(-1,Math.min(1,dEy/rC)));
    var thC=Math.atan2(dEz,dEx);
    var dTh=Math.atan2(Math.sin(thC-theta), Math.cos(thC-theta));   // 항상 가까운 쪽으로 돌기
    var bTh=theta + dTh*k;
    var bPhi=phi + (phiC-phi)*k;
    var bR=radius*Math.pow(rC/radius, k);                            // 거리는 배율로 보간
    lookX = camTarget.x + (lx-camTarget.x)*k;
    lookY = camTarget.y + (ly-camTarget.y)*k;
    lookZ = camTarget.z + (lz-camTarget.z)*k;
    x = lookX + bR*Math.sin(bPhi)*Math.cos(bTh);
    y = lookY + bR*Math.cos(bPhi);
    z = lookZ + bR*Math.sin(bPhi)*Math.sin(bTh);
  }
  // 세로로 길쭉한 전체화면(가로 시야각 22도 남짓)에서는 코너를 돌 때 화면 전체가
  // 휙 쓸려 지나가 깨져 보인다 → 재생 중에만 시야각을 넓혀 가로로도 충분히 담기게 한다.
  var wantFov = BASE_FOV;
  /* 실사형 개선(3차) : 평소(재생 중이 아닌) 1인칭 걷기의 기본 화각이 BASE_FOV(45,
     세로 화면 기준 가로 시야각 22도 남짓)라 망원렌즈처럼 답답해 보였다(요청 반영:
     보행자 시야에 맞춘 55~60도 대). 옥상·재생 중 화면에서 이미 어안 왜곡 없이
     검증해 둔 범위(58~68도)와 같은 대로 맞춘다. 건물 전체보기(오버뷰) 화면은
     fpActive가 false라 전혀 영향받지 않는다. */
  if(fpActive) wantFov = 58;
  /* 옥상 옥탑방 안(철문 앞)에서는 계단·복층이 한눈에 안 담기던 문제 —
     처음엔 요청대로 75도까지 올려봤지만, 세로 화면(휴대폰 세로모드)에서
     3D 카메라의 fov는 세로 기준이라 75도는 심하게 어안렌즈처럼 왜곡돼
     오히려 더 보기 나빠졌다(렌더로 직접 비교 확인). 55~58도 구간이
     왜곡 없이 공간감만 넓어져 58도로 맞춘다. */
  if(fpFloorNow==='R') wantFov = 68;   // 요청 반영: 답답하지 않은 원근감(58~63도보다 살짝 더 넓게, 어안 왜곡 없는 상한선 안쪽)
  if(rideBlend > 0){
    // 1인칭은 사람 눈처럼 넓게 봐야 복도·엘리베이터 안이 답답해 보이지 않는다.
    // 세로로 긴 화면일수록 가로 시야각이 좁아지므로, 가로 기준으로 잡고 세로를 역산한다.
    var vNeed = 2*Math.atan(Math.tan(RIDE_MIN_HFOV/2)/camera.aspect)*180/Math.PI;
    var kf = rideBlend*rideBlend*(3-2*rideBlend);
    wantFov = BASE_FOV + (Math.min(94, Math.max(58, vNeed)) - BASE_FOV)*kf;
  }
  /* 자유 탐색 확대/축소 : ＋/－ 버튼으로 조절한 배율만큼 시야각을 좁히거나 넓힌다 */
  if(fpActive && fpFree && fpZoom!==1) wantFov = Math.max(20, Math.min(100, wantFov/fpZoom));
  if(Math.abs(camera.fov-wantFov) > 0.02){
    camera.fov += (wantFov-camera.fov)*Math.min(1, frameDt*5);   // 뚝 끊기지 않게 서서히
    camera.updateProjectionMatrix();
  }
  // 사용자가 건물을 위에서 내려다보게 기울여 둔 상태(phi 최소 0.15)로 재생을 시작하면,
  // 전환 도중 시선이 거의 수직이 되어 lookAt의 up(0,1,0)과 나란해진다 → 화면이 홱 돌거나
  // 뒤집혀 보이는 짐벌락. 시선이 수직에 가까워질수록 up을 수평으로 눕혀 미리 피한다.
  var vdx=lookX-x, vdy=lookY-y, vdz=lookZ-z;
  var vHor=Math.sqrt(vdx*vdx+vdz*vdz), vLen=Math.sqrt(vHor*vHor+vdy*vdy);
  if(vLen > 1e-6){
    var upMix = Math.min(1, (vHor/vLen)/0.35);   // 0 = 완전 수직, 1 = 충분히 기울어짐
    if(upMix < 1){
      var hx = (vHor>1e-6) ? vdx/vHor : Math.cos(theta);
      var hz = (vHor>1e-6) ? vdz/vHor : Math.sin(theta);
      var sgn = (vdy > 0) ? -1 : 1;              // 올려다볼 때/내려다볼 때 위아래가 뒤집히지 않게
      camera.up.set(hx*sgn*(1-upMix), upMix, hz*sgn*(1-upMix)).normalize();
    }else{
      camera.up.set(0,1,0);
    }
  }
  camera.position.set(x,y,z); camera.lookAt(lookX,lookY,lookZ);
  // 1인칭으로 걸어가는 동안에는 눈앞에 라벨(정문·EV·계단 이름표)이 코앞까지 다가와
  // 화면을 가려버린다 — 내 위치에서 가까운 라벨만 옅게 만들어 시야를 틔워 준다.
  if((inRideView || rideSaved) && fpLastEye){
    if(!rideTmpVec3) rideTmpVec3 = new THREE.Vector3();
    var active = !!inRideView;
    var fx = (typeof pWx==='number') ? pWx : x;
    var fy = (typeof pWy==='number') ? pWy : y;
    var fz = (typeof pWz==='number') ? pWz : z;
    buildingRoot.traverse(function(obj){
      if(!obj.isSprite || !obj.material) return;
      var ud = obj.userData;
      /* 예전엔 chipLabel/floorTag 표시가 붙은 이름표만 다뤘는데, 방 이름('화장실' 등)
         큰 글씨는 벽을 뚫고 복도 한가운데에 떠 보였다 → 3D 이름표 전부를 대상으로 한다. */
      if(!ud) return;
      if(ud._fpOp===undefined){                      // 재생 전 상태를 기억해 뒀다가 끝나면 되돌림
        ud._fpOp = obj.material.opacity;
        ud._fpDT = obj.material.depthTest;
      }
      // 재생 중에는 깊이 검사를 켜서, 벽·엘리베이터 뒤에 있는 이름표는 가려지게 한다
      obj.material.depthTest = (active && obj!==targetTag) ? true : ud._fpDT;
      if(!active){
        obj.material.opacity = ud._fpOp; delete ud._fpOp; delete ud._fpDT;
        if(ud._fpSc){ obj.scale.set(ud._fpSc.x, ud._fpSc.y, 1); delete ud._fpSc; }
        return;
      }
      // 층 번호('5F' 등)는 건물을 밖에서 볼 때 쓰는 표시라, 라벨이 벽을 뚫고 화면을 덮어 버린다
      /* 정문·EV·계단 이름표는 이제 복도 벽에 실제 표지판·명찰로 붙어 있다
         → 로드뷰 중에는 공중에 뜬 말풍선을 감춰 복도를 깔끔하게 유지한다. */
      if(ud.floorTag || (fpCorrG && fpCorrG.visible)){ obj.material.opacity = 0; return; }
      var wp = obj.getWorldPosition(rideTmpVec3);
      var dx=wp.x-fx, dy=wp.y-fy, dz=wp.z-fz;
      var dist = Math.sqrt(dx*dx+dy*dy+dz*dz);
      // 코앞의 이름표는 화면을 가리므로 가까울수록 사라지게 (목적지 표시는 조금 더 오래 남긴다)
      var near = (obj===targetTag) ? 4.5 : 6, span = (obj===targetTag) ? 7 : 12;
      obj.material.opacity = ud._fpOp * Math.max(0, Math.min(1, (dist-near)/span));
      // 목적지 이름표는 멀리서도 읽히도록 아주 크게 만들어 둔 것 — 코앞에서 보는
      // 1인칭에서는 화면을 통째로 덮어 버리므로 재생 중에만 줄여 둔다.
      if(obj===targetTag){
        if(ud._fpSc===undefined) ud._fpSc={x:obj.scale.x, y:obj.scale.y};
        obj.scale.set(ud._fpSc.x*0.26, ud._fpSc.y*0.26, 1);
      }
    });
  }
  if(!A3D_SKIP){ if(PERF_ON) perfRender(); else renderer.render(scene,camera); }
}
/* 건물 전체 뷰에서 보고 싶은 곳으로 카메라 중심(camTarget) 자체를 옮기는 '이동(팬)'.
   지금까지는 camTarget이 건물 가운데에 고정된 채 회전·거리(줌)만 바꿀 수 있어서,
   확대해서 보고 싶은 구석·끝쪽으로는 아무리 줌을 해도 다가갈 수 없었다.
   → 카메라가 실제로 보고 있는 방향 기준의 '오른쪽·위쪽' 벡터를 구해서, 그 방향으로
   camTarget을 옮기면 회전 각도와 무관하게 항상 화면에 보이는 대로 자연스럽게 이동한다. */
function panCamera3D(dx, dy){
  var ox=camTarget.x+radius*Math.sin(phi)*Math.cos(theta);
  var oy=camTarget.y+radius*Math.cos(phi);
  var oz=camTarget.z+radius*Math.sin(phi)*Math.sin(theta);
  var fwd=new THREE.Vector3(camTarget.x-ox, camTarget.y-oy, camTarget.z-oz).normalize();
  var right=new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0));
  if(right.lengthSq()<1e-6) right.set(1,0,0); else right.normalize();
  var camUp=new THREE.Vector3().crossVectors(right, fwd).normalize();
  var panScale = radius*0.0022;   // 멀리서 볼 때는 크게, 가까이 확대했을 때는 조금씩 움직이도록 거리에 비례
  camTarget.x += (-dx*right.x + dy*camUp.x)*panScale;
  camTarget.y += (-dx*right.y + dy*camUp.y)*panScale;
  camTarget.z += (-dx*right.z + dy*camUp.z)*panScale;
}
(function bind3D(){
  var cv=document.getElementById('c3d');
  cv.addEventListener('contextmenu',function(e){ e.preventDefault(); });   // 오른쪽 드래그를 이동(팬)으로 쓰기 위해 메뉴를 막음
  var panMode=false;
  /* 자유 탐색 : 화면을 '살짝 눌렀다 뗀' 경우만 이동으로 본다.
     10px 이상 끌었거나 0.35초 넘게 누르고 있었으면 둘러보기로 친다. */
  var tapT=0, tapX=0, tapY=0, tapMove=0;
  function tapStart(x,y){ tapT=Date.now(); tapX=x; tapY=y; tapMove=0; }
  function tapMoved(x,y){ tapMove=Math.max(tapMove, Math.abs(x-tapX)+Math.abs(y-tapY)); }
  function tapEnd(x,y){
    if(!fpFree) return;
    if(tapMove<10 && (Date.now()-tapT)<350) fpFreePick(x,y);
  }
  cv.addEventListener('mousedown',function(e){
    drag=true; lx=e.clientX; ly=e.clientY; tapStart(e.clientX,e.clientY);
    if(!fpActive){ spin=false; spinBefore=false; }   // 재생 중엔 자동회전 상태를 건드리지 않는다
    panMode = (e.button===2 || e.shiftKey);   // 오른쪽 버튼(또는 Shift+드래그) = 이동, 왼쪽 버튼 = 회전(기존과 동일)
  });
  window.addEventListener('mouseup',function(e){
    if(drag) tapEnd(e.clientX, e.clientY);
    drag=false;
  });
  window.addEventListener('mousemove',function(e){
    if(!drag) return;
    tapMoved(e.clientX, e.clientY);
    var dx=e.clientX-lx, dy=e.clientY-ly;
    lx=e.clientX; ly=e.clientY;
    if(fpActive){ fpLook(dx,dy); }             // 재생 중 : 로드뷰처럼 제자리에서 고개만 돌림
    else if(panMode){ panCamera3D(dx,dy); }
    else{
      theta+=dx*0.006; phi-=dy*0.006;
      phi=Math.max(0.15,Math.min(Math.PI-0.15,phi));
    }
  });
  cv.addEventListener('wheel',function(e){e.preventDefault();
    if(fpActive){ fpZoom=Math.max(0.6, Math.min(2.4, fpZoom*(e.deltaY>0?0.9:1.1))); return; }
    radius*=(e.deltaY>0?1.1:0.9); radius=Math.max(35,Math.min(260,radius));},{passive:false});
  /* 폰에는 마우스 휠이 없어 지금까지 건물 뷰를 확대할 방법이 아예 없었음
     → 층 상세(5번) 화면과 똑같이 두 손가락 확대/축소를 넣는다.
     두 손가락 드래그는 확대/축소와 동시에 이동(팬)도 함께 되도록(두 손가락의 중점 이동 = 이동량). */
  var pinch3=null, mid3=null;
  function tdist(e){
    var a=e.touches[0], b=e.touches[1];
    return Math.sqrt(Math.pow(a.clientX-b.clientX,2)+Math.pow(a.clientY-b.clientY,2));
  }
  function tmid(e){
    var a=e.touches[0], b=e.touches[1];
    return {x:(a.clientX+b.clientX)/2, y:(a.clientY+b.clientY)/2};
  }
  cv.addEventListener('touchstart',function(e){
    if(!fpActive){ spin=false; spinBefore=false; }
    if(e.touches.length===2){ drag=false; pinch3=tdist(e); mid3=tmid(e); }
    else if(e.touches.length===1){lx=e.touches[0].clientX;ly=e.touches[0].clientY;drag=true;panMode=false;
      tapStart(e.touches[0].clientX, e.touches[0].clientY);}
  },{passive:true});
  cv.addEventListener('touchmove',function(e){
    if(fpActive){                                   // 1인칭 재생 중 : 한 손가락으로 둘러보기, 두 손가락으로 확대/축소
      if(drag && e.touches.length===1){
        tapMoved(e.touches[0].clientX, e.touches[0].clientY);
        fpLook(e.touches[0].clientX-lx, e.touches[0].clientY-ly);
        lx=e.touches[0].clientX; ly=e.touches[0].clientY;
      } else if(e.touches.length===2 && fpFree){
        var fd=tdist(e);
        if(pinch3 && fd>0) fpZoom=Math.max(0.6, Math.min(2.4, fpZoom*(fd/pinch3)));
        pinch3=fd;
      }
      return;
    }
    if(e.touches.length===2){                       // 두 손가락 : 확대/축소 + 이동
      var d=tdist(e), m=tmid(e);
      if(pinch3 && d>0){ radius*=pinch3/d; radius=Math.max(35,Math.min(260,radius)); }
      if(mid3){ panCamera3D(m.x-mid3.x, m.y-mid3.y); }
      pinch3=d; mid3=m; return;
    }
    if(!drag||e.touches.length!==1)return;
    theta+=(e.touches[0].clientX-lx)*0.007; phi-=(e.touches[0].clientY-ly)*0.007;
    phi=Math.max(0.15,Math.min(Math.PI-0.15,phi));
    lx=e.touches[0].clientX; ly=e.touches[0].clientY;
  },{passive:true});
  cv.addEventListener('touchend',function(e){
    if(drag && e.changedTouches && e.changedTouches.length===1)
      tapEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    drag=false;
    if(!e.touches || e.touches.length<2){ pinch3=null; mid3=null; }
  });
})();
