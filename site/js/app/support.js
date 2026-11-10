"use strict";
/* support.js — 고객 센터 (2026-11-10 사용자)
   「사진이 고장 나면 건의함 AI 가 있지만, 앱이 고장 나면 사람이 고쳐야 한다 — 그 사람을 부르는 기능」
   · 설정 → 고객 센터 → 「관리자의 이메일로 전송」 · 「상담원과 전화하기」
   · 사용자 지시 : 이메일은 관리자 주소(아래 ADMIN_MAIL)로 「전송되는 것처럼」 — 실제로는 보내지 않는다.
                   전화도 실제로 걸리지 않지만 「걸리는 것처럼」 — 통화 화면 · 연결 · 시간 · 끊기.
     → 서버 · 메일 · 전화 어디에도 아무것도 나가지 않는다(네트워크 요청 0). 쓴 글은 화면에만 있고 닫으면 사라진다.
   · 쓴 글 · 문제 기록은 textContent 로만 넣는다(HTML 로 넣지 않는다 — 2026-11-10 외부 점검 B-2 교훈).
   · 휴대폰 뒤로가기 : 통화 중이면 끊기 → 창(시트)은 consent.js 가 닫는다. */
var SUPPORT = (function(){
  var U = B3UI, $ = U.$, $$ = U.$$, mk = U.mk, esc = U.esc, T = U.T, IC = U.IC, lc = U.lc;
  var ADMIN_MAIL = 'jralien0910@naver.com';   // 사용자가 정한 관리자 이메일 (2026-11-10)
  var CENTER = ['공대 3호관 길안내 고객센터', 'Bldg.3 Navigation Help Center'];

  /* Lucide 그림 (ISC 허가 — icons.js 머리 참고) */
  var I = {
    headset: lc('<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/>'),
    mail: lc('<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'),
    phone: lc('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'),
    phoneOff: lc('<path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" x2="2" y1="2" y2="22"/>'),
    mic: lc('<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>'),
    micOff: lc('<line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/>'),
    back: lc('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>')
  };
  function two(n){ return (n < 10 ? '0' : '') + n; }
  function mmss(s){ return two(Math.floor(s / 60)) + ':' + two(s % 60); }

  /* ════════ 첫 창 : 고객 센터 ════════ */
  function open(){
    if(!document.querySelector('#sset.on') && typeof openOverlay === 'function') openOverlay('sset');
    var s = U.sheet('<h4>' + I.headset + T('고객 센터', 'Customer Center') + '</h4>' +
      '<p class="sub">' + T('앱이 열리지 않거나, 화면이 멈추거나, 길안내 · 3D 가 이상하게 움직이면 알려 주세요. <b>관리자가 직접 고쳐요.</b><br>사진이 실제와 다를 때는 「건의함」이 더 빨라요.',
                           'If the app will not open, freezes, or the directions or 3D act strangely, let us know. <b>The admin fixes it directly.</b><br>For photos that differ from reality, the Suggestion Box is faster.') + '</p>' +
      '<button class="big csBtn" type="button" data-a="mail">' + I.mail + T('관리자의 이메일로 전송', 'Send to the admin by email') + '</button>' +
      '<button class="big ghost csBtn" type="button" data-a="call">' + I.phone + T('상담원과 전화하기', 'Call an agent') + '</button>' +
      '<div class="csNote">' + T('이메일 받는 곳 : ', 'Email goes to: ') + '<b>' + esc(ADMIN_MAIL) + '</b></div>');
    $('[data-a=mail]', s).onclick = mailSheet;
    $('[data-a=call]', s).onclick = function(){ U.closeSheet(); call(); };
  }

  /* ════════ 관리자의 이메일로 전송 (실제로는 보내지 않는다) ════════ */
  var KINDS = [['앱이 안 열려요', 'App will not open'], ['화면이 멈춰요', 'Screen freezes'], ['길안내가 이상해요', 'Directions are wrong'],
               ['3D · 사진이 안 보여요', '3D or photos missing'], ['기타', 'Other']];
  function diagText(){ try{ return (typeof DIAG !== 'undefined' && DIAG.full) ? DIAG.full() : ''; }catch(e){ return ''; } }
  function mailSheet(){
    var k = '';
    KINDS.forEach(function(x, i){ k += '<button type="button" data-k="' + i + '">' + esc(T(x[0], x[1])) + '</button>'; });
    var s = U.sheet('<h4>' + I.mail + T('관리자에게 이메일 보내기', 'Email the admin') + '</h4>' +
      '<div class="csTo"><span>' + T('받는 사람', 'To') + '</span><b>' + T('관리자', 'Admin') + ' &lt;' + esc(ADMIN_MAIL) + '&gt;</b></div>' +
      '<div class="lab">' + T('어떤 문제인가요?', 'What is the problem?') + '</div><div class="csKinds">' + k + '</div>' +
      /* 「기타」를 고르면 바로 아래에 직접 쓰는 칸이 열린다 (2026-11-10 사용자) — 다른 것을 고르면 다시 접힌다(쓴 글은 남겨 둔다) */
      '<input class="syInp csEtc" type="text" maxlength="60" autocomplete="off" style="display:none;margin-top:0.5rem;animation:syUp .26s cubic-bezier(.2,.9,.3,1.05);">' +   /* hidden 속성은 .syInp{display:block} 에 져서 style 로 접는다 */
      '<div class="lab">' + T('자세히 적어 주세요', 'Tell us more') + ' <small class="csOpt">' + T('(적지 않아도 돼요)', '(optional)') + '</small></div>' +
      '<textarea class="syInp csTx" rows="4" maxlength="1000"></textarea>' +
      '<label class="csDiag"><input type="checkbox" checked><span>' + T('문제 기록(앱 판 · 기기 · 오류)을 함께 보내기', 'Attach the problem log (version · device · errors)') + '</span>' +
        '<button type="button" class="csPeek">' + T('보기', 'View') + '</button></label>' +
      '<pre class="csDiagTx" hidden></pre>' +
      '<button class="big" type="button" data-a="send" disabled>' + IC.send + T('보내기', 'Send') + '</button>' +
      '<button class="big ghost" type="button" data-a="back">' + I.back + T('고객 센터로', 'Back') + '</button>');
    var tx = $('.csTx', s), send = $('[data-a=send]', s), etc = $('.csEtc', s), kind = -1, ETC = KINDS.length - 1;
    tx.placeholder = T('예) 3층에서 13310호를 찾았는데 화살표가 반대로 나와요', 'e.g. I searched Room 13310 on 3F and the arrow points the wrong way');
    etc.placeholder = T('어떤 문제인지 직접 적어 주세요', 'Describe the problem in your own words');
    etc.setAttribute('aria-label', T('기타 — 직접 적기', 'Other — describe'));
    /* 「기타」인데 직접 쓰는 칸이 비어 있으면 아래 「자세히」라도 있어야 보낼 수 있다 */
    function ready(){ send.disabled = !((kind >= 0 && (kind !== ETC || etc.value.trim())) || tx.value.trim()); }
    $$('.csKinds button', s).forEach(function(b){ b.onclick = function(){
      kind = +b.getAttribute('data-k');
      $$('.csKinds button', s).forEach(function(o){ o.classList.toggle('pick', o === b); });
      etc.style.display = kind === ETC ? 'block' : 'none';
      if(kind === ETC) setTimeout(function(){ try{ etc.focus(); }catch(e){} }, 60);
      ready();
    }; });
    etc.addEventListener('input', ready);
    tx.addEventListener('input', ready);
    var pre = $('.csDiagTx', s);
    $('.csPeek', s).onclick = function(e){
      e.preventDefault();
      if(pre.hidden){ pre.textContent = diagText() || T('(문제 기록이 아직 없어요)', '(no log yet)'); pre.hidden = false; this.textContent = T('접기', 'Hide'); }
      else { pre.hidden = true; this.textContent = T('보기', 'View'); }
    };
    $('[data-a=back]', s).onclick = open;
    send.onclick = function(){
      /* 보내는 것처럼 — 실제로는 아무 데도 보내지 않는다(사용자 지시). 잠깐 「보내는 중」을 보여 준 뒤 「전송했어요」. */
      send.disabled = true; tx.disabled = true; etc.disabled = true;
      send.innerHTML = '<span class="csSpin"></span>' + esc(T('보내는 중…', 'Sending…'));
      setTimeout(function(){ if(document.body.contains(s)) sent(); }, 1400);
    };
  }
  function sent(){
    var d = new Date(), no = 'CS-' + two(d.getMonth() + 1) + two(d.getDate()) + '-' + (1000 + Math.floor(Math.random() * 9000));
    var s = U.sheet('<div class="csDone">' + IC.check + '</div>' +
      '<h4 class="csMid">' + T('전송했어요', 'Sent') + '</h4>' +
      '<p class="sub csMid">' + T('관리자의 이메일 <b>' + esc(ADMIN_MAIL) + '</b> 로 보냈어요.<br>관리자가 확인하고 고칠게요. 고마워요!',
                                  'Sent to the admin at <b>' + esc(ADMIN_MAIL) + '</b>.<br>The admin will check and fix it. Thank you!') + '</p>' +
      '<div class="csTicket">' + T('접수 번호', 'Ticket') + ' <b>' + no + '</b></div>' +
      '<button class="big" type="button" data-a="ok">' + T('확인', 'OK') + '</button>');
    $('[data-a=ok]', s).onclick = U.closeSheet;
  }

  /* ════════ 상담원과 전화하기 (실제로는 걸리지 않는다) ════════ */
  var CALL = null;
  function call(){
    if(CALL) return;
    var el = mk('div', 'csCall',
      '<div class="csWho"><div class="csAv">' + I.headset + '<i></i><i></i></div>' +
        '<b>' + esc(T(CENTER[0], CENTER[1])) + '</b><span class="csSt">' + esc(T('발신 중…', 'Calling…')) + '</span></div>' +
      '<div class="csCap" hidden></div>' +
      '<div class="csCtl"><button type="button" data-a="mute">' + I.mic + '<span>' + T('음소거', 'Mute') + '</span></button>' +
        '<button type="button" data-a="spk">' + IC.vol + '<span>' + T('스피커', 'Speaker') + '</span></button></div>' +
      '<button type="button" class="csEnd" data-a="end">' + I.phoneOff + '</button>');
    $('.csEnd', el).setAttribute('aria-label', T('통화 끊기', 'Hang up'));
    U.phone().appendChild(el);
    var st = $('.csSt', el), cap = $('.csCap', el), secs = 0, timers = [];
    CALL = {el: el, end: end};
    function later(fn, ms){ timers.push(setTimeout(fn, ms)); }
    function say(t){ cap.hidden = false; cap.textContent = t; cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in'); }
    /* 2.6초 뒤 상담원 연결 — 그다음부터 통화 시간이 흐른다 */
    later(function(){
      el.classList.add('on');
      st.textContent = '00:00';
      try{ if(navigator.vibrate) navigator.vibrate(40); }catch(e){}
      timers.push(setInterval(function(){ secs++; st.textContent = mmss(secs); }, 1000));
      later(function(){ say(T('「안녕하세요, 공대 3호관 길안내 고객센터 상담원입니다. 무엇을 도와드릴까요?」', '“Hello, this is the Bldg.3 Navigation Help Center. How can I help you?”')); }, 900);
      later(function(){ say(T('「설정의 「문제 기록」을 눌러 복사해 주시면 더 빨리 확인할 수 있어요.」', '“If you copy the Problem log from Settings, we can check faster.”')); }, 8000);
    }, 2600);
    $('[data-a=mute]', el).onclick = function(){
      var on = this.classList.toggle('on');
      this.innerHTML = (on ? I.micOff : I.mic) + '<span>' + (on ? T('음소거 중', 'Muted') : T('음소거', 'Mute')) + '</span>';
    };
    $('[data-a=spk]', el).onclick = function(){ this.classList.toggle('on'); };
    $('.csEnd', el).onclick = end;
    function end(){
      if(!CALL) return;
      timers.forEach(function(t){ clearTimeout(t); clearInterval(t); });
      var talked = el.classList.contains('on');
      st.textContent = T('통화 종료', 'Call ended') + (talked ? ' · ' + mmss(secs) : '');
      el.classList.add('ending');
      CALL = null;
      setTimeout(function(){ el.remove(); }, 900);
      setTimeout(function(){ U.toast(talked ? T('상담원과의 통화를 마쳤어요 (' + mmss(secs) + ')', 'Call ended (' + mmss(secs) + ')') : T('전화를 끊었어요', 'Call cancelled'), true); }, 950);
    }
  }

  /* ── 휴대폰 뒤로가기 (shell.js appBackStep) — 통화 중이면 끊는다. 창(시트)은 consent.js 가 닫는다 ── */
  if(typeof appBackStep === 'function'){
    var _back = appBackStep;
    window.appBackStep = function(){
      if(CALL){ CALL.end(); return true; }
      return _back.apply(this, arguments);
    };
  }

  return {open: open, mail: mailSheet, call: call, ADMIN_MAIL: ADMIN_MAIL};
})();
