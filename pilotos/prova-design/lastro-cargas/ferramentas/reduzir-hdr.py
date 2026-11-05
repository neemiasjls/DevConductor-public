"""Reduz um HDRI Radiance (.hdr, RGBE) pela média de blocos 2×2 (ou 4×4), sem dependências além do numpy.

Uso: python -I ferramentas/reduzir-hdr.py <entrada.hdr> <saida.hdr> [fator=2]
Lê RLE novo e plano; grava RGBE plano (o servidor comprime na rede).
"""
import sys
import numpy as np


def ler(caminho):
    dados = open(caminho, 'rb').read()
    pos = 0
    cabecalho = []
    while True:
        fim = dados.index(b'\n', pos)
        linha = dados[pos:fim].decode('ascii', 'replace')
        pos = fim + 1
        if linha.startswith('-Y') or linha.startswith('+Y'):
            partes = linha.split()
            altura, largura = int(partes[1]), int(partes[3])
            break
        cabecalho.append(linha)
    rgbe = np.zeros((altura, largura, 4), dtype=np.uint8)
    for y in range(altura):
        if largura >= 8 and dados[pos] == 2 and dados[pos + 1] == 2 and (dados[pos + 2] << 8 | dados[pos + 3]) == largura:
            pos += 4
            for c in range(4):
                x = 0
                while x < largura:
                    n = dados[pos]
                    pos += 1
                    if n > 128:
                        n -= 128
                        rgbe[y, x:x + n, c] = dados[pos]
                        pos += 1
                    else:
                        rgbe[y, x:x + n, c] = np.frombuffer(dados, np.uint8, n, pos)
                        pos += n
                    x += n
        else:
            rgbe[y] = np.frombuffer(dados, np.uint8, largura * 4, pos).reshape(largura, 4)
            pos += largura * 4
    return rgbe


def para_float(rgbe):
    e = rgbe[..., 3].astype(np.int32)
    escala = np.where(e > 0, np.ldexp(1.0, e - 136), 0.0)
    return rgbe[..., :3].astype(np.float64) * escala[..., None]


def para_rgbe(cor):
    maior = cor.max(axis=-1)
    saida = np.zeros(cor.shape[:2] + (4,), dtype=np.uint8)
    ok = maior > 1e-32
    mant, exp = np.frexp(maior[ok])
    fator = mant * 256.0 / maior[ok]
    saida[ok, :3] = np.clip(np.floor(cor[ok] * fator[:, None]), 0, 255).astype(np.uint8)
    saida[ok, 3] = (exp + 128).astype(np.uint8)
    return saida


def main():
    ent, sai = sys.argv[1], sys.argv[2]
    fator = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    cor = para_float(ler(ent))
    a, l = cor.shape[0] // fator * fator, cor.shape[1] // fator * fator
    cor = cor[:a, :l].reshape(a // fator, fator, l // fator, fator, 3).mean(axis=(1, 3))
    rgbe = para_rgbe(cor)
    with open(sai, 'wb') as f:
        f.write(b'#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n')
        f.write(f'-Y {rgbe.shape[0]} +X {rgbe.shape[1]}\n'.encode('ascii'))
        f.write(rgbe.tobytes())
    print(f'{ent} -> {sai}: {rgbe.shape[1]}x{rgbe.shape[0]}, max {cor.max():.1f}')


if __name__ == '__main__':
    main()
