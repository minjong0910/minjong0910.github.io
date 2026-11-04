# 오픈소스 라이선스 고지 쪽 만들기 (2026-11-04 사용자 「개인정보 처리방침과 오픈소스 라이선스를 실제 앱에」)
# 결과 : site/legal/licenses.html — 앱 안(동의 화면 「오픈소스 라이선스 고지 · 보기」, 이용안내 마지막 쪽)에서 consent.js 가 ?embed=1&lang=ko|en 으로 띄운다.
# 라이선스 원문은 도구\법적고지\ (apache-2.0.txt = apache.org 원문, ofl-1.1-pretendard.txt = Pretendard 저장소 원문, mit.txt, isc-lucide.txt = icons.js 머리 원문).
# 앱에 쓰는 공개 프로그램을 더하거나 판을 올리면 아래 $items 를 고치고 다시 돌린 뒤 도구\오프라인목록.ps1.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$lic = Join-Path $PSScriptRoot '법적고지'
$out = Join-Path $root 'site\legal\licenses.html'
function Esc($s){ [System.Net.WebUtility]::HtmlEncode($s) }
function Txt($f){ [IO.File]::ReadAllText((Join-Path $lic $f), [Text.Encoding]::UTF8) }

# 이름 · 판 · 쓰는 곳(한 · 영) · 라이선스 · 저작권
$items = @(
  @('three.js', 'r128', '3D 건물 · 층 평면도', '3D building and floor plans', 'MIT', 'Copyright 2010-2021 Three.js Authors'),
  @('jsQR', '1.4.0', '출입문 QR 읽기', 'Reading the entrance QR codes', 'Apache-2.0', 'jsQR authors (Cosmo Wolfe)'),
  @('JSZip', '3.10.1', '사진 묶음(zip) 만들기 · 읽기 (관리자)', 'Making and reading photo zips (admin)', 'MIT', '(c) 2009-2016 Stuart Knightley — dual MIT / GPLv3, used under MIT'),
  @('pako (JSZip 안 · inside JSZip)', '', '압축', 'Compression', 'MIT', '(C) 2014-2017 Vitaly Puzrin and Andrei Tupitcin'),
  @('TensorFlow.js', '4.22.0', '건의함 사진 AI 비교', 'AI photo matching for the Suggestion Box', 'Apache-2.0', 'Copyright 2024 Google LLC'),
  @('MobileNet (TensorFlow.js Models)', '2.1.1 · mobilenet_v2_050_224', '건의함 사진 AI 비교', 'AI photo matching for the Suggestion Box', 'Apache-2.0', 'Copyright 2023 Google LLC'),
  @('Tesseract.js · tesseract.js-core', '5.1.1', '방 번호판 글자 읽기', 'Reading room number plates', 'Apache-2.0', 'Tesseract.js contributors (Project Naptha)'),
  @('Tesseract 영어 글자 자료 · English data (tessdata_fast)', '4.0.0', '방 번호판 글자 읽기', 'Reading room number plates', 'Apache-2.0', 'Tesseract OCR contributors (Google)'),
  @('heic2any', '0.0.4', '아이폰 사진(HEIC) 바꾸기', 'Converting iPhone (HEIC) photos', 'MIT', 'heic2any authors (Alex Corvi)'),
  @('Firebase JavaScript SDK', '12.3.0', '건의함 서버 · 관리자 로그인', 'Suggestion Box server and admin login', 'Apache-2.0', 'Copyright Google LLC'),
  @('Pretendard', '1.3.9', '글꼴', 'Font', 'OFL-1.1', 'Copyright (c) 2021, Kil Hyung-jin, with Reserved Font Name ''Pretendard'''),
  @('Lucide', '0.460.0', '아이콘', 'Icons', 'ISC', 'Lucide Contributors 2022 · portions Cole Bemis 2013-2022 (Feather, MIT)')
)
$texts = @(
  @('MIT', 'MIT License', (Txt 'mit.txt')),
  @('Apache-2.0', 'Apache License 2.0', (Txt 'apache-2.0.txt')),
  @('ISC', 'ISC License (Lucide)', (Txt 'isc-lucide.txt')),
  @('OFL-1.1', 'SIL Open Font License 1.1 (Pretendard)', (Txt 'ofl-1.1-pretendard.txt'))
)

