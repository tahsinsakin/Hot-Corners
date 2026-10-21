"""Draws the Hot Corners icon set and store images with PIL (supersampled).

Usage: python3 tools/draw_icons.py   (writes extension/icons and store/)
"""
import math
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..')
ICONS = os.path.join(ROOT, 'extension', 'icons')
STORE = os.path.join(ROOT, 'store')
FONT = '/usr/share/fonts/opentype/inter/'

# Flame outline in unit coords: tip up at (0,-1), base around the origin.
OUTER = [
    (0.06, -1.00),
    [(0.18, -0.70), (0.44, -0.50), (0.42, -0.16)],
    [(0.40, 0.16), (0.21, 0.34), (0.00, 0.34)],
    [(-0.23, 0.34), (-0.42, 0.15), (-0.42, -0.13)],
    [(-0.42, -0.37), (-0.28, -0.48), (-0.24, -0.66)],
    [(-0.13, -0.50), (-0.09, -0.44), (-0.05, -0.39)],
    [(-0.07, -0.63), (-0.04, -0.83), (0.06, -1.00)],
]
INNER = [
    (0.03, -0.56),
    [(0.13, -0.39), (0.23, -0.25), (0.22, -0.05)],
    [(0.21, 0.14), (0.11, 0.23), (0.00, 0.23)],
    [(-0.12, 0.23), (-0.22, 0.13), (-0.22, -0.04)],
    [(-0.22, -0.23), (-0.08, -0.35), (0.03, -0.56)],
]


def bezier(path, n=40):
    pts = [path[0]]
    cur = path[0]
    for c1, c2, end in path[1:]:
        for i in range(1, n + 1):
            t = i / n
            mt = 1 - t
            x = mt**3 * cur[0] + 3 * mt**2 * t * c1[0] + 3 * mt * t**2 * c2[0] + t**3 * end[0]
            y = mt**3 * cur[1] + 3 * mt**2 * t * c1[1] + 3 * mt * t**2 * c2[1] + t**3 * end[1]
            pts.append((x, y))
        cur = end
    return pts


def place(pts, cx, cy, size, angle_deg, mirror):
    a = math.radians(angle_deg)
    ca, sa = math.cos(a), math.sin(a)
    out = []
    for x, y in pts:
        if mirror:
            x = -x
        x, y = x * size, y * size
        out.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
    return out


