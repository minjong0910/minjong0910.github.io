"use strict";
/* resume.js — 길안내 이어 하기 (2026-10-19 사용자가 견본 사진을 보고 고름)

   길안내 중에 카카오톡을 보러 나갔다 오면, 폰이 앱을 새로 읽어 첫 화면으로 돌아갈 때가 있다.
   · 길안내 단계를 넘길 때마다 「목적지 · 출발 위치 · 몇 단계 · 시각」을 이 폰에만 적어 둔다(b3nav_resume — 서버로 보내지 않음).
   · 앱을 다시 열어 첫 화면이 뜨면 아래에 카드 「아까 보던 길안내가 있어요」 → [이어서 보기] [괜찮아요, 새로 찾을게요].
   · 순서(사용자) : 초록 켜는 화면 → 쉬운 사용모드 「처음이세요?」(시험 페이지 · 처음인 사람만) → 이 카드.
   · 30분이 지난 기억 · 도착한 길 · 출입문 QR 로 새로 들어온 경우(첫 화면이 아니라 「여기가 맞나요?」)는 묻지 않는다.
   · 첫 화면 · 찾기 · 검색 · 도착 화면으로 가면 지운다(새로 시작했거나 다 왔다). 3D · 층 상세 · 설정을 잠깐 보고 오는 건 남겨 둔다. */
