"use strict";

/* ================================================================
   ① 건물 데이터 테이블 — 공과대학 3호관 실제 평면도(1~5층 PDF) 기준
   ----------------------------------------------------------------
   나중에 위치/치수를 고치고 싶으면 이 구역(①)의 숫자와 표만 수정하면 됩니다.
   3D 렌더링/검색/길안내 코드는 이 표를 그대로 읽어서 동작합니다.
   ================================================================ */

var FLOORS = 5;                 // 지상 층수 (1~5층). 지하 1층은 별도 특수 처리.
/* 'R' = 옥상. 엘리베이터는 안 서고 계단으로만 올라간다. */
var LEVELS = ['B1',1,2,3,4,5,'R'];  // 인덱스 0 = 지하 1층

/* ---- 치수 설정 (단위: 임의의 3D 단위, 실제 축척 아님) ---- */
var UNIT_Z   = 4.5;   // 복도 방향 1칸(그리드 유닛) 깊이
var ROOM_W   = 9.0;   // 강의실 폭(복도에서 바깥쪽으로). 2칸짜리 방(13101류)이 정사각형이 되도록 UNIT_Z*2 와 맞춤
var CORR_HALF= 2.1;   // 중앙 복도 폭의 절반 — 요청 반영: 실사진 대비 복도가 좁아 보여서 확장(1.8→2.1, 전체 폭 3.6→4.2m). ROOM_W는 복도 바깥쪽 기준이라 방 크기는 그대로 유지된다.
// EV+계단이 차지하는 구간(코어)의 절반 길이 — 상/하 구역 사이 간격.
// EV·계단 박스를 호실 하나만큼(UNIT_Z) 깊이로 키우기 위해 늘림: EV(UNIT_Z)+계단(UNIT_Z)+사이 간격(0.6) 의 절반.
var CORE_HALF= (UNIT_Z*2 + 0.6)/2;
var FLOOR_H  = 3.2;   // 층고
var SLAB     = 0.25;  // 바닥 슬래브 두께

/* ---- 층별 평면 데이터 ----------------------------------------
   leftTop / rightTop   : 코어(EV·계단) 위쪽 구역, 바깥쪽 → 코어 방향 순서로 나열
   leftBottom/rightBottom: 코어 아래쪽 구역, 코어 방향 → 바깥쪽 순서로 나열
   각 슬롯: {span: 세로로 차지하는 유닛 수, cells:[{code, frac(슬롯 내 비율), searchable, label}]}
   슬롯에 cells가 없으면 code 하나가 span 전체를 차지하는 방으로 처리.
   가벽으로 나뉜 방(같은 슬롯을 나눠 쓰는 경우)은 cells 배열에 2개 이상 기입.
   ---------------------------------------------------------------- */
var FLOORS_DATA = {

  1: {
    // 실제 평면도 기준(2026-07-17 업로드분) : 왼쪽 위 = 13101~13104(동문 쪽부터 코어 쪽 순서),
    // 오른쪽 아래 = 13117·13116·13115·13114·13125(코어 쪽부터 서문 쪽 순서, 마지막 칸은 13114/13125 가벽 분할).
    leftTop: [
      {span:1, code:'13101'},
      {span:1, code:'13102'},
      {span:1, code:'13103'},
      {span:1, code:'13104'}
    ],
    rightTop: [
      {span:2, wall:true, cells:[
        {code:'13121-A', parent:'13121', frac:0.5},
        {code:'13121-B', parent:'13121', frac:0.5}
      ]},
      {span:1, code:'13120'},
      {span:1, code:'13119'}
    ],
    leftBottom: [
      {span:1, code:'13106'},{span:1, code:'13107'},{span:1, code:'13108'},{span:1, code:'13109'},
      {span:1, code:'13110'},{span:1, code:'13111'},{span:1, code:'13112'},{span:1, code:'13113'}
    ],
    rightBottom: [
      {span:2, code:'13117'},{span:2, code:'13116'},{span:2, code:'13115'},
      // 평면도는 이 칸을 '컨퍼런스실·PC실' 한 덩어리로 표기했지만 실제로는 두 방 —
      // 문패 사진 기준 코어 쪽 = 13114(PC 실습실), 서문 쪽 = 13125(캡스톤디자인실).
      {span:2, wall:true, cells:[
        {code:'13114', frac:0.5},
        {code:'13125', frac:0.5}
      ]}
    ],
    // 1층 전용 : 실제 출입구 4곳 (평면도 표기 그대로). 남문은 계단 위쪽(북쪽)으로 옮겨 배치.
    // 이름 정리 : 정문은 그대로, 서쪽 문은 '후문', 나머지 두 곳은 기존에 둘 다 '옆문'으로 같아서
    // 구분이 안 됐던 것을 동쪽/서쪽 옆문으로 나눠 구분되게 함
    doors: [
      {name:'동문', side:'south'},
      {name:'서문', side:'north'},
      {name:'후문', side:'west'},
      {name:'정문', side:'east'}
    ]
  },

  2: {
    leftTop: [
      {span:1, code:'13201'},
      {span:1, code:'13202'},
      {span:1, wall:true, cells:[
        {code:'13203', frac:0.5},
        {code:'13204', frac:0.5}
      ]},
      {span:1, code:'13205'}
    ],
    rightTop: [
      {span:2, code:'13226'},
      {span:1, code:'13225'},
      {span:1, code:'13224'}
    ],
    leftBottom: [
      {span:1, code:'13207'},{span:1, code:'13208'},{span:1, code:'13209'},{span:1, code:'13210'},
      {span:1, code:'13211'},{span:1, code:'13212'},{span:1, code:'13213'},{span:1, code:'13214'}
    ],
    rightBottom: [
      {span:2, code:'13221'},{span:2, code:'13219'},{span:2, code:'13218'},
      {span:2, wall:true, cells:[
        {code:'13217', frac:0.5},
        {code:'13215', frac:0.5}
      ]}
    ]
  },

  3: {
    leftTop: [
      {span:1, code:'13301'},{span:1, code:'13303'},{span:1, code:'13304'},{span:1, code:'13306'}
    ],
    rightTop: [
      {span:2, code:'13326'},{span:1, code:'13325'},{span:1, code:'13324'}
    ],
    leftBottom: [
      {span:2, code:'13310'},
      {span:1, code:'13311'},{span:1, code:'13312'},{span:1, code:'13313'},
      {span:1, code:'13314'},{span:1, code:'13315'},{span:1, code:'13316'}
    ],
    rightBottom: [
      {span:2, code:'13322'},{span:2, code:'13320'},{span:2, code:'13319'},
      // 13318·13317 : 13319 바로 아래에 13318 → 13317 순으로 이어지고,
      // 둘 사이 가벽은 복도와 나란한 가로선(깊이 분할) — 4층 13422/13421과 같은 형태.
      {span:2, wall:true, cells:[
        {code:'13318', frac:0.5},
        {code:'13317', frac:0.5}
      ]}
    ]
  },

  4: {
    leftTop: [
      {span:1, code:'13401'},{span:1, code:'13402'},{span:1, code:'13403'},
      {span:1, code:'KTC', label:'KTC\n(프로그래밍 동아리)'}
    ],
    rightTop: [
      {span:2, wall:true, cells:[
        {code:'13422', frac:0.5},
        {code:'13421', frac:0.5}
      ]},
      {span:1, code:'13420'},{span:1, code:'13419'}
    ],
    leftBottom: [
      {span:1, code:'13405'},{span:1, code:'13406'},{span:1, code:'13407'},{span:1, code:'13408'},
      {span:1, code:'13409'},{span:1, code:'13410'},{span:1, code:'13411'},{span:1, code:'13412'}
    ],
    rightBottom: [
      {span:2, code:'13417'},{span:2, code:'13415'},{span:2, code:'13414'},{span:2, code:'13413'}
    ]
  },

  5: {
    leftTop: [
      {span:1, wall:true, cells:[
        {code:'13501', frac:0.5},
        {code:'13502', frac:0.5}
      ]},
      {span:1, code:'13504'},{span:1, code:'13505'},{span:1, code:'13506'}
    ],
    rightTop: [
      {span:2, code:'13524'},{span:1, code:'13523'},{span:1, code:'13522'}
    ],
    leftBottom: [
      {span:1, code:'13508'},{span:1, code:'13509'},{span:1, code:'13510'},{span:1, code:'13511'},
      {span:1, code:'13512'},{span:1, code:'13513'},{span:1, code:'13514'},{span:1, code:'13515'}
    ],
    rightBottom: [
      {span:2, code:'13520'},{span:2, code:'13518'},{span:2, code:'13517'},{span:2, code:'13516'}
    ]
  }
};

/* ---- 부대시설 / 지하1층 : 평면도에 표시가 없어 임시 배치 -------
   confirmed:false 인 항목은 실제 위치 확인 후 좌표만 수정하면 됩니다.
   ---------------------------------------------------------------- */
var TOILET_D = 1.6;   // 화장실 세로 깊이(얇은 띠 모양)
// 호실 렌더링 시 세로로 0.35만큼 안쪽으로 줄여 그리므로(코드 상 c.d-0.35), 코어 바로 위 호실의 실제(화면상) 아래쪽 가장자리는
// 데이터상 경계(CORE_HALF)보다 0.175 만큼 더 바깥쪽(북쪽)에 있음 — 화장실 윗변을 그 위치에 맞춰 바로 붙임(틈 없이).
var TOILET_Z = (CORE_HALF+0.175) - TOILET_D/2;
var FACILITIES = {
  // 화장실 : 평면도에 표기 없음 → 코어(EV/계단) 반대쪽 블록(오른쪽) 임시 배치, 전 층 동일 위치.
  // 폭(w)은 호실 칸과 정확히 같은 폭(ROOM_W)으로 맞춰 "같은 칸"처럼 보이게 하고,
  // 세로 깊이(d)는 얇은 띠 모양이 되도록 크게 줄임(글자는 addClampedLabel의 폭 제한 + 작은 fontScale로 안쪽에 맞춤).
  // z는 바로 위(북쪽) 호실 칸에 틈 없이 붙도록 계산(TOILET_Z), 그만큼 아래쪽에는 여유 공간이 남음.
  toilet: { x: -(CORR_HALF+ROOM_W/2), z: TOILET_Z, w: ROOM_W-0.25, d: TOILET_D, confirmed:false, note:'평면도 미표시 — 위치 확인 필요' },
  // 자판기 : 화장실 바로 아래(남쪽)에 틈 없이 붙여 배치. 인쇄기 : 13104 바로 위(북쪽)에 틈 없이 붙여 배치.
  // 화장실~13104 사이(코어 반대편 x열)의 여유 공간에 배치하므로 화장실·13104·서로와도 겹치지 않음.
  // (CORE_HALF+0.175)는 TOILET_Z 계산에 쓰인 것과 동일한 보정값 — 코어 위/아래 첫 호실의 실제(화면상) 안쪽 가장자리 위치.
  vending: { floor:1, x: -(CORR_HALF+ROOM_W/2) + 1.9, z: -(CORE_HALF+0.175) + 1.1, w:1.8, d:2.2, confirmed:false, note:'평면도 미표시 — 인쇄기 오른쪽으로 위치 조정(요청 반영)' },
  printer: { floor:1, x: -(CORR_HALF+ROOM_W/2), z: -(CORE_HALF+0.175) + 1.1, w:1.8, d:2.2, confirmed:false, note:'평면도 미표시 — 위치 확인 필요' },
  // 지하1층 크리에이티브 존 : 지하 평면도 없음 → 기존 프로토타입 개방형 존 형태 유지
  zoneB1: { confirmed:false, note:'지하1층 평면도 미제공 — 기존 형태 임시 유지' }
};

/* ================================================================
   ② 레이아웃 엔진 — 데이터 테이블 → 실제 3D 좌표로 변환
   ================================================================ */

var FLOOR_LAYOUT = {};   // FLOOR_LAYOUT[층] = {cells:[...], halfX, topOuterZ, bottomOuterZ, coreX, evZ, stZ}
var ROOM_LOOKUP  = {};   // ROOM_LOOKUP[층][전체코드] = cell
var VALID_INPUT  = {};   // (구버전 호환용, 더 이상 검색에는 쓰지 않음)
var VALID_FULL5  = {};   // VALID_FULL5[5자리 전체 호실번호 문자열] = {floor, code} — 5자리 직접 검색용

function spanSum(list){ var s=0; list.forEach(function(x){ s+=(x.span||1); }); return s; }

function buildFloorLayout(lv){
  var fd = FLOORS_DATA[lv];
  var cells = [];
  // ※ 층상세(탑뷰) 카메라는 "북쪽=화면 위"를 맞추면 좌우가 뒤집히는 특성이 있어
  //   (위에서 내려다보는 시점의 필연적 특성) 실제 도면과 화면 좌/우가 일치하도록
  //   왼쪽 블록(leftTop/leftBottom)에 +X, 오른쪽 블록에 -X를 배정합니다.
  var leftX  =  (CORR_HALF + ROOM_W/2);
  var rightX = -(CORR_HALF + ROOM_W/2);
  var topUnits    = Math.max(spanSum(fd.leftTop), spanSum(fd.rightTop));
  var bottomUnits = Math.max(spanSum(fd.leftBottom), spanSum(fd.rightBottom));
  var topOuterZ    = CORE_HALF + topUnits*UNIT_Z;
  var bottomOuterZ = -(CORE_HALF + bottomUnits*UNIT_Z);

  function layoutList(list, sideX, startZ){
    var cursor = startZ;
    list.forEach(function(slot){
      var span = slot.span || 1;
      var slotDepth = span*UNIT_Z;
      var slotNorthZ = cursor;              // 이 슬롯의 북쪽(코어 기준 바깥) 경계
      if(slot.xsplit){
        // 가로(폭) 방향으로 나뉜 방 (예: 3층 13318/13317 — 복도 쪽/바깥쪽 가벽으로 나뉨, 깊이는 슬롯 전체 그대로 씀).
        // cells 배열은 복도에 가까운 쪽부터 순서대로 나열(첫 칸 = 안쪽/복도 쪽, 다음 칸일수록 바깥쪽).
        var zc0 = slotNorthZ - slotDepth/2;
        var blockSign = sideX>=0 ? 1 : -1;   // 코어(복도)에서 바깥쪽(외벽)으로 가는 방향 부호
        var cursorX = sideX - blockSign*(ROOM_W/2);   // 복도 쪽(안쪽) 가장자리에서 시작
        slot.cells.forEach(function(sc){
          var w = (sc.wfrac!==undefined ? sc.wfrac : 1) * ROOM_W;
          var xc = cursorX + blockSign*(w/2);
          cursorX += blockSign*w;
          cells.push({
            floor: lv,
            code: sc.code || null,
            parent: sc.parent || null,
            searchable: (sc.searchable!==false) && !!(sc.code),
            label: sc.label || sc.code || '',
            x: xc, z: zc0, w: w, d: slotDepth,
            wall: !!slot.wall && slot.cells.length>1
          });
        });
      } else {
        var subCells = slot.cells || [{code:slot.code, frac:1, label:slot.label}];
        var sub = slotNorthZ;
        subCells.forEach(function(sc){
          var d = (sc.frac!==undefined ? sc.frac : 1) * slotDepth;
          var zc = sub - d/2;
          sub -= d;
          cells.push({
            floor: lv,
            code: sc.code || null,
            parent: sc.parent || null,
            searchable: (sc.searchable!==false) && !!(sc.code),
            label: sc.label || sc.code || '',
            x: sideX, z: zc, w: ROOM_W, d: d,
            wall: !!slot.wall && subCells.length>1
          });
        });
      }
      cursor -= slotDepth;
    });
  }
  layoutList(fd.leftTop,  leftX,  topOuterZ);
  layoutList(fd.rightTop, rightX, topOuterZ);
  layoutList(fd.leftBottom,  leftX,  -CORE_HALF);
  layoutList(fd.rightBottom, rightX, -CORE_HALF);

  var lookup = {};
  var validSet = {};
  cells.forEach(function(c){
    if(!c.code) return;
    var full = c.parent || c.code;         // 13121-A/B 는 부모 코드(13121)로 검색
    if(!lookup[full]) lookup[full] = { cells:[], x:0, z:0 };
    lookup[full].cells.push(c);
    if(c.searchable || c.parent){
      var floorDigit = String(lv);
      var numPart = full.slice(3);          // '13' + floor + num
      validSet[floorDigit+numPart] = full;
    }
  });
  // 대표 좌표(여러 셀로 나뉜 방은 평균 위치)
  Object.keys(lookup).forEach(function(code){
    var arr = lookup[code].cells;
    var sx=0, sz=0; arr.forEach(function(c){ sx+=c.x; sz+=c.z; });
    lookup[code].x = sx/arr.length; lookup[code].z = sz/arr.length;
  });

  var halfX = CORR_HALF + ROOM_W;
  return {
    cells: cells,
    lookup: lookup,
    valid: validSet,
    halfX: halfX,
    topOuterZ: topOuterZ,
    bottomOuterZ: bottomOuterZ,
    // EV·계단 : 왼쪽 블록 안에서 복도 쪽으로 쏠리지 않도록, 위아래 호실과 같은 x중심(leftX)에 맞춰 블록 정중앙에 배치.
    // 깊이(evD/stD)는 호실 하나(UNIT_Z)만큼 키우고, 서로 0.6 간격을 두고 코어 구간을 꽉 채움(위아래 호실과도 딱 붙음).
    coreX: (CORR_HALF + ROOM_W/2),
    evZ: -(UNIT_Z/2+0.3), evD: UNIT_Z,   // 엘리베이터가 남쪽(계단보다 아래)
    stZ: (UNIT_Z/2+0.3), stD: UNIT_Z     // 계단이 북쪽(엘리베이터보다 위)
  };
}

for(var lv=1; lv<=FLOORS; lv++){
  FLOOR_LAYOUT[lv] = buildFloorLayout(lv);
  ROOM_LOOKUP[lv]  = FLOOR_LAYOUT[lv].lookup;
  VALID_INPUT[lv]  = FLOOR_LAYOUT[lv].valid;
  // 5자리 전체 호실번호(예: '13101') 그대로 검색 가능하도록 등록. 'KTC' 같은 숫자가 아닌 코드는 제외.
  Object.keys(ROOM_LOOKUP[lv]).forEach(function(code){
    if(/^\d{5}$/.test(code)) VALID_FULL5[code] = {floor: lv, code: code};
  });
}

// 전 층 공통 외곽(건물 전체 뷰의 슬래브 크기) — 가장 큰 층 기준
var GLOBAL_HALF_X = 0, GLOBAL_TOP_Z = 0, GLOBAL_BOT_Z = 0;
for(var i=1;i<=FLOORS;i++){
  var L = FLOOR_LAYOUT[i];
  GLOBAL_HALF_X = Math.max(GLOBAL_HALF_X, L.halfX);
  GLOBAL_TOP_Z  = Math.max(GLOBAL_TOP_Z, L.topOuterZ);
  GLOBAL_BOT_Z  = Math.min(GLOBAL_BOT_Z, L.bottomOuterZ);
}

// 비상계단(1~5층) : 정문 기준 지정된 호실(13113·13215·13316·13412·13515) '아래쪽'
// (건물 남쪽, 기존 외곽선(bottomOuterZ)보다 더 -Z 바깥쪽)에 새 구조물만 추가한다.
// 해당 호실을 포함해 기존 FLOOR_LAYOUT(모든 층의 호실 배치)은 절대 건드리지 않는다.
var EMSTAIR_ROOM = {1:'13113', 2:'13215', 3:'13316', 4:'13412', 5:'13515'};
var EMSTAIR_W = ROOM_W-0.25, EMSTAIR_D = UNIT_Z;   // 진짜 호실 하나와 같은 크기(13113과 동일 규격)
// 실제로 그려지는 비상계단 두께(호실 렌더링과 같은 공식 — roomInsetD로 살짝 줄어든 값).
// 슬래브·문 위치 모두 이 값을 기준으로 잡아야 "칸(자리)"이 아니라 실제 보이는 가장자리에 맞는다.
var EMSTAIR_RENDER_D = EMSTAIR_D - roomInsetD(EMSTAIR_D);
// 층 상세보기 카메라의 "처음 뜨는 화면(fit)" 전용 여유값 — 슬래브(바닥) 크기와는 무관하다.
// 3D 화면은 clampBotZ 끝까지 딱 맞춰서 첫 화면을 잡아주지 않는 특성이 있어서, tightBotZ를
// 그대로 clampBotZ로 쓰면 동문·비상계단이 처음 화면에서 살짝 잘려 보인다(드래그하면 보임).
// 이 값만큼 clampBotZ를 조금 더 넉넉히 잡아 처음부터 잘리지 않게 한다.
var EMSTAIR_FRAME_PAD = 3.0;
var EMSTAIR_POS = {};
// x좌표는 상세보기·건물 전체 홀로그램 모두 통일된 값(xWhole) 하나만 쓴다 — 계단실은 건물을
// 수직으로 관통하는 구조물이라 층마다 자리가 어긋나면 안 되고, 2층 기준 호실(13215)은
// 다른 층과 좌우가 뒤집힌 자리에 있어(x부호 반대) 그 값을 그대로 쓰면 2층만 반대쪽에 떠 보인다.
var EMSTAIR_X_WHOLE = null;
for(var esLv=1; esLv<=FLOORS; esLv++){
  var esRoom = EMSTAIR_ROOM[esLv];
  var esAnchor = esRoom && FLOOR_LAYOUT[esLv] && FLOOR_LAYOUT[esLv].lookup[esRoom];
  if(!esAnchor) continue;
  if(EMSTAIR_X_WHOLE===null) EMSTAIR_X_WHOLE = esAnchor.x;
  // 남는 틈 없이, 바로 위 호실(13113 등)과 같은 호실 한 칸 깊이(UNIT_Z)만큼만 떨어뜨려
  // 그 자리에 곧바로 이어붙인다(호실과 호실이 붙어 있는 것과 같은 간격).
  var esZ = esAnchor.z - UNIT_Z;
  // 이 층의 슬래브(바닥)가 남는 빈 공간 없이 딱 맞게 끝나는 지점 — 실제로 그려지는 비상계단
  // 바깥쪽(남쪽) 가장자리(esZ - EMSTAIR_RENDER_D/2)까지만. 1층은 그 바로 밖에 동문(두께 0.8)이
  // 딱 붙어 있으므로 문 두께만큼 더 내려간다(그래야 슬래브가 동문 바깥 가장자리에 맞음).
  var esTightBotZ = esZ - EMSTAIR_RENDER_D/2 - (esLv===1 ? 0.8 : 0);
  EMSTAIR_POS[esLv] = { x: esAnchor.x, xWhole: EMSTAIR_X_WHOLE, z: esZ, w: EMSTAIR_W, d: EMSTAIR_D, tightBotZ: esTightBotZ };
  // 건물 전체 홀로그램(모든 층 통일 크기)용 GLOBAL_BOT_Z도 같은 기준으로 넓혀준다.
  GLOBAL_BOT_Z = Math.min(GLOBAL_BOT_Z, esTightBotZ);
}
/* 비상계단은 수직으로 곧장 이어지는 구조물이라, 5층 자리 그대로 옥상까지 뚫려 있다
   (옥상에서도 비상계단으로 오르내릴 수 있게). */
if(EMSTAIR_POS[5]){
  EMSTAIR_POS['R'] = {x:EMSTAIR_POS[5].x, xWhole:EMSTAIR_POS[5].xWhole, z:EMSTAIR_POS[5].z,
    w:EMSTAIR_POS[5].w, d:EMSTAIR_POS[5].d, tightBotZ:EMSTAIR_POS[5].tightBotZ};
}

/* 지하1층(B1) 엘리베이터·계단 배치.
   승강로와 계단실은 건물을 수직으로 관통하므로 층마다 자리를 옮길 수 없다.
   그런데 예전에는 지하1층만 '오른쪽 위 코너'에 따로 놓여 있어서,
   지하1층을 현재 위치로 두면 사람이 서 있는 자리(위층 엘리베이터)와
   빨간 동선의 출발점(지하 엘리베이터)이 서로 어긋났다.
   → 1~5층 코어의 좌표·크기를 그대로 물려받는다. */
var B1_CORE   = FLOOR_LAYOUT[1];
var B1_EVST_W = ROOM_W - 0.25;      // 위층 EV·계단 박스와 같은 폭
var B1_EVST_D = B1_CORE.stD;        // 같은 깊이
var B1_EVST_GAP = 1.2;              // 코어와 크리에이티브 존 사이 여백
// 1층 코어와 정확히 같은 좌표(coreX·evZ·stZ)를 그대로 써서 승강로·계단이 전 층에서
// 수직으로 일직선이 되게 한다(바로 위 주석의 의도와 달리, 실제로는 '오른쪽 위 코너'의
// 별도 좌표를 쓰고 있어서 1층과 위치가 어긋나 있었다 — 그 계산 대신 1층 좌표를 그대로 물려받는다).
var B1_evX = B1_CORE.coreX;
var B1_evZ = B1_CORE.evZ;
var B1_stZ = B1_CORE.stZ;
// 크리에이티브 존 : 넓이(zw·zd)는 그대로 두고, 코어가 층 가운데(X)로 옮겨왔으므로
// 위아래(Z) 대신 코어 반대편(X)으로 자리를 옮겨 겹치지 않게 한다.
var B1_ZONE_RIGHT_X = B1_evX - B1_EVST_W/2 - B1_EVST_GAP;   // 코어 바로 옆(여백 포함) 경계
var B1_ZONE_LEFT_X  = -(GLOBAL_HALF_X - 1);                 // 반대쪽 벽 여백
var B1_ZONE_MID_X   = (B1_ZONE_RIGHT_X + B1_ZONE_LEFT_X)/2;
var B1_ZONE_WIDTH_X = B1_ZONE_RIGHT_X - B1_ZONE_LEFT_X;
var B1_ZONE_TOP_Z = GLOBAL_TOP_Z - 1;
var B1_ZONE_BOT_Z = GLOBAL_BOT_Z + 2;
var B1_ZONE_MID_Z = (B1_ZONE_TOP_Z + B1_ZONE_BOT_Z)/2;

/* '크리에이티브 존 상세보기'(층 상세 화면, detail=true) 전용 배치.
   여기서는 1층과 맞추는 것보다, 엘리베이터를 오른쪽 위 코너에 붙이고 계단을 그 바로 밑에
   두어(원래 형태) 크리에이티브 존이 코어 하나 폭만 뺀 나머지 전체를 넓게 쓰도록 한다.
   (건물 전체 홀로그램 뷰는 계속 위의 1층 정렬 좌표를 그대로 쓴다 — 서로 다른 화면이라 독립적으로 둬도 된다.) */
var B1_evX_D = -(GLOBAL_HALF_X - B1_EVST_W/2 - 0.6);
var B1_evZ_D = GLOBAL_TOP_Z - B1_EVST_D/2 - 0.6;
var B1_stZ_D = B1_evZ_D - B1_EVST_D;
var B1_ZONE_TOP_Z_D = Math.min(B1_evZ_D, B1_stZ_D) - B1_EVST_D/2 - B1_EVST_GAP;
var B1_ZONE_BOT_Z_D = GLOBAL_BOT_Z + 2;
var B1_ZONE_MID_Z_D = (B1_ZONE_TOP_Z_D + B1_ZONE_BOT_Z_D)/2;
var B1_ZONE_WIDTH_X_D = GLOBAL_HALF_X*2-2;
var B1_ZONE_MID_X_D = 0;

function lvName(lv){
  if(lv==='R') return (LANG==='en') ? 'Rooftop' : '옥상';
  if(LANG==='en') return lv==='B1' ? 'B1' : 'Floor '+lv;
  return lv==='B1' ? '지하 1층' : lv+'층';
}
function lvLabel(lv){ return (lv==='B1'||lv==='R') ? (lv==='R'?'RF':'B1') : lv+'F'; }
function lvIndex(lv){ return LEVELS.indexOf(lv); }
/* 옥상은 방 배치도가 없지만 계단은 5층과 같은 자리로 올라온다.
   이걸 안 맞춰줘서 옥상에서 내려갈 때 계단 위치가 z=0으로 튀었다. */
function stZOf(lv){
  if(lv==='B1') return B1_stZ;
  if(lv==='R')  return (FLOOR_LAYOUT[5] ? FLOOR_LAYOUT[5].stZ : 0);
  var L=FLOOR_LAYOUT[lv];
  return L ? L.stZ : 0;
}

/* 검색 입력(5자리 전체 호실번호, 예: 13101) → 실제 방 정보 */
function parseRoomInput(s){
  if(!/^\d{5}$/.test(s)) return null;
  var info = VALID_FULL5[s];
  if(!info) return null;
  return {floor:info.floor, code:info.code};
}

/* ========== 상태 ========== */
var target=null, curFloor=null, steps=[], si=0;
var fpHoloGrid=null; /* 버그 수정: 선언 없이 대입만 하면 strict 모드에서 ReferenceError로 앱 전체가 멈춤 */
var startFloor=1;   // 사용자가 지금 있는 층(기본 1층=정문). 출발층 선택으로 바뀜.

function targetPos(){
  if(!target) return {x:0,z:0};
  if(target.kind==='toilet') return {x:FACILITIES.toilet.x, z:FACILITIES.toilet.z};
  // 예전엔 (0,0) — 코어 바로 옆이라 "엘리베이터에서 몇 걸음"으로 끝나 버렸음. 존 한가운데를 목적지로.
  if(target.kind==='zone')   return {x:B1_ZONE_MID_X, z:B1_ZONE_MID_Z};
  if(target.kind==='emstair'){
    var ep = EMSTAIR_POS[target.floor];
    return ep ? {x:ep.xWhole, z:ep.z} : {x:0,z:0};
  }
  var L = FLOOR_LAYOUT[target.floor];
  var info = L.lookup[target.code];
  return info ? {x:info.x, z:info.z} : {x:0,z:0};
}
function targetLabel(){
  if(!target) return '';
  if(target.kind==='toilet') return (LANG==='ko') ? '화장실' : 'Restroom';
  if(target.kind==='zone')   return (LANG==='ko') ? '크리에이티브 존' : 'Creative Zone';
  if(target.kind==='emstair') return (LANG==='ko') ? '비상계단' : 'Emergency Stairs';
  return roomTitle(target.code);
}
function isTargetMesh(o){
  if(!target || !o.userData) return false;
  if(target.kind==='toilet') return o.userData.toilet && o.userData.floor===target.floor;
  if(target.kind==='zone')   return !!o.userData.zone;
  if(target.kind==='emstair') return o.userData.evst==='emstair' && o.userData.floor===target.floor;
  if(!o.userData.code) return false;
  var full = o.userData.parent || o.userData.code;
  return full===target.code && o.userData.floor===target.floor;
}

/* ========== 도착 파티클 효과 ========== */
/* containerId 안에 작은 발광 파티클들을 사방으로 흩뿌리듯 터뜨린다.
   길안내 마지막 단계(s6)와 도착 화면(s7)에서 공용으로 쓴다. */
function spawnParticles(containerId){
  var box = document.getElementById(containerId);
  if(!box) return;
  box.innerHTML = '';
  var colors = ['#00E5FF','#FF2E88','#7B5CFF','#1FE0A8','#FFC93C'];
  var ring = document.createElement('span'); ring.className = 'ring';
  box.appendChild(ring);
  var count = 28;
  for(var i=0;i<count;i++){
    var el = document.createElement('span');
    el.className = 'p';
    var ang = (Math.PI*2)*(i/count) + (Math.random()*0.5-0.25);
    var dist = 55 + Math.random()*130;
    var dx = Math.cos(ang)*dist, dy = Math.sin(ang)*dist;
    var size = 4 + Math.random()*7;
    var dur = 0.75 + Math.random()*0.65;
    var delay = Math.random()*0.12;
    var c = colors[i % colors.length];
    el.style.left = '50%'; el.style.top = '50%';
    el.style.width = size+'px'; el.style.height = size+'px';
    el.style.background = c; el.style.boxShadow = '0 0 8px '+c;
    el.style.setProperty('--dx', dx+'px');
    el.style.setProperty('--dy', dy+'px');
    el.style.animationDuration = dur+'s';
    el.style.animationDelay = delay+'s';
    box.appendChild(el);
  }
  // 재생이 끝나면 정리(같은 화면을 다시 봐도 매번 새로 터지도록)
  setTimeout(function(){ if(box) box.innerHTML=''; }, 2000);
}

/* ========== 화면 전환 ========== */
var SCREENS=['s1','s2','scat','s3','s4','s5','s6','s7','sph','sset','sguide','sfav','ssug','sadmin','sphmgr','spwgate','phsort','sqr','sqrok','saidat','spick'];
/* ========== '여기가 맞나요?' 화면의 실사 3D ==========
   군산대 공대 3호관 실사 3D 페이지(three.js 포함)를 base64로 통째로 품고 있다가,
   iframe의 srcdoc으로 풀어서 띄운다. 외부 파일·인터넷 연결이 필요 없다.
   화면을 처음 열 때 한 번만 만들고, 그 뒤로는 그대로 둔다. */
var BLD3D_DONE = false;
function mountBld3D(){
  /* 실사 3D 는 3d/realistic.html 로 따로 있다 (예전에는 base64 로 품었다가 srcdoc 으로 풀었다).
     three.js 는 앱과 같은 파일(js/vendor/three.min.js)을 쓰므로 브라우저가 한 번만 받는다. */
  if(BLD3D_DONE) return;
  var box = document.getElementById('b3dBox');
  if(!box) return;
  BLD3D_DONE = true;
  var fr = document.createElement('iframe');
  fr.id = 'b3dFrame';
  fr.title = '군산대 공대 3호관 실사 3D';
  fr.setAttribute('allow', 'fullscreen');
  fr.setAttribute('scrolling', 'no');
  fr.onload = function(){
    var ld = document.getElementById('b3dLoad');
    if(ld) ld.style.display = 'none';
    bld3DHook(fr);                                   // v51
  };
  fr.src = '3d/realistic.html';
  box.appendChild(fr);
}/* 화면에 들어올 때마다 3D를 '전체보기 + 자동회전'으로 되돌린다.
   (사용자가 3D를 직접 만진 뒤에는 3D 쪽에서 알아서 무시한다) */
/* v51 : 건물 3D(iframe)는 2번 화면에 있을 때만 그린다.
   iframe 안 코드는 손대지 않고 그 창의 requestAnimationFrame을 감싸서, 2번 화면이 아니면
   다음 프레임 예약을 붙들어 두었다가(BLD3D.queue) 돌아오면 그때 이어서 돌린다. */
var BLD3D = { paused:true, queue:[], raw:null };
function bld3DHook(fr){
  try{
    var w = fr.contentWindow;
    if(!w || w.__b3navHooked) return;
    w.__b3navHooked = true;
    var raw = w.requestAnimationFrame.bind(w);
    BLD3D.raw = raw;
    w.requestAnimationFrame = function(cb){
      if(BLD3D.paused){ BLD3D.queue.push(cb); return 0; }
      return raw(cb);
    };
    /* 폰이면 iframe 렌더러의 해상도 배율을 메인 3D와 같은 1.4로 (기본 2 → 픽셀 처리량 절반) */
    var mob = ('ontouchstart' in window) || navigator.maxTouchPoints>0 || /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);
    if(mob && w.renderer && typeof w.renderer.setPixelRatio === 'function'){
      w.renderer.setPixelRatio(Math.min(w.devicePixelRatio || 1, 1.4));
      if(typeof w.resize === 'function') w.resize();
    }
    var s2 = document.getElementById('s2');
    if(s2 && s2.classList.contains('on') && !document.hidden) bld3DResume(); else BLD3D.paused = true;
  }catch(e){}
}
function bld3DResume(){
  if(!BLD3D.raw) return;
  BLD3D.paused = false;
  var q = BLD3D.queue; BLD3D.queue = [];
  for(var i=0;i<q.length;i++){ try{ BLD3D.raw(q[i]); }catch(e){} }
}
function bld3DLeave(){ BLD3D.paused = true; }
function bld3DEnter(){
  try{
    bld3DResume();                                     // v51 : 렌더 루프 재개
    var fr = document.getElementById('b3dFrame');
    var w  = fr && fr.contentWindow;
    if(w && typeof w.enterView === 'function') w.enterView();
  }catch(e){}
}
/* 시작 화면에서 미리 만들어 두어, 2번째 화면으로 넘어갔을 때 기다리지 않게 한다 */
window.addEventListener('load', function(){ setTimeout(mountBld3D, 2500); });   // v51 : 첫 화면이 자리 잡은 뒤

function go(id){
  if(typeof id==='number') id='s'+id;
  var target=document.getElementById(id);
  SCREENS.forEach(function(sid){
    var el=document.getElementById(sid);
    if(sid!==id) el.classList.remove('on');
  });
  /* 애니메이션이 매번 확실히 재생되도록 잠깐 꺼서 리플로우(강제 재계산)시킨 뒤 다시 켠다 */
  target.classList.remove('on');
  void target.offsetWidth;
  target.classList.add('on');
  var order={'s1':1,'s2':2,'scat':3,'s3':4,'s4':5,'s5':6,'s6':7,'s7':8};
  for(var i=1;i<=8;i++){
    var li=document.getElementById('l'+i);
    if(li) li.classList.toggle('now', i===order[id]);
  }
  if(id!=='sqr' && typeof QRNAV!=='undefined') QRNAV.stopCam();
  if(id==='s2'){ mountBld3D(); bld3DEnter(); }
  if(id==='s4') resize3D();
  if(id==='s4') updateFavBtn();
  /* v51 : 목적지 3D 루프는 s4에서만 */
  if(typeof animateRunning!=='undefined'){
    if(id==='s4') animateStart(); else animateRunning=false;
  }
  /* v51 : 건물 확인 3D(iframe)도 s2를 벗어나면 멈춘다 */
  if(id!=='s2' && typeof bld3DLeave==='function') bld3DLeave();
  if(id==='s5' && typeof resizeB==='function') resizeB();
  /* s5(층 상세) 화면일 때만 두 번째 3D 렌더러 루프를 돌리고, 나가면 바로 멈춘다. */
  if(typeof animateBRunning!=='undefined'){
    if(id==='s5'){ if(!animateBRunning && typeof rB!=='undefined' && rB){ animateBRunning=true; animateB(); } }
    else animateBRunning=false;
  }
  if(id==='ssug' && typeof SUGAI!=='undefined') SUGAI.warmup();
  if(id==='ssug' && typeof SUGDB!=='undefined') SUGDB.prepSubmit();
  if(id==='sadmin' && typeof SUGDB!=='undefined') SUGDB.watchAdmin();
  if(id!=='sadmin' && typeof SUGDB!=='undefined') SUGDB.unwatchAdmin();
  if(id==='sph'){ phRender(); if(typeof sugBadgeSync==='function') sugBadgeSync();
                  if(typeof phAiLearnRender==='function') phAiLearnRender(); }
  if(id==='sadmin' && typeof sugAdminRender==='function') sugAdminRender();
  if(id==='sphmgr' && typeof sphMgrRender==='function') sphMgrRender();
  if(id==='phsort' && typeof phSortRender==='function') phSortRender();
  if(id==='saidat' && typeof aidEnter==='function') aidEnter();     /* v55 : AI 사진 파악 자료집 */
  if(id==='sfav') renderFavorites();
  if(id==='s7') spawnParticles('arrivalFx');   // "안내를 마칩니다" 도착 파티클 효과
}
/* 즐겨찾기·설정은 어느 화면에서 열었든, 닫으면 그 이전 화면으로 되돌아간다 */
var beforeOverlay='s1';
function openOverlay(id){
  var cur=document.querySelector('.screen.on');
  if(cur && cur.id!==id && cur.id!=='sset' && cur.id!=='sfav' && cur.id!=='sguide') beforeOverlay=cur.id;
  go(id);
}
function closeOverlay(){ go(beforeOverlay); }
function reset(){ clearSearch(); go('s1'); }
/* 도착 화면 '다른 곳 찾기' : 처음(시작) 화면이 아니라 카테고리 선택 화면으로 바로 연결 */
function findAnother(){ clearSearch(); go('scat'); }
/* 도착 화면 '종료' : 앱(브라우저 창/웹뷰)을 닫는다.
   스크립트로 열지 않은 일반 탭에서는 브라우저가 window.close()를 막을 수 있어,
   그런 경우를 위해 잠깐 뒤 안내 문구를 보여준다. */
function exitApp(){
  window.close();
  setTimeout(function(){
    alert((LANG==='ko') ? '이 창을 닫아 주세요.' : 'Please close this window.');
  }, 300);
}
/* ========== 안드로이드 하드웨어 뒤로가기 ==========
   갤럭시 등 안드로이드의 뒤로가기 키는 '브라우저 히스토리를 한 칸 되돌리는' 동작이다.
   그런데 이 앱은 화면 전환을 전부 자바스크립트(go)로만 처리해서 히스토리에 아무것도
   쌓이지 않았고, 그래서 어느 화면에서 눌러도 곧장 앱이 종료돼 버렸다.
   → 항상 '더미 히스토리 한 칸'을 채워 두고(backGuardArm), 뒤로가기가 눌리면(popstate)
     앱 안에서 한 단계만 뒤로 간 뒤 그 칸을 다시 채운다.
     첫 화면(s1)에서는 다시 채우지 않고 그대로 흘려보내 앱이 종료되게 한다. */
function appBackStep(){
  // ① 직접 그린 확인창(삭제 확인 등)이 떠 있으면 그것부터 닫는다
  var cf = document.querySelector('.appConfirmOverlay');
  if(cf && cf.parentNode){ cf.parentNode.removeChild(cf); return true; }
  // ③ 사진 위치 고르기 오버레이(관리자 화면)
  var pk = document.getElementById('phPick');
  if(pk && pk.classList.contains('on')){
    if(typeof phPickClose==='function') phPickClose(); else pk.classList.remove('on');
    return true;
  }
  // ④ 로드뷰 재생 중이면 재생만 멈춘다(화면은 그대로 3D에 남는다)
  if(typeof fpActive!=='undefined' && fpActive){
    if(typeof fpStop==='function') fpStop();
    return true;
  }
  // ⑤ 3D 전체화면이면 전체화면만 빠져나온다
  var s4 = document.getElementById('s4');
  if(s4 && s4.classList.contains('fsMode')){ exitFullscreen3D(); return true; }
  // ⑥ 화면별 뒤로가기
  var cur = document.querySelector('.screen.on');
  var id  = cur ? cur.id : 's1';
  if(id === 's1') return false;                    // 첫 화면 → 앱 종료
  if(id === 's6'){                                 // 길안내 : 단계를 하나씩 되돌린다
    if(typeof si==='number' && si>0){ si--; render6(); return true; }
    go(4); return true;
  }
  if(id === 's7'){ go(6); return true; }           // 도착 화면 → 마지막 안내 단계로
  if(id === 'sguide'){                             // 이용안내 : 페이지를 하나씩 되돌린다
    if(typeof guideIdx==='number' && guideIdx>0){ guidePrev(); return true; }
    go('sset'); return true;
  }
  /* 나머지 화면은 그 화면 좌측 상단 '←' 버튼과 똑같이 동작시킨다.
     (뒤로가기 규칙을 두 군데에 따로 적어 두면 나중에 어긋나므로) */
  var btn = cur.querySelector('.bar .back');
  if(btn){ btn.click(); return true; }
  go('s1'); return true;
}
var backGuardOn = false;
function backGuardArm(){
  if(backGuardOn) return;
  try{ history.pushState({gunsanGuard:1}, ''); backGuardOn = true; }catch(e){}
}
(function backGuardInit(){
  if(!window.history || !history.pushState) return;
  backGuardArm();
  window.addEventListener('popstate', function(){
    backGuardOn = false;
    if(appBackStep()){
      backGuardArm();                 // 앱 안에서 처리했으면 다음 뒤로가기를 위해 다시 채워 둔다
    }else{
      /* 첫 화면에서 눌렀을 때 : 남은 히스토리를 한 칸 더 되돌려
         웹뷰·홈화면 앱이 닫히게 한다(일반 브라우저 탭이면 이전 페이지로 나간다). */
      try{ window.close(); }catch(e){}
      try{ history.back(); }catch(e){}
    }
  });
})();

/* 검색창·결과·안내문을 처음 상태로 */
function clearSearch(){
  var nq=document.getElementById('nq'); if(nq) nq.value='';
  var nr=document.getElementById('nres'); if(nr) nr.innerHTML='';
  var er=document.getElementById('err');  if(er) er.textContent='';
  searchHits=[];
  var rw=document.getElementById('recentWrap'); if(rw) rw.classList.remove('hidden');
  renderRecent();
}

/* ========== 즐겨찾기 ========== */
function favId(t){ return t.kind+'_'+t.floor+'_'+(t.code||''); }
function loadFavs(){
  try{ return JSON.parse(localStorage.getItem('favRooms')||'[]'); }catch(e){ return []; }
}
function saveFavs(list){ localStorage.setItem('favRooms', JSON.stringify(list)); }
function isFav(t){ return loadFavs().some(function(f){ return f.id===favId(t); }); }
function toggleFav(){
  if(!target) return;
  var list=loadFavs();
  var id=favId(target);
  var idx=list.findIndex(function(f){ return f.id===id; });
  var titleEl=document.getElementById('t4');
  var title=titleEl?titleEl.textContent:'';
  if(idx>=0){ list.splice(idx,1); }
  else{ list.push({id:id, title:title, kind:target.kind, floor:target.floor, code:target.code||null}); }
  saveFavs(list);
  updateFavBtn();
}
function updateFavBtn(){
  var btn=document.getElementById('favBtn');
  if(!btn || !target) return;
  btn.textContent = isFav(target) ? '★' : '☆';
}
/* 즐겨찾기 화면에서 직접 해제 : 방을 열지 않고도 목록의 ✕만 눌러서 바로 지울 수 있게 한다. */
function removeFav(id){
  saveFavs(loadFavs().filter(function(f){ return f.id!==id; }));
  renderFavorites();
  updateFavBtn();   // 지금 보고 있는 방이 방금 해제한 즐겨찾기면 s4의 별 표시도 같이 갱신
}
function renderFavorites(){
  var box=document.getElementById('favList');
  if(!box) return;
  var list=loadFavs();
  if(!list.length){
    box.innerHTML = LANG==='ko'
      ? '<div class="favEmpty">아직 즐겨찾기한 강의실이 없어요.<br>강의실 화면에서 ☆ 버튼을 눌러보세요.</div>'
      : '<div class="favEmpty">No favorite rooms yet.<br>Tap the ☆ button on a room screen to save one.</div>';
    return;
  }
  box.innerHTML='';
  list.forEach(function(f){
    var d=document.createElement('div'); d.className='favItem';
    var span=document.createElement('span'); span.className='favTitle'; span.textContent=t4TitleFor(f)||f.title;
    var actions=document.createElement('div'); actions.className='favActions';
    var openBtn=document.createElement('button');
    openBtn.className='starBtn'; openBtn.style.cssText='font-size:14px;color:#00E5FF;';
    openBtn.textContent=(LANG==='ko')?'열기 →':'Open →';
    openBtn.onclick=function(){ openFavorite(f); };
    var rmBtn=document.createElement('button');
    rmBtn.className='favRemove'; rmBtn.textContent='✕'; rmBtn.title=(LANG==='ko')?'즐겨찾기 해제':'Remove favorite';
    rmBtn.onclick=function(e){ e.stopPropagation(); removeFav(f.id); };
    actions.appendChild(openBtn); actions.appendChild(rmBtn);
    d.appendChild(span); d.appendChild(actions);
    box.appendChild(d);
  });
}
function openFavorite(f){
  openTarget({kind:f.kind, floor:f.floor, code:f.code}, f.floor, f.title);
}

/* ========== 건의함 : 실제 모습과 다른 건물 사진을 사용자가 찍어 올리면, 관리자가 직접
   검토(승인/거절)한 뒤 승인한 사진만 최신 사진으로 반영하는 사진 제보 시스템.
   1단계로 AI 자동판별 대신 '사람이 검토하는 관리자 페이지'로 구현한다.
   흐름 : 사용자 제출 → localStorage 대기열(SUG_QUEUE) 저장
         → 관리자가 #sph(사진 등록, 개발자 전용)에서 이어지는 #sadmin 화면에서 사진·메모를 보고
           적용할 위치 코드(호실번호 또는 BLD·B1·EV1~5·HALL1~5L/R)를 입력해 승인
         → 승인 즉시 ROOM_PHOTOS[코드] 맨 앞에 추가되어 그 위치의 대표 사진이 되고,
           서버(Firestore photos)에 올라가 다른 사용자의 앱도 다음에 열 때 받는다. ========== */
var sugPickedFile = null;
function sugLoadQueue(){
  try{ return JSON.parse(localStorage.getItem('sugQueue')||'[]'); }catch(e){ return []; }
}
function sugSaveQueue(){ try{ localStorage.setItem('sugQueue', JSON.stringify(SUG_QUEUE)); }catch(e){} }
var SUG_QUEUE = sugLoadQueue();
/* v49 : 서버에서 실시간으로 받은 대기 제보. 로그인한 관리자 기기에서 채워진다. */
var SUG_REMOTE = [];
/* 대기 목록 = 서버 목록 + 아직 서버로 못 보낸 이 폰의 제보 */
function sugPending(){
  var local = SUG_QUEUE.filter(function(s){ return s.status==='pending' && !s.synced; });
  return SUG_REMOTE.concat(local);
}
function sugFind(id){
  var r = null;
  SUG_REMOTE.forEach(function(x){ if(x.id===id) r = x; });
  if(r) return r;
  return SUG_QUEUE.find(function(x){ return x.id===id; }) || null;
}
function sugHandled(){ return SUG_QUEUE.filter(function(s){ return s.status!=='pending'; }); }
function sugBadgeSync(){
  var b = document.getElementById('sugAdminBadge');
  if(b){ var n = sugPending().length; b.textContent = n ? ' ('+n+')' : ''; }
}
function sugEsc(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

function sugPreview(input){
  var file = input.files && input.files[0];
  var box = document.getElementById('sugShot');
  if(!file || !box) return;
  sugPickedFile = file;
  var url = URL.createObjectURL(file);
  box.classList.add('has');
  box.innerHTML = '<img src="'+url+'" alt="제보 사진 미리보기">';
  /* v69 : 첫 장을 고른 뒤에만 "한 장 더" 를 보여 준다 */
  var more = document.getElementById('sugShot2');
  if(more) more.style.display = 'block';
}
/* v69 : 같은 자리에서 찍은 두 번째 사진 — 위치를 찾는 데만 쓰고 제보에는 첫 장만 남는다.
   실측(복도 920장) : 자리 54.9% → 61.5%, 층 63.3% → 70.1%, 5등 81.6% → 87.8% */
var sugPickedFile2 = null;
function sugPreview2(input){
  var file = input.files && input.files[0];
  var box = document.getElementById('sugShot2');
  if(!file || !box) return;
  sugPickedFile2 = file;
  box.classList.add('has');
  box.innerHTML = '<span class="ic">✅</span><span>'
    + ((LANG==='ko') ? '두 번째 사진 준비됨 — 다시 누르면 바꿀 수 있어요'
                     : 'Second photo ready — tap to replace') + '</span>';
}
function sugReset2(){
  sugPickedFile2 = null;
  var f2 = document.getElementById('sugFile2'); if(f2) f2.value = '';
  var box = document.getElementById('sugShot2');
  if(box){
    box.classList.remove('has');
    box.style.display = 'none';
    box.innerHTML = '<span class="ic">➕</span><span>'
      + ((LANG==='ko') ? '같은 자리에서 한 장 더 찍으면 더 잘 찾아요 (선택)'
                       : 'One more photo from the same spot helps (optional)') + '</span>';
  }
}
/* v53 : 층 선택 버튼 — 고른 층은 메모 끝에 'N층'으로 붙어 AI 힌트가 된다 */
var sugFloorPick = '';
function sugFloorSel(btn){
  var row = document.getElementById('sugFloorRow'); if(!row) return;
  var was = btn.classList.contains('on');
  Array.prototype.forEach.call(row.querySelectorAll('button'), function(b){ b.classList.remove('on'); });
  if(was){ sugFloorPick = ''; return; }
  btn.classList.add('on'); sugFloorPick = btn.getAttribute('data-f') || '';
}
function sugFloorReset(){
  sugFloorPick = '';
  var row = document.getElementById('sugFloorRow');
  if(row) Array.prototype.forEach.call(row.querySelectorAll('button'), function(b){ b.classList.remove('on'); });
}
/* 방금 보낸 제보 — '위치 바꾸기'로 고칠 수 있게 기억해 둔다 */
var SUG_LAST = null;
function sugFixPlace(){
  if(!SUG_LAST) return;
  var keep = SUG_LAST;
  pickOpen(keep.url, keep.note, keep.ai, function(code, ai2){
    go('ssug');
    if(!code) return;
    var i;
    for(i=0;i<SUG_QUEUE.length;i++){
      if(SUG_QUEUE[i].id === keep.id){
        SUG_QUEUE[i].ai = ai2;
        sugSaveQueue();
        if(typeof SUGDB !== 'undefined' && SUGDB.pushOne) SUGDB.pushOne(SUG_QUEUE[i]);
        break;
      }
    }
    var st = document.getElementById('sugStat');
    if(st){ st.style.color = '#39FF88'; st.textContent = '✓ 위치를 「' + pickName(code) + '」(으)로 고쳤습니다.'; st.classList.add('on'); }
    var fixRow = document.getElementById('sugFixRow');
    if(fixRow) fixRow.style.display = 'none';
  });
}

function sugSubmit(){
  var stat = document.getElementById('sugStat');
  if(!sugPickedFile){
    if(stat){
      stat.style.color = '#FF6B6B';
      stat.textContent = (LANG==='ko') ? '사진을 먼저 선택해 주세요.' : 'Please choose a photo first.';
      stat.classList.add('on');
    }
    return;
  }
  var btn = document.querySelector('#ssug .card .big');
  if(btn) btn.disabled = true;
  if(stat){
    stat.style.color = '#7C8AA0';
    stat.textContent = (LANG==='ko') ? '제출하는 중…' : 'Submitting…';
    stat.classList.add('on');
  }
  var noteEl = document.getElementById('sugNote');
  var noteVal = noteEl ? noteEl.value.trim() : '';
  /* v53 : 층 버튼을 골랐고 메모에 층이 없으면 메모에 붙인다 (관리자에게도 보이고, AI 힌트로도 쓰인다) */
  if(sugFloorPick && !/([1-5]\s*층|지하|B1)/i.test(noteVal)) noteVal = (noteVal ? noteVal + ' ' : '') + sugFloorPick;
  var pickedFile = sugPickedFile;
  // 사진 라이브러리와 같은 방식(phShrink)으로 압축해 저장 용량을 줄인다.
  phShrink(pickedFile, function(url){
    if(btn) btn.disabled = false;
    if(!url){
      if(stat){
        stat.style.color = '#FF6B6B';
        stat.textContent = (typeof PHFIX!=='undefined') ? PHFIX.reason()
          : ((LANG==='ko') ? '사진을 처리하지 못했어요. 다시 시도해 주세요.' : 'Could not process the photo. Please try again.');
      }
      return;
    }
    /* v44 : 큐에 넣기 전에 AI가 사진을 판별한다.
       품질 불합격·건물과 무관한 사진은 여기서 걸러 관리자에게 넘기지 않는다. */
    if(stat){ stat.style.color = '#7C8AA0'; stat.textContent = (LANG==='ko') ? 'AI가 사진을 확인하는 중…' : 'AI is checking the photo…'; }
    /* v57 : 번호판을 읽으려면 사진이 커야 한다. 저장은 1280px 그대로 두고,
       번호판 읽기에만 쓸 2400px 사본을 따로 만들어 넘긴다 (실패하면 그냥 원래 것으로 읽는다). */
    phShrink(pickedFile, function(big){
      /* v69 : 두 번째 사진이 있으면 위치 판별에만 함께 쓴다 (저장되는 사진은 첫 장) */
      if(!sugPickedFile2){ sugJudgeWith(url, big, noteVal, ai2Cb); return; }
      phShrink(sugPickedFile2, function(u2){
        sugJudgeWith(url, big, noteVal, ai2Cb, u2 ? [u2] : null);
      });
    }, 2400, 0.85);

    function ai2Cb(ai){
      /* 흐릿·너무 어두움 같은 사진 자체의 문제는 예전처럼 여기서 거른다 (위치 문제가 아니다) */
      if(ai.verdict === 'reject_quality'){
        SUGAI.showCard(ai);
        if(stat){ stat.style.color = '#FF6B6B'; stat.textContent = SUGAI.rejectMsg(ai); stat.classList.add('on'); }
        return;
      }
      /* 메모에 '옥상'처럼 범위 밖이라고 적혀 있으면 그대로 반려 */
      if(ai.verdict === 'out_of_scope' && ai.why === 'note'){
        SUGAI.showCard(ai);
        if(stat){ stat.style.color = '#FF6B6B'; stat.textContent = SUGAI.rejectMsg(ai); stat.classList.add('on'); }
        return;
      }
      /* v57 : AI가 확신할 때만 바로 접수하고, 그 밖에는 사람이 사진 보고 고른다.
         공대 3호관은 문·복도가 층마다 비슷해서 AI 혼자로는 한계가 뚜렷하다. */
      if(sugSure(ai)){
        sugFinishSubmit(url, noteVal, ai, stat, noteEl);
        return;
      }
      /* v59 : 위치를 못 정해도 그냥 접수한다.
         예전에는 여기서 "어디에서 찍으셨나요?" 화면을 띄워 사용자에게 고르게 했는데,
         처음 온 사람은 건물 구조도 호실 번호도 모른다 — 길을 잃어서 앱을 켠 사람에게
         어디인지 맞히라고 하는 셈이었다.
         AI 가 짐작한 후보는 기록에 그대로 남으므로, 관리자 화면에서 후보 5개를
         눌러 고르거나 직접 입력해 확정한다. */
      ai.verdict = 'unknown';
      ai.code = '';
      sugFinishSubmit(url, noteVal, ai, stat, noteEl);
    }
  });
}
/* v57 : AI 혼자 결정해도 되는가
   자료집에 있는 자리와 사진이 아주 많이 닮았고(0.82 이상) 2등과 차이도 뚜렷할 때만 바로 접수한다.
   (측정 : 이 조건에서 239장 중 99.2% 정확)

   번호판을 읽었을 때는 바로 확정하지 않는다. 측정해 보니 잘못 읽은 번호도 '확실하다'고 나오는 일이
   적지 않았고(68장 중 10건), 그중 절반은 실제로 있는 호실 번호라 걸러낼 방법이 없었다.
   대신 읽은 번호를 고르기 화면 맨 앞에 놓아 한 번 눌러 확인받는다 — 한 번의 탭으로 확실해진다. */
function sugSure(ai){
  if(!ai || ai.verdict !== 'match' || !ai.code) return false;
  if(ai.pickedByUser) return true;
  /* v59 : 번호판을 읽어 호실이 나왔으면 그것이 가장 확실하다.
     applyOcr 이 codeSource='ocr' 로 표시하는 경우는 이미
     "믿을 만한가" 검사(확신 60 이상 또는 앱이 아는 번호)를 통과한 것이다. */
  if(ai.codeSource === 'ocr') return true;
  /* v60 : 사진 판별(CNN)만으로는 확정하지 않는다.
     240장으로 재보니 이 경로의 정답률이 0% 였다 — 유사도가 높을수록
     오히려 더 틀렸다. 문턱을 올려도 나아지지 않는다. */
  return false;
}

/* 메모를 힌트로 넘기고(v53), 번호판은 큰 사본으로 읽는다(v57) */
function sugJudgeWith(url, big, noteVal, cb, extras){
  SUGAI.judge(url, cb, noteVal, big || null, extras || null);   /* v69 : extras = 같은 자리 추가 사진 */
}

/* AI 판정을 통과한 제보를 실제로 큐에 넣는다 (v44에서 분리) */
function sugFinishSubmit(url, noteVal, ai, stat, noteEl){
    var rec = {
      id: 'sug_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
      u: url, note: noteVal, ts: Date.now(), status: 'pending',
      ai: ai,
      qr: (typeof QRNAV!=='undefined' && QRNAV.gate) ? QRNAV.gate() : null
    };
    SUG_QUEUE.push(rec);
    sugSaveQueue();
    sugBadgeSync();
    /* v49 : 서버로 보낸다. 실패하면 이 폰에 남겨뒀다가 연결되면 다시 보낸다. */
    if(typeof SUGDB !== 'undefined') SUGDB.pushOne(rec);
    SUGAI.showCard(ai);
    /* v57 : AI가 알아서 정한 경우, 틀렸으면 바로 고칠 수 있게 버튼을 띄운다 */
    /* v59 : 이 단추도 같은 고르기 화면을 여는 것이라 함께 숨긴다.
       (화면과 함수는 그대로 남겨 두었으니 필요하면 이 한 줄만 되돌리면 된다) */
    var fixRow = document.getElementById('sugFixRow');
    if(fixRow) fixRow.style.display = 'none';
    SUG_LAST = { id: rec.id, url: url, note: noteVal, ai: ai };
    if(stat){
      stat.style.color = '#39FF88';
      stat.textContent = (LANG==='ko')
        ? '✓ 제출되었습니다! 관리자가 확인 후 최신 사진으로 반영해요.'
        : '✓ Submitted! A staff member will review it and apply it as the newest photo.';
      stat.classList.add('on');
    }
    var box = document.getElementById('sugShot');
    if(box){
      box.classList.remove('has');
      box.innerHTML = '<span class="ic">📷</span><span data-ko="탭해서 지금 보이는 모습을 촬영하거나 사진을 선택하세요" data-en="Tap to take a photo of what you see, or choose one">'
        + ((LANG==='ko') ? '탭해서 지금 보이는 모습을 촬영하거나 사진을 선택하세요' : 'Tap to take a photo of what you see, or choose one') + '</span>';
    }
    if(noteEl) noteEl.value = '';
    var fileInput = document.getElementById('sugFile'); if(fileInput) fileInput.value = '';
    sugPickedFile = null;
    if(typeof sugReset2 === 'function') sugReset2();     /* v69 */
    var fixRow0 = document.getElementById('sugFixRow'); if(fixRow0) fixRow0.style.display = 'none';
    if(typeof sugFloorReset === 'function') sugFloorReset();
}

/* ── 건의함 관리자(#sadmin) : 사람이 직접 승인/거절하는 검토 화면 ──
   BLD(건물 외부) 코드 하나에는 정문·후문·동문·서문의 안/밖 사진 8장이 한 묶음으로 들어있어서,
   그냥 앞자리에 끼워넣기만 하면 "그 자리 사진만" 정확히 바꿀 수 없다. 그래서 BLD로 승인할 때는
   세부 위치(정문/정문내부/후문/후문내부/동문/동문내부/서문/서문내부)를 선택해서, 기존 사진들
   중 그 위치 태그가 붙은 사진 딱 하나만 골라 교체하고 나머지 7장·순서는 그대로 둔다. */
var BLD_SUBLOCS = ['정문','정문내부','후문','후문내부','동문','동문내부','서문','서문내부'];
/* v73 : 빠른 버튼 → 코드 칸 채우기 */
function sugSetCode(id, code){
  var el = document.getElementById('sugCode_' + id);
  if(!el) return;
  el.value = code;
  sugSyncName(id);
}

/* ── v74 : 코드 대신 한글 이름으로 고르기 ──────────────────────
   관리자는 위치 코드를 알 필요가 없어야 한다. 코드를 아는 사람은 이 앱을
   만든 사람뿐이라, 코드를 요구하면 관리자를 다른 사람에게 넘길 수가 없다. */

/* 위치 코드 → 몇 층 묶음인가 (출입문은 '건물 외부'로 본다) */
function sugFloorOf(code){
  var c = String(code || '').toUpperCase();
  if(/^GATE_/.test(c)) return '건물 외부';
  return (typeof aidFloorOf === 'function') ? aidFloorOf(c) : '기타';
}
/* 위치 코드 → 사람이 읽는 이름. 호실은 학과 이름까지 붙여 준다 */
function sugPlaceName(code){
  var c = String(code || '');
  if(/^\d{5}/.test(c) && typeof roomTitle === 'function'){
    try { return roomTitle(c, 'ko'); } catch(e){}
  }
  return (typeof aidLabel === 'function') ? aidLabel(c) : c;
}
/* 한 층 안에서 장소를 성격별로 묶는다 (자주 쓰는 것이 위로 오게) */
var SUG_GROUPS = [
  {t:'라운지·로비',   rx:/^(LNG[1-5]|B1)$/},
  {t:'복도',          rx:/^HALL[1-5][LR]$/},
  {t:'엘리베이터',    rx:/^(EV[1-5]|EVIN[1-5]|EVB1)$/},
  {t:'강의실·연구실', rx:/^(\d{5}|KTC$)/},
  {t:'화장실·계단',   rx:/^(WC[1-5]|ES[1-5]|EMS[1-5])$/},
  {t:'출입문·외부',   rx:/^(BLD|GATE_)/}
];
function sugPlaceOptions(floor){
  var all = (typeof aidKnownCodes === 'function') ? aidKnownCodes() : [];
  var mine = all.filter(function(c){ return sugFloorOf(c) === floor; });
  /* v76 : 동문·서문이 GATE_E 와 GATE_EAST 두 이름으로 들어 있다.
     승인한 사진이 실제로 붙는 쪽(ROOM_PHOTOS 가 쓰는 이름)만 남긴다.
     짧은 쪽을 고르면 승인해도 안내 화면이 그대로여서 알아채기 어렵다. */
  mine = mine.filter(function(c){
    if(c === 'GATE_E' && mine.indexOf('GATE_EAST') >= 0) return false;
    if(c === 'GATE_W' && mine.indexOf('GATE_WEST') >= 0) return false;
    return true;
  });
  if(!mine.length) return '<option value="">이 층에 등록된 장소가 없습니다</option>';
  var used = {}, html = '<option value="">장소 고르기</option>';
  SUG_GROUPS.forEach(function(g){
    var items = mine.filter(function(c){ return !used[c] && g.rx.test(c); });
    items.forEach(function(c){ used[c] = 1; });
    if(!items.length) return;
    html += '<optgroup label="'+g.t+'">' + items.map(function(c){
      return '<option value="'+c+'">'+sugPlaceName(c)+'</option>'; }).join('') + '</optgroup>';
  });
  var rest = mine.filter(function(c){ return !used[c]; });
  if(rest.length){
    html += '<optgroup label="그 밖">' + rest.map(function(c){
      return '<option value="'+c+'">'+sugPlaceName(c)+'</option>'; }).join('') + '</optgroup>';
  }
  return html;
}
function sugPickFloor(id){
  var fs = document.getElementById('sugFloor_'+id), ps = document.getElementById('sugPlace_'+id);
  if(!fs || !ps) return;
  ps.innerHTML = fs.value ? sugPlaceOptions(fs.value) : '<option value="">← 먼저 층을 고르세요</option>';
  ps.value = '';
}
function sugPlacePick(id){
  var ps = document.getElementById('sugPlace_'+id), el = document.getElementById('sugCode_'+id);
  if(!ps || !el) return;
  if(ps.value) el.value = ps.value;
  sugSyncName(id);
}
/* 지금 고른 것이 무엇인지 한 줄로 보여 준다 — 승인 직전에 눈으로 확인하는 칸 */
function sugSyncName(id){
  var el = document.getElementById('sugCode_'+id), box = document.getElementById('sugChosen_'+id);
  if(!el || !box) return;
  var code = String(el.value || '').trim().toUpperCase();
  if(!code){ box.className = 'sugChosen none'; box.textContent = '아직 고르지 않았습니다'; return; }
  var known = (typeof aidKnownCodes === 'function') && aidKnownCodes().indexOf(code) >= 0;
  if(known){
    box.className = 'sugChosen';
    box.textContent = '✔ ' + sugPlaceName(code) + '  (' + code + ')';
  } else {
    box.className = 'sugChosen warn';
    box.textContent = '※ 앱에 없던 새 위치 「' + code + '」로 넣습니다';
  }
}
/* 화면을 다시 그린 뒤, 이미 채워져 있는 코드에 맞춰 층·장소 칸을 맞춰 둔다 */
function sugPresetOne(id){
  var el = document.getElementById('sugCode_'+id);
  if(!el) return;
  var code = String(el.value || '').trim().toUpperCase();
  if(!code) return;
  var fs = document.getElementById('sugFloor_'+id), fl = sugFloorOf(code);
  if(fs && typeof AID_FLOORS !== 'undefined' && AID_FLOORS.indexOf(fl) >= 0){
    fs.value = fl;
    sugPickFloor(id);
    var ps = document.getElementById('sugPlace_'+id);
    if(ps) ps.value = code;
  }
  sugSyncName(id);
}
function sugPresetAll(){
  sugPending().forEach(function(s){
    var el = document.getElementById('sugCode_'+s.id);
    if(!el) return;
    var code = String(el.value || '').trim().toUpperCase();
    if(code){
      var fs = document.getElementById('sugFloor_'+s.id);
      var fl = sugFloorOf(code);
      if(fs && AID_FLOORS.indexOf(fl) >= 0){
        fs.value = fl;
        sugPickFloor(s.id);
        var ps = document.getElementById('sugPlace_'+s.id);
        if(ps) ps.value = code;
      }
    }
    sugSyncName(s.id);
  });
}
/* v73 : 코드 칸에서 고를 수 있게 앱이 아는 위치를 한국어 이름과 함께 채운다.
   손으로 치지 않아도 되고, 없는 코드를 지어내는 실수도 줄어든다. */
function sugFillCodeList(){
  var dl = document.getElementById('sugCodeList');
  if(!dl || typeof aidKnownCodes !== 'function') return;
  dl.innerHTML = aidKnownCodes().map(function(c){
    var lb = (typeof aidLabel === 'function') ? aidLabel(c) : c;
    return '<option value="'+c+'">' + (lb && lb !== c ? c+' — '+lb : c) + '</option>';
  }).join('');
}
function sugAdminRender(){
  sugBadgeSync();
  sugFillCodeList();
  var list = document.getElementById('sugAdminList');
  if(!list) return;
  var pending = sugPending();
  if(!pending.length){
    list.innerHTML = '<div class="sugEmpty">대기 중인 제보가 없습니다.</div>';
  } else {
    var subOptions = '<option value="">(정문·후문 사진이면 세부 위치 선택 — 그 자리만 교체)</option>' +
      BLD_SUBLOCS.map(function(k){ return '<option value="'+k+'">'+k+'</option>'; }).join('');
    list.innerHTML = pending.slice().reverse().map(function(s){
      var d = new Date(s.ts);
      var when = (d.getMonth()+1)+'/'+d.getDate()+' '+
        (d.getHours()<10?'0':'')+d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes();
      var noteHtml = s.note ? sugEsc(s.note) : '<span class="sugNoNote">메모 없음</span>';
      return (
        '<div class="sugCard">' +
          /* v54 : 눌러서 크게 보기 (사진 자체는 용량이 커서 onclick에 넣지 않고 id로 찾는다) */
          '<div class="sugThumbWrap" onclick="zoomFromSug(\''+s.id+'\')" title="탭하면 크게 보기">' +
            '<img src="'+s.u+'" class="sugThumb" alt="제보 사진">' +
            '<span class="zoomBadge">🔍</span>' +
          '</div>' +
          '<div class="sugMeta">' +
            '<div class="sugNote">'+noteHtml+'</div>' +
            '<div class="sugWhen">'+when+(s.fid ? '' : '<span class="sugLocal">이 폰에서만 · 서버 미전송</span>')+'</div>' +
            (typeof SUGAI!=='undefined' ? SUGAI.adminBadge(s) : '') +
            /* v74 : 층 → 장소 를 한글 이름으로 고른다 (코드를 몰라도 된다) */
            '<div class="sugPick">' +
              '<select class="sugFloorSel" id="sugFloor_'+s.id+'" onchange="sugPickFloor(\''+s.id+'\')">' +
                '<option value="">층 고르기</option>' +
                (typeof AID_FLOORS !== 'undefined' ? AID_FLOORS : []).map(function(f){
                  return '<option value="'+f+'">'+f+'</option>'; }).join('') +
              '</select>' +
              '<select class="sugPlaceSel" id="sugPlace_'+s.id+'" onchange="sugPlacePick(\''+s.id+'\')">' +
                '<option value="">← 먼저 층을 고르세요</option>' +
              '</select>' +
            '</div>' +
            '<div class="sugChosen none" id="sugChosen_'+s.id+'">아직 고르지 않았습니다</div>' +
            '<div class="sugCodeLine"><label>직접 입력</label>' +
              '<input type="text" class="sugCodeInput" id="sugCode_'+s.id+'" list="sugCodeList" ' +
                'oninput="sugSyncName(\''+s.id+'\')" value="'+
                ((typeof SUGAI!=='undefined') ? SUGAI.autoCode(s) : '')+
                '" placeholder="코드를 아는 경우에만 (예: LNG3)"></div>' +
            /* v73 : 층마다 있는 라운지는 코드를 외우기 어려워 버튼으로 고른다 */
            '<div class="sugQuick">라운지 : ' +
              [1,2,3,4,5].map(function(f){
                return '<button type="button" onclick="sugSetCode(\''+s.id+'\',\'LNG'+f+'\')">' +
                       (f === 1 ? '1층 로비' : f+'층') + '</button>';
              }).join('') +
            '</div>' +
            '<select class="sugSubSel" id="sugSub_'+s.id+'">'+subOptions+'</select>' +
            /* v59 : 학습은 관리자 승인으로만 일어난다 — 위치를 가장 정확히 아는 사람이므로 */
            '<div class="sugLearnTip">✔ 승인하면 이 위치를 AI가 배웁니다 — 코드가 맞는지 확인해 주세요</div>' +
            '<div class="sugBtnRow">' +
              '<button class="sugApprove" onclick="sugApprove(\''+s.id+'\')">승인</button>' +
              '<button class="sugReject" onclick="sugReject(\''+s.id+'\')">거절</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }
  sugPresetAll();                                                   /* v74 */
  var hEl = document.getElementById('sugHandledInfo');
  if(hEl){ var n = sugHandled().length; hEl.textContent = n ? ('처리 완료 '+n+'건') : ''; }
}
function sugApprove(id){
  var s = sugFind(id);
  if(!s) return;
  var subSel = document.getElementById('sugSub_'+id);
  var sub = subSel ? subSel.value : '';
  var input = document.getElementById('sugCode_'+id);
  var code = sub ? 'BLD' : (input ? input.value.trim().toUpperCase() : '');
  if(!code){ alert('위치를 고르지 않았습니다.\n층을 고른 뒤 장소를 고르거나, 정문·후문이면 세부 위치를 선택해 주세요.'); return; }
  if(!ROOM_PHOTOS[code]) ROOM_PHOTOS[code] = [];
  if(sub){
    // 세부 위치 지정 : 그 위치 태그가 붙은 기존 사진 자리만 정확히 교체(전체 순서는 그대로)
    var arr = ROOM_PHOTOS[code];
    var taggedName = '건의함_' + sub + '.jpg';
    var idx = arr.findIndex(function(p){ return p.n.indexOf('('+sub+')') !== -1 || p.n === taggedName; });
    var newEntry = {n:taggedName, u:s.u, cap:s.note || sub};
    if(idx >= 0) arr[idx] = newEntry; else arr.unshift(newEntry);
  } else {
    ROOM_PHOTOS[code].unshift({n:'건의함_'+id+'.jpg', u:s.u, cap:s.note || undefined});
  }
  phNormalize();
  phRender();
  /* v45 : 관리자가 승인한 사진도 AI 정답표에 더한다 */
  /* v64 : 서버에 올라가면 syncServerOne 으로 모든 기기 공통 학습, 못 올라가면 이 기기에만 */
  var sugLearnLocal = function(){ if(typeof SUGAI !== 'undefined') SUGAI.learn(code, s.u, '건의함_'+id); };
  if(!(typeof SUGDB !== 'undefined' && s.fid)) sugLearnLocal();
  s.status = 'approved'; s.code = code + (sub ? ('-'+sub) : ''); s.handledTs = Date.now();
  /* v49 : 서버에도 승인 기록 + 승인된 사진을 모든 사용자에게 배포 */
  if(typeof SUGDB !== 'undefined' && s.fid){
    SUGDB.setStatus(s.fid, {status:'approved', code:s.code, handledTs:s.handledTs});
    SUGDB.publishPhoto({code:code, sub:sub||'', n:(sub ? '건의함_'+sub+'.jpg' : '건의함_'+id+'.jpg'),
                        u:s.u, cap:s.note || (sub||''), ts:Date.now(), sid:s.fid})
      .then(function(ent){
        if(!ent || !ent.pid){
          sugLearnLocal();
          /* v71 : 조용히 넘어가지 않는다 — 무엇이 안 됐는지 관리자에게 알린다 */
          sugSrvNote('⚠ <b>서버에 올리지 못했습니다 — 이 기기에만 반영됩니다.</b><br>'
            + '사유 : ' + ((typeof SUGDB !== 'undefined' && SUGDB.lastPubErr) ? SUGDB.lastPubErr : '알 수 없음') + '<br>'
            + '다른 기기에서는 이 사진도, 이 학습도 보이지 않습니다. '
            + '(사유가 permission-denied 면 Firestore 규칙에서 photos 쓰기를 열어야 합니다)', false);
          return;
        }
        (ROOM_PHOTOS[code] || []).forEach(function(q){ if(q.n === ent.n) q.pid = ent.pid; });
        if(typeof SUGAI !== 'undefined' && SUGAI.syncServerOne) SUGAI.syncServerOne(ent);
        sugSrvNote('✅ <b>서버에 올렸습니다 — 모든 기기에 반영됩니다.</b><br>'
          + '문서 번호 : ' + ent.pid + ' · 위치 : ' + code + '<br>'
          + '다른 기기에서 앱을 새로 열면 이 사진이 보이고, AI도 같이 배웁니다.', true);
      });
    SUG_REMOTE = SUG_REMOTE.filter(function(x){ return x.id!==id; });
  }
  sugSaveQueue();
  sugAdminRender();
}
/* v71 : 승인 결과를 관리자 화면 맨 위에 보여 준다.
   예전에는 서버 업로드가 실패해도 아무 표시 없이 이 기기에만 학습해서,
   "모든 기기에 반영된다"고 착각하기 쉬웠다. */
function sugSrvNote(msg, ok){
  var host = document.getElementById('sadmin');
  if(!host) return;
  var el = document.getElementById('sugSrvNote');
  if(!el){
    el = document.createElement('div');
    el.id = 'sugSrvNote';
    host.insertBefore(el, host.firstChild);
  }
  el.style.cssText = 'margin:10px 0;padding:10px 12px;border-radius:9px;font-size:12.5px;line-height:1.65;'
    + (ok ? 'background:#16301F;border:1px solid #2F6B44;color:#BFEBD0;'
          : 'background:#3A2020;border:1px solid #7C3B3B;color:#FFD2D2;');
  el.innerHTML = msg;
}

function sugReject(id){
  var s = sugFind(id);
  if(!s) return;
  s.status = 'rejected'; s.handledTs = Date.now();
  if(typeof SUGDB !== 'undefined' && s.fid){
    SUGDB.setStatus(s.fid, {status:'rejected', handledTs:s.handledTs});
    SUG_REMOTE = SUG_REMOTE.filter(function(x){ return x.id!==id; });
  }
  sugSaveQueue();
  sugAdminRender();
}
function sugAdminClearHandled(){
  if(!confirm('처리 완료된 제보 기록을 모두 지울까요?')) return;
  SUG_QUEUE = SUG_QUEUE.filter(function(x){ return x.status==='pending'; });
  sugSaveQueue();
  sugAdminRender();
}

/* ── 전체 사진 관리(#sphmgr) : 지금 ROOM_PHOTOS에 들어있는 모든 사진을 보고 골라서 지운다.
   추가는 #sph의 파일 선택·폴더 선택(phAdd)을 그대로 쓰고, 여기서는 조회·삭제만 다룬다. ── */
var sphMgrSelected = new Set();
/* 관리자 화면 입구 — 첫 화면 로고를 1.5초 안에 5번 연달아 누르면 로그인 화면이 뜬다.
   다른 사람이 우연히 들어오지 않게 숨긴 입구일 뿐이고, 막는 일은 서버 규칙이 한다.
   v84 : 예전 숫자 7자리 비밀번호는 코드에 글자 그대로 있어 누구나 볼 수 있었다 — 없앴다.
   관리자는 Firebase 계정(이메일·비밀번호)으로 로그인하고, 서버의 admins 명단에 있어야 한다. */
var pwGateFrom = 'sset';   // 뒤로가기 눌렀을 때 어디로 돌아갈지(설정에서 왔는지, 첫 화면 로고에서 왔는지)
var logoTapCount = 0, logoTapTimer = null;
function logoSecretTap(){
  logoTapCount++;
  if(logoTapTimer) clearTimeout(logoTapTimer);
  // 1.5초 안에 다음 탭이 없으면 카운트 리셋 — 5번을 "연속으로" 눌러야만 인정
  logoTapTimer = setTimeout(function(){ logoTapCount = 0; }, 1500);
  if(logoTapCount >= 5){
    logoTapCount = 0;
    if(logoTapTimer){ clearTimeout(logoTapTimer); logoTapTimer=null; }
    openAdminGate('s1');
  }
}
function openAdminGate(from){
  pwGateFrom = from || 'sset';
  var useFb = (typeof SUGDB !== 'undefined' && SUGDB.online());
  if(useFb){
    if(SUGDB.user()){ go('sph'); return; }          // 이미 관리자로 로그인돼 있으면 바로
    SUGDB.ensure().then(function(){ if(SUGDB.user() && document.getElementById('spwgate').classList.contains('on')) go('sph'); })['catch'](function(){});
  }
  fbGateShow(useFb);
  go('spwgate');
  if(useFb) setTimeout(function(){ var em = document.getElementById('fbEmail'); if(em) em.focus(); }, 60);
}/* 일부 iOS 브라우저/웹뷰 환경에서는 window.confirm()이 아예 응답하지 않아(눌러도 무반응)
   삭제 버튼이 안 눌리는 것처럼 보이는 문제가 있었다. 네이티브 confirm() 대신 직접 그린
   확인창으로 대체해서 안드로이드·아이폰 모두 같은 방식으로 동작하게 한다. */
function appConfirm(message, onYes){
  var ov = document.createElement('div');
  ov.className = 'appConfirmOverlay';
  var box = document.createElement('div');
  box.className = 'appConfirmBox';
  var p = document.createElement('p');
  p.textContent = message;
  var btns = document.createElement('div');
  btns.className = 'appConfirmBtns';
  var cancelBtn = document.createElement('button');
  cancelBtn.type = 'button'; cancelBtn.className = 'appConfirmCancel'; cancelBtn.textContent = '취소';
  var okBtn = document.createElement('button');
  okBtn.type = 'button'; okBtn.className = 'appConfirmOk'; okBtn.textContent = '삭제';
  btns.appendChild(cancelBtn); btns.appendChild(okBtn);
  box.appendChild(p); box.appendChild(btns);
  ov.appendChild(box);
  document.body.appendChild(ov);
  function close(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }
  cancelBtn.addEventListener('click', close);
  okBtn.addEventListener('click', function(){ close(); onYes(); });
  ov.addEventListener('click', function(e){ if(e.target === ov) close(); });
}
/* 관리자가 '전체 사진 관리'에서 지운 사진은 지금까지 메모리(ROOM_PHOTOS)에서만 지워져서,
   화면엔 안 보여도 앱을 껐다 켜면(다시 로드하면) 임베디드 원본이 그대로 되살아났다
   (안드로이드에서 "삭제했는데 재실행하면 그대로 있다"고 보고된 문제).
   지워진 사진의 키만 작게 localStorage에 남겨 두었다가, 다음 로드 때 그 목록을 다시 제외한다. */
function sphDeletedKeys(){
  try{ return JSON.parse(localStorage.getItem('sphDeletedPhotos')||'[]'); }catch(e){ return []; }
}
function sphSaveDeletedKeys(list){
  try{ localStorage.setItem('sphDeletedPhotos', JSON.stringify(list)); }catch(e){ /* 저장 실패해도 이번 세션엔 지워진 채로 보임 */ }
}
function sphMarkDeleted(keys){
  var cur = sphDeletedKeys();
  keys.forEach(function(k){ if(cur.indexOf(k) < 0) cur.push(k); });
  sphSaveDeletedKeys(cur);
}
/* 앱이 켜질 때 ROOM_PHOTOS가 임베디드 원본으로 채워진 직후 한 번 호출해서,
   이전에 삭제해 둔 사진들을 다시 제외시킨다. */
function sphApplyDeleted(){
  var del = sphDeletedKeys();
  if(!del.length) return;
  var delSet = {};
  del.forEach(function(k){ delSet[k] = true; });
  Object.keys(ROOM_PHOTOS).forEach(function(code){
    var arr = ROOM_PHOTOS[code];
    if(!arr) return;
    var keep = arr.filter(function(p){ return !delSet[sphMgrKey(code, p.n)]; });
    if(keep.length !== arr.length){
      if(keep.length) ROOM_PHOTOS[code] = keep; else delete ROOM_PHOTOS[code];
    }
  });
}
function sphMgrKey(code, n){ return code + '|' + n; }
function sphMgrRows(){
  var rows = [];
  Object.keys(ROOM_PHOTOS).forEach(function(code){
    (ROOM_PHOTOS[code] || []).forEach(function(p){ rows.push({code:code, n:p.n, u:p.u}); });
  });
  rows.sort(function(a, b){
    var fa = phFloorOf(a.code); fa = (fa===null || fa===undefined) ? -1 : fa;
    var fb = phFloorOf(b.code); fb = (fb===null || fb===undefined) ? -1 : fb;
    if(fa !== fb) return fa - fb;
    if(a.code !== b.code) return a.code < b.code ? -1 : 1;
    return 0;
  });
  return rows;
}
function sphMgrSyncBtns(){
  var info = document.getElementById('sphMgrSelInfo');
  if(info) info.textContent = sphMgrSelected.size ? (sphMgrSelected.size + '장 선택됨') : '';
  var delBtn = document.getElementById('sphMgrDelBtn');
  if(delBtn) delBtn.disabled = !sphMgrSelected.size;
  var emptyBtn = document.getElementById('sphMgrEmptyBtn');
  if(emptyBtn){
    emptyBtn.classList.toggle('on', sphMgrShowEmpty);
    emptyBtn.textContent = sphMgrShowEmpty ? '빈 위치 숨기기' : '빈 위치도 보기';
  }
}
/* ── 사진 추가(끌어다 놓기) ────────────────────────────────────────
   파일 탐색기에서 사진(또는 ZIP)을 끌어다 원하는 위치 묶음 위에 놓으면 그 자리에 바로 들어간다.
   놓은 위치가 곧 저장 위치이므로, 파일명으로 위치를 추측하는 #phsort 확인 화면을 거치지 않는다.
   (끌어놓기가 안 되는 휴대폰에서는 위치 제목 옆 ＋ 버튼이 같은 일을 한다.) */
var sphMgrShowEmpty = false;    // 사진이 0장인 위치까지 놓을 자리로 펼쳐 보일지
var sphMgrBusy = false;         // 읽는 중 중복 실행 방지

function sphMgrSay(msg){
  var el = document.getElementById('sphMgrDropStat');
  if(el) el.textContent = msg || '';
}
function sphMgrToggleEmpty(){
  sphMgrShowEmpty = !sphMgrShowEmpty;
  sphMgrRender();
}
/* 지운 사진은 sphDeletedPhotos에 키가 남아 다음 로드 때 다시 제외되므로,
   같은 이름으로 새로 넣었다면 그 표시를 지워 줘야 재실행 후에도 남는다. */
function sphUnmarkDeleted(keys){
  var cur = sphDeletedKeys();
  var next = cur.filter(function(k){ return keys.indexOf(k) < 0; });
  if(next.length !== cur.length) sphSaveDeletedKeys(next);
}
/* at : 그 위치의 사진 목록에서 몇 번째 자리에 끼워 넣을지(0 = 맨 앞).
        비워 두면 맨 뒤에 붙인다. 사진 순서는 곧 안내 화면에서 넘겨 보는 순서이고,
        맨 앞 사진이 대표 사진이라 순서를 직접 정할 수 있어야 한다. */
/* v64 : 관리자가 앱 안에서 넣고 뺀 사진을 모든 기기에 반영한다 (로그인 상태일 때) */
function sphSrvOn(){ return typeof SUGDB !== 'undefined' && SUGDB.user && !!SUGDB.user(); }
function sphSrvAdd(code, ent){
  if(!sphSrvOn()) return;
  SUGDB.unhidePhoto(code, ent.n);
  SUGDB.publishPhoto({code:code, n:ent.n, u:ent.u, cap:'', ts:Date.now()}).then(function(r){
    if(!r || !r.pid) return;
    ent.pid = r.pid;
    if(typeof SUGAI !== 'undefined' && SUGAI.syncServerOne) SUGAI.syncServerOne(r);
  });
}
function sphSrvLookup(keys){
  return keys.map(function(key){
    var i = key.indexOf('|'), code = key.slice(0, i), n = key.slice(i + 1);
    var p = (ROOM_PHOTOS[code] || []).filter(function(q){ return q.n === n; })[0];
    return {code:code, n:n, pid:(p && p.pid) || ''};
  });
}
function sphSrvRemove(list){
  if(!sphSrvOn() || !list.length) return;
  list.forEach(function(x){
    if(x.pid){
      SUGDB.unpublishPhoto(x.pid);
      if(typeof SUGAI !== 'undefined' && SUGAI.srvDrop) SUGAI.srvDrop(x.pid);
    }
    SUGDB.hidePhoto(x.code, x.n);          // 원래 사진이든 올린 사진이든 이름으로도 막아 둔다
  });
  sphMgrSay(list.length + '장 뺐습니다 — 모든 기기에 반영됩니다.');
}
function sphMgrAddFiles(code, files, at){
  if(!code || !files || !files.length) return;
  if(sphMgrBusy){ sphMgrSay('앞의 사진을 읽는 중입니다. 잠시만요…'); return; }
  sphMgrBusy = true; PH_SKIP = [];
  sphMgrSay('사진을 여는 중…');
  phCollect(files, function(items){
    if(!items.length){
      sphMgrBusy = false;
      sphMgrSay('넣을 수 있는 사진이 없습니다. (jpg·png·webp·zip)');
      return;
    }
    var i = 0, ok = 0, dup = 0, bad = 0, added = [];
    var have = (ROOM_PHOTOS[code] || []).length;
    var pos = (at === null || at === undefined) ? have : Math.max(0, Math.min(at, have));
    var startPos = pos;
    (function step(){
      if(i >= items.length){
        sphMgrBusy = false;
        if(ok){
          sphUnmarkDeleted(added);
          phRebuildRoomNames();
          phRender();
        }
        sphMgrRender();
        sphMgrSay(phDestName(code) + ' ' + (ok ? ((startPos + 1) + '번째 자리에 ') : '') + ok + '장 넣었습니다.' +
          (dup ? ('  (이름이 같은 ' + dup + '장 건너뜀)') : '') +
          (bad ? ('  (읽지 못한 ' + bad + '장 제외)') : ''));
        return;
      }
      var it = items[i++];
      sphMgrSay('사진 읽는 중…  ' + i + ' / ' + items.length);
      phShrink(it.b, function(url){
        if(url){
          var base = it.n.split('/').pop();
          if(!ROOM_PHOTOS[code]) ROOM_PHOTOS[code] = [];
          if(ROOM_PHOTOS[code].some(function(p){ return p.n === base; })){
            dup++;
          }else{
            var ent = {n:base, u:url};
            ROOM_PHOTOS[code].splice(pos, 0, ent);
            sphSrvAdd(code, ent);               /* v64 : 모든 기기에 반영 */
            pos++;                                    // 여러 장이면 고른 순서 그대로 이어서 끼운다
            added.push(sphMgrKey(code, base));
            ok++;
          }
        }else{ bad++; }
        setTimeout(step, 0);
      });
    })();
  });
}
/* 화면에 그릴 묶음 목록 : [{code, rows}] — '빈 위치도 보기'가 켜져 있으면 사진 0장인 위치도 포함 */
function sphMgrGroups(){
  var map = {}, codes = [];
  sphMgrRows().forEach(function(r){
    if(!map[r.code]){ map[r.code] = []; codes.push(r.code); }
    map[r.code].push(r);
  });
  if(sphMgrShowEmpty){
    phTargets().forEach(function(t){
      if(!map[t.code]){ map[t.code] = []; codes.push(t.code); }
    });
  }
  codes.sort(function(a, b){
    var fa = phFloorOf(a); fa = (fa===null || fa===undefined) ? -1 : fa;
    var fb = phFloorOf(b); fb = (fb===null || fb===undefined) ? -1 : fb;
    if(fa !== fb) return fa - fb;
    return a < b ? -1 : (a > b ? 1 : 0);
  });
  return codes.map(function(c){ return {code:c, rows:map[c]}; });
}
function sphMgrRender(){
  var list = document.getElementById('sphMgrList');
  if(!list) return;
  if(!list._mgrBound){
    list._mgrBound = true;
    list.addEventListener('change', function(e){
      var chk = e.target.closest('.mgrChk');
      if(!chk) return;
      var key = sphMgrKey(chk.dataset.code, chk.dataset.name);
      if(chk.checked) sphMgrSelected.add(key); else sphMgrSelected.delete(key);
      sphMgrSyncBtns();
    });
    list.addEventListener('click', function(e){
      var add = e.target.closest('.mgrAdd');
      if(add){ sphMgrPickFor(add.dataset.code); return; }
      var btn = e.target.closest('.mgrDel');
      if(!btn) return;
      sphMgrDeleteOne(btn.dataset.code, btn.dataset.name);
    });
    /* 끌어다 놓기 : 묶음 테두리로 '어느 위치'인지, 사진 사이 파란 선으로 '몇 번째 자리'인지 보여준다.
       마우스가 어느 사진 줄의 위/아래 절반에 있는지로 끼울 자리를 정한다. */
    var overSec = null;
    function clearIns(){
      var m = list.querySelectorAll('.mgrRow.dropBefore, .mgrRow.dropAfter');
      for(var i=0;i<m.length;i++) m[i].classList.remove('dropBefore', 'dropAfter');
    }
    function setOver(sec){
      if(overSec === sec) return;
      if(overSec) overSec.classList.remove('over');
      overSec = sec;
      if(sec) sec.classList.add('over');
      if(!sec) clearIns();
    }
    /* 커서 위치 → 끼워 넣을 순번(0 = 맨 앞). 사진이 없는 묶음이면 0. */
    function insertIdxAt(sec, y){
      var rows = sec.querySelectorAll('.mgrRow');
      for(var i=0;i<rows.length;i++){
        var r = rows[i].getBoundingClientRect();
        if(y < r.top + r.height/2) return i;
      }
      return rows.length;
    }
    function markIns(sec, idx){
      clearIns();
      var rows = sec.querySelectorAll('.mgrRow');
      if(!rows.length) return;
      if(idx >= rows.length) rows[rows.length-1].classList.add('dropAfter');
      else rows[idx].classList.add('dropBefore');
    }
    function secOf(e){ return (e.target && e.target.closest) ? e.target.closest('.mgrSec') : null; }
    list.addEventListener('dragover', function(e){
      var sec = secOf(e);
      if(!sec){ setOver(null); return; }
      e.preventDefault();
      if(e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      setOver(sec);
      markIns(sec, insertIdxAt(sec, e.clientY));
    });
    list.addEventListener('dragleave', function(e){
      if(!list.contains(e.relatedTarget)) setOver(null);
    });
    list.addEventListener('drop', function(e){
      var sec = secOf(e);
      if(!sec){ setOver(null); return; }
      e.preventDefault(); e.stopPropagation();
      var idx = insertIdxAt(sec, e.clientY);
      setOver(null); clearIns();
      if(e.dataTransfer && e.dataTransfer.files) sphMgrAddFiles(sec.dataset.code, e.dataTransfer.files, idx);
    });
  }
  var groups = sphMgrGroups();
  var rowCount = 0;
  groups.forEach(function(g){ rowCount += g.rows.length; });
  var total = document.getElementById('sphMgrTotal');
  if(total) total.textContent = '총 ' + rowCount + '장';
  if(!groups.length){
    list.innerHTML = '<div class="sugEmpty">등록된 사진이 없습니다. 위의 <b>빈 위치도 보기</b>를 켜면 ' +
      '사진을 끌어다 놓을 위치가 모두 나옵니다.</div>';
    sphMgrSyncBtns();
    return;
  }
  var html = '';
  groups.forEach(function(g){
    html += '<div class="mgrSec" data-code="' + sugEsc(g.code) + '">' +
      '<div class="mgrGroup">' +
        '<span class="mgrGName">' + sugEsc(phCap(g.code)) + ' (' + sugEsc(g.code) + ')</span>' +
        '<span class="mgrGCnt">' + g.rows.length + '장</span>' +
        '<button type="button" class="mgrAdd" data-code="' + sugEsc(g.code) + '" title="이 위치에 사진 넣기">＋</button>' +
      '</div>';
    if(!g.rows.length){
      html += '<div class="mgrEmptyHint">사진 없음 — 여기에 끌어다 놓으세요</div>';
    }
    g.rows.forEach(function(r){
      var key = sphMgrKey(r.code, r.n);
      var checked = sphMgrSelected.has(key) ? 'checked' : '';
      html += '<div class="mgrRow">' +
        '<input type="checkbox" class="mgrChk" data-code="' + sugEsc(r.code) + '" data-name="' + sugEsc(r.n) + '" ' + checked + '>' +
        '<img src="' + r.u + '" class="mgrThumb" alt="">' +
        '<span class="mgrName">' + sugEsc(r.n) + '</span>' +
        '<button type="button" class="mgrDel" data-code="' + sugEsc(r.code) + '" data-name="' + sugEsc(r.n) + '">✕</button>' +
      '</div>';
    });
    html += '</div>';
  });
  list.innerHTML = html;
  sphMgrSyncBtns();
}
/* ＋ 버튼 : 끌어놓기가 안 되는 기기용 — 고른 파일을 그 위치에 그대로 넣는다. */
var sphMgrPickCode = '';
function sphMgrPickFor(code){
  var f = document.getElementById('sphMgrFile');
  if(!f) return;
  sphMgrPickCode = code;
  f.click();
}
function sphMgrRemove(code, name){
  var arr = ROOM_PHOTOS[code];
  if(!arr) return;
  var idx = arr.findIndex(function(p){ return p.n === name; });
  if(idx >= 0) arr.splice(idx, 1);
  if(!arr.length) delete ROOM_PHOTOS[code];
}
function sphMgrDeleteOne(code, name){
  appConfirm('이 사진을 삭제할까요?', function(){
    var srvList = sphSrvLookup([sphMgrKey(code, name)]);     /* v64 */
    sphMgrRemove(code, name);
    sphSrvRemove(srvList);
    sphMgrSelected.delete(sphMgrKey(code, name));
    sphMarkDeleted([sphMgrKey(code, name)]);
    phRender();
    sphMgrRender();
  });
}
function sphMgrDeleteSelected(){
  if(!sphMgrSelected.size){ alert('삭제할 사진을 먼저 선택해 주세요.'); return; }
  var keys = Array.prototype.slice.call(sphMgrSelected);
  appConfirm(sphMgrSelected.size + '장을 삭제할까요? 되돌릴 수 없습니다.', function(){
    var srvList = sphSrvLookup(keys);                         /* v64 */
    keys.forEach(function(key){
      var idx = key.indexOf('|');
      sphMgrRemove(key.slice(0, idx), key.slice(idx + 1));
    });
    sphMarkDeleted(keys);
    sphSrvRemove(srvList);                                    /* v64 : 모든 기기에 반영 */
    sphMgrSelected.clear();
    phRender();
    sphMgrRender();
  });
}
function sphMgrSelectAll(){
  sphMgrRows().forEach(function(r){ sphMgrSelected.add(sphMgrKey(r.code, r.n)); });
  sphMgrRender();
}
function sphMgrClearSel(){
  sphMgrSelected.clear();
  sphMgrRender();
}

/* ========== 한/영 전환: data-ko / data-en 속성이 있는 모든 요소에 즉시 적용(전체 화면 공통) ========== */
var LANG='ko';
function setLang(lang){
  LANG = (lang==='en') ? 'en' : 'ko';
  applyLang();
}
function toggleLang(){ setLang(LANG==='ko' ? 'en' : 'ko'); }
function applyLang(){
  document.querySelectorAll('[data-ko]').forEach(function(el){
    var v = el.getAttribute(LANG==='ko' ? 'data-ko' : 'data-en');
    if(v!==null) el.innerHTML = v;
  });
  document.querySelectorAll('[data-ko-placeholder]').forEach(function(el){
    var v = el.getAttribute(LANG==='ko' ? 'data-ko-placeholder' : 'data-en-placeholder');
    if(v!==null) el.placeholder = v;
  });
  var koBtn=document.getElementById('langKo'), enBtn=document.getElementById('langEn');
  if(koBtn && enBtn){
    koBtn.classList.toggle('langActive', LANG==='ko');
    enBtn.classList.toggle('langActive', LANG==='en');
  }
  var favBox=document.getElementById('favList');
  if(favBox && typeof renderFavorites==='function') renderFavorites();
  if(document.getElementById('recentList') && typeof renderRecent==='function') renderRecent();
  if(typeof guideRender==='function' && document.getElementById('gTitle')) guideRender(guideIdx);
  if(document.getElementById('cats') && typeof buildCats==='function') buildCats();
  if(typeof target!=='undefined' && target && document.getElementById('t4') && typeof t4TitleFor==='function'){
    document.getElementById('t4').textContent = t4TitleFor(target);
  }
  if(typeof syncTripBtn==='function') syncTripBtn();
  if(typeof rebuildAllFloors==='function') rebuildAllFloors();
  if(typeof curFloor!=='undefined' && curFloor!==undefined && typeof groupB!=='undefined' && groupB && typeof showFloorDetail==='function') showFloorDetail(curFloor);
  if(typeof refreshGuideTitles==='function') refreshGuideTitles();
  if(typeof refreshAllPhotoLang==='function') refreshAllPhotoLang();
  if(typeof steps!=='undefined' && steps && steps.length && typeof render6==='function' && document.getElementById('ins')) render6(true);
  document.title = (LANG==='ko') ? '공대 3호관 길안내' : 'Engineering Bldg.3 Navigation';
}

/* ========== 이용안내: 페이지형(다음/이전) ========== */
var guideIdx = 0;
var GUIDE_PAGES = [
  { ko:{ t:'📖 기본 사용법 (1/2)',
         b:'<b>👋 환영합니다</b><br>공대 3호관이 처음이거나 강의실 위치가 헷갈리는 신입생·재학생을 위한 앱이에요.<br><br>' +
           '<b>① 강의실 찾기</b><br>"시작하기"를 누르고 검색창에 강의실 번호(예: 13101), 교수님 성함, 또는 학과 사무실 이름을 입력하세요. 시간표에 적힌 번호 그대로 입력하면 되고, 오타가 나도 비슷한 번호가 자동으로 함께 나와요.<br><br>' +
           '<b>② 3D 화면 보기</b><br>손가락 1개로 드래그하면 회전, 2개로 드래그하면 확대·이동이 돼요. 층을 누르면 그 층만 자세히 볼 수 있고, ⟳ 버튼으로 처음 각도로 돌아옵니다.<br><br>' +
           '<b>③ 층별 상세 화면</b><br>실제로 그 층에 들어섰을 때 보는 방향(헤딩업)에 맞춰져 있어서, 복도를 걸으며 지도 보듯 방향을 확인할 수 있어요.<br><br>' +
           '<b>④ 길안내 시작</b><br>정문 맞은편 엘리베이터가 출발점이에요. "길안내 시작"을 누르면 빨간 화살표와 실제 사진을 따라 한 단계씩 안내받고, "▶ 경로 미리보기"를 누르면 실제로 걷는 눈높이로 문 앞까지 자동으로 보여주고, "🚶 직접 걸어보기"를 누르면 바닥을 눌러 직접 걸어다닐 수 있어요.' },
    en:{ t:'📖 Basics (1/2)',
         b:"<b>👋 Welcome</b><br>This app is for new and current students who are unfamiliar with Engineering Building 3 or still get confused about room locations.<br><br>" +
           "<b>① Find a room</b><br>Tap \"Start\", then type a room number (e.g. 13101), professor name, or department office name into the search box. Just type what's on your timetable — even with a small typo, similar numbers show up automatically.<br><br>" +
           "<b>② Use the 3D view</b><br>Drag with 1 finger to rotate, 2 fingers to zoom and pan. Tap a floor to see it in detail, and tap ⟳ to return to the original angle.<br><br>" +
           "<b>③ Floor detail view</b><br>It's oriented to match the direction you'd actually face on that floor, so you can check direction like reading a map while walking.<br><br>" +
           "<b>④ Start navigation</b><br>All routes start from the elevator across from the main entrance. Tap \"Start Navigation\" to follow the red arrow and real photos step by step, or watch the whole route at eye level with \"▶ Route Preview\" — or roam the corridors yourself with \"🚶 Walk It Yourself\"." } },
  { ko:{ t:'📖 즐겨찾기 & 팁 (2/2)',
         b:'<b>⑤ 즐겨찾기</b><br>강의실 화면에서 별표를 누르면 저장돼요. 첫 화면 오른쪽 위 ⭐ 버튼으로 다시 볼 수 있어요. 학기 초에 이번 학기 강의실을 미리 즐겨찾기 해두면 훨씬 빠릅니다.<br><br>' +
           '<b>⑥ 지하 1층(B1) 창의존</b><br>B1엔 창의존(창의 활동 공간)이 있어요. 층 선택에서 "B1"을 누르면 엘리베이터·계단 위치와 나가는 문을 볼 수 있어요.<br><br>' +
           '<b>⑦ 사진이 실제와 다르면?</b><br>설정 화면의 "건의함"에서 지금 보이는 모습을 직접 촬영해 올려주세요. 검토 후 반영되면 다음에 오는 학생들에게도 도움이 됩니다.<br><br>' +
           '<b>⑧ 한/영 전환</b><br>설정 화면에서 "한글"/"영어" 버튼을 누르면 앱 전체 언어가 바로 바뀝니다.<br><br>' +
           '<b>💡 팁</b><br>검색이 안 되면 숫자만 정확히 입력했는지 확인해보고, 방향이 헷갈리면 사진 속 화살표와 실제 복도 모습을 나란히 비교해보세요. 불편한 점은 언제든 건의함으로 알려주세요.' },
    en:{ t:'📖 Favorites & Tips (2/2)',
         b:"<b>⑤ Favorites</b><br>Tap the star on a room screen to save it, and view it again with the ⭐ button at top right. Favoriting this semester's rooms early makes things much faster.<br><br>" +
           "<b>⑥ B1 Creative Zone</b><br>B1 has a Creative Zone. Tap \"B1\" in the floor selector to see the elevator, stairs, and the door leading out.<br><br>" +
           "<b>⑦ Photo looks different?</b><br>Go to \"Suggestion Box\" in Settings and upload a photo of what you actually see. Once reviewed, it helps future students too.<br><br>" +
           "<b>⑧ Switch language</b><br>In Settings, tap \"한글\"/\"영어\" to switch the whole app's language instantly.<br><br>" +
           "<b>💡 Tips</b><br>If search finds nothing, double-check the numbers you typed. If direction feels confusing, compare the photo's arrow with the real hallway. Feel free to report anything inconvenient via the Suggestion Box." } }
];
function guideRenderProg(){
  var wrap = document.getElementById('gProg');
  if(!wrap) return;
  wrap.innerHTML = GUIDE_PAGES.map(function(_,i){ return '<i class="'+(i<=guideIdx?'on':'')+'"></i>'; }).join('');
}
function guideRender(idx){
  if(typeof idx==='number') guideIdx = Math.max(0, Math.min(GUIDE_PAGES.length-1, idx));
  var p = GUIDE_PAGES[guideIdx];
  var d = (LANG==='ko') ? p.ko : p.en;
  var tEl = document.getElementById('gTitle'), bEl = document.getElementById('gBody');
  if(!tEl || !bEl) return;
  tEl.innerHTML = d.t;
  bEl.innerHTML = d.b;
  var scroller = document.getElementById('gScroll');
  if(scroller) scroller.scrollTop = 0;
  var pv = document.getElementById('gPv'), nx = document.getElementById('gNx');
  if(pv) pv.style.visibility = (guideIdx===0) ? 'hidden' : 'visible';
  if(nx){
    if(guideIdx === GUIDE_PAGES.length-1){
      nx.innerHTML = (LANG==='ko') ? '닫기' : 'Close';
      nx.onclick = function(){ go('sset'); };
    } else {
      nx.innerHTML = (LANG==='ko') ? '다음 ›' : 'Next ›';
      nx.onclick = function(){ guideNext(); };
    }
  }
  guideRenderProg();
}
function guideNext(){ guideRender(guideIdx+1); }
function guidePrev(){ guideRender(guideIdx-1); }

/* ========== 카테고리 (단어 추후 추가) ========== */
var CATEGORIES=[
  {ic:'🚪', name:{ko:'강의실',en:'Rooms'}, sub:{ko:'강의실 번호, 교수님 성함, 기타 등으로 찾기',en:'Search by room number, professor name, etc.'}, act:function(){
      clearSearch(); go('s3');
      var nq=document.getElementById('nq');
      if(nq) setTimeout(function(){ nq.focus(); }, 120);   // 화면 들어오면 바로 자판이 올라오게
    }},
  {ic:'🚻', name:{ko:'화장실',en:'Restroom'}, sub:{ko:'가장 가까운 화장실로 길안내',en:'Directions to the nearest restroom'}, act:function(){ pickToilet(); }},
  {ic:'📚', name:{ko:'크리에이티브 존',en:'Creative Zone'}, sub:{ko:'지하 1층 · 자유 열람 공간',en:'B1 · Free study space'}, act:function(){ pickZone(); }},
  {ic:'🚨', name:{ko:'비상계단',en:'Emergency Stairs'}, sub:{ko:'가장 가까운 비상계단으로 길안내',en:'Directions to the nearest emergency stairs'}, act:function(){ pickEmstair(); }},
  {ic:'🛠️', name:{ko:'추후 변경',en:'Coming soon'}, sub:{ko:'추후 업데이트 예정입니다',en:'This feature is coming in a future update.'}}
];
function t4TitleFor(t){
  if(!t) return '';
  if(t.kind==='toilet')  return (LANG==='ko') ? '화장실 위치' : 'Restroom location';
  if(t.kind==='zone')    return (LANG==='ko') ? '크리에이티브 존 위치' : 'Creative Zone location';
  if(t.kind==='emstair') return (LANG==='ko') ? '비상계단 위치' : 'Emergency stairs location';
  if(t.kind==='room')    return roomTitle(t.code) + ((LANG==='ko') ? ' 위치' : ' location');
  return '';
}
function openTarget(t, floor){
  target=t; curFloor=floor;
  if(typeof fpHideRoofAsk==='function') fpHideRoofAsk();  // 새 목적지를 고르면 옥상 확인 패널이 남아있지 않게
  /* v42 : QR로 출입문을 스캔했으면 그 문의 층에서 출발한다. 스캔 안 했으면 기존대로 1층. */
  startFloor = (typeof QRNAV!=='undefined' && QRNAV.floor()) || 1;   // 기본 출발층 = 1층(정문). 첫 방문자는 대개 정문에서 시작하므로. 다른 층이면 사용자가 직접 선택.
  document.getElementById('t4').textContent=t4TitleFor(t);
  // 카메라가 항상 건물 한가운데(0, 건물 Z중앙)만 보고 있어서, 목적지가 건물 양 끝(정문·서문 쪽)에
  // 있으면 목적지 이름표·강의실이 화면 가장자리에 걸려 잘리는 문제가 있었음 → 목적지 쪽으로
  // 시선을 어느 정도 옮긴다(완전히 목적지로만 쏠리면 건물 전체 모양이 안 보이므로 60%만 이동).
  if(typeof targetPos==='function'){
    var tp = targetPos();
    camTarget.x = tp.x*0.6;
    camTarget.z = (BUILDING_MID_Z + (tp.z-BUILDING_MID_Z)*0.6) * BUILDING_Z_STRETCH;
  }
  buildFloorPicker(); buildStartFloorPicker(); highlight3D(); startPersonTrip(); go('s4');
  // highlight3D()→layout()가 카메라 높이(camTarget.y)를 건물 세로 한가운데로 되돌려 놓기 때문에,
  // 목적지가 맨 위(5F)나 맨 아래(B1)처럼 끝쪽 층이면 층 번호·라벨이 화면 위/아래 끝에 걸려
  // 잘리는 문제가 있었음 → 출발층·목적지층의 중간 높이 쪽으로 절반만 옮겨서 보정한다.
  if(typeof lvIndex==='function' && typeof SP!=='undefined'){
    var midIdx = (lvIndex(startFloor) + lvIndex(target.floor)) / 2;
    var wantY = midIdx*SP + SLAB + 0.8;
    var defY = SP*(LEVELS.length-1)/2;
    camTarget.y = defY + (wantY-defY)*0.5;
  }
}
/* 화장실·크리에이티브 존은 번호 검색 화면을 거치지 않고 바로 들어오므로,
   뒤로가기도 '무엇을 찾으세요?' 화면으로 돌아가야 한다. */
function backFromS4(){
  go(target && target.kind!=='room' ? 'scat' : 's3');
}
/* 3D 화면 전체화면 모드 : 헤더·안내문·층 버튼 등을 숨기고 3D 캔버스만 화면 가득 채운다.
   유튜브 쇼츠처럼 안(좌측 상단 뒤로가기 · 그 오른쪽 이동경로 버튼)에서 바로 조작할 수 있게 한다. */
function enterFullscreen3D(){
  var s4=document.getElementById('s4'), ph=document.querySelector('.phone');
  if(s4) s4.classList.add('fsMode');
  if(ph) ph.classList.add('fsActive');
  resize3D();
  setTimeout(function(){ resize3D(); }, 80);
}
function exitFullscreen3D(){
  var s4=document.getElementById('s4'), ph=document.querySelector('.phone');
  if(s4) s4.classList.remove('fsMode');
  if(ph) ph.classList.remove('fsActive');
  resize3D();
  setTimeout(function(){ resize3D(); }, 80);
}
function pickToilet(){ openTarget({kind:'toilet', floor:1}, 1, '화장실 위치'); }
function pickZone(){ openTarget({kind:'zone', floor:'B1'}, 'B1', '크리에이티브 존 위치'); }
/* v146(요청 반영): 예전엔 어느 층에 있든 1층 비상계단으로 안내했다 →
   지금 서 있는 층의 비상계단(= 가장 가까운 비상계단)으로 안내한다. */
function pickEmstair(){
  var sf = (typeof startFloor!=='undefined' && startFloor) ? startFloor : 1;
  openTarget({kind:'emstair', floor:sf}, sf, '비상계단 위치');
}
function buildCats(){
  var box=document.getElementById('cats'); box.innerHTML='';
  CATEGORIES.forEach(function(c){
    var b=document.createElement('button');
    var nm = (LANG==='ko') ? c.name.ko : c.name.en;
    var sb = c.sub ? ((LANG==='ko') ? c.sub.ko : c.sub.en) : '';
    b.innerHTML='<span class="ic">'+c.ic+'</span>'
      +'<span class="txt"><span class="nm">'+nm+'</span>'
      +(sb?'<small>'+sb+'</small>':'')+'</span>';
    if(c.act) b.onclick=c.act; else b.style.opacity='0.45';
    box.appendChild(b);
  });
}

/* ========== 최근 기록 (강의실 검색) ========== */
/* 최대 개수 : 화면에 너무 많이 쌓이지 않도록 4개까지만 기억한다. */
var RECENT_MAX = 4;
/* 아이폰 등 일부 브라우저(특히 file:// 로 열었을 때)는 localStorage가 매번
   안정적으로 남아있지 않을 수 있다. 길안내를 마치고 강의실 찾기로 돌아왔을 때
   최근 기록이 사라져 보이는 문제를 막기 위해, 앱이 켜져 있는 동안은 메모리에도
   따로 들고 있다가(우선 사용) localStorage에는 "가능하면" 같이 저장해 둔다. */
var recentRoomsMem = null;
function loadRecent(){
  if(recentRoomsMem) return recentRoomsMem;
  var list = [];
  try{ list = JSON.parse(localStorage.getItem('recentRooms')||'[]'); }catch(e){ list = []; }
  recentRoomsMem = list;
  return recentRoomsMem;
}
function saveRecent(list){
  recentRoomsMem = list;
  try{ localStorage.setItem('recentRooms', JSON.stringify(list)); }catch(e){ /* 저장 실패해도 메모리엔 남아있음 */ }
}
function addRecent(entry){
  var list = loadRecent().filter(function(r){ return r.code!==entry.code; });
  list.unshift(entry);
  if(list.length>RECENT_MAX) list.length=RECENT_MAX;
  saveRecent(list);
}
function removeRecent(code){
  saveRecent(loadRecent().filter(function(r){ return r.code!==code; }));
  renderRecent();
}
function showRecentIfEmpty(){
  var nq=document.getElementById('nq');
  if(nq && !nq.value.trim()){
    var rw=document.getElementById('recentWrap'); if(rw) rw.classList.remove('hidden');
    renderRecent();
  }
}
/* 네이버 지도류 앱처럼, 각 기록 줄을 왼쪽으로 스와이프하면 삭제되게 한다.
   (누르면 열기 / X 버튼으로도 바로 삭제 가능하고, 스와이프는 추가 제스처) */
function attachSwipeDelete(el, onDelete){
  var startX=0, dx=0, dragging=false;
  el.addEventListener('touchstart', function(e){
    if(!e.touches || e.touches.length!==1) return;
    startX = e.touches[0].clientX; dx=0; dragging=true; el.style.transition='none';
  }, {passive:true});
  el.addEventListener('touchmove', function(e){
    if(!dragging) return;
    dx = e.touches[0].clientX - startX;
    if(dx>0) dx=0;                 // 왼쪽으로만 밀림
    if(dx<-120) dx=-120;
    el.style.transform='translateX('+dx+'px)';
  }, {passive:true});
  el.addEventListener('touchend', function(){
    if(!dragging) return;
    dragging=false; el.style.transition='transform .2s ease';
    if(dx < -70){
      el.style.transform='translateX(-110%)'; el.style.opacity='0';
      setTimeout(onDelete, 180);
    }else{
      el.style.transform='translateX(0)';
    }
    dx=0;
  });
}
function renderRecent(){
  var box=document.getElementById('recentList');
  if(!box) return;
  var list=loadRecent();
  box.innerHTML='';
  if(!list.length){
    var e=document.createElement('div'); e.className='recentEmpty';
    e.textContent = LANG==='ko' ? '최근 검색 기록이 없어요' : 'No recent searches';
    box.appendChild(e); return;
  }
  list.forEach(function(r){
    var it=document.createElement('div'); it.className='recentItem';
    var row=document.createElement('div'); row.className='rrow';
    var txt=document.createElement('span'); txt.className='rtxt'; txt.textContent = roomTitle(r.code) || r.title || r.code;
    row.innerHTML='<span class="ric">🕓</span>';
    row.appendChild(txt);
    var xBtn=document.createElement('button'); xBtn.className='rx'; xBtn.textContent='✕';
    xBtn.onclick=function(ev){ ev.stopPropagation(); removeRecent(r.code); };
    row.appendChild(xBtn);
    row.onclick=function(){ openSearchHit({code:r.code, floor:r.floor}); };
    attachSwipeDelete(row, function(){ removeRecent(r.code); });
    it.appendChild(row);
    box.appendChild(it);
  });
}
/* 최근 기록을 위로 스크롤할 때 아이폰에서 입력창의 자판이 같이 사라지는 문제 방지.
   목록 스크롤을 브라우저 기본 동작(overflow-y:auto) 대신 직접 손가락 이동량만큼
   scrollTop을 옮기는 방식으로 처리해서, 입력창이 포커스를 잃지 않게 한다. */
(function(){
  var list = document.getElementById('recentList');
  if(!list) return;
  var startX = 0, startY = 0, startTop = 0, touching = false, axis = null;
  list.addEventListener('touchstart', function(e){
    if(!e.touches || e.touches.length!==1) return;
    if(e.target && e.target.closest && e.target.closest('.rx')) return;   // 삭제 버튼은 그대로 동작
    touching = true; axis = null;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTop = list.scrollTop;
  }, {passive:true});
  list.addEventListener('touchmove', function(e){
    if(!touching || !e.touches || e.touches.length!==1) return;
    var dx = e.touches[0].clientX - startX, dy = e.touches[0].clientY - startY;
    if(!axis){
      if(Math.abs(dx)<6 && Math.abs(dy)<6) return;             // 방향이 아직 불명확하면 대기
      axis = Math.abs(dy) >= Math.abs(dx) ? 'v' : 'h';          // 세로면 목록 스크롤, 가로면 기존 '스와이프로 삭제' 제스처에 맡김
    }
    if(axis!=='v') return;
    e.preventDefault();   // 입력창 포커스를 유지한 채 목록만 스크롤
    list.scrollTop = startTop + (startY - e.touches[0].clientY);
  }, {passive:false});
  list.addEventListener('touchend', function(){ touching = false; axis = null; });
  list.addEventListener('touchcancel', function(){ touching = false; axis = null; });
})();

/* ========== 검색 ========== */
/* 번호·이름 통합 검색.
   전용 숫자 키패드를 없애고 휴대폰 기본 자판을 그대로 쓰므로
   한글·영문·숫자 전환이 자유롭다 → 번호칸과 이름칸을 나눌 이유가 없어져 하나로 합쳤다.
   숫자만 입력하면 호실번호에서, 글자가 섞이면 이름·용도에서 찾는다. */
var searchHits = [];
function roomSearch(qraw){
  var box=document.getElementById('nres');
  var err=document.getElementById('err');
  var recentWrap=document.getElementById('recentWrap');
  var q=(qraw||'').trim().toLowerCase().replace(/\s+/g,'');
  box.innerHTML=''; err.textContent=''; searchHits=[];
  if(!q){
    if(recentWrap) recentWrap.classList.remove('hidden');
    renderRecent();
    return;
  }
  if(recentWrap) recentWrap.classList.add('hidden');
  var isNum = /^[0-9]+$/.test(q);
  Object.keys(VALID_FULL5).forEach(function(code){
    var nm = ROOM_NAME[code] || '';
    var ok = isNum ? (code.indexOf(q) >= 0)
                   : (nm && nm.toLowerCase().replace(/\s+/g,'').indexOf(q) >= 0);
    if(ok) searchHits.push({code:code, nm:nm, floor:VALID_FULL5[code].floor,
                            head:(isNum && code.indexOf(q)===0) ? 0 : 1});
  });
  // 번호가 앞에서부터 맞는 것 → 낮은 층 → 호실 순
  searchHits.sort(function(a,b){ return a.head-b.head || a.floor-b.floor || (a.code<b.code?-1:1); });
  if(!searchHits.length){
    var d=document.createElement('div'); d.className='none';
    if(LANG==='ko'){
      d.textContent = isNum ? ('"'+qraw.trim()+'" 번호의 강의실이 없습니다.')
                            : ('"'+qraw.trim()+'" 검색 결과가 없습니다. 번호로도 찾아보세요.');
    } else {
      d.textContent = isNum ? ('No room found for "'+qraw.trim()+'".')
                            : ('No results for "'+qraw.trim()+'". Try searching by room number too.');
    }
    box.appendChild(d); return;
  }
  searchHits.slice(0,40).forEach(function(h){
    var b=document.createElement('button');
    b.innerHTML='<span class="nm">'+(rn(h.nm) || ((LANG==='ko')?'강의실':'Room'))+'</span>'
              + '<span class="rc">'+lvName(h.floor)+' '+h.code+'</span>';
    b.onclick=function(){ openSearchHit(h); };
    box.appendChild(b);
  });
}
function openSearchHit(h){
  document.getElementById('err').textContent='';
  addRecent({code:h.code, floor:h.floor, title:roomTitle(h.code)});
  openTarget({kind:'room', floor:h.floor, code:h.code}, h.floor);
}
/* 자판의 확인/검색 키 : 결과가 하나뿐이거나 번호가 딱 맞으면 바로 연다 */
function searchEnter(){
  var v=(document.getElementById('nq').value||'').trim();
  var exact = parseRoomInput(v);
  if(exact){ openSearchHit({code:exact.code, floor:exact.floor}); return; }
  if(searchHits.length===1){ openSearchHit(searchHits[0]); return; }
  if(!searchHits.length && v)
    document.getElementById('err').textContent=(LANG==='ko')
      ? '검색 결과가 없습니다. 번호 5자리나 이름을 확인해주세요.'
      : 'No results found. Please check the 5-digit number or the name.';
}

/* ========== 층 선택 버튼 ========== */
function buildFloorPicker(){
  var fp=document.getElementById('fp'); fp.innerHTML='';
  for(var i=LEVELS.length-1; i>=0; i--){
    (function(lv){
      var b=document.createElement('button');
      b.textContent=lvLabel(lv);
      if(target && lv===target.floor) b.classList.add('tgt');
      if(lv===curFloor) b.classList.add('on');
      b.onclick=function(){
        curFloor=lv;
        if(target && target.kind==='toilet' && lv!=='B1' && lv!=='R') target.floor=lv;
        if(target && target.kind==='emstair' && lv!=='B1' && lv!=='R') target.floor=lv;
        buildFloorPicker(); highlight3D();
        flyIntoFloor(lv, function(){ showFloorDetail(lv); });
      };
      fp.appendChild(b);
    })(LEVELS[i]);
  }
}

/* 출발층(지금 계신 층) 버튼 — B1~5F. 목적지 화면 진입 때마다 다시 그림. */
function buildStartFloorPicker(){
  var box=document.getElementById('sfp'); if(!box) return;
  box.innerHTML='';
  // 바로 위 '층 상세' 줄과 순서가 반대(오름차순)여서 같은 층 버튼 위치가 서로 달랐음
  // → 잘못 누르기 쉬웠으므로 위 줄과 똑같이 내림차순(5F…B1)으로 맞춘다.
  for(var i=LEVELS.length-1; i>=0; i--){
    /* 옥상은 엘리베이터가 안 서서 '출발층'로 고르면 경로 미리보기를 만들 수 없다 */
    if(LEVELS[i]==='R') continue;
    (function(lv){
      var b=document.createElement('button');
      b.textContent=lvLabel(lv);
      if(lv===startFloor) b.classList.add('on');
      b.onclick=function(){
        startFloor=lv;
        // 화장실·비상계단은 층마다 있으므로, 출발층을 바꾸면 목적지도 그 층 걸로 따라간다.
        // (1층은 원래도 그대로였으니 그대로 두고, 2~5층에서 엘리베이터 타고 1층 계단으로
        //  잘못 안내되던 문제를 고친다. 지하 1층은 비상계단·화장실이 없어서 그대로 1층 유지)
        if(target && (target.kind==='emstair' || target.kind==='toilet') && lv!=='B1') target.floor=lv;
        buildStartFloorPicker(); buildFloorPicker();
        highlight3D();            // 현재 위치 층을 흰색으로 다시 칠함
        buildRouteA();            // 경로도 현재 위치에서 출발하도록 갱신
        startPersonTrip();        // 사람도 그 층으로 옮겨 다시 이동 시작
      };
      box.appendChild(b);
    })(LEVELS[i]);
  }
}

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
      for(var k in params){ if(k!=='roughness' && k!=='metalness') p2[k]=params[k]; }
      p2.shininess = Math.round(4 + (1-rough)*116 + metal*80);   // 대략 4~200
      var sc = 0.12 + metal*0.55 + (1-rough)*0.15;
      p2.specular = new THREE.Color(sc, sc, sc);
      return new THREE.MeshPhongMaterial(p2);
    };
    THREE.MeshStandardMaterial.__isMobileFallback = true;
  }
  renderer=new THREE.WebGLRenderer({canvas:cv,antialias:!isMobilePerf,alpha:false,powerPreference:'high-performance'});
  /* 모바일 성능 최적화 : PCFSoftShadowMap은 그림자 지는 라이트마다 픽셀당 여러 번
     텍셀 샘플링을 해서 모바일 GPU에 부담이 크다 — 모바일에서는 그림자 자체를 꺼서
     프레임을 확보하고(그림자 없이도 앰비언트/디렉셔널 조명으로 입체감은 유지됨),
     데스크톱에서는 기존처럼 부드러운 그림자를 그대로 쓴다. */
  renderer.shadowMap.enabled=!isMobilePerf;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  /* 요청 반영(추가 성능 개선): 드로우콜(한 프레임에 그리는 개별 객체 수)이
     600~700개로 꽤 많아서(장식용 작은 메쉬가 많음), 화면 해상도 배율까지
     높게 잡으면 그 부담이 그대로 배가된다 — 선명도를 조금 양보하고
     1.75 → 1.4로 낮춰 픽셀(프래그먼트) 처리량 자체를 줄인다. */
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobilePerf?1.4:2));
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x040814);
  // 뒤로 최대한 스크롤(줌아웃, radius 최대 260)해도 건물이 안개에 묻혀 어두워지지 않도록,
  // 안개가 실제로 시작되는 거리를 카메라가 갈 수 있는 최대 거리보다 훨씬 멀리 둔다.
  scene.fog=new THREE.Fog(0x040814, 340, 900);
  // 요청 반영(Z-파이팅 원인 3): 실내 씬은 far=1000까지 필요 없다 —
  // far를 줄여 깊이버퍼 정밀도(far/near 비율)를 높여서 겹치는 유리·프레임의 깜빡임을 줄인다.
  // 요청 반영(버그 수정): far를 150으로 낮췄더니, 두 손가락으로 최대한
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
  // 조감도 모드용 연출). 요청 반영(버그 수정): 1인칭으로 걸어 들어갔을 때도
  // 이 격자가 바닥 아래로 계속 비쳐 보여서 실내 바닥이 "3D 청사진 격자판"처럼
  // 보였다 — 걷기 모드(fpActive)에서는 꺼지도록 animate()에서 토글한다.
  fpHoloGrid=new THREE.GridHelper(240, 48, 0x1E7A94, 0x0D2A33);
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
    /* v144(요청 반영): 후문도 '문 앞'에서 출발한다. 1층 중앙계단실은 실제로 후문
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
    /* 요청 반영: 왼쪽 문만 안쪽이 안 보이는 문제 — 원인은 문 유리(gp)가
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
       (요청 반영: 예전엔 장식이 벽 쪽 그룹에 붙어 있어서, 문이 열리면 글씨만
       허공에 남아 있었다). 닫힌 상태의 leafGrp 좌표계는 문 전체 좌표계와
       같으므로, 문 기준 좌표를 그대로 써서 붙이면 된다. */
    /* 요청 반영 : 가운데 세로 검은 바는 고정 기둥이 아니라 문짝에 붙은
       '맞댐 선대(meeting stile)'다 — 예전엔 벽 쪽 그룹(g)에 통짜로 붙어 있어서
       문이 열려도 가운데 바만 허공에 그대로 남아 있었다. 이제 문짝(leafGrp)에
       반쪽씩 붙여, 닫히면 하나로 맞물리고 열리면 문과 함께 갈라진다. */
    if(!o.single && !o.noMullion){
      var stile=fpMkPlane(fw/2, h, AL, 1);
      stile.position.set(sn*(fw/4), h/2, 0.036); leafGrp.add(stile);
    }
    if(!g.userData.gateLeaves) g.userData.gateLeaves=[];
    g.userData.gateLeaves.push({sign:(sn||1), leaf:leafGrp, pivot:pivot, paneW:pw});
    // 요청 반영: 모든 문에 자동 등록하지 않고, 호출 쪽에서 o.autoOpen을 켠 경우에만
    // (지하1층 크리에이티브 존 문) — 밖(복도)에서 들어올 때만 열리도록 한 방향으로 제한.
    if(o.autoOpen) fpRegisterAutoDoor(g, pivot, w, sn||1, 1.05, o.trigDist, (o.oneWay!==undefined?o.oneWay:-1), o.push);
  });
  /* o.noMullion : 양짝 자동문(여닫이)에서는 가운데 고정 멀리언을 두지 않는다 —
     문짝이 열려도 가운데 세로 기둥이 그대로 남아 있으면 "문이 두 개 겹쳐 있는"
     것처럼 보이고, 열린 문 사이로 지나가는 느낌도 나지 않는다(요청 반영). */
  /* 고정 기둥은 좌우 문틀 두 개뿐이다 — 가운데 바는 위에서 문짝에 붙였다. */
  [-w/2+fw/2, w/2-fw/2].forEach(function(px){
    var p=fpMkPlane(fw, h, AL, 1); p.position.set(px, h/2, 0.036); g.add(p);
  });
  var top=fpMkPlane(w, fw*1.5, AL, 1); top.position.set(0, h-fw*0.75, 0.036); g.add(top);
  var trH = Math.max(0, FP_CEIL_H - h - 0.05);              // 문 위 채광창
  /* 요청 반영: 이 자동 채광창(어두운 유리, 반투명)이 지하1층 크리에이티브 존
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
   (요청 반영: 입구 쪽에 있던 가짜 엘리베이터 틀 장식(fpBDAlcove)은 실제 사진에
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
     (요청 반영: "정면 출입문까지 이어지는 넓은 평면 타일 바닥"). 계단 매스
     자체는 그 위에 얹히는 별도 지오메트리라 겹쳐도 문제없다. */
  /* [지하 계단 개구부] 요청 반영 — 실사진(계단 내려다본 사진)처럼, 후문 로비
     바닥에 지하로 내려가는 계단이 그대로 내려다보이는 사각 개구부를 만든다.
     요청 반영(구조 정정): 예전에는 이 구멍을 zDn 열에 뚫었는데, 실제 B1행
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
  /* 요청 반영(버그 수정): 이 로비 전용 천장이 1층→2층으로 올라가는 계단
     바로 위 공간(x0~x0+WD 전체)을 통짜로 덮고 있었다 — 1층은 위층(2층)이
     항상 있으므로, 계단을 오를 때 이 판을 그대로 뚫고 지나가는 것처럼
     보였다(요청 반영: 다른 층 계단실 천장과 마찬가지로 위층으로 이어지는
     자리는 막지 않는다 — 그냥 이 로비 전용 천장 자체를 없앤다).
     대신 조명(포인트라이트)만은 남겨서 로비가 어두워지지 않게 한다. */
  (function(){
    var ceilY=FP_CEIL_H-0.02;
    var len=WD, cz=zc;
    /* 요청 반영(성능 개선): 실제 PointLight 개수를 최대 4개로 제한한다
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
     요청 반영: 1층에서 지하로 내려가는 연출 중에 앞(-X)을 보면, 지하 복도
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
  /* 요청 반영: 이 좌측 벽에 붙여 두었던 공지사항 포스터 4장을 없앤다 —
     실사진(3번 사진)의 같은 벽에는 아무것도 붙어 있지 않고 석재 패널 마감만
     있다. 패널(위 fpMkTilePanel)은 실사진과 일치하므로 그대로 남긴다. */
  /* 요청 반영: 소화전함을 없앤다. */
  /* ── ② 천장걸이 대형 검은 간판 'SW중심대학사업'(흰 필기체) ──
     주의: 1인칭 모드에는 건물 전체를 덮는 어두운 천장판(fpCeil, 바닥+2.55m)이
     따로 있어서, 그보다 높이 달면 윗부분이 천장에 잘려 얇은 띠로만 보인다
     (렌더로 확인). 판 전체(1.95~2.50)를 그 아래에 넣고, x=4.3으로 안쪽에 달아
     ① 관람 시선이 천장판에 막히기 전(교차점 x=4.50)에 판에 닿고
     ② 계단 오르내리기 연출의 눈높이가 이 x를 지날 땐 항상 판 위(≥2.90)라
     몸이 판을 뚫지 않는다(좌표 검증 완료). */
  /* 요청 반영: 간판을 더 위로. 천장(FP_CEIL_H)이 3.3으로 상향되어 여유가
     생겼으므로, 사람 눈높이(≥2.90) 위 불변식을 유지하는 선에서 살짝만
     더 올린다(2.225→2.50, 판 상단 2.50→2.775, 여전히 2.90 미만). */
  var sgX=x0+2.50, sgW=2.30, sgH=0.55, sgD=0.14, sgYc=2.50;
  /* 요청 반영: 간판이 우측 상행 계단 쪽까지 넘어가면 안 되고, 왼쪽 벽~계단
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
     요청 반영(원상복구): 예전에 "문 좌측 벽을 절반으로 줄이고 문을 왼쪽으로
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
  /* 요청 반영: '금연구역' 표지는 아래에서 후문 왼쪽으로 옮겨 새로 붙인다. */
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
    /* 요청 반영(버그 수정): 바닥에 눕히는 판(rotation.x=-π/2)은 PlaneGeometry의
       첫 인자가 X(문에 수직) 방향, 둘째 인자가 Z(문과 나란한) 방향이 된다.
       문턱 금속판과 점자블록 모두 인자가 뒤바뀌어 있어서, 문과 나란히 깔려야 할
       띠가 문을 뚫고 바깥으로 뻗어 나가 있었다(4번 사진에서 노란 블록이 옆으로
       밀려 보이던 원인) — 두 값을 서로 바꾼다. */
    var thresh=fpMkPlane(0.16, dw+0.10, 0xB7BCBE, 1);       // 바닥 문턱 금속판
    thresh.rotation.x=-Math.PI/2; thresh.position.set(dX-0.02, 0.006, dcz); g.add(thresh);
    g.add(fpMkContactAO(dw+0.10, 0.4, dX, dcz, 'z'));       // 문틀 밑 AO
    /* 요청 반영: 문 앞 바닥에 노란 점자블록(경고용 타일) 띠를 얇게 깐다.
       기존 로비 바닥(landFl, y=0.008)과 겹치지 않도록 y를 살짝 더 띄운다. */
    var tacT=fpTactileTex().clone(); tacT.needsUpdate=true;
    tacT.wrapS=tacT.wrapT=THREE.RepeatWrapping;
    tacT.repeat.set(2, Math.max(2, Math.round((dw+0.6)/0.30)));
    var tactile=new THREE.Mesh(new THREE.PlaneGeometry(0.62, dw+0.6),
      new THREE.MeshStandardMaterial({map:tacT, roughness:0.92, metalness:0.02}));
    tactile.rotation.x=-Math.PI/2; tactile.position.set(dX-0.60, 0.013, dcz); g.add(tactile);
  })();
  /* 후문 수정에 맞춰(요청 반영) 문 왼쪽(sideWL 벽)에 '금연구역' 표지를 새로 붙인다. */
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
  var out=fpMkTex(4.7, 2.65, fpBackDoorOutsideTex(), 0.82);             // 바깥 풍경 살짝 톤 낮춤(요청 반영: 역광 눈부심 완화)
  out.rotation.y=-Math.PI/2; out.position.set(bx+0.85, 1.30, dcz); g.add(out);
  var outFl=fpMkPlane(0.9, hw*2, 0x9AA4AA, 1);                  // 문턱 밖 짧은 외부 바닥
  outFl.rotation.x=-Math.PI/2; outFl.position.set(bx+0.45, 0.005, zc); g.add(outFl);
  var day=new THREE.PointLight(0xFFF6E0, 0.10, 6);              // 문으로 들이치는 주광(요청 반영: 여전히 밝다는 피드백으로 추가 하향)
  day.position.set(bx-0.85, 1.75, dcz); g.add(day);
  /* ── 정면 우측(계단 쪽, +Z) 벽 : 사각 창문 + 하단 비상구 안내판 (사진 반영) ──
     문 오른쪽 벽(sideW 폭, sn=1)에 붙인다. 창 안쪽에 바깥 풍경을 한 번 더 넣어
     실제 창처럼 깊이가 있어 보이게 한다. */
  (function(){
    var winZ=dcz+dw/2+sideWR/2;                                  // 문 오른쪽(넓어진) 벽 중심 z
    var winW=Math.min(1.10, sideWR-0.14), winH=1.30, winYc=1.42;
    /* 요청 반영: 초록(민트) 프레임·세로 방범창살·바깥 풍경 톤을 걷어내고,
       실사진(2번째 사진)처럼 회색 알루미늄 틀의 2연동 미닫이창으로 다시 만든다. */
    var alumOuter=0x9CA0A0, alumInner=0xB8BBBB, alumDark=0x707475;
    var frm=fpMkPlane(winW+0.14, winH+0.14, alumDark, 1);          // 바깥 몰딩(짙은 회색)
    frm.rotation.y=-Math.PI/2; frm.position.set(bx-0.005, winYc, winZ); g.add(frm);
    var frmIn=fpMkPlane(winW+0.05, winH+0.05, alumOuter, 1);       // 창틀 본체(밝은 회색)
    frmIn.rotation.y=-Math.PI/2; frmIn.position.set(bx-0.008, winYc, winZ); g.add(frmIn);
    /* 요청 반영: 유리가 반짝여 보였다 — 조명 반사(specular)가 생기는
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
    /* 요청 반영: 창 아래 "비상구" 유도등 표지를 삭제한다. */
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
      /* 요청 반영(v95): 실사진(후문 안쪽에서 본 지하 계단 개구부)처럼 검정 각파이프
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
      /* 요청 반영(v95): 개구부 우측 긴 변(vz0, 로비 타일 바닥과 맞닿는 쪽)에만 난간을
         세운다 — 실사진에서 난간이 있는 자리. 계단 쪽(vz1)은 계속 열어 둔다. */
      var rx0=xs-0.10, rx1=xs+FP_B1F_RUN_LEN+0.10;   // 위 바닥 개구부(hx0~hx1)와 같은 X 구간
      railRun(rx1-rx0, (rx0+rx1)/2, vz0);
      /* [중복 제거] vz0(=zUp-fw/2) 쪽은 fpMakeStairwell 자신의 stairRail()이
         실제 상행 계단을 따라 이미 같은 자리에 난간을 세우고 있다 — 여기서
         또 세우면 겹쳐서(Z-fighting) 두꺼운 울타리처럼 보인다. 그쪽은 빼고
         나머지 2면(반대편 긴 변 + 먼 쪽 가로대)만 세운다. */
      /* 요청 반영: 울타리(난간)가 오히려 계단을 가려 안 보이게 만든다는
         피드백 — 난간 2면을 없애고, 아래로 뚫린 계단 자체가 그대로 보이게
         한다(빨간 안전선만 개구부 가장자리 표시로 남긴다). */
      /* 실사진(2번째 첨부)에서 직접 확인되는 요소만 반영 : 개구부 가장자리의
         빨간 안전선(다른 층 계단에도 이미 쓰는 색 0xC0342B, 요청 반영 —
         사진에 없는 노란 점자블록은 임의로 추정해 넣지 않는다). */
      /* 요청 반영(삭제): 개구부 가장자리에 둘러 둔 빨간 안전선 3줄(양 긴 변 +
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
var FP_ST_WD_B1F = FP_ST_WD*1.35;  // B1↔1F 전용: 실사진처럼 문·창 앞 로비가 여유 있도록 더 깊게(요청 반영)
var FP_ST_LAND = 1.15;   // 문턱에서 첫 단까지 — 문을 열고 들어섰을 때의 초입 계단참(약 1.4배 확장)
var FP_ST_N    = 14;     // 반 층당 단 수
var FP_ST_RUN  = 0.245;  // 단 하나 깊이    // 개구부 높이
/* v109(요청 반영): 5층→옥상 두 번째 도막(계단참→옥상 바닥)만 단 수를 14→10으로 줄여 짧게 만든다.
   같은 반 층 높이를 10단으로 오르므로 단이 조금 높아지지만, 옥상 바닥 개구부가 그만큼(4단×0.245≈1m)
   안쪽에서 시작해 실사진처럼 철문에서 개구부까지 평평한 바닥이 넓어지고, 데크로 오르는 계단도
   더 안쪽에서 시작한다. 걷기 연출·바닥 개구부·데크 계단이 모두 이 값을 함께 쓴다. */
var FP_ST_N_R = FP_ST_N;   // v111(요청 반영): 옥상 도막 단축(10단)을 되돌려 다른 층과 같은 14단·같은 시작점으로. (관련 코드는 그대로 두고 값만 되돌림 — FP_R_XSHIFT=0)
var FP_R_XSHIFT = (FP_ST_N - FP_ST_N_R) * FP_ST_RUN;   // 옥상 도막의 첫 단이 +X로 밀리는 양(≈0.98m)
/* v122(요청 반영): 자유 탐색에서 옥탑방 데크 계단을 밟고 데크 위까지 올라갈 수 있게 —
   fpMakeRoofSkipFloor가 지은 계단·데크의 실제 치수를 여기에 적어 두고(옥탑방 로컬 좌표,
   y는 옥상 바닥 기준), fpFreeTick이 매 프레임 서 있는 자리의 높이를 이 값으로 계산한다. */
var fpRoofDeckGeo=null;
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
      var exSign=fpMkTex(exSignW, exSignH, fpExitSignTex(ko), 1);
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
/* 요청 반영: 지하 나가는 계단(exit1/exit2)에서 자유롭게 걸어 다닐 수 있게 하면서,
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
    /* 요청 반영: 실사진(지하 1층 엘리베이터 앞) 기준 — 다른 층과 같은
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
     건물 3D 상자의 밋밋한 색이 그대로 비쳤다(요청 반영: 다른 층 복도처럼).
     요청 반영(원상복구): 바닥·천장에 구멍을 뚫었더니 복도 쪽에서 계단실이
     창문처럼 뚫려 보이는 부작용이 생겼다 — 통짜 판으로 되돌린다. */
  var b1cfl=fpMkFloorGloss(X*2+0.24, zTop-zEnd, fpTerrazzoTex());
  b1cfl.rotation.x=-Math.PI/2; b1cfl.position.set(0, 0.06, (zEnd+zTop)/2); g.add(b1cfl);

  /* ── 천장 : 1층 복도(fpMakeCorrCeiling)와 같은 밝은 천장 + 매립등 ──
     요청 반영: 크리에이티브 존(zTop 너머)은 제외하고, 승강장·계단 앞
     복도 구간(zEnd~zTop)만 1층과 동일한 톤으로 통일한다. 기존엔 이 구간에
     전용 천장판이 없어 건물 전체를 덮는 어두운 공용 천장(fpCeil)만 보였다. */
  (function(){
    var ceilY=H-0.02;
    /* 요청 반영: 벽(크림 0xE8DFC8)과 색 차이가 커서 천장을 올려다볼 때 흰
       면처럼 눈부시게 붕 떠 보였다 — 벽과 비슷한 계열의 톤으로 낮춘다. */
    var ceil=fpMkPlane(X*2+0.24, zTop-zEnd, 0xE9E0C9, 1);
    ceil.rotation.x=Math.PI/2; ceil.position.set(0, ceilY, (zEnd+zTop)/2); g.add(ceil);
    var FIX_W=0.9, FIX_D=0.28, FIX_INTENSITY=0.14, FIX_DIST=3.4;
    var len=zTop-zEnd;
    var n=Math.max(1, Math.round(len/3.6));
    /* 요청 반영(성능 개선): 등 플레이트(시각 요소)는 그대로 촘촘히 두고,
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
  /* ── 요청 반영(최종) : 엘리베이터와 계단 사이 벽은 아무것도 없는 평평한 벽이다.
     예전엔 이 자리에 (a) 문만 붙인 장식 → (b) 깊은 사각 벽감 + 검은 문 →
     (c) 계단까지 이어지는 긴 벽감 → (d) 계단 옆 얕은 벽감 + 검은 문 순으로
     바뀌어 왔는데, 실제로는 문도 벽감도 없이 그냥 평평한 벽이라 전부 삭제한다.
     이제 이 +X 벽에 뚫리는 것은 엘리베이터 개구부와 계단 개구부뿐이다. */
  var b1StairG=fpMakeStairwell('B1', stZ, ko);
  /* 계단실 양옆 벽의 z를 실제 메쉬에서 읽어 온다 — 계단실 폭이 층마다 달라
     (지하는 1.4배) 상수로 못 박는다. 복도 개구부를 이 두 벽까지 넓혀야
     계단 양옆에 복도 벽 조각이 기둥처럼 튀어나와 보이지 않는다(요청 반영). */
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
  /* 요청 반영(보라색 표시 = 계단 옆에 기둥처럼 서 있던 벽 조각) :
     계단실은 복도 개구부(4.4m)보다 넓게(지하는 1.4배) 지어져서, 계단실 -Z 옆벽
     (b1StSideZ)과 복도 개구부 가장자리(stZ-FP_ST_OW/2) 사이에 0.9m쯤 되는 복도 벽
     조각이 남아 있었다 — 그 뒤로 계단실 옆벽이 그대로 비쳐서, 계단 옆에 크림색
     기둥이 하나 서 있는 것처럼 보이던 원인. 개구부의 -Z 쪽 끝을 계단실 옆벽까지
     넓혀서 그 조각을 없앤다(위쪽 상인방은 그대로 둔다 — 없애면 그 위 어두운
     천장 공간이 그대로 드러나 더 어색했다). */
  var stHoleZ0=Math.min(b1StSideZ, stZ-FP_ST_OW/2),
      stHoleZ1=Math.max(b1StSideZ2, stZ+FP_ST_OW/2);   // 요청 반영: +Z 쪽(크리에이티브 존 쪽)도 계단실 옆벽까지 넓힌다
  /* 요청 반영(계단 위 흰 판때기) : 개구부 높이가 2.18m밖에 안 돼 그 위로 크림색 벽이
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
  /* ── 요청 반영: 중앙계단 옆(계단 단의 -Z 쪽) 빈 공간 ──
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
    /* 요청 반영(버그 수정): 이 천장판이 벽감 사각형(r.z0~r.z1)에 딱 맞게만
       깔려 있어서, 양쪽 끝과 실제 벽 사이에 2~3cm짜리 틈이 남아 있었다
       (레이캐스트 확인: z=3.75, z≤0.60 에서 위로 쏘면 천장을 지나쳐 6.60의
       건물 슬래브가 맞았다). 눈높이에서 비스듬히 올려다보면 그 몇 cm 틈이
       천장선을 따라 길게 이어진 검은 띠로 보인다 — 앞뒤로 0.2m씩 더 넉넉히
       깔아 벽 안쪽까지 물리게 한다(넘치는 부분은 벽·계단 매스에 가려진다). */
    var nceD=(r.z1-r.z0)+0.40;
    var nce=fpMkPlane(r.x1-r.x0, nceD, 0xE9E0C9, 1);        // 천장 — 위쪽 어두운 계단실 공간을 가린다
    nce.rotation.x=Math.PI/2; nce.position.set((r.x0+r.x1)/2, H-0.02, (r.z0+r.z1)/2); g.add(nce);
    /* 요청 반영(버그 수정): 복도 천장은 x≈2.22에서 끝나고 이 벽감 천장은
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
    /* 요청 반영(버그 수정): 이 벽감 천장(y=H) 위에서 1층 바닥판(y=SP) 아래까지,
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
    /* 요청 반영: 검은 문 앞에 서면 문 오른쪽(+Z, 계단이 끝나는 쪽) 구석이
       비어 있었다 — 계단 매스는 x=9.0에서 끝나는데 계단실 안쪽 끝 벽은
       x=10.47이라, 그 사이 1.5m 폭 구간만 계단도 벽도 없는 빈 구멍으로
       남아 있었고 문 앞에서 그 틈이 그대로 들여다보였다. 계단이 끝나는
       지점부터 안쪽 끝 벽까지를 벽체로 채운다(계단·걷는 경로와는 겹치지
       않는다 — 계단은 x<9.0, 오르내리는 경로는 y가 이 벽 위로 지나간다). */
    var stEndX = FP_WALL_X + FP_ST_LAND + FP_B1F_RUN_LEN;
    var nzEnd  = stZ + (FP_ST_OW*1.4/2 + 0.03);
    if(r.x1-stEndX > 0.05 && nzEnd-r.z1 > 0.05){
      var fillW=r.x1-stEndX, fillD=nzEnd-r.z1;
      /* 요청 반영: 이 채움벽만 옆 계단실 벽보다 눈에 띄게 밝은 크림색으로
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
    /* 요청 반영(버그 수정) : 여기 있던 계단실 입구 천장 패치(y=H-0.022 = 3.278)는
       1층 바닥 높이와 거의 같은 자리라, 1층에서 중앙계단으로 내려가려고 하면
       계단 구멍을 뚜껑처럼 덮어 "계단이 막혀 있는" 것처럼 보였다 — 삭제한다.
       (개구부 위 어두운 부분이 살짝 보이는 것보다 계단이 뚫려 있는 게 중요하다.) */
  })();

  /* ── 요청 반영: 계단 옆 '들어가는 곳'의 정면 벽(지하에서 중앙계단을 바라볼 때
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
     요청 반영(위치 이동, 지하만) : 예전에는 이 벽감이 계단 도착 지점(stZ) 정면에
     있었는데, 실제 건물에서는 크리에이티브 존 입구 코너에 붙어 있다 —
     존 문 바로 앞(-X 벽 끝)으로 옮기고, 사진과 같은 구성으로 다시 만든다.
       · 뒷벽   : 검은 문(계단 쪽) + 회색 방화문(존 쪽)이 나란히
       · 옆벽   : 계단 쪽(-Z) 반환벽에 노란 스티커가 붙은 검은 문(뒷벽 문과 90도)
       · 바닥   : 회색 방화문 앞에 빨간 소화기 두 개
     계단 도착 지점(stZ)은 이제 평평한 복도 벽이 된다(아래 wallSeg가 자동 처리). */
  /* 요청 반영: 벽감을 존 입구 벽(zTop)에 딱 붙여, 사이에 남던 0.2m짜리 복도 벽
     조각(모서리처럼 튀어나와 보이던 부분)을 없앤다 — 벽감 +Z 반환벽이 곧바로
     존 입구 벽과 한 면으로 이어진다. */
  /* 요청 반영: 계단을 내려오면서 두 문이 모두 보이도록 벽감을 2.7 → 4.0m로 넓힌다
     (계단 쪽으로 1.3m 더 열린다). */
  var alcW=FP_B1_ALC_W, alcD=FP_B1_ALC_D, alcZ1=zTop, alcZ0=alcZ1-alcW,
      alcZc=(alcZ0+alcZ1)/2, backX=-X-alcD;
  // 벽감 좌우 옆벽(복도 평면 -X와 벽감 뒤쪽 backX 사이를 잇는 반환벽)
  [alcZ0, alcZ1].forEach(function(zc){
    var ret=fpMkPlane(alcD, H, 0xE8DFC8, 1, 0x9C8F6E);
    /* 요청 반영(버그 수정): +Z쪽 반환벽(alcZ1)은 크리에이티브 존 입구 벽과
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

  /* 뒷벽 : 검은 문 하나(요청 반영 — 회색 방화문과 도어클로저는 삭제) */
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

  /* 옆벽 90도 문 — 요청 반영(원위치) : 다시 계단 쪽(-Z) 반환벽으로 되돌린다.
     실사진처럼 계단에서 보면 오른쪽에 서는 문이다. 이 문은 +Z(벽감 안쪽)를
     향하므로, 벽감 자체를 계단 도착 지점보다 앞(alcZ0=3.3)까지 넓혀 두어야
     내려오면서 문 면이 보인다 — 위에서 alcW를 5.0m로 잡은 이유. */
  (function(){
    /* 요청 반영: 이 옆벽 문은 한 짝짜리였는데, 실제로는 두 짝(양여닫이)이다 —
       문틀 폭을 두 배로 잡고 문짝을 좌우 두 장으로 나눈다. 손잡이는 두 짝이
       맞물리는 가운데 쪽에 하나씩 두고 레버는 바깥쪽으로 뻗게 한다. */
    var rdLW=0.90, rdW=rdLW*2, rdH=2.10, rdX=-X-alcD/2, rdZ=alcZ0;
    /* 문틀 + 그 안쪽 어두운 개구부 */
    var rdFr=fpMkPlane(rdW+0.14, rdH+0.10, 0x9C8F6E, 1);
    rdFr.position.set(rdX, rdH/2+0.02, rdZ+0.012); g.add(rdFr);
    var rdHole=fpMkPlane(rdW, rdH, 0x14181D, 1);
    rdHole.position.set(rdX, rdH/2, rdZ+0.018); g.add(rdHole);
    /* 요청 반영 : 문은 '열린 문'처럼 보이게 만들지 않고 닫힌 상태로 둔다 —
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
    /* 요청 반영: 문 가운데(손잡이 위)에 '관계자 외 출입금지' 명찰을 붙인다 —
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
  /* 요청 반영: 문 위 "창고" 글씨 삭제. */

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
  /* 요청 반영(버그 수정): 이 문은 oneWay 기본값(-1)이라 복도 쪽(z가 작은 쪽)에서
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
     요청 반영: 실제 사진은 밝은 타일 벽 위에 검은색 개별 레터링이라
     글씨색을 흰색 → 검은 계열로 바꾼다(밝은 벽에 흰 글씨는 대비가 반대). */
  var lintTop=(H+FP_B1_DOOR_H)/2;
  var ztx=fpMkTex(3.6,0.45,fpWallTextTex('Campus Creative Zone','#14181D'),1);
  ztx.rotation.y=Math.PI; ztx.position.set(0, lintTop+0.02, zTop-0.07); g.add(ztx);

  /* 문 오른쪽 벽에 안내판(예: 학과명)과 카드리더기(사진 반영) */
  (function(){
    /* 요청 반영(버그 수정): 실제로 렌더링해보면 이 +wxR 값이 화면상
       왼쪽에 나왔다 — 이 복도를 바라보는 시점 기준으로는 부호가 반대라,
       실제 사진(카드리더가 문 오른쪽)과 맞추려면 음수를 써야 한다. */
    var wxR = -(FP_B1_DOOR_W/2+0.42);
    /* 요청 반영(삭제): 카드리더기 위에 붙어 있던 'SW중심대학' 안내판을 없앤다 —
       글씨가 벽 색·조명에 묻혀 거의 안 보이는 탓에, 안내판이 아니라 벽에
       덧댄 흰 띠 하나가 떠 있는 것처럼만 보였다. */
    /* 카드리더기 */
    var rdBody=fpMkPlane(0.16,0.24,0x1B1E24,1);
    rdBody.rotation.y=Math.PI; rdBody.position.set(wxR, 1.05, zTop-0.06); g.add(rdBody);
    var rdLed=fpMkDisc(0.02,0x4CD97A,1);
    rdLed.rotation.y=Math.PI/2; rdLed.position.set(wxR, 1.10, zTop-0.075); g.add(rdLed);
  })();
  /* 요청 반영: 실제 사진처럼 문 반대쪽(왼쪽) 벽에 소화전함을 설치한다. */
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
  // 요청 반영: 19m → 21m로 살짝 더 넓힘.
  var zfl=fpMkPlane(zx1-zx0, zz1-zz0, 0xC7C0AF,1);
  zfl.rotation.x=-Math.PI/2; zfl.position.set((zx0+zx1)/2,0.02,(zz0+zz1)/2); g.add(zfl);
  /* 요청 반영(실사진 대조): 밋밋한 단색 천장이었는데, 실제로는 흰색 계열
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
  /* 요청 반영: 크리에이티브 존 안쪽에 조명이 하나도 없어서(건물 전체
     기본 광량만 받음) 어둡고 차갑게 보였다 — 실사진처럼 환한 느낌을
     내도록 따뜻한 톤 조명을 공간 길이를 따라 몇 개 둔다. */
  [0.18,0.5,0.82].forEach(function(t){
    var lx=new THREE.PointLight(0xFFF3DE, 0.55, 14);
    lx.position.set((zx0+zx1)/2, ZH-0.4, zz0+(zz1-zz0)*t);
    g.add(lx);
    /* 요청 반영(버그 수정): 매립등 원판을 천장(ZH)에서 1.5cm 아래에 뒀는데,
       둘 다 반투명이라 카메라를 돌리면 거리순 정렬이 뒤집히며 깜빡였다
       ("멈추면 괜찮은데 돌리면 깨진다"는 증상). 간격을 넉넉히 벌리고
       renderOrder를 천장(-3)보다 확실히 뒤로 고정해 항상 천장 위에 그린다. */
    var downlight=fpMkDisc(0.16,0xFFFAEF,0.95);
    downlight.renderOrder=2;
    downlight.rotation.x=Math.PI/2; downlight.position.set((zx0+zx1)/2, ZH-0.05, zz0+(zz1-zz0)*t); g.add(downlight);
  });
  /* 요청 반영(실사진 재대조): 동쪽(zx0, 부스 쪽) 벽은 실제로는 크림 벽지가 아니라
     부스 사이사이 세로 기둥까지도 전부 따뜻한 골드톤 자작나무 합판이었다 —
     서쪽(zx1, 라운지·창가) 벽은 기존 크림 벽지 그대로 두고, 동쪽만 분리해서
     따뜻한 우드톤으로 바꾼다. */
  var wBirch=fpMkPlane(zz1-zz0,ZH,0xE3C48A,1,0x6B4A1F);
  wBirch.rotation.y=Math.PI/2; wBirch.position.set(zx0,ZH/2,(zz0+zz1)/2); g.add(wBirch);
  var wCream=fpMkPlane(zz1-zz0,ZH,0xE8DFC8,1,0x9C8F6E);
  wCream.rotation.y=Math.PI/2; wCream.position.set(zx1,ZH/2,(zz0+zz1)/2); g.add(wCream);
  /* 요청 반영(Z-파이팅 잔여 원인) : 이 zback 한 장이 원래 북쪽 끝벽 전체(zx0~zx1)를
     덮는데, 그 위에 나가는 문 스토어프론트(유리·프레임)가 정확히 같은 Z(zz1)에
     다시 그려지고 있었다 — 오른쪽은 문-회의실 유리 패널이 나중에 그려져 운 좋게
     덜 튀었을 뿐, 왼쪽(유리벽)은 그대로 겹쳐서 계속 깜빡였다. 스토어프론트가 이제
     이 벽 전체를 앞에서 가리므로, zback을 살짝 뒤로(z+0.05) 물려서 같은 평면에
     겹치지 않게 한다(안 보이는 뒷벽이라 위치를 옮겨도 시각적으로 차이 없다). */
  /* 요청 반영(버그 수정) : 이 뒷벽이 통짜 한 장이라 나가는 문(스토어프론트)
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
     (요청 반영: 정수기·쓰레기통 자리를 서로 맞바꾸고, 시계는 이 무리에서
     떼어내 문 쪽으로 더 오른쪽에 따로 단다) */
  (function(){
    var ex=-(FP_B1_DOOR_W/2+0.55), ez=zz0+0.32;
    var binXpos=ex, coolerX=ex-1.15, exX=ex-0.62, purifierX=ex-1.77;   // 정수기·쓰레기통 자리 맞교환
    var cooler=fpMakeCooler(); cooler.position.set(coolerX,0,ez); g.add(cooler);
    var fireEx=fpMakeExtinguisher(); fireEx.position.set(exX,0,ez); g.add(fireEx);
    var bin=fpMkBox(0.40,0.62,0.40,0x2A62B8,1,0x0C1A2E); bin.position.set(binXpos,0.31,ez); g.add(bin);
    var binRim=fpMkBox(0.44,0.05,0.44,0x1E4A8C,1); binRim.position.set(binXpos,0.64,ez); g.add(binRim);
    var binBag=fpMkPlane(0.30,0.09,0x1A1D22,1); binBag.position.set(binXpos,0.60,ez+0.21); g.add(binBag);
    /* 요청 반영: 정수기 좌측(더 -X 쪽)에 공기청정기 — 실사진의 회색 제습기처럼
       바퀴 달린 세로형 박스 + 위쪽 검은 그릴 + 작은 초록 디스플레이 */
    var pf=new THREE.Group();
    var pfBody=fpMkBox(0.46,1.05,0.42,0xC9CDD1,1,0x4A4E52); pfBody.position.set(0,0.53,0); pf.add(pfBody);
    var pfGrille=fpMkPlane(0.40,0.32,0x2B2E33,0.95); pfGrille.position.set(0,0.98,0.211); pf.add(pfGrille);
    var pfDisp=fpMkPlane(0.16,0.06,0x3ADB6B,0.9); pfDisp.position.set(0,0.72,0.211); pf.add(pfDisp);
    var pfBase=fpMkBox(0.46,0.06,0.42,0x2B2E33,1); pfBase.position.set(0,0.03,0); pf.add(pfBase);
    pf.position.set(purifierX,0,ez); g.add(pf);
    /* 요청 반영: 공기청정기 왼쪽 벽에 붙어 있던 스테인리스 분전반(LP-B1)
       패널과 그 명판은 삭제한다. */
  })();
  // 문 중앙 위 : 초록 비상구 표지등
  var exitSign=fpMkTex(0.62,0.31,fpExitSignTex(),1);
  exitSign.position.set(0, FP_B1_DOOR_H+0.30, zz0+0.03); g.add(exitSign);
  // 요청 반영: 시계를 비품 무리(왼쪽)에서 떼어내 비상구 표지등 오른쪽(+X, 오른쪽 벽 쪽)으로 이동
  var clock=fpMkTex(0.34,0.34,fpClockTex(),1);
  clock.position.set(FP_B1_DOOR_W/2+0.55, 1.85, zz0+0.03); g.add(clock);

  /* 요청 반영: 분전반(스테인리스 패널) 왼쪽에 실사진처럼 자주색 패널 벽 +
     흰 테두리 패널 + 회색 누빔 벤치 라운지를 다시 만든다(비품 무리와는
     겹치지 않게 분전반 왼쪽부터 시작). */
  (function(){
    var nkX0=-9.7, nkX1=-4.3;   // 요청 반영: 방 폭을 좁히면서 새 zx0(-10.0)에 맞춰 범위 축소
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
    // 빈 공간이 남아 보여서 요청 반영 — 테이블·의자를 2개 더 늘려 총 4개로
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

  /* 요청 반영: 문 오른쪽(+X) 벽 — 실사진(2번째 사진)처럼 아트월 줄눈 + 벽부등 3개 +
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

    /* 요청 반영: 시계 옆에 있던 화재경보 벨박스(은색 원판 + 빨간 점)는 삭제한다. */

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

  /* 요청 반영: 서쪽(+X) 벽을 실사진(2번째 사진)처럼 다시 만든다 —
     통창 + 펜던트 조명(색색, emissive만, 실제 광원 없음) + 검은 프레임/버건디
     좌판 의자가 달린 긴 창가 카운터 + 알록달록 라운지 의자 클러스터 +
     회색 소파 + 안쪽 유리 회의실 2칸 + 라운지 구간 짙은 카펫 바닥. */

  // 통창(격자 창살) + 펜던트 조명(케이블 + 검은 돔형 갓 + 따뜻한 전구)
  // + 창문 사이 콘크리트 기둥(줄눈 라인)
  // 요청 반영(실사진 대조): 색색 원뿔 갓이 아니라 전부 같은 검은 돔형 갓이었다.
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
    // 콘크리트 기둥(창문 사이, 얇은 줄눈 라인 2개) — 요청 반영: 3번째 창문 쪽에서
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
  /* 요청 반영(실사진 대조) : 예전엔 카운터가 벽에서 1.35m 떨어져 있고 의자가 카운터와
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
  longBench(zz0+1.8, zz0+10.6);   // 요청 반영: 끝을 살짝 당겨서 3번째 창문 기둥과 겹치지 않게
  longBench(zz0+12.6, zz0+21.8);

  /* 요청 반영(실사진 대조): 카운터와 안쪽 라운지 사이 통로에 작은 원형 카페 테이블 +
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
    /* 요청 반영(버그 수정) : 두 번째 세트가 소파 줄(z≈13.9~14.7)과 창가 카운터
       사이에 끼어 테이블·의자가 소파를 뚫고 있었다 — 소파 앞쪽(작은 z)으로 당기고
       x도 카운터에서 떨어뜨린다. */
    cafeSpot(zx1-2.7, zz0+3.0, 0xB0293F);   // 버건디 포인트 체어
    cafeSpot(zx1-2.9, zz0+4.1, 0x8A2E2A);   // 다크레드 포인트 체어
  })();

  /* 알록달록 곡선형 라운지 체어(에그체어 느낌) — 원기둥 좌석 + 반구 등받이 +
     가느다란 별 모양 다리(원판으로 단순화) — 초록·버건디·머스터드·블랙
     (요청 반영: 조금 더 안쪽/뒤쪽으로 이동 + 사진처럼 디테일 보강) */
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
  /* 요청 반영(버그 수정) : 오토만(길이 1.7)이 lngCx+2.0(=14.1)에 있어 창가 카운터와
     그 의자를 그대로 뚫고 있었다 — 라운지 서쪽(창 반대쪽)으로 옮긴다. */
  var ottX=lngCx-2.0, ottZ=lngCz+0.3;
  var ott=fpMkBox(1.7,0.40,0.62,0xE8813C,1,0x8A3E10); ott.position.set(ottX,0.20,ottZ); g.add(ott);
  var ottPillow=fpMkBox(0.44,0.16,0.50,0xD8D6CE,1,0x9A968A);
  ottPillow.rotation.y=0.12; ottPillow.position.set(ottX-0.55,0.48,ottZ-0.02); g.add(ottPillow);

  /* 라운지·카운터 구간 바닥 — 요청 반영(실사진 대조): 짙은 회색 한 장이라
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

  /* 요청 반영(실사진 대조) : 검은 ㄱ자 코너소파 하나였는데, 실제로는 올리브그린 소파와
     차콜그레이 소파(더 김) 두 개가 나란히 놓여 있었다 — 색·개수를 실사진에 맞춘다. */
  (function(){
    /* 요청 반영(버그 수정) : 예전 lx(zx1-4.6=10.9)로는 차콜그레이 소파(폭 3.1)가
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

  /* 요청 반영: 가운데 빈 공간에 실사진(2·3번째)처럼 검은 철제 트렐리스 +
     격자무늬 프로스티드 유리 파티션 + 원목 대형 회의 테이블(검은 프레임·
     버건디 좌판 롤링 의자) + 돌판 마감 기둥 + 잡지 진열대를 만든다.
     위치는 나중에 조정하기로 했으니 일단 중앙(x≈-2~4, 문에서 4~11m)에 배치. */
  (function(){
    var cz0=zz0+13.7, cz1=zz0+20.7, cx0=-4.3, cx1=1.9, trH=2.6;
    // 요청 반영: 북쪽 끝에 회의실 자리를 남겨야 해서 5m 정도 앞(문 쪽)으로 당김
    // 요청 반영: 동쪽 벽 왼쪽에서 3번째 초록 부스(z=zz0+22.2) 앞으로 이동

    // 0) 헤링본 원목 바닥 — 이 구역만 캔버스 텍스처로 V자 나뭇결 바닥재 적용
    /* 요청 반영(버그 수정): 이 텍스처는 가로세로 어떤 크기에 깔든 항상
       고정된 repeat(3,3)만 썼다 — 바닥이 정사각형이 아니라서(가로 8.2m,
       세로 9.0m) 같은 3칸을 서로 다른 실제 길이에 나눠 깔다 보니 널빤지가
       한쪽 방향으로만 눌리거나 늘어나 보였다. 실제 물리 치수 기준으로
       한 칸(약 1.4m)당 반복 횟수를 따로 계산해 널빤지 비율을 정사각으로
       맞춘다. */
    var hbW=cx1-cx0+2.0, hbH=cz1-cz0+2.0, hbTile=1.4;
    var hbTex=fpHerringboneTex().clone(); hbTex.needsUpdate=true;
    hbTex.repeat.set(Math.max(1,Math.round(hbW/hbTile)), Math.max(1,Math.round(hbH/hbTile)));
    var hbFloor=fpMkTex(hbW, hbH, hbTex, 1);
    /* 요청 반영(버그 수정): 이 헤링본 바닥판이 밑에 깔린 존 전체 바닥(zfl, y=0.02)과
       불과 0.003m 차이로 거의 같은 높이에 겹쳐 있어서, 카메라가 멀어지거나
       비스듬한 각도로 보면 두 바닥이 깊이(depth) 정밀도 한계로 서로 뚫고
       나오는 것처럼 깜빡이며(Z-파이팅) 마치 카펫/나뭇결 조각이 삐져나온
       것처럼 보였다 — 두 바닥 사이 높이 차를 넉넉히 벌려 확실히 위에 오도록 한다. */
    hbFloor.rotation.x=-Math.PI/2; hbFloor.position.set((cx0+cx1)/2,0.05,(cz0+cz1)/2); g.add(hbFloor);

    // 1) 검은 철제 트렐리스 — 각진 박공(경사) 지붕 프레임. 굵은 세로 기둥 + 도리(가로 보) +
    //    경사진 서까래(대각 보)를 반복해서 그물 같은 격자 지붕을 만든다(요청 반영: 부재를 더 굵게).
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

    /* 요청 반영: 트렐리스 프레임 자체의 좌우 긴 면(cx0/cx1 쪽)을 사진처럼
       반투명 프로스티드 유리로 채워서, 안쪽 테이블·의자 윤곽만 은은하게
       비치도록 한다. 무거운 굴절/투과 연산 없이 MeshPhongMaterial +
       opacity로만 눈속임(모바일 최적화 조건 그대로 준수).
       (요청 반영: 한 장 통유리로 막으니 너무 꽉 막혀 보여서, 실사진처럼
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

    // 4) 노출 콘크리트 마감 사각 기둥(둥근 폼타이 자국) — 요청 반영(실사진 대조):
    //    베이지 돌판 톤 + 작은 점이었는데, 실제로는 회색 노출 콘크리트에
    //    둥글고 또렷한 폼타이(거푸집 고정 볼트) 자국이 격자로 찍혀 있었다.
    var tblCx=(cx0+cx1)/2+0.9, tblCz=(cz0+cz1)/2;   // 요청 반영: 오른쪽(+X)으로 살짝 더 이동
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
    //    바퀴 달린 롤링 의자(요청 반영: 캐스터 4개 + 십자 다리)
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
    var rkX=cx0+0.4, rkZ0=cz0+0.6, rkZ1=cz1-0.6, rkH=1.9;   // 요청 반영: 바깥→안쪽으로 이동
    post(rkX, rkZ0, rkH); post(rkX, rkZ1, rkH);
    var rkTop=fpMkBox(0.05,0.05,rkZ1-rkZ0,postCol,1); rkTop.position.set(rkX,rkH,(rkZ0+rkZ1)/2); g.add(rkTop);
    var mCols=[0xC0392B,0x2E7D46,0x2A5DB0,0xC8A331,0xE8ECEF];
    /* 요청 반영(버그 수정) : 선반(shelf2)과 잡지(mg)에 rotation.x=-0.35를 줬는데,
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

    /* 요청 반영 : 테이블 동쪽(+X, cx1 쪽) 빈 바닥이 휑해 보여서, 개인 학습용
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

    // 6) 요청 반영: 트렐리스 구역(헤링본)과 동쪽 부스 사이 복도 — 밝은 그레이 타일
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
     요청 반영(근본 원인 수정): 지금까지 패널·가구가 벽감 '입구' 쪽(zx0+d 근처)에
     붙어 있었다 — 실제로는 그 자리가 복도와 가장 가까운 카메라 쪽이라,
     Three.js가 반투명 오브젝트를 카메라 거리순으로 그리면서 겹쳐 쌓은 색
     패널(back)이 항상 흰 테두리보다 나중에(위에) 그려져 테두리를 덮어버렸다.
     그리고 벽감 안쪽 깊이(2.15m)가 있는데도 패널·가구가 전부 입구 쪽에
     몰려 있어서 안쪽이 통째로 비어 보였다(깊이감 없음의 진짜 원인).
     지금은 패널을 벽감 '진짜 뒷벽'(zx0 바로 앞)에 붙이고, 가구도
     뒤(패널)→가운데(테이블)→앞(의자, 입구 쪽) 순서로 다시 배치한다. */
  function booth(cz, accent, wantPendant){
    /* 요청 반영(실사진 대조): 개구부가 폭 2.9m / 높이 3.05m라 세로로 긴 '문'처럼
       보였는데, 실제 사진의 벽감은 가로로 넓적하다(폭 > 높이) — 폭을 넓히고
       상부에 나무 소핏(헤더)을 넣어 개구부 높이를 낮춘다. */
    var bw=3.7, d=2.15, oh=2.42;   // 개구부 폭 / 깊이 / 개구부 높이(소핏 아래)
    var backX=zx0+0.02;   // 벽감 진짜 뒷벽 — 패널이 여기 붙는다
    var openX=zx0+d;      // 벽감 입구 — 복도와 만나는 자리

    // 1) 벽감(알코브) 몸체 — 옆벽 2장 + 천장 + 상부 소핏. 천장을 옆벽보다
    //    어둡게 하고 안쪽 코너에 짙은 선을 넣어서, 실제 그림자 없는 모바일
    //    렌더링에서도 깊이감이 또렷하게 읽히게 한다(가짜 AO).
    /* 요청 반영(버그 수정) : 옆벽·천장·바닥이 90도 돌아가 있었다.
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
    /* 요청 반영(실사진 대조): 패널이 벽감을 거의 꽉 채울 만큼 커서(2.8 x 1.68)
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
    /* 요청 반영(실사진 대조): 벽감 안에 짙은 회색 카펫을 깔았는데 실제로는 반대였다 —
       사진 속 벽감 바닥은 밝은 우드 톤(합판 마감이 바닥까지 이어짐)이고, 회색은
       바깥 복도 쪽이다. 벽감 깊이만큼만 밝은 우드 바닥을 깐다. */
    var boothFl = fpMkPlane(d, bw-0.06, 0xD9C298, 1);
    boothFl.rotation.x=-Math.PI/2; boothFl.position.set(zx0+d/2, 0.05, cz); g.add(boothFl);
    /* 요청 반영(버그 수정) : 벤치를 fpMkBox(bw-0.3, h, 0.10)으로 만들어서 긴 변(3.4m)이
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
    /* 요청 반영(실사진 대조) : 벤치(앞면 backX+0.75) → 살짝 띄운 테이블 → 그 앞 의자
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
  /* 요청 반영(근본 원인 수정): 벽감은 옆벽(핀)만 방 안쪽으로 튀어나와 있고
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
      /* 요청 반영(버그 수정): 예전엔 여기에 기둥 윗면(cap)을 ZH-0.01에 깔았는데,
         존 전체 천장(zcl, y=ZH)과 불과 0.01m 차이라 깊이 정밀도 한계로 서로
         뚫고 나오며 깜빡였다(Z-파이팅) — 존 안에서 고개를 위아래로 움직일 때
         천장이 깨져 보이던 원인. 기둥 위는 어차피 존 천장이 덮으므로 지운다. */
    }
  })();

  /* 요청 반영: 정체가 애매하게 남아있던 짙은 남색 자판기 박스 제거 */

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
  /* 요청 반영(실사진 반영) : 나가는 문을 검은 알루미늄 프레임 통유리 스토어프론트로
     다시 디자인한다 — 문 좌우(적어도 왼쪽, 오른쪽은 회의실이 바로 붙어 있어 자리가 없음)
     통유리 벽 + 위쪽 트랜섬 유리 + 초록 비상구 표지등 + KSNU 로고/영문 레터링. */
  var glassFrColor=0x14181D, exGlassH=exH;   // 요청 반영: 문 높이(exH)와 정확히 맞춰서 문-유리 경계 트랜섬 라인이 끊기지 않게
  /* 요청 반영(실사진 대비 리얼리티 개선) :
     (1) 프레임을 두께 없는 판(fpMkPlane) 대신 광택 있는 입체 각재(Box+envMap)로 만든다
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
    /* 요청 반영(실제 사진처럼 맑은 유리): 기존 0x223344/opacity 0.55는 색이 짙고
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
  /* 요청 반영(실사진) : 문 라인 위로 '트랜섬(상부 고정창) 유리 띠'를 한 줄 더 올린다.
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
  /* 요청 반영(Z-파이팅 원인 4, 중복 지오메트리 제거) : 예전에는 오른쪽 전체(exX+exW/2~zx1)에
     이 자리에서 크림색 배경벽(wR)을 깔았는데, 그 뒤로 회의실 코드가 같은 Z(exZ)에
     '문-회의실1 사이 유리 패널'을 그 위에 다시 그리면서 정확히 같은 좌표에 두 벽이
     겹쳐 깜빡였다(Z-fighting). 그 자리는 이제 회의실 코드가 전담해서 채우므로 여기서는
     따로 벽을 만들지 않는다(중복 제거). */
  /* 요청 반영: 나가는 문을 마주봤을 때 오른쪽(코드상 zx0 쪽)은 검은 프레임
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
  /* 요청 반영(삭제): 이 흰색 필름 띠는 통유리 벽에 붙는 시트지였는데, 그 벽을
     불투명 금속 패널로 바꿨으므로 더 이상 의미가 없다(패널 위에 흰 띠만
     덩그러니 남는다) — 없앤다. */
  /* 요청 반영: 벽을 금속 패널로 바꿨으니 끝(zx0)의 코너 리턴도 같은 패널로
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
  /* 요청 반영: 표지등이 작고 어두워 잘 안 보였다 — 판 크기를 키우고
     뒤판 발광도 밝게 올려서 존 안쪽에서도 확실히 눈에 띄게 한다. */
  /* 요청 반영(버그 수정): 여기 있던 초록 발광 뒤판(exExitGlow)은
     fpMkBox(0.94, 0.02, 0.46) — 높이 2cm에 깊이 46cm짜리 '납작하게 누운' 판이라,
     표지판(exZ-0.08)보다 18cm나 앞(exZ-0.26)까지 튀어나와 있었다.
     눈높이(1.6m)에서 2.6m 높이의 표지등을 올려다보면 이 판의 아랫면(0.94×0.46)이
     그대로 보여서, 초록 덩어리가 비상구 픽토그램을 가려버렸다 — 판을 삭제하고
     표지판 텍스처만 남긴다. */
  var exExitSign=fpMkTex(0.90,0.44,fpExitSignTex(),1);
  exExitSign.rotation.y=Math.PI; exExitSign.position.set(exX, exH+0.34, exZ-0.08); g.add(exExitSign);
  /* 안쪽 문(존에서 보이는 문) — 검은 프레임 + KUNSAN NATIONAL UNIVERSITY 레터링 + KSNU 로고
     요청 반영: 나갈 때 다가가면 실제로 여닫이(경첩)로 열리는 모션을 추가한다 —
     크리에이티브 존 입구 문과 같은 fpRegisterAutoDoor 메커니즘을 그대로 쓰되,
     이 문은 "나가는" 문이므로 존 안쪽(작은 z, 곧 exZ보다 작은 쪽)에서 다가갈
     때만 열리게 한다(oneWay:-1 — 입구 문이 복도 쪽에서만 열리는 것과 같은 방식). */
  /* 요청 반영(수정) : 예전엔 안쪽 2.6m / 바깥 1.7m로 어긋나게 잡아서, 한 번에
     문 앞까지 이동하면 안쪽 문만 열리고 바깥 문은 한 번 더 눌러야 열렸다 —
     두 문 다 같은 거리(FP_B1_EXIT_DOOR_TRIG)에서 열리게 맞춰, 나가는 문 앞에
     서면 이중문이 한꺼번에 열린다.
     oneWay:0 : 나갈 때(존 → 계단)뿐 아니라 다시 들어올 때(계단 → 존)도 열린다
     (요청 반영 — 예전엔 -1이라 한쪽 방향에서만 열렸다). */
  var exDoorIn=fpMakeGate({w:exW, h:exH, dark:true, accent:'#8FE3E0',
                           autoOpen:true, oneWay:0, noMullion:true, push:true,
                           trigDist:FP_B1_EXIT_DOOR_TRIG});
  exDoorIn.rotation.y=Math.PI; exDoorIn.position.set(exX,0,exZ-0.05); g.add(exDoorIn);
  /* ── 문 유리 레터링(KUNSAN NATIONAL UNIVERSITY) + KSNU 로고 ──
     요청 반영(버그 수정): 예전엔 이 장식들을 문이 아니라 벽 쪽 그룹(g)에 붙여
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
     양면에 각각 붙인다(요청 반영). */
  /* 요청 반영(삭제): 이 문 유리에 붙어 있던 장식 세 가지를 모두 없앤다 —
     ① 'KUNSAN NATIONAL UNIVERSITY' 레터링, ② 그 오른쪽 흰 원판(로고 바탕),
     ③ 원판 위 'KSNU' 글씨. 문 유리는 아무것도 없는 맑은 유리로 둔다.
     (exGateDecals 함수 자체는 남겨 두되 호출하지 않는다) */
  /* 방풍실(두 문 사이 짧은 공간) — 바닥·천장·양옆 유리벽 */
  /* ══════════════════════════════════════════════════════════════
     방풍실 + 바깥문 + 계단실 — 요청 반영: 전체를 처음부터 다시 정리해서 작성.
     사진 기준 순서 그대로: 방풍실 → 바깥문(오른쪽 문 살짝 열림) → 계단 5단
     → 계단참(정면 벽돌 벽에서 끝) — 걸어서 못 올라가는 2구간·위쪽 문은
     화면에 계속 혼란을 줘서 아예 만들지 않는다.
     ══════════════════════════════════════════════════════════════ */

  /* ── 1. 방풍실 (이중문 사이 전실) : 폭 exW+0.9 × 깊이 vestD × 높이 vH ── */
  /* 요청 반영: 계단실 벽돌벽 높이(sH)를 방풍실 코드보다 먼저 써야 해서 앞으로 끌어왔다 —
     값 자체는 그대로(계단참 정면 적벽돌 벽이 유리문 시야를 위까지 가득 채우도록 4.6). */
  var sH=6.4;   // 요청 반영: 2구간 계단이 2.8m까지 오르므로, 맨 위 문·트랜섬이 들어가도록 더 높인다
  var vZ0=exZ, vZ1=exZ+vestD, vH=exH+0.85;   // 요청 반영: 층고가 낮아 보여서 exH+0.32 → exH+0.85로 높인다
  var vfl2=fpMkPlane(exW+0.9, vestD, 0xB7B2A6, 1);
  vfl2.rotation.x=-Math.PI/2; vfl2.position.set(exX,0.02,(vZ0+vZ1)/2); g.add(vfl2);
  var vcl2=fpMkPlane(exW+0.9, vestD, 0xE9E5D9, 1);
  vcl2.rotation.x=Math.PI/2; vcl2.position.set(exX,vH,(vZ0+vZ1)/2); g.add(vcl2);
  /* 요청 반영(실사진 3·4 대조) : 방풍실 양옆이 파란 유리판 한 장뿐이라 너무 휑했다.
     실제로는 ① 유리 너머로 바깥 붉은 벽돌벽(-X)과 안쪽 베이지 석재 타일벽(+X)이 보이고,
     ② 유리 자체는 검은 알루미늄 프레임(하부·상부 레일 + 세로 멀리언)으로 나뉘어 있으며,
     ③ 가운데 높이에 흰색 프로스트(시트지) 띠가 가로로 지나간다.
     그 세 가지를 채워 넣는다. */
  [-1,1].forEach(function(sn){
    var vWX=exX+sn*(exW+0.9)/2, vZc=(vZ0+vZ1)/2, FRM=0x14181D;

    // ① 유리 너머 배경 벽 + 그 사이 바닥·천장(허공으로 보이지 않게)
    /* 배경벽 폭은 방풍실 깊이(vestD)에 딱 맞춘다 — 이보다 넓게 잡으면 바깥
       벽돌 파사드(z=vZ1+0.02) 너머로 삐져나와, 계단에서 돌아볼 때 벽돌벽 위에
       엉뚱한 타일판이 서 있는 것처럼 보인다(요청 반영: 버그 수정). */
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

    /* ④ 요청 반영(삭제): 방풍실 옆 유리벽 가운데의 흰색 프로스트 시트지 띠를
       없앤다 — 존에서 나가는 문을 정면으로 보면 문 좌우 끝에 흰 사각형
       두 개가 떠 있는 것처럼만 보였다. 유리는 그대로 맑게 둔다. */
  });
  /* 요청 반영: 방풍실 옆 유리벽은 높이가 vH(층고)까지만 있는데, 계단실 벽돌벽은
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
  // 요청 반영: 천장에 하얗게 도드라져 보이던 매립 스폿등 3개를 제거한다(발광 메쉬가 하얀 얼룩처럼 보였음).

  /* ── 2. 바깥 문 (방풍실 끝, 폭 exW×높이 exH) ──
     요청 반영(버그 수정) : 예전엔 이 문을 처음부터 양쪽 1.2rad로 활짝 벌려
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
  /* 요청 반영(근본 수정, 비상구 표지등과 같은 문제): 이 레터링도 방풍실 쪽과
     계단 쪽 양쪽에서 다 보이는데, 한 장짜리 판은 한쪽 방향에서만 정방향으로
     읽히고 반대쪽에서는 거울처럼 뒤집혀 보인다 — 실제 유리문 시트지도 보통
     양면에 각각 붙이는 것처럼, 두 장을 각 방향에 맞는 회전으로 겹쳐 둔다. */
  /* 요청 반영: 바깥 문에는 레터링·로고를 붙이지 않는다. 안쪽 문과 똑같은 글씨를
     같은 높이에 한 번 더 붙이면, 존에서 유리 너머로 볼 때 두 글씨가 겹쳐 보여서
     ("문이 두 개 겹쳐 있다") 안쪽 문이 열렸는지 알아보기 어려웠다 —
     실제 방풍실처럼 안쪽 문에만 시트지를 붙이고 바깥 문은 맑은 유리로 둔다. */
  /* 요청 반영(버그 수정): 이 비상구 표지등은 원래 계단 쪽(z 큰 쪽)에서 보는
     걸 기준으로 글로우판/픽토그램 앞뒤 순서를 잡아 뒀는데, zonefoot 카메라는
     반대로 방풍실 안쪽(z 작은 쪽)에서 문을 보고 있어서 순서가 뒤집혀 —
     초록 글로우 판이 픽토그램보다 카메라에 더 가깝게 그려져 그냥 초록색
     덩어리처럼 보였다. 이 시점 기준으로 앞뒤를 다시 맞춘다. */
  /* 요청 반영(근본 수정): 이 표지등은 방풍실 쪽(zonefoot, 작은 z)에서도 보고
     계단/바깥 쪽(크리에이티브 존으로 들어오는 길, 큰 z)에서도 봐야 하는데,
     글로우판+픽토그램 두 장을 한 세트만 쓰면 앞뒤 순서가 한쪽 방향에만 맞고
     반대쪽에서는 글로우판이 픽토그램을 가려버린다(둘 다 만족 불가능).
     → 글로우판을 가운데 두고, 픽토그램 판을 양쪽에 하나씩 복제해 샌드위치
     구조로 만든다 — 어느 방향에서 봐도 글로우판보다 픽토그램이 더 가깝다. */
  /* 요청 반영: 실제 사진에는 이 작은 비상구 표지판이 없다 — 삭제.
     (기존 exExitGlow2 / exExitSignA / exExitSignB 3개 메쉬 제거) */
  /* 요청 반영: 유리를 맑게(opacity 0.2) 바꾸면서, 뒤쪽 계단이 안 보이게 막던
     불투명 배면판(exBack)도 함께 지운다 — 이제는 그 뒤로 계단·벽돌·숲이
     실제 사진처럼 비쳐 보여야 하므로 막을 필요가 없다. */

  /* 요청 반영: 문 앞이 휑해 보여서, 실제 출입구처럼 안쪽 매트·문턱 스트립과
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
     [역방향(계단 위→바깥 문) 시점 보강] 요청 반영:
     실제 사진(후문 외부)처럼 '중앙 양방향 유리문 + 좌우 통유리 파티션
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
       요청 반영(버그 수정): 예전엔 방풍실 폭 전체(vestW-0.06)를 가로지르는 한 장이라
       문짝 앞까지 덮고 있었다 — 크리에이티브 존에서 나가는 문을 보면 문 가운데에
       흰 띠가 겹쳐 보이고(문 유리 레터링과도 겹침), 문이 열려도 그 자리에 그대로
       떠 있었다. 복도 쪽 필름 띠(bandX1=exX-exW/2에서 끊은 것)와 같은 방식으로
       문 개구부를 비우고 좌우 유리에만 남긴다. */
    /* 요청 반영(삭제): 좌우 사이드라이트에 남겨 뒀던 프로스트 띠도 없앤다 —
       존에서 나가는 문을 보면 문 좌우 끝에 흰 사각형 두 개가 떠 있는 것처럼
       보였다(방풍실 옆 유리의 띠와 같은 이유). 사이드라이트도 맑은 유리로 둔다. */

    // 4) 상단 루버 천장 — 문 상단을 감싸는 민트/청회색 선형 알루미늄 패널
    var louverCol=0xAFC7C4, louverN=9;
    /* 요청 반영(버그 수정) : 루버 슬랫이 방풍실 바깥(vZ1+0.4)까지 뻗어 있어서,
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

    /* 5) 요청 반영(실사진 대조) : 문 양옆에 세워 뒀던 벽돌 각기둥 2개는 삭제한다 —
       실제로는 기둥 없이 벽돌 벽면이 문까지 그대로 이어진다. */

    /* 6) 출입구 벽돌 벽(파사드) — 요청 반영 :
       계단 쪽에서 나가는 문을 돌아보면 문틀·기둥 양옆이 계단실 폭(sW=12m)
       끝까지 뻥 뚫려 있어서, 그 너머의 크리에이티브 존 뒷벽(크림색)과 그 위
       빈 배경(검은 띠)이 그대로 보였다. 실제 사진처럼 이 출입구는 붉은 벽돌
       벽 한가운데에 유리문이 끼워진 형태이므로, 계단실 폭 전체를 벽돌로 막고
       방풍실 폭(vestW)×높이(vH)만큼만 문 구멍으로 남긴다.
       (재질은 계단실 벽돌벽과 같은 fpBrickTexFor 텍스처를 쓰되, 큰 면적을
        확실히 가려야 하므로 옥탑방 벽돌 껍질처럼 불투명·깊이쓰기 메쉬로 만든다
        — 반투명 큐에 들어가면 그리는 순서에 따라 뒷벽이 비쳐 보인다.) */
    (function(){
      var fz=vZ1+0.02;                       // 유리 프레임(vZ1-0.06)보다 살짝 바깥
      /* 요청 반영(실사진 대조) : 예전엔 문 구멍을 방풍실 전체 높이(vH=3.09)로 뚫어 둬서,
         밖에서 문 위를 올려다보면 방풍실 트랜섬 유리와 루버 천장이 그대로 보였다 —
         실제로는 문 위가 벽돌로 꽉 막혀 있다. 구멍을 문 높이만큼만 남기고
         그 위는 전부 벽돌로 채운다. */
      /* 요청 반영: 문 위를 트랜섬(고정 유리)까지 '문 구멍'으로 뚫어 뒀더니,
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
      /* 요청 반영: 파사드 높이를 계단실 벽(sH)보다 3m 더 올린다 — 밖에서 문 위를
         올려다볼 때 벽돌이 끝나고 그 위로 하늘판/빈 공간이 드러나던 것을 없앤다.
         (실제로도 이 문 위로는 건물이 계속 올라간다) */
      var facH=sH+3.0;
      brickPanel(ox0-fx0, facH, (fx0+ox0)/2, facH/2);      // 문 왼쪽
      brickPanel(fx1-ox1, facH, (ox1+fx1)/2, facH/2);      // 문 오른쪽
      brickPanel(vestW, facH-openH, exX, (openH+facH)/2);  // 문 위 인방(천장까지 꽉)

      /* 요청 반영(실사진 2·3 대조) : 벽돌 면만 있어서 계단에서 돌아보면 양옆이
         휑했다 — 실제로는 ① 문 앞을 덮는 짙은 청록회색 금속 패널 처마(리브 줄눈 +
         매립 다운라이트), ② 벽 아래 밝은 콘크리트 걸레받이 띠, ③ 구석의 소화기가 있다. */
      /* 요청 반영: 처마(와 그 위 벽돌)를 조금 더 앞으로 내밀어, 2구간 계단
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
      /* 요청 반영(버그 수정): 처마(검은 판) 위가 파사드(z=fz)와 처마 앞면(z=cz1)
         사이로 벽 꼭대기까지 뻥 뚫린 빛우물이었다 — 문 밖에서 올려다보면 벽에
         네모난 구멍이 뚫려 그 속이 들여다보이는 것처럼 보였다("검은 판 위가
         뚫려 있다"). 처마 앞면 선에서 파사드 꼭대기까지를 벽돌로 막아, 처마가
         '벽에 붙은 차양'으로 읽히게 한다. (윗면은 v66에서 넣은 마감판이 덮는다) */
      (function(){
        /* 요청 반영(버그 수정): 이 벽돌면을 처마 끝단 띠(fascia: y cy~cy+0.24,
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
      /* 요청 반영: 처마에 달았던 매립 다운라이트 2개는 삭제한다. */
      var base=fpMkPlane(sW, 0.18, 0xB9B4A8, 1);          // 벽 하부 콘크리트 띠
      base.position.set(exX, 0.09, fz+0.02); g.add(base);
      /* 요청 반영: 문 밖 구석 소화기는 삭제한다. */
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
      /* 요청 반영(실사진 대조) : 나가는 문을 마주봤을 때 왼쪽(+X) — 문과 회의실 블록
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

      /* 요청 반영(버그 수정) : 의자를 테이블과 '같은 z(inZ)'에 놓아서 의자가 통째로
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
    /* 요청 반영(계단 입체감 정밀 교정): 디딤판 색을 밝게 올려(0x6C6863→0x9A9186)
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

  /* ── 열린 하늘/채광 느낌 ── 요청 반영: 지금까지는 계단·계단참 위가 그냥
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
    /* 요청 반영(버그 수정): 이 채광판 위(벽 높이 sH ~ 파사드 높이 sH+3.0)는
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
    /* 요청 반영(좌우 반전): 실사진처럼 오른쪽이 적벽돌, 왼쪽이 검은 프레임
       다단 유리창이 되도록 두 변을 서로 바꿔 배정한다. */
    var glassSideZ=(dir>0)?corZ0:corZ1;   // 유리벽 쪽(왼쪽 — 야외 수목이 비치는 쪽)
    var brickSideZ=(dir>0)?corZ1:corZ0;   // 벽돌벽 쪽(오른쪽)
    /* 요청 반영(버그 수정): 안/밖 방향 오프셋을 dir 부호로 추측해서 계산했더니
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

    /* 요청 반영(버그 수정) : 이 벽들을 fpMkTex로 만들었는데 그 헬퍼는
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
    // 계단 옆 벽(양쪽 모두 적벽돌 — 요청 반영: 원래 통유리였던 쪽도 벽돌로 교체)
    corBrickWall(stairLen, sH, (P.xB0+P.xB1)/2, sH/2, brickSideZ);
    corBrickWall(stairLen, sH, (P.xB0+P.xB1)/2, sH/2, glassSideZ);

    // 맨 위 참(계단 다 오른 뒤, 문 앞까지) — 화강암 바닥 + 벽 계속
    var topFl=fpMkPlane(topLandLen, CW, 0x5C5852, 1, 0x14120F);
    topFl.rotation.x=-Math.PI/2;
    topFl.position.set((P.xB1+P.xB2)/2, corTopY+0.02, P.zMid); g.add(topFl);
    /* 요청 반영(버그 수정): 여기서 sH(지붕 높이)에서 N2*RISE만 빼고 있었는데,
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

    /* 요청 반영(버그 수정): 통로를 밝히려고 여기에 '가산혼합 발광판(corFill)'을
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
       붙이되, 요청 반영: 완전 수평 대신 벽돌 쪽이 살짝 더 높은 사선(외쪽매)
       지붕으로 살짝 기울여 실사진의 각진 느낌을 살린다. */
    /* 요청 반영: 지붕을 사선(외쪽매)으로 살짝 기울여 뒀는데, 계단을 다 올라
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
       요청 반영(근본 수정): 문의 모든 y좌표가 바닥을 0(지상)으로 가정하고 있었는데,
       이 참의 실제 바닥은 corTopY(1구간+2구간을 다 오른 높이)만큼 떠 있다 —
       그래서 문 전체가 눈에 보이는 바닥보다 한참 아래(땅속)에 지어져, 정면에서
       보면 문이 아예 없이 뻥 뚫려 바깥 숲만 보이는 것처럼 보였다. corTopY를
       바닥 기준으로 더해 실제 참 바닥 위에 서도록 맞춘다. */
    var doorX=P.xB2, doorW=2.2, doorH=exH, doorRotY=(dir>0)?-Math.PI/2:Math.PI/2;
    [-1,1].forEach(function(sd){
      var gp=exGlassPane(doorW/2-0.02, doorH);
      gp.rotation.y=doorRotY;
      gp.position.set(doorX, corTopY+doorH/2, P.zMid+sd*doorW/4); g.add(gp);
      /* 요청 반영: 손잡이를 다시 단다. 예전엔 새까맣고 얇은 봉이 유리 한복판에
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
    // 요청 반영: 문 중앙 가로 엠보 띠(KSNU 로고 + 군산 텍스트)는 삭제한다.
    var vMid=exFrameBar(EXFR_D, doorH, 0.10); vMid.rotation.y=doorRotY;
    vMid.position.set(doorX, corTopY+doorH/2, P.zMid); g.add(vMid);
    [-1,1].forEach(function(sd){
      var vSide=exFrameBar(EXFR_D, doorH, 0.10); vSide.rotation.y=doorRotY;
      vSide.position.set(doorX, corTopY+doorH/2, P.zMid+sd*doorW/2); g.add(vSide);
    });
    var hTop=exFrameBar(doorW, EXFR_D, 0.10); hTop.rotation.y=doorRotY;
    hTop.position.set(doorX, corTopY+doorH, P.zMid); g.add(hTop);
    /* 요청 반영(버그 수정): 트랜섬을 지붕 바로 밑까지 늘렸더니, 그만큼
       숲 배경판도 같이 높아져서 1구간 계단실 저 멀리·다른 각도에서 다시
       벽 틈으로 새어 보이는 문제가 되살아났다("살짝 깨져 보인다"는 창문
       모양 얼룩) — 트랜섬 유리 높이는 원래의 안전한 값(roofY-0.05)으로
       되돌리고, 그 위 남는 좁은 틈(문틀 위~지붕)은 아래 오파크(불투명)
       상인방 띠로 막아서, 숲 배경판 크기는 그대로 유지한 채 "위쪽이 잘려
       보이는" 문제만 따로 해결한다. */
    /* 요청 반영(버그 수정): 문 위 트랜섬을 '고정 유리'로 두었는데, 그 유리는
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
    /* 요청 반영(버그 수정): 트랜섬 유리 맨 위(roofY-0.05)와 지붕(roofY) 사이에
       남는 좁은 틈을 불투명한 상인방(헤더) 띠로 막는다 — 실제 건물에서도
       유리문 위 꼭대기는 보통 이런 마감 프레임으로 끝나므로 자연스럽다.
       숲 배경판을 다시 늘리지 않고도 "위쪽이 잘린 것 같다"는 인상을 없앤다. */
    /* 요청 반영 : 문(폭 doorW) 양옆이 뻥 뚫려 바깥 숲이 그대로 보였다 —
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
    /* 요청 반영: 위 벽돌 인방이 문 위 전체를 덮으므로, 예전에 틈막이로 넣었던
       짙은 회색 헤더 띠는 없앤다(그 띠도 '문 위 검은 부분'의 일부였다). */

    /* 요청 반영: 정면 유리문·좌측 유리 파티션 너머로 울창한 초록 야외 숲이
       비치도록, 로우폴리 나무 대신 부드러운 캔버스 숲 배경판 하나로 대체한다. */
    (function(){
      var outCx=doorX+dir*2.6, groundY=corTopY;
      /* 요청 반영(버그 수정): 숲 배경판 높이를 6.5m로 크게 잡아서, 위쪽이
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
      /* 요청 반영(버그 수정): 배경판이 문에서 2.6m나 뒤에 있어서, 문 앞에 서면
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
      /* 요청 반영(버그 수정): 위에서 바닥판까지 같이 넓혔더니, 안쪽 복도
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
    /* 요청 반영: 옥탑방·비상계단 옥탑방·크리에이티브존 내부를 뺀 모든 벽지를
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
  /* 요청 반영(삭제): 창 오른쪽에 붙여 뒀던 작은 액자형 안내판(회색 판 두 장)을
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
       (화분 세 개는 엘리베이터에서 내리면 정면에 바로 보여서 치웠다 — 요청 반영) */
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
/* 요청 반영: 옥상 철문을 실제로 열고 나가는 기능을 다시 활성화한다.
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
  /* 요청 반영: 자유 탐색 중에도 다른 층 계단 근처처럼 "다가가면 멈추고
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
   계산한다(요청 반영: 예전 공식이 그대로 남아있어 방을 실측 비율로 좁힌 뒤로
   좌표가 크게 어긋나 있었다 — "내려가기" 버튼이 뜨는 시점의 카메라 시선이
   엉뚱한 방향을 보게 만든 원인이었다). */
function fpRoofSkipCentroid(){
  var ST=BUILDING_Z_STRETCH, stZ=(FLOOR_LAYOUT[5]?FLOOR_LAYOUT[5].stZ:0)*ST;
  var ROOF_OW_MUL=1.0, ROW=FP_ST_OW*ROOF_OW_MUL, RM_DX=0.45, RM_DZ=0.35;   // v115: 0.45로 복귀 (fpMakeRoof와 동일)
  var mainCX1=FP_WALL_X+FP_ST_WD-0.80+0.35+RM_DX;
  /* 요청 반영(구조 정정): 중앙계단 열 맞바꿈을 되돌렸으므로(_colFlip=1),
     내려가는 단은 -Z열이다 — fpMakeRoof와 완전히 같은 공식을 쓴다. */
  var realDnZ0pre=stZ-(ROW/4+0.02)-(ROW/2-0.10)/2-0.10;
  var realDnZ1pre=stZ-(ROW/4+0.02)+(ROW/2-0.10)/2+0.10;
  var downFlightW=realDnZ1pre-realDnZ0pre;
  var skipGap=0.06;
  var ROOM_WIDEN=0.6;
  var mainCZ0=realDnZ0pre+0.03;   // v114: 옥탑방 -Z 벽을 다른 층 계단실 옆벽(zc-hw)과 같은 면(2cm 뒤)에 — 5층 옆벽과 옥상 옆벽이 한 면으로 이어지고 계단참 철문이 5층 벽에 가려지지 않는다
  var mainCZ1=realDnZ1pre+2.92;   // v111(요청 반영): +Z 벽을 데크 계단(시작 realDnZ1pre-0.08, 폭 2.95) 오른쪽에 딱 붙인다 — 계단과 벽 사이 공간 없음. v110의 +1.5m 확장 취소
  var wallZ1=mainCZ1-0.02;
  var freeZ0=realDnZ1pre+0.06, freeZ1=mainCZ1-0.3;
  /* 요청 반영: 데크 왼쪽(-Z) 끝을 방 벽면까지 완전히 붙인다 — 예전엔 여유
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
  var DKY=1.30, DKT=0.12;                 // 스킵 플로어 바닥 높이 · 두께. v107: 1.42→1.30 (실사진 비율, 요청 반영)
  wallZ1 = (wallZ1!==undefined) ? wallZ1 : freeZ1;
  /* 요청 반영: 뒷벽 전체 폭에 메쉬가 이어지도록, 예전에 있던 2.6m 상한을 없애고
     이 방에서 실제로 비어 있는 자리(freeZ0~freeZ1) 전체를 채운다. */
  /* 요청 반영: 데크 왼쪽(-Z) 끝을 방 벽면까지 완전히 붙인다 — 예전엔 여유
     0.1m + 시작점 보정 때문에 벽과 데크 사이에 틈이 남아 있었다. */
  var zw=Math.max(0.1, (wallZ1-0.02)-freeZ0);
  /* 요청 반영: 데크·계단 모두 실제 방의 우측 벽(wallZ1)에 밀착시킨다 —
     예전엔 자유공간 한가운데 떠 있어서 옆으로 여백이 남아 있었다. */
  var dz1=wallZ1-0.02, dz0=dz1-zw;
  var zc=(dz0+dz1)/2;
  var DKX1=cx1-0.02, DKX0=DKX1-1.90;      // 뒷벽(=창문 벽) 위에 밀착. v115: 깊이 1.90 — 데크 계단(8단×0.26=2.08m) 첫 단이 개구부 시작선보다 약 1.1m 안쪽(x≈4.3)에서 시작해, 5층에서 올라온 자리와 계단 사이에 바닥이 남는다
  /* v141(요청 반영): 데크 바닥 · 밑을 채운 공간 · 그 바닥 띠가 서로 다른 색·재질이라
     따로 노는 물건 세 개처럼 보였다 → 아래 한 쌍의 상수로 전부 통일한다.
     색은 옥탑방·계단실 벽과 같은 0xC9C0AE, 재질은 그 벽들이 쓰는 Phong(emissive)
     계열(fpMkPlane/fpMkBox의 emi 분기)로 맞춰, 데크와 채움면이 한 덩어리로 읽히게 한다. */
  var SKIN=0xC9C0AE, SKIN_EMI=0x39352B;
  /* 데크(무대형 상부 바닥) */
  var deck=fpMkBox(DKX1-DKX0, DKT, dz1-dz0, SKIN, 1, SKIN_EMI);
  deck.position.set((DKX0+DKX1)/2, DKY+DKT/2, zc); g.add(deck);
  /* v114(요청 반영): 데크 밑면은 조명이 위에만 있어 새까맣게 보였고, 5층 계단에서 올려다보면
     옥상 천장이 뚫린 것처럼 읽혔다 — 밝은 밑면 판(자체발광)을 붙여 아래 계단참의 천장처럼 보이게. */
  var deckUnder=fpMkPlane(DKX1-DKX0, dz1-dz0, SKIN, 1, SKIN_EMI);
  deckUnder.rotation.x=Math.PI/2; deckUnder.position.set((DKX0+DKX1)/2, DKY-0.006, (dz0+dz1)/2); g.add(deckUnder);
  var deckTop=fpMkBox(DKX1-DKX0-0.04, 0.01, dz1-dz0-0.04, SKIN, 1, SKIN_EMI);
  deckTop.position.set((DKX0+DKX1)/2, DKY+DKT+0.005, zc); g.add(deckTop);
  /* 앞 가장자리 마감 — 예전엔 바닥까지 이어지는 통짜 회색 박스로 막아서
     실사 사진과 반대로 "거대한 회색 블록"이 창문을 가리고 하부를 완전히
     막아버렸다(요청 반영: 하부 개방, 창문이 보이도록 얇은 상단 띠만 남긴다). */
  /* v103(실사진 반영): 데크 앞면은 두꺼운 회색 띠가 아니라 얇은 흰색 보 — 높이 0.18, 벽에 가까운 밝은 톤 */
  var fascia=fpMkBox(0.06, 0.18, dz1-dz0, SKIN, 1, SKIN_EMI);
  fascia.position.set(DKX0-0.03, DKY+0.02, zc); g.add(fascia);
  /* 옆면(양 끝)도 마감해, 옆에서 보는 각도에서 "중간에 잘린" 것처럼 보이지
     않고 어느 방향에서 봐도 하나로 이어진 받침대로 읽히게 한다(요청 반영). */
  /* 요청 반영(v97 버그 수정): 이 옆 마감띠를 데크 바깥쪽(f[0]+f[1]*0.03)으로
     내밀어 두었는데, 데크가 방 벽에 밀착된 뒤로는 -Z쪽 띠의 바깥 면이 옥탑방
     바깥 벽돌 껍질(cz0-0.04)과 정확히 같은 평면에 놓여, 옥상에서 벽돌 벽
     한가운데 회색 판이 비쳐 보였다(프레임 깨짐). 데크 안쪽으로 물려 넣고
     6mm만 내밀어, 데크 옆면은 덮되 벽에는 닿지 않게 한다. */
  [[dz0,-1],[dz1,1]].forEach(function(f){
    var sideFascia=fpMkBox(DKX1-DKX0, 0.18, 0.06, SKIN, 1, SKIN_EMI);   // v141: 데크·채움면과 같은 색·재질
    sideFascia.position.set((DKX0+DKX1)/2, DKY+0.02, f[0]-f[1]*0.024); g.add(sideFascia);
  });
  /* 데크 위 캐비닛/장롱 — 뒷벽에 바짝 붙여 배치. 데크가 방 전체 폭으로 넓어진
     뒤로는 캐비닛 하나만 덩그러니 있어 허전했다(요청 반영) — 레퍼런스 사진처럼
     캐비닛 옆에 포장된 자재·기대어 세운 패널·라디에이터 같은 잡동사니를
     더해 채운다. */
  /* 요청 반영: 잡동사니를 데크 오른쪽(+Z, 계단 쪽) 끝으로 몰고, 실사진처럼
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
    /* 요청 반영(버그 수정): fpMkBox의 인자는 (X폭, Y높이, Z깊이)인데 여기만
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
  /* 요청 반영: 검은 철문을 뒷벽(DKX1)이 아니라 데크 왼쪽(-Z) 끝벽으로 옮기고,
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
    /* 요청 반영: 손잡이가 두 개(왼쪽 네모 판 + 오른쪽 둥근 손잡이)로 보여서
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
  /* 요청 반영: 데크 아래 초록 프레임 창문 2개를 삭제한다 — 문을 등지고
     돌아봤을 때 벽에 초록 액자 두 개가 붙어 있는 것처럼 어색해 보였다.
     (win 함수 자체는 나중에 되살릴 수 있게 남겨 둔다) */
  /* win(dz0+0.65); win(dz1-0.65); */
  /* 오르는 계단(6단) — 메인 바닥(y=0.06)에서 자연스럽게 시작해 데크 앞
     가장자리까지, 우측(벽 쪽)에 밀착시킨다(요청 반영: 첫 발판이 메인 바닥
     높이에서 시작하도록 기준 높이를 floorY로 맞춘다). */
  var floorY=0.06;
  var N=8, rise=(DKY-floorY)/N, run=0.26;   // v115
  /* 요청 반영: 계단 폭이 2.2m로 묶여 있어 데크(zw)보다 좁았고, 그 차이만큼
     계단 옆에 아무것도 없는 바닥 띠가 남아 있었다 — 데크가 원래 덮던 폭
     (2.95m)까지 넓힌다. */
  /* 요청 반영(v99, 실사진): 오르는 계단은 벽 쪽이 아니라 내려가는 계단(개구부)
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
       바닥과 자연스럽게 이어지는 콘크리트 계단으로 보이게 한다(요청 반영). */
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
     촘촘히 박아 실제 건물용 난간처럼 보이게 한다(요청 반영). 벽 쪽(sZ1)은 이제 실제
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
  /* 요청 반영: 오름 계단 옆 난간을 삭제한다. */
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
  /* v119(요청 반영): 계단 뒤쪽 — 데크 밑, 계단 꼭대기 옆면 아래 — 로 뚫려 보이던 빈 공간을 막는다.
     데크 앞면(DKX0)부터 뒷벽(DKX1)까지, 계단의 열린 옆면 선(sZ0)에 바닥~데크 밑면 높이의 벽판을 세운다. */
  (function(){
    /* v141: fpMkWallFlat(=fpMkPlane)은 이미 양면이라 두 장 겹칠 필요가 없다 —
       겹쳐 두면 반투명이 두 번 덧칠돼 그 면만 밝게 떠 보였다(요청하신 색 차이의 원인 하나). */
    var bw=fpMkWallFlat(DKX1-DKX0, DKY-floorY, SKIN, (DKX0+DKX1)/2, floorY+(DKY-floorY)/2, sZ0, 0); g.add(bw);
    /* v141: 이 바닥 띠만 fpMkBox의 Standard 분기(emi 생략)라 판들과 다른 톤이었다 → 같은 Phong으로 */
    var cap=fpMkBox(DKX1-DKX0, 0.04, 0.06, SKIN, 1, SKIN_EMI); cap.position.set((DKX0+DKX1)/2, floorY+0.02, sZ0); g.add(cap);
  })();
  /* v140(요청 반영): 데크 밑 마감을 '건물의 일부'로 보이게 — 주변 벽과 완전히 같은
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
  /* v117(요청 반영): 개구부 시작선 ~ 데크 계단 첫 단 사이의 바닥 가장자리(개구부 +Z 변)에도
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
  /* v112(요청 반영): 데크 계단 앞 노란 점자 발판 제거 — 실사진에 없음 */
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
    /* v114(요청 반영): 이 바닥판은 윗면만 그려져서, 5층 계단에서 개구부를 통해 올려다보면 바닥이
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
       (요청 반영) — 개구부 앞 짧은 패드 정도로 줄인다. */
    /* v127(요청 반영): 개구부 시작선 옆에 붙어 있던 작은 점자 패드(0.42×0.9) 제거 — 계단 꼭대기
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
  /* 요청 반영: 실사진(옥탑방 바깥쪽 — 붉은 벽돌)을 반영해, 위 brickWall이
     짓는 안쪽 면(베이지) 바로 바깥쪽에 붉은 벽돌 텍스처 껍질을 한 겹 더
     씌운다. 안쪽 벽과 겹치지 않게 0.03m 더 바깥으로 밀어서 세우므로, 방
     안에서는 여전히 베이지 벽만 보이고(더 가까운 면이 가림) 문을 열고
     나간 바깥에서는 이 벽돌 면이 보인다. */
  function brickWallOuter(w,h,px,py,pz,roty){
    var tex=fpBrickExteriorTex().clone(); tex.needsUpdate=true;
    /* 요청 반영: 벽돌이 듬성듬성해 보였다 — 반복 밀도를 훨씬 촘촘하게 올려
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
  /* 요청 반영(버그 수정): "문쪽 벽"을 dz 폭 그대로 통짜 판으로 지으면, 문
     자체는 그 앞에 별도로 지어지는 작은 문틀(frGeo, 문 폭만큼만 구멍 뚫림)
     뒤에 이 통짜 벽이 그대로 남아 있어 — 문을 열어도 그 뒤에 뚫리지 않은
     벽이 가로막고 있어 바깥이 안 보이고 지나갈 수도 없었다(옥상 밖으로
     나가는 동선이 없던 그동안은 아무도 알아채지 못한 잠복 버그). 문틀과
     같은 폭(doorHalf*2)만큼은 벽을 비워 실제로 뚫려 있게 한다. */
  var doorHalf=1.08;   // frW/2와 동일(문 폭 1.92 + 여유 0.24)
  brickWall(mz-doorHalf-cz0, HH, cx0-0.22, HH/2, (cz0+(mz-doorHalf))/2, Math.PI/2);
  brickWall(cz1-(mz+doorHalf), HH, cx0-0.22, HH/2, ((mz+doorHalf)+cz1)/2, Math.PI/2);
  /* 요청 반영(버그 수정): 문 자리를 비울 때 바닥부터 천장까지 통째로 비워 놨는데,
     문틀(바깥 테두리 높이 frH-0.10 = 2.46m)은 천장(HH)까지 닿지 않는다 —
     그 사이(2.46m~천장)가 벽 없이 뻥 뚫려서, 문 위로 옥상 하늘과 바깥 차양
     콘크리트가 그대로 비쳐 보였다("문 위 프레임이 깨져 보인다"의 정체).
     문 위 인방(lintel)만큼 벽을 채운다. 걸레받이가 딸려 오면 문간 허공에
     뜨므로 brickWall 대신 벽면만 직접 만든다. */
  /* 문틀 바깥 테두리가 문짝(2.16m) 위로 더 올라가는 양 — 아래 문틀 생성부의
     frH와 반드시 같은 값을 써야 한다(예전엔 양쪽에 0.40을 따로 적어 뒀다).
     요청 반영: 문 위 트랜섬(채광창)을 '덧댄 판'이 아니라 문틀에 실제로 뚫은
     개구부로 바꾸면서, 그 구멍이 들어갈 자리만큼 문틀 상부를 키운다. */
  var DOOR_HEAD_EXTRA = 0.56;
  var DOOR_LINTEL_Y = (2.16+DOOR_HEAD_EXTRA)-0.10;   // 문틀 바깥 테두리 윗변(frH-0.10)과 동일
  if(HH-DOOR_LINTEL_Y > 0.02){
    /* 폭은 비워 둔 자리(doorHalf*2)와 정확히 같게 — 조금이라도 넓게 하면
       옆 벽과 겹친 만큼이 한 단 튀어나온 것처럼 보인다. */
    g.add(fpMkWallFlat(doorHalf*2, HH-DOOR_LINTEL_Y, 0xC9C0AE,
                      cx0-0.22, (DOOR_LINTEL_Y+HH)/2, mz, Math.PI/2));
  }
  /* 요청 반영(버그 수정, 근본 원인): 이 cx1 벽(및 계단실 자체가 같은 위치에
     짓는 맞은편 벽)이 방 실사용 폭(dz)만큼만 뻗어 있었다 — 그런데 계단을
     내려가며 반대쪽 단으로 돌아서는 지점은 바로 이 벽 코앞(가로 0.1~0.2m
     거리)이라, 그렇게 가까운 자리에서 화면 시야각(FOV)이 넓게 벌어지면
     시선이 벽 폭 끝(z=dz 부근)보다 훨씬 먼 지점(계산상 4m 이상 더 먼 곳)을
     스치듯 지나가며 벽이 끝나는 가장자리 '밖'을 보게 된다 — 그 너머엔 벽이
     전혀 없어 옥상 바깥 하늘·산이 그대로 보였다("프레임이 깨진다"의 정체).
     벽 자체를 필요한 실사용 폭보다 넉넉히(양쪽으로 4m씩) 길게 만들어, 이런
     가까운 거리·넓은 화각의 스침 각도에서도 항상 벽 안에 들어오게 한다. */
  /* 요청 반영: 이 여유폭(4m)은 옥상 데크에서 보면 옥탑방 옆으로 삐져나온
     '허공에 뜬 큰 판'으로 보인다 — 계단실 자체 옆벽이 이미 시야를 막아 주는
     비상계단 옥탑방에서는 호출 쪽에서 farPad로 줄여 쓴다. */
  /* 요청 반영: 이 여유폭을 4m나 주었더니, 옥상 데크에서 옥탑방 옆을 지나갈 때
     방보다 8m나 긴 벽 한 장이 허공에 떠서 이어지는 것처럼 보였다("옥상 뒤쪽에
     이상한 벽"). 옆벽(cz0/cz1)이 이미 같은 모서리를 막고 있으므로 여유폭은
     모서리를 확실히 물리는 정도(0.25m)면 충분하다. */
  var FAR_WALL_PAD=(farPad!==undefined)?farPad:0.25;
  brickWall(dz+FAR_WALL_PAD*2, HH, cx1+0.01, HH/2, mz, -Math.PI/2, mainStair);   // v116: 중앙계단 옥탑방 뒷벽은 걸레받이 없이(개구부 위 검은 띠의 원인)
  brickWall(dx, HH, mx, HH/2, cz0-0.01, Math.PI);
  brickWall(dx, HH, mx, HH/2, cz1+0.01, 0);
  /* 요청 반영(버그 수정): 옥탑방 벽은 y=0~HH 구간에만 있었다 — 그래서 옥상에서
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
  /* 요청 반영(버그 수정): 문쪽 벽(cx0-0.22)과 옆벽(cz0/cz1)이 만나는 모서리를
     0.22m짜리 조각 하나로만 막아 두어서, 각도에 따라 그 사이로 바깥이 비치는
     가느다란 세로 틈이 보였다 — 조각을 넉넉히(0.50m) 키워 확실히 겹치게 한다. */
  /* 요청 반영(버그 수정): 조각을 키울 때 바깥(-X)으로 늘렸더니 문쪽 벽면보다
     0.22m 튀어나와, 옥상 밖에서 보면 벽 모서리에 벽돌 한 줄이 삐죽 나와
     보였다 — 바깥쪽 끝은 벽면(cx0-0.22)에 딱 맞추고 안쪽(+X)으로만 늘린다. */
  brickWall(0.50, HH, cx0+0.03, HH/2, cz0-0.01, Math.PI);
  brickWall(0.50, HH, cx0+0.03, HH/2, cz1+0.01, 0);
  /* 요청 반영: 실사진처럼 옥탑방 바깥은 붉은 벽돌 — 위 안쪽 베이지 벽
     바로 바깥에 벽돌 껍질을 덧씌운다(문쪽 벽만 해당 — 문을 열고 나가면
     정면으로 보이는 면이라 가장 눈에 띈다. 나머지 3면은 난간 밖이라
     평소 시야에 잘 안 들어와 생략해 부담을 줄인다). 안쪽 벽과 마찬가지로
     문 폭만큼은 비워 실제로 뚫려 있게 한다. */
  var OUT=0.03;
  brickWallOuter(mz-doorHalf-cz0, HH, cx0-0.22-OUT, HH/2, (cz0+(mz-doorHalf))/2, Math.PI/2);
  brickWallOuter(cz1-(mz+doorHalf), HH, cx0-0.22-OUT, HH/2, ((mz+doorHalf)+cz1)/2, Math.PI/2);
  /* 요청 반영(버그 수정): 이 두 귀퉁이(리턴) 벽은 안쪽 베이지 벽과 '똑같은 z'에
     놓여 있었다 — OUT(0.03) 오프셋을 X로만 줬는데 이 면은 ±Z를 보는 면이라
     아무 소용이 없었고, 두 판이 같은 평면에서 z-파이팅을 일으켜 실내 벽
     모서리에 붉은 벽돌 줄무늬가 번져 보였다("벽 모서리 프레임이 깨져 보인다"의
     정체). 바깥 벽돌 껍질을 바깥쪽(±Z)으로 밀어 겹치지 않게 한다. */
  brickWallOuter(0.50, HH, cx0+0.03-OUT, HH/2, cz0-0.01-OUT, Math.PI);
  brickWallOuter(0.50, HH, cx0+0.03-OUT, HH/2, cz1+0.01+OUT, 0);
  /* 요청 반영: 예전에는 문쪽 한 면에만 벽돌 외피를 씌우고 나머지 3면은
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
  /* 요청 반영(삭제): 철문 위에 달아 두었던 콘크리트 캐노피(어닝)를 없앤다 —
     옥상 데크에서 옥탑방 옆을 지나며 보면, 처마가 아니라 벽돌 벽 위쪽에
     덩그러니 붙은 갈색 상자처럼 보였다. */
  /* 요청 반영: 문 옆 '금연구역' 표지판 삭제 */
  /* 요청 반영: 문 좌측 벽면에 흰 프레임 유리창(사진 반영) — 창틀은 무광 흰색,
     유리는 낮은 roughness/약간의 metalness로 은은한 반사감을 준다. */
  /* 요청 반영(삭제): 비상계단 옥탑방 바깥 벽에 붙어 있던 이 유리창은 실제
     사진에 없고 회색 판때기처럼만 보인다 — 중앙계단 옥탑방에만 남긴다. */
  /* 요청 반영(삭제): 중앙계단 옥탑방 문 옆에 남겨 두었던 이 흰 프레임 유리창도
     없앤다 — 옥상 데크에서 보면 벽돌 벽에 회색 판 하나가 덧대어진 것처럼만
     보였다(비상계단 쪽은 앞서 같은 이유로 이미 지웠다). 이제 문쪽 벽은
     철문과 그 위 인방만 있는 깔끔한 벽돌 면이 된다. */
  /* 요청 반영: 옥상 철문 왼쪽 벽(문을 마주보고 섰을 때 왼쪽 = +Z)에 실사진처럼
     '금연구역' 안내문 한 장을 붙인다 — 흰 종이 + 붉은 금연 픽토그램 + 붉은 글씨.
     실내 쪽 벽면(cx0-0.22)보다 살짝 앞(+X)에 붙여 z-파이팅을 피한다. */
  (function(){
    /* 요청 반영: 예전 크기(가로 25cm)로는 문 앞에서 봤을 때 벽에 붙은 흰 점처럼
       보여 안내문인지 알아볼 수 없었다 — 실제 게시물 크기(A3 정도)로 키우고,
       문틀에서 조금 더 가깝게 붙여 문을 마주보면 바로 눈에 들어오게 한다. */
    /* 요청 반영: 더 왼쪽(+Z)으로 옮기고 크기도 한 단계 더 키운다. */
    /* 요청 반영: 문 옆 좁은 벽에 붙어 있던 걸 옆벽(+Z) 넓은 면 한가운데로 옮긴다 —
       문 옆 자리는 폭이 0.77m뿐이라 확대한 안내문이 벽 모서리 밖으로 삐져나왔다. */
    /* 요청 반영: 한 단계 더 키운다(2.15 → 2.95). 종이 크기는 약 0.80 x 1.03m —
       옥탑방 왼쪽 벽(가로 8.8m / 높이 3.05m) 안에 넉넉히 들어가고, 철문 앞에서
       바라볼 때 글씨와 금연 픽토그램이 바로 읽힌다. */
    var S=2.95;                            // 예전 대비 확대 배율(2.15 → 2.95)
    var sx=cx0+1.45;                       // 옆벽 위, 문에서 조금 안쪽
    /* 옥탑방 안에는 계단실 자체의 옆벽(fpMakeStairwell의 zc+hw)이 방 벽(cz1)보다
       더 안쪽에 한 겹 더 서 있다 — 방 벽 기준으로 붙이면 그 벽 뒤에 가려서
       아예 안 보인다. 실제로 보이는 면(둘 중 더 안쪽)에 붙인다. */
    /* 요청 반영(버그 수정): 중앙계단 옥탑방은 계단실이 방 한복판에 뚫린
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
     요청 반영(버그 수정): "비상계단 옥상 외부에는 이 장식들이 안 어울린다"는
     지적에 따라 중앙계단에서만 짓도록 mezVoid로 걸어 뒀었는데, 비상계단
     옥탑방도 바닥 개구부를 뚫느라 mezVoid를 똑같이 넘겨받고 있어서 조건이
     전혀 걸러지지 않았다 — 호출 쪽에서 명시적으로 넘기는 mainStair로 바꾼다. */
  if(mainStair) (function(){
    /* 요청 반영: 의자·박스 더미·쓰레기통이 철문 바로 앞에 붙어 있어
       문을 열고 나서면 곧장 걸리는 자리였다 — 옥상 바깥(-X) 쪽으로
       1.0m 더 물리고, 문 정면 통로에서도 살짝 비켜 놓는다. */
    var deckX=FP_ROOF_OUT-1.15, floorY=0.02;
    /* 요청 반영(버그 수정): 의자가 공중에 떠 보였다 — 다리 4개를 바닥(floorY)에
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
    /* 요청 반영(버그 수정): '+' 오프셋이 실제로는 실내(+X) 방향이라, 박스·
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
    /* 요청 반영: 문 앞에 있던 에어컨 실외기(회색 박스 + 원형 팬)를 삭제한다 —
       옥상 데크에서 보면 덩그러니 놓인 정체불명의 상자처럼 보였다. */
  })();
  /* 요청 반영: 왼쪽 벽에 붙어 있던 안내문/포스터 종이 3장을 없앤다. */
  var cap=fpMkBox(dx+0.34, 0.28, dz+0.34, 0xB9B3A4, 1);  // 윗변 콘크리트 두겁
  cap.position.set(mx, HH+0.14, mz); g.add(cap);
  /* 요청 반영(삭제): 지붕 두겁 위에 얹어 둔 환기구 상자를 없앤다 — 옥상
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
  /* 요청 반영(버그 수정): 천장판이 방 폭(dx)만큼만 있어서 문쪽 벽(cx0-0.22)과
     천장 끝(cx0) 사이 22cm가 비어 있었다 — 그 틈으로 바깥 파라펫 몰딩이
     실내에서 얇은 띠처럼 비쳐 보였다. 문쪽으로만 0.24m 늘려 틈을 덮되,
     바깥 벽돌면(cx0-0.25)보다는 안쪽에 머무르게 해 밖에서는 안 보이게 한다. */
  var ceilPl=new THREE.Mesh(new THREE.PlaneGeometry(dx+0.24, dz), ceilMat);
  ceilPl.rotation.x=Math.PI/2; ceilPl.position.set(mx-0.12, HH-0.02, mz);
  ceilPl.receiveShadow=true; g.add(ceilPl);
  if(mainStair){
    /* v110: 실사진의 천장 보 — 뒷벽 위(데크 위)와 -Z 벽 위를 따라 어두운 회색 보 */
    /* v120(요청 반영): v110에서 넣었던 천장 보 두 개(뒷벽 위·-Z 벽 위)를 없앤다 — -Z 벽 위 보가
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
  /* 요청 반영(디자인 변경): 실제 방화문 사진 기준으로 다시 만든다 —
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
    /* 요청 반영(버그 수정): 문틀이 벽 개구부보다 살짝 작아서, 문틀과 벽
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
    /* 요청 반영(버그 수정): 문 위 트랜섬(채광창)이 예전에는 문틀과 '완전히
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
    /* 요청 반영(버그 수정 + 디테일): 손잡이가
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
    /* 요청 반영: 옥상 밖으로 나가는 별도 연출(문 열기 애니메이션+카메라 이동)을
       없애고, 지하1층 크리에이티브 존 문과 똑같이 다가가면 저절로(경첩으로
       앞으로) 열리는 자동문으로 바꾼다 — 옆으로 미끄러지는 슬라이딩 문이
       아니라 지금과 같은 경첩 회전(pivot.rotation.y)을 그대로 쓰되, 트리거를
       스크립트가 아니라 거리 기반으로 건다. */
    /* 요청 반영(버그 수정): 열리는 방향이 반대였다 — 실제로는 문이 옥상
       바깥쪽으로 밀려 열려야 하는데 안쪽(옥탑방 쪽)으로 열리고 있었다.
       회전 부호(swing)를 반대로 준다. */
    fpRegisterAutoDoor(g, pivot, DW, -sn, 1.75, 1.6, 0);
  });
  /* 요청 반영(버그 수정): 두 문짝 사이 틈을 표시하려고 둔 이 짙은 세로
     막대가, 문이 열려 있을 때도 그대로 그 자리에 고정돼 있어서(문짝을
     따라 움직이지 않음) 문이 활짝 열려도 한가운데에 막대 하나가 계속
     서 있는 것처럼 보였다("가운데 선") — 문 닫힘 상태에서는 문틀의
     그림자 선(reveal)만으로도 이미 틈이 충분히 또렷하게 보이므로,
     이 막대는 아예 없앤다. */
  /* 문 위 등 — 예전 자리(DH+0.28=2.44m)는 이제 트랜섬 개구부 한가운데라
     유리와 겹쳐 또 z-파이팅이 난다. 문틀 위 인방 벽면 앞으로 올려 붙인다. */
  var lamp=fpMkPlane(0.36, 0.14, 0xF6FBE8, 1);           // 문 위 등
  lamp.rotation.y=Math.PI/2; lamp.position.set(cx0-0.22+0.02, DOOR_LINTEL_Y+0.18, mz); g.add(lamp);
  /* 요청 반영: 문 위 "중앙계단/MAIN STAIRS" 글씨 삭제 — 위에 새로 생긴
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
  /* 요청 반영(버그 수정 겸 디자인 변경): 여기 있던 초록 비상구(EXIT) 표지판이
     위 콘크리트 캐노피와 계속 높이가 어긋나며 캐노피 밖으로 살짝 삐져나온
     초록색 얇은 조각처럼 보이는 문제("프레임이 깨져 보인다")가 있었다 —
     실제 사진(레퍼런스) 기준으로도 이 문에는 EXIT 표지판이 없으므로,
     문제의 원인인 표지판 자체를 없앤다. */

  /* 요청 반영: 레퍼런스 사진처럼 문 왼쪽엔 원형 탁자, 오른쪽엔 소화전함을 둔다.
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
    /* 요청 반영: 원형 탁자 옆에 있던 소화전함 박스를 삭제한다(밋밋한 상자로만
       보여 "이상한 박스"로 지적됨 — 깔끔하게 치운다). */
  })();

  /* 요청 반영: 소화전함ㆍ금지 표지판ㆍ금연구역 표지판을 모두 지워 깔끔한
     벽면으로 남긴다. */
  /* 문 앞 점자블록 — 복도를 따라 문턱까지 */
  (function(){
    /* 요청 반영(삭제): 비상계단 옥탑방에서는 문 앞 세로 점자블록을 깔지 않는다
       (계단 앞 가로 유도블록만 남긴다). 중앙계단 옥탑방은 그대로 둔다. */
    /* v127(요청 반영): 철문 앞 바닥의 점자 패드(1.7×0.6, 3칸) 제거 — 실사진에 없음 */
    /* 요청 반영: 옥상→5층 하강 버튼이 이 철문 앞 점자블록 위치에서 뜨도록,
       중앙계단 옥탑방(mezVoid가 있는 호출)일 때만 이 좌표를 전역에 기록해
       fpStairGo가 참조할 수 있게 한다(비상계단 옥탑방에는 영향 없음). */
    /* 요청 반영: 문 바로 앞이 아니라 점자블록 위에서 조금 더 뒤로(문에서
       멀어지는 쪽으로) 서게 한다 — fx+1.0 → fx+1.3, 점자블록(길이 1.7,
       중심 fx+1.0) 안쪽에 그대로 머무른다. */
    /* 요청 반영: 문에서 조금 더 뒤로(fx+1.3 → fx+1.6) 물린다 —
       점자블록(길이 1.7, 중심 fx+1.0, 범위 fx+0.15~fx+1.85) 안쪽에 그대로 머무른다. */
    /* 요청 반영: 문에서 조금 더 뒤로(fx+1.6 → fx+1.8) 물린다 —
       점자블록(범위 fx+0.15~fx+1.85) 뒤쪽 가장자리 가까이까지 물러난다. */
    /* 요청 반영(버그 수정): 이 좌표는 중앙계단 옥탑방일 때만 기록해야 하는데
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
     테라조 바닥으로 되돌린다(불필요한 구조물 삭제 요청 반영). */

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
     합친 것보다 방이 훨씬 넓어져 버렸다(요청 반영: 실측 비율로 축소).
     계단 폭은 다른 층과 같은 실치수(1.0배)로 되돌리고, 방 경계(mainCZ0/1)는
     "내려가는 계단 + 약간의 틈 + 올라가는 계단(스킵플로어) + 벽 여유"를
     역산해서 딱 그만큼만 잡는다. */
  var ROOF_OW_MUL=1.0, ROW=FP_ST_OW*ROOF_OW_MUL;
  var RM_DX=0.45, RM_DZ=0.35;   // v115(요청 반영): v112의 +1.5m 깊이 확장을 되돌린다 — 뒷벽이 창문 벽(계단실 뒷벽)보다 뒤로 가면 데크 밑에 바닥 턱이 생겨 실사진(데크가 창문 벽 위에 바로 얹힘)과 달라졌다. 데크 계단 앞 바닥 공간은 대신 데크 깊이를 줄여 확보한다(예전 2.30/3.4 → 대폭 축소)
  /* 옥탑방 천장고도 낮춘다 — 예전엔 복층(메자닌)을 담기 위해 4.00m로 높였는데,
     이번 요청은 복층 없이 "낮고 평평한 실제 계단실 전실" 느낌이 목표다.
     복층 장식(fpMakeMezzanine)은 아래에서 호출을 빼되, 함수 자체는 남겨 둔다
     (나중에 다시 필요해지면 한 줄만 되살리면 되도록). */
  var FP_VEST_H = 4.00;   // v123(요청 반영): 3.05→4.00 — 데크(1.42m) 위에 서면 눈높이(+1.55)가 천장에 닿아 지붕을 뚫고 보였다. 실사진의 복층 계단실처럼 천장을 높여 데크 위 머리 여유 ≈1m 확보(옥탑방 바깥 상자도 그만큼 높아짐)

  var mainCX0=FP_WALL_X-2.30, mainCX1=FP_WALL_X+FP_ST_WD-0.80+0.35+RM_DX;
  /* 진짜 내려가는 계단(개구부)의 Z범위를 먼저 구해서, 방 경계를 여기서부터
     역산한다(예전엔 반대로 — 넓은 방을 먼저 정하고 계단을 그 안에 끼워 넣었다). */
  /* 요청 반영(구조 정정): 중앙계단 열 맞바꿈을 되돌렸으므로(_colFlip=1),
     옥상에서 내려가는 단은 다시 -Z열이다 — 옥탑방 바닥 개구부 좌표도 같은
     쪽으로 되돌린다(철문을 바라볼 때 오른쪽 = -Z). */
  var realDnZ0pre=stZ-(ROW/4+0.02)-(ROW/2-0.10)/2-0.10;
  var realDnZ1pre=stZ-(ROW/4+0.02)+(ROW/2-0.10)/2+0.10;
  var downFlightW=realDnZ1pre-realDnZ0pre;      // 내려가는 계단 폭
  var skipGap=0.06;                             // 계단참에서 스킵플로어로 넘어가는 최소 틈(요청 반영: 더 좁혀 붙임)
  /* 요청 반영: 레퍼런스 사진처럼 문 앞 좌우 폭을 넓힌다 — 양쪽에 각각 0.6m씩
     더 준다(원형 탁자·소화전이 들어갈 여유). 뒤쪽 데크(mainCZ0~mainCZ1 기준
     비율로 폭을 잡으므로)도 이 확장에 맞춰 함께 넓어진다. */
  var ROOM_WIDEN=0.6;
  /* 개구부가 방의 -Z쪽으로 돌아왔으므로, 남는 자리(스킵플로어)도 반대쪽(+Z)에
     둔다(방 전체 크기는 그대로). */
  var mainCZ0=realDnZ0pre+0.03;   // v114: 옥탑방 -Z 벽을 다른 층 계단실 옆벽(zc-hw)과 같은 면(2cm 뒤)에 — 5층 옆벽과 옥상 옆벽이 한 면으로 이어지고 계단참 철문이 5층 벽에 가려지지 않는다
  var mainCZ1=realDnZ1pre+2.92;   // v111(요청 반영): +Z 벽을 데크 계단(시작 realDnZ1pre-0.08, 폭 2.95) 오른쪽에 딱 붙인다 — 계단과 벽 사이 공간 없음. v110의 +1.5m 확장 취소
  var es=EMSTAIR_POS[5], emCX0=null, emCX1=null, emCZ0=null, emCZ1=null, esz=0, esx=1;
  if(es){
    esz=es.z*ST; esx=(es.xWhole>0?1:-1);
    /* 요청 반영(구조 변경) : 예전엔 비상계단 옥탑방 깊이가 3.55m뿐이라,
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
  /* 요청 반영(버그 수정): 하늘 박스가 카메라의 far 평면(150) 밖까지 뻗어 있어서
     좌우로 고개를 돌릴 때 먼 모서리가 잘려 나가 하늘이 깨져 보였다.
     실측: 정면 하늘판은 127m라 far 안이지만, 박스 모서리는 156~184m로 far를
     넘었다 — 정면만 볼 땐 멀쩡하고 좌우로 돌릴 때만 깨지던 이유.
     카메라 far를 키우면 건물 전체의 깊이 정밀도에 영향을 주므로, 하늘 박스
     쪽을 far 안(넉넉히 여유를 두고 ~120m 이내)으로 줄인다. */
  var SKY=40, SH=86, SKYC=30, sky=fpRoofSkyTex();
  /* 땅면도 위 윗하늘과 같은 이유(광원이 닿지 않는 먼 배경)로 어둡게 나올 수
     있어, 하늘판과 똑같이 빛을 받지 않는 재질로 통일한다. */
  var gndMat=new THREE.MeshBasicMaterial({color:0x6E8F6A, side:THREE.DoubleSide});
  /* 요청 반영(버그 수정) : 이 '먼 배경 땅면'은 난간 너머로 보이라고 깔아 둔
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
  /* 요청 반영(버그 수정): 옆면 하늘판 4장은 fpMkTex(빛을 받지 않는 MeshBasicMaterial)
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
  /* 요청 반영(v100): 바닥 개구부를 계단 끝(xs+N*run)에서 끊지 않고 계단실 뒷벽
     (FP_WALL_X+FP_ST_WD)까지 — 즉 계단 아래 계단참 위쪽까지 — 뚫는다. 예전엔
     계단 끝~뒷벽 사이 1.5m가 옥상 바닥으로 막혀 있어, 위에서 내려다보면 데크
     밑에 밝은 판이 하나 걸려 있는 것처럼 보였고 실사진처럼 계단참이 내려다보이지
     않았다. 데크(y=1.42, x=뒷벽-2.1~뒷벽)는 그 위에 그대로 떠 있다. */
  var realDnX0=FP_WALL_X+FP_ST_LAND+FP_R_XSHIFT-0.10, realDnX1=FP_WALL_X+FP_ST_WD-0.02;   // v109: 개구부 시작도 짧아진 옥상 도막 첫 단에 맞춰 안쪽으로
  var realDnZ0=stZ-(ROW/4+0.02)-(ROW/2-0.10)/2-0.10;
  var realDnZ1=stZ-(ROW/4+0.02)+(ROW/2-0.10)/2+0.10;
  fpMakeHeadhouse(g, mainCX0, mainCX1, mainCZ0, mainCZ1, ko,
                     ko?'중앙계단':'MAIN STAIRS', FP_VEST_H,
                     /* v131(요청 반영): 바닥 개구부가 데크(DKX0=mainCX1-1.92 ~ DKX1) 밑까지 들어와 있어서,
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
  /* 요청 반영(v96): 옥탑방 뒷벽(cx1)과 옥상 난간(파라펫) 사이 틈을 같은 붉은
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
     요청 반영(구조 정정): 계단 개구부가 다시 방의 -Z쪽으로 돌아왔으므로,
     스킵플로어(창고 데크)는 겹치지 않게 반대쪽(+Z) 남은 자리에 짓는다.
     이 함수는 넘겨준 wallZ1 쪽(최대 Z)에 데크를 밀착시키므로, 옥탑방 +Z
     벽면을 기준으로 잡아 준다. */
  /* 요청 반영: 데크(복층 슬래브)가 뒷벽 폭의 +Z쪽 절반(계단 개구부 반대편)만
     덮고 있어서, 왼쪽 끝이 허공에서 뚝 끊긴 것처럼 보였다 — 시작점을 방
     경계(mainCZ0)까지 당겨 뒷벽 전체 폭을 채운다. 데크가 놓이는 X구간
     (뒷벽에서 2.1m)은 계단 개구부(realDnX1)보다 거의 안쪽이라, 넓혀도
     내려가는 계단을 덮지 않는다. */
  fpMakeRoofSkipFloor(g, mainCX1, mainCZ0+0.02, mainCZ1-0.3, ko, mainCZ1-0.02, realDnZ1pre-0.08);   // v105: 오르는 계단을 내려가는 계단 가장자리(realDnZ1pre-0.10)에 2cm까지 붙인다 — 실사진처럼 두 계단이 난간 하나 사이에 두고 맞닿게
  /* 요청 반영: 옆벽(mainCZ1)에 달았던 진한 초록 프레임 창문을 없앤다 —
     사용자가 화면에서 어색하게 튀어 보인다고 지적했다. */
  /* 지난번 추가했던 "연결 난간"이, 방 폭을 실측 비율로 좁힌 뒤로는 좌표가
     어긋나 오히려 계단을 가로막는 이상한 펜스처럼 보였다(요청 반영: 제거).
     두 난간의 연결감은 걷기 쉬운 배치(간격 축소)만으로 대신한다. */
  /* fpMakeMezzanine(g, mainCX0, mainCX1, mainCZ0, mainCZ1, ROW); */
  /* 비상계단 옥탑방 */
  if(es){
    /* 문(옥탑방)만 있고 정작 그 안의 계단·벽이 없어서, 문을 열면 계단 없이
       뻥 뚫린 채로 하늘이 비쳐 보이거나 깜깜하게 보였다 — 중앙계단과 똑같이
       실제 오르내리는 계단실 구조를 지어 넣는다. */
    /* 옥상 비상계단은 좌우(Z) 폭이 다른 층보다 좁아 보인다는 요청 반영 —
       옥탑방 자체(emCZ 기준 3.7m)는 여유가 있으므로, owMul로 옥상에서만
       개구부 폭(FP_EM_OW)을 살짝 넓힌다(걷기 경로는 그대로라 항상 그 안쪽에
       들어온다 — 위 owMul 주석 참고). */
    g.add(fpMakeStairwell('R', esz, ko, true, 2.90, 1.0));   // v129(요청 반영): 1.15→1.0 — 옥상 비상계단실만 15% 넓어, 5층 계단실 옆벽이 계단참 위 45cm 구간에서 20cm 안쪽으로 튀어나온 턱(띠)처럼 보였다. 5층과 같은 폭으로 맞춘다
    /* 요청 반영: 중앙계단 옥탑방과 똑같이, 아래층으로 내려가는 계단 자리만큼
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
    /* 요청 반영(v97): 비상계단 옥탑방도 중앙계단과 같이 뒷벽~난간 틈을 벽돌로 채운다.
       문이 -X쪽(cx0)에 있으므로 난간이 +X쪽에 있을 때(esx>0)만 해당한다. */
    if(esx>0) fillToParapet(emCX1, emCZ0, emCZ1, 2.95);
  }
  /* ── 옥상 바깥 장식물 ──────────────────────────────────────────────
     요청 반영: 예전에 난간을 따라 줄지어 놓았던 '실외기 6대 + 배관 기둥'은
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

    /* ③ 요청 반영(삭제): 야외 원형 테이블 + 벤치 두 개를 없앤다. */

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

    /* ⑥ 요청 반영(삭제): 환기 후드·배기 파이프(콘크리트 받침 + 원통 덕트 +
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
    /* 요청 반영: 이 사이버펑크풍 시안 네온 트림이 복도에서 보면 정체불명의
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
   따뜻한 실내 조명을 낸다(요청 반영). 파라미터는 각 상수 옆 주석 참고. */
function fpMakeCorrCeiling(z0, z1, holes){
  var g=new THREE.Group();
  var ceilY=FP_CEIL_H-0.02;                      // 천장 마감면 높이 — 벽 상단과 거의 맞닿게
  var cw=CORR_HALF*2+0.24, len=z1-z0, cz=(z0+z1)/2;
  /* 요청 반영: 계단(중앙·비상) 개구부 자리는 천장판을 비워 둔다 — 계단을
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
  var FIX_INTENSITY=0.24, FIX_DIST=4.2;           // ← PointLight 세기/도달거리(요청 반영: 눈부심 추가로 낮춤)
  var LIGHT_MAX=8;                                // ← 복도 하나당 실제 PointLight 최대 개수
  var n=Math.max(1, Math.round(len/FIX_GAP));
  var lightEvery=Math.max(1, Math.ceil(n/LIGHT_MAX));  // 기구는 촘촘히, 실제 광원은 성능을 위해 듬성듬성
  var placed=0;
  for(var i=0;i<n;i++){
    var fz=z0 + (i+0.5)*(len/n);
    var inHole = holes.some(function(h){ return Math.abs(fz-h.z) < h.w/2; });
    if(inHole) continue;               // 뚫린 자리 위에는 매립등을 두지 않는다
    var fix=fpMkPlane(FIX_W, FIX_D, 0xE8D9AE, 1, 0xE8D9AE);  // 자발광(emissive) 매립등 플레이트(요청 반영: 색 자체도 낮춤)
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
    var wall=fpMkPlane(w,h,0xE8DFC8,1,0x9C8F6E);   // 크림색 벽지(요청 반영)
    /* 요청 반영(버그 수정): 화장실 알코브 옆에 덧댄 보강 패널(13119 등)이
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
  /* 요청 반영(버그 수정): 중앙계단 개구부 폭은 fpMakeStairwell의 owAuto가
     "1층이거나, 위/아래층이 1층이면 1.4배"로 정한다 — 즉 B1·1층·2층 세 층이
     넓은 개구부를 쓴다. 그런데 여기 복도 벽 구멍(holesR)은 lv===1 일 때만
     1.4배를 적용하고 있어서, B1·2층은 실제 계단실보다 벽 구멍이 0.88m씩
     좁았다. 그 결과 개구부 테두리 띠(아래 fpMakeStairwell의 c9cfd4 세로선)가
     구멍 가장자리가 아니라 통짜 벽 한복판에 얹혀, 계단실 안에서 보면 벽에
     회색 막대 하나가 붙어 있는 것처럼 보였다 — owAuto와 같은 규칙으로 맞춘다. */
  var _stIdx = lvIndex(lv);
  var stOWreal = FP_ST_OW *
    ((lv===1 || LEVELS[_stIdx+1]===1 || LEVELS[_stIdx-1]===1) ? 1.4 : 1);
  /* 요청 반영(원복 + 재수정): 한 번은 중앙계단 개구부를 복도 천장(H)까지
     뚫어 인방(개구부 위 통짜 벽)을 없애 봤는데, 계단실 위로 한 층 층고가
     통째로 드러나 오히려 어색했고 1층은 위가 뻥 뚫려 보였다 — 개구부
     높이는 원래대로 되돌리고, 대신 그 인방을 실제 사진(1층 후문 통로)처럼
     '개구부 윗선 리빌(그림자 홈) + 검은 사인 밴드'로 마감해서, 밋밋한
     크림색 빈 면이 아니라 의도된 헤더로 읽히게 한다. */
  var holesR=[{z:evZ, w:evW, h:evH}, {z:stZ0, w:stOWreal, h:FP_ST_OH}];
  if(esZW!==null) holesR.push({z:esZW, w:FP_EM_OW, h:FP_ST_OH});
  wall( 1, holesR);
  (function(){
    /* 요청 반영: 여기에 '중앙계단 CENTRAL STAIRS' 검은 사인 밴드를 달아 봤는데
       글씨가 너무 커서 오히려 눈에 걸렸다 — 밴드·글씨·몰딩은 없애고, 비상계단
       개구부처럼 개구부 윗선의 얇은 리빌(그림자 홈) 하나만 남겨 깔끔하게 둔다. */
    var revH=0.055;
    [[1, FP_WALL_X+0.02, Math.PI/2], [-1, FP_WALL_X-0.02, -Math.PI/2]].forEach(function(f){
      var rev=fpMkPlane(stOWreal+0.10, revH, 0x14181D, 1);      // 개구부 윗선 그림자 홈
      rev.rotation.y=f[2]; rev.position.set(f[1], FP_ST_OH+revH/2, stZ0); g.add(rev);
    });
    /* 요청 반영: 계단실 안에서 복도 쪽을 돌아보면, 이 인방(개구부 위 벽)만
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
  /* 요청 반영(버그 수정): 이 계단 개구부 프레임(차콜 테두리)이 여러 층이
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
     요청 반영(원상복구): 복도 바닥·천장에 계단 개구부 구멍을 뚫었더니 복도
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
     개구부·단 폭을 1.4배로 키운다(요청 반영: 1.3~1.5배 범위). 2~5층은 owMul 생략(=1)
     이라 기존 폭 그대로다. */
  /* 요청 반영(버그 수정): 여기서 owMul을 항상 넘기고 있어서(1층이 아니면 1),
     fpMakeStairwell 안의 owAuto("1층과 맞닿는 층은 1.4배")가 아예 동작하지
     못했다 — 정작 복도 벽 구멍(holesR)은 위에서 stOWreal로 owAuto와 같은
     규칙(2층도 1.4배)을 쓰고 있었기 때문에, 2층만 "벽 구멍은 6.16m인데
     계단실은 4.4m"라 계단실 벽·바닥이 구멍보다 좁아 그 틈으로 바깥(빈 공간)이
     그대로 보였다("2층 계단 프레임이 뒤틀려 보인다"의 정체). 또 같은 이유로
     2층의 내려가는 단이 1층의 올라가는 단과 폭·중심이 어긋나 있었다.
     1층만 명시적으로 1.4배를 주고, 나머지 층은 owAuto가 판단하게 둔다. */
  g.add(fpMakeStairwell(lv, stZ0, ko, false, undefined, (lv===1?1.4:undefined)));
  /* 요청 반영(최종): "1층에 서 있어도 지하 계단이 보이게" 하려고 B1의 계단
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
      /* 요청 반영(버그 수정): 여기서 이 호실들(13119·13224·13324·13419·13522)
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
       천장을 뚫고 글자가 깨져 보이는 문제가 있었다(요청 반영: 확실히 천장
       아래로 내린다). */
    /* 요청 반영(삭제): 통로 입구 상인방에 붙여 두었던 남/여 픽토그램을 없앤다 —
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
    /* 요청 반영: 남자화장실은 지금 쓰던 색(시안)을 그대로 두고, 여자화장실만
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
         (요청 반영: 닫힌 모습으로 바꿨더니 화면을 꽉 채워 오히려 답답해 보여서
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
      /* v149(요청 반영): 목적지일 때 개구부 위에 얹던 분홍 표시선(0xFF2E88)은 없앤다 —
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
      var ed=fpMkPlane(CORR_HALF*2,0.16,0xB0B6BC,1);        // 문턱 금속 라인(복도와 통일 — 요청 반영)
      ed.rotation.x=-Math.PI/2; ed.position.set(0,0.07,zc+dir*0.30); g.add(ed);
    });
  }else{
    var cA=fpMkPlane(CORR_HALF*2,H,0xE8DFC8,1); cA.position.set(0,H/2,z0); g.add(cA);
    var cB=fpMkPlane(CORR_HALF*2,H,0xE8DFC8,1); cB.position.set(0,H/2,z1); g.add(cB);
    [[z0,1],[z1,-1]].forEach(function(a){
      var ln=fpMkPlane(CORR_HALF*2,0.05,0x5B4F3D,1);        // 크라운 몰딩(복도와 통일 — 요청 반영)
      ln.position.set(0,H-0.03,a[0]+a[1]*0.01); g.add(ln);
    });
  }

  /* ── 1층 정문 현관 ────────────────────────────────────────────
     로드뷰는 실제로 찾아오는 것과 똑같이 '정문 앞'에서 출발하므로,
     정문 유리문 · 현관 통로(양옆 벽) · 문 앞 광장을 함께 세운다. */
  if(isG){
    var hw=FP_HALL_HW, gx=FP_GATE_X, inX=-FP_WALL_X;
    var hallLen=inX-gx;                                   // 정문 → 복도까지 거리
    // 현관 바닥(복도와 같은 톤) + 천장(복도와 같은 톤으로 통일 — 요청 반영)
    var hfl=fpMkPlane(hallLen, hw*2, 0x39465A, 1);
    hfl.rotation.x=-Math.PI/2; hfl.position.set(gx+hallLen/2, 0.055, 0); g.add(hfl);
    var hce=fpMkPlane(hallLen, hw*2, 0xF2F0EA, 1);        // 복도 천장과 같은 밝은 회색/흰색
    hce.rotation.x=Math.PI/2; hce.position.set(gx+hallLen/2, H-0.02, 0); g.add(hce);
    // 현관 양옆 벽(+ 걸레받이 + 크라운 몰딩)
    [-1,1].forEach(function(sn){
      var sw=fpMkPlane(hallLen,H,0xE8DFC8,1,0x9C8F6E);   // 크림색 벽지로 변경(요청 반영)
      sw.rotation.y=(sn<0)?0:Math.PI;
      sw.position.set(gx+hallLen/2, H/2, sn*hw); g.add(sw);
      var sk=fpMkPlane(hallLen,0.19,0x080C13,1);
      sk.rotation.y=(sn<0)?0:Math.PI;
      sk.position.set(gx+hallLen/2, 0.095, sn*(hw-0.012)); g.add(sk);
      var sl=fpMkPlane(hallLen,0.05,0x5B4F3D,1);          // 크라운 몰딩(복도와 통일 — 요청 반영)
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
    /* 요청 반영: 1층 로비 오른쪽(게시판 쪽) 벽에 붙어 있던 영문 레터링
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
    putR(fpMakeCooler(), bdX0+3.15);   // 브로슈어 거치대 자리와 맞바꾼 위치(요청 반영)
    putR(fpMakeBins(), bdX0+3.85);
    // 브로슈어 거치대(fpMakeRack)는 삭제(요청 반영) — 함수 정의는 남겨 둔다.
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
    /* 요청 반영(버그 수정): 정문 앞 광장에는 바닥판 하나뿐이고 하늘·먼 배경이
       전혀 없어서, 재생을 멈추고 위를 올려다보면 새까만 허공만 보였다(게다가
       거기에 목적지 층 복도 조각까지 떠 보였다 — 그쪽은 animate에서 따로
       가렸다). 옥상에서 쓰는 것과 같은 하늘 배경판으로 광장 둘레와 위를
       덮어, 실제 야외처럼 하늘·먼 산·나무가 보이게 한다.
       (건물 바깥쪽 x<gx 구간에만 세우므로 실내에서는 정문 유리 너머로만 보인다) */
    /* 요청 반영: 광장에서 위를 올려다보면 건물이 있어야 할 자리가 새까맣게
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
  (levels || [startFloor, f]).forEach(function(lv){
    var k=String(lv); if(seen[k]) return; seen[k]=1;
    var cg=fpMakeCorr(lv);
    cg.position.y=fpSlabY(lv);
    cg.userData.fpSlabY=fpSlabY(lv);     // 아래 animate에서 '지금 층만 보이게' 하는 데 쓴다
    _lvG[k]=cg;
    fpCorrG.add(cg);
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
    /* 요청 반영(버그 수정): 건물 3D의 층 바닥 슬래브(짙은 남회색 0x222B36)는
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
     v142(요청 반영): 예전엔 무조건 정문에서만 출발했다 — QR을 찍거나 직접 고른
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
    /* v146(요청 반영): 예전엔 목적지와 상관없이 무조건 엘리베이터 앞(evzW)까지
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
    /* v144(요청 반영): 후문 문 앞(1층 중앙계단실 = 후문 로비의 유리문 안쪽)에서
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
  /* v148(요청 반영): 마지막에 '여기가 목적지'라는 느낌이 약했다 →
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
    /* 요청 반영: B1↔1F 한 도막 계단처럼 단 높이(rise)가 평소의 2배로 지어진
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
  /* 실사형 개선(2차) : 걷는 동안 아주 미세한 좌우 흔들림도 더한다(요청 반영).
     기존 상하 bob과 같은 값에서 파생시켜(진폭만 더 작게) 정지·일시정지 시엔
     bob이 항상 0으로 넘어오므로 흔들림도 자동으로 0이 된다 — 호출부는 그대로 둔다. */
  var sway=(bob||0)*0.4;
  var ex = fpPos.x + Math.cos(yaw)*sway, ey = fpPos.y + FP_EYE + fpEyeOffset + (bob||0) + fpRoofEyeLift, ez = fpPos.z - Math.sin(yaw)*sway;
  fpLastEye = {x:ex, y:ey, z:ez};
  fpLastAim = {x: ex + Math.sin(yaw)*6*ch, y: ey + Math.sin(pit)*6, z: ez + Math.cos(yaw)*6*ch};
  if(fpCeil) fpCeil.position.set(0, fpPos.y + FP_CEIL_H,
      ((GLOBAL_TOP_Z+GLOBAL_BOT_Z)/2)*BUILDING_Z_STRETCH);
  /* 요청 반영: 옥상 철문은 이제 fpRegisterAutoDoor(자동문)가 매 프레임
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
/* ══════════ 자유 탐색(로드뷰처럼 눌러서 이동) ══════════════════
   자동재생(대본)과 나란히 존재하는 두 번째 모드. 바닥에 깔린 이동 지점을
   누르면 그 자리로 걸어가고, 화면을 끌면 고개만 돌아간다. 엘리베이터와
   계단은 직접 눌러 층을 옮긴다.
   카메라·문·캡 갱신은 자동재생과 똑같은 함수(fpCommit)를 쓰고,
   엘리베이터 탑승·계단 이동처럼 '연출이 필요한 구간'만 자동재생과 같은
   대본 형식(fpRunSeq)으로 잠깐 돌린다. */
var fpFree=false;            // 자유 탐색 중인가
var fpB1WasInExit=false;     // 요청 반영(버그 수정): 지하 나가는 계단(exit1/exit2) 진입 순간만 감지해 시선을 한 번 수평으로 되돌리기 위한 상태
var fpSeq=false, fpSeqDone=null;   // 자유 탐색 안에서 잠깐 도는 연출 대본
var fpFloorNow=1;            // 지금 서 있는 층
var fpNodes=[], fpNodeG=null;
var fpPath=null;             // 걸어가는 중 {wp,i,t,dur,x0,z0,node}
var fpFaceYaw=null;          // 멈춰 서서 바라볼 방향
var fpBusy=false;            // 엘리베이터·계단 연출 중(입력 잠금)

/* ── 이동 지점 만들기 : 복도 직선 + 각 문 앞 + 엘리베이터/계단 앞 + 1층 현관 ── */
function fpBuildNodes(lv){
  if(lv==='R'){
    /* 예전엔 옥상 전체(바깥 데크 포함)에 골고루 이동 지점을 흩어 둬서, 문
       바깥까지 걸어 나갈 수 있었다 — 이제 옥탑방 안(fpBuildRooms의 'R' 방
       경계와 같은 범위)에서만 움직이도록 계단 앞 지점 두 개만 둔다. */
    var rn=[], stSpot=fpRoofStSpot(), esSpot=fpRoofEsSpot();
    rn.push({x:stSpot.x, z:stSpot.z, kind:'st'});
    if(esSpot) rn.push({x:esSpot.x, z:esSpot.z, kind:'es'});
    /* 요청 반영: "문을 누르면 밖으로 나갈 수 있게" — 철문 안쪽/바깥쪽에
       이동 지점을 하나씩 둔다. 두 지점 모두 문 중심선(z=문 z) 위에 있어서
       서로 오갈 때 반드시 문을 통과한다(철문은 1.6m 앞에서 자동으로 열린다).
       viaAlways : 문 반대편에서 출발할 때만 문 앞을 먼저 들르게 하는 경유점. */
    if(FP_ROOF_LANDING){
      var _dx=FP_ROOF_DOOR_X, _dz=FP_ROOF_LANDING.z;
      rn.push({x:_dx-1.35, z:_dz, kind:'roofout', gateX:_dx,
               viaAlways:[{x:_dx+1.15, z:_dz}]});
      rn.push({x:_dx+1.45, z:_dz, kind:'roofin', gateX:_dx,
               viaAlways:[{x:_dx-1.15, z:_dz}]});
    }
    /* 요청 반영(버그 수정): 비상계단 옥탑방에는 이런 문 안팎 이동 지점이
       하나도 없고 계단 앞 'es' 지점 하나뿐이었다 — 그래서 그 방에서는
       바깥 데크를 눌러도 "누른 자리와 서 있는 자리가 다른 방"이라 가장 가까운
       지점(=서 있는 그 자리)으로만 스냅돼, 사실상 한 발짝도 움직일 수 없었다.
       중앙계단 옥탑방과 똑같이 철문 안쪽/바깥쪽 지점을 하나씩 둔다.
       (좌표는 fpBuildRooms의 roofDoorE 계산과 같은 식을 쓴다) */
    (function(){
      var esR=EMSTAIR_POS[5]; if(!esR) return;
      var ST0=BUILDING_Z_STRETCH;
      var esz0=esR.z*ST0, esx0=(esR.xWhole>0?1:-1);
      var emD0=FP_ST_WD+0.25;
      var ehx0=esx0>0?(FP_WALL_X-0.25):(-FP_WALL_X-emD0);
      var ehx1=esx0>0?(FP_WALL_X+emD0):(-FP_WALL_X+0.25);
      var eDoorX=(esx0>0?ehx0-0.03:ehx1+0.03);
      var din=esx0;                       // 옥탑방 안쪽을 향하는 방향
      rn.push({x:eDoorX-din*1.35, z:esz0, kind:'roofout', gateX:eDoorX,
               viaAlways:[{x:eDoorX+din*1.15, z:esz0}]});
      rn.push({x:eDoorX+din*1.45, z:esz0, kind:'roofin', gateX:eDoorX,
               viaAlways:[{x:eDoorX-din*1.15, z:esz0}]});
    })();
    return rn;
  }
  var ST=BUILDING_Z_STRETCH, L=(lv==='B1')?null:FLOOR_LAYOUT[lv];
  var ev=evXZ(lv), evZ=ev.z*ST;
  var stZ=stZOf(lv)*ST;
  var n=[], z;
  var z0=GLOBAL_BOT_Z*ST+1.5, z1=GLOBAL_TOP_Z*ST-1.5;
  for(z=z0; z<=z1; z+=5.4) n.push({x:0, z:z, kind:'corr'});
  if(L){
    L.cells.forEach(function(c){
      if(!c.code) return;
      var sd=(c.x>0?1:-1);
      n.push({x:0, z:fpDoorZ(c.parent||c.code, c.z*ST), kind:'door', code:c.parent||c.code, side:sd});
    });
    /* 통로 안으로 한 걸음 들어가, 각 문을 비스듬히 마주 보는 자리.
       문 바로 옆에 붙으면 문이 화면을 가득 채워 무슨 문인지 안 보인다.
       요청 반영(버그 수정 — 통로 폭은 되돌리고 여기만 유지): 통로 자체를
       넓히는 시도는 바로 옆방(WC_ADJ_FLIP 방들)과 벽이 겹치는 새 문제를
       만들어 되돌렸다 — 대신 서 있는 자리의 치우침만 0.55m로 줄여서(옆
       통로 벽까지 0.6m→1.1m 여유), 통로 폭은 원래대로 두면서도 옆을
       바라볼 때 벽이 너무 바짝 채워 보이는 정도는 줄인다. */
    var tl=FACILITIES.toilet, ts=(tl.x>0?1:-1), tz0=fpToiletZ(lv);
    var tax=ts*(FP_WALL_X+FP_ALC_DX-1.15), tdx=ts*(FP_WALL_X+FP_ALC_DX);
    [['M',-1],['W',1]].forEach(function(a){
      var nx=tax, nz=tz0+a[1]*0.55;
      n.push({x:nx, z:nz, kind:'wc', side:ts, wcSex:a[0],
              faceYaw:Math.atan2(tdx-nx, (tz0+a[1]*FP_ALC_HW)-nz)});
    });
    var es=EMSTAIR_POS[lv];
    if(es){ var ss=(es.xWhole>0?1:-1); n.push({x:0, z:es.z*ST, kind:'es', side:ss}); }
  }
  n.push({x:0.55, z:evZ, kind:'ev'});
  n.push({x:0.65, z:stZ, kind:'st'});
  if(L && lv!==1){
    var tlz2=FACILITIES.toilet.z*ST;
    var oa2=-CORE_HALF*ST+0.35, ob2=tlz2-FP_ALC_HW-2.45;
    if(ob2-oa2 > 4){
      var oc=(oa2+ob2)/2;
      var ogate=[{x:0, z:oc, ifOutside:true}];
      n.push({x:-2.2, z:oc, kind:'open', via:ogate});
      n.push({x:-FP_OPEN_D+0.9, z:oc-(ob2-oa2)*0.26, kind:'open', via:ogate});
      n.push({x:-FP_OPEN_D+0.9, z:oc+(ob2-oa2)*0.26, kind:'open', via:ogate});
    }
  }
  if(lv==='B1'){
    /* 지하 : 복도는 막다른 끝 ~ 존 출입문까지, 그 너머가 크리에이티브 존 */
    n=n.filter(function(d){ return d.kind!=='corr'
                 || (d.z>FP_B1_ZEND+1.2 && d.z<FP_B1_ZTOP-1.4); });
    var Z0=FP_B1_ZTOP, gate=[{x:0, z:Z0+1.6, ifOutside:true}];
    n.push({x:0, z:Z0-4.2, kind:'zonedoor'});
    /* 요청 반영: 존 입구 옆 벽감(문 앞)으로도 걸어 들어갈 수 있게 이동 지점을 둔다 */
    n.push({x:-FP_WALL_X-FP_B1_ALC_D*0.55, z:Z0-FP_B1_ALC_W*0.55, kind:'corr'});
    /* 요청 반영: 중앙계단 옆 빈 공간 — 계단 옆을 지나 안쪽 검은 문 앞까지 */
    (function(){
      var nk=fpB1StairNook(stZ, null);
      if(!nk) return;
      var nz=(nk.z0+nk.z1)/2;
      n.push({x:FP_WALL_X+1.1, z:nz, kind:'corr'});          // 계단참 옆 초입
      n.push({x:nk.x1-1.0,     z:stZ-1.70, kind:'corr'});    // 안쪽 검은 문 앞
    })();
    // 가운데 통로(비워 둔 공간)
    n.push({x:-1.4, z:Z0+4.0,  kind:'zone', via:gate});
    n.push({x:-1.4, z:Z0+9.0,  kind:'zone', via:gate});
    n.push({x:-1.4, z:Z0+13.4, kind:'zone', via:gate});
    // 왼쪽(+X) 열람 공간 / 오른쪽(-X) 원목 부스 라운지
    // 요청 반영: 방 폭을 좁히면서(zx1=7.0) 좌표를 새 벽 안쪽으로 당겼다.
    n.push({x:5.5,  z:Z0+6.7,  kind:'zone', via:gate});
    n.push({x:5.5,  z:Z0+16.0, kind:'zone', via:gate});
    /* 요청 반영: 창가 라운지(소파·짙은 카펫) 쪽 이동 지점 — 소파 앞 통로와
       카펫 안쪽 두 자리. 가구와 겹치지 않는 좌표로 잡았다. */
    n.push({x:11.8, z:Z0+8.4,  kind:'zone', via:gate});
    n.push({x:11.8, z:Z0+14.5, kind:'zone', via:gate});
    n.push({x:11.8, z:Z0+20.5, kind:'zone', via:gate});
    n.push({x:-9.3, z:Z0+7.2,  kind:'zone', via:gate});
    n.push({x:-9.3, z:Z0+16.0, kind:'zone', via:gate});
    /* 회의실 1·2는 지웠고(북쪽에 새로 만들 예정) 접근 노드도 같이 뺐다 —
       안 그러면 검색에서 더는 존재하지 않는 방으로 안내하게 된다. */
    /* 나가는 문 : 이중문(안쪽 문 → 방풍실 → 바깥 문) → 계단 1구간 → 오른쪽 90도
       → 계단 2구간 → 맨 위 문 앞.
       ※ 걸어서 올라가는 건 1구간 계단까지만이다. 두 번에 나눠 선다 :
         ① 이중문을 둘 다 지난 뒤, 첫 계단 앞
         ② 1구간을 오른 계단참 — 여기가 끝. 2구간 계단과 그 위 문은 구조로만 보인다. */
    (function(){
      var P=fpB1ExitPts();
      var footPt={x:P.xA0, z:P.zA0-1.8};           // 요청 반영: 카메라를 zDoorOut-0.9m 지점(문 바로 안쪽)에 오도록 조정
      var landPt={x:P.xA0, z:P.zA1+0.5};            // ② 계단참(여기까지만 올라간다) — 요청 반영: 뒤쪽 벽돌벽에서 더 떨어지도록 계단참 안쪽 초입에 세운다(기존: 계단참 정중앙)
      /* 요청 반영(버그 수정): 이중문을 지나 첫 계단 앞에서 뒤로가기를 누르면,
         근처에 스냅할 만한 '존' 쪽 노드가 하나도 없어서(제일 가까운 존 노드가
         20m 넘게 떨어져 있었다) 잘게 걷는 자리 이동으로 넘어갔는데, 그 이동은
         지금 서 있는 방(계단실) 경계 안쪽으로만 움직이게 되어 있어 문 앞
         0.55m에서 더는 못 나가고 갇혔었다 — 문 바로 안쪽(존 영역)에 실제로
         스냅 가능한 지점을 하나 둬서 뒤로가기가 정상적으로 존 쪽으로 넘어가게 한다. */
      n.push({x:footPt.x, z:(Z0+30.0)-0.5, kind:'zoneexit'});
      n.push({x:footPt.x, z:footPt.z, kind:'zonefoot', via:gate});
      n.push({x:landPt.x, z:landPt.z, kind:'zoneland', via:gate.concat([footPt])});
      /* 요청 반영(버그 수정): via에 footPt/landPt까지 그대로 넣어뒀더니, 이미
         계단참 근처에 서 있는데도 "문 앞(footPt)까지 되돌아갔다가 다시 계단참을
         거쳐" 오는 식으로 경로가 잡혀서 순간 뒤로 확 밀렸다가 오는 것처럼
         보였다 — zonecorr는 (자유이동 스냅 조건상) 항상 계단참 바로 근처에서만
         요청되므로, 거기서부터 곧장 잇는 지점들만 남긴다. */
      var cornerPt={x:P.xA0, z:P.zMid};
      var stairBotPt={x:P.xB0, z:P.zMid};
      var stairTopPt={x:P.xB1, z:P.zMid};
      var corrPt={x:P.xB2-P.dir*0.9, z:P.zMid};
      n.push({x:corrPt.x, z:corrPt.z, kind:'zonecorr',
              via:[cornerPt, stairBotPt, stairTopPt]});
    })();
  }
  if(lv===1){
    n.push({x:-3.2, z:0, kind:'hall'});
    n.push({x:-7.0, z:0, kind:'hall'});
    n.push({x:FP_GATE_X+1.15, z:0, kind:'gate'});
    /* 중앙계단 로비(후문 참) 진입 노드 — 문턱의 'st' 지점에서 이 노드로
       한 걸음 들어가면, 그다음부터는 fpRoomAt이 인식하는 'lobby1' 방
       안이라 바닥 탭·전진 버튼으로 자유롭게 돌아다닐 수 있다(요청 반영). */
    n.push({x:FP_WALL_X+0.6, z:stZ, kind:'hall'});
  }
  return n;
}
/* 크리에이티브 존·회의실·열린 공간처럼 '넓게 트인 방' 범위.
   이 안에서는 이동 지점을 거치지 않고 누른 자리로 곧장 걸어간다
   (복도용 경로 규칙을 그대로 쓰면 문 앞까지 되돌아갔다 오느라 빙글빙글 돌았다). */
var fpRooms=[];
function fpBuildRooms(lv){
  if(lv==='R'){
    /* 예전엔 옥상 전체(바깥 데크 포함)를 하나의 방으로 열어 둬서, 바닥 아무 데나
       눌러도 (닫혀 있는) 철문을 그냥 지나쳐 바깥으로 걸어 나가 버렸다 —
       fpMakeRoof가 옥탑방을 짓는 것과 똑같은 경계로 좁혀, 문 밖(바깥 데크)은
       걸어갈 수 있는 방으로 아예 등록하지 않는다.
       (요청 반영: fpMakeRoof가 계단 실측 비율로 방을 좁힌 뒤에도 이 함수가
       옛 1.4배 폭 공식을 그대로 쓰고 있어서, 실제 벽보다 넓은 영역이 "걸을 수
       있는 방"으로 등록돼 그 틈으로 밖으로 빠져나가는 버그가 있었다 — 아래
       공식을 fpMakeRoof와 완전히 동일하게 맞춘다.) */
    var ST0=BUILDING_Z_STRETCH;
    var rStZ=(FLOOR_LAYOUT[5]?FLOOR_LAYOUT[5].stZ:0)*ST0;
    var ROOF_OW_MUL0=1.0, ROW0=FP_ST_OW*ROOF_OW_MUL0, RM_DX0=0.45, RM_DZ0=0.35;   // v115: fpMakeRoof와 동일
    var rRealDnZ0=rStZ-(ROW0/4+0.02)-(ROW0/2-0.10)/2-0.10;
    var rRealDnZ1=rStZ-(ROW0/4+0.02)+(ROW0/2-0.10)/2+0.10;
    var rDownFlightW=rRealDnZ1-rRealDnZ0;
    var rSkipGap=0.06;
    var rRoomWiden=0.6;
    var rZ0=rRealDnZ0+0.03;        // v114: fpMakeRoof의 mainCZ0와 동일 공식
    var rZ1=rRealDnZ1+2.92;   // v111: fpMakeRoof의 mainCZ1과 동일
    /* 요청 반영(버그 수정): x0 경계가 정확히 벽 안쪽 끝(문 앞)이라, 방 안에서
       걸을 때(fpGoPoint)의 0.55m 클램프 여유 때문에 실제로는 문 근처에도
       못 가고 그 앞에서 멈춰 버렸다 — 문을 지나 옥상 데크 쪽으로 자연스럽게
       이어져 걸어나갈 수 있도록, 문 밖(FP_ROOF_OUT)을 확실히 넘어서까지
       경계를 넓힌다(그 너머는 어차피 roofDeck과 겹치므로 안전하다). */
    /* 요청 반영(재적용): "벽을 누르면 벽 바깥으로 나가진다 — 문으로만
       나갔으면 좋겠다". 예전에 되돌렸던 '문으로만 드나들기'를, 이번에는
       경계에서 튕기지 않게 세 가지를 같이 맞춰서 다시 넣는다.
         ① 옥탑방 방(roofMain/roofEm)은 문쪽 벽 '안쪽'에서 끝난다.
         ② 바깥 데크(roofDeck)에는 옥탑방이 서 있는 자리만큼 실제로 구멍
            (holes)을 뚫는다 — 그래야 옥탑방 안에서 데크를 눌러도
            fpFreePick의 "누른 자리와 서 있는 자리가 같은 방일 때만 곧장
            간다" 규칙에 걸려 벽을 통과하지 않는다.
         ③ 대신 문짝 자리에 딱 맞는 좁은 통로 방(roofDoorN)을 하나 걸쳐
            둬서, ▲(앞으로) 걷기로 문을 지나 데크로, 데크에서 다시 안으로
            자연스럽게 이어져 걸을 수 있게 한다(철문은 fpRegisterAutoDoor로
            1.6m 앞에서 저절로 열린다). */
    var rMainX0=FP_WALL_X-2.30, rMainX1=FP_WALL_X+FP_ST_WD-0.80+0.35+RM_DX0;
    var rDoorX=rMainX0-0.03, rDoorW=1.92, rMz=(rZ0+rZ1)/2;
    /* v122: 데크 앞면(계단 폭 바깥, 개구부 위쪽)으로는 못 올라서게 구멍 — 데크는 계단으로만 오른다.
       (fpMakeRoofSkipFloor와 같은 공식: 데크 깊이 1.90, 계단 시작 z = 개구부 +Z 가장자리 - 0.08) */
    var rDkX1=rMainX1-0.02, rDkX0=rDkX1-1.90, rStZ0=rRealDnZ1-0.08;
    var rr=[{x0:rMainX0+0.10, x1:rMainX1, z0:rZ0, z1:rZ1, id:'roofMain',
             holes:[{x0:rDkX0, x1:rMainX1, z0:rZ0, z1:rStZ0-0.02}]}];
    rr.push({x0:rDoorX-1.70, x1:rDoorX+1.30, z0:rMz-rDoorW/2-0.04, z1:rMz+rDoorW/2+0.04,
             id:'roofDoor'});
    var rHoles=[{x0:rMainX0, x1:rMainX1, z0:rZ0, z1:rZ1}];
    var esR0=EMSTAIR_POS[5];
    if(esR0){
      var esz0=esR0.z*ST0, esx0=(esR0.xWhole>0?1:-1);
      var emD0=FP_ST_WD+0.25;
      var ehx0=esx0>0?(FP_WALL_X-0.25):(-FP_WALL_X-emD0);
      var ehx1=esx0>0?(FP_WALL_X+emD0):(-FP_WALL_X+0.25);
      var ex0=esx0>0?(FP_WALL_X-0.25):(-FP_WALL_X-3.3);
      var ex1=esx0>0?(FP_WALL_X+3.3):(-FP_WALL_X+0.25);
      rr.push({x0:(esx0>0?ex0+0.10:ex0), x1:(esx0>0?ex1:ex1-0.10),
               z0:esz0-1.85, z1:esz0+1.85, id:'roofEm'});
      var eDoorX=(esx0>0?ehx0-0.03:ehx1+0.03);
      rr.push({x0:eDoorX-(esx0>0?1.70:-1.30), x1:eDoorX+(esx0>0?1.30:1.70),
               z0:esz0-rDoorW/2-0.04, z1:esz0+rDoorW/2+0.04, id:'roofDoorE'});
      rHoles.push({x0:ehx0, x1:ehx1, z0:esz0-1.85, z1:esz0+1.85});
    }
    var RB=fpRoofBox();
    rr.push({x0:-RB.HX, x1:RB.HX, z0:RB.z0, z1:RB.z1, id:'roofDeck', holes:rHoles});
    return rr;
  }
  var r=[];
  if(lv==='B1'){
    var Z0=FP_B1_ZTOP, zz1=Z0+30.0;
    // 회의실 1·2 visual은 지웠고 북쪽에 새로 만들 예정이라, 걸을 수 있는
    // 영역 정의(meet1/meet2)도 일단 같이 뺐다 — 안 그러면 새 벽 바깥
    // 빈 공간을 걸어다닐 수 있는 방으로 착각하게 된다.
    /* 요청 반영: 창가 쪽 라운지(올리브그린·차콜 소파, 주황 오토만, 짙은 카펫
       바닥)까지 걸어갈 수 있게 존의 걷기 영역을 x=9.0 → 13.9로 넓힌다.
       (창가 열람 카운터가 x≈14.2부터라, fpGoPoint의 0.55m 여백까지 감안하면
        카운터 바로 앞에서 자연스럽게 멈춘다.)
       단, 존 입구 쪽(z<11.2)의 x>9.6 구간은 중앙계단실 뒷벽(x=10.47) 너머라
       실제로는 벽 속이다 — hole로 빼서 그쪽으로는 못 걸어가게 한다. */
    r.push({x0:-12.0, x1:13.9, z0:Z0+0.3, z1:zz1, id:'zone',
            holes:[{x0:9.6, x1:14.0, z0:Z0+0.3, z1:11.2}]});
    /* 요청 반영: 존 입구 옆 벽감(검은 문·소화기가 있는 오목한 자리)도 걸어
       들어갈 수 있게 방으로 등록한다. 복도 쪽으로 1.3m 겹쳐 두어야
       (fpGoPoint의 0.55m 여백 때문에) 이음매에서 막히지 않는다. */
    r.push({x0:-FP_WALL_X-FP_B1_ALC_D, x1:-FP_WALL_X+1.3,
            z0:Z0-FP_B1_ALC_W, z1:Z0-0.05, id:'b1alc'});
    /* 요청 반영: 중앙계단 옆 빈 공간(끝에 검은 문) — 계단참(x=FP_WALL_X~)에서
       문 앞까지 걸어갈 수 있게 방으로 등록한다. 복도 쪽으로 넉넉히 겹친다. */
    (function(){
      var nk=fpB1StairNook(stZOf('B1')*BUILDING_Z_STRETCH, null);
      if(!nk) return;
      r.push({x0:FP_WALL_X-0.9, x1:nk.x1, z0:nk.z0, z1:nk.z1, id:'b1stnook'});
    })();
    // 요청 반영: 방 폭을 26m→17m로 좁히면서 걸을 수 있는 영역 경계도 맞췄다.
    /* 이중문 → 계단 1구간 → 계단참 → (요청 반영) 90도 꺾인 2구간 계단 →
       맨 위 참까지 걸을 수 있다. 2구간 쪽(exit2)은 exit1과 겹치지 않는
       X 범위라 별도 사각형으로 등록해야 한다 — 안 그러면 그 구간의 중간
       경유점(코너·계단 시작/끝)이 '방 밖'으로 인식돼, 길찾기가 엉뚱하게
       메인 복도 중앙(x=0)을 거쳐 크게 돌아가는 버그가 생긴다(요청하신
       "계단참에서 움직일 때 밖으로 나가 엄청 뒤로 가는" 오류의 원인). */
    (function(){
      var P=fpB1ExitPts(), sW=FP_B1_EXIT_SW, hw2=sW/2;
      /* 요청 반영(버그 수정): 예전에는 exit1·exit2 이음매의 틈을 없애려고 두
         사각형의 '네 변 모두'를 0.6m씩 넓혀 뒀다 — 그런데 그 여유가 그대로
         "벽 안쪽으로 걸어 들어갈 수 있는 폭"이 됐다. fpGoPoint가 방 경계에서
         0.55m를 빼 주므로, 결국 벽면을 0.05m 지나친 자리까지 걸어갈 수 있었고
         나가는 문 밖 벽돌 벽에 다가가면 몸이 벽에 파묻히고 그 너머가 보였다.
         → 각 구간의 경계를 실제 벽면에 정확히 맞추고, 겹침은 '벽이 없는
           이음매 쪽'으로만 준다(계단참은 두 구간이 공유하는 실제 바닥이라
           그쪽으로 겹쳐도 벽을 뚫지 않는다).
         실측 기준: 방풍실 폭 = exW+0.9(fpMakeB1과 동일), 1구간 계단·계단참
         옆 벽돌벽 = xA0 ± SW/2, 2구간 옆벽 = zA1 ~ zA2. */
      var vhw=(FP_B1_EXIT_DOOR_W+0.9)/2;
      r.push({x0:P.xA0-vhw, x1:P.xA0+vhw, z0:zz1, z1:P.zDoorOut+0.30, id:'exitvest'});
      r.push({x0:P.xA0-hw2, x1:P.xA0+hw2, z0:P.zDoorOut-0.20, z1:P.zA2, id:'exit1'});
      var e2x0=Math.min(P.xB0,P.xB2), e2x1=Math.max(P.xB0,P.xB2);
      if(P.dir<0) e2x1 += 2.20; else e2x0 -= 2.20;      // 계단참 쪽으로만 넉넉히 겹친다(이음매 끊김 방지)
      r.push({x0:e2x0, x1:e2x1, z0:P.zA1, z1:P.zA2, id:'exit2'});
    })();
  }else{
    var L=FLOOR_LAYOUT[lv];
    if(L && lv!==1){
      var ST=BUILDING_Z_STRETCH, tlz=FACILITIES.toilet.z*ST;
      var oa=-CORE_HALF*ST+0.35, ob=tlz-FP_ALC_HW-2.45;
      if(ob-oa>4) r.push({x0:-FP_WALL_X-FP_OPEN_D, x1:-FP_WALL_X, z0:oa, z1:ob, id:'open'});
    }
    if(lv===1){
      /* 1층 중앙계단 로비 : 지난 세션에 하행 계단을 지우고 걸을 수 있는 바닥으로
         채운 좌측(zDn) 공간 + 후문 참 전체를, 실제로 바닥을 눌러 걸어가거나
         ▲ 버튼으로 걸어들어갈 수 있는 '방'으로 등록한다. 상행 계단 매스
         (실제 디딤판이 있는 곳)는 holes로 빼서 그 속으로 걸어 들어가지 않게 한다.
         계산식은 fpMakeStairwell 내부와 동일(1층만 폭 1.4배 — owAuto). */
      var ST1=BUILDING_Z_STRETCH;
      var stZ1=stZOf(1)*ST1;
      var OW1=FP_ST_OW*1.4, hw1=OW1/2+0.03;
      var x01=FP_WALL_X, WD1=FP_ST_WD_B1F, LAND1=FP_ST_LAND;
      var N1=FP_ST_N, run1=FP_ST_RUN, fw1=OW1/2-0.10;
      var xs1=x01+LAND1, zUp1=stZ1+OW1/4+0.02;
      var lobby={x0:x01+0.35, x1:x01+WD1-0.35, z0:stZ1-hw1+0.35, z1:stZ1+hw1-0.35, id:'lobby1'};
      var upFlightHole={x0:xs1-0.15, x1:xs1+N1*run1+0.15, z0:zUp1-fw1/2, z1:zUp1+fw1/2};
      lobby.holes=[upFlightHole];
      r.push(lobby);
    }
  }
  return r;
}
function fpRoomAt(x,z){
  /* 요청 반영(버그 수정): exit1(1구간+계단참)·exit2(2구간)처럼 이음매를
     없애려고 일부러 겹쳐 둔 방들이 있는데, 예전엔 배열에서 먼저 나오는
     방을 무조건 선택해서 — 실제로는 다음 방(exit2) 안쪽으로 더 걸어
     들어갈 수 있는 자리인데도 먼저 걸린 방(exit1)의 좁은 여백에 막혀
     계단참에서 2구간 계단으로 못 넘어가고 딱 멈춰버렸다. 겹치는 자리에서는
     "가장자리에서 가장 멀리 떨어진(=가장 안쪽인)" 방을 골라야, 그 방의
     여백에 걸리지 않고 자연스럽게 이어서 걸어갈 수 있다. */
  var best=null, bestMargin=-1;
  for(var i=0;i<fpRooms.length;i++){
    var q=fpRooms[i];
    if(x<q.x0||x>q.x1||z<q.z0||z>q.z1) continue;
    var inHole=false;
    if(q.holes) q.holes.forEach(function(h){
      if(x>=h.x0&&x<=h.x1&&z>=h.z0&&z<=h.z1) inHole=true;
    });
    if(inHole) continue;
    var margin=Math.min(x-q.x0, q.x1-x, z-q.z0, q.z1-z);
    if(margin>bestMargin){ bestMargin=margin; best=q; }
  }
  return best;
}
/* 방 안에서 누른 자리로 곧장 걸어가기(벽에 붙지 않도록 조금 안쪽으로 당긴다) */
function fpGoPoint(q, px, pz){
  var m=0.55;
  px=Math.max(q.x0+m, Math.min(q.x1-m, px));
  pz=Math.max(q.z0+m, Math.min(q.z1-m, pz));
  /* hole(계단 매스 등 실제로 막혀 있는 자리) 안으로 목표점이 떨어지면,
     가장 가까운 바깥 가장자리로 밀어낸다 — 안 그러면 눈에 보이는 계단
     속으로 카메라가 그대로 걸어 들어가 버린다. */
  if(q.holes) q.holes.forEach(function(h){
    if(px<h.x0-m || px>h.x1+m || pz<h.z0-m || pz>h.z1+m) return;
    var dLeft=px-(h.x0-m), dRight=(h.x1+m)-px, dNear=pz-(h.z0-m), dFar=(h.z1+m)-pz;
    var minD=Math.min(dLeft,dRight,dNear,dFar);
    if(minD===dLeft) px=h.x0-m;
    else if(minD===dRight) px=h.x1+m;
    else if(minD===dNear) pz=h.z0-m;
    else pz=h.z1+m;
  });
  var pts=[{x:fpPos.x,z:fpPos.z}];
  pts.push({x:px,z:pz});
  var segL=[], total=0;
  for(var pi2=1; pi2<pts.length; pi2++){
    var sl=Math.sqrt(Math.pow(pts[pi2].x-pts[pi2-1].x,2)+Math.pow(pts[pi2].z-pts[pi2-1].z,2));
    segL.push(sl); total+=sl;
  }
  if(total<0.25) return;
  fpFaceYaw=null;
  fpYaw += fpLookYaw; fpLookYaw = 0;
  fpPath={pts:pts, segL:segL, total:total, t:0,
          dur: Math.max(0.4, total/FP_WALK)+0.3, sx:fpPos.x, sz:fpPos.z,
          node:{x:px, z:pz, kind:'spot'}};
  fpCap('');
}
/* 이동 지점 바닥 표시 — 지금은 눈에 보이지 않게 해 둔다(투명).
   실제 로드뷰처럼 바닥이 깔끔하게 보이면서도, 누르면 그대로 걸어간다. */
function fpClearNodeG(){
  if(!fpNodeG) return;
  scene.remove(fpNodeG);
  fpNodeG.traverse(function(o){ if(o.geometry) o.geometry.dispose(); if(o.material) o.material.dispose(); });
  fpNodeG=null;
}
function fpMakeNodeG(lv){
  var g=new THREE.Group(), y=fpSlabY(lv)+0.07;
  var tCode=(target && target.kind==='room') ? target.code : null;
  fpNodes.forEach(function(nd){
    var col=0x6FD8FF, op=0.34;
    if(nd.kind==='ev'){ col=0xE0A458; op=0.55; }
    else if(nd.kind==='st'){ col=0x7FE9B0; op=0.55; }
    else if(nd.kind==='es'){ col=0x39FF88; op=0.42; }
    else if(nd.kind==='gate'||nd.kind==='hall'){ col=0x8FE3E0; op=0.4; }
    if(nd.kind==='door' && tCode && nd.code===tCode){ col=0xFF2E88; op=0.85; }
    if(nd.kind==='wc' && target && target.kind==='toilet' && target.floor===lv){ col=0xFF2E88; op=0.85; }
    var m=new THREE.Mesh(new THREE.RingGeometry(0.34,0.54,24),
      new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0,
        side:THREE.DoubleSide, depthWrite:false, depthTest:false}));
    m.rotation.x=-Math.PI/2; m.position.set(nd.x, y, nd.z);
    m.renderOrder=6; m.userData.node=nd;
    g.add(m);
    var fillM=new THREE.Mesh(new THREE.CircleGeometry(0.60,24),
      new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0,
        side:THREE.DoubleSide, depthWrite:false, depthTest:false}));
    fillM.rotation.x=-Math.PI/2; fillM.position.set(nd.x, y-0.002, nd.z);
    fillM.renderOrder=5; fillM.userData.node=nd;
    g.add(fillM);
  });
  scene.add(g);
  return g;
}
/* 그 층으로 갈아타기 : 복도·이동 지점을 그 층 것으로 새로 짓는다 */
function fpSetFloor(lv){
  fpFloorNow=lv;
  if(lv!=='R') fpRoofEyeLift=0;   // 옥상을 벗어나면 옥상 전용 카메라 높이 보정을 원래대로 되돌린다
  if(fpCab) fpCab.visible=(lv!=='R');   // 옥상에서 내려오면 다시 보이게
  fpPos.y=fpSlabY(lv);
  /* 요청 반영: 1층 로비 바닥에는 지하로 내려다보이는 개구부(landFl hole)가
     뚫려 있는데, 그동안은 이 함수가 딱 그 층 하나만 지어서 지하(B1) 계단
     자체가 씬에 존재하지 않았다 — 그래서 구멍은 뚫려 있어도 밑으로 아무것도
     안 보였다. 1층에 서 있을 때만 B1도 같이 지어서, 개구부 너머로 실제
     지하 계단(B1 쪽 straightUp 한 도막 계단)이 항상 보이게 한다. */
  fpBuildCorr(lv===1 ? [1,'B1'] : [lv]);
  fpNodes=fpBuildNodes(lv);
  fpRooms=fpBuildRooms(lv);
  fpClearNodeG(); fpNodeG=fpMakeNodeG(lv);
  /* v145: 직접 걸어보기 중 층이 바뀌면 바닥 빨간 유도선도 그 층 기준으로 다시 판단한다.
     (미리보기는 자체 대본에서 켜고 끄므로 자유 탐색일 때만 손댄다) */
  if(fpFree && typeof fpRouteFloor==='function'){
    var sameNow = !!(target && target.floor===lv);
    fpRouteFloor(!sameNow);
    if(typeof routeA!=='undefined' && routeA) routeA.visible=false;
  }
}
/* 연출 구간(엘리베이터 탑승 등)을 자동재생과 같은 대본 형식으로 잠깐 돌린다 */
function fpRunSeq(steps, done){
  /* 걷는 구간(to)의 시간을 거리에 맞춰 계산해 둔다.
     예전엔 dur을 안 주면 fpTick이 그 구간을 한 프레임에 끝내버려서,
     엘리베이터 탑승·계단 이동이 순간이동처럼 튀었다. */
  var px=fpPos.x, pz=fpPos.z, py=fpPos.y, first=-1, last=-1;
  for(var i=0;i<steps.length;i++){
    var st=steps[i];
    if(!st.to){
      if(st.y!==undefined && st.dur===undefined)
        st.dur=Math.max(0.6, Math.abs(st.y-py)/3.2);
      if(st.y!==undefined) py=st.y;
      continue;
    }
    var dx=st.to.x-px, dz=st.to.z-pz;
    var dy=(st.y!==undefined) ? (st.y-py) : 0;
    var d=Math.sqrt(dx*dx+dz*dz);
    /* 계단처럼 높이까지 변하는 구간은 수직 거리도 같이 세서
       한 칸씩 밟고 오르는 속도로 보이게 한다. */
    if(st.dur===undefined)
      st.dur=Math.max(0.45, (d + Math.abs(dy)*0.55)/FP_WALK);
    if(!st.ease) st.ease='lin';
    px=st.to.x; pz=st.to.z; if(st.y!==undefined) py=st.y;
    if(first<0) first=i;
    last=i;
  }
  if(first>=0) steps[first].ease=(first===last)?'io':'in';
  if(last>=0 && last!==first) steps[last].ease='out';
  fpSteps=steps; fpI=0; fpT=0; fpSeq=true; fpSeqDone=done;
  fpEnterStep();
}
/* ── 걸어가기 : 복도 한가운데(x=0)를 거쳐 가므로 벽을 뚫지 않는다 ── */
function fpGoTo(nd){
  if(fpBusy) return;
  /* 요청 반영(버그 수정): 노드 마커를 직접 탭해서 걷는 이 경로는 그동안
     #fpSel/#fpB1Panel이 열려 있는지 확인하지 않았다 — 옥상 하강 버튼이
     뜬 채로 마커를 탭하면 이 함수가 그대로 이동을 진행했고, 도착 처리
     후반부의 무조건 fpSelHide() 호출 때문에 버튼이 곧바로 사라져 보였다
     (fpStepMove/fpFreePick만 막아 뒀지 이 경로는 빠져 있었다). */
  var __selElG=document.getElementById('fpSel');
  if(__selElG && __selElG.classList.contains('on')) return;
  var __b1ElG=document.getElementById('fpB1Panel');
  if(__b1ElG && __b1ElG.classList.contains('on')) return;
  /* 경로점 : 복도 한가운데(x=0)를 거쳐 가므로 벽을 뚫지 않는다.
     문을 지나야만 갈 수 있는 자리는 nd.via 에 적어 둔 지점을 먼저 들른다. */
  var pts=[{x:fpPos.x, z:fpPos.z}];
  function push(px,pz){
    var last=pts[pts.length-1];
    if(Math.abs(px-last.x)>0.05 || Math.abs(pz-last.z)>0.05) pts.push({x:px, z:pz});
  }
  var vias = nd.via ? (nd.via.length ? nd.via : [nd.via]) : [];
  /* 경유점('via')은 원래 '복도에서 방으로 들어올 때'만 필요한 문 앞 지점들이다.
     이미 그 방 안에 서 있는데도 다 거치면, 예를 들어 지하 계단참(zoneland)으로
     걸어갈 때 이미 지나온 문 앞(footPt)까지 도로 되돌아갔다가 다시 앞으로 오는
     식으로 걸어서 — 걷는 도중 갑자기 몸을 홱 돌려 뒤로 갔다 오는 것처럼 보이고
     시야각도 요동쳤다(요청하신 "카메라 각도 이상하게 변하고 벽에 튕기는" 현상의
     원인). 예전엔 'ifOutside' 표시가 붙은 경유점만 걸러냈는데, 표시가 없는
     다른 경유점(footPt 등)도 똑같이 "방 안에서는 필요 없는 경유점"이므로,
     이미 방 안에 서 있다면 경유점 전부를 건너뛰고 목적지로 곧장 간다. */
  if(fpRoomAt(fpPos.x, fpPos.z)) vias = [];
  /* 문을 반드시 통과해야 하는 지점(옥상 철문 안/밖)은, 지금 문 반대편에 서
     있을 때만 문 앞 경유점을 살려 둔다 — 같은 편에 있으면 곧장 걸어간다. */
  if(nd.viaAlways && nd.gateX!==undefined){
    var _sN=(fpPos.x>=nd.gateX), _sT=(nd.x>=nd.gateX);
    vias = (_sN!==_sT) ? nd.viaAlways : [];
  }
  /* 방 안(크리에이티브 존·열린 공간·계단참)은 복도가 아니라 열린 바닥이므로,
     마지막 구간까지 'x=0 복도 중앙'을 거치게 하면 오히려 벽을 뚫고 지나간다.
     → 그런 지점은 마지막 한 구간만 곧장 걸어간다. */
  var inRoom = (nd.kind==='zone'||nd.kind==='zoneroom'||nd.kind==='zoneexit'
              ||nd.kind==='zonefoot'||nd.kind==='zoneland'||nd.kind==='zonestair'
              ||nd.kind==='zonecorr'||nd.kind==='zoneoutside'
              ||nd.kind==='open');
  var list = vias.concat([{x:nd.x, z:nd.z}]);
  var cx=fpPos.x, cz=fpPos.z;
  list.forEach(function(w, wi){
    var last=(wi===list.length-1);
    /* 지금 서 있는 자리가 넓게 트인 방이면 복도 규칙(x=0 중앙선 경유)을 쓰지 않는다.
       예전에는 존 안에서 나가는 계단으로 갈 때도 복도 중앙까지 돌아 나갔다. */
    var curInRoom = !!fpRoomAt(cx, cz);
    if(!(last && inRoom) && !curInRoom){
      if(Math.abs(cx)>0.06 && Math.abs(w.z-cz)>0.06) push(0, cz);
      if(Math.abs(w.z-cz)>0.06) push(Math.abs(cx)>0.06 ? 0 : cx, w.z);
    }
    push(w.x, w.z);
    cx=w.x; cz=w.z;
  });
  if(pts.length<2){ fpArriveNode(nd); return; }
  /* 지하 나가는 계단(1구간 → 오른쪽 90도 → 2구간)을 지나갈 때는 눈높이(y)가 실제로
     계단을 오르듯 바뀌어야 한다 — 이 구간만 평면 이동 대신 계단 전용 연출로 걷는다. */
  /* 요청 반영: 지하 나가는 계단(1구간/2구간) 구간도 이제 자유롭게 걸어 다닐 수 있어야 하므로,
     여기서 계단 전용 연출(fpRunSeq 애니메이션)로 가로채지 않는다 — 이 아래의 일반 경로
     이동으로 그대로 진행하고, 눈높이(y)는 fpFreeTick에서 fpB1ExitY()로 매 프레임 계산한다. */
  var total=0, segL=[];
  for(var i=1;i<pts.length;i++){
    var d=Math.sqrt(Math.pow(pts[i].x-pts[i-1].x,2)+Math.pow(pts[i].z-pts[i-1].z,2));
    segL.push(d); total+=d;
  }
  fpFaceYaw=null;
  /* 둘러보느라 돌려 둔 시선을 몸 방향으로 합쳐 둔다
     (안 그러면 걷기 시작하는 순간 시야가 그만큼 홱 틀어진다) */
  fpYaw += fpLookYaw; fpLookYaw = 0;
  fpPath={pts:pts, segL:segL, total:total, t:0,
          dur: Math.max(0.45, total/FP_WALK) + 0.35,   // 출발·도착이 완만하도록 여유
          sx:fpPos.x, sz:fpPos.z, node:nd};
  fpCap('');
}
/* 폴리라인 위에서 '앞에서부터 d만큼 간 지점'과 그 방향을 구한다 */
function fpPathAt(d){
  var pts=fpPath.pts, segL=fpPath.segL, acc=0;
  for(var i=0;i<segL.length;i++){
    if(d<=acc+segL[i] || i===segL.length-1){
      var t=segL[i]>0 ? Math.min(1,(d-acc)/segL[i]) : 1;
      var a=pts[i], b=pts[i+1];
      return {x:a.x+(b.x-a.x)*t, z:a.z+(b.z-a.z)*t, dx:b.x-a.x, dz:b.z-a.z};
    }
    acc+=segL[i];
  }
  var e=pts[pts.length-1];
  return {x:e.x, z:e.z, dx:0, dz:0};
}
/* 도착했을 때 : 바라볼 방향을 정하고, 엘리베이터·계단이면 층 선택을 띄운다 */
function fpArriveNode(nd){
  var ko=(LANG==='ko');
  fpEyeOffset = 0;   // 요청 반영: 노드 진입 시 눈높이 보정을 기본값으로 되돌리고, 필요한 지점에서만 아래서 다시 조정
  if(nd.kind==='zonedoor'||nd.kind==='zone'||nd.kind==='zoneroom'){
    fpFaceYaw=0;                                           // 크리에이티브 존 안쪽(+Z)을 본다
    if(nd.kind==='zone'||nd.kind==='zoneroom') fpLookPitch=-0.16;
  }
  else if(nd.kind==='zoneexit'||nd.kind==='zonefoot'){
    fpFaceYaw=0;                                           // 이중문 → 계단 쪽(+Z)
    /* 요청 반영(버그 수정): 바로 앞(zone/zoneroom)에서 넘어올 때 남아 있던
       -0.16 아래쪽 시선(fpLookPitch)이 여기까지 그대로 이어져, 나가는 문
       안쪽에서 다른 층 복도를 걸을 때와 달리 화면이 아래로 기울어진 채
       움직이는 것처럼 보였다 — 다른 복도와 똑같이 수평(0)으로 되돌린다. */
    fpLookPitch=0;
  }
  /* 요청 반영(버그 수정 계속): 여기서도 계단참 도착 시 2구간(숨김 처리됨) 방향으로
     90도 돌려세우고 있었다 — 걷기 애니메이션에서 회전을 뺀 것과 별개로, 도착 후
     시선도 여기서 다시 옆으로 틀어버려서 뒤로가기가 계속 어긋났다. 이제는 문 쪽
     (+Z, zonefoot/zoneexit와 동일)을 그대로 바라보게 한다. */
  else if(nd.kind==='zoneland'||nd.kind==='zonestair'){
    fpFaceYaw=0;
    fpLookPitch=0;   // 요청 반영(버그 수정): zoneexit/zonefoot와 같은 이유로 시선을 수평으로 되돌린다
  }
  else if(nd.kind==='zonecorr'){
    /* 요청 반영: 계단참에서 90도 꺾인 통로 안쪽(문 쪽)을 바라본다 —
       dir(+1/-1)에 따라 복도가 +X 또는 -X로 뻗어 있으므로 그 방향을 그대로 yaw로 쓴다.
       요청 반영(카메라 정렬): 문 프레임 기둥이 기울어 보이지 않도록 상하 시선(pitch)을
       0으로 명시적으로 되돌린다. */
    var __P=fpB1ExitPts();
    fpFaceYaw=(__P.dir>0) ? Math.PI/2 : -Math.PI/2;
    fpLookPitch=0;
  }
  else if(nd.kind==='spot'){
    fpFaceYaw=null;
    /* 요청 반영(버그 수정): 나가는 문 안쪽(exit1/exit2)에서 잘게 걷는 이동은
       대부분 이 'spot' 자리로 도착하는데, 그 앞에 지나온 'zone' 자리에서
       걸어둔 -0.16 아래쪽 시선이 그대로 남아 있어 다른 층 복도를 걸을 때와
       달리 화면이 계속 아래로 기운 채 움직이는 것처럼 보였다 — 이 구간
       안쪽에서는 다른 복도와 똑같이 수평 시선으로 되돌린다. */
    if(fpFloorNow==='B1'){
      var __sq=fpRoomAt(nd.x, nd.z);
      if(__sq && (__sq.id==='exit1' || __sq.id==='exit2')) fpLookPitch=0;
    }
  }
  else if(nd.kind==='open'){
    fpFaceYaw=-Math.PI/2;                                  // 빈 공간 안쪽(-X)
    fpLookPitch=-0.16;                                     // 책상·의자가 눈높이보다 낮다
  }
  else if(nd.kind==='wc')
    /* 화장실은 통로 양옆에 마주 보고 있으므로 복도 쪽이 아니라 그 문을 돌아본다 */
    fpFaceYaw=(nd.faceYaw!==undefined) ? nd.faceYaw
            : ((nd.wcSex==='M') ? Math.PI : 0);
  else if(nd.kind==='door'||nd.kind==='es')
    fpFaceYaw=((nd.side>0)?Math.PI/2:-Math.PI/2) - 0.23;   // 명찰이 붙은 쪽으로 약 13도
  else if(nd.kind==='ev'||nd.kind==='st') fpFaceYaw=Math.PI/2;
  else if(nd.kind==='gate'||nd.kind==='hall') fpFaceYaw=Math.PI/2;
  else if(nd.kind==='corr'){
    /* 복도 한가운데에 서면 언제나 복도를 따라 바라본다.
       (예전엔 진행 방향 그대로 서서, 현관에서 나오면 건너편 안내판을 코앞에서 마주 봤다) */
    var far=(target && target.floor===fpFloorNow) ? targetPos().z*BUILDING_Z_STRETCH : null;
    if(far!==null && Math.abs(far-nd.z)>0.8){
      fpFaceYaw=(far>nd.z) ? 0 : Math.PI;           // 목적지가 있는 복도 쪽
    }else if((nd._lastDz||0) > (nd._lastDx||0)){
      fpFaceYaw=null;                                // 복도를 따라 왔으면 오던 방향 그대로
    }else{
      /* 옆에서 들어왔는데 목적지도 이 층에 없다 → 복도가 긴 쪽을 바라본다 */
      var midZ=((GLOBAL_TOP_Z+GLOBAL_BOT_Z)/2)*BUILDING_Z_STRETCH;
      fpFaceYaw=(nd.z<=midZ) ? 0 : Math.PI;
    }
  }
  else fpFaceYaw=null;
  if(nd.kind==='ev'){
    /* 자유탐색으로 걸어와 엘리베이터 앞에 서면, 타기 전에도 문이 지금 층의 제 자리에 보여야 한다 */
    var evNow=evXZ(fpFloorNow), evzWNow=evNow.z*BUILDING_Z_STRETCH, frontXNow=evNow.x-fpEvW(fpFloorNow)/2;
    fpCabPos={x:frontXNow-0.13+FP_CAB_D/2, z:evzWNow};
    fpSelShow('ev'); fpCap(ko?'몇 층으로 갈까요?':'Which floor?'); return;
  }
  if(nd.kind==='st'){
    /* 예전엔 1층에서 계단 지점에 도착하면 "후문·간판·타일벽이 한 화면에
       보이도록" 카메라를 계단실 문턱(x=0.65)이 아니라 fpMakeBackDoorBranch가
       쓰는 것과 같은 좌표의 후문 곁가지 서브 계단참(바닥보다 낮고 폭 1m뿐인
       좁은 통로) 안쪽으로 옮겨 세웠다. 그런데 그 자리가 실제로는 벽·구조물에
       너무 가깝게 붙어 있어서, 걸어서 도착했을 때 벽 속에 낑긴 것처럼 보이는
       문제가 있었다(요청 반영: 이 특수 이동을 없애고 다른 층과 똑같이 기본
       계단 앞 자리에 서게 한다). */
    /* 실사진 대비 후문이 작고 계단에 가려 보이는 문제 — 원인은 위치가 아니라
       거리다: 계단실이 깊어서(6.2m) 훨씬 가까운 계단이 화면 오른쪽을 크게
       채우는 동안, 문턱에서 6m 넘게 떨어진 후문은 상대적으로 작게 보인다.
       문·계단·벽은 실제 위치 그대로 두고, 1층 도착 시에만 시야각을 살짝
       좁혀(줌인) 후문 쪽 중심부를 더 크게, 계단 쪽 주변부 비중을 줄인다
       (요청 반영: "공간을 옮기지 말고 카메라 위치·시야각만 조정"). */
    fpZoom = (fpFloorNow===1) ? 1.15 : 1;
    fpSelShow('st'); fpCap(''); return;
  }
  /* 요청 반영(버그 수정 계속): 시간 기준(0.45초) 방어만으로는 부족했다 —
     이전에 다른 곳을 탭해서 걷기 시작한 경로가, 그 도중에 계단 근처를
     지나며 버튼이 자동으로 뜬 뒤에도 계속 걷고 있다가 원래 목적지(계단과
     무관한 지점)에 몇 초 뒤에나 도착해서, 그 "관련 없는 도착 처리"가
     뒤늦게 버튼을 지워버렸다 — 지금 실제로 계단(중앙·비상) 바로 근처에
     서 있다면, 도착 처리가 언제 끝나든 그 버튼을 함부로 닫지 않는다. */
  var __nearStair=false;
  if(fpFloorNow==='R' && fpNodes){
    for(var __i=0;__i<fpNodes.length;__i++){
      var __nd=fpNodes[__i];
      if(__nd.kind!=='st' && __nd.kind!=='es') continue;
      var __dx=__nd.x-fpPos.x, __dz=__nd.z-fpPos.z;
      if(__dx*__dx+__dz*__dz < 6.76){ __nearStair=true; break; }
    }
  }
  if(!fpSelJustShown() && !__nearStair) fpSelHide('fpArriveNode-other');
  var reached=false;
  if(nd.kind==='door'){
    reached=(target && target.kind==='room' && target.code===nd.code && target.floor===fpFloorNow);
    fpCap((reached?'\u2605 ':'')+roomTitle(nd.code)+(reached?(ko?' 도착!':' — arrived!'):''));
  }else if(nd.kind==='wc'){
    reached=(target && target.kind==='toilet' && target.floor===fpFloorNow);
    var wcNm = (nd.wcSex==='M') ? (ko?'남자화장실':'Men\u2019s restroom')
                                : (ko?'여자화장실':'Women\u2019s restroom');
    fpCap(wcNm+(reached?(ko?' 도착!':' — arrived!'):''));
  }else if(nd.kind==='es'){
    reached=(target && target.kind==='emstair' && target.floor===fpFloorNow);
    fpCap((ko?'비상계단 — 위·아래를 고르세요':'Emergency stairs — up or down')
          +(reached?(ko?' \u00b7 도착!':' \u00b7 arrived!'):''));
    fpSelShow('es');
  }else if(nd.kind==='zone'||nd.kind==='zoneroom'){
    reached=(target && target.kind==='zone' && target.floor==='B1');
    fpCap((ko?'크리에이티브 존':'Creative Zone')+(reached?(ko?' 도착!':' — arrived!'):''));
    /* 존 안에 들어오면 바닥 빨간 유도선은 끈다. 단, fpRouteFloor(false)는
       그 유도선을 끄는 동시에 건물 전체보기용 굵은 빨간 경로관(routeA)을
       다시 켜 버리는 부작용이 있다(fpStartFree에서도 같은 이유로 호출
       직후 routeA를 따로 숨긴다) — 여기서도 똑같이 뒤따라 꺼서, 자유 탐색
       중 존을 나와 엘리베이터 쪽으로 걸어갈 때 그 큰 빨간 관이 허공에
       떠 보이던 문제를 없앤다(요청 반영). */
    if(reached){
      fpRouteFloor(false);
      if(typeof routeA!=='undefined' && routeA) routeA.visible=false;
    }
  }else if(nd.kind==='zonefoot'){
    /* 요청 반영: 이 구간만 화각(zoom)·눈높이를 따로 좁혀둬서, 다른 층을 걸을 때와
       달리 이 안에서는 걸을 때마다 화면이 좁아졌다 넓어졌다 하며 어색하게
       느껴졌다 — 다른 층과 똑같이 기본값(zoom 1, 눈높이 보정 0)을 쓰도록 되돌린다. */
    fpZoom = 1;
    fpEyeOffset = 0;
    fpCap('');   // 요청 반영: 이 지점의 설명 문구를 지운다
  }else if(nd.kind==='zoneland'){
    fpZoom = 1;   // 요청 반영: 다른 층과 같은 기본 화각으로 통일(기존 0.85 → 1)
    fpCap('');   // 요청 반영: 이 지점의 설명 문구도 지운다
  }else if(nd.kind==='zonecorr'){
    fpZoom = 1;   // 요청 반영: 다른 층과 같은 기본 화각으로 통일(기존 58/60 → 1)
    fpCap('');
  }else fpCap('');
  /* 지점 종류가 안 맞아도, 목적지 문 바로 앞(2.4m 이내)에 서 있으면 도착이다.
     예전에는 문 코앞까지 가고도 지점이 달라 도착으로 안 잊혀졌다. */
  if(!reached && target && target.floor===fpFloorNow){
    var tp=fpTargetXZ();
    if(tp && tp.door){
      var dd=Math.sqrt(Math.pow(tp.x-nd.x,2)+Math.pow(tp.z-nd.z,2));
      if(dd < 2.4){
        reached=true;
        fpFaceYaw=((tp.x>0)?Math.PI/2:-Math.PI/2);
        fpCap('\u2605 '+targetLabel()+(ko?' 도착!':' — arrived!'));
      }
    }
  }
  /* 목적지 문 앞에 서면 자동재생과 똑같이 '도착'으로 기록해서,
     탐색을 끝냈을 때 버튼이 '다시 보기'가 되고 도착 화면으로 이어질 수 있게 한다. */
  if(reached){ personAnim.done=true; syncTripBtn(); }
}
/* ── 층 선택 패널(엘리베이터 / 계단) ── */
var fpSelShownAt=0;
function fpSelShow(kind){
  var el=document.getElementById('fpSel'); if(!el) return;
  fpSelShownAt = (typeof performance!=='undefined') ? performance.now() : Date.now();
  var ko=(LANG==='ko'), html='';
  if(kind==='ev'){
    for(var i=LEVELS.length-1;i>=0;i--){
      var lv=LEVELS[i];
      if(lv==='R') continue;              // 옥상은 엘리베이터가 안 선다(계단으로만)
      html += '<button'+(lv===fpFloorNow?' class="now"':'')
           +' onclick="fpEvRide('+(typeof lv==='string'?"'"+lv+"'":lv)+')">'+lvLabel(lv)+'</button>';
    }
  }else if(kind==='es'){
    /* 비상계단 : 지하만 빼고 오르내린다(옥상까지 이어져 있다) */
    var upE=LEVELS[lvIndex(fpFloorNow)+1];
    var dnE=(fpFloorNow!==1) ? LEVELS[lvIndex(fpFloorNow)-1] : null;
    if(upE)                html += '<button onclick="fpEmGo(1)">\u2191 '+lvLabel(upE)+'</button>';
    if(dnE && dnE!=='B1') html += '<button onclick="fpEmGo(-1)">\u2193 '+lvLabel(dnE)+'</button>';
  }else{
    var up=LEVELS[lvIndex(fpFloorNow)+1], dn=LEVELS[lvIndex(fpFloorNow)-1];
    /* 요청 반영(최종): 지하로 내려가는 옵션은 이 패널에서 뺀다 — B1으로
       내려가는 버튼은 후문 로비(도착 지점)에 서 있을 때만 별도로 뜬다. */
    if(fpFloorNow===1) dn=null;
    /* 요청 반영: 옥상(R)에서는 위로 갈 곳이 없고, 내려가기도 일반
       fpStairGo가 아니라 올라온 길을 그대로 되짚는 fpRoofChoice를 쓴다
       (계단참에서 자연스럽게 돌아서는 연출까지 포함되어 있다). */
    if(fpFloorNow==='R'){
      /* 요청 반영(삭제): '밖으로 나가기' 버튼은 없앤다 — 철문(또는 문 앞
         바닥)을 눌러 걸어 나가는 방식만 남긴다(fpBuildNodes의 roofout/roofin
         이동 지점이 그 역할을 한다). fpRoofGoOut() 함수 자체는 남겨 둔다. */
      html += '<button onclick="fpStairGo(-1)">\u2193 '+lvLabel(dn)+'</button>';
    }else{
      if(up) html += '<button onclick="fpStairGo(1)">\u2191 '+lvLabel(up)+'</button>';
      if(dn) html += '<button onclick="fpStairGo(-1)">\u2193 '+lvLabel(dn)+'</button>';
    }
  }
  html += '<button class="x" onclick="fpSelHideBtn()">\u2715</button>';
  el.innerHTML=html; el.classList.add('on');
}
/* 옥상 철문 밖(데크)으로 걸어 나간다 — 문 안쪽/바깥쪽 이동 지점을 잇는
   경로라 실제로 문을 통과한다. 다시 들어올 때는 옥탑방 안쪽을 누르면
   같은 방식으로 문을 지나 돌아온다(fpBuildNodes의 roofin 지점). */
function fpRoofGoOut(){
  if(fpSelJustShown()) return;
  fpSelHide('fpRoofGoOut');
  var nd=null;
  for(var i=0;i<fpNodes.length;i++){ if(fpNodes[i].kind==='roofout'){ nd=fpNodes[i]; break; } }
  if(nd) fpGoTo(nd);
}
function fpSelHide(reason){
  var el=document.getElementById('fpSel');
  if(el){ el.classList.remove('on'); el.innerHTML=''; }
  if(typeof fpHideRoofAsk==='function') fpHideRoofAsk();
}
/* 요청 반영(버그 수정 후보): 계단 근처에 다가가 버튼이 뜨는 그 순간, 걷기용
   탭이 화면 고정 위치(하단 중앙)에 막 나타난 이 버튼과 같은 자리에 겹쳐서,
   "걸으려던 탭"이 그대로 이 버튼을 눌러버리는 것처럼 보였다(버튼이 뜨자마자
   바로 사라지는 것처럼 느껴진 원인으로 추정) — 버튼이 뜬 직후 아주 짧은
   시간(0.45초) 동안은 이 선택지 버튼들의 탭을 무시해서, 걷기 탭이 실수로
   버튼을 누르지 않게 한다. */
function fpSelJustShown(){
  var now=(typeof performance!=='undefined') ? performance.now() : Date.now();
  return (now - fpSelShownAt) < 450;
}
function fpSelHideBtn(){
  if(fpSelJustShown()) return;
  fpSelHide('closeBtn-X');
}
function fpEvRide(lv2){
  if(fpSelJustShown()) return;
  if(fpBusy || lv2===fpFloorNow){ fpSelHide('fpEvRide-reject'); return; }
  fpBusy=true; fpSelHide('fpEvRide-start'); fpPath=null; fpFaceYaw=null;
  var ko=(LANG==='ko'), lvFrom=fpFloorNow;
  var ev=evXZ(lvFrom), evzW=ev.z*BUILDING_Z_STRETCH;
  var frontX=ev.x-fpEvW(lvFrom)/2, lobbyX=frontX-1.5, standX=frontX+FP_STAND;
  fpCabPos={x:frontX-0.13+FP_CAB_D/2, z:evzW};
  fpBuildCorr([lvFrom, lv2]);          // 두 층 복도를 함께 세워 두고 이동한다
  fpClearNodeG();
  fpSetCabButtons(lvLabel(lv2));       // 가려는 층 버튼에 빨간불
  fpEvDir = (lvIndex(lv2) > lvIndex(lvFrom)) ? 1 : -1;
  fpSetHallInd(lvLabel(lvFrom), fpEvDir);
  fpRunSeq([
    {dur:1.0, door:1, yaw:Math.PI/2, panel:lvLabel(lvFrom),
     label: ko?'엘리베이터 문이 열립니다':'Doors opening'},
    {to:{x:standX, z:evzW}, label: ko?'엘리베이터 탑승':'Stepping in'},
    {dur:1.3, door:0, yaw:-Math.PI/2, label: ko?'문이 닫힙니다':'Doors closing'},
    {dur:1.2+Math.abs(lvIndex(lv2)-lvIndex(lvFrom))*0.7, y:fpSlabY(lv2), hide:true,
     label: ko?(lvName(lv2)+'으로 이동 중'):('Going to '+lvName(lv2))},
    {dur:1.0, door:1, panel:lvLabel(lv2),
     label: ko?(lvName(lv2)+' 도착 · 문이 열립니다'):(lvName(lv2)+' · doors opening')},
    {to:{x:lobbyX, z:evzW}, label: ko?'엘리베이터에서 내립니다':'Stepping out'},
    /* 내린 뒤에는 문이 닫혔야 한다.
       예전엔 열린 채로 남아서, 다른 층으로 갔다 와도 계속 벌어져 있었다. */
    {dur:1.2, door:0, label: ko?'문이 닫힙니다':'Doors closing'}
  ], function(){
    fpSetFloor(lv2);
    fpSetCabButtons(null);             // 내렸으니 불을 끔다
    fpEvDir=0; fpSetHallInd(lvLabel(lv2), 0);
    fpBusy=false; fpFaceYaw=-Math.PI/2; fpCap('');
  });
}
/* ── 계단으로 한 층 이동 ── */
function fpStairGo(dir){
  if(fpSelJustShown()) return;
  var lv2=LEVELS[lvIndex(fpFloorNow)+dir];
  if(fpBusy || !lv2){ fpSelHide('fpStairGo-reject'); return; }
  fpBusy=true; fpSelHide('fpStairGo-start'); fpPath=null; fpFaceYaw=null;
  var ko=(LANG==='ko'), lvFrom=fpFloorNow, ST=BUILDING_Z_STRETCH;
  var stZ=stZOf(lvFrom)*ST;
  /* 1층 계단 지점에 도착하면 fpArriveNode가 "후문·간판·타일벽이 한 화면에
     보이도록" 카메라를 계단 본체에서 두 칸 내려간 후문 곁가지 통로 안쪽
     (바닥보다 낮고, 폭 1m짜리 좁은 통로 안)으로 스냅해 둔다. 그 상태 그대로
     아래 걷기 연출(첫 스텝이 xIn/stZ로 직선 이동)을 시작하면, 통로 옆벽과
     계단실 벽을 비스듬히 뚫고 지나가며 화면 가득 벽면이 스치는 "벽에 끼임"
     현상이 났다 — 연출을 시작하기 전에 카메라를 원래 계단 문턱 자리로
     먼저 되돌려 놓는다(위/아래 선택창을 띄우기 전 좌표와 동일). */
  if(lvFrom===1){
    fpPos.x=0.65; fpPos.y=fpSlabY(1); fpPos.z=stZ;
  }
  fpBuildCorr([lvFrom, lv2]);
  fpClearNodeG();
  /* 실제 계단처럼 지그재그로 오르내린다 : 개구부 → 한쪽 단으로 반 층 →
     중간 계단참에서 반 바퀴 → 반대쪽 단으로 나머지 반 층 → 복도.
     예전에는 가운데 칸막이 벽을 뚚고 지나가며 수직으로 솔아올라
     엘리베이터처럼 보였다. */
  var yA=fpSlabY(lvFrom), yZ=fpSlabY(lv2), yMid=(yA+yZ)/2;
  /* 계단참 회전 반경 완화 : 옆단은 벽에서 조금 더 떨어져 걷고(턴 시 벽에 바짝
     붙지 않게), 계단참 꼭대기(xTop)는 이번에 넓힌 계단참 안쪽으로 더 들어가
     돌 자리를 넉넉히 확보한다.
     1층과 맞닿는 구간(1F→2F 또는 1F→B1)은 실제 계단 지오메트리가 1.4배
     넓게 그려지므로(fpMakeStairwell의 owAuto), 걷는 경로의 좌우 오프셋도
     같은 배율을 써야 한다 — 안 그러면 몸이 이제 훨씬 굵어진 반대쪽 단
     옆구리에 바짝 붙어 걷게 되어 화면이 계단 옆면으로 꽉 막혀 보인다. */
  var stOwWalk = (lvFrom===1 || lv2===1) ? FP_ST_OW*1.4 : FP_ST_OW;
  /* 요청 반영(구조 정정에 맞춤): 중앙계단의 올라가는 단이 다시 +Z열로
     돌아갔다(fpMakeStairwell의 _colFlip 참고) — 걷는 자리도 부호를 함께 되돌린다. */
  var zSide = stZ + dir*(stOwWalk/4-0.06);   // 올라갈 때는 +Z 단, 내려갈 때는 -Z 단
  var zBack = stZ - dir*(stOwWalk/4-0.06);   // 계단참에서 돌아 타는 반대쪽 단
  /* 요청 반영(버그 수정): B1↔1F 구간은 지그재그 두 도막이 아니라 실제로는
     +Z쪽 한 도막(zUp)짜리 단일 직선 계단이다. 그런데 위 zSide는 dir 부호에
     따라 오르내림마다 반대쪽(-Z)으로 뒤집혀서, 내려갈 때(dir<0)는 실제
     계단이 없는 반대쪽 자리를 걷는 것처럼 계산돼 왔다 — 그래서 1F→B1
     시작 위치/방향이 실제 계단 입구와 어긋나고, B1→1F 시작점과도 서로
     달라졌다. 이 구간만은 dir과 무관하게 항상 같은 +Z쪽 고정 좌표를 쓴다. */
  var zFlight = stZ + (stOwWalk/4-0.06);
  var xIn   = FP_WALL_X + 0.50;
  var xFoot = FP_WALL_X + FP_ST_LAND + 0.12;
  /* B1↔1F 직선 계단은 길이가 다르므로(FP_B1F_RUN_LEN) 꼭대기 좌표도 따로 잡는다 */
  var straightB1Fpre = ((lvFrom===1 && lv2==='B1') || (lvFrom==='B1' && lv2===1));
  var xTop  = FP_WALL_X + FP_ST_LAND
            + (straightB1Fpre ? FP_B1F_RUN_LEN : FP_ST_N*FP_ST_RUN) + 0.58;
  var up = (dir>0);
  /* B1↔1F 구간은 실제 사진(계단참 U턴 없이 한 방향으로 쭉 이어지다가 1층 후문
     로비로 바로 이어지는 단일 직선 계단)과 다르게, 지금까지는 다른 층들과 똑같은
     "반 층 오름 → 계단참에서 180도 돌아 반대편 단으로 건너감 → 나머지 반 층"
     지그재그로 걸었다. fpMakeStairwell 쪽도 이제 이 구간만 단 높이(rise)를
     두 배로 잡아 한 도막(N단)으로 전체 한 층을 오르는 실제 구조로 바꿨으므로,
     걷기도 중간에 멈추지 않고 한 번에 쭉 오른다 — B1→1F 방향은 계단을 다 오른
     그 자리에서 곧장 후문 로비(fpMake1FStairHall, 유리문·SW간판 공간)로
     걸어 들어가 멈춘다(요청 반영: 창문 있는 중간 계단참에 서지 않는다). */
  var straightB1F = ((lvFrom===1 && lv2==='B1') || (lvFrom==='B1' && lv2===1));
  var arriveInHall = straightB1F;   // B1↔1F 방향 모두 각자의 로비/복도로 바로 들어간다(옆걸음 없이)
  var steps=[];
  /* 요청 반영: 1F→B1 방향은 "지하로" 버튼이 뜨는 그 자리(후문 로비, 이미
     계단 꼭대기 바로 앞)에서 바로 시작한다 — 다른 방향들처럼 계단실 입구
     (xIn)까지 되돌아갔다가 다시 오는 불필요한 왕복 없이, 곧장 계단 위쪽
     끝(xTop)으로 걸어가서 그대로 그 계단을 타고 내려간다. */
  if(straightB1F && !up){
    /* 요청 반영: "내려가는 계단 앞"(가운데서 멈춰 서는 중간 단계) 없이,
       버튼을 누르자마자 곧장 계단을 내려가기 시작한다 — 시작 위치를
       계단 맨 위(xTop, zFlight)로 미리 옮겨 두고, 실제로 내려가는
       연출 한 칸만 재생한다. */
    fpPos.x = xTop; fpPos.z = zFlight; fpYaw = -Math.PI/2;
    steps.push(
      /* 요청 반영: 이 구간은 단 하나 높이(rise)가 평소의 2배라, 걷기 연출도
         평소 N수(FP_ST_N)가 아니라 늘린 단 수(FP_ST_N_UP)로 잘게 밟아야
         한 칸마다 출렁이는 폭이 줄어든다. dur은 전체 소요 시간이 늘어나지
         않도록 한 칸당 시간을 그만큼 줄여 총합을 그대로 맞춘다.
         bobScale도 절반으로 줄여 장식용 출렁임까지 겹쳐 커지지 않게 한다. */
      {to:{x:xFoot, z:zFlight}, y:yZ, ease:'lin', stairs:FP_ST_N_UP, slook:-1,
       dur:FP_ST_N*0.30, bobScale:0.5,
       label: ko?'지하 1층으로 내려갑니다':'Down to B1'}
    );
    fpRunSeq(steps, function(){
      fpSetFloor(lv2);
      fpBusy=false; fpFaceYaw=null; fpCap('');
    });
    return;
  }
  /* v109: 옥상 도막(계단참↔옥상 바닥)은 10단·첫 단이 FP_R_XSHIFT만큼 안쪽 — 그 도막을 걷는 구간만
     발 위치(xFootR)·단 수(FP_ST_N_R)를 바꿔 실제 단 위를 밟게 한다. */
  var roofLeg = (lv2==='R' || lvFrom==='R');
  var xFootR = xFoot + FP_R_XSHIFT;
  var xFootFrom = (lvFrom==='R') ? xFootR : xFoot;      // 첫 도막(출발 층 쪽)
  var xFootTo   = (lv2==='R')    ? xFootR : xFoot;      // 둘째 도막(도착 층 쪽)
  var nFrom = (lvFrom==='R') ? FP_ST_N_R : FP_ST_N, nTo = (lv2==='R') ? FP_ST_N_R : FP_ST_N;
  var stB1Start = (straightB1F && !up) ? xTop : xFootFrom;
  var stB1End   = (straightB1F && !up) ? xFoot : xTop;
  var zStep = straightB1F ? zFlight : zSide;   // 요청 반영: 직선 계단 구간은 dir 부호와 무관하게 항상 같은 자리
  steps.push(
    {to:{x:xIn, z:stZ}, yaw:Math.PI/2,
     label: ko?'계단실로 들어갑니다':'Into the stairwell'},
    {to:{x:stB1Start, z:zStep},
     label: ko?(up?'올라가는 계단 앞':'내려가는 계단 앞')
              :(up?'At the up flight':'At the down flight')},
    {dur:0.32, label:''}
  );
  if(straightB1F){
    /* 계단참에서 멈추거나 꺾지 않고, 한 번에 전체 한 층 높이를 쭉 걸어 오른다.
       (단 하나 높이가 평소의 2배인 구간이므로, 위의 1F→B1 분기와 마찬가지로
       걷기 연출은 늘린 단 수(FP_ST_N_UP)와 절반 bobScale을 쓴다.) */
    steps.push(
      {to:{x:stB1End, z:zStep}, y:yZ, ease:'lin', stairs:FP_ST_N_UP, slook:(up?1:-1),
       dur:FP_ST_N*0.30, bobScale:0.5,
       label: ko?(lvName(lv2)+'으로 '+(up?'올라갑니다':'내려갑니다'))
                :((up?'Up to ':'Down to ')+lvName(lv2))}
    );
  }else{
    steps.push(
      {to:{x:xTop, z:zSide}, y:yMid, ease:'lin', stairs:nFrom, slook:(up?1:-1),
       dur:nFrom*0.28,
       label: ko?(up?'계단을 오릅니다':'계단을 내려갑니다')
                :(up?'Going up':'Going down')},
      /* 계단참에서: 제자리 90도 회전 → 계단참을 가로질러 한 걸음 → 다시 90도 회전.
         (계단이 가운데 벽을 사이에 두고 두 도막으로 나뉘어 있으므로, 그 사이 계단참을
         실제로 가로질러 건너가는 동작으로 표현한다 — 전에는 여기서 한 번에 대각선으로
         가로질러 계단 두 도막을 관통하는 것처럼 보였다.) */
      {dur:0.5, yaw:(up?Math.PI:0),
       label: ko?'계단참에서 돌아섭니다':'Turning at the landing'},
      {to:{x:xTop, z:zBack},
       label: ko?'계단참을 가로지릅니다':'Crossing the landing'},
      {dur:0.4, yaw:-Math.PI/2, label:''},
      {to:{x:xFootTo, z:zBack}, y:yZ, ease:'lin', stairs:nTo, slook:(up?1:-1),
       dur:nTo*0.28,
       label: ko?(lvName(lv2)+'으로 '+(up?'올라갑니다':'내려갑니다'))
                :((up?'Up to ':'Down to ')+lvName(lv2))},
      {dur:0.35, yaw:-Math.PI/2, label:''}
    );
  }
  if(arriveInHall){
    if(up){
      /* 계단 꼭대기(xTop)는 이미 후문 로비 바닥(fpMake1FStairHall의 landFl,
         x0+LAND~x0+WD) 안쪽이다 — 문 쪽으로 조금 더 걸어 들어가 로비 한복판에
         멈춘다(문에 바짝 붙지 않도록 살짝 여유를 둔다). */
      var hallX = FP_WALL_X + FP_ST_WD_B1F - 0.6;
      steps.push({to:{x:hallX, z:stZ},
        label: ko?'1층 후문 로비로 들어갑니다':'Into the 1F back-door hall'});
    }
    /* 요청 반영: 반대 방향(1F→B1)은 엉뚱하게 옆(x=0.65)으로 이동하는 스텝을
       타지 않는다 — 계단을 다 내려온 그 자리(xTop, zSide)가 이미 B1 계단실
       바닥이므로, 추가 옆걸음 없이 그대로 멈춘다. */
    fpRunSeq(steps, function(){
      fpSetFloor(lv2);
      fpBusy=false; fpFaceYaw = up ? Math.PI/2 : null; fpCap('');
    });
    return;
  }
  /* 옥상에 도착하면 문 앞까지 더 걸어 들어가지 않고, 계단을 다 오른 그 자리
     ("계단 앞")에서 곧장 멈춰 내려가기 패널을 띄운다 — 문 쪽으로는 걷지 않으므로
     옥상 밖(철문 바깥 데크)으로 나가는 동선 자체가 없다.
     요청 반영: 멈추는 자리를 계단 가장자리(+0.2)보다 더 뒤로(+0.6, 노란
     점자블록이 있는 자리 쪽으로) 물린다 — 이 if(lv2==='R') 분기는 옥상으로
     갈 때만 타므로 다른 층 이동에는 영향이 없다. */
  /* 요청 반영(단순화): 옥상 도착 동작을 다른 층과 똑같이 단순하게 만든다 —
     계단을 다 오른 그 자리에서 곧장 멈춘다. 예전에는 여기서 문 쪽으로
     두 걸음 더 걸어가는(+0.6, 그다음 점자블록 자리까지 대각선으로) 연출을
     추가했는데, 그 대각선 걸음이 여러 번의 회전 뒤에 이어지면서 다른 층
     도착보다 유난히 방향 전환이 많고 어색하게 느껴졌다("애니메이션이
     이상하다") — 다른 층(예: 4층→5층)처럼 계단을 다 오른 자리에서 바로
     멈추도록 되돌린다. */
  if(lv2==='R'){
    fpRunSeq(steps, function(){
      fpBusy=false;
      fpArriveRoof({from:lvFrom, stZ:stZ, xIn:xIn, xFoot:xFootR, xFootLo:xFoot, xTop:xTop,   // v109: xFoot=옥상 도막 발치(안쪽), xFootLo=5층 도막 발치
        zSide:zSide, zBack:zBack, yA:yA, yMid:yMid, yZ:yZ, up:up});
    });
    return;
  }
  steps.push(
    {dur:0.35, rdoor:0, yaw:-Math.PI/2, label:''},
    {to:{x:0.65, z:stZ}, yaw:-Math.PI/2,
     label: ko?(lvName(lv2)+' 복도'):(lvName(lv2)+' corridor')}
  );
  fpRunSeq(steps, function(){
    fpSetFloor(lv2);
    fpBusy=false; fpFaceYaw=-Math.PI/2; fpCap('');
  });
}
/* 계단을 다 오른 그 자리("계단 앞")에 도착하면, 이제 문 쪽으로는 더 걷지 않으므로
   그 자리에서 제자리로 뒤돌아 서게 해서 위쪽 복층(창고)이 자연스럽게 눈에 들어오게 한다.
   이후 다시 내려가려면 #fpSel 패널(엘리베이터·비상계단과 같은 스타일)의 버튼 하나만 누르면 된다. */
/* 요청 반영(재설계): 계단으로 올라온 순간에는 버튼을 띄우지 않는다 —
   위치·시선만 맞추고 되짚기 상태(fpRoofState)만 기록해 둔다. 버튼은
   철문을 나갔다가 다시 들어올 때만 뜨고(fpCheckRoofDoorReturn), 이때는
   다른 층 선택 패널처럼 X를 눌러야만 다시 움직일 수 있다 — 옥상만 유독
   내려가기 버튼이 뜨는 타이밍이 헷갈린다는 지적을 반영해, "문 안으로
   돌아왔다"는 명확한 사건 하나로만 뜨게 단순화했다. */
/* 요청 반영(최종 단순화): 옥상만 따로 "문 나갔다 들어옴" 감지를 만들었더니
   계속 인식이 어긋났다 — 다른 층 계단과 완전히 같은 표준 근접감지
   (fpCheckStairProximity)로 통일한다. 도착 시엔 위치·시선만 맞추고,
   근접감지를 한 번 무장 해제(disarm)해서 도착 직후엔 안 뜨게만 해둔다.
   이후엔 표준 시스템 그대로: 멀어졌다(문 밖으로 나가 2.65m 이상) 다시
   가까워지면(1.5m 이내) 자동으로 멈추고 버튼이 뜬다 — 1층 등과 완전히
   동일한 동작이라 더 이상 별도로 헷갈릴 일이 없다. */
var fpRoofState=null;
function fpArriveRoof(state){
  fpRoofState=state;
  fpSetFloor('R');            // 계단 앞에 선 순간부터 옥상(R)층으로 취급한다(밖으로 나가는 단계 없이)
  fpFaceYaw = Math.atan2(FP_ROOF_DOOR_X-fpPos.x, state.stZ-fpPos.z);
  fpRoofEyeLift = 0;
  fpLookPitch = 0.0;
  fpCap((LANG==='ko')?'계단 앞':'At the stairs');
  fpNearStairArmed = false;   // 도착 직후엔 뜨지 않는다 — 멀어졌다 오면 다시 뜬다
}
function fpRoofChoice(goOut){
  if(fpSelJustShown()) return;
  var st=fpRoofState; if(!st){ fpSelHide('fpRoofChoice-noState'); return; }
  fpSelHide('fpRoofChoice-start');
  var ko=(LANG==='ko');
  fpBusy=true; fpPath=null; fpFaceYaw=null;
  /* 다시 내려가기 : 문을 열지 않은 채로 계단을 되짚어 내려간다(올라온 길을 그대로 되감기)
     요청 반영(버그 수정): 아래 순서가 올라올 때(fpStairGo, lv2==='R' 분기)의
     정확한 역순이 아니었다 — 첫 번째 내려가는 도막에서 z좌표를 st.zBack이
     아니라 st.zSide로 잘못 써서, 계단참에서 따로 가로질러야 할 거리를
     첫 번째 도막을 걷는 도중에 한꺼번에 대각선으로 가로질러 버렸다(계단
     칸막이 벽을 비스듬히 뚫고 지나가는 것처럼 보이는 원인). 계단참을
     가로지르는 건 별도의 "가로지르기" 스텝으로 분리하고, 회전(yaw) 값도
     실제 이동 방향에 맞게 전부 다시 계산했다(올라올 때와 정확히 반대).
     요청 반영(추가 개선): 맨 첫 번째 회전(도착 시 문 쪽을 보던 방향 →
     계단 방향)은 상황에 따라 180도 가까이 돌아야 할 수도 있는데, 실제
     회전 속도(FP_TURN, 초당 최대 약 137도)로는 0.4초 안에 다 못 돈다 —
     이 스텝의 타이머가 먼저 끝나 버리면 몸이 채 다 돌기도 전에 다음
     스텝(계단 내려가기)이 시작돼 이상하게 보였다. 넉넉히(1.3초) 늘려
     항상 다 돌고 나서 다음 단계로 넘어가게 한다. */
  fpRunSeq([
    {dur:1.6, yaw:Math.PI/2, label:''},
    {to:{x:st.xTop, z:st.zBack}, y:st.yMid, ease:'lin', stairs:FP_ST_N_R, slook:-1, dur:FP_ST_N_R*0.28,   // v109: 옥상 도막 10단
     label: ko?'다시 계단을 내려갑니다':'Heading back down'},
    {dur:0.5, yaw:0, label: ko?'중간 계단참에서 돌아서':'Turning at the landing'},
    {to:{x:st.xTop, z:st.zSide}, label: ko?'계단참을 가로지릅니다':'Crossing the landing'},
    {dur:0.4, yaw:-Math.PI/2, label:''},
    {to:{x:(st.xFootLo!==undefined?st.xFootLo:st.xFoot), z:st.zSide}, y:st.yA, ease:'lin', stairs:FP_ST_N, slook:-1, dur:FP_ST_N*0.28,   // v109: 5층 도막은 원래 발치
     label: ko?(lvName(st.from)+'으로 내려갑니다'):('Down to '+lvName(st.from))},
    {dur:0.32, label:''},
    {to:{x:st.xIn, z:st.stZ}, yaw:-Math.PI/2, label:''},
    {to:{x:0.65, z:st.stZ}, yaw:-Math.PI/2,
     label: ko?(lvName(st.from)+' 복도'):(lvName(st.from)+' corridor')}
  ], function(){
    fpRoofState=null;
    fpSetFloor(st.from);
    fpBusy=false; fpFaceYaw=-Math.PI/2; fpCap('');
  });
}
/* ── 비상계단으로 한 층 이동(지하 제외, 옥상까지 가능) : 중앙계단과 같은 지그재그로 오르내린다 ── */
function fpEmGo(dir){
  if(fpSelJustShown()) return;
  var lv2=LEVELS[lvIndex(fpFloorNow)+dir];
  if(fpBusy || !lv2 || lv2==='B1'){ fpSelHide('fpEmGo-reject1'); return; }
  var esP=EMSTAIR_POS[fpFloorNow];
  if(!esP || !EMSTAIR_POS[lv2]){ fpSelHide('fpEmGo-reject2'); return; }
  fpBusy=true; fpSelHide('fpEmGo-start'); fpPath=null; fpFaceYaw=null;
  var ko=(LANG==='ko'), lvFrom=fpFloorNow, ST=BUILDING_Z_STRETCH;
  var stZ=esP.z*ST;
  fpBuildCorr([lvFrom, lv2]);
  fpClearNodeG();
  var yA=fpSlabY(lvFrom), yZ=fpSlabY(lv2), yMid=(yA+yZ)/2;
  /* 중앙계단과 동일하게 회전 반경을 넓힌다(요청: 비상계단도 애니메이션 동일하게) */
  var zSide = stZ + dir*(FP_EM_OW/4-0.06);
  var zBack = stZ - dir*(FP_EM_OW/4-0.06);
  var xIn   = FP_WALL_X + 0.50;
  var xFoot = FP_WALL_X + FP_ST_LAND + 0.12;
  var xTop  = FP_WALL_X + FP_ST_LAND + FP_ST_N*FP_ST_RUN + 0.58;
  var up = (dir>0);
  fpRunSeq([
    {to:{x:xIn, z:stZ}, yaw:Math.PI/2,
     label: ko?'비상계단으로 들어갑니다':'Into the emergency stairs'},
    {to:{x:xFoot, z:zSide},
     label: ko?(up?'올라가는 계단 앞':'내려가는 계단 앞')
              :(up?'At the up flight':'At the down flight')},
    {dur:0.32, label:''},
    {to:{x:xTop, z:zSide}, y:yMid, ease:'lin', stairs:FP_ST_N, slook:(up?1:-1),
     dur:FP_ST_N*0.28,
     label: ko?(up?'비상계단을 오릅니다':'비상계단을 내려갑니다')
              :(up?'Going up':'Going down')},
    /* 중앙계단과 같은 방식(제자리 회전 → 계단참 가로지르기 → 다시 회전)으로 수정
       (주석은 fpStairGo 참고) */
    {dur:0.5, yaw:(up?Math.PI:0),
     label: ko?'계단참에서 돌아섭니다':'Turning at the landing'},
    {to:{x:xTop, z:zBack},
     label: ko?'계단참을 가로지릅니다':'Crossing the landing'},
    {dur:0.4, yaw:-Math.PI/2, label:''},
    {to:{x:xFoot, z:zBack}, y:yZ, ease:'lin', stairs:FP_ST_N, slook:(up?1:-1),
     dur:FP_ST_N*0.28,
     label: ko?(lvName(lv2)+'으로 '+(up?'올라갑니다':'내려갑니다'))
              :((up?'Up to ':'Down to ')+lvName(lv2))},
    {dur:0.55, yaw:-Math.PI/2, label:''},
    {to:(lv2==='R' ? fpRoofEsSpot() : {x:0.65, z:stZ}), yaw:-Math.PI/2,
     label: ko?(lvName(lv2)+(lv2==='R'?'':' 복도')):(lvName(lv2)+(lv2==='R'?'':' corridor'))}
  ], function(){
    fpSetFloor(lv2);
    fpBusy=false; fpFaceYaw=-Math.PI/2; fpCap('');
    /* 옥상에 비상계단으로 도착하면 정확히 그 표시 위에 서게 되어 바닥을 눌러도
       '제자리라 이동 없음'으로 무시된다 → 도착하자마자 바로 위/아래 선택 패널을 띄운다. */
    if(lv2==='R' && typeof fpSelShow==='function') fpSelShow('es');
  });
}
/* ── 매 프레임 : 걸어가기 · 바라보기 · 안내 표시 ── */
function fpFreeTick(dt){
  /* 정지(fpPaused) 중에는 걷는 중이어도 그 자리에서 얼어붙는다 —
     계단 오르내리는 도중이 아니라 평범하게 걷다가도 멈추고 사진 찍을 수 있게.
     단, 시선(fpLookYaw/Pitch)은 계속 반영해야 화면을 드래그해서 둘러볼 수 있다.
     ※ 예전엔 여기서 fpCommit(fpYaw+fpLookYaw, ...)로 불러서, fpCommit 안에서
     "그 값 그대로 fpYaw에 즉시 대입"되는 바람에 매 프레임 fpLookYaw가 fpYaw에
     누적되어(2배, 3배…) 결국 드래그해도 화면이 안 움직이는 것처럼 보였다.
     fpYaw는 그대로 두고 그냥 fpYaw만 넘겨서, fpCommit 내부에서 fpLookYaw를
     한 번만 더해 카메라 각도를 계산하게 한다. */
  if(fpPaused){ fpCommit(fpYaw, 0, 0); return; }
  var want=fpYaw, bob=0;
  if(fpPath){
    fpPath.t += dt;
    var k=(fpPath.dur>0) ? Math.min(1, fpPath.t/fpPath.dur) : 1;
    var p=fpPathAt(easeIO(k)*fpPath.total);
    fpBob += Math.abs(p.x-fpPos.x)+Math.abs(p.z-fpPos.z);
    fpPos.x=p.x; fpPos.z=p.z;
    if(Math.abs(p.dx)+Math.abs(p.dz)>0.03) want=Math.atan2(p.dx, p.dz);
    bob=Math.sin(fpBob*1.9)*0.045;
    if(k>=1){
      var nd=fpPath.node;
      nd._lastDx=Math.abs(nd.x-fpPath.sx); nd._lastDz=Math.abs(nd.z-fpPath.sz);
      fpPath=null; fpArriveNode(nd);
    }
  }else if(fpFaceYaw!==null){ want=fpFaceYaw; }
  /* 요청 반영: 지하 나가는 계단(exit1/exit2)에서는 정해진 연출 없이 자유롭게 걸어 다녀도
     실제로 계단을 밟은 만큼 눈높이가 저절로 따라오게, 매 프레임 위치 기준으로 다시 계산한다. */
  /* v122: 옥상 — 데크 계단·데크 위에 서 있으면 그 높이로(옥탑방은 옥상 바닥 fpSlabY('R') 기준) */
  if(fpFloorNow==='R' && fpRoofDeckGeo){
    fpPos.y = fpSlabY('R') + fpRoofDeckH(fpPos.x, fpPos.z);
  }
  if(fpFloorNow==='B1'){
    var __b1q=fpRoomAt(fpPos.x, fpPos.z);
    var __b1InExit=!!(__b1q && (__b1q.id==='exit1' || __b1q.id==='exit2'));
    if(__b1InExit) fpPos.y = fpB1ExitY(fpPos.x, fpPos.z);
    /* 요청 반영(버그 수정): 바로 앞 '크리에이티브 존' 자리에서 걸어 둔
       -0.16 아래쪽 시선이, 이 계단실로 잘게 걸어 들어오는 동안(스팟 이동은
       거의 항상 중간에 새 걸음으로 대체돼 도착 이벤트가 안 걸린다)
       그대로 남아 있어서 다른 층 복도를 걸을 때와 달리 화면이 계속
       아래로 기운 채 움직이는 것처럼 보였다 — 존 밖에서 이 계단실로 막
       "들어오는 그 순간"에 한 번만 수평으로 되돌린다(그 뒤로 사용자가
       손가락으로 둘러보는 것은 그대로 존중한다). */
    if(__b1InExit && !fpB1WasInExit) fpLookPitch=0;
    fpB1WasInExit=__b1InExit;
  }
  fpCommit(want, dt, bob);
  fpMarkersNear();
  fpCheckStairProximity();
  fpCheckB1EntryProximity();
  fpFreeHud();
}
/* 요청 반영(최종): 옥상 "내려가기" 버튼은 다른 층 계단과 완전히 같은
   표준 근접감지(fpCheckStairProximity, 아래)를 그대로 쓴다 — 문 나갔다
   들어오는 걸 별도로 감지하려던 여러 시도가 계속 어긋나서, 결국 검증된
   기존 방식(멀어졌다 다시 가까워지면 자동으로 뜬다)으로 통일했다. */
/* 요청 반영: B1→1F로 계단을 오르면 도착하는 그 자리(후문 로비 한복판,
   fpStairGo의 arriveInHall이 쓰는 hallX/stZ와 정확히 같은 좌표)에
   실제로 서 있을 때만 "↓ B1" 패널을 보여준다 — 계단 선택 패널(fpSel)과
   똑같은 알약 버튼 스타일이지만, 완전히 별개의 패널(fpB1Panel)이고
   위치 근접으로만 뜬다. */
/* 요청 반영(버그 수정): ✕(닫기)를 눌러도 패널이 닫히지 않았다 — 닫기 버튼은
   'on' 클래스를 지우는데, 이 함수가 매 프레임 돌면서 반경 안에 서 있으면
   곧바로 다시 'on'을 붙여 버렸기 때문이다(누른 다음 프레임에 되살아나니
   버튼이 아예 안 먹는 것처럼 보인다).
   옥상 계단 패널(fpCheckStairProximity)이 쓰는 '재무장' 방식을 그대로 쓴다 —
   한 번 닫으면 그 자리에서는 다시 뜨지 않고, 충분히 멀어졌다 돌아와야 다시 뜬다. */
var fpB1EntryArmed=true;
function fpB1PanelClose(){
  var el=document.getElementById('fpB1Panel');
  if(el) el.classList.remove('on');
  fpB1EntryArmed=false;
}
function fpCheckB1EntryProximity(){
  var el=document.getElementById('fpB1Panel'); if(!el) return;
  if(fpFloorNow!==1){ el.classList.remove('on'); fpB1EntryArmed=true; return; }
  var hallX=FP_WALL_X+FP_ST_WD_B1F-0.6, hallZ=stZOf(1)*BUILDING_Z_STRETCH;
  var dx=hallX-fpPos.x, dz=hallZ-fpPos.z, d2=dx*dx+dz*dz;
  if(d2 < 4.0){
    if(fpB1EntryArmed) el.classList.add('on');
  }else{
    el.classList.remove('on');
    if(d2 > 9.0) fpB1EntryArmed=true;      // 충분히 멀어지면 다시 뜰 수 있게
  }
}
/* 옥상 계단(중앙·비상) 근처에 서면 엘리베이터처럼 자동으로 위/아래 선택창을 띄운다.
   한 번 닫은 뒤 그 자리에 계속 서 있어도 다시 뜨지 않다가, 멀어졌다 돌아오면
   다시 뜬다(무한 재등장 방지 겸 '다가가면 뜬다' 느낌은 유지).
   요청 반영(버그 수정): 트리거 반경이 1.5m로 너무 좁아서 정확한 위치에
   서야만 버튼이 뜨고, 살짝만 움직여도(폰 화면을 터치하려고 손가락을 떼는
   그 순간의 미세한 이동만으로도) 다시 멀어진 것으로 처리돼 버튼이 금방
   사라지는 것처럼 느껴졌다 — 뜨는 반경(1.5m→2.6m)과 다시 무장되는 반경
   (2.65m→4.2m)을 모두 넉넉하게 넓힌다. */
var fpNearStairArmed=true;
function fpCheckStairProximity(){
  if(fpFloorNow!=='R' || !fpNodes) return;
  var minD2=1e9, kind=null;
  for(var i=0;i<fpNodes.length;i++){
    var nd=fpNodes[i];
    if(nd.kind!=='st' && nd.kind!=='es') continue;
    var dx=nd.x-fpPos.x, dz=nd.z-fpPos.z, d2=dx*dx+dz*dz;
    if(d2<minD2){ minD2=d2; kind=nd.kind; }
  }
  if(kind===null) return;
  if(minD2 < 6.76){
    if(fpNearStairArmed){
      var sel=document.getElementById('fpSel');
      if(!(sel && sel.classList.contains('on'))) fpSelShow(kind);
      fpNearStairArmed=false;
    }
  }else if(minD2 > 17.64){
    fpNearStairArmed=true;
  }
}
/* 이동 표시가 층 전체에 깔려 있으면 화면이 난잡해진다
   → 지금 자리에서 가까운 것만 남기고 나머지는 숨긴다. */
function fpMarkersNear(){
  if(!fpNodeG) return;
  var kids=fpNodeG.children;
  for(var i=0;i<kids.length;i++){
    var nd=kids[i].userData.node; if(!nd) continue;
    var dx=nd.x-fpPos.x, dz=nd.z-fpPos.z, d2=dx*dx+dz*dz;
    kids[i].visible = (d2 < 132) && (d2 > 0.12);   // 약 11.5m 안쪽, 발밑은 제외
  }
}
/* 목적지 방향·거리 안내(자유롭게 다니다 길을 잃지 않도록) */
/* 목적지가 실제로 서야 할 자리(복도에서 그 방 문 앞).
   targetPos()는 방 한가운데(복도 밖 6m 안쪽) 좌표라, 그걸 그대로 쓰면
   화살표가 벽 안쪽을 가리키고 남은 거리도 실제보다 크게 나왔다. */
function fpTargetXZ(){
  if(!target) return null;
  var ST=BUILDING_Z_STRETCH, lv=target.floor, fx=FP_WALL_X-0.30;
  if(target.kind==='room'){
    var L=FLOOR_LAYOUT[lv], info=(L && L.lookup) ? L.lookup[target.code] : null;
    if(info) return {x:(info.x>0?1:-1)*fx, z:info.z*ST, door:true};
  }
  if(target.kind==='toilet'){
    var tl=FACILITIES.toilet;
    return {x:(tl.x>0?1:-1)*fx, z:fpToiletZ(lv), door:true};
  }
  if(target.kind==='emstair'){
    var es=EMSTAIR_POS[lv];
    if(es) return {x:(es.xWhole>0?1:-1)*fx, z:es.z*ST, door:true};
  }
  var p=targetPos();
  return {x:p.x, z:p.z*ST, door:false};
}
/* 그 이동 지점이 목적지인가 */
function fpIsTargetNode(nd){
  if(!target || !nd || target.floor!==fpFloorNow) return false;
  if(nd.kind==='door') return target.kind==='room' && nd.code===target.code;
  if(nd.kind==='wc')   return target.kind==='toilet';
  if(nd.kind==='es')   return target.kind==='emstair';
  return false;
}
function fpFreeHud(){
  var el=document.getElementById('fpGuide');
  if(!el) return;
  if(!target || fpBusy){ el.classList.remove('on'); return; }
  /* 목적지에 이미 도착한 뒤(personAnim.done)에는 안내 배너를 아예 숨긴다.
     예전에는 도착 판정 지점(문 앞)에서만 잠깐 '도착!'으로 바뀌고, 그 뒤
     크리에이티브 존처럼 넓은 실내를 더 걸어 들어가면 목적지(문) 좌표에서
     다시 멀어져 "29m" 같은 거리 배너가 되살아났다(요청 반영: 도착 후엔 계속 숨김). */
  if(personAnim.done){ el.classList.remove('on'); return; }
  var ko=(LANG==='ko'), p=fpTargetXZ();
  if(!p){ el.classList.remove('on'); return; }
  var ang=0, txt, arrow='\u2191';
  if(target.floor!==fpFloorNow){
    var up=(lvIndex(target.floor)>lvIndex(fpFloorNow));
    ang = up ? 0 : 180;
    txt = targetLabel()+' · '+lvName(target.floor)
        + (ko ? (up?' — 위층':' — 아래층') : (up?' — upstairs':' — downstairs'));
  }else{
    var dx=p.x-fpPos.x, dz=p.z-fpPos.z;
    var d=Math.sqrt(dx*dx+dz*dz);
    if(d < 2.4){
      /* 바로 앞까지 왔으면 화살표 대신 '도착'을 보여 준다 */
      el.innerHTML='<i style="transform:none">\u2605</i><b>'
                 + targetLabel()+(ko?' · 도착!':' · arrived!')+'</b>';
      el.classList.add('on');
      return;
    }
    /* 화살표 방향 : 월드 방위 - 보는 방향.
       화면 회전(CSS rotate)은 시계방향이고 월드 각도는 반시계방향이라
       부호를 뒤집어야 한다. 예전엔 그냥 빼서, 왼쪽에 있는 방을
       오른쪽이라고 가리켰다. */
    var rel = Math.atan2(dx, dz) - (fpYaw + fpLookYaw);
    while(rel >  Math.PI) rel -= Math.PI*2;
    while(rel < -Math.PI) rel += Math.PI*2;
    ang = -rel*180/Math.PI;
    txt = targetLabel()+' · '+Math.max(1,Math.round(d))+'m';
  }
  el.innerHTML='<i style="transform:rotate('+ang.toFixed(0)+'deg)">'+arrow+'</i><b>'+txt+'</b>';
  el.classList.add('on');
}
/* ── 폰 조작용 : 제자리에서 뒤돌기 / 한 지점씩 앞·뒤로 ── */
/* ── 자유 탐색 확대/축소 : 시야각(FOV)을 줄이면 확대, 넓히면 축소 ── */
var fpZoom=1;
function fpZoomStep(d){
  if(!fpActive || !fpFree) return;
  fpZoom = Math.max(0.6, Math.min(2.4, fpZoom*(d>0 ? 1.25 : 0.8)));
}
function fpTurnAround(){
  if(!fpFree || fpBusy) return;
  var cur = fpYaw + fpLookYaw;
  fpYaw = cur; fpLookYaw = 0;
  var t = cur + Math.PI;
  while(t >  Math.PI) t -= Math.PI*2;
  while(t < -Math.PI) t += Math.PI*2;
  fpFaceYaw = t;
  fpPath = null;
}
/* dir=+1 앞으로, -1 뒤로 : 지금 보고 있는 방향에서 가장 가까운 이동 지점으로 한 칸 */
function fpStepMove(dir){
  if(!fpFree || fpBusy || !fpNodes.length) return;
  /* 요청 반영: 계단/엘리베이터 선택 패널(#fpSel)이 떠 있는 동안에는 버튼으로
     한 걸음 움직이는 것만으로 패널이 조용히 사라지던 게 혼란스러웠다 —
     이제 패널이 열려 있으면 X(닫기)를 눌러야만 다시 움직일 수 있다.
     같은 이유로 지하 진입 패널(#fpB1Panel, "↓ B1")도 함께 막는다.
     (옥상 하강 안내도 이제 문을 나갔다 들어온 순간에만 뜨는 명확한
     결정 시점이라, 다른 패널과 동일하게 이동을 막는다.) */
  var __selEl=document.getElementById('fpSel');
  if(__selEl && __selEl.classList.contains('on')) return;
  var __b1El=document.getElementById('fpB1Panel');
  if(__b1El && __b1El.classList.contains('on')) return;
  var yaw = fpYaw + fpLookYaw + (dir<0 ? Math.PI : 0);
  var fx = Math.sin(yaw), fz = Math.cos(yaw);
  /* 1층 중앙계단 로비(lobby1)에서만 room을 최우선으로 본다 — 그렇지 않으면
     room 밖 먼 코리도 노드가 방향만 얼추 맞아도 그쪽으로 훌쩍 튀어버려서
     "시선 방향으로 자연스럽게 걷기"가 아니라 순간이동처럼 보인다.
     2~5층의 기존 open 존은 원래대로 노드 우선 동작을 그대로 유지한다
     (요청 반영: 다른 층 로직은 건드리지 않는다). */
  /* 버튼 한 번에 이동하는 거리를 더 잘게 쪼갠다(요청 반영) — 예전엔 1.7m씩
     성큼 건너뛰거나, 정면 ±57도·7.5m 안의 "가장 가까운 노드"로 순간이동하듯
     튀어서 원하는 지점에 딱 멈추기 어려웠다. 이제는 훨씬 촘촘한 고정 보폭으로
     세밀하게 조금씩 움직이고, 노드로의 스냅도 아주 가까울 때(2m 이내)만
     허용해 지나치거나 못 미치는 느낌을 줄인다. */
  var hereQ=fpRoomAt(fpPos.x, fpPos.z);
  var FINE_STEP=0.55;
  if(hereQ && hereQ.id==='lobby1'){
    fpGoPoint(hereQ, fpPos.x+fx*FINE_STEP, fpPos.z+fz*FINE_STEP);
    return;
  }
  var best=null, bestD=1e9;
  for(var i=0;i<fpNodes.length;i++){
    var nd=fpNodes[i];
    /* 요청 반영: 유리지붕 통로(zonecorr)는 다른 목적지로 가는 길에 우연히
       스쳐서 자동으로 걸어들어가지면 안 된다 — 지금 실제로 계단참(zoneland)에
       서 있을 때만 스냅 후보로 넣는다(그 외에는 완전히 무시). */
    if(nd.kind==='zonecorr'){
      var __P=fpB1ExitPts(), __land={x:__P.xA0, z:__P.zA1+0.5};
      if(Math.hypot(fpPos.x-__land.x, fpPos.z-__land.z) > 0.6) continue;
    }
    var dx=nd.x-fpPos.x, dz=nd.z-fpPos.z;
    var d=Math.sqrt(dx*dx+dz*dz);
    /* 요청 반영(버그 수정): zonecorr(맨 위 문)는 계단참에서 실제 거리가 2m를
       훌쩍 넘는다(계단+참 길이 때문에) — 위에서 이미 "계단참 근처에 서 있을
       때만" 후보로 넣게 막아 뒀으니, 이 노드에 한해서는 거리 제한을 넉넉하게
       풀어 준다. 안 그러면 2m 캡에 걸려 이 노드가 절대 선택되지 못해서,
       버튼으로는 계단을 오르는 애니메이션(높이 변화) 없이 잘게 밀리는 이동만
       되다가 계단 매스를 그대로 뚫고 지나가는 것처럼 보였다. */
    var distCap = (nd.kind==='zonecorr') ? 20.0
                : ((nd.kind==='roofout'||nd.kind==='roofin') ? 6.0 : 2.0);
    if(d<0.35 || d>distCap) continue;             // 아주 가까운 노드만 스냅 대상으로(세밀한 이동 유지)
    var dot=(dx*fx+dz*fz)/d;
    if(dot < 0.55) continue;                 // 대략 앞쪽 ±57도 안에 있는 지점만
    var score=d - dot*1.2;                   // 가깝고 정면일수록 우선
    if(fpIsTargetNode(nd)) score -= 3.0;     // 목적지는 한 칸 앞서 멈추게
    if(score<bestD){ bestD=score; best=nd; }
  }
  if(best){ fpGoTo(best); return; }
  /* 정면 가까이에 딱 맞는 노드가 없으면(코너 등) 노드로 튀지 말고 보는
     방향으로 잘게 한 걸음만 걷는다 — 로비 밖 복도 등 어디서든 동일하게 적용.
     요청 반영: 계단실(exit1/exit2)도 이제 fpFreeTick에서 매 프레임 눈높이를
     다시 계산해 주므로, 다른 방과 똑같이 잘게 걷기를 그대로 허용한다. */
  var thereX=fpPos.x+fx*FINE_STEP, thereZ=fpPos.z+fz*FINE_STEP;
  var thereQ=fpRoomAt(thereX, thereZ);
  /* 요청 반영(버그 수정): exit1/exit2처럼 겹치는 두 방 사이 경계에서는
     "지금 서 있는 방(hereQ)"을 그대로 쓰면, 그 방의 여백(margin) 때문에
     실제로는 다음 방(exit2 등)으로 더 들어갈 수 있는데도 경계에서 멈춰버렸다
     (계단참에서 2구간 계단으로 넘어가지 못하고 딱 붙어 멈추는 버그의 원인).
     "가려는 곳(thereQ)"이 있으면 그 방 기준으로 여백을 계산해야, 다음 방으로
     자연스럽게 이어서 걸어 들어간다 — thereQ가 없을 때(벽에 막힌 경우)만
     hereQ로 되돌아가 제자리에 멈추게 한다. */
  if(hereQ || thereQ){
    fpGoPoint(thereQ||hereQ, thereX, thereZ);
    return;
  }
  fpCap((LANG==='ko') ? '그쪽으로는 더 갈 수 없어요' : 'Nothing that way');
}
/* ── 화면을 눌러 이동할 지점 고르기 ── */
function fpFreePick(clientX, clientY){
  if(!fpFree || fpBusy || !fpNodeG || !camera) return;
  /* 요청 반영: 위와 같은 이유로, 바닥을 눌러 이동하는 것도 계단/엘리베이터
     선택 패널이나 지하 진입 패널이 열려 있는 동안에는 막는다 —
     X를 눌러야 움직일 수 있다. */
  var __selEl2=document.getElementById('fpSel');
  if(__selEl2 && __selEl2.classList.contains('on')) return;
  var __b1El2=document.getElementById('fpB1Panel');
  if(__b1El2 && __b1El2.classList.contains('on')) return;
  var cv=document.getElementById('c3d'), r=cv.getBoundingClientRect();
  var v=new THREE.Vector2(((clientX-r.left)/r.width)*2-1, -((clientY-r.top)/r.height)*2+1);
  var rc=new THREE.Raycaster(); rc.setFromCamera(v, camera);
  /* 지금 서 있는 곳이 넓게 트인 방이면, 지점 고리를 신경 쓰지 말고
     바닥에서 누른 그 자리로 곧장 걸어간다. */
  var here=fpRoomAt(fpPos.x, fpPos.z);
  /* 요청 반영: 계단실(exit1/exit2)도 이제 fpFreeTick이 매 프레임 위치 기준으로
     눈높이(y)를 다시 계산해 주므로, 다른 넓게 트인 방과 똑같이 탭한 자리로
     곧장 걸어가는 지름길을 그대로 써도 계단 매스를 뚫지 않는다. */
  if(here){
    var pl0=new THREE.Plane(new THREE.Vector3(0,1,0), -(fpSlabY(fpFloorNow)+0.07));
    var pt0=new THREE.Vector3();
    if(rc.ray.intersectPlane(pl0, pt0)){
      var there=fpRoomAt(pt0.x, pt0.z);
      if(there===here){ fpGoPoint(here, pt0.x, pt0.z); return; }
    }
  }
  /* 이동 지점 표시를 안 보이게 한 뒤로는 고리를 직접 맞힐 이유가 없다
     → 항상 바닥을 누른 지점 기준으로 가장 가까운 자리를 고른다. */
  /* 표시를 정확히 못 맞혔어도, 바닥에서 가장 가까운 지점으로 보내 준다
     (폰에서는 손가락이 두꺼워 작은 고리를 정확히 누르기 어렵다) */
  var pl=new THREE.Plane(new THREE.Vector3(0,1,0), -(fpSlabY(fpFloorNow)+0.07));
  var pt=new THREE.Vector3();
  if(!rc.ray.intersectPlane(pl, pt)) return;
  var best=null, bd=1e9, bReal=1e9;
  fpNodes.forEach(function(nd){
    /* 요청 반영: 유리지붕 통로는 화면을 눌러 이동할 때도, 지금 계단참에
       서 있을 때만 후보로 넣는다(다른 곳 이동 중 우연히 딸려 들어가지 않게). */
    if(nd.kind==='zonecorr'){
      var __P=fpB1ExitPts(), __land={x:__P.xA0, z:__P.zA1+0.5};
      if(Math.hypot(fpPos.x-__land.x, fpPos.z-__land.z) > 0.6) return;
    }
    var d=Math.pow(nd.x-pt.x,2)+Math.pow(nd.z-pt.z,2), w=d;
    /* 목적지 문 앞 자리는 우선해서 잡아 준다
       (복도 지점이 바로 옆에 있어 목적지를 눈앞에 두고도 못 서는 일이 있었다) */
    if(fpIsTargetNode(nd)) w = d*0.25;
    if(w<bd){ bd=w; bReal=d; best=nd; }
  });
  if(best && (bReal < 42 || best.kind==='zonecorr')) fpGoTo(best);   // 동그라미가 안 보이므로 누른 자리 근처를 넣덒하게 잡는다
  // 요청 반영(버그 수정): zonecorr(맨 위 문)는 계단참에서 실제 거리가 6~7m
  // 이상이라 42(≈6.5m) 캡에 걸려 탭으로도 선택되지 못했다 — 이미 위에서
  // "계단참 근처에 서 있을 때만" 후보로 걸러 뒀으니 거리 캡은 면제한다.
}
/* ── 모드 켜기/끄기 ── */
function fpStartFree(){
  if(!camera || !personG) return;
  if(fpActive) fpEnd(false, true);
  if(!fpCab){ fpCab=fpMakeCab(); scene.add(fpCab); }
  if(!fpCeil){ fpCeil=fpMakeCeil(); scene.add(fpCeil); }
  fpFree=true; fpSeq=false; fpSeqDone=null; fpBusy=false; fpPath=null; fpFaceYaw=null;
  fpB1WasInExit=false;   // 요청 반영(버그 수정): 새로 자유 탐색을 시작할 때는 항상 '아직 계단실 밖'으로 본다
  fpFloorNow=startFloor;
  fpZoom=1;
  var ev=evXZ(fpFloorNow), evzW=ev.z*BUILDING_Z_STRETCH;
  var frontX=ev.x-fpEvW(fpFloorNow)/2;
  fpCabPos={x:frontX-0.13+FP_CAB_D/2, z:evzW};
  fpDoorK=0;
  /* v143(요청 반영): 직접 걸어보기도 QR로 고른 문(정문·후문·동문·서문)에서 출발한다.
     좌표는 경로 미리보기와 같은 fpGateStart1F() 한 곳에서 가져와 두 모드를 맞춘다. */
  if(fpFloorNow===1){ var gs1=fpGateStart1F(); fpPos={x:gs1.x, y:fpSlabY(1), z:gs1.z}; fpYaw=gs1.yaw; }
  else { fpPos={x:0, y:fpSlabY(fpFloorNow), z:evzW}; fpYaw=Math.PI/2; }
  fpSetFloor(fpFloorNow);
  /* v145(요청 반영): 직접 걸어보기에도 경로 미리보기와 같은 바닥 빨간 유도선을 켠다.
     (예전에는 화면 위 방향 배지만으로 안내하려고 일부러 껐었다)
     출발층과 목적층이 같을 때 선을 숨기는 규칙은 미리보기와 동일하게 맞춘다 —
     같은 층이면 엘리베이터에서 뻗어 나온 선이 오히려 헷갈린다. */
  var sameFlF = !!(target && target.floor===fpFloorNow);
  fpRouteFloor(!sameFlF);
  if(typeof routeA!=='undefined' && routeA) routeA.visible=false;
  fpCab.visible=(fpFloorNow!=='R'); fpSetXray(false);
  var lg=document.getElementById('legend3d'); if(lg) lg.style.display='none';
  fpActive=true; fpLabel='';
  personG.visible=false;
  personAnim.playing=false; personAnim.done=false;
  fpLookYaw=0; fpLookPitch=0; fpBob=0;
  spinPause(); resetChaseCam();
  fpFreeTick(0);
  var ctl=document.getElementById('fpCtl'); if(ctl) ctl.classList.add('on');
  fpCap((LANG==='ko') ? '▲ 앞으로 · ↺ 뒤돌기 · 바닥을 눌러 이동'
                      : '▲ forward · ↺ turn around · or tap the floor');
  syncTripBtn();
}
function fpEndFree(){
  fpSelHide('fpEndFree'); fpClearNodeG();
  var ctl0=document.getElementById('fpCtl'); if(ctl0) ctl0.classList.remove('on');
  fpPaused=false;
  fpFree=false; fpSeq=false; fpSeqDone=null; fpBusy=false; fpPath=null; fpFaceYaw=null;
  var el=document.getElementById('fpGuide'); if(el) el.classList.remove('on');
  fpEnd(false, false);
}
function toggleFree(){
  if(fpFree) fpEndFree();
  else       fpStartFree();
}

/* 재생 중 화면을 끌면 로드뷰처럼 제자리에서 고개만 돌린다(경로 자체는 그대로 진행) */
function fpLook(dx, dy){
  if(fpFree){
    /* 자유 탐색은 제자리에서 뒤까지 돌아볼 수 있어야 하므로 좌우 제한을 두지 않는다
       (자동재생은 경로를 따라가는 연출이라 예전처럼 좌우 ±66도로 묶어 둔다) */
    fpLookYaw = fpLookYaw - dx*0.006;
    if(fpLookYaw >  Math.PI) fpLookYaw -= Math.PI*2;
    if(fpLookYaw < -Math.PI) fpLookYaw += Math.PI*2;
    fpLookPitch = fpClamp(fpLookPitch - dy*0.004, -0.62, 0.62);
    return;
  }
  fpLookYaw   = fpClamp(fpLookYaw   - dx*0.005, -FP_LOOK_Y, FP_LOOK_Y);
  fpLookPitch = fpClamp(fpLookPitch - dy*0.004, -FP_LOOK_P, FP_LOOK_P);
}


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

// 방 사이 시각적 간격(세로) 계산: 일반 호실(및 2칸짜리 방)은 지금까지와 같은 0.35 고정 간격을 유지하되,
// 가벽으로 반씩 나뉜 좁은 호실(예: 13203/13204)은 같은 0.35를 적용하면 상대적으로 훨씬 많이 깎여나가
// "그 호실만 짧아 보이는" 문제가 생김 → 칸 깊이의 8%를 상한 0.35로 잡아, 좁은 칸은 간격을 비례해서 줄임.
function roomInsetD(d){ return Math.min(0.35, d*0.08); }
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


/* ================================================================
   ③ 사진 라이브러리 — 호실 사진을 앱에 넣는 기능
   ----------------------------------------------------------------
   ROOM_PHOTOS['13201'] = [{n:'파일명', u:'data:image/jpeg;base64,...'}, ...]
   파일 이름에 들어 있는 5자리 호실번호를 읽어 자동으로 분류합니다.
   ================================================================ */
var ROOM_PHOTOS = {};
var PH_MAXDIM = 1280;      // 저장할 때 줄이는 최대 가로/세로 픽셀
var PH_Q      = 0.72;      // JPEG 품질
var PH_SKIP   = [];        // 호실번호를 못 찾은 파일 이름

/* 미리 담겨 있는 사진이 있으면 불러오기 */
(function(){
  /* 사진 목록은 data/photos.js 가 window.PHOTO_INDEX 에 넣는다. 고쳐도 원본이 안 바뀌게 복사해서 쓴다. */
  if(window.PHOTO_INDEX){ try{ ROOM_PHOTOS = JSON.parse(JSON.stringify(window.PHOTO_INDEX)) || {}; }catch(e){ ROOM_PHOTOS = {}; } }
})();

/* v147(요청 반영): 길안내 1단계에서 쓸 '문별 사진'.
   확인 화면(여기가 맞나요?)이 쓰는 바로 그 사진 한 장만 골라 따로 등록한다 —
   code를 'BLD'로 주면 건물 사진 8장이 전부 딸려 와 눌러 넘기게 되기 때문이다.
   사진 객체를 그대로 참조하므로 용량은 늘지 않는다. */
function phBuildGateLists(){
  var list = ROOM_PHOTOS['BLD'];
  if(!list || !list.length) return;
  var MAP = {MAIN:'정문내부', BACK:'후문내부', EAST:'동문내부', WEST:'서문내부'};
  Object.keys(MAP).forEach(function(k){
    var tag = '('+MAP[k]+')', outer = '('+MAP[k].replace('내부','')+')', hit=null, alt=null;
    for(var i=0;i<list.length;i++){
      var t = (list[i].cap||'')+' '+(list[i].n||'');
      if(t.indexOf(tag)!==-1){ hit=list[i]; break; }
      if(!alt && t.indexOf(outer)!==-1) alt=list[i];
    }
    var pick = hit || alt;
    if(pick) ROOM_PHOTOS['GATE_'+k] = [pick];
  });
}

/* 공용 사진 정리 : 캡션과 사진이 어긋나는 문제를 막는다.
   ① EV1~EV5 에는 '엘리베이터'가 들어간 사진만 남기고(예: 'EV1_정문 들어가는 길'은
      캡션이 "1층 엘리베이터 앞"으로 나와 처음 온 사람이 헷갈리므로) 건물 외부(BLD)로 옮긴다.
   ② 파일명 끝 번호(-1,-2,…)순으로 정렬해 첫 장이 항상 대표 사진이 되게 한다. */
function phNormalize(){
  phBuildGateLists();          // v147: 문별 한 장짜리 목록도 같이 갱신
  ['EV1','EV2','EV3','EV4','EV5'].forEach(function(k){
    var list = ROOM_PHOTOS[k]; if(!list || !list.length) return;
    var keep = [], move = [];
    list.forEach(function(p){ (/엘리베이터/.test(p.n) ? keep : move).push(p); });
    if(!keep.length) return;                 // 엘리베이터 사진이 하나도 없으면 그대로 둔다
    ROOM_PHOTOS[k] = keep;
    if(move.length){
      if(!ROOM_PHOTOS.BLD) ROOM_PHOTOS.BLD = [];
      move.forEach(function(p){
        if(!ROOM_PHOTOS.BLD.some(function(x){ return x.n === p.n; })) ROOM_PHOTOS.BLD.push(p);
      });
    }
  });
  function seq(n){ var m = String(n).match(/-(\d+)\.jpe?g$/i); return m ? parseInt(m[1],10) : 0; }
  Object.keys(ROOM_PHOTOS).forEach(function(k){
    if(!/^(BLD|B1|EV[1-5]|HALL[1-5][LR]|WC[1-5]|ES[1-5]|EMS[1-5]|LNG[1-5])$/.test(k)) return;   /* v79 */
    ROOM_PHOTOS[k].sort(function(a,b){ return seq(a.n) - seq(b.n); });
  });
}
phNormalize();
sphApplyDeleted();

/* 호실 외 공용 사진 키
   BLD=건물 외부 · B1=지하1층 · EV1~EV5=각 층 엘리베이터 앞 · HALL1L~HALL5R=각 층 왼쪽/오른쪽 복도 */
var PH_LABEL = {BLD:'공대 3호관', B1:'지하 1층'};
var PH_LABEL_EN = {BLD:'Engineering Bldg.3', B1:'B1'};
(function(){
  for(var i=1;i<=5;i++){
    PH_LABEL['EV'+i]      = i+'층 엘리베이터 앞';
    PH_LABEL['HALL'+i+'L']= i+'층 왼쪽 복도';
    PH_LABEL['HALL'+i+'R']= i+'층 오른쪽 복도';
    PH_LABEL['WC'+i]      = i+'층 화장실';
    PH_LABEL['ES'+i]      = i+'층 계단';                /* v79 : AI 쪽과 같게 — ES = 계단, EMS = 비상계단 */
    PH_LABEL['EMS'+i]     = i+'층 비상계단';
    PH_LABEL_EN['EV'+i]      = 'Floor '+i+' elevator';
    PH_LABEL_EN['HALL'+i+'L']= 'Floor '+i+' left hallway';
    PH_LABEL_EN['HALL'+i+'R']= 'Floor '+i+' right hallway';
    PH_LABEL_EN['WC'+i]      = 'Floor '+i+' restroom';
    PH_LABEL_EN['ES'+i]      = 'Floor '+i+' stairs';
    PH_LABEL_EN['EMS'+i]     = 'Floor '+i+' emergency stairs';
  }
})();
function phCap(code){
  if(LANG==='en' && PH_LABEL_EN[code]) return PH_LABEL_EN[code];
  if(PH_LABEL[code]) return PH_LABEL[code];
  if(!/^\d{5}/.test(code)) return rn(ROOM_NAME[code]) || code;   // KTC 등 숫자가 아닌 코드는 '호' 붙이지 않음
  return code + ((LANG==='ko')?'호':'');
}

/* ── 호실 이름(용도) 인덱스 : 사진 파일명에서 자동 추출 ──
   파일명 형식 "N. 13115_학과사무실-1.jpg" 에서 '학과사무실'만 뽑아
   ROOM_NAME[13115] = '학과사무실' 로 저장. 별도 데이터 입력 없이 사진만으로 만들어짐. */
/* 방 이름(용도)은 사진 파일명에서 그대로 뽑히므로 대부분 특정 연구실·교수님 성함처럼
   고유명사라 자동 번역이 위험하다. 다만 아래처럼 자주 나오는 일반 용어 몇 개만
   영어 표기를 함께 등록해 두고, 없는 이름은 원문(한글)을 그대로 보여준다. */
var ROOM_NAME_EN = {
  '강의실':'Classroom', '대학원 강의실':'Graduate Classroom',
  'PC 실습실':'PC Lab', 'PC실':'PC Lab', '임베디드실습실':'Embedded Systems Lab',
  '학과사무실':'Department Office', '학부장실':"Dean's Office", '안내실':'Information Desk',
  '캡스톤디자인실':'Capstone Design Room', '캡스톤디자인 취업실':'Capstone Design Career Room',
  '캡스톤 디자인 실습실':'Capstone Design Practice Room', '캡스톤디자인 회의실':'Capstone Design Meeting Room',
  '명예교수 및 시간강사실':'Emeritus & Adjunct Faculty Office'
};
function rn(nm){ if(!nm || LANG!=='en') return nm; return ROOM_NAME_EN[nm] || nm; }
var ROOM_NAME = {};
/* 사진을 새로 등록한 뒤에도 방 이름을 다시 뽑을 수 있게 이름 있는 함수로 둔다. */
function phRebuildRoomNames(){
  function nameFrom(fn){
    var m = String(fn).match(/^\s*\d+\.\s*[^_]+_(.+?)(?:-\d+)?\.jpe?g$/i);
    return m ? m[1].trim() : null;
  }
  Object.keys(ROOM_PHOTOS).forEach(function(k){
    var code = k.split('-')[0];              // 13121-A → 13121
    if(!/^\d{5}$/.test(code)) return;
    if(ROOM_NAME[code]) return;
    (ROOM_PHOTOS[k]||[]).some(function(p){
      var nm = nameFrom(p.n);
      if(nm && nm!=='표기 없음'){ ROOM_NAME[code]=/교수$/.test(nm)?(nm+'님 연구실'):nm; return true; }
      return false;
    });
  });
}
phRebuildRoomNames();
/* 캡션·상세에서 '13115호 · 학과사무실' 처럼 이름을 곁들임 */
/* 층 상세 칸 안에 한 줄로 곁들일 짧은 이름.
   앞의 학과·전공 표기와 '·' 뒤 두 번째 이름을 떼고, 그래도 길면 끝을 줄인다. */
function shortRoomName(nm){
  if(!nm) return '';
  var t = String(nm).split('·')[0].trim();
  t = t.replace(/^\S*(?:공학과|공학전공|융합전공|전공|학과)\s+/, '');
  if(t.length > 13) t = t.slice(0,12) + '…';
  return t;
}
function roomTitle(code, forceLang){
  var lang = forceLang || LANG;
  var raw = ROOM_NAME[code];
  var nm = (lang==='en') ? ((ROOM_NAME_EN[raw]) || raw) : raw;
  if(lang==='en') return nm ? ('Room '+code+' · '+nm) : ('Room '+code);
  return nm ? (code+'호 · '+nm) : (code+'호');
}
/* 한국어 주격 조사(이/가) — 앞 글자 받침 여부로 결정 */
function subjParticle(word){
  var c = word.charCodeAt(word.length-1);
  if(c>=0xAC00 && c<=0xD7A3) return ((c-0xAC00)%28!==0) ? '이' : '가';
  return '가';
}

function phCodeOf(path){
  var b = String(path).split('/').pop().split('\\').pop();
  var sp = b.match(/^(BLD|B1|EV[1-5]|HALL[1-5][LR]|WC[1-5]|EMS[1-5]|ES[1-5]|LNG[1-5])(?![0-9A-Za-z가-힣])/i);   /* v79 */
  if(sp) return sp[1].toUpperCase();
  if(/^\s*(\d+\.\s*)?ktc/i.test(b) || /_KTC|KTC동아리|KTC 동아리/i.test(b)) return 'KTC';
  var m = b.match(/13[1-5]\d{2}/);
  if(!m) return null;
  var code = m[0];
  var mm = b.slice(m.index + 5).match(/^\s*[-_]?\s*([AB])(?![0-9A-Za-z가-힣])/i);
  if(mm) code += '-' + mm[1].toUpperCase();
  return code;
}

/* ══════════════════════════════════════════════════════════════════
   PHFIX — 사진 읽기 안정화 (v44)

   기존 phShrink는 브라우저가 파일을 못 읽으면 그냥 실패했다. 특히
   아이폰 기본 촬영 포맷인 HEIC는 사파리는 읽지만 안드로이드 크롬은
   못 읽어서, "사진을 처리하지 못했어요" 한 줄만 뜨고 끝났다.

   · 파일 앞부분(매직 넘버)을 읽어 실제 형식을 알아낸다 (확장자는 못 믿는다)
   · HEIC면 heic2any를 그때 내려받아 변환한다
   · 읽기를 3단계로 시도한다 (createImageBitmap → blob URL → FileReader)
   · 아이폰 캔버스 픽셀 한계(약 1,670만)에 맞춰 자동 축소
   · 실패 원인을 PHFIX.lastError 에 남겨 사용자에게 이유를 알려준다
   ══════════════════════════════════════════════════════════════════ */
var PHFIX = (function(){
  'use strict';
  var IOS_MAX_PX = 16700000;        // 아이폰 사파리 캔버스 상한
  var HEIC2ANY = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
  var heicLoading = null;

  function sniff(buf){
    var b = new Uint8Array(buf);
    if(b.length < 12) return 'empty';
    if(b[0]===0xFF && b[1]===0xD8) return 'jpeg';
    if(b[0]===0x89 && b[1]===0x50 && b[2]===0x4E && b[3]===0x47) return 'png';
    if(b[0]===0x47 && b[1]===0x49 && b[2]===0x46) return 'gif';
    if(b[0]===0x42 && b[1]===0x4D) return 'bmp';
    var s = String.fromCharCode(b[4],b[5],b[6],b[7]);
    if(s === 'ftyp'){
      var brand = String.fromCharCode(b[8],b[9],b[10],b[11]).toLowerCase();
      if(brand.indexOf('heic')===0 || brand.indexOf('heix')===0 ||
         brand.indexOf('hevc')===0 || brand.indexOf('mif1')===0 ||
         brand.indexOf('msf1')===0 || brand.indexOf('heim')===0) return 'heic';
      if(brand.indexOf('avif')===0 || brand.indexOf('avis')===0) return 'avif';
      return 'video';
    }
    if(String.fromCharCode(b[0],b[1],b[2],b[3])==='RIFF' &&
       String.fromCharCode(b[8],b[9],b[10],b[11])==='WEBP') return 'webp';
    return 'unknown';
  }

  function head(blob){
    return new Promise(function(res){
      var r = new FileReader();
      r.onload  = function(){ res(sniff(r.result)); };
      r.onerror = function(){ res('unreadable'); };
      r.readAsArrayBuffer(blob.slice(0, 16));
    });
  }

  function loadHeic(){
    if(window.heic2any) return Promise.resolve(true);
    if(heicLoading) return heicLoading;
    heicLoading = new Promise(function(res){
      var sc = document.createElement('script');
      sc.src = HEIC2ANY;
      sc.onload  = function(){ res(!!window.heic2any); };
      sc.onerror = function(){ res(false); };
      document.head.appendChild(sc);
      setTimeout(function(){ res(!!window.heic2any); }, 20000);
    });
    return heicLoading;
  }

  /* 세 가지 방법으로 이미지 열기를 시도한다 */
  function decode(blob){
    return new Promise(function(res, rej){
      function viaImg(){
        var u = URL.createObjectURL(blob), im = new Image();
        im.onload  = function(){ res({el:im, w:im.naturalWidth, h:im.naturalHeight, url:u}); };
        im.onerror = function(){ URL.revokeObjectURL(u); viaReader(); };
        im.src = u;
      }
      function viaReader(){
        var r = new FileReader();
        r.onload = function(){
          var im = new Image();
          im.onload  = function(){ res({el:im, w:im.naturalWidth, h:im.naturalHeight}); };
          im.onerror = function(){ rej('decode'); };
          im.src = r.result;
        };
        r.onerror = function(){ rej('read'); };
        r.readAsDataURL(blob);
      }
      if(window.createImageBitmap){
        createImageBitmap(blob, {imageOrientation:'from-image'}).then(function(bm){
          res({el:bm, w:bm.width, h:bm.height, bitmap:bm});
        })['catch'](viaImg);
      } else viaImg();
    });
  }

  var lastError = '';
  function shrink(blob, cb, maxdim, quality){
    lastError = '';
    if(!blob || !blob.size){ lastError='empty'; cb(null); return; }

    head(blob).then(function(kind){
      PHFIX.lastKind = kind;
      if(kind === 'video'){ lastError='video'; cb(null); return null; }
      if(kind === 'empty' || kind === 'unreadable'){ lastError='corrupt'; cb(null); return null; }

      if(kind === 'heic'){
        /* 사파리는 HEIC를 그대로 읽으므로 먼저 시도하고, 실패할 때만 변환한다 */
        return decode(blob)['catch'](function(){
          if(typeof phHeicNote === 'function') phHeicNote(true);
          return loadHeic().then(function(ok){
            if(!ok){ throw 'heic-nolib'; }
            return window.heic2any({blob: blob, toType:'image/jpeg', quality:0.85});
          }).then(function(out){
            var b = Array.isArray(out) ? out[0] : out;
            return decode(b);
          }).then(function(d){
            if(typeof phHeicNote === 'function') phHeicNote(false);
            return d;
          }, function(e){
            /* Promise.finally 는 구형 브라우저에 없어서 then(성공,실패) 두 갈래로 처리한다 */
            if(typeof phHeicNote === 'function') phHeicNote(false);
            throw e;
          });
        });
      }
      return decode(blob);
    }).then(function(d){
      if(!d) return;
      var w = d.w, h = d.h;
      if(!w || !h){ lastError='decode'; cb(null); return; }
      var sc = Math.min(1, (maxdim || PH_MAXDIM) / Math.max(w, h));
      /* 아이폰 캔버스 픽셀 한계 대응 */
      if(w*sc * h*sc > IOS_MAX_PX) sc = Math.sqrt(IOS_MAX_PX / (w*h));
      var cv = document.createElement('canvas');
      cv.width  = Math.max(1, Math.round(w*sc));
      cv.height = Math.max(1, Math.round(h*sc));
      try{
        cv.getContext('2d').drawImage(d.el, 0, 0, cv.width, cv.height);
        var out = cv.toDataURL('image/jpeg', quality || PH_Q);
        if(d.url) URL.revokeObjectURL(d.url);
        if(d.bitmap && d.bitmap.close) d.bitmap.close();
        cb(out);
      }catch(e){ lastError='canvas'; cb(null); }
    })['catch'](function(e){
      lastError = (typeof e === 'string') ? e : 'decode';
      cb(null);
    });
  }

  /* 실패 원인을 사람이 읽을 수 있는 문장으로 */
  function reason(){
    var ko = (typeof LANG==='undefined' || LANG==='ko');
    switch(lastError){
      case 'video':     return ko?'사진이 아니라 동영상 파일이에요. 사진으로 다시 올려주세요.'
                                 :'That is a video, not a photo. Please upload a photo.';
      case 'empty':     return ko?'파일이 비어 있어요.':'The file is empty.';
      case 'corrupt':   return ko?'파일이 손상됐거나 지원하지 않는 형식이에요.':'The file is damaged or unsupported.';
      case 'heic-nolib':return ko?'아이폰 HEIC 사진이에요. 인터넷 연결을 확인하시거나, [설정 › 카메라 › 포맷]을 "높은 호환성"으로 바꾼 뒤 다시 찍어주세요.'
                                 :'This is an iPhone HEIC photo. Check your connection, or set Settings › Camera › Formats to "Most Compatible" and retake.';
      case 'canvas':    return ko?'사진이 너무 커서 처리하지 못했어요. 조금 작게 찍어주세요.':'The photo is too large to process.';
      default:          return ko?'사진을 열지 못했어요. 다른 사진으로 다시 시도해 주세요.':'Could not open the photo. Please try another one.';
    }
  }

  /* 콘솔 진단 : PHFIX.check() 후 사진을 고르면 형식·원인이 출력된다 */
  function check(){
    var i = document.createElement('input'); i.type='file'; i.accept='image/*';
    i.onchange = function(){
      var f = i.files[0]; if(!f) return;
      head(f).then(function(k){
        console.log('파일명 :', f.name, '\nMIME :', f.type || '(없음)', '\n실제형식 :', k, '\n크기 :', (f.size/1024).toFixed(0)+'KB');
        shrink(f, function(u){ console.log('처리결과 :', u ? '성공 ('+(u.length/1024).toFixed(0)+'KB)' : '실패 — '+lastError); });
      });
    };
    i.click();
  }

  return { shrink:shrink, sniff:sniff, head:head, check:check, reason:reason,
           get lastError(){ return lastError; }, lastKind:'' };
})();

/* HEIC 변환 중 안내 */
function phHeicNote(on){
  var st = document.getElementById('sugStat');
  if(!st) return;
  if(on){ st.style.color='#FFC93C'; st.textContent=(LANG==='ko')?'아이폰 사진을 변환하는 중…':'Converting iPhone photo…'; st.classList.add('on'); }
}

function phShrink(blob, cb, maxdim, quality){ PHFIX.shrink(blob, cb, maxdim, quality); }

function phIsImg(n){ return /\.(jpe?g|png|webp|gif|bmp)$/i.test(n); }

/* 파일/ZIP 목록 → 사진 목록으로 펼치기 */
function phCollect(files, done){
  var out = [], pend = 0, i;
  function fin(){ if(pend===0) done(out); }
  for(i=0;i<files.length;i++){
    (function(f){
      var nm = f.webkitRelativePath || f.name;
      if(/\.zip$/i.test(nm)){
        if(typeof JSZip === 'undefined'){ PH_SKIP.push(nm + ' (인터넷 연결 필요)'); return; }
        pend++;
        JSZip.loadAsync(f).then(function(z){
          var ents = [];
          z.forEach(function(rel, e){ if(!e.dir && phIsImg(rel)) ents.push(e); });
          var k = 0;
          (function nextE(){
            if(k >= ents.length){ pend--; fin(); return; }
            var e = ents[k++];
            e.async('blob').then(function(b){ out.push({n:e.name, b:b}); nextE(); })
                           .catch(function(){ nextE(); });
          })();
        }).catch(function(){ PH_SKIP.push(nm + ' (압축 열기 실패)'); pend--; fin(); });
      } else if(phIsImg(nm)){
        out.push({n:nm, b:f});
      }
    })(files[i]);
  }
  fin();
}

var phBusy = false;
function phAdd(files){
  if(phBusy) return;
  phBusy = true; PH_SKIP = [];
  phSay('파일을 여는 중…', 2);
  phCollect(files, function(items){
    if(!items.length){ phBusy=false; phSay('넣을 수 있는 사진이 없습니다. (jpg·png·zip)', 0); return; }
    var i = 0, ok = 0;
    (function step(){
      if(i >= items.length){
        phBusy = false;
        phSay('사진 ' + ok + '장을 읽었습니다. 넣을 위치를 확인해 주세요.', 100);
        if(ok) go('phsort'); else phRender();
        return;
      }
      var it = items[i++];
      phSay('사진 읽는 중…  ' + i + ' / ' + items.length, Math.round(i/items.length*100));
      /* 예전에는 파일명에서 호실번호를 못 찾으면 그 자리에서 버렸다(=직접 넣을 방법이 없었음).
         이제는 위치를 비워 둔 채로 대기 목록(PH_STAGE)에 담아 두고,
         '넣을 위치 확인' 화면에서 사람이 직접 지정할 수 있게 한다. */
      phShrink(it.b, function(url){
        if(url){
          var base = it.n.split('/').pop();
          var code = phCodeOf(it.n);
          PH_STAGE.push({n:base, u:url, code:code || '', auto:!!code, sel:false});
          ok++;
        } else { PH_SKIP.push(it.n.split('/').pop()); }
        setTimeout(step, 0);
      });
    })();
  });
}

function phSay(msg, pct){
  var st = document.getElementById('phStat');
  if(!st) return;
  st.firstChild.nodeValue = msg + ' ';
  var b = document.getElementById('phBar');
  if(b) b.style.width = (pct||0) + '%';
}

function phCount(){ var n=0; for(var k in ROOM_PHOTOS) n += ROOM_PHOTOS[k].length; return n; }

function phFloorOf(code){
  if(code === 'KTC') return 4;
  var m = String(code).match(/^(?:EV|HALL|WC|ES)([1-5])/);
  if(m) return parseInt(m[1], 10);
  if(code === 'BLD' || code === 'B1') return 0;
  var d = parseInt(String(code).substr(2,1), 10);
  return (d>=1 && d<=5) ? d : null;
}


/* ══════════════════════════════════════════════════════════════════
   사진 일괄 등록 AI 도우미 (v45)

   파일 이름에 호실번호가 없어도, 사진을 보고 위치를 찾아준다.
   · 이미 등록된 장소와 충분히 닮으면        → 위치 자동 배정
   · 조금 닮았으면                          → 추천만 표시 (사람이 확인)
   · 어디와도 안 닮았으면                    → 처음 보는 장소로 판단하고
                                             같은 장소끼리 묶어서 제안
   ══════════════════════════════════════════════════════════════════ */
var PH_NEW_GROUPS = [];        // [{idxs:[PH_STAGE 인덱스], code:''}]

function phAiSay(msg){
  var el = document.getElementById('phAiProg');
  if(el) el.textContent = msg || '';
}

function phAiSort(){
  if(typeof SUGAI === 'undefined'){ phAiSay('AI를 쓸 수 없습니다.'); return; }
  var targets = [];
  PH_STAGE.forEach(function(x, i){ if(!x.code) targets.push(i); });
  if(!targets.length){ phAiSay('위치가 비어 있는 사진이 없습니다.'); return; }

  var btn = document.getElementById('phAiBtn');
  if(btn){ btn.disabled = true; }
  phAiSay('AI를 준비하는 중…');

  SUGAI.ensure().then(function(){
    var vecs = {}, k = 0, autoN = 0, recN = 0, newIdx = [];

    (function step(){
      if(k >= targets.length){ finish(); return; }
      var i = targets[k++];
      phAiSay('사진을 보는 중…  ' + k + ' / ' + targets.length);
      SUGAI.classify(PH_STAGE[i].u).then(function(r){
        vecs[i] = r.vec;
        var it = PH_STAGE[i];
        if(r.sim >= SUGAI.TH.MATCH && r.margin >= SUGAI.TH.MARGIN){
          it.code = r.code; it.auto = true;
          it.ai = {kind:'auto', code:r.code, sim:r.sim};
          autoN++;
        }else if(r.sim >= SUGAI.TH.RELEVANT){
          it.ai = {kind:'weak', code:r.code, sim:r.sim};
          recN++;
        }else{
          it.ai = {kind:'new', code:null, sim:r.sim, group:null};
          newIdx.push(i);
        }
        setTimeout(step, 0);
      })['catch'](function(){ setTimeout(step, 0); });
    })();

    function finish(){
      /* 처음 보는 장소들끼리 묶기 */
      PH_NEW_GROUPS = [];
      if(newIdx.length){
        var groups = SUGAI.cluster(newIdx.map(function(i){ return vecs[i]; }));
        groups.forEach(function(g, gi){
          var idxs = g.map(function(p){ return newIdx[p]; });
          idxs.forEach(function(i){ PH_STAGE[i].ai.group = gi; });
          PH_NEW_GROUPS.push({idxs:idxs, code:''});
        });
      }
      if(btn) btn.disabled = false;
      phAiSay('자동 배정 ' + autoN + '장 · 추천 ' + recN + '장 · 처음 보는 장소 '
              + newIdx.length + '장' + (PH_NEW_GROUPS.length ? ' (' + PH_NEW_GROUPS.length + '묶음)' : ''));
      phSortRender();
    }
  })['catch'](function(){
    if(btn) btn.disabled = false;
    phAiSay('AI 모델을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');
  });
}

function phAiClear(){
  PH_STAGE.forEach(function(x){
    if(x.ai && x.ai.kind === 'auto' && x.auto) x.code = '';
    delete x.ai;
  });
  PH_NEW_GROUPS = [];
  phAiSay('');
  phSortRender();
}

/* 처음 보는 장소 묶음을 화면에 그린다 */
function phNewGroupsRender(){
  var box = document.getElementById('phNewGroups');
  if(!box) return;
  if(!PH_NEW_GROUPS.length){ box.innerHTML = ''; return; }
  var h = '';
  PH_NEW_GROUPS.forEach(function(g, gi){
    var alive = g.idxs.filter(function(i){ return PH_STAGE[i] && !PH_STAGE[i].code; });
    if(!alive.length) return;
    h += '<div class="ngCard">' +
         '<div class="ngHd">🆕 처음 보는 장소 ' + (gi+1) + ' — 사진 ' + alive.length + '장</div>' +
         '<div class="ngThumbs">';
    alive.slice(0,8).forEach(function(i){ h += '<img src="'+PH_STAGE[i].u+'" alt="">'; });
    h += '</div><div class="ngRow">' +
         '<input type="text" id="ngCode_'+gi+'" placeholder="이 장소 이름 (예: 옥상, RF, 13210)">' +
         '<button onclick="phNewGroupApply('+gi+')">이 묶음에 적용</button>' +
         '</div>' +
         '<div class="ngTip">AI가 이 사진들을 같은 장소로 봤지만, 앱에 등록된 어떤 곳과도 다릅니다.<br>' +
         '이름을 한 번만 정해주면 다음부터 AI가 이 장소를 알아봅니다.<br>' +
         '<b>한글 이름도 됩니다</b> — 「옥상」처럼 적어두면 제보 메모에 "옥상"이라고 쓴 것도 AI가 알아봅니다.</div>' +
         '</div>';
  });
  box.innerHTML = h;
}

function phNewGroupApply(gi){
  var g = PH_NEW_GROUPS[gi];
  if(!g) return;
  var el = document.getElementById('ngCode_'+gi);
  var code = el ? el.value.trim().toUpperCase() : '';
  if(!code){ alert('이 장소 이름을 입력해 주세요. (예: 13210, HALL3L)'); return; }
  if(typeof SUGAI!=='undefined' && SUGAI.SCOPE && !SUGAI.SCOPE.allow(code)){
    if(!confirm('「'+code+'」은 건의함 접수 범위(지하 1층~5층·출입문) 밖입니다.\n앱에 사진은 넣을 수 있지만, 이 장소 제보는 AI가 받지 않습니다.\n그래도 넣을까요?')) return;
  }
  g.idxs.forEach(function(i){
    if(PH_STAGE[i] && !PH_STAGE[i].code){
      PH_STAGE[i].code = code;
      PH_STAGE[i].auto = false;
      if(PH_STAGE[i].ai) PH_STAGE[i].ai = {kind:'auto', code:code, sim:1};
    }
  });
  g.code = code;
  phAiSay('처음 보는 장소 ' + (gi+1) + ' → ' + code + ' 로 지정했습니다. 「넣기」를 누르면 AI가 배웁니다.');
  phSortRender();
}

/* 학습 현황 표시 (사진 등록 화면) */
function phAiLearnRender(){
  var el = document.getElementById('phAiLearn');
  if(!el || typeof SUGAI === 'undefined') return;
  var st = SUGAI.learnStats();
  if(!st.n){ el.innerHTML = ''; return; }
  var codes = Object.keys(st.codes).sort();
  el.innerHTML = '🤖 AI가 추가로 배운 사진 <b>' + st.n + '장</b> · 위치 ' + codes.length + '곳 (' +
                 codes.slice(0,8).join(', ') + (codes.length>8 ? ' 외' : '') + ')' +
                 '<br><span style="cursor:pointer;text-decoration:underline" onclick="phAiForget()">배운 것 지우기</span>';
}
function phAiForget(){
  if(!confirm('AI가 추가로 배운 내용을 모두 지울까요?\n(앱에 원래 들어있던 사진 학습은 그대로 남습니다)')) return;
  SUGAI.forgetAll();
  phAiLearnRender();
}

/* ══════════ 넣을 위치 확인 / 직접 배치 ══════════
   PH_STAGE : 아직 ROOM_PHOTOS에 반영되지 않은 대기 사진들
              [{n:파일명, u:데이터URL, code:'13524'|'', auto:자동분류여부, sel:선택여부}] */
var PH_STAGE = [];
var PH_ONLY_NONE = false;      // '미지정만 보기' 필터
var PH_PICK_IDX = -1;          // 위치 고르기 대상 (-1 = 선택한 것 여러 장)

/* 고를 수 있는 모든 위치 목록 — 공용 자리 + 실제로 존재하는 모든 호실 */
/* 층 구분값(f) : 'BLD'=건물 외부, 'B1'=지하 1층, 1~5=해당 층
   ft = 그 층을 가리키는 검색어 모음. 호실 이름에는 '3층' 같은 표기가 없어서
        '3층'으로 검색해도 공용 자리만 나왔는데, 이 값을 같이 훑어 층 검색이 되게 한다. */
var PH_FLOOR_TABS = [
  {f:null,  name:'전체'},
  {f:'BLD', name:'건물 외부'},
  {f:'B1',  name:'지하'},
  {f:1, name:'1층'}, {f:2, name:'2층'}, {f:3, name:'3층'},
  {f:4, name:'4층'}, {f:5, name:'5층'}
];
function phFloorWords(f){
  if(f === 'BLD') return '건물 외부 바깥 정면 출입문 외관 bld';
  if(f === 'B1')  return '지하 지하1층 지하 1층 b1 지하층';
  return f + '층 ' + f + ' 층 ' + f + 'f';
}
function phTargets(){
  var out = [];
  out.push({code:'BLD', label:'건물 외부 · 출입문', g:'건물 외부', f:'BLD'});
  out.push({code:'B1',  label:'지하 1층',          g:'지하 1층',   f:'B1'});
  for(var i=1;i<=5;i++){
    out.push({code:'EV'+i,       label:i+'층 엘리베이터 앞', g:i+'층 공용', f:i});
    out.push({code:'HALL'+i+'L', label:i+'층 왼쪽 복도',    g:i+'층 공용', f:i});
    out.push({code:'HALL'+i+'R', label:i+'층 오른쪽 복도',  g:i+'층 공용', f:i});
    out.push({code:'WC'+i,       label:i+'층 화장실',       g:i+'층 공용', f:i});
    out.push({code:'ES'+i,       label:i+'층 계단',         g:i+'층 공용', f:i});
    out.push({code:'EMS'+i,      label:i+'층 비상계단',     g:i+'층 공용', f:i});   /* v79 */
    if(i === 4) out.push({code:'KTC', label:'KTC 동아리방',  g:'4층 공용', f:4});
  }
  Object.keys(VALID_FULL5).sort().forEach(function(c){
    var f = phFloorOf(c);
    out.push({code:c, label:c+'호'+(ROOM_NAME[c] ? ' · '+ROOM_NAME[c] : ''),
              g:(f||'?')+'층 호실', f:(f||null)});
  });
  out.forEach(function(t){ t.ft = (t.f===null) ? '' : phFloorWords(t.f); });
  // 층 단추로 걸렀을 때 '공용 자리 → 호실' 순서가 되도록 층 기준으로 안정 정렬
  return out;
}
function phDestName(code){
  if(!code) return '미지정';
  if(PH_LABEL[code]) return PH_LABEL[code];
  if(/^\d{5}/.test(code)) return code+'호'+(ROOM_NAME[code.split('-')[0]] ? ' · '+ROOM_NAME[code.split('-')[0]] : '');
  return code;
}
function phStageStats(){
  var n = {tot:PH_STAGE.length, none:0, sel:0};
  PH_STAGE.forEach(function(x){ if(!x.code) n.none++; if(x.sel) n.sel++; });
  return n;
}
function phSortRender(){
  var box = document.getElementById('phSortList');
  if(!box) return;
  var st = phStageStats();
  var sum = document.getElementById('phSortSum');
  if(sum){
    sum.innerHTML = '사진 <b>'+st.tot+'장</b> 중 자동으로 위치를 찾은 것 <b>'+(st.tot-st.none)+'장</b>'
      + (st.none ? ', <b class="warn">미지정 '+st.none+'장</b>' : '')
      + (st.sel ? '<br>선택됨 <b>'+st.sel+'장</b>' : '')
      + (PH_SKIP.length ? '<br><span style="color:#7C8AA0">읽지 못한 파일 '+PH_SKIP.length+'개는 제외했습니다.</span>' : '');
  }
  var f = document.getElementById('phOnlyNone');
  if(f){ f.classList.toggle('on', PH_ONLY_NONE); f.disabled = !st.none && !PH_ONLY_NONE; }
  var bb = document.getElementById('phBulkBtn');
  if(bb) bb.disabled = !st.sel;
  var cb = document.getElementById('phCommitBtn');
  if(cb) cb.textContent = (st.tot-st.none) ? ((st.tot-st.none)+'장 넣기') : '넣기';

  if(typeof phNewGroupsRender === 'function') phNewGroupsRender();
  box.innerHTML = '';
  if(!st.tot){
    var e = document.createElement('div'); e.className='mini';
    e.textContent = '대기 중인 사진이 없습니다.';
    box.appendChild(e); return;
  }
  PH_STAGE.forEach(function(it, idx){
    if(PH_ONLY_NONE && it.code) return;
    var d = document.createElement('div');
    d.className = 'pit' + (it.sel ? ' sel' : '') + (it.code ? '' : ' none');
    var tick = document.createElement('div'); tick.className='tick'; tick.textContent = it.sel ? '✓' : '';
    var im = document.createElement('img'); im.src = it.u; im.alt='';
    var meta = document.createElement('div'); meta.className='meta';
    var fn = document.createElement('div'); fn.className='fn'; fn.textContent = it.n;
    var bt = document.createElement('button');
    bt.className = 'dest' + (it.code ? '' : ' empty');
    bt.innerHTML = (it.code ? '📍 ' : '⚠ ') + phDestName(it.code)
                 + (it.code && it.auto ? '<span class="auto">자동</span>' : '');
    bt.onclick = function(ev){ ev.stopPropagation(); phPickOpen(idx); };
    meta.appendChild(fn); meta.appendChild(bt);
    /* v45 : AI가 본 결과를 카드에 함께 보여준다 */
    if(it.ai){
      var rec = document.createElement('span');
      rec.className = 'aiRec' + (it.ai.kind==='new' ? ' newp' : (it.ai.kind==='weak' ? ' warn' : ''));
      if(it.ai.kind === 'new'){
        rec.textContent = '🤖 새로운 장소 ' + (it.ai.group!=null ? '묶음 '+(it.ai.group+1) : '');
      }else{
        rec.textContent = '🤖 ' + (it.ai.kind==='auto' ? '자동 배정 ' : '추천 ')
                        + it.ai.code + ' ' + Math.round(it.ai.sim*100) + '%';
      }
      meta.appendChild(rec);
    }
    var rm = document.createElement('button'); rm.className='drop1'; rm.textContent='✕';
    rm.title = '이 사진 빼기';
    rm.onclick = function(ev){ ev.stopPropagation(); PH_STAGE.splice(idx,1); phSortRender(); };
    // 카드를 누르면 선택 토글 (여러 장을 한꺼번에 같은 위치로 보낼 때 씀)
    d.onclick = function(){ it.sel = !it.sel; phSortRender(); };
    d.appendChild(tick); d.appendChild(im); d.appendChild(meta); d.appendChild(rm);
    box.appendChild(d);
  });
}
function phSortToggleFilter(){ PH_ONLY_NONE = !PH_ONLY_NONE; phSortRender(); }
function phSortSelectAll(){
  PH_STAGE.forEach(function(x){ if(!PH_ONLY_NONE || !x.code) x.sel = true; });
  phSortRender();
}
function phSortSelectNone(){ PH_STAGE.forEach(function(x){ x.sel = false; }); phSortRender(); }

/* ── 위치 고르기 오버레이 ── */
function phPickOpen(idx){
  PH_PICK_IDX = idx;
  var t = document.getElementById('phPickTitle');
  if(t){
    if(idx < 0){ t.textContent = '선택한 '+phStageStats().sel+'장을 어디에?'; }
    else{ t.textContent = '이 사진을 어디에?'; }
  }
  var q = document.getElementById('phPickQ');
  if(q){ q.value=''; }
  // 이미 위치가 정해진 사진이면 그 층을 미리 골라 둬서, 같은 층 안에서 바꾸기 쉽게 한다.
  PH_PICK_FLOOR = null;
  if(idx >= 0 && PH_STAGE[idx] && PH_STAGE[idx].code){
    var cur = PH_STAGE[idx].code;
    PH_PICK_FLOOR = (cur === 'BLD') ? 'BLD' : (cur === 'B1' ? 'B1' : (phFloorOf(cur) || null));
  }
  phPickFloorTabs();
  phPickRender('');
  var p = document.getElementById('phPick');
  if(p) p.classList.add('on');
}
function phPickClose(){
  var p = document.getElementById('phPick');
  if(p) p.classList.remove('on');
}
var PH_PICK_FLOOR = null;      // 층 단추로 걸러 놓은 층 (null = 전체)
/* '3층' '지하' '건물 외부'처럼 층만 가리키는 검색어는 글자 겹침으로 찾지 않고
   그 층 전체를 곧바로 보여준다. (안 그러면 '1층'을 쳤을 때 이름에 '1층'이 들어간
   '지하 1층'까지 섞여 나온다) */
function phFloorFromQuery(q){
  var t = String(q||'').replace(/\s+/g,'').toLowerCase();
  if(!t) return undefined;
  if(/^(지하|지하층|지하1층|b1)$/.test(t)) return 'B1';
  if(/^(건물외부|건물|외부|바깥|정면|외관|bld)$/.test(t)) return 'BLD';
  var m = t.match(/^([1-5])\s*(층|f)$/);
  if(m) return parseInt(m[1],10);
  return undefined;
}
function phPickFloorTabs(){
  var box = document.getElementById('phPickFloors');
  if(!box) return;
  box.innerHTML = '';
  PH_FLOOR_TABS.forEach(function(t){
    var b = document.createElement('button');
    b.textContent = t.name;
    if(PH_PICK_FLOOR === t.f) b.className = 'on';
    b.onclick = function(){
      PH_PICK_FLOOR = t.f;
      phPickFloorTabs();
      var q = document.getElementById('phPickQ');
      phPickRender(q ? q.value : '');
    };
    box.appendChild(b);
  });
}
function phPickRender(q){
  var box = document.getElementById('phPickList');
  if(!box) return;
  q = String(q||'').trim().toLowerCase();
  var all = phTargets();
  // ① 층 단추로 먼저 거르고 ② 검색어로 거른다.
  //    검색어는 이름·호실번호뿐 아니라 층 표기(ft)까지 훑기 때문에
  //    '3층'이라고만 쳐도 3층 공용 자리와 3층 호실이 전부 나온다.
  var qf = phFloorFromQuery(q);
  var hit = all.filter(function(t){
    if(PH_PICK_FLOOR !== null && t.f !== PH_PICK_FLOOR) return false;
    if(!q) return true;
    if(qf !== undefined) return t.f === qf;                 // 층만 가리키는 검색어
    return (t.code+' '+t.label+' '+t.ft).toLowerCase().indexOf(q) >= 0;
  });
  box.innerHTML = '';
  if(!hit.length){
    var e=document.createElement('div'); e.className='pkg';
    e.textContent = (PH_PICK_FLOOR !== null && q) ? '그 층에는 찾는 위치가 없습니다.' : '찾는 위치가 없습니다.';
    box.appendChild(e); return;
  }
  // 목록은 스크롤되므로 층 하나가 통째로 나와도 괜찮지만, 지나치게 길어지는 것만 막는다
  if(hit.length > 220) hit = hit.slice(0, 220);
  var lastG = null;
  hit.forEach(function(t){
    if(t.g !== lastG){
      var g=document.createElement('div'); g.className='pkg'; g.textContent=t.g;
      box.appendChild(g); lastG=t.g;
    }
    var have = (ROOM_PHOTOS[t.code]||[]).length;
    var b=document.createElement('button'); b.className='pko';
    b.innerHTML = t.label + '<small>'+t.code+'</small>' + (have ? '<em>이미 '+have+'장</em>' : '');
    b.onclick = function(){ phPickApply(t.code); };
    box.appendChild(b);
  });
}
function phPickApply(code){
  if(PH_PICK_IDX >= 0){
    var it = PH_STAGE[PH_PICK_IDX];
    if(it){ it.code = code; it.auto = false; }
  }else{
    PH_STAGE.forEach(function(x){ if(x.sel){ x.code = code; x.auto = false; x.sel = false; } });
  }
  phPickClose();
  phSortRender();
}

/* ── 실제로 넣기 / 취소 ── */
function phSortCommit(){
  var st = phStageStats();
  if(!(st.tot - st.none)){ alert('넣을 위치가 지정된 사진이 없습니다.'); return; }
  if(st.none && !confirm('위치가 미지정인 '+st.none+'장은 넣지 않고 그대로 둡니다. 계속할까요?')) return;
  var ok = 0, dup = 0, left = [];
  PH_STAGE.forEach(function(x){
    if(!x.code){ x.sel=false; left.push(x); return; }
    if(!ROOM_PHOTOS[x.code]) ROOM_PHOTOS[x.code] = [];
    var already = ROOM_PHOTOS[x.code].some(function(p){ return p.n === x.n; });
    if(already){ dup++; return; }
    ROOM_PHOTOS[x.code].push({n:x.n, u:x.u});
    /* v45 : 넣는 순간 AI에게도 가르친다 — 이 사진이 이 위치라는 것 */
    if(typeof SUGAI !== 'undefined') SUGAI.learn(x.code, x.u, x.n);
    ok++;
  });
  PH_STAGE = left;
  phNormalize();
  if(typeof phRebuildRoomNames === 'function') phRebuildRoomNames();
  go('sph');
  phRender();
  phSay('사진 '+ok+'장을 넣었습니다.'
        + (dup ? ' (같은 이름 '+dup+'장 건너뜀)' : '')
        + (left.length ? ' 미지정 '+left.length+'장은 대기 중입니다.' : ''), 100);
}
function phSortCancel(){
  if(PH_STAGE.length && !confirm('대기 중인 사진 '+PH_STAGE.length+'장을 버릴까요?')) return;
  PH_STAGE = []; PH_ONLY_NONE = false;
  phPickClose();
  go('sph');
  phRender();
}

function phRender(){
  var badge = document.getElementById('phBadge');
  var tot = phCount();
  if(badge) badge.textContent = tot ? '(' + tot + '장)' : '';
  var list = document.getElementById('phList');
  if(!list) return;
  list.innerHTML = '';
  var per = {1:0,2:0,3:0,4:0,5:0}, rooms = {1:0,2:0,3:0,4:0,5:0};
  for(var k in ROOM_PHOTOS){
    var f = phFloorOf(k);
    if(f){ per[f] += ROOM_PHOTOS[k].length; rooms[f]++; }
  }
  var com = 0;
  ['BLD','B1'].forEach(function(k){ if(ROOM_PHOTOS[k]) com += ROOM_PHOTOS[k].length; });
  var cd = document.createElement('div'); cd.className = 'fl';
  cd.innerHTML = '<span><b style="color:#E8EDF2;font-size:13px;">건물 외부 · 지하</b></span>' +
                 '<b class="' + (com ? '' : 'zero') + '">' + (com ? com + '장' : '없음') + '</b>';
  list.appendChild(cd);
  [1,2,3,4,5].forEach(function(f){
    var d = document.createElement('div'); d.className = 'fl';
    d.innerHTML = '<span><b style="color:#E8EDF2;font-size:13px;">' + f + '층</b> &nbsp;호실 ' + rooms[f] + '곳</span>' +
                  '<b class="' + (per[f] ? '' : 'zero') + '">' + (per[f] ? per[f] + '장' : '없음') + '</b>';
    list.appendChild(d);
  });
  if(PH_STAGE.length){
    var q = document.createElement('div'); q.className = 'fl';
    q.style.borderColor = '#FF2E88';
    q.innerHTML = '<span><b style="color:#E8EDF2;font-size:13px;">위치를 못 정한 사진</b></span>'
                + '<b style="color:#FF2E88;">' + PH_STAGE.length + '장</b>';
    q.style.cursor = 'pointer';
    q.onclick = function(){ go('phsort'); };
    list.appendChild(q);
  }
  if(PH_SKIP.length){
    var w = document.createElement('div'); w.className = 'mini';
    w.innerHTML = '이미지로 읽지 못해 넘어간 파일 ' + PH_SKIP.length + '개<br>' +
                  PH_SKIP.slice(0,6).map(function(x){ return '· ' + x; }).join('<br>') +
                  (PH_SKIP.length>6 ? '<br>…' : '');
    list.appendChild(w);
  }
  phFill(document.getElementById('bld'), 'BLD', '[ 공대 3호관 정면 사진 ]');
  if(!phBusy) phSay(tot ? '사진 ' + tot + '장이 들어 있습니다.' : '아직 등록된 사진이 없습니다.', tot?100:0);
}

function phClear(){
  if(!confirm('등록한 사진을 모두 지울까요?')) return;
  ROOM_PHOTOS = {}; PH_SKIP = []; phRender();
}

/* 파일 하나를 내려받게 한다 */
function saveBlob(blob, name){
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 6000);
}

/* 사진 자료 묶음(zip) 내려받기 — 지금 앱의 사진 목록을 site/ 폴더 모양 그대로 담는다.
     data/photos.js            사진 목록 (장소 → [{n, u, cap}])
     data/photos/<장소>/…      이 기기에서 새로 넣은 사진 (이미 파일인 사진은 목록에만 적는다)
   압축을 site/ 에 그대로 풀고 올리면 모든 사용자에게 적용된다.
   서버에서 온 사진(관리자 승인)은 서버에 있으므로 담지 않는다.
   (예전에는 사진을 글자로 바꿔 박은 index.html 한 파일을 내려받게 했다 — 그래서 앱이 18MB 였다) */
function phExport(){
  if(!phCount()){ alert('먼저 사진을 넣어주세요.'); return; }
  if(typeof JSZip === 'undefined'){ alert('묶음 도구(JSZip)를 불러오지 못했습니다.'); return; }
  var zip = new JSZip(), idx = {}, nNew = 0, nAll = 0;
  var t = new Date(), p2 = function(v){ return (v < 10 ? '0' : '') + v; };
  var stamp = '' + t.getFullYear() + p2(t.getMonth() + 1) + p2(t.getDate()) + p2(t.getHours()) + p2(t.getMinutes());
  /* 출입문 목록(GATE_*)은 켤 때마다 phBuildGateLists 가 BLD 사진을 가리켜 다시 만든다 — 담지 않는다 */
  var owned = [];
  Object.keys(ROOM_PHOTOS).forEach(function(code){ if(!/^GATE_/.test(code)) owned = owned.concat(ROOM_PHOTOS[code] || []); });
  Object.keys(ROOM_PHOTOS).sort().forEach(function(code){
    var safe = code.replace(/[^A-Za-z0-9_\-]/g, '_');
    var list = (ROOM_PHOTOS[code] || []).filter(function(p){
      return p && p.u && !p.pid && !(/^GATE_/.test(code) && owned.indexOf(p) >= 0);
    });
    if(!list.length) return;
    idx[code] = list.map(function(p, i){
      var e = {n:p.n}, m = /^data:image\/([a-z+.-]+);base64,(.*)$/.exec(p.u);
      if(m){
        e.u = 'data/photos/' + safe + '/' + stamp + '_' + (i < 9 ? '0' : '') + (i + 1) + '.' + (m[1] === 'png' ? 'png' : 'jpg');
        zip.file(e.u, m[2], {base64:true}); nNew++;
      } else e.u = p.u;
      if(p.cap) e.cap = p.cap;
      nAll++;
      return e;
    });
  });
  zip.file('data/photos.js', '/* 장소 사진 목록 — 사진 파일은 data/photos/<장소>/ 에 있다.\n' +
    '   관리자 화면의 \'사진 자료 묶음 내려받기\'가 이 파일과 사진을 함께 만든다. */\n' +
    'window.PHOTO_INDEX = ' + JSON.stringify(idx) + ';\n');
  zip.generateAsync({type:'blob'}).then(function(b){
    saveBlob(b, '사진자료_' + stamp + '.zip');
    alert('사진 ' + nAll + '장(새 사진 ' + nNew + '장)의 목록을 내려받았습니다.\n\n' +
          '압축을 site 폴더에 그대로 풀고(덮어쓰기) GitHub 에 올리면 모든 사용자에게 적용됩니다.');
  })['catch'](function(e){ alert('묶음을 만들지 못했습니다. (' + (e && e.message || e) + ')'); });
}

/* 사진 상자 채우기 (여러 장이면 눌러서 넘김) */
/* 사진 키 폴백 : 13121처럼 3D는 한 코드인데 사진은 -A/-B로 나뉜 경우를 이어줌 */
function phResolve(code){
  if(!code) return code;
  if(ROOM_PHOTOS[code] && ROOM_PHOTOS[code].length) return code;
  var alt = ['-A','-B','-1','-2'];
  for(var i=0;i<alt.length;i++){
    var k = code + alt[i];
    if(ROOM_PHOTOS[k] && ROOM_PHOTOS[k].length) return k;
  }
  return code;
}
/* 건물 외부(BLD) 사진 8장은 정문·후문·동문·서문의 안/밖 캡션이 고정되어 있어
   작은 사전으로 번역해 둔다. 그 외 사진(강의실 등)은 실제 방 이름과 마찬가지로
   고유한 내용이라 자동 번역하지 않고 원문을 그대로 보여준다. */
var CAPTION_EN = {
  '공대3호관(정문)':'Engineering Bldg.3 (Main Gate)',
  '공대3호관(정문내부)':'Engineering Bldg.3 (Main Gate, inside)',
  '공대3호관(후문)':'Engineering Bldg.3 (Back Gate)',
  '공대3호관(후문내부)':'Engineering Bldg.3 (Back Gate, inside)',
  '공대3호관(동문)':'Engineering Bldg.3 (East Gate)',
  '공대3호관(동문내부)':'Engineering Bldg.3 (East Gate, inside)',
  '공대3호관(서문)':'Engineering Bldg.3 (West Gate)',
  '공대3호관(서문내부)':'Engineering Bldg.3 (West Gate, inside)'
};
function capFor(cap){ if(!cap) return cap; return (LANG==='en' && CAPTION_EN[cap]) ? CAPTION_EN[cap] : cap; }
function phCntTxt(k, total){
  return (LANG==='ko') ? ((k+1) + ' / ' + total + ' · 눌러서 다음') : ((k+1) + ' / ' + total + ' · Tap for next');
}
/* 언어 전환 시, 이미 화면에 떠 있는 사진의 설명(cap)·장수 카운터(cnt)만 지금 언어로
   다시 그린다 — 사진 자체나 지금 보고 있는 인덱스(el._phIndex)는 그대로 유지한다. */
function refreshAllPhotoLang(){
  document.querySelectorAll('.photo.has').forEach(function(el){
    var list = el._phList, code = el._phCode;
    if(!list || !list.length) return;
    var idx = el._phIndex || 0;
    var capEl = el.querySelector('.cap'), cntEl = el.querySelector('.cnt');
    if(capEl) capEl.textContent = capFor(list[idx].cap) || phCap(code);
    if(cntEl) cntEl.textContent = phCntTxt(idx, list.length);
  });
}
function phFill(el, code, placeholder){
  code = phResolve(code);
  if(!el) return;
  var list = (code && ROOM_PHOTOS[code]) || [];
  /* v78 : 엘리베이터 앞 사진 뒤에 그 층 라운지 사진을 붙인다. 엘리베이터에서 내리면 보이는 곳이
     라운지인데, 길안내에 라운지 자리가 없어 승인한 라운지 사진이 어디에도 안 보였다.
     설명이 없는 사진은 '엘리베이터 앞'이 아니라 라운지 이름으로 보이게 사본에 설명을 붙인다. */
  var mEv = /^EV([1-5])$/.exec(code || '');
  var lng = mEv ? ROOM_PHOTOS['LNG' + mEv[1]] : null;
  if(lng && lng.length){
    var lnName = (typeof SUGAI !== 'undefined' && SUGAI.codeLabel) ? SUGAI.codeLabel('LNG' + mEv[1]) : ('LNG' + mEv[1]);
    list = list.concat(lng.map(function(p){ return {n:p.n, u:p.u, cap:p.cap || lnName}; }));
  }
  el.innerHTML = ''; el.onclick = null;
  el._phList = null; el._phCode = null;
  if(!list.length){ el.classList.remove('has'); el.textContent = placeholder || ((LANG==='ko')?'[ 사진 없음 ]':'[ No photo ]'); return; }
  el.classList.add('has');
  var i = 0;
  el._phList = list; el._phCode = code; el._phIndex = 0;
  var img = document.createElement('img');
  // 가로로 넓은 사진(건물 전경 등)은 cover로 자르면 안 되므로 통째로 보이게 전환
  // 가로로 넓은 사진(건물 전경 등)은 cover로 자르면 안 되므로 상자를 사진 비율에 맞춰 줄이고,
  // 세로 사진으로 되돌아오면 원래(상자 꽉 채우기) 모양으로 복구한다.
  /* 예전에는 사진의 가로세로 비율에 따라 상자 크기를 바꿔서, 사진마다 틀 크기가 들쭉날쭉했음.
     → 상자 크기는 그대로 두고, 사진을 상자에 맞춰 잘라 꽉 채운다(크기 통일). */
  img.style.objectFit = 'cover';
  img.style.width = '100%';
  img.style.height = '100%';
  img.src = list[0].u; el.appendChild(img);
  var cap = document.createElement('div'); cap.className = 'cap'; cap.textContent = capFor(list[0].cap) || phCap(code); el.appendChild(cap);
  if(list.length > 1){
    var cnt = document.createElement('div'); cnt.className = 'cnt';
    // 사진이 여러 장일 때 '눌러서 넘긴다'는 걸 알 수 있게 카운터에 같이 적어준다
    cnt.textContent = phCntTxt(0, list.length); el.appendChild(cnt);
    el.onclick = function(){
      i = (i+1) % list.length; el._phIndex = i;
      img.src = list[i].u; cap.textContent = capFor(list[i].cap) || phCap(code); cnt.textContent = phCntTxt(i, list.length);
    };
  }
}

/* 입력 연결 */
(function(){
  var f = document.getElementById('phFile'), d = document.getElementById('phDir'), z = document.getElementById('phDrop');
  if(f) f.addEventListener('change', function(){ phAdd(this.files); this.value=''; });
  if(d) d.addEventListener('change', function(){ phAdd(this.files); this.value=''; });
  if(z){
    ['dragenter','dragover'].forEach(function(ev){
      z.addEventListener(ev, function(e){ e.preventDefault(); z.classList.add('over'); });
    });
    ['dragleave','drop'].forEach(function(ev){
      z.addEventListener(ev, function(e){ e.preventDefault(); z.classList.remove('over'); });
    });
    z.addEventListener('drop', function(e){ if(e.dataTransfer && e.dataTransfer.files) phAdd(e.dataTransfer.files); });
  }
  /* 전체 사진 관리의 ＋ 버튼으로 고른 파일 → 눌렀던 그 위치로 바로 넣기 */
  var mf = document.getElementById('sphMgrFile');
  if(mf) mf.addEventListener('change', function(){
    if(sphMgrPickCode) sphMgrAddFiles(sphMgrPickCode, this.files);
    this.value = '';
  });
  /* 사진을 빈 공간에 잘못 떨어뜨리면 브라우저가 그 파일을 열어 버려서, 아직 저장(사진 자료 묶음 내려받기)
     하지 않은 작업 내용이 통째로 날아간다. 문서 전체에서 기본 동작을 막아 실수를 방지한다. */
  document.addEventListener('dragover', function(e){ e.preventDefault(); });
  document.addEventListener('drop', function(e){ e.preventDefault(); });
})();

/* ========== 안내 단계 생성 ========== */
var ORD_EN = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'];
function ordWordEn(k){ return (k>=1 && k<=ORD_EN.length) ? ORD_EN[k-1] : (k+'th'); }
function buildSteps(){
  var lv=target.floor, out=[];
  var sf = startFloor;                        // 지금 계신 층
  var sameFloor = (sf===lv);                  // 목적지와 같은 층이면 엘리베이터 불필요

  /* v147(요청 반영): QR·직접선택으로 문이 정해져 있고 지금 1층이면,
     '그 문으로 들어와 복도로 나온다'를 맨 앞 단계로 하나 더 넣는다(4단계 → 5단계).
     처음 온 사람은 문을 지나 복도까지 나오는 이 첫 구간이 제일 막막하기 때문. */
  var gk = (typeof currentGateKey==='function') ? currentGateKey() : null;
  if(gk && sf===1 && ROOM_PHOTOS['GATE_'+gk]){
    var GN = {MAIN:{ko:'정문', en:'the main gate'},  BACK:{ko:'후문', en:'the back gate'},
              EAST:{ko:'동문', en:'the east gate'}, WEST:{ko:'서문', en:'the west gate'}};
    var gn = GN[gk] || GN.MAIN;
    out.push({a:'↑', type:'straight',
              tko: gn.ko+'으로 들어오세요',
              ten: 'Enter through '+gn.en,
              ph: '[ '+gn.ko+' 사진 ]', code:'GATE_'+gk});
  }
  // 출발층 엘리베이터 앞 사진(있으면). B1은 EV 사진이 없으므로 EV1로 대체.
  var startEV = (typeof sf==='number') ? ('EV'+sf) : 'EV1';
  var sfName = typeof sf==='number' ? lvName(sf) : lvName(1);

  /* 멘트 규칙 : 한 줄에 들어가게 짧게, 모두 '~세요'로 끝을 맞춘다.
     예전에는 '~으로 이동'(명사끝)과 '~하세요'가 섞여 있고 문장이 길어 두 줄로 넘어갔다. */
  if(!sameFloor){
    var goUp = lvIndex(lv) > lvIndex(sf);
    out.push({a: goUp?'↑':'↓', type:'lift',
              tko: '엘리베이터로 '+lvName(lv)+'까지 '+(goUp?'올라가세요':'내려가세요'),
              ten: 'Take the elevator '+(goUp?'up to ':'down to ')+lvName(lv),
              ph:'['+sfName+' 엘리베이터 사진 ]', code:startEV});
  }
  if(target.kind==='zone'){
    if(sameFloor) out.push({a:'↑', type:'straight', tko:'정면 넓은 곳으로 가세요', ten:'Head to the open area ahead', ph:'[ 지하 1층 사진 ]', code:'B1'});
    else          out.push({a:'↑', type:'straight', tko:'내려서 정면으로 가세요', ten:'Get off and head to the open area ahead', ph:'[ 지하 1층 사진 ]', code:'B1'});
    out.push({a:'✓', type:'arrive', tko:'크리에이티브 존에 도착했습니다', ten:'You have arrived at the Creative Zone', ph:'[ 크리에이티브 존 사진 ]', code:'B1'});
    return out;
  }

  var p=targetPos();
  /* ── 좌우 안내 기준 ────────────────────────────────────────────
     '어느 쪽으로 도는가'와 '방이 어느 쪽에 있는가'는 서로 다른 기준이다.
     예전에는 둘 다 방의 X좌표 하나로 정해서, 13524처럼
     "왼쪽으로 돈 뒤 오른쪽 끝"에 있는 방을 "왼쪽 세 번째"라고 잘못 안내했다.

       · 엘리베이터(x=+6.3)에서 복도로 나오면 −X 방향을 보고 선다
       · −X를 보고 서면 왼손 쪽이 +Z  → 목적지가 +Z 쪽이면 '왼쪽으로 돈다'
       · +Z를 보고 걸으면 왼손 쪽이 +X → 목적지가 −X면 '오른쪽에 있다'

     13524(x=−6.3, z=+18.3) → 왼쪽으로 돌고, 오른쪽에 있다. 실제와 일치.
     혹시 현장에서 전부 반대로 느껴지면 GUIDE_FLIP만 true로 바꾸면 된다. */
  var GUIDE_FLIP = false;
  var evp   = evXZ(lv);
  var faceX = (evp.x >= 0) ? -1 : 1;                  // 엘리베이터에서 복도로 나오는 방향
  var dz    = (p.z >= evp.z) ? 1 : -1;                // 복도에서 걸어갈 방향
  var turnLeft = ((dz === -faceX) !== GUIDE_FLIP);            // 내려서 도는 방향

  /* v150(요청 반영): 문으로 들어와 같은 층(1층)을 찾아갈 때는 엘리베이터를 아예
     거치지 않는다 → '엘리베이터 앞에서 왼쪽으로' 같은 안내가 맞지 않았다.
     기준점을 '들어온 문'으로 바꾸고, 방향·차례·거리 표현을 전부 다시 잡는다.
       · 동문(복도 남쪽 끝) : 들어서면 이미 복도 정면(+Z) → 돌 필요 없음
       · 서문(복도 북쪽 끝) : 들어서면 이미 복도 정면(-Z) → 돌 필요 없음
       · 정문(-X 옆벽)     : 복도로 나와 좌/우로 한 번 돈다
       · 후문(+X 계단홀)   : 복도로 나와 좌/우로 한 번 돈다                    */
  var fromGateHere = !!(gk && sf===1 && lv===1);
  var gateFace = null, gateZ = 0;
  if(fromGateHere){
    if(gk==='EAST'){ gateZ = GLOBAL_BOT_Z;                     gateFace = 'Z+'; }
    else if(gk==='WEST'){ gateZ = GLOBAL_TOP_Z;                gateFace = 'Z-'; }
    else if(gk==='BACK'){ gateZ = (FLOOR_LAYOUT[1]||{}).stZ||0; gateFace = 'X-'; }
    else {                gateZ = 0;                            gateFace = 'X+'; }
    dz = (p.z >= gateZ) ? 1 : -1;
    /* 몸이 향한 쪽 기준 왼손 방향 : +Z를 보면 왼손이 +X, -X를 보면 왼손이 +Z
       (기존 주석의 규칙을 그대로 따른다) */
    if(gateFace==='X+')      turnLeft = (dz === -1);   // +X를 보면 왼손이 -Z
    else if(gateFace==='X-') turnLeft = (dz ===  1);   // -X를 보면 왼손이 +Z
    else                     turnLeft = false;         // 이미 복도 정면 — 돌지 않는다
    if(GUIDE_FLIP) turnLeft = !turnLeft;
  }
  var noTurn = !!(fromGateHere && (gateFace==='Z+' || gateFace==='Z-'));
  var roomLeft = ((((p.x > 0) ? 1 : -1) === dz) !== GUIDE_FLIP);  // 걷는 동안 방이 있는 쪽
  var turnWord = turnLeft ? '왼쪽' : '오른쪽';
  var turnWordEn = turnLeft ? 'left' : 'right';
  var arw      = turnLeft ? '←' : '→';
  var side     = roomLeft ? '왼쪽' : '오른쪽';
  var sideEn   = roomLeft ? 'left' : 'right';
  var lead = fromGateHere ? '복도로 나와 ' : (sameFloor ? '엘리베이터 앞에서 ' : '내려서 ');
  var leadEn = fromGateHere ? 'Step into the hallway and turn '
                            : (sameFloor ? 'At the elevator, turn ' : 'Get off and turn ');
  /* v151(요청 반영): 돌기 단계 사진.
     예전엔 문에서 출발하면 1단계와 똑같은 문 사진을 그대로 다시 썼다 —
     "복도로 나와 왼쪽으로 도세요"인데 화면은 아직 문 앞이라 어긋났다.
     이 단계에서 실제로 보게 되는 건 '돌아선 쪽 복도'이므로 그 사진을 쓴다.
     (엘리베이터에서 출발할 때는 예전대로 엘리베이터 앞 사진) */
  var turnPhCode = fromGateHere ? ('HALL'+lv+(turnLeft?'L':'R')) : ('EV'+lv);
  var turnPhTxt  = fromGateHere ? ('['+lvName(lv)+' 복도 사진 ]')
                                : ('['+lvName(lv)+' 엘리베이터 앞 사진 ]');

  if(target.kind==='toilet'){
    out.push({a:arw, type:'turn', tko:'복도 건너 '+turnWord+'으로 가세요', ten:'Cross the hallway to the '+turnWordEn, ph:turnPhTxt, code:turnPhCode});
    out.push({a:'✓', type:'arrive', tko:'화장실에 도착했습니다', ten:'You have arrived at the restroom', ph:'[ 화장실 앞 사진 ]', code:'WC'+lv});
    return out;
  }

  if(target.kind==='emstair'){
    // 비상계단은 복도 맨 끝(강의실보다 더 바깥쪽)에 있으므로, 화장실처럼 바로 옆이 아니라
    // 강의실 안내처럼 "돌기 → 복도를 따라 쭉 → 도착" 3단계로 안내한다.
    if(!noTurn)   // v150: 동문·서문으로 들어오면 이미 복도 정면이라 돌 필요가 없다
      out.push({a:arw, type:'turn', tko:lead+turnWord+'으로 도세요', ten:leadEn+turnWordEn, ph:turnPhTxt, code:turnPhCode});
    out.push({a:'↑', type:'straight', tko:'복도 끝까지 쭉 가세요', ten:'Go straight to the end of the hallway', ph:'['+lvName(lv)+' 복도 사진 ]',
              code:'HALL'+lv+(turnLeft?'L':'R')});
    out.push({a:'✓', type:'arrive', tko:'비상계단에 도착했습니다', ten:'You have arrived at the emergency stairs', ph:'[ 비상계단 사진 ]', code:'EMS'+lv});   /* v79 : ES 는 중앙계단 */
    return out;
  }

  // 강의실
  var L=FLOOR_LAYOUT[lv];
  var nearCore = Math.abs(p.z) < UNIT_Z*1.4;
  var farEdge  = p.z>0 ? (p.z > L.topOuterZ*0.6) : (p.z < L.bottomOuterZ*0.6);
  var distTxt = nearCore ? '엘리베이터에서 가까운 곳' : (farEdge ? '복도 끝 쪽' : '복도 중간쯤');
  var distTxtEn = nearCore ? 'near the elevator' : (farEdge ? 'near the end of the hallway' : 'in the middle of the hallway');
  var ord = roomOrdinal(lv, p);   // 엘리베이터(코어)에서 세어 몇 번째 방인지
  /* v150: 동문·서문은 복도 '끝'에서 들어오므로, 코어에서 센 차례를 뒤집어야
     들어온 사람 기준의 차례가 된다(끝에서 첫 번째 = 코어 기준 마지막). */
  /* 단, roomOrdinal은 '코어 기준 같은 Z반쪽'만 세므로, 목적지가 그 문과 같은
     반쪽에 있을 때만 뒤집는 게 맞다. 반대쪽 방은 어차피 코어를 지나가므로
     코어 기준 차례가 그대로 맞다. */
  if(fromGateHere && ord && ord.n && ord.total &&
     ((gk==='EAST' && p.z < 0) || (gk==='WEST' && p.z > 0)))
    ord = {n: ord.total - ord.n + 1, total: ord.total};
  var _rtKo = roomTitle(target.code, 'ko');
  var _rtEn = roomTitle(target.code, 'en');

  if(!noTurn)   // v150: 동문·서문으로 들어오면 이미 복도 정면이라 돌 필요가 없다
    out.push({a:arw, type:'turn', tko:lead+turnWord+'으로 도세요', ten:leadEn+turnWordEn, ph:turnPhTxt, code:turnPhCode});
  /* 문 바로 앞 방(들어와서 첫 번째)이면 '쭉 가세요'가 오히려 헷갈린다 → 생략 */
  var justInside = !!(fromGateHere && ord && ord.n === 1);
  if(!justInside)
    out.push({a:'↑', type:'straight', tko:'복도를 따라 쭉 가세요', ten:'Go straight down the hallway', ph:'['+lvName(lv)+' 복도 사진 ]',
              code:'HALL'+lv+(turnLeft?'L':'R')});
  // '복도 중간쯤'처럼 두루뭉술한 표현 대신, 엘리베이터에서 몇 번째 문인지 세어서 알려준다.
  // 호실번호·이름은 화면 맨 위 제목("13524호 · PC실 가는 길")에 이미 있으므로 여기서는 뺀다.
  // 그 줄의 마지막 방이면 몇 번째인지 세는 것보다 '맨 끝'이 훨씬 잘 와닿는다.
  var arriveTxtKo, arriveTxtEn, _where;
  if(ord.n && ord.n === ord.total && ord.total >= 2){
    _where = side+' 맨 끝에 ';
    arriveTxtEn = _rtEn+' is at the far '+sideEn+' end.';
  } else if(ord.n){
    _where = side+'에서 '+ordWord(ord.n)+' 방에 ';
    arriveTxtEn = _rtEn+' is the '+ordWordEn(ord.n)+' room on the '+sideEn+'.';
  } else {
    _where = distTxt+'에 ';
    arriveTxtEn = _rtEn+' is '+distTxtEn+'.';
  }
  arriveTxtKo = _where + _rtKo + subjParticle(_rtKo) + ' 있습니다';
  out.push({a:'✓', type:'arrive', tko:arriveTxtKo, ten:arriveTxtEn,
            ph:'[ '+target.code+'호 문 앞 사진 ]', code:target.code});
  return out;
}
/* 엘리베이터에서 복도를 따라 걸어갈 때, 목적지가 그쪽 줄에서 몇 번째 문인지 센다.
   (같은 쪽 벽 = x부호 같음, 같은 방향 = z부호 같음. 가벽으로 나뉜 방은 한 칸으로 묶어 센다) */
/* '1번째 방'은 어색하므로 우리말 차례말로 바꾼다(첫·두·세…). 열을 넘으면 숫자 그대로. */
var ORD_KO = ['첫','두','세','네','다섯','여섯','일곱','여덟','아홉','열'];
function ordWord(k){ return (k>=1 && k<=ORD_KO.length) ? (ORD_KO[k-1]+' 번째') : (k+'번째'); }
function roomOrdinal(lv, p){
  var L = FLOOR_LAYOUT[lv];
  if(!L || !L.cells || !L.lookup || !target || !target.code) return 0;
  var tc = L.lookup[target.code];
  if(!tc) return 0;
  // lookup 항목은 {cells:[...], x, z} 형태라 코드·parent는 cells[0]에서 꺼내야 한다
  var tCell = (tc.cells && tc.cells[0]) ? tc.cells[0] : null;
  var tKey = tCell ? (tCell.parent || tCell.code) : target.code;
  var seen = {}, list = [];
  L.cells.forEach(function(c){
    if(!c.code || c.searchable===false) return;
    if((c.x>0) !== (p.x>0)) return;      // 복도 반대쪽 벽
    if((c.z>0) !== (p.z>0)) return;      // 코어 기준 반대 방향
    var key = c.parent || c.code;
    if(seen[key]) return;
    seen[key] = 1;
    list.push({key:key, z:Math.abs(c.z)});
  });
  list.sort(function(a,b){ return a.z - b.z; });   // 코어에서 가까운 순
  for(var i=0;i<list.length;i++) if(list[i].key===tKey) return {n:i+1, total:list.length};
  return {n:0, total:0};
}
function refreshGuideTitles(){
  var t6=document.getElementById('t6'), t7=document.getElementById('t7');
  if(!t6 || !target) return;
  t6.textContent = (LANG==='ko') ? (targetLabel()+' 가는 길') : ('Directions to '+targetLabel());
  t7.textContent = (LANG==='ko') ? (targetLabel()+' 도착') : ('Arrived at '+targetLabel());
}
function startGuide(){
  steps=buildSteps(); si=0;
  refreshGuideTitles();
  phFill(document.getElementById('ph7'), (target.kind==='room'?target.code:null), '[ '+targetLabel()+' 사진 ]');
  render6(true); go(6);
}
/* 트랙(.prog와 같은 폭) 위에서 현재 단계에 해당하는 x좌표(px)를 계산한다.
   1번째 단계(si=0)는 트랙의 왼쪽 끝(출발 📍)에 서 있고, 그 다음부터는 단계가
   끝날 때마다 그 칸의 오른쪽 끝(2번째 칸 끝, 3번째 칸 끝 …)으로 옮겨간다.
   마지막 단계에서는 자연히 트랙 오른쪽 끝(도착 🏁)에 닿는다. 아직 레이아웃 전이면 null. */
function walkerTargetX(){
  var track=document.getElementById('walkTrack');
  var prog=document.getElementById('prog');
  if(!track || !prog || !steps.length) return null;
  var tRect=track.getBoundingClientRect();
  var pRect=prog.getBoundingClientRect();
  if(!pRect.width) return null;
  var n = steps.length;
  var frac = (si===0) ? 0 : Math.min(1, (si+1)/n);
  return (pRect.left - tRect.left) + frac*pRect.width;
}
/* 다음/이전을 누를 때마다 곧장 자리를 옮기지 않고, 약 2.6초에 걸쳐 실제로
   걸어서 이동하는 것처럼 보이게 한다(진척도가 눈에 잘 보이도록). 마지막 단계에
   도착했을 때는 이 이동이 다 끝난 뒤에야 '골인' 튐 효과를 시작해서, 사람이
   결승선에 실제로 닿는 순간에 효과가 보이게 한다(전에는 이동과 동시에 재생돼
   화면(특히 폰)에서는 거의 안 보이고 지나갔었다). */
var walkerAnimId = null;
var ridePrevCamPos = null, rideTmpVec3 = null;   // 이동경로 재생 중 라벨 페이드용 임시 벡터
function stopWalkerAnim(){
  if(walkerAnimId){ cancelAnimationFrame(walkerAnimId); walkerAnimId = null; }
}
function walkerTo(x, isArrival, animate){
  var walker=document.getElementById('walker');
  if(!walker || x===null) return;
  stopWalkerAnim();
  if(!animate){
    walker.style.left = x+'px';
    walker.className = isArrival ? 'walker arrived' : 'walker walk';
    return;
  }
  var startX = parseFloat(walker.style.left) || x;
  var DUR = 2600, t0 = null;
  walker.className = 'walker walk';   // 이동하는 동안은 계속 걷는 모션
  function step(ts){
    if(t0===null) t0 = ts;
    var k = Math.min(1, (ts - t0) / DUR);
    var e = easeIO(k);
    walker.style.left = (startX + (x - startX) * e) + 'px';
    if(k < 1){
      walkerAnimId = requestAnimationFrame(step);
    }else{
      walkerAnimId = null;
      if(isArrival){
        // 클래스를 껐다 켜서(reflow) 골인 애니메이션이 도착한 시점에 새로 시작되게 한다
        walker.classList.remove('walk');
        void walker.offsetWidth;
        walker.classList.add('arrived');
      }
    }
  }
  walkerAnimId = requestAnimationFrame(step);
}
function render6(instant){
  var s=steps[si];
  var ar=document.getElementById('ar');
  ar.textContent=s.a;
  var cls = 'arrow';
  if(s.a==='✓'){
    cls += ' done';
  }else{
    var animType = s.type==='lift' ? 'anim-lift' : (s.type==='turn' ? 'anim-turn' : 'anim-straight');
    cls += ' ' + animType;
    if(s.a==='↓') cls += ' dir-down';
    else if(s.a==='←') cls += ' dir-left';
    else if(s.a==='→') cls += ' dir-right';
  }
  ar.className = cls;
  document.getElementById('ins').textContent=(LANG==='ko')?s.tko:s.ten;
  phFill(document.getElementById('ph'), s.code, s.ph);
  document.getElementById('stepno').textContent=(LANG==='ko')
    ? ((si+1)+' / '+steps.length+' 단계')
    : ('Step '+(si+1)+' / '+steps.length);
  var p=document.getElementById('prog'); p.innerHTML='';
  for(var i=0;i<steps.length;i++){
    var b=document.createElement('i'); if(i<=si) b.className='on'; p.appendChild(b);
  }
  // 걷는 사람을 출발(📍)~도착(🏁) 트랙 위, 지금 단계에 해당하는 위치로 옮긴다.
  // 화면에 막 들어왔을 때(instant)는 바로 그 자리에 세워두고, 다음/이전 버튼으로
  // 단계가 바뀔 때는 이전 자리에서 새 자리까지 걸어가는 모습을 보여준다.
  var x = walkerTargetX();
  if(x===null){
    // 화면 전환 애니메이션이 끝나 실제 크기가 잡힌 뒤 다시 시도
    requestAnimationFrame(function(){ walkerTo(walkerTargetX(), s.type==='arrive', false); });
  }else{
    walkerTo(x, s.type==='arrive', !instant);
  }
  document.getElementById('nx').textContent = (si===steps.length-1)
    ? ((LANG==='ko')?'도착했어요':"I've arrived")
    : ((LANG==='ko')?'다음 ›':'Next ›');
  // 첫 단계의 '이전'은 층 상세 화면으로 빠져나가는 버튼이므로 그렇게 적어준다
  document.getElementById('pv').textContent = (si===0)
    ? ((LANG==='ko')?'‹ 층 상세':'‹ Floor view')
    : ((LANG==='ko')?'‹ 이전':'‹ Prev');
  if(s.type==='arrive') spawnParticles('stepFx');   // 마지막(도착) 단계 파티클 효과
}
function prev(){
  if(si>0){ si--; render6(); }
  else go(5);          // 첫 단계 : 층 상세 화면으로 빠져나감
}
function next(){
  if(si<steps.length-1){ si++; render6(); }
  else go(7);
}

/* v51 : 앱이 백그라운드로 가면 3D 루프를 전부 멈추고, 돌아오면 보고 있던 화면 것만 다시 켠다 */
document.addEventListener('visibilitychange', function(){
  var s4on = document.getElementById('s4') && document.getElementById('s4').classList.contains('on');
  var s5on = document.getElementById('s5') && document.getElementById('s5').classList.contains('on');
  var s2on = document.getElementById('s2') && document.getElementById('s2').classList.contains('on');
  if(document.hidden){
    if(typeof animateRunning!=='undefined') animateRunning = false;
    if(typeof animateBRunning!=='undefined') animateBRunning = false;
    if(typeof bld3DLeave==='function') bld3DLeave();
  }else{
    if(s4on && typeof animateStart==='function') animateStart();
    if(s5on && typeof animateBRunning!=='undefined' && !animateBRunning && typeof rB!=='undefined' && rB){ animateBRunning=true; animateB(); }
    if(s2on && typeof bld3DEnter==='function') bld3DEnter();
  }
});

/* ========== 시작 ========== */
/* 3D 안 글씨는 캔버스에 '그려 박는' 방식이라, 웹폰트가 도착하기 전에 그리면
   예전 글씨체로 굳어버린다. 폰트를 먼저 기다렸다가 시작하되,
   인터넷이 없거나 늦으면 1.5초 뒤 그냥 시작한다(그 경우 기존 맑은 고딕으로 표시). */
function bootApp(){
  init3D();
  initB();
  buildCats();
  phRender();
  applyLang();
  window.addEventListener('resize',function(){resize3D();resizeB();});
  go(1);
}
if(document.fonts && document.fonts.load){
  var waitFont = Promise.all([
    document.fonts.load('700 44px Pretendard'),
    document.fonts.load('400 16px Pretendard')
  ]);
  var timeout = new Promise(function(r){ setTimeout(r, 1500); });
  Promise.race([waitFont, timeout]).then(bootApp, bootApp);
}else{
  bootApp();
}
