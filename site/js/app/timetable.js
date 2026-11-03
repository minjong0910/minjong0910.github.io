"use strict";
/* timetable.js — 내 시간표 · 바로 길안내 · 수업 알림 (2026-11-03 사용자가 견본으로 정한 것)
   · 설정 → 내 시간표 / ☰ → 내 시간표. 월~금 칸 — 빈 곳을 누르면 넣기, 수업을 누르면 고치기. 이 폰에만 저장(서버로 보내지 않는다).
   · 시간 · 분 칸은 숫자판만 뜬다(inputmode="numeric") — 사용자 : 「−, + 말고 그 칸을 누르면 숫자판만」 · 시 두 자리를 치면 분으로.
   · 색 : 무지개 14가지 + 무지개 막대 + 직접 고르기.
   · 바로 길안내 : 수업 [40]분 전부터 시작하고 [10]분 뒤까지 앱을 켜면 그 강의실 길안내 1단계가 바로.
     그날 첫 수업은 「주로 들어오는 문」에서, 앞 수업이 막 끝났으면(30분 안) 앞 수업 층 엘리베이터 앞에서 출발.
     그 시간이 아니면 첫 화면에 「오늘 다음 수업」 카드.
   · 수업 알림 : 수업 시작 N분 전에 알림(고른 소리 · 진동). 알림을 누르면 그 강의실 길안내.
     ※ 앱이 열려 있는 동안만 울린다 — 앱을 닫아도 울리게 하려면 서버가 보내는 알림(푸시 · Firebase 유료 요금제)이 따로 필요하다. */
