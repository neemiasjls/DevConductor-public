# Junta as miniaturas <rotulo>-NN.jpg numa folha numerada (<rotulo>-folha.jpg) para escolher olhando.
# Uso: python -I folha-contato.py <rotulo> [colunas]   (precisa de Pillow)
import glob
import sys

from PIL import Image, ImageDraw, ImageFont

if len(sys.argv) < 2:
    sys.exit('Uso: python -I folha-contato.py <rotulo> [colunas]')
rotulo = sys.argv[1]
colunas = int(sys.argv[2]) if len(sys.argv) > 2 else 6
arquivos = sorted(glob.glob(f'{rotulo}-[0-9][0-9].jpg'))
if not arquivos:
    sys.exit(f'Nenhuma miniatura {rotulo}-NN.jpg nesta pasta')
L, A = 240, 170
linhas = (len(arquivos) + colunas - 1) // colunas
folha = Image.new('RGB', (colunas * L, linhas * A), 'white')
desenho = ImageDraw.Draw(folha)
try:
    fonte = ImageFont.truetype('arialbd.ttf', 22)
except OSError:
    fonte = ImageFont.load_default()
for k, arquivo in enumerate(arquivos):
    imagem = Image.open(arquivo).convert('RGB')
    imagem.thumbnail((L - 6, A - 6))
    x, y = (k % colunas) * L, (k // colunas) * A
    folha.paste(imagem, (x + 3, y + 3))
    numero = arquivo[len(rotulo) + 1:len(rotulo) + 3]
    desenho.rectangle([x + 3, y + 3, x + 36, y + 30], fill='black')
    desenho.text((x + 6, y + 4), numero, fill='yellow', font=fonte)
folha.save(f'{rotulo}-folha.jpg', quality=80)
print(f'{rotulo}-folha.jpg com {len(arquivos)} fotos')
