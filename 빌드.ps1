# 빌드 — 한 번에 만들고, 지금까지 실제로 났던 사고를 자동으로 잡는다
#
#   pwsh -File 빌드.ps1            빌드 + 검사 + 깃허브_올릴파일 에 복사
#   pwsh -File 빌드.ps1 -NoCopy    빌드 + 검사만 (복사하지 않음)
#
#   기준벡터(생성물\aivec_new.json)는 만들지 않는다 — 브라우저에서 gen.html 로 만든다(약 7분).
#   대신 기준벡터가 지금 사진과 맞지 않으면 빌드를 멈춘다.
#
#   잡는 사고 (전부 실제로 났던 것)
#     · 사진을 옮기거나 더했는데 기준벡터를 다시 안 만듦      → 앱이 옛 이름표로 판별
#     · batches.json 이름이 사진과 어긋남                       → 측정 숫자가 틀어짐 (v72)
#     · model\ 폴더가 남아 있음                                 → 모든 판별이 틀어짐 (2026-09-18)
#     · 3D 작업이 사라짐                                        → apply_all.py 사고 (2026-09-16)
#     · 새 장소를 앱이 모름                                     → 제보가 "범위 밖"으로 거절 (v65·v72)
#     · 파일이 25MB 를 넘음                                     → 깃허브 웹 업로드 불가
#     · .gitattributes 가 사라짐                                → 줄바꿈이 바뀌어 패치가 깨짐
param([switch]$NoCopy)
$ErrorActionPreference = 'Stop'
$ROOT = $PSScriptRoot
$PHOTO = Join-Path $ROOT '사진원본'
$VEC   = Join-Path $ROOT '생성물\aivec_new.json'
$SRC   = Join-Path $ROOT 'index.html'
$OUT   = Join-Path $ROOT 'index_new.html'
$AIVEC = Join-Path $ROOT 'aivec.js'
$DEPLOY= Join-Path $ROOT '깃허브_올릴파일'
$LOG   = Join-Path $ROOT '빌드기록.txt'
$EDGE  = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$PORT  = 8080

$script:fails = New-Object System.Collections.ArrayList
$script:warns = New-Object System.Collections.ArrayList
function Ok($m)   { Write-Host "    [통과] $m" -ForegroundColor Green }
function Bad($m)  { Write-Host "    [실패] $m" -ForegroundColor Red;    [void]$script:fails.Add($m) }
function Warn($m) { Write-Host "    [주의] $m" -ForegroundColor Yellow; [void]$script:warns.Add($m) }
function Step($m) { Write-Host ""; Write-Host "[$m]" -ForegroundColor Cyan }
function Stop-IfFailed(){
  if($script:fails.Count){
    Write-Host ""; Write-Host "빌드를 멈춥니다 — 위의 [실패] 를 먼저 고치세요." -ForegroundColor Red
    exit 1
  }
}
$t0 = Get-Date

# ═══ 1. 빌드 전에 확인 ═══════════════════════════════════════════
Step '1/5 빌드 전 확인'

if(Test-Path (Join-Path $ROOT 'model')){
  Bad "model\ 폴더가 있습니다. 앱이 이 로컬 모델을 먼저 써서 모든 판별이 틀어집니다 (tfhub 모델과 값이 다름)."
} else { Ok 'model\ 폴더 없음' }

$ga = Join-Path $ROOT '.gitattributes'
if((Test-Path $ga) -and ((Get-Content $ga -Raw) -match '(?m)^\*\s+-text')){ Ok '.gitattributes 줄바꿈 보호' }
else { Bad '.gitattributes 의 "* -text" 가 없습니다. git 이 줄바꿈을 바꿔 패치가 깨집니다.' }

if(-not (Test-Path $VEC)){ Bad "기준벡터가 없습니다 : 생성물\aivec_new.json — gen.html 로 만드세요." }
Stop-IfFailed