var TIMETABLE = (function(){
  var U = B3UI, $ = U.$, $$ = U.$$, mk = U.mk, esc = U.esc, ls = U.ls, T = U.T, IC = U.IC;
  var S = window.SHARE;
  var K = {tt: 'b3nav_tt', tts: 'b3nav_tts', tta: 'b3nav_tta', fired: 'b3nav_tt_fired'};
  var DAYS = ['월', '화', '수', '목', '금', '토', '일'], DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  function dayName(d){ return U.ko() ? DAYS[d] : DAYS_EN[d]; }
  var COL = [['빨강', '#E53935', 'Red'], ['주황', '#F57C00', 'Orange'], ['노랑', '#F9C80E', 'Yellow'], ['연두', '#7CB342', 'Light green'], ['초록', '#2E8B57', 'Green'], ['청록', '#00897B', 'Teal'], ['하늘', '#039BE5', 'Sky blue'],
             ['파랑', '#1E63C4', 'Blue'], ['남색', '#3949AB', 'Indigo'], ['보라', '#7E57C2', 'Purple'], ['자주', '#AD1457', 'Magenta'], ['분홍', '#EC407A', 'Pink'], ['갈색', '#8D6E63', 'Brown'], ['회색', '#607D8B', 'Gray']];   // 이름 셋째 칸 = 영어
  var SND = [['chime', '차임', '띵동', 'Chime'], ['bell', '종소리', '땡 땡 땡', 'Bell'], ['marimba', '마림바', '또로롱', 'Marimba'], ['beep', '전자음', '삐삐삐삐', 'Beep'], ['bird', '새소리', '짹짹', 'Birdsong'], ['vib', '진동만', '', 'Vibrate only'], ['mute', '소리 없음', '', 'Silent']];
  var LIM = {lead: 180, after: 60, min: 120};
  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  var TT = ls(K.tt) || [];
  var TTS = ls(K.tts) || {auto: true, gate: 'MAIN', lead: 40, after: 10};
  var TTA = ls(K.tta) || {on: true, min: 10, snd: 'chime', vol: 70, vib: true};
  function save(){ ls(K.tt, TT); ls(K.tts, TTS); ls(K.tta, TTA); }
  function mins(t){ var p = String(t).split(':'); return +p[0] * 60 + +p[1]; }
  function pad2(v){ return ('0' + v).slice(-2); }
  function hhmm(m){ return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60); }
  function dayList(d){ return TT.filter(function(c){ return c.days.indexOf(d) >= 0; }).sort(function(a, b){ return mins(a.s) - mins(b.s); }); }
  function nowInfo(){ var n = new Date(); return {d: (n.getDay() + 6) % 7, m: n.getHours() * 60 + n.getMinutes()}; }
  function notiOK(){ return typeof CONSENT !== 'undefined' && CONSENT.notiOK(); }
  function alarmOn(){ return TTA.on && notiOK(); }
  function gateFrom(){ return T(S.GK[TTS.gate] + '에서 출발 (주로 들어오는 문)', 'From the ' + S.GE[TTS.gate] + ' (usual door)'); }
  function leftText(m){ return m > 0 ? T(m + '분 남음', m + ' min left') : (m === 0 ? T('지금 시작', 'Starting now') : T((-m) + '분 지남', (-m) + ' min ago')); }

  /* ── 색 ── */
  function rgbOf(h){ h = String(h).replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function inkOn(h){ var c = rgbOf(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255 > 0.62 ? '#111' : '#fff'; }   // 밝은 색(노랑 등)이면 글자를 검게
  function hueOf(h){
    var c = rgbOf(h).map(function(v){ return v / 255; }), mx = Math.max.apply(null, c), mn = Math.min.apply(null, c), d = mx - mn;
    if(!d) return 0;
    var x = mx === c[0] ? ((c[1] - c[2]) / d) % 6 : (mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4);
    return Math.round((x * 60 + 360) % 360);
  }
  function hslHex(hh, s, l){
    s /= 100; l /= 100;
    var a = s * Math.min(l, 1 - l);
    function f(n){ var k = (n + hh / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }
    return '#' + [f(0), f(8), f(4)].map(function(x){ return pad2(Math.round(x * 255).toString(16)); }).join('');
  }

  /* ── 숫자 칸 : 누르면 휴대폰 숫자판만 ── */
  function numField(id, v, max, len){
    return '<input class="syNum" id="' + id + '" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="' + (len || 3) + '" data-max="' + max + '" value="' + (len === 2 ? pad2(v) : v) + '">';
  }
  function hookNum(inp, get, set, next){
    var mx = +inp.getAttribute('data-max'), len = +inp.getAttribute('maxlength');
    inp.addEventListener('focus', function(){ setTimeout(function(){ try{ inp.select(); }catch(e){} }, 0); });
    inp.addEventListener('input', function(){
      var v = inp.value.replace(/\D/g, '').slice(0, len); if(v !== inp.value) inp.value = v;
      if(v !== '' && set) set(Math.min(mx, +v));
      if(next && v.length === len) next.focus();               // 시 두 자리를 치면 분 칸으로
    });
    inp.addEventListener('blur', function(){
      var v = inp.value === '' ? get() : Math.min(mx, +inp.value);
      if(set) set(v); inp.value = len === 2 ? pad2(v) : v;
    });
  }

  /* ════════ 시간표 화면 (#stt) ════════ */
  var from = 'sset';
  function open(f){ from = f || ((document.querySelector('#sset.on')) ? 'sset' : 's1'); dropCard(); go('stt'); }
  function back(){ if(from === 'sset' && typeof openOverlay === 'function') openOverlay('sset'); else go(from || 's1'); }
  function render(){
    var st = document.getElementById('ttSet'); if(!st) return;
    st.innerHTML = '<button type="button" class="syChip2' + (TTS.auto ? '' : ' off') + '" data-a="go">' + IC.nav + '<span><b>' + T('바로 길안내', 'Auto directions') + '</b><small>' + (TTS.auto ? S.gName(TTS.gate) + ' · ' + TTS.lead + T('분 전~', ' min before – ') + TTS.after + T('분 뒤', ' min after') : T('꺼짐', 'Off')) + '</small></span></button>' +
      '<button type="button" class="syChip2' + (alarmOn() ? '' : ' off') + '" data-a="al">' + IC.bell + '<span><b>' + T('수업 알림', 'Class alerts') + '</b><small>' + (alarmOn() ? TTA.min + T('분 전 · ', ' min before · ') + sndName(TTA.snd) : T('꺼짐 · 켜면 허용을 물어요', 'Off · we ask when you turn it on')) + '</small></span></button>';
    $('[data-a=go]', st).onclick = goSheet;
    $('[data-a=al]', st).onclick = function(){ audio(); go('salm'); };   // 누른 그 순간에 소리 장치를 깨워 둔다 (폰은 누름 없이 소리를 못 낸다)
    grid();
  }
  function grid(){
    var g = document.getElementById('ttGrid'); if(!g) return;
    var lo = 9 * 60, hi = 18 * 60;
    TT.forEach(function(c){ lo = Math.min(lo, Math.floor(mins(c.s) / 60) * 60); hi = Math.max(hi, Math.ceil(mins(c.e) / 60) * 60); });
    var span = hi - lo, hours = span / 60, now = nowInfo(), nx = null;
    if(now.d < 5){ var l = dayList(now.d).filter(function(c){ return mins(c.s) + TTS.after >= now.m; }); nx = l[0] || null; }
    var hd = '<div class="hd"></div>', cols = '<div class="col hrs">';
    for(var h = 0; h < hours; h++) cols += '<span style="top:' + (h / hours * 100) + '%">' + (lo / 60 + h) + '</span>';
    cols += '</div>';
    var bg = 'background-image:linear-gradient(var(--syGridLine,#1A2430) 1px,transparent 1px);background-size:100% ' + (100 / hours) + '%;';
    var bellS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:0.62rem;height:0.62rem;vertical-align:-0.05rem;margin-left:0.15rem;"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>';
    for(var d = 0; d < 5; d++){
      var today = (d === now.d);
      hd += '<div class="hd' + (today ? ' today' : '') + '">' + dayName(d) + '</div>';
      cols += '<div class="col' + (today ? ' today' : '') + '" data-d="' + d + '" style="' + bg + '">';
      dayList(d).forEach(function(c){
        var top = (mins(c.s) - lo) / span * 100, ht = (mins(c.e) - mins(c.s)) / span * 100;
        cols += '<div class="syBlk' + (nx === c && today ? ' next' : '') + '" data-id="' + c.id + '" style="top:' + top + '%;height:' + ht + '%;background:' + c.c + ';color:' + inkOn(c.c) + ';"><b>' + esc(c.n) + '</b><small>' + esc(S.dno(c.r)) + (alarmOn() && c.al !== false ? bellS : '') + '</small></div>';
      });
      if(today && now.m > lo && now.m < hi) cols += '<div class="syNow" style="top:' + ((now.m - lo) / span * 100) + '%"></div>';
      cols += '</div>';
    }
    g.innerHTML = hd + cols;
    if(!TT.length){ var e = mk('div', 'syEmpty', T('빈 칸을 누르거나 아래 「수업 넣기」로<br>이번 학기 수업을 넣어 주세요', 'Tap an empty slot or “Add class” below')); g.appendChild(e); }
    $$('.syBlk', g).forEach(function(b){ b.onclick = function(e){ e.stopPropagation(); classSheet(+b.getAttribute('data-id')); }; });
    $$('.col[data-d]', g).forEach(function(col){ col.onclick = function(e){
      var r = col.getBoundingClientRect(), m = lo + Math.floor((e.clientY - r.top) / r.height * span / 60) * 60;
      classSheet(null, {d: +col.getAttribute('data-d'), s: m});
    }; });
  }

  /* 바로 길안내 설정 (시간표 위 왼쪽 칸) */
  function goSheet(){
    var s = U.sheet('<h4>' + IC.nav + T('바로 길안내', 'Auto directions') + '</h4><p class="sub">' + T('수업 시간에 앱을 켜면 그 강의실 길안내가 바로 떠요.', 'Open the app around class time and the route to that room starts right away.') + '</p>' +
      '<div class="syRowS"><b>' + T('바로 길안내', 'Auto directions') + '</b><span class="sySw' + (TTS.auto ? ' on' : '') + '" role="switch" aria-checked="' + TTS.auto + '"></span></div>' +
      '<div class="lab">' + T('주로 들어오는 문', 'Usual door') + ' <small style="font-weight:600;color:#8FA3B8;">' + T('— 그날 첫 수업은 이 문에서 출발', '— first class of the day starts here') + '</small></div>' +
      '<div class="syGateC">' + S.GATES.map(function(k){ return '<button type="button" data-g="' + k + '" class="' + (TTS.gate === k ? 'on' : '') + '">' + S.gName(k) + '</button>'; }).join('') + '</div>' +
      '<div class="lab">' + T('언제 바로 길안내를 할까요?', 'When?') + '</div>' +
      '<div class="syMinRow"><span class="lb">' + T('수업', 'From') + '</span>' + numField('gL', TTS.lead, LIM.lead) + '<span>' + T('분 전부터', 'min before class') + '</span></div>' +
      '<div class="syMinRow"><span class="lb">' + T('시작하고', 'Until') + '</span>' + numField('gA', TTS.after, LIM.after) + '<span>' + T('분 뒤까지', 'min after start') + '</span></div>' +
      '<div class="syTip">' + T('숫자 칸을 누르면 휴대폰 숫자판만 떠요', 'Tap a number to type it') + '</div>' +
      '<button class="big" type="button">' + T('확인', 'OK') + '</button>');
    $('.syRowS .sySw', s).onclick = function(){ TTS.auto = !TTS.auto; this.classList.toggle('on', TTS.auto); this.setAttribute('aria-checked', TTS.auto); save(); render(); };
    $$('.syGateC button', s).forEach(function(b){ b.onclick = function(){ TTS.gate = b.getAttribute('data-g'); $$('.syGateC button', s).forEach(function(x){ x.classList.toggle('on', x === b); }); save(); render(); }; });
    hookNum($('#gL', s), function(){ return TTS.lead; }, function(v){ TTS.lead = v; save(); render(); });
    hookNum($('#gA', s), function(){ return TTS.after; }, function(v){ TTS.after = v; save(); render(); });
    $('.big', s).onclick = U.closeSheet;
  }

  /* ── 수업 넣기 · 고치기 ── */
  function tval(s, h, m){ var a = $(h, s).value, b = $(m, s).value; if(a === '' || b === '' || +a > 23 || +b > 59) return null; return +a * 60 + +b; }
  function classSheet(id, pre){
    var c = id ? TT.filter(function(x){ return x.id === id; })[0] : null;
    var f = c ? clone(c) : {n: '', r: '', days: pre ? [pre.d] : [], s: pre ? hhmm(pre.s) : '09:00', e: pre ? hhmm(pre.s + 75) : '10:15', c: COL[TT.length % COL.length][1], al: true};
    var colNow = f.c, Sx = f.s.split(':'), E = f.e.split(':');
    var s = U.sheet('<h4>' + (c ? IC.cal + T('수업 고치기', 'Edit class') : IC.plus + T('수업 넣기', 'Add class')) + '</h4>' +
      '<div class="lab">' + T('과목 이름', 'Class name') + '</div><input class="syInp" id="ttN" maxlength="20" placeholder="' + T('예 : 신호및시스템', 'e.g. Signals and Systems') + '" value="' + esc(f.n) + '">' +
      '<div class="lab">' + T('강의실 번호', 'Room number') + '</div><input class="syInp" id="ttR" inputmode="numeric" pattern="[0-9]*" maxlength="5" autocomplete="off" placeholder="' + T('5자리 (예 : 13324)', '5 digits (e.g. 13324)') + '" value="' + esc(f.r ? S.dno(f.r) : '') + '"><div id="ttRo"></div>' +
      '<div class="lab">' + T('요일', 'Days') + '</div><div class="syDays">' + [0, 1, 2, 3, 4].map(function(d){ return '<button type="button" data-d="' + d + '" class="' + (f.days.indexOf(d) >= 0 ? 'on' : '') + '">' + dayName(d) + '</button>'; }).join('') + '</div>' +
      '<div class="lab">' + T('시간', 'Time') + ' <small style="font-weight:600;color:#8FA3B8;">' + T('— 칸을 누르면 숫자판 · 시 두 자리를 치면 분으로 넘어가요', '— tap to type · moves to minutes after 2 digits') + '</small></div>' +
      '<div class="syTimes"><span class="syHM">' + numField('tSh', +Sx[0], 23, 2) + ':' + numField('tSm', +Sx[1], 59, 2) + '</span><span>~</span>' +
        '<span class="syHM">' + numField('tEh', +E[0], 23, 2) + ':' + numField('tEm', +E[1], 59, 2) + '</span></div><div class="syDur" id="ttDur"></div>' +
      '<div class="lab">' + T('이 수업 알림', 'Alert for this class') + '</div><div class="syMinRow"><span class="sySw' + (f.al !== false && alarmOn() ? ' on' : '') + '" role="switch" id="ttAl" style="cursor:pointer;margin-left:0;margin-right:0.3rem;"></span>' +
        numField('ttAm', f.am != null ? f.am : TTA.min, LIM.min) + '<span>' + T('분 전 · ', 'min before · ') + sndName(TTA.snd) + '</span></div>' +
      '<div class="lab">' + T('색', 'Color') + ' <small style="font-weight:600;color:#8FA3B8;">' + T('— 무지개 막대를 밀면 어떤 색이든', '— slide the rainbow for any color') + '</small></div>' +
      '<div class="syCols">' + COL.map(function(x){ return '<button type="button" data-c="' + x[1] + '" title="' + T(x[0], x[2]) + '" aria-label="' + T(x[0], x[2]) + '" style="background:' + x[1] + '"></button>'; }).join('') + '</div>' +
      '<div class="syHueRow"><input type="range" class="syHue" id="ttHue" min="0" max="359" value="' + hueOf(colNow) + '" aria-label="' + T('무지개 막대', 'Rainbow') + '"><label class="syPick" title="' + T('직접 고르기', 'Pick') + '"><input type="color" id="ttCol" value="' + colNow + '" aria-label="' + T('직접 고르기', 'Pick') + '"></label></div>' +
      '<div class="syPrev" id="ttPrev"></div>' +
      '<div class="syErr" id="ttErr"></div>' +
      '<button class="big" type="button" id="ttOk">' + T('저장', 'Save') + '</button>' + (c ? '<button class="big del" type="button" id="ttDel">' + T('이 수업 지우기', 'Delete this class') + '</button>' : '') +
      '<div class="syNote">' + IC.lock + T('시간표는 이 폰에만 저장돼요 — 서버로 보내지 않아요', 'Saved on this phone only — never sent to a server') + '</div>');
    var okRoom = null, alOn = f.al !== false && alarmOn(), alTouched = false, amV = f.am != null ? f.am : TTA.min;
    function prev(){
      var p = $('#ttPrev', s), n = $('#ttN', s).value.trim() || T('과목 이름', 'Class name'), a = tval(s, '#tSh', '#tSm'), b = tval(s, '#tEh', '#tEm');
      p.style.background = colNow; p.style.color = inkOn(colNow);
      p.innerHTML = '<b>' + esc(n) + '</b>' + esc(okRoom ? S.dno(okRoom) : T('강의실', 'Room')) + T(' · 시간표에 이렇게 보여요', ' · how it looks');
      $$('.syCols button', s).forEach(function(x){ x.classList.toggle('on', x.getAttribute('data-c').toLowerCase() === colNow.toLowerCase()); });
      var du = $('#ttDur', s);
      if(a !== null && b !== null && b > a){ var m = b - a; du.style.color = ''; du.textContent = T(m + '분 수업', m + ' min') + (U.ko() && m >= 60 ? ' (' + Math.floor(m / 60) + '시간' + (m % 60 ? ' ' + (m % 60) + '분' : '') + ')' : '') + (alOn ? T(' · ' + hhmm(Math.max(0, a - amV)) + '에 알림', ' · alert at ' + hhmm(Math.max(0, a - amV))) : ''); }
      else { du.style.color = '#FF6B6B'; du.textContent = T('끝나는 시간이 시작보다 늦어야 해요', 'End must be after start'); }
    }
    S.roomField($('#ttR', s), $('#ttRo', s), function(v){ okRoom = v; if($('#ttPrev', s)) prev(); });
    $('#ttN', s).addEventListener('input', prev);
    var ids = ['#tSh', '#tSm', '#tEh', '#tEm'];
    ids.forEach(function(q, i){
      var inp = $(q, s), keep = +inp.value;
      hookNum(inp, function(){ return keep; }, function(v){ keep = v; prev(); }, i < 3 ? $(ids[i + 1], s) : null);
    });
    hookNum($('#ttAm', s), function(){ return amV; }, function(v){ amV = v; prev(); });
    /* 수업마다 알림 — 켜는 그 순간 알림이 허용 안 돼 있으면 묻는다 */
    $('#ttAl', s).onclick = function(){
      var sw = this; alTouched = true;
      if(alOn){ alOn = false; sw.classList.remove('on'); prev(); return; }
      CONSENT.need('noti', function(){ alOn = true; sw.classList.add('on'); if(!TTA.on){ TTA.on = true; save(); } prev(); });
    };
    $$('.syDays button', s).forEach(function(b){ b.onclick = function(){ b.classList.toggle('on'); }; });
    $$('.syCols button', s).forEach(function(b){ b.onclick = function(){ colNow = b.getAttribute('data-c'); $('#ttHue', s).value = hueOf(colNow); $('#ttCol', s).value = colNow; prev(); }; });
    $('#ttHue', s).addEventListener('input', function(){ colNow = hslHex(+this.value, 72, 46); $('#ttCol', s).value = colNow; prev(); });
    $('#ttCol', s).addEventListener('input', function(){ colNow = this.value; $('#ttHue', s).value = hueOf(colNow); prev(); });
    prev();
    $('#ttOk', s).onclick = function(){
      var n = $('#ttN', s).value.trim(), days = $$('.syDays button.on', s).map(function(b){ return +b.getAttribute('data-d'); }),
          a = tval(s, '#tSh', '#tSm'), b = tval(s, '#tEh', '#tEm'), err = $('#ttErr', s);
      if(!n){ err.textContent = T('과목 이름을 넣어 주세요', 'Please enter the class name'); return; }
      if(!okRoom){ err.textContent = T('강의실 번호를 확인해 주세요 (초록 ✓ 가 떠야 해요)', 'Please check the room number (a green ✓ must appear)'); return; }
      if(!days.length){ err.textContent = T('요일을 하나 이상 골라 주세요', 'Pick at least one day'); return; }
      if(a === null || b === null){ err.textContent = T('시간을 확인해 주세요 (시 0~23 · 분 0~59)', 'Check the time (hour 0–23 · minute 0–59)'); return; }
      if(b <= a){ err.textContent = T('끝나는 시간이 시작보다 늦어야 해요', 'End must be after start'); return; }
      var rec = {id: c ? c.id : Date.now(), n: n, r: okRoom, days: days, s: hhmm(a), e: hhmm(b), c: colNow, al: alTouched ? alOn : f.al !== false, am: amV};   // 알림 허용 전이라 꺼져 보이던 수업은, 직접 끄지 않았으면 허용 뒤 다시 울린다
      if(c) TT = TT.map(function(x){ return x.id === c.id ? rec : x; }); else TT.push(rec);
      save(); U.closeSheet(); render(); U.toast(c ? '✓ ' + T('고쳤어요', 'Updated') : '✓ ' + T('시간표에 넣었어요', 'Added'));
    };
    if(c) $('#ttDel', s).onclick = function(){ TT = TT.filter(function(x){ return x.id !== c.id; }); save(); U.closeSheet(); render(); U.toast(T('지웠어요', 'Deleted'), true); };
  }

  /* ════════ 수업 알림 (#salm) ════════ */
  function sndName(k){ var x = SND.filter(function(s){ return s[0] === k; })[0]; return x ? (U.ko() ? x[1] : x[3]) : k; }
  var AC = null, MG = null;
  function audio(){
    try{
      if(!AC){ var C = window.AudioContext || window.webkitAudioContext; if(!C) return null; AC = new C(); MG = AC.createGain(); MG.connect(AC.destination); }
      if(AC.state === 'suspended') AC.resume();
    }catch(e){ return null; }
    return AC;
  }
  function tone(t, f, dur, type, g, f2){
    var o = AC.createOscillator(), gn = AC.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if(f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.8);
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(MG); o.start(t); o.stop(t + dur + 0.05);
  }
  function play(k, vol, vib){
    var tapped = !navigator.userActivation || navigator.userActivation.hasBeenActive;   // 한 번도 누르지 않은 창에서는 크롬이 진동을 막고 오류를 남긴다
    if(vib && navigator.vibrate && tapped){ try{ navigator.vibrate([250, 120, 250, 120, 400]); }catch(e){} }
    if(k === 'vib' || k === 'mute' || !audio()) return;
    MG.gain.value = Math.max(0, Math.min(1, (vol == null ? 70 : vol) / 100));
    var t = AC.currentTime + 0.03, i;
    if(k === 'chime'){ tone(t, 880, 1.1, 'sine', .55); tone(t + .38, 659.3, 1.5, 'sine', .55); }
    if(k === 'bell'){ for(i = 0; i < 3; i++){ tone(t + i * .7, 1318.5, 1.4, 'sine', .35); tone(t + i * .7, 2637, .7, 'sine', .12); tone(t + i * .7, 1975.5, .9, 'triangle', .08); } }
    if(k === 'marimba'){ [523.3, 659.3, 784, 1046.5, 784, 1046.5].forEach(function(f, j){ tone(t + j * .16, f, .45, 'sine', .5); tone(t + j * .16, f * 4, .08, 'sine', .08); }); }
    if(k === 'beep'){ for(i = 0; i < 4; i++) tone(t + i * .22, 1000, .12, 'square', .12); for(i = 0; i < 4; i++) tone(t + 1.1 + i * .22, 1000, .12, 'square', .12); }
    if(k === 'bird'){ [0, .18, .5, .68, 1.0].forEach(function(d){ tone(t + d, 2300, .13, 'sine', .3, 3600); }); }
  }
  /* 폰은 사용자가 한 번 누르기 전에는 소리를 못 낸다 — 알림을 켜 둔 사람은 앱을 처음 누를 때 소리 장치를 깨워 둔다 */
  document.addEventListener('pointerdown', function wake(){ if(alarmOn() && TT.length){ audio(); document.removeEventListener('pointerdown', wake, true); } }, true);

  function permLine(el){
    if(notiOK()){ el.innerHTML = '<div class="syPermLine ok">' + IC.check + '<span>' + T('알림 허용됨 — 수업 시작 전에 알림이 와요', 'Notifications allowed — you will be alerted before class') + '</span></div>'; return; }
    el.innerHTML = '<div class="syPermLine no">' + IC.bell + '<span>' + T('알림이 꺼져 있어요 — 아래 「수업 알림」을 켜면 허용할지 물어요', 'Notifications are off — turn on “Class alerts” below and we will ask') + '</span></div>';
  }
  function almRender(){
    var s = document.getElementById('almBody'); if(!s) return;
    var on = alarmOn();
    s.innerHTML = '<p class="sub" style="margin-top:0;">' + T('시간표에 넣은 수업 시작 전에 알려 드려요. 알림을 누르면 그 강의실 길안내가 바로 떠요.', 'We alert you before your classes. Tap the alert to start the route to that room.') + '</p>' +
      '<div id="aPerm"></div>' +
      '<div class="syRowS"><b>' + T('수업 알림', 'Class alerts') + '</b><span class="sySw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" id="aOn"></span></div>' +
      '<div class="syMinRow"><span class="lb">' + T('수업 시작', 'Alert') + '</span>' + numField('aM', TTA.min, LIM.min) + '<span>' + T('분 전에 알림', 'min before class') + '</span></div>' +
      '<div class="lab">' + T('소리', 'Sound') + '</div><div class="sySnd">' + SND.map(function(x){ return '<div class="it' + (TTA.snd === x[0] ? ' on' : '') + '" data-k="' + x[0] + '"><span class="rd"></span><b>' + (U.ko() ? x[1] : x[3]) + (x[2] && U.ko() ? '<small>' + x[2] + '</small>' : '') + '</b>' + (x[0] === 'mute' ? '' : '<button class="pl" type="button">' + IC.play + T('듣기', 'Play') + '</button>') + '</div>'; }).join('') + '</div>' +
      '<div class="lab">' + T('소리 크기', 'Volume') + '</div><div class="syVol">' + IC.vol + '<input type="range" min="0" max="100" value="' + TTA.vol + '" id="aV" aria-label="' + T('소리 크기', 'Volume') + '"><b id="aVt">' + TTA.vol + '</b></div>' +
      '<div class="syRowS"><b>' + T('진동도 함께', 'Vibrate too') + '</b><span class="sySw' + (TTA.vib ? ' on' : '') + '" role="switch" aria-checked="' + TTA.vib + '" id="aVib"></span></div>' +
      '<button class="big" type="button" id="aReal">' + IC.bell + T('실제 알림 받아 보기 — 10초 뒤', 'Test a real alert — in 10 s') + '</button>' +
      '<div class="syTip" style="margin-top:0.6rem;line-height:1.55;">' + T('🔔 앱이 열려 있는 동안 울려요 (다른 앱을 보고 있어도 돼요). 앱을 완전히 닫았거나 휴대폰이 오래 잠겨 있으면 늦거나 오지 않을 수 있어요.', '🔔 Alerts ring while the app is open (even in the background). If the app is closed, or the phone has been locked for a long time, alerts may be late or not come.') + '</div>' +
      '<div class="syTip" style="text-align:center;margin-top:0.5rem;">' + T('수업마다 끄거나 시간을 바꾸려면 시간표에서 그 수업을 누르세요', 'To change one class, tap it in the timetable') + '</div>';
    $('#aOn', s).onclick = function(){
      if(alarmOn()){ TTA.on = false; save(); render(); almRender(); return; }
      CONSENT.need('noti', function(){ TTA.on = true; save(); render(); almRender(); U.toast(T('수업 알림을 켰어요', 'Class alerts on'), true); }, almRender);
    };
    hookNum($('#aM', s), function(){ return TTA.min; }, function(v){ TTA.min = v; save(); render(); });
    $$('.sySnd .it', s).forEach(function(it){
      var k = it.getAttribute('data-k');
      it.onclick = function(e){
        TTA.snd = k; save(); render();
        $$('.sySnd .it', s).forEach(function(x){ x.classList.toggle('on', x === it); });
        if(e.target.closest('.pl') || k !== 'mute'){ play(k, TTA.vol, TTA.vib || k === 'vib'); if(k === 'vib' && !navigator.vibrate) U.toast(T('진동만 — 폰에서는 드르륵 울려요 (이 기기는 진동이 없어요)', 'Vibrate only — this device cannot vibrate'), true); }
      };
    });
    $('#aV', s).addEventListener('input', function(){ TTA.vol = +this.value; $('#aVt', s).textContent = TTA.vol; save(); });
    $('#aV', s).addEventListener('change', function(){ play(TTA.snd, TTA.vol, false); });
    $('#aVib', s).onclick = function(){ TTA.vib = !TTA.vib; this.classList.toggle('on', TTA.vib); this.setAttribute('aria-checked', TTA.vib); save(); };
    permLine($('#aPerm', s));
    $('#aReal', s).onclick = realTest;
  }

  /* ── 실제 알림 ── 안드로이드 크롬은 페이지에서 new Notification 을 못 쓴다 — 서비스 워커(sw.js)로 띄우고, 누르면 sw.js 가 앱으로 알려 준다 */
  function notify(c, mn){
    play(TTA.snd, TTA.vol, TTA.vib);
    if(!notiOK()) return Promise.resolve(false);
    var title = T(mn + '분 뒤 수업 — ' + c.n, 'Class in ' + mn + ' min — ' + c.n);
    var opt = {body: c.s + ' · ' + S.roomLine(c.r) + '\n' + T('누르면 바로 길안내가 떠요', 'Tap for directions'), icon: 'img/icon-192.png', badge: 'img/icon-192.png',
               tag: 'b3class-' + c.id, silent: true, data: {to: S.dno(c.r), id: c.id}};
    function page(){
      try{ var n = new Notification(title, opt); n.onclick = function(){ try{ window.focus(); }catch(e){} n.close(); fromNoti(c.r, c.id); }; return true; }catch(e){ return false; }
    }
    if(navigator.serviceWorker && navigator.serviceWorker.getRegistration){
      return navigator.serviceWorker.getRegistration().then(function(reg){
        if(reg && reg.showNotification) return reg.showNotification(title, opt).then(function(){ return true; }, function(){ return page(); });
        return page();
      }, function(){ return page(); });
    }
    return Promise.resolve(page());
  }
  function nextClass(){
    var now = nowInfo();
    for(var k = 0; k < 7; k++){
      var d = (now.d + k) % 7; if(d > 4) continue;
      var l = dayList(d).filter(function(c){ return c.al !== false && (k > 0 || mins(c.s) > now.m); });
      if(l[0]) return l[0];
    }
    return TT[0] || null;
  }
  function realTest(){
    audio();
    var c = nextClass(); if(!c){ U.toast(T('시간표에 수업을 먼저 넣어 주세요', 'Add a class to your timetable first'), true); return; }
    var mn = c.am != null ? c.am : TTA.min;
    function arm(){
      U.toast(T('10초 뒤에 실제 알림이 와요 — 다른 앱을 봐도 돼요', 'A real alert in 10 s — you can switch apps'), true);
      setTimeout(function(){ notify(c, mn).then(function(ok){ if(!ok) U.toast(CONSENT.notiFailMsg('denied'), true); }); }, 10000);
    }
    CONSENT.need('noti', function(){ render(); almRender(); arm(); }, function(){ render(); almRender(); });
  }
  /* 앱이 열려 있는 동안 20초마다 — 오늘 수업 중 알림 시각이 막 지난 것을 한 번씩 */
  function firedKey(c){ var n = new Date(); return n.getFullYear() + '-' + (n.getMonth() + 1) + '-' + n.getDate() + ':' + c.id; }
  function tick(){
    if(!alarmOn() || !TT.length) return;
    var n = new Date(), d = (n.getDay() + 6) % 7, nm = n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60;
    if(d > 4) return;
    var fired = ls(K.fired) || {}, changed = false, today = n.getFullYear() + '-' + (n.getMonth() + 1) + '-' + n.getDate();
    Object.keys(fired).forEach(function(k){ if(k.indexOf(today + ':') !== 0){ delete fired[k]; changed = true; } });   // 지난 날 기록은 지운다
    dayList(d).forEach(function(c){
      if(c.al === false) return;
      var mn = c.am != null ? c.am : TTA.min, at = mins(c.s) - mn, k = firedKey(c);
      if(fired[k] || nm < at || nm > at + 5) return;                     // 알림 시각부터 5분 안에만 (늦게 켠 앱이 지난 알림을 몰아서 울리지 않게)
      fired[k] = 1; changed = true; notify(c, mn);
    });
    if(changed) ls(K.fired, fired);
  }
  setInterval(tick, 20000); setTimeout(tick, 3000);

  /* 알림을 눌렀을 때 — 그 강의실 길안내 (sw.js 가 이 창에 알려 주거나, 앱이 닫혀 있었으면 ?to=…&tt=1 로 연다) */
  function fromNoti(code, id){
    var r = S.info(code); code = r ? r.code : code;
    var c = TT.filter(function(x){ return String(x.id) === String(id); })[0] || TT.filter(function(x){ return x.r === code; })[0];
    if(!S.floorOf(code)) return;
    U.closeSheet(); dropCard();
    var now = nowInfo();
    S.route(code, TTS.gate, c ? {mode: 'tt', cls: c, left: leftText(mins(c.s) - now.m), from: gateFrom()} : null);
  }
  if(navigator.serviceWorker && navigator.serviceWorker.addEventListener){
    navigator.serviceWorker.addEventListener('message', function(e){ var d = e.data || {}; if(d.type === 'b3class') fromNoti(d.to, d.id); });
  }

  /* ════════ 앱을 켰을 때 — 시간표대로 바로 길안내 ════════ */
  function launch(){
    var now = nowInfo(), list = now.d < 5 ? dayList(now.d) : [];
    if(!list.length) return;
    var cur = null;
    if(TTS.auto) list.some(function(c){ var s = mins(c.s); if(now.m >= s - TTS.lead && now.m <= s + TTS.after){ cur = c; return true; } return false; });
    if(cur){
      var key = firedKey(cur);
      try{ if(sessionStorage.getItem('b3nav_tt_launched') === key) return; sessionStorage.setItem('b3nav_tt_launched', key); }catch(e){}   // 같은 창에서 한 번만 (새 판으로 갈아탄 뒤 또 뜨지 않게)
      var prevC = null;
      list.forEach(function(c){ if(c !== cur && mins(c.e) <= mins(cur.s) && mins(cur.s) - mins(c.e) <= 30 && now.m >= mins(c.s)) prevC = c; });
      if(prevC && prevC.r === cur.r){ homeCard(cur, mins(cur.s) - now.m, T('앞 수업과 같은 강의실이에요', 'Same room as your last class')); return; }
      var pf = prevC ? S.floorOf(prevC.r) : null, start = (typeof pf === 'number' && pf >= 1 && pf <= 5) ? 'F' + pf : TTS.gate;
      S.route(cur.r, start, {mode: 'tt', cls: cur, left: leftText(mins(cur.s) - now.m),
        from: start === TTS.gate ? gateFrom() : T('앞 수업 ' + S.dno(prevC.r) + '호(' + pf + '층)에서 출발', 'From your last class ' + S.dno(prevC.r) + ' (' + pf + 'F)')});
      return;
    }
    var nx = list.filter(function(c){ return mins(c.s) > now.m; })[0];
    if(nx) homeCard(nx, mins(nx.s) - now.m);
  }
  function homeCard(c, inMin, note){
    dropCard();
    var phone = document.querySelector('.phone'); if(!phone) return;
    var h = Math.floor(inMin / 60), m = inMin % 60;
    var when = note || (h ? T(h + '시간 ' + (m ? m + '분 ' : '') + '뒤', 'in ' + h + ' h ' + (m ? m + ' min' : '')) : T(m + '분 뒤', 'in ' + m + ' min'));
    var img = S.photoOf(c.r);
    var card = mk('div', 'rsCard syHome',
      '<div class="rsHead">' + IC.cal + T('오늘 다음 수업', 'Next class today') + '<button class="x" type="button" aria-label="' + T('닫기', 'Close') + '">✕</button></div>' +
      '<div class="rsBody">' + (img ? '<img src="' + esc(img) + '" alt="">' : '') + '<div><b>' + esc(c.s + ' ' + c.n) + '</b><small>' + esc(S.roomLine(c.r)) + '</small><span class="pg">' + esc(when) + '</span></div></div>' +
      '<button class="big" type="button" data-a="go">' + T('바로 길안내', 'Start directions') + '</button><button class="big ghost" type="button" data-a="tt">' + T('시간표 보기', 'View timetable') + '</button>');
    phone.appendChild(card);
    $('.x', card).onclick = dropCard;
    $('[data-a=go]', card).onclick = function(){ dropCard(); S.route(c.r, TTS.gate, {mode: 'tt', cls: c, left: leftText(mins(c.s) - nowInfo().m), from: gateFrom()}); };
    $('[data-a=tt]', card).onclick = function(){ open('s1'); };
  }
  function dropCard(){ $$('.syHome').forEach(function(e){ e.remove(); }); }
  var s1 = document.getElementById('s1');
  if(s1 && window.MutationObserver) new MutationObserver(function(){ if(!s1.classList.contains('on')) dropCard(); }).observe(s1, {attributes: true, attributeFilter: ['class']});

  /* 언제 : 켜는 화면 · 처음 동의 · 쉬운 사용모드 「처음이세요?」가 끝나고, 첫 화면이고, 출입문 QR · 공유 링크로 들어온 게 아니고,
     「아까 보던 길안내」 카드(resume.js)가 뜨지 않았을 때 */
  (function wait(){
    if(!TT.length) return;
    var t0 = Date.now(), sawBoot = false, okAt = 0;
    (function t(){
      var boot = document.querySelector('.fx-boot'); if(boot) sawBoot = true;
      var bootDone = !boot && (sawBoot || document.readyState !== 'loading');
      var appOk = typeof appBooted !== 'undefined' && appBooted;
      var busy = (typeof EASY !== 'undefined' && EASY.busy && EASY.busy()) || document.querySelector('.syAgree, .ezAsk');
      var scr = document.querySelector('.screen.on');
      var entry = false;
      try{ entry = !!(typeof PWA !== 'undefined' && ((PWA.peekGate && PWA.peekGate()) || (PWA.peekShare && PWA.peekShare()))); }catch(e){}
      if(bootDone && appOk && !busy && scr){
        if(scr.id !== 's1' || entry) return;
        if(!okAt) okAt = Date.now();
        if(Date.now() - okAt > 500){ if(!document.getElementById('rsCard')) launch(); return; }   // 「아까 보던 길안내」가 먼저 뜰 틈
      }
      if(Date.now() - t0 < 180000) setTimeout(t, 80);
    })();
  })();

  /* 화면에 들어올 때 그리기 */
  ['stt', 'salm'].forEach(function(id){
    var el = document.getElementById(id); if(!el || !window.MutationObserver) return;
    new MutationObserver(function(){ if(el.classList.contains('on')){ if(id === 'stt') render(); else almRender(); } }).observe(el, {attributes: true, attributeFilter: ['class']});
  });
  /* 제목 그림 */
  $$('.icCal').forEach(function(e){ e.outerHTML = IC.cal; });
  $$('.icBell').forEach(function(e){ e.outerHTML = IC.bell; });
  $$('.icPlus').forEach(function(e){ e.outerHTML = IC.plus; });
  $$('.icShare').forEach(function(e){ e.outerHTML = IC.share; });

  return {open: open, back: back, add: function(){ classSheet(null); }, render: render, refresh: function(){ render(); almRender(); }, fromNoti: fromNoti, launch: launch, _tick: tick, _notify: notify};
})();
