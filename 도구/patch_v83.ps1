# v83 — 관리자 건의함 : AI 후보를 층 평면도 위 점으로 보여 주기
#
#   지금은 후보가 "4층 복도(왼쪽) 41% · 5층 복도(왼쪽) 40% · 4층 엘리베이터 앞 39%" 처럼
#   글자로만 나와서, 후보가 한 곳에 몰렸는지(= 자리는 대략 맞다) 흩어졌는지(= 모른다)를
#   관리자가 머릿속으로 그려야 했다.
#   후보 버튼 아래에 층마다 작은 평면도를 그리고, 후보 자리에 순위 번호 점을 찍는다.
#     · 좌표는 place3D(v78) — 3D·길찾기와 같은 값이라 서로 어긋나지 않는다
#     · 위쪽 = 엘리베이터에서 내려 바라보는 방향, 왼쪽 = 왼쪽 복도 (사용자 확정 기준과 같음)
#     · 1등은 채운 점, 나머지는 빈 점, 평면도에 표시가 없어 어림한 자리(exact:false)는 점선
#     · 후보가 많은 층부터 최대 3층까지, 그 밖의 층과 지도에 없는 곳(건물 외부)은 글로 적는다
#     · 후보 버튼 앞에도 같은 순위 번호를 붙여 점과 버튼을 맞춰 볼 수 있게 한다
#
#   사용법 : pwsh -File patch_v83.ps1 <대상파일>
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

Swap @'
  #sadmin .sugAi .where.low b{color:#FFC93C;}
'@ @'
  #sadmin .sugAi .where.low b{color:#FFC93C;}
  /* v83 : 후보 평면도 */
  #sadmin .sugAi .cands .rk{display:inline-block;min-width:15px;height:15px;line-height:15px;margin-right:4px;border-radius:999px;
    background:#1E2A3A;color:#E7F6FF;font-size:10px;font-weight:800;text-align:center;}
  #sadmin .sugAi .cands button:first-child .rk{background:#00E5FF;color:#04121A;}
  #sadmin .aiMap{margin-top:7px;}
  #sadmin .aiMap .fl{font-size:10.5px;color:#94B8E0;margin:6px 0 3px;}
  #sadmin .aiMap .fl b{color:#E7F6FF;}
  #sadmin .aiMap svg{display:block;width:100%;max-width:460px;height:auto;background:#0B1017;border:1px solid #1E2733;border-radius:6px;}
  #sadmin .aiMap .o{fill:#101822;stroke:#2A3644;stroke-width:.25;}
  #sadmin .aiMap .r{fill:#16202C;stroke:#223041;stroke-width:.15;}
  #sadmin .aiMap .c{fill:#0C1219;}
  #sadmin .aiMap .k{fill:#1C2838;stroke:#33445A;stroke-width:.15;}
  #sadmin .aiMap .t{fill:#62748C;font-size:1.6px;}
  #sadmin .aiMap .z{fill:rgba(0,229,255,.10);stroke:rgba(0,229,255,.55);stroke-width:.2;stroke-dasharray:.7 .5;}
  #sadmin .aiMap .d{fill:#131A24;stroke:#94B8E0;stroke-width:.3;}
  #sadmin .aiMap .d1{fill:#00E5FF;stroke:#E7F6FF;stroke-width:.3;}
  #sadmin .aiMap .ap{stroke-dasharray:.6 .45;}
  #sadmin .aiMap .n{fill:#E7F6FF;font-size:1.9px;font-weight:800;text-anchor:middle;dominant-baseline:central;}
  #sadmin .aiMap .n1{fill:#04121A;}
  #sadmin .aiMapNote{font-size:10px;color:#7C8AA0;margin-top:4px;line-height:1.45;}
'@ '후보 평면도 모양'

Swap @'
    nodes: function(){ build(); return N; }
  };
})();
'@ @'
    nodes: function(){ build(); return N; }
  };
})();

/* v83 : 관리자 건의함 — AI 후보를 층 평면도 위 점으로.
   cands 는 순위대로 [{code, sim}], labelFn 은 코드 → 한글 이름.
   위쪽 = 엘리베이터에서 내려 바라보는 방향(−X), 왼쪽 = 왼쪽 복도(+Z). */
