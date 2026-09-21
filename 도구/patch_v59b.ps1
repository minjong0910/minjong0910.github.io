# v59b — 관리자 화면에 "승인하면 AI가 배웁니다" 안내 추가
#   위치를 가장 정확히 아는 사람은 관리자다. 그래서 학습은 관리자 승인으로만 일어난다.
#   (사용자가 고르던 경로는 v59 에서 없앴다)
param([string]$Target)
$ErrorActionPreference = 'Stop'
if(-not (Test-Path $Target)){ throw "파일이 없습니다: $Target" }
$s = [System.IO.File]::ReadAllText($Target, [System.Text.Encoding]::UTF8)

$old = @'
            '<div class="sugBtnRow">' +
'@
$new = @'
            /* v59 : 학습은 관리자 승인으로만 일어난다 — 위치를 가장 정확히 아는 사람이므로 */
            '<div class="sugLearnTip">✔ 승인하면 이 위치를 AI가 배웁니다 — 코드가 맞는지 확인해 주세요</div>' +
            '<div class="sugBtnRow">' +
'@
$c = ([regex]::Matches($s, [regex]::Escape($old))).Count
if($c -ne 1){ throw "버튼줄 앵커가 $c 개" }
$s = $s.Replace($old, $new)

# 안내문 스타일
$oldCss = '  #sadmin .sugCard{display:flex;gap:10px;background:#131A24;border:1px solid #232D3A;border-radius:12px;'
$newCss = @'
  #sadmin .sugLearnTip{margin-top:6px;font-size:11.5px;line-height:1.45;color:#7C8AA0;
    background:#0F141B;border:1px dashed #2A3644;border-radius:8px;padding:6px 8px;}
  #sadmin .sugCard{display:flex;gap:10px;background:#131A24;border:1px solid #232D3A;border-radius:12px;
'@
$c2 = ([regex]::Matches($s, [regex]::Escape($oldCss))).Count
if($c2 -ne 1){ throw "스타일 앵커가 $c2 개" }
$s = $s.Replace($oldCss, $newCss)

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  [OK] {0}" -f (Split-Path $Target -Leaf)) -ForegroundColor Green
