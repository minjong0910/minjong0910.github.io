# site\js\app\main.js (1만 6천 줄) 를 기능별 파일 18개로 나눈다 — 한 번만 쓰는 도구
#
#   자르는 곳은 '기준 줄'(구역 제목이나 함수 이름)이 있는 줄 — 그 위에 붙은 주석까지 함께 옮긴다.
#   조각을 순서대로 이어 붙이면 원래 main.js 와 글자 하나 다르지 않은지 스스로 확인한다.
#   각 파일은 원래처럼 엄격 모드("use strict")로 시작한다. index.html 의 <script> 도 같은 순서로 바꾼다.
#
#   사용법 : pwsh -File 도구\split_main.ps1
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$APP  = Join-Path $ROOT 'site\js\app'
$SRC  = Join-Path $APP 'main.js'
$UTF8 = New-Object System.Text.UTF8Encoding($false)
$text = [IO.File]::ReadAllText($SRC, [Text.Encoding]::UTF8)
$lines = $text -split "`n"

# 파일 이름 · 기준 줄(이 글자로 시작하는 줄이 정확히 하나) · 설명
$parts = @(
  @('building.js',        $null,                                     '건물 자료(층별 호실 배치)와 3D 좌표 계산 — FLOORS_DATA · FLOOR_LAYOUT · 비상계단 · 시설 위치'),
  @('shell.js',           '/* ========== 상태 ========== */',        '앱 상태(목적지·출발층) · 화면 전환 go() · 실사 3D 연결 · 뒤로가기 · 즐겨찾기'),
  @('suggest.js',         '/* ========== 건의함 :',                  '건의함(사진 제보) · 관리자 제보 검토 · 관리자 로그인 입구 · 전체 사진 관리'),
  @('ui.js',              '/* ========== 한/영 전환',                '한/영 전환 · 이용안내 · 카테고리 · 최근 검색 · 검색 · 층 버튼'),
  @('view3d.js',          '/* ========== 3D 공통 ========== */',     '건물 3D 기본(렌더러·카메라·회전) · 장소 좌표 place3D · 길찾기 그래프 NAVGRAPH · 후보 평면도 · 사람 표시 이동'),
  @('roadview.js',        "   1인칭 '로드뷰' 경로 미리보기",          '1인칭 로드뷰 — 기본값 · 그림(텍스처) · 소품 만들기'),
  @('roadview-1f.js',     'function fpMakeGate(',                    '1인칭 로드뷰 — 1층 출입문 · 후문 곁가지 · 1층 중앙계단 홀'),
  @('roadview-stairs.js', 'function fpRoofDeckH(',                   '1인칭 로드뷰 — 계단실'),
  @('roadview-b1.js',     'function fpB1StairNook(',                 '1인칭 로드뷰 — 지하 1층 크리에이티브 존 · 트인 공간'),
  @('roadview-roof.js',   'function fpRoofBox(',                     '1인칭 로드뷰 — 옥상 · 복층'),
  @('roadview-corr.js',   'function fpMakeEvLanding(',               '1인칭 로드뷰 — 엘리베이터 홀 · 복도 · 층별 복도 짓기'),
  @('roadview-play.js',   'function fpClearCorr(',                   '1인칭 로드뷰 — 재생(대본 만들기 · 시작 · 멈춤 · 도착)'),
  @('roadview-free.js',   '/* ══════════ 자유 탐색(로드뷰처럼 눌러서 이동)', '1인칭 로드뷰 — 자유 탐색(눌러서 이동 · 엘리베이터/계단 고르기 · 둘러보기)'),
  @('overview3d.js',      'function addLevelContents(',              '건물 전체 3D — 층 그림 짓기 · 강조(highlight3D) · 목적지 이름표 · 매 장면 그리기(animate)'),
  @('floor-detail.js',    '/* ========== 층 상세 3D (5번) ========== */', '층 상세 3D(5번 화면) · 층 다시 짓기 · 테두리 선 합치기 · 성능 표시'),
  @('photos.js',          '   ③ 사진 라이브러리',                     '장소 사진 — 목록 정리 · 사진 이름 읽기 · 사진 넣기(관리자) · AI 도우미 · 사진 자료 묶음 · 사진 상자'),
  @('guide.js',           '/* ========== 안내 단계 생성 ========== */', '길안내 단계 만들기(buildSteps) · 몇 번째 방 · 안내 화면(6번)'),
  @('start.js',           '/* ========== 시작 ========== */',        '앱 시작(bootApp) — 글꼴을 기다린 뒤 3D·화면을 준비한다')
)

