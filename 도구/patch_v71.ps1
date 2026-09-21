# v71 — 승인이 서버에 올라갔는지 관리자에게 보여 준다 (조용한 실패 제거)
#
#   지금까지 관리자가 제보를 승인하면
#     ① 서버(photos)에 사진을 올리고 → 모든 기기에 반영 + 모든 기기가 학습
#     ② 못 올리면 조용히 이 기기에만 학습 (오류는 콘솔에만 찍힘)
#   이었다. 그래서 승인한 폰에서는 잘 되는 것처럼 보이지만, 실제로 서버에는
#   아무것도 올라가지 않을 수 있다. (2026-09-21 확인 : 서버 photos 컬렉션 0건)
#
#   이 패치는 결과를 관리자 화면 맨 위에 문장으로 보여 준다.
#     성공 : "서버에 올렸습니다 — 모든 기기에 반영됩니다"
#     실패 : "서버에 올리지 못했습니다 — 이 기기에만 반영됩니다" + 사유(권한/연결 등)
#   사유는 Firestore 가 돌려주는 코드(permission-denied 등)를 그대로 적는다.
#
#   사용법 : pwsh -File patch_v71.ps1 <대상파일>
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

# ── 1. 실패 사유를 기억한다 ─────────────────────────────────────
Swap @'
  function publishPhoto(entry){
    return ensure().then(function(){ return fit(entry.u); })
      .then(function(u){ entry.u = u; return db.collection(COL_PH).add(entry); })
      .then(function(ref){ entry.pid = ref.id; return entry; })      /* v64 : 올린 문서 번호를 돌려준다 */
      ['catch'](function(e){ console.warn('publishPhoto 실패', e); return null; });
  }
'@ @'
  var lastPubErr = '';                                               /* v71 : 마지막 업로드 실패 사유 */
  function publishPhoto(entry){
    lastPubErr = '';
    return ensure().then(function(){ return fit(entry.u); })
      .then(function(u){ entry.u = u; return db.collection(COL_PH).add(entry); })
      .then(function(ref){ entry.pid = ref.id; return entry; })      /* v64 : 올린 문서 번호를 돌려준다 */
      ['catch'](function(e){
        lastPubErr = (e && (e.code || e.message)) ? String(e.code || e.message) : '알 수 없는 오류';
        console.warn('publishPhoto 실패', e);
        return null;
      });
  }
'@ '업로드 실패 사유 기억'

Swap @'
           publishPhoto:publishPhoto, loadPhotos:loadPhotos,
'@ @'
           publishPhoto:publishPhoto, loadPhotos:loadPhotos,
           get lastPubErr(){ return lastPubErr; },                   /* v71 */
'@ 'SUGDB 실패 사유 공개'

# ── 2. 관리자 화면에 결과를 보여 준다 ───────────────────────────
Swap @'
function sugReject(id){
'@ @'
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
'@ '서버 결과 안내 함수'

Swap @'
      .then(function(ent){
        if(!ent || !ent.pid){ sugLearnLocal(); return; }
        (ROOM_PHOTOS[code] || []).forEach(function(q){ if(q.n === ent.n) q.pid = ent.pid; });
        if(typeof SUGAI !== 'undefined' && SUGAI.syncServerOne) SUGAI.syncServerOne(ent);
      });
'@ @'
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
'@ '승인 결과 표시'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
