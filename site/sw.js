/* sw.js — 인터넷 없이 열기 (서비스 워커)

   처음 열 때 앱 파일 약 12MB(화면·코드·장소 사진·3D)를 폰에 저장해 두고, 다음부터는 저장한 것으로 연다.
   그래서 지하·계단처럼 인터넷이 약한 곳에서도 길안내가 된다.
   AI 사진 판별 자료(data/aivec.js · data/ailib.js 10.5MB)와 AI 라이브러리(lib/ 12MB)는 저장하지 않는다
   — AI 는 인터넷이 될 때만 쓴다 (sugai.js 가 "인터넷이 없어 AI 는 쉬어요"라고 알려 준다).

   ※ 아래 VERSION · FILES 는 도구\오프라인목록.ps1 이 만든다. 손으로 고치지 않는다.
     site\ 의 파일을 하나라도 고치면 다시 돌려야 한다 — 안 맞으면 검사.ps1 이 [실패]로 알려 준다.
     VERSION 이 바뀌면 폰이 새 목록을 받는데, 바뀐 파일만 새로 받고 안 바뀐 파일(사진 등)은 전에 저장한 것을 옮겨 쓴다.
     받은 파일은 목록의 지문(SHA-256 앞 12자리)과 맞는지 확인한다 — 올린 직후 옛 파일이 섞여 오면 다시 받는다. */
'use strict';

