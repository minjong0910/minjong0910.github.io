# 공대 3호관 길안내 앱 — 기능 일괄 적용 도구

완성된 원본 HTML(3D·경로안내)에 지금까지 만든 기능을 한 번에 넣는다.

    python3 apply_all.py  완성본.html  결과.html

순서대로 적용되는 것
  1. QR 위치판별 (출입문 4곳, 오프라인 동작, 카메라 권한 처리)
  2. 건의함 사진 판별 AI (품질검사 + MobileNetV2 위치판별, 밝기 정규화)
  3. AI 자동 학습 · 사진 일괄 자동분류 · 새 장소 묶기 · 메모 힌트
  4. 접수 범위 제한 (지하 1층~5층 + 출입문, 옥상 제외)
  5. 관리자 화면 '사진만 보면 어디쯤인지' 추정 표시
  6. 관리자 화면 스크롤 수정
  7. 서버(Firestore) 연동 — 제보 공유·승인 사진 배포·관리자 로그인
  8. 관리자 로그인 숫자 7자리
  9. 폰 렉 제거 — 3D 렌더 루프를 보이는 화면에서만, 백그라운드 정지, 시작 시 16MB 복사 제거
 10. AI 정확도 개선 — 기준벡터 3시점 + 제곱근 정규화 + 제보사진 2시점 + 메모 층 힌트
     (실측 top-1 74.6% → 90.7%. 기준벡터 파일은 aivec_v52.json 을 쓴다)

 11. 번호판 OCR — 사진 속 호실 번호(13512 등)를 읽어 방·층을 확정, 층 선택 버튼, 메모 힌트 전달 버그 수정
     (OCR 파일은 서버의 lib/tess/ 폴더에 있어야 한다 — b3nav_OCR_추가파일.zip)

 12. 관리자 건의함에서 제보 사진 크게 보기 — 썸네일을 누르면 전체화면, 두 손가락·휠 확대, 끌어서 이동

 13. AI 사진 파악 자료집 — 관리자가 위치별로 사진을 모아 두면 AI가 그것까지 기준으로 삼는다 (IndexedDB 저장)
     · 파일 이름으로 위치 자동 분류(phCodeOf + SUGAI.noteCode) · 끌어다 놓기 · 층별 정리

 14. 기본 자료집 배포 (patch_ailib.py) — 자료집을 index.html 안(<script id="EMBEDDED_AILIB">)에 담아
     모든 기기의 AI가 함께 쓴다. 관리자는 컴퓨터에서 넣고 뺀 뒤 「자료집을 담은 index.html 내려받기」 → GitHub 덮어쓰기.
     폴더 이름·'1층-HALL1L-복도-왼쪽'·'3층-화장실'·'1층-정문 외관' 같은 이름도 알아본다. 앱이 모르는 번호판 오독(13297 등)은 층 힌트로만.

 15. 기본 자료집 데이터 삽입 (embed_ailib.py + ailib_v56.json) — 2026-09-15 사용자가 찍은 239장(위치 123곳, 1.97MB)

검증 : v41 원본에 돌리면 v56 배포본과 바이트 단위로 동일하게 나온다.

## 원본에서 건드리면 안 되는 곳 (앵커)
3D 모델·경로 안내·층 구조는 마음껏 고쳐도 된다. 아래 부분만 구조를 크게 바꾸지 않으면
자동으로 적용된다. 바꿨더라도 앵커만 다시 맞추면 되니 걱정할 필요는 없다.

  · var SCREENS=[ ... 'spwgate','phsort'];      화면 목록
  · #s1 의 「시작하기」 버튼 한 줄               첫 화면
  · <!-- 즐겨찾기 -->  주석                       QR 화면이 이 앞에 들어감
  · go() 안의  if(id==='s2'){ mountBld3D(); ... } 카메라 정리·AI 예열 훅
  · openTarget() 의  startFloor = 1;              QR 출발층 연동
  · #ssug 의 「건의함에 올리기」 버튼 + sugStat    AI 결과 카드
  · sugSubmit / sugAdminRender / sugApprove       건의함 로직
  · phShrink / phShrinkImg                         사진 읽기 (PHFIX가 통째로 교체)
  · #phsort 화면 · phSortRender · phSortCommit    사진 등록 AI 도우미
  · #sph 의 <div class="list" id="phList">         학습 현황
  · phExport                                       학습 내용 내보내기
  · function animate(){ requestAnimationFrame(animate);   목적지 3D 루프 (v51이 게이트를 씌움)
  · animate() 끝의  renderer.render(scene,camera); }     그 다음 줄 주석 '건물 전체 뷰에서…' 포함
  · go() 안의  if(id==='s4') resize3D(); / updateFavBtn();  루프 켜기/끄기 훅
  · mountBld3D() 의  fr.onload = function(){ ... }         iframe 렌더 정지 훅
  · bld3DEnter() 함수 전체 · setTimeout(mountBld3D, 1200)
  · /* ========== 시작 ========== */  주석                백그라운드 정지 코드 삽입 지점
  · .screen.on{opacity:1;visibility:visible;transform:none;}  CSS
  · var PRISTINE_HTML = ...  한 줄
  · SUGDB.loadPhotos() 앞부분 (patch_db.py가 넣은 코드 — 원본과 무관)
  · CSS 끝의  @media (max-width:360px){ .big{...} }  와  #sadmin .sugEmpty{...}
  · </body>                                        모듈 삽입 지점

