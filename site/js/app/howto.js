"use strict";
/* howto.js — 이용안내를 실제 앱 화면 사진과 쉬운 설명으로 (시험판 · 2026-10-18)

   사용자 요청 : 설정 → 이용안내가 전부 글이다. 실제 우리 앱 화면 사진과 함께 더 자세하고 쉽게.
                 「즐겨찾기 & 팁」은 남기되 더 쉽고 자세하게.
   · 그림 : guide/g01~g11.jpg — 실제 앱을 폰 크기(375×812)로 찍고, 설명할 곳에 노란 번호표를 붙였다.
            그림의 번호 = 아래 설명의 번호.
   · ui.js 의 GUIDE_PAGES · guideRender 를 이 파일이 갈아 끼운다 (ui.js 는 건드리지 않는다 —
     실제 앱 index.html 은 이 파일을 읽지 않으므로 지금 쓰는 앱은 그대로다).
   · 그림을 누르면 zoom.js 의 openZoom 으로 크게 본다. */
var HOWTO = [
  { t:['처음 화면', 'First screen'], img:'g01_first',
    lead:['앱을 켜면 제일 먼저 보이는 화면이에요.', 'This is the first screen you see.'],
    items:[
      ['쉬운 사용모드', '누를 곳을 노란 테두리와 손가락으로 하나씩 알려 줘요. 처음이라면 켜 두세요. 한 번 더 누르면 꺼져요.',
       'Easy mode', 'Shows you what to tap, one step at a time, with a yellow frame and a finger. Tap again to turn it off.'],
      ['시작하기', 'QR 없이 바로 시작해요. 이때는 1층에서 출발한다고 보고 안내해요. 나중에 3D 화면의 「현재 위치」에서 바꿀 수 있어요.',
       'Start', 'Start without a QR. The route starts from the 1st floor; you can change it later under "Start floor".'],
      ['출입문 QR 스캔하고 시작', '건물 문(정문·후문·동문·서문)에 붙은 QR을 카메라로 찍어요. 내가 어느 문 앞에 있는지 앱이 알아서, 그 자리부터 길을 알려 줘요. 폰 기본 카메라로 찍어도 돼요.',
       'Scan door QR to start', 'Scan the QR on a building door. The app knows which door you are at and guides you from there. Your phone camera works too.'],
      ['위쪽 동그라미 네 개', '🟢 인터넷 상태(초록이면 연결됨) · 🏠 처음 화면으로 · ⭐ 즐겨찾기 · ⚙️ 설정',
       'Four circles at the top', '🟢 internet status · 🏠 back to start · ⭐ favorites · ⚙️ settings']
    ] },
  { t:['쉬운 사용모드', 'Easy mode'], img:'g02_easy',
    lead:['켜 두면 화면마다 「여기를 누르세요」 하고 알려 줘요.', 'When it is on, every screen tells you where to tap.'],
    items:[
      ['말풍선', '지금 할 일을 한 문장으로 알려 줘요. 오른쪽 ✕를 누르면 쉬운 사용모드가 꺼져요.',
       'Speech bubble', 'Tells you what to do now in one sentence. Tap ✕ to turn easy mode off.'],
      ['노란 테두리와 손가락', '여기를 누르면 돼요. 손가락이 톡톡 움직이며 가리켜요. 다른 버튼도 그대로 누를 수 있어요.',
       'Yellow frame and finger', 'Tap here. The finger taps to show you. Other buttons still work as usual.']
    ],
    tip:['켜고 끄는 곳 : 처음 화면의 노란 「쉬운 사용모드」 버튼, 또는 ⚙️ 설정 → 쉬운 사용모드. 앱을 처음 열 때 「처음이세요?」라고 물으면 「네, 알려 주세요」를 눌러도 켜져요.',
         'Turn it on or off with the yellow button on the first screen, or ⚙️ Settings → Easy mode. You can also say "Yes" when the app asks "First time here?".'] },
  { t:['QR을 찍으면 — 여기가 맞나요?', 'After scanning — is this the place?'], img:'g03_qrok',
    lead:['QR을 찍으면 그 문이 맞는지 사진으로 한 번 확인해요.', 'After scanning, check the photo of the door once.'],
    items:[
      ['문 이름', '찍은 QR이 붙어 있던 문이에요. (예 : 정문)', 'Door name', 'The door where the QR was. (e.g. Main gate)'],
      ['그 문 사진', '지금 눈앞에 보이는 모습과 비교해 보세요.', 'Photo of the door', 'Compare it with what you see now.'],
      ['네, 여기예요', '사진과 같으면 눌러요. 다음 화면으로 넘어가요.', "Yes, I'm here", 'Tap if it matches. You go to the next screen.'],
      ['아니요, 다시 스캔할게요', '사진과 다르면 눌러서 QR을 다시 찍어요.', 'No, scan again', 'Tap if it does not match, and scan the QR again.']
    ] },
  { t:['무엇을 찾으세요?', 'What are you looking for?'], img:'g04_cat',
    lead:['가고 싶은 곳의 종류를 골라요.', 'Choose what kind of place you want.'],
    items:[
      ['강의실', '강의실 번호, 교수님 성함, 학과 사무실 이름으로 찾아요.', 'Classroom', 'Search by room number, professor name, or office name.'],
      ['화장실', '지금 있는 곳에서 가장 가까운 화장실로 바로 안내해요.', 'Restroom', 'Takes you to the nearest restroom.'],
      ['크리에이티브 존', '지하 1층의 자유 열람 공간이에요.', 'Creative Zone', 'The open study space on B1.'],
      ['비상계단', '가장 가까운 비상계단으로 안내해요.', 'Emergency stairs', 'Takes you to the nearest emergency stairs.']
    ] },
  { t:['강의실 찾기', 'Find a room'], img:'g05_search',
    lead:['찾을 곳을 써 넣으면 바로 아래에 나와요.', 'Type what you are looking for; results appear below.'],
    items:[
      ['검색 칸', '시간표에 적힌 강의실 번호(예 : 13101)를 그대로 써요. 교수님 성함이나 학과 사무실 이름으로 써도 돼요. 조금 틀려도 비슷한 것이 함께 나와요.',
       'Search box', 'Type the room number from your timetable (e.g. 13101), a professor name, or an office name. Similar results show up even with a small typo.'],
      ['찾은 곳', '나온 줄을 누르면 그곳이 3D 건물에 보여요. 오른쪽 「1층 13101」은 그 방이 있는 층과 번호예요.',
       'Result', 'Tap it to see the place in the 3D building. "1F 13101" on the right is the floor and number.']
    ],
    tip:['검색 칸을 비우고 누르면 최근에 찾은 곳이 나와요.', 'Tap the empty search box to see places you searched recently.'] },
  { t:['3D 건물 보기', '3D building'], img:'g06_3d',
    lead:['찾은 곳이 건물 어디에 있는지 3D로 보여 줘요.', 'Shows where the place is in the building, in 3D.'],
    items:[
      ['색깔 뜻', '빨강 = 가는 곳 · 노랑 = 가야 할 층 · 하늘색 = 지금 있는 층 · 주황 = 엘리베이터 · 초록 = 계단',
       'Colors', 'Red = destination · yellow = floor to go · light blue = current floor · orange = elevator · green = stairs'],
      ['☆ 별', '누르면 ★로 바뀌며 즐겨찾기에 저장돼요.', '☆ Star', 'Tap to save it to favorites.'],
      ['⛶ 크게 보기', '3D를 화면 가득 크게 봐요. 왼쪽 위 ←로 돌아와요.', '⛶ Full screen', 'See the 3D full screen. Tap ← to come back.'],
      ['경로 미리보기 · 직접 걸어보기', '▶ 경로 미리보기 : 걷는 눈높이로 가는 길을 자동으로 보여 줘요.  🚶 직접 걸어보기 : 바닥을 눌러 직접 걸어 다녀 볼 수 있어요.',
       'Route preview · Walk it yourself', '▶ Preview shows the route at eye level. 🚶 Walk lets you tap the floor and walk around.'],
      ['층 상세', '층 번호를 누르면 그 층 지도를 크게 봐요.', 'Floor detail', 'Tap a floor to see its map.'],
      ['현재 위치', '내가 지금 있는 층이에요. QR을 찍었으면 저절로 맞춰져 있어요. 다르면 눌러서 바꿔요.',
       'Start floor', 'The floor you are on now. Set automatically after a QR scan; tap to change.'],
      ['길안내 시작', '누르면 한 단계씩 사진으로 길을 알려 줘요.', 'Start navigation', 'Guides you step by step with photos.']
    ],
    tip:['손가락 1개로 밀면 건물이 돌아가고, 2개로 벌리거나 모으면 커지고 작아져요.', 'Drag with one finger to turn; pinch with two fingers to zoom.'] },
  { t:['층 상세', 'Floor detail'], img:'g07_floor',
    lead:['한 층을 위에서 내려다본 지도예요.', 'A map of one floor, seen from above.'],
    items:[
      ['층 지도', '빨간 칸이 가는 곳, 빨간 선이 가는 길이에요. 손가락으로 밀어 옮기고, 두 손가락으로 크게 볼 수 있어요.',
       'Floor map', 'The red room is the destination and the red line is the way. Drag to move, pinch to zoom.'],
      ['색깔 뜻', '엘리베이터 · 중앙계단 · 출입문 · 비상계단 · 휴지통이 어디 있는지 색으로 보여 줘요.',
       'Colors', 'Shows the elevator, stairs, doors, emergency stairs and trash bins by color.'],
      ['길안내 시작', '여기서 바로 길안내를 시작할 수 있어요.', 'Start navigation', 'You can start navigation right here.']
    ] },
  { t:['길안내 따라가기', 'Following the steps'], img:'g08_step',
    lead:['한 단계씩, 사진을 보면서 따라가요.', 'Follow one step at a time, looking at the photo.'],
    items:[
      ['진행 표시', '지금 몇 번째 단계인지 보여 줘요. (예 : 1 / 3 단계)', 'Progress', 'Shows which step you are on. (e.g. 1 / 3)'],
      ['화살표', '어느 쪽으로 가야 하는지 보여 줘요.', 'Arrow', 'Shows which way to go.'],
      ['할 일', '지금 해야 할 일을 한 문장으로 알려 줘요.', 'What to do', 'Tells you what to do now.'],
      ['실제 사진', '그 자리에서 찍은 사진이에요. 눈앞 모습과 같은지 비교하며 걸어요. 사진 위에 「1/2 · 눌러서 다음」이 보이면 사진을 눌러 다음 사진을 볼 수 있어요.',
       'Real photo', 'A photo taken at that spot. Compare it with what you see. If it shows "1/2 · tap for next", tap the photo for the next one.'],
      ['다음', '사진 속 자리에 오면 눌러요. 마지막 단계에서는 「도착했어요」로 바뀌어요. 왼쪽 버튼은 앞 단계로 돌아가요.',
       'Next', 'Tap when you reach the spot in the photo. On the last step it says "Arrived". The left button goes back.']
    ] },
  { t:['도착', 'Arrived'], img:'g09_arrive',
    lead:['다 왔어요!', 'You made it!'],
    items:[
      ['도착한 곳', '도착한 방 이름이에요.', 'Destination', 'The name of the room you reached.'],
      ['도착 사진', '문 앞 모습이에요. 눈앞과 같은지 확인해 보세요.', 'Arrival photo', 'The door of the room. Check that it matches.'],
      ['다른 장소 찾기', '다른 곳으로 또 가고 싶으면 눌러요. 「무엇을 찾으세요?」로 바로 가요.', 'Find another place', 'Go somewhere else. Opens "What are you looking for?".'],
      ['처음으로 돌아가기', '처음 화면으로 돌아가요.', 'Back to start', 'Returns to the first screen.']
    ] },
  { t:['즐겨찾기 & 팁', 'Favorites & Tips'],
    secs:[
      { h:['⭐ 즐겨찾기 — 자주 가는 곳 저장하기', '⭐ Favorites — save places you visit often'], img:'g10_fav',
        pre:['3D 건물 화면 오른쪽 위 ☆을 누르면 ★로 바뀌며 저장돼요.', 'Tap ☆ at the top right of the 3D screen to save a place.'],
        items:[
          ['⭐ 버튼', '화면 맨 위 ⭐을 누르면 저장한 곳 목록이 나와요.', '⭐ button', 'Tap ⭐ at the top to see your saved places.'],
          ['저장한 곳', '「열기 →」를 누르면 바로 그곳 3D가 나와요. ✕를 누르면 목록에서 지워요.', 'Saved place', 'Tap "Open →" to see it in 3D. Tap ✕ to remove it.']
        ],
        tip:['학기 초에 이번 학기 강의실을 미리 저장해 두면 다음부터 검색하지 않고 바로 갈 수 있어요.', 'Save this semester\'s rooms early and skip searching next time.'] },
      { h:['⚙️ 설정에서 할 수 있는 것', '⚙️ What you can do in Settings'], img:'g11_settings',
        items:[
          ['언어', '「한글」 / 「English」를 누르면 앱 전체 말이 바로 바뀌어요.', 'Language', 'Tap 한글 / English to switch the whole app.'],
          ['쉬운 사용모드', '여기서도 켜고 끌 수 있어요.', 'Easy mode', 'Turn it on or off here too.'],
          ['이용안내', '지금 보고 있는 이 안내예요.', 'User guide', 'This guide.'],
          ['건의함', '앱 사진이 실제 모습과 다르면 지금 모습을 찍어서 보내 주세요. 확인한 뒤 고쳐서 다음에 오는 사람에게도 도움이 돼요.',
           'Suggestion box', 'If a photo looks different from reality, send a new photo. It helps the next visitors.'],
          ['앱 다운로드', '폰 홈 화면에 앱처럼 깔 수 있어요. 삼성(안드로이드)은 버튼 한 번, 아이폰은 그림으로 방법을 알려 줘요.',
           'Install app', 'Add the app to your home screen. One tap on Android; picture steps on iPhone.']
        ] }
    ],
    tip:['💡 더 알아 두면 좋아요<br>· 지하 1층(B1)에는 크리에이티브 존이 있어요. 3D 화면 「층 상세」에서 B1을 누르면 엘리베이터·계단·나가는 문 위치가 보여요.<br>' +
         '· 검색이 안 되면 숫자를 다시 확인해 보세요.<br>· 방향이 헷갈리면 사진과 눈앞 모습을 나란히 비교해 보세요.<br>· 불편한 점은 언제든 건의함으로 알려 주세요.',
         '💡 Good to know<br>· The Creative Zone is on B1. Tap B1 under "Floor" in the 3D screen to see the elevator, stairs and exit.<br>' +
         '· If search finds nothing, check the numbers.<br>· If the direction is confusing, compare the photo with what you see.<br>· Tell us anything inconvenient via the Suggestion Box.'] }
];