// ↓↓↓ 도구\오프라인목록.ps1 이 채운다 — 손으로 고치지 않는다
var VERSION = '6f3923650bf8';   // 파일 194개 · 12.1MB
var FILES = [
  ['3d/realistic.html','fad48337e13a',78531],
  ['3d/tex/01.png','c66e23f057fc',50906],
  ['3d/tex/02.jpg','7c73c547aee9',56154],
  ['3d/tex/03.jpg','adaf838029b9',11139],
  ['3d/tex/04.png','5c828609ae82',62049],
  ['3d/tex/05.png','673a3dcb270f',40043],
  ['3d/tex/06.jpg','412359a785a0',103199],
  ['3d/tex/07.jpg','cf48e590985d',13167],
  ['3d/tex/08.jpg','5956bffd73d0',325073],
  ['3d/tex/09.jpg','fde3d47ac6da',27698],
  ['3d/tex/10.jpg','bbd5797bfc3d',136234],
  ['3d/tex/11.jpg','0d2e5efbcc7b',14748],
  ['3d/tex/12.jpg','90fec3db40c5',92126],
  ['3d/tex/13.jpg','d32f0d2ad9e5',15612],
  ['3d/tex/14.jpg','62c73f4cd15d',73039],
  ['3d/tex/15.jpg','19746d3c6739',23910],
  ['3d/tex/16.png','c9bfe00bf000',16491],
  ['3d/tex/17.png','3244072f27e1',17992],
  ['3d/tex/18.png','d2d2e0a634b6',2992],
  ['3d/tex/19.png','dfbf4fb3776e',3056],
  ['3d/tex/20.png','3d65f66b2f70',3051],
  ['3d/tex/21.png','5185337f5f27',7799],
  ['css/app.css','9a22a6cf229f',71224],
  ['css/boot.css','b3a18297534a',1353],
  ['data/photos.js','624328ef5cde',12183],
  ['data/photos/13101/01.jpg','8e1f1c56e2fd',91544],
  ['data/photos/13102/01.jpg','ca0c0d594663',80325],
  ['data/photos/13102/02.jpg','5f4ce1b98abd',92292],
  ['data/photos/13103/01.jpg','f66903a2b10b',62506],
  ['data/photos/13104/01.jpg','eba9ca2f9496',69634],
  ['data/photos/13104/02.jpg','ac5b5c392058',79533],
  ['data/photos/13106/01.jpg','a9c70fab1846',65128],
  ['data/photos/13107/01.jpg','8811769b093c',50391],
  ['data/photos/13108/01.jpg','268d16de45f1',47787],
  ['data/photos/13109/01.jpg','013a65673f0b',45879],
  ['data/photos/13110/01.jpg','32a3e6b59fa7',50671],
  ['data/photos/13111/01.jpg','1f51c80923b6',47096],
  ['data/photos/13112/01.jpg','ed470604de99',48544],
  ['data/photos/13113/01.jpg','0b84cff57505',47983],
  ['data/photos/13114/01.jpg','188ffe813b40',89777],
  ['data/photos/13115/01.jpg','d73fe57996cd',58883],
  ['data/photos/13115/02.jpg','ea02ac1a9562',58265],
  ['data/photos/13115/03.jpg','e63e57349c61',67094],
  ['data/photos/13116/01.jpg','c5d3d297b6a5',48907],
  ['data/photos/13117/01.jpg','b412e285114f',57502],
  ['data/photos/13119/01.jpg','80186c9aa768',90579],
  ['data/photos/13120/01.jpg','b321e4481bac',91021],
  ['data/photos/13121-A/01.jpg','9e1533ac0f0f',78934],
  ['data/photos/13121-A/02.jpg','50444c63fca5',82796],
  ['data/photos/13121-B/01.jpg','c5d463967701',79995],
  ['data/photos/13121-B/02.jpg','05b743a6cdba',68815],
  ['data/photos/13125/01.jpg','4b9efcd54bf0',73630],
  ['data/photos/13201/01.jpg','a923636f4964',43967],
  ['data/photos/13202/01.jpg','d5d39e331962',52522],
  ['data/photos/13203/01.jpg','d2a1b0229a05',47444],
  ['data/photos/13204/01.jpg','2dff2821800e',52761],
  ['data/photos/13205/01.jpg','9df3c13de23e',72104],
  ['data/photos/13207/01.jpg','06784e30cba6',39896],
  ['data/photos/13207/02.jpg','e456fc25d51d',50595],
  ['data/photos/13208/01.jpg','6eeb7c1d1956',42061],
  ['data/photos/13211/01.jpg','1dccaa934d33',45644],
  ['data/photos/13212/01.jpg','7651fb470c32',40679],
  ['data/photos/13213/01.jpg','d0d6db018d27',37367],
  ['data/photos/13214/01.jpg','a81073984566',46047],
  ['data/photos/13215/01.jpg','5a001df4af22',74181],
  ['data/photos/13217/01.jpg','0fcfeb2da15b',57243],
  ['data/photos/13218/01.jpg','eef1ece0ecef',49729],
  ['data/photos/13219/01.jpg','8f66d09e5dc3',58160],
  ['data/photos/13221/01.jpg','6db95f20c864',32768],
  ['data/photos/13224/01.jpg','a33f57c9df46',34630],
  ['data/photos/13225/01.jpg','63a0ce4eb54b',46294],
  ['data/photos/13226/01.jpg','7f4111590c40',47566],
  ['data/photos/13226/02.jpg','3941ed76f9f1',55819],
  ['data/photos/13301/01.jpg','842a4b28b668',73722],
  ['data/photos/13303/01.jpg','fc97db96c811',34366],
  ['data/photos/13304/01.jpg','62122cd28b43',57207],
  ['data/photos/13306/01.jpg','8becf1a1499d',59587],
  ['data/photos/13310/01.jpg','bafe4536a458',59153],
  ['data/photos/13313/01.jpg','dc943e8b1ae8',48043],
  ['data/photos/13315/01.jpg','914cb5162c01',38347],
  ['data/photos/13316/01.jpg','667b73de5dd2',47582],
  ['data/photos/13317/01.jpg','989f40375b0b',49468],
  ['data/photos/13318/01.jpg','0be902a51a1b',60615],
  ['data/photos/13319/01.jpg','9e7e8200eb13',61800],
  ['data/photos/13322/01.jpg','e4e3d1ebd473',71525],
  ['data/photos/13324/01.jpg','472a0172a77e',71762],
  ['data/photos/13325/01.jpg','b0fa934f75e0',33286],
  ['data/photos/13326/01.jpg','3f83d19d68d9',55339],
  ['data/photos/13401/01.jpg','51bd8aa35ba9',72715],
  ['data/photos/13402/01.jpg','b92345caea1e',75009],
  ['data/photos/13403/01.jpg','6093acee6b7c',57034],
  ['data/photos/13405/01.jpg','c61942d519a8',49338],
  ['data/photos/13406/01.jpg','7d1692a936da',52219],
  ['data/photos/13407/01.jpg','c60b8b50b12a',47649],
  ['data/photos/13408/01.jpg','1629afedffa9',49448],
  ['data/photos/13409/01.jpg','0d36486c3550',45732],
  ['data/photos/13410/01.jpg','7fd31206cfc0',50580],
  ['data/photos/13411/01.jpg','17438eb6e860',60056],
  ['data/photos/13412/01.jpg','bde3127a26c0',45615],
  ['data/photos/13413/01.jpg','62a13c073595',72974],
  ['data/photos/13414/01.jpg','1ecbbd35f667',68860],
  ['data/photos/13415/01.jpg','a05e7a99e5f0',70128],
  ['data/photos/13417/01.jpg','0c0fb8e800ea',59969],
  ['data/photos/13419/01.jpg','6e2b0739735c',47886],
  ['data/photos/13420/01.jpg','6e35518ea166',69522],
  ['data/photos/13421/01.jpg','187be60e9b0b',59965],
  ['data/photos/13422/01.jpg','847625a34823',49088],
  ['data/photos/13501/01.jpg','6e2802aa092d',64968],
  ['data/photos/13502/01.jpg','a1403d6d1ada',62544],
  ['data/photos/13502/02.jpg','95e6b08301c8',54410],
  ['data/photos/13504/01.jpg','a51e44242ddc',59953],
  ['data/photos/13505/01.jpg','ddd5d24c1818',60824],
  ['data/photos/13506/01.jpg','88055a9400c1',61520],
  ['data/photos/13508/01.jpg','5f482ad49e5a',52355],
  ['data/photos/13509/01.jpg','a28cd4227fd7',38880],
  ['data/photos/13510/01.jpg','367cd4eb5a12',40925],
  ['data/photos/13511/01.jpg','feb7948ebc40',36967],
  ['data/photos/13512/01.jpg','d260a46e9e62',41902],
  ['data/photos/13513/01.jpg','c11d747b1cb0',41876],
  ['data/photos/13514/01.jpg','a4fa9579a97f',43421],
  ['data/photos/13515/01.jpg','f07c8e17fd10',42462],
  ['data/photos/13516/01.jpg','4ac0bc3f83f1',59036],
  ['data/photos/13516/02.jpg','b60f22d651bc',57791],
  ['data/photos/13517/01.jpg','9715369ef710',74113],
  ['data/photos/13518/01.jpg','d69a79172443',79555],
  ['data/photos/13520/01.jpg','47090821b50d',42813],
  ['data/photos/13522/01.jpg','6546d1e1d6b3',44602],
  ['data/photos/13523/01.jpg','a03c990cd63a',46929],
  ['data/photos/13524/01.jpg','0bde67ead864',75536],
  ['data/photos/B1/01.jpg','314cdedaa361',105754],
  ['data/photos/BLD/01.jpg','ba7d93b5e0c4',138193],
  ['data/photos/BLD/02.jpg','0be76ded8b3e',112249],
  ['data/photos/BLD/03.jpg','9748826a6b07',129215],
  ['data/photos/BLD/04.jpg','4510adafe16d',84982],
  ['data/photos/BLD/05.jpg','f8c13fd9d4c9',165450],
  ['data/photos/BLD/06.jpg','ed239b142210',162153],
  ['data/photos/BLD/07.jpg','4bf68b6750bb',136345],
  ['data/photos/BLD/08.jpg','bba71dd0bd6c',160669],
  ['data/photos/EV1/01.jpg','845d3c00ebd7',139298],
  ['data/photos/EV1/02.jpg','bd5b1224d4d3',144114],
  ['data/photos/EV1/03.jpg','1ffef4c5b8d8',135274],
  ['data/photos/EV1/04.jpg','250c76fc6987',122491],
  ['data/photos/EV1/05.jpg','af592864dc67',129219],
  ['data/photos/EV2/01.jpg','4a390b19f5d8',110250],
  ['data/photos/EV3/01.jpg','ff8bc1e88290',104854],
  ['data/photos/EV4/01.jpg','d23d535bb510',106741],
  ['data/photos/EV5/01.jpg','9c996b13d8a2',92902],
  ['data/photos/HALL1L/01.jpg','c3fec5f13632',105569],
  ['data/photos/HALL1R/01.jpg','562245d8ca1a',106111],
  ['data/photos/HALL2L/01.jpg','50a339da9edd',107528],
  ['data/photos/HALL2R/01.jpg','fd409719b84e',79555],
  ['data/photos/HALL3L/01.jpg','91a545763f74',100728],
  ['data/photos/HALL3R/01.jpg','cc7216ebb953',83264],
  ['data/photos/HALL4L/01.jpg','f710885fccf1',95332],
  ['data/photos/HALL4R/01.jpg','e559222ebb06',101188],
  ['data/photos/HALL5L/01.jpg','dc495d7515e2',84501],
  ['data/photos/HALL5R/01.jpg','bb182d2ae6fc',107454],
  ['data/photos/KTC/01.jpg','e25f69e8aade',58973],
  ['data/places.js','02bc4d37cb3f',1500],
  ['img/exit-sign.png','f1b9ed7cd89e',27291],
  ['img/icon-180.png','bd9c894f1d5d',5036],
  ['img/icon-192.png','a6893220bee4',5036],
  ['img/icon-512.png','de753e3f6802',14880],
  ['img/icon.svg','99ad3cbde680',2002],
  ['index.html','59509202b069',50478],
  ['js/app/aid.js','daa92696b9a7',32661],
  ['js/app/boot.js','3871e692681d',7524],
  ['js/app/building.js','647a70cb183a',23274],
  ['js/app/floor-detail.js','ca4e4ca62472',17637],
  ['js/app/guide.js','2c37b0a48c21',19338],
  ['js/app/overview3d.js','47c06c2bd86f',87519],
  ['js/app/photos.js','09e1a97dba6e',51098],
  ['js/app/pwa.js','b1f52bf08bdc',15919],
  ['js/app/qrnav.js','1ab04e81bfc1',20800],
  ['js/app/roadview-1f.js','14696e0f4c2a',46207],
  ['js/app/roadview-b1.js','7d5ac6c79e08',157916],
  ['js/app/roadview-corr.js','553335d11e63',47370],
  ['js/app/roadview-free.js','c0d1249f0b54',92167],
  ['js/app/roadview-play.js','8532c01564db',23533],
  ['js/app/roadview-roof.js','21f2a5e8678f',119576],
  ['js/app/roadview-stairs.js','7f992b896804',70498],
  ['js/app/roadview.js','87113d5906a0',126123],
  ['js/app/shell.js','4939bee63d01',17041],
  ['js/app/start.js','4065777331b0',1505],
  ['js/app/sugai.js','5a7c207579d1',131009],
  ['js/app/sugdb.js','df49ab439b73',17964],
  ['js/app/suggest.js','dd852f0fd5de',46898],
  ['js/app/ui.js','d5a2efa4e407',25194],
  ['js/app/view3d.js','bf2f5a305768',42522],
  ['js/app/zoom.js','0bc33c826b8c',8395],
  ['js/vendor/jsqr.min.js','a07c909282f1',130501],
  ['js/vendor/jszip.min.js','57fff0459a39',97676],
  ['js/vendor/three.min.js','ab353cb93cfa',603491],
  ['manifest.webmanifest','4419a01b0382',680]
];
// ↑↑↑ 도구\오프라인목록.ps1 이 채운다

