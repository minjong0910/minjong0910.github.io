# v73 — 건의함 관리자 화면에서 라운지를 손으로 고를 수 있게 한다
#
#   v72 에서 라운지(LNG1~LNG5)를 새 장소로 만들었지만, 관리자 화면에는
#   AI 가 후보로 올려줄 때만 나타났다. AI 가 틀리면 관리자는 'LNG3' 이라는
#   코드를 외워서 빈 칸에 타이핑해야 했다 — 아무도 못 쓴다.
#
#   이 패치가 넣는 것
#     ① 제보마다 "라운지 : [1층 로비][2층][3층][4층][5층]" 빠른 버튼
#     ② 코드 칸에 목록(datalist) 연결 — 앱이 아는 모든 위치를 한국어 이름과 함께 고른다
#     ③ 개발자용 사진 등록 화면의 코드 목록·층 묶음에도 라운지를 반영
#        (덤으로 EVIN·SIGN·EMS·WIN 이 '기타'로 빠지던 것도 같이 고친다)
#     ④ 화면 안내문에 라운지를 적는다
#
#   사용법 : pwsh -File patch_v73.ps1 <대상파일>
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

# ── 1. 빠른 버튼 모양 ───────────────────────────────────────────
Swap @'
  #sadmin .sugBtnRow{display:flex;gap:6px;}
'@ @'
  /* v73 : 코드를 외우지 않고 라운지를 고르는 줄 */
  #sadmin .sugQuick{display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:11.5px;color:#5A6472;}
  #sadmin .sugQuick button{background:#0D0F18;border:1px solid #232D3A;color:#94B8E0;border-radius:7px;
    padding:5px 9px;font-size:11.5px;font-family:inherit;cursor:pointer;}
  #sadmin .sugQuick button:hover{border-color:#2F6B8A;color:#CFE8FF;}
  #sadmin .sugBtnRow{display:flex;gap:6px;}
'@ '빠른 버튼 모양'

# ── 2. 코드 목록을 담을 자리 ────────────────────────────────────
Swap @'
    <div id="sugAdminList"></div>
'@ @'
    <datalist id="sugCodeList"></datalist>
    <div id="sugAdminList"></div>
'@ '코드 목록 자리'

# ── 3. 제보 칸에 버튼과 목록을 붙인다 ───────────────────────────
Swap @'
            '<input type="text" class="sugCodeInput" id="sugCode_'+s.id+'" value="'+
              ((typeof SUGAI!=='undefined') ? SUGAI.autoCode(s) : '')+
              '" placeholder="적용할 위치 코드 (예: 13210, BLD, EV2, B1)">' +
'@ @'
            '<input type="text" class="sugCodeInput" id="sugCode_'+s.id+'" list="sugCodeList" value="'+
              ((typeof SUGAI!=='undefined') ? SUGAI.autoCode(s) : '')+
              '" placeholder="적용할 위치 코드 (예: 13210, LNG3, EV2, BLD)">' +
            /* v73 : 층마다 있는 라운지는 코드를 외우기 어려워 버튼으로 고른다 */
            '<div class="sugQuick">라운지 : ' +
              [1,2,3,4,5].map(function(f){
                return '<button type="button" onclick="sugSetCode(\''+s.id+'\',\'LNG'+f+'\')">' +
                       (f === 1 ? '1층 로비' : f+'층') + '</button>';
              }).join('') +
            '</div>' +
'@ '라운지 버튼'

# ── 4. 버튼을 누르면 코드 칸이 채워진다 + 목록을 채운다 ─────────
Swap @'
function sugAdminRender(){
  sugBadgeSync();
  var list = document.getElementById('sugAdminList');
  if(!list) return;
'@ @'
/* v73 : 빠른 버튼 → 코드 칸 채우기 */
function sugSetCode(id, code){
  var el = document.getElementById('sugCode_' + id);
  if(!el) return;
  el.value = code;
  el.focus();
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
'@ '버튼 동작과 목록 채우기'

# ── 5. 개발자용 화면도 새 장소를 알게 ───────────────────────────
Swap @'
  for(i=1;i<=5;i++){ set['EV'+i]=1; set['HALL'+i+'L']=1; set['HALL'+i+'R']=1; set['WC'+i]=1; set['ES'+i]=1; }
'@ @'
  for(i=1;i<=5;i++){ set['EV'+i]=1; set['HALL'+i+'L']=1; set['HALL'+i+'R']=1; set['WC'+i]=1; set['ES'+i]=1; }
  for(i=1;i<=5;i++){ set['LNG'+i]=1; set['EVIN'+i]=1; set['SIGN'+i]=1; set['EMS'+i]=1; }   /* v73 */
'@ '개발자 화면 코드 목록'

Swap @'
  var m = c.match(/^(?:EV|HALL|WC|ES)([1-5])/);  if(m) return m[1] + '층';
'@ @'
  /* v73 : EVIN·SIGN·EMS·WIN·LNG 이 전부 '기타'로 빠지고 있었다 (EV 뒤가 숫자가 아니라서) */
  var m = c.match(/^(?:EVIN|EMS|SIGN|WIN|LNG|EV|HALL|WC|ES)([1-5])/);  if(m) return m[1] + '층';
'@ '개발자 화면 층 묶음'

# ── 6. 안내문 ───────────────────────────────────────────────────
Swap @'
      위치 코드 예시 : 호실 번호(13210) · 건물 외부(BLD) · 지하 1층(B1) ·
      N층 엘리베이터 앞(EV1~EV5) · N층 왼쪽/오른쪽 복도(HALL1L~HALL5R)<br>
'@ @'
      위치 코드 예시 : 호실 번호(13210) · 건물 외부(BLD) · 지하 1층(B1) ·
      N층 엘리베이터 앞(EV1~EV5) · N층 왼쪽/오른쪽 복도(HALL1L~HALL5R) ·
      <b style="color:#94B8E0;">N층 라운지(LNG2~LNG5) · 1층 로비(LNG1)</b><br>
      코드 칸을 누르면 앱이 아는 위치가 한국어 이름과 함께 목록으로 뜹니다.
      라운지는 아래 <b style="color:#94B8E0;">라운지</b> 버튼으로 바로 고를 수 있습니다.<br>
'@ '안내문'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
