"""Recorte e tratamento único das fotos do Lúmen Salão (demonstração).

Uso: python -I ferramentas/tratar-fotos.py <pasta-originais> <pasta-recortes>
Originais = versões de 1920 px do Wikimedia Commons (ids em coleta/fotos-escolhidas.json), fora do repositório.
Tratamento igual para todas: recorte, sombras puxadas para o petróleo da marca, leve redução de saturação e
contraste suave, reflexos preservados. Fotos de fundo branco recortado (e40) ganham fundo petróleo com luz
lateral pela chave de luminância (o cabelo escuro sobre branco vira cabelo sobre petróleo).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


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
PETROLEO_LUZ = oklch(0.34, 0.045, 190)

# nome no site: (original, caixa relativa l, t, r, b, chave de fundo branco)
FOTOS = {
    'abertura': ('a13', (0.0, 0.03, 1.0, 1.0), False),
    'resultado': ('a42', (0.13, 0.0, 0.87, 0.74), 'branco'),
    'hidratacao': ('f92', (0.235, 0.0, 0.902, 1.0), 'parede'),
    'nutricao': ('a53', (0.30, 0.0, 0.967, 1.0), False),
    # revisão de 03/11: fotos que mostram o serviço (dosagem do tratamento, corte com as mãos, produto do plano)
    'reconstrucao': ('h1', (0.0, 0.123, 1.0, 1.0), 'salao'),
    'cronograma': ('c34', (0.167, 0.0, 0.833, 1.0), False),
    'corte': ('h2', (0.17, 0.0, 0.837, 1.0), 'salao'),
}


AMEIXA = oklch(0.42, 0.12, 15)


def luz_lateral(h, w):
    x = np.linspace(0, 1, w)[None, :, None]
    y = np.linspace(0, 1, h)[:, None, None]
    luz = np.clip(1 - np.hypot((x - 0.1) * 1.1, (y - 0.25) * 0.9), 0, 1) ** 1.6
    return PETROLEO + (PETROLEO_LUZ - PETROLEO) * luz


def blusa_ameixa(rgb):
    """Blusa rosa-choque (a42) → ameixa da marca, mantendo o sombreado do tecido."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    rosa = np.clip(((r - g) - 0.22) / 0.15, 0, 1) * np.clip((b - g + 0.05) / 0.1, 0, 1)
    lum = (rgb @ np.array([0.2126, 0.7152, 0.0722]))[..., None]
    nova = (AMEIXA * (lum / 0.36) ** 0.9).clip(0, 1)
    return rgb * (1 - rosa[..., None]) + nova * rosa[..., None]


def ligado_a_borda(candidato, sementes, raio, crescer=3):
    """Só o fundo ligado às sementes da borda (os reflexos claros dentro do cabelo não são fundo)."""
    h, w = candidato.shape
    im = Image.fromarray((candidato * 255).astype(np.uint8)).copy()  # copy: sem ela o floodfill não grava
    for x, y in sementes:
        px, py = round(x * (w - 1)), round(y * (h - 1))
        if im.getpixel((px, py)) == 255:
            ImageDraw.floodfill(im, (px, py), 128)
    fundo = Image.fromarray(((np.asarray(im) == 128) * 255).astype(np.uint8))
    fundo = fundo.filter(ImageFilter.MaxFilter(crescer)).filter(ImageFilter.GaussianBlur(raio))
    return np.asarray(fundo, dtype=np.float32)[..., None] / 255


def chave_parede(rgb):
    """Parede clara e neutra (f92) → petróleo com luz lateral; cabelo e roupa ficam."""
    h, w, _ = rgb.shape
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    sat = (mx - mn) / np.maximum(mx, 1e-3)
    candidato = ((mn > 0.5) & (sat < 0.17)).astype(np.float32)
    parede = ligado_a_borda(candidato, [(0, 0), (0.5, 0), (1, 0), (0, 0.3), (1, 0.3), (0, 0.6), (0.99, 0.02), (0.8, 0.72), (0.8, 0.66)], 2.5)
    return rgb * (1 - parede) + luz_lateral(h, w) * parede


def chave_fundo(rgb):
    """Fundo branco → petróleo com luz vinda da esquerda; o cabelo escuro fica intacto."""
    h, w, _ = rgb.shape
    menor = rgb.min(axis=2)
    fundo_ligado = ligado_a_borda((menor > 0.86).astype(np.float32), [(0, 0), (1, 0), (0, 1), (1, 1), (0.5, 0), (0, 0.5), (1, 0.5)], 1.2, 5)
    alfa = 1 - fundo_ligado  # 1 = cabelo/roupa, 0 = fundo
    fundo = luz_lateral(h, w)
    cabelo = np.array([0.07, 0.07, 0.08])  # cor média dos fios finos: tira o halo branco da borda
    borda = (alfa > 0) & (alfa < 1)
    frente = np.where(borda, cabelo, rgb)
    return frente * alfa + fundo * (1 - alfa)


def salao_escuro(rgb):
    """Foto de salão claro (série Hair Spies) → mesma luz das outras: fundo baixa para o petróleo, a luz lateral
    fica na esquerda e o assunto (mãos, fios, tigela) continua no meio."""
    h, w, _ = rgb.shape
    x = np.linspace(0, 1, w)[None, :, None]
    y = np.linspace(0, 1, h)[:, None, None]
    foco = np.clip(1 - np.hypot((x - 0.45) * 1.25, (y - 0.55) * 1.15), 0, 1) ** 1.3
    exposicao = 0.42 + 0.58 * foco  # bordas a 42 %, centro intacto
    rgb = rgb ** 1.18 * exposicao
    return rgb * (0.82 + 0.18 * foco) + PETROLEO * (1 - foco) * 0.35


def tratar(rgb):
    lum = (rgb @ np.array([0.2126, 0.7152, 0.0722]))[..., None]
    cinza = np.repeat(lum, 3, axis=2)
    rgb = cinza + (rgb - cinza) * 0.88  # saturação um pouco menor
    s = 0.62 * (1 - lum) ** 3  # só as sombras vão para o petróleo
    rgb = rgb * (1 - s) + PETROLEO * s
    rgb = 0.5 + (rgb - 0.5) * 1.04  # contraste suave
    return rgb.clip(0, 1)


def main():
    origem, destino = Path(sys.argv[1]), Path(sys.argv[2])
    destino.mkdir(parents=True, exist_ok=True)
    for nome, (arq, (l, t, r, b), chave) in FOTOS.items():
        im = Image.open(origem / f'{arq}.jpg').convert('RGB')
        w, h = im.size
        im = im.crop((round(l * w), round(t * h), round(r * w), round(b * h)))
        if max(im.size) > 2000:
            im.thumbnail((2000, 2000), Image.LANCZOS)
        rgb = np.asarray(im, dtype=np.float32) / 255
        if chave == 'branco':
            rgb = blusa_ameixa(chave_fundo(rgb))
        elif chave == 'parede':
            rgb = chave_parede(rgb)
        elif chave == 'salao':
            rgb = salao_escuro(rgb)
        out = Image.fromarray((tratar(rgb) * 255 + 0.5).astype(np.uint8))
        out.save(destino / f'{nome}.jpg', quality=93)
        print(nome, out.size)


if __name__ == '__main__':
    main()
