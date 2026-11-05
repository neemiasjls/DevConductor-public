import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

export function criarServidor() {
  return createServer((_req, res) => {
    res.writeHead(501, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ erro: 'Cadastro ainda não implementado' }));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  criarServidor().listen(3000, '127.0.0.1', () => console.log('API fictícia: http://127.0.0.1:3000'));
}