$rowsKo = ($items | ForEach-Object { '<tr><td><b>' + (Esc $_[0]) + '</b>' + $(if($_[1]){ ' <small>' + (Esc $_[1]) + '</small>' } else { '' }) + '<br><span class="u">' + (Esc $_[2]) + '</span></td><td><a href="#' + $_[4] + '">' + (Esc $_[4]) + '</a><br><span class="c">' + (Esc $_[5]) + '</span></td></tr>' }) -join "`n"
$rowsEn = ($items | ForEach-Object { '<tr><td><b>' + (Esc $_[0]) + '</b>' + $(if($_[1]){ ' <small>' + (Esc $_[1]) + '</small>' } else { '' }) + '<br><span class="u">' + (Esc $_[3]) + '</span></td><td><a href="#' + $_[4] + '">' + (Esc $_[4]) + '</a><br><span class="c">' + (Esc $_[5]) + '</span></td></tr>' }) -join "`n"
$full = ($texts | ForEach-Object { '<details id="' + $_[0] + '"><summary>' + (Esc $_[1]) + '</summary><pre>' + (Esc $_[2]) + '</pre></details>' }) -join "`n"

$html = @"
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="color-scheme" content="dark light">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css">
<title>오픈소스 라이선스 — 공대 3호관 길안내</title>
<!-- 만들기 : 도구\법적고지_라이선스_만들기.ps1 (손으로 고치지 말 것) -->
<style>
  :root{--bg:#0B0E13;--fg:#E7F6FF;--sub:#9FB2C8;--line:#1F2B3A;--acc:#00E5FF;--card:#111722;}
  html.lt{--bg:#F4F7FB;--fg:#0F1B2D;--sub:#44546A;--line:#D5DEE8;--acc:#0B6FB8;--card:#FFFFFF;}
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{background:var(--bg);color:var(--fg);font-family:'Pretendard',"맑은 고딕","Malgun Gothic","Noto Sans CJK KR",sans-serif;-webkit-text-size-adjust:100%;}
  body{padding:18px 16px calc(28px + env(safe-area-inset-bottom));line-height:1.6;font-size:15px;word-break:keep-all;}
  .wrap{max-width:720px;margin:0 auto;}
  .top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:14px;font-size:13px;color:var(--sub);}
  .top a{color:var(--acc);text-decoration:none;font-weight:700;}
  html.embed .top{display:none;}
  h1{font-size:22px;line-height:1.3;margin-bottom:6px;}
  .lead{color:var(--sub);font-size:14px;margin-bottom:14px;}
  h2{font-size:16px;margin:20px 0 8px;color:var(--acc);}
  table{width:100%;border-collapse:collapse;font-size:14px;}
  td{border-top:1px solid var(--line);padding:9px 6px;vertical-align:top;}
  td:first-child{width:58%;}
  small{color:var(--sub);font-weight:600;}
  .u{color:var(--sub);font-size:13px;}
  .c{color:var(--sub);font-size:12px;word-break:break-word;}
  a{color:var(--acc);}
  details{background:var(--card);border:1px solid var(--line);border-radius:10px;margin:8px 0;}
  summary{cursor:pointer;padding:11px 14px;font-weight:800;}
  pre{white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.5;padding:0 14px 14px;color:var(--sub);font-family:Consolas,"D2Coding",monospace;}
  [data-lang]{display:none;}
  html[lang="ko"] [data-lang="ko"], html[lang="en"] [data-lang="en"]{display:block;}
</style>
<script>
  (function(){
    var q = location.search, h = document.documentElement;
    if(/[?&]lang=en(&|$)/.test(q)) h.lang = 'en';
    if(/[?&]embed=1(&|$)/.test(q)) h.classList.add('embed');
    if(/[?&]lt=1(&|$)/.test(q)) h.classList.add('lt');
  })();
</script>
</head>
<body>
<div class="wrap">
<div class="top"><span>공대 3호관 길안내 · Engineering Bldg.3 Navigation</span><span><a href="?lang=ko">한국어</a> · <a href="?lang=en">English</a></span></div>
<section data-lang="ko">
  <h1>오픈소스 라이선스 고지</h1>
  <p class="lead">이 앱은 아래 공개 프로그램(오픈소스)을 써서 만들었습니다. 각 프로그램을 만든 분들과 사용 허가(라이선스)를 알려 드립니다. 라이선스 이름을 누르면 원문이 열립니다.</p>
  <table>
$rowsKo
  </table>
  <h2>라이선스 원문</h2>
</section>
<section data-lang="en">
  <h1>Open-Source Licenses</h1>
  <p class="lead">This app is built with the open-source software below. Here are their authors and licenses. Tap a license name to read the full text.</p>
  <table>
$rowsEn
  </table>
  <h2>Full license texts</h2>
</section>
$full
</div>
<script>
  /* 표의 라이선스 이름을 누르면 그 원문 칸을 펼친다 */
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if(!a) return;
    var d = document.getElementById(a.getAttribute('href').slice(1)); if(d && d.tagName === 'DETAILS') d.open = true;
  });
</script>
</body>
</html>
"@
[IO.File]::WriteAllText($out, $html, (New-Object System.Text.UTF8Encoding($false)))
'만들었습니다 : ' + $out + ' (' + [math]::Round((Get-Item $out).Length / 1KB, 1) + 'KB)'
