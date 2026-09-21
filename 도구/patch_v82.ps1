# v82 — 3D 성능 재기(?perf=1) + 테두리 선 합치기 시험 스위치(?merge=1)
#
#   목적지 3D 화면(s4)은 한 프레임에 드로우콜이 500~620개다. 그중 약 400개가 방·타일 상자의
#   파란 테두리 선(EdgesGeometry)이고, 선마다 재질을 따로 가진다.
#   색·투명도가 같은 선을 층마다 한 덩어리로 합치면 (2026-09-21 이 PC, 800×600)
#     드로우콜 508 → 255, 한 프레임 8.6ms → 3.0ms.
#   다만 그림이 완전히 같지는 않다 — 원래는 방 상자를 그린 '바로 뒤'에 그 테두리를 그려서
#   테두리가 늘 또렷했는데, 합치면 층의 테두리가 한꺼번에 그려져 앞쪽 반투명 상자에 살짝 물든다.
#   위치는 정확히 같고(차이 그림에서 선 자리만 밝기가 다름) 선이 어긋나거나 사라지지는 않는다.
#
#   그래서 기본값은 그대로 두고 주소 뒤에 붙이는 스위치로만 켠다.
#     ?perf=1          화면 왼쪽 위에 초당 장면 수 · 드로우콜 · 그리기 시간 표시
#     ?merge=1         테두리 선 합치기 켜기
#     ?perf=1&merge=1  둘 다 — 폰에서 두 주소를 번갈아 열어 비교한다
#   폰에서 차이가 크고 모양이 괜찮다고 판단되면 edgeMergeOn() 이 늘 true 를 돌려주게만 바꾸면 된다.
#
#   합치지 않는 선 : 이름표(userData)가 있는 선(비상계단·출입문), 문 부품 아래의 선,
#   숨겨진 선. 층 그룹 밖(건물 슬래브 등)은 건드리지 않는다. 층 상세(s5)도 그대로.
#   걷기(로드뷰) 모드는 원래 LineSegments 를 전부 숨기므로 합친 선도 똑같이 숨는다.
#
#   사용법 : pwsh -File patch_v82.ps1 <대상파일>
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
  for(var i=0;i<LEVELS.length;i++){
    var g=new THREE.Group();
    addLevelContents(g, LEVELS[i], false);
    buildingRoot.add(g); floorGroups.push(g);
  }
  layout();
'@ @'
  for(var i=0;i<LEVELS.length;i++){
    var g=new THREE.Group();
    addLevelContents(g, LEVELS[i], false);
    if(edgeMergeOn()) mergeFloorEdges(g);         // v82 : ?merge=1 일 때만
    buildingRoot.add(g); floorGroups.push(g);
  }
  layout();
'@ '처음 지을 때 합치기'

Swap @'
    while(g.children.length) g.remove(g.children[0]);
    addLevelContents(g, LEVELS[i], false);
  }
  if(typeof highlight3D==='function') highlight3D();
}
'@ @'
    while(g.children.length) g.remove(g.children[0]);
    addLevelContents(g, LEVELS[i], false);
    if(edgeMergeOn()) mergeFloorEdges(g);         // v82
  }
  if(typeof highlight3D==='function') highlight3D();
}

/* v82 : 층 그룹 안의 테두리 선을 색·투명도가 같은 것끼리 하나로 합친다 (?merge=1 일 때만).
   선마다 층 그룹 기준 좌표로 옮겨 붙이므로 위치는 그대로다. 층을 벌리는 layout() 은
   그룹째 움직이므로 합친 선도 같이 움직인다. highlight3D 는 이름표 없는 선에
   층 단위로 같은 투명도를 주므로(가는 층·지금 층 1, 나머지 0.07) 합쳐도 규칙이 같다. */
