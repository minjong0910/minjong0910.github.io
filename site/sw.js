/* sw.js — 인터넷 없이 열기 (서비스 워커)

   처음 열 때 앱 파일 약 14MB(화면·코드·장소 사진·3D)를 폰에 저장해 두고, 다음부터는 저장한 것으로 연다.
   그래서 지하·계단처럼 인터넷이 약한 곳에서도 길안내가 된다.
   AI 사진 판별 자료(data/aivec.js · data/ailib.js 10.5MB)와 AI 라이브러리(lib/ 12MB)는 저장하지 않는다
   — AI 는 인터넷이 될 때만 쓴다 (sugai.js 가 "인터넷이 없어 AI 는 쉬어요"라고 알려 준다).

   ※ 아래 VERSION · FILES 는 도구\오프라인목록.ps1 이 만든다. 손으로 고치지 않는다.
     site\ 의 파일을 하나라도 고치면 다시 돌려야 한다 — 안 맞으면 검사.ps1 이 [실패]로 알려 준다.
     VERSION 이 바뀌면 폰이 새 목록을 받는데, 바뀐 파일만 새로 받고 안 바뀐 파일(사진 등)은 전에 저장한 것을 옮겨 쓴다.
     받은 파일은 목록의 지문(SHA-256 앞 12자리)과 맞는지 확인한다 — 올린 직후 옛 파일이 섞여 오면 다시 받는다. */
'use strict';

