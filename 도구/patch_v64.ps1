# v64 — 관리자가 넣고 뺀 사진을 모든 기기에 영구히 반영한다
#
#   지금까지
#     · 승인한 사진은 서버(photos)에 올라가 다른 기기 화면에도 보였지만,
#       AI 학습은 승인한 그 기기에만 남았다 (localStorage)
#     · '전체 사진 관리'에서 넣고 뺀 것은 그 기기에만 적용됐다
#
#   바꾼 뒤
#     ① 승인 → 사진도, AI 학습도 모든 기기에 반영
#        (각 기기가 서버의 승인 사진을 받아 벡터를 한 번 계산해 캐시)
#     ② 관리자가 '전체 사진 관리'에서 넣으면 → 서버에 올라가 모든 기기에 반영
#     ③ 관리자가 빼면 → 서버에서 지우거나(올린 사진) 숨김 기록을 남겨(원래 사진)
#        모든 기기에서 빠짐. AI 학습분도 같이 빠짐
#     ④ 다시 넣으면 숨김 기록이 풀린다 — 언제든 넣고 뺄 수 있다
#
#   ※ AI 모델(7.6MB)은 원래처럼 건의함에 들어갈 때만 불러온다.
#     서버 승인 사진의 벡터 계산도 그때 뒤에서 한다 (길찾기만 하는 사람은 느려지지 않게)
#
#   사용법 : pwsh -File patch_v64.ps1 <대상파일>
param([string]$Target)
$ErrorActionPreference = 'Stop'
if(-not (Test-Path $Target)){ throw "파일이 없습니다: $Target" }
$s = [System.IO.File]::ReadAllText($Target, [System.Text.Encoding]::UTF8)
$n = 0
function Swap([string]$old, [string]$new, [string]$label){
  $script:n++
  $c = ([regex]::Matches($script:s, [regex]::Escape($old))).Count
  if($c -ne 1){ throw ("[{0}] 앵커가 {1}개" -f $label, $c) }
  $script:s = $script:s.Replace($old, $new)
  Write-Host ("  [OK] {0}" -f $label) -ForegroundColor Green
}

# ── 1. SUGAI : 서버 승인 사진의 벡터 저장소 ─────────────────────
Swap @'
  var LEARN_KEY = 'aiLearned';
'@ @'
  var LEARN_KEY = 'aiLearned';

  /* v64 : 관리자가 승인해 서버에 올린 사진 — 모든 기기가 같은 것을 배운다.
     사진은 서버에서 받고, 벡터는 각 기기가 한 번만 계산해 이 기기에 캐시한다.
     서버에서 빠진 사진은 캐시에서도 빠진다. */
  var SRV_KEY = 'aiServerRefs', SRV = null, SRV_TODO = [], SRV_BUSY = false;
  function srvLoad(){
    if(SRV) return SRV;
    try{ SRV = JSON.parse(localStorage.getItem(SRV_KEY) || '{}') || {}; }catch(e){ SRV = {}; }
    return SRV;
  }
  function srvSave(){ try{ localStorage.setItem(SRV_KEY, JSON.stringify(SRV || {})); }catch(e){} }
  function srvAppend(){
    srvLoad();
    Object.keys(SRV).forEach(function(pid){
      var S = SRV[pid]; if(!S || S.v !== 3 || !S.q) return;
      try{
        REF.push(b64ToVec(S.q)); CODES.push(S.code);
        if(S.q2){ REF.push(b64ToVec(S.q2)); CODES.push(S.code); }
        if(S.q3){ REF.push(b64ToVec(S.q3)); CODES.push(S.code); }
      }catch(e){}
    });
  }
  function srvRefresh(){ if(REF) rebuildRef(); }
  /* 서버의 승인 사진 목록을 받아 캐시를 맞춘다 : 없어진 것은 빼고, 새것은 계산 대기열에 */
  function syncServer(items){
    srvLoad();
    var want = {}, changed = false;
    (items || []).forEach(function(p){ if(p && p.pid && p.code && p.u) want[p.pid] = p; });
    Object.keys(SRV).forEach(function(pid){ if(!want[pid]){ delete SRV[pid]; changed = true; } });
    Object.keys(want).forEach(function(pid){
      var S = SRV[pid], p = want[pid];
      if(S && S.code !== p.code){ delete SRV[pid]; S = null; changed = true; }
      if(!S && !SRV_TODO.some(function(t){ return t.pid === pid; })) SRV_TODO.push(p);
    });
    if(changed){ srvSave(); srvRefresh(); }
    if(net) srvDrain();            // 모델이 이미 올라와 있으면 지금, 아니면 모델이 올라올 때
    return { cached: Object.keys(SRV).length, pending: SRV_TODO.length };
  }
  /* 이 기기에서 방금 올린 사진 — 바로 배운다 */
  function syncServerOne(p){
    if(!p || !p.pid || !p.u) return Promise.resolve(0);
    SRV_TODO.push(p);
    return ensure().then(srvDrain)['catch'](function(){ return 0; });
  }
  function srvDrain(){
    if(SRV_BUSY || !SRV_TODO.length) return Promise.resolve(0);
    SRV_BUSY = true; srvLoad();
    var done = 0;
    function next(){
      if(!SRV_TODO.length){ SRV_BUSY = false; if(done){ srvSave(); srvRefresh(); } return Promise.resolve(done); }
      var p = SRV_TODO.shift();
      return embedUrlViews(p.u).then(function(vs){
        SRV[p.pid] = {code:p.code, q:i8ToB64(vs[0]), q2:(vs[1] ? i8ToB64(vs[1]) : ''),
                      q3:(vs[2] ? i8ToB64(vs[2]) : ''), v:3, ts:p.ts || Date.now()};
        done++;
      })['catch'](function(){}).then(next);
    }
    return next();
  }
  function srvDrop(pid){
    srvLoad();
    SRV_TODO = SRV_TODO.filter(function(t){ return t.pid !== pid; });
    if(SRV[pid]){ delete SRV[pid]; srvSave(); srvRefresh(); }
  }
  function srvStats(){ srvLoad(); return { cached: Object.keys(SRV).length, pending: SRV_TODO.length }; }
