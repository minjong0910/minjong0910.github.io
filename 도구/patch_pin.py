# -*- coding: utf-8 -*-
"""v49 → v50 : 관리자 로그인을 숫자 7자리로 — 겉은 숫자패드, 속은 서버 로그인(고정 이메일 + 7자리)"""
import io, sys
SRC='/home/claude/gunsan_b3nav_DB_v49.html'; DST='/home/claude/gunsan_b3nav_DB_v50.html'
s=io.open(SRC,encoding='utf-8').read(); orig=len(s); done=[]
def patch(name, old, new, count=1):
    global s
    n=s.count(old)
    if n!=count: print('  [실패] %s : 앵커 %d개'%(name,n)); sys.exit(1)
    s=s.replace(old,new,count); done.append(name); print('  [OK] %s'%name)

# 1. SUGDB : 관리자 이메일 고정 + 숫자 로그인
patch('ADMIN_EMAIL + loginPin',
"""  function login(email, pw){""",
"""  /* 관리자 계정 이메일 — 비밀이 아니라 '계정 이름'이다. 비밀번호는 사용자가 치는 7자리.
     Firebase 콘솔 Authentication → Users 에 이 이메일로 사용자를 만들고, 비밀번호를 7자리 숫자로 두면 된다. */
  var ADMIN_EMAIL = 'admin@b3nav.app';
  function loginPin(pin){ return login(ADMIN_EMAIL, String(pin)); }

  function login(email, pw){""")
patch('loginPin 노출',
"""           login:login, logout:logout, user:user, fit:fit, CFG:CFG };""",
"""           login:login, loginPin:loginPin, logout:logout, user:user, fit:fit, CFG:CFG,
           get ADMIN_EMAIL(){ return ADMIN_EMAIL; } };""")

# 2. 관리자 진입 : 웹에서도 숫자패드
patch('진입 화면 숫자패드로',
"""  if(typeof SUGDB !== 'undefined' && SUGDB.online()){
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
  go('spwgate');""",
"""  /* v50 : 웹에서도 숫자 7자리를 친다. 속으로는 그 7자리를 서버 계정 비밀번호로 써서 로그인한다. */
  if(typeof SUGDB !== 'undefined' && SUGDB.online()){
    if(SUGDB.user()){ go('sph'); return; }          // 이미 로그인돼 있으면 바로
    SUGDB.ensure().then(function(){ if(SUGDB.user() && document.getElementById('spwgate').classList.contains('on')) go('sph'); })['catch'](function(){});
  }
  fbGateShow(false);
  go('spwgate');""")

# 3. 비밀번호 확인 : 웹이면 서버 로그인
patch('checkAdminPw 서버 로그인',
"""function checkAdminPw(){
  var inp = document.getElementById('pwInput');
  var err = document.getElementById('pwErr');
  if(!inp) return;
  if(Date.now() < admGetLockUntil()){ admRefreshLockUI(); inp.value=''; return; }
  if(inp.value === ADMIN_PW){
    inp.value = '';
    if(err) err.textContent = '';
    admSetFail(0); admSetLockUntil(0);
    go('sph');
  }else{""",
"""var admChecking = false;
function admFail(inp, err){
  var fails = admGetFail()+1;
  if(fails >= ADMIN_MAX_FAIL){
    admSetFail(0);
    admSetLockUntil(Date.now()+ADMIN_LOCK_MS);
    admRefreshLockUI();
  }else{
    admSetFail(fails);
    var left = ADMIN_MAX_FAIL - fails;
    if(err) err.textContent = (LANG==='ko')
      ? ('비밀번호가 올바르지 않습니다. (남은 시도 '+left+'회)')
      : ('Incorrect password. ('+left+' attempts left)');
  }
  inp.value = '';
  inp.focus();
}
function checkAdminPw(){
  var inp = document.getElementById('pwInput');
  var err = document.getElementById('pwErr');
  if(!inp || admChecking) return;
  if(Date.now() < admGetLockUntil()){ admRefreshLockUI(); inp.value=''; return; }
  if(inp.value.length < 7) return;

  /* v50 : 웹으로 열었으면 7자리를 서버 계정 비밀번호로 보내 로그인한다 */
  if(typeof SUGDB !== 'undefined' && SUGDB.online()){
    var pin = inp.value;
    admChecking = true;
    if(err){ err.style.color = '#7C8AA0'; err.textContent = (LANG==='ko') ? '확인하는 중…' : 'Checking…'; }
    SUGDB.loginPin(pin).then(function(){
      admChecking = false;
      inp.value = '';
      if(err){ err.textContent = ''; err.style.color = ''; }
      admSetFail(0); admSetLockUntil(0);
      go('sph');
    })['catch'](function(ex){
      admChecking = false;
      if(err) err.style.color = '';
      var code = (ex && ex.code) || String(ex || '');
      if(/network|load:|timeout:|failed|offline/.test(code)){
        if(err) err.textContent = (LANG==='ko') ? '서버에 연결하지 못했어요. 인터넷을 확인하고 다시 시도해 주세요.' : 'Could not reach the server. Check your connection.';
        inp.value = ''; inp.focus();
      }else if(/too-many/.test(code)){
        if(err) err.textContent = (LANG==='ko') ? '시도가 너무 많습니다. 잠시 뒤 다시 해주세요.' : 'Too many attempts. Try again later.';
        inp.value = '';
      }else{
        admFail(inp, err);
      }
    });
    return;
  }

  /* 파일로 직접 연 개발 모드 : 로컬 비밀번호 */
  if(inp.value === ADMIN_PW){
    inp.value = '';
    if(err) err.textContent = '';
    admSetFail(0); admSetLockUntil(0);
    go('sph');
  }else{""")

# 4. 안내 문구 : 웹에서는 '(개발 모드)' 안 붙게
patch('안내 문구',
"""  if(tip && !useFb) tip.textContent = (LANG==='ko') ? '관리자 비밀번호 7자리를 입력해 주세요. (개발 모드)' : 'Enter the 7-digit admin password. (dev mode)';""",
"""  if(tip && !useFb) tip.textContent = (typeof SUGDB!=='undefined' && SUGDB.online())
    ? ((LANG==='ko') ? '관리자 비밀번호 7자리를 입력해 주세요.' : 'Enter the 7-digit admin password.')
    : ((LANG==='ko') ? '관리자 비밀번호 7자리를 입력해 주세요. (개발 모드)' : 'Enter the 7-digit admin password. (dev mode)');""")

io.open(DST,'w',encoding='utf-8').write(s)
print('\n원본 %d → %d bytes (+%d) · 패치 %d개'%(orig,len(s),len(s)-orig,len(done)))
