import sys
from pathlib import Path
from PIL import Image

antes, depois, destino = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
pasta = destino / 'antes-depois'
pasta.mkdir(parents=True, exist_ok=True)
PONTOS = [
    ('Abertura', 'A foto antiga tinha expressão e decote sem relação com terapia capilar. A nova põe o cabelo em primeiro plano.', '01-inicio-0'),
    ('Diagnóstico', 'Era só texto. Agora a pessoa escolhe o sinal do próprio fio e vê foto, valor e botão.', '03-diagnostico-0.55'),
    ('De perto', 'A macro ocupa a largura toda e três passos dizem o que acontece na cadeira.', '05-fio-0.3'),
    ('Resultado', 'Sem fundo trocado por montagem. A luz marca as ondas e há três ganhos curtos ao lado.', '11-resultado-0.42'),
    ('Serviços', 'A mesma série de fotos do começo ao fim, com um tratamento só.', '12-servicos-0.1'),
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
            nome = f'{lado.lower()}-{larg}-{ponto.split("-")[1]}.jpg'
            im = Image.open(achados[0]).convert('RGB')
            im = im.resize((alvo, round(im.height * alvo / im.width)), Image.LANCZOS)
            im.save(pasta / nome, quality=74)
            figs.append(f'<figure><figcaption>{lado}</figcaption><img loading="lazy" src="antes-depois/{nome}" alt="{titulo}, {rotulo.lower()}, {lado.lower()}" width="{im.width}" height="{im.height}"></figure>')
        linhas.append(f'<div class="par {rotulo.lower()}"><h3>{rotulo}</h3><div class="lado">{"".join(figs)}</div></div>')
    blocos.append(f'<section><h2>{titulo}</h2><p>{nota}</p>{"".join(linhas)}</section>')

html = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Lúmen: antes e depois</title>
<style>
:root{{--fundo:#0f2a2c;--texto:#eef6f4;--apoio:#b9cdca;--linha:#2c4a4c}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--fundo);color:var(--texto);font:17px/1.5 system-ui,sans-serif}}
main{{max-width:1240px;margin:auto;padding:32px 16px 80px}}h1{{font:400 clamp(34px,6vw,56px)/1.1 Georgia,serif;margin:0 0 12px}}
h2{{font:400 32px/1.2 Georgia,serif;margin:0 0 4px}}h3{{font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--apoio);margin:20px 0 8px}}
p{{color:var(--apoio);margin:0;max-width:62ch}}section{{border-top:1px solid var(--linha);margin-top:40px;padding-top:28px}}
.links{{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0 0}}.links a{{color:var(--fundo);background:var(--texto);padding:12px 20px;border-radius:99px;text-decoration:none;font-weight:600}}
.links a+a{{background:none;color:var(--texto);border:1px solid var(--apoio)}}
.lado{{display:grid;grid-template-columns:1fr 1fr;gap:12px}}.celular .lado{{max-width:620px}}
figure{{margin:0}}figcaption{{font-size:14px;margin-bottom:6px;color:var(--apoio)}}img{{display:block;width:100%;height:auto;border-radius:8px}}
</style></head><body><main>
<h1>Lúmen: antes e depois</h1>
<p>Mesma identidade e mesmas cenas. Mudaram as fotos e o conteúdo das seções fracas. Os prints só comparam: julgue abrindo os dois sites.</p>
<div class="links"><a href="http://localhost:5204/">Abrir o depois</a><a href="http://localhost:5202/">Abrir o antes</a></div>
{"".join(blocos)}
</main></body></html>
'''
(destino / 'antes-depois.html').write_text(html, encoding='utf-8')
print('ok')