var CACHE = 'b3nav-' + VERSION;
var FONT_CACHE = 'b3nav-font';                      // 글꼴(Pretendard, 인터넷 주소)은 한 번 쓴 것만 따로 모아 둔다
var FONT_RX = /^https:\/\/cdn\.jsdelivr\.net\/gh\/orioncactus\/pretendard@/;
var SIM_OFFLINE = false;                            // 검사(tests/pwa.html)가 "인터넷 끊김"을 흉내 낼 때만 켠다

function abs(p){ return new URL(p, self.registration.scope).href; }
function totalBytes(){ var s = 0; FILES.forEach(function(f){ s += f[2]; }); return s; }
function tell(msg){
  return self.clients.matchAll({includeUncontrolled:true, type:'window'})
    .then(function(cs){ cs.forEach(function(c){ c.postMessage(msg); }); });
}
function net(req){
  return SIM_OFFLINE ? Promise.reject(new TypeError('인터넷 끊김 (검사가 흉내 냄)')) : fetch(req);
}
function sha12(buf){
  return crypto.subtle.digest('SHA-256', buf).then(function(d){
    var b = new Uint8Array(d), s = '';
    for(var i = 0; i < 6; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16);
    return s;
  });
}

/* 파일 하나를 받아 지문을 확인한다. bust = 브라우저·서버에 남은 옛 파일을 피해 새로 받기 */
function fetchChecked(f, bust){
  var req = bust ? new Request(abs(f[0]) + '?v=' + VERSION, {cache:'reload'}) : new Request(abs(f[0]));
  return net(req).then(function(r){
    if(!r.ok) throw new Error(f[0] + ' 받기 실패 ' + r.status);
    return r.arrayBuffer().then(function(buf){
      return sha12(buf).then(function(h){
        if(h !== f[1]) throw new Error(f[0] + ' 지문이 다름');
        return new Response(buf, {headers:{'Content-Type': r.headers.get('Content-Type') || 'application/octet-stream', 'X-B3-Hash': h}});
      });
    });
  });
}