def axis_gradient(w, h, p0, p1, c0, c1):
    """Linear gradient from colour c0 at p0 to c1 at p1."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    t = ((xx - p0[0]) * dx + (yy - p0[1]) * dy) / (dx * dx + dy * dy)
    t = np.clip(t, 0, 1)[..., None]
    c0 = np.array(c0, np.float32)
    c1 = np.array(c1, np.float32)
    arr = c0 * (1 - t) + c1 * t
    return Image.fromarray(arr.astype(np.uint8), 'RGBA')


def fill_shape(base, pts, fill_img):
    mask = Image.new('L', base.size, 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
    layer.paste(fill_img, (0, 0), mask)
    return Image.alpha_composite(base, layer)


def draw_flames(img, corners, size, glow=True):
    W, H = img.size
    angles = {'tl': -45, 'tr': 45, 'br': 135, 'bl': -135}
    if glow:
        g = Image.new('RGBA', img.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(g)
        for key, (x, y) in corners.items():
            pts = place(bezier(OUTER), x, y, size * 1.08, angles[key], key in ('tr', 'br'))
            gd.polygon(pts, fill=(255, 196, 40, 150))
        g = g.filter(ImageFilter.GaussianBlur(size * 0.16))
        img = Image.alpha_composite(img, g)
    for key, (x, y) in corners.items():
        ang = angles[key]
        mir = key in ('tr', 'br')
        outer = place(bezier(OUTER), x, y, size, ang, mir)
        inner = place(bezier(INNER), x, y, size, ang, mir)
        tip = place([(0, -1)], x, y, size, ang, mir)[0]
        base = place([(0, 0.34)], x, y, size, ang, mir)[0]
        mid = place([(0, -0.2)], x, y, size, ang, mir)[0]
        img = fill_shape(img, outer, axis_gradient(W, H, base, tip, (255, 222, 70, 255), (255, 150, 0, 255)))
        img = fill_shape(img, inner, axis_gradient(W, H, base, mid, (255, 252, 222, 255), (255, 228, 92, 255)))
    return img


def icon(S, inset, radius, screen, stroke, flame, glow=True):
    """inset/radius/screen/stroke/flame are fractions of S."""
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    a, b = int(S * inset), int(S * (1 - inset))
    bg = axis_gradient(S, S, (S / 2, a), (S / 2, b), (44, 49, 64, 255), (18, 20, 28, 255))
    m = Image.new('L', (S, S), 0)
    ImageDraw.Draw(m).rounded_rectangle([a, a, b, b], radius=int(S * radius), fill=255)
    img.paste(bg, (0, 0), m)
    # subtle top highlight
    hl = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(hl).rounded_rectangle([a, a, b, b], radius=int(S * radius),
                                         outline=(255, 255, 255, 28), width=max(1, int(S * 0.006)))
    img = Image.alpha_composite(img, hl)

    sx0, sx1 = S * (0.5 - screen[0] / 2), S * (0.5 + screen[0] / 2)
    sy0, sy1 = S * (0.5 - screen[1] / 2), S * (0.5 + screen[1] / 2)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([sx0, sy0, sx1, sy1], radius=int(S * 0.045), fill=(30, 34, 46, 255),
                        outline=(232, 236, 244, 255), width=int(S * stroke))
    off = S * stroke * 0.2
    corners = {'tl': (sx0 + off, sy0 + off), 'tr': (sx1 - off, sy0 + off),
               'bl': (sx0 + off, sy1 - off), 'br': (sx1 - off, sy1 - off)}
    return draw_flames(img, corners, S * flame, glow)


def down(img, size):
    return img.resize((size, size), Image.LANCZOS)


SS = 2048
# Store / large icon: content in the central 96/128 (16px transparent margin).
big = icon(SS, inset=0.125, radius=0.17, screen=(0.40, 0.31), stroke=0.028, flame=0.16)
down(big, 128).save(f'{ICONS}/icon128.png')
down(big, 512).save(f'{STORE}/icon-512-preview.png')
# Toolbar sizes: fuller bleed, bolder lines, bigger flames.
mid = icon(SS, inset=0.03, radius=0.2, screen=(0.46, 0.36), stroke=0.045, flame=0.2)
down(mid, 48).save(f'{ICONS}/icon48.png')
small = icon(SS, inset=0.0, radius=0.22, screen=(0.46, 0.38), stroke=0.075, flame=0.25, glow=False)
down(small, 32).save(f'{ICONS}/icon32.png')
down(small, 16).save(f'{ICONS}/icon16.png')


# ---------- store promo images ----------

def promo(W, H, title_px, tag_px, icon_px, path, mock=False):
    k = 2
    w, h = W * k, H * k
    img = axis_gradient(w, h, (0, 0), (w, h), (34, 38, 52, 255), (14, 15, 21, 255))
    # warm haze from the right
    haze = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(haze).ellipse([w * 0.55, -h * 0.4, w * 1.4, h * 1.3], fill=(255, 170, 30, 40))
    img = Image.alpha_composite(img, haze.filter(ImageFilter.GaussianBlur(h * 0.25)))

    ic = down(icon(SS, inset=0.0, radius=0.2, screen=(0.42, 0.33), stroke=0.03, flame=0.17), icon_px * k)
    pad = int(h * 0.16) if not mock else int(h * 0.14)
    ix = int(w * 0.07)
    iy = (h - icon_px * k) // 2 if not mock else int(h * 0.14)
    img.alpha_composite(ic, (ix, iy))

    d = ImageDraw.Draw(img)
    fb = ImageFont.truetype(FONT + 'Inter-Bold.otf', title_px * k)
    fr = ImageFont.truetype(FONT + 'Inter-Medium.otf', tag_px * k)
    tx = ix + icon_px * k + int(w * 0.04) if not mock else ix
    if not mock:
        ty = h // 2 - int(title_px * k * 0.95)
    else:
        ty = iy + icon_px * k + int(h * 0.07)
    d.text((tx, ty), 'Hot Corners', font=fb, fill=(246, 247, 250))
    d.text((tx, ty + int(title_px * k * 1.25)), 'Every corner, a shortcut.', font=fr, fill=(255, 205, 80))

    if mock:
        # a stylised browser window with flames in its corners
        bx0, by0, bx1, by1 = w * 0.48, h * 0.2, w * 0.93, h * 0.82
        d.rounded_rectangle([bx0, by0, bx1, by1], radius=int(h * 0.03), fill=(28, 31, 42), outline=(70, 76, 92), width=k * 2)
        d.rounded_rectangle([bx0, by0, bx1, by0 + h * 0.08], radius=int(h * 0.03), fill=(40, 44, 58))
        # a neutral tab strip: one active tab and two quiet ones
        for i in range(3):
            tx0 = bx0 + h * 0.03 + i * h * 0.17
            fill = (58, 63, 80) if i == 0 else (48, 52, 67)
            d.rounded_rectangle([tx0, by0 + h * 0.022, tx0 + h * 0.15, by0 + h * 0.08], radius=int(h * 0.012), fill=fill)
            d.rounded_rectangle([tx0 + h * 0.025, by0 + h * 0.045, tx0 + h * 0.11, by0 + h * 0.056], radius=k * 2,
                                fill=(120, 127, 145) if i == 0 else (88, 94, 110))
        gx0, gy0 = bx0 + h * 0.05, by0 + h * 0.13
        cols, rows = 3, 2
        gw = (bx1 - h * 0.05 - gx0 - (cols - 1) * h * 0.03) / cols
        gh = (by1 - h * 0.06 - gy0 - (rows - 1) * h * 0.03) / rows
        for r in range(rows):
            for c in range(cols):
                x = gx0 + c * (gw + h * 0.03)
                y = gy0 + r * (gh + h * 0.03)
                sel = (r, c) == (0, 1)
                d.rounded_rectangle([x, y, x + gw, y + gh], radius=int(h * 0.015),
                                    fill=(46, 51, 66), outline=(255, 176, 32) if sel else (60, 66, 82),
                                    width=k * (3 if sel else 1))
                d.rounded_rectangle([x + gw * 0.08, y + gh * 0.78, x + gw * 0.7, y + gh * 0.86],
                                    radius=k * 3, fill=(90, 97, 115))
        corners = {'tl': (bx0, by0), 'tr': (bx1, by0), 'bl': (bx0, by1), 'br': (bx1, by1)}
        img = draw_flames(img, corners, h * 0.115)
    img.convert('RGB').resize((W, H), Image.LANCZOS).save(path)


promo(440, 280, 34, 16, 120, f'{STORE}/promo-small-440x280.png')
promo(1400, 560, 64, 30, 150, f'{STORE}/promo-marquee-1400x560.png', mock=True)
print('done')


# Grey "off" variants for the toolbar (shown when turned off or paused).
from PIL import ImageOps
for s in (16, 32, 48):
    im = Image.open(f'{ICONS}/icon{s}.png').convert('RGBA')
    a = im.split()[3]
    g = ImageOps.grayscale(im.convert('RGB')).point(lambda v: int(v * 0.75 + 30))
    Image.merge('RGBA', (g, g, g, a.point(lambda v: int(v * 0.8)))).save(f'{ICONS}/off{s}.png')
