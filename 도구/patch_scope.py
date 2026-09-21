# -*- coding: utf-8 -*-
"""v45 → v46 : 건의함 접수 범위를 지하 1층(크리에이티브 존)~5층 + 건물 출입문으로 한정. 옥상 제외"""
import io, sys
SRC='/home/claude/gunsan_b3nav_AI_v45.html'; DST='/home/claude/gunsan_b3nav_AI_v46.html'
s=io.open(SRC,encoding='utf-8').read(); orig=len(s); done=[]
def patch(name, old, new, count=1):
    global s
    n=s.count(old)
    if n!=count: print('  [실패] %s : 앵커 %d개'%(name,n)); sys.exit(1)
    s=s.replace(old,new,count); done.append(name); print('  [OK] %s'%name)

# 1. 범위 정의 + 반려 임계값 상향 (실측: 실제 사진 최저 0.679 / 무관 최고 0.420 → 0.65도 오반려 0%)
patch('접수 범위 정의',
"""    RELEVANT: 0.60,     // 미만 → 건물과 무관한 사진, 자동 반려""",
"""    RELEVANT: 0.65,     // 미만 → 범위 밖 사진, 자동 반려 (실측: 실제 사진 최저 0.679, 무관 최고 0.420)""")

patch('SCOPE 객체 추가',
"""  var TFJS = ['lib/tf.min.js',""",
"""  /* ── 건의함 접수 범위 ─────────────────────────────────────────
     지하 1층(크리에이티브 존) ~ 5층, 그리고 건물 출입문(정문·후문·동문·서문).
     옥상처럼 범위 밖인 장소는 사진이 아무리 선명해도 접수하지 않는다.
     · allow  : 이 위치 코드가 범위 안인가
     · outRx  : 제보 메모에 이런 말이 있으면 범위 밖으로 본다              */
  var SCOPE = {
    label: { ko:'지하 1층(크리에이티브 존) ~ 5층 · 건물 출입문', en:'B1 (Creative Zone) to 5F · building gates' },
    allow: function(code){
      if(!code) return false;
      code = String(code).toUpperCase();
      if(code === 'B1' || code === 'BLD' || code === 'KTC') return true;
      if(/^(EV|WC|ES)[1-5]$/.test(code)) return true;
      if(/^HALL[1-5][LR]$/.test(code)) return true;
      if(/^13[1-5]\\d{2}(-[AB])?$/.test(code)) return true;
      return false;
    },
    outRx: /옥상|옥탑|루프탑|rooftop|\\bRF\\b|[6-9]\\s*층|1[0-9]\\s*층/i
  };

  var TFJS = ['lib/tf.min.js',""")

# 2. judge : 메모가 범위 밖을 가리키면 즉시 반려, 1등 후보가 범위 밖이어도 반려
patch('judge 범위 검사',
"""          if(res.sim < TH.RELEVANT)      res.verdict = 'irrelevant';""",
"""          if(note && SCOPE.outRx.test(String(note))){ res.verdict = 'out_of_scope'; res.why = 'note'; cb(res); return; }
          if(!SCOPE.allow(res.code)){ res.verdict = 'out_of_scope'; res.why = 'code'; cb(res); return; }
          if(res.sim < TH.RELEVANT)      res.verdict = 'irrelevant';""")

# 메모만으로도 걸러야 하므로(모델 로드 전이라도) 품질검사 직후에 한 번 더
patch('judge 메모 범위 검사(모델 전)',
"""      loadLearned();
      if(!REF){ res.verdict='skipped'; res.why='novec'; cb(res); return; }""",
"""      if(note && SCOPE.outRx.test(String(note))){ res.verdict='out_of_scope'; res.why='note'; cb(res); return; }
      loadLearned();
      if(!REF){ res.verdict='skipped'; res.why='novec'; cb(res); return; }""")

# 3. sugSubmit : out_of_scope 도 접수 안 함
patch('sugSubmit 범위 밖 반려',
"if(ai.verdict === 'reject_quality' || ai.verdict === 'irrelevant'){",
"if(ai.verdict === 'reject_quality' || ai.verdict === 'irrelevant' || ai.verdict === 'out_of_scope'){")