// ↓↓↓ 도구\오프라인목록.ps1 이 채운다 — 손으로 고치지 않는다
var VERSION = '80bd899f1605';   // 파일 226개 · 14.9MB
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
  ['css/app.css','1b63c9b4c3b2',79082],
  ['css/boot.css','b3a18297534a',1353],
  ['data/photos.js','9d276e988bb4',15767],
  ['data/photos/13101/01.jpg','f20c39f84790',65321],
  ['data/photos/13102/01.jpg','523c6f068a4c',76075],
  ['data/photos/13103/01.jpg','a733992e9e36',59160],
  ['data/photos/13104/01.jpg','7bb72f8e21c4',55062],
  ['data/photos/13106/01.jpg','44c2e71e0322',69180],
  ['data/photos/13107/01.jpg','360b08af5443',69024],
  ['data/photos/13108/01.jpg','a7e03ca600a8',54032],
  ['data/photos/13109/01.jpg','d03afd8caef9',61905],
  ['data/photos/13110/01.jpg','5759b484b342',62304],
  ['data/photos/13111/01.jpg','dae2e13a9eb2',60444],
  ['data/photos/13112/01.jpg','b099b6758429',63534],
  ['data/photos/13113/01.jpg','19b00c0c3795',65833],
  ['data/photos/13114/01.jpg','ba9582fee94f',61892],
  ['data/photos/13115/01.jpg','ca284c842205',77519],
  ['data/photos/13116/01.jpg','867b6c49b9cd',43629],
  ['data/photos/13117/01.jpg','e1e1bbbf4972',59733],
  ['data/photos/13119/01.jpg','31185c01ba10',75828],
  ['data/photos/13120/01.jpg','1e7a8d95d77c',77548],
  ['data/photos/13121-A/01.jpg','e154bb33efb3',89054],
  ['data/photos/13121-B/01.jpg','f1514ccf7cab',85103],
  ['data/photos/13125/01.jpg','9a1f5495a504',77684],
  ['data/photos/13201/01.jpg','ed256a0556ea',65947],
  ['data/photos/13202/01.jpg','4bbddfd34335',69014],
  ['data/photos/13203/01.jpg','c546d8763b74',67438],
  ['data/photos/13204/01.jpg','9e1d4d5d48aa',81761],
  ['data/photos/13205/01.jpg','a14a78b5e25c',62662],
  ['data/photos/13207/01.jpg','25e80e3b0118',72343],
  ['data/photos/13208/01.jpg','c4e1077c3ef0',62016],
  ['data/photos/13209/01.jpg','f79db56f47d2',52988],
  ['data/photos/13210/01.jpg','b9214057ed79',49356],
  ['data/photos/13211/01.jpg','26973518ede2',50333],
  ['data/photos/13212/01.jpg','037628c40e49',53029],
  ['data/photos/13213/01.jpg','ddf7255516ff',52669],
  ['data/photos/13214/01.jpg','1840ff65fc9f',64160],
  ['data/photos/13215/01.jpg','53d1e5f78ba0',66167],
  ['data/photos/13217/01.jpg','c7c4b22ac232',68218],
  ['data/photos/13218/01.jpg','9d3ba255363d',55017],
  ['data/photos/13219/01.jpg','2bf9843642c6',56057],
  ['data/photos/13221/01.jpg','f97f6f8fa7a9',70408],
  ['data/photos/13224/01.jpg','be3892b91587',63748],
  ['data/photos/13225/01.jpg','81f2b9c297c7',69992],
  ['data/photos/13226/01.jpg','d7df7fef0e24',74087],
  ['data/photos/13301/01.jpg','fa5f4b8bfb73',75175],
  ['data/photos/13303/01.jpg','3e599013895e',63025],
  ['data/photos/13304/01.jpg','d363e44cc784',61977],
  ['data/photos/13306/01.jpg','e41bf00a18a3',65825],
  ['data/photos/13310/01.jpg','015bfde7cd43',44053],
  ['data/photos/13311/01.jpg','958475821d98',56919],
  ['data/photos/13312/01.jpg','58d945997b0d',49978],
  ['data/photos/13313/01.jpg','584e0524b04a',44599],
  ['data/photos/13314/01.jpg','ae4989818a04',37819],
  ['data/photos/13315/01.jpg','7ba41e785efa',62396],
  ['data/photos/13316/01.jpg','debe07151206',57279],
  ['data/photos/13317/01.jpg','37ef4cc2c522',53472],
  ['data/photos/13318/01.jpg','6eb85ffbcbc9',67098],
  ['data/photos/13319/01.jpg','94a8c8711516',73251],
  ['data/photos/13320/01.jpg','3527a38b1ce5',65214],
  ['data/photos/13322/01.jpg','b623ab12808d',65798],
  ['data/photos/13324/01.jpg','3ee3405a15a5',82043],
  ['data/photos/13325/01.jpg','de17ebca9ea7',78945],
  ['data/photos/13326/01.jpg','5bc2a1194ab6',73581],
  ['data/photos/13401/01.jpg','344cbd989373',72133],
  ['data/photos/13402/01.jpg','68501aa64bc8',63698],
  ['data/photos/13403/01.jpg','89d0df1faae3',57470],
  ['data/photos/13405/01.jpg','1d140bc2059e',72916],
  ['data/photos/13406/01.jpg','3e2fe4011296',63093],
  ['data/photos/13407/01.jpg','aeca0cb36dcc',79730],
  ['data/photos/13408/01.jpg','2099658fba6d',59821],
  ['data/photos/13409/01.jpg','7065d8750eef',50242],
  ['data/photos/13410/01.jpg','9223f3b22878',52716],
  ['data/photos/13411/01.jpg','b39a287b91c5',55644],
  ['data/photos/13412/01.jpg','1b61b21f267c',77789],
  ['data/photos/13413/01.jpg','f0e44ce0309e',75853],
  ['data/photos/13414/01.jpg','b4c7b660e01b',69366],
  ['data/photos/13415/01.jpg','b0133bb6c275',85297],
  ['data/photos/13417/01.jpg','f08f3e7b32dd',69404],
  ['data/photos/13419/01.jpg','2e33c550e13f',62224],
  ['data/photos/13420/01.jpg','eac98950de80',52472],
  ['data/photos/13421/01.jpg','16d0d65f822a',46125],
  ['data/photos/13422/01.jpg','26d21f3b2572',66224],
  ['data/photos/13501/01.jpg','621e3c9caefc',44417],
  ['data/photos/13502/01.jpg','1f811a715685',71929],
  ['data/photos/13504/01.jpg','0956dcaf70de',68389],
  ['data/photos/13505/01.jpg','cb69bbeda106',66073],
  ['data/photos/13506/01.jpg','8ea5e235cca9',67139],
  ['data/photos/13508/01.jpg','d6716a5b42bd',68644],
  ['data/photos/13509/01.jpg','525472ee9dbf',53567],
  ['data/photos/13510/01.jpg','8c5ae8d2d82f',75540],
  ['data/photos/13511/01.jpg','a50fa7b2228a',60851],
  ['data/photos/13512/01.jpg','e05cc002e430',64295],
  ['data/photos/13513/01.jpg','07139b9964c6',61740],
  ['data/photos/13514/01.jpg','f898df840987',66341],
  ['data/photos/13515/01.jpg','db76ee14ffbc',57783],
  ['data/photos/13516/01.jpg','69c82e3c36b6',71030],
  ['data/photos/13517/01.jpg','e6590933dc3b',71159],
  ['data/photos/13518/01.jpg','6db03e46de49',80691],
  ['data/photos/13520/01.jpg','82b296b71233',54394],
  ['data/photos/13522/01.jpg','b09fa6a6018d',68287],
  ['data/photos/13523/01.jpg','fc30e4012b39',71586],
  ['data/photos/13524/01.jpg','bb1303d5061a',72229],
  ['data/photos/B1/01.jpg','e49a9f90c6cb',90524],
  ['data/photos/B1PATH/01.jpg','a7a2266d151d',123628],
  ['data/photos/B1WAY/01.jpg','d97bac3b971c',66076],
  ['data/photos/BLD/01.jpg','ba7d93b5e0c4',138193],
  ['data/photos/BLD/02.jpg','0be76ded8b3e',112249],
  ['data/photos/BLD/03.jpg','9748826a6b07',129215],
  ['data/photos/BLD/04.jpg','4510adafe16d',84982],
  ['data/photos/BLD/05.jpg','f8c13fd9d4c9',165450],
  ['data/photos/BLD/06.jpg','ed239b142210',162153],
  ['data/photos/BLD/07.jpg','4bf68b6750bb',136345],
  ['data/photos/BLD/08.jpg','bba71dd0bd6c',160669],
  ['data/photos/EMS1/01.jpg','e7f2477f4120',80853],
  ['data/photos/EMS2/01.jpg','ec679e47f6f7',57824],
  ['data/photos/EMS3/01.jpg','83c6d4657f6d',49664],
  ['data/photos/EMS4/01.jpg','f1e2f36aa665',82991],
  ['data/photos/EMS5/01.jpg','889c6d9b0206',42585],
  ['data/photos/ES1/01.jpg','7e7a0a8553a4',97855],
  ['data/photos/EV1/01.jpg','3e572e2a49be',100031],
  ['data/photos/EV1WEST/01.jpg','5554599ddca6',122843],
  ['data/photos/EV2/01.jpg','87367b0019ae',95052],
  ['data/photos/EV3/01.jpg','5da3c636a001',93338],
  ['data/photos/EV4/01.jpg','d036042f48d4',86347],
  ['data/photos/EV5/01.jpg','669c7642ae6a',65555],
  ['data/photos/EVB1/01.jpg','31af5b39ca77',66232],
  ['data/photos/EVIN1/01.jpg','c1ccb51f80b7',78344],
  ['data/photos/EVIN2/01.jpg','9ec3aa68a2ae',75361],
  ['data/photos/EVIN3/01.jpg','a14ff608cdd8',70234],
  ['data/photos/EVIN4/01.jpg','ef18193da0c0',72015],
  ['data/photos/EVIN5/01.jpg','c84d9420b261',70407],
  ['data/photos/GATE_BACK/01.jpg','55ae785c0aac',84895],
  ['data/photos/GATE_BACK_STAIR/01.jpg','9da73a0f7c8b',127773],
  ['data/photos/GATE_E/01.jpg','bf182412afe1',70347],
  ['data/photos/GATE_MAIN_WAY/01.jpg','a6a99212b589',117582],
  ['data/photos/GATE_W/01.jpg','733a7a265bb5',67853],
  ['data/photos/HALL1L/01.jpg','14345fa23c0d',90266],
  ['data/photos/HALL1R/01.jpg','4a34851fd2dc',71992],
  ['data/photos/HALL2L/01.jpg','d0fbf4e103a5',92061],
  ['data/photos/HALL2R/01.jpg','243f1487bb3e',92251],
  ['data/photos/HALL3L/01.jpg','1ba01bc78edd',94716],
  ['data/photos/HALL3R/01.jpg','9f4499214ecb',79042],
  ['data/photos/HALL4L/01.jpg','d9beff4a1ee0',71888],
  ['data/photos/HALL4R/01.jpg','56deaeddc55d',81963],
  ['data/photos/HALL5L/01.jpg','e004d7527a98',49996],
  ['data/photos/HALL5R/01.jpg','c71bfbd19a73',76807],
  ['data/photos/KTC/01.jpg','b751d87c1fd7',68131],
  ['data/photos/LNG1/01.jpg','69964b8d0a51',94718],
  ['data/photos/LNG2/01.jpg','f03656e290fc',105765],
  ['data/photos/LNG3/01.jpg','2b52e1aa9f58',101899],
  ['data/photos/LNG4/01.jpg','15385d61f01d',84716],
  ['data/photos/LNG5/01.jpg','28a8cd277682',79995],
  ['data/photos/SIGN1/01.jpg','7493853fd1fe',46042],
  ['data/photos/SIGN2/01.jpg','91b17f71108f',43948],
  ['data/photos/SIGN3/01.jpg','ee8e232b6498',50936],
  ['data/photos/SIGN4/01.jpg','095e415cee72',49277],
  ['data/photos/SIGN5/01.jpg','7385ca142320',55475],
  ['data/photos/WC1/01.jpg','266fbdd80a37',73953],
  ['data/photos/WC2/01.jpg','546076283ba4',56245],
  ['data/photos/WC3/01.jpg','8aa7ea7c5f6d',66650],
  ['data/photos/WC4/01.jpg','b778c0eb2eb1',74662],
  ['data/photos/WC5/01.jpg','7e06196d6029',41861],
  ['data/photos/WIN2/01.jpg','468c206deec7',74626],
  ['data/photos/WIN3/01.jpg','11ceec5a55c8',92279],
  ['data/photos/WIN4/01.jpg','772456cfbe05',91167],
  ['data/photos/WIN5L/01.jpg','9fbaf7ead137',100676],
  ['data/photos/WIN5R/01.jpg','f1dc31f7a5f9',125944],
  ['data/places.js','02bc4d37cb3f',1500],
  ['img/exit-sign.png','f1b9ed7cd89e',27291],
  ['img/icon-180.png','bd9c894f1d5d',5036],
  ['img/icon-192.png','a6893220bee4',5036],
  ['img/icon-512.png','de753e3f6802',14880],
  ['img/icon.svg','99ad3cbde680',2002],
  ['index.html','17239f70cda3',51261],
  ['js/app/aid.js','daa92696b9a7',32661],
  ['js/app/boot.js','c49829682f30',8075],
  ['js/app/building.js','647a70cb183a',23274],
  ['js/app/floor-detail.js','9d10c5aa9ba7',19078],
  ['js/app/guide.js','8c8e4994a469',37666],
  ['js/app/overview3d.js','e16d51396168',89724],
  ['js/app/photos.js','7debd2904c8c',51527],
  ['js/app/pwa.js','85a9eecf6165',28729],
  ['js/app/qrnav.js','1ab04e81bfc1',20800],
  ['js/app/roadview-1f.js','14696e0f4c2a',46207],
  ['js/app/roadview-b1.js','7d5ac6c79e08',157916],
  ['js/app/roadview-corr.js','0676f146b01f',47964],
  ['js/app/roadview-free.js','c0d1249f0b54',92167],
  ['js/app/roadview-play.js','8532c01564db',23533],
  ['js/app/roadview-roof.js','21f2a5e8678f',119576],
  ['js/app/roadview-stairs.js','7f992b896804',70498],
  ['js/app/roadview.js','87113d5906a0',126123],
  ['js/app/shell.js','e05181b4f869',19104],
  ['js/app/start.js','4065777331b0',1505],
  ['js/app/sugai.js','5a7c207579d1',131009],
  ['js/app/sugdb.js','df49ab439b73',17964],
  ['js/app/suggest.js','dd852f0fd5de',46898],
  ['js/app/ui.js','d5a2efa4e407',25194],
  ['js/app/view3d.js','f6a131c2a02d',44913],
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

