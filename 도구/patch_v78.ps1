# v78 — 장소 코드를 3D 좌표로 (place3D) + 라운지 사진을 길안내에 보이게
#
#   ① place3D(code) — AI 가 아는 모든 장소(152곳)를 건물 위 한 점(또는 구역)으로 바꾼다.
#      3D 검사(eval_build)·길찾기 그래프·확신도 지도가 모두 이 함수 하나를 쓴다.
#      좌표는 전부 앱이 이미 쓰는 값에서 가져온다 (FLOOR_LAYOUT · evXZ · gateXZ · EMSTAIR_POS …).
#      새 좌표를 따로 만들면 3D 그림과 어긋나기 때문이다 (v132 주석과 같은 원칙).
#      평면도에 표시가 없어 '그 층 어디쯤'으로 둔 곳은 exact:false 로 숨기지 않고 표시한다.
#
#   ② 라운지 사진 — v72 에서 라운지(LNG)를 만들었지만 길안내에는 라운지 자리가 없어서,
#      승인한 라운지 사진이 앱 어디에도 보이지 않았다. 길안내가 엘리베이터 앞 사진을 보여 줄 때
#      그 층 라운지 사진을 뒤에 이어 붙인다 (엘리베이터에서 내리면 보이는 곳이 라운지다).
#
#   사용법 : pwsh -File patch_v78.ps1 <대상파일>
param([string]$Target)
$ErrorActionPreference = 'Stop'
if(-not (Test-Path $Target)){ throw "파일이 없습니다: $Target" }
$s = [System.IO.File]::ReadAllText($Target, [System.Text.Encoding]::UTF8)
$n = 0
function Swap([string]$old, [string]$new, [string]$label){
  $script:n++
  $old = $old -replace "`r`n", "`n"; $new = $new -replace "`r`n", "`n"
  $c = ([regex]::Matches($script:s, [regex]::Escape($old))).Count
  if($c -ne 1){ throw ("[{0}] 앵커가 {1}개" -f $label, $c) }
  $script:s = $script:s.Replace($old, $new)
  Write-Host ("  [OK] {0}" -f $label) -ForegroundColor Green
}

Swap @'
function currentGateKey(){
  return (typeof QRNAV!=='undefined' && QRNAV.gate) ? QRNAV.gate() : null;
}
'@ @'
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
'@ 'place3D'

Swap @'
function phFill(el, code, placeholder){
  code = phResolve(code);
  if(!el) return;
  var list = (code && ROOM_PHOTOS[code]) || [];
'@ @'
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
'@ '라운지 사진을 엘리베이터 앞에 이어 붙이기'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
