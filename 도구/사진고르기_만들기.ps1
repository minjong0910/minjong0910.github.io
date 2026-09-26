# 사진고르기_만들기.ps1 — 「사진 고르기」 화면을 만든다
#
#   사진원본\ 의 사진 전부를 장소별로 모아 한 페이지에 늘어놓고,
#   사람이 눈으로 보고 클릭해서 고를 수 있게 한다. 고른 결과는 텍스트 파일로 내려받는다.
#   그 파일을 도구\고른사진_넣기.ps1 에 주면 앱에 그대로 반영된다.
#
#   실행 : pwsh -File 도구\사진고르기_만들기.ps1
#   결과 : 사진고르기.html  (더블클릭해서 열면 된다)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$src  = Join-Path $root '사진원본'
$cur  = Join-Path $root 'site\data\photos'
$out  = Join-Path $root '사진고르기.html'

# ── 방 이름표 ───────────────────────────────────────────────
$names = (Get-Content (Join-Path $root '도구\방이름.json') -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable)['이름']

function 장소이름($code){
  if($names.ContainsKey($code)){ return $names[$code] }
  if($code -match '^HALL(\d)([LR])$'){ return "$($Matches[1])층 " + $(if($Matches[2] -eq 'L'){'왼쪽'}else{'오른쪽'}) + " 복도" }
  if($code -match '^EVIN(\d)$'){ return "$($Matches[1])층 엘리베이터 안" }
  if($code -match '^EV(\d)$'){   return "$($Matches[1])층 엘리베이터 앞" }
  if($code -eq 'EVB1'){ return '지하 1층 엘리베이터' }
  if($code -match '^WC(\d)$'){   return "$($Matches[1])층 화장실 앞" }
  if($code -match '^SIGN(\d)$'){ return "$($Matches[1])층 비상대피 안내판" }
  if($code -match '^LNG(\d)$'){  return $(if($Matches[1] -eq '1'){'1층 로비'}else{"$($Matches[1])층 라운지"}) }
  if($code -match '^WIN(\d)([LR])?$'){ return "$($Matches[1])층 창밖" + $(if($Matches[2] -eq 'L'){' (왼쪽)'}elseif($Matches[2] -eq 'R'){' (오른쪽)'}else{''}) }
  if($code -match '^EMS(\d)$'){  return "$($Matches[1])층 비상계단" }
  if($code -eq 'ES1'){ return '1층 중앙계단' }
  if($code -eq 'B1'){  return '지하 1층 크리에이티브 존' }
  if($code -eq 'KTC'){ return 'KTC 동아리실' }
  if($code -eq 'BLD'){ return '건물 외부 (정문·후문·동문·서문)' }
  if($code -eq 'GATE_BACK'){ return '후문 · 지하로 내려가는 계단' }
  if($code -eq 'GATE_E'){ return '동문으로 들어올 때' }
  if($code -eq 'GATE_W'){ return '서문으로 들어올 때' }
  return $code
}

# 층은 파일 이름 맨 앞('3층-', '지하1층-', '옥상-')에서 읽는다 — 코드로 추측하는 것보다 확실하다
function 층찾기($files, $code){
  foreach($f in $files){
    if($f -match '^0?_?(지하\s*1층|B1)'){ return 'B1' }
    if($f -match '^0?_?(\d)층'){ return $Matches[1] }
    if($f -match '^0?_?옥상'){ return 'R' }
  }
  if($code -match '^13(\d)'){ return $Matches[1] }
  return '기타'
}

$places = @()

Get-ChildItem $src -Directory | Sort-Object Name | ForEach-Object {
  $code  = $_.Name
  $files = @(Get-ChildItem $_.FullName -File -Filter *.jpg | Sort-Object Name | ForEach-Object { $_.Name })
  if(-not $files.Count){ return }
  $curFile = $null
  $curDir  = Join-Path $cur $code
  if(Test-Path $curDir){ $curFile = (Get-ChildItem $curDir -File -Filter *.jpg | Sort-Object Name | Select-Object -First 1).Name }
  $places += [pscustomobject]@{
    code = $code; label = (장소이름 $code); floor = (층찾기 $files $code)
    cur = $curFile; files = $files
  }
}

# 건물 외부(BLD)는 여기서 뺀다 — 정문·후문·동문·서문의 안/밖 8장이 자리마다 정해진 한 묶음이라
# '한 장 고르기'가 성립하지 않는다. 바꿔야 하면 따로 말씀해 주시면 그 자리만 바꾼다.

$json = $places | ConvertTo-Json -Depth 6 -Compress

$html = Get-Content (Join-Path $PSScriptRoot '사진고르기_틀.html') -Raw -Encoding utf8
$html = $html.Replace('/*__DATA__*/', $json)
[System.IO.File]::WriteAllText($out, $html, (New-Object System.Text.UTF8Encoding $true))

$total = ($places | ForEach-Object { $_.files.Count } | Measure-Object -Sum).Sum
Write-Output ("  사진 고르기 화면을 만들었습니다 — 장소 {0}곳 · 사진 {1}장" -f $places.Count, $total)
Write-Output ("  {0}" -f $out)