# 사진(폴더|이름)과 기준벡터(장소|이름)가 같은 짝인지 — 옮기기·이름 바꾸기까지 잡는다
Write-Host "    사진과 기준벡터를 맞춰 보는 중…" -ForegroundColor DarkGray
$disk = @{}
Get-ChildItem $PHOTO -Recurse -File | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png)$' } | ForEach-Object {
  $rel = $_.FullName.Substring($PHOTO.Length).TrimStart('\')
  $disk[($rel.Split('\')[0] + '|' + $_.Name)] = 1
}
$vj = [System.IO.File]::ReadAllText($VEC, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$vec = @{}
for($i=0; $i -lt $vj.names.Count; $i++){ $vec[($vj.codes[$i] + '|' + $vj.names[$i])] = 1 }
$onlyDisk = @($disk.Keys | Where-Object { -not $vec.ContainsKey($_) })
$onlyVec  = @($vec.Keys  | Where-Object { -not $disk.ContainsKey($_) })
if($onlyDisk.Count -or $onlyVec.Count){
  Bad ("기준벡터가 지금 사진과 다릅니다 — 새로 생긴 사진 {0}장 · 없어진(옮겨진) 사진 {1}장" -f $onlyDisk.Count, $onlyVec.Count)
  $onlyDisk | Select-Object -First 3 | ForEach-Object { Write-Host "        + $_" -ForegroundColor DarkGray }
  $onlyVec  | Select-Object -First 3 | ForEach-Object { Write-Host "        - $_" -ForegroundColor DarkGray }
  Write-Host "      → preview.ps1 을 켜고 http://localhost:$PORT/gen.html 에서 「생성 시작」 후 다시 빌드하세요." -ForegroundColor Yellow
} else { Ok ("사진 {0}장 = 기준벡터 {0}장 (폴더·이름까지 일치)" -f $disk.Count) }

$bj = [System.IO.File]::ReadAllText((Join-Path $ROOT 'batches.json'), [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$bnames = @{}; $bj.PSObject.Properties | ForEach-Object { $bnames[$_.Name] = 1 }
$dnames = @{}; $disk.Keys | ForEach-Object { $dnames[$_.Split('|',2)[1]] = 1 }
$bOnly = @($bnames.Keys | Where-Object { -not $dnames.ContainsKey($_) })
$dOnly = @($dnames.Keys | Where-Object { -not $bnames.ContainsKey($_) })
if($bOnly.Count -or $dOnly.Count){
  Bad ("batches.json 이 사진과 어긋납니다 — 표에만 {0}장 · 사진에만 {1}장. 측정 숫자가 틀어집니다." -f $bOnly.Count, $dOnly.Count)
} else { Ok ("batches.json = 사진 {0}장" -f $bnames.Count) }
Stop-IfFailed

# ═══ 2. 빌드 ════════════════════════════════════════════════════
Step '2/5 빌드'
& pwsh -NoProfile -File (Join-Path $ROOT '도구\patch_v58.ps1') | Out-Null
if($LASTEXITCODE -ne 0){ Bad 'patch_v58.ps1 이 실패했습니다.'; Stop-IfFailed }
Ok ('index_new.html · aivec.js 생성')

# ═══ 3. 결과 파일 검사 ══════════════════════════════════════════
Step '3/5 결과 파일 검사'
$html = [System.IO.File]::ReadAllText($OUT, [System.Text.Encoding]::UTF8)

$tag = ([regex]::Matches($html, [regex]::Escape('<script src="aivec.js"></script>'))).Count
if($tag -eq 1){ Ok 'aivec.js 연결 1곳' } else { Bad "aivec.js 연결이 $tag 곳입니다 (1곳이어야 함)" }

# 3D : 2026-09-16 apply_all.py 사고 때 3D 가 통째로 사라졌다. 그때 확인한 기준 — v1xx 주석 36종.
$v1 = ([regex]::Matches($html, '/\* v1\d\d') | ForEach-Object { $_.Value } | Sort-Object -Unique).Count
$th = ([regex]::Matches($html, 'THREE')).Count
if($v1 -ge 36 -and $th -ge 400){ Ok "3D 작업 그대로 (v1xx 주석 $v1 종 · THREE $th 곳)" }
else { Bad "3D 작업이 사라졌습니다 (v1xx 주석 $v1 종 · THREE $th 곳) — apply_all.py 를 쓰지 않았는지 확인하세요." }

foreach($f in @($OUT, $AIVEC)){
  $mb = (Get-Item $f).Length / 1MB
  $nm = Split-Path $f -Leaf
  if($mb -ge 25){ Bad ("{0} 이 {1:N1}MB — 깃허브 웹 업로드 한계(25MB)를 넘습니다" -f $nm, $mb) }
  elseif($mb -ge 23){ Warn ("{0} 이 {1:N1}MB — 25MB 한계에 가깝습니다" -f $nm, $mb) }
  else { Ok ("{0} {1:N1}MB" -f $nm, $mb) }
}
Stop-IfFailed

# ═══ 4. 빌드한 앱을 실제로 띄워 검사 ════════════════════════════
Step '4/5 빌드한 앱을 띄워 검사 (Edge 헤드리스 → eval_build.html)'
$up = $false
try { $r = Invoke-WebRequest "http://localhost:$PORT/eval_build.html" -UseBasicParsing -TimeoutSec 3 -Method Head; $up = ($r.StatusCode -eq 200) } catch {}
if(-not $up){
  Bad "미리보기 서버가 꺼져 있습니다 — 미리보기_실행.bat 을 켜고 다시 빌드하세요. (이 검사를 건너뛰면 v65 같은 사고를 못 잡습니다)"
} elseif(-not (Test-Path $EDGE)){
  Warn "Edge 를 찾지 못해 브라우저 검사를 건너뜁니다 : $EDGE"
} else {
  $prof = Join-Path $env:TEMP 'b3nav_buildcheck_profile'
  $dom = & $EDGE --headless=new --disable-gpu --no-first-run "--user-data-dir=$prof" `
           --virtual-time-budget=120000 --dump-dom "http://localhost:$PORT/eval_build.html" 2>$null | Out-String
  $m = [regex]::Match($dom, '(?s)<pre id="R">(.*?)</pre>')
  if(-not $m.Success){ Bad '검사 결과를 읽지 못했습니다 (eval_build.html)' }
  else {
    $txt = $m.Groups[1].Value.Replace('&lt;','<').Replace('&gt;','>').Replace('&amp;','&')
    try { $res = $txt | ConvertFrom-Json } catch { $res = $null }
    if(-not $res){ Bad ("검사 결과가 JSON 이 아닙니다 : " + $txt.Substring(0, [Math]::Min(120, $txt.Length))) }
    elseif($res.error){ Bad ("검사 실패 : " + $res.error) }
    else {
      $names = @{ scope='제보 접수 범위(SCOPE.allow)'; label='한글 이름(codeLabel)'; floor='층 계산(floorOf)';
                  adminFloor='관리자 화면 층 묶음'; adminPick='관리자가 고를 수 있는 목록' }
      foreach($k in 'scope','label','floor','adminFloor','adminPick'){
        $list = @($res.bad.$k)
        if($list.Count){ Bad ("{0}에 빠진 장소 {1}곳 : {2}" -f $names[$k], $list.Count, ($list -join ', ')) }
      }
      if($res.ok){ Ok ("장소 {0}곳 모두 — 접수·이름·층·관리자 목록 통과 (사진 {1}장 · 벡터 {2}개)" -f $res.places, $res.photos, $res.vectors) }
      if(-not $res.three){ Bad '앱 안에서 3D 엔진(THREE)이 로드되지 않았습니다' }
    }
  }
}
Stop-IfFailed

# ═══ 5. 올릴 파일 준비 ══════════════════════════════════════════
Step '5/5 올릴 파일'
$h1 = (Get-FileHash $OUT -Algorithm SHA256).Hash.Substring(0,12)
$h2 = (Get-FileHash $AIVEC -Algorithm SHA256).Hash.Substring(0,12)
if($NoCopy){ Ok '복사하지 않음 (-NoCopy)' }
else {
  if(-not (Test-Path $DEPLOY)){ New-Item -ItemType Directory -Path $DEPLOY | Out-Null }
  Copy-Item $OUT   (Join-Path $DEPLOY 'index.html') -Force
  Copy-Item $AIVEC (Join-Path $DEPLOY 'aivec.js')   -Force
  Ok '깃허브_올릴파일\index.html · aivec.js'
}
$commit = ''
try { $commit = (& git -C $ROOT rev-parse --short HEAD 2>$null) } catch {}
$dirty = ''
try { if((& git -C $ROOT status --porcelain 2>$null)){ $dirty = ' (커밋 안 한 변경 있음)' } } catch {}
$secs = [int]((Get-Date) - $t0).TotalSeconds
$line = "{0:yyyy-MM-dd HH:mm}  index {1}  aivec {2}  git {3}{4}  경고 {5}  {6}초" -f (Get-Date), $h1, $h2, $commit, $dirty, $warns.Count, $secs
Add-Content -Path $LOG -Value $line -Encoding UTF8

Write-Host ""
Write-Host ("빌드 완료 — {0}초 · 경고 {1}건" -f $secs, $warns.Count) -ForegroundColor Green
Write-Host "  $line" -ForegroundColor DarkGray
