# v69 — 두 장 합치기 · 복도 좌우 표시 · 번호판 마지막 수단 · 판별 시간 표시
#
#   ③ 두 장 합치기 : 제보 화면에서 "같은 자리에서 한 장 더"(선택)를 받으면 두 장의 시점을 모두 써서
#      위치를 찾는다. 저장·제보에 남는 사진은 첫 장 그대로다.
#      실측(복도 920장, 같은 자리 다른 사진 두 장) : 자리 54.9% → 61.5% · 층 63.3% → 70.1% · 5등 81.6% → 87.8%
#
#   ④ 복도 좌우 : 층을 몰라도 좌우는 잘 맞는다. 상위 20개 후보의 유사도를 왼쪽/오른쪽으로 모아 투표한다.
#      실측(복도 920장) : 전체 81.6%. 여유 0.3 이상이면 98.3%(13%의 사진), 0.1 이상이면 91.3%(57%).
#      관리자 화면에 "복도 좌우 : 왼쪽 (확실)" 로 보여 준다. 여유 0.1 미만이면 아예 안 쓴다.
#
#   ⑤ 번호판 : 파란 판을 못 찾았거나 못 읽었을 때 마지막으로 사진 전체에서 숫자 줄을 찾는다
#      (복도 60장 시험에서 21 → 22장, 한 장에 0.2초 더). 그리고 네 자리 숫자 보정("1313" → 13313)은
#      확신 60 이상일 때만 쓴다 — 실측에서 1층 복도 사진을 3층으로 만들 뻔한 오독이 나왔다.
#
#   ⑥ 판별 시간 : 판정에 걸린 시간을 재서 관리자 화면에 "판별 3.4초" 로 보여 준다 (폰 속도 측정용).
#
#   사용법 : pwsh -File patch_v69.ps1 <대상파일>
param([string]$Target)
$ErrorActionPreference = 'Stop'
if(-not (Test-Path $Target)){ throw "파일이 없습니다: $Target" }
$s = [System.IO.File]::ReadAllText($Target, [System.Text.Encoding]::UTF8)
$n = 0
function Swap([string]$old, [string]$new, [string]$label){
  $script:n++
  $old = $old -replace "`r`n", "`n"; $new = $new -replace "`r`n", "`n"
  $c = ([regex]::Matches($script:s, [regex]::Escape($old))).Count
  if($c -ne 1){ throw ("[{0}] 앵커가 {1}개" -f $label, $c) }
  $script:s = $script:s.Replace($old, $new)
  Write-Host ("  [OK] {0}" -f $label) -ForegroundColor Green
}

# ── ③ 두 장 : 화면 ───────────────────────────────────────────────
Swap @'
  #ssug .shot .ic{font-size:30px;display:block;margin-bottom:6px;}
'@ @'
  #ssug .shot .ic{font-size:30px;display:block;margin-bottom:6px;}
  /* v69 : 같은 자리에서 한 장 더 (선택) */
  #ssug .shot2{display:none;margin:-4px 0 10px;padding:9px 10px;border:1px dashed #33507A;border-radius:9px;
               color:#94B8E0;font-size:12px;text-align:center;cursor:pointer;}
  #ssug .shot2.has{border-style:solid;border-color:#00E5FF;color:#CFE6FF;}
  #ssug .shot2 .ic{margin-right:5px;}
'@ '두 번째 사진 칸 모양'

Swap @'
      <input type="file" id="sugFile" accept="image/*" style="display:none;" onchange="sugPreview(this)">
'@ @'
      <input type="file" id="sugFile" accept="image/*" style="display:none;" onchange="sugPreview(this)">
      <label class="shot2" id="sugShot2" for="sugFile2">
        <span class="ic">➕</span>
        <span data-ko="같은 자리에서 한 장 더 찍으면 더 잘 찾아요 (선택)" data-en="One more photo from the same spot helps (optional)">같은 자리에서 한 장 더 찍으면 더 잘 찾아요 (선택)</span>
      </label>
      <input type="file" id="sugFile2" accept="image/*" style="display:none;" onchange="sugPreview2(this)">
'@ '두 번째 사진 칸'

# ── ③ 두 장 : 고르기·초기화 ─────────────────────────────────────
Swap @'
  sugPickedFile = file;
  var url = URL.createObjectURL(file);
  box.classList.add('has');
  box.innerHTML = '<img src="'+url+'" alt="제보 사진 미리보기">';
}
'@ @'
  sugPickedFile = file;
  var url = URL.createObjectURL(file);
  box.classList.add('has');
  box.innerHTML = '<img src="'+url+'" alt="제보 사진 미리보기">';
  /* v69 : 첫 장을 고른 뒤에만 "한 장 더" 를 보여 준다 */
  var more = document.getElementById('sugShot2');
  if(more) more.style.display = 'block';
}
/* v69 : 같은 자리에서 찍은 두 번째 사진 — 위치를 찾는 데만 쓰고 제보에는 첫 장만 남는다.
   실측(복도 920장) : 자리 54.9% → 61.5%, 층 63.3% → 70.1%, 5등 81.6% → 87.8% */
