# Recorta o fundo liso (uma cor só) de uma imagem e salva PNG com transparência, cortado no tamanho do objeto.
# Feito para imagens geradas por IA com "fundo cinza liso (#808080)" quando o plano não permite fundo
# transparente. O fundo é achado pelas bordas e removido por preenchimento a partir delas, então partes do
# objeto com a mesma cor do fundo, mas sem contato com a borda, ficam.
# Uso: python recortar-fundo.py entrada.png saida.png [tolerancia=22]
# Precisa de: pip install pillow numpy
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter


def recortar(entrada, saida, tol=22):
    im = Image.open(entrada).convert('RGB')
    a = np.asarray(im).astype(int)
    h, w, _ = a.shape
    fundo = np.median(np.concatenate([a[0, :], a[-1, :], a[:, 0], a[:, -1]]), axis=0)
    perto = np.abs(a - fundo).max(axis=2) <= tol
    vis = np.zeros((h, w), bool)
    fila = deque()
    for x in range(w):
        for y in (0, h - 1):
            if perto[y, x] and not vis[y, x]:
                vis[y, x] = True
                fila.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if perto[y, x] and not vis[y, x]:
                vis[y, x] = True
                fila.append((y, x))
    while fila:
        y, x = fila.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not vis[ny, nx] and perto[ny, nx]:
                vis[ny, nx] = True
                fila.append((ny, nx))
    # Encolhe 1 px e suaviza a borda: tira o halo da cor do fundo.
    alfa = Image.fromarray(np.where(vis, 0, 255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = im.copy()
    rgba.putalpha(alfa)
    caixa = alfa.point(lambda v: 255 if v > 128 else 0).getbbox()
    rgba.crop(caixa).save(saida)
    print(f'{saida}: fundo {fundo.astype(int).tolist()}, recorte {caixa} na imagem original')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit('Uso: python recortar-fundo.py entrada.png saida.png [tolerancia]')
    recortar(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 22)
