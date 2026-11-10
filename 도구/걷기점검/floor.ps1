# 층 하나 둘러보기 : pwsh -File floor.ps1 -Lv 3   (B1 · R 은 문자열)
param([string]$Lv = '3')
$W = $PSScriptRoot
$lvJs = if($Lv -match '^\d+$'){ $Lv } else { "'$Lv'" }
$tour = (Get-Content "$W\tour.js" -Raw).Trim()
$n = [int](pwsh -NoProfile -File "$W\do.ps1" -Js "($tour)($lvJs)" | Select-Object -Last 1)
"지점 $n 곳"
$steps = @(@{ js = 'new Promise(function(r){setTimeout(function(){r("")},1500);})'; name = '' })
for($i = 0; $i -lt $n; $i++){ $steps += @{ js = "__go($i)"; wait = 650; name = ('F{0}_{1:D2}' -f $Lv, $i) } }
($steps | ConvertTo-Json -Depth 5) | Set-Content "$W\plan_F$Lv.json" -Encoding UTF8
pwsh -NoProfile -File "$W\do.ps1" -Plan "$W\plan_F$Lv.json" -Sheet "F$($Lv)_sheet" -Cols 6
