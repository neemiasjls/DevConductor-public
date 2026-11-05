"""Receptor local temporário: recebe listas de links enviadas pelo navegador e grava em arquivo.

Uso: python -I receptor.py <pasta-saida>   (porta 8765; pare o processo ao terminar)
No navegador: location.href = 'http://127.0.0.1:8765/?f=<nome>&d=' + encodeURIComponent(texto)
"""
import os
import re
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer

PASTA = sys.argv[1] if len(sys.argv) > 1 else "."


class Receptor(BaseHTTPRequestHandler):
    def do_GET(self):
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        nome = re.sub(r"[^a-z0-9_-]", "", qs.get("f", ["dados"])[0].lower()) or "dados"
        dados = qs.get("d", [""])[0]
        if dados:
            os.makedirs(PASTA, exist_ok=True)
            with open(os.path.join(PASTA, nome + ".txt"), "w", encoding="utf-8", newline="\n") as f:
                f.write(dados + "\n")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(f"recebido {nome}: {len(dados)} caracteres".encode())

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8765), Receptor).serve_forever()
