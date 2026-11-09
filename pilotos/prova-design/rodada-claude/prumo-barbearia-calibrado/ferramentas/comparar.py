"""Página de antes e depois da calibragem do Prumo, a partir dos prints de ferramentas/prints.mjs.

Uso: python -I ferramentas/comparar.py <pasta-prints-antes> <pasta-prints-depois> public
Os prints são achados pelo nome da cena (o número na frente muda quando a lista de pontos muda).
"""
import sys
from pathlib import Path
from PIL import Image

antes, depois, destino = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
pasta = destino / 'antes-depois'
pasta.mkdir(parents=True, exist_ok=True)
PONTOS = [
    ('A cadeira', 'A cadeira 3D ficou igual. A ficha técnica mostra uma peça por vez, com a medida na régua.', 'cadeira-encosto'),
    ('O degradê', 'A foto que não mostrava degradê saiu. Entrou um desenho da mesma cabeça: o cabelo cheio vira pele por onde a máquina passa.', 'degrade-meio'),
    ('Fim do degradê', 'As três marcas de pente ficam na altura certa do desenho, sem escurecer nem brilho por cima.', 'degrade-fim'),
    ('Serviços', 'Três fotos novas na mesma luz de oficina: tesoura, máquina na nuca e navalhas.', 'servicos'),
    ('Horários', 'No celular fica só a lista; a grade repetida saiu.', 'horarios'),
    ('Agendar', 'Saiu a régua de "0 mm de espera". Entrou uma linha com horário e endereço.', 'agendar'),
]
blocos = []
for titulo, nota, ponto in PONTOS:
    linhas = []
    for larg, rotulo, alvo in [(1440, 'Computador', 900), (390, 'Celular', 390)]:
        figs = []
        for lado, origem in [('Antes', antes), ('Depois', depois)]:
            # O antes tinha um ponto só da cadeira ("cadeira"), que saiu preso na abertura.
            achados = sorted(origem.glob(f'{larg}-[0-9][0-9]-{ponto}.*')) or sorted(origem.glob(f'{larg}-[0-9][0-9]-{ponto.split("-")[0]}.*'))
            if not achados:
                raise SystemExit(f'sem print {larg}-??-{ponto} em {origem}')
            nome = f'{lado.lower()}-{larg}-{ponto}.jpg'
            im = Image.open(achados[0]).convert('RGB')
            im = im.resize((alvo, round(im.height * alvo / im.width)), Image.LANCZOS)
            im.save(pasta / nome, quality=74)
            figs.append(f'<figure><figcaption>{lado}</figcaption><img loading="lazy" src="antes-depois/{nome}" alt="{titulo}, {rotulo.lower()}, {lado.lower()}" width="{im.width}" height="{im.height}"></figure>')
        linhas.append(f'<div class="par {rotulo.lower()}"><h3>{rotulo}</h3><div class="lado">{"".join(figs)}</div></div>')
    blocos.append(f'<section><h2>{titulo}</h2><p>{nota}</p>{"".join(linhas)}</section>')

html = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Prumo: antes e depois</title>
<style>
:root{{--fundo:#16191a;--texto:#efe9df;--apoio:#b7aea2;--linha:#33302c;--cobre:#c98a5a}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--fundo);color:var(--texto);font:17px/1.5 system-ui,sans-serif}}
main{{max-width:1240px;margin:auto;padding:32px 16px 80px}}h1{{font:600 clamp(34px,6vw,56px)/1.1 Georgia,serif;margin:0 0 12px}}
h2{{font:600 32px/1.2 Georgia,serif;margin:0 0 4px}}h3{{font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--apoio);margin:20px 0 8px}}
p{{color:var(--apoio);margin:0;max-width:62ch}}section{{border-top:1px solid var(--linha);margin-top:40px;padding-top:28px}}
.links{{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0 0}}.links a{{color:var(--fundo);background:var(--cobre);padding:12px 20px;border-radius:99px;text-decoration:none;font-weight:600}}
.links a+a{{background:none;color:var(--texto);border:1px solid var(--apoio)}}
.lado{{display:grid;grid-template-columns:1fr 1fr;gap:12px}}.celular .lado{{max-width:620px}}
figure{{margin:0}}figcaption{{font-size:14px;margin-bottom:6px;color:var(--apoio)}}img{{display:block;width:100%;height:auto;border-radius:8px}}
</style></head><body><main>
<h1>Prumo: antes e depois</h1>
<p>Mesma identidade e mesma cadeira 3D. Mudaram as fotos, a cena do degradê e o excesso de texto. Os prints só comparam: julgue abrindo os dois sites.</p>
<div class="links"><a href="http://localhost:5206/">Abrir o depois</a><a href="http://localhost:5203/">Abrir o antes</a></div>
{"".join(blocos)}
</main></body></html>
'''
(destino / 'antes-depois.html').write_text(html, encoding='utf-8')
print('ok')
