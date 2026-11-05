"""Converte as fotos baixadas para P&B de alto contraste, recorta e salva em <destino> (max 2400 px)."""
import sys
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance

origem, destino = Path(sys.argv[1]), Path(sys.argv[2])
# nome-no-site: (id, recorte relativo x0,y0,x1,y1 ou None, gama)
MAPA = {
    'abertura-tesoura': ('b-38', None, 0.9),
    'navalha': ('b-47', None, 0.85),
    'detalhe-pente': ('b-59', None, 1.0),
    'corte-topete': ('b-52', (0.03, 0.25, 0.43, 1.0), 0.85),
    'corte-nuca': ('b-51', (0.16, 0.0, 0.694, 1.0), 0.8),
    'corte-espelho': ('b-60', (0.0, 0.09, 1.0, 0.924), 1.0),
    'corte-maquina': ('b-46', (0.22, 0.0, 0.754, 1.0), 0.85),
}
for nome, (fid, caixa, gama) in MAPA.items():
    img = ImageOps.exif_transpose(Image.open(origem / f'{fid}.jpg')).convert('RGB')
    w, h = img.size
    if caixa:
        img = img.crop((round(caixa[0] * w), round(caixa[1] * h), round(caixa[2] * w), round(caixa[3] * h)))
    g = ImageOps.grayscale(img)
    if gama != 1.0:
        g = g.point(lambda v: round(255 * ((v / 255) ** gama)))
    g = ImageOps.autocontrast(g, cutoff=(1.5, 0.6))
    g = ImageEnhance.Contrast(g).enhance(1.35)
    g.thumbnail((2400, 2400), Image.LANCZOS)
    g.convert('RGB').save(destino / f'{nome}.jpg', 'JPEG', quality=88, optimize=True)
    print(nome, g.size)
