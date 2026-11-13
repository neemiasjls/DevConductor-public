# Aplica UM tratamento igual a todas as fotos de uma pasta (mesmo recorte, contraste, cor e grão), para fotos de
# origens diferentes parecerem uma série só. Nunca altera os originais: grava na pasta de saída e escreve
# tratamento-aplicado.json com o que foi feito em cada arquivo (entrada, saída, proporção, tamanho).
# Uso:  python -I tratar-fotos.py <pasta-entrada> <pasta-saida> [--tratamento tratamento.json]
#       python -I tratar-fotos.py <pasta-entrada> <pasta-saida> --do-raio-x raio-x.json
#       (a segunda forma só grava <pasta-saida>/tratamento.json sugerido; ajuste e rode com --tratamento)
#       --ampliar [--ampliador <exe>]  opcional: foto com largura menor que larguraMax é ampliada 4x pelo Real-ESRGAN
#       (programa externo, nunca copiado para o repositório). Exe: --ampliador, env REALESRGAN_EXE ou PATH.
#       Sem o programa, avisa e segue sem ampliar; se falhar numa foto, usa a original.
# Precisa de: pillow e numpy (os mesmos de recortar-fundo.py). Sem --tratamento, vale o PADRAO abaixo.
#
# Chaves do tratamento.json (todas opcionais):
#   proporcoes   recortes permitidos, ex. ["4:5","16:9","1:1"]; cada foto vai para o mais próximo da original
#   focos        {"arquivo.jpg": [x, y]} ponto de interesse de 0 a 1 (padrão: centro 0.5, 0.5)
#   larguraMax   largura máxima da saída em px (nunca amplia)
#   larguraMin   abaixo disso a foto recebe aviso (não é ampliada)
#   contraste    1 = igual; >1 mais contraste
#   saturacao    1 = igual; 0 = cinza
#   temperatura  -1 (fria) a 1 (quente)
#   tinta        {"cor": "#c8a27a", "forca": 0.0 a 1} cor aplicada sobre as luzes e sombras (opcional)
#   pretoEBranco true/false
#   grao         0 a 1 (ruído fino, igual e repetível em cada arquivo)
#   formato      "webp" ou "jpg"
#   qualidade    1 a 100
import hashlib
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

# Windows: a saída padrão pode vir em cp1252 e quebrar o acento; força UTF-8 quando o Python permite.
for _fluxo in (sys.stdout, sys.stderr):
    if hasattr(_fluxo, 'reconfigure'):
        _fluxo.reconfigure(encoding='utf-8')

PADRAO = {
    'proporcoes': ['4:5', '16:9', '1:1'],
    'focos': {},
    'larguraMax': 1600,
    'larguraMin': 800,
    'contraste': 1.06,
    'saturacao': 0.95,
    'temperatura': 0.0,
    'tinta': None,
    'pretoEBranco': False,
    'grao': 0.15,
    'formato': 'webp',
    'qualidade': 82,
}
MODELO_AMPLIADOR = 'realesrgan-x4plus'
EXTENSOES = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff'}


def sha256(caminho):
    h = hashlib.sha256()
    with open(caminho, 'rb') as f:
        for bloco in iter(lambda: f.read(1 << 20), b''):
            h.update(bloco)
    return h.hexdigest()


def hex_para_rgb(texto):
    t = str(texto).strip().lstrip('#')
    if len(t) == 3:
        t = ''.join(c * 2 for c in t)
    if len(t) != 6:
        raise ValueError(f'cor inválida: {texto}')
    return [int(t[i:i + 2], 16) for i in (0, 2, 4)]


def razao(texto):
    a, b = str(texto).split(':')
    return float(a) / float(b)


def mais_proxima(w, h, proporcoes):
    r = w / h
    return min(proporcoes, key=lambda p: abs(math.log(r / razao(p))))


def recortar(im, proporcao, foco):
    w, h = im.size
    alvo = razao(proporcao)
    if w / h > alvo:
        nw, nh = max(1, round(h * alvo)), h
    else:
        nw, nh = w, max(1, round(w / alvo))
    fx, fy = foco
    x = min(max(round(fx * w - nw / 2), 0), w - nw)
    y = min(max(round(fy * h - nh / 2), 0), h - nh)
    return im.crop((x, y, x + nw, y + nh))


def achar_ampliador(opcao):
    for c in (opcao, os.environ.get('REALESRGAN_EXE'), shutil.which('realesrgan-ncnn-vulkan')):
        if c and Path(c).is_file():
            return str(Path(c).resolve())
    return None


