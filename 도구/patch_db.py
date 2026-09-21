# -*- coding: utf-8 -*-
"""v48 → v49 : Firestore 연동 — 제보 공유 · 관리자 로그인 · 승인 사진 전체 배포"""
import io, sys
SRC='/home/claude/gunsan_b3nav_AI_v48.html'; DST='/home/claude/gunsan_b3nav_DB_v49.html'
s=io.open(SRC,encoding='utf-8').read(); orig=len(s); done=[]
def patch(name, old, new, count=1):
    global s
    n=s.count(old)
    if n!=count: print('  [실패] %s : 앵커 %d개'%(name,n)); sys.exit(1)
    s=s.replace(old,new,count); done.append(name); print('  [OK] %s'%name)

# ═══════════ 1. CSS ═══════════
patch('DB CSS',
"""  #sadmin .sugEmpty{color:#5A6472;font-size:13px;text-align:center;padding:34px 10px;}""",
"""  #sadmin .sugEmpty{color:#5A6472;font-size:13px;text-align:center;padding:34px 10px;}
  /* ══════════════ 서버(Firestore) 연동 (v49 신규) ══════════════ */
  .dbState{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#7C8AA0;
    margin-left:auto;white-space:nowrap;}
  .dbState .dot{width:7px;height:7px;border-radius:50%;background:#3E4A5C;}
  .dbState.on .dot{background:#39FF88;box-shadow:0 0 8px rgba(57,255,136,.7);}
  .dbState.load .dot{background:#FFC93C;animation:aiPulse 1s ease-in-out infinite;}
  .dbState.off .dot{background:#FF6B6B;}
  #sadmin .dbBar{display:flex;align-items:center;gap:8px;margin:-2px 0 8px;font-size:11.5px;color:#7C8AA0;}
  #sadmin .dbBar button{background:none;border:1px solid #232D3A;color:#7C8AA0;border-radius:6px;
    padding:5px 9px;font-size:11px;font-family:inherit;cursor:pointer;}
  #sadmin .sugLocal{display:inline-block;font-size:10px;padding:2px 6px;border-radius:999px;
    background:rgba(255,201,60,.13);color:#FFC93C;margin-left:6px;vertical-align:middle;}
  #spwgate .fbGate{display:none;flex-direction:column;gap:10px;}
  #spwgate .fbGate.on{display:flex;}
  #spwgate .fbGate input{width:100%;background:#0D0F18;border:1px solid #232D3A;border-radius:10px;
    padding:14px;color:#E7F6FF;font-size:15px;font-family:inherit;}
  #spwgate .fbGate input:focus{outline:none;border-color:#00E5FF;}
  #spwgate .fbGate .fbErr{color:#FF6B6B;font-size:12.5px;min-height:18px;}
  #spwgate .fbGate .fbTip{color:#7C8AA0;font-size:12.5px;line-height:1.6;}
  #spwgate .fbGate .fbTip b{color:#94B8E0;}
  #spwgate .pwGateWrap.hide{display:none;}
  #ssug .sugSync{margin-top:6px;font-size:11.5px;color:#7C8AA0;text-align:center;}""")

# ═══════════ 2. 관리자 인증 화면 — 이메일 로그인 추가 ═══════════
patch('로그인 화면',
"""      <button class="big" id="pwConfirmBtn" style="margin-top:18px;" onclick="checkAdminPw()" data-ko="확인" data-en="Confirm">확인</button>
    </div>
  </section>""",
"""      <button class="big" id="pwConfirmBtn" style="margin-top:18px;" onclick="checkAdminPw()" data-ko="확인" data-en="Confirm">확인</button>
    </div>
    <!-- v49 : 웹으로 열었을 때는 서버 계정으로 로그인한다. 파일로 직접 연 개발 환경에서만 위 숫자 비밀번호를 쓴다. -->
    <div class="fbGate" id="fbGate">
      <p class="fbTip" data-ko="관리자 계정으로 로그인해 주세요.<br>제보 확인·승인은 <b>모든 관리자 기기에서 같은 목록</b>을 봅니다." data-en="Sign in with the admin account.<br>All admin devices see <b>the same list</b> of reports.">관리자 계정으로 로그인해 주세요.<br>제보 확인·승인은 <b>모든 관리자 기기에서 같은 목록</b>을 봅니다.</p>
      <input id="fbEmail" type="email" placeholder="이메일" autocomplete="username" autocapitalize="off" spellcheck="false">
      <input id="fbPw" type="password" placeholder="비밀번호" autocomplete="current-password" onkeydown="if(event.key==='Enter'){fbLogin();}">
      <div class="fbErr" id="fbErr"></div>
      <button class="big" id="fbLoginBtn" onclick="fbLogin()" data-ko="로그인" data-en="Sign in">로그인</button>
      <div class="dbState" id="fbGateState" style="margin:4px auto 0;"><span class="dot"></span><span id="fbGateStateTxt"></span></div>
    </div>
  </section>""")