# 4. 카드 문구
patch('showCard 범위 밖 안내',
"""    } else if(ai.verdict === 'irrelevant'){""",
"""    } else if(ai.verdict === 'out_of_scope'){
      t.icon='🚫'; t.cls='aiBad'; t.tag=ko()?'접수 안 됨':'Not accepted';
      t.title=ko()?'건의함이 받는 범위 밖이에요':'Outside the accepted area';
      t.body=(ai.why==='note')
        ? (ko()?'메모에 적힌 곳은 건의함 대상이 아니에요.<br>받는 범위 : '+SCOPE.label.ko
               :'The place in your note is not covered.<br>Accepted: '+SCOPE.label.en)
        : (ko()?'받는 범위 : '+SCOPE.label.ko+'<br>이 범위 안의 장소 사진을 올려주세요.'
               :'Accepted: '+SCOPE.label.en);
    } else if(ai.verdict === 'irrelevant'){""")
patch('irrelevant 문구에 범위 표기',
"""      t.body=ko()?'공대 3호관의 건물·복도·강의실 사진을 올려주세요.':'Please upload a photo of Engineering Building 3.';""",
"""      t.body=ko()?'받는 범위 : '+SCOPE.label.ko+'<br>이 범위 안의 복도·강의실·출입문 사진을 올려주세요.'
                 :'Accepted: '+SCOPE.label.en;""")
patch('rejectMsg 범위 밖',
"""    if(ai.verdict === 'irrelevant')
      return ko()?""",
"""    if(ai.verdict === 'out_of_scope')
      return ko()?'건의함이 받는 범위(지하 1층~5층·출입문) 밖이라 접수하지 않았어요.':'Outside the accepted area — not submitted.';
    if(ai.verdict === 'irrelevant')
      return ko()?""")

# showCard 의 body 는 textContent 로 넣고 있어 <br>가 글자로 보인다 → innerHTML 로
patch('카드 본문 innerHTML',
"""    body.textContent = t.body;""",
"""    body.innerHTML = t.body;""")

# 5. 건의함 화면에 범위 안내
patch('건의함 화면 범위 안내',
'''<h4 data-ko="사진 제보하기" data-en="Report a photo">사진 제보하기</h4>''',
'''<h4 data-ko="사진 제보하기" data-en="Report a photo">사진 제보하기</h4>
      <p style="margin:-4px 0 10px;font-size:12px;color:#7C8AA0;line-height:1.6;" data-ko="받는 범위 : <b style=&quot;color:#94B8E0;&quot;>지하 1층(크리에이티브 존) ~ 5층, 건물 출입문</b><br>옥상 등 범위 밖 장소는 접수되지 않아요." data-en="Accepted: <b style=&quot;color:#94B8E0;&quot;>B1 (Creative Zone) to 5F, building gates</b><br>Places outside this range (e.g. rooftop) are not accepted.">받는 범위 : <b style="color:#94B8E0;">지하 1층(크리에이티브 존) ~ 5층, 건물 출입문</b><br>옥상 등 범위 밖 장소는 접수되지 않아요.</p>''')

# 6. 새 장소 이름 지정 시 범위 밖이면 경고
patch('새 장소 이름 범위 경고',
"""  var code = el ? el.value.trim().toUpperCase() : '';
  if(!code){ alert('이 장소의 코드를 입력해 주세요. (예: RF)'); return; }""",
"""  var code = el ? el.value.trim().toUpperCase() : '';
  if(!code){ alert('이 장소 이름을 입력해 주세요. (예: 13210, HALL3L)'); return; }
  if(typeof SUGAI!=='undefined' && SUGAI.SCOPE && !SUGAI.SCOPE.allow(code)){
    if(!confirm('「'+code+'」은 건의함 접수 범위(지하 1층~5층·출입문) 밖입니다.\\n앱에 사진은 넣을 수 있지만, 이 장소 제보는 AI가 받지 않습니다.\\n그래도 넣을까요?')) return;
  }""")

# 7. SCOPE 외부 노출
patch('SCOPE 반환',
"""           codeLabel:codeLabel, TH:TH,
           learn:learn,""",
"""           codeLabel:codeLabel, TH:TH, SCOPE:SCOPE,
           learn:learn,""")

io.open(DST,'w',encoding='utf-8').write(s)
print('\n원본 %d → 결과 %d bytes (+%d) · 패치 %d개 · %s'%(orig,len(s),len(s)-orig,len(done),DST))