var sugPickedFile2 = null;
function sugPreview2(input){
  var file = input.files && input.files[0];
  var box = document.getElementById('sugShot2');
  if(!file || !box) return;
  sugPickedFile2 = file;
  box.classList.add('has');
  box.innerHTML = '<span class="ic">✅</span><span>'
    + ((LANG==='ko') ? '두 번째 사진 준비됨 — 다시 누르면 바꿀 수 있어요'
                     : 'Second photo ready — tap to replace') + '</span>';
}
function sugReset2(){
  sugPickedFile2 = null;
  var f2 = document.getElementById('sugFile2'); if(f2) f2.value = '';
  var box = document.getElementById('sugShot2');
  if(box){
    box.classList.remove('has');
    box.style.display = 'none';
    box.innerHTML = '<span class="ic">➕</span><span>'
      + ((LANG==='ko') ? '같은 자리에서 한 장 더 찍으면 더 잘 찾아요 (선택)'
                       : 'One more photo from the same spot helps (optional)') + '</span>';
  }
}
'@ '두 번째 사진 고르기'

Swap @'
    sugPickedFile = null;
    var fixRow0 = document.getElementById('sugFixRow');
'@ @'
    sugPickedFile = null;
    if(typeof sugReset2 === 'function') sugReset2();     /* v69 */
    var fixRow0 = document.getElementById('sugFixRow');
'@ '두 번째 사진 초기화'

# ── ③ 두 장 : 판정에 넘기기 ─────────────────────────────────────
Swap @'
    phShrink(pickedFile, function(big){
      sugJudgeWith(url, big, noteVal, ai2Cb);
    }, 2400, 0.85);
'@ @'
    phShrink(pickedFile, function(big){
      /* v69 : 두 번째 사진이 있으면 위치 판별에만 함께 쓴다 (저장되는 사진은 첫 장) */
      if(!sugPickedFile2){ sugJudgeWith(url, big, noteVal, ai2Cb); return; }
      phShrink(sugPickedFile2, function(u2){
        sugJudgeWith(url, big, noteVal, ai2Cb, u2 ? [u2] : null);
      });
    }, 2400, 0.85);
'@ '두 번째 사진을 판정에 넘김'

Swap @'
function sugJudgeWith(url, big, noteVal, cb){
  SUGAI.judge(url, cb, noteVal, big || null);
}
'@ @'
function sugJudgeWith(url, big, noteVal, cb, extras){
  SUGAI.judge(url, cb, noteVal, big || null, extras || null);   /* v69 : extras = 같은 자리 추가 사진 */
}
'@ 'sugJudgeWith 인자'