def ampliar_4x(exe, im, nome, tmp):
    # Devolve (imagem ampliada, None) ou (None, motivo da falha). Roda na pasta do exe (ele procura models ali).
    ent, sai = Path(tmp) / (nome + '-ent.png'), Path(tmp) / (nome + '-4x.png')
    im.save(ent, 'PNG')
    try:
        r = subprocess.run([exe, '-i', str(ent), '-o', str(sai), '-n', MODELO_AMPLIADOR],
                           cwd=str(Path(exe).parent), capture_output=True, timeout=180)
    except subprocess.TimeoutExpired:
        return None, 'ampliador passou de 180 s'
    except OSError as e:
        return None, f'ampliador não executou ({e})'
    if r.returncode != 0:
        return None, f'ampliador saiu com código {r.returncode}'
    if not sai.is_file() or sai.stat().st_size == 0:
        return None, 'ampliador não gerou o arquivo de saída'
    try:
        with Image.open(sai) as g:
            return g.convert('RGB'), None
    except Exception as e:
        return None, f'saída do ampliador ilegível ({e})'


def tratar_cor(a, t, semente):
    lum = lambda x: (x * np.array([0.2126, 0.7152, 0.0722])).sum(axis=2, keepdims=True)
    media = lum(a).mean()
    a = (a - media) * float(t['contraste']) + media
    a = np.clip(a, 0, 1)
    cinza = lum(a)
    if t['pretoEBranco']:
        a = np.repeat(cinza, 3, axis=2)
    else:
        a = cinza + (a - cinza) * float(t['saturacao'])
    k = float(t['temperatura']) * 0.08
    a = a + np.array([k, 0, -k])
    a = np.clip(a, 0, 1)
    tinta = t.get('tinta')
    if tinta:
        forca = min(max(float(tinta.get('forca', 0)), 0), 1)
        cor = np.array(hex_para_rgb(tinta['cor'])) / 255.0
        camada = np.clip(cor * (lum(a) / 0.5), 0, 1)
        a = a * (1 - forca) + camada * forca
    g = min(max(float(t['grao']), 0), 1)
    if g > 0:
        rng = np.random.default_rng(semente)
        a = a + rng.normal(0, g * 0.06, a.shape[:2])[..., None]
    return np.clip(a, 0, 1)


def sugerir_do_raio_x(caminho):
    avisos = []
    sug = dict(PADRAO)
    sug['focos'] = {}
    cores = []
    try:
        dados = json.loads(Path(caminho).read_text(encoding='utf-8'))
        for secao in dados.get('secoes') or []:
            for c in (secao.get('cores') or []) if isinstance(secao, dict) else []:
                if isinstance(c, dict):
                    c = c.get('hex') or c.get('cor')
                try:
                    cores.append(hex_para_rgb(c))
                except (ValueError, TypeError, AttributeError):
                    pass
    except (OSError, ValueError, AttributeError) as e:
        avisos.append(f'raio-x ilegível ({e}); usando o tratamento padrão')
    if not cores:
        if not avisos:
            avisos.append('raio-x sem secoes[].cores; usando o tratamento padrão')
        return sug, avisos
    r, g, b = np.mean(cores, axis=0)
    sug['temperatura'] = round(float(np.clip((r - b) / 255.0 * 1.5, -1, 1)), 2)
    sug['tinta'] = {'cor': '#%02x%02x%02x' % (round(r), round(g), round(b)), 'forca': 0.18}
    return sug, avisos


