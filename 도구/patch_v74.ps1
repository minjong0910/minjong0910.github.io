# v74 — 건의함 관리자가 '코드'가 아니라 '한글 이름'으로 위치를 고른다
#
#   지금까지 관리자는 위치 코드(LNG3 · HALL4L · 13210 …)를 알아야 승인할 수 있었다.
#   코드를 아는 사람은 이 앱을 만든 사람뿐이라, 관리자를 넘겨주려면 코드표를 같이
#   넘겨야 했다. 그게 안 되면 관리자는 아무것도 승인할 수 없다.
#
#   이 패치가 넣는 것
#     ① 제보마다 [층 ▾][장소 ▾] 두 칸 — 전부 한글 이름이다
#          예) 3층 → "3층 라운지" / "3층 좌측 복도" / "13310호 · 컴퓨터공학과"
#     ② 고른 결과를 큰 글씨로 보여 준다 :  ✔ 3층 라운지
#     ③ 코드 칸은 '직접 입력'으로 내려가고, 고르면 자동으로 채워진다
#        (코드를 아는 사람은 그대로 쓸 수 있고, 몰라도 아무 지장이 없다)
#     ④ AI 후보 버튼을 눌렀을 때도 고른 이름이 같이 갱신된다
#
#   승인 로직(sugApprove)은 예전 그대로 코드 칸을 읽는다 — 건드리지 않았다.
#
#   사용법 : pwsh -File patch_v74.ps1 <대상파일>
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

# ── 1. 고르는 칸 모양 ───────────────────────────────────────────
Swap @'
  #sadmin .sugBtnRow{display:flex;gap:6px;}
'@ @'
  /* v74 : 코드 대신 한글 이름으로 고르는 두 칸 */
  #sadmin .sugPick{display:flex;gap:6px;}
  #sadmin .sugPick select{flex:1;min-width:0;background:#0D0F18;border:1px solid #232D3A;border-radius:8px;
    color:#E7F6FF;font-family:inherit;font-size:12.5px;padding:7px 9px;box-sizing:border-box;}
  #sadmin .sugPick select.sugFloorSel{flex:0 0 96px;}
  #sadmin .sugChosen{font-size:13px;font-weight:700;padding:7px 10px;border-radius:8px;
    background:#16301F;border:1px solid #2F6B44;color:#BFEBD0;}
  #sadmin .sugChosen.none{background:#1A1D26;border-color:#232D3A;color:#5A6472;font-weight:400;}
  #sadmin .sugChosen.warn{background:#3A2020;border-color:#7C3B3B;color:#FFD2D2;}
  #sadmin .sugCodeLine{display:flex;align-items:center;gap:6px;}
  #sadmin .sugCodeLine label{flex:0 0 auto;font-size:11px;color:#5A6472;}
  #sadmin .sugBtnRow{display:flex;gap:6px;}
'@ '고르는 칸 모양'

# ── 2. 제보 카드에 층·장소 칸을 넣는다 ─────────────────────────
Swap @'
            '<input type="text" class="sugCodeInput" id="sugCode_'+s.id+'" list="sugCodeList" value="'+
              ((typeof SUGAI!=='undefined') ? SUGAI.autoCode(s) : '')+
              '" placeholder="적용할 위치 코드 (예: 13210, LNG3, EV2, BLD)">' +
'@ @'
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
'@ '층·장소 고르는 칸'

