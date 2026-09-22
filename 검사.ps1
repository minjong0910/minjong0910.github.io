# 검사 — 앱(site\)을 고친 뒤, 올리기 전에 돌린다
#
#   pwsh -File 검사.ps1          파일 검사 + 브라우저 검사(앱 검사 · 안전망 비교)   약 1분
#   pwsh -File 검사.ps1 -Full    + 1인칭 로드뷰 9가지 끝까지 재생                    약 5분 더
#   pwsh -File 검사.ps1 -Quick   파일 검사만 (브라우저 없이)                          몇 초
#
#   브라우저 검사는 미리보기 서버(미리보기_실행.bat, 8080)가 켜져 있어야 한다.
#   하나라도 [실패] 가 있으면 끝에서 멈추고 1 을 돌려준다. 결과는 검사기록.txt 에 한 줄씩 남는다.
#
#   검사마다 막는 사고 (괄호 = 실제로 났던 때)
#     파일이 모두 있는가          화면 틀이 부르는 파일·사진 목록의 사진이 빠짐
#     장소 목록 = AI 자료         aivec.js 만 새로 만들고 places.js 를 잊음 → 관리자 목록에서 장소가 빠짐 (v75)
#     함수 이름 한 번씩           같은 이름이 둘이면 뒤의 것이 앞의 것을 조용히 덮는다 (sugFloorPick v74, fpExitSignTex)
#     코드에 비밀번호 없음        관리자 비밀번호가 코드에 적혀 있었다 (v84 에서 발견)
#     가짜 진행 문구 없음         부팅 화면의 KERNEL LOADED · 보안 프로토콜 PASS (v85 에서 없앰)
#     그림을 글자로 박지 않음      사진·그림을 base64 로 박아 앱이 18MB 가 됐다
#     첫 화면 1MB 이하(압축)       예전 16MB
#     앱 검사(tests/check.html)   152곳 접수·이름·층·관리자 목록·3D·길찾기·실사 3D·후보 지도 (v65·v72·v75·v79)
#     안전망(tests/golden)        길안내 754가지·사진·화면·CSS·3D 그림 15장이 기록과 같은가
#   pwsh -File 검사.ps1 -Ci      GitHub 자동 검사용 — 다른 컴퓨터라 글꼴·그래픽이 달라, 안전망에서 글자 폭·3D 그림 비교를 뺀다
param([switch]$Full, [switch]$Quick, [switch]$Ci, [string]$Tag = 'v87', [int]$Port = 8080)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ROOT = $PSScriptRoot
$SITE = Join-Path $ROOT 'site'
$fails = New-Object System.Collections.ArrayList; $warns = New-Object System.Collections.ArrayList
function Ok($m)   { Write-Host "    [통과] $m" -ForegroundColor Green }
function Bad($m)  {
  Write-Host "    [실패] $m" -ForegroundColor Red; [void]$fails.Add($m)
  # GitHub 자동 검사에서는 실패 이유를 요약(annotation)에 남긴다 — 로그를 열지 않아도 보이게
  if($env:GITHUB_ACTIONS -eq 'true'){ Write-Host ("::error title=검사 실패::" + ($m -replace "`r?`n", ' / ')) }
}
function Warn($m) { Write-Host "    [주의] $m" -ForegroundColor Yellow; [void]$warns.Add($m) }
function Step($m) { Write-Host ""; Write-Host "[$m]" -ForegroundColor Cyan }
function Rel($p)  { $p.Substring($SITE.Length + 1) -replace '\\', '/' }
$t0 = Get-Date
$UTF = [Text.Encoding]::UTF8

# ═══ 1. 파일 검사 ═══════════════════════════════════════════════
Step '1 파일 검사'