def main(argv):
    pos, opc, i = [], {}, 0
    while i < len(argv):
        if argv[i] in ('--tratamento', '--do-raio-x', '--ampliador') and i + 1 < len(argv):
            opc[argv[i]] = argv[i + 1]
            i += 2
        elif argv[i] == '--ampliar':
            opc[argv[i]] = True
            i += 1
        else:
            pos.append(argv[i])
            i += 1
    if len(pos) != 2:
        print(__doc__.split('\n\n')[0] if False else 'Uso: tratar-fotos.py <pasta-entrada> <pasta-saida> [--tratamento t.json | --do-raio-x raio-x.json] [--ampliar [--ampliador exe]]')
        return 2
    entrada, saida = Path(pos[0]).resolve(), Path(pos[1]).resolve()
    if not entrada.is_dir():
        print(f'pasta de entrada não existe: {entrada}')
        return 2
    if entrada == saida:
        print('a saída não pode ser a pasta de entrada (os originais nunca são sobrescritos)')
        return 2
    saida.mkdir(parents=True, exist_ok=True)
    avisos = []

    if '--do-raio-x' in opc:
        sug, av = sugerir_do_raio_x(opc['--do-raio-x'])
        for a in av:
            print('aviso:', a)
        alvo = saida / 'tratamento.json'
        alvo.write_text(json.dumps(sug, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'tratamento sugerido gravado em {alvo}; ajuste e rode com --tratamento')
        return 0

    t = dict(PADRAO)
    if '--tratamento' in opc:
        t.update(json.loads(Path(opc['--tratamento']).read_text(encoding='utf-8')))
    else:
        avisos.append('sem --tratamento: usando o padrão neutro')
    fmt = 'jpg' if str(t['formato']).lower() in ('jpg', 'jpeg') else 'webp'

    exe, tmp = None, tempfile.mkdtemp(prefix='tratar-fotos-')
    if '--ampliar' in opc:
        exe = achar_ampliador(opc.get('--ampliador'))
        if not exe:
            avisos.append('--ampliar pedido, mas o Real-ESRGAN não foi achado; seguindo sem ampliar. Para instalar: baixe o pacote '
                          '"realesrgan-ncnn-vulkan" na página de lançamentos de xinntao/Real-ESRGAN no GitHub e aponte a variável '
                          'REALESRGAN_EXE para o .exe (ou use --ampliador <caminho>)')

    feitos, ignorados = [], []
    for arq in sorted(entrada.iterdir()):
        if not arq.is_file():
            continue
        if arq.suffix.lower() not in EXTENSOES:
            ignorados.append(arq.name)
            avisos.append(f'{arq.name}: não é imagem, ignorado')
            continue
        try:
            im = ImageOps.exif_transpose(Image.open(arq)).convert('RGB')
        except Exception as e:
            ignorados.append(arq.name)
            avisos.append(f'{arq.name}: não abriu como imagem ({e}), ignorado')
            continue
        ow, oh = im.size
        ampliada, tam_ampliado = False, None
        if exe and ow < int(t['larguraMax']):
            grande, falha = ampliar_4x(exe, im, arq.stem, tmp)
            if grande is None:
                avisos.append(f'{arq.name}: {falha}; usada a foto original')
            else:
                im, ampliada, tam_ampliado = grande, True, list(grande.size)
        prop = mais_proxima(ow, oh, t['proporcoes'])
        foco = (t.get('focos') or {}).get(arq.name, [0.5, 0.5])
        im = recortar(im, prop, foco)
        aviso = None
        if im.size[0] < int(t['larguraMin']):
            aviso = f'largura {im.size[0]} px abaixo do mínimo {t["larguraMin"]}; não foi ampliada'
            avisos.append(f'{arq.name}: {aviso}')
        if im.size[0] > int(t['larguraMax']):
            nw = int(t['larguraMax'])
            im = im.resize((nw, max(1, round(im.size[1] * nw / im.size[0]))), Image.LANCZOS)
        semente = int(hashlib.sha256(arq.name.encode()).hexdigest()[:8], 16)
        a = tratar_cor(np.asarray(im).astype(np.float64) / 255.0, t, semente)
        out = Image.fromarray((a * 255 + 0.5).astype(np.uint8), 'RGB')
        destino = saida / (arq.stem + '.' + fmt)
        if fmt == 'jpg':
            out.save(destino, 'JPEG', quality=int(t['qualidade']), optimize=True)
        else:
            out.save(destino, 'WEBP', quality=int(t['qualidade']))
        feitos.append({
            'entrada': arq.name,
            'entradaSha256': sha256(arq),
            'tamanhoOriginal': [ow, oh],
            'saida': destino.name,
            'proporcao': prop,
            'foco': list(foco),
            'tamanho': list(out.size),
            'bytes': destino.stat().st_size,
            'ampliada': ampliada,
            **({'ampliacao': {'modelo': MODELO_AMPLIADOR, 'tamanhoAntes': [ow, oh], 'tamanhoDepois': tam_ampliado}} if ampliada else {}),
            **({'aviso': aviso} if aviso else {}),
        })
    relatorio = {
        'geradoEm': datetime.now(timezone.utc).isoformat(),
        'tratamento': t,
        'arquivos': feitos,
        'ignorados': ignorados,
        'avisos': avisos,
    }
    (saida / 'tratamento-aplicado.json').write_text(json.dumps(relatorio, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    shutil.rmtree(tmp, ignore_errors=True)
    for a in avisos:
        print('aviso:', a)
    print(f'{len(feitos)} foto(s) tratada(s) em {saida}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