'@ '서버 승인분 저장소'

# ── 2. 기준집을 만들 때 서버 승인분도 넣는다 ────────────────────
Swap @'
        }catch(e){}
      }
    }
  }
  function saveLearned(){
'@ @'
        }catch(e){}
      }
      srvAppend();              /* v64 : 서버 승인분 — 모든 기기 공통 */
    }
  }
  function saveLearned(){
'@ '기준집에 서버 승인분 포함'

# ── 3. 모델이 올라오면 밀린 계산을 뒤에서 처리 ──────────────────
Swap @'
        }catch(e){ return m; }
      })
'@ @'
        }catch(e){ return m; }
      })
      .then(function(m){ setTimeout(function(){ srvDrain(); }, 200); return m; })   /* v64 */
'@ '모델 로드 뒤 서버 승인분 계산'

# ── 4. SUGAI 밖으로 내보내기 ────────────────────────────────────
Swap @'
           learn:learn, learnStats:learnStats, forgetAll:forgetAll,
'@ @'
           learn:learn, learnStats:learnStats, forgetAll:forgetAll,
           syncServer:syncServer, syncServerOne:syncServerOne, srvDrop:srvDrop, srvStats:srvStats,
'@ 'SUGAI 내보내기'

# ── 5. SUGDB : 올리기가 문서 번호를 돌려주게 + 빼기·숨김 ────────
Swap @'
  function publishPhoto(entry){
    return ensure().then(function(){ return fit(entry.u); })
      .then(function(u){ entry.u = u; return db.collection(COL_PH).add(entry); })
      ['catch'](function(e){ console.warn('publishPhoto 실패', e); });
  }
'@ @'
  function publishPhoto(entry){
    return ensure().then(function(){ return fit(entry.u); })
      .then(function(u){ entry.u = u; return db.collection(COL_PH).add(entry); })
      .then(function(ref){ entry.pid = ref.id; return entry; })      /* v64 : 올린 문서 번호를 돌려준다 */
      ['catch'](function(e){ console.warn('publishPhoto 실패', e); return null; });
  }
  /* v64 : 관리자가 뺀 사진 — 올린 사진은 서버에서 지우고, 원래 들어 있던 사진은 숨김 기록을 남긴다.
     숨김 기록은 문서 번호를 '위치|이름'으로 정해 두어, 다시 넣을 때 그 기록만 지우면 풀린다. */
  function hid(code, n){ return 'hide_' + encodeURIComponent(code + '|' + n).replace(/%/g, '_').slice(0, 1400); }
  function unpublishPhoto(pid){
    if(!pid) return Promise.resolve(false);
    return ensure().then(function(){ return db.collection(COL_PH).doc(pid)['delete'](); })
      .then(function(){ return true; })['catch'](function(e){ console.warn('unpublishPhoto 실패', e); return false; });
  }
  function hidePhoto(code, n){
    return ensure().then(function(){ return db.collection(COL_PH).doc(hid(code, n)).set({hide:true, code:code, n:n, ts:Date.now()}); })
      .then(function(){ return true; })['catch'](function(e){ console.warn('hidePhoto 실패', e); return false; });
  }
  function unhidePhoto(code, n){
    return ensure().then(function(){ return db.collection(COL_PH).doc(hid(code, n))['delete'](); })
      .then(function(){ return true; })['catch'](function(){ return false; });
  }
'@ '올리기·빼기·숨김'