function edgeMergeOn(){ return /[?&]merge=1(&|$)/.test(location.search || ''); }   /* 함수로 둔다 — 처음 짓는 코드가 이 줄보다 먼저 돌 수 있다 */
function mergeFloorEdges(g){
  if(!g) return 0;
  g.updateMatrixWorld(true);
  var buckets = {}, order = [];
  g.traverse(function(o){
    if(o.type !== 'LineSegments') return;
    if(o.userData && Object.keys(o.userData).length) return;      // 비상계단·출입문 선은 따로 다룬다
    var m = o.material, geo = o.geometry;
    if(!m || Array.isArray(m) || m.type !== 'LineBasicMaterial' || m.map) return;
    if(!geo || geo.index || !geo.attributes.position || geo.attributes.position.itemSize !== 3) return;
    if(Object.keys(geo.attributes).length !== 1) return;
    var M = o.matrix.clone(), p = o.parent, ok = o.visible;
    while(ok && p && p !== g){                                    // 문 부품 아래·숨긴 것 아래는 건너뛴다
      var ud = p.userData || {};
      if(!p.visible || ud.door || ud.gatePart || ud.b1door) ok = false;
      M.premultiply(p.matrix); p = p.parent;
    }
    if(!ok || p !== g) return;
    var key = [m.color.getHex(), m.opacity, m.transparent, m.depthWrite, m.depthTest, m.blending,
               m.linewidth, o.renderOrder, m.side, m.fog, m.toneMapped, m.vertexColors].join('|');
    if(!buckets[key]){ buckets[key] = {mat:m, ro:o.renderOrder, parts:[], n:0}; order.push(key); }
    buckets[key].parts.push({o:o, geo:geo, M:M}); buckets[key].n += geo.attributes.position.count;
  });
  var removed = 0, v = new THREE.Vector3();
  order.forEach(function(key){
    var b = buckets[key]; if(b.parts.length < 2) return;
    var arr = new Float32Array(b.n * 3), off = 0;
    b.parts.forEach(function(pt){
      var pos = pt.geo.attributes.position;
      for(var i = 0; i < pos.count; i++){
        v.fromBufferAttribute(pos, i).applyMatrix4(pt.M);
        arr[off++] = v.x; arr[off++] = v.y; arr[off++] = v.z;
      }
    });
    var ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    ng.computeBoundingSphere();
    var nl = new THREE.LineSegments(ng, b.mat.clone());
    nl.renderOrder = b.ro; nl.name = 'mergedEdges';
    g.add(nl);
    b.parts.forEach(function(pt){ pt.o.parent.remove(pt.o); pt.geo.dispose(); pt.o.material.dispose(); removed++; });
  });
  return removed;
}

/* v82 : ?perf=1 — 목적지 3D 를 그리는 동안 왼쪽 위에 성능을 1초마다 표시한다.
   fps = 실제로 그린 장면 수(폰은 30 이 상한), calls = 드로우콜, ms = renderer.render 한 번에 든 시간.
   폰에서 재는 방법은 3D_성능_재는법.txt. */
var PERF_ON = /[?&]perf=1(&|$)/.test(location.search || '');
var PERF = {n:0, ms:0, t0:0, el:null};
function perfRender(){
  var t = performance.now();
  renderer.render(scene, camera);
  var now = performance.now();
  PERF.n++; PERF.ms += now - t;
  if(!PERF.t0) PERF.t0 = now;
  if(now - PERF.t0 >= 1000){
    if(!PERF.el){
      PERF.el = document.createElement('div');
      PERF.el.style.cssText = 'position:fixed;left:6px;top:6px;z-index:99999;padding:4px 8px;border-radius:6px;' +
        'background:rgba(0,0,0,.72);color:#9FF;font:12px/1.4 monospace;pointer-events:none;white-space:pre';
      document.body.appendChild(PERF.el);
    }
    var fps = PERF.n * 1000 / (now - PERF.t0);
    PERF.el.textContent = 'fps ' + fps.toFixed(1) + '  calls ' + renderer.info.render.calls +
      '\nms ' + (PERF.ms / PERF.n).toFixed(1) + '  ' + renderer.domElement.width + 'x' + renderer.domElement.height +
      ' @' + renderer.getPixelRatio().toFixed(2) + '\n' + (edgeMergeOn() ? 'merge ON' : 'merge off') + (A3D_MOBILE ? ' · mobile' : '');
    PERF.n = 0; PERF.ms = 0; PERF.t0 = now;
  }
}
'@ '다시 지을 때 합치기 + 합치기 함수 + 성능 표시'

Swap @'
  if(!A3D_SKIP) renderer.render(scene,camera);
}
'@ @'
  if(!A3D_SKIP){ if(PERF_ON) perfRender(); else renderer.render(scene,camera); }
}
'@ '그리기에 성능 재기 연결'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