/* 예전 판에 같은 지문으로 저장된 파일이 있으면 그것을 쓴다 (사진을 매번 다시 받지 않게) */
function oldCaches(){
  return caches.keys().then(function(names){
    return Promise.all(names.filter(function(n){ return n.indexOf('b3nav-') === 0 && n !== CACHE && n !== FONT_CACHE; })
                            .map(function(n){ return caches.open(n); }));
  });
}
function findOld(olds, f){
  var i = 0;
  function next(){
    if(i >= olds.length) return Promise.resolve(null);
    return olds[i++].match(abs(f[0])).then(function(r){
      return (r && r.headers.get('X-B3-Hash') === f[1]) ? r : next();
    });
  }
  return next();
}

function precache(){
  var done = 0, T = totalBytes(), queue = FILES.slice();
  return Promise.all([caches.open(CACHE), oldCaches()]).then(function(v){
    var cache = v[0], olds = v[1];
    function one(f){
      return cache.match(abs(f[0])).then(function(have){
        if(have && have.headers.get('X-B3-Hash') === f[1]) return;        // 지난번에 받다 끊긴 경우 — 받은 것은 그대로
        return findOld(olds, f).then(function(r){
          if(r) return cache.put(abs(f[0]), r);
          return fetchChecked(f, false)['catch'](function(){ return fetchChecked(f, true); })
            .then(function(res){ return cache.put(abs(f[0]), res); });
        });
      }).then(function(){
        done++;
        if(done % 8 === 0 || done === FILES.length) tell({type:'progress', done:done, total:FILES.length, bytes:T});
      });
    }
    function worker(){ var f = queue.shift(); return f ? one(f).then(worker) : Promise.resolve(); }
    return Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
  }).then(function(){
    return tell({type:'ready', version:VERSION, total:FILES.length, bytes:T});
  }, function(err){
    /* 하나라도 못 받으면 이번 설치는 실패 — 쓰던 판(있다면)을 그대로 쓰고, 다음에 열 때 다시 한다 */
    return tell({type:'fail', why:String(err && err.message || err)}).then(function(){ throw err; });
  });
}

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(precache());
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(names){
    return Promise.all(names.filter(function(n){ return n.indexOf('b3nav-') === 0 && n !== CACHE && n !== FONT_CACHE; })
                            .map(function(n){ return caches.delete(n); }));
  }).then(function(){ return self.clients.claim(); }));
});

