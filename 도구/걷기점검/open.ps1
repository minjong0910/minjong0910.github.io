# 화면 오른쪽 절반에 보이는 크롬 창(임시 프로필)을 열고 원격 조종 포트를 연다
param([int]$Port = 9350, [string]$Url = 'http://localhost:8080/site/index.html')
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$prof = Join-Path $env:TEMP 'b3walk_profile'
New-Item -ItemType Directory -Force $prof | Out-Null
Start-Process $chrome -ArgumentList @("--remote-debugging-port=$Port", "--user-data-dir=$prof", '--no-first-run', '--no-default-browser-check',
  '--disable-sync', '--window-position=1237,0', '--window-size=470,1019', '--new-window', $Url)
for($i = 0; $i -lt 40; $i++){
  Start-Sleep -Milliseconds 300
  try { $t = Invoke-RestMethod "http://127.0.0.1:$Port/json"; if($t){ 'opened : ' + (($t | Where-Object { $_.type -eq 'page' } | Select-Object -First 1).url); exit 0 } } catch {}
}
'failed'; exit 1
