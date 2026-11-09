"""Recorte e tratamento único da série de fotos do Lúmen calibrado (demonstração).

Uso: python -I ferramentas/tratar-fotos.py <pasta-originais> <pasta-public-img> <imagens.json>
Originais = StockSnap e rawpixel, CC0, fora do repositório (lista em coleta/fotos-escolhidas.json).
Série: luz natural, foco raso, cabelo como assunto. Tratamento igual para todas: sombras puxadas para o petróleo
da marca, saturação levemente menor, contraste suave. Onde o fundo estoura (janela, parede branca), a borda baixa
com vinheta para a foto conviver com as seções escuras. Nada de troca de fundo por chave de cor.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None


def oklch(L, C, h):
    hr = np.radians(h)
    a, b = C * np.cos(hr), C * np.sin(hr)
    l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
    lin = np.array([4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
                    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
                    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_]).clip(0, 1)
    return np.where(lin <= 0.0031308, 12.92 * lin, 1.055 * lin ** (1 / 2.4) - 0.055)


PETROLEO = oklch(0.22, 0.04, 190)

# nome: (caixa relativa l, t, r, b), vinheta (centro x, centro y, exposição na borda) ou None, larguras publicadas
FOTOS = {
    'abertura': ((0.2, 0.2, 1.0, 0.92), (0.62, 0.5, 0.26), [480, 960, 1600]),
    'fio': ((0.0, 0.0, 1.0, 0.62), (0.5, 0.35, 0.72), [640, 1280, 1920]),
    'resultado': ((0.18, 0.0, 0.72, 1.0), (0.5, 0.5, 0.62), [480, 960, 1280]),
    'hidratacao': ((0.05, 0.0, 0.95, 1.0), (0.5, 0.5, 0.72), [480, 960]),
    'nutricao': ((0.0, 0.05, 1.0, 1.0), (0.42, 0.55, 0.7), [480, 960]),
    'reconstrucao': ((0.0, 0.0, 1.0, 1.0), (0.5, 0.5, 0.8), [480, 960]),
    'cronograma': ((0.55, 0.0, 1.0, 0.8), None, [480, 960]),
    'corte': ((0.05, 0.0, 0.8, 1.0), (0.5, 0.45, 0.55), [480, 960]),
}


def vinheta(rgb, cx, cy, borda):
    h, w, _ = rgb.shape
    x = np.linspace(0, 1, w)[None, :, None]
    y = np.linspace(0, 1, h)[:, None, None]
    foco = np.clip(1 - np.hypot((x - cx) * 1.25, (y - cy) * 1.15), 0, 1) ** 1.3
    return (rgb ** 1.08) * (borda + (1 - borda) * foco) + PETROLEO * (1 - foco) * (1 - borda) * 0.35


def tratar(rgb):
    lum = (rgb @ np.array([0.2126, 0.7152, 0.0722]))[..., None]
    cinza = np.repeat(lum, 3, axis=2)
    rgb = cinza + (rgb - cinza) * 0.9
    s = 0.62 * (1 - lum) ** 3  # só as sombras vão para o petróleo
    rgb = rgb * (1 - s) + PETROLEO * s
    rgb = 0.5 + (rgb - 0.5) * 1.04
    return rgb.clip(0, 1)


def main():
    origem, destino, indice = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    destino.mkdir(parents=True, exist_ok=True)
    for velho in destino.glob('*.webp'):
        velho.unlink()
    saida = {}
    for nome, ((l, t, r, b), vin, larguras) in FOTOS.items():
        im = Image.open(origem / f'{nome}.jpg').convert('RGB')
        w, h = im.size
        im = im.crop((round(l * w), round(t * h), round(r * w), round(b * h)))
        im.thumbnail((2400, 2400), Image.LANCZOS)
        if nome == 'fio':  # macro com grão de ISO alto: a faixa ocupa a largura toda e o grão apareceria
            im = im.filter(ImageFilter.GaussianBlur(0.9))
        rgb = np.asarray(im, dtype=np.float32) / 255
        if vin:
            rgb = vinheta(rgb, *vin)
        out = Image.fromarray((tratar(rgb) * 255 + 0.5).astype(np.uint8))
        feitas = []
        for larg in larguras:
            if larg > out.width:
                continue
            alt = round(out.height * larg / out.width)
            out.resize((larg, alt), Image.LANCZOS).save(destino / f'{nome}-{larg}.webp', quality=78, method=6)
            feitas.append(larg)
        if not feitas or feitas[-1] != larguras[-1]:
            out.save(destino / f'{nome}-{out.width}.webp', quality=78, method=6)
            feitas.append(out.width)
        saida[nome] = {'w': out.width, 'h': out.height, 'larguras': feitas}
        print(nome, out.size, feitas)
    indice.write_text(json.dumps(saida, indent=1) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
