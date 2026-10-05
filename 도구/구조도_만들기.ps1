# 구조도 만들기 — 도구\구조도_틀.html + 소스 파일 전부  →  문서\구조도.html
#
#   pwsh -File 도구\구조도_만들기.ps1
#
# 왜 넣어서 만드는가
#   교수님께 보여 줄 때 「이 블록의 소스를 보여 주세요」에 바로 답하려면 전문이 있어야 한다.
#   그런데 문서\구조도.html 을 **더블클릭으로 열면**(file:// ) 브라우저가 보안상
#   옆 파일을 못 읽는다(fetch 가 막힌다). 그래서 소스를 문서 안에 통째로 넣는다.
#   결과는 1.6MB 쯤 되지만, 로컬 파일이라 즉시 열린다.
#
#   ※ 고칠 때는 문서\구조도.html 이 아니라 **도구\구조도_틀.html** 을 고치고 이 스크립트를 돌린다.
#     문서\구조도.html 은 생성물이다 — 손으로 고치면 다음에 돌릴 때 날아간다.
#
# 넣는 것 : 우리가 직접 쓴 코드만
# 빼는 것 : 빌려 온 라이브러리(three·tf·jsqr·tesseract — 압축돼 있어 읽어도 의미가 없다)
#           자료 덩어리(aivec.js 10MB · ailib.js 2MB — 숫자뿐이고 너무 크다)
#           사진(JPEG)

$ErrorActionPreference = 'Stop'
$ROOT = Split-Path $PSScriptRoot -Parent
$TPL  = Join-Path $PSScriptRoot '구조도_틀.html'
$OUT  = Join-Path $ROOT '문서\구조도.html'

if(-not (Test-Path $TPL)){ throw "틀이 없습니다 : $TPL" }

# 넣을 파일 — 구조도의 SRC_GROUPS 와 같은 목록이어야 한다
$FILES = @(
  'site\js\app\pwa.js'
  'site\js\app\boot.js'
  'site\js\app\start.js'
  'site\sw.js'
  'site\js\app\shell.js'
  'site\js\app\ui.js'
  'site\index.html'
  'site\js\app\zoom.js'
  'site\css\app.css'
  'site\css\boot.css'
  'site\js\app\building.js'
  'site\js\app\overview3d.js'
  'site\js\app\view3d.js'
  'site\js\app\floor-detail.js'
  'site\js\app\roadview.js'
  'site\js\app\roadview-1f.js'
  'site\js\app\roadview-stairs.js'
  'site\js\app\roadview-b1.js'
  'site\js\app\roadview-roof.js'
  'site\js\app\roadview-corr.js'
  'site\js\app\roadview-play.js'
  'site\js\app\roadview-free.js'
  'site\js\app\guide.js'
  'site\js\app\photos.js'
  'site\js\app\qrnav.js'
  'site\js\app\sugai.js'
  'site\js\app\suggest.js'
  'site\js\app\sugdb.js'
  'site\js\app\aid.js'
  'site\data\places.js'
  'site\data\photos.js'
  '서버\firestore.rules'
  '.github\workflows\check-and-deploy.yml'
  '검사.ps1'
  '도구\오프라인목록.ps1'
  '도구\구조도_만들기.ps1'
)

Write-Host "`n[1] 소스 읽기"
$map = [ordered]@{}
$missing = @()
$lines = 0
foreach($rel in $FILES){
  $full = Join-Path $ROOT $rel
  if(-not (Test-Path $full)){ $missing += $rel; continue }
  $txt = [IO.File]::ReadAllText($full, [Text.Encoding]::UTF8)
  $txt = $txt -replace "`r`n", "`n"
  # 구조도 안의 경로 표기는 / 를 쓴다 (SRC_GROUPS · DATA 의 src 와 맞춘다)
  $key = $rel -replace '\\', '/'
  $map[$key] = $txt
  $lines += ($txt -split "`n").Count
}
if($missing.Count){ throw ("없는 파일 : " + ($missing -join ' / ')) }
Write-Host ("  파일 {0}개 · {1:N0}줄" -f $map.Count, $lines)

