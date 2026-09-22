"use strict";
/* building.js — 건물 자료(층별 호실 배치)와 3D 좌표 계산 — FLOORS_DATA · FLOOR_LAYOUT · 비상계단 · 시설 위치
   (예전 한 파일 main.js 의 1~427줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */

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
var CORR_HALF= 2.1;   // 중앙 복도 폭의 절반 — 실사진 대비 복도가 좁아 보여서 확장(1.8→2.1, 전체 폭 3.6→4.2m). ROOM_W는 복도 바깥쪽 기준이라 방 크기는 그대로 유지된다.
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
  vending: { floor:1, x: -(CORR_HALF+ROOM_W/2) + 1.9, z: -(CORE_HALF+0.175) + 1.1, w:1.8, d:2.2, confirmed:false, note:'평면도 미표시 — 인쇄기 오른쪽으로 위치 조정' },
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
// 방 사이 시각적 간격(세로) 계산: 일반 호실(및 2칸짜리 방)은 지금까지와 같은 0.35 고정 간격을 유지하되,
// 가벽으로 반씩 나뉜 좁은 호실(예: 13203/13204)은 같은 0.35를 적용하면 상대적으로 훨씬 많이 깎여나가
// "그 호실만 짧아 보이는" 문제가 생김 → 칸 깊이의 8%를 상한 0.35로 잡아, 좁은 칸은 간격을 비례해서 줄임.
function roomInsetD(d){ return Math.min(0.35, d*0.08); }
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
