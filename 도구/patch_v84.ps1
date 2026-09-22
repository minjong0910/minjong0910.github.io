# v84 — 보안 : 코드에 적힌 관리자 비밀번호를 없애고, 관리자는 "명단에 있는 계정"만
#
#   찾은 문제 (2026-09-22)
#     · 관리자 비밀번호 7자리가 index.html 에 글자 그대로 있었다 (var ADMIN_PW).
#       사이트는 누구나 열 수 있어 '페이지 소스 보기'로 보인다.
#     · 서버 규칙이 request.auth != null — 로그인만 하면 누구나 관리자였다.
#     · 관리자 계정이 하나(admin@b3nav.app)를 여럿이 같이 쓰는 방식이었다.
#
#   고친 것
#     · 숫자 7자리 화면과 그에 딸린 함수 13개를 지웠다. 관리자는 이메일·비밀번호(서버 계정)로만 들어간다.
#       이메일 로그인 화면(#fbGate)은 v49 에 만들어 두고 v50 부터 숨겨 두었던 것을 다시 쓴다.
#     · 로그인하면(앱을 다시 열어 자동으로 로그인될 때도) 서버의 admins/{UID} 가 있는지 확인하고,
#       없으면 바로 로그아웃시킨다. — 화면 쪽 확인일 뿐이고, 진짜 막는 것은 서버 규칙(서버/firestore.rules)이다.
#     · 고정 이메일(ADMIN_EMAIL)과 loginPin 을 지웠다. 관리자마다 자기 계정을 쓴다.
#
#   사용법 : pwsh -File patch_v84.ps1 <대상파일>
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
# 시작 앵커부터 끝 앵커 '바로 앞'까지를 통째로 바꾼다 (끝 앵커는 남는다)
function SwapRange([string]$from, [string]$to, [string]$new, [string]$label){
  $script:n++
  $from = $from -replace "`r`n", "`n"; $to = $to -replace "`r`n", "`n"; $new = $new -replace "`r`n", "`n"
  $a = ([regex]::Matches($script:s, [regex]::Escape($from))).Count
  $b = ([regex]::Matches($script:s, [regex]::Escape($to))).Count
  if($a -ne 1 -or $b -ne 1){ throw ("[{0}] 시작 앵커 {1}개 · 끝 앵커 {2}개" -f $label, $a, $b) }
  $i = $script:s.IndexOf($from); $j = $script:s.IndexOf($to)
  if($j -le $i){ throw ("[{0}] 끝 앵커가 시작보다 앞에 있음" -f $label) }
  $script:s = $script:s.Substring(0, $i) + $new + $script:s.Substring($j)
  Write-Host ("  [OK] {0}  ({1}자 → {2}자)" -f $label, ($j - $i), $new.Length) -ForegroundColor Green
}

# ① 로그인 화면 — 숫자 입력칸·확인 버튼을 지우고, 파일로 열었을 때의 안내만 남긴다
Swap @'
      <p class="pwGateTip" data-ko="관리자 비밀번호 7자리를 입력해 주세요." data-en="Enter the 7-digit admin password.">관리자 비밀번호 7자리를 입력해 주세요.</p>
      <input id="pwInput" class="pwInput" type="text" inputmode="numeric" pattern="[0-9]*"
        maxlength="7" autocomplete="off" autocorrect="off" spellcheck="false"
        oninput="pwInputSanitize(this)" onkeydown="if(event.key==='Enter'){checkAdminPw();}">
      <div class="pwErr" id="pwErr"></div>
      <button class="big" id="pwConfirmBtn" style="margin-top:18px;" onclick="checkAdminPw()" data-ko="확인" data-en="Confirm">확인</button>
    </div>
    <!-- v49 : 웹으로 열었을 때는 서버 계정으로 로그인한다. 파일로 직접 연 개발 환경에서만 위 숫자 비밀번호를 쓴다. -->
