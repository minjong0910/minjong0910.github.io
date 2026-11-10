# 구조도 줄 수 맞추기 — 도구\구조도_틀.html 의 파일 블록(「파일이름 · N줄」)을 실제 줄 수로 고친 뒤 구조도를 다시 만든다 (2026-11-10)
#
#   pwsh -File 도구\구조도_줄수_맞추기.ps1
#
# 왜 : site/ 를 고칠 때마다 검사.ps1 이 「구조도의 줄 수가 실제와 다름」으로 실패했다 — 매번 손으로 숫자를 고쳤다.
# 줄 수는 검사.ps1 과 같은 방법으로 센다 (줄바꿈 \n 으로 나눈 조각 수 = 마지막 줄바꿈 뒤 빈 줄까지 하나로 센다).
# 이름이 같은 파일이 둘이면(photos.js = 앱 코드 · 사진 목록) 검사.ps1 과 같은 차례(site\js\app → site → site\css)로 먼저 찾은 것을 쓴다.
# roadview*.js 처럼 묶은 칸은 따로 센다.
$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$TPL  = Join-Path $PSScriptRoot '구조도_틀.html'
$site = Join-Path $ROOT 'site'
$s = [IO.File]::ReadAllText($TPL, [Text.Encoding]::UTF8)
function Lines([string]$p){ return ([IO.File]::ReadAllText($p) -split "`n").Count }
$changed = @()
$rx = [regex]'(<span class="n">)([^<]+?)(</span><span class="d">)([\d,]+)줄'
$s = $rx.Replace($s, {
  param($m)
  $name = $m.Groups[2].Value.Trim()
  $num  = [int]($m.Groups[4].Value -replace ',', '')
  $new  = $null
  if($name -eq 'roadview*.js'){
    $new = (Get-ChildItem (Join-Path $site 'js\app') -Filter 'roadview*.js' | ForEach-Object { Lines $_.FullName } | Measure-Object -Sum).Sum
  } elseif($name -match '^[\w\-.]+\.(js|html|css)$'){
    # 검사.ps1 「구조도 블록도에 적힌 줄 수」와 같은 차례 — 2026-11-10 : 이름이 하나뿐인 것만 고쳤더니 photos.js 를 빠뜨렸다
    foreach($w in @('site\js\app', 'site', 'site\css', '서버', '.')){
      $p = Join-Path $ROOT (Join-Path $w $name)
      if(Test-Path -LiteralPath $p){ $new = Lines $p; break }
    }
  }
  if($null -eq $new -or $new -eq $num){ return $m.Value }
  $script:changed += ('{0} : {1} → {2}' -f $name, $num, $new)
  $txt = if($new -ge 1000){ $new.ToString('N0') } else { [string]$new }
  return $m.Groups[1].Value + $m.Groups[2].Value + $m.Groups[3].Value + $txt + '줄'
})
if($changed.Count){
  [IO.File]::WriteAllText($TPL, $s, (New-Object Text.UTF8Encoding($false)))
  '고친 줄 수 :'; $changed | ForEach-Object { '  ' + $_ }
} else { '줄 수가 모두 맞습니다' }
pwsh -NoProfile -File (Join-Path $PSScriptRoot '구조도_만들기.ps1') | Select-Object -Last 1