# ═══════════ 3. 관리자 화면 상태줄 ═══════════
patch('관리자 화면 상태줄',
"""    <div id="sugAdminList"></div>
    <div class="footRow">""",
"""    <div class="dbBar" id="sugDbBar">
      <span class="dbState" id="sugDbState" style="margin-left:0;"><span class="dot"></span><span id="sugDbStateTxt">서버 연결 전</span></span>
      <span style="flex:1;"></span>
      <button id="sugLogoutBtn" onclick="fbLogout()" style="display:none;">로그아웃</button>
    </div>
    <div id="sugAdminList"></div>
    <div class="footRow">""")

# ═══════════ 4. 제출 화면 전송 상태 ═══════════
patch('제출 화면 전송 상태',
"""      <div class="sugStat" id="sugStat"></div>
      <div class="aiPrep off" id="sugAiPrep">""",
"""      <div class="sugStat" id="sugStat"></div>
      <div class="sugSync" id="sugSync"></div>
      <div class="aiPrep off" id="sugAiPrep">""")

# ═══════════ 5. sugPending / 큐 — 원격 목록과 합치기 ═══════════
patch('pending 합치기',
"""function sugPending(){ return SUG_QUEUE.filter(function(s){ return s.status==='pending'; }); }""",
"""/* v49 : 서버에서 실시간으로 받은 대기 제보. 로그인한 관리자 기기에서 채워진다. */
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
}""")

# ═══════════ 6. 제출 → 서버 전송 ═══════════
patch('제출 시 서버 전송',
"""function sugFinishSubmit(url, noteVal, ai, stat, noteEl){
    SUG_QUEUE.push({
      id: 'sug_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
      u: url, note: noteVal, ts: Date.now(), status: 'pending',
      ai: ai,
      qr: (typeof QRNAV!=='undefined' && QRNAV.gate) ? QRNAV.gate() : null
    });
    sugSaveQueue();
    sugBadgeSync();""",
"""function sugFinishSubmit(url, noteVal, ai, stat, noteEl){
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
    if(typeof SUGDB !== 'undefined') SUGDB.pushOne(rec);""")

# ═══════════ 7. 승인/거절 — 원격 반영 ═══════════
patch('승인 조회 sugFind',
"""function sugApprove(id){
  var s = SUG_QUEUE.find(function(x){ return x.id===id; });
  if(!s) return;""",
"""function sugApprove(id){
  var s = sugFind(id);
  if(!s) return;""")
patch('승인 → 서버 반영',
"""  s.status = 'approved'; s.code = code + (sub ? ('-'+sub) : ''); s.handledTs = Date.now();
  sugSaveQueue();
  sugAdminRender();
}
function sugReject(id){
  var s = SUG_QUEUE.find(function(x){ return x.id===id; });
  if(!s) return;
  s.status = 'rejected'; s.handledTs = Date.now();
  sugSaveQueue();
  sugAdminRender();
}""",
"""  s.status = 'approved'; s.code = code + (sub ? ('-'+sub) : ''); s.handledTs = Date.now();
  /* v49 : 서버에도 승인 기록 + 승인된 사진을 모든 사용자에게 배포 */
  if(typeof SUGDB !== 'undefined' && s.fid){
    SUGDB.setStatus(s.fid, {status:'approved', code:s.code, handledTs:s.handledTs});
    SUGDB.publishPhoto({code:code, sub:sub||'', n:(sub ? '건의함_'+sub+'.jpg' : '건의함_'+id+'.jpg'),
                        u:s.u, cap:s.note || (sub||''), ts:Date.now(), sid:s.fid});
    SUG_REMOTE = SUG_REMOTE.filter(function(x){ return x.id!==id; });
  }
  sugSaveQueue();
  sugAdminRender();
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
}""")