var RESUME = (function(){
  var KEY = 'b3nav_resume', MAX_AGE = 30 * 60 * 1000;
  var CLEAR_ON = {s1:1, scat:1, s3:1, s7:1, s2:1, sqr:1, sqrok:1};
  var GATE_KO = {MAIN:'정문', BACK:'후문', EAST:'동문', WEST:'서문'};
  var GATE_EN = {MAIN:'the main gate', BACK:'the back gate', EAST:'the east gate', WEST:'the west gate'};
  function ko(){ return typeof LANG === 'undefined' || LANG === 'ko'; }
  function T(k, e){ return ko() ? k : e; }
  function lsGet(){ try{ return JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){ return null; } }
  function lsSet(v){ try{ if(v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); }catch(e){} }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  /* 앱이 켜질 때 남아 있던 기억 — 첫 화면으로 가면서 지워지기 전에 먼저 들고 있는다 */
  var pending = lsGet(), asking = false, resuming = false;
  if(pending && (!pending.t || !pending.ts || Date.now() - pending.ts > MAX_AGE)){ pending = null; lsSet(null); }

  function sameTarget(a, b){ return !!(a && b && a.kind === b.kind && String(a.code || '') === String(b.code || '') && String(a.floor) === String(b.floor)); }

  /* 길안내 단계를 그릴 때마다 (guide.js render6) */
  function save(){
    if(typeof steps === 'undefined' || !steps || !steps.length || typeof target === 'undefined' || !target) return;
    var scr = document.querySelector('.screen.on');
    if(scr && scr.id !== 's6') return;
    if(si >= steps.length - 1){ lsSet(null); return; }          // 마지막(도착) 단계 = 다 왔다
    var img = document.querySelector('#ph img'), src = img ? img.getAttribute('src') : '';
    if(src && (src.length > 300 || /^data:/.test(src))) src = '';   // 서버 사진(긴 글자)은 적어 두지 않는다
    lsSet({ t:{kind:target.kind, floor:target.floor, code:target.code || null},
            sf: (typeof startFloor !== 'undefined') ? startFloor : 1,
            g: (typeof QRNAV !== 'undefined' && QRNAV.gate) ? QRNAV.gate() : null,
            si: si, n: steps.length, img: src || '', ts: Date.now() });
  }
  /* 화면이 바뀔 때 (shell.js go) — 새로 시작했거나 다 왔으면 지운다 */
  function onScreen(id){
    if(resuming) return;
    if(card()){ if(id !== 's1') dismiss(); return; }            // 카드를 두고 다른 화면으로 갔다 = 새로 찾는다
    if(CLEAR_ON[id]){ lsSet(null); return; }
    if(id === 's4'){
      var cur = lsGet();
      if(cur && typeof target !== 'undefined' && !sameTarget(cur.t, target)) lsSet(null);   // 다른 곳을 고름(즐겨찾기 등)
    }
  }

  function placeName(t){
    if(t.kind === 'toilet')  return (typeof lvName === 'function' ? lvName(t.floor) : t.floor + '층') + T(' 화장실', ' Restroom');
    if(t.kind === 'zone')    return T('크리에이티브 존', 'Creative Zone');
    if(t.kind === 'emstair') return (typeof lvName === 'function' ? lvName(t.floor) : t.floor + '층') + T(' 비상계단', ' Emergency Stairs');
    return (typeof roomTitle === 'function') ? roomTitle(t.code) : String(t.code);
  }
  function fromText(p){
    if(p.g && GATE_KO[p.g] && String(p.sf) === '1') return T(GATE_KO[p.g] + '에서 출발', 'From ' + GATE_EN[p.g]);
    var lv = (typeof lvName === 'function') ? lvName(p.sf) : (p.sf + '층');
    return T(lv + ' 엘리베이터에서 출발', 'From the ' + lv + ' elevator');
  }
  function agoText(ts){
    var m = Math.floor((Date.now() - ts) / 60000);
    return m < 1 ? T('방금 보던 곳', 'Just now') : T(m + '분 전에 보던 곳', m + ' min ago');
  }

  function card(){ return document.getElementById('rsCard'); }
  function closeCard(){ var c = card(); if(c) c.remove(); asking = false; }
  function show(p){
    var phone = document.querySelector('.phone'); if(!phone || card()) return;
    asking = true;
    var c = document.createElement('div'); c.className = 'rsCard'; c.id = 'rsCard';
    c.setAttribute('role', 'dialog');
    c.innerHTML = '<div class="rsHead">🗺 ' + esc(T('아까 보던 길안내가 있어요', 'You were in the middle of a route')) + '</div>' +
      '<div class="rsBody">' + (p.img ? '<img src="' + esc(p.img) + '" alt="">' : '') +
      '<div><b>' + esc(placeName(p.t)) + '</b><small>' + esc(fromText(p)) + ' · ' + esc(agoText(p.ts)) + '</small>' +
      '<span class="pg">' + (p.si + 1) + ' / ' + p.n + T('단계', ' steps') + '</span></div></div>' +
      '<button class="big" type="button" data-a="go">' + esc(T('이어서 보기', 'Continue')) + '</button>' +
      '<button class="big ghost" type="button" data-a="no">' + esc(T('괜찮아요, 새로 찾을게요', 'No thanks, start over')) + '</button>';
    c.addEventListener('click', function(e){
      var b = e.target.closest('button[data-a]'); if(!b) return;
      if(b.getAttribute('data-a') === 'go') resume(p);
      else dismiss();
    });
    phone.appendChild(c);
  }
  function dismiss(){ closeCard(); pending = null; lsSet(null); }

  /* 이어서 보기 — 목적지와 출발 위치로 길안내를 다시 만들고 그 단계로 바로 */
  function resume(p){
    closeCard(); pending = null; resuming = true;
    try{
      openTarget({kind:p.t.kind, floor:p.t.floor, code:p.t.code}, p.t.floor);
      startFloor = p.sf;
      if(typeof buildStartFloorPicker === 'function') buildStartFloorPicker();
      startGuide();
      si = Math.max(0, Math.min(steps.length - 1, p.si));
      render6(true);
    }catch(err){ resuming = false; return; }
    resuming = false;
    save();
    var phone = document.querySelector('.phone');
    if(phone){
      var t = document.createElement('div'); t.className = 'rsToast';
      t.textContent = '✓ ' + T('아까 보던 ' + (si + 1) + '단계부터 이어서 안내해요', 'Continuing from step ' + (si + 1));
      phone.appendChild(t);
      setTimeout(function(){ t.classList.add('out'); }, 2200);
      setTimeout(function(){ t.remove(); }, 2700);
    }
  }

  /* 언제 묻나 : 켜는 화면이 끝나고(또는 없고) · 앱이 준비되고 · 쉬운 사용모드가 묻는 중이 아니고 · 첫 화면일 때 */
  (function wait(){
    if(!pending) return;
    var t0 = Date.now(), sawBoot = false;
    (function tick(){
      if(!pending) return;
      var boot = document.querySelector('.fx-boot');
      if(boot) sawBoot = true;
      var bootDone = !boot && (sawBoot || document.readyState !== 'loading');
      var appOk = (typeof appBooted !== 'undefined' && appBooted);
      var easyBusy = (typeof EASY !== 'undefined' && EASY.busy && EASY.busy());
      var scr = document.querySelector('.screen.on');
      if(bootDone && appOk && !easyBusy && scr){
        if(scr.id === 's1' && Date.now() - pending.ts <= MAX_AGE) show(pending);
        else { pending = null; lsSet(null); }                     // QR 로 새로 들어옴 등 — 묻지 않는다
        return;
      }
      if(Date.now() - t0 < 180000) setTimeout(tick, 50);
    })();
  })();

  return { save:save, onScreen:onScreen, isAsking:function(){ return !!card(); }, dismiss:dismiss };
})();
