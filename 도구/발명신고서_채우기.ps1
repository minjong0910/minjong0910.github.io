# 발명신고서 및 권리승계합의서(별지서식 제1·2호) 자동 채우기
#
#   한글(HWP) COM 자동화로 빈 서식에 우리 내용을 채워 넣는다.
#   원본은 절대 건드리지 않고 사본을 만들어 거기에 쓴다.
#
#   pwsh -File 도구\발명신고서_채우기.ps1
#   pwsh -File 도구\발명신고서_채우기.ps1 -Src <원본.hwp> -Out <결과.hwp>
#
#   ※ 채우지 않는 칸 (사람이 직접 써야 한다)
#     · 지분(%)          — 발명자 자격·기여도는 셋이 합의하고 담당자 판단을 받아야 한다
#     · 영문 성명        — 여권 표기를 모른다. 추측해서 쓰면 나중에 증명서에서 문제가 된다
#     · 소속(학과)·연락처·이메일
#     · 관련연구 전 칸   — 캡스톤디자인 등 지원사업 해당 여부를 확인하기 전에는 쓸 수 없다
#                          (안 받았는데 '해당 없음'을 쓰는 건 되지만, 받았는데 비우면 허위가 된다)
#     · 주민등록번호·주소·서명(인) — 개인정보. 본인이 직접 쓴다
#     · 신고 날짜        — 제출하는 날
#
#   ※ 한글 COM 은 Quit() 뒤에 곧바로 새 인스턴스를 만들면 RPC 오류가 난다. 한 인스턴스로 끝낸다.
#   ※ 찾기(RepeatFind) 는 찾은 글자를 '선택'한 상태로 둔다. 그대로 InsertText 하면
#     라벨을 덮어쓰므로 반드시 Run('Cancel') 로 선택을 푼 뒤 칸을 옮긴다.
param(
  [string]$Src = "$env:USERPROFILE\Documents\카카오톡 받은 파일\1.(작성서식)발명신고서및권리승계합의서.hwp",
  [string]$Out = "D:\군산대\생성물\발명신고서_작성본.hwp"
)
$ErrorActionPreference = 'Stop'
if(-not (Test-Path $Src)){ throw "원본을 찾지 못했습니다 : $Src" }
New-Item -ItemType Directory -Force -Path (Split-Path $Out -Parent) | Out-Null

# ── 채워 넣을 내용 ───────────────────────────────────────────
$TITLE = '영상 유사도 격차를 이용한 오프라인 실내 길안내 방법 및 시스템'

# ※ 이 칸은 아주 작다 — 실측으로 100자는 2쪽, 200자면 3쪽, 300자면 4쪽이 된다.
#   표가 한 쪽을 넘기면 「예상 실시 시기」 아래 줄들이 인쇄에서 통째로 빠진다.
#   글자 크기를 8pt 로 줄여도 소용없었다(칸 높이가 늘어나는 것이 원인).
#   상세한 내용은 별표 2 「발명의 내용 설명서」가 맡는 것이 이 서식의 설계다 — 여기는 짧게 쓴다.
#   고치면 반드시 맨 끝 쪽 수 검사(2쪽)를 통과시킬 것.
$SUMMARY = @'
건물 안에서 인터넷 없이 동작하는 실내 길안내 시스템. 출입문 QR로 층을 확정하고, 이용자가 찍은 사진을 휴대폰 안에서 기준영상과 대조해 위치를 좁힌다. 1·2위 유사도 '격차'에 따라 「자리/층/모름」으로 답하며 AI 단독 확정은 하지 않는다. 상세는 별표 2 참조.
'@

$FIELD = @'
대학·학교, 관공서·병원, 지하상가·전시장, 지하주차장 등 통신이 약한 대형 실내 공간. 출입구 QR과 사진만으로 구축.
'@

$NAMES = @('김민종','손의윤','문성일')

# ── 한글 열기 ────────────────────────────────────────────────
# 앞선 실행이 중간에 죽으면 한글이 파일을 붙잡고 있어 사본을 못 덮어쓴다 — 먼저 정리한다
Get-Process Hwp* -ErrorAction SilentlyContinue | ForEach-Object { try{ $_.Kill() }catch{} }
Start-Sleep -Milliseconds 800
Copy-Item $Src $Out -Force
$h = New-Object -ComObject HWPFrame.HwpObject
try{ $h.RegisterModule('FilePathCheckDLL','FilePathCheckerModule') | Out-Null }catch{}
$h.XHwpWindows.Item(0).Visible = $false
if(-not $h.Open($Out,'HWP','')){ throw '사본을 열지 못했습니다' }

