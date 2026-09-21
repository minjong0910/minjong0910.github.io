# -*- coding: utf-8 -*-
"""
공대 3호관 길안내 앱 — 기능 일괄 적용기
  사용법 : python3 apply_all.py <원본.html> <결과.html>

원본(3D·경로안내가 들어있는 완성본)에 아래를 순서대로 끼워 넣는다.
  1. QR 위치판별      (patch_qr.py)     v42~43
  2. 사진 판별 AI     (patch_ai.py)     v44
  3. AI 자동 학습     (patch_ai2.py)    v45
  4. 접수 범위 제한   (patch_scope.py)  v46
  5. 추정 위치 표시   (patch_where.py)  v47
  6. 관리자 화면 스크롤 (아래 내장)     v48
  7. 서버(Firestore) 연동   (patch_db.py)  v49
  8. 숫자 7자리 로그인      (patch_pin.py) v50
  9. 폰 렉 제거(3D 루프 게이트 등) (patch_perf.py) v51
 10. AI 정확도 개선 (3시점 기준벡터·제곱근·층힌트) (patch_ai3.py) v52
 11. 번호판 OCR·층 선택·메모 힌트 버그 수정 (patch_ocr.py) v53
 12. 관리자 건의함 사진 크게 보기 (patch_zoom.py) v54
 13. AI 사진 파악 자료집 (patch_aidata.py) v55
 14. 기본 자료집을 파일에 담아 배포 + index.html 내려받기 (patch_ailib.py) v56
 15. 번호판 읽기 강화 — 파란 표지판을 찾아 잘라 확대해 읽는다 (patch_ocr2.py) v57
 16. 사람이 사진 보고 고르는 안전망 (patch_pick.py) v57
 17. 기본 자료집 데이터(ailib_v56.json, 사진 239장) 삽입 (embed_ailib.py) v56~57
각 단계는 '앵커' 문자열을 찾아 그 자리에 코드를 넣는다. 앵커가 없으면 그 자리에서 멈추고
어느 앵커가 없는지 알려준다 — 원본 코드가 바뀐 곳이 거기다.
"""
import io, re, sys, os, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
STAGES = ['patch_qr.py', 'patch_ai.py', 'patch_ai2.py', 'patch_scope.py', 'patch_where.py']
POST = ['patch_db.py', 'patch_pin.py', 'patch_perf.py', 'patch_ai3.py', 'patch_ocr.py', 'patch_zoom.py', 'patch_aidata.py', 'patch_ailib.py',
        'patch_ocr2.py', 'patch_pick.py']   # 스크롤 단계 뒤에 적용
AILIB = 'ailib_v56.json'   # 기본 자료집 데이터 — 마지막에 embed_ailib.py 로 끼워 넣는다

def run_stage(script, src, dst):
    code = io.open(os.path.join(HERE, script), encoding='utf-8').read()
    code = re.sub(r"\bSRC\s*=\s*'[^']*'", "SRC = %r" % src, code, count=1)
    code = re.sub(r"\bDST\s*=\s*'[^']*'", "DST = %r" % dst, code, count=1)
    code = code.replace("JSQR = '/tmp/nav/jsQR.min.js'", "JSQR = %r" % os.path.join(HERE, 'jsQR.min.js'))
    # AIVEC = '/tmp/nav/lab/<파일>.json'  →  도구 폴더의 같은 이름 파일 (aivec.json / aivec_v52.json)
    def _aivec(m):
        return "%s = %r" % (m.group(1), os.path.join(HERE, os.path.basename(m.group(2))))
    code = re.sub(r"(AIVEC)\s*=\s*'(/tmp/nav/lab/[^']*\.json)'", _aivec, code)
    g = {'__name__': '__main__', '__file__': script}
    try:
        exec(compile(code, script, 'exec'), g)
    except SystemExit as e:
        if e.code not in (0, None):
            raise RuntimeError('%s 단계에서 앵커를 찾지 못함' % script)

def stage_scroll(src, dst):
    s = io.open(src, encoding='utf-8').read()
    old = "  #sadmin .sugEmpty{color:#5A6472;font-size:13px;text-align:center;padding:34px 10px;}"
    new = old + """
  /* v48 : 제보가 여러 건이면 화면 전체가 스크롤되게 — .screen 기본값이 overflow:hidden이라
     둘째 건부터 잘려 보이던 문제. 목록만 스크롤하면 작은 폰에선 안내문이 자리를 다 차지하므로
     안내문까지 같이 위로 밀리도록 화면 자체를 스크롤 컨테이너로 만든다. */
  #sadmin{overflow-y:auto;-webkit-overflow-scrolling:touch;display:block;}
  #sadmin .bar{position:sticky;top:0;background:#0B0E13;z-index:3;padding-bottom:8px;margin:0 0 6px;
    /* 화면 위쪽 여백(padding-top)까지 제목줄 배경으로 덮어 카드가 비쳐 보이지 않게 */
    padding-top:calc(16px + env(safe-area-inset-top, 0px));
    margin-left:-16px;margin-right:-16px;padding-left:16px;padding-right:16px;}
  /* 화면 자체의 위 여백을 없애고 제목줄이 그 여백을 대신 갖게 → 스크롤된 내용이 위로 비칠 자리가 없다 */
  #sadmin{padding-top:0 !important;}
  #sadmin #sugAdminList{padding-bottom:6px;}
  #ssug{overflow-y:auto;-webkit-overflow-scrolling:touch;}"""
    if s.count(old) != 1:
        raise RuntimeError('스크롤 단계 앵커(#sadmin .sugEmpty) 없음')
    io.open(dst, 'w', encoding='utf-8').write(s.replace(old, new))
    print('  [OK] 관리자 화면 스크롤')

def main():
    if len(sys.argv) != 3:
        print(__doc__); sys.exit(2)
    src, final = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    tmp = tempfile.mkdtemp(prefix='b3nav_')
    cur = src
    for i, st in enumerate(STAGES, 1):
        out = os.path.join(tmp, 'stage%d.html' % i)
        print('\n[%d/%d] %s' % (i, len(STAGES) + 1, st))
        run_stage(st, cur, out)
        cur = out
    total = len(STAGES) + 1 + len(POST) + 1
    print('\n[%d/%d] 관리자 화면 스크롤' % (len(STAGES) + 1, total))
    out = os.path.join(tmp, 'stage_scroll.html')
    stage_scroll(cur, out); cur = out
    for k, st in enumerate(POST, len(STAGES) + 2):
        print('\n[%d/%d] %s' % (k, total, st))
        dst = os.path.join(tmp, 'stage%d.html' % k)
        run_stage(st, cur, dst); cur = dst
    print('\n[%d/%d] 기본 자료집 삽입 (embed_ailib.py + %s)' % (total, total, AILIB))
    import subprocess
    r = subprocess.call([sys.executable, os.path.join(HERE, 'embed_ailib.py'), cur, os.path.join(HERE, AILIB), final])
    if r != 0: raise RuntimeError('기본 자료집 삽입 실패')
    print('\n완료 → %s  (%.1f MB)' % (final, os.path.getsize(final) / 1048576))

if __name__ == '__main__':
    main()
