# AI 기준 자료를 앱에 넣는다 — gen.html 이 만든 생성물\aivec_new.json → site\data\aivec.js + places.js
#
#   순서 : ① 미리보기_실행.bat  ② http://localhost:8080/gen.html 「생성 시작」(약 7분)  ③ 이 도구  ④ 검사.ps1
#
#   넣기 전에 확인하는 것 (둘 다 실제로 났던 사고)
#     · 사진원본\ 의 사진(폴더|이름)과 AI 자료(장소|이름)가 같은 짝인가
#         — 사진을 옮기거나 더하고 AI 자료를 다시 안 만들면, 앱이 옛 이름표로 판별한다
#     · batches.json(촬영 묶음 표)이 사진과 같은가 — 어긋나면 정확도 측정 숫자가 틀어진다 (v72)
#   places.js 는 AI 자료의 장소 이름만 뽑은 작은 목록이다 (앱이 늘 받는 것 — tests/check.html 이 일치를 확인한다).
#
#   사용법 : pwsh -File 도구\AI자료_넣기.ps1
$ErrorActionPreference = 'Stop'
$ROOT  = Split-Path $PSScriptRoot -Parent
$PHOTO = Join-Path $ROOT '사진원본'
$VEC   = Join-Path $ROOT '생성물\aivec_new.json'
$DATA  = Join-Path $ROOT 'site\data'
$UTF8  = New-Object System.Text.UTF8Encoding($false)
if(-not (Test-Path $VEC)){ throw "AI 자료가 없습니다 : 생성물\aivec_new.json — gen.html 로 먼저 만드세요." }
$json = [IO.File]::ReadAllText($VEC, [Text.Encoding]::UTF8)
$vj = $json | ConvertFrom-Json

if(Test-Path $PHOTO){
  $disk = @{}
  Get-ChildItem $PHOTO -Recurse -File | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png)$' } | ForEach-Object {
    $rel = $_.FullName.Substring($PHOTO.Length).TrimStart('\')
    $disk[($rel.Split('\')[0] + '|' + $_.Name)] = 1
  }
  $vec = @{}; for($i = 0; $i -lt $vj.names.Count; $i++){ $vec[($vj.codes[$i] + '|' + $vj.names[$i])] = 1 }
  $onlyDisk = @($disk.Keys | Where-Object { -not $vec.ContainsKey($_) })
  $onlyVec  = @($vec.Keys  | Where-Object { -not $disk.ContainsKey($_) })
  if($onlyDisk.Count -or $onlyVec.Count){
    $onlyDisk | Select-Object -First 3 | ForEach-Object { Write-Host "    + $_" }
    $onlyVec  | Select-Object -First 3 | ForEach-Object { Write-Host "    - $_" }
    throw ("AI 자료가 지금 사진과 다릅니다 — 새 사진 {0}장 · 없어진 사진 {1}장. gen.html 로 다시 만드세요." -f $onlyDisk.Count, $onlyVec.Count)
  }
  Write-Host ("  [통과] 사진 {0}장 = AI 자료 {0}장 (폴더·이름까지)" -f $disk.Count) -ForegroundColor Green
  $bj = [IO.File]::ReadAllText((Join-Path $ROOT 'batches.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
  $bn = @{}; $bj.PSObject.Properties | ForEach-Object { $bn[$_.Name] = 1 }
  $dn = @{}; $disk.Keys | ForEach-Object { $dn[$_.Split('|', 2)[1]] = 1 }
  $b1 = @($bn.Keys | Where-Object { -not $dn.ContainsKey($_) }); $d1 = @($dn.Keys | Where-Object { -not $bn.ContainsKey($_) })
  if($b1.Count -or $d1.Count){ throw ("batches.json 이 사진과 어긋납니다 — 표에만 {0}장 · 사진에만 {1}장" -f $b1.Count, $d1.Count) }
  Write-Host ("  [통과] batches.json = 사진 {0}장" -f $bn.Count) -ForegroundColor Green
} else {
  Write-Host '  [주의] 사진원본\ 이 없어 사진과의 짝 확인을 건너뜁니다 (사진은 저장소에 없다).' -ForegroundColor Yellow
}

[IO.File]::WriteAllText((Join-Path $DATA 'aivec.js'), ('window.AIVEC_DATA=' + $json.Trim() + ';'), $UTF8)
$codes = $vj.codes | ForEach-Object { ([string]$_).ToUpper() } | Sort-Object -Unique
$list = '[' + (($codes | ForEach-Object { '"' + $_ + '"' }) -join ',') + ']'
$head = "/* AI 가 아는 장소 이름 " + $codes.Count + "곳 — data/aivec.js 의 codes 에서 뽑은 것 (도구\AI자료_넣기.ps1 이 만든다).`n" +
        "   관리자 장소 목록처럼 AI 자료 없이 장소 이름만 필요한 곳이 쓴다. tests/check.html 이 aivec.js 와 같은지 확인한다. */`n"
[IO.File]::WriteAllText((Join-Path $DATA 'places.js'), ($head + 'window.PLACE_CODES = ' + $list + ";`n"), $UTF8)
Write-Host ("  [완료] site\data\aivec.js ({0:N0} bytes · 기준 {1}개) · places.js ({2}곳) — 이제 검사.ps1 을 돌리세요" -f (Get-Item (Join-Path $DATA 'aivec.js')).Length, $vj.n, $codes.Count) -ForegroundColor Green
