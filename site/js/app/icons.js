"use strict";
/* icons.js — 앱 아이콘을 Lucide(https://lucide.dev, lucide 0.460.0)로 (2026-10-18)

   사용자 : 지금 있는 아이콘을 전부 Lucide 아이콘으로 — 사진(생성물\아이콘_비교 1~16)으로 보고 고른 짝 그대로.
   그대로 두는 것(사용자) : 3D 그림 속 글자 표지판(캔버스라 이 파일이 닿지 않는다) · 문장 속 화살표·번호(「1층 → 5층」, ①②) ·
                            이미 선 그림인 것(사진 크게 보기 − + ⟲, 앱 설치 안내 그림, 도착 체크) · 쉬운 사용모드 손가락 👆.
   방식 : 앱 코드는 예전처럼 이모지·기호 글자를 내보내고, 이 파일이 그 글자를 화면에 그려지기 전에(MutationObserver)
          Lucide 그림(<svg class="lc lc-이름">)으로 바꾼다. 한/영 바꾸기(applyLang)로 글자가 다시 써져도 다시 바꾼다.
          그림 데이터는 쓰는 것만 담았다(인터넷 없이도 보이게 — sw.js 저장 목록에 들어간다).

   ── Lucide 사용 허가문 (원문 그대로) ──
   ISC License
   
   Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.
   
   Permission to use, copy, modify, and/or distribute this software for any
   purpose with or without fee is hereby granted, provided that the above
   copyright notice and this permission notice appear in all copies.
   
   THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
   WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
   MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
   ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
   WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
   ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
   OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
var LUCIDE = (function(){
  /* 그림 데이터 : 이름 → [[태그, 속성], …] (24×24, 선 2, 둥근 끝) */
  var D = {
    "house":[["path",{"d":"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"}],["path",{"d":"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}]],
    "star":[["path",{"d":"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"}]],
    "settings":[["path",{"d":"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"}],["circle",{"cx":"12","cy":"12","r":"3"}]],
    "wifi":[["path",{"d":"M12 20h.01"}],["path",{"d":"M2 8.82a15 15 0 0 1 20 0"}],["path",{"d":"M5 12.859a10 10 0 0 1 14 0"}],["path",{"d":"M8.5 16.429a5 5 0 0 1 7 0"}]],
    "wifi-off":[["path",{"d":"M12 20h.01"}],["path",{"d":"M8.5 16.429a5 5 0 0 1 7 0"}],["path",{"d":"M5 12.859a10 10 0 0 1 5.17-2.69"}],["path",{"d":"M19 12.859a10 10 0 0 0-2.007-1.523"}],["path",{"d":"M2 8.82a15 15 0 0 1 4.177-2.643"}],["path",{"d":"M22 8.82a15 15 0 0 0-11.288-3.764"}],["path",{"d":"m2 2 20 20"}]],
    "arrow-left":[["path",{"d":"m12 19-7-7 7-7"}],["path",{"d":"M19 12H5"}]],
    "arrow-right":[["path",{"d":"M5 12h14"}],["path",{"d":"m12 5 7 7-7 7"}]],
    "arrow-up":[["path",{"d":"m5 12 7-7 7 7"}],["path",{"d":"M12 19V5"}]],
    "arrow-down":[["path",{"d":"M12 5v14"}],["path",{"d":"m19 12-7 7-7-7"}]],
    "arrow-up-right":[["path",{"d":"M7 7h10v10"}],["path",{"d":"M7 17 17 7"}]],
    "arrow-up-left":[["path",{"d":"M7 17V7h10"}],["path",{"d":"M17 17 7 7"}]],
    "arrow-down-right":[["path",{"d":"m7 7 10 10"}],["path",{"d":"M17 7v10H7"}]],
    "arrow-down-left":[["path",{"d":"M17 7 7 17"}],["path",{"d":"M17 17H7V7"}]],
    "arrow-up-down":[["path",{"d":"m21 16-4 4-4-4"}],["path",{"d":"M17 20V4"}],["path",{"d":"m3 8 4-4 4 4"}],["path",{"d":"M7 4v16"}]],
    "check":[["path",{"d":"M20 6 9 17l-5-5"}]],
    "rotate-cw":[["path",{"d":"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"}],["path",{"d":"M21 3v5h-5"}]],
    "rotate-ccw":[["path",{"d":"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}],["path",{"d":"M3 3v5h5"}]],
    "school":[["path",{"d":"M14 22v-4a2 2 0 1 0-4 0v4"}],["path",{"d":"m18 10 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7.382a1 1 0 0 1 .553-.894L6 10"}],["path",{"d":"M18 5v17"}],["path",{"d":"m4 6 7.106-3.553a2 2 0 0 1 1.788 0L20 6"}],["path",{"d":"M6 5v17"}],["circle",{"cx":"12","cy":"9","r":"2"}]],
    "scan-qr-code":[["path",{"d":"M17 12v4a1 1 0 0 1-1 1h-4"}],["path",{"d":"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{"d":"M17 8V7"}],["path",{"d":"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{"d":"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{"d":"M7 17h.01"}],["path",{"d":"M7 21H5a2 2 0 0 1-2-2v-2"}],["rect",{"x":"7","y":"7","width":"5","height":"5","rx":"1"}]],
    "smartphone":[["rect",{"width":"14","height":"20","x":"5","y":"2","rx":"2","ry":"2"}],["path",{"d":"M12 18h.01"}]],
    "door-open":[["path",{"d":"M13 4h3a2 2 0 0 1 2 2v14"}],["path",{"d":"M2 20h3"}],["path",{"d":"M13 20h9"}],["path",{"d":"M10 12v.01"}],["path",{"d":"M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"}]],
    "toilet":[["path",{"d":"M7 12h13a1 1 0 0 1 1 1 5 5 0 0 1-5 5h-.598a.5.5 0 0 0-.424.765l1.544 2.47a.5.5 0 0 1-.424.765H5.402a.5.5 0 0 1-.424-.765L7 18"}],["path",{"d":"M8 18a5 5 0 0 1-5-5V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8"}]],
    "book-open":[["path",{"d":"M12 7v14"}],["path",{"d":"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"}]],
    "siren":[["path",{"d":"M7 18v-6a5 5 0 1 1 10 0v6"}],["path",{"d":"M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"}],["path",{"d":"M21 12h1"}],["path",{"d":"M18.5 4.5 18 5"}],["path",{"d":"M2 12h1"}],["path",{"d":"M12 2v1"}],["path",{"d":"m4.929 4.929.707.707"}],["path",{"d":"M12 12v6"}]],
    "wrench":[["path",{"d":"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"}]],
    "maximize":[["path",{"d":"M8 3H5a2 2 0 0 0-2 2v3"}],["path",{"d":"M21 8V5a2 2 0 0 0-2-2h-3"}],["path",{"d":"M3 16v3a2 2 0 0 0 2 2h3"}],["path",{"d":"M16 21h3a2 2 0 0 0 2-2v-3"}]],
    "play":[["polygon",{"points":"6 3 20 12 6 21 6 3"}]],
    "pause":[["rect",{"x":"14","y":"4","width":"4","height":"16","rx":"1"}],["rect",{"x":"6","y":"4","width":"4","height":"16","rx":"1"}]],
    "square":[["rect",{"width":"18","height":"18","x":"3","y":"3","rx":"2"}]],
    "footprints":[["path",{"d":"M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"}],["path",{"d":"M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"}],["path",{"d":"M16 17h4"}],["path",{"d":"M4 13h4"}]],
    "person-standing":[["circle",{"cx":"12","cy":"5","r":"1"}],["path",{"d":"m9 20 3-6 3 6"}],["path",{"d":"m6 8 6 2 6-2"}],["path",{"d":"M12 10v4"}]],
    "map-pin":[["path",{"d":"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"}],["circle",{"cx":"12","cy":"10","r":"3"}]],
    "flag":[["path",{"d":"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"}],["line",{"x1":"4","x2":"4","y1":"22","y2":"15"}]],
    "chevron-left":[["path",{"d":"m15 18-6-6 6-6"}]],
    "chevron-right":[["path",{"d":"m9 18 6-6-6-6"}]],
    "chevron-down":[["path",{"d":"m6 9 6 6 6-6"}]],
    "x":[["path",{"d":"M18 6 6 18"}],["path",{"d":"m6 6 12 12"}]],
    "infinity":[["path",{"d":"M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"}]],
    "camera":[["path",{"d":"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"}],["circle",{"cx":"12","cy":"13","r":"3"}]],
    "plus":[["path",{"d":"M5 12h14"}],["path",{"d":"M12 5v14"}]],
    "circle-check":[["circle",{"cx":"12","cy":"12","r":"10"}],["path",{"d":"m9 12 2 2 4-4"}]],
    "lightbulb":[["path",{"d":"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"}],["path",{"d":"M9 18h6"}],["path",{"d":"M10 22h4"}]],
    "bot":[["path",{"d":"M12 8V4H8"}],["rect",{"width":"16","height":"12","x":"4","y":"8","rx":"2"}],["path",{"d":"M2 14h2"}],["path",{"d":"M20 14h2"}],["path",{"d":"M15 13v2"}],["path",{"d":"M9 13v2"}]],
    "zoom-in":[["circle",{"cx":"11","cy":"11","r":"8"}],["line",{"x1":"21","x2":"16.65","y1":"21","y2":"16.65"}],["line",{"x1":"11","x2":"11","y1":"8","y2":"14"}],["line",{"x1":"8","x2":"14","y1":"11","y2":"11"}]],
    "triangle-alert":[["path",{"d":"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"}],["path",{"d":"M12 9v4"}],["path",{"d":"M12 17h.01"}]],
    "ban":[["circle",{"cx":"12","cy":"12","r":"10"}],["path",{"d":"m4.9 4.9 14.2 14.2"}]],
    "mailbox":[["path",{"d":"M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z"}],["polyline",{"points":"15,9 18,9 18,11"}],["path",{"d":"M6.5 5C9 5 11 7 11 9.5V17a2 2 0 0 1-2 2"}],["line",{"x1":"6","x2":"7","y1":"10","y2":"10"}]],
    "hash":[["line",{"x1":"4","x2":"20","y1":"9","y2":"9"}],["line",{"x1":"4","x2":"20","y1":"15","y2":"15"}],["line",{"x1":"10","x2":"8","y1":"3","y2":"21"}],["line",{"x1":"16","x2":"14","y1":"3","y2":"21"}]],
    "hand":[["path",{"d":"M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"}],["path",{"d":"M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"}],["path",{"d":"M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"}],["path",{"d":"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"}]],
    "clock":[["circle",{"cx":"12","cy":"12","r":"10"}],["polyline",{"points":"12 6 12 12 16 14"}]],
    "image":[["rect",{"width":"18","height":"18","x":"3","y":"3","rx":"2","ry":"2"}],["circle",{"cx":"9","cy":"9","r":"2"}],["path",{"d":"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"}]],
    "download":[["path",{"d":"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}],["polyline",{"points":"7 10 12 15 17 10"}],["line",{"x1":"12","x2":"12","y1":"15","y2":"3"}]],
    "sparkles":[["path",{"d":"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"}],["path",{"d":"M20 3v4"}],["path",{"d":"M22 5h-4"}],["path",{"d":"M4 17v2"}],["path",{"d":"M5 18H3"}]],
    "info":[["circle",{"cx":"12","cy":"12","r":"10"}],["path",{"d":"M12 16v-4"}],["path",{"d":"M12 8h.01"}]],
    "ellipsis-vertical":[["circle",{"cx":"12","cy":"12","r":"1"}],["circle",{"cx":"12","cy":"5","r":"1"}],["circle",{"cx":"12","cy":"19","r":"1"}]],
    "ellipsis":[["circle",{"cx":"12","cy":"12","r":"1"}],["circle",{"cx":"19","cy":"12","r":"1"}],["circle",{"cx":"5","cy":"12","r":"1"}]],
    "circle-plus":[["circle",{"cx":"12","cy":"12","r":"10"}],["path",{"d":"M8 12h8"}],["path",{"d":"M12 8v8"}]],
    "party-popper":[["path",{"d":"M5.8 11.3 2 22l10.7-3.79"}],["path",{"d":"M4 3h.01"}],["path",{"d":"M22 8h.01"}],["path",{"d":"M15 2h.01"}],["path",{"d":"M22 20h.01"}],["path",{"d":"m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"}],["path",{"d":"m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"}],["path",{"d":"m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"}],["path",{"d":"M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"}]],
    "map":[["path",{"d":"M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"}],["path",{"d":"M15 5.764v15"}],["path",{"d":"M9 3.236v15"}]],
    "notebook-pen":[["path",{"d":"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"}],["path",{"d":"M2 6h4"}],["path",{"d":"M2 10h4"}],["path",{"d":"M2 14h4"}],["path",{"d":"M2 18h4"}],["path",{"d":"M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"}]],
    "signal":[["path",{"d":"M2 20h.01"}],["path",{"d":"M7 20v-4"}],["path",{"d":"M12 20v-8"}],["path",{"d":"M17 20V8"}],["path",{"d":"M22 4v16"}]],
    "landmark":[["line",{"x1":"3","x2":"21","y1":"22","y2":"22"}],["line",{"x1":"6","x2":"6","y1":"18","y2":"11"}],["line",{"x1":"10","x2":"10","y1":"18","y2":"11"}],["line",{"x1":"14","x2":"14","y1":"18","y2":"11"}],["line",{"x1":"18","x2":"18","y1":"18","y2":"11"}],["polygon",{"points":"12 2 20 7 4 7"}]],
    "search":[["circle",{"cx":"11","cy":"11","r":"8"}],["path",{"d":"m21 21-4.3-4.3"}]]
  };

  /* ── 어떤 글자를 어떤 그림으로 ── (사용자가 사진 1~16 으로 보고 고른 짝) */
  var EMO = {
    '🏠':'house', '⭐':'star', '⚙️':'settings', '⚙':'settings', '🏫':'school', '📲':'smartphone', '⛶':'scan-qr-code', '⟳':'rotate-ccw',
    '🚪':'door-open', '🚻':'toilet', '📚':'book-open', '🚨':'siren', '🛠️':'wrench', '🛠':'wrench',
    '☆':'star', '★':'star', '▶️':'play', '▶':'play', '⏸':'pause', '■':'square', '🚶':'footprints', '▲':'arrow-up',
    '📍':'map-pin', '🏁':'flag', '✕':'x', '📷':'camera', '➕':'plus', '✅':'circle-check', '✔':'check', '✓':'check',
    '💡':'lightbulb', '🤖':'bot', '🔍':'zoom-in', '⚠️':'triangle-alert', '⚠':'triangle-alert', '🚫':'ban', '📮':'mailbox',
    '🔢':'hash', '↻':'rotate-cw', '↺':'rotate-ccw', '📖':'book-open', '👋':'hand', '🙋':'hand', '🕓':'clock', '🖼️':'image', '🖼':'image',
    '📥':'download', '🆕':'sparkles', 'ⓘ':'info', '⋮':'ellipsis-vertical', '⋯':'ellipsis', '⊕':'circle-plus', '🎉':'party-popper',
    '👣':'footprints', '🗺️':'map', '🗺':'map', '🛗':'arrow-up-down', '📝':'notebook-pen', '📶':'signal', '🏛️':'landmark', '🏛':'landmark',
    '🟢':'wifi'
  };
  /* 화살표는 「버튼·안내 칸의 맨 앞이나 맨 끝」에 붙은 것만 그림으로 — 문장 속 「1층 → 5층」은 글자라서 그대로 (사용자) */
  var ARR = { '→':'chevron-right', '›':'chevron-right', '‹':'chevron-left', '←':'arrow-left', '↑':'arrow-up', '↓':'arrow-down' };
  var ARR_CTX = 'button,.back,.iconBtn,a,.fpcap,.fpguide';
  /* 길안내 큰 화살표(#ar)는 글자 하나가 통째로 그림이 된다 */
  var BIG = { '↑':'arrow-up', '→':'arrow-right', '←':'arrow-left', '↓':'arrow-down', '↗':'arrow-up-right', '↖':'arrow-up-left',
              '↘':'arrow-down-right', '↙':'arrow-down-left', '✓':'check', '↻':'rotate-cw', '↺':'rotate-ccw' };
  /* 손대지 않는 곳 : 쉬운 사용모드 손가락 👆(사용자) · 이미 선 그림인 사진 크게 보기 단추 · 글 상자 · 선택 목록 */
  var SKIP = 'svg,script,style,noscript,option,select,textarea,title,input,.ezFinger,.izCtl,.izBtn:not([aria-label="닫기"])';
  var KEYS = Object.keys(EMO).sort(function(a, b){ return b.length - a.length; });   // 긴 것(⚙️) 먼저
  var RX = new RegExp(KEYS.map(function(k){ return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'g');

  var tpl = document.createElement('template');
  function svg(name, cls){
    var kids = D[name]; if(!kids) return '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="lc lc-' + name + (cls ? ' ' + cls : '') + '">' +
      kids.map(function(k){ var a = k[1], s = '<' + k[0]; for(var p in a) if(p !== 'key') s += ' ' + p + '="' + a[p] + '"'; return s + '/>'; }).join('') + '</svg>';
  }
  function node(name, cls){ tpl.innerHTML = svg(name, cls); return tpl.content.firstChild; }

  /* 글자 마디 하나를 [글자 · 그림 · 글자 …] 로 쪼갠다 */
  function convText(n){
    var p = n.parentNode; if(!p || p.nodeType !== 1 || p.closest(SKIP)) return;
    var s = n.nodeValue; if(!s || !/\S/.test(s)) return;
    var parts = [], last = 0, m, hit = false;
    /* 길안내 큰 화살표 */
    if(p.id === 'ar' && BIG[s.trim()]){ p.replaceChild(node(BIG[s.trim()], 'lcArrow'), n); return; }
    RX.lastIndex = 0;
    while((m = RX.exec(s))){
      var nm = EMO[m[0]];
      if(nm === 'footprints' && p.closest('#walker')) nm = 'person-standing';      // 진행 표시 위를 걷는 사람
      if(nm === 'scan-qr-code' && p.closest('#fsBtn')) nm = 'maximize';             // 3D 크게 보기
      parts.push(s.slice(last, m.index)); parts.push({ nm:nm, star:(m[0] === '★') }); last = m.index + m[0].length; hit = true;
    }
    parts.push(s.slice(last));
    /* 버튼·안내 칸 맨 앞·맨 끝의 화살표 */
    if(p.closest(ARR_CTX)){
      var first = parts[0], tl = parts[parts.length - 1];
      if(typeof first === 'string'){ var f0 = first.replace(/^\s+/, ''); if(ARR[f0.charAt(0)] && (parts.length > 1 || f0.length > 1 || p.childNodes.length === 1)){
        parts.splice(0, 1, '', { nm:ARR[f0.charAt(0)] }, f0.slice(1)); hit = true; } }
      tl = parts[parts.length - 1];
      if(typeof tl === 'string'){ var t0 = tl.replace(/\s+$/, ''); var ch = t0.charAt(t0.length - 1);
        if(ARR[ch] && t0.length > 1){ parts.splice(parts.length - 1, 1, t0.slice(0, -1), { nm:ARR[ch], tail:true }, ''); hit = true; } }
    }
    if(!hit) return;
    var frag = document.createDocumentFragment();
    parts.forEach(function(x, i){
      if(typeof x === 'string'){
        var t = x;
        if(i > 0 && typeof parts[i - 1] === 'object') t = t.replace(/^\uFE0F/, '').replace(/^ /, '');   // 그림 바로 뒤 빈칸 하나는 그림 간격으로 (남은 이모지 꼬리표 FE0F 도)
        if(i < parts.length - 1 && typeof parts[i + 1] === 'object') t = t.replace(/ $/, '');
        if(t) frag.appendChild(document.createTextNode(t));
      } else {
        var lead = parts.slice(0, i).some(function(y){ return typeof y === 'string' && /\S/.test(y); });
        var trail = parts.slice(i + 1).some(function(y){ return typeof y === 'string' && /\S/.test(y); });
        frag.appendChild(node(x.nm, (x.star ? 'lcFill ' : '') + (lead && !trail ? 'lcR' : (trail ? 'lcL' : ''))));
      }
    });
    p.replaceChild(frag, n);
  }
  function scan(root){
    if(!root) return;
    if(root.nodeType === 3){ convText(root); return; }
    if(root.nodeType !== 1 || root.closest && root.closest(SKIP)) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), list = [], n;
    while((n = tw.nextNode())) list.push(n);
    list.forEach(convText);
  }
  /* 인터넷 상태 : 녹색 점 → 와이파이 / 끊기면 와이파이 꺼짐 (pwa.js 가 #netBtn 에 netOn·netOff 를 붙인다) */
  function net(){
    var b = document.getElementById('netBtn'); if(!b || b.querySelector('.lc')) return;
    var dot = document.getElementById('netDot');
    b.insertBefore(node('wifi', 'lcNetOn'), dot); b.insertBefore(node('wifi-off', 'lcNetOff'), dot);
  }
  /* 새로 붙거나 바뀐 글자만 본다 — 이 파일이 넣은 그림(svg)은 건너뛴다 */
  var mo = new MutationObserver(function(recs){
    recs.forEach(function(r){
      if(r.type === 'characterData') convText(r.target);
      else r.addedNodes.forEach(function(a){ if(a.nodeType === 1 && a.tagName === 'svg') return; scan(a); });
    });
  });
  function start(){ net(); scan(document.body); mo.observe(document.body, { childList:true, subtree:true, characterData:true }); }
  if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  return { svg:svg, scan:scan };
})();