# 소스가 바뀌었는데 구조도를 다시 안 만든 경우를 검사.ps1 이 잡을 수 있도록 지문을 남긴다.
# 지문 = 넣은 파일들의 내용을 순서대로 이어 붙여 SHA-256. 검사.ps1 이 같은 방법으로 다시 센다.
$sb = [Text.StringBuilder]::new()
foreach($k in $map.Keys){ [void]$sb.Append($k); [void]$sb.Append("`0"); [void]$sb.Append($map[$k]); [void]$sb.Append("`0") }
$sha   = [Security.Cryptography.SHA256]::Create()
$bytes = [Text.Encoding]::UTF8.GetBytes($sb.ToString())
$stamp = -join ($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') })
$stamp = $stamp.Substring(0,16)
Write-Host ("  지문 {0}" -f $stamp)

Write-Host "`n[2] 문서 안에 넣기"
# ※ JSON 안에 </script> 가 그대로 들어가면 거기서 <script> 가 끊긴다.
#   index.html 에는 실제로 </script> 가 있다 — < 를 전부 \u003c 로 바꿔 막는다.
#   ※ 2026-10-06 함정 : 이 치환을 Replace('<', '\u003c') 라고 적었더니
#     편집 도구가 \u003c 를 실제 < 로 바꿔 버려 Replace('<','<') 라는
#     아무 일도 안 하는 코드가 됐다. 소스가 97KB 에서 잘렸는데 조용히 성공했다.
#     그래서 역슬래시를 글자 코드([char]0x5C)로 만들고, [3]에서 결과를 확인한다.
$json = $map | ConvertTo-Json -Depth 3 -Compress
$BS   = [string][char]0x5C                 # 역슬래시 한 글자
$json = $json.Replace('<', $BS + 'u003c')

$tpl = [IO.File]::ReadAllText($TPL, [Text.Encoding]::UTF8)
if($tpl -notmatch '__SRC_JSON__'){ throw "틀에 __SRC_JSON__ 자리가 없습니다" }
$html = $tpl.Replace('__SRC_JSON__', $json)

# 검사.ps1 이 읽는 줄 — 어떤 파일을 어떤 상태로 넣었는지
$mark = "`n<!-- SRC-STAMP:" + $stamp + " FILES:" + (($map.Keys) -join '|') + " -->`n"
$html = $html -replace '</body>', ($mark + '</body>')

[IO.File]::WriteAllText($OUT, $html, (New-Object Text.UTF8Encoding($false)))
$mb = [math]::Round((Get-Item $OUT).Length / 1MB, 2)
Write-Host ("  {0}  ({1} MB)" -f (Split-Path $OUT -Leaf), $mb)

Write-Host "`n[3] 확인"
$bad = 0
# 넣은 파일이 정말 다 들어갔는지 (키 이름이 문서 안에 있는지)
foreach($k in $map.Keys){
  if($html -notmatch [regex]::Escape('"' + $k + '"')){ Write-Host "  빠짐 ★ : $k" -ForegroundColor Red; $bad++ }
}
# 치환이 정말 됐는지 — 안 되면 소스가 중간에서 잘린다(위 함정)
if($json.Contains('<')){
  Write-Host "  JSON 에 < 가 남아 있습니다 — 소스가 거기서 잘립니다 ★" -ForegroundColor Red; $bad++
}
if(-not $json.Contains($BS + 'u003c')){
  Write-Host "  치환이 한 번도 일어나지 않았습니다 ★" -ForegroundColor Red; $bad++
}
if($bad){ Write-Host "`n확인 실패 $bad 건" -ForegroundColor Red; exit 1 }
Write-Host ("  파일 {0}개 모두 들어갔습니다" -f $map.Count)
Write-Host "`n완료 — 문서\구조도.html 을 더블클릭하면 열립니다" -ForegroundColor Green
