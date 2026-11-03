"use strict";
/* consent.js — 처음 켤 때 동의 · 기능별 허용 · 건의함 사진 개인정보 · 이용안내 마지막 쪽 (2026-11-03 사용자가 견본으로 정한 것)
   견본 : 생성물\견본_링크공유_시간표_개인정보\견본 눌러보기 — 개인정보 동의 · 길 공유하기 · 내 시간표.html (사용자가 눌러 보며 열 번 고침)

   · 켜는 화면 → 「시작하기 전에 확인해 주세요」 → 쉬운 사용모드 「처음이세요?」 → 첫 화면.
     필수 : 이용 안내 · 이 폰에 저장 · 개인정보 처리방침 · 오픈소스 라이선스 고지 / 선택 : 개인정보 수집·이용(건의함 사진 — 11/04 두 줄을 합침) · 카메라 · 알림.
     (처리방침 · 라이선스 · 수집·이용 세 줄은 11/03 사용자 — 설명 없이 체크만. 견본 : 생성물\견본_동의화면)
     한 번 동의하면 앱을 쓰는 동안 다시 묻지 않는다(b3nav_agree) — 항목이 바뀌어 AGREE_V 가 오르면 한 번 더.
     공유 링크(?to=)로 연 분은 묻지 않고 바로 길안내(share.js — 「누르기만 하면 바로」).
   · 카메라 · 알림 체크 = 앱 동의 → 휴대폰(브라우저) 창만 한 번 (카메라 : getUserMedia 를 켜자마자 끈다 · 알림 : Notification.requestPermission).
   · 처음에 동의하지 않았으면, 그 기능이 켜지는 순간에만 앱이 묻는다(appAsk) — 그 기능 설명만 :
       QR 스캔 「QR 카메라를 켤까요?」 · 건의함 사진 칸 「카메라를 켤까요?」 · 수업 알림 「수업 알림을 켤까요?」. 「허용」이면 그대로 켠다.
     (건의함은 휴대폰 카메라 앱으로 찍어 휴대폰 창이 없고, QR 은 앱이 카메라를 켜서 처음 한 번 휴대폰 창이 뜬다 — 차단했던 폰은 qrnav.js 가 원래 하던 안내)
   · 이용안내 12쪽 「동의 · 권한 안내」 · 설정에 「동의 관리」는 두지 않는다(사용자).
   · 건의함 사진 삭제 요청 — 사진 없이 글만. 서버 규칙(사진 필수)을 바꾸지 않으려고 1×1 빈 그림을 붙여 보내고, 관리자 화면에서는 「삭제 요청」 카드로 보인다. */

