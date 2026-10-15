# 졸업작품 계획서 자동 채우기
#
#   한글(HWP) COM 자동화로 학과 양식의 빈 칸에 우리 내용을 채운다.
#   원본은 절대 건드리지 않고 사본을 만들어 거기에 쓴다.
#
#   pwsh -File 도구\계획서_채우기.ps1
#   pwsh -File 도구\계획서_채우기.ps1 -Src <양식.hwp> -Out <결과.hwp>
#
#   ※ 채우지 않는 칸 — 팀장 서명 · 지도교수 서명. 본인이 직접 한다.
#
#   ※ 전화번호·이메일·학번은 개인정보다. 도구\ 는 깃에 올라가 공개 저장소로 나가므로
#     여기에 적으면 안 된다. 깃이 무시하는 생성물\발명자정보.json 에서 읽는다.
#
#   ※ 한글 COM 의 함정 (발명신고서_채우기.ps1 에서 이미 당한 것들)
#     · Quit() 뒤에 곧바로 새 인스턴스를 만들면 RPC 오류가 난다 — 한 인스턴스로 끝낸다.
#     · RepeatFind 는 찾은 글자를 '선택' 상태로 둔다. 그대로 InsertText 하면 라벨을
#       덮어쓰므로 반드시 Run('Cancel') 로 선택을 푼 뒤 칸을 옮긴다.
#     · InsertText 는 줄바꿈 문자를 그냥 버린다 — 줄마다 BreakPara 를 넣어야 한다.
#     · AllReplace 는 실제로 바꿔 놓고도 False 를 돌려준다 — 반환값을 믿으면 안 된다.
#
#   ※ 쪽 수 (가장 중요)
#     빈 양식은 2쪽이다. 서술 칸(필요성·목표·세부내용)과 월별 칸에 글을 길게 넣으면
#     표가 쪽을 넘기면서 뒷줄이 통째로 밀린다. 맨 끝 검사에서 2쪽을 반드시 통과시킨다.
#     3쪽이 되면 아래 NEED / GOAL / DETAIL / MONTH 의 글을 줄여야 한다.
param(
  [string]$Src = "$env:USERPROFILE\Desktop\졸업작품 계획서 양식.hwp",
  [string]$Out = "D:\군산대\생성물\졸업작품계획서_작성본.hwp",
  [string]$Date = '2026 .  10 .  15 .'
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
if(-not (Test-Path $Src)){ throw "양식을 찾지 못했습니다 : $Src" }
New-Item -ItemType Directory -Force -Path (Split-Path $Out -Parent) | Out-Null

# ── 채워 넣을 내용 ───────────────────────────────────────────
# 작품명 : 2026-09-30 확정한 발명 명칭에서 앱 이름을 앞세워 다듬은 것.
$TITLE = '공대 3호관 길안내 — 영상 유사도 격차로 응답 수준을 가변하는 오프라인 실내 길안내 앱'
$PROF  = '강규창 교수님'

$NEED = @'
3호관은 층마다 복도 구조가 비슷해 방문자가 강의실·화장실·비상계단을 찾기 어렵다. 종이 안내판은 호실 이름이 바뀌어도 그대로 남고, 기존 실내 길안내는 비콘·와이파이 같은 장비를 새로 깔아야 해 교내에 적용하기 어렵다.
사진으로 안내하는 방식에도 약점이 있다. 공사나 간판 교체로 사진이 실제와 달라지면 안내가 오히려 사람을 헷갈리게 하는데, 고치려면 제작자가 그 자리를 다시 찾아가 찍어야 한다.
그래서 추가 장비 없이, 인터넷이 끊겨도 열리고, 낡은 안내 사진을 이용자의 손으로 메울 수 있는 길안내가 필요하다.
'@

$GOAL = @'
① 추가 장비 0원 — 폰과 건물 사진만으로 지하 1층~5층, 네 출입문에서 출발하는 길안내를 제공한다.
② 인터넷 없이 — 한 번 설치하면 안내 사진 169장을 포함한 230개 파일 15.6MB 가 폰에 남아 지하에서도 열린다.
③ 안내가 스스로 갱신 — 달라진 곳을 이용자가 찍어 올리면 어느 장소인지 자동 판정해 관리자에게 올린다.
④ 틀릴 때는 입을 다문다 — 1·2위 유사도 격차로 「자리 / 층 / 모름」을 나누어, 확신이 없으면 답하지 않는다.
'@

$DETAIL = @'
· 앱 : 설치형 웹앱(PWA). 3호관 전층 3D 모델(조감도·1인칭 걷기), 출입문 QR 4개로 출발점 지정, 네 문 × 다섯 층의 호실·화장실·비상계단 안내 754가지. 직접 쓴 코드 36개 파일 2만 4천 줄.
· 장소 판정 : 폰 안에서 MobileNet v2 로 사진을 1,280개 숫자로 바꿔 기준 사진과 코사인 유사도를 비교한다. 1·2위 격차가 크면 자리까지, 작으면 층까지, 더 작으면 「모름」으로 답하고 사람 확인에 넘긴다.
· 제보 : Firebase Firestore. 보안 규칙이 사진의 크기·형식·필드를 검사하고, 관리자 승인 전에는 앱에 반영되지 않는다.
· 측정 : 사진 1,844장으로 자리 55.6% / 층 66.8%. 확신 상위 10% 에서는 자리 92.9% / 층 97.8%. CNN 특징이 색·축소 기준선보다 +34.6%p 높다.
'@

# 월별 추진 실적. 4~8월은 저장소를 만들기 전(앱 v76 이전)의 작업이라 커밋 기록이 없고,
# 9~10월은 커밋과 측정 문서에 날짜까지 남아 있다. 11월은 아직 오지 않았으므로 '계획'이라고 적는다.
$MONTH = [ordered]@{
  '4월' = @'
· 주제 선정 — 비콘·와이파이 장비 없이 되는 실내 길안내로 방향을 정했다.
· 3호관 지하 1층~5층과 출입문 네 곳(동·서·정·후) 실측 → 층별 구조 확보.
'@
  '5월' = @'
· 3호관 전층 3D 실내 모델 제작 (three.js, 좌표를 코드로 생성).
· 결과 — 조감도와 1인칭 「직접 걸어보기」 두 화면이 폰에서 돌아갔다.
'@
  '6월' = @'
· 길안내 데이터 — 네 출입문 × 다섯 층의 경유점과 안내 문구 표를 짰다.
· 결과 — 호실·화장실·비상계단 안내의 뼈대 완성 (뒤에 754가지로 늘어남).
'@
  '7월' = @'
· 장소 판정 — 사진을 MobileNet v2 로 1,280개 숫자로 바꿔 유사도 비교.
· 결과 — 기준 사진 399개·시험 사진 239장으로 첫 동작 확인.
'@
  '8월' = @'
· 출입문 QR 4개 · 호실 번호판 글자 읽기(OCR) · 제보 서버와 보안 규칙.
· 결과 — 출발점 지정·호실 확인·이용자 제보의 세 경로가 붙었다.
'@
  '9월' = @'
· 정확도 첫 측정(7.7% → 18.6%) · 약한 5층 재촬영(조원 322장 추가).
· 설치형 웹앱으로 인터넷 없이 열리게 · 안내 754가지 완성 · GPU 버그 수정.
· 결과 — 자리 53.3% → 55.6%, 9/21 중간 발표, 발명 명칭 확정과 명세서 초안.
'@
  '10월' = @'
· 격차 기반 선택적 응답으로 전환 · 기준선·제거 실험 · 신뢰구간.
· 발명신고서 · 특허 도면 9쪽 · 발표 자료 30장 · 7초 「빠른 측정」 도구.
· 결과 — 자리 55.6% / 층 66.8%, 상위 10% 는 92.9% / 97.8%, CNN +34.6%p.
'@
  '11월' = @'
· (계획) 이용자 사용성 시험 · 개인정보처리방침 · 오픈소스 고지.
· (계획) 최종 보고서 작성과 졸업작품 발표.
'@
}

# ── 팀 구성원 ───────────────────────────────────────────────
# 학년·학번·휴대전화·이메일은 개인정보 — 깃이 무시하는 생성물\발명자정보.json 에서 읽는다.
$INFOFILE = Join-Path (Split-Path $PSScriptRoot -Parent) '생성물\발명자정보.json'
$LEADER = '김민종'
$MEM = @()
if(Test-Path $INFOFILE){
  $j = Get-Content $INFOFILE -Raw -Encoding UTF8 | ConvertFrom-Json
  if($j.팀장){ $LEADER = [string]$j.팀장 }
  $MEM = $j.발명자
}
if(-not $MEM -or $MEM.Count -eq 0){
  throw "생성물\발명자정보.json 이 없습니다 — 학번·전화번호·이메일은 그 파일에만 둡니다."
}

# ── 한글 열기 ────────────────────────────────────────────────
# 앞선 실행이 중간에 죽으면 한글이 파일을 붙잡고 있어 사본을 못 덮어쓴다 — 먼저 정리한다
Get-Process Hwp* -ErrorAction SilentlyContinue | ForEach-Object { try{ $_.Kill() }catch{} }
Start-Sleep -Milliseconds 800
Copy-Item $Src $Out -Force
$h = New-Object -ComObject HWPFrame.HwpObject
try{ $h.RegisterModule('FilePathCheckDLL','FilePathCheckerModule') | Out-Null }catch{}
$h.XHwpWindows.Item(0).Visible = $false
if(-not $h.Open($Out,'HWP','forceopen:true')){ throw '사본을 열지 못했습니다' }

$bad = 0
function Note($s){ Write-Host "  $s" }

function FindFrom([string]$s){
  $h.Run('MoveDocBegin') | Out-Null
  $o = $h.HParameterSet.HFindReplace
  $h.HAction.GetDefault('RepeatFind', $o.HSet) | Out-Null
  $o.FindString = $s; $o.IgnoreMessage = 1; $o.Direction = 0
  $o.MatchCase = 0; $o.WholeWordOnly = 0; $o.SeveralWords = 0; $o.UseWildCards = 0
  return [bool]$h.HAction.Execute('RepeatFind', $o.HSet)
}
function PutText([string]$s){
  $lines = ($s -replace "`r`n","`n").TrimEnd("`n") -split "`n"
  for($i=0; $i -lt $lines.Count; $i++){
    if($i -gt 0){ $h.Run('BreakPara') | Out-Null }
    if($lines[$i].Length -eq 0){ continue }
    $o = $h.HParameterSet.HInsertText
    $h.HAction.GetDefault('InsertText', $o.HSet) | Out-Null
    $o.Text = $lines[$i]
    $h.HAction.Execute('InsertText', $o.HSet) | Out-Null
  }
}
function ReplaceAll([string]$from, [string]$to){
  $h.Run('MoveDocBegin') | Out-Null
  $o = $h.HParameterSet.HFindReplace
  $h.HAction.GetDefault('AllReplace', $o.HSet) | Out-Null
  $o.FindString = $from; $o.ReplaceString = $to
  $o.IgnoreMessage = 1; $o.Direction = 0; $o.MatchCase = 0
  $o.WholeWordOnly = 0; $o.SeveralWords = 0; $o.UseWildCards = 0
  $o.ReplaceMode = 1
  $h.HAction.Execute('AllReplace', $o.HSet) | Out-Null
}
# 라벨을 찾아 선택을 푼 뒤, 오른쪽/아래 칸으로 옮겨 쓴다
function FillNext([string]$label, [string]$text, [int]$right = 1, [int]$down = 0){
  if(-not (FindFrom $label)){ Note "못 찾음 ★ : $label"; $script:bad++; return }
  $h.Run('Cancel') | Out-Null
  for($i=0; $i -lt $right; $i++){ $h.Run('TableRightCell') | Out-Null }
  for($i=0; $i -lt $down;  $i++){ $h.Run('TableLowerCell') | Out-Null }
  PutText $text
  Note "채움 : $label"
}

Write-Host "`n[1] 머리 칸"
FillNext '작품명'   $TITLE
FillNext '지도교수' $PROF
FillNext '팀장'     $LEADER    # 1쪽 머리의 '팀장' 이 '(팀장포함)' 보다 앞에 있어 먼저 잡힌다

Write-Host "`n[2] 팀 구성원 (팀장 포함 $($MEM.Count)명)"
# '학년' 은 머리 줄의 첫 칸이다. 거기서 아래로 (i+1) 칸 내려가면 i번째 사람의 학년 칸.
# 오른쪽으로 네 번 더 옮기면 학번 → 이름 → 휴대전화 → 이메일.
# ※ 매번 맨 위에서 다시 찾아야 한다. 선택 상태를 들고 칸을 옮기면 라벨이 지워진다.
for($i=0; $i -lt $MEM.Count; $i++){
  $p = $MEM[$i]
  if(-not (FindFrom '학년')){ Note "못 찾음 ★ : 학년 (구성원 $($p.국문))"; $bad++; continue }
  $h.Run('Cancel') | Out-Null
  for($k=0; $k -le $i; $k++){ $h.Run('TableLowerCell') | Out-Null }
  $row = @([string]$p.학년, [string]$p.학번, [string]$p.국문, [string]$p.연락처, [string]$p.이메일)
  for($c=0; $c -lt $row.Count; $c++){
    if($c -gt 0){ $h.Run('TableRightCell') | Out-Null }
    if($row[$c].Trim()){ PutText $row[$c] }
  }
  Note ("구성원 : {0}학년 · {1} · {2}" -f $p.학년, $p.학번, $p.국문)
}

Write-Host "`n[3] 서술 칸"
FillNext '작품의 필요성' $NEED
FillNext '목표'          $GOAL     # '작품의' 와 '목표' 가 두 줄이라 '작품의 목표' 로는 못 찾는다
FillNext '세부내용'      $DETAIL   # 2쪽의 '세부 계획' 과는 다른 글자다

Write-Host "`n[4] 월별 세부 계획 (2쪽)"
# '4월'~'11월' 로 찾으면 위에서 넣은 글에 먼저 걸릴 수 있다.
# 머리 칸 '세부 계획' 을 찾아 거기서 한 칸씩 내려가며 쓴다 — 표 구조라 어긋날 수 없다.
if(-not (FindFrom '세부 계획')){ Note '못 찾음 ★ : 세부 계획'; $bad++ }
else{
  $h.Run('Cancel') | Out-Null
  foreach($m in $MONTH.Keys){
    $h.Run('TableLowerCell') | Out-Null
    PutText $MONTH[$m]
    Note "채움 : $m"
  }
}

Write-Host "`n[5] 제출 날짜"
ReplaceAll '20  .   .   .' $Date
Note "날짜 : $Date"

# ── 저장 및 확인 ─────────────────────────────────────────────
$h.SaveAs($Out,'HWP','') | Out-Null
$h.Clear(1) | Out-Null
$h.Open($Out,'HWP','forceopen:true') | Out-Null
$txt = $h.GetTextFile('TEXT','')
# ※ 한글의 TEXT 내보내기는 줄표(—, U+2014)를 '&#8212;' 로 바꿔 놓는다.
#   문서 안에는 진짜 줄표가 들어가 있다(PDF 로 떠서 눈으로 확인함). 글자 검사만 헛돌므로 되돌린다.
#   가운뎃점·곱셈표·① 같은 다른 글자는 그대로 나온다 — 줄표만 이렇다.
$txt = $txt -replace '&#8212;', '—'
$pageCount = 0
try{ $pageCount = [int]$h.PageCount }catch{}

# PDF 도 여기서 같이 내보낸다 — 손으로 하는 단계로 두면 고친 뒤에도 옛 PDF 가 남는다
$pdfOut = [IO.Path]::ChangeExtension($Out, '.pdf')
try{ $h.SaveAs($pdfOut,'PDF','') | Out-Null; Write-Host ("`n  PDF : {0}" -f (Split-Path $pdfOut -Leaf)) }
catch{ Write-Host "`n  PDF 내보내기 실패 — 한글에서 직접 PDF 로 저장하세요" -ForegroundColor Yellow }
$h.Quit()

$dump = [IO.Path]::ChangeExtension($Out, '.txt')
[IO.File]::WriteAllText($dump, $txt, (New-Object Text.UTF8Encoding($false)))

Write-Host "`n[6] 확인"
$checks = @(
  @{ n='작품명';        c=([regex]::Matches($txt,[regex]::Escape($TITLE))).Count;  want=1 }
  @{ n='지도교수';      c=([regex]::Matches($txt,[regex]::Escape($PROF))).Count;   want=1 }
  @{ n='팀장 이름';     c=([regex]::Matches($txt,[regex]::Escape($LEADER))).Count; want=2 }
  @{ n='학번';          c=(($MEM | Where-Object { $txt -match [regex]::Escape([string]$_.학번) }).Count);   want=$MEM.Count }
  @{ n='휴대전화';      c=(($MEM | Where-Object { $txt -match [regex]::Escape([string]$_.연락처) }).Count); want=$MEM.Count }
  @{ n='이메일';        c=(($MEM | Where-Object { $txt -match [regex]::Escape([string]$_.이메일) }).Count); want=$MEM.Count }
  @{ n='필요성 본문';   c=([regex]::Matches($txt,'이용자의 손으로 메울')).Count;   want=1 }
  @{ n='목표 네 가지';  c=([regex]::Matches($txt,'[①②③④]')).Count;                want=4 }
  @{ n='세부내용 본문'; c=([regex]::Matches($txt,'754가지')).Count;                 want=3 }
  @{ n='4월 실적';      c=([regex]::Matches($txt,'층별 구조 확보')).Count;          want=1 }
  @{ n='11월 계획';     c=([regex]::Matches($txt,'최종 보고서 작성')).Count;        want=1 }
  @{ n='제출 날짜';     c=([regex]::Matches($txt,[regex]::Escape($Date))).Count;    want=1 }
  @{ n='월별 줄머리';   c=([regex]::Matches($txt,'· ')).Count;                      want=-1 }
)
foreach($k in $checks){
  if($k.want -lt 0){ Write-Host ("  {0,-14} : {1}개" -f $k.n, $k.c); continue }
  $ok = ($k.c -eq $k.want)
  if(-not $ok){ $bad++ }
  Write-Host ("  {0,-14} : {1} (있어야 할 수 {2}) {3}" -f $k.n, $k.c, $k.want, $(if($ok){'통과'}else{'실패 ★'}))
}

# 빈 양식이 2쪽이다. 3쪽이 되면 표가 쪽을 넘겼다는 뜻 — 서술 칸의 글을 줄여야 한다.
Write-Host ""
$pok = ($pageCount -eq 2)
if(-not $pok){ $bad++ }
$pmsg = if($pok){ '통과' } else { '실패 ★ — NEED / DETAIL / MONTH 의 글을 줄이세요' }
Write-Host ("  {0,-14} : {1}쪽 (있어야 할 수 2) {2}" -f '쪽 수', $pageCount, $pmsg)

Write-Host ""
Write-Host ("글자 확인용 : {0}" -f (Split-Path $dump -Leaf))
if($bad){ Write-Host "확인 실패 $bad 건 — 위 ★ 를 보세요" -ForegroundColor Red; exit 1 }
Write-Host "확인 통과" -ForegroundColor Green
