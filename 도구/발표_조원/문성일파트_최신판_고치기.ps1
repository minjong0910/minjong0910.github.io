# 문성일 조원 파트(12~17쪽)를 최신 앱(2026-10-28 판)에 맞춘다 — 사용자 : 「다른 세 군데만 바꿔 달라」 (2026-10-29)
#   ① 길안내 · 도착 화면 그림을 새 화면(인스타 + 공항)으로 : 12쪽 ⑤ · ⑥, 16쪽 ⑤ — 본 서버를 아이폰 크기(DPR 3)로 정문 → 13310호를 찍은 것
#      13쪽 ④ 「사진 따라가기」 설명 네 줄도 새 화면에 맞게(공항 안내판 · 화면 가득 · 누른 곳 2배 · 좌우로 밀기)
#   ② NFC 는 아직 안 붙였다(구매 승인 대기) — 지금 되는 것처럼 읽히는 곳만 고친다
#   ③ 15쪽 파일 249개 → 257개 · 17.1MB (2026-11-03 다시 셈 — 처음엔 251개)
#   ④ 14쪽 이용안내 11쪽 → 15쪽 (2026-11-03 사용자 「발표 자료 최신화」)
#   그 밖의 글 · 그림 · 순서는 한 글자도 안 바꾼다. 원본은 같은 폴더의 문성일_12-17쪽_원본.pptx
param([string]$File = (Join-Path $PSScriptRoot '문성일_12-17쪽.pptx'), [string]$Shots = '')
$ErrorActionPreference = 'Stop'
if(-not $Shots){ $Shots = Join-Path $PSScriptRoot '새화면' }
$app = New-Object -ComObject PowerPoint.Application
$p = $app.Presentations.Open($File, 0, 0, 0)
function Swap($k, $name, $img){
  $s = $p.Slides.Item($k); $o = $s.Shapes.Item($name)
  $n = $s.Shapes.AddPicture($img, 0, -1, $o.Left, $o.Top, $o.Width, $o.Height)
  try{ if($o.AutoShapeType -ne 1){ $n.AutoShapeType = $o.AutoShapeType; for($a = 1; $a -le $o.Adjustments.Count; $a++){ $n.Adjustments.Item($a) = $o.Adjustments.Item($a) } } }catch{}
  $n.Line.Visible = $o.Line.Visible
  $z = $o.ZOrderPosition; while($n.ZOrderPosition -gt $z + 1){ $n.ZOrder(3) }
  $o.Delete(); $n.Name = $name
  ('{0}쪽 「{1}」 그림 바꿈' -f $k, $name)
}
function Rep($k, $name, $from, $to){
  $s = $p.Slides.Item($k); $tr = $s.Shapes.Item($name).TextFrame.TextRange
  if($tr.Text.IndexOf($from) -lt 0){ throw ('{0}쪽 「{1}」에 「{2}」 없음' -f $k, $name, $from) }
  [void]$tr.Replace($from, $to); ('{0}쪽 「{1}」 : {2} → {3}' -f $k, $name, $from, $to)
}
# 글상자 이름을 모를 때 — 그 쪽 글상자 전체에서 찾아 바꾼다(묶음 안까지)
function RepAny($k, $from, $to){
  function Walk($shapes){ foreach($sh in $shapes){ try{ if($sh.Type -eq 6){ Walk $sh.GroupItems; continue } }catch{}
    try{ if($sh.HasTextFrame -and $sh.TextFrame.HasText -and $sh.TextFrame.TextRange.Text.IndexOf($from) -ge 0){ [void]$sh.TextFrame.TextRange.Replace($from, $to); $script:hit++ } }catch{} } }
  $script:hit = 0; Walk $p.Slides.Item($k).Shapes
  if($script:hit -eq 0){ throw ('{0}쪽에 「{1}」 없음' -f $k, $from) }
  ('{0}쪽 : {1} → {2}' -f $k, $from, $to)
}
function Note($k, $from, $to){
  $tr = $p.Slides.Item($k).NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange
  if($tr.Text.IndexOf($from) -lt 0){ throw ('{0}쪽 노트에 「{1}」 없음' -f $k, $from) }
  [void]$tr.Replace($from, $to); ('{0}쪽 노트 고침' -f $k)
}
try{
  # ① 새 화면
  Swap 12 'Picture 33' (Join-Path $Shots 'N1_엘리베이터단계.jpg')
  Swap 12 'Picture 39' (Join-Path $Shots 'N3_도착화면.jpg')
  Swap 16 '화면 5' (Join-Path $Shots 'N2_마지막단계.jpg')
  Rep 13 '진행 표시 · 화살표' '진행 표시 · 화살표' '단계 막대 · 공항 안내판'
  Rep 13 '진행 표시 · 화살표 설명' '몇 번째 단계 · 어느 쪽으로' '노란 칸 화살표 · 한글 + 영어'
  Rep 13 '실제 사진 + 한 문장 설명' '그 자리 사진과 할 일 한 줄' '그 자리 사진이 화면 가득'
  Rep 13 '사진 크게 보기 설명' '누르면 확대 · 명패 글씨까지' '누른 곳을 2배 · 명패 글씨까지'
  Rep 13 '이전 · 다음 · 도착했어요 설명' '내 걸음에 맞춰 한 단계씩' '좌우로 밀어도 넘어가요'
  Note 13 '단계마다 화살표와 실제 사진, 한 문장이 나오고, 사진은 눌러서 명패 글씨까지 키워 볼 수 있습니다.' '단계마다 그 자리의 실제 사진이 화면 가득 나오고, 아래 노란 안내판이 갈 방향과 할 일을 한글과 영어로 알려 줍니다. 사진을 누르면 누른 곳이 두 배로 커져 명패 글씨까지 보이고, 좌우로 밀면 이전 · 다음 단계로 넘어갑니다.'
  # ② NFC — 아직 안 붙임
  Rep 12 'TextBox 11' 'QR · NFC · URL로 간단 접속' 'QR · URL로 간단 접속'
  Note 12 'NFC 태그나 주소를 직접 입력해도 같은 앱이 열립니다.' '주소를 직접 입력해도 같은 앱이 열립니다. (NFC 태그는 구매 승인을 기다리는 중 — 곧 같은 주소로 붙입니다)'
  Rep 15 'TextBox 3' '출입문 QR · NFC + 오프라인 길안내' '출입문 QR + 오프라인 길안내'
  Rep 15 '출입문 QR · NFC — 우리 방식' '출입문 QR · NFC — 우리 방식' '출입문 QR — 우리 방식 (NFC 준비 중)'
  Rep 15 '출입문 QR · NFC — 우리 방식 설명' '문에 QR 스티커 · NFC 태그 하나. 찍거나 대는 순간' '문에 QR 스티커 하나(NFC 태그는 구매 승인 대기). 찍는 순간'
  Rep 15 '쉽게 말해' '입구에서 QR을 찍거나 NFC에 대고, 그다음은' '입구에서 QR을 찍고, 그다음은'
  Note 15 '「내 위치를 모른다」는 문제를 출입문 QR · NFC 와 오프라인 길안내로 풀었습니다.' '「내 위치를 모른다」는 문제를 출입문 QR 과 오프라인 길안내로 풀었습니다.'
  Note 15 '문에 QR 스티커나 NFC 태그를 붙이면, 찍거나 휴대폰을 대는 순간 그 문이 출발점이 되고' '문에 QR 스티커를 붙이면, 찍는 순간 그 문이 출발점이 되고(NFC 태그도 승인이 나면 같은 방식으로 붙입니다)'
  Note 15 '입구에서 QR 을 찍거나 NFC 에 대고, 그다음은' '입구에서 QR 을 찍고, 그다음은'
  # ③ 파일 수
  Rep 15 '오프라인 1 설명' '파일 249개(16.6MB)' '파일 257개(17.1MB)'   # 11/03 다시 셈(오프라인목록.ps1)
  Note 15 '파일 249개, 16.6MB' '파일 257개, 17.1MB'
  # ④ 이용안내 쪽 수 — 11/03 길 공유하기 · 내 시간표 · 수업 알림 세 쪽 + 처음 동의 쪽이 더해져 15쪽
  RepAny 14 '화면별 그림 설명 11쪽' '화면별 그림 설명 15쪽'
  $p.Save()
} finally {
  try{ $p.Close() }catch{}
  if($app.Presentations.Count -eq 0){ try{ $app.Quit() }catch{} }
}