/* ui.js 의 이용안내를 갈아 끼운다 — 쪽 수(진행 점)는 GUIDE_PAGES 길이로 센다 */
GUIDE_PAGES = HOWTO.map(function(){ return {}; });
guideRender = function(idx){
  if(typeof idx === 'number') guideIdx = Math.max(0, Math.min(HOWTO.length - 1, idx));
  var en = (typeof LANG !== 'undefined' && LANG === 'en'), L = en ? 1 : 0;
  var p = HOWTO[guideIdx];
  var tEl = document.getElementById('gTitle'), bEl = document.getElementById('gBody');
  if(!tEl || !bEl) return;
  if(bEl.tagName === 'P'){                                       // 그림·목록을 담으려고 <p> 를 <div> 로
    var nd = document.createElement('div'); nd.id = 'gBody'; nd.className = 'hwBody'; bEl.parentNode.replaceChild(nd, bEl); bEl = nd;
  }
  function esc(s){ return String(s).replace(/'/g, "\\'"); }
  function shot(img, cap){
    var src = 'guide/' + img + '.jpg';
    return '<figure class="hwShot" onclick="openZoom(\'' + src + '\',\'' + esc(cap) + '\')"><img src="' + src + '" alt="" loading="lazy">' +
           '<figcaption>' + (en ? '🔍 Tap to enlarge' : '🔍 그림을 누르면 크게 보여요') + '</figcaption></figure>';
  }
  function list(items){
    return '<ol class="hwList">' + items.map(function(it, i){
      return '<li><i>' + (i + 1) + '</i><div><b>' + it[en ? 2 : 0] + '</b><span>' + it[en ? 3 : 1] + '</span></div></li>';
    }).join('') + '</ol>';
  }
  var h = '';
  if(p.lead) h += '<div class="hwLead">' + p.lead[L] + '</div>';
  if(p.img) h += shot(p.img, p.t[L]) + list(p.items);
  (p.secs || []).forEach(function(s){
    h += '<h5 class="hwHead">' + s.h[L] + '</h5>';
    if(s.pre) h += '<div class="hwLead">' + s.pre[L] + '</div>';
    h += shot(s.img, s.h[L]) + list(s.items);
    if(s.tip) h += '<div class="hwTip">💡 ' + s.tip[L] + '</div>';
  });
  if(p.tip) h += '<div class="hwTip">' + (p.tip[L].indexOf('💡') === 0 ? '' : '💡 ') + p.tip[L] + '</div>';
  tEl.innerHTML = '📖 ' + p.t[L] + ' <small>(' + (guideIdx + 1) + '/' + HOWTO.length + ')</small>';
  bEl.innerHTML = h;
  var sc = document.getElementById('gScroll'); if(sc) sc.scrollTop = 0;
  var pv = document.getElementById('gPv'), nx = document.getElementById('gNx');
  if(pv) pv.style.visibility = (guideIdx === 0) ? 'hidden' : 'visible';
  if(nx){
    if(guideIdx === HOWTO.length - 1){ nx.innerHTML = en ? 'Close' : '닫기'; nx.onclick = function(){ go('sset'); }; }
    else { nx.innerHTML = en ? 'Next ›' : '다음 ›'; nx.onclick = function(){ guideNext(); }; }
  }
  guideRenderProg();
};