# ── 나누기 전에 옮길 것 : 뒤 파일에 있는 함수를 앞 파일이 여는 순간 바로 부르는 곳 ──
#    한 파일일 때는 함수 선언이 맨 위로 끌어올려져서 괜찮았지만, 파일을 나누면 오류가 난다.
#    roomInsetD : building.js 의 EMSTAIR_RENDER_D 계산이 바로 쓴다 (정의는 건물 3D 쪽에 있었다)
function MoveBlock([string]$blockStart, [string]$blockLastLine, [string]$before){
  $a = @(); $b = @(); $c = @()
  for($i = 0; $i -lt $script:lines.Count; $i++){
    if($script:lines[$i].StartsWith($blockStart)){ $a += $i }
    if($script:lines[$i] -eq $blockLastLine){ $b += $i }
    if($script:lines[$i].StartsWith($before)){ $c += $i }
  }
  if($a.Count -ne 1 -or $b.Count -ne 1 -or $c.Count -ne 1){ throw "옮길 곳을 찾지 못함 : $blockStart ($($a.Count)/$($b.Count)/$($c.Count))" }
  $blk = $script:lines[$a[0]..$b[0]]
  $rest = @(); for($i = 0; $i -lt $script:lines.Count; $i++){ if($i -lt $a[0] -or $i -gt $b[0]){ $rest += $script:lines[$i] } }
  $at = [Array]::IndexOf($rest, ($rest | Where-Object { $_.StartsWith($before) } | Select-Object -First 1))
  $script:lines = $rest[0..($at - 1)] + $blk + $rest[$at..($rest.Count - 1)]
  Write-Host ("  옮김 : {0}줄 ({1}…) → '{2}' 앞" -f $blk.Count, $blockStart.Substring(0, [Math]::Min(30, $blockStart.Length)), $before.Substring(0, [Math]::Min(30, $before.Length)))
}
MoveBlock '// 방 사이 시각적 간격(세로) 계산' 'function roomInsetD(d){ return Math.min(0.35, d*0.08); }' '// 실제로 그려지는 비상계단 두께'
$text = $lines -join "`n"

# 기준 줄 찾기 → 그 위에 붙은 주석 덩어리의 첫 줄에서 자른다
function CommentOpen([int]$j){   # j 줄에서 위로 올라가며 이 블록 주석을 여는 줄('/*')을 찾는다
  while($j -ge 0 -and $lines[$j].IndexOf('/*') -lt 0){ $j-- }
  if($j -lt 0){ throw '주석 시작을 찾지 못함' }
  return $j
}
function IncludeCommentsAbove([int]$i){
  while($i -gt 0){
    $t = $lines[$i - 1].Trim()
    if($t -eq ''){ break }
    if($t.StartsWith('//')){ $i--; continue }
    if($t.EndsWith('*/')){
      $j = CommentOpen ($i - 1)
      if(-not $lines[$j].TrimStart().StartsWith('/*')){ break }   # 코드 뒤에 붙은 주석이면 멈춘다
      $i = $j; continue
    }
    break
  }
  return $i
}
$starts = @(0)
for($k = 1; $k -lt $parts.Count; $k++){
  $anchor = $parts[$k][1]
  $hits = @(); for($i = 0; $i -lt $lines.Count; $i++){ if($lines[$i].StartsWith($anchor)){ $hits += $i } }
  if($hits.Count -ne 1){ throw ("[{0}] 기준 줄이 {1}개 : {2}" -f $parts[$k][0], $hits.Count, $anchor) }
  $i = $hits[0]
  # 기준 줄이 주석 안의 줄이면(예 : 제목 둘째 줄) 그 주석을 여는 줄까지 올라간다
  if(-not ($lines[$i].TrimStart().StartsWith('/*') -or $lines[$i].StartsWith('function') -or $lines[$i].StartsWith('var '))){ $i = CommentOpen $i }
  # 바로 위에 빈 줄 없이 붙은 주석도 함께 가져간다
  $i = IncludeCommentsAbove $i
  if($i -le $starts[-1]){ throw ("[{0}] 자르는 곳이 앞 조각보다 앞에 있음" -f $parts[$k][0]) }
  $starts += $i
}
$starts += $lines.Count

# 조각 만들기 — 원래 첫 줄 "use strict"; 는 building.js 가 그대로 갖고, 나머지 파일에는 새로 붙인다
$chunks = @()
for($k = 0; $k -lt $parts.Count; $k++){ $chunks += ,($lines[$starts[$k]..($starts[$k + 1] - 1)] -join "`n") }
if(($chunks -join "`n") -ne $text){ throw '조각을 이어 붙인 것이 원래 main.js 와 다름 — 멈춤' }
if(-not $lines[0].StartsWith('"use strict";')){ throw 'main.js 첫 줄이 "use strict"; 가 아님' }

$tags = @()
for($k = 0; $k -lt $parts.Count; $k++){
  $name = $parts[$k][0]; $desc = $parts[$k][2]; $body = $chunks[$k]
  $head = "/* " + $name + " — " + $desc + "`n   (예전 한 파일 main.js 의 " + ($starts[$k] + 1) + "~" + $starts[$k + 1] + "줄. 파일 순서가 곧 실행 순서다 — index.html 참고) */`n"
  if($k -eq 0){ $body = $body.Substring($body.IndexOf("`n") + 1); }
  $out = '"use strict";' + "`n" + $head + $body.TrimEnd("`n") + "`n"
  [IO.File]::WriteAllText((Join-Path $APP $name), $out, $UTF8)
  $tags += '<script src="js/app/' + $name + '"></script>'
  "{0,-20} {1,6}줄  {2}" -f $name, ($starts[$k + 1] - $starts[$k]), $desc.Substring(0, [Math]::Min(40, $desc.Length))
}

$idx = Join-Path $ROOT 'site\index.html'
$h = [IO.File]::ReadAllText($idx, [Text.Encoding]::UTF8)
$old = '<script src="js/app/main.js"></script>'
if(([regex]::Matches($h, [regex]::Escape($old))).Count -ne 1){ throw 'index.html 에서 main.js 태그를 찾지 못함' }
$h = $h.Replace($old, ($tags -join "`n"))
[IO.File]::WriteAllText($idx, $h, $UTF8)
Remove-Item -LiteralPath $SRC
"완료 : main.js → {0}개 파일, index.html 의 태그를 바꿈" -f $parts.Count