$log = New-Object System.Collections.Generic.List[string]
function Note($s){ $script:log.Add($s); Write-Host "  $s" }

function FindFrom([string]$s, [bool]$fromTop = $true){
  if($fromTop){ $h.Run('MoveDocBegin') | Out-Null }
  $o = $h.HParameterSet.HFindReplace
  $h.HAction.GetDefault('RepeatFind', $o.HSet) | Out-Null
  $o.FindString = $s; $o.IgnoreMessage = 1; $o.Direction = 0
  $o.MatchCase = 0; $o.WholeWordOnly = 0; $o.SeveralWords = 0; $o.UseWildCards = 0
  return [bool]$h.HAction.Execute('RepeatFind', $o.HSet)
}
# 줄바꿈을 살려서 넣는다. InsertText 는 줄바꿈 문자를 그냥 버리므로
# 줄마다 따로 넣고 사이에 BreakPara(문단 나누기)를 넣어야 한다.
function PutText([string]$s){
  $lines = $s -split "`r`n|`n"
  for($i=0; $i -lt $lines.Count; $i++){
    if($i -gt 0){ $h.Run('BreakPara') | Out-Null }
    if($lines[$i].Length -eq 0){ continue }
    $o = $h.HParameterSet.HInsertText
    $h.HAction.GetDefault('InsertText', $o.HSet) | Out-Null
    $o.Text = $lines[$i]
    $h.HAction.Execute('InsertText', $o.HSet) | Out-Null
  }
  return $true
}
function ReplaceAll([string]$from, [string]$to){
  $h.Run('MoveDocBegin') | Out-Null
  $o = $h.HParameterSet.HFindReplace
  $h.HAction.GetDefault('AllReplace', $o.HSet) | Out-Null
  $o.FindString = $from; $o.ReplaceString = $to
  $o.IgnoreMessage = 1; $o.Direction = 0; $o.MatchCase = 0
  $o.WholeWordOnly = 0; $o.SeveralWords = 0; $o.UseWildCards = 0
  $o.ReplaceMode = 1
  # ※ AllReplace 는 실제로 바꿔 놓고도 False 를 돌려준다 — 반환값을 믿으면 안 된다.
  #   성공 여부는 맨 끝 [7] 확인에서 글자를 세어 판단한다.
  $h.HAction.Execute('AllReplace', $o.HSet) | Out-Null
}
# 라벨을 찾아 선택을 푼 뒤, 오른쪽/아래 칸으로 옮겨 쓴다
function FillNext([string]$label, [string]$text, [int]$right = 1, [int]$down = 0){
  if(-not (FindFrom $label)){ Note "못 찾음 ★ : $label"; return $false }
  $h.Run('Cancel') | Out-Null
  for($i=0; $i -lt $right; $i++){ $h.Run('TableRightCell') | Out-Null }
  for($i=0; $i -lt $down;  $i++){ $h.Run('TableLowerCell') | Out-Null }
  [void](PutText $text)
  Note "채움 : $label"
  return $true
}

# 앞에 붙은 네모를 못 찾을 때 쓴다.
# 이 서식의 '□기타 간행물' 은 □ 와 기타 사이에 보이지 않는 줄바꿈 문자가 끼어 있어
# '□기타' 로 찾으면 안 나온다. 그래서 '기타 간행물' 을 찾은 뒤 왼쪽으로 선택을 늘려
# □ 까지 잡은 다음 통째로 바꿔 쓴다 (실측 : 8칸이면 '□기타 간행물' 이 잡힌다).
function MarkByBack([string]$anchor, [int]$back, [string]$text){
  if(-not (FindFrom $anchor)){ Note "못 찾음 ★ : $anchor"; return }
  $h.Run('Cancel') | Out-Null
  for($i=0; $i -lt $back; $i++){ $h.Run('MoveSelPrevChar') | Out-Null }
  [void](PutText $text)
  Note "체크 : $anchor"
}

Write-Host "`n[1] 발명의 명칭"
[void](FillNext '발명(창작)의 명칭' $TITLE)
[void](FillNext '명    칭' $TITLE)          # 별지서식 제2호(권리승계합의서)

Write-Host "`n[2] 체크 표시"
ReplaceAll '□ 국내출원' '■ 국내출원';     Note '■ 국내출원'
ReplaceAll '□특허' '■특허';               Note '■ 특허'
ReplaceAll '□ 산학협력단' '■ 산학협력단'; Note '■ 산학협력단 (출원비용부담)'