# 관리자 카드에 '이 폰에서만' 표시
patch('카드 로컬 표시',
"""            '<div class="sugWhen">'+when+'</div>' +
            (typeof SUGAI!=='undefined' ? SUGAI.adminBadge(s) : '') +""",
"""            '<div class="sugWhen">'+when+(s.fid ? '' : '<span class="sugLocal">이 폰에서만 · 서버 미전송</span>')+'</div>' +
            (typeof SUGAI!=='undefined' ? SUGAI.adminBadge(s) : '') +""")

# ═══════════ 8. 관리자 진입 — 웹에서는 서버 로그인 ═══════════
patch('관리자 진입 분기',
"""function openAdminGate(from){
  pwGateFrom = from || 'sset';
  go('spwgate');
  setTimeout(function(){""",
"""function openAdminGate(from){
  pwGateFrom = from || 'sset';
  /* v49 : 웹(https)으로 열었으면 서버 계정 로그인, 파일로 연 개발 환경이면 숫자 비밀번호 */
  if(typeof SUGDB !== 'undefined' && SUGDB.online()){
    if(SUGDB.user()){ go('sph'); return; }          // 이미 로그인돼 있으면 바로
    go('spwgate');
    fbGateShow(true);
    SUGDB.ensure().then(function(){
      if(SUGDB.user()){ go('sph'); return; }
      fbGateState('on', '서버 연결됨');
      var em = document.getElementById('fbEmail'); if(em) em.focus();
    })['catch'](function(){
      /* 서버 SDK를 못 불러오면 숫자 비밀번호로 대체 — 발표장에서 막히지 않게 */
      fbGateShow(false);
      var err = document.getElementById('pwErr');
      if(err) err.textContent = '서버에 연결하지 못해 로컬 비밀번호로 전환했습니다.';
    });
    return;
  }
  fbGateShow(false);
  go('spwgate');
  setTimeout(function(){""")

# ═══════════ 9. sadmin 진입 시 서버 목록 구독 ═══════════
patch('sadmin 진입 훅',
"""  if(id==='ssug' && typeof SUGAI!=='undefined') SUGAI.warmup();""",
"""  if(id==='ssug' && typeof SUGAI!=='undefined') SUGAI.warmup();
  if(id==='ssug' && typeof SUGDB!=='undefined') SUGDB.prepSubmit();
  if(id==='sadmin' && typeof SUGDB!=='undefined') SUGDB.watchAdmin();
  if(id!=='sadmin' && typeof SUGDB!=='undefined') SUGDB.unwatchAdmin();""")