## 사진이 바뀌었으면
EMBEDDED_PHOTOS(앱 내장 사진)가 달라졌으면 AI 기준벡터(aivec_v52.json)를 다시 계산해야 한다.
사진이 그대로면 aivec_v52.json 을 그대로 쓴다. 다시 만들 때는 lab/ 에서 순서대로:

    node run4.js 050          # 사진마다 8시점 + 질의변형 임베딩 계산 (40분쯤)
    node score4.js 050        # 시점 조합별 정확도 비교
    node thresh.js            # 임계값(RELEVANT/MATCH/MARGIN/SAME/GROUP_TH) 실측
    node mkvec.js 0,2,3 aivec_v52.json    # 고른 시점으로 기준벡터 파일 생성

  · 시점 0=원본, 2=가운데0.82, 3=가운데0.65 (현재 채택). 제곱근 정규화가 이미 적용되어 저장된다.
  · 임계값이 달라지면 patch_ai3.py 의 '임계값' 부분도 같이 고쳐야 한다.
  · lab/photos.json 은 앱의 EMBEDDED_PHOTOS 를 그대로 뽑아 놓은 것이다 (사진이 바뀌면 이것부터 갱신).
  · 검증 : node t52.js v52 45  (실제 앱 코드로 정확도 측정) / node t52b.js (세부 동작)

## 번호판 OCR (v53)
· 서버에 `lib/tess/` 폴더(tesseract.min.js · worker.min.js · tesseract-core-simd-lstm.wasm.js · tesseract-core-lstm.wasm.js · eng.traineddata.gz, 약 10MB)가
  있어야 같은 서버에서 받는다. 없으면 공개 CDN(jsdelivr·projectnaptha)에서 받고, 그것도 안 되면 OCR 없이 판정한다.
· 파일로 직접 열면(개발 모드) OCR은 꺼진다.
· 판정 : 사진 전체(흩어진 글자 모드) → 확신 없으면 전체(한 덩어리 모드) + 4조각 2배 확대. 숫자만 읽는다.
· 앵커 : 제보 화면의 「건의함에 올리기」 버튼 줄, sugSubmit 의 noteEl/noteVal 두 줄, sugFinishSubmit 호출,
  SUGAI 의 '/* ── 시점(v52)' 주석, judge 의 ensure().then 블록, applyHint 머리, showCard 의 선명도 줄, adminBadge 의 QR 줄

## 사진 크게 보기 (v54)
· 앵커 : `#sadmin .sugThumb{...}` CSS 한 줄, sugAdminRender 의 `<img ... class="sugThumb">` 줄, 파일 끝의 `</script></body></html>`
· 앱이 user-scalable=no 라서 브라우저 기본 확대가 막혀 있다 → 두 손가락 확대·두 번 탭·끌기를 직접 구현했다(transform 하나로 처리).
· openZoom(사진주소, 설명) 은 다른 화면에서도 그대로 부를 수 있다.

## AI 사진 파악 자료집 (v55)
· 저장 : IndexedDB `b3nav_ai` / 스토어 `lib`, 레코드 {id, code, n, ts, thumb, vecs[3]}  (localStorage는 5MB라 수백 장을 못 담는다)
· 사진 1장당 3시점(원본·가운데0.82·가운데0.65) 벡터 — 앱 내장 기준벡터와 같은 방식이라 그대로 후보로 섞인다
· `SUGAI.rebuildRef()` 가 기준목록을 [내장 + 학습분 + 자료집] 으로 다시 조립한다. 자료집이 바뀔 때마다 호출된다.
· judge/classify 는 `libEnsure()` 를 먼저 기다린다. IndexedDB를 못 쓰면 빈 자료집으로 조용히 넘어간다.
· 앵커 : SCREENS 배열, go() 의 phsort 훅 줄, `#sph .aiLearn{...}` CSS, #sph 의 '전체 사진 관리' 버튼 묶음,
  `<section class="screen" id="sph">`, SUGAI 의 '분류 : 등록용' 주석, judge 의 ocrP 줄, classify 머리, 노출 객체, v54 뷰어 주석