'@ @'
      <p class="pwGateTip" data-ko="관리자 기능은 웹 주소(https)로 열었을 때 관리자 계정으로만 쓸 수 있습니다." data-en="Admin tools are available only on the web address, with an admin account.">관리자 기능은 웹 주소(https)로 열었을 때 관리자 계정으로만 쓸 수 있습니다.</p>
    </div>
    <!-- v84 : 관리자는 서버 계정(이메일·비밀번호)으로만 들어간다. 서버의 admins 명단에 있어야 한다. -->
'@ '로그인 화면'

# ② 숫자 비밀번호 구역 전체 → 로고 입구 + 이메일 로그인으로 가는 openAdminGate 만
SwapRange '/* 관리자(사진 등록/전체 사진 관리) 진입 시 비밀번호 확인' '/* 일부 iOS 브라우저/웹뷰 환경에서는' @'
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
}
'@ '숫자 비밀번호 구역'

# ③ 로그인 화면 전환 — 숫자 화면 안내 문구는 이제 없다
Swap @'
  var tip = document.querySelector('#spwgate .pwGateTip');
  if(tip && !useFb) tip.textContent = (typeof SUGDB!=='undefined' && SUGDB.online())
    ? ((LANG==='ko') ? '관리자 비밀번호 7자리를 입력해 주세요.' : 'Enter the 7-digit admin password.')
    : ((LANG==='ko') ? '관리자 비밀번호 7자리를 입력해 주세요. (개발 모드)' : 'Enter the 7-digit admin password. (dev mode)');
  if(useFb) fbGateState('load', '서버 연결 중…');
'@ @'
  if(useFb) fbGateState('load', '서버 연결 중…');
'@ '로그인 화면 전환'

# ④ 로그인 실패 문구 — 명단에 없는 계정
Swap @'
    var msg = /wrong-password|invalid-credential|invalid-login|user-not-found/.test(code)
      ? '이메일 또는 비밀번호가 올바르지 않습니다.'
'@ @'
    var msg = /not-admin/.test(code)
      ? '관리자 명단에 없는 계정입니다. 관리자에게 명단(admins)에 추가해 달라고 하세요.'
      : /wrong-password|invalid-credential|invalid-login|user-not-found/.test(code)
      ? '이메일 또는 비밀번호가 올바르지 않습니다.'
'@ '로그인 실패 문구'

# ⑤ 앱을 다시 열어 로그인이 되살아날 때도 명단을 확인한다
Swap @'
          auth.onAuthStateChanged(function(u){
            curUser = u || null;
            uiAuth();
            if(!done){ done = true; res(true); }
          });
'@ @'
          auth.onAuthStateChanged(function(u){
            /* v84 : 로그인돼 있어도 admins 명단에 없으면 관리자로 보지 않고 로그아웃시킨다 */
            (u ? isAdminUid(u.uid) : Promise.resolve(false)).then(function(ok){
              curUser = ok ? u : null;
              if(u && !ok) auth.signOut();
              uiAuth();
              if(!done){ done = true; res(true); }
            });
          });
'@ '자동 로그인 때 명단 확인'

# ⑥ 로그인 — 고정 이메일·loginPin 을 없애고, 명단을 확인한다
Swap @'
  /* 관리자 계정 이메일 — 비밀이 아니라 '계정 이름'이다. 비밀번호는 사용자가 치는 7자리.
     Firebase 콘솔 Authentication → Users 에 이 이메일로 사용자를 만들고, 비밀번호를 7자리 숫자로 두면 된다. */
  var ADMIN_EMAIL = 'admin@b3nav.app';
  function loginPin(pin){ return login(ADMIN_EMAIL, String(pin)); }

  function login(email, pw){
    return ensure().then(function(){ return auth.signInWithEmailAndPassword(email, pw); })
      .then(function(c){ curUser = c.user; uiAuth(); return c.user; });
  }
'@ @'
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
'@ '로그인'

Swap @'
           login:login, loginPin:loginPin, logout:logout, user:user, fit:fit, CFG:CFG,
           get ADMIN_EMAIL(){ return ADMIN_EMAIL; } };
'@ @'
           login:login, logout:logout, user:user, fit:fit, CFG:CFG };
'@ '내보내는 함수'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
