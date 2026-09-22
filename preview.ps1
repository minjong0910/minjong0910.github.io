# 공대 3호관 길안내 앱 — 올리기 전 미리보기 서버
#
#   site\ (앱 — 첫 화면) · tests\ (자동 검사) · 문서\ · 측정 페이지(eval*.html · gen.html …)
#   그리고 사진원본\ 을 http://localhost:8080/ 으로 내보냅니다.
#
#   localhost 는 브라우저가 "안전한 주소"로 쳐주므로 카메라·AI·OCR·로그인이 전부 동작합니다.
#   끄려면 이 창에서 Ctrl+C 를 누르거나 창을 닫으세요.
#
#   ※ 요청을 8개까지 동시에 처리합니다. AI 모델과 글자인식 파일은 브라우저가
#     여러 개를 한꺼번에 받아가기 때문에, 하나씩 처리하면 거기서 멈춥니다.

$ErrorActionPreference = 'Stop'
$ROOT = $PSScriptRoot
$PORT = 8080
$LOG  = Join-Path $ROOT '서버기록.txt'
$WORKERS = 8

if (-not (Test-Path (Join-Path $ROOT 'site\index.html'))) {
    Write-Host "  site\index.html 을 찾을 수 없습니다: $ROOT" -ForegroundColor Red
    Read-Host "  엔터를 누르면 닫힙니다"; exit 1
}
try { Set-Content -Path $LOG -Value ('=== ' + (Get-Date) + ' 서버 시작 ===') -Encoding UTF8 } catch {}