· 파일 이름 자동 분류 : `aidCodeFromName()` = phCodeOf(13501·EV3·HALL5L·BLD·B1·KTC) → SUGAI.noteCode('5층 좌측 복도'·'정문'·'지하')
  넣기 전 대기 목록(AID_STAGE)에서 하나씩 고칠 수 있다. ZIP도 phCollect로 그대로 풀린다.
· 각도 : `aidViewFromName()` — 이름 끝의 (왼쪽)(오른쪽) 괄호, 없으면 끝의 방향 낱말. 12자 초과·숫자만(윈도우의 '(1)')은 무시.
  코드는 그대로 두고 각도만 레코드의 v 필드에 따로 저장한다 (같은 위치의 여러 각도 = AI 정확도 향상).
  정규식 대신 문자열 처리로 작성 — 패치 스크립트를 거치며 백슬래시가 여러 겹 이스케이프되는 사고를 피하려는 것.
· 효과 측정 : `node lab/holdout.js` — 같은 곳을 다른 각도로 찍었을 때(그 각도 사진이 자료에 없을 때) 정확도

## 기본 자료집 배포 (v56)
· 파일 : `<script id="EMBEDDED_AILIB" type="application/json">{"ver":1,"n":239,"items":[{code,n,v,ts,thumb,vecs[3]}]}` — EMBEDDED_AIVEC 바로 앞
· 읽기 : `SUGAI.libEmbedded()` 가 항목마다 id 'e1','e2'… 와 emb:true 를 붙여 메모리에 올린다.
  `libEnsure()` = [기본(숨긴 것 제외) + IndexedDB(기기)] — 같은 사진(libKey = code|vecs[0] 앞 48자)이 양쪽에 있으면 기본만 남기고 기기 쪽은 지운다
  (내려받은 index.html 을 같은 컴퓨터에서 다시 열었을 때 중복이 안 생기게).
· 빼기 : 기본 사진은 localStorage `b3nav_ailib_hidden` 에 키만 적어 그 기기에서 숨긴다(`libUnhideAll()` 로 복구). 기기 사진은 IndexedDB 에서 지운다.
· 내려받기 : `aidExportHtml()` = phPristine()(파일 원본) 에서 EMBEDDED_AILIB 태그만 `SUGAI.libExport()` 로 바꿔 끼워 `index.html` 로 내려받는다.
  EMBEDDED_PHOTOS·AILEARN·AIVEC·3D 는 그대로. 파일 이름이 index.html 이라 GitHub 에 그대로 덮어쓰면 된다.
· 다시 만들기 : 사진 ZIP 을 앱의 자료집 화면에 넣고 내려받기 버튼을 누르면 끝. 자동화가 필요하면 lab 의 gen56.js 참고
  (앱 파이프라인 aidTake→aidCommit→libAdd 를 headless 크롬으로 돌려 SUGAI.libExport() 를 ailib_v56.json 으로 저장).
· 앵커 : EMBEDDED_AIVEC 태그, libEnsure/libDel/libDelCode/libClear/libStats 함수 전체, 노출 객체의 libAll 줄, codeLabel 의 EV 줄,
  aidStatRender 의 시크릿 분기와 innerHTML 조립, cardHtml 의 thumbs, aidZoom 머리, `.aidThumbs .x` CSS, aidClearAll 전체,
  #saidat 의 aidList~mini 블록, aidWhat 의 마지막 두 줄, 끌어놓기 안내 'ZIP도 그대로 됩니다.<br>', aidCodeFromName 전체, AID_VIEW_WORDS,
  aidTake 의 found/code/view 세 줄, applyOcr 의 `if(!corridor && ocr.code && SCOPE.allow(ocr.code)){` 줄
· 측정 (사용자 239장을 자르기·이동·밝기 변형) : v55 26.8% → v56 99.2% (3위 안 100%, 층 오류 0).
  단 그 사진 자체를 뺀 hold-out(처음 보는 각도)은 28.9% — 문 사진은 번호판을 읽어야 구분되는데 비스듬한 사진은 OCR 이 37%만 읽는다.
  좌우 뒤집기 벡터 추가(실험)는 효과 없음(27.6%) — 채택 안 함.

