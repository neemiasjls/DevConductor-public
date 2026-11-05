import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const tipos = { '/': ['index.html', 'text/html'], '/styles.css': ['styles.css', 'text/css'], '/script.js': ['script.js', 'text/javascript'] };
createServer(async (req, res) => {
  const recurso = tipos[req.url];
  if (!recurso) { res.writeHead(404).end(); return; }
  try {
    const corpo = await readFile(new URL(recurso[0], import.meta.url));
    res.writeHead(200, { 'content-type': `${recurso[1]}; charset=utf-8` }).end(corpo);
  } catch { res.writeHead(404).end(); }
}).listen(4173, '127.0.0.1', () => console.log('Demonstração fictícia: http://127.0.0.1:4173'));
