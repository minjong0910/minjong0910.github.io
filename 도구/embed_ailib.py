# -*- coding: utf-8 -*-
"""기본 자료집(JSON)을 index.html 의 <script id="EMBEDDED_AILIB"> 자리에 끼워 넣는다.
   사용 : python3 embed_ailib.py <입력.html> <ailib.json> <출력.html>
   (앱 안의 「자료집을 담은 index.html 내려받기」 버튼이 하는 일과 같다)"""
import io, sys, re, json

SRC, JS, DST = sys.argv[1], sys.argv[2], sys.argv[3]
s = io.open(SRC, encoding='utf-8').read()
j = io.open(JS, encoding='utf-8').read()
d = json.loads(j)
tag = '<script id="EMBEDDED_AILIB" type="application/json">' + j.replace('<', '\\u003c') + '</script>'
rx = re.compile(r'<script id="EMBEDDED_AILIB"[\s\S]*?</script>', re.I)
if not rx.search(s):
    print('EMBEDDED_AILIB 자리가 없습니다 (patch_ailib.py 먼저)'); sys.exit(1)
s = rx.sub(lambda m: tag, s, count=1)
io.open(DST, 'w', encoding='utf-8').write(s)
print('자료집 %d장 (%.2fMB) 삽입 → %s (%d bytes)' % (d.get('n', len(d.get('items', []))), len(j)/1048576.0, DST, len(s.encode('utf-8'))))