## 번호판 읽기 강화 (v57, patch_ocr2.py)
· 제보 사진을 OCR용으로만 2400px 사본으로 따로 만든다 — `PHFIX.shrink(blob, cb, maxdim, quality)` 에 인자 2개 추가,
  `SUGAI.judge(dataUrl, cb, note, ocrUrl)` 의 4번째 인자로 넘긴다 (없으면 예전처럼 저장본으로 읽는다)
· `plateBoxes(img)` : 512px 축소본에서 '진한 파랑'(b-r>35, b-g>20, 55<b<240, 채도>38) 덩어리를 연결요소로 찾아
  크기·채움율(0.35)·가로세로비(0.25~4)·면적(≤10%)으로 거른 뒤 큰 것 3개. 표지판 검출률 28/29.
· `plateCrop` : 덩어리 둘레를 위 0.95·아래 0.30·좌우 0.40 만큼 넓혀 원본 해상도에서 잘라 확대(높이 420 목표, 최대 8배)
· `ocrPrep(cv, inv)` : 흑백 + 2~98 백분위 대비 스트레치, inv 면 반전 (표지판이 흰 글씨/검은 글씨 두 종류)
· `ocrRun` : 번호판 후보 → (아는 호실 + 확신 55 이상이면 즉시 종료) → 실패 시 예전 방식(전체 psm11 + 4조각 psm6)
· `ocrParse` : 아는 호실을 우선 고르되(×1.35) **보고되는 확신도는 부풀리지 않는다** — 부풀리면 오독까지 믿게 된다
· 측정(같은 사진 68장) : 읽음 35.3%→47.1%, 방 정답 25.0%→33.8%, 층 36.8%→48.5%, 장당 8.3s→6.1s
· 더 해봤지만 효과 없던 것 : 번호 띠만 자르기(크게 나빠짐), 확대 배율 h700/h1100/h1600, 회전 ±8/±16, psm6 혼합 (모두 ±1장)

## 사람이 고르는 안전망 (v57, patch_pick.py)
· 화면 `#spick` (SCREENS 끝에 추가). `pickOpen(url, note, ai, after)` → `after(code, ai2)` 로 결과를 돌려준다.
· `sugSure(ai)` 가 참일 때만 바로 접수 : sim≥0.82 && margin≥0.04 && codeSource!=='ocr'.
  **번호판만으로는 확정하지 않는다** — 68장 중 오독 9건, 그중 4건이 실재하는 다른 호실이라 확신도로 못 거른다.
· 고른 답은 `SUGAI.learn(code, url)` 으로 즉시 학습 → 같은 사진 재판정 시 0.99대로 확정된다 (쓸수록 물어보는 횟수가 준다)
· `pickPlaces(floor)` = VALID_FULL5 + ROOM_PHOTOS + EV/HALL/WC + B1/BLD/KTC 중 SCOPE.allow 이고 aidFloorOf 가 그 층인 것
· `pickSub(code)` : ROOM_NAME → 없으면 자료집 레코드 파일명('3층-13312-전자공학과 유상선 교수-왼쪽.jpg')에서 이름을 뽑는다
· `pickSearch()` : 번호·이름 검색(층 무관, 최대 60개). 결과 화면의 '위치 바꾸기'는 `sugFixPlace()` → 큐 레코드의 ai 를 갈아끼운다.
· 앵커 : `<!-- 사진 등록 -->` 앞, SCREENS 배열 끝, `.aidThumbs .t.mine` CSS, `function aidClearAll(){`,
  sugSubmit 의 ai2Cb 블록, '건의함에 올리기' 버튼 줄, `SUGAI.showCard(ai);` + stat 초록색 줄, `function sugSubmit(){`, 초기화 블록

## 건물 3D(2번 화면) 파일을 바꿨을 때
v51의 iframe 정지는 iframe 안 코드를 건드리지 않고 부모 쪽에서 requestAnimationFrame을 감싸는 방식이라,
3D 파일(B3D_SRC)을 통째로 바꿔도 그대로 동작한다. 단 폰에서 해상도 배율을 낮추는 건
iframe 전역에 `renderer` 와 `resize()` 가 있을 때만 적용된다(없으면 그냥 건너뜀).

## QR 스티커
make_qr.py 로 다시 만들 수 있다. QR 원문(B3NAV1:BLD:MAIN/BACK/EAST/WEST)은 앱과 같아야 한다.