# ── 새 함수들 (ocrRun 앞) ───────────────────────────────────────
Swap @'
  function ocrRun(dataUrl, ctl){
'@ @'
  /* v69 : 파란 판을 못 찾았거나 못 읽었을 때 — 사진 전체에서 숫자 줄을 찾는다 (멀리 있는 번호판)
     복도 60장 시험 : 21장 → 22장, 한 장에 0.2초 더. 파란 판으로 읽히면 여기까지 오지 않는다. */
  function v69WholeLines(img){
    return v66DigitLines(img, {x0:0, y0:0, x1:1, y1:1}, [0,1], 900, 8, 11);
  }
  /* v69 : 복도 좌우 투표 — 층은 몰라도 좌우는 잘 맞는다.
     상위 20개 후보의 유사도를 왼쪽/오른쪽으로 모아 어느 쪽이 센지 본다.
     실측(복도 920장) : 전체 81.6% · 여유 0.3 이상 98.3%(13%) · 0.1 이상 91.3%(57%) */
  function v69Side(rk){
    if(!rk || !rk.length) return null;
    var L = 0, R = 0, i, m, s;
    for(i=0; i<Math.min(20, rk.length); i++){
      m = String(rk[i].code).match(/^HALL[1-5]([LR])$/);
      if(!m) continue;
      s = rk[i].sim > 0 ? rk[i].sim : 0;
      if(m[1] === 'L') L += s; else R += s;
    }
    var tot = L + R;
    if(tot <= 0) return null;
    var margin = Math.abs(L - R) / tot;
    if(margin < 0.1) return null;
    return { side:(L >= R ? 'L' : 'R'), margin:Math.round(margin*100)/100, sure:(margin >= 0.3) };
  }
  /* v69 : 추가 사진(같은 자리에서 한 장 더)의 시점을 이어 붙인다 */
  function v69Views(img, extras){
    return embedViews(img, Q_VIEWS).then(function(qs){
      if(!extras || !extras.length) return qs;
      var out = qs.slice(), i = 0;
      function step(){
        if(i >= extras.length) return Promise.resolve(out);
        return embedUrlViews(extras[i++], Q_VIEWS).then(function(vs){
          out = out.concat(vs); return step();
        }, function(){ return step(); });
      }
      return step();
    });
  }

  function ocrRun(dataUrl, ctl){
'@ 'v69 함수 묶음'

# ── ⑤ 번호판 : 마지막 수단 + 보정 조이기 ────────────────────────
Swap @'
  function v66DigitLines(img, b, R, TH, max){
'@ @'
  function v66DigitLines(img, b, R, TH, max, minH){
'@ 'DigitLines 최소 높이 인자'

Swap @'
        if(h >= Math.max(8, H*0.035) && h <= H*0.4 && w <= h*4 && w >= h*0.1 && fill > 0.12 && fill < 0.92 &&
'@ @'
        if(h >= (minH ? minH : Math.max(8, H*0.035)) && h <= H*0.4 && w <= h*4 && w >= h*0.1 && fill > 0.12 && fill < 0.92 &&
'@ 'DigitLines 최소 높이 적용'

Swap @'
          if(dead || si >= shots.length) return null;
          var shot = shots[si++];
'@ @'
          if(dead) return null;
          if(si >= shots.length){
            /* v69 : 마지막 수단 — 사진 전체에서 숫자 줄 (파란 판을 못 찾은 사진) */
            if(wholeTried) return null;
            wholeTried = true;
            try{
              var wl = v69WholeLines(im), wi;
              for(wi=0; wi<wl.length; wi++) shots.push({cv:wl[wi].cv, psm:7});
            }catch(e){}
            if(si >= shots.length) return null;
          }
          var shot = shots[si++];
'@ 'ocrRun 마지막 수단'

Swap @'
        var si = 0;
'@ @'
        var si = 0, wholeTried = false;
'@ 'ocrRun 마지막 수단 표시'

Swap @'
      else if(t.length === 4 && /^3[1-5]\d{2}$/.test(t) && known['1'+t]){ cand = '1'+t; c *= 0.8; }
      else if(t.length === 4 && /^1[1-5]\d{2}$/.test(t) && known['13'+t.slice(1)]){ cand = '13'+t.slice(1); c *= 0.7; }
'@ @'
      /* v69 : 네 자리 보정은 확신 60 이상일 때만 — "1313" 을 13313 으로 읽어
         1층 복도 사진을 3층으로 만들 뻔한 오독이 실측에서 나왔다. */
      else if(t.length === 4 && c >= 60 && /^3[1-5]\d{2}$/.test(t) && known['1'+t]){ cand = '1'+t; c *= 0.8; }
      else if(t.length === 4 && c >= 60 && /^1[1-5]\d{2}$/.test(t) && known['13'+t.slice(1)]){ cand = '13'+t.slice(1); c *= 0.7; }
'@ '네 자리 보정 조이기'

# ── ④⑥ judge : 좌우 투표 · 추가 사진 · 시간 재기 ────────────────
Swap @'
  function judge(dataUrl, cb, note, ocrUrl){
    var img = new Image();
'@ @'
  function judge(dataUrl, cb, note, ocrUrl, extraUrls){
    /* v69 : 판별에 걸린 시간을 재서 res.ms 에 담는다 (폰 속도 확인용) */
    var t0 = Date.now(), cb0 = cb;
    cb = function(r){ if(r && r.ms === undefined) r.ms = Date.now() - t0; cb0(r); };
    var img = new Image();
'@ 'judge 인자와 시간 재기'

Swap @'
        return embedViews(img, Q_VIEWS).then(function(qs){
'@ @'
        return v69Views(img, extraUrls).then(function(qs){
'@ 'judge 추가 사진 시점'

Swap @'
          if(sceneWanted(rk)) ocrCtl.noWide = true;   /* v66 */
'@ @'
          if(sceneWanted(rk)) ocrCtl.noWide = true;   /* v66 */
          res.side = v69Side(rk);                     /* v69 : 복도 좌우 */
'@ 'judge 좌우 투표'

# ── ④⑥ 관리자 화면 표시 ────────────────────────────────────────
Swap @'
    if(!hasPlate){
      h += '<span class="sub warnsub">⚠ 사진에 호실 번호판이 안 보입니다
'@ @'
    /* v69 : 층을 몰라도 좌우는 잘 맞는다 — 복도로 보일 때만 보여 준다 */
    if(ai.side && isCorridor(t.code)){
      h += '<span class="sub">복도 좌우 : <b>' + (ai.side.side === 'L' ? '왼쪽' : '오른쪽') + '</b> '
         + '<span class="num">(' + (ai.side.sure ? '확실 — 이 조건에서 실측 98%' : '아마 — 이 조건에서 실측 89%') + ')</span></span>';
    }
    if(!hasPlate){
      h += '<span class="sub warnsub">⚠ 사진에 호실 번호판이 안 보입니다
'@ '관리자 화면 좌우 표시'

Swap @'
    if(ai.quality) h += '<span class="num">선명도 '+Math.round(ai.quality.sharp)+'</span>';
'@ @'
    if(ai.quality) h += '<span class="num">선명도 '+Math.round(ai.quality.sharp)+'</span>';
    if(ai.ms) h += '<span class="num">판별 '+(ai.ms/1000).toFixed(1)+'초</span>';   /* v69 : 폰 속도 확인용 */
'@ '관리자 화면 판별 시간'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