/* ── 새로 만든 화면들이 같이 쓰는 작은 도구 (share.js · timetable.js 도 쓴다) ── */
var B3UI = (function(){
  function $(s, r){ return (r || document).querySelector(s); }
  function $$(s, r){ return [].slice.call((r || document).querySelectorAll(s)); }
  function mk(tag, cls, html){ var e = document.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function ls(k, v){ try{ if(v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); }catch(e){} return null; }
  function ko(){ return typeof LANG === 'undefined' || LANG !== 'en'; }
  function T(k, e){ return ko() ? k : (e || k); }
  function phone(){ return document.querySelector('.phone') || document.body; }
  function toast(t, info){
    $$('.syToast').forEach(function(e){ e.remove(); });
    var e = mk('div', 'syToast' + (info ? ' info' : '')); e.textContent = t; phone().appendChild(e);
    setTimeout(function(){ e.classList.add('out'); }, 2600); setTimeout(function(){ e.remove(); }, 3100);
  }
  function closeSheet(){ $$('.phone > .sySheet, .phone > .syDimBg').forEach(function(e){ e.remove(); }); }
  function sheet(html){
    closeSheet();
    var dim = mk('div', 'syDimBg'); dim.onclick = closeSheet; phone().appendChild(dim);
    var s = mk('div', 'sySheet', '<div class="grab"></div>' + html); phone().appendChild(s);
    return s;
  }
  function today(){ var d = new Date(); return (d.getMonth() + 1) + '/' + d.getDate(); }
  /* Lucide 그림 (icons.js 에 없는 것) — ISC 허가, icons.js 머리 참고 */
  function lc(d, w){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="syI">' + d + '</svg>'; }
  var IC = {
    share: lc('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>'),
    send: lc('<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>'),
    cal: lc('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>'),
    shield: lc('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'),
    link: lc('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
    map: lc('<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>'),
    msg: lc('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'),
    camera: lc('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>'),
    check: lc('<path d="M20 6 9 17l-5-5"/>', 3.4),
    plus: lc('<path d="M5 12h14"/><path d="M12 5v14"/>', 2.6),
    lock: lc('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
    bell: lc('<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>'),
    nav: lc('<polygon points="3 11 22 2 13 21 11 13 3 11"/>'),
    play: lc('<polygon points="6 3 20 12 6 21 6 3"/>', 2.2),
    vol: lc('<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>'),
    trash: lc('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>')
  };
  return {$: $, $$: $$, mk: mk, esc: esc, ls: ls, ko: ko, T: T, phone: phone, toast: toast, sheet: sheet, closeSheet: closeSheet, today: today, lc: lc, IC: IC};
})();

var CONSENT = (function(){
  var U = B3UI, $ = U.$, $$ = U.$$, mk = U.mk, esc = U.esc, ls = U.ls, T = U.T, IC = U.IC;
  var K = {agree: 'b3nav_agree', pv: 'b3nav_pv', cam: 'b3nav_perm_cam', noti: 'b3nav_perm_noti'};   // cam · noti : 'yes' · 'no'

  /* 동의 화면의 판 — 항목이 바뀌면 올린다. 예전 판에 동의한 폰은 동의 화면을 한 번 더 본다(전에 고른 것은 체크된 채로).
     2 = 2026-11-03 사용자 : 「개인정보 수집·이용 동의 · 개인정보 처리방침 · 오픈소스 라이선스 고지를 더해 동의만 구하게(설명 없이)」 */
  /* 3 = 2026-11-04 처리방침 · 라이선스를 처음부터 체크된 채로 — 사용자 「창이 안 뜬다」 : v2 에 이미 동의한 폰(사용자 폰)은 바뀐 화면을 못 봐서, 한 번 더 */
  var AGREE_V = 3;

  /* ── 지금 상태 ── */
  function agreed(){ var a = ls(K.agree); return !!(a && (a.v || 1) >= AGREE_V); }
  function pvOK(){ return !!ls(K.pv); }
  function camOK(){ return ls(K.cam) === 'yes'; }
  function notiSupported(){ return typeof Notification !== 'undefined'; }
  function notiOK(){ return ls(K.noti) === 'yes' && notiSupported() && Notification.permission === 'granted'; }
  function cameFromShare(){ try{ return !!(typeof PWA !== 'undefined' && PWA.peekShare && PWA.peekShare()); }catch(e){ return false; } }

  /* ── 휴대폰(브라우저)에 진짜로 묻기 — 누른 그 순간에 불러야 창이 뜬다 ── */
  function camAsk(cb){
    if(!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)){ cb(false, 'none'); return; }
    var p;
    try{ p = navigator.mediaDevices.getUserMedia({video: {facingMode: {ideal: 'environment'}}, audio: false}); }catch(e){ cb(false, 'err'); return; }
    p.then(function(st){ try{ st.getTracks().forEach(function(t){ t.stop(); }); }catch(e){} cb(true); },
           function(err){ cb(false, err && err.name === 'NotAllowedError' ? 'denied' : 'none'); });
  }
  function notiAsk(cb){
    if(!notiSupported() || !Notification.requestPermission){ cb(false, 'unsupported'); return; }
    if(Notification.permission === 'granted'){ cb(true); return; }
    var done = false;
    function fin(r){ if(done) return; done = true; cb(r === 'granted', r === 'denied' ? 'denied' : 'default'); }
    try{ var pr = Notification.requestPermission(fin); if(pr && pr.then) pr.then(fin, function(){ fin('default'); }); }catch(e){ fin('default'); }
  }
  function notiFailMsg(why){
    if(why === 'unsupported') return T('이 브라우저는 알림을 못 띄워요 — 아이폰은 홈 화면에 추가한 앱에서 알림이 돼요', 'This browser cannot show notifications — on iPhone, add the app to your home screen');
    if(why === 'denied') return T('알림이 차단되어 있어요 — 주소창 왼쪽 자물쇠(또는 ⓘ) → 알림 → 허용', 'Notifications are blocked — lock icon (or ⓘ) in the address bar → Notifications → Allow');
    return T('괜찮아요 — 수업 알림을 켤 때 다시 물어볼게요', 'OK — we will ask again when you turn on class alerts');
  }

  /* ── 처음에 동의 안 한 폰만 — 그 기능이 켜지는 순간 앱이 묻는 창 (그 기능 설명만) ── */
  var ASK = {
    qr:   {k: 'cam',  t: ['QR 카메라를 켤까요?', 'Turn on the QR camera?'],
           d: ['출입문에 붙은 QR 을 비춰 찍으려면 카메라가 필요해요.<br>사진은 남기지 않고 QR 글자만 읽어요.', 'The camera is needed to scan the QR on the door.<br>No photo is kept — only the QR text is read.'],
           no: ['괜찮아요 — 「사진으로 인식」이나 문 고르기로도 돼요. 다음에 QR 카메라를 켤 때 다시 물어볼게요', 'OK — you can also scan from a photo or pick the door. We will ask again next time']},
    sug:  {k: 'cam',  t: ['카메라를 켤까요?', 'Turn on the camera?'],
           d: ['건의함에 올릴 사진을 찍으려면 카메라가 필요해요.', 'The camera is needed to take the photo for the Suggestion Box.'],
           no: ['괜찮아요 — 다음에 사진 칸을 누를 때 다시 물어볼게요', 'OK — we will ask again when you tap the photo box']},
    noti: {k: 'noti', t: ['수업 알림을 켤까요?', 'Turn on class alerts?'],
           d: ['내 시간표의 수업이 시작하기 전에 소리 · 진동으로 알려 드려요.', 'We alert you with sound and vibration before your classes start.'],
           no: ['괜찮아요 — 다음에 수업 알림을 켤 때 다시 물어볼게요', 'OK — we will ask again when you turn on class alerts']}
  };
  function L(a){ return U.ko() ? a[0] : a[1]; }
  function appAsk(ctx, cb){
    var a = ASK[ctx];
    $$('.syPermDlg').forEach(function(e){ e.remove(); });
    var w = mk('div', 'syPermDlg app', '<div class="box"><div class="ic">' + (a.k === 'cam' ? IC.camera : IC.bell) + '</div>' +
      '<b>' + L(a.t) + '</b><p>' + L(a.d) + '</p>' +
      '<div class="bt"><button type="button" data-a="0">' + T('허용 안 함', "Don't allow") + '</button><button type="button" data-a="1">' + T('허용', 'Allow') + '</button></div></div>');
    w.addEventListener('click', function(e){
      var b = e.target.closest('button[data-a]'); if(!b) return;
      w.remove();
      if(b.getAttribute('data-a') !== '1'){ ls(K[a.k], 'no'); U.toast(L(a.no), true); if(cb) cb(false); return; }
      if(a.k === 'cam'){ ls(K.cam, 'yes'); if(cb) cb(true); return; }       // 카메라는 부르는 쪽(QR · 건의함)이 이 누름 안에서 켠다
      notiAsk(function(ok, why){ ls(K.noti, ok ? 'yes' : 'no'); if(!ok) U.toast(notiFailMsg(why), true); if(cb) cb(ok); });
    });
    U.phone().appendChild(w);
  }
  /* 그 기능이 켜지는 순간 — 동의했으면 바로, 아니면 앱 창 */
  function need(ctx, done, fail){
    var k = ASK[ctx].k;
    if(k === 'cam' ? camOK() : notiOK()){ done(); return; }
    if(k === 'noti' && ls(K.noti) === 'yes'){                                // 앱 동의는 있는데 브라우저 허락이 아직 · 풀림 — 브라우저에만 다시
      notiAsk(function(ok, why){ if(ok) done(); else { U.toast(notiFailMsg(why), true); if(fail) fail(); } });
      return;
    }
    appAsk(ctx, function(ok){ if(ok) done(); else if(fail) fail(); });
  }

  /* ── 건의함 사진 개인정보 (처음에 동의 안 했으면 사진 칸을 누를 때 한 번) ── */
  var PV_TABLE = function(){
    return '<table class="syTbl">' +
      '<tr><th>' + T('받는 것', 'We receive') + '</th><td>' + T('사진 1장(같은 자리 한 장 더는 위치 찾기에만 쓰고 저장하지 않아요) · 적어 주신 메모 · 고른 층 · 휴대폰 종류(브라우저 정보)', '1 photo (a second photo is only used to find the place, not stored) · your note · floor · phone type (browser info)') + '</td></tr>' +
      '<tr><th>' + T('받지 않는 것', 'We never receive') + '</th><td><b>' + T('이름 · 전화번호 · 이메일 · 사진 속 위치 정보(GPS)', 'Name · phone number · email · GPS location in the photo') + '</b> — ' + T('하루 3번 세기에는 이름 없는 번호만 써요', 'only an anonymous number counts the 3-per-day limit') + '</td></tr>' +
      '<tr><th>' + T('쓰는 곳', 'Used for') + '</th><td>' + T('관리자가 보고 맞는 곳의 <b>길안내 사진으로 바꾸기</b> — 다른 곳에는 쓰지 않아요', 'Replacing the <b>guide photo</b> of that place after review — nothing else') + '</td></tr>' +
      '<tr><th>' + T('지우는 때', 'Deleted') + '</th><td>' + T('쓰지 않기로 한 사진 : <b>바로</b> · 확인하지 못한 사진 : <b>30일 뒤</b> · 안내 사진이 된 사진 : 더 새 사진으로 바뀔 때까지', 'Not used: <b>right away</b> · not reviewed: <b>after 30 days</b> · used as a guide photo: until a newer one replaces it') + '</td></tr>' +
      '<tr><th>' + T('삭제 요청', 'Deletion') + '</th><td>' + T('건의함 아래 「올린 사진 지워 달라고 하기」로 보내 주세요', 'Use “Ask us to delete a photo” at the bottom of the Suggestion Box') + '</td></tr></table>';
  };
  function pvAsk(next){
    var s = U.sheet('<h4>' + IC.shield + T('사진 제보 — 개인정보 수집·이용 동의', 'Photo report — personal data') + '</h4><p class="sub">' + T('처음 켤 때 동의하지 않으셔서, 사진을 찍기 전에 한 번 여쭤봐요.', 'You did not agree at first launch, so we ask once before you take a photo.') + '</p>' +
      '<ul><li>' + T('<b>사람 얼굴</b>이나 다른 사람의 화면 · 이름표가 나오지 않게 찍어 주세요.', 'Please keep <b>faces</b>, other people’s screens and name tags out of the photo.') + '</li>' +
      '<li>' + T('사진 속 <b>위치 정보(GPS)</b>는 올리기 전에 지워져요. <b>이름 · 전화번호는 받지 않아요.</b>', '<b>GPS data</b> is removed before upload. <b>We never ask your name or number.</b>') + '</li>' +
      '<li>' + T('관리자가 확인한 사진만 안내 사진으로 쓰여요. <b>쓰지 않는 사진은 바로 지우고</b>, 확인하지 못한 사진도 <b>30일이 지나면</b> 지워요.', 'Only reviewed photos are used. <b>Unused photos are deleted right away</b>, unreviewed ones <b>after 30 days</b>.') + '</li></ul>' +
      '<div class="syMore">' + T('자세히 보기 ▾', 'Details ▾') + '</div><div class="syMoreBox" style="display:none;">' + PV_TABLE() + '</div>' +
      '<div class="syCk" role="checkbox" aria-checked="false"><span class="box">' + IC.check + '</span><span>' + T('위 내용을 확인했고, 올린 사진이 앱 안내 사진으로 쓰이는 데 동의해요 <em>(필수)</em>', 'I have read this and agree that my photo may be used as a guide photo <em>(required)</em>') + '</span></div>' +
      '<button class="big" type="button" disabled>' + IC.camera + T('동의하고 카메라 켜기', 'Agree and open camera') + '</button><button class="big ghost" type="button">' + T('다음에 할게요', 'Not now') + '</button>');
    $('.syMore', s).onclick = function(){ var b = $('.syMoreBox', s), o = b.style.display === 'none'; b.style.display = o ? 'block' : 'none'; this.textContent = o ? T('자세히 접기 ▴', 'Hide ▴') : T('자세히 보기 ▾', 'Details ▾'); };
    var ck = $('.syCk', s), btns = $$('.big', s);
    ck.onclick = function(){ var on = !ck.classList.contains('on'); ck.classList.toggle('on', on); ck.setAttribute('aria-checked', on); btns[0].disabled = !on; };
    btns[0].onclick = function(){ ls(K.pv, {d: U.today()}); U.closeSheet(); pvPaint(); next(); };
    btns[1].onclick = U.closeSheet;
  }

  /* ── 처음 켤 때 동의 화면 ── */
  var AG = function(){ return [
    {k: 'use', req: true, t: T('이용 안내', 'Terms of use'), s: T('길안내는 참고용이에요 — 공사 · 방 이동으로 실제와 다를 수 있어요', 'Directions are a guide — rooms may move or be under construction'),
     d: '<ul><li>' + T('공대 3호관 길안내는 졸업작품 팀 「공3길」이 만든 앱이에요. 회원가입 · 로그인은 없어요.', 'This app was made by the graduation project team. No sign-up or login.') + '</li>' +
        '<li>' + T('사진과 안내 문장은 참고용이에요. 공사나 방 이동으로 실제와 다를 수 있으니 <b>문 옆 명패를 꼭 확인</b>해 주세요.', 'Photos and directions are a guide. <b>Always check the door plate.</b>') + '</li>' +
        '<li>' + T('실제와 다르면 설정 → 건의함으로 알려 주세요. 관리자가 확인해 고쳐요.', 'If something differs, tell us via Settings → Suggestion Box.') + '</li></ul>'},
    {k: 'local', req: true, t: T('이 폰에 저장', 'Saved on this phone'), s: T('이어 하기 · 즐겨찾기 · 시간표 · 화면 설정은 이 폰에만 — 서버로 보내지 않아요', 'Resume · favorites · timetable · settings stay on this phone — never sent to a server'),
     d: '<ul><li>' + T('이 폰에 남는 것 : 길안내 이어 하기(30분) · 즐겨찾기 · 최근 찾은 곳 · 내 시간표 · 수업 알림 설정 · 쉬운 사용모드 · 밝은 화면 · 이 동의 기록', 'Kept on this phone: resume (30 min) · favorites · recent searches · timetable · class alerts · easy mode · light mode · this consent') + '</li>' +
        '<li>' + T('인터넷이 없어도 열리게 앱을 이 폰에 저장해 둬요.', 'The app is saved on this phone so it opens offline.') + '</li>' +
        '<li>' + T('모두 이 폰에만 있고 서버로 보내지 않아요. 브라우저의 「사이트 데이터 삭제」로 한 번에 지울 수 있어요.', 'All of it stays on this phone. Clear the site data in your browser to delete it.') + '</li></ul>'},
    /* 설명 없이 체크만 (사용자 11/03) — 처리방침 · 라이선스는 「확인」.
       처리방침 · 라이선스는 처음부터 체크된 채로(on) — 사용자 11/04 「하나하나 체크하기 번거롭다, 원하지 않으면 끄면 된다」.
       동의가 아니라 알림이라 미리 체크해도 된다. 진짜 동의(수집·이용 · 카메라 · 알림)는 미리 체크하지 않는다 */
    {k: 'policy', req: true, plain: true, on: true, t: T('개인정보 처리방침', 'Privacy policy')},
    {k: 'oss', req: true, plain: true, on: true, t: T('오픈소스 라이선스 고지', 'Open-source licenses')},
    /* 「개인정보 수집·이용 동의」와 「건의함 사진 개인정보」는 같은 동의라 하나로(사용자 11/04 「합쳐줘」) — 이름은 수집·이용,
       받는 것 · 쓰는 곳 · 지우는 때는 「보기 ▾」에 그대로(동의를 받으려면 알려야 하는 것). 길안내에 필요 없어 선택(필수로 묶으면 안 된다) */
    {k: 'photo', req: false, t: T('개인정보 수집·이용 동의', 'Collection & use of personal data'), s: T('건의함 사진 · 메모를 받아 길안내 사진으로 써요 — 얼굴 X · GPS 지움', 'Photos and notes become guide photos — no faces · GPS removed'),
     d: '<ul><li>' + T('<b>사람 얼굴</b>이나 다른 사람의 화면 · 이름표가 나오지 않게 찍어 주세요.', 'Keep <b>faces</b> and name tags out of the photo.') + '</li><li>' + T('사진 속 위치 정보(GPS)는 올리기 전에 지워져요.', 'GPS data is removed before upload.') + '</li></ul>' + PV_TABLE() +
        '<p style="margin-top:0.4rem;color:#9FB2C8;">' + T('동의하지 않아도 길안내는 모두 쓸 수 있어요. 건의함 「📷 사진」 칸을 누를 때 한 번 더 물어요.', 'Directions work without this. We ask again when you tap the photo box.') + '</p>'},
    {k: 'cam', req: false, perm: 'cam', t: T('카메라', 'Camera'), s: T('건의함 사진 찍기 · 앱 안에서 출입문 QR 찍기', 'Suggestion photos · scanning the door QR in the app'),
     d: '<ul><li>' + T('건의함 사진을 찍을 때, 앱 안의 「출입문 QR 스캔」을 쓸 때만 카메라를 켜요. QR 은 사진을 남기지 않고 글자만 읽어요.', 'Used only for suggestion photos and the in-app QR scanner. QR scans keep no photo.') + '</li>' +
        '<li>' + T('체크하면 휴대폰이 「카메라를 허용할까요?」를 한 번 물어요 — 여기서 허용하면 <b>앱을 쓰는 동안 다시 묻지 않아요.</b>', 'Your phone asks once — allow it and <b>we never ask again.</b>') + '</li>' +
        '<li>' + T('체크하지 않아도 괜찮아요 — 건의함 사진 칸 · QR 스캔을 누를 때 허용할지 물어요.', 'You can skip this — we ask when you tap the photo box or QR scan.') + '</li>' +
        '<li>' + T('아이폰 사파리는 다시 물을 수 있어요 — 사파리 설정 → 카메라 → 「허용」으로 두면 안 물어요.', 'iPhone Safari may ask again — set Safari Settings → Camera → Allow.') + '</li></ul>'},
    {k: 'noti', req: false, perm: 'noti', t: T('알림', 'Notifications'), s: T('내 시간표의 수업 시작 전 알림 (소리 · 진동)', 'Alerts before your classes (sound · vibration)'),
     d: '<ul><li>' + T('내 시간표에 넣은 수업이 시작하기 전에 알려 드려요. 몇 분 전 · 소리는 시간표에서 정해요. 광고 알림은 보내지 않아요.', 'We alert you before classes in My Timetable. No ads.') + '</li>' +
        '<li>' + T('체크하면 휴대폰이 「알림을 허용할까요?」를 한 번 물어요 — 여기서 허용하면 <b>앱을 쓰는 동안 다시 묻지 않아요.</b>', 'Your phone asks once — allow it and <b>we never ask again.</b>') + '</li>' +
        '<li>' + T('체크하지 않아도 괜찮아요 — 내 시간표에서 수업 알림을 켤 때 허용할지 물어요.', 'You can skip this — we ask when you turn on class alerts.') + '</li></ul>'}
  ]; };
  function tagOf(x){ return '<em class="syTg ' + (x.req ? 'req">' + T('필수', 'Req') : 'opt">' + T('선택', 'Opt')) + '</em>'; }
  var shown = false;
  function agreeScreen(done){
    if(document.querySelector('.syAgree')) return;
    shown = true;
    var list = AG(), st = {}, prev = ls(K.agree);
    list.forEach(function(x){ st[x.k] = !!x.on; });
    /* 예전 판에 동의한 폰 — 그때 고른 것은 체크된 채로 보여 주고, 새 항목만 더 체크하면 되게 */
    if(prev){ st.use = st.local = true; st.photo = pvOK() || !!prev.collect; st.cam = camOK(); st.noti = ls(K.noti) === 'yes'; }   // collect : 따로 있던 v2 · v3 줄
    var a = mk('div', 'syAgree',
      '<div class="sc"><div class="brand">🏫 ' + T('공대 3호관 길안내', 'Engineering Bldg 3 Navigator') + '</div>' +
      '<h2>' + T('시작하기 전에<br>확인해 주세요', 'Before you start') + '</h2><p class="sub">' +
        (prev ? T('동의 항목이 바뀌어서 한 번만 더 여쭤봐요.', 'Our consent items changed, so we ask once more.') : T('한 번만 동의하면 다음부터는 묻지 않아요.', 'Agree once and we will not ask again.')) + '</p>' +
      '<div class="syAgAll" role="checkbox"><span class="syBox">' + IC.check + '</span><div><b>' + T('모두 동의해요', 'Agree to all') + '</b><small>' + T('선택 항목 · 카메라 · 알림까지 한 번에', 'Including optional items, camera and notifications') + '</small></div></div>' +
      list.map(function(x){
        if(x.plain) return '<div class="syAgItem plain" data-k="' + x.k + '"><div class="hd" role="checkbox"><span class="syBox">' + IC.check + '</span><div class="t"><b>' + tagOf(x) + x.t + '</b></div></div></div>';
        return '<div class="syAgItem" data-k="' + x.k + '"><div class="hd" role="checkbox"><span class="syBox">' + IC.check + '</span><div class="t"><b>' + tagOf(x) + x.t + '</b><small>' + x.s + '</small></div><button class="more" type="button">' + T('보기 ▾', 'More ▾') + '</button></div><div class="det">' + x.d + '</div></div>';
      }).join('') +
      '<div class="syPerm">📍 <b>' + T('GPS 위치는 쓰지 않아요', 'We never use GPS') + '</b> — ' + T('어디 계신지는 출입문 QR 로만 알아요.', 'your position comes only from the door QR.') + '<br>' +
        T('여기서 동의하면 앱을 쓰는 동안 다시 묻지 않아요. 카메라 · 알림은 체크할 때 휴대폰이 한 번만 물어요.', 'Agree here and we never ask again. For camera and notifications your phone asks once when you tick them.') + '</div></div>' +
      '<div class="ft"><button class="big" type="button" disabled>' + T('필수 항목에 동의해 주세요', 'Please agree to the required items') + '</button><small>' + T('동의 · 권한 안내는 ☰ → 설정 → 이용안내 마지막 쪽에 있어요', 'See ☰ → Settings → User guide, last page') + '</small></div>');
    function paint(){
      list.forEach(function(x){ var hd = $('.syAgItem[data-k=' + x.k + '] .hd', a); hd.classList.toggle('on', st[x.k]); hd.setAttribute('aria-checked', st[x.k]); });
      var all = list.every(function(x){ return st[x.k]; }); $('.syAgAll', a).classList.toggle('on', all); $('.syAgAll', a).setAttribute('aria-checked', all);
      var ok = list.every(function(x){ return !x.req || st[x.k]; }), b = $('.ft .big', a);
      b.disabled = !ok; b.textContent = ok ? T('동의하고 시작하기', 'Agree and start') : T('필수 항목에 동의해 주세요', 'Please agree to the required items');
    }
    /* 카메라 · 알림 — 체크 = 앱 동의, 그 순간 휴대폰 창만 한 번 */
    function ask(keys, i){
      if(i >= keys.length){ paint(); return; }
      var k = keys[i];
      st[k] = true; paint();
      (k === 'cam' ? camAsk : notiAsk)(function(ok, why){
        st[k] = ok; paint();
        if(!ok) U.toast(k === 'cam'
          ? (why === 'none' ? T('이 기기에서 카메라를 찾지 못했어요 — QR 을 찍을 때 다시 물어볼게요', 'No camera found — we will ask again when you scan a QR') : T('괜찮아요 — QR · 건의함 사진을 찍을 때 다시 물어볼게요', 'OK — we will ask again when you use the camera'))
          : notiFailMsg(why), true);
        ask(keys, i + 1);
      });
    }
    $('.syAgAll', a).onclick = function(){
      var all = !list.every(function(x){ return st[x.k]; });
      if(!all){ list.forEach(function(x){ st[x.k] = false; }); paint(); return; }
      list.forEach(function(x){ if(!x.perm) st[x.k] = true; }); paint();
      ask(list.filter(function(x){ return x.perm && !st[x.k]; }).map(function(x){ return x.k; }), 0);
    };
    $$('.syAgItem', a).forEach(function(it){
      var k = it.getAttribute('data-k'), x = list.filter(function(y){ return y.k === k; })[0];
      $('.hd', it).onclick = function(e){
        if(e.target.closest('.more')) return;
        if(x.perm && !st[k]){ ask([k], 0); return; }
        st[k] = !st[k]; paint();
      };
      if($('.more', it)) $('.more', it).onclick = function(){ var o = !it.classList.contains('open'); it.classList.toggle('open', o); this.textContent = o ? T('접기 ▴', 'Less ▴') : T('보기 ▾', 'More ▾'); };
    });
    $('.ft .big', a).onclick = function(){
      ls(K.agree, {d: U.today(), v: AGREE_V}); ls(K.pv, st.photo ? {d: U.today()} : null);
      ls(K.cam, st.cam ? 'yes' : 'no'); ls(K.noti, st.noti ? 'yes' : 'no');
      a.remove(); pvPaint();
      U.toast('✓ ' + T('동의했어요 — 다음부터는 묻지 않아요', 'Thank you — we will not ask again'));
      if(typeof TIMETABLE !== 'undefined' && TIMETABLE.refresh) TIMETABLE.refresh();
      if(done) done();
    };
    U.phone().appendChild(a); paint();
  }

  /* ── 켜는 순서 : 켜는 화면 → (처음이면) 동의 화면 → 쉬운 사용모드 「처음이세요?」 ──
     easy.js askFirst 는 켜는 화면 바로 아래에 「처음이세요?」를 깔아 둔다 — 동의 화면은 그 위(z 945)에 깔아, 스캔이 지나가면 동의 화면이 먼저 보인다. */
  function needScreen(){ return !agreed() && !cameFromShare() && !document.querySelector('.syAgree'); }
  if(typeof EASY !== 'undefined'){
    var _askFirst = EASY.askFirst, _busy = EASY.busy;
    EASY.askFirst = function(){ var r = _askFirst ? _askFirst.apply(this, arguments) : false; if(needScreen()) agreeScreen(); return r || !!document.querySelector('.syAgree'); };
    EASY.busy = function(){ return (_busy ? _busy.apply(this, arguments) : false) || !!document.querySelector('.syAgree'); };
  }
  /* 켜는 화면 없이 바로 뜬 경우(새 판으로 조용히 갈아탄 직후 등) — 앱이 준비되고 켜는 화면이 없으면 띄운다 */
  (function wait(){
    var t0 = Date.now();
    (function tick(){
      if(shown || agreed() || cameFromShare()) return;
      if(typeof appBooted !== 'undefined' && appBooted && !document.querySelector('.fx-boot')){ if(needScreen()) agreeScreen(); return; }
      if(Date.now() - t0 < 60000) setTimeout(tick, 120);
    })();
  })();

  /* ════════ 건의함 : 사진 칸 · 개인정보 줄 · 삭제 요청 ════════ */
  function pvPaint(){
    var box = document.getElementById('sugShot'); if(!box) return;
    var el = document.getElementById('pvLine');
    if(!el){ el = mk('div', 'syPvLine'); el.id = 'pvLine'; var f2 = document.getElementById('sugFile2'); (f2 || box).parentNode.insertBefore(el, (f2 || box).nextSibling); }
    var on = ls(K.pv);
    el.innerHTML = IC.lock + '<span>' + (on && camOK() ? T('개인정보 · 카메라 동의함', 'Privacy and camera agreed') + ' (' + esc(on.d) + ')' : T('📷 칸을 누르면 필요한 동의를 그때 물어요', 'We ask for consent when you tap 📷')) + ' · <u>' + T('동의 · 권한 안내', 'Consent info') + '</u></span>';
    $('u', el).onclick = function(){ openGuideLast(); };
  }
  function hookShot(id, fileId){
    var box = document.getElementById(id); if(!box || box._b3hook) return;
    box._b3hook = true;
    box.addEventListener('click', function(e){
      if(pvOK() && camOK()) return;                       // 동의했으면 원래대로(바로 카메라)
      e.preventDefault(); e.stopPropagation();
      var file = document.getElementById(fileId);
      function cam(){ need('sug', function(){ pvPaint(); if(file) file.click(); }, pvPaint); }   // 「허용」을 누른 그 순간 카메라를 연다
      if(!pvOK()) pvAsk(cam); else cam();
    }, true);
  }
  var BLANK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  var DEL_TAG = '[삭제 요청] ';
  function delRequest(){
    var s = U.sheet('<h4>' + IC.trash + T('올린 사진 지워 달라고 하기', 'Ask us to delete a photo') + '</h4>' +
      '<p class="sub">' + T('언제 · 어디를 찍은 사진인지 적어 주세요. 관리자가 확인하고 지워요. 이름 · 연락처는 적지 않아도 돼요.', 'Tell us when and where the photo was taken. An admin will delete it. No name or contact needed.') + '</p>' +
      '<textarea class="syInp" id="delNote" rows="3" maxlength="300" placeholder="' + T('예 : 11/3 오후에 3층 엘리베이터 앞에서 찍은 사진', 'e.g. the photo taken in front of the 3F elevator on 11/3') + '"></textarea>' +
      '<div class="syErr" id="delErr"></div>' +
      '<button class="big" type="button">' + IC.send + T('보내기', 'Send') + '</button><button class="big ghost" type="button">' + T('닫기', 'Close') + '</button>');
    var btns = $$('.big', s);
    btns[1].onclick = U.closeSheet;
    btns[0].onclick = function(){
      var v = $('#delNote', s).value.trim(), err = $('#delErr', s);
      if(v.length < 4){ err.textContent = T('어떤 사진인지 조금 더 적어 주세요', 'Please describe the photo a little more'); return; }
      if(typeof sugQuotaLeft === 'function' && sugQuotaLeft() <= 0){ err.textContent = T('오늘은 건의함을 3번 다 썼어요 — 내일 다시 보내 주세요', 'You have used the Suggestion Box 3 times today — try tomorrow'); return; }
      var rec = {id: 'sug_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), u: BLANK, note: DEL_TAG + v, ts: Date.now(), status: 'pending', ai: null, qr: null};
      if(typeof SUG_QUEUE !== 'undefined'){ SUG_QUEUE.push(rec); if(typeof sugSaveQueue === 'function') sugSaveQueue(); }
      if(typeof sugBadgeSync === 'function') sugBadgeSync();
      if(typeof sugQuotaAdmin === 'function' && !sugQuotaAdmin() && typeof sugQuotaSet === 'function') sugQuotaSet(sugQuotaUsed() + 1);   // 건의함과 같이 하루 3번
      if(typeof sugQuotaRender === 'function') sugQuotaRender();
      if(typeof SUGDB !== 'undefined') SUGDB.pushOne(rec);
      U.closeSheet(); U.toast('✓ ' + T('보냈어요 — 관리자가 확인하고 지워요', 'Sent — an admin will delete it'));
    };
  }
  function delLink(){
    var cards = document.querySelectorAll('#ssug > .card'), host = cards[cards.length - 1]; if(!host || document.getElementById('delLink')) return;
    var a = mk('div', 'syDelLink', IC.trash + '<u>' + T('올린 사진 지워 달라고 하기', 'Ask us to delete a photo') + '</u>'); a.id = 'delLink';
    a.onclick = delRequest; host.appendChild(a);
  }
  /* 관리자 화면 — 삭제 요청은 사진 · 장소 고르기 대신 글과 「처리했어요」만 */
  if(typeof sugAdminRender === 'function'){
    var _adm = sugAdminRender;
    window.sugAdminRender = sugAdminRender = function(){
      var r = _adm.apply(this, arguments);
      try{
        (typeof sugPending === 'function' ? sugPending() : []).forEach(function(s){
          if(!s.note || s.note.indexOf(DEL_TAG) !== 0) return;
          var btn = [].slice.call(document.querySelectorAll('#sugAdminList .sugReject')).filter(function(b){ return (b.getAttribute('onclick') || '').indexOf("'" + s.id + "'") >= 0; })[0];
          var card = btn && btn.closest('.sugCard'); if(!card) return;
          var d = new Date(s.ts);
          card.classList.add('syDelCard');
          card.innerHTML = '<div class="sugMeta"><div class="syDelHead">' + IC.trash + '사진 삭제 요청</div>' +
            '<div class="sugNote">' + esc(s.note.slice(DEL_TAG.length)) + '</div>' +
            '<div class="sugWhen">' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + '</div>' +
            '<div class="sugLearnTip">요청한 사진을 「전체 사진 관리」나 제보 목록에서 지운 뒤 아래를 누르세요.</div>' +
            '<div class="sugBtnRow"><button class="sugReject" onclick="sugReject(\'' + s.id + '\')">처리했어요 (요청 지우기)</button></div></div>';
        });
      }catch(e){}
      return r;
    };
  }

  /* ════════ 출입문 QR 스캔 — 카메라가 켜지는 순간 ════════ */
  if(typeof QRNAV !== 'undefined' && QRNAV.open){
    var _open = QRNAV.open;
    QRNAV.open = function(){
      if(camOK()) return _open.apply(this, arguments);   // 처음에 동의했으면 묻지 않고 바로
      if(typeof go === 'function') go('sqr');            // 화면을 먼저 열고 그 위에서 묻는다
      var off = document.getElementById('qrOff'), vid = document.getElementById('qrVideo'), fr = document.getElementById('qrFrame');
      if(vid) vid.style.display = 'none'; if(fr) fr.style.display = 'none';
      if(off){ off.style.display = 'block'; off.innerHTML = '<b>' + T('카메라가 꺼져 있어요', 'The camera is off') + '</b><span>' + T('아래 「📷 사진으로 인식」이나 문 고르기로도 돼요.', 'You can also scan from a photo or pick the door below.') + '</span>' +
        '<button class="qrFix" type="button" onclick="QRNAV.open()">' + T('카메라 켜기', 'Turn on camera') + '</button>'; }
      appAsk('qr', function(ok){ if(ok) QRNAV.retry(); });   // 「허용」을 누른 그 순간 카메라를 켠다 — 처음 한 번은 휴대폰 창도
    };
  }

  /* ════════ 이용안내 12쪽 「동의 · 권한 안내」 ════════ */
  function li(n, b, sp){ return '<li><i>' + n + '</i><div><b>' + b + '</b><span>' + sp + '</span></div></li>'; }
  /* 2026-11-03 사용자 : 「설명이 너무 자세하다 — 최대한 간단하고 명확하게, 파일 크기 같은 건 보여 줘도 모른다」 → 한 줄씩만 */
  function guideHtml(){
    return '<div class="hwLead">' + T('처음 켤 때 한 번만 물어요. 그다음부터는 묻지 않아요. (동의 항목이 바뀌면 한 번 더 물어요)', 'We ask only once, the first time you open the app (and once more if the items change).') + '</div>' +
      '<h5 class="hwHead">✅ ' + T('처음 켤 때 동의하는 것', 'What you agree to') + '</h5><ol class="hwList">' +
        li(1, T('필수 · 이용 안내', 'Required · Terms'), T('길안내는 참고용이에요. 문 옆 명패를 꼭 확인해 주세요.', 'Directions are a guide — please check the door plate.')) +
        li(2, T('필수 · 이 폰에 저장', 'Required · Saved on this phone'), T('즐겨찾기 · 내 시간표 같은 기록은 이 폰에만 남아요.', 'Favorites and your timetable stay on this phone only.')) +
        li(3, T('필수 · 개인정보 처리방침 · 오픈소스 라이선스 고지', 'Required · Privacy policy · Open-source licenses'), T('개인정보를 어떻게 다루는지와, 앱에 쓴 공개 프로그램(오픈소스)의 사용 허가에 관한 것이에요.', 'How we handle personal data, and the licenses of the open-source software in this app.')) +
        li(4, T('선택 · 개인정보 수집·이용 (건의함 사진)', 'Optional · Personal data (suggestion photos)'), T('동의하지 않아도 길안내는 모두 쓸 수 있어요.', 'Directions work without it.')) +
        li(5, T('선택 · 카메라 · 알림', 'Optional · Camera · Alerts'), T('지금 허용하지 않아도 괜찮아요. 쓸 때 다시 물어요.', 'You can skip — we ask again when you use them.')) + '</ol>' +
      '<h5 class="hwHead">📷 ' + T('카메라 · 알림은 쓸 때 물어요', 'Camera and alerts are asked when needed') + '</h5><ol class="hwList">' +
        li(1, T('카메라', 'Camera'), T('출입문 QR 을 찍을 때 · 건의함 사진을 찍을 때', 'Scanning a door QR · taking a suggestion photo')) +
        li(2, T('알림', 'Alerts'), T('내 시간표에서 수업 알림을 켤 때', 'Turning on class alerts in My Timetable')) + '</ol>' +
      '<div class="hwTip">💡 ' + T('「허용」을 눌러도 안 켜지면 휴대폰에서 켜 주세요<br>안드로이드 : 주소창 왼쪽 자물쇠 → 권한 → 허용<br>아이폰 : 주소창 왼쪽 「가가」 → 웹 사이트 설정 → 허용',
        'If “Allow” does not work, turn it on in your phone<br>Android: lock icon in the address bar → Permissions → Allow<br>iPhone: “AA” in the address bar → Website Settings → Allow') + '</div>' +
      '<h5 class="hwHead">🗂 ' + T('건의함 사진', 'Suggestion photos') + '</h5><ol class="hwList">' +
        li(1, T('받지 않는 것', 'Never collected'), T('이름 · 전화번호 · 위치(GPS)', 'Name · phone number · location (GPS)')) +
        li(2, T('지우는 때', 'When deleted'), T('쓰지 않는 사진은 바로, 확인 못 한 사진은 30일 뒤에 지워요.', 'Unused photos right away, unchecked ones after 30 days.')) +
        li(3, T('지워 달라고 하려면', 'To ask for deletion'), T('건의함 맨 아래 「올린 사진 지워 달라고 하기」', '“Ask us to delete a photo” at the bottom of the Suggestion Box')) + '</ol>' +
      '<div class="hwTip">📍 ' + T('GPS 위치는 쓰지 않아요. 어디 계신지는 출입문 QR 로만 알아요.', 'We never use GPS — only the door QR.') + '</div>';
  }
  if(typeof HOWTO !== 'undefined' && HOWTO.push){
    HOWTO.push({t: ['동의 · 권한 안내', 'Consent & permissions'], html: guideHtml});
    if(typeof GUIDE_PAGES !== 'undefined') GUIDE_PAGES = HOWTO.map(function(){ return {}; });
    /* 쪽 번호(1/12) · 진행 점을 바로 다시 그린다 — 안 그러면 앱이 이 파일보다 먼저 켜진 폰(글꼴이 이미 있는 폰)은
       이용안내를 다시 열 때까지 「1/11」로 남아, 안전망 검사가 켤 때마다 달라졌다 */
    if(typeof guideRender === 'function') try{ guideRender(typeof guideIdx === 'number' ? guideIdx : 0); }catch(e){}
  }
  function openGuideLast(){
    if(typeof go === 'function') go('sguide');
    if(typeof guideRender === 'function' && typeof HOWTO !== 'undefined') guideRender(HOWTO.length - 1);
  }

  /* ── 휴대폰 뒤로가기 (shell.js appBackStep) — 새로 그린 창부터 닫는다 ── */
  if(typeof appBackStep === 'function'){
    var _back = appBackStep;
    window.appBackStep = function(){
      var dlg = document.querySelector('.syPermDlg'); if(dlg){ var no = dlg.querySelector('button[data-a="0"]'); if(no) no.click(); else dlg.remove(); return true; }
      if(document.querySelector('.phone > .sySheet')){ U.closeSheet(); return true; }
      if(document.querySelector('.syAgree')) return true;          // 처음 동의 화면은 뒤로가기로 건너뛰지 않는다
      var home = document.querySelector('.syHome'); if(home){ home.remove(); return true; }
      return _back.apply(this, arguments);
    };
  }

  /* ── 화면이 바뀔 때 건의함 줄 · 링크를 붙인다 (shell.js go 를 감싸지 않고 화면 class 를 본다) ── */
  function onSug(){ hookShot('sugShot', 'sugFile'); hookShot('sugShot2', 'sugFile2'); pvPaint(); delLink(); }
  var sug = document.getElementById('ssug');
  if(sug && window.MutationObserver){
    new MutationObserver(function(){ if(sug.classList.contains('on')) onSug(); }).observe(sug, {attributes: true, attributeFilter: ['class']});
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onSug); else onSug();

  return {agreed: agreed, pvOK: pvOK, camOK: camOK, notiOK: notiOK, notiSupported: notiSupported, need: need, appAsk: appAsk, notiAsk: notiAsk,
          notiFailMsg: notiFailMsg, guideHtml: guideHtml, openGuideLast: openGuideLast, agreeScreen: agreeScreen, K: K};
})();