$ga = Join-Path $ROOT '.gitattributes'
if((Test-Path $ga) -and ((Get-Content $ga -Raw) -match '(?m)^\*\s+-text')){ Ok '.gitattributes 줄바꿈 보호' } else { Bad '.gitattributes 의 "* -text" 가 없습니다 (git 이 줄바꿈을 바꾼다)' }
if((Test-Path (Join-Path $ROOT 'model')) -or (Test-Path (Join-Path $SITE 'model'))){ Bad 'model\ 폴더가 있습니다 — 앱이 이 로컬 모델을 먼저 써서 판별이 틀어진다 (tfhub 모델과 값이 다름)' } else { Ok 'model\ 폴더 없음' }

# 화면 틀이 부르는 파일
$html = [IO.File]::ReadAllText((Join-Path $SITE 'index.html'), $UTF)
$refs = [regex]::Matches($html, '(?:src|href)="([^"#?]+)"') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notmatch '^(https?:|data:|mailto:|javascript:)' } | Sort-Object -Unique
$miss = @($refs | Where-Object { -not (Test-Path (Join-Path $SITE ($_ -replace '/', '\'))) })
if($miss.Count){ Bad ("index.html 이 부르는 파일이 없습니다 : " + ($miss -join ', ')) } else { Ok ("index.html 이 부르는 파일 {0}개 모두 있음" -f $refs.Count) }

# 사진 목록 ↔ 사진 파일
$pj = [IO.File]::ReadAllText((Join-Path $SITE 'data\photos.js'), $UTF)
$idx = $pj.Substring($pj.IndexOf('=') + 1).Trim().TrimEnd(';') | ConvertFrom-Json
$used = @{}; $nPh = 0; $missPh = @()
foreach($p in $idx.PSObject.Properties){ foreach($e in $p.Value){ $nPh++; $used[$e.u] = 1; if(-not (Test-Path (Join-Path $SITE ($e.u -replace '/', '\')))){ $missPh += $e.u } } }
if($missPh.Count){ Bad ("사진 목록에 있는데 파일이 없는 사진 {0}장 : {1}" -f $missPh.Count, (($missPh | Select-Object -First 5) -join ', ')) } else { Ok ("사진 {0}곳 · {1}장 — 파일이 모두 있음" -f @($idx.PSObject.Properties).Count, $nPh) }
$orphan = @(Get-ChildItem (Join-Path $SITE 'data\photos') -Recurse -File | ForEach-Object { Rel $_.FullName } | Where-Object { -not $used.ContainsKey($_) })
if($orphan.Count){ Warn ("목록에 없는 사진 파일 {0}개 (지워도 된다) : {1}" -f $orphan.Count, (($orphan | Select-Object -First 3) -join ', ')) }

# 장소 목록 = AI 자료의 장소
$av = [IO.File]::ReadAllText((Join-Path $SITE 'data\aivec.js'), $UTF)
$codesAt = $av.IndexOf('"codes":['); $codesEnd = $av.IndexOf(']', $codesAt)
$aCodes = ($av.Substring($codesAt + 9, $codesEnd - $codesAt - 9) -split ',') | ForEach-Object { $_.Trim('"').ToUpper() } | Sort-Object -Unique
$pl = [IO.File]::ReadAllText((Join-Path $SITE 'data\places.js'), $UTF)
$pCodes = ($pl.Substring($pl.IndexOf('[') + 1, $pl.LastIndexOf(']') - $pl.IndexOf('[') - 1) -split ',') | ForEach-Object { $_.Trim().Trim('"').ToUpper() } | Sort-Object -Unique
if((@($aCodes) -join ',') -ne (@($pCodes) -join ',')){ Bad 'data\places.js 가 AI 자료(aivec.js)의 장소와 다릅니다 — 도구\AI자료_넣기.ps1 로 다시 만드세요' } else { Ok ("장소 목록 {0}곳 = AI 자료의 장소" -f @($aCodes).Count) }

# 코드 파일 읽기
$codeFiles = @(Get-ChildItem (Join-Path $SITE 'js\app') -Filter *.js) + @(Get-Item (Join-Path $SITE 'index.html')) + @(Get-ChildItem (Join-Path $SITE 'css') -Filter *.css) + @(Get-Item (Join-Path $SITE '3d\realistic.html'))
$src = @{}; foreach($f in $codeFiles){ $src[(Rel $f.FullName)] = [IO.File]::ReadAllText($f.FullName, $UTF) }

# 함수 이름이 한 번씩인가 (앱 코드 전체에서 — 한 전역 공간을 같이 쓴다)
$defs = @{}
foreach($k in $src.Keys | Where-Object { $_ -like 'js/app/*' }){
  foreach($m in [regex]::Matches($src[$k], '(?m)^function\s+([A-Za-z_$][\w$]*)\s*\(')){ $n = $m.Groups[1].Value; if(-not $defs[$n]){ $defs[$n] = @() }; $defs[$n] += $k }
  foreach($m in [regex]::Matches($src[$k], '(?m)^var\s+([A-Z][A-Za-z0-9_$]*)\s*=\s*\(function')){ $n = $m.Groups[1].Value; if(-not $defs[$n]){ $defs[$n] = @() }; $defs[$n] += $k }
}
$dup = @($defs.Keys | Where-Object { $defs[$_].Count -gt 1 })
if($dup.Count){ Bad ("같은 이름의 함수가 두 번 : " + (($dup | ForEach-Object { $_ + '(' + ($defs[$_] -join ',') + ')' }) -join ' · ')) } else { Ok ("최상위 함수 {0}개 — 이름이 모두 한 번씩" -f $defs.Count) }

# 코드에 비밀번호 · 가짜 진행 문구 · 박은 그림
$secret = @(); $fake = @(); $blob = @()
foreach($k in $src.Keys){
  $t = $src[$k]
  foreach($m in [regex]::Matches($t, "(?i)\b(?:[A-Z_]*PW|[A-Z_]*PASS(?:WORD)?|[A-Z_]*PIN)\s*=\s*['""][^'""]{4,}['""]")){ $secret += ($k + ' : ' + $m.Value) }
  foreach($m in [regex]::Matches($t, "['""][^'""\n]*(KERNEL LOADED|BIM 데이터|보안 프로토콜|무결성 검사|SYSTEM BOOT)[^'""\n]*['""]")){ $fake += ($k + ' : ' + $m.Value) }
  foreach($m in [regex]::Matches($t, 'data:(?:image|font|audio)/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]{2000,}')){ $blob += ('{0} ({1:N0}자)' -f $k, $m.Length) }
}
if($secret.Count){ Bad ("코드에 비밀번호처럼 보이는 값 : " + ($secret -join ' · ')) } else { Ok '코드에 비밀번호 없음' }
if($fake.Count){ Bad ("하지 않는 일을 했다고 보여 주는 문구 : " + ($fake -join ' · ')) } else { Ok '가짜 진행 문구 없음' }
if($blob.Count){ Bad ("그림·글꼴을 글자(base64)로 박은 곳 — 파일로 빼세요 : " + ($blob -join ' · ')) } else { Ok '그림을 글자로 박은 곳 없음' }

# 첫 화면에 받는 양 (압축 기준) — index.html 과 그 안에서 바로 부르는 우리 파일
function GzLen([string]$p){ $b = [IO.File]::ReadAllBytes($p); $ms = New-Object IO.MemoryStream; $g = New-Object IO.Compression.GZipStream($ms, [IO.Compression.CompressionLevel]::Optimal); $g.Write($b, 0, $b.Length); $g.Close(); return $ms.ToArray().Length }
$first = @('index.html') + @($refs | Where-Object { $_ -match '\.(js|css)$' })
$raw = 0; $gz = 0
foreach($r in $first){ $p = Join-Path $SITE ($r -replace '/', '\'); $raw += (Get-Item $p).Length; $gz += GzLen $p }
$msg = "첫 화면에 받는 우리 파일 {0}개 : 압축 {1:N0} KB (원래 {2:N0} KB) — 한도 1,000 KB · 글꼴(CDN)은 따로" -f $first.Count, ($gz / 1KB), ($raw / 1KB)
if($gz -gt 1000KB){ Bad $msg } else { Ok $msg }
$big = @(Get-ChildItem $SITE -Recurse -File | Where-Object { $_.Length -gt 50MB })
if($big.Count){ Bad ("50MB 가 넘는 파일 (GitHub 한도 100MB) : " + (($big | ForEach-Object { Rel $_.FullName }) -join ', ')) }

# ═══ 2. 브라우저 검사 ═══════════════════════════════════════════
if(-not $Quick){
  Step '2 브라우저 검사 (Edge 헤드리스)'
  $up = $false
  try { $r = Invoke-WebRequest "http://localhost:$Port/site/index.html" -UseBasicParsing -TimeoutSec 3 -Method Head; $up = ($r.StatusCode -eq 200) } catch {}
  if(-not $up){ Bad "미리보기 서버가 꺼져 있습니다 — 미리보기_실행.bat 을 켜고 다시 하세요 (브라우저 검사를 건너뛰면 실제 사고를 못 잡는다)" }
  else {
    $tests = @(
      [pscustomobject]@{ name = '앱 검사'; file = 'tests\run_check.ps1'; args = @() },
      [pscustomobject]@{ name = ('안전망 비교 (' + $Tag + $(if($Ci){ ' · 글자 폭·그림 제외' } else { '' }) + ')'); file = 'tests\run_golden.ps1'; args = @('-Mode', 'compare', '-Tag', $Tag) + $(if($Ci){ @('-Parts', 'ci') } else { @() }) }
    )
    if($Full){ $tests += [pscustomobject]@{ name = '로드뷰 9가지 끝까지 재생'; file = 'tests\run_roadview.ps1'; args = @() } }
    foreach($t in $tests){
      Write-Host ("    … {0}" -f $t.name) -ForegroundColor DarkGray
      $argv = @('-NoProfile', '-File', (Join-Path $ROOT $t.file)) + $t.args
      $o = & pwsh @argv 2>&1 | Out-String
      if($LASTEXITCODE -eq 0){ Ok ($t.name + ' — ' + ((($o -split "`n") | Where-Object { $_.Trim() } | Select-Object -Last 1).Trim())) }
      else {
        $why = @(($o -split "`n") | Where-Object { $_ -match '✗|실패|빠짐|생김|오류|결과|    ' } | Select-Object -First 12 | ForEach-Object { $_.Trim() })
        Bad ($t.name + ' 실패' + $(if($why.Count){ ' — ' + (($why | Select-Object -First 6) -join ' / ') } else { '' }))
        $why | ForEach-Object { Write-Host "        $_" -ForegroundColor DarkGray }
      }
    }
  }
}

# ═══ 끝 ══════════════════════════════════════════════════════════
$secs = [int]((Get-Date) - $t0).TotalSeconds
$git = ''; try { $git = (& git -C $ROOT rev-parse --short HEAD 2>$null); if(& git -C $ROOT status --porcelain 2>$null){ $git += ' (커밋 안 한 변경 있음)' } } catch {}
$line = "{0}  실패 {1} · 주의 {2} · {3}초 · git {4}{5}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), $fails.Count, $warns.Count, $secs, $git, $(if($Full){' · 전체'} elseif($Quick){' · 파일만'} else {''})
try { Add-Content -Path (Join-Path $ROOT '검사기록.txt') -Value $line -Encoding UTF8 } catch {}
Write-Host ""
if($fails.Count){ Write-Host ("검사 실패 — [실패] {0}건을 먼저 고치세요 ({1}초)" -f $fails.Count, $secs) -ForegroundColor Red; exit 1 }
Write-Host ("검사 통과 — 실패 0 · 주의 {0} ({1}초)" -f $warns.Count, $secs) -ForegroundColor Green
exit 0