/* 첫 화면에 필요한 파일인가 — 앱 껍데기(HTML·모양·코드·아이콘·장소 이름).
   사진·3D 그림·AI 라이브러리처럼 무거운 것은 여기 들어가지 않는다. */
function isShell(f){
  var p = f[0];
  return p === 'index.html' || p === 'manifest.webmanifest' || p === 'data/places.js' ||
         p.indexOf('css/') === 0 || p.indexOf('js/') === 0 || p.indexOf('img/') === 0;
}
var preDone = 0;              // 핵심 → 나머지 두 단계를 합친 진행 수

function precache(list, last){
  var T = totalBytes(), queue = list.slice();
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
        preDone++;
        if(preDone % 8 === 0 || preDone === FILES.length) tell({type:'progress', done:preDone, total:FILES.length, bytes:T});
      });
    }
    function worker(){ var f = queue.shift(); return f ? one(f).then(worker) : Promise.resolve(); }
    return Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
  }).then(function(){
    if(!last) return;                    // 핵심만 받은 단계 — 아직 '다 됐다'가 아니다
    return tell({type:'ready', version:VERSION, total:FILES.length, bytes:T});
  }, function(err){
    /* 하나라도 못 받으면 이번 설치는 실패 — 쓰던 판(있다면)을 그대로 쓰고, 다음에 열 때 다시 한다 */
    return tell({type:'fail', why:String(err && err.message || err)}).then(function(){ throw err; });
  });
}