Write-Host "`n[3] 발명의 공개 여부  ※ 가장 중요"
# ※ 이 서식은 '□기타' 처럼 네모와 글자 사이에 공백이 없다 (다른 항목은 '□ 국내출원' 처럼 있다).
#   공백을 넣어 찾으면 못 찾으므로 문서의 실제 글자 그대로 적는다.
MarkByBack '기타 간행물' 8 '■기타 간행물 (GitHub 공개저장소·공개 웹사이트 배포, 교내 중간발표)'
ReplaceAll '  년   월   일' '2026 년 9 월 21 일'
Note '공개일 2026-09-21'

Write-Host "`n[4] 발명자 국문 성명"
$first = $true
foreach($n in $NAMES){
  if(FindFrom '국문 : ' $first){ $h.Run('Cancel') | Out-Null; [void](PutText $n); Note "발명자 : $n" }
  else { Note "못 찾음 ★ : 발명자 $n" }
  $first = $false
}

Write-Host "`n[5] 서술 칸"
[void](FillNext '요지 및 특징' $SUMMARY)
[void](FillNext '적용 제품' $FIELD)
[void](FillNext '공동 연구 및 관심 기업' '없음')

Write-Host "`n[6] 단계 표시 (라벨 아래 칸)"
[void](FillNext '시제품 단계' '■' 0 1)
[void](FillNext '1년이내 실시' '■' 0 1)

# ── 저장 및 확인 ─────────────────────────────────────────────
$h.SaveAs($Out,'HWP','') | Out-Null
$h.Clear(1) | Out-Null
$h.Open($Out,'HWP','') | Out-Null
$txt = $h.GetTextFile('TEXT','')
$pageCount = 0
try{ $pageCount = [int]$h.PageCount }catch{}
$h.Quit()

$dump = [IO.Path]::ChangeExtension($Out, '.txt')
[IO.File]::WriteAllText($dump, $txt, (New-Object Text.UTF8Encoding($false)))

Write-Host "`n[7] 확인"
$checks = @(
  @{ n='발명의 명칭 2곳'; c = ([regex]::Matches($txt, [regex]::Escape($TITLE))).Count; want = 2 }
  @{ n='■ 국내출원';      c = ([regex]::Matches($txt, '■ 국내출원')).Count;  want = 1 }
  @{ n='■ 특허';          c = ([regex]::Matches($txt, '■특허')).Count;       want = 1 }
  @{ n='■ 기타 간행물';   c = ([regex]::Matches($txt, '■기타 간행물')).Count;  want = 1 }
  @{ n='공개일';          c = ([regex]::Matches($txt, '2026 년 9 월 21 일')).Count; want = 1 }
  @{ n='■ 산학협력단';    c = ([regex]::Matches($txt, '■ 산학협력단')).Count; want = 1 }
  @{ n='발명자 3명';      c = (($NAMES | Where-Object { $txt -match [regex]::Escape($_) }).Count); want = 3 }
  @{ n='요지 본문';       c = ([regex]::Matches($txt, '별표 2 참조')).Count;       want = 1 }
  @{ n='응용 분야';       c = ([regex]::Matches($txt, '지하주차장')).Count;   want = 1 }
  @{ n='남은 □ (안 고른 것)'; c = ([regex]::Matches($txt, '□')).Count;        want = -1 }
)
$bad = 0
foreach($k in $checks){
  if($k.want -lt 0){ Write-Host ("  {0,-22} : {1}개" -f $k.n, $k.c); continue }
  $ok = ($k.c -eq $k.want)
  if(-not $ok){ $bad++ }
  Write-Host ("  {0,-22} : {1} (있어야 할 수 {2}) {3}" -f $k.n, $k.c, $k.want, $(if($ok){'통과'}else{'실패 ★'}))
}
Write-Host ""
# ── 쪽 수 검사 ───────────────────────────────────────────────
# 빈 원본은 2쪽이다. 서술 칸에 글을 길게 넣으면 표가 한 쪽을 넘기면서
# 「예상 실시 시기」 아래 줄들이 인쇄에서 통째로 빠진다(글자는 남아 있어 글자 검사로는 못 잡는다).
# PDF 안의 /Type/Page 를 세는 방법은 한글이 만든 PDF 에서 0 이 나왔다 — 한글에게 직접 묻는다.
Write-Host ("  {0,-22} : {1} (있어야 할 수 2) {2}" -f '쪽 수', $pageCount, $(if($pageCount -eq 2){'통과'}else{'실패 ★ — 서술 칸 글을 줄이세요'}))
if($pageCount -ne 2){ $bad++ }

Write-Host ""
Write-Host ("글자 확인용 : {0}" -f (Split-Path $dump -Leaf))
if($bad){ Write-Host "확인 실패 $bad 건 — 위 ★ 를 보세요" -ForegroundColor Red; exit 1 }
Write-Host "확인 통과" -ForegroundColor Green
