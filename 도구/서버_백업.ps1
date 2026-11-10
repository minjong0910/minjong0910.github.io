# 서버 백업 — 승인 사진(photos) · 고친 방 정보(rooms)를 이 PC 에 내려받아 둔다 (2026-11-10 외부 점검 I-4)
#
#   pwsh -File 도구\서버_백업.ps1          → 생성물\백업\<날짜_시각>\ 에 photos.json · rooms.json · 사진 파일 · 목록.txt
#   pwsh -File 도구\서버_백업.ps1 -Check   → 가장 최근 백업을 다시 읽어 「되살릴 수 있는가」를 시험한다
#                                            (사진마다 그림으로 열리는지 · 장수가 목록과 같은지 · 방 정보가 읽히는지)
#
#   · 누구나 읽을 수 있는 두 컬렉션만 받는다 — 앱이 쓰는 것과 같은 공개 읽기(REST)라 로그인 · 비밀번호가 필요 없다.
#     서버에는 아무것도 쓰지 않는다.
#   · 관리자만 읽는 것(suggestions 제보 · roomlog · adminlog 기록)은 이 도구로 못 받는다 — 문서\설계_배포_복구.txt 7절.
#   · 생성물\ 은 저장소에 올리지 않는다(.gitignore). 백업 폴더는 USB · 클라우드 드라이브에 따로 옮겨 둔다.
#   · 프로젝트 이름 · 공개 키는 앱 코드(site\js\app\sugdb.js 의 CFG)에서 읽는다 — 여기 따로 적지 않는다.
param([switch]$Check, [string]$Out = '')
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ROOT = Split-Path $PSScriptRoot -Parent
$BAK  = Join-Path $ROOT '생성물\백업'

function Field($f, $k){ if($f -and $f.PSObject.Properties[$k]){ $v = $f.$k; foreach($t in 'stringValue', 'integerValue', 'doubleValue', 'booleanValue'){ if($v.PSObject.Properties[$t]){ return $v.$t } } }; return $null }