function aiMapEsc(t){ return String(t).replace(/[&<>"]/g, function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]; }); }
function aiMiniMapHtml(cands, labelFn){
  if(!cands || !cands.length || typeof place3D !== 'function') return '';
  labelFn = labelFn || function(c){ return c; };
  var byFloor = {}, orderF = [], outside = [], tot = 0;
  cands.forEach(function(c, i){
    tot += c.sim || 0;
    var p = place3D(c.code);
    if(!p){ outside.push({c:c, rank:i + 1}); return; }
    var fk = String(p.floor);
    if(!byFloor[fk]){ byFloor[fk] = {floor:p.floor, items:[], sum:0}; orderF.push(fk); }
    byFloor[fk].items.push({c:c, p:p, rank:i + 1}); byFloor[fk].sum += c.sim || 0;
  });
  if(!orderF.length) return '';
  orderF.sort(function(a, b){ return byFloor[b].sum - byFloor[a].sum; });
  var h = '<div class="aiMap">';
  orderF.slice(0, 3).forEach(function(fk){ h += aiMiniMapFloor(byFloor[fk], tot, labelFn); });
  var notes = [];
  orderF.slice(3).forEach(function(fk){
    var F = byFloor[fk];
    notes.push((F.floor === 'B1' ? '지하 1층' : F.floor + '층') + ' : ' +
      F.items.map(function(it){ return it.rank + ' ' + labelFn(it.c.code); }).join(', '));
  });
  outside.forEach(function(o){ notes.push(o.rank + ' ' + labelFn(o.c.code) + ' (평면도에 없는 곳)'); });
  if(notes.length) h += '<div class="aiMapNote">그 밖의 후보 — ' + aiMapEsc(notes.join(' · ')) + '</div>';
  h += '<div class="aiMapNote">번호 = 위 후보 버튼의 순위 · 채운 점 = 1등 · 점선 = 평면도에 표시가 없어 어림한 자리'
     + '<br>지도 위쪽이 엘리베이터에서 내려 바라보는 쪽입니다</div>';
  return h + '</div>';
}
function aiMiniMapFloor(F, tot, labelFn){
  var isB1 = (F.floor === 'B1'), L = FLOOR_LAYOUT[isB1 ? 1 : F.floor];
  if(!L) return '';
  var TOP = GLOBAL_TOP_Z, BOT = GLOBAL_BOT_Z, HX = GLOBAL_HALF_X, PAD = 1.8;   /* 점(반지름 1.55)이 가장자리에서 잘리지 않게 */
  var W = (TOP - BOT) + PAD * 2, H = HX * 2 + PAD * 2;
  function X(z){ return (TOP - z + PAD).toFixed(2); }
  function Y(x){ return (x + HX + PAD).toFixed(2); }
  function R(x, z, w, d, cls){   /* 세계 좌표의 상자(가운데 x,z · X 폭 w · Z 길이 d) */
    return '<rect class="' + cls + '" x="' + X(z + d / 2) + '" y="' + Y(x - w / 2) + '" width="' + Math.abs(d).toFixed(2) + '" height="' + Math.abs(w).toFixed(2) + '"/>';
  }
  function T(x, z, txt, anchor){ return '<text class="t" x="' + X(z) + '" y="' + Y(x) + '" text-anchor="' + (anchor || 'middle') + '" dominant-baseline="central">' + txt + '</text>'; }
  var name = isB1 ? '지하 1층' : F.floor + '층';
  var share = tot ? Math.round(F.sum / tot * 100) : 0;
  var h = '<div class="fl"><b>' + name + '</b> · 후보 ' + F.items.length + '개 · 유사도 몫 ' + share + '%</div>';
  var s = '<svg viewBox="0 0 ' + W.toFixed(2) + ' ' + H.toFixed(2) + '" role="img" aria-label="' + aiMapEsc(name + ' 평면도의 AI 후보 위치') + '">';
  if(!isB1){
    s += R(0, (L.topOuterZ + L.bottomOuterZ) / 2, L.halfX * 2, L.topOuterZ - L.bottomOuterZ, 'o');   /* 지하는 평면도가 없다 — 1층 윤곽을 겹치지 않는다 */
    s += R(0, (L.topOuterZ + L.bottomOuterZ) / 2, CORR_HALF * 2, L.topOuterZ - L.bottomOuterZ, 'c');
    L.cells.forEach(function(c){ if(c.code) s += R(c.x, c.z, c.w - 0.3, c.d - 0.3, 'r'); });
    s += R(L.coreX, L.evZ, ROOM_W - 0.3, UNIT_Z, 'k') + T(L.coreX, L.evZ, 'EV');
    s += R(L.coreX, L.stZ, ROOM_W - 0.3, UNIT_Z, 'k') + T(L.coreX, L.stZ, '계단');
    var es = EMSTAIR_POS[F.floor];
    if(es) s += R(es.xWhole, es.z, es.w, es.d, 'k') + T(es.xWhole - 1, es.z, '비상') + T(es.xWhole + 1, es.z, '계단');   /* 칸이 좁아 두 줄 */
    s += T(-HX + 1.4, TOP - 0.6, '← 왼쪽 복도', 'start') + T(-HX + 1.4, L.bottomOuterZ + 0.6, '오른쪽 복도 →', 'end');
  } else {
    s += R(B1_ZONE_MID_X, B1_ZONE_MID_Z, B1_ZONE_WIDTH_X, B1_ZONE_TOP_Z - B1_ZONE_BOT_Z, 'r')
       + T(B1_ZONE_MID_X - B1_ZONE_WIDTH_X / 2 + 1.4, B1_ZONE_TOP_Z - 0.6, '크리에이티브 존', 'start');   /* 가운데는 점 자리 */
    var eb = evXZ('B1'); s += R(eb.x, eb.z, 4, UNIT_Z, 'k') + T(eb.x, eb.z, 'EV');
  }
  /* 같은 자리에 겹치는 후보(엘리베이터 앞 · 라운지 · 안내판 등)는 복도 방향으로 조금씩 비켜 놓는다 */
  var used = {}, dots = F.items.map(function(it){
    var key = it.p.x.toFixed(1) + ',' + it.p.z.toFixed(1), k = used[key] || 0; used[key] = k + 1;
    return {it:it, x:it.p.x, z:it.p.z + (k ? (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 3.4 : 0)};
  });
  dots.forEach(function(d){   /* 구역(복도 한쪽 전체 · 지하 존)은 먼저 옅게 */
    var p = d.it.p; if(p.w && p.d) s += R(p.x, p.z, p.w, p.d, 'z');
  });
  dots.slice().reverse().forEach(function(d){   /* 1등이 맨 위에 오도록 뒤 순위부터 */
    var it = d.it, first = (it.rank === 1);
    var tip = it.rank + '등 ' + labelFn(it.c.code) + ' ' + Math.round((it.c.sim || 0) * 100) + '%' + (it.p.exact ? '' : ' (어림한 자리)');
    s += '<g><title>' + aiMapEsc(tip) + '</title>'
       + '<circle class="' + (first ? 'd1' : 'd') + (it.p.exact ? '' : ' ap') + '" cx="' + X(d.z) + '" cy="' + Y(d.x) + '" r="1.55"/>'
       + '<text class="n' + (first ? ' n1' : '') + '" x="' + X(d.z) + '" y="' + Y(d.x) + '">' + it.rank + '</text></g>';
  });
  return h + s + '</svg>';
}
'@ '후보 평면도 그리기'

Swap @'
        h += '<button onclick="SUGAI.pick(\''+s.id+'\',\''+c.code+'\')" title="'+codeLabel(c.code)+'">'
           + codeLabel(c.code)+' <span class="num">'+c.code+' · '+(c.sim*100).toFixed(0)+'%</span></button>';
      }
      h += '</div>';
    }
    return h + '</div>';
'@ @'
        h += '<button onclick="SUGAI.pick(\''+s.id+'\',\''+c.code+'\')" title="'+codeLabel(c.code)+'">'
           + '<span class="rk">'+(i+1)+'</span>'                     /* v83 : 평면도의 점 번호와 같다 */
           + codeLabel(c.code)+' <span class="num">'+c.code+' · '+(c.sim*100).toFixed(0)+'%</span></button>';
      }
      h += '</div>';
      if(typeof aiMiniMapHtml === 'function') h += aiMiniMapHtml(cands, codeLabel);   /* v83 */
    }
    return h + '</div>';
'@ '후보 버튼 번호 + 평면도 붙이기'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
