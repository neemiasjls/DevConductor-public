"""Página de antes e depois da calibragem da Austral Frio.
Uso: python -I ferramentas/comparar.py <prints-antes> <prints-depois> public
Os prints vêm de ferramentas/prints.mjs (nomes 1440-NN-secao.jpg e 390-NN-secao.jpg).
"""
import sys
from pathlib import Path
from PIL import Image

antes, depois, destino = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
pasta = destino / 'antes-depois'
pasta.mkdir(parents=True, exist_ok=True)
PONTOS = [
    ('Porta do baú', 'A transição foi mantida sobre a mesma câmara fria. O texto ficou em uma frase e a legenda diz que a foto é ilustrativa.', '02-porta'),
    ('Pátio e estrada', 'Saiu o semirreboque com marcas desfocadas e céu artificial. Entrou um caminhão baú na estrada, sem marca legível, no mesmo tom frio.', '06-doca-abrindo'),
    ('Estrada aberta', 'A foto ocupa o quadro e o texto diz o que acontece na viagem, sem repetir a seção anterior.', '07-doca-aberta'),
    ('Como cotar', 'Saiu a foto de lado que só enchia espaço. Ficaram os passos e o prazo de resposta.', '08-cotar'),
]
blocos = []
for titulo, nota, ponto in PONTOS:
    linhas = []
    for larg, rotulo, alvo in [(1440, 'Computador', 900), (390, 'Celular', 390)]:
        figs = []
        for lado, origem in [('Antes', antes), ('Depois', depois)]:
            achados = sorted(origem.glob(f'{larg}-{ponto}.*'))
            if not achados:
                raise SystemExit(f'sem print {larg}-{ponto} em {origem}')
            nome = f'{lado.lower()}-{larg}-{ponto}.jpg'
            im = Image.open(achados[0]).convert('RGB')
            im = im.resize((alvo, round(im.height * alvo / im.width)), Image.LANCZOS)
            im.save(pasta / nome, quality=74)
            figs.append(f'<figure><figcaption>{lado}</figcaption><img loading="lazy" src="antes-depois/{nome}" alt="{titulo}, {rotulo.lower()}, {lado.lower()}" width="{im.width}" height="{im.height}"></figure>')
        linhas.append(f'<div class="par {rotulo.lower()}"><h3>{rotulo}</h3><div class="lado">{"".join(figs)}</div></div>')
    blocos.append(f'<section><h2>{titulo}</h2><p>{nota}</p>{"".join(linhas)}</section>')

html = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Austral Frio: antes e depois</title>
<style>
:root{{--fundo:#0d1b24;--texto:#eef3f6;--apoio:#b4c4cf;--linha:#29404f}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--fundo);color:var(--texto);font:17px/1.5 system-ui,sans-serif}}
main{{max-width:1240px;margin:auto;padding:32px 16px 80px}}h1{{font:400 clamp(34px,6vw,56px)/1.1 Georgia,serif;margin:0 0 12px}}
h2{{font:400 32px/1.2 Georgia,serif;margin:0 0 4px}}h3{{font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--apoio);margin:20px 0 8px}}
p{{color:var(--apoio);margin:0;max-width:62ch}}section{{border-top:1px solid var(--linha);margin-top:40px;padding-top:28px}}
.links{{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0 0}}.links a{{color:var(--fundo);background:var(--texto);padding:12px 20px;border-radius:99px;text-decoration:none;font-weight:600}}
.links a+a{{background:none;color:var(--texto);border:1px solid var(--apoio)}}
.lado{{display:grid;grid-template-columns:1fr 1fr;gap:12px}}.celular .lado{{max-width:620px}}
figure{{margin:0}}figcaption{{font-size:14px;margin-bottom:6px;color:var(--apoio)}}img{{display:block;width:100%;height:auto;border-radius:8px}}
</style></head><body><main>
<h1>Austral Frio: antes e depois</h1>
<p>Mesma identidade, mesma porta do baú. Mudaram as fotos fracas e o texto das seções que elas sustentavam. Os prints só comparam: julgue abrindo os dois sites.</p>
<div class="links"><a href="http://localhost:5205/">Abrir o depois</a><a href="http://localhost:5201/">Abrir o antes</a></div>
{"".join(blocos)}
</main></body></html>
'''
(destino / 'antes-depois.html').write_text(html, encoding='utf-8')
print('ok')