while ($true) {
    $busy = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue
    if (-not $busy) { break }
    Write-Host "  포트 $PORT 사용 중 — $($PORT+1) 로 옮깁니다." -ForegroundColor Yellow
    $PORT++
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$PORT/")
try { $listener.Start() }
catch {
    Write-Host "  서버를 시작하지 못했습니다: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "  엔터를 누르면 닫힙니다"; exit 1
}

$url = "http://localhost:$PORT/"
Write-Host ""
Write-Host "  ┌──────────────────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "  │  미리보기 서버가 켜졌습니다                      │" -ForegroundColor Cyan
Write-Host ("  │  {0,-48}│" -f $url)                                -ForegroundColor Cyan
Write-Host ("  │  {0,-48}│" -f ($url + 'site/index.html  ← 앱'))  -ForegroundColor Cyan
Write-Host ("  │  {0,-48}│" -f ($url + 'eval_all.html  ← 정확도 측정'))  -ForegroundColor Cyan
Write-Host "  │  끄려면 Ctrl+C 또는 이 창을 닫으세요             │" -ForegroundColor Cyan
Write-Host "  └──────────────────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

# ── 요청 하나를 처리하는 일꾼 ────────────────────────────────────
$worker = {
    param($listener, $ROOT, $LOG, $id)

    $MIME = @{
        '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'
        '.json'='application/json; charset=utf-8'; '.css'='text/css; charset=utf-8'
        '.wasm'='application/wasm'; '.bin'='application/octet-stream'
        '.gz'='application/octet-stream'
        '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'
        '.svg'='image/svg+xml'; '.ico'='image/x-icon'; '.txt'='text/plain; charset=utf-8'
    }
    function Note([string]$m){
        try { Add-Content -Path $LOG -Value ((Get-Date -Format 'HH:mm:ss.fff') + "  [$id] " + $m) -Encoding UTF8 } catch {}
    }

    while ($listener.IsListening) {
        $ctx = $null
        try { $ctx = $listener.GetContext() } catch { break }
        $req = $ctx.Request
        $res = $ctx.Response
        $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
        # 첫 화면은 site/index.html — 주소를 옮겨 줘야 그 안의 상대 경로(css/…, js/…)가 site/ 기준으로 풀린다
        if ($rel -eq '' -or $rel -eq 'site' -or $rel -eq 'site/') {
            try { $res.StatusCode = 302; $res.RedirectLocation = '/site/index.html'; $res.Close() } catch {}
            continue
        }

        try {
            Note "REQ $($req.HttpMethod) /$rel"

            if ($rel -eq 'api/save' -and $req.HttpMethod -eq 'POST') {
                # dir=golden 이면 tests\golden 에 (안전망 기록), 아니면 생성물 에 저장한다.
                # .png 는 본문이 data:image/png;base64,... 글자이고, 풀어서 그림 파일로 쓴다.
                $name = $req.QueryString['name']
                if (-not $name -or $name -notmatch '^[A-Za-z0-9_\-]{1,80}\.(json|png)$') { $name = 'out.json' }
                $dir = if ($req.QueryString['dir'] -eq 'golden') { Join-Path $ROOT 'tests\golden' } else { Join-Path $ROOT '생성물' }
                if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
                $sr = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
                $payload = $sr.ReadToEnd(); $sr.Close()
                if ($name -like '*.png') {
                    $b64 = $payload.Substring($payload.IndexOf(',') + 1)
                    [System.IO.File]::WriteAllBytes((Join-Path $dir $name), [Convert]::FromBase64String($b64))
                } else {
                    [System.IO.File]::WriteAllText((Join-Path $dir $name), $payload, (New-Object System.Text.UTF8Encoding($false)))
                }
                $body = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true,"bytes":' + $payload.Length + '}')
                $res.ContentType = 'application/json; charset=utf-8'
                $res.ContentLength64 = $body.Length
                $res.OutputStream.Write($body,0,$body.Length)
                Note "SAVE $name $($payload.Length) bytes"
            }
            elseif ($rel -eq 'api/photos') {
                $base = Join-Path $ROOT '사진원본'
                $list = New-Object System.Collections.ArrayList
                if (Test-Path $base) {
                    foreach ($p in Get-ChildItem $base -Recurse -File -ErrorAction SilentlyContinue) {
                        if ($p.Extension -notmatch '^\.(jpg|jpeg|png)$') { continue }
                        $r2 = $p.FullName.Substring($base.Length).TrimStart('\') -replace '\\','/'
                        $seg = $r2 -split '/'
                        # 첫 폴더 = 장소(정답), 그 아래 폴더가 있으면 = 찍은 방향(앞/뒤/위/아래)
                        $dir = if ($seg.Count -ge 3) { $seg[1] } else { '' }
                        [void]$list.Add([pscustomobject]@{
                            path='사진원본/'+$r2; label=$seg[0]; dir=$dir; name=$p.Name; bytes=$p.Length })
                    }
                }
                $json = if ($list.Count) { $list | ConvertTo-Json -Compress -Depth 4 } else { '[]' }
                if ($json -notmatch '^\[') { $json = '[' + $json + ']' }
                $body = [System.Text.Encoding]::UTF8.GetBytes($json)
                $res.ContentType = 'application/json; charset=utf-8'
                $res.Headers.Add('Cache-Control','no-store')
                $res.ContentLength64 = $body.Length
                if ($req.HttpMethod -ne 'HEAD') { $res.OutputStream.Write($body,0,$body.Length) }
                Note "OK  /api/photos $($list.Count)"
            }
            else {
                $allowed = ($rel -match '^(eval\w*|gen|sheet|ocrtest)\.html$') -or ($rel -eq 'batches.json') -or
                           ($rel -like 'site/*') -or ($rel -like 'tests/*') -or ($rel -like '문서/*') -or
                           ($rel -like '사진원본/*') -or ($rel -like '_검토_*')
                $full = [System.IO.Path]::GetFullPath((Join-Path $ROOT ($rel -replace '/','\')))
                $ok = $allowed -and $full.StartsWith($ROOT,[StringComparison]::OrdinalIgnoreCase) -and (Test-Path $full -PathType Leaf)

                if (-not $ok) {
                    $res.StatusCode = 404
                    $body = [System.Text.Encoding]::UTF8.GetBytes('not found')
                    $res.ContentType = 'text/plain; charset=utf-8'
                    $res.ContentLength64 = $body.Length
                    if ($req.HttpMethod -ne 'HEAD') { $res.OutputStream.Write($body,0,$body.Length) }
                    Note "404 /$rel"
                }
                else {
                    $ext = [System.IO.Path]::GetExtension($full).ToLower()
                    $res.ContentType = $(if ($MIME.ContainsKey($ext)) { $MIME[$ext] } else { 'application/octet-stream' })
                    $res.Headers.Add('Cache-Control','no-store')
                    $fs = [System.IO.File]::OpenRead($full)
                    try {
                        $res.ContentLength64 = $fs.Length
                        if ($req.HttpMethod -ne 'HEAD') {
                            # 64KB 씩 나눠 보낸다 — 큰 파일을 한 번에 쓰면 멈추는 일이 있다
                            $buf = New-Object byte[] 65536
                            while (($read = $fs.Read($buf,0,$buf.Length)) -gt 0) {
                                $res.OutputStream.Write($buf,0,$read)
                            }
                            $res.OutputStream.Flush()
                        }
                        Note "OK  /$rel $($fs.Length)"
                    } finally { $fs.Dispose() }
                }
            }
        }
        catch { Note ("ERR /$rel : " + $_.Exception.Message) }
        finally {
            try { $res.OutputStream.Close() } catch {}
            try { $res.Close() } catch {}
        }
    }
}

# ── 일꾼 여러 명을 띄운다 ────────────────────────────────────────
$pool = [runspacefactory]::CreateRunspacePool(1, $WORKERS)
$pool.Open()
$jobs = @()
for ($i = 1; $i -le $WORKERS; $i++) {
    $ps = [powershell]::Create()
    $ps.RunspacePool = $pool
    [void]$ps.AddScript($worker).AddArgument($listener).AddArgument($ROOT).AddArgument($LOG).AddArgument($i)
    $jobs += [pscustomobject]@{ ps = $ps; handle = $ps.BeginInvoke() }
}
Write-Host "  요청을 동시에 $WORKERS 개까지 처리합니다." -ForegroundColor Green
Write-Host "  기록 : 서버기록.txt"
Write-Host ""

Start-Process $url

try {
    while ($listener.IsListening) { Start-Sleep -Seconds 1 }
} finally {
    try { $listener.Stop() } catch {}
    foreach ($j in $jobs) { try { $j.ps.Stop(); $j.ps.Dispose() } catch {} }
    try { $pool.Close(); $pool.Dispose() } catch {}
    try { $listener.Close() } catch {}
    Write-Host ""
    Write-Host "  미리보기 서버를 껐습니다."
}