/* 2026-09-25 : 예전에는 여기서 14MB 전부를 받을 때까지 기다린 뒤에야 새 판이 앱을 넘겨받았다.
   그동안 사용자는 이미 옛 화면을 보고 있어서, 고쳐 올려도 그날은 옛 판이 보였다.
   → 첫 화면에 필요한 것(약 700KB)만 받고 곧바로 넘겨받는다. 나머지(사진·3D)는 그다음에 받는다. */
self.addEventListener('install', function(e){
  self.skipWaiting();
  preDone = 0;
  e.waitUntil(precache(FILES.filter(isShell), false));
});

self.addEventListener('activate', function(e){
  /* 순서가 중요하다 : 옛 판을 먼저 지우면 '안 바뀐 파일을 옛 판에서 옮겨 담기'를 못 해
     14MB 를 전부 다시 받게 된다. 그래서 다 옮겨 담은 뒤에 지운다. */
  e.waitUntil(self.clients.claim()
    .then(function(){ return precache(FILES.filter(function(f){ return !isShell(f); }), true); })
    .then(function(){
      return caches.keys().then(function(names){
        return Promise.all(names.filter(function(n){ return n.indexOf('b3nav-') === 0 && n !== CACHE && n !== FONT_CACHE; })
                                .map(function(n){ return caches.delete(n); }));
      });
    }));
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
