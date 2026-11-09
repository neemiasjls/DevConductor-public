"""Recorte e tratamento único das fotos da Austral Frio calibrada (demonstração).

Uso: python -I ferramentas/tratar-fotos.py <pasta-originais> <pasta-public-img> <imagens.json>
Originais fora do repositório:
- camara-fria.jpg: Kopiersperre, Wikimedia Commons, CC BY-SA 3.0 (a mesma da rodada anterior, já aprovada na cena da porta).
- estrada.jpg: Robson Hatsukami Morgan, StockSnap, CC0. Só a versão de 960 px entregue pela API do Openverse:
  a página do StockSnap passou a pedir verificação anti-robô, então o original grande não foi baixado.
Série: frio, baixa saturação, sombras puxadas para o azul-aço da marca, altas luzes quase neutras.
Sem desfoque de marca: foto com marca de terceiro legível é reprovada, não borrada.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageEnhance

Image.MAX_IMAGE_PIXELS = None

# nome: (caixa relativa l, t, r, b), larguras publicadas
FOTOS = {
    'camara-fria': ((0.0, 0.0, 1.0, 1.0), [480, 960, 1600]),
    'estrada': ((0.0, 0.0, 1.0, 1.0), [480, 960]),
}


def tratar(img: Image.Image) -> Image.Image:
    img = ImageEnhance.Color(img).enhance(0.42)
    img = ImageEnhance.Contrast(img).enhance(0.94)
    r, g, b = img.split()
    # Curvas por canal: sombras para o azul-aço; altas luzes quase neutras, levemente frias.
    tabela_r = [round(min(255, v * (0.90 + 0.08 * v / 255))) for v in range(256)]
    tabela_g = [round(min(255, v * (0.97 + 0.02 * v / 255))) for v in range(256)]
    tabela_b = [round(min(255, v * 1.0 + 16 * (1 - v / 255) ** 1.6)) for v in range(256)]
    img = Image.merge('RGB', (r.point(tabela_r), g.point(tabela_g), b.point(tabela_b)))
    return ImageEnhance.Brightness(img).enhance(1.02)


def main():
    origem, destino, indice = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    destino.mkdir(parents=True, exist_ok=True)
    for velho in destino.glob('*.webp'):
        velho.unlink()
    saida = {}
    for nome, ((l, t, r, b), larguras) in FOTOS.items():
        im = Image.open(origem / f'{nome}.jpg').convert('RGB')
        w, h = im.size
        im = im.crop((round(l * w), round(t * h), round(r * w), round(b * h)))
        im.thumbnail((2400, 2400), Image.LANCZOS)
        out = tratar(im)
        feitas = []
        for larg in larguras:
            if larg > out.width:
                continue
            alt = round(out.height * larg / out.width)
            out.resize((larg, alt), Image.LANCZOS).save(destino / f'{nome}-{larg}.webp', quality=80, method=6)
            feitas.append(larg)
        saida[nome] = {'w': out.width, 'h': out.height, 'larguras': feitas}
        print(nome, out.size, feitas)
    indice.write_text(json.dumps(saida, indent=1) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
