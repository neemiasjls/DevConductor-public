"""Recorte + tratamento único das fotos (frias, escuras, luz lateral quente) para o site da Prumo.

Uso: python -I ferramentas/tratar-fotos.py
Lê originais/fotos/<nome>-original.jpg, grava originais/fotos/<nome>.jpg (entrada do midias.py do kit).
Os originais ficam intactos; o recorte e a cor são as "alterações" declaradas nos créditos.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

PASTA = Path(__file__).resolve().parent.parent / 'originais' / 'fotos'

# nome: (arquivo de origem, recorte em fração (x0, y0, x1, y1), lado da luz quente, exposição)
FOTOS = {
    # Degradê: "Fade Hair Cut" (Truth678, CC BY-SA 4.0) — lateral/nuca com a transição inteira à mostra.
    # (Antes: Mid-fade 07; as faixas caíam sobre testa e rosto, revisão de 03/11.)
    'degrade': ('fade-hair-cut', (300 / 1125, 40 / 1104, 1050 / 1125, 1094 / 1104), 'direita', 0.8),
    'tesoura': ('iran-tesoura', (0.25, 0.0, 0.78, 1.0), 'direita', 1.0),
    'maquina': ('iran-18', (0.40, 0.04, 0.86, 0.96), 'direita', 1.45),
    'navalha': ('iran-11', (0.32, 0.0, 0.86, 1.0), 'esquerda', 1.0),
}

SOMBRA = np.array([0.80, 0.98, 0.94])  # grafite esverdeado do site (matiz 170)
LUZ = np.array([1.0, 0.80, 0.60])  # cobre da cadeira (matiz 55)


def tratar(img: Image.Image, lado: str, exposicao: float) -> Image.Image:
    a = np.clip(np.asarray(img, dtype=np.float64) / 255.0 * exposicao, 0, 1)
    lum = (a @ np.array([0.2126, 0.7152, 0.0722]))[..., None]
    # Pouca saturação, um pouco mais de contraste e menos exposição.
    a = lum + (a - lum) * 0.5
    a = np.clip((a - 0.5) * 1.08 + 0.5, 0, 1) ** 1.22 * 0.9
    lum = (a @ np.array([0.2126, 0.7152, 0.0722]))[..., None]
    # Tom dividido: sombras frias (verde-grafite), altas luzes levemente quentes.
    peso = np.clip(lum * 1.6, 0, 1)
    a = a * (SOMBRA * (1 - peso) + np.array([1.02, 0.99, 0.96]) * peso)
    # Luz lateral quente: some na metade da foto.
    h, w = a.shape[:2]
    x = np.linspace(0, 1, w)
    if lado == 'direita':
        x = x[::-1]
    rampa = np.clip(1 - x / 0.62, 0, 1) ** 2
    calor = (rampa[None, :, None] * 0.34) * lum
    a = 1 - (1 - a) * (1 - calor * LUZ)
    # Vinheta leve.
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx / w) - 0.5) ** 2 * 1.2 + ((yy / h) - 0.45) ** 2)
    a = a * (1 - np.clip(d - 0.32, 0, 1) * 0.65)[..., None]
    return Image.fromarray(np.uint8(np.clip(a, 0, 1) * 255 + 0.5))


def main() -> None:
    for nome, (origem, (x0, y0, x1, y1), lado, exposicao) in FOTOS.items():
        img = ImageOps.exif_transpose(Image.open(PASTA / f'{origem}-original.jpg')).convert('RGB')
        w, h = img.size
        recorte = img.crop((round(x0 * w), round(y0 * h), round(x1 * w), round(y1 * h)))
        if recorte.width > 1600:
            recorte = recorte.resize((1600, round(recorte.height * 1600 / recorte.width)), Image.LANCZOS)
        tratar(recorte, lado, exposicao).save(PASTA / f'{nome}.jpg', quality=92)
        print(nome, recorte.size)


if __name__ == '__main__':
    main()
