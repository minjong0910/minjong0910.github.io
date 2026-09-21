# -*- coding: utf-8 -*-
"""v46 → v47 : 관리자 화면에 '여기가 어디쯤인지' — 사진만으로 추정한 위치를 말로 + 층 추정"""
import io, sys
SRC='/home/claude/gunsan_b3nav_AI_v46.html'; DST='/home/claude/gunsan_b3nav_AI_v47.html'
s=io.open(SRC,encoding='utf-8').read(); orig=len(s); done=[]
def patch(name, old, new, count=1):
    global s
    n=s.count(old)
    if n!=count: print('  [실패] %s : 앵커 %d개'%(name,n)); sys.exit(1)
    s=s.replace(old,new,count); done.append(name); print('  [OK] %s'%name)

patch('CSS 추정 위치',
"""  #sadmin .sugAi .qr{color:#39FF88;}""",
"""  #sadmin .sugAi .qr{color:#39FF88;}
  #sadmin .sugAi .where{margin:6px 0 4px;padding:8px 10px;border-radius:7px;background:#131A24;
    border-left:3px solid #00E5FF;font-size:12px;line-height:1.55;color:#E7F6FF;}
  #sadmin .sugAi .where b{color:#00E5FF;}
  #sadmin .sugAi .where .sub{display:block;color:#7C8AA0;font-size:11px;margin-top:2px;}
  #sadmin .sugAi .where.low{border-left-color:#FFC93C;}
  #sadmin .sugAi .where.low b{color:#FFC93C;}""")

patch('층 추정 함수',
"""  function adminBadge(s){
    var ai = s.ai;
    if(!ai) return '';""",
"""  /* 위치 코드 → 층 이름 */
  function floorOf(code){
    code = String(code||'').toUpperCase();
    if(code === 'B1')  return '지하 1층';
    if(code === 'BLD') return '건물 외부';
    if(code === 'KTC') return '4층';
    var m = code.match(/^(?:EV|HALL|WC|ES)([1-5])/); if(m) return m[1]+'층';
    m = code.match(/^13([1-5])\\d{2}/);              if(m) return m[1]+'층';
    return null;
  }
  /* 상위 후보들의 유사도를 층별로 합쳐, 정확한 자리는 몰라도 '몇 층쯤'인지 추정한다 */
  function floorGuess(top){
    if(!top || !top.length) return null;
    var sum = {}, tot = 0, i;
    for(i=0;i<top.length;i++){
      var f = floorOf(top[i].code); if(!f) continue;
      sum[f] = (sum[f]||0) + top[i].sim; tot += top[i].sim;
    }
    var best = null, bv = 0;
    for(var k in sum) if(sum[k] > bv){ bv = sum[k]; best = k; }
    if(!best || !tot) return null;
    var share = bv/tot;
    var others = Object.keys(sum).filter(function(k){ return k!==best; });
    return { floor:best, share:share, sure: share >= 0.6, others:others };
  }
  /* "여기가 어디쯤인지" 한 줄 — 관리자가 코드 몰라도 읽히게 */
  function whereText(ai){
    if(!ai || !ai.top || !ai.top.length) return '';
    var t = ai.top[0], pct = Math.round(t.sim*100);
    var sure = (ai.verdict==='match'||ai.verdict==='same');
    var conf = sure ? '높음' : (t.sim >= 0.70 ? '보통' : '낮음');
    var low = (conf === '낮음');
    var name = codeLabel(t.code);
    /* '으로/로' 조사 : 마지막 글자에 받침이 있으면 '으로'(ㄹ 받침은 '로') */
    var lc = name.charCodeAt(name.length-1), jong = (lc>=0xAC00 && lc<=0xD7A3) ? (lc-0xAC00)%28 : 0;
    var ro = (jong===0 || jong===8) ? '로' : '으로';
    var h = '<div class="where'+(low?' low':'')+'">📍 사진만 보면 <b>'+name+'</b>'
          + (ai.verdict==='same' ? ' — 지금 앱에 있는 사진과 같음' : ro+' 추정')
          + ' <span class="num">(유사도 '+pct+'% · 신뢰도 '+conf+')</span>';
    if(sure){
      var f1 = floorOf(t.code);
      if(f1) h += '<span class="sub">층 : <b>'+f1+'</b></span>';
    }else{
      var fg = floorGuess(ai.top);
      if(fg){
        h += '<span class="sub">층 추정 : <b>'+fg.floor+'</b>'
           + (fg.sure ? ' (후보가 같은 층에 몰려 있음)' : ' 또는 '+fg.others.join('·')+' — 층도 불확실') + '</span>';
      }
    }
    if(ai.top[1] && low){
      h += '<span class="sub">다음 후보 : '+codeLabel(ai.top[1].code)+' '+Math.round(ai.top[1].sim*100)+'%'
         + (ai.top[2] ? ' · '+codeLabel(ai.top[2].code)+' '+Math.round(ai.top[2].sim*100)+'%' : '')+'</span>';
    }
    return h + '</div>';
  }

  function adminBadge(s){
    var ai = s.ai;
    if(!ai) return '';""")

patch('배지에 추정 위치 삽입',
"""    h += '</div>';
    if(ai.top && ai.top.length){
      h += '<div class="cands">';""",
"""    h += '</div>';
    h += whereText(ai);
    if(ai.top && ai.top.length){
      h += '<div class="cands">';""")

patch('후보 버튼에 이름 병기',
"""        h += '<button onclick="SUGAI.pick(\\''+s.id+'\\',\\''+c.code+'\\')">'+c.code+' <span class="num">'+(c.sim*100).toFixed(0)+'%</span></button>';""",
"""        h += '<button onclick="SUGAI.pick(\\''+s.id+'\\',\\''+c.code+'\\')" title="'+codeLabel(c.code)+'">'
           + codeLabel(c.code)+' <span class="num">'+c.code+' · '+(c.sim*100).toFixed(0)+'%</span></button>';""")

patch('SUGAI 반환에 whereText',
"""           codeLabel:codeLabel, TH:TH, SCOPE:SCOPE,""",
"""           codeLabel:codeLabel, whereText:whereText, floorGuess:floorGuess, TH:TH, SCOPE:SCOPE,""")

io.open(DST,'w',encoding='utf-8').write(s)
print('\n원본 %d → %d bytes (+%d) · 패치 %d개'%(orig,len(s),len(s)-orig,len(done)))