/* 앱 파일 : 저장한 것 먼저 (주소 뒤 ?gate= 같은 것은 무시), 없으면 인터넷 */
function local(req, url){
  var path = url.pathname.slice(-1) === '/' ? url.pathname + 'index.html' : url.pathname;
  return caches.open(CACHE).then(function(c){ return c.match(url.origin + path); })
    .then(function(hit){ return hit || net(req); });
}
/* 글꼴 : 한 번 받은 것은 저장해 두고 그것을 쓴다 */
function font(req){
  return caches.open(FONT_CACHE).then(function(c){
    return c.match(req).then(function(hit){
      if(hit) return hit;
      return net(req).then(function(r){
        if(r.ok || r.type === 'opaque') c.put(req, r.clone());
        return r;
      });
    });
  });
}

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin === self.location.origin){
    if(url.pathname.indexOf(new URL(self.registration.scope).pathname) !== 0) return;
    e.respondWith(local(req, url));
  } else if(FONT_RX.test(req.url)){
    e.respondWith(font(req));
  } else if(SIM_OFFLINE){
    e.respondWith(Promise.reject(new TypeError('인터넷 끊김 (검사가 흉내 냄)')));
  }
});

self.addEventListener('message', function(e){
  var d = e.data || {};
  var src = e.source;
  if(d.type === 'status'){
    e.waitUntil(caches.open(CACHE).then(function(c){ return c.keys(); }).then(function(keys){
      if(src) src.postMessage({type:'status', version:VERSION, cached:keys.length, total:FILES.length, bytes:totalBytes()});
    }));
  } else if(d.type === 'simOffline'){
    SIM_OFFLINE = !!d.on;
    if(src) src.postMessage({type:'simOffline', on:SIM_OFFLINE});
  }
});