# ── 6. 앱을 열 때 : 숨김 기록 적용 + AI 에 서버 승인분 넘기기 ───
Swap @'
      items.forEach(function(p){
        if(!p.code || !p.u) return;
'@ @'
      /* v64 : 관리자가 뺀 사진(숨김 기록) — 모든 기기에서 똑같이 뺀다 */
      var hidden = {}, live = [];
      items.forEach(function(p){ if(p.hide && p.code && p.n) hidden[p.code + '|' + p.n] = 1; });
      items.forEach(function(p){
        if(p.hide) return;
        if(!p.code || !p.u) return;
        if(hidden[p.code + '|' + (p.n || '')]) return;
        live.push(p);
'@ '숨김 기록 건너뛰기'

Swap @'
        } else arr.unshift(e);
        n++;
      });
'@ @'
        } else arr.unshift(e);
        n++;
      });
      Object.keys(hidden).forEach(function(k){
        var i = k.indexOf('|'), c = k.slice(0, i), nm = k.slice(i + 1), arr = ROOM_PHOTOS[c];
        if(!arr) return;
        var keep = arr.filter(function(q){ return q.n !== nm; });
        if(keep.length !== arr.length){ n++; if(keep.length) ROOM_PHOTOS[c] = keep; else delete ROOM_PHOTOS[c]; }
      });
      /* v64 : 서버 승인 사진을 이 기기의 AI 도 배운다 (모델은 필요할 때 불러온다) */
      if(typeof SUGAI !== 'undefined' && SUGAI.syncServer) SUGAI.syncServer(live);
'@ '숨김 적용 + AI 동기화'

Swap @'
           publishPhoto:publishPhoto, loadPhotos:loadPhotos,
'@ @'
           publishPhoto:publishPhoto, loadPhotos:loadPhotos,
           unpublishPhoto:unpublishPhoto, hidePhoto:hidePhoto, unhidePhoto:unhidePhoto,
'@ 'SUGDB 내보내기'

# ── 7. 승인 : 서버에 올라가면 모든 기기가 배우고, 못 올라가면 이 기기만 ─
Swap @'
  if(typeof SUGAI !== 'undefined') SUGAI.learn(code, s.u, '건의함_'+id);
'@ @'
  /* v64 : 서버에 올라가면 syncServerOne 으로 모든 기기 공통 학습, 못 올라가면 이 기기에만 */
  var sugLearnLocal = function(){ if(typeof SUGAI !== 'undefined') SUGAI.learn(code, s.u, '건의함_'+id); };
  if(!(typeof SUGDB !== 'undefined' && s.fid)) sugLearnLocal();
'@ '승인 — 학습 경로 나누기'

Swap @'
    SUGDB.publishPhoto({code:code, sub:sub||'', n:(sub ? '건의함_'+sub+'.jpg' : '건의함_'+id+'.jpg'),
                        u:s.u, cap:s.note || (sub||''), ts:Date.now(), sid:s.fid});
'@ @'
    SUGDB.publishPhoto({code:code, sub:sub||'', n:(sub ? '건의함_'+sub+'.jpg' : '건의함_'+id+'.jpg'),
                        u:s.u, cap:s.note || (sub||''), ts:Date.now(), sid:s.fid})
      .then(function(ent){
        if(!ent || !ent.pid){ sugLearnLocal(); return; }
        (ROOM_PHOTOS[code] || []).forEach(function(q){ if(q.n === ent.n) q.pid = ent.pid; });
        if(typeof SUGAI !== 'undefined' && SUGAI.syncServerOne) SUGAI.syncServerOne(ent);
      });
'@ '승인 — 올린 뒤 모든 기기 학습'

# ── 8. 전체 사진 관리 : 넣기·빼기를 서버로 ──────────────────────
Swap @'
function sphMgrAddFiles(code, files, at){
'@ @'
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
'@ '넣기·빼기 서버 연결 함수'

Swap @'
            ROOM_PHOTOS[code].splice(pos, 0, {n:base, u:url});
'@ @'
            var ent = {n:base, u:url};
            ROOM_PHOTOS[code].splice(pos, 0, ent);
            sphSrvAdd(code, ent);               /* v64 : 모든 기기에 반영 */
'@ '넣기 → 서버'

Swap @'
  appConfirm('이 사진을 삭제할까요?', function(){
    sphMgrRemove(code, name);
'@ @'
  appConfirm('이 사진을 삭제할까요?', function(){
    var srvList = sphSrvLookup([sphMgrKey(code, name)]);     /* v64 */
    sphMgrRemove(code, name);
    sphSrvRemove(srvList);
'@ '한 장 빼기 → 서버'

Swap @'
  appConfirm(sphMgrSelected.size + '장을 삭제할까요? 되돌릴 수 없습니다.', function(){
    keys.forEach(function(key){
'@ @'
  appConfirm(sphMgrSelected.size + '장을 삭제할까요? 되돌릴 수 없습니다.', function(){
    var srvList = sphSrvLookup(keys);                         /* v64 */
    keys.forEach(function(key){
'@ '여러 장 빼기 — 목록 먼저'

Swap @'
    sphMarkDeleted(keys);
    sphMgrSelected.clear();
'@ @'
    sphMarkDeleted(keys);
    sphSrvRemove(srvList);                                    /* v64 : 모든 기기에 반영 */
    sphMgrSelected.clear();
'@ '여러 장 빼기 → 서버'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
