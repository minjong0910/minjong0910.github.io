# -*- coding: utf-8 -*-
"""공대 3호관 출입문 QR 스티커 4종 생성 (A4 인쇄용 PDF + 개별 PNG)"""
import os
import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image, ImageDraw, ImageFont

OUT = '/home/claude/qr_out'
os.makedirs(OUT, exist_ok=True)

BOLD = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
REG  = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
KR   = 1

def fb(sz): return ImageFont.truetype(BOLD, sz, index=KR)
def fr(sz): return ImageFont.truetype(REG,  sz, index=KR)

# QR 원문은 앱의 QRNAV.PREFIX 와 반드시 같아야 한다
PREFIX = 'B3NAV1:BLD:'
GATES = [
    ('MAIN', '정문', 'Front Gate', (0,   180, 220)),
    ('BACK', '후문', 'Back Gate',  (255,  70, 140)),
    ('EAST', '동문', 'East Gate',  (120,  92, 255)),
    ('WEST', '서문', 'West Gate',  ( 40, 200, 130)),
]

DPI = 300
def mm(v): return int(round(v * DPI / 25.4))

# ── 스티커 1장 (90mm × 120mm) ─────────────────────────────
SW, SH = mm(90), mm(120)

def make_sticker(key, ko, en, color):
    im = Image.new('RGB', (SW, SH), 'white')
    d  = ImageDraw.Draw(im)
    pad = mm(4)

    # 테두리 (구분 색상)
    d.rounded_rectangle([pad, pad, SW-pad, SH-pad], radius=mm(4), outline=color, width=mm(1.2))
    # 상단 색 띠
    d.rounded_rectangle([pad, pad, SW-pad, pad+mm(15)], radius=mm(4), fill=color)
    d.rectangle([pad, pad+mm(11), SW-pad, pad+mm(15)], fill=color)

    # 헤더 문구
    t = '공대 3호관 길안내'
    f = fb(mm(5.2))
    w = d.textbbox((0,0), t, font=f)[2]
    d.text(((SW-w)//2, pad+mm(4.2)), t, font=f, fill='white')

    def center(text, font, y, fill):
        """텍스트를 가로 중앙에 그리고, 그 아래 y좌표를 돌려준다."""
        bb = d.textbbox((0, 0), text, font=font)
        d.text(((SW - (bb[2]-bb[0]))//2 - bb[0], y - bb[1]), text, font=font, fill=fill)
        return y + (bb[3]-bb[1])

    # QR
    qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_H, box_size=10, border=2)
    qr.add_data(PREFIX + key)
    qr.make(fit=True)
    qim = qr.make_image(fill_color='black', back_color='white').convert('RGB')
    qs = mm(52)
    qim = qim.resize((qs, qs), Image.LANCZOS)
    qy = pad + mm(19)
    im.paste(qim, ((SW-qs)//2, qy))

    y = qy + qs + mm(5)
    y = center(ko, fb(mm(11)), y, (20, 24, 32))            # 문 이름 (크게)
    y = center(en, fr(mm(4.0)), y + mm(2.5), (130, 140, 155))  # 영문

    # 하단 안내 — 아래에서부터 쌓는다
    f = fr(mm(2.6)); t = PREFIX + key
    bb = d.textbbox((0,0), t, font=f)
    by = SH - pad - mm(4) - (bb[3]-bb[1])
    d.text(((SW-(bb[2]-bb[0]))//2 - bb[0], by - bb[1]), t, font=f, fill=(190, 196, 206))

    f = fr(mm(3.4)); t = '카메라로 QR을 찍으면 길안내가 시작됩니다'
    bb = d.textbbox((0,0), t, font=f)
    gy2 = by - mm(3) - (bb[3]-bb[1])
    d.text(((SW-(bb[2]-bb[0]))//2 - bb[0], gy2 - bb[1]), t, font=f, fill=(95, 105, 120))
    return im

# ── A4 시트 조립 ─────────────────────────────────────────
A4 = (mm(210), mm(297))
sheet = Image.new('RGB', A4, 'white')
sd = ImageDraw.Draw(sheet)

f = fb(mm(6))
sd.text((mm(15), mm(12)), '공대 3호관 출입문 QR — 인쇄용 시트', font=f, fill=(20,24,32))
f = fr(mm(3.6))
sd.text((mm(15), mm(21)),
        '점선을 따라 자른 뒤 코팅해서 각 출입문 안쪽 눈높이(약 150cm)에 부착하세요.',
        font=f, fill=(110,120,135))

cols, rows = 2, 2
gx = (A4[0] - cols*SW) // (cols+1)
gy0 = mm(30)
gy  = mm(8)

for i, (key, ko, en, color) in enumerate(GATES):
    st = make_sticker(key, ko, en, color)
    st.save(os.path.join(OUT, 'QR_%s_%s.png' % (key, ko)), dpi=(DPI, DPI))
    r, c = divmod(i, cols)
    x = gx + c*(SW+gx)
    y = gy0 + r*(SH+gy)
    sheet.paste(st, (x, y))
    # 절취선
    for xx in range(x-mm(2), x+SW+mm(2), mm(3)):
        sd.line([xx, y-mm(2), xx+mm(1.5), y-mm(2)], fill=(200,205,212), width=2)
        sd.line([xx, y+SH+mm(2), xx+mm(1.5), y+SH+mm(2)], fill=(200,205,212), width=2)
    for yy in range(y-mm(2), y+SH+mm(2), mm(3)):
        sd.line([x-mm(2), yy, x-mm(2), yy+mm(1.5)], fill=(200,205,212), width=2)
        sd.line([x+SW+mm(2), yy, x+SW+mm(2), yy+mm(1.5)], fill=(200,205,212), width=2)

f = fr(mm(3.2))
sd.text((mm(15), A4[1]-mm(14)),
        'QR 원문 : B3NAV1:BLD:MAIN / BACK / EAST / WEST   ·   오류정정 레벨 H(30%) — 일부 손상돼도 인식됩니다',
        font=f, fill=(150,158,170))

sheet.save(os.path.join(OUT, '출입문QR_인쇄용_A4.pdf'), 'PDF', resolution=DPI)
sheet.save(os.path.join(OUT, '출입문QR_인쇄용_A4.png'), dpi=(DPI, DPI))

print('생성 완료:')
for fn in sorted(os.listdir(OUT)):
    print('  %s  (%.0f KB)' % (fn, os.path.getsize(os.path.join(OUT, fn))/1024))
