# python -I folha.py <rotulo> → <rotulo>-folha.jpg (miniaturas numeradas)
import sys, glob
from PIL import Image, ImageDraw, ImageFont
r = sys.argv[1]
fs = sorted(glob.glob(f'{r}-[0-9][0-9].jpg'))
W, H, cols = 240, 170, 6
rows = (len(fs) + cols - 1) // cols
folha = Image.new('RGB', (cols * W, rows * H), 'white')
d = ImageDraw.Draw(folha)
fonte = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 22)
for k, f in enumerate(fs):
    im = Image.open(f).convert('RGB'); im.thumbnail((W - 6, H - 6))
    x, y = (k % cols) * W, (k // cols) * H
    folha.paste(im, (x + 3, y + 3))
    n = f.split('-')[-1][:2]
    d.rectangle([x + 3, y + 3, x + 36, y + 30], fill='black'); d.text((x + 6, y + 4), n, fill='yellow', font=fonte)
folha.save(f'{r}-folha.jpg', quality=80)
