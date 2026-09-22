# 인터넷 없이 열기 — site\sw.js 의 저장 목록(VERSION · FILES)을 만든다
#
#   site\ 의 파일을 하나라도 고치면 이것을 돌린다. 안 돌리면 폰이 옛 파일을 계속 쓴다.
#   (검사.ps1 이 목록이 맞는지 확인하고, 안 맞으면 [실패]로 알려 준다.)
#
#   목록에 넣는 것 : site\ 의 모든 파일 (화면·코드·장소 사진·3D·아이콘) — 약 12MB
#   넣지 않는 것  : data\aivec.js · data\ailib.js (AI 사진 판별 자료)와 lib\ (AI 라이브러리)
#                  — AI 는 인터넷이 될 때만 쓰기로 했다. 그리고 sw.js 자신.
#
#   파일마다 지문(SHA-256 앞 12자리)과 크기를 적는다. 폰은 받은 파일의 지문을 확인하고,
#   지문이 안 바뀐 파일은 전에 저장한 것을 옮겨 쓴다 (사진을 매번 다시 받지 않게).
#
#   사용법 : pwsh -File 도구\오프라인목록.ps1           목록을 새로 쓴다
#            pwsh -File 도구\오프라인목록.ps1 -Check    맞는지만 본다 (틀리면 1 을 돌려준다)
param([switch]$Check)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ROOT = Split-Path $PSScriptRoot -Parent
$SITE = Join-Path $ROOT 'site'
$SW   = Join-Path $SITE 'sw.js'
$UTF8 = New-Object System.Text.UTF8Encoding($false)

$SKIP = '^(sw\.js|data/aivec\.js|data/ailib\.js|lib/.*)$'
$files = @(Get-ChildItem $SITE -Recurse -File | ForEach-Object {
  [pscustomobject]@{ rel = ($_.FullName.Substring($SITE.Length + 1) -replace '\\', '/'); full = $_.FullName; size = $_.Length }
} | Where-Object { $_.rel -notmatch $SKIP })
# 어느 컴퓨터에서 돌려도 같은 순서 (글자 코드 순)
$keys = [string[]]($files | ForEach-Object { $_.rel }); [Array]::Sort($keys, [StringComparer]::Ordinal)
$byRel = @{}; foreach($f in $files){ $byRel[$f.rel] = $f }

$lines = New-Object System.Collections.Generic.List[string]
$sig = New-Object System.Text.StringBuilder
$total = 0
foreach($k in $keys){
  $f = $byRel[$k]
  $h = (Get-FileHash -Algorithm SHA256 -LiteralPath $f.full).Hash.ToLower().Substring(0, 12)
  $lines.Add(("  ['{0}','{1}',{2}]" -f $k, $h, $f.size))
  [void]$sig.Append("$k $h $($f.size)`n")
  $total += $f.size
}
$sha = [Security.Cryptography.SHA256]::Create()
$ver = -join ($sha.ComputeHash($UTF8.GetBytes($sig.ToString())) | Select-Object -First 6 | ForEach-Object { $_.ToString('x2') })

$block = "// ↓↓↓ 도구\오프라인목록.ps1 이 채운다 — 손으로 고치지 않는다`n" +
         "var VERSION = '$ver';   // 파일 $($keys.Count)개 · $([Math]::Round($total / 1MB, 1))MB`n" +
         "var FILES = [`n" + ($lines -join ",`n") + "`n];`n" +
         "// ↑↑↑ 도구\오프라인목록.ps1 이 채운다"

$text = [IO.File]::ReadAllText($SW, $UTF8)
$rx = [regex]'(?s)// ↓↓↓ 도구\\오프라인목록\.ps1 이 채운다.*?// ↑↑↑ 도구\\오프라인목록\.ps1 이 채운다'
if(-not $rx.IsMatch($text)){ Write-Host '  sw.js 에서 목록 자리(↓↓↓ … ↑↑↑)를 찾지 못했습니다' -ForegroundColor Red; exit 2 }
$now = $rx.Match($text).Value
$summary = "파일 {0}개 · {1:N1}MB · 판 {2}" -f $keys.Count, ($total / 1MB), $ver

if($Check){
  if($now -eq $block){ Write-Host "  저장 목록이 맞습니다 — $summary"; exit 0 }
  $old = [regex]::Match($now, "VERSION = '([0-9a-f]*)'").Groups[1].Value
  Write-Host "  저장 목록이 옛것입니다 (지금 판 $old → 새 판 $ver) — pwsh -File 도구\오프라인목록.ps1 을 돌리세요" -ForegroundColor Red
  exit 1
}
if($now -eq $block){ Write-Host "  바뀐 것 없음 — $summary" -ForegroundColor Green; exit 0 }
$text = $rx.Replace($text, { param($m) $block }, 1)
[IO.File]::WriteAllText($SW, $text, $UTF8)
Write-Host "  sw.js 저장 목록을 새로 썼습니다 — $summary" -ForegroundColor Green
exit 0
