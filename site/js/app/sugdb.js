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
            /* v84 : 로그인돼 있어도 admins 명단에 없으면 관리자로 보지 않고 로그아웃시킨다 */
            (u ? isAdminUid(u.uid) : Promise.resolve(false)).then(function(ok){
              curUser = ok ? u : null;
              if(u && !ok) auth.signOut();
              uiAuth();
              if(!done){ done = true; res(true); }
            });
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
      /* v61 : 전송 성공은 사용자가 알 필요 없다 — '보내는 중' 문구만 지운다.
         실패했을 때는 아래 catch 에서 안내가 나간다. */
      syncMsg('');
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

  /* v51 : Firestore REST 응답의 값 표기({stringValue:..} 등)를 보통 값으로 */
  function fromValue(v){
    if(!v || typeof v !== 'object') return v;
    if('stringValue' in v) return v.stringValue;
    if('integerValue' in v) return Number(v.integerValue);
    if('doubleValue' in v) return v.doubleValue;
    if('booleanValue' in v) return v.booleanValue;
    if('nullValue' in v) return null;
    if('timestampValue' in v) return Date.parse(v.timestampValue);
    if('mapValue' in v) return fromFields((v.mapValue && v.mapValue.fields) || {});
    if('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(fromValue);
    return null;
  }
  function fromFields(f){ var o = {}; for(var k in f) o[k] = fromValue(f[k]); return o; }
  /* v51 : 승인 사진 목록은 공개 읽기라 SDK 없이 REST 한 번으로 받는다
     (Firebase SDK 500KB를 길안내만 쓰는 사람 폰에 내려받지 않게). 실패하면 예전 SDK 경로로. */
  function restPhotos(){
    if(typeof fetch !== 'function') return Promise.reject('nofetch');
    var url = 'https://firestore.googleapis.com/v1/projects/' + CFG.projectId + '/databases/(default)/documents/' + COL_PH +
              '?pageSize=300&key=' + encodeURIComponent(CFG.apiKey);
    return fetch(url).then(function(r){ if(!r.ok) throw 'http'+r.status; return r.json(); }).then(function(j){
      var items = [];
      (j.documents || []).forEach(function(d){
        var x = fromFields(d.fields || {}); x.pid = String(d.name || '').split('/').pop(); items.push(x);
      });
      return items;
    });
  }
  function sdkPhotos(){
    return ensure().then(function(){ return db.collection(COL_PH).get(); }).then(function(snap){
      var items = [];
      snap.forEach(function(d){ var x = d.data(); x.pid = d.id; items.push(x); });
      return items;
    });
  }

  /* 앱 시작 시 : 서버에 올라온 승인 사진을 내려받아 앱 사진에 합친다 */
  function loadPhotos(){
    if(!online()) return Promise.resolve(0);
    return restPhotos()['catch'](function(){ return sdkPhotos(); }).then(function(items){
      var n = 0;
      items.sort(function(a,b){ return (a.ts||0) - (b.ts||0); });    // 오래된 것부터 적용 → 최신이 맨 앞
      /* v64 : 관리자가 뺀 사진(숨김 기록) — 모든 기기에서 똑같이 뺀다 */
      var hidden = {}, live = [];
      items.forEach(function(p){ if(p.hide && p.code && p.n) hidden[p.code + '|' + p.n] = 1; });
      items.forEach(function(p){
        if(p.hide) return;
        if(!p.code || !p.u) return;
        if(hidden[p.code + '|' + (p.n || '')]) return;
        live.push(p);
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
      Object.keys(hidden).forEach(function(k){
        var i = k.indexOf('|'), c = k.slice(0, i), nm = k.slice(i + 1), arr = ROOM_PHOTOS[c];
        if(!arr) return;
        var keep = arr.filter(function(q){ return q.n !== nm; });
        if(keep.length !== arr.length){ n++; if(keep.length) ROOM_PHOTOS[c] = keep; else delete ROOM_PHOTOS[c]; }
      });
      /* v64 : 서버 승인 사진을 이 기기의 AI 도 배운다 (모델은 필요할 때 불러온다) */
      if(typeof SUGAI !== 'undefined' && SUGAI.syncServer) SUGAI.syncServer(live);
      if(n){
        if(typeof phNormalize === 'function') phNormalize();
        if(typeof phRender === 'function') phRender();
      }
      return n;
    })['catch'](function(){ return 0; });
  }

  /* ── 로그인 ── */
  /* v84 : 관리자 = 서버 admins 명단에 UID 가 있는 계정. 관리자마다 자기 계정을 쓴다.
     (예전에는 고정 이메일 하나를 숫자 7자리로 여럿이 같이 썼고, 그 숫자가 코드에 적혀 있었다)
     이 확인은 화면을 위한 것이고, 서버 규칙(서버/firestore.rules)이 실제로 막는다. */
  function isAdminUid(uid){
    return db.collection('admins').doc(uid).get()
      .then(function(snap){ return !!snap.exists; }, function(){ return false; });
  }
  function login(email, pw){
    return ensure().then(function(){ return auth.signInWithEmailAndPassword(email, pw); })
      .then(function(c){
        return isAdminUid(c.user.uid).then(function(ok){
          if(ok){ curUser = c.user; uiAuth(); return c.user; }
          return auth.signOut().then(function(){
            curUser = null; uiAuth();
            var e = new Error('관리자 명단에 없는 계정'); e.code = 'auth/not-admin'; throw e;
          });
        });
      });
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
           get lastPubErr(){ return lastPubErr; },                   /* v71 */
           unpublishPhoto:unpublishPhoto, hidePhoto:hidePhoto, unhidePhoto:unhidePhoto,
           login:login, logout:logout, user:user, fit:fit, CFG:CFG };
})();

/* ── 로그인 화면 동작 ── */
function fbGateShow(useFb){
  var wrap = document.querySelector('#spwgate .pwGateWrap');
  var fb = document.getElementById('fbGate');
  if(wrap) wrap.classList.toggle('hide', !!useFb);
  if(fb) fb.classList.toggle('on', !!useFb);
  var err = document.getElementById('fbErr'); if(err) err.textContent = '';
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
    var msg = /not-admin/.test(code)
      ? '관리자 명단에 없는 계정입니다. 관리자에게 명단(admins)에 추가해 달라고 하세요.'
      : /wrong-password|invalid-credential|invalid-login|user-not-found/.test(code)
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
