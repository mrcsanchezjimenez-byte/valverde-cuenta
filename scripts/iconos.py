"""Genera los iconos PNG de la PWA. Uso: python scripts/iconos.py public/iconos"""
import os
import sys

from PIL import Image, ImageDraw

TERRACOTA, CREMA, MOSTAZA = (180, 80, 43), (251, 246, 238), (221, 166, 58)


def icono(lado, escala=1.0, redondeo=0.22):
    s = lado * 4
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, s, s), radius=int(s * redondeo), fill=TERRACOTA)
    u = s / 64 * escala
    o = (s - 64 * u) / 2
    p = lambda x, y: (o + x * u, o + y * u)
    d.rounded_rectangle((*p(19.5, 14), *p(24.5, 52)), radius=int(2.5 * u), fill=CREMA)
    d.polygon([p(24, 15), p(46, 15), p(40, 23), p(46, 31), p(24, 31)], fill=CREMA)
    d.ellipse((*p(39, 41), *p(49, 51)), fill=MOSTAZA)
    return img.resize((lado, lado), Image.LANCZOS)


dest = sys.argv[1]
os.makedirs(dest, exist_ok=True)
icono(192).save(os.path.join(dest, 'icono-192.png'))
icono(512).save(os.path.join(dest, 'icono-512.png'))
icono(512, 0.72, 0).save(os.path.join(dest, 'icono-maskable-512.png'))
icono(180, 1.0, 0).save(os.path.join(dest, 'apple-touch-icon.png'))
