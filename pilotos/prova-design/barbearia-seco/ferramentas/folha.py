"""Junta prints numa folha de contato: python -I folha.py <pasta> <prefixo> <saida> [largura] [colunas]"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
pasta, prefixo, saida = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
W = int(sys.argv[4]) if len(sys.argv) > 4 else 700
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 2
arqs = sorted({p for pre in prefixo.split(',') for p in pasta.glob(f'{pre}*.jpg')})
ims = []
for a in arqs:
    im = Image.open(a).convert('RGB')
    im = im.resize((W, round(im.height * W / im.width)))
    ims.append((a.stem, im))
H = max(im.height for _, im in ims) + 18
rows = (len(ims) + cols - 1) // cols
folha = Image.new('RGB', (cols * (W + 6), rows * H), (255, 0, 255))
d = ImageDraw.Draw(folha)
for i, (n, im) in enumerate(ims):
    x, y = (i % cols) * (W + 6), (i // cols) * H
    folha.paste(im, (x, y + 18)); d.rectangle([x, y, x + W, y + 17], fill='white'); d.text((x + 4, y + 3), n, fill='black')
folha.save(saida, quality=82)
print(len(ims), folha.size)