# ═══════════ 10. SUGDB 모듈 ═══════════
MODULE = r'''
<!-- ══════════════════════════════════════════════════════════════════
     서버 연동 (v49) — Firestore

     지금까지 건의함 제보는 제보한 사람의 폰(localStorage)에만 남았다.
     이제 제보는 Firestore에 저장되고, 관리자는 어느 기기에서든 같은 목록을
     실시간으로 본다. 승인된 사진은 photos 컬렉션에 올라가 앱을 여는 모든
     사람에게 반영된다.

     · 서버 SDK는 필요할 때만 내려받는다 (건의함·관리자 화면 진입 시)
     · 파일로 직접 연 상태(file://)에서는 서버를 쓰지 않는다 (개발 모드)
     · 인터넷이 없으면 제보를 폰에 남겨두고, 연결되면 자동으로 보낸다
     ══════════════════════════════════════════════════════════════════ -->
<script>
var SUGDB = (function(){
  'use strict';

  var CFG = {
    apiKey: "AIzaSyBclnF6tX3FbuKxjBPaxVjkHF1rfRZAjnw",
    authDomain: "minjong-b974c.firebaseapp.com",
    projectId: "minjong-b974c",
    storageBucket: "minjong-b974c.firebasestorage.app",
    messagingSenderId: "1045236204377",
    appId: "1:1045236204377:web:b849dcc95f2bd638bd0248"
  };
  var VER  = '12.3.0';
  var BASE = 'https://www.gstatic.com/firebasejs/' + VER + '/';
  var COL_SUG = 'suggestions', COL_PH = 'photos';
  var MAX_BYTES = 900000;            // Firestore 문서 1MB 한도 안에서 사진 크기 상한

  var app = null, db = null, auth = null;
  var loading = null, failed = false, unsub = null, curUser = null;
  var pushing = false;

  function online(){ return location.protocol === 'http:' || location.protocol === 'https:'; }
  function $(id){ return document.getElementById(id); }

  function script(src){
    return new Promise(function(res, rej){
      var sc = document.createElement('script');
      sc.src = src; sc.async = true;
      sc.onload = function(){ res(true); };
      sc.onerror = function(){ rej('load:'+src); };
      document.head.appendChild(sc);
      setTimeout(function(){ rej('timeout:'+src); }, 25000);
    });
  }

  /* SDK 내려받고 초기화. 여러 번 불러도 한 번만 실행된다. */
  function ensure(){
    if(app) return Promise.resolve(true);
    if(failed) return Promise.reject('failed');
    if(loading) return loading;
    if(!online()) { failed = true; return Promise.reject('offline-mode'); }
    loading = (window.firebase ? Promise.resolve() : script(BASE + 'firebase-app-compat.js'))
      .then(function(){ return (window.firebase && firebase.firestore) ? null : script(BASE + 'firebase-firestore-compat.js'); })
      .then(function(){ return (window.firebase && firebase.auth) ? null : script(BASE + 'firebase-auth-compat.js'); })
      .then(function(){
        app  = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(CFG);
        db   = firebase.firestore();
        auth = firebase.auth();
        return new Promise(function(res){
          var done = false;
          auth.onAuthStateChanged(function(u){
            curUser = u || null;
            uiAuth();
            if(!done){ done = true; res(true); }
          });
          setTimeout(function(){ if(!done){ done = true; res(true); } }, 3000);
        });
      })
      .then(function(){ return true; })
      ['catch'](function(e){ failed = true; loading = null; throw e; });
    return loading;
  }

  /* ── 사진 크기 맞추기 (문서 1MB 한도) ── */
  function fit(dataUrl){
    return new Promise(function(res){
      if(!dataUrl || dataUrl.length <= MAX_BYTES){ res(dataUrl); return; }
      var im = new Image();
      im.onload = function(){
        var dim = 1024, q = 0.7, out = dataUrl, tries = 0;
        while(tries++ < 6){
          var sc = Math.min(1, dim / Math.max(im.width, im.height));
          var cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(im.width*sc)); cv.height = Math.max(1, Math.round(im.height*sc));
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
          out = cv.toDataURL('image/jpeg', q);
          if(out.length <= MAX_BYTES) break;
          dim = Math.round(dim*0.8); q = Math.max(0.45, q-0.08);
        }
        res(out);
      };
      im.onerror = function(){ res(dataUrl); };
      im.src = dataUrl;
    });
  }

  /* ── 제보 올리기 ── */
  function pushOne(rec){
    if(!online()){ syncMsg('이 폰에 저장됨 (개발 모드)'); return Promise.resolve(false); }
    syncMsg('서버로 보내는 중…', 'load');
    return ensure().then(function(){
      return fit(rec.u);
    }).then(function(u){
      var doc = {
        u: u, note: rec.note || '', ts: rec.ts, status: 'pending',
        ai: rec.ai ? JSON.parse(JSON.stringify(rec.ai)) : null,
        qr: rec.qr || null,
        ua: (navigator.userAgent || '').slice(0, 120),
        cid: rec.id
      };
      return db.collection(COL_SUG).add(doc);
    }).then(function(ref){
      rec.fid = ref.id; rec.synced = true;
      if(typeof sugSaveQueue === 'function') sugSaveQueue();
      if(typeof sugBadgeSync === 'function') sugBadgeSync();
      syncMsg('✓ 서버에 전송됨 — 관리자 화면에 바로 보입니다', 'on');
      return true;
    })['catch'](function(e){
      rec.synced = false;
      if(typeof sugSaveQueue === 'function') sugSaveQueue();
      syncMsg('인터넷이 없어 이 폰에 저장했어요. 연결되면 자동으로 보냅니다.', 'off');
      return false;
    });
  }

  /* 아직 못 보낸 제보 다시 시도 (앱 시작·온라인 복귀·건의함 진입 시) */
  function retryUnsynced(){
    if(pushing || !online() || typeof SUG_QUEUE === 'undefined') return;
    var todo = SUG_QUEUE.filter(function(r){ return r.status==='pending' && !r.synced; });
    if(!todo.length) return;
    pushing = true;
    var i = 0;
    (function next(){
      if(i >= todo.length){ pushing = false; return; }
      pushOne(todo[i++]).then(next, next);
    })();
  }

  function prepSubmit(){ syncMsg(''); ensure().then(retryUnsynced)['catch'](function(){}); }

  function syncMsg(msg, state){
    var el = $('sugSync'); if(!el) return;
    el.textContent = msg || '';
    el.style.color = state==='on' ? '#39FF88' : (state==='off' ? '#FFC93C' : '#7C8AA0');
  }

  /* ── 관리자 : 실시간 구독 ── */
  function watchAdmin(){
    if(!online()){ dbState('off', '개발 모드 — 이 폰의 제보만 표시'); return; }
    dbState('load', '서버 연결 중…');
    ensure().then(function(){
      if(!curUser){ dbState('off', '로그인 필요'); return; }
      if(unsub) return;
      unsub = db.collection(COL_SUG).where('status', '==', 'pending')
        .onSnapshot(function(snap){
          var arr = [];
          snap.forEach(function(d){
            var x = d.data(); x.id = d.id; x.fid = d.id;
            arr.push(x);
          });
          arr.sort(function(a,b){ return (a.ts||0) - (b.ts||0); });   // 화면은 reverse()로 최신이 위
          SUG_REMOTE = arr;
          dbState('on', '실시간 연결 · 대기 ' + arr.length + '건');
          if(typeof sugAdminRender === 'function') sugAdminRender();
          if(typeof sugBadgeSync === 'function') sugBadgeSync();
        }, function(err){
          dbState('off', '서버 읽기 실패 : ' + (err && err.code || err));
        });
    })['catch'](function(){ dbState('off', '서버에 연결할 수 없음'); });
  }
  function unwatchAdmin(){ if(unsub){ try{ unsub(); }catch(e){} unsub = null; } }

  function setStatus(fid, patch){
    return ensure().then(function(){ return db.collection(COL_SUG).doc(fid).update(patch); })
      ['catch'](function(e){ console.warn('setStatus 실패', e); });
  }

  /* ── 승인된 사진 배포 ── */
  function publishPhoto(entry){
    return ensure().then(function(){ return fit(entry.u); })
      .then(function(u){ entry.u = u; return db.collection(COL_PH).add(entry); })
      ['catch'](function(e){ console.warn('publishPhoto 실패', e); });
  }

  /* 앱 시작 시 : 서버에 올라온 승인 사진을 내려받아 앱 사진에 합친다 */
  function loadPhotos(){
    if(!online()) return Promise.resolve(0);
    return ensure().then(function(){
      return db.collection(COL_PH).get();
    }).then(function(snap){
      var n = 0;
      var items = [];
      snap.forEach(function(d){ var x = d.data(); x.pid = d.id; items.push(x); });
      items.sort(function(a,b){ return (a.ts||0) - (b.ts||0); });    // 오래된 것부터 적용 → 최신이 맨 앞
      items.forEach(function(p){
        if(!p.code || !p.u) return;
        if(!ROOM_PHOTOS[p.code]) ROOM_PHOTOS[p.code] = [];
        var arr = ROOM_PHOTOS[p.code];
        if(arr.some(function(q){ return q.pid === p.pid; })) return;   // 이미 반영됨
        var e = {n:p.n || ('서버_'+p.pid+'.jpg'), u:p.u, cap:p.cap || undefined, pid:p.pid};
        if(p.sub){
          var idx = -1;
          arr.forEach(function(q, i){ if(idx<0 && ((q.n||'').indexOf('('+p.sub+')') !== -1 || q.n === '건의함_'+p.sub+'.jpg')) idx = i; });
          if(idx >= 0) arr[idx] = e; else arr.unshift(e);
        } else arr.unshift(e);
        n++;
      });
      if(n){
        if(typeof phNormalize === 'function') phNormalize();
        if(typeof phRender === 'function') phRender();
      }
      return n;
    })['catch'](function(){ return 0; });
  }

  /* ── 로그인 ── */
  function login(email, pw){
    return ensure().then(function(){ return auth.signInWithEmailAndPassword(email, pw); })
      .then(function(c){ curUser = c.user; uiAuth(); return c.user; });
  }
  function logout(){
    if(!auth) return Promise.resolve();
    return auth.signOut().then(function(){ curUser = null; unwatchAdmin(); SUG_REMOTE = []; uiAuth(); });
  }
  function user(){ return curUser; }

  function uiAuth(){
    var b = $('sugLogoutBtn'); if(b) b.style.display = curUser ? '' : 'none';
  }
  function dbState(state, txt){
    var el = $('sugDbState'), t = $('sugDbStateTxt');
    if(el) el.className = 'dbState ' + state;
    if(t) t.textContent = txt || '';
  }

  /* 온라인 복귀하면 못 보낸 제보 재전송 */
  window.addEventListener('online', function(){ setTimeout(retryUnsynced, 1500); });
  /* 앱 시작 3초 뒤 : 승인 사진 내려받기 + 밀린 제보 전송 (첫 화면 속도에 영향 없게 늦춘다) */
  if(online()) setTimeout(function(){
    loadPhotos()['catch'](function(){});
    retryUnsynced();
  }, 3000);

  return { ensure:ensure, online:online, pushOne:pushOne, retryUnsynced:retryUnsynced, prepSubmit:prepSubmit,
           watchAdmin:watchAdmin, unwatchAdmin:unwatchAdmin, setStatus:setStatus,
           publishPhoto:publishPhoto, loadPhotos:loadPhotos,
           login:login, logout:logout, user:user, fit:fit, CFG:CFG };
})();

/* ── 로그인 화면 동작 ── */
function fbGateShow(useFb){
  var wrap = document.querySelector('#spwgate .pwGateWrap');
  var fb = document.getElementById('fbGate');
  if(wrap) wrap.classList.toggle('hide', !!useFb);
  if(fb) fb.classList.toggle('on', !!useFb);
  var err = document.getElementById('fbErr'); if(err) err.textContent = '';
  var tip = document.querySelector('#spwgate .pwGateTip');
  if(tip && !useFb) tip.textContent = (LANG==='ko') ? '관리자 비밀번호 7자리를 입력해 주세요. (개발 모드)' : 'Enter the 7-digit admin password. (dev mode)';
  if(useFb) fbGateState('load', '서버 연결 중…');
}
function fbGateState(state, txt){
  var el = document.getElementById('fbGateState'), t = document.getElementById('fbGateStateTxt');
  if(el) el.className = 'dbState ' + state;
  if(t) t.textContent = txt || '';
}
function fbLogin(){
  var em = document.getElementById('fbEmail'), pw = document.getElementById('fbPw');
  var err = document.getElementById('fbErr'), btn = document.getElementById('fbLoginBtn');
  if(!em || !pw) return;
  var e = em.value.trim(), p = pw.value;
  if(!e || !p){ if(err) err.textContent = '이메일과 비밀번호를 입력해 주세요.'; return; }
  if(btn) btn.disabled = true;
  if(err) err.textContent = '';
  SUGDB.login(e, p).then(function(){
    if(btn) btn.disabled = false;
    pw.value = '';
    go('sph');
  })['catch'](function(ex){
    if(btn) btn.disabled = false;
    var code = ex && ex.code || '';
    var msg = /wrong-password|invalid-credential|invalid-login|user-not-found/.test(code)
      ? '이메일 또는 비밀번호가 올바르지 않습니다.'
      : /too-many-requests/.test(code) ? '시도가 너무 많습니다. 잠시 뒤 다시 해주세요.'
      : /network/.test(code) ? '인터넷 연결을 확인해 주세요.'
      : '로그인하지 못했습니다. (' + code + ')';
    if(err) err.textContent = msg;
  });
}
function fbLogout(){
  SUGDB.logout().then(function(){ go('s1'); });
}
</script>
</body>'''
patch('SUGDB 모듈', '</body>', MODULE)

io.open(DST,'w',encoding='utf-8').write(s)
print('\n원본 %d → %d bytes (+%d) · 패치 %d개 · %s'%(orig,len(s),len(s)-orig,len(done),DST))