if($Check){
  $last = Get-ChildItem $BAK -Directory -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -Last 1
  if(-not $last){ Write-Host '백업이 없습니다 — 먼저 -Check 없이 돌리세요' -ForegroundColor Red; exit 1 }
  Add-Type -AssemblyName System.Drawing
  $bad = @()
  $ph = Get-Content (Join-Path $last.FullName 'photos.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  $nImg = 0; $nHide = 0
  foreach($d in @($ph)){
    $f = $d.fields
    if((Field $f 'hide') -eq $true){ $nHide++; continue }
    $u = [string](Field $f 'u'); $code = [string](Field $f 'code')
    if($u -notmatch '^data:image/(jpeg|png|webp);base64,(.+)$'){ $bad += "$code : 사진 값 모양이 다름"; continue }
    try {
      $b = [Convert]::FromBase64String($Matches[2]); $ms = New-Object IO.MemoryStream(,$b)
      $im = [Drawing.Image]::FromStream($ms); if($im.Width -lt 8){ $bad += "$code : 그림이 너무 작음" }; $im.Dispose(); $nImg++
    } catch { $bad += "$code : 그림으로 안 열림" }
  }
  $rm = Get-Content (Join-Path $last.FullName 'rooms.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  $nRoom = @($rm).Count
  $said = Get-Content (Join-Path $last.FullName '목록.txt') -Encoding UTF8
  $want = [regex]::Match(($said -join "`n"), '승인 사진 (\d+)장').Groups[1].Value
  if($want -and [int]$want -ne $nImg){ $bad += "목록에는 사진 $want 장인데 열린 것은 $nImg 장" }
  if($bad.Count){ Write-Host ('복원 시험 실패 (' + $last.Name + ') : ' + ($bad -join ' / ')) -ForegroundColor Red; exit 1 }
  Write-Host ("복원 시험 통과 ({0}) — 승인 사진 {1}장 모두 그림으로 열림 · 숨김 기록 {2}개 · 방 정보 {3}개 읽힘" -f $last.Name, $nImg, $nHide, $nRoom) -ForegroundColor Green
  exit 0
}

$src = Get-Content (Join-Path $ROOT 'site\js\app\sugdb.js') -Raw -Encoding UTF8
$key  = [regex]::Match($src, 'apiKey:\s*"([^"]+)"').Groups[1].Value
$proj = [regex]::Match($src, 'projectId:\s*"([^"]+)"').Groups[1].Value
if(-not $key -or -not $proj){ throw 'sugdb.js 에서 Firebase 설정(apiKey · projectId)을 찾지 못했습니다' }
$base = "https://firestore.googleapis.com/v1/projects/$proj/databases/(default)/documents"

function Pull([string]$col){
  $all = New-Object System.Collections.ArrayList; $tok = ''
  do {
    $url = "$base/$col" + '?pageSize=100&key=' + [uri]::EscapeDataString($key) + $(if($tok){ '&pageToken=' + [uri]::EscapeDataString($tok) } else { '' })
    $r = Invoke-RestMethod -Uri $url -TimeoutSec 60
    if($r.PSObject.Properties['documents']){ foreach($d in $r.documents){ [void]$all.Add($d) } }
    $tok = if($r.PSObject.Properties['nextPageToken']){ $r.nextPageToken } else { '' }
  } while($tok)
  return ,$all
}

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$dir = if($Out){ $Out } else { Join-Path $BAK $stamp }
New-Item -ItemType Directory -Force (Join-Path $dir '사진') | Out-Null

$photos = Pull 'photos'
$rooms  = Pull 'rooms'
# -InputObject : 비어 있어도(방 정보를 아직 안 고쳤으면 0개) 「[]」 를 쓴다 — 파이프로 넘기면 빈 목록은 파일이 안 생긴다
(ConvertTo-Json -InputObject @($photos) -Depth 20) | Set-Content (Join-Path $dir 'photos.json') -Encoding UTF8
(ConvertTo-Json -InputObject @($rooms)  -Depth 20) | Set-Content (Join-Path $dir 'rooms.json')  -Encoding UTF8

$n = 0; $hide = 0; $bytes = 0; $lines = @()
foreach($d in $photos){
  $f = $d.fields; $id = ($d.name -split '/')[-1]
  if((Field $f 'hide') -eq $true){ $hide++; $lines += ('숨김  {0}  {1}' -f (Field $f 'code'), (Field $f 'n')); continue }
  $u = [string](Field $f 'u')
  if($u -match '^data:image/(jpeg|png|webp);base64,(.+)$'){
    $ext = @{ jpeg = 'jpg'; png = 'png'; webp = 'webp' }[$Matches[1]]
    $b = [Convert]::FromBase64String($Matches[2]); $bytes += $b.Length
    $safe = ('{0}_{1}' -f (Field $f 'code'), $id) -replace '[^\w\-가-힣]', '_'
    [IO.File]::WriteAllBytes((Join-Path $dir "사진\$safe.$ext"), $b); $n++
    $lines += ('사진  {0}  {1}  {2}KB  {3}' -f (Field $f 'code'), (Field $f 'n'), [int]($b.Length / 1024), (Field $f 'cap'))
  } else { $lines += ('이상  {0}  사진 값 모양이 다름' -f $id) }
}
$head = @(
  "서버 백업 — $stamp (도구\서버_백업.ps1)",
  "프로젝트 $proj",
  ("승인 사진 {0}장 ({1:N1}MB) · 숨김 기록 {2}개 · 방 정보 {3}개" -f $n, ($bytes / 1MB), $hide, $rooms.Count),
  '되살리기 : 문서\설계_배포_복구.txt 7절',
  '')
($head + $lines) | Set-Content (Join-Path $dir '목록.txt') -Encoding UTF8
Write-Host ("백업 완료 → {0}" -f $dir) -ForegroundColor Green
Write-Host ("  승인 사진 {0}장 ({1:N1}MB) · 숨김 기록 {2}개 · 방 정보 {3}개" -f $n, ($bytes / 1MB), $hide, $rooms.Count)
Write-Host '  다음 : pwsh -File 도구\서버_백업.ps1 -Check  (되살릴 수 있는지 시험)'