# ── 3. 고르는 동작 ──────────────────────────────────────────────
Swap @'
/* v73 : 빠른 버튼 → 코드 칸 채우기 */
function sugSetCode(id, code){
  var el = document.getElementById('sugCode_' + id);
  if(!el) return;
  el.value = code;
  el.focus();
}
'@ @'
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
  {t:'라운지·로비',   rx:/^LNG[1-5]$/},
  {t:'복도',          rx:/^HALL[1-5][LR]$/},
  {t:'엘리베이터',    rx:/^(EV[1-5]|EVIN[1-5]|EVB1)$/},
  {t:'강의실·연구실', rx:/^(\d{5}|KTC$)/},
  {t:'화장실·계단',   rx:/^(WC[1-5]|ES[1-5]|EMS[1-5])$/},
  {t:'출입문·외부',   rx:/^(BLD|GATE_)/}
];
function sugPlaceOptions(floor){
  var all = (typeof aidKnownCodes === 'function') ? aidKnownCodes() : [];
  var mine = all.filter(function(c){ return sugFloorOf(c) === floor; });
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
'@ '고르는 동작'

# ── 4. 화면을 그린 뒤 맞춰 둔다 ────────────────────────────────
Swap @'
  var hEl = document.getElementById('sugHandledInfo');
'@ @'
  sugPresetAll();                                                   /* v74 */
  var hEl = document.getElementById('sugHandledInfo');
'@ '그린 뒤 맞추기'

# ── 5. AI 후보 버튼을 눌러도 이름이 갱신되게 ───────────────────
Swap @'
  function pick(id, code){
    var el = document.getElementById('sugCode_'+id);
    if(el){ el.value = code; el.focus(); }
  }
'@ @'
  function pick(id, code){
    var el = document.getElementById('sugCode_'+id);
    if(el){ el.value = code; }
    /* v74 : 코드 칸만 바뀌면 관리자가 무엇을 고른 건지 모른다 — 이름도 같이 갱신 */
    if(typeof sugSyncName === 'function') sugSyncName(id);
    if(typeof sugPresetOne === 'function') sugPresetOne(id);
  }
'@ 'AI 후보 버튼'

# ── 6. 한 건만 맞추는 함수 (AI 후보 버튼용) ────────────────────
Swap @'
function sugPresetAll(){
'@ @'
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
'@ '한 건만 맞추기'

# ── 7. 승인할 때의 안내말 ──────────────────────────────────────
Swap @'
  if(!code){ alert('적용할 위치 코드를 입력하거나, 정문·후문 세부 위치를 선택해 주세요.'); return; }
'@ @'
  if(!code){ alert('위치를 고르지 않았습니다.\n층을 고른 뒤 장소를 고르거나, 정문·후문이면 세부 위치를 선택해 주세요.'); return; }
'@ '승인 안내말'

# ── 8. 화면 안내문 ─────────────────────────────────────────────
Swap @'
      학생이 건의함에 올린 사진을 검토합니다. 사진과 메모를 보고 <b style="color:#94B8E0;">적용할 위치 코드</b>를
      입력한 뒤 승인하면 그 위치의 대표 사진으로 바로 반영됩니다.<br>
      위치 코드 예시 : 호실 번호(13210) · 건물 외부(BLD) · 지하 1층(B1) ·
      N층 엘리베이터 앞(EV1~EV5) · N층 왼쪽/오른쪽 복도(HALL1L~HALL5R) ·
      <b style="color:#94B8E0;">N층 라운지(LNG2~LNG5) · 1층 로비(LNG1)</b><br>
      코드 칸을 누르면 앱이 아는 위치가 한국어 이름과 함께 목록으로 뜹니다.
      라운지는 아래 <b style="color:#94B8E0;">라운지</b> 버튼으로 바로 고를 수 있습니다.<br>
'@ @'
      학생이 건의함에 올린 사진을 검토합니다. 사진을 보고 <b style="color:#94B8E0;">층</b>을 고른 뒤
      <b style="color:#94B8E0;">장소</b>를 고르고 승인하면, 그 위치의 대표 사진으로 바로 반영됩니다.<br>
      장소는 전부 한글 이름으로 나옵니다 — <b style="color:#94B8E0;">3층 라운지 · 4층 좌측 복도 ·
      13310호 · 2층 엘리베이터 앞</b> 처럼. 코드를 외울 필요는 없습니다.<br>
      고른 것은 아래 <b style="color:#BFEBD0;">✔ 초록 줄</b>에 그대로 보입니다. 승인 전에 이 줄만 확인하세요.
      라운지는 <b style="color:#94B8E0;">라운지</b> 버튼으로 한 번에 고를 수도 있습니다.<br>
'@ '화면 안내문'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
