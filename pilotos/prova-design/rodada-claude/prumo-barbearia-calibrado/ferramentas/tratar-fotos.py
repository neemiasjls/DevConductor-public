"""Recorte e tratamento único das fotos de apoio da Prumo (demonstração): luz quente preservada, sombras no grafite.

Uso: python -I ferramentas/tratar-fotos.py <pasta-originais> <pasta-public-img> <imagens.json>
Originais fora do repositório. Navalha: StockSnap (CC0, Nick Demou); a página de download bloqueou o acesso automático,
então entra a versão de 960 px que a API do Openverse devolve, sem ampliar. Máquina: rawpixel (CC0), 1024 px da API.
Tesoura: Commons (Mostafameraji, CC BY-SA 4.0).
Todas no formato 3:2 do painel de serviços. A cena do degradê é ilustração própria (ferramentas/gerar-degrade.py).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

Image.MAX_IMAGE_PIXELS = None

# nome: (arquivo, caixa em fração (l, t, r, b), larguras publicadas)
FOTOS = {
    'maquina': ('rp-64.jpg', (0.0, 0.0, 1.0, 1.0), [480, 960]),
    'navalha': ('GZP9ZEQPFL-960.jpg', (0.0, 0.0, 1.0, 1.0), [480, 960]),
    'tesoura': ('iran-tesoura-original.jpg', (0.08, 0.0, 0.98, 0.9), [480, 960, 1600]),
}
GRAFITE = np.array([0.075, 0.105, 0.098])  # sombra da marca (grafite, matiz 170)


def cobrir_etiqueta(im):
    """A etiqueta branca da capa traz marca de terceiro: some sob o preto da própria capa, com borda suave."""
    masc = Image.new('L', im.size, 0)
    ImageDraw.Draw(masc).polygon([(236, 408), (316, 408), (314, 448), (276, 508), (240, 505)], fill=255)
    cor = Image.new('RGB', im.size, im.getpixel((340, 470)))
    return Image.composite(cor, im, masc.filter(ImageFilter.GaussianBlur(5)))


def tratar(a):
    lum = (a @ np.array([0.2126, 0.7152, 0.0722]))[..., None]
    a = lum + (a - lum) * 0.74  # um pouco menos de saturação, sem lavar a cor
    s = 0.5 * (1 - lum) ** 3  # só as sombras vão para o grafite
    a = a * (1 - s) + GRAFITE * s
    a = 0.5 + (a - 0.5) * 1.04
    return a.clip(0, 1)


def main():
    origem, destino, indice = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    dados = json.loads(indice.read_text(encoding='utf-8'))
    dados.pop('pente', None)
    for velho in ('pente-480', 'pente-960', 'maquina-480', 'maquina-883', 'navalha-480', 'navalha-960', 'navalha-1037', 'tesoura-480', 'tesoura-960', 'tesoura-1600'):
        (destino / f'{velho}.webp').unlink(missing_ok=True)
    for nome, (arquivo, (l, t, r, b), larguras) in FOTOS.items():
        im = ImageOps.exif_transpose(Image.open(origem / arquivo)).convert('RGB')
        if nome == 'maquina':
            im = cobrir_etiqueta(im)
        w, h = im.size
        im = im.crop((round(l * w), round(t * h), round(r * w), round(b * h)))
        if im.width > larguras[-1]:
            im = im.resize((larguras[-1], round(im.height * larguras[-1] / im.width)), Image.LANCZOS)
        out = Image.fromarray((tratar(np.asarray(im, dtype=np.float32) / 255) * 255 + 0.5).astype(np.uint8))
        feitas = [x for x in larguras if x <= out.width]
        for larg in feitas:
            out.resize((larg, round(out.height * larg / out.width)), Image.LANCZOS).save(destino / f'{nome}-{larg}.webp', quality=80, method=6)
        dados[nome] = {'w': out.width, 'h': out.height, 'larguras': feitas}
        print(nome, out.size, feitas)
    indice.write_text(json.dumps(dados, indent=1) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
